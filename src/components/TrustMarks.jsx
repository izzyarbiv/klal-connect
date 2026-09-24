import React from 'react';
import { BadgeCheck, Clock } from 'lucide-react';
import { VERIFIED_MEANING, SPONSORED_MEANING, isSponsored, confirmedLabel, isStaleConfirmation } from '@/lib/trust';

// The marks a listing carries, and what each one means.
//
// Verified is gold and carries a check. Sponsored is deliberately not: it is
// plain, grey, outlined, and reads as a label rather than an endorsement. The
// two never share a style, because the moment they resemble each other,
// payment starts to look like vetting.
export default function TrustMarks({ provider, small = false, showConfirmed = true }) {
  const sponsored = isSponsored(provider);
  // A verified listing always states when it was confirmed: a check with no
  // date is the case worth distrusting.
  const confirmed = showConfirmed ? confirmedLabel(provider) : null;
  const stale = isStaleConfirmation(provider);
  if (!provider?.verified && !sponsored && !confirmed) return null;

  const size = small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return <div className="flex flex-wrap items-center gap-1.5">
    {provider?.verified && <span
      title={VERIFIED_MEANING}
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${size} bg-brand-gold-bg text-brand-gold-ink ring-1 ring-brand-gold/40`}
    ><BadgeCheck size={small ? 11 : 13} />Verified by Klal</span>}

    {confirmed && <span className={`inline-flex items-center gap-1 ${small ? 'text-[10px]' : 'text-xs'} ${stale ? 'font-semibold text-brand-gold-ink' : 'text-brand-muted'}`}>
      <Clock size={small ? 10 : 12} />{confirmed}
    </span>}

    {sponsored && <span
      title={SPONSORED_MEANING}
      className={`inline-flex items-center rounded font-medium uppercase tracking-wide ${size} bg-transparent text-brand-muted ring-1 ring-brand-line`}
    >Sponsored</span>}
  </div>;
}
