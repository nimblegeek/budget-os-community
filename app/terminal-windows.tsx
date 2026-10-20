'use client';
import {useEffect, useRef, useState, type ReactNode, type PointerEvent} from 'react';
export type Rect={x:number,y:number,w:number,h:number};
type Layout=Record<string,Rect>;
const keys=['budget','debt','savings','transactions','creditors','collaboration'];
const storage='budget-os-terminal-windows-v1';
const minWidth=300,minHeight=270;
export function useWindows(){
 const canvas=useRef<HTMLElement>(null);
 const [width,setWidth]=useState(0);
 const [layout,setLayout]=useState<Layout>(()=>{try{const l=JSON.parse(localStorage.getItem(storage)||'{}');return Object.fromEntries(Object.entries(l).filter(([k,r])=>keys.includes(k)&&r&&typeof r==='object'&&['x','y','w','h'].every(p=>Number.isFinite((r as Record<string,number>)[p])))) as Layout}catch{return {}}});
 const [stack,setStack]=useState(keys);
 useEffect(()=>{const el=canvas.current;if(!el)return;const observer=new ResizeObserver(([e])=>setWidth(e.contentRect.width));observer.observe(el);return()=>observer.disconnect()});
 useEffect(()=>{try{localStorage.setItem(storage,JSON.stringify(layout))}catch{/* Layout remains usable when storage is blocked. */}},[layout]);
 function getRect(k:string):Rect{const i=keys.indexOf(k),two=width>=760,w=two?(width-18)/2:Math.max(0,width-20);const r=layout[k]||{x:two?(i%2)*(w+18):10,y:two?Math.floor(i/2)*520:i*510,w,h:500};return {x:Math.max(0,Math.min(r.x,width-Math.min(r.w,width))),y:Math.max(0,r.y),w:Math.min(Math.max(minWidth,r.w),width),h:Math.max(minHeight,r.h)}}
 function front(k:string){setStack(s=>[...s.filter(x=>x!==k),k])}
 function update(k:string,r:Rect){setLayout(l=>({...l,[k]:r}))}
 return {canvas,width,getRect,front,update,stack,reset:()=>{setLayout({});setStack(keys)},height:Math.max(900,...keys.slice(0,4).map(k=>getRect(k).y+getRect(k).h+24))};
}
type Props={id:string;className:string;rect:Rect;width:number;z:number;maximized:boolean;onFront:()=>void;onChange:(r:Rect)=>void;children:ReactNode};
export function FloatingWindow({id,className,rect,width,z,maximized,onFront,onChange,children}:Props){
 const gesture=useRef<{startX:number,startY:number,r:Rect,edge:string}|null>(null);
 const [moving,setMoving]=useState(false);
 function start(e:PointerEvent<HTMLElement>){onFront();if(maximized||e.button!==0)return;const target=e.target as HTMLElement;if(target.closest('button,input,a')&&!target.closest('[data-edge]'))return;const edge=target.closest<HTMLElement>('[data-edge]')?.dataset.edge;const header=target.closest('.panel-header');if(!edge&&!header)return;e.preventDefault();gesture.current={startX:e.clientX,startY:e.clientY,r:{...rect},edge:edge||'move'};(header||e.currentTarget).setPointerCapture(e.pointerId);setMoving(true)}
 function move(e:PointerEvent<HTMLElement>){const g=gesture.current;if(!g)return;const dx=e.clientX-g.startX,dy=e.clientY-g.startY,r={...g.r},edge=g.edge;if(edge==='move'){r.x=Math.max(0,Math.min(width-r.w,g.r.x+dx));r.y=Math.max(0,Math.min(2400,g.r.y+dy))}else{
 if(edge.includes('e'))r.w=Math.max(Math.min(minWidth,width-r.x),Math.min(width-r.x,g.r.w+dx));
 if(edge.includes('s'))r.h=Math.max(minHeight,Math.min(1600,g.r.h+dy));
 if(edge.includes('w')){r.x=Math.max(0,Math.min(g.r.x+g.r.w-minWidth,g.r.x+dx));r.w=g.r.w+g.r.x-r.x}
 if(edge.includes('n')){r.y=Math.max(0,Math.min(g.r.y+g.r.h-minHeight,g.r.y+dy));r.h=g.r.h+g.r.y-r.y}
 }onChange(r)}
 function finish(){gesture.current=null;setMoving(false)}
 return <article aria-label={`${id} window`} className={`${className} floating-window ${moving?'window-moving':''} ${maximized?'window-maximized':''}`} style={maximized?{zIndex:z}:{left:rect.x,top:rect.y,width:rect.w,height:rect.h,zIndex:z}} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>{children}{!maximized&&['n','s','e','w','ne','nw','se','sw'].map(edge=><div key={edge} data-edge={edge} className={`resize-edge resize-${edge}`} aria-hidden="true"/>)}{!maximized&&<button className="resize-keyboard" data-edge="se" aria-label={`Ändra storlek på ${id}; använd piltangenter`} title="Ändra storlek: fokusera och använd piltangenter" onKeyDown={e=>{if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();onChange({...rect,w:Math.min(width-rect.x,Math.max(Math.min(minWidth,width),rect.w+(e.key==='ArrowRight'?20:e.key==='ArrowLeft'?-20:0))),h:Math.max(minHeight,rect.h+(e.key==='ArrowDown'?20:e.key==='ArrowUp'?-20:0))})}}>◢</button>}</article>
}
