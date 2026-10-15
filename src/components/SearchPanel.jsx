import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, LocateFixed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import SuggestInput from '@/components/SuggestInput';
import { keywordSuggestions, placeSuggestions } from '@/lib/searchTerms';
import { servesPlace } from '@/lib/place';
import { lookupPlaces } from '@/lib/placeLookup';
import { providerPath } from '@/lib/paths';

// defaultLocation is the community already selected elsewhere on the page, so
// the search starts where the person is instead of asking them again.
export default function SearchPanel({ defaultLocation = '', autoFocus = false }) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState(defaultLocation);
  const [locating, setLocating] = useState(false);
  const navigate = useNavigate();

  // A later community choice updates the field — but never over something
  // typed into it, which would throw away what the person actually wants.
  const typed = useRef(false);
  useEffect(() => { if (!typed.current) setLocation(defaultLocation); }, [defaultLocation]);

  // The same lists the homepage already loads, so suggestions cost nothing
  // extra there.
  const { data: providers = [] } = useQuery({
    queryKey: ['providers', 'all'],
    queryFn: () => api.entities.Provider.filter({ status: 'published' }),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.entities.Category.list('order'),
  });
  const local = providers.filter((p) => servesPlace(p, location));

  const go = (q, where, category = '') => navigate(`/browse?q=${encodeURIComponent(q)}&location=${encodeURIComponent(where)}${category ? `&category=${encodeURIComponent(category)}` : ''}`);
  const submit = (e) => {
    e.preventDefault();
    go(query, location);
  };
  const pickKeyword = (item) => {
    if (item.kind === 'listing') navigate(providerPath(item.value));
    else if (item.kind === 'category') go('', location, item.value);
    else { setQuery(item.value); go(item.value, location); }
  };
  // The query used to be dropped here: searching for a plumber and then
  // tapping Near Me returned every listing nearby instead.
  const nearMe = () => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => { navigate(`/browse?q=${encodeURIComponent(query)}&lat=${coords.latitude}&lng=${coords.longitude}`); setLocating(false); },
      () => setLocating(false),
    );
  };

  return <form onSubmit={submit} className="rounded-xl bg-brand-surface p-3 ring-1 ring-brand-line md:flex md:gap-2">
    <label className="flex flex-1 items-center gap-3 border-b px-3 py-3 md:border-b-0 md:border-r">
      <Search className="text-brand-teal" />
      <SuggestInput wrapperClassName="w-full" value={query} onChange={setQuery} onPick={pickKeyword}
        suggest={(text) => keywordSuggestions(text, local, categories)}
        autoFocus={autoFocus} className="w-full bg-transparent outline-none" placeholder="Plumber, therapist, gemach…" aria-label="What are you looking for?" />
    </label>
    <label className="flex flex-1 items-center gap-3 px-3 py-3">
      <MapPin className="text-brand-teal" />
      <SuggestInput wrapperClassName="w-full" value={location} onChange={(v) => { typed.current = true; setLocation(v); }}
        onPick={(item) => { typed.current = true; setLocation(item.value); }}
        suggest={(text) => placeSuggestions(text, providers)} suggestMore={lookupPlaces} minLength={2}
        className="w-full bg-transparent outline-none" placeholder="City, neighborhood, or ZIP" aria-label="Where" />
    </label>
    {/* Navy and white, the site's own primary button, instead of the gold
        block: it reads cleaner in both themes and matches every other main
        action. Near Me is its quiet outlined partner at the same height. */}
    <button type="submit" className="primary w-full px-6 py-3 text-base md:w-auto"><Search size={18} />Search</button>
    <button type="button" onClick={nearMe} className="secondary mt-2 w-full px-5 py-3 text-base md:mt-0 md:w-auto"><LocateFixed size={18} className="text-brand-teal" />{locating ? 'Locating…' : 'Near Me'}</button>
  </form>;
}
