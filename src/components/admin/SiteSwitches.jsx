import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Handshake } from 'lucide-react';

// Site-wide switches an admin can flip (stored as Setting rows, admin-only).
// The server reads the same rows — see server/settings.js — so a switch here
// is the rule for the API and the pages Google reads, not just the screen.
const VOUCHES = 'vouches_enabled';

export default function SiteSwitches() {
  const [on, setOn] = useState(false), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false), [err, setErr] = useState('');
  useEffect(() => {
    (async () => {
      try { const s = await api.entities.Setting.filter({ key: VOUCHES }); setOn(s[0]?.value === 'true'); } catch { /* shows as off */ }
      setLoaded(true);
    })();
  }, []);
  const toggle = async () => {
    setBusy(true); setErr('');
    try {
      const existing = await api.entities.Setting.filter({ key: VOUCHES });
      const next = !on;
      if (existing.length > 0) await api.entities.Setting.update(existing[0].id, { value: String(next) });
      else await api.entities.Setting.create({ key: VOUCHES, value: String(next) });
      setOn(next);
    } catch (e) { setErr(e.message || 'That did not save. Please try again.'); }
    finally { setBusy(false); }
  };
  return <div className="panel flex items-start justify-between gap-4">
    <div>
      <h2 className="section-title flex items-center gap-2"><Handshake size={18}/>Vouches and community notes</h2>
      <p className="helper">When off, vouches, vouch counts and community notes are hidden everywhere on the site, and nobody can add new ones. Nothing is deleted: turning it back on shows everything again as it was. The &ldquo;used them&rdquo; count is not affected.</p>
      <p className="mt-2 text-sm font-semibold text-brand-ink">{!loaded ? 'Checking…' : on ? 'On: visitors see vouches and notes.' : 'Off: vouches and notes are hidden.'}</p>
      {err && <p className="mt-1 text-xs font-semibold text-brand-error">{err}</p>}
    </div>
    <button onClick={toggle} disabled={!loaded || busy} className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white ${on ? 'bg-brand-error' : 'bg-brand-navy'}`}>{busy ? 'Saving…' : on ? 'Turn OFF' : 'Turn ON'}</button>
  </div>;
}
