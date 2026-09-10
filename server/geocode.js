// Geocoding, proxied through our server.
//
// The browser must not call a geocoder directly:
//   * Nominatim's usage policy requires an identifying User-Agent and caps
//     traffic at ~1 request/second. A browser cannot set User-Agent at all, and
//     N users means N requests/second, so direct calls are non-compliant by
//     construction — which is what the app used to do.
//   * Commercial providers need an API key, which must never ship to a client.
//   * Calling out from the browser hands the user's exact coordinates (and, for
//     IP lookups, their IP) straight to a third party.
//
// Proxying fixes all three: one identified caller, one shared cache, one place
// to swap providers. Set KC_GEOCODER to move off Nominatim without touching
// application code.
import tzLookup from 'tz-lookup';
import { geoCache } from './db.js';

import { findPlaces, nearestPlace, placeLabel, distanceKm } from './places.js';

const PROVIDER = (process.env.KC_GEOCODER || 'nominatim').toLowerCase();
const API_KEY = process.env.KC_GEOCODER_KEY || '';
const CONTACT = process.env.KC_GEOCODER_CONTACT || 'admin@example.com';
const USER_AGENT = process.env.KC_GEOCODER_UA || `Klal/1.0 (${CONTACT})`;
const LOCATION_UNAVAILABLE = 'Location lookup is temporarily unavailable.';

const REVERSE_TTL = 30 * 24 * 60 * 60 * 1000; // a place's name rarely changes
const SEARCH_TTL = 7 * 24 * 60 * 60 * 1000;
const IP_TTL = 24 * 60 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 8000;

class GeoError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ---- shared helpers ---------------------------------------------------------

async function getJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Nominatim rejects anonymous traffic; the others ignore this.
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      console.warn('[geocode] upstream rejected request', { provider: PROVIDER, status: res.status });
      throw new GeoError(LOCATION_UNAVAILABLE, res.status === 429 ? 429 : 503);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof GeoError) throw err;
    console.warn('[geocode] upstream request failed', { provider: PROVIDER, reason: err.name || 'unknown' });
    throw new GeoError(LOCATION_UNAVAILABLE, 503);
  } finally {
    clearTimeout(timer);
  }
}

// Nominatim allows at most one request per second, globally, per application.
// Serialize upstream calls behind a promise chain so bursts queue instead of
// getting us blocked.
let chain = Promise.resolve();
let lastCallAt = 0;
const MIN_GAP_MS = Number(process.env.KC_GEOCODER_MIN_GAP_MS || 1100);

function throttled(task) {
  const run = chain.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_GAP_MS - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
    return task();
  });
  // Keep the chain alive even when one call rejects.
  chain = run.then(() => undefined, () => undefined);
  return run;
}

// Only the throttled providers need the queue; a paid API does not.
const needsThrottle = () => PROVIDER === 'nominatim';
const call = (task) => (needsThrottle() ? throttled(task) : task());

// Timezone is derived from coordinates rather than taken from the browser.
// Using the browser's zone is wrong the moment someone picks a city in another
// zone — and zmanim are computed from it, so that would silently produce the
// wrong candle-lighting time.
function tzFor(latitude, longitude) {
  try {
    return tzLookup(Number(latitude), Number(longitude));
  } catch {
    return '';
  }
}

const firstOf = (...values) => values.find((v) => v !== undefined && v !== null && v !== '') || '';

function place(latitude, longitude, { city, country_code, label } = {}) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  return {
    latitude: lat,
    longitude: lon,
    city: city || '',
    country_code: (country_code || '').toUpperCase(),
    timezone: tzFor(lat, lon),
    label: label || city || '',
  };
}

// Google reports failures in the body with a 200, so a bad key or a billing
// problem would otherwise read as "no results".
function googleStatus(d) {
  const status = d?.status;
  if (status === 'OK' || status === 'ZERO_RESULTS') return;
  const detail = d?.error_message ? ` — ${d.error_message}` : '';
  console.warn('[geocode] Google rejected response', { status, detail: d?.error_message || '' });
  throw new GeoError(LOCATION_UNAVAILABLE, 503);
}

function googleComponents(result) {
  const pick = (type) => (result.address_components || []).find((c) => c.types.includes(type));
  return {
    city: firstOf(
      pick('locality')?.long_name,
      pick('postal_town')?.long_name,
      pick('sublocality')?.long_name,
      pick('administrative_area_level_2')?.long_name
    ),
    country_code: pick('country')?.short_name,
  };
}

// ---- providers --------------------------------------------------------------

