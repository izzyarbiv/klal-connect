// Klal API — entities, auth, business functions and uploads.
//
// Exports the Express app without listening, so the same code serves both the
// local dev server (server/index.js) and a serverless function (api/index.js).
// Calling listen() in a serverless runtime is what breaks these deployments.
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { randomBytes } from 'node:crypto';

import { store, users, userToPublic, otp, GUEST_EMAIL } from './db.js';
import {
  attachUser, requireAuth, requireAdmin,
  hashPassword, checkPassword, signToken, deliverCode, canDeliverCodes,
} from './auth.js';
import { functions, publicFunctions } from './functions.js';
import { isDemoMode } from './db.js';
import { ensureDemoData } from './demo-seed.js';
import { reverseGeocode, searchPlaces, geolocateIp, PROVIDER as GEO_PROVIDER } from './geocode.js';
import { put as putFile, usingObjectStorage, UPLOAD_DIR } from './storage.js';

const app = express();
// Vercel and most hosts terminate TLS in front of us; req.ip must come from
// X-Forwarded-For there, but trusting that header when we are NOT behind a
// proxy would let any client spoof its own IP.
if (process.env.KC_TRUST_PROXY === '1') app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '2mb' }));
// A demo instance seeds itself on first request; every cold start is empty.
if (isDemoMode) {
  app.use((req, res, next) => { ensureDemoData().then(() => next(), next); });
}

app.use(attachUser);

// The shared guest session exists so a visitor can look around without signing
// in — not so that anonymous visitors can post, message and edit one permanent
// account between them. With KC_GUEST_READONLY=1 the guest reads everything a
// member reads, and every write gets a 403 the client can show as "sign in to
// do that". Off by default so a demo stays fully interactive.
const GUEST_READONLY = process.env.KC_GUEST_READONLY === '1';
const GUEST_BLOCKED_AUTH = new Set(['/api/auth/me', '/api/auth/password']);
const isGuest = (user) => !!user && user.email === GUEST_EMAIL;

// The guest is one row shared by every visitor, and before KC_GUEST_READONLY
// existed any visitor could write to it — which is how a real member's name,
// phone and work history ended up on it. So the row's profile fields are never
// trusted: everywhere the guest is read (its own session, the members list,
// the profile route, the author fields on anything it creates) this fixed
// placeholder is used instead. Whatever is stored on the row stays invisible.
const GUEST_PROFILE = { full_name: 'Guest', headline: 'Browsing Klal as a guest', profile_type: 'community_member' };
function maskGuest(user) {
  if (!isGuest(user)) return user;
  const { id, email, role, verified, created_date, updated_date } = user;
  return { id, email, role, verified, created_date, updated_date, ...GUEST_PROFILE };
}
app.use((req, _res, next) => { req.user = maskGuest(req.user); next(); });

// What a session handed to the client looks like: the profile plus a flag the
// UI uses to show "create an account" instead of the guest's own settings.
const sessionUser = (user) => (user ? { ...maskGuest(user), guest: isGuest(user) } : null);

app.use((req, res, next) => {
  if (!GUEST_READONLY || !isGuest(req.user)) return next();
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  // Signing in or registering as someone else is how a visitor stops being the
  // guest, so those must go through even with the guest token attached.
  if (req.path.startsWith('/api/auth/') && !GUEST_BLOCKED_AUTH.has(req.path)) return next();
  const fn = req.path.match(/^\/api\/functions\/([^/]+)$/)?.[1];
  if (fn && publicFunctions.has(fn)) return next();
  res.status(403).json({ error: 'Sign in to do that.', guest: true });
});

// ---------------------------------------------------------------- entities --

// Which entities a signed-out visitor may read. The directory is public by
// design; everything else (messages, notifications, reports…) is not.
const PUBLIC_READ = new Set(['Provider', 'Company', 'Category', 'CommunityNote', 'Vouch']);

