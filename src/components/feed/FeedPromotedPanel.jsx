import React,{useEffect,useState} from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Image } from '@/components/ui/image';
import { ArrowRight, TrendingUp } from 'lucide-react';
import Headline from '@/components/Headline';
import { categoryLabel } from '@/lib/categories';

export default function FeedPromotedPanel(){
  const [items,setItems]=useState(null);
  useEffect(()=>{ api.entities.Provider.filter({ featured:true, status:'published' },'-usage_count',4).then(setItems).catch(()=>setItems([])); },[]);
  // Rendered only once there is something to show: an empty "promoted"
  // module makes a young network look dead.
  if (!items || items.length === 0) return null;
  const panel = <div className="panel space-y-3">
    <div className="flex items-center justify-between"><h2 className="text-sm font-bold uppercase tracking-wide text-brand-ink">Promoted businesses</h2><TrendingUp size={15} className="text-brand-teal"/></div>
    {items.map(p=>{
      const initials=(p.name||'').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
      return <Link key={p.id} to={`/provider/${p.id}`} className="flex items-start gap-3 rounded-lg p-2 hover:bg-brand-tint">
        {p.logo_url
          ? <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-brand-line"><Image src={p.logo_url} fittingType="fill" className="h-11 w-11"/></div>
          : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-tint text-sm font-bold text-brand-teal">{initials}</div>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-brand-ink">{p.name}</p>
          <Headline text={p.tagline}/>
          <p className="truncate text-xs text-brand-teal">{categoryLabel(p.category)}</p>
          <p className="truncate text-xs text-brand-muted">{p.city}{p.state?`, ${p.state}`:''}</p>
        </div>
        <ArrowRight size={15} className="mt-2 shrink-0 text-brand-muted"/>
      </Link>;
    })}
    <Link to="/directory" className="block rounded-xl bg-brand-tint py-2 text-center text-xs font-semibold text-brand-teal">Browse all resources</Link>
  </div>;
  return panel;
}