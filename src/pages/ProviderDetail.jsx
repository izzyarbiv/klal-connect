import React,{useEffect,useState} from 'react';
import { useParams,Link } from 'react-router-dom';
import { api } from '@/api/client';
import { MapPin,Clock,Languages,CheckCircle2,ArrowLeft } from 'lucide-react';
import ProviderActions from '@/components/ProviderActions';
import { PositiveForm,ReportForm } from '@/components/FeedbackForms';
import PublicListingCTA from '@/components/PublicListingCTA';
import ReportIssueModal from '@/components/ReportIssueModal';
import { useMetaTags } from '@/hooks/useMetaTags';
import Headline from '@/components/Headline';
import VouchList from '@/components/VouchList';
import BadgeChips from '@/components/BadgeChips';
import AdminBadgePanel from '@/components/AdminBadgePanel';

export default function ProviderDetail(){
  const { slug } = useParams();
  const [provider,setProvider]=useState(),[notes,setNotes]=useState([]),[vouchTick,setVouchTick]=useState(0);

  useEffect(()=>{
    let alive=true;
    (async()=>{
      let p;
      try{ const bySlug=await api.entities.Provider.filter({slug}); p=bySlug[0]; }catch{}
      if(!p){ try{ p=await api.entities.Provider.get(slug); }catch{} }
      if(!alive) return;
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

  if(!provider)return <div className="loading">Loading resource…</div>;
  return <div className="page-shell py-7">
    <Link to="/browse" className="mb-5 flex items-center gap-2 text-sm font-semibold text-brand-teal"><ArrowLeft size={17}/>Back to browse</Link>
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="panel"><div className="flex gap-4"><div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-brand-tint text-xl font-bold text-brand-teal">{provider.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><div className="flex items-center gap-2"><h1 className="text-3xl font-bold">{provider.name}</h1>{provider.verified&&<CheckCircle2 className="text-brand-gold-ink"/>}</div><Headline text={provider.tagline} variant="header"/><p className="mt-1 font-semibold text-brand-teal">{provider.category} · {provider.subcategory}</p><p className="mt-3 text-brand-body">{provider.short_description}</p><div className="mt-3"><BadgeChips provider={provider}/></div></div></div>{provider.demo&&<p className="mt-4 rounded-xl bg-brand-gold-bg p-3 text-xs font-semibold text-brand-gold-ink">Demonstration content — this is a fictional listing for development.</p>}</section>
        <section className="panel"><h2 className="section-title">About</h2><p className="mt-3 whitespace-pre-line leading-7 text-brand-body">{provider.description}</p><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><p className="info"><MapPin/> {provider.address||provider.city+', '+provider.state}</p><p className="info"><Clock/> {provider.hours||'Contact for hours'}</p><p className="info"><Languages/> {(provider.languages||['English']).join(', ')}</p><p className="info"><MapPin/> Serves {(provider.service_areas||[provider.city]).join(', ')}</p></div></section>
        <VouchList provider={provider} refreshKey={vouchTick}/>
        <section className="panel"><h2 className="section-title">Positive community experiences</h2><p className="helper">{notes.length} community members shared a positive experience. Notes are reviewed before publication.</p><div className="mt-4 space-y-3">{notes.map(n=><blockquote key={n.id} className="rounded-2xl bg-brand-tint p-4 text-sm leading-6">“{n.body}”</blockquote>)}{notes.length===0&&<p className="text-sm text-brand-muted">No published notes yet.</p>}</div></section>
        <PositiveForm provider={provider}/>
      </div>
      <aside className="space-y-5">
        <section className="panel"><ProviderActions provider={provider} onVouch={({count})=>{setProvider(p=>({...p,vouch_count:count}));setVouchTick(t=>t+1);}}/><div className="mt-5 grid grid-cols-3 gap-3 border-t pt-5 text-center"><Stat n={provider.vouch_count||0} label="Vouches"/><Stat n={provider.usage_count||0} label="Community uses"/><Stat n={provider.save_count||0} label="Saves"/></div><p className="mt-4 text-xs text-brand-muted">Verified status, when shown, is controlled by Klal administrators.</p></section>
        <ReportForm provider={provider}/>
        <Link to={`/add?claim=${provider.id}`} className="secondary block text-center">Claim this listing</Link>
        <AdminBadgePanel provider={provider} onChange={setProvider}/>
      </aside>
    </div>
    <PublicListingCTA to="/directory"/>
    <ReportIssueModal provider={provider}/>
  </div>;
}
function Stat({n,label}){return <div><strong className="block text-xl text-brand-navy">{n}</strong><span className="text-xs text-brand-muted">{label}</span></div>}