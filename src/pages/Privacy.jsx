import React from 'react';
import { Link } from 'react-router-dom';

// Plain-language privacy policy. Written from what the app actually does;
// keep it in step when that changes. Not legal advice — the owner should
// have it read before relying on it.
const UPDATED = '8 September 2026';

export default function Privacy() {
  return <div className="page-shell max-w-3xl py-10">
    <span className="eyebrow dark">KLAL</span>
    <h1 className="title text-3xl">Privacy policy</h1>
    <p className="helper">Last updated {UPDATED}. Klal is a community directory and network at klalconnect.org. This page says what we keep, who can see it, and how to get it removed.</p>

    <div className="prose-klal mt-8 space-y-8 text-brand-body">
      <section>
        <h2 className="section-title">What we collect</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><b>Account:</b> your email address and a password (stored only as a hash), or your Google account's email and name if you sign in with Google.</li>
          <li><b>Profile:</b> whatever you add — name, headline, photo, cover, bio, city, community affiliation, work experience, phone number.</li>
          <li><b>What you do on Klal:</b> listings you add or claim, posts, answers, comments, reactions, vouches, saves, connections, messages, reports.</li>
          <li><b>Location for Shabbos times:</b> if you set or detect a location, we store the coordinates and time zone on your account so the app can lock and unlock at your candle-lighting and Havdalah. Never shown to anyone.</li>
          <li><b>Usage:</b> events such as searches, listing views, calls and shares, kept in aggregate to see what the community uses. Not sold, not shared.</li>
        </ul>
      </section>

      <section>
        <h2 className="section-title">Who can see what</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><b>Public</b> (anyone, signed in or not): published listings, categories and community notes; the directory map.</li>
          <li><b>Members</b> (anyone with an account, and visitors browsing as the guest): your profile — name, headline, photo, cover, bio, city, affiliation, experience — your posts, and your vouches, which carry your name on purpose.</li>
          <li><b>Private</b> (only you, the person on the other end, and Klal's administrators): messages, your phone number, your exact location, saved listings, reports you send, and notifications.</li>
          <li><b>Never public:</b> your email address and your password.</li>
        </ul>
      </section>

      <section>
        <h2 className="section-title">Who else handles the data</h2>
        <p className="mt-2">Klal runs on Vercel (hosting) and Supabase (database, in the United States). Uploaded images are stored on Vercel Blob. When enabled, Google Maps draws the map and looks up addresses, Google handles "Continue with Google", and Resend delivers verification and password-reset emails. Each of these sees only what it needs for that job.</p>
      </section>

      <section>
        <h2 className="section-title">Cookies and storage</h2>
        <p className="mt-2">Klal does not use advertising or tracking cookies. Your browser keeps a sign-in token, your theme choice, and a couple of small preferences in local storage so the app works between visits. Visitors who have not signed in browse through a shared, read-only guest session.</p>
      </section>

      <section>
        <h2 className="section-title">Removing your data</h2>
        <p className="mt-2">You can edit or clear anything on your profile at any time, delete your own posts, and withdraw vouches and connections. To deactivate or delete your account entirely, or to have a listing about you or your business corrected or taken down, contact us and we will do it. Private reports about a listing go only to Klal's review team and are never shown to the business or to other members.</p>
      </section>

      <section>
        <h2 className="section-title">Contact</h2>
        <p className="mt-2">Questions, corrections and removal requests: <a className="font-semibold text-brand-teal hover:underline" href="mailto:hello@klalconnect.org">hello@klalconnect.org</a>, or the private report form on any listing.</p>
      </section>
    </div>

    <p className="mt-10 text-sm text-brand-muted"><Link to="/" className="font-semibold text-brand-teal hover:underline">Back to Klal</Link></p>
  </div>;
}
