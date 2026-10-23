import {type Budget,sum} from './budget';
import {type DateRange,inDateRange} from './date-range';
import {costCategories,costCategory,type CostCategory} from './cost-selection';

const cents=(n:number)=>Math.round(n*100)/100;
const transactionCategory=(transaction:Budget['transactions'][number]):CostCategory=>{
 const category=costCategory(transaction.category);
 return category==='other'?costCategory(transaction.description):category;
};

export function monthlyForecast(data:Budget,range:DateRange){
 const transactions=data.transactions.filter(row=>inDateRange(row.date,range)&&!row.excluded);
 const plannedIncome=sum(data.incomes.map(row=>row.amount));
 const actualIncome=cents(transactions.filter(row=>row.kind==='income').reduce((total,row)=>total+row.amount,0));
 const plannedBy=new Map<CostCategory,number>(),actualBy=new Map<CostCategory,number>();
 for(const row of data.expenses.filter(row=>row.status!=='Ej med')){
  const key=costCategory(row.name);plannedBy.set(key,cents((plannedBy.get(key)||0)+row.amount));
 }
 for(const row of transactions.filter(row=>row.kind==='expense')){
  const key=transactionCategory(row);actualBy.set(key,cents((actualBy.get(key)||0)-row.amount));
 }
 const rows=costCategories.map(category=>{
  const planned=plannedBy.get(category.key)||0,actual=actualBy.get(category.key)||0;
  const expected=actual<0?cents(planned+actual):Math.max(planned,actual);
  return {...category,planned,actual,expected,remaining:Math.max(0,cents(expected-actual)),over:Math.max(0,cents(actual-planned))};
 }).filter(row=>row.planned!==0||row.actual!==0);
 const actualExpense=sum(rows.map(row=>row.actual)),forecastExpense=sum(rows.map(row=>row.expected));
 const forecastIncome=Math.max(plannedIncome,actualIncome),forecastRemaining=sum([forecastIncome,-forecastExpense]);
 return {rows,transactions,plannedIncome,actualIncome,forecastIncome,actualExpense,forecastExpense,remainingPlanned:sum([forecastExpense,-actualExpense]),actualRemaining:sum([actualIncome,-actualExpense]),forecastRemaining,incomeRemaining:Math.max(0,sum([forecastIncome,-actualIncome])),overPlan:sum(rows.map(row=>row.over))};
}
