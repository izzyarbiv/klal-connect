import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, LogIn } from 'lucide-react';

// Log in / create-account links that bring the visitor back to where they
// were. Shared by the modal, the feed card and the guest page state.
export function accountLinks(returnTo) {
  const q = returnTo && returnTo !== '/' ? '?returnTo=' + encodeURIComponent(returnTo) : '';
  return { login: '/login' + q, register: '/register' + q };
}

export function AccountButtons({ returnTo, compact = false }) {
  const links = accountLinks(returnTo);
  const pad = compact ? 'px-4 py-2 text-sm' : 'px-5 py-2.5';
  return <div className="flex flex-wrap gap-2">
    <Link to={links.register} className={`inline-flex items-center gap-2 rounded-xl bg-brand-navy font-semibold text-white hover:bg-brand-navy-hover ${pad}`}><UserPlus size={16}/>Create a free account</Link>
    <Link to={links.login} className={`inline-flex items-center gap-2 rounded-xl border border-brand-line bg-brand-surface font-semibold text-brand-ink hover:bg-brand-tint ${pad}`}><LogIn size={16}/>Log in</Link>
  </div>;
}

// Full-page state for a guest who opened something that only makes sense with
// an account of their own (profile, messages, saved).
export default function GuestPrompt({ title = "You're browsing as a guest", body = 'Create a free account to post, like, comment, connect with people, message, and save resources.' }) {
  const here = window.location.pathname + window.location.search;
  return <div className="page-shell max-w-2xl py-9">
    <div className="panel space-y-4 text-center sm:text-left">
      <span className="eyebrow">GUEST</span>
      <h1 className="title text-2xl">{title}</h1>
      <p className="helper">{body}</p>
      <div className="flex justify-center sm:justify-start"><AccountButtons returnTo={here}/></div>
    </div>
  </div>;
}
