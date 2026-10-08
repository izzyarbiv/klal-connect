// Reset or create an admin on the LIVE database, with one short command:
//
//   npm run prod:admin -- you@example.com 'a-new-password'
//
// There is no self-serve reset on production until email is configured, and the
// old route to one was a long shell line that pulled the production env into a
// temp file, spliced DATABASE_URL out of it and ran create-admin. This does the
// same thing, in code, and cleans up after itself.
//
// It writes to production, so it says where it is writing and asks first.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline/promises';

const [email, password] = process.argv.slice(2).filter((a) => a !== '--yes');
if (!email || !password) {
  console.error("usage: npm run prod:admin -- you@example.com 'a-new-password'");
  process.exit(1);
}
if (password.length < 8) { console.error('Password must be at least 8 characters.'); process.exit(1); }

const dir = mkdtempSync(join(tmpdir(), 'kc-prod-'));
const file = join(dir, 'prod.env');
try {
  execFileSync('vercel', ['env', 'pull', file, '--environment=production', '--yes'], { stdio: 'ignore' });
  const env = Object.fromEntries(readFileSync(file, 'utf8').split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
  if (!env.DATABASE_URL) throw new Error('Production has no DATABASE_URL — is this project linked? Run: vercel link');

  let host = '(unknown)';
  try { host = new URL(env.DATABASE_URL).hostname; } catch { /* leave unknown */ }
  console.log(`This will set the password for ${email} on the LIVE database (${host}) and make it an admin.`);
  if (!process.argv.includes('--yes')) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question('Type "yes" to continue: ')).trim().toLowerCase();
    rl.close();
    if (answer !== 'yes') { console.log('Cancelled. Nothing was changed.'); process.exit(0); }
  }
  const r = spawnSync('node', ['server/create-admin.js', email, password], {
    stdio: 'inherit', env: { ...process.env, DATABASE_URL: env.DATABASE_URL },
  });
  process.exitCode = r.status ?? 1;
} finally {
  // The pulled file held the database URL and signing secret.
  rmSync(dir, { recursive: true, force: true });
}
