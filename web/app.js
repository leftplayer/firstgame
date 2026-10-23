import {TypingSession,chooseArticle} from './session.js';
import {prepareArticle} from './practice.js';
import {captureGlyphs,morphGlyphs,fallGlyphs,RollingTimer} from './motion.js';
import {TypingFeedback} from './feedback.js';
const $=id=>document.getElementById(id);
let typographyReady=false;
let articles=[],article,session,composing=false,spans=[],caret,completed=false;
let practice, glyphs=[];
const input=$('input');
const feedback=new TypingFeedback();
const rollingTimer=new RollingTimer($('timer'));
let transition,transitionWidth;
let burst,finishTimer,resultStats,restarting=false;
let compositionStart=0, compositionEnd=0, compositionBase='', pendingText;
function clearPending(){pendingText?.remove();pendingText=undefined;}
function showPending(text){
 if(!session||completed||!caret)return;
 if(!pendingText){pendingText=document.createElement('span');pendingText.className='composition';pendingText.setAttribute('aria-label','正在输入');}
 pendingText.textContent=text;caret.before(pendingText);
}
function pendingFromValue(){
 const suffixLength=compositionBase.length-compositionEnd;
 return input.value.slice(compositionStart,Math.max(compositionStart,input.value.length-suffixLength));
}
const pageStyle=document.documentElement.style;
let layoutWidth=innerWidth, keyboardFocused=false, settleTimer;
function measurePage(){
 if(keyboardFocused)return;
 pageStyle.setProperty('--page-height', Math.round(window.visualViewport?.height??innerHeight)+'px');
 layoutWidth=innerWidth;
}
function anchorPage(){
 // Safari can pan its visual viewport to the focused textarea. Counter that
 // offset without resizing the game or moving the article's scroll position.
 pageStyle.setProperty('--viewport-offset', keyboardFocused?(window.visualViewport?.offsetTop??0)+'px':'0px');
}
measurePage();
if(navigator.virtualKeyboard)navigator.virtualKeyboard.overlaysContent=true;
input.addEventListener('focus',()=>{keyboardFocused=true;clearTimeout(settleTimer);anchorPage();});
input.addEventListener('blur',()=>{keyboardFocused=false;anchorPage();clearTimeout(settleTimer);settleTimer=setTimeout(measurePage,450);});
window.visualViewport?.addEventListener('resize',()=>{anchorPage();if(!keyboardFocused){clearTimeout(settleTimer);settleTimer=setTimeout(measurePage,450);}});
window.visualViewport?.addEventListener('scroll',anchorPage);
window.addEventListener('resize',()=>{
 if(Math.abs(innerWidth-layoutWidth)>60){input.blur();layoutWidth=innerWidth;}
 if(!keyboardFocused){clearTimeout(settleTimer);settleTimer=setTimeout(measurePage,450);}
});

