'use client';
import {useState} from 'react';
import {Plus,Trash2,Info,ChevronDown,MessageSquare} from 'lucide-react';
import {type Budget,kr,sum} from '../lib/budget';
import {debtAttackOrder} from '../lib/debt-order';
type Loan=Budget['debts'][number];
type Props={strategy?:string;setStrategy?:(value:string)=>void;debts:Loan[];editable:boolean;busy:boolean;onAdd:()=>void;onEdit:(loan:Loan)=>void;onDelete:(loan:Loan)=>void;onCreditors:()=>void;showPlanning?:boolean;simulation?:React.ReactNode;children?:React.ReactNode};
export default function DebtFocus({debts,editable,busy,onAdd,onEdit,onDelete,onCreditors,showPlanning,simulation,children,strategy:controlledStrategy,setStrategy:changeStrategy}:Props){
 const [localStrategy,setLocalStrategy]=useState('avalanche'),strategy=controlledStrategy??localStrategy,setStrategy=changeStrategy??setLocalStrategy;
 const active=debts.filter(x=>x.balance>0),closed=debts.filter(x=>x.balance===0);
 const ordered=debtAttackOrder(debts,strategy),mortgages=active.filter(d=>d.type==='Bolån'),missing=ordered.some(d=>d.rate===null);
 const unverified=active.filter(x=>!x.balanceVerified).length;
 const row=(loan:Loan,index?:number)=><div className="loan-row" key={loan.id}>
  {index!==undefined&&<span className="loan-rank" aria-label={`Prioritet ${index+1}`}>{String(index+1).padStart(2,'0')}</span>}
  <button className="loan-edit" disabled={!editable||busy} onClick={()=>onEdit(loan)} aria-label={`Ändra lån: ${loan.name}, ${kr(loan.balance,2)}`}>
   <span><strong>{loan.name}</strong><small>{loan.type||'Typ saknas'} · {loan.rate===null?'Ränta saknas':`${loan.rate.toLocaleString('sv-SE')} %`}{loan.balance===0?' · Avslutat':!loan.balanceVerified?' · Äldre saldo':''}</small>{index===0&&<small className="loan-next">Först för extra betalning{strategy==='avalanche'&&missing?' · bland kända räntor':''}</small>}</span>
   <span><strong>{kr(loan.balance,2)}</strong><small>{kr(loan.monthly,2)}/mån{loan.balance===0&&loan.monthly>0?' · stäm av':''}</small></span>
  </button>
  {editable&&<button className="loan-delete" disabled={busy} onClick={()=>onDelete(loan)} aria-label={`Ta bort lån: ${loan.name}, ${kr(loan.balance,2)}`}><Trash2 size={17} aria-hidden="true"/></button>}
 </div>;
 return <div className="debt-focus">
  <section className="debt-summary" aria-label="Skuldöversikt">
   <div className="debt-total"><span>Totalskuld</span><output aria-live="polite" aria-atomic="true">{kr(sum(active.map(x=>x.balance)),2)}</output></div>
   <div className="debt-monthly"><span>Månadsbetalning</span><output aria-live="polite" aria-atomic="true">{kr(sum(active.map(x=>x.monthly)),2)}</output></div>
   <details className="focus-explainer"><summary><Info size={13} aria-hidden="true"/> Alla aktiva lån · inkl. bolån</summary><p>Angivna saldon och ordinarie månadsbetalningar för lån med skuld kvar. Inte automatiskt hämtat från banken. Betalningar registreras separat i Budget.</p></details>
   {unverified>0&&<p className="debt-caution">{unverified===1?'Ett lån har äldre saldo.':`${unverified} lån har äldre saldon.`}</p>}
  </section>
  {editable?<button className="debt-add" disabled={busy} onClick={onAdd}><Plus size={19} aria-hidden="true"/> Lägg till lån</button>:<p className="focus-help">Du har läsbehörighet.</p>}
  {ordered.length>0&&<section className="debt-attack" aria-label="Attackstrategi"><label>Attackstrategi<select aria-label="Välj attackstrategi" value={strategy} onChange={e=>setStrategy(e.target.value)}><option value="avalanche">Lavin · högst ränta först</option><option value="snowball">Snöboll · lägst saldo först</option></select></label><p>{strategy==='snowball'?'Minsta saldot står först. När det är betalt fortsätter du med nästa.':'Högsta nominella räntan står först. Vid lika ränta går lägst saldo först.'} Ordinarie betalningar på övriga lån ligger kvar. Samma strategi används i simuleringen, för de lån du väljer där.</p>{missing&&<p>Ränta saknas för ett eller flera lån. {strategy==='avalanche'?'De visas sist; komplettera för en fullständig ränteordning.':'Saldoordningen fungerar, men räntorna behövs för prognosen.'}</p>}</section>}
  <section className="loan-list" aria-label="Aktiva lån">
   {ordered.map((loan,index)=>row(loan,strategy==='avalanche'&&loan.rate===null?undefined:index))}
   {!active.length&&<p className="debt-empty">{closed.length?'Inga aktiva lån.':'Inga lån tillagda ännu.'}</p>}
  </section>
  {mortgages.length>0&&<details className="debt-closed"><summary>Bolån ({mortgages.length}) · utanför attackordningen<ChevronDown size={16} aria-hidden="true"/></summary>{mortgages.map(loan=>row(loan))}</details>}
  {simulation}
  {closed.length>0&&<details className="debt-closed"><summary>Avslutade lån ({closed.length})<ChevronDown size={16} aria-hidden="true"/></summary>{closed.map(loan=>row(loan))}</details>}
  <details className="debt-more" open={showPlanning?true:undefined}><summary>Visa mer<ChevronDown size={16} aria-hidden="true"/></summary>
   <button className="debt-contact" onClick={onCreditors}><MessageSquare size={16} aria-hidden="true"/> Kontakta borgenärer</button>
   {children}
  </details>
 </div>;
}
