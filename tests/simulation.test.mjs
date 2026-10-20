import test from 'node:test';
import assert from 'node:assert/strict';
import {projectDebts,scenarioTotals} from '../lib/simulation.mjs';
import {historyFor,debtHistorySchema} from '../lib/journey.ts';
const loan=(id,balance,monthly,rate=0,type='Blanco')=>({id,balance,monthly,rate,type});
test('Scenario subtracts saving once and never funds extra from a deficit',()=>{
  assert.deepEqual(scenarioTotals(30000,24000,1000,28000,25000),{remaining:5000,base:2000,change:3000,extra:3000});
  assert.equal(scenarioTotals(1000,2000,100,1000,3000).extra,0);
  assert.equal(scenarioTotals(2500,2000,100,1000,3000).extra,400);
  assert.equal(scenarioTotals(0,0,0,0,0).remaining,0);
  assert.throws(()=>scenarioTotals(NaN,0,0,0,0));
});
test('Monthly projection: zero interest, final partial payment, extra and no mutation',()=>{
  const debts=[loan('a',1250,100)],copy=structuredClone(debts);
  const a=projectDebts(debts),b=projectDebts(debts,100);
  assert.equal(a.months,13);assert.equal(b.months,7);assert.equal(a.interest,0);
  assert.equal(a.points[12].balance,50);assert.equal(a.points[13].balance,0);
  assert.deepEqual(debts,copy);assert.ok(b.points.every(p=>p.balance>=0));
});
test('Interest, unknown rates, mortgage exclusion and insufficient payments',()=>{
  assert.equal(projectDebts([loan('a',10000,1000,12)],0,'avalanche',1).points[1].balance,9100);
  assert.ok(projectDebts([loan('a',1000,100,null)]).error);
  assert.equal(projectDebts([loan('a',1200,100),loan('home',900000,1000,null,'Bolån')]).months,12);
  const growing=projectDebts([loan('a',10000,10,24)]);assert.ok(growing.error);assert.ok(growing.points[12].balance>10000);
  assert.equal(projectDebts([]).months,0);assert.ok(projectDebts([],Infinity).error);
});
test('Freed payments roll over; avalanche targets expensive loan and saves interest',()=>{
  assert.equal(projectDebts([loan('a',50,100),loan('b',150,100)]).months,1);
  const debts=[loan('a',1000,50,0),loan('b',5000,100,24)];
  const a=projectDebts(debts,200,'avalanche'),b=projectDebts(debts,200,'snowball');
  assert.ok(a.interest<b.interest);assert.ok(a.months<=b.months);
  for(const p of a.points)assert.equal(Math.round(p.balance*100)/100,p.balance);
});
test('History compares identical loan IDs and retains paid-off zero balances',()=>{
  const h=[{date:'2026-09-01',balances:[{id:'a',balance:100,verified:false}]},{date:'2026-10-01',balances:[{id:'a',balance:0,verified:true},{id:'b',balance:200,verified:true}]}];
  assert.deepEqual(historyFor(h,['a']).map(x=>x.balance),[100,0]);
  assert.equal(historyFor(h,['a','b']).length,1);assert.equal(historyFor(h,[]).length,0);
  assert.equal(historyFor(h,['a'])[0].verified,false);
  assert.equal(debtHistorySchema.safeParse([...h,h[0]]).success,false);
  assert.equal(debtHistorySchema.safeParse([{...h[0],date:'2026-02-30'}]).success,false);
});
