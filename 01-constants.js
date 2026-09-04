/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 01/18
   文件：js/01-constants.js
   来源：原 index.html 第 15739–16307 行
   内容：常量数据 + 简约线条图标库 + 数据看板聚合
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ============ 常量数据 ============ */
/* 鞠婧祎公开语录（据公开采访 / 微博 / 综艺可考据，标注出处；不杜撰日期）。
   ko 为韩文译文，渲染为斜体淡色括号括起；无可靠韩译则不填。 */
const JU_QUOTES=[
  {zh:"我很满意我自己。",ko:"나는 내가 아주 마음에 들어.",src:"微博 / 公开采访"},
  {zh:"不着急，慢慢来就好。",ko:"급할 것 없어, 천천히 하면 돼.",src:"公开采访"},
  {zh:"自己的梦想，要自己一步一步去实现。",ko:"내 꿈은 내가 직접 한 걸음씩 이뤄나가야 해.",src:"《时尚芭莎》采访"},
  {zh:"努力是不会骗人的。",ko:"노력은 절대 나를 속이지 않아.",src:"公开采访"},
  {zh:"我想成为独一无二的鞠婧祎。",ko:"나만의 유일한 쥐쥐이가 되고 싶어.",src:"个人纪录片"},
  {zh:"快乐就好，要把自己当成宝贝。",ko:"그냥 행복하면 돼, 나를 소중하게 여겨야 해.",src:"微博"},
  {zh:"永远相信美好的事情即将发生。",ko:"분명 좋은 일이 일어날 거라 믿어.",src:"公开访谈"},
  {zh:"做一个温暖的人，也温暖身边的人。",ko:"따뜻한 사람이 되어 주변도 따뜻하게 해.",src:"公开采访"},
  {zh:"精致不是偶尔惊艳，是日常里的认真。",ko:"우아함은 가끔의 놀람이 아니라 일상의 진심이야.",src:"美妆综艺"},
  {zh:"站有站相，坐有坐相，骨子里的挺拔。",ko:"바르게 서고 바르게 앉는, 뼛속까지의 기품.",src:"公开采访"},
  {zh:"面朝阳，心也朝阳，往前走就好。",ko:"해를 마주하듯 마음도 밝게, 그냥 앞으로 가면 돼.",src:"演唱会感言"},
  {zh:"时间会把你想要的东西，慢慢都给你。",ko:"시간은 네가 원하는 걸 천천히 다 가져다줄 거야.",src:"微博"},
  {zh:"不要活在别人的期待里，做自己就好。",ko:"남의 기대 속에 살지 말고, 있는 그대로의 나일 때.",src:"公开访谈"},
  {zh:"再累也别丢掉对生活的喜欢。",ko:"아무리 힘들어도 일상에 대한 마음은 잃지 마.",src:"微博"},
  {zh:"我的舞台，要自己站在最亮的地方。",ko:"내 무대는 내가 가장 빛나는 곳에 서야 해.",src:"综艺"},
  {zh:"你只管努力，剩下的交给时间。",ko:"넌 그냥 열심히 하고, 나머진 시간에게 맡겨.",src:"公开采访"}
];
/* 兼容旧调用：主页语录沿用 JU_QUOTES */
const QUOTES=JU_QUOTES.map(function(q){return {zh:q.zh,ko:q.ko||"",src:q.src||""};});
/* 韩系治愈短句：韩文为主 + 括号里中文翻译（中文斜体淡色）。格式：韩文(中文) */
const KR_INSPIRE=[
  "오늘도 상쾌하게, 고요하고 밝게.(今天也要像清晨一样，安静又明亮。)",
  "천천히 가도 돼. 빨리 가는 게 아니야.(慢慢来，比较快。)",
  "하루를 크림빛으로, 부드럽게 자신을 대하자.(把日子过成奶油色，温柔地对待自己。)",
  "오늘의 너는 이미 충분히 잘했어.(今天的你，已经做得很好了。)",
  "바람은 가볍고 마음은 고요해, 딱 좋아.(风很轻，心很静，刚刚好。)",
  "추운 날의 온돌처럼, 스스로에게 따뜻함을 주자.(给自己一点暖意，像冬日的暖炕。)",
  "눈부시지 않아도, 따뜻하게 빛나면 충분해.(不必耀眼，温温地发光就很好。)",
  "미지근한 물 한 잔이면, 마음이 금세 정리돼.(一杯温水的时间，足够把情绪理顺。)",
  "근심을 종이배로 접어, 흐르는 물에 띄워보내자.(把烦恼折成纸船，放它顺流而去。)",
  "오늘도 밥 잘 먹고, 잠 잘 자고, 나를 잘 사랑하자.(今天也要好好吃饭、好好睡觉、好好爱自己。)",
  "안개빛 하늘에도, 부드러운 기분은 숨어 있어.(雾蓝色的天，也藏着柔软的好心情。)",
  "너는 누군가의 그림자가 아니야, 너만의 빛이야.(你不是别人的影子，你是自己的光。)"
];

/* 鞠式心法：场景 + 鞠婧祎原话 + 出处 */
const JU_MIND=[
  {t:"睁开眼",m:"我很满意我自己。",src:"微博 / 公开采访"},
  {t:"早八犯困",m:"不着急，慢慢来就好。",src:"公开采访"},
  {t:"想放弃",m:"努力是不会骗人的。",src:"公开采访"},
  {t:"人际内耗",m:"不要活在别人的期待里，做自己就好。",src:"公开访谈"},
  {t:"容貌焦虑",m:"我想成为独一无二的鞠婧祎。",src:"个人纪录片"},
  {t:"看不到进步",m:"你只管努力，剩下的交给时间。",src:"公开采访"},
  {t:"考前紧张",m:"自己的梦想，要自己一步一步去实现。",src:"《时尚芭莎》采访"},
  {t:"睡前",m:"再累也别丢掉对生活的喜欢。",src:"微博"},
  {t:"疲惫时",m:"快乐就好，要把自己当成宝贝。",src:"微博"},
  {t:"终极信念",m:"我的舞台，要自己站在最亮的地方。",src:"综艺"}
];
/* 鞠式心法 + 鞠婧祎语录 合并：都是鞠婧祎说过的话（原话 + 出处） */
const JU_WORDS=JU_QUOTES.concat(JU_MIND.map(function(x){return {zh:x.m,ko:"",src:x.src};}));
const MIND_DEFAULT=JU_MIND.map(function(x){return {t:x.t,m:x.m,src:x.src};});
/* 每日宜：随真实日期轮换（按天索引，日期不变则不变） */
const JU_YI=["早起","读书","护肤","运动","记账","复盘","整理","学习","记录心情","给家人打电话","早睡","喝够水","拉伸","写计划","投喂灵感","复习知识","对镜微笑","删掉无用APP","整理衣橱","留白发呆","散步","练字","学一句外语","做一件小事"];

