// The badge catalog. A listing declares badges itself (`badges`); an admin can
// confirm some of them (`verified_badges`), and a confirmed badge draws
// filled with a check. Nothing here is a kashrus certification — a listing
// that is certified names its agency in its description and we link to it.
//
// `verify: true` marks claims that should only ever be shown once confirmed;
// until then the listing's own declaration is still stored, but rendered as
// "self-declared".
export const BADGES = [
  { id: 'shomer_shabbos',  label: 'Shomer Shabbos',   hint: 'Closed on Shabbos and Yom Tov.', verify: true },
  { id: 'cholov_yisroel',  label: 'Cholov Yisroel',   hint: 'Dairy is cholov Yisroel only.', verify: true },
  { id: 'pas_yisroel',     label: 'Pas Yisroel',      hint: 'Baked goods are pas Yisroel.', verify: true },
  { id: 'accepts_maaser',  label: 'Accepts Maaser',   hint: 'A tzedakah or chesed organization that can accept maaser money.' },
  { id: 'gemach',          label: 'Gemach',           hint: 'Free loan of items or funds.' },
  { id: 'women_owned',     label: 'Women-owned' },
  { id: 'veteran_owned',   label: 'Veteran-owned' },
  { id: 'yiddish',         label: 'Yiddish spoken' },
  { id: 'hebrew',          label: 'Hebrew spoken' },
  { id: 'heimish',         label: 'Heimish' },
  { id: 'remote',          label: 'Remote available',  hint: 'Works with clients anywhere by phone or video.' },
  { id: 'house_calls',     label: 'House calls' },
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));

// Badges to render on a listing, each with whether an admin has confirmed it.
export function listingBadges(provider) {
  const declared = new Set(provider?.badges || []);
  const verified = new Set(provider?.verified_badges || []);
  return BADGES
    .filter((b) => declared.has(b.id) || verified.has(b.id))
    .map((b) => ({ ...b, verified: verified.has(b.id) }));
}
