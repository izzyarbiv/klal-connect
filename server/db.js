// Data layer entry point.
//
// Everything above this imports from './db.js' and does not care which backend
// is behind it.
//
//   postgres (default) — the real one.
//   blob   KC_STORE=blob — persistence on Vercel Blob, for a deployment that
//          has no database attached yet. Durable across deploys and instances,
//          but object storage is not a database: see db-blob.js.
//   memory KC_DEMO_MODE=1 — nothing is persisted at all.
//
// Both alternatives are explicit opt-ins, never a fallback for a missing
// DATABASE_URL: silently accepting writes that vanish is worse than refusing to
// start.
// Storage and the demo experience are separate choices. KC_DEMO_MODE controls
// the guest session and seeded content; KC_STORE controls where data lives. A
// public demo wants both: browsable without signing in, and still persistent.
//
// With no KC_STORE, demo mode only falls back to memory when there is no
// database to talk to. Once DATABASE_URL is set, the guest session and the
// seeded content live in Postgres like everything else.
const DEMO = process.env.KC_DEMO_MODE === '1';
const STORE = (process.env.KC_STORE || '').toLowerCase();
const HAS_DB = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);

const backend =
  STORE === 'blob' ? 'blob' :
  STORE === 'memory' ? 'memory' :
  STORE === 'postgres' ? 'postgres' :
  DEMO && !HAS_DB ? 'memory' :
  'postgres';

const impl = await import(
  backend === 'memory' ? './db-memory.js' : backend === 'blob' ? './db-blob.js' : './db-postgres.js'
);

if (backend === 'memory') {
  console.warn('[db] KC_DEMO_MODE=1 — in-memory storage. Nothing is persisted.');
} else if (backend === 'blob') {
  console.warn('[db] KC_STORE=blob — persisting to Vercel Blob. Set DATABASE_URL for Postgres.');
}

export const isDemoMode = DEMO;
export const backendName = backend;
export const { pool, query, ready, migrate, store, users, otp, geoCache } = impl;
export { nowISO, newId, userToPublic } from './db-shared.js';
