/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 02/18
   文件：js/02-state.js
   来源：原 index.html 第 16308–17300 行
   内容：妆点美意坊默认 CSS / 字体预设 / 全局 state / 备份与重置
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ============ 妆点美意坊：默认初始CSS（黑灰白冷淡风） ============ */
const DEFAULT_CSS=`/* =========================================================
   工作台 · 精致毛玻璃美化（暖灰 · 衬线 · 玻璃拟态）
   兼容原生主题/材质系统：卡片 selectors 加 html[data-theme="minimal"] .app 前缀
   以压过主题引擎硬编码的深色边框；玻璃透明度/模糊由材质引擎内联变量驱动
   ========================================================= */

/* 0. 变量（用户清单，放 :root 以符合规范；
       主题相关项在下方 [data-theme] 块用 !important 覆盖引擎/材质内联值） */
:root{
  --radius:16px;
  --blur:18px;
  --glass-bg:rgba(255,255,255,0.12);          /* 浅色底上半透白玻璃；minimal 下由材质引擎内联 0.35 实际生效 */
  --glass-border:rgba(255,255,255,0.22);
  --shadow-sm:0 2px 8px rgba(0,0,0,0.05);
  --shadow-md:0 4px 18px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5);
  --shadow-lg:0 12px 36px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6);
  --primary:#C9A98C;
  --accent:#E3C4C8;
  --ink:#1a1a1a;
  --text:#4a4a4a;
  --gray:#8a8a8a;
}
/* 主题级覆盖：必须 !important 才能压过主题引擎的 [data-theme] 块 + 材质内联变量 */
html[data-theme="minimal"]{
  --bg:linear-gradient(135deg,#efe9e2 0%,#e8e0d6 50%,#f0e8de 100%) !important;
  --glass-border:rgba(255,255,255,0.30) !important;
  --primary:#C9A98C !important;
  --accent:#E3C4C8 !important;
  --ink:#1a1a1a !important;
  --text:#4a4a4a !important;
  --gray:#8a8a8a !important;
  --shadow-sm:0 2px 8px rgba(0,0,0,0.05) !important;
  --shadow-md:0 4px 18px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5) !important;
  --shadow-lg:0 12px 36px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6) !important;
}
/* 全局暖灰渐变底，给玻璃可折射的暖色底色 */
body{ background:linear-gradient(135deg,#efe9e2 0%,#e8e0d6 50%,#f0e8de 100%) !important; }

/* 1. 标题衬线化 */
.mod-h1, .card h3, .home-h1, .hg-hi{
  font-family:'Playfair Display','Noto Serif SC',serif !important;
  letter-spacing:0.5px !important;
  font-weight:600 !important;
  color:var(--ink) !important;
}
/* 正文舒适行高与字重（系统无衬线正文 + 衬线标题的编辑式对比） */
body, p, li, .mini-note, .sub, .tag, input, button{
  line-height:1.75 !important;
  font-weight:350 !important;
  letter-spacing:0.2px !important;
  color:var(--text) !important;
}

/* 2. 卡片统一毛玻璃（提权覆盖引擎深色边框，改用暖白玻璃边） */
html[data-theme="minimal"] .app .card,
html[data-theme="minimal"] .app .bento-card,
html[data-theme="minimal"] .app .today-ov,
html[data-theme="minimal"] .app .profile-card,
html[data-theme="minimal"] .app .dash-card,
html[data-theme="minimal"] .app .daily-pick,
html[data-theme="minimal"] .app .heart-card,
html[data-theme="minimal"] .app .quote-bar,
html[data-theme="minimal"] .app .stats .st,
html[data-theme="minimal"] .app .skill-card,
html[data-theme="minimal"] .app .feed-card,
html[data-theme="minimal"] .app .qa-item,
html[data-theme="minimal"] .app .mood-card,
html[data-theme="minimal"] .app .focus-card,
html[data-theme="minimal"] .app .streak-hero,
html[data-theme="minimal"] .app .ticket,
html[data-theme="minimal"] .app .action-zone,
html[data-theme="minimal"] .app .home-hero,
html[data-theme="minimal"] .app .banner{
  background:var(--glass-bg) !important;
  backdrop-filter:blur(var(--blur)) saturate(1.1) !important;
  -webkit-backdrop-filter:blur(var(--blur)) saturate(1.1) !important;
  border:0.5px solid var(--glass-border) !important;
  box-shadow:var(--shadow-md) !important;
  border-radius:var(--radius) !important;
  padding:18px 20px !important;
  transition:transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease !important;
}
/* 悬浮提升 */
.card:hover, .bento-card:hover, .today-ov:hover, .profile-card:hover{
  transform:translateY(-3px) scale(1.01) !important;
  box-shadow:var(--shadow-lg) !important;
  border-color:rgba(255,255,255,0.7) !important;
}
.card:active, .bento-card:active{ transform:scale(0.98) !important; }
/* 卡片顶部高光反光条 */
.card::before, .bento-card::before, .today-ov::before, .profile-card::before{
  content:"" !important;
  position:absolute !important;
  top:0 !important; left:12px !important; right:12px !important;
  height:1px !important;
  background:linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent) !important;
  opacity:0.6 !important;
  pointer-events:none !important;
}
/* 主视觉卡片用大阴影 */
html[data-theme="minimal"] .app .home-hero{ box-shadow:var(--shadow-lg) !important; }

/* 3. chip 类组件也走玻璃（不受主题引擎争用，普通选择器即可） */
.pill, .exp-chip, .mat-opt, .more-menu-item, .pin-row{
  background:var(--glass-bg) !important;
  backdrop-filter:blur(var(--blur)) !important;
  -webkit-backdrop-filter:blur(var(--blur)) !important;
  border:0.5px solid var(--glass-border) !important;
  box-shadow:var(--shadow-md) !important;
  border-radius:var(--radius-m) !important;
  padding:8px 14px !important;
}

/* 4. 按钮统一毛玻璃 */
button, .btn, .feed-play, .save, .cancel, .add-btn, .btn-ghost{
  border-radius:var(--radius-m) !important;
  background:rgba(255,255,255,0.15) !important;
  backdrop-filter:blur(4px) !important;
  -webkit-backdrop-filter:blur(4px) !important;
  border:0.5px solid var(--glass-border) !important;
  color:var(--ink) !important;
  box-shadow:0 2px 8px rgba(0,0,0,0.04) !important;
  padding:8px 16px !important;
  transition:all 0.2s ease !important;
}
button:hover, .btn:hover, .feed-play:hover{
  background:rgba(255,255,255,0.25) !important;
  box-shadow:var(--shadow-soft) !important;
}
button:active, .btn:active{ transform:scale(0.96) !important; }
/* 主操作按钮保留暖驼渐变 */
.save, .btn-primary, .feed-play.primary, .feed-play{
  background:linear-gradient(135deg,var(--primary),var(--accent)) !important;
  color:#fff !important;
  border-color:transparent !important;
  box-shadow:0 2px 6px rgba(180,160,140,0.18) !important;
}
.save:hover, .feed-play:hover{ filter:brightness(1.05); }

/* 5. 输入框 */
input, select, textarea{
  border-radius:var(--radius-m) !important;
  border:0.5px solid var(--glass-border) !important;
  background:rgba(255,255,255,0.08) !important;
  padding:10px 14px !important;
  color:var(--ink) !important;
  font-family:inherit !important;
  transition:border-color 0.2s, box-shadow 0.2s !important;
}
input:focus, select:focus, textarea:focus{
  border-color:var(--accent) !important;   /* 规范里的 --accent-ink 为笔误，此处用 --accent */
  box-shadow:0 0 0 3px rgba(0,0,0,0.05) !important;
  outline:none !important;
}

/* 6. 标签/徽章 */
.tag, .pill, .chip{
  border-radius:999px !important;
  background:rgba(0,0,0,0.04) !important;
  border:0.5px solid rgba(0,0,0,0.06) !important;
  padding:4px 12px !important;
  font-size:12px !important;
  color:var(--gray) !important;
}

/* 7. 进度条 */
.prog-bar, .goal-bar, .storage-bar{
  height:6px !important; border-radius:6px !important;
  background:var(--glass-border) !important;
}
.prog-bar i, .goal-bar-fill, .storage-fill{
  background:linear-gradient(90deg,var(--primary),var(--accent)) !important;
  border-radius:6px !important;
}
/* 8. 环形进度发光 */
.ring-circle{ filter:drop-shadow(0 0 4px var(--accent)) !important; }

/* 9. 首页问候语（flex 布局 + 头像圈） */
.home-greet{
  display:flex; align-items:center; gap:14px; margin-bottom:16px;
}
.home-greet .hg-avatar{
  width:48px; height:48px; border-radius:50%;
  background:linear-gradient(135deg,var(--primary),var(--accent));
  display:flex; align-items:center; justify-content:center;
  font-size:20px; color:#fff; flex-shrink:0;
}
.home-greet .hg-tx{ flex:1; }
.home-greet .hg-hi{ font-size:26px !important; font-weight:450 !important; color:var(--ink) !important; }
.home-greet .hg-sub{ display:flex; align-items:center; gap:8px; font-size:14px !important; color:var(--gray) !important; }
.home-greet .hg-clock{ font-family:'JetBrains Mono', monospace !important; font-weight:400 !important; }
.home-greet .hg-ic{ display:none !important; }

/* 10. 背景氛围光晕（暖色径向，覆盖 minimal 主题引擎的 opacity:0） */
html[data-theme="minimal"] body::before{
  content:"" !important;
  position:fixed !important;
  inset:0 !important;
  z-index:-1 !important;
  pointer-events:none !important;
  background:
    radial-gradient(48% 42% at 16% 14%, rgba(201,169,140,0.15), transparent 70%),
    radial-gradient(52% 44% at 86% 16%, rgba(227,196,200,0.12), transparent 70%),
    radial-gradient(56% 46% at 72% 82%, rgba(201,169,140,0.10), transparent 70%) !important;
  opacity:0.5 !important;
  transition:opacity 0.4s !important;
}

/* 11. 响应式适配 */
@media (max-width:980px){
  .card, .bento-card, .today-ov, .profile-card{ padding:14px 16px !important; border-radius:var(--radius) !important; }
  .mod-h1{ font-size:20px !important; }
  .home-greet .hg-hi{ font-size:22px !important; }
  .home-greet .hg-clock{ font-size:16px !important; }
}
`;

