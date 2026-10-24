import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../web/share.js',import.meta.url),'utf8').replace(/^import .*;\n/,'').replaceAll('export ','');
const api=runInNewContext(source+';({shareDetails})',{URL});
test('share invitation contains measured time and a clean same-article URL',()=>{
 const data=api.shareDetails({id:'zh-出师表'},32.68,'https://leftplayer.github.io/firstgame/?debug=1&article=old#test');
 assert.equal(data.title,'我只用了32.68秒，快来试试吧！');
 const url=new URL(data.url);assert.equal(url.searchParams.get('article'),'zh-出师表');assert.equal([...url.searchParams].length,1);assert.equal(url.hash,'');
 assert.ok(data.text.includes('头号打字员'));
});
test('Share directly opens native sharing once with distinct title and description',async()=>{
 const app=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
 const handler=app.slice(app.indexOf("$('share').onclick="),app.indexOf('function tick()'));
 const nodes={share:{},message:{}};let calls=0,payload;
 const context={$:id=>nodes[id],debugPreview:null,completed:true,article:{id:'en-test'},session:{seconds:()=>11.28},Date,location:{href:'https://leftplayer.github.io/firstgame/?article=en-test'},shareDetails:api.shareDetails,shareViaBrowser:async data=>{calls++;payload=data},navigator:{share(){}}};
 runInNewContext(handler,context);await nodes.share.onclick();
 assert.equal(calls,1);assert.equal(payload.title,'我只用了11.28秒，快来试试吧！');assert.equal(payload.text,'头号打字员 · 来打同一篇，比比速度。');assert.ok(!('files' in payload));
 assert.ok(!readFileSync(new URL('../web/index.html',import.meta.url),'utf8').includes('share-panel'));
});
test('cancelling system sharing does not report an error or copy content',async()=>{
 const app=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');const handler=app.slice(app.indexOf("$('share').onclick="),app.indexOf('function tick()'));
 const nodes={share:{},message:{textContent:''}};
 runInNewContext(handler,{$:id=>nodes[id],debugPreview:null,completed:true,article:{id:'en-test'},session:{seconds:()=>11.28},Date,location:{href:'https://leftplayer.github.io/firstgame/'},shareDetails:api.shareDetails,shareViaBrowser:async()=>{throw {name:'AbortError'}},navigator:{share(){}}});
 await nodes.share.onclick();assert.equal(nodes.message.textContent,'');
});

test('Samsung sharing does not change the page or wait for a screenshot',async()=>{
 let calls=0;const data={title:'邀请',text:'描述',url:'https://example.com/'};
 const share=runInNewContext(source+';shareViaBrowser',{navigator:{userAgent:'SamsungBrowser/28.0',share:value=>{assert.equal(value,data);calls++;return Promise.resolve();}}});
 await share(data);assert.equal(calls,1);
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');assert.ok(!html.includes('share-capture'));assert.ok(!html.includes('share-panel'));assert.ok(html.includes('property="og:image" content="https://leftplayer.github.io/firstgame/brand/typing-icon.png"'));
});
