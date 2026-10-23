import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {TypingSession} from '../assets/scripts/TypingSession.ts';
const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const accept=source.slice(source.indexOf('function accept('),source.indexOf('function alignActiveLine('));
test('actual web accept handler retains wrong Chinese and advances through following commits',()=>{
 const session=new TypingSession('风穿过窗边，翻动'),input={value:'风穿错'},spans=Array.from(session.target,()=>({className:''}));
 let errorSounds=0;
 const context={feedback:{error(){errorSounds++;}},session,input,spans,completed:false,composing:false,Date,alignActiveLine(){},$(){return {textContent:''}},finish(){}};
 runInNewContext(accept,context);context.accept();
 assert.equal(input.value,'风穿错');assert.equal(session.cursor,3);assert.equal(spans[2].className,'glyph wrong');
 input.value+='窗边，翻动';context.accept();
 assert.equal(input.value,'风穿错窗边，翻动');assert.equal(session.cursor,8);assert.equal(spans[7].className,'glyph correct');assert.equal(errorSounds,1);
 context.accept();assert.equal(errorSounds,1);
});
