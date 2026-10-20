'use client';
import {useState} from 'react';
import {ChevronDown,RotateCcw} from 'lucide-react';
import {type Budget,kr,sum} from '../lib/budget';
import {isPriorityExpense} from '../lib/priorities';
import {budgetCostGroups,presetCostIds,selectedCostTotals,type CostPreset} from '../lib/cost-selection';
function Checkbox({checked,partial=false,label,onChange}:{checked:boolean;partial?:boolean;label:string;onChange:(checked:boolean)=>void}){
 return <input type="checkbox" aria-label={label} checked={checked} aria-checked={partial?'mixed':checked} ref={node=>{if(node)node.indeterminate=partial}} onChange={event=>onChange(event.target.checked)}/>;
}
export default function BudgetCostPicker({data}:{data:Budget}){
 const [excluded,setExcluded]=useState<string[]>([]),[open,setOpen]=useState<string[]>([]);
 const result=selectedCostTotals(data,excluded),groups=budgetCostGroups(data.expenses);
 function choose(ids:string[],include:boolean){setExcluded(current=>include?current.filter(id=>!ids.includes(id)):[...new Set([...current,...ids])])}
 function preset(value:CostPreset){const ids=presetCostIds(data.expenses,value);setExcluded(result.eligible.filter(e=>!ids.includes(e.id)).map(e=>e.id))}
 const selections:[CostPreset,string][]=[['all','Alla'],['priority','Prioriterade'],['credit','Krediter'],['none','Inga']];
 return <section className="cost-picker" aria-label="Välj och jämför budgetkostnader">
  <header><div><span className="cost-picker-kicker">Jämförelseläge · inget sparas</span><h2>Vad ska få plats?</h2></div><button className="cost-picker-reset" onClick={()=>preset('all')} aria-label="Återställ kostnadsurval"><RotateCcw size={15}/></button></header>
  <p className="cost-picker-help">Pricka i kostnader. Se vad som blir kvar av din planerade inkomst.</p>
  {!result.eligible.length?<p className="cost-picker-help">Lägg till månadskostnader under Din budget för att jämföra dem här.</p>:<>
   <div className="cost-picker-presets" role="group" aria-label="Snabbval för budgetkostnader">{selections.map(([key,label])=>{const ids=presetCostIds(data.expenses,key),pressed=result.selected.length===ids.length&&result.selected.every(e=>ids.includes(e.id));return <button key={key} aria-pressed={pressed} onClick={()=>preset(key)}><span>{label}</span><small>{kr(sum(result.eligible.filter(e=>ids.includes(e.id)).map(e=>e.amount)))}</small></button>})}</div>
   <div className="cost-picker-result" aria-live="polite" aria-atomic="true"><div><span>Valda kostnader / mån</span><strong>{kr(result.cost,2)}</strong><small>{result.selected.length} av {result.eligible.length} poster</small></div><div><span>Kvar enligt urval</span><strong className={result.remaining<0?'negative':''}>{kr(result.remaining,2)}</strong><small>Planerad inkomst {kr(result.income)}</small></div></div>
   <div className="cost-picker-comparison"><div><span>Hela planen</span><strong>{kr(result.fullRemaining)} kvar</strong></div><div><span>Skillnad mot hela planen</span><strong>{result.difference>0?'+':''}{kr(result.difference)}</strong></div><div className="cost-picker-track" role="img" aria-label={`${kr(result.cost,2)} valda kostnader av ${kr(result.fullCost,2)} i hela planen`}><i style={{width:(result.fullCost?Math.min(100,result.cost/result.fullCost*100):0)+'%'}}/></div></div>
   <div className="cost-picker-groups">{groups.map(group=>{const ids=group.items.map(e=>e.id),selected=group.items.filter(e=>!excluded.includes(e.id)),total=sum(group.items.map(e=>e.amount)),amount=sum(selected.map(e=>e.amount)),expanded=open.includes(group.key);return <div className="cost-picker-group" key={group.key}><div className="cost-picker-group-head"><label><Checkbox label={`Ta med kategorin ${group.label}`} checked={selected.length===ids.length} partial={selected.length>0&&selected.length<ids.length} onChange={include=>choose(ids,include)}/><span>{group.label}<small>{selected.length} av {ids.length} valda</small></span><strong>{kr(amount)}<small>av {kr(total)}</small></strong></label><button aria-label={`Visa poster i ${group.label}`} aria-expanded={expanded} onClick={()=>setOpen(current=>expanded?current.filter(key=>key!==group.key):[...current,group.key])}><ChevronDown size={17}/></button></div>{expanded&&<div className="cost-picker-items">{group.items.map(item=><label key={item.id}><Checkbox label={`Ta med kostnaden ${item.name}`} checked={!excluded.includes(item.id)} onChange={include=>choose([item.id],include)}/><span>{item.name}{isPriorityExpense(item)&&<small>Prioriterad</small>}</span><strong>{kr(item.amount,2)}</strong></label>)}</div>}</div>})}</div>
  </>}
  <p className="cost-picker-help cost-picker-boundary">Bara en jämförelse av månadsplanen. Bortvalda räkningar försvinner inte. Transaktionerna och det faktiska kvar-beloppet överst på sidan påverkas inte.</p>
  <details className="cost-picker-method"><summary>Så grupperas kostnaderna</summary><p>Kategorier föreslås utifrån posternas namn; okända namn hamnar i Övriga kostnader. Prioriterade följer dina prioriteringsmarkeringar. Bolån sorteras under Boende. Krediter räknas från budgetposterna — lånelistans betalningar läggs inte till igen. Poster markerade Räknas inte med i budgeten och sparplanen ingår inte i kalkylen. Urvalet nollställs när du lämnar sidan.</p></details>
 </section>;
}