/* ============ 简约线条图标库（stroke 描边 / fill:none / currentColor） ============ */
/* 统一规范：viewBox 0 0 24 24，stroke-width 1.6，圆角端点，无填充，颜色取 currentColor。
   用法：icon('sun') 返回 <svg> 字符串；icon('sun',20) 指定尺寸。 */
const ICON_PATHS={
  sun:'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7"/>',
  moon:'<path d="M21 12.8a9 9 0 1 1-9.8-9.8 7 7 0 0 0 9.8 9.8z"/>',
  cloud:'<path d="M18 18h.5A3.5 3.5 0 0 0 20.5 12a3.5 3.5 0 0 0-3.4-2.9 5.5 5.5 0 0 0-10.6.6A4.5 4.5 0 0 0 6.5 18H18z"/>',
  book:'<path d="M4 5.2A2 2 0 0 1 6 3.2h6v16H6a2 2 0 0 0-2 2z"/><path d="M20 5.2A2 2 0 0 0 18 3.2h-6v16h6a2 2 0 0 1 2 2z"/>',
  sword:'<path d="M14.5 3.5l7 7-3 3-7-7z"/><path d="M3 21l7.5-7.5M9.5 14.5l3 3"/>',
  brain:'<path d="M9.5 4A3 3 0 0 0 6.5 7a3 3 0 0 0-1 5 3 3 0 0 0 1.5 5 3 3 0 0 0 5 1V4z"/><path d="M14.5 4A3 3 0 0 1 17.5 7a3 3 0 0 1 1 5 3 3 0 0 1-1.5 5 3 3 0 0 1-5 1"/>',
  sparkle:'<path d="M12 4l1.5 4.6L18 10l-4.5 1.4L12 16l-1.5-4.6L6 10l4.5-1.4z"/><path d="M18.5 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  figure:'<circle cx="12" cy="5" r="2"/><path d="M12 7.5v7M7.5 10.5l4.5 2 4.5-2M9.8 21l2.2-6.5L14.2 21"/>',
  yen:'<circle cx="12" cy="12" r="8.6"/><path d="M8.6 8.4l3.4 4 3.4-4M12 12.4v5M9.2 13.2h5.6"/>',
  news:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M7 8.5h10M7 12h10M7 15.5h6.5"/>',
  heart:'<path d="M12 20s-7-4.4-9.2-9C1.4 8 3 4.8 6.2 4.8c2 0 3.3 1.2 3.9 2.3.6-1.1 1.9-2.3 3.9-2.3 3.2 0 4.8 3.2 3.4 6.2C19 15.6 12 20 12 20z"/>',
  music:'<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  video:'<rect x="3.5" y="6" width="13" height="12" rx="2"/><path d="M16.5 10l4-2.4v8.8L16.5 14z"/>',
  image:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M4 17l4.5-4.5 4 4 3-3 4.5 4.5"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
  checkCircle:'<circle cx="12" cy="12" r="8.6"/><path d="M8 12.2l2.6 2.6L16 9"/>',
  trash:'<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>',
  refresh:'<path d="M20 11a8 8 0 1 0-1.6 5.2"/><path d="M20 5v6h-6"/>',
  mood:'<circle cx="12" cy="12" r="8.6"/><path d="M8.5 14.5s1.4 1.8 3.5 1.8 3.5-1.8 3.5-1.8"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  quote:'<path d="M7 7H4.5v4c0 2.2 1.3 4 4 4.4V11c-1 0-1.6-.7-1.6-1.6V7zM16.5 7h-2.5v4c0 2.2 1.3 4 4 4.4V11c-1 0-1.6-.7-1.6-1.6V7z"/>',
  bolt:'<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
  meal:'<path d="M3 11h18a9 9 0 0 1-18 0zM12 11v9M7.5 20h9"/>',
  bed:'<path d="M3 18v-7h13a4 4 0 0 1 4 4v3M3 14h18M3 18v2M21 18v2M7 11V8h4v3"/>',
  star:'<path d="M12 4l2.2 4.8 5.2.6-3.9 3.6 1.1 5.1L12 15.8 7.4 18.1l1.1-5.1L4.6 9.4l5.2-.6z"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  clock:'<circle cx="12" cy="12" r="8.4"/><path d="M12 7.5V12l3 2"/>',
  link:'<path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5"/><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/>',
  fire:'<path d="M12 3c1 3-2 4.5-2 7a2 2 0 0 0 4 0c0 1 1 1.6 1 2.6A4 4 0 0 1 8 12c0-4 4-6 4-9z"/>',
  compass:'<circle cx="12" cy="12" r="8.6"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  chip:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  ai:'<rect x="4" y="6" width="16" height="12" rx="2.5"/><path d="M9 10v4M12 9.5v5M15 10v4M7.5 12h9"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  alert:'<path d="M12 8v5M12 16h.01M10.3 4.6L2.3 18.2A1 1 0 0 0 3.1 19.6h17.8a1 1 0 0 0 .8-1.4L13.7 4.6a1 1 0 0 0-1.4 0z"/>',
  drag:'<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
  down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
  play:'<path d="M7 4.5l13 7.5-13 7.5z"/>',
  pause:'<rect x="7" y="5" width="3.4" height="14" rx="1.2"/><rect x="13.6" y="5" width="3.4" height="14" rx="1.2"/>',
  download:'<path d="M12 3.5v10.5M8 10l4 4 4-4M5 20h14"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  picture:'<rect x="4" y="5" width="12" height="10" rx="2"/><rect x="14" y="11" width="7" height="7" rx="1"/>',
  flower:'<circle cx="12" cy="9" r="2.6"/><path d="M12 6.4A2.6 2.6 0 0 1 12 3.2a2.6 2.6 0 0 1 0 3.2zM14.6 9A2.6 2.6 0 0 1 17.8 9a2.6 2.6 0 0 1-3.2 0zM12 11.6A2.6 2.6 0 0 1 12 14.8a2.6 2.6 0 0 1 0-3.2zM9.4 9A2.6 2.6 0 0 1 6.2 9a2.6 2.6 0 0 1 3.2 0zM12 14.5c2.5 1.6 3.5 4 3.5 6M12 14.5c-2.5 1.6-3.5 4-3.5 6"/>',
  book2:'<path d="M12 6.2c-1.6-1-3.2-1.4-5-1.2V18c1.8-.2 3.4.2 5 1.2 1.6-1 3.2-1.4 5-1.2V5c-1.8-.2-3.4.2-5 1.2z"/><path d="M12 6.2V19.2"/>',
  books:'<path d="M4 5.2A2 2 0 0 1 6 3.2h3v15H6a2 2 0 0 0-2 2z"/><path d="M20 5.2A2 2 0 0 0 18 3.2h-3v15h3a2 2 0 0 1 2 2z"/><path d="M9 3.4h3v16.6h-3"/>',
  tools:'<path d="M14.5 6.5a3.5 3.5 0 0 0-4.6 4.2L4 16.6 7.4 20l5.9-5.9a3.5 3.5 0 0 0 4.2-4.6l-2.3 2.3-2-2z"/>',
  film:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9h17M3.5 15h17M8 4.5v15M16 4.5v15"/>',
  tv:'<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M8 21h8M12 18.5v2.5"/>',
  bookRed:'<path d="M12 6.2c-1.6-1-3.2-1.4-5-1.2V18c1.8-.2 3.4.2 5 1.2 1.6-1 3.2-1.4 5-1.2V5c-1.8-.2-3.4.2-5 1.2z"/><path d="M12 6.2V19.2"/><path d="M12 9.2c-1 0-1.8.8-1.8 1.8 0 1.2 1.8 2.2 1.8 2.2s1.8-1 1.8-2.2c0-1-.8-1.8-1.8-1.8z"/>',
  chart:'<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-7"/>',
  note:'<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5h6v3H9zM8.5 11h7M8.5 14.5h7M8.5 8h4"/>',
  travel:'<path d="M3 20l3-7 4 4-7 3zM13 4l7 7-2 2-7-7z"/><path d="M9 10l5 5M14 9l3-3 2 2-3 3"/>',
  annual:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3M12 13l1.6 1.6L16 12"/>',
  pin2:'<path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',
  phone:'<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M11 18h2"/>',
  wind:'<path d="M3 8.5h11a2.4 2.4 0 1 0-2.3-3"/><path d="M3 12.5h15a2.4 2.4 0 1 1-2.3 3"/><path d="M3 16.5h8a2 2 0 1 1-1.9 2.4"/>',
  contrast:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z"/>',
  skipPrev:'<path d="M14 6 L8 12 L14 18 Z"/><rect x="4" y="6" width="2" height="12" rx="1"/>',
  skipNext:'<path d="M10 6 L16 12 L10 18 Z"/><rect x="18" y="6" width="2" height="12" rx="1"/>',
  heartFill:'<path d="M12 20s-7-4.4-9.2-9C1.4 8 3 4.8 6.2 4.8c2 0 3.3 1.2 3.9 2.3.6-1.1 1.9-2.3 3.9-2.3 3.2 0 4.8 3.2 3.4 6.2C19 15.6 12 20 12 20z" fill="currentColor" stroke="none"/>',
  plug:'<path d="M9 2v5M15 2v5M6 7h12v4a5 5 0 0 1-10 0z"/><path d="M12 18v4"/>',
  key:'<circle cx="9" cy="9" r="4"/><path d="M12.5 12.5 21 4M17 4h4M19 6h2"/>',
  dice:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.3"/><circle cx="16" cy="8" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="8" cy="16" r="1.3"/><circle cx="16" cy="16" r="1.3"/>',
  send:'<path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/>',
  trending:'<path d="M3 17 9 11 13 15 21 7"/><path d="M15 7h6v6"/>',
  money:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5h4.5a2 2 0 0 1 0 4H9.5M12 7v2"/>',
  expand:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  repeat:'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  repeatOne:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><circle cx="12" cy="12" r="1.6"/>',
  shuffle:'<path d="M2 18 7 18 14 7 21 7"/><path d="M2 7 7 7 14 18 21 18"/><path d="M18 3l3 3-3 3"/><path d="M18 21l3-3-3-3"/>',
  arrowRight:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
  /* 横向三点「更多」：用实心圆而非描边，小尺寸下才不糊 */
  ellipsis:'<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  disk:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3h8v6H8zM8 14h8v7H8z"/>'
};
function icon(name,size){size=size||20;const p=ICON_PATHS[name]||ICON_PATHS.sparkle;return '<svg class="svg-ic" viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';}
/* 空态线条插画：key -> 线条 SVG（随主题色 currentColor） */
/* 空状态治愈文案：在空状态区补一句手写体短句，弱化「空」的提醒感，强化「等你来」的陪伴感（五感·空状态情感化） */
const EMPTY_POEMS=[
  "Every moment is a fresh beginning.",
  "The best time to start is now.",
  "Small steps lead to big changes.",
  "Your story is still being written.",
  "Plant today, harvest tomorrow.",
  "Leave a little space for something good."
];
function decorateEmptyStates(root){
  try{
    const r=(root||document);
    r.querySelectorAll('.empty-state:not([data-poem])').forEach(function(el){
      el.setAttribute('data-poem','1');
      if(el.querySelector('.es-poem'))return;
      const p=document.createElement('div');
      p.className='es-poem';
      p.textContent=EMPTY_POEMS[Math.floor(Math.random()*EMPTY_POEMS.length)];
      el.appendChild(p);
    });
  }catch(e){}
}

