'use client';
import {useState} from 'react';
import {ChevronDown,RotateCcw} from 'lucide-react';
import {type Budget,kr,sum} from '../lib/budget';
import {isPriorityExpense} from '../lib/priorities';
import {budgetCostGroups,presetCostIds,selectedCostTotals,type CostPreset} from '../lib/cost-selection';
import BudgetScenarios from './budget-scenarios';
import {scenarioBudget,scenarioPreview,type ScenarioAmounts} from '../lib/budget-scenarios';
import {withDebtPayments} from '../lib/debt-summary';
function Checkbox({checked,partial=false,label,onChange,disabled=false}:{checked:boolean;partial?:boolean;label:string;onChange:(checked:boolean)=>void;disabled?:boolean}){
 return <input type="checkbox" aria-label={label} disabled={disabled} checked={checked} aria-checked={partial?'mixed':checked} ref={node=>{if(node)node.indeterminate=partial}} onChange={event=>onChange(event.target.checked)}/>;
}
type Props={data:Budget;editable?:boolean;busy?:boolean;persist?:(data:Budget,action:string)=>Promise<void>};
export default function BudgetCostPicker({data,editable=false,busy=false,persist}:Props){
 const [localExcluded,setExcluded]=useState<string[]>([]),[known,setKnown]=useState<string[]|null>(null),[open,setOpen]=useState<string[]>([]);
 const [amounts,setAmounts]=useState<ScenarioAmounts>({});
 const excluded=known?[...new Set([...localExcluded,...data.expenses.filter(e=>e.status!=='Ej med'&&!known.includes(e.id)).map(e=>e.id)])]:localExcluded;
 const planData=withDebtPayments(data),result=scenarioPreview(data,excluded,amounts),groups=budgetCostGroups(scenarioBudget(data,amounts).expenses);
 function choose(ids:string[],include:boolean){if(known)setKnown([...new Set([...known,...ids])]);setExcluded(current=>include?current.filter(id=>!ids.includes(id)):[...new Set([...current,...ids])])}
 function preset(value:CostPreset){const ids=presetCostIds(planData.expenses,value);setKnown(null);setExcluded(result.eligible.filter(e=>!ids.includes(e.id)).map(e=>e.id))}
 function applyScenario(ids:string[],values:ScenarioAmounts={}){setExcluded(ids);setAmounts(values);setKnown(data.expenses.filter(e=>e.status!=='Ej med').map(e=>e.id))}
 const selections:[CostPreset,string][]=[['all','Alla'],['priority','Prioriterade'],['priority-credit','Bas + krediter'],['credit','Krediter'],['none','Inga']];
 return <section className="cost-picker" aria-label="Välj och jämför planerade utgifter">
  <header><div><span className="cost-picker-kicker">Scenarier · budgetbeloppen ändras inte</span><h2>Jämför olika lägen</h2></div><button className="cost-picker-reset" disabled={busy} onClick={()=>preset('all')} aria-label="Återställ utgiftsurval"><RotateCcw size={15}/></button></header>
  <p className="cost-picker-help">Välj vilka planerade utgifter som ska ingå och se vad som blir kvar.</p>
  <BudgetScenarios data={data} excluded={excluded} onApply={applyScenario} amounts={amounts} onAmounts={setAmounts} editable={editable} busy={busy} persist={persist}/>
  {!result.eligible.length?<p className="cost-picker-help">Lägg till planerade utgifter under Budgetbelopp för att jämföra dem här.</p>:<>
   <div className="cost-picker-presets" role="group" aria-label="Snabbval för planerade utgifter">{selections.map(([key,label])=>{const ids=presetCostIds(planData.expenses,key),pressed=result.selected.length===ids.length&&result.selected.every(e=>ids.includes(e.id));return <button key={key} disabled={busy} aria-pressed={pressed} onClick={()=>preset(key)}><span>{label}</span><small>{kr(sum(result.eligible.filter(e=>ids.includes(e.id)).map(e=>e.amount)))}</small></button>})}</div>
   <div className="cost-picker-result" aria-live="polite" aria-atomic="true"><div><span>Valda utgifter / mån</span><strong>{kr(result.cost,2)}</strong><small>{result.selected.length} av {result.eligible.length} poster</small></div><div><span>Kvar enligt urval</span><strong className={result.remaining<0?'negative':''}>{kr(result.remaining,2)}</strong><small>Planerad inkomst {kr(result.income)}</small></div></div>
   <div className="cost-picker-comparison"><div><span>Hela planen</span><strong>{kr(result.fullRemaining)} kvar</strong></div><div><span>Skillnad mot hela planen</span><strong>{result.difference>0?'+':''}{kr(result.difference)}</strong></div><div className="cost-picker-track" role="img" aria-label={`${kr(result.cost,2)} valda utgifter av ${kr(result.fullCost,2)} i hela planen`}><i style={{width:(result.fullCost?Math.min(100,result.cost/result.fullCost*100):0)+'%'}}/></div></div>
   <div className="cost-picker-groups">{groups.map(group=>{const ids=group.items.map(e=>e.id),selected=group.items.filter(e=>!excluded.includes(e.id)),total=sum(group.items.map(e=>e.amount)),amount=sum(selected.map(e=>e.amount)),expanded=open.includes(group.key);return <div className="cost-picker-group" key={group.key}><div className="cost-picker-group-head"><label><Checkbox disabled={busy} label={`Ta med kategorin ${group.label}`} checked={selected.length===ids.length} partial={selected.length>0&&selected.length<ids.length} onChange={include=>choose(ids,include)}/><span>{group.label}<small>{selected.length} av {ids.length} valda</small></span><strong>{kr(amount)}<small>av {kr(total)}</small></strong></label><button aria-label={`Visa poster i ${group.label}`} aria-expanded={expanded} onClick={()=>setOpen(current=>expanded?current.filter(key=>key!==group.key):[...current,group.key])}><ChevronDown size={17}/></button></div>{expanded&&<div className="cost-picker-items">{group.items.map(item=><label key={item.id}><Checkbox disabled={busy} label={`Ta med utgiften ${item.name}`} checked={!excluded.includes(item.id)} onChange={include=>choose([item.id],include)}/><span>{item.name}{isPriorityExpense(item)&&<small>Prioriterad</small>}</span><strong>{kr(item.amount,2)}</strong></label>)}</div>}</div>})}</div>
  </>}
  <p className="cost-picker-help cost-picker-boundary">Scenarier är jämförelser. Bortvalda räkningar försvinner inte och prognosen ändras först när du uppdaterar budgetbeloppen eller registrerar en händelse.</p>
  <details className="cost-picker-method"><summary>Så grupperas utgifterna</summary><p>Kategorier föreslås utifrån posternas namn; okända namn hamnar i Övriga utgifter. Prioriterade följer dina prioriteringsmarkeringar. Krediter & lån använder summan av ordinarie månadsbetalningar för de aktiva lån som finns registrerade i Skuldöversikten. Äldre manuella kreditrader läggs inte ovanpå. Poster markerade Räknas inte med i budgeten och sparplanen ingår inte i kalkylen.</p></details>
 </section>;
}
