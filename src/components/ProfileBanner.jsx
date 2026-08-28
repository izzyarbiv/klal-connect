import React from 'react';
import { Image } from '@/components/ui/image';

// The wide cover image at the top of a profile, the way LinkedIn has one.
// Without an image it falls back to a brand gradient rather than a grey box, so
// a profile nobody has customised still looks deliberate.
export default function ProfileBanner({ url, className = '' }) {
  return (
    <div className={`relative h-32 w-full overflow-hidden rounded-t-3xl sm:h-44 ${className}`}>
      {url ? (
        <Image src={url} fittingType="fill" className="h-full w-full" alt="" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-brand-navy via-brand-teal to-brand-navy opacity-90" />
      )}
    </div>
  );
}
