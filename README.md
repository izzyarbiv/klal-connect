# Klal

A community-powered platform for finding trusted Jewish professionals, businesses, and
resources in your area.

Frontend, API, database and authentication all live in this repo — there is no external
platform to sign into and no hosted service to configure before it runs.

## Quick start

Requires Postgres running locally.

```bash
createdb klal_connect_dev
npm install
npm run migrate                                  # create the schema
npm run seed                                     # categories + sample listings
npm run create-admin -- you@example.com 'a-password'
npm run dev                                      # API on :4000, web on :5173
```

Open http://localhost:5173

**The first account you register becomes the admin.** There is no other way in, by design.
While `KC_EMAIL_DELIVERY=dev`, sign-up and password-reset codes are printed to the API
console and returned to the client so you can finish the flow locally. With
`KC_EMAIL_DELIVERY=real` (and Resend configured) they are emailed, sign-up requires the
code, and an account that never entered its code is asked for one again at log in.
Anywhere codes cannot be delivered at all (production without a mail provider), sign-up
skips verification and signs the new account in directly, and password reset reports
that it is unavailable.

## Layout

```
server/
  app.js        Express API — entities, auth, functions, uploads
  index.js      Local dev server (listens; production does not)
  db.js         Postgres document store
  storage.js    Uploads — local disk in dev, Supabase Storage in production
  geocode.js    Geocoding proxy (mapbox / geoapify / locationiq / nominatim)
  auth.js       JWT sessions, bcrypt passwords, OTP codes
  functions.js  Business logic (moderation, counters, messaging)
  shabbos.js    Zmanim / Yom Tov engine (@hebcal/core)
  seed.js       Categories + sample listings
src/
  api/          API client — same shape the app already called
  components/   App components (+ admin/, feed/) and shadcn/ui primitives
  hooks/        Theme, notifications, location, Shabbos status
  lib/          Auth context, routing paths, query client, helpers
  pages/        Route pages
  index.css     Tailwind layers + brand design tokens
```

