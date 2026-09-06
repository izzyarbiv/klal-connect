// The kinds of thing a member can post. `question` is the stored value for an
// ask (it predates the name), so it stays; everything user-facing says "Ask".
export const POST_TYPES = [
  { id: 'post',      label: 'Update',            badge: null,        placeholder: 'Share a business update, a job, or something the klal should know…' },
  { id: 'question',  label: 'Ask the community', badge: 'Ask',       placeholder: 'What do you want to ask the klal? A good mohel in Lakewood, a reliable electrician, a tutor for…' },
  { id: 'insight',   label: 'Tip or insight',    badge: 'Insight',   placeholder: 'A tip from your field — tax notes before Yom Tov, what to check before winter, how to choose a…' },
  { id: 'promotion', label: 'Promotion',         badge: 'Promotion', placeholder: 'A special, an opening, availability — put your business in front of the community.' },
];
export const POST_TYPE_BY_ID = Object.fromEntries(POST_TYPES.map((t) => [t.id, t]));
export const FEED_FILTERS = [
  { id: 'all', label: 'Everything' },
  { id: 'question', label: 'Asks' },
  { id: 'post', label: 'Updates' },
  { id: 'insight', label: 'Insights' },
  { id: 'promotion', label: 'Promotions' },
];
