import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import useVouchesEnabled from '@/hooks/useVouchesEnabled';
import { MapPin, Plus, ArrowRight, MessageCircle, ShieldCheck, Flame, Moon, Compass } from 'lucide-react';
import SearchPanel from '@/components/SearchPanel';
import AddListingPrompt from '@/components/AddListingPrompt';
import ResourceCard from '@/components/ResourceCard';
import { iconFor, guessIcon } from '@/lib/categoryIcons';
import { countMatches } from '@/lib/search';
import { servesPlace, communitiesFrom } from '@/lib/place';
import { useCommunity } from '@/lib/community';
import { useShabbosStatus } from '@/hooks/useShabbosStatus';
import { timeInZone } from '@/lib/time';
import { categoryLabel } from '@/lib/categories';

// The words people actually use, as searches rather than category filters —
// "Plumbers" is not a category, and the alias layer in @/lib/searchTerms is
// what turns it into results. A link with nothing behind it still leads
// somewhere useful: the directory says so plainly and offers to ask the klal.
const QUICK_LINKS = [
  ['Plumbers', 'plumber'],
  ['Therapists', 'therapist'],
  ['Gemachim', 'gemach'],
  ['Shuls', 'shul'],
  ['Mikvahs', 'mikvah'],
  ['Schools & Yeshivas', 'yeshiva'],
];

// Boca Raton is the launch community, so it is offered even before it is the
// best-stocked one. Every other chip is earned by having listings behind it.
const LAUNCH_COMMUNITY = 'Boca Raton';

