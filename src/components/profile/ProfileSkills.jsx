import React, { useEffect, useState } from 'react';
import { Pencil, Loader2, X, Award } from 'lucide-react';
import { api } from '@/api/client';

// Skills, and who has endorsed them — LinkedIn's mechanic, scaled to a
// community: a member lists what they do, and anyone who knows their work
// can back it up with one click. Endorsement counts are public (even to a
// guest), the same as a listing's vouch count.
export default function ProfileSkills({ user, me, editable, onSave, editing, setEditing }) {
  const [draft, setDraft] = useState('');
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState([]);
  const [endorseBusy, setEndorseBusy] = useState(null);
  const open = editing === 'skills';
  const skills = user.skills || [];
  const canEndorse = me && !me.guest && me.id !== user.id;

  useEffect(() => { if (open) { setList(skills); setDraft(''); setErr(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every endorsement for this profile, loaded once: enough to both count
  // per skill and know whether the viewer already endorsed each one.
  useEffect(() => {
    let alive = true;
    api.entities.SkillEndorsement.filter({ user_id: user.id }).then((r) => { if (alive) setRows(r); }).catch(() => {});
    return () => { alive = false; };
  }, [user.id]);

  if (!skills.length && !editable) return null;

  const start = () => setEditing('skills');
  const addFromDraft = () => {
    const clean = draft.trim();
    setDraft('');
    if (!clean || list.some((s) => s.toLowerCase() === clean.toLowerCase())) return;
    if (list.length >= 30) { setErr('Up to 30 skills.'); return; }
    setList([...list, clean]);
  };
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addFromDraft(); }
  };
  const remove = (skill) => setList(list.filter((s) => s !== skill));
  const save = async () => {
    setBusy(true); setErr('');
    try { await onSave({ skills: list }); setEditing(null); }
    catch (error) { setErr(error.message || 'Could not save'); }
    finally { setBusy(false); }
  };

  const countOf = (skill) => rows.filter((r) => r.skill.toLowerCase() === skill.toLowerCase()).length;
  const endorsedByMe = (skill) => !!me && rows.some((r) => r.skill.toLowerCase() === skill.toLowerCase() && r.created_by_id === me.id);
  const ranked = [...skills].sort((a, b) => countOf(b) - countOf(a));

  const toggleEndorse = async (skill) => {
    if (!canEndorse || endorseBusy) return;
    setEndorseBusy(skill);
    const r = await api.functions.invoke('toggleSkillEndorsement', { user_id: user.id, skill });
    setEndorseBusy(null);
    if (r.status >= 400) { setErr(r.data?.error || 'Could not endorse'); return; }
    setErr('');
    // Optimistic-enough: refetch rather than hand-patch, since the count
    // depends on rows this component does not otherwise track per-toggle.
    api.entities.SkillEndorsement.filter({ user_id: user.id }).then(setRows).catch(() => {});
  };

  return <section id="skills" className="panel scroll-mt-24 space-y-3">
    <div className="flex items-center justify-between gap-3"><h2 className="section-title">Skills</h2>{editable && !open && <button type="button" onClick={start} className="icon-button" aria-label="Edit skills"><Pencil size={16}/></button>}</div>
    {open
      ? <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {list.map((s) => <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1.5 text-sm font-medium text-brand-ink">{s}<button type="button" onClick={() => remove(s)} aria-label={`Remove ${s}`} className="text-brand-muted hover:text-brand-error"><X size={13}/></button></span>)}
        </div>
        <input className="field" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} onBlur={addFromDraft} placeholder="Type a skill and press Enter — Bookkeeping, Plumbing, Excel…" autoFocus/>
        {err && <p className="text-sm font-semibold text-brand-error">{err}</p>}
        <div className="flex items-center gap-3"><button type="button" onClick={save} className="primary" disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin"/> : null}Save</button><button type="button" onClick={() => setEditing(null)} className="text-sm font-medium text-brand-muted hover:text-brand-ink">Cancel</button></div>
      </div>
      : skills.length
        ? <div className="flex flex-wrap gap-2">
          {ranked.map((s) => {
            const count = countOf(s);
            const mine = endorsedByMe(s);
            return <button
              key={s}
              type="button"
              disabled={!canEndorse || endorseBusy === s}
              onClick={() => toggleEndorse(s)}
              title={canEndorse ? (mine ? 'Remove your endorsement' : 'Endorse this skill') : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${mine ? 'bg-brand-teal text-white ring-brand-teal' : 'bg-brand-tint text-brand-ink ring-transparent'} ${canEndorse ? 'cursor-pointer hover:ring-brand-teal' : 'cursor-default'}`}
            >
              {endorseBusy === s ? <Loader2 size={13} className="animate-spin"/> : <Award size={13} className={mine ? '' : 'text-brand-teal'}/>}
              {s}
              {count > 0 && <span className={`text-xs font-semibold ${mine ? 'text-white/80' : 'text-brand-muted'}`}>{count}</span>}
            </button>;
          })}
        </div>
        : <button type="button" onClick={start} className="w-full rounded-2xl border border-dashed border-brand-line px-4 py-5 text-left text-sm text-brand-muted hover:border-brand-teal hover:text-brand-teal">Add skills so people know what to ask you about — and connections can back you up.</button>}
    {!open && err && <p className="text-sm font-semibold text-brand-error">{err}</p>}
  </section>;
}
