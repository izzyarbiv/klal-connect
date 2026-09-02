// One-time copy of everything on the Vercel Blob store into Postgres.
//
//   BLOB_READ_WRITE_TOKEN=... DATABASE_URL=... npm run import-blob
//
// Reads the snapshot and replays the log exactly as the running app does, then
// inserts every record and user with its original id and timestamps. Re-running
// is safe: rows that already exist are left alone, so this can be run once
// against an empty database, and again to pick up anything written to Blob in
// between. Nothing on Blob is deleted.
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set — nothing to read from.');
  process.exit(1);
}
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.error('DATABASE_URL is not set — nowhere to write to.');
  process.exit(1);
}

const blob = await import('./db-blob.js');
const pg = await import('./db-postgres.js');

await blob.ready();
await pg.migrate();

const { records, userRows } = blob._raw;

let insertedUsers = 0;
for (const u of userRows) {
  const { rowCount } = await pg.query(
    `INSERT INTO users (id, email, password_hash, role, verified, data, created_date, updated_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [u.id, u.email, u.password_hash ?? null, u.role || 'user', !!u.verified,
     JSON.stringify(u.data || {}), u.created_date, u.updated_date || u.created_date]
  );
  insertedUsers += rowCount;
}

let insertedRecords = 0;
const byEntity = {};
for (const r of records) {
  const { rowCount } = await pg.query(
    `INSERT INTO records (id, entity, data, created_date, updated_date, created_by_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.entity, JSON.stringify(r.data || {}), r.created_date, r.updated_date || r.created_date,
     r.created_by_id ?? null, r.created_by ?? null]
  );
  insertedRecords += rowCount;
  byEntity[r.entity] = (byEntity[r.entity] || 0) + 1;
}

console.log(`[import-blob] users: ${insertedUsers} inserted of ${userRows.length} on Blob`);
console.log(`[import-blob] records: ${insertedRecords} inserted of ${records.length} on Blob`);
for (const [entity, n] of Object.entries(byEntity).sort()) console.log(`  ${entity.padEnd(20)} ${n}`);

await pg.pool.end();
