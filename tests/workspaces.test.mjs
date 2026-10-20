import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {Database} from '../lib/postgres.ts';
import {emptyBudget} from '../lib/budget.ts';
import {digest,parseBackup} from '../lib/backup.ts';
import {migrateBudget,readBudget,writeBudget,Conflict} from '../lib/storage.ts';
import {workspaceIdentity,workspaceSession,writeWorkspaceBudget,workspaceBackup,manageWorkspaceViewer,listWorkspaces,AccessDenied} from '../lib/workspaces.ts';
const alice={userId:'user-alice',email:'alice@example.invalid',displayName:'Alice'};
const bob={userId:'user-bob',email:'bob@example.invalid',displayName:'Bob'};
const eve={userId:'user-eve',email:'eve@example.invalid',displayName:'Eve'};
const open=[];
test.afterEach(async()=>{for(const db of open)await db.pg.close();open.length=0});
async function createDB(){
 const pg=new PGlite();let db;
 db=new Database(queries=>pg.transaction(async tx=>{
  const out=[];
  for(const q of queries){if(db.failOn&&q.text.includes(db.failOn))throw Error('Injected failure');const result=await tx.query(q.text,q.values);out.push({results:result.rows,meta:{changes:result.affectedRows??0}})}
  return out;
 }));
 db.pg=pg;open.push(db);
 for(const file of ['postgres.sql','002-income-sources.sql','003-workspaces.sql'])await pg.exec(readFileSync(new URL('../db/'+file,import.meta.url),'utf8'));
 return db;
}
const personalData=name=>({...structuredClone(emptyBudget),name,notes:name+' private notes',transactions:[{id:'same-payment-id',date:'2026-10-20',description:name+' private payment',amount:100,kind:'income',category:'Private',source:'Test',reviewed:true,excluded:false}]});
const write=(db,user,data,revision=0,id=crypto.randomUUID())=>writeWorkspaceBudget(db,user,data,revision,id,'Test change');
test('Every verified subject gets one empty private workspace; equal imported IDs cannot collide across users',async()=>{
 const db=await createDB(),a=await workspaceIdentity(db,alice,undefined),b=await workspaceIdentity(db,bob,undefined);
 assert.notEqual(a.workspaceId,b.workspaceId);assert.equal(a.role,'owner');assert.equal(b.role,'owner');
 assert.deepEqual((await workspaceSession(db,a)).data,emptyBudget);assert.deepEqual((await workspaceSession(db,b)).data,emptyBudget);
 await write(db,a,personalData('Alice'),0,'same-request-id');await write(db,b,personalData('Bob'),0,'same-request-id');
 assert.equal((await workspaceSession(db,a)).data.name,'Alice');assert.equal((await workspaceSession(db,b)).data.name,'Bob');
 assert.deepEqual((await listWorkspaces(db,alice.userId)).map(w=>w.id),[a.workspaceId]);
 assert.equal((await workspaceIdentity(db,alice,undefined)).workspaceId,a.workspaceId);
 assert.equal((await db.pg.query('SELECT count(*)::int AS count FROM workspaces')).rows[0].count,2);
});
test('Forged workspace IDs and roles cannot read, write, export backups or invite into another account',async()=>{
 const db=await createDB(),a=await workspaceIdentity(db,alice,undefined),b=await workspaceIdentity(db,bob,undefined);
 await write(db,a,personalData('Secret A'));await write(db,a,personalData('Secret A v2'),1);
 await write(db,b,personalData('Secret B'));
 const before=await workspaceSession(db,a),forged={...b,workspaceId:a.workspaceId,role:'owner'};
 await assert.rejects(workspaceIdentity(db,bob,undefined,a.workspaceId),AccessDenied);
 await assert.rejects(workspaceIdentity(db,bob,undefined,'guessed-workspace-id'),AccessDenied);
 await assert.rejects(workspaceSession(db,forged),AccessDenied);
 await assert.rejects(write(db,forged,personalData('Attack'),2),AccessDenied);
 await assert.rejects(workspaceBackup(db,forged),AccessDenied);
 await assert.rejects(manageWorkspaceViewer(db,forged,eve.email),AccessDenied);
 assert.equal(await workspaceBackup(db,b,before.backups[0].id),null);
 assert.deepEqual(await workspaceSession(db,a),before);
 assert.equal((await workspaceSession(db,b)).data.name,'Secret B');
});
test('Invited advisors keep their own private default; shared workspace is explicit, read-only and revocable',async()=>{
 const db=await createDB(),a=await workspaceIdentity(db,alice,undefined),b=await workspaceIdentity(db,bob,undefined);
 await write(db,a,personalData('Alice'));
 await write(db,b,personalData('Bob'));
 await manageWorkspaceViewer(db,a,bob.email);
 const own=await workspaceIdentity(db,bob,undefined);
 assert.equal(own.workspaceId,b.workspaceId);assert.equal(own.role,'owner');
 const shared=await workspaceIdentity(db,bob,undefined,a.workspaceId);
 assert.equal(shared.role,'viewer');assert.equal((await workspaceSession(db,shared)).data.name,'Alice');
 assert.deepEqual((await workspaceSession(db,shared)).members,[]);assert.deepEqual((await workspaceSession(db,shared)).backups,[]);
 await assert.rejects(write(db,shared,personalData('Forbidden'),1),AccessDenied);
 await assert.rejects(workspaceBackup(db,shared),AccessDenied);
 await assert.rejects(manageWorkspaceViewer(db,shared,eve.email),AccessDenied);
 assert.equal((await listWorkspaces(db,alice.userId)).length,1,'Sharing never grants the owner access to the advisor private workspace');
 await manageWorkspaceViewer(db,a,bob.email,true);
 await assert.rejects(workspaceSession(db,shared),AccessDenied,'Old resolved identity cannot outlive revoked access');
 await assert.rejects(workspaceIdentity(db,bob,undefined,a.workspaceId),AccessDenied);
 assert.deepEqual((await listWorkspaces(db,bob.userId)).map(w=>w.id),[b.workspaceId]);
 assert.equal((await workspaceSession(db,b)).data.name,'Bob');
});
test('Bound invitations do not rebind to a different subject; owner access survives a verified email change',async()=>{
 const db=await createDB(),a=await workspaceIdentity(db,alice,undefined);
 await manageWorkspaceViewer(db,a,bob.email);
 await workspaceIdentity(db,bob,undefined);
 const impostor={...eve,email:bob.email};
 await assert.rejects(workspaceIdentity(db,impostor,undefined,a.workspaceId),AccessDenied);
 const renamed=await workspaceIdentity(db,{...alice,email:'new-alice@example.invalid'},undefined);
 assert.equal(renamed.workspaceId,a.workspaceId);assert.equal(renamed.role,'owner');
});
test('Legacy owner import is gated by provider binding and preserves all data, backups, viewers, logs and original tables',async()=>{
 const db=await createDB(),legacy=personalData('Legacy private budget');
 await db.pg.query("INSERT INTO budgets(id,payload,revision,updated_at) VALUES('household',$1,7,'2026-10-20')",[JSON.stringify(legacy)]);
 await db.pg.query("INSERT INTO members(email,user_id,role,created_at) VALUES($1,$2,'owner','2026-10-20')",[alice.email,alice.userId]);
 await db.pg.query("INSERT INTO members(email,user_id,role,created_at) VALUES($1,$2,'viewer','2026-10-20')",[bob.email,bob.userId]);
 await migrateBudget(db);
 await writeBudget(db,{...legacy,notes:'Updated private notes'},7,'legacy-request-id',alice.email,'Legacy edit');
 const before=await readBudget(db),legacyRows=(await db.pg.query('SELECT * FROM budget_state')).rows;
 const stranger=await workspaceIdentity(db,eve,alice.email);
 assert.deepEqual((await workspaceSession(db,stranger)).data,emptyBudget,'New users never inherit the default household');
 await assert.rejects(workspaceIdentity(db,{...eve,userId:'impostor',email:alice.email},alice.email),AccessDenied);
 const owner=await workspaceIdentity(db,alice,alice.email),session=await workspaceSession(db,owner);
 assert.equal(owner.workspaceId,'legacy-household');assert.deepEqual(session.data,before.data);assert.equal(session.revision,8);
 const oldCopies=(await db.pg.query('SELECT * FROM budget_backups')).rows;
 assert.equal(session.backups.length,oldCopies.length);
 for(const copy of session.backups){const file=await workspaceBackup(db,owner,copy.id);assert.ok(file);assert.equal(await digest(await parseBackup(JSON.stringify(file))),file.sha256)}
 assert.equal(session.members[0].email,bob.email);assert.ok(session.activity.some(a=>a.action==='Legacy edit'));
 assert.deepEqual((await db.pg.query('SELECT * FROM budget_state')).rows,legacyRows);
 const advisor=await workspaceIdentity(db,bob,alice.email,owner.workspaceId);assert.equal(advisor.role,'viewer');
 const idempotent=await workspaceIdentity(db,alice,alice.email);assert.deepEqual((await workspaceSession(db,idempotent)).data,before.data);
 await write(db,owner,{...session.data,notes:'New private storage'},8);
 assert.equal((await readBudget(db)).data.notes,'Updated private notes','Retired original remains available for recovery');
});
test('Workspace saves reject stale/duplicate requests and roll back revision, backups and log on failure',async()=>{
 const db=await createDB(),a=await workspaceIdentity(db,alice,undefined);
 const id=crypto.randomUUID();await write(db,a,personalData('First'),0,id);
 const before=await workspaceSession(db,a);
 await assert.rejects(write(db,a,personalData('Stale'),0),Conflict);
 await assert.rejects(write(db,a,personalData('Duplicate'),1,id),Conflict);
 db.failOn='INSERT INTO workspace_activity';await assert.rejects(write(db,a,personalData('Rollback'),1),/Injected/);db.failOn='';
 assert.deepEqual(await workspaceSession(db,a),before);
 const fraction={...before.data,goals:[{id:'g',name:'Test',target:1.001,saved:0,monthly:0}]};
 await assert.rejects(write(db,a,fraction,1),/ören/);
});
