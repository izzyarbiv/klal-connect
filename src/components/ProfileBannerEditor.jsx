import React, { useState } from 'react';
import { api } from '@/api/client';
import { ImagePlus, Loader2 } from 'lucide-react';
import ProfileBanner from '@/components/ProfileBanner';

export default function ProfileBannerEditor({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch (uploadError) {
      setErr(uploadError.message || 'That image could not be uploaded.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="overflow-hidden rounded-3xl ring-1 ring-brand-line">
        <ProfileBanner url={value} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <label className="secondary cursor-pointer">
          {busy ? <><Loader2 size={16} className="animate-spin" />Uploading…</> : <><ImagePlus size={16} />{value ? 'Change cover' : 'Add a cover image'}</>}
          <input type="file" accept="image/*" onChange={upload} className="hidden" disabled={busy} />
        </label>
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-sm font-semibold text-brand-error">
            Remove
          </button>
        )}
      </div>
      {err && <p className="mt-2 text-sm font-semibold text-brand-error">{err}</p>}
      <p className="helper mt-2">Wide image, roughly 4:1. Shown across the top of your profile.</p>
    </div>
  );
}
