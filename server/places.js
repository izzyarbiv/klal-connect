// The places Klal is actually for.
//
// Resolving a city name normally means a third-party API, and the free one
// (Nominatim) refuses production traffic — which left onboarding, zmanim
// setup, map pinning and "nearest" quietly broken whenever no key was
// configured. But the frum world is a known, short list of places, and a
// directory only has to resolve the ones its members live in. Those are
// answered from here: in process, no key, no rate limit, no failure mode.
//
// A configured provider (KC_GEOCODER=google|mapbox|geoapify|locationiq) still
// handles everything else — a street address, a town nobody listed — and its
// answers are better. This list exists so the product works today, and keeps
// working when a key expires.
//
// Coordinates are the centre of the community to about a kilometre, which is
// what candle lighting and a directory search need. `aka` are the names people
// actually type.
export const PLACES = [
  // --- New York / New Jersey ---------------------------------------------
  { city: 'Lakewood', region: 'NJ', country_code: 'US', latitude: 40.0978, longitude: -74.2176, aka: ['lakewood nj', 'lakewood new jersey'] },
  { city: 'Toms River', region: 'NJ', country_code: 'US', latitude: 39.9537, longitude: -74.1979 },
  { city: 'Jackson', region: 'NJ', country_code: 'US', latitude: 40.1090, longitude: -74.3646, aka: ['jackson nj'] },
  { city: 'Howell', region: 'NJ', country_code: 'US', latitude: 40.1837, longitude: -74.2043 },
  { city: 'Passaic', region: 'NJ', country_code: 'US', latitude: 40.8568, longitude: -74.1285 },
  { city: 'Clifton', region: 'NJ', country_code: 'US', latitude: 40.8584, longitude: -74.1638 },
  { city: 'Teaneck', region: 'NJ', country_code: 'US', latitude: 40.8976, longitude: -74.0160 },
  { city: 'Bergenfield', region: 'NJ', country_code: 'US', latitude: 40.9276, longitude: -73.9976 },
  { city: 'Edison', region: 'NJ', country_code: 'US', latitude: 40.5187, longitude: -74.4121 },
  { city: 'Deal', region: 'NJ', country_code: 'US', latitude: 40.2504, longitude: -74.0007 },
  { city: 'Elizabeth', region: 'NJ', country_code: 'US', latitude: 40.6639, longitude: -74.2107 },

  { city: 'Brooklyn', region: 'NY', country_code: 'US', latitude: 40.6501, longitude: -73.9496 },
  { city: 'Boro Park', region: 'NY', country_code: 'US', latitude: 40.6329, longitude: -73.9932, aka: ['borough park'] },
  { city: 'Flatbush', region: 'NY', country_code: 'US', latitude: 40.6360, longitude: -73.9626 },
  { city: 'Midwood', region: 'NY', country_code: 'US', latitude: 40.6180, longitude: -73.9605 },
  { city: 'Williamsburg', region: 'NY', country_code: 'US', latitude: 40.7081, longitude: -73.9571 },
  { city: 'Crown Heights', region: 'NY', country_code: 'US', latitude: 40.6694, longitude: -73.9422 },
  { city: 'Marine Park', region: 'NY', country_code: 'US', latitude: 40.6089, longitude: -73.9366 },
  { city: 'Kew Gardens Hills', region: 'NY', country_code: 'US', latitude: 40.7325, longitude: -73.8210, aka: ['kew gardens', 'queens'] },
  { city: 'Far Rockaway', region: 'NY', country_code: 'US', latitude: 40.6048, longitude: -73.7554 },
  { city: 'Cedarhurst', region: 'NY', country_code: 'US', latitude: 40.6218, longitude: -73.7248, aka: ['five towns', 'lawrence', 'woodmere'] },
  { city: 'Great Neck', region: 'NY', country_code: 'US', latitude: 40.8007, longitude: -73.7285 },
  { city: 'Monsey', region: 'NY', country_code: 'US', latitude: 41.1115, longitude: -74.0682, aka: ['monsey ny', 'spring valley'] },
  { city: 'New Square', region: 'NY', country_code: 'US', latitude: 41.1290, longitude: -74.0290 },
  { city: 'Suffern', region: 'NY', country_code: 'US', latitude: 41.1148, longitude: -74.1496 },
  { city: 'Kiryas Joel', region: 'NY', country_code: 'US', latitude: 41.3420, longitude: -74.1660, aka: ['monroe ny', 'kiryas yoel'] },
  { city: 'Airmont', region: 'NY', country_code: 'US', latitude: 41.0993, longitude: -74.1024 },
  { city: 'Manhattan', region: 'NY', country_code: 'US', latitude: 40.7831, longitude: -73.9712, aka: ['new york city', 'nyc', 'upper west side'] },
  { city: 'Staten Island', region: 'NY', country_code: 'US', latitude: 40.5795, longitude: -74.1502 },

  // --- rest of the US -----------------------------------------------------
  { city: 'Baltimore', region: 'MD', country_code: 'US', latitude: 39.3489, longitude: -76.7020 },
  { city: 'Silver Spring', region: 'MD', country_code: 'US', latitude: 39.0040, longitude: -77.0207 },
  { city: 'Philadelphia', region: 'PA', country_code: 'US', latitude: 40.0662, longitude: -75.1810 },
  { city: 'Cherry Hill', region: 'NJ', country_code: 'US', latitude: 39.9260, longitude: -75.0246 },
  { city: 'Waterbury', region: 'CT', country_code: 'US', latitude: 41.5582, longitude: -73.0515 },
  { city: 'Stamford', region: 'CT', country_code: 'US', latitude: 41.0534, longitude: -73.5387 },
  { city: 'Brookline', region: 'MA', country_code: 'US', latitude: 42.3318, longitude: -71.1212, aka: ['boston'] },
  { city: 'Cleveland Heights', region: 'OH', country_code: 'US', latitude: 41.5101, longitude: -81.5563, aka: ['cleveland', 'beachwood'] },
  { city: 'Columbus', region: 'OH', country_code: 'US', latitude: 39.9828, longitude: -83.0179 },
  { city: 'Cincinnati', region: 'OH', country_code: 'US', latitude: 39.2003, longitude: -84.4383 },
  { city: 'Southfield', region: 'MI', country_code: 'US', latitude: 42.4734, longitude: -83.2219, aka: ['detroit', 'oak park mi'] },
  { city: 'Chicago', region: 'IL', country_code: 'US', latitude: 41.9986, longitude: -87.6919, aka: ['west rogers park'] },
  { city: 'Skokie', region: 'IL', country_code: 'US', latitude: 42.0334, longitude: -87.7334 },
  { city: 'St. Louis', region: 'MO', country_code: 'US', latitude: 38.6631, longitude: -90.3417 },
  { city: 'Memphis', region: 'TN', country_code: 'US', latitude: 35.1174, longitude: -89.8734 },
  { city: 'Atlanta', region: 'GA', country_code: 'US', latitude: 33.8767, longitude: -84.3382 },
  { city: 'Miami Beach', region: 'FL', country_code: 'US', latitude: 25.8712, longitude: -80.1265, aka: ['miami', 'north miami beach'] },
  { city: 'Boca Raton', region: 'FL', country_code: 'US', latitude: 26.3683, longitude: -80.1289 },
  { city: 'Hollywood', region: 'FL', country_code: 'US', latitude: 26.0112, longitude: -80.1495 },
  { city: 'Dallas', region: 'TX', country_code: 'US', latitude: 32.8620, longitude: -96.7700 },
  { city: 'Houston', region: 'TX', country_code: 'US', latitude: 29.7229, longitude: -95.4632 },
  { city: 'Denver', region: 'CO', country_code: 'US', latitude: 39.7186, longitude: -104.9384 },
  { city: 'Phoenix', region: 'AZ', country_code: 'US', latitude: 33.5100, longitude: -112.0400 },
  { city: 'Las Vegas', region: 'NV', country_code: 'US', latitude: 36.1447, longitude: -115.2600 },
  { city: 'Los Angeles', region: 'CA', country_code: 'US', latitude: 34.0709, longitude: -118.3790, aka: ['pico robertson', 'hancock park', 'valley village'] },
  { city: 'Beverly Hills', region: 'CA', country_code: 'US', latitude: 34.0736, longitude: -118.4004 },
  { city: 'San Diego', region: 'CA', country_code: 'US', latitude: 32.7970, longitude: -117.2340 },
  { city: 'San Francisco', region: 'CA', country_code: 'US', latitude: 37.7749, longitude: -122.4194 },
  { city: 'Seattle', region: 'WA', country_code: 'US', latitude: 47.6810, longitude: -122.3050 },
  { city: 'Portland', region: 'OR', country_code: 'US', latitude: 45.5152, longitude: -122.6784 },

  // --- Israel -------------------------------------------------------------
  { city: 'Jerusalem', region: '', country_code: 'IL', latitude: 31.7683, longitude: 35.2137, aka: ['yerushalayim', 'ירושלים', 'geula', 'har nof', 'ramot', 'sanhedria'] },
  { city: 'Bnei Brak', region: '', country_code: 'IL', latitude: 32.0809, longitude: 34.8338, aka: ['bnai brak', 'bene beraq', 'בני ברק'] },
  { city: 'Beit Shemesh', region: '', country_code: 'IL', latitude: 31.7497, longitude: 34.9887, aka: ['ramat beit shemesh', 'rbs', 'בית שמש'] },
  { city: 'Modiin Illit', region: '', country_code: 'IL', latitude: 31.9319, longitude: 35.0367, aka: ['kiryat sefer'] },
  { city: 'Beitar Illit', region: '', country_code: 'IL', latitude: 31.6961, longitude: 35.1197, aka: ['beitar'] },
  { city: 'Elad', region: '', country_code: 'IL', latitude: 32.0511, longitude: 34.9511 },
  { city: 'Ashdod', region: '', country_code: 'IL', latitude: 31.8014, longitude: 34.6435 },
  { city: 'Netanya', region: '', country_code: 'IL', latitude: 32.3215, longitude: 34.8532 },
  { city: 'Tel Aviv', region: '', country_code: 'IL', latitude: 32.0853, longitude: 34.7818, aka: ['תל אביב'] },
  { city: 'Ramat Gan', region: '', country_code: 'IL', latitude: 32.0684, longitude: 34.8248 },
  { city: 'Petah Tikva', region: '', country_code: 'IL', latitude: 32.0868, longitude: 34.8870 },
  { city: 'Haifa', region: '', country_code: 'IL', latitude: 32.7940, longitude: 34.9896 },
  { city: 'Tzfat', region: '', country_code: 'IL', latitude: 32.9646, longitude: 35.4960, aka: ['safed', 'tsfat', 'צפת'] },
  { city: 'Tiberias', region: '', country_code: 'IL', latitude: 32.7922, longitude: 35.5312, aka: ['teveria'] },
  { city: 'Efrat', region: '', country_code: 'IL', latitude: 31.6547, longitude: 35.1519 },
  { city: 'Rechovot', region: '', country_code: 'IL', latitude: 31.8928, longitude: 34.8113, aka: ['rehovot'] },
  { city: 'Modiin', region: '', country_code: 'IL', latitude: 31.8928, longitude: 35.0104 },
  { city: 'Ariel', region: '', country_code: 'IL', latitude: 32.1056, longitude: 35.1739 },
  { city: 'Eilat', region: '', country_code: 'IL', latitude: 29.5577, longitude: 34.9519 },

  // --- elsewhere ----------------------------------------------------------
  { city: 'Toronto', region: 'ON', country_code: 'CA', latitude: 43.7180, longitude: -79.4260, aka: ['thornhill', 'north york'] },
  { city: 'Montreal', region: 'QC', country_code: 'CA', latitude: 45.5088, longitude: -73.6500, aka: ['cote saint luc', 'outremont'] },
  { city: 'London', region: '', country_code: 'GB', latitude: 51.5810, longitude: -0.1950, aka: ['golders green', 'stamford hill', 'hendon'] },
  { city: 'Manchester', region: '', country_code: 'GB', latitude: 53.5150, longitude: -2.2500, aka: ['salford', 'prestwich', 'broughton park'] },
  { city: 'Gateshead', region: '', country_code: 'GB', latitude: 54.9526, longitude: -1.6033 },
  { city: 'Antwerp', region: '', country_code: 'BE', latitude: 51.2100, longitude: 4.4200 },
  { city: 'Zurich', region: '', country_code: 'CH', latitude: 47.3769, longitude: 8.5417 },
  { city: 'Vienna', region: '', country_code: 'AT', latitude: 48.2100, longitude: 16.3600 },
  { city: 'Paris', region: '', country_code: 'FR', latitude: 48.8566, longitude: 2.3522 },
  { city: 'Melbourne', region: 'VIC', country_code: 'AU', latitude: -37.8770, longitude: 145.0020, aka: ['caulfield', 'st kilda'] },
  { city: 'Sydney', region: 'NSW', country_code: 'AU', latitude: -33.8890, longitude: 151.2500, aka: ['bondi'] },
  { city: 'Johannesburg', region: '', country_code: 'ZA', latitude: -26.1400, longitude: 28.0500, aka: ['glenhazel'] },
  { city: 'Mexico City', region: '', country_code: 'MX', latitude: 19.4326, longitude: -99.1332 },
  { city: 'Buenos Aires', region: '', country_code: 'AR', latitude: -34.6037, longitude: -58.3816 },
  { city: 'Panama City', region: '', country_code: 'PA', latitude: 8.9824, longitude: -79.5199 },
];

