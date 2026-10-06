// The two paths the app cannot launch without: joining, and adding a listing.
//
// usage: node scripts/critical-paths-check.mjs [baseUrl]   (localhost only)
//
// Both are covered server-side in server/api.test.mjs, which proves the API
// accepts them. Neither had ever been driven through the actual form. If sign-up
// is broken nobody joins, and if the listing form is broken supply never grows —
// and every other check in this suite would still pass.
//
// It registers a member and publishes a listing, so it refuses to run anywhere
// but a local host.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.argv[2] || 'http://localhost:5200';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
  console.error(`refusing to register and publish against ${BASE} — this check is localhost only`);
  process.exit(2);
}
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9247;
const EMAIL = `joiner${Date.now()}@example.com`;
const PASSWORD = 'password123';
const LISTING = `Teitelbaum Plumbing ${Math.random().toString(36).slice(2, 6)}`;

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/kc-cp-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
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

// React owns these inputs, so assigning .value is ignored — the value has to go
// through the native setter with the events React listens for.
const SET = `(sel, value) => {
  const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
  if (!el) return false;
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
    : el.tagName === 'SELECT' ? HTMLSelectElement.prototype
    : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}`;

console.log(`\ncritical paths against ${BASE}\n`);

// ---- joining -------------------------------------------------------------
console.log('  signing up');
await send('Page.navigate', { url: `${BASE}/register` });
await sleep(4000);
ok(await ev(`!!document.querySelector('input[type=email]')`), '    the register form is there');
await ev(`(${SET})('input[type=email]', ${JSON.stringify(EMAIL)})`);
await ev(`(${SET})('input[type=password]', ${JSON.stringify(PASSWORD)})`);
await ev(`document.querySelector('form button[type=submit]').click()`);
await sleep(4500);

// Email delivery is off locally, so the code is shown on screen.
const shown = await ev(`(() => { const m = (document.body.innerText || '').match(/your code is\\s*(\\d{6})/i); return m ? m[1] : ''; })()`);
ok(/^\d{6}$/.test(shown), '    the verification step shows the dev code', shown || '(none)');
if (/^\d{6}$/.test(shown)) {
  // The code goes in through the native setter, then Verify has to be clicked:
  // it stays disabled until six digits are present and the form does not submit
  // itself. An earlier version typed the code and stopped there, which looked
  // like a broken sign-up when the only thing missing was the click.
  await ev(`(${SET})('input[maxlength="6"]', ${JSON.stringify(shown)})`);
  await sleep(800);
  const verified = await ev(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /^Verify$/i.test((x.innerText || '').trim()));
    if (!b || b.disabled) return false;
    b.click();
    return true;
  })()`);
  ok(verified, '    the Verify button is enabled once the code is entered');
  await sleep(5500);
}
const token = await ev(`localStorage.getItem('kc_access_token')`);
ok(!!token, '    signing up leaves the member signed in', token ? `${String(token).slice(0, 10)}…` : '(no token)');
ok(!/\/register$/.test(await ev('location.pathname')), '    and moves on from the register page', await ev('location.pathname'));

// The first ninety seconds of every member's life here. If this is broken,
// everyone who joins hits a wall before they have seen anything.
const welcome = await ev('document.body.innerText');
ok(/First, your name|WELCOME/i.test(welcome), '    onboarding opens on its first question',
  /First, your name|WELCOME/i.test(welcome) ? '' : welcome.slice(0, 120).split('\n').join(' '));

// ---- adding a listing ----------------------------------------------------
console.log('\n  adding a listing');
await send('Page.navigate', { url: `${BASE}/add` });
await sleep(5000);
ok(await ev(`!!document.querySelector('input[name=name]')`), '    the listing form is there (not a login wall)');

const category = await ev(`(() => {
  const s = document.querySelector('select[name=category]');
  if (!s) return '';
  const opt = [...s.options].find((o) => o.value && o.value !== '');
  return opt ? opt.value : '';
})()`);
ok(!!category, '    the category list loaded', category || '(empty)');

// Category is a required field, so a list that does not name your thing is a
// dead end — a shul and a shidduchim resource both had nowhere to go. "Other"
// is the escape hatch, and it has to be last or it reads as a real choice.
const catOptions = await ev(`[...document.querySelectorAll('select[name=category] option')].map((o) => o.value).filter(Boolean)`);
ok((catOptions || []).includes('Other'), '    the category list offers "Other"', `${(catOptions || []).length} categories`);
ok((catOptions || [])[catOptions.length - 1] === 'Other', '    and offers it last', (catOptions || []).slice(-3).join(' | '));

// Choosing it should ask what the thing actually is, since that is all anyone
// will have to search by.
await ev(`(${SET})('select[name=category]', 'Other')`);
await sleep(600);
const otherHint = await ev(`(() => { const i = document.querySelector('input[name=subcategory]'); return i ? (i.placeholder || '') : ''; })()`);
ok(/what it is/i.test(otherHint), '    and asks what it actually is', JSON.stringify(otherHint));
// Put the real category back for the publish below.
await ev(`(${SET})('select[name=category]', ${JSON.stringify(category)})`);
await sleep(400);

// Every required control the form declares, rather than a list kept in step by
// hand. The first version filled four fields and missed two: the description
// textarea, and the city input — whose placeholder is "Lakewood, Brooklyn,
// Jerusalem…", so matching on /city/ found nothing. HTML5 validation then
// blocked submit with no error on screen, which reads exactly like a broken
// form. Asking the form what it requires cannot drift.
const filled = await ev(`(() => {
  const set = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
      : el.tagName === 'SELECT' ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const done = [];
  for (const el of document.querySelectorAll('form [required]')) {
    if (el.value) continue;
    if (el.tagName === 'SELECT') {
      const opt = [...el.options].find((o) => o.value);
      if (opt) set(el, opt.value);
    } else if (el.name === 'name') {
      set(el, ${JSON.stringify(LISTING)});
    } else if (el.tagName === 'TEXTAREA') {
      set(el, 'Emergency repairs, installations and maintenance for homes and shuls across the community.');
    } else if (!el.name) {
      set(el, 'Boca Raton');
    } else {
      set(el, 'Emergency repairs and installations for the community.');
    }
    done.push(el.tagName.toLowerCase() + ':' + (el.name || '(unnamed)'));
  }
  return done;
})()`);
console.log(`           filled: ${(filled || []).join(', ')}`);
await sleep(1200);
const stillEmpty = await ev(`[...document.querySelectorAll('form [required]')].filter((e) => !e.value).map((e) => e.name || e.tagName.toLowerCase())`);
ok((stillEmpty || []).length === 0, '    every required field is filled', JSON.stringify(stillEmpty));


const clicked = await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /Publish my listing/i.test(x.textContent));
  if (!b) return false;
  b.click();
  return true;
})()`);
ok(clicked, '    the publish button is there');
await sleep(6000);

