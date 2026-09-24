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

export const VERIFIED_MEANING =
  'Klal Connect contacted this business or organization directly and confirmed it exists, that these details reach them, and that they agreed to be listed. It is not a recommendation, a kashrus certification, or any judgment of their work.';

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
