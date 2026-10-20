'use client';
import { ChevronRight } from 'lucide-react';
import { kr } from '../lib/budget';
type Props={income:number;expense:number;plannedIncome:number;plannedExpense:number;isCurrent:boolean;hasTransactions:boolean;onHistory:(kind:'income'|'expense')=>void;onPlan:()=>void};
export default function BudgetComparison({income,expense,plannedIncome,plannedExpense,isCurrent,hasTransactions,onHistory,onPlan}:Props){
 const minimum=Math.min(0,income,expense),maximum=Math.max(0,income,expense,plannedIncome,plannedExpense),span=maximum-minimum||1;
 const bar=(value:number)=>({left:((Math.min(0,value)-minimum)/span*100)+'%',width:(Math.abs(value)/span*100)+'%'});
 return <figure className="budget-comparison" aria-label="Budget jämfört med registrerade transaktioner">
  <figcaption><h2>Budget och transaktioner</h2><button onClick={onPlan}>Visa budget <ChevronRight size={12}/></button></figcaption>
  <div className="comparison-legend" aria-hidden="true"><span><i/> Budget</span><span><i/> Registrerat</span></div>
  {[{kind:'income' as const,title:'Inkomster',planned:plannedIncome,actual:income},{kind:'expense' as const,title:'Utgifter',planned:plannedExpense,actual:expense}].map(row=><button className="comparison-group" key={row.kind} onClick={()=>onHistory(row.kind)} aria-label={'Visa registrerade '+row.title.toLocaleLowerCase('sv-SE')+': '+kr(row.actual,2)+', budget '+kr(row.planned,2)}>
   <span className="comparison-heading">{row.title}<ChevronRight size={12}/></span>
   <span className="comparison-line"><span className="comparison-track" aria-hidden="true"><i style={bar(row.planned)}/>{minimum<0&&<b style={{left:(-minimum/span*100)+'%'}}/>}</span><span><span className="visually-hidden">Budget: </span>{kr(row.planned,2)}</span></span>
   <span className="comparison-line comparison-actual"><span className="comparison-track" aria-hidden="true"><i className={row.actual<0?'negative':''} style={bar(row.actual)}/>{minimum<0&&<b style={{left:(-minimum/span*100)+'%'}}/>}</span><span><span className="visually-hidden">Registrerat: </span>{kr(row.actual,2)}</span></span>
  </button>)}
  <p>{!hasTransactions?'Inga transaktioner registrerade i vald månad. ':''}Tryck på en rad för att se betalningarna.{!isCurrent?' Jämförelsen använder din nuvarande månadsbudget.':''} Alla registrerade utgifter ingår, även de utanför budgeten.</p>
 </figure>;
}