const providers = {
  nominatim: {
    async reverse(lat, lon) {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&email=${encodeURIComponent(CONTACT)}`;
      const d = await getJSON(url);
      const a = d.address || {};
      return place(lat, lon, {
        city: firstOf(a.city, a.town, a.village, a.hamlet, a.suburb, a.county),
        country_code: a.country_code,
        label: d.display_name,
      });
    },
    async search(q, limit) {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=${limit}&addressdetails=1&email=${encodeURIComponent(CONTACT)}`;
      const rows = await getJSON(url);
      return (Array.isArray(rows) ? rows : []).map((r) => {
        const a = r.address || {};
        return place(r.lat, r.lon, {
          city: firstOf(a.city, a.town, a.village, a.hamlet, a.county, (r.display_name || '').split(',')[0]),
          country_code: a.country_code,
          label: r.display_name,
        });
      });
    },
  },

  mapbox: {
    async reverse(lat, lon) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=place&access_token=${API_KEY}`;
      const d = await getJSON(url);
      const f = (d.features || [])[0] || {};
      const country = (f.context || []).find((c) => String(c.id).startsWith('country'));
      return place(lat, lon, {
        city: f.text || '',
        country_code: country?.short_code,
        label: f.place_name,
      });
    },
    async search(q, limit) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?types=place,locality,postcode&limit=${limit}&access_token=${API_KEY}`;
      const d = await getJSON(url);
      return (d.features || []).map((f) => {
        const country = (f.context || []).find((c) => String(c.id).startsWith('country'));
        return place(f.center[1], f.center[0], {
          city: f.text,
          country_code: country?.short_code,
          label: f.place_name,
        });
      });
    },
  },

  geoapify: {
    async reverse(lat, lon) {
      const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&type=city&format=json&apiKey=${API_KEY}`;
      const d = await getJSON(url);
      const r = (d.results || [])[0] || {};
      return place(lat, lon, { city: firstOf(r.city, r.county), country_code: r.country_code, label: r.formatted });
    },
    async search(q, limit) {
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(q)}&limit=${limit}&format=json&apiKey=${API_KEY}`;
      const d = await getJSON(url);
      return (d.results || []).map((r) =>
        place(r.lat, r.lon, { city: firstOf(r.city, r.county), country_code: r.country_code, label: r.formatted })
      );
    },
  },

  // Google's Geocoding API. Both directions return the same shape: a list of
  // results, each with address_components typed by kind. City is the
  // "locality" component, falling back to the wider administrative areas for
  // places that are not incorporated as one.
  google: {
    async reverse(lat, lon) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&result_type=locality|postal_town|administrative_area_level_2&key=${API_KEY}`;
      const d = await getJSON(url);
      googleStatus(d);
      const r = (d.results || [])[0];
      if (!r) return place(lat, lon);
      const c = googleComponents(r);
      return place(lat, lon, { city: c.city, country_code: c.country_code, label: r.formatted_address });
    },
    async search(q, limit) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${API_KEY}`;
      const d = await getJSON(url);
      googleStatus(d);
      return (d.results || []).slice(0, limit).map((r) => {
        const c = googleComponents(r);
        return place(r.geometry.location.lat, r.geometry.location.lng, {
          city: c.city || (r.formatted_address || '').split(',')[0],
          country_code: c.country_code,
          label: r.formatted_address,
        });
      });
    },
  },

  locationiq: {
    async reverse(lat, lon) {
      const url = `https://us1.locationiq.com/v1/reverse?key=${API_KEY}&lat=${lat}&lon=${lon}&format=json&normalizecity=1`;
      const d = await getJSON(url);
      const a = d.address || {};
      return place(lat, lon, {
        city: firstOf(a.city, a.town, a.village, a.county),
        country_code: a.country_code,
        label: d.display_name,
      });
    },
    async search(q, limit) {
      const url = `https://us1.locationiq.com/v1/search?key=${API_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&format=json&normalizecity=1&addressdetails=1`;
      const rows = await getJSON(url);
      return (Array.isArray(rows) ? rows : []).map((r) => {
        const a = r.address || {};
        return place(r.lat, r.lon, {
          city: firstOf(a.city, a.town, a.village, a.county, (r.display_name || '').split(',')[0]),
          country_code: a.country_code,
          label: r.display_name,
        });
      });
    },
  },
};

// Whether an external provider can actually be called. Nominatim counts as
// unusable in production: it answers 403 for traffic it cannot attribute, so
// treating it as available only produced errors.
function providerUsable() {
  const provider = providers[PROVIDER];
  if (!provider) return false;
  if (PROVIDER === 'nominatim') return process.env.NODE_ENV !== 'production';
  return Boolean(API_KEY);
}

function activeProvider() {
  if (!providerUsable()) throw new GeoError(LOCATION_UNAVAILABLE, 503);
  return providers[PROVIDER];
}

