import React, { useEffect, useMemo, useState } from 'react';
import { Search, Store, X, PlusCircle } from 'lucide-react';
import { api } from '@/api/client';
import { searchDirectory } from '@/lib/search';
import { categoryLabel } from '@/lib/categories';

const MAX_MATCHES = 8;
const label = (n) => n.replaceAll('_', ' ').replace(/^./, (x) => x.toUpperCase());

// Claiming starts with a search, not a list of every listing: the matches for
// what was typed show as it is typed, and when nothing fits, the name typed
// goes to the team as a business we don't list yet.
export default function ClaimForm() {
  const providerId = new URLSearchParams(location.search).get('claim') || '';
  const [providers, setProviders] = useState([]);
  const [query, setQuery] = useState('');
  const [notListed, setNotListed] = useState(false);
  const [data, setData] = useState({ provider_id: providerId, provider_name: '', relationship: '', business_email: '', business_phone: '', website: '', verification_details: '' });
  const [done, setDone] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);

  useEffect(() => { api.entities.Provider.filter({ status: 'published' }).then(setProviders); }, []);
  const chosen = providers.find((p) => p.id === data.provider_id);
  useEffect(() => { if (chosen && !data.provider_name) setData((d) => ({ ...d, provider_name: chosen.name })); }, [chosen]);

  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    return searchDirectory(providers, { q: query }).results
      .sort((a, b) => b.score - a.score).slice(0, MAX_MATCHES).map((r) => r.provider);
  }, [providers, query]);
  const searched = query.trim().length >= 2;
  const showMissing = notListed || (searched && providers.length > 0 && !matches.length);

  const change = (e) => setData({ ...data, [e.target.name]: e.target.value });
  const pick = (p) => { setData({ ...data, provider_id: p.id, provider_name: p.name }); setNotListed(false); };
  const reset = () => { setData({ ...data, provider_id: '', provider_name: '' }); setNotListed(false); };
  const askToAdd = () => { setData({ ...data, provider_id: '', provider_name: query.trim() }); setNotListed(true); };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!(await api.auth.requireAccount())) return;
    setBusy(true); setErr('');
    const payload = data.provider_id ? data : { ...data, provider_name: (notListed ? data.provider_name : query).trim() };
    const r = await api.functions.invoke('createClaim', payload);
    if (r.status >= 400) { setErr(r.data?.error || 'Could not submit'); setBusy(false); return; }
    setDone(true);
  };
  if (done) return <div className="success p-6">{data.provider_id
    ? "Thank you. We check claims against the business before handing over the listing — you'll hear from us shortly."
    : "Thank you. We'll look for your business and either match it to a listing or add it as a new one — you'll hear from us shortly."}</div>;

  const ready = Boolean(data.provider_id) || showMissing;
  return <form onSubmit={submit} className="space-y-4">
    {data.provider_id ? <div>
      <label>Your business</label>
      <div className="mt-1 flex items-center gap-3 rounded-xl border border-brand-teal bg-brand-tint px-3 py-2.5">
        <Store className="h-5 w-5 shrink-0 text-brand-teal"/>
        <div className="min-w-0 flex-1"><p className="truncate font-semibold text-brand-ink">{chosen?.name || data.provider_name || 'Selected listing'}</p>{chosen && <p className="truncate text-xs text-brand-body">{[categoryLabel(chosen.subcategory || chosen.category), chosen.city].filter(Boolean).join(' · ')}</p>}</div>
        <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-brand-teal hover:bg-brand-surface"><X className="h-4 w-4"/>Change</button>
      </div>
    </div> : <div>
      <label htmlFor="claim-search">Find your business</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-brand-body"/>
        <input id="claim-search" type="search" autoComplete="off" className="field pl-9" placeholder="Start typing the business name" value={query}
          onChange={(e) => { setQuery(e.target.value); if (notListed) setData({ ...data, provider_name: e.target.value }); }}/>
      </div>
      {!searched && !notListed && <p className="helper">Type at least two letters and matching listings will show here.</p>}
      {searched && matches.length > 0 && <ul className="mt-2 divide-y divide-brand-line overflow-hidden rounded-xl border border-brand-line">
        {matches.map((p) => <li key={p.id}><button type="button" onClick={() => pick(p)} className="flex w-full items-center gap-3 bg-brand-surface px-3 py-2.5 text-left hover:bg-brand-tint">
          <Store className="h-4 w-4 shrink-0 text-brand-teal"/>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-brand-ink">{p.name}</span><span className="block truncate text-xs text-brand-body">{[categoryLabel(p.subcategory || p.category), p.city].filter(Boolean).join(' · ')}</span></span>
          <span className="text-sm font-semibold text-brand-teal">Claim</span>
        </button></li>)}
      </ul>}
      {searched && matches.length > 0 && !notListed && <button type="button" onClick={askToAdd} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-teal hover:underline"><PlusCircle className="h-4 w-4"/>My business isn't in this list</button>}
    </div>}

    {!data.provider_id && showMissing && <div className="rounded-xl border border-brand-line bg-brand-tint p-4">
      <p className="text-sm font-semibold text-brand-ink">{matches.length ? 'Not in the list?' : `No listing matches “${query.trim()}”.`}</p>
      <p className="mt-1 text-sm leading-6 text-brand-body">Tell us the business name and we'll find it on our side, or add it as a new listing once we've checked with you.</p>
      <label className="mt-3">Business name<input required className="field" name="provider_name" value={notListed ? data.provider_name : query}
        onChange={(e) => { setNotListed(true); change(e); }}/></label>
    </div>}

    {ready && <>
      {['relationship', 'business_email', 'business_phone', 'website'].map((n) => <label key={n}>{label(n)}<input required={n === 'relationship'} className="field" name={n} value={data[n]} onChange={change}/></label>)}
      <label>Verification details<textarea required className="field min-h-28" name="verification_details" value={data.verification_details} onChange={change} placeholder="Explain your relationship and how our team can verify it."/></label>
      {err && <p className="text-sm font-semibold text-brand-error">{err}</p>}
      <button disabled={busy} className="primary disabled:opacity-60">{busy ? 'Sending…' : data.provider_id ? 'Submit claim request' : 'Send for review'}</button>
    </>}
  </form>;
}
