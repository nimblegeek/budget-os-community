import { database, identity, json, sameOrigin } from '@/lib/server';
import { budgetSchema } from '@/lib/budget';
import {Conflict} from '@/lib/storage';
import {workspaceSession,writeWorkspaceBudget,listWorkspaces,AccessDenied} from '@/lib/workspaces';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const user=await identity();
    if(!user) return json({error:'Logga in med ett konto som har behörighet.'},403);
    const db=database(),state=await workspaceSession(db,user);
    return json({...state,user:{name:user.displayName,email:user.email,role:user.role},workspace:{id:user.workspaceId,name:user.workspaceName,role:user.role},workspaces:await listWorkspaces(db,user.userId)});
  } catch(e) { if(e instanceof AccessDenied)return json({error:'Du saknar behörighet till arbetsytan.'},403);return json({error:'Kunde inte läsa budgeten. Försök igen.'},503); }
}
export async function POST(request:Request) {
  if(!sameOrigin(request)) return json({error:'Otillåtet ursprung.'},403);
  try {
    const user=await identity();
    if(user?.role!=='owner') return json({error:'Endast ägaren kan ändra budgeten.'},403);
    const raw=await request.text();
    if(new TextEncoder().encode(raw).length>4_000_000) return json({error:'Importen är för stor.'},413);
    const body=JSON.parse(raw),parsed=budgetSchema.safeParse(body.data);
    if(!parsed.success||!Number.isInteger(body.revision)||body.revision<0||typeof body.requestId!=='string'||!/^[a-zA-Z0-9-]{10,80}$/.test(body.requestId)) return json({error:'Ogiltiga uppgifter. Kontrollera belopp och datum.'},400);
    const result=await writeWorkspaceBudget(database(),user,parsed.data,body.revision,body.requestId,String(body.action||'Budget uppdaterad'));
    return json({...result,backups:(await workspaceSession(database(),user)).backups});
  } catch(e) {
    if(e instanceof AccessDenied)return json({error:'Du saknar behörighet till arbetsytan.'},403);
    if(e instanceof Conflict) return json({error:'Budgeten har ändrats eller sparats i en annan session. Ladda om innan du sparar igen.'},409);
    return json({error:'Kunde inte spara. Kontrollera senaste status innan du försöker igen.'},503);
  }
}
