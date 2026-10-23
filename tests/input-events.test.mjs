import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const events=source.slice(source.indexOf("input.addEventListener('compositionstart'"),source.indexOf("input.addEventListener('paste'"));
function setup(language){
 const handlers={},calls=[],pending=[];
 const context={startClock:()=>calls.push({clock:true}),article:{language},input:{value:'',selectionStart:0,selectionEnd:0,addEventListener:(name,fn)=>handlers[name]=fn},composing:false,compositionBase:'',compositionStart:0,compositionEnd:0,clearPending(){},showPending:v=>pending.push(v),pendingFromValue:()=>context.input.value,accept:(value=context.input.value,provisional=false)=>calls.push({value,provisional})};
 runInNewContext(events,context);return {context,handlers,calls,pending};
}
test('English prediction updates each letter without compositionend or word selection',()=>{
 const {context,handlers,calls,pending}=setup('en');handlers.compositionstart();
 handlers.compositionupdate({data:'h'});handlers.compositionupdate({data:'he'});
 context.input.value='hel';handlers.input({isComposing:true});
 assert.deepEqual(calls.filter(c=>!c.clock).map(c=>c.value),['h','he','hel']);assert.ok(calls.filter(c=>!c.clock).every(c=>c.provisional));assert.deepEqual(pending,[]);
});
test('English composing word preserves previously committed prefix',()=>{
 const {context,handlers,calls}=setup('en');context.input.value='hello ';context.input.selectionStart=6;context.input.selectionEnd=6;
 handlers.compositionstart();handlers.compositionupdate({data:'w'});assert.equal(calls.find(c=>!c.clock).value,'hello w');
});
test('Chinese composition starts clock before commit but does not validate pinyin',()=>{
 const {context,handlers,calls}=setup('zh');handlers.compositionstart();handlers.compositionupdate({data:'feng'});
 assert.ok(calls.some(c=>c.clock));assert.equal(calls.filter(c=>!c.clock).length,0);
 context.input.value='风穿过';handlers.compositionend();assert.equal(calls.find(c=>!c.clock).value,'风穿过');
});
test('ordinary English key input does not wait for composition',()=>{const {context,handlers,calls}=setup('en');context.input.value='a';handlers.input({isComposing:false});assert.equal(calls.find(c=>!c.clock).value,'a');});
