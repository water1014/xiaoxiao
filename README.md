# 笑笑养成记 · 工作台

一个**纯前端、离线可用**的移动端 PWA 个人养成工作台。原单文件 HTML（约 3 万行）已拆分为 **33 个按序加载的分片文件（15 个 CSS + 18 个 JS），全部平铺在仓库根目录**，方便在 GitHub 网页端（含手机）管理与上传，也方便用 PWA Builder / HBuilder 打包成 Android APK。

> **为什么平铺而非 `css/`、`js/` 子目录？** GitHub 网页端无法像桌面那样拖拽文件夹自动建立目录层级（手机端尤其如此）。平铺后所有文件直接在根目录，手机上传可一次多选完成，引用路径也更简单。若日后用桌面/命令行维护，仍可按需恢复子目录（只要 `index.html` 的引用路径同步改回即可）。

---

## 一、文件清单（平铺于根目录）

**入口与元信息**
```
index.html            主入口（结构 + 动态样式容器 + 按序引入分片）
icon.svg              512×512 矢量图标（五瓣花，主题渐变）
icon-192.png          PWA 图标 192
icon-512.png          PWA 图标 512
icon-maskable-512.png PWA 图标 512（maskable，自适应安全区）
manifest.webmanifest  PWA 清单（name / 图标 / shortcuts）
sw.js                 Service Worker（运行时缓存，自动纳管新增资源）
```

**样式分片（15 个，数字顺序引入，层叠顺序与原单文件一致）**
```
01-tokens.css       ① 全局变量 / Design Tokens / reset
02-core.css         ② 通用组件 + ③ 主题（[data-theme]）+ ④ 基础
03-material.css     ④ 材质系统（flat / clear / glass）+ 大屏断点
04-modules-life.css 心情日记 / 日历 / 番茄钟 / 呼吸 / 灵感册 / 生理期…
05-home-edit.css    首页编辑模式（拖拽排序）
06-columns.css      三个核心专栏增强样式
07-preview-4.css    4 格预览图
08-music-player.css 音乐播放器基础
09-ledger.css       记账本（金玉收支账）
10-profile.css      我的页
11-components.css   统一组件节奏
12-mobile-tabs.css  底部 tab / 安装引导 / 骨架屏 / 早安复盘
13-music-decor.css  空灵风音乐装饰层
14-patches.css      第三方补丁（Censy / MUFY / Zero 等，!important 锁定）
15-tail.css         末尾补丁块（落在动态 style 容器之后，最后加载）
```

**脚本分片（18 个，数字顺序引入，共享全局作用域）**
```
01-constants.js     常量数据
02-state.js         状态 & 持久化（save/saveNow/flushSave）
03-utils.js         工具函数
04-decor.js         美化设置：样式 / 背景 / 字体 / 存档
05-boot.js          启动引导 + 触感反馈（haptic）
06-components.js    通用精致组件
07-home.js          数据看板 / 首页
08-profile.js       「我的」个人主页
09-modules.js       首页 Bento Grid 看板
10-period.js        生理期记录
11-study.js         智能研习社
12-feed.js          表单弹窗
13-diary.js         心情日记
14-video.js         B 站视频学习区
15-daily.js         启动 / 日常
16-music-core.js    清音听雨阁（体积最大，音频引擎）
17-music-app.js     音乐小 App · 主页
18-tail.js          收尾：PWA 注册 / 空闲重放写入 / 全局事件
```

本地另有 `archive/`（约 51MB 历次验证截图与报告，仅供追溯，**不纳入打包/上传**）。

> **运行时动态样式容器**（必须留在 `index.html` 内，UI 改样式时由 JS 写入，**不可外置**）：
> `#card-style`、`#user-style`、`#app-font`、`#local-font-face`。

---

## 二、拆分原则（为什么这样切）

1. **按原文件顺序物理切分**，不按功能重排。文件名 `NN-*.css` / `NN-*.js` 的**数字前缀锁定加载顺序**，CSS 层叠与 JS 执行都依赖先后次序，重排会静默改变优先级、造成难以定位的回退。每个分片文件头都标注了「来源：原 index.html 第 X–Y 行」，改样式请就地编辑对应分片。
2. **保留全局作用域 + 普通 `<script>` 顺序加载**，不使用 `type="module"`。原因：
   - 项目有 **531 处内联事件处理器**（`onclick` 461 / `oninput` 32 / `onchange` 32 / `onkeydown` 6），它们依赖全局函数；ES 模块的作用域不挂 `window`，会导致全部失效。
   - ES 模块在 `file://` 下因 CORS 失败，而 HBuilder 5+ App / WebView 正是以 `file://` 加载——用普通脚本才能离线直开。
