import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

// The way in for the other half of the directory: the people being found.
// Shown right under the search so it is on the first screen of a phone, not
// only in the "Use it to be found" panel at the bottom of Home.
export default function AddListingPrompt({ className = '' }) {
  return <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
    <span className="text-sm text-brand-body">Run a business, shul or gemach?</span>
    <Link to="/add" className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-3.5 py-1.5 text-sm font-bold text-brand-navy transition hover:brightness-105"><Plus size={15} />Add a listing</Link>
  </div>;
}
