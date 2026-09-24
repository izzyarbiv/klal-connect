// Where a listing helps, matched against where a person is.
//
// A plain substring test over the location fields got the most important
// question in this product wrong. Four of the organisations listed here serve
// the entire country — Chai Lifeline, OHEL, Bonei Olam and Relief Resources
// all file their service area as "Nationwide" — and that text contains
// "nationwide", not "Boca Raton". So a Boca Raton visitor searching for a
// therapist was shown nothing local and told these four were available in
// "another community". They are available to them, today, by phone.
//
// "Who can help me with this, in this community?" is the question the whole
// directory exists to answer, so it is answered in one place and shared by the
// homepage and the search rather than written twice and allowed to drift.

// Service areas that mean "anywhere", not a place. Matched on word boundaries
// so a city named in passing cannot trip it.
const EVERYWHERE = /\b(nationwide|nation-?wide|national(?:ly)?|worldwide|international(?:ly)?|global(?:ly)?|anywhere|everywhere|remote(?:ly)?|virtual(?:ly)?|telehealth|by phone|all communities|any community|usa|united states)\b/i;

/** Does this listing serve people anywhere, rather than one place? */
export function servesEverywhere(provider) {
  const areas = provider?.service_areas;
  if (!Array.isArray(areas)) return false;
  return areas.some((area) => EVERYWHERE.test(String(area || '')));
}

/** Every place a listing names, as one searchable string. */
function placeText(provider) {
  return [
    provider?.city, provider?.neighborhood, provider?.zip,
    (provider?.service_areas || []).join(' '), provider?.state,
  ].join(' ').toLowerCase();
}

/**
 * Does this listing serve `where`?
 * An empty `where` is no constraint, and a listing that serves everywhere
 * serves every `where`.
 */
export function servesPlace(provider, where) {
  const needle = String(where || '').trim().toLowerCase();
  if (!needle) return true;
  if (servesEverywhere(provider)) return true;
  return placeText(provider).includes(needle);
}

/**
 * The communities that actually have something listed, most-listed first.
 * Derived from the data rather than hardcoded, so the list of places we can
 * honestly claim to serve grows as listings do — and a city never appears in
 * a picker with nothing behind it.
 *
 * Listings that serve everywhere name no community, so they are skipped here:
 * they will match whichever community is chosen anyway.
 */
export function communitiesFrom(providers = []) {
  const counts = new Map();
  for (const provider of providers) {
    if (servesEverywhere(provider)) continue;
    const city = String(provider?.city || '').trim();
    if (city) counts.set(city, (counts.get(city) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([city, count]) => ({ city, count }));
}