3. **样式不抽 `animations.css`**：`@keyframes` 散落交织在各分区，强行独立抽离会破坏层叠顺序，故保留在各分区文件内。

---

## 三、本地运行

```bash
# 推荐：起一个本地静态服务（PWA/SW 需要 http/https 才能注册）
python3 -m http.server 8137
# 浏览器打开 http://localhost:8137/index.html
```

- **http 方式**：PWA 可安装、离线缓存（SW）生效。
- **直接双击 `index.html`（`file://`）**：应用本身可正常运行（普通脚本不受 CORS 限制），但 **Service Worker 不生效**（浏览器限制），即无离线缓存。功能不受影响。

---

## 四、PWA / 打包 APK

- **PWA 三件套已补齐**：`manifest.webmanifest` + `sw.js` + 三张图标（`icon-192.png` / `icon-512.png` / `icon-maskable-512.png`，含 maskable）。旧版 HTML 一直在引用这些文件却从未创建，是此前「装不上 PWA」的唯一原因——现已修复并通过验证（SW `activated`、manifest 可解析、4 图标 + sw.js 全部 200、零报错）。
- **`sw.js` 运行时缓存**：导航走 network-first（离线回退），同源静态资源走 stale-while-revalidate，**不硬编码文件清单**——新增的分片自动纳入缓存，无需回头改 SW。
- **打包 APK**：
  - *PWA Builder*：把整个目录（`index.html` + 各分片 + `manifest.webmanifest` + `sw.js` + 图标）整体上传或指向其 https 地址，生成可安装 APK。
  - *HBuilder*：作为 5+ App / WebView 工程打包，`file://` 直开即可（见第二节第 2 点）。
  - **注意**：`archive/` 仅为历史追溯，打包时无需包含；其余文件需保持相对路径一起拷贝。

---

## 五、优化清单落实状态

### 9 条性能 / 健壮性优化（已落实 6 条，3 条据实评估后拒做）

| # | 任务 | 状态 | 说明 |
|---|------|------|------|
| 1 | 移除外部 Google Fonts | ✅ 已做 | 字体改走 `:root` `--font-zh/-en/-num` 系统字体栈；「美化设置→导入字体」按需加载不受影响 |
| 2 | IndexedDB 错误降级 | ✅ 已做 | `dbPut`/`imgDBPut` 的 `giveUp` 加内存暂存（`window._pendingWrites`），存储恢复后由 `retryPendingWrites()` 空闲自动重放并提示 |
| 3 | 音乐播放器释放优化 | ⚠️ 拒做 | 现有 `on*=null` + `removeAttribute('src')` + `load()` + `revokeObjectURL` 已完整，优于建议的监听器表方案 |
| 4 | 数据保存即时落盘（`save→saveNow`） | ⚠️ 拒做 | 191 处 `save` 全部改同步 stringify 几 MB state 会卡死主线程；现有 `flushSave()` 挂在 `pagehide/beforeunload/visibilitychange` 已不丢 |
| 5 | 消除 CSS `!important` | ⚠️ 拒做 | `DEFAULT_CSS` 基线本身用 `!important` 锁定；建议的内联方案会压过媒体查询、破坏大屏适配、覆盖用户自定义 CSS |
| 6 | 空状态插画多样化 | ✅ 已做 | `emptyIllu()` 新增 8 个 40px 专属插画（sword/figure/sun/chip/compass/news/fire/film） |
| 7 | 响应式断点（大屏适配） | ✅ 已做 | 10 处 `max-width:480px` 令牌化为 `var(--app-w,480px)`；`@media (min-width:640px/1024px)` 同步变宽 `.grid/.bento` |
| 8 | 延迟加载非关键 JS（whenIdle） | ✅ 已有 | `initMusic` 在 `whenIdle(1500)`、`autoBackup`/`checkStorageHealth` 在 `whenIdle(900)` 已实现 |
| 9 | 可访问性增强（toast aria-live） | ✅ 已做 | `toast()` 标记 `role="status"` + `aria-live="polite"` + `aria-atomic="true"` |

### 4 条额外美化建议（此前 24 条优化任务中已实现，无需重复）

