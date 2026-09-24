import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// The community someone is looking at, remembered across the site.
//
// Choosing a community on the homepage and then finding the directory had
// forgotten it is the difference between a product and a pile of pages. The
// choice lives in the URL first, so a link carries it to whoever it is sent
// to, and in localStorage as well so it survives a new tab.

const KEY = 'kc_community';

export function readStoredCommunity() {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}

export function storeCommunity(name) {
  // Wrapped: a private window throws on write, and remembering the community
  // is a convenience — the URL is the copy that matters.
  try {
    if (name) localStorage.setItem(KEY, name);
    else localStorage.removeItem(KEY);
  } catch { /* no-op */ }
}

/**
 * The selected community, and a setter that persists it.
 *
 * Precedence is URL, then what was remembered, then `fallback` — which
 * arrives late (it comes from the signed-in member's own city), so it is
 * adopted only while nothing has been chosen, and never written to the URL:
 * a guess about where someone lives should not end up in a shared link.
 */
export function useCommunity(fallback = '') {
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get('community') || '';
  const [community, setLocal] = useState(() => fromUrl || readStoredCommunity());

  // Both effects deliberately watch one value and read the other. Depending on
  // `community` as well would re-run them on every change it makes, and the
  // second would then fight anyone who cleared the community back to
  // "everywhere" by immediately reinstating the fallback.
  //
  // A shared link decides, and what it decides is then remembered.
  useEffect(() => { if (fromUrl && fromUrl !== community) setLocal(fromUrl); }, [fromUrl]);
  useEffect(() => { if (!community && fallback) setLocal(fallback); }, [fallback]);
  useEffect(() => { storeCommunity(community); }, [community]);

  const setCommunity = useCallback((name) => {
    setLocal(name || '');
    // replace, not push: choosing a community is a filter, not a place in
    // history — the back button should leave the page, not undo a chip.
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (name) next.set('community', name); else next.delete('community');
      return next;
    }, { replace: true });
  }, [setParams]);

  return [community, setCommunity];
}
