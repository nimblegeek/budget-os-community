import {type Budget,sum} from './budget';
import {expenseCategoryKey} from './expense-categories';
import {type DebtSnapshot} from './journey';

const normalized=(value:string)=>value.toLocaleLowerCase('sv-SE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export const isDebtPlanExpense=(expense:Budget['expenses'][number])=>(expense.category||expenseCategoryKey(expense.name))==='credit'||/(^| )(blancolan|kredit)( |$)/.test(normalized(expense.name));

export function debtSummary(debts:Budget['debts']){
 const active=debts.filter(debt=>debt.balance>0);
 return {active,balance:sum(active.map(debt=>debt.balance)),monthly:sum(active.map(debt=>debt.monthly))};
}

export function consumerDebtSummary(debts:Budget['debts']){
 return debtSummary(debts.filter(debt=>debt.type!=='Bolån'));
}

export function monthlyDebtSnapshots(history:DebtSnapshot[]){
 const months=new Map<string,{month:string;date:string;balance:number;verified:boolean}>();
 for(const snapshot of [...history].sort((a,b)=>a.date.localeCompare(b.date))){
  const month=snapshot.date.slice(0,7);
  months.set(month,{month,date:snapshot.date,balance:sum(snapshot.balances.map(row=>row.balance)),verified:snapshot.balances.every(row=>row.verified)});
 }
 return [...months.values()].sort((a,b)=>a.month.localeCompare(b.month));
}

export function withDebtPayments(data:Budget):Budget{
 const summary=consumerDebtSummary(data.debts),creditRows=data.expenses.filter(isDebtPlanExpense),base=creditRows.find(row=>(row.category||expenseCategoryKey(row.name))==='credit')||creditRows[0];
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
 if(/(^| )(blancolan|kredit)( |$)/.test(text))return true;
 return data.debts.some(debt=>debt.type!=='Bolån'&&debt.balance>0&&normalized(debt.name).length>=4&&text.includes(normalized(debt.name)));
}

export function monthlyPlanTotals(data:Budget){
 const plan=withDebtPayments(data),income=sum(plan.incomes.map(row=>row.amount)),expenses=sum(plan.expenses.filter(row=>row.status!=='Ej med').map(row=>row.amount));
 return {plan,income,expenses,remaining:sum([income,-expenses]),saving:sum(plan.goals.map(row=>row.monthly))};
}
