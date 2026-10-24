'use client';
import {ChevronDown,ChevronRight} from 'lucide-react';
import {type Budget,kr} from '../lib/budget';
import {isPastCalendarMonth,type DateRange} from '../lib/date-range';
import {type ExpenseCategoryKey} from '../lib/expense-categories';
import {budgetMonthName,forecastTransactionCategory,monthlyForecast,transactionBudgetMonth} from '../lib/monthly-forecast';

export default function MonthlyForecast({data,range,onHistory,today}:{data:Budget;range:DateRange;onHistory:(kind?:'income'|'expense',category?:ExpenseCategoryKey)=>void;today?:string}){
 const forecast=monthlyForecast(data,range),incomes=forecast.transactions.filter(row=>row.kind==='income'),past=isPastCalendarMonth(range,today);
 const unreviewed=forecast.transactions.filter(row=>!row.reviewed).length,variance=forecast.actualRemaining-forecast.plannedRemaining;
 const primary=past?forecast.actualRemaining:forecast.forecastRemaining;
 const varianceText=variance===0?'Enligt budget':`${kr(Math.abs(variance),2)} ${variance>0?'bättre':'sämre'} än budget`;
 const transaction=(row:Budget['transactions'][number])=><div className="forecast-transaction" key={row.id}>
  <span><strong>{row.description}</strong><small>{row.date}{transactionBudgetMonth(row)!==row.date.slice(0,7)?` · hör till ${budgetMonthName(transactionBudgetMonth(row))}`:''}</small></span>
  <strong className={row.amount>0?'positive':''}>{row.amount>0?'+':''}{kr(row.amount,2)}</strong>
 </div>;
 return <section className="monthly-forecast" aria-label="Budget jämfört med utfall">
  <header><div><span>{past?'Avslutad månad':'Budget & utfall'}</span><h2>{past?'Månadens utfall':'Månadens budget'}</h2></div><button onClick={()=>onHistory()}>{unreviewed?`Granska · ${unreviewed}`:'Kategorisera'} <ChevronRight size={12}/></button></header>
  <div className="forecast-equation">
   <div className="forecast-primary">
    <span>{past?'Faktiskt kvar för månaden':'Kvar vid månadens slut'}</span>
    <output aria-live="polite" className={primary<0?'negative':''}>{kr(primary,2)}</output>
    <small>{past?varianceText:'När registrerade utgifter och resten av månadens budget är betalda.'}</small>
   </div>
   <details className="forecast-math">
    <summary>{past?'Jämför med budget':'Så räknas det'} <ChevronDown size={14}/></summary>
    {past?<>
     <dl>
      <div><dt>Registrerade inkomster</dt><dd>{kr(forecast.actualIncome,2)}</dd></div>
      <div><dt>Registrerade utgifter</dt><dd>− {kr(forecast.actualExpense,2)}</dd></div>
      <div className="forecast-math-total"><dt>Faktiskt kvar</dt><dd>{kr(forecast.actualRemaining,2)}</dd></div>
      <div><dt>Kvar enligt nuvarande budget</dt><dd>{kr(forecast.plannedRemaining,2)}</dd></div>
      <div><dt>Avvikelse</dt><dd className={variance<0?'negative':''}>{variance>=0?'+ ':'− '}{kr(Math.abs(variance),2)}</dd></div>
     </dl>
     <p>Utfallet bygger bara på transaktioner som hör till månaden. Jämförelsen använder din nuvarande månadsbudget.</p>
    </>:<>
     <dl>
      <div><dt>Inkomster som räknas med</dt><dd>{kr(forecast.forecastIncome,2)}</dd></div>
      <div><dt>Utgifter registrerade hittills</dt><dd>− {kr(forecast.actualExpense,2)}</dd></div>
      <div><dt>Utgifter kvar enligt budget</dt><dd>− {kr(forecast.remainingPlanned,2)}</dd></div>
      <div className="forecast-math-total"><dt>Kvar vid månadens slut</dt><dd>{kr(forecast.forecastRemaining,2)}</dd></div>
     </dl>
     <p>För inkomster används det högsta av budgeterat och registrerat belopp. Om en utgiftskategori går över budget räknas det högre utfallet.</p>
    </>}
   </details>
  </div>
  <div className="forecast-groups">
   <details className="forecast-category">
    <summary><span><strong>Inkomster</strong><small>{incomes.length} {incomes.length===1?'transaktion':'transaktioner'} bakom utfallet</small></span><span><strong>{kr(forecast.actualIncome,2)}</strong><small>av {kr(forecast.plannedIncome)} budgeterat</small></span><ChevronDown size={15}/></summary>
    <div className="forecast-drilldown">{incomes.length?incomes.map(transaction):<p>Ingen inkomsttransaktion är kopplad till månaden.</p>}<button onClick={()=>onHistory('income')}>Öppna inkomster i Historik &amp; import <ChevronRight size={12}/></button></div>
   </details>
   {forecast.rows.map(row=>{
    const linked=forecast.transactions.filter(transaction=>transaction.kind==='expense'&&forecastTransactionCategory(data,transaction)===row.key);
    return <details className="forecast-category" key={row.key}>
     <summary><span><strong>{row.label}</strong><small>{linked.length} {linked.length===1?'transaktion':'transaktioner'} · {kr(row.planned)} budgeterat</small></span><span><strong>{kr(row.actual,2)}</strong><small>{row.over>0?`${kr(row.over)} över budget`:row.remaining>0?`${kr(row.remaining)} ${past?'under budget':'återstår'}`:past?'Enligt budget':'Klart'}</small></span><ChevronDown size={15}/></summary>
     <div className="forecast-drilldown">{linked.length?linked.map(transaction):<p>Ingen transaktion är kopplad till denna kategori och månad.</p>}<button onClick={()=>onHistory('expense',row.key)}>Öppna och kategorisera <ChevronRight size={12}/></button></div>
    </details>;
   })}
  </div>
  {!forecast.rows.length&&<p className="forecast-note">Inga budgeterade eller registrerade utgifter finns för månaden. Lägg budgetbeloppen under Planera → Budgetbelopp och kategorisera utfallet under Historik &amp; import.</p>}
  {past&&forecast.transactions.length===0&&<p className="forecast-warning">Inga transaktioner är kopplade till månaden. Utfallet är därför inte komplett ännu.</p>}
  {unreviewed>0&&<p className="forecast-warning">{unreviewed} {unreviewed===1?'transaktion behöver':'transaktioner behöver'} granskas. {past?'Utfallet kan fortfarande ändras.':'Prognosen kan ändras.'}</p>}
  {forecast.overPlan>0&&<p className="forecast-warning">{kr(forecast.overPlan)} är registrerat utöver budgeterade belopp{past?'.':' och minskar prognosen direkt.'}</p>}
  {(forecast.shiftedIn.length>0||forecast.shiftedOut.length>0)&&<p className="forecast-note"><strong>Periodiserat utfall:</strong> {forecast.shiftedIn.length>0&&`${forecast.shiftedIn.length} ${forecast.shiftedIn.length===1?'post bokförd':'poster bokförda'} en annan månad räknas hit.`}{forecast.shiftedIn.length>0&&forecast.shiftedOut.length>0?' ':''}{forecast.shiftedOut.length>0&&`${forecast.shiftedOut.length} ${forecast.shiftedOut.length===1?'post bokförd':'poster bokförda'} denna månad hör till ${[...new Set(forecast.shiftedOut.map(row=>budgetMonthName(row.budgetMonth!)))].join(', ')}.`}</p>}
  {data.transactions.some(row=>row.date>=range.from&&row.date<=range.to&&row.excluded)&&<p className="forecast-note">Poster markerade utanför budgeten visas i historiken men påverkar inte Budget vs utfall.</p>}
 </section>;
}
