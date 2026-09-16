import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home as HomeIcon, Bookmark, UserRound, ShieldCheck, Newspaper, LayoutGrid, Users, LogOut, Settings } from 'lucide-react';
import Brand from '@/components/Brand';
import ThemeToggle from '@/components/ThemeToggle';
import MobileNotificationBell from '@/components/MobileNotificationBell';
import ShabbosMode from '@/components/ShabbosMode';
import TravelWarningBanner from '@/components/TravelWarningBanner';
import { useDetectLocation } from '@/hooks/useDetectLocation';
import AccountRequiredModal from '@/components/AccountRequiredModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import { accountLinks } from '@/components/GuestPrompt';
import { useAuth } from '@/lib/AuthContext';

const Home = HomeIcon;
// Jobs is deliberately absent until real jobs exist: a nav item that always
// leads to an empty room costs more trust than the feature earns. It is still
// reachable at /jobs, and belongs back here once there is something in it.
const links = [['Home','/',Home],['Resources','/directory',LayoutGrid],['Feed','/feed',Newspaper],['People','/people',Users],['Saved','/saved',Bookmark],['Profile','/profile',UserRound]];
// The phone bar is not the desktop nav with smaller text: eight 47px targets
// with 10px labels is a worse way to reach six places than five bigger ones.
// Saved moves into the desktop nav and the profile page rather than competing
// for a thumb.
const mobileLinks = links.filter(([name]) => name !== 'Saved');
function HeaderAccount() {
  const { user, isGuest, authChecked, logout } = useAuth();
  if (!authChecked) return null;
  if (!user || isGuest) {
    const links = accountLinks(window.location.pathname + window.location.search);
    return <>
      <NavLink to={links.login} className="ml-2 hidden rounded-full px-4 py-2 text-sm font-medium text-brand-ink hover:bg-brand-surface md:inline-flex">Log in</NavLink>
      <NavLink to={links.register} className="rounded-full bg-brand-teal px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 md:px-4 md:py-2">Sign up</NavLink>
    </>;
  }
  return <>
    <button type="button" onClick={() => logout()} className="ml-1 hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-brand-muted hover:bg-brand-surface hover:text-brand-ink md:inline-flex" aria-label="Log out"><LogOut size={16}/><span className="hidden lg:inline">Log out</span></button>
  </>;
}

// Staff get into the review queues from here, on any screen. This used to
// live inside the desktop-only nav, which left an admin on a phone with no
// way into /admin at all.
function StaffLink() {
  const { user, authChecked } = useAuth();
  if (!authChecked || !user) return null;
  if (user.role !== 'admin' && user.role !== 'moderator') return null;
  return <NavLink to="/admin" className={({ isActive }) => `p-2 hover:text-brand-teal ${isActive ? 'text-brand-teal' : 'text-brand-muted'}`} aria-label="Admin" title="Admin"><ShieldCheck size={19}/></NavLink>;
}

// The settings gear sits outside the desktop-only nav: on a phone the bottom
// bar has no room for it, and this is the one place it is always reachable.
function SettingsGear() {
  const { user, isGuest, authChecked } = useAuth();
  if (!authChecked || !user || isGuest) return null;
  return <NavLink to="/settings" className={({ isActive }) => `p-2 hover:text-brand-teal ${isActive ? 'text-brand-teal' : 'text-brand-muted'}`} aria-label="Settings" title="Settings"><Settings size={19}/></NavLink>;
}

export default function AppLayout() {
  useDetectLocation();
  return <div className="min-h-screen bg-brand-canvas text-brand-ink pb-20 md:pb-0">
    <AccountRequiredModal/>
    <ShabbosMode/>
    <TravelWarningBanner/>
    <header className="sticky top-0 z-40 border-b border-brand-line bg-brand-canvas/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4"><Brand/><div className="flex items-center gap-1"><nav className="hidden items-center gap-1 md:flex">{links.map(([n,p])=><NavLink key={n} to={p} className={({isActive})=>`rounded-full px-4 py-2 text-sm font-medium ${isActive?'bg-brand-navy text-white':'text-brand-ink hover:bg-brand-surface'}`}>{n}</NavLink>)}</nav><HeaderAccount/><StaffLink/><SettingsGear/><ThemeToggle/></div></div></header>
    {/* A page that throws should not take the header and the tab bar with it:
        the person needs a way to get somewhere else. The outer boundary in
        App.jsx still catches anything that breaks the layout itself. */}
    <main><ErrorBoundary><Outlet/></ErrorBoundary></main>
    <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 border-t border-brand-line bg-brand-surface pl-[max(.5rem,env(safe-area-inset-left))] pr-[max(.5rem,env(safe-area-inset-right))] pb-[max(.4rem,env(safe-area-inset-bottom))] pt-2 md:hidden">{mobileLinks.map(([n,p,I])=><NavLink key={n} to={p} end={p==='/'||p==='/feed'} className={({isActive})=>`flex flex-col items-center gap-1 text-[11px] ${isActive?'text-brand-teal':'text-brand-muted'}`}><I size={20}/><span>{n}</span></NavLink>)}<MobileNotificationBell/></nav>
  </div>;
}