| 建议 | 现状 | 位置 |
|------|------|------|
| 底部导航弹性 | ✅ 已实现 | `.bot-tab .bt-item{flex:1}` 弹性等分 + `--ease-spring` 弹簧缓动 + 选中 `scale(1.08)` + 指示条弹簧滑动（`12-mobile-tabs.css`） |
| 打字光标主题色 | ✅ 已实现 | 首页问候语「打字机光标」呼吸光标（`14-patches.css`） |
| 卡片入场延迟 | ✅ 已实现 | `.stagger-item` 配 `--i` 变量做 `animation-delay:calc(var(--i)*.05s)` 错峰入场（`03-material.css`） |
| 主题过渡 | ✅ 已实现 | 材质层 / 主题切换 `transition:background .3s` 平滑过渡 |

---

## 六、背景图上传 Bug 修复（历史根因，已闭环）

用户「本地上传背景不成功 / 不显示」由三个叠加问题导致，均已修复：

1. **函数名冲突（写入层）**：两个同名全局 `compressImage`，后定义覆盖前者，导致背景上传参数错位、图片根本没写入。→ 音乐装修版改名为 `compressImageToWidth`，与背景/封面三参版隔离。
2. **引用指针进 CSS（渲染层）**：`renderBoot()` 直接用 `getPath()` 返回的引用指针（`"idb:decorBg"`）写 `background-image`，得到无效路径 `url("idb:decorBg")`。→ 改用 `readImage()` 解析成真实 data URL。
3. **上传后预览不刷新（UX 层）**：`afterBgSet()` 用 `dataset.mod==="decor"` 判断，但全项目无 `data-mod` 属性（实际是独立视图 `currentView==="decor"`），判定永远 false。→ 改为「`data-curmod`/`data-module`/`currentView`/`lastModuleId`」三重信号判定。

**持久化加固**：背景图内联阈值 `400KB → 1.2MB`，确保真机大照片压缩后强制内联进 `localStorage`（不依赖 IndexedDB，后者在 PWA/`file://`/隐私模式下常不可用）；`readImage` 异步回源后补 `renderBoot()`；启动加死引用自检提示。4.3MB 大图验证 reload 后仍在。

> **已知限制（平台固有）**：Web 存储（localStorage/IndexedDB）不跨浏览器共享，纯前端无解法；同浏览器重开刷新即可，跨浏览器需「重传一次」。

---

## 七、验证清单（拆分后已通过）

| 项 | 结果 |
|----|------|
| 全部分片无 404 | ✅ 本地 http 探活全 200（15 CSS + 18 JS + 图标 + sw.js） |
| 加载顺序正确（按数字前缀） | ✅ 15 CSS、18 JS 按 `NN-` 顺序 `<link>`/`<script>` |
| console 无真实报错 | ✅ 仅 1 条 `navigator.vibrate` 手势前拦截（良性，非错误） |
| 全局函数就位（531 处 onclick 安全） | ✅ 抽样 14 个核心函数全部 `typeof function` |
| CSS 生效（tokens/组件/字体） | ✅ `--app-w:480px`、`.card` 圆角、字体栈落地 |
| 主界面 + 底部导航渲染 | ✅ `.app` 可见、`<nav class="bot-tab">` 含 5 主标签 |
| localStorage / IndexedDB 可用 | ✅ 二者均 true |
| 内联事件处理器 | ✅ 当前视图 67 处（全站 531 处跨视图） |
| 内容完整性（逐片逐字一致） | ✅ CSS 426259 字符逐字一致；18 个 JS 分片逐片比对一致 |
| 相对路径正确（平铺根目录） | ✅ `index.html` 引用 `01-tokens.css` 等无子目录前缀 |
| 手机 / 大屏响应式 | ✅ 390×844 引导正常；640/1024 断点已验证 |

---

## 八、二次开发指引

- **改样式**：定位对应 `NN-*.css` 就地修改，保持文件名数字顺序不变。
- **改逻辑**：定位对应 `NN-*.js`；新增函数会自动挂到全局作用域（普通脚本），可被内联 `onclick` 直接调用。
- **新增资源**：图标直接放根目录，`sw.js` 会自动缓存；JS/CSS 直接放根目录并按需加 `<script>`/`<link>` 即可（引用写 `文件名` 而非 `子目录/文件名`）。
- **不要做的事**：不要把普通脚本改成 `type="module"`（会废掉 531 处内联事件且 `file://` 失效）；不要跨分片调整 CSS 引入顺序（会改层叠优先级）。