/* ============ 字体预设 ============ */
const FONT_ZH={
  "系统默认":"",
  "苹方-细":"PingFang SC Light, PingFang SC, sans-serif",
  "苹方-常规":"PingFang SC, sans-serif",
  "苹方-粗":"PingFang SC Semibold, PingFang SC, sans-serif",
  "思源黑体-Light":"Noto Sans SC Light, Noto Sans SC, sans-serif",
  "思源黑体-Regular":"Noto Sans SC, sans-serif",
  "方正悠黑":"FZYouHei, YouHei, sans-serif",
  "霞鹜文楷":"LXGW WenKai, KaiTi, serif",
  "霞鹜文楷-Light":"LXGW WenKai Light, KaiTi, serif",
  "Noto Serif SC":"Noto Serif SC, serif"
};
const FONT_EN={
  "系统默认":"",
  "Didot":"Didot, Georgia, serif",
  "Mrs Eaves":"MrsEaves, Georgia, serif",
  "Cormorant Garamond":"Cormorant Garamond, Georgia, serif",
  "Georgia":"Georgia, serif",
  "Helvetica Neue":"Helvetica Neue, Arial, sans-serif",
  "Inter":"Inter, Arial, sans-serif",
  "Times New Roman":"Times New Roman, serif"
};

/* ============ 状态 ============ */
const LS_KEY="ju_workbench_v1";
/* 当前数据结构版本号：每次新增迁移后递增；loadState 在声明后才会执行，故放最前避免 TDZ */
const DATA_VERSION=3; // migrateClubToKb/migrateCet 已在前序版本完成，此处固化
let state=loadState();

function loadState(){
  let saved=null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch(e) {
    console.warn('读取存储失败，重置', e);
    localStorage.removeItem(LS_KEY);
  }
  const def=defaultState();
  if(!saved||!saved.modules) return def;
  def.meta=Object.assign({},def.meta,saved.meta||{});
  // 关键修复：旧备份把 feeds 放在 meta 下，新版放在顶层；两处都查，避免数据清空
  if(saved.feeds && Object.keys(saved.feeds).length) def.feeds=saved.feeds;
  else if(saved.meta && saved.meta.feeds && Object.keys(saved.meta.feeds).length) def.feeds=saved.meta.feeds;
  else if(!def.feeds) def.feeds={};
  def.videos=saved.videos||(saved.meta&&saved.meta.videos)||{};
  for(const id in def.modules){
    if(saved.modules[id]&&saved.modules[id].panels){
      const sm=saved.modules[id];
      for(const k in sm){ if(k!=="panels") def.modules[id][k]=sm[k]; }
      for(const k in def.modules[id].panels){
        if(sm.panels[k]!==undefined){
          def.modules[id].panels[k]=sm.panels[k];
        }
      }
    }
  }
  // 版本化迁移：迁移前深拷贝旧数据作为备份保留（不删除旧字段），按 _dataVersion 只跑一次
  try{ runMigrations(def,saved); }catch(e){ console.warn("迁移失败，已保留备份",e); }
  /* 迁移失败自动回滚：这一步发生在启动读盘阶段，用户还没产生任何新改动，
     此时回滚是完全安全的；好过让半迁移的脏数据一路用下去、日后才发现对不上。 */
  try{ autoRollbackOnMigrationFailure(def); }catch(e){ console.warn("迁移回滚检查失败",e); }
  // 兜底：saved.meta 若是字符串/数组等异常值，上面 Object.assign 会静默污染 def.meta
  try{ repairStateShape(); }catch(e){ console.warn("载入后形状修复失败",e); }
  // 鞠式心法：若用户未自定义（旧默认数组无 src 字段），重置为带出处的 JU_MIND
  try{
    if(!saved.meta||!saved.meta.mind||!saved.meta.mind.length){ def.meta.mind=JU_MIND.map(x=>({...x})); }
    else if(saved.meta.mind.every&&saved.meta.mind.every(function(x){return !x.src;})){ def.meta.mind=JU_MIND.map(x=>({...x})); }
  }catch(e){ def.meta.mind=JU_MIND.map(x=>({...x})); }
  // 心情日记：确保 logs 字段存在（旧备份可能没有）
  def.modules.mood=def.modules.mood||{panels:{guide:[]}};
  def.modules.mood.logs=def.modules.mood.logs||[];
  return def;
}
/**
 * 版本化迁移入口：依据 _dataVersion 保证每段迁移只执行一次。
 * 迁移前深拷贝旧数据作为 _migrationBackup 存于 state.meta（不清空旧字段，便于回滚/排查）。
 * @param {Object} def   已合并的默认+存档状态对象（会被原地修改）
 * @param {Object} saved 原始存档（用于读取旧模块结构）
 */
