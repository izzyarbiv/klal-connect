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

// Staff on listings: admins and moderators. The team accounts correct
// addresses, hours and descriptions across the directory as part of the job,
// and before this the only way a moderator could fix a typo on a listing they
// had not posted was to claim it — which would hand them a business's page.
// Editing as staff changes the words on the page and nothing about whose page
// it is: owner_id and created_by_id are left alone, so the rightful editor is
// still the rightful editor afterwards.
export const isListingStaff = (user) => !!user && (user.role === 'admin' || user.role === 'moderator');

/** May this person change this listing? Staff always may. */
export const canEditListing = (row, user) =>
  !!user && !!row && (isListingStaff(user) || listingEditor(row) === user.id);

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
export const GALLERY_MAX = 3;

// Photos of the business, each one credited.
//
// A listing may carry a few pictures, but every one has to say where it came
// from and link to the official source, so a visitor can tell a photo the
// business published from one somebody found. An uncredited image is refused
// rather than silently dropped: a form that quietly loses a photo looks like
// the upload failed, and the person uploads it again. safeUrl is handed in
// because the http(s)-only check lives in the server's functions module and
// this file is shared with the browser, which must not import that.
//
// Throws with statusCode 400 like the server's own fail(), so both routes can
// answer with the message as written.
export function normalizeGallery(raw, { safeUrl }) {
  const refuse = (message) => { const err = new Error(message); err.statusCode = 400; throw err; };
  if (raw === null || raw === undefined || raw === '') return [];
  if (!Array.isArray(raw)) refuse('Photos must be a list.');
  if (raw.length > GALLERY_MAX) refuse(`A listing can show up to ${GALLERY_MAX} photos.`);
  return raw.map((item) => {
    if (!item || typeof item !== 'object') refuse('Each photo needs an image, a caption and a source link.');
    const url = String(item.url || '').trim();
    const caption = String(item.caption || '').trim().slice(0, 200);
    if (!url) refuse('Each photo needs an image.');
    // Our own uploads come back as absolute https links (Blob) or as a path
    // under /api/files (local disk); anything else is not an image we served.
    if (!/^https:\/\//.test(url) && !url.startsWith('/api/files/')) refuse('Photos have to be uploaded here, not linked from elsewhere.');
    if (!caption) refuse('Each photo needs a caption saying where it came from, like "Photo: example.org".');
    const source_url = safeUrl(item.source_url);
    if (!source_url) refuse('Each photo needs a link to its official source.');
    return { url, caption, source_url };
  });
}

export function normalizeListingPatch(patch, row, { badgeById, badgeApplies, safeUrl }) {
  if (!patch || typeof patch !== 'object') return patch;
  const out = { ...patch };
  if ('gallery' in out) out.gallery = normalizeGallery(out.gallery, { safeUrl });
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
