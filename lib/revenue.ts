import type { Budget } from './budget';
import { periodSummary, type DateRange } from './date-range';

export type RevenueGrouping = 'type' | 'channel' | 'source';
export type RevenueGroup = { id:string; label:string; amount:number; count:number; share:number|null; color:string };
export const revenueColors=['#9ed3ac','#7bbdbb','#9eafe3','#d7b381','#c69fbd','#b9c879','#8dabc2','#a5a6ae'];
export function revenueSummary(data:Budget,range:DateRange,grouping:RevenueGrouping='type'){
 const sources=new Map((data.revenueSources||[]).map(x=>[x.id,x]));
 const rows=periodSummary(data.transactions,range).transactions.filter(x=>x.kind==='income');
 const grouped=new Map<string,{label:string;cents:number;count:number}>();
 for(const tx of rows){
  const source=tx.incomeSourceId?sources.get(tx.incomeSourceId):undefined;
  const label=!source?'Ej kopplade':grouping==='type'?source.type:grouping==='channel'?(source.channel||'Ingen plattform'):source.name;
  const id=!source?'unassigned':grouping==='source'?source.id:grouping+':'+label;
  const group=grouped.get(id)||{label,cents:0,count:0};
  group.cents+=Math.round(tx.amount*100);group.count++;grouped.set(id,group);
 }
 const total=rows.reduce((n,tx)=>n+Math.round(tx.amount*100),0)/100;
 const groups:RevenueGroup[]=[...grouped].map(([id,g])=>({id,label:g.label,amount:g.cents/100,count:g.count,share:null,color:''})).sort((a,b)=>b.amount-a.amount||a.label.localeCompare(b.label,'sv'));
 const hasNegative=groups.some(x=>x.amount<0);
 groups.forEach((g,i)=>{g.color=revenueColors[i%revenueColors.length];g.share=!hasNegative&&total>0?g.amount/total*100:null;});
 const sourceStats=(data.revenueSources||[]).map(source=>{
  const payments=rows.filter(tx=>tx.incomeSourceId===source.id);
  return {...source,amount:payments.reduce((n,tx)=>n+Math.round(tx.amount*100),0)/100,count:payments.length};
 });
 return {rows,total,groups,hasNegative,sourceStats,unassigned:rows.filter(tx=>!tx.incomeSourceId)};
}
export function assignIncomeSources(data:Budget,ids:string[],sourceId:string|null):Budget{
 const chosen=new Set(ids);
 if(sourceId&&!(data.revenueSources||[]).some(s=>s.id===sourceId&&!s.archived))throw Error('Välj en aktiv intäktskälla.');
 if([...chosen].some(id=>!data.transactions.some(tx=>tx.id===id&&tx.kind==='income')))throw Error('Välj bara befintliga inbetalningar.');
 return {...data,transactions:data.transactions.map(tx=>{
  if(!chosen.has(tx.id))return tx;
  const {incomeSourceId,...rest}=tx;
  return sourceId?{...rest,incomeSourceId:sourceId}:rest;
 })};
}
export function shareGroups(groups:RevenueGroup[]):RevenueGroup[]{
 if(groups.length<=8)return groups;
 const rest=groups.slice(7);
 return [...groups.slice(0,7),{id:'other',label:'Övriga grupper',amount:rest.reduce((n,g)=>n+Math.round(g.amount*100),0)/100,count:rest.reduce((n,g)=>n+g.count,0),share:rest.some(g=>g.share===null)?null:rest.reduce((n,g)=>n+(g.share||0),0),color:revenueColors[7]}];
}
