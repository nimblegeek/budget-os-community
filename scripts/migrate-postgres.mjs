import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {Pool} from 'pg';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL missing');
const pool=process.env.DATABASE_DRIVER==='pg'?new Pool({connectionString:process.env.DATABASE_URL,max:1}):null;
const sql=pool?null:neon(process.env.DATABASE_URL);
const query=async(text,values=[])=>pool?(await pool.query(text,values)).rows:sql.query(text,values);
async function transaction(statements){
 if(!pool){await sql.transaction(statements.map(q=>sql.query(q.text,q.values)));return;}
 const client=await pool.connect();
 try{await client.query('BEGIN');for(const q of statements)await client.query(q.text,q.values);await client.query('COMMIT');}
 catch(error){await client.query('ROLLBACK');throw error;}
 finally{client.release();}
}
try{
 await query('CREATE TABLE IF NOT EXISTS schema_migrations(id text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
 for(const [id,file] of [['001-budget-os','postgres.sql'],['002-income-sources','002-income-sources.sql'],['003-workspaces','003-workspaces.sql'],['004-cash-balances','004-cash-balances.sql']]){
  const ddl=readFileSync(new URL('../db/'+file,import.meta.url),'utf8'),hash=createHash('sha256').update(ddl).digest('hex');
  const existing=await query('SELECT sha256 FROM schema_migrations WHERE id=$1',[id]);
  if(existing.length){if(existing[0].sha256!==hash)throw Error('Migration checksum mismatch: '+id);console.log(id+': schema verified');continue;}
  await transaction([...ddl.split(';').map(s=>s.trim()).filter(Boolean).map(text=>({text,values:[]})),{text:'INSERT INTO schema_migrations(id,sha256) VALUES($1,$2)',values:[id,hash]}]);
  console.log(id+': applied atomically; existing budget records preserved.');
 }
}finally{await pool?.end();}
