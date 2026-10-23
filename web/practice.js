export function prepareArticle(article) {
 return {target:article.text, units:Array.from(article.text).map((text,i)=>({text,start:i,end:i+1}))};
}
