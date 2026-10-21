import { budgetSchema, emptyBudget, type Budget } from './budget';
import { digest, makeBackup } from './backup';

import type { Database as DB, Statement } from './postgres';
type Row = Record<string, string | number | null>;
export class Conflict extends Error {}
const household = 'household';
const plan = 'normal';
const cents = (v: number) => Math.round(v * 100);
const amount = (v: unknown) => Number(v) / 100;
const guard = "EXISTS(SELECT 1 FROM budget_state WHERE id='household' AND write_token=?)";

export function assertUnique(data: Budget) {
  for (const items of [data.expenses, data.incomes, data.transactions, data.debts, data.goals, data.revenueSources||[],data.budgetScenarios||[]]) {
    if (new Set(items.map(x => x.id)).size !== items.length) throw Error('Dubbla post-ID i budgeten.');
  }
  const money=[...(data.revenueSources||[]).map(x=>x.monthlyTarget),...data.expenses.flatMap(x=>[x.amount,x.frame]),...data.incomes.map(x=>x.amount),...data.transactions.map(x=>x.amount),...data.debts.flatMap(x=>[x.balance,x.original,x.monthly]),...data.goals.flatMap(x=>[x.target,x.saved,x.monthly])];
  if(money.some(x=>cents(x)/100!==x)) throw Error('Belopp måste anges i hela ören.');
}
export async function readBudget(db: DB) {
  // A repeatable-read PostgreSQL transaction gives a consistent revision and content.
  const results = await db.batch<Row>([
    db.prepare("SELECT * FROM budget_state WHERE id='household'"),
    db.prepare("SELECT * FROM budget_items WHERE plan_id='normal' ORDER BY position"),
    db.prepare("SELECT * FROM transactions WHERE household_id='household' ORDER BY position"),
    db.prepare("SELECT * FROM debts WHERE household_id='household' ORDER BY position"),
    db.prepare("SELECT * FROM savings_goals WHERE household_id='household' ORDER BY position"),
    db.prepare("SELECT * FROM budgets WHERE id='household'"),
    db.prepare("SELECT * FROM creditor_cases WHERE household_id='household' ORDER BY position"),
    db.prepare("SELECT * FROM creditor_activities WHERE household_id='household' ORDER BY position"),
    db.prepare("SELECT * FROM debt_checkpoints WHERE household_id='household' ORDER BY date"),
    db.prepare("SELECT * FROM income_sources WHERE household_id='household' ORDER BY position"),
  ]);
  const state = results[0].results[0];
  if (!state) {
    const legacy = results[5].results[0];
    return { data: legacy ? budgetSchema.parse(JSON.parse(String(legacy.payload))) : emptyBudget,
      revision: Number(legacy?.revision || 0), updatedAt: legacy ? String(legacy.updated_at) : null, storage: 'legacy' as const };
  }
  const items = results[1].results;
  const data = budgetSchema.parse({ version: 1, name: state.name,
    ...(state.income_sources_enabled?{revenueSources:results[9].results.map(x=>({id:x.id,name:x.name,channel:x.channel,type:x.type,monthlyTarget:amount(x.monthly_target_cents),notes:x.notes,archived:!!x.archived}))}:{}),
    ...(state.debt_history_enabled?{debtHistory:results[8].results.map(x=>({date:x.date,balances:JSON.parse(String(x.balances))}))}:{}),
    ...(state.creditor_work_enabled?{creditorWork:{
      cases:results[6].results.map(x=>({id:x.id,name:x.name,debtId:x.debt_id,contact:x.contact,email:x.email,phone:x.phone,reference:x.reference,contactSource:x.contact_source,notes:x.notes,archived:!!x.archived})),
      activities:results[7].results.map(x=>({id:x.id,caseId:x.case_id,type:x.type,status:x.status,channel:x.channel,date:x.date,nextDate:x.next_date,requested:x.requested,agreed:x.agreed,confirmation:x.confirmation,from:x.period_from,to:x.period_to,notes:x.notes})),
    }}:{}),
    source: { label: state.source_label, importedAt: state.source_imported_at, period: state.source_period }, notes: state.notes,
    incomes: items.filter(x=>x.kind==='income').map(x=>({id:x.id,name:x.name,amount:amount(x.amount_cents)})),
    expenses: items.filter(x=>x.kind==='expense').map(x=>({id:x.id,name:x.name,amount:amount(x.amount_cents),frame:amount(x.frame_cents),status:x.status,note:x.note,...(x.priority==null?{}:{priority:!!x.priority})})),
    transactions: results[2].results.map(x=>({id:x.id,date:x.date,description:x.description,amount:amount(x.amount_cents),kind:x.kind,category:x.category,reviewed:!!x.reviewed,source:x.source,excluded:!!x.excluded,...(x.income_source_id==null?{}:{incomeSourceId:x.income_source_id})})),
    debts: results[3].results.map(x=>({id:x.id,name:x.name,balance:amount(x.balance_cents),original:amount(x.original_cents),rate:x.rate,monthly:amount(x.monthly_cents),type:x.type,note:x.note,balanceVerified:!!x.balance_verified})),
    goals: results[4].results.map(x=>({id:x.id,name:x.name,target:amount(x.target_cents),saved:amount(x.saved_cents),monthly:amount(x.monthly_cents)})),
  });
  return { data, revision: Number(state.revision), updatedAt: String(state.updated_at), storage: 'normalized' as const };
}

