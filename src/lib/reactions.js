// The ways a member can react to a post or a message. Shared with the server
// (functions.js) so an unknown reaction id is refused rather than stored.
//
// `like` is the default and what a plain tap gives; the rest are what this
// community actually says to each other. Kept to five so the picker fits on a
// phone in one row.
export const REACTIONS = [
  { id: 'like',      emoji: '👍', label: 'Like' },
  { id: 'mazel_tov', emoji: '🎉', label: 'Mazel tov' },
  { id: 'helpful',   emoji: '💡', label: 'Helpful' },
  { id: 'thanks',    emoji: '🙏', label: 'Thank you' },
  { id: 'love',      emoji: '❤️', label: 'Love' },
];
export const REACTION_BY_ID = Object.fromEntries(REACTIONS.map((r) => [r.id, r]));
export const DEFAULT_REACTION = 'like';

// Likes recorded before reactions existed have no `reaction` field; they are
// plain likes.
export const reactionOf = (row) => (typeof row?.reaction === 'string' && Object.hasOwn(REACTION_BY_ID, row.reaction) ? row.reaction : DEFAULT_REACTION);

// { like: 3, mazel_tov: 1 } → the emojis to stack on the card, most used first.
export function topReactions(counts = {}, max = 3) {
  return Object.entries(counts)
    .filter(([id, n]) => Object.hasOwn(REACTION_BY_ID, id) && n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([id]) => REACTION_BY_ID[id]);
}
