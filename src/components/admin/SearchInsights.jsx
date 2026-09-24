import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/api/client';
import { SearchX, MessageCircleQuestion, Search } from 'lucide-react';
import { timeAgo } from '@/lib/time';

// What the community asked for and did not find.
//
// The admin screen counted searches but never showed which ones came back
// empty, which is the only search statistic worth acting on: every row here is
// a listing this directory is missing, named by the person who wanted it. A
// total of "412 searches" tells nobody what to do on Monday morning.
//
// Everything is computed from the ActivityEvent rows the admin page already
// loads, so this adds no new writes and no new tracking.

// Group identical asks together. Query and city both matter — "plumber" in
// Boca Raton and "plumber" in Lakewood are two different gaps.
function group(events) {
  const rows = new Map();
  for (const e of events) {
    const query = String(e.query || '').trim().toLowerCase();
    const city = String(e.city || '').trim();
    if (!query && !e.category) continue;
    const key = `${query}|${city}|${e.category || ''}`;
    const row = rows.get(key) || { query: query || e.category, city, category: e.category || '', count: 0, last: 0 };
    row.count += 1;
    row.last = Math.max(row.last, Date.parse(e.created_date) || 0);
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.count - a.count || b.last - a.last);
}

export default function SearchInsights({ events = [] }) {
  const [asks, setAsks] = useState(null);

  // An ask nobody answered is the same signal arriving by another route.
  useEffect(() => {
    api.entities.FeedPost.filter({ post_type: 'question' }, '-created_date', 100)
      .then((rows) => setAsks(rows.filter((p) => !p.helpful_comment_id && !(p.comment_count > 0))))
      .catch(() => setAsks([]));
  }, []);

  const searches = useMemo(() => events.filter((e) => e.type === 'search'), [events]);
  const misses = useMemo(() => group(searches.filter((e) => e.zero_result)), [searches]);
  const hits = useMemo(() => group(searches.filter((e) => !e.zero_result)), [searches]);
  const missRate = searches.length ? Math.round((searches.filter((e) => e.zero_result).length / searches.length) * 100) : 0;

  return <div className="space-y-5">
    <div className="panel">
      <div className="flex items-center gap-2"><SearchX className="text-brand-gold-ink" size={19}/><h2 className="section-title">Searches that found nothing</h2></div>
      {/* Said out loud rather than implied: this is a window, not a total. */}
      <p className="helper">Every row is a listing somebody wanted and the directory did not have. Computed from the {events.length} most recent recorded events — {searches.length} of them searches, {missRate}% of which came back empty.</p>
      {misses.length === 0
        ? <p className="mt-3 text-sm text-brand-muted">No empty searches in this window.</p>
        : <div className="mt-4 divide-y">
          {misses.slice(0, 25).map((r) => <div key={`${r.query}|${r.city}|${r.category}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
            <span className="min-w-0">
              <strong className="text-brand-ink">{r.query || '(category browse)'}</strong>
              {r.city && <span className="text-sm text-brand-body"> in {r.city}</span>}
              {r.category && r.category !== r.query && <span className="text-xs text-brand-muted"> · {r.category}</span>}
            </span>
            <span className="flex items-center gap-3 text-sm">
              <span className="text-xs text-brand-muted">{r.last ? timeAgo(r.last) : ''}</span>
              <b className="text-brand-navy">{r.count}×</b>
              <a href={`/browse?q=${encodeURIComponent(r.query || '')}${r.city ? `&location=${encodeURIComponent(r.city)}` : ''}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-teal hover:underline">see it ↗</a>
            </span>
          </div>)}
        </div>}
    </div>

    <div className="panel">
      <div className="flex items-center gap-2"><MessageCircleQuestion className="text-brand-teal" size={19}/><h2 className="section-title">Asks nobody answered</h2></div>
      <p className="helper">The same gap arriving by another route. An answer here becomes a listing the next person finds.</p>
      {asks === null
        ? <p className="mt-3 text-sm text-brand-muted">Loading…</p>
        : asks.length === 0
          ? <p className="mt-3 text-sm text-brand-muted">Every ask has an answer.</p>
          : <div className="mt-4 divide-y">
            {asks.slice(0, 15).map((p) => <div key={p.id} className="py-2.5">
              <a href={`/feed?post=${encodeURIComponent(p.id)}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-teal hover:underline">{(p.body || '').slice(0, 110) || 'Untitled ask'}{(p.body || '').length > 110 ? '…' : ''} ↗</a>
              <p className="mt-0.5 text-xs text-brand-muted">{p.author_name || 'Community member'} · {timeAgo(p.created_date)}</p>
            </div>)}
          </div>}
    </div>

    <div className="panel">
      <div className="flex items-center gap-2"><Search className="text-brand-teal" size={19}/><h2 className="section-title">Searches that worked</h2></div>
      <p className="helper">What the directory is already good for — worth knowing before deciding what to grow.</p>
      {hits.length === 0
        ? <p className="mt-3 text-sm text-brand-muted">No successful searches in this window.</p>
        : <div className="mt-3 flex flex-wrap gap-2">
          {hits.slice(0, 20).map((r) => <span key={`${r.query}|${r.city}`} className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand-teal">
            {r.query || '(category)'}{r.city && <span className="font-normal text-brand-body">· {r.city}</span>}<b className="text-brand-navy">{r.count}</b>
          </span>)}
        </div>}
    </div>
  </div>;
}
