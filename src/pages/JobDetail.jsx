import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { ArrowLeft, MapPin, Wifi, Briefcase, ExternalLink, Loader2, CheckCircle2, Lock, Unlock, Trash2, Mail } from 'lucide-react';
import { employmentLabel } from '@/lib/jobTypes';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState();
  const [job, setJob] = useState();
  const [applications, setApplications] = useState([]);
  const [myApplication, setMyApplication] = useState(null);
  const [note, setNote] = useState('');
  const [applying, setApplying] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    const authenticated = await api.auth.isAuthenticated();
    const u = authenticated ? await api.auth.me() : null;
    setMe(u);
    const j = await api.entities.Job.get(id).catch(() => null);
    setJob(j);
    if (!j) return;
    const isOwner = u && u.id === j.created_by_id;
    const rows = await api.entities.JobApplication.filter({ job_id: id }).catch(() => []);
    if (isOwner) setApplications(rows);
    else if (u) setMyApplication(rows.find((r) => r.created_by_id === u.id) || null);
  })(); }, [id]);

  if (job === undefined) return <div className="loading">Loading job…</div>;
  if (!job) return <div className="empty">This job could not be found.</div>;

  const isOwner = me && me.id === job.created_by_id;

  const apply = async () => {
    if (!(await api.auth.requireAccount())) return;
    setApplying(true); setErr('');
    const r = await api.functions.invoke('applyToJob', { job_id: job.id, note });
    setApplying(false);
    if (r.status >= 400) { setErr(r.data?.error || 'Could not apply'); return; }
    setMyApplication(r.data.application);
  };

  const toggleOpen = async () => {
    setBusy(true);
    try { setJob(await api.entities.Job.update(job.id, { open: job.open === false })); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm('Remove this job posting? This cannot be undone.')) return;
    setBusy(true);
    try { await api.entities.Job.delete(job.id); navigate('/jobs'); }
    finally { setBusy(false); }
  };

  return <div className="page-shell max-w-3xl py-7">
    <Link to="/jobs" className="mb-5 flex items-center gap-2 text-sm font-semibold text-brand-teal"><ArrowLeft size={17}/>Back to jobs</Link>
    <div className="space-y-6">
      <section className="panel space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-ink">{job.title}</h1>
            <p className="font-semibold text-brand-teal">{job.company_name || 'Klal community'}</p>
          </div>
          {job.open === false && <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand-muted">FILLED</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-brand-body">
          <span className="flex items-center gap-1.5"><Briefcase size={14} className="text-brand-teal"/>{employmentLabel(job.employment_type)}</span>
          {job.remote && <span className="flex items-center gap-1.5"><Wifi size={14} className="text-brand-teal"/>Remote</span>}
          {job.location && <span className="flex items-center gap-1.5"><MapPin size={14} className="text-brand-teal"/>{job.location}</span>}
          <span className="text-brand-muted">· {job.category}</span>
        </div>
        <p className="whitespace-pre-line leading-7 text-brand-body">{job.description}</p>
      </section>

      {isOwner
        ? <section className="panel space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={busy} onClick={toggleOpen} className="secondary">{job.open === false ? <Unlock size={15}/> : <Lock size={15}/>}{job.open === false ? 'Reopen this job' : 'Mark as filled'}</button>
            <button type="button" disabled={busy} onClick={remove} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-error hover:underline"><Trash2 size={14}/>Delete</button>
          </div>
          <div>
            <h2 className="section-title mb-3">{applications.length} {applications.length === 1 ? 'application' : 'applications'}</h2>
            {applications.length === 0
              ? <p className="text-sm text-brand-muted">No applications yet.</p>
              : <div className="space-y-3">{applications.map((a) => <div key={a.id} className="rounded-xl bg-brand-tint p-3">
                <div className="flex items-center justify-between gap-3">
                  <Link to={`/profile/${a.created_by_id}`} className="font-semibold text-brand-ink hover:text-brand-teal hover:underline">{a.applicant_name}</Link>
                  <Link to={`/messages/${a.created_by_id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal hover:underline"><Mail size={12}/>Message</Link>
                </div>
                {a.applicant_headline && <p className="text-xs text-brand-muted">{a.applicant_headline}</p>}
                {a.note && <p className="mt-2 text-sm text-brand-body">{a.note}</p>}
              </div>)}</div>}
          </div>
        </section>
        : <section className="panel space-y-3">
          {job.apply_url
            ? <a href={job.apply_url} target="_blank" rel="noreferrer" className="primary inline-flex w-full items-center justify-center gap-2 sm:w-auto"><ExternalLink size={16}/>Apply</a>
            : myApplication
              ? <p className="flex items-center gap-2 font-semibold text-brand-teal"><CheckCircle2 size={17}/>Applied — <Link to={`/messages/${job.created_by_id}`} className="underline">message them</Link> any time about it.</p>
              : job.open === false
                ? <p className="text-sm text-brand-muted">This job is no longer accepting applications.</p>
                : <div className="space-y-3">
                  <textarea className="field min-h-24" value={note} onChange={(e) => setNote(e.target.value)} placeholder="A short note to go with your application (optional)."/>
                  {err && <p className="text-sm font-semibold text-brand-error">{err}</p>}
                  <button type="button" onClick={apply} disabled={applying} className="primary">{applying ? <Loader2 size={15} className="animate-spin"/> : null}Apply</button>
                </div>}
        </section>}
    </div>
  </div>;
}
