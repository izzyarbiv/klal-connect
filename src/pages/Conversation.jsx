import React,{useEffect,useState,useRef} from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { ArrowLeft, Send } from 'lucide-react';
import { Image } from '@/components/ui/image';
import Headline from '@/components/Headline';
import { loadMyConnections, connectionStatusWith } from '@/lib/connections';

export default function Conversation(){
  const { id } = useParams();
  const [me,setMe]=useState();
  const [other,setOther]=useState();
  const [messages,setMessages]=useState([]);
  const [text,setText]=useState('');
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState('');
  const [connected,setConnected]=useState(false);
  const [loading,setLoading]=useState(true);
  const endRef=useRef(null);

  const load = async (u) => {
    const [sent, received] = await Promise.all([
      api.entities.Message.filter({ sender_id: u.id, recipient_id: id }),
      api.entities.Message.filter({ sender_id: id, recipient_id: u.id }),
    ]);
    const all=[...sent,...received].sort((a,b)=>new Date(a.created_date)-new Date(b.created_date));
    setMessages(all);
    const unread=received.filter(m=>!m.read);
    for(const m of unread){ try{ await api.entities.Message.update(m.id,{read:true}); }catch{} }
  };

  useEffect(()=>{(async()=>{
    if(!await api.auth.isAuthenticated()) return api.auth.redirectToLogin(location.href);
    const [u, target] = await Promise.all([ api.auth.me(), api.entities.User.get(id) ]);
    setMe(u); setOther(target);
    const conn = await loadMyConnections(u.id);
    setConnected(connectionStatusWith(id, conn).status === 'accepted');
    await load(u);
    setLoading(false);
  })()},[id]);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}); },[messages]);

  const submit=async e=>{
    e.preventDefault();
    if(!text.trim())return;
    setBusy(true); setErr('');
    const r=await api.functions.invoke('sendMessage',{ recipient_id:id, body:text });
    if(r.status>=400){ setErr(r.data?.error||'Message unavailable'); setBusy(false); return; }
    setText(''); setBusy(false);
    if(me) await load(me);
  };

  if(loading) return <div className="loading">Loading conversation…</div>;
  if(!other) return <div className="empty">This member could not be found.</div>;

  const initials=(other.full_name||other.email||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();

  return <div className="page-shell max-w-2xl py-8">
    <Link to="/messages" className="mb-5 flex items-center gap-2 text-sm font-semibold text-brand-teal"><ArrowLeft size={17}/>Back to messages</Link>
    <section className="panel">
      <Link to={`/profile/${other.id}`} className="flex items-center gap-3 border-b border-brand-line pb-4">
        {other.avatar_url
          ? <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-brand-line"><Image src={other.avatar_url} fittingType="fill" className="h-12 w-12"/></div>
          : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-tint text-sm font-bold text-brand-teal">{initials}</div>}
        <div className="min-w-0">
          <p className="truncate font-semibold text-brand-ink">{other.full_name||'Community member'}</p>
          <Headline text={other.headline}/>
        </div>
      </Link>

      {!connected ? <p className="py-10 text-center text-sm text-brand-muted">You can only message members you are connected with. <Link to={`/profile/${other.id}`} className="font-semibold text-brand-teal">View profile</Link></p> : <>
        <div className="my-4 max-h-[55vh] space-y-3 overflow-y-auto py-2">
          {messages.length===0 && <p className="py-8 text-center text-sm text-brand-muted">No messages yet. Say hello!</p>}
          {messages.map(m=>{
            const mine=m.sender_id===me.id;
            return <div key={m.id} className={`flex ${mine?'justify-end':'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${mine?'bg-brand-navy text-white':'bg-brand-tint text-brand-ink'}`}>{m.body}</div>
            </div>;
          })}
          <div ref={endRef}/>
        </div>
        {err && <p className="mb-2 text-xs font-semibold text-brand-error">{err}</p>}
        <form onSubmit={submit} className="flex gap-2 border-t border-brand-line pt-3">
          <input value={text} onChange={e=>setText(e.target.value)} placeholder="Write a message…" className="flex-1 rounded-xl border border-brand-line bg-brand-surface px-3 py-2.5 text-sm outline-none focus:border-brand-teal"/>
          <button disabled={busy||!text.trim()} className="primary px-3"><Send size={16}/></button>
        </form>
      </>}
    </section>
  </div>;
}