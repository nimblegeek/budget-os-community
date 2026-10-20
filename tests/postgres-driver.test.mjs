// Optional integration check. Only a disposable loopback PostgreSQL is accepted.
import test from 'node:test';
import assert from 'node:assert/strict';
import {postgresDatabase} from '../lib/postgres.ts';
import {workspaceIdentity,workspaceSession,writeWorkspaceBudget,AccessDenied} from '../lib/workspaces.ts';
const url=new URL(process.env.DATABASE_URL||'postgresql://invalid');
if(process.env.DATABASE_DRIVER!=='pg'||!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Use only an explicitly configured disposable loopback PostgreSQL.');
test('TCP PostgreSQL driver preserves transaction isolation, tenant boundaries and rollback',async()=>{
 const db=postgresDatabase(),suffix=crypto.randomUUID();
 const a=await workspaceIdentity(db,{userId:'pg-a-'+suffix,email:'a-'+suffix+'@example.invalid',displayName:'Synthetic A'},undefined);
 const b=await workspaceIdentity(db,{userId:'pg-b-'+suffix,email:'b-'+suffix+'@example.invalid',displayName:'Synthetic B'},undefined);
 const original=await workspaceSession(db,a);
 const changed={...original.data,notes:'Synthetic TCP driver test'};
 const outcomes=await Promise.allSettled([writeWorkspaceBudget(db,a,changed,0,crypto.randomUUID(),'Concurrent A'),writeWorkspaceBudget(db,a,{...changed,notes:'Other concurrent edit'},0,crypto.randomUUID(),'Concurrent B')]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 assert.equal((await workspaceSession(db,a)).revision,1);assert.equal((await workspaceSession(db,b)).revision,0);
 await assert.rejects(workspaceSession(db,{...b,workspaceId:a.workspaceId,role:'owner'}),AccessDenied);
 const before=await db.prepare('SELECT name FROM workspaces WHERE id=?').bind(a.workspaceId).first();
 await assert.rejects(db.batch([db.prepare('UPDATE workspaces SET name=? WHERE id=?').bind('Must roll back',a.workspaceId),db.prepare('SELECT missing_budget_test_function()')]));
 assert.deepEqual(await db.prepare('SELECT name FROM workspaces WHERE id=?').bind(a.workspaceId).first(),before);
});
