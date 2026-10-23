export const expenseCategories=[
 {key:'home',label:'Boende'},
 {key:'food',label:'Mat & livsmedel'},
 {key:'utilities',label:'El, värme & vatten'},
 {key:'insurance',label:'Försäkringar'},
 {key:'phone',label:'Tele & abonnemang'},
 {key:'credit',label:'Krediter & lån'},
 {key:'transport',label:'Transport'},
 {key:'other',label:'Övriga utgifter'},
] as const;

export type ExpenseCategoryKey=typeof expenseCategories[number]['key'];
export const expenseCategoryKeys=expenseCategories.map(category=>category.key) as [ExpenseCategoryKey,...ExpenseCategoryKey[]];
const normalize=(text:string)=>text.toLocaleLowerCase('sv-SE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const exact=new Map<string,ExpenseCategoryKey>(expenseCategories.flatMap(category=>[[category.key,category.key],[normalize(category.label),category.key]]));

export function isExpenseCategory(value:string):boolean{return exact.has(normalize(value))}
export function expenseCategoryKey(value:string):ExpenseCategoryKey{
 const n=normalize(value),known=exact.get(n);if(known)return known;
 if(/^(boende|hyra|bolan|bostad|brf)( |$)|^(avgift|bostadsrattsavgift|manadsavgift)$/.test(n))return 'home';
 if(/^(mat|livsmedel|matvaror)( |$)/.test(n))return 'food';
 if(/^(el|elnat|elhandel|varme|vatten|va avfall)( |$)/.test(n))return 'utilities';
 if(/^(forsakring|forsakringar|hemforsakring|personforsakring|bilforsakring)( |$)/.test(n))return 'insurance';
 if(/^(tele|telefon|mobil|internet|bredband|tv|abonnemang)( |$)/.test(n))return 'phone';
 if(/(?:^| )(krediter?|blancolan|lan|amortering|ranta|csn)( |$)/.test(n))return 'credit';
 if(/^(transport|resor|buss|tag|bil|drivmedel|parkering)( |$)/.test(n))return 'transport';
 return 'other';
}
export function expenseCategoryLabel(value:string){const key=expenseCategoryKey(value);return expenseCategories.find(category=>category.key===key)!.label}
export function transactionExpenseCategory(category:string,description=''){
 return isExpenseCategory(category)?expenseCategoryKey(category):expenseCategoryKey(category)==='other'?expenseCategoryKey(description):expenseCategoryKey(category);
}
