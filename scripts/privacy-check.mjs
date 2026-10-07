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
import { chromePath, debugTarget } from './lib/chrome.mjs';

// CHROME_PATH so these can run somewhere other than a Mac. They were written
// for one laptop, which is why the UI checks never ran in CI — and the UI is
// exactly what the other checks cannot see.
const CHROME = chromePath();
const PORT = 9239;
const BASE = process.argv[2] || 'https://klalconnect.org';
const MAX = Number(process.env.KC_PRIVACY_MAX || 4);

const listings = await (await fetch(`${BASE}/api/entities/Provider?limit=100`)).json();
const sensitive = listings.filter(isSensitiveListing).slice(0, MAX);
const ordinary = listings.filter((p) => !isSensitiveListing(p)).slice(0, 1);

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/kc-priv-${Date.now()}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
process.on('exit', () => { try { chrome.kill('SIGKILL'); } catch {} });

const target = () => debugTarget(PORT, chrome);

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

// Every assertion below this is about something NOT being on the page, and a
// page that has not finished rendering satisfies all of them. So the listing's
// own name has to be on screen before anything is judged absent — otherwise a
// slow response reads as a privacy guarantee.
async function visit(provider) {
  await send('Page.navigate', { url: `${BASE}/provider/${provider.id}` });
  const needle = JSON.stringify(String(provider.name || '').slice(0, 18));
  const deadline = Date.now() + 25000;
  let ready = false;
  while (Date.now() < deadline) {
    // The listing's name is not proof the app is running: server/seo.js
    // prerenders it into the HTML. Keying on the name matched that
    // server-rendered text and judged the sidebar absent before React had drawn
    // it — reporting a missing Save button on a page that has one.
    //
    // "Back to browse" is drawn only by the hydrated ProviderDetail, and is not
    // one of the things this script asserts, so it cannot mask a real failure.
    ready = await ev(`(() => {
      const t = document.body.innerText || '';
      return t.includes('Back to browse') && t.includes(${needle});
    })()`);
    if (ready) break;
    await sleep(400);
  }
  if (!ready) console.log(`  info  ${provider.name} never rendered; treating the checks below as unreliable`);
  return { body: await ev('document.body.innerText'), ready };
}

console.log(`\nprivacy checks against ${BASE}`);
console.log(`${sensitive.length} sensitive listing(s) checked, ${ordinary.length} ordinary\n`);

for (const p of sensitive) {
  const { body, ready } = await visit(p);
  const name = (p.name || '').slice(0, 30);
  console.log(`  — ${name}`);
  // Asserted, not merely noted: without this, a listing that never rendered
  // would satisfy every "is not present" check below and report a pass.
  ok(ready, `    the page rendered, so "absent" means absent`);
  ok(!/I've Used This|Used ✓/i.test(body), `    no public "used this" control`);
  ok(!/vouch for this/i.test(body), `    no vouch control`);
  ok(!/Vouched for by/i.test(body), `    no public list of who vouched`);
  ok(!/Share a Positive Experience/i.test(body), `    no signed public note form`);
  // The listing must still do its actual job.
  ok(/Save/i.test(body), `    saving is still offered`);
  ok(/Report an issue|Suggest a Correction/i.test(body), `    a private route to the team remains`);
}

for (const p of ordinary) {
  const { body } = await visit(p);
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
