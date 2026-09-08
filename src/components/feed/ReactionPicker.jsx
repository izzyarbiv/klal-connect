import React, { useEffect, useRef, useState } from 'react';
import { REACTIONS } from '@/lib/reactions';

// The row of reactions that appears above a Like button (or beside a message).
// Desktop: it opens on hover and stays while the pointer is over it. Touch:
// a long press opens it, a tap outside closes it. A plain tap on the button
// itself still does the default reaction, so nobody has to find the picker.
//
// `current` is the reaction the member already gave (null for none) — that one
// is ringed so tapping it again reads as "take it back".
export function useReactionPicker() {
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef(null), pressTimer = useRef(null), pressed = useRef(false);
  const clear = () => { clearTimeout(hoverTimer.current); clearTimeout(pressTimer.current); };
  useEffect(() => () => clear(), []);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const timer = setTimeout(() => { window.addEventListener('pointerdown', close, { once: true }); }, 0);
    return () => { clearTimeout(timer); window.removeEventListener('pointerdown', close); };
  }, [open]);
  const triggerProps = {
    onMouseEnter: () => { clear(); hoverTimer.current = setTimeout(() => setOpen(true), 350); },
    onMouseLeave: () => { clear(); hoverTimer.current = setTimeout(() => setOpen(false), 250); },
    onTouchStart: () => { pressed.current = false; clear(); pressTimer.current = setTimeout(() => { pressed.current = true; setOpen(true); }, 400); },
    onTouchEnd: () => clear(),
    onTouchMove: () => clear(),
    onContextMenu: (e) => { if (pressed.current) e.preventDefault(); },
  };
  // A tap that ended a long press must not also fire the default reaction.
  const consumedByPress = () => { const was = pressed.current; pressed.current = false; return was; };
  return { open, setOpen, triggerProps, consumedByPress };
}

export default function ReactionPicker({ open, current, onPick, className = '' }) {
  if (!open) return null;
  return <div role="menu" aria-label="React" className={`absolute z-20 flex gap-1 rounded-full bg-brand-surface p-1.5 shadow-lg ring-1 ring-brand-line ${className}`} onPointerDown={(e) => e.stopPropagation()}>
    {REACTIONS.map((r) => <button key={r.id} type="button" role="menuitem" title={r.label} aria-label={r.label} aria-pressed={current === r.id}
      onClick={(e) => { e.stopPropagation(); onPick(r.id); }}
      className={`grid h-9 w-9 place-items-center rounded-full text-xl transition hover:scale-125 hover:bg-brand-tint ${current === r.id ? 'bg-brand-tint ring-2 ring-brand-teal' : ''}`}>{r.emoji}</button>)}
  </div>;
}
