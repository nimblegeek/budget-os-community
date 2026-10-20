import { json } from '@/lib/server';
// Schema migrations are deployment-only, never a public HTTP capability.
export async function POST(){return json({error:'Databasmigrering körs endast av administratören vid driftsättning.'},403);}
