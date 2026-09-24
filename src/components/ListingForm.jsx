import React,{useEffect,useState} from 'react';
import { api } from '@/api/client';
import ListingLocationPicker from '@/components/ListingLocationPicker';
import CityInput, { StateSelect } from '@/components/CityInput';
import HeadlineEdit from '@/components/HeadlineEdit';
import { badgesForCategory } from '@/lib/badges';
const blank={name:'',tagline:'',category:'',subcategory:'',short_description:'',description:'',address:'',city:'',state:'',zip:'',phone:'',text_phone:'',email:'',website:'',hours:'',service_areas:'',languages:'English',delivery_mode:'in_person',whatsapp:'',payment_link_url:'',badges:[]};
// initialCategory arrives from /add?category=… — an empty category tile on the
// homepage asking for the first listing of that kind.
export default function ListingForm({initialCategory=''}){const [data,setData]=useState(()=>({...blank,category:initialCategory})),[categories,setCategories]=useState([]),[done,setDone]=useState(false),[logo,setLogo]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);useEffect(()=>{api.entities.Category.list('order').then(setCategories)},[]);const change=e=>setData({...data,[e.target.name]:e.target.value});const upload=async e=>{const {file_url}=await api.integrations.Core.UploadFile({file:e.target.files[0]});setLogo(file_url)};const submit=async e=>{e.preventDefault();if(busy)return;if (!(await api.auth.requireAccount())) return;setBusy(true);setErr('');const r=await api.functions.invoke('createListing',{...data,logo_url:logo,service_areas:data.service_areas.split(',').map(x=>x.trim()).filter(Boolean),languages:data.languages.split(',').map(x=>x.trim())});if(r.status>=400){setErr(r.data?.error||'Could not submit');setBusy(false);return;}setDone(r.data?.provider||true)};if(done)return <div className="success p-6">Your listing is live. Thank you for helping our community grow — {done.id?<a className="underline" href={`/provider/${done.id}`}>see it in the directory</a>:'find it in the directory'}, share it on WhatsApp, and ask people who know your work to vouch for it.</div>;return <form onSubmit={submit} className="space-y-5"><div className="form-grid"><Field label="Business or resource name" name="name" value={data.name} onChange={change} required/><label>Category<select className="field" name="category" value={data.category} onChange={change} required><option value="">Choose a category</option>{categories.map(c=><option key={c.id}>{c.name}</option>)}</select></label><Field label="Subcategory" name="subcategory" value={data.subcategory} onChange={change}/><Field label="Short description" name="short_description" value={data.short_description} onChange={change} required/><label>City<CityInput value={data.city} onChange={v=>setData(d=>({...d,city:v}))} onPick={p=>setData(d=>({...d,city:p.city,state:p.region||d.state,latitude:p.latitude,longitude:p.longitude,country_code:p.country_code||d.country_code}))} required/></label><label>State<StateSelect value={data.state} onChange={v=>setData(d=>({...d,state:v}))}/></label><Field label="ZIP code" name="zip" value={data.zip} onChange={change}/><Field label="Address (optional)" name="address" value={data.address} onChange={change}/><Field label="Phone" name="phone" value={data.phone} onChange={change}/><Field label="Text-enabled phone" name="text_phone" value={data.text_phone} onChange={change}/><Field label="WhatsApp number (with country code)" name="whatsapp" value={data.whatsapp} onChange={change} placeholder="1 732 555 0100"/><Field label="Payment link (optional)" name="payment_link_url" value={data.payment_link_url} onChange={change} placeholder="Stripe Payment Link, PayPal.me, Venmo…"/><Field label="Email" name="email" type="email" value={data.email} onChange={change}/><Field label="Website" name="website" value={data.website} onChange={change}/><Field label="Hours" name="hours" value={data.hours} onChange={change}/><Field label="Areas served (comma separated)" name="service_areas" value={data.service_areas} onChange={change}/><Field label="Languages (comma separated)" name="languages" value={data.languages} onChange={change}/><label>Service format<select className="field" name="delivery_mode" value={data.delivery_mode} onChange={change}><option value="in_person">In person</option><option value="remote">Remote</option><option value="both">Both</option></select></label></div><HeadlineEdit label="Tagline" value={data.tagline||''} onChange={v=>setData({...data,tagline:v})} helper="Appears under your listing name across the app."/>
<ListingLocationPicker value={data} onChange={loc=>setData(d=>({...d,...loc}))}/>
<BadgePicker category={data.category} value={data.badges} onChange={badges=>setData(d=>({...d,badges}))}/>
<label className="block">Full description<textarea className="field min-h-32" name="description" value={data.description} onChange={change} required/></label><label className="block">Logo or main image<input type="file" accept="image/*" onChange={upload} className="field"/></label>{err&&<p className="text-sm font-semibold text-brand-error">{err}</p>}<button disabled={busy} className="primary w-full sm:w-auto disabled:opacity-60">{busy?'Publishing…':'Publish my listing'}</button></form>}
function Field({label,...props}){return <label>{label}<input className="field" {...props}/></label>}

// Only the badges this kind of business can honestly claim. Changing the
// category re-offers the list and drops anything that no longer applies, so a
// listing cannot keep a badge from a trade it left.
export function BadgePicker({ category, value = [], onChange }){
  const { specific, universal, all } = badgesForCategory(category);
  useEffect(()=>{
    const allowed = new Set(all.map(b=>b.id));
    const kept = value.filter(id=>allowed.has(id));
    if(kept.length!==value.length) onChange(kept);
  },[category]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle=(id,on)=>onChange(on?[...value,id]:value.filter(x=>x!==id));
  const Row=({b})=><label className="flex items-start gap-2 text-sm text-brand-body"><input type="checkbox" className="mt-1" checked={value.includes(b.id)} onChange={e=>toggle(b.id,e.target.checked)}/><span><span className="font-medium text-brand-ink">{b.label}</span>{b.hint&&<span className="block text-xs text-brand-muted">{b.hint}</span>}</span></label>;
  return <fieldset className="rounded-lg border border-brand-line p-4">
    <legend className="px-1 text-sm font-semibold text-brand-ink">Community badges</legend>
    {!category
      ? <p className="helper mt-0">Choose a category above and the badges for that kind of business appear here.</p>
      : <>
        <p className="helper mt-0">Tick what applies to {category.toLowerCase()}. Claims like Shomer Shabbos or kashrus read as self-declared until Klal confirms them.</p>
        {specific.length>0&&<div className="mt-3 grid gap-2 sm:grid-cols-2">{specific.map(b=><Row key={b.id} b={b}/>)}</div>}
        {universal.length>0&&<><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-muted">Any listing</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{universal.map(b=><Row key={b.id} b={b}/>)}</div></>}
      </>}
  </fieldset>;
}