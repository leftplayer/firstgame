import {TypingSession,chooseArticle} from './session.js';
const $=id=>document.getElementById(id);
let articles=[],article,session,composing=false,spans=[],caret,completed=false;
const input=$('input');
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
 input.blur();article=selected??chooseArticle(articles,article?.id);session=new TypingSession(article.text);completed=false;
 input.value='';input.maxLength=article.text.length;$('timer').textContent='0';$('result').hidden=true;$('game').classList.remove('finished');$('article').replaceChildren();$('viewport').scrollTop=0;$('status').textContent='';
 spans=Array.from(article.text).map(c=>{const n=document.createElement('span');n.textContent=c;$('article').append(n);if(/[，。！？；]/.test(c))$('article').append(document.createElement('br'));return n;});
 caret=document.createElement('span');caret.id='caret';$('article').prepend(caret);
 const url=new URL(location.href);url.searchParams.set('article',article.id);history.replaceState(null,'',url);
}
function focus(){if(!session||completed)return;measurePage();input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);}
function accept(){
 if(!session||completed||composing)return;session.input(input.value,Date.now());
 session.states.forEach((s,i)=>spans[i].className=s);
 if(spans[session.cursor])spans[session.cursor].before(caret);else $('article').append(caret);
 const box=$('viewport'),offset=caret.getBoundingClientRect().top-box.getBoundingClientRect().top;
 const limit=Math.min(box.clientHeight*.55,Math.max(80,(window.visualViewport?.height??innerHeight)-box.getBoundingClientRect().top-100));
 if(offset>limit||offset<0)box.scrollTop+=offset-limit;
 $('status').textContent=session.states.includes('wrong')?'有错字，请删除后修改':'';
 if(session.phase==='finished')finish();
}
function finish(){
 completed=true;input.blur();caret.remove();const seconds=session.seconds(Date.now());const parts=seconds.toFixed(2).split('.');
 $('whole').textContent=parts[0];$('whole').style.fontSize=parts[0].length>3?'74px':'';$('fraction').textContent='.'+parts[1];
 let message='这一刻，留下你的速度。';
 try{const parsed=JSON.parse(localStorage.getItem('firstgame.records.v1')||'[]');const records=Array.isArray(parsed)?parsed:[];const previous=records.slice().reverse().find(r=>r?.articleId===article.id&&Number.isFinite(r.seconds));if(previous)message=seconds<previous.seconds?'你的速度，超越了上一次的自己。':'每一次专注，都在积累。';records.push({articleId:article.id,seconds,at:new Date().toISOString()});localStorage.setItem('firstgame.records.v1',JSON.stringify(records.slice(-50)));}catch{}
 $('message').textContent=message;$('result').hidden=false;$('game').classList.add('finished');$('again').focus({preventScroll:true});
}
input.addEventListener('compositionstart',()=>composing=true);input.addEventListener('compositionend',()=>{composing=false;accept();});input.addEventListener('input',accept);input.addEventListener('paste',e=>e.preventDefault());
$('viewport').addEventListener('click',focus);$('viewport').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focus();}});
$('restart').onclick=$('again').onclick=()=>{if(articles.length)restart();};
$('share').onclick=async()=>{const data={title:'TYPE.',text:`我用了 ${session.seconds(Date.now()).toFixed(2)} 秒，你呢？`,url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(`${data.text} ${data.url}`);$('message').textContent='同篇文章链接已复制';}}catch(e){if(e.name!=='AbortError')$('message').textContent='请复制浏览器地址，或截屏保存成绩。';}};
function tick(){if(session)$('timer').textContent=String(Math.floor(session.seconds(Date.now())));requestAnimationFrame(tick);}tick();
try{const response=await fetch('./articles.json');if(!response.ok)throw Error('articles');articles=await response.json();if(!Array.isArray(articles)||!articles.length)throw Error('empty');const id=new URLSearchParams(location.search).get('article');restart(articles.find(a=>a.id===id));}catch{$('status').textContent='文章加载失败，请刷新页面重试。';}
