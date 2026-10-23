import { type Budget, kr } from './budget';
import { areas, pageOrder, groupForPage, featureGroups, type Page } from './navigation';
type Base={id:string;label:string;detail:string;group:string;keywords:string};
export type CommandAction='income'|'expense'|'transaction'|'loan'|'goal'|'plan'|'import'|'revenue-source';
export type CommandRecord='transactions'|'debts'|'incomes'|'expenses'|'goals'|'creditors'|'revenueSources';
export type CommandItem=Base & ({kind:'page';page:Page}|{kind:'action';action:CommandAction}|{kind:'record';recordKind:CommandRecord;recordId:string});
export function normalizeSearch(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv-SE').trim()}
export function createCommands(data:Budget,editable:boolean):CommandItem[]{
 const items:CommandItem[]=pageOrder.map(page=>({kind:'page',page,id:'page:'+page,label:areas[page].label,detail:(groupForPage(page)?featureGroups[groupForPage(page)!].label+' · ':'')+areas[page].number+' / '+areas[page].label.toLocaleUpperCase('sv-SE'),group:'Sidor',keywords:normalizeSearch(areas[page].number+' '+page+' '+areas[page].label+' '+(groupForPage(page)?featureGroups[groupForPage(page)!].label:''))}));
 if(editable){
  const actions:[CommandAction,string,string][]=[['revenue-source','Lägg till intäktskälla','Ordna intäkter från plattformar och samarbeten'],['income','Lägg till inkomst','Registrera en inbetalning'],['expense','Lägg till utgift','Registrera en betalning'],['transaction','Registrera händelse','Välj datum, typ och kategori'],['plan','Ändra månadsplanen','Planerade inkomster och utgifter'],['loan','Lägg till lån','Saldo och månadsbetalning'],['goal','Lägg till sparmål','Sparat belopp och månadssparande'],['import','Importera CSV','Öppna Historik & import']];
  for(const [action,label,detail] of actions)items.push({kind:'action',action,id:'action:'+action,label,detail,group:'Genvägar',keywords:normalizeSearch(label+' '+detail)});
 }
 const add=(recordKind:CommandRecord,recordId:string,label:string,detail:string,group:string,extra='')=>items.push({kind:'record',recordKind,recordId,id:recordKind+':'+recordId,label,detail,group,keywords:normalizeSearch(label+' '+detail+' '+extra)});
 for(const tx of [...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)))add('transactions',tx.id,tx.description,tx.date+' · '+tx.category+' · '+kr(tx.amount,2),'Historik',String(tx.amount));
 for(const source of data.revenueSources||[])add('revenueSources',source.id,source.name,[source.channel,source.type,source.archived?'Arkiverad':'Aktiv'].filter(Boolean).join(' · '),'Intäktskällor',source.notes+' '+String(source.monthlyTarget));
 for(const loan of data.debts)add('debts',loan.id,loan.name,kr(loan.balance,2)+' · '+kr(loan.monthly)+'/mån','Lån',String(loan.balance)+' '+String(loan.monthly)+' '+loan.type+' '+(loan.note||''));
 for(const income of data.incomes)add('incomes',income.id,income.name,kr(income.amount)+'/mån · Planerad inkomst','Månadsplan',String(income.amount));
 for(const expense of data.expenses)add('expenses',expense.id,expense.name,kr(expense.amount)+'/mån · Planerad utgift','Månadsplan',String(expense.amount)+' '+expense.note);
 for(const goal of data.goals)add('goals',goal.id,goal.name,kr(goal.saved)+' av '+kr(goal.target),'Sparande',String(goal.saved)+' '+String(goal.target)+' '+String(goal.monthly));
 for(const creditor of data.creditorWork?.cases||[])add('creditors',creditor.id,creditor.name,(creditor.archived?'Arkiverat · ':'')+(creditor.reference||'Kontakt och aktiviteter'),'Borgenärer',creditor.contact+' '+creditor.notes);
 return items;
}
export function searchCommands(items:CommandItem[],query:string):CommandItem[]{
 const terms=normalizeSearch(query).split(/\s+/).filter(Boolean);
 const groups=new Map<string,number>();
 return items.filter(item=>{
  if(!terms.length&&item.kind==='record')return false;
  if(!terms.every(term=>item.keywords.includes(term)))return false;
  const count=groups.get(item.group)||0;
  if(count>=(item.kind==='page'?pageOrder.length:6))return false;
  groups.set(item.group,count+1);return true;
 });
}
