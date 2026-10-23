import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import SimpleBudget from '../app/simple-budget.tsx';
import RecordFields from '../app/record-fields.tsx';
import BudgetFocus from '../app/budget-focus.tsx';
import BudgetCostPicker from '../app/budget-cost-picker.tsx';
import DebtFocus from '../app/debt-focus.tsx';
import {debtAttackOrder} from '../lib/debt-order.ts';
import {monthlyForecast} from '../lib/monthly-forecast.ts';
import SavingsFocus from '../app/savings-focus.tsx';
import AreaHeading from '../app/area-heading.tsx';
import HomeHub,{GroupHub,PageTrail} from '../app/home-hub.tsx';
import Landing from '../app/landing.tsx';
import {monthRange} from '../lib/date-range.ts';
import BudgetComparison from '../app/budget-comparison.tsx';
import {createCommands,searchCommands} from '../lib/commands.ts';
import {areas,mobilePrimary,mobileMore,featureGroups,groupOrder,groupForPage,pageTrail,sidebarPages} from '../lib/navigation.ts';
import {isSidebarShortcut} from '../lib/sidebar.ts';
import {emptyBudget,kr} from '../lib/budget.ts';
import {debtSummary,monthlyDebtSnapshots,monthlyPlanTotals,withDebtPayments} from '../lib/debt-summary.ts';
const noop=()=>{};
test('Budget cost picker exposes local grouped checkboxes, selection presets and explicit plan-only results',()=>{
 const data={...emptyBudget,incomes:[{id:'i',name:'Lön',amount:20000}],expenses:[{id:'m',name:'Mat',amount:3000,frame:3000,status:'Ram',note:''},{id:'c',name:'Krediter & blancolån',amount:999,frame:999,status:'Ram',note:''}],debts:[{id:'d',name:'Lån',balance:10000,original:10000,rate:10,monthly:2000,type:'Blanco',note:'',balanceVerified:true}]};
 const before=structuredClone(data),html=renderToStaticMarkup(createElement(BudgetCostPicker,{data}));
 for(const text of ['Jämför olika lägen','Prioriterade','Krediter','Ta med kategorin Mat &amp; livsmedel','Ta med kategorin Krediter &amp; lån','Valda utgifter / mån','Kvar enligt urval','15 000,00 kr','Scenarier · budgetbeloppen ändras inte','Återställ utgiftsurval'])assert.ok(html.includes(text),text);
 assert.ok(html.includes('type="checkbox"'));assert.ok(!html.includes('Spara urval'));assert.deepEqual(data,before);
});
test('Budget cost picker is safe in empty/read-only budgets and explains credit and actual-transaction boundaries',()=>{
 const html=renderToStaticMarkup(createElement(BudgetCostPicker,{data:emptyBudget}));
 assert.ok(html.includes('Lägg till planerade utgifter under Budgetbelopp'));assert.ok(!html.includes('type="checkbox"'));
 assert.ok(html.includes('Skuldöversikten'));assert.ok(html.includes('Äldre manuella kreditrader läggs inte ovanpå'));assert.ok(html.includes('prognosen ändras först'));
});
test('Mortgage stays separate while consumer-debt payments come from the debt overview',()=>{
 const debts=[{id:'a',name:'Blanco',balance:10000,original:10000,rate:10,monthly:700,type:'Blanco',note:'',balanceVerified:true},{id:'b',name:'Bolån',balance:500000,original:500000,rate:4,monthly:4200,type:'Bolån',note:'',balanceVerified:true},{id:'closed',name:'Klart',balance:0,original:1000,rate:8,monthly:100,type:'Kredit',note:'',balanceVerified:true}];
 const data={...emptyBudget,incomes:[{id:'i',name:'Lön',amount:20000}],expenses:[{id:'c',name:'Krediter & blancolån',category:'credit',amount:123,frame:123,status:'Ram',note:''},{id:'mortgage',name:'Bolån – ränta och amortering',category:'home',amount:4200,frame:4200,status:'Betalning',note:''},{id:'m',name:'Mat',category:'food',amount:3000,frame:3000,status:'Ram',note:''}],debts};
 const summary=debtSummary(debts),plan=monthlyPlanTotals(data),effective=withDebtPayments(data),credit=effective.expenses.find(row=>row.category==='credit');
 assert.equal(summary.monthly,4900);assert.equal(credit.amount,700);assert.equal(plan.expenses,7900);assert.equal(plan.remaining,12100);
 assert.equal(effective.expenses.filter(row=>row.category==='credit').length,1);assert.ok(effective.expenses.some(row=>row.id==='mortgage'));assert.equal(data.expenses[0].amount,123);
 const html=renderToStaticMarkup(createElement(SimpleBudget,{data,editable:true,onIncome:noop,onExpense:noop,onDebt:noop}));
 assert.ok(html.includes(kr(700)));assert.ok(html.includes('Bolån ligger separat'));
 const forecast=monthlyForecast({...data,transactions:[{id:'tx',date:'2026-10-02',description:'Nordea Hypotek',amount:-4200,kind:'expense',category:'Boende',reviewed:true,source:'Test',excluded:false}]},{from:'2026-10-01',to:'2026-10-31'});
 assert.equal(forecast.rows.find(row=>row.key==='mortgage').actual,4200);assert.equal(forecast.rows.find(row=>row.key==='credit').actual,0);
});

