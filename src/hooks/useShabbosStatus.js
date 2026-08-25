import { useEffect, useState } from "react";
import { api } from "@/api/client";

export function useShabbosStatus(){
  const [status,setStatus]=useState(null);
  useEffect(()=>{
    let alive=true;
    const tick=async()=>{ try{ const r=await api.functions.invoke('getShabbosStatus',{}); if(alive) setStatus(r.data); }catch{ if(alive) setStatus(null); } };
    tick();
    const id=setInterval(tick,60000);
    return ()=>{ alive=false; clearInterval(id); };
  },[]);
  return status;
}