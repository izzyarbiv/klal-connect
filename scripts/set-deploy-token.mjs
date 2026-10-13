// Save the Vercel deploy token for this project, checked before it is saved:
//
//   1. Create a token at vercel.com/account/tokens and click its copy button.
//   2. npm run set-deploy-token
//
// Pasting it in by hand failed twice in two different ways — once with a stray
// space, once with something that was not a token at all (it contained "@") —
// and each failure only surfaced ten minutes later, at the very last step of a
// deploy, after every check had passed. This reads the token from the
// clipboard, asks Vercel whether it is real and can reach klal-connect, and
// only then stores it in GitHub. It never prints the token.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const REPO = 'izzyarbiv/klal-connect';
const { projectId, orgId, projectName } = JSON.parse(readFileSync('.vercel/project.json', 'utf8'));

const token = execFileSync('pbpaste', { encoding: 'utf8' }).replace(/\s+/g, '');
const fail = (msg) => { console.error(`\n✗ ${msg}\n  Nothing was saved.\n`); process.exit(1); };

if (!token) fail('The clipboard is empty. Click the copy button next to the token on vercel.com/account/tokens, then run this again.');
if (token.includes('@')) fail('What you copied contains "@" — that looks like an email address, not a token. Copy the token itself.');
if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) fail(`What you copied does not look like a Vercel token (${token.length} characters, unexpected symbols). Copy the token itself.`);

const vercel = async (path) => fetch(`https://api.vercel.com${path}`, { headers: { Authorization: `Bearer ${token}` } });

const me = await vercel('/v2/user');
if (me.status === 401 || me.status === 403) fail('Vercel says this token is not valid — it may have been deleted. Create a new one.');
if (!me.ok) fail(`Could not reach Vercel to check the token (HTTP ${me.status}). Try again in a minute.`);
const who = (await me.json()).user?.username || 'your account';

const proj = await vercel(`/v9/projects/${projectId}?teamId=${orgId}`);
if (!proj.ok) fail(`The token works for ${who}, but cannot reach the ${projectName} project (HTTP ${proj.status}). When creating it, choose the team that owns ${projectName}.`);

console.log(`✓ Vercel confirms the token: account ${who}, can deploy ${projectName}.`);
const set = spawnSync('gh', ['secret', 'set', 'VERCEL_TOKEN', '-R', REPO], { input: token, stdio: ['pipe', 'inherit', 'inherit'] });
if (set.status !== 0) fail('GitHub did not accept the secret. Is `gh` logged in? Run: gh auth status');
console.log(`✓ Saved to ${REPO} as VERCEL_TOKEN.`);

if (process.argv.includes('--deploy')) {
  const run = spawnSync('gh', ['workflow', 'run', 'deploy.yml', '-R', REPO, '--ref', 'main'], { stdio: 'inherit' });
  if (run.status === 0) console.log('✓ Deploy started. It takes about 10 minutes.');
}