async function restartWithShuffle(){
 if(restarting||!articles.length)return;
 restarting=true;completed=true;
 clearTimeout(finishTimer);
 const before=burst?captureGlyphs(burst.nodes,$('game')):captureGlyphs(spans,$('viewport')).map(g=>({...g,x:g.x+$('viewport').getBoundingClientRect().left-$('game').getBoundingClientRect().left,y:g.y+$('viewport').getBoundingClientRect().top-$('game').getBoundingClientRect().top}));
 burst?.cancel();burst=null;
 input.blur();composing=false;clearPending();
 $('result').hidden=true;$('game').classList.remove('finished','bursting');
 $('game').classList.add('scrambling');
 // Lay out the next article invisibly first; particles land on its exact glyph positions.
 restart(chooseArticle(articles,article?.id));completed=true;
 const after=captureGlyphs(spans,$('viewport')).map(g=>({...g,x:g.x+$('viewport').getBoundingClientRect().left-$('game').getBoundingClientRect().left,y:g.y+$('viewport').getBoundingClientRect().top-$('game').getBoundingClientRect().top}));
 transitionWidth=innerWidth;transition=morphGlyphs(before,after,$('game'));
 try{await transition.finished;}finally{
  transition.cancel();transition=null;
  $('game').classList.remove('scrambling');restarting=false;completed=false;alignActiveLine();
 }
}
window.addEventListener('resize',()=>{if(transition&&innerWidth!==transitionWidth)transition.cancel();});
function restart(selected){
 clearTimeout(finishTimer);burst?.cancel();burst=null;resultStats=null;$('game').classList.remove('bursting');
 input.blur();composing=false;clearPending();article=selected??chooseArticle(articles,article?.id);practice=prepareArticle(article);session=new TypingSession(practice.target,true);completed=false;
 input.lang=article.language==='zh'?'zh-CN':'en';
 $('article').classList.toggle('short-test',article.id==='en-test-short');
 input.value='';input.removeAttribute('maxlength');rollingTimer.set(0,false);$('timer').classList.remove('running');$('result').hidden=true;$('game').classList.remove('finished');$('article').replaceChildren();$('article').style.transform='';$('viewport').scrollTop=0;$('status').textContent='';
 spans=[];glyphs=[];
 let word;
 practice.units.forEach(unit=>{
  const glyph=document.createElement('span');glyph.className='glyph';
  glyph.textContent=unit.text;if(article.language==='en'&&unit.text===' ')glyph.dataset.space='';spans.push(glyph);
  if(article.language==='en'&&!/\s/.test(unit.text)){
   if(!word){word=document.createElement('span');word.className='word';$('article').append(word);}
   word.append(glyph);
  }else{word=null;$('article').append(glyph);}
  glyphs.push({...unit,node:glyph});

 });
 caret=document.createElement('span');caret.id='caret';$('article').prepend(caret);
 calibrateTypography();alignActiveLine();
 const url=new URL(location.href);url.searchParams.set('article',article.id);history.replaceState(null,'',url);
}
function focus(){if(!session||completed)return;measurePage();feedback.unlock();input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);}
function accept(value=input.value, provisional=false){
 if(!session||completed)return;
 const previous=Array.from(session.value);
 // English keyboard predictions are already playable letters; do not wait for Enter.
 session.input(value,Date.now(),!provisional||article.language==='en');
 // Never assign textarea.value during composition: that cancels mobile IMEs.
 if(!provisional&&!composing&&input.value!==session.value)input.value=session.value;
 const states=session.states;
 const current=Array.from(session.value);
 if(states.some((state,i)=>state==='wrong'&&current[i]!==previous[i]))feedback.error();
 states.forEach((state,i)=>spans[i].className='glyph '+state);
 alignActiveLine();
 $('status').textContent='';
 if(session.phase==='finished')finish();
}
function alignActiveLine(){
 if(!session||!caret||completed)return;
 const active=glyphs.find(g=>g.end>session.cursor)??glyphs[glyphs.length-1];
 if(!active)return;
 const articleNode=$('article'),box=$('viewport');
 // Use the rendered line tops, not a font-dependent estimated row number.
 const rows=[...new Set(glyphs.map(g=>g.node.offsetTop))].sort((a,b)=>a-b);
 const current=rows.indexOf(active.node.offsetTop);
 const first=Math.max(0,current-1);
 articleNode.style.transform=`translateY(${-rows[first]}px)`;
 box.scrollTop=0;
 caret.style.left=active.node.offsetLeft+'px';
 caret.style.top=active.node.offsetTop+'px';
 glyphs.forEach(g=>g.node.classList.toggle('distant',rows.indexOf(g.node.offsetTop)>=first+3));

}
window.addEventListener('resize',()=>requestAnimationFrame(alignActiveLine));
function finish(){
 completed=true;const visible=captureGlyphs(spans,$('viewport')).map(g=>({...g,x:g.x+$('viewport').getBoundingClientRect().left-$('game').getBoundingClientRect().left,y:g.y+$('viewport').getBoundingClientRect().top-$('game').getBoundingClientRect().top}));burst=fallGlyphs(visible,$('game'));$('game').classList.add('bursting');feedback.finish();input.blur();caret.remove();const seconds=session.seconds(Date.now());const parts=seconds.toFixed(2).split('.');
 $('whole').textContent=parts[0];$('whole').style.fontSize=parts[0].length>3?'52px':'';$('fraction').textContent='.'+parts[1];
 let message='';
 try{const parsed=JSON.parse(localStorage.getItem('firstgame.records.v1')||'[]');const records=Array.isArray(parsed)?parsed:[];const previous=records.slice().reverse().find(r=>r?.articleId===article.id&&r.mode==='text-free'&&Number.isFinite(r.seconds));records.push({articleId:article.id,mode:'text-free',seconds,at:new Date().toISOString()});localStorage.setItem('firstgame.records.v1',JSON.stringify(records.slice(-50)));}catch{}
 resultStats=session.stats(Date.now());
 $('accuracy').textContent=resultStats.accuracy.toFixed(1)+'%';
 $('speed').textContent=article.language==='en'?String(Math.round(resultStats.wpm)):'—';
 $('words').textContent=article.language==='en'?String(resultStats.words):'—';
 $('characters').textContent=String(resultStats.characters);
 $('message').textContent=message;
 finishTimer=setTimeout(()=>{$('result').hidden=false;$('game').classList.add('finished');},Math.min(260,burst.duration));
}
function startClock(){if(session&&!completed){session.start(Date.now());$('timer').classList.add('running');feedback.tap();}}
input.addEventListener('keydown',event=>{
 if(!event.ctrlKey&&!event.metaKey&&!event.altKey&&(event.key.length===1||event.key==='Process'||event.keyCode===229))startClock();
});
input.addEventListener('beforeinput',event=>{if(event.inputType?.startsWith('insert'))startClock();});
input.addEventListener('compositionstart',()=>{
 composing=true;compositionBase=input.value;
 compositionStart=input.selectionStart??input.value.length;
 compositionEnd=input.selectionEnd??compositionStart;
});
input.addEventListener('compositionupdate',event=>{
 if(event.data)startClock();
 if(article?.language==='en')accept(compositionBase.slice(0,compositionStart)+(event.data??'')+compositionBase.slice(compositionEnd),true);
});
input.addEventListener('compositionend',()=>{composing=false;clearPending();accept();});
input.addEventListener('input',event=>{
 if(event.isComposing||composing){
  if(input.value)startClock();
  if(article?.language==='en')accept(input.value,true);
  return;
 }
 if(input.value)startClock();
 clearPending();accept();
});
input.addEventListener('paste',e=>e.preventDefault());
$('viewport').addEventListener('click',focus);$('viewport').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focus();}});
// Touch/mouse activation must not leave focus frames or text selection behind.
for(const button of document.querySelectorAll('button')){
 button.addEventListener('click',()=>feedback.button());
 let releaseTimer;
 const release=()=>{clearTimeout(releaseTimer);releaseTimer=setTimeout(()=>button.classList.remove('is-pressed'),100);};
 button.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();clearTimeout(releaseTimer);button.classList.add('is-pressed');});
 button.addEventListener('pointerup',release);
 button.addEventListener('pointercancel',()=>button.classList.remove('is-pressed'));
 button.addEventListener('pointerleave',release);
 button.addEventListener('contextmenu',event=>event.preventDefault());
}
$('restart').onclick=$('again').onclick=restartWithShuffle;
$('share').onclick=async()=>{const data={title:'Now Typing',text:`我用了 ${session.seconds(Date.now()).toFixed(2)} 秒，准确率 ${resultStats.accuracy.toFixed(1)}%，${article.language==='en'?'字速 '+Math.round(resultStats.wpm)+' 词/分钟，共 '+resultStats.words+' 个单词，':''}${resultStats.characters} 字符。你呢？`,url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(`${data.text} ${data.url}`);$('message').textContent='同篇文章链接已复制';}}catch(e){if(e.name!=='AbortError')$('message').textContent='请复制浏览器地址，或截屏保存成绩。';}};
function tick(){if(session)rollingTimer.set(Math.floor(session.seconds(Date.now())));requestAnimationFrame(tick);}tick();
try{const response=await fetch('./articles.json',{cache:'no-cache'});if(!response.ok)throw Error('articles');articles=await response.json();if(!Array.isArray(articles)||!articles.length)throw Error('empty');const id=new URLSearchParams(location.search).get('article');restart(articles.find(a=>a.id===id));}catch{$('status').textContent='文章加载失败，请刷新页面重试。';}

