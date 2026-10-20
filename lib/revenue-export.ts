import {kr} from './budget';
import {dateRangeLabel,type DateRange} from './date-range';
import {shareGroups,type RevenueGroup} from './revenue';

/** Draws only aggregates. No transaction descriptions, accounts or network requests. */
export async function revenueImage(groups:RevenueGroup[],total:number,range:DateRange,hideAmounts:boolean):Promise<Blob>{
 await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1440;
 const c=canvas.getContext('2d');if(!c)throw Error('Webbläsaren stöder inte bildexport.');
 c.fillStyle='#101513';c.fillRect(0,0,1200,1440);
 const text=(value:string,x:number,y:number,size:number,color='#edf1ec',align:CanvasTextAlign='left')=>{c.fillStyle=color;c.font=`500 ${size}px monospace`;c.textAlign=align;c.fillText(value,x,y);};
 c.strokeStyle='#a9ccab';c.lineWidth=4;c.lineCap='round';c.beginPath();c.arc(85,80,25,0,Math.PI*1.5);c.stroke();
 c.beginPath();c.moveTo(74,74);c.lineTo(96,74);c.moveTo(74,86);c.lineTo(96,86);c.stroke();c.fillStyle='#a9ccab';c.beginPath();c.arc(105,60,5,0,Math.PI*2);c.fill();
 text('budgetOS',130,91,30);text('INTÄKTSFÖRDELNING',64,190,40);
 text(dateRangeLabel(range),64,240,25,'#acb7b0');
 const display=shareGroups(groups),negative=groups.some(g=>g.amount<0);
 if(total>0&&!negative){
  let angle=-Math.PI/2;
  c.lineWidth=66;c.lineCap='butt';
  for(const g of display){if(g.amount<=0)continue;const end=angle+g.amount/total*Math.PI*2;c.strokeStyle=g.color;c.beginPath();c.arc(600,548,208,angle,end);c.stroke();angle=end;}
  text(hideAmounts?'FÖRDELNING':'REGISTRERAT',600,536,23,'#acb7b0','center');
  text(hideAmounts?'100 %':kr(total),600,590,40,'#edf1ec','center');
 }else{
  text(hideAmounts?'INTÄKTER':kr(total),600,480,58,'#edf1ec','center');
  text(negative?'Inkluderar återförda inkomster':'Inga inbetalningar i perioden',600,540,25,'#acb7b0','center');
 }
 display.forEach((g,i)=>{
  const y=875+i*48;c.fillStyle=g.color;c.fillRect(66,y-17,12,12);
  const label=Array.from(g.label);text(label.length>38?label.slice(0,37).join('')+'…':g.label,98,y,24);
  const share=g.share===null?'':g.share.toLocaleString('sv-SE',{maximumFractionDigits:1})+' %';
  text(hideAmounts?(share||'—'):[kr(g.amount,2),share].filter(Boolean).join(' · '),1136,y,23,'#edf1ec','right');
 });
 if(negative&&hideAmounts)text('Andelar visas inte när en grupp är negativ.',64,1290,21,'#acb7b0');
 text('Registrerade inbetalningar · ingen skatteberäkning',64,1340,21,'#acb7b0');
 text('budgetos.app',64,1394,23,'#a9ccab');
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Bilden kunde inte skapas.')),'image/png'));
}
