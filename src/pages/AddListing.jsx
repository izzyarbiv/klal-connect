import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ListingForm from '@/components/ListingForm';
import ClaimForm from '@/components/ClaimForm';
import GuestPrompt from '@/components/GuestPrompt';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { canEditListing } from '@/lib/listing';

// Gated on arrival rather than at the submit button. Filling in sixteen fields
// and only then being told to create an account is the worst possible order,
// and it was inconsistent with messages/saved/profile, which say so up front.
//
// ?edit=<id> is the same page in edit mode. There was no way to change a
// listing at all: the tagline and payment link were editable from Settings, a
// free-text "request a larger change" went to a queue whose Approve button
// changed nothing on the listing, and an admin had no field editor either. So a
// correction could be asked for and never applied.
export default function AddListing() {
  const { user, isGuest, authChecked } = useAuth();
  const params = new URLSearchParams(location.search);
  const editId = params.get('edit') || '';
  const [tab, setTab] = useState(params.has('claim') ? 'claim' : 'add');
  const fromPost = params.get('from_post') || '';
  const [editing, setEditing] = useState(null);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!editId || !user || isGuest) return;
    let alive = true;
    (async () => {
      try {
        const row = await api.entities.Provider.get(editId);
        if (!alive) return;
        if (!row) { setEditError('That listing could not be found.'); return; }
        // The same rule the server enforces, so the refusal is explained here
        // rather than arriving as a 403 after the form is filled in.
        if (!canEditListing(row, user)) {
          setEditError('A listing is editable by whoever added it, or by the business once it has claimed it. You can suggest a correction from the listing page, and the team will take it from there.');
          return;
        }
        setEditing(row);
      } catch {
        if (alive) setEditError('That listing could not be loaded.');
      }
    })();
    return () => { alive = false; };
  }, [editId, user?.id, user?.role, isGuest]);

  if (!authChecked) return <div className="loading">Loading…</div>;
  if (!user || isGuest) {
    return <GuestPrompt
      title={editId ? 'Editing a listing needs an account' : 'Adding a listing needs an account'}
      body="Listings carry the name of whoever added them — that is what makes them worth something here. Create a free account and the form is yours; it takes a minute."
    />;
  }

  if (editId) {
    return <div className="page-shell max-w-4xl py-9">
      <span className="eyebrow">YOUR LISTING</span>
      <h1 className="title text-3xl">Edit this listing</h1>
      <p className="helper mb-6">Changes go live as soon as you save. Verification, featured placement and the community counters are not yours to set — those stay with the Klal team.</p>
      {editError
        ? <div className="empty"><p>{editError}</p><Link to="/directory" className="primary">Back to the directory</Link></div>
        : !editing
          ? <div className="loading">Loading the listing…</div>
          : <section className="panel"><ListingForm provider={editing}/></section>}
    </div>;
  }

  return <div className="page-shell max-w-4xl py-9">
    <span className="eyebrow">CONTRIBUTE</span>
    <h1 className="title text-3xl">Help our directory grow</h1>
    <p className="helper mb-6">New listings go live right away. Claims are checked with the business before the listing is handed over.</p>
    <div className="mb-6 grid grid-cols-2 rounded-lg bg-brand-tint p-1">
      <button onClick={() => setTab('add')} className={`tab ${tab === 'add' ? 'active' : ''}`}>Add a Community Resource</button>
      <button onClick={() => setTab('claim')} className={`tab ${tab === 'claim' ? 'active' : ''}`}>List or Claim Your Business</button>
    </div>
    {/* ?category= comes from an empty category tile on the homepage and
        ?from_post= from an answer to an ask: either way the form opens with
        what we already know filled in rather than asking for it again. */}
    {fromPost && <p className="mb-5 rounded-lg bg-brand-tint p-3 text-sm text-brand-body">
      You're turning an answer into a listing, so the next person searching finds it instead of having to ask.{' '}
      <Link to={`/feed?post=${encodeURIComponent(fromPost)}`} className="font-semibold text-brand-teal hover:underline">See the original ask</Link>
    </p>}
    <section className="panel">{tab === 'add'
      ? <ListingForm initialCategory={params.get('category') || ''} initialName={params.get('name') || ''} sourcePostId={fromPost}/>
      : <ClaimForm/>}</section>
  </div>;
}
