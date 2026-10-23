import {type Budget,sum} from './budget';
import {budgetScenarioSchema,budgetScenariosSchema,type BudgetScenario} from './budget-scenario-schema';
import {selectedCostTotals} from './cost-selection';
import {withDebtPayments} from './debt-summary';
export type ScenarioAmounts=Pick<BudgetScenario,'incomeAmount'|'expenseAmounts'>;
export function scenarioBudget(data:Budget,amounts:ScenarioAmounts):Budget{
 const plan=withDebtPayments(data);
 return {...plan,incomes:amounts.incomeAmount===undefined?plan.incomes:[{id:'scenario-income',name:'Scenarioinkomst',amount:amounts.incomeAmount}],expenses:plan.expenses.map(e=>{const override=amounts.expenseAmounts?.find(a=>a.id===e.id);return override?{...e,amount:override.amount}:e})};
}
export function scenarioPreview(data:Budget,excluded:string[],amounts:ScenarioAmounts){
 const result=selectedCostTotals(scenarioBudget(data,amounts),excluded),base=selectedCostTotals(withDebtPayments(data),[]);
 return {...result,fullCost:base.fullCost,fullRemaining:base.remaining,difference:sum([result.remaining,-base.remaining])};
}
export function makeBudgetScenario(data:Budget,name:string,excluded:string[],existing?:BudgetScenario,amounts:ScenarioAmounts=existing||{}):BudgetScenario{
 const eligible=withDebtPayments(data).expenses.filter(e=>e.status!=='Ej med'),now=new Date().toISOString();
 return budgetScenarioSchema.parse({id:existing?.id||crypto.randomUUID(),name,selectedExpenseIds:eligible.filter(e=>!excluded.includes(e.id)).map(e=>e.id),knownExpenseIds:eligible.map(e=>e.id),createdAt:existing?.createdAt||now,updatedAt:now,...(amounts.incomeAmount===undefined?{}:{incomeAmount:amounts.incomeAmount}),...(amounts.expenseAmounts===undefined?{}:{expenseAmounts:amounts.expenseAmounts})});
}
export function putBudgetScenario(data:Budget,scenario:BudgetScenario):Budget{
 const current=data.budgetScenarios||[],next=current.some(s=>s.id===scenario.id)?current.map(s=>s.id===scenario.id?scenario:s):[...current,scenario];
 const parsed=budgetScenariosSchema.safeParse(next);
 if(!parsed.success)throw Error(parsed.error.issues[0].message);
 return {...data,budgetScenarios:parsed.data};
}
export function removeBudgetScenario(data:Budget,id:string):Budget{return {...data,budgetScenarios:(data.budgetScenarios||[]).filter(s=>s.id!==id)}}
export function scenarioCostTotals(data:Budget,scenario:BudgetScenario){
 const eligible=withDebtPayments(data).expenses.filter(e=>e.status!=='Ej med'),ids=new Set(scenario.selectedExpenseIds),known=new Set(scenario.knownExpenseIds);
 const excluded=eligible.filter(e=>!ids.has(e.id)).map(e=>e.id),currentIds=new Set(eligible.map(e=>e.id));
 return {...scenarioPreview(data,excluded,scenario),excluded,missingIds:scenario.selectedExpenseIds.filter(id=>!currentIds.has(id)),newIds:eligible.filter(e=>!known.has(e.id)).map(e=>e.id)};
}
export function scenarioSelectionMatches(data:Budget,scenario:BudgetScenario,excluded:string[]){
 const expected=scenarioCostTotals(data,scenario).selected.map(e=>e.id),actual=selectedCostTotals(withDebtPayments(data),excluded).selected.map(e=>e.id);
 return actual.length===expected.length&&actual.every(id=>expected.includes(id));
}
