// Every URL in the sitemap has to survive hydration.
//
// The server prerenders a real page for each of them — title, canonical,
// JSON-LD, the listings themselves — and then the React bundle mounts over it.
// If the client router has no route matching that URL, it renders the 404 page
// on top of a page that was perfectly good a moment earlier. A crawler sees
// 200 and content; a person sees "Page Not Found". That is what happened to
// /directory/:category and /directory/:category/:city, six of nineteen
// sitemap URLs, and nothing in the test suite could see it.
//
// This has to run against a deployment, not `vite preview`.
//
// The two halves only meet in the deployed topology: Vercel serves the built
// assets from the filesystem and routes everything else to the Express
// function, which is what renders the sitemap and the prerendered pages.
// `vite preview` serves no sitemap, and Express on its own serves no bundle —
// against either one this check would pass for the wrong reason.
//
// usage: node scripts/hydration-check.mjs [baseUrl]     (default: production)
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromePath, debugTarget } from './lib/chrome.mjs';

// CHROME_PATH so these can run somewhere other than a Mac. They were written
// for one laptop, which is why the UI checks never ran in CI — and the UI is
// exactly what the other checks cannot see.
const CHROME = chromePath();
const PORT = 9232;
const BASE = (process.argv[2] || 'https://klalconnect.org').replace(/\/$/, '');

const res = await fetch(`${BASE}/sitemap.xml`).catch(() => null);
if (!res || !res.ok) {
  console.error(`could not fetch ${BASE}/sitemap.xml`);
  console.error('this check needs a deployment that serves both the sitemap and the built assets —');
  console.error('pass a deployed URL, e.g. node scripts/hydration-check.mjs https://klalconnect.org');
  process.exit(2);
}
const xml = await res.text();
const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
if (!paths.length) { console.error('sitemap has no <loc> entries'); process.exit(2); }
console.log(`checking ${paths.length} sitemap URLs against ${BASE}\n`);

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/kc-hyd-${Date.now()}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
process.on('exit', () => { try { chrome.kill('SIGKILL'); } catch { /* already gone */ } });

const target = () => debugTarget(PORT, chrome);

const ws = new WebSocket(await target());
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const x = JSON.parse(m.data); if (pend.has(x.id)) { const { res: ok, rej } = pend.get(x.id); pend.delete(x.id); x.error ? rej(new Error(x.error.message)) : ok(x.result); } };
const send = (m, p = {}) => new Promise((ok, rej) => { const i = ++id; pend.set(i, { res: ok, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value;

await send('Page.enable'); await send('Runtime.enable');

let fails = 0;
for (const path of paths) {
  await send('Page.navigate', { url: BASE + path });
  // Long enough for the bundle to boot and the router to settle.
  await sleep(3000);
  const notFound = await ev(`(() => /Page Not Found|could not be found in this application/i.test(document.body.innerText || ''))()`);
  const landed = await ev('location.pathname');
  const rooted = await ev(`(() => { const r = document.querySelector('#root'); return !!r && r.children.length > 0; })()`);
  const moved = landed !== path;
  // A URL in the sitemap is one we are asking to have indexed, so it must not
  // come back noindex. /companies was listed unconditionally while being served
  // noindex whenever it had nothing on it — asking a crawler to fetch a page and
  // then telling it to ignore what it found.
  //
  // Read over HTTP rather than from the DOM. The service worker's
  // navigateFallback serves index.html for navigations once it has registered,
  // and that shell carries no robots tag — so a DOM read quietly inspected a
  // cached shell instead of the server's answer and reported every page clean.
  // A crawler sees the HTTP response, so that is what has to be checked.
  const served = await fetch(BASE + path, { headers: { 'User-Agent': 'kc-hydration-check' } })
    .then((r) => r.text())
    .catch(() => '');
  const robots = (served.match(/name="robots"[^>]*content="([^"]*)"/i) || [])[1] || '';
  const noindexed = /noindex/i.test(robots);
  const bad = notFound || moved || !rooted || noindexed;
  if (bad) fails++;
  const why = notFound ? '404 AFTER HYDRATION'
    : moved ? `MOVED TO ${landed}`
      : !rooted ? 'EMPTY ROOT'
        : noindexed ? `NOINDEX BUT IN SITEMAP (${robots})`
          : 'ok';
  console.log(`  ${bad ? 'FAIL' : 'ok  '} ${path.padEnd(38)} ${why}`);
}

console.log(fails
  ? `\n${fails} of ${paths.length} sitemap URLs break on hydration`
  : `\nall ${paths.length} sitemap URLs survive hydration`);
ws.close();
process.exit(fails ? 1 : 0);
