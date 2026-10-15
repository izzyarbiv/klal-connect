// CLI: npm run rename-invite -- <old-code> <new-code>
//
// Gives an existing invite link a new slug without breaking the old one. The
// old code is kept as an alias, so /join/<old-code> still resolves. Exists as
// a command rather than only an API call because the invite that needed
// renaming was created before renaming existed, by an account whose owner
// should not have to sign in just to fix a URL.
import { store, pool, backendName } from './db.js';
import { announceTarget } from './db-target.js';
import { findInviteByCode, planInviteRename, INVITE_ALIAS_LIMIT, INVITE_CODE_RE } from './functions.js';

const [oldCode, newCode] = process.argv.slice(2).map((v) => String(v || '').trim().toLowerCase());

if (!oldCode || !newCode) {
  console.error('usage: npm run rename-invite -- <old-code> <new-code>');
  process.exit(1);
}
if (!INVITE_CODE_RE.test(newCode)) {
  console.error('[rename-invite] the new code must be 4-40 lowercase letters, digits or hyphens');
  process.exit(1);
}

// The memory backend starts empty and forgets everything at exit, so a rename
// there can only ever report "no such invite" or succeed into thin air. Either
// way the operator would walk away believing production was changed. Refuse
// outright rather than let that happen by a stray KC_DEMO_MODE in .env.local.
if (backendName === 'memory') {
  console.error('[rename-invite] refusing to run: the store is in-memory (KC_STORE=memory or KC_DEMO_MODE=1 without a DATABASE_URL), so nothing would be renamed. Point DATABASE_URL at the database that holds the invite.');
  process.exit(1);
}

// Say where this is about to write before writing anything, so a run against
// the wrong database is visible in the output rather than discovered later.
announceTarget('rename-invite');
console.log(`[rename-invite] store backend: ${backendName}`);
const invite = await findInviteByCode(oldCode);
if (!invite) {
  console.error(`[rename-invite] no invite answers to "${oldCode}"`);
  await pool.end();
  process.exit(1);
}
if (invite.code === newCode) {
  console.log(`[rename-invite] "${newCode}" is already the current code; nothing to do`);
  await pool.end();
  process.exit(0);
}
// Same rules as the API: another invite's code or alias is a conflict, this
// invite's own former code is a plain undo, and the alias list is capped.
const plan = await planInviteRename(invite, newCode);
if (plan.conflict) {
  console.error(`[rename-invite] "${newCode}" is already in use by another invite`);
  await pool.end();
  process.exit(1);
}

await store.update('Invite', invite.id, { code: newCode, aliases: plan.aliases });
console.log(`[rename-invite] ${invite.code} -> ${newCode}; still answers to: ${plan.aliases.join(', ')}`);
if (plan.dropped.length) console.log(`[rename-invite] dropped the oldest alias(es) to stay within ${INVITE_ALIAS_LIMIT}: ${plan.dropped.join(', ')} — links printed with these no longer resolve`);
await pool.end();
