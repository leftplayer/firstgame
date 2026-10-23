import {TypingSession,chooseArticle} from './session.js';
import {prepareArticle} from './practice.js';
import {TypingFeedback,scatterCharacters} from './feedback.js';
const $=id=>document.getElementById(id);
let articles=[],article,session,composing=false,spans=[],caret,completed=false;
let practice, glyphs=[];
const input=$('input');
const feedback=new TypingFeedback();
let burst,finishTimer,resultStats;
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

function restart(selected){
 clearTimeout(finishTimer);burst?.cancel();burst=null;resultStats=null;$('game').classList.remove('bursting');
 input.blur();composing=false;clearPending();article=selected??chooseArticle(articles,article?.id);practice=prepareArticle(article);session=new TypingSession(practice.target,true);completed=false;
 input.lang=article.language==='zh'?'zh-CN':'en';
 $('article').classList.toggle('short-test',article.id==='en-test-short');
 input.value='';input.removeAttribute('maxlength');$('timer').textContent='0';$('timer').classList.remove('running');$('result').hidden=true;$('game').classList.remove('finished');$('article').replaceChildren();$('article').style.transform='';$('viewport').scrollTop=0;$('status').textContent='';
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
 alignActiveLine();
 const url=new URL(location.href);url.searchParams.set('article',article.id);history.replaceState(null,'',url);
}
function focus(){if(!session||completed)return;measurePage();feedback.unlock();input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);}
function accept(value=input.value, provisional=false){
 if(!session||completed)return;
 const previous=Array.from(session.value);
 session.input(value,Date.now(),!provisional);
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
 completed=true;burst=scatterCharacters(spans);$('game').classList.add('bursting');feedback.finish();input.blur();caret.remove();const seconds=session.seconds(Date.now());const parts=seconds.toFixed(2).split('.');
 $('whole').textContent=parts[0];$('whole').style.fontSize=parts[0].length>3?'52px':'';$('fraction').textContent='.'+parts[1];
 let message='';
 try{const parsed=JSON.parse(localStorage.getItem('firstgame.records.v1')||'[]');const records=Array.isArray(parsed)?parsed:[];const previous=records.slice().reverse().find(r=>r?.articleId===article.id&&r.mode==='text-free'&&Number.isFinite(r.seconds));records.push({articleId:article.id,mode:'text-free',seconds,at:new Date().toISOString()});localStorage.setItem('firstgame.records.v1',JSON.stringify(records.slice(-50)));}catch{}
 resultStats=session.stats(Date.now());
 $('accuracy').textContent=resultStats.accuracy.toFixed(1)+'%';
 $('speed').textContent=article.language==='en'?String(Math.round(resultStats.wpm)):'—';
 $('words').textContent=article.language==='en'?String(resultStats.words):'—';
 $('characters').textContent=String(resultStats.characters);
 $('message').textContent=message;
 finishTimer=setTimeout(()=>{burst?.cancel();burst=null;$('game').classList.remove('bursting');$('result').hidden=false;$('game').classList.add('finished');},burst.duration);
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
 let releaseTimer;
 const release=()=>{clearTimeout(releaseTimer);releaseTimer=setTimeout(()=>button.classList.remove('is-pressed'),100);};
 button.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();clearTimeout(releaseTimer);button.classList.add('is-pressed');});
 button.addEventListener('pointerup',release);
 button.addEventListener('pointercancel',()=>button.classList.remove('is-pressed'));
 button.addEventListener('pointerleave',release);
 button.addEventListener('contextmenu',event=>event.preventDefault());
}
$('restart').onclick=$('again').onclick=()=>{if(articles.length)restart();};
$('share').onclick=async()=>{const data={title:'TYPE.',text:`我用了 ${session.seconds(Date.now()).toFixed(2)} 秒，准确率 ${resultStats.accuracy.toFixed(1)}%，${article.language==='en'?'字速 '+Math.round(resultStats.wpm)+' 词/分钟，共 '+resultStats.words+' 个单词，':''}${resultStats.characters} 字符。你呢？`,url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(`${data.text} ${data.url}`);$('message').textContent='同篇文章链接已复制';}}catch(e){if(e.name!=='AbortError')$('message').textContent='请复制浏览器地址，或截屏保存成绩。';}};
function tick(){if(session)$('timer').textContent=String(Math.floor(session.seconds(Date.now())));requestAnimationFrame(tick);}tick();
try{const response=await fetch('./articles.json',{cache:'no-cache'});if(!response.ok)throw Error('articles');articles=await response.json();if(!Array.isArray(articles)||!articles.length)throw Error('empty');const id=new URLSearchParams(location.search).get('article');restart(articles.find(a=>a.id===id));}catch{$('status').textContent='文章加载失败，请刷新页面重试。';}
