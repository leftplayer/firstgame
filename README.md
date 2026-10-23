# Firstgame · 极简打字

Cocos Creator **3.8.8** / TypeScript 微信小游戏首版源工程。竖屏、黑底白字，无后端。

## 已实现

- 主游戏画面：左上 `TYPE.`、右上 `Restart`，下方小号灰色整数秒计时；正文按中文标点分行，橙色闪烁光标随输入移动。
- 首次输入开始计时，全文完全匹配后结算；错字标红，支持删除修正。
- Restart 随机更换文章，避免连续抽中同一篇。内置原创中文 3 篇、英文 3 篇，无语言切换按钮。
- 结果覆盖层：保留正文背景并压暗，前景按参考图显示大号整数、较小的两位小数及 `s`，底部提供“再来一次 / 分享成绩”。比较文案仅依据同篇文章的上次有效成绩。
- 微信原生键盘适配、成绩按钮与微信右上角菜单分享，通过 article 参数打开相同文章；冷启动和热启动均处理。
- 最近 50 次成绩存于本地，异常存储不会打断游戏。
- Web 预览输入兼容中文组合输入；系统等宽字体，无外部字体或图片依赖；Web 支持系统分享（浏览器不支持时提示截图）。

## 打开与构建

1. 安装 Cocos Dashboard 和 Creator **3.8.8**。
2. 克隆本仓库，在 Dashboard 中选择“导入”并选择仓库根目录。
3. 等待资源导入，打开 `assets/scenes/Main.scene`。场景的 Game 节点已绑定 TypingGame，UI 在运行时生成。
4. 点击预览，点击正文调起输入。无需 npm install；引擎由 Creator 提供。
5. Creator 菜单 **项目 → 构建发布**，平台选 **微信小游戏**，初始场景选 Main，方向选 **竖屏**，填入你自己的小游戏 AppID 后构建。
6. 使用微信开发者工具导入生成的 `build/wechatgame` 目录，以实际构建目录名为准。不要将源工程目录当作微信小游戏构建包导入。
7. 开发者工具预览二维码，在 iOS/Android 微信中完成下面的验收。

AppID 尚未提供，工程不使用假的 AppID。`game.json`、`project.config.json` 由 Cocos 构建生成，不手写替代引擎产物。

官方构建文档：https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-wechatgame.html

## 测试

Node.js 24：`npm test`。无第三方测试依赖，测试直接运行业务 TypeScript。

当前自动化覆盖计时、错字修正、删除、结算冻结、Unicode、长度限制、随机排除和空配置，共 8 项。
**当前环境未安装 Cocos Creator 或微信开发者工具：尚未完成引擎编译、场景加载与真机验收。此提交是可导入的首版源工程，不是已验证的发行包。**

## 文件结构

- `assets/scripts/TypingSession.ts`：独立输入状态机和文章选择。
- `assets/scripts/Game.ts`：Cocos UI、输入适配、计时展示、本地记录、分享入口。
- `assets/resources/articles.json`：文章配置；文章 ID 发布后保持稳定，分享依赖 ID。
- `assets/scenes/Main.scene`：启动场景。
- `docs/ACCEPTANCE.md`：构建与真机检查清单。

## 首版边界

计时采用墙钟时间，切到后台仍计入耗时。正确率不展示，必须修正全文才能结算。当前无反作弊承诺，微信键盘粘贴/联想仍需实机评估。数字仅轻量缩放过渡，完整翻页动效后置。字体使用系统 monospace，未嵌入 Windows 专有字体。微信分享使用平台默认截图，定制分享卡片后置。当前固定 750 × 1334 设计分辨率，保持比例适配，极端长屏可能留黑边；键盘遮挡和安全区需真机验证。

## GitHub Pages 网页效果预览

`web/` 是独立 DOM/CSS 预览界面，共用 `TypingSession.ts` 和文章 JSON，不是 Cocos 导出的 Web 包；用于先确认视觉与交互，不能替代小游戏验收。

本地 Node 24 执行 `node scripts/build-web.mjs`，再运行 `python -m http.server 8080 --directory dist`，访问 http://localhost:8080 。

仓库 Settings → Pages → Source 选择 **GitHub Actions**。推送 main 或手动运行 **Deploy web preview to Pages** 自动测试、构建、发布。预期公开地址为 https://leftplayer.github.io/firstgame/ ，以部署任务输出为准。仓库当前为组织私有仓库，Pages 可用性取决于组织套餐；若界面要求升级，不要为了部署擅自公开源仓库。
