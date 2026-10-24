import {type Budget,sum} from './budget';
import {type DateRange,inDateRange,isCalendarMonth,isPastCalendarMonth,monthRange,stockholmDate} from './date-range';
import {costCategories,plannedExpenseCategory,type CostCategory} from './cost-selection';
import {transactionExpenseCategory} from './expense-categories';
import {transactionMatchesActiveDebt,withDebtPayments} from './debt-summary';

const cents=(n:number)=>Math.round(n*100)/100;
export const forecastTransactionCategory=(data:Budget,transaction:Budget['transactions'][number]):CostCategory=>{
 const category=transactionExpenseCategory(transaction.category,transaction.description);
 return category==='mortgage'?'mortgage':transactionMatchesActiveDebt(data,transaction)?'credit':category;
};
export function monthlyForecast(data:Budget,range:DateRange){
 const plan=withDebtPayments(data);
 const calendarMonth=isCalendarMonth(range),month=range.from.slice(0,7);
 const belongs=(row:Budget['transactions'][number])=>calendarMonth?row.date.slice(0,7)===month:inDateRange(row.date,range);
 const transactions=data.transactions.filter(row=>belongs(row)&&!row.excluded);
 const plannedIncome=sum(plan.incomes.map(row=>row.amount));
 const actualIncome=cents(transactions.filter(row=>row.kind==='income').reduce((total,row)=>total+row.amount,0));
 const plannedBy=new Map<CostCategory,number>(),actualBy=new Map<CostCategory,number>();
 for(const row of plan.expenses.filter(row=>row.status!=='Ej med')){
  const key=plannedExpenseCategory(row);plannedBy.set(key,cents((plannedBy.get(key)||0)+row.amount));
 }
 for(const row of transactions.filter(row=>row.kind==='expense')){
  const key=forecastTransactionCategory(data,row);actualBy.set(key,cents((actualBy.get(key)||0)-row.amount));
 }
 const rows=costCategories.map(category=>{
  const planned=plannedBy.get(category.key)||0,actual=actualBy.get(category.key)||0;
  const expected=actual<0?cents(planned+actual):Math.max(planned,actual);
  return {...category,planned,actual,expected,remaining:Math.max(0,cents(expected-actual)),over:Math.max(0,cents(actual-planned))};
 }).filter(row=>row.planned!==0||row.actual!==0);
 const actualExpense=sum(rows.map(row=>row.actual)),forecastExpense=sum(rows.map(row=>row.expected));
 const forecastIncome=Math.max(plannedIncome,actualIncome),forecastRemaining=sum([forecastIncome,-forecastExpense]);
 const plannedExpense=sum(rows.map(row=>row.planned));
 return {rows,transactions,plannedIncome,plannedExpense,plannedRemaining:sum([plannedIncome,-plannedExpense]),actualIncome,actualExpense,actualRemaining:sum([actualIncome,-actualExpense]),forecastIncome,forecastExpense,forecastRemaining,remainingPlanned:sum([forecastExpense,-actualExpense]),incomeRemaining:Math.max(0,sum([forecastIncome,-actualIncome])),overPlan:sum(rows.map(row=>row.over))};
}

const nextMonth=(month:string)=>monthRange(`${month}-15`,1).from.slice(0,7);

export function monthlyBalance(data:Budget,range:DateRange,today=stockholmDate()){
 const target=range.from.slice(0,7),anchors=[...(data.cashBalances||[])].filter(row=>row.month<=target).sort((a,b)=>a.month.localeCompare(b.month)),anchor=anchors.at(-1);
 const forecast=monthlyForecast(data,range);
 if(!anchor)return {...forecast,hasOpeningBalance:false,openingBalance:0,actualClosing:forecast.actualRemaining,forecastClosing:forecast.forecastRemaining};
 let opening=anchor.opening,month=anchor.month,guard=0;
 while(month<target&&guard++<240){
  const priorRange=monthRange(`${month}-15`),prior=monthlyForecast(data,priorRange);
  opening=sum([opening,isPastCalendarMonth(priorRange,today)?prior.actualRemaining:prior.forecastRemaining]);
  month=nextMonth(month);
 }
 return {...forecast,hasOpeningBalance:true,openingBalance:opening,actualClosing:sum([opening,forecast.actualRemaining]),forecastClosing:sum([opening,forecast.forecastRemaining])};
}
