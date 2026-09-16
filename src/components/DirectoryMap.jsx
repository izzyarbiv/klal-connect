import React, { Suspense, lazy, useEffect, useState } from 'react';
import { api } from '@/api/client';

// Google Maps when the deployment has a key, OpenStreetMap via Leaflet when it
// does not. Which one is decided at runtime from /api/config, so the switch is
// an env var — and each map library is only downloaded if it is the one in use.
const GoogleMap = lazy(() => import('./map/GoogleMap.jsx'));
const LeafletMap = lazy(() => import('./map/LeafletMap.jsx'));

const OSM_FALLBACK = {
  googleMapsKey: '',
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution: '&copy; OpenStreetMap contributors',
};

export default function DirectoryMap({ providers }) {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    let alive = true;
    api.getConfig()
      .then((c) => { if (alive) setConfig({ ...OSM_FALLBACK, ...(c || {}) }); })
      .catch(() => { if (alive) setConfig(OSM_FALLBACK); });
    return () => { alive = false; };
  }, []);

  const located = providers.filter((p) => p.latitude && p.longitude);
  const center = located.length ? [located[0].latitude, located[0].longitude] : [40.7128, -74.006];
  const MapImpl = config?.googleMapsKey ? GoogleMap : LeafletMap;

  return (
    <div className="h-[60vh] overflow-hidden rounded-xl ring-1 ring-brand-line bg-brand-surface">
      {config && (
        <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-brand-muted">Loading map…</div>}>
          <MapImpl located={located} center={center} config={config} />
        </Suspense>
      )}
    </div>
  );
}
