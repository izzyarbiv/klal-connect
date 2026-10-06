// The badge catalog.
//
// A listing declares its own badges (`badges`); an admin confirms the ones
// that are claims about practice rather than facts about the owner
// (`verified_badges`), and a confirmed badge draws filled with a check.
// Nothing here is a kashrus certification — a certified business names its
// agency in its description.
//
// `categories` is what makes a badge offerable: a plumber is never asked
// about cholov Yisroel, and a caterer is never offered "Gemach". A badge with
// no `categories` applies to every listing. The list matches the category
// names in server/seed-data.js; a listing in an unknown category gets the
// universal set only.
//
// `verify: true` marks a claim that should read as the owner's word until
// Klal has checked it.
export const BADGES = [
  // --- food, kashrus ---------------------------------------------------
  { id: 'cholov_yisroel', label: 'Cholov Yisroel', hint: 'Dairy is cholov Yisroel only.', verify: true, categories: ['Food & Catering', 'Simcha Services'] },
  { id: 'pas_yisroel', label: 'Pas Yisroel', hint: 'Baked goods are pas Yisroel.', verify: true, categories: ['Food & Catering', 'Simcha Services'] },
  { id: 'kosher_supervised', label: 'Under hashgacha', hint: 'Holds kosher certification — name the agency in your description.', verify: true, categories: ['Food & Catering', 'Simcha Services'] },
  { id: 'delivery', label: 'Delivers', categories: ['Food & Catering', 'Home Services', 'Business'] },

  // --- chesed and money ------------------------------------------------
  { id: 'gemach', label: 'Gemach', hint: 'Free loan of items or funds.', categories: ['Gemachim', 'Community'] },
  { id: 'no_charge', label: 'No charge', hint: 'This resource is free to the community.', categories: ['Gemachim', 'Community', 'Education', 'Shidduchim'] },
  { id: 'accepts_maaser', label: 'Accepts Maaser', hint: 'A tzedakah or chesed organization that can accept maaser money.', verify: true, categories: ['Gemachim', 'Community', 'Financial'] },
  { id: 'sliding_scale', label: 'Sliding scale', hint: 'Fees adjust to what a family can pay.', categories: ['Health', 'Education', 'Legal', 'Financial', 'Community', 'Shidduchim'] },

  // --- how the work happens --------------------------------------------
  { id: 'emergency', label: '24/7 emergency', hint: 'Reachable outside normal hours for emergencies.', categories: ['Home Services', 'Health'] },
  { id: 'house_calls', label: 'House calls', categories: ['Health', 'Home Services', 'Education', 'Technology'] },
  { id: 'licensed_insured', label: 'Licensed & insured', verify: true, categories: ['Home Services', 'Health', 'Legal', 'Financial', 'Business', 'Simcha Services'] },
  { id: 'background_checked', label: 'Background checked', hint: 'For anyone working with children or in a home. Confirmed by Klal.', verify: true, categories: ['Education', 'Health', 'Home Services', 'Community'] },
  { id: 'accepts_insurance', label: 'Accepts insurance', categories: ['Health'] },
  { id: 'remote', label: 'Remote available', hint: 'Works with clients anywhere by phone or video.', categories: ['Business', 'Education', 'Health', 'Legal', 'Financial', 'Technology'] },

  // --- who runs it (every listing) --------------------------------------
  { id: 'shomer_shabbos', label: 'Shomer Shabbos', hint: 'Closed on Shabbos and Yom Tov.', verify: true },
  { id: 'women_owned', label: 'Women-owned' },
  { id: 'women_only', label: 'Women only', hint: 'Serves women and girls only.', categories: ['Health', 'Education', 'Simcha Services'] },
  { id: 'veteran_owned', label: 'Veteran-owned' },
  { id: 'yiddish', label: 'Yiddish spoken' },
  { id: 'hebrew', label: 'Hebrew spoken' },
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));

export const badgeAppliesTo = (badge, category) =>
  !badge.categories || (!!category && badge.categories.includes(category));

// What a listing in this category may claim. Grouped for the form: the ones
// specific to the trade first, then the ones every listing can carry.
export function badgesForCategory(category) {
  const list = BADGES.filter((b) => badgeAppliesTo(b, category));
  return {
    specific: list.filter((b) => b.categories),
    universal: list.filter((b) => !b.categories),
    all: list,
  };
}

// Badges to render on a listing, each with whether an admin has confirmed it.
// A badge that no longer applies to the listing's category is dropped rather
// than shown: categories get edited, and a caterer-turned-plumber should not
// keep "Pas Yisroel".
export function listingBadges(provider) {
  const declared = new Set(provider?.badges || []);
  const verified = new Set(provider?.verified_badges || []);
  return BADGES
    .filter((b) => (declared.has(b.id) || verified.has(b.id)) && badgeAppliesTo(b, provider?.category))
    .map((b) => ({ ...b, verified: verified.has(b.id) }));
}
