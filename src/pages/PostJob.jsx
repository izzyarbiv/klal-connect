import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import CityInput from '@/components/CityInput';
import GuestPrompt from '@/components/GuestPrompt';
import { useAuth } from '@/lib/AuthContext';
import { EMPLOYMENT_TYPES } from '@/lib/jobTypes';

const blank = { title: '', company_name: '', category: '', employment_type: 'full_time', location: '', remote: false, description: '', apply_url: '' };

export default function PostJob() {
  const navigate = useNavigate();
  const { user, isGuest, authChecked } = useAuth();
  const [data, setData] = useState(blank);
  const [categories, setCategories] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.entities.Category.list('order').then(setCategories); }, []);

  const change = (e) => setData({ ...data, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!(await api.auth.requireAccount())) return;
    setBusy(true); setErr('');
    const r = await api.functions.invoke('createJob', data);
    if (r.status >= 400) { setErr(r.data?.error || 'Could not post this job'); setBusy(false); return; }
    navigate(`/jobs/${r.data.job.id}`);
  };

  // Gated on arrival, not at the submit button — same reason as /add.
  if (!authChecked) return <div className="loading">Loading…</div>;
  if (!user || isGuest) {
    return <GuestPrompt
      title="Posting a job needs an account"
      body="A job post carries your name, and applicants reach you through it. Create a free account first — it takes a minute, and the form is waiting."
    />;
  }

  return <div className="page-shell max-w-2xl py-9">
    <span className="eyebrow">HIRING</span>
    <h1 className="title text-3xl">Post a job</h1>
    <p className="helper mb-6">Goes live right away, and stays open until you mark it filled.</p>
    <form onSubmit={submit} className="panel space-y-5">
      <label>Job title<input className="field" name="title" value={data.title} onChange={change} required/></label>
      <label>Company or organization (optional)<input className="field" name="company_name" value={data.company_name} onChange={change} placeholder="Leave blank if this is a personal listing"/></label>
      <div className="form-grid">
        <label>Category<select className="field" name="category" value={data.category} onChange={change} required><option value="">Choose a category</option>{categories.map((c) => <option key={c.id}>{c.name}</option>)}</select></label>
        <label>Employment type<select className="field" name="employment_type" value={data.employment_type} onChange={change}>{EMPLOYMENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        <label>Location<CityInput value={data.location} onChange={(v) => setData((d) => ({ ...d, location: v }))} onPick={(p) => setData((d) => ({ ...d, location: p.city }))}/></label>
        <label className="flex items-center gap-2 pt-6"><input type="checkbox" checked={data.remote} onChange={(e) => setData((d) => ({ ...d, remote: e.target.checked }))} className="h-4 w-4 accent-brand-teal"/>This role can be done remotely</label>
      </div>
      <label className="block">Description<textarea className="field min-h-40" name="description" value={data.description} onChange={change} placeholder="What the role involves, what you're looking for, and anything else a candidate should know." required/></label>
      <label>Apply link (optional)<input className="field" name="apply_url" value={data.apply_url} onChange={change} placeholder="https://…"/><span className="helper">Leave this blank to let people apply in-app instead — you'll be notified and can message them back.</span></label>
      {err && <p className="text-sm font-semibold text-brand-error">{err}</p>}
      <button disabled={busy} className="primary w-full sm:w-auto disabled:opacity-60">{busy ? 'Posting…' : 'Post this job'}</button>
    </form>
  </div>;
}
