import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../web/motion.js',import.meta.url),'utf8').replaceAll('export ','');
function setup(reduced=false){
 const animations=[],timeouts=[];
 class Node{
  constructor(){this.style={};this.dataset={};this.children=[];this.textContent='';}
  append(n){this.children.push(n);}replaceChildren(){this.children=[];}setAttribute(){}remove(){this.removed=true;}
  getBoundingClientRect(){return {width:360,height:740};}
  animate(frames,options){const a={frames,options,finished:Promise.resolve(),cancel(){this.cancelled=true;}};animations.push(a);return a;}
 }
 const document={createElement:()=>new Node(),body:new Node()};
 const api=runInNewContext(source+';({RollingTimer,morphGlyphs,pairGlyphs,fallGlyphs,captureGlyphs,scatterPositions})',{document,Math,Promise,matchMedia:()=>({matches:reduced}),getComputedStyle:()=>({maskImage:'none'}),setTimeout:fn=>{timeouts.push(fn);return timeouts.length;},clearTimeout(){}});
 return {...api,Node,animations,timeouts,document};
}
test('timer animates only changed digits, carries correctly, and resets without rolling',()=>{
 const env=setup(),timer=new env.RollingTimer(new env.Node());timer.set(12,false);assert.equal(env.animations.length,0);
 timer.set(13);assert.equal(env.animations.length,2);timer.set(13);assert.equal(env.animations.length,2);
 timer.set(19,false);timer.set(20);assert.equal(env.animations.length,6);
 timer.set(0,false);assert.ok(env.animations.every(a=>a.cancelled));
});
test('English to longer Chinese morph changes glyphs and lands at every target',async()=>{
 const env=setup(),g=(text,x)=>({text,x,y:0,width:21,height:37,font:'21px/37px monospace',color:'#707070'});
 const after=[g('风',0),g('穿',21),g('过',42)];
 const effect=env.morphGlyphs([g('a',0),g('b',13)],after,{getBoundingClientRect:()=>({left:0,top:0,width:300,height:185})});
 env.timeouts.forEach(fn=>fn());const layer=env.document.body.children[0];
 assert.deepEqual(layer.children.map(n=>n.textContent).sort(),['穿','过','风'].sort());
 assert.equal(env.animations.length,3);assert.ok(env.animations.every(a=>a.frames.at(-1).opacity===1));
 await effect.finished;effect.cancel();assert.equal(layer.removed,true);
});
test('shorter article retires surplus old characters',()=>{
 const env=setup(),g=(text,x)=>({text,x,y:0,font:'21px monospace',color:'#777'});
 env.morphGlyphs([g('风',0),g('穿',21),g('过',42)],[g('a',0)],{getBoundingClientRect:()=>({left:0,top:0,width:300,height:185})});
 assert.equal(env.animations.filter(a=>a.frames.at(-1).opacity===0).length,2);
});
test('reduced motion skips particles and rolling',()=>{
 const env=setup(true);new env.RollingTimer(new env.Node()).set(1);
 env.morphGlyphs([],[],{});assert.equal(env.animations.length,0);assert.equal(env.document.body.children.length,0);
});

test('matching characters retain identity across a reordered passage',()=>{
 const env=setup(),a={text:'a'},b={text:'b'},z={text:'z'};
 const pairs=env.pairGlyphs([a,b,z],[{text:'b'},{text:'风'},{text:'a'}]);
 assert.equal(pairs[0].from,b);assert.equal(pairs[2].from,a);assert.equal(pairs[1].from,z);
});
test('pile stays bounded and keeps glyphs until explicitly cancelled',async()=>{
 const env=setup(),container=new env.Node();container.getBoundingClientRect=()=>({width:360,height:740});
 const effect=env.fallGlyphs(Array.from({length:300},()=>({text:'字',x:30,y:100,font:'21px monospace'})),container);
 assert.equal(effect.nodes.length,300);
 assert.ok(effect.nodes.every(n=>n.style.font==='21px monospace'&&n.style.color==='#fff'));
 assert.ok(env.animations.every(a=>a.frames.at(-1).opacity>0));
 assert.ok(effect.nodes.every(n=>parseFloat(n.style.bottom)<740));
 await effect.finished;assert.equal(container.children[0].removed,undefined);
 effect.cancel();assert.equal(container.children[0].removed,true);assert.ok(env.animations.every(a=>a.cancelled));
});

test('full article capture preserves offscreen characters and repeated letters',()=>{
 const env=setup(),texts=['风','a','a','，'];
 const nodes=texts.map((textContent,i)=>({textContent,getBoundingClientRect:()=>({left:0,top:-100+i*40,width:20,height:30})}));
 const viewport={getBoundingClientRect:()=>({left:0,top:0,height:40})};
 assert.equal(env.captureGlyphs(nodes,viewport).length,0);
 assert.deepEqual(Array.from(env.captureGlyphs(nodes,viewport,{all:true}),g=>g.text),texts);
});

test('irregular scatter retains every glyph without rotated bounding-box overlap',()=>{
 const env=setup();
 for(const count of [20,90,300,800])for(const [w,h] of [[360,740],[320,420]]){
  const positions=env.scatterPositions(Array.from({length:count},(_,i)=>({width:i%2?12:20,fontSize:20})),w,h);
  assert.equal(positions.length,count);
  for(let i=0;i<count;i++){
   const a=positions[i].bounds;assert.ok(a.left>=0&&a.right<=w&&a.bottom>=0&&a.top<=h);
   for(let j=0;j<i;j++){const b=positions[j].bounds;assert.ok(a.right<=b.left||a.left>=b.right||a.top<=b.bottom||a.bottom>=b.top,`overlap ${count}: ${i}/${j}`);}
  }
 }
});
test('wrong glyphs remain red and upper letters fade more than lower letters',()=>{
 const env=setup(),container=new env.Node();
 const result=env.fallGlyphs(Array.from({length:300},(_,i)=>({text:'字',wrong:i===0,x:0,y:0,width:20,fontSize:20,font:'20px serif'})),container);
 assert.equal(result.nodes[0].style.color,'#e17b7b');
 const indices=result.nodes.map((_,i)=>i).sort((a,b)=>parseFloat(result.nodes[a].style.bottom)-parseFloat(result.nodes[b].style.bottom));
 assert.ok(env.animations[indices.at(-1)].frames.at(-1).opacity<.15);
 assert.ok(env.animations[indices[0]].frames.at(-1).opacity>.9);
});
