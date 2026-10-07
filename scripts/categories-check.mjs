// Admin -> Categories can add the categories the app expects and the database
// has not got.
//
// usage: node scripts/categories-check.mjs [baseUrl]   (localhost only)
//
// Three categories were added to the code — Shidduchim, Shuls & Minyanim and
// Other — and did nothing for a directory already running, because the seeder
// only touches a fresh database. The instruction given instead was to run a
// CLI with a production DATABASE_URL, which defaults to the dev one and
// reports the same success either way. This check deletes a few categories and
// proves the button in the admin puts them back, so nobody has to point a
// script at a live database to fix a list of headings.
//
// It removes categories, so it refuses anything but a local host.
import { spawn } from 'node:child_process';
import { CONTRAST } from './lib/contrast-expression.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.argv[2] || 'http://localhost:5200';
const API = process.argv[3] || 'http://localhost:4000';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
  console.error(`refusing to delete categories from ${BASE} — this check is localhost only`);
  process.exit(2);
}

// CHROME_PATH so these can run somewhere other than a Mac. They were written
// for one laptop, which is why the UI checks never ran in CI — and the UI is
// exactly what the other checks cannot see.
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9392;

async function api(method, path, { body, token } = {}) {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

let fails = 0;
const ok = (cond, label, extra = '') => { if (!cond) fails++; console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${label}${extra ? `  ${extra}` : ''}`); };

const adminToken = (await api('POST', '/auth/login', { body: { email: 'demo@klal.app', password: 'demo1234' } })).data?.access_token;
if (!adminToken) { console.error('could not sign in as the demo admin'); process.exit(1); }

// Take three out, including the three a running directory was actually missing.
const WANTED = ['Shidduchim', 'Shuls & Minyanim', 'Other'];
const all = (await api('GET', '/entities/Category', { token: adminToken })).data || [];
const removed = [];
for (const name of WANTED) {
  const row = all.find((c) => c.name === name);
  if (!row) continue;
  const r = await api('DELETE', `/entities/Category/${row.id}`, { token: adminToken });
  if (r.status < 400) removed.push(name);
}
console.log(`removed ${removed.length} categor${removed.length === 1 ? 'y' : 'ies'}: ${removed.join(', ') || '(none were present)'}`);
ok(removed.length > 0, 'the check has something to put back', String(removed.length));

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/kc-cat-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
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

await send('Page.navigate', { url: `${BASE}/` });
await sleep(2500);
await ev(`localStorage.setItem('kc_access_token', ${JSON.stringify(adminToken)})`);
await send('Page.navigate', { url: `${BASE}/admin` });
await sleep(5000);
ok(await ev(`/Community operations/.test(document.body.innerText)`), 'the admin page loaded');

ok(await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/^Categories/.test(x.textContent.trim()));if(!b)return false;b.click();return true})()`),
  'the Categories tab exists');
await sleep(1200);

// The banner has to name what is missing, or an administrator is being asked
// to press a button without being told what it does.
const banner = await ev(`document.body.innerText`);
ok(/categor(y|ies) the app expects/.test(banner), 'it says some categories are missing');
for (const name of removed) ok(banner.includes(name), `and names ${name}`);

// This banner only exists while something is missing, which is to say almost
// never — so no sweep would ever open the page with it on screen. It is gold
// on gold, the pair most likely to fail, and dark mode is where that has
// happened before. Measured here, where it stands.
for (const theme of ['light', 'dark']) {
  await ev(`document.documentElement.classList.${theme === 'dark' ? 'add' : 'remove'}('dark')`);
  await sleep(500);
  const bad = (await ev(CONTRAST)) || [];
  ok(bad.length === 0, `the missing-categories banner meets AA in ${theme} mode`,
    bad.slice(0, 2).map((b) => `${b.ratio}:1 needs ${b.need} — "${b.text}"`).join(' | '));
}
await ev(`document.documentElement.classList.remove('dark')`);
await sleep(400);

ok(await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/^Add (it|all \\d+)$/.test(x.textContent.trim()));if(!b)return false;b.click();return true})()`),
  'the add button is there');
await sleep(3500);

const after = await ev(`document.body.innerText`);
for (const name of removed) ok(after.includes(name), `${name} is in the list now`);
ok(!/categor(y|ies) the app expects/.test(after), 'and nothing is reported missing any more');

// What matters is the database, not the screen.
const saved = (await api('GET', '/entities/Category', { token: adminToken })).data || [];
for (const name of removed) {
  const row = saved.find((c) => c.name === name);
  ok(!!row, `${name} was really saved`);
  if (row) ok(Array.isArray(row.subcategories), `with its subcategories, not retyped from memory`, JSON.stringify(row.subcategories || []));
}

// Pressing it again must be harmless: the list is matched by name.
await send('Page.navigate', { url: `${BASE}/admin` });
await sleep(4500);
await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/^Categories/.test(x.textContent.trim()));b?.click()})()`);
await sleep(1200);
const again = (await api('GET', '/entities/Category', { token: adminToken })).data || [];
const dupes = again.filter((c) => removed.includes(c.name)).length;
ok(dupes === removed.length, 'and the list holds no duplicates', `${dupes} row(s) for ${removed.length} name(s)`);

ok(errors.length === 0, 'no page errors', errors.slice(0, 2).join(' | '));

console.log(fails ? `\n${fails} check(s) failed` : '\ncategories: the admin can add what the app expects');
ws.close();
process.exit(fails ? 1 : 0);
