// Is production running the code in this working tree?
//
// Nothing could answer that. A push to main does not deploy this project —
// deploys are manual — and so six commits sat on GitHub, unshipped, for a day
// while every local check passed and the site looked fine. The failure was
// silent, which is the only reason it lasted.
//
//   npm run deploy:status            against klalconnect.org
//   npm run deploy:status -- <url>   against any deployment
import { execSync } from 'node:child_process';

const BASE = (process.argv[2] || process.env.KC_PROD_URL || 'https://klalconnect.org').replace(/\/$/, '');
const git = (cmd, fallback = '') => {
  try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return fallback; }
};

const head = git('git rev-parse --short=12 HEAD');
const subject = git('git log -1 --format=%s');
const dirty = git('git status --porcelain').length > 0;
const branch = git('git rev-parse --abbrev-ref HEAD');
const remote = git('git ls-remote origin HEAD').slice(0, 12);

console.log(`local   ${head}${dirty ? ' + uncommitted changes' : ''}  (${branch})  "${subject}"`);
console.log(`origin  ${remote || '(could not reach the remote)'}`);

let live = null;
let problem = '';
try {
  const res = await fetch(`${BASE}/api/health`, { headers: { accept: 'application/json' } });
  const body = await res.text();
  if (res.status === 403 && /Security Checkpoint|challenge/i.test(body)) {
    // Repeated automated requests trip Vercel's bot mitigation, which answers
    // 403 with an interstitial. That is this check being challenged, not the
    // site being down — so say which, rather than reporting a false outage.
    problem = `${BASE} answered 403 with Vercel's bot challenge. The site is almost certainly up — a browser passes this. Open ${BASE}/api/health by hand, or try again later and stop polling.`;
  } else if (!res.ok) {
    problem = `${BASE}/api/health answered ${res.status}.`;
  } else {
    try { live = JSON.parse(body).build || null; } catch { problem = 'health did not answer JSON.'; }
    if (live === null && !problem) problem = 'this deployment predates the build stamp, so it cannot say which commit it is running. Deploy once and this check starts working.';
  }
} catch (err) {
  problem = `could not reach ${BASE}: ${err.message}`;
}

if (problem) {
  console.log(`live    unknown — ${problem}`);
  process.exit(2);
}

console.log(`live    ${live.commit}${live.dirty ? ' + uncommitted changes at build time' : ''}  built ${live.built_at}`);

if (live.commit === head) {
  console.log(dirty
    ? '\nProduction matches HEAD, but this tree has uncommitted changes that are not live.'
    : '\nProduction is running this commit.');
  process.exit(0);
}

const behind = git(`git log --oneline ${live.commit}..HEAD`, '');
console.log('\nPRODUCTION IS BEHIND.');
if (behind) {
  const lines = behind.split('\n').filter(Boolean);
  console.log(`${lines.length} commit(s) are not live:`);
  for (const l of lines) console.log(`  ${l}`);
} else {
  console.log(`Live commit ${live.commit} is not an ancestor of HEAD — production may be ahead, or from another branch.`);
}
console.log('\nA push does not deploy this project. To ship:  npm run ship');
process.exit(1);