// Entities that carry a moderation status. Everyone except an admin sees only
// published rows — plus their own submissions, so an author can still find the
// listing they sent to the review queue. Without this, anyone could read the
// pending/hidden/declined queue straight off the API.
const MODERATED = new Set(['Provider', 'Company', 'CommunityNote']);

function moderationVisible(row, user) {
  if (row.status === 'published' || row.status === undefined) return true;
  return !!user && row.created_by_id === user.id;
}

// Rows a signed-in non-admin may read: either public, their own, or addressed
// to them. Keeps one user's messages out of another's list() call.
const OWNER_SCOPED = {
  Message: (row, user) => row.created_by_id === user.id || row.recipient_id === user.id,
  Notification: (row, user) => row.recipient_id === user.id,
  SavedProvider: (row, user) => row.created_by_id === user.id,
  SavedPost: (row, user) => row.created_by_id === user.id,
  ProviderUsage: (row, user) => row.created_by_id === user.id,
  FeedLike: (row, user) => row.created_by_id === user.id,
  CommentVote: (row, user) => row.created_by_id === user.id,
  Invite: (row, user) => row.created_by_id === user.id,
  PrivateReport: (row, user) => row.created_by_id === user.id,
  ListingReport: (row, user) => row.created_by_id === user.id,
  ClaimRequest: (row, user) => row.created_by_id === user.id,
  ListingChangeRequest: (row, user) => row.created_by_id === user.id,
};

// Entities the client may write directly. Anything with moderation state or
// counters goes through /functions instead.
const CLIENT_WRITABLE = new Set([
  'Provider', 'Company', 'Setting', 'Notification', 'Connection',
  'SavedProvider', 'ListingChangeRequest', 'Category',
]);

// Entities a moderator works: the review queues and what they moderate.
// A moderator never sees messages, saves, or anyone's private notifications.
const MODERATED_BY_STAFF = new Set(['Provider', 'CommunityNote', 'ClaimRequest', 'ListingChangeRequest', 'ListingReport', 'PrivateReport']);
const isModerator = (user) => user?.role === 'moderator';

// Author fields are copied onto rows when they are created (functions.js
// authorFields, sender_name, actor_name…). Rows the guest created before it
// was locked carry whatever name was on its profile at the time, so the mask
// is applied on the way out as well: anything the guest wrote reads as Guest.
const GUEST_AUTHOR = { author_name: GUEST_PROFILE.full_name, author_headline: GUEST_PROFILE.headline, author_avatar_url: '', sender_name: GUEST_PROFILE.full_name, inviter_name: GUEST_PROFILE.full_name, actor_name: GUEST_PROFILE.full_name, actor_headline: '' };

// The shape a row takes on the way to a particular reader.
function present(entity, row, user) {
  let out = row;
  if (row.created_by === GUEST_EMAIL) {
    out = { ...out };
    for (const k of Object.keys(GUEST_AUTHOR)) if (k in out) out[k] = GUEST_AUTHOR[k];
  }
  // How many people saw a post is the author's to know, not the readers'.
  if (entity === 'FeedPost' && user?.role !== 'admin' && row.created_by_id !== user?.id && 'view_count' in out) {
    const { view_count, ...rest } = out;
    out = rest;
  }
  return out;
}

async function readable(entity, rows, user) {
  return (await visibleRows(entity, rows, user)).map((row) => present(entity, row, user));
}

// The guest's id, looked up once per process. Null where there is no guest.
let guestIdPromise = null;
const guestId = () => (guestIdPromise ??= users.byEmail(GUEST_EMAIL).then((row) => row?.id || null).catch(() => { guestIdPromise = null; return null; }));

