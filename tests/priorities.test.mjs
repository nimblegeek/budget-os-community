import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultPriority,isPriorityExpense,expenseGroups,priorityTotal} from '../lib/priorities.ts';
test('Essentials default to priority without matching unrelated fees or Tele',()=>{
  for(const name of ['Mat','BRF Avgift','Hyra','Bolån - (ränta+amort)','El','Försäkringar','VA-Avfall','Hemförsäkring'])assert.equal(defaultPriority(name),true,name);
  for(const name of ['Tele','Software + AI','Krediter & blancolån','Kortavgift','Transport2','Fritids / förskola'])assert.equal(defaultPriority(name),false,name);
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
