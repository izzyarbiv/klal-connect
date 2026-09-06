import React,{useEffect,useState} from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Image } from '@/components/ui/image';
import { ArrowLeft, MapPin, Briefcase } from 'lucide-react';
import ConnectButton from '@/components/ConnectButton';
import MessageButton from '@/components/MessageButton';
import WorkExperienceTimeline from '@/components/WorkExperienceTimeline';
import PeopleYouMayKnow from '@/components/PeopleYouMayKnow';
import { loadMyConnections, suggestSimilar, connectedIds, topJob } from '@/lib/connections';
import Headline from '@/components/Headline';
import { AFFILIATION_BY_ID, PROFILE_TYPES } from '@/lib/affiliations';
import ProfileBanner from '@/components/ProfileBanner';

export default function PublicProfile(){
  const { id } = useParams();
  const [me,setMe]=useState();
  const [user,setUser]=useState();
  const [connections,setConnections]=useState({ sent:[], received:[], all:[] });
  const [suggestions,setSuggestions]=useState([]);
  const [loading,setLoading]=useState(true);

  const reload = async () => { if (me) setConnections(await loadMyConnections(me.id)); };

  useEffect(()=>{(async()=>{
    if(!await api.auth.isAuthenticated()) return api.auth.redirectToLogin(location.href);
    const [u, target] = await Promise.all([ api.auth.me(), api.entities.User.get(id) ]);
    setMe(u); setUser(target);
    const conn = await loadMyConnections(u.id);
    setConnections(conn);
    setSuggestions(await suggestSimilar(target, u.id, [...connectedIds(conn)]));
    setLoading(false);
  })()},[id]);

  if (loading) return <div className="loading">Loading profile…</div>;
  if (!user) return <div className="empty">This community member could not be found.</div>;

  const job = topJob(user);
  const initials = (user.full_name || user.email || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();

  return <div className="page-shell max-w-3xl py-8">
    <Link to="/people" className="mb-5 flex items-center gap-2 text-sm font-semibold text-brand-teal"><ArrowLeft size={17}/>Back to people</Link>

    <section className="overflow-hidden rounded-3xl bg-brand-surface shadow-sm ring-1 ring-brand-line">
      <ProfileBanner url={user.banner_url} className="rounded-t-3xl"/>
      {/* Pulled up over the banner, the way a cover photo and avatar overlap. */}
      {/* relative + z-10: without a stacking context the banner paints over the
          avatar and name that are pulled up beneath it. */}
      <div className="relative z-10 -mt-12 flex flex-wrap items-end gap-5 px-6 pb-6 sm:-mt-14">
        {user.avatar_url
          ? <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full ring-4 ring-brand-surface"><Image src={user.avatar_url} fittingType="fill" className="h-24 w-24"/></div>
          : <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-brand-tint text-2xl font-bold text-brand-teal ring-4 ring-brand-surface">{initials}</div>}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-brand-ink">{user.full_name || 'Community member'}</h1>
          <Headline text={user.headline} variant="header"/>
          <p className="mt-1 text-brand-teal">{PROFILE_TYPES.find((t) => t.id === user.profile_type)?.label || 'Community member'}{user.affiliation && AFFILIATION_BY_ID[user.affiliation] && user.affiliation !== 'private' ? ` · ${AFFILIATION_BY_ID[user.affiliation].label}` : ''}</p>
          {user.invited_by_name && <p className="mt-1 text-xs text-brand-muted">Invited to Klal by {user.invited_by_id ? <Link to={`/profile/${user.invited_by_id}`} className="font-semibold text-brand-teal hover:underline">{user.invited_by_name}</Link> : user.invited_by_name}</p>}
          {job && <p className="mt-1.5 flex items-center gap-2 text-sm text-brand-body"><Briefcase size={14} className="text-brand-teal"/>{job.title}{job.company ? `, ${job.company}` : ''}</p>}
          {user.home_city && <p className="mt-1 flex items-center gap-2 text-sm text-brand-body"><MapPin size={14} className="text-brand-teal"/>{user.home_city}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2"><ConnectButton targetId={user.id} me={me} connections={connections} onReload={reload}/><MessageButton targetId={user.id} me={me} connections={connections}/></div>
      </div>
      {user.bio && <p className="whitespace-pre-line px-6 pb-6 leading-7 text-[#536863]">{user.bio}</p>}
    </section>

    <section className="panel space-y-4">
      <h2 className="section-title">Experience</h2>
      <WorkExperienceTimeline value={user.work_experience}/>
    </section>

    <PeopleYouMayKnow suggestions={suggestions} me={me} connections={connections} onReload={reload}/>
  </div>;
}