// Fails the build if the production bundle mentions `dev_code`.
//
// The server hands verification codes back to the client only in local dev
// (KC_EMAIL_DELIVERY=dev, never in production). The client reads that field
// behind import.meta.env.DEV so Vite strips the read from production builds.
// Should someone add a read without the guard, the field name reappears in
// dist/: harmless on its own, but it is the one string that would let a
// reviewer believe codes reach the browser, and the guard is what keeps the
// dev-only path from quietly growing. This scans what `vite build` produced;
// it builds nothing itself.
import fs from 'node:fs';
import path from 'node:path';

// Every file Vite emitted, wherever it put it. The first version read only
// dist/assets/*.js, so a chunkFileNames change, an .mjs worker or an inlined
// script in index.html would have passed unread — and a security check that
// can be dodged by a config change is a check that reports what it did not
// look at.
const root = 'dist';
if (!fs.existsSync(root)) { console.error(`[dev-code] ${root} not found — run vite build first`); process.exit(1); }
const SCAN = /\.(m?js|cjs|html|css)$/;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const f = path.join(d, e.name);
  return e.isDirectory() ? walk(f) : [f];
});
const files = walk(root);
const maps = files.filter((f) => f.endsWith('.map'));
const hits = files.filter((f) => SCAN.test(f)).filter((f) => fs.readFileSync(f, 'utf8').includes('dev_code'));
if (hits.length) {
  console.error(`[dev-code] "dev_code" found in ${hits.length} production file(s): ${hits.join(', ')}`);
  console.error('[dev-code] guard the read with import.meta.env.DEV so Vite drops it from the bundle');
  process.exit(1);
}
// Source maps are not shipped by this build; if one ever appears it would
// carry the unguarded source verbatim, so say so rather than scan around it.
if (maps.length) console.warn(`[dev-code] warning: ${maps.length} source map(s) in dist/ — these expose source and should not be deployed`);
console.log(`[dev-code] ${files.filter((f) => SCAN.test(f)).length} production files carry no dev_code reference`);
