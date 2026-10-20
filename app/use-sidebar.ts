'use client';
import {useCallback,useEffect,useState} from 'react';
import {isSidebarShortcut,sidebarStorageKey} from '../lib/sidebar';

export default function useSidebar(){
 const [collapsed,setCollapsed]=useState(false);
 useEffect(()=>{try{setCollapsed(localStorage.getItem(sidebarStorageKey)==='true')}catch{/* Storage may be blocked. */}},[]);
 const toggle=useCallback(()=>setCollapsed(previous=>{
  const next=!previous;
  try{localStorage.setItem(sidebarStorageKey,String(next))}catch{/* Keep the control usable without storage. */}
  return next;
 }),[]);
 useEffect(()=>{
  const handle=(event:KeyboardEvent)=>{
   const editing=event.target instanceof Element&&!!event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],dialog');
   if(!isSidebarShortcut(event,window.matchMedia('(min-width:651px)').matches,editing))return;
   event.preventDefault();toggle();
  };
  window.addEventListener('keydown',handle);
  return()=>window.removeEventListener('keydown',handle);
 },[toggle]);
 return {collapsed,toggle};
}
