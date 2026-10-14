import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, LocateFixed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

  const submit = (e) => {
    e.preventDefault();
    navigate(`/browse?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`);
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
      <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus={autoFocus} className="w-full bg-transparent outline-none" placeholder="Plumber, therapist, gemach…" aria-label="What are you looking for?" />
    </label>
    <label className="flex flex-1 items-center gap-3 px-3 py-3">
      <MapPin className="text-brand-teal" />
      <input value={location} onChange={(e) => { typed.current = true; setLocation(e.target.value); }} className="w-full bg-transparent outline-none" placeholder="City, neighborhood, or ZIP" aria-label="Where" />
    </label>
    {/* Navy and white, the site's own primary button, instead of the gold
        block: it reads cleaner in both themes and matches every other main
        action. Near Me is its quiet outlined partner at the same height. */}
    <button type="submit" className="primary w-full px-6 py-3 text-base md:w-auto"><Search size={18} />Search</button>
    <button type="button" onClick={nearMe} className="secondary mt-2 w-full px-5 py-3 text-base md:mt-0 md:w-auto"><LocateFixed size={18} className="text-brand-teal" />{locating ? 'Locating…' : 'Near Me'}</button>
  </form>;
}
