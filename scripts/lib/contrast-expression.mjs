// The WCAG AA contrast sweep, as an expression to evaluate in the page.
//
// Shared because it was measuring only the pages one check happened to visit.
// New markup kept arriving on pages no sweep opened — the signed-in pages, the
// owner panel, the admin queues — and each time a clean run meant nothing. A
// check that renders markup the main sweep cannot reach can now measure it
// where it stands, instead of that markup going unmeasured.
export const CONTRAST = `(() => {
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
