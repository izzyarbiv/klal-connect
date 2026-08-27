import React,{useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { Image } from '@/components/ui/image';
import { Loader2, Building2 } from 'lucide-react';
import { uniqueSlugFor } from '@/lib/paths';

const blank={name:'',tagline:'',description:'',industry:'',website:'',email:'',phone:'',city:'',state:'',founded:'',size:''};

export default function CreateCompany(){
  const [data,setData]=useState(blank);
  const [logo,setLogo]=useState('');
  const [busy,setBusy]=useState(false);
  const [saving,setSaving]=useState(false);
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
    if(!await api.auth.isAuthenticated()) return api.auth.redirectToLogin(location.href);
    setSaving(true);
    const slug=await uniqueSlugFor(api.entities.Company,data.name);
    const c=await api.entities.Company.create({...data,slug,logo_url:logo,status:'published'});
    navigate(`/company/${c.slug||c.id}`);
  };

  return <div className="page-shell max-w-2xl py-9">
    <span className="eyebrow dark">NEW PAGE</span>
    <h1 className="title text-3xl">Create a company page</h1>
    <p className="helper mb-7">A company page gives your business its own presence on Klal — separate from your personal profile, just like LinkedIn.</p>
    <form onSubmit={submit} className="space-y-5">
      <section className="panel space-y-4">
        <div className="flex items-center gap-5">
          {logo
            ? <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-2 ring-brand-line"><Image src={logo} fittingType="fill" className="h-20 w-20"/></div>
            : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-brand-tint text-brand-teal"><Building2 size={28}/></div>}
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
          <Field label="City" name="city" value={data.city} onChange={change}/>
          <Field label="State" name="state" value={data.state} onChange={change}/>
          <Field label="Founded" name="founded" type="date" value={data.founded} onChange={change}/>
        </div>
      </section>
      <button className="primary" disabled={saving}>{saving ? 'Creating…' : 'Create company page'}</button>
    </form>
  </div>;
}

function Field({label,...props}){
  return <label>{label}<input className="field" {...props}/></label>;
}