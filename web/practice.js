export function prepareArticle(article) {
 return {target:article.text, units:Array.from(article.text).map((text,i)=>({text,start:i,end:i+1}))};
}
// Stop at the first mismatch, including in a multi-character IME commit.
export function validPrefix(value,target) {
 const typed=Array.from(value.normalize('NFC')), expected=Array.from(target);
 let i=0;while(i<typed.length&&typed[i]===expected[i])i++;
 return {value:typed.slice(0,i).join(''),wrong:i<typed.length};
}
