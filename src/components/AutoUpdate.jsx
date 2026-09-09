import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Takes new builds without asking.
//
// The service worker is still registered in "prompt" mode, which means a new
// version never seizes a tab on its own — but nothing here prompts. This
// applies the update itself, and only picks the moment: reloading while
// someone is halfway through a post, a message or a listing would throw their
// words away, so if anything is being typed the update waits for the next
// page change (where that text is gone anyway) or for the tab to be left.
//
// Long-lived tabs also check for a new build every ten minutes, so someone who
// leaves Klal open all day is not stuck on last week's code.
const CHECK_EVERY_MS = 10 * 60 * 1000;

// Is there text on screen that a reload would destroy?
function isTyping() {
  const active = document.activeElement;
  const editable = (el) => el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName));
  if (editable(active) && String(active.value ?? active.textContent ?? '').trim()) return true;
  for (const el of document.querySelectorAll('textarea, input[type="text"], input:not([type]), [contenteditable="true"]')) {
    if (String(el.value ?? el.textContent ?? '').trim()) return true;
  }
  return false;
}

export default function AutoUpdate() {
  const { pathname } = useLocation();
  const apply = useRef(null);      // the updateSW function, once a build is waiting
  const pending = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    (async () => {
      try {
        // Virtual module from vite-plugin-pwa; absent in dev and in tests.
        const { registerSW } = await import('virtual:pwa-register');
        const updateSW = registerSW({
          immediate: true,
          onRegisteredSW(_url, registration) {
            if (!registration) return;
            timer = setInterval(() => { registration.update().catch(() => {}); }, CHECK_EVERY_MS);
          },
          onNeedRefresh() {
            if (cancelled) return;
            apply.current = updateSW;
            pending.current = true;
            // Nothing to lose right now: take it immediately.
            if (!isTyping()) updateSW(true);
          },
        });
      } catch { /* no service worker here */ }
    })();
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, []);

  // A route change means whatever was typed is gone, so this is the safe
  // moment to swap in the new build.
  useEffect(() => {
    if (pending.current && apply.current && !isTyping()) apply.current(true);
  }, [pathname]);

  // Leaving the tab is the other safe moment.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && pending.current && apply.current) apply.current(true);
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, []);

  return null;
}
