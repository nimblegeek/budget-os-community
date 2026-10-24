// Only resolved by tests/local-preview/next.config.mjs.
// Never reads DATABASE_URL, Clerk credentials or the production database.
import {PGlite} from '@electric-sql/pglite';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {headers} from 'next/headers';
import {Database} from '../../lib/postgres';
import {migrateBudget} from '../../lib/storage';
import {workspaceIdentity} from '../../lib/workspaces';
import {seedBudget} from './seed';
import {localHost,localOrigin} from './guard';

const state=globalThis as typeof globalThis & {budgetLocalDB?:Database;budgetLocalReady?:Promise<void>};
async function initialize(){
 if(process.env.NODE_ENV!=='development')throw Error('Local test environment only');
 if(!state.budgetLocalReady)state.budgetLocalReady=(async()=>{
  const cwd=resolve(process.cwd());
  const root=cwd.endsWith('/tests/local-preview')?cwd:resolve(cwd,'tests/local-preview');
  if(!root.endsWith('/tests/local-preview'))throw Error('Unexpected local working directory');
  mkdirSync(resolve(root,'.data'),{recursive:true});
  const pg=new PGlite(resolve(root,'.data/postgres'));
  await pg.waitReady;
  const existing=await pg.query<{name:string|null}>("SELECT to_regclass('public.budgets') AS name");
  if(!existing.rows[0]?.name){
   await pg.exec(readFileSync(resolve(root,'../../db/postgres.sql'),'utf8'));
   await pg.query('INSERT INTO budgets VALUES($1,$2,$3,$4)',['household',JSON.stringify(seedBudget()),1,new Date().toISOString()]);
  }
  const sources=await pg.query<{name:string|null}>("SELECT to_regclass('public.income_sources') AS name");
  if(!sources.rows[0]?.name)await pg.transaction(tx=>tx.exec(readFileSync(resolve(root,'../../db/002-income-sources.sql'),'utf8')));
  const workspaces=await pg.query<{name:string|null}>("SELECT to_regclass('public.workspaces') AS name");
  if(!workspaces.rows[0]?.name)await pg.transaction(tx=>tx.exec(readFileSync(resolve(root,'../../db/003-workspaces.sql'),'utf8')));
  const cashBalances=await pg.query<{name:string|null}>("SELECT to_regclass('public.cash_balance_anchors') AS name");
  if(!cashBalances.rows[0]?.name)await pg.transaction(tx=>tx.exec(readFileSync(resolve(root,'../../db/004-cash-balances.sql'),'utf8')));
  const db=new Database(queries=>pg.transaction(async tx=>{
   const results=[];
   for(const q of queries){const r=await tx.query<Record<string,unknown>>(q.text,q.values);results.push({results:r.rows,meta:{changes:r.affectedRows??0}});}
   return results;
  }));
  await migrateBudget(db);
  state.budgetLocalDB=db;
 })().catch(error=>{delete state.budgetLocalReady;console.error('Local test database:',error instanceof Error?error.message:'Initialization failed');throw error;});
 await state.budgetLocalReady;
}
export function database(){if(!state.budgetLocalDB)throw Error('Local database not initialized');return state.budgetLocalDB;}
export async function identity(){
 if(process.env.NODE_ENV!=='development'||!localHost((await headers()).get('host')))return null;
 await initialize();
 const h=await headers(),second=h.get('x-local-test-user')==='second';
 return workspaceIdentity(database(),second?{userId:'local-second-user',email:'second@example.invalid',displayName:'Andra testkontot'}:{userId:'local-test-owner',email:'owner@example.invalid',displayName:'Lokalt testkonto'},'owner@example.invalid',h.get('x-workspace-id'));
}
export function json(body:unknown,status=200){return Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
export function sameOrigin(request:Request){return localOrigin(request.headers.get('origin'),request.headers.get('host'));}
