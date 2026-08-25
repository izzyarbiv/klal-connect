// Klal Connect API — entities, auth, business functions and uploads.
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { store, users, userToPublic, otp, newId } from './db.js';
import {
  attachUser, requireAuth, requireAdmin,
  hashPassword, checkPassword, signToken, deliverCode,
} from './auth.js';
import { functions, publicFunctions } from './functions.js';
import { reverseGeocode, searchPlaces, geolocateIp, PROVIDER as GEO_PROVIDER } from './geocode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.KC_PORT || 4000);
const UPLOAD_DIR = process.env.KC_UPLOAD_DIR || path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
// Vercel and most hosts terminate TLS in front of us; req.ip must come from
// X-Forwarded-For there, but trusting that header when we are NOT behind a
// proxy would let any client spoof its own IP.
if (process.env.KC_TRUST_PROXY === '1') app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(attachUser);

// ---------------------------------------------------------------- entities --

// Which entities a signed-out visitor may read. The directory is public by
// design; everything else (messages, notifications, reports…) is not.
const PUBLIC_READ = new Set(['Provider', 'Company', 'Category', 'CommunityNote']);

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
  ProviderUsage: (row, user) => row.created_by_id === user.id,
  FeedLike: (row, user) => row.created_by_id === user.id,
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

function readable(entity, rows, user) {
  if (user?.role === 'admin') return rows;
  if (!user && !PUBLIC_READ.has(entity)) return [];
  const scope = OWNER_SCOPED[entity];
  let visible = scope ? rows.filter((row) => scope(row, user)) : rows;
  if (MODERATED.has(entity)) visible = visible.filter((row) => moderationVisible(row, user));
  return visible;
}

function canWrite(entity, user, row) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!CLIENT_WRITABLE.has(entity)) return false;
  // Settings are platform-wide (e.g. the global Shabbos override) — admin only.
  if (entity === 'Setting') return false;
  if (row && row.created_by_id && row.created_by_id !== user.id) {
    // Notifications are written by the server for a recipient, who may mark
    // them read; that is the one cross-author write we allow.
    return entity === 'Notification' && row.recipient_id === user.id;
  }
  return true;
}

const parseJSON = (value, fallback) => {
  if (value === undefined) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
};

// Registered before the generic :entity route below, which would otherwise
// shadow it and return an empty list (users don't live in the records table).
app.get('/api/entities/User', (req, res) => {
  const all = users.all().map(userToPublic);
  res.json(req.user?.role === 'admin' ? all : all.map(publicProfile));
});

app.get('/api/entities/:entity', (req, res) => {
  const { entity } = req.params;
  const { sort, limit, query } = req.query;
  const q = parseJSON(query, null);
  const rows = q ? store.filter(entity, q, sort, null) : store.list(entity, sort, null);
  const visible = readable(entity, rows, req.user);
  res.json(limit ? visible.slice(0, Number(limit)) : visible);
});

