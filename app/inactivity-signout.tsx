'use client';
import {useEffect} from 'react';
import {useClerk} from '@clerk/nextjs';
import {INACTIVITY_STORAGE_KEY,INACTIVITY_TIMEOUT_MS,inactivityExpired} from '../lib/inactivity';

const activityEvents=['pointerdown','keydown','touchstart','scroll'] as const;

export default function InactivitySignOut(){
 const {signOut}=useClerk();
 useEffect(()=>{
  let lastActivity=Date.now(),timer:ReturnType<typeof setTimeout>|undefined,signingOut=false,lastStored=0;
  const expire=async()=>{
   if(signingOut)return;
   signingOut=true;
   try{localStorage.removeItem(INACTIVITY_STORAGE_KEY)}catch{/* Clerk still signs out when storage is unavailable. */}
   try{await signOut({redirectUrl:'/'});}catch{window.location.assign('/sign-in');}
  };
  const check=()=>{
   if(inactivityExpired(lastActivity))void expire();
   else schedule();
  };
  const schedule=()=>{
   if(timer)clearTimeout(timer);
   timer=setTimeout(check,Math.max(0,INACTIVITY_TIMEOUT_MS-(Date.now()-lastActivity))+25);
  };
  const remember=(now:number)=>{
   if(now-lastStored<1000)return;
   lastStored=now;
   try{localStorage.setItem(INACTIVITY_STORAGE_KEY,String(now))}catch{/* This tab's timer remains authoritative. */}
  };
  const active=()=>{
   const now=Date.now();
   if(inactivityExpired(lastActivity,now)){void expire();return;}
   lastActivity=now;remember(now);schedule();
  };
  const storage=(event:StorageEvent)=>{
   if(event.key!==INACTIVITY_STORAGE_KEY)return;
   if(event.newValue===null){void expire();return;}
   const value=Number(event.newValue);
   if(Number.isFinite(value)&&value>lastActivity){lastActivity=value;schedule();}
  };
  const visibility=()=>{if(document.visibilityState==='visible')check()};
  remember(lastActivity);schedule();
  for(const event of activityEvents)window.addEventListener(event,active,{passive:true});
  window.addEventListener('storage',storage);
  document.addEventListener('visibilitychange',visibility);
  return()=>{
   if(timer)clearTimeout(timer);
   for(const event of activityEvents)window.removeEventListener(event,active);
   window.removeEventListener('storage',storage);
   document.removeEventListener('visibilitychange',visibility);
  };
 },[signOut]);
 return null;
}
