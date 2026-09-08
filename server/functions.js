// Server-side business logic, reached from the app via api.functions.invoke().
//
// These are functions rather than plain entity writes because each enforces
// something the client must not be trusted with: moderation status, ownership,
// counter integrity, or the Shabbos write-gate.
import { store, users, GUEST_EMAIL } from './db.js';
import { computeShabbosStatus, assertWritable } from './shabbos.js';
import { BADGES } from '../src/lib/badges.js';
import { REACTION_BY_ID, DEFAULT_REACTION, reactionOf } from '../src/lib/reactions.js';
import { POST_REPORT_REASON_BY_ID, postExcerpt } from '../src/lib/postTypes.js';

const BADGE_IDS = new Set(BADGES.map((b) => b.id));

// The composer's ids (src/lib/postTypes.js). `update` was an older spelling of
// `post` and still exists on seeded rows, so it is folded in rather than
// rejected — otherwise the "Updates" filter never matched those posts.
const POST_TYPES = new Set(['post', 'question', 'insight', 'promotion']);
const postType = (value) => (value === 'update' ? 'post' : POST_TYPES.has(value) ? value : 'post');

// Own keys only: a plain object also answers to 'constructor' and friends.
const validReaction = (value) => (value === undefined || value === null || value === '' ? DEFAULT_REACTION : (typeof value === 'string' && Object.hasOwn(REACTION_BY_ID, value) ? value : null));
// What a member may say about their own listing. Verification, status and
// the counters are the server's and an admin's to set.
function listingInput(payload) {
  const { verified, verified_at, verified_by, verified_badges, status, claimed, demo, save_count, usage_count, vouch_count, owner_id, ...rest } = payload || {};
  const badges = Array.isArray(rest.badges) ? [...new Set(rest.badges.filter((b) => BADGE_IDS.has(b)))] : [];
  // WhatsApp wants the number as digits with the country code, no plus.
  const whatsapp = rest.whatsapp ? String(rest.whatsapp).replace(/\D/g, '').replace(/^1?(\d{10})$/, '1$1') : '';
  return { ...rest, badges, whatsapp };
}

const need = (value, message) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    const err = new Error(message);
    err.statusCode = 400;
    throw err;
  }
  return value;
};

const fail = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
};

// Author fields are denormalized onto posts/comments because the feed renders
// them without a second lookup.
async function canMessage(senderId, recipientId) {
  const [outbound, inbound] = await Promise.all([
    store.filter('Connection', { requester_id: senderId, recipient_id: recipientId, status: 'accepted' }),
    store.filter('Connection', { requester_id: recipientId, recipient_id: senderId, status: 'accepted' }),
  ]);
  if (outbound.length || inbound.length) return true;
  const existing = await store.filter('Message', { sender_id: recipientId, recipient_id: senderId });
  return existing.length > 0;
}

const authorFields = (user) => ({
  author_name: user.full_name || user.email,
  author_headline: user.headline || '',
  author_avatar_url: user.avatar_url || '',
});