app.get('/api/entities/:entity/:id', (req, res) => {
  const row = store.get(req.params.entity, req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const [visible] = readable(req.params.entity, [row], req.user);
  if (!visible) return res.status(403).json({ error: 'Not permitted' });
  res.json(visible);
});

app.post('/api/entities/:entity', requireAuth, (req, res) => {
  const { entity } = req.params;
  if (!canWrite(entity, req.user)) return res.status(403).json({ error: 'Not permitted' });
  res.status(201).json(store.create(entity, req.body, req.user));
});

app.put('/api/entities/:entity/:id', requireAuth, (req, res) => {
  const { entity, id } = req.params;
  const existing = store.get(entity, id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (!canWrite(entity, req.user, existing)) return res.status(403).json({ error: 'Not permitted' });
  res.json(store.update(entity, id, req.body));
});

app.delete('/api/entities/:entity/:id', requireAuth, (req, res) => {
  const { entity, id } = req.params;
  const existing = store.get(entity, id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (!canWrite(entity, req.user, existing)) return res.status(403).json({ error: 'Not permitted' });
  store.delete(entity, id);
  res.json({ ok: true });
});

app.post('/api/entities/:entity/update-many', requireAuth, (req, res) => {
  const { entity } = req.params;
  const { query = {}, update = {} } = req.body || {};
  if (!canWrite(entity, req.user)) return res.status(403).json({ error: 'Not permitted' });
  // Non-admins may only bulk-update their own rows (used to mark notifications read).
  const scoped = req.user.role === 'admin'
    ? query
    : { ...query, ...(entity === 'Notification' ? { recipient_id: req.user.id } : { created_by_id: req.user.id }) };
  res.json({ updated: store.updateMany(entity, scoped, update) });
});

// ------------------------------------------------------------------- users --

function publicProfile(user) {
  if (!user) return null;
  // Never hand a member's contact/location details to other users.
  const { email, latitude, longitude, timezone, country_code, ...safe } = user;
  return safe;
}

app.get('/api/users', (req, res) => {
  const all = users.all().map(userToPublic);
  res.json(req.user?.role === 'admin' ? all : all.map(publicProfile));
});

app.get('/api/users/:id', (req, res) => {
  const user = userToPublic(users.byId(req.params.id));
  if (!user) return res.status(404).json({ error: 'Not found' });
  const isSelfOrAdmin = req.user && (req.user.id === user.id || req.user.role === 'admin');
  res.json(isSelfOrAdmin ? user : publicProfile(user));
});

// -------------------------------------------------------------------- auth --

app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));

app.put('/api/auth/me', requireAuth, (req, res) => {
  // Role and verification are server-owned; a user cannot promote themselves.
  const { role, verified, password_hash, email, id, ...safe } = req.body || {};
  res.json(userToPublic(users.update(req.user.id, safe)));
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const row = users.byEmail(email);
  if (!row || !checkPassword(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ access_token: signToken(row), user: userToPublic(row) });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, full_name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (users.byEmail(email)) return res.status(409).json({ error: 'That email is already registered' });

  // First account bootstraps the admin; there is no other way in yet.
  const role = users.all().length === 0 ? 'admin' : 'user';
  users.create({ email, password_hash: hashPassword(password), role, verified: 0, full_name: full_name || '' });
  const code = otp.issue(String(email).trim(), 'verify');
  res.status(201).json({ ok: true, otp_sent: true, dev_code: deliverCode(email, 'verify', code) });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otpCode } = req.body || {};
  if (!otp.verify(String(email || '').trim(), 'verify', otpCode)) {
    return res.status(400).json({ error: 'That code is incorrect or has expired' });
  }
  const row = users.byEmail(email);
  if (!row) return res.status(404).json({ error: 'Account not found' });
  users.update(row.id, { verified: true });
  res.json({ access_token: signToken(row), user: userToPublic(users.byId(row.id)) });
});

app.post('/api/auth/resend-otp', (req, res) => {
  const { email } = req.body || {};
  if (!users.byEmail(email)) return res.json({ ok: true }); // don't reveal who is registered
  const code = otp.issue(String(email).trim(), 'verify');
  res.json({ ok: true, dev_code: deliverCode(email, 'verify', code) });
});

app.post('/api/auth/reset-password-request', (req, res) => {
  const { email } = req.body || {};
  if (!users.byEmail(email)) return res.json({ ok: true });
  const code = otp.issue(String(email).trim(), 'reset');
  res.json({ ok: true, dev_code: deliverCode(email, 'reset', code) });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, resetToken, newPassword } = req.body || {};
  if (String(newPassword || '').length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!otp.verify(String(email || '').trim(), 'reset', resetToken)) {
    return res.status(400).json({ error: 'That reset code is incorrect or has expired' });
  }
  const row = users.byEmail(email);
  if (!row) return res.status(404).json({ error: 'Account not found' });
  users.update(row.id, { password_hash: hashPassword(newPassword) });
  res.json({ ok: true });
});

// --------------------------------------------------------------- functions --

app.post('/api/functions/:name', (req, res) => {
  const { name } = req.params;
  const fn = functions[name];
  if (!fn) return res.status(404).json({ error: `Unknown function: ${name}` });
  if (!publicFunctions.has(name) && !req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    res.json(fn(req.body || {}, req.user));
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Something went wrong' });
  }
});

// ----------------------------------------------------------------- uploads --

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${newId()}${path.extname(file.originalname || '').slice(0, 10)}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please choose an image file under 8MB.' });
  res.json({ file_url: `/api/files/${req.file.filename}` });
});

app.use('/api/files', express.static(UPLOAD_DIR, { maxAge: '7d' }));

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

// Runtime config the browser needs before it can render. Kept server-side so
// tiles can be repointed with an env var instead of a rebuild.
app.get('/api/config', (_req, res) => {
  res.json({
    tileUrl: process.env.KC_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttribution: process.env.KC_TILE_ATTRIBUTION || '&copy; OpenStreetMap contributors',
    geocoder: GEO_PROVIDER,
  });
});

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, users: users.all().length, providers: store.count('Provider') })
);

app.use((err, _req, res, _next) => {
  console.error('[api]', err);
  res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => console.log(`[klal-connect] API listening on http://localhost:${PORT}`));
