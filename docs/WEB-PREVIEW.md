# Web preview

GitHub Pages builds the DOM preview; these UI changes apply to web, not the Cocos scene.

Chinese uses original characters, including punctuation, and supports multi-character IME commits. Preedit starts the clock immediately when the browser receives a keystroke / insertion / composition update; validation waits for committed Chinese text. English preedit still updates immediately.

Incorrect characters remain in the input and are highlighted red in the original text. Later characters continue advancing normally. No error message is shown. Web rounds finish when the article character count is reached, even with errors. Chinese IME preedit starts timing but only committed text completes a round.

The viewport contains five lines. Row one stays at the top initially; afterward one previous row is retained so the active row stays second. Lower rows fade and blur. Result timer uses smaller typography.

Run `npm test` and `node scripts/build-web.mjs`. Mobile native IME behavior still needs real-device verification.

Rendered glyph cells have a fixed 37px line height. The article is translated by the actual previous row offset; an absolutely positioned caret cannot change wrapping. Assets and module imports use content hashes to avoid mixed cached deployments.


Feedback: Web Audio creates quiet clicks after user interaction, with an 8ms vibration request on supported devices. Sound and haptics are always enabled with no in-page controls; old saved toggle preferences are ignored. Wrong characters use a distinct low double tone, replacing a pending normal click. Repeated keyboard/composition notifications within 35ms are coalesced. Missing APIs are harmless.

Results: accuracy = correct positions / final input characters; speed = final input characters / elapsed minutes; character count includes punctuation and spaces, counts Unicode code points. Completion time freezes before the 650ms scatter effect. Only visible glyphs scatter; reduced-motion users skip the burst. Restart cancels pending animation and result reveal. Native share/copy includes all metrics.

English non-whitespace tokens are unbreakable word containers. The active timer turns orange immediately on first input and resets to gray on Restart.

Result metrics now show ACC / WPM / WORDS / CHARS. WPM counts actual English words per elapsed minute (not characters divided by five). Apostrophes and hyphens inside words are retained; punctuation alone is excluded. Chinese articles show a dash for English-only word metrics. Short test text: `cat and dog sun and sky`, with natural wrapping and no forced line breaks. English spaces are rendered at .35em. Result focus has no outer outline; buttons suppress text selection and use scale/opacity press feedback with a muted keyboard focus outline.

Mobile polish follow-up: result is no longer programmatically focusable/focused; pointer activation does not focus buttons. Descendants cannot be selected, long-press context menus are disabled on buttons, and a transient pressed state provides visible feedback. Keyboard focus uses an underline rather than an outline. The short article adds `bird` and has a 280px maximum text width, naturally wrapping into two rows without a required newline.

English composition updates may finish a round as soon as the last letter arrives; no Enter or candidate confirmation is required. Chinese still waits for committed characters. The regression test sends compositionstart/compositionupdate for the last word and confirms completion before compositionend.

The orange result time uses the same Courier New / monospace stack as metadata, at weight 700. All buttons play a distinct two-note sine sound, separate from typing and error feedback. Restart performs a 420ms shuffle of visible characters before selecting the next article; repeated taps during transition are ignored. Reduced-motion skips the shuffle.

Restart 采用 760ms 连续字符过渡：按真实字形位置捕获旧文和新文，打散后在翻转中换字，再回弹到新文排版位置，支持中英文及字符数量变化。计时数字按变化数位滚动，进位同步更新。减少动态效果系统设置下直接切换。

完成全文后，可见字符旋转下落、回弹并在底部保留为低亮度文字堆；260ms 后显示成绩。Restart 从文字堆当前位置重组，优先匹配同字，跨语言错峰换字。字符数上限120，底部最多5层，动画层不接收点击；支持减少动态效果。

字体测试面板：EN 为 Roboto Mono / Roboto / Roboto Slab；中文为 Noto Sans SC / Noto Serif SC / LXGW WenKai TC。字体通过 Google Fonts 获取，按 ASCII 与内置中文文章、固定样句字符子集打包到 web/fonts，许可证随包保存；新增文章需重新生成中文子集。页面内按需加载，加载成功后切换全局字体，保留会话并重新计算活动行；localStorage 保存选择。测试面板可折叠。

字体实验室 v2：11 款英文、8 款中文，标题与按钮 / 正文 / 计时与成绩各自独立选择中英文字体。共六个选择器，localStorage firstgame.fonts.v2 保存搭配，并兼容 v1。加载失败保留原搭配，快速切换只应用最后一次选择。字体本地按需加载，切换不重置输入；面板可折叠、内部滚动。单字重字体由浏览器合成粗体。
新增来源：Google Fonts（VT323、IBM Plex Mono、Share Tech Mono、Cutive Mono、Courier Prime、Pixelify Sans、Press Start 2P、Ma Shan Zheng、Liu Jian Mao Cao、ZCOOL XiaoWei）；W95FA 来自 fontsource/font-files fonts/other/win95fa；Fusion Pixel 来自 TakWolf/fusion-pixel-font 2026.10.16 release 12px monospaced zh_hans；BoutiqueBitmap9x9 来自 scott0107000/BoutiqueBitmap9x9 1.93。所有新增字体附 OFL 授权。两款中文点阵子集内部重命名为 NowTyping Fusion / NowTyping Bitmap，字体原始作者及许可保留。

新增中文测试字体：Chiron Hei HK（昭源黑体）、Chiron GoRound TC（昭源环方）、ZCOOL QingKe HuangYou（站酷庆科黄油）。通过 Google Fonts CSS2 获取内置文章子集，许可证来自 google/fonts/ofl 对应目录，随字体本地打包。当前英文可选6款、中文8款，移除英文街机选项。正文固定20px，计时样例包含数字、大写与小写英文字母。

中文候选已替换为思源黑体、思源宋体、MiSans、阿里巴巴普惠体、HarmonyOS Sans SC。旧的六款不再展示。新增字体按需使用完整原始字体或字体供应商提供的切片，未自行改写/裁剪字体文件。MiSans 来源 https://font.sec.miui.com/font/css?family=MiSans:400:Chinese_Simplify,Latin&display=swap；许可 https://hyperos.mi.com/font/zh/download/。普惠体使用 liruifengv/alibaba-puhuiti 前端示例仓库提供的原始 Alibaba-PuHuiTi-Regular.otf，来源 https://github.com/liruifengv/alibaba-puhuiti；官方说明 https://supplier.alibaba.com/us/news/PX909446.htm。HarmonyOS Sans SC 来自 OpenHarmony 官方 utils_system_resources/fonts 原始 TTF；许可 https://developer.huawei.com/consumer/cn/design/resource-V1。测试区显式标注使用字体。新增字体依赖外部字体服务，加载失败保留之前搭配并可重试。正文始终20px。
