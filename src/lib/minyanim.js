// Minyan times on a shul's listing, and which one is next.
//
// There is no feed to pull these from: GoDaven has no public one and every
// shul's own site is laid out differently. So whoever adds or edits the shul
// types the schedule in, and the page works out the next minyan from it. A
// time can be fixed ("Shacharis 7:00") or tied to the sun ("Mincha 15 minutes
// before shkiya"), because that is how most shuls set Mincha and Maariv and a
// fixed time would be wrong within a few weeks.
//
// Shared by the server (to shape what is saved) and the browser (to draw it),
// so nothing here may import from server/.
import { Location, Zmanim } from '@hebcal/core';

export const TEFILLOS = ['Shacharis', 'Mincha', 'Maariv', 'Mincha & Maariv'];

// Sunday is 0, Shabbos is 6 — the same numbering as Date#getUTCDay.
export const DAY_SETS = {
  daily: { short: 'Every day', label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
  sun_fri: { short: 'Sun–Fri', label: 'Sunday to Friday', days: [0, 1, 2, 3, 4, 5] },
  sun_thu: { short: 'Sun–Thu', label: 'Sunday to Thursday', days: [0, 1, 2, 3, 4] },
  mon_fri: { short: 'Mon–Fri', label: 'Monday to Friday', days: [1, 2, 3, 4, 5] },
  mon_thu: { short: 'Mon–Thu', label: 'Monday to Thursday', days: [1, 2, 3, 4] },
  sun: { short: 'Sunday', label: 'Sunday', days: [0] },
  fri: { short: 'Friday', label: 'Friday (Erev Shabbos)', days: [5] },
  shabbos: { short: 'Shabbos', label: 'Shabbos', days: [6] },
};

// `clock` is a fixed time; `sunset` and `sunrise` are minutes from shkiya or
// netz, negative for before.
export const ANCHORS = {
  clock: 'Set time',
  sunset_before: 'Before shkiya',
  sunset_after: 'After shkiya',
  sunrise: 'At netz',
};

export const MINYANIM_MAX = 30;

const SHUL_WORDS = /^(shul|shuls|synagogue|synagogues|shul\s*\/\s*synagogue|minyanim|botei medrash)$/i;
export function isShulListing(row) {
  if (!row) return false;
  return row.category === 'Shuls & Minyanim' || SHUL_WORDS.test(String(row.category || '').trim()) || SHUL_WORDS.test(String(row.subcategory || '').trim());
}

function refuse(message) {
  const err = new Error(message);
  err.statusCode = 400;
  throw err;
}

const CLOCK = /^([01]?\d|2[0-3]):([0-5]\d)$/;

// What is stored for one minyan: { tefillah, days, anchor, time?, minutes?, note? }.
export function normalizeMinyanim(raw) {
  if (raw === null || raw === undefined || raw === '') return [];
  if (!Array.isArray(raw)) refuse('Minyan times must be a list.');
  if (raw.length > MINYANIM_MAX) refuse(`A shul can list up to ${MINYANIM_MAX} minyanim.`);
  return raw.map((m) => {
    if (!m || typeof m !== 'object') refuse('Each minyan needs a tefillah, days and a time.');
    const tefillah = String(m.tefillah || '').trim();
    if (!TEFILLOS.includes(tefillah)) refuse('Pick Shacharis, Mincha or Maariv for each minyan.');
    const days = String(m.days || '');
    if (!Object.hasOwn(DAY_SETS, days)) refuse(`Pick which days the ${tefillah} minyan is on.`);
    const anchor = String(m.anchor || '');
    if (!Object.hasOwn(ANCHORS, anchor)) refuse(`Say when the ${tefillah} minyan is.`);
    const note = String(m.note || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const out = { tefillah, days, anchor };
    if (anchor === 'clock') {
      const time = String(m.time || '').trim();
      if (!CLOCK.test(time)) refuse(`Enter a time for the ${tefillah} minyan.`);
      out.time = time.padStart(5, '0');
    } else if (anchor !== 'sunrise') {
      const minutes = Number(m.minutes);
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 120) refuse(`Enter how many minutes (0 to 120) for the ${tefillah} minyan.`);
      out.minutes = minutes;
    }
    if (note) out.note = note;
    return out;
  });
}

// --------------------------------------------------------------- timing --

// Milliseconds the zone is ahead of UTC at a moment.
function zoneOffset(ms, tzid) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tzid, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

// A wall-clock time in a zone, as a moment.
function zonedTime(y, m, d, hour, minute, tzid) {
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  const first = guess - zoneOffset(guess, tzid);
  return guess - zoneOffset(first, tzid);
}

function todayIn(tzid, now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tzid, year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(new Date(now)).map((p) => [p.type, p.value]));
  return { y: +parts.year, m: +parts.month, d: +parts.day };
}

