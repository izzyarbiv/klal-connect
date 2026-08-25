import React,{useEffect,useState} from 'react';
import { api } from '@/api/client';
import HeadlineEdit from '@/components/HeadlineEdit';

export default function ManageListings({user}){
  const [items,setItems]=useState([]);
  const [selected,setSelected]=useState('');
  const [changes,setChanges]=useState('');
  const [done,setDone]=useState(false);
  const [taglineFor,setTaglineFor]=useState({});
  const [savingId,setSavingId]=useState(null);
  const [savedId,setSavedId]=useState(null);

  useEffect(()=>{api.entities.Provider.filter({created_by_id:user.id}).then(setItems)},[user.id]);

  const submit=async e=>{
    e.preventDefault();
    const p=items.find(x=>x.id===selected);
    await api.entities.ListingChangeRequest.create({provider_id:selected,provider_name:p.name,changes,status:'pending'});
    setChanges('');setDone(true);
  };

  const saveTagline=async(id)=>{
    setSavingId(id);
    try{
      const r=await api.functions.invoke('updateListingTagline',{provider_id:id,tagline:taglineFor[id]||''});
      if(r.status<400){ setItems(items.map(x=>x.id===id?r.data.provider:x)); setSavedId(id); setTimeout(()=>setSavedId(null),1500); }
    }finally{ setSavingId(null); }
  };

  return <section className="panel mt-6 space-y-5">
    <h2 className="section-title">Manage my listings</h2>
    {items.length===0
      ? <p className="text-sm">You do not have a submitted listing yet.</p>
      : <>
        <div className="space-y-4">
          {items.map(p=>(
            <div key={p.id} className="space-y-2 rounded-2xl border border-brand-line p-4">
              <div className="flex items-center justify-between"><p className="font-semibold text-brand-ink">{p.name}</p><span className="text-xs font-semibold text-brand-muted">{p.status}</span></div>
              <HeadlineEdit label="Tagline" value={taglineFor[p.id]!=null?taglineFor[p.id]:(p.tagline||'')} onChange={v=>setTaglineFor({...taglineFor,[p.id]:v})} helper="Appears under your listing name across the app."/>
              <button onClick={()=>saveTagline(p.id)} disabled={savingId===p.id} className="primary text-sm">{savingId===p.id?'Saving…':'Save tagline'}{savedId===p.id?' ✓':''}</button>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-3 border-t border-brand-line pt-4">
          <h3 className="font-semibold text-brand-ink">Request a larger change</h3>
          <p className="helper">Significant changes are sent to the administrative team before publication.</p>
          <select required className="field" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose your listing</option>{items.map(p=><option key={p.id} value={p.id}>{p.name} — {p.status}</option>)}</select>
          <textarea required className="field min-h-24" value={changes} onChange={e=>setChanges(e.target.value)} placeholder="Describe the information you would like updated."/>
          <button className="primary">Request listing update</button>
          {done&&<p className="success p-3">Your update has been sent for review.</p>}
        </form>
      </>}
  </section>;
}