import React,{useEffect,useState} from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Image } from '@/components/ui/image';
import { ArrowLeft, MapPin, Globe, Mail, Phone, Building2, Pencil, Calendar } from 'lucide-react';
import CompanyEditor from '@/components/CompanyEditor';
import ShareButton, { WhatsAppShare } from '@/components/ShareButton';
import PublicListingCTA from '@/components/PublicListingCTA';
import { useMetaTags } from '@/hooks/useMetaTags';
import Headline from '@/components/Headline';

export default function CompanyPage(){
  const { slug } = useParams();
  const [me,setMe]=useState();
  const [company,setCompany]=useState();
  const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState(false);

  useEffect(()=>{(async()=>{
    let c;
    try{ const bySlug=await api.entities.Company.filter({slug}); c=bySlug[0]; }catch{}
    if(!c){ try{ c=await api.entities.Company.get(slug); }catch{} }
    try{ setMe(await api.auth.me()); }catch{}
    setCompany(c); setLoading(false);
  })()},[slug]);

  useMetaTags(company ? {
    title: `${company.name}${company.industry?` · ${company.industry}`:''}`,
    description: company.tagline || (company.description||'').slice(0,140),
    image: company.logo_url,
    url: window.location.href
  } : {});

  if (loading) return <div className="loading">Loading company…</div>;
  if (!company) return <div className="empty">This company page could not be found.</div>;

  const isOwner = me && company.created_by_id === me.id;

  return <div className="page-shell max-w-3xl py-8">
    <Link to="/companies" className="mb-5 flex items-center gap-2 text-sm font-semibold text-brand-teal"><ArrowLeft size={17}/>All companies</Link>
    {editing
      ? <CompanyEditor company={company} onDone={(c)=>{setCompany(c);setEditing(false);}}/>
      : <CompanyView company={company} isOwner={isOwner} onEdit={()=>setEditing(true)}/>}
    <PublicListingCTA to="/companies" label="Browse companies"/>
  </div>;
}

function CompanyView({company,isOwner,onEdit}){
  const initials=(company.name||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
  return <section className="panel space-y-4">
    <div className="flex flex-wrap items-center gap-5">
      {company.logo_url
        ? <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl ring-2 ring-brand-line"><Image src={company.logo_url} fittingType="fill" className="h-24 w-24"/></div>
        : <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-brand-tint text-2xl font-bold text-brand-teal">{initials}</div>}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-brand-ink">{company.name}</h1>
        <Headline text={company.tagline} variant="header"/>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-brand-body">
          {company.industry && <span className="flex items-center gap-1.5"><Building2 size={14} className="text-brand-teal"/>{company.industry}</span>}
          {company.city && <span className="flex items-center gap-1.5"><MapPin size={14} className="text-brand-teal"/>{company.city}{company.state?`, ${company.state}`:''}</span>}
          {company.founded && <span className="flex items-center gap-1.5"><Calendar size={14} className="text-brand-teal"/>Founded {new Date(company.founded).getFullYear()}</span>}
        </div>
      </div>
      <div className="flex gap-2">
        <ShareButton title={company.name}/>
        <WhatsAppShare title={`${company.name} on Klal Connect`}/>
        {isOwner && <button onClick={onEdit} className="secondary"><Pencil size={16}/>Edit page</button>}
      </div>
    </div>
    {company.description && <p className="whitespace-pre-line leading-7 text-brand-body">{company.description}</p>}
    <div className="flex flex-wrap gap-4 border-t border-brand-line pt-4 text-sm">
      {company.website && <a href={company.website} target="_blank" rel="noreferrer" className="info"><Globe/>{company.website}</a>}
      {company.email && <a href={`mailto:${company.email}`} className="info"><Mail/>{company.email}</a>}
      {company.phone && <span className="info"><Phone/>{company.phone}</span>}
      {company.size && <span className="info"><Building2/>{company.size}</span>}
    </div>
  </section>;
}