import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import SimpleBudget from '../app/simple-budget.tsx';
import RecordFields from '../app/record-fields.tsx';
import BudgetFocus from '../app/budget-focus.tsx';
import BudgetCostPicker from '../app/budget-cost-picker.tsx';
import DebtFocus from '../app/debt-focus.tsx';
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
const noop=()=>{};
test('Budget cost picker exposes local grouped checkboxes, selection presets and explicit plan-only results',()=>{
 const data={...emptyBudget,incomes:[{id:'i',name:'Lön',amount:20000}],expenses:[{id:'m',name:'Mat',amount:3000,frame:3000,status:'Ram',note:''},{id:'c',name:'Krediter & blancolån',amount:2000,frame:2000,status:'Ram',note:''}]};
 const before=structuredClone(data),html=renderToStaticMarkup(createElement(BudgetCostPicker,{data}));
 for(const text of ['Vad ska få plats?','Prioriterade','Krediter','Ta med kategorin Mat &amp; livsmedel','Ta med kategorin Krediter &amp; lån','Valda kostnader / mån','Kvar enligt urval','15 000,00 kr','Jämförelseläge · inget sparas','Återställ kostnadsurval'])assert.ok(html.includes(text),text);
 assert.ok(html.includes('type="checkbox"'));assert.ok(!html.includes('Spara urval'));assert.deepEqual(data,before);
});
test('Budget cost picker is safe in empty/read-only budgets and explains credit and actual-transaction boundaries',()=>{
 const html=renderToStaticMarkup(createElement(BudgetCostPicker,{data:emptyBudget}));
 assert.ok(html.includes('Lägg till månadskostnader under Din budget'));assert.ok(!html.includes('type="checkbox"'));
 assert.ok(html.includes('lånelistans betalningar läggs inte till igen'));assert.ok(html.includes('det faktiska kvar-beloppet överst på sidan påverkas inte'));
});
test('Cost comparison does not replace the true registered-income-minus-expense budget hero',()=>{
 const range=monthRange(),data={...emptyBudget,incomes:[{id:'p',name:'Lön',amount:20000}],expenses:[{id:'m',name:'Mat',amount:3000,frame:3000,status:'Ram',note:''}],transactions:[{id:'t',date:range.from,description:'Utgift',amount:-100,kind:'expense',category:'Mat',source:'Test',reviewed:true,excluded:false}]};
 const html=renderToStaticMarkup(createElement(BudgetFocus,{data,range,onRange:noop,editable:false,busy:false,onAdd:noop,onEdit:noop,onDelete:noop,onIncome:noop,onExpense:noop,onHistory:noop}));
 assert.ok(html.includes('Välj och jämför budgetkostnader'));assert.ok(html.includes('17 000,00 kr'));
 assert.ok(html.includes('>'+kr(-100,2)+'</output>'));assert.ok(!html.includes('Lägg till transaktion</button>'));
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
test('Planning exposes budget, transactions, income and general recovery; advisor tools remain optional in debt group',()=>{
 const planning=renderToStaticMarkup(createElement(GroupHub,{group:'planera',onNavigate:noop}));
 for(const text of ['Budget','Transaktioner','Intäkter','Data &amp; historik','Säkerhetskopior','simuleringen'])assert.ok(planning.includes(text),text);
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
 assert.ok(html.includes(kr(16500)));assert.ok(html.includes('Lägg till inkomst'));assert.ok(html.includes('Lägg till kostnad'));assert.ok(html.includes('Ändra kostnad: Mat, prioriterad'));assert.ok(html.includes('Inkasso'));assert.equal(JSON.stringify(data),before);
});
test('Read-only budget does not expose add controls and all record buttons are disabled',()=>{
 const html=renderToStaticMarkup(createElement(SimpleBudget,{data,editable:false,onIncome:noop,onExpense:noop}));
 assert.equal((html.match(/<button/g)||[]).length,3);assert.equal((html.match(/disabled=""/g)||[]).length,3);assert.ok(!html.includes('Lägg till inkomst'));assert.ok(!html.includes('Lägg till kostnad'));
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
const tx=(id,amount,kind,date='2026-10-20')=>({id,amount,kind,date,description:id,category:'Test',excluded:true,reviewed:true,source:'Test'});
test('Budget landing has a single live balance, closed details and no planned income counted as received',()=>{
 const html=focusHtml();
 assert.equal((html.match(/<output/g)||[]).length,1);
 assert.ok(html.includes(`>${kr(0,2)}</output>`));
 assert.ok(html.includes('Ingen data ännu.'));
 assert.equal((html.match(/<details class="focus-step budget-plan"/g)||[]).length,1);
 assert.ok(!html.includes('<details open'));
 assert.ok(html.includes('Din budget'));assert.ok(html.includes('Lägg till'));assert.ok(html.includes('Budget och transaktioner'));
 assert.ok(!html.includes('Importera CSV'));assert.ok(!html.includes('Ramar'));
 assert.ok(html.includes('Visa månadens inkomster'));assert.ok(html.includes('Visa månadens utgifter'));
 assert.ok(html.includes('<details class="focus-explainer">'));assert.ok(html.includes('Kommande betalningar är inte avdragna.'));
});
test('Budget balance reacts to actual income, expenses, refunds and deletions; not transfers or other months',()=>{
 const rows=[tx('Lön',28000,'income'),tx('Hyra',-8500,'expense'),tx('Inkasso',-1000,'expense'),tx('Återköp',100,'expense'),tx('Sparöverföring',-500,'transfer'),tx('Annan månad',-900,'expense','2026-09-30')];
 assert.ok(focusHtml(rows).includes(`>${kr(18600,2)}</output>`));
 const withExpense=[...rows,tx('Mat',-123.45,'expense')];
 assert.ok(focusHtml(withExpense).includes(`>${kr(18476.55,2)}</output>`));
 assert.ok(focusHtml(withExpense.filter(x=>x.id!=='Mat')).includes(`>${kr(18600,2)}</output>`));
});
test('Negative balance is explicit and viewer cannot add, edit or import',()=>{
 const html=focusHtml([tx('Köp',-123,'expense')],{editable:false});
 assert.ok(html.includes('class="negative"'));assert.ok(html.includes('Utgifter överstiger inkomster.'));
 assert.ok(html.includes('Du har läsbehörighet'));
 assert.ok(!html.includes('Importera CSV'));
 assert.ok(!html.includes('> Inkomst</button>'));assert.ok(!html.includes('> Utgift</button>'));
 assert.match(html,/<button[^>]*disabled=""[^>]*aria-label="Ändra transaktion: Köp"/);
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
 assert.ok(searchCommands(items,'03.2').some(x=>x.kind==='page'&&x.page==='Transaktioner'));
 assert.ok(searchCommands(items,'importera').some(x=>x.kind==='action'&&x.action==='import'));
 assert.equal(JSON.stringify(budget),before);
 assert.deepEqual(searchCommands(items,'omöjligtresultat'),[]);
});
test('Read-only search has navigation and records but no write/import commands; matching transactions do not hide matching loans',()=>{
 const budget={...data,transactions:Array.from({length:40},(_,i)=>tx('Testbank '+i,-100,'expense')),debts:[{id:'d',name:'Testbank',balance:1000,original:1000,monthly:100,rate:0,type:'Blanco',note:'',balanceVerified:true}]};
 const items=createCommands(budget,false),hits=searchCommands(items,'testbank');
 assert.ok(!items.some(x=>x.kind==='action'));
 assert.equal(hits.filter(x=>x.group==='Transaktioner').length,6);
 assert.ok(hits.some(x=>x.recordId==='d'));
 const initial=searchCommands(items,'');
 assert.equal(initial.length,Object.keys(areas).length);assert.ok(initial.every(x=>x.kind==='page'));
});
test('Mobile list shows recent transactions with explicit delete actions and keeps viewer read-only',()=>{
 const rows=[tx('Lunch',-100,'expense'),tx('Lön',1000,'income'),tx('Hyra',-700,'expense'),tx('El',-50,'expense'),tx('Överföring',-50,'transfer')];
 const html=focusHtml(rows);
 assert.equal((html.match(/class="focus-mobile-row"/g)||[]).length,3);
 assert.equal((html.match(/aria-label="Ta bort transaktion:/g)||[]).length,3);
 assert.ok(html.includes('aria-expanded="false">Visa fler här</button>'));
 assert.ok(!focusHtml(rows,{editable:false}).includes('aria-label="Ta bort transaktion:'));
 const busyHtml=focusHtml(rows,{busy:true});
 assert.match(busyHtml, /class="focus-mobile-delete" disabled=""/);
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
test('Debt overview totals the same active loans including mortgages, retaining closed loans separately',()=>{
 const debts=[loan('Blanco',10000.25,500.5),loan('Bolån',1000000,7000,'Bolån'),loan('Avslutat',0,100)];
 const before=JSON.stringify(debts),html=debtHtml(debts);
 assert.ok(html.includes(`>${kr(1010000.25,2)}</output>`));
 assert.ok(html.includes(`>${kr(7500.5,2)}</output>`));
 assert.equal((html.match(/<output/g)||[]).length,2);
 assert.ok(html.includes('inkl. bolån'));assert.ok(html.includes('Avslutade lån (1)'));
 assert.ok(html.includes('<details class="debt-more">'));
 assert.equal(JSON.stringify(debts),before);
});
test('Debt overview empty/read-only states and stale balance warning remain clear',()=>{
 const empty=debtHtml([]);assert.ok(empty.includes('Inga lån tillagda ännu.'));assert.equal(empty.split(`>${kr(0,2)}</output>`).length-1,2);
 const html=debtHtml([{...loan('Äldre lån',1000,100),balanceVerified:false}],{editable:false});
 assert.ok(html.includes('Ett lån har äldre saldo.'));assert.ok(html.includes('Du har läsbehörighet.'));
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
