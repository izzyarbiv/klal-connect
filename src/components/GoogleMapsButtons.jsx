import React from 'react';
import { Navigation, ExternalLink } from 'lucide-react';
import { googleMapsUrl, googleDirectionsUrl } from '@/lib/googleMaps';

// "Get directions" and "Open in Google Maps" for a listing. Renders nothing
// when there is no address or town to send Google.
export default function GoogleMapsButtons({ place, onOpen, className = '' }) {
  const view = googleMapsUrl(place);
  const directions = googleDirectionsUrl(place);
  if (!view) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a href={directions} target="_blank" rel="noreferrer" onClick={() => onOpen?.('directions')}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white">
        <Navigation size={16} />Get directions
      </a>
      <a href={view} target="_blank" rel="noreferrer" onClick={() => onOpen?.('map')} className="secondary inline-flex items-center gap-2">
        <ExternalLink size={16} />Open in Google Maps
      </a>
    </div>
  );
}
