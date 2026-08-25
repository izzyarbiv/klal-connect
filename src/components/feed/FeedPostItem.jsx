import React,{useState} from 'react';
import { api } from '@/api/client';
import { Heart, MessageCircle, Eye } from 'lucide-react';
import FeedCommentList from '@/components/feed/FeedCommentList';
import Headline from '@/components/Headline';

export default function FeedPostItem({ post, user }) {
  const [liked,setLiked]=useState(false),[likes,setLikes]=useState(post.like_count||0),[showComments,setShowComments]=useState(false),[cc,setCc]=useState(post.comment_count||0),[views,setViews]=useState(post.view_count||0),[likeErr,setLikeErr]=useState('');
  React.useEffect(()=>{(async()=>{if(user){const mine=await api.entities.FeedLike.filter({post_id:post.id});setLiked(mine.length>0);}})();},[post.id,user]);
  React.useEffect(()=>{if(user&&post.created_by_id!==user.id){api.functions.invoke('recordPostView',{postId:post.id}).then(r=>setViews(r.data.count)).catch(()=>{});}},[post.id,user]);

  const toggleLike=async()=>{
    if(!user)return api.auth.redirectToLogin(location.href);
    const r=await api.functions.invoke('toggleLike',{post_id:post.id});
    if(r.status>=400){setLikeErr(r.data?.error||'Action unavailable');return;}
    setLikeErr('');if(r.data){setLiked(r.data.liked);setLikes(r.data.like_count);}
  };
  const badge=post.post_type==='promotion'?'Promotion':post.post_type==='question'?'Question':null;
  return <article className="panel space-y-3">
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-tint text-sm font-bold text-brand-teal">{(post.author_name||'KC').split(' ').map(x=>x[0]).slice(0,2).join('')}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><p className="truncate font-semibold text-brand-ink">{post.author_name||'Community member'}</p>{badge&&<span className="rounded-full bg-brand-gold-bg px-2 py-0.5 text-[10px] font-bold text-brand-gold-ink">{badge}</span>}</div>
        <Headline text={post.author_headline}/>
        {post.business_name&&<p className="text-xs font-medium text-[#0D6B66]">{post.business_name}</p>}
      </div>
    </div>
    <p className="whitespace-pre-line leading-7 text-brand-body">{post.body}</p>
    {post.image_urls?.length>0&&<div className="grid gap-2 sm:grid-cols-2">{post.image_urls.map(u=><img key={u} src={u} className="rounded-2xl ring-1 ring-brand-line"/>)}</div>}
    {post.created_by_id===user?.id&&<p className="flex items-center gap-1.5 text-xs text-brand-muted"><Eye size={14}/>{views} {views===1?'view':'views'}</p>}
    <div className="flex items-center gap-1 border-t pt-3 text-sm text-brand-body">
      <button onClick={toggleLike} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold hover:bg-brand-tint ${liked?'text-brand-teal':''}`}><Heart size={17} className={liked?'fill-brand-teal':''}/>{likes}</button>
      <button onClick={()=>setShowComments(s=>!s)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold hover:bg-brand-tint"><MessageCircle size={17}/>{cc}</button>
      {likeErr&&<span className="ml-auto text-xs font-semibold text-brand-error">{likeErr}</span>}
    </div>
    {showComments&&<FeedCommentList postId={post.id} user={user} authorId={post.created_by_id} onCount={n=>setCc(n)}/>}
  </article>;
}