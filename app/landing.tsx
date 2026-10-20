import {ArrowUpRight,ArrowRight,Check,ShieldCheck,Plus} from 'lucide-react';
import Brand from './brand';
import {featureGroups,groupOrder,areas} from '../lib/navigation';

/** Public presentation only: no household queries, balances, contacts or session data. */
export default function Landing(){
 return <main className="landing" id="top">
  <a className="landing-skip" href="#landing-content">Till innehållet</a>
  <header className="landing-header"><a href="/" aria-label="Budget OS startsida"><Brand/></a><nav aria-label="Besökarmeny"><a href="#sa-funkar-det" className="landing-nav-about">Så funkar det</a><a className="landing-login" href="/sign-in">Logga in <ArrowUpRight size={15} aria-hidden="true"/></a></nav></header>
  <div className="landing-wrap" id="landing-content">
   <section className="landing-hero" aria-labelledby="landing-title">
    <div className="landing-hero-copy"><span className="landing-eyebrow"><span/> Ett lugnare sätt att ha koll</span><h1 id="landing-title">Mer koll.<br/><span>Mindre brus.</span></h1><p>Din budget, ditt sparande och dina nästa steg.<br className="landing-desktop-break"/> Samlat. Avskalat. På dina villkor.</p><a className="landing-cta" href="/sign-up">Skapa min ekonomi <ArrowRight size={17} aria-hidden="true"/></a><small>Ett eget konto. En tom, privat arbetsyta.</small></div>
    <div className="landing-preview" aria-label="Illustrativ budgetvy med exempelbelopp"><div className="landing-preview-top"><Brand compact/><span>Exempelvy</span></div><div className="landing-preview-body"><span className="landing-demo-label">03.1 / BUDGET</span><span className="landing-demo-label landing-demo-period">En exempelmånad</span><div className="landing-demo-balance"><span>Kvar denna månad</span><strong>12 400 <small>kr</small></strong><p>Registrerade inkomster − utgifter</p></div><div className="landing-demo-equation"><div><span>Inkomster</span><strong>32 000 kr</strong></div><span aria-hidden="true">−</span><div><span>Utgifter</span><strong>19 600 kr</strong></div></div><div className="landing-demo-actions" aria-hidden="true"><span><Plus size={14}/> Inkomst</span><span><Plus size={14}/> Utgift</span></div><div className="landing-demo-note"><Check size={13}/><span>En siffra. En tydlig utgångspunkt.</span></div></div><p className="landing-example-note">Illustration med påhittade belopp, inte riktiga kontouppgifter.</p></div>
   </section>
   <section className="landing-method" id="sa-funkar-det" aria-labelledby="landing-method-title"><div className="landing-section-heading"><span className="landing-eyebrow">Så funkar det</span><h2 id="landing-method-title">Sätt riktningen.<br/>Ta ett steg i taget.</h2></div><ol>{[
    ['Sätt din budget','Bestäm vad du vill få plats med. Prioritera det viktigaste.'],
    ['Lägg till dina data','Registrera betalningar eller importera en bank-CSV. Ordna dina intäktskällor.'],
    ['Följ upp','Se vad som är kvar. Följ sparmål och skulder, och justera när livet ändras.'],
   ].map(([title,description],i)=><li key={title}><span className="landing-step-number">0{i+1}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol></section>
   <section className="landing-areas" aria-labelledby="landing-areas-title"><div className="landing-section-heading"><span className="landing-eyebrow">Fyra områden. En överblick.</span><h2 id="landing-areas-title">Plats för hela bilden.</h2></div><div className="landing-area-list">{groupOrder.map(key=>{const group=featureGroups[key];return <div className="landing-area" key={key}><span className="landing-area-number">{areas[group.page].number}</span><h3>{group.label}{key==='investera'&&<small>Kommande</small>}</h3><p>{group.description}</p></div>})}</div></section>
   <section className="landing-privacy" aria-labelledby="landing-privacy-title"><ShieldCheck size={23} strokeWidth={1.5} aria-hidden="true"/><div><h2 id="landing-privacy-title">Din ekonomi är privat.</h2><p>Du väljer om en rådgivare får läsa. Åtkomst kräver inloggning och uttrycklig behörighet — varje nytt konto får en egen tom arbetsyta, inte åtkomst till någon annans budget. Ingen automatisk bankkoppling.</p><a href="/sign-up">Skapa din privata ekonomi <ArrowUpRight size={14} aria-hidden="true"/></a></div></section>
  </div>
  <footer className="landing-footer"><a href="#top" aria-label="Till sidans början"><Brand compact/></a><span>Lite mer överblick. Lite mer lugn.</span><a className="landing-open-source" href="https://github.com/nimblegeek/budget-os-community" target="_blank" rel="noopener noreferrer">Open source · MIT <ArrowUpRight size={13} aria-hidden="true"/></a><a className="landing-credit" href="https://jonasasihlen.com" target="_blank" rel="noopener noreferrer">made with faith by <strong>JAS</strong> <ArrowUpRight size={13} aria-hidden="true"/></a></footer>
 </main>;
}
