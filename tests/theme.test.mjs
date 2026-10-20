import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { themeBootstrap,themeKey,resolveTheme } from '../lib/theme.ts';
test('Theme defaults to dark and accepts only explicit light',()=>{
  for(const value of [null,undefined,'dark','unknown','<script>'])assert.equal(resolveTheme(value),'dark');
  assert.equal(resolveTheme('light'),'light');
});
test('Pre-paint bootstrap restores a saved choice, without reading budget data',()=>{
  for(const choice of [null,'light','dark','invalid']){
    const document={documentElement:{dataset:{theme:'dark'}}};
    runInNewContext(themeBootstrap,{document,localStorage:{getItem(key){assert.equal(key,themeKey);return choice;}}});
    assert.equal(document.documentElement.dataset.theme,resolveTheme(choice));
  }
});
test('Blocked browser storage does not break rendering',()=>{
  const document={documentElement:{dataset:{theme:'dark'}}};
  assert.doesNotThrow(()=>runInNewContext(themeBootstrap,{document,localStorage:{getItem(){throw Error('Storage blocked');}}}));
  assert.equal(document.documentElement.dataset.theme,'dark');
});
