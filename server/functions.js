// Server-side business logic, reached from the app via api.functions.invoke().
//
// These are functions rather than plain entity writes because each enforces
// something the client must not be trusted with: moderation status, ownership,
// counter integrity, or the Shabbos write-gate.
import { store, users, userToPublic } from './db.js';
import { computeShabbosStatus, assertWritable } from './shabbos.js';

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
const authorFields = (user) => ({
  author_name: user.full_name || user.email,
  author_headline: user.headline || '',
  author_avatar_url: user.avatar_url || '',
});

function notify(recipientId, payload) {
  if (!recipientId) return;
  store.create('Notification', { recipient_id: recipientId, read: false, ...payload });
}

export const functions = {
  // ---- listings -------------------------------------------------------------

  createListing(payload, user) {
    assertWritable(user);
    need(payload.name, 'A listing name is required.');
    need(payload.category, 'Please choose a category.');
    // New listings are never published directly — they go to the review queue.
    const provider = store.create(
      'Provider',
      { ...payload, status: 'pending', claimed: false, save_count: 0, use_count: 0 },
      user
    );
    return { provider };
  },

  updateListingTagline({ provider_id, tagline }, user) {
    assertWritable(user);
    const provider = store.get('Provider', need(provider_id, 'Missing listing.'));
    if (!provider) fail('Listing not found.', 404);
    if (provider.created_by_id !== user.id && user.role !== 'admin') {
      fail('You can only edit listings you manage.', 403);
    }
    if (String(tagline || '').length > 120) fail('Taglines must be 120 characters or fewer.');
    return { provider: store.update('Provider', provider_id, { tagline: String(tagline || '') }) };
  },

  createClaim(payload, user) {
    assertWritable(user);
    need(payload.provider_name, 'Tell us which listing you are claiming.');
    need(payload.relationship, 'Describe your relationship to the listing.');
    need(payload.verification_details, 'Verification details are required.');
    const claim = store.create('ClaimRequest', { ...payload, status: 'pending' }, user);
    return { claim };
  },

  // ---- community feedback ---------------------------------------------------

  createReview({ provider_id, provider_name, body }, user) {
    assertWritable(user);
    need(provider_id, 'Missing listing.');
    if (String(body || '').trim().length < 10) fail('Please share a little more detail.');
    const note = store.create(
      'CommunityNote',
      { provider_id, provider_name, body: String(body).trim(), status: 'pending', ...authorFields(user) },
      user
    );
    return { note };
  },

  createReport({ resource_id, reason_category, explanation, contact_ok }, user) {
    assertWritable(user);
    need(resource_id, 'Missing listing.');
    need(reason_category, 'Please choose a reason.');
    const text = String(explanation || '').trim();
    if (text.length < 30) fail('Please add at least 30 characters of explanation.');
    if (text.length > 1000) fail('Explanation must be 1000 characters or fewer.');

    const provider = store.get('Provider', resource_id);
    const report = store.create(
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

  createPost({ body, post_type, image_urls }, user) {
    assertWritable(user);
    const text = String(body || '').trim();
    if (!text && !(image_urls || []).length) fail('Write something to post.');
    if (text.length > 5000) fail('Posts must be 5000 characters or fewer.');
    const post = store.create(
      'FeedPost',
      {
        body: text,
        post_type: post_type || 'update',
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

  createComment({ post_id, body }, user) {
    assertWritable(user);
    need(post_id, 'Missing post.');
    const text = String(body || '').trim();
    if (!text) fail('Write a comment first.');
    const post = store.get('FeedPost', post_id);
    if (!post) fail('Post not found.', 404);

    const comment = store.create('Comment', { post_id, body: text, ...authorFields(user) }, user);
    // Recount rather than increment so the badge can't drift from reality.
    const comment_count = store.count('Comment', { post_id });
    store.update('FeedPost', post_id, { comment_count });

    if (post.created_by_id !== user.id) {
      notify(post.created_by_id, {
        type: 'comment',
        actor_name: user.full_name || user.email,
        target_type: 'post',
        target_id: post_id,
        message: `${user.full_name || 'Someone'} commented on your post`,
      });
    }
    return { comment, comment_count };
  },

  toggleLike({ post_id }, user) {
    assertWritable(user);
    need(post_id, 'Missing post.');
    const post = store.get('FeedPost', post_id);
    if (!post) fail('Post not found.', 404);

    const existing = store.filter('FeedLike', { post_id, created_by_id: user.id });
    let liked;
    if (existing.length) {
      existing.forEach((like) => store.delete('FeedLike', like.id));
      liked = false;
    } else {
      store.create('FeedLike', { post_id }, user);
      liked = true;
    }
    const like_count = store.count('FeedLike', { post_id });
    store.update('FeedPost', post_id, { like_count });

    if (liked && post.created_by_id !== user.id) {
      notify(post.created_by_id, {
        type: 'like',
        actor_name: user.full_name || user.email,
        target_type: 'post',
        target_id: post_id,
        message: `${user.full_name || 'Someone'} liked your post`,
      });
    }
    return { liked, like_count };
  },

  // Views are counted once per viewer, so a refresh loop can't inflate them.
  recordPostView({ postId }, user) {
    need(postId, 'Missing post.');
    const post = store.get('FeedPost', postId);
    if (!post) fail('Post not found.', 404);

    const seen = store.filter('ActivityEvent', { type: 'post_view', target_id: postId, created_by_id: user.id });
    if (!seen.length) {
      store.create('ActivityEvent', { type: 'post_view', target_id: postId }, user);
      const count = store.count('ActivityEvent', { type: 'post_view', target_id: postId });
      store.update('FeedPost', postId, { view_count: count });
      return { count };
    }
    return { count: post.view_count || store.count('ActivityEvent', { type: 'post_view', target_id: postId }) };
  },

  // ---- provider activity ----------------------------------------------------

  toggleCommunityActivity({ providerId, activity }, user) {
    assertWritable(user);
    need(providerId, 'Missing listing.');
    const provider = store.get('Provider', providerId);
    if (!provider) fail('Listing not found.', 404);

    const entity = activity === 'use' ? 'ProviderUsage' : 'SavedProvider';
    const existing = store.filter(entity, { provider_id: providerId, created_by_id: user.id });

    let active;
    if (existing.length) {
      existing.forEach((row) => store.delete(entity, row.id));
      active = false;
    } else {
      store.create(
        entity,
        { provider_id: providerId, provider_name: provider.name, category: provider.category },
        user
      );
      active = true;
    }

    const field = activity === 'use' ? 'use_count' : 'save_count';
    store.update('Provider', providerId, { [field]: store.count(entity, { provider_id: providerId }) });
    return { active };
  },

  // ---- messaging ------------------------------------------------------------

  sendMessage({ recipient_id, body }, user) {
    assertWritable(user);
    need(recipient_id, 'Missing recipient.');
    const text = String(body || '').trim();
    if (!text) fail('Write a message first.');
    if (recipient_id === user.id) fail('You cannot message yourself.');
    if (!users.byId(recipient_id)) fail('That member could not be found.', 404);

    const message = store.create(
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
    notify(recipient_id, {
      type: 'message',
      actor_name: user.full_name || user.email,
      target_type: 'message',
      target_id: user.id,
      message: `${user.full_name || 'Someone'} sent you a message`,
    });
    return { message };
  },

  // ---- zmanim ---------------------------------------------------------------

  // The simulator passes { debug: {...} } to preview another time or location; that
  // only ever overlays the caller's own profile, never another user's.
  getShabbosStatus({ debug } = {}, user) {
    const profile = { ...(user || {}) };
    let now = Date.now();
    if (debug && typeof debug === 'object') {
      if (debug.now) now = new Date(debug.now).getTime() || now;
      for (const key of ['latitude', 'longitude', 'timezone', 'city', 'country_code']) {
        if (debug[key] !== undefined && debug[key] !== null && debug[key] !== '') profile[key] = debug[key];
      }
    }
    return computeShabbosStatus(profile, now);
  },
};

export const publicFunctions = new Set(['getShabbosStatus']);
