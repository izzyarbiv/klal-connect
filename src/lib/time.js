// Relative timestamps the way a feed shows them: "Just now", "12m", "3h",
// "Yesterday", "5d", then a short date once it is older than a week. The
// full date and time is in the title attribute wherever this is rendered.
export function timeAgo(value, now = Date.now()) {
  const t = new Date(value).getTime();
  if (!value || Number.isNaN(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'Just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d`;
  const date = new Date(t);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString('en-US', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

export const fullDate = (value) => {
  const t = new Date(value);
  return Number.isNaN(t.getTime()) ? '' : t.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};