/* #16 各模块空状态定制插画
     ① m 中的 key 直接内联渲染专属线稿（笔画 currentColor，配色/底座由 .es-ic 提供）；
     ② m 中没有、但通用图标表 ICON_PATHS 里有的 key（sword/figure/sun/chip/compass/news/fire…）
        回退成 icon(key)——原实现只认 m 的 key，导致 emptyStateHtml 的 keyMap 里
        大半栏目都退化成同一个 star，各模块空状态长得一模一样；
     ③ 两者都没有才退到 star。 */
function emptyIllu(key){
  const m={money:'<circle cx="12" cy="12" r="8.4"/><path d="M12 7.5v9M9.4 9.6h3.4a1.8 1.8 0 0 1 0 3.6H9.4"/>',
    brain:'<path d="M9.5 4A3 3 0 0 0 6.5 7a3 3 0 0 0-1 5 3 3 0 0 0 1.5 5 3 3 0 0 0 5 1V4z"/><path d="M14.5 4A3 3 0 0 1 17.5 7a3 3 0 0 1 1 5 3 3 0 0 1-2.5 5 3 3 0 0 1-5 1"/>',
    book:'<path d="M4 5.2A2 2 0 0 1 6 3.2h6v16H6a2 2 0 0 0-2 2z"/><path d="M20 5.2A2 2 0 0 0 18 3.2h-6v16h6a2 2 0 0 1 2 2z"/>',
    image:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M4 17l4.5-4.5 4 4 3-3 4.5 4.5"/>',
    check:'<circle cx="12" cy="12" r="8.4"/><path d="M8 12.2l2.6 2.6L16 9"/>',
    list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    chart:'<path d="M4 20V10M10 20V4M16 20v-7M20 20v-12"/><path d="M3 20h18"/>',
    clock:'<circle cx="12" cy="12" r="8.4"/><path d="M12 7.5V12l3 2"/>',
    /* 音乐：双音符 */
    music:'<path d="M9.2 17.6V6.4l9-1.9v11.2"/><ellipse cx="6.8" cy="17.9" rx="2.4" ry="2.1"/><ellipse cx="15.8" cy="15.7" rx="2.4" ry="2.1"/>',
    /* 心情：微笑脸 */
    mood:'<circle cx="12" cy="12" r="8.4"/><path d="M8.4 13.8a4.4 4.4 0 0 0 7.2 0"/><path d="M9.3 9.6h.01M14.7 9.6h.01"/>',
    /* 变美：心 + 一点亮闪 */
    heart:'<path d="M12 19.6C9.6 17.9 4.4 14.3 4.4 10.9A3.9 3.9 0 0 1 12 8.6a3.9 3.9 0 0 1 7.6 2.3c0 3.4-5.2 7-7.6 8.7z"/><path d="M18.6 4.2l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z"/>',
    /* 养成日历：月历 + 打卡格 */
    calendar:'<rect x="3.6" y="5.4" width="16.8" height="15" rx="2.4"/><path d="M3.6 10.2h16.8M8.4 3.4v3.8M15.6 3.4v3.8"/><path d="M7.6 13.6h2.2M13.4 13.6h3M7.6 17h2.2"/>',
    /* 通用「空盒子」：等轴测纸箱 */
    box:'<path d="M3.8 8.6 12 4.4l8.2 4.2v6.8L12 19.6 3.8 15.4z"/><path d="M3.8 8.6 12 12.8l8.2-4.2M12 12.8v6.8"/>',
    star:'<path d="M12 4l2.2 4.8 5.2.6-3.9 3.6 1.1 5.1L12 15.8 7.4 18.1l1.1-5.1L4.6 9.4l5.2-.6z"/>',
    /* 以下为常用栏目专属插画：此前这些 key 在 m 里没有，会回退到 ICON_PATHS 的小图标
       再放大到 40px，细节偏单薄、各栏目空状态显得雷同。这里补齐同级别（40px）的画法。 */
    /* 公考：剑 + 盾 */
    sword:'<path d="M14.2 3.4l6.4 6.4-2.6 2.6-6.4-6.4z"/><path d="M3.2 20.8l7.2-7.2"/><path d="M9.4 14.6l2.8 2.8"/><path d="M11.6 7.6l3.4 3.4"/>',
    /* 体态：站姿人形 + 脊柱中线 */
    figure:'<circle cx="12" cy="4.4" r="2.3"/><path d="M12 6.9v7.6"/><path d="M12 14.5 8.4 20.2M12 14.5 15.6 20.2"/><path d="M7.4 9.8h9.2"/><path d="M12 6.9v7.6" stroke-dasharray="1.6 1.6"/>',
    /* 日程：太阳 + 云 */
    sun:'<circle cx="9.6" cy="9.4" r="4"/><path d="M9.6 2.8v1.8M9.6 14.2v1.8M3.4 9.4h1.8M13.9 9.4h1.9M5.2 5l1.3 1.3M12.7 12.5l1.3 1.3"/><path d="M15.6 19.4h3.6a2.6 2.6 0 0 0 .3-5.2 4 4 0 0 0-7.6.8 3.2 3.2 0 0 0 .6 4.4z"/>',
    /* 技能：芯片 */
    chip:'<rect x="6.4" y="6.4" width="11.2" height="11.2" rx="2.2"/><rect x="9.6" y="9.6" width="4.8" height="4.8" rx="1"/><path d="M9.2 6.4V3.8M14.8 6.4V3.8M9.2 20.2v-2.6M14.8 20.2v-2.6M6.4 9.2H3.8M6.4 14.8H3.8M20.2 9.2h-2.6M20.2 14.8h-2.6"/>',
    /* 旅行：指南针 */
    compass:'<circle cx="12" cy="12" r="8.4"/><path d="M15.4 8.6l-2.1 5.5-5.5 2.1 2.1-5.5z"/><circle cx="12" cy="12" r="1"/>',
    /* 热点：报纸 */
    news:'<rect x="3.4" y="4.8" width="17.2" height="14.4" rx="2"/><path d="M7 8.6h6.4M7 12.2h10.6M7 15.8h10.6"/><path d="M17 8.6h.01"/>',
    /* 提醒：火焰 */
    fire:'<path d="M12 3.2c3.1 3.7 5.5 6.4 5.5 9.8A5.5 5.5 0 0 1 12 18.5a5.5 5.5 0 0 1-5.5-5.5c0-1.8 1-3.1 2.2-4.3"/><path d="M12 18.5a2.7 2.7 0 0 1-2.7-2.7c0-1.5 1.3-2.3 2.7-4.1 1.4 1.8 2.7 2.6 2.7 4.1a2.7 2.7 0 0 1-2.7 2.7z"/>',
    /* 视频：胶片盘 */
    film:'<rect x="3.2" y="4.8" width="17.6" height="14.4" rx="2"/><path d="M7.4 4.8v14.4M16.6 4.8v14.4M3.2 8.8h4.2M3.2 15.2h4.2M16.6 8.8h4.2M16.6 15.2h4.2"/>'};
  const raw=m[key];
  if(raw)return '<span class="es-ic"><svg class="svg-ic" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+raw+'</svg></span>';
  const fb=(typeof ICON_PATHS!=="undefined"&&ICON_PATHS[key])?key:'star';
  return '<span class="es-ic">'+icon(fb,40)+'</span>';
}
/* 迷你折线图（SVG）：用于栏目趋势可视化 */
function sparklineSVG(vals,w,h){
  w=w||220;h=h||48;
  if(!vals||vals.length<2)return '';
  const min=Math.min.apply(null,vals),max=Math.max.apply(null,vals);
  const span=(max-min)||1;
  const pad=4;
  const pts=vals.map(function(v,i){
    const x=pad+(w-2*pad)*(i/(vals.length-1));
    const y=h-pad-(h-2*pad)*((v-min)/span);
    return x.toFixed(1)+","+y.toFixed(1);
  });
  const area="M"+pts[0]+" L"+pts.join(" L")+" L"+(w-pad)+","+(h-pad)+" L"+pad+","+(h-pad)+" Z";
  const line="M"+pts.join(" L");
  const last=pts[pts.length-1].split(",");
  return '<svg class="spark" viewBox="0 0 '+w+' '+h+'" width="100%" height="'+h+'" preserveAspectRatio="none">'+
    '<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".25"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>'+
    '<path d="'+area+'" fill="url(#sg)"/>'+
    '<path d="'+line+'" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<circle cx="'+last[0]+'" cy="'+last[1]+'" r="3" fill="var(--primary)"/></svg>';
}

