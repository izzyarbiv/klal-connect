// Which database am I about to write to?
//
// Every CLI here runs with `--env-file-if-exists=.env.local`, which on a
// developer's machine points at a dev database. A command-line DATABASE_URL
// does override it — but run bare, `npm run ensure-categories` writes to dev
// and prints the same cheerful success it would print for production. A
// success message that does not say where it landed is how someone concludes
// production was updated when it was not.
//
// Credentials are never printed: host and database name only.
export function describeTarget(raw = process.env.DATABASE_URL) {
  if (!raw) return { label: 'an in-memory store (no DATABASE_URL)', host: '', database: '' };
  try {
    const u = new URL(raw);
    const database = u.pathname.replace(/^\//, '') || '(default)';
    return { label: `${u.hostname}/${database}`, host: u.hostname, database };
  } catch {
    return { label: '(unparseable DATABASE_URL)', host: '', database: '' };
  }
}

/** Print the target, so no run is ambiguous about what it changed. */
export function announceTarget(what) {
  const { label } = describeTarget();
  console.log(`[${what}] database: ${label}`);
  return label;
}
