import React,{useEffect,useState} from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Image } from '@/components/ui/image';
import { Building2, Search, Plus } from 'lucide-react';
import { companyPath } from '@/lib/paths';
import Headline from '@/components/Headline';

export default function Companies(){
  const [companies,setCompanies]=useState([]);
  const [q,setQ]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(()=>{(async()=>{
    try{
      const c=await api.entities.Company.filter({status:'published'},'-created_date');
      setCompanies(c);
    }catch{}
    setLoading(false);
  })()},[]);

  const filtered=companies.filter(c=>{
    if(!q) return true;
    const hay=`${c.name} ${c.tagline} ${c.industry} ${c.city} ${c.state}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return <div className="page-shell space-y-8 py-9">
    <div className="flex items-end justify-between gap-4">
      <div>
        <span className="eyebrow dark">COMMUNITY</span>
        <h1 className="title">Companies</h1>
        <p className="helper">Company pages from across the Klal Connect community.</p>
      </div>
      <Link to="/create-company" className="primary"><Plus size={16}/>Create a page</Link>
    </div>
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"/>
      <input className="field pl-9" placeholder="Search companies" value={q} onChange={e=>setQ(e.target.value)}/>
    </div>
    {loading ? <p className="text-sm text-brand-body">Loading…</p> : filtered.length===0
      ? <div className="empty"><Building2/><p>No company pages {q?`match "${q}"`:'yet'}. Be the first to create one.</p></div>
      : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(c=>{
        const initials=(c.name||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
        return <Link key={c.id} to={companyPath(c)} className="panel space-y-3 hover:ring-brand-teal">
          <div className="flex items-center gap-3">
            {c.logo_url
              ? <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-brand-line"><Image src={c.logo_url} fittingType="fill" className="h-12 w-12"/></div>
              : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-tint font-bold text-brand-teal">{initials}</div>}
            <div className="min-w-0">
              <h3 className="truncate font-bold text-brand-ink">{c.name}</h3>
              <Headline text={c.tagline}/>
              <p className="truncate text-sm text-brand-teal">{c.industry||'Company page'}</p>
            </div>
          </div>
          {c.city && <p className="text-sm text-brand-body">{c.city}{c.state?`, ${c.state}`:''}</p>}
        </Link>;
      })}</div>}
  </div>;
}