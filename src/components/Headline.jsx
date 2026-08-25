import React from 'react';

// Renders a LinkedIn-style headline/tagline beneath a name.
// Returns null when empty so there is no gap, placeholder, or layout shift.
// variant="inline" → 1 line, ellipsis (feeds, cards, lists)
// variant="header" → up to 2 lines (page headers)
export default function Headline({ text, variant='inline', className='' }){
  if(!text || !String(text).trim()) return null;
  const base = variant === 'header'
    ? 'block text-sm text-brand-muted line-clamp-2'
    : 'block truncate text-xs text-brand-muted';
  return <span className={`${base} ${className}`}>{text}</span>;
}