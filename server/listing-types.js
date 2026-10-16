// Listings filed under the wrong type, corrected once (approved by Eli,
// 2026-10-16). Nursing homes sat under Food & Catering, wholesalers under
// Restaurant, and so on, so the category pages and search left them out.
//
// Only category and subcategory change, and only while a listing still has
// the values it had when this list was made: anything an owner or admin has
// changed since is left alone. Recorded once, so an admin can move one back.
import { store } from './db.js';

const KEY = 'listing_types_fixed_2026_10_16';

export const TYPE_FIXES = [
  { id: "9eb6e4d105ee45418eb451a9", from: ["Food & Catering", "Senior Home"], to: ["Health", "Nursing Home & Rehab"] }, // Levindale Hebrew Geriatric Nursing Home and Hospital
  { id: "3676869fb2e24043934b8fa8", from: ["Food & Catering", "Senior Home"], to: ["Health", "Nursing Home & Rehab"] }, // The Jewish Home for Rehabilitation and Nursing in Freehold
  { id: "81c5c6435ba24e549ddc8e4c", from: ["Food & Catering", "Senior Home"], to: ["Health", "Nursing Home & Rehab"] }, // Meadow Park Rehab Center
  { id: "19b4c3889c4842fe9199aa25", from: ["Food & Catering", "Senior Home"], to: ["Health", "Nursing Home & Rehab"] }, // Margaret Teitz Rehab Center
  { id: "6348aa1eeb044bbeb69682e5", from: ["Food & Catering", "Senior Home"], to: ["Health", "Nursing Home & Rehab"] }, // Grandell Rehab Center
  { id: "06468c710d2b4f9b80201969", from: ["Food & Catering", "Senior Home"], to: ["Health", "Nursing Home & Rehab"] }, // Franklin Nursing and Rehab
  { id: "42e5b2356c564835aab59ae2", from: ["Food & Catering", "Senior Home"], to: ["Health", "Nursing Home & Rehab"] }, // Fort Tryon Rehab Center
  { id: "fa7f965013094e2383a3a976", from: ["Food & Catering", "Senior Home"], to: ["Health", "Nursing Home & Rehab"] }, // Dry Harbor Nursing Home
  { id: "d0797b0c1c1540a7831a1d2f", from: ["Food & Catering", "Senior Home"], to: ["Health", "Nursing Home & Rehab"] }, // Brandman Centers for Senior Care
  { id: "a21d32eec12245899ee0cbb5", from: ["Food & Catering", "Senior Home"], to: ["Health", "Nursing Home & Rehab"] }, // King David Nursing and Rehabilitation Center
  { id: "e86a07ffc6ec4176974fa4a7", from: ["Food & Catering", "Senior Home"], to: ["Health", "Nursing Home & Rehab"] }, // Aventura at the Heights formerly Tudor Heights-Weinberg Park
  { id: "f26b97384520455f9da24c24", from: ["Food & Catering", "Senior Home"], to: ["Health", "Assisted Living"] }, // Boulevard ALP
  { id: "c3529626d9fa49aebcd88a05", from: ["Food & Catering", "Senior Home"], to: ["Health", "Assisted Living"] }, // Atria Retirement Living – Riverdale
  { id: "140586468e5e4035be1cf428", from: ["Food & Catering", "Senior Home"], to: ["Health", "Assisted Living"] }, // Atria Retirement Living – K.G.
  { id: "09b7dff6107a493a8966df6c", from: ["Food & Catering", "Senior Home"], to: ["Health", "Assisted Living"] }, // Savant Senior Living
  { id: "55e1ecae37cb41278e4f182f", from: ["Food & Catering", "Factory / Co-packer"], to: ["Simcha Services", "Event Rentals"] }, // Kosher Event Rentals
  { id: "db42eefae1044a52ac9ad7d7", from: ["Food & Catering", "Factory / Co-packer"], to: ["Food & Catering", "Cafe"] }, // La Vela Coffee (Coffee Cart)
  { id: "aae60ef3882f43f3a45d5bb2", from: ["Food & Catering", "Factory / Co-packer"], to: ["Food & Catering", "Cafe"] }, // Acai Brazil (Hollywood)
  { id: "b15cae1b72a542c4bf965990", from: ["Food & Catering", "Factory / Co-packer"], to: ["Food & Catering", "Wholesale"] }, // Mega Kosher Distribution
  { id: "ae816a6d8d374a6fb29454ea", from: ["Food & Catering", "Factory / Co-packer"], to: ["Food & Catering", "Wholesale"] }, // Halpern's Steak & Seafood
  { id: "50545c37038f4c3e9e684b92", from: ["Food & Catering", "Factory / Co-packer"], to: ["Food & Catering", "Wholesale"] }, // Fresh Point/Fresh Cuts
  { id: "a8a636785c3644a49a4b215a", from: ["Food & Catering", "Restaurant"], to: ["Food & Catering", "Wholesale"] }, // Quality Veal and Lamb (Distributor)
  { id: "a42b344467224c5594edda73", from: ["Food & Catering", "Restaurant"], to: ["Food & Catering", "Bakery"] }, // Glick’s Bakehouse
  { id: "198844a07898457fb2d59595", from: ["Food & Catering", "Restaurant"], to: ["Food & Catering", "Bakery"] }, // Sonnys Bakery
  { id: "9ff1b82bb979444b99b4ea43", from: ["Food & Catering", "Restaurant"], to: ["Food & Catering", "Bakery"] }, // Moran Patisserie Aventura
];

export async function fixListingTypes() {
  if ((await store.filter('Setting', { key: KEY })).length) return 0;
  let changed = 0;
  for (const fix of TYPE_FIXES) {
    const p = await store.get('Provider', fix.id).catch(() => null);
    if (!p || p.category !== fix.from[0] || (p.subcategory || '') !== fix.from[1]) continue;
    await store.update('Provider', fix.id, { category: fix.to[0], subcategory: fix.to[1] });
    changed++;
  }
  await store.create('Setting', { key: KEY, value: String(changed) });
  if (changed) console.log(`[listings] corrected the type of ${changed} listings`);
  return changed;
}
