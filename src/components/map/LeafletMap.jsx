import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

// The map used when no Google Maps key is configured — local development, or
// a deployment that has not set one up yet. OpenStreetMap's tile policy does
// not cover production app traffic, so this is not the production map.
export default function LeafletMap({ located, center, config }) {
  return (
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
  );
}
