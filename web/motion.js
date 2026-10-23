// Snapshots use actual glyph bounds, so English and Chinese can have different layouts.
export function captureGlyphs(nodes,viewport){
 const box=viewport.getBoundingClientRect();
 return nodes.map(node=>{
  const r=node.getBoundingClientRect(),s=getComputedStyle(node);
  return {text:node.textContent,x:r.left-box.left,y:r.top-box.top,width:r.width,height:r.height,font:s.font,color:s.color};
 }).filter(g=>g.text.trim()&&g.y>=-1&&g.y+g.height<=box.height+1);
}
export function morphGlyphs(before,after,viewport){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return {finished:Promise.resolve(),cancel(){}};
 const box=viewport.getBoundingClientRect(),layer=document.createElement('div');
 layer.className='morph-layer';layer.setAttribute('aria-hidden','true');layer.dataset.stage='scatter';
 Object.assign(layer.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px',maskImage:getComputedStyle(viewport).maskImage});
 document.body.append(layer);
 const animations=[],timers=[];
 const count=Math.max(before.length,after.length),order=Array.from({length:count},(_,i)=>i);
 for(let i=count-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 for(let i=0;i<count;i++){
  const from=before[i],to=after[order[i]];
  const start=from??{...to,x:box.width/2,y:box.height/2};
  const end=to??{...from,x:box.width/2,y:box.height/2};
  const midX=Math.random()*Math.max(0,box.width-25),midY=Math.random()*Math.max(0,box.height-37);
  const dx=end.x-start.x,dy=end.y-start.y,mx=midX-start.x,my=midY-start.y;
  const node=document.createElement('span');node.className='morph-glyph';node.textContent=start.text;
  Object.assign(node.style,{left:start.x+'px',top:start.y+'px',font:start.font,color:start.color});layer.append(node);
  const transform=(x,y,s=1,r=0)=>`translate(${x}px,${y}px) rotate(${r}deg) scaleX(${s})`;
  animations.push(node.animate([
   {transform:transform(0,0),opacity:from?1:0,offset:0},
   {transform:transform(mx,my,1,(i%2?1:-1)*35),opacity:1,offset:.28},
   {transform:transform(mx,my,.02),opacity:1,offset:.43},
   {transform:transform(mx,my,.02),opacity:1,offset:.46},
   {transform:transform(dx,dy-5),opacity:to?1:0,offset:.88},
   {transform:transform(dx,dy+2),opacity:to?1:0,offset:.95},
   {transform:transform(dx,dy),opacity:to?1:0,offset:1}
  ],{duration:760,easing:'linear',fill:'forwards'}));
  timers.push(setTimeout(()=>{if(to){node.textContent=to.text;node.style.font=to.font;node.style.color=to.color;}layer.dataset.stage='assemble';},338));
 }
 return {finished:Promise.allSettled(animations.map(a=>a.finished)),cancel(){timers.forEach(clearTimeout);animations.forEach(a=>a.cancel());layer.remove();}};
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
