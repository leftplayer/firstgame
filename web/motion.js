// Snapshots use actual glyph bounds, so English and Chinese can have different layouts.
export function captureGlyphs(nodes,viewport,{all=false}={}){
 const box=viewport.getBoundingClientRect();
 return nodes.map(node=>{
  const r=node.getBoundingClientRect(),s=getComputedStyle(node);
  return {text:node.textContent,x:r.left-box.left,y:r.top-box.top,width:r.width,height:r.height,font:s.font,color:s.color};
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

// Build a tapered mound; keep every source glyph, including long passages.
export function moundPositions(count,width,height){
 if(!count)return [];
 const columns=Math.max(1,Math.min(Math.floor((width-40)/22),Math.ceil(Math.sqrt(count*2))));
 let rows=1,capacities;
 do{capacities=Array.from({length:rows},(_,r)=>Math.max(1,Math.round(columns*(1-r/rows))));if(capacities.reduce((a,b)=>a+b,0)>=count)break;rows++;}while(rows<count);
 const peak=Math.min(280,height*.36,Math.max(26,(rows-1)*15));
 const slots=[];
 capacities.forEach((capacity,row)=>{
  const level=rows===1?0:row/(rows-1);
  const span=Math.max(0,(capacity-1)*22);
  for(let col=0;col<capacity;col++)slots.push({x:(width-22-span)/2+(capacity===1?0:col*22),bottom:12+level*peak,level});
 });
 return Array.from({length:count},(_,i)=>{
  const slot=slots[count===1?0:Math.round(i*(slots.length-1)/(count-1))];
  return {...slot,x:Math.max(12,Math.min(width-34,slot.x+(Math.random()-.5)*7)),bottom:Math.max(8,slot.bottom+(Math.random()-.5)*5)};
 });
}
// A bottom-anchored mound stays behind result controls after the fall.
export function fallGlyphs(glyphs,container){
 const layer=document.createElement('div');layer.className='letter-pile';layer.setAttribute('aria-hidden','true');container.append(layer);
 const box=layer.getBoundingClientRect(),animations=[],nodes=[];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const selected=glyphs.filter(g=>g.text.trim());
 const positions=moundPositions(selected.length,box.width,box.height);
 // Randomize which character lands in each slot without changing the mound silhouette.
 for(let i=positions.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[positions[i],positions[j]]=[positions[j],positions[i]];}
 selected.forEach((g,i)=>{
  const {x,bottom,level}=positions[i],angle=(Math.random()-.5)*100;
  const shade=Math.round(90+165*level),color=`rgb(${shade}, ${shade}, ${shade})`;
  const node=document.createElement('span');node.className='pile-glyph';node.textContent=g.text;
  Object.assign(node.style,{left:x+'px',bottom:bottom+'px',font:g.font,fontWeight:'700',color});layer.append(node);nodes.push(node);
  const sx=g.x-x,sy=Math.max(0,g.y)-(box.height-bottom-37),kick=(Math.random()-.5)*90;
  const tr=(x,y,r)=>`translate(${x}px,${y}px) rotate(${r}deg)`;
  const frames=[
   {transform:tr(sx,sy,0),opacity:1,offset:0},
   {transform:tr(sx+kick,sy-22,angle*.35),opacity:1,offset:.14,easing:'cubic-bezier(.45,0,1,1)'},
   {transform:tr(0,0,angle+12),opacity:1,offset:.68,easing:'ease-out'},
   {transform:tr(kick*.08,-16,angle-8),opacity:1,offset:.79,easing:'ease-in'},
   {transform:tr(0,0,angle+3),opacity:1,offset:.90},
   {transform:tr(0,-3,angle-2),opacity:1,offset:.95},
   {transform:tr(0,0,angle),opacity:1,offset:1}
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