export default function Home() {
  const vouchesOn = useVouchesEnabled();
  const { data: providers = [] } = useQuery({
    queryKey: ['providers', 'all'],
    queryFn: () => api.entities.Provider.filter({ status: 'published' }),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.entities.Category.list('order'),
  });
  // Only to seed the community — a signed-in member should not have to tell us
  // where they live twice.
  const { data: me = null } = useQuery({
    queryKey: ['me', 'home'],
    queryFn: async () => (await api.auth.hasAccount() ? api.auth.me() : null),
    retry: false,
  });

  const homeCity = String(me?.home_city || me?.city || '').trim();
  const [community, setCommunity] = useCommunity(homeCity);

  // What is available where they are. A listing that serves everywhere serves
  // here too — see @/lib/place, which is also what the search uses.
  const local = useMemo(() => providers.filter((p) => servesPlace(p, community)), [providers, community]);

  const communities = useMemo(() => {
    const found = communitiesFrom(providers);
    const names = new Set(found.map((c) => c.city));
    // Deduped against each other, not only against the listed cities: when the
    // chosen community *is* the launch community and neither has listings yet,
    // both candidates passed the filter and React was handed two chips with the
    // same key — which duplicates or drops one. Likely at launch, where Boca
    // Raton may have nothing in it yet.
    const extra = [...new Set([LAUNCH_COMMUNITY, community])].filter((c) => c && !names.has(c)).map((city) => ({ city, count: 0 }));
    return [...found, ...extra].slice(0, 8);
  }, [providers, community]);

  // Counted against exactly what a click will return, so a number on a chip is
  // a promise the directory keeps. Links with results come first; the rest stay
  // visible, because a gap is also information — and an invitation.
  const quickLinks = useMemo(() => QUICK_LINKS
    .map(([label, q]) => ({ label, q, count: countMatches(providers, q, community) }))
    .sort((a, b) => (b.count > 0) - (a.count > 0)), [providers, community]);

  // Real counts or none. A category with nothing in it is not hidden and is
  // not promised as "coming soon" — nobody has committed to filling it. It
  // asks for the first listing instead, which is the actual bottleneck.
  const tiles = useMemo(() => categories
    .map((c) => ({ ...c, count: local.filter((p) => p.category === c.name).length }))
    .sort((a, b) => b.count - a.count || (a.order ?? 99) - (b.order ?? 99))
    .slice(0, 8), [categories, local]);

  const where = community || 'your community';
  const browseHere = `/browse${community ? `?location=${encodeURIComponent(community)}` : ''}`;

  return <div className="page-shell space-y-14 py-8 md:space-y-16 md:py-12">
    {/* Search first. Everything that used to sit above it — slogan, mission,
        a dark band — now sits below it. */}
    <section>
      <h1 className="max-w-3xl font-display text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl md:text-5xl">Find a plumber, a gemach, a shul — from people who know.</h1>
      <p className="mt-3 max-w-2xl text-base text-brand-body sm:text-lg">A directory of frum businesses, gemachim and community resources, {vouchesOn ? 'vouched for' : 'shared'} by members and checked by Klal.</p>
      <div className="mt-6"><SearchPanel defaultLocation={community} /></div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {quickLinks.map(({ label, q, count }) => <Link
          key={q}
          to={`/browse?q=${encodeURIComponent(q)}${community ? `&location=${encodeURIComponent(community)}` : ''}`}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${count > 0 ? 'bg-brand-tint text-brand-teal hover:ring-1 hover:ring-brand-teal' : 'text-brand-muted ring-1 ring-brand-line hover:text-brand-ink'}`}
        >{label}{count > 0 && <span className="text-xs font-bold text-brand-teal/70">{count}</span>}</Link>)}
      </div>
      <AddListingPrompt className="mt-5" />
    </section>

    {/* Choosing a community here is remembered everywhere else on the site. */}
    {communities.length > 0 && <section>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-ink"><MapPin size={15} className="text-brand-teal" />Community</span>
        {communities.map(({ city, count }) => <button
          key={city}
          type="button"
          onClick={() => setCommunity(city === community ? '' : city)}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${city === community ? 'bg-brand-navy text-white' : 'bg-brand-surface text-brand-body ring-1 ring-brand-line hover:text-brand-ink'}`}
        >{city}{count > 0 && city !== community && <span className="ml-1.5 text-xs text-brand-muted">{count}</span>}</button>)}
        {community && <button type="button" onClick={() => setCommunity('')} className="text-sm font-medium text-brand-muted hover:text-brand-ink">Show everywhere</button>}
      </div>
    </section>}

    <LocalSection community={community} where={where} local={local} browseHere={browseHere} />

    <section>
      <div className="section-head">
        <div><span className="eyebrow">BROWSE</span><h2 className="title">Categories{community ? ` in ${community}` : ''}</h2></div>
        {categories.length > tiles.length && <Link to="/directory" className="text-sm font-semibold text-brand-teal">All {categories.length} categories</Link>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((c) => {
          const Icon = iconFor(c.icon && c.icon !== 'MoreHorizontal' ? c.icon : guessIcon(c.name));
          const empty = c.count === 0;
          return <Link
            key={c.id || c.slug || c.name}
            to={empty ? `/add?category=${encodeURIComponent(c.name)}` : `/browse?category=${encodeURIComponent(c.name)}${community ? `&location=${encodeURIComponent(community)}` : ''}`}
            className={`group rounded-lg p-4 transition hover:-translate-y-0.5 hover:shadow-md ${empty ? 'border border-dashed border-brand-line bg-brand-canvas' : 'bg-brand-surface ring-1 ring-brand-line'}`}
          >
            <Icon className={`mb-3 ${empty ? 'text-brand-muted' : 'text-brand-teal'}`} size={22} />
            <span className={`block text-sm font-semibold leading-tight ${empty ? 'text-brand-body' : 'text-brand-ink'}`}>{categoryLabel(c.name)}</span>
            <span className="mt-1 block text-xs text-brand-muted">
              {empty ? 'Add the first' : `${c.count} listed`}
            </span>
          </Link>;
        })}
      </div>
    </section>

    {/* The mission, and how the place works — below the useful part, not
        above it. Someone who needs a phone number should never have to read
        past a manifesto to reach the search box. */}
    <section className="grid gap-6 md:grid-cols-2">
      <div className="panel space-y-3">
        <Compass size={22} className="text-brand-teal" />
        <h2 className="font-heading text-xl font-bold text-brand-ink">Use it as a resource</h2>
        <p className="leading-7 text-brand-body">Find a doctor, a gemach, a tutor, a caterer — wherever you are. Search, save, and reach people the community already relies on.</p>
        <Link to="/directory" className="secondary inline-flex"><ArrowRight size={16} />Explore the directory</Link>
      </div>
      <div className="panel space-y-3">
        <MessageCircle size={22} className="text-brand-gold-ink" />
        <h2 className="font-heading text-xl font-bold text-brand-ink">Use it to be found</h2>
        <p className="leading-7 text-brand-body">Add your business or organization, keep it current, and answer the people asking for exactly what you do.</p>
        <Link to="/add" className="secondary inline-flex"><Plus size={16} />Add a listing</Link>
      </div>
    </section>

    <section className="rounded-xl bg-brand-canvas p-7 text-center ring-1 ring-brand-line md:p-10">
      <ShieldCheck size={26} className="mx-auto text-brand-teal" />
      <h2 className="mt-3 font-heading text-xl font-bold text-brand-ink">Built on trust, not reviews</h2>
      <p className="mx-auto mt-3 max-w-xl text-brand-body">No public negative reviews and no rating wars. Klal Connect shows community usage{vouchesOn ? ' and positive experiences' : ''}, and handles corrections privately — because a livelihood is on the other end of every listing.</p>
    </section>
  </div>;
}

