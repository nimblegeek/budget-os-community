import {budgetSchema,emptyBudget,type Budget} from './budget';
import {digest,makeBackup} from './backup';
import {readBudget,assertUnique,Conflict} from './storage';
import type {Database,Statement} from './postgres';

export class AccessDenied extends Error {}
export type WorkspaceUser={userId:string;email:string;displayName:string};
export type WorkspaceAccess=WorkspaceUser&{workspaceId:string;workspaceName:string;role:'owner'|'viewer'};
export type WorkspaceChoice={id:string;name:string;role:'owner'|'viewer'};
const legacyId='legacy-household';
const readGuard="EXISTS(SELECT 1 FROM workspaces w WHERE w.id=? AND (w.owner_user_id=? OR EXISTS(SELECT 1 FROM workspace_members m WHERE m.workspace_id=w.id AND m.user_id=? AND m.role='viewer')))";
const ownerGuard="EXISTS(SELECT 1 FROM workspaces w WHERE w.id=? AND w.owner_user_id=?)";
const readArgs=(u:WorkspaceAccess)=>[u.workspaceId,u.userId,u.userId];
const ownerArgs=(u:WorkspaceAccess)=>[u.workspaceId,u.userId];
const writeGuard=ownerGuard+" AND EXISTS(SELECT 1 FROM workspace_budgets b WHERE b.workspace_id=? AND b.write_token=?)";

export async function listWorkspaces(db:Database,userId:string):Promise<WorkspaceChoice[]>{
 const result=await db.prepare("SELECT DISTINCT w.id,w.name,CASE WHEN w.owner_user_id=? THEN 'owner' ELSE 'viewer' END AS role FROM workspaces w LEFT JOIN workspace_members m ON m.workspace_id=w.id WHERE w.owner_user_id=? OR (m.user_id=? AND m.role='viewer') ORDER BY role,w.name,w.id").bind(userId,userId,userId).all<WorkspaceChoice>();
 return result.results;
}

