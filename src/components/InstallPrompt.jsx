import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Share, X } from 'lucide-react';

// "Add Klal to your home screen", offered on a repeat visit to a visitor who
// hasn't installed the app. Chrome and Android expose beforeinstallprompt;
// iPhone has no such event, so there we show the Share → Add to Home Screen
// steps. Push notifications on iPhone only work once installed, which is
// why this is worth asking.
// Never over a form someone is trying to submit. A banner across the bottom of
// a laptop screen covered the "Create account" button, and being asked to
// install an app you have not signed up for yet is the wrong moment anyway.
const NO_PROMPT = ['/login', '/register', '/welcome', '/join', '/forgot-password', '/reset-password', '/add'];

const VISITS_KEY = 'kc_visits';
const SNOOZE_KEY = 'kc_install_snoozed';
const SNOOZE_DAYS = 14;

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

function countVisit() {
  try {
    const n = Number(localStorage.getItem(VISITS_KEY) || 0) + 1;
    localStorage.setItem(VISITS_KEY, String(n));
    return n;
  } catch { return 0; }
}
function snoozed() {
  try { const t = Number(localStorage.getItem(SNOOZE_KEY) || 0); return t && Date.now() - t < SNOOZE_DAYS * 86400e3; } catch { return false; }
}

export default function InstallPrompt() {
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || snoozed()) return;
    const visits = countVisit();
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); if (visits >= 2) setShow(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    if (isIOS() && visits >= 2) { setIos(true); setShow(true); }
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => { setShow(false); try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch { /* fine */ } };
  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* dismissed */ }
    setShow(false);
  };

  const blocked = NO_PROMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!show || blocked) return null;
  return <div className="fixed inset-x-3 bottom-20 z-[105] mx-auto max-w-md rounded-2xl bg-brand-navy p-4 text-sm text-white shadow-lg md:inset-x-auto md:right-4 md:bottom-4 md:mx-0 md:w-[22rem]">
    <div className="flex items-start gap-3">
      <Download size={18} className="mt-0.5 shrink-0 text-[#f3c66a]" />
      <div className="flex-1">
        <p className="font-semibold">Add Klal to your home screen</p>
        {ios
          ? <p className="mt-1 text-white/80">Tap <Share size={13} className="inline -mt-0.5" /> Share in Safari, then <b>Add to Home Screen</b>. Klal opens like an app, and you can get notified when someone vouches for you or answers your ask.</p>
          : <p className="mt-1 text-white/80">Opens like an app, works offline for what you have seen, and can notify you when someone vouches for you or answers your ask.</p>}
        <div className="mt-3 flex items-center gap-3">
          {!ios && <button onClick={install} className="rounded-xl bg-[#f3c66a] px-3 py-1.5 text-xs font-bold text-[#0b2c38]">Install</button>}
          <button onClick={dismiss} className="text-xs text-white/60 hover:text-white">Not now</button>
        </div>
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-white/60 hover:text-white"><X size={16} /></button>
    </div>
  </div>;
}
