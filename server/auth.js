// Email/password auth with JWT sessions, replacing Base44's hosted auth.
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { users, userToPublic, otp } from './db.js';

const SECRET = process.env.KC_JWT_SECRET || 'kc-dev-secret-change-me';
const TOKEN_TTL = '30d';

if (!process.env.KC_JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[auth] KC_JWT_SECRET is not set — refusing to use the dev secret in production.');
  process.exit(1);
}

export const hashPassword = (pw) => bcrypt.hashSync(String(pw), 10);
export const checkPassword = (pw, hash) => !!hash && bcrypt.compareSync(String(pw), hash);

export const signToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: TOKEN_TTL });

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

function tokenFromRequest(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

// Populates req.user when a valid token is present; never rejects. Routes that
// require a session use requireAuth below.
export function attachUser(req, _res, next) {
  const claims = verifyToken(tokenFromRequest(req));
  req.user = claims ? userToPublic(users.byId(claims.sub)) : null;
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

// In dev there is no mail provider, so the code is logged and returned to the
// client. `KC_EMAIL_DELIVERY=real` flips this off once SMTP is wired up.
export function deliverCode(email, purpose, code) {
  const expose = process.env.KC_EMAIL_DELIVERY !== 'real';
  console.log(`[auth] ${purpose} code for ${email}: ${code}`);
  return expose ? code : undefined;
}

export { otp };
