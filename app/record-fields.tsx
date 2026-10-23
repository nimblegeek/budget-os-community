import type { ReactNode } from 'react';
export type Field={name:string;label:string;value?:string|number;type?:string;options?:string[];optionLabels?:Record<string,string>;optional?:boolean;advanced?:boolean};
const secondary=new Set(['note','original','priority','excluded']);
export default function RecordFields({fields,description}:{fields:Field[];description?:string}) {
 const render=(field:Field):ReactNode=><label key={field.name}>{field.label}{field.optional&&<span className="field-optional">Valfritt</span>}{field.options?<select name={field.name} defaultValue={field.value} required={!field.optional}>{field.options.map(value=><option key={value} value={value}>{field.optionLabels?.[value]||value}</option>)}</select>:field.type==='textarea'?<textarea name={field.name} defaultValue={field.value} maxLength={5000} rows={6}/>:<input name={field.name} type={field.type||'text'} inputMode={field.type==='number'?'decimal':undefined} defaultValue={field.value} required={!field.optional} min={field.type==='number'?0:undefined} step={field.type==='number'?'0.01':undefined} maxLength={180}/>}</label>;
 const isExtra=(f:Field)=>f.advanced||secondary.has(f.name);
 const extra=fields.filter(isExtra);
 return <>{fields.filter(f=>!isExtra(f)).map(render)}{extra.length>0&&<details className="form-extra"><summary>Fler inställningar</summary><div>{extra.map(render)}</div></details>}{description&&<p className="form-hint">{description}</p>}</>;
}
