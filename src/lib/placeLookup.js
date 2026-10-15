import { api } from '@/api/client';

// Places from the curated community list on the server, as suggestions for a
// location box. Signed-out visitors cannot use that lookup, so a failure is
// quietly no extra suggestions: the places that have listings are still shown.
export async function lookupPlaces(text) {
  const rows = await api.geo.search(text, 6);
  return (Array.isArray(rows) ? rows : [])
    .filter((p) => p.city)
    .map((p) => ({ group: 'Other places', kind: 'place', label: p.city, value: p.city, hint: p.region || p.country_code || '' }));
}