test('Four separately registered mortgage payments reconcile with one mortgage budget category',()=>{
 const transactions=[884,1398,1062,1398].map((amount,index)=>({id:String(index),date:'2026-10-27',description:`Bolån del ${index+1}`,amount:-amount,kind:'expense',category:'Bolån',reviewed:true,source:'Test',excluded:false}));
 const forecast=monthlyForecast({...emptyBudget,expenses:[{id:'mortgage',name:'Bolån',category:'mortgage',amount:4742,frame:4742,status:'Betalning',note:''}],transactions},{from:'2026-10-01',to:'2026-10-31'});
 assert.equal(forecast.rows.find(row=>row.key==='mortgage').planned,4742);
 assert.equal(forecast.rows.find(row=>row.key==='mortgage').actual,4742);
 assert.equal(forecast.rows.find(row=>row.key==='credit'),undefined);
});
test('Budget surface keeps one budget-versus-actual overview and transaction drilldowns',()=>{
 const range=monthRange(),data={...emptyBudget,incomes:[{id:'p',name:'Lön',amount:20000}],expenses:[{id:'m',name:'Mat',amount:3000,frame:3000,status:'Ram',note:''}],transactions:[{id:'t',date:range.from,description:'Utgift',amount:-100,kind:'expense',category:'Mat',source:'Test',reviewed:true,excluded:false}]};
 const html=renderToStaticMarkup(createElement(BudgetFocus,{data,range,onRange:noop,onHistory:noop}));
 assert.ok(html.includes('Budget vs utfall'));assert.ok(html.includes('17 000,00 kr'));
 assert.ok(html.includes('Utgift'));assert.ok(html.includes('Öppna och kategorisera'));
 assert.ok(!html.includes('Månadsplan'));assert.ok(!html.includes('Välj och jämför planerade utgifter'));
});
test('Public landing is a separate presentation, links to JAS and explains private access and demo figures honestly',()=>{
 const html=renderToStaticMarkup(createElement(Landing));
 assert.equal((html.match(/<h1/g)||[]).length,1);
 assert.ok(html.includes('Mer koll.'));assert.ok(html.includes('Mindre brus.'));
 assert.ok(html.includes('href="https://jonasasihlen.com"'));assert.ok(html.includes('made with faith by'));
 assert.ok(html.includes('rel="noopener noreferrer"'));
 assert.ok(html.includes('href="/sign-in"'));assert.ok(html.includes('href="/sign-up"'));
 assert.ok(html.includes('påhittade belopp'));assert.ok(html.includes('inloggning och uttrycklig behörighet'));
 assert.ok(html.includes('varje nytt konto får en egen tom arbetsyta'));
 assert.ok(html.includes('Portföljstöd kommer senare'));assert.ok(html.includes('Kommande'));
 assert.ok(html.includes('Ingen automatisk bankkoppling'));
 assert.ok(html.includes('href="#sa-funkar-det"'));assert.ok(html.includes('id="sa-funkar-det"'));
 assert.ok(!html.includes('iframe'));assert.ok(!html.includes('test.csv'));assert.ok(!html.includes('owner@'));
});
test('Home contains exactly four ordered cards, honest current-month actuals, and no fabricated investment balance',()=>{
 const date=monthRange().from;
 const budget={...emptyBudget,transactions:[
  {id:'i',date,description:'Income',amount:1000.25,kind:'income',category:'',reviewed:true,source:'Test',excluded:false},
  {id:'e',date,description:'Expense',amount:-1200,kind:'expense',category:'',reviewed:true,source:'Test',excluded:true},
  {id:'t',date,description:'Transfer',amount:5000,kind:'transfer',category:'',reviewed:true,source:'Test',excluded:true},
 ],incomes:[{id:'p',name:'Plan',amount:90000}],goals:[{id:'g',name:'Goal',target:5000,saved:500,monthly:100}],debts:[{id:'d',name:'Debt',balance:12500,original:13000,rate:0,monthly:100,type:'Blanco',note:'',balanceVerified:true}]};
 const before=JSON.stringify(budget),html=renderToStaticMarkup(createElement(HomeHub,{data:budget,onNavigate:noop}));
 assert.equal((html.match(/class="hub-card hub-card--/g)||[]).length,4);
 assert.ok(html.indexOf('Öppna Spara')<html.indexOf('Öppna Investera'));
 assert.ok(html.indexOf('Öppna Investera')<html.indexOf('Öppna Planera'));
 assert.ok(html.indexOf('Öppna Planera')<html.indexOf('Öppna Skulder'));
 for(const value of [kr(-199.75),kr(500),kr(12500)])assert.ok(html.includes(value));
 assert.ok(!html.includes(kr(90000)));assert.ok(html.includes('Kommande'));assert.ok(html.includes('Portföljstöd kommer senare'));
 assert.equal(JSON.stringify(budget),before);
});
test('Every existing function has one main group and breadcrumbs back to that group and home',()=>{
 for(const page of Object.keys(areas).filter(p=>p!=='Start')){
  const group=groupForPage(page);assert.ok(group,page);
  assert.equal(groupOrder.filter(k=>featureGroups[k].page===page||featureGroups[k].pages.includes(page)).length,1);
  assert.equal(pageTrail(page)[0],'Start');
 }
 assert.deepEqual(pageTrail('Start'),[]);assert.deepEqual(pageTrail('Transaktioner'),['Start','Planera']);
 assert.deepEqual(pageTrail('Borgenärer'),['Start','Stöd']);
 assert.deepEqual(pageTrail('Sparande'),['Start']);
 const html=renderToStaticMarkup(createElement(PageTrail,{page:'Underlag',onNavigate:noop}));
 assert.ok(html.includes('Till startsidan'));assert.ok(html.includes('Till Planera'));
});
test('Planning separates the monthly view from history/import and keeps advisor tools optional',()=>{
 const planning=renderToStaticMarkup(createElement(GroupHub,{group:'planera',onNavigate:noop}));
 for(const text of ['Budget','Budgetbelopp','Historik &amp; import','Intäkter','Data &amp; historik','Kategorisera'])assert.ok(planning.includes(text),text);
 assert.ok(!planning.includes('Rådgivarsamarbete'));
 const debt=renderToStaticMarkup(createElement(GroupHub,{group:'stöd',onNavigate:noop}));
 assert.ok(debt.includes('<details class="hub-support">'));assert.ok(!debt.includes('<details open'));
 assert.ok(debt.includes('Valfritt'));assert.ok(debt.includes('Borgenärer'));assert.ok(debt.includes('Rådgivarsamarbete'));
 const investment=renderToStaticMarkup(createElement(GroupHub,{group:'investera',onNavigate:noop}));
 assert.ok(investment.includes('ingen registrering av innehav'));assert.ok(investment.includes('Till Spara'));
 assert.ok(!investment.includes('<output'));assert.ok(!investment.includes('köp'));
});
test('Every area has one consistent identifier and is reachable on mobile',()=>{
 assert.deepEqual(groupOrder.map(k=>featureGroups[k].label),['Spara','Investera','Planera','Skulder & stöd']);
 assert.equal(new Set(Object.values(areas).map(a=>a.number)).size,Object.keys(areas).length);
 const reachable=new Set([...mobilePrimary,...mobileMore,...groupOrder.flatMap(k=>[featureGroups[k].page,...featureGroups[k].pages])]);
 assert.deepEqual(reachable,new Set(Object.keys(areas)));
 assert.deepEqual(sidebarPages,['Start','Sparande','Investera','Planera','Stöd']);
 for(const page of Object.keys(areas)){
  const html=renderToStaticMarkup(createElement(AreaHeading,{page}));
  assert.equal((html.match(/<h1/g)||[]).length,1);
  assert.ok(html.includes(areas[page].number));
  assert.ok(html.includes(areas[page].label.toLocaleUpperCase('sv-SE').replaceAll('&','&amp;')));
 }
});
test('Savings has two live totals, direct record actions, and a read-only mode',()=>{
 const goals=[{id:'g',name:'Buffert',target:10000,saved:2000,monthly:500},{id:'h',name:'Resa',target:1000,saved:500,monthly:100}];
 const props={goals,editable:true,busy:false,onAdd:noop,onEdit:noop,onDelete:noop};
 const before=JSON.stringify(goals),html=renderToStaticMarkup(createElement(SavingsFocus,props));
 assert.equal((html.match(/<output/g)||[]).length,2);
 assert.ok(html.includes(`>${kr(2500,2)}</output>`));assert.ok(html.includes(`>${kr(600,2)}</output>`));
 assert.ok(html.includes('Ändra sparmål: Buffert'));assert.ok(html.includes('Ta bort sparmål: Buffert'));
 assert.ok(html.includes('<details class="focus-explainer">'));
 const readonly=renderToStaticMarkup(createElement(SavingsFocus,{...props,editable:false}));
 assert.ok(!readonly.includes('Ta bort sparmål:'));assert.ok(!readonly.includes('Lägg till sparmål'));
 assert.equal((readonly.match(/disabled=""/g)||[]).length,2);
 const busy=renderToStaticMarkup(createElement(SavingsFocus,{...props,busy:true}));
 assert.equal((busy.match(/disabled=""/g)||[]).length,5);
 assert.equal(JSON.stringify(goals),before);
 const empty=renderToStaticMarkup(createElement(SavingsFocus,{...props,goals:[]}));
 assert.ok(empty.includes('Inga sparmål ännu.'));assert.ok(empty.includes(`>${kr(0,2)}</output>`));
});
const data={...emptyBudget,incomes:[{id:'i',name:'Exempellön',amount:20000}],expenses:[{id:'e',name:'Mat',amount:3500,frame:3500,status:'Ram',note:''},{id:'x',name:'Inkasso',amount:9000,frame:9000,status:'Ej med',note:''}]};
test('Simple budget keeps monthly totals, priority and excluded records intact',()=>{
 const before=JSON.stringify(data),html=renderToStaticMarkup(createElement(SimpleBudget,{data,editable:true,onIncome:noop,onExpense:noop}));
 assert.ok(html.includes(kr(16500)));assert.ok(html.includes('Lägg till inkomst'));assert.ok(html.includes('Lägg till planerad utgift'));assert.ok(html.includes('Ändra planerad utgift: Mat, prioriterad'));assert.ok(html.includes('Inkasso'));assert.equal(JSON.stringify(data),before);
});
test('Read-only budget does not expose add controls and all record buttons are disabled',()=>{
 const html=renderToStaticMarkup(createElement(SimpleBudget,{data,editable:false,onIncome:noop,onExpense:noop}));
 assert.equal((html.match(/<button/g)||[]).length,3);assert.equal((html.match(/disabled=""/g)||[]).length,3);assert.ok(!html.includes('Lägg till inkomst'));assert.ok(!html.includes('Lägg till planerad utgift'));
});
test('Empty budget provides clear first actions',()=>{
 const html=renderToStaticMarkup(createElement(SimpleBudget,{data:emptyBudget,editable:true,onIncome:noop,onExpense:noop}));
 assert.ok(html.includes('Lägg till inkomst'));assert.ok(html.includes('Börja med boende'));assert.ok(html.includes(kr(0)));
});
test('Collapsed extra fields remain in form with their existing values',()=>{
 const html=renderToStaticMarkup(createElement(RecordFields,{fields:[{name:'amount',label:'Belopp',type:'number',value:450},{name:'priority',label:'Prioritet',value:'Övrig',options:['Prioriterad','Övrig']},{name:'note',label:'Anteckning',value:'Bevara mig',optional:true}]}));
 assert.ok(html.includes('inputMode="decimal"'));assert.ok(html.includes('name="amount"'));assert.ok(html.includes('<details class="form-extra">'));assert.ok(html.includes('name="priority"'));assert.ok(html.includes('selected=""'));assert.ok(html.includes('value="Bevara mig"'));assert.ok(!html.includes('<details open'));
});
const focusProps={range:{from:'2026-10-01',to:'2026-10-31'},onRange:noop,editable:true,busy:false,onAdd:noop,onEdit:noop,onDelete:noop,onIncome:noop,onExpense:noop,onHistory:noop,onImport:noop};
function focusHtml(transactions=[],overrides={}) {
 return renderToStaticMarkup(createElement(BudgetFocus,{...focusProps,data:{...data,transactions},...overrides}));
}
const tx=(id,amount,kind,date='2026-10-20')=>({id,amount,kind,date,description:id,category:'Test',excluded:false,reviewed:true,source:'Test'});
test('Budget landing contains only the traceable budget-versus-actual flow',()=>{
 const html=focusHtml();
 assert.equal((html.match(/class="monthly-forecast"/g)||[]).length,1);
 assert.ok(html.includes(kr(16500,2)));assert.ok(html.includes('Budget vs utfall'));
 assert.ok(html.includes('Kategorisera transaktioner'));assert.ok(html.includes('Öppna inkomster i Historik &amp; import'));
 assert.ok(!html.includes('Månadsplan'));assert.ok(!html.includes('Senast registrerat'));assert.ok(!html.includes('Lägg till inkomst'));
});
test('Budget forecast combines registered events with remaining plan without counting costs twice',()=>{
 const rows=[tx('Lön',28000,'income'),tx('Hyra',-8500,'expense'),{...tx('Inkasso',-1000,'expense'),excluded:true},tx('Återköp',100,'expense'),tx('Sparöverföring',-500,'transfer'),tx('Annan månad',-900,'expense','2026-09-30')];
 assert.ok(focusHtml(rows).includes(kr(16100,2)));
 const withExpense=[...rows,tx('Mat',-123.45,'expense')];
 assert.ok(focusHtml(withExpense).includes(kr(16100,2)));
 const over=[tx('Lön',20000,'income'),{...tx('Mat',-4000,'expense'),category:'Mat'}];
 assert.ok(focusHtml(over).includes(kr(16000,2)));
 assert.ok(focusHtml(over.filter(x=>x.id!=='Mat')).includes(kr(16500,2)));
});
test('Negative budget result is explicit and the overview exposes no write controls',()=>{
 const budget={...emptyBudget,transactions:[tx('Köp',-123,'expense')]},html=focusHtml([],{editable:false,data:budget});
 assert.ok(html.includes('class="negative"'));
 assert.ok(!html.includes('Importera CSV'));
 assert.ok(!html.includes('> Inkomst</button>'));assert.ok(!html.includes('> Utgift</button>'));
 assert.ok(html.includes('Öppna och kategorisera'));
});
test('Monthly forecast explains category progress, refunds, extra income and unplanned spending',()=>{
 const budget={...data,transactions:[
  {...tx('Lön',21000,'income'),category:'Lön'},
  {...tx('Matköp',-4000,'expense'),category:'Mat'},
  {...tx('Matretur',200,'expense'),category:'Mat'},
  {...tx('Ny avgift',-500,'expense'),category:'Ej kategoriserad'},
  tx('Flytt',-999,'transfer'),tx('Gammal',-999,'expense','2026-09-10'),
 ]};
 const before=structuredClone(budget),forecast=monthlyForecast(budget,focusProps.range);
 assert.equal(forecast.plannedIncome,20000);assert.equal(forecast.actualIncome,21000);assert.equal(forecast.forecastIncome,21000);
 assert.equal(forecast.actualExpense,4300);assert.equal(forecast.forecastExpense,4300);assert.equal(forecast.forecastRemaining,16700);
 assert.equal(forecast.overPlan,800);assert.equal(forecast.remainingPlanned,0);
 assert.equal(forecast.rows.find(row=>row.key==='food').actual,3800);
 assert.equal(forecast.rows.find(row=>row.key==='other').actual,500);
 assert.equal(monthlyForecast({...budget,transactions:[...budget.transactions,{...tx('Utanför',-9999,'expense'),excluded:true}]},focusProps.range).forecastRemaining,16700);
 assert.deepEqual(budget,before);
});
test('Budget month assignment separates bank date from monthly result',()=>{
 const september={...tx('Sen bokning',-900,'expense','2026-10-02'),category:'Mat',budgetMonth:'2026-09'};
 const october={...tx('Oktober',-200,'expense','2026-10-03'),category:'Mat'};
 const sep=monthlyForecast({...data,transactions:[september,october]},{from:'2026-09-01',to:'2026-09-30'});
 const oct=monthlyForecast({...data,transactions:[september,october]},focusProps.range);
 assert.equal(sep.actualExpense,900);assert.equal(sep.shiftedIn.length,1);assert.equal(sep.shiftedOut.length,0);
 assert.equal(oct.actualExpense,200);assert.equal(oct.shiftedIn.length,0);assert.equal(oct.shiftedOut.length,1);
 assert.equal(september.date,'2026-10-02');
 const html=focusHtml([september,october]);
 assert.ok(html.includes('Periodiserat utfall'));assert.ok(html.includes('hör till september 2026'));
});
test('Quick entry category is optional disclosure without removing its form value',()=>{
 const html=renderToStaticMarkup(createElement(RecordFields,{fields:[{name:'amount',label:'Belopp',type:'number',value:''},{name:'category',label:'Kategori',advanced:true,value:'Mat',options:['Mat','Övrigt']}]}));
 assert.ok(html.indexOf('name="amount"')<html.indexOf('<details'));
 assert.ok(html.indexOf('name="category"')>html.indexOf('<details'));
 assert.ok(html.includes('selected=""'));
});
test('Readable budget status labels preserve stored values in the form',()=>{
 const html=renderToStaticMarkup(createElement(RecordFields,{fields:[{name:'status',label:'Typ av kostnad',value:'Ram',options:['Ram','Ej med'],optionLabels:{Ram:'Planerat belopp','Ej med':'Räknas inte med i budgeten'}}]}));
 assert.ok(html.includes('value="Ram" selected="">Planerat belopp'));
 assert.ok(html.includes('value="Ej med">Räknas inte med i budgeten'));
});
test('Comparison chart distinguishes budget from actuals, handles refunds, empty months and past-month plans',()=>{
 const html=renderToStaticMarkup(createElement(BudgetComparison,{income:-100,expense:-500,plannedIncome:1000,plannedExpense:700,isCurrent:false,hasTransactions:true,onPlan:noop,onHistory:noop}));
 assert.ok(html.includes(kr(-500,2)));assert.ok(html.includes(kr(700,2)));
 assert.ok(html.includes('din nuvarande månadsbudget'));
 assert.ok(html.includes('class="negative"'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('width:-'));
 const empty=renderToStaticMarkup(createElement(BudgetComparison,{income:0,expense:0,plannedIncome:0,plannedExpense:0,isCurrent:true,hasTransactions:false,onPlan:noop,onHistory:noop}));
 assert.ok(empty.includes('Inga transaktioner'));assert.ok(!empty.includes('NaN'));assert.ok(!empty.includes('Infinity'));
});
test('Command search finds Swedish names, amounts and records across dates without changing data',()=>{
 const budget={...data,transactions:[tx('Äldre Lön',1500,'income','2025-01-20'),tx('Matköp',-300,'expense')],debts:[{id:'loan',name:'Testlån',balance:14000,original:18000,monthly:1500,rate:12,type:'Blanco',note:'',balanceVerified:true}]};
 const before=JSON.stringify(budget),items=createCommands(budget,true);
 assert.ok(searchCommands(items,'aldre lon').some(x=>x.recordId==='Äldre Lön'));
 assert.ok(searchCommands(items,'1500').some(x=>x.recordId==='loan'));
 assert.ok(searchCommands(items,'2025-01').some(x=>x.recordId==='Äldre Lön'));
 assert.ok(searchCommands(items,'03.3').some(x=>x.kind==='page'&&x.page==='Transaktioner'));
 assert.ok(searchCommands(items,'importera').some(x=>x.kind==='action'&&x.action==='import'));
 assert.ok(searchCommands(items,'ovriga utgifter').some(x=>x.recordId==='Matköp'));
 assert.equal(JSON.stringify(budget),before);
 assert.deepEqual(searchCommands(items,'omöjligtresultat'),[]);
});
test('Read-only search has navigation and records but no write/import commands; matching transactions do not hide matching loans',()=>{
 const budget={...data,transactions:Array.from({length:40},(_,i)=>tx('Testbank '+i,-100,'expense')),debts:[{id:'d',name:'Testbank',balance:1000,original:1000,monthly:100,rate:0,type:'Blanco',note:'',balanceVerified:true}]};
 const items=createCommands(budget,false),hits=searchCommands(items,'testbank');
 assert.ok(!items.some(x=>x.kind==='action'));
 assert.equal(hits.filter(x=>x.group==='Historik').length,6);
 assert.ok(hits.some(x=>x.recordId==='d'));
 const initial=searchCommands(items,'');
 assert.equal(initial.length,Object.keys(areas).length);assert.ok(initial.every(x=>x.kind==='page'));
});
test('Budget drilldowns show every underlying income and expense without edit or delete controls',()=>{
 const rows=[tx('Lunch',-100,'expense'),tx('Lön',1000,'income'),tx('Hyra',-700,'expense'),tx('El',-50,'expense'),tx('Överföring',-50,'transfer')];
 const html=focusHtml(rows);
 assert.equal((html.match(/class="forecast-transaction"/g)||[]).length,4);
 for(const label of ['Lunch','Lön','Hyra','El'])assert.ok(html.includes(label));
 assert.ok(!html.includes('Överföring</strong>'));assert.ok(!html.includes('Ta bort transaktion:'));
 assert.ok(html.includes('Öppna och kategorisera'));assert.ok(html.includes('Öppna inkomster i Historik &amp; import'));
});
test('Sidebar shortcut supports Cmd/Ctrl+B only on desktop outside editing controls',()=>{
 const event={key:'b',metaKey:true,ctrlKey:false,altKey:false,shiftKey:false,repeat:false,defaultPrevented:false};
 assert.equal(isSidebarShortcut(event,true,false),true);
 assert.equal(isSidebarShortcut({...event,metaKey:false,ctrlKey:true,key:'B'},true,false),true);
 assert.equal(isSidebarShortcut(event,false,false),false);
 assert.equal(isSidebarShortcut(event,true,true),false);
 for(const modifier of ['altKey','shiftKey','repeat','defaultPrevented'])assert.equal(isSidebarShortcut({...event,[modifier]:true},true,false),false);
 assert.equal(isSidebarShortcut({...event,metaKey:false},true,false),false);
 assert.equal(isSidebarShortcut({...event,key:'k'},true,false),false);
});
const loan=(id,balance,monthly,type='Blanco')=>({id,name:id,balance,monthly,type,original:balance,rate:10,note:'',balanceVerified:true});
const debtHtml=(debts,props={})=>renderToStaticMarkup(createElement(DebtFocus,{debts,editable:true,busy:false,onAdd:noop,onEdit:noop,onDelete:noop,onCreditors:noop,...props}));
test('Debt month history keeps the latest real checkpoint per month without inventing missing months',()=>{
 const history=[
  {date:'2026-08-05',balances:[{id:'a',balance:1000,verified:true}]},
  {date:'2026-08-28',balances:[{id:'a',balance:900,verified:true}]},
  {date:'2026-10-01',balances:[{id:'a',balance:700,verified:false},{id:'b',balance:200,verified:true}]},
 ],before=structuredClone(history);
 assert.deepEqual(monthlyDebtSnapshots(history),[
  {month:'2026-08',date:'2026-08-28',balance:900,verified:true},
  {month:'2026-10',date:'2026-10-01',balance:900,verified:false},
 ]);
 assert.deepEqual(history,before);
});
test('Attack strategies order active consumer debts without mutation and disclose unknown interest',()=>{
 const debts=[{...loan('Small',500,50),rate:0},{...loan('High',5000,200),rate:25},{...loan('Unknown',200,50),rate:null},loan('Home',100000,1000,'Bolån'),loan('Closed',0,0),{...loan('Tie',1000,100),rate:25}],before=structuredClone(debts);
 assert.deepEqual(debtAttackOrder(debts,'avalanche').map(d=>d.id),['Tie','High','Small','Unknown']);
 assert.deepEqual(debtAttackOrder(debts,'snowball').map(d=>d.id),['Unknown','Small','Tie','High']);
 assert.deepEqual(debts,before);
 const avalanche=debtHtml(debts),snowball=debtHtml(debts,{strategy:'snowball'});
 assert.ok(avalanche.indexOf('Ändra lån: Tie')<avalanche.indexOf('Ändra lån: High'));
 assert.ok(snowball.indexOf('Ändra lån: Unknown')<snowball.indexOf('Ändra lån: Small'));
 assert.ok(avalanche.includes('bland kända räntor'));assert.ok(avalanche.includes('Bolån (1) · utanför attackordningen'));
 assert.ok(snowball.includes('value="snowball" selected=""'));assert.ok(debtHtml(debts,{editable:false}).includes('Välj attackstrategi'));
});
test('Debt overview totals the same active loans including mortgages, retaining closed loans separately',()=>{
 const debts=[loan('Blanco',10000.25,500.5),loan('Bolån',1000000,7000,'Bolån'),loan('Avslutat',0,100)];
 const before=JSON.stringify(debts),html=debtHtml(debts,{onCheckpoint:noop});
 assert.ok(html.includes(`>${kr(1010000.25,2)}</output>`));
 assert.ok(html.includes(`>${kr(7500.5,2)}</output>`));
 assert.equal((html.match(/<output/g)||[]).length,2);
 assert.ok(html.includes('Bläddra mellan skuldmånader'));assert.ok(html.includes('Föregående skuldmånad'));assert.ok(html.includes('Nästa skuldmånad'));
 assert.ok(html.includes('Månadsbetalning nu'));assert.ok(html.includes('Spara månadens saldon'));
 assert.ok(html.includes('Aktiva lån i översikten'));assert.ok(!html.includes('inkl. bolån'));assert.ok(html.includes('Avslutade lån (1)'));
 assert.ok(html.includes('<details class="debt-more">'));
 assert.equal(JSON.stringify(debts),before);
});
test('Debt overview empty/read-only states and stale balance warning remain clear',()=>{
 const empty=debtHtml([]);assert.ok(empty.includes('Inga lån tillagda ännu.'));assert.equal(empty.split(`>${kr(0,2)}</output>`).length-1,2);
 const html=debtHtml([{...loan('Äldre lån',1000,100),balanceVerified:false}],{editable:false});
 assert.ok(html.includes('Ett lån har äldre saldo.'));assert.ok(html.includes('Du har läsbehörighet.'));
 assert.ok(!html.includes('Spara månadens saldon'));
 assert.ok(!html.includes('Lägg till lån'));assert.ok(!html.includes('Ta bort lån:'));
 assert.match(html, /class="loan-edit" disabled=""/);
});
test('Loan CRUD changes debt and monthly totals without using budget transactions or plans',()=>{
 const first=[loan('A',1000,100)],added=[...first,loan('B',2000,200)];
 assert.ok(debtHtml(added).includes(`>${kr(3000,2)}</output>`));
 assert.ok(debtHtml(added).includes(`>${kr(300,2)}</output>`));
 const edited=added.map(x=>x.id==='B'?{...x,balance:1500,monthly:150}:x);
 assert.ok(debtHtml(edited).includes(`>${kr(2500,2)}</output>`));
 assert.ok(debtHtml(edited).includes(`>${kr(250,2)}</output>`));
 const deleted=edited.filter(x=>x.id!=='B');
 assert.ok(debtHtml(deleted).includes(`>${kr(1000,2)}</output>`));
 assert.match(debtHtml(first,{busy:true}), /class="loan-delete" disabled=""/);
});
