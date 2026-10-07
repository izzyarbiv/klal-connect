// A visitor who never signs in must be able to browse every feature.
// usage: node scripts/no-login-check.mjs [baseUrl]
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromePath, debugTarget } from './lib/chrome.mjs';

// CHROME_PATH so these can run somewhere other than a Mac. They were written
// for one laptop, which is why the UI checks never ran in CI — and the UI is
// exactly what the other checks cannot see.
const CHROME = chromePath();
const PORT = 9231;
const BASE = process.argv[2] || 'http://localhost:5173';
const ROUTES = ['', 'directory', 'feed', 'people', 'saved', 'profile', 'messages', 'companies'];

const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-sandbox','--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/kc-nl-${Date.now()}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
process.on('exit', () => { try { chrome.kill('SIGKILL'); } catch {} });

const target = () => debugTarget(PORT, chrome);

const ws = new WebSocket(await target());
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pend = new Map();
ws.onmessage = m => { const x = JSON.parse(m.data); if (pend.has(x.id)) { const { res, rej } = pend.get(x.id); pend.delete(x.id); x.error ? rej(new Error(x.error.message)) : res(x.result); } };
const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value;

await send('Page.enable'); await send('Runtime.enable');

let fails = 0;
for (const route of ROUTES) {
  await send('Page.navigate', { url: `${BASE}/${route}` });
  await sleep(3500);
  const path = await ev('location.pathname');
  const token = await ev(`!!localStorage.getItem('kc_access_token')`);
  const bounced = path === '/login';
  if (bounced) fails++;
  console.log(`  /${route.padEnd(10)} -> ${String(path).padEnd(12)} ${bounced ? 'BOUNCED TO LOGIN' : 'ok'}   guest session: ${token}`);
}
console.log(fails ? `\n${fails} route(s) behind the login wall` : '\nno login wall: every feature browsable without signing in');
ws.close(); process.exit(fails ? 1 : 0);
