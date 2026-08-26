// Boots a demo instance with content and an account to sign in with.
//
// Only reached when KC_DEMO_MODE=1. Each serverless instance starts empty, so
// this runs once per cold start and is awaited by the request path — otherwise
// the first visitor would see an empty directory.
import { store, users, isDemoMode } from './db.js';
import { stableId } from './db-shared.js';
import { seedAll } from './seed-data.js';
import { hashPassword } from './auth.js';

const DEMO_EMAIL = process.env.KC_DEMO_EMAIL || 'demo@klalconnect.app';
const DEMO_PASSWORD = process.env.KC_DEMO_PASSWORD || 'demo1234';

let started = null;

export function ensureDemoData() {
  if (!isDemoMode) return Promise.resolve();
  // Memoised, not guarded by a flag: concurrent first requests must await the
  // same seeding rather than each starting their own.
  if (!started) {
    started = (async () => {
      if (await store.count('Category')) return;
      const admin = await users.create({
        // Fixed id: a session minted by one instance must still resolve on the
        // next, and each instance seeds its own copy of this account.
        id: stableId('demo-user', DEMO_EMAIL),
        email: DEMO_EMAIL,
        password_hash: hashPassword(DEMO_PASSWORD),
        role: 'admin',
        verified: true,
        full_name: 'Demo Admin',
        headline: 'Klal Connect demo account',
      });
      await seedAll({ id: admin.id, email: admin.email });
      console.log(`[demo] seeded; sign in as ${DEMO_EMAIL}`);
    })().catch((err) => {
      // Let the next request retry rather than caching the failure forever.
      started = null;
      throw err;
    });
  }
  return started;
}

export { DEMO_EMAIL, DEMO_PASSWORD };
