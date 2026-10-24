'use client';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {type Budget} from '../lib/budget';
import {type DateRange,monthRange} from '../lib/date-range';
import {type ExpenseCategoryKey} from '../lib/expense-categories';
import MonthlyForecast from './monthly-forecast';

type Props={
 data:Budget;
 range:DateRange;
 onRange:(range:DateRange)=>void;
 onHistory:(kind?:'income'|'expense',category?:ExpenseCategoryKey)=>void;
 onOpeningBalance?:(month:string)=>void;
 editable?:boolean;
 today?:string;
};

export default function BudgetFocus({data,range,onRange,onHistory,onOpeningBalance,editable=false,today}:Props){
 const month=new Intl.DateTimeFormat('sv-SE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(range.from+'T12:00:00Z'));
 return <div className="budget-focus budget-focus--clarity">
  <div className="focus-month">
   <button aria-label="Föregående månad" onClick={()=>onRange(monthRange(range.from,-1))}><ChevronLeft size={18}/></button>
   <span>{month}</span>
   <button aria-label="Nästa månad" onClick={()=>onRange(monthRange(range.from,1))}><ChevronRight size={18}/></button>
  </div>
  <MonthlyForecast data={data} range={range} onHistory={onHistory} onOpeningBalance={onOpeningBalance} editable={editable} today={today}/>
 </div>;
}
