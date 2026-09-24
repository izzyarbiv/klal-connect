// A listing that would expose the person using it carries no public controls.
//
// usage: node scripts/privacy-check.mjs [baseUrl]
//
// The server refusal is pinned in server/api.test.mjs. This checks the other
// half: that the controls are not on the page at all, so nobody is invited to
// publish something the server would then reject — and that the listing is
// still fully usable, because the point was never to make help harder to reach.
//
// It imports the same rule the app uses rather than restating it, so the script
// cannot disagree with the product about which listings are private.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { isSensitiveListing } from '../src/lib/sensitivity.js';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9239;
const BASE = process.argv[2] || 'https://klalconnect.org';
const MAX = Number(process.env.KC_PRIVACY_MAX || 4);

const listings = await (await fetch(`${BASE}/api/entities/Provider?limit=100`)).json();
const sensitive = listings.filter(isSensitiveListing).slice(0, MAX);
const ordinary = listings.filter((p) => !isSensitiveListing(p)).slice(0, 1);

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/kc-priv-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
process.on('exit', () => { try { chrome.kill('SIGKILL'); } catch {} });

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('no debug target');
}

const ws = new WebSocket(await target());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pend = new Map();
ws.onmessage = (m) => {
  const x = JSON.parse(m.data);
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
const ok = (cond, label, extra = '') => {
  if (!cond) fails++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${label}${extra ? `  ${extra}` : ''}`);
};

async function visit(provider) {
  await send('Page.navigate', { url: `${BASE}/provider/${provider.id}` });
  await sleep(4000);
  return ev('document.body.innerText');
}

console.log(`\nprivacy checks against ${BASE}`);
console.log(`${sensitive.length} sensitive listing(s) checked, ${ordinary.length} ordinary\n`);

for (const p of sensitive) {
  const body = await visit(p);
  const name = (p.name || '').slice(0, 30);
  console.log(`  — ${name}`);
  ok(!/I've Used This|Used ✓/i.test(body), `    no public "used this" control`);
  ok(!/vouch for this/i.test(body), `    no vouch control`);
  ok(!/Vouched for by/i.test(body), `    no public list of who vouched`);
  ok(!/Share a Positive Experience/i.test(body), `    no signed public note form`);
  // The listing must still do its actual job.
  ok(/Save/i.test(body), `    saving is still offered`);
  ok(/Report an issue|Suggest a Correction/i.test(body), `    a private route to the team remains`);
}

for (const p of ordinary) {
  const body = await visit(p);
  console.log(`  — ${(p.name || '').slice(0, 30)} (ordinary listing)`);
  ok(/vouch for this/i.test(body), `    public vouching still works where it helps`);
}
if (!ordinary.length) {
  console.log('  info  every listing in this directory is currently a help organization,');
  console.log('        so the "narrow, not blanket" half is pinned in server/api.test.mjs');
}

console.log(fails ? `\n${fails} privacy check(s) failed` : '\nprivacy: all checks passed');
ws.close();
process.exit(fails ? 1 : 0);