function runMigrations(def,saved){
  const ver=(def.meta&&def.meta._dataVersion)||1;
  if(ver>=DATA_VERSION) return; // 已是最新，跳过
  def.meta=def.meta||{};
  /* 迁移前快照：写到**独立** localStorage key。
     历史做法是把整份 state 深拷贝塞进 state.meta._migrationBackup ——
     相当于让主记录体积直接翻倍，在 localStorage 5MB 上限下极易写爆。
     改为外置存储 + 7 天有效期。 */
  try{
    localStorage.setItem("ju_workbench_premigrate",JSON.stringify({
      at:new Date().toISOString(), from:ver, to:DATA_VERSION, state:saved||{}
    }));
  }catch(e){ console.warn("迁移前快照写入失败（存储可能已满）",e); }
  // 清理历史遗留的内嵌备份（老版本升级上来的数据里可能带着一整份拷贝）
  try{ if(def.meta._migrationBackup) delete def.meta._migrationBackup; }catch(e){}
  // 逐步执行迁移：单步失败只记录，不影响后续步骤与整体可用性
  if(!Array.isArray(def.meta._migrationLog)) def.meta._migrationLog=[];
  const steps=[["研习卡并入知识库",migrateClubToKb],["CET4/6 合并为 CET",migrateCet]];
  steps.forEach(function(sp){
    const name=sp[0], fn=sp[1];
    try{
      fn(def,saved);
      def.meta._migrationLog.push({v:DATA_VERSION,step:name,ok:true,at:new Date().toISOString()});
    }catch(e){
      def.meta._migrationLog.push({v:DATA_VERSION,step:name,ok:false,at:new Date().toISOString(),err:String((e&&e.message)||e)});
      console.warn("迁移步骤失败：",name,e);
    }
  });
  // 日志只保留最近 10 条，避免无限增长占用配额
  if(def.meta._migrationLog.length>10) def.meta._migrationLog=def.meta._migrationLog.slice(-10);
  // 所有迁移完成，写回版本号与标记
  def.meta._dataVersion=DATA_VERSION;
  def.meta._clubMerged=true;
  def.meta._cetMerged=true;
}
/* 回滚到迁移前的状态（快照保留 7 天）*/
/* 迁移失败自动回滚：把 def 的内容整体换回迁移前快照（保持对象引用不变，调用方无感）。
   回滚后把版本号直接写到最新，避免下次启动再次迁移 → 再次失败 → 再次回滚的死循环；
   用户仍可在「迁移历史」里手动点「重试迁移」。 */
function autoRollbackOnMigrationFailure(def){
  try{
    const log=(def.meta&&def.meta._migrationLog)||[];
    const failed=log.filter(function(x){ return x && x.ok===false && x.v===DATA_VERSION; });
    if(!failed.length) return false;
    const raw=localStorage.getItem("ju_workbench_premigrate");
    if(!raw) return false;
    const snap=JSON.parse(raw);
    if(!snap||!snap.state) return false;
    const age=Date.now()-new Date(snap.at||0).getTime();
    if(age>7*24*3600*1000) return false;
    Object.keys(def).forEach(function(k){ delete def[k]; });
    Object.keys(snap.state).forEach(function(k){ def[k]=snap.state[k]; });
    try{ repairStateShape(); }catch(e){}
    def.meta=def.meta||{};
    def.meta._dataVersion=DATA_VERSION;
    def.meta._migrationRolledBack=true;
    def.meta._migrationRolledAt=new Date().toISOString();
    if(!Array.isArray(def.meta._migrationLog)) def.meta._migrationLog=[];
    def.meta._migrationLog.push({v:DATA_VERSION,step:"自动回滚",ok:true,
      at:new Date().toISOString(),note:"失败步骤："+failed.map(function(f){return f.step;}).join("、")});
    window._migrationRolledBack=failed.map(function(f){return f.step;}).join("、");
    return true;
  }catch(e){ return false; }
}
/* 重试迁移：回滚后用户可在迁移历史里手动再试一次 */
function retryMigration(){
  try{
    const raw=localStorage.getItem("ju_workbench_premigrate");
    if(!raw){ toast("⚠️ 没有可用的迁移前快照，无法重试"); return; }
    const snap=JSON.parse(raw);
    const saved=snap.state||{};
    const oldVer=(saved.meta&&saved.meta._dataVersion)||1;
    // 先把版本号退回旧值，runMigrations 才会真正执行
    state.meta=state.meta||{};
    state.meta._dataVersion=oldVer;
    state.meta._migrationLog=[];
    runMigrations(state,saved);
    saveNow();
    const log=state.meta._migrationLog||[];
    const failed=log.filter(function(x){return x&&x.ok===false;});
    if(failed.length){ toastAction("⚠️ 重试后仍有步骤失败："+failed.map(function(f){return f.step;}).join("、"),
      "查看历史", showMigrationHistory, 10000); }
    else { toast("✅ 迁移重试成功"); try{ refreshCurrentView(); }catch(e){} }
  }catch(e){ toast("⚠️ 重试失败："+((e&&e.message)||e)); }
}
/* 迁移历史：显示每次迁移的时间、版本、状态，回滚/重试也从这里进 */
function showMigrationHistory(){
  try{
    const log=(state.meta&&state.meta._migrationLog)||[];
    const rolled=!!(state.meta&&state.meta._migrationRolledBack);
    let rows="";
    if(!log.length){ rows='<div class="mini-note">暂无迁移记录。当前数据版本 v'+DATA_VERSION+'。</div>'; }
    else{
      rows=log.slice().reverse().map(function(x){
        const ok=x.ok!==false;
        return '<div class="mig-row"><span class="mig-dot '+(ok?"ok":"bad")+'"></span>'+
               '<div class="mig-tx"><div class="mig-step">'+esc(x.step||"")+' · v'+esc(String(x.v||""))+'</div>'+
               '<div class="mig-meta">'+esc(String(x.at||"").replace("T"," ").slice(0,19))+
               (x.note?(' · '+esc(x.note)):"")+(x.err?(' · '+esc(String(x.err).slice(0,80))):"")+'</div></div>'+
               '<span class="mig-tag '+(ok?"ok":"bad")+'">'+(ok?"成功":"失败")+'</span></div>';
      }).join("");
    }
    const html='<h3>'+icon('refresh',16)+' 数据迁移历史</h3>'+
      '<div class="mini-note">当前数据版本 <b>v'+DATA_VERSION+'</b>'+(rolled?' · <span style="color:#c66">上次迁移失败已自动回滚</span>':'')+'</div>'+
      '<div class="mig-list">'+rows+'</div>'+
      '<div class="modal-ops">'+
        (rolled?'<button class="cancel" onclick="retryMigration()">重试迁移</button>':'')+
        '<button class="cancel" onclick="restorePreMigration()">回滚到迁移前</button>'+
        '<button class="save" onclick="closeModal()">知道了</button>'+
      '</div>';
    openModalBox(html);
  }catch(e){ toast("⚠️ 无法读取迁移历史："+((e&&e.message)||e)); }
}
function restorePreMigration(){
  try{
    const raw=localStorage.getItem("ju_workbench_premigrate");
    if(!raw){ toast("⚠️ 没有可用的迁移前快照（快照保留 7 天）"); return; }
    const snap=JSON.parse(raw);
    const age=Date.now()-new Date(snap.at||0).getTime();
    if(age>7*24*3600*1000){ toast("⚠️ 迁移前快照已超过 7 天，无法回滚"); return; }
    if(!confirm("回滚到数据升级前的状态（v"+snap.from+" → v"+snap.to+"）？升级后的改动会丢失。"))return;
    state=snap.state||state; saveNow();
    try{applyUserStyle();}catch(e){} try{applyTheme();}catch(e){}
    try{hydrateImages();}catch(e){}
    try{refreshCurrentView();}catch(e){} try{renderBotTab();}catch(e){}
    toast("✅ 已回滚到迁移前状态");
  }catch(e){ toast("⚠️ 回滚失败："+((e&&e.message)||e)); }
}
/* 撤销上一次导入（导入前会自动留快照，见 importFullBackup）*/
function undoLastImport(){
  try{
    const raw=localStorage.getItem("ju_workbench_preimport");
    if(!raw){ toast("⚠️ 没有可撤销的导入记录"); return; }
    const snap=JSON.parse(raw);
    if(!confirm("撤销上一次导入，恢复到导入前的状态？导入后的改动会丢失。"))return;
    state=snap.state||state; saveNow();
    try{applyUserStyle();}catch(e){} try{applyTheme();}catch(e){}
    try{hydrateImages();}catch(e){}
    try{refreshCurrentView();}catch(e){} try{renderBotTab();}catch(e){}
    toast("✅ 已撤销上次导入");
  }catch(e){ toast("⚠️ 撤销失败："+((e&&e.message)||e)); }
}
/* 一次性清理：老版本可能把整份 state 深拷贝塞在 meta._migrationBackup 里（体积翻倍）。
   仅在本会话内保留引用以便排查，不再写回 localStorage。 */
