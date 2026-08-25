import { useEffect, useState } from "react";

export function useTheme(){
  const [theme,setTheme]=useState(()=>{
    if(typeof window==='undefined') return 'light';
    const stored=localStorage.getItem('kc-theme');
    if(stored==='dark'||stored==='light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(()=>{
    const root=document.documentElement;
    if(theme==='dark') root.classList.add('dark'); else root.classList.remove('dark');
    // Mirrors the pre-paint script in index.html so toggling keeps native
    // controls in step; that script owns the initial value.
    root.style.colorScheme=theme;
    localStorage.setItem('kc-theme',theme);
  },[theme]);
  return { theme, toggle: ()=>setTheme(t=>t==='dark'?'light':'dark') };
}