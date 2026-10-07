// Refuses a deploy that could not be traced back to a commit.
//
// `npm run ship` would happily deploy a dirty working tree: production then
// runs code that is not any commit, the build stamp says "dirty", and nobody
// can tell later what was actually live. It would also deploy a commit that
// exists only on this laptop, which is worse — production running code no
// one else has a copy of.
//
// Both are easy mistakes to make at the end of a long day, which is exactly
// when someone deploys.
import { execSync } from 'node:child_process';

const git = (cmd, fallback = '') => {
  try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return fallback; }
};

const force = process.argv.includes('--force');
const problems = [];

const dirty = git('git status --porcelain');
if (dirty) {
  problems.push(`${dirty.split('\n').length} uncommitted change(s). Production would run code that is not any commit:\n${dirty.split('\n').slice(0, 10).map((l) => `      ${l}`).join('\n')}`);
}

const head = git('git rev-parse HEAD');
const branch = git('git rev-parse --abbrev-ref HEAD');
const remoteHead = git('git ls-remote origin HEAD').split('\t')[0];
if (!remoteHead) {
  console.log('[preflight] could not reach the remote — skipping the "is it pushed" check');
} else if (head && remoteHead !== head) {
  const unpushed = git(`git log --oneline origin/${branch}..HEAD`, '');
  if (unpushed) {
    problems.push(`${unpushed.split('\n').length} commit(s) are not on the remote. Production would run code only this machine has:\n${unpushed.split('\n').map((l) => `      ${l}`).join('\n')}`);
  }
}

if (!problems.length) {
  console.log(`[preflight] ${branch} at ${head.slice(0, 12)}, clean and pushed`);
  process.exit(0);
}

console.error('[preflight] refusing to deploy:\n');
for (const p of problems) console.error(`  - ${p}\n`);
if (force) {
  console.error('[preflight] --force given, continuing anyway.\n');
  process.exit(0);
}
console.error('  Commit and push, then run it again. To deploy regardless: npm run ship -- --force\n');
process.exit(1);
