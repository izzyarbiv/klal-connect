import { api } from '@/api/client';

// Resolve the specific members a page needs, by id.
//
// Several pages used to fetch a page of the directory — User.list(…, 200) — and
// look people up in it. That works until the community passes 200 members, and
// then it fails quietly and unevenly: a conversation loses its name and avatar,
// and worse, Messages dropped any connection outside that window from "Your
// connections" entirely, so there was no way left to start a conversation with
// them. Nothing errored; people simply went missing.
//
// Asking for the handful of ids actually on screen is correct at any size, and
// on a normal page it is fewer rows than the old bulk fetch.

// Survives a page's lifetime, so revisiting a conversation list costs nothing.
const cache = new Map();

/**
 * A Map of id → member (or null when there is no such visible member).
 *
 * Only successes are cached. A failed request is left uncached on purpose:
 * caching a network blip would keep a real member missing for the rest of the
 * session, which is the mistake the guest-id lookup made on the server.
 */
export async function membersByIds(ids) {
  const wanted = [...new Set((ids || []).filter(Boolean))];
  const missing = wanted.filter((id) => !cache.has(id));
  await Promise.all(missing.map(async (id) => {
    try {
      const row = await api.entities.User.get(id);
      if (row) cache.set(id, row);
    } catch { /* not visible, or the request failed — retried next time */ }
  }));
  return new Map(wanted.map((id) => [id, cache.get(id) ?? null]));
}

/** Drop a member from the cache — after an edit, say. */
export const forgetMember = (id) => cache.delete(id);
