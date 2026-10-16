import React, { useEffect, useState } from 'react';
import { Clock, ExternalLink } from 'lucide-react';
import { api } from '@/api/client';
import { clockIn, dayWord, describeMinyan, isShulListing, minyanOccurrences, nextMinyan, safeZone, startsIn, DAY_SETS } from '@/lib/minyanim';

// Times on a shul page are the shul's times, read in the shul's own zone, not
// the visitor's: someone in Los Angeles checking a Lakewood shul wants 7:00
// meaning 7:00 in Lakewood. The zone comes from the map pin; without one the
// visitor's zone is the best guess there is.
const zoneCache = new Map();
function useShulZone(provider) {
  const lat = provider?.latitude, lon = provider?.longitude;
  const key = lat != null && lon != null && lat !== '' && lon !== '' ? `${lat},${lon}` : '';
  const [tz, setTz] = useState(() => (key ? zoneCache.get(key) : safeZone()) || '');
  useEffect(() => {
    if (!key) { setTz(safeZone()); return; }
    if (zoneCache.has(key)) { setTz(zoneCache.get(key)); return; }
    let alive = true;
    api.geo.tz(lat, lon)
      .then((r) => safeZone(r?.timezone))
      .catch(() => safeZone())
      .then((zone) => { zoneCache.set(key, zone); if (alive) setTz(zone); });
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return tz;
}

// Re-renders every half minute so "in 4 min" counts down and the line moves
// on to the next minyan once one starts, without a reload.
function useNow(ms = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

const hasSchedule = (p) => isShulListing(p) && Array.isArray(p?.minyanim) && p.minyanim.length > 0;

/** "Next minyan: Mincha · Today 6:02 PM · in 25 min", under a shul's name. */
export function NextMinyanLine({ provider }) {
  const tz = useShulZone(hasSchedule(provider) ? provider : null);
  const now = useNow();
  if (!hasSchedule(provider) || !tz) return null;
  const next = nextMinyan(provider, { tzid: tz, now });
  if (!next) return null;
  const soon = startsIn(next.at, now);
  return <p className="mt-2 flex w-fit max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-brand-tint px-3 py-1.5 text-sm text-brand-ink" aria-live="polite">
    <Clock size={16} className="shrink-0 text-brand-teal" aria-hidden="true"/>
    <span className="font-semibold">Next minyan:</span>
    <span>{next.tefillah}{next.note ? ` (${next.note})` : ''} · {dayWord(next, tz)} {clockIn(next.at, tz)}</span>
    {soon && <span className="font-semibold text-brand-teal">{soon}</span>}
  </p>;
}

/** The day's minyanim, the full weekly schedule, and the shul's own link. */
export function MinyanTimesPanel({ provider }) {
  const scheduled = hasSchedule(provider);
  const tz = useShulZone(scheduled ? provider : null);
  const now = useNow();
  if (!isShulListing(provider) || (!scheduled && !provider.minyan_url)) return null;
  const all = scheduled && tz ? minyanOccurrences(provider, { tzid: tz, now }) : [];
  // Today's list, or the next day that has any once today's are all past.
  const firstDay = all.find((o) => o.at >= now)?.dayIndex ?? 0;
  const day = all.filter((o) => o.dayIndex === firstDay);
  const sunTied = scheduled && provider.minyanim.some((m) => m.anchor !== 'clock');
  const unpinned = provider.latitude == null || provider.latitude === '';
  return <section className="panel">
    <h2 className="section-title">Minyan times</h2>
    {day.length > 0 && <>
      <p className="mt-3 text-sm font-semibold text-brand-muted">{dayWord(day[0], tz)}</p>
      <ul className="mt-2 divide-y divide-brand-line rounded-lg border border-brand-line">
        {day.map((o, i) => <li key={o.tefillah + o.at + i} className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${o.at < now ? 'text-brand-muted' : 'text-brand-ink'}`}>
          <span className="font-medium">{o.tefillah}{o.note ? <span className="font-normal text-brand-muted"> · {o.note}</span> : null}</span>
          <span className="tabular-nums">{clockIn(o.at, tz)}</span>
        </li>)}
      </ul>
    </>}
    {scheduled && <details className="mt-4 text-sm">
      <summary className="cursor-pointer font-semibold text-brand-teal">Weekly schedule</summary>
      <ul className="mt-2 space-y-1 text-brand-body">
        {provider.minyanim.map((m, i) => <li key={i}>
          <span className="font-medium text-brand-ink">{m.tefillah}</span> · {DAY_SETS[m.days]?.label} · {describeMinyan(m)}{m.note ? ` · ${m.note}` : ''}
        </li>)}
      </ul>
    </details>}
    {sunTied && unpinned && <p className="helper mt-3">Times set from shkiya appear once the listing has a map pin.</p>}
    {provider.minyan_url && <a href={provider.minyan_url} target="_blank" rel="noopener noreferrer" className="secondary mt-4 inline-flex items-center gap-2">
      Full schedule <ExternalLink size={15} aria-hidden="true"/>
    </a>}
    <p className="helper mt-3 text-xs">Times are added by the shul or the community and can change for Yom Tov, fast days and simchas. When it matters, check with the shul.</p>
  </section>;
}
