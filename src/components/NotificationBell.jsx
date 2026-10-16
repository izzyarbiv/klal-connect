import React,{useState,useRef,useEffect} from 'react';
import { Bell } from 'lucide-react';
import { api } from '@/api/client';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationList from '@/components/NotificationList';

export default function NotificationBell(){
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  const { items, unread, loading, reload }=useNotifications();

  useEffect(()=>{
    const onClick=e=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown',onClick);
    return ()=>document.removeEventListener('mousedown',onClick);
  },[]);

  const markAll=async()=>{
    try{ const me=await api.auth.me(); await api.entities.Notification.updateMany({recipient_id:me.id,read:false},{$set:{read:true}}); reload(); }catch{}
  };

  return <div className="relative" ref={ref}>
    <button onClick={()=>setOpen(o=>!o)} className="icon-button relative" aria-label="Notifications">
      <Bell size={19}/>
      {unread>0&&<span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-error px-1 text-[10px] font-bold text-white dark:text-black">{unread>9?'9+':unread}</span>}
    </button>
    {/* max-w keeps the panel on screen now that this bell is in the header on a
        phone too: 320px fixed would hang off the edge at 360px wide. */}
    {open&&<div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-brand-line bg-brand-surface shadow-xl">
      <div className="flex items-center justify-between border-b border-brand-line px-4 py-2.5">
        <span className="text-sm font-bold text-brand-ink">Notifications</span>
        {unread>0&&<button onClick={markAll} className="text-xs font-semibold text-brand-teal hover:underline">Mark all read</button>}
      </div>
      {loading?<p className="px-4 py-8 text-center text-sm text-brand-muted">Loading…</p>:<NotificationList items={items} onNavigate={()=>setOpen(false)}/>}
    </div>}
  </div>;
}