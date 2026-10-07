// Installed to the home screen, the app chrome stays reachable.
//
// usage: node scripts/safe-area-check.mjs [baseUrl]   (localhost only)
//
// index.html sets viewport-fit=cover and apple-mobile-web-app-status-bar-style
// black-translucent, so in standalone the page extends *under* the status bar
// and the Dynamic Island. The bottom bar and the install prompt accounted for
// that; the header did not, so on an installed iPhone the settings gear and the
// theme toggle sat behind the island and could not be tapped. In Safari the
// browser's own chrome occupies that space, which is why the website was fine
// and only the installed app was broken.
//
// Headless Chrome cannot be given a notch, so this checks two things that
// together cover it: that the stylesheet really declares the insets, and that
// the layout responds correctly when a top inset is present — the controls move
// clear of it and stay hittable.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.argv[2] || 'http://localhost:5200';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
  console.error(`refusing to register a member against ${BASE} — this check is localhost only`);
  process.exit(2);
}
// CHROME_PATH so these can run somewhere other than a Mac. They were written
// for one laptop, which is why the UI checks never ran in CI — and the UI is
// exactly what the other checks cannot see.
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9258;
const INSET = 47; // iPhone 14/15 Pro status bar + island

async function api(method, path, o = {}) {
  const r = await fetch(`${BASE}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(o.token ? { Authorization: 'Bearer ' + o.token } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
  let d = null; try { d = await r.json(); } catch { /* empty */ }
  return { status: r.status, data: d };
}

const email = `safearea${Date.now()}@example.com`;
const reg = await api('POST', '/auth/register', { body: { email, password: 'password123' } });
const ver = await api('POST', '/auth/verify-otp', { body: { email, otpCode: reg.data?.dev_code } });
const token = ver.data?.access_token;

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/kc-sa-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
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
const ok = (cond, label, extra = '') => { if (!cond) fails++; console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${label}${extra ? `  ${extra}` : ''}`); };

console.log(`\nsafe-area check against ${BASE}\n`);

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await send('Page.navigate', { url: `${BASE}/` });
await sleep(3000);
await ev(`localStorage.setItem('kc_access_token', ${JSON.stringify(token)})`);
await send('Page.navigate', { url: `${BASE}/` });
await sleep(5000);

// --- the stylesheet actually declares the insets -------------------------
const declared = await ev(`(() => {
  const want = ['safe-area-inset-top', 'safe-area-inset-bottom'];
  const found = {};
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules) {
      const text = rule.cssText || '';
      for (const w of want) if (text.includes(w)) found[w] = (found[w] || 0) + 1;
    }
  }
  return found;
})()`);
ok((declared['safe-area-inset-top'] || 0) > 0, 'the stylesheet declares a top inset', JSON.stringify(declared));

// --- the chrome that was unreachable ------------------------------------
const controls = `(() => {
  const header = document.querySelector('header');
  if (!header) return null;
  const pick = (label) => {
    const el = [...header.querySelectorAll('a, button')].find((x) => (x.getAttribute('aria-label') || '') === label);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(cx, cy);
    return { top: Math.round(r.top), cy, hittable: !!hit && (hit === el || el.contains(hit)) };
  };
  return { headerTop: Math.round(header.getBoundingClientRect().top), settings: pick('Settings'), theme: pick('Toggle dark mode') };
})()`;

let m = await ev(controls);
ok(!!m && !!m.settings, 'the settings control is in the header', JSON.stringify(m && m.settings));
const baseline = m;

// --- now give it a notch -------------------------------------------------
// env() cannot be set from script, so the inset is simulated as padding on the
// same element the real rule targets. This proves the layout moves its controls
// clear of the status bar rather than letting them sit under it.
await ev(`(() => {
  const s = document.createElement('style');
  s.id = 'kc-fake-inset';
  s.textContent = 'header { padding-top: ${INSET}px !important; }';
  document.head.appendChild(s);
  return true;
})()`);
await sleep(600);
m = await ev(controls);

ok(!!m && !!m.settings && m.settings.top >= INSET, `the settings control clears a ${INSET}px status bar`,
  m && m.settings ? `top=${m.settings.top}px (was ${baseline?.settings?.top}px)` : 'not found');
ok(!!m && !!m.settings && m.settings.hittable, 'and is still the thing under that point',
  m && m.settings ? `hittable=${m.settings.hittable}` : '');
// Unconditional. The first version guarded this on the element being found and
// used the wrong aria-label, so it silently skipped the theme toggle — which is
// one of the two controls actually reported as unreachable.
ok(!!m && !!m.theme, 'the theme toggle is in the header', JSON.stringify(m && m.theme));
ok(!!m && !!m.theme && m.theme.top >= INSET, `the theme toggle clears the ${INSET}px status bar`, m && m.theme ? `top=${m.theme.top}px` : '');
ok(!!m && !!m.theme && m.theme.hittable, 'and is still the thing under that point');

// --- nothing is hidden behind the bottom bar ----------------------------
const bottom = await ev(`(() => {
  const nav = [...document.querySelectorAll('nav')].filter((n) => getComputedStyle(n).position === 'fixed').pop();
  if (!nav) return null;
  const pad = parseFloat(getComputedStyle(document.querySelector('.min-h-screen')).paddingBottom) || 0;
  return { navHeight: Math.round(nav.getBoundingClientRect().height), bodyPadding: Math.round(pad) };
})()`);
ok(!!bottom && bottom.bodyPadding >= bottom.navHeight, 'the page reserves at least the height of the bottom bar',
  JSON.stringify(bottom));

console.log(fails ? `\n${fails} safe-area check(s) failed` : "\nsafe area: the app chrome stays reachable");
ws.close();
process.exit(fails ? 1 : 0);