function contentStatements(db: DB, data: Budget, token: string) {
  const statements: Statement[] = [];
  // Values are parameter-bound. json_each avoids per-row queries and parameter limits.
  function insert(table: string, columns: string[], rows: unknown[][]) {
    for (let start=0;start<rows.length;start+=1000) {
      const chunk=rows.slice(start,start+1000);
      const value=(column:string,i:number)=>`(value->>${i})${column.endsWith('_cents')?'::bigint':['position','priority','reviewed','excluded','archived','balance_verified'].includes(column)?'::integer':column==='rate'?'::double precision':''}`;
      statements.push(db.prepare(`INSERT INTO ${table} (${columns.join(',')}) SELECT ${columns.map(value).join(',')} FROM jsonb_array_elements(?::jsonb) AS data(value) WHERE ${guard}`).bind(JSON.stringify(chunk),token));
    }
  }
  for (const table of ['debt_checkpoints','creditor_activities','creditor_cases','budget_items','transactions','income_sources','debts','savings_goals']) {
    const scope=table==='budget_items'?"plan_id='normal'":"household_id='household'";
    statements.push(db.prepare(`DELETE FROM ${table} WHERE ${scope} AND ${guard}`).bind(token));
  }
  const names=[...new Set(data.transactions.map(x=>x.category))];
  for(let i=0;i<names.length;i+=1000) statements.push(db.prepare(`INSERT OR IGNORE INTO categories(name) SELECT value FROM jsonb_array_elements_text(?::jsonb) AS data(value) WHERE ${guard}`).bind(JSON.stringify(names.slice(i,i+1000)),token));
  insert('budget_items',['id','plan_id','kind','name','amount_cents','frame_cents','status','note','position','priority'],[
    ...data.incomes.map((x,i)=>[x.id,plan,'income',x.name,cents(x.amount),null,null,null,i,null]),
    ...data.expenses.map((x,i)=>[x.id,plan,'expense',x.name,cents(x.amount),cents(x.frame),x.status,x.note,i,x.priority===undefined?null:+x.priority]),
  ]);
  insert('income_sources',['id','household_id','name','channel','type','monthly_target_cents','notes','archived','position'],(data.revenueSources||[]).map((x,i)=>[x.id,household,x.name,x.channel,x.type,cents(x.monthlyTarget),x.notes,+x.archived,i]));
  statements.push(db.prepare(`UPDATE budget_state SET income_sources_enabled=? WHERE id='household' AND ${guard}`).bind(data.revenueSources?1:0,token));
  insert('transactions',['id','household_id','date','description','amount_cents','kind','category','reviewed','source','excluded','position','income_source_id'],data.transactions.map((x,i)=>[x.id,household,x.date,x.description,cents(x.amount),x.kind,x.category,+x.reviewed,x.source,+x.excluded,i,x.incomeSourceId??null]));
  insert('debts',['id','household_id','name','balance_cents','original_cents','rate','monthly_cents','type','note','balance_verified','position'],data.debts.map((x,i)=>[x.id,household,x.name,cents(x.balance),cents(x.original),x.rate,cents(x.monthly),x.type,x.note,+x.balanceVerified,i]));
  insert('savings_goals',['id','household_id','name','target_cents','saved_cents','monthly_cents','position'],data.goals.map((x,i)=>[x.id,household,x.name,cents(x.target),cents(x.saved),cents(x.monthly),i]));
  insert('creditor_cases',['id','household_id','name','debt_id','contact','email','phone','reference','contact_source','notes','archived','position'],(data.creditorWork?.cases||[]).map((x,i)=>[x.id,household,x.name,x.debtId,x.contact,x.email,x.phone,x.reference,x.contactSource,x.notes,+x.archived,i]));
  // Chunk long activity notes more tightly than ordinary transactions.
  const acts=data.creditorWork?.activities||[];
  for(let start=0;start<acts.length;start+=50)insert('creditor_activities',['id','household_id','case_id','type','status','channel','date','next_date','requested','agreed','confirmation','period_from','period_to','notes','position'],acts.slice(start,start+50).map((x,i)=>[x.id,household,x.caseId,x.type,x.status,x.channel,x.date,x.nextDate,x.requested,x.agreed,x.confirmation,x.from,x.to,x.notes,start+i]));
  statements.push(db.prepare(`UPDATE budget_state SET creditor_work_enabled=? WHERE id='household' AND ${guard}`).bind(data.creditorWork?1:0,token));
  for(const h of data.debtHistory||[])insert('debt_checkpoints',['household_id','date','balances'],[[household,h.date,JSON.stringify(h.balances)]]);
  statements.push(db.prepare(`UPDATE budget_state SET debt_history_enabled=? WHERE id='household' AND ${guard}`).bind(data.debtHistory?1:0,token));
  return statements;
}