// Everything that serves this community, plus the times that govern the week
// there. Shabbos times belong here, attached to a place, rather than in a band
// across the top of the page: they matter enormously on Friday and not at all
// to someone looking for an exterminator on Tuesday.
function LocalSection({ community, where, local, browseHere }) {
  const { status } = useShabbosStatus();
  const shown = local.slice(0, 4);
  const times = status?.cityLabel && (status.startsAt || status.endsAt) ? status : null;

  return <section>
    <div className="section-head">
      <div>
        <span className="eyebrow">NEAR YOU</span>
        <h2 className="title">Help that serves {where}</h2>
        {local.length > 0 && <p className="helper">{local.length} {local.length === 1 ? 'listing' : 'listings'} available{community ? ` in ${community}` : ''} — including organizations that help nationwide.</p>}
      </div>
      {local.length > shown.length && <Link to={browseHere} className="text-sm font-semibold text-brand-teal">See all {local.length}</Link>}
    </div>

    {times && <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-brand-surface px-4 py-3 text-sm ring-1 ring-brand-line">
      <span className="font-semibold text-brand-ink">{times.cityLabel}</span>
      {times.startsAt && <span className="inline-flex items-center gap-1.5 text-brand-body"><Flame size={14} className="text-brand-gold-ink" />Candle lighting <b className="text-brand-ink">{timeInZone(times.startsAt, times.tzid)}</b></span>}
      {times.endsAt && <span className="inline-flex items-center gap-1.5 text-brand-body"><Moon size={14} className="text-brand-teal" />Havdalah <b className="text-brand-ink">{timeInZone(times.endsAt, times.tzid)}</b></span>}
      {times.parsha && <span className="text-brand-muted">{times.parsha}</span>}
    </div>}

    {shown.length > 0
      ? <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[repeat(2,minmax(0,1fr))]">{shown.map((p) => <ResourceCard key={p.id} provider={p} />)}</div>
      : <div className="empty">
        <MapPin />
        <p>Nothing is listed for {where} yet. It is a curated directory, so a gap means nobody has added it — not that it does not exist.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link to="/add" className="primary"><Plus size={16} />Add the first listing</Link>
          <Link to="/feed" className="secondary"><MessageCircle size={16} />Ask the klal</Link>
        </div>
      </div>}
  </section>;
}
