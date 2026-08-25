import React,{useEffect,useState} from 'react';
import { api } from '@/api/client';
import { Users as UsersIcon } from 'lucide-react';
import UserCard from '@/components/UserCard';
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

  return <div className="panel space-y-3">
    <div className="flex items-center gap-2"><UsersIcon size={15} className="text-brand-teal"/><h2 className="text-sm font-bold uppercase tracking-wide text-brand-ink">People you may know</h2></div>
    {!suggestions && <p className="text-sm text-brand-body">Loading…</p>}
    {suggestions?.length===0 && <p className="text-sm leading-6 text-brand-muted">As more community members join, you'll see people you may know here.</p>}
    {top.map(s=><UserCard key={s.user.id} user={s.user} me={me} connections={connections} onReload={reload}/>)}
  </div>;
}