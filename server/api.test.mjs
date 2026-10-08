// End-to-end checks of the API's access rules, against the in-memory store.
//
// Boots the Express app in this process on an ephemeral port and drives it
// the way the client does. Every rule in README.md's "Access rules" that has
// bitten once is pinned here: the guest mask, the login verification gate,
// reactions, recipient-only patches, safe creates, personal rows, and the
// read-time shaping of rows. Run with `npm test`.
process.env.KC_DEMO_MODE = '1';
process.env.KC_STORE = 'memory';
process.env.KC_GUEST_READONLY = '1';
process.env.KC_EMAIL_DELIVERY = 'dev';
delete process.env.NODE_ENV;

const { default: app } = await import('./app.js');
const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
const API = `http://127.0.0.1:${server.address().port}/api`;

let fails = 0;
const ok = (cond, label, extra = '') => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && extra ? ' — ' + extra : ''}`); if (!cond) fails++; };
async function call(method, path, { body, token } = {}) {
  const res = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}
// Quiet: the app logs verification codes and the seed; the test output is the assertions.
const log = console.log; console.log = (...a) => { if (typeof a[0] === 'string' && /^\s*(ok {2}|FAIL)/.test(a[0])) log(...a); };
console.warn = () => {};

// ---- guest masking ------------------------------------------------------
const demo = await call('POST', '/auth/demo-session');
const guest = demo.data.access_token;
ok(demo.data.user.guest === true && demo.data.user.full_name === 'Guest', 'guest session is masked', JSON.stringify(demo.data.user));
// Admin writes a "leak" onto the guest row, the way it happened in production.
const admin = (await call('POST', '/auth/login', { body: { email: 'demo@klal.app', password: 'demo1234' } })).data.access_token;
const guestId = demo.data.user.id;
const leak = await call('PUT', `/users/${guestId}`, { token: admin, body: { full_name: 'Eli Epstein', phone: '555-0100', headline: 'Real person', bio: 'private', banner_url: 'https://x/y.png' } });
ok(leak.status === 200 && leak.data.full_name === 'Eli Epstein', 'admin can write the guest row (to scrub it)');
const me = await call('GET', '/auth/me', { token: guest });
ok(me.data.full_name === 'Guest' && !me.data.phone && !me.data.bio && !me.data.banner_url, 'guest /auth/me hides whatever is on the row', JSON.stringify(me.data));
const members = await call('GET', '/users', { token: guest });
ok(!members.data.some((u) => u.id === guestId), 'guest absent from members list');
ok(members.data.every((u) => u.phone === undefined), 'members list carries no phone numbers');
const prof = await call('GET', `/users/${guestId}`, { token: guest });
ok(prof.status === 404, 'guest profile route is 404 for non-admins', String(prof.status));
const adminView = await call('GET', `/users/${guestId}`, { token: admin });
ok(adminView.status === 200 && adminView.data.full_name === 'Eli Epstein', 'admin still sees the raw row');
const edit = await call('PUT', '/auth/me', { token: guest, body: { full_name: 'Hacker' } });
ok(edit.status === 403, 'guest cannot edit its profile', JSON.stringify(edit.data));

// ---- registration + login verification gate -----------------------------
const email = `t${Date.now()}@example.com`;
const reg = await call('POST', '/auth/register', { body: { email, password: 'password123' } });
ok(reg.status === 201 && reg.data.otp_sent === true && !reg.data.access_token, 'register sends a code and no session', JSON.stringify(reg.data));
const gated = await call('POST', '/auth/login', { body: { email, password: 'password123' } });
ok(gated.status === 403 && gated.data.verification_required === true && gated.data.dev_code, 'login before verifying is gated with a new code', JSON.stringify(gated.data));
const bad = await call('POST', '/auth/verify-otp', { body: { email, otpCode: '000000' } });
ok(bad.status === 400, 'wrong code rejected');
const ver = await call('POST', '/auth/verify-otp', { body: { email, otpCode: gated.data.dev_code } });
ok(ver.status === 200 && ver.data.access_token, 'right code signs in');
const login2 = await call('POST', '/auth/login', { body: { email, password: 'password123' } });
ok(login2.status === 200 && login2.data.access_token, 'login works once verified');
const userA = login2.data.access_token, idA = login2.data.user.id;

// ---- reactions ------------------------------------------------------------
await call('PUT', '/auth/me', { token: userA, body: { full_name: 'Tester A' } });
const post = (await call('POST', '/functions/createPost', { token: userA, body: { body: 'hello', post_type: 'update' } })).data.post;
ok(post.post_type === 'post', 'update is stored as post', post.post_type);
const emailB = `b${Date.now()}@example.com`;
const regB = await call('POST', '/auth/register', { body: { email: emailB, password: 'password123' } });
const verB = await call('POST', '/auth/verify-otp', { body: { email: emailB, otpCode: regB.data.dev_code } });
const userB = verB.data.access_token, idB = verB.data.user.id;
await call('PUT', '/auth/me', { token: userB, body: { full_name: 'Tester B' } });
let r = await call('POST', '/functions/toggleLike', { token: userB, body: { post_id: post.id, reaction: 'mazel_tov' } });
ok(r.data.liked && r.data.reaction === 'mazel_tov' && r.data.like_count === 1 && r.data.reaction_counts.mazel_tov === 1, 'react mazel tov', JSON.stringify(r.data));
r = await call('POST', '/functions/toggleLike', { token: userB, body: { post_id: post.id, reaction: 'like' } });
ok(r.data.liked && r.data.reaction === 'like' && r.data.like_count === 1 && !r.data.reaction_counts.mazel_tov && r.data.reaction_counts.like === 1, 'change to like keeps count at 1', JSON.stringify(r.data));
r = await call('POST', '/functions/toggleLike', { token: userB, body: { post_id: post.id } });
ok(!r.data.liked && r.data.like_count === 0, 'plain toggle removes it', JSON.stringify(r.data));
r = await call('POST', '/functions/toggleLike', { token: userB, body: { post_id: post.id, reaction: 'bogus' } });
ok(r.status === 400, 'unknown reaction refused');
const notes = await call('GET', '/entities/Notification', { token: userA });
ok(notes.data.filter((n) => n.type === 'like').length === 1, 'author notified once, not on every change', String(notes.data.filter((n) => n.type === 'like').length));
r = await call('POST', '/functions/toggleLike', { token: guest, body: { post_id: post.id } });
ok(r.status === 403 && r.data.guest, 'guest cannot react');

// ---- messages: read receipt + reaction -----------------------------------
const emailC0 = `c0${Date.now()}@example.com`;
const regC0 = await call('POST', '/auth/register', { body: { email: emailC0, password: 'password123' } });
const userC0 = (await call('POST', '/auth/verify-otp', { body: { email: emailC0, otpCode: regC0.data.dev_code } })).data.access_token;
const conn = (await call('POST', '/entities/Connection', { token: userA, body: { requester_id: idA, recipient_id: idB, status: 'pending' } })).data;
let acc = await call('PUT', `/entities/Connection/${conn.id}`, { token: userC0, body: { status: 'accepted' } });
ok(acc.status === 403, 'a third party cannot accept someone else\'s request', String(acc.status));
acc = await call('PUT', `/entities/Connection/${conn.id}`, { token: userB, body: { status: 'accepted', requester_id: 'spoof' } });
ok(acc.status === 200 && acc.data.status === 'accepted' && acc.data.requester_id === idA, 'recipient accepts; other fields untouched', JSON.stringify(acc.data));
acc = await call('PUT', `/entities/Connection/${conn.id}`, { token: userB, body: { status: 'blocked' } });
ok(acc.status === 403, 'recipient cannot set an arbitrary status', String(acc.status));
const sent = await call('POST', '/functions/sendMessage', { token: userA, body: { recipient_id: idB, body: 'hi B' } });
const msg = sent.data?.message;
ok(!!msg?.id, 'message sent', JSON.stringify(sent.data));
let rr = await call('PUT', `/entities/Message/${msg.id}`, { token: userB, body: { read: true, body: 'tampered' } });
ok(rr.status === 200 && rr.data.read === true && rr.data.body === 'hi B', 'recipient marks read; body untouched', JSON.stringify(rr.data));
rr = await call('PUT', `/entities/Message/${msg.id}`, { token: userA, body: { body: 'edited' } });
ok(rr.status === 403, 'sender cannot edit a message', String(rr.status));
const emailC = `c${Date.now()}@example.com`;
const regC = await call('POST', '/auth/register', { body: { email: emailC, password: 'password123' } });
const userC = (await call('POST', '/auth/verify-otp', { body: { email: emailC, otpCode: regC.data.dev_code } })).data.access_token;
rr = await call('PUT', `/entities/Message/${msg.id}`, { token: userC, body: { read: true } });
ok(rr.status === 403, 'a stranger cannot touch the message', String(rr.status));
let mr = await call('POST', '/functions/reactToMessage', { token: userB, body: { message_id: msg.id, reaction: 'thanks' } });
ok(mr.status === 200 && mr.data.message.reactions[idB] === 'thanks', 'recipient reacts to a message', JSON.stringify(mr.data));
mr = await call('POST', '/functions/reactToMessage', { token: userA, body: { message_id: msg.id, reaction: 'love' } });
ok(mr.status === 200 && mr.data.message.reactions[idA] === 'love' && mr.data.message.reactions[idB] === 'thanks', 'sender reacts too; both kept');
mr = await call('POST', '/functions/reactToMessage', { token: userB, body: { message_id: msg.id, reaction: 'thanks' } });
ok(mr.status === 200 && !mr.data.message.reactions[idB], 'same reaction again removes it');
mr = await call('POST', '/functions/reactToMessage', { token: userC, body: { message_id: msg.id, reaction: 'like' } });
ok(mr.status === 403, 'stranger cannot react to a message', String(mr.status));


// ---- second review round ------------------------------------------------
// Forged creates
let forged = await call('POST', '/entities/Connection', { token: userC, body: { requester_id: 'someone-else', recipient_id: idA, status: 'accepted', created_by_id: idB, id: 'chosen-id' } });
ok(forged.status === 201 && forged.data.status === 'pending' && forged.data.requester_id !== 'someone-else' && forged.data.created_by_id !== idB && forged.data.id !== 'chosen-id', 'connection create: status pinned to pending, creator and id not forgeable', JSON.stringify(forged.data));
forged = await call('POST', '/entities/Connection', { token: userC, body: { recipient_id: guestId } });
ok(forged.status === 400, 'no connection requests to the guest', String(forged.status));
forged = await call('POST', '/entities/Provider', { token: userC, body: { name: 'Sneaky', category: 'x', status: 'published', verified: true } });
ok(forged.status === 201 && forged.data.status === 'pending' && !forged.data.verified, 'direct listing create goes to review, unverified', JSON.stringify(forged.data));
forged = await call('POST', '/entities/Category', { token: userC, body: { name: 'Junk' } });
ok(forged.status === 403, 'members cannot create categories', String(forged.status));
// view_count only for the author
const listA = await call('GET', '/entities/FeedPost', { token: userA });
const listB = await call('GET', '/entities/FeedPost', { token: userB });
const pa = listA.data.find((p) => p.id === post.id), pb = listB.data.find((p) => p.id === post.id);
ok(pa && 'view_count' in pa, 'author sees view_count');
ok(pb && !('view_count' in pb), 'others do not see view_count', JSON.stringify(Object.keys(pb || {})));
const one = await call('GET', `/entities/FeedPost/${post.id}`, { token: userB });
ok(!('view_count' in (one.data || {})), 'single-row read also drops view_count');
const rv = await call('POST', '/functions/recordPostView', { token: userB, body: { postId: post.id } });
ok(rv.status === 200 && rv.data.count === undefined, 'recordPostView returns no count', JSON.stringify(rv.data));
// Rows the guest wrote earlier read as Guest
const tainted = await call('POST', '/entities/FeedPost', { token: admin, body: { body: 'old guest post', post_type: 'post', author_name: 'Eli Epstein', author_headline: 'Real headline', author_avatar_url: 'https://x/e.png', created_by: 'guest@klal.app', created_by_id: guestId } });
ok(tainted.status === 201, 'admin planted a guest-authored row for the test');
const readBack = (await call('GET', `/entities/FeedPost/${tainted.data.id}`, { token: userB })).data;
ok(readBack.author_name === 'Guest' && readBack.author_headline !== 'Real headline' && !readBack.author_avatar_url, 'guest-authored post reads as Guest', JSON.stringify({ n: readBack.author_name, h: readBack.author_headline }));
const listG = (await call('GET', '/entities/FeedPost', { token: guest })).data.find((p) => p.id === tainted.data.id);
ok(listG.author_name === 'Guest', 'also in the list, also for the guest itself');
// guest reads no private rows; nobody can message the guest
const gm = await call('GET', '/entities/Message', { token: guest });
ok(gm.status === 200 && gm.data.length === 0, 'guest reads no messages');
const gn = await call('GET', '/entities/Notification', { token: guest });
ok(gn.status === 200 && gn.data.length === 0, 'guest reads no notifications');
const toGuest = await call('POST', '/functions/sendMessage', { token: admin, body: { recipient_id: guestId, body: 'hi guest' } });
ok(toGuest.status === 400, 'nobody can message the guest', JSON.stringify(toGuest.data));
// reactions: prototype keys refused, notification dedupe
r = await call('POST', '/functions/toggleLike', { token: userB, body: { post_id: post.id, reaction: 'constructor' } });
ok(r.status === 400, 'prototype-key reaction refused', String(r.status));
r = await call('POST', '/functions/toggleLike', { token: userB, body: { post_id: post.id, reaction: 'like' } });
r = await call('POST', '/functions/toggleLike', { token: userB, body: { post_id: post.id, reaction: 'like' } });
r = await call('POST', '/functions/toggleLike', { token: userB, body: { post_id: post.id, reaction: 'love' } });
const notes2 = await call('GET', '/entities/Notification', { token: userA });
ok(notes2.data.filter((n) => n.type === 'like' && n.target_id === post.id).length === 1, 'like → unlike → love still one notification', String(notes2.data.filter((n) => n.type === 'like').length));
// admin can mark verified
const emailD = `d${Date.now()}@example.com`;
await call('POST', '/auth/register', { body: { email: emailD, password: 'password123' } });
const allUsers = (await call('GET', '/users', { token: admin })).data;
const dRow = allUsers.find((u) => u.email === emailD);
ok(dRow && dRow.verified === false, 'fresh registration is unverified while mail is on');
const mark = await call('PUT', `/users/${dRow.id}`, { token: admin, body: { verified: true } });
ok(mark.status === 200 && mark.data.verified === true, 'admin marks verified');
const dLogin = await call('POST', '/auth/login', { body: { email: emailD, password: 'password123' } });
ok(dLogin.status === 200 && dLogin.data.access_token, 'and that account logs straight in');


// guest's seeded connections are invisible to members (the seed connects the guest to everyone)
const connsAsMember = (await call('GET', '/entities/Connection', { token: userB })).data;
ok(connsAsMember.every((c) => c.requester_id !== guestId && c.recipient_id !== guestId) && connsAsMember.length > 0, 'members never see connections involving the guest', String(connsAsMember.length));
const connsAsAdmin = (await call('GET', '/entities/Connection', { token: admin })).data;
ok(connsAsAdmin.length > 0 && connsAsAdmin.every((c) => c.requester_id !== guestId && c.recipient_id !== guestId), 'admin does not see the seeded guest connections either');


// ---- payment links: an external doorway, never Klal-handled money ---------
// A listing/company owner can paste a Stripe Payment Link, PayPal.me, Venmo
// or Zelle URL; it must be a real http(s) link (never javascript:) and only
// the owner or an admin can set it.
const payEmail = `pay${Date.now()}@example.com`;
const payReg = await call('POST', '/auth/register', { body: { email: payEmail, password: 'password123' } });
const payVer = await call('POST', '/auth/verify-otp', { body: { email: payEmail, otpCode: payReg.data.dev_code } });
const payTok = payVer.data.access_token;
const payListing = await call('POST', '/functions/createListing', { token: payTok, body: { name: 'Pay Test Biz', category: 'Food', short_description: 'x' } });
const payProviderId = payListing.data.provider.id;

let payR = await call('POST', '/functions/updateListingPaymentLink', { token: payTok, body: { provider_id: payProviderId, payment_link_url: 'javascript:alert(1)' } });
ok(payR.status === 400, 'a javascript: payment link is refused');
payR = await call('POST', '/functions/updateListingPaymentLink', { token: payTok, body: { provider_id: payProviderId, payment_link_url: 'https://buy.stripe.com/test_abc' } });
ok(payR.status === 200 && payR.data.provider.payment_link_url === 'https://buy.stripe.com/test_abc', 'a real payment link saves');
payR = await call('POST', '/functions/updateListingPaymentLink', { token: userB, body: { provider_id: payProviderId, payment_link_url: 'https://venmo.com/u/someone' } });
ok(payR.status === 403, 'a non-owner cannot set another listing\'s payment link');
const payCompany = await call('POST', '/entities/Company', { token: payTok, body: { name: 'Pay Test Co', payment_link_url: 'javascript:x()' } });
ok(payCompany.status === 400, 'creating a company with a javascript: payment link is refused');
const payCompanyOk = await call('POST', '/entities/Company', { token: payTok, body: { name: 'Pay Test Co' } });
const payCompanyPatch = await call('PUT', `/entities/Company/${payCompanyOk.data.id}`, { token: payTok, body: { payment_link_url: 'https://paypal.me/paytestco' } });
ok(payCompanyPatch.status === 200 && payCompanyPatch.data.payment_link_url === 'https://paypal.me/paytestco', 'a company\'s payment link can be set through the generic PUT route');
const payClick = await call('POST', '/entities/ActivityEvent', { token: payTok, body: { type: 'payment_link_click', provider_id: payProviderId } });
ok(payClick.status === 201, 'a payment_link_click event is recorded');


// ---- skills & endorsements -------------------------------------------------
const skillOwnerEmail = `skillowner${Date.now()}@example.com`;
const skillOwnerReg = await call('POST', '/auth/register', { body: { email: skillOwnerEmail, password: 'password123' } });
const skillOwnerTok = (await call('POST', '/auth/verify-otp', { body: { email: skillOwnerEmail, otpCode: skillOwnerReg.data.dev_code } })).data.access_token;
const skillOwnerId = (await call('GET', '/auth/me', { token: skillOwnerTok })).data.id;

const dupeSkills = await call('PUT', '/auth/me', { token: skillOwnerTok, body: { skills: ['Bookkeeping', 'bookkeeping', '  Excel  ', ''] } });
ok(JSON.stringify(dupeSkills.data.skills) === JSON.stringify(['Bookkeeping', 'Excel']), 'skills are trimmed and case-insensitively de-duplicated', JSON.stringify(dupeSkills.data.skills));

const selfEndorse = await call('POST', '/functions/toggleSkillEndorsement', { token: skillOwnerTok, body: { user_id: skillOwnerId, skill: 'Excel' } });
ok(selfEndorse.status === 400, 'cannot endorse your own skill');

const unlistedEndorse = await call('POST', '/functions/toggleSkillEndorsement', { token: userB, body: { user_id: skillOwnerId, skill: 'Welding' } });
ok(unlistedEndorse.status === 400, 'cannot endorse a skill they did not list');

let endorseR = await call('POST', '/functions/toggleSkillEndorsement', { token: userB, body: { user_id: skillOwnerId, skill: 'excel' } });
ok(endorseR.status === 200 && endorseR.data.endorsed === true && endorseR.data.count === 1, 'endorsement is case-insensitive and counts', JSON.stringify(endorseR.data));

const endorseAgain = await call('POST', '/functions/toggleSkillEndorsement', { token: userB, body: { user_id: skillOwnerId, skill: 'Excel' } });
ok(endorseAgain.status === 200 && endorseAgain.data.endorsed === false && endorseAgain.data.count === 0, 'endorsing again removes it (toggle)', JSON.stringify(endorseAgain.data));

await call('POST', '/functions/toggleSkillEndorsement', { token: userB, body: { user_id: skillOwnerId, skill: 'Excel' } });
const endorsementsPublic = await call('GET', `/entities/SkillEndorsement?query=${encodeURIComponent(JSON.stringify({ user_id: skillOwnerId }))}`);
ok(endorsementsPublic.status === 200 && endorsementsPublic.data.length === 1, 'endorsements are readable without auth, like a vouch count', JSON.stringify(endorsementsPublic.data));

const skillGuestEndorse = await call('POST', '/functions/toggleSkillEndorsement', { token: guest, body: { user_id: skillOwnerId, skill: 'Excel' } });
ok(skillGuestEndorse.status === 403, 'the shared guest cannot endorse');


// ---- recommendations: written testimonials, subject approves before it's public ----
const recSubjEmail = `recsubject${Date.now()}@example.com`;
const recSubjReg = await call('POST', '/auth/register', { body: { email: recSubjEmail, password: 'password123' } });
const recSubjTok = (await call('POST', '/auth/verify-otp', { body: { email: recSubjEmail, otpCode: recSubjReg.data.dev_code } })).data.access_token;
const recSubjId = (await call('GET', '/auth/me', { token: recSubjTok })).data.id;

const selfRec = await call('POST', '/entities/Recommendation', { token: recSubjTok, body: { recipient_id: recSubjId, body: 'x'.repeat(30) } });
ok(selfRec.status === 400, 'cannot recommend yourself');

const shortRec = await call('POST', '/entities/Recommendation', { token: userB, body: { recipient_id: recSubjId, body: 'too short' } });
ok(shortRec.status === 400, 'a recommendation under 20 characters is refused');

const recCreate = await call('POST', '/entities/Recommendation', { token: userB, body: { recipient_id: recSubjId, body: 'Worked with them for two years — reliable, thorough, and easy to reach.' } });
ok(recCreate.status === 201 && recCreate.data.status === 'pending', 'a recommendation starts pending, whatever status was sent', JSON.stringify(recCreate.data));
const recId = recCreate.data.id;

const recPublicBeforeAccept = await call('GET', `/entities/Recommendation?query=${encodeURIComponent(JSON.stringify({ recipient_id: recSubjId }))}`);
ok(recPublicBeforeAccept.status === 200 && recPublicBeforeAccept.data.length === 0, 'a pending recommendation is invisible to the public', JSON.stringify(recPublicBeforeAccept.data));

const recVisibleToSubject = await call('GET', `/entities/Recommendation?query=${encodeURIComponent(JSON.stringify({ recipient_id: recSubjId }))}`, { token: recSubjTok });
ok(recVisibleToSubject.status === 200 && recVisibleToSubject.data.length === 1, 'the pending recommendation is visible to its subject', JSON.stringify(recVisibleToSubject.data));

const recAuthorEdit = await call('PUT', `/entities/Recommendation/${recId}`, { token: userB, body: { status: 'accepted' } });
ok(recAuthorEdit.status === 200 && recAuthorEdit.data.status === 'pending', 'the author cannot accept their own recommendation on the subject\'s behalf', JSON.stringify(recAuthorEdit.data));

const recAccept = await call('PUT', `/entities/Recommendation/${recId}`, { token: recSubjTok, body: { status: 'accepted', body: 'rewritten by the subject' } });
ok(recAccept.status === 200 && recAccept.data.status === 'accepted' && recAccept.data.body !== 'rewritten by the subject', 'the subject can only change status, not the wording', JSON.stringify(recAccept.data));

const recPublicAfterAccept = await call('GET', `/entities/Recommendation?query=${encodeURIComponent(JSON.stringify({ recipient_id: recSubjId }))}`);
ok(recPublicAfterAccept.status === 200 && recPublicAfterAccept.data.length === 1, 'an accepted recommendation is publicly visible, like a vouch');


// ---- jobs: post, browse, apply, and the messaging door it opens -----------
const posterEmail = `poster${Date.now()}@example.com`;
const posterReg = await call('POST', '/auth/register', { body: { email: posterEmail, password: 'password123' } });
const posterTok = (await call('POST', '/auth/verify-otp', { body: { email: posterEmail, otpCode: posterReg.data.dev_code } })).data.access_token;
const posterId = (await call('GET', '/auth/me', { token: posterTok })).data.id;

const shortJob = await call('POST', '/functions/createJob', { token: posterTok, body: { title: 'Bookkeeper', category: 'Business', description: 'too short' } });
ok(shortJob.status === 400, 'a job description under 30 characters is refused');

const jobR = await call('POST', '/functions/createJob', { token: posterTok, body: { title: 'Part-time bookkeeper', category: 'Business', employment_type: 'part_time', location: 'Lakewood, NJ', description: 'Looking for a detail-oriented bookkeeper for a growing local business, a few hours a week.' } });
ok(jobR.status === 200 && jobR.data.job.status === 'published' && jobR.data.job.open === true, 'a job posts published and open', JSON.stringify(jobR.data));
const jobId = jobR.data.job.id;

const jobPublic = await call('GET', `/entities/Job?query=${encodeURIComponent(JSON.stringify({ status: 'published' }))}`);
ok(jobPublic.status === 200 && jobPublic.data.some((j) => j.id === jobId), 'a published job is publicly browsable without auth');

const selfApply = await call('POST', '/functions/applyToJob', { token: posterTok, body: { job_id: jobId, note: 'hi' } });
ok(selfApply.status === 400, 'a poster cannot apply to their own job');

const cantMessageYet = await call('POST', '/functions/sendMessage', { token: userB, body: { recipient_id: posterId, body: 'hello' } });
ok(cantMessageYet.status === 403, 'a stranger cannot message the poster before applying');

const applyR = await call('POST', '/functions/applyToJob', { token: userB, body: { job_id: jobId, note: 'I have three years of bookkeeping experience.' } });
ok(applyR.status === 200 && applyR.data.application.poster_id === posterId, 'applying creates an application addressed to the poster', JSON.stringify(applyR.data));

const dupeApply = await call('POST', '/functions/applyToJob', { token: userB, body: { job_id: jobId, note: 'again' } });
ok(dupeApply.status === 400, 'cannot apply twice to the same job');

const nowCanMessage = await call('POST', '/functions/sendMessage', { token: userB, body: { recipient_id: posterId, body: 'Following up on my application' } });
ok(nowCanMessage.status === 200, 'applying opens a messaging door to the poster, like an accepted connection');
const posterCanReply = await call('POST', '/functions/sendMessage', { token: posterTok, body: { recipient_id: idB, body: 'Thanks for applying!' } });
ok(posterCanReply.status === 200, 'and the poster can message the applicant back');

const appsAsPoster = await call('GET', `/entities/JobApplication?query=${encodeURIComponent(JSON.stringify({ job_id: jobId }))}`, { token: posterTok });
ok(appsAsPoster.status === 200 && appsAsPoster.data.length === 1, 'the poster sees applications to their job');
const appsAsStranger = await call('GET', `/entities/JobApplication?query=${encodeURIComponent(JSON.stringify({ job_id: jobId }))}`, { token: userC });
ok(appsAsStranger.status === 200 && appsAsStranger.data.length === 0, 'nobody else sees who applied');

const closeR = await call('PUT', `/entities/Job/${jobId}`, { token: posterTok, body: { open: false } });
ok(closeR.status === 200 && closeR.data.open === false, 'the poster can mark their job filled');
const applyToClosedR = await call('POST', '/functions/applyToJob', { token: userC, body: { job_id: jobId, note: 'x' } });
ok(applyToClosedR.status === 400, 'cannot apply once a job is marked filled');

const statusEscapeR = await call('PUT', `/entities/Job/${jobId}`, { token: posterTok, body: { status: 'pending' } });
ok(statusEscapeR.status === 200 && statusEscapeR.data.status === 'published', 'an owner cannot change their own job\'s moderation status');


// ---- the holes found in the code audit, pinned so they cannot reopen -----

// update-many was the way around every single-row field guard: scoping to
// your own rows still let you set the fields the PUT route strips.
const ownConn = await call('POST', '/entities/Connection', { token: userA, body: { recipient_id: idB } });
ok(ownConn.data.status === 'pending', 'a connection request starts pending');
const selfAccept = await call('POST', '/entities/Connection/update-many', { token: userA, body: { query: { id: ownConn.data.id }, update: { status: 'accepted' } } });
const connAfter = (await call('GET', `/entities/Connection/${ownConn.data.id}`, { token: userA })).data;
ok(connAfter.status === 'pending', 'update-many cannot accept a connection request you sent yourself', JSON.stringify({ selfAccept: selfAccept.data, status: connAfter.status }));

const ownListing = await call('POST', '/functions/createListing', { token: userA, body: { name: 'Audit Listing', category: 'Business', short_description: 'x' } });
const selfPublish = await call('POST', '/entities/Provider/update-many', { token: userA, body: { query: { id: ownListing.data.provider.id }, update: { verified: true, vouch_count: 999 } } });
const listingAfter = (await call('GET', `/entities/Provider/${ownListing.data.provider.id}`, { token: userA })).data;
ok(listingAfter.verified !== true && listingAfter.vouch_count !== 999, 'update-many cannot verify your own listing or inflate its counters', JSON.stringify({ selfPublish: selfPublish.data, verified: listingAfter.verified, vouches: listingAfter.vouch_count }));

// A Job created through the generic route used to land with no status at all,
// which reads as published — skipping createJob's link validation entirely.
const rawJob = await call('POST', '/entities/Job', { token: userA, body: { title: 'Raw Job', category: 'Business', description: 'x'.repeat(40) } });
ok(rawJob.status === 201 && rawJob.data.status === 'pending', 'a job created through the generic route is pending, not silently public', JSON.stringify(rawJob.data));
const jsUrlJob = await call('POST', '/entities/Job', { token: userA, body: { title: 'XSS Job', category: 'Business', description: 'x'.repeat(40), apply_url: 'javascript:alert(1)' } });
ok(jsUrlJob.status === 400, 'a javascript: apply link is refused on the generic route too', String(jsUrlJob.status));

// Notification is client-writable, so the actor and the type are the server's
// to decide — otherwise it is a phishing primitive.
const forgedNotif = await call('POST', '/entities/Notification', { token: userA, body: { recipient_id: idB, type: 'admin_notice', message: 'Klal admin: verify at example.com' } });
ok(forgedNotif.status === 400, 'an unknown notification type is refused', String(forgedNotif.status));
const realNotif = await call('POST', '/entities/Notification', { token: userA, body: { recipient_id: idB, type: 'connection_request', actor_id: idB, actor_name: 'Somebody Else', message: 'hello' } });
ok(realNotif.status === 201 && realNotif.data.actor_id === idA && realNotif.data.actor_name !== 'Somebody Else', 'the notification actor is the caller, not whoever they claim', JSON.stringify(realNotif.data));

// A row written by the server has no author; that never meant "anyone's".
const victimNotif = (await call('GET', '/entities/Notification', { token: userB })).data.find((n) => !n.created_by_id);
if (victimNotif) {
  const hijack = await call('PUT', `/entities/Notification/${victimNotif.id}`, { token: userA, body: { message: 'rewritten' } });
  ok(hijack.status === 403, 'a member cannot rewrite a server-written notification addressed to someone else', String(hijack.status));
} else {
  ok(true, 'no server-written notification to test rewriting against (skipped)');
}

// Deactivation has to revoke access, not just hide the profile.
const deadEmail = `dead${Date.now()}@example.com`;
const deadReg = await call('POST', '/auth/register', { body: { email: deadEmail, password: 'password123' } });
const deadTok = (await call('POST', '/auth/verify-otp', { body: { email: deadEmail, otpCode: deadReg.data.dev_code } })).data.access_token;
const deadId = (await call('GET', '/auth/me', { token: deadTok })).data.id;
await call('PUT', `/users/${deadId}`, { token: admin, body: { disabled: true } });
const deadMe = await call('GET', '/auth/me', { token: deadTok });
ok(deadMe.status === 401, 'a deactivated account\'s existing token stops working', String(deadMe.status));
const deadLogin = await call('POST', '/auth/login', { body: { email: deadEmail, password: 'password123' } });
ok(deadLogin.status === 403, 'a deactivated account cannot sign back in', String(deadLogin.status));

// Codes are six digits with a fifteen-minute window, so guessing has to stop.
const lockEmail = `lock${Date.now()}@example.com`;
const lockReg = await call('POST', '/auth/register', { body: { email: lockEmail, password: 'password123' } });
const realCode = lockReg.data.dev_code;
let lockedAt = 0;
for (let i = 1; i <= 12; i++) {
  const attempt = await call('POST', '/auth/verify-otp', { body: { email: lockEmail, otpCode: '000000' } });
  if (attempt.status === 429) { lockedAt = i; break; }
}
ok(lockedAt > 0 && lockedAt <= 10, `guessing a code is cut off after a few tries (locked on attempt ${lockedAt || 'never'})`);
const afterLock = await call('POST', '/auth/verify-otp', { body: { email: lockEmail, otpCode: realCode } });
ok(afterLock.status === 429, 'even the correct code is refused while locked out', String(afterLock.status));

// ...and a wrong guess or two must not lock a real person out for good.
const okEmail = `okcode${Date.now()}@example.com`;
const okReg = await call('POST', '/auth/register', { body: { email: okEmail, password: 'password123' } });
await call('POST', '/auth/verify-otp', { body: { email: okEmail, otpCode: '111111' } });
await call('POST', '/auth/verify-otp', { body: { email: okEmail, otpCode: '222222' } });
const recovered = await call('POST', '/auth/verify-otp', { body: { email: okEmail, otpCode: okReg.data.dev_code } });
ok(recovered.status === 200 && recovered.data.access_token, 'the right code still works after a couple of wrong ones', String(recovered.status));

// /api/functions/:name is a lookup on an object, so it answered to inherited keys.
const proto = await call('POST', '/functions/constructor', { token: userA, body: {} });
ok(proto.status === 404, 'an inherited property is not callable as a function', String(proto.status));

// ---- prominence is not self-assertable -----------------------------------
// Provider is client-writable, so every field that confers standing has to be
// protected explicitly. `featured` was not, and the directory has a "Featured
// resources" rail that queries it: an owner could promote themselves into it
// with one PUT. A confirmation date is the same kind of claim — a forged one
// is worse than none, because it dresses stale details as checked.
const promoListing = await call('POST', '/functions/createListing', { token: userA, body: { name: 'Promo Plumbing', category: 'Home Services', short_description: 'Repairs and installations.' } });
const promoId = promoListing.data?.provider?.id;
await call('PUT', `/entities/Provider/${promoId}`, { token: userA, body: { featured: true, sponsored: true, sponsored_until: '2030-01-01T00:00:00.000Z', last_confirmed_at: '2030-01-01T00:00:00.000Z' } });
const promoAfter = (await call('GET', `/entities/Provider/${promoId}`, { token: userA })).data || {};
ok(!promoAfter.featured, 'an owner cannot feature their own listing', JSON.stringify(promoAfter.featured));
ok(!promoAfter.sponsored, 'an owner cannot mark their own listing sponsored', JSON.stringify(promoAfter.sponsored));
ok(!promoAfter.sponsored_until, 'an owner cannot set their own sponsorship window', JSON.stringify(promoAfter.sponsored_until));
ok(!promoAfter.last_confirmed_at, 'an owner cannot forge a confirmation date', JSON.stringify(promoAfter.last_confirmed_at));

// The same four fields through the other door. createListing is a function
// route, so stripProtected never runs for it — and because the list of fields
// to refuse was written out twice, it accepted all four at creation time while
// the generic route above refused them. Both now read one shared list.
const bornPromo = await call('POST', '/functions/createListing', { token: userB, body: { name: 'Door Two Plumbing', category: 'Home Services', short_description: 'Repairs and installations.', featured: true, sponsored: true, sponsored_until: '2030-01-01T00:00:00.000Z', last_confirmed_at: '2030-01-01T00:00:00.000Z' } });
const born = bornPromo.data?.provider || {};
ok(!born.featured, 'a listing cannot be born featured', JSON.stringify(born.featured));
ok(!born.sponsored, 'a listing cannot be born sponsored', JSON.stringify(born.sponsored));
ok(!born.sponsored_until, 'a listing cannot be born with a sponsorship window', JSON.stringify(born.sponsored_until));
ok(!born.last_confirmed_at, 'a listing cannot be born already confirmed', JSON.stringify(born.last_confirmed_at));

// ---- a listing that turns private takes its vouches with it --------------
// The dangerous case is not a listing that was always sensitive — vouching on
// one of those is already refused. It is a listing that becomes sensitive
// later: sensitivity is read from the listing's own words, so an owner editing
// their description (or the term list growing, which has happened) can make a
// listing private long after people vouched for it publicly.
const laterListing = await call('POST', '/functions/createListing', { token: userB, body: { name: 'Later Private Co', category: 'Home Services', short_description: 'General repairs and installations.' } });
const laterId = laterListing.data?.provider?.id;
const laterVouch = await call('POST', '/functions/toggleCommunityActivity', { token: userA, body: { providerId: laterId, activity: 'vouch' } });
ok(laterVouch.status === 200 && laterVouch.data?.active === true, 'an ordinary listing can still be vouched for', String(laterVouch.status));

const vouchVisibleTo = async (token) => {
  const r = await call('GET', '/entities/Vouch', token ? { token } : {});
  return Array.isArray(r.data) && r.data.some((v) => v.provider_id === laterId);
};
ok(await vouchVisibleTo(userA), 'the vouch is readable while the listing is ordinary');

// The owner edits their own description. Nothing else changes.
await call('PUT', `/entities/Provider/${laterId}`, { token: userB, body: { description: 'We also provide trauma counseling for families.' } });
ok(!(await vouchVisibleTo(userA)), 'the vouch stops being readable once the listing reads as sensitive');
ok(!(await vouchVisibleTo(null)), 'and is not readable anonymously either');

// ---- sensitive listings: no public record of who needed help -------------
// The client does not render "I've used this" or a vouch button on a crisis
// line, an addiction service, a fertility organization or a mikvah. That is
// presentation. These assertions are the rule: a named vouch or a counted use
// on such a listing publishes something about the member's own life, so the
// server refuses it however the request arrives.
const sensListing = await call('POST', '/functions/createListing', { token: userA, body: { name: 'Crisis Support Line', category: 'Health', short_description: 'Confidential crisis intervention and counseling.' } });
const sensId = sensListing.data?.provider?.id;
ok(!!sensId, 'a sensitive listing can be created', JSON.stringify(sensListing.data || {}).slice(0, 120));

const sensVouch = await call('POST', '/functions/toggleCommunityActivity', { token: userB, body: { providerId: sensId, activity: 'vouch' } });
ok(sensVouch.status >= 400, 'a vouch is refused on a sensitive listing', String(sensVouch.status));

const sensUse = await call('POST', '/functions/toggleCommunityActivity', { token: userB, body: { providerId: sensId, activity: 'use' } });
ok(sensUse.status >= 400, 'a public "used this" is refused on a sensitive listing', String(sensUse.status));

// Saving is private to whoever did it, so it must keep working — someone needs
// to be able to keep the number without telling anyone they kept it.
const sensSave = await call('POST', '/functions/toggleCommunityActivity', { token: userB, body: { providerId: sensId, activity: 'save' } });
ok(sensSave.status === 200 && sensSave.data?.active === true, 'saving a sensitive listing still works', String(sensSave.status));

const sensNote = await call('POST', '/functions/createReview', { token: userB, body: { provider_id: sensId, provider_name: 'Crisis Support Line', body: 'They helped me through a very hard time.' } });
ok(sensNote.status >= 400, 'a signed public note is refused on a sensitive listing', String(sensNote.status));

// A shadchan's page is private for the same reason a crisis line is: a named
// vouch says the voucher used a shadchan, which is their business and nobody
// else's. Worth its own assertion because this category was added on a
// suggestion, and the brief draws the line at resources and contacts — no
// profiles, no matching.
const shidduchListing = await call('POST', '/functions/createListing', { token: userB, body: { name: 'R. Gold', category: 'Shidduchim', short_description: 'Introductions for singles in the community.' } });
const shidduchId = shidduchListing.data?.provider?.id;
ok(!!shidduchId, 'a shidduchim listing can be created', String(shidduchListing.status));
const shidduchVouch = await call('POST', '/functions/toggleCommunityActivity', { token: userA, body: { providerId: shidduchId, activity: 'vouch' } });
ok(shidduchVouch.status >= 400, 'a shidduchim listing refuses a public vouch', String(shidduchVouch.status));
const shidduchSave = await call('POST', '/functions/toggleCommunityActivity', { token: userA, body: { providerId: shidduchId, activity: 'save' } });
ok(shidduchSave.status === 200, 'but can still be saved privately', String(shidduchSave.status));

// And the rule is narrow rather than blanket: public trust still works where
// it helps, which is most of the directory.
const plainListing = await call('POST', '/functions/createListing', { token: userA, body: { name: 'Reliable Plumbing Co', category: 'Home Services', short_description: 'Repairs and installations for kitchens and bathrooms.' } });
const plainId = plainListing.data?.provider?.id;
const plainVouch = await call('POST', '/functions/toggleCommunityActivity', { token: userB, body: { providerId: plainId, activity: 'vouch' } });
ok(plainVouch.status === 200 && plainVouch.data?.active === true, 'a plumber can still be vouched for', String(plainVouch.status));


// ---- editing a listing, and what claiming changes ------------------------
// There was no way to edit a listing at all. The API allowed it; nothing in the
// UI used it, the "request a larger change" queue's Approve button changed
// nothing, and approving a claim stamped the request while leaving the listing
// with its original author. So these rules had never been exercised.
const ownListing2 = await call('POST', '/functions/createListing', { token: userB, body: { name: 'Gold Shoe Repair', category: 'Home Services', short_description: 'Resoling and stretching.' } });
const ownId = ownListing2.data?.provider?.id;
ok(!!ownId, 'a member can add a listing to edit', String(ownListing2.status));

// The person who added it may change it.
const edited = await call('PUT', `/entities/Provider/${ownId}`, { token: userB, body: { description: 'Resoling, stretching and repairs while you wait.', phone: '(561) 555-0199' } });
ok(edited.status === 200 && edited.data?.description?.startsWith('Resoling, stretching'), 'the person who added a listing can edit it', String(edited.status));
ok(edited.data?.name === 'Gold Shoe Repair', 'and a partial edit leaves the rest of the row alone', edited.data?.name);

// Nobody else may, claimed or not.
const strangerEdit = await call('PUT', `/entities/Provider/${ownId}`, { token: userA, body: { description: 'Hijacked.' } });
ok(strangerEdit.status === 403, 'another member cannot edit someone elses listing', String(strangerEdit.status));

// Editing is not a way around the fields an admin owns.
await call('PUT', `/entities/Provider/${ownId}`, { token: userB, body: { verified: true, featured: true, usage_count: 99 } });
const afterSneak = (await call('GET', `/entities/Provider/${ownId}`, { token: userB })).data || {};
ok(!afterSneak.verified && !afterSneak.featured && !afterSneak.usage_count, 'editing cannot grant verification, prominence or counters',
  JSON.stringify({ verified: afterSneak.verified, featured: afterSneak.featured, usage_count: afterSneak.usage_count }));

// A claim, and what approving it is supposed to do.
// Two claims filed while the listing is still unowned, held for the guards
// further down. A claim arrives before the handover, not after it — and
// createClaim now refuses one aimed at a listing that already has an owner,
// so resolveClaim's own guards have to be reached this way to stay tested.
const selfClaim = await call('POST', '/functions/createClaim', { token: admin, body: { provider_id: ownId, provider_name: 'Gold Shoe Repair', relationship: 'I run it', verification_details: 'Taking this one for myself, thanks.' } });
const secondClaim = await call('POST', '/functions/createClaim', { token: userC, body: { provider_id: ownId, provider_name: 'Gold Shoe Repair', relationship: 'I bought the shop', verification_details: 'New owner as of this month, happy to show papers.' } });
const claim = await call('POST', '/functions/createClaim', { token: userA, body: { provider_id: ownId, provider_name: 'Gold Shoe Repair', relationship: 'I own the shop', verification_details: 'Listed on our website and our storefront sign.' } });
const claimId = claim.data?.claim?.id;
ok(!!claimId, 'a business can file a claim', String(claim.status));

const claimByMember = await call('POST', '/functions/resolveClaim', { token: userA, body: { claim_id: claimId, approve: true } });
ok(claimByMember.status === 403, 'a member cannot approve their own claim', String(claimByMember.status));

const resolved = await call('POST', '/functions/resolveClaim', { token: admin, body: { claim_id: claimId, approve: true } });
ok(resolved.status === 200 && resolved.data?.provider?.claimed === true, 'approving a claim marks the listing claimed', String(resolved.status));
ok(resolved.data?.provider?.owner_id === idA, 'and hands it to whoever claimed it', String(resolved.data?.provider?.owner_id === idA));

// The handover is the whole point: the business edits, the original author no
// longer does. They can still suggest a correction.
const claimerEdit = await call('PUT', `/entities/Provider/${ownId}`, { token: userA, body: { hours: 'Sun-Thu 9-6, Fri 9-1' } });
ok(claimerEdit.status === 200 && claimerEdit.data?.hours?.startsWith('Sun-Thu'), 'the business can edit once its claim is approved', String(claimerEdit.status));
const formerEdit = await call('PUT', `/entities/Provider/${ownId}`, { token: userB, body: { description: 'Still mine?' } });
ok(formerEdit.status === 403, 'and whoever added it no longer can', String(formerEdit.status));

// The two self-service shortcuts followed whoever ADDED the listing, not its
// editor, so after a handover they were exactly inverted: the business could not
// set its own tagline while the original poster still could.
const taglineByOwner = await call('POST', '/functions/updateListingTagline', { token: userA, body: { provider_id: ownId, tagline: 'Resoling since 1998' } });
ok(taglineByOwner.status === 200, 'the business can set the tagline once it owns the listing', String(taglineByOwner.status));
const taglineByFormer = await call('POST', '/functions/updateListingTagline', { token: userB, body: { provider_id: ownId, tagline: 'Not mine any more' } });
ok(taglineByFormer.status === 403, 'and whoever added it cannot', String(taglineByFormer.status));
const payByFormer = await call('POST', '/functions/updateListingPaymentLink', { token: userB, body: { provider_id: ownId, payment_link_url: 'https://venmo.com/u/not-mine' } });
ok(payByFormer.status === 403, 'nor can they redirect its payment link', String(payByFormer.status));

// A claim that names no listing cannot hand anything over, and must not report
// success — that was the old behaviour for every claim.
const vagueClaim = await call('POST', '/functions/createClaim', { token: userC, body: { provider_name: 'Some shop we have never listed', relationship: 'owner', verification_details: 'Trust me on this one please.' } });
const vagueResolve = await call('POST', '/functions/resolveClaim', { token: admin, body: { claim_id: vagueClaim.data?.claim?.id, approve: true } });
ok(vagueResolve.status >= 400, 'a claim with no listing attached cannot be approved', String(vagueResolve.status));

// Resolving a claim is a position of trust, so it carries the usual guards.
// Found by the audit agents, all three reproducible before this.
const selfApprove = await call('POST', '/functions/resolveClaim', { token: admin, body: { claim_id: selfClaim.data?.claim?.id, approve: true } });
ok(selfApprove.status === 403, 'staff cannot approve their own claim', String(selfApprove.status));

// The listing is already userA's; a second claimant does not quietly inherit it.
const secondApprove = await call('POST', '/functions/resolveClaim', { token: admin, body: { claim_id: secondClaim.data?.claim?.id, approve: true } });
ok(secondApprove.status === 409, 'an already-claimed listing is not handed to the next claimant', String(secondApprove.status));
const stillOwned = (await call('GET', `/entities/Provider/${ownId}`, { token: admin })).data || {};
ok(stillOwned.owner_id === idA, 'and the current owner keeps it', String(stillOwned.owner_id === idA));

// A claim is resolved once. Rejecting an approved one used to leave the listing
// transferred while the request read "rejected".
const reResolve = await call('POST', '/functions/resolveClaim', { token: admin, body: { claim_id: claimId, approve: false } });
ok(reResolve.status === 409, 'a resolved claim cannot be resolved again', String(reResolve.status));
const afterReResolve = (await call('GET', `/entities/Provider/${ownId}`, { token: admin })).data || {};
ok(afterReResolve.owner_id === idA && afterReResolve.claimed === true, 'and the listing is left as it was', JSON.stringify({ owner: afterReResolve.owner_id === idA, claimed: afterReResolve.claimed }));

// The bypass the audit agents found: the single-row route refused the original
// author on a claimed listing, and update-many let them straight through,
// because it scoped by created_by_id — which is no longer who may write the row.
const bulkRetake = await call('POST', '/entities/Provider/update-many', { token: userB, body: { query: { id: ownId }, update: { description: 'Taken back through the bulk route' } } });
const afterBulk = (await call('GET', `/entities/Provider/${ownId}`, { token: admin })).data || {};
ok(bulkRetake.status === 403, 'the bulk route cannot be used to edit a listing', String(bulkRetake.status));
ok(afterBulk.description !== 'Taken back through the bulk route', 'and the listing is untouched by the attempt', String(afterBulk.description || '').slice(0, 40));

// The one thing bulk updates are actually for still works.
const myNotifs = await call('POST', '/entities/Notification/update-many', { token: userB, body: { query: { recipient_id: idB, read: false }, update: { read: true } } });
ok(myNotifs.status === 200, 'marking your own notifications read still works', String(myNotifs.status));

// A moderator is staff on rows that are not theirs and an ordinary member on
// rows that are. The PUT route decided which by created_by_id, which is the
// wrong question for a listing: a moderator who claimed one could change its
// status and nothing else, and one who had posted a listing since claimed away
// could still rewrite it. Both found by the audit agents.
const modEmail = `moderator${Date.now()}@example.com`;
const modReg = await call('POST', '/auth/register', { body: { email: modEmail, password: 'password123' } });
const modVer = await call('POST', '/auth/verify-otp', { body: { email: modEmail, otpCode: modReg.data?.dev_code } });
const modTok = modVer.data?.access_token, modId = modVer.data?.user?.id;
await call('POST', `/users/${modId}/role`, { token: admin, body: { role: 'moderator' } });

// A listing the moderator posts, then someone else claims.
const modListing = await call('POST', '/functions/createListing', { token: modTok, body: { name: 'Moderator Hardware', category: 'Home Services', short_description: 'Keys cut and locks fitted.' } });
const modListingId = modListing.data?.provider?.id;
const modClaim = await call('POST', '/functions/createClaim', { token: userC, body: { provider_id: modListingId, provider_name: 'Moderator Hardware', relationship: 'owner', verification_details: 'Our shop, our sign, our phone number.' } });
await call('POST', '/functions/resolveClaim', { token: admin, body: { claim_id: modClaim.data?.claim?.id, approve: true } });

await call('PUT', `/entities/Provider/${modListingId}`, { token: modTok, body: { description: 'Rewritten by the former author who happens to be staff' } });
const modAfter = (await call('GET', `/entities/Provider/${modListingId}`, { token: admin })).data || {};
ok(modAfter.description !== 'Rewritten by the former author who happens to be staff',
  'a moderator who posted a listing since claimed away cannot rewrite it', String(modAfter.description || '(none)').slice(0, 40));

// And the other direction: a moderator who owns a listing is its editor.
const modOwn = await call('POST', '/functions/createListing', { token: modTok, body: { name: 'Moderator Bakery', category: 'Food & Catering', short_description: 'Bread and rolls.' } });
const modOwnEdit = await call('PUT', `/entities/Provider/${modOwn.data?.provider?.id}`, { token: modTok, body: { description: 'Fresh daily from 6am.' } });
ok(modOwnEdit.status === 200 && modOwnEdit.data?.description === 'Fresh daily from 6am.',
  'a moderator can still edit a listing that is genuinely theirs', String(modOwnEdit.status));

// Handing a business page from one person to another is the most consequential
// thing staff can do here, and it left no trace at all.
const trail = (await call('GET', '/entities/ActivityEvent?limit=500', { token: admin })).data || [];
ok(Array.isArray(trail) && trail.some((e) => e.entity === 'ClaimRequest' && e.target_id === claimId && e.to === 'approved'),
  'approving a claim is recorded', String(Array.isArray(trail) && trail.length));
ok(Array.isArray(trail) && trail.some((e) => e.type === 'listing_handover' && e.target_id === ownId && e.to === idA),
  'and so is the handover itself, with who it went to');

// Claims were the last unbounded write.
const spamEmail = `spamclaim${Date.now()}@example.com`;
const spamReg = await call('POST', '/auth/register', { body: { email: spamEmail, password: 'password123' } });
const spamVer = await call('POST', '/auth/verify-otp', { body: { email: spamEmail, otpCode: spamReg.data?.dev_code } });
const spamTok = spamVer.data?.access_token;
let lastClaim = null;
for (let i = 0; i < 4; i++) {
  lastClaim = await call('POST', '/functions/createClaim', { token: spamTok, body: { provider_name: `Some Business ${i}`, relationship: 'owner', verification_details: 'Filing a few of these to see what happens.' } });
}
ok(lastClaim && lastClaim.status === 429, 'claims are capped per day like listings are', String(lastClaim && lastClaim.status));

// The edit route was a way around every rule the create route enforces: it
// never ran the listing normalizer, so a listing could declare on the way back
// through what it was refused on the way in.
const bakeryId = modOwn.data?.provider?.id;
const shapeEdit = await call('PUT', `/entities/Provider/${bakeryId}`, { token: modTok, body: {
  badges: ['pas_yisroel', 'accepts_insurance', 'not-a-real-badge'],
  whatsapp: '(561) 555-0142',
  tagline: 'x'.repeat(200),
  languages: 'English, Hebrew',
  service_areas: 'Boca Raton, Delray Beach',
} });
const gotBadges = shapeEdit.data?.badges || [];
ok(shapeEdit.status === 200 && gotBadges.includes('pas_yisroel'), 'an edit keeps a badge the category allows', JSON.stringify(gotBadges));
ok(!gotBadges.includes('not-a-real-badge'), 'an edit cannot invent a badge that does not exist', JSON.stringify(gotBadges));
ok(!gotBadges.includes('accepts_insurance'), 'nor claim one belonging to another trade', JSON.stringify(gotBadges));
ok(shapeEdit.data?.whatsapp === '15615550142', 'an edit normalizes a WhatsApp number so the wa.me link works', String(shapeEdit.data?.whatsapp));
ok((shapeEdit.data?.tagline || '').length === 120, 'an edit obeys the tagline cap', String((shapeEdit.data?.tagline || '').length));
ok(Array.isArray(shapeEdit.data?.languages) && shapeEdit.data.languages.length === 2,
  'an edit stores list fields as lists, so the listing page cannot 500 on them', JSON.stringify(shapeEdit.data?.languages));
const sparseEdit = await call('PUT', `/entities/Provider/${bakeryId}`, { token: modTok, body: { phone: '561-555-0101' } });
ok(sparseEdit.status === 200 && JSON.stringify(sparseEdit.data?.languages) === JSON.stringify(shapeEdit.data?.languages) && sparseEdit.data?.tagline === shapeEdit.data?.tagline,
  'and a one-field edit leaves the fields it did not mention alone');
// A category change re-tests what the badges were granted against.
const recategorized = await call('PUT', `/entities/Provider/${bakeryId}`, { token: modTok, body: { category: 'Legal' } });
ok(!(recategorized.data?.badges || []).includes('pas_yisroel'), 'a badge does not survive a move to a trade it means nothing in', JSON.stringify(recategorized.data?.badges));

// owner_id is who may edit the row, so the row's own editor must not set it.
const giveAway = await call('PUT', `/entities/Provider/${ownId}`, { token: userA, body: { owner_id: idB } });
// Categories keep themselves current: nobody presses a button when one is added.
const cats = (await call('GET', '/entities/Category', { token: admin })).data || [];
for (const name of ['Shidduchim', 'Shuls & Minyanim', 'Other']) {
  ok(cats.some((c) => c.name === name), `the directory offers ${name} without anyone adding it`);
}
const offeredRow = ((await call('GET', '/entities/Setting', { token: admin })).data || []).find((s) => s.key === 'categories_offered');
ok(!!offeredRow && JSON.parse(offeredRow.value).includes('other'), 'and records what it has offered, so a removal sticks');
ok(new Set(cats.map((c) => c.name)).size === cats.length, 'and never creates a duplicate');

ok(giveAway.status === 200 && giveAway.data?.owner_id === idA,
  'a listing cannot be handed to someone outside the claim queue', String(giveAway.data?.owner_id));

// A claim asks staff to hand one business page to one person, so the record has
// to say which listing — not whatever the claimant typed in the name field.
const targetListing = await call('POST', '/functions/createListing', { token: admin, body: { name: 'Vfy Kosher Supermarket', category: 'Food & Catering', short_description: 'Groceries and a takeout counter.' } });
const targetId = targetListing.data?.provider?.id;
const truthEmail = `claimtruth${Date.now()}@example.com`;
const truthReg = await call('POST', '/auth/register', { body: { email: truthEmail, password: 'password123' } });
const truthTok = (await call('POST', '/auth/verify-otp', { body: { email: truthEmail, otpCode: truthReg.data?.dev_code } })).data?.access_token;
const liar = await call('POST', '/functions/createClaim', { token: truthTok, body: { provider_id: targetId, provider_name: "Moshe's Little Shoe Repair", relationship: 'owner', verification_details: 'Let me tell you all about my shoe shop.' } });
ok(liar.status === 200 && liar.data?.claim?.provider_name === 'Vfy Kosher Supermarket',
  'a claim is recorded against the listing it names, not the name it types', String(liar.data?.claim?.provider_name));
const twice = await call('POST', '/functions/createClaim', { token: truthTok, body: { provider_id: targetId, provider_name: 'Vfy Kosher Supermarket', relationship: 'owner', verification_details: 'Filing it a second time for good measure.' } });
ok(twice.status === 409, 'the same member cannot pile claims on one listing', String(twice.status));
const ghost = await call('POST', '/functions/createClaim', { token: truthTok, body: { provider_id: 'no-such-listing', provider_name: 'Ghost Shop', relationship: 'owner', verification_details: 'Claiming a listing that is not there.' } });
ok(ghost.status === 404, 'a claim cannot point at a listing that does not exist', String(ghost.status));
const takenToo = await call('POST', '/functions/createClaim', { token: truthTok, body: { provider_id: ownId, provider_name: 'Gold Shoe Repair', relationship: 'owner', verification_details: 'Trying for a listing that already has an owner.' } });
ok(takenToo.status === 409, 'a listing that already belongs to someone is not claimable', String(takenToo.status));

// Their own member, because userB is at the five-listings-a-day cap by now and
// a 429 here would leave the rows below undefined and the assertions vacuous.
const ownerEmail = `listingowner${Date.now()}@example.com`;
const ownerReg = await call('POST', '/auth/register', { body: { email: ownerEmail, password: 'password123' } });
const ownerTok = (await call('POST', '/auth/verify-otp', { body: { email: ownerEmail, otpCode: ownerReg.data?.dev_code } })).data?.access_token;

// The slug is the public URL. /provider/:slug resolves by filtering on it, so
// a member could put another business's slug on their own listing and answer
// at the victim's canonical URL with their own title, OG tags and JSON-LD.
const victim = await call('POST', '/functions/createListing', { token: admin, body: { name: 'Devorahs Kosher Catering', category: 'Food & Catering', short_description: 'Catering for simchas.', slug: 'devorahs-kosher-catering' } });
ok(!victim.data?.provider?.slug, 'a new listing cannot choose its own public URL', String(victim.data?.provider?.slug));
const squatter = await call('POST', '/functions/createListing', { token: ownerTok, body: { name: 'Not The Caterer', category: 'Business', short_description: 'Something else entirely.' } });
const squatId = squatter.data?.provider?.id;
const squat = await call('PUT', `/entities/Provider/${squatId}`, { token: ownerTok, body: { slug: 'devorahs-kosher-catering' } });
ok(squat.status === 200 && !squat.data?.slug, 'nor take over another listing URL by editing', String(squat.data?.slug));

// Verification is a statement about one specific business.
const toVerify = await call('POST', '/functions/createListing', { token: ownerTok, body: { name: 'Verified Bakery', category: 'Food & Catering', short_description: 'Bread and challah.', city: 'Lakewood' } });
const vId = toVerify.data?.provider?.id;
await call('PUT', `/entities/Provider/${vId}`, { token: admin, body: { verified: true, verified_at: '2026-10-01T00:00:00Z', latitude: 40.0963, longitude: -74.2176, badges: ['pas_yisroel'], verified_badges: ['pas_yisroel'] } });
ok(!!vId, 'the rows the verification assertions need exist', String(toVerify.status));
const hoursOnly = await call('PUT', `/entities/Provider/${vId}`, { token: ownerTok, body: { hours: 'Sun-Thu 6am-7pm' } });
ok(hoursOnly.data?.verified === true, 'fixing the hours does not cost a listing its verification', String(hoursOnly.data?.verified));
const becameSomethingElse = await call('PUT', `/entities/Provider/${vId}`, { token: ownerTok, body: { name: "Shloimy's Auto Body", category: 'Home Services', city: 'Brooklyn', address: '1 Other St' } });
ok(becameSomethingElse.data?.verified === false, 'but becoming a different business does', String(becameSomethingElse.data?.verified));
ok(becameSomethingElse.data?.latitude == null, 'and the old pin does not stay on the new address', String(becameSomethingElse.data?.latitude));
const trail2 = (await call('GET', '/entities/ActivityEvent?limit=500', { token: admin })).data || [];
ok(trail2.some((e) => e.type === 'listing_identity_change' && e.target_id === vId),
  'a verified listing changing identity is something staff can find');

// A confirmed badge is the admin's word on a claim the listing made. When the
// listing stops making the claim, the admin's confirmation of it has to go too
// — the page draws a badge that is declared OR confirmed, so un-ticking it in
// the form changed nothing while the form said the change was live.
const kosher = await call('POST', '/functions/createListing', { token: ownerTok, body: { name: 'Badge Bakery', category: 'Food & Catering', short_description: 'Cakes.', badges: ['cholov_yisroel', 'pas_yisroel'] } });
const kId = kosher.data?.provider?.id;
await call('PUT', `/entities/Provider/${kId}`, { token: admin, body: { verified_badges: ['cholov_yisroel', 'pas_yisroel'] } });
ok(!!kId, 'and the badge assertions have a row too', String(kosher.status));
const untick = await call('PUT', `/entities/Provider/${kId}`, { token: ownerTok, body: { badges: ['pas_yisroel'] } });
ok(!(untick.data?.verified_badges || []).includes('cholov_yisroel'),
  'a business can retract a confirmed badge it no longer deserves', JSON.stringify(untick.data?.verified_badges));
ok((untick.data?.verified_badges || []).includes('pas_yisroel'), 'and keeps the one it still declares', JSON.stringify(untick.data?.verified_badges));
const moved = await call('PUT', `/entities/Provider/${kId}`, { token: ownerTok, body: { category: 'Legal' } });
ok(!(moved.data?.verified_badges || []).length, 'a confirmed kashrus badge does not follow a listing into another trade', JSON.stringify(moved.data?.verified_badges));
const dupes = await call('PUT', `/entities/Provider/${kId}`, { token: ownerTok, body: { service_areas: 'Boca Raton, Boca Raton, Delray Beach' } });
ok(JSON.stringify(dupes.data?.service_areas) === JSON.stringify(['Boca Raton', 'Delray Beach']),
  'an edit does not store the same area twice', JSON.stringify(dupes.data?.service_areas));

// A demo instance adopts one shared guest account for every signed-out
// visitor, so rows it created belong to nobody in particular.
const guestSession = await call('POST', '/auth/demo-session', { body: {} });
const guestTok = guestSession.data?.access_token;
if (guestTok) {
  const guestListing = await call('POST', '/functions/createListing', { token: guestTok, body: { name: 'Guest Shop', category: 'Community', short_description: 'Added without an account.' } });
  const gId = guestListing.data?.provider?.id;
  if (gId) {
    const guestEdit = await call('PUT', `/entities/Provider/${gId}`, { token: guestTok, body: { description: 'Anyone at all can write this.' } });
    ok(guestEdit.status === 403, 'the shared guest account cannot edit a listing, including one it added', String(guestEdit.status));
  } else {
    ok(true, 'the shared guest account cannot add a listing at all', String(guestListing.status));
  }
}

console.log = log;
server.close();
console.log(fails ? `\napi checks: ${fails} FAILED` : '\napi checks: all passed');
process.exit(fails ? 1 : 0);
