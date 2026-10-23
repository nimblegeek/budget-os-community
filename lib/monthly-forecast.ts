import {type Budget,sum} from './budget';
import {type DateRange,inDateRange,isCalendarMonth} from './date-range';
import {costCategories,plannedExpenseCategory,type CostCategory} from './cost-selection';
import {transactionExpenseCategory} from './expense-categories';
import {transactionMatchesActiveDebt,withDebtPayments} from './debt-summary';

const cents=(n:number)=>Math.round(n*100)/100;
const transactionCategory=(data:Budget,transaction:Budget['transactions'][number]):CostCategory=>transactionMatchesActiveDebt(data,transaction)?'credit':transactionExpenseCategory(transaction.category,transaction.description);
export const transactionBudgetMonth=(transaction:Budget['transactions'][number])=>transaction.budgetMonth||transaction.date.slice(0,7);
export const budgetMonthName=(value:string)=>new Intl.DateTimeFormat('sv-SE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'-01T12:00:00Z'));

export function monthlyForecast(data:Budget,range:DateRange){
 const plan=withDebtPayments(data);
 const calendarMonth=isCalendarMonth(range),month=range.from.slice(0,7);
 const belongs=(row:Budget['transactions'][number])=>calendarMonth?transactionBudgetMonth(row)===month:inDateRange(row.date,range);
 const transactions=data.transactions.filter(row=>belongs(row)&&!row.excluded);
 const bookedTransactions=data.transactions.filter(row=>inDateRange(row.date,range)&&!row.excluded);
 const shiftedIn=calendarMonth?transactions.filter(row=>row.date.slice(0,7)!==month):[];
 const shiftedOut=calendarMonth?bookedTransactions.filter(row=>transactionBudgetMonth(row)!==month):[];
 const plannedIncome=sum(plan.incomes.map(row=>row.amount));
 const actualIncome=cents(transactions.filter(row=>row.kind==='income').reduce((total,row)=>total+row.amount,0));
 const plannedBy=new Map<CostCategory,number>(),actualBy=new Map<CostCategory,number>();
 for(const row of plan.expenses.filter(row=>row.status!=='Ej med')){
  const key=plannedExpenseCategory(row);plannedBy.set(key,cents((plannedBy.get(key)||0)+row.amount));
 }
 for(const row of transactions.filter(row=>row.kind==='expense')){
  const key=transactionCategory(data,row);actualBy.set(key,cents((actualBy.get(key)||0)-row.amount));
 }
 const rows=costCategories.map(category=>{
  const planned=plannedBy.get(category.key)||0,actual=actualBy.get(category.key)||0;
  const expected=actual<0?cents(planned+actual):Math.max(planned,actual);
  return {...category,planned,actual,expected,remaining:Math.max(0,cents(expected-actual)),over:Math.max(0,cents(actual-planned))};
 }).filter(row=>row.planned!==0||row.actual!==0);
 const actualExpense=sum(rows.map(row=>row.actual)),forecastExpense=sum(rows.map(row=>row.expected));
 const forecastIncome=Math.max(plannedIncome,actualIncome),forecastRemaining=sum([forecastIncome,-forecastExpense]);
 const plannedExpense=sum(rows.map(row=>row.planned));
 return {rows,transactions,bookedTransactions,shiftedIn,shiftedOut,plannedIncome,plannedExpense,plannedRemaining:sum([plannedIncome,-plannedExpense]),actualIncome,actualExpense,actualRemaining:sum([actualIncome,-actualExpense]),forecastIncome,forecastExpense,forecastRemaining,remainingPlanned:sum([forecastExpense,-actualExpense]),incomeRemaining:Math.max(0,sum([forecastIncome,-actualIncome])),overPlan:sum(rows.map(row=>row.over))};
}
