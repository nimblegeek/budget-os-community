import {type Budget} from '../../lib/budget';
import {stockholmDate} from '../../lib/date-range';
export function seedBudget():Budget {
 const month=stockholmDate().slice(0,7);
 return {
  version:1,name:'Min testbudget',source:{label:'Påhittade lokala exempel',importedAt:'',period:'Testdata'},notes:'Lokal testmiljö. Inga riktiga bankuppgifter.',
  incomes:[{id:'local-income',name:'Exempellön',amount:28000}],
  expenses:[
   {id:'local-rent',name:'Hyra',amount:8500,frame:8500,status:'Betalning',note:''},
   {id:'local-food',name:'Mat',amount:3500,frame:3500,status:'Ram',note:''},
   {id:'local-electricity',name:'El',amount:450,frame:450,status:'Ram',note:''},
   {id:'local-insurance',name:'Hemförsäkring',amount:200,frame:200,status:'Betalning',note:''},
   {id:'local-credit',name:'Krediter & blancolån',amount:1500,frame:1500,status:'Betalning',note:''},
  ],
  debts:[{id:'local-loan',name:'Exempellån',balance:50000,original:60000,rate:12,monthly:1500,type:'Blanco',note:'Påhittat lån',balanceVerified:true}],
  goals:[{id:'local-goal',name:'Testbuffert',target:10000,saved:2000,monthly:500}],
  transactions:[
   {id:'local-t1',date:`${month}-01`,description:'Exempellön',amount:28000,kind:'income',category:'Exempellön',reviewed:true,source:'Lokala exempel',excluded:false},
   {id:'local-t2',date:`${month}-02`,description:'Exempelhyra',amount:-8500,kind:'expense',category:'Hyra',reviewed:true,source:'Lokala exempel',excluded:false},
   {id:'local-t3',date:`${month}-03`,description:'Exempelbutiken',amount:-550,kind:'expense',category:'Mat',reviewed:false,source:'Lokala exempel',excluded:false},
  ],
 };
}
