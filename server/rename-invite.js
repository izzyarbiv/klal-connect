// CLI: npm run rename-invite -- <old-code> <new-code>
//
// Gives an existing invite link a new slug without breaking the old one. The
// old code is kept as an alias, so /join/<old-code> still resolves. Exists as
// a command rather than only an API call because the invite that needed
// renaming was created before renaming existed, by an account whose owner
// should not have to sign in just to fix a URL.
import { store, pool } from './db.js';
import { announceTarget } from './db-target.js';
import { findInviteByCode, INVITE_CODE_RE } from './functions.js';

const [oldCode, newCode] = process.argv.slice(2).map((v) => String(v || '').trim().toLowerCase());

if (!oldCode || !newCode) {
  console.error('usage: npm run rename-invite -- <old-code> <new-code>');
  process.exit(1);
}
if (!INVITE_CODE_RE.test(newCode)) {
  console.error('[rename-invite] the new code must be 4-40 lowercase letters, digits or hyphens');
  process.exit(1);
}

announceTarget('rename-invite');
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
if (await findInviteByCode(newCode)) {
  console.error(`[rename-invite] "${newCode}" is already in use by another invite`);
  await pool.end();
  process.exit(1);
}

const aliases = Array.from(new Set([...(invite.aliases || []), invite.code]));
await store.update('Invite', invite.id, { code: newCode, aliases });
console.log(`[rename-invite] ${invite.code} -> ${newCode}; still answers to: ${aliases.join(', ')}`);
await pool.end();
