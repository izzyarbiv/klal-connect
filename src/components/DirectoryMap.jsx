import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import 'leaflet/dist/leaflet.css';

// OpenStreetMap's tile policy does not cover production app traffic. The source
// is read from runtime config so it can be pointed at a paid tile provider with
// an env var, without a rebuild.
const OSM_FALLBACK = {
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution: '&copy; OpenStreetMap contributors',
};

export default function DirectoryMap({ providers }) {
  const [config, setConfig] = useState(OSM_FALLBACK);
  useEffect(() => {
    let alive = true;
    api.getConfig()
      .then((c) => { if (alive && c?.tileUrl) setConfig(c); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const located = providers.filter((p) => p.latitude && p.longitude);
  const center = located.length ? [located[0].latitude, located[0].longitude] : [40.7128, -74.006];

  return (
    <div className="h-[60vh] overflow-hidden rounded-3xl ring-1 ring-brand-line">
      <MapContainer center={center} zoom={9} className="h-full w-full">
        <TileLayer attribution={config.tileAttribution} url={config.tileUrl} />
        {located.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]}>
            <Popup>
              <strong>{p.name}</strong><br />{p.city}<br />
              <Link to={`/provider/${p.id}`}>View profile</Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
