// Boots a demo instance with content and an account to sign in with.
//
// Only reached when KC_DEMO_MODE=1. Each serverless instance starts empty, so
// this runs once per cold start and is awaited by the request path — otherwise
// the first visitor would see an empty directory.
import { randomBytes } from 'node:crypto';
import { store, users, isDemoMode, backendName, GUEST_EMAIL } from './db.js';
import { stableId } from './db-shared.js';
import { seedAll } from './seed-data.js';
import { hashPassword } from './auth.js';

const DEMO_EMAIL = process.env.KC_DEMO_EMAIL || 'demo@klal.app';

// A well-known password is fine for an in-memory instance that forgets it on
// the next cold start. On a database it would be a permanent admin login that
// is printed in this file, so there the account is created with a password
// nobody knows unless KC_DEMO_PASSWORD says otherwise; `npm run create-admin`
// sets a real one.
const PERSISTENT = backendName !== 'memory';
const DEMO_PASSWORD = process.env.KC_DEMO_PASSWORD || (PERSISTENT ? null : 'demo1234');
const unguessable = () => randomBytes(32).toString('hex');

// Visitors are signed in as the guest account (GUEST_EMAIL, in db-shared.js)
// so they can browse the whole app without a login wall. Deliberately an
// ordinary member, not the admin: the admin tools stay behind the password.
export { GUEST_EMAIL };

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
        password_hash: hashPassword(DEMO_PASSWORD || unguessable()),
        role: 'admin',
        verified: true,
        full_name: 'Demo Admin',
        headline: 'Klal demo account',
      });
      await users.create({
        id: stableId('demo-user', GUEST_EMAIL),
        email: GUEST_EMAIL,
        // Sessions for this account come from /api/auth/demo-session; nobody
        // should be able to log in as the guest with a password.
        password_hash: hashPassword(unguessable()),
        role: 'user',
        verified: true,
        full_name: 'Guest',
        headline: 'Browsing the Klal demo',
      });
      await seedAll({ id: admin.id, email: admin.email });
      await seedCommunity(admin);
      if (DEMO_PASSWORD) console.log(`[demo] seeded; sign in as ${DEMO_EMAIL}`);
      else console.warn(`[demo] seeded; ${DEMO_EMAIL} has no usable password — run: npm run create-admin -- ${DEMO_EMAIL} '<password>'`);
    })().catch((err) => {
      // Let the next request retry rather than caching the failure forever.
      started = null;
      throw err;
    });
  }
  return started;
}

// A few members and posts, so Feed and People are not empty pages when someone
// clicks through. Demo-only: a real deployment must never be seeded with
// invented people.
const MEMBERS = [
  { full_name: 'Shloimy Rosenberg', headline: 'Plumbing & heating · Lakewood', city: 'Lakewood' },
  { full_name: 'Rivky Grossman',    headline: 'Tutor, limudei kodesh & secular', city: 'Brooklyn' },
  { full_name: 'Yaakov Feldman',    headline: 'CPA · small business & mosdos', city: 'Lakewood' },
];

const POSTS = [
  { body: 'Reminder: the medical equipment gemach in Monsey now has three new wheelchairs available. No cost, no deposit — just call ahead.', post_type: 'post' },
  { body: 'Looking for a recommendation for a reliable electrician in the Lakewood area. Anyone used someone recently they were happy with?', post_type: 'question' },
  { body: 'Booking now for the winter season — full-service catering for weddings, bar mitzvahs and sheva brachos. Cholov Yisroel and Pas Yisroel.', post_type: 'promotion' },
];

async function seedCommunity(admin) {
  const authors = [admin];
  for (const member of MEMBERS) {
    authors.push(await users.create({
      id: stableId('demo-user', member.full_name),
      email: `${member.full_name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
      password_hash: hashPassword(DEMO_PASSWORD || unguessable()),
      role: 'user',
      verified: true,
      full_name: member.full_name,
      headline: member.headline,
      city: member.city,
    }));
  }

  // Connect the guest to everyone, so the demo shows the connections list and
  // messaging rather than an empty state.
  const guest = await users.byEmail(GUEST_EMAIL);
  for (const member of authors) {
    if (!guest || member.id === guest.id) continue;
    await store.create('Connection', {
      id: stableId('demo-conn', guest.id, member.id),
      requester_id: guest.id,
      recipient_id: member.id,
      status: 'accepted',
    }, { id: guest.id, email: guest.email });
  }

  for (const [i, post] of POSTS.entries()) {
    const author = authors[(i + 1) % authors.length];
    await store.create('FeedPost', {
      id: stableId('demo-post', post.body.slice(0, 40)),
      ...post,
      image_urls: [],
      like_count: 0,
      comment_count: 0,
      view_count: 0,
      // users.create returns the raw row: profile fields live under .data.
      author_name: author.data?.full_name || author.email,
      author_headline: author.data?.headline || '',
    }, { id: author.id, email: author.email });
  }
}

export { DEMO_EMAIL, DEMO_PASSWORD };
