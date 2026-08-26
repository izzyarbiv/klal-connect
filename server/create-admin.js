// Creates (or promotes) a verified admin account from the command line.
//
// Needed because email delivery is not wired up yet: the signup flow issues a
// verification code that nobody can receive in production, so there would
// otherwise be no way to get the first account in.
//
//   npm run create-admin -- someone@example.com 'their-password'
import { users, userToPublic, pool } from './db.js';
import { hashPassword } from './auth.js';

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("usage: npm run create-admin -- <email> '<password>'");
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const existing = await users.byEmail(email);
const user = existing
  ? await users.update(existing.id, { password_hash: hashPassword(password), role: 'admin', verified: true })
  : await users.create({ email, password_hash: hashPassword(password), role: 'admin', verified: true, full_name: '' });

console.log(`${existing ? 'Promoted' : 'Created'} admin:`, userToPublic(user).email);
await pool.end();
