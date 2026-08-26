// CLI: npm run seed
import { store, users, pool } from './db.js';
import { seedAll } from './seed-data.js';

const owner = (await users.all())[0] || null;
const { categories, providers } = await seedAll(owner ? { id: owner.id, email: owner.email } : null);

if (!owner) {
  console.log('[seed] No user yet — register in the app; the first account becomes admin.');
}
console.log(`[seed] categories added: ${categories} (total ${await store.count('Category')})`);
console.log(`[seed] providers  added: ${providers} (total ${await store.count('Provider')})`);
await pool.end();
