import React from 'react';
import { googleEmbedUrl, addressLine } from '@/lib/maps';
import DirectionsMenu from '@/components/DirectionsMenu';

// The "Location" panel on a listing: a Google map of the place, its address,
// and directions in Google Maps, Apple Maps or Waze. The map only appears for a street address: a
// listing's coordinates are often just its town's, and a pin in the middle of
// town reads as the business's door. Without one it is the town's name and
// the directions button, which the maps apps accept as a destination. A
// listing with neither an address nor a town has nothing to show here, so the
// panel is left out rather than rendered as an empty box.
export default function ListingLocation({ place, onOpen }) {
  const line = addressLine(place);
  if (!line) return null;
  const embed = place.address ? googleEmbedUrl(place) : null;
  return (
    <section className="panel">
      <h2 className="section-title">Location</h2>
      {embed && (
        <div className="mt-4 h-64 overflow-hidden rounded-xl ring-1 ring-brand-line bg-brand-surface sm:h-72">
          <iframe
            title={`Map showing ${place.name || 'this listing'}`}
            src={embed}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-brand-body">{line}</p>
        <DirectionsMenu place={place} align="right" onOpen={onOpen} />
      </div>
    </section>
  );
}
