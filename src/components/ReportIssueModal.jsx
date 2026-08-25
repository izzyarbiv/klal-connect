import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { ShieldCheck, X, Loader2 } from 'lucide-react';

const REASONS = [
  { value: 'contact_wrong', label: 'Contact info is wrong' },
  { value: 'closed_business', label: 'No longer in business' },
  { value: 'wrong_category', label: 'Listed in the wrong category' },
  { value: 'duplicate', label: 'Duplicate listing' },
  { value: 'fake_impersonation', label: 'Fake listing or impersonation' },
  { value: 'inappropriate_content', label: 'Inappropriate content on the profile' },
  { value: 'serious_concern', label: 'Serious concern about this provider' },
  { value: 'other', label: 'Other' },
];

// Low-prominence "Report an issue" link + modal. Login is enforced before the
// modal opens: a logged-out user is sent to login with a contextual message
// and a ?report=1 flag so the modal reopens automatically on return. The
// reporter is stamped server-side from the session; nothing here sends a
// reporter id. Report content/count is never shown on the public page.
export default function ReportIssueModal({ provider }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [explanation, setExplanation] = useState('');
  const [contactOk, setContactOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('report') !== '1') return;
    (async () => {
      if (await api.auth.isAuthenticated()) {
        setOpen(true);
        params.delete('report');
        const qs = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : ''));
      }
    })();
  }, []);

  const openOrLogin = async () => {
    if (await api.auth.isAuthenticated()) { setOpen(true); return; }
    const url = new URL(window.location.href);
    url.searchParams.set('report', '1');
    const returnTo = url.pathname + url.search;
    window.location.href = '/login?returnTo=' + encodeURIComponent(returnTo) + '&reason=report';
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!reason) { setErr('Please choose a reason.'); return; }
    if (explanation.trim().length < 30) { setErr('Please add at least 30 characters of explanation.'); return; }
    if (explanation.length > 1000) { setErr('Explanation must be 1000 characters or fewer.'); return; }
    setBusy(true);
    const r = await api.functions.invoke('createReport', { resource_id: provider.id, reason_category: reason, explanation, contact_ok: contactOk });
    setBusy(false);
    if (r.status >= 400) { setErr(r.data?.error || 'Could not submit'); return; }
    setDone(true);
  };

  const close = () => { setOpen(false); setDone(false); setReason(''); setExplanation(''); setContactOk(false); setErr(''); };

  if (!open) return <button onClick={openOrLogin} className="mt-6 text-xs font-medium text-brand-muted hover:text-brand-ink hover:underline">Report an issue with this listing</button>;

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4" onClick={close}>
    <div className="w-full max-w-lg rounded-3xl bg-brand-surface p-6 shadow-xl ring-1 ring-brand-line" onClick={e => e.stopPropagation()}>
      {done ? (
        <div className="text-center">
          <ShieldCheck className="mx-auto text-brand-teal" size={32} />
          <h3 className="mt-3 section-title">Thank you</h3>
          <p className="helper">Our team will review this privately.</p>
          <button onClick={close} className="primary mt-4">Close</button>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <h3 className="section-title">Report an issue with this listing</h3>
            <button onClick={close} aria-label="Close" className="icon-button -mt-1 -mr-1"><X size={18} /></button>
          </div>
          <p className="helper mt-2">Reports go privately to our review team only. They are never posted publicly, never shown to other users, and never shared with the business. Please keep your report factual and limited to what's necessary to protect others.</p>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <label>Reason
              <select className="field" value={reason} onChange={e => setReason(e.target.value)} required>
                <option value="">Choose a reason…</option>
                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <label>Explanation
              <textarea className="field min-h-28" value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="Please describe what happened and what you'd like us to look into." required minLength={30} maxLength={1000} />
              <span className="mt-1 block text-xs text-brand-muted">{explanation.length}/1000 (minimum 30)</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-brand-body">
              <input type="checkbox" checked={contactOk} onChange={e => setContactOk(e.target.checked)} className="mt-1" />
              <span>You may contact me about this report</span>
            </label>
            {err && <p className="text-sm font-semibold text-brand-error">{err}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={close} className="secondary">Cancel</button>
              <button type="submit" disabled={busy} className="primary">{busy ? <Loader2 className="animate-spin" size={16} /> : 'Submit'}</button>
            </div>
          </form>
        </>
      )}
    </div>
  </div>;
}