import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { Database,compileQuery } from '../lib/postgres.ts';
import { readFileSync,readdirSync } from 'node:fs';
import { migrateBudget,readBudget,writeBudget,listBackups,readBackup,Conflict } from '../lib/storage.ts';
import { makeBackup,parseBackup,digest } from '../lib/backup.ts';
import { removeRecord } from '../lib/records.ts';
import { activitySchema,creditorWorkSchema,pauseState,needsFollowup,contactDraft } from '../lib/creditors.ts';

// Actual PostgreSQL engine, including FK constraints, JSONB, and transactions.
let openDatabases=[];
test.afterEach(async()=>{for(const db of openDatabases)await db.pg.close();openDatabases=[];});
class TestDB extends Database{
 failOn='';
 static async create(data=fixture()){
  const pg=new PGlite();
  let db;
  db=new TestDB(async queries=>pg.transaction(async tx=>{
   const results=[];
   for(const q of queries){
    if(db.failOn&&q.text.includes(db.failOn))throw Error('Injected failure');
    const r=await tx.query(q.text,q.values);
    results.push({results:r.rows,meta:{changes:r.affectedRows??0}});
   }
   return results;
  }));
  db.pg=pg;openDatabases.push(db);
  await pg.exec(readFileSync(new URL('../db/postgres.sql',import.meta.url),'utf8'));
  await pg.exec(readFileSync(new URL('../db/002-income-sources.sql',import.meta.url),'utf8'));
  if(data)await pg.query('INSERT INTO budgets VALUES($1,$2,$3,$4)',['household',JSON.stringify(data),7,'2026-10-15T12:00:00Z']);
  return db;
 }
 async one(text,values=[]){const q=compileQuery(text,values);const row=(await this.pg.query(q.text,q.values)).rows[0];if(row?.n!==undefined)row.n=Number(row.n);if(row?.amount_cents!==undefined)row.amount_cents=Number(row.amount_cents);return row;}
}
function fixture(){return {version:1,name:'Testbudget',source:{label:'Syntetisk test',importedAt:'2026-10-15',period:'Normalbudget'},notes:'Test',expenses:[{id:'e1',name:'Mat',amount:3500.12,frame:4000,status:'Ram',note:''},{id:'e2',name:'Inkasso',amount:50,frame:50,status:'Ej med',note:'Historik'}],incomes:[{id:'i1',name:'Lön',amount:25000}],debts:[{id:'d1',name:'Testlån',balance:25000.99,original:30000,rate:null,monthly:700,type:'Blanco',note:'',balanceVerified:false}],transactions:[{id:'t1',date:'2026-10-01',description:'Butik',amount:-125.99,kind:'expense',category:'Mat',reviewed:false,source:'test.csv',excluded:false},{id:'t2',date:'2026-10-02',description:'Retur',amount:25.99,kind:'expense',category:'Mat',reviewed:true,source:'test.csv',excluded:false}],goals:[{id:'g1',name:'Buffert',target:10000,saved:500.55,monthly:300}]};}
test('Revenue sources and payment links persist atomically; backups and old restores are lossless',async()=>{
 const db=await TestDB.create();await migrateBudget(db);const old=(await readBudget(db)).data,oldExport=await makeBackup(old);
 const source={id:'creator',name:'Testkanal',channel:'X',type:'Annonsintäkter',monthlyTarget:1000.01,notes:'Test',archived:false};
 const payment={...old.transactions[0],id:'payment',amount:125.99,kind:'income',incomeSourceId:'creator'};
 const next={...old,revenueSources:[source],transactions:[...old.transactions,payment]};
 await writeBudget(db,next,7,crypto.randomUUID(),'test@example.invalid','Intäktskälla');
 assert.deepEqual((await readBudget(db)).data,next);
 assert.deepEqual(await parseBackup(JSON.stringify(await makeBackup(next))),next);
 const archived={...next,revenueSources:[{...source,archived:true,name:'Nytt namn'}]};
 await writeBudget(db,archived,8,crypto.randomUUID(),'test@example.invalid','Arkiverade');
 assert.deepEqual((await readBudget(db)).data,archived);
 assert.deepEqual((await readBackup(db,(await listBackups(db)).find(b=>b.revision===8).id)).data,next);
 const deleted=removeRecord(archived,'revenueSources','creator');
 await writeBudget(db,deleted,9,crypto.randomUUID(),'test@example.invalid','Tog bort källa');
 assert.deepEqual((await readBudget(db)).data,deleted);assert.equal(deleted.transactions.at(-1).amount,125.99);
 assert.ok(!('incomeSourceId' in deleted.transactions.at(-1)));
 await writeBudget(db,await parseBackup(JSON.stringify(oldExport)),10,crypto.randomUUID(),'test@example.invalid','Återställde äldre kopia');
 assert.deepEqual((await readBudget(db)).data,old);
 assert.equal((await db.one('SELECT count(*) n FROM income_sources')).n,0);
 assert.deepEqual((await readBackup(db,(await listBackups(db)).find(b=>b.revision===10).id)).data,deleted);
});
test('Revenue writes reject duplicate profiles, fractional targets and dangling links without side effects',async()=>{
 const db=await TestDB.create();await migrateBudget(db);const before=await readBudget(db),copies=await listBackups(db);
 const source={id:'creator',name:'Test',channel:'',type:'Övrigt',monthlyTarget:0,notes:'',archived:false};
 await assert.rejects(writeBudget(db,{...before.data,revenueSources:[source,source]},7,crypto.randomUUID(),'test@example.invalid','Test'),/Dubbla/);
 await assert.rejects(writeBudget(db,{...before.data,revenueSources:[{...source,monthlyTarget:0.001}]},7,crypto.randomUUID(),'test@example.invalid','Test'),/ören/);
 await assert.rejects(writeBudget(db,{...before.data,transactions:before.data.transactions.map(t=>({...t,incomeSourceId:'missing'}))},7,crypto.randomUUID(),'test@example.invalid','Test'));
 db.failOn='INSERT INTO income_sources';
 await assert.rejects(writeBudget(db,{...before.data,revenueSources:[source]},7,crypto.randomUUID(),'test@example.invalid','Test'),/Injected/);db.failOn='';
 assert.deepEqual(await readBudget(db),before);assert.deepEqual(await listBackups(db),copies);
});
test('Additive source DDL preserves existing normalized records and defaults without rewriting budgets',async()=>{
 const pg=new PGlite();try{
  await pg.exec(readFileSync(new URL('../db/postgres.sql',import.meta.url),'utf8'));
  await pg.query("INSERT INTO budget_state(id,name,source_label,source_imported_at,source_period,notes,revision,updated_at,write_token) VALUES('household','Test','','','','',4,'2026-10-20','test')");
  await pg.query("INSERT INTO categories(name) VALUES('Test')");
  await pg.query("INSERT INTO transactions(id,household_id,date,description,amount_cents,kind,category,reviewed,source,excluded,position) VALUES('payment','household','2026-10-20','Test',12345,'income','Test',1,'test.csv',0,0)");
  const before=await pg.query('SELECT * FROM transactions'),state=await pg.query('SELECT * FROM budget_state');
  await pg.transaction(tx=>tx.exec(readFileSync(new URL('../db/002-income-sources.sql',import.meta.url),'utf8')));
  const after=await pg.query("SELECT to_jsonb(t)-'income_source_id' AS original FROM transactions t");
  assert.deepEqual(after.rows.map(x=>x.original),before.rows);
  assert.equal((await pg.query('SELECT income_source_id FROM transactions')).rows[0].income_source_id,null);
  assert.deepEqual((await pg.query("SELECT to_jsonb(s)-'income_sources_enabled' AS original FROM budget_state s")).rows.map(x=>x.original),state.rows);
  assert.equal((await pg.query('SELECT income_sources_enabled FROM budget_state')).rows[0].income_sources_enabled,0);
 }finally{await pg.close();}
});
for(const kind of ['transactions','incomes','debts','expenses','goals'])test(`${kind}: create, edit, delete, restore without changing unrelated records`,async()=>{
  const db=await TestDB.create();await migrateBudget(db);const original=(await readBudget(db)).data;
  let next=structuredClone(original),revision=7;
  const row={...next[kind][0],id:'manual-test'};next[kind].push(row);
  await writeBudget(db,next,revision++,crypto.randomUUID(),'test@example.invalid','Manuellt tillagd');
  assert.deepEqual((await readBudget(db)).data,next);
  next=structuredClone(next);next[kind].find(x=>x.id==='manual-test')[kind==='debts'?'balance':kind==='goals'?'saved':'amount']=123.45;
  await writeBudget(db,next,revision++,crypto.randomUUID(),'test@example.invalid','Manuellt ändrad');
  assert.deepEqual((await readBudget(db)).data,next);
  const deleted=removeRecord(next,kind,'manual-test');assert.deepEqual(deleted,original);
  await writeBudget(db,deleted,revision++,crypto.randomUUID(),'test@example.invalid','Tog bort testpost');
  assert.deepEqual((await readBudget(db)).data,original);
  const copy=(await listBackups(db)).find(b=>b.revision===revision-1);
  const recovered=await readBackup(db,copy.id);assert.deepEqual(recovered.data,next);
  await writeBudget(db,recovered.data,revision,crypto.randomUUID(),'test@example.invalid','Återställde testpost');
  assert.deepEqual((await readBudget(db)).data,next);
  assert.throws(()=>removeRecord(original,kind,'missing'),/finns inte/);
});
const creditor={id:'c1',name:'Testborgenär',debtId:'d1',contact:'Handläggare',email:'test@example.invalid',phone:'',reference:'Testref',contactSource:'Testfaktura',notes:'',archived:false};
const contactActivity={id:'a1',caseId:'c1',type:'Betalningspaus',status:'Planerad',channel:'E-post',date:'2026-10-15',nextDate:'2026-10-20',requested:'Önskar en månads paus',agreed:'',confirmation:'',from:'2026-11-01',to:'2026-11-30',notes:''};
test('Approval requires documented terms, evidence and valid pause dates',()=>{
  assert.equal(activitySchema.safeParse({...contactActivity,status:'Godkänd'}).success,false);
  const approved={...contactActivity,status:'Godkänd',agreed:'Ränta löper. Nästa betalning 1 december.',confirmation:'Skriftligt besked 15 oktober, testref'};
  assert.equal(activitySchema.safeParse(approved).success,true);
  assert.equal(activitySchema.safeParse({...approved,to:''}).success,false);
  assert.equal(activitySchema.safeParse({...approved,to:'2026-10-01'}).success,false);
  assert.equal(activitySchema.safeParse({...approved,to:'2026-02-30'}).success,false);
  assert.equal(pauseState(contactActivity,'2026-11-10'),null,'A request is never shown as an approved pause');
  assert.equal(pauseState(approved,'2026-10-20'),'Kommande period');
  assert.equal(pauseState(approved,'2026-11-10'),'Inom överenskommen period');
  assert.equal(pauseState(approved,'2026-12-01'),'Perioden har löpt ut');
  assert.equal(needsFollowup(contactActivity,'2026-10-19'),false);assert.equal(needsFollowup(contactActivity,'2026-10-20'),true);
  assert.equal(needsFollowup({...contactActivity,status:'Avslutad'},'2026-10-21'),false);
  assert.equal(creditorWorkSchema.safeParse({cases:[],activities:[contactActivity]}).success,false);
  assert.match(contactDraft(creditor,contactActivity),/Detta är en förfrågan/);
});
test('Debt checkpoints persist independently and survive backups; old restore clears history',async()=>{
  const db=await TestDB.create();await migrateBudget(db);const old=(await readBudget(db)).data;
  const next={...old,debtHistory:[{date:'2026-10-15',balances:[{id:'d1',balance:25000.99,verified:false}]}]};
  await writeBudget(db,next,7,crypto.randomUUID(),'test@example.invalid','Avstämning');
  assert.deepEqual((await readBudget(db)).data,next);
  assert.deepEqual(await parseBackup(JSON.stringify(await makeBackup(next))),next);
  const edited={...next,debts:next.debts.map(d=>({...d,balance:23000}))};
  await writeBudget(db,edited,8,crypto.randomUUID(),'test@example.invalid','Saldo');
  assert.deepEqual((await readBudget(db)).data.debtHistory,next.debtHistory);
  assert.deepEqual((await readBackup(db,(await listBackups(db)).find(b=>b.revision===8).id)).data,next);
  await writeBudget(db,old,9,crypto.randomUUID(),'test@example.invalid','Återställde gammal kopia');
  assert.deepEqual((await readBudget(db)).data,old);
  assert.equal((await db.one('SELECT count(*) n FROM debt_checkpoints')).n,0);
});
test('Expense priority true/false/automatic survives storage; old backups keep their shape',async()=>{
  const db=await TestDB.create();await migrateBudget(db);const old=(await readBudget(db)).data;
  const next={...old,expenses:old.expenses.map((e,i)=>({...e,priority:i===0}))};
  await writeBudget(db,next,7,crypto.randomUUID(),'test@example.invalid','Prioritet');
  assert.deepEqual((await readBudget(db)).data,next);
  assert.deepEqual(await parseBackup(JSON.stringify(await makeBackup(next))),next);
  await writeBudget(db,old,8,crypto.randomUUID(),'test@example.invalid','Återställde äldre kopia');
  assert.deepEqual((await readBudget(db)).data,old);
  assert.deepEqual((await readBackup(db,(await listBackups(db)).find(b=>b.revision===8).id)).data,next);
  assert.equal((await db.one('SELECT count(*) n FROM budget_items WHERE priority IS NOT NULL')).n,0);
});
test('Creditor work survives storage and backups without changing payment data',async()=>{
  const db=await TestDB.create();await migrateBudget(db);const old=(await readBudget(db)).data;
  const oldExport=await makeBackup(old);
  const next={...old,creditorWork:{cases:[creditor],activities:[contactActivity]}};
  await writeBudget(db,next,7,crypto.randomUUID(),'test@example.invalid','Ny borgenärsaktivitet');
  assert.deepEqual((await readBudget(db)).data,next);
  const approved={...next,creditorWork:{cases:[creditor],activities:[{...contactActivity,status:'Godkänd',agreed:'Testvillkor',confirmation:'Testbekräftelse'}]}};
  await writeBudget(db,approved,8,crypto.randomUUID(),'test@example.invalid','Registrerat godkännande');
  assert.deepEqual((await readBudget(db)).data.debts,old.debts);assert.deepEqual((await readBudget(db)).data.expenses,old.expenses);
  assert.deepEqual((await readBackup(db,(await listBackups(db)).find(b=>b.revision===8).id)).data,next);
  // Previous version exports still validate, and an intentional full restore removes new CRM data.
  await writeBudget(db,await parseBackup(JSON.stringify(oldExport)),9,crypto.randomUUID(),'test@example.invalid','Återställde äldre kopia');
  assert.deepEqual((await readBudget(db)).data,old);assert.equal((await db.one('SELECT count(*) n FROM creditor_cases')).n,0);
});
test('Lossless migration, original preserved, cents and idempotence',async()=>{
  const db=await TestDB.create(),before=await readBudget(db),legacy=(await db.one('SELECT * FROM budgets'));
  const result=await migrateBudget(db);assert.equal(result.verified,true);assert.equal(result.revision,7);
  assert.deepEqual((await readBudget(db)).data,before.data);assert.deepEqual((await db.one('SELECT * FROM budgets')),legacy);
  assert.equal((await db.one('SELECT amount_cents FROM transactions WHERE id=?',['t1'])).amount_cents,-12599);
  assert.equal((await migrateBudget(db)).alreadyMigrated,true);assert.equal((await listBackups(db)).length,1);
  assert.equal((await db.one('SELECT month FROM budget_plans')).month,null,'Normalbudget is not falsely dated');
});
test('Backup export → parse → restore roundtrip, including older exports',async()=>{
  const db=await TestDB.create();await migrateBudget(db);const original=(await readBudget(db)).data;
  const exported=await makeBackup(original);assert.deepEqual(await parseBackup(JSON.stringify(exported)),original);
  assert.deepEqual(await parseBackup(JSON.stringify(original)),original);
  const edited={...original,name:'Ändrad budget'};await writeBudget(db,edited,7,crypto.randomUUID(),'test@example.invalid','Ändring');
  const historical=await readBackup(db,(await listBackups(db))[0].id);assert.deepEqual(historical.data,original);
  await writeBudget(db,await parseBackup(JSON.stringify(exported)),8,crypto.randomUUID(),'test@example.invalid','Återställde säkerhetskopia');
  assert.deepEqual((await readBudget(db)).data,original);assert.equal((await readBudget(db)).revision,9);
  const backups=await listBackups(db),preRestore=backups.find(b=>b.reason==='Före återställning');
  assert.deepEqual((await readBackup(db,preRestore.id)).data,edited,'Restore itself can be undone');
});
test('Corrupt checksums and unknown backup versions are rejected',async()=>{
  const data=fixture(),file=await makeBackup(data);file.data.name='Tampered';await assert.rejects(parseBackup(JSON.stringify(file)),/kontrollsumma/);
  file.version=99;await assert.rejects(parseBackup(JSON.stringify(file)),/version/);
  const db=await TestDB.create();await migrateBudget(db);await db.pg.exec("UPDATE budget_backups SET sha256='invalid'");
  await assert.rejects(readBackup(db,(await listBackups(db))[0].id),/kontrollsumma/);
});
test('Stale and duplicate writes leave current records and backups unchanged',async()=>{
  const db=await TestDB.create();await migrateBudget(db);const id=crypto.randomUUID(),data=fixture();
  await writeBudget(db,data,7,id,'test@example.invalid','Ändring');const n=(await listBackups(db)).length;
  await assert.rejects(writeBudget(db,{...data,name:'stale'},7,crypto.randomUUID(),'test@example.invalid','Ändring'),Conflict);
  await assert.rejects(writeBudget(db,data,8,id,'test@example.invalid','Ändring'),Conflict);
  assert.deepEqual((await readBudget(db)).data,data);assert.equal((await listBackups(db)).length,n);
});
test('Failed atomic batch rolls back revision, records, audit and backups',async()=>{
  const db=await TestDB.create();await migrateBudget(db);const before=await readBudget(db),backups=await listBackups(db);
  db.failOn='INSERT INTO debts';await assert.rejects(writeBudget(db,{...before.data,name:'must rollback'},7,crypto.randomUUID(),'test@example.invalid','Ändring'),/Injected/);db.failOn='';
  assert.deepEqual(await readBudget(db),before);assert.deepEqual(await listBackups(db),backups);
});
test('Duplicate IDs and fractional öre are rejected without changes',async()=>{
  const db=await TestDB.create();await migrateBudget(db);const data=fixture();data.transactions.push({...data.transactions[0]});
  await assert.rejects(writeBudget(db,data,7,crypto.randomUUID(),'test@example.invalid','Test'),/Dubbla/);
  const fraction=fixture();fraction.expenses[0].amount=1.001;await assert.rejects(writeBudget(db,fraction,7,crypto.randomUUID(),'test@example.invalid','Test'),/ören/);
  assert.equal((await readBudget(db)).revision,7);
});
test('Large backup is chunked and all 5000 transactions roundtrip',async()=>{
  const data=fixture();data.transactions=Array.from({length:5000},(_,i)=>({...data.transactions[0],id:'t'+i,description:'💚'.repeat(90),source:'a'.repeat(180)}));
  const db=await TestDB.create();await migrateBudget(db);await writeBudget(db,data,7,crypto.randomUUID(),'test@example.invalid','Stor import');assert.deepEqual((await readBudget(db)).data,data);
  await writeBudget(db,{...data,name:'Efter kopia'},8,crypto.randomUUID(),'test@example.invalid','Ändring');
  const copy=await readBackup(db,(await listBackups(db))[0].id);assert.equal(await digest(copy.data),await digest(data));
  assert.ok((await db.one('SELECT count(*) n FROM backup_chunks')).n>1);
});
