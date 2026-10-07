import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { DIRECTORY_CATEGORIES } from '@/lib/categories';
import { Users, Building2, Search, Phone, MessageCircle, Bookmark, CheckCircle2 } from 'lucide-react';
import ShabbosSimulator from '@/components/ShabbosSimulator';
import ShabbosGlobalOverride from '@/components/ShabbosGlobalOverride';
import ReportQueue from '@/components/admin/ReportQueue';
import HealthPanel from '@/components/admin/HealthPanel';
import SearchInsights from '@/components/admin/SearchInsights';
import { iconFor, guessIcon, ICON_NAMES } from '@/lib/categoryIcons';
const configs = [['Pending listings', 'Provider', { status: 'pending' }], ['Claim requests', 'ClaimRequest', { status: 'pending' }], ['Positive notes', 'CommunityNote', { status: 'pending' }], ['Private reports', 'PrivateReport', { status: 'open' }], ['Pending edits', 'ListingChangeRequest', { status: 'pending' }], ['Pending jobs', 'Job', { status: 'pending' }]];
export default function Admin() {const [user, setUser] = useState(),[data, setData] = useState({}),[active, setActive] = useState('Pending listings'),[categories, setCategories] = useState([]),[events, setEvents] = useState([]),[users, setUsers] = useState([]),[providerCount, setProviderCount] = useState(0),[reportCount, setReportCount] = useState(0);useEffect(() => {(async () => {const u = await api.auth.me();setUser(u);if (u.role !== 'admin' && u.role !== 'moderator') return;const results = await Promise.all(configs.map(([, e, q]) => api.entities[e].filter(q)));setData(Object.fromEntries(configs.map((c, i) => [c[0], results[i]])));setCategories(await api.entities.Category.list('order'));setEvents(await api.entities.ActivityEvent.list('-created_date', 500));setUsers(await api.entities.User.list());setProviderCount((await api.entities.Provider.filter({ status: 'published' })).length);
try { setReportCount((await api.entities.ListingReport.list('-created_date', 500)).length); } catch {}
})();}, []);if (!user) return <div className="loading">Checking administrator access…</div>;const isAdmin = user.role === 'admin';if (!isAdmin && user.role !== 'moderator') return <div className="empty m-6">Administrator access is required.</div>;const action = async (item, status) => {const cfg = configs.find((c) => c[0] === active);let next = status;if (status === 'approved' && active === 'Pending listings') next = 'published';if (status === 'approved' && active === 'Positive notes') next = 'published';if (status === 'approved' && active === 'Pending jobs') next = 'published';if (active === 'Claim requests') {
  // Approving a claim used to stamp the request and change nothing about the
  // listing, so the business still could not edit its own page. resolveClaim
  // hands it over: owner_id and claimed, server-side.
  const r = await api.functions.invoke('resolveClaim', { claim_id: item.id, approve: status === 'approved' });
  if (r.status >= 400) { alert(r.data?.error || 'Could not resolve that claim'); return; }
  setData({ ...data, [active]: data[active].filter((x) => x.id !== item.id) });
  return;
}
await api.entities[cfg[1]].update(item.id, { status: next });setData({ ...data, [active]: data[active].filter((x) => x.id !== item.id) });};const stats = [['Total users', users.length, Users], ['Providers', providerCount, Building2], ['Searches', events.filter((e) => e.type === 'search').length, Search], ['Calls', events.filter((e) => e.type === 'call').length, Phone], ['Texts', events.filter((e) => e.type === 'text').length, MessageCircle], ['Saves', '—', Bookmark]];return <div className="page-shell py-5 md:py-9"><span className="eyebrow">ADMINISTRATION</span><h1 className="title text-2xl md:text-3xl">Community operations</h1><div className="my-4 grid grid-cols-3 gap-2 md:my-7 md:gap-3 lg:grid-cols-6">{stats.map(([n, v, I]) => <div className="rounded-lg bg-brand-surface p-3 ring-1 ring-brand-line md:p-5" key={n}><I className="text-brand-teal" size={18} /><strong className="mt-2 block text-xl md:mt-3 md:text-2xl">{v}</strong><span className="text-[11px] leading-tight text-brand-muted md:text-xs">{n}</span></div>)}</div><div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:gap-6 lg:grid-cols-[240px_1fr]"><aside className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:block lg:space-y-2 lg:overflow-visible lg:px-0">{configs.map(([n]) => <button key={n} onClick={() => setActive(n)} className={`admin-nav shrink-0 ${active === n ? 'admin-nav-active' : ''}`}><span>{n}</span><b>{data[n]?.length || 0}</b></button>)}<button onClick={() => setActive('Listing reports')} className={`admin-nav shrink-0 ${active === 'Listing reports' ? 'admin-nav-active' : ''}`}><span>Listing reports</span><b>{reportCount}</b></button><button onClick={() => setActive('Insights')} className={`admin-nav shrink-0 ${active === 'Insights' ? 'admin-nav-active' : ''}`}><span>What people want</span><b>{events.filter((e) => e.type === 'search' && e.zero_result).length}</b></button>{isAdmin && <><button onClick={() => setActive('Shabbos tools')} className={`admin-nav shrink-0 ${active === 'Shabbos tools' ? 'admin-nav-active' : ''}`}><span>Shabbos tools</span></button><button onClick={() => setActive('Health')} className={`admin-nav shrink-0 ${active === 'Health' ? 'admin-nav-active' : ''}`}><span>Health</span><b>·</b></button><button onClick={() => setActive('Categories')} className={`admin-nav shrink-0 ${active === 'Categories' ? 'admin-nav-active' : ''}`}><span>Categories</span><b>{categories.length}</b></button><button onClick={() => setActive('Users')} className={`admin-nav shrink-0 ${active === 'Users' ? 'admin-nav-active' : ''}`}><span>Users</span><b>{users.length}</b></button></>}</aside><section className="min-w-0 md:my-3">{active === 'Shabbos tools' ? <div className="space-y-4"><ShabbosGlobalOverride />{isAdmin && <ShabbosSimulator />}</div> : active === 'Health' ? <HealthPanel /> : active === 'Insights' ? <SearchInsights events={events} /> : active === 'Listing reports' ? <ReportQueue user={user} /> : active === 'Categories' ? <CategoryAdmin items={categories} setItems={setCategories} /> : active === 'Users' ? <UserList users={users} me={user} onUpdate={(r) => setUsers(users.map((x) => x.id === r.id ? { ...x, ...r } : x))} onRole={async (u, role) => { try { const r = await api.admin.setRole(u.id, role); setUsers(users.map((x) => x.id === u.id ? { ...x, role: r.role } : x)); } catch (e) { alert(e.message || 'Could not change role'); } }} /> : <Queue title={active} items={data[active] || []} onAction={action} users={users} />}</section></div></div>;}
// A claim asks staff to hand a business page from one person to another, and
// the card showed the claimant's own typed text for the listing name with
// nothing else — not who filed it, not the verification details they were
// asked for. Approving acts on provider_id, so the one thing staff read was
// the one thing the claimant chose freely. The name comes off the listing
// record now (see createClaim), and the rest of the decision is on the card.
function ClaimFacts({ x, users }) {
  const who = users?.find((u) => u.id === x.created_by_id);
  const rows = [
    ['Filed by', who ? (who.full_name ? `${who.full_name} · ${who.email}` : who.email) : 'a member who is no longer listed'],
    ['Says they are', x.relationship],
    ['Business email', x.business_email],
    ['Business phone', x.business_phone],
    ['How to check', x.verification_details],
  ].filter(([, v]) => v);
  return <dl className="mt-2 space-y-1 text-sm">{rows.map(([k, v]) => <div key={k} className="flex flex-wrap gap-x-2"><dt className="font-semibold text-brand-ink">{k}:</dt><dd className="min-w-0 text-brand-body">{v}</dd></div>)}</dl>;
}
function Queue({ title, items, onAction, users }) {return <div className="panel"><h2 className="section-title mb-4">{title}</h2>{items.length === 0 ? <p className="helper">Queue is clear.</p> : items.map((x) => <div key={x.id} className="border-b py-4 last:border-0"><strong>{x.name || x.title || x.provider_name || 'Submission'}</strong>{x.verification_details ? <ClaimFacts x={x} users={users} /> : <p className="mt-1 text-sm text-brand-body">{x.short_description || x.description || x.body || x.message || x.relationship || x.changes}</p>}{x.target_type === 'post' && x.target_id && <a href={`/feed?post=${encodeURIComponent(x.target_id)}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-teal hover:underline">Open the reported post ↗</a>}{x.verification_details && !x.provider_id && <p className="mt-2 text-sm font-semibold text-brand-error">This claim names no listing on the site, so approving it cannot hand anything over. Find or add the listing first.</p>}{x.provider_id && <a href={`/add?edit=${encodeURIComponent(x.provider_id)}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-teal hover:underline">Open the listing to edit ↗</a>}<div className="mt-3 flex gap-2"><button onClick={() => onAction(x, title === 'Private reports' ? 'resolved' : 'approved')} className="primary py-2"><CheckCircle2 size={15} />Approve / resolve</button><button onClick={() => onAction(x, 'rejected')} className="secondary py-2">Reject</button></div></div>)}</div>;}
// A category with no icon showed the generic dots, which is what happened to
// "Mikva". The icon is guessed from the name and can be changed here.
function CategoryAdmin({ items, setItems }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [busy, setBusy] = useState(false);
  const chosen = icon || guessIcon(name);
  const add = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const x = await api.entities.Category.create({
        name: name.trim(),
        slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        icon: chosen,
        order: items.length + 1,
        subcategories: [],
        active: true,
      });
      setItems([...items, x]); setName(''); setIcon('');
    } finally { setBusy(false); }
  };
  const setCategoryIcon = async (x, next) => {
    const updated = await api.entities.Category.update(x.id, { icon: next });
    setItems(items.map((i) => (i.id === x.id ? { ...i, ...updated } : i)));
  };
  const remove = async (x) => {
    if (!window.confirm(`Remove the "${x.name}" category? Listings in it keep their category name but it stops appearing in the directory.`)) return;
    await api.entities.Category.delete(x.id);
    setItems(items.filter((i) => i.id !== x.id));
  };
  // Categories added to the code do nothing for a directory that is already
  // running: the seeder only touches a fresh database, and putting them in by
  // hand here meant retyping the icon and the subcategories from memory. This
  // adds the ones the app expects and the database has not got — by name, so
  // it is safe to press twice and it never touches a category already there.
  const missing = DIRECTORY_CATEGORIES.filter((c) => !items.some((i) => (i.name || '').trim().toLowerCase() === c.name.toLowerCase()));
  const [addedCount, setAddedCount] = useState(0);
  const [addErr, setAddErr] = useState('');
  const addMissing = async () => {
    if (!missing.length || busy) return;
    setBusy(true); setAddErr('');
    const made = [];
    try {
      for (const c of missing) {
        made.push(await api.entities.Category.create({
          name: c.name,
          slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          icon: c.icon,
          order: c.order,
          subcategories: c.subcategories || [],
          active: true,
        }));
      }
      setAddedCount(made.length);
    } catch (e) {
      setAddErr(e.message || 'Could not add them all — press again to pick up where it stopped.');
    } finally {
      // Whatever was created is shown even if one failed partway, so pressing
      // again adds only the rest.
      if (made.length) setItems([...items, ...made]);
      setBusy(false);
    }
  };
  const Preview = iconFor(chosen);
  return <div className="panel">
    <h2 className="section-title">Category management</h2>
    <p className="helper">The icon is guessed from the name — "Mikva" gets a water drop — and you can pick a different one.</p>
    {missing.length > 0 && <div className="mt-4 rounded-lg bg-brand-gold-bg p-4">
      <p className="text-sm font-semibold text-brand-gold-ink">{missing.length} categor{missing.length === 1 ? 'y' : 'ies'} the app expects {missing.length === 1 ? 'is' : 'are'} not here yet</p>
      <p className="mt-1 text-sm text-brand-gold-ink">{missing.map((c) => c.name).join(', ')}</p>
      <button onClick={addMissing} disabled={busy} className="primary mt-3 text-sm disabled:opacity-60">{busy ? 'Adding…' : `Add ${missing.length === 1 ? 'it' : 'all ' + missing.length}`}</button>
    </div>}
    {addedCount > 0 && missing.length === 0 && <p className="success mt-4 p-3">Added {addedCount}. The directory and the listing form offer them now.</p>}
    {addErr && <p className="mt-3 text-sm font-semibold text-brand-error">{addErr}</p>}
    <div className="my-4 flex flex-wrap items-center gap-2">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand-teal"><Preview size={20}/></span>
      <input className="field mt-0 min-w-[10rem] flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" />
      <select className="field mt-0 w-auto" value={chosen} onChange={(e) => setIcon(e.target.value)} aria-label="Icon">
        {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <button onClick={add} disabled={busy || !name.trim()} className="primary disabled:opacity-60">Add</button>
    </div>
    {items.map((x) => { const I = iconFor(x.icon && x.icon !== 'MoreHorizontal' ? x.icon : guessIcon(x.name)); return <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-3">
      <span className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-tint text-brand-teal"><I size={16}/></span>{x.order}. {x.name}</span>
      <span className="flex items-center gap-2">
        <select className="field mt-0 w-auto py-1 text-xs" value={x.icon || guessIcon(x.name)} onChange={(e) => setCategoryIcon(x, e.target.value)} aria-label={`Icon for ${x.name}`}>
          {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={() => remove(x)} className="text-sm text-brand-error">Remove</button>
      </span>
    </div>; })}
  </div>;
}
function UserList({ users, me, onRole, onUpdate }) {return <div className="panel"><h2 className="section-title mb-4">User management</h2><p className="helper mb-3">Moderators see the review queues and can approve, reject and resolve. Only admins manage categories, users and verification. "Reset password" hands you a temporary password to pass on — the member should change it from their profile.</p>{users.map((u) => <UserRow key={u.id} u={u} me={me} onRole={onRole} onUpdate={onUpdate} />)}</div>;}
function UserRow({ u, me, onRole, onUpdate }) {const [edit, setEdit] = useState(false),[name, setName] = useState(u.full_name || ''),[headline, setHeadline] = useState(u.headline || ''),[clearMedia, setClearMedia] = useState(false),[temp, setTemp] = useState(''),[busy, setBusy] = useState(false),[err, setErr] = useState('');const isGuest = u.email === 'guest@klal.app';const run = async (fn) => {setBusy(true);setErr('');try { await fn(); } catch (e) { setErr(e.message || 'Something went wrong'); }setBusy(false);};const save = () => run(async () => {const patch = { full_name: name, headline };if (clearMedia) { patch.avatar_url = ''; patch.banner_url = ''; patch.work_experience = []; patch.bio = ''; patch.home_city = ''; patch.phone = ''; }onUpdate(await api.admin.updateUser(u.id, patch));setEdit(false);});const reset = () => run(async () => {if (!window.confirm(`Give ${u.full_name || u.email} a new temporary password? Their current one stops working.`)) return;const r = await api.admin.resetPassword(u.id);setTemp(r.temp_password);});const toggleDisabled = () => run(async () => {onUpdate(await api.admin.updateUser(u.id, { disabled: !u.disabled }));});const markVerified = () => run(async () => {onUpdate(await api.admin.updateUser(u.id, { verified: true }));});return <div className="border-b py-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><span className="min-w-0 truncate">{u.full_name || u.email}{u.disabled && <span className="ml-2 rounded-full bg-brand-line px-2 py-0.5 text-[10px] font-bold text-brand-muted">DEACTIVATED</span>}{!isGuest && u.verified === false && <span className="ml-2 rounded-full bg-brand-gold-bg px-2 py-0.5 text-[10px] font-bold text-brand-gold-ink" title="Has not entered an email code; will be asked for one at log in once email is on">UNVERIFIED</span>}<span className="ml-2 text-xs text-brand-muted">{u.email}</span></span><span className="flex flex-wrap items-center gap-2">{u.id === me.id ? <b>{u.role}</b> : <select className="field mt-0 w-auto py-1 text-xs" value={u.role} onChange={(e) => onRole(u, e.target.value)} disabled={isGuest}><option value="user">user</option><option value="moderator">moderator</option><option value="admin">admin</option></select>}<button type="button" onClick={() => setEdit((v) => !v)} className="secondary py-1 text-xs">{edit ? 'Cancel' : 'Edit'}</button>{!isGuest && u.id !== me.id && <button type="button" disabled={busy} onClick={reset} className="secondary py-1 text-xs">Reset password</button>}{u.id !== me.id && !isGuest && <button type="button" disabled={busy} onClick={toggleDisabled} className="secondary py-1 text-xs">{u.disabled ? 'Reactivate' : 'Deactivate'}</button>}{!isGuest && u.verified === false && <button type="button" disabled={busy} onClick={markVerified} className="secondary py-1 text-xs" title="Skip the email code for this member">Mark verified</button>}</span></div>{edit && <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs">Name<input className="field" value={name} onChange={(e) => setName(e.target.value)} /></label><label className="text-xs">Headline<input className="field" value={headline} onChange={(e) => setHeadline(e.target.value)} /></label><label className="flex items-center gap-2 text-xs sm:col-span-2"><input type="checkbox" checked={clearMedia} onChange={(e) => setClearMedia(e.target.checked)} />Also clear photo, banner, bio, city, phone and work experience</label><div className="sm:col-span-2"><button type="button" disabled={busy} onClick={save} className="primary py-1.5 text-xs">Save</button></div></div>}{temp && <p className="mt-2 rounded-xl bg-brand-gold-bg p-3 text-xs text-brand-gold-ink">Temporary password for <b>{u.email}</b> — shown once, copy it now: <code className="select-all font-mono text-sm font-bold">{temp}</code></p>}{err && <p className="mt-2 text-xs font-semibold text-brand-error">{err}</p>}</div>;}