import React, { useState } from 'react';
import { api } from '@/api/client';
import { NOTIFICATION_TYPES } from '@/lib/notifications';

export default function NotificationSettings({ user }) {
  const [prefs, setPrefs] = useState(user?.notification_prefs || {});
  const [saved, setSaved] = useState(false);
  const toggle = async (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    try {await api.auth.updateMe({ notification_prefs: next });setSaved(true);setTimeout(() => setSaved(false), 1500);} catch {}
  };
  return <section className="panel space-y-4 my-3">
    <div><h2 className="section-title">Notifications</h2><p className="helper">Choose which activity sends you a notification.</p></div>
    <div className="space-y-2">
      {NOTIFICATION_TYPES.map((t) =>
      <label key={t.key} className="flex items-center justify-between rounded-xl border border-brand-line px-3 py-2.5">
          <span className="text-sm font-medium text-brand-ink">{t.label}</span>
          <input type="checkbox" checked={prefs[t.key] !== false} onChange={(e) => toggle(t.key, e.target.checked)} className="h-4 w-4 accent-brand-teal" />
        </label>
      )}
    </div>
    {saved && <p className="text-sm font-semibold text-brand-teal">Saved</p>}
  </section>;
}