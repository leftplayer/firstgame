import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf(' let word;'),source.indexOf(" caret=document.createElement('span')"));
test('English spaces remain typeable inside the previous unbroken word, never standalone wrap items',()=>{
 function node(){return {children:[],dataset:{},className:'',classList:{contains(c){return this.owner.className===c;}},append(n){this.children.push(n);n.parent=this;},get lastElementChild(){return this.children.at(-1);}};}
 const create=()=>{const n=node();n.classList.owner=n;return n;},root=create();
 const text='cat and  dog sun';const spans=[],glyphs=[];
 runInNewContext(code,{document:{createElement:create},$:()=>root,article:{language:'en'},practice:{units:Array.from(text).map((text,i)=>({text,start:i,end:i+1}))},spans,glyphs});
 assert.equal(spans.map(n=>n.textContent).join(''),text);
 assert.deepEqual(root.children.map(n=>n.children.map(g=>g.textContent).join('')),['cat ','and  ','dog ','sun']);
 for(let i=1;i<spans.length;i++)if(spans[i].textContent===' ')assert.equal(spans[i].parent,spans[i-1].parent);
});