async function backupStatements(db: DB, data: Budget, revision: number, reason: string, token: string) {
  const id=crypto.randomUUID(),text=JSON.stringify(data),now=new Date().toISOString();
  const statements=[db.prepare(`INSERT INTO budget_backups(id,revision,created_at,reason,sha256) SELECT ?,?,?,?,? WHERE ${guard}`).bind(id,revision,now,reason,await digest(data),token)];
  // Small chunks avoid D1's 2 MB value limit; snapshots never share mutable rows.
  const chunks=[];
  for(let i=0;i<text.length;) {
    let end=Math.min(i+200_000,text.length);
    const last=text.charCodeAt(end-1);
    if(end<text.length&&last>=0xD800&&last<=0xDBFF) end--;
    chunks.push([id,chunks.length,text.slice(i,end)]);i=end;
  }
  // Each chunk is a separate bounded string, not one oversized bound array.
  for(const chunk of chunks) statements.push(db.prepare(`INSERT INTO backup_chunks(backup_id,position,payload) SELECT ?,?,? WHERE ${guard}`).bind(...chunk,token));
  return statements;
}

export async function migrateBudget(db: DB) {
  const current=await readBudget(db);
  if(current.storage==='normalized') return { alreadyMigrated:true, revision:current.revision, sha256:await digest(current.data) };
  assertUnique(current.data);
  const token=crypto.randomUUID(),now=current.updatedAt||new Date().toISOString(),d=current.data;
  const statements=[db.prepare('INSERT OR IGNORE INTO budget_state(id,name,source_label,source_imported_at,source_period,notes,revision,updated_at,write_token) VALUES(?,?,?,?,?,?,?,?,?)').bind(household,d.name,d.source.label,d.source.importedAt,d.source.period,d.notes,current.revision,now,token),
    db.prepare(`INSERT OR IGNORE INTO budget_plans(id,household_id,name,month) SELECT 'normal','household','Normalbudget',NULL WHERE ${guard}`).bind(token),
    ...await backupStatements(db,d,current.revision,'Före databasuppgradering',token),
    ...contentStatements(db,d,token),
    db.prepare(`INSERT INTO activity(id,actor,action,created_at) SELECT ?,'system','Budget flyttad till strukturerade tabeller; originalkopia bevarad',? WHERE ${guard}`).bind(token,new Date().toISOString(),token),
  ];
  const result=await db.batch(statements);
  const after=await readBudget(db),beforeHash=await digest(d),afterHash=await digest(after.data);
  if(result[0].meta.changes && beforeHash!==afterHash) throw Error('Migreringskontroll misslyckades; originalet finns kvar.');
  const backupRow=await db.prepare("SELECT id FROM budget_backups WHERE reason='Före databasuppgradering' ORDER BY created_at DESC LIMIT 1").first<{id:string}>();
  const backup=backupRow?await readBackup(db,backupRow.id):null;
  const backupVerified=!!backup&&await digest(backup.data)===beforeHash;
  if(!backupVerified) throw Error('Återställningskopian kunde inte verifieras.');
  return { alreadyMigrated:!result[0].meta.changes, revision:after.revision, sha256:afterHash, verified:beforeHash===afterHash,backupVerified,
    counts:{transactions:after.data.transactions.length,debts:after.data.debts.length,expenses:after.data.expenses.length,incomes:after.data.incomes.length,goals:after.data.goals.length} };
}

