import React,{useEffect,useState} from 'react';
import { api } from '@/api/client';
import { Globe, AlertTriangle } from 'lucide-react';

// Platform-wide Shabbos/Yom Tov override. When ON, the write-gate lifts for
// EVERY user (testing/emergencies). When OFF, the per-user admin_override
// flags and each user's own Zmanim apply as normal. Admin-only (Setting RLS).
export default function ShabbosGlobalOverride(){
  const [on,setOn]=useState(false),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
  useEffect(()=>{(async()=>{
    try{ const s=await api.entities.Setting.filter({key:'shabbos_global_override'}); setOn(s.length>0&&s[0].value==='true'); }catch{}
    setLoaded(true);
  })()},[]);
  const toggle=async()=>{
    setBusy(true);
    try{
      const existing=await api.entities.Setting.filter({key:'shabbos_global_override'});
      const next=!on;
      if(existing.length>0) await api.entities.Setting.update(existing[0].id,{value:String(next)});
      else await api.entities.Setting.create({key:'shabbos_global_override',value:String(next)});
      setOn(next);
    }finally{ setBusy(false); }
  };
  return <div className="panel mb-6 flex items-start justify-between gap-4">
    <div>
      <h2 className="section-title flex items-center gap-2"><Globe size={18}/>Global Shabbos override</h2>
      <p className="helper">When on, Shabbos/Yom Tov restrictions are lifted for <b>every</b> user platform-wide — use for testing or emergencies. Individual <code>admin_override</code> flags still apply when this is off.</p>
      {on&&<p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand-error"><AlertTriangle size={15}/>Override is ACTIVE — all write actions are allowed for all users.</p>}
    </div>
    <button onClick={toggle} disabled={!loaded||busy} className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white ${on?'bg-brand-error':'bg-brand-navy'}`}>{busy?'Saving…':on?'Turn OFF':'Turn ON'}</button>
  </div>;
}