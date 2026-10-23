import {type Budget,sum} from './budget';
import {expenseCategoryKey} from './expense-categories';

const normalized=(value:string)=>value.toLocaleLowerCase('sv-SE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export const isDebtPlanExpense=(expense:Budget['expenses'][number])=>(expense.category||expenseCategoryKey(expense.name))==='credit'||/(^| )(bolan|blancolan|amortering)( |$)/.test(normalized(expense.name));

export function debtSummary(debts:Budget['debts']){
 const active=debts.filter(debt=>debt.balance>0);
 return {active,balance:sum(active.map(debt=>debt.balance)),monthly:sum(active.map(debt=>debt.monthly))};
}

export function withDebtPayments(data:Budget):Budget{
 const summary=debtSummary(data.debts),creditRows=data.expenses.filter(isDebtPlanExpense),base=creditRows.find(row=>(row.category||expenseCategoryKey(row.name))==='credit')||creditRows[0];
 const expenses=data.expenses.filter(expense=>!isDebtPlanExpense(expense));
 if(summary.active.length)expenses.push({
  id:base?.id||'active-debt-payments',name:'Krediter & lån',category:'credit',amount:summary.monthly,frame:summary.monthly,
  status:'Betalning',note:'Beräknas automatiskt från aktiva lån i skuldöversikten.',priority:base?.priority,
 });
 return {...data,expenses};
}

export function transactionMatchesActiveDebt(data:Budget,transaction:Budget['transactions'][number]){
 if(transaction.kind!=='expense')return false;
 const text=normalized(transaction.description+' '+transaction.category);
 if(/(^| )(bolan|hypotek|blancolan|amortering)( |$)/.test(text))return true;
 return data.debts.some(debt=>debt.balance>0&&normalized(debt.name).length>=4&&text.includes(normalized(debt.name)));
}

export function monthlyPlanTotals(data:Budget){
 const plan=withDebtPayments(data),income=sum(plan.incomes.map(row=>row.amount)),expenses=sum(plan.expenses.filter(row=>row.status!=='Ej med').map(row=>row.amount));
 return {plan,income,expenses,remaining:sum([income,-expenses]),saving:sum(plan.goals.map(row=>row.monthly))};
}
