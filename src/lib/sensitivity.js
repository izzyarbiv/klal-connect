// Which listings must never carry public "I've used this".
//
// Most of this directory benefits from public engagement: a plumber with four
// vouches is easier to trust than one with none. But the same mechanism, on
// the wrong listing, publishes something nobody agreed to publish.
//
// Vouches name the member (see CommunityTrust — it links to their profile) and
// community notes are signed. On an abuse hotline, an addiction service, a
// fertility organization, a therapist or a mikvah, that record says something
// about the member's own life, to everyone, permanently. Nobody taps "I've
// used this" on a crisis line intending to announce it.
//
// So for these listings the public controls are not rendered, and — because a
// hidden button is not a privacy rule — the server refuses the write too.
// Saving still works: a save is private to the person who made it.
//
// This module is deliberately shared by the client and the server
// (server/functions.js imports it) so the rule cannot drift between the two.
//
// It errs toward privacy. A false positive costs a listing its vouch button.
// A false negative publishes a person's crisis. Those are not comparable, so
// when a term is ambiguous it is included.

// Categories where every listing is private by nature.
//
// Shidduchim is named here even though the word "shidduch" in the category
// string already matches a term below, because that match is an accident of
// spelling: rename the category to "Zivug" and the guarantee would vanish
// without a single test failing. A privacy rule should not depend on what a
// category happens to be called.
const SENSITIVE_CATEGORIES = ['Mikvas', 'Shidduchim'];

// Matched as substrings against the listing's own words. Stems are used on
// purpose: "therap" covers therapy, therapist and therapeutic.
//
// Left out deliberately: bare "counsel", which appears in "attorney and
// counselor at law" and would flag every lawyer. The gerunds below carry the
// meaning we are looking for without that collision.
const SENSITIVE_TERMS = [
  // mental health
  'therap', 'psychiatr', 'psycholog', 'counseling', 'counselling',
  'mental health', 'behavioral health', 'behavioural health', 'emotional support',
  'trauma', 'ptsd', 'depression', 'anxiety', 'eating disorder', 'self-harm',
  'suicide', 'hotline', 'helpline', 'crisis',
  // abuse and safety
  'abuse', 'neglect', 'domestic violence', 'at-risk', 'at risk youth', 'safety plan',
  // addiction
  'addiction', 'addict', 'substance', 'alcohol', 'rehab', 'recovery', 'sober',
  // family building and loss
  'infertility', 'fertility', 'ivf', 'miscarriage', 'stillbirth',
  'bereavement', 'grief', 'hospice', 'palliative',
  'foster care', 'foster', 'adoption', 'adoptive',
  // A child's family circumstances. My Extended Family describes supporting
  // "children from single-parent homes due to divorce, death, or
  // incarceration" — using it says something about a family, not a service.
  'single parent', 'single-parent', 'divorce', 'incarcerat', 'orphan', 'widow', 'yesomim',
  // Material need. Masbia describes "soup kitchens and food pantries serving
  // anyone in need"; nobody taps "I've used this" on that meaning to announce
  // it. This reaches gemachim too, which is deliberate: borrowing money is
  // private, and a gemach is found by being listed, not by its use count.
  'soup kitchen', 'food pantry', 'food bank', 'tomchei shabbos', 'tomchei shabbas',
  'hunger', 'food insecurity', 'free groceries', 'financial assistance',
  'interest-free loan', 'interest free loan', 'gemach',
  // shidduchim — who is dating is not public information
  'shidduch', 'shadchan', 'matchmak',
  // disability and special needs — a family's medical information
  'special needs', 'disabilit', 'developmental delay', 'early intervention',
  // inherently private community services
  'mikvah', 'mikva', 'mikveh', 'taharas hamishpacha', 'kallah teacher', 'chosson teacher',
];

// Only the listing's own description of itself. Service areas are excluded on
// purpose: a place name should never decide this.
function listingText(provider) {
  return [
    provider?.name, provider?.tagline, provider?.category, provider?.subcategory,
    provider?.short_description, provider?.description,
  ].join(' ').toLowerCase();
}

/**
 * Is this a listing where public use and vouches would expose the member?
 */
export function isSensitiveListing(provider) {
  if (!provider) return false;
  if (SENSITIVE_CATEGORIES.includes(provider.category)) return true;
  const text = listingText(provider);
  return SENSITIVE_TERMS.some((term) => text.includes(term));
}

/** The inverse, for reading at call sites that ask permission rather than harm. */
export const allowsPublicEngagement = (provider) => !isSensitiveListing(provider);

// Shown in place of the controls, so their absence reads as deliberate rather
// than broken.
export const SENSITIVE_NOTICE =
  'Saving is private. Public "used this" and vouches are turned off for this kind of listing, so reaching out never becomes a public record.';
// The same, while vouches are switched off site-wide (Admin → Site switches).
export const SENSITIVE_NOTICE_NO_VOUCHES =
  'Saving is private. Public "used this" is turned off for this kind of listing, so reaching out never becomes a public record.';
