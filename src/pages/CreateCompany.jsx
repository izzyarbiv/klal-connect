import React,{useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import CityInput, { StateSelect } from '@/components/CityInput';
import { Image } from '@/components/ui/image';
import { Loader2, Building2 } from 'lucide-react';
import { uniqueSlugFor } from '@/lib/paths';

const blank={name:'',tagline:'',description:'',industry:'',website:'',email:'',phone:'',city:'',state:'',founded:'',size:''};

export default function CreateCompany(){
  const [data,setData]=useState(blank);
  const [logo,setLogo]=useState('');
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState(''),[saving,setSaving]=useState(false);
  const navigate=useNavigate();

  const change=e=>setData({...data,[e.target.name]:e.target.value});
  const upload=async e=>{
    const file=e.target.files?.[0]; if(!file) return;
    setBusy(true);
    try{ const {file_url}=await api.integrations.Core.UploadFile({file}); setLogo(file_url); }
    finally{ setBusy(false); }
  };
  const submit=async e=>{
    e.preventDefault();
    if(saving) return;
    if(!(await api.auth.requireAccount())) return;
    setSaving(true);
    try{
      const slug=await uniqueSlugFor(api.entities.Company,data.name);
      const c=await api.entities.Company.create({...data,slug,logo_url:logo,status:'published'});
      navigate(`/company/${c.slug||c.id}`);
    }catch(ex){
      // Without this the button stayed disabled and the page looked frozen.
      setErr(ex.message||'Could not create the page. Please try again.');
      setSaving(false);
    }
  };

  return <div className="page-shell max-w-2xl py-9">
    <span className="eyebrow">NEW PAGE</span>
    <h1 className="title text-3xl">Create a company page</h1>
    <p className="helper mb-7">A company page gives your business its own presence on Klal — separate from your personal profile, just like LinkedIn.</p>
    <form onSubmit={submit} className="space-y-5">
      <section className="panel space-y-4">
        <div className="flex items-center gap-5">
          {logo
            ? <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg ring-2 ring-brand-line"><Image src={logo} fittingType="fill" className="h-20 w-20"/></div>
            : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-brand-tint text-brand-teal"><Building2 size={28}/></div>}
          <div>
            <label className="secondary cursor-pointer">
              {busy ? <><Loader2 size={16} className="animate-spin"/>Uploading…</> : <>Upload logo</>}
              <input type="file" accept="image/*" onChange={upload} className="hidden" disabled={busy}/>
            </label>
            {logo && <button type="button" onClick={()=>setLogo('')} className="ml-2 text-sm font-semibold text-brand-error">Remove</button>}
          </div>
        </div>
        <Field label="Company name" name="name" value={data.name} onChange={change} required/>
        <Field label="Tagline" name="tagline" value={data.tagline} onChange={change} placeholder="A short one-liner"/>
        <label className="block">Description<textarea className="field min-h-28" name="description" value={data.description} onChange={change} required placeholder="What does your company do?"/></label>
        <div className="form-grid">
          <Field label="Industry" name="industry" value={data.industry} onChange={change} placeholder="e.g. Catering"/>
          <Field label="Company size" name="size" value={data.size} onChange={change} placeholder="e.g. 1-10 employees"/>
          <Field label="Website" name="website" value={data.website} onChange={change}/>
          <Field label="Email" name="email" type="email" value={data.email} onChange={change}/>
          <Field label="Phone" name="phone" value={data.phone} onChange={change}/>
          <label>City<CityInput value={data.city||''} onChange={v=>setData(d=>({...d,city:v}))} onPick={p=>setData(d=>({...d,city:p.city,state:p.region||d.state}))}/></label>
          <label>State<StateSelect value={data.state||''} onChange={v=>setData(d=>({...d,state:v}))}/></label>
          <Field label="Founded" name="founded" type="date" value={data.founded} onChange={change}/>
          <Field label="Payment link (optional)" name="payment_link_url" type="url" value={data.payment_link_url||''} onChange={change} placeholder="Stripe Payment Link, PayPal.me, Venmo…"/>
        </div>
      </section>
      {err && <p className="text-sm font-semibold text-brand-error">{err}</p>}
        <button className="primary" disabled={saving}>{saving ? 'Creating…' : 'Create company page'}</button>
    </form>
  </div>;
}

function Field({label,...props}){
  return <label>{label}<input className="field" {...props}/></label>;
}