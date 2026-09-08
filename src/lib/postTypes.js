// The kinds of thing a member can post. `question` is the stored value for an
// ask (it predates the name), so it stays; everything user-facing says "Ask".
// Every post carries its kind on the card, so a reader can tell an ask from
// a promotion before reading it — the same label the composer and the feed
// filters use.
export const POST_TYPES = [
  { id: 'post',      label: 'Update',            badge: 'Update',    tone: 'neutral', placeholder: 'Share a business update, a job, or something the klal should know…' },
  { id: 'question',  label: 'Ask the community', badge: 'Ask',       tone: 'navy',    placeholder: 'What do you want to ask the klal? A good mohel in Lakewood, a reliable electrician, a tutor for…' },
  { id: 'insight',   label: 'Tip or insight',    badge: 'Insight',   tone: 'gold',    placeholder: 'A tip from your field — tax notes before Yom Tov, what to check before winter, how to choose a…' },
  { id: 'promotion', label: 'Promotion',         badge: 'Promotion', tone: 'gold',    placeholder: 'A special, an opening, availability — put your business in front of the community.' },
];
export const POST_TYPE_BY_ID = Object.fromEntries(POST_TYPES.map((t) => [t.id, t]));

// Older rows (and the demo seed) stored `update` for what is now `post`.
export const normalizePostType = (value) => (value === 'update' || !POST_TYPE_BY_ID[value] ? 'post' : value);

export const BADGE_TONES = {
  neutral: 'bg-brand-tint text-brand-body',
  navy: 'bg-brand-navy text-white',
  gold: 'bg-brand-gold-bg text-brand-gold-ink',
};

export const FEED_FILTERS = [
  { id: 'all', label: 'Everything' },
  { id: 'question', label: 'Asks' },
  { id: 'unanswered', label: 'Unanswered asks' },
  { id: 'post', label: 'Updates' },
  { id: 'insight', label: 'Insights' },
  { id: 'promotion', label: 'Promotions' },
];

// Which posts a feed filter keeps.
export function matchesFilter(post, filter) {
  const type = normalizePostType(post.post_type);
  if (filter === 'all') return true;
  if (filter === 'unanswered') return type === 'question' && !post.helpful_comment_id;
  return type === filter;
}
