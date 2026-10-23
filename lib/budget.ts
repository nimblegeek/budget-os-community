import { z } from 'zod';
import { revenueSourceSchema } from './revenue-schema';
import { creditorWorkSchema } from './creditors';
import { debtHistorySchema } from './journey';
import {budgetScenariosSchema} from './budget-scenario-schema';
import {expenseCategoryKeys} from './expense-categories';
const money = z.number().finite().min(0).max(100_000_000);
const label = z.string().trim().min(1).max(180);
export const transactionSchema = z.object({id:z.string().min(1).max(160),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),description:label,amount:z.number().finite().min(-100_000_000).max(100_000_000),kind:z.enum(['income','expense','transfer']),category:z.string().max(100),reviewed:z.boolean(),source:z.string().max(180),excluded:z.boolean(),incomeSourceId:z.string().min(1).max(180).optional()});
export const budgetSchema = z.object({version:z.literal(1),name:label,source:z.object({label:z.string().max(180),importedAt:z.string().max(50),period:z.string().max(180)}),expenses:z.array(z.object({id:label,name:label,category:z.enum(expenseCategoryKeys).optional(),amount:money,frame:money,status:z.enum(['Ram','Betalning','Prelim.','Ej med']),note:z.string().max(2000),priority:z.boolean().optional()})).max(100),incomes:z.array(z.object({id:label,name:label,amount:money})).max(30),debts:z.array(z.object({id:label,name:label,balance:money,original:money,rate:z.number().min(0).max(100).nullable(),monthly:money,type:z.string().max(50),note:z.string().max(2000),balanceVerified:z.boolean()})).max(100),transactions:z.array(transactionSchema).max(15000),goals:z.array(z.object({id:label,name:label,target:money,saved:money,monthly:money})).max(30),notes:z.string().max(5000),creditorWork:creditorWorkSchema.optional(),debtHistory:debtHistorySchema.optional(),revenueSources:z.array(revenueSourceSchema).max(200).optional(),budgetScenarios:budgetScenariosSchema.optional()}).superRefine((data,ctx)=>{
 const ids=new Set((data.revenueSources||[]).map(x=>x.id));
 for(const [i,tx] of data.transactions.entries())if(tx.incomeSourceId&&(tx.kind!=='income'||!ids.has(tx.incomeSourceId)))ctx.addIssue({code:z.ZodIssueCode.custom,path:['transactions',i,'incomeSourceId'],message:'Inbetalningen måste ha en befintlig intäktskälla.'});
});
export type Budget = z.infer<typeof budgetSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export const emptyBudget: Budget={version:1,name:'Min budget',source:{label:'Ingen import ännu',importedAt:'',period:''},expenses:[],incomes:[],debts:[],transactions:[],goals:[],notes:''};
export const kr=(n:number,decimals=0)=>new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK',maximumFractionDigits:decimals,minimumFractionDigits:decimals}).format(n);
export const sum=(values:number[])=>Math.round(values.reduce((a,b)=>a+b,0)*100)/100;
export function totals(data:Budget){const income=sum(data.incomes.map(x=>x.amount)),expenses=sum(data.expenses.filter(x=>x.status!=='Ej med').map(x=>x.amount));return {income,expenses,remaining:sum([income,-expenses]),saving:sum(data.goals.map(x=>x.monthly))};}
