/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 15/18
   文件：js/15-daily.js
   来源：原 index.html 第 27616–28066 行
   内容：启动流程 + 早安播报 / 每日复盘 / 连续打卡 / 昵称 / AI 总结 / 空闲调度
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ============ 启动 ============ */
function tick(){const d=new Date();const t=$("#clockT"),dd=$("#clockD");if(t)t.textContent=d.toTimeString().slice(0,8);if(dd)dd.textContent=d.toLocaleDateString("zh-CN",{month:"long",day:"numeric",weekday:"short"});}

/* ===== 体验优化：早安播报 / 每日复盘 / 连续打卡 / 昵称 / AI总结 ===== */
function daysToExam(name,date){const left=daysBetween(todayStr(),date);return left>=0?left:null;}
function avgStudyLast7(){
  const t=todayStr();let sum=0,cnt=0;
  for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);const ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");const m=dayStudyMin(ds);if(m>0){sum+=m;cnt++;}}
  return cnt?Math.round(sum/cnt):0;
}
function dailyGoalSuggestion(){
  const avg=avgStudyLast7();
  const target=Math.max(20,Math.round(avg*1.1/5)*5); // 比均值略高 10%，5 的倍数
  let undone=0;
  ["cet","gongkao","refinement","posture","schedule"].forEach(id=>{const p=MODULE_DEFS[id].panels.find(x=>x.type==="checklist");if(p){undone+=(state.modules[id].panels[p.key]||[]).filter(it=>!it.done).length;}});
  const cards=(allCards()).filter(c=>c.status!=="mastered").length;
  return {study:target,undone:undone,cards:cards};
}
function morningTasks(){
  // 根据今日/近期推荐：未完成打卡项 + 即将考试提醒
  const tasks=[];
  const exams=EXAM_CONFIG.filter(function(e){return e.name==="四级"||e.name==="六级"||e.name==="国考";}).map(function(e){return {n:e.name,d:e.date};});
  exams.forEach(e=>{const l=daysToExam(e.n,e.d);if(l!=null&&l<=30)tasks.push("距离"+e.n+"还有 "+l+" 天，今天至少完成 1 项备考任务");});
  // 各栏目未完成任务抽样
  let undone=[];
  ["cet","gongkao","refinement","posture"].forEach(id=>{const p=MODULE_DEFS[id].panels.find(x=>x.type==="checklist");if(!p)return;const arr=state.modules[id].panels[p.key]||[];arr.filter(it=>!it.done).slice(0,2).forEach(it=>undone.push((p.fields||[]).map(f=>it[f.name]).filter(Boolean).join(" · ")));});
  undone.slice(0,3).forEach(t=>tasks.push("待完成："+t));
  if(!tasks.length)tasks.push("今天也像笑笑一样闪闪发光 ✨");
  return tasks.slice(0,4);
}
function showMorning(){
  const t=todayStr();if(state.meta.morningShown&&state.meta.morningShown[t])return;
  state.meta.morningShown=state.meta.morningShown||{};state.meta.morningShown[t]=true;save();
  const d=new Date();const wk=["周日","周一","周二","周三","周四","周五","周六"][d.getDay()];
  const tasks=morningTasks();const sg=dailyGoalSuggestion();
  let html='<div class="greet-card"><div class="gd">'+d.toLocaleDateString("zh-CN")+' · '+wk+'</div>'+
    '<div class="gbig">'+(state.meta.nickname?("早安，"+esc(state.meta.nickname)+" ☀️"):"早安，鞠宝 ☀️")+'</div>'+
    '<div class="mini-note">今天也要像笑笑一样闪闪发光</div>'+
    '<div style="text-align:left;margin-top:10px;font-size:13px;font-weight:600;color:var(--ink)">🌟 今日推荐任务</div>'+
    '<ul class="gtasks">'+tasks.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
    '<div class="goal-suggest"><div class="gs-title">🎯 今日目标建议（基于近 7 天习惯）</div>'+
      '<div class="gs-row">学习 <b>'+sg.study+'</b> 分钟 · 清 <b>'+sg.undone+'</b> 项待办 · 消化 <b>'+sg.cards+'</b> 张知识卡</div>'+
      '<button class="feed-play" style="margin-top:6px" onclick="adoptDailyGoal('+sg.study+')">'+icon("checkCircle",14)+' 采纳为目标</button></div>'+
    '<div class="modal-ops"><button class="save" onclick="closeModal();showDailyReplay()">开始今天 ✨</button></div></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
}
function adoptDailyGoal(min){
  const t=todayStr();state.meta.dailyReplay=state.meta.dailyReplay||{};
  state.meta.dailyReplay[t]={goals:["专注学习 "+min+" 分钟", "清空今日待办清单", "消化至少 1 张知识卡片"]};
  // 联动打卡：在「今日日程·每日待办」自动生成目标项（避免重复，学习项按值更新）
  const p=MODULE_DEFS.schedule.panels.find(x=>x.key==="daily");
  const arr=state.modules.schedule.panels[p.key];
  // 先移除旧的「专注学习」目标项（目标值可能变化），其余目标项保留
  for(let i=arr.length-1;i>=0;i--){ if(arr[i].auto&&/^专注学习/.test(arr[i].task||"")) arr.splice(i,1); }
  const items=[
    {time:"🎯 目标",task:"专注学习 "+min+" 分钟",auto:true},
    {time:"🎯 目标",task:"清空今日待办清单",auto:true},
    {time:"🎯 目标",task:"消化至少 1 张知识卡片",auto:true}
  ];
  let added=0;
  items.forEach(it=>{ if(!arr.some(x=>x.auto&&x.task===it.task)){ arr.push({id:uid(),time:it.time,task:it.task,done:false,doneDate:null,auto:true}); added++; } });
  save();
  closeModal();
  toast(added>0?("🎯 已采纳目标，并在今日日程生成 "+added+" 项打卡"):"🎯 目标已更新，今日日程已有目标项");
  showDailyReplay();
}
function showDailyReplay(){
  const t=todayStr();if(state.meta.dailyReplay&&state.meta.dailyReplay[t]){return;}
  let html='<div class="greet-card"><div class="gbig">🎯 今日目标</div>'+
    '<div class="mini-note">写下今天最想完成的三件事，晚上回来复盘</div>'+
    '<div class="field"><input id="replay1" placeholder="目标 1" style="padding:11px;border:1px solid var(--glass-border);border-radius:var(--radius-l);font-size:14px;background:var(--glass-flat);color:var(--text)"></div>'+
    '<div class="field"><input id="replay2" placeholder="目标 2" style="padding:11px;border:1px solid var(--glass-border);border-radius:var(--radius-l);font-size:14px;background:var(--glass-flat);color:var(--text)"></div>'+
    '<div class="field"><input id="replay3" placeholder="目标 3" style="padding:11px;border:1px solid var(--glass-border);border-radius:var(--radius-l);font-size:14px;background:var(--glass-flat);color:var(--text)"></div>'+
    '<div class="modal-ops"><button class="cancel" onclick="closeModal()">稍后填</button><button class="save" onclick="saveDailyReplay()">保存目标</button></div></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
}
function saveDailyReplay(){
  const t=todayStr();const goals=[$("#replay1").value.trim(),$("#replay2").value.trim(),$("#replay3").value.trim()].filter(Boolean);
  state.meta.dailyReplay=state.meta.dailyReplay||{};state.meta.dailyReplay[t]={goals:nickGoals(goals)};save();closeModal();toast("🎯 今日目标已记录，晚上见～");
}
function nickGoals(g){return g;}
/* #20 打卡完成「撒花」彩蛋：连续 7/30/… 天触发全屏彩带（配合里程碑弹窗） */
function fireConfetti(){
  try{
    var layer=document.getElementById("confettiLayer");
    if(!layer){ layer=document.createElement("div"); layer.id="confettiLayer"; document.body.appendChild(layer); }
    layer.innerHTML="";
    var colors=["#E8C4C4","#D4A8B0","#9CC3E0","#F2C879","#A8D5BA","#C9B6E4","#FFB3BA","#9FD8D0"];
    var N=70;
    for(var i=0;i<N;i++){
      var p=document.createElement("span");
      var isStar=Math.random()>0.55;
      p.className="confetti-piece "+(isStar?"star":"dot");
      p.style.color=colors[i%colors.length];
      if(!isStar) p.style.background=colors[i%colors.length];
      p.style.left=(Math.random()*100)+"vw";
      // #19 飘落速度差异化：2.8~5.2s，星星更轻飘
      p.style.animationDuration=((isStar?3.2:2.6)+Math.random()*2.2)+"s";
      p.style.animationDelay=(Math.random()*0.8)+"s";
      // 横向漂移 + 旋转差异化
      p.style.setProperty("--cf-x",((Math.random()*40-20).toFixed(0))+"px");
      p.style.setProperty("--cf-r",((Math.random()*540+180)|0)+"deg");
      layer.appendChild(p);
    }
    setTimeout(function(){ try{ if(layer) layer.innerHTML=""; }catch(e){} }, 4400);
  }catch(e){}
}
/* #30 成就解锁彩带庆祝：绶带 + 星屑 + 微震，克制不喧宾夺主 */
function celebrateAchievement(name, iconSvg){
  try{
    if(!motionOK()){ toast("🏅 解锁成就："+name); return; }
    // 全屏星屑彩带（复用 #19 细腻撒花）
    fireConfetti();
    // 微震动：两段轻震，形成「解锁」触感
    try{ haptic(16); setTimeout(function(){ haptic(10); },90); }catch(e){}
    // 绶带弹层
    let box=document.getElementById("achRibbon");
    if(!box){ box=document.createElement("div"); box.id="achRibbon"; document.body.appendChild(box); }
    const medal=iconSvg||"🏅";
    box.className="ach-ribbon";
    box.innerHTML='<div class="ribbon-medal">'+medal+'</div>'+
      '<div class="ribbon-kick">Achievement Unlocked</div>'+
      '<div class="ribbon-name">'+esc(name||"新成就")+'</div>'+
      '<div class="ribbon-note">坚持被看见了 ✨</div>';
    // 重新触发动画
    box.classList.remove("show"); void box.offsetWidth; box.classList.add("show");
    setTimeout(function(){ try{ box.classList.remove("show"); }catch(e){} }, 3100);
  }catch(e){}
}
function checkStreakCelebrate(){
  const t=todayStr();const streak=computeStats().streak;
  const milestones=[7,14,30,60,100];
  if(milestones.includes(streak)){
    if(state.meta.streakCelebrated&&state.meta.streakCelebrated[""+streak])return;
    state.meta.streakCelebrated=state.meta.streakCelebrated||{};state.meta.streakCelebrated[""+streak]=true;save();
    const msgs={7:"坚持 7 天，习惯正在养成！",14:"连续 14 天，你比想象中更自律 💪",30:"30 天不间断，这就是鞠式定力 ✨",60:"两个月如一日，闪闪发光本光 🌟",100:"100 天！你已经是别人眼中的榜样了 🏆"};
    let html='<div class="celebrate"><div class="cbig">🎉</div><div class="ctxt">连续打卡 '+streak+' 天！</div><div class="mini-note">'+(msgs[streak]||"坚持就是胜利")+'</div>'+
      '<div class="modal-ops"><button class="save" onclick="closeModal()">继续加油'+icon("sparkle",14)+'</button></div></div>';
    $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show"); fireConfetti();
  }
}
function showNicknameSetup(){
  if(state.meta.nickname)return; // 仅首次
  let html='<div class="greet-card"><div class="gbig">✨ 先认识一下</div>'+
    '<div class="mini-note">给工作台起个昵称吧，以后首页会显示「欢迎回来，XXX」</div>'+
    '<div class="field"><input id="nickInput" placeholder="例如：笑笑 / 阿蜗 / 我的小名" style="padding:11px;border:1px solid var(--glass-border);border-radius:var(--radius-l);font-size:14px;background:var(--glass-flat);color:var(--text)"></div>'+
    '<div class="modal-ops"><button class="cancel" onclick="closeModal()">跳过</button><button class="save" onclick="saveNickname()">保存昵称</button></div></div>';
  $("#modalBox").innerHTML=html;
  // 昵称弹窗在开机封面关闭后显示；此处先入栈，由 closeBoot 触发
  window._pendingNickname=true;
}
function saveNickname(){
  const v=$("#nickInput").value.trim();if(!v){toast("⚠️ 昵称不能为空");return;}
  state.meta.nickname=v;save();closeModal();renderHome();toast("👋 你好，"+v+"！");
}
function aiEveningSummary(){
  // 每晚（首次打开时若当天还没生成，且已过 18:00，或距上次生成跨天）生成学习评语
  try{
    const t=todayStr();if(state.meta.aiSummary&&state.meta.aiSummary.date===t)return;
    const stats=computeStats();
    const ym=t.slice(0,7);
    let studyMin=0;["cet","gongkao"].forEach(id=>{const st=(state.modules[id]&&state.modules[id].study)||{};for(const k in st){if(k.indexOf(ym)===0)studyMin+=st[k];}});
    const praise=studyMin>0?("今天累计学习 "+studyMin+" 分钟，保持这个节奏，六级和国考都不在话下。"):"今天还没记录学习时长，今晚抽 25 分钟专注一下吧～";
    const rate=stats.total>0?Math.round(stats.done/stats.total*100):0;
    const summary="【"+t+" 学习评语】完成 "+stats.done+"/"+stats.total+" 项任务（"+rate+"%）。"+praise+(stats.streak>0?(" 连续打卡 "+stats.streak+" 天，定力可嘉。"):"");
    state.meta.aiSummary={date:t,text:summary};save();
    setNightNotification(summary);
  }catch(e){}
}
function setNightNotification(txt){
  // 晚间首次打开时推送（延迟，不打扰开机流程）
  const now=new Date();if(now.getHours()>=18){setTimeout(function(){toast("🌙 "+txt.slice(0,40)+"…");},2000);}
}
function aiTaskRecommend(){
  // 根据历史打卡数据推荐今日优先任务（返回文本，供早安/复盘使用）
  try{
    const scored=[];
    ["cet","gongkao","refinement","posture"].forEach(id=>{const p=MODULE_DEFS[id].panels.find(x=>x.type==="checklist");if(!p)return;const arr=state.modules[id].panels[p.key]||[];const undone=arr.filter(it=>!it.done);if(undone.length)scored.push({id,title:MODULE_DEFS[id].title,undone:undone.length});});
    scored.sort((a,b)=>b.undone-a.undone);
    return scored.slice(0,2).map(s=>"优先处理「"+s.title+"」的 "+s.undone+" 项未完成任务");
  }catch(e){return [];}
}

