import { useEffect } from "react";

export const OG_FALLBACK_IMAGE = '/brand/og-image.jpg';

function setMeta(attr, key, value){
  if(!value) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if(!el){ el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', value);
}

export function useMetaTags({ title, description, image, url } = {}){
  useEffect(()=>{
    const prevTitle = document.title;
    if(title) document.title = title;
    const img = image || OG_FALLBACK_IMAGE;
    setMeta('property','og:title', title);
    setMeta('property','og:description', description);
    setMeta('property','og:image', img);
    setMeta('property','og:url', url || window.location.href);
    setMeta('property','og:type','website');
    setMeta('property','og:site_name','Klal Connect');
    setMeta('name','twitter:card','summary_large_image');
    setMeta('name','twitter:title', title);
    setMeta('name','twitter:description', description);
    setMeta('name','twitter:image', img);
    return ()=>{ document.title = prevTitle; };
  },[title,description,image,url]);
}