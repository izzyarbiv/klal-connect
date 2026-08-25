// SQLite-backed document store.
//
// The app reads and writes ad-hoc fields across 18 entities, so records are
// stored as documents: one row each, fields in a JSON blob. Adding a field is
// not a migration. Only the columns every entity is sorted or scoped by are
// lifted out of the blob into real columns.
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.KC_DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'klal.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id            TEXT PRIMARY KEY,
    entity        TEXT NOT NULL,
    data          TEXT NOT NULL DEFAULT '{}',
    created_date  TEXT NOT NULL,
    updated_date  TEXT NOT NULL,
    created_by_id TEXT,
    created_by    TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_records_entity  ON records(entity);
  CREATE INDEX IF NOT EXISTS idx_records_creator ON records(entity, created_by_id);

  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT,
    role          TEXT NOT NULL DEFAULT 'user',
    verified      INTEGER NOT NULL DEFAULT 0,
    data          TEXT NOT NULL DEFAULT '{}',
    created_date  TEXT NOT NULL,
    updated_date  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS geo_cache (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS otp_codes (
    email      TEXT NOT NULL,
    code       TEXT NOT NULL,
    purpose    TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email, purpose);
`);

export const nowISO = () => new Date().toISOString();
export const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 24);

// ---- record <-> row ---------------------------------------------------------

// The app treats id/created_date/created_by_id as ordinary fields on the object,
// so flatten the row back into one object on the way out.
function toRecord(row) {
  if (!row) return null;
  return {
    ...JSON.parse(row.data),
    id: row.id,
    created_date: row.created_date,
    updated_date: row.updated_date,
    created_by_id: row.created_by_id,
    created_by: row.created_by,
  };
}

const RESERVED = new Set(['id', 'created_date', 'updated_date', 'created_by_id', 'created_by']);
function splitFields(obj = {}) {
  const data = {};
  for (const [k, v] of Object.entries(obj)) if (!RESERVED.has(k)) data[k] = v;
  return data;
}

// ---- query helpers ----------------------------------------------------------

// Sort strings are "field" for ascending, "-field" for descending.
function applySort(rows, sort) {
  if (!sort) return rows;
  const desc = sort.startsWith('-');
  const key = desc ? sort.slice(1) : sort;
  return [...rows].sort((a, b) => {
    const av = a?.[key], bv = b?.[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;   // missing values sort last either way
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return desc ? bv - av : av - bv;
    const c = String(av).localeCompare(String(bv));
    return desc ? -c : c;
  });
}

// Equality matching only — a scan of the call sites showed the app never uses
// Mongo-style operators, so anything fancier would be dead code.
function matches(record, query = {}) {
  return Object.entries(query).every(([k, want]) => {
    const got = record?.[k];
    if (Array.isArray(want)) return want.includes(got);   // treat arrays as "in"
    if (Array.isArray(got)) return got.includes(want);    // tag-style fields
    return got === want;
  });
}

export const store = {
  list(entity, sort, limit) {
    const rows = db.prepare('SELECT * FROM records WHERE entity = ?').all(entity).map(toRecord);
    const sorted = applySort(rows, sort || '-created_date');
    return limit ? sorted.slice(0, Number(limit)) : sorted;
  },

  filter(entity, query, sort, limit) {
    const rows = db.prepare('SELECT * FROM records WHERE entity = ?').all(entity).map(toRecord);
    const hits = rows.filter((r) => matches(r, query));
    const sorted = applySort(hits, sort || '-created_date');
    return limit ? sorted.slice(0, Number(limit)) : sorted;
  },

  get(entity, id) {
    return toRecord(db.prepare('SELECT * FROM records WHERE entity = ? AND id = ?').get(entity, id));
  },

  create(entity, obj = {}, actor = null) {
    const id = obj.id || newId();
    const ts = nowISO();
    db.prepare(
      `INSERT INTO records (id, entity, data, created_date, updated_date, created_by_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, entity, JSON.stringify(splitFields(obj)), ts, ts,
      obj.created_by_id ?? actor?.id ?? null,
      obj.created_by ?? actor?.email ?? null
    );
    return this.get(entity, id);
  },

  update(entity, id, patch = {}) {
    const current = this.get(entity, id);
    if (!current) return null;
    const merged = { ...splitFields(current), ...splitFields(patch) };
    db.prepare('UPDATE records SET data = ?, updated_date = ? WHERE entity = ? AND id = ?')
      .run(JSON.stringify(merged), nowISO(), entity, id);
    return this.get(entity, id);
  },

  delete(entity, id) {
    return db.prepare('DELETE FROM records WHERE entity = ? AND id = ?').run(entity, id).changes > 0;
  },

  updateMany(entity, query, patch = {}) {
    // The app passes Mongo-ish { $set: {...} } here; accept both shapes.
    const fields = patch.$set ? patch.$set : patch;
    const hits = this.filter(entity, query);
    for (const hit of hits) this.update(entity, hit.id, fields);
    return hits.length;
  },

  count(entity, query = {}) {
    return this.filter(entity, query).length;
  },
};

