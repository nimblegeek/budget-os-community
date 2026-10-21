import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {budgetSchema,emptyBudget} from '../lib/budget.ts';
import {makeBackup,parseBackup} from '../lib/backup.ts';
import {budgetScenarioSchema,budgetScenariosSchema} from '../lib/budget-scenario-schema.ts';
import {makeBudgetScenario,putBudgetScenario,removeBudgetScenario,scenarioCostTotals,scenarioSelectionMatches} from '../lib/budget-scenarios.ts';
import {presetCostIds} from '../lib/cost-selection.ts';
import BudgetScenarios from '../app/budget-scenarios.tsx';
const cost=(id,name,amount,priority)=>({id,name,amount,frame:amount,status:'Ram',note:'',...(priority===undefined?{}:{priority})});
const data=()=>({...structuredClone(emptyBudget),incomes:[{id:'income',name:'Lön',amount:20000}],expenses:[cost('home','Hyra',8000),cost('food','Mat',3000),cost('credit','Krediter & blancolån',1500),cost('other','Övrigt',200)]});
test('Named scenario saves explicit selected IDs and recomputes current amounts without changing the base budget',()=>{
 const base=data(),copy=structuredClone(base),priority=makeBudgetScenario(base,'Bara prioriterade',['credit','other']);
 const next=putBudgetScenario(base,priority),withCredit=makeBudgetScenario(next,'Med krediter',['other']);
 const both=putBudgetScenario(next,withCredit);
 assert.deepEqual(base,copy);assert.deepEqual(both.expenses,base.expenses);assert.deepEqual(both.incomes,base.incomes);
 assert.equal(scenarioCostTotals(both,priority).remaining,9000);assert.equal(scenarioCostTotals(both,withCredit).remaining,7500);
 const changed={...both,expenses:both.expenses.map(e=>e.id==='home'?{...e,amount:8500}:e)};
 assert.equal(scenarioCostTotals(changed,priority).remaining,8500);assert.ok(scenarioSelectionMatches(both,priority,['credit','other']));
 assert.ok(!scenarioSelectionMatches(both,priority,['other']));
});
test('New cost IDs are not silently included; removed and newly excluded selected rows are reported',()=>{
 const base=data(),saved=makeBudgetScenario(base,'Allt',[]),changed={...base,expenses:[...base.expenses.filter(e=>e.id!=='food'),cost('new','Ny avgift',999)]};
 const result=scenarioCostTotals(changed,saved);assert.deepEqual(result.newIds,['new']);assert.deepEqual(result.missingIds,['food']);
 assert.ok(!result.selected.some(e=>e.id==='new'));assert.equal(result.cost,9700);
 const excluded=scenarioCostTotals({...base,expenses:base.expenses.map(e=>e.id==='food'?{...e,status:'Ej med'}:e)},saved);
 assert.deepEqual(excluded.missingIds,['food']);
});
test('Scenario CRUD keeps identity, forbids duplicate names and IDs, caps count and never deletes financial records',()=>{
 const base=data(),first=makeBudgetScenario(base,'Bara prioriterade',['credit']),initial=putBudgetScenario(base,first);
 const updated=makeBudgetScenario(initial,'Bas',[],first),next=putBudgetScenario(initial,updated);
 assert.equal(next.budgetScenarios.length,1);assert.equal(updated.id,first.id);assert.equal(updated.createdAt,first.createdAt);
 assert.throws(()=>putBudgetScenario(next,makeBudgetScenario(next,' bas ',[])),/namnet används/);
 assert.equal(budgetScenariosSchema.safeParse([updated,updated]).success,false);
 const deleted=removeBudgetScenario(next,first.id);assert.deepEqual(deleted.expenses,base.expenses);assert.deepEqual(deleted.budgetScenarios,[]);
 assert.equal(budgetScenariosSchema.safeParse(Array.from({length:21},(_,i)=>({...first,id:'id'+i,name:'Scenario '+i}))).success,false);
});
test('Scenario schema rejects malformed references, duplicate item IDs, invalid dates and blank names; older budgets remain valid',()=>{
 const saved=makeBudgetScenario(data(),'Bas',[]);
 for(const override of [{name:' '},{updatedAt:'not-a-date'},{selectedExpenseIds:['not-known']},{knownExpenseIds:['home','home']},{selectedExpenseIds:['home','home']}])assert.equal(budgetScenarioSchema.safeParse({...saved,...override}).success,false);
 assert.ok(budgetSchema.safeParse(emptyBudget).success);assert.equal('budgetScenarios' in budgetSchema.parse(emptyBudget),false);
 const a={...saved,name:'Ékonomi'},b={...saved,id:'second',name:'e\u0301konomi'};assert.equal(budgetScenariosSchema.safeParse([a,b]).success,false);
});
test('Scenario backup roundtrip is lossless and legacy exports still restore without adding a scenario field',async()=>{
 const base=data(),saved=putBudgetScenario(base,makeBudgetScenario(base,'Privat scenario',['credit'])),backup=await makeBackup(saved);
 assert.deepEqual(await parseBackup(JSON.stringify(backup)),saved);
 const legacy=await parseBackup(JSON.stringify(await makeBackup(base)));assert.deepEqual(legacy,base);assert.equal(legacy.budgetScenarios,undefined);
 backup.data.budgetScenarios[0].name='Tampered';await assert.rejects(parseBackup(JSON.stringify(backup)),/kontrollsumma/);
});
test('Priority plus consumer-credit preset is a union, not a duplicated amount or mortgage-only shortcut',()=>{
 const base=data();base.expenses[2].priority=true;
 assert.deepEqual(presetCostIds(base.expenses,'priority-credit'),['home','food','credit']);
});
test('Saved-scenario UI offers selection to viewers but owner-only saving; missing persistence disables mutations',()=>{
 const base=data(),saved=putBudgetScenario(base,makeBudgetScenario(base,'Bara prioriterade',['credit']));
 const props={data:saved,excluded:[],onApply:()=>{},persist:async()=>{}};
 const owner=renderToStaticMarkup(createElement(BudgetScenarios,{...props,editable:true})),viewer=renderToStaticMarkup(createElement(BudgetScenarios,{...props,editable:false}));
 assert.ok(owner.includes('Spara urval'));assert.ok(owner.includes('Jämför scenarier'));assert.ok(owner.includes('Välj sparat budgetscenario'));
 assert.ok(viewer.includes('Bara prioriterade'));assert.ok(viewer.includes('Välj sparat budgetscenario'));assert.ok(!viewer.includes('Spara urval'));assert.ok(!viewer.includes('Ta bort valt scenario'));
 assert.ok(!renderToStaticMarkup(createElement(BudgetScenarios,{...props,persist:undefined,editable:true})).includes('Spara urval'));
});
