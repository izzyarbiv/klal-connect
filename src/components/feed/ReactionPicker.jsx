import React, { useEffect, useRef, useState } from 'react';
import { REACTIONS } from '@/lib/reactions';

// The row of reactions that appears above a Like button (or beside a message).
// Desktop: it opens on hover and stays while the pointer is over it. Touch:
// a long press opens it, a tap outside closes it. A plain tap on the button
// itself still does the default reaction, so nobody has to find the picker.
//
// `hoverProps` go on the element that CONTAINS both the button and the picker
// — the picker is a descendant, so moving the pointer from the button up into
// it never counts as leaving. On the button alone, that move closed the
// picker before anything could be chosen. `pressProps` go on the button.
//
// `current` is the reaction the member already gave (null for none) — that one
// is ringed so tapping it again reads as "take it back".
export function useReactionPicker() {
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef(null), pressTimer = useRef(null), pressed = useRef(false), touching = useRef(null);
  const clear = () => { clearTimeout(hoverTimer.current); clearTimeout(pressTimer.current); };
  const close = () => { clear(); setOpen(false); };
  useEffect(() => () => clear(), []);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const timer = setTimeout(() => { window.addEventListener('pointerdown', close, { once: true }); }, 0);
    return () => { clearTimeout(timer); window.removeEventListener('pointerdown', close); };
  }, [open]);
  // A tap on a touch screen is followed by synthetic mouse events; those must
  // not read as a hover, or a plain tap would pop the picker open afterwards.
  const afterTouch = () => touching.current != null;
  const hoverProps = {
    onMouseEnter: () => { if (afterTouch()) return; clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setOpen(true), 350); },
    onMouseLeave: () => { if (afterTouch()) return; clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setOpen(false), 250); },
  };
  // Mobile browsers fire no click after a long press, so the "consumed" flag
  // is cleared shortly after the finger lifts — a click, when there is one,
  // arrives well inside that window.
  const endTouch = () => { clearTimeout(pressTimer.current); clearTimeout(touching.current); touching.current = setTimeout(() => { touching.current = null; }, 800); if (pressed.current) setTimeout(() => { pressed.current = false; }, 300); };
  const pressProps = {
    onTouchStart: () => { pressed.current = false; clearTimeout(touching.current); touching.current = setTimeout(() => { touching.current = null; }, 5000); clearTimeout(pressTimer.current); pressTimer.current = setTimeout(() => { pressed.current = true; setOpen(true); }, 400); },
    onTouchEnd: endTouch,
    onTouchCancel: endTouch,
    onTouchMove: () => clearTimeout(pressTimer.current),
    onContextMenu: (e) => { if (pressed.current) e.preventDefault(); },
  };
  // A tap that ended a long press must not also fire the default reaction.
  const consumedByPress = () => { const was = pressed.current; pressed.current = false; return was; };
  return { open, setOpen, close, hoverProps, pressProps, consumedByPress };
}

// `inline` renders it in the normal flow (for a scrolling list, where an
// absolutely positioned row would be clipped at the top or bottom edge).
export default function ReactionPicker({ open, current, onPick, className = '', inline = false }) {
  if (!open) return null;
  return <div role="menu" aria-label="React" className={`${inline ? 'inline-flex' : 'absolute z-20 flex'} gap-1 rounded-full bg-brand-surface p-1.5 shadow-lg ring-1 ring-brand-line ${className}`} onPointerDown={(e) => e.stopPropagation()}>
    {REACTIONS.map((r) => <button key={r.id} type="button" role="menuitem" title={r.label} aria-label={r.label} aria-pressed={current === r.id}
      onClick={(e) => { e.stopPropagation(); onPick(r.id); }}
      className={`grid h-9 w-9 place-items-center rounded-full text-xl transition hover:scale-125 hover:bg-brand-tint ${current === r.id ? 'bg-brand-tint ring-2 ring-brand-teal' : ''}`}>{r.emoji}</button>)}
  </div>;
}
