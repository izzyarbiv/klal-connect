import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Link } from 'react-router-dom';

// Advanced markers need a map ID. DEMO_MAP_ID is Google's documented stand-in
// for a project that has not created one; a real one (GOOGLE_MAPS_MAP_ID) also
// carries the custom styling set up in the Cloud console.
const DEFAULT_MAP_ID = 'DEMO_MAP_ID';

// Zooms to show every listing, rather than a fixed radius around the first.
function FitToListings({ located }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !located.length) return;
    if (located.length === 1) {
      map.setCenter({ lat: located[0].latitude, lng: located[0].longitude });
      map.setZoom(12);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const p of located) bounds.extend({ lat: p.latitude, lng: p.longitude });
    map.fitBounds(bounds, 48);
  }, [map, located]);
  return null;
}

export default function GoogleMap({ located, center, config }) {
  const [open, setOpen] = useState(null);
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const selected = located.find((p) => p.id === open);

  return (
    <APIProvider apiKey={config.googleMapsKey}>
      <Map
        mapId={config.googleMapsMapId || DEFAULT_MAP_ID}
        defaultCenter={{ lat: center[0], lng: center[1] }}
        defaultZoom={9}
        colorScheme={dark ? 'DARK' : 'LIGHT'}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        className="h-full w-full"
        onClick={() => setOpen(null)}
      >
        <FitToListings located={located} />
        {located.map((p) => (
          <AdvancedMarker
            key={p.id}
            position={{ lat: p.latitude, lng: p.longitude }}
            title={p.name}
            onClick={() => setOpen(p.id)}
          >
            <Pin background="#147b74" borderColor="#0e5a55" glyphColor="#ffffff" />
          </AdvancedMarker>
        ))}
        {selected && (
          <InfoWindow
            position={{ lat: selected.latitude, lng: selected.longitude }}
            pixelOffset={[0, -36]}
            onCloseClick={() => setOpen(null)}
            headerContent={<strong className="text-sm text-brand-ink">{selected.name}</strong>}
          >
            <div className="text-sm text-brand-ink">
              {selected.city && <div>{selected.city}</div>}
              <Link to={`/provider/${selected.id}`} className="font-medium text-brand-teal underline">View profile</Link>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
