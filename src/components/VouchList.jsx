import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Handshake } from 'lucide-react';
import { api } from '@/api/client';
import { loadMyConnections, connectedIds } from '@/lib/connections';
import { isSensitiveListing } from '@/lib/sensitivity';

// "Vouched for by …" on a listing. Names are public (a vouch is a statement,
// not a bookmark); the "you know" count only appears for a signed-in member
// with connections, and never names who.
export default function VouchList({ provider, refreshKey }) {
  const [vouches, setVouches] = useState(null);
  const [known, setKnown] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = await api.entities.Vouch.filter({ provider_id: provider.id }, '-created_date', 200).catch(() => []);
      if (!alive) return;
      setVouches(rows);
      try {
        if (await api.auth.hasAccount()) {
          const me = await api.auth.me();
          const ids = connectedIds(await loadMyConnections(me.id));
          setKnown(rows.filter((v) => ids.has(v.created_by_id)).length);
        }
      } catch { /* counts stay at zero */ }
    })();
    return () => { alive = false; };
  }, [provider.id, refreshKey]);

  // This section names people. On a sensitive listing it would publish who
  // needed that service, so it does not exist there at all.
  if (isSensitiveListing(provider)) return null;
  if (!vouches) return null;
  const shown = vouches.slice(0, 8);
  const more = vouches.length - shown.length;
  return <section className="panel">
    <div className="flex items-center gap-2"><Handshake className="text-brand-gold-ink" size={20}/><h2 className="section-title">Vouched for by {vouches.length} {vouches.length === 1 ? 'member' : 'members'}</h2></div>
    {known > 0 && <p className="mt-1 text-sm font-semibold text-brand-teal">{known} {known === 1 ? 'person' : 'people'} you know</p>}
    {vouches.length === 0
      ? <p className="helper">No vouches yet. If you have used {provider.name} and would send a friend there, be the first.</p>
      : <div className="mt-3 flex flex-wrap gap-2">
          {shown.map((v) => <Link key={v.id} to={`/profile/${v.created_by_id}`} className="inline-flex items-center gap-2 rounded-full bg-brand-tint py-1 pl-1 pr-3 text-sm font-medium text-brand-ink hover:bg-brand-gold-bg"><span className="grid h-6 w-6 place-items-center rounded-full bg-brand-surface text-[10px] font-bold text-brand-teal">{(v.author_name || '?').split(' ').map((x) => x[0]).slice(0, 2).join('')}</span>{v.author_name || 'Community member'}</Link>)}
          {more > 0 && <span className="inline-flex items-center rounded-full px-3 py-1 text-sm text-brand-muted">+{more} more</span>}
        </div>}
  </section>;
}