function purgeLegacyMigrationBackup(){
  try{
    if(state&&state.meta&&state.meta._migrationBackup){
      window._legacyMigrationBackup=state.meta._migrationBackup;
      delete state.meta._migrationBackup;
      try{ saveNow(true); }catch(e){}
    }
  }catch(e){}
}
function migrateClubToKb(s){
  try{
    s.meta=s.meta||{};
    s.meta.knowledge=s.meta.knowledge||{cards:[]};
    s.meta.knowledge.cards=s.meta.knowledge.cards||[];
    const old=s.meta.studyclub&&s.meta.studyclub.cards;
    if(!old||!old.length){s.meta._clubMerged=true;return;}
    if(s.meta._clubMerged)return; // 已迁移，跳过
    const exist=new Set(s.meta.knowledge.cards.map(c=>c.id));
    old.forEach(c=>{
      if(exist.has(c.id))return; // 去重，绝不覆盖
      c.from=c.from||"studyclub"; // 保留来源徽标
      s.meta.knowledge.cards.unshift(c);
    });
    // 注意：不清空旧库（s.meta.studyclub.cards 保留为备份，仅标记已合并）
    s.meta._clubMerged=true;
  }catch(e){console.warn("研习卡迁移失败",e);}
}
function migrateCet(s,saved){
  // 旧版 cet6/cet4 两个独立模块 → 合并为单一 cet 模块（四级进度 progress4 / 六级进度 progress6）
  try{
    if(!saved||!saved.modules) return;
    if(s.meta._cetMerged) return; // 已迁移，跳过
    const old6=saved.modules.cet6, old4=saved.modules.cet4;
    if(!old6 && !old4) return; // 无旧数据，跳过
    const cet=s.modules.cet; if(!cet) return;
    // 合并每日任务（去重，保留旧数据）
    const daily=cet.panels.daily||[];
    const seen=new Set(daily.map(it=>it.text));
    [old4,old6].forEach(function(old){ if(!old||!old.panels)return; (old.panels.daily||[]).forEach(function(it){ if(!seen.has(it.text)){seen.add(it.text); daily.push(it);} }); });
    cet.panels.daily=daily;
    // 旧 cet6.progress → progress6，旧 cet4.progress → progress4
    if(old6 && old6.panels && old6.panels.progress) cet.panels.progress6=old6.panels.progress;
    if(old4 && old4.panels && old4.panels.progress) cet.panels.progress4=old4.panels.progress;
    // 学习时长合并（取两者之和，按日期加总）—— study 数据在模块顶层 state.modules[id].study
    const study={};
    [old6,old4].forEach(function(old){ if(!old)return; const os=(old.study)||{}; for(const k in os){ study[k]=(numOf(study[k])||0)+(numOf(os[k])||0); } });
    cet.study=Object.assign({},cet.study||{},study);
    s.meta._cetMerged=true;
  }catch(e){console.warn("CET 合并迁移失败",e);}
}
/* 按 MODULE_DEFS 造一个栏目的默认结构。
   原来只在 defaultState() 里内联写过一遍，repairStateShape 也需要，故抽出来共用。 */