export async function writeBudget(db:DB, data:Budget, revision:number, requestId:string, actor:string, action:string, userId?:string) {
  data=budgetSchema.parse(data);
  assertUnique(data);
  await migrateBudget(db);
  const previous=await readBudget(db);
  if(previous.revision!==revision || await db.prepare('SELECT id FROM activity WHERE id=?').bind(requestId).first()) throw new Conflict();
  const token=crypto.randomUUID(),now=new Date().toISOString();
  const statements=[db.prepare("UPDATE budget_state SET name=?,source_label=?,source_imported_at=?,source_period=?,notes=?,revision=revision+1,updated_at=?,write_token=? WHERE id='household' AND revision=?").bind(data.name,data.source.label,data.source.importedAt,data.source.period,data.notes,now,token,revision),
    ...await backupStatements(db,previous.data,revision,action.startsWith('Återställde')?'Före återställning':'Före ändring',token),
    ...contentStatements(db,data,token),
    db.prepare(`INSERT INTO activity(id,actor,action,created_at) SELECT ?,?,?,? WHERE ${guard}`).bind(requestId,actor,action.slice(0,160),now,token),
  ];
  if(userId) statements.push(db.prepare(`INSERT OR IGNORE INTO members(email,user_id,role,created_at) SELECT ?,?,'owner',? WHERE ${guard}`).bind(actor.toLowerCase(),userId,now,token));
  const result=await db.batch(statements);
  if(!result[0].meta.changes) throw new Conflict();
  return {revision:revision+1,updatedAt:now};
}
export async function listBackups(db:DB) {
  return (await db.prepare('SELECT id,revision,created_at,reason FROM budget_backups ORDER BY created_at DESC,id DESC LIMIT 20').all()).results;
}
export async function readBackup(db:DB,id:string) {
  const results=await db.batch<Row>([db.prepare('SELECT sha256 FROM budget_backups WHERE id=?').bind(id),db.prepare('SELECT payload FROM backup_chunks WHERE backup_id=? ORDER BY position').bind(id)]);
  const meta=results[0].results[0]; if(!meta) return null;
  const data=budgetSchema.parse(JSON.parse(results[1].results.map(x=>x.payload).join('')));
  if(await digest(data)!==meta.sha256) throw Error('Säkerhetskopians kontrollsumma stämmer inte.');
  return makeBackup(data);
}
