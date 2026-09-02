// One-time copy of everything on the Vercel Blob store into Postgres.
//
//   BLOB_READ_WRITE_TOKEN=... DATABASE_URL=... npm run import-blob
//
// Reads the snapshot and replays the log exactly as the running app does, then
// inserts every record and user with its original id and timestamps, all in
// one transaction. Insert-only: a row whose id already exists in Postgres is
// left exactly as it is, even if Blob has a newer version of it. So run this
// once against an empty database; running it again only adds rows that are new
// on Blob. Nothing on Blob is deleted or rewritten.
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set — nothing to read from.');
  process.exit(1);
}
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.error('DATABASE_URL is not set — nowhere to write to.');
  process.exit(1);
}

// Loading the Blob store normally may compact it (rewrite the snapshot and
// truncate the log) once the log is long enough. A read-only copy must not
// write to the thing it is copying from.
process.env.KC_BLOB_COMPACT_AFTER = String(Number.MAX_SAFE_INTEGER);

const blob = await import('./db-blob.js');
const pg = await import('./db-postgres.js');
const { nowISO } = await import('./db-shared.js');

await blob.ready();
await pg.migrate();

const { records, userRows } = blob._raw;

const client = await pg.pool.connect();
let insertedUsers = 0;
let insertedRecords = 0;
const byEntity = {};
try {
  await client.query('BEGIN');

  for (const u of userRows) {
    const created = u.created_date || nowISO();
    const { rowCount } = await client.query(
      `INSERT INTO users (id, email, password_hash, role, verified, data, created_date, updated_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING`,
      [u.id, u.email, u.password_hash ?? null, u.role || 'user', !!u.verified,
       JSON.stringify(u.data || {}), created, u.updated_date || created]
    );
    insertedUsers += rowCount;
  }

  for (const r of records) {
    const created = r.created_date || nowISO();
    const { rowCount } = await client.query(
      `INSERT INTO records (id, entity, data, created_date, updated_date, created_by_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [r.id, r.entity, JSON.stringify(r.data || {}), created, r.updated_date || created,
       r.created_by_id ?? null, r.created_by ?? null]
    );
    insertedRecords += rowCount;
    byEntity[r.entity] = (byEntity[r.entity] || 0) + 1;
  }

  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK').catch(() => {});
  throw err;
} finally {
  client.release();
}

console.log(`[import-blob] users: ${insertedUsers} inserted of ${userRows.length} on Blob`);
console.log(`[import-blob] records: ${insertedRecords} inserted of ${records.length} on Blob`);
for (const [entity, n] of Object.entries(byEntity).sort()) console.log(`  ${entity.padEnd(20)} ${n}`);

await pg.pool.end();
