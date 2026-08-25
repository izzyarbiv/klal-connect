import React from 'react';
import { Link } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import { MapPin, Briefcase } from 'lucide-react';
import { topJob } from '@/lib/connections';
import Headline from '@/components/Headline';

export default function UserCard({ user, me, connections, onReload }){
  const job = topJob(user);
  const initials = (user.full_name || user.email || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
  return <div className="panel space-y-3">
    <Link to={`/profile/${user.id}`} className="flex items-center gap-3">
      {user.avatar_url
        ? <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-brand-line"><Image src={user.avatar_url} fittingType="fill" className="h-14 w-14"/></div>
        : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-tint text-lg font-bold text-brand-teal">{initials}</div>}
      <div className="min-w-0">
        <p className="truncate font-semibold text-brand-ink">{user.full_name || 'Community member'}</p>
        <Headline text={user.headline}/>
        <p className="text-sm capitalize text-brand-teal">{(user.profile_type || 'community_member').replace('_', ' ')}</p>
      </div>
    </Link>
    {job && <p className="flex items-center gap-2 text-sm text-brand-body"><Briefcase size={14} className="shrink-0 text-brand-teal"/>{job.title}{job.company ? `, ${job.company}` : ''}</p>}
    {user.home_city && <p className="flex items-center gap-2 text-sm text-brand-body"><MapPin size={14} className="shrink-0 text-brand-teal"/>{user.home_city}</p>}
    <ConnectInline targetId={user.id} me={me} connections={connections} onReload={onReload}/>
  </div>;
}

import ConnectButton from '@/components/ConnectButton';
function ConnectInline(props){ return <ConnectButton {...props} size="sm"/>; }