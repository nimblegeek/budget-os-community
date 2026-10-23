'use client';
import {ChevronRight} from 'lucide-react';
import {type Budget,kr} from '../lib/budget';
import {type DateRange} from '../lib/date-range';
import {monthlyForecast} from '../lib/monthly-forecast';
import {type ExpenseCategoryKey} from '../lib/expense-categories';

export default function MonthlyForecast({data,range,onHistory}:{data:Budget;range:DateRange;onHistory:(kind?:'income'|'expense',category?:ExpenseCategoryKey)=>void}){
 const forecast=monthlyForecast(data,range);
 return <section className="monthly-forecast" aria-label="Så beräknas månadens kvar-belopp">
  <header><div><span>Månadsprognos</span><h2>Det här påverkar kvar</h2></div><button onClick={()=>onHistory()}>Alla händelser <ChevronRight size={12}/></button></header>
  <div className="forecast-equation">
   <div><span>Förväntad inkomst</span><strong>{kr(forecast.forecastIncome,2)}</strong><small>{forecast.incomeRemaining>0?`${kr(forecast.actualIncome)} registrerat · ${kr(forecast.incomeRemaining)} väntas`:`${kr(forecast.actualIncome)} registrerat`}</small></div>
   <span aria-hidden="true">−</span>
   <div><span>Registrerade utgifter</span><strong>{kr(forecast.actualExpense,2)}</strong><small>Redan tillagda denna månad</small></div>
   <span aria-hidden="true">−</span>
   <div><span>Kvar enligt planen</span><strong>{kr(forecast.remainingPlanned,2)}</strong><small>Planerade utgifter som återstår</small></div>
  </div>
  <div className="forecast-groups">
   {forecast.rows.map(row=><button key={row.key} onClick={()=>onHistory('expense',row.key)} aria-label={`Visa utgifter i ${row.label}`}>
    <span><strong>{row.label}</strong><small>{row.actual>0?`${kr(row.actual)} registrerat`:row.actual<0?`${kr(Math.abs(row.actual))} återbetalat`:'Inget registrerat'} · {kr(row.planned)} planerat</small></span>
    <span><strong>{kr(row.expected,2)}</strong><small>{row.over>0?`${kr(row.over)} över plan`:row.remaining>0?`${kr(row.remaining)} återstår`:'Klart'}</small></span>
   </button>)}
  </div>
  {forecast.overPlan>0&&<p className="forecast-warning">{kr(forecast.overPlan)} är registrerat utöver planerade belopp och minskar prognosen direkt.</p>}
  {data.transactions.some(row=>inRange(row.date,range)&&row.excluded)&&<p className="forecast-note">Poster markerade utanför budgeten visas i historiken men påverkar inte kvar-beloppet.</p>}
 </section>;
}

function inRange(date:string,range:DateRange){return date>=range.from&&date<=range.to}
