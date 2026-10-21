import {z} from 'zod';
const ids=z.array(z.string().trim().min(1).max(180)).max(100).refine(values=>new Set(values).size===values.length,'En kostnad får bara förekomma en gång.');
export const scenarioNameKey=(name:string)=>name.normalize('NFC').trim().toLocaleLowerCase('sv-SE');
export const budgetScenarioSchema=z.object({
 id:z.string().trim().min(1).max(180),name:z.string().trim().min(1,'Ge scenariot ett namn.').max(80,'Använd högst 80 tecken.'),
 selectedExpenseIds:ids,knownExpenseIds:ids,createdAt:z.string().datetime(),updatedAt:z.string().datetime(),
}).superRefine((scenario,ctx)=>{
 if(scenario.selectedExpenseIds.some(id=>!scenario.knownExpenseIds.includes(id)))ctx.addIssue({code:z.ZodIssueCode.custom,path:['selectedExpenseIds'],message:'Urvalet måste tillhöra scenariots kända kostnader.'});
});
export const budgetScenariosSchema=z.array(budgetScenarioSchema).max(20,'Du kan spara högst 20 scenarier.').superRefine((scenarios,ctx)=>{
 const ids=new Set<string>(),names=new Set<string>();
 for(const [i,scenario] of scenarios.entries()){
  if(ids.has(scenario.id))ctx.addIssue({code:z.ZodIssueCode.custom,path:[i,'id'],message:'Dubbla scenario-ID:n.'});
  if(names.has(scenarioNameKey(scenario.name)))ctx.addIssue({code:z.ZodIssueCode.custom,path:[i,'name'],message:'Scenarionamnet används redan. Välj ett annat namn eller uppdatera det valda scenariot.'});
  ids.add(scenario.id);names.add(scenarioNameKey(scenario.name));
 }
});
export type BudgetScenario=z.infer<typeof budgetScenarioSchema>;
