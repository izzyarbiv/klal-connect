// Slug rules shared by the client and the server. They must agree: the client
// links to /directory/<slug> and the server has to resolve the same slug back
// to the same category. Mirrors src/lib/paths.js.
export function slugify(str) {
  return String(str || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
