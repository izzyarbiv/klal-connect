import React, { useState } from 'react';
import ListingForm from '@/components/ListingForm';
import ClaimForm from '@/components/ClaimForm';
import GuestPrompt from '@/components/GuestPrompt';
import { useAuth } from '@/lib/AuthContext';

// Gated on arrival rather than at the submit button. Filling in sixteen fields
// and only then being told to create an account is the worst possible order,
// and it was inconsistent with messages/saved/profile, which say so up front.
export default function AddListing() {
  const { user, isGuest, authChecked } = useAuth();
  const params = new URLSearchParams(location.search);
  const [tab, setTab] = useState(params.has('claim') ? 'claim' : 'add');

  if (!authChecked) return <div className="loading">Loading…</div>;
  if (!user || isGuest) {
    return <GuestPrompt
      title="Adding a listing needs an account"
      body="Listings carry the name of whoever added them — that is what makes them worth something here. Create a free account and the form is yours; it takes a minute."
    />;
  }

  return <div className="page-shell max-w-4xl py-9">
    <span className="eyebrow dark">CONTRIBUTE</span>
    <h1 className="title text-3xl">Help our directory grow</h1>
    <p className="helper mb-6">New listings go live right away. Claims are checked with the business before the listing is handed over.</p>
    <div className="mb-6 grid grid-cols-2 rounded-lg bg-brand-tint p-1">
      <button onClick={() => setTab('add')} className={`tab ${tab === 'add' ? 'active' : ''}`}>Add a Community Resource</button>
      <button onClick={() => setTab('claim')} className={`tab ${tab === 'claim' ? 'active' : ''}`}>List or Claim Your Business</button>
    </div>
    {/* ?category= comes from an empty category tile on the homepage: the form
        opens with that category chosen rather than asking for it again. */}
    <section className="panel">{tab === 'add' ? <ListingForm initialCategory={params.get('category') || ''}/> : <ClaimForm/>}</section>
  </div>;
}
