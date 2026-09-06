import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import ManageListings from '@/components/ManageListings';
import ManageCompanies from '@/components/ManageCompanies';
import ProfileAvatar from '@/components/ProfileAvatar';
import ProfileBannerEditor from '@/components/ProfileBannerEditor';
import WorkExperienceEditor from '@/components/WorkExperienceEditor';
import NotificationSettings from '@/components/NotificationSettings';
import LocationPicker from '@/components/LocationPicker';
import Headline from '@/components/Headline';
import HeadlineEdit from '@/components/HeadlineEdit';
import { topJob } from '@/lib/connections';
import GuestPrompt from '@/components/GuestPrompt';
import CompletenessRing from '@/components/CompletenessRing';
import { profileCompleteness } from '@/lib/completeness';
import { AFFILIATIONS, PROFILE_TYPES } from '@/lib/affiliations';
import InviteButton from '@/components/InviteButton';

export default function Profile() {
  const [user, setUser] = useState();
  const [form, setForm] = useState({ full_name: '', headline: '', profile_type: 'community_member', home_city: '', phone: '', bio: '', avatar_url: '', banner_url: '', work_experience: [] });
  const [saved, setSaved] = useState(false);

  useEffect(() => {(async () => {
      if (!(await api.auth.isAuthenticated())) return api.auth.redirectToLogin(location.href);
      const u = await api.auth.me();
      setUser(u);
      setForm({
        full_name: u.full_name || '', headline: u.headline || '', profile_type: u.profile_type || 'community_member',
        home_city: u.home_city || '', phone: u.phone || '', bio: u.bio || '', affiliation: u.affiliation || '',
        avatar_url: u.avatar_url || '', banner_url: u.banner_url || '', work_experience: Array.isArray(u.work_experience) ? u.work_experience : []
      });
    })();}, []);

  const submit = async (e) => {
    e.preventDefault();
    const { full_name, profile_type, headline, home_city, phone, bio, avatar_url, banner_url, work_experience, affiliation } = form;
    await api.auth.updateMe({ full_name, profile_type, headline, home_city, phone, bio, avatar_url, banner_url, work_experience, affiliation });
    setSaved(true);
  };

  if (!user) return <div className="loading">Loading profile…</div>;
  if (user.guest) return <GuestPrompt title="Your profile starts with an account" body="You're browsing as a guest, so there is nothing to edit here yet. Create a free account to set up your profile, add work experience, and manage your listings."/>;

  const recentJob = topJob(user);
  const headlineSuggestion = recentJob ? `${recentJob.title}${recentJob.company ? ` — ${recentJob.company}` : ''}` : null;

  return <div className="page-shell max-w-2xl py-9">
    <span className="eyebrow dark">YOUR ACCOUNT</span>
    <h1 className="title text-3xl">Community profile</h1>
    <p className="helper mb-7">Keep a simple profile and an optional general home city. Your exact location is never displayed.</p>

    <div className="panel mb-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-tint text-sm font-bold text-brand-teal">{(user.full_name||'?').split(' ').map(x=>x[0]).slice(0,2).join('')}</div>
        <div className="min-w-0">
          <p className="font-bold text-brand-ink">{user.full_name}</p>
          <Headline text={form.headline} variant="header"/>
        </div>
      </div>
      {(() => { const c = profileCompleteness({ ...user, ...form }); return <CompletenessRing percent={c.percent} next={c.next} label="Profile" onAction={() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })}/>; })()}
    </div>

    <div className="panel mb-5"><p className="font-semibold text-brand-ink">Invite people from your community</p><p className="mb-3 text-sm text-brand-body">Klal works when the people you trust are on it. Your link is yours; anyone who joins through it is connected to you.</p><InviteButton/></div>

    <form onSubmit={submit} className="space-y-5">
      <section className="panel space-y-3">
        <ProfileBannerEditor value={form.banner_url} onChange={(v) => setForm({ ...form, banner_url: v })} />
        <ProfileAvatar user={user} value={form.avatar_url} onChange={(v) => setForm({ ...form, avatar_url: v })} />
      </section>

      <section className="panel space-y-4">
        <label>Name<input className="field" value={form.full_name || ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Your name" /></label>
        <HeadlineEdit label="Headline" value={form.headline} onChange={(v) => setForm({ ...form, headline: v })} suggestion={headlineSuggestion}/>
        <label>Email<input className="field" value={user.email || ''} disabled /><span className="helper">Your sign-in address. Contact us to change it.</span></label>
        <label>Profile type
          <select className="field" value={form.profile_type} onChange={(e) => setForm({ ...form, profile_type: e.target.value })}>
            {PROFILE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label>Community<select className="field" value={form.affiliation || ''} onChange={(e) => setForm({ ...form, affiliation: e.target.value })}><option value="">Not set</option>{AFFILIATIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select><span className="helper">Optional. Used to show you what people in your community use.</span></label>
        <label>General home city<input className="field" value={form.home_city || ''} onChange={(e) => setForm({ ...form, home_city: e.target.value })} /></label>
        <label>Phone<input className="field" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Short bio<textarea className="field min-h-24" value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
      </section>

      <section className="panel space-y-4">
        <div>
          <h2 className="section-title">Experience</h2>
          <p className="helper">Add the roles you've held. They show as a timeline, like a professional profile.</p>
        </div>
        <WorkExperienceEditor value={form.work_experience} onChange={(v) => setForm({ ...form, work_experience: v })} />
      </section>

      <div className="flex items-center gap-3">
        <div className="-mt-2 flex flex-wrap items-center gap-3"><button className="primary">Save profile</button><button type="button" onClick={() => api.auth.logout('/')} className="text-sm font-medium text-brand-muted hover:text-brand-ink hover:underline">Log out</button></div>
        {saved && <span className="text-sm font-semibold text-brand-teal">Saved</span>}
      </div>
    </form>

    <LocationPicker user={user} />
    <NotificationSettings user={user} />
    <ManageListings user={user} />
    <ManageCompanies user={user} />
  </div>;
}