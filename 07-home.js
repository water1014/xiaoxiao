/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 07/18
   文件：js/07-home.js
   来源：原 index.html 第 20789–21886 行
   内容：数据看板 + 首页 + 栏目配图 + 通用弹窗 + 番茄钟 + 呼吸放松 + 灵感册
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ============ 数据看板 ============ */
function showDashboard(){
  window._navigating=true;
  try{ closeBoot(); closeModal(); }catch(e){}
  state.meta.tourDone=true;
  currentView="module";lastModuleId="dashboard";
  $("#view-home").classList.remove("active");$("#view-module").classList.add("active");
  const tb=$("#topbar");if(tb)tb.classList.remove("large");
  try{var mv=$("#view-module");if(mv){mv.scrollTop=0;mv.setAttribute("data-module","dashboard");}}catch(e){}
  $("#topTitle").innerHTML=icon("chart")+" 数据看板";
  const v=$("#view-module");
  if(!v||!v.children.length) v.innerHTML=skeletonHtml(3);
  setTimeout(function(){
    try{ renderDashboard();renderBotTab();playViewIn(v,"in"); }
    catch(e){ v.innerHTML='<div class="card" style="margin-top:20px"><h3>⚠️ 看板渲染出错</h3><div class="mini-note">'+esc(e.message)+'</div></div>'; }
    setTimeout(function(){window._navigating=false;},100);
  },160);
}
function renderDashboard(){
  const v=$("#view-module");
  const range=(state.meta.dashRange==="month")?"month":"week";
  const d=collectDashboard(range);
  const studySum=dashSummary(d.study,"min");
  const expSum=dashSummary(d.expense,"元");
  const chkDays=d.chk.filter(function(x){return x.total>0;}).length;
  const chkPct=Math.round(d.chk.reduce(function(a,b){return a+b.pct;},0)/Math.max(1,d.chk.length));
  const streak=calcStreak();
  // 体重最新/首条
  const ws=d.weight;
  const wLatest=ws.length?ws[ws.length-1].v:null;
  const wDelta=(ws.length>=2)?(ws[ws.length-1].v-ws[0].v):null;
  const fmt=function(n,u){ if(n==null)return "—"; return (Math.round(n*10)/10)+(u||""); };
  let h='<div class="back-row"><button onclick="showHome()" aria-label="返回"><svg class="svg-ic" viewBox="0 0 24 24" width="20" height="20"><path d="M15 5l-7 7 7 7"/></svg></button><div style="font-weight:600">📊 数据看板</div></div>';
  h+='<div class="mod-head"><div class="mod-h1">📊 数据看板</div><div class="mod-sub">把分散在各栏目的努力，连成看得见的成长曲线</div></div>';
  // 周期切换
  h+='<div class="seg-control" style="margin:4px 0 14px"><button class="'+(range==="week"?"active":"")+'" onclick="setDashRange(\'week\')">近 7 天</button><button class="'+(range==="month"?"active":"")+'" onclick="setDashRange(\'month\')">近 30 天</button></div>';
  // 概览卡片
  h+='<div class="dash-grid">'+
    '<div class="dash-item"><b>'+fmt(studySum.sum/60,"h")+'</b><span>总学习时长</span></div>'+
    '<div class="dash-item"><b>'+streak+' 天</b><span>连续打卡</span></div>'+
    '<div class="dash-item"><b>'+chkPct+'%</b><span>平均完成率</span></div>'+
    '<div class="dash-item"><b>'+fmt(expSum.sum,"元")+'</b><span>总支出</span></div>'+
  '</div>';
  // 学习时长趋势
  h+='<div class="card"><h3>📚 学习投入趋势</h3>'+
    '<div class="mini-note">日均 '+(studySum.has?fmt(studySum.avg/60,"h"):"—")+' · 峰值 '+fmt(studySum.max/60,"h")+'</div>'+
    trendChartSVG(d.study.map(function(x){return {ds:x.ds,v:x.v};}),{w:320,h:120})+'</div>';
  // 打卡完成率趋势
  h+='<div class="card"><h3>✅ 打卡完成率</h3>'+
    '<div class="mini-note">有打卡记录 '+chkDays+' 天 · 日均完成 '+chkPct+'%</div>'+
    trendChartSVG(d.chk.map(function(x){return {ds:x.ds,v:x.pct};}),{w:320,h:110})+'</div>';
  // 支出趋势
  h+='<div class="card"><h3>💸 支出趋势</h3>'+
    '<div class="mini-note">日均 '+(expSum.has?fmt(expSum.avg,"元"):"—")+' · 最高单日 '+fmt(expSum.max,"元")+'</div>'+
    trendChartSVG(d.expense.map(function(x){return {ds:x.ds,v:x.v};}),{w:320,h:110})+'</div>';
  // 体重趋势（仅在有数据时显示）
  if(ws.length>=2){
    h+='<div class="card"><h3>⚖️ 体重趋势</h3>'+
      '<div class="mini-note">最新 '+fmt(wLatest)+' · 较首条 '+(wDelta>0?"+":"")+fmt(wDelta)+'</div>'+
      trendChartSVG(ws.map(function(x){return {ds:x.ds,v:x.v};}),{w:320,h:110})+'</div>';
  } else if(ws.length===1){
    h+='<div class="card"><h3>⚖️ 体重趋势</h3><div class="mini-note">已记录 '+fmt(wLatest)+'，再记几天就能看到曲线啦</div></div>';
  }
  // 心情趋势
  const moodPts=d.mood.filter(function(x){return x.v!=null;});
  if(moodPts.length>=2){
    h+='<div class="card"><h3>🌈 心情趋势</h3>'+
      '<div class="mini-note">最近心情 '+(d.mood[d.mood.length-1].v!=null?['😢','😟','😐','😊','😀'][d.mood[d.mood.length-1].v-1]||'—':'—')+'</div>'+
      trendChartSVG(moodPts,{w:320,h:100})+'</div>';
  }
  h+='<div class="mini-note" style="margin-top:6px">数据来自你已在各栏目记下的内容，无需额外录入。想看更多维度，去对应栏目继续记录即可 🌱</div>';
  h+='<div class="view-end"></div>';
  v.innerHTML=h;
}
function setDashRange(r){ state.meta.dashRange=r; save(); renderDashboard(); }

/* ============ 首页 ============ */
/* —— 首页区块可拖拽排序（第 2 点）——
   将首页各卡片拆分为带 id 的区块单元，按 state.meta.homeBlocks 顺序装配；
   进入「编辑首页」模式后可长按手柄拖动重排，顺序持久化。 */
/* 模块级缓存：renderHome 计算后供 buildHomeBlock/actionZoneHtml 读取 */
let _hb_heroBg="",_hb_heroImg="",_hb_stats=null,_hb_grid=[],_hb_coreGrid=[],_hb_moreGrid=[],_hb_inboxSvg="",_hb_clock="",_hb_dateStr="";
const HOME_BLOCKS=[
  {id:"greet",title:"问候",sec:".home-greet"},
  {id:"hero",title:"封面大图",sec:".home-hero"},
  {id:"pinned",title:"置顶栏目",sec:".pin-cards"},
  {id:"bento",title:"数据看板",sec:".bento"},
  {id:"overview",title:"今日概览",sec:".today-ov"},
  {id:"todos",title:"今日待办",sec:".home-todos"},
  {id:"global",title:"全局待办",sec:".home-global"},
  {id:"words",title:"笑笑语录",sec:".hc-words"},
  {id:"kr",title:"鞠式心法",sec:".hc-kr"},
  {id:"day",title:"每日宜",sec:".hc-day"},
  {id:"mood",title:"今日心情",sec:".mood-home"},
  {id:"action",title:"栏目入口",sec:".action-zone"},
  {id:"month",title:"月度仪表",sec:".month-dash"},
  {id:"pick",title:"每日精选",sec:".daily-pick"},
  {id:"goal",title:"每日目标",sec:".goal-card"},
  {id:"focus",title:"专注番茄",sec:".focus-card"},
  {id:"nowplaying",title:"正在播放",sec:".np-home"},
  {id:"whispers",title:"灵感册",sec:".whisper-wall"},
  {id:"ynboard",title:"海水变蓝",sec:".yn-board"},
  {id:"inbox",title:"投喂说明",sec:".home-inbox"}
];
/* 默认首页仅装配核心区块，避免 19 块全堆出「两个首页」的拥挤观感；
   其余区块仍可在「编辑首页 → 自定义」里一键加回，已保存的自定义顺序优先。 */
