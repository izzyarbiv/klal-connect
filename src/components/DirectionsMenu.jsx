import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, ChevronDown, Copy, Check } from 'lucide-react';
import { directionsLinks, addressLine, preferredFirst, mapsPreference, rememberMapsApp } from '@/lib/maps';

// Directions to a listing in whichever maps app the person uses: Google Maps,
// Apple Maps or Waze, plus Copy address. The one picked last time is listed
// first.
//
// trigger="button": a "Get directions" button.
// trigger="address": the address itself, underlined, as the thing to tap.
// trigger="links": a plain row of the three app names, for map popups, where
// a menu would be clipped by the popup's own box.
//
// align="right" opens the menu leftward, for a trigger at the right edge.
//
// onOpen is told which app was chosen, for the directions activity event.
export default function DirectionsMenu({ place, trigger = 'button', align = 'left', onOpen, className = '' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const all = directionsLinks(place);
  if (!all.length) return null;
  const links = preferredFirst(all);
  const address = addressLine(place);
  const pick = (id) => { rememberMapsApp(id); onOpen?.(id); setOpen(false); };

  if (trigger === 'links') {
    return <div className={`flex flex-wrap gap-x-3 gap-y-1 ${className}`}>
      {links.map((l) => <a key={l.id} href={l.href} target="_blank" rel="noreferrer" onClick={() => pick(l.id)} className="font-medium text-brand-teal underline">{l.label}</a>)}
    </div>;
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked; the address is on screen */ }
  };

  const pref = mapsPreference();
  return <div ref={box} className={`relative ${className}`}>
    {trigger === 'address'
      ? <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="info group text-left">
          <MapPin/>
          <span className="underline decoration-brand-line underline-offset-4 group-hover:decoration-brand-teal">{address || 'Get directions'}</span>
          <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`}/>
        </button>
      : <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-hover">
          <Navigation size={16}/>Get directions<ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`}/>
        </button>}
    {open && <div role="menu" className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-20 mt-2 w-60 overflow-hidden rounded-xl bg-brand-surface py-1 text-sm shadow-lg ring-1 ring-brand-line`}>
      <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">Directions in</p>
      {links.map((l, i) => <a key={l.id} role="menuitem" href={l.href} target="_blank" rel="noreferrer" onClick={() => pick(l.id)} className="flex items-center justify-between px-4 py-2.5 font-semibold text-brand-ink hover:bg-brand-tint">
        {l.label}{i === 0 && pref === l.id && <span className="text-xs font-medium text-brand-muted">Last used</span>}
      </a>)}
      {address && <button type="button" role="menuitem" onClick={copy} className="flex w-full items-center gap-2 border-t border-brand-line px-4 py-2.5 text-left font-semibold text-brand-body hover:bg-brand-tint">
        {copied ? <Check size={15} className="text-brand-success"/> : <Copy size={15}/>}{copied ? 'Copied' : 'Copy address'}
      </button>}
    </div>}
  </div>;
}
