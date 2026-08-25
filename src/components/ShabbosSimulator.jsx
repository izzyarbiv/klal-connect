import React,{useState} from 'react';
import { api } from '@/api/client';

export default function ShabbosSimulator(){
  const [now,setNow]=useState(''),[lat,setLat]=useState(''),[lon,setLon]=useState(''),[tz,setTz]=useState(''),[city,setCity]=useState(''),[cc,setCc]=useState(''),[out,setOut]=useState(null),[busy,setBusy]=useState(false);
  const presets=[
    ['Fri ~8pm Israel (locked)', {now:'2026-08-07T17:00:00Z',lat:31.78,lon:35.22,tz:'Asia/Jerusalem',city:'Jerusalem',cc:'IL'}],
    ['Same instant, NY (active)', {now:'2026-08-07T17:00:00Z',lat:40.1,lon:-74.22,tz:'America/New_York',city:'Lakewood',cc:'US'}],
    ['8th day Pesach — US (locked)', {now:'2026-04-09T15:00:00Z',lat:40.1,lon:-74.22,tz:'America/New_York',city:'Lakewood',cc:'US'}],
    ['8th day Pesach — Israel (open)', {now:'2026-04-09T15:00:00Z',lat:31.78,lon:35.22,tz:'Asia/Jerusalem',city:'Jerusalem',cc:'IL'}],
  ];
  const run=async()=>{
    setBusy(true);
    try{
      const r=await api.functions.invoke('getShabbosStatus',{debug:{now:now||undefined,latitude:lat?parseFloat(lat):undefined,longitude:lon?parseFloat(lon):undefined,timezone:tz||undefined,city:city||undefined,country_code:cc||undefined}});
      setOut(r.data);
    }catch(e){ setOut({error:String(e)}); }
    setBusy(false);
  };
  const apply=(p)=>{ setNow(p.now);setLat(String(p.lat));setLon(String(p.lon));setTz(p.tz);setCity(p.city);setCc(p.cc); };
  const fmt=(ms)=>ms?new Date(ms).toUTCString():'—';
  return <div className="panel">
    <h2 className="section-title">Shabbos simulator</h2>
    <p className="helper">Override date, time and coordinates to verify zmanim. Admin only — the function rejects overrides for non-admins, and always compares against server time (changing your device clock can't unlock the app).</p>
    <div className="mt-3 flex flex-wrap gap-2">{presets.map(([n,p])=><button key={n} onClick={()=>apply(p)} className="secondary py-1.5 text-xs">{n}</button>)}</div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label>Simulated instant (UTC, e.g. 2026-08-07T17:00:00Z)<input className="field" value={now} onChange={e=>setNow(e.target.value)} placeholder="YYYY-MM-DDTHH:mm:ssZ"/></label>
      <label>Timezone<input className="field" value={tz} onChange={e=>setTz(e.target.value)} placeholder="Asia/Jerusalem"/></label>
      <label>Latitude<input className="field" value={lat} onChange={e=>setLat(e.target.value)}/></label>
      <label>Longitude<input className="field" value={lon} onChange={e=>setLon(e.target.value)}/></label>
      <label>City<input className="field" value={city} onChange={e=>setCity(e.target.value)}/></label>
      <label>Country code<input className="field" value={cc} onChange={e=>setCc(e.target.value)}/></label>
    </div>
    <button onClick={run} disabled={busy} className="primary mt-3">Run</button>
    {out&&<pre className="mt-3 overflow-x-auto rounded-xl bg-brand-tint p-3 text-xs">{JSON.stringify(out,null,2)}</pre>}
    {out&&!out.error&&<div className="mt-3 grid gap-1 text-sm">
      <p>Restricted: <b>{String(out.isRestricted)}</b></p><p>City: <b>{out.cityLabel}</b> ({out.isInIsrael?'Israel':'Diaspora'})</p>
      <p>Starts: <b>{fmt(out.startsAt)}</b></p><p>Ends: <b>{fmt(out.endsAt)}</b></p><p>Next change: <b>{fmt(out.nextChange)}</b></p>
      <p>Parsha: <b>{out.parsha||'—'}</b></p>{out.fallback&&<p className="text-brand-error">Fallback (zmanim calc failed)</p>}
    </div>}
  </div>;
}