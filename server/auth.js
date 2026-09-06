// Email/password auth with JWT sessions.
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
export async function attachUser(req, _res, next) {
  try {
    const claims = verifyToken(tokenFromRequest(req));
    req.user = claims ? userToPublic(await users.byId(claims.sub)) : null;
    next();
  } catch (err) {
    next(err);
  }
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

// With no mail provider wired up, verification codes are logged and handed back
// to the caller so the flow can be completed locally.
//
// Fail safe: that only ever happens when explicitly opted in AND not in
// production. Returning a code to an unauthenticated caller in production would
// let anyone register under someone else's address and verify it themselves,
// so the dangerous case must require two positive signals, never a default.
const DEV_CODES = process.env.KC_EMAIL_DELIVERY === 'dev' && process.env.NODE_ENV !== 'production';

// Whether a verification or reset code can actually reach the person: either a
// real mail provider, or the local dev mode that hands the code back.
export const canDeliverCodes = () => process.env.KC_EMAIL_DELIVERY === 'real' || DEV_CODES;

export function deliverCode(email, purpose, code) {
  const expose = DEV_CODES;
  console.log(`[auth] ${purpose} code for ${email}: ${expose ? code : '(withheld)'}`);
  return expose ? code : undefined;
}

export { otp };
