'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Minus, Info, SlidersHorizontal, Trash2 } from 'lucide-react';
import { type Budget, type Transaction, kr, totals } from '../lib/budget';
import { type DateRange, monthRange } from '../lib/date-range';
import SimpleBudget from './simple-budget';
import BudgetCostPicker from './budget-cost-picker';
import MonthlyForecast from './monthly-forecast';
import {budgetMonthName,monthlyForecast,transactionBudgetMonth} from '../lib/monthly-forecast';
import {type ExpenseCategoryKey} from '../lib/expense-categories';

type Props = {
 data: Budget; range: DateRange; onRange: (range: DateRange) => void;
 editable: boolean; busy: boolean;
 onAdd: (income: boolean) => void; onEdit: (item: Transaction) => void;
 onDelete: (item: Transaction) => void;
 onIncome: (item?: Budget['incomes'][number]) => void;
 onExpense: (item?: Budget['expenses'][number]) => void;
 onHistory: (kind?: 'income' | 'expense', category?:ExpenseCategoryKey) => void;
 planRequested?: number; children?: React.ReactNode;
 persist?: (data:Budget,action:string)=>Promise<void>;
};
export default function BudgetFocus({data,range,onRange,editable,busy,onAdd,onEdit,onDelete,onIncome,onExpense,onHistory,planRequested=0,children,persist}:Props) {
 const [showAll,setShowAll]=useState(false),[planOpen,setPlanOpen]=useState(false);
 const planRef=useRef<HTMLDetailsElement>(null);
 useEffect(()=>setShowAll(false),[range.from,range.to]);
 useEffect(()=>{
  if(!planRequested)return;
  setPlanOpen(true);
  const frame=requestAnimationFrame(()=>planRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
  return()=>cancelAnimationFrame(frame);
 },[planRequested]);
 const plan=totals(data),forecast=monthlyForecast(data,range);
 const remaining=forecast.forecastRemaining;
 const rows=forecast.transactions.filter(x=>x.kind!=='transfer').sort((a,b)=>b.date.localeCompare(a.date));
 const incomeCount=forecast.transactions.filter(x=>x.kind==='income').length,expenseCount=forecast.transactions.filter(x=>x.kind==='expense').length;
 const month=new Intl.DateTimeFormat('sv-SE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(range.from+'T12:00:00Z'));
 const isNow=range.from===monthRange().from;
 return <div className="budget-focus budget-focus--clarity">
  <div className="focus-month">
   <button aria-label="Föregående budgetmånad" onClick={()=>onRange(monthRange(range.from,-1))}><ChevronLeft size={18}/></button>
   <span>{month}</span>
   <button aria-label="Nästa budgetmånad" onClick={()=>onRange(monthRange(range.from,1))}><ChevronRight size={18}/></button>
  </div>
  <section className="focus-balance" aria-label="Månadens beräknade kvar-belopp">
   <span>{isNow?'Prognos: kvar vid månadsslut':'Prognos: kvar vald månad'}</span>
   <output aria-live="polite" aria-atomic="true" className={remaining<0?'negative':''}>{kr(remaining,2)}</output>
   <p className="balance-caption">Budgeterad inkomst minus utfall och planerade utgifter som återstår</p>
   <div className="balance-equation">
    <button onClick={()=>onHistory('income')} aria-label={'Visa månadens inkomster, '+kr(forecast.actualIncome,2)}><strong>{kr(forecast.actualIncome,2)}</strong><small>{incomeCount} {incomeCount===1?'inkomst':'inkomster'} <ChevronRight size={11}/></small></button>
    <span aria-hidden="true">−</span>
    <button onClick={()=>onHistory('expense')} aria-label={'Visa månadens utgifter, '+kr(forecast.actualExpense,2)}><strong>{forecast.actualExpense<0?'('+kr(forecast.actualExpense,2)+')':kr(forecast.actualExpense,2)}</strong><small>{expenseCount} {expenseCount===1?'utgift':'utgifter'} <ChevronRight size={11}/></small></button>
   </div>
   {remaining<0&&<p>Planerade och registrerade utgifter överstiger den förväntade inkomsten.</p>}
   <details className="focus-explainer"><summary><Info size={13} aria-hidden="true"/> Prognos eller kontosaldo?</summary><p><strong>Prognosen</strong> visar vad månadsplanen väntas lämna kvar. <strong>Kontosaldot</strong> visar pengarna som faktiskt finns nu. För ett säkert köp-utrymme: utgå från kontosaldot och dra av månadens ännu obetalda prioriterade kostnader. Framtida lön räknas först när den kommit in.</p></details>
  </section>
  <section className="focus-entry" aria-label="Lägg till transaktion">
   {editable?<div className="focus-add"><button disabled={busy} onClick={()=>onAdd(true)}><Plus size={19} aria-hidden="true"/> Inkomst</button><button disabled={busy} onClick={()=>onAdd(false)}><Minus size={19} aria-hidden="true"/> Utgift</button></div>:<p className="focus-help">Du har läsbehörighet.</p>}
  </section>
  <MonthlyForecast data={data} range={range} onHistory={onHistory}/>
  <details className="focus-step budget-plan" ref={planRef} open={planOpen} onToggle={event=>setPlanOpen(event.currentTarget.open)}>
   <summary><span className="focus-step-number" aria-hidden="true"><SlidersHorizontal size={17}/></span><span><strong>Månadsplan</strong><small>{data.incomes.length||data.expenses.length?`${kr(plan.income)} in · ${kr(plan.expenses)} ut · ${kr(plan.remaining)} kvar`:'Planera inkomster och utgifter'}</small></span><Plus size={17} aria-hidden="true"/></summary>
   <div className="focus-detail"><p className="focus-help">Här ändrar du det du räknar med varje månad. Prognosen ovan uppdateras direkt.</p><SimpleBudget data={data} editable={editable&&!busy} onIncome={onIncome} onExpense={onExpense}/><BudgetCostPicker data={data} editable={editable} busy={busy} persist={persist}/>{children}</div>
  </details>
  <section className="focus-mobile-transactions budget-recent" aria-labelledby="recent-transactions-heading">
   <header><h2 id="recent-transactions-heading">Senast registrerat</h2><button onClick={()=>onHistory()}>Alla händelser <ChevronRight size={12}/></button></header>
   {!rows.length&&<p className="focus-help">Inga inkomster eller utgifter registrerade i vald månad.</p>}
   <div className="focus-mobile-rows">{(showAll?rows:rows.slice(0,3)).map(row=><div className="focus-mobile-row" key={row.id}>
    <button className="focus-mobile-edit" disabled={!editable||busy} aria-label={'Ändra transaktion: '+row.description} onClick={()=>onEdit(row)}>
     <span><strong>{row.description}</strong><small>{row.date.slice(8,10)}/{row.date.slice(5,7)} · {row.category}{transactionBudgetMonth(row)!==row.date.slice(0,7)?` · hör till ${budgetMonthName(transactionBudgetMonth(row))}`:''}</small></span>
     <span className={row.amount>0?'focus-positive':''}>{row.amount>0?'+':''}{kr(row.amount,2)}</span>
    </button>
    {editable&&<button className="focus-mobile-delete" disabled={busy} aria-label={'Ta bort transaktion: '+row.description+', '+kr(row.amount,2)} onClick={()=>onDelete(row)}><Trash2 size={17} aria-hidden="true"/></button>}
   </div>)}</div>
   {rows.length>3&&<button className="recent-toggle" aria-expanded={showAll} onClick={()=>setShowAll(!showAll)}>{showAll?'Visa färre':'Visa fler här'}</button>}
  </section>
 </div>;
}