async function visibleRows(entity, rows, user) {
  if (user?.role === 'admin') return rows;
  if (isModerator(user) && MODERATED_BY_STAFF.has(entity)) return rows;
  if (!user && !PUBLIC_READ.has(entity)) return [];
  // The guest has no messages, notifications, saves or votes of its own —
  // anything addressed to it would be readable by every visitor at once.
  if (isGuest(user) && OWNER_SCOPED[entity]) return [];
  const scope = OWNER_SCOPED[entity];
  let visible = scope ? rows.filter((row) => scope(row, user)) : rows;
  if (MODERATED.has(entity)) visible = visible.filter((row) => moderationVisible(row, user));
  // The demo seed connects the guest to everyone so the demo has something to
  // show; those are nobody's connections and must not count as anyone's.
  if (entity === 'Connection') {
    const g = await guestId();
    if (g) visible = visible.filter((row) => row.requester_id !== g && row.recipient_id !== g);
  }
  return visible;
}

function canWrite(entity, user, row) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  // Moderators change the state of existing rows in the queues; they do not
  // create listings on anyone's behalf or delete anything.
  if (isModerator(user) && row && MODERATED_BY_STAFF.has(entity)) return true;
  if (!CLIENT_WRITABLE.has(entity)) return false;
  // Settings are platform-wide (e.g. the global Shabbos override) and the
  // category list is the directory's structure — admin only.
  if (entity === 'Setting' || entity === 'Category') return false;
  if (row && row.created_by_id && row.created_by_id !== user.id) {
    // Notifications are written by the server for a recipient, who may mark
    // them read; that is the one cross-author write we allow.
    return entity === 'Notification' && row.recipient_id === user.id;
  }
  return true;
}

// What the person on the receiving end of a row may change about it, and
// nothing else. A connection request is answered by its recipient (accept or
// decline); a message is marked read by its recipient. Neither may touch any
// other field — the PUT route replaces the body with exactly this patch.
const RECIPIENT_PATCH = {
  Connection: (body) => (['accepted', 'declined'].includes(body?.status) ? { status: body.status } : null),
  Message: (body) => ({ read: !!body?.read }),
};
function recipientPatch(entity, user, row, body) {
  const narrow = RECIPIENT_PATCH[entity];
  if (!narrow || !row || row.recipient_id !== user.id || row.created_by_id === user.id) return null;
  return narrow(body);
}

const parseJSON = (value, fallback) => {
  if (value === undefined) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
};

// Everything the client knows how to ask for (src/api/client.js). Anything
// else is a typo or a probe, and gets a 404 rather than a plausible-looking
// empty list.
const ENTITIES = new Set([
  'Provider', 'Company', 'Category', 'Comment', 'CommunityNote', 'Connection',
  'ActivityEvent', 'FeedPost', 'FeedLike', 'Message', 'Notification', 'Setting',
  'SavedProvider', 'ProviderUsage', 'ClaimRequest', 'ListingChangeRequest',
  'ListingReport', 'PrivateReport', 'Vouch', 'CommentVote', 'Invite', 'SavedPost',
]);

app.param('entity', (req, res, next, entity) => {
  if (!ENTITIES.has(entity)) return res.status(404).json({ error: `Unknown entity: ${entity}` });
  next();
});

// Registered before the generic :entity route below, which would otherwise
// shadow it and return an empty list (users don't live in the records table).
app.get('/api/entities/User', async (req, res, next) => {
  res.json(await memberList(req.user));
});

app.get('/api/entities/:entity', async (req, res, next) => {
  const { entity } = req.params;
  const { sort, limit, query } = req.query;
  const q = parseJSON(query, null);
  const rows = q ? await store.filter(entity, q, sort, null) : await store.list(entity, sort, null);
  const visible = await readable(entity, rows, req.user);
  res.json(limit ? visible.slice(0, Number(limit)) : visible);
});

