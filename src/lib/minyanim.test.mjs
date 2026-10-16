// The next-minyan line on a shul page: zones, shkiya offsets and day sets.
import assert from 'node:assert/strict';
import { minyanOccurrences, nextMinyan, normalizeMinyanim, dayWord, clockIn } from './minyanim.js';

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log(`  ok   ${name}`); };
const tz = 'America/New_York';
const lakewood = { latitude: 40.0821, longitude: -74.2097, minyanim: normalizeMinyanim([
  { tefillah: 'Shacharis', days: 'sun_fri', anchor: 'clock', time: '7:00' },
  { tefillah: 'Shacharis', days: 'shabbos', anchor: 'clock', time: '09:00' },
  { tefillah: 'Mincha', days: 'sun_thu', anchor: 'sunset_before', minutes: 15 },
  { tefillah: 'Maariv', days: 'daily', anchor: 'sunset_after', minutes: 30 },
]) };

ok('a fixed time is read in the shul\'s zone, not the viewer\'s', () => {
  // Thursday 15 Oct 2026, 11:29 PM in Lakewood.
  const n = nextMinyan(lakewood, { tzid: tz, now: Date.parse('2026-10-16T03:29:45Z') });
  assert.equal(n.tefillah, 'Shacharis');
  assert.equal(dayWord(n, tz), 'Tomorrow');
  assert.equal(clockIn(n.at, tz), '7:00 AM');
});

ok('Mincha before shkiya follows the sun and rounds down', () => {
  const day = minyanOccurrences(lakewood, { tzid: tz, now: Date.parse('2026-10-15T16:00:00Z'), days: 1 });
  const mincha = day.find((o) => o.tefillah === 'Mincha');
  assert.equal(clockIn(mincha.at, tz), '6:02 PM');
});

ok('day sets skip the days they leave out, and Shabbos is called Shabbos', () => {
  const week = minyanOccurrences(lakewood, { tzid: tz, now: Date.parse('2026-10-15T16:00:00Z') });
  const shabbos = week.filter((o) => dayWord(o, tz) === 'Shabbos');
  assert.deepEqual(shabbos.map((o) => o.tefillah), ['Shacharis', 'Maariv']);
});

ok('without a map pin, only fixed times are offered', () => {
  const week = minyanOccurrences({ minyanim: lakewood.minyanim }, { tzid: tz, now: Date.parse('2026-10-15T16:00:00Z') });
  assert.ok(week.length > 0 && week.every((o) => o.tefillah === 'Shacharis'));
});

ok('a malformed schedule is refused with a reason', () => {
  assert.throws(() => normalizeMinyanim([{ tefillah: 'Mincha', days: 'sun_thu', anchor: 'clock', time: '25:00' }]), /Enter a time/);
  assert.throws(() => normalizeMinyanim([{ tefillah: 'Musaf?', days: 'daily', anchor: 'sunrise' }]), /Pick Shacharis/);
  assert.throws(() => normalizeMinyanim('7am'), /must be a list/);
  assert.deepEqual(normalizeMinyanim([{ tefillah: 'Maariv', days: 'daily', anchor: 'sunset_after', minutes: 0, extra: 'x' }]),
    [{ tefillah: 'Maariv', days: 'daily', anchor: 'sunset_after', minutes: 0 }]);
});

console.log(`\nminyan checks: ${passed} passed`);
