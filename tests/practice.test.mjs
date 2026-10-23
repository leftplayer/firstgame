import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareArticle} from '../web/practice.js';
import {TypingSession} from '../assets/scripts/TypingSession.ts';
const articles=JSON.parse(readFileSync(new URL('../assets/resources/articles.json',import.meta.url)));
const readings=JSON.parse(readFileSync(new URL('../web/pinyin.json',import.meta.url)));
test('every Chinese article has explicit readings and needs only lower-case letters',()=>{
 for(const article of articles.filter(a=>a.language==='zh')){
  const p=prepareArticle(article,readings);assert.match(p.target,/^[a-z]+$/);assert.equal(p.units.map(u=>u.text).join(''),article.text);
  assert.equal(p.units.map(u=>u.reading).join(''),p.target);
  const session=new TypingSession(p.target);session.input(p.target,123);assert.equal(session.phase,'finished');
 }
});
test('one Chinese character consumes all its pinyin letters, punctuation consumes none',()=>{
 const p=prepareArticle({id:'test',language:'zh',text:'风，过。'},{test:'feng guo'});
 assert.equal(p.target,'fengguo');assert.deepEqual(p.units.map(u=>[u.start,u.end]),[[0,4],[4,4],[4,7],[7,7]]);
});
test('missing readings fail instead of silently removing characters',()=>assert.throws(()=>prepareArticle({id:'test',language:'zh',text:'风'},{test:''})));
test('English preserves spaces, punctuation and case',()=>{const p=prepareArticle({language:'en',text:'A word.'},{});assert.equal(p.target,'A word.');});