export const placeLabel = (p) => [p.city, p.region, p.country_code === 'US' ? null : p.country_code].filter(Boolean).join(', ');

const fold = (s) => String(s || '').trim().toLowerCase().replace(/[.'’]/g, '').replace(/\s+/g, ' ');
const namesOf = (p) => [fold(p.city), ...(p.aka || []).map(fold), fold(placeLabel(p)), fold(`${p.city} ${p.region}`)];

// US state codes, so "FL" does not match Flatbush and a state on its own is
// understood as a state.
const STATE_CODES = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC']);

// Best matches first: an exact name, then one that starts with the query, then
// one contained in it either direction — which is what makes a full street
// address resolve, since "7200 Palmetto Circle N Boca Raton, FL 33433"
// contains "boca raton". Nothing fuzzy: a wrong city silently computing the
// wrong candle lighting is worse than no answer at all.
export function findPlaces(query, limit = 8) {
  const raw = String(query || '').trim();
  const q = fold(raw);
  if (q.length < 2) return [];

  // A bare state code is a state, not a city that happens to contain those
  // two letters.
  const asState = raw.trim().toUpperCase();
  if (asState.length === 2 && STATE_CODES.has(asState)) {
    return PLACES.filter((p) => p.region === asState).slice(0, limit);
  }

  const scored = [];
  for (const p of PLACES) {
    const names = namesOf(p);
    let score = null;
    if (names.some((n) => n === q)) score = 0;
    else if (names.some((n) => n.startsWith(q))) score = 1;
    else if (q.length >= 3 && names.some((n) => n.includes(q))) score = 2;
    // The query contains a place name — an address, or "shul in Monsey".
    // Only for names long enough not to appear inside other words.
    else if (names.some((n) => n.length >= 4 && wordsContain(q, n))) score = 3;
    if (score !== null) scored.push({ p, score, len: p.city.length });
  }
  // Within the same score, the longest matched name wins: an address in
  // "Beit Shemesh" should not resolve to "Beit" something shorter.
  scored.sort((a, b) => a.score - b.score
    || (a.score === 3 ? b.len - a.len : a.len - b.len)
    || a.p.city.localeCompare(b.p.city));
  return scored.slice(0, limit).map(({ p }) => p);
}

// Does the haystack contain the needle as whole words? Prevents "elad" from
// matching inside "philadelphia".
function wordsContain(haystack, needle) {
  const i = haystack.indexOf(needle);
  if (i === -1) return false;
  const before = i === 0 ? ' ' : haystack[i - 1];
  const after = i + needle.length >= haystack.length ? ' ' : haystack[i + needle.length];
  return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
}

const R_KM = 6371;
const rad = (d) => (d * Math.PI) / 180;
export function distanceKm(aLat, aLon, bLat, bLon) {
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return R_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// The community a set of coordinates belongs to, if one is close enough to be
// an honest answer. 25km covers a metro area without claiming a point in the
// next state is "Lakewood".
export function nearestPlace(latitude, longitude, maxKm = 25) {
  let best = null;
  let bestKm = Infinity;
  for (const p of PLACES) {
    const km = distanceKm(latitude, longitude, p.latitude, p.longitude);
    if (km < bestKm) { bestKm = km; best = p; }
  }
  return best && bestKm <= maxKm ? { ...best, distance_km: bestKm } : null;
}
