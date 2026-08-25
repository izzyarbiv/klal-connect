import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function ThemeToggle(){
  const { theme, toggle } = useTheme();
  return <button onClick={toggle} aria-label="Toggle dark mode" className="icon-button">
    {theme==='dark' ? <Sun size={18}/> : <Moon size={18}/>}
  </button>;
}