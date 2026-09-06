import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Phone, MessageCircle, Globe, Bookmark, Share2, Users } from 'lucide-react';
import { notify } from '@/lib/notifications';
const event=(type,p)=>api.entities.ActivityEvent.create({type,provider_id:p.id,category:p.category,city:p.city});
export default function ProviderActions({provider}) {
 const [saved,setSaved]=useState(null),[used,setUsed]=useState(null);
 useEffect(()=>{(async()=>{if(await api.auth.isAuthenticated()){const [s,u]=await Promise.all([api.entities.SavedProvider.filter({provider_id:provider.id}),api.entities.ProviderUsage.filter({provider_id:provider.id})]);setSaved(s[0]||false);setUsed(u[0]||false)}})()},[provider.id]);
 const gate=()=>api.auth.requireAccount();
 const toggleSave=async()=>{if(!await gate())return;const {data}=await api.functions.invoke('toggleCommunityActivity',{providerId:provider.id,activity:'save'});setSaved(data.active?{id:'active'}:false);if(data.active&&provider.created_by_id){let me={};try{me=await api.auth.me();}catch{};if(me.id!==provider.created_by_id)notify({recipient_id:provider.created_by_id,type:'save',actor:me,target_type:'provider',target_id:provider.id,message:`${me?.full_name||'Someone'} saved your listing`});}};
 const toggleUsed=async()=>{if(!await gate())return;const {data}=await api.functions.invoke('toggleCommunityActivity',{providerId:provider.id,activity:'use'});setUsed(data.active?{id:'active'}:false)};
 const buttons=[['Call Now',Phone,`tel:${provider.phone}`,'call'],['Text Now',MessageCircle,`sms:${provider.text_phone||provider.phone}`,'text'],['Visit Website',Globe,provider.website,'profile_view']];
 return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{buttons.map(([n,I,href,t])=>href&&<a key={n} href={href} onClick={()=>event(t,provider)} target={n==='Visit Website'?'_blank':undefined} rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-3 py-3 text-sm font-semibold text-white"><I size={17}/>{n}</a>)}<button onClick={toggleSave} className="action"><Bookmark size={17}/>{saved?'Saved':'Save'}</button><button onClick={async()=>{try{await navigator.clipboard?.writeText(location.href)}catch{};try{await navigator.share?.({title:provider.name,url:location.href})}catch{};event('share',provider)}} className="action"><Share2 size={17}/>Share</button><button onClick={toggleUsed} className="action col-span-2 sm:col-span-1"><Users size={17}/>{used?'Used ✓':"I've Used This"}</button></div>;
}