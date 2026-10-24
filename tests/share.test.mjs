import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../web/share.js',import.meta.url),'utf8').replace(/^import .*;\n/,'').replaceAll('export ','');
const api=runInNewContext(source+';({shareDetails,wrap,createResultPoster})',{URL});
test('share invitation contains measured time and a clean same-article URL',()=>{
 const data=api.shareDetails({id:'zh-出师表'},32.68,'https://leftplayer.github.io/firstgame/?debug=1&article=old#test');
 assert.equal(data.title,'这段文字，我打了 32.68 秒。你呢？');
 const url=new URL(data.url);assert.equal(url.searchParams.get('article'),'zh-出师表');assert.equal([...url.searchParams].length,1);assert.equal(url.hash,'');
 assert.ok(data.text.includes('头号打字员'));
});
test('poster excerpt keeps English words together and limits lines',()=>{
 const c={measureText:t=>({width:t.length})};
 assert.deepEqual(Array.from(api.wrap(c,'hello world and friends',12,3)),['hello world','and friends']);
 const lines=api.wrap(c,'one two three four five six seven',8,2);assert.equal(lines.length,2);assert.ok(lines[1].endsWith('…'));assert.ok(lines.every(x=>x.length<=8&&!x.startsWith(' ')));
});
test('Chinese poster draws CPM and exports a fixed 720 by 960 image',async()=>{
 const written=[];const c={fillRect(){},drawImage(){},fillText(t){written.push(t)},measureText:t=>({width:t.length*20})};
 const canvas={getContext:()=>c,toBlob:cb=>cb('png')};
 const env={URL,location:{href:'https://leftplayer.github.io/firstgame/'},document:{fonts:{ready:Promise.resolve()},createElement:()=>canvas},Image:class{async decode(){}},scatterInk:()=>[]};
 const f=runInNewContext(source+';createResultPoster',env);
 assert.equal(await f({article:{language:'zh',text:'臣本布衣'},seconds:15.7,stats:{accuracy:100,cpm:123},dataFont:'serif',bodyFont:'serif',glyphs:[]}), 'png');
 assert.equal(canvas.width,720);assert.equal(canvas.height,960);assert.ok(written.includes('CPM'));assert.ok(!written.includes('WPM'));assert.ok(written.includes('123'));assert.ok(written.includes('15.70'));
});
