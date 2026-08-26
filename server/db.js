// Data layer entry point.
//
// Everything above this imports from './db.js' and does not care which backend
// is behind it. Postgres is the real one; the in-memory layer exists so a demo
// deployment can run with no database attached.
//
// KC_DEMO_MODE must be set explicitly. It is deliberately NOT a fallback for a
// missing DATABASE_URL: accepting writes that silently vanish would be worse
// than refusing to start.
const DEMO = process.env.KC_DEMO_MODE === '1';

const impl = DEMO
  ? await import('./db-memory.js')
  : await import('./db-postgres.js');

if (DEMO) {
  console.warn('[db] KC_DEMO_MODE=1 — using in-memory storage. Data is not persisted.');
}

export const isDemoMode = DEMO;
export const { pool, query, ready, migrate, store, users, otp, geoCache } = impl;
export { nowISO, newId, userToPublic } from './db-shared.js';
