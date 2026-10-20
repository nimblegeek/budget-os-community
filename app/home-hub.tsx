'use client';
import {ArrowUpRight,PiggyBank,ChartNoAxesCombined,SlidersHorizontal,LifeBuoy,ArrowLeft,ChevronRight} from 'lucide-react';
import {type Budget,kr,sum} from '../lib/budget';
import {monthRange,periodSummary} from '../lib/date-range';
import {areas,featureGroups,groupOrder,pageDescriptions,pageTrail,type Group,type Page} from '../lib/navigation';
const icons={spara:PiggyBank,investera:ChartNoAxesCombined,planera:SlidersHorizontal,stöd:LifeBuoy};
export function PageTrail({page,onNavigate}:{page:Page;onNavigate:(page:Page)=>void}){
 const trail=pageTrail(page);if(!trail.length)return null;
 return <nav className="hub-breadcrumb" aria-label="Du är här">{trail.map((parent,i)=><span key={parent}>{i>0&&<ChevronRight size={11} aria-hidden="true"/>}<button onClick={()=>onNavigate(parent)} aria-label={parent==='Start'?'Till startsidan':'Till '+areas[parent].label}>{i===0&&<ArrowLeft size={12} aria-hidden="true"/>}{areas[parent].label}</button></span>)}</nav>;
}
export default function HomeHub({data,onNavigate}:{data:Budget;onNavigate:(page:Page)=>void}){
 const actual=periodSummary(data.transactions,monthRange());
 const info:Record<Group,{value:string;label:string}>={
  spara:{value:kr(sum(data.goals.map(g=>g.saved))),label:'Registrerat sparande'},
  investera:{value:'Kommande',label:'Ingen portfölj kopplad'},
  planera:{value:kr(sum([actual.income,-actual.expense])),label:'Kvar denna månad'},
  stöd:{value:kr(sum(data.debts.map(d=>d.balance))),label:'Registrerad totalskuld'},
 };
 return <section className="home-hub" aria-label="Fyra områden för din ekonomi"><div className="hub-intro"><h2>Din ekonomi.</h2></div><div className="hub-cards">{groupOrder.map(key=>{
  const group=featureGroups[key],Icon=icons[key];
  return <button className={'hub-card hub-card--'+key} key={key} onClick={()=>onNavigate(group.page)} aria-label={'Öppna '+group.label}>
   <span className="hub-card-top"><Icon size={22} strokeWidth={1.5} aria-hidden="true"/><span>{areas[group.page].number}</span><ArrowUpRight size={17} aria-hidden="true"/></span>
   <h3>{group.label}</h3><p>{group.description}</p><span className="hub-card-number"><strong>{info[key].value}</strong><small>{info[key].label}</small></span><span className="hub-card-includes">{group.includes}</span>
  </button>;
 })}</div></section>;
}
export function GroupHub({group,onNavigate}:{group:Group;onNavigate:(page:Page)=>void}){
 const item=featureGroups[group];
 const link=(page:Page)=><button className="hub-feature" key={page} onClick={()=>onNavigate(page)}><span className="hub-feature-number">{areas[page].number}</span><span><strong>{areas[page].label}</strong><small>{pageDescriptions[page]}</small></span><ArrowUpRight size={18} aria-hidden="true"/></button>;
 if(group==='investera')return <section className="group-hub"><span className="hub-soon">Kommande</span><h2>Långsiktigt, utan bruset.</h2><p>Här får investeringar en egen plats när portföljstöd är på plats. I dag finns ingen registrering av innehav, marknadsdata eller avkastningsberäkning.</p><div className="hub-invest-note"><PiggyBank size={23} aria-hidden="true"/><div><strong>Börja med ditt sparmål</strong><p>Du kan redan nu registrera ett långsiktigt sparmål under Spara. Det räknas som sparande, inte som en investerad portfölj.</p><button className="btn light" onClick={()=>onNavigate('Sparande')}>Till Spara <ArrowUpRight size={15}/></button></div></div></section>;
 return <section className="group-hub"><h2>{group==='planera'?'Koll på vardagen.':'En sak i taget.'}</h2><p>{item.description}</p><div className="hub-feature-list">{(item.pages as readonly Page[]).filter(page=>group!=='stöd'||page==='Skulder').map(link)}</div>{group==='stöd'&&<details className="hub-support"><summary><span>Behöver du stöd?<small>Valfritt · borgenärer och rådgivarsamarbete</small></span><span>+</span></summary><p>För dig som vill arbeta med dina borgenärer eller tillsammans med en budget- och skuldrådgivare. Verktygen behövs inte för den vanliga budgeten.</p><div className="hub-feature-list">{(['Borgenärer','Samarbete'] as Page[]).map(link)}</div></details>}</section>;
}
