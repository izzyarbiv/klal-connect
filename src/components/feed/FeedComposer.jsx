import React,{useState} from 'react';
import { api } from '@/api/client';
import { ImagePlus, Send } from 'lucide-react';
import Headline from '@/components/Headline';
import { AccountButtons } from '@/components/GuestPrompt';
import { POST_TYPES, POST_TYPE_BY_ID } from '@/lib/postTypes';
import { markEngaged } from '@/lib/engagement';

export default function FeedComposer({ onPosted, user }) {
  const [body,setBody]=useState(''),[type,setType]=useState('post'),[uploading,setUploading]=useState(false),[imgs,setImgs]=useState([]),[busy,setBusy]=useState(false),[err,setErr]=useState('');
  // Expanded on a wide screen, a single line on a phone until tapped.
  const [open,setOpen]=useState(()=>typeof window==='undefined'||window.innerWidth>=640);
  const upload=async e=>{
    setUploading(true);
    const {file_url}=await api.integrations.Core.UploadFile({file:e.target.files[0]});
    setImgs(i=>[...i,file_url]); setUploading(false);
  };
  const submit=async e=>{
    e.preventDefault();
    if(!body.trim())return;
    if(!(await api.auth.requireAccount()))return;
    setBusy(true);
    const r=await api.functions.invoke('createPost',{body,post_type:type,image_urls:imgs});
    if(r.status>=400){ setErr(r.data?.error||'Could not post'); setBusy(false); return; }
    markEngaged();
    setErr(''); setBody(''); setImgs([]); setBusy(false);
    if(window.innerWidth<640) setOpen(false);
    onPosted?.();
  };
  if(user?.guest) return <div className="panel space-y-3">
    <p className="font-semibold text-brand-ink">Join the conversation</p>
    <p className="text-sm text-brand-body">You're browsing the feed as a guest. Create a free account to post, like and comment.</p>
    <AccountButtons returnTo="/feed" compact/>
  </div>;
  // On a phone the composer stays a single line until it is tapped. Expanded,
  // it was taller than a third of the screen and the first post never
  // appeared — and most visits to a feed are to read it, not to write.
  // min-w-0 and truncate are load-bearing: a flex child will not shrink below
  // its text, so without them this button stays as wide as the placeholder and
  // stretches the whole page past the edge of the screen.
  if(!open) return <button type="button" onClick={()=>setOpen(true)} className="flex w-full min-w-0 items-center gap-3 rounded-xl bg-brand-surface p-3 text-left ring-1 ring-brand-line sm:hidden">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-tint text-xs font-bold text-brand-teal">{(user?.full_name||'You').split(' ').map(x=>x[0]).slice(0,2).join('')}</span>
    <span className="min-w-0 flex-1 truncate text-sm text-brand-muted">Share something with the klal…</span>
    <span className="shrink-0 rounded-full bg-brand-navy p-2 text-white"><Send size={15}/></span>
  </button>;

  return <form onSubmit={submit} className="panel space-y-3">
    <div className="flex gap-3">
      <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-tint text-sm font-bold text-brand-teal sm:grid">You</div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 hidden sm:block"><p className="text-sm font-semibold text-brand-ink">{user?.full_name||'You'}</p><Headline text={user?.headline}/></div>
        <div className="mb-2 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">{POST_TYPES.map(t=><button type="button" key={t.id} onClick={()=>setType(t.id)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${type===t.id?'bg-brand-navy text-white':'bg-brand-tint text-brand-body hover:text-brand-ink'}`}>{t.label}</button>)}</div>
        <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder={POST_TYPE_BY_ID[type]?.placeholder} autoFocus className="min-h-16 w-full resize-none rounded-lg border border-brand-line bg-brand-canvas px-4 py-3 text-sm outline-none focus:border-[#0D6B66] sm:min-h-20"/>
      </div>
    </div>
    {imgs.length>0&&<div className="flex gap-2 sm:pl-14">{imgs.map(u=><img key={u} src={u} className="h-16 w-16 rounded-lg object-cover"/>)}</div>}
    <div className="flex items-center justify-between sm:pl-14">
      <div className="flex items-center gap-2">
        <label className="icon-button cursor-pointer"><ImagePlus size={18}/><input type="file" accept="image/*" onChange={upload} className="hidden"/></label>
        {uploading&&<span className="text-xs text-brand-body">Uploading…</span>}
      </div>
      <div className="flex items-center gap-2">{err&&<span className="text-xs font-semibold text-brand-error">{err}</span>}<button type="button" onClick={()=>{setOpen(false);setBody('');}} className="text-xs font-medium text-brand-muted hover:text-brand-ink sm:hidden">Cancel</button><button disabled={busy||!body.trim()} className="primary"><Send size={15}/>{type==='question'?'Ask':'Post'}</button></div>
    </div>
  </form>;
}