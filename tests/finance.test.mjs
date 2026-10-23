import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMoney,parseCSV,isoDate,importBankCSV,annuity,payoff} from '../lib/finance.mjs';
test('Swedish and US amounts',()=>{assert.equal(parseMoney('-1 234,56'),-1234.56);assert.equal(parseMoney('1,234.56'),1234.56);assert.ok(Number.isNaN(parseMoney('oops')))});
test('Quoted delimiters and newlines',()=>assert.deepEqual(parseCSV('date;text;amount\r\n2026-10-01;"a;b\nc";-20,50'),[['date','text','amount'],['2026-10-01','a;b\nc','-20,50']]));
test('Invalid dates rejected',()=>{assert.equal(isoDate('2026-02-31'),null);assert.equal(isoDate('15/10/2026'),'2026-10-15')});
test('Nordea year-first slash dates normalize and validate the calendar',()=>{
  for(const [input,expected] of [['2026/10/01','2026-10-01'],[' 2026/09/30 ','2026-09-30'],['2024/02/29','2024-02-29'],['2026/02/29',null],['2026/04/31',null],['2026/13/01',null],['2026/00/01',null],['2026/10/00',null],['2026/10/01oops',null]])assert.equal(isoDate(input),expected,input);
});
// Synthetic amounts/descriptions only; never copy the private bank statement into the repo.
const nordeaHeader='\uFEFFBokföringsdag;Belopp;Avsändare;Mottagare;Namn;Rubrik;Saldo;Valuta;';
const nordeaRows=[
  '2026/10/01;-125,50;TESTKONTO;;;Kortköp COOP TEST;900,00;SEK;',
  '2026/10/01;-125,50;TESTKONTO;;;Kortköp COOP TEST;1025,50;SEK;',
  '2026/09/30;1 234,56;;TESTKONTO;;Lön TEST;1151,00;SEK;',
  '2026/09/29;-10,25;TESTKONTO;;;"Kortköp TEST; åäö";123,45;SEK;',
];
test('Nordea full export layout handles BOM, CRLF, empty columns, Swedish amounts and trailing delimiter',()=>{
  const result=importBankCSV([nordeaHeader,...nordeaRows,''].join('\r\n'),[],'Nordea test.csv');
  assert.deepEqual(result.errors,[]);
  assert.equal(result.pending,0);
  assert.equal(result.duplicates,0);
  assert.equal(result.transactions.length,4);
  assert.deepEqual(result.transactions.map(t=>[t.date,t.amount,t.description]),[
    ['2026-10-01',-125.5,'Kortköp COOP TEST'],['2026-10-01',-125.5,'Kortköp COOP TEST'],
    ['2026-09-30',1234.56,'Lön TEST'],['2026-09-29',-10.25,'Kortköp TEST; åäö'],
  ]);
  assert.ok(result.transactions.every(t=>t.source==='Nordea test.csv'&&t.reviewed===false));
  assert.equal(result.transactions[0].category,'Mat & livsmedel');
  assert.equal(result.transactions[2].kind,'income');
});
test('Nordea reimport matches ISO dates and preserves legitimate repeated payments',()=>{
  const csv=[nordeaHeader,...nordeaRows].join('\n');
  const initial=importBankCSV(csv).transactions;
  const snapshot=structuredClone(initial);
  const repeated=importBankCSV(csv,initial);
  assert.equal(repeated.duplicates,4);
  assert.equal(repeated.transactions.length,0);
  const overlap=importBankCSV(csv,[initial[0]]);
  assert.equal(overlap.duplicates,1);
  assert.equal(overlap.transactions.length,3);
  assert.deepEqual(initial,snapshot);
});
test('Bank import preview, duplicates, pending, invalid rows',()=>{const csv='Bokföringsdag;Belopp;Rubrik\n2026-10-01;-125,50;COOP\n2026-10-01;-125,50;COOP\nReserverat;-10;ICA\nfoo;20;Other';const a=importBankCSV(csv);assert.equal(a.transactions.length,2);assert.equal(a.pending,1);assert.deepEqual(a.errors,[5]);assert.equal(a.transactions[0].category,'Mat & livsmedel');assert.equal(importBankCSV(csv,a.transactions).duplicates,2)});
test('Transfers and collection retained but excluded from normal',()=>{const a=importBankCSV('Datum;Belopp;Beskrivning\n2026-10-01;-100;Överföring\n2026-10-02;-200;COEO INKA');assert.equal(a.transactions[0].kind,'transfer');assert.equal(a.transactions[1].excluded,true)});
test('Annuity examples',()=>{assert.ok(Math.abs(annuity(239716,8,10)-2908.41656)<.01);assert.equal(annuity(12000,0,1),1000)});
test('Payoff respects unknown interest and amortization',()=>{assert.ok(payoff([{balance:100,rate:null,monthly:10}]).error);assert.equal(payoff([{balance:1200,rate:0,monthly:100}],0).months,12);assert.equal(payoff([{balance:1200,rate:0,monthly:100}],100).months,6);assert.ok(payoff([{balance:10000,rate:24,monthly:10}],0).error)});
