// Shabbos / Yom Tov status.
//
// These times gate whether the app accepts writes, so they have to be right.
// Zmanim, the Hebrew calendar, parsha and Israel-vs-diaspora yom tov lengths
// all come from @hebcal/core rather than hand-rolled sunset math.
import { HebrewCalendar, Location, CandleLightingEvent, HavdalahEvent, flags } from '@hebcal/core';
import { store } from './db.js';

const DAY = 86_400_000;

// The global override is read on every status call and changes about once a
// year, so a short cache removes a database round trip from the hottest path
// while still letting an admin's change take effect promptly.
const OVERRIDE_TTL_MS = Number(process.env.KC_SHABBOS_OVERRIDE_TTL_MS || 30_000);
let overrideCache = { value: false, readAt: 0 };

async function readGlobalOverride() {
  const now = Date.now();
  if (now - overrideCache.readAt < OVERRIDE_TTL_MS) return overrideCache.value;
  const value = (await store.filter('Setting', { key: 'shabbos_global_override' }))[0]?.value === 'true';
  overrideCache = { value, readAt: now };
  return value;
}

function locationFor(profile) {
  const { latitude, longitude, timezone, city, country_code } = profile;
  if (latitude == null || longitude == null) return null;
  const isIsrael = String(country_code || '').toUpperCase() === 'IL';
  // A tzid is required for correct local candle-lighting times; fall back to
  // the host's zone rather than silently computing UTC times.
  const tzid = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  try {
    return new Location(Number(latitude), Number(longitude), isIsrael, tzid, city || 'Your location', country_code || undefined);
  } catch {
    return null;
  }
}

// havdalah_method is stored as a string: minutes after sunset ("50", "72") or
// degrees below the horizon when it ends in "deg" (e.g. "8.5deg").
function havdalahOptions(method) {
  const raw = String(method ?? '50').trim();
  if (raw.endsWith('deg')) {
    const deg = parseFloat(raw);
    if (Number.isFinite(deg)) return { havdalahDeg: deg };
  }
  const mins = parseFloat(raw);
  return Number.isFinite(mins) ? { havdalahMins: mins } : { havdalahMins: 50 };
}

/**
 * @param profile user-ish object: latitude, longitude, timezone, city,
 *   country_code, candle_lighting_offset_minutes, havdalah_method,
 *   shabbos_read_only, admin_override
 * @param now epoch ms
 */
export async function computeShabbosStatus(profile = {}, now = Date.now()) {
  const globalOverride = await readGlobalOverride();

  if (globalOverride || profile.admin_override) {
    return { adminOverride: true, isRestricted: false, hasLocation: true };
  }

  const location = locationFor(profile);
  if (!location) return { hasLocation: false, isRestricted: false, adminOverride: false };

  const candleMins = profile.candle_lighting_offset_minutes;
  const events = HebrewCalendar.calendar({
    start: new Date(now - 3 * DAY),
    end: new Date(now + 10 * DAY),
    location,
    il: location.getIsrael(),
    candlelighting: true,
    sedrot: true,
    ...(candleMins != null && Number.isFinite(Number(candleMins))
      ? { candleLightingMins: Number(candleMins) }
      : {}),
    ...havdalahOptions(profile.havdalah_method),
  });

  // Reduce to an ordered list of boundary times: candle lighting opens a
  // restricted window, havdalah closes it. Match on the event classes rather
  // than flag masks — hebcal reuses mask 32 for both Havdalah and
  // light-candles-after-tzeis, so the masks can't tell them apart.
  const boundaries = events
    .filter((e) => e.eventTime && (e instanceof CandleLightingEvent || e instanceof HavdalahEvent))
    .map((e) => ({
      time: e.eventTime.getTime(),
      opens: e instanceof CandleLightingEvent,
      desc: e.render('en'),
    }))
    .sort((a, b) => a.time - b.time);

  let startsAt = null;
  let endsAt = null;
  let isRestricted = false;

  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    if (!b.opens) continue;
    const close = boundaries.slice(i + 1).find((x) => !x.opens);
    if (!close) continue;
    if (now >= b.time && now < close.time) {
      isRestricted = true;
      startsAt = b.time;
      endsAt = close.time;
      break;
    }
  }

  // Next boundary the UI can count down to.
  const upcoming = boundaries.find((b) => b.time > now);
  const nextChange = isRestricted ? endsAt : upcoming?.time ?? null;

  if (!isRestricted && upcoming?.opens) {
    startsAt = upcoming.time;
    endsAt = boundaries.find((x) => x.time > upcoming.time && !x.opens)?.time ?? null;
  }

  // Parsha for the Shabbos inside (or nearest ahead of) the current window.
  const anchor = startsAt ?? now;
  const parshaEvent = events
    .filter((e) => e.getFlags() & flags.PARSHA_HASHAVUA)
    .find((e) => Math.abs(e.getDate().greg().getTime() - anchor) < 2 * DAY);

  return {
    hasLocation: true,
    adminOverride: false,
    isRestricted,
    // Read-only unless the user has explicitly asked for a full lock. Reading is
    // not melacha, and a hard lock on a community directory is worst exactly
    // when it matters most — someone looking up a doctor or the medical
    // equipment gemach on Shabbos. The write-gate is what this feature is for.
    readOnly: profile.shabbos_full_lock !== true,
    startsAt,
    endsAt,
    nextChange,
    cityLabel: location.getName() || profile.city || 'Your location',
    tzid: location.getTzid(),
    parsha: parshaEvent ? parshaEvent.render('en') : null,
    isInIsrael: location.getIsrael(),
  };
}

// Write-gate used by the mutating functions: during Shabbos/Yom Tov the server
// refuses writes, so a client clock or a stale tab can't slip one through.
export async function assertWritable(profile, now = Date.now()) {
  const status = await computeShabbosStatus(profile, now);
  if (status.isRestricted) {
    const err = new Error('This action is unavailable during Shabbos and Yom Tov.');
    err.statusCode = 423;
    throw err;
  }
}