function initRipple(){
  document.addEventListener("pointerdown",function(e){
    const el=e.target.closest&&e.target.closest(".ripple,.btn-primary,.btn-ghost,.feed-play,.feed-act,.club-act,.add-btn,.mb-ops button,.study-add button,.modal-ops button,.card,.item,.cell,.pin-chip,.tag,.chip,.list-item,.check-item,.feed-card,.bt-item,.grid .cell,.more-grid .cell,.home-block-thumb,.stat,.st,.pill,.exp-chip");
    if(!el)return;
    const r=el.getBoundingClientRect();
    const size=Math.max(r.width,r.height);
    const dot=document.createElement("span");
    dot.className="ripple-dot";
    dot.style.width=dot.style.height=size+"px";
    dot.style.left=(e.clientX-r.left-size/2)+"px";
    dot.style.top=(e.clientY-r.top-size/2)+"px";
    el.appendChild(dot);
    dot.addEventListener("animationend",function(){dot.remove();},{once:true});
  });
}
/* ===== 空闲调度 =====
   首屏只做「必须立刻可见」的事；其余初始化让给浏览器空闲时间。
   requestIdleCallback 在旧版 Android WebView 上不一定存在，统一降级到 setTimeout。 */
function whenIdle(fn,timeout){
  var done=false;
  function run(){ if(done)return; done=true; try{ fn(); }catch(e){ console.warn("[idle]",e); } }
  try{
    if(typeof requestIdleCallback==="function"){ requestIdleCallback(run,{timeout:timeout||1200}); return; }
  }catch(e){}
  setTimeout(run,Math.min(timeout||1200,400));
}
/* 首屏性能埋点：记录各阶段耗时，便于定位启动瓶颈（仅在控制台输出，不影响运行） */
window._bootMarks={t0:(performance&&performance.now)?performance.now():Date.now()};
function bootMark(name){
  try{
    var now=(performance&&performance.now)?performance.now():Date.now();
    window._bootMarks[name]=Math.round(now-window._bootMarks.t0);
  }catch(e){}
}
function boot(){
  window._booting=true;
  try{ repairStateShape(); }catch(e){ console.warn('启动形状检查失败',e); }
  initRipple();
  try{ applyTheme(); }catch(e){ console.warn('主题应用失败',e); }
  try{ updateThemeBtn(); }catch(e){}
  try{ tick(); }catch(e){ console.warn('时钟更新失败',e); } if(!window._clockTick)window._clockTick=setInterval(function(){try{tick();}catch(e){}},1000);
  try{ applyUserStyle(); }catch(e){ console.warn('样式应用失败',e); }
  try{ restoreLocalFonts(); }catch(e){ console.warn('本地字体恢复失败',e); }
  try{ applyGlassParts(); }catch(e){}
  try{ applyFontVars(); }catch(e){}
  try{ applyCardStyle(); }catch(e){}
  try{ applySerifTitle(); }catch(e){}
  try{ applyReducedMotion(); }catch(e){}
  /* modal 打开时自动隐藏底栏，避免底栏遮挡弹窗底部 */
  try{
    const mm=$("#modalMask"); const bt=$("#botTab");
    if(mm&&bt){
      const sync=function(){ bt.style.transform=mm.classList.contains("show")?"translateY(130%)":"";
        bt.style.pointerEvents=mm.classList.contains("show")?"none":""; };
      sync();
      new MutationObserver(sync).observe(mm,{attributes:true,attributeFilter:["class"]});
    }
  }catch(e){}
  /* 下拉刷新已改为首页刷新按钮（见 renderHome 顶部 refreshHomeBtn），此处不再初始化 */
  if(state.meta.autoRemoteCss&&state.meta.remoteCssUrl){setTimeout(function(){fetchRemoteCss(true);},1200);}
  const t=todayStr();if(!state.meta.usageDays.includes(t)){state.meta.usageDays.push(t);try{save();}catch(e){}}
  /* 底部悬浮层堆叠高度初始化：首帧布局未必稳定，先算一次、下一帧再校准一次；
     其后任何一层（播放条 / 安装提示）显隐时各自会调 syncBottomStack()。
     视口变化（旋转屏、分屏）会改变底栏高度，也要重算。 */
  try{
    syncBottomStack();
    requestAnimationFrame(function(){ try{ syncBottomStack(); }catch(e){} });
    window.addEventListener("resize",function(){ try{ syncBottomStack(); }catch(e){} });
    /* 底栏/播放条/安装提示的高度会随主题字号、内容多少变化，而且首帧往往还没稳定
       （实测初始化时量到 61px、稳定后是 71px）。ResizeObserver 兜住所有这些情况；
       老 WebView 不支持则退化为「显隐时手动触发」，功能不受影响。 */
    if(window.ResizeObserver){
      var _ro=new ResizeObserver(function(){ try{ syncBottomStack(); }catch(e){} });
      ["botTab","installHint"].forEach(function(id){ var e=document.getElementById(id); if(e) _ro.observe(e); });
      var _mp=document.querySelector(".mini-player"); if(_mp) _ro.observe(_mp);
      window._bottomRO=_ro;
    }
    /* 字体加载完成后行高会变，底栏高度跟着变，再校准一次 */
    try{ if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ try{ syncBottomStack(); }catch(e){} }); }catch(e){}
  }catch(e){}
  bootMark("style");
  /* 以下任务都不影响首屏可见内容，统一让给空闲时间：
     stampDaily / seedHistory 要遍历全部模块聚合日历，是启动阶段最重的几项之一，
     放在首屏渲染前会实打实拖慢白屏时间。执行完后若数据有变再补刷一次视图。 */
  whenIdle(function(){
    try{ purgeLegacyMigrationBackup(); }catch(e){}
    try{
      var before=(state.meta.checkinDays||[]).length;
      stampDaily();
      if(!state.meta.seededHistory){ seedHistory(); state.meta.seededHistory=true; save(); }
      // 打卡天数变化会影响首页「连续打卡」，只在真变了时才重绘，避免无谓闪烁
      if((state.meta.checkinDays||[]).length!==before){ try{ rerenderCurrentView(); }catch(e){} }
    }catch(e){ console.warn('stampDaily失败',e); }
    try{ autoBackup(); }catch(e){}
    try{ checkStorageHealth(); }catch(e){}
    try{ checkBackupReminder(); }catch(e){}
    // 重放此前写入 IndexedDB 失败、暂存于内存的数据（存储空间释放 / 数据库恢复后自动补存）
    try{ if(typeof retryPendingWrites==="function") retryPendingWrites(); }catch(e){ console.warn('重放待写数据失败',e); }
    // 迁移被自动回滚时明确告知：数据没丢，但停留在升级前的形态
    if(window._migrationRolledBack){
      setTimeout(function(){
        try{
          toastAction("⚠️ 数据升级时「"+window._migrationRolledBack+"」步骤失败，已自动回到升级前的状态（数据未丢失）",
            "查看详情", showMigrationHistory, 15000);
        }catch(e){}
      },2500);
    }
    bootMark("idle-done");
    window._booting=false;
  },900);
  try{ renderBoot(); }catch(e){ console.warn('renderBoot失败',e); }
  try{ renderFab(); }catch(e){ console.warn('renderFab失败',e); }
  try{ renderDrawer(); }catch(e){ console.warn('renderDrawer失败',e); }
  try{ renderBotTab(); }catch(e){ console.warn('底部tab失败',e); }
  // Esc 关闭弹窗/抽屉（键盘可达性）；"/" 打开搜索；空闲时 Esc 回首页
  document.addEventListener("keydown",function(e){
    if(e.target && e.target.id==="gsInput") return; // 搜索框内部自行处理 Esc/方向键
    if(e.key==="Escape"){
      if($("#modalMask")&&$("#modalMask").classList.contains("show")){ closeModal(); }
      else if($("#quickActionsSheet")&&$("#quickActionsSheet").classList.contains("show")){ closeQuickActions(); }
      else if(currentView!=="home"){ showHome(); }
    } else if(e.key==="/" && !e.metaKey && !e.ctrlKey){
      const ae=document.activeElement;
      if(ae && (ae.tagName==="INPUT"||ae.tagName==="TEXTAREA"||ae.isContentEditable)) return;
      if($("#modalMask")&&$("#modalMask").classList.contains("show")) return;
      e.preventDefault(); openGlobalSearch();
    }
  });
  // 轻量级长按提示：列表项/投喂项长按 450ms 显示「可编辑/删除」提示
  (function initLongPress(){
    let timer=null,target=null,lpX=0;
    function clear(){ if(timer){clearTimeout(timer);timer=null;} if(target){target.classList.remove("lp-hint");target.style.removeProperty("--lp-x");target=null;} }
    function start(el,x){
      clear(); target=el; lpX=x||0;
      // 300ms 先给一次轻震动：手指能立刻确认「按住了」，不必干等到提示冒出来
      timer=setTimeout(function(){
        if(!target) return;
        try{ haptic(12); }catch(e){}
        target.classList.add("lp-hint");
        target.style.setProperty("--lp-x",lpX+"px");
        // 再补一次稍重的震动，形成「按住 → 触发」的两段反馈
        try{ setTimeout(function(){ if(target) haptic(18); },60); }catch(e){}
      },300);
    }
    document.addEventListener("touchstart",function(e){ const el=e.target.closest(".item,.feedbox-item"); if(el){ const t=e.touches[0]; const rect=el.getBoundingClientRect(); start(el, t.clientX - rect.left); } },{passive:true});
    document.addEventListener("mousedown",function(e){ const el=e.target.closest(".item,.feedbox-item"); if(el){ const rect=el.getBoundingClientRect(); start(el, e.clientX - rect.left); } });
    ["touchend","touchmove","touchcancel","mouseup","mouseleave","scroll","click"].forEach(function(ev){ document.addEventListener(ev,clear,{passive:true}); });
  })();
  // 双击首页顶部回顶（移动端友好）
  const homeV=$("#view-home");
  if(homeV)homeV.addEventListener("dblclick",function(e){ if(e.target.closest("button,a,.item,.card,.feed-card"))return; try{homeV.scrollTo({top:0,behavior:"smooth"});}catch(e){try{homeV.scrollTop=0;}catch(e){}} });
  // A-1 顶栏滚动毛玻璃增强（监听当前激活视图的滚动）
  const tb=$("#topbar");
  if(tb){
    let _scrollRAF=0;
    const onScroll=function(){ if(_scrollRAF)return; _scrollRAF=requestAnimationFrame(function(){ _scrollRAF=0; const av=document.querySelector(".view.active"); const y=av?av.scrollTop:0; if(y>10)tb.classList.add("scrolled"); else tb.classList.remove("scrolled"); const tt=$("#toTop"); if(tt)tt.classList.toggle("show",y>420); const rf=$("#refreshFab"); if(rf)rf.classList.toggle("show",y>120);
      // #3 滚动视差玻璃：背景层随滚动极轻反向位移（克制）
      const bl=document.getElementById("bg-layer"); if(bl&&bl.style.display!=="none"){ bl.style.transform="translateY("+(-Math.min(y,600)*0.04).toFixed(1)+"px)"; }
      // #16 纸纹理随滚动轻微「沉」下去：越往下纸张质感越实，像翻页落定
      try{
        const ba=document.body; if(ba){ const depth=Math.min(y,1400)/1400; ba.style.setProperty("--paper-depth",(0.85+depth*0.15).toFixed(3)); }
      }catch(e){}
    }); };
    document.addEventListener("scroll",onScroll,{passive:true,capture:true}); onScroll();
  }
  // 延迟加载音乐，不阻塞
  whenIdle(function(){ try{ initMusic(); }catch(e){ console.warn('音乐加载失败',e); } }, 1500);
  // 离线检测轻提示
  window.addEventListener("offline",function(){toast("📡 已离线，数据仍存本机");});
  window.addEventListener("online",function(){toast("✅ 网络已恢复");});
  // 页面切后台 / 关闭前，强制把被节流的 save 落盘，避免丢失
  const flushSave=function(){ try{ if(window._saveTimer){ clearTimeout(window._saveTimer); window._saveTimer=0; _writeState(true); } }catch(e){} };
  window.addEventListener("pagehide",flushSave);
  document.addEventListener("visibilitychange",function(){ if(document.hidden)flushSave(); });
  // 专注计时器：页面切到后台时自动暂停，回到前台自动恢复（避免后台空转/误统计）
  document.addEventListener("visibilitychange",function(){
    if(!focusState.running && !focusState.visPaused) return;
    if(document.hidden){
      if(focusState.running){ pauseFocus(focusState.id); focusState.visPaused=true; }
    } else {
      if(focusState.visPaused){ focusState.visPaused=false; startFocus(focusState.id); }
    }
  });
  // 桌面通知：首次进入时温和询问一次（不打扰，可跳过）
  try{
    // 首次进入时温和提示一次（不弹阻塞式 confirm，避免影响自动化/无头环境），
    // 真正请求权限发生在用户在「美化设置 → 快捷开关 → 桌面提醒」打开时（onNotifyToggle）。
    if("Notification" in window && Notification.permission==="default" && !state.meta.notifyAsked){
      state.meta.notifyAsked=true; save();
      setTimeout(function(){ toast("🔔 想接收专注到时/考试临近提醒？去「美化设置 → 快捷开关」开启桌面提醒"); },2000);
    }
  }catch(e){}
  // 每日首次打开：考试临近提醒（<3 天）—— 非首屏，交给空闲时段
  whenIdle(function(){
  try{
    const t=todayStr();
    if(!state.meta.examReminded||state.meta.examReminded!==t){
      const exams=(state.modules.alert&&state.modules.alert.panels&&state.modules.alert.panels.exams)||[];
      const soon=exams.filter(function(e){const d=daysToExam(e.name,e.date);return d!==null&&d<=3;});
      if(soon.length){ notify("⏰ 考试临近", soon.map(function(e){return e.name+" 还有 "+daysToExam(e.name,e.date)+" 天";}).join("，")); }
      state.meta.examReminded=t; save();
    }
  }catch(e){}
  if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(function(e){console.warn("SW 注册失败",e);}); }
  },1600);
  window.addEventListener("beforeinstallprompt",function(e){ e.preventDefault(); window._deferredPrompt=e; showInstallHint(); });
  window.addEventListener("appinstalled",function(){ toast("✅ 已安装到主屏"); hideInstallHint(); });
  try{ initModalClose(); }catch(e){ console.warn('弹窗关闭按钮初始化失败',e); }
  /* 首屏调度：等 IndexedDB 预热，但最多等 260ms
     —— IDB 正常（通常 <50ms）时先预热后渲染，封面/背景图不闪；
        隐私模式 / IDB 被禁用 / 读盘很慢时，260ms 后立刻出首屏，不再干等；
        预热结果晚到时补刷一次样式与当前视图，保证背景图最终仍然会显示。 */
  (function bootFirstPaint(){
    var painted=false, hydratedN=-1;            // -1 表示预热尚未返回
    /* #19 首屏骨架：等 IDB 预热的这最多 260ms 里，先给首页放「统计四宫格 + 两张卡片」的
       微光占位，避免用户先看到一片空白再突然整页塞满。restoreLastView → renderHome
       会整体覆写 #view-home 的 innerHTML，因此这里的占位一定会被替换掉，不留残留。 */
    try{
      var _vh=document.getElementById("view-home");
      if(_vh&&!_vh.children.length){ _vh.innerHTML=skeletonStatsHtml(4)+skeletonHtml(2); }
    }catch(e){}
    function paint(){
      if(painted)return; painted=true;
      try{ restoreLastView(); }
      catch(e){ console.warn('restoreLastView失败',e); try{ showHome(); }catch(e2){} }
      bootMark("first-paint");
    }
    hydrateImages().then(function(n){
      hydratedN=(typeof n==="number")?n:0;
      try{ applyUserStyle(); }catch(e){ console.warn('预热后样式应用失败',e); }
      if(painted){
        // 首屏已出但图片是之后才读到：补刷一次，让封面/背景图补上
        if(hydratedN>0){ try{ rerenderCurrentView(); }catch(e){} }
      } else paint();
      // 死引用检测：背景图是 idb: 引用但读不到真实图（旧代码曾只存 IDB、真机读不回），
      // 延迟再判一次避免误报，确认失效则提示用户到「美化设置」重新上传一次。
      try{
        if((state.meta.decorBg||"").indexOf("idb:")===0 && !readImage("meta.decorBg")){
          setTimeout(function(){ if(!readImage("meta.decorBg")) toast("⚠️ 背景图数据已失效，请到「美化设置」重新上传一次背景"); },900);
        }
      }catch(e){}
    }).catch(function(e){
      hydratedN=0;
      console.warn('图片预热失败，直接渲染首屏',e);
      if(!painted)paint();
    });
    setTimeout(paint,260);
  })();
  // 图片加载失败兜底：全局委托，所有 <img> 自动套占位（#2）
  try{ bindImgErrorFallback(); }catch(e){}
  // 首页快速投喂浮动条显隐同步（#14）
  try{ bindFeedFabSync(); syncFeedFab(); }catch(e){}
  // 下拉刷新已弃用，改为首页刷新按钮，不再初始化 initPullToRefresh()
  // 启动屏 Splash：显示 1.2s 后淡出；首次使用再展示 bootMask 引导
  try{
    const splash=$("#splashMask"); const boot=$("#bootMask");
    if(splash) splash.style.display="flex";
    setTimeout(function(){
      if(splash) splash.classList.add("hide");
      setTimeout(function(){
        if(splash) splash.style.display="none";
        // 仅当从未关闭过引导（bootDone 为假）且确属新用户时才展示，避免遮挡主界面
        const isFirst=!state.meta.bootDone;
        if(isFirst && boot){ boot.style.display="flex"; setTimeout(function(){ try{ if(getComputedStyle(boot).display!=="none") closeBoot(); }catch(e){} },8000); }
      },600);
    },1200);
  }catch(e){ console.warn('启动屏失败',e); }
}
