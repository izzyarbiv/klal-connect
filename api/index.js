// Vercel serverless entry point.
//
// Vercel invokes this handler for every /api/* request (see the rewrite in
// vercel.json). It hands Express the raw req/res, so the whole API runs as one
// function rather than one function per route — which keeps a single warm
// instance, and therefore a single database pool, instead of N of them.
export { default } from '../server/app.js';