function defaultModule(id){
  const m={panels:{}};
  const def=MODULE_DEFS&&MODULE_DEFS[id];
  if(!def)return m;
  try{
    (def.panels||[]).forEach(function(p){
      if(!p||!p.key)return;
      if(p.type==="funds"||p.type==="budget") m.panels[p.key]=JSON.parse(JSON.stringify(p.defaults||{}));
      else m.panels[p.key]=(p.defaults||[]).map(d=>({id:uid(),...JSON.parse(JSON.stringify(d))}));
    });
  }catch(e){ console.warn("栏目默认结构生成失败："+id,e); }
  return m;
}
function defaultState(){
  const modules={};
  for(const id in MODULE_DEFS){ modules[id]=defaultModule(id); }
  return {
    meta:{usageDays:[],checkinDays:[],bgImage:null,heroImage:null,images:{},
      navOrder:NAV_ORDER_DEFAULT.slice(),navHidden:{},mind:MIND_DEFAULT.map(x=>({...x})),
      theme:{mode:"minimal",blur:18,glass:0.38,radius:16},videoOn:{},
      font:{zh:"system",en:"system",fs:16,titleScale:1.2,bodyWeight:400,titleWeight:700,lineHeight:1.6},
      userCss:null,decorBg:null,decorBgMode:"cover",decorBgOp:100,decorBgBlur:0,decorHistory:[],remoteCssUrl:null,autoRemoteCss:false,blur:18,radius:16,heroCovers:[],coverRandom:false,
      material:"glass",matParams:{glassBlur:18,clearBorder:18,cardOpacity:55},
      glassAll:true, texMaster:true,
      paper:{preset:"pure",opacity:92,halo:"on"},
      card:{pad:14,borderOp:0.16,shadow:0.08},
      textColors:{},themeColor:null,
      glassParts:{nav:true,card:true,tab:true,modal:true,grid:true},
      nickname:null,
      apiCfg:{provider:"kimi",key:"",model:"",base:"",autoDaily:true,keys:{},params:{temperature:0.3,maxTokens:800,topP:1,timeout:15},fallback:true,log:[]},
      apiStats:{month:"",calls:0,success:0,fail:0,lastMs:0},
      studyclub:{cards:[],tags:[]},
      money:{cats:["餐饮","穿搭","护肤美妆","学习","社交","零食饮品","交通","购物","娱乐","医疗健康","其他"],budgets:{},catHidden:[],incomeCats:["工资","奖学金","兼职","红包","理财","其他"]},
      streakCelebrated:{},
      lastView:null,
      reviewReminder:true,lastReviewSunday:"",
      dailyReplay:{},morningShown:{},
      aiSummary:{},knowledge:{cards:[]},themePreset:null,tourDone:false,pinned:[],themeSchemes:[],quickNotes:[],focusLog:{},whispers:[],
      achievementDates:{},
      _dataVersion:DATA_VERSION,_clubMerged:false,_cetMerged:false,_migrationLog:[]},
    feeds:{},
    videos:{},
    modules
  };
}
function save(quiet){
  // 高频调用（滑块 oninput / 开关）时，把昂贵的 JSON.stringify + setItem 合并节流，
  // 避免每次像素拖动都整树序列化；内存 state 始终即时更新，切后台/关页时强制落盘
  if(window._saveTimer)return;
  window._saveTimer=setTimeout(function(){
    window._saveTimer=0;
    try{ _writeState(quiet); }catch(e){ console.warn("save flush failed",e); }
  },300);
  // 关键路径（导入/恢复/初始化）需要立即落盘，调用方用 saveNow()
}
function saveNow(quiet){
  if(window._saveTimer){ clearTimeout(window._saveTimer); window._saveTimer=0; }
  try{ _writeState(quiet); }catch(e){ console.warn("saveNow failed",e); }
}
// #1 关页/切后台时强制同步落盘，避免 300ms 节流的延迟写入丢失最后几次更改
function flushSave(){
  if(window._saveTimer){ clearTimeout(window._saveTimer); window._saveTimer=0; }
  try{ _writeState(true); }catch(e){}
}
(function bindFlush(){
  try{
    if(window.addEventListener){
      window.addEventListener("pagehide", flushSave, false);
      window.addEventListener("beforeunload", flushSave, false);
      document.addEventListener("visibilitychange", function(){
        if(document.visibilityState==="hidden") flushSave();
      }, false);
    }
  }catch(e){}
})();
/* 配额哨兵：localStorage 通常只有 5MB 左右，等写爆了才提示就晚了。
   每 20 次落盘抽查一次，文本占用 ≥80% 时提前提醒（同一提示 5 分钟内只出现一次）。 */
