import React,{useState} from 'react';
import { Bell } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { api } from '@/api/client';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationList from '@/components/NotificationList';

export default function MobileNotificationBell(){
  const [open,setOpen]=useState(false);
  const { items, unread, loading, reload }=useNotifications();
  const markAll=async()=>{ try{ const me=await api.auth.me(); await api.entities.Notification.updateMany({recipient_id:me.id,read:false},{$set:{read:true}}); reload(); }catch{} };
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild>
      <button className="flex flex-col items-center gap-1 text-[10px] text-brand-muted" aria-label="Notifications">
        <span className="relative"><Bell size={19}/>{unread>0&&<span className="absolute -right-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-error px-1 text-[9px] font-bold text-white">{unread>9?'9+':unread}</span>}</span>
        <span>Alerts</span>
      </button>
    </SheetTrigger>
    <SheetContent side="bottom" className="flex max-h-[80vh] flex-col p-0">
      <SheetHeader className="flex-row items-center justify-between border-b border-brand-line px-4 py-3">
        <SheetTitle>Notifications</SheetTitle>
        {unread>0&&<button onClick={markAll} className="text-xs font-semibold text-brand-teal">Mark all read</button>}
      </SheetHeader>
      <div className="overflow-y-auto">{loading?<p className="px-4 py-8 text-center text-sm text-brand-muted">Loading…</p>:<NotificationList items={items} onNavigate={()=>setOpen(false)}/>}</div>
    </SheetContent>
  </Sheet>;
}