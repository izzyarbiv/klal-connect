import { useEffect, useState } from "react";
import { api } from "@/api/client";

const EARTH_RADIUS_MI = 3958.8;
const THRESHOLD_MI = 50;

function haversineMi(lat1, lon1, lat2, lon2){
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(a));
}

// Round to ~0.1° (~7 mi) so a re-detection of the same area keys the same
// dismissal, but a genuinely different mismatch keys differently.
function roundKey(lat, lon){ return `${Number(lat).toFixed(1)},${Number(lon).toFixed(1)}`; }

async function reverseGeocode(latitude, longitude){
  try{
    const { city, country_code, timezone }=await api.geo.reverse(latitude, longitude);
    return { city, country_code, timezone };
  }catch{ return { city:'', country_code:'', timezone:'' }; }
}

async function ipFallback(){
  try{
    const d=await api.geo.ip();
    if(!d || d.latitude==null) return null;
    let tzid=d.timezone;
    if(!tzid){ try{ tzid=Intl.DateTimeFormat().resolvedOptions().timeZone; }catch{} }
    return { latitude:d.latitude, longitude:d.longitude, city:d.city||'', country_code:d.country_code||'', tzid };
  }catch{ return null; }
}

// Fresh location read: browser geolocation when already granted (no prompt
// nag), otherwise IP-based geolocation. Returns null if neither is available.
async function freshLocation(){
  let canUseGeo = false;
  try{
    if(navigator.geolocation && navigator.permissions){
      const perm = await navigator.permissions.query({name:'geolocation'});
      canUseGeo = perm.state === 'granted';
    } else { canUseGeo = !!navigator.geolocation; }
  }catch{ canUseGeo = !!navigator.geolocation; }
  if(canUseGeo){
    try{
      const pos = await new Promise((resolve, reject)=>navigator.geolocation.getCurrentPosition(resolve, reject, { timeout:10000, maximumAge:300000 }));
      const { latitude, longitude }=pos.coords;
      const { city, country_code, timezone }=await reverseGeocode(latitude, longitude);
      let tzid=timezone;
      if(!tzid){ try{ tzid=Intl.DateTimeFormat().resolvedOptions().timeZone; }catch{} }
      return { latitude, longitude, city, country_code, tzid };
    }catch{}
  }
  return await ipFallback();
}

// Surfaces a travel suggestion when the fresh location differs from the saved
// profile location by >= 50 mi or a different IANA timezone. Purely
// informational — does NOT touch the Shabbos gate, getShabbosStatus, or any
// saved location. Dismissals are stored per-user keyed to rounded coords.
export function useTravelCheck(){
  const [suggestion, setSuggestion]=useState(null);
  useEffect(()=>{
    let cancelled=false;
    const run=async()=>{
      try{
        if(!(await api.auth.hasAccount())) return;
        const me=await api.auth.me();
        if(me.latitude==null || me.longitude==null) return; // no saved location yet — handled by the "location required" prompt
        const fresh=await freshLocation();
        if(cancelled || !fresh || fresh.latitude==null) return;
        const dist=haversineMi(me.latitude, me.longitude, fresh.latitude, fresh.longitude);
        const tzChanged = !!(me.timezone && fresh.tzid && me.timezone !== fresh.tzid);
        if(dist < THRESHOLD_MI && !tzChanged) return;
        const key=roundKey(fresh.latitude, fresh.longitude);
        if((me.travel_dismissals||[]).includes(key)) return;
        setSuggestion({ ...fresh, key });
      }catch{}
    };
    run();
    const id=setInterval(run, 30*60*1000);
    return ()=>{ cancelled=true; clearInterval(id); };
  },[]);
  const dismiss=async (key)=>{
    setSuggestion(null);
    try{
      const me=await api.auth.me();
      const list=me.travel_dismissals||[];
      if(!list.includes(key)) await api.auth.updateMe({ travel_dismissals:[...list, key] });
    }catch{}
  };
  return { suggestion, dismiss };
}