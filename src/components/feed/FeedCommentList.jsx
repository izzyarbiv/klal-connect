import React,{useEffect,useState} from 'react';
import { api } from '@/api/client';
import { Send } from 'lucide-react';
import Headline from '@/components/Headline';

export default function FeedCommentList({ postId, user, authorId, onCount }) {
  const [comments,setComments]=useState([]),[text,setText]=useState(''),[busy,setBusy]=useState(false),[err,setErr]=useState('');
  const load=()=>api.entities.Comment.filter({post_id:postId},'-created_date').then(c=>{setComments(c);onCount?.(c.length);});
  useEffect(()=>{load();},[postId]);
  const submit=async e=>{
    e.preventDefault();
    if(!text.trim())return;
    if(!user)return api.auth.redirectToLogin(location.href);
    setBusy(true);
    const r=await api.functions.invoke('createComment',{post_id:postId,body:text});
    if(r.status>=400){setErr(r.data?.error||'Action unavailable');setBusy(false);return;}
    setErr('');setText('');setBusy(false);load();
  };
  return <div className="space-y-3 pt-1">
    {comments.map(c=><div key={c.id} className="flex gap-2 rounded-2xl bg-[#F5F8F5] p-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[#0D6B66]">{(c.author_name||' KC').split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><p className="text-xs font-semibold text-[#173B45]">{c.author_name||'Community member'}</p><Headline text={c.author_headline} className="text-[11px]"/><p className="text-sm leading-6 text-[#3B524C]">{c.body}</p></div></div>)}
    {comments.length===0&&<p className="text-xs text-[#758680]">No comments yet.</p>}
    {err&&<p className="text-xs font-semibold text-brand-error">{err}</p>}
    <form onSubmit={submit} className="flex gap-2"><input value={text} onChange={e=>setText(e.target.value)} placeholder="Add a comment…" className="flex-1 rounded-xl border border-brand-line bg-brand-surface px-3 py-2 text-sm text-brand-ink outline-none placeholder:text-brand-muted focus:border-brand-teal"/><button disabled={busy||!text.trim()} className="primary px-3"><Send size={15}/></button></form>
  </div>;
}