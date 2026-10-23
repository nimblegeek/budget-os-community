'use client';
import {ChevronDown,ChevronRight} from 'lucide-react';
import {type Budget,kr} from '../lib/budget';
import {type DateRange} from '../lib/date-range';
import {type ExpenseCategoryKey} from '../lib/expense-categories';
import {budgetMonthName,forecastTransactionCategory,monthlyForecast,transactionBudgetMonth} from '../lib/monthly-forecast';

export default function MonthlyForecast({data,range,onHistory}:{data:Budget;range:DateRange;onHistory:(kind?:'income'|'expense',category?:ExpenseCategoryKey)=>void}){
 const forecast=monthlyForecast(data,range),incomes=forecast.transactions.filter(row=>row.kind==='income');
 const transaction=(row:Budget['transactions'][number])=><div className="forecast-transaction" key={row.id}>
  <span><strong>{row.description}</strong><small>{row.date}{transactionBudgetMonth(row)!==row.date.slice(0,7)?` · hör till ${budgetMonthName(transactionBudgetMonth(row))}`:''}</small></span>
  <strong className={row.amount>0?'positive':''}>{row.amount>0?'+':''}{kr(row.amount,2)}</strong>
 </div>;
 return <section className="monthly-forecast" aria-label="Budget jämfört med utfall">
  <header><div><span>Månadens ekonomi</span><h2>Budget vs utfall</h2></div><button onClick={()=>onHistory()}>Kategorisera transaktioner <ChevronRight size={12}/></button></header>
  <p className="forecast-intro">Budgeten är det du planerat. Utfallet är transaktionerna som kopplats till månaden och kategorierna. Öppna en rad för att se exakt vad som räknats in.</p>
  <div className="forecast-equation">
   <div><span>Budgeterat kvar</span><strong>{kr(forecast.plannedRemaining,2)}</strong><small>{kr(forecast.plannedIncome)} in · {kr(forecast.plannedExpense)} ut</small></div>
   <div><span>Utfall hittills</span><strong>{kr(forecast.actualRemaining,2)}</strong><small>{kr(forecast.actualIncome)} in · {kr(forecast.actualExpense)} ut</small></div>
   <div className="forecast-primary"><span>Prognos: kvar</span><strong className={forecast.forecastRemaining<0?'negative':''}>{kr(forecast.forecastRemaining,2)}</strong><small>utfall + {kr(forecast.remainingPlanned)} som återstår</small></div>
  </div>
  <div className="forecast-groups">
   <details className="forecast-category">
    <summary><span><strong>Inkomster</strong><small>{incomes.length} {incomes.length===1?'transaktion':'transaktioner'} bakom utfallet</small></span><span><strong>{kr(forecast.actualIncome,2)}</strong><small>av {kr(forecast.plannedIncome)} budgeterat</small></span><ChevronDown size={15}/></summary>
    <div className="forecast-drilldown">{incomes.length?incomes.map(transaction):<p>Ingen inkomsttransaktion är kopplad till månaden.</p>}<button onClick={()=>onHistory('income')}>Öppna inkomster i Historik &amp; import <ChevronRight size={12}/></button></div>
   </details>
   {forecast.rows.map(row=>{
    const linked=forecast.transactions.filter(transaction=>transaction.kind==='expense'&&forecastTransactionCategory(data,transaction)===row.key);
    return <details className="forecast-category" key={row.key}>
     <summary><span><strong>{row.label}</strong><small>{linked.length} {linked.length===1?'transaktion':'transaktioner'} · {kr(row.planned)} budgeterat</small></span><span><strong>{kr(row.actual,2)}</strong><small>{row.over>0?`${kr(row.over)} över budget`:row.remaining>0?`${kr(row.remaining)} återstår`:'Klart'}</small></span><ChevronDown size={15}/></summary>
     <div className="forecast-drilldown">{linked.length?linked.map(transaction):<p>Ingen transaktion är kopplad till denna kategori och månad.</p>}<button onClick={()=>onHistory('expense',row.key)}>Öppna och kategorisera <ChevronRight size={12}/></button></div>
    </details>;
   })}
  </div>
  {!forecast.rows.length&&<p className="forecast-note">Inga budgeterade eller registrerade utgifter finns för månaden. Lägg budgetbeloppen under Planera → Budgetbelopp och kategorisera utfallet under Historik &amp; import.</p>}
  {forecast.overPlan>0&&<p className="forecast-warning">{kr(forecast.overPlan)} är registrerat utöver budgeterade belopp och minskar prognosen direkt.</p>}
  {(forecast.shiftedIn.length>0||forecast.shiftedOut.length>0)&&<p className="forecast-note"><strong>Periodiserat utfall:</strong> {forecast.shiftedIn.length>0&&`${forecast.shiftedIn.length} ${forecast.shiftedIn.length===1?'post bokförd':'poster bokförda'} en annan månad räknas hit.`}{forecast.shiftedIn.length>0&&forecast.shiftedOut.length>0?' ':''}{forecast.shiftedOut.length>0&&`${forecast.shiftedOut.length} ${forecast.shiftedOut.length===1?'post bokförd':'poster bokförda'} denna månad hör till ${[...new Set(forecast.shiftedOut.map(row=>budgetMonthName(row.budgetMonth!)))].join(', ')}.`}</p>}
  {data.transactions.some(row=>row.date>=range.from&&row.date<=range.to&&row.excluded)&&<p className="forecast-note">Poster markerade utanför budgeten visas i historiken men påverkar inte Budget vs utfall.</p>}
 </section>;
}
