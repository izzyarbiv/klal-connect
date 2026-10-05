import React,{memo} from 'react';
import UserCard from '@/components/UserCard';

export default memo(function PeopleYouMayKnow({ suggestions = [], me, connections, onReload }){
  if (!suggestions || suggestions.length === 0) return null;
  return <section>
    <div className="section-head"><div><span className="eyebrow">COMMUNITY</span><h2 className="title">People you may know</h2></div></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{suggestions.map(s => <UserCard key={s.user.id} user={s.user} me={me} connections={connections} onReload={onReload}/>)}</div>
  </section>;
});