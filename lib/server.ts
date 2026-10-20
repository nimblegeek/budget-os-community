import {currentUser} from '@clerk/nextjs/server';
import {headers} from 'next/headers';
import {postgresDatabase} from './postgres';
import {verifiedEmail} from './access';
import {workspaceIdentity,AccessDenied} from './workspaces';
export const database=postgresDatabase;
export async function identity(){
 const user=await currentUser();if(!user)return null;
 const email=verifiedEmail(user);if(!email)return null;
 const selected=(await headers()).get('x-workspace-id');
 try{return await workspaceIdentity(database(),{userId:user.id,email,displayName:user.fullName||email},process.env.BUDGET_OWNER_EMAIL,selected);}
 catch(error){if(error instanceof AccessDenied)return null;throw error;}
}
export function json(body:unknown,status=200){return Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie, X-Workspace-Id'}});}
export function sameOrigin(request:Request){return request.headers.get('origin')===new URL(process.env.APP_URL||request.url).origin;}
