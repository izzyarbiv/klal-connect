import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Quote, Loader2, Check, X, EyeOff } from 'lucide-react';
import { api } from '@/api/client';
import { notify } from '@/lib/notifications';

const nameFrom = (members, id, fallback) => members.find((m) => m.id === id)?.full_name || fallback || 'A member';

// Written testimonials, LinkedIn's other endorsement mechanic — but a
// recommendation is written about someone, so it only reaches their profile
// once they accept it. Nobody can have words put in their profile that they
// did not agree to show.
export default function ProfileRecommendations({ user, me, members, editable, editing, setEditing }) {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const open = editing === 'recommend';
  const canRecommend = !!me && !me.guest && me.id !== user.id;

  const load = () => api.entities.Recommendation.filter({ recipient_id: user.id }).then(setRows).catch(() => {});
  useEffect(() => { load(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { setDraft(''); setErr(''); } }, [open]);

  const accepted = rows.filter((r) => r.status === 'accepted');
  const pendingForMe = editable ? rows.filter((r) => r.status === 'pending') : [];
  const mine = me ? rows.find((r) => r.created_by_id === me.id) : null;

  if (!accepted.length && !editable && !canRecommend) return null;

  const respond = async (row, status) => {
    setBusy(true);
    try {
      await api.entities.Recommendation.update(row.id, { status });
      if (status === 'accepted') {
        await notify({ recipient_id: row.created_by_id, type: 'recommendation_accepted', actor: me, target_type: 'recommendation_accepted', target_id: row.id, message: `${me.full_name || 'Someone'} showed your recommendation on their profile` });
      }
      await load();
    } finally { setBusy(false); }
  };

  const submit = async () => {
    const text = draft.trim();
    if (text.length < 20) { setErr('Please write at least 20 characters.'); return; }
    setBusy(true); setErr('');
    try {
      const created = await api.entities.Recommendation.create({ recipient_id: user.id, body: text });
      await notify({ recipient_id: user.id, type: 'recommendation', actor: me, target_type: 'recommendation', target_id: created.id, message: `${me.full_name || 'Someone'} wrote you a recommendation` });
      setEditing(null);
      await load();
    } catch (error) { setErr(error.message || 'Could not send'); }
    finally { setBusy(false); }
  };

  return <section id="recommendations" className="panel scroll-mt-24 space-y-4">
    <div className="flex items-center justify-between gap-3">
      <h2 className="section-title">Recommendations</h2>
      {canRecommend && !open && !mine && <button type="button" onClick={() => setEditing('recommend')} className="text-sm font-semibold text-brand-teal hover:underline">Write a recommendation</button>}
    </div>

    {editable && pendingForMe.length > 0 && <div className="space-y-2 rounded-lg bg-brand-tint/60 p-4">
      <p className="text-sm font-semibold text-brand-ink">Waiting for your approval</p>
      {pendingForMe.map((r) => <div key={r.id} className="space-y-2 rounded-xl bg-brand-surface p-3 ring-1 ring-brand-line">
        <p className="text-xs font-semibold text-brand-ink">{nameFrom(members, r.created_by_id)}</p>
        <p className="whitespace-pre-line text-sm leading-6 text-brand-body">{r.body}</p>
        <div className="flex items-center gap-3">
          <button type="button" disabled={busy} onClick={() => respond(r, 'accepted')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-teal hover:underline"><Check size={14}/>Show on my profile</button>
          <button type="button" disabled={busy} onClick={() => respond(r, 'declined')} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted hover:text-brand-error"><X size={14}/>Decline</button>
        </div>
      </div>)}
    </div>}

    {open && <div className="space-y-3 rounded-lg bg-brand-tint/60 p-4 ring-1 ring-brand-line">
      <textarea className="field min-h-28" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`How do you know ${user.full_name || 'this person'}, and what would you tell someone about working with them?`} autoFocus/>
      <p className="text-xs text-brand-muted">Only visible on their profile if they choose to show it.</p>
      {err && <p className="text-sm font-semibold text-brand-error">{err}</p>}
      <div className="flex items-center gap-3"><button type="button" onClick={submit} className="primary" disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin"/> : null}Send</button><button type="button" onClick={() => setEditing(null)} className="text-sm font-medium text-brand-muted hover:text-brand-ink">Cancel</button></div>
    </div>}

    {accepted.length > 0
      ? <div className="space-y-4">
        {accepted.map((r) => <div key={r.id} className="space-y-2">
          <Quote size={16} className="text-brand-teal"/>
          <p className="whitespace-pre-line text-sm leading-6 text-brand-body">{r.body}</p>
          <div className="flex items-center justify-between gap-3">
            <Link to={`/profile/${r.created_by_id}`} className="text-xs font-semibold text-brand-ink hover:text-brand-teal hover:underline">{nameFrom(members, r.created_by_id)}</Link>
            {editable && <button type="button" disabled={busy} onClick={() => respond(r, 'declined')} className="inline-flex items-center gap-1 text-xs font-medium text-brand-muted hover:text-brand-error"><EyeOff size={12}/>Hide</button>}
          </div>
        </div>)}
      </div>
      : !open && !pendingForMe.length && <p className="text-sm text-brand-muted">{mine ? 'You wrote a recommendation — it will show here once accepted.' : 'No recommendations yet.'}</p>}
  </section>;
}
