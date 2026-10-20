'use client';
import {useEffect,useRef,useState} from 'react';
import {Plus,ArrowDownLeft,Download,Pencil,Trash2,ArrowDown,Search} from 'lucide-react';
import {type Budget,type Transaction,kr} from '../lib/budget';
import type {RevenueSource} from '../lib/revenue-schema';
import {revenueSummary,type RevenueGrouping,type RevenueGroup} from '../lib/revenue';
import {dateRangeLabel,isCalendarMonth,type DateRange} from '../lib/date-range';
import {revenueImage} from '../lib/revenue-export';
import DateRangeFilter from './date-range-filter';
import Modal from './modal';

type Props={data:Budget;range:DateRange;onRange:(r:DateRange)=>void;editable:boolean;busy:boolean;onAddSource:()=>void;onEditSource:(s:RevenueSource)=>void;onDeleteSource:(s:RevenueSource)=>void;onAddIncome:(sourceId?:string)=>void;onEditTransaction:(t:Transaction)=>void;onAssign:(ids:string[],sourceId:string|null)=>Promise<void>};
const countLabel=(n:number,singular:string,plural:string)=>`${n} ${n===1?singular:plural}`;
const percent=(n:number)=>n.toLocaleString('sv-SE',{maximumFractionDigits:1})+' %';
function Distribution({groups,total,hidden=false,onSelect}:{groups:RevenueGroup[];total:number;hidden?:boolean;onSelect?:(id:string)=>void}){
 const negative=groups.some(g=>g.amount<0),max=Math.max(1,...groups.map(g=>Math.abs(g.amount)));
 let offset=0;
 return <div className="revenue-distribution">
  {!negative&&total>0?<div className="revenue-ring"><svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="96" fill="none" stroke="var(--line)" strokeWidth="26"/>{groups.filter(g=>g.amount>0).map(g=>{const length=g.amount/total*100,start=offset;offset+=length;return <circle key={g.id} cx="120" cy="120" r="96" fill="none" stroke={g.color} strokeWidth="26" pathLength="100" strokeDasharray={`${length} ${100-length}`} strokeDashoffset={-start} transform="rotate(-90 120 120)"/>})}</svg><div><span>{hidden?'Fördelning':'Registrerat'}</span><strong>{hidden?'100 %':kr(total)}</strong></div></div>:<div className="revenue-ring revenue-no-ring"><strong>{hidden?'Intäkter':kr(total)}</strong><small>{negative?'Inkl. återförda inkomster':'Inga inbetalningar ännu'}</small></div>}
  <div className="revenue-legend">{groups.map(g=><button type="button" className="revenue-group" key={g.id} disabled={!onSelect} onClick={()=>onSelect?.(g.id)} aria-label={`Visa inbetalningar: ${g.label}`}>
   <span className="revenue-key" style={{background:g.color}}/><span className="revenue-group-name">{g.label}{negative&&<i style={{width:`${Math.abs(g.amount)/max*100}%`,background:g.color}}/>}</span>
   <span className="revenue-group-value">{!hidden&&<strong>{kr(g.amount,2)}</strong>}<small>{g.share===null?'Andel visas inte':percent(g.share)}</small></span>
  </button>)}</div>
 </div>;
}
export default function RevenueFocus({data,range,onRange,editable,busy,onAddSource,onEditSource,onDeleteSource,onAddIncome,onEditTransaction,onAssign}:Props){
 const [grouping,setGrouping]=useState<RevenueGrouping>('type'),[scope,setScope]=useState('unassigned'),[query,setQuery]=useState(''),[selected,setSelected]=useState<string[]>([]),[destination,setDestination]=useState(''),[showArchived,setShowArchived]=useState(false),[error,setError]=useState(''),[share,setShare]=useState(false),[hideAmounts,setHideAmounts]=useState(false),[imageUrl,setImageUrl]=useState(''),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
 const paymentsRef=useRef<HTMLDetailsElement>(null),summary=revenueSummary(data,range,grouping),sources=data.revenueSources||[],active=sources.filter(s=>!s.archived);
 const [groupScope,setGroupScope]=useState('');
 const matchingGroup=groupScope?summary.groups.find(g=>g.id===groupScope):undefined;
 const payments=summary.rows.filter(tx=>(scope==='all'||scope==='unassigned'&&!tx.incomeSourceId||tx.incomeSourceId===scope)&&(!query||tx.description.toLocaleLowerCase('sv').includes(query.toLocaleLowerCase('sv')))).filter(tx=>{if(!matchingGroup)return true;const s=sources.find(s=>s.id===tx.incomeSourceId);return grouping==='type'?s?.type===matchingGroup.label:(s?.channel||'Ingen plattform')===matchingGroup.label}).sort((a,b)=>b.date.localeCompare(a.date));
 const visible=payments.slice(0,100),picked=visible.filter(tx=>selected.includes(tx.id)).map(tx=>tx.id);
 useEffect(()=>{setSelected([])},[range.from,range.to,scope,query,groupScope,grouping]);
 useEffect(()=>{if(!share)return;let cancelled=false,url='';setImageUrl('');setExportError('');revenueImage(summary.groups,summary.total,range,hideAmounts).then(blob=>{if(cancelled)return;url=URL.createObjectURL(blob);setImageUrl(url)}).catch(e=>{if(!cancelled)setExportError(e.message)});return()=>{cancelled=true;if(url)URL.revokeObjectURL(url)}},[share,data,range.from,range.to,grouping,hideAmounts]);
 function openPayments(next:string){setScope(next);setQuery('');if(paymentsRef.current){paymentsRef.current.open=true;paymentsRef.current.scrollIntoView({behavior:'smooth',block:'start'})}}
 function selectGroup(id:string){
  setGroupScope('');
  const group=summary.groups.find(g=>g.id===id);if(!group)return;
  if(id==='unassigned'||grouping==='source'){openPayments(id);return}
  // Multiple sources can share a type/channel. Show all matching payments without guessing.
  openPayments('all');setQuery('');setGroupScope(id);
 }
 const displayed=visible;
 const selectedDisplayed=displayed.filter(tx=>picked.includes(tx.id)).map(tx=>tx.id);
 async function assign(){setError('');try{await onAssign(selectedDisplayed,destination||null);setSelected([])}catch(e){setError((e as Error).message)}}
 return <div className="revenue-page">
  <section className="revenue-hero" aria-label="Periodens intäkter"><span className="eyebrow">Registrerade inbetalningar</span><strong className="revenue-total">{kr(summary.total)}</strong><span className="small">{countLabel(summary.rows.length,'inbetalning','inbetalningar')} · {countLabel(summary.sourceStats.filter(s=>s.count>0).length,'källa','källor')}</span>
   <div className="page-actions">{editable&&<><button className="btn" disabled={busy} onClick={()=>onAddIncome()}><Plus size={18}/> Inbetalning</button><button className="btn light" disabled={busy} onClick={onAddSource}>Ny källa</button></>}<button className="btn light" disabled={!summary.rows.length} onClick={()=>setShare(true)}><Download size={16}/> Spara bild</button></div>
  </section>
  <details className="area-disclosure period-disclosure"><summary>{dateRangeLabel(range)}<span>Ändra period</span></summary><DateRangeFilter key={range.from+range.to} value={range} onChange={onRange} years/></details>
  <section className="revenue-card"><div className="revenue-section-head"><h2>Fördelning</h2><div className="revenue-tabs" aria-label="Gruppera intäkter">{([['type','Typ'],['channel','Plattform'],['source','Källa']] as const).map(([key,label])=><button key={key} aria-pressed={grouping===key} onClick={()=>{setGrouping(key);setGroupScope('')}}>{label}</button>)}</div></div>
   {summary.groups.length?<Distribution groups={summary.groups} total={summary.total} onSelect={selectGroup}/>:<div className="revenue-empty"><ArrowDownLeft size={24}/><p>Ge varje inbetalning en källa.</p><span className="small">Annonsintäkter, samarbeten, affiliate — eller din vanliga lön.</span>{editable&&<button className="btn light" onClick={onAddSource}>Lägg till din första källa</button>}</div>}
   {summary.hasNegative&&<p className="small">En grupp är negativ efter återförda inkomster. Därför visas belopp i stället för procent.</p>}
   {!!summary.unassigned.length&&<button className="revenue-unassigned" onClick={()=>{setGroupScope('');openPayments('unassigned')}}><span>{countLabel(summary.unassigned.length,'inbetalning','inbetalningar')} saknar källa</span><span>Ordna <ArrowDown size={14}/></span></button>}
  </section>
  <section className="revenue-card"><div className="revenue-section-head"><h2>Dina källor</h2>{editable&&<button className="textbtn" disabled={busy} onClick={onAddSource}><Plus size={16}/> Ny källa</button>}</div>
   {summary.sourceStats.filter(s=>showArchived||!s.archived).map(s=><div className="revenue-source" key={s.id}><button className="revenue-source-main" onClick={()=>{setGroupScope('');openPayments(s.id)}}><span><strong>{s.name}</strong><small>{[s.channel,s.type,s.archived?'Arkiverad':''].filter(Boolean).join(' · ')}</small></span><span className="right"><strong>{kr(s.amount,2)}</strong><small>{countLabel(s.count,'inbetalning','inbetalningar')}</small></span></button>
    {isCalendarMonth(range)&&s.monthlyTarget>0&&<div className="revenue-target"><span>Mål {kr(s.monthlyTarget)} / mån</span><span>{percent(s.amount/s.monthlyTarget*100)}</span><progress max={s.monthlyTarget} value={Math.max(0,Math.min(s.monthlyTarget,s.amount))} aria-label={`Måluppfyllelse för ${s.name}`}/></div>}
    {editable&&<div className="revenue-source-actions">{!s.archived&&<button className="textbtn" disabled={busy} onClick={()=>onAddIncome(s.id)}><Plus size={14}/> Inbetalning</button>}<button className="iconbtn" disabled={busy} aria-label={`Ändra källa: ${s.name}`} onClick={()=>onEditSource(s)}><Pencil size={15}/></button><button className="iconbtn deletebtn" disabled={busy} aria-label={`Ta bort källa: ${s.name}`} onClick={()=>onDeleteSource(s)}><Trash2 size={15}/></button></div>}
   </div>)}
   {!sources.length&&<p className="small">Inga källor ännu. Skapa en och koppla dina befintliga inbetalningar.</p>}
   {sources.some(s=>s.archived)&&<label className="revenue-check"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/> Visa arkiverade källor</label>}
   <p className="small">Månads­mål följs upp för en hel kalendermånad. De ändrar inte din budgetplan.</p>
  </section>
  <details className="area-disclosure revenue-payments" ref={paymentsRef}><summary>Inbetalningar<span>Ordna och följ upp</span></summary><div className="revenue-payment-body">
   <div className="revenue-payment-filters"><label>Visa<select value={scope} onChange={e=>{setScope(e.target.value);setGroupScope('')}}><option value="unassigned">Ej kopplade</option><option value="all">Alla inbetalningar</option>{sources.map(s=><option key={s.id} value={s.id}>{s.name}{s.archived?' (arkiverad)':''}</option>)}</select></label><label className="search"><Search size={16}/><input aria-label="Sök inbetalningar" placeholder="Sök inbetalning" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
   {matchingGroup&&<p className="small">Visar {matchingGroup.label} <button className="textbtn" onClick={()=>setGroupScope('')}>Visa alla</button></p>}
   {editable&&displayed.length>0&&<><label className="revenue-check"><input type="checkbox" disabled={busy} checked={displayed.length>0&&selectedDisplayed.length===displayed.length} onChange={e=>setSelected(e.target.checked?displayed.map(tx=>tx.id):[])}/> Markera visade ({displayed.length})</label><div className="revenue-assign"><label>Koppla till<select value={destination} disabled={busy} onChange={e=>setDestination(e.target.value)}><option value="">Ingen källa</option>{active.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button className="btn" disabled={busy||!selectedDisplayed.length} onClick={assign}>Koppla {selectedDisplayed.length||''}</button></div></>}
   {error&&<p role="alert" className="warningtext">{error}</p>}
   <div className="revenue-payment-list">{displayed.map(tx=><div className="revenue-payment" key={tx.id}>{editable&&<input type="checkbox" aria-label={`Välj inbetalning: ${tx.description}`} checked={selected.includes(tx.id)} disabled={busy} onChange={e=>setSelected(e.target.checked?[...selected,tx.id]:selected.filter(id=>id!==tx.id))}/>}<button disabled={!editable||busy} onClick={()=>onEditTransaction(tx)} aria-label={`Ändra inbetalning: ${tx.description}`}><span><strong>{tx.description}</strong><small>{tx.date} · {sources.find(s=>s.id===tx.incomeSourceId)?.name||'Ej kopplad'}</small></span><strong>{kr(tx.amount,2)}</strong></button></div>)}</div>
   {!displayed.length&&<p className="small">Inga matchande inbetalningar i perioden.</p>}{payments.length>100&&<p className="small">Visar de senaste 100 av {payments.length}. Avgränsa period eller sök.</p>}
  </div></details>
  <p className="small revenue-footnote">Belopp enligt transaktionerna, inklusive återförda inkomster. Överföringar räknas inte. Ingen moms- eller skatteberäkning.</p>
  {share&&<Modal title="Din intäktsbild" close={()=>setShare(false)}><div className="revenue-share-controls"><label className="revenue-check"><input type="checkbox" checked={hideAmounts} onChange={e=>setHideAmounts(e.target.checked)}/> Dölj belopp</label><p className="small">Förhandsgranska innan du delar. Bilden visar period och {grouping==='type'?'intäktstyper':grouping==='channel'?'plattformar':'källnamn'}. Transaktionstexter följer inte med. Inget publiceras automatiskt.</p>{imageUrl?<img className="revenue-share-image" src={imageUrl} alt="Förhandsvisning av intäktsfördelning"/>:<div className="revenue-share-loading">{exportError||'Skapar bild…'}</div>}{exportError&&<p role="alert" className="warningtext">{exportError}</p>}<button className="btn full" disabled={!imageUrl||exporting} onClick={()=>{setExporting(true);try{const a=document.createElement('a');a.href=imageUrl;a.download=`budget-os-intakter-${range.from}-${range.to}.png`;a.click()}finally{setExporting(false)}}}><Download size={16}/> Ladda ner PNG</button></div></Modal>}
 </div>;
}
