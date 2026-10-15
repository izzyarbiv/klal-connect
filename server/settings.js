// Platform-wide switches an admin flips from the admin area, stored as
// Setting rows ({ key, value: 'true' | 'false' }).
//
// Vouches and community notes can be switched off as a whole. Off hides them
// from every public surface and refuses new ones; the rows themselves are kept,
// so switching it back on brings everything back as it was. It is off until an
// admin turns it on: a missing row reads as off.

import { store } from './db.js';

export const VOUCHES_SETTING = 'vouches_enabled';

// Each serverless instance keeps its own copy, so a flip made on one instance
// reaches the others within this long. A write through this process clears it
// at once (see forgetSettings).
const TTL_MS = 30_000;
const cache = new Map();

async function readFlag(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.readAt < TTL_MS) return hit.value;
  const value = (await store.filter('Setting', { key }).catch(() => []))[0]?.value === 'true';
  cache.set(key, { value, readAt: Date.now() });
  return value;
}

export const vouchesEnabled = () => readFlag(VOUCHES_SETTING);

export function forgetSettings() { cache.clear(); }
