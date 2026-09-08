import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import FeedPostItem from '@/components/feed/FeedPostItem';

// The member's most recent posts, so a profile shows what they say, not only
// who they are.
export default function ProfileActivity({ user, me, editable }) {
  const [posts, setPosts] = useState(null);
  useEffect(() => { api.entities.FeedPost.filter({ created_by_id: user.id }, '-created_date', 5).then(setPosts).catch(() => setPosts([])); }, [user.id]);
  if (!posts) return null;
  if (posts.length === 0) {
    if (!editable) return null;
    return <section className="panel space-y-2"><h2 className="section-title">Activity</h2><p className="text-sm text-brand-body">Nothing posted yet. An update, a tip from your field, or an ask — <Link to="/feed" className="font-semibold text-brand-teal hover:underline">post to the feed</Link> and it shows up here.</p></section>;
  }
  return <section className="space-y-4">
    <div className="section-head"><h2 className="section-title">Activity</h2><Link to="/feed" className="text-sm font-semibold text-brand-teal hover:underline">Go to the feed</Link></div>
    {posts.map((p) => <FeedPostItem key={p.id} post={p} user={me} onDeleted={(id) => setPosts((ps) => ps.filter((x) => x.id !== id))}/>)}
  </section>;
}
