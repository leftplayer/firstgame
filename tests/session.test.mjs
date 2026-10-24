import test from 'node:test';
import assert from 'node:assert/strict';
import { TypingSession, chooseArticle } from '../assets/scripts/TypingSession.ts';
test('starts at first input including timestamp zero', () => { const s=new TypingSession('ab'); s.input('',0); assert.equal(s.phase,'ready'); s.input('a',0); assert.equal(s.seconds(1500),1.5); });
test('errors block completion and correction finishes',()=>{const s=new TypingSession('ab');s.input('ax',100);assert.deepEqual(s.states,['correct','wrong']);assert.equal(s.phase,'typing');s.input('ab',2100);assert.equal(s.phase,'finished');assert.equal(s.seconds(9000),2);});
test('deletion preserves original start time',()=>{const s=new TypingSession('ab');s.input('a',100);s.input('',1000);s.input('ab',2100);assert.equal(s.seconds(9999),2);});
test('finished result is immutable',()=>{const s=new TypingSession('a');s.input('a',100);s.input('',200);assert.equal(s.value,'a');});
test('unicode characters and composition normalization',()=>{const s=new TypingSession('é😀');s.input('e\u0301',100);assert.equal(s.cursor,1);s.input('é😀',1200);assert.equal(s.phase,'finished');});
test('input is bounded by article length',()=>{const s=new TypingSession('ab');s.input('abc',100);assert.equal(s.value,'ab');});
test('restart excludes current article',()=>{const a=[{id:'a',text:'a'},{id:'b',text:'b'}];assert.equal(chooseArticle(a,'a',()=>0).id,'b');assert.equal(chooseArticle([a[0]],'a').id,'a');});
test('empty configuration fails explicitly',()=>{assert.throws(()=>new TypingSession(''));assert.throws(()=>chooseArticle([]));});

test('web mode finishes full length with errors and reports final accuracy and speed',()=>{
 const s=new TypingSession('风穿过。',true);s.start(1000);s.input('风错过。',31000);
 assert.equal(s.phase,'finished');assert.deepEqual(s.stats(99999),{characters:4,correct:3,accuracy:75,cpm:6,words:0,wpm:0});
});
test('preedit cannot end round until composition commits, even with unchanged text',()=>{
 const s=new TypingSession('ab',true);s.start(1000);s.input('ax',2000,false);assert.equal(s.phase,'typing');
 s.input('ax',3000,true);assert.equal(s.phase,'finished');assert.equal(s.seconds(9999),2);
});
test('statistics handle unicode and zero duration without infinity',()=>{
 const s=new TypingSession('😀。',true);s.input('😀。',1000);assert.deepEqual(s.stats(1000),{characters:2,correct:2,accuracy:100,cpm:null,words:0,wpm:0});
});

test('WPM uses actual English word count rather than five-character units',()=>{
 const s=new TypingSession('cat and dog sun and sky',true);s.start(1000);s.input('cat and dog sun and sky',31000);
 const stats=s.stats(90000);assert.equal(stats.words,6);assert.equal(stats.wpm,12);assert.equal(stats.characters,23);
});
test('word count ignores punctuation and preserves apostrophes and hyphenated words',()=>{
 const s=new TypingSession("don't stop, well-known friend!",true);s.start(0);s.input(s.target,60000);assert.equal(s.stats(60000).words,4);
});

test('Chinese CPM counts correct committed characters including punctuation',()=>{
 const s=new TypingSession('臣本布衣，躬耕于南阳。',true);s.start(0);
 s.input('臣本布依，躬耕于南阳。',30000);
 assert.equal(s.phase,'finished');assert.equal(s.stats(30000).cpm,20);
 assert.equal(s.stats(30000).characters,11);
});

test('sub-second Chinese composition computes CPM from precise elapsed time',()=>{
 const s=new TypingSession('你好',true);s.start(1000);s.input('你好',1250);
 assert.equal(s.seconds(9999),.25);assert.equal(s.stats(9999).cpm,480);
});
test('zero elapsed time is unavailable rather than a false zero speed',()=>{
 const s=new TypingSession('你好',true);s.input('你好',1000);assert.equal(s.stats(1000).cpm,null);
 const wrong=new TypingSession('你好',true);wrong.start(1000);wrong.input('再见',1500);assert.equal(wrong.stats(1500).cpm,0);
});
