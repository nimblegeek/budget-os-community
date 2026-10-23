'use client';
import {ChevronRight} from 'lucide-react';
import {type Budget,kr} from '../lib/budget';
import {type DateRange} from '../lib/date-range';
import {budgetMonthName,monthlyForecast} from '../lib/monthly-forecast';
import {type ExpenseCategoryKey} from '../lib/expense-categories';

export default function MonthlyForecast({data,range,onHistory}:{data:Budget;range:DateRange;onHistory:(kind?:'income'|'expense',category?:ExpenseCategoryKey)=>void}){
 const forecast=monthlyForecast(data,range);
 return <section className="monthly-forecast" aria-label="Så beräknas månadens kvar-belopp">
  <header><div><span>Budget vs utfall</span><h2>Plan, hittills och prognos</h2></div><button onClick={()=>onHistory()}>Alla händelser <ChevronRight size={12}/></button></header>
  <div className="forecast-equation">
   <div><span>Budget</span><strong>{kr(forecast.plannedRemaining,2)}</strong><small>{kr(forecast.plannedIncome)} in · {kr(forecast.plannedExpense)} ut</small></div>
   <div><span>Utfall hittills</span><strong>{kr(forecast.actualRemaining,2)}</strong><small>{kr(forecast.actualIncome)} in · {kr(forecast.actualExpense)} ut</small></div>
   <div className="forecast-primary"><span>Prognos vid månadsslut</span><strong>{kr(forecast.forecastRemaining,2)}</strong><small>{kr(forecast.remainingPlanned)} planerade utgifter återstår</small></div>
  </div>
  <div className="forecast-groups">
   {forecast.rows.map(row=><button key={row.key} onClick={()=>onHistory('expense',row.key)} aria-label={`Visa utgifter i ${row.label}`}>
    <span><strong>{row.label}</strong><small>{row.actual>0?`${kr(row.actual)} registrerat`:row.actual<0?`${kr(Math.abs(row.actual))} återbetalat`:'Inget registrerat'} · {kr(row.planned)} planerat</small></span>
    <span><strong>{kr(row.expected,2)}</strong><small>{row.over>0?`${kr(row.over)} över plan`:row.remaining>0?`${kr(row.remaining)} återstår`:'Klart'}</small></span>
   </button>)}
  </div>
  {forecast.overPlan>0&&<p className="forecast-warning">{kr(forecast.overPlan)} är registrerat utöver planerade belopp och minskar prognosen direkt.</p>}
  {(forecast.shiftedIn.length>0||forecast.shiftedOut.length>0)&&<p className="forecast-note"><strong>Periodiserat utfall:</strong> {forecast.shiftedIn.length>0&&`${forecast.shiftedIn.length} ${forecast.shiftedIn.length===1?'post bokförd':'poster bokförda'} en annan månad räknas hit.`}{forecast.shiftedIn.length>0&&forecast.shiftedOut.length>0?' ':''}{forecast.shiftedOut.length>0&&`${forecast.shiftedOut.length} ${forecast.shiftedOut.length===1?'post bokförd':'poster bokförda'} denna månad hör till ${[...new Set(forecast.shiftedOut.map(row=>budgetMonthName(row.budgetMonth!)))].join(', ')}.`}</p>}
  {data.transactions.some(row=>inRange(row.date,range)&&row.excluded)&&<p className="forecast-note">Poster markerade utanför budgeten visas i historiken men påverkar inte kvar-beloppet.</p>}
 </section>;
}

function inRange(date:string,range:DateRange){return date>=range.from&&date<=range.to}
