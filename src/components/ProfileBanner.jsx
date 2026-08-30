import React from 'react';
import { Image } from '@/components/ui/image';

// The wide cover image at the top of a profile, the way LinkedIn has one.
// Without an image it falls back to a brand gradient rather than a grey box, so
// a profile nobody has customised still looks deliberate.
//
// Height is a prop rather than something a caller overrides through className:
// two competing h-* utilities in one class list resolve by CSS source order,
// not by which was passed last, so overriding silently did nothing.
export default function ProfileBanner({ url, heightClass = 'h-32 sm:h-44', className = '' }) {
  return (
    <div className={`relative w-full overflow-hidden ${heightClass} ${className}`}>
      {url ? (
        <Image src={url} fittingType="fill" className="h-full w-full" alt="" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-brand-navy via-brand-teal to-brand-navy opacity-90" />
      )}
    </div>
  );
}
