import React,{useState} from 'react';
import { api } from '@/api/client';
import { MessageCircle, Eye, ThumbsUp } from 'lucide-react';
import FeedCommentList from '@/components/feed/FeedCommentList';
import FeedPostMenu, { ReportPostForm } from '@/components/feed/FeedPostMenu';
import Headline from '@/components/Headline';
import ReactionPicker, { useReactionPicker } from '@/components/feed/ReactionPicker';
import TranslateToggle from '@/components/TranslateToggle';
import { POST_TYPE_BY_ID, BADGE_TONES, normalizePostType } from '@/lib/postTypes';
import { REACTION_BY_ID, DEFAULT_REACTION, reactionOf, topReactions } from '@/lib/reactions';
import { timeAgo, fullDate } from '@/lib/time';

export default function FeedPostItem({ post, user, onDeleted }) {
  const type=POST_TYPE_BY_ID[normalizePostType(post.post_type)];
  const isAsk=type.id==='question';
  const [mine,setMine]=useState(null),[likes,setLikes]=useState(post.like_count||0),[counts,setCounts]=useState(post.reaction_counts||{}),[showComments,setShowComments]=useState(false),[cc,setCc]=useState(post.comment_count||0),[likeErr,setLikeErr]=useState(''),[helpfulId,setHelpfulId]=useState(post.helpful_comment_id||null),[reporting,setReporting]=useState(false);
  const [translate,setTranslate]=useState({enabled:false,languages:[]});
  const views=post.view_count||0;
  const picker=useReactionPicker();
  React.useEffect(()=>{api.getConfig().then(c=>setTranslate({enabled:!!c.translateEnabled&&!!user&&!user.guest,languages:c.translateLanguages||[]})).catch(()=>{});},[user]);
  React.useEffect(()=>{(async()=>{if(user&&!user.guest){const rows=await api.entities.FeedLike.filter({post_id:post.id});const own=rows.find(r=>r.created_by_id===user.id);setMine(own?reactionOf(own):null);}})();},[post.id,user]);
  // Recording a view returns nothing: the count is the author's, and the
  // author never records one.
  React.useEffect(()=>{if(user&&!user.guest&&post.created_by_id!==user.id){api.functions.invoke('recordPostView',{postId:post.id}).catch(()=>{});}},[post.id,user]);

  const react=async(reaction)=>{
    picker.close();
    if(!(await api.auth.requireAccount()))return;
    const r=await api.functions.invoke('toggleLike',{post_id:post.id,reaction});
    if(r.status>=400){setLikeErr(r.data?.error||'Action unavailable');return;}
    setLikeErr('');if(r.data){setMine(r.data.reaction);setLikes(r.data.like_count);setCounts(r.data.reaction_counts||{});}
  };
  // A plain tap gives a like, or takes back whatever reaction is there.
  const tap=()=>{ if(picker.consumedByPress())return; react(mine||DEFAULT_REACTION); };

  const current=mine?REACTION_BY_ID[mine]:null;
  const top=topReactions(counts);
  // Reactions recorded before the breakdown existed show as plain likes.
  const stack=top.length?top:(likes>0?[REACTION_BY_ID[DEFAULT_REACTION]]:[]);
  // The author sees how many people saw it; nobody else does, and the shared
  // guest session is nobody.
  const showViews=!!user&&!user.guest&&post.created_by_id===user.id;
  const when=timeAgo(post.created_date);

  return <article className="panel space-y-3">
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-tint text-sm font-bold text-brand-teal">{(post.author_name||'KC').split(' ').map(x=>x[0]).slice(0,2).join('')}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate font-semibold text-brand-ink">{post.author_name||'Community member'}</p>
          {when&&<time dateTime={post.created_date} title={fullDate(post.created_date)} className="text-xs text-brand-muted">· {when}</time>}
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${BADGE_TONES[type.tone]}`}>{type.badge}</span>
          {isAsk&&helpfulId&&<span className="rounded-full bg-brand-tint px-2 py-0.5 text-[10px] font-bold text-brand-teal">Answered ✓</span>}
        </div>
        <Headline text={post.author_headline}/>
        {post.business_name&&<p className="text-xs font-medium text-[#0D6B66]">{post.business_name}</p>}
      </div>
      <FeedPostMenu post={post} user={user} onReport={()=>setReporting(true)} onDeleted={onDeleted}/>
    </div>
    <p className="whitespace-pre-line leading-7 text-brand-body">{post.body}</p>
    <TranslateToggle text={post.body} enabled={translate.enabled} languages={translate.languages}/>
    {post.image_urls?.length>0&&<div className="grid gap-2 sm:grid-cols-2">{post.image_urls.map(u=><img key={u} src={u} className="rounded-2xl ring-1 ring-brand-line"/>)}</div>}
    {reporting&&<ReportPostForm post={post} onClose={()=>setReporting(false)}/>}
    {(likes>0||cc>0||showViews)&&<div className="flex items-center gap-3 text-xs text-brand-muted">
      {likes>0&&<span className="flex items-center gap-1"><span className="flex -space-x-1">{stack.map(r=><span key={r.id} className="grid h-5 w-5 place-items-center rounded-full bg-brand-surface text-[13px] ring-1 ring-brand-line" title={r.label}>{r.emoji}</span>)}</span>{likes}</span>}
      {cc>0&&<span>{cc} {isAsk?(cc===1?'answer':'answers'):(cc===1?'comment':'comments')}</span>}
      {showViews&&<span className="ml-auto flex items-center gap-1"><Eye size={14}/>{views} {views===1?'view':'views'}</span>}
    </div>}
    <div className="flex items-center gap-1 border-t pt-3 text-sm text-brand-body">
      <div className="relative" {...picker.hoverProps}>
        <ReactionPicker open={picker.open} current={mine} onPick={react} className="bottom-full left-0 mb-2"/>
        <button type="button" {...picker.pressProps} onClick={tap} aria-label={current?`You reacted ${current.label}. Tap to remove, hold to change.`:'Like. Hold to choose a reaction.'} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold hover:bg-brand-tint ${current?'text-brand-teal':''}`}>
          {current?<span className="text-base leading-none">{current.emoji}</span>:<ThumbsUp size={17}/>}{current?current.label:'Like'}
        </button>
      </div>
      <button onClick={()=>setShowComments(s=>!s)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold hover:bg-brand-tint ${isAsk?'text-brand-navy':''}`}><MessageCircle size={17}/>{isAsk?(helpfulId?'Answers':'Answer'):'Comment'}</button>
      {likeErr&&<span className="ml-auto text-xs font-semibold text-brand-error">{likeErr}</span>}
    </div>
    {showComments&&<FeedCommentList postId={post.id} user={user} authorId={post.created_by_id} isAsk={isAsk} helpfulId={helpfulId} onHelpful={setHelpfulId} onCount={n=>setCc(n)}/>}
  </article>;
}
