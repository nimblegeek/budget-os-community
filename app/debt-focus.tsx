'use client';
import {useState} from 'react';
import {Plus,Trash2,Info,ChevronDown,ChevronLeft,ChevronRight,MessageSquare,Check} from 'lucide-react';
import {type Budget,kr,sum} from '../lib/budget';
import {debtAttackOrder} from '../lib/debt-order';
import {debtSummary,monthlyDebtSnapshots} from '../lib/debt-summary';
import {monthRange,stockholmDate} from '../lib/date-range';
type Loan=Budget['debts'][number];
type Props={strategy?:string;setStrategy?:(value:string)=>void;debts:Loan[];history?:NonNullable<Budget['debtHistory']>;editable:boolean;busy:boolean;onAdd:()=>void;onEdit:(loan:Loan)=>void;onDelete:(loan:Loan)=>void;onCheckpoint?:()=>Promise<void>;onCreditors:()=>void;showPlanning?:boolean;simulation?:React.ReactNode;children?:React.ReactNode};
export default function DebtFocus({debts,history=[],editable,busy,onAdd,onEdit,onDelete,onCheckpoint,onCreditors,showPlanning,simulation,children,strategy:controlledStrategy,setStrategy:changeStrategy}:Props){
 const [localStrategy,setLocalStrategy]=useState('avalanche'),strategy=controlledStrategy??localStrategy,setStrategy=changeStrategy??setLocalStrategy;
 const currentMonth=stockholmDate().slice(0,7),[selectedMonth,setSelectedMonth]=useState(currentMonth);
 const summary=debtSummary(debts),active=summary.active,closed=debts.filter(x=>x.balance===0);
 const snapshots=monthlyDebtSnapshots(history),selectedSnapshot=snapshots.find(row=>row.month===selectedMonth),isCurrent=selectedMonth===currentMonth;
 const displayedBalance=isCurrent?summary.balance:selectedSnapshot?.balance;
 const comparison=[...snapshots.filter(row=>row.month<selectedMonth),...(isCurrent?[{month:currentMonth,date:stockholmDate(),balance:summary.balance,verified:active.every(row=>row.balanceVerified)}]:[])].sort((a,b)=>a.month.localeCompare(b.month));
 const previous=comparison.filter(row=>row.month<selectedMonth).at(-1),change=displayedBalance===undefined||!previous?null:Math.round((previous.balance-displayedBalance)*100)/100;
 const earliest=snapshots[0]?.month||currentMonth;
 const moveMonth=(offset:number)=>setSelectedMonth(monthRange(selectedMonth+'-01',offset).from.slice(0,7));
 const monthLabel=new Intl.DateTimeFormat('sv-SE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(selectedMonth+'-01T12:00:00Z'));
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
  <div className="debt-month-browser" aria-label="Bläddra mellan skuldmånader">
   <button aria-label="Föregående skuldmånad" disabled={selectedMonth<=earliest} onClick={()=>moveMonth(-1)}><ChevronLeft size={18}/></button>
   <span>{monthLabel}</span>
   <button aria-label="Nästa skuldmånad" disabled={selectedMonth>=currentMonth} onClick={()=>moveMonth(1)}><ChevronRight size={18}/></button>
  </div>
  <section className="debt-summary" aria-label="Skuldöversikt">
   <div className="debt-total"><span>{isCurrent?'Totalskuld nu':'Registrerad totalskuld'}</span>{displayedBalance===undefined?<strong className="debt-missing">Ingen avstämning</strong>:<output aria-live="polite" aria-atomic="true">{kr(displayedBalance,2)}</output>}{displayedBalance!==undefined&&<small>{isCurrent?'Nuvarande saldon i översikten':`Avstämt ${selectedSnapshot?.date}${selectedSnapshot&&!selectedSnapshot.verified?' · innehåller äldre saldon':''}`}{change!==null&&<> · <b className={change<0?'negative':''}>{change>0?'−':change<0?'+':''}{kr(Math.abs(change),2)} sedan föregående avstämning</b></>}</small>}</div>
   {!isCurrent&&displayedBalance===undefined&&<p className="debt-history-empty">Ingen skuldavstämning sparades denna månad. Appen fyller inte i ett uppskattat saldo.</p>}
   <div className="debt-monthly"><span>Månadsbetalning nu</span><output aria-live="polite" aria-atomic="true">{kr(summary.monthly,2)}</output></div>
   {isCurrent&&editable&&onCheckpoint&&active.length>0&&<button className="debt-checkpoint" disabled={busy} onClick={onCheckpoint}><Check size={15}/>{history.some(row=>row.date===stockholmDate())?'Uppdatera dagens avstämning':'Spara månadens saldon'}</button>}
   <details className="focus-explainer"><summary><Info size={13} aria-hidden="true"/> Aktiva lån i översikten</summary><p>Totalsummorna bygger på de lån som finns registrerade här och fortfarande har skuld kvar. Uppgifterna hämtas inte automatiskt från banken. Betalningar följs upp separat i Budget.</p></details>
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
