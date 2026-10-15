// The auth routes never hand a verification or reset code to the caller
// unless local dev mode is switched on. Boots the app the way production does
// when no mail provider is configured (KC_EMAIL_DELIVERY unset, no
// RESEND_API_KEY) and checks the responses carry no dev_code key at all.
// Separate from api.test.mjs because delivery mode is fixed when auth.js loads.
process.env.KC_STORE = 'memory';
process.env.KC_DEMO_MODE = '1';
delete process.env.KC_EMAIL_DELIVERY;
delete process.env.RESEND_API_KEY;
delete process.env.KC_MAIL_FROM;
delete process.env.NODE_ENV;

const { default: app } = await import('./app.js');
const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
const API = `http://127.0.0.1:${server.address().port}/api`;

let fails = 0;
const ok = (cond, label, extra = '') => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && extra ? ' — ' + extra : ''}`); if (!cond) fails++; };
async function call(method, path, body) {
  const res = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}
const log = console.log; console.log = (...a) => { if (typeof a[0] === 'string' && /^\s*(ok {2}|FAIL)/.test(a[0])) log(...a); };
console.warn = () => {};

const email = `nodev-${Date.now()}@example.com`;
const reg = await call('POST', '/auth/register', { email, password: 'longenough1' });
ok(reg.status === 201, 'register succeeds without a mail provider', String(reg.status));
ok(!('dev_code' in (reg.data || {})), 'register response has no dev_code key', JSON.stringify(reg.data));
ok(!JSON.stringify(reg.data).includes('dev_code'), 'register response body never mentions dev_code');

const resend = await call('POST', '/auth/resend-otp', { email });
ok(resend.status === 200 && !('dev_code' in (resend.data || {})), 'resend-otp response has no dev_code key', JSON.stringify(resend.data));

const login = await call('POST', '/auth/login', { email, password: 'longenough1' });
ok(login.status === 200 && !('dev_code' in (login.data || {})), 'login response has no dev_code key', JSON.stringify(login.data));

// With nowhere to send a code, password reset must say so rather than
// pretend an email went out.
const reset = await call('POST', '/auth/reset-password-request', { email });
ok(reset.status === 503 && !('dev_code' in (reset.data || {})), 'reset request is 503 and carries no dev_code', JSON.stringify(reset.data));
ok(/contact/i.test(reset.data?.error || ''), 'the 503 tells the person how to get help', JSON.stringify(reset.data));

console.log = log;
server.close();
console.log(fails ? `\nno-dev-code checks: ${fails} FAILED` : '\nno-dev-code checks: all passed');
process.exit(fails ? 1 : 0);
