import React,{useEffect,useState} from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Search } from 'lucide-react';
import UserCard from '@/components/UserCard';
import PeopleYouMayKnow from '@/components/PeopleYouMayKnow';
import { loadMyConnections, suggestSimilar, sentThisWeekCount, connectedIds, topJob, WEEKLY_CAP } from '@/lib/connections';
import InviteButton from '@/components/InviteButton';

export default function People(){
  const [me,setMe]=useState();
  const [users,setUsers]=useState([]);
  const [connections,setConnections]=useState({ sent:[], received:[], all:[] });
  const [suggestions,setSuggestions]=useState([]);
  const [q,setQ]=useState('');
  const [loading,setLoading]=useState(true);

  const reload = async () => {
    if (!me) return;
    setConnections(await loadMyConnections(me.id));
  };

  useEffect(()=>{(async()=>{
    if(!await api.auth.isAuthenticated()) return api.auth.redirectToLogin(location.href);
    const u=await api.auth.me(); setMe(u);
    const [allUsers, conn] = await Promise.all([
      api.entities.User.list('-created_date', 200),
      loadMyConnections(u.id),
    ]);
    const ranked = allUsers.filter(x => x.id !== u.id).map(x => ({ user: x }));
    setUsers(ranked);
    setConnections(conn);
    const excluded = [...connectedIds(conn)];
    setSuggestions(await suggestSimilar(u, u.id, excluded));
    setLoading(false);
  })()},[]);

  const conns = connectedIds(connections);
  const filtered = users.filter(({user}) => {
    if (q) {
      const hay = [user.full_name, user.headline, user.home_city, user.profile_type, topJob(user)?.title, topJob(user)?.company].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  if (!me) return <div className="loading">Loading community…</div>;

  const used = sentThisWeekCount(connections.sent);

  return <div className="page-shell space-y-10 py-9">
    <div>
      <span className="eyebrow dark">COMMUNITY</span>
      <h1 className="title">People</h1>
      <p className="helper">Discover community members and connect.{!me.guest && ` You can send up to ${WEEKLY_CAP} connection requests per week.`}</p>
      {!me.guest && <p className="mt-2 text-sm font-semibold text-brand-teal">{used} / {WEEKLY_CAP} sent this week</p>}
      <div className="mt-2 flex gap-4 text-sm font-semibold text-brand-teal">
        <Link to="/companies" className="hover:underline">Browse companies →</Link>
        <Link to="/messages" className="hover:underline">Messages →</Link>
      </div>
      {!me.guest && <div className="mt-4 rounded-2xl bg-brand-tint p-4"><p className="text-sm font-semibold text-brand-ink">Know someone who should be here?</p><p className="mb-3 text-sm text-brand-body">Klal gets better with every person from your community. Anyone who joins through your link is connected to you.</p><InviteButton/></div>}
    </div>

    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA8A2]"/>
      <input className="field pl-9" placeholder="Search by name, city, or company" value={q} onChange={e=>setQ(e.target.value)}/>
    </div>

    {!q && <PeopleYouMayKnow suggestions={suggestions} me={me} connections={connections} onReload={reload}/>}

    <section>
      <div className="section-head"><h2 className="title">{q ? 'Matching profiles' : 'All members'}</h2><Link to="/profile" className="text-sm font-semibold text-brand-teal">My profile</Link></div>
      {loading ? <p className="text-sm text-brand-body">Loading…</p> : filtered.length === 0
        ? <p className="text-sm text-brand-muted">No members found{q ? ` for "${q}"` : ''}.</p>
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(({user})=><UserCard key={user.id} user={user} me={me} connections={connections} onReload={reload}/>)}</div>}
    </section>
  </div>;
}