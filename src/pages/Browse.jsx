import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { List, Map as MapIcon, SlidersHorizontal, MessageCircle, Plus, MapPin } from 'lucide-react';
import ResourceCard from '@/components/ResourceCard';
import DirectoryMap from '@/components/DirectoryMap';
import { expandQuery, matchesQuery, providerHaystack } from '@/lib/searchTerms';
import { servesPlace } from '@/lib/place';
import { readStoredCommunity, storeCommunity } from '@/lib/community';

const rad = (x) => x * Math.PI / 180;
const miles = (a, b, c, d) => {
  const x = rad(c - a), y = rad(d - b);
  const q = Math.sin(x / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(y / 2) ** 2;
  return 3959 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
};

// A search id, so a contact action can be attributed to the search that led
// to it — "did this search actually help anyone" is the only question worth
// asking of search analytics.
const newSearchId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export default function Browse() {
  const params = new URLSearchParams(location.search);
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState(params.get('q') || '');
  // The community chosen anywhere else on the site, unless this link names one.
  const [place, setPlace] = useState(params.get('location') || readStoredCommunity());
  const [category, setCategory] = useState(params.get('category') || '');
  const [sort, setSort] = useState('nearest');
  const [verified, setVerified] = useState(false);
  const [view, setView] = useState('list');
  const [homeCity, setHomeCity] = useState('');
  const lat = Number(params.get('lat')), lng = Number(params.get('lng'));

  useEffect(() => {
    Promise.all([api.entities.Provider.filter({ status: 'published' }), api.entities.Category.list('order')])
      .then(([p, c]) => { setProviders(p); setCategories(c); })
      .catch(() => {});
  }, []);

  // "Nearest" with no coordinates used to mean "no results". The city from
  // onboarding stands in for the device's location, so a member who never
  // granted permission still gets their own community first.
  useEffect(() => {
    api.auth.hasAccount().then(async (ok) => {
      if (!ok) return;
      const me = await api.auth.me();
      setHomeCity((me.home_city || me.city || '').trim());
    }).catch(() => {});
  }, []);

  const terms = useMemo(() => expandQuery(q), [q]);

  // Narrowing to a place is also choosing a community — remembered, so the
  // rest of the site opens where this search left off. servesPlace lives in
  // @/lib/place: it is the same answer the homepage gives.
  useEffect(() => { storeCommunity(place); }, [place]);

  const matchesText = (p) => matchesQuery(providerHaystack(p), terms);
  const matches = (p, where) => matchesText(p)
    && servesPlace(p, where)
    && (!category || p.category === category)
    && (!verified || p.verified);

  const order = (rows) => [...rows].sort((a, b) =>
    sort === 'nearest' ? (a.distance ?? 9999) - (b.distance ?? 9999)
      : sort === 'used' ? (b.usage_count || 0) - (a.usage_count || 0)
        : sort === 'saved' ? (b.save_count || 0) - (a.save_count || 0)
          : sort === 'recent' ? new Date(b.created_date) - new Date(a.created_date)
            : (a.name || '').localeCompare(b.name || ''));

  // Results are what actually matched — nothing else. The previous version
  // widened the search when it came up empty, and its last stage dropped the
  // query text altogether, so a search for a plumber with no plumbers listed
  // returned every listing in the directory while the header counted them as
  // results. A padded answer is worse than an honest "not yet".
  const { results, elsewhere, askedPlace } = useMemo(() => {
    const withDistance = providers.map((p) => ({
      ...p,
      distance: lat && lng && p.latitude && p.longitude ? miles(lat, lng, p.latitude, p.longitude) : null,
    }));
    const where = place || homeCity;
    const hits = withDistance.filter((p) => matches(p, where));
    // Same search, other communities. Shown under its own heading, never
    // mixed into the count.
    const other = where ? withDistance.filter((p) => matches(p, '') && !matches(p, where)) : [];
    return { results: order(hits), elsewhere: order(other), askedPlace: where };
  }, [providers, q, place, category, sort, verified, lat, lng, homeCity]); // eslint-disable-line react-hooks/exhaustive-deps

  // Counts come from what is actually listed, so a category never promises
  // results it does not have.
  const countFor = (name) => providers.filter((p) => p.category === name).length;

  const isSearch = !!(q || place || category || verified);

  // Every search is recorded, not only the ones where someone clicks the
  // button — most arrive from a link with the query already in the URL. The
  // result count is the point: an empty one is the clearest statement of
  // what this community is missing.
  useEffect(() => {
    if (!providers.length || !isSearch) return;
    const timer = setTimeout(() => {
      const search_id = newSearchId();
      try {
        sessionStorage.setItem('kc_last_search', JSON.stringify({ search_id, query: q, city: askedPlace, at: Date.now() }));
      } catch { /* private mode; attribution is a nicety */ }
      api.entities.ActivityEvent.create({
        type: 'search',
        query: q,
        category,
        city: askedPlace,
        results: results.length,
        zero_result: results.length === 0,
        search_id,
      }).catch(() => {});
    }, 900);
    return () => clearTimeout(timer);
  }, [q, place, category, verified, results.length, providers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // What to call the thing they were looking for, in a sentence. This text is
  // posted publicly under a real person's name, so it must not read as though
  // a machine wrote it.
  //
  // Articles are a trap here and not worth solving: an English "ends in s"
  // test says "a gemachim", because this vocabulary pluralises in -im and
  // -os — gemachim, mikvaos, yeshivos, sofrim, mohelim, shidduchim. So the
  // search is quoted rather than bent into a sentence. That is grammatical
  // whatever was typed, and it is also more honest: it shows the person
  // answering exactly what was searched for.
  const lookingFor = q.trim() || category || 'listings';
  const askSubject = q.trim() || category;
  const askText = askSubject
    ? `Looking for “${askSubject}”${askedPlace ? ` in ${askedPlace}` : ''} — does anyone have someone they would suggest?`
    : `Looking for a recommendation${askedPlace ? ` in ${askedPlace}` : ''} — can anyone help?`;
  const askHref = `/feed?ask=${encodeURIComponent(askText)}`;

  // The communities that do have something for this search, so "not here"
  // comes with somewhere to look.
  const otherPlaces = [...new Set(elsewhere.map((p) => (p.city || '').trim()).filter(Boolean))].slice(0, 6);

  const clearFilters = () => { setQ(''); setPlace(''); setCategory(''); setVerified(false); };

  return <div className="page-shell py-8">
    <div className="mb-7">
      <span className="eyebrow dark">DISCOVER</span>
      <h1 className="title text-3xl">Community resources</h1>
      <p className="helper">Search curated Klal listings—not an unfiltered public business index.</p>
    </div>

    <div className="mb-6 grid gap-2 rounded-lg bg-brand-surface p-3 ring-1 ring-brand-line md:grid-cols-12">
      <input className="field md:col-span-3 rounded opacity-100 mx-1 px-3" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Plumber, therapist, gemach…" />
      <input className="field md:col-span-2" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="City or ZIP" />
      <select className="field px-1 py-1 md:col-span-2" value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">All categories ({providers.length})</option>
        {categories.map((c) => <option key={c.id} value={c.name} disabled={countFor(c.name) === 0}>{c.name} ({countFor(c.name)})</option>)}
      </select>
      <select className="field md:col-span-2" value={sort} onChange={(e) => setSort(e.target.value)}>
        <option value="nearest">Nearest</option>
        <option value="used">Most Used</option>
        <option value="saved">Most Saved</option>
        <option value="recent">Recently Added</option>
        <option value="alpha">Alphabetical</option>
      </select>
      <button onClick={clearFilters} className="secondary md:col-span-1">Clear</button>
      <label className="flex items-center gap-2 px-2 text-sm md:col-span-2">
        <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /> Verified only
      </label>
    </div>

    <div className="mb-3 flex items-center justify-between">
      {/* When there is nothing local, say that — a bare "0 found" sitting
          above the clearly-labelled listings from other communities is the
          same confusion the padded count used to cause. */}
      <span className="text-sm font-medium">
        {results.length > 0
          ? <>{results.length} {results.length === 1 ? 'resource' : 'resources'} found{askedPlace ? ` in ${askedPlace}` : ''}</>
          : isSearch
            ? <>No matches{askedPlace ? <> in {askedPlace}</> : null}{elsewhere.length > 0 ? ` · ${elsewhere.length} elsewhere` : ''}</>
            : <>0 resources found</>}
      </span>
      <div className="flex rounded-xl bg-brand-surface p-1 ring-1 ring-brand-line">
        <button onClick={() => setView('list')} className={`view-button ${view === 'list' ? 'active' : ''}`}><List size={16} />List</button>
        <button onClick={() => setView('map')} className={`view-button ${view === 'map' ? 'active' : ''}`}><MapIcon size={16} />Map</button>
      </div>
    </div>

    {results.length > 0 && (view === 'map'
      ? <DirectoryMap providers={results} />
      // grid-cols-[minmax(0,1fr)] is load-bearing on a phone, for the same
      // reason it is in Feed: a grid item's default min-width is auto, so the
      // column grew to fit the widest listing card and pushed the page sideways.
      : <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[repeat(2,minmax(0,1fr))]">{results.map((p) => <ResourceCard key={p.id} provider={p} distance={p.distance} />)}</div>)}

    {/* Nothing matched. Say so plainly, then give three ways forward: where it
        does exist, asking the community, and adding it. */}
    {results.length === 0 && providers.length > 0 && <div className="space-y-4">
      <div className="rounded-xl bg-brand-surface p-6 ring-1 ring-brand-line">
        <div className="flex items-start gap-3">
          <SlidersHorizontal className="mt-0.5 shrink-0 text-brand-teal" size={20} />
          <div className="min-w-0">
            <p className="font-semibold text-brand-ink">
              {isSearch
                ? <>No matching {lookingFor.toLowerCase()}{askedPlace ? <> in <b>{askedPlace}</b></> : null} yet.</>
                : <>Nothing matched those filters.</>}
            </p>
            <p className="helper mt-1">This is a curated directory, so a gap means nobody has added it — not that it does not exist.</p>

            {otherPlaces.length > 0 && <div className="mt-4">
              <p className="text-sm font-semibold text-brand-ink">Listed in other communities</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {otherPlaces.map((city) => (
                  <button key={city} type="button" onClick={() => setPlace(city)} className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1.5 text-xs font-semibold text-brand-teal hover:ring-1 hover:ring-brand-teal">
                    <MapPin size={12} />{city}
                  </button>
                ))}
              </div>
            </div>}

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to={askHref} className="primary"><MessageCircle size={16} />Ask the community</Link>
              <Link to="/add" className="secondary"><Plus size={16} />Suggest a listing</Link>
              {isSearch && <button type="button" onClick={clearFilters} className="secondary">Clear filters</button>}
            </div>
          </div>
        </div>
      </div>

      {/* Related results, clearly separated — never counted as matches. */}
      {elsewhere.length > 0 && <section>
        <h2 className="section-title mb-3">You might also look at…</h2>
        <p className="helper mb-3 mt-0">These match your search but are listed in another community.</p>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[repeat(2,minmax(0,1fr))]">{elsewhere.slice(0, 6).map((p) => <ResourceCard key={p.id} provider={p} distance={p.distance} />)}</div>
      </section>}
    </div>}

    {providers.length === 0 && <div className="empty">
      <SlidersHorizontal />
      <p>The directory is just getting started — no listings have been added yet.</p>
      <Link to="/add" className="primary">Add the first listing</Link>
    </div>}
  </div>;
}
