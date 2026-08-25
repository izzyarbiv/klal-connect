import React,{useEffect,useState} from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useShabbosStatus } from '@/hooks/useShabbosStatus';

function fmt(ms,tzid){ if(!ms) return '—'; try{ return new Intl.DateTimeFormat('en-US',{timeZone:tzid,hour:'numeric',minute:'2-digit'}).format(new Date(ms)); }catch{ return new Date(ms).toLocaleTimeString(); } }
function countdown(ms){ if(!ms) return ''; const s=Math.max(0,Math.floor((ms-Date.now())/1000)); const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; }

export default function ShabbosMode(){
  const status=useShabbosStatus();
  const [,force]=useState(0);
  useEffect(()=>{ const id=setInterval(()=>force(x=>x+1),1000); return ()=>clearInterval(id); },[]);
  if(!status||status.adminOverride) return null;
  if(status.hasLocation===false) return <NoLocation/>;
  if(status.isRestricted){
    if(status.readOnly) return <ReadOnlyBanner status={status}/>;
    return <LockScreen status={status}/>;
  }
  if(status.nextChange && status.nextChange-Date.now()>0 && status.nextChange-Date.now()<6*3600000) return <CountdownBanner status={status}/>;
  return null;
}

function NoLocation(){ return <div className="bg-brand-gold-bg/60 px-4 py-2 text-center text-sm text-brand-gold-ink"><MapPin size={14} className="mr-1 inline"/>Set your location in <Link to="/profile" className="font-bold underline">Profile</Link> for accurate Shabbos &amp; Yom Tov times.</div>; }
function CountdownBanner({status}){ return <div className="bg-brand-navy px-4 py-2 text-center text-sm font-semibold text-white">Shabbos begins in {countdown(status.nextChange)} — {status.cityLabel}</div>; }
function ReadOnlyBanner({status}){ return <div className="sticky top-16 z-30 bg-brand-gold-bg/80 px-4 py-2 text-center text-sm font-semibold text-brand-gold-ink">Shabbos / Yom Tov (read-only) — {status.cityLabel} · Havdalah {fmt(status.endsAt,status.tzid)}</div>; }
function LockScreen({status}){ const greeting=status.parsha?'Gut Shabbos':'Gut Yom Tov'; return <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-navy px-6 text-center text-white"><p className="text-xs font-bold tracking-[0.18em] text-brand-gold">{status.isInIsrael?'ISRAEL':'DIASPORA'}</p><h1 className="mt-3 font-heading text-4xl font-bold tracking-tight">{greeting}</h1><p className="mt-2 text-brand-gold">{status.cityLabel}</p><div className="mt-8 grid gap-3 text-sm"><p>Candle lighting · <b>{fmt(status.startsAt,status.tzid)}</b></p><p>Havdalah · <b>{fmt(status.endsAt,status.tzid)}</b></p>{status.parsha&&<p>Parsha · <b>{status.parsha}</b></p>}</div><p className="mt-8 text-sm text-white/70">Havdalah in {countdown(status.endsAt)}</p><p className="mt-2 text-xs text-white/50">The app unlocks automatically after Havdalah.</p></div>; }