'use client';
import { useEffect,useState } from 'react';
import { Moon,Sun } from 'lucide-react';
import { themeKey,resolveTheme } from '@/lib/theme';
export default function ThemeToggle(){
  const [theme,setTheme]=useState<'light'|'dark'>('dark');
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    setTheme(resolveTheme(document.documentElement.dataset.theme));
    const sync=(event:StorageEvent)=>{if(event.key===themeKey||event.key===null){const next=resolveTheme(event.newValue);document.documentElement.dataset.theme=next;setTheme(next);}};
    window.addEventListener('storage',sync);
    const syncLocal=()=>setTheme(resolveTheme(document.documentElement.dataset.theme));
    window.addEventListener('budget-theme-change',syncLocal);
    return()=>{window.removeEventListener('storage',sync);window.removeEventListener('budget-theme-change',syncLocal)};
  },[]);
  function toggle(){
    const next=theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=next;setTheme(next);
    window.dispatchEvent(new Event('budget-theme-change'));
    try{localStorage.setItem(themeKey,next);setNotice(next==='dark'?'Mörkt läge sparat.':'Ljust läge sparat.');}
    catch{setNotice('Temat är ändrat för denna visning. Webbläsaren tillåter inte att valet sparas.');}
  }
  const label=theme==='dark'?'Aktivera ljust läge':'Aktivera mörkt läge';
  return <><button type="button" className="iconbtn theme-toggle" onClick={toggle} aria-label={label} title={label}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button><span className="visually-hidden" role="status">{notice}</span></>;
}
