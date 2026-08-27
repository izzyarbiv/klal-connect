import React,{useEffect,useState} from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Compass } from 'lucide-react';

export default function PublicListingCTA({ to='/directory', label='Browse the directory' }){
  const [authed,setAuthed]=useState(null);
  useEffect(()=>{ api.auth.isAuthenticated().then(setAuthed).catch(()=>setAuthed(false)); },[]);
  if(authed===null||authed) return null;
  return <section className="panel mt-6 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
    <div className="flex items-center gap-3">
      <Compass className="text-brand-teal"/>
      <div>
        <p className="font-semibold text-brand-ink">Looking for more?</p>
        <p className="text-sm text-brand-body">This is part of the Klal directory of trusted community resources.</p>
      </div>
    </div>
    <Link to={to} className="primary">{label}</Link>
  </section>;
}