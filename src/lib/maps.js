// Links into maps apps for a listing: Google Maps, Apple Maps and Waze. All
// three are the apps' documented URL schemes and need no API key. On a phone
// each opens its app when installed, otherwise its website.
//
// The search text is the street address when there is one, so Google drops the
// pin on the door rather than the middle of town; otherwise the name and town,
// so it can still find the business itself.
export function mapsQuery(place) {
  if (!place) return '';
  const town = [place.city, place.state].filter(Boolean).join(', ');
  if (place.address) {
    // An address saved without its town ("12 Main St") would match a Main St
    // anywhere in the country.
    const hasTown = !place.city || place.address.toLowerCase().includes(place.city.toLowerCase());
    return hasTown ? place.address : `${place.address}, ${town}`;
  }
  if (town) return [place.name, town].filter(Boolean).join(', ');
  if (place.latitude && place.longitude) return `${place.latitude},${place.longitude}`;
  return '';
}

export function googleMapsUrl(place) {
  const q = mapsQuery(place);
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

// Directions in each app, from wherever the person is now.
export function directionsLinks(place) {
  const q = mapsQuery(place);
  if (!q) return [];
  const e = encodeURIComponent(q);
  return [
    { id: 'google', label: 'Google Maps', href: `https://www.google.com/maps/dir/?api=1&destination=${e}` },
    { id: 'apple', label: 'Apple Maps', href: `https://maps.apple.com/?daddr=${e}` },
    { id: 'waze', label: 'Waze', href: `https://waze.com/ul?q=${e}&navigate=yes` },
  ];
}

// The address as a person writes it, for display and for Copy address. A
// listing known only by town gets the town line, so the Location panel and
// Copy address still have something true to show rather than nothing.
export function addressLine(place) {
  if (!place) return '';
  const town = [place.city, [place.state, place.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  if (!place.address) return town;
  const hasTown = !place.city || place.address.toLowerCase().includes(place.city.toLowerCase());
  return hasTown ? place.address : `${place.address}, ${town}`;
}

// The app picked last time goes first, so a Waze person is not asked to look
// past Google every time. Per browser, which is fine for a preference.
const PREF_KEY = 'kc-maps-app';
export const mapsPreference = () => { try { return localStorage.getItem(PREF_KEY); } catch { return null; } };
export const rememberMapsApp = (id) => { try { localStorage.setItem(PREF_KEY, id); } catch { /* private mode; fine */ } };
export function preferredFirst(links) {
  const pref = mapsPreference();
  return pref ? [...links].sort((a, b) => (b.id === pref) - (a.id === pref)) : links;
}

// The key-free embedded map. It shows one place, which is all a listing page
// needs; the directory's many-pin map uses the Maps JavaScript API instead.
export function googleEmbedUrl(place, zoom = 15) {
  const q = mapsQuery(place);
  return q ? `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&output=embed` : null;
}
