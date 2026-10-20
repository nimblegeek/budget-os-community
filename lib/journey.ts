import { z } from 'zod';
const money=z.number().finite().min(0).max(100_000_000).refine(x=>Math.round(x*100)/100===x,'Ange hela ören.');
export const debtHistorySchema=z.array(z.object({
  date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(x=>{const d=new Date(x+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===x;},'Ogiltigt datum.'),
  balances:z.array(z.object({id:z.string().min(1).max(180),balance:money,verified:z.boolean()})).max(100).refine(a=>new Set(a.map(x=>x.id)).size===a.length,'Dubbla lån.'),
})).max(500).refine(a=>new Set(a.map(x=>x.date)).size===a.length,'Dubbla avstämningsdatum.')
  .refine(a=>a.every((x,i)=>i===0||a[i-1].date<x.date),'Avstämningar ska vara sorterade efter datum.');
export type DebtSnapshot=z.infer<typeof debtHistorySchema>[number];

export function historyFor(history:DebtSnapshot[],ids:string[]){
  // Compare a fixed set of IDs. A removed/new loan must not masquerade as repayment.
  return history.filter(h=>ids.length&&ids.every(id=>h.balances.some(x=>x.id===id)))
    .sort((a,b)=>a.date.localeCompare(b.date)).map(h=>({date:h.date,
      balance:Math.round(h.balances.filter(x=>ids.includes(x.id)).reduce((s,x)=>s+x.balance,0)*100)/100,
      verified:h.balances.filter(x=>ids.includes(x.id)).every(x=>x.verified)}));
}
