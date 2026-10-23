import {expenseCategoryKey,type ExpenseCategoryKey} from './expense-categories';
type Expense={name:string;category?:ExpenseCategoryKey;amount:number;status:string;priority?:boolean};
// Narrow, visible category defaults; an explicit owner choice always wins.
// Do not match "el" inside "Tele" or prioritize every fee or credit payment.
export function defaultPriority(name:string){
  const n=name.toLocaleLowerCase('sv-SE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  return /^(mat|livsmedel|boende|hyra|bolan)( |$)/.test(n)
    || /^(brf avgift|bostadsrattsavgift|manadsavgift|avgift)$/.test(n)
    || /^(el|elnat|elhandel|hemforsakring|forsakring|forsakringar|vatten|va avfall|vatten avfall)( |$)/.test(n);
}
export function isPriorityExpense(expense:Expense){return expense.status!=='Ej med'&&(expense.priority??(expense.category?['home','food','utilities','insurance'].includes(expense.category):defaultPriority(expense.name)));}
export function expenseGroups<T extends Expense>(expenses:T[]){
  return [
    {key:'priority',title:'Prioriterade basutgifter',items:expenses.filter(isPriorityExpense)},
    {key:'other',title:'Övriga utgifter',items:expenses.filter(e=>e.status!=='Ej med'&&!isPriorityExpense(e))},
    {key:'excluded',title:'Utanför normalbudgeten',items:expenses.filter(e=>e.status==='Ej med')},
  ];
}
export function priorityTotal(expenses:Expense[]){return Math.round(expenses.filter(isPriorityExpense).reduce((s,e)=>s+e.amount,0)*100)/100;}
