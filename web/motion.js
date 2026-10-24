// Snapshots use actual glyph bounds, so English and Chinese can have different layouts.
export function captureGlyphs(nodes,viewport,{all=false}={}){
 const box=viewport.getBoundingClientRect();
 return nodes.map(node=>{
  const r=node.getBoundingClientRect(),s=getComputedStyle(node);
  return {text:node.textContent,x:r.left-box.left,y:r.top-box.top,width:r.width,height:r.height,font:s.font,fontFamily:s.fontFamily,fontSize:parseFloat(s.fontSize),color:s.color,wrong:node.classList?.contains('wrong')??false};
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

// Pack individual rotated bounds, without fixed-width columns or reserved cell gaps.
export function scatterPositions(glyphs,width,height){
 if(!glyphs.length)return [];
 const sizes=glyphs.map(g=>{
  const size=g.fontSize||parseFloat(g.font?.match(/([\d.]+)px/)?.[1])||20;
  const w=Math.max(size*.25,g.width||size),h=size;
  const angle=Math.random()*360,a=angle*Math.PI/180;
  return {size,w,h,angle,bw:w*Math.abs(Math.cos(a))+h*Math.abs(Math.sin(a)),bh:h*Math.abs(Math.cos(a))+w*Math.abs(Math.sin(a))};
 });
 const availableW=Math.max(1,width-24),availableH=Math.max(1,height-24);
 const phase=Math.random()*Math.PI*2;
 let scale=Math.min(1,availableW/Math.max(...sizes.map(g=>g.bw)),Math.sqrt(availableW*availableH*.8/sizes.reduce((sum,g)=>sum+g.bw*g.bh,0)));
 for(;;){
  const placed=[];
  for(const g of sizes){
   const bw=g.bw*scale,bh=g.bh*scale,w=g.w*scale,h=g.h*scale;
   // Every existing left/right edge is a possible contact, not a shared grid.
   const candidates=[12,12+availableW-bw];
   for(let i=0;i<placed.length;i+=Math.max(1,Math.floor(placed.length/60))){const q=placed[i];candidates.push(q.bounds.right,q.bounds.left-bw); }
   let best=null;
   for(const left of candidates){
    if(left<12||left+bw>width-12+.000001)continue;
    let bottom=12;
    for(const q of placed)if(left<q.bounds.right&&left+bw>q.bounds.left)bottom=Math.max(bottom,q.bounds.top);
    // A small broad wave leaves an uneven skyline without opening gaps below it.
    const score=bottom+Math.sin(left/availableW*Math.PI*3+phase)*18*scale;
    if(!best||score<best.score)best={left,bottom,score};
   }
   const {left,bottom}=best,cx=left+bw/2,cy=bottom+bh/2;
   placed.push({x:cx-w/2,bottom:cy-h/2,width:w,height:h,fontSize:g.size*scale,angle:g.angle,
    bounds:{left,right:left+bw,bottom,top:bottom+bh}});
  }
  if(Math.max(...placed.map(p=>p.bounds.top))<=height-12)return placed;
  scale*=.94;
 }
}
// Columns follow the visible ink silhouette, not the empty rotated rectangle.
export function packInkProfiles(profiles,width,height){
 const margin=4,sky=new Float64Array(width).fill(margin),placed=[];
 const phase=Math.random()*Math.PI*2;
 for(const p of profiles){
  let best=null;
  for(let x=margin;x+p.width<=width-margin;x++){
   let y=margin;
   for(let c=0;c<p.width;c++)if(p.low[c]!==Infinity)y=Math.max(y,sky[x+c]-p.low[c]);
   const score=y+Math.sin(x/width*Math.PI*3+phase)*12;
   if(!best||score<best.score)best={x,y,score};
  }
  if(!best||best.y+p.height>height-margin)return null;
  for(let c=0;c<p.width;c++)if(p.low[c]!==Infinity)sky[best.x+c]=Math.max(sky[best.x+c],best.y+p.high[c]+1);
  placed.push({...p,x:best.x,bottom:best.y});
 }
 return placed;
}
function inkSprite(g,size,angle){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext?.('2d',{willReadFrequently:true});
 if(!ctx)return null;
 const ratio=2,side=Math.ceil(size*2.5);canvas.width=canvas.height=side*ratio;
 const family=g.fontFamily||g.font?.replace(/^.*?[\d.]+px(?:\s*\/\s*[\d.]+px)?\s*/,'')||'sans-serif';
 ctx.scale(ratio,ratio);ctx.translate(side/2,side/2);ctx.rotate(angle*Math.PI/180);
 ctx.font=`700 ${size}px ${family}`;ctx.fillStyle=g.wrong?'#e17b7b':'#fff';
 const m=ctx.measureText(g.text);
 ctx.fillText(g.text,(m.actualBoundingBoxLeft-m.actualBoundingBoxRight)/2,(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2);
 const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
 let left=side,top=side,right=0,bottom=0;const pixels=[];
 for(let y=0;y<side;y++)for(let x=0;x<side;x++){
  let ink=false;
  for(let dy=0;dy<ratio;dy++)for(let dx=0;dx<ratio;dx++)if(data[((y*ratio+dy)*canvas.width+x*ratio+dx)*4+3]>2)ink=true;
  if(ink){pixels.push([x,y]);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 }
 if(!pixels.length)return null;
 const width=right-left+1,height=bottom-top+1,low=new Array(width).fill(Infinity),high=new Array(width).fill(-Infinity);
 for(const [x,y] of pixels){const c=x-left,v=bottom-y;low[c]=Math.min(low[c],v);high[c]=Math.max(high[c],v);}
 const sprite=document.createElement('canvas');sprite.width=width*ratio;sprite.height=height*ratio;
 sprite.getContext('2d').drawImage(canvas,left*ratio,top*ratio,width*ratio,height*ratio,0,0,width*ratio,height*ratio);
 return {width,height,low,high,sprite,angle,fontSize:size};
}
export function scatterInk(glyphs,width,height){
 if(!document.createElement('canvas').getContext)return null;
 const angles=glyphs.map(()=>Math.random()*360);
 let scale=1;
 while(scale>.05){
  const profiles=glyphs.map((g,i)=>inkSprite(g,(g.fontSize||20)*scale,angles[i]));
  if(profiles.some(p=>!p))return null;
  const placed=packInkProfiles(profiles,Math.floor(width),Math.floor(height));
  if(placed)return placed;
  scale*=.9;
 }
 return null;
}

// Keep all characters behind controls; higher letters fade into the background.
export function fallGlyphs(glyphs,container){
 const layer=document.createElement('div');layer.className='letter-pile';layer.setAttribute('aria-hidden','true');container.append(layer);
 const box=layer.getBoundingClientRect(),animations=[],nodes=[];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const selected=glyphs.filter(g=>g.text.trim()),positions=scatterInk(selected,box.width,box.height)||scatterPositions(selected,box.width,box.height);
 const actions=container.querySelector?.('.actions')?.getBoundingClientRect();
 const fadeStart=actions&&actions.height>0?Math.max(24,box.bottom-actions.bottom):Math.min(160,box.height*.25);
 selected.forEach((g,i)=>{
  const {x,bottom,width,height,fontSize,angle}=positions[i];
  const elevation=Math.max(0,Math.min(1,(bottom+height/2-fadeStart)/Math.max(1,box.height-fadeStart)));
  const opacity=.055+.945*Math.pow(1-elevation,2.1);
  const node=positions[i].sprite||document.createElement('span');node.className='pile-glyph';node.textContent=g.text;
  Object.assign(node.style,{left:x+'px',bottom:bottom+'px',width:width+'px',height:height+'px',font:g.font,fontSize:fontSize+'px',lineHeight:height+'px',textAlign:'center',fontWeight:'700',color:g.wrong?'#e17b7b':'#fff'});layer.append(node);nodes.push(node);
  const sx=g.x-x,sy=Math.max(0,g.y)-(box.height-bottom-height),kick=(Math.random()-.5)*70;
  const tr=(x,y,r)=>`translate(${x}px,${y}px) rotate(${r-(positions[i].sprite?angle:0)}deg)`;
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
