import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

// Offers a reload when a new build is waiting.
//
// The service worker is registered with skipWaiting off, so a new version never
// takes over a tab that is already open — that avoids pairing a fresh shell
// with already-loaded chunks from the previous build. The trade-off is that
// something has to ask, or the update waits until every tab is closed.
export default function UpdatePrompt() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [update, setUpdate] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Virtual module from vite-plugin-pwa; absent in some dev setups.
        const { registerSW } = await import('virtual:pwa-register');
        const updateSW = registerSW({
          onNeedRefresh: () => { if (!cancelled) setNeedsRefresh(true); },
        });
        if (!cancelled) setUpdate(() => updateSW);
      } catch {
        /* no service worker in this environment */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!needsRefresh) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[110] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-brand-navy px-4 py-3 text-sm text-white shadow-lg">
      <RefreshCw size={16} className="shrink-0" />
      <span className="flex-1">A new version of Klal is ready.</span>
      <button
        onClick={() => update?.(true)}
        className="shrink-0 rounded-xl bg-brand-gold px-3 py-1.5 text-xs font-bold text-brand-gold-ink"
      >
        Refresh
      </button>
      <button
        onClick={() => setNeedsRefresh(false)}
        className="shrink-0 text-xs text-white/60 hover:text-white"
        aria-label="Dismiss"
      >
        Later
      </button>
    </div>
  );
}
