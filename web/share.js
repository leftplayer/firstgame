import {scatterInk} from './motion.js';
export const SHARE_DESCRIPTION='头号打字员 · Now Typing｜来打同一篇，比比速度';
export function shareDetails(article,seconds,href){
 const url=new URL(href);url.search='';url.hash='';url.searchParams.set('article',article.id);
 return {title:`这段文字，我打了 ${seconds.toFixed(2)} 秒。你呢？`,text:SHARE_DESCRIPTION,url:url.href};
}
export function updateShareMetadata(title='头号打字员 · Now Typing — 这段文字，你要打多久？'){
 document.title=title;
 document.querySelector('meta[property="og:title"]')?.setAttribute('content',title);
}
export function wrap(ctx,text,width,maxLines){
 const lines=[];let line='';
 const tokens=text.replace(/\s+/g,' ').match(/[a-zA-Z0-9’'-]+|./gu)||[];
 for(const token of tokens){
  if(ctx.measureText(line+token).width>width&&line){
   lines.push(line.trimEnd());line=token.trimStart();
   if(lines.length===maxLines){let last=lines[maxLines-1];while(ctx.measureText(last+'…').width>width&&last)last=last.slice(0,-1);lines[maxLines-1]=last+'…';return lines;}
  }else line+=line?token:token.trimStart();
 }
 if(line)lines.push(line.trimEnd());return lines;
}
export async function createResultPoster({article,seconds,stats,dataFont,bodyFont,glyphs}){
 await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=720;canvas.height=960;
 const c=canvas.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,720,960);
 const icon=new Image();icon.src=new URL('./brand/typing-icon.png',location.href).href;
 try{await icon.decode();c.drawImage(icon,32,24,100,100);}catch{}
 const ui='"Noto Sans SC", sans-serif';
 c.fillStyle='#f4f1e9';c.font='700 28px sans-serif';c.fillText('NOW TYPING',144,78);
 c.fillStyle='#858585';c.font=`20px ${ui}`;c.fillText('头号打字员',144,109);
 c.fillStyle='#aaa';c.font=`20px ${ui}`;c.fillText('完成时间',54,205);
 const time=seconds.toFixed(2);let size=108;c.font=`700 ${size}px ${dataFont}`;
 while(c.measureText(time+' s').width>612){size-=2;c.font=`700 ${size}px ${dataFont}`;}
 c.fillStyle='#fff7e9';c.fillText(time,50,325);
 const advance=c.measureText(time).width;c.fillStyle='#ff921e';c.font=`700 36px ${dataFont}`;c.fillText('s',62+advance,325);
 const metrics=[['准确率',stats.accuracy.toFixed(1)+'%'],[article.language==='en'?'WPM':'CPM',String(Math.round(article.language==='en'?stats.wpm:stats.cpm))]];
 for(let i=0;i<metrics.length;i++){const x=54+i*320;c.fillStyle='#858585';c.font=`20px ${ui}`;c.fillText(metrics[i][0],x,404);c.fillStyle='#fff';c.font=`700 42px ${dataFont}`;c.fillText(metrics[i][1],x,459);}
 c.fillStyle='#292929';c.fillRect(54,502,612,1);
 c.fillStyle='#b0b0b0';c.font=`24px ${bodyFont}`;
 wrap(c,article.text,612,3).forEach((line,i)=>c.fillText(line,54,555+i*38));
 c.fillStyle='#ff921e';c.font=`24px ${ui}`;c.fillText('同一段文字，你要打多久？',54,725);
 c.fillStyle='#777';c.font='18px sans-serif';c.fillText('leftplayer.github.io/firstgame',54,762);
 const letters=glyphs.filter(g=>g.text.trim()).slice(0,90).map(g=>({...g,fontFamily:bodyFont,fontSize:26}));
 const pile=scatterInk(letters,720,150)||[];
 for(const p of pile){c.globalAlpha=.68;c.drawImage(p.sprite,p.x,960-p.bottom-p.height,p.width,p.height);}c.globalAlpha=1;
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Image export failed')),'image/png'));
}
