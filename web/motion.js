// Snapshots use actual glyph bounds, so English and Chinese can have different layouts.
export function captureGlyphs(nodes,viewport,{all=false}={}){
 const box=viewport.getBoundingClientRect();
 return nodes.map(node=>{
  const r=node.getBoundingClientRect(),s=getComputedStyle(node);
  return {text:node.textContent,x:r.left-box.left,y:r.top-box.top,width:r.width,height:r.height,font:s.font,fontSize:parseFloat(s.fontSize),color:s.color,wrong:node.classList?.contains('wrong')??false};
 }).filter(g=>g.text.trim()&&(all||(g.y>=-1&&g.y+g.height<=box.height+1)));
}
// Prefer identical characters, then pair remaining slots for cross-language changes.
export function pairGlyphs(before,after){
 const unused=new Set(before.map((_,i)=>i));
 const pairs=after.map(to=>{const i=[...unused].find(i=>before[i].text===to.text);if(i!==undefined)unused.delete(i);return {from:i===undefined?null:before[i],to};});
 for(const pair of pairs)if(!pair.from&&unused.size){const i=unused.values().next().value;unused.delete(i);pair.from=before[i];}
 return pairs.concat([...unused].map(i=>({from:before[i],to:null})));
}
export function morphGlyphs(before,after,viewport){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return {finished:Promise.resolve(),cancel(){}};
 const box=viewport.getBoundingClientRect(),layer=document.createElement('div');
 layer.className='morph-layer';layer.setAttribute('aria-hidden','true');layer.dataset.stage='assemble';
 Object.assign(layer.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});
 document.body.append(layer);
 const animations=[],timers=[];
 pairGlyphs(before,after).forEach(({from,to},i)=>{
  const start=from??{...to,x:to.x+(Math.random()-.5)*80,y:to.y+70};
  const end=to??{...from,x:from.x+(Math.random()-.5)*100,y:from.y+80};
  const dx=end.x-start.x,dy=end.y-start.y;
  const bend=(Math.random()-.5)*80,swap=.24+Math.random()*.22,duration=650+Math.random()*170;
  const same=from?.text===to?.text;
  const node=document.createElement('span');node.className='morph-glyph';node.textContent=start.text;
  Object.assign(node.style,{left:start.x+'px',top:start.y+'px',font:start.font,color:start.color});layer.append(node);
  const transform=(x,y,s=1,r=0)=>`translate(${x}px,${y}px) rotate(${r}deg) scaleX(${s})`;
  animations.push(node.animate([
   {transform:transform(0,0),opacity:from?1:0,offset:0},
   {transform:transform(dx*.12+bend,dy*.12-25,1,bend*.4),opacity:1,offset:.16},
   {transform:transform(dx*.48+bend*.5,dy*.48,same?1:.05),opacity:1,offset:swap},
   {transform:transform(dx*.53+bend*.4,dy*.53,same?1:.05),opacity:1,offset:swap+.035},
   {transform:transform(dx,dy-4),opacity:to?1:0,offset:.83},
   {transform:transform(dx,dy+1),opacity:to?1:0,offset:.94},
   {transform:transform(dx,dy),opacity:to?1:0,offset:1}
  ],{duration,easing:'linear',fill:'forwards'}));
  timers.push(setTimeout(()=>{if(to){node.textContent=to.text;node.style.font=to.font;node.style.color=to.color;}},duration*(swap+.017)));
 });
 return {finished:Promise.allSettled(animations.map(a=>a.finished)),cancel(){timers.forEach(clearTimeout);animations.forEach(a=>a.cancel());layer.remove();}};
}