app.get('/api/entities/:entity/:id', async (req, res, next) => {
  const row = await store.get(req.params.entity, req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const [visible] = await readable(req.params.entity, [row], req.user);
  if (!visible) return res.status(403).json({ error: 'Not permitted' });
  res.json(visible);
});

// Fields only the server or an admin may set. A listing's author may edit
// their listing, but not publish it, verify it, or inflate its counts.
const PROTECTED_FIELDS = new Set([
  'status', 'verified', 'verified_at', 'verified_by', 'verified_badges', 'claimed', 'demo',
  'save_count', 'usage_count', 'vouch_count', 'created_by_id', 'created_by', 'id',
]);
const MODERATOR_FIELDS = new Set(['status', 'admin_notes', 'resolved_at', 'resolved_by']);
const stripProtected = (body) => Object.fromEntries(Object.entries(body || {}).filter(([k]) => !PROTECTED_FIELDS.has(k)));

// The status a member's freshly created row starts in, whatever the body
// said. A connection request is pending until its recipient answers; a
// listing or note waits for review; a company page publishes as it always
// has (there is no review queue for companies).
const CREATE_STATUS = { Connection: 'pending', Provider: 'pending', CommunityNote: 'pending', ListingChangeRequest: 'pending', Company: 'published' };

app.post('/api/entities/:entity', requireAuth, async (req, res, next) => {
  const { entity } = req.params;
  if (!canWrite(entity, req.user)) return res.status(403).json({ error: 'Not permitted' });
  let body = req.body || {};
  if (req.user.role !== 'admin') {
    // Without this a direct POST could hand itself an accepted connection, a
    // published listing, or someone else's name as creator.
    body = stripProtected(body);
    if (CREATE_STATUS[entity]) body.status = CREATE_STATUS[entity];
  }
  if (entity === 'Connection') {
    const recipient = body.recipient_id ? await users.byId(body.recipient_id) : null;
    if (!recipient || recipient.email === GUEST_EMAIL) return res.status(400).json({ error: 'That member cannot receive connection requests.' });
    if (recipient.id === req.user.id) return res.status(400).json({ error: 'You cannot connect with yourself.' });
    body.requester_id = req.user.id;
  }
  res.status(201).json(await store.create(entity, body, req.user));
});

app.put('/api/entities/:entity/:id', requireAuth, async (req, res, next) => {
  const { entity, id } = req.params;
  const existing = await store.get(entity, id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const asRecipient = req.user.role !== 'admin' ? recipientPatch(entity, req.user, existing, req.body) : null;
  if (!asRecipient && !canWrite(entity, req.user, existing)) return res.status(403).json({ error: 'Not permitted' });
  let patch = req.body;
  if (asRecipient) {
    patch = asRecipient;
  } else if (req.user.role !== 'admin') {
    if (isModerator(req.user) && MODERATED_BY_STAFF.has(entity) && existing.created_by_id !== req.user.id) {
      // A moderator's job on someone else's row is exactly its state: the
      // status, their notes, and the resolution stamp. Nothing else changes.
      patch = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => MODERATOR_FIELDS.has(k)));
    } else {
      patch = stripProtected(req.body);
    }
  }
  const updated = await store.update(entity, id, patch);
  // Every status change by staff leaves a trace: who, what, from, to.
  if (MODERATED.has(entity) || MODERATED_BY_STAFF.has(entity)) {
    if (patch.status !== undefined && patch.status !== existing.status && (req.user.role === 'admin' || isModerator(req.user))) {
      await store.create('ActivityEvent', { type: 'moderation', entity, target_id: id, from: existing.status || null, to: patch.status, actor_role: req.user.role }, req.user);
    }
  }
  res.json(updated);
});