// e.g. "miriam-4k7x": a first name people recognise plus four characters
// that make it unique. Lower-case, URL-safe.
function inviteCode(user) {
  const first = String(user.full_name || 'klal').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '').slice(0, 12) || 'klal';
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let tail = '';
  for (let i = 0; i < 4; i++) tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${first}-${tail}`;
}

const ACTIVITIES = {
  save: { entity: 'SavedProvider', field: 'save_count' },
  use: { entity: 'ProviderUsage', field: 'usage_count' },
  vouch: { entity: 'Vouch', field: 'vouch_count' },
};

async function notify(recipientId, payload) {
  if (!recipientId) return;
  await store.create('Notification', { recipient_id: recipientId, read: false, ...payload });
}

// Whether this actor has already told this recipient about this thing —
// a like taken back and given again is not news twice.
async function alreadyNotified(recipientId, type, targetId, actorId) {
  const rows = await store.filter('Notification', { recipient_id: recipientId, type, target_id: targetId, actor_id: actorId });
  return rows.length > 0;
}

export const functions = {
  // ---- listings -------------------------------------------------------------

  async createListing(payload, user) {
    await assertWritable(user);
    need(payload.name, 'A listing name is required.');
    need(payload.category, 'Please choose a category.');
    // New listings are never published directly — they go to the review queue.
    const provider = await store.create(
      'Provider',
      { ...listingInput(payload), status: 'pending', claimed: false, save_count: 0, usage_count: 0, vouch_count: 0 },
      user
    );
    return { provider };
  },

  async updateListingTagline({ provider_id, tagline }, user) {
    await assertWritable(user);
    const provider = await store.get('Provider', need(provider_id, 'Missing listing.'));
    if (!provider) fail('Listing not found.', 404);
    if (provider.created_by_id !== user.id && user.role !== 'admin') {
      fail('You can only edit listings you manage.', 403);
    }
    if (String(tagline || '').length > 120) fail('Taglines must be 120 characters or fewer.');
    return { provider: await store.update('Provider', provider_id, { tagline: String(tagline || '') }) };
  },

  async createClaim(payload, user) {
    await assertWritable(user);
    need(payload.provider_name, 'Tell us which listing you are claiming.');
    need(payload.relationship, 'Describe your relationship to the listing.');
    need(payload.verification_details, 'Verification details are required.');
    const claim = await store.create('ClaimRequest', { ...payload, status: 'pending' }, user);
    return { claim };
  },

  // ---- community feedback ---------------------------------------------------

  async createReview({ provider_id, provider_name, body }, user) {
    await assertWritable(user);
    need(provider_id, 'Missing listing.');
    if (String(body || '').trim().length < 10) fail('Please share a little more detail.');
    const note = await store.create(
      'CommunityNote',
      { provider_id, provider_name, body: String(body).trim(), status: 'pending', ...authorFields(user) },
      user
    );
    return { note };
  },

  async createReport({ resource_id, reason_category, explanation, contact_ok }, user) {
    await assertWritable(user);
    need(resource_id, 'Missing listing.');
    need(reason_category, 'Please choose a reason.');
    const text = String(explanation || '').trim();
    if (text.length < 30) fail('Please add at least 30 characters of explanation.');
    if (text.length > 1000) fail('Explanation must be 1000 characters or fewer.');

    const provider = await store.get('Provider', resource_id);
    const report = await store.create(
      'ListingReport',
      {
        resource_id,
        provider_name: provider?.name || '',
        reason_category,
        explanation: text,
        contact_ok: !!contact_ok,
        status: 'open',
        reporter_email: contact_ok ? user.email : '',
      },
      user
    );
    return { report };
  },

  // ---- feed -----------------------------------------------------------------

  async createPost({ body, post_type, image_urls }, user) {
    await assertWritable(user);
    const text = String(body || '').trim();
    if (!text && !(image_urls || []).length) fail('Write something to post.');
    if (text.length > 5000) fail('Posts must be 5000 characters or fewer.');
    const post = await store.create(
      'FeedPost',
      {
        body: text,
        post_type: postType(post_type),
        image_urls: image_urls || [],
        like_count: 0,
        comment_count: 0,
        view_count: 0,
        ...authorFields(user),
      },
      user
    );
    return { post };
  },

  async createComment({ post_id, body }, user) {
    await assertWritable(user);
    need(post_id, 'Missing post.');
    const text = String(body || '').trim();
    if (!text) fail('Write a comment first.');
    const post = await store.get('FeedPost', post_id);
    if (!post) fail('Post not found.', 404);

    const comment = await store.create('Comment', { post_id, body: text, ...authorFields(user) }, user);
    // Recount rather than increment so the badge can't drift from reality.
    const comment_count = await store.count('Comment', { post_id });
    await store.update('FeedPost', post_id, { comment_count });

    if (post.created_by_id !== user.id) {
      await notify(post.created_by_id, {
        type: 'comment',
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        target_type: 'post',
        target_id: post_id,
        message: `${user.full_name || 'Someone'} commented on your post`,
      });
    }
    return { comment, comment_count };
  },

  // ---- invites -------------------------------------------------------------

  // Every member has one personal invite link; asking again returns it. The
  // code is short and memorable enough to read out loud.
  async myInvite(_payload, user) {
    if (user.email === GUEST_EMAIL) fail('Create an account to invite people.', 403);
    const [existing] = await store.filter('Invite', { created_by_id: user.id, provider_id: null });
    if (existing) return { invite: existing };
    let code;
    for (let i = 0; i < 5; i++) {
      code = inviteCode(user);
      if (!(await store.filter('Invite', { code })).length) break;
    }
    const invite = await store.create('Invite', { code, inviter_name: user.full_name || '', provider_id: null, provider_name: null, joined_user_ids: [], joined_count: 0 }, user);
    return { invite };
  },

  // ---- asks: answers with upvotes, and the asker's "this helped" ---------

  async toggleAnswerVote({ comment_id }, user) {
    await assertWritable(user);
    need(comment_id, 'Missing answer.');
    const comment = await store.get('Comment', comment_id);
    if (!comment) fail('Answer not found.', 404);
    if (comment.created_by_id === user.id) fail('You cannot upvote your own answer.');
    const existing = await store.filter('CommentVote', { comment_id, created_by_id: user.id });
    let voted;
    if (existing.length) {
      for (const v of existing) await store.delete('CommentVote', v.id);
      voted = false;
    } else {
      await store.create('CommentVote', { comment_id, post_id: comment.post_id }, user);
      voted = true;
    }
    const vote_count = await store.count('CommentVote', { comment_id });
    await store.update('Comment', comment_id, { vote_count });
    return { voted, vote_count };
  },

  // Only the person who asked can say what helped. One answer at a time;
  // choosing another moves the mark, choosing the same one again clears it.
  async markHelpful({ post_id, comment_id }, user) {
    await assertWritable(user);
    need(post_id, 'Missing post.');
    const post = await store.get('FeedPost', post_id);
    if (!post) fail('Post not found.', 404);
    if (post.created_by_id !== user.id) fail('Only the person who asked can mark an answer as helpful.', 403);
    const previous = post.helpful_comment_id || null;
    const next = previous === comment_id ? null : comment_id;
    if (next) {
      const comment = await store.get('Comment', next);
      if (!comment || comment.post_id !== post_id) fail('Answer not found.', 404);
    }
    if (previous) await store.update('Comment', previous, { helpful: false });
    if (next) await store.update('Comment', next, { helpful: true });
    await store.update('FeedPost', post_id, { helpful_comment_id: next });
    if (next) {
      const comment = await store.get('Comment', next);
      if (comment.created_by_id !== user.id) {
        await notify(comment.created_by_id, {
          type: 'helpful',
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          target_type: 'post',
          target_id: post_id,
          message: `${user.full_name || 'Someone'} marked your answer as helpful`,
        });
      }
    }
    return { helpful_comment_id: next };
  },

  // One reaction per member per post. Reacting again with the same one takes
  // it back; with a different one, it changes. `like_count` stays the total
  // of every kind, so nothing that reads it needed to change; the breakdown is
  // in `reaction_counts`.
  async toggleLike({ post_id, reaction }, user) {
    await assertWritable(user);
    need(post_id, 'Missing post.');
    const post = await store.get('FeedPost', post_id);
    if (!post) fail('Post not found.', 404);
    const wanted = validReaction(reaction);
    if (!wanted) fail('Unknown reaction.');

    const existing = await store.filter('FeedLike', { post_id, created_by_id: user.id });
    let liked;
    if (existing.length && reactionOf(existing[0]) === wanted) {
      for (const like of existing) await store.delete('FeedLike', like.id);
      liked = false;
    } else if (existing.length) {
      await store.update('FeedLike', existing[0].id, { reaction: wanted });
      for (const extra of existing.slice(1)) await store.delete('FeedLike', extra.id);
      liked = true;
    } else {
      await store.create('FeedLike', { post_id, reaction: wanted }, user);
      liked = true;
    }
    const all = await store.filter('FeedLike', { post_id });
    const reaction_counts = {};
    for (const row of all) { const id = reactionOf(row); reaction_counts[id] = (reaction_counts[id] || 0) + 1; }
    const like_count = all.length;
    await store.update('FeedPost', post_id, { like_count, reaction_counts });

    // Told once per member per post: changing a reaction, or taking one back
    // and giving it again, is not a new event.
    if (liked && !existing.length && post.created_by_id !== user.id && !(await alreadyNotified(post.created_by_id, 'like', post_id, user.id))) {
      const what = REACTION_BY_ID[wanted];
      await notify(post.created_by_id, {
        type: 'like',
        actor_id: user.id,
        actor_name: user.full_name || user.email,
        target_type: 'post',
        target_id: post_id,
        message: wanted === DEFAULT_REACTION
          ? `${user.full_name || 'Someone'} liked your post`
          : `${user.full_name || 'Someone'} reacted ${what.emoji} ${what.label} to your post`,
      });
    }
    return { liked, reaction: liked ? wanted : null, like_count, reaction_counts };
  },

  // Views are counted once per viewer, so a refresh loop can't inflate them.
  async recordPostView({ postId }, user) {
    need(postId, 'Missing post.');
    const post = await store.get('FeedPost', postId);
    if (!post) fail('Post not found.', 404);

    // The count is the author's alone (see present() in app.js), and the
    // author never records a view of their own post — so nothing comes back.
    const seen = await store.filter('ActivityEvent', { type: 'post_view', target_id: postId, created_by_id: user.id });
    if (!seen.length) {
      await store.create('ActivityEvent', { type: 'post_view', target_id: postId }, user);
      const count = await store.count('ActivityEvent', { type: 'post_view', target_id: postId });
      await store.update('FeedPost', postId, { view_count: count });
    }
    return { recorded: true };
  },

  // ---- the post menu: save, report, delete ---------------------------------

  // A private bookmark. The row is the member's own (OWNER_SCOPED in app.js):
  // nobody, the author included, sees who saved what.
  async toggleSavePost({ post_id }, user) {
    await assertWritable(user);
    need(post_id, 'Missing post.');
    const post = await store.get('FeedPost', post_id);
    if (!post) fail('Post not found.', 404);
    const existing = await store.filter('SavedPost', { post_id, created_by_id: user.id });
    if (existing.length) {
      for (const row of existing) await store.delete('SavedPost', row.id);
      return { saved: false };
    }
    await store.create('SavedPost', { post_id }, user);
    return { saved: true };
  },

  // Goes to the private-reports queue the admin already works. `name` and
  // `body` are what that queue renders, so both are written to read on their
  // own: who wrote the post, why it was reported, what the reporter said,
  // and a line of the post itself in case it is edited or gone by then.
  async reportPost({ post_id, reason_category, explanation }, user) {
    await assertWritable(user);
    need(post_id, 'Missing post.');
    const post = await store.get('FeedPost', post_id);
    if (!post) fail('Post not found.', 404);
    if (post.created_by_id === user.id) fail('You cannot report your own post.');
    const reason = typeof reason_category === 'string' && Object.hasOwn(POST_REPORT_REASON_BY_ID, reason_category) ? POST_REPORT_REASON_BY_ID[reason_category] : null;
    if (!reason) fail('Please choose a reason.');
    const text = String(explanation || '').trim();
    if (text.length < 20) fail('Please add at least 20 characters of explanation.');
    if (text.length > 1000) fail('Explanation must be 1000 characters or fewer.');
    const open = await store.filter('PrivateReport', { target_type: 'post', target_id: post_id, created_by_id: user.id, status: 'open' });
    if (open.length) fail('You have already reported this post. Our team will look at it.');

    const author = post.author_name || 'a community member';
    const report = await store.create(
      'PrivateReport',
      {
        name: `Reported post by ${author}`,
        body: `${reason.label}: ${text} — the post reads “${postExcerpt(post.body, 140) || '(no text)'}”`,
        target_type: 'post',
        target_id: post_id,
        post_author_id: post.created_by_id,
        post_author_name: post.author_name || '',
        reason_category,
        explanation: text,
        status: 'open',
      },
      user
    );
    return { report };
  },

  // The author takes back their own post; an admin or a moderator removes
  // anyone's. Everything hanging off it goes with it, so no comment, reaction,
  // vote or bookmark is left pointing at a post that is not there. A staff
  // removal is audited the way a status change is (app.js).
  async deletePost({ post_id }, user) {
    await assertWritable(user);
    need(post_id, 'Missing post.');
    const post = await store.get('FeedPost', post_id);
    if (!post) fail('Post not found.', 404);
    const own = post.created_by_id === user.id;
    const staff = user.role === 'admin' || user.role === 'moderator';
    if (!own && !staff) fail('You can only delete your own posts.', 403);

    for (const entity of ['Comment', 'FeedLike', 'CommentVote', 'SavedPost']) {
      for (const row of await store.filter(entity, { post_id })) await store.delete(entity, row.id);
    }
    await store.delete('FeedPost', post_id);
    if (!own) {
      await store.create('ActivityEvent', { type: 'moderation', entity: 'FeedPost', target_id: post_id, from: 'published', to: 'deleted', actor_role: user.role }, user);
    }
    return { ok: true };
  },

  // ---- provider activity ----------------------------------------------------

  // save   → SavedProvider  (private to the member: their own list)
  // use    → ProviderUsage   (private signal, public count)
  // vouch  → Vouch           (public, and carries the member's name: a vouch
  //                           is a statement, not a bookmark)
  async toggleCommunityActivity({ providerId, activity }, user) {
    await assertWritable(user);
    need(providerId, 'Missing listing.');
    const provider = await store.get('Provider', providerId);
    if (!provider) fail('Listing not found.', 404);

    const kind = ACTIVITIES[activity];
    if (!kind) fail('Unknown activity.');
    if (activity === 'vouch' && (provider.created_by_id === user.id || provider.owner_id === user.id)) {
      fail('You cannot vouch for your own listing.');
    }
    const existing = await store.filter(kind.entity, { provider_id: providerId, created_by_id: user.id });

    let active;
    if (existing.length) {
      for (const row of existing) await store.delete(kind.entity, row.id);
      active = false;
    } else {
      await store.create(
        kind.entity,
        {
          provider_id: providerId, provider_name: provider.name, category: provider.category,
          ...(activity === 'vouch' ? authorFields(user) : {}),
        },
        user
      );
      active = true;
    }

    const count = await store.count(kind.entity, { provider_id: providerId });
    await store.update('Provider', providerId, { [kind.field]: count });

    // The business hears who vouched — the strongest nudge there is to claim
    // and complete a listing.
    if (activity === 'vouch' && active) {
      const owner = provider.owner_id || provider.created_by_id;
      if (owner && owner !== user.id) {
        await notify(owner, {
          type: 'vouch',
          actor_id: user.id,
          actor_name: user.full_name || user.email,
          target_type: 'provider',
          target_id: providerId,
          message: `${user.full_name || 'A community member'} vouched for ${provider.name}`,
        });
      }
    }
    return { active, count };
  },

  // ---- messaging ------------------------------------------------------------

  async sendMessage({ recipient_id, body }, user) {
    await assertWritable(user);
    need(recipient_id, 'Missing recipient.');
    const text = String(body || '').trim();
    if (!text) fail('Write a message first.');
    if (recipient_id === user.id) fail('You cannot message yourself.');
    const recipient = await users.byId(recipient_id);
    if (!recipient) fail('That member could not be found.', 404);
    // Every visitor reads as the guest; a message to it would be public.
    if (recipient.email === GUEST_EMAIL) fail('That member cannot receive messages.');

    // Only people you are connected to. The UI already hides the message button
    // otherwise, but that is not enforcement — without this a direct POST could
    // reach anyone, which is how a community app turns into a cold-outreach
    // channel. An existing thread also qualifies, so a conversation started
    // before a connection lapsed can still be replied to.
    if (!(await canMessage(user.id, recipient_id))) {
      fail('You can only message people you are connected with.', 403);
    }

    const message = await store.create(
      'Message',
      {
        recipient_id,
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        body: text,
        read: false,
      },
      user
    );
    await notify(recipient_id, {
      type: 'message',
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      target_type: 'message',
      target_id: user.id,
      message: `${user.full_name || 'Someone'} sent you a message`,
    });
    return { message };
  },

  // A reaction on a message in a thread you are part of. One per person per
  // message, stored on the message keyed by member id; the same reaction again
  // removes it. Nobody is notified — it is a nod, not a message.
  async reactToMessage({ message_id, reaction }, user) {
    await assertWritable(user);
    need(message_id, 'Missing message.');
    const message = await store.get('Message', message_id);
    if (!message) fail('Message not found.', 404);
    if (message.sender_id !== user.id && message.recipient_id !== user.id) fail('Not your conversation.', 403);
    const wanted = validReaction(reaction);
    if (!wanted) fail('Unknown reaction.');
    const reactions = { ...(message.reactions || {}) };
    if (reactions[user.id] === wanted) delete reactions[user.id];
    else reactions[user.id] = wanted;
    return { message: await store.update('Message', message_id, { reactions }) };
  },

  // ---- zmanim ---------------------------------------------------------------

  // The simulator passes { debug: {...} } to preview another time or location; that
  // only ever overlays the caller's own profile, never another user's.
  async getShabbosStatus({ debug } = {}, user) {
    const profile = { ...(user || {}) };
    let now = Date.now();
    if (debug && typeof debug === 'object') {
      if (debug.now) now = new Date(debug.now).getTime() || now;
      for (const key of ['latitude', 'longitude', 'timezone', 'city', 'country_code']) {
        if (debug[key] !== undefined && debug[key] !== null && debug[key] !== '') profile[key] = debug[key];
      }
    }
    return await computeShabbosStatus(profile, now);
  },
};

export const publicFunctions = new Set(['getShabbosStatus']);
