import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';

// The way in for the other half of the directory: the people being found.
// Shown right under the search so it is on the first screen of a phone, not
// only in the "Use it to be found" panel at the bottom of Home.
export default function AddListingPrompt({ className = '' }) {
  return <Link
    to="/add"
    className={`group flex items-center gap-3 rounded-2xl bg-brand-tint p-3 pr-4 ring-1 ring-brand-teal/20 transition hover:ring-brand-teal/50 sm:max-w-md ${className}`}
  >
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-teal text-white shadow-sm"><Plus size={20} strokeWidth={2.5} /></span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-brand-ink">Add a listing</span>
      <span className="block text-xs text-brand-body">Run a business, shul or gemach? Help people find you.</span>
    </span>
    <ChevronRight size={18} className="shrink-0 text-brand-teal transition group-hover:translate-x-0.5" />
  </Link>;
}
