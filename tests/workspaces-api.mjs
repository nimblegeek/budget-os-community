// Run only against the isolated synthetic-data fixture: npm run dev:local.
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3010';
async function call(path,{user='first',workspace,method='GET',body,origin=base}={}){
 const headers={'X-Local-Test-User':user,'Content-Type':'application/json'};
 if(workspace)headers['X-Workspace-Id']=workspace;
 if(method!=='GET')headers.Origin=origin;
 const response=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined});
 const text=await response.text();let data;try{data=JSON.parse(text)}catch{data={error:text}}
 return {status:response.status,data};
}
const first=await call('/api/budget'),second=await call('/api/budget',{user:'second'});
assert.equal(first.status,200);assert.equal(second.status,200);
assert.notEqual(first.data.workspace.id,second.data.workspace.id);
assert.equal(second.data.user.role,'owner');
const a=first.data.workspace.id,b=second.data.workspace.id,original=second.data.data;
assert.equal((await call('/api/budget',{user:'second',workspace:a})).status,403);
assert.equal((await call('/api/backup',{user:'second',workspace:a})).status,403);
assert.equal((await call('/api/budget',{user:'first',workspace:b})).status,403);
assert.equal((await call('/api/budget',{method:'POST',origin:'https://untrusted.invalid',body:{}})).status,403);
assert.equal((await call('/api/budget',{user:'second',workspace:a,method:'POST',body:{data:original,revision:0,requestId:crypto.randomUUID()}})).status,403);
assert.equal((await call('/api/members',{user:'second',workspace:a,method:'POST',body:{email:'nobody@example.invalid'}})).status,403);
// Exercise actual HTTP CAS, snapshots and restore only in the second synthetic account.
const save=await call('/api/budget',{user:'second',workspace:b,method:'POST',body:{data:{...original,notes:'Synthetic workspace API test'},revision:second.data.revision,requestId:crypto.randomUUID(),action:'Synthetic isolated test'}});
assert.equal(save.status,200);
assert.deepEqual((await call('/api/budget')).data.data,first.data.data,'First account never changes');
const current=await call('/api/budget',{user:'second'}),copy=current.data.backups[0].id;
assert.equal((await call('/api/backup?id='+copy,{workspace:a})).status,404);
assert.equal((await call('/api/backup?id='+copy,{user:'second',workspace:b})).status,200);
const invite=await call('/api/members',{workspace:a,method:'POST',body:{email:'second@example.invalid'}});assert.equal(invite.status,200);
const shared=await call('/api/budget',{user:'second',workspace:a});assert.equal(shared.status,200);assert.equal(shared.data.user.role,'viewer');
assert.equal((await call('/api/budget',{user:'second'})).data.workspace.id,b);
assert.equal((await call('/api/backup',{user:'second',workspace:a})).status,403);
assert.equal((await call('/api/budget',{user:'second',workspace:a,method:'POST',body:{}})).status,403);
assert.equal((await call('/api/members',{workspace:a,method:'POST',body:{email:'second@example.invalid',remove:true}})).status,200);
assert.equal((await call('/api/budget',{user:'second',workspace:a})).status,403);
const restored=await call('/api/budget',{user:'second',workspace:b,method:'POST',body:{data:original,revision:current.data.revision,requestId:crypto.randomUUID(),action:'Återställde syntetiskt test'}});
assert.equal(restored.status,200);
assert.deepEqual((await call('/api/budget',{user:'second'})).data.data,original);
console.log('PASS: two-user HTTP isolation, guessed workspace/backup IDs, CSRF, own writes, backups, scoped invitations, read-only access, revocation and restore.');
