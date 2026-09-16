// Has this visitor actually done something here yet — saved, vouched, marked
// a listing used, or posted?
//
// The install prompt asks a real question ("keep this on your home screen"),
// and it is only a fair question of someone who has found the place useful.
// Asking on arrival covered the search box and the sign-up button, which is
// how a prompt meant to help retention became the first thing in the way.
const KEY = 'kc_engaged';

export function markEngaged() {
  try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private mode; fine */ }
}

export function hasEngaged() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}
