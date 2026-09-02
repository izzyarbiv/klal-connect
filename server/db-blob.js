// Persistence on Vercel Blob.
//
// This is object storage, not a database — so the shape matters. Writing one
// shared snapshot per mutation would lose updates: two instances read, both
// write, one wins. Instead every mutation is appended as its own object under a
// unique pathname, which two writers can never collide on, and the state is
// rebuilt by replaying them over the last snapshot. Once the log grows past a
// threshold it is compacted back into a snapshot.
//
// What this is NOT: transactional, or a substitute for Postgres. Two people
// editing the SAME record in the same instant still resolves last-write-wins,
// and every cold start pays a list plus a fetch. It exists so a deployment can
// keep its data without anyone having to go and provision a database. Set
// DATABASE_URL and drop KC_STORE to move to Postgres; nothing above this
// changes.
import { put, list, del } from '@vercel/blob';
import { createMemoryStore } from './db-memory.js';
import { nowISO, newId, userToPublic } from './db-shared.js';

const SNAPSHOT = 'klal/snapshot.json';
const LOG_PREFIX = 'klal/log/';
const COMPACT_AFTER = Number(process.env.KC_BLOB_COMPACT_AFTER || 50);

const memory = createMemoryStore({ onChange: (event) => enqueue(event) });
const raw = memory._raw;

// ---- serialisation ----------------------------------------------------------

const snapshotOf = () => ({
  v: 1,
  savedAt: nowISO(),
  records: raw.records,
  users: raw.userRows,
});

function restore(state) {
  if (!state) return;
  raw.records.length = 0;
  raw.userRows.length = 0;
  for (const r of state.records || []) raw.records.push(r);
  for (const u of state.users || []) raw.userRows.push(u);
}

// Log entries are deltas, so they are applied over the snapshot rather than
// replacing it. This is what keeps two instances writing at the same moment
// from erasing each other.
function replay(entry) {
  for (const event of entry?.events || []) memory.apply(event);
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

// ---- load -------------------------------------------------------------------

let loaded = null;
// Log entries already applied to this instance's memory.
const applied = new Set();
let lastSync = 0;
let syncing = null;

// How stale an instance may be before it re-reads the log. Several instances
// serve requests at once, and an instance that was already warm when another
// one wrote would otherwise never see that write — which reads to the user as
// "I saved my profile and everything vanished".
const REFRESH_MS = Number(process.env.KC_BLOB_REFRESH_MS || 4000);

async function applyNewEntries(blobs) {
  const fresh = blobs
    .filter((b) => b.pathname.startsWith(LOG_PREFIX) && !applied.has(b.pathname))
    // Pathnames start with a zero-padded timestamp, so lexical order is chronological.
    .sort((a, b) => a.pathname.localeCompare(b.pathname));
  for (const entry of fresh) {
    applied.add(entry.pathname);
    replay(await fetchJSON(entry.url));
  }
  return fresh.length;
}

async function load() {
  const { blobs } = await list({ prefix: 'klal/' });
  const snap = blobs.find((b) => b.pathname === SNAPSHOT);
  if (snap) restore(await fetchJSON(snap.url));
  const n = await applyNewEntries(blobs);
  lastSync = Date.now();
  console.log(`[blob] loaded ${raw.records.length} records, ${raw.userRows.length} users (${n} log entries)`);
  if (n >= COMPACT_AFTER) {
    await compact(blobs.filter((b) => b.pathname.startsWith(LOG_PREFIX)));
  }
}

// Pull in anything other instances have written since we last looked. One list
// call, and only unseen entries are fetched.
function sync() {
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      const { blobs } = await list({ prefix: LOG_PREFIX });
      await applyNewEntries(blobs);
      lastSync = Date.now();
    } catch (err) {
      console.error('[blob] sync failed, serving possibly stale data:', err.message);
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

export function ready() {
  if (!loaded) {
    loaded = load().catch((err) => {
      // Let the next request retry rather than caching a failure forever.
      loaded = null;
      throw err;
    });
    return loaded;
  }
  return loaded.then(() => (Date.now() - lastSync > REFRESH_MS ? sync() : undefined));
}

// ---- write ------------------------------------------------------------------

let queue = [];
let pending = null;

// Mutations arrive one at a time but often in bursts (seeding writes dozens).
// Coalescing them into the next tick turns that into a single upload, while
// still recording each mutation individually.
function enqueue(event) {
  if (event) queue.push(event);
  if (pending) return pending;
  pending = Promise.resolve().then(async () => {
    const events = queue;
    queue = [];
    pending = null;
    if (!events.length) return;
    try {
      // A unique pathname per write, so two instances appending at the same
      // moment produce two objects instead of overwriting one.
      const name = `${LOG_PREFIX}${String(Date.now()).padStart(14, '0')}-${newId()}.json`;
      applied.add(name);
      await put(name, JSON.stringify({ v: 1, at: nowISO(), events }), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      });
    } catch (err) {
      // Put them back so a later flush can retry rather than losing the write.
      queue.unshift(...events);
      console.error('[blob] append failed — writes still only in memory:', err.message);
    }
  });
  return pending;
}

async function compact(entries) {
  try {
    await put(SNAPSHOT, JSON.stringify(snapshotOf()), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    // Only after the snapshot is durable.
    if (entries.length) await del(entries.map((e) => e.url));
    console.log(`[blob] compacted ${entries.length} log entries into the snapshot`);
  } catch (err) {
    console.error('[blob] compaction failed, log kept:', err.message);
  }
}

/** Flush anything buffered — used by scripts before the process exits. */
export async function flush() {
  while (pending) await pending;
  if (queue.length) await enqueue();
}

// ---- interface --------------------------------------------------------------

// Methods that change state must not return until the write is durable.
// A serverless instance is frozen the moment it responds, so anything left
// running in the background is simply lost — the first version of this appended
// after responding, and writes silently vanished on the next deploy.
const MUTATING = new Set(['create', 'update', 'delete', 'updateMany', 'issue', 'verify', 'set']);

// Every read waits for the initial load; after that `ready()` is a resolved
// promise, so this costs nothing per call.
const guarded = (obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([name, fn]) => [
      name,
      async (...args) => {
        await ready();
        const result = await fn.apply(obj, args);
        if (MUTATING.has(name)) await flush();
        return result;
      },
    ])
  );

export const store = guarded(memory.store);
export const users = guarded(memory.users);
export const otp = guarded(memory.otp);
export const geoCache = guarded(memory.geoCache);
export const pool = { end: async () => { await flush(); } };
export const query = async () => { throw new Error('Raw SQL is not available on the Blob store.'); };
export async function migrate() { await ready(); }
export { nowISO, newId, userToPublic };