/* ============ 数据看板：跨模块聚合 + 趋势图 ============ */
/* 生成最近 n 天的日期序列（YYYY-MM-DD，含今天，按时间正序） */
function lastNDays(n){
  const out=[];const t=new Date();
  for(let i=n-1;i>=0;i--){const d=new Date(t);d.setDate(t.getDate()-i);out.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"));}
  return out;
}
/* 收集某模块某 checklist 分区每日完成数 / 总数 */
function dailyChecklist(id,key,days){
  const arr=getPanelData(id,key,[]);
  return days.map(function(ds){
    let total=0,done=0;
    arr.forEach(function(it){ if((it.doneDate||"").slice(0,10)===ds){total++;if(it.done)done++;} });
    return {ds:ds,total:total,done:done};
  });
}
/* 聚合看板数据：range='week'(7天) | 'month'(30天) */
function collectDashboard(range){
  const n=range==="month"?30:7;
  const days=lastNDays(n);
  // 学习时长
  const study=days.map(function(ds){ return {ds:ds,v:dayStudyMin(ds)}; });
  // 打卡完成率：遍历所有含 checklist 的栏目
  const checklistIds=["schedule","refinement","posture","cet","gongkao","skills","hot","xiaohongshu","alert"];
  const chk=days.map(function(ds){
    let total=0,done=0;
    checklistIds.forEach(function(id){
      (MODULE_DEFS[id]&&MODULE_DEFS[id].panels||[]).forEach(function(p){
        if(p.type==="checklist"){ const r=dailyChecklist(id,p.key,[ds])[0]; total+=r.total; done+=r.done; }
      });
    });
    return {ds:ds,total:total,done:done,pct: total? Math.round(done/total*100):0};
  });
  // 支出（记账本，排除收入）
  const book=getPanelData("money","book",[]);
  const expense=days.map(function(ds){
    let s=0;book.forEach(function(r){ if(r.date===ds && r.kind!=="income") s+=(numOf(r.amount)||0); });
    return {ds:ds,v:s};
  });
  // 体重（变美日记 body.weight，单位可能为斤/数值，仅取可解析数值）
  const body=(state.modules.refinement&&state.modules.refinement.panels.body)||[];
  const weightSeries=body.filter(function(r){return r&&r.date&&r.weight!=null&&!isNaN(parseFloat(r.weight));})
    .map(function(r){return {ds:r.date,v:parseFloat(r.weight)};}).sort(function(a,b){return a.ds<b.ds?-1:1;});
  // 心情（取每天最后一条，emoji 强度映射 1-5）
  const moodLogs=(state.modules.mood&&state.modules.mood.logs)||[];
  const moodMap={};
  moodLogs.forEach(function(r){ if(r.date){ moodMap[r.date]=r; } });
  const MOOD_SCORE={"😀":5,"🥰":5,"😊":4,"😌":4,"😐":3,"😟":2,"😢":1,"😡":1};
  const mood=days.map(function(ds){ const r=moodMap[ds]; return {ds:ds,v: r? (MOOD_SCORE[r.emoji]|| (r.mood?3:3)) : null}; });
  return {range:range,n:n,days:days,study:study,chk:chk,expense:expense,weight:weightSeries,mood:mood};
}
/* 计算区间汇总：总计 / 均值 / 最大日 / 趋势（与首段比） */
function dashSummary(series,unit){
  const vals=series.filter(function(x){return x.v!=null;}).map(function(x){return x.v;});
  if(!vals.length)return {sum:0,avg:0,max:0,count:0,has:false};
  const sum=vals.reduce(function(a,b){return a+b;},0);
  return {sum:sum,avg:sum/vals.length,max:Math.max.apply(null,vals),count:vals.length,has:true,unit:unit||""};
}
/* 主趋势图：折线 + 渐变面积 + 末点高亮 + 轻量坐标轴（零依赖内联 SVG） */
function trendChartSVG(points,opts){
  opts=opts||{};
  const w=opts.w||320,h=opts.h||120,padL=6,padR=6,padT=10,padB=16;
  if(!points||points.length<2)return '<div class="mini-note">数据不足，先记录几天再来这里看趋势 🌱</div>';
  const vals=points.map(function(p){return p.v;});
  let min=Math.min.apply(null,vals),max=Math.max.apply(null,vals);
  if(min===max){min-=1;max+=1;}
  const span=(max-min)||1;
  const iw=w-padL-padR, ih=h-padT-padB;
  const X=function(i){return padL+iw*(i/(points.length-1));};
  const Y=function(v){return padT+ih-ih*((v-min)/span);};
  const line=points.map(function(p,i){return (i?"L":"M")+X(i).toFixed(1)+","+Y(p.v).toFixed(1);}).join(" ");
  const area="M"+X(0)+","+(padT+ih)+" "+points.map(function(p,i){return "L"+X(i).toFixed(1)+","+Y(p.v).toFixed(1);}).join(" ")+" L"+X(points.length-1)+","+(padT+ih)+" Z";
  const last=points[points.length-1];
  const lx=X(points.length-1),ly=Y(last.v);
  // x 轴标签（首/中/尾日期）
  const lab=function(i){const d=points[i].ds;return d?d.slice(5):"";};
  const labels='<text x="'+padL+'" y="'+(h-3)+'" class="tc-axis">'+lab(0)+'</text>'+
    '<text x="'+X(Math.floor((points.length-1)/2))+'" y="'+(h-3)+'" text-anchor="middle" class="tc-axis">'+lab(Math.floor((points.length-1)/2))+'</text>'+
    '<text x="'+(w-padR)+'" y="'+(h-3)+'" text-anchor="end" class="tc-axis">'+lab(points.length-1)+'</text>';
  return '<svg class="trend-chart" viewBox="0 0 '+w+' '+h+'" width="100%" height="'+h+'" preserveAspectRatio="none">'+
    '<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--primary)" stop-opacity=".28"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>'+
    '<path d="'+area+'" fill="url(#tg)"/>'+
    '<path d="'+line+'" fill="none" stroke="var(--primary)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'+
    (opts.dots?'<circle cx="'+X(0)+'" cy="'+Y(points[0].v)+'" r="2.5" fill="var(--gray)"/>':'')+
    '<circle cx="'+lx.toFixed(1)+'" cy="'+ly.toFixed(1)+'" r="3.5" fill="var(--primary)" stroke="#fff" stroke-width="1.5"/>'+
    labels+'</svg>';
}
/* 连续打卡天数（streak）：从今天往回数连续有完成项的天数 */
function calcStreak(){
  const checklistIds=["schedule","refinement","posture","cet","gongkao","skills","hot","xiaohongshu","alert"];
  const hasDone=function(ds){ let f=false; checklistIds.forEach(function(id){ (MODULE_DEFS[id]&&MODULE_DEFS[id].panels||[]).forEach(function(p){ if(p.type==="checklist"){ const r=dailyChecklist(id,p.key,[ds])[0]; if(r.done>0)f=true; } }); }); return f; };
  let s=0;const t=new Date();
  for(let i=0;i<366;i++){const d=new Date(t);d.setDate(t.getDate()-i);const ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); if(hasDone(ds))s++; else if(i>0)break; else break;}
  return s;
}