/** Only a verified provider subject reaches this function. Never accepts an email/user ID from the client. */
export async function workspaceIdentity(db:Database,user:WorkspaceUser,legacyOwnerEmail:string|undefined,selected?:string|null):Promise<WorkspaceAccess>{
 let own=await db.prepare('SELECT id FROM workspaces WHERE owner_user_id=?').bind(user.userId).first<{id:string}>();
 if(!own){
  const legacyOwner=!!legacyOwnerEmail&&user.email===legacyOwnerEmail.trim().toLowerCase();
  let data:Budget=structuredClone(emptyBudget),revision=0,updatedAt=new Date().toISOString();
  if(legacyOwner){
   const binding=await db.prepare("SELECT user_id FROM members WHERE role='owner'").first<{user_id:string|null}>();
   if(binding?.user_id&&binding.user_id!==user.userId)throw new AccessDenied('Den äldre arbetsytans ägare stämmer inte.');
   const state=await readBudget(db);data=state.data;revision=state.revision;updatedAt=state.updatedAt||updatedAt;

  }
  assertUnique(data);
  const id=legacyOwner?legacyId:crypto.randomUUID(),token=crypto.randomUUID(),now=new Date().toISOString(),checksum=await digest(data);
  const statements:Statement[]=[
   db.prepare('INSERT INTO workspaces(id,owner_user_id,name,created_at) VALUES(?,?,?,?) ON CONFLICT(owner_user_id) DO NOTHING').bind(id,user.userId,user.displayName+' · ekonomi',now),
   db.prepare("INSERT OR IGNORE INTO workspace_members(workspace_id,email,user_id,role,created_at) SELECT id,?,?,'owner',? FROM workspaces WHERE owner_user_id=?").bind(user.email,user.userId,now,user.userId),
   db.prepare('INSERT OR IGNORE INTO workspace_budgets(workspace_id,payload,sha256,revision,updated_at,write_token) SELECT id,?,?,?,?,? FROM workspaces WHERE owner_user_id=?').bind(JSON.stringify(data),checksum,revision,updatedAt,token,user.userId),
  ];
  // This random token makes bootstrap idempotent even when two first requests race.
  const initial="EXISTS(SELECT 1 FROM workspace_budgets b JOIN workspaces w ON w.id=b.workspace_id WHERE b.workspace_id=? AND b.write_token=? AND w.owner_user_id=?)";
  if(legacyOwner){
   // Copy all legacy history inside PostgreSQL: no large round-trip or partial client-side seed.
   statements.push(
    db.prepare(`INSERT INTO workspace_backups(workspace_id,id,revision,created_at,reason,sha256,payload) SELECT ?,b.id,b.revision,b.created_at,b.reason,b.sha256,string_agg(c.payload,'' ORDER BY c.position) FROM budget_backups b LEFT JOIN backup_chunks c ON c.backup_id=b.id WHERE ${initial} GROUP BY b.id,b.revision,b.created_at,b.reason,b.sha256 ON CONFLICT DO NOTHING`).bind(id,id,token,user.userId),
    db.prepare(`INSERT INTO workspace_members(workspace_id,email,user_id,role,created_at) SELECT ?,email,user_id,role,created_at FROM members WHERE role='viewer' AND ${initial} ON CONFLICT DO NOTHING`).bind(id,id,token,user.userId),
    db.prepare(`INSERT INTO workspace_activity(workspace_id,id,actor,action,created_at) SELECT ?,id,actor,action,created_at FROM activity WHERE ${initial} ON CONFLICT DO NOTHING`).bind(id,id,token,user.userId),
   );
  }
  await db.batch(statements);
  own=await db.prepare('SELECT id FROM workspaces WHERE owner_user_id=?').bind(user.userId).first<{id:string}>();
 }
 if(!own)throw new AccessDenied();
 // Pending invitations can bind only to the verified primary email supplied by Clerk.
 await db.prepare("UPDATE workspace_members SET user_id=? WHERE email=? AND user_id IS NULL AND role='viewer'").bind(user.userId,user.email).all();
 const choices=await listWorkspaces(db,user.userId),choice=choices.find(w=>w.id===(selected||own.id));
 if(!choice)throw new AccessDenied('Du saknar behörighet till arbetsytan.');
 return {...user,workspaceId:choice.id,workspaceName:choice.name,role:choice.role};
}

