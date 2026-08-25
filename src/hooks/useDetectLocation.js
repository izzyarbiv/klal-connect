import { useEffect } from "react";
import { api } from "@/api/client";

async function reverseGeocode(latitude, longitude){
  let city='', country_code='';
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
    const d=await r.json();
    const a=d.address||{};
    city=a.city||a.town||a.village||a.county||'';
    country_code=(a.country_code||'').toUpperCase();
  }catch{}
  return { city, country_code };
}

async function ipFallback(){
  try{
    const r=await fetch('https://ipapi.co/json/');
    const d=await r.json();
    if(d.latitude==null) return false;
    await api.auth.updateMe({ latitude:d.latitude, longitude:d.longitude, timezone:d.timezone, city:d.city||'', country_code:(d.country_code||'').toUpperCase(), shabbos_mode_source:'auto' });
    return true;
  }catch{ return false; }
}

export function useDetectLocation(){
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        if(!await api.auth.isAuthenticated()) return;
        const me=await api.auth.me();
        if(me.latitude!=null && me.longitude!=null) return;
        if(navigator.geolocation){
          navigator.geolocation.getCurrentPosition(async pos=>{
            if(cancelled) return;
            const { latitude, longitude }=pos.coords;
            const { city, country_code }=await reverseGeocode(latitude, longitude);
            let tzid='';
            try{ tzid=Intl.DateTimeFormat().resolvedOptions().timeZone; }catch{}
            await api.auth.updateMe({ latitude, longitude, timezone:tzid, city, country_code, shabbos_mode_source:'auto' });
          }, async ()=>{ if(!cancelled) await ipFallback(); }, { timeout:10000, maximumAge:600000 });
        } else { await ipFallback(); }
      }catch{}
    })();
    return ()=>{ cancelled=true; };
  },[]);
}