import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';

// The pre-launch dashboard: what is stuck, what is claimed but unchecked,
// where the directory is too thin, and what people searched for and did not
// find. Every row links to the thing it is about where that makes sense.
const LINK = {
  unverified: (it) => `/profile/${it.id}`,
  location_mismatch: (it) => `/profile/${it.id}`,
  no_zmanim: (it) => `/profile/${it.id}`,
  unconfirmed_badges: (it) => `/provider/${it.id}`,
  without_vouch: (it) => `/provider/${it.id}`,
};

const describe = (key, it) => {
  switch (key) {
    case 'unverified': return `${it.name || it.email} — ${it.email}`;
    case 'location_mismatch': return `${it.name}: profile ${it.profile_city}, zmanim ${it.zmanim_city}${it.timezone ? ` (${it.timezone})` : ''}`;
    case 'no_zmanim': return `${it.name}${it.profile_city ? ` — profile city ${it.profile_city}` : ' — no city either'}${it.suggested ? `, network suggests ${it.suggested}` : ''}`;
    case 'unconfirmed_badges': return `${it.name}${it.city ? `, ${it.city}` : ''} — claims “${it.badge}”`;
    case 'without_vouch': return `${it.name}${it.city ? `, ${it.city}` : ''}${it.category ? ` · ${it.category}` : ''}`;
    case 'duplicates': return `${it.name}${it.city ? `, ${it.city}` : ''} — ${it.ids.length} listings`;
    case 'thin_cities': return `${it.city}: ${it.count} listing${it.count === 1 ? '' : 's'}, ${it.needed} more for a useful first search`;
    case 'empty_searches': return `“${it.term}” — ${it.times} time${it.times === 1 ? '' : 's'}`;
    default: return JSON.stringify(it);
  }
};

export default function HealthPanel() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true); setErr('');
    try { setData(await api.admin.health()); }
    catch (e) { setErr(e.message || 'Could not load'); }
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  if (!data && !err) return <div className="panel"><p className="helper">Checking…</p></div>;
  const t = data?.totals;

  return <div className="space-y-4">
    <div className="panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Health</h2>
          <p className="helper mt-1">Everything that needs a person, in one place.</p>
        </div>
        <button onClick={load} disabled={busy} className="secondary py-1.5 text-xs"><RefreshCw size={14} className={busy ? 'animate-spin' : ''} />Refresh</button>
      </div>
      {err && <p className="mt-3 text-sm font-semibold text-brand-error">{err}</p>}
      {t && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[['Members', t.members], ['Listings', t.listings_published], ['Awaiting review', t.listings_pending], ['Vouches', t.vouches], ['Listings vouched', t.listings_with_a_vouch]].map(([label, n]) => (
          <div key={label} className="rounded-2xl bg-brand-tint p-3 text-center">
            <p className="text-2xl font-bold text-brand-ink">{n}</p>
            <p className="text-xs font-semibold text-brand-body">{label}</p>
          </div>
        ))}
      </div>}
    </div>

    {(data?.checks || []).map((c) => (
      <section key={c.key} className="panel">
        <div className="flex items-start gap-3">
          {c.count === 0
            ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-success" />
            : <AlertTriangle size={18} className="mt-0.5 shrink-0 text-brand-gold-ink" />}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-brand-ink">{c.label} <span className="ml-1 text-brand-muted">{c.count}</span></h3>
            <p className="helper mt-0.5">{c.hint}</p>
            {c.items.length > 0 && <ul className="mt-3 space-y-1.5 text-sm text-brand-body">
              {c.items.map((it, i) => {
                const to = LINK[c.key]?.(it);
                const text = describe(c.key, it);
                return <li key={i} className="border-b border-brand-line pb-1.5 last:border-0">
                  {to ? <Link to={to} className="hover:text-brand-teal hover:underline">{text}</Link> : text}
                </li>;
              })}
              {c.count > c.items.length && <li className="text-xs text-brand-muted">…and {c.count - c.items.length} more</li>}
            </ul>}
          </div>
        </div>
      </section>
    ))}
  </div>;
}
