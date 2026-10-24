import test from 'node:test';
import assert from 'node:assert/strict';
import {countUpSeconds} from '../web/motion.js';
import {TypingFeedback} from '../web/feedback.js';
function scheduler(){let pending;return {request(fn){pending=fn;return 1;},cancel(){pending=null;},step(time){const fn=pending;pending=null;fn?.(time);}};}
test('result counts from zero monotonically to exact rounded time and stops',()=>{
 const clock=scheduler(),values=[];
 countUpSeconds(12.345,v=>values.push(v),{...clock,reduced:false});
 [0,200,450,899,900,1200].forEach(clock.step);
 assert.equal(values[0],'0.00');assert.equal(values.at(-1),'12.35');
 assert.ok(values.every((v,i)=>!i||Number(v)>=Number(values[i-1])));
 assert.equal(values.filter(v=>v==='12.35').length,1);
});
test('restart cancels result animation and reduced motion gives final value immediately',()=>{
 const clock=scheduler(),values=[];
 const animation=countUpSeconds(100,v=>values.push(v),{...clock,reduced:false});clock.step(0);animation.cancel();clock.step(900);assert.equal(values.at(-1),'0.00');
 countUpSeconds(3.2,v=>values.push(v),{...clock,reduced:true});assert.equal(values.at(-1),'3.20');
});
test('combo supports Chinese batches, ignores spaces, resets after errors and prevents duplicate rewards',()=>{
 globalThis.matchMedia=()=>({matches:false});
 const feedback=new TypingFeedback();let effects=0;
 const play=(previous,text,wrong=[])=>{const chars=Array.from(text);feedback.combo(Array.from(previous),chars,chars.map((_,i)=>wrong.includes(i)?'wrong':'correct'),chars.map(textContent=>({textContent,animate(){effects++;return {cancel(){}};}})));};
 play('','一二三四五六七八九');assert.equal(effects,0);
 play('一二三四五六七八九','一二三四五六七八九十');assert.ok(effects>0);const before=effects;
 play('一二三四五六七八九十','一二三四五六七八九十');assert.equal(effects,before);
 feedback.reset();play('','ab cd ef gh i');assert.equal(effects,before);
 play('ab cd ef gh i','ab cd ef gh ij');assert.ok(effects>before);
 feedback.reset();const mark=effects;play('','abcdefghijklmnopqrs',[9]);assert.equal(effects,mark);
 play('abcdefghijklmnopqrs','abcdefghijklmnopqrst',[9]);assert.ok(effects>mark);
});
test('space sound cancels generic delayed click and repeated space events are throttled',()=>{
 const feedback=new TypingFeedback(),tones=[];feedback.unlock=()=>{};feedback.tone=(...args)=>tones.push(args);
 feedback.tapTimer=setTimeout(()=>assert.fail('generic click should be cancelled'),10);
 feedback.space();feedback.space();assert.equal(tones.length,2);assert.equal(tones[0][0],240);
});
test('per-key effects skip duplicate IME events and spaces, animate errors, and clear on restart',()=>{
 globalThis.matchMedia=()=>({matches:false});
 const feedback=new TypingFeedback(),effects=[];
 const nodes=['a',' ','x'].map(textContent=>({textContent,animate(frames){const a={frames,cancel(){this.cancelled=true;}};effects.push(a);return a;}}));
 feedback.strike([],['a',' ','x'],['correct','correct','wrong'],nodes);
 assert.equal(effects.length,2);assert.ok(effects[1].frames.some(f=>f.left==='-3px'));
 feedback.strike(['a',' ','x'],['a',' ','x'],['correct','correct','wrong'],nodes);assert.equal(effects.length,2);
 feedback.reset();assert.ok(effects.every(a=>a.cancelled));assert.equal(feedback.strikes.size,0);
});
test('batch typing and streak glow never move glyphs vertically',()=>{
 globalThis.matchMedia=()=>({matches:false});const feedback=new TypingFeedback(),frames=[];
 const chars=Array.from('abcdefghij'),nodes=chars.map(textContent=>({textContent,animate(f){frames.push(...f);return {cancel(){}};}}));
 feedback.strike([],chars,chars.map(()=> 'correct'),nodes);feedback.combo([],chars,chars.map(()=> 'correct'),nodes);
 assert.ok(frames.length>0);assert.ok(frames.every(f=>!('top' in f)&&!('transform' in f)&&!('translate' in f)));
});

test('single correct character bounces and returns to its baseline',()=>{
 globalThis.matchMedia=()=>({matches:false});const feedback=new TypingFeedback(),frames=[];
 feedback.strike([],['a'],['correct'],[{textContent:'a',animate(f){frames.push(...f);return {cancel(){}};}}]);
 assert.equal(frames[0].top,'0px');assert.ok(frames.some(f=>f.top==='-4px'));assert.equal(frames.at(-1).top,'0px');
});