const body = await ev('document.body.innerText');
ok(/Your listing is live/i.test(body), '    publishing succeeds', /Your listing is live/i.test(body) ? '' : body.slice(0, 180).split('\n').join(' '));

// And it is really in the directory, not just a success message.
const found = await (await fetch(`${BASE}/api/entities/Provider?limit=200`)).json().catch(() => []);
ok(Array.isArray(found) && found.some((p) => p.name === LISTING), '    the listing is in the directory', LISTING);

// ---- coming back --------------------------------------------------------
// Registering is only half of auth. If signing in is broken, every member who
// already joined is locked out, and no check in this suite would have noticed.
console.log('\n  signing out and back in');
await send('Page.navigate', { url: `${BASE}/` });
await sleep(3500);
const loggedOut = await ev(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /log out/i.test(x.getAttribute('aria-label') || x.textContent || ''));
  if (!b) return false;
  b.click();
  return true;
})()`);
ok(loggedOut, '    there is a way to log out');
await sleep(3500);

await send('Page.navigate', { url: `${BASE}/login` });
await sleep(4000);
ok(await ev(`!!document.querySelector('input[type=email]')`), '    the login form is there');
await ev(`(${SET})('input[type=email]', ${JSON.stringify(EMAIL)})`);
await ev(`(${SET})('input[type=password]', ${JSON.stringify(PASSWORD)})`);
await ev(`document.querySelector('form button[type=submit]').click()`);
await sleep(5000);
ok(!/\/login$/.test(await ev('location.pathname')), '    signing back in leaves the login page', await ev('location.pathname'));
const backIn = await ev(`(async () => {
  const r = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + (localStorage.getItem('kc_access_token') || '') } });
  if (!r.ok) return '';
  const u = await r.json();
  return u.email || '';
})()`);
ok(backIn === EMAIL, '    and the session is the same member', JSON.stringify(backIn));

const real = errors.filter((e) => !/favicon|\[vite\]|manifest|sw\.js/i.test(e));
ok(real.length === 0, '    no page errors', real.slice(0, 2).join(' | '));

console.log(fails ? `\n${fails} critical-path check(s) failed` : '\ncritical paths: joining, onboarding, publishing a listing and signing back in all work');
ws.close();
process.exit(fails ? 1 : 0);
