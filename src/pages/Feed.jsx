import React,{useEffect,useState} from 'react';
import { api } from '@/api/client';
import FeedComposer from '@/components/feed/FeedComposer';
import FeedPostItem from '@/components/feed/FeedPostItem';
import FeedPromotedPanel from '@/components/feed/FeedPromotedPanel';
import FeedPeoplePanel from '@/components/feed/FeedPeoplePanel';
import { FEED_FILTERS } from '@/lib/postTypes';

export default function Feed(){
  const [posts,setPosts]=useState(null),[user,setUser]=useState(null),[loading,setLoading]=useState(true),[filter,setFilter]=useState('all');
  const visible=posts?.filter(p=>filter==='all'||(p.post_type||'post')===filter);
  const load=()=>api.entities.FeedPost.list('-created_date',50).then(setPosts).finally(()=>setLoading(false));
  useEffect(()=>{(async()=>{if(!await api.auth.isAuthenticated())return api.auth.redirectToLogin(location.href);try{setUser(await api.auth.me());}catch{}load();})();},[]);
  return <div className="page-shell py-7">
    <div className="mb-5"><span className="eyebrow dark">KLAL FEED</span><h1 className="title">Community business feed</h1><p className="helper">Post updates, promote your business, ask the klal, and find what's happening near you.</p></div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <FeedComposer onPosted={load} user={user}/>
        <div className="flex flex-wrap gap-1.5">{FEED_FILTERS.map(f=><button key={f.id} type="button" onClick={()=>setFilter(f.id)} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter===f.id?'bg-brand-navy text-white':'bg-brand-surface text-brand-body ring-1 ring-brand-line hover:text-brand-ink'}`}>{f.label}</button>)}</div>
        {loading&&<div className="loading">Loading feed…</div>}
        {!loading&&posts?.length===0&&<div className="empty"><p>Be the first to post to the Klal feed.</p></div>}
        {!loading&&posts?.length>0&&visible?.length===0&&<div className="empty"><p>Nothing here yet — try another filter.</p></div>}
        {visible?.map(p=><FeedPostItem key={p.id} post={p} user={user}/>)}
      </div>
      <aside className="hidden space-y-5 lg:block">
        <FeedPromotedPanel/>
        <FeedPeoplePanel/>
      </aside>
    </div>
  </div>;
}