/* 考试日期统一配置：集中维护，避免散落硬编码（默认节点，用户可在「重要提醒」里增删）。
   必须声明在 MODULE_DEFS 之前，因为 MODULE_DEFS 的 defaults 会引用它。 */
const EXAM_CONFIG=[
  {name:"距六级",date:"2026-12-12"},
  {name:"距国考",date:"2026-11-28"},
  {name:"距期末",date:"2027-01-15"},
  {name:"四级",date:"2026-12-12"},
  {name:"六级",date:"2026-12-12"},
  {name:"国考",date:"2026-11-28"},
  {name:"期末",date:"2027-01-15"}
];

const MODULE_DEFS={
  schedule:{icon:"sun",title:"今日日程",quote:"好好努力总是没有错的，好好耕耘才会迎来收获的季节。",
    panels:[
      {type:"checklist",key:"segments",title:"任务模板",addLabel:"添加时段任务",
        fields:[{name:"time",label:"时段",type:"text"},{name:"task",label:"任务",type:"text"}],
        defaults:[
          {time:"晨间 7:20-8:10",task:"温水/护肤/防晒/穿搭/早餐/早读"},
          {time:"上午 8:10-12:10",task:"坐前三排/坐姿三要点/标记考点"},
          {time:"课间微调",task:"靠墙站/踮脚尖/转脚踝"},
          {time:"午间 12:10-14:20",task:"午餐公式/贴墙站/午休45分钟"},
          {time:"下午 14:30-18:10",task:"同上午"},
          {time:"傍晚 18:10-21:30",task:"六级急诊/行测断舍离"},
          {time:"晚间 21:30-23:30",task:"专业课/燃脂/护肤/三省/熄灯"}
        ]},
      {type:"countdown",key:"exams",title:"考试倒计时",addLabel:"添加倒计时",nameField:"name",dateField:"date",
        defaults:EXAM_CONFIG.filter(function(e){return e.name==="距六级"||e.name==="距国考"||e.name==="距期末";}).map(function(e){return {name:e.name,date:e.date};})},
      {type:"checklist",key:"daily",title:"每日待办",addLabel:"添加待办",fields:[{name:"time",label:"标签",type:"text"},{name:"task",label:"待办内容",type:"text"}],
        defaults:[]}
    ]},
  refinement:{icon:"sparkle",title:"变美日记",quote:"她的精致不是偶尔惊艳，是日常标配。",
    panels:[
      {type:"checklist",key:"daily",title:"每日打卡",addLabel:"添加打卡项",fields:[{name:"text",label:"内容",type:"text"}],
        defaults:[
          {text:"🧴 防晒涂够量"},{text:"💇 发根吹蓬松"},{text:"👗 纯色+高腰线穿搭"},{text:"🧖 护肤+身体乳"},
          {text:"😊 对镜微笑练习"},{text:"🍬 戒糖（少糖饮/甜品）"},{text:"💋 睡前涂润唇膏"},{text:"🚫 戒奶茶/油炸"}
        ]},
      {type:"checklist",key:"skincare",title:"护肤流程打卡",addLabel:"添加步骤",fields:[{name:"text",label:"步骤",type:"text"}],
        defaults:[
          {text:"🌞 晨间：洁面→爽肤→精华→防晒"},{text:"💧 夜间：卸妆→洁面→水→精华→眼霜→面霜"},
          {text:"🧖 周护理：去角质 / 面膜"},{text:"💋 唇部去角质 + 润唇"},{text:"👐 手部护理 + 护甲"}
        ]},
      {type:"table",key:"makeup",title:"今日妆容 / 穿搭风格",addLabel:"记今天",
        columns:[{name:"date",label:"日期",type:"date"},{name:"style",label:"妆容/穿搭风格",type:"text"},{name:"mood",label:"心情契合度",type:"select",options:["😍 绝配","🙂 还行","😐 一般","😕 翻车"]},{name:"note",label:"小心得",type:"text"}],
        defaults:[]},
      {type:"table",key:"selfrate",title:"肤质 / 发质 周自评",addLabel:"添加自评",
        columns:[{name:"week",label:"周次",type:"text"},{name:"skin",label:"肤质(1-5)",type:"select",options:["1","2","3","4","5"]},{name:"hair",label:"发质(1-5)",type:"select",options:["1","2","3","4","5"]},{name:"note",label:"备注",type:"text"}],
        defaults:[]},
      {type:"table",key:"body",title:"体重/腰围/大腿围 月度记录",addLabel:"添加记录",
        columns:[{name:"date",label:"日期",type:"text"},{name:"weight",label:"体重",type:"text"},{name:"waist",label:"腰围",type:"text"},{name:"thigh",label:"大腿围",type:"text"},{name:"score",label:"自评(1-5)",type:"select",options:["1","2","3","4","5"]}],
        defaults:[]},
      {type:"photos",key:"photos",title:"对比照（Before / After）"},
      {type:"table",key:"longterm",title:"长期维护",addLabel:"添加维护项",
        columns:[{name:"item",label:"项目",type:"text"},{name:"freq",label:"频率",type:"text"}],
        defaults:[{item:"发膜",freq:"每周1次"},{item:"修剪发尾",freq:"每月"},{item:"修眉/去黑头",freq:"每2周"},{item:"衣橱换季整理",freq:"每季"}]}
    ]},
  posture:{icon:"figure",title:"体态管理",quote:"站有站相，坐有坐相，骨子里的挺拔。",
    panels:[
      {type:"checklist",key:"daily",title:"每日打卡",addLabel:"添加打卡项",fields:[{name:"text",label:"内容",type:"text"}],
        defaults:[{text:"坐姿“前1/3”累计≥6小时"},{text:"靠墙站累计≥15分钟"},{text:"走路抬头收下巴"},{text:"睡前拉伸5分钟"}]},
      {type:"table",key:"monthly",title:"月度记录",addLabel:"添加周记录",
        columns:[{name:"date",label:"日期",type:"text"},{name:"weight",label:"体重",type:"text"},{name:"waist",label:"腰围",type:"text"},{name:"thigh",label:"大腿围",type:"text"},{name:"score",label:"自评(1-5)",type:"select",options:["1","2","3","4","5"]}],
        defaults:[{date:"第1周"},{date:"第2周"},{date:"第3周"},{date:"第4周"}]}
    ]},
  cet:{icon:"book",title:"英语等级考试 CET",quote:"四级是地基，六级是楼。地基稳了，上面才好盖。",
    panels:[
      {type:"checklist",key:"daily",title:"每日任务",addLabel:"添加任务",fields:[{name:"text",label:"内容",type:"text"}],
        defaults:[
          {text:"📖 精读：仔细阅读 1 篇（标生词 + 长难句）"},
          {text:"✍️ 精翻：长难句 2 句（手写并对照）"},
          {text:"🔤 词汇：录入生词 ≥5 个（四级/六级分别记）"},
          {text:"🔁 复习：昨日生词 + 错词回顾"}
        ]},
      {type:"progress",key:"progress4",title:"四级进度",addLabel:"添加项目",
        columns:[{name:"name",label:"项目",type:"text"},{name:"goal",label:"目标",type:"text"},{name:"cur",label:"当前",type:"text"}],
        defaults:[
          {name:"词汇量",goal:"3000",cur:"0"},
          {name:"真题完成",goal:"15",cur:"0"},
          {name:"模考分数",goal:"425",cur:"0",trend:true}
        ]},
      {type:"progress",key:"progress6",title:"六级进度",addLabel:"添加项目",
        columns:[{name:"name",label:"项目",type:"text"},{name:"goal",label:"目标",type:"text"},{name:"cur",label:"当前",type:"text"}],
        defaults:[
          {name:"词汇量",goal:"4000",cur:"0"},
          {name:"真题完成",goal:"20",cur:"0"},
          {name:"模考分数",goal:"425",cur:"0",trend:true}
        ]},
      {type:"study",key:"study",title:"学习时长"}
    ]},
  gongkao:{icon:"sword",title:"公考备战",quote:"放弃一定失败。忍过别人不能忍的才算本事。",
    panels:[
      {type:"checklist",key:"daily",title:"每日任务",addLabel:"添加任务",fields:[{name:"text",label:"内容",type:"text"}],
        defaults:[
          {text:"📊 行测·资料分析（1组 + 复盘错题）"},
          {text:"🧩 行测·判断推理（1组 + 复盘错题）"},
          {text:"📝 申论素材积累（≥3条，按分类）"},
          {text:"💡 申论金句背诵（≥1句）"}
        ]},
      {type:"progress",key:"progress",title:"各模块正确率",addLabel:"添加模块",
        columns:[{name:"name",label:"模块",type:"text"},{name:"goal",label:"目标正确率",type:"text"},{name:"cur",label:"当前",type:"text"}],
        defaults:[
          {name:"资料分析",goal:"80%",cur:"0%"},
          {name:"判断推理",goal:"80%",cur:"0%"},
          {name:"言语理解",goal:"75%",cur:"0%"}
        ]},
      {type:"table",key:"shenlun",title:"申论素材库（按分类）",addLabel:"添加素材",groupBy:"cat",
        columns:[{name:"cat",label:"分类",type:"select",options:["民生","法治","创新","生态","文化","其他"]},{name:"content",label:"内容",type:"text"}],
        defaults:[]},
      {type:"study",key:"study",title:"学习时长"}
    ]},
  money:{icon:"yen",title:"记账本",quote:"时间会把你想要的东西慢慢都给你。",
    panels:[
      {type:"moneybook",key:"book",title:"记账本",addLabel:"记一笔",defaults:[]},
      {type:"budget",key:"budget",title:"本月预算结余",fields:[{name:"budget",label:"本月预算",type:"number"},{name:"fixed",label:"固定支出",type:"number"}],defaults:{budget:0,fixed:0}},
      {type:"funds",key:"fund",title:"变美基金",
        fields:[{name:"month",label:"本月存入",type:"number"},{name:"total",label:"累计",type:"number"},{name:"goal",label:"下一目标",type:"text"}],
        defaults:{month:0,total:0,goal:""}}
    ]},
  skills:{icon:"chip",title:"技能清单",quote:"技多不压身，未来多一条路。",
    panels:[
      {type:"cards",key:"cards",title:"技能卡片",addLabel:"添加技能",
        columns:[{name:"name",label:"技能",type:"text"},{name:"prog",label:"进度(%)",type:"number"},{name:"goal",label:"本周目标",type:"text"},{name:"status",label:"状态",type:"select",options:["进行中","未开始","已完成"]}],
        defaults:[{name:"PPT制作",prog:0,goal:"",status:"进行中"},{name:"Excel函数",prog:0,goal:"",status:"未开始"},{name:"面试技巧",prog:0,goal:"",status:"未开始"}]}
    ]},
  hot:{icon:"news",title:"热点速览",quote:"减少信息差。",
    panels:[
      {type:"checklist",key:"beauty",title:"鞠式变美干货TOP3",addLabel:"添加一条",fields:[{name:"text",label:"内容",type:"text"}],defaults:[]},
      {type:"checklist",key:"society",title:"社会热点TOP3",addLabel:"添加一条",fields:[{name:"text",label:"内容",type:"text"}],defaults:[]},
      {type:"checklist",key:"policy",title:"考公/六级最新政策",addLabel:"添加一条",fields:[{name:"text",label:"内容",type:"text"}],defaults:[]},
      {type:"checklist",key:"read",title:"每日打卡",addLabel:"添加",fields:[{name:"text",label:"内容",type:"text"}],defaults:[{text:"已浏览10分钟"}]}
    ]},
  books:{icon:"book",title:"读书笔记",quote:"腹有诗书气自华。",
    panels:[
      {type:"table",key:"list",title:"阅读记录",addLabel:"添加书目",
        columns:[{name:"name",label:"书名",type:"text"},{name:"author",label:"作者",type:"text"},{name:"prog",label:"进度(%)",type:"number"},{name:"start",label:"开始日",type:"date"}],
        defaults:[]}
    ]},
  travel:{icon:"compass",title:"生活记录",quote:"面朝阳，心亦朝阳。",
    panels:[
      {type:"table",key:"list",title:"生活记录",addLabel:"添加记录",
        columns:[{name:"date",label:"日期",type:"date"},{name:"event",label:"事件",type:"text"},{name:"mood",label:"心情",type:"text"},{name:"img",label:"图片",type:"image"}],
        defaults:[]}
    ]},
  alert:{icon:"bolt",title:"重要提醒",quote:"提前准备，不打无准备之仗。",
    panels:[
      {type:"table",key:"exams",title:"考试节点",addLabel:"添加节点",
        columns:[{name:"name",label:"考试",type:"text"},{name:"date",label:"日期",type:"date"},{name:"left",label:"倒计时",type:"countdown",dateField:"date"},{name:"status",label:"报名状态",type:"select",options:["未报名","已报名","已缴费"]}],
        defaults:EXAM_CONFIG.filter(function(e){return ["四级","六级","国考","期末"].indexOf(e.name)>=0;}).map(function(e){return {name:e.name,date:e.date,status:"未报名"};})},
      {type:"checklist",key:"special",title:"特殊提醒",addLabel:"添加提醒",fields:[{name:"text",label:"内容",type:"text"}],
        defaults:[{text:"生理期"},{text:"护肤加强"}]}
    ]},
  annual:{icon:"calendar",title:"年度复盘",quote:"不着急证明自己，一步一步走。",
    panels:[
      {type:"table",key:"quarter",title:"季度里程碑",addLabel:"添加阶段",
        columns:[{name:"stage",label:"阶段",type:"text"},{name:"goal",label:"核心目标",type:"text"},{name:"done",label:"完成情况",type:"text"}],
        defaults:[
          {stage:"大三上 9-12月",goal:"六级首战+行测基础+稳住绩点"},
          {stage:"大三下 1-6月",goal:"六级通过+行测强化+申论入门"},
          {stage:"大四上 9-12月",goal:"国考笔试+毕业论文开题"},
          {stage:"大四下 1-6月",goal:"省考+面试+论文答辩"}
        ]},
      {type:"table",key:"compare",title:"年度对比",addLabel:"添加维度",
        columns:[{name:"dim",label:"维度",type:"text"},{name:"start",label:"年初",type:"text"},{name:"end",label:"年末",type:"text"},{name:"change",label:"变化",type:"text"}],
        defaults:[
          {dim:"体重",start:"110斤"},{dim:"腰围"},{dim:"六级分数"},{dim:"行测正确率"},{dim:"精致感自评(1-10)",start:""}
        ]},
      {type:"quote",text:"这一年，我离“成为别人的梦想”近了多少？"}
    ]},
  calendar:{icon:"calendar",title:"养成日历",quote:"把每一天的小努力，连成看得见的星河。",panels:[]},
  xiaohongshu:{icon:"heart",title:"灵感收藏",quote:"收藏是开始，消化才是拥有。",
    panels:[
      {type:"table",key:"posts",title:"收藏帖",addLabel:"添加收藏",
        columns:[{name:"title",label:"标题/主题",type:"text"},{name:"link",label:"链接",type:"text"},{name:"cat",label:"分类",type:"select",options:["变美","穿搭","学习","生活","美食","其他"]},{name:"points",label:"要点/心得",type:"text"}],
        defaults:[]},
      {type:"checklist",key:"todo",title:"待消化清单",addLabel:"添加待整理",fields:[{name:"text",label:"内容",type:"text"}],
        defaults:[]}
    ]},
  studyclub:{icon:"brain",title:"知识研习",quote:"收藏是开始，消化才是拥有。",panels:[]},
  knowledge:{icon:"book2",title:"知识库",quote:"什么都往里扔，提炼出知识点。",panels:[]},
  mood:{icon:"mood",title:"心情日记",quote:"记录每一天的天气，也记录每一天的你。",
    panels:[{type:"note",key:"guide",title:"心情手账",addLabel:"记录今天",fields:[]}]},
  menstrual:{icon:"heart",title:"生理期记录",quote:"好好照顾自己，是每个女孩子的必修课。",
    panels:[
      {type:"table",key:"records",title:"每日记录（经期 / 症状 / 心情 / 备注）",addLabel:"记今天",
        columns:[
          {name:"date",label:"日期",type:"date"},
          {name:"flow",label:"流量",type:"select",options:["—","少量","中等","偏多"]},
          {name:"sym",label:"症状",type:"text",
            chips:["痛经","头痛","腰酸","疲劳","情绪波动","胸胀","失眠","食欲变化","腹胀","长痘"],
            chipsSrc:"meta.menstrualSymTags"},
          {name:"mood",label:"心情",type:"select",options:["😊 平稳","😣 烦躁","😢 低落","😴 疲惫","🤕 头痛","💪 还行"]},
          {name:"note",label:"备注",type:"text"}
        ],
        defaults:[]}
    ]},
  feedbox:{icon:"download",title:"全部投喂",quote:"好东西先收下，再慢慢消化。",panels:[]},
  music:{icon:"music",title:"清音听雨阁",quote:"闲时听雨，忙时听风，把日子过成一首轻音乐。",
    panels:[{type:"audio",key:"tracks",title:"轻音乐 · 白噪音"}]},
  dashboard:{icon:"chart",title:"数据看板",quote:"把每一天的小努力，连成看得见的星河。",
    panels:[]}
};

