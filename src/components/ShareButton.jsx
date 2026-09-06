import React,{useState} from 'react';
import { Share2, Check, MessageCircle } from 'lucide-react';

// WhatsApp's brand green is used on WhatsApp buttons only — their rule, and a
// useful signal that this button leaves the site.
export const WA_GREEN = '#25D366';
export const waShareUrl = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;
export const waMessageUrl = (digits, text) => `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;

export function WhatsAppShare({ title, url, className='action', onShare }){
  const shareUrl=url||window.location.href;
  return <a href={waShareUrl(`${title||document.title} — ${shareUrl}`)} target="_blank" rel="noreferrer" onClick={onShare} className={className} style={{ color: WA_GREEN }}>
    <MessageCircle size={17}/>Share on WhatsApp
  </a>;
}

export default function ShareButton({ title, url, className='action' }){
  const [copied,setCopied]=useState(false);
  const share=async()=>{
    const shareUrl=url||window.location.href;
    try{ if(navigator.clipboard) await navigator.clipboard.writeText(shareUrl); }catch{}
    if(navigator.share){
      try{ await navigator.share({ title: title||document.title, url: shareUrl }); }catch{}
    } else {
      setCopied(true); setTimeout(()=>setCopied(false),2000);
    }
  };
  return <button type="button" onClick={share} className={className}>
    {copied ? <><Check size={17}/>Link copied</> : <><Share2 size={17}/>Share</>}
  </button>;
}