Path alias `@/` → `src/`.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | API + web together (concurrently) |
| `npm run migrate` | Create/update the schema (run once per deploy) |
| `npm run create-admin` | Create or promote an admin — `-- <email> '<password>'` |
| `npm test` | Shabbos gate + geocoder adapter tests |
| `npm run test:gate` | Browser check: the gate never shows an unlocked app |
| `npm run test:offline` | Browser check: same, with the service worker offline |
| `npm run dev:api` | API only, with `--watch` reload |
| `npm run dev:web` | Vite only |
| `npm run seed` | Seed categories and sample listings |
| `npm run build` | Production build to `dist/` |
| `npm start` | Run the API (serves the built frontend's data) |
| `npm run lint` | ESLint |

## API

All routes are under `/api`, and the dev server proxies to the API automatically.

| Route | Purpose |
| --- | --- |
| `GET/POST/PUT/DELETE /api/entities/:entity` | CRUD over the 18 entities |
| `POST /api/entities/:entity/update-many` | Bulk update (scoped to your own rows) |
| `POST /api/functions/:name` | Business logic — see below |
| `POST /api/auth/login\|register\|verify-otp\|…` | Sessions |
| `GET/PUT /api/auth/me` | Current user |
| `POST /api/upload` | Image upload (8MB, images only) |

Functions: `createListing`, `updateListingTagline`, `createClaim`, `createReview`,
`createReport`, `createPost`, `createComment`, `toggleLike` (one reaction per member per
post — see `src/lib/reactions.js`), `toggleAnswerVote`, `markHelpful`, `recordPostView`,
`toggleSavePost`, `reportPost`, `deletePost` (the post's author, an admin or a moderator;
takes its comments, reactions, votes and saves with it), `reactToMessage`,
`toggleCommunityActivity`, `sendMessage`, `myInvite`, `getShabbosStatus`.

These are server-side rather than direct entity writes because each enforces something
the client must not be trusted with: moderation status, ownership, counter integrity, or
the Shabbos write-gate.

## Profiles and settings

`/profile` is a member's own profile, rendered by the same page everyone else sees at
`/profile/:id` with the editing turned on: cover and photo uploads, an inline intro form
(name, headline, what brings them here, community, city, private phone), About and
Experience edited in place, their recent posts, a completeness checklist, and their invite
link. Viewers get Connect, Message, Share, the connection count and mutual connections.
Everything about the account that is not the profile — Shabbos location, password,
notifications, listings, company pages, log out — is at `/settings`, reached from the gear
in the header, the Settings button on the profile, and the Shabbos prompts.

## Roles

- **user** — a member. Reads everything public, writes their own.
- **moderator** — the review queues (pending listings, claims, positive notes, reports,
  edits). Can approve, reject and resolve, leave notes, and remove a feed post
  (`deletePost`). Cannot delete anything else, verify, rename, or see messages, saves,
  categories or users.
- **admin** — everything, including verification, badges, categories and roles.
  Roles are changed from Admin → Users; you cannot change your own.

Every status change by staff is recorded as a `moderation` activity event.

## Access rules

- **Public**: published listings, companies, categories, published community notes.
- **Moderated**: anything `pending`/`hidden`/`declined` is visible only to its author and admins.
- **Private**: messages, notifications, saves, and reports are scoped to their owner. The
  recipient of a connection request may accept or decline it, and the recipient of a
  message may mark it read; nothing else on someone else's row is editable.
- **Post views**: counted once per member and shown only to the post's author.
- **Saved posts** (`SavedPost`): private to the member who saved them; written only through
  `toggleSavePost`, never by a direct entity write.
- **Admin only**: platform settings (including the global Shabbos override), categories, the
  report queue, and marking an account verified (the way in for a member whose code never
  arrived).
- **Personal, admins included**: saved listings, saved posts, reactions and answer votes are
  readable only by the member who made them. Activity events (searches, calls, post views)
  are readable by their author and admins.
- **Creating rows**: a member's direct POST cannot choose a row's status, id, or creator; a
  connection request always starts pending, a listing or note always goes to review.
- **Shabbos**: the server refuses writes during Shabbos and Yom Tov, so a stale tab or a
  wrong client clock can't slip one through.
- **Listing owners** edit their listing's content; `status`, `verified`, confirmed badges
  and the counters are set only by the server or staff.
- **Invites**: every member has one personal link (`/join/<code>`). Whoever joins through
  it is recorded as invited by them; the inviter is told.

## Data

Postgres (`DATABASE_URL`), locally or Supabase. Entities are stored as documents — one
`records` row per entity with a JSON `data` column — so adding a field is not a
migration; accounts live in `users`. Uploads go to Vercel Blob or Supabase Storage in
production and to `server/uploads/` (gitignored) locally. `server/db.js` picks the
backend: Postgres by default, `KC_STORE=blob` for the pre-database bridge, and memory
only for a `KC_DEMO_MODE=1` instance with no database at all.

## Guest browsing

**https://klalconnect.org** — no sign-in needed. With `KC_DEMO_MODE=1` visitors are
given a shared guest session automatically, so the whole app (feed, people, messages,
saved, profile) is browsable straight away.

Everyone who lands on the site shares that one guest account. `KC_GUEST_READONLY=1`
keeps it read-only: the guest can look at everything a member can, but any write —
posting, liking, commenting, connecting, messaging, saving, uploading — is refused
with a 403. The client knows it is the guest (`guest: true` on the session) and shows
a "create a free account" prompt before it ever sends the request; the profile,
messages and saved pages become that prompt. The directory stays open to everyone.
Without the flag, anonymous visitors can post and message as "Guest".

The guest is a placeholder, never a person. Whatever is stored on its row, the server
presents it as "Guest" everywhere — its own session, the author fields on anything it
creates, the profile route — and its profile can never be edited, flag or no flag. It
is left out of the members list and People You May Know. Only an admin sees the row
itself (Admin → Users), which is where it gets scrubbed if something was written to
it before this was enforced.

The seed also creates a `demo@klal.app` admin. On a database it gets a random
password unless `KC_DEMO_PASSWORD` is set; give it a real one with
`npm run create-admin -- demo@klal.app '<password>'`.

## Deploying to Vercel

1. **Supabase** — create a project. Uploads can go to Supabase Storage (a
   **public** bucket named `uploads`) or to Vercel Blob; either works.
2. **Vercel** — import the repo and set these environment variables:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Supabase **Transaction pooler** string, port **6543** — not the direct connection, which is IPv6-only and exhausts its connection budget under serverless. Remove any `?sslmode=` (TLS is configured in code, with Supabase's root CA in `server/certs/` trusted alongside the system roots). |
   | `BLOB_READ_WRITE_TOKEN` | Set by attaching a Vercel Blob store — uploads go there. Or `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for Supabase Storage. |
   | `KC_JWT_SECRET` | A long random string. The server refuses to boot in production without it. |
   | `KC_GEOCODER` / `KC_GEOCODER_KEY` | `google` and a key restricted to the Geocoding API (or `mapbox` and a token) |
   | `GOOGLE_MAPS_BROWSER_KEY` | A *separate* key restricted to the site's referrers and the Maps JavaScript API. Without it the map falls back to OpenStreetMap tiles. |
   | `KC_TRUST_PROXY` | `1` — Vercel terminates TLS in front of us, so `req.ip` comes from `X-Forwarded-For` |
   | `KC_AUTO_MIGRATE` | `0` — run `npm run migrate` yourself instead of on every cold start |
   | `NODE_ENV` | `production` |
   | `KC_DEMO_MODE` | `1` keeps the no-login guest session (visitors browse as a shared guest account). With `DATABASE_URL` set the data still lives in Postgres. Remove it once real members should have to sign in. |
   | `KC_GUEST_READONLY` | `1` so the shared guest can read but not write. See *Guest browsing*. |
   | `GOOGLE_CLIENT_ID` | OAuth client id for "Continue with Google" (accounts are created from the Google-verified email, no password). The button only renders when this is set. |
   | `KC_EMAIL_DELIVERY` / `RESEND_API_KEY` / `KC_MAIL_FROM` | `real`, a Resend API key, and a From address on a domain verified in Resend. Turns on verification and password-reset emails. |
   | `KC_STORE` | Remove it once `DATABASE_URL` is set. `blob` was the pre-database bridge. |

3. Run `npm run migrate` once against the production database.
4. `npm run create-admin` against it too — with no email provider wired up, the
   signup flow cannot be completed, so this is the only way in.

### Moving off the Blob bridge

A deployment that ran with `KC_STORE=blob` before a database existed keeps its
data with one command:

```sh
BLOB_READ_WRITE_TOKEN=… DATABASE_URL=… npm run import-blob
```

Every record and account is copied with its original id and timestamps, so
sessions stay valid. It is insert-only: re-running adds rows that are new on Blob
and never overwrites one Postgres already has. Then drop `KC_STORE` from the
Vercel env and redeploy.

The whole API is one function (`api/index.js`), so a warm instance keeps a single
database pool rather than one per route.

## Installing as an app

The build produces a service worker and manifest, so the site is installable:
Add to Home Screen on iOS, or the install prompt on Android/Chrome. Nothing
under `/api` is ever cached — see the invariants in `vite.config.js`.

## Not done yet

- **Email delivery** — verification and reset codes are console-only until Resend is
  configured (`KC_EMAIL_DELIVERY=real`, `RESEND_API_KEY`, `KC_MAIL_FROM`).
- **Google sign-in** — not offered. Adding it needs OAuth credentials and a
  `/api/auth/google` exchange; the sign-in pages are email and password only until then.
- **Native app builds** — Capacitor wrappers for the App Store and Play Store are
  not set up. Apple's guideline 4.2 rejects thin web wrappers, so this needs
  native capabilities (push, geolocation) before it is worth submitting.
- **Map** — Google Maps once `GOOGLE_MAPS_BROWSER_KEY` is set; until then
  OpenStreetMap's public tiles, whose policy does not cover production app
  traffic.

## Stack

React 18 · Vite 6 · Tailwind 3 · shadcn/ui (Radix) · react-router-dom 6 · TanStack Query ·
@vis.gl/react-google-maps (react-leaflet fallback) · framer-motion · lucide-react · Express 5 · Postgres · @hebcal/core
