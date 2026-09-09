// Keeps the Content-Security-Policy honest about the one inline script.
//
// index.html applies the saved theme before first paint — it has to be inline
// to beat the first render — so the policy carries its hash instead of
// allowing inline script generally. Change that script and the hash goes
// stale, and the theme silently stops applying once the policy is enforced.
// This fails the build instead.
import fs from 'node:fs';
import crypto from 'node:crypto';

const html = fs.readFileSync('dist/index.html', 'utf8');
const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const hashes = inline.map((s) => `sha256-${crypto.createHash('sha256').update(s, 'utf8').digest('base64')}`);
const policies = config.routes
  .flatMap((r) => Object.entries(r.headers || {}))
  .filter(([k]) => k.startsWith('Content-Security-Policy'))
  .map(([, v]) => v);

if (!policies.length) { console.log('[csp] no policy set — nothing to check'); process.exit(0); }
const missing = hashes.filter((h) => !policies.some((p) => p.includes(h)));
if (missing.length) {
  console.error(`[csp] ${missing.length} inline script(s) are not in the policy. Add to script-src in vercel.json:`);
  for (const h of missing) console.error(`  '${h}'`);
  process.exit(1);
}
const stale = policies.flatMap((p) => [...p.matchAll(/'(sha256-[A-Za-z0-9+/=]+)'/g)].map((m) => m[1])).filter((h) => !hashes.includes(h));
if (stale.length) console.warn(`[csp] policy carries ${stale.length} hash(es) no longer in the shell: ${stale.join(', ')}`);
console.log(`[csp] ${hashes.length} inline script(s), all allowed by the policy`);
