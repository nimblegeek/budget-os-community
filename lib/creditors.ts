import { z } from 'zod';
const text = z.string().max(3000);
const id = z.string().min(1).max(180);
const date = z.string().refine(v=>v===''||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v),'Ange ett giltigt datum.');
export const activityTypes=['Förhandla ränta','Avbetalningsplan','Anstånd','Uppskov','Betalningspaus','Övrigt'] as const;
export const activityStatuses=['Planerad','Skickad','Väntar på svar','Godkänd','Avslagen','Avslutad'] as const;
export const caseSchema=z.object({id,name:z.string().trim().min(1).max(180),debtId:z.string().max(180),contact:z.string().max(180),email:z.union([z.literal(''),z.string().email().max(180)]),phone:z.string().max(100),reference:z.string().max(180),contactSource:z.string().max(500),notes:text,archived:z.boolean()});
export const activitySchema=z.object({id,caseId:id,type:z.enum(activityTypes),status:z.enum(activityStatuses),channel:z.enum(['Telefon','E-post','Brev','Mina sidor','Möte','Annat']),date,nextDate:date,requested:text,agreed:text,confirmation:text,from:date,to:date,notes:text}).superRefine((v,ctx)=>{
  if(v.from&&v.to&&v.from>v.to)ctx.addIssue({code:'custom',path:['to'],message:'Slutdatum måste vara efter startdatum.'});
  if(v.status==='Godkänd'){
    if(!v.agreed.trim()||!v.confirmation.trim())ctx.addIssue({code:'custom',path:['confirmation'],message:'Ange överenskomna villkor och borgenärens bekräftelse innan status sätts till Godkänd.'});
    if(isPause(v.type)&&(!v.from||!v.to))ctx.addIssue({code:'custom',path:['from'],message:'Ange start- och slutdatum för godkänt anstånd, uppskov eller betalningspaus.'});
  }
});
export const creditorWorkSchema=z.object({cases:z.array(caseSchema).max(100),activities:z.array(activitySchema).max(1000)}).superRefine((v,ctx)=>{
  const ids=new Set(v.cases.map(c=>c.id));
  if(ids.size!==v.cases.length||new Set(v.activities.map(a=>a.id)).size!==v.activities.length)ctx.addIssue({code:'custom',message:'Dubbla ärende- eller aktivitets-ID.'});
  if(v.activities.some(a=>!ids.has(a.caseId)))ctx.addIssue({code:'custom',message:'Aktiviteten måste tillhöra ett befintligt ärende.'});
});
export type CreditorCase=z.infer<typeof caseSchema>;
export type CreditorActivity=z.infer<typeof activitySchema>;
export const isPause=(type:string)=>['Anstånd','Uppskov','Betalningspaus'].includes(type);
export function pauseState(a:CreditorActivity,today:string){
  if(!isPause(a.type)||a.status!=='Godkänd')return null;
  if(!a.from||!a.to)return null;
  return today<a.from?'Kommande period':today>a.to?'Perioden har löpt ut':'Inom överenskommen period';
}
export function needsFollowup(a:CreditorActivity,today:string){return !!a.nextDate&&a.nextDate<=today&&!['Avslagen','Avslutad'].includes(a.status);}
export function contactDraft(c:CreditorCase,a:CreditorActivity){
  return `Ämne: Förfrågan om ${a.type.toLocaleLowerCase('sv-SE')}${c.reference?' – '+c.reference:''}\n\nHej ${c.contact||c.name},\n\nJag vill diskutera ${a.type.toLocaleLowerCase('sv-SE')} för mitt ärende${c.reference?' '+c.reference:''}.\n\n${a.requested.trim()||'[Beskriv vad du vill be om och vad som är möjligt i din budget.]'}${a.from||a.to?'\n\nÖnskad period: '+(a.from||'[startdatum]')+' – '+(a.to||'[slutdatum]')+'.':''}\n\nKan ni återkomma med vilka alternativ ni kan erbjuda? Jag önskar skriftlig information om ränta och avgifter, betalningsbelopp, förfallodatum, eventuell ändrad löptid och den totala kostnaden. Vid uppskov eller paus: ange även vad som gäller under perioden och när betalningarna ska återupptas.\n\nDetta är en förfrågan, inte en bekräftelse på ändrade villkor. Vänligen bekräfta en eventuell överenskommelse skriftligt.\n\nVänliga hälsningar\n[Ditt namn]`;
}
