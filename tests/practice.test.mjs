import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareArticle} from '../web/practice.js';
import {TypingSession} from '../assets/scripts/TypingSession.ts';
test('Chinese validates text including punctuation',()=>{assert.equal(prepareArticle({text:'风穿过，窗边。'}).target,'风穿过，窗边。');});
test('Chinese errors remain visible while later characters advance',()=>{
 const s=new TypingSession('风穿过窗边');s.input('风穿错窗边',1000);
 assert.equal(s.value,'风穿错窗边');assert.equal(s.cursor,5);
 assert.deepEqual(s.states,['correct','correct','wrong','correct','correct']);assert.equal(s.phase,'typing');
 s.input('风穿过窗边',2000);assert.equal(s.phase,'finished');
});
test('English errors do not block subsequent input',()=>{
 const s=new TypingSession('abc');s.input('xbc',1000);assert.equal(s.cursor,3);assert.deepEqual(s.states,['wrong','correct','correct']);
});
test('timer includes preedit duration and does not restart at commit',()=>{const s=new TypingSession('风');s.start(1000);s.start(2000);assert.equal(s.seconds(3000),2);s.input('风',4000);assert.equal(s.seconds(9999),3);});
