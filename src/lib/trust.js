// What a mark on a listing means, in words a person can read.
//
// A check mark with no stated meaning is worse than no mark: everyone fills in
// their own definition, and most people fill in the most generous one — that
// Klal vouches for the quality of the work. It does not. This file is the one
// place that says what it does mean, so the answer cannot vary by page.
//
// The rule underneath all of it: payment never buys a trust mark. Sponsored
// placement is labelled, styled as an ad rather than an endorsement, and
// carries no check.

// Fields that decide how prominent a listing is, or claim it was checked. A
// listing never grants itself any of these.
//
// Exported from here because two different routes have to refuse them: the
// generic entity route through PROTECTED_FIELDS in server/app.js, and
// createListing through listingInput in server/functions.js. Those were two
// hand-written lists and they drifted — the generic route was fixed while
// createListing, which never sees stripProtected, still wrote all four onto
// the row at creation time. One list now, imported by both.
export const ADMIN_ONLY_LISTING_FIELDS = ['featured', 'sponsored', 'sponsored_until', 'last_confirmed_at'];

// What a ticked "Verified by Klal" box tells the public. Kept short on Eli's
// word: the admin box carries only the label, and this one line is what a
// reader sees once an admin ticks it.
export const VERIFIED_MEANING = 'This information and page have been verified by Klal.';

export const SPONSORED_MEANING =
  'This listing paid for placement. Payment never affects whether a listing is verified, and never changes where it appears in search results.';

/** Is this listing's paid placement currently running? */
export function isSponsored(provider, now = Date.now()) {
  if (!provider?.sponsored) return false;
  // No end date means an open-ended arrangement; a past one has lapsed and the
  // label must come down on its own rather than waiting for someone to notice.
  const until = provider.sponsored_until ? Date.parse(provider.sponsored_until) : NaN;
  return Number.isNaN(until) ? true : until > now;
}

/** When the details were last confirmed, in ms, or null if they never were. */
export function confirmedAt(provider) {
  const raw = provider?.last_confirmed_at || provider?.verified_at;
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(t) ? null : t;
}

const DAY = 86400000;

/**
 * "Confirmed 3 months ago", or null when nothing has ever been confirmed.
 *
 * Null rather than "not confirmed": while the directory is young that label
 * would sit on nearly every listing and read as a warning about each one
 * instead of a fact about our own coverage. This follows the existing decision
 * in ProviderDetail to hide the counter row until there is a count to show.
 *
 * A verified listing is the exception — the caller always shows a date there,
 * because a check with no date is precisely the untrustworthy case.
 */
export function confirmedLabel(provider, now = Date.now()) {
  const t = confirmedAt(provider);
  if (!t) return null;
  const days = Math.floor((now - t) / DAY);
  if (days <= 0) return 'Confirmed today';
  if (days === 1) return 'Confirmed yesterday';
  if (days < 30) return `Confirmed ${days} days ago`;
  if (days < 365) return `Confirmed ${Math.max(1, Math.round(days / 30))} months ago`;
  return 'Confirmed over a year ago';
}

/** Confirmed long enough ago that the details should not be leaned on. */
export const isStaleConfirmation = (provider, now = Date.now()) => {
  const t = confirmedAt(provider);
  return t !== null && now - t > 365 * DAY;
};

// Fields that say which business this is. Not every field — a listing can fix
// its hours or add a photo without that meaning anything about who it is.
const IDENTITY_FIELDS = ['name', 'category', 'city', 'address', 'phone'];

const identityChanges = (patch, row) =>
  IDENTITY_FIELDS.filter((f) => f in patch && String(patch[f] ?? '') !== String(row[f] ?? ''));

/**
 * Is this a coordinate the map can draw? null, undefined and '' are all "no
 * pin". An imported row with empty strings in both columns passed every
 * `!= null` check as pinned while the map had nothing to draw, and the
 * geocoder never ran for it because it looked done.
 */
export const hasCoordinate = (v) => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v));

/**
 * What a listing's pin loses when an edit moves the business.
 *
 * A pin from the old address on the new one is worse than no pin: the map and
 * the prerendered JSON-LD then carry a Brooklyn address at Lakewood
 * coordinates. So a change of address or city clears the coordinates and the
 * server geocodes again from the new address. This applies to every editor,
 * staff included. It used to live inside verificationAfterEdit, which the
 * route skips for staff so a correction does not cost a listing its check, and
 * so a moderator fixing a wrong address left the old pin exactly where it was.
 * Staff are the people who correct addresses; the pin rule cannot skip them.
 *
 * A patch that brings its own new coordinates is the exception. The owner who
 * moved the business and dropped the marker on the new door in the same save
 * has already said where it is, and a geocoder's guess must not replace that.
 * The same pair the row already holds does not count as new: a client echoing
 * the row back with a different city is the stale-pin case, not a placement.
 *
 * Returns the fields to write alongside the patch, or null when nothing moved.
 */
export function pinAfterEdit(patch, row) {
  if (!patch || !row) return null;
  const changed = identityChanges(patch, row);
  if (!changed.includes('address') && !changed.includes('city')) return null;
  const supplied = hasCoordinate(patch.latitude) && hasCoordinate(patch.longitude)
    && !(Number(patch.latitude) === Number(row.latitude) && Number(patch.longitude) === Number(row.longitude));
  if (supplied) return null;
  return { latitude: null, longitude: null };
}

/**
 * What a verified listing loses when an edit changes who it is.
 *
 * Verification is a statement Klal made about one specific business: we
 * reached these people, at these details, and they agreed to be listed. The
 * edit form covers name, category, address, city and phone, while `verified`,
 * `verified_at`, `slug` and the coordinates sit outside it and survive the
 * merge — so a verified caterer could be turned into an auto body shop in
 * another city while still asserting we had confirmed it. The mark has to come
 * down when the thing it was about changes, and it is staff's to put back.
 *
 * Returns the extra fields to write alongside the patch, or null for an edit
 * that changes nothing about identity.
 */
export function verificationAfterEdit(patch, row) {
  if (!patch || !row) return null;
  const changed = identityChanges(patch, row);
  if (!changed.length) return null;
  const out = {};
  if (row.verified) Object.assign(out, { verified: false, verified_at: null, verified_by: null, verified_badges: [] });
  if (row.last_confirmed_at) out.last_confirmed_at = null;
  // The pin is pinAfterEdit's, on purpose: that rule applies to staff too and
  // this one does not.
  return Object.keys(out).length ? { fields: out, changed } : null;
}