app.delete('/api/entities/:entity/:id', requireAuth, async (req, res, next) => {
  const { entity, id } = req.params;
  const existing = await store.get(entity, id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (isModerator(req.user) && existing.created_by_id !== req.user.id) return res.status(403).json({ error: 'Moderators cannot delete.' });
  if (!canWrite(entity, req.user, existing)) return res.status(403).json({ error: 'Not permitted' });
  await store.delete(entity, id);
  res.json({ ok: true });
});

app.post('/api/entities/:entity/update-many', requireAuth, async (req, res, next) => {
  const { entity } = req.params;
  const { query = {}, update = {} } = req.body || {};
  if (!canWrite(entity, req.user)) return res.status(403).json({ error: 'Not permitted' });
  // Non-admins may only bulk-update their own rows (used to mark notifications read).
  const scoped = req.user.role === 'admin'
    ? query
    : { ...query, ...(entity === 'Notification' ? { recipient_id: req.user.id } : { created_by_id: req.user.id }) };
  res.json({ updated: await store.updateMany(entity, scoped, update) });
});

// ------------------------------------------------------------------- users --

function publicProfile(user) {
  if (!user) return null;
  // Never hand a member's contact details, location or Shabbos configuration
  // to other users. The profile page shows the rest.
  const {
    email, phone, latitude, longitude, timezone, country_code,
    candle_lighting_offset_minutes, havdalah_method, shabbos_full_lock, shabbos_mode_source,
    ...safe
  } = user;
  return safe;
}

// A deactivated account stays in the table (its posts and messages still point
// at it) but is nobody's business except an admin's.
const isDisabled = (user) => user.disabled === true;

async function memberList(viewer) {
  const all = (await users.all()).map(userToPublic);
  if (viewer?.role === 'admin') return all;
  // The guest is a session, not a member: it is not someone to connect with.
  return all.filter((u) => !isDisabled(u) && !isGuest(u)).map(publicProfile);
}

app.get('/api/users', async (req, res, next) => {
  res.json(await memberList(req.user));
});

// Admin only: hand a locked-out member a temporary password. Shown once to
// the admin, never stored in the clear, and every use is audited. This is
// the way back in while there is no email to send a reset code to.
app.post('/api/users/:id/reset-password', requireAdmin, async (req, res, next) => {
  const target = await users.byId(req.params.id);
  if (!target) return res.status(404).json({ error: 'Not found' });
  if (target.email === GUEST_EMAIL) return res.status(400).json({ error: 'The guest account has no password to reset.' });
  const temp = tempPassword();
  await users.update(target.id, { password_hash: hashPassword(temp) });
  await store.create('ActivityEvent', { type: 'password_reset', target_id: target.id, by: 'admin' }, req.user);
  res.json({ temp_password: temp, email: target.email });
});

// Admin only: the basic profile fields, and deactivation. Not role (its own
// route), not email, not password.
const ADMIN_PROFILE_FIELDS = new Set(['full_name', 'headline', 'bio', 'home_city', 'phone', 'avatar_url', 'banner_url', 'work_experience', 'profile_type', 'disabled', 'verified']);
app.put('/api/users/:id', requireAdmin, async (req, res, next) => {
  const target = await users.byId(req.params.id);
  if (!target) return res.status(404).json({ error: 'Not found' });
  const patch = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => ADMIN_PROFILE_FIELDS.has(k)));
  if (target.id === req.user.id && patch.disabled) return res.status(400).json({ error: 'You cannot deactivate yourself.' });
  const updated = await users.update(target.id, patch);
  await store.create('ActivityEvent', { type: 'profile_edit', target_id: target.id, fields: Object.keys(patch), by: 'admin' }, req.user);
  res.json(userToPublic(updated));
});

