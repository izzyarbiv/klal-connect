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

const dir = 'dist/assets';
if (!fs.existsSync(dir)) { console.error(`[dev-code] ${dir} not found — run vite build first`); process.exit(1); }
const hits = fs.readdirSync(dir)
  .filter((f) => f.endsWith('.js'))
  .filter((f) => fs.readFileSync(path.join(dir, f), 'utf8').includes('dev_code'));
if (hits.length) {
  console.error(`[dev-code] "dev_code" found in ${hits.length} production chunk(s): ${hits.join(', ')}`);
  console.error('[dev-code] guard the read with import.meta.env.DEV so Vite drops it from the bundle');
  process.exit(1);
}
console.log('[dev-code] production bundle carries no dev_code reference');
