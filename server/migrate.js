// Creates the schema. Run once per deploy; safe to re-run.
import { migrate, pool } from './db.js';

await migrate();
console.log('[migrate] schema is up to date');
await pool.end();
