import { json } from '@/lib/server';
// Initial seeding is retired. Restore is authenticated and revision-checked.
export async function POST() { return json({error:'Förstagångsimporten är stängd. Använd ägarens säkerhetskopieimport.'},403); }
