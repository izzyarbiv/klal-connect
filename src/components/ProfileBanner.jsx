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
        <Image src={url} fittingType="fill" className="h-full w-full" alt="" />
      ) : (
        <div className="h-full w-full bg-brand-navy" />
      )}
    </div>
  );
}
