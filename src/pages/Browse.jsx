import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { List, Map as MapIcon, SlidersHorizontal } from 'lucide-react';
import ResourceCard from '@/components/ResourceCard';
import DirectoryMap from '@/components/DirectoryMap';
const rad = (x) => x * Math.PI / 180;const miles = (a, b, c, d) => {const x = rad(c - a),y = rad(d - b),q = Math.sin(x / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(y / 2) ** 2;return 3959 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));};
export default function Browse() {const params = new URLSearchParams(location.search);const [providers, setProviders] = useState([]),[categories, setCategories] = useState([]),[q, setQ] = useState(params.get('q') || ''),[place, setPlace] = useState(params.get('location') || ''),[category, setCategory] = useState(params.get('category') || ''),[sort, setSort] = useState('nearest'),[verified, setVerified] = useState(false),[view, setView] = useState('list'),[homeCity, setHomeCity] = useState('');const lat = Number(params.get('lat')),lng = Number(params.get('lng'));
  useEffect(() => {Promise.all([api.entities.Provider.filter({ status: 'published' }), api.entities.Category.list('order')]).then(([p, c]) => {setProviders(p);setCategories(c);});}, []);
  // "Nearest" with no coordinates used to mean "no results". The city from
  // onboarding stands in for the device's location, so a member who never
  // granted permission still gets their own community first.
  useEffect(() => { api.auth.hasAccount().then(async (ok) => { if (!ok) return; const me = await api.auth.me(); setHomeCity((me.home_city || me.city || '').trim()); }).catch(() => {}); }, []);

  const match = (p, { q: text, place: where, category: cat, verified: onlyVerified }) => {
    const hay = `${p.name} ${p.tagline||''} ${p.category} ${p.subcategory} ${p.short_description} ${p.description}`.toLowerCase();
    const loc = `${p.city} ${p.neighborhood} ${p.zip} ${(p.service_areas || []).join(' ')}`.toLowerCase();
    return (!text || hay.includes(text.toLowerCase())) && (!where || loc.includes(where.toLowerCase()))
      && (!cat || p.category === cat) && (!onlyVerified || p.verified);
  };
  const order = (rows) => [...rows].sort((a, b) => sort === 'nearest' ? (a.distance ?? 9999) - (b.distance ?? 9999) : sort === 'used' ? (b.usage_count || 0) - (a.usage_count || 0) : sort === 'saved' ? (b.save_count || 0) - (a.save_count || 0) : sort === 'recent' ? new Date(b.created_date) - new Date(a.created_date) : a.name.localeCompare(b.name));

  // Narrow first, then widen — and say which one the visitor is looking at,
  // so "nothing here" is never mistaken for "this is broken".
  const { results, scope } = useMemo(() => {
    const withDistance = providers.map((p) => ({ ...p, distance: lat && lng && p.latitude && p.longitude ? miles(lat, lng, p.latitude, p.longitude) : null }));
    const asked = { q, place, category, verified };
    const exact = withDistance.filter((p) => match(p, asked));
    if (exact.length || (!place && !homeCity)) return { results: order(exact), scope: null };

    // The place they asked for has nothing: try their own city, then drop the
    // place filter entirely, keeping what they actually searched for.
    if (!place && homeCity) {
      const near = withDistance.filter((p) => match(p, { ...asked, place: homeCity }));
      if (near.length) return { results: order(near), scope: { kind: 'home', city: homeCity } };
    }
    const anywhere = withDistance.filter((p) => match(p, { ...asked, place: '' }));
    if (anywhere.length) return { results: order(anywhere), scope: { kind: 'everywhere', city: place || homeCity } };
    if (q || category || verified) {
      const loosened = withDistance.filter((p) => match(p, { q: '', place: '', category, verified: false }));
      if (loosened.length) return { results: order(loosened), scope: { kind: 'loosened', city: place || homeCity } };
    }
    return { results: [], scope: null };
  }, [providers, q, place, category, sort, verified, lat, lng, homeCity]); // eslint-disable-line react-hooks/exhaustive-deps

  // Counts come from what is actually listed, so a category never promises
  // results it does not have.
  const countFor = (name) => providers.filter((p) => p.category === name).length;
  // The result count is the point of recording a search: an empty one is the
  // clearest statement of what the directory is missing.
  const search = () => api.entities.ActivityEvent.create({ type: 'search', query: q, category, city: place || homeCity, results: results.length });return <div className="page-shell py-8"><div className="mb-7"><span className="eyebrow dark">DISCOVER</span><h1 className="title text-3xl">Community resources</h1><p className="helper">Search curated Klal listings—not an unfiltered public business index.</p></div><div className="mb-6 grid gap-2 rounded-2xl bg-brand-surface p-3 ring-1 ring-brand-line md:grid-cols-12"><input className="field md:col-span-3 rounded opacity-100 mx-1 px-3" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, service, or keyword" /><input className="field md:col-span-2" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="City or ZIP" /><select className="field px-1 py-1 md:col-span-2" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories ({providers.length})</option>{categories.map((c) => <option key={c.id} value={c.name} disabled={countFor(c.name) === 0}>{c.name} ({countFor(c.name)})</option>)}</select><select className="field md:col-span-2" value={sort} onChange={(e) => setSort(e.target.value)}><option value="nearest">Nearest</option><option value="used">Most Used</option><option value="saved">Most Saved</option><option value="recent">Recently Added</option><option value="alpha">Alphabetical</option></select><button onClick={search} className="primary md:col-span-1">Search</button><label className="flex items-center gap-2 px-2 text-sm md:col-span-2"><input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /> Verified only</label></div><div className="mb-3 flex items-center justify-between"><span className="text-sm font-medium">{results.length} {results.length === 1 ? 'resource' : 'resources'} found</span><div className="flex rounded-xl bg-brand-surface p-1 ring-1 ring-brand-line"><button onClick={() => setView('list')} className={`view-button ${view === 'list' ? 'active' : ''}`}><List size={16} />List</button><button onClick={() => setView('map')} className={`view-button ${view === 'map' ? 'active' : ''}`}><MapIcon size={16} />Map</button></div></div>{scope && <p className="mb-4 rounded-xl bg-brand-tint p-3 text-sm text-brand-body">{scope.kind === 'home' ? <>Nothing was listed for that search, so these are resources near <b>{scope.city}</b>.</> : scope.kind === 'everywhere' ? <>No listings{scope.city ? <> in <b>{scope.city}</b></> : null} yet — showing what the community has added everywhere.</> : <>Nothing matched exactly, so these are all the listings{category ? <> in <b>{category}</b></> : null}.</>}</p>}{view === 'map' ? <DirectoryMap providers={results} /> : <div className="grid gap-4 lg:grid-cols-2">{results.map((p) => <ResourceCard key={p.id} provider={p} distance={p.distance} />)}</div>}{results.length === 0 && <div className="empty"><SlidersHorizontal /><p>{providers.length === 0 ? 'The directory is just getting started — no listings have been added yet.' : 'Nothing matched. Try a different word, or clear the filters.'}</p>{providers.length > 0 && <button onClick={() => { setQ(''); setPlace(''); setCategory(''); setVerified(false); }} className="secondary">Clear filters</button>}{providers.length === 0 && <Link to="/add" className="primary">Add the first listing</Link>}</div>}</div>;}