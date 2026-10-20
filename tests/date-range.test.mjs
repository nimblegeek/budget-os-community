import test from 'node:test';
import assert from 'node:assert/strict';
import { stockholmDate, monthRange, rangeError, isCalendarMonth, periodSummary, transactionRange, dateRangeLabel } from '../lib/date-range.ts';
test('Month presets handle previous year, leap years and unequal month lengths',()=>{
  assert.deepEqual(monthRange('2026-10-31',-1),{from:'2026-09-01',to:'2026-09-30'});
  assert.deepEqual(monthRange('2026-01-15',-1),{from:'2025-12-01',to:'2025-12-31'});
  assert.deepEqual(monthRange('2024-03-31',-1),{from:'2024-02-01',to:'2024-02-29'});
  assert.deepEqual(monthRange('2026-02-15'),{from:'2026-02-01',to:'2026-02-28'});
});
test('Presets use Stockholm calendar even around midnight and daylight-saving changes',()=>{
  assert.equal(stockholmDate(new Date('2026-09-30T22:30:00Z')),'2026-10-01');
  assert.equal(stockholmDate(new Date('2026-12-31T23:30:00Z')),'2027-01-01');
  assert.equal(stockholmDate(new Date('2026-10-25T01:30:00Z')),'2026-10-25');
});
test('Range validation rejects blanks, nonexistent dates and reversed ranges, permits one day',()=>{
  for(const range of [{from:'',to:'2026-10-01'},{from:'2026-02-30',to:'2026-03-01'},{from:'2026-10-02',to:'2026-10-01'}]){
    assert.ok(rangeError(range)); assert.throws(()=>periodSummary([],range));
  }
  assert.equal(rangeError({from:'2026-10-01',to:'2026-10-01'}),'');
});
const rows=[
  {date:'2026-09-24',kind:'income',amount:999},
  {date:'2026-09-25',kind:'income',amount:20000},
  {date:'2026-09-30',kind:'expense',amount:-500.25},
  {date:'2026-10-01',kind:'expense',amount:-1000},
  {date:'2026-10-02',kind:'expense',amount:100.25},
  {date:'2026-10-03',kind:'income',amount:-50},
  {date:'2026-10-04',kind:'transfer',amount:5000},
  {date:'2026-10-24',kind:'expense',amount:-200},
  {date:'2026-10-25',kind:'expense',amount:-999},
];
test('Cross-month salary period includes both boundaries, refunds and income reversals, excludes transfers from totals',()=>{
  const before=structuredClone(rows),result=periodSummary(rows,{from:'2026-09-25',to:'2026-10-24'});
  assert.equal(result.transactions.length,7); assert.equal(result.income,19950); assert.equal(result.expense,1600);
  assert.deepEqual(rows,before);
});
test('Previous month, single day, empty and cross-year periods filter correctly',()=>{
  assert.equal(periodSummary(rows,monthRange('2026-10-19',-1)).transactions.length,3);
  assert.equal(periodSummary(rows,{from:'2026-10-01',to:'2026-10-01'}).expense,1000);
  assert.deepEqual(periodSummary(rows,monthRange('2026-08-01')),{transactions:[],income:0,expense:0});
  assert.equal(periodSummary([{date:'2025-12-31',kind:'income',amount:10},{date:'2026-01-01',kind:'expense',amount:-5}],{from:'2025-12-25',to:'2026-01-24'}).transactions.length,2);
});
test('Only whole calendar months qualify for monthly budget comparison',()=>{
  assert.equal(isCalendarMonth(monthRange('2024-02-01')),true);
  for(const range of [{from:'2026-09-25',to:'2026-10-24'},{from:'2026-10-01',to:'2026-10-15'},{from:'2026-09-01',to:'2026-10-31'}])assert.equal(isCalendarMonth(range),false);
});
test('Import view spans every imported date without mutating source order',()=>{
  const fallback=monthRange('2026-10-19');
  assert.deepEqual(transactionRange([...rows].reverse(),fallback),{from:'2026-09-24',to:'2026-10-25'});
  assert.deepEqual(transactionRange([],fallback),fallback);
  assert.match(dateRangeLabel({from:'2025-12-25',to:'2026-01-24'}),/2025.*2026/);
});
