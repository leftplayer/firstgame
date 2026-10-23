import {TypingSession,chooseArticle} from './session.js';
import {prepareArticle,validPrefix} from './practice.js';
const $=id=>document.getElementById(id);
let articles=[],article,session,composing=false,spans=[],caret,completed=false;
let practice, glyphs=[];
const input=$('input');
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
 input.blur();composing=false;clearPending();article=selected??chooseArticle(articles,article?.id);practice=prepareArticle(article);session=new TypingSession(practice.target);completed=false;
 input.lang=article.language==='zh'?'zh-CN':'en';
 input.value='';input.removeAttribute('maxlength');$('timer').textContent='0';$('result').hidden=true;$('game').classList.remove('finished');$('article').replaceChildren();$('viewport').scrollTop=0;$('status').textContent='';
 spans=[];glyphs=[];
 practice.units.forEach(unit=>{
  const glyph=document.createElement('span');glyph.className='glyph';
  glyph.textContent=unit.text;spans.push(glyph);
  $('article').append(glyph);glyphs.push({...unit,node:glyph});

 });
 caret=document.createElement('span');caret.id='caret';$('article').prepend(caret);
 alignActiveLine();
 const url=new URL(location.href);url.searchParams.set('article',article.id);history.replaceState(null,'',url);
}
function focus(){if(!session||completed)return;measurePage();input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);}
function accept(value=input.value, provisional=false){
 if(!session||completed)return;
 const checked=validPrefix(value,session.target);
 session.input(checked.value,Date.now());
 // Never assign textarea.value during composition: that cancels mobile IMEs.
 if(!provisional&&!composing&&input.value!==session.value)input.value=session.value;
 const states=session.states;
 states.forEach((state,i)=>spans[i].className='glyph '+state);
 alignActiveLine();
 $('status').textContent='';
 if(checked.wrong){
  const bad=spans[session.cursor];
  if(bad){bad.classList.add('wrong');bad.animate([{color:'#ff5c5c',background:'#521818'},{color:'#ff5c5c',background:'transparent'}],{duration:300,iterations:2});}
 }
 if(session.phase==='finished')finish();
}
function alignActiveLine(){
 if(!session||!caret||completed)return;
 const active=glyphs.find(g=>g.end>session.cursor)??glyphs[glyphs.length-1];
 if(!active)return;
 active.node.before(caret);
 const articleNode=$('article'),box=$('viewport');
 const lineHeight=parseFloat(getComputedStyle(articleNode).lineHeight);
 const relative=active.node.getBoundingClientRect().top-articleNode.getBoundingClientRect().top;
 const row=Math.max(0,Math.floor((relative+1)/lineHeight));
 // Keep one completed row above the active row.
 box.scrollTop=Math.max(0,row-1)*lineHeight;
 const origin=articleNode.getBoundingClientRect().top;
 glyphs.forEach(g=>{const glyphRow=Math.max(0,Math.floor((g.node.getBoundingClientRect().top-origin+1)/lineHeight));g.node.classList.toggle('distant',glyphRow>=Math.max(0,row-1)+3);});
}
window.addEventListener('resize',()=>requestAnimationFrame(alignActiveLine));
function finish(){
 completed=true;input.blur();caret.remove();const seconds=session.seconds(Date.now());const parts=seconds.toFixed(2).split('.');
 $('whole').textContent=parts[0];$('whole').style.fontSize=parts[0].length>3?'52px':'';$('fraction').textContent='.'+parts[1];
 let message='这一刻，留下你的速度。';
 try{const parsed=JSON.parse(localStorage.getItem('firstgame.records.v1')||'[]');const records=Array.isArray(parsed)?parsed:[];const previous=records.slice().reverse().find(r=>r?.articleId===article.id&&r.mode==='text-strict'&&Number.isFinite(r.seconds));if(previous)message=seconds<previous.seconds?'你的速度，超越了上一次的自己。':'每一次专注，都在积累。';records.push({articleId:article.id,mode:'text-strict',seconds,at:new Date().toISOString()});localStorage.setItem('firstgame.records.v1',JSON.stringify(records.slice(-50)));}catch{}
 $('message').textContent=message;$('result').hidden=false;$('game').classList.add('finished');$('again').focus({preventScroll:true});
}
function startClock(){if(session&&!completed)session.start(Date.now());}
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
$('restart').onclick=$('again').onclick=()=>{if(articles.length)restart();};
$('share').onclick=async()=>{const data={title:'TYPE.',text:`我用了 ${session.seconds(Date.now()).toFixed(2)} 秒，你呢？`,url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(`${data.text} ${data.url}`);$('message').textContent='同篇文章链接已复制';}}catch(e){if(e.name!=='AbortError')$('message').textContent='请复制浏览器地址，或截屏保存成绩。';}};
function tick(){if(session)$('timer').textContent=String(Math.floor(session.seconds(Date.now())));requestAnimationFrame(tick);}tick();
try{const response=await fetch('./articles.json');if(!response.ok)throw Error('articles');articles=await response.json();if(!Array.isArray(articles)||!articles.length)throw Error('empty');const id=new URLSearchParams(location.search).get('article');restart(articles.find(a=>a.id===id));}catch{$('status').textContent='文章加载失败，请刷新页面重试。';}
