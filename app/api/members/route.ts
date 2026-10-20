import {database,identity,json,sameOrigin} from '@/lib/server';
import {manageWorkspaceViewer,AccessDenied} from '@/lib/workspaces';
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Otillåtet ursprung.'},403);
 try{
  const user=await identity();if(user?.role!=='owner')return json({error:'Endast ägaren kan hantera läsbehörighet.'},403);
  const {email,remove}=await request.json() as {email?:unknown;remove?:unknown};
  if(typeof email!=='string'||email.length>200||!/^\S+@\S+\.\S+$/.test(email.trim())||email.trim().toLowerCase()===user.email||(remove!==undefined&&typeof remove!=='boolean'))return json({error:'Ange en annan giltig e-postadress.'},400);
  await manageWorkspaceViewer(database(),user,email,remove===true);
  return json({ok:true});
 }catch(e){if(e instanceof AccessDenied)return json({error:'Du saknar behörighet till arbetsytan.'},403);return json({error:'Kunde inte uppdatera behörigheten.'},503);}
}
