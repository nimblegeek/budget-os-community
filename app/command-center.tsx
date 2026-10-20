'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, ArrowUpRight, CornerDownLeft } from 'lucide-react';
import { type Budget } from '../lib/budget';
import { createCommands, searchCommands, type CommandItem } from '../lib/commands';
import Modal from './modal';
type Props={data:Budget;editable:boolean;blocked:boolean;onSelect:(item:CommandItem)=>void};
export default function CommandCenter({data,editable,blocked,onSelect}:Props){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[index,setIndex]=useState(0);
 const input=useRef<HTMLInputElement>(null),list=useRef<HTMLDivElement>(null),id=useId();
 const items=useMemo(()=>createCommands(data,editable),[data,editable]);
 const results=useMemo(()=>searchCommands(items,query),[items,query]);
 const selected=Math.min(index,results.length-1);
 useEffect(()=>setIndex(0),[query,items]);
 useEffect(()=>{list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'})},[selected,open]);
 useEffect(()=>{
  if(!open)return;
  const frame=requestAnimationFrame(()=>input.current?.focus());
  return()=>cancelAnimationFrame(frame);
 },[open]);
 useEffect(()=>{if(blocked)setOpen(false)},[blocked]);
 useEffect(()=>{
  const desktop=window.matchMedia('(min-width:651px)');
  const resize=()=>{if(!desktop.matches)setOpen(false)};
  const key=(event:KeyboardEvent)=>{
   if(!desktop.matches||blocked||event.defaultPrevented||event.repeat||event.isComposing||event.altKey||event.shiftKey||!(event.metaKey||event.ctrlKey)||event.key.toLowerCase()!=='k')return;
   if(document.querySelector('dialog[open]:not(.command-palette)'))return;
   event.preventDefault();setOpen(value=>!value);setQuery('');setIndex(0);
  };
  window.addEventListener('keydown',key);desktop.addEventListener('change',resize);
  return()=>{window.removeEventListener('keydown',key);desktop.removeEventListener('change',resize)};
 },[blocked]);
 function choose(item:CommandItem){setOpen(false);setQuery('');onSelect(item)}
 return <>
  <button className="command-trigger" disabled={blocked} aria-label="Sök i Budget OS" aria-haspopup="dialog" aria-expanded={open} aria-keyshortcuts="Meta+K Control+K" title="Sök (⌘K / Ctrl+K)" onClick={()=>{setQuery('');setIndex(0);setOpen(true)}}><Search size={15}/><span>Sök</span><kbd>⌘ K</kbd></button>
  {open&&<Modal title="Sök i Budget OS" className="command-palette" close={()=>setOpen(false)}>
   <div className="command-input"><Search size={19}/><input ref={input} autoFocus role="combobox" aria-label="Sök sidor, transaktioner och lån" aria-autocomplete="list" aria-expanded="true" aria-controls={id+'-results'} aria-activedescendant={selected>=0?id+'-'+selected:undefined} placeholder="Sök eller gör något…" value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{
    if(event.nativeEvent.isComposing)return;
    if((event.key==='ArrowDown'||event.key==='ArrowUp')&&results.length){event.preventDefault();setIndex(current=>(Math.min(current,results.length-1)+(event.key==='ArrowDown'?1:-1)+results.length)%results.length)}
    if(event.key==='Enter'){event.preventDefault();if(results[selected])choose(results[selected])}
   }}/></div>
   <div className="command-results" id={id+'-results'} role="listbox" aria-label="Sökresultat" ref={list}>
    {!results.length&&<p className="command-empty" role="status">Inga träffar. Prova ett namn, en kategori eller ett belopp.</p>}
    {[...new Set(results.map(item=>item.group))].map(group=><div role="group" aria-label={group} key={group}><div className="command-group" aria-hidden="true">{group}</div>{results.map((item,i)=>item.group===group?<button type="button" role="option" id={id+'-'+i} key={item.id} aria-selected={i===selected} tabIndex={-1} onMouseEnter={()=>setIndex(i)} onClick={()=>choose(item)}><span><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowUpRight size={15} aria-hidden="true"/></button>:null)}</div>)}
   </div>
   <div className="command-footer"><span>↑ ↓ välj</span><span><CornerDownLeft size={12}/> öppna</span><span>esc stäng</span><span>Sidor och genvägar · sök för att avgränsa</span></div>
  </Modal>}
 </>;
}
