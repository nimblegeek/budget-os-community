'use client';
import {useRef,useEffect} from 'react';
import {X} from 'lucide-react';
export default function Modal({title,close,children,className}:{title:string;close:()=>void;children:React.ReactNode;className?:string}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();const d=ref.current;return()=>d?.close()},[]);return <dialog className={className} ref={ref} onCancel={e=>{e.preventDefault();close()}} aria-label={title}><div className="modalhead"><h2>{title}</h2><button className="iconbtn" onClick={close} aria-label="Stäng"><X size={20}/></button></div>{children}</dialog>}
