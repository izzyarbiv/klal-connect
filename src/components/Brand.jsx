import React from 'react';
import { Link } from 'react-router-dom';

/**
 * The mark is a kaf (כ) — the initial of כלל — built from three separate
 * stones: the top bar, the back, and a bottom bar that overruns it, which is
 * the letter's own three-stroke anatomy. The seams are straight cuts on the
 * tangent line where the bars meet the curve, so nothing reads as a slice of
 * a ring; at small sizes they close up and the letter goes solid.
 *
 * The pieces only become a letter together, which is the product: a few named
 * people, vouching, make the whole.
 *
 * Fill and stroke carry the same colour — the stroke is what rounds the
 * corners — so the mark recolours through currentColor alone. The navy tile
 * belongs to the app icon (public/brand/icon.svg), never to the header.
 */
export function Mark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M35.5 12.5 A19.5 19.5 0 0 1 35.5 51.5 L35.5 43.5 A11.5 11.5 0 0 0 35.5 20.5 Z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
      <rect x="13.5" y="12.5" width="16.6" height="8" rx="1.5" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
      <rect x="9.5" y="43.5" width="20.6" height="8" rx="1.5" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
    </svg>
  );
}

export default function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-brand-teal" aria-label="Klal Connect — home">
      <Mark className="h-9 w-9" />
      {/* "Klal" is the word; "Connect" rides with it in a lighter weight so the
          lockup reads as one name without shouting the second half. */}
      <span className="font-display text-2xl font-bold leading-none tracking-tight text-brand-ink">Klal<span className="font-semibold text-brand-teal"> Connect</span></span>
    </Link>
  );
}
