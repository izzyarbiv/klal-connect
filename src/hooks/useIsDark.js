import { useEffect, useState } from 'react';

// Whether the page is currently in dark mode, kept in step with the `dark`
// class that useTheme (and the pre-paint script in index.html) put on <html>.
//
// Read from the DOM rather than from useTheme so a component deep in the tree
// does not need the toggle's state threaded down to it, and so it follows a
// toggle made anywhere on the page.
const isDark = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

export function useIsDark() {
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    setDark(isDark());
    return () => observer.disconnect();
  }, []);
  return dark;
}
