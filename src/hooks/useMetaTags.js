import { useEffect } from "react";

export const OG_FALLBACK_IMAGE = '/brand/og-image.jpg';

// Every tag this hook manages. Listed so they can all be put back on the way
// out — the previous version restored only the title, so a listing's og:title,
// og:description and og:image stayed in the head after you navigated away and
// described the wrong page. Sharing from that page then shared the last
// listing you happened to look at.
const MANAGED = [
  ['property', 'og:title'], ['property', 'og:description'], ['property', 'og:image'],
  ['property', 'og:url'], ['property', 'og:type'], ['property', 'og:site_name'],
  ['name', 'twitter:card'], ['name', 'twitter:title'],
  ['name', 'twitter:description'], ['name', 'twitter:image'],
];

const tagFor = (attr, key) => document.head.querySelector(`meta[${attr}="${key}"]`);

function setMeta(attr, key, value) {
  // An absent value used to mean "leave whatever is there", which is how a page
  // that sets no description inherited the previous page's. It now clears.
  const el = tagFor(attr, key);
  if (!value) { if (el) el.setAttribute('content', ''); return; }
  const target = el || document.head.appendChild(Object.assign(document.createElement('meta'), {}));
  if (!el) target.setAttribute(attr, key);
  target.setAttribute('content', value);
}

export function useMetaTags({ title, description, image, url } = {}) {
  useEffect(() => {
    const prevTitle = document.title;
    // Snapshot before touching anything, so the page underneath gets its own
    // tags back rather than this page's.
    const prev = MANAGED.map(([attr, key]) => [attr, key, tagFor(attr, key)?.getAttribute('content') ?? null]);

    if (title) document.title = title;
    const img = image || OG_FALLBACK_IMAGE;
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', img);
    setMeta('property', 'og:url', url || window.location.href);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'Klal');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', img);

    return () => {
      document.title = prevTitle;
      for (const [attr, key, content] of prev) {
        const el = tagFor(attr, key);
        if (!el) continue;
        // null means the tag did not exist before this page created it.
        if (content === null) el.remove();
        else el.setAttribute('content', content);
      }
    };
  }, [title, description, image, url]);
}
