import React, { useState } from 'react';
import { Search, MapPin, LocateFixed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SearchPanel() {
  const [query,setQuery]=useState(''); const [location,setLocation]=useState(''); const [locating,setLocating]=useState(false); const navigate=useNavigate();
  const submit=(e)=>{e.preventDefault(); navigate(`/browse?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`)};
  const nearMe=()=>{setLocating(true); navigator.geolocation?.getCurrentPosition(({coords})=>{navigate(`/browse?lat=${coords.latitude}&lng=${coords.longitude}`);setLocating(false)},()=>setLocating(false));};
  return <form onSubmit={submit} className="rounded-3xl bg-brand-surface p-3 shadow-xl shadow-brand-navy/10 ring-1 ring-brand-line md:flex md:gap-2">
    <label className="flex flex-1 items-center gap-3 border-b px-3 py-3 md:border-b-0 md:border-r"><Search className="text-brand-teal"/><input value={query} onChange={e=>setQuery(e.target.value)} className="w-full bg-transparent outline-none" placeholder="What are you looking for?"/></label>
    <label className="flex flex-1 items-center gap-3 px-3 py-3"><MapPin className="text-brand-teal"/><input value={location} onChange={e=>setLocation(e.target.value)} className="w-full bg-transparent outline-none" placeholder="City, neighborhood, or ZIP"/></label>
    <button type="submit" className="w-full rounded-2xl bg-brand-navy px-6 py-3 font-semibold text-white md:w-auto">Search</button>
    <button type="button" onClick={nearMe} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-tint px-4 py-3 font-semibold text-brand-teal md:mt-0 md:w-auto"><LocateFixed size={18}/>{locating?'Locating…':'Near Me'}</button>
  </form>;
}