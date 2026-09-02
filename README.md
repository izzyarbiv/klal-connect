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
Sign-up and password-reset codes are not emailed yet — while `KC_EMAIL_DELIVERY=dev` they
are printed to the API console and returned to the client so you can finish the flow.

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
`createReport`, `createPost`, `createComment`, `toggleLike`, `recordPostView`,
`toggleCommunityActivity`, `sendMessage`, `getShabbosStatus`.

These are server-side rather than direct entity writes because each enforces something
the client must not be trusted with: moderation status, ownership, counter integrity, or
the Shabbos write-gate.

## Access rules

- **Public**: published listings, companies, categories, published community notes.
- **Moderated**: anything `pending`/`hidden`/`declined` is visible only to its author and admins.
- **Private**: messages, notifications, saves, and reports are scoped to their owner.
- **Admin only**: platform settings (including the global Shabbos override), the report queue.
- **Shabbos**: the server refuses writes during Shabbos and Yom Tov, so a stale tab or a
  wrong client clock can't slip one through.

## Data

SQLite at `server/data/klal.db`, uploads in `server/uploads/` — both gitignored. Entities
are stored as documents (a JSON blob per record), so adding a field is not a migration.

## Live demo

**https://klal-connect.vercel.app** — no sign-in needed. Visitors are given a shared
guest session automatically, so the whole app (feed, people, messages, saved, profile)
is browsable straight away. To see the admin screens, sign in as
`demo@klal.app` / `demo1234`.

This deployment runs with `KC_DEMO_MODE=1`: there is no database attached, so the
data lives in each serverless instance's memory. It seeds itself on cold start, and
anything written through the UI survives only as long as that instance stays warm.
It exists to show the app. Attach Postgres before it is anything more than that.

## Deploying to Vercel

1. **Supabase** — create a project. Uploads can go to Supabase Storage (a
   **public** bucket named `uploads`) or to Vercel Blob; either works.
2. **Vercel** — import the repo and set these environment variables:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Supabase **Transaction pooler** string, port **6543** — not the direct connection, which is IPv6-only and exhausts its connection budget under serverless. Remove any `?sslmode=` (TLS is configured in code). |
   | `BLOB_READ_WRITE_TOKEN` | Set by attaching a Vercel Blob store — uploads go there. Or `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for Supabase Storage. |
   | `KC_JWT_SECRET` | A long random string. The server refuses to boot in production without it. |
   | `KC_GEOCODER` / `KC_GEOCODER_KEY` | `google` and a key restricted to the Geocoding API (or `mapbox` and a token) |
   | `GOOGLE_MAPS_BROWSER_KEY` | A *separate* key restricted to the site's referrers and the Maps JavaScript API. Without it the map falls back to OpenStreetMap tiles. |
   | `KC_TRUST_PROXY` | `1` — Vercel terminates TLS in front of us, so `req.ip` comes from `X-Forwarded-For` |
   | `KC_AUTO_MIGRATE` | `0` — run `npm run migrate` yourself instead of on every cold start |
   | `NODE_ENV` | `production` |
   | `KC_DEMO_MODE` | `1` keeps the no-login guest session (visitors browse as a shared guest account). With `DATABASE_URL` set the data still lives in Postgres. Remove it once real members should have to sign in. |
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
sessions stay valid. Re-running is safe (existing rows are skipped). Then drop
`KC_STORE` from the Vercel env and redeploy.

The whole API is one function (`api/index.js`), so a warm instance keeps a single
database pool rather than one per route.

## Installing as an app

The build produces a service worker and manifest, so the site is installable:
Add to Home Screen on iOS, or the install prompt on Android/Chrome. Nothing
under `/api` is ever cached — see the invariants in `vite.config.js`.

## Not done yet

- **Email delivery** — OTP and reset codes are console-only until SMTP is configured.
- **Google sign-in** — the button is present but reports that it isn't configured; it needs
  OAuth credentials.
- **Native app builds** — Capacitor wrappers for the App Store and Play Store are
  not set up. Apple's guideline 4.2 rejects thin web wrappers, so this needs
  native capabilities (push, geolocation) before it is worth submitting.
- **Map** — Google Maps once `GOOGLE_MAPS_BROWSER_KEY` is set; until then
  OpenStreetMap's public tiles, whose policy does not cover production app
  traffic.

## Stack

React 18 · Vite 6 · Tailwind 3 · shadcn/ui (Radix) · react-router-dom 6 · TanStack Query ·
@vis.gl/react-google-maps (react-leaflet fallback) · framer-motion · lucide-react · Express 5 · Postgres · @hebcal/core
