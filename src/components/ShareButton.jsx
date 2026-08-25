import React,{useState} from 'react';
import { Share2, Check } from 'lucide-react';

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