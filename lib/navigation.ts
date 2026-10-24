export const areas = {
 Start:{number:'00',label:'Start'},
 Sparande:{number:'01',label:'Spara'},
 Investera:{number:'02',label:'Investera'},
 Planera:{number:'03',label:'Planera'},
 Översikt:{number:'03.1',label:'Budget'},
 Budgetunderlag:{number:'03.2',label:'Budgetbelopp'},
 Transaktioner:{number:'03.3',label:'Historik & import'},
 Intäkter:{number:'03.4',label:'Intäkter'},
 Underlag:{number:'03.5',label:'Data & historik'},
 Stöd:{number:'04',label:'Skulder & stöd'},
 Skulder:{number:'04.1',label:'Lån'},
 Borgenärer:{number:'04.2',label:'Borgenärer'},
 Samarbete:{number:'04.3',label:'Rådgivarsamarbete'},
} as const;
export type Page=keyof typeof areas;
export const featureGroups={
 planera:{page:'Planera',label:'Planera',description:'Sätt budgetbelopp, följ utfallet och kategorisera registrerade händelser.',includes:'Budget · Budgetbelopp · Historik',pages:['Översikt','Budgetunderlag','Transaktioner','Intäkter','Underlag']},
 spara:{page:'Sparande',label:'Spara',description:'Buffert, sparmål och månadssparande.',includes:'Sparmål · Månadssparande',pages:['Sparande']},
 investera:{page:'Investera',label:'Investera',description:'Långsiktig ekonomi. Portföljstöd kommer senare.',includes:'Kommande område',pages:['Investera']},
 stöd:{page:'Stöd',label:'Skulder & stöd',description:'Lån och betalningar. Valfritt: borgenärer och rådgivarsamarbete.',includes:'Lån · Valfria stödverktyg',pages:['Skulder','Borgenärer','Samarbete']},
} as const satisfies Record<string,{page:Page;label:string;description:string;includes:string;pages:readonly Page[]}>;
export type Group=keyof typeof featureGroups;
export const groupOrder=Object.keys(featureGroups) as Group[];
export const pageOrder=Object.keys(areas) as Page[];
export const sidebarPages:Page[]=['Översikt','Start','Sparande','Investera','Stöd'];
export const mobilePrimary:Page[]=['Översikt','Transaktioner','Sparande'];
export const mobileMore:Page[]=['Start','Budgetunderlag','Intäkter','Underlag','Investera','Stöd'];
export function groupForPage(page:Page):Group|undefined{
 return groupOrder.find(key=>featureGroups[key].page===page||(featureGroups[key].pages as readonly Page[]).includes(page));
}
export function pageTrail(page:Page):Page[]{
 if(page==='Start')return [];
 const group=groupForPage(page),parent=group?featureGroups[group].page:undefined;
 return ['Start',...(parent&&parent!==page?[parent]:[])];
}
export const pageDescriptions:Partial<Record<Page,string>>={
 Översikt:'Jämför budget med verkligt utfall och se exakt vilka transaktioner som ligger bakom.',
 Budgetunderlag:'Ange planerade inkomster och belopp per utgiftskategori.',
 Transaktioner:'Kategorisera transaktioner, sök i historiken och importera bank-CSV.',
 Intäkter:'Ordna inbetalningar per källa eller plattform. Följ fördelningen och skapa en delningsbild.',
 Underlag:'Säkerhetskopior, återställning, källunderlag och ändringshistorik. För alla, även utan rådgivare.',
 Skulder:'Totalskuld, månadsbetalningar och skuldresa. Hantera lån och simulera återbetalning eller samlingslån.',
 Borgenärer:'Samla kontakter och följ upp ränta, avbetalningsplaner och önskemål om anstånd.',
 Samarbete:'Ge en vald rådgivare läsbehörighet. Samla frågor och anteckningar inför era samtal.',
};
