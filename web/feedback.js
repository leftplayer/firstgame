// Small synthesized clicks; no external audio downloads.
export class TypingFeedback {
 constructor(){this.audio=null;this.lastTap=-Infinity;this.lastError=-Infinity;this.tapTimer=null;}
 unlock(){
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;this.audio??=new Audio();if(this.audio.state==='suspended')return this.audio.resume().catch(()=>{});}catch{}
 }
 tone(frequency,duration=.035,delay=0,volume=.035,wave='triangle'){
  try{const a=this.audio;if(a?.state!=='running')return;
   const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+delay;
   o.type=wave;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(frequency*.55,t+duration);
   g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
   o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+duration);o.onended=()=>{o.disconnect();g.disconnect();};
  }catch{}
 }
 tap(){
  const now=performance.now();if(now-this.lastTap<35)return;this.lastTap=now;
  this.unlock();clearTimeout(this.tapTimer);this.tapTimer=setTimeout(()=>this.tone(620+Math.random()*90),20);
  try{navigator.vibrate?.(8);}catch{}
 }
 error(){
  clearTimeout(this.tapTimer);
  const now=performance.now();if(now-this.lastError<35)return;this.lastError=now;
  this.unlock();this.tone(175,.10,0,.07);this.tone(125,.10,.055,.05);
 }
 async button(){
  clearTimeout(this.tapTimer);await this.unlock();
  this.tone(440,.075,0,.045,'sine');this.tone(880,.09,.045,.035,'sine');
 }
 finish(){
  clearTimeout(this.tapTimer);
  this.unlock();[660,880,1100].forEach((f,i)=>this.tone(f,.12,i*.065,.045));
  try{navigator.vibrate?.([15,40,25]);}catch{}
 }
}

export function scatterCharacters(nodes,shuffle=false){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return {duration:0,cancel(){}};
 const layer=document.createElement('div');layer.className=shuffle?'burst-layer restart-layer':'burst-layer';layer.setAttribute('aria-hidden','true');
 const viewport=document.getElementById('viewport').getBoundingClientRect();
 const animations=[];
 const visible=nodes.map(node=>({node,rect:node.getBoundingClientRect()})).filter(({node,rect:r})=>r.top>=viewport.top&&r.bottom<=viewport.bottom+1&&node.textContent.trim());
 const duration=shuffle?420:650;
 nodes.forEach(node=>{
  const r=node.getBoundingClientRect();if(r.top<viewport.top||r.bottom>viewport.bottom+1||!node.textContent.trim())return;
  const particle=document.createElement('span'),style=getComputedStyle(node);
  particle.className='burst-character';particle.textContent=node.textContent;
  Object.assign(particle.style,{left:r.left+'px',top:r.top+'px',font:style.font,lineHeight:style.lineHeight,color:node.classList.contains('wrong')?'#e17b7b':'#fff'});
  layer.append(particle);
  if(shuffle){
   const other=visible[Math.floor(Math.random()*visible.length)];
   const x=other.rect.left-r.left,y=other.rect.top-r.top;
   animations.push(particle.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${x}px,${y}px)`,opacity:.9,offset:.7},{transform:`translate(${x}px,${y+8}px)`,opacity:0}],{duration,easing:'ease-in-out',fill:'forwards'}));
   return;
  }
  const x=(Math.random()-.5)*320,y=-70-Math.random()*170,angle=(Math.random()-.5)*160;
  animations.push(particle.animate([{transform:'translate(0,0) rotate(0deg)',opacity:1},{transform:`translate(${x*.55}px,${y}px) rotate(${angle*.5}deg)`,opacity:.8,offset:.45},{transform:`translate(${x}px,${y+220}px) rotate(${angle}deg)`,opacity:0}],{duration:650,easing:'cubic-bezier(.16,.6,.4,1)',fill:'forwards'}));
 });
 document.body.append(layer);
 return {duration,cancel(){animations.forEach(a=>a.cancel());layer.remove();}};
}