export function safeZone(tzid) {
  try { if (tzid) { new Intl.DateTimeFormat('en-US', { timeZone: tzid }); return tzid; } } catch { /* fall through */ }
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}

const hasCoords = (row) => Number.isFinite(Number(row?.latitude)) && Number.isFinite(Number(row?.longitude))
  && !(row.latitude === '' || row.longitude === '' || row.latitude == null || row.longitude == null);

/**
 * Every minyan from today through the next week, in order.
 * Times tied to the sun are skipped when the listing has no map pin, since
 * there is nothing to work shkiya out from.
 */
export function minyanOccurrences(row, { tzid, now = Date.now(), days = 8 } = {}) {
  const list = Array.isArray(row?.minyanim) ? row.minyanim : [];
  if (!list.length) return [];
  const zone = safeZone(tzid);
  const location = hasCoords(row) ? new Location(Number(row.latitude), Number(row.longitude), false, zone) : null;
  const start = todayIn(zone, now);
  const out = [];
  for (let k = 0; k < days; k++) {
    const date = new Date(Date.UTC(start.y, start.m - 1, start.d + k));
    const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate(), weekday = date.getUTCDay();
    let sun = null;
    const sunTimes = () => {
      if (!sun && location) {
        // Noon local to the viewer keeps the calendar date whatever their zone.
        const z = new Zmanim(location, new Date(y, m - 1, d, 12), false);
        sun = { sunrise: z.sunrise()?.getTime(), sunset: z.sunset()?.getTime() };
      }
      return sun;
    };
    for (const minyan of list) {
      if (!DAY_SETS[minyan.days]?.days.includes(weekday)) continue;
      let at = null;
      if (minyan.anchor === 'clock') {
        const [hh, mm] = String(minyan.time).split(':').map(Number);
        at = zonedTime(y, m, d, hh, mm, zone);
      } else {
        const s = sunTimes();
        if (!s) continue;
        if (minyan.anchor === 'sunrise') at = s.sunrise ? Math.ceil(s.sunrise / 60000) * 60000 : null;
        else if (s.sunset) {
          const offset = (minyan.anchor === 'sunset_before' ? -1 : 1) * Number(minyan.minutes || 0) * 60000;
          // Rounded down to the minute: early to Mincha is fine, late is not.
          at = Math.floor((s.sunset + offset) / 60000) * 60000;
        }
      }
      if (at) out.push({ tefillah: minyan.tefillah, note: minyan.note || '', at, dayIndex: k });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** The next minyan that has not started yet, or null. */
export function nextMinyan(row, opts = {}) {
  const now = opts.now ?? Date.now();
  return minyanOccurrences(row, { ...opts, now }).find((o) => o.at >= now) || null;
}

/** "Today", "Tomorrow" or the weekday, for the day a minyan falls on. */
export function dayWord(o, tzid) {
  if (o.dayIndex === 0) return 'Today';
  if (o.dayIndex === 1) return 'Tomorrow';
  const name = new Intl.DateTimeFormat('en-US', { timeZone: safeZone(tzid), weekday: 'long' }).format(new Date(o.at));
  return name === 'Saturday' ? 'Shabbos' : name;
}

export function clockIn(ms, tzid) {
  return new Intl.DateTimeFormat('en-US', { timeZone: safeZone(tzid), hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
}

/** "in 25 min", "in 1 hr 10 min", or '' when it is more than a few hours off. */
export function startsIn(ms, now = Date.now()) {
  const mins = Math.round((ms - now) / 60000);
  if (mins < 1) return 'starting now';
  if (mins < 60) return `in ${mins} min`;
  if (mins < 180) { const h = Math.floor(mins / 60), r = mins % 60; return `in ${h} hr${r ? ` ${r} min` : ''}`; }
  return '';
}

/** How a stored minyan reads in a list: "Mincha · 15 min before shkiya". */
export function describeMinyan(m) {
  if (m.anchor === 'clock') {
    const [hh, mm] = String(m.time).split(':').map(Number);
    return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
  }
  if (m.anchor === 'sunrise') return 'Netz (sunrise)';
  if (!m.minutes) return 'Shkiya';
  return `${m.minutes} min ${m.anchor === 'sunset_before' ? 'before' : 'after'} shkiya`;
}
