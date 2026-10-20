'use client';
import {Plus,Trash2,Info,ChevronDown,MessageSquare} from 'lucide-react';
import {type Budget,kr,sum} from '../lib/budget';
type Loan=Budget['debts'][number];
type Props={debts:Loan[];editable:boolean;busy:boolean;onAdd:()=>void;onEdit:(loan:Loan)=>void;onDelete:(loan:Loan)=>void;onCreditors:()=>void;showPlanning?:boolean;children?:React.ReactNode};
export default function DebtFocus({debts,editable,busy,onAdd,onEdit,onDelete,onCreditors,showPlanning,children}:Props){
 const active=debts.filter(x=>x.balance>0),closed=debts.filter(x=>x.balance===0);
 const unverified=active.filter(x=>!x.balanceVerified).length;
 const row=(loan:Loan)=><div className="loan-row" key={loan.id}>
  <button className="loan-edit" disabled={!editable||busy} onClick={()=>onEdit(loan)} aria-label={`Ändra lån: ${loan.name}, ${kr(loan.balance,2)}`}>
   <span><strong>{loan.name}</strong><small>{loan.type||'Typ saknas'}{loan.balance===0?' · Avslutat':!loan.balanceVerified?' · Äldre saldo':''}</small></span>
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
  <section className="loan-list" aria-label="Aktiva lån">
   {active.length?active.map(row):<p className="debt-empty">{closed.length?'Inga aktiva lån.':'Inga lån tillagda ännu.'}</p>}
  </section>
  {closed.length>0&&<details className="debt-closed"><summary>Avslutade lån ({closed.length})<ChevronDown size={16} aria-hidden="true"/></summary>{closed.map(row)}</details>}
  <details className="debt-more" open={showPlanning?true:undefined}><summary>Visa mer<ChevronDown size={16} aria-hidden="true"/></summary>
   <button className="debt-contact" onClick={onCreditors}><MessageSquare size={16} aria-hidden="true"/> Kontakta borgenärer</button>
   {children}
  </details>
 </div>;
}
