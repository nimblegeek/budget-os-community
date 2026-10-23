import {type Budget,sum} from './budget';
import {isPriorityExpense} from './priorities';
type Expense=Budget['expenses'][number];
export const costCategories=[{key:'home',label:'Boende'},{key:'food',label:'Mat & livsmedel'},{key:'utilities',label:'El, värme & vatten'},{key:'insurance',label:'Försäkringar'},{key:'phone',label:'Tele & abonnemang'},{key:'credit',label:'Krediter & lån'},{key:'transport',label:'Transport'},{key:'other',label:'Övriga utgifter'}] as const;
export type CostCategory=typeof costCategories[number]['key'];
const normalize=(text:string)=>text.toLocaleLowerCase('sv-SE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
// Visible name-based suggestions only; no new classification is written to storage.
export function costCategory(name:string):CostCategory{
 const n=normalize(name);
 if(/^(boende|hyra|bolan|bostad|brf)( |$)|^(avgift|bostadsrattsavgift|manadsavgift)$/.test(n))return 'home';
 if(/^(mat|livsmedel|matvaror)( |$)/.test(n))return 'food';
 if(/^(el|elnat|elhandel|varme|vatten|va avfall)( |$)/.test(n))return 'utilities';
 if(/^(forsakring|forsakringar|hemforsakring|personforsakring|bilforsakring)( |$)/.test(n))return 'insurance';
 if(/^(tele|telefon|mobil|internet|bredband|tv|abonnemang)( |$)/.test(n))return 'phone';
 if(/(?:^| )(krediter?|blancolan|lan|amortering|ranta)( |$)/.test(n))return 'credit';
 if(/^(transport|resor|buss|tag|bil|drivmedel|parkering)( |$)/.test(n))return 'transport';
 return 'other';
}
export function budgetCostGroups(expenses:Expense[]){
 return costCategories.map(category=>({...category,items:expenses.filter(e=>e.status!=='Ej med'&&costCategory(e.name)===category.key)})).filter(g=>g.items.length>0);
}
export type CostPreset='all'|'priority'|'priority-credit'|'credit'|'none';
export function presetCostIds(expenses:Expense[],preset:CostPreset){
 return expenses.filter(e=>e.status!=='Ej med'&&(preset==='all'||preset==='priority'&&isPriorityExpense(e)||preset==='priority-credit'&&(isPriorityExpense(e)||costCategory(e.name)==='credit')||preset==='credit'&&costCategory(e.name)==='credit')).map(e=>e.id);
}
export function selectedCostTotals(data:Budget,excluded:string[]){
 const eligible=data.expenses.filter(e=>e.status!=='Ej med'),selected=eligible.filter(e=>!excluded.includes(e.id));
 const income=sum(data.incomes.map(i=>i.amount)),fullCost=sum(eligible.map(e=>e.amount)),cost=sum(selected.map(e=>e.amount));
 return {income,fullCost,cost,fullRemaining:sum([income,-fullCost]),remaining:sum([income,-cost]),difference:sum([fullCost,-cost]),selected,eligible};
}
