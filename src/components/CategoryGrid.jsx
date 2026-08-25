import React from 'react';
import { Link } from 'react-router-dom';
import { Home, BriefcaseBusiness, HeartPulse, Scale, Laptop, GraduationCap, Utensils, Users, Landmark, Gift, ShieldCheck, MoreHorizontal } from 'lucide-react';
const icons={Home,BriefcaseBusiness,HeartPulse,Scale,Laptop,GraduationCap,Utensils,Users,Landmark,Gift,ShieldCheck};
export default function CategoryGrid({categories=[],limit}) {
  const shown=limit?categories.slice(0,limit):categories;
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{shown.map((c,i)=>{const I=icons[c.icon]||MoreHorizontal;return <Link to={`/browse?category=${encodeURIComponent(c.name)}`} key={c.id||c.slug} className="group rounded-2xl bg-brand-surface p-4 shadow-sm ring-1 ring-brand-line transition hover:-translate-y-0.5 hover:shadow-md"><I className="mb-3 text-brand-teal" size={24}/><span className="text-sm font-semibold leading-tight">{c.name}</span>{c.subcategories?.length>0&&<p className="mt-1 text-xs text-brand-muted">{c.subcategories.length} specialties</p>}</Link>})}</div>;
}