// Search answers "who can help me with this, in this community?" honestly.
//
// usage: node scripts/search-check.mjs [baseUrl]
//
// Three regressions this guards, all of which shipped at some point:
//   1. Padding. A search with no matches used to drop the query and return the
//      whole directory, counting it as results.
//   2. Vocabulary. "therapist" found nothing while four mental-health services
//      sat in the directory describing themselves as "mental health".
//   3. Place. Organisations serving "Nationwide" were reported as being in
//      "another community" to the people they serve.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9238;
const BASE = process.argv[2] || 'https://klalconnect.org';

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/kc-search-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
process.on('exit', () => { try { chrome.kill('SIGKILL'); } catch {} });

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* not listening yet */ }
    await sleep(250);
  }
  throw new Error('no debug target');
}

const ws = new WebSocket(await target());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pend = new Map();
const pageErrors = [];
ws.onmessage = (m) => {
  const x = JSON.parse(m.data);
  if (x.method === 'Runtime.exceptionThrown') {
    const d = x.params?.exceptionDetails;
    pageErrors.push(d?.exception?.description || d?.text || 'uncaught exception');
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
const ev = async (expression) =>
  (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;

await send('Page.enable');
await send('Runtime.enable');

let fails = 0;
const ok = (cond, label, extra = '') => {
  if (!cond) fails++;
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${label}${extra ? `  ${extra}` : ''}`);
};

// Wait until the page has actually answered, rather than pausing a fixed
// number of seconds and hoping.
//
// The first request after a deploy hits a cold serverless function, and a flat
// 4s wait reported three false failures immediately after one — the searches
// were correct, the page just had not rendered yet. A check that cries wolf
// after every deploy is worse than no check, because the next real failure gets
// waved away as "probably the cold start again".
// Readiness is "the directory has loaded", not "some text appeared".
//
// The first version of this waited for the results line, which was wrong in a
// way worth recording: before the listings arrive, Browse legitimately renders
// "No matches" over an empty array, so the check read that first paint as the
// answer and reported seven failures against a search that works. The ask link
// is gated on having listings too, so even the zero-result case mis-reported.
//
// The category filter prints "All categories (N)" straight from the loaded rows,
// which is only non-zero once the data is really in hand. No backslashes in the
// page expression on purpose — escaping through this template is its own trap.
async function settled(timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await ev(`(() => {
      if (document.querySelectorAll('a[href^="/provider/"]').length > 0) return true;
      const opt = [...document.querySelectorAll('option')].find((o) => o.textContent.indexOf('All categories') === 0);
      if (!opt) return false;
      const digits = opt.textContent.replace(/[^0-9]/g, '');
      return digits !== '' && Number(digits) > 0;
    })()`);
    if (ready) return true;
    await sleep(400);
  }
  return false;
}

// One search, described by what a person would see afterwards.
async function search(q, place) {
  const url = `${BASE}/browse?q=${encodeURIComponent(q)}${place ? `&location=${encodeURIComponent(place)}` : ''}`;
  await send('Page.navigate', { url });
  if (!(await settled())) console.log('  info  the results area never settled; the assertions below say what was there');
  return {
    cards: await ev(`document.querySelectorAll('a[href^="/provider/"]').length`),
    body: await ev('document.body.innerText'),
    ask: await ev(`!!document.querySelector('a[href*="/feed?ask="]')`),
  };
}

// Warm the function before the first assertion, so a cold start is not
// mistaken for a broken search.
await fetch(`${BASE}/api/entities/Provider?limit=1`).catch(() => {});

console.log(`\nsearch checks against ${BASE}\n`);

// 1. An organisation that serves the whole country serves this town too.
{
  const r = await search('therapist', 'Boca Raton');
  ok(r.cards > 0, 'therapist in Boca Raton returns nationwide help', `${r.cards} cards`);
  ok(!/No matches/i.test(r.body), 'it is not reported as "no matches"');
  ok(/resources? found in Boca Raton/i.test(r.body), 'the count names the community',
    (r.body.match(/\d+ resources? found in [^\n]*/i) || [''])[0]);
}

// 2. The word someone types is not the word an organisation files itself under.
{
  const r = await search('mental health', 'Boca Raton');
  ok(r.cards > 0, 'the institutional phrase finds the same help', `${r.cards} cards`);
}

// 3. A genuine gap is a gap — and it offers a way out, not padding.
{
  const r = await search('plumber', 'Boca Raton');
  ok(r.cards === 0, 'a search with nothing behind it returns no cards', `${r.cards} cards`);
  ok(/No matches/i.test(r.body), 'it says so plainly');
  ok(r.ask, 'and offers to ask the klal');
}

// 4. Transliteration is not a spelling test.
{
  const r = await search('mikva', 'Boca Raton');
  ok(r.cards > 0, 'a different spelling still finds the mikvah', `${r.cards} cards`);
}

// 5. Everyday language for a food pantry.
{
  const r = await search('soup kitchen', '');
  ok(/Masbia/i.test(r.body), 'soup kitchen reaches Masbia');
}

const real = pageErrors.filter((e) => !/favicon|manifest|sw\.js/i.test(e));
ok(real.length === 0, 'no page errors', real.slice(0, 3).join(' | '));

console.log(fails ? `\n${fails} search check(s) failed` : '\nsearch: all checks passed');
ws.close();
process.exit(fails ? 1 : 0);
