import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultPriority,isPriorityExpense,expenseGroups,priorityTotal} from '../lib/priorities.ts';
import {budgetCostGroups,costCategory,presetCostIds,selectedCostTotals} from '../lib/cost-selection.ts';
import {emptyBudget} from '../lib/budget.ts';
import {expenseCategoryKey,expenseCategoryLabel,transactionExpenseCategory} from '../lib/expense-categories.ts';
test('Essentials default to priority without matching unrelated fees or Tele',()=>{
  for(const name of ['Mat','BRF Avgift','Hyra','Bolån - (ränta+amort)','El','Försäkringar','VA-Avfall','Hemförsäkring'])assert.equal(defaultPriority(name),true,name);
  for(const name of ['Tele','Software + AI','Krediter & blancolån','Kortavgift','Transport2','Fritids / förskola'])assert.equal(defaultPriority(name),false,name);
});
const expense=(id,name,amount,status='Ram',priority)=>({id,name,amount,frame:amount,status,note:'',...(priority===undefined?{}:{priority})});
const costs=[expense('home','Bolån',5000),expense('food','Mat',3000),expense('el','El',500),expense('tele','Tele',400),expense('credit','Krediter & blancolån',2000),expense('health','Medicin',300,'Ram',true),expense('out','Inkasso',9999,'Ej med')];
test('Cost categories are exclusive, preserve cents and never mix mortgage with consumer credit',()=>{
 const groups=budgetCostGroups(costs),all=groups.flatMap(g=>g.items.map(x=>x.id));
 assert.equal(new Set(all).size,all.length);assert.equal(all.length,6);assert.ok(!all.includes('out'));
 assert.equal(costCategory('Bolån (ränta och amortering)'),'home');assert.equal(costCategory('Krediter & blancolån'),'credit');
 assert.equal(costCategory('Tele'),'phone');assert.equal(costCategory('Elhandel'),'utilities');assert.equal(costCategory('Hemförsäkring'),'insurance');assert.equal(costCategory('Oförutsedda avgifter'),'other');
});
test('Stored budget categories override names and legacy values still normalize',()=>{
 const rows=[{...expense('custom','Valfritt namn',100),category:'home'},{...expense('misleading','Hyra till annan',200),category:'other'}];
 assert.deepEqual(budgetCostGroups(rows).map(group=>[group.key,group.items.map(item=>item.id)]),[['home',['custom']],['other',['misleading']]]);
 assert.equal(expenseCategoryKey('Mat & livsmedel'),'food');assert.equal(expenseCategoryLabel('BRF Avgift'),'Boende');
 assert.equal(transactionExpenseCategory('Övriga utgifter','Hyra till annan'),'other');
 assert.equal(transactionExpenseCategory('Ej kategoriserad','Hemförsäkring'),'insurance');
 assert.equal(isPriorityExpense(rows[0]),true);assert.equal(isPriorityExpense(rows[1]),false);
});
test('Cost presets use real priority flags and credit group without double-counting or including excluded costs',()=>{
 assert.deepEqual(presetCostIds(costs,'priority'),['home','food','el','health']);
 assert.deepEqual(presetCostIds(costs,'credit'),['credit']);assert.deepEqual(presetCostIds(costs,'none'),[]);
 assert.equal(presetCostIds(costs,'all').length,6);
 assert.deepEqual(presetCostIds([expense('x','Mat',100,'Ram',false)],'priority'),[]);
});
test('Cost-selection scenario changes planned remainder only, never stored plans, actuals, debts or savings',()=>{
 const data={...structuredClone(emptyBudget),expenses:costs,incomes:[{id:'i',name:'Lön',amount:20000}],debts:[{id:'unrelated',balance:999999,monthly:999999}],goals:[{id:'g',name:'Goal',target:10000,saved:0,monthly:500}],transactions:[{amount:-999999}]},before=structuredClone(data);
 const all=selectedCostTotals(data,[]),withoutCredit=selectedCostTotals(data,['credit']);
 assert.equal(all.fullCost,11200);assert.equal(all.remaining,8800);assert.equal(withoutCredit.cost,9200);assert.equal(withoutCredit.remaining,10800);assert.equal(withoutCredit.difference,2000);
 assert.deepEqual(data,before);assert.equal(selectedCostTotals(data,costs.map(e=>e.id)).remaining,20000);
});
test('Empty, zero-cost and fractional-öre-representable plans reconcile and retain negative budget deficits',()=>{
 assert.equal(selectedCostTotals(emptyBudget,[]).remaining,0);
 const data={...emptyBudget,expenses:[expense('a','Mat',100.01),expense('b','El',200.02),expense('c','Tele',0)],incomes:[{id:'i',name:'Lön',amount:200}]};
 const all=selectedCostTotals(data,[]);assert.equal(all.cost,300.03);assert.equal(all.remaining,-100.03);
 assert.equal(selectedCostTotals(data,['a','a','unknown']).cost,200.02);assert.equal(selectedCostTotals(data,['a']).difference,100.01);
});
test('Explicit priorities win and excluded items stay outside the budget',()=>{
  assert.equal(isPriorityExpense({name:'Mat',amount:100,status:'Ram',priority:false}),false);
  assert.equal(isPriorityExpense({name:'Medicin',amount:200,status:'Ram',priority:true}),true);
  assert.equal(isPriorityExpense({name:'Mat',amount:100,status:'Ej med',priority:true}),false);
});
test('Grouping is stable and totals do not mutate amounts or double-count expenses',()=>{
  const a=[{name:'Tele',amount:100.01,status:'Ram'},{name:'Mat',amount:200.02,status:'Ram'},{name:'Medicin',amount:30.03,status:'Prelim.',priority:true},{name:'Hyra',amount:900,status:'Ej med'}],before=structuredClone(a);
  const groups=expenseGroups(a);
  assert.deepEqual(groups.map(g=>g.items.map(x=>x.name)),[['Mat','Medicin'],['Tele'],['Hyra']]);
  assert.equal(priorityTotal(a),230.05);assert.deepEqual(a,before);
});
