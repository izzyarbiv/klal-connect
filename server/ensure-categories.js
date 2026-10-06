// CLI: npm run ensure-categories
//
// Adds any category the code knows about and the database does not, and nothing
// else. Deliberately separate from `npm run seed`, which also inserts six
// fictional providers — useful for a fresh dev database, and the last thing
// anyone wants pointed at a live directory.
import { store, pool } from './db.js';
import { seedCategories } from './seed-data.js';

const before = await store.count('Category');
const added = await seedCategories();
const after = await store.count('Category');
console.log(`[categories] added ${added} (${before} -> ${after})`);
if (!added) console.log('[categories] nothing missing');
await pool.end();
