import {type Budget,sum} from './budget';
import {isPriorityExpense} from './priorities';
import {expenseCategories,expenseCategoryKey,type ExpenseCategoryKey} from './expense-categories';
type Expense=Budget['expenses'][number];
export const costCategories=expenseCategories;
export type CostCategory=ExpenseCategoryKey;
export const costCategory=expenseCategoryKey;
export const plannedExpenseCategory=(expense:Expense)=>expense.category||expenseCategoryKey(expense.name);
export function budgetCostGroups(expenses:Expense[]){
 return costCategories.map(category=>({...category,items:expenses.filter(e=>e.status!=='Ej med'&&plannedExpenseCategory(e)===category.key)})).filter(g=>g.items.length>0);
}
export type CostPreset='all'|'priority'|'priority-credit'|'credit'|'none';
export function presetCostIds(expenses:Expense[],preset:CostPreset){
 return expenses.filter(e=>e.status!=='Ej med'&&(preset==='all'||preset==='priority'&&isPriorityExpense(e)||preset==='priority-credit'&&(isPriorityExpense(e)||plannedExpenseCategory(e)==='credit')||preset==='credit'&&plannedExpenseCategory(e)==='credit')).map(e=>e.id);
}
export function selectedCostTotals(data:Budget,excluded:string[]){
 const eligible=data.expenses.filter(e=>e.status!=='Ej med'),selected=eligible.filter(e=>!excluded.includes(e.id));
 const income=sum(data.incomes.map(i=>i.amount)),fullCost=sum(eligible.map(e=>e.amount)),cost=sum(selected.map(e=>e.amount));
 return {income,fullCost,cost,fullRemaining:sum([income,-fullCost]),remaining:sum([income,-cost]),difference:sum([fullCost,-cost]),selected,eligible};
}
