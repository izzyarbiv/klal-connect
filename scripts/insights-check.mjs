// The admin "What people want" panel renders, and shows empty searches.
//
// usage: node scripts/insights-check.mjs [baseUrl]   (localhost only)
//
// This one seeds a few ActivityEvent rows so the panel has something to group,
// so it refuses to run against anything but a local host — it must never write
// test events into a real directory's analytics.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.argv[2] || 'http://localhost:5200';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
  console.error(`refusing to seed events into ${BASE} — this check is localhost only`);
  process.exit(2);
}

// CHROME_PATH so these can run somewhere other than a Mac. They were written
// for one laptop, which is why the UI checks never ran in CI — and the UI is
// exactly what the other checks cannot see.
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9240;

// ---- seed a few searches that found nothing ------------------------------
async function api(method, path, { body, token } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

const email = `insights${Date.now()}@example.com`;
const reg = await api('POST', '/auth/register', { body: { email, password: 'password123' } });
const ver = await api('POST', '/auth/verify-otp', { body: { email, otpCode: reg.data?.dev_code } });
const token = ver.data?.access_token;
if (!token) { console.error('could not create a member to record searches as'); process.exit(1); }

// Tagged per run. The first version seeded plain "exterminator" three times and
// asserted the literal "3×", which passed once and then failed on every later
// run against the same server: the counts accumulate, so the row read 6×. A
// check that only works on a fresh store is a check that cries wolf.
const TAG = Math.random().toString(36).slice(2, 7);
const MISSING = `exterminator ${TAG}`;
const WANTED = [
  [MISSING, 'Boca Raton'], [MISSING, 'Boca Raton'], [MISSING, 'Boca Raton'],
  [`sheitel macher ${TAG}`, 'Boca Raton'], [`sheitel macher ${TAG}`, 'Boca Raton'],
  [`plumber ${TAG}`, 'Lakewood'],
];
for (const [query, city] of WANTED) {
  await api('POST', '/entities/ActivityEvent', { token, body: { type: 'search', query, city, results: 0, zero_result: true } });
}
// One that worked, so the "searches that worked" panel has a row too.
await api('POST', '/entities/ActivityEvent', { token, body: { type: 'search', query: 'mikvah', city: 'Boca Raton', results: 1, zero_result: false } });
console.log(`seeded ${WANTED.length} empty searches and 1 successful one`);

// ---- open the admin panel as the seeded admin ----------------------------
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/kc-ins-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
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
  if (x.method === 'Runtime.consoleAPICalled' && x.params?.type === 'error') {
    errors.push((x.params.args || []).map((a) => a?.value ?? a?.description ?? '').join(' ').slice(0, 200));
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

// Sign in as the demo admin by planting the token the client reads.
const adminLogin = await api('POST', '/auth/login', { body: { email: 'demo@klal.app', password: 'demo1234' } });
const adminToken = adminLogin.data?.access_token;
ok(!!adminToken, 'signed in as the seeded admin', String(adminLogin.status));

await send('Page.navigate', { url: `${BASE}/` });
await sleep(2500);
await ev(`localStorage.setItem('kc_access_token', ${JSON.stringify(adminToken || '')})`);
await send('Page.navigate', { url: `${BASE}/admin` });
await sleep(5000);

const gotAdmin = await ev(`/Community operations/.test(document.body.innerText)`);
ok(gotAdmin, 'the admin page loaded');

// Click the nav entry, then read the panel.
const clicked = await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/What people want/.test(x.textContent));if(!b)return false;b.click();return true})()`);
ok(clicked, 'the "What people want" tab exists');
await sleep(3500);

const body = await ev('document.body.innerText');
ok(/Searches that found nothing/.test(body), 'the empty-search panel renders');
ok(body.includes(MISSING), 'a wanted-but-missing listing is named', body.includes(MISSING) ? '' : body.slice(0, 200));

// This run's own row, found by its tag — not the top row, and not "is 3×
// anywhere on the page". Assuming the top row was ours failed too: a store that
// has been checked before still holds rows from earlier runs with higher counts,
// and they outrank it. Only our row's own count is a fact about this run.
const ourRow = await ev(`(() => {
  const h = [...document.querySelectorAll('h2')].find((x) => x.textContent.indexOf('Searches that found nothing') >= 0);
  const panel = h && h.closest('.panel');
  if (!panel) return '';
  const rows = [...panel.querySelectorAll('.divide-y > div')];
  const row = rows.find((r) => r.innerText.indexOf(${JSON.stringify(MISSING)}) >= 0);
  return row ? row.innerText.split('\\n').join(' ').trim() : '';
})()`);
ok(ourRow.includes('3×'), 'a gap asked three times is counted as three', JSON.stringify(ourRow));
ok(/Asks nobody answered/.test(body), 'the unanswered-asks panel renders');
ok(/Searches that worked/.test(body), 'the successful-search panel renders');
ok(/most recent recorded events/.test(body), 'the panel says what window it is based on');

const real = errors.filter((e) => !/favicon|\[vite\]|manifest|sw\.js/i.test(e));
ok(real.length === 0, 'no page errors', real.slice(0, 2).join(' | '));

console.log(fails ? `\n${fails} insights check(s) failed` : '\ninsights: all checks passed');
ws.close();
process.exit(fails ? 1 : 0);
