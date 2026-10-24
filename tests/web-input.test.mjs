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
 const context={article:{language:'zh'},feedback:{space(){},combo(){},strike(){},error(){errorSounds++;}},session,input,spans,completed:false,composing:false,Date,alignActiveLine(){},$(){return {textContent:''}},finish(){}};
 runInNewContext(accept,context);context.accept();
 assert.equal(input.value,'风穿错');assert.equal(session.cursor,3);assert.equal(spans[2].className,'glyph wrong');
 input.value+='窗边，翻动';context.accept();
 assert.equal(input.value,'风穿错窗边，翻动');assert.equal(session.cursor,8);assert.equal(spans[7].className,'glyph correct');assert.equal(errorSounds,1);
 context.accept();assert.equal(errorSounds,1);
});

test('English last predicted letter finishes without Enter or compositionend',()=>{
 const target='cat and dog sun and sky bird';
 const session=new TypingSession(target,true);session.start(1000);
 const handlers={},input={value:'cat and dog sun and sky ',selectionStart:23,selectionEnd:23,addEventListener:(name,fn)=>handlers[name]=fn};
 const context={article:{language:'en'},session,input,spans:Array.from(target,()=>({className:''})),completed:false,composing:false,Date,feedback:{space(){},combo(){},strike(){},error(){}},alignActiveLine(){},$(){return {textContent:''}},startClock(){},clearPending(){},compositionStart:0,compositionEnd:0,compositionBase:'',finish(){context.completed=true;}};
 const events=source.slice(source.indexOf("input.addEventListener('compositionstart'"),source.indexOf("input.addEventListener('paste'"));
 runInNewContext(accept+events,context);
 handlers.compositionstart();handlers.compositionupdate({data:'bir'});assert.equal(session.phase,'typing');
 handlers.compositionupdate({data:'bird'});assert.equal(session.phase,'finished');assert.equal(session.cursor,28);assert.equal(context.completed,true);
});
test('Chinese preedit still waits for actual Chinese characters',()=>{
 const session=new TypingSession('风',true);
 const context={article:{language:'zh'},session,input:{value:''},spans:[{}],completed:false,composing:true,Date,feedback:{space(){},combo(){},strike(){},error(){}},alignActiveLine(){},$(){return {textContent:''}},finish(){throw Error('Must not finish preedit');}};
 runInNewContext(accept,context);context.accept('f',true);assert.equal(session.phase,'typing');
});


test('completion locks the editor and dismisses the keyboard even without VirtualKeyboard API',()=>{
 const dismiss=source.slice(source.indexOf('function dismissKeyboard('),source.indexOf('function finish('));
 for(const navigator of [{},{virtualKeyboard:{hide(){throw Error('unsupported');}}}]){
  const input={readOnly:false,disabled:false,focused:true,blur(){this.focused=false;}};
  const context={input,navigator};runInNewContext(dismiss,context);context.dismissKeyboard();
  assert.equal(input.focused,false);assert.equal(input.readOnly,true);assert.equal(input.disabled,true);
 }
});
