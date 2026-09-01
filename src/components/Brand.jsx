import React from 'react';
import { Link } from 'react-router-dom';

/**
 * The mark is a kaf — the initial of כלל — set in a soft tile.
 *
 * The letterform is the distinctive part and is kept; the tile is what makes it
 * read as a product mark rather than a glyph, and stays light rather than
 * planting a heavy dark square in the header.
 */
export function Mark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="17" className="fill-brand-tint" />
      <path
        d="M21 20 H38 Q45 20 45 28 V36 Q45 44 38 44 H21"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-brand-teal" aria-label="Klal — home">
      <Mark className="h-9 w-9" />
      <span className="font-display text-2xl font-bold leading-none tracking-tight text-brand-ink">Klal</span>
    </Link>
  );
}
