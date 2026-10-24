export const UI_LANGUAGE_KEY='firstgame.ui-language.v1';
export const UI_TEXT={
 en:{restart:'Restart',retry:'Restart',share:'Share',accuracy:'ACC',words:'WORDS',characters:'CHARS',seconds:'s',wpm:'WPM',cpm:'CPM',titleScope:'Title & buttons',bodyScope:'Body',dataScope:'Time & results',fonts:'English · 5 fonts',collapse:'Collapse / Expand',loading:'Loading…',loadError:'Could not load the passage. Please refresh.',copied:'Invitation and passage link copied',shareError:'Sharing failed. Copy the page URL to invite a friend.',fontLoading:'Loading font…',fontApplied:'Font applied · Saved',fontError:'Could not load font. Previous selection kept.',composing:'Composing',input:'Type the passage above',viewport:'Tap to start typing',result:'Typing results',timer:'Elapsed seconds',speedWords:'Words per minute',speedChars:'Correct characters per minute'},
 zh:{restart:'换一个',retry:'再试一次',share:'分享',accuracy:'准确率',words:'个单词',characters:'个文字',seconds:'秒',wpm:'词/分钟',cpm:'字/分钟',titleScope:'标题与按钮',bodyScope:'正文',dataScope:'计时与成绩',fonts:'英文 · 5 款',collapse:'收起 / 展开',loading:'正在加载…',loadError:'文章加载失败，请刷新页面重试。',copied:'分享文案和同篇文章链接已复制',shareError:'分享未成功，可复制浏览器地址邀请朋友打同一篇。',fontLoading:'正在加载字体…',fontApplied:'字体已应用 · 已保存',fontError:'字体加载失败，已保留原搭配。',composing:'正在输入',input:'输入上方文章',viewport:'点击开始输入',result:'打字成绩',timer:'耗时秒数',speedWords:'每分钟英文单词数',speedChars:'每分钟正确字符数'}
};
export function readUiLanguage(storage){try{return storage.getItem(UI_LANGUAGE_KEY)==='zh'?'zh':'en';}catch{return 'en';}}
export function translate(language,key){return (UI_TEXT[language]||UI_TEXT.en)[key]||key;}
export function applyUiLanguage(root,language,articleLanguage='en'){
 const t=key=>translate(language,key);root.documentElement.lang=language==='zh'?'zh-CN':'en';
 for(const node of root.querySelectorAll('[data-ui]'))node.textContent=t(node.dataset.ui);
 for(const node of root.querySelectorAll('[data-ui-aria]'))node.setAttribute('aria-label',t(node.dataset.uiAria));
 const speed=root.getElementById('speed-label');speed.textContent=t(articleLanguage==='en'?'wpm':'cpm');speed.setAttribute('aria-label',t(articleLanguage==='en'?'speedWords':'speedChars'));
 const toggle=root.getElementById('ui-language');toggle.textContent=language==='zh'?'界面语言：中文 → EN':'UI language: EN → 中文';toggle.setAttribute('aria-label',language==='zh'?'切换界面为英文':'Switch interface to Chinese');
 for(const node of root.querySelectorAll('[data-font-key]')){
  const names={serif:['Roboto Slab · Serif','Roboto Slab · 衬线'],cutive:['Cutive Mono · Typewriter','Cutive Mono · 打字机'],courier:['Courier Prime · Classic','Courier Prime · 经典']};
  if(names[node.dataset.fontKey])node.textContent=names[node.dataset.fontKey][language==='zh'?1:0];
 }
}
