import type { Budget } from './budget';
export type RecordKind = 'transactions' | 'incomes' | 'debts' | 'expenses' | 'goals' | 'revenueSources';
export const recordLabels: Record<RecordKind, {action:string;object:string}> = {
  revenueSources:{action:'intäktskälla',object:'intäktskällan'},
  transactions:{action:'transaktion',object:'transaktionen'},
  incomes:{action:'planerad inkomst',object:'inkomsten'},
  debts:{action:'skuld',object:'skulden'},
  expenses:{action:'månadskostnad',object:'kostnaden'},
  goals:{action:'sparmål',object:'sparmålet'},
};
export function removeRecord(data: Budget, kind: RecordKind, id: string): Budget {
  if (!(data[kind]||[]).some(row => row.id === id)) throw Error('Posten finns inte längre. Hämta senaste status.');
  // Remove only the selected record; historical cash flow and the plan stay independent.
  if (kind === 'revenueSources') return {...data,revenueSources:(data.revenueSources||[]).filter(x=>x.id!==id),transactions:data.transactions.map(tx=>{if(tx.incomeSourceId!==id)return tx;const {incomeSourceId,...rest}=tx;return rest;})};
  if (kind === 'transactions') return {...data, transactions:data.transactions.filter(x=>x.id!==id)};
  if (kind === 'incomes') return {...data, incomes:data.incomes.filter(x=>x.id!==id)};
  if (kind === 'expenses') return {...data, expenses:data.expenses.filter(x=>x.id!==id)};
  if (kind === 'goals') return {...data, goals:data.goals.filter(x=>x.id!==id)};
  return {...data, debts:data.debts.filter(x=>x.id!==id)};
}