let _saveCount=0;
function quotaWatchdog(){
  try{
    if(++_saveCount<20) return;
    _saveCount=0;
    if(Date.now()-((window._lastQuotaWarn)||0)<300000) return;
    estimateStorage().then(function(est){
      const LS_SOFT=5*1024*1024;                     // 主流浏览器 localStorage 软上限
      const ls=(est&&est.ls)||0;
      const pct=Math.round(ls/LS_SOFT*100);
      if(pct>=80){
        window._lastQuotaWarn=Date.now();
        failToast("quotaHigh","⚠️ 本机文本存储已用约 "+pct+"%，建议去「我的 → 数据管理」导出备份后清理旧内容",300000);
      }
    }).catch(function(){});
  }catch(e){}
}
function _writeState(quiet){
  var payload=null;
  try{ payload=JSON.stringify(state); }
  catch(e){ console.warn("状态序列化失败，本次未落盘",e); return false; }
  /* 主存储：localStorage。写入成功后若此前处于「内存暂存」状态，显式告知已恢复。 */
  try{
    localStorage.setItem(LS_KEY,payload);
    if(window._memOnly){
      window._memOnly=false;
      try{ toast("\u2705 \u672c\u673a\u5b58\u50a8\u5df2\u6062\u590d\u53ef\u7528\uff0c\u6570\u636e\u5df2\u91cd\u65b0\u843d\u76d8"); }catch(e){}
    }
    window._lastSaveFail=0;
    try{ quotaWatchdog(); }catch(e){}
    return true;
  }catch(e){
    /* 落盘失败（配额满 / 隐私模式 / 被系统清理）：
       先暂存到 sessionStorage，保证本次会话内继续用不丢数据，
       同时立刻推一条带「立即导出备份」的提示——内存里的数据关掉 App 就没了。 */
    var memOK=false;
    try{ sessionStorage.setItem(LS_KEY+"__mem",payload); memOK=true; }catch(e2){}
    window._memOnly=true;
    const now=Date.now();
    const isQuota = e && (e.name==="QuotaExceededError"||e.code===22||e.code===1014||/quota/i.test(e.name||""));
    if(!quiet && (!window._lastSaveFail || now-window._lastSaveFail>300000)){
      window._lastSaveFail=now;
      var msg = isQuota
        ? "\u26a0\ufe0f \u672c\u673a\u5b58\u50a8\u7a7a\u95f4\u5df2\u6ee1\uff0c\u65b0\u6539\u52a8\u6682\u5b58\u5728\u5185\u5b58\u4e2d\uff08\u5173\u6389\u4f1a\u4e22\uff09"
        : "\u26a0\ufe0f \u672c\u673a\u5b58\u50a8\u5199\u5165\u5931\u8d25\uff0c\u65b0\u6539\u52a8\u6682\u5b58\u5728\u5185\u5b58\u4e2d\uff08\u5173\u6389\u4f1a\u4e22\uff09";
      try{
        toastAction(msg+"\uff0c\u8bf7\u5c3d\u5feb\u5bfc\u51fa\u5907\u4efd", "\u7acb\u5373\u5907\u4efd",
          function(){ try{ exportFullBackup(); }catch(e){} }, 15000);
      }catch(e2){
        try{ toast(msg); }catch(e3){}
      }
    }
    console.warn("save failed, 已降级为内存暂存",e);
    return memOK;
  }
}
/* 启动后体检一次：若主存储不可用但存在内存暂存数据，立刻提醒用户导出 */
function checkStorageHealth(){
  try{
    var probe="__probe__"+Date.now();
    localStorage.setItem(probe,"1"); localStorage.removeItem(probe);
    if(window._memOnly){ window._memOnly=false; }
    return true;
  }catch(e){
    var mem=null;
    try{ mem=sessionStorage.getItem(LS_KEY+"__mem"); }catch(e2){}
    if(mem){
      window._memOnly=true;
      try{
        toastAction("\u26a0\ufe0f \u68c0\u6d4b\u5230\u4e0a\u6b21\u6709\u6570\u636e\u6ca1\u80fd\u5199\u5165\u672c\u673a\uff0c\u76ee\u524d\u5728\u5185\u5b58\u4e2d\uff0c\u5173\u6389\u4f1a\u4e22\u5931",
          "\u7acb\u5373\u5bfc\u51fa", function(){ try{ exportFullBackup(); }catch(e3){} }, 20000);
      }catch(e4){}
    }
    return false;
  }
}
function storageUsedMB(){
  try{
    let total=0;
    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k) total+=((localStorage.getItem(k)||"").length+k.length)*2; }
    return (total/1024/1024).toFixed(2);
  }catch(e){return "?";}
}
/* 估算本地存储占用：localStorage 文本 + IndexedDB（图片/音乐 blob） */
function estimateStorage(){
  return new Promise(function(resolve){
    let lsBytes=0;
    try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k) lsBytes+=((localStorage.getItem(k)||"").length+k.length)*2; } }catch(e){}
    // IndexedDB blob 占用
    let idbBytes=0;
    const finish=function(){ resolve({ls:lsBytes, idb:idbBytes, total:lsBytes+idbBytes}); };
    try{
      if(!window.indexedDB){ finish(); return; }
      const req=indexedDB.open(IMG_DB,1);
      req.onupgradeneeded=function(){/* noop */};
      req.onsuccess=function(){
        const db=req.result; const stores=Array.from(db.objectStoreNames);
        if(!stores.length){ db.close(); finish(); return; }
        let pending=stores.length;
        stores.forEach(function(sn){
          try{
            const tx=db.transaction(sn,"readonly"); const os=tx.objectStore(sn);
            const cur=os.openCursor();
            cur.onsuccess=function(e){
              const c=e.target.result;
              if(c){
                const v=c.value;
                // 图片存为 dataURL 字符串，音乐可能存 Blob
                if(typeof v==="string") idbBytes+=v.length*2;
                else if(v&&v.data){ if(typeof v.data==="string") idbBytes+=v.data.length*2; else if(v.data.size) idbBytes+=v.data.size; }
                else if(v&&v.size) idbBytes+=v.size;
                c.continue();
              } else { pending--; if(pending<=0){ db.close(); finish(); } }
            };
            cur.onerror=function(){ pending--; if(pending<=0){ db.close(); finish(); } };
          }catch(e2){ pending--; if(pending<=0){ db.close(); finish(); } }
        });
      };
      req.onerror=function(){ finish(); };
    }catch(e){ finish(); }
  });
}
/* 人类可读容量，并给出配额（移动端 localStorage 约 5–10MB，总数按 50MB 估算展示趋势） */
function storageHuman(bytes){
  if(bytes>=1024*1024*1024) return (bytes/1024/1024/1024).toFixed(2)+" GB";
  if(bytes>=1024*1024) return (bytes/1024/1024).toFixed(2)+" MB";
  if(bytes>=1024) return (bytes/1024).toFixed(1)+" KB";
  return bytes+" B";
}
function renderStorageCard(){
  const box=document.getElementById("storageCard");
  if(!box)return;
  box.innerHTML='<div class="mini-note" style="padding:6px">📦 正在统计本地存储…</div>';
  const MB=1024*1024;
  // 优先用浏览器原生配额估算：可拿到「总容量 / 已用」，从而算出真正剩余
  const nativeEstimate=new Promise(function(res){
    try{
      if(navigator.storage&&navigator.storage.estimate){
        navigator.storage.estimate().then(function(e){ res({quota:e.quota||0,usage:e.usage||0,supported:!!e.quota}); }).catch(function(){ res({quota:0,usage:0,supported:false}); });
      } else { res({quota:0,usage:0,supported:false}); }
    }catch(e){ res({quota:0,usage:0,supported:false}); }
  });
  Promise.all([estimateStorage(),nativeEstimate]).then(function(arr){
    const info=arr[0], nat=arr[1];
    // 文本占用占总文本配额（移动端约 5MB）的比例
    const lsPct=Math.min(100,Math.round(info.ls/(5*MB)*100));
    // 总使用进度：优先用原生 quota，否则按 50MB 软上限展示趋势
    let usedPct, remainTxt, usedTxt;
    if(nat.supported && nat.quota>0){
      usedPct=Math.min(100,Math.round(nat.usage/nat.quota*100));
      const remain=Math.max(0,nat.quota-nat.usage);
      remainTxt='剩余 '+storageHuman(remain)+'（总容量 '+storageHuman(nat.quota)+'）';
      usedTxt=storageHuman(nat.usage);
    } else {
      usedPct=info.total>0?Math.min(100,Math.round(info.total/(50*MB)*100)):0;
      const remain=Math.max(0,50*MB-info.total);
      remainTxt='剩余约 '+storageHuman(remain);
      usedTxt=storageHuman(info.total);
    }
    box.innerHTML=
      '<div class="card storage-card"><div class="aw-head"><span>🗄 本地存储空间</span><span class="aw-sub">'+(state.meta.nickname||"笑笑")+' 的私有数据</span></div>'+
      '<div class="storage-line"><div class="storage-bar"><div class="storage-fill" style="width:'+usedPct+'%"></div></div>'+
      '<div class="storage-num">已用 <b>'+usedTxt+'</b> · '+remainTxt+'</div></div>'+
      '<div class="mini-note">分类占用：文本/记录 '+storageHuman(info.ls)+' · 图片/音乐 '+storageHuman(info.idb)+'。数据仅存本机，卸载 App 会清空；大图/音乐已自动存到独立数据库。</div>'+
      '</div>';
  }).catch(function(){ box.innerHTML='<div class="mini-note" style="padding:6px">⚠️ 无法读取存储信息</div>'; });
}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
/* ============ 数据备份 / 重置 / 自动备份（新增实用功能） ============ */
/* 备份数据摘要：让每个备份文件自带「里面装了什么」的说明书，
   日后在文件管理器里翻旧备份时不用导入就能认出来。 */
