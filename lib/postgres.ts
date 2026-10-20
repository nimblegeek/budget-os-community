import { neon } from '@neondatabase/serverless';
import {Pool} from 'pg';
export type Query={text:string;values:unknown[]};
export type Result<T=Record<string,unknown>>={results:T[];meta:{changes:number}};
export type Executor=(queries:Query[])=>Promise<Result[]>;
// Only trusted, static application SQL reaches this adapter. Values stay bound.
export function compileQuery(text:string,values:unknown[]):Query {
 let i=0;
 const ignore=/^INSERT OR IGNORE INTO /.test(text);
 text=text.replace(/^INSERT OR IGNORE INTO /,'INSERT INTO ').replace(/\?/g,()=>`$${++i}`);
 if(i!==values.length)throw Error('SQL parameter mismatch');
 if(ignore)text+=' ON CONFLICT DO NOTHING';
 return {text,values};
}
export class Statement {
 constructor(readonly db:Database,readonly text:string,readonly values:unknown[]=[]){ }
 bind(...values:unknown[]){return new Statement(this.db,this.text,values);}
 async all<T=Record<string,unknown>>(){return (await this.db.batch<T>([this]))[0];}
 async first<T=Record<string,unknown>>(){return (await this.all<T>()).results[0]??null;}
}
export class Database {
 constructor(private execute:Executor){}
 prepare(text:string){return new Statement(this,text);}
 async batch<T=Record<string,unknown>>(statements:Statement[]):Promise<Result<T>[]>{
  if(statements.some(s=>s.db!==this))throw Error('Mixed database transaction');
  return await this.execute(statements.map(s=>compileQuery(s.text,s.values))) as Result<T>[];
 }
}
let singleton:Database|undefined;
export function postgresDatabase(){
 if(singleton)return singleton;
 const url=process.env.DATABASE_URL;if(!url)throw Error('Database is not configured');
 if(process.env.DATABASE_DRIVER==='pg'){
  const pool=new Pool({connectionString:url,max:5,connectionTimeoutMillis:10_000,idleTimeoutMillis:30_000,allowExitOnIdle:true});
  singleton=new Database(async queries=>{
   const client=await pool.connect();
   try{
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    const results=[];
    for(const query of queries){const result=await client.query(query.text,query.values);results.push({results:result.rows,meta:{changes:result.rowCount??0}});}
    await client.query('COMMIT');return results;
   }catch(error){await client.query('ROLLBACK');throw error;}
   finally{client.release();}
  });
  return singleton;
 }
 const sql=neon(url);
 singleton=new Database(async queries=>{
  const result=await sql.transaction(queries.map(q=>sql.query(q.text,q.values)),{fullResults:true,isolationLevel:'RepeatableRead'});
  return result.map(r=>({results:r.rows,meta:{changes:r.rowCount??0}}));
 });
 return singleton;
}
