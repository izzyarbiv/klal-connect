import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Search, LocateFixed } from 'lucide-react';

export default function LocationPicker({ user }) {
  const [lat, setLat] = useState(user.latitude ?? null),[lon, setLon] = useState(user.longitude ?? null),[tz, setTz] = useState(user.timezone || ''),[city, setCity] = useState(user.city || ''),[country, setCountry] = useState(user.country_code || ''),[candle, setCandle] = useState(user.candle_lighting_offset_minutes != null ? String(user.candle_lighting_offset_minutes) : 'auto'),[havdalah, setHavdalah] = useState(user.havdalah_method || '50'),[readOnly, setReadOnly] = useState(!!user.shabbos_read_only),[q, setQ] = useState(''),[results, setResults] = useState([]),[busy, setBusy] = useState(false),[saved, setSaved] = useState(false),[status, setStatus] = useState(null),[err, setErr] = useState('');

  const loadStatus = async () => {try {const r = await api.functions.invoke('getShabbosStatus', {});setStatus(r.data);} catch {}};
  useEffect(() => {loadStatus();}, []);
  // Pre-fill from a travel suggestion (?travel=<json>) so the user can review
  // a detected new location before confirming. Never auto-saves.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('travel');
    if (!t) return;
    try {
      const d = JSON.parse(t);
      if (d.lat != null) setLat(parseFloat(d.lat));
      if (d.lon != null) setLon(parseFloat(d.lon));
      if (d.city != null) setCity(d.city);
      if (d.country != null) setCountry(d.country);
      if (d.tz) setTz(d.tz);
    } catch {}
  }, []);

  const useCurrent = () => {
    if (!navigator.geolocation) {setErr('Geolocation not available. Search for your city instead.');return;}
    setBusy(true);setErr('');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;setLat(latitude);setLon(longitude);
      let zone = '';
      try {
        const d = await api.geo.reverse(latitude, longitude);
        setCity(d.city || '');setCountry(d.country_code || '');zone = d.timezone || '';
      } catch (e) { setErr(e.message || 'Could not look up that location.'); }
      // The zone is derived from the coordinates. Falling back to the browser's
      // zone is only correct when it agrees with where the pin actually is.
      if (!zone) { try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch {} }
      setTz(zone);
      setBusy(false);
    }, () => {setBusy(false);setErr('Location permission denied. Search for your city instead.');}, { timeout: 10000 });
  };
  const search = async () => {
    if (!q.trim()) return;
    setBusy(true);setErr('');
    try { setResults(await api.geo.search(q, 8)); }
    catch (e) { setErr(e.message || 'Search failed.'); }
    setBusy(false);
  };
  // Takes the timezone of the place that was picked, not the browser's. Picking
  // a city in another zone and keeping the local one would compute candle
  // lighting for the wrong place entirely.
  const pick = (r) => {
    setLat(r.latitude);setLon(r.longitude);
    setCity(r.city || (r.label || '').split(',')[0]);
    setCountry(r.country_code || '');
    if (r.timezone) setTz(r.timezone);
    setResults([]);setQ('');
  };
  const save = async () => {
    setErr('');
    if (lat == null || lon == null || !tz) {setErr('Location and timezone are required.');return;}
    await api.auth.updateMe({ latitude: lat, longitude: lon, timezone: tz, city, country_code: country, candle_lighting_offset_minutes: candle === 'auto' ? null : Number(candle), havdalah_method: havdalah, shabbos_read_only: readOnly, shabbos_mode_source: 'manual' });
    setSaved(true);setTimeout(() => setSaved(false), 1500);loadStatus();
  };
  const fmt = (ms) => {if (!ms || !status?.tzid) return '—';try {return new Intl.DateTimeFormat('en-US', { timeZone: status.tzid, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(ms));} catch {return new Date(ms).toLocaleString();}};

  return <section className="panel space-y-4 my-4">
    <div><h2 className="section-title">Shabbos & Yom Tov location</h2><p className="helper">Your zmanim are computed from your own location, so the app locks at your candle lighting and opens at your Havdalah — wherever you are.</p></div>
    {status && <div className="rounded-xl bg-brand-tint p-4 text-sm">
      <p className="font-semibold text-brand-ink">{status.cityLabel || 'Unknown city'}{status.isInIsrael ? ' · Israel' : ' · Diaspora'}</p>
      <p className="text-brand-body">Candle lighting: <b>{fmt(status.startsAt)}</b></p>
      <p className="text-brand-body">Havdalah: <b>{fmt(status.endsAt)}</b></p>
      {status.parsha && <p className="text-brand-body">Parsha: <b>{status.parsha}</b></p>}
      {status.isRestricted && <p className="mt-1 font-semibold text-brand-teal">Currently Shabbos / Yom Tov</p>}
    </div>}
    <button onClick={useCurrent} className="secondary"><LocateFixed size={16} />Use my current location</button>
    <div className="flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a city…" className="field flex-1" /><button onClick={search} className="secondary"><Search size={16} />Search</button></div>
    {results.length > 0 && <div className="max-h-48 overflow-y-auto rounded-xl border border-brand-line">{results.map((r) => <button key={`${r.latitude},${r.longitude}`} onClick={() => pick(r)} className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-brand-tint">{r.label}</button>)}</div>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label>City<input className="field" value={city} onChange={(e) => setCity(e.target.value)} /></label>
      <label>Country code<input className="field" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} placeholder="US, IL…" /></label>
      <label>Timezone (IANA)<input className="field" value={tz} onChange={(e) => setTz(e.target.value)} placeholder="America/New_York" /></label>
      <label>Candle lighting offset<select className="field" value={candle} onChange={(e) => setCandle(e.target.value)}><option value="auto">Auto (city default)</option><option value="15">15 min</option><option value="18">18 min</option><option value="20">20 min</option><option value="22">22 min</option><option value="30">30 min</option><option value="40">40 min</option></select></label>
      <label>Havdalah method<select className="field" value={havdalah} onChange={(e) => setHavdalah(e.target.value)}><option value="42">42 min</option><option value="50">50 min</option><option value="72">72 min</option><option value="tzeis_8_5">Tzeis 8.5°</option></select></label>
      <label>Shabbos mode<select className="field" value={readOnly ? 'read' : 'lock'} onChange={(e) => setReadOnly(e.target.value === 'read')}><option value="lock">Full lock (default)</option><option value="read">Read-only</option></select></label>
    </div>
    {err && <p className="text-sm font-semibold text-brand-error">{err}</p>}
    <div className="flex items-center gap-3"><button onClick={save} className="primary">Save location</button>{saved && <span className="text-sm font-semibold text-brand-teal">Saved</span>}</div>
  </section>;
}