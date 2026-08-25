import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
export default function DirectoryMap({providers}) {
 const located=providers.filter(p=>p.latitude&&p.longitude); const center=located.length?[located[0].latitude,located[0].longitude]:[40.7128,-74.006];
 return <div className="h-[60vh] overflow-hidden rounded-3xl ring-1 ring-brand-line"><MapContainer center={center} zoom={9} className="h-full w-full"><TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{located.map(p=><Marker key={p.id} position={[p.latitude,p.longitude]}><Popup><strong>{p.name}</strong><br/>{p.city}<br/><Link to={`/provider/${p.id}`}>View profile</Link></Popup></Marker>)}</MapContainer></div>;
}