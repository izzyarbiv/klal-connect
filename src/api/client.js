// Klal API client.
//
// One object — entities / auth / functions / integrations — is the app's entire
// interface to the server. Components import `api` and never touch fetch, so
// auth headers, error shapes and the token live in exactly one place.
const TOKEN_KEY = 'kc_access_token';
const API = '/api';

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (token) => {
    try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
  },
};

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(method, path, { body, query, raw } = {}) {
  const url = new URL(API + path, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
  }

  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !raw) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) throw new ApiError(data?.error || res.statusText, res.status, data);
  return data;
}

// ------------------------------------------------------------ account gate --

// Visitors browse as a shared guest account. Anything that would write —
// posting, liking, connecting, saving, editing a profile — needs an account of
// their own. Components call api.auth.requireAccount() before such an action;
// for a guest it raises this event, which AccountRequiredModal (mounted once in
// AppLayout) turns into a "create an account" prompt. The server refuses guest
// writes regardless (KC_GUEST_READONLY), so this is the polite layer, not the
// enforcement.
export const ACCOUNT_REQUIRED_EVENT = 'kc:account-required';
export const promptForAccount = () => window.dispatchEvent(new CustomEvent(ACCOUNT_REQUIRED_EVENT));

// The last session the server described, so a gate does not need a round
// trip on every click. Refreshed by every me() call.
let lastMe = null;

// ---------------------------------------------------------------- entities --

// The 18 entities the app uses. Listed explicitly so a typo like
// `api.entities.Provdier` fails loudly instead of silently returning [].
const ENTITY_NAMES = [
  'Provider', 'Company', 'Category', 'Comment', 'CommunityNote', 'Connection',
  'ActivityEvent', 'FeedPost', 'FeedLike', 'Message', 'Notification', 'Setting',
  'SavedProvider', 'ProviderUsage', 'ClaimRequest', 'ListingChangeRequest',
  'ListingReport', 'PrivateReport', 'Vouch', 'CommentVote', 'User',
];

function entityApi(name) {
  const base = name === 'User' ? '/users' : `/entities/${name}`;
  return {
    list: (sort, limit) => request('GET', base, { query: { sort, limit } }),
    filter: (query, sort, limit) => request('GET', base, { query: { query, sort, limit } }),
    get: (id) => request('GET', `${base}/${id}`),
    create: (obj) => request('POST', base, { body: obj }),
    update: (id, obj) => request('PUT', `${base}/${id}`, { body: obj }),
    delete: (id) => request('DELETE', `${base}/${id}`),
    updateMany: (query, update) =>
      request('POST', `/entities/${name}/update-many`, { body: { query, update } }),

    // Polling stands in for realtime: pass a callback, get an unsubscribe
    // function back. Swapping in websockets later means changing only this.
    subscribe: (callback, intervalMs = 20000) => {
      const id = setInterval(() => { try { callback(); } catch { /* caller handles */ } }, intervalMs);
      return () => clearInterval(id);
    },
  };
}

const entities = Object.fromEntries(ENTITY_NAMES.map((name) => [name, entityApi(name)]));

// -------------------------------------------------------------------- auth --

const loginUrl = (returnTo) =>
  `/login${returnTo ? `?returnTo=${encodeURIComponent(toSamePath(returnTo))}` : ''}`;

// redirectToLogin is called with a full href in most places; the login page
// only accepts same-origin paths, so normalize before handing it over.
function toSamePath(target) {
  try {
    const url = new URL(target, window.location.origin);
    if (url.origin !== window.location.origin) return '/';
    return url.pathname + url.search;
  } catch {
    return '/';
  }
}