export async function workspaceSession(db:Database,user:WorkspaceAccess){
 const result=await db.batch([
  db.prepare(`SELECT payload,sha256,revision,updated_at FROM workspace_budgets WHERE workspace_id=? AND ${readGuard}`).bind(user.workspaceId,...readArgs(user)),
  db.prepare(`SELECT actor,action,created_at FROM workspace_activity WHERE workspace_id=? AND ${readGuard} ORDER BY created_at DESC,id DESC LIMIT 30`).bind(user.workspaceId,...readArgs(user)),
  db.prepare(`SELECT email,role FROM workspace_members WHERE workspace_id=? AND role='viewer' AND ${ownerGuard} ORDER BY email`).bind(user.workspaceId,...ownerArgs(user)),
  db.prepare(`SELECT id,revision,created_at,reason FROM workspace_backups WHERE workspace_id=? AND ${ownerGuard} ORDER BY created_at DESC,id DESC LIMIT 20`).bind(user.workspaceId,...ownerArgs(user)),
 ]);
 const row=result[0].results[0];if(!row)throw new AccessDenied();
 const data=budgetSchema.parse(JSON.parse(String(row.payload)));if(await digest(data)!==row.sha256)throw Error('Budgetens kontrollsumma stämmer inte.');
 return {data,revision:Number(row.revision),updatedAt:String(row.updated_at),storage:'workspace' as const,activity:result[1].results,members:result[2].results,backups:result[3].results};
}
async function requireOwner(db:Database,user:WorkspaceAccess){
 if(user.role!=='owner'||!await db.prepare('SELECT id FROM workspaces WHERE id=? AND owner_user_id=?').bind(user.workspaceId,user.userId).first())throw new AccessDenied();
}
export async function writeWorkspaceBudget(db:Database,user:WorkspaceAccess,input:Budget,revision:number,requestId:string,action:string){
 await requireOwner(db,user);
 const data=budgetSchema.parse(input);assertUnique(data);
 const previous=await workspaceSession(db,user);
 if(previous.revision!==revision)throw new Conflict();
 const token=crypto.randomUUID(),now=new Date().toISOString(),backupId=crypto.randomUUID(),checksum=await digest(data),previousHash=await digest(previous.data);
 const args=[...ownerArgs(user),user.workspaceId,token];
 const results=await db.batch([
  db.prepare(`UPDATE workspace_budgets SET payload=?,sha256=?,revision=revision+1,updated_at=?,write_token=? WHERE workspace_id=? AND revision=? AND ${ownerGuard} AND NOT EXISTS(SELECT 1 FROM workspace_activity WHERE workspace_id=? AND id=?)`).bind(JSON.stringify(data),checksum,now,token,user.workspaceId,revision,...ownerArgs(user),user.workspaceId,requestId),
  db.prepare(`INSERT INTO workspace_backups(workspace_id,id,revision,created_at,reason,sha256,payload) SELECT ?,?,?,?,?,?,? WHERE ${writeGuard}`).bind(user.workspaceId,backupId,revision,now,action.startsWith('Återställde')?'Före återställning':'Före ändring',previousHash,JSON.stringify(previous.data),...args),
  db.prepare(`INSERT INTO workspace_activity(workspace_id,id,actor,action,created_at) SELECT ?,?,?,?,? WHERE ${writeGuard}`).bind(user.workspaceId,requestId,user.email,action.slice(0,160),now,...args),
 ]);
 if(!results[0].meta.changes)throw new Conflict();
 return {revision:revision+1,updatedAt:now};
}
export async function workspaceBackup(db:Database,user:WorkspaceAccess,id?:string|null){
 await requireOwner(db,user);
 if(!id)return makeBackup((await workspaceSession(db,user)).data);
 const row=await db.prepare(`SELECT payload,sha256 FROM workspace_backups WHERE workspace_id=? AND id=? AND ${ownerGuard}`).bind(user.workspaceId,id,...ownerArgs(user)).first<{payload:string;sha256:string}>();
 if(!row)return null;
 const data=budgetSchema.parse(JSON.parse(row.payload));if(await digest(data)!==row.sha256)throw Error('Säkerhetskopians kontrollsumma stämmer inte.');
 return makeBackup(data);
}
export async function manageWorkspaceViewer(db:Database,user:WorkspaceAccess,email:string,remove=false){
 await requireOwner(db,user);
 const normalized=email.trim().toLowerCase();
 if(normalized.length>200||!/^\S+@\S+\.\S+$/.test(normalized)||normalized===user.email)throw Error('Ange en annan giltig e-postadress.');
 const now=new Date().toISOString();
 await db.batch([
  remove?db.prepare(`DELETE FROM workspace_members WHERE workspace_id=? AND email=? AND role='viewer' AND ${ownerGuard}`).bind(user.workspaceId,normalized,...ownerArgs(user)):
   db.prepare(`INSERT OR IGNORE INTO workspace_members(workspace_id,email,role,created_at) SELECT ?,?,'viewer',? WHERE ${ownerGuard}`).bind(user.workspaceId,normalized,now,...ownerArgs(user)),
  db.prepare(`INSERT INTO workspace_activity(workspace_id,id,actor,action,created_at) SELECT ?,?,?,?,? WHERE ${ownerGuard}`).bind(user.workspaceId,crypto.randomUUID(),user.email,(remove?'Återkallad':'Förberedd')+' läsbehörighet: '+normalized,now,...ownerArgs(user)),
 ]);
}
