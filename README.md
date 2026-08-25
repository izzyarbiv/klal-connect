# Klal Connect

A community-powered platform for finding trusted Jewish professionals, businesses, and
resources in your area.

This was originally a Base44 export. It no longer depends on Base44 in any way — the
frontend, the API, the database, and authentication are all in this repo.

## Quick start

```bash
npm install
npm run seed   # categories + sample listings (safe to re-run)
npm run dev    # API on :4000, web on :5173
```

Open http://localhost:5173

**The first account you register becomes the admin.** There is no other way in, by design.
Sign-up and password-reset codes are not emailed yet — while `KC_EMAIL_DELIVERY=dev` they
are printed to the API console and returned to the client so you can finish the flow.

## Layout

```
server/
  index.js      Express API — entities, auth, functions, uploads
  db.js         SQLite document store
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
are stored as documents (a JSON blob per record), which keeps the schemaless behaviour the
app was written against.

## Not done yet

- **Email delivery** — OTP and reset codes are console-only until SMTP is configured.
- **Google sign-in** — the button is present but reports that it isn't configured; it needs
  OAuth credentials.
- **Deployment** — runs locally; no hosting target chosen yet.

## Stack

React 18 · Vite 6 · Tailwind 3 · shadcn/ui (Radix) · react-router-dom 6 · TanStack Query ·
react-leaflet · framer-motion · lucide-react · Express 5 · SQLite · @hebcal/core
