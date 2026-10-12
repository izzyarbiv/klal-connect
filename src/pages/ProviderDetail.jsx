import React,{useEffect,useState} from 'react';
import { useParams,Link } from 'react-router-dom';
import { api } from '@/api/client';
import { MapPin,Clock,Languages,CheckCircle2,ArrowLeft } from 'lucide-react';
import ProviderActions from '@/components/ProviderActions';
import { ReportForm } from '@/components/FeedbackForms';
import PublicListingCTA from '@/components/PublicListingCTA';
import ReportIssueModal from '@/components/ReportIssueModal';
import { useMetaTags } from '@/hooks/useMetaTags';
import Headline from '@/components/Headline';
import CommunityTrust from '@/components/CommunityTrust';
import BadgeChips from '@/components/BadgeChips';
import AdminBadgePanel from '@/components/AdminBadgePanel';
import { isSensitiveListing } from '@/lib/sensitivity';
import { useAuth } from '@/lib/AuthContext';
import { canEditListing } from '@/lib/listing';
import TrustMarks from '@/components/TrustMarks';
import ListingLocation from '@/components/ListingLocation';
import DirectionsMenu from '@/components/DirectionsMenu';
import { VERIFIED_MEANING } from '@/lib/trust';

export default function ProviderDetail(){
  const { slug } = useParams();
  const { user, isGuest } = useAuth();
  const [provider,setProvider]=useState(),[notes,setNotes]=useState([]),[missing,setMissing]=useState(false);

  useEffect(()=>{
    let alive=true;
    (async()=>{
      let p;
      try{ const bySlug=await api.entities.Provider.filter({slug}); p=bySlug[0]; }catch{}
      if(!p){ try{ p=await api.entities.Provider.get(slug); }catch{} }
      if(!alive) return;
      // Both lookups swallow their errors, so "not found" and "still
      // loading" were the same undefined — a stale or unpublished link span
      // on "Loading resource…" forever with no way out.
      if(!p) setMissing(true);
      setProvider(p);
      if(p){
        api.entities.ActivityEvent.create({type:'profile_view',provider_id:p.id,category:p.category,city:p.city}).catch(()=>{});
        api.entities.CommunityNote.filter({provider_id:p.id,status:'published'},'-created_date').then(n=>{if(alive)setNotes(n)}).catch(()=>{});
      }
    })();
    return ()=>{alive=false};
  },[slug]);

  useMetaTags(provider ? {
    title: `${provider.name} · ${provider.category} · ${provider.city}`,
    description: provider.tagline || provider.short_description || (provider.description||'').slice(0,140),
    image: provider.logo_url || (provider.image_urls&&provider.image_urls[0]),
    url: window.location.href
  } : {});

  if(missing)return <div className="page-shell py-10"><div className="empty"><p>That listing could not be found — it may have been removed or is awaiting review.</p><Link to="/browse" className="primary">Browse the directory</Link></div></div>;
  if(!provider)return <div className="loading">Loading resource…</div>;
  const sensitive=isSensitiveListing(provider);
  const directions=()=>api.entities.ActivityEvent.create({type:'directions',provider_id:provider.id,category:provider.category,city:provider.city}).catch(()=>{});
  // isGuest, like AddListing. A demo instance adopts the shared guest session
  // for every signed-out visitor, so without this the page offered "Edit this
  // listing" to anonymous readers on anything a previous visitor had added.
  const canEdit=!isGuest&&canEditListing(provider,user);
  return <div className="page-shell py-7">
    <Link to="/browse" className="mb-5 flex items-center gap-2 text-sm font-semibold text-brand-teal"><ArrowLeft size={17}/>Back to browse</Link>
    {/* minmax(0,1fr), not 1fr, and an explicit single column below lg.
        A grid item's min-width is auto, so its min-content width is a floor
        the track cannot go under: one long word, address or service-area list
        made the column wider than the phone, every panel on the page stretched
        with it, and the whole document scrolled sideways at 320px. The culprit
        is invisible — nothing looks too wide, the page is just 15px off — and
        it only appears on listings whose text happens to be long enough, which
        is why it survived a sweep that checked one listing. Same fix as the
        admin grid. */}
    <div className="grid gap-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className="panel"><div className="flex gap-4"><div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-brand-tint text-xl font-bold text-brand-teal">{provider.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><div className="flex items-center gap-2"><h1 className="text-3xl font-bold">{provider.name}</h1>{provider.verified&&<CheckCircle2 className="text-brand-gold-ink"/>}</div><Headline text={provider.tagline} variant="header"/><p className="mt-1 font-semibold text-brand-teal">{provider.category} · {provider.subcategory}</p><p className="mt-3 text-brand-body">{provider.short_description}</p><div className="mt-3"><BadgeChips provider={provider}/></div></div></div>{provider.demo&&<p className="mt-4 rounded-xl bg-brand-gold-bg p-3 text-xs font-semibold text-brand-gold-ink">Demonstration content — this is a fictional listing for development.</p>}</section>
        <section className="panel"><h2 className="section-title">About</h2><p className="mt-3 whitespace-pre-line leading-7 text-brand-body">{provider.description}</p><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">{provider.address?<DirectionsMenu place={provider} trigger="address" onOpen={directions}/>:<p className="info"><MapPin/> {provider.city+', '+provider.state}</p>}<p className="info"><Clock/> {provider.hours||'Contact for hours'}</p><p className="info"><Languages/> {(provider.languages||['English']).join(', ')}</p><p className="info"><MapPin/> Serves {(provider.service_areas||[provider.city]).join(', ')}</p></div></section>
        <ListingLocation place={provider} onOpen={directions}/>
        {/* A community note is signed. On a sensitive listing that identifies
            its author as someone who needed the service, so neither the notes
            nor the form to add one appears — while Suggest a Correction still
            reaches the team privately. */}
        {!sensitive&&<>
          <CommunityTrust provider={provider} onCounts={(c)=>setProvider(p=>({...p,...c}))} onNote={(n)=>{if(n?.status==='published')setNotes(ns=>[n,...ns])}}/>
          <section className="panel"><h2 className="section-title">Positive community experiences</h2><p className="helper">{notes.length} community {notes.length === 1 ? 'member' : 'members'} shared a positive experience.</p><div className="mt-4 space-y-3">{notes.map(n=><blockquote key={n.id} className="rounded-lg bg-brand-tint p-4 text-sm leading-6">“{n.body}”</blockquote>)}{notes.length===0&&<p className="text-sm text-brand-muted">No published notes yet.</p>}</div></section>
        </>}
      </div>
      <aside className="space-y-5">
        <section className="panel"><ProviderActions provider={provider}/>{/* "Controlled by Klal administrators" told a reader who sets the mark
            but never what it claims — so everyone supplied their own
            definition, usually a more generous one than we earn. */}
        <div className="mt-4 space-y-2 border-t pt-4">
          <TrustMarks provider={provider}/>
          <p className="text-xs leading-5 text-brand-muted">{provider.verified ? VERIFIED_MEANING : `Not yet verified. ${VERIFIED_MEANING}`}</p>
        </div></section>
        <ReportForm provider={provider}/>
        {/* Whoever may edit it gets the link to do so: the person who added it,
            or the business once it has claimed it. Everyone else gets "suggest a
            correction" above, which reaches the team. */}
        {canEdit
          ? <Link to={`/add?edit=${provider.id}`} className="primary block text-center">Edit this listing</Link>
          : <Link to={`/add?claim=${provider.id}`} className="secondary block text-center">Claim this listing</Link>}
        <AdminBadgePanel provider={provider} onChange={setProvider}/>
      </aside>
    </div>
    <PublicListingCTA to="/directory"/>
    <ReportIssueModal provider={provider}/>
  </div>;
}