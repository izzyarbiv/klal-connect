import React from 'react';

const MAX = 120;

// Free-text headline/tagline editor with a live character counter, helper text,
// and an optional one-click suggestion (e.g. from the user's most recent role).
export default function HeadlineEdit({ label='Headline', value, onChange, suggestion, helper, placeholder }){
  const v = value || '';
  return <div>
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-brand-ink">{label}</span>
      <span className={`text-xs ${v.length>MAX?'text-brand-error':'text-brand-muted'}`}>{v.length} / {MAX}</span>
    </div>
    <input className="field" maxLength={MAX} value={v} onChange={e=>onChange(e.target.value)} placeholder={placeholder||'e.g. Helping Lakewood families find what they need, B"H'}/>
    <p className="helper">{helper||'Appears next to the name across the app. Free text — your own words, personality, or Hebrew/Yiddish.'}</p>
    {!v.trim() && suggestion && <button type="button" onClick={()=>onChange(suggestion)} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-brand-tint px-3 py-1.5 text-xs font-semibold text-brand-teal hover:bg-brand-gold-bg">Use suggestion: “{suggestion}”</button>}
  </div>;
}