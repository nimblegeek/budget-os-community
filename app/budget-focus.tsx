'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Minus, Info, SlidersHorizontal, Trash2 } from 'lucide-react';
import { type Budget, type Transaction, kr, totals, sum } from '../lib/budget';
import { type DateRange, monthRange, periodSummary } from '../lib/date-range';
import SimpleBudget from './simple-budget';
import BudgetComparison from './budget-comparison';

type Props = {
 data: Budget; range: DateRange; onRange: (range: DateRange) => void;
 editable: boolean; busy: boolean;
 onAdd: (income: boolean) => void; onEdit: (item: Transaction) => void;
 onDelete: (item: Transaction) => void;
 onIncome: (item?: Budget['incomes'][number]) => void;
 onExpense: (item?: Budget['expenses'][number]) => void;
 onHistory: (kind?: 'income' | 'expense') => void;
 planRequested?: number; children?: React.ReactNode;
};
export default function BudgetFocus({data,range,onRange,editable,busy,onAdd,onEdit,onDelete,onIncome,onExpense,onHistory,planRequested=0,children}:Props) {
 const [showAll,setShowAll]=useState(false),[planOpen,setPlanOpen]=useState(false);
 const planRef=useRef<HTMLDetailsElement>(null);
 useEffect(()=>setShowAll(false),[range.from,range.to]);
 useEffect(()=>{
  if(!planRequested)return;
  setPlanOpen(true);
  const frame=requestAnimationFrame(()=>planRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
  return()=>cancelAnimationFrame(frame);
 },[planRequested]);
 const actual=periodSummary(data.transactions,range),plan=totals(data);
 const remaining=sum([actual.income,-actual.expense]);
 const rows=actual.transactions.filter(x=>x.kind!=='transfer').sort((a,b)=>b.date.localeCompare(a.date));
 const incomeCount=rows.filter(x=>x.kind==='income').length,expenseCount=rows.filter(x=>x.kind==='expense').length;
 const month=new Intl.DateTimeFormat('sv-SE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(range.from+'T12:00:00Z'));
 const isNow=range.from===monthRange().from;
 function showPlan(){setPlanOpen(true);planRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}
 return <div className="budget-focus budget-focus--clarity">
  <div className="focus-month">
   <button aria-label="Föregående budgetmånad" onClick={()=>onRange(monthRange(range.from,-1))}><ChevronLeft size={18}/></button>
   <span>{month}</span>
   <button aria-label="Nästa budgetmånad" onClick={()=>onRange(monthRange(range.from,1))}><ChevronRight size={18}/></button>
  </div>
  <section className="focus-balance" aria-label="Månadens kvar-belopp">
   <span>{isNow?'Kvar denna månad':'Kvar vald månad'}</span>
   <output aria-live="polite" aria-atomic="true" className={remaining<0?'negative':''}>{kr(remaining,2)}</output>
   <p className="balance-caption">Registrerade inkomster − registrerade utgifter</p>
   <div className="balance-equation">
    <button onClick={()=>onHistory('income')} aria-label={'Visa månadens inkomster, '+kr(actual.income,2)}><strong>{kr(actual.income,2)}</strong><small>{incomeCount} {incomeCount===1?'inkomst':'inkomster'} <ChevronRight size={11}/></small></button>
    <span aria-hidden="true">−</span>
    <button onClick={()=>onHistory('expense')} aria-label={'Visa månadens utgifter, '+kr(actual.expense,2)}><strong>{actual.expense<0?'('+kr(actual.expense,2)+')':kr(actual.expense,2)}</strong><small>{expenseCount} {expenseCount===1?'utgift':'utgifter'} <ChevronRight size={11}/></small></button>
   </div>
   {(!rows.length||remaining<0)&&<p>{!rows.length?'Ingen data ännu. Lägg till en inkomst eller utgift.':'Utgifter överstiger inkomster.'}</p>}
   <details className="focus-explainer"><summary><Info size={13} aria-hidden="true"/> Vad påverkar beloppet?</summary><p>Alla inkomster och utgifter i vald månad räknas, även återbetalningar, inkasso och engångsköp. Interna överföringar räknas inte. Kommande betalningar är inte avdragna. Beloppet är inte ditt banksaldo. Din budget jämförs med transaktionerna nedan; den räknas inte som en betalning.</p></details>
  </section>
  <section className="focus-entry" aria-label="Lägg till transaktion">
   {editable?<div className="focus-add"><button disabled={busy} onClick={()=>onAdd(true)}><Plus size={19} aria-hidden="true"/> Inkomst</button><button disabled={busy} onClick={()=>onAdd(false)}><Minus size={19} aria-hidden="true"/> Utgift</button></div>:<p className="focus-help">Du har läsbehörighet.</p>}
  </section>
  <details className="focus-step budget-plan" ref={planRef} open={planOpen} onToggle={event=>setPlanOpen(event.currentTarget.open)}>
   <summary><span className="focus-step-number" aria-hidden="true"><SlidersHorizontal size={17}/></span><span><strong>Din budget</strong><small>{data.incomes.length||data.expenses.length?kr(plan.remaining)+' kvar enligt planen':'Planera inkomster och kostnader'}</small></span><Plus size={17} aria-hidden="true"/></summary>
   <div className="focus-detail"><p className="focus-help">Här bestämmer du vad du räknar med att få in och vad månaden får kosta. Ändra en rad eller lägg till en ny.</p><SimpleBudget data={data} editable={editable&&!busy} onIncome={onIncome} onExpense={onExpense}/>{children}</div>
  </details>
  <BudgetComparison income={actual.income} expense={actual.expense} plannedIncome={plan.income} plannedExpense={plan.expenses} isCurrent={isNow} hasTransactions={!!rows.length} onHistory={onHistory} onPlan={showPlan}/>
  <section className="focus-mobile-transactions budget-recent" aria-labelledby="recent-transactions-heading">
   <header><h2 id="recent-transactions-heading">Senaste transaktionerna</h2><button onClick={()=>onHistory()}>Visa alla <ChevronRight size={12}/></button></header>
   {!rows.length&&<p className="focus-help">Inga registrerade betalningar i vald månad.</p>}
   <div className="focus-mobile-rows">{(showAll?rows:rows.slice(0,3)).map(row=><div className="focus-mobile-row" key={row.id}>
    <button className="focus-mobile-edit" disabled={!editable||busy} aria-label={'Ändra transaktion: '+row.description} onClick={()=>onEdit(row)}>
     <span><strong>{row.description}</strong><small>{row.date.slice(8,10)}/{row.date.slice(5,7)} · {row.category}</small></span>
     <span className={row.amount>0?'focus-positive':''}>{row.amount>0?'+':''}{kr(row.amount,2)}</span>
    </button>
    {editable&&<button className="focus-mobile-delete" disabled={busy} aria-label={'Ta bort transaktion: '+row.description+', '+kr(row.amount,2)} onClick={()=>onDelete(row)}><Trash2 size={17} aria-hidden="true"/></button>}
   </div>)}</div>
   {rows.length>3&&<button className="recent-toggle" aria-expanded={showAll} onClick={()=>setShowAll(!showAll)}>{showAll?'Visa färre':'Visa fler här'}</button>}
  </section>
 </div>;
}
