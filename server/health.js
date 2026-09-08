// What an admin needs to see before launch, in one call.
//
// Each check answers a question someone would otherwise have to ask the
// database: who is stuck, what is claimed but unchecked, where the directory
// is too thin to be useful, and what people searched for and did not find.
import { store, users, userToPublic } from './db.js';
import { BADGES, badgeAppliesTo } from '../src/lib/badges.js';

const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));
const norm = (s) => String(s || '').trim().toLowerCase();
// A city needs enough listings that a first search is worth making.
const MIN_CITY_LISTINGS = 15;

export async function healthReport() {
  const [allUsers, providers, vouches, events] = await Promise.all([
    users.all(),
    store.list('Provider'),
    store.list('Vouch').catch(() => []),
    store.list('ActivityEvent', '-created_date', 500).catch(() => []),
  ]);

  const members = allUsers
    .map((u) => ({ ...userToPublic(u), verified: !!u.verified }))
    .filter((u) => u.email !== 'guest@klal.app' && !u.disabled);

  // Registered but never confirmed: they cannot post, so they are stuck.
  const unverified = members
    .filter((u) => !u.verified)
    .map((u) => ({ id: u.id, email: u.email, name: u.full_name || '', joined: u.created_date }));

  // The profile says one city, the Shabbos times are computed for another —
  // which means the app can lock at the wrong hour.
  const locationMismatch = members
    .filter((u) => u.home_city && u.city && norm(u.home_city) !== norm(u.city))
    .map((u) => ({ id: u.id, name: u.full_name || u.email, profile_city: u.home_city, zmanim_city: u.city, timezone: u.timezone || null }));

  // Signed in, has a city, but no coordinates: no zmanim at all.
  const noZmanim = members
    .filter((u) => u.latitude == null || u.longitude == null)
    .map((u) => ({ id: u.id, name: u.full_name || u.email, profile_city: u.home_city || null, suggested: u.suggested_city || null }));

  const published = providers.filter((p) => p.status === 'published' || p.status === undefined);
  const vouchedIds = new Set(vouches.map((v) => v.provider_id));

  // A listing nobody has vouched for is a directory entry, not a recommendation.
  const withoutVouch = published
    .filter((p) => !vouchedIds.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, city: p.city || null, category: p.category || null }));

  // Claims a listing has made that Klal has not checked.
  const unconfirmedBadges = published.flatMap((p) => {
    const verified = new Set(p.verified_badges || []);
    return (p.badges || [])
      .filter((id) => BADGE_BY_ID[id]?.verify && !verified.has(id) && badgeAppliesTo(BADGE_BY_ID[id], p.category))
      .map((id) => ({ id: p.id, name: p.name, badge: BADGE_BY_ID[id].label, city: p.city || null }));
  });

  // Two listings with the same name in the same city are usually one business
  // twice — a claim and an import, or two members adding the same shop.
  const byKey = new Map();
  for (const p of published) {
    const key = `${norm(p.name)}|${norm(p.city)}`;
    byKey.set(key, [...(byKey.get(key) || []), p]);
  }
  const duplicates = [...byKey.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({ name: group[0].name, city: group[0].city || null, ids: group.map((p) => p.id) }));

  // Where the directory is too thin for a first search to succeed.
  const cityCounts = new Map();
  for (const p of published) {
    if (!p.city) continue;
    cityCounts.set(p.city, (cityCounts.get(p.city) || 0) + 1);
  }
  const thinCities = [...cityCounts.entries()]
    .map(([city, count]) => ({ city, count, needed: Math.max(0, MIN_CITY_LISTINGS - count) }))
    .filter((c) => c.needed > 0)
    .sort((a, b) => b.count - a.count);

  // What people looked for. A search that found nothing is the clearest
  // possible statement of what the directory is missing.
  const searches = events.filter((e) => e.type === 'search');
  const empty = searches.filter((e) => Number(e.results) === 0);
  const emptyTerms = new Map();
  for (const e of empty) {
    const term = [e.query, e.category, e.city].filter(Boolean).join(' · ') || '(everything)';
    emptyTerms.set(term, (emptyTerms.get(term) || 0) + 1);
  }

  return {
    generated_at: new Date().toISOString(),
    totals: {
      members: members.length,
      listings_published: published.length,
      listings_pending: providers.length - published.length,
      vouches: vouches.length,
      listings_with_a_vouch: published.length - withoutVouch.length,
    },
    checks: [
      { key: 'unverified', label: 'Accounts that never confirmed their email', count: unverified.length, items: unverified.slice(0, 25), hint: 'They cannot post, answer or invite until they do. Resend from the member row, or check that email is configured.' },
      { key: 'location_mismatch', label: 'Profile city and Shabbos city disagree', count: locationMismatch.length, items: locationMismatch.slice(0, 25), hint: 'Candle lighting is computed for the Shabbos city. A mismatch can lock the app at the wrong hour.' },
      { key: 'no_zmanim', label: 'Members with no Shabbos location set', count: noZmanim.length, items: noZmanim.slice(0, 25), hint: 'Nothing is locked for them at all. Settings offers their profile city in one click.' },
      { key: 'unconfirmed_badges', label: 'Self-declared badges awaiting confirmation', count: unconfirmedBadges.length, items: unconfirmedBadges.slice(0, 25), hint: 'Shomer Shabbos, kashrus and licensing claims read as the owner\'s word until an admin confirms them on the listing.' },
      { key: 'without_vouch', label: 'Published listings with no vouch', count: withoutVouch.length, items: withoutVouch.slice(0, 25), hint: 'A listing nobody vouched for is just a directory entry. Ask a member who knows them.' },
      { key: 'duplicates', label: 'Possible duplicate listings', count: duplicates.length, items: duplicates.slice(0, 25), hint: 'Same name, same city. Merge by deleting one and keeping the vouched one.' },
      { key: 'thin_cities', label: 'Cities below launch density', count: thinCities.length, items: thinCities.slice(0, 25), hint: `A first search succeeds once a city has roughly ${MIN_CITY_LISTINGS} listings. Seed one city deeply rather than ten thinly.` },
      {
        key: 'empty_searches',
        label: 'Searches that found nothing',
        count: empty.length,
        items: [...emptyTerms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([term, times]) => ({ term, times })),
        hint: searches.length ? `${empty.length} of the last ${searches.length} searches came back empty. This is the shopping list.` : 'No searches recorded yet.',
      },
    ],
  };
}
