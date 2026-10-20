import { database, identity, json } from '@/lib/server';
import {workspaceBackup,AccessDenied} from '@/lib/workspaces';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  try {
    const user=await identity();
    if(user?.role!=='owner') return json({error:'Endast ägaren kan hämta säkerhetskopior.'},403);
    const id=new URL(request.url).searchParams.get('id');
    if(id&&!/^[a-zA-Z0-9-]{10,80}$/.test(id)) return json({error:'Ogiltigt kopie-ID.'},400);
    const backup=await workspaceBackup(database(),user,id);
    if(!backup) return json({error:'Säkerhetskopian finns inte.'},404);
    const response=json(backup);
    response.headers.set('Content-Disposition',`attachment; filename="budget-os-${new Date().toISOString().slice(0,10)}.json"`);
    return response;
  } catch(e) { if(e instanceof AccessDenied)return json({error:'Du saknar behörighet till arbetsytan.'},403);return json({error:'Kunde inte läsa eller verifiera säkerhetskopian.'},503); }
}
