import React,{useState} from 'react';
import { api } from '@/api/client';
import CityInput, { StateSelect } from '@/components/CityInput';
import { Image } from '@/components/ui/image';
import { Loader2, Building2 } from 'lucide-react';
import HeadlineEdit from '@/components/HeadlineEdit';

export default function CompanyEditor({ company, onDone }){
  const [data,setData]=useState(company);
  const [busy,setBusy]=useState(false);
  const [saving,setSaving]=useState(false);

  const change=e=>setData({...data,[e.target.name]:e.target.value});
  const upload=async e=>{
    const file=e.target.files?.[0]; if(!file) return;
    setBusy(true);
    try{ const {file_url}=await api.integrations.Core.UploadFile({file}); setData({...data,logo_url:file_url}); }
    finally{ setBusy(false); }
  };
  const save=async e=>{
    e.preventDefault();
    setSaving(true);
    const {name,tagline,description,industry,website,email,phone,city,state,founded,size,logo_url,payment_link_url}=data;
    const updated=await api.entities.Company.update(company.id,{name,tagline,description,industry,website,email,phone,city,state,founded,size,logo_url,payment_link_url});
    onDone(updated);
  };

  return <form onSubmit={save} className="space-y-5">
    <section className="panel space-y-4">
      <div className="flex items-center gap-5">
        {data.logo_url
          ? <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-2 ring-brand-line"><Image src={data.logo_url} fittingType="fill" className="h-20 w-20"/></div>
          : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-brand-tint text-brand-teal"><Building2 size={28}/></div>}
        <div>
          <label className="secondary cursor-pointer">
            {busy ? <><Loader2 size={16} className="animate-spin"/>Uploading…</> : <>Change logo</>}
            <input type="file" accept="image/*" onChange={upload} className="hidden" disabled={busy}/>
          </label>
          {data.logo_url && <button type="button" onClick={()=>setData({...data,logo_url:''})} className="ml-2 text-sm font-semibold text-brand-error">Remove</button>}
        </div>
      </div>
      <Field label="Company name" name="name" value={data.name||''} onChange={change} required/>
      <HeadlineEdit label="Tagline" value={data.tagline||''} onChange={v=>setData({...data,tagline:v})} helper="Appears under your company name across the app."/>
      <label className="block">Description<textarea className="field min-h-28" name="description" value={data.description||''} onChange={change} required/></label>
      <div className="form-grid">
        <Field label="Industry" name="industry" value={data.industry||''} onChange={change}/>
        <Field label="Company size" name="size" value={data.size||''} onChange={change}/>
        <Field label="Website" name="website" value={data.website||''} onChange={change}/>
        <Field label="Email" name="email" type="email" value={data.email||''} onChange={change}/>
        <Field label="Phone" name="phone" value={data.phone||''} onChange={change}/>
        <label>City<CityInput value={data.city||''} onChange={v=>setData(d=>({...d,city:v}))} onPick={p=>setData(d=>({...d,city:p.city,state:p.region||d.state}))}/></label>
        <label>State<StateSelect value={data.state||''} onChange={v=>setData(d=>({...d,state:v}))}/></label>
        <Field label="Founded" name="founded" type="date" value={data.founded?data.founded.slice(0,10):''} onChange={change}/>
        <Field label="Payment link (optional)" name="payment_link_url" type="url" value={data.payment_link_url||''} onChange={change} placeholder="Stripe Payment Link, PayPal.me, Venmo…"/>
      </div>
    </section>
    <div className="flex gap-3">
      <button className="primary" disabled={saving}>{saving?'Saving…':'Save changes'}</button>
      <button type="button" onClick={()=>onDone(company)} className="secondary">Cancel</button>
    </div>
  </form>;
}

function Field({label,...props}){
  return <label>{label}<input className="field" {...props}/></label>;
}