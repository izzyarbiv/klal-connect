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

// Visitors are signed in as this account so they can browse the whole app
// without a login wall. Deliberately an ordinary member, not the admin: the
// admin tools stay behind the password.
export const GUEST_EMAIL = 'guest@klalconnect.app';

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
      await users.create({
        id: stableId('demo-user', GUEST_EMAIL),
        email: GUEST_EMAIL,
        password_hash: hashPassword(DEMO_PASSWORD),
        role: 'user',
        verified: true,
        full_name: 'Guest',
        headline: 'Browsing the Klal Connect demo',
      });
      await seedAll({ id: admin.id, email: admin.email });
      await seedCommunity(admin);
      console.log(`[demo] seeded; sign in as ${DEMO_EMAIL}`);
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
  { body: 'Reminder: the medical equipment gemach in Monsey now has three new wheelchairs available. No cost, no deposit — just call ahead.', post_type: 'update' },
  { body: 'Looking for a recommendation for a reliable electrician in the Lakewood area. Anyone used someone recently they were happy with?', post_type: 'question' },
  { body: 'Booking now for the winter season — full-service catering for weddings, bar mitzvahs and sheva brachos. Cholov Yisroel and Pas Yisroel.', post_type: 'promotion' },
];

async function seedCommunity(admin) {
  const authors = [admin];
  for (const member of MEMBERS) {
    authors.push(await users.create({
      id: stableId('demo-user', member.full_name),
      email: `${member.full_name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
      password_hash: hashPassword(DEMO_PASSWORD),
      role: 'user',
      verified: true,
      full_name: member.full_name,
      headline: member.headline,
      city: member.city,
    }));
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
