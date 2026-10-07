// CLI: npm run seed
import { store, users, pool } from './db.js';
import { seedAll } from './seed-data.js';
import { announceTarget, describeTarget } from './db-target.js';

announceTarget('seed');

// This inserts six fictional businesses. That is right for an empty dev
// database and badly wrong for a directory the community is already using:
// a made-up plumber with a made-up phone number is worse than an empty
// category, because someone will call it. The rule was written in a comment
// and in instructions to a person; it is enforced here now.
const existing = await store.count('Provider');
const real = existing - (await store.filter('Provider', { demo: true })).length;
if (real > 0 && !process.argv.includes('--force')) {
  const { label } = describeTarget();
  console.error(`[seed] refusing: ${label} already holds ${real} listing(s) that are not demo data.`);
  console.error('[seed] This command inserts fictional businesses with fictional phone numbers.');
  console.error('[seed] For the categories alone, which is almost always what is wanted:');
  console.error('[seed]   npm run ensure-categories');
  console.error('[seed] To do it anyway: npm run seed -- --force');
  await pool.end();
  process.exit(1);
}

const owner = (await users.all())[0] || null;
const { categories, providers } = await seedAll(owner ? { id: owner.id, email: owner.email } : null);

if (!owner) {
  console.log('[seed] No user yet — register in the app; the first account becomes admin.');
}
console.log(`[seed] categories added: ${categories} (total ${await store.count('Category')})`);
console.log(`[seed] providers  added: ${providers} (total ${await store.count('Provider')})`);
await pool.end();
