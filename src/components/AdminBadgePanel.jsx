import React, { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { api } from '@/api/client';
import { BADGES } from '@/lib/badges';

// Admin-only: confirm (or withdraw) the badges a listing declared, and mark
// the listing itself verified. Writes go through the entity route, which
// only lets an admin touch these fields.
export default function AdminBadgePanel({ provider, onChange }) {
  const [me, setMe] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.auth.hasAccount().then(async (ok) => { if (ok) setMe(await api.auth.me()); }).catch(() => {}); }, []);
  if (me?.role !== 'admin') return null;

  const declared = BADGES.filter((b) => (provider.badges || []).includes(b.id));
  const verified = new Set(provider.verified_badges || []);
  const save = async (patch) => {
    setBusy(true);
    try { onChange(await api.entities.Provider.update(provider.id, patch)); }
    finally { setBusy(false); }
  };
  const toggleBadge = (id) => {
    const next = new Set(verified); next.has(id) ? next.delete(id) : next.add(id);
    save({ verified_badges: [...next] });
  };

  return <section className="panel space-y-3">
    <div className="flex items-center gap-2"><BadgeCheck className="text-brand-gold-ink" size={18}/><h2 className="section-title">Admin · verification</h2></div>
    <label className="flex items-center gap-2 text-sm text-brand-body">
      <input type="checkbox" disabled={busy} checked={!!provider.verified} onChange={(e) => save({ verified: e.target.checked, verified_at: e.target.checked ? new Date().toISOString() : null, verified_by: e.target.checked ? me.id : null })}/>
      <span className="font-medium text-brand-ink">Verified by Klal</span>
    </label>
    {declared.length === 0
      ? <p className="text-xs text-brand-muted">This listing declares no badges.</p>
      : <div className="space-y-1.5">
          <p className="text-xs text-brand-muted">Confirm the badges this listing declared:</p>
          {declared.map((b) => <label key={b.id} className="flex items-center gap-2 text-sm text-brand-body"><input type="checkbox" disabled={busy} checked={verified.has(b.id)} onChange={() => toggleBadge(b.id)}/>{b.label}{b.verify && <span className="text-xs text-brand-muted">· needs confirming before it counts</span>}</label>)}
        </div>}
  </section>;
}
