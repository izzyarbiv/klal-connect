// Text is readable in both themes.
//
// usage: node scripts/contrast-check.mjs [baseUrl]
//
// Contrast is measured the way a reader meets it: the text's computed colour
// against the first ancestor that actually paints a background, judged by WCAG
// AA — 4.5:1 for body text, 3:1 for large or bold text.
//
// This exists because one token serving two roles is easy to miss by eye.
// --brand-teal is dark in light mode and light in dark mode, so white text on
// it measured 5.1 in one theme and 2.79 in the other, and the Sign up button —
// the most important button in the app — failed only for people using dark
// mode. Nothing in the suite would have caught that.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9246;
const BASE = process.argv[2] || 'https://klalconnect.org';
const ROUTES = ['', 'directory', 'browse', 'feed', 'people', 'companies'];

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/kc-ct-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
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

// Only a character class needs escaping here, and it is written so the template
// does not have to carry a backslash at all.
const CONTRAST = `(() => {
  const nums = (s) => (s || '').replace(/[^0-9.,]/g, '').split(',').map((x) => parseFloat(x)).filter((n) => !isNaN(n));
  const parse = (s) => { const p = nums(s); return p.length >= 3 ? { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 } : null; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.5) return c.rgb;
    }
    const root = parse(getComputedStyle(document.body).backgroundColor);
    return root ? root.rgb : [255, 255, 255];
  };
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    // Only elements holding their own text, so a wrapper is not blamed for its
    // children's colours.
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || parseFloat(s.opacity) === 0) continue;
    const fg = parse(s.color);
    if (!fg || fg.a < 0.5) continue;
    const L1 = lum(fg.rgb), L2 = lum(bgOf(el));
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(s.fontSize);
    const bold = (parseInt(s.fontWeight, 10) || 400) >= 700;
    const need = (size >= 24 || (bold && size >= 18.66)) ? 3 : 4.5;
    if (ratio < need) {
      out.push({
        text: own.slice(0, 32),
        ratio: Math.round(ratio * 100) / 100,
        need,
        cls: (el.getAttribute('class') || '').split(' ').filter(Boolean).slice(0, 3).join('.'),
      });
    }
  }
  return out;
})()`;

let fails = 0;
console.log(`\ncontrast check against ${BASE}\n`);

for (const theme of ['light', 'dark']) {
  console.log(`  ${theme} mode`);
  for (const route of ROUTES) {
    await send('Page.navigate', { url: `${BASE}/${route}` });
    await sleep(4000);
    // The theme is a class on the root element (darkMode: ["class"]), set here
    // directly so the result does not depend on the machine's own preference.
    await ev(`document.documentElement.classList.${theme === 'dark' ? 'add' : 'remove'}('dark')`);
    await sleep(600);
    const bad = (await ev(CONTRAST)) || [];
    fails += bad.length;
    console.log(`    ${bad.length ? 'FAIL' : 'ok  '} /${route.padEnd(11)} ${bad.length ? `${bad.length} below AA` : 'all text meets AA'}`);
    const seen = new Set();
    for (const b of bad) {
      const key = b.cls + b.ratio;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`           ${b.ratio}:1 (needs ${b.need})  ${b.cls || '(no class)'}  "${b.text}"`);
    }
  }
  console.log('');
}

console.log(fails ? `${fails} text node(s) below WCAG AA` : 'contrast: all text meets WCAG AA in both themes');
ws.close();
process.exit(fails ? 1 : 0);
