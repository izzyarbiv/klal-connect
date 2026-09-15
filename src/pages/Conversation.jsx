import React,{useEffect,useState,useRef} from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/api/client';
import GuestPrompt from '@/components/GuestPrompt';
import { ArrowLeft, Send, SmilePlus } from 'lucide-react';
import { Image } from '@/components/ui/image';
import Headline from '@/components/Headline';
import { loadMyConnections, connectionStatusWith } from '@/lib/connections';
import ReactionPicker from '@/components/feed/ReactionPicker';
import { REACTION_BY_ID } from '@/lib/reactions';
import { timeAgo, fullDate } from '@/lib/time';

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
  const [pickerFor,setPickerFor]=useState(null);
  const endRef=useRef(null);

  const react=async(m,reaction)=>{
    setPickerFor(null);
    const r=await api.functions.invoke('reactToMessage',{ message_id:m.id, reaction });
    if(r.status>=400){ setErr(r.data?.error||'Could not react'); return; }
    setErr('');
    setMessages(ms=>ms.map(x=>x.id===m.id?r.data.message:x));
  };

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
    const [u, target] = await Promise.all([ api.auth.me(), api.entities.User.get(id).catch(()=>null) ]);
    setMe(u); setOther(target);
    if(u.guest||!target){ setLoading(false); return; }
    const conn = await loadMyConnections(u.id);
    // Applying to a job opens the same door an accepted connection does —
    // the poster asked for applicants, so the two of them may always reach
    // each other about it. Mirrors canMessage on the server.
    const [applied, postedTo] = await Promise.all([
      api.entities.JobApplication.filter({ created_by_id: u.id, poster_id: id }).catch(() => []),
      api.entities.JobApplication.filter({ created_by_id: id, poster_id: u.id }).catch(() => []),
    ]);
    setConnected(connectionStatusWith(id, conn).status === 'accepted' || applied.length > 0 || postedTo.length > 0);
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
  if(me?.guest) return <GuestPrompt title="Messages are for members" body="Create a free account to connect with people and message them privately."/>;
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
        <div className="my-4 max-h-[55vh] space-y-3 overflow-y-auto px-9 py-2" onClick={()=>setPickerFor(null)}>
          {messages.length===0 && <p className="py-8 text-center text-sm text-brand-muted">No messages yet. Say hello!</p>}
          {messages.map(m=>{
            const mine=m.sender_id===me.id;
            const reactions=Object.entries(m.reactions||{}).filter(([,id])=>REACTION_BY_ID[id]);
            const own=m.reactions?.[me.id]||null;
            return <div key={m.id} className={`group flex ${mine?'justify-end':'justify-start'}`}>
              <div className="relative max-w-[78%]">
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-6 ${mine?'bg-brand-navy text-white':'bg-brand-tint text-brand-ink'}`} title={fullDate(m.created_date)}>{m.body}</div>
                {/* The "react" button sits beside the bubble: shown on hover,
                    and always faintly there on touch screens, where there is
                    no hover. */}
                <button type="button" aria-label="React to this message" onClick={(e)=>{e.stopPropagation();setPickerFor(p=>p===m.id?null:m.id);}} className={`absolute top-1 grid h-7 w-7 place-items-center rounded-full bg-brand-surface text-brand-muted opacity-60 shadow-sm ring-1 ring-brand-line transition hover:text-brand-ink hover:opacity-100 group-hover:opacity-100 ${mine?'-left-9':'-right-9'}`}><SmilePlus size={14}/></button>
                <div className={`mt-1 flex items-center gap-2 text-[10px] text-brand-muted ${mine?'flex-row-reverse':''}`}>
                  {/* In the flow, not floated over the bubble above: this list scrolls, and a floated row is clipped at its edges. */}
                  <ReactionPicker inline open={pickerFor===m.id} current={own} onPick={(id)=>react(m,id)}/>
                  {reactions.length>0&&<span className={`-mt-3 flex gap-0.5 rounded-full bg-brand-surface px-1.5 py-0.5 text-sm shadow-sm ring-1 ring-brand-line ${mine?'mr-2':'ml-2'}`} title={reactions.map(([uid,id])=>`${uid===me.id?'You':other.full_name||'They'}: ${REACTION_BY_ID[id].label}`).join(', ')}>{reactions.map(([uid,id])=><span key={uid}>{REACTION_BY_ID[id].emoji}</span>)}</span>}
                  <span>{timeAgo(m.created_date)}</span>
                </div>
              </div>
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