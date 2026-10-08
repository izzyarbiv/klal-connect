import React from 'react';
import { Image } from '@/components/ui/image';

// The wide cover image at the top of a profile, the way LinkedIn has one.
// Without an image it falls back to a flat brand-navy panel rather than a
// grey box — deliberate, not decorative. A gradient here read as a generated
// placeholder; a flat color reads as a real product decision.
//
// Height is a prop rather than something a caller overrides through className:
// two competing h-* utilities in one class list resolve by CSS source order,
// not by which was passed last, so overriding silently did nothing.
export default function ProfileBanner({ url, heightClass = 'h-32 sm:h-44', className = '', onClick }) {
  return (
    <div
      className={`relative w-full overflow-hidden ${heightClass} ${className} ${url ? 'cursor-zoom-in' : ''}`}
      onClick={url ? onClick : undefined}
      onKeyDown={url ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      role={url ? 'button' : undefined}
      tabIndex={url ? 0 : undefined}
      aria-label={url ? 'Open cover photo' : undefined}
    >
      {url ? (
        <>
          <Image src={url} fittingType="fill" className="h-full w-full" alt="" />
          {/* A hairline under a real photo. A white cover on a white light-mode
              page had no edge at all and read as one big white block running
              into the profile below it. brand-ink inverts with the theme, so
              at low opacity this is a faint dark line in light mode and a
              faint light one in dark — no variant needed. Only drawn over an
              image: the navy fallback already has an edge of its own.
              An inline colour, not bg-brand-ink/15: the brand colours are
              declared without <alpha-value>, so that utility is never
              generated and the line silently did not exist. */}
          <div data-banner-edge className="pointer-events-none absolute inset-x-0 bottom-0 h-px" style={{ background: 'hsl(var(--brand-ink) / 0.18)' }} aria-hidden="true" />
        </>
      ) : (
        <div className="h-full w-full bg-brand-navy" />
      )}
    </div>
  );
}
