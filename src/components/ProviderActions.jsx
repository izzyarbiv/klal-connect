import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Phone, MessageCircle, Globe, Bookmark, Share2 } from 'lucide-react';
import PayButton from '@/components/PayButton';
import { notify } from '@/lib/notifications';
import { markEngaged } from '@/lib/engagement';
import { WhatsAppShare, waMessageUrl, WA_GREEN } from '@/components/ShareButton';
import { isSensitiveListing, SENSITIVE_NOTICE } from '@/lib/sensitivity';
const event=(type,p)=>api.entities.ActivityEvent.create({type,provider_id:p.id,category:p.category,city:p.city});
// "I've used them" and vouching live in CommunityTrust, on the listing itself.
export default function ProviderActions({provider}) {
 const [saved,setSaved]=useState(null);
 useEffect(()=>{(async()=>{if(await api.auth.hasAccount()){const s=await api.entities.SavedProvider.filter({provider_id:provider.id});setSaved(s[0]||false)}})()},[provider.id]);
 const gate=()=>api.auth.requireAccount();
 // Calling, texting, saving and sharing stay. What goes is anything that would
 // publish that this member used this listing. See @/lib/sensitivity.
 const sensitive=isSensitiveListing(provider);
 const toggleSave=async()=>{if(!await gate())return;const {data}=await api.functions.invoke('toggleCommunityActivity',{providerId:provider.id,activity:'save'});markEngaged();setSaved(data.active?{id:'active'}:false);if(data.active&&provider.created_by_id){let me={};try{me=await api.auth.me();}catch{};if(me.id!==provider.created_by_id)notify({recipient_id:provider.created_by_id,type:'save',actor:me,target_type:'provider',target_id:provider.id,message:`${me?.full_name||'Someone'} saved your listing`});}};
 const buttons=[['Call Now',Phone,provider.phone?`tel:${provider.phone}`:null,'call'],['Text Now',MessageCircle,(provider.text_phone||provider.phone)?`sms:${provider.text_phone||provider.phone}`:null,'text'],['Visit Website',Globe,provider.website,'profile_view']];
 const waHref=provider.whatsapp?waMessageUrl(provider.whatsapp,`Hi, I found ${provider.name} on Klal Connect (${location.href}) — `):null;
 return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{provider.payment_link_url&&<PayButton url={provider.payment_link_url} targetType="provider" targetId={provider.id} className="col-span-2 sm:col-span-3 flex items-center justify-center gap-2 rounded-xl bg-brand-gold px-3 py-3 text-sm font-bold text-brand-gold-ink hover:opacity-90"/>}{waHref&&<a href={waHref} onClick={()=>event('whatsapp',provider)} target="_blank" rel="noreferrer" className="col-span-2 sm:col-span-3 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-[#0b2c38]" style={{background:WA_GREEN}}><MessageCircle size={17}/>Message on WhatsApp</a>}{buttons.map(([n,I,href,t])=>href&&<a key={n} href={href} onClick={()=>event(t,provider)} target={n==='Visit Website'?'_blank':undefined} rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-3 py-3 text-sm font-semibold text-white"><I size={17}/>{n}</a>)}<button onClick={toggleSave} className="action"><Bookmark size={17}/>{saved?'Saved':'Save'}</button><button onClick={async()=>{try{await navigator.clipboard?.writeText(location.href)}catch{};try{await navigator.share?.({title:provider.name,url:location.href})}catch{};event('share',provider)}} className="action"><Share2 size={17}/>Share</button><WhatsAppShare title={`${provider.name} · ${provider.category} on Klal`} onShare={()=>event('share_whatsapp',provider)}/>{sensitive&&<p className="col-span-2 mt-1 text-xs leading-5 text-brand-muted sm:col-span-3">{SENSITIVE_NOTICE}</p>}</div>;
}