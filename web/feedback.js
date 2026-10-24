// Small synthesized clicks; no external audio downloads.
export class TypingFeedback {
 constructor(){this.audio=null;this.lastTap=-Infinity;this.lastError=-Infinity;this.tapTimer=null;this.lastSpace=-Infinity;this.comboMarks=new Set();this.comboAnimations=[];this.strikes=new Map();}
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
  const now=performance.now();if(now-this.lastTap<35||now-this.lastSpace<60)return;this.lastTap=now;
  this.unlock();clearTimeout(this.tapTimer);this.tapTimer=setTimeout(()=>this.tone(620+Math.random()*90),20);
  try{navigator.vibrate?.(8);}catch{}
 }
 space(){
  clearTimeout(this.tapTimer);
  const now=performance.now();if(now-this.lastSpace<45)return;this.lastSpace=now;
  this.unlock();this.tone(240,.07,0,.045,'sine');this.tone(480,.035,.018,.025,'triangle');
 }
 reset(){this.strikes.forEach(a=>a.cancel());this.strikes.clear();this.comboMarks.clear();this.comboAnimations.forEach(a=>a.cancel());this.comboAnimations=[];}
 strike(previous,current,states,nodes){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  // Only a single changed character bounces; batch/IME commits stay still.
  const single=current.filter((char,i)=>char!==previous[i]&&!/\s/.test(char)).length===1;
  for(let i=Math.max(0,current.length-12);i<current.length;i++){
   if(current[i]===previous[i]||/\s/.test(current[i]))continue;
   const node=nodes[i];if(!node)continue;
   this.strikes.get(node)?.cancel();
   if(this.strikes.size>=24){const [old,a]=this.strikes.entries().next().value;a.cancel();this.strikes.delete(old);}
   const wrong=states[i]==='wrong';
   const animation=node.animate(wrong?[
    {left:'0px',color:'#ff6363',textShadow:'0 0 10px #ff544499'},
    {left:'-3px',offset:.25},{left:'3px',offset:.5},{left:'-1px',offset:.75},
    {left:'0px',color:'#e17b7b',textShadow:'none'}
   ]:[
    {...(single?{top:'0px'}:{}),color:'#ffd599',textShadow:'0 0 12px #ffa124aa'},
    {...(single?{top:'-4px'}:{}),color:'#fff',textShadow:'0 0 7px #ffa12488',offset:.35},
    {...(single?{top:'0px'}:{}),color:'#eee',textShadow:'none'}
   ],{duration:wrong?260:300,easing:'ease-out'});
   this.strikes.set(node,animation);
   animation.onfinish=()=>{if(this.strikes.get(node)===animation)this.strikes.delete(node);};
  }
 }
 combo(previous,current,states,nodes){
  let run=0,hit=-1;
  for(let i=0;i<current.length;i++){
   if(states[i]!=='correct'){run=0;continue;}
   if(/\s/.test(current[i]))continue;
   run++;
   if(run%10===0&&i>=previous.length&&!this.comboMarks.has(i)){
    this.comboMarks.add(i);hit=i;
   }
  }
  if(hit<0||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  this.comboAnimations.forEach(a=>a.cancel());this.comboAnimations=[];
  nodes.slice(Math.max(0,hit-9),hit+1).forEach((node,i)=>{
   if(states[Math.max(0,hit-9)+i]!=='correct'||!node.textContent.trim())return;
   this.strikes.get(node)?.cancel();this.strikes.delete(node);
   this.comboAnimations.push(node.animate([
    {color:'#eee',textShadow:'0 0 0 transparent'},
    {color:'#ffb64d',textShadow:'0 0 20px #ff941a',offset:.32},
    {color:'#fff0d6',textShadow:'0 0 10px #ff941aaa',offset:.65},
    {color:'#eee',textShadow:'0 0 0 transparent'}
   ],{duration:580,delay:i*22,easing:'ease-out'}));
  });
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
