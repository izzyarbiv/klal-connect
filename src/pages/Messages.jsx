import React,{useEffect,useState} from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Image } from '@/components/ui/image';
import Headline from '@/components/Headline';
import { loadMyConnections, connectedIds } from '@/lib/connections';
import { membersByIds } from '@/lib/members';
import GuestPrompt from '@/components/GuestPrompt';

export default function Messages(){
  const [me,setMe]=useState();
  const [convos,setConvos]=useState([]);
  const [connections,setConnections]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{(async()=>{
    if(!await api.auth.isAuthenticated()) return api.auth.redirectToLogin(location.href);
    const u=await api.auth.me(); setMe(u);
    if(u.guest){ setLoading(false); return; }
    const [sent, received, myConnections] = await Promise.all([
      api.entities.Message.filter({ sender_id: u.id }, '-created_date', 500),
      api.entities.Message.filter({ recipient_id: u.id }, '-created_date', 500),
      loadMyConnections(u.id),
    ]);
    const byUser=new Map();
    const touch=(otherId,m,mine)=>{ const ex=byUser.get(otherId)||{last:m,unread:0}; if(new Date(m.created_date)>new Date(ex.last.created_date)) ex.last=m; if(!mine&&!m.read) ex.unread+=1; byUser.set(otherId,ex); };
    [...sent,...received].forEach(m=>{ const otherId=m.sender_id===u.id?m.recipient_id:m.sender_id; touch(otherId,m,m.sender_id===u.id); });
    // Everyone you are connected to, so a conversation can be started here
    // rather than only from a profile page.
    const accepted = { ...myConnections, all: myConnections.all.filter(c => c.status === 'accepted') };
    const connIds = [...connectedIds(accepted)].filter(id => id !== u.id);

    // Names and faces for exactly the people on this screen. This used to read
    // them out of a 200-row page of the directory, which stops working at 200
    // members — and not gracefully: a conversation lost its name, and any
    // connection outside that window disappeared from the list below, so there
    // was no way left to message them.
    const userMap = await membersByIds([...byUser.keys(), ...connIds]);

    const list=[...byUser.entries()].map(([otherId,c])=>({ otherId, user:userMap.get(otherId), ...c })).sort((a,b)=>new Date(b.last.created_date)-new Date(a.last.created_date));
    setConvos(list);
    setConnections(
      connIds
        .map(id => userMap.get(id))
        .filter(Boolean)
        .sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || '')))
    );
    setLoading(false);
  })()},[]);

  if(loading) return <div className="loading">Loading messages…</div>;
  if(me?.guest) return <GuestPrompt title="Messages are for members" body="Create a free account to connect with people and message them privately."/>;
  if(!me) return null;

  return <div className="page-shell max-w-2xl py-9">
    <span className="eyebrow dark">COMMUNITY</span>
    <h1 className="title">Messages</h1>
    <p className="helper">Direct messages with members you are connected with.</p>
    <section className="mt-6 panel divide-y divide-brand-line">
      {convos.length===0 && <p className="py-10 text-center text-sm text-brand-muted">No conversations yet — start one with a connection below.</p>}
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

    <section className="mt-8">
      <h2 className="section-title">Your connections</h2>
      <p className="helper mb-3">Message anyone you are connected with.</p>
      {connections.length===0
        ? <div className="empty"><p>No connections yet. Find people in <Link to="/people" className="font-semibold underline">People</Link>.</p></div>
        : <div className="panel divide-y divide-brand-line">
            {connections.map(person=>{
              const name=person.full_name||'Community member';
              const initials=name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
              return <div key={person.id} className="flex items-center gap-3 px-2 py-3">
                {person.avatar_url
                  ? <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-brand-line"><Image src={person.avatar_url} fittingType="fill" className="h-10 w-10"/></div>
                  : <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-tint text-xs font-bold text-brand-teal">{initials}</div>}
                <div className="min-w-0 flex-1">
                  <Link to={`/profile/${person.id}`} className="truncate font-semibold text-brand-ink hover:underline">{name}</Link>
                  <Headline text={person.headline}/>
                </div>
                <Link to={`/messages/${person.id}`} className="shrink-0 rounded-xl border border-brand-line bg-brand-surface px-3 py-1.5 text-xs font-semibold text-brand-ink hover:bg-brand-tint">Message</Link>
              </div>;
            })}
          </div>}
    </section>
  </div>;
}