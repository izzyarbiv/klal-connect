// Who controls a listing.
//
// Whoever claimed it, or whoever added it while nobody has. Claiming hands the
// page to the business — that is what claiming is for — so the community member
// who first added it stops being its editor and goes back to suggesting
// corrections like anyone else.
//
// This lives in one place because the rule needs to hold in five: canWrite on
// the generic entity route, the two self-service functions (tagline and payment
// link), the Edit link on a listing page, the edit form's own refusal, and the
// "manage my listings" list. Written out five times it would drift, and the
// drift would be silent — which is exactly what happened with the admin-only
// field list earlier: the generic route refused them while createListing wrote
// them straight onto the row.
export const listingEditor = (row) => (row && (row.owner_id || row.created_by_id)) || null;

/** May this person change this listing? Admins always may. */
export const canEditListing = (row, user) =>
  !!user && !!row && (user.role === 'admin' || listingEditor(row) === user.id);

// Shape, not permission.
//
// Creating a listing goes through listingInput, which filters badges to the
// ones the category allows, reduces a WhatsApp number to the digits wa.me
// needs, and caps the tagline. Editing one goes through the generic PUT route,
// which did none of that — so the edit form was a way around every rule the
// create path enforces. A plumber could not declare Pas Yisroel on the way in
// and could on the way back through.
//
// A patch is not a whole row, so this only touches keys the patch actually
// carries. The alternative — running the create normalizer over a patch — adds
// `badges: []`, `whatsapp: ''` and `languages: ['English']` to a row that never
// had them, which is how a one-field edit quietly rewrites four other fields.
export function normalizeListingPatch(patch, row, { badgeById, badgeApplies }) {
  if (!patch || typeof patch !== 'object') return patch;
  const out = { ...patch };
  const category = 'category' in out ? out.category : row?.category;
  // A category change re-tests the badges already on the row, because a badge
  // only means anything next to the trade it was granted for.
  if ('badges' in out || ('category' in out && Array.isArray(row?.badges) && row.badges.length)) {
    const declared = Array.isArray(out.badges) ? out.badges : (row?.badges || []);
    out.badges = [...new Set(declared.filter((id) => badgeById[id] && badgeApplies(badgeById[id], category)))];
  }
  // A verified badge the listing has stopped declaring has to come down.
  // The page draws a badge that is declared OR confirmed, and verified_badges
  // is an admin field the owner's patch cannot touch — so un-ticking a badge
  // in the edit form saved and changed nothing on the page, while the form
  // said "Your changes are live." That is the one direction that must work: a
  // caterer who stops being cholov Yisroel, or stops closing for Shabbos, is
  // the only one who knows, and had no way to say so. Confirmed is a subset of
  // declared, so the server keeps it one.
  if ('badges' in out || 'category' in out) {
    const declared = new Set('badges' in out ? out.badges : (row?.badges || []));
    const confirmed = 'verified_badges' in out ? out.verified_badges : row?.verified_badges;
    if (Array.isArray(confirmed) && confirmed.length) {
      out.verified_badges = confirmed.filter((id) => declared.has(id) && badgeById[id] && badgeApplies(badgeById[id], category));
    }
  }
  if ('whatsapp' in out) {
    out.whatsapp = out.whatsapp ? String(out.whatsapp).replace(/\D/g, '').replace(/^1?(\d{10})$/, '1$1') : '';
  }
  if ('tagline' in out) out.tagline = String(out.tagline || '').slice(0, 120);
  // The public listing page maps over both of these. A string where an array
  // belongs is a 500 on a page anyone can open.
  for (const field of ['service_areas', 'languages']) {
    if (!(field in out)) continue;
    const given = out[field];
    out[field] = [...new Set((Array.isArray(given) ? given : String(given || '').split(','))
      .map((v) => String(v).trim())
      .filter(Boolean))];
  }
  return out;
}
