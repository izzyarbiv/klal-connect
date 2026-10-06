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