const DEFAULT_HOME_BLOCKS=["greet","hero","bento","overview","todos","mood","action","words","kr","day"];
function getHomeBlocks(){
  // 已保存的自定义顺序：直接作为用户想要的完整区块集返回（拖拽/开关都会写 state.meta.homeBlocks）
  const saved=(state.meta.homeBlocks||[]).filter(id=>HOME_BLOCKS.some(b=>b.id===id));
  if(saved.length) return saved;
  // 无自定义：用精简默认集（核心 10 块），不把其余块自动补回，避免首页再次拥挤
  return DEFAULT_HOME_BLOCKS.slice();
}
/* === 栏目配图（每栏目独立的「黑白明信片」配图） === */
function readHomeImage(id){ try{ const k=state.meta.homeImages||(state.meta.homeImages={}); return k[id]||""; }catch(e){ return ""; } }
function writeHomeImage(id,data){ state.meta.homeImages=state.meta.homeImages||{}; state.meta.homeImages[id]=data; save(); }
function pickHomeImage(id){
  const inp=document.createElement("input"); inp.type="file"; inp.accept="image/*";
  inp.onchange=()=>{ const f=inp.files[0]; if(!f) return;
    compressImage(f,(data,err)=>{ if(err){ toast(err); return; } writeHomeImage(id,data); renderHome(); toast("📷 栏目配图已设置"); },
    {fullRes:true}); };
  inp.click();
}
function renderHomeImg(id,label){
  // 仅在已有配图时显示拍立得缩略图；无图时返回空（避免斜纹"+"占位突兀挤压内容），
  // 配图入口改为在 block 卡片右下角的轻量"配图"按钮，详见 buildHomeBlock。
  const url=readHomeImage(id);
  const labelTxt=(label||"").replace(/[<>"]/g,"");
  if(url){
    return '<div class="home-block-thumb" onclick="pickHomeImage(\''+id+'\')" title="点击更换 · '+labelTxt+'">'
      +'<span class="hbt-frame"><img src="'+url+'" alt="'+labelTxt+'"/></span>'
      +'<span class="hbt-cap">'+labelTxt+'</span></div>';
  }
  return '';
}
function buildHomeBlock(id){
  switch(id){
    case "greet":
  return '<div class="home-greet" data-home-block="greet">'+
    '<div class="hg-avatar">'+(new Date().getHours()<6?'🌙':new Date().getHours()<12?'🌞':new Date().getHours()<18?'🌇':'🌙')+'</div>'+
    '<div class="hg-tx">'+
      '<div class="hg-hi">'+greetingText()+'</div>'+
      '<div class="hg-sub">'+
        '<span class="hg-clock">'+(_hb_clock||'00:00')+'</span>'+
        '<span style="margin:0 6px;color:#d6d2cc;">·</span>'+
        '<span>'+(_hb_dateStr||'')+'</span>'+
      '</div>'+
    '</div>'+
    (document.body.classList.contains("home-edit")?'':'<button class="home-edit-btn" onclick="toggleHomeEdit(true)" aria-label="编辑首页"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg><span>排序</span></button>')+
  '</div>';

    case "hero":
      return '<div class="home-hero'+(state.meta.heroImage?' has-cover':'')+'" id="heroSlot" data-home-block="hero" data-en="WORKBENCH" style="'+_hb_heroBg+'" onclick="openCoverEditor(\'hero\')">'+
        _hb_heroImg+
        (state.meta.rainAtmos?'<div class="hero-cap"><div class="hc-title">潮湿雨季 · 听雨阁</div></div>':'')+
        '<div class="hero-main">'+
          '<div class="date">'+new Date().toLocaleDateString("zh-CN")+'</div>'+
          '<div class="dnum">Day '+_hb_stats.usageDays+'</div>'+
          '<div class="sub">今天也要闪闪发光</div>'+
        '</div>'+
        '<div class="hero-hint">🖼 点击更换封面</div>'+
        (state.meta.rainAtmos?heroRainHtml():'')+
      '</div>';

    case "pinned": return renderPinnedCards();
    case "bento": return '<div data-home-block="bento">'+renderBento()+'</div>';
    case "overview": return '<div data-home-block="overview">'+renderHomeImg('overview','今日概览')+renderTodayOverview()+'</div>';
    case "todos": return '<div data-home-block="todos">'+renderHomeImg('todos','今日待办')+renderHomeTodos()+'</div>';
    case "global": return '<div data-home-block="global">'+renderGlobalTodos()+'</div>';
    case "words": return '<div class="heart-card hc-words" data-home-block="words">'+homeWordsHtml()+'</div>';
    case "kr": return '<div class="heart-card hc-kr" data-home-block="kr">'+homeKrHtml()+'</div>';
    case "day": return '<div class="heart-card hc-day" data-home-block="day">'+homeDayHtml()+'</div>';
    case "mood": return '<div data-home-block="mood">'+renderHomeImg('mood','今日心情')+renderHomeMood()+'</div>';
    case "action": return '<div data-home-block="action">'+renderHomeImg('action','栏目入口')+actionZoneHtml()+'</div>';
    case "focus": return '<div class="card focus-card" data-home-block="focus" onclick="openFocus()">'+
        (function(){const t=todayStr();const min=(state.meta.focusLog&&state.meta.focusLog[t])||0;const total=Object.values(state.meta.focusLog||{}).reduce(function(a,b){return a+b;},0);
          return '<div class="focus-ring-wrap"><svg width="84" height="84" viewBox="0 0 84 84"><circle cx="42" cy="42" r="37" fill="none" stroke="var(--glass-border)" stroke-width="7"/><circle cx="42" cy="42" r="37" fill="none" stroke="url(#focusGrad)" stroke-width="7" stroke-linecap="round" stroke-dasharray="'+(2*Math.PI*37).toFixed(1)+'" stroke-dashoffset="'+((2*Math.PI*37)*(1-Math.min(min,120)/120)).toFixed(1)+'"/><defs><linearGradient id="focusGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="var(--primary)"/><stop offset="100%" stop-color="var(--accent)"/></linearGradient></defs></svg>'+
            '<div class="fr-num"><span class="fr-min">'+min+'</span><span class="fr-unit">今日分钟</span></div></div>'+
          '<div class="focus-meta"><div class="fm-t">专注番茄钟</div><div class="fm-s">今日 '+min+' 分钟 · 累计 '+total+' 分钟<br>点我开始一次专注 🍅</div><div class="fm-go">开始专注 →</div></div>';})()+
        '</div>';
    case "whispers": return '<div class="card" data-home-block="whispers"><h3 data-en="WHISPER">'+icon('sparkle',16)+' 灵感册</h3>'+renderWhisperWall()+'</div>';
    case "ynboard": return renderYnBoard();
    case "nowplaying":
      if(!(musicAudio&&!musicAudio.paused&&musicIdx>=0&&musicTracks[musicIdx]))return '';
      if(window._npHomeDismissed)return '';
      (function(){var t=musicTracks[musicIdx];window._npName=t.name;})();
      return '<div class="np-home" data-home-block="nowplaying" onclick="showMusicPlayer()">'+
        '<div class="np-h-art spinning">'+icon('music')+'</div>'+
        '<div class="np-h-info"><div class="np-h-title">'+esc(window._npName||'')+'</div><div class="np-h-sub">正在播放 · 清音听雨阁</div></div>'+
        '<button class="np-h-btn" onclick="event.stopPropagation();musicToggle()">'+icon('pause',16)+'</button>'+
        '<button class="np-h-close" title="收起（音乐继续）" onclick="event.stopPropagation();dismissNpHome()">'+icon('close',14)+'</button>'+
      '</div>';
    case "month": return '<div data-home-block="month">'+renderMonthDash()+'</div>';
    case "pick": return '<div data-home-block="pick">'+renderDailyPick()+'</div>';
    case "goal": return '<div data-home-block="goal">'+renderDailyGoalCard()+'</div>';
    case "inbox": return '<div class="card home-inbox" data-home-block="inbox" style="margin-top:12px"><h3>'+_hb_inboxSvg+'投喂记录区</h3>'+
        '<div class="mini-note">每个栏目底部都有「投喂记录区」：看到好东西先扔进来收藏，不会丢。<br>· 粘贴 B站链接 → 点「在工作台播放」直接看<br>· 点「转任务」→ 变成下方打卡项<br>· 发链接给我（说「喂给 XX」）→ 我帮你提炼整理</div></div>';
  }
  return '';
}
function homeWordsHtml(){
  const wd=JU_WORDS[Math.floor(Math.random()*JU_WORDS.length)];
  return '<div class="hc-words-t">'+icon('sparkle',12)+' 笑笑语录</div>'+
    '<div class="hc-words-m">'+esc(wd.zh||wd.ko||'')+'</div>'+
    (wd.src?'<div class="hc-words-src">— '+esc(wd.src)+'</div>':'')+
    '<button class="kr-switch" onclick="switchHomeWords()">'+icon('refresh',12)+' 换一句</button>';
}
function homeKrHtml(){
  const ins=KR_INSPIRE[Math.floor(Math.random()*KR_INSPIRE.length)];
  const m=ins.match(/^(.*?)\((.*?)\)$/);
  const ko=m?m[1]:ins, zh=m?m[2]:'';
  return '<div class="hc-kr-row"><span class="kr-ic">'+icon('heart',18)+'</span><div class="kr-tx"><span class="kr-ko">'+esc(ko)+'</span>'+(zh?'<span class="kr-cn">'+esc(zh)+'</span>':'')+'</div></div>'+
    '<button class="kr-switch" onclick="switchHomeInspire()">'+icon('refresh',12)+' 换一句</button>';
}
function homeDayHtml(){
  const wd=dailyWordFor(todayStr());
  const yi=JU_YI[Math.floor((Date.now()/86400000))%JU_YI.length];
  const dow=['日','一','二','三','四','五','六'][new Date().getDay()];
  return '<div class="hc-day-t">'+icon('sun',12)+' 每日宜 · '+new Date().getMonth()+1+'月'+new Date().getDate()+'日 周'+dow+'</div>'+
    '<div class="hc-day-m">宜：<b>'+esc(yi||'好好生活')+'</b></div>'+
    (wd?('<div class="hc-day-q">「'+(wd.zh||wd.ko||'')+'」'+(wd.src?('<span class="hc-day-src">— '+esc(wd.src)+'</span>'):'')+'</div>'):'');
}
function renderPinnedCards(){
  const pinned=(state.meta.pinned||[]).filter(function(id){return MODULE_DEFS[id]&&id!=="home";});
  if(!pinned.length)return '';
  const pinClose='<svg class="svg-ic pin-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const boltSvg=icon('bolt',11);
  const grid=_hb_grid;
  return '<div class="card pin-cards-wrap" data-home-block="pinned"><h3>'+boltSvg+' 置顶栏目</h3>'+
    '<div class="pin-cards">'+
    pinned.map(function(id){const g=grid.find(function(x){return x[0]===id;})||[id,boltSvg,COLUMN_TITLES[id]||id];return '<div class="pin-card" role="button" tabindex="0" aria-label="打开'+esc(g[2])+'" onclick="showModule(\''+id+'\')">'+
      '<span class="pc-ic">'+g[1]+'</span><span class="pc-lb">'+esc(g[2])+'</span>'+
      (document.body.classList.contains("home-edit")?'<span class="pc-x" onclick="event.stopPropagation();unpin(\''+id+'\')">'+pinClose+'</span>':'')+
      '</div>';}).join('')+
    '</div></div>';
}
function actionZoneHtml(){
  const hidden=(state.meta.hiddenCols||[]);
  const coreGrid=_hb_coreGrid, moreGrid=_hb_moreGrid;
  // 隐藏的栏目不出现在九宫格；所有可见栏目合并进同一网格，避免「更多」折叠导致显示不全
  const visAll=coreGrid.concat(moreGrid).filter(function(g){return hidden.indexOf(g[0])<0;});
  const tail=
    '<div class="cell" role="button" tabindex="0" aria-label="清音听雨阁" data-grid-id="music" onclick="showMusic()" oncontextmenu="event.preventDefault();pinMenu(\'music\',\'清音听雨阁\',this)"><span class="ic">'+icon('music')+'</span><span class="lb">清音听雨阁</span></div>'+
    '<div class="cell cell-more" role="button" tabindex="0" aria-label="全部栏目" data-grid-id="__allcols" onclick="showAllColumns()"><span class="ic">'+icon('compass')+'</span><span class="lb">全部栏目</span></div>';
  return '<div class="action-zone">'+
      '<div class="grid" id="homeGrid">'+
        visAll.map(g=>'<div class="cell" role="button" tabindex="0" aria-label="打开'+esc(g[2])+'" data-grid-id="'+g[0]+'" onclick="showModule(\''+g[0]+'\')" oncontextmenu="event.preventDefault();pinMenu(\''+g[0]+'\',\''+g[2]+'\',this)"><span class="ic">'+g[1]+'</span><span class="lb">'+g[2]+'</span></div>').join("")+
        tail+
      '</div>'+
      '<div class="mini-note" style="text-align:center;color:var(--gray);font-size:11px;margin-top:10px">长按栏目弹出快捷操作 · 钉到首页</div>'+
    '</div>';
}
function greetingText(){
  const h=new Date().getHours();
  let base="你好";
  if(h<5)base="夜深了";
  else if(h<11)base="早上好";
  else if(h<13)base="中午好";
  else if(h<18)base="下午好";
  else if(h<22)base="晚上好";
  else base="夜深了";
  // 养成天数（#28）：state.meta.usageDays 为到访日期数组，长度即累计天数
  let days=0;
  try{ days=(state.meta.usageDays||[]).length; }catch(e){}
  const daySuffix = days>0 ? (" · 今天是第 "+days+" 天") : "";
  // 个性化：仅保留正向反馈（待办清空）与陪伴天数；「今日已完成 X/Y 项」计数已按要求移除
  try{
    const d=todayOverviewData();
    if(d && d.todos>0 && d.todoDone>=d.todos) return base+" · 今日待办已清空 🎉"+daySuffix;
  }catch(e){}
  return base+daySuffix;
}
function greetingIcon(){
  const h=new Date().getHours();
  if(h<5)return icon('moon',22);
  if(h<11)return icon('sun',22);
  if(h<13)return icon('sun',22);
  if(h<18)return icon('cloud',22);
  if(h<22)return icon('moon',22);
  return icon('moon',22);
}
function refreshHome(){
  try{
    const btn=document.getElementById("refreshFab");
    if(btn)btn.classList.add("spinning");
    // 刷新当前激活视图：首页重渲染，模块重渲染，个人页重渲染
    if(currentView==="home")renderHome();
    else if(currentView==="module"){ const id=(document.querySelector(".view.active")&&document.querySelector(".view.active").dataset&&document.querySelector(".view.active").dataset.module)||lastModuleId; if(id)renderModule(id); }
    else if(currentView==="profile")renderProfile();
    else renderHome();
    scrollActiveTop();
    toast("✅ 已刷新");
    setTimeout(function(){ if(btn)btn.classList.remove("spinning"); },700);
  }catch(e){ console.warn("刷新失败",e); }
}
/* 雨天氛围层（磨砂·雨季）：雨丝 + 雾气 + 地面涟漪，参考「雨滴时间栏 / 潮湿雨季版头」 */
function heroRainHtml(){
  // 性能分级：低端机减少雨丝/涟漪数量，避免掉帧（#10）
  const lowPerf = (navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4) ||
                  (window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const FULL_DROPS=[[12,35,1.8],[24,45,2.2],[38,30,1.9],[52,50,2.1],[66,38,1.7],[80,42,2.3],[90,28,2.0]];
  const LOW_DROPS=[[20,40,2.0],[50,48,2.1],[80,36,1.9]];
  const FULL_RIP=[[24,62,2.0,1.4],[52,58,2.2,2.0],[80,66,1.9,1.7]];
  const LOW_RIP=[[52,60,2.2,2.0]];
  const drops=lowPerf?LOW_DROPS:FULL_DROPS;
  const rip=lowPerf?LOW_RIP:FULL_RIP;
  let h='<div class="hero-rain" aria-hidden="true"><div class="hr-mist">';
  /* 雾气/飘雪原本完全不受 lowPerf 影响 —— 雨丝减到 3 滴了，这里还是 4 团雾 + 2 层雾带 + 飘雪，
     降级等于没降。一并纳入分级：低端机/减弱动效时只留最基础的一层。 */
  const mist=lowPerf?[[35,30,80,4]]:[[10,18,60,7],[35,30,80,4],[60,12,70,9],[82,26,55,6]];
  mist.forEach(function(m){h+='<span style="left:'+m[0]+'%;top:'+m[1]+'%;width:'+m[2]+'px;height:'+m[2]+'px;animation-duration:'+m[3]+'s;animation-delay:'+(m[0]%5)+'s"></span>';});
  h+='</div>';
  // 薄雾层（参考「雾气正文前状态栏」：磨砂·雨季的水雾呼吸）
  h+='<div class="hr-fog"></div>';
  // 第二层横向漂移雾带 + 飘雪（雾气组件标志性的「无界飘雪 + 双重涟漪」氛围，纯 CSS 低耗）
  if(!lowPerf){ h+='<div class="hr-fog hr-fog2"></div>'; h+='<div class="hr-snow"></div>'; }
  drops.forEach(function(d,i){h+='<div class="hr-drop" style="left:'+d[0]+'%;height:'+d[1]+'px;animation-duration:'+d[2]+'s;animation-delay:'+(i*0.3).toFixed(1)+'s"></div>';});
  rip.forEach(function(r,i){h+='<div class="hr-ripple" style="left:calc('+r[0]+'% - 14px);top:'+r[1]+'px;width:28px;height:28px;animation-duration:'+r[2]+'s;animation-delay:'+r[3]+'s"></div>';});
  h+='</div>';
  // 雨滴时间栏：时间胶囊 + 潮湿雨季版头标语
  const now=new Date();
  const pad=function(n){return (n<10?'0':'')+n;};
  const wd=['周日','周一','周二','周三','周四','周五','周六'][now.getDay()];
  // 沉浸式底部状态栏（参考「雾气正文前状态栏」）：把"潮湿雨季 kick + 时间"合并到 hero-status，避免与独立 rain-timebar 双胶囊重叠
  h+='<div class="hero-status">'+
     '<div class="hs-kick">HUMID RAINY SEASON</div>'+
     '<div class="hs-title">潮湿雨季 · 听雨阁</div>'+
     '<div class="hs-info"><span id="hsClock">'+pad(now.getHours())+':'+pad(now.getMinutes())+'</span><span>'+(now.getMonth()+1)+'/'+now.getDate()+'</span><span>'+wd+'</span></div>'+
     '<div class="hs-quote">「雨落下的地方，心也会慢慢静下来。」</div>'+
     '</div>';
  return h;
}
/* 雨滴时间栏实时走字 */
let _rainClockTimer=null;
function startRainClock(){
  if(_rainClockTimer)return;
  const tick=function(){
    // 双目标：兼容历史 rtClock（已被合并到 hero-status 的 hsClock）+ 当前 hsClock
    const n=new Date();const pad=function(x){return (x<10?'0':'')+x;};
    const rt=document.getElementById("rtClock");
    if(rt) rt.textContent=pad(n.getHours())+':'+pad(n.getMinutes());
    const hs=document.getElementById("hsClock");
    if(hs) hs.textContent=pad(n.getHours())+':'+pad(n.getMinutes());
  };
  tick();
  _rainClockTimer=setInterval(tick,1000*20);
}
function stopRainClock(){ if(_rainClockTimer){clearInterval(_rainClockTimer);_rainClockTimer=null;} }
const DEFAULT_HERO_SVG="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4MDAgNTAwIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBzbGljZSI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJza3kiIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNlOGU2ZTIiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNiOGI1YWYiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0ibTEiIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM3YTc3NzIiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM1YTU3NTQiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0ibTIiIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM5YTk2OTAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM3Nzc0NzAiLz48L2xpbmVhckdyYWRpZW50PjxmaWx0ZXIgaWQ9ImciPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIuOSIgbnVtT2N0YXZlcz0iMiIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjxmZUNvbG9yTWF0cml4IHR5cGU9InNhdHVyYXRlIiB2YWx1ZXM9IjAiLz48ZmVDb21wb25lbnRUcmFuc2Zlcj48ZmVGdW5jQSB0eXBlPSJsaW5lYXIiIHNsb3BlPSIuMjIiLz48L2ZlQ29tcG9uZW50VHJhbnNmZXI+PGZlQ29tcG9zaXRlIGluMj0iU291cmNlR3JhcGhpYyIgb3BlcmF0b3I9ImluIi8+PC9maWx0ZXI+PC9kZWZzPjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNTAwIiBmaWxsPSJ1cmwoI3NreSkiLz48Y2lyY2xlIGN4PSI1OTAiIGN5PSIxNDAiIHI9IjQ4IiBmaWxsPSIjZjBlZGU4IiBvcGFjaXR5PSIuOSIvPjxjaXJjbGUgY3g9IjU5MCIgY3k9IjE0MCIgcj0iNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2FhYSIgc3Ryb2tlLXdpZHRoPSIuNSIvPjxwYXRoIGQ9Ik0wIDM0MCBMMTIwIDI0MCBMMjEwIDI5MCBMMzMwIDIwMCBMNDMwIDI4MCBMNTQwIDIyMCBMNjYwIDI5MCBMODAwIDI0MCBMODAwIDUwMCBMMCA1MDAgWiIgZmlsbD0idXJsKCNtMSkiLz48cGF0aCBkPSJNMCA0MDAgTDEwMCAzNDAgTDIyMCAzODAgTDM0MCAzMjAgTDQ2MCAzNzAgTDU4MCAzMzAgTDcwMCAzODAgTDgwMCAzNTAgTDgwMCA1MDAgTDAgNTAwIFoiIGZpbGw9InVybCgjbTIpIi8+PGxpbmUgeDE9IjE4IiB5MT0iMTgiIHgyPSI3ODIiIHkyPSIxOCIgc3Ryb2tlPSIjNjY2IiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1kYXNoYXJyYXk9IjQgNCIvPjxsaW5lIHgxPSIxOCIgeTE9IjQ4MiIgeDI9Ijc4MiIgeTI9IjQ4MiIgc3Ryb2tlPSIjNjY2IiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1kYXNoYXJyYXk9IjQgNCIvPjxsaW5lIHgxPSIxOCIgeTE9IjE4IiB4Mj0iMTgiIHkyPSI0ODIiIHN0cm9rZT0iIzY2NiIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtZGFzaGFycmF5PSI0IDQiLz48bGluZSB4MT0iNzgyIiB5MT0iMTgiIHgyPSI3ODIiIHkyPSI0ODIiIHN0cm9rZT0iIzY2NiIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtZGFzaGFycmF5PSI0IDQiLz48dGV4dCB4PSIzMiIgeT0iNDIiIGZpbGw9IiM2NjYiIGZvbnQtZmFtaWx5PSJHZW9yZ2lhLHNlcmlmIiBmb250LXNpemU9IjEzIiBsZXR0ZXItc3BhY2luZz0iNCIgZm9udC1zdHlsZT0iaXRhbGljIj5QT1NUIENBUkQgwrcgMjAyNjwvdGV4dD48dGV4dCB4PSI3NjgiIHk9IjQ2OCIgZmlsbD0iIzY2NiIgZm9udC1mYW1pbHk9Ikdlb3JnaWEsc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGxldHRlci1zcGFjaW5nPSIzIiB0ZXh0LWFuY2hvcj0iZW5kIj7igJQgTk8uIDA5IOKAlDwvdGV4dD48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iIzAwMCIgZmlsdGVyPSJ1cmwoI2cpIiBvcGFjaXR5PSIuMzUiLz48L3N2Zz4=";
/* 首页快速投喂浮动条显隐（#14）：仅首页显示，其余视图隐藏 */
function syncFeedFab(){
  try{
    const el=document.getElementById("feedFab"); if(!el)return;
    const homeActive=!!(document.querySelector("#view-home")&&document.querySelector("#view-home").classList.contains("active"));
    el.style.display = homeActive ? "flex" : "none";
  }catch(e){}
}
/* 用 MutationObserver 监听首页视图 active 类变化，自动同步浮动条显隐，避免遗漏任何切换路径 */
function bindFeedFabSync(){
  try{
    const home=document.querySelector("#view-home"); if(!home)return;
    const obs=new MutationObserver(function(){ try{ syncFeedFab(); }catch(e){} });
    obs.observe(home,{attributes:true,attributeFilter:["class"]});
  }catch(e){}
}
function renderHome(){
  let hero=readImage("meta.heroImage");
  if(!hero && state.meta.coverRandom && (state.meta.heroCovers||[]).length){ hero=state.meta.heroCovers[Math.floor(Math.random()*state.meta.heroCovers.length)]; }
  if(!hero){ hero=DEFAULT_HERO_SVG; }
  const ICON={sun:icon('sun'),book:icon('book'),sword:icon('sword'),brain:icon('brain'),book2:icon('book'),sparkle:icon('sparkle'),figure:icon('figure'),yen:icon('yen'),news:icon('news'),calendar:icon('calendar'),heart:icon('heart'),mood:icon('mood')};
  const allGrid=[["schedule",ICON.sun,"今日日程"],["cet",ICON.book,"英语等级考试"],["gongkao",ICON.sword,"公考备战"],["studyclub",ICON.brain,"知识研习"],["knowledge",ICON.book2,"知识库"],["refinement",ICON.sparkle,"变美日记"],["posture",ICON.figure,"体态管理"],["menstrual",ICON.heart,"生理期记录"],["mood",ICON.mood,"心情日记"],["money",ICON.yen,"记账本"],["hot",ICON.news,"热点速览"],["books",ICON.book2,"读书笔记"],["travel",ICON.figure,"生活记录"],["calendar",ICON.calendar,"养成日历"]];
  // 允许通过 state.meta.gridOrder 自定义九宫格顺序（拖拽持久化）
  let orderedGrid=allGrid;
  if(state.meta.gridOrder&&state.meta.gridOrder.length){
    const map={};allGrid.forEach(function(g){map[g[0]]=g;});
    const kept=state.meta.gridOrder.filter(function(id){return map[id];}).map(function(id){return map[id];});
    allGrid.forEach(function(g){ if(state.meta.gridOrder.indexOf(g[0])<0) kept.push(g); });
    orderedGrid=kept;
  }
  const grid=orderedGrid;
  const coreGrid=orderedGrid.slice(0,6);
  const moreGrid=orderedGrid.slice(6);
  const pinned=(state.meta.pinned||[]).filter(function(id){return MODULE_DEFS[id]&&id!=="home";});
  const pinClose='<svg class="svg-ic pin-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const boltSvg=icon('bolt',11);
  const pinHtml=pinned.length?('<div class="pin-row"><span class="pin-label">'+boltSvg+' 我的快捷</span>'+
    pinned.map(function(id){const g=grid.find(function(x){return x[0]===id;})||[id,boltSvg,COLUMN_TITLES[id]||id];return '<span class="pin-chip" onclick="showModule(\''+id+'\')" oncontextmenu="event.preventDefault();unpin(\''+id+'\')">'+g[1]+' '+esc(g[2])+' '+pinClose+'</span>';}).join('')+
    '</div>'):'';
  const stats=computeStats();
  const v=$("#view-home");
  const heroStyle=(state.meta.coverStyle&&state.meta.coverStyle.hero)||{mode:"cover",x:0,y:0,scale:1};
  // Hero 里还有日期/Day 数等文字子节点，不能把 transform/scale 直接打在 .home-hero 上，
  // 否则缩放时文字会跟着一起被放大；改为插入一层 .hero-img 专门承载位移与缩放。
  const heroBg = hero ? ('background-image:url('+hero+');background-size:cover;background-position:center;background-repeat:no-repeat;') : '';
  const heroImg = hero ? ('<div class="hero-img" style="background-image:url('+hero+');'+coverCss(heroStyle)+';'+coverFilterCss()+'"></div>') : '';
  const greet=greetingText();
  const greetIc=greetingIcon();
  const inboxSvg='<svg class="svg-ic" viewBox="0 0 24 24" width="18" height="18" style="vertical-align:-4px;margin-right:4px"><path d="M22 12l-10-9-10 9h3v8h14v-8z"/><path d="M12 14v6"/></svg>';
  v.className="view active";
  // 实时时钟（折叠进问候块，避免顶部状态条与问候块重复而成的「双首页」观感）
  const _now=new Date();
  const _hh=String(_now.getHours()).padStart(2,"0"),_mm=String(_now.getMinutes()).padStart(2,"0");
  const _wd=["周日","周一","周二","周三","周四","周五","周六"][_now.getDay()];
  const _dateStr=(_now.getMonth()+1)+"月"+_now.getDate()+"日 · "+_wd;
  _hb_heroBg=heroBg; _hb_heroImg=heroImg; _hb_stats=stats; _hb_grid=grid; _hb_coreGrid=coreGrid; _hb_moreGrid=moreGrid; _hb_inboxSvg=inboxSvg;
  _hb_clock=_hh+':'+_mm; _hb_dateStr=_dateStr;
  // 编辑模式：在顶部插入一条「完成排序」提示条
  const editing=document.body.classList.contains("home-edit");
  let html = editing ? '<div class="home-edit-bar"><span>'+icon('drag',16)+' 拖动卡片排序；点「自定义」可置顶 / 隐藏栏目</span><button class="edit-cust" onclick="showHomeCustom()">自定义</button><button class="edit-done" onclick="toggleHomeEdit(false)">完成</button></div>' : '';
  const blocks=getHomeBlocks();
  html += blocks.map(function(id){
    const inner=buildHomeBlock(id);
    if(!inner) return '';
    return editing ? '<div class="home-block-edit" data-edit-block="'+id+'"><span class="hb-handle">'+icon('drag',18)+'</span>'+inner+'</div>' : inner;
  }).join("");
  v.innerHTML=html+'<div class="view-end"></div>';
  decorateEmptyStates(v);
  autoGuardBgImages(v);
  // Bento 卡片 backdrop-filter 在 Chromium 下需要内联兜底
  applyBentoBackdrop(state.meta.material||"glass");
  initDailyPickSwipe();
  initYnBoard();
  setTimeout(function(){ try{ animateStatNumbers(v); }catch(e){} },60);
  whenIdle(function(){ try{ updateHomeWeatherHoliday(); }catch(e){} },600);
  if(state.meta.rainAtmos){ startRainClock(); }
  if(editing){
    setTimeout(function(){ try{ enableHomeBlockDrag(); }catch(e){ console.warn('enableHomeBlockDrag',e);} },0);
    setTimeout(function(){ try{ enableHomeGridDrag(); }catch(e){ console.warn('enableHomeGridDrag',e);} },0);
  }
  syncFeedFab();
}
function toggleHomeEdit(on){
  document.body.classList.toggle("home-edit",!!on);
  renderHome();
}
/* 通用拖拽重排：支持占位框 + 插入线 + 精确落点 */
function setupReorderDrag(opts){
  const {handle, container, itemSelector, placeholderClass, axis, onEnd}=opts;
  handle.addEventListener("pointerdown",function(e){
    if(handle.closest(".dragging")) return;
    e.preventDefault(); if(handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
    const item=handle.closest(itemSelector); if(!item) return;
    const rect=item.getBoundingClientRect();
    const parent=item.parentNode;
    const placeholder=document.createElement("div");
    placeholder.className=(placeholderClass||"drag-placeholder")+" drag-placeholder";
    placeholder.style.height=rect.height+"px";placeholder.style.marginBottom=getComputedStyle(item).marginBottom;
    parent.insertBefore(placeholder,item.nextSibling);
    item.classList.add("dragging");
    const isGrid=axis==="both";
    const dropLine=!isGrid?document.createElement("div"):null;
    if(dropLine){dropLine.className="drop-line";dropLine.style.display="none";parent.appendChild(dropLine);}
    let moved=false;
    function clientY(ev){ return ev.touches?ev.touches[0].clientY:ev.clientY; }
    function clientX(ev){ return ev.touches?ev.touches[0].clientX:ev.clientX; }
    function pos(ev){ return axis==="x"?clientX(ev):clientY(ev); }
    function getItems(){ return [].slice.call(parent.querySelectorAll(itemSelector)).filter(function(s){return s!==item;}); }
    function closest(ev){
      const p=pos(ev);
      const items=getItems(); if(!items.length) return null;
      let best=null,bestDist=Infinity;
      items.forEach(function(s){
        const r=s.getBoundingClientRect();
        const center=axis==="x"?r.left+r.width/2:r.top+r.height/2;
        const dist=Math.abs(p-center);
        if(dist<bestDist){bestDist=dist;best=s;}
      });
      if(!best) return null;
      const r=best.getBoundingClientRect();
      const before=axis==="x"?pos(ev)<r.left+r.width/2:pos(ev)<r.top+r.height/2;
      return {target:best,before:before};
    }
    function move(ev){
      moved=true;
      const c=closest(ev); if(!c){if(dropLine)dropLine.style.display="none";return;}
      const r=c.target.getBoundingClientRect();
      if(dropLine){
        dropLine.style.display="block";
        if(c.before){ dropLine.classList.remove("after");dropLine.classList.add("before");dropLine.style.top=r.top+"px";dropLine.style.left=r.left+"px";dropLine.style.width=(axis==="x"?2:r.width)+"px";dropLine.style.height=(axis==="x"?r.height:2)+"px"; }
        else { dropLine.classList.remove("before");dropLine.classList.add("after");dropLine.style.top=(r.bottom-2)+"px";dropLine.style.left=r.left+"px";dropLine.style.width=(axis==="x"?2:r.width)+"px";dropLine.style.height=(axis==="x"?r.height:2)+"px"; }
      }
      if(c.before){ parent.insertBefore(placeholder,c.target); }
      else { parent.insertBefore(placeholder,c.target.nextSibling); }
    }
    function up(ev){
      if(handle.releasePointerCapture) try{ handle.releasePointerCapture(e.pointerId); }catch(err){}
      document.removeEventListener("pointermove",move);
      document.removeEventListener("pointerup",up);
      document.removeEventListener("pointercancel",up);
      if(dropLine)dropLine.remove();
      item.classList.remove("dragging");
      // 把 item 移动到 placeholder 位置
      parent.insertBefore(item,placeholder);
      placeholder.remove();
      if(moved && onEnd) onEnd();
    }
    document.addEventListener("pointermove",move);
    document.addEventListener("pointerup",up);
    document.addEventListener("pointercancel",up);
  });
}
function enableHomeBlockDrag(){
  const root=document.getElementById("view-home"); if(!root) return;
  root.querySelectorAll(".hb-handle").forEach(function(h){
    setupReorderDrag({handle:h, itemSelector:".home-block-edit", placeholderClass:"home-block-edit", axis:"y", onEnd:function(){
      const order=[].slice.call(root.querySelectorAll(".home-block-edit")).map(function(s){return s.getAttribute("data-edit-block");});
      state.meta.homeBlocks=order; saveNow(); haptic(10); // 离散操作，立即落盘避免节流延迟丢失
    }});
  });
}
function enableHomeGridDrag(){
  const root=document.getElementById("view-home"); if(!root) return;
  const cells=root.querySelectorAll("#homeGrid .cell");
  cells.forEach(function(c){
    setupReorderDrag({handle:c, itemSelector:".cell", placeholderClass:"grid-cell-ph", axis:"both", onEnd:function(){
      const order=[].slice.call(root.querySelectorAll(".grid .cell")).map(function(s){return s.getAttribute("data-grid-id");});
      state.meta.gridOrder=order; saveNow(); haptic(10);
    }});
  });
}
function enableSectionDrag(){
  const root=document.getElementById('view-module'); if(!root) return;
  const id=root.getAttribute('data-curmod'); if(!id) return;
  root.querySelectorAll('.sec-handle').forEach(function(h){
    setupReorderDrag({handle:h, itemSelector:".mod-sec", placeholderClass:"mod-sec", axis:"y", onEnd:function(){
      const order=[].slice.call(root.querySelectorAll('.mod-sec')).map(function(s){return s.getAttribute('data-key');});
      saveModuleOrder(id,order); saveNow(); haptic(10);
    }});
  });
}
function quickActions(id){
  const map={
    cet:[{ic:icon('play',16),label:"开始专注",act:"closeModal();startFocus('cet')"},{ic:icon('plus',16),label:"记录学习",act:"closeModal();openForm('cet','study',null)"}],
    gongkao:[{ic:icon('play',16),label:"开始专注",act:"closeModal();startFocus('gongkao')"},{ic:icon('plus',16),label:"记录学习",act:"closeModal();openForm('gongkao','study',null)"}],
    schedule:[{ic:icon('plus',16),label:"加今日待办",act:"closeModal();openForm('schedule','daily',null)"}],
    knowledge:[{ic:icon('plus',16),label:"新建知识卡",act:"closeModal();showKnowledge();setTimeout(function(){var b=document.querySelector('#kbAddBtn');if(b)b.click();},200);"},{ic:icon('search',16),label:"检索卡片",act:"closeModal();showKnowledge();setTimeout(function(){var i=document.getElementById('kbSearch');if(i)i.focus();},200);"}],
    studyclub:[{ic:icon('download',16),label:"去投喂提炼",act:"closeModal();showModule('studyclub')"},{ic:icon('refresh',16),label:"复习卡片",act:"closeModal();showModule('studyclub')"}],
    refinement:[{ic:icon('plus',16),label:"记今日打卡",act:"closeModal();openForm('refinement','daily',null)"},{ic:icon('figure',16),label:"记体重",act:"closeModal();openForm('refinement','body',null)"}],
    posture:[{ic:icon('plus',16),label:"记体态",act:"closeModal();openForm('posture','monthly',null)"}],
    money:[{ic:icon('plus',16),label:"记一笔",act:"closeModal();openForm('money','records',null)"}],
    hot:[{ic:icon('news',16),label:"看热点",act:"closeModal();showModule('hot')"}],
    mood:[{ic:icon('mood',16),label:"记今天心情",act:"closeModal();showModule('mood')"}]
  };
  return map[id]||[];
}
function pinMenu(id,label,el){
  const pinned=(state.meta.pinned||[]);
  const on=pinned.includes(id);
  const acts=quickActions(id);
  let html='<h3>'+icon('bolt',16)+' '+esc(label)+' · 快捷</h3>'+
    (acts.length?'<div class="qa-list">'+acts.map(function(a){return '<div class="qa-item" onclick="'+a.act+'"><span class="qa-ic">'+a.ic+'</span>'+esc(a.label)+'</div>';}).join('')+'</div>':'')+
    '<div class="modal-ops"><button class="cancel" onclick="closeModal()">取消</button>'+
    '<button class="save" onclick="togglePin(\''+id+'\');closeModal()">'+(on?'取消钉选':'钉到首页')+'</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
}
function togglePin(id){
  state.meta.pinned=state.meta.pinned||[];
  const i=state.meta.pinned.indexOf(id);
  if(i>=0)state.meta.pinned.splice(i,1);else state.meta.pinned.push(id);
  save();renderHome();toast(state.meta.pinned.indexOf(id)>=0?"已钉到首页":"已取消钉选");
}
function unpin(id){
  state.meta.pinned=(state.meta.pinned||[]).filter(function(x){return x!==id;});
  save();renderHome();toast("已取消钉选");
}
function toggleHideCol(id){
  state.meta.hiddenCols=state.meta.hiddenCols||[];
  const i=state.meta.hiddenCols.indexOf(id);
  if(i>=0)state.meta.hiddenCols.splice(i,1);else state.meta.hiddenCols.push(id);
  save();renderHome();toast(state.meta.hiddenCols.indexOf(id)>=0?"已隐藏该栏目入口":"已显示该栏目入口");
}
/* 首页装饰区块的简短预览描述，方便用户在「自定义」里判断是否添加 */
const BLOCK_DESC={
  words:"笑笑语录 · 鞠婧祎原话", kr:"鞠式心法 · 养成箴言", day:"每日宜 · 黄历小贴士",
  goal:"每日目标 · 今日小目标", focus:"专注番茄 · 计时打卡", pick:"每日精选 · 灵感一句",
  month:"月度仪表 · 趋势概览", whispers:"灵感册 · 碎片收藏", nowplaying:"正在播放 · 清音听雨阁",
  ynboard:"海水变蓝 · 诗意装饰", global:"全局待办 · 跨栏目汇总", pinned:"置顶栏目 · 手动钉选",
  inbox:"投喂说明 · 如何投喂", overview:"今日概览 · 完成率汇总", todos:"今日待办 · 打卡清单",
  mood:"今日心情 · 拍立得", action:"栏目入口 · 九宫格", bento:"数据看板 · 多维统计"
};
/* 首页自定义面板：批量设置「置顶钉 / 隐藏入口」，常驻在编辑模式的入口里 */
function showHomeCustom(){
  const pinned=(state.meta.pinned||[]);const hidden=(state.meta.hiddenCols||[]);
  const all=Object.keys(MODULE_DEFS).filter(function(id){return id!=="home";});
  const iconOf=function(id){const d=MODULE_DEFS[id];return d&&d.icon?icon(d.icon):"✨";};
  const row=function(id){
    const on=pinned.indexOf(id)>=0, off=hidden.indexOf(id)>=0;
    const d=MODULE_DEFS[id]||{};
    return '<div class="hcust-row">'+
      '<span class="hcust-ic">'+iconOf(id)+'</span>'+
      '<span class="hcust-lb">'+esc(d.title||id)+'</span>'+
      '<span class="hcust-ops">'+
        '<button class="hcust-btn'+(on?' on':'')+'" onclick="togglePin(\''+id+'\');refreshHomeCustom()">'+(on?'⭐ 已置顶':'☆ 置顶')+'</button>'+
        '<button class="hcust-btn'+(off?' off':'')+'" onclick="toggleHideCol(\''+id+'\');refreshHomeCustom()">'+(off?'🙈 已隐藏':'👁 显示')+'</button>'+
      '</span></div>';
  };
  // L3 常用 + L4 可选，按「是否默认开启」分组，并展示简短预览描述（#2.2）
  const cur=(state.meta.homeBlocks&&state.meta.homeBlocks.length)?state.meta.homeBlocks:DEFAULT_HOME_BLOCKS.slice();
  const optBlocks=HOME_BLOCKS.filter(function(b){return DEFAULT_HOME_BLOCKS.indexOf(b.id)<0;});
  const optRow=function(b){
    const on=cur.indexOf(b.id)>=0;
    return '<div class="hcust-row hcust-row-desc">'+
      '<span class="hcust-ic">✦</span>'+
      '<span class="hcust-lb">'+esc(b.title)+'<span class="hcust-desc">'+(BLOCK_DESC[b.id]||"")+'</span></span>'+
      '<span class="hcust-ops"><button class="hcust-btn'+(on?' on':'')+'" onclick="toggleHomeBlock(\''+b.id+'\');refreshHomeCustom()">'+(on?'✓ 已显示':'＋ 添加')+'</button></span>'+
    '</div>';
  };
  const html='<h3>'+icon('sparkle',16)+' 首页自定义</h3>'+
    '<div class="mini-note">「置顶」会把栏目放到首页顶部卡片区；「隐藏」只从首页九宫格移除，仍可从「我的 → 全部栏目」进入。</div>'+
    '<div class="hcust-radius"><span class="hcust-rlb">全局圆角</span>'+
      '<span class="pill-row">'+
        '<button class="pill'+( (state.meta.radius!=null?state.meta.radius:20)===8?' on':'')+'" onclick="setRadius(8);refreshHomeCustom()">利落</button>'+
        '<button class="pill'+( (state.meta.radius!=null?state.meta.radius:20)===14?' on':'')+'" onclick="setRadius(14);refreshHomeCustom()">柔和</button>'+
        '<button class="pill'+( (state.meta.radius!=null?state.meta.radius:20)===20?' on':'')+'" onclick="setRadius(20);refreshHomeCustom()">圆润</button>'+
        '<button class="pill'+( (state.meta.radius!=null?state.meta.radius:20)===28?' on':'')+'" onclick="setRadius(28);refreshHomeCustom()">娇憨</button>'+
      '</span></div>'+
    '<div class="hcust-list">'+all.map(row).join('')+'</div>'+
    '<div class="hcust-head">首页装饰区块 <span class="hcust-sub">（L4 · 默认不显示，按需添加）</span></div>'+
    '<div class="hcust-list">'+optBlocks.map(optRow).join('')+'</div>'+
    '<div class="modal-ops"><button class="cancel" onclick="closeModal()">完成</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
}
function toggleHomeBlock(id){
  state.meta.homeBlocks=state.meta.homeBlocks&&state.meta.homeBlocks.length?state.meta.homeBlocks.slice():DEFAULT_HOME_BLOCKS.slice();
  const wasOn=state.meta.homeBlocks.indexOf(id)>=0;
  if(wasOn) state.meta.homeBlocks.splice(state.meta.homeBlocks.indexOf(id),1);
  else state.meta.homeBlocks.push(id);
  save(); renderHome();
  // 添加 ynboard 时主动触发入场动画（#2.2）
  if(!wasOn && id==="ynboard"){ try{ setTimeout(function(){ initYnBoard(); },0); }catch(e){} }
  // 若当前在编辑模式，需同步拖拽手柄；renderHome 已重绘，刷新拖拽绑定
  try{ if(document.body.classList.contains("home-edit")){ setTimeout(function(){enableHomeBlockDrag();},0); } }catch(e){}
}
function refreshHomeCustom(){
  if($("#modalBox")&&$("#modalMask")&&$("#modalMask").classList.contains("show")&&$("#modalBox").innerHTML.indexOf("首页自定义")>=0){ showHomeCustom(); }
}
function toggleMore(){
  const blk=document.querySelector(".more-block");
  if(!blk)return;
  blk.classList.toggle("open");
}
function renderFab(){
  // 全局快速操作 action sheet（底部升起），在 boot 注入一次，任何视图均可用
  let box=document.getElementById("fabWrap");
  if(!box){box=document.createElement("div");box.id="fabWrap";document.body.appendChild(box);}
  box.innerHTML=
    '<div class="qs-mask" id="quickSheetMask" onclick="closeQuickSheet()"></div>'+
    '<div class="qs-sheet" id="quickSheet">'+
      '<div class="qs-grip"></div>'+
      '<div class="qs-title">快速操作</div>'+
      '<div class="qs-row">'+
        '<button class="qs-btn" onclick="quickSheetGo(\'quickCheck\')"><span class="qs-ic"><svg class="svg-ic" viewBox="0 0 24 24"><path d="M5 13l4 4 10-10"/></svg></span><span class="qs-lb">快速打卡</span></button>'+
        '<button class="qs-btn" onclick="quickSheetGo(\'quickFeed\')"><span class="qs-ic"><svg class="svg-ic" viewBox="0 0 24 24"><path d="M4 13l3 0 2 3h6l2-3 3 0v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 13V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v7"/></svg></span><span class="qs-lb">快速投喂</span></button>'+
        '<button class="qs-btn" onclick="quickSheetGo(\'quickMoney\')"><span class="qs-ic"><svg class="svg-ic" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="13" r="1.5"/></svg></span><span class="qs-lb">快速记账</span></button>'+
      '</div>'+
    '</div>'+
    '<button class="to-top" id="toTop" onclick="scrollActiveTop()" aria-label="回到顶部" title="回到顶部">↑</button>'+
    '<button class="fab-refresh" id="refreshFab" onclick="refreshHome()" aria-label="刷新" title="刷新当前页面"><svg class="svg-ic" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg></button>'+
    '<button class="fab-ai" id="aiFab" onclick="openAIModal()" aria-label="问 AI" title="问 AI">'+icon('ai',22)+'</button>'+
    '<button class="fab-feed" id="feedFab" onclick="quickFeedModal()" aria-label="快速投喂" title="快速投喂"><span class="ff-ic">'+icon('download',14)+'</span><span class="ff-tx">快速投喂</span></button>';
}
function openAIModal(){
  const hasKey=(function(){const a=state.meta.apiCfg||{};return a.key||(a.keys&&a.keys[a.provider]&&a.keys[a.provider].length);})();
  if(!hasKey){
    let html='<h3>💬 问 AI</h3><div class="mini-note">还没配置 API Key。去「美化设置 🎨 → AI 提炼 API 配置」填一个（内置多家免费额度服务商 🆓），就能用 AI 帮你规划任务、答疑、给建议啦。</div>';
    html+='<div class="modal-ops"><button class="cancel" onclick="closeModal()">知道了</button><button class="save" onclick="closeModal();showDecor()">去配置'+icon("key",14)+'</button></div>';
    $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");return;
  }
  const tmpls=[
    "帮我安排今晚 2 小时的学习计划（六级+专业课）",
    "用「鞠式心法」风格给我一句今天的开场鼓励",
    "我皮肤偏干、预算有限，给一套平价护肤步骤",
    "把这段学习笔记提炼成 3 个记忆锚点",
    "用今天待办帮我排一个番茄钟顺序"
  ];
  let html='<h3>💬 问 AI 助手</h3>'+
    '<div class="mini-note">基于你配置的 AI 服务，回答简洁可执行。点击下面的模板可一键填入，也可自己写。</div>'+
    '<div class="modal-ops" style="margin-bottom:10px"><button class="feed-play" onclick="aiDailyPlan()">'+icon('sparkle',13)+' 一键生成今日规划</button></div>'+
    '<div class="ai-tmpl">'+tmpls.map((t,i)=>'<button class="ai-tmpl-btn" onclick="aiFillTmpl('+i+')">'+esc(t)+'</button>').join('')+'</div>'+
    '<div class="field"><label>你的问题</label><textarea id="aiQ" rows="3" placeholder="例如：帮我安排今晚 2 小时的学习计划（六级+专业课）" style="width:100%;padding:10px;border:1px solid var(--glass-border);border-radius:var(--radius-m);background:var(--glass-flat);color:var(--text);font-family:inherit;resize:vertical"></textarea></div>'+
    '<div class="mini-note" id="aiTipBox" style="color:var(--accent-ink);font-weight:600;display:none"></div>'+
    '<div class="ai-ans" id="aiAns" style="display:none"></div>'+
    '<div class="modal-ops"><button class="cancel" onclick="closeModal()">关闭</button><button class="save" onclick="sendAIMsg()">发送 ✈️</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
  window._aiTmpls=tmpls;
  setTimeout(function(){const t=$("#aiQ");if(t)t.focus();},120);
}
function aiFillTmpl(i){
  const t=$("#aiQ"); if(!t)return;
  t.value=(window._aiTmpls&&window._aiTmpls[i])||"";
  t.focus(); t.dispatchEvent(new Event("input"));
}
// 根据真实数据拼出「今日规划」提示词，再交给 AI
function buildDailyPlanPrompt(){
  try{
    const t=todayStr();
    const lines=[];
    // 待办
    const sch=(state.modules.schedule&&state.modules.schedule.panels.daily)||[];
    const open=sch.filter(function(it){return !it.done;}).map(function(it){return (it.time?it.time+" ":"")+(it.task||it.text||"");});
    // 考试倒计时
    const exams=(state.modules.alert&&state.modules.alert.panels.exams)||[];
    const soon=exams.map(function(e){const d=daysToExam(e.name,e.date);return e.name+"（还剩 "+(d===null?"已过期":d+" 天")+"）";});
    // 学习时长
    const study=dayStudyMin(t);
    const goal=(state.modules.cet&&state.modules.cet.focusGoal)||(state.modules.gongkao&&state.modules.gongkao.focusGoal)||25;
    // 知识卡待复习
    const review=(allCards()).filter(function(c){return c.status!=="mastered"&&reviewDaysLeft(c)<=0;});
    lines.push("【今天是 "+t+"】");
    if(open.length)lines.push("我的待办："+open.slice(0,8).join("；"));
    if(soon.length)lines.push("临近考试："+soon.join("；"));
    lines.push("今日已学 "+study+" 分钟（目标 "+goal+" 分钟）。");
    if(review.length)lines.push("有 "+review.length+" 张知识卡待复习。");
    lines.push("请基于以上，给我一份今天可执行的时间安排（含番茄钟节奏），并挑 1 件最重要的事优先做。用中文、分点、简洁。");
    const prompt=lines.join("\n");
    const el=$("#aiQ"); if(el){el.value=prompt;el.focus();el.dispatchEvent(new Event("input"));}
    return prompt;
  }catch(e){ return "请帮我安排今天的学习与变美计划，分点、可执行。"; }
}
function aiDailyPlan(){ buildDailyPlanPrompt(); toast("📋 已按今日真实数据生成规划提示，点发送问 AI"); }
function sendAIMsg(){
  const q=$("#aiQ"); if(!q||!q.value.trim()){toast("⚠️ 先写点什么～");return;}
  const tip=$("#aiTipBox"); const ans=$("#aiAns");
  if(tip){tip.style.display="";tip.textContent="⏳ AI 思考中…";}
  if(ans)ans.style.display="none";
  aiChat(q.value.trim()).then(function(txt){
    if(tip)tip.style.display="none";
    if(ans){ans.style.display="";ans.innerHTML='<div style="white-space:pre-wrap;line-height:1.7">'+esc(txt)+'</div>';}
  }).catch(function(e){
    if(tip){tip.style.display="";tip.textContent="⚠️ 调用失败："+(e&&e.message||e)+"（可能 Key 无效或网络受限，已自动降级/记录日志）";}
  });
}
function scrollActiveTop(){
  try{
    const av=document.querySelector(".view.active");
    if(av)av.scrollTo({top:0,behavior:window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  }catch(e){ const av=document.querySelector(".view.active"); if(av)av.scrollTop=0; }
}

/* ============ 通用弹窗封装 ============ */
function openModalBox(html){const box=$("#modalBox");if(!box)return;box.innerHTML=html;$("#modalMask").classList.add("show");}

/* ============ 专注番茄钟（Focus） ============ */
let _focusTimer=null,_focusRemain=0,_focusTotal=0,_focusRunning=false,_focusEndAt=0;
function focusTodayMin(){return (state.meta.focusLog&&state.meta.focusLog[todayStr()])||0;}
function addFocusMin(min){const t=todayStr();state.meta.focusLog=state.meta.focusLog||{};state.meta.focusLog[t]=(state.meta.focusLog[t]||0)+min;save();}
function fmtMMSS(s){s=Math.max(0,Math.round(s));const m=Math.floor(s/60),ss=s%60;return String(m).padStart(2,"0")+":"+String(ss).padStart(2,"0");}
function openFocus(){
  _focusTotal=25*60;_focusRemain=_focusTotal;_focusRunning=false;
  const html='<div class="focus-modal"><h3 style="align-self:flex-start;margin-bottom:4px">🍅 专注番茄钟</h3>'+
    '<div class="focus-bigring"><svg width="220" height="220" viewBox="0 0 220 220">'+
      '<circle cx="110" cy="110" r="96" fill="none" stroke="var(--glass-border)" stroke-width="12"/>'+
      '<circle id="focusArc" cx="110" cy="110" r="96" fill="none" stroke="url(#fg2)" stroke-width="12" stroke-linecap="round" stroke-dasharray="'+(2*Math.PI*96).toFixed(1)+'" stroke-dashoffset="0"/>'+
      '<defs><linearGradient id="fg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="var(--primary)"/><stop offset="100%" stop-color="var(--accent)"/></linearGradient></defs>'+
    '</svg><div class="fb-inner"><div class="fb-time" id="focusTime">25:00</div><div class="fb-label" id="focusLabel">准备开始</div></div></div>'+
    '<div class="focus-presets"><button class="active" onclick="setFocusDur(25,this)">25 分</button><button onclick="setFocusDur(45,this)">45 分</button><button onclick="setFocusDur(5,this)">5 分</button></div>'+
    '<div class="focus-ctrl"><button class="fc-start" id="focusStart" onclick="toggleFocus()">开始</button><button class="fc-reset" onclick="resetFocus()">重置</button></div>'+
    '<div class="focus-stat" id="focusStat">今日已专注 '+focusTodayMin()+' 分钟</div></div>';
  openModalBox(html);
  window._focusArc=$("#focusArc");updateFocusArc();
}
function setFocusDur(min,btn){_focusTotal=min*60;_focusRemain=_focusTotal;if(btn){document.querySelectorAll(".focus-presets button").forEach(b=>b.classList.remove("active"));btn.classList.add("active");}updateFocusTime();updateFocusArc();}
function updateFocusTime(){const t=$("#focusTime");if(t)t.textContent=fmtMMSS(_focusRemain);}
function updateFocusArc(){if(!window._focusArc)return;const c=2*Math.PI*96;const prog=_focusTotal?(_focusTotal-_focusRemain)/_focusTotal:0;window._focusArc.style.strokeDashoffset=(c*(1-prog)).toFixed(1);}
function toggleFocus(){ if(_focusRunning){focusPause();return;} focusStart(); }
function focusStart(){
  _focusRunning=true;const b=$("#focusStart");if(b)b.textContent="暂停";const l=$("#focusLabel");if(l)l.textContent="专注中…";
  if(window._focusArc)window._focusArc.style.transition="stroke-dashoffset .3s linear";
  _focusEndAt=Date.now()+_focusRemain*1000;
  _focusTimer=setInterval(function(){
    _focusRemain=Math.max(0,Math.round((_focusEndAt-Date.now())/1000));
    updateFocusTime();updateFocusArc();
    if(_focusRemain<=0)finishFocus();
  },250);
}
function focusPause(){_focusRunning=false;clearInterval(_focusTimer);const b=$("#focusStart");if(b)b.textContent="继续";const l=$("#focusLabel");if(l)l.textContent="已暂停";}
function resetFocus(){_focusRunning=false;clearInterval(_focusTimer);_focusRemain=_focusTotal;if(window._focusArc)window._focusArc.style.transition="none";updateFocusTime();updateFocusArc();const b=$("#focusStart");if(b)b.textContent="开始";const l=$("#focusLabel");if(l)l.textContent="准备开始";}
function finishFocus(){
  _focusRunning=false;clearInterval(_focusTimer);
  const done=Math.round(_focusTotal/60);addFocusMin(done);
  const l=$("#focusLabel");if(l)l.textContent="完成 🎉";const b=$("#focusStart");if(b)b.textContent="再来一次";
  const st=$("#focusStat");if(st)st.textContent="今日已专注 "+focusTodayMin()+" 分钟";
  haptic&&haptic(30);toast("🍅 专注完成 "+done+" 分钟，已记录");
  if(currentView==="home")setTimeout(function(){try{renderHome();}catch(e){}},300);
}

/* ============ 呼吸放松（Breathe） ============ */
let _breatheTimer=null,_breatheOn=false,_breatheCount=0,_breathePhase=0;
function openBreathe(){
  const html='<div class="breathe-modal"><h3 style="align-self:flex-start;margin-bottom:2px">🌬 呼吸放松</h3>'+
    '<div class="breathe-orb" id="breatheOrb"></div>'+
    '<div class="breathe-tip" id="breatheTip">准备好了吗</div>'+
    '<div class="breathe-count" id="breatheCount">已完成 0 次呼吸</div>'+
    '<div class="breathe-ctrl"><button class="bc-toggle" id="breatheToggle" onclick="toggleBreathe()">开始</button><button class="bc-close" onclick="closeBreathe()">结束</button></div></div>';
  openModalBox(html);
}
function toggleBreathe(){ if(_breatheOn){pauseBreathe();return;} startBreathe(); }
function startBreathe(){
  _breatheOn=true;const t=$("#breatheToggle");if(t)t.textContent="暂停";const tip=$("#breatheTip");if(tip)tip.textContent="吸气…";
  const orb=$("#breatheOrb");if(orb)orb.classList.add("inhale");_breathePhase=0;
  _breatheTimer=setInterval(function(){
    const orb=$("#breatheOrb"),tip=$("#breatheTip");
    _breathePhase=(_breathePhase+1)%2;
    if(_breathePhase===0){ if(orb){orb.classList.remove("exhale");orb.classList.add("inhale");} if(tip)tip.textContent="吸气…"; _breatheCount++; const c=$("#breatheCount"); if(c)c.textContent="已完成 "+_breatheCount+" 次呼吸"; }
    else { if(orb){orb.classList.remove("inhale");orb.classList.add("exhale");} if(tip)tip.textContent="呼气…"; }
  },4000);
}
function pauseBreathe(){_breatheOn=false;clearInterval(_breatheTimer);const t=$("#breatheToggle");if(t)t.textContent="继续";const tip=$("#breatheTip");if(tip)tip.textContent="已暂停";}
function closeBreathe(){_breatheOn=false;clearInterval(_breatheTimer);const orb=$("#breatheOrb");if(orb)orb.classList.remove("inhale","exhale");closeModal();}

/* ============ 灵感册（Whisper Book） ============ */
const WHISPER_POOL=[
  {text:"你不需要很厉害才能开始，但你需要开始，才能变得很厉害。",src:"行动派"},
  {text:"今天也要好好吃饭、好好睡觉、好好爱自己。",src:"生活指南"},
  {text:"慢一点也没关系，只要在往前走。",src:"治愈系"},
  {text:"把日子过成自己喜欢的样子，就是最大的成功。",src:"生活家"},
  {text:"你现在的努力，是未来的自己在替你鼓掌。",src:"成长录"},
  {text:"允许自己偶尔摆烂，但别忘记重新出发。",src:"自愈力"},
  {text:"美不是完美的容貌，是由内而外的从容。",src:"变美日记"},
  {text:"每天进步一点点，时间会给你答案。",src:"长期主义"},
  {text:"照顾好自己，是这辈子最重要的功课。",src:"自爱手册"},
  {text:"愿你眼里有光，心中有爱，脚下有路。",src:"温柔寄语"}
];
function renderWhisperWall(){
  const list=(state.meta.whispers||[]);
  let h='<div class="whisper-wall">';
  if(!list.length){h+='<div class="mini-note">还没有收藏的灵感。写下一句，或收一句随机语录吧 ✨</div>';}
  list.slice(0,8).forEach(function(w){
    h+='<div class="whisper-card"><span class="wc-stamp"></span><div class="wc-text">'+esc(w.text)+'</div>'+(w.src?('<div class="wc-src">— '+esc(w.src)+'</div>'):'')+'<span class="wc-del" onclick="delWhisper(\''+w.id+'\')">✕</span></div>';
  });
  h+='<div class="whisper-add"><input id="whisperInput" placeholder="写下一句给自己的话…" onkeydown="if(event.key===\'Enter\')addWhisper()"/><button onclick="addWhisper()">收藏</button></div>';
  h+='<button class="whisper-rand" onclick="whisperRandom()">'+icon("dice",14)+' 收一句随机语录</button>';
  h+='</div>';
  return h;
}
function addWhisper(){const el=$("#whisperInput");const v=el?el.value.trim():"";if(!v){toast("⚠️ 先写点什么～");return;}state.meta.whispers=state.meta.whispers||[];state.meta.whispers.unshift({id:uid(),text:v,src:"我的",ts:Date.now()});save();renderHome();hapticPattern("tap");toast("✨ 已收进灵感册");}
function delWhisper(id){
  const arr=state.meta.whispers||[];
  const idx=arr.findIndex(function(w){return w.id===id;});
  if(idx<0)return;
  const it=arr[idx];
  // 语录是轻内容，不再拦一道 confirm，改为删后可撤销
  undoableDelete("一句语录",
    function(){ state.meta.whispers=arr.filter(function(w){return w.id!==id;}); save(); renderHome(); return true; },
    function(){ const a=state.meta.whispers||[];
                a.splice(Math.min(idx,a.length),0,it); state.meta.whispers=a; save(); renderHome(); });
}
function whisperRandom(){
  const w=WHISPER_POOL[Math.floor(Math.random()*WHISPER_POOL.length)];
  state.meta.whispers=state.meta.whispers||[];
  state.meta.whispers.unshift({id:uid(),text:w.text,src:w.src,ts:Date.now()});
  save();
  // #17 局部更新：仅插入一条语录，不重建整个首页
  const box=document.getElementById("whisperBox");
  if(box){
    const it=document.createElement("div");
    it.className="whisper-item stagger-item";
    it.style.setProperty("--i",0);
    it.innerHTML='<span class="w-t">'+esc(w.text)+'</span>'+(w.src?'<span class="w-s">— '+esc(w.src)+'</span>':'');
    box.insertBefore(it,box.firstChild);
    if(box.children.length>30)box.removeChild(box.lastChild);
  } else {
    renderHome();
  }
  toast("🎲 已收一句语录");
}

function toggleQuickSheet(){
  const s=document.getElementById("quickSheet");const m=document.getElementById("quickSheetMask");
  if(!s)return;
  const open=s.classList.contains("show");
  if(open){closeQuickSheet();}else{haptic(10);s.classList.add("show");if(m)m.classList.add("show");}
}
function closeQuickSheet(){
  const s=document.getElementById("quickSheet");const m=document.getElementById("quickSheetMask");
  if(s)s.classList.remove("show");if(m)m.classList.remove("show");
}
function quickSheetGo(act){
  closeQuickSheet();
  if(act==="quickCheck"){quickCheckModal();}
  else if(act==="quickFeed"){quickFeedModal();}
  else if(act==="quickMoney"){openMoneyForm("money","exp");}
}
/* 全局速记浮层：随手记一句话/拍照，沉淀到独立速记库 */
function openQuickNote(){
  const cats=[["灵感","💡"],["待办","✅"],["日记","📔"],["其他","📁"]];
  let html='<h3>📝 随手速记</h3>'+
    '<div class="mini-note">想到什么立刻记，先收下再慢慢消化。可自动归类，也能一键丢进灵感收藏。</div>'+
    '<div class="qn-cats">'+
      cats.map(function(c,i){return '<button class="qn-cat'+(i===0?' on':'')+'" data-cat="'+c[0]+'" onclick="qnPickCat(this)">'+c[1]+' '+c[0]+'</button>';}).join('')+
    '</div>'+
    '<textarea id="qnText" class="qn-input" placeholder="此刻的想法 / 待办 / 灵感…" style="width:100%;min-height:120px;font-family:inherit;font-size:14px;padding:12px;border-radius:14px;border:1px solid var(--glass-border);background:var(--glass-flat);color:var(--text);resize:vertical"></textarea>'+
    voiceBtnHtml("qnText")+
    '<div class="modal-ops"><button class="cancel" onclick="closeModal()">取消</button><button class="save" onclick="saveQuickNote()">保存'+icon("sparkle",14)+'</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
  setTimeout(function(){const t=$("#qnText");if(t)t.focus();},80);
}
function qnPickCat(btn){document.querySelectorAll(".qn-cat").forEach(function(b){b.classList.remove("on");});btn.classList.add("on");}
function saveQuickNote(){
  const t=$("#qnText"); if(!t)return;
  const text=t.value.trim(); if(!text){toast("⚠️ 先写点什么～");return;}
  const cat=(document.querySelector(".qn-cat.on")||{}).getAttribute?document.querySelector(".qn-cat.on").getAttribute("data-cat"):"其他";
  state.meta.quickNotes=state.meta.quickNotes||[];
  state.meta.quickNotes.unshift({id:uid(),text:text,cat:cat||"其他",date:todayStr(),ts:Date.now()});
  save();
  closeModal();
  toast("📝 已速记「"+(cat||"其他")+"」");
}
function renderQuickNotes(){
  const notes=(state.meta.quickNotes||[]);
  let html='<h3>📝 速记库</h3><div class="mini-note">随手记下的灵感与待办，点击可删除。</div>';
  if(!notes.length){ html+='<div class="empty-state"><div class="es-illu">'+emptyIllu('note')+'</div><div class="es-tip">还没有速记。点底部快速操作里的「📝 速记」随手记一条吧。</div></div>'; }
  else{
    html+='<div class="qn-list">';
    notes.forEach(function(n){
      html+='<div class="qn-item" onclick="delQuickNote(\''+n.id+'\')"><span class="qn-cat-tag">'+esc(n.cat||"其他")+'</span><span class="qn-tx">'+esc(n.text)+'</span><span class="qn-dt">'+esc(n.date)+'</span><span class="qn-x">✕</span></div>';
    });
    html+='</div>';
  }
  html+='<div class="modal-ops"><button class="cancel" onclick="closeModal()">关闭</button><button class="save" onclick="openQuickNote()">+ 记一条</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
}
function delQuickNote(id){
  const arr=state.meta.quickNotes||[];
  const idx=arr.findIndex(function(n){return n.id===id;});
  if(idx<0)return;
  const it=arr[idx];
  // 便签是轻内容，不再拦一道 confirm，改为删后可撤销
  undoableDelete("一条便签",
    function(){ state.meta.quickNotes=arr.filter(function(n){return n.id!==id;}); save(); renderQuickNotes(); return true; },
    function(){ const a=state.meta.quickNotes||[];
                a.splice(Math.min(idx,a.length),0,it); state.meta.quickNotes=a; save(); renderQuickNotes(); });
}
/* iOS 全局搜索：搜索模块、知识卡片、投喂内容 */
function openGlobalSearch(){
  haptic(10);
  let html='<div class="gs-box"><div class="gs-bar"><svg class="svg-ic" viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>'+
    '<input id="gsInput" placeholder="搜索栏目、知识、投喂…（↑↓ 选择，回车直达，Esc 关闭）" oninput="gsRun(this.value)" onkeydown="gsKey(event)" autofocus /><button class="gs-cancel" onclick="closeModal()">取消</button></div>'+
    '<div class="gs-res" id="gsRes"></div></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
  setTimeout(function(){
    const i=$("#gsInput");
    if(i){
      i.value="";                 // 清空上一次残留的关键字，避免「打开就是旧结果」
      gsActiveIndex=-1;
      i.focus();
      try{ i.scrollIntoView({block:"center",behavior:"smooth"}); }catch(e){}
      // 阻止输入过程中的按键冒泡到全局快捷键（尤其 "/" 本身会再次触发搜索）
      i.addEventListener("keydown",function(e){ if(e.key==="/") e.stopPropagation(); });
    }
    gsRun("");
  },80);
}
var gsActiveIndex=-1;
function gsKey(e){
  const box=$("#gsRes");if(!box)return;
  const items=box.querySelectorAll(".gs-item");if(!items.length)return;
  if(e.key==="ArrowDown"){gsActiveIndex=Math.min(items.length-1,gsActiveIndex+1);e.preventDefault();gsPaint();}
  else if(e.key==="ArrowUp"){gsActiveIndex=Math.max(0,gsActiveIndex-1);e.preventDefault();gsPaint();}
  else if(e.key==="Enter"){ if(gsActiveIndex>=0&&items[gsActiveIndex])items[gsActiveIndex].click(); else if(items[0])items[0].click(); }
  else if(e.key==="Escape"){ closeModal(); }
}
function gsPaint(){
  const box=$("#gsRes");if(!box)return;
  const items=box.querySelectorAll(".gs-item");
  items.forEach(function(it,i){it.classList.toggle("active",i===gsActiveIndex);});
  if(gsActiveIndex>=0&&items[gsActiveIndex]){ try{items[gsActiveIndex].scrollIntoView({block:"nearest"});}catch(e){} }
}
function gsRun(q){
  q=(q||"").trim().toLowerCase();const box=$("#gsRes");if(!box)return;
  gsActiveIndex=-1;
  const res=[];
  // 模块
  for(const id in MODULE_DEFS){const t=MODULE_DEFS[id].title;if(!q||t.toLowerCase().indexOf(q)>=0)res.push({type:"栏目",label:t,go:"showModule('"+id+"')"});}
  // 知识卡片
  try{ (state.meta.knowledge.cards||[]).forEach(function(c){const t=(c.title||"");if(!q||t.toLowerCase().indexOf(q)>=0)res.push({type:"知识",label:t.slice(0,30),go:"showKnowledge()"});}); }catch(e){}
  // 投喂
  try{ for(const id in state.modules){ const arr=state.modules[id].panels; if(arr)for(const k in arr){const a=arr[k];if(a&&a.items){(a.items).forEach(function(it){const t=typeof it==="string"?it:(it.text||it.title||"");if(!q||t.toLowerCase().indexOf(q)>=0)res.push({type:"投喂",label:t.slice(0,30),go:"showModule('"+id+"')"});});}} } }catch(e){}
  if(!q){ box.innerHTML='<div class="gs-hint">输入关键词，搜索你的栏目、知识与投喂</div>'; return; }
  if(!res.length){ box.innerHTML='<div class="gs-hint">没有匹配「'+esc(q)+'」的内容</div>'; return; }
  box.innerHTML=res.slice(0,30).map(function(r){return '<div class="gs-item" onclick="closeModal();'+r.go+'"><span class="gs-tag">'+esc(r.type)+'</span><span class="gs-label">'+esc(r.label||"（空）")+'</span></div>';}).join("");
}
/* iOS 下拉菜单（更多操作）：我的（账户）+ 快捷 + 全栏目分组列表 */
function qaBtn(label,ic,go,mini){
  return '<button class="'+(mini?'qa-mini':'qa-btn')+'" onclick="closeQuickActions();'+go+'"><span class="qa-ic">'+ic+'</span><span class="qa-lb">'+label+'</span></button>';
}
function qaSec(title,arr,mini){
  return '<div class="qa-sec"><div class="qa-sec-t">'+title+'</div><div class="qa-grid'+(mini?' mini':'')+'">'+
    arr.map(function(x){return qaBtn(x[0],x[1],x[2],mini);}).join('')+'</div></div>';
}
function toggleQuickActions(){
  haptic(10);
  if($("#quickActionsSheet")){ closeQuickActions(); return; }
  const IC={
    check:'<svg class="svg-ic" viewBox="0 0 24 24"><path d="M5 13l4 4 10-10"/></svg>',
    feed:'<svg class="svg-ic" viewBox="0 0 24 24"><path d="M4 13l3 0 2 3h6l2-3 3 0v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 13V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v7"/></svg>',
    money:'<svg class="svg-ic" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="13" r="1.5"/></svg>'
  };
  const sheet=document.createElement("div");sheet.id="quickActionsSheet";
  let h='<div class="qs-mask" id="quickActionsMask" onclick="closeQuickActions()"></div>'+
    '<div class="qs-sheet" id="quickActionsInner"><div class="qs-grip"></div>'+
    '<div class="qa-head"><span class="qa-title">'+icon('bolt',16)+' 快捷操作</span><button class="qa-close" onclick="closeQuickActions()" aria-label="关闭">'+icon("close",14)+'</button></div>'+
    qaSec('常用',[
      ['快速打卡',IC.check,"quickSheetGo('quickCheck')"],
      ['快速投喂',IC.feed,"quickSheetGo('quickFeed')"],
      ['快速记账',IC.money,"quickSheetGo('quickMoney')"],
      ['记心情',icon('mood'),"showModule('mood')"],
      ['随手速记',icon('note'),"openQuickNote()"],
      ['速记库',icon('books'),"renderQuickNotes()"]
    ])+
    qaSec('专注 · 放松',[
      ['专注计时',icon('clock'),"openFocus()"],
      ['呼吸放松',icon('wind'),"openBreathe()"]
    ])+
    qaSec('美化 · 风格',[
      ['随机美化',icon('sparkle'),"randomStyle()"],
      ['撤销风格',icon('refresh'),"undoStyle()"],
      ['自动明暗',icon('contrast'),"setThemeMode('auto')"]
    ])+
    qaSec('指定风格',[
      ['韩系','🇰🇷',"randomStyle('kr')"],
      ['国风','🏮',"randomStyle('cn')"],
      ['莫兰迪','🤍',"randomStyle('mo')"],
      ['奶油','🍦',"randomStyle('cy')"],
      ['霓虹','🌃',"randomStyle('ne')"],
      ['森系','🌿',"randomStyle('fo')"],
      ['复古','📻',"randomStyle('vf')"]
    ],true)+
    qaSec('周期报告',[
      ['本周周报',icon('annual'),"showWeeklyReport()"],
      ['本月月报',icon('calendar'),"showMonthlyReport()"]
    ])+
    qaSec('资料 · 备份',[
      ['导入资料',icon('download',14),"showImportMaterial()"],
      ['知识研习',icon('book2',14),"showModule('studyclub')"],
      ['知识库',icon('book',14),"showModule('knowledge')"],
      ['导出备份',icon('download',14),"exportFullBackup()"],
      ['导入备份',icon('refresh',14),"importFullBackup()"],
      ['恢复备份',icon('refresh',14),"restoreBackup()"],
      ['撤销上次导入',icon('refresh',14),"undoLastImport()"],
      ['回滚迁移前',icon('refresh',14),"restorePreMigration()"],
      ['迁移历史',icon('chart',14),"showMigrationHistory()"],
      ['报告存档',icon('chart',14),"showReportArchive()"],
      ['操作历史',icon('refresh',14),"showUndoHistory()"],
      ['一键修复',icon('wrench',14),"closeQuickActions();repairEverything()"]
    ])+
    '<button class="more-menu-cancel" style="color:#c66" onclick="closeQuickActions();resetData()">清空并重置数据</button>'+
    '<button class="more-menu-cancel" onclick="closeQuickActions()">取消</button>'+
    '</div>';
  sheet.innerHTML=h;
  document.body.appendChild(sheet);
  requestAnimationFrame(function(){ sheet.querySelector(".qs-sheet").classList.add("show"); sheet.querySelector(".qs-mask").classList.add("show"); });
}
function closeQuickActions(){const s=document.getElementById("quickActionsSheet");if(s)s.remove();}
/* 兼容旧调用点（侧边栏遗留） */
function closeMoreMenu(){ closeQuickActions(); }
function toggleMoreMenu(){ toggleQuickActions(); }
/* 修改昵称（更多 → 我的） */
function editNickname(){
  const cur=state.meta.nickname||"";
  const v=prompt("给自己起个昵称吧～",cur);
  if(v===null)return;
  state.meta.nickname=v.trim().slice(0,12);save();
  if(currentView==="profile"){ try{ renderProfile($("#view-profile")); }catch(e){} }
  else { try{renderHome();}catch(e){} }
  toast("昵称已更新："+esc(state.meta.nickname));
}
/* 头像设置：emoji / 图片链接 / 本地图片三种方式，点击名片卡头像触发 */
function editAvatar(){
  // 弹出一个轻量选择：本地图片 / 链接 / emoji
  const html='<h3>'+icon('user',16)+' 设置头像</h3>'+
    '<div class="field"><label>方式一 · 本地图片</label><input type="file" id="avatarFile" accept="image/*"></div>'+
    '<div class="field"><label>方式二 · 图片链接</label><input id="avatarLink" placeholder="粘贴 http(s) 图片链接" value="'+esc(/^https?:/.test(state.meta.avatar||"")?state.meta.avatar:'')+'"></div>'+
    '<div class="field"><label>方式三 · Emoji</label><input id="avatarEmoji" placeholder="如 🌸（最多 2 个）" value="'+esc(/\p{Emoji}/u.test(state.meta.avatar||"")?state.meta.avatar:'')+'"></div>'+
    '<div class="modal-ops"><button class="cancel" onclick="closeModal()">取消</button><button class="save" onclick="saveAvatar()">保存</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
  const f=$("#avatarFile");
  if(f)f.onchange=function(){ const file=f.files[0]; if(!file)return; compressImage(file,function(data,err){ if(err){toast(err);return;} const ip=$("#avatarLink"); if(ip)ip.value=data; },{fullRes:true,maxBytes:8*1024*1024}); };
}
/* 保存头像：优先本地/链接图片，其次 emoji，空值清除 */
function saveAvatar(){
  const link=($("#avatarLink")||{}).value||"";
  const emoji=($("#avatarEmoji")||{}).value||"";
  const t=link.trim();
  if(t){
    if(/^https?:|^data:/.test(t)){ state.meta.avatar=t; }
    else { toast("⚠️ 图片链接需以 http(s): 或 data: 开头"); return; }
  } else if(emoji.trim()){
    if(emoji.trim().length<=4 && /\p{Emoji}/u.test(emoji.trim())){ state.meta.avatar=emoji.trim(); }
    else { toast("⚠️ Emoji 模式只支持 1–2 个表情符号"); return; }
  } else {
    state.meta.avatar="";
  }
  save();closeModal();
  try{ showProfile(); }catch(e){}
  toast("头像已更新");
}
