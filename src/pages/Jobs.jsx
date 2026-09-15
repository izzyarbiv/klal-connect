import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Briefcase, Search, Plus, MapPin, Wifi } from 'lucide-react';
import { EMPLOYMENT_TYPES, employmentLabel } from '@/lib/jobTypes';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    try { setJobs(await api.entities.Job.filter({ status: 'published' }, '-created_date')); } catch { /* empty list */ }
    setLoading(false);
  })(); }, []);

  const filtered = jobs.filter((j) => {
    if (type && j.employment_type !== type) return false;
    if (!q) return true;
    const hay = `${j.title} ${j.company_name} ${j.category} ${j.location} ${j.description}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const open = filtered.filter((j) => j.open !== false);
  const closed = filtered.filter((j) => j.open === false);

  return <div className="page-shell space-y-8 py-9">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="eyebrow dark">COMMUNITY</span>
        <h1 className="title">Jobs</h1>
        <p className="helper">Roles posted by people and businesses in Klal.</p>
      </div>
      <Link to="/post-job" className="primary"><Plus size={16}/>Post a job</Link>
    </div>

    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"/>
      <input className="field pl-9" placeholder="Search jobs by title, company, or category" value={q} onChange={(e) => setQ(e.target.value)}/>
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setType('')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${type === '' ? 'bg-brand-navy text-white ring-brand-navy' : 'bg-brand-surface text-brand-muted ring-brand-line'}`}>All types</button>
      {EMPLOYMENT_TYPES.map((t) => <button key={t.id} type="button" onClick={() => setType(t.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${type === t.id ? 'bg-brand-navy text-white ring-brand-navy' : 'bg-brand-surface text-brand-muted ring-brand-line'}`}>{t.label}</button>)}
    </div>

    {loading ? <p className="text-sm text-brand-body">Loading…</p> : open.length === 0
      ? <div className="empty"><Briefcase/><p>No open jobs {q || type ? 'match your search' : 'yet'}. Be the first to post one.</p></div>
      : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{open.map((j) => <JobCard key={j.id} job={j}/>)}</div>}

    {closed.length > 0 && <section className="space-y-3 opacity-70">
      <h2 className="section-title">Recently filled</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{closed.map((j) => <JobCard key={j.id} job={j}/>)}</div>
    </section>}
  </div>;
}

function JobCard({ job }) {
  return <Link to={`/jobs/${job.id}`} className="panel space-y-2 hover:ring-brand-teal">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="truncate font-bold text-brand-ink">{job.title}</h3>
        <p className="truncate text-sm text-brand-teal">{job.company_name || 'Klal community'}</p>
      </div>
      {job.open === false && <span className="shrink-0 rounded-full bg-brand-tint px-2 py-1 text-[10px] font-bold text-brand-muted">FILLED</span>}
    </div>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-muted">
      <span className="rounded-full bg-brand-tint px-2 py-0.5 font-semibold text-brand-teal">{employmentLabel(job.employment_type)}</span>
      {job.remote && <span className="flex items-center gap-1"><Wifi size={12}/>Remote</span>}
      {job.location && <span className="flex items-center gap-1"><MapPin size={12}/>{job.location}</span>}
    </div>
    <p className="line-clamp-2 text-sm text-brand-body">{job.description}</p>
  </Link>;
}
