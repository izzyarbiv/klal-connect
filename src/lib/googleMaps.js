// Links into Google Maps for a listing. These are Google's documented Maps
// URLs, which need no API key: on a phone they open the Google Maps app, on a
// computer they open maps.google.com.
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

export function googleDirectionsUrl(place) {
  const q = mapsQuery(place);
  return q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}` : null;
}

// The key-free embedded map. It shows one place, which is all a listing page
// needs; the directory's many-pin map uses the Maps JavaScript API instead.
export function googleEmbedUrl(place, zoom = 15) {
  const q = mapsQuery(place);
  return q ? `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&output=embed` : null;
}
