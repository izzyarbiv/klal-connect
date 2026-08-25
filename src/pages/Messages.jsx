import React,{useEffect,useState} from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Image } from '@/components/ui/image';
import Headline from '@/components/Headline';

export default function Messages(){
  const [me,setMe]=useState();
  const [convos,setConvos]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{(async()=>{
    if(!await api.auth.isAuthenticated()) return api.auth.redirectToLogin(location.href);
    const u=await api.auth.me(); setMe(u);
    const [sent, received, users] = await Promise.all([
      api.entities.Message.filter({ sender_id: u.id }, '-created_date', 500),
      api.entities.Message.filter({ recipient_id: u.id }, '-created_date', 500),
      api.entities.User.list('-created_date', 200),
    ]);
    const userMap=new Map(users.map(x=>[x.id,x]));
    const byUser=new Map();
    const touch=(otherId,m,mine)=>{ const ex=byUser.get(otherId)||{last:m,unread:0}; if(new Date(m.created_date)>new Date(ex.last.created_date)) ex.last=m; if(!mine&&!m.read) ex.unread+=1; byUser.set(otherId,ex); };
    [...sent,...received].forEach(m=>{ const otherId=m.sender_id===u.id?m.recipient_id:m.sender_id; touch(otherId,m,m.sender_id===u.id); });
    const list=[...byUser.entries()].map(([otherId,c])=>({ otherId, user:userMap.get(otherId), ...c })).sort((a,b)=>new Date(b.last.created_date)-new Date(a.last.created_date));
    setConvos(list);
    setLoading(false);
  })()},[]);

  if(loading) return <div className="loading">Loading messages…</div>;
  if(!me) return null;

  return <div className="page-shell max-w-2xl py-9">
    <span className="eyebrow dark">COMMUNITY</span>
    <h1 className="title">Messages</h1>
    <p className="helper">Direct messages with members you are connected with.</p>
    <section className="mt-6 panel divide-y divide-brand-line">
      {convos.length===0 && <p className="py-10 text-center text-sm text-brand-muted">No conversations yet. Message a connection from their profile.</p>}
      {convos.map(({otherId,user,last,unread})=>{
        const name=user?.full_name||'Community member';
        const initials=name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
        const mine=last.sender_id===me.id;
        return <Link key={otherId} to={`/messages/${otherId}`} className="flex items-center gap-3 rounded-xl px-2 py-3.5 hover:bg-brand-tint/40">
          {user?.avatar_url
            ? <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-brand-line"><Image src={user.avatar_url} fittingType="fill" className="h-11 w-11"/></div>
            : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-tint text-sm font-bold text-brand-teal">{initials}</div>}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-brand-ink">{name}</p>
            <Headline text={user?.headline}/>
            <p className="truncate text-sm text-brand-body">{mine?'You: ':''}{last.body}</p>
          </div>
          {unread>0 && <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-brand-navy px-1.5 text-[11px] font-bold text-white">{unread}</span>}
        </Link>;
      })}
    </section>
  </div>;
}