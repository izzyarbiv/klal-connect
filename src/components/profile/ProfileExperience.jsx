import React, { useEffect, useState } from 'react';
import { Pencil, Loader2, Plus } from 'lucide-react';
import WorkExperienceEditor from '@/components/WorkExperienceEditor';
import WorkExperienceTimeline from '@/components/WorkExperienceTimeline';

// Roles held, as a timeline. The owner edits the whole list in place.
export default function ProfileExperience({ user, editable, onSave, companies, editing, setEditing }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const open = editing === 'experience';
  const list = Array.isArray(user.work_experience) ? user.work_experience : [];
  // Seeded from the profile every time the editor opens (pencil, prompt, or
  // checklist), so a cancelled draft never comes back.
  useEffect(() => { if (open) { setItems(list.map((j) => ({ ...j }))); setErr(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (list.length === 0 && !editable) return null;
  const start = () => setEditing('experience');
  const save = async () => {
    setBusy(true); setErr('');
    try { await onSave({ work_experience: items.filter((j) => (j.title || '').trim() || (j.company || '').trim()) }); setEditing(null); }
    catch (error) { setErr(error.message || 'Could not save'); }
    finally { setBusy(false); }
  };
  return <section id="experience" className="panel scroll-mt-24 space-y-4">
    <div className="flex items-center justify-between gap-3"><h2 className="section-title">Experience</h2>{editable && !open && list.length > 0 && <button type="button" onClick={start} className="icon-button" aria-label="Edit experience"><Pencil size={16}/></button>}</div>
    {open
      ? <div className="space-y-4">
        <WorkExperienceEditor value={items} onChange={setItems}/>
        {err && <p className="text-sm font-semibold text-brand-error">{err}</p>}
        <div className="flex items-center gap-3"><button type="button" onClick={save} className="primary" disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin"/> : null}Save</button><button type="button" onClick={() => setEditing(null)} className="text-sm font-medium text-brand-muted hover:text-brand-ink">Cancel</button></div>
      </div>
      : list.length > 0
        ? <WorkExperienceTimeline value={list} companyLinks={companies}/>
        : <button type="button" onClick={start} className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-brand-line px-4 py-3 text-sm text-brand-muted hover:border-brand-teal hover:text-brand-teal"><Plus size={16}/>Add your work or business. Roles show as a timeline, and a business in the directory links to its page.</button>}
  </section>;
}
