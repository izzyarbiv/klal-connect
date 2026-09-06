import { useEffect } from "react";
import { api } from "@/api/client";

async function reverseGeocode(latitude, longitude){
  try{
    const { city, country_code, timezone }=await api.geo.reverse(latitude, longitude);
    return { city, country_code, timezone };
  }catch{ return { city:'', country_code:'', timezone:'' }; }
}

async function ipFallback(){
  try{
    const d=await api.geo.ip();
    if(!d || d.latitude==null) return false;
    await api.auth.updateMe({ latitude:d.latitude, longitude:d.longitude, timezone:d.timezone, city:d.city||'', country_code:d.country_code||'', shabbos_mode_source:'auto' });
    return true;
  }catch{ return false; }
}

export function useDetectLocation(){
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        if(!(await api.auth.hasAccount())) return;
        const me=await api.auth.me();
        if(me.latitude!=null && me.longitude!=null) return;
        if(navigator.geolocation){
          navigator.geolocation.getCurrentPosition(async pos=>{
            if(cancelled) return;
            const { latitude, longitude }=pos.coords;
            const { city, country_code, timezone }=await reverseGeocode(latitude, longitude);
            // Prefer the zone derived from the coordinates; the browser's zone
            // is only a fallback and is wrong whenever the two disagree.
            let tzid=timezone;
            if(!tzid){ try{ tzid=Intl.DateTimeFormat().resolvedOptions().timeZone; }catch{} }
            await api.auth.updateMe({ latitude, longitude, timezone:tzid, city, country_code, shabbos_mode_source:'auto' });
          }, async ()=>{ if(!cancelled) await ipFallback(); }, { timeout:10000, maximumAge:600000 });
        } else { await ipFallback(); }
      }catch{}
    })();
    return ()=>{ cancelled=true; };
  },[]);
}