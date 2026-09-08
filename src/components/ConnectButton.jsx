import React,{useState} from 'react';
import { api, promptForAccount } from '@/api/client';
import { UserPlus, Check, X, Clock } from 'lucide-react';
import { connectionStatusWith, sentThisWeekCount, WEEKLY_CAP } from '@/lib/connections';
import { notify } from '@/lib/notifications';

export default function ConnectButton({ targetId, me, connections, onReload, size = 'md' }){
  const [busy,setBusy]=useState(false);
  const [capMsg,setCapMsg]=useState('');
  if (!me || me.id === targetId) return null;
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';
  // The shared guest has no connections of its own to show — whatever the
  // seed attached to it belongs to nobody. One button, and it opens the
  // "create an account" prompt.
  if (me.guest) return <button type="button" onClick={promptForAccount} className={`inline-flex items-center gap-1.5 rounded-xl border border-brand-line bg-brand-surface font-semibold text-brand-ink hover:bg-brand-tint ${pad}`}><UserPlus size={15}/>Connect</button>;
  const st = connectionStatusWith(targetId, connections);
  const act = async fn => { setBusy(true); try { await fn(); onReload && onReload(); } finally { setBusy(false); } };

  if (st.status === 'accepted') return <span className={`inline-flex items-center gap-1.5 rounded-xl bg-brand-tint font-semibold text-brand-success ${pad}`}><Check size={15}/>Connected</span>;

  if (st.direction === 'out' && st.status === 'pending') return <button type="button" disabled={busy} onClick={()=>act(()=>api.entities.Connection.delete(st.conn.id))} className={`inline-flex items-center gap-1.5 rounded-xl border border-brand-line bg-brand-surface font-semibold text-brand-muted hover:bg-brand-tint ${pad}`}><Clock size={15}/>Pending · Withdraw</button>;

  if (st.direction === 'in' && st.status === 'pending') return <div className="flex gap-2">
    <button type="button" disabled={busy} onClick={()=>act(async ()=>{await api.entities.Connection.update(st.conn.id,{status:'accepted'});await notify({recipient_id:st.conn.requester_id,type:'connection_accept',actor:me,target_type:'connection',target_id:st.conn.id,message:`${me.full_name||'Someone'} accepted your connection request`});})} className={`inline-flex items-center gap-1.5 rounded-xl bg-brand-navy font-semibold text-white hover:bg-brand-navy-hover ${pad}`}><Check size={15}/>Accept</button>
    <button type="button" disabled={busy} onClick={()=>act(()=>api.entities.Connection.update(st.conn.id, { status: 'declined' }))} className={`inline-flex items-center gap-1.5 rounded-xl border border-brand-line bg-brand-surface font-semibold text-brand-muted ${pad}`}><X size={15}/>Decline</button>
  </div>;

  const send = async () => {
    setCapMsg('');
    if(!(await api.auth.requireAccount())) return;
    const used = sentThisWeekCount(connections?.sent);
    if (used >= WEEKLY_CAP){ setCapMsg(`Weekly limit reached (${used}/${WEEKLY_CAP}). Try again next week.`); return; }
    act(async ()=>{const conn=await api.entities.Connection.create({ requester_id: me.id, recipient_id: targetId, status: 'pending' });await notify({recipient_id:targetId,type:'connection_request',actor:me,target_type:'connection',target_id:conn.id,message:`${me.full_name||'Someone'} sent you a connection request`});});
  };

  return <div className="space-y-1">
    <button type="button" disabled={busy} onClick={send} className={`inline-flex items-center gap-1.5 rounded-xl bg-brand-navy font-semibold text-white hover:bg-brand-navy-hover ${pad}`}>
      {busy ? <Clock size={15} className="animate-spin"/> : <UserPlus size={15}/>}Connect
    </button>
    {capMsg && <p className="text-xs text-brand-error">{capMsg}</p>}
  </div>;
}