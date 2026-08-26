// The gate must never resolve to "open" unless we positively know it is open.
// Every case below is a way the UI could otherwise show an unlocked app during
// Shabbos, which is the failure this feature exists to prevent.
import { shabbosState } from '../lib/shabbosState.js';

const FRI = Date.parse('2026-08-28T23:16:00Z'); // candle lighting
const SAT = Date.parse('2026-08-30T00:23:00Z'); // havdalah
const win = { startsAt: FRI, endsAt: SAT, cityLabel: 'Lakewood', tzid: 'America/New_York' };

let fails = 0;
const t = (label, got, want) => {
  const ok = got === want;
  if (!ok) fails++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label} -> ${got}${ok ? '' : ` (want ${want})`}`);
};

console.log('\nfail-closed cases:');
t('no status at all',            shabbosState(null),                                    'unknown');
t('undefined status',            shabbosState(undefined),                               'unknown');
t('past the known window',       shabbosState(win, SAT + 60_000),                       'unknown');
t('boundaries missing entirely', shabbosState({ isRestricted: true }),                  'restricted');

console.log('\nwindow boundaries:');
t('one ms before candles',       shabbosState(win, FRI - 1),                            'open');
t('exactly candle lighting',     shabbosState(win, FRI),                                'restricted');
t('shabbos morning',             shabbosState(win, Date.parse('2026-08-29T14:00:00Z')), 'restricted');
t('one ms before havdalah',      shabbosState(win, SAT - 1),                            'restricted');
t('exactly havdalah',            shabbosState(win, SAT),                                'unknown');

console.log('\npass-through cases:');
t('admin override',              shabbosState({ ...win, adminOverride: true }, FRI + 1), 'open');
t('no location set',             shabbosState({ hasLocation: false }),                   'no-location');
t('stale boolean is ignored',    shabbosState({ ...win, isRestricted: false }, FRI + 1), 'restricted');
t('stale boolean cannot unlock', shabbosState({ ...win, isRestricted: false }, SAT + 1), 'unknown');

console.log(fails ? `\n${fails} FAILURE(S)` : '\nshabbos gate fails closed in every case');
process.exit(fails ? 1 : 0);
