import React from 'react';
import { ArrowRight } from 'lucide-react';

// A small ring with the percentage and the one next action. Owner-only.
export default function CompletenessRing({ percent, next, label = 'Profile', onAction }) {
  const r = 22, c = 2 * Math.PI * r;
  const done = percent >= 100;
  return <div className="flex items-center gap-3">
    <svg width="56" height="56" viewBox="0 0 56 56" role="img" aria-label={`${label} ${percent}% complete`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" className="text-brand-line" strokeWidth="5" />
      <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" className={done ? 'text-brand-gold' : 'text-brand-teal'} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(percent, 100) / 100)} transform="rotate(-90 28 28)" />
      <text x="28" y="32" textAnchor="middle" className="fill-brand-ink" fontSize="13" fontWeight="700">{percent}%</text>
    </svg>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-brand-ink">{done ? `${label} complete` : `${label} ${percent}% complete`}</p>
      {next
        ? <button type="button" onClick={onAction} className="mt-0.5 inline-flex items-center gap-1 text-sm font-medium text-brand-teal hover:underline">{next.action}<ArrowRight size={14}/></button>
        : <p className="mt-0.5 text-xs text-brand-muted">Members can see everything they need.</p>}
    </div>
  </div>;
}
