import React, { useState } from 'react';
import { api } from '@/api/client';
import { Search, LocateFixed, MapPin, X } from 'lucide-react';

// Puts a pin on a listing so it shows up on the directory map. Controlled:
// `value` is the listing being edited, `onChange` receives the fields to merge
// (latitude, longitude, and the city/country if they were still blank).
//
// Distinct from LocationPicker, which is a member's own Shabbos location and
// saves straight to their profile.
export default function ListingLocationPicker({ value, onChange }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // An address was searched but nothing came back for the building itself,
  // only towns. Picking one of those pins the middle of town, so say so.
  const [onlyTowns, setOnlyTowns] = useState(false);
  const pinned = value?.latitude != null && value?.longitude != null;

  const apply = (loc) => {
    onChange({
      latitude: loc.latitude,
      longitude: loc.longitude,
      ...(value?.city ? {} : { city: loc.city || (loc.label || '').split(',')[0] || '' }),
      ...(loc.country_code ? { country_code: loc.country_code } : {}),
    });
    setResults([]);
    setOnlyTowns(false);
    setQ('');
  };

  const search = async (e) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true); setErr(''); setOnlyTowns(false);
    try {
      const found = await api.geo.search(q, 8);
      setResults(found);
      setOnlyTowns(/^\s*\d+[a-z]?(-\d+)?\s+[a-z]/i.test(q) && found.length > 0 && !found.some((r) => r.precise));
    }
    catch (ex) { setErr(ex.message || 'Location search is not available right now. You can still submit without a pin.'); }
    setBusy(false);
  };

  const useCurrent = () => {
    if (!navigator.geolocation) { setErr('Geolocation is not available in this browser. Search for the address instead.'); return; }
    setBusy(true); setErr('');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      let d = {};
      try { d = await api.geo.reverse(latitude, longitude); } catch { /* keep the pin even without a name */ }
      apply({ latitude, longitude, city: d.city, country_code: d.country_code });
      setBusy(false);
    }, () => { setBusy(false); setErr('Location permission denied. Search for the address instead.'); }, { timeout: 10000 });
  };

  return <div className="space-y-3 rounded-lg border border-brand-line p-4">
    <div>
      <p className="font-semibold text-brand-ink">Map pin <span className="font-normal text-brand-muted">(optional)</span></p>
      <p className="helper">Pin the listing so people can find it on the map. Search the address or city, or use your current location if you are there now.</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') search(e); }} placeholder="Search an address or city…" className="field min-w-[12rem] flex-1" />
      <button type="button" onClick={search} disabled={busy} className="secondary"><Search size={16} />Search</button>
      <button type="button" onClick={useCurrent} disabled={busy} className="secondary"><LocateFixed size={16} />Use my location</button>
    </div>
    {results.length > 0 && <div className="max-h-48 overflow-y-auto rounded-xl border border-brand-line">
      {results.map((r) => <button type="button" key={`${r.latitude},${r.longitude}`} onClick={() => apply(r)} className="block w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-brand-tint">{r.label}</button>)}
    </div>}
    {results.length > 0 && onlyTowns && <p className="helper">We could not find that exact address, so these pins go to the middle of town. Check the street name and number, or add the ZIP code.</p>}
    {err && <p className="text-sm font-semibold text-brand-error">{err}</p>}
    {pinned
      ? <p className="flex items-center gap-2 text-sm text-brand-body"><MapPin size={16} className="text-brand-teal" />Pinned at {Number(value.latitude).toFixed(4)}, {Number(value.longitude).toFixed(4)}<button type="button" onClick={() => onChange({ latitude: null, longitude: null })} className="icon-button" aria-label="Remove pin"><X size={14} /></button></p>
      : <p className="text-sm text-brand-muted">No pin yet.</p>}
  </div>;
}
