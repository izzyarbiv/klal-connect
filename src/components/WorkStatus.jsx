import React from 'react';
import { workStatusOf } from '@/lib/workStatus';

// A colored frame around an avatar, LinkedIn-style. Renders its children
// untouched when the user has no status set, so callers can wrap an avatar
// unconditionally.
// Thicker than it looks like it should need to be: avatars already carry a
// ring-4 (4px) white box-shadow to separate them from whatever they sit on,
// and a box-shadow paints outside the element regardless of a wrapper's
// padding — so anything thinner than that is fully hidden behind it.
export function WorkStatusRing({ user, thickness = 6, className = '', children }) {
  const status = workStatusOf(user);
  if (!status) return children;
  // inline-block, not the div default: a block box stretches to fill
  // whatever non-flex parent it lands in (a card, a link), turning a ring
  // into a full-width pill the moment rounded-full meets a non-square box.
  return <div className={`inline-block rounded-full ${status.ring} ${className}`} style={{ padding: thickness }}>{children}</div>;
}

// The small text pill that goes next to a name.
export function WorkStatusBadge({ user, className = '' }) {
  const status = workStatusOf(user);
  if (!status) return null;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${status.badge} ${className}`}>{status.label}</span>;
}

// The edit control: a member sets their own status, or clears it. One at a
// time by design — LinkedIn allows only one frame on a photo at once too.
export function WorkStatusSelect({ value, onChange, className = 'field' }) {
  return (
    <select className={className} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Not set</option>
      <option value="open_to_work">Open to work</option>
      <option value="hiring">Hiring</option>
    </select>
  );
}