// Font switches preserve input and recalculate wrapping only after the faces load.
const fontOptions={
 en:{mono:['Roboto Mono','Roboto Mono · 等宽'],sans:['Roboto','Roboto · 无衬线'],serif:['Roboto Slab','Roboto Slab · 衬线'],plex:['IBM Plex Mono','IBM Plex Mono · 工业'],cutive:['Cutive Mono','Cutive Mono · 打字机'],courier:['Courier Prime','Courier Prime · 经典']},
 zh:{sans:['Noto Sans SC','思源黑体'],serif:['Noto Serif SC','思源宋体'],kai:['LXGW WenKai TC','霞鹜文楷'],fusion:['NowTyping Fusion','缝合像素 · 12px'],ma:['Ma Shan Zheng','马善政 · 毛笔'],chiron:['Chiron Hei HK','昭源黑体 · 清爽'],round:['Chiron GoRound TC','昭源环方 · 圆润'],butter:['ZCOOL QingKe HuangYou','庆科黄油 · 窄体']}
};
const fontScopes=['title','body','data'],fontLangs=['en','zh'];
let fontChoice=Object.fromEntries(fontScopes.map(scope=>[scope,{en:'mono',zh:'sans'}]));
try{
 const saved=JSON.parse(localStorage.getItem('firstgame.fonts.v2')||'null');
 const legacy=JSON.parse(localStorage.getItem('firstgame.fonts.v1')||'{}');
 for(const scope of fontScopes)for(const lang of fontLangs){const key=saved?.[scope]?.[lang]??legacy[lang];if(fontOptions[lang][key])fontChoice[scope][lang]=key;}
}catch{}
const fontLoads=new Map();let fontRequest=0;
async function loadTypeface(lang,key){
 const id=lang+'-'+key;
 if(!fontLoads.has(id))fontLoads.set(id,(async()=>{
  const link=document.createElement('link');link.rel='stylesheet';link.href='./fonts/'+id+'.css';
  try{
   await new Promise((resolve,reject)=>{link.onload=resolve;link.onerror=()=>reject(Error('font stylesheet'));document.head.append(link);});
   const family=fontOptions[lang][key][0],sample=lang==='zh'?'风穿过窗边':'Now typing';
   const loaded=await document.fonts.load('400 21px "'+family+'"',sample);
   if(!loaded.length)throw Error('font unavailable');
   await document.fonts.load('700 21px "'+family+'"',sample);
  }catch(e){link.remove();fontLoads.delete(id);throw e;}
 })());
 return fontLoads.get(id);
}
let fontTarget='body',fontDraft=structuredClone(fontChoice);
const fontButtons=[];
function refreshFontButtons(){
 for(const b of document.querySelectorAll('[data-font-target]'))b.setAttribute('aria-pressed',String(b.dataset.fontTarget===fontTarget));
 for(const b of fontButtons)b.setAttribute('aria-pressed',String(fontDraft[fontTarget][b.dataset.fontLang]===b.dataset.fontKey));
}
for(const lang of fontLangs)for(const [key,[,label]] of Object.entries(fontOptions[lang])){
 const button=document.createElement('button');button.type='button';button.dataset.fontLang=lang;button.dataset.fontKey=key;
 button.textContent=label;button.title=label;button.setAttribute('aria-pressed','false');
 button.addEventListener('click',()=>{feedback.button();fontDraft[fontTarget][lang]=key;refreshFontButtons();changeFonts(structuredClone(fontDraft));});
 button.addEventListener('pointerdown',e=>{if(e.button===0)e.preventDefault();});
 $('font-options-'+lang).append(button);fontButtons.push(button);
}
for(const button of document.querySelectorAll('[data-font-target]'))button.addEventListener('click',()=>{fontTarget=button.dataset.fontTarget;refreshFontButtons();});
refreshFontButtons();
// Compare visible glyph bounds rather than font em boxes. This keeps cap height,
// lowercase text and digits stable across typewriter, serif and pixel faces.
const typeMeasure=document.createElement('canvas').getContext('2d');
function glyphMeasure(family,weight,text){
 typeMeasure.font=weight+' 100px "'+family+'"';
 const m=typeMeasure.measureText(text);
 return {height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent,width:m.width,offset:((m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)-((m.fontBoundingBoxAscent??m.actualBoundingBoxAscent)-(m.fontBoundingBoxDescent??m.actualBoundingBoxDescent)))/2};
}
function typeScale(scope,lang,weight,sample,target){
 const m=glyphMeasure(fontOptions[lang][fontChoice[scope][lang]][0],weight,sample);
 return m.height>0?target/m.height:1;
}
function calibrateTypography(){
 if(!typographyReady||!typeMeasure)return;
 pageStyle.setProperty('--title-size',24*typeScale('title','en',700,'H',71)+'px');
 const family=fontOptions.en[fontChoice.title.en][0];
 const label=glyphMeasure(family,500,'Restart');
 const buttonSize=Math.min(100*8.5/label.height,100*50/label.width);
 pageStyle.setProperty('--restart-size',buttonSize+'px');
 const actionSize=Math.min(100*10/label.height,100*66/label.width);
 pageStyle.setProperty('--action-size',actionSize+'px');
 $('restart').style.setProperty('--label-offset',label.offset*buttonSize/100+'px');
 for(const id of ['again','share']){
  const m=glyphMeasure(family,500,$(id).textContent);
  $(id).style.setProperty('--label-offset',m.offset*actionSize/100+'px');
 }
 const titleMetrics=glyphMeasure(family,700,'NOW TYPING');
 pageStyle.setProperty('--title-offset',titleMetrics.offset*24*typeScale('title','en',700,'H',71)/100+'px');
 $('article').dataset.language=article?.language??'en';
 pageStyle.setProperty('--data-scale',typeScale('data','en',700,'0',71));
 fitBrand();
}
function fitBrand(){
 const brand=document.querySelector('.brand'),label=brand.querySelector('.brand-label');
 label.style.transform='';
 // On very narrow screens constrain only width, never shrink title height.
 const width=label.getBoundingClientRect().width;
 if(width>brand.clientWidth)label.style.transform='scaleX('+(brand.clientWidth/width)+')';
}
async function changeFonts(next){
 const request=++fontRequest;$('font-note').textContent='正在加载字体…';
 try{
  await Promise.all(fontScopes.flatMap(scope=>fontLangs.map(lang=>loadTypeface(lang,next[scope][lang]))));
  if(request!==fontRequest)return;
  fontChoice=next;
  for(const scope of fontScopes)for(const lang of fontLangs)pageStyle.setProperty('--font-'+scope+'-'+lang,'"'+fontOptions[lang][next[scope][lang]][0]+'"');
  $('font-note').textContent='已应用 · 自动保存 · 切换不重置输入';
  try{localStorage.setItem('firstgame.fonts.v2',JSON.stringify(next));}catch{}
  typographyReady=true;calibrateTypography();
  requestAnimationFrame(alignActiveLine);
 }catch{
  if(request!==fontRequest)return;
  fontDraft=structuredClone(fontChoice);refreshFontButtons();
  $('font-note').textContent='加载失败，已保留原搭配；请重新选择重试';
 }
}
new ResizeObserver(()=>pageStyle.setProperty('--font-panel-height',$('font-lab').getBoundingClientRect().height+'px')).observe($('font-lab'));
window.addEventListener('resize',fitBrand);
changeFonts(fontChoice);