// ---- users ------------------------------------------------------------------

export function userToPublic(row) {
  if (!row) return null;
  return {
    ...JSON.parse(row.data),
    id: row.id,
    email: row.email,
    role: row.role,
    verified: !!row.verified,
    created_date: row.created_date,
    updated_date: row.updated_date,
  };
}

export const users = {
  byEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim());
  },
  byId(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },
  create({ email, password_hash, role = 'user', verified = 0, ...rest }) {
    const id = newId();
    const ts = nowISO();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, role, verified, data, created_date, updated_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, String(email).trim(), password_hash, role, verified ? 1 : 0, JSON.stringify(rest), ts, ts);
    return this.byId(id);
  },
  update(id, patch = {}) {
    const row = this.byId(id);
    if (!row) return null;
    const { email, role, verified, password_hash, ...rest } = patch;
    const data = { ...JSON.parse(row.data), ...rest };
    db.prepare(
      `UPDATE users SET email = ?, role = ?, verified = ?, password_hash = ?, data = ?, updated_date = ?
       WHERE id = ?`
    ).run(
      email ?? row.email,
      role ?? row.role,
      verified === undefined ? row.verified : (verified ? 1 : 0),
      password_hash ?? row.password_hash,
      JSON.stringify(data),
      nowISO(),
      id
    );
    return this.byId(id);
  },
  all() {
    return db.prepare('SELECT * FROM users ORDER BY created_date DESC').all();
  },
};

export const otp = {
  issue(email, purpose, ttlMinutes = 15) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    db.prepare('DELETE FROM otp_codes WHERE email = ? AND purpose = ?').run(email, purpose);
    db.prepare('INSERT INTO otp_codes (email, code, purpose, expires_at) VALUES (?, ?, ?, ?)')
      .run(email, code, purpose, Date.now() + ttlMinutes * 60_000);
    return code;
  },
  verify(email, purpose, code) {
    const row = db.prepare('SELECT * FROM otp_codes WHERE email = ? AND purpose = ?').get(email, purpose);
    if (!row || row.expires_at < Date.now() || row.code !== String(code).trim()) return false;
    db.prepare('DELETE FROM otp_codes WHERE email = ? AND purpose = ?').run(email, purpose);
    return true;
  },
};

// ---- geocoding cache --------------------------------------------------------

// Geocoding answers are stable and upstream providers are rate-limited (or
// billed per call), so results are cached across restarts rather than in memory.
export const geoCache = {
  get(key) {
    const row = db.prepare('SELECT value, expires_at FROM geo_cache WHERE key = ?').get(key);
    if (!row) return null;
    if (row.expires_at < Date.now()) {
      db.prepare('DELETE FROM geo_cache WHERE key = ?').run(key);
      return null;
    }
    try { return JSON.parse(row.value); } catch { return null; }
  },
  set(key, value, ttlMs) {
    db.prepare('INSERT OR REPLACE INTO geo_cache (key, value, expires_at) VALUES (?, ?, ?)')
      .run(key, JSON.stringify(value), Date.now() + ttlMs);
    return value;
  },
};
