import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { api } from '@/api/client';

// A city field that suggests as you type, instead of hoping everyone spells
// "Kew Gardens Hills" the same way. Suggestions come from /api/geo/search,
// which answers from the curated community list — so "rbs" finds Beit Shemesh
// and a full street address finds its city.
//
// Picking a suggestion hands the caller the whole place (coordinates, time
// zone, country) so a city can also set the Shabbos location; typing
// something not on the list is still allowed, because a directory should not
// refuse a town nobody thought of.
export default function CityInput({
  value,
  onChange,
  onPick,
  placeholder = 'Lakewood, Brooklyn, Jerusalem…',
  className = 'field',
  id,
  autoFocus,
  ...rest
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState([]);
  const [active, setActive] = useState(-1);
  const box = useRef(null);
  const latest = useRef(0);

  // Debounced so a fast typist does not fire a request per keystroke.
  useEffect(() => {
    const q = String(value || '').trim();
    if (!open || q.length < 2) { setOptions([]); return; }
    const mine = ++latest.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const rows = await api.geo.search(q, 6);
        if (latest.current === mine) setOptions(Array.isArray(rows) ? rows : []);
      } catch {
        if (latest.current === mine) setOptions([]);
      } finally {
        if (latest.current === mine) setBusy(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [value, open]);

  // Clicking anywhere else closes the list.
  useEffect(() => {
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const choose = (p) => {
    onChange(p.city || p.label || '');
    onPick?.(p);
    setOpen(false);
    setOptions([]);
    setActive(-1);
  };

  const onKeyDown = (e) => {
    if (!options.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % options.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i <= 0 ? options.length : i) - 1); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(options[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={box} className="relative">
      <input
        id={id}
        className={className}
        value={value || ''}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-autocomplete="list"
        {...rest}
      />
      {busy && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-brand-muted" />}
      {open && options.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-brand-line bg-brand-surface py-1 shadow-lg" role="listbox">
          {options.map((p, i) => (
            <li key={`${p.latitude},${p.longitude},${p.label}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(p)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${i === active ? 'bg-brand-tint text-brand-ink' : 'text-brand-body'}`}
              >
                <MapPin size={14} className="shrink-0 text-brand-teal" />
                <span className="min-w-0 flex-1 truncate">{p.label || p.city}</span>
                {p.timezone && <span className="shrink-0 text-xs text-brand-muted">{p.timezone.split('/').pop().replace(/_/g, ' ')}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// US states and the other places Klal has members, so a listing's region is
// picked rather than typed three different ways.
export const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
  ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
  ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
  ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
];

const ELSEWHERE = [
  ['IL-JM', 'Israel'], ['ON', 'Ontario'], ['QC', 'Quebec'], ['UK', 'United Kingdom'],
  ['VIC', 'Victoria (AU)'], ['NSW', 'New South Wales (AU)'], ['ZA', 'South Africa'], ['OTHER', 'Elsewhere'],
];

// A select rather than a free-text box: "NY", "N.Y.", "New York" and "new
// york" were four different states as far as any search was concerned.
export function StateSelect({ value, onChange, className = 'field', id, ...rest }) {
  return (
    <select id={id} className={className} value={value || ''} onChange={(e) => onChange(e.target.value)} {...rest}>
      <option value="">Choose…</option>
      <optgroup label="United States">
        {US_STATES.map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}
      </optgroup>
      <optgroup label="Outside the US">
        {ELSEWHERE.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </optgroup>
    </select>
  );
}
