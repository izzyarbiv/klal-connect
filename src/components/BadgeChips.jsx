import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { listingBadges } from '@/lib/badges';

// Community badges on a listing. A badge an admin has confirmed is filled and
// carries a check; a self-declared one is an outline. Claims that need
// confirming (kashrus-adjacent ones) are labelled "self-declared" until then,
// so the outline is never mistaken for a certification.
export default function BadgeChips({ provider, max, small = false }) {
  const all = listingBadges(provider);
  if (!all.length) return null;
  const shown = max ? all.slice(0, max) : all;
  const more = all.length - shown.length;
  const size = small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return <div className="flex flex-wrap items-center gap-1.5">
    {shown.map((b) => (
      <span key={b.id} title={b.verified ? `${b.label} — confirmed by Klal` : b.verify ? `${b.label} — self-declared, not yet confirmed` : b.hint || b.label}
        className={`inline-flex items-center gap-1 rounded-full font-semibold ${size} ${b.verified
          ? 'bg-brand-gold-bg text-brand-gold-ink ring-1 ring-brand-gold/40'
          : 'bg-transparent text-brand-body ring-1 ring-brand-line'}`}>
        {b.verified && <BadgeCheck size={small ? 11 : 13} />}
        {b.label}
        {!b.verified && b.verify && !small && <span className="font-normal text-brand-muted">· self-declared</span>}
      </span>
    ))}
    {more > 0 && <span className={`text-brand-muted ${small ? 'text-[10px]' : 'text-xs'}`}>+{more}</span>}
  </div>;
}