function backupSummary(){
  try{
    const g=function(o,k){ return (o&&o[k])||[]; };
    const kb=(function(){ try{ return (typeof allCards==="function")?allCards().length:(g(state.meta.knowledge,"cards").length); }catch(e){ return 0; } })();
    return {
      cards: kb,
      feeds: g(state.modules.feedbox,"feeds").length,
      moods: g(state.modules.mood,"logs").length,
      money: g(g(state.modules.money,"panels"),"book").length,
      checkinDays: g(state.meta,"checkinDays").length,
      usageDays: g(state.meta,"usageDays").length,
      sizeMB: (function(){ try{ return (JSON.stringify(state).length/1048576).toFixed(2); }catch(e){ return "?"; } })()
    };
  }catch(e){ return {}; }
}
function exportFullBackup(){
  try{
    const sum=backupSummary();
    const data={__app:"ju_workbench",__ver:DATA_VERSION,__schema:DATA_VERSION,__exportedAt:new Date().toISOString(),
                __summary:sum,__text:"知识卡 "+sum.cards+" · 投喂 "+sum.feeds+" · 心情 "+sum.moods+" · 记账 "+sum.money+" · 打卡 "+sum.checkinDays+" 天",
                state:state};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download="笑笑工作台备份_"+todayStr()+".json";document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){try{URL.revokeObjectURL(a.href);}catch(e){}},2000);
    // 记录「用户主动导出的日期」，与 autoBackup 的自动快照区分开
    try{ localStorage.setItem("ju_workbench_export_date",todayStr()); }catch(e){}
    toast("📤 已导出备份 · "+data.__text);
  }catch(e){ toast("⚠️ 导出失败："+(e&&e.message||e)); }
}
// 将当前栏目内容复制为 Markdown（零依赖），便于粘贴到笔记/备忘录/文档
function copyModuleAsMD(id){
  try{
    const def=MODULE_DEFS[id]; if(!def)return;
    const m=state.modules[id]||{panels:{}};
    let md="## "+def.title+"\n\n";
    (def.panels||[]).forEach(function(p){
      const arr=(m.panels||{})[p.key]||[];
      if(!arr.length && p.type!=="moneybook") return;
      md+="### "+p.title+"\n\n";
      if(p.type==="checklist"){
        arr.forEach(function(it){ const t=(p.fields||[]).map(function(f){return it[f.name];}).filter(Boolean).join(" · "); md+=(it.done?"- [x] ":"- [ ] ")+t+"\n"; });
      } else if(p.type==="table"||p.type==="cards"){
        if(p.columns&&p.columns.length){ md+="| "+p.columns.map(function(c){return c.label;}).join(" | ")+" |\n| "+p.columns.map(function(){return "---";}).join(" | ")+" |\n";
          arr.forEach(function(it){ md+="| "+p.columns.map(function(c){return it[c.name]||"";}).join(" | ")+" |\n"; });
        } else { arr.forEach(function(it){ md+="- "+JSON.stringify(it)+"\n"; }); }
      } else if(p.type==="progress"){
        arr.forEach(function(it){ md+="- "+esc(it.name||"")+"："+(it.cur||0)+" / "+(it.goal||"")+"\n"; });
      } else if(p.type==="moneybook"){
        const recs=(state.modules.money&&state.modules.money.panels.book)||[];
        recs.forEach(function(r){ md+="- "+(r.kind==="income"?"[收入] ":"[支出] ")+r.date+" "+(r.item||"")+"："+r.amount+"元 / "+r.cat+"\n"; });
      } else if(p.type==="countdown"){
        arr.forEach(function(it){ md+="- "+esc(it.name||"")+"："+esc(it.date||"")+"\n"; });
      } else if(p.type==="study"){
        const st=m.study||{}; const keys=Object.keys(st); if(keys.length){ md+="- 学习时长："+keys.map(function(k){return k+" "+Math.round(numOf(st[k])||0)+"分";}).join("，")+"\n"; }
      } else {
        arr.forEach(function(it){ md+="- "+JSON.stringify(it)+"\n"; });
      }
      md+="\n";
    });
    if(id==="knowledge"||id==="studyclub"){ const cs=allCards(); md+="### 知识卡片（"+cs.length+"）\n\n"; cs.forEach(function(c){ md+="- "+esc(c.title||"")+(c.core?("："+esc(c.core.slice(0,40))):"")+"\n"; }); md+="\n"; }
    if(id==="feedbox"){ const fs=(state.modules.feedbox&&state.modules.feedbox.feeds)||[]; md+="### 全部投喂（"+fs.length+"）\n\n"; fs.forEach(function(f){ md+="- ["+esc((f.title||f.url||"").slice(0,40))+"]("+(f.url||"")+")"+(f.tag?(" #"+f.tag):"")+"\n"; }); md+="\n"; }
    if(id==="mood"){ const ls=(state.modules.mood&&state.modules.mood.logs)||[]; md+="### 心情记录（"+ls.length+"）\n\n"; ls.forEach(function(r){ md+="- "+r.date+" "+(r.mood||"")+"："+(r.note||"")+"\n"; }); md+="\n"; }
    if(id==="calendar"){ const map=aggregateCalendar(); const ds=Object.keys(map).sort(); md+="### 养成日历（活跃 "+ds.length+" 天）\n\n"; ds.slice(-30).forEach(function(d){ md+="- "+d+"："+map[d]+" 项活动\n"; }); md+="\n"; }
    copyText(md, "✅ 已复制「"+def.title+"」为 Markdown，去粘贴到笔记吧");
  }catch(e){ toast("⚠️ 复制失败："+(e&&e.message||e)); }
}
function copyText(text,okMsg){
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(function(){toast(okMsg||"✅ 已复制");},function(){fallbackCopy(text,okMsg);}); }
    else fallbackCopy(text,okMsg);
  }catch(e){ fallbackCopy(text,okMsg); }
}
function fallbackCopy(text,okMsg){
  try{
    const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();
    document.execCommand("copy");ta.remove();toast(okMsg||"✅ 已复制");
  }catch(e){ toast("⚠️ 复制失败，请手动选择"); }
}
function importFullBackup(){
  const inp=document.createElement("input");inp.type="file";inp.accept="application/json,.json";
  inp.onchange=function(){
    const f=inp.files&&inp.files[0];if(!f)return;
    const rd=new FileReader();
    rd.onload=function(){
      try{
        const obj=JSON.parse(rd.result);
        const st=obj&&obj.state?obj.state:obj;
        if(!st||!st.modules){ toast("⚠️ 文件格式不正确"); return; }
        // #3 schema 版本校验：仅接受不高于当前运行版本的导出，防止旧版结构导入后运行时报错
        const fv=(st.meta&&st.meta._dataVersion)||1;
        if(fv>DATA_VERSION){
          toast("⚠️ 该备份由更高版本导出（v"+fv+"），当前应用为 v"+DATA_VERSION+"，可能无法兼容。建议先升级应用。");
          return;
        }
        if(!confirm("导入将覆盖当前全部数据，确定继续？建议先导出当前备份。"))return;
        // 导入前快照：外部文件属于不可信来源，先留一份可回滚点
        try{ localStorage.setItem("ju_workbench_preimport",JSON.stringify({at:new Date().toISOString(),from:(st.meta&&st.meta._dataVersion)||1,state:state})); }catch(e){ console.warn("导入前快照失败（存储可能已满）",e); }
        // 深度消毒：剥离脚本标签 / 事件属性 / 危险协议，再落库
        try{ sanitizeDeep(st); }catch(e){ console.warn("导入数据消毒失败",e); }
        state=st; saveNow();
        // 兼容旧版缺失字段：外部文件形状不可信，统一补齐后再跑迁移
        try{ repairStateShape(); }catch(e){}
        try{ runMigrations(state, st); }catch(e){ console.warn("导入后迁移失败",e); }
        try{ repairStateShape(); }catch(e){}
        try{applyUserStyle();}catch(e){} try{applyTheme();}catch(e){}
        try{hydrateImages();}catch(e){}
        try{refreshCurrentView();}catch(e){} try{renderBotTab();}catch(e){}
        toast("✅ 已导入备份"+(fv<DATA_VERSION?("（已升级到 v"+DATA_VERSION+"）"):""));
      }catch(e){ toast("⚠️ 解析失败："+(e&&e.message||e)); }
    };
    rd.readAsText(f);
  };
  inp.click();
}
function resetData(){
  if(!confirm("将清空全部数据并恢复初始状态，且无法撤销。确定？"))return;
  try{ localStorage.removeItem(LS_KEY); }catch(e){}
  try{ localStorage.removeItem("ju_workbench_backup"); localStorage.removeItem("ju_workbench_backup_date"); }catch(e){}
  try{ if(window.indexedDB)indexedDB.deleteDatabase("ju_workbench_music"); }catch(e){}
  location.reload();
}
/* 备份提醒：自动快照只存在本机（清缓存/卸载就没了），
   所以每 7 天提醒一次「真正导出到文件」，并给一个直达按钮。 */
