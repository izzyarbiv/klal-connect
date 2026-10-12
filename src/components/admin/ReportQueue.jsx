import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';
import { Flag, ExternalLink, Mail, Phone, EyeOff, Ban, ArrowLeft } from 'lucide-react';

const REASON_LABELS = {
  contact_wrong: 'Contact info is wrong', closed_business: 'No longer in business',
  wrong_category: 'Listed in the wrong category', duplicate: 'Duplicate listing',
  fake_impersonation: 'Fake listing or impersonation', inappropriate_content: 'Inappropriate content on the profile',
  serious_concern: 'Serious concern about this provider', other: 'Other'
};
const STATUSES = ['New', 'Under review', 'Resolved', 'Dismissed'];
const FLAG_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const FLAG_THRESHOLD = 3;

// Admin-only moderation queue for ListingReports. Filters by status and
// listing name, sorted newest first. Detail view shows the linked listing,
// other reports on the same listing, and admin actions. Reporter identity is
// shown here (admin-only) but is never surfaced to the provider. Auto-flags
// listings with 3+ reports in the last 90 days.
export default function ReportQueue({ user }) {
  const [reports, setReports] = useState([]);
  const [providers, setProviders] = useState([]);
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [r, p, u] = await Promise.all([
        api.entities.ListingReport.list('-created_date', 500),
        api.entities.Provider.list('-updated_date', 500),
        api.entities.User.list()
      ]);
      setReports(r); setProviders(p); setUsers(u);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const provById = Object.fromEntries(providers.map(p => [p.id, p]));
  const userById = Object.fromEntries(users.map(u => [u.id, u]));
  const now = Date.now();
  const counts = {};
  reports.forEach(r => { if (now - new Date(r.created_date).getTime() < FLAG_WINDOW_MS) counts[r.resource_id] = (counts[r.resource_id] || 0) + 1; });
  const flaggedIds = Object.entries(counts).filter(([, c]) => c >= FLAG_THRESHOLD).map(([id]) => id);
  const flaggedProviders = flaggedIds.map(id => provById[id]).filter(Boolean);

  const filtered = reports.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (q.trim()) {
      const name = (provById[r.resource_id]?.name || r.resource_name || '').toLowerCase();
      if (!name.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  });

  if (loading) return <div className="panel"><p className="helper">Loading reports…</p></div>;

  if (sel) {
    const prov = provById[sel.resource_id];
    const others = reports.filter(r => r.resource_id === sel.resource_id && r.id !== sel.id);
    const reporter = userById[sel.reporter_user_id] || userById[sel.created_by_id];
    return <ReportDetail report={sel} prov={prov} reporter={reporter} others={others} flagged={flaggedIds.includes(sel.resource_id)} user={user} onBack={() => setSel(null)} onChanged={load} />;
  }

  return <div className="panel">
    <h2 className="section-title mb-4">Listing reports</h2>
    {flaggedProviders.length > 0 && <div className="mb-5 rounded-lg bg-brand-gold-bg p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-brand-gold-ink"><Flag size={15} />Needs review — {flaggedProviders.length} listing{flaggedProviders.length > 1 ? 's' : ''} with {FLAG_THRESHOLD}+ reports in the last 90 days</p>
      <div className="mt-2 space-y-1">{flaggedProviders.map(p => <Link key={p.id} to={`/provider/${p.slug}`} className="block text-sm font-semibold text-brand-navy hover:underline">{p.name} · {p.city}</Link>)}</div>
    </div>}
    <div className="mb-4 flex flex-wrap gap-2">
      <select className="field max-w-48" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <input className="field max-w-56" placeholder="Filter by listing name…" value={q} onChange={e => setQ(e.target.value)} />
    </div>
    {filtered.length === 0 ? <p className="helper">No reports.</p> : <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-brand-muted"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Listing</th><th className="py-2 pr-3">Reason</th><th className="py-2 pr-3">Status</th><th className="py-2"></th></tr></thead>
        <tbody>
          {filtered.map(r => {
            const prov = provById[r.resource_id];
            const flagged = counts[r.resource_id] >= FLAG_THRESHOLD;
            return <tr key={r.id} className="border-t cursor-pointer hover:bg-brand-tint" onClick={() => setSel(r)}>
              <td className="py-3 pr-3 text-brand-muted">{new Date(r.created_date).toLocaleDateString()}</td>
              <td className="py-3 pr-3 font-semibold text-brand-ink">{prov?.name || r.resource_name || '—'}{flagged && <span className="ml-2 rounded-full bg-brand-gold-bg px-2 py-0.5 text-[10px] font-bold text-brand-gold-ink">Needs review</span>}</td>
              <td className="py-3 pr-3 text-brand-body">{REASON_LABELS[r.reason_category] || r.reason_category}</td>
              <td className="py-3 pr-3"><StatusBadge status={r.status} /></td>
              <td className="py-3 text-right"><ExternalLink size={15} className="text-brand-muted" /></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>}
  </div>;
}

function StatusBadge({ status }) {
  const cls = status === 'New' ? 'bg-brand-gold-bg text-brand-gold-ink' : status === 'Under review' ? 'bg-brand-tint text-brand-teal' : status === 'Resolved' ? 'bg-brand-surface text-brand-success' : 'bg-brand-surface text-brand-muted';
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{status}</span>;
}

function ReportDetail({ report, prov, reporter, others, flagged, user, onBack, onChanged }) {
  const [status, setStatus] = useState(report.status);
  const [note, setNote] = useState(report.admin_notes || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const saveStatus = async () => {
    setBusy(true); setMsg('');
    const patch = { status };
    if (status === 'Resolved' || status === 'Dismissed') { patch.resolved_at = new Date().toISOString(); patch.resolved_by = user?.id || ''; }
    else { patch.resolved_at = null; patch.resolved_by = null; }
    try { await api.entities.ListingReport.update(report.id, patch); setMsg('Saved'); onChanged(); } catch { setMsg('Could not save'); }
    setBusy(false);
  };
  const saveNote = async () => {
    setBusy(true); setMsg('');
    try { await api.entities.ListingReport.update(report.id, { admin_notes: note }); setMsg('Note saved'); onChanged(); } catch { setMsg('Could not save'); }
    setBusy(false);
  };
  const unpublish = async () => { if (!prov) return; setBusy(true); try { await api.entities.Provider.update(prov.id, { status: 'hidden' }); setMsg('Listing unpublished'); onChanged(); } catch { setMsg('Could not update'); } setBusy(false); };
  const ban = async () => { if (!prov) return; setBusy(true); try { await api.entities.Provider.update(prov.id, { status: 'archived' }); setMsg('Listing banned'); onChanged(); } catch { setMsg('Could not update'); } setBusy(false); };

  return <div className="panel space-y-5">
    <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-brand-teal"><ArrowLeft size={16} />Back to reports</button>
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="section-title">Report detail</h2>
        <p className="helper">{new Date(report.created_date).toLocaleString()}</p>
      </div>
      {flagged && <span className="rounded-full bg-brand-gold-bg px-3 py-1 text-xs font-bold text-brand-gold-ink">Needs review</span>}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><p className="text-xs font-bold text-brand-muted">REASON</p><p className="mt-1 text-sm font-semibold text-brand-ink">{REASON_LABELS[report.reason_category] || report.reason_category}</p></div>
      <div><p className="text-xs font-bold text-brand-muted">STATUS</p><div className="mt-1 flex items-center gap-2"><select className="field max-w-44" value={status} onChange={e => setStatus(e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select><button onClick={saveStatus} disabled={busy} className="primary py-2 text-xs">Save</button></div></div>
    </div>
    <div><p className="text-xs font-bold text-brand-muted">EXPLANATION</p><p className="mt-1 whitespace-pre-line text-sm leading-6 text-brand-body">{report.explanation}</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><p className="text-xs font-bold text-brand-muted">CONTACT OK</p><p className="mt-1 text-sm text-brand-body">{report.contact_ok ? 'Yes — reporter agreed to be contacted' : 'No'}</p>{report.reporter_phone && <p className="mt-1 flex items-center gap-1 text-sm text-brand-body"><Phone size={13} />{report.reporter_phone}</p>}</div>
      <div><p className="text-xs font-bold text-brand-muted">REPORTER (admin only)</p><p className="mt-1 text-sm text-brand-body">{reporter?.email || '—'}</p></div>
    </div>
    {prov && <div className="rounded-lg bg-brand-tint p-4">
      <p className="text-xs font-bold text-brand-muted">LINKED LISTING</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <Link to={`/provider/${prov.slug}`} className="font-semibold text-brand-navy hover:underline">{prov.name}</Link>
        <span className="text-xs text-brand-muted">{prov.city} · status: {prov.status}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-brand-body">
        {prov.email && <a href={`mailto:${prov.email}`} className="flex items-center gap-1 hover:underline"><Mail size={13} />{prov.email}</a>}
        {prov.phone && <span className="flex items-center gap-1"><Phone size={13} />{prov.phone}</span>}
      </div>
      <p className="mt-2 text-xs text-brand-muted">{others.length} other report{others.length !== 1 ? 's' : ''} on this listing</p>
      {others.length > 0 && <div className="mt-2 space-y-1">{others.map(o => <p key={o.id} className="text-xs text-brand-body">{new Date(o.created_date).toLocaleDateString()} — {REASON_LABELS[o.reason_category] || o.reason_category} · <StatusBadge status={o.status} /></p>)}</div>}
    </div>}
    <div>
      <p className="text-xs font-bold text-brand-muted">INTERNAL NOTE</p>
      <textarea className="field mt-1 min-h-20" value={note} onChange={e => setNote(e.target.value)} placeholder="Add an internal note (admin only, never shared with the provider)…" />
      <button onClick={saveNote} disabled={busy} className="secondary mt-2 py-2 text-xs">Save note</button>
    </div>
    {prov && <div className="flex flex-wrap gap-2 border-t pt-4">
      {prov.email && <a href={`mailto:${prov.email}`} className="secondary py-2 text-xs"><Mail size={14} />Contact provider</a>}
      <button onClick={unpublish} disabled={busy} className="secondary py-2 text-xs"><EyeOff size={14} />Unpublish listing</button>
      <button onClick={ban} disabled={busy} className="secondary py-2 text-xs text-brand-error"><Ban size={14} />Ban listing</button>
    </div>}
    {msg && <p className="text-sm font-semibold text-brand-teal">{msg}</p>}
  </div>;
}