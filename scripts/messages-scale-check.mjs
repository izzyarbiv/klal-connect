// A conversation still knows who it is with once the community is large.
//
// usage: node scripts/messages-scale-check.mjs [baseUrl]   (localhost only)
//
// Messages used to resolve names from User.list(…, 200) — a page of the
// directory — so past 200 members a conversation lost its name and avatar, and
// any connection outside that window vanished from "Your connections", leaving
// no way to message them. Nothing errored; people just went missing.
//
// So this check buries the two participants under enough later members that
// they fall outside any 200-row window, then asserts they are still named. It
// fails against the old implementation and passes against the current one.
//
// It registers a lot of members, so it refuses to run anywhere but localhost.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.argv[2] || 'http://localhost:5200';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
  console.error(`refusing to register members against ${BASE} — this check is localhost only`);
  process.exit(2);
}
const FILLER = Number(process.env.KC_FILLER || 205);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9242;

async function api(method, path, { body, token } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

async function member(name) {
  const email = `${name.toLowerCase().replace(/[^a-z]+/g, '')}${Date.now()}${Math.random().toString(36).slice(2, 6)}@example.com`;
  const reg = await api('POST', '/auth/register', { body: { email, password: 'password123' } });
  const ver = await api('POST', '/auth/verify-otp', { body: { email, otpCode: reg.data?.dev_code } });
  const token = ver.data?.access_token;
  // PUT /users/:id is admin-only — a member names themselves through /auth/me.
  if (token) await api('PUT', '/auth/me', { token, body: { full_name: name } });
  return { token, id: ver.data?.user?.id };
}

// The two people in the conversation are created FIRST, so every filler member
// below is newer than they are.
const alice = await member('Alice Testfriend');
const bob = await member('Bob Testfriend');
if (!alice.token || !bob.token) { console.error('could not create the two participants'); process.exit(1); }

// They have to be connected before a message is allowed through.
const req = await api('POST', '/entities/Connection', { token: alice.token, body: { requester_id: alice.id, recipient_id: bob.id } });
const connId = req.data?.id;
await api('PUT', `/entities/Connection/${connId}`, { token: bob.token, body: { status: 'accepted' } });

const sent = await api('POST', '/functions/sendMessage', { token: alice.token, body: { recipient_id: bob.id, body: 'Are you around later?' } });
if (sent.status >= 400) { console.error('could not send the message:', JSON.stringify(sent.data)); process.exit(1); }
console.log(`created the pair and a message (${sent.status})`);

process.stdout.write(`burying them under ${FILLER} newer members`);
for (let i = 0; i < FILLER; i++) {
  await member(`Filler Member${i}`);
  if (i % 50 === 0) process.stdout.write('.');
}
console.log(' done');

const total = (await api('GET', '/users', { token: alice.token })).data?.length ?? 0;
console.log(`directory now holds ${total} members\n`);

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/kc-msg-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
process.on('exit', () => { try { chrome.kill('SIGKILL'); } catch {} });

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* not up */ }
    await sleep(250);
  }
  throw new Error('no debug target');
}

const ws = new WebSocket(await target());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pend = new Map();
const errors = [];
ws.onmessage = (m) => {
  const x = JSON.parse(m.data);
  if (x.method === 'Runtime.exceptionThrown') {
    const d = x.params?.exceptionDetails;
    errors.push(d?.exception?.description || d?.text || 'uncaught exception');
  }
  if (pend.has(x.id)) {
    const { res, rej } = pend.get(x.id);
    pend.delete(x.id);
    x.error ? rej(new Error(x.error.message)) : res(x.result);
  }
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id; pend.set(i, { res, rej });
  ws.send(JSON.stringify({ id: i, method, params }));
});
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value;

await send('Page.enable');
await send('Runtime.enable');

let fails = 0;
const ok = (cond, label, extra = '') => { if (!cond) fails++; console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${label}${extra ? `  ${extra}` : ''}`); };

// As Alice, whose only conversation is with Bob — now the 2nd-oldest member.
await send('Page.navigate', { url: `${BASE}/` });
await sleep(2500);
await ev(`localStorage.setItem('kc_access_token', ${JSON.stringify(alice.token)})`);
await send('Page.navigate', { url: `${BASE}/messages` });
await sleep(6000);

const body = await ev('document.body.innerText');
ok(/Messages/.test(body), 'the messages page loaded');
ok(/Bob Testfriend/.test(body), 'the conversation still names the other person', /Bob Testfriend/.test(body) ? '' : 'shows "Community member"');
ok(!/Community member/.test(body), 'nobody is rendered as an anonymous placeholder');
ok(/Are you around later\?/.test(body), 'the last message is shown');
// The list below the conversations: a connection must not disappear.
ok((body.match(/Bob Testfriend/g) || []).length >= 2, 'the connection is still listed as messageable',
  `appears ${(body.match(/Bob Testfriend/g) || []).length}×`);

const real = errors.filter((e) => !/favicon|\[vite\]|manifest|sw\.js/i.test(e));
ok(real.length === 0, 'no page errors', real.slice(0, 2).join(' | '));

console.log(fails ? `\n${fails} messages-scale check(s) failed` : '\nmessages at scale: all checks passed');
ws.close();
process.exit(fails ? 1 : 0);
