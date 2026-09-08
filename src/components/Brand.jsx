import React from 'react';
import { Link } from 'react-router-dom';

/**
 * The mark is a kaf (כ) carrying a dagesh: the first letter of כְּלָל, drawn as
 * a filled letter with Hebrew stress (heavy roof and base, light stem), a
 * pen-entry flag at the head and a base that runs past the head at the tail.
 * The dot is the dagesh the word actually takes, and the whole idea of the
 * mark: one person held inside the whole.
 *
 * One path and one circle in currentColor, so the same geometry serves the
 * teal header mark, the dark-canvas mark and any monochrome use. The navy tile
 * exists only in the app icon (public/brand/icon.svg), never in the header.
 */
export function Mark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M14 10.5 A1.5 1.5 0 0 1 15.5 9 Q17 12 22 12 H38 A14 14 0 0 1 52 26 V32 A20 20 0 0 1 32 52 H11 A1.5 1.5 0 0 1 9.5 50.5 V43.5 A1.5 1.5 0 0 1 11 42 H37 A9 9 0 0 0 46 33 V28 A6 6 0 0 0 40 22 H15.5 A1.5 1.5 0 0 1 14 20.5 Z"
        fill="currentColor"
      />
      <circle cx="28.5" cy="33.5" r="3.5" fill="currentColor" />
    </svg>
  );
}

export default function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 text-brand-teal" aria-label="Klal — home">
      {/* 36px box beside 24px Fraunces: box = 1.5em, gap = 1/3em, and the mark
          rides 1px high so its roof and base overshoot the ascender line and
          the baseline by the same ~2px instead of sinking below the baseline. */}
      <Mark className="relative -top-px h-9 w-9" />
      <span className="font-display text-2xl font-bold leading-none tracking-tight text-brand-ink">Klal</span>
    </Link>
  );
}