function daysBetweenStr(a,b){
  try{
    const pa=String(a||"").split("-").map(Number), pb=String(b||"").split("-").map(Number);
    if(pa.length<3||pb.length<3) return 9999;
    const da=Date.UTC(pa[0],pa[1]-1,pa[2]), db=Date.UTC(pb[0],pb[1]-1,pb[2]);
    return Math.round(Math.abs(db-da)/86400000);
  }catch(e){ return 9999; }
}
function checkBackupReminder(){
  try{
    // 数据太少时不打扰：刚装上还没攒内容，没必要催备份
    const sum=backupSummary();
    const total=(sum.cards||0)+(sum.feeds||0)+(sum.moods||0)+(sum.money||0)+(sum.checkinDays||0);
    if(total<5) return;
    const last=localStorage.getItem("ju_workbench_export_date");
    const gap=last?daysBetweenStr(last,todayStr()):9999;
    if(gap<=7) return;
    const t=todayStr();
    if(localStorage.getItem("ju_workbench_backup_nag")===t) return;   // 一天最多一次
    localStorage.setItem("ju_workbench_backup_nag",t);
    setTimeout(function(){
      try{
        /* 文案压短：原句太长会折成两行，深色胶囊能涨到 103px 高，把底部内容糊住一片。
           时长也从 12s 收到 7s，并已带 ✕ 可随时关掉（见 toastAction）。 */
        toastAction(last? ("📦 已 "+gap+" 天没备份了")
                        : ("📦 还没导出过备份"),
          "立即备份", function(){ try{ exportFullBackup(); }catch(e){} }, 7000);
      }catch(e){}
    },3000);
  }catch(e){}
}
function autoBackup(){
  try{
    const key="ju_workbench_backup";const t=todayStr();
    if(localStorage.getItem(key+"_date")!==t){ localStorage.setItem(key,JSON.stringify(state)); localStorage.setItem(key+"_date",t); }
  }catch(e){}
}
/* ===== 状态形状兜底 =====
   导入外部文件 / 从备份恢复 / 手改 localStorage，都可能让关键节点缺失或非对象。
   与其在 680 处读取点各写一遍 ?.，不如在数据入口一次性补齐形状：
   读取点保持一行不变，出错也仍是显式抛错，不会退化成静默失败。 */
function repairStateShape(){
  try{
    // 数组也要挡掉：typeof [] === "object"，放行会一路走到 Object.keys 而什么都不做，
    // 看似修复成功、实则数据全丢，比返回 false 更危险
    if(!state||typeof state!=="object"||Array.isArray(state))return false;
    const isObj=function(v){ return v&&typeof v==="object"&&!Array.isArray(v); };
    // 一级根：缺了直接白屏
    if(!isObj(state.modules))state.modules={};
    if(!isObj(state.feeds))state.feeds={};
    if(!isObj(state.meta))state.meta={};
    if(!isObj(state.videos))state.videos={};
    const m=state.meta;
    // 二级：被当成对象直接取属性的
    ["money","apiCfg","coverStyle","theme","font","toggles","knowledge","card","paper","textColors"]
      .forEach(function(k){ if(!isObj(m[k]))m[k]={}; });
    if(!isObj(m.knowledge.cards))m.knowledge.cards=[];
    // 二级：被当成数组调用 .push/.filter/.includes 的
    ["checkinDays","heroCovers","decorHistory","themeSchemes","focusLog","whispers",
     "pinned","homeBlocks","importedFont"]
      .forEach(function(k){ if(!Array.isArray(m[k]))m[k]=[]; });
    // 这些是「键为动态 id」的映射表，不是数组
    ["videoOn","dailyReplay"].forEach(function(k){ if(!isObj(m[k]))m[k]={}; });
    if(!isObj(m.money.budgets))m.money.budgets={};
    if(!Array.isArray(m.money.cats))m.money.cats=["餐饮","穿搭","护肤美妆","学习","社交","零食饮品","交通","购物","娱乐","医疗健康","其他"];
    if(!Array.isArray(m.money.incomeCats))m.money.incomeCats=["工资","奖学金","兼职","红包","理财","其他"];
    // 栏目：整个缺失的按默认结构重建；panels 里缺的分区键按类型补齐
    if(MODULE_DEFS){
      for(const id in MODULE_DEFS){
        const def=MODULE_DEFS[id]; if(!def)continue;
        if(!isObj(state.modules[id]))state.modules[id]=defaultModule(id);
        else if(!isObj(state.modules[id].panels))state.modules[id].panels={};
        const panels=state.modules[id].panels;
        (def.panels||[]).forEach(function(p){
          if(!p||!p.key)return;
          if(panels[p.key]===undefined||panels[p.key]===null){
            panels[p.key]=(p.type==="funds"||p.type==="budget")
              ? JSON.parse(JSON.stringify(p.defaults||{}))
              : (p.defaults||[]).map(d=>({id:uid(),...JSON.parse(JSON.stringify(d))}));
          }
        });
      }
    }
    // 结构损坏（非对象）的栏目条目直接丢弃，避免后续读取炸掉
    Object.keys(state.modules).forEach(function(id){
      if(!isObj(state.modules[id])){ delete state.modules[id]; return; }
      if(!isObj(state.modules[id].panels))state.modules[id].panels={};
    });
    return true;
  }catch(e){ console.warn("状态形状修复失败",e); return false; }
}
/* 一键修复（#48）：自动修复状态形状、重建缺失模块、清除无效引用、回刷视图。
   不弹确认——修复是幂等的、只补不删；若真想清空请用「重置」入口。 */
function repairEverything(){
  try{
    const ok=repairStateShape();
    // 清掉指向不存在栏目 / 不存在 id 的悬空引用
    try{
      // 投喂分区若对应栏目已不存在，整块删掉，避免渲染时找不到容器
      Object.keys(state.feeds||{}).forEach(function(colId){
        if(colId!=="feedbox" && !MODULE_DEFS[colId]) delete state.feeds[colId];
      });
    }catch(e){}
    try{ saveNow(); }catch(e){}
    try{ applyUserStyle(); }catch(e){} try{ applyTheme(); }catch(e){}
    try{ hydrateImages(); }catch(e){}
    try{ refreshCurrentView(); }catch(e){}
    try{ renderBotTab(); renderDrawer(); }catch(e){}
    toast(ok?("🔧 已修复并刷新：补全缺失模块、清掉无效引用"):("🔧 已尝试修复（结构正常）"));
  }catch(e){ toast("⚠️ 修复失败："+(e&&e.message||e)); }
}
function restoreBackup(){
  try{
    const raw=localStorage.getItem("ju_workbench_backup");
    if(!raw){ toast("⚠️ 没有可用的自动备份"); return; }
    if(!confirm("从最近一次自动备份恢复？当前未保存的改动会丢失。"))return;
    state=sanitizeDeep(JSON.parse(raw)); saveNow();
    try{ repairStateShape(); }catch(e){ console.warn("恢复后形状修复失败",e); }
    try{applyUserStyle();}catch(e){} try{applyTheme();}catch(e){}
    try{hydrateImages();}catch(e){}
    try{refreshCurrentView();}catch(e){} try{renderBotTab();}catch(e){}
    toast("✅ 已从备份恢复");
  }catch(e){ toast("⚠️ 恢复失败："+(e&&e.message||e)); }
}
function todayStr(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
