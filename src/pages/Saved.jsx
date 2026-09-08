import React,{useEffect,useState} from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Bookmark,Phone,MessageCircle,Share2,Trash2 } from 'lucide-react';
import Headline from '@/components/Headline';
import GuestPrompt from '@/components/GuestPrompt';
import { postExcerpt } from '@/lib/postTypes';
import { timeAgo, fullDate } from '@/lib/time';
export default function Saved(){const [items,setItems]=useState(null),[posts,setPosts]=useState([]);
useEffect(()=>{(async()=>{
  if(!await api.auth.isAuthenticated())return api.auth.redirectToLogin(location.href);
  if(!(await api.auth.hasAccount())){setItems('guest');return;}
  const [saves,savedPosts]=await Promise.all([api.entities.SavedProvider.list('-created_date'),api.entities.SavedPost.list('-created_date')]);
  // A saved post that has since been deleted is simply gone from the list.
  const [providers,found]=await Promise.all([
    Promise.all(saves.map(s=>api.entities.Provider.get(s.provider_id))),
    Promise.all(savedPosts.map(s=>api.entities.FeedPost.get(s.post_id).catch(()=>null))),
  ]);
  setPosts(savedPosts.map((s,i)=>({...s,post:found[i]})).filter(x=>x.post));
  setItems(saves.map((s,i)=>({...s,provider:providers[i]})));
})()},[]);
const remove=async item=>{await api.entities.SavedProvider.delete(item.id);setItems(items.filter(x=>x.id!==item.id))};
const unsave=async x=>{let r=await api.functions.invoke('toggleSavePost',{post_id:x.post_id});if(r.status>=400)return;
// The toggle re-saved it: this row had already been unsaved somewhere else. Toggle once more so the outcome is "not saved".
if(r.data?.saved){r=await api.functions.invoke('toggleSavePost',{post_id:x.post_id});if(r.status>=400)return;}
setPosts(ps=>ps.filter(p=>p.id!==x.id));};
if(!items)return <div className="loading">Loading saved resources…</div>;if(items==='guest')return <GuestPrompt title="Save resources with an account" body="You're browsing as a guest. Create a free account to keep a list of the resources you want to come back to."/>;return <div className="page-shell py-9"><span className="eyebrow dark">YOUR COLLECTION</span><h1 className="title text-3xl">Saved resources</h1><p className="helper mb-7">Organized by category for quick access.</p>{items.length===0?<div className="empty"><Bookmark/><p>You haven’t saved any providers yet.</p></div>:Object.entries(Object.groupBy?Object.groupBy(items,x=>x.category||'Other'):items.reduce((a,x)=>({...a,[x.category||'Other']:[...(a[x.category||'Other']||[]),x]}),{})).map(([cat,list])=><section key={cat} className="mb-8"><h2 className="section-title mb-3">{cat}</h2><div className="space-y-3">{list.map(x=><div key={x.id} className="panel flex items-center justify-between gap-3"><div><a href={`/provider/${x.provider_id}`} className="font-bold">{x.provider_name}</a><Headline text={x.provider?.tagline}/><p className="text-sm text-brand-muted">{x.provider?.city}</p></div><div className="flex gap-1"><a className="icon-button" href={`tel:${x.provider?.phone}`}><Phone/></a><a className="icon-button" href={`sms:${x.provider?.text_phone||x.provider?.phone}`}><MessageCircle/></a><button className="icon-button" onClick={()=>navigator.share?.({title:x.provider_name,url:`${location.origin}/provider/${x.provider_id}`})}><Share2/></button><button className="icon-button" onClick={()=>remove(x)}><Trash2/></button></div></div>)}</div></section>)}
<section className="mt-10">
  <h2 className="section-title mb-3">Saved posts</h2>
  {posts.length===0?<p className="helper">Posts you save from the “…” menu on the feed will be kept here.</p>:<div className="space-y-3">{posts.map(x=><div key={x.id} className="panel flex items-center justify-between gap-3">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2 text-sm"><span className="font-bold text-brand-ink">{x.post.author_name||'Community member'}</span><time dateTime={x.post.created_date} title={fullDate(x.post.created_date)} className="text-xs text-brand-muted">{timeAgo(x.post.created_date)}</time></div>
      <Link to={`/feed?post=${encodeURIComponent(x.post_id)}`} className="block text-sm leading-6 text-brand-body hover:text-brand-ink">{postExcerpt(x.post.body,140)||'View post'}</Link>
    </div>
    <button type="button" className="icon-button" aria-label="Remove from saved posts" title="Remove from saved posts" onClick={()=>unsave(x)}><Trash2/></button>
  </div>)}</div>}
</section>
</div>}
