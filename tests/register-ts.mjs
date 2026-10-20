import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';
registerHooks({
  resolve(specifier,context,next){
    if(specifier.startsWith('.')&&context.parentURL){
      for(const extension of ['.ts','.tsx']){
        const url=new URL(specifier+extension,context.parentURL);
        if(existsSync(url))return {url:url.href,shortCircuit:true};
      }
    }
    return next(specifier,context);
  },
  load(url,context,next){
    if(/\.tsx?$/.test(url))return {format:'module',source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,shortCircuit:true};
    return next(url,context);
  },
});
