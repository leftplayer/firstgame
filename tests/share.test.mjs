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

test('Samsung capture shows only branding with a distinct page description, then restores on cancel',async()=>{
 const surface={hidden:true},classes=new Set(),events=[];
 const document={title:'成绩标题',visibilityState:'visible',getElementById:()=>surface,documentElement:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}}};
 const navigator={userAgent:'SamsungBrowser/28.0',share:async data=>{assert.equal(surface.hidden,false);assert.equal(document.title,'头号打字员 · 来打同一篇，比比速度。');assert.equal(data.title,'我只用了3.34秒，快来试试吧！');assert.equal(events.length,2);throw {name:'AbortError'};}};
 const share=runInNewContext(source+';shareViaBrowser',{document,navigator,requestAnimationFrame:fn=>{events.push('paint');fn();}});
 await assert.rejects(share({title:'我只用了3.34秒，快来试试吧！'}),e=>e.name==='AbortError');
 assert.equal(surface.hidden,true);assert.equal(document.title,'成绩标题');assert.equal(classes.size,0);
});
test('other browsers retain a direct native share call',async()=>{
 let count=0;const data={title:'test'};
 const share=runInNewContext(source+';shareViaBrowser',{navigator:{userAgent:'Chrome',share:async value=>{assert.equal(value,data);count++;}}});
 await share(data);assert.equal(count,1);
});
