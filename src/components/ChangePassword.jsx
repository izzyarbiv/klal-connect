import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { api } from '@/api/client';

// Change your own password. Needs the current one; there is no email round
// trip, so this is also how a member retires a temporary password an admin
// handed them.
export default function ChangePassword() {
  const [current, setCurrent] = useState(''), [next, setNext] = useState(''), [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    if (next !== confirm) { setErr('The new passwords do not match.'); return; }
    setBusy(true);
    try { await api.auth.changePassword(current, next); setMsg('Password changed.'); setCurrent(''); setNext(''); setConfirm(''); }
    catch (ex) { setErr(ex.message || 'Could not change the password.'); }
    setBusy(false);
  };
  return <form onSubmit={submit} className="panel my-4 space-y-3">
    <div className="flex items-center gap-2"><KeyRound className="text-brand-teal" size={18}/><h2 className="section-title">Password</h2></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <label>Current password<input type="password" autoComplete="current-password" className="field" value={current} onChange={(e) => setCurrent(e.target.value)} required/></label>
      <label>New password<input type="password" autoComplete="new-password" className="field" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} required/></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required/></label>
    </div>
    {err && <p className="text-sm font-semibold text-brand-error">{err}</p>}
    {msg && <p className="text-sm font-semibold text-brand-teal">{msg}</p>}
    <button disabled={busy} className="primary">Change password</button>
  </form>;
}
