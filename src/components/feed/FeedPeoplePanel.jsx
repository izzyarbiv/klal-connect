import React,{useEffect,useState} from 'react';
import { api } from '@/api/client';
import { Users as UsersIcon } from 'lucide-react';
import UserCard from '@/components/UserCard';
import InviteButton from '@/components/InviteButton';
import { loadMyConnections, suggestSimilar, connectedIds } from '@/lib/connections';

export default function FeedPeoplePanel(){
  const [me,setMe]=useState();
  const [suggestions,setSuggestions]=useState(null);
  const [connections,setConnections]=useState({ sent:[], received:[], all:[] });

  const reload=async()=>{ if(me) setConnections(await loadMyConnections(me.id)); };

  useEffect(()=>{(async()=>{
    try{
      const u=await api.auth.me(); setMe(u);
      const conn=await loadMyConnections(u.id);
      setConnections(conn);
      setSuggestions(await suggestSimilar(u, u.id, [...connectedIds(conn)]));
    }catch{ setSuggestions([]); }
  })()},[]);

  const top=(suggestions||[]).slice(0,3);
  if (!suggestions) return null;

  // Nobody to suggest yet: the useful thing to offer is the way to change
  // that, not an empty module. Guests get nothing here — they have no
  // invite link and the sign-up prompt is already at the top of the feed.
  if (suggestions.length===0) {
    if (!me || me.guest) return null;
    return <div className="panel space-y-3">
      <div className="flex items-center gap-2"><UsersIcon size={15} className="text-brand-teal"/><h2 className="text-sm font-bold uppercase tracking-wide text-brand-ink">Bring your people</h2></div>
      <p className="text-sm leading-6 text-brand-body">People you may know will show up here as your community joins. Anyone who joins through your link is connected to you.</p>
      <InviteButton/>
    </div>;
  }

  return <div className="panel space-y-3">
    <div className="flex items-center gap-2"><UsersIcon size={15} className="text-brand-teal"/><h2 className="text-sm font-bold uppercase tracking-wide text-brand-ink">People you may know</h2></div>
    {top.map(s=><UserCard key={s.user.id} user={s.user} me={me} connections={connections} onReload={reload}/>)}
  </div>;
}