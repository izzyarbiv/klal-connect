// An answer to an ask can become a listing.
//
// usage: node scripts/ask-loop-check.mjs [baseUrl]   (localhost only)
//
// This is the loop the directory grows by: someone asks for a plumber, someone
// answers with a name, and that answer becomes a listing the next person finds
// instead of an answer that scrolls away. It posts an ask and an answer, so it
// refuses to run anywhere but a local host.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.argv[2] || 'http://localhost:5200';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
  console.error(`refusing to post an ask to ${BASE} — this check is localhost only`);
  process.exit(2);
}

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9241;
const ANSWER = 'Moshe Green Plumbing 555-0134';

async function api(method, path, { body, token } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

// An asker and an answerer, because the "Add to the directory" link is offered
// to whoever knows the business, not only to the person who asked.
async function member(tag) {
  const email = `${tag}${Date.now()}@example.com`;
  const reg = await api('POST', '/auth/register', { body: { email, password: 'password123' } });
  const ver = await api('POST', '/auth/verify-otp', { body: { email, otpCode: reg.data?.dev_code } });
  return ver.data?.access_token;
}

const asker = await member('asker');
const answerer = await member('answerer');
if (!asker || !answerer) { console.error('could not create the two members'); process.exit(1); }

const post = await api('POST', '/functions/createPost', {
  token: asker,
  body: { body: 'Does anyone know a reliable plumber in Boca Raton?', post_type: 'question', image_urls: [] },
});
const postId = post.data?.post?.id;
if (!postId) { console.error('could not post the ask', JSON.stringify(post.data)); process.exit(1); }

const answer = await api('POST', '/functions/createComment', { token: answerer, body: { post_id: postId, body: ANSWER } });
console.log(`posted an ask (${postId}) and an answer (${answer.status})`);

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/kc-ask-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
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

console.log(`\nask-to-listing loop against ${BASE}\n`);

// Signed in as the answerer — the person who knows the business.
await send('Page.navigate', { url: `${BASE}/` });
await sleep(2500);
await ev(`localStorage.setItem('kc_access_token', ${JSON.stringify(answerer)})`);
await send('Page.navigate', { url: `${BASE}/feed?post=${encodeURIComponent(postId)}` });
await sleep(5000);

ok(await ev(`/reliable plumber in Boca Raton/i.test(document.body.innerText)`), 'the ask is on the page');

// Answers are behind the Answer toggle.
await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/^Answers?$/.test(x.textContent.trim()));if(b)b.click();return !!b})()`);
await sleep(2500);
ok(await ev(`document.body.innerText.includes(${JSON.stringify(ANSWER)})`), 'the answer is shown');

const href = await ev(`(()=>{const a=[...document.querySelectorAll('a')].find(x=>/Add to the directory/.test(x.textContent));return a?a.getAttribute('href'):null})()`);
ok(!!href, 'the answer offers "Add to the directory"', String(href));
ok(!!href && href.includes(`from_post=${encodeURIComponent(postId)}`), 'the link carries the ask it came from', String(href));
ok(!!href && /name=Moshe/.test(href), 'a name-shaped answer prefills the name', String(href));

// Follow it and check the form actually arrives filled in.
await ev(`(()=>{const a=[...document.querySelectorAll('a')].find(x=>/Add to the directory/.test(x.textContent));a.click();return true})()`);
await sleep(5000);

ok(await ev(`location.pathname === '/add'`), 'it lands on the add-listing form', await ev('location.pathname + location.search'));
ok(await ev(`/turning an answer into a listing/i.test(document.body.innerText)`), 'the form says where this came from');
ok(await ev(`!!document.querySelector('a[href*="/feed?post="]')`), 'and links back to the original ask');
const nameValue = await ev(`(()=>{const i=document.querySelector('input[name="name"]');return i?i.value:null})()`);
ok(nameValue === ANSWER, 'the business name is prefilled from the answer', JSON.stringify(nameValue));

const real = errors.filter((e) => !/favicon|\[vite\]|manifest|sw\.js/i.test(e));
ok(real.length === 0, 'no page errors', real.slice(0, 2).join(' | '));

console.log(fails ? `\n${fails} ask-loop check(s) failed` : '\nask loop: all checks passed');
ws.close();
process.exit(fails ? 1 : 0);
