'use client';
import { Plus, Pencil, ShieldCheck } from 'lucide-react';
import { type Budget, kr } from '../lib/budget';
import ExpenseList from './expense-list';
import {monthlyPlanTotals} from '../lib/debt-summary';
import {plannedExpenseCategory} from '../lib/cost-selection';

export default function SimpleBudget({data,editable,onIncome,onExpense,onDebt}:{data:Budget;editable:boolean;onIncome:(item?:Budget['incomes'][number])=>void;onExpense:(item?:Budget['expenses'][number])=>void;onDebt?:()=>void}) {
 const t=monthlyPlanTotals(data);
 return <div className="simple-budget" id="budget-details">
  <section className="budget-result" aria-label="Månadsbudgetens resultat">
   <div><span>Kvar enligt budget</span><strong className={t.remaining<0?'negative':''}>{kr(t.remaining)}</strong></div>
   <dl><div><dt>Inkomster</dt><dd>{kr(t.income)}</dd></div><div><dt>Utgifter</dt><dd>− {kr(t.expenses)}</dd></div></dl>
   <p>Planerade inkomster minus planerade utgifter. Sparande och poster du har valt bort är inte avdragna.</p>
  </section>
  <section className="panel budget-step" aria-labelledby="income-heading">
   <header className="step-heading"><span className="step-number" aria-hidden="true">1</span><div><h2 id="income-heading">Inkomster</h2><p>Efter skatt, per månad</p></div><strong>{kr(t.income)}</strong></header>
   {data.incomes.length?data.incomes.map(item=><button key={item.id} className="budgetrow" disabled={!editable} aria-label={`Ändra inkomst: ${item.name}`} onClick={()=>onIncome(item)}><span><strong>{item.name}</strong></span><strong>{kr(item.amount)}</strong>{editable&&<span className="row-edit"><Pencil size={15}/><span>Ändra</span></span>}</button>):<p className="budget-empty">Lägg till lön, bidrag eller annan återkommande inkomst.</p>}
   {editable&&<div className="step-action"><button className="btn light full" onClick={()=>onIncome()}><Plus size={18}/> Lägg till inkomst</button></div>}
  </section>
  <section className="panel budget-step" aria-labelledby="expense-heading">
   <header className="step-heading"><span className="step-number" aria-hidden="true">2</span><div><h2 id="expense-heading">Utgifter</h2><p>Vad du planerar att betala per månad</p></div><strong>{kr(t.expenses)}</strong></header>
   {editable&&<div className="step-action"><button className="btn light full" onClick={()=>onExpense()}><Plus size={18}/> Lägg till planerad utgift</button></div>}
   {t.plan.expenses.length?<ExpenseList expenses={t.plan.expenses} editable={editable} onEdit={item=>plannedExpenseCategory(item)==='credit'&&onDebt?onDebt():onExpense(data.expenses.find(row=>row.id===item.id)||item)}/>:<p className="budget-empty">Börja med boende, mat, el och försäkring.</p>}
  </section>
  <p className="budget-help"><ShieldCheck size={16}/> Krediter & lån hämtas automatiskt från blancolån och krediter i Skuldöversikten. Bolån ligger separat som en boendekostnad. Övriga ändringar här uppdaterar budgetbeloppen som jämförs med utfallet.</p>
 </div>;
}
