import test from 'node:test';
import assert from 'node:assert/strict';
import {projectDebts,scenarioTotals,compareDebtScenario,projectionBalanceAt} from '../lib/simulation.mjs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import DebtPlayground from '../app/debt-playground.tsx';
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
test('Interactive comparison reduces each nominal rate in percentage points, floors at zero and never mutates saved loans',()=>{
 const debts=[loan('a',10000,400,18),loan('b',20000,500,6),loan('home',900000,1000,null,'Bolån'),loan('closed',0,200,40)];
 const copy=structuredClone(debts),result=compareDebtScenario(debts,500,8);
 assert.deepEqual(debts,copy);assert.equal(result.balance,30000);assert.equal(result.monthly,900);
 assert.equal(result.currentRate,10);assert.equal(result.scenarioRate,100000/30000);
 assert.ok(result.monthsSaved>0);assert.ok(result.interestSaved>0);
 assert.deepEqual(result.scenario,projectDebts([loan('a',10000,400,10),loan('b',20000,500,0)],500));
 assert.throws(()=>compareDebtScenario(debts,0,-1));assert.throws(()=>compareDebtScenario(debts,0,NaN));
});
test('Reset-equivalent scenario matches baseline, including zero-interest, zero-balance and incomplete forecasts',()=>{
 const same=compareDebtScenario([loan('a',1200,100,0)]);
 assert.deepEqual(same.base,same.scenario);assert.equal(same.monthsSaved,0);assert.equal(same.interestSaved,0);
 const empty=compareDebtScenario([]);assert.equal(empty.balance,0);assert.equal(empty.scenario.months,0);
 const stalled=compareDebtScenario([loan('a',10000,0,12)],1000,2);
 assert.ok(stalled.base.error);assert.ok(stalled.scenario.months>0);
 assert.equal(stalled.monthsSaved,null);assert.equal(stalled.interestSaved,null);
 const missing=compareDebtScenario([loan('a',10000,100,null)],1000,100);
 assert.equal(missing.currentRate,null);assert.equal(missing.scenarioRate,null);assert.ok(missing.scenario.error);
});
test('Timeline returns paid-off zero but never invents future points for an incomplete forecast',()=>{
 const paid=projectDebts([loan('a',1200,100)]);
 assert.equal(projectionBalanceAt(paid,0),1200);assert.equal(projectionBalanceAt(paid,6),600);assert.equal(projectionBalanceAt(paid,120),0);
 assert.equal(projectionBalanceAt({points:[{month:0,balance:100}],error:'Incomplete'},1),null);
 assert.equal(projectionBalanceAt({points:[],error:'Missing'},0),null);
});
const uiLoan={...loan('a',10000,400,18),name:'Exempellån',original:10000,note:'',balanceVerified:true};
const render=(debts,extra=0,editable=true)=>renderToStaticMarkup(createElement(DebtPlayground,{debts,extra,setExtra:()=>{},editable,onEdit:()=>{}}));
test('Debt playground exposes keyboard-accessible controls, comparison graph and milestones without a save action',()=>{
 const debts=[uiLoan],before=structuredClone(debts),html=render(debts),extra=render(debts,1000);
 for(const text of ['Din väg till noll.','Extra betalning per månad','Räntesänkning i procentenheter','Utforska prognosmånad','Skuldprognos:','25% betalt','Skuldfri','Inget sparas.','Återställ skuldsimulering'])assert.ok(html.includes(text),text);
 assert.equal((html.match(/type="range"/g)||[]).length,3);
 assert.ok(!html.includes('Spara scenario'));assert.notEqual(html,extra);assert.deepEqual(debts,before);
 assert.ok(render(debts,0,false).includes('Reglage för räntesänkning'),'Viewer can simulate without editing');
});
test('Empty, mortgage-only and missing-rate UI never fabricates a payoff graph or edits for a viewer',()=>{
 assert.ok(render([]).includes('Lägg till ett lån'));assert.ok(!render([]).includes('Skuldprognos:'));
 assert.ok(render([{...uiLoan,type:'Bolån'}]).includes('Här simulerar du lån utom bolån.'));
 const missing={...uiLoan,rate:null};assert.ok(render([missing]).includes('Ange ränta: Exempellån'));
 const viewer=render([missing],0,false);assert.ok(viewer.includes('ränta saknas'));assert.ok(!viewer.includes('Ange ränta:'));assert.ok(!viewer.includes('Skuldprognos:'));
});
