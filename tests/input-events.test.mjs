import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const events=source.slice(source.indexOf("input.addEventListener('compositionstart'"),source.indexOf("input.addEventListener('paste'"));
function setup(language){
 const handlers={},calls=[],pending=[];
 const context={article:{language},input:{value:'',selectionStart:0,selectionEnd:0,addEventListener:(name,fn)=>handlers[name]=fn},composing:false,compositionBase:'',compositionStart:0,compositionEnd:0,clearPending(){},showPending:v=>pending.push(v),pendingFromValue:()=>context.input.value,accept:(value=context.input.value,provisional=false)=>calls.push({value,provisional})};
 runInNewContext(events,context);return {context,handlers,calls,pending};
}
test('English prediction updates each letter without compositionend or word selection',()=>{
 const {context,handlers,calls,pending}=setup('en');handlers.compositionstart();
 handlers.compositionupdate({data:'h'});handlers.compositionupdate({data:'he'});
 context.input.value='hel';handlers.input({isComposing:true});
 assert.deepEqual(calls.map(c=>c.value),['h','he','hel']);assert.ok(calls.every(c=>c.provisional));assert.deepEqual(pending,[]);
});
test('English composing word preserves previously committed prefix',()=>{
 const {context,handlers,calls}=setup('en');context.input.value='hello ';context.input.selectionStart=6;context.input.selectionEnd=6;
 handlers.compositionstart();handlers.compositionupdate({data:'w'});assert.equal(calls[0].value,'hello w');
});
test('Chinese pinyin remains preview until commit',()=>{
 const {context,handlers,calls,pending}=setup('zh');handlers.compositionstart();handlers.compositionupdate({data:'ni'});assert.deepEqual(pending,['ni']);assert.equal(calls.length,0);context.input.value='你';handlers.compositionend();assert.equal(calls[0].value,'你');
});
test('ordinary English key input does not wait for composition',()=>{const {context,handlers,calls}=setup('en');context.input.value='a';handlers.input({isComposing:false});assert.equal(calls[0].value,'a');});
