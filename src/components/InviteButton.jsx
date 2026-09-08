import React, { useEffect, useState } from 'react';
import { MessageCircle, Link2, Check, UserPlus } from 'lucide-react';
import { api } from '@/api/client';
import { waShareUrl, WA_GREEN } from '@/components/ShareButton';

// A member's personal invite link, with WhatsApp first because that is where
// this community already talks. The link is created on first use and reused.
export function useMyInvite() {
  const [invite, setInvite] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!(await api.auth.hasAccount())) return;
        const r = await api.functions.invoke('myInvite', {});
        if (alive && r.status < 400) setInvite(r.data.invite);
      } catch { /* guest or offline */ }
    })();
    return () => { alive = false; };
  }, []);
  return invite;
}

export const inviteLink = (invite) => `${window.location.origin}/join/${invite.code}`;

export default function InviteButton({ compact = false, message }) {
  const invite = useMyInvite();
  const [copied, setCopied] = useState(false);
  if (!invite) return null;
  const link = inviteLink(invite);
  const text = message || `I'm on Klal Connect — the directory and community network for the frum world. Trusted businesses, gemachs, professionals, and asks answered by people you know. Join me: ${link}`;
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } };
  const pad = compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm';
  return <div className="flex flex-wrap items-center gap-2">
    <a href={waShareUrl(text)} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-xl font-bold text-white ${pad}`} style={{ background: WA_GREEN }}><MessageCircle size={16}/>Invite on WhatsApp</a>
    <button type="button" onClick={copy} className={`inline-flex items-center gap-2 rounded-xl border border-brand-line bg-brand-surface font-semibold text-brand-ink hover:bg-brand-tint ${pad}`}>{copied ? <><Check size={16}/>Copied</> : <><Link2 size={16}/>Copy link</>}</button>
    {!compact && invite.joined_count > 0 && <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal"><UserPlus size={14}/>{invite.joined_count} joined from your link</span>}
  </div>;
}
