import test from 'node:test';
import assert from 'node:assert/strict';
import {readUiLanguage,translate,applyUiLanguage,UI_TEXT} from '../web/i18n.js';
test('locale defaults to English and tolerates missing or unavailable storage',()=>{
 assert.equal(readUiLanguage({getItem:()=>null}),'en');assert.equal(readUiLanguage({getItem:()=>{throw Error()}}),'en');assert.equal(readUiLanguage({getItem:()=> 'zh'}),'zh');assert.deepEqual(Object.keys(UI_TEXT.en).sort(),Object.keys(UI_TEXT.zh).sort());
});
test('UI switches independently from passage language without touching passage or scores',()=>{
 const node=(dataset={})=>({dataset,textContent:'',setAttribute(k,v){this[k]=v}});
 const labels=['restart','share','accuracy','words','characters','seconds'].map(key=>node({ui:key}));
 const nodes={'speed-label':node(),'ui-language':node(),article:{textContent:'Hello 世界'},whole:{textContent:'32'},accuracy:{textContent:'98.5%'}};
 const root={documentElement:{},querySelectorAll:s=>s==='[data-ui]'?labels:[],getElementById:id=>nodes[id]};
 applyUiLanguage(root,'zh','en');assert.equal(nodes['speed-label'].textContent,'词/分钟');assert.equal(labels[0].textContent,'换一个');assert.equal(labels[5].textContent,'秒');
 applyUiLanguage(root,'en','zh');assert.equal(nodes['speed-label'].textContent,'CPM');assert.equal(labels[0].textContent,'Restart');assert.equal(labels[5].textContent,'s');
 assert.equal(nodes.article.textContent,'Hello 世界');assert.equal(nodes.whole.textContent,'32');assert.equal(nodes.accuracy.textContent,'98.5%');assert.equal(translate('zh','characters'),'个字');
});

test('Chinese labels distinguish actions and use count suffixes',()=>{assert.equal(translate('zh','restart'),'换一个');assert.equal(translate('zh','retry'),'再试一次');assert.equal('2 '+translate('zh','words'),'2 个单词');assert.equal('3 '+translate('zh','characters'),'3 个字');});