// Reserve rotation-aware cells, then vary column heights rather than forcing a peak.
export function scatterPositions(glyphs,width,height){
 if(!glyphs.length)return [];
 const sizes=glyphs.map(g=>{
  const size=g.fontSize||parseFloat(g.font?.match(/([\d.]+)px/)?.[1])||20;
  return {size,w:Math.max(size*.65,(g.width||size)*1.25),h:size*1.35,angle:(Math.random()-.5)*44};
 });
 const bounds=sizes.map(g=>{const a=Math.abs(g.angle)*Math.PI/180;return {w:g.w*Math.cos(a)+g.h*Math.sin(a),h:g.h*Math.cos(a)+g.w*Math.sin(a)};});
 const maxW=Math.max(...bounds.map(g=>g.w))+6,maxH=Math.max(...bounds.map(g=>g.h))+7;
 const availableW=Math.max(1,width-24),availableH=Math.max(1,height-24);
 let scale=1,cols,rows;
 do{cols=Math.max(1,Math.floor(availableW/(maxW*scale)));rows=Math.max(1,Math.floor(availableH/(maxH*scale)));if(cols*rows>=Math.ceil(glyphs.length*1.12))break;scale*=.95;}while(scale>.02);
 const cellW=availableW/cols,cellH=maxH*scale,slots=[];
 for(let col=0;col<cols;col++){
  const weight=.65+Math.random()*.7,stagger=Math.random()*Math.max(0,availableH-rows*cellH);
  for(let row=0;row<rows;row++)slots.push({col,row,stagger,priority:(row+.25)/weight+Math.random()*.18});
 }
 slots.sort((a,b)=>a.priority-b.priority);slots.length=glyphs.length;
 for(let i=slots.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
 return sizes.map((g,i)=>{
  const slot=slots[i],w=g.w*scale,h=g.h*scale;
  const cx=12+(slot.col+.5)*cellW+(Math.random()-.5)*2*scale;
  const cy=12+slot.stagger+(slot.row+.5)*cellH+(Math.random()-.5)*2*scale;
  return {x:cx-w/2,bottom:cy-h/2,width:w,height:h,fontSize:g.size*scale,angle:g.angle,
   bounds:{left:cx-bounds[i].w*scale/2,right:cx+bounds[i].w*scale/2,bottom:cy-bounds[i].h*scale/2,top:cy+bounds[i].h*scale/2}};
 });
}
// Keep all characters behind controls; higher letters fade into the background.
export function fallGlyphs(glyphs,container){
 const layer=document.createElement('div');layer.className='letter-pile';layer.setAttribute('aria-hidden','true');container.append(layer);
 const box=layer.getBoundingClientRect(),animations=[],nodes=[];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const selected=glyphs.filter(g=>g.text.trim()),positions=scatterPositions(selected,box.width,box.height);
 const actions=container.querySelector?.('.actions')?.getBoundingClientRect();
 const fadeStart=actions&&actions.height>0?Math.max(24,box.bottom-actions.bottom):Math.min(160,box.height*.25);
 selected.forEach((g,i)=>{
  const {x,bottom,width,height,fontSize,angle}=positions[i];
  const elevation=Math.max(0,Math.min(1,(bottom+height/2-fadeStart)/Math.max(1,box.height-fadeStart)));
  const opacity=.055+.945*Math.pow(1-elevation,2.1);
  const node=document.createElement('span');node.className='pile-glyph';node.textContent=g.text;
  Object.assign(node.style,{left:x+'px',bottom:bottom+'px',width:width+'px',height:height+'px',font:g.font,fontSize:fontSize+'px',lineHeight:height+'px',textAlign:'center',fontWeight:'700',color:g.wrong?'#e17b7b':'#fff'});layer.append(node);nodes.push(node);
  const sx=g.x-x,sy=Math.max(0,g.y)-(box.height-bottom-height),kick=(Math.random()-.5)*70;
  const tr=(x,y,r)=>`translate(${x}px,${y}px) rotate(${r}deg)`;
  const frames=[
   {transform:tr(sx,sy,0),opacity:1,offset:0},
   {transform:tr(sx+kick,sy-22,angle*.35),opacity:1,offset:.14,easing:'cubic-bezier(.45,0,1,1)'},
   {transform:tr(0,0,angle+6),opacity,offset:.74,easing:'ease-out'},
   {transform:tr(0,-8,angle-3),opacity,offset:.86,easing:'ease-in'},
   {transform:tr(0,0,angle),opacity,offset:1}
  ];
  animations.push(node.animate(reduced?[frames.at(-1)]:frames,{duration:reduced?0:950+Math.random()*350,fill:'forwards',easing:'linear'}));
 });
 return {duration:reduced?0:1300,nodes,finished:Promise.allSettled(animations.map(a=>a.finished)),cancel(){animations.forEach(a=>a.cancel());layer.remove();}};
}

export class RollingTimer{
 constructor(node){this.node=node;this.value=null;this.animations=[];}
 set(value,animate=true){
  const next=String(value);if(next===this.value)return;
  const previous=this.value;this.value=next;this.animations.forEach(a=>a.cancel());this.animations=[];
  const move=animate&&previous!==null&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  const old=(previous??'').padStart(next.length,' ');
  this.node.replaceChildren();this.node.setAttribute('aria-label',next+' 秒');
  Array.from(next).forEach((digit,i)=>{
   const slot=document.createElement('span');slot.className='timer-digit';
   const current=document.createElement('span');current.className='timer-current';current.textContent=digit;slot.append(current);
   if(move&&old[i]!==digit){
    const outgoing=document.createElement('span');outgoing.className='timer-outgoing';outgoing.textContent=old[i];outgoing.setAttribute('aria-hidden','true');slot.append(outgoing);
    this.animations.push(outgoing.animate([{transform:'translateY(0) rotateX(0deg)'},{transform:'translateY(-110%) rotateX(65deg)'}],{duration:220,fill:'forwards',easing:'ease-in'}));
    this.animations.push(current.animate([{transform:'translateY(110%) rotateX(-65deg)'},{transform:'translateY(-12%) rotateX(0deg)',offset:.78},{transform:'translateY(0) rotateX(0deg)'}],{duration:260,easing:'cubic-bezier(.15,.7,.25,1)'}));
   }
   this.node.append(slot);
  });
 }
}

// Presentation only: the measured result and share data never change.
export function countUpSeconds(seconds,render,{duration=900,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,request=requestAnimationFrame,cancel=cancelAnimationFrame}={}){
 let frame,started=null,stopped=false;
 const target=Math.max(0,Math.round(seconds*100));
 if(reduced){render((target/100).toFixed(2));return {cancel(){}};}
 render('0.00');
 function tick(now){
  if(stopped)return;
  started??=now;
  const progress=Math.min(1,Math.max(0,(now-started)/duration));
  const value=progress===1?target:Math.floor(target*(1-Math.pow(1-progress,3)));
  render((value/100).toFixed(2));
  if(progress<1)frame=request(tick);
 }
 frame=request(tick);
 return {cancel(){stopped=true;cancel(frame);}};
}
