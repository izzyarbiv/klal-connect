import React from 'react';
import { googleEmbedUrl, googleMapsUrl } from '@/lib/googleMaps';
import GoogleMapsButtons from '@/components/GoogleMapsButtons';

// The "Location" panel on a listing: a Google map of the place and buttons
// that open it in Google Maps. The map only appears for a street address: a
// listing's coordinates are often just its town's, and a pin in the middle of
// town reads as the business's door. Without one it is the buttons only.
export default function ListingLocation({ place, onOpen }) {
  const embed = place.address ? googleEmbedUrl(place) : null;
  if (!googleMapsUrl(place)) return null;
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
      <GoogleMapsButtons place={place} onOpen={onOpen} className="mt-4" />
    </section>
  );
}
