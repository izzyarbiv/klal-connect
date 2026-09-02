// Removes seeded demo content: the sample listings, the invented members and
// their posts, and the connections between them. Real data — anything a person
// actually created — is left alone.
//
//   npm run clear-demo          list what would go
//   npm run clear-demo -- --yes delete it
import { store, users, pool } from './db.js';

const DEMO_EMAILS = new Set(['demo@klal.app', 'guest@klal.app']);
const confirm = process.argv.includes('--yes');

const demoProviders = (await store.list('Provider')).filter((p) => p.demo === true);
const seededMembers = (await users.all()).filter(
  (u) => !DEMO_EMAILS.has(u.email) && String(u.email).endsWith('@example.com')
);
const seededIds = new Set(seededMembers.map((u) => u.id));

const posts = (await store.list('FeedPost')).filter((p) => seededIds.has(p.created_by_id));
const connections = (await store.list('Connection')).filter(
  (c) => seededIds.has(c.requester_id) || seededIds.has(c.recipient_id)
);
const categories = (await store.list('Category')).length;

console.log(`  sample listings   : ${demoProviders.length}`);
console.log(`  invented members  : ${seededMembers.length}${seededMembers.length ? ' (' + seededMembers.map((u) => u.data?.full_name || u.email).join(', ') + ')' : ''}`);
console.log(`  their posts       : ${posts.length}`);
console.log(`  their connections : ${connections.length}`);
console.log(`  categories kept   : ${categories}  (the directory needs these)`);

if (!confirm) {
  console.log('\n  Nothing deleted. Re-run with --yes to delete.');
  await pool.end();
  process.exit(0);
}

for (const p of demoProviders) await store.delete('Provider', p.id);
for (const p of posts) await store.delete('FeedPost', p.id);
for (const c of connections) await store.delete('Connection', c.id);
// Members are marked rather than deleted: a hard delete would orphan anything
// they are still referenced by, and this keeps the action reversible.
for (const u of seededMembers) await users.update(u.id, { disabled: true, full_name: `${u.data?.full_name || u.email} (removed)` });

console.log('\n  Done. Categories and any real listings were left in place.');
await pool.end();
