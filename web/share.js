export const SHARE_DESCRIPTION='头号打字员 · 来打同一篇，比比速度。';
export function shareDetails(article,seconds,href){
 const url=new URL(href);url.search='';url.hash='';url.searchParams.set('article',article.id);
 return {title:`我只用了${seconds.toFixed(2)}秒，快来试试吧！`,text:SHARE_DESCRIPTION,url:url.href};
}
export function updateShareMetadata(title='头号打字员 · Now Typing — 这段文字，你要打多久？'){
 document.title=title;
 document.querySelector('meta[property="og:title"]')?.setAttribute('content',title);
 document.querySelector('meta[name="description"]')?.setAttribute('content',SHARE_DESCRIPTION);
 document.querySelector('meta[property="og:description"]')?.setAttribute('content',SHARE_DESCRIPTION);
}
// Samsung Internet creates its own WeChat card from the page title and screenshot.
// Keep a clean brand surface visible while the native share sheet captures it.
export async function shareViaBrowser(data){
 if(!/SamsungBrowser\//i.test(navigator.userAgent||''))return navigator.share(data);
 const surface=document.getElementById('share-capture');
 const previousTitle=document.title,previousHidden=surface.hidden;
 document.title=SHARE_DESCRIPTION;surface.hidden=false;
 document.documentElement.classList.add('sharing-capture');
 try{
  // Let the compositor paint the brand image before native capture; no extra dialog.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  await navigator.share(data);
 }finally{
  // Android may resolve as soon as the receiving app opens. Restore on return.
  if(document.visibilityState==='hidden')await new Promise(resolve=>{
   const onVisible=()=>{if(document.visibilityState!=='hidden'){document.removeEventListener('visibilitychange',onVisible);resolve();}};
   document.addEventListener('visibilitychange',onVisible);onVisible();
  });
  document.title=previousTitle;surface.hidden=previousHidden;
  document.documentElement.classList.remove('sharing-capture');
 }
}
