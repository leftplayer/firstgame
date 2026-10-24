import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {TypingSession} from '../assets/scripts/TypingSession.ts';
const app=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const code=app.slice(app.indexOf('function setDebugPage('),app.indexOf("for(const button of document.querySelectorAll('[data-debug-page]'))button.addEventListener"));
test('debug result preview preserves input, pauses elapsed time, and cannot share sample scores',()=>{
 const nodes=new Map(),node=()=>({style:{},classList:{add(){},remove(){}},getBoundingClientRect:()=>({left:0,top:0}),textContent:''});
 const $=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const session=new TypingSession('cat and dog',true);session.start(1000);session.input('cat',2000);
 let now=3000;
 const ctx={session,article:{text:session.target,language:'en'},restarting:false,completed:false,debugPreview:null,resultStats:null,resultCountUp:null,burst:null,finishTimer:null,spans:[],input:{value:'cat'},composing:false,document:{querySelectorAll:()=>[]},Date:{now:()=>now},$,dismissKeyboard(){ctx.input.disabled=true;},clearPending(){},feedback:{reset(){}},captureGlyphs:()=>[],fallGlyphs:()=>({cancel(){}}),countUpSeconds:(s,fn)=>{fn(s.toFixed(2));return {cancel(){}};},updateFontPanelLayout(){},alignActiveLine(){},clearTimeout(){},restart(){throw Error('Must preserve unfinished round');}};
 runInNewContext(code,ctx);ctx.switchDebugPage('result');
 assert.equal(session.value,'cat');assert.equal(session.phase,'typing');assert.equal($('share').disabled,true);assert.equal($('whole').textContent,'12');
 now=8000;ctx.switchDebugPage('typing');assert.equal(session.value,'cat');assert.equal(session.seconds(now),2);assert.equal(ctx.completed,false);assert.equal(ctx.input.disabled,false);assert.equal($('share').disabled,false);
});
