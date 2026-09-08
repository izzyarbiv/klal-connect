import React,{useEffect,useState} from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Image } from '@/components/ui/image';
import { ArrowLeft, MapPin, Briefcase, Users } from 'lucide-react';
import ConnectButton from '@/components/ConnectButton';
import MessageButton from '@/components/MessageButton';
import WorkExperienceTimeline from '@/components/WorkExperienceTimeline';
import PeopleYouMayKnow from '@/components/PeopleYouMayKnow';
import { loadMyConnections, suggestSimilar, connectedIds, topJob } from '@/lib/connections';
import { AFFILIATION_BY_ID, PROFILE_TYPES } from '@/lib/affiliations';
import ProfileBanner from '@/components/ProfileBanner';
import { companyPath } from '@/lib/paths';

export default function PublicProfile(){
  const { id } = useParams();
  const [me,setMe]=useState();
  const [user,setUser]=useState();
  const [connections,setConnections]=useState({ sent:[], received:[], all:[] });
  const [suggestions,setSuggestions]=useState([]);
  const [companies,setCompanies]=useState({});
  const [connectionCount,setConnectionCount]=useState(null);
  const [loading,setLoading]=useState(true);

  const reload = async () => { if (me) setConnections(await loadMyConnections(me.id)); };

  useEffect(()=>{(async()=>{
    if(!await api.auth.isAuthenticated()) return api.auth.redirectToLogin(location.href);
    const [u, target] = await Promise.all([ api.auth.me(), api.entities.User.get(id).catch(()=>null) ]);
    setMe(u); setUser(target);
    if(!target){ setLoading(false); return; }
    const conn = await loadMyConnections(u.id);
    setConnections(conn);
    setLoading(false);
    // Everything below is decoration; the page is already usable.
    suggestSimilar(target, u.id, [...connectedIds(conn)]).then(setSuggestions).catch(()=>{});
    // Experience entries link to the company's own Klal page when one exists,
    // matched by name — a member types "Banquest", the directory has Banquest.
    api.entities.Company.filter({ status:'published' }).then(rows=>{
      const byName={}; for(const c of rows){ if(c.name) byName[c.name.trim().toLowerCase()]=companyPath(c); }
      setCompanies(byName);
    }).catch(()=>{});
    // Their accepted connections, counted from what this viewer may read.
    Promise.all([api.entities.Connection.filter({ requester_id:id, status:'accepted' }), api.entities.Connection.filter({ recipient_id:id, status:'accepted' })])
      .then(([a,b])=>setConnectionCount(a.length+b.length)).catch(()=>{});
  })()},[id]);

  if (loading) return <div className="loading">Loading profile…</div>;
  if (!user) return <div className="empty">This community member could not be found.</div>;

  const job = topJob(user);
  const initials = (user.full_name || user.email || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
  const typeLabel = PROFILE_TYPES.find((t) => t.id === user.profile_type)?.label;
  const affiliation = user.affiliation && user.affiliation !== 'private' ? AFFILIATION_BY_ID[user.affiliation]?.label : null;
  const isMe = me?.id === user.id;

  return <div className="page-shell max-w-3xl py-8">
    <Link to="/people" className="mb-5 flex items-center gap-2 text-sm font-semibold text-brand-teal"><ArrowLeft size={17}/>Back to people</Link>

    <section className="overflow-hidden rounded-3xl bg-brand-surface shadow-sm ring-1 ring-brand-line">
      <ProfileBanner url={user.banner_url} className="rounded-t-3xl"/>
      {/* Only the avatar overlaps the cover, the way a profile photo sits on a
          cover photo. The name and everything after it start below the banner
          — pulling the whole row up put the text on top of the image whenever
          it ran taller than the avatar. */}
      <div className="px-6 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="relative z-10 -mt-12 sm:-mt-14">
            {user.avatar_url
              ? <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-brand-surface sm:h-28 sm:w-28"><Image src={user.avatar_url} fittingType="fill" className="h-24 w-24 sm:h-28 sm:w-28"/></div>
              : <div className="grid h-24 w-24 place-items-center rounded-full bg-brand-tint text-2xl font-bold text-brand-teal ring-4 ring-brand-surface sm:h-28 sm:w-28">{initials}</div>}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-3">
            {isMe
              ? <Link to="/profile" className="secondary">Edit profile</Link>
              : <><ConnectButton targetId={user.id} me={me} connections={connections} onReload={reload}/><MessageButton targetId={user.id} me={me} connections={connections}/></>}
          </div>
        </div>
        <div className="mt-3 min-w-0">
          <h1 className="text-2xl font-bold text-brand-ink">{user.full_name || 'Community member'}</h1>
          {user.headline && String(user.headline).trim() && <p className="mt-0.5 line-clamp-2 text-base text-brand-body">{user.headline}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {typeLabel && <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-teal">{typeLabel}</span>}
            {affiliation && <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-teal">{affiliation}</span>}
          </div>
          <div className="mt-3 space-y-1 text-sm text-brand-body">
            {job && <p className="flex items-start gap-2"><Briefcase size={14} className="mt-1 shrink-0 text-brand-teal"/><span>{job.title}{job.company ? <>, {companies[job.company.trim().toLowerCase()] ? <Link to={companies[job.company.trim().toLowerCase()]} className="font-semibold text-brand-teal hover:underline">{job.company}</Link> : job.company}</> : ''}</span></p>}
            {user.home_city && <p className="flex items-start gap-2"><MapPin size={14} className="mt-1 shrink-0 text-brand-teal"/><span>{user.home_city}</span></p>}
            {connectionCount > 0 && <p className="flex items-center gap-2"><Users size={14} className="shrink-0 text-brand-teal"/>{connectionCount} {connectionCount === 1 ? 'connection' : 'connections'}</p>}
            {user.invited_by_name && <p className="text-xs text-brand-muted">Invited to Klal by {user.invited_by_id ? <Link to={`/profile/${user.invited_by_id}`} className="font-semibold text-brand-teal hover:underline">{user.invited_by_name}</Link> : user.invited_by_name}</p>}
          </div>
        </div>
      </div>
    </section>

    {user.bio && <section className="panel space-y-3">
      <h2 className="section-title">About</h2>
      <p className="whitespace-pre-line leading-7 text-brand-body">{user.bio}</p>
    </section>}

    <section className="panel space-y-4">
      <h2 className="section-title">Experience</h2>
      <WorkExperienceTimeline value={user.work_experience} companyLinks={companies}/>
    </section>

    <PeopleYouMayKnow suggestions={suggestions} me={me} connections={connections} onReload={reload}/>
  </div>;
}
