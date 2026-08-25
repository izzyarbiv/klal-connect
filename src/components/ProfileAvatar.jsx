import React,{useState} from 'react';
import { api } from '@/api/client';
import { Image } from '@/components/ui/image';
import { Camera, Loader2 } from 'lucide-react';

export default function ProfileAvatar({ user, value, onChange }){
  const [busy,setBusy]=useState(false);
  const upload=async e=>{
    const file=e.target.files?.[0];
    if(!file) return;
    setBusy(true);
    try{
      const {file_url}=await api.integrations.Core.UploadFile({file});
      onChange(file_url);
    }finally{ setBusy(false); }
  };
  const initials=(user.full_name||user.email||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
  return <div className="flex items-center gap-5">
    {value
      ? <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full ring-2 ring-brand-line"><Image src={value} fittingType="fill" className="h-24 w-24"/></div>
      : <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-brand-tint text-2xl font-bold text-brand-teal ring-2 ring-brand-line">{initials}</div>}
    <div>
      <label className="secondary cursor-pointer">
        {busy ? <><Loader2 size={16} className="animate-spin"/>Uploading…</> : <><Camera size={16}/>Change photo</>}
        <input type="file" accept="image/*" onChange={upload} className="hidden" disabled={busy}/>
      </label>
      {value && <button type="button" onClick={()=>onChange('')} className="ml-2 text-sm font-semibold text-brand-error">Remove</button>}
      <p className="helper mt-2">JPG or PNG. Shown on your profile.</p>
    </div>
  </div>;
}