import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, Calendar } from 'lucide-react';

const fmt = (s) => { if(!s) return ''; const d = new Date(s + '-01'); if (isNaN(d)) return s; return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); };

// `companyLinks` maps a lower-cased company name to its Klal page, so a role
// at a business that is in the directory links there.
export default function WorkExperienceTimeline({ value = [], companyLinks = {} }){
  const items = Array.isArray(value) ? value : [];
  const linkFor = (name) => (name ? companyLinks[String(name).trim().toLowerCase()] : null);
  if (items.length === 0) return <p className="text-sm text-[#758680]">No roles added yet.</p>;
  return <div className="relative">
    {items.length > 1 && <div className="absolute left-[11px] top-2 bottom-2 w-px bg-brand-line"/>}
    <div className="space-y-5">
      {items.map((job, i) => (
        <div key={i} className="relative pl-9">
          <div className="absolute left-0 top-1 grid h-6 w-6 place-items-center rounded-full bg-brand-teal text-white ring-4 ring-brand-canvas"><Briefcase size={11}/></div>
          <p className="font-semibold text-brand-ink">{job.title || 'Untitled role'}{job.company ? <span className="text-brand-teal"> · {linkFor(job.company) ? <Link to={linkFor(job.company)} className="hover:underline">{job.company}</Link> : job.company}</span> : null}</p>
          <p className="mt-0.5 flex items-center gap-3 text-xs text-[#71837E]">
            {(job.start_date || job.end_date || job.current) && <span className="flex items-center gap-1"><Calendar size={11}/>{fmt(job.start_date)} – {job.current ? 'Present' : fmt(job.end_date)}</span>}
            {job.location && <span className="flex items-center gap-1"><MapPin size={11}/>{job.location}</span>}
          </p>
          {job.description && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-brand-body">{job.description}</p>}
        </div>
      ))}
    </div>
  </div>;
}