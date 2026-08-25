import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import SearchPanel from '@/components/SearchPanel';
import CategoryGrid from '@/components/CategoryGrid';
import ResourceCard from '@/components/ResourceCard';

export default function Directory(){
  const {data:categories=[]}=useQuery({queryKey:['categories'],queryFn:()=>api.entities.Category.list('order')});
  const {data:providers=[]}=useQuery({queryKey:['providers'],queryFn:()=>api.entities.Provider.filter({status:'published'},'-created_date',30)});
  const featured=[...providers].sort((a,b)=>(b.featured||0)-(a.featured||0)).slice(0,3);
  const recent=providers.slice(0,3);
  const favorites=[...providers].sort((a,b)=>(b.usage_count||0)-(a.usage_count||0)).slice(0,3);
  const gemachs=providers.filter(p=>p.category==='Gemachs & Free Resources').slice(0,3);
  return <div className="page-shell space-y-12 py-10">
    <div><span className="eyebrow dark">RESOURCES</span><h1 className="title">Find trusted community resources</h1><p className="helper">Search the directory, browse categories, or explore what's new and popular near you.</p><div className="mt-5"><SearchPanel/></div></div>

    <section>
      <div className="section-head"><div><span className="eyebrow dark">EXPLORE</span><h2 className="title">Popular categories</h2></div><Link to="/browse" className="text-sm font-semibold text-brand-teal">View all</Link></div>
      <CategoryGrid categories={categories} limit={12}/>
    </section>

    <ProviderSection title="Popular near you" items={featured}/>
    <ProviderSection title="Recently added" items={recent}/>
    <ProviderSection title="Community favorites" items={favorites}/>

    {gemachs.length>0&&(
      <section>
        <div className="section-head"><div><span className="eyebrow dark">GEMACHS & FREE RESOURCES</span><h2 className="title">Find a Gemach near you</h2><p className="helper">Borrow what you need, or support an organization that gives to the community.</p></div><Link to="/browse?category=Gemachs%20%26%20Free%20Resources" className="text-sm font-semibold text-brand-teal">Browse all gemachs</Link></div>
        <div className="grid gap-4 md:grid-cols-3">{gemachs.map(p=><ResourceCard key={p.id} provider={p}/>)}</div>
      </section>
    )}

    <section className="rounded-[2rem] bg-brand-navy p-7 text-white md:flex md:items-center md:justify-between md:p-10">
      <div><h2 className="text-2xl font-bold">Is your business or resource missing?</h2><p className="mt-2 text-white/75">Add a community resource or claim your business listing for review.</p></div>
      <Link to="/add" className="mt-5 inline-block rounded-xl bg-brand-gold px-5 py-3 font-bold text-brand-navy md:mt-0">Add or claim a listing</Link>
    </section>
  </div>;
}

function ProviderSection({ title, items }){
  return <section><div className="section-head"><h2 className="title">{title}</h2><Link to="/browse" className="text-sm font-semibold text-brand-teal">See more</Link></div><div className="grid gap-4 md:grid-cols-3">{items.map(p=><ResourceCard key={p.id} provider={p}/>)}</div></section>;
}