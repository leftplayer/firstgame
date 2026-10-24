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
