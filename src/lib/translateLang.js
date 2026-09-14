// The viewer's translation target persists locally rather than per-post: once
// someone picks Yiddish, every "Translate" click on the site should use it,
// not just the one post they clicked from.
const KEY = 'kc_translate_lang';
const SUPPORTED = ['en', 'he', 'yi', 'es', 'fr', 'ru'];

export function preferredTranslateLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch { /* private browsing, etc — fall through to a guess */ }
  const nav = String(navigator.language || 'en').slice(0, 2).toLowerCase();
  return SUPPORTED.includes(nav) ? nav : 'en';
}

export function setPreferredTranslateLang(code) {
  try { localStorage.setItem(KEY, code); } catch { /* nothing to persist to */ }
}