// The curated list of communities, in the shape the rest of the app expects.
const fromPlace = (p) => ({
  latitude: p.latitude,
  longitude: p.longitude,
  city: p.city,
  country_code: p.country_code,
  timezone: tzFor(p.latitude, p.longitude),
  label: placeLabel(p),
  source: 'klal',
});

// ---- public API -------------------------------------------------------------

const isFiniteNum = (n) => Number.isFinite(Number(n));

export async function reverseGeocode(lat, lon) {
  if (!isFiniteNum(lat) || !isFiniteNum(lon)) throw new GeoError('Invalid coordinates.', 400);
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new GeoError('Coordinates out of range.', 400);
  }

  // A community we already know is a better answer than a provider's, and it
  // needs no key: "Lakewood, NJ" rather than whichever township the point
  // technically falls in.
  const known = nearestPlace(latitude, longitude);
  if (known) return { ...fromPlace(known), latitude, longitude, timezone: tzFor(latitude, longitude) };
  if (!providerUsable()) {
    // No provider and nowhere we recognise — but the time zone comes from the
    // coordinates offline, and that is the part zmanim need. An unnamed
    // location with the right zone beats an error that leaves the app with no
    // candle-lighting time at all.
    const timezone = tzFor(latitude, longitude);
    if (timezone) return { latitude, longitude, city: '', country_code: '', timezone, label: '', source: 'coordinates' };
    throw new GeoError(LOCATION_UNAVAILABLE, 503);
  }

  // ~1km precision: enough to name a neighbourhood, and it collapses the many
  // near-identical lookups a moving device produces into one cache entry. It
  // also means we never persist a user's exact position as a cache key.
  const key = `rev:${PROVIDER}:${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const hit = await geoCache.get(key);
  // Coordinates are the caller's own; only the place name is cached.
  if (hit) return { ...hit, latitude, longitude, timezone: tzFor(latitude, longitude) };

  const result = await call(() => activeProvider().reverse(latitude, longitude));
  await geoCache.set(key, { city: result.city, country_code: result.country_code, label: result.label }, REVERSE_TTL);
  return result;
}

export async function searchPlaces(query, limit = 8) {
  const q = String(query || '').trim();
  if (q.length < 2) throw new GeoError('Enter at least two characters.', 400);
  const capped = Math.min(Math.max(Number(limit) || 8, 1), 10);

  // The communities Klal serves answer first, instantly and without a key.
  // A provider only sees what is left — a street address, a town nobody
  // listed — and if there is no usable provider, the known places are still
  // an answer rather than a 503.
  const local = findPlaces(q, capped).map(fromPlace);
  if (local.length >= capped || !providerUsable()) {
    if (local.length) return local;
    throw new GeoError(LOCATION_UNAVAILABLE, 503);
  }

  const key = `search:${PROVIDER}:${capped}:${q.toLowerCase()}`;
  const hit = await geoCache.get(key);
  if (hit) return dedupePlaces([...local, ...hit], capped);

  const results = await call(() => activeProvider().search(q, capped - local.length));
  await geoCache.set(key, results, SEARCH_TTL);
  return dedupePlaces([...local, ...results], capped);
}

// A provider will often return the same city the curated list already gave.
// Coordinates within ~10km of one already listed are the same place.
function dedupePlaces(rows, limit) {
  const out = [];
  for (const r of rows) {
    if (out.some((k) => distanceKm(k.latitude, k.longitude, r.latitude, r.longitude) < 10)) continue;
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

// ---- IP fallback ------------------------------------------------------------

// Used only when the browser's geolocation is unavailable or denied. Runs
// server-side so the user's IP is not handed to a third party by their own
// browser, and so results are cached per network rather than per page load.
const IP_ENDPOINT = process.env.KC_IPGEO_URL || 'https://ipapi.co/{ip}/json/';

export async function geolocateIp(ip) {
  const clean = String(ip || '').replace(/^::ffff:/, '');
  // Loopback and private ranges have no public location; say so rather than
  // returning whatever the provider guesses for our own server.
  if (!clean || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd)/i.test(clean)) {
    return null;
  }

  const key = `ip:${clean}`;
  const hit = await geoCache.get(key);
  if (hit) return hit;

  const d = await getJSON(IP_ENDPOINT.replace('{ip}', encodeURIComponent(clean)));
  if (d?.latitude == null || d?.longitude == null) return null;
  const result = place(d.latitude, d.longitude, {
    city: d.city,
    country_code: d.country_code || d.country,
    label: d.city,
  });
  return await geoCache.set(key, result, IP_TTL);
}

export { GeoError, PROVIDER };
