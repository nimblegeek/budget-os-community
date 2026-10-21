import {type Budget} from './budget';
export type DebtStrategy='avalanche'|'snowball';
type Loan=Budget['debts'][number];
// Keep paid loans and mortgages outside the extra-payment queue, as in the simulator.
export function debtAttackOrder(debts:Loan[],strategy:string='avalanche'){
 return debts.filter(d=>d.balance>0&&d.type!=='Bolån').sort((a,b)=>{
  if(strategy==='snowball')return a.balance-b.balance||(b.rate??-1)-(a.rate??-1)||a.id.localeCompare(b.id);
  return (b.rate??-1)-(a.rate??-1)||a.balance-b.balance||a.id.localeCompare(b.id);
 });
}
