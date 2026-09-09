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
import { accountLinks } from '@/components/GuestPrompt';
import { useAuth } from '@/lib/AuthContext';

const Home = HomeIcon;
const links = [['Home','/',Home],['Resources','/directory',LayoutGrid],['Feed','/feed',Newspaper],['People','/people',Users],['Saved','/saved',Bookmark],['Profile','/profile',UserRound]];
function HeaderAccount() {
  const { user, isGuest, authChecked, logout } = useAuth();
  if (!authChecked) return null;
  if (!user || isGuest) {
    const links = accountLinks(window.location.pathname + window.location.search);
    return <>
      <NavLink to={links.login} className="ml-2 rounded-full px-4 py-2 text-sm font-medium text-brand-ink hover:bg-brand-surface">Log in</NavLink>
      <NavLink to={links.register} className="rounded-full bg-brand-teal px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Sign up</NavLink>
    </>;
  }
  return <>
    {(user.role === 'admin' || user.role === 'moderator') && <NavLink to="/admin" className="ml-2 p-2 text-brand-muted hover:text-brand-teal" aria-label="Admin"><ShieldCheck size={19}/></NavLink>}
    <button type="button" onClick={() => logout()} className="ml-1 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-brand-muted hover:bg-brand-surface hover:text-brand-ink" aria-label="Log out"><LogOut size={16}/><span className="hidden lg:inline">Log out</span></button>
  </>;
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
    <header className="sticky top-0 z-40 border-b border-brand-line bg-brand-canvas/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4"><Brand/><div className="flex items-center gap-1"><nav className="hidden items-center gap-1 md:flex">{links.map(([n,p])=><NavLink key={n} to={p} className={({isActive})=>`rounded-full px-4 py-2 text-sm font-medium ${isActive?'bg-brand-navy text-white':'text-brand-ink hover:bg-brand-surface'}`}>{n}</NavLink>)}<HeaderAccount/></nav><SettingsGear/><ThemeToggle/></div></div></header>
    <main><Outlet/></main>
    <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-7 border-t border-brand-line bg-brand-surface pl-[max(.5rem,env(safe-area-inset-left))] pr-[max(.5rem,env(safe-area-inset-right))] pb-[max(.4rem,env(safe-area-inset-bottom))] pt-2 md:hidden">{links.map(([n,p,I])=><NavLink key={n} to={p} end={p==='/'||p==='/feed'} className={({isActive})=>`flex flex-col items-center gap-1 text-[10px] ${isActive?'text-brand-teal':'text-brand-muted'}`}><I size={19}/><span>{n}</span></NavLink>)}<MobileNotificationBell/></nav>
  </div>;
}