const auth = {
  async me() {
    lastMe = await request('GET', '/auth/me');
    return lastMe;
  },

  // True for a signed-in member with their own account — not the shared
  // guest session. Reads work for the guest; writes do not.
  async hasAccount() {
    if (!(await this.isAuthenticated())) return false;
    const me = lastMe || await this.me();
    return !me?.guest;
  },

  // Gate for anything that writes. Signed out → login page (and back here
  // afterwards); guest → the "create an account" prompt; member → true.
  async requireAccount() {
    if (!(await this.isAuthenticated())) { this.redirectToLogin(window.location.href); return false; }
    if (await this.hasAccount()) return true;
    promptForAccount();
    return false;
  },

  async isAuthenticated() {
    // No session yet: on a demo instance take the guest one.
    if (!tokenStore.get()) await adoptDemoSession();
    if (!tokenStore.get()) return false;
    try {
      await request('GET', '/auth/me');
      return true;
    } catch (err) {
      // A token that no longer resolves — the account it referenced is gone, or
      // it expired. Discard it and try for a guest session, otherwise a visitor
      // holding a stale token is stuck at the login wall forever: adoptDemoSession
      // refuses to replace an existing token, and nothing else clears it.
      if (err.status === 401 || err.status === 403) {
        tokenStore.set(null);
        if (await adoptDemoSession()) return true;
      }
      return false;
    }
  },

  async updateMe(patch) {
    return request('PUT', '/auth/me', { body: patch });
  },

  setToken(token) {
    tokenStore.set(token);
  },

  async loginViaEmailPassword(email, password) {
    const res = await request('POST', '/auth/login', { body: { email, password } });
    tokenStore.set(res.access_token);
    return res;
  },

  async register({ email, password, full_name }) {
    const res = await request('POST', '/auth/register', { body: { email, password, full_name } });
    // With no mail provider the server signs the new account in directly.
    if (res.access_token) tokenStore.set(res.access_token);
    return res;
  },

  async verifyOtp({ email, otpCode }) {
    const res = await request('POST', '/auth/verify-otp', { body: { email, otpCode } });
    if (res.access_token) tokenStore.set(res.access_token);
    return res;
  },

  async resendOtp(email) {
    return request('POST', '/auth/resend-otp', { body: { email } });
  },

  async resetPasswordRequest(email) {
    return request('POST', '/auth/reset-password-request', { body: { email } });
  },

  async resetPassword({ email, resetToken, newPassword }) {
    return request('POST', '/auth/reset-password', { body: { email, resetToken, newPassword } });
  },

  // Social sign-in is not configured yet; surface that instead of a dead button.
  loginWithProvider() {
    throw new ApiError('Google sign-in is not configured yet. Use email and password.', 501, null);
  },

  logout(redirectTo) {
    lastMe = null;
    tokenStore.set(null);
    window.location.href = redirectTo ? toSamePath(redirectTo) : '/';
  },

  redirectToLogin(returnTo) {
    window.location.href = loginUrl(returnTo || window.location.href);
  },
};

// --------------------------------------------------------------- functions --

// Callers check `r.status >= 400` and read `r.data.error`, so resolve on
// failure rather than throwing — that contract is load-bearing across the app.
const functionsApi = {
  async invoke(name, payload = {}) {
    try {
      const data = await request('POST', `/functions/${name}`, { body: payload });
      return { status: 200, data };
    } catch (err) {
      if (err instanceof ApiError) return { status: err.status, data: err.data || { error: err.message } };
      return { status: 500, data: { error: err.message || 'Network error' } };
    }
  },
};

// ---------------------------------------------------------------- geo --

// Geocoding goes through our server, never straight to a provider: the browser
// cannot set the User-Agent OSM requires, API keys must not ship to a client,
// and the user's coordinates should not be handed to a third party by their own
// browser. Shapes are normalized server-side, so swapping providers changes
// nothing here.
const geo = {
  reverse: (latitude, longitude) => request('GET', '/geo/reverse', { query: { lat: latitude, lon: longitude } }),
  search: (q, limit = 8) => request('GET', '/geo/search', { query: { q, limit } }),
  ip: () => request('GET', '/geo/ip'),
};

let configPromise = null;
// Cached for the page's lifetime — it is static per deployment.
const getConfig = () => (configPromise ??= request('GET', '/config').catch(() => ({})));

/**
 * On a demo instance, adopt the shared guest session so a visitor can browse the
 * signed-in parts of the app without hitting a login wall. Does nothing on a
 * real deployment, and never replaces an existing session.
 * @returns {Promise<boolean>} whether a demo session was adopted
 */
export async function adoptDemoSession() {
  if (tokenStore.get()) return false;
  const { demoMode } = await getConfig();
  if (!demoMode) return false;
  try {
    const res = await request('POST', '/auth/demo-session');
    if (!res?.access_token) return false;
    tokenStore.set(res.access_token);
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------ integrations --

const integrations = {
  Core: {
    async UploadFile({ file }) {
      const form = new FormData();
      form.append('file', file);
      return request('POST', '/upload', { body: form, raw: true });
    },
  },
};

export const api = { entities, auth, functions: functionsApi, integrations, geo, getConfig };
export { ApiError };
export default api;
