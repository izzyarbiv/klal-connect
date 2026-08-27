import React from 'react';
import { Link } from 'react-router-dom';

/**
 * The mark is a kaf — the initial of כלל — holding a single point:
 * klal u'prat, the whole and the individual within it. The stroke takes
 * currentColor so it inherits the header's colour in both themes; only the
 * inner point is fixed, because it is the one warm accent.
 */
export function Mark({ className = 'h-9 w-9', withPoint = true }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path
        d="M17 17 H39 Q49 17 49 28 V36 Q49 47 39 47 H17"
        stroke="currentColor"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dropped below about 24px, where it closes up and muddies the counter. */}
      {withPoint && <circle cx="30" cy="32" r="4.6" fill="hsl(var(--brand-gold))" />}
    </svg>
  );
}

export default function Brand() {
  return (
    /* brand-ink, not brand-navy: navy is a dark teal in the dark theme and the
       mark all but disappeared against the header. ink is the foreground token
       and flips with the theme, so contrast holds in both. */
    <Link to="/" className="flex items-center gap-2.5 text-brand-ink" aria-label="Klal — home">
      <Mark className="h-8 w-8" />
      <span className="font-display text-2xl font-bold leading-none tracking-tight">Klal</span>
    </Link>
  );
}
