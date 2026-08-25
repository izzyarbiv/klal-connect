import { useEffect, useState, useCallback } from "react";
import { api } from "@/api/client";

export function useNotifications(){
  const [items,setItems]=useState([]);
  const [prefs,setPrefs]=useState({});
  const [loading,setLoading]=useState(true);

  const load=useCallback(async ()=>{
    try{
      const me=await api.auth.me();
      setPrefs(me.notification_prefs||{});
      const list=await api.entities.Notification.filter({recipient_id:me.id},'-created_date',30);
      setItems(list);
    }catch{ setItems([]); }
    setLoading(false);
  },[]);

  useEffect(()=>{
    load();
    const unsub=api.entities.Notification.subscribe(()=>{ load(); });
    return unsub;
  },[load]);

  const visible=items.filter(n=>prefs[n.type]!==false);
  const unread=visible.filter(n=>!n.read).length;
  return { items:visible, unread, loading, reload:load, prefs };
}