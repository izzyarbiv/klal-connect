import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { api } from '@/api/client';
import { markEngaged } from '@/lib/engagement';
import { isSensitiveListing } from '@/lib/sensitivity';

// A heart on a listing, and how many it has. Who gave one is private (the rows
// are owner-scoped, like "used them"); only the count is public. Not on a
// sensitive listing, where even a count says something about the members.
export default function HeartButton({ provider, onCount }) {
  const [hearted, setHearted] = useState(false);
  const [count, setCount] = useState(provider.heart_count || 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const sensitive = isSensitiveListing(provider);

  useEffect(() => { setCount(provider.heart_count || 0); }, [provider.heart_count]);
  useEffect(() => {
    if (sensitive) return undefined;
    let alive = true;
    (async () => {
      try {
        if (!await api.auth.hasAccount()) return;
        const user = await api.auth.me();
        const rows = await api.entities.ProviderHeart.filter({ provider_id: provider.id, created_by_id: user.id });
        if (alive) setHearted(rows.length > 0);
      } catch { /* signed out, or the lookup failed: shows as not hearted */ }
    })();
    return () => { alive = false; };
  }, [provider.id, sensitive]);

  if (sensitive) return null;

  const toggle = async () => {
    setErr('');
    setBusy(true);
    try {
      if (!await api.auth.requireAccount()) return;
      const r = await api.functions.invoke('toggleCommunityActivity', { providerId: provider.id, activity: 'heart' });
      if (r.status >= 400) throw new Error(r.data?.error || 'That did not go through. Please try again.');
      markEngaged();
      setHearted(r.data.active);
      setCount(r.data.count);
      onCount?.(r.data.count);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return <span className="inline-flex flex-col">
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={hearted}
      aria-label={hearted ? `Remove your heart (${count})` : `Give a heart (${count})`}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition active:scale-95 disabled:opacity-60 ${hearted ? 'bg-brand-error/10 text-brand-error ring-brand-error/40' : 'bg-brand-surface text-brand-body ring-brand-line hover:text-brand-error hover:ring-brand-error/40'}`}>
      <Heart size={16} className={hearted ? 'fill-current' : ''}/>
      <span className="tabular-nums">{count.toLocaleString()}</span>
      <span className="sr-only">{count === 1 ? 'heart' : 'hearts'}</span>
    </button>
    {err && <span className="mt-1 text-xs font-semibold text-brand-error">{err}</span>}
  </span>;
}
