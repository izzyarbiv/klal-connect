import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { connectionStatusWith } from '@/lib/connections';

// Shown only for members you are already connected with (accepted).
// Links to the private 1:1 conversation thread.
export default function MessageButton({ targetId, me, connections, size = 'md' }){
  if (!me || me.id === targetId) return null;
  const st = connectionStatusWith(targetId, connections);
  if (st.status !== 'accepted') return null;
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';
  return <Link to={`/messages/${targetId}`} className={`inline-flex items-center gap-1.5 rounded-xl border border-brand-line bg-brand-surface font-semibold text-brand-ink hover:bg-brand-tint ${pad}`}><Mail size={15}/>Message</Link>;
}