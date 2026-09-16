import React, { useEffect, useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';

// The bio. Others see it only when there is one; the owner always sees the
// section, with a prompt to write it.
export default function ProfileAbout({ user, editable, onSave, editing, setEditing }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const open = editing === 'about';
  const has = !!(user.bio && String(user.bio).trim());
  // Seeded from the profile every time the editor opens — it can be opened
  // by the pencil, the dashed prompt, or the checklist — so Save never writes
  // back an empty box over a bio that was there.
  useEffect(() => { if (open) { setText(user.bio || ''); setErr(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!has && !editable) return null;
  const start = () => setEditing('about');
  const save = async () => {
    setBusy(true); setErr('');
    try { await onSave({ bio: text.trim() }); setEditing(null); }
    catch (error) { setErr(error.message || 'Could not save'); }
    finally { setBusy(false); }
  };
  return <section id="about" className="panel scroll-mt-24 space-y-3">
    <div className="flex items-center justify-between gap-3"><h2 className="section-title">About</h2>{editable && !open && <button type="button" onClick={start} className="icon-button" aria-label="Edit about"><Pencil size={16}/></button>}</div>
    {open
      ? <div className="space-y-3">
        <textarea className="field min-h-32" value={text} onChange={(e) => setText(e.target.value)} placeholder="What you do, who you help, and how people in the community know you." autoFocus/>
        {err && <p className="text-sm font-semibold text-brand-error">{err}</p>}
        <div className="flex items-center gap-3"><button type="button" onClick={save} className="primary" disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin"/> : null}Save</button><button type="button" onClick={() => setEditing(null)} className="text-sm font-medium text-brand-muted hover:text-brand-ink">Cancel</button></div>
      </div>
      : has
        ? <p className="whitespace-pre-line leading-7 text-brand-body">{user.bio}</p>
        : <button type="button" onClick={start} className="w-full rounded-lg border border-dashed border-brand-line px-4 py-5 text-left text-sm text-brand-muted hover:border-brand-teal hover:text-brand-teal">Add a short bio — what you do and who you help. Members read this before they connect.</button>}
  </section>;
}
