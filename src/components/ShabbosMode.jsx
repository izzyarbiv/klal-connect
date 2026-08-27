import React,{useEffect,useState} from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useShabbosStatus, shabbosState } from '@/hooks/useShabbosStatus';
import { tokenStore } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';

function fmt(ms,tzid){ if(!ms) return '—'; try{ return new Intl.DateTimeFormat('en-US',{timeZone:tzid,hour:'numeric',minute:'2-digit'}).format(new Date(ms)); }catch{ return new Date(ms).toLocaleTimeString(); } }
function countdown(ms){ if(!ms) return ''; const s=Math.max(0,Math.floor((ms-Date.now())/1000)); const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m`; }

export default function ShabbosMode(){
  const { status, verified }=useShabbosStatus();
  const { isAuthenticated }=useAuth();
  const [,force]=useState(0);
  // Lets someone past a full lock for genuine need — looking up a doctor or a
  // gemach. Writes stay blocked; this only makes the app readable, and it
  // resets on reload so it is a deliberate act each time.
  const [browsing,setBrowsing]=useState(false);
  useEffect(()=>{ const id=setInterval(()=>force(x=>x+1),1000); return ()=>clearInterval(id); },[]);

  // The gate is keyed to a signed-in user's saved location, so a visitor who is
  // not signed in has nothing to gate on — the server answers hasLocation:false
  // for them anyway.
  //
  // The signal is the presence of a token, NOT a successful session check.
  // Offline, /api/auth/me fails and isAuthenticated goes false, which would
  // skip the gate for a signed-in user — the exact fail-open this guards
  // against. AuthContext only clears the token on a real 401/403, so a token
  // that is still there means the session is still good as far as we know.
  const signedIn = !!tokenStore.get() || isAuthenticated;
  if(!signedIn) return null;

  // Decided from the clock against absolute boundaries, so crossing candle
  // lighting locks on the next tick rather than at the next poll.
  const state=shabbosState(status);

  // Never render the app when we cannot establish the time. Showing an
  // unlocked app during Shabbos is the failure this whole feature exists to
  // prevent, so an unverified state blocks instead.
  if(state==='unknown') return <Unverified/>;
  if(state==='no-location') return <NoLocation/>;
  if(state==='restricted'){
    // Nothing can be written either way — assertWritable refuses on the server.
    // The only question here is whether the app is readable.
    if(status.readOnly || browsing) return <ReadOnlyBanner status={status}/>;
    return <LockScreen status={status} onBrowse={()=>setBrowsing(true)}/>;
  }
  if(status.nextChange && status.nextChange-Date.now()>0 && status.nextChange-Date.now()<6*3600000) return <CountdownBanner status={status} stale={!verified}/>;
  return null;
}

// Blocking, not a banner: until the times are known the app must not be usable.
function Unverified(){
  return <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-navy px-6 text-center text-white">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white"/>
    <p className="mt-5 font-heading text-xl font-bold">Checking Shabbos &amp; Yom Tov times…</p>
    <p className="mt-2 max-w-sm text-sm text-white/70">The app stays closed until your candle lighting and Havdalah times are confirmed.</p>
  </div>;
}

function NoLocation(){ return <div className="bg-brand-gold-bg/60 px-4 py-2 text-center text-sm text-brand-gold-ink"><MapPin size={14} className="mr-1 inline"/>Set your location in <Link to="/profile" className="font-bold underline">Profile</Link> for accurate Shabbos &amp; Yom Tov times.</div>; }
function CountdownBanner({status, stale}){ return <div className="bg-brand-navy px-4 py-2 text-center text-sm font-semibold text-white">Shabbos begins in {countdown(status.nextChange)} — {status.cityLabel}{stale&&<span className="ml-2 font-normal text-white/60">(offline — last known times)</span>}</div>; }
function ReadOnlyBanner({status}){ return <div className="sticky top-16 z-30 bg-brand-gold-bg/80 px-4 py-2 text-center text-sm font-semibold text-brand-gold-ink">Shabbos / Yom Tov (read-only) — {status.cityLabel} · Havdalah {fmt(status.endsAt,status.tzid)}</div>; }
function LockScreen({status, onBrowse}){ const greeting=status.parsha?'Gut Shabbos':'Gut Yom Tov'; return <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-navy px-6 text-center text-white"><p className="text-xs font-bold tracking-[0.18em] text-brand-gold">{status.isInIsrael?'ISRAEL':'DIASPORA'}</p><h1 className="mt-3 font-heading text-4xl font-bold tracking-tight">{greeting}</h1><p className="mt-2 text-brand-gold">{status.cityLabel}</p><div className="mt-8 grid gap-3 text-sm"><p>Candle lighting · <b>{fmt(status.startsAt,status.tzid)}</b></p><p>Havdalah · <b>{fmt(status.endsAt,status.tzid)}</b></p>{status.parsha&&<p>Parsha · <b>{status.parsha}</b></p>}</div><p className="mt-8 text-sm text-white/70">Havdalah in {countdown(status.endsAt)}</p><p className="mt-2 text-xs text-white/50">The app unlocks automatically after Havdalah.</p>
  <button onClick={onBrowse} className="mt-8 text-sm text-white/60 underline underline-offset-4 hover:text-white">Need a phone number urgently? Open the directory</button>
</div>; }