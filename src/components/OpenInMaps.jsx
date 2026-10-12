import React, { useEffect, useRef, useState } from 'react';
import { MapPin, ChevronDown, Copy, Check } from 'lucide-react';

// A listing's address, tappable, opening in whichever maps app the visitor
// uses. The one they picked last time is listed first, so a Waze person is
// not asked to scroll past Google every time.
//
// Only offered where there is somewhere to go: a street address or a pin the
// owner placed. "Boca Raton, FL" alone would just drop them in the middle of
// town.
const PREF_KEY = 'kc-maps-app';

const readPref = () => { try { return localStorage.getItem(PREF_KEY); } catch { return null; } };
const writePref = (id) => { try { localStorage.setItem(PREF_KEY, id); } catch { /* private mode; fine */ } };

export function addressLine(p) {
  const cityState = [p.city, [p.state, p.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [p.address, cityState].filter(Boolean).join(', ');
}

export function hasDirections(p) {
  return !!(p && (String(p.address || '').trim() || (p.latitude != null && p.longitude != null)));
}

// The street address is what people recognize and what the apps match to a
// business; the pin is the fallback when there is no street address.
export function mapsLinks(p) {
  const pinned = p.latitude != null && p.longitude != null;
  const ll = pinned ? `${p.latitude},${p.longitude}` : '';
  const where = p.address ? addressLine(p) : '';
  const q = encodeURIComponent(where || ll);
  return [
    { id: 'google', label: 'Google Maps', href: `https://www.google.com/maps/search/?api=1&query=${q}` },
    { id: 'apple', label: 'Apple Maps', href: where ? `https://maps.apple.com/?address=${q}` : `https://maps.apple.com/?ll=${ll}&q=${encodeURIComponent(p.name || 'Location')}` },
    { id: 'waze', label: 'Waze', href: where ? `https://waze.com/ul?q=${q}&navigate=yes` : `https://waze.com/ul?ll=${ll}&navigate=yes` },
  ];
}

function ordered(links) {
  const pref = readPref();
  return pref ? [...links].sort((a, b) => (b.id === pref) - (a.id === pref)) : links;
}

// variant="menu": the address as a button that opens a small menu (listing page).
// variant="inline": a row of plain links, for map popups where a menu would be
// clipped by the popup's own box.
export default function OpenInMaps({ provider, variant = 'menu', className = '' }) {
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

  if (!hasDirections(provider)) return null;
  const links = ordered(mapsLinks(provider));
  const text = addressLine(provider) || 'Open the pin in maps';

  if (variant === 'inline') {
    return <div className={className}>
      {provider.address && <div className="text-brand-body">{addressLine(provider)}</div>}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {links.map((l) => <a key={l.id} href={l.href} target="_blank" rel="noreferrer" onClick={() => writePref(l.id)} className="font-medium text-brand-teal underline">{l.label}</a>)}
      </div>
    </div>;
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(addressLine(provider)); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked; the address is on screen */ }
  };

  return <div ref={box} className={`relative ${className}`}>
    <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="info group text-left">
      <MapPin/>
      <span className="underline decoration-brand-line underline-offset-4 group-hover:decoration-brand-teal">{text}</span>
      <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`}/>
    </button>
    {open && <div role="menu" className="absolute left-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-xl bg-brand-surface py-1 text-sm shadow-lg ring-1 ring-brand-line">
      <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">Open in</p>
      {links.map((l, i) => <a key={l.id} role="menuitem" href={l.href} target="_blank" rel="noreferrer" onClick={() => { writePref(l.id); setOpen(false); }} className="flex items-center justify-between px-4 py-2.5 font-semibold text-brand-ink hover:bg-brand-tint">
        {l.label}{i === 0 && readPref() === l.id && <span className="text-xs font-medium text-brand-muted">Last used</span>}
      </a>)}
      {provider.address && <button type="button" role="menuitem" onClick={copy} className="flex w-full items-center gap-2 border-t border-brand-line px-4 py-2.5 text-left font-semibold text-brand-body hover:bg-brand-tint">
        {copied ? <Check size={15} className="text-brand-success"/> : <Copy size={15}/>}{copied ? 'Copied' : 'Copy address'}
      </button>}
    </div>}
  </div>;
}
