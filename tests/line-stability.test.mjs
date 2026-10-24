import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {TypingFeedback} from '../web/feedback.js';
const app=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const align=app.slice(app.indexOf('function alignActiveLine(){'),app.indexOf("window.addEventListener('resize',()=>requestAnimationFrame(alignActiveLine))"));
for(const wrong of [false,true])test(`active row stays second throughout ${wrong?'error shake':'correct bounce'} and advances only at a real wrap`,()=>{
 globalThis.matchMedia=()=>({matches:false});
 const feedback=new TypingFeedback();
 // Model DOM offsets: relative top/left affect offsets, transforms do not.
 const nodes=Array.from({length:24},(_,i)=>({frame:{},frames:[],textContent:'a',classList:{toggle(){}},
 get offsetTop(){return Math.floor(i/6)*37+(parseFloat(this.frame.top)||0);},
 get offsetLeft(){return i%6*20+(parseFloat(this.frame.left)||0);},
 animate(frames){this.frames=frames;return {cancel(){}};}}));
 const article={style:{}},box={},caret={style:{}},session={cursor:0};
 const ctx={session,caret,completed:false,glyphs:nodes.map((node,i)=>({end:i+1,node})),$:id=>id==='article'?article:box};
 runInNewContext(align,ctx);
 for(const cursor of [6,7,8,11,12,13,17,18]){
  session.cursor=cursor;
  const previous=Array(cursor-1).fill('a'),current=Array(cursor).fill('a'),states=current.map(()=>wrong?'wrong':'correct');
  feedback.strike(previous,current,states,nodes);
  for(const frame of nodes[cursor-1].frames){
   nodes[cursor-1].frame=frame;ctx.alignActiveLine();
   const expectedFirst=Math.max(0,Math.floor(cursor/6)-1)*37;
   assert.equal(article.style.transform,`translateY(${-expectedFirst}px)`, `cursor=${cursor}, frame=${JSON.stringify(frame)}`);
   assert.equal(parseFloat(caret.style.top)-expectedFirst,37);
  }
  nodes[cursor-1].frame={};
 }
});
