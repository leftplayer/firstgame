// Explicit readings avoid runtime transliteration mistakes for polyphonic words.
export function prepareArticle(article, readings) {
 if(article.language!=='zh')return {target:article.text, units:Array.from(article.text).map((text,i)=>({text,reading:'',start:i,end:i+1}))};
 const syllables=(readings[article.id]??'').split(/\s+/).filter(Boolean);
 const letters=Array.from(article.text).filter(c=>/\p{Script=Han}/u.test(c));
 if(letters.length!==syllables.length||syllables.some(s=>!/^[a-z]+$/.test(s)))throw Error('Invalid pinyin configuration: '+article.id);
 let index=0,target='';
 const units=Array.from(article.text).map(text=>{
  const start=target.length;
  const reading=/\p{Script=Han}/u.test(text)?syllables[index++]:'';
  target+=reading;
  return {text,reading,start,end:target.length};
 });
 return {target,units};
}
