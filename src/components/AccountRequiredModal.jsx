import React, { useEffect, useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { ACCOUNT_REQUIRED_EVENT } from '@/api/client';
import { AccountButtons } from '@/components/GuestPrompt';

// Opens whenever a guest tries to do something that needs an account
// (api.auth.requireAccount raises the event). Mounted once, in AppLayout.
export default function AccountRequiredModal() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(ACCOUNT_REQUIRED_EVENT, show);
    return () => window.removeEventListener(ACCOUNT_REQUIRED_EVENT, show);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;
  const here = window.location.pathname + window.location.search;
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4" onClick={() => setOpen(false)}>
    <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-brand-surface p-6 shadow-xl ring-1 ring-brand-line" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-tint text-brand-teal"><UserPlus size={20}/></div>
          <h3 className="section-title">Join Klal to do that</h3>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close" className="icon-button -mt-1 -mr-1"><X size={18}/></button>
      </div>
      <p className="helper mt-3">You're browsing as a guest. A free account lets you post, like, comment, connect with people, message, and save resources. The directory stays open to everyone.</p>
      <div className="mt-5"><AccountButtons returnTo={here}/></div>
      <button onClick={() => setOpen(false)} className="mt-3 text-xs font-medium text-brand-muted hover:text-brand-ink hover:underline">Keep browsing</button>
    </div>
  </div>;
}
