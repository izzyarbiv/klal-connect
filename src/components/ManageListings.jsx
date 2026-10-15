import React,{useEffect,useState} from 'react';
import { api } from '@/api/client';
import HeadlineEdit from '@/components/HeadlineEdit';
import CompletenessRing from '@/components/CompletenessRing';
import { listingCompleteness } from '@/lib/completeness';
import { listingEditor, isListingStaff } from '@/lib/listing';

export default function ManageListings({user}){
  const [items,setItems]=useState([]);
  const [selected,setSelected]=useState('');
  const [changes,setChanges]=useState('');
  const [done,setDone]=useState(false);
  const [taglineFor,setTaglineFor]=useState({});
  const [paymentLinkFor,setPaymentLinkFor]=useState({});
  const [savingId,setSavingId]=useState(null);
  const [savedId,setSavedId]=useState(null);
  const [payErrFor,setPayErrFor]=useState({});

  // Both sides of a handover: a listing you claimed appears here, and one you
  // added that someone else has since claimed drops off — it is theirs to edit
  // now. Listing only by created_by_id showed the wrong set in both directions.
  useEffect(()=>{(async()=>{
    const [added,claimed]=await Promise.all([
      api.entities.Provider.filter({created_by_id:user.id}).catch(()=>[]),
      api.entities.Provider.filter({owner_id:user.id}).catch(()=>[]),
    ]);
    const mine=new Map();
    for(const p of [...added,...claimed]) if(listingEditor(p)===user.id) mine.set(p.id,p);
    setItems([...mine.values()]);
  })()},[user.id]);

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

  const savePaymentLink=async(id)=>{
    setSavingId(id); setPayErrFor({...payErrFor,[id]:''});
    try{
      const r=await api.functions.invoke('updateListingPaymentLink',{provider_id:id,payment_link_url:paymentLinkFor[id]||''});
      if(r.status<400){ setItems(items.map(x=>x.id===id?r.data.provider:x)); setSavedId(id); setTimeout(()=>setSavedId(null),1500); }
      else setPayErrFor({...payErrFor,[id]:r.data?.error||'Could not save that link.'});
    }finally{ setSavingId(null); }
  };

  return <section className="panel mt-6 space-y-5">
    <h2 className="section-title">Manage my listings</h2>
    {/* Staff may edit any listing, but this list stays "mine": the whole
        directory under a heading that says "my listings" would be the wrong
        set, and nothing anyone needs to scroll. The way in is the listing
        page, where the edit link shows for staff on every listing. */}
    {isListingStaff(user)&&<p className="helper">As Klal Connect staff you can edit any listing from its own page — open the listing and use "Edit this listing". That changes its details, not who it belongs to.</p>}
    {items.length===0
      ? <p className="text-sm">You do not have a submitted listing yet.</p>
      : <>
        <div className="space-y-4">
          {items.map(p=>(
            <div key={p.id} className="space-y-2 rounded-lg border border-brand-line p-4">
              <div className="flex items-center justify-between gap-3"><p className="min-w-0 font-semibold text-brand-ink">{p.name}</p><span className="shrink-0 text-xs font-semibold text-brand-muted">{p.status}</span></div>
              {/* The page titled "Manage my listings" had no link to the edit
                  form at all — the only one in the app was on the listing page
                  itself, which is not where someone goes to manage a listing.
                  This is the gap a tester hit as "editing doesn't exist yet". */}
              <div className="flex flex-wrap gap-2">
                <a href={`/add?edit=${encodeURIComponent(p.id)}`} className="primary text-sm">Edit all details</a>
                <a href={`/provider/${p.slug||p.id}`} className="secondary text-sm">View listing</a>
              </div>
              {(() => { const c = listingCompleteness(p); return <CompletenessRing percent={c.percent} next={c.next} label="Listing" onAction={() => { location.href = `/add?edit=${encodeURIComponent(p.id)}`; }}/>; })()}
              <HeadlineEdit label="Tagline" value={taglineFor[p.id]!=null?taglineFor[p.id]:(p.tagline||'')} onChange={v=>setTaglineFor({...taglineFor,[p.id]:v})} helper="Appears under your listing name across the app."/>
              <button onClick={()=>saveTagline(p.id)} disabled={savingId===p.id} className="primary text-sm">{savingId===p.id?'Saving…':'Save tagline'}{savedId===p.id?' ✓':''}</button>
              <label className="block text-sm font-medium text-brand-ink">Payment link
                <input type="url" className="field" placeholder="https://buy.stripe.com/... or venmo.com/u/you" value={paymentLinkFor[p.id]!=null?paymentLinkFor[p.id]:(p.payment_link_url||'')} onChange={e=>setPaymentLinkFor({...paymentLinkFor,[p.id]:e.target.value})}/>
                <span className="helper">A Stripe Payment Link, PayPal.me, Venmo or Zelle page. Shows a "Pay" button on your listing. Klal never touches the money.</span>
              </label>
              {payErrFor[p.id]&&<p className="text-sm font-semibold text-brand-error">{payErrFor[p.id]}</p>}
              <button onClick={()=>savePaymentLink(p.id)} disabled={savingId===p.id} className="secondary text-sm">{savingId===p.id?'Saving…':'Save payment link'}{savedId===p.id?' ✓':''}</button>
            </div>
          ))}
        </div>
        <form id="listing-change-request" onSubmit={submit} className="space-y-3 border-t border-brand-line pt-4">
          <h3 className="font-semibold text-brand-ink">Ask us for something you cannot change yourself</h3>
          <p className="helper">Your own details are yours to edit above — this is for the rest: taking a listing down, merging a duplicate, correcting who owns it, or asking us to confirm your details.</p>
          <select required className="field" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose your listing</option>{items.map(p=><option key={p.id} value={p.id}>{p.name} — {p.status}</option>)}</select>
          <textarea required className="field min-h-24" value={changes} onChange={e=>setChanges(e.target.value)} placeholder="Describe the information you would like updated."/>
          <button className="primary">Request listing update</button>
          {done&&<p className="success p-3">Your update has been sent for review.</p>}
        </form>
      </>}
  </section>;
}