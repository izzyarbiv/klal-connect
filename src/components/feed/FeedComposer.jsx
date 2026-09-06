import React,{useState} from 'react';
import { api } from '@/api/client';
import { ImagePlus, Send } from 'lucide-react';
import Headline from '@/components/Headline';
import { AccountButtons } from '@/components/GuestPrompt';

export default function FeedComposer({ onPosted, user }) {
  const [body,setBody]=useState(''),[type,setType]=useState('post'),[uploading,setUploading]=useState(false),[imgs,setImgs]=useState([]),[busy,setBusy]=useState(false),[err,setErr]=useState('');
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
    setErr(''); setBody(''); setImgs([]); setBusy(false);
    onPosted?.();
  };
  if(user?.guest) return <div className="panel space-y-3">
    <p className="font-semibold text-brand-ink">Join the conversation</p>
    <p className="text-sm text-brand-body">You're browsing the feed as a guest. Create a free account to post, like and comment.</p>
    <AccountButtons returnTo="/feed" compact/>
  </div>;
  return <form onSubmit={submit} className="panel space-y-3">
    <div className="flex gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-tint text-sm font-bold text-brand-teal">You</div>
      <div className="flex-1">
        <div className="mb-1"><p className="text-sm font-semibold text-brand-ink">{user?.full_name||'You'}</p><Headline text={user?.headline}/></div>
        <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Share a business update, post a job, ask the community, or promote your service…" className="min-h-20 w-full resize-none rounded-2xl border border-brand-line bg-brand-canvas px-4 py-3 text-sm outline-none focus:border-[#0D6B66]"/>
      </div>
    </div>
    {imgs.length>0&&<div className="flex gap-2 pl-14">{imgs.map(u=><img key={u} src={u} className="h-16 w-16 rounded-lg object-cover"/>)}</div>}
    <div className="flex items-center justify-between pl-14">
      <div className="flex items-center gap-2">
        <select value={type} onChange={e=>setType(e.target.value)} className="rounded-lg border border-brand-line bg-brand-surface px-2 py-1.5 text-xs font-semibold text-brand-ink">
          <option value="post">Post</option><option value="promotion">Promotion</option><option value="question">Question</option>
        </select>
        <label className="icon-button cursor-pointer"><ImagePlus size={18}/><input type="file" accept="image/*" onChange={upload} className="hidden"/></label>
        {uploading&&<span className="text-xs text-brand-body">Uploading…</span>}
      </div>
      <div className="flex items-center gap-2">{err&&<span className="text-xs font-semibold text-brand-error">{err}</span>}<button disabled={busy||!body.trim()} className="primary"><Send size={15}/>Post</button></div>
    </div>
  </form>;
}