const NAV_ORDER_DEFAULT=["home","dashboard","schedule","refinement","posture","cet","gongkao","money","skills","hot","books","travel","alert","annual","studyclub","videos","music","xiaohongshu","feedbox","bili","mood","menstrual","decor"];
const MODULE_SKIN={
  schedule:"timeline", refinement:"magazine", posture:"ledger",
  cet:"bento", gongkao:"bento", money:"ledger", skills:"bento",
  hot:"magazine", books:"shelf", travel:"bento", alert:"list",
  annual:"magazine", studyclub:"bento", xiaohongshu:"magazine",
  feedbox:"list", menstrual:"list"
};
const SKIN_OF=function(id){return MODULE_SKIN[id]||"classic";};
/* 支持「复制为 Markdown」的栏目 */
const COPYABLE_MODULES=["schedule","refinement","posture","cet","gongkao","money","skills","hot","books","travel","alert","annual","studyclub","knowledge","feedbox","bili","mood","calendar"];
/* 底部 Tab 与栏目的映射（首页/学习/变美/记录/我的） */
const TAB_GROUPS={
  study:["schedule","cet","gongkao","studyclub","knowledge","books"],
  beauty:["refinement","posture"],
  record:["money","travel","annual","alert","hot","skills","xiaohongshu","feedbox","videos","music","bili","mood"],
  profile:["profile"]
};
/* 特殊栏目：不在 MODULE_DEFS 中，需要独立入口函数 */
const SPECIAL_MODULES={
  knowledge:{title:"知识库",go:"showKnowledge()"},
  videos:{title:"视频汇总",go:"showVideoHub()"},
  music:{title:"清音听雨阁",go:"showMusic()"},
  bili:{title:"B站播放",go:"showBili()"}
};
const BANNER_FILTER={refinement:"saturate(.9) brightness(1.03)",gongkao:"grayscale(.25) contrast(1.1)",annual:"brightness(1.06) saturate(1.05)"};
const FEED_TYPES={link:"链接",image:"图片",file:"文件",text:"文字"};
const COLUMN_TITLES={home:"首页",schedule:"今日日程",refinement:"变美日记",posture:"体态管理",cet:"英语等级考试 CET",gongkao:"公考备战",money:"记账本",skills:"技能清单",hot:"热点速览",books:"读书笔记",travel:"生活记录",alert:"重要提醒",annual:"年度复盘",studyclub:"知识研习",knowledge:"知识库",videos:"视频汇总",music:"清音听雨阁",xiaohongshu:"灵感收藏",feedbox:"全部投喂",decor:"美化设置",calendar:"养成日历",mood:"心情日记",bili:"B站播放",menstrual:"生理期记录"};
