// Exercises each geocoder adapter against a recorded response shape, so the
// four we cannot hit live (no API key) are still known to parse correctly.
const FIXTURES = {
  mapbox: {
    reverse: { features: [{ text: 'Lakewood', place_name: 'Lakewood, New Jersey, United States',
      context: [{ id: 'region.1', short_code: 'US-NJ' }, { id: 'country.2', short_code: 'us' }] }] },
    search: { features: [{ text: 'Lakewood', place_name: 'Lakewood, New Jersey, United States',
      center: [-74.2179, 40.0959], context: [{ id: 'country.2', short_code: 'us' }] }] },
  },
  geoapify: {
    reverse: { results: [{ city: 'Lakewood', county: 'Ocean County', country_code: 'us', formatted: 'Lakewood, NJ, USA' }] },
    search: { results: [{ city: 'Lakewood', county: 'Ocean County', country_code: 'us',
      formatted: 'Lakewood, NJ, USA', lat: 40.0959, lon: -74.2179 }] },
  },
  locationiq: {
    reverse: { address: { city: 'Lakewood', country_code: 'us' }, display_name: 'Lakewood, Ocean County, NJ, USA' },
    search: [{ lat: '40.0959', lon: '-74.2179', display_name: 'Lakewood, Ocean County, NJ, USA',
      address: { city: 'Lakewood', country_code: 'us' } }],
  },
  google: {
    reverse: { status: 'OK', results: [{ formatted_address: 'Lakewood, NJ, USA',
      address_components: [
        { long_name: 'Lakewood', short_name: 'Lakewood', types: ['locality', 'political'] },
        { long_name: 'Ocean County', short_name: 'Ocean County', types: ['administrative_area_level_2', 'political'] },
        { long_name: 'United States', short_name: 'US', types: ['country', 'political'] },
      ] }] },
    search: { status: 'OK', results: [{ formatted_address: 'Lakewood, NJ, USA',
      geometry: { location: { lat: 40.0959, lng: -74.2179 } },
      address_components: [
        { long_name: 'Lakewood', short_name: 'Lakewood', types: ['locality', 'political'] },
        { long_name: 'United States', short_name: 'US', types: ['country', 'political'] },
      ] }] },
  },
  nominatim: {
    reverse: { address: { town: 'Lakewood', country_code: 'us' }, display_name: 'Lakewood, Ocean County, NJ, USA' },
    search: [{ lat: '40.0959', lon: '-74.2179', display_name: 'Lakewood, Ocean County, NJ, USA',
      address: { city: 'Lakewood', country_code: 'us' } }],
  },
};

import { pathToFileURL } from 'node:url';
import path from 'node:path';
const GEO_URL = pathToFileURL(path.join(import.meta.dirname, 'geocode.js')).href;

let mode = 'reverse';
let provider = 'nominatim';
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => FIXTURES[provider][mode] });

let failures = 0;
const check = (label, cond, got) => {
  if (!cond) { failures++; console.log(`  FAIL ${label} -> ${JSON.stringify(got)}`); }
  else console.log(`  ok   ${label} -> ${JSON.stringify(got)}`);
};

for (const name of Object.keys(FIXTURES)) {
  provider = name;
  process.env.KC_GEOCODER = name;
  process.env.KC_GEOCODER_KEY = 'test-key';
  process.env.KC_GEOCODER_MIN_GAP_MS = '0';
  // Fresh module per provider: PROVIDER is read at import time.
  const mod = await import(`${GEO_URL}?v=${name}`);

  console.log(`\n${name}:`);
  mode = 'reverse';
  const rev = await mod.reverseGeocode(40.0959 + Math.random() * 0.0001, -74.2179);
  check('reverse city', rev.city === 'Lakewood', rev.city);
  check('reverse cc', rev.country_code === 'US', rev.country_code);
  check('reverse tz', rev.timezone === 'America/New_York', rev.timezone);

  mode = 'search';
  const res = await mod.searchPlaces(`Lakewood ${name}`, 3);
  const first = res[0] || {};
  check('search count', res.length === 1, res.length);
  check('search city', first.city === 'Lakewood', first.city);
  check('search cc', first.country_code === 'US', first.country_code);
  check('search lat', Math.abs(first.latitude - 40.0959) < 0.001, first.latitude);
  check('search lon', Math.abs(first.longitude + 74.2179) < 0.001, first.longitude);
  check('search tz', first.timezone === 'America/New_York', first.timezone);
  check('search label', typeof first.label === 'string' && first.label.length > 0, first.label);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall provider adapters parse correctly');
process.exit(failures ? 1 : 0);
