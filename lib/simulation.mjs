const round=n=>Math.round(n*100)/100;
// A local what-if comparison only: never changes registered rates or balances.
export function compareDebtScenario(debts,extra=0,rateCut=0,strategy='avalanche'){
  if(!Number.isFinite(rateCut)||rateCut<0||rateCut>100)throw Error('Ogiltig räntesänkning.');
  const active=debts.filter(d=>d.type!=='Bolån'&&d.balance>0);
  const simulated=active.map(d=>({...d,rate:d.rate===null?null:round(Math.max(0,d.rate-rateCut))}));
  const base=projectDebts(active,0,strategy),scenario=projectDebts(simulated,extra,strategy);
  const balance=round(active.reduce((s,d)=>s+d.balance,0));
  const known=active.every(d=>d.rate!==null&&Number.isFinite(d.rate));
  const weighted=loans=>balance?loans.reduce((s,d)=>s+d.balance*d.rate,0)/balance:0;
  const complete=base.months!=null&&scenario.months!=null;
  return {base,scenario,balance,monthly:round(active.reduce((s,d)=>s+d.monthly,0)),
    currentRate:known?weighted(active):null,scenarioRate:known?weighted(simulated):null,
    monthsSaved:complete?base.months-scenario.months:null,
    interestSaved:complete?round(base.interest-scenario.interest):null};
}
export function projectionBalanceAt(projection,month){
  const point=projection.points.find(p=>p.month===month);
  if(point)return point.balance;
  if(projection.months!=null&&month>=projection.months)return 0;
  return null; // Never extrapolate a failed/incomplete forecast.
}
export function scenarioTotals(income,expenses,saving,baseIncome,baseExpenses){
  if([income,expenses,saving,baseIncome,baseExpenses].some(x=>!Number.isFinite(x)||x<0))throw Error('Ogiltiga scenariobelopp.');
  const remaining=round(income-expenses-saving),base=round(baseIncome-baseExpenses-saving);
  return {remaining,base,change:round(remaining-base),extra:Math.max(0,Math.min(remaining,round(remaining-base)))};
}
// Monthly nominal interest, end-of-month payments, no fees. Money stays in öre.
export function projectDebts(debts,extra=0,strategy='avalanche',horizon=600){
  const active=debts.filter(d=>d.type!=='Bolån'&&d.balance>0);
  if(!Number.isFinite(extra)||extra<0||extra>100_000_000)return {error:'Ogiltig extra betalning.',points:[]};
  if(active.some(d=>d.rate===null||!Number.isFinite(d.rate)))return {error:'Komplettera räntan på alla valda lån för en jämförbar prognos.',points:[]};
  const loans=active.map(d=>({...d,balance:Math.round(d.balance*100),monthly:Math.round(d.monthly*100)}));
  const budget=loans.reduce((s,d)=>s+d.monthly,0)+Math.round(extra*100);
  const start=loans.reduce((s,d)=>s+d.balance,0),points=[{month:0,balance:start/100}];
  if(!start)return {points,months:0,interest:0};
  let interest=0;
  for(let month=1;month<=horizon;month++){
    let available=budget;
    for(const d of loans){
      if(d.balance<=0)continue;
      const cost=Math.round(d.balance*d.rate/1200);interest+=cost;d.balance+=cost;
      const pay=Math.min(d.monthly,d.balance,available);d.balance-=pay;available-=pay;
    }
    const order=loans.filter(d=>d.balance>0).sort((a,b)=>strategy==='snowball'?a.balance-b.balance:b.rate-a.rate||a.balance-b.balance);
    for(const d of order){const pay=Math.min(available,d.balance);d.balance-=pay;available-=pay;}
    const rest=loans.reduce((s,d)=>s+d.balance,0);
    points.push({month,balance:rest/100});
    if(rest===0)return {points,months:month,interest:interest/100};
    if(!Number.isSafeInteger(rest)||rest>1e14)return {points:points.slice(0,-1),error:'Skulden växer kraftigt med dessa antaganden. Kontrollera betalningar och räntor.'};
  }
  return {points,error:'Inte återbetalt inom 50 år med dessa antaganden.'};
}