const tempPassword = () => {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(12);
  let s = '';
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `Klal-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
};

// Admin only: user | moderator | admin. You cannot change your own role, so
// there is always at least the admin who is doing the changing.
const ROLES = new Set(['user', 'moderator', 'admin']);
app.put('/api/users/:id/role', requireAdmin, async (req, res, next) => {
  const { role } = req.body || {};
  if (!ROLES.has(role)) return res.status(400).json({ error: 'Role must be user, moderator or admin.' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role.' });
  const target = await users.byId(req.params.id);
  if (!target) return res.status(404).json({ error: 'Not found' });
  if (target.email === GUEST_EMAIL) return res.status(400).json({ error: 'The guest account cannot have a role.' });
  const updated = await users.update(target.id, { role });
  await store.create('ActivityEvent', { type: 'role_change', target_id: target.id, from: target.role, to: role }, req.user);
  res.json(userToPublic(updated));
});

app.get('/api/users/:id', async (req, res, next) => {
  const user = userToPublic(await users.byId(req.params.id));
  const isAdmin = req.user?.role === 'admin';
  const isSelfOrAdmin = req.user && user && (req.user.id === user.id || isAdmin);
  if (!user || (isDisabled(user) && !isSelfOrAdmin)) return res.status(404).json({ error: 'Not found' });
  // Only an admin (who may need to scrub it) sees what is stored on the guest row.
  if (isGuest(user) && !isAdmin) return res.status(404).json({ error: 'Not found' });
  res.json(isSelfOrAdmin ? user : publicProfile(user));
});

// -------------------------------------------------------------------- auth --

// Public runtime config: what the browser needs to know before it renders,
// none of it secret. Kept server-side so any of it can change with an env var
// instead of a rebuild.
//
// GOOGLE_MAPS_BROWSER_KEY is meant to ship to the client — restrict it in the
// Cloud console to this site's referrers and to the Maps JavaScript API only.
// The server-side geocoding key (KC_GEOCODER_KEY) is a different key and never
// leaves this process.
app.get('/api/config', (_req, res) => res.json({
  demoMode: isDemoMode,
  googleMapsKey: process.env.GOOGLE_MAPS_BROWSER_KEY || '',
  googleMapsMapId: process.env.GOOGLE_MAPS_MAP_ID || '',
  tileUrl: process.env.KC_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution: process.env.KC_TILE_ATTRIBUTION || '&copy; OpenStreetMap contributors',
  geocoder: GEO_PROVIDER,
  guestReadOnly: GUEST_READONLY,
}));

// Issues a session for the shared guest account so a visitor can browse the
// signed-in parts of the app without a login wall.
//
// Only mounted when KC_DEMO_MODE is on. Everyone who lands here shares one
// account, which is why KC_GUEST_READONLY exists (see the middleware above).
if (isDemoMode) {
  app.post('/api/auth/demo-session', async (_req, res, next) => {
    try {
      const guest = await users.byEmail(GUEST_EMAIL);
      if (!guest) return res.status(503).json({ error: 'Demo data is still loading.' });
      res.json({ access_token: signToken(guest), user: sessionUser(userToPublic(guest)) });
    } catch (err) {
      next(err);
    }
  });
}

app.get('/api/auth/me', requireAuth, (req, res) => res.json(sessionUser(req.user)));

app.put('/api/auth/me', requireAuth, async (req, res, next) => {
  // Every visitor shares the guest; letting one of them write its profile is
  // how another member's details end up shown to everyone. Refused regardless
  // of KC_GUEST_READONLY.
  if (isGuest(req.user)) return res.status(403).json({ error: 'Create an account to have a profile of your own.', guest: true });
  // Role and verification are server-owned; a user cannot promote themselves.
  const { role, verified, password_hash, email, id, ...safe } = req.body || {};
  res.json(userToPublic(await users.update(req.user.id, safe)));
});

// A signed-in member changes their own password. Needs the current one, so
// a session left open on a shared device cannot lock the owner out.
app.put('/api/auth/password', requireAuth, async (req, res, next) => {
  const { current_password, new_password } = req.body || {};
  if (String(new_password || '').length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  const row = await users.byId(req.user.id);
  if (!checkPassword(current_password, row.password_hash)) return res.status(400).json({ error: 'Your current password is not right' });
  await users.update(row.id, { password_hash: hashPassword(new_password) });
  res.json({ ok: true });
});

app.post('/api/auth/login', async (req, res, next) => {
  const { email, password } = req.body || {};
  const row = await users.byEmail(email);
  if (!row || !checkPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  // An account that registered while email was on but never entered its code
  // is not in yet. A fresh code goes out and the client shows the same
  // verification screen sign-up uses. Accounts created before a mail provider
  // existed were marked verified at creation, so nobody is locked out by this.
  if (!row.verified && canDeliverCodes()) {
    const code = await otp.issue(String(email).trim(), 'verify');
    const dev_code = await deliverCode(email, 'verify', code);
    return res.status(403).json({ error: 'Please verify your email address first. We just sent you a new code.', verification_required: true, dev_code });
  }
  res.json({ access_token: signToken(row), user: userToPublic(row) });
});

// Public, unauthenticated: who an invite link is from, so the join page can
// say "Miriam invited you" before there is an account. Names only.
app.get('/api/invites/:code', async (req, res, next) => {
  try {
    const [invite] = await store.filter('Invite', { code: String(req.params.code).toLowerCase() });
    if (!invite) return res.status(404).json({ error: 'That invite link is not valid.' });
    res.json({ code: invite.code, inviter_name: invite.inviter_name || 'A community member', for_business: invite.provider_name || null });
  } catch (err) { next(err); }
});

app.post('/api/auth/register', async (req, res, next) => {
  const { email, password, full_name, invite_code } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (await users.byEmail(email)) return res.status(409).json({ error: 'That email is already registered' });

  // First account bootstraps the admin; there is no other way in yet.
  const role = (await users.all()).length === 0 ? 'admin' : 'user';

  // Until a mail provider is wired up (KC_EMAIL_DELIVERY=real) nobody can
  // receive a verification code, so a new account is signed in straight away
  // rather than parked on a screen waiting for an email that never comes.
  // Login never required verification anyway; this just stops pretending.
  // An invite link, if the visitor arrived through one. Recorded on both
  // sides so the profile can say "Invited by" and the inviter gets credit.
  const invited = invite_code ? (await store.filter('Invite', { code: String(invite_code).toLowerCase() }))[0] : null;
  const invitedBy = invited ? { invited_by_id: invited.created_by_id, invited_by_name: invited.inviter_name || '' } : {};

  if (!canDeliverCodes()) {
    const row = await users.create({ email, password_hash: hashPassword(password), role, verified: true, full_name: full_name || '', ...invitedBy });
    await acceptInvite(invited, row);
    return res.status(201).json({ ok: true, otp_sent: false, access_token: signToken(row), user: sessionUser(userToPublic(row)) });
  }

  const row = await users.create({ email, password_hash: hashPassword(password), role, verified: 0, full_name: full_name || '', ...invitedBy });
  await acceptInvite(invited, row);
  const code = await otp.issue(String(email).trim(), 'verify');
  res.status(201).json({ ok: true, otp_sent: true, dev_code: await deliverCode(email, 'verify', code) });
});

// Marks an invite as joined and tells the inviter. Invite rows are reusable
// links (one per member), so this appends to a list rather than closing it.
async function acceptInvite(invite, newUser) {
  if (!invite) return;
  const joined = [...(invite.joined_user_ids || []), newUser.id];
  await store.update('Invite', invite.id, { joined_user_ids: joined, joined_count: joined.length });
  if (invite.created_by_id && invite.created_by_id !== newUser.id) {
    await store.create('Notification', {
      recipient_id: invite.created_by_id, read: false, type: 'invite_joined',
      actor_name: newUser.data?.full_name || newUser.email,
      target_type: 'user', target_id: newUser.id,
      message: `${newUser.data?.full_name || 'Someone'} joined Klal from your invite`,
    }, { id: newUser.id, email: newUser.email });
  }
}

app.post('/api/auth/verify-otp', async (req, res, next) => {
  const { email, otpCode } = req.body || {};
  if (!(await otp.verify(String(email || '').trim(), 'verify', otpCode))) {
    return res.status(400).json({ error: 'That code is incorrect or has expired' });
  }
  const row = await users.byEmail(email);
  if (!row) return res.status(404).json({ error: 'Account not found' });
  await users.update(row.id, { verified: true });
  res.json({ access_token: signToken(row), user: userToPublic(await users.byId(row.id)) });
});

app.post('/api/auth/resend-otp', async (req, res, next) => {
  const { email } = req.body || {};
  if (!(await users.byEmail(email))) return res.json({ ok: true }); // don't reveal who is registered
  const code = await otp.issue(String(email).trim(), 'verify');
  res.json({ ok: true, dev_code: await deliverCode(email, 'verify', code) });
});

app.post('/api/auth/reset-password-request', async (req, res, next) => {
  const { email } = req.body || {};
  if (!canDeliverCodes()) {
    return res.status(503).json({ error: 'Password reset by email is not available yet. Please contact us and we will reset it for you.' });
  }
  if (!(await users.byEmail(email))) return res.json({ ok: true });
  const code = await otp.issue(String(email).trim(), 'reset');
  res.json({ ok: true, dev_code: await deliverCode(email, 'reset', code) });
});

app.post('/api/auth/reset-password', async (req, res, next) => {
  const { email, resetToken, newPassword } = req.body || {};
  if (String(newPassword || '').length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!(await otp.verify(String(email || '').trim(), 'reset', resetToken))) {
    return res.status(400).json({ error: 'That reset code is incorrect or has expired' });
  }
  const row = await users.byEmail(email);
  if (!row) return res.status(404).json({ error: 'Account not found' });
  await users.update(row.id, { password_hash: hashPassword(newPassword) });
  res.json({ ok: true });
});

// --------------------------------------------------------------- functions --

app.post('/api/functions/:name', async (req, res, next) => {
  const { name } = req.params;
  const fn = functions[name];
  if (!fn) return res.status(404).json({ error: `Unknown function: ${name}` });
  if (!publicFunctions.has(name) && !req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    res.json(await fn(req.body || {}, req.user));
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Something went wrong' });
  }
});

// ----------------------------------------------------------------- uploads --

// Buffered in memory rather than written to disk: on a serverless host there
// is no durable disk to write to, and the storage layer needs the bytes anyway.
//
// 4MB, not 8: Vercel rejects any request body over 4.5MB at the platform edge
// with an opaque 413 before the function runs. Staying under that means the
// user gets our message instead of a Vercel error page.
const MAX_UPLOAD_MB = Number(process.env.KC_MAX_UPLOAD_MB || 4);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

app.post('/api/upload', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: `Please choose an image file under ${MAX_UPLOAD_MB}MB.` });
    res.json({ file_url: await putFile(req.file.buffer, req.file.mimetype) });
  } catch (err) { next(err); }
});

// Only meaningful for the local-disk backend; with object storage the browser
// fetches the file straight from the storage host.
if (!usingObjectStorage) {
  app.use('/api/files', express.static(UPLOAD_DIR, { maxAge: '7d' }));
}

// ------------------------------------------------------------- geocoding --

// Signed-in only: an open geocoding proxy would let anyone burn the app's
// provider quota, and every caller in the app is already authenticated.
app.get('/api/geo/reverse', requireAuth, async (req, res, next) => {
  try {
    res.json(await reverseGeocode(req.query.lat, req.query.lon));
  } catch (err) { next(err); }
});

app.get('/api/geo/search', requireAuth, async (req, res, next) => {
  try {
    res.json(await searchPlaces(req.query.q, req.query.limit));
  } catch (err) { next(err); }
});

// Coarse fallback when the browser's geolocation is denied or unavailable.
app.get('/api/geo/ip', requireAuth, async (req, res, next) => {
  try {
    // req.ip honours the trust-proxy setting below, so a spoofed
    // X-Forwarded-For is only believed when we are actually behind a proxy.
    res.json(await geolocateIp(req.ip));
  } catch (err) { next(err); }
});

app.get('/api/health', async (_req, res, next) => {
  try {
    res.json({ ok: true, users: (await users.all()).length, providers: await store.count('Provider') });
  } catch (err) { next(err); }
});

app.use((err, _req, res, _next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `That image is too large. Please choose one under ${MAX_UPLOAD_MB}MB.` });
  }
  console.error('[api]', err);
  res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
});

export default app;
