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

// A time of day in a named zone — candle lighting, Havdalah, a zman.
//
// The weekday appears whenever the moment is not today, in the location's own
// zone. Without it a Yom Tov running into Shabbos ends the following night and
// a bare "Havdalah · 7:38 PM" read as "this evening" when it was a day away.
export function timeInZone(ms, tzid, now = Date.now()) {
  if (!ms) return '—';
  try {
    const day = (t) => new Intl.DateTimeFormat('en-CA', { timeZone: tzid, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
    const sameDay = day(ms) === day(now);
    return new Intl.DateTimeFormat('en-US', { timeZone: tzid, ...(sameDay ? {} : { weekday: 'short' }), hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleTimeString();
  }
}

export const fullDate = (value) => {
  const t = new Date(value);
  return Number.isNaN(t.getTime()) ? '' : t.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};
