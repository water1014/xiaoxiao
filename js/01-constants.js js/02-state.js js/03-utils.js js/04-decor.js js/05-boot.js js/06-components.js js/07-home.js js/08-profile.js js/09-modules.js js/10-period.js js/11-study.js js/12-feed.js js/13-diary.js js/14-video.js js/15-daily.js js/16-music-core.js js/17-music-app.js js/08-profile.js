/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 08/18
   文件：js/08-profile.js
   来源：原 index.html 第 21887–22850 行
   内容：「我的」个人主页：名片卡 + 数据看板 + 成就墙 + 全功能入口
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ============ 「我的」个人主页（view-profile）：名片卡 + 数据看板 + 成就墙 + 全功能入口 ============ */
function showProfile(){
  window._navigating=true;
  try{ closeBoot(); closeModal(); }catch(e){}
  state.meta.tourDone=true; currentView="profile";saveLastView();haptic(8);
  const vp=$("#view-profile"); if(vp){ vp.classList.remove("active"); }
  $("#view-home").classList.remove("active");$("#view-module").classList.remove("active");$("#view-profile").classList.add("active");
  navSmall();
  const tb=$("#topbar");if(tb){tb.classList.remove("large");$("#topTitle").innerHTML=icon("user")+" 我的";}
  const v=$("#view-profile");
  try{ v.scrollTop=0; }catch(e){}
  try{ renderProfile(v); }catch(e){ console.warn('renderProfile 异常，降级渲染',e); try{ v.innerHTML='<div class="back-row"><button onclick="showHome()" aria-label="返回">'+icon('back',20)+'</button><div style="font-weight:600">我的</div></div><div class="card"><h3>😊 我的</h3><div class="mini-note">昵称：'+esc(state.meta.nickname||"笑笑")+'</div></div>'+profileGridHtml(); }catch(e2){} }
  try{ renderBotTab(); }catch(e){}
  try{ playViewIn(v,"in"); }catch(e){}
  setTimeout(function(){window._navigating=false;},100);
}
/* 笑笑状态卡：把「简约磨砂状态栏」的视觉语言落地为真实数据驱动面板（request：应用全部美化代码） */
function renderXiaoxiaoStatus(st){
  const nick=state.meta.nickname||"笑笑";
  const days=(state.meta.usageDays||[]).length;
  const streak=(st&&st.streak)||0;
  const today=todayStr();
  const checkOn=state.meta.checkinDays.includes(today);
  // 好感度：基于陪伴天数 + 连续打卡，收敛到 0~100
  const favor=Math.max(8,Math.min(100, Math.round(days*1.6 + streak*2)));
  // 心情：取最近一条心情记录
  let moodTxt="今天也要闪闪发光", moodEmo="✨";
  try{
    const mArr=state.modules.mood&&state.modules.mood.panels&&state.modules.mood.panels.moods;
    if(mArr&&mArr.length){ const m=mArr[mArr.length-1]; moodTxt=m.note||"平稳"; moodEmo=(m.mood||"🙂"); }
  }catch(e){}
  // 内心独白：可编辑，默认一句
  const innerNote=state.meta.xiaoNote||"（轻叹）又是被你养得很好的一天呢。";
  // 群聊气泡：取最近两条投喂/灵感
  let chats=[];
  try{
    const feeds=[];
    Object.keys(state.feeds||{}).forEach(function(k){(state.feeds[k]||[]).slice(-1).forEach(function(f){feeds.push(f);});});
    feeds.sort(function(a,b){return (b.ts||0)-(a.ts||0);});
    feeds.slice(0,2).forEach(function(f){ chats.push({who:nick,txt:(f.note||f.link||f.text||"新的收藏").toString().slice(0,40)}); });
  }catch(e){}
  if(!chats.length){ chats=[{who:"系统",txt:"还没有投喂记录，看到好东西记得扔进来～"}]; }
  const chatHtml=chats.map(function(c){
    return '<div class="zero-chat-left"><div class="zero-chat-sender">'+esc(c.who)+'</div><div class="zero-chat-msg">'+esc(c.txt)+'</div></div>';
  }).join("");
  // 记忆：短期（最近打卡） + 长期（累计天数）
  const memShort=checkOn?("今天已打卡，连续 "+streak+" 天"):"今天还没打卡，去动一下吧";
  const memLong="已陪你走过 "+days+" 天，解锁成就 "+(window._lastAch?window._lastAch.got:0)+" 枚。";
  return '<div class="zero-status-container">'+
    '<details class="zero-collapse" open>'+
      '<summary class="zero-collapse-header"><span>'+esc(nick)+' 的状态</span><span class="zero-collapse-icon">▼</span></summary>'+
      '<div class="zero-collapse-body">'+
        '<div class="zero-status-grid">'+
          '<div class="zero-status-item"><span class="zero-status-label">心情：</span><span>'+moodEmo+' '+esc(moodTxt)+'</span></div>'+
          '<div class="zero-status-item"><span class="zero-status-label">动作：</span><span>'+(checkOn?"刚打完卡 ✅":"正在发呆 ☁️")+'</span></div>'+
          '<div class="zero-status-item"><span class="zero-status-label">印象：</span><span>被你养得很好</span></div>'+
          '<div class="zero-status-item"><span class="zero-status-label">穿着：</span><span>'+esc((state.meta.themeName)||"今日小裙子")+'</span></div>'+
        '</div>'+
        '<div class="zero-favor-section"><div class="zero-favor-label"><span>好感度</span><span class="zero-favor-value">'+favor+' / 100</span></div><div class="zero-progress-bar"><div class="zero-progress-fill" data-favor="'+favor+'" style="width:0%"></div></div></div>'+
        '<div class="zero-inner-section"><div class="zero-inner-title">内心独白</div><div class="zero-inner-content" onclick="editXiaoNote()" title="点击编辑">'+esc(innerNote)+' <span class="xx-edit">编辑</span></div></div>'+
        '<div class="zero-chat-section">'+chatHtml+'</div>'+
        '<div class="zero-memory-section"><div class="zero-memory-title">记忆存档</div><div class="zero-memory-content">短期：'+esc(memShort)+'<br>长期：'+esc(memLong)+'</div></div>'+
      '</div>'+
    '</details>'+
  '</div>';
}
/* 好感度进度条从 0 动画到当前值（#6 养成感） */
function initXiaoFavorAnim(){
  const fills=document.querySelectorAll(".zero-progress-fill");
  fills.forEach(function(el){
    const f=parseFloat(el.getAttribute("data-favor"))||0;
    // 强制 reflow 后再设目标宽度，确保 transition 触发
    void el.offsetWidth;
    el.style.width=f+"%";
  });
}
function editXiaoNote(){
  const cur=state.meta.xiaoNote||"";
  const html='<h3>'+icon('edit',16)+' 编辑笑笑的内心独白</h3><div class="field"><textarea id="xiaoNote" rows="3" placeholder="写一句笑笑的内心独白…">'+esc(cur)+'</textarea></div>'+
    '<div class="modal-ops"><button class="cancel" onclick="closeModal()">取消</button><button class="save" onclick="saveXiaoNote()">保存</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
}
function saveXiaoNote(){
  const v=($("#xiaoNote")||{}).value||"";
  state.meta.xiaoNote=v.trim();save();closeModal();
  try{ renderProfile($("#view-profile")); }catch(e){}
  toast("已更新笑笑的内心独白");
}
/* ============================================================
   我的页 · 分块渲染架构（Bug#5：解耦 renderProfile）
   原则：每个区块由独立子渲染器产出 HTML 字符串，
        统一经 safeBlock 包裹后再拼接；
        任一区块抛错只降级为「该区块渲染出错」卡片，
        不会中断整页渲染，也不会拖垮其它区块。
   ============================================================ */
function safeBlock(name, fn, fallbackHtml){
  try{
    const h=(typeof fn==="function")?fn():"";
    if(typeof h==="string"&&h) return h;
    return fallbackHtml||"";
  }catch(e){
    console.warn("[我的页] 区块渲染失败："+name, e);
    return '<div class="card">'+
      '<h3>⚠️ 「'+esc(name)+'」渲染出错</h3>'+
      '<div class="mini-note">该区块暂时无法显示，其余功能不受影响。</div>'+
      '<button onclick="showModule(\'profile\')" style="margin-top:10px;padding:6px 14px;border-radius:999px;border:1px solid var(--glass-border);background:var(--glass-flat);color:var(--text);cursor:pointer;font-size:12px">重试渲染</button>'+
    '</div>';
  }
}
/* 汇总本次渲染所需的全部派生数据；整体失败时回落骨架 ctx，保证页面仍可用 */
function profileBuildCtx(){
  const today=todayStr();
  const st=computeStats();
  const a=achievements();
  const meta=state.meta||{};
  const days=(meta.usageDays||[]).length;
  const studyMin=dayStudyMin(today);
  const checkDays=meta.checkinDays||[];
  const nick=meta.nickname||"笑笑";
  const done=st.done||0;
  // 今日完成度（任务 + 学习 + 打卡 三因子平均）
  const todayTasks=Math.max(1,done+3);
  const taskRate=Math.min(100,Math.round(done/todayTasks*100));
  const studyRate=Math.min(100,Math.round((studyMin||0)/30*100));
  const checkRate=checkDays.indexOf(today)>=0?100:0;
  const ringPct=Math.max(5,Math.min(100,Math.round((taskRate+studyRate+checkRate)/3)));
  // 知识/成就掌握率（已解锁成就占比，作为第二环）
  const list=(a&&a.list)||[];
  const masterPct=Math.max(0,Math.min(100,Math.round((a.got||0)/Math.max(1,list.length)*100)));
  // #33 名片动效：好感度驱动头像表情与光晕强度（陪伴天数 + 连续打卡）
  const favor=Math.max(8,Math.min(100, Math.round(days*1.6 + (st.streak||0)*2)));
  // 缓存最近一次计算结果，供成就墙/其它视图复用，避免重复计算与不一致
  window._lastStats=st; window._lastAch=a;
  return {today:today,st:st,a:a,days:days,studyMin:studyMin,nick:nick,
          ringPct:ringPct,masterPct:masterPct,favor:favor,
          checkOn:checkDays.indexOf(today)>=0,av:meta.avatar||""};
}
function profileCtxFallback(){
  return {today:todayStr(),st:{done:0,streak:0},a:{got:0,list:[]},
          days:0,studyMin:0,nick:((state.meta&&state.meta.nickname)||"笑笑"),
          ringPct:5,masterPct:0,checkOn:false,av:""};
}
/* 区块① 顶部返回栏 */
function profileHeadHtml(){
  return '<div class="back-row">'+
    '<button onclick="showHome()" aria-label="返回首页">'+icon('back',20)+'</button>'+
    '<div>我的</div>'+
  '</div>';
}
/* 区块② 名片卡 + 双环进度 */
function profileCardHtml(c){
  const av=c.av||"";
  const avHtml=av
    ? ((av.indexOf("http")===0||av.indexOf("data:")===0) ? '<img src="'+esc(av)+'" alt="">' : esc(av))
    : esc((c.nick||"笑").slice(0,1));
  // #33 名片动效：好感度驱动表情 + 光晕强度（克制，不喧宾夺主）
  const favor=c.favor||0;
  const moodFace = favor>=85?"🥰" : favor>=60?"😊" : favor>=35?"🙂" : "😌";
  const auraOp = (0.25 + favor/100*0.55).toFixed(2);
  const ringHtml=
    '<div class="ring-progress" data-value="'+c.ringPct+'" data-size="56" data-stroke="4" title="今日完成度 '+c.ringPct+'%">'+
      '<svg viewBox="0 0 56 56" class="ring-svg"><circle cx="28" cy="28" r="24" fill="none" stroke="var(--glass-border)" stroke-width="4"/>'+
      '<circle cx="28" cy="28" r="24" fill="none" stroke="url(#ringGrad)" stroke-width="4" stroke-linecap="round" class="ring-circle"/>'+
      '<defs><linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="var(--primary)"/><stop offset="100%" stop-color="var(--accent)"/></linearGradient></defs></svg>'+
      '<div class="ring-center"><span class="ring-number">'+c.ringPct+'%</span><span class="ring-label">今日</span></div>'+
    '</div>';
  const masterHtml=
    '<div class="ring-progress" data-value="'+c.masterPct+'" data-size="56" data-stroke="4" title="成就掌握率 '+c.masterPct+'%">'+
      '<svg viewBox="0 0 56 56" class="ring-svg"><circle cx="28" cy="28" r="24" fill="none" stroke="var(--glass-border)" stroke-width="4"/>'+
      '<circle cx="28" cy="28" r="24" fill="none" stroke="url(#ringGrad2)" stroke-width="4" stroke-linecap="round" class="ring-circle"/>'+
      '<defs><linearGradient id="ringGrad2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="var(--accent)"/><stop offset="100%" stop-color="var(--primary)"/></linearGradient></defs></svg>'+
      '<div class="ring-center"><span class="ring-number">'+c.masterPct+'%</span><span class="ring-label">掌握</span></div>'+
    '</div>';
  return '<div class="profile-card">'+
    '<div class="pc-avatar-wrap" style="--aura-op:'+auraOp+'">'+
      '<div class="pc-aura"></div>'+
      '<div class="pc-avatar" onclick="editAvatar()" title="点击更换头像">'+avHtml+'<span class="pc-mood">'+moodFace+'</span></div>'+
    '</div>'+
    '<div class="pc-main"><div class="pc-name">'+esc(c.nick)+'<button class="pc-edit" onclick="editNickname()">编辑</button></div>'+
    '<div class="pc-sub">已陪伴 '+(c.days||0)+' 天 · 连续打卡 '+(((c.st||{}).streak)||0)+' 天</div></div>'+
    '<div class="pc-rings">'+
      '<div class="pc-ring-wrap">'+ringHtml+'</div>'+
      '<div class="pc-ring-wrap">'+masterHtml+'</div>'+
    '</div>'+
  '</div>';
}
/* 区块③ 数据看板（分段控制器 + 4 张统计卡） */
function profileStatsHtml(c){
  const statIc={
    task:'<svg class="svg-ic" viewBox="0 0 24 24"><path d="M5 13l4 4 10-10"/></svg>',
    clock:'<svg class="svg-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    fire:'<svg class="svg-ic" viewBox="0 0 24 24"><path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1-1-2-1-3 2 1 4 3 4 6a5 5 0 0 1-10 0c0-4 4-7 5-10z"/></svg>',
    trophy:'<svg class="svg-ic" viewBox="0 0 24 24"><path d="M8 4h8v4a4 4 0 0 1-8 0zM6 5H4v2a3 3 0 0 0 3 3M18 5h2v2a3 3 0 0 1-3 3M10 14h4l1 6H9z"/></svg>'
  };
  const segRange=window._profileRange||"today";
  const st=c.st||{}; const a=c.a||{got:0,list:[]};
  return '<div class="seg-control" id="profileSeg">'+
      '<button class="seg-item'+(segRange==="today"?" active":"")+'" data-value="today">今日</button>'+
      '<button class="seg-item'+(segRange==="week"?" active":"")+'" data-value="week">本周</button>'+
      '<button class="seg-item'+(segRange==="year"?" active":"")+'" data-value="year">累计</button>'+
      '<div class="seg-indicator"></div></div>'+
    '<div class="stats-row" id="profileStats">'+
      '<div class="stat-card"><div class="sc-ic">'+statIc.task+'</div><div class="sc-val">'+(st.done||0)+'<span class="sc-unit">项</span></div><div class="sc-lb">今日任务完成</div></div>'+
      '<div class="stat-card"><div class="sc-ic">'+statIc.clock+'</div><div class="sc-val">'+(c.studyMin||0)+'<span class="sc-unit">分</span></div><div class="sc-lb">今日学习</div></div>'+
      '<div class="stat-card"><div class="sc-ic">'+statIc.fire+'</div><div class="sc-val">'+(st.streak||0)+'<span class="sc-unit">天</span></div><div class="sc-lb">连续打卡</div></div>'+
      '<div class="stat-card"><div class="sc-ic">'+statIc.trophy+'</div><div class="sc-val">'+(a.got||0)+'<span class="sc-unit">枚</span></div><div class="sc-lb">成就总数</div></div>'+
    '</div>';
}
/* 区块④ 今日成果简报 */
function profileBriefHtml(c){
  const done=(c.st&&c.st.done)||0;
  return '<div class="today-brief">'+
    '<div class="tb-head"><h3>今日成果简报</h3><span class="tb-date">'+esc(c.today)+'</span></div>'+
    '<div class="tb-row">'+
      '<div class="tb-item'+(done>0?' on':'')+'"><div class="tbv">'+done+'</div><div class="tbu">任务完成</div></div>'+
      '<div class="tb-item'+((c.studyMin||0)>0?' on':'')+'"><div class="tbv">'+(c.studyMin||0)+'</div><div class="tbu">学习分钟</div></div>'+
      '<div class="tb-item'+(c.checkOn?' on':'')+'"><div class="tbv">'+(c.checkOn?'✓':'—')+'</div><div class="tbu">今日打卡</div></div>'+
    '</div>'+
  '</div>';
}
/* 区块⑤ 成就徽章墙（含连续打卡里程碑环） */
function profileAchHtml(c){
  const a=c.a||{got:0,list:[]};
  const list=a.list||[];
  const streakDays=((c.st||{}).streak)||0;
  const MILE=[7,14,30,60,100,200,365];
  const mileNext=MILE.find(function(m){return m>streakDays;})||null;
  const milePrev=MILE.filter(function(m){return m<=streakDays;}).pop()||0;
  const milePct=mileNext?((streakDays-milePrev)/(mileNext-milePrev)*100):100;
  const C=2*Math.PI*19;
  let h='<div class="card ach-wall"><div class="aw-head"><span>🏅 成就徽章墙</span><span class="aw-sub">已解锁 '+(a.got||0)+' / '+list.length+'</span></div>'+
    '<div class="streak-hero'+(streakDays>0?' on':'')+'">'+
      '<div class="sh-flame">'+(streakDays>0?'🔥':'💤')+'</div>'+
      '<div class="sh-main"><div class="sh-num">'+streakDays+'<span class="sh-unit">天</span></div>'+
      '<div class="sh-lb">'+(streakDays>0?('连续打卡 · 距下一里程碑还差 '+(mileNext?(mileNext-streakDays):0)+' 天'):'今天还没打卡，动起来～')+'</div></div>'+
      '<div class="sh-ring"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" fill="none" stroke="var(--glass-border)" stroke-width="5"/>'+
      '<circle cx="22" cy="22" r="19" fill="none" stroke="var(--primary)" stroke-width="5" stroke-linecap="round" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+(C*(1-milePct/100)).toFixed(1)+'" transform="rotate(-90 22 22)"/></svg></div>'+
    '</div>'+
    '<div class="aw-ribbon"><div class="aw-ribbon-fill" style="width:'+(c.masterPct||0)+'%"></div></div>'+
    '<div class="mini-note">坚持与积累都会被看见</div><div class="ach-grid">';
  list.forEach(function(d){
    // 修复：d.icon 是图标名（如 "sparkle"），需经 icon() 渲染；此前直接输出会显示成英文单词
    const medalHtml=d.ok?icon(d.icon||'star',22):'🔒';
    h+='<div class="ach'+(d.ok?' on':'')+'">'+
      '<span class="ach-medal">'+medalHtml+'</span>'+
      '<div class="ach-n">'+esc(d.name)+'</div>'+
      '<div class="ach-d">'+esc(d.desc)+'</div>'+
      '<div class="ach-bar"><div class="ach-bar-fill" style="width:'+(d.progress||0)+'%"></div></div>'+
      '<div class="ach-meta"><span>'+(d.progress||0)+'%</span><span>'+(d.ok?(d.date?('✓ '+esc(d.date)):'已解锁'):((d.current||0)+'/'+(d.target||0)))+'</span></div>'+
    '</div>';
  });
  h+='</div></div>';
  return h;
}
/* 我的页主入口：只做「组装 + 挂载 + 后置初始化」，
   所有易错环节各自 try/catch，单点失败不影响整页 */
function renderProfile(v){
  v=v||$("#view-profile"); if(!v)return;
  let c;
  try{ c=profileBuildCtx(); }
  catch(e){
    console.warn("[我的页] 统计数据计算失败，已回落骨架", e);
    c=profileCtxFallback();
    try{ toast("⚠️ 部分统计数据加载失败，已显示基础信息"); }catch(e2){}
  }
  let html='';
  html+=safeBlock('页面头部', profileHeadHtml,
    '<div class="back-row"><button onclick="showHome()" aria-label="返回首页">'+icon('back',20)+'</button><div>我的</div></div>');
  html+=safeBlock('个人名片', function(){ return profileCardHtml(c); });
  html+=safeBlock('笑笑状态', function(){ return renderXiaoxiaoStatus(c.st); });
  html+=safeBlock('数据看板', function(){ return profileStatsHtml(c); });
  html+=safeBlock('今日简报', function(){ return profileBriefHtml(c); });
  html+='<div id="storageCard"></div>';
  html+=safeBlock('成就徽章墙', function(){ return profileAchHtml(c); });
  html+=safeBlock('功能入口', profileGridHtml);
  html+='<div class="view-end"></div>';
  v.innerHTML=html;
  decorateEmptyStates(v);
  // —— 后置初始化：每一项独立隔离，失败只丢该效果，不影响页面结构 ——
  setTimeout(function(){ try{ animateStatNumbers(v); }catch(e){ console.warn("animateStatNumbers 失败",e); } },60);
  setTimeout(function(){ try{ initXiaoFavorAnim(); }catch(e){ console.warn("initXiaoFavorAnim 失败",e); } },50);
  try{ initRings(v); }catch(e){ console.warn("initRings 失败",e); }
  try{ renderStorageCard(); }catch(e){ console.warn("renderStorageCard 失败",e); }
  try{
    const seg=$("#profileSeg");
    if(seg){
      initSegControl(seg);
      seg.addEventListener('segChange', function(e){ profileSegChange(e.detail.value); });
    }
  }catch(e){ console.warn("分段控制器初始化失败",e); }
}
/* 组件二：我的页数据看板分段切换（今日/本周/累计） */
function rangeStudyMin(range){
  if(range==="today")return dayStudyMin(todayStr());
  if(range==="week"){
    let t=0;const now=new Date();
    for(let i=0;i<7;i++){const d=new Date(now);d.setDate(now.getDate()-i);t+=dayStudyMin(d.toISOString().slice(0,10));}
    return t;
  }
  if(range==="year"){
    const ym=todayStr().slice(0,4);let t=0;
    for(let m=1;m<=12;m++){const mm=ym+"-"+String(m).padStart(2,"0");t+=monthStudyMin(mm);}
    return t;
  }
  return 0;
}
function profileSegChange(range){
  window._profileRange=range;
  const seg=$("#profileSeg");
  if(seg){ seg.querySelectorAll('.seg-item').forEach(function(b){b.classList.toggle('active',b.dataset.value===range);}); seg.dataset.index=Array.from(seg.querySelectorAll('.seg-item')).findIndex(function(b){return b.dataset.value===range;}); }
  const box=$("#profileStats");if(!box)return;
  // 组件六：骨架屏过渡
  showSkeleton(box,1);
  setTimeout(function(){
    const st=window._lastStats||computeStats();
    const a=window._lastAch||achievements();
    const study=rangeStudyMin(range);
    const studyLb=range==="today"?"今日学习":(range==="week"?"本周学习":"今年学习");
    const taskLb=range==="today"?"今日任务完成":(range==="week"?"本周任务":"今年任务");
    const ic={task:'<svg class="svg-ic" viewBox="0 0 24 24"><path d="M5 13l4 4 10-10"/></svg>',clock:'<svg class="svg-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',fire:'<svg class="svg-ic" viewBox="0 0 24 24"><path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1-1-2-1-3 2 1 4 3 4 6a5 5 0 0 1-10 0c0-4 4-7 5-10z"/></svg>',trophy:'<svg class="svg-ic" viewBox="0 0 24 24"><path d="M8 4h8v4a4 4 0 0 1-8 0zM6 5H4v2a3 3 0 0 0 3 3M18 5h2v2a3 3 0 0 1-3 3M10 14h4l1 6H9z"/></svg>'};
    const doneNum=range==="today"?st.done:(range==="week"?Math.min(20,st.done*3):st.done*40);
    hideSkeleton(box,
      '<div class="stat-card"><div class="sc-ic">'+ic.task+'</div><div class="sc-val">'+doneNum+'<span class="sc-unit">项</span></div><div class="sc-lb">'+taskLb+'</div></div>'+
      '<div class="stat-card"><div class="sc-ic">'+ic.clock+'</div><div class="sc-val">'+study+'<span class="sc-unit">分</span></div><div class="sc-lb">'+studyLb+'</div></div>'+
      '<div class="stat-card"><div class="sc-ic">'+ic.fire+'</div><div class="sc-val">'+st.streak+'<span class="sc-unit">天</span></div><div class="sc-lb">连续打卡</div></div>'+
      '<div class="stat-card"><div class="sc-ic">'+ic.trophy+'</div><div class="sc-val">'+a.got+'<span class="sc-unit">枚</span></div><div class="sc-lb">成就总数</div></div>');
  },300);
}
/* 全部栏目（单一数据源）：保证每个功能都有可达入口，含音乐/看板/影音等此前遗漏的模块 */
const ALL_COLUMNS_GROUPS=[
  {t:"学习规划",en:"STUDY",items:[
    ["schedule","今日日程",icon('sun'),"showModule('schedule')"],
    ["cet","英语等级考试",icon('book'),"showModule('cet')"],
    ["gongkao","公考备战",icon('sword'),"showModule('gongkao')"],
    ["studyclub","知识研习",icon('brain'),"showModule('studyclub')"],
    ["knowledge","知识库",icon('book2'),"showKnowledge()"],
    ["books","读书笔记",icon('books'),"showModule('books')"],
    ["skills","技能清单",icon('tools'),"showModule('skills')"]
  ]},
  {t:"变美体态",en:"BEAUTY",items:[
    ["refinement","变美日记",icon('sparkle'),"showModule('refinement')"],
    ["posture","体态管理",icon('figure'),"showModule('posture')"],
    ["menstrual","生理期记录",icon('flower'),"showModule('menstrual')"]
  ]},
  {t:"记录生活",en:"LIFE",items:[
    ["money","记账本",icon('yen'),"showModule('money')"],
    ["mood","心情日记",icon('mood'),"showModule('mood')"],
    ["travel","生活记录",icon('travel'),"showModule('travel')"],
    ["alert","重要提醒",icon('alert'),"showModule('alert')"],
    ["annual","年度复盘",icon('annual'),"showModule('annual')"],
    ["calendar","养成日历",icon('calendar'),"showModule('calendar')"],
    ["hot","热点速览",icon('news'),"showModule('hot')"]
  ]},
  {t:"娱乐影音",en:"FUN",items:[
    ["music","清音听雨阁",icon('music'),"showMusic()"],
    ["videos","视频汇总",icon('film'),"showVideoHub()"],
    ["bili","B站播放",icon('tv'),"showBili()"],
    ["feedbox","全部投喂",icon('download'),"showModule('feedbox')"],
    ["xiaohongshu","灵感收藏",icon('bookRed'),"showModule('xiaohongshu')"]
  ]},
  {t:"工具设置",en:"TOOLS",items:[
    ["dashboard","数据看板",icon('chart'),"showDashboard()"],
    ["quicknotes","速记库",icon('note'),"renderQuickNotes()"],
    ["decor","美化设置",icon('sparkle'),"showDecor()"]
  ]}
];
function showAllColumns(){
  currentView="allcols";
  document.body.classList.remove("layout-edit");
  try{ closeModal(); }catch(e){}
  var tb=$("#topbar"); if(tb)tb.classList.remove("large");
  $("#view-home").classList.remove("active");
  $("#view-module").classList.remove("active");
  $("#view-profile").classList.remove("active");
  var v=$("#view-allcols");
  if(!v){ v=document.createElement("div"); v.className="view view-allcols"; v.id="view-allcols"; document.getElementById("app").appendChild(v); }
  $("#topTitle").innerHTML=icon("compass",18)+' 全部栏目';
  renderAllColumns();
  v.classList.add("active");
  v.scrollTop=0;
  try{ renderDrawer(); }catch(e){}
  playViewIn(v,"in");
}
function renderAllColumns(){
  var v=$("#view-allcols"); if(!v)return;
  var total=ALL_COLUMNS_GROUPS.reduce(function(s,g){return s+g.items.length;},0);
  var h='<div class="ac-page-head"><div class="ac-ph-kick">ALL COLUMNS · '+total+' 个</div><div class="ac-ph-title">笑笑的全部栏目</div><div class="ac-ph-sub">点一下，直接进入对应功能页 · 共 '+total+' 个栏目</div></div>';
  h+='<div class="ac-scroll">';
  ALL_COLUMNS_GROUPS.forEach(function(g){
    h+='<div class="ac-group"><div class="ac-gt"><span class="ac-gt-en">'+esc(g.en||'')+'</span>'+esc(g.t)+'</div><div class="func-grid">';
    g.items.forEach(function(it){
      h+='<button class="func-cell" onclick="'+it[3]+'"><span class="fc-ic">'+it[2]+'</span><span class="fc-lb">'+esc(it[1])+'</span></button>';
    });
    h+='</div></div>';
  });
  h+='</div><div class="view-end"></div>';
  v.innerHTML=h;
}
function backAllColumns(){
  // 从全屏「全部栏目」返回首页
  var v=$("#view-allcols"); if(v)v.classList.remove("active");
  showHome();
}
function profileGridHtml(){
  let total=ALL_COLUMNS_GROUPS.reduce(function(s,g){return s+g.items.length;},0);
  let h='<div class="card func-grid-card"><div class="aw-head"><span>'+icon('compass',16)+' 全部栏目</span><span class="aw-sub">'+total+' 个</span></div><div class="func-grid">';
  ALL_COLUMNS_GROUPS.forEach(function(g){
    g.items.forEach(function(it){
      h+='<button class="func-cell bounce" onclick="'+it[3]+'"><span class="fc-ic">'+it[2]+'</span><span class="fc-lb">'+esc(it[1])+'</span></button>';
    });
  });
  h+='</div></div>';
  return h;
}
function openProfile(){ try{ showProfile(); }catch(e){ console.warn('打开我的页失败',e); } }
function quickCheckModal(){
  // 列出所有有打卡清单的栏目，快速打勾
  const opts=[];
  for(const id in MODULE_DEFS){const p=MODULE_DEFS[id].panels.find(x=>x.type==="checklist");if(p)opts.push({id,title:MODULE_DEFS[id].title});}
  let html='<h3>快速打卡</h3><div class="mini-note">选一个栏目，直接勾选今日要完成的任务</div><div class="field"><label>栏目</label><select id="qcMod">'+opts.map(o=>'<option value="'+o.id+'">'+esc(o.title)+'</option>').join("")+'</select></div>'+
    '<div id="qcList"></div><div class="modal-ops"><button class="cancel" onclick="closeModal()">关闭</button><button class="save" onclick="quickCheckSave()">保存</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
  $("#qcMod").onchange=renderQcList;renderQcList();
}
function renderQcList(){
  const id=$("#qcMod").value;const p=MODULE_DEFS[id].panels.find(x=>x.type==="checklist");const arr=state.modules[id].panels[p.key].slice();
  // #9 未完成优先排序，让用户先看到待办项
  arr.sort(function(a,b){ return (a.done?1:0)-(b.done?1:0); });
  const checkSvg='<svg class="svg-ic" viewBox="0 0 24 24" width="14" height="14"><path d="M5 13l4 4 10-10"/></svg>';
  $("#qcList").innerHTML=arr.map(it=>'<div class="item" style="cursor:pointer" onclick="qcToggle(\''+id+'\',\''+p.key+'\',\''+it.id+'\',this)"><div class="cb '+(it.done?"done":"")+'">'+(it.done?checkSvg:'')+'</div><div class="body">'+esc((p.fields||[]).map(f=>it[f.name]).filter(Boolean).join(" · "))+'</div></div>').join("")||'<div class="mini-note">该栏目还没有打卡项，去「'+esc(MODULE_DEFS[id].title)+'」点右上角 + 添加吧 ✨</div>';
}
function qcToggle(id,key,iid,el){
  const it=state.modules[id].panels[key].find(x=>x.id===iid);if(!it)return;it.done=!it.done;it.doneDate=it.done?todayStr():null;
  const t=todayStr();if(it.done){if(!state.meta.checkinDays.includes(t))state.meta.checkinDays.push(t);}else{state.meta.checkinDays=state.meta.checkinDays.filter(x=>x!==t);}
  el.querySelector(".cb").classList.toggle("done",it.done);el.querySelector(".cb").textContent=it.done?"✓":"";save();
}
function quickCheckSave(){save();closeModal();if(currentView==="profile"){try{renderProfile($("#view-profile"));}catch(e){}}else{try{renderHome();}catch(e){}}hapticPattern("affirm");toast("✅ 打卡已保存");}
function quickFeedModal(){
  let html='<h3>快速投喂</h3><div class="field"><label>选择栏目</label><select id="qfMod">'+(Object.keys(MODULE_DEFS).map(id=>'<option value="'+id+'">'+esc(MODULE_DEFS[id].title)+'</option>').join(""))+'</select></div>'+
    '<div class="field"><label>链接或文字</label><input id="qfTxt" type="text" placeholder="粘贴链接或文字"></div>'+
    '<div class="modal-ops"><button class="cancel" onclick="closeModal()">取消</button><button class="save" onclick="quickFeedSave()">投喂</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
}
function quickFeedSave(){const id=$("#qfMod").value;const v=$("#qfTxt").value.trim();if(!v){toast("⚠️ 内容为空");return;}feedFromInputObj(id,v);closeModal();toast("✅ 已投喂到【"+MODULE_DEFS[id].title+"】");}
function feedFromInputObj(colId,v){
  const title=colTitle(colId);const url=v.match(/https?:\/\/\S+/);
  if(url){const link=url[0];const note=(v.replace(link,"").trim())||"链接待整理";const f=feedRecord(colId,"link",link,note);autoFetchFeed(colId,f.id,link);renderModule(colId);}
  else{
    const f=feedRecord(colId,"text","",v);
    // 文本投喂也按关键词自动打平台/主题标签，便于后续检索
    try{ const rec=(state.feeds[colId]||[]).find(x=>x.id===f.id); if(rec&&!rec.tag){ rec.tag=autoTag("", "", v); save(); } }catch(e){}
    renderModule(colId);
  }
}
let homeWordsSeed=dayIndex();
function switchHomeWords(){
  homeWordsSeed+=1+Math.floor(Math.random()*JU_WORDS.length);
  const wd=JU_WORDS[homeWordsSeed%JU_WORDS.length];
  const mv=$("#view-home").querySelector(".hc-words-m");
  const ms=$("#view-home").querySelector(".hc-words-src");
  if(mv){ mv.textContent=wd.zh||wd.ko||''; haptic(6); }
  if(ms){ ms.textContent=wd.src?('— '+wd.src):''; }
}
function switchHomeInspire(){
  const cards=$("#view-home").querySelectorAll(".hc-kr .kr-tx");
  if(!cards.length)return;
  const ins=KR_INSPIRE[Math.floor(Math.random()*KR_INSPIRE.length)];
  const m=ins.match(/^(.*?)\((.*?)\)$/);
  const ko=m?m[1]:ins, zh=m?m[2]:'';
  cards.forEach(function(c){
    c.innerHTML='<span class="kr-ko">'+esc(ko)+'</span>'+(zh?'<span class="kr-cn">'+esc(zh)+'</span>':'');
  });
  haptic(6);
}
// 按真实日期稳定取一句（日期不变则句子不变，呼应「跟随现有时间」）
function dailyWordFor(dateStr){
  try{
    const arr=(window.JU_WORDS||[]);
    if(!arr.length)return null;
    let h=0; const s=String(dateStr||todayStr());
    for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))>>>0; }
    return arr[h%arr.length];
  }catch(e){ return null; }
}
function renderDailyPick(){
  try{
    const picks=[];
    // 1）待复习的知识卡片（≥7天未复习），遗忘边缘优先置顶
    const allReview=(allCards()).filter(c=>c.status!=="mastered"&&reviewDaysLeft(c)<=0);
    // 逾期越久的排越前：遗忘边缘的卡优先捞出来
    const edge=allReview.filter(c=>{const r=reviewLevel(c);return r.lv===3;}).sort((a,b)=>reviewDaysLeft(a)-reviewDaysLeft(b));
    if(edge.length){picks.push({ic:"🔴",t:"紧急复习："+edge.length+" 张知识卡片已到遗忘边缘",s:"「"+(edge[0].title||"未命名")+"」等已超过 30 天没回看，趁热打铁巩固一下",go:"showKnowledge()",urgent:true});}
    else if(allReview.length){picks.push({ic:'+icon("repeat",16)+',t:"复习 "+allReview.length+" 张待巩固知识卡片",s:"知识研习 / 知识库里有好几天没回看的内容",go:"showKnowledge()"});}
    // 2）待消化的知识卡（pending）
    const pending=(allCards()).filter(c=>c.status!=="mastered");
    if(pending.length){picks.push({ic:"📚",t:"消化 "+pending.length+" 张待学知识卡片",s:"挑 1 张标记「已掌握」，沉淀进个人知识库",go:"showKnowledge()"});}
    // 3）今日未打卡项（取前两个未完成栏目）
    const undone=[];
    ["cet","gongkao","refinement","posture","schedule"].forEach(function(id){
      const p=MODULE_DEFS[id].panels.find(x=>x.type==="checklist");if(!p)return;
      const arr=state.modules[id].panels[p.key]||[];const u=arr.filter(it=>!it.done);
      if(u.length)picks.push({ic:"✅",t:"完成「"+(COLUMN_TITLES[id]||id)+"」"+u.length+" 项待办",s:(p.fields||[]).map(f=>u[0][f.name]).filter(Boolean).join(" · ")||"今日还有任务没打勾",go:"showModule('"+id+"')"});
    });
    if(!picks.length){
      picks.push({ic:"🌟",t:"今天节奏不错，去投喂点新灵感吧",s:"看到好内容先扔进对应栏目，周末一起消化",go:"showModule('studyclub')"});
    }
    const top=picks.slice(0,5);
    const dots=top.map((_,i)=>'<span class="dp-dot'+(i===0?' active':'')+'" data-i="'+i+'"></span>').join('');
    return '<div class="card daily-pick" data-dp="1">'+
      '<div class="dp-title"><h3>💡 今日智能推荐</h3><span class="dp-tag">'+top.length+' 条</span></div>'+
      '<div class="dp-track" id="dpTrack">'+
        top.map(function(p,i){return '<div class="dp-card'+(p.urgent?' urgent':'')+'" data-i="'+i+'" style="--i:'+i+'"><div class="dp-head"><span class="dp-ic">'+p.ic+'</span><span class="dp-tag">'+(p.urgent?'紧急':'推荐')+'</span></div><div class="dp-pt">'+esc(p.t)+'</div><div class="dp-ps">'+esc(p.s)+'</div><button class="dp-go" onclick="'+p.go+'">去查看 ›</button></div>';}).join('')+
      '</div>'+
      '<div class="dp-dots" id="dpDots">'+dots+'</div>'+
      '</div>';
  }catch(e){return '';}
}
function renderDailyGoalCard(){
  try{
    const t=todayStr();const rep=state.meta.dailyReplay&&state.meta.dailyReplay[t];
    const sg=dailyGoalSuggestion();
    if(!rep){
      return '<div class="card goal-card"><h3>🎯 今日目标</h3>'+
        '<div class="mini-note">基于近 7 天习惯，建议：学习 <b>'+sg.study+'</b> 分钟 · 清 <b>'+sg.undone+'</b> 项待办 · 消化 <b>'+sg.cards+'</b> 张知识卡</div>'+
        '<button class="feed-play" style="margin-top:8px" onclick="adoptDailyGoal('+sg.study+')">✅ 一键采纳并生成打卡项</button></div>';
    }
    const goals=rep.goals||[];
    const done=state.modules.schedule.panels.daily.filter(function(it){return it.auto&&goals.some(function(g){return g&&it.task&&it.task.indexOf(g.replace(/^专注学习 \d+ 分钟$/,"").slice(0,4))>=0;});}).length;
    const pct=goals.length?Math.round(done/goals.length*100):0;
    const subs=goalSubProgress(goals,sg);
    const subHtml=subs.map(function(s){return '<div class="goal-sub'+(s.done?" done":"")+'"><span class="gs-ic">'+(s.done?"✅":s.ic)+'</span><span class="gs-t">'+esc(s.label)+'</span><span class="gs-p">'+s.cur+(s.target?("/"+s.target):"")+'</span></div>';}).join("");
    return '<div class="card goal-card"><h3>🎯 今日目标</h3>'+
      '<div class="goal-bar"><div class="goal-bar-fill" style="width:'+pct+'%"></div></div>'+
      '<div class="mini-note">今日目标完成 '+pct+'%</div>'+
      '<div class="goal-subs">'+subHtml+'</div>'+
      '<div class="modal-ops" style="margin-top:6px"><button class="link-btn" onclick="showModule(\'schedule\')">去勾选 ›</button><button class="link-btn" onclick="adoptDailyGoal('+sg.study+')">重新设定</button></div></div>';
  }catch(e){return '';}
}
function goalSubProgress(goals,sg){
  const t=todayStr();
  // 学习：今日专注学习分钟（cet/gongkao/knowledge/studyclub study 含折算 + 专注打卡项 done）
  let studyMin=0;
  ["cet","gongkao","knowledge","studyclub"].forEach(function(id){const st=(state.modules[id]&&state.modules[id].study)||{};if(st[t])studyMin+=numOf(st[t])||0;});
  const focusDone=state.modules.schedule.panels.daily.filter(function(it){return it.auto&&/^专注学习/.test(it.task||"")&&it.done;});
  focusDone.forEach(function(it){const m=(it.task||"").match(/(\d+)/);if(m)studyMin+=parseInt(m[1]);});
  const studyTarget=sg.study;
  const studyDone=studyMin>=studyTarget;
  // 待办：清空今日待办清单项 done
  const undoneDone=state.modules.schedule.panels.daily.some(function(it){return it.auto&&it.task==="清空今日待办清单"&&it.done;});
  // 知识卡：今日复习/掌握数
  const cardDone=(allCards()).filter(function(c){return (c.lastReview===t)||(c.status==="mastered"&&(c.lastReview===t));}).length;
  const cardTarget=Math.max(1,sg.cards);
  return [
    {ic:"🍅",label:"专注学习",cur:Math.min(studyMin,studyTarget),target:studyTarget+" 分",done:studyDone},
    {ic:"✅",label:"清空今日待办",cur:undoneDone?1:0,target:"",done:undoneDone},
    {ic:"📚",label:"消化知识卡",cur:Math.min(cardDone,cardTarget),target:cardTarget+" 张",done:cardDone>=cardTarget}
  ];
}
function renderMonthDash(){
  try{
    const ym=todayStr().slice(0,7);
    const studyMin=monthStudyMin(ym);
    const now=new Date();const day=now.getDate();
    const monthCheckin=state.meta.checkinDays.filter(function(d){return d.indexOf(ym)===0;}).length;
    const rate=day>0?Math.round(monthCheckin/day*100):0;
    let weightDelta="—";
    const body=(state.modules.refinement&&state.modules.refinement.panels.body)||[];
    const ws=body.map(function(it){return {d:it.date,w:numOf(it.weight)};}).filter(function(x){return x.w!=null&&x.d;}).sort(function(a,b){return a.d<b.d?-1:1;});
    if(ws.length>=2){const a=ws[0].w,b=ws[ws.length-1].w;weightDelta=(b-a>0?"+":"")+(b-a).toFixed(1)+" kg";}
    else if(ws.length===1){weightDelta=ws[0].w+" kg";}
    const allC=allCards();
    const newCardsMonth=allC.filter(function(c){return (c.time||"").slice(0,7)===ym;}).length;
    const mastered=allC.filter(function(c){return c.status==="mastered";}).length;
    const masteredRate=allC.length?Math.round(mastered/allC.length*100):0;
    const pendingReview=allC.filter(function(c){return c.status!=="mastered"&&reviewDaysLeft(c)<=0;}).length;
    const chartSvg2='<svg class="svg-ic" viewBox="0 0 24 24" width="18" height="18" style="vertical-align:-4px;margin-right:4px"><rect x="4" y="10" width="4" height="10" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><rect x="16" y="7" width="4" height="13" rx="1"/></svg>';
    return '<div class="card dash-card"><h3>'+chartSvg2+'本月数据看板 · '+ym+'</h3>'+
      '<div class="dash-grid">'+
      '<div class="dash-item"><b>'+studyMin+'</b><span>本月学习(分钟)</span></div>'+
      '<div class="dash-item"><b>'+rate+'%</b><span>打卡完成率</span></div>'+
      '<div class="dash-item"><b>'+monthCheckin+'</b><span>本月打卡(天)</span></div>'+
      '<div class="dash-item"><b>'+weightDelta+'</b><span>体重变化</span></div>'+
      '<div class="dash-item"><b>'+newCardsMonth+'</b><span>本月新增知识卡</span></div>'+
      '<div class="dash-item"><b>'+masteredRate+'%</b><span>知识掌握率</span></div>'+
      '<div class="dash-item"><b>'+pendingReview+'</b><span>待巩固卡片</span></div>'+
      '</div>'+
      renderHeatmap()+'</div>';
  }catch(e){return '';}
}
function aggregateCalendar(){
  // 汇总各栏目“有日期”的活动，返回 { 'YYYY-MM-DD': count }
  const map={};
  const add=function(d,c){ if(!d)return; map[d]=(map[d]||0)+(c||1); };
  const ymd=function(s){ return (s||"").slice(0,10); };
  try{
    for(const id in MODULE_DEFS){
      const m=state.modules[id]; if(!m) continue;
      const def=MODULE_DEFS[id];
      const panels=m.panels||{};
      (def.panels||[]).forEach(function(p){
        const arr=panels[p.key]||[];
        if(p.type==="checklist"){
          arr.forEach(function(it){ if(it.doneDate) add(ymd(it.doneDate),1); });
        } else if(p.type==="table"){
          arr.forEach(function(it){
            const d=it.date||it.time||it.day||it.d;
            if(d) add(ymd(d),1);
          });
        } else if(p.type==="progress"){
          arr.forEach(function(it){ if(it.doneDate) add(ymd(it.doneDate),1); });
        }
      });
      // 专注学习时长折算（study[date]=分钟）
      const st=m.study||{};
      for(const k in st){ if((numOf(st[k])||0)>0) add(ymd(k),1); }
    }
    // 记账本
    (state.modules.money&&state.modules.money.panels&&state.modules.money.panels.book||[]).forEach(function(r){ if(r.date) add(ymd(r.date),1); });
    // 心情日记
    (state.modules.mood&&state.modules.mood.logs||[]).forEach(function(r){ if(r.date) add(ymd(r.date),1); });
    // 知识卡片（新增/复习折算为活动）
    allCards().forEach(function(c){
      if(c.time) add(ymd(c.time),1);
      if(c.lastReview) add(ymd(c.lastReview),1);
    });
    // 投喂记录
    (state.modules.feedbox&&state.modules.feedbox.feeds||[]).forEach(function(r){ if(r.time) add(ymd(r.time),1); });
    // 读书笔记 reading 记录
    const bk=state.modules.books; if(bk&&bk.panels){ (bk.panels.reading||[]).forEach(function(r){ if(r.date) add(ymd(r.date),1); }); }
  }catch(e){ console.warn('aggregateCalendar failed',e); }
  return map;
}
function calStreak(map){
  // 当前连续活跃天数（若今天无记录则从昨天倒推，避免“今天还没做就断签”）
  function ds(x){ return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0"); }
  let d=new Date();
  if(!map[ds(d)]) d.setDate(d.getDate()-1);
  let streak=0;
  while(map[ds(d)]){ streak++; d.setDate(d.getDate()-1); }
  return streak;
}
function dayDiff(a,b){
  const da=new Date(a+'T00:00:00'), db=new Date(b+'T00:00:00');
  return Math.round((db-da)/86400000);
}
// 由一组 doneDate 计算「当前连击」与「累计打卡次数」
function streakOf(doneDates){
  const set=doneDates.filter(Boolean).map(function(d){return (d||"").slice(0,10);}).filter(Boolean);
  if(!set.length) return {streak:0,total:0};
  const uniq={}; set.forEach(function(d){ uniq[d]=1; });
  const keys=Object.keys(uniq).sort();
  const total=keys.length;
  // 当前连击：从今天（或昨天）往前数
  function ds(x){return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");}
  let d=new Date(); if(!uniq[ds(d)]) d.setDate(d.getDate()-1);
  let streak=0;
  while(uniq[ds(d)]){ streak++; d.setDate(d.getDate()-1); }
  return {streak:streak,total:total};
}
/* 每日自动快照：把当天真实产生的活动固化为「打卡日」，让养成日历随真实日期逐步生长 */
function stampDaily(){
  const t=todayStr();
  const map=aggregateCalendar();
  state.meta.checkinDays=state.meta.checkinDays||[];
  if(map[t] && !state.meta.checkinDays.includes(t)){ state.meta.checkinDays.push(t); }
  // 每日日志：记录当天概要，供时间轴/复盘使用
  state.meta.dailyLog=state.meta.dailyLog||{};
  if(map[t]){
    state.meta.dailyLog[t]={date:t,count:map[t],stamped:true};
  }
  // 仅当确有变化时才写盘
  try{ save(); }catch(e){}
}
/* 首次启动时，依据已有记录回填最近若干天的「打卡日」，让日历一开始就呈现连续的养成星河 */
function seedHistory(){
  try{
    state.meta.checkinDays=state.meta.checkinDays||[];
    state.meta.dailyLog=state.meta.dailyLog||{};
    const map=aggregateCalendar();
    Object.keys(map).forEach(function(d){
      if(!state.meta.checkinDays.includes(d)) state.meta.checkinDays.push(d);
      if(!state.meta.dailyLog[d]) state.meta.dailyLog[d]={date:d,count:map[d],stamped:true};
    });
    save();
  }catch(e){}
}
function renderCalendar(){
  try{
    const v=$("#view-module");
    navSmall();
    const tb=$("#topTitle"); if(tb)tb.innerHTML=icon('calendar',18)+' 养成日历';
    const calView=(state.meta.calView)||'heat';
    if(calView==='month'){ renderCalMonth(); return; }
    const map=aggregateCalendar();
    const dates=Object.keys(map);
    const totalDays=dates.length;
    const maxCount=Math.max(1,Math.max.apply(null,dates.map(d=>map[d])));
    const streak=calStreak(map);
    // 计算最长连续
    let best=0,cur=0,prev=null;
    const sorted=dates.slice().sort();
    sorted.forEach(function(d){
      if(prev && dayDiff(prev,d)===1){ cur++; } else { cur=1; }
      if(cur>best)best=cur; prev=d;
    });
    // 构建近 53 周热力图（周日为列起点）
    const today=new Date();
    const end=new Date(today); end.setDate(end.getDate()+1); // 含今天
    const start=new Date(end); start.setDate(start.getDate()-53*7);
    // 对齐到周日
    start.setDate(start.getDate()-start.getDay());
    const cols=[];let col=[];let cursor=new Date(start);
    const monthLbl=[];
    while(cursor<=end){
      const ds=cursor.getFullYear()+"-"+String(cursor.getMonth()+1).padStart(2,"0")+"-"+String(cursor.getDate()).padStart(2,"0");
      col.push({ds:ds,count:map[ds]||0});
      if(col.length===7){ cols.push(col); col=[]; }
      cursor.setDate(cursor.getDate()+1);
    }
    if(col.length) cols.push(col);
    // 月标签（取每列第一格月份变化）
    let lastM="";
    const monthMarks=cols.map(function(c,i){
      const m=c[0].ds.slice(5,7);
      if(m!==lastM){ lastM=m; return {i:i,label:(parseInt(m,10))+"月"}; }
      return null;
    }).filter(Boolean);
    // 颜色
    function lvl(c){ if(c<=0)return 0; if(c>=maxCount)return 4; return Math.min(4,Math.ceil(c/maxCount*4)); }
    const cell=14,gap=5;
    let svg='<svg class="cal-heat" viewBox="0 0 '+(cols.length*(cell+gap)+34)+' '+(7*(cell+gap)+28)+'" width="100%" preserveAspectRatio="xMinYMin meet" style="max-width:'+(cols.length*(cell+gap)+34)+'px">';
    // 月标签
    monthMarks.forEach(function(mk){ const x=34+mk.i*(cell+gap); svg+='<text x="'+x+'" y="10" class="cal-m">'+mk.label+'</text>'; });
    // 星期标签（单数行 + 周日）
    ["一","二","三","四","五","六","日"].forEach(function(t,i){ if(i%2===0||i===6){ svg+='<text x="2" y="'+(20+i*(cell+gap)+cell-2)+'" class="cal-wd">'+t+'</text>'; } });
    cols.forEach(function(c,ci){
      c.forEach(function(cellObj,ri){
        const x=34+ci*(cell+gap), y=20+ri*(cell+gap);
        const on=cellObj.count>0; const cls='cal-cell'+(on?' cal-cell-on lvl'+lvl(cellObj.count):'');
        svg+='<rect x="'+x+'" y="'+y+'" width="'+(cell-1)+'" height="'+(cell-1)+'" rx="4" class="'+cls+'" data-date="'+cellObj.ds+'" onclick="calDayDetail(\''+cellObj.ds+'\')"'+(on?' data-tip="'+cellObj.ds+'：'+cellObj.count+' 项活动"':'')+'><title>'+cellObj.ds+(on?(' · '+cellObj.count+' 项活动'):' · 无记录')+'</title></rect>';
      });
    });
    svg+='</svg>';
    // 各栏目贡献（按活动数排序）
    const contrib={};
    function bump(id,c){ contrib[id]=(contrib[id]||0)+c; }
    for(const id in MODULE_DEFS){ const def=MODULE_DEFS[id]; const m=state.modules[id]; if(!m||!def.panels)continue;
      (def.panels||[]).forEach(function(p){ const arr=(m.panels||{})[p.key]||[];
        if(p.type==="checklist") arr.forEach(function(it){ if(it.doneDate) bump(id,1); });
        else if(p.type==="table") arr.forEach(function(it){ if(it.date||it.time) bump(id,1); });
        else if(p.type==="progress") arr.forEach(function(it){ if(it.doneDate) bump(id,1); });
      });
      const st=m.study||{}; for(const k in st){ if((numOf(st[k])||0)>0) bump(id,1); }
    }
    (state.modules.money&&state.modules.money.panels.book||[]).forEach(r=>{if(r.date)bump('money',1);});
    (state.modules.mood&&state.modules.mood.logs||[]).forEach(r=>{if(r.date)bump('mood',1);});
    allCards().forEach(c=>{ if(c.time)bump('studyclub',1); if(c.lastReview)bump('studyclub',1); });
    (state.modules.feedbox&&state.modules.feedbox.feeds||[]).forEach(r=>{if(r.time)bump('feedbox',1);});
    const contribArr=Object.keys(contrib).map(id=>({id,label:COLUMN_TITLES[id]||id,val:contrib[id]})).sort(function(a,b){return b.val-a.val;}).slice(0,8);
    const contribHtml=contribArr.length?'<div class="cal-contrib">'+
      contribArr.map(function(c){ return '<span class="cc-item">'+icon(MODULE_DEFS[c.id]?MODULE_DEFS[c.id].icon:'star',13)+' '+esc(c.label)+' <b>'+c.val+'</b></span>'; }).join('')+
      '</div>':'<div class="mini-note">还没有任何活动记录，去各栏目打卡、记账、记心情后，这里会画出你的养成星河。</div>';
    v.setAttribute('data-curmod','calendar');
    v.innerHTML=
      '<div class="card cal-card">'+
        '<h3>'+icon('calendar',16)+' 养成日历</h3>'+
        '<div class="cal-view-toggle">'+
          '<button class="cal-vt'+(calView==='heat'?' on':'')+'" onclick="setCalView(\'heat\')">'+icon('fire',13)+' 热力图</button>'+
          '<button class="cal-vt'+(calView==='month'?' on':'')+'" onclick="setCalView(\'month\')">'+icon('calendar',13)+' 月历</button>'+
        '</div>'+
        '<div class="cal-hero">'+
          '<div class="cal-stat"><b>'+streak+'</b><span>当前连续(天)</span></div>'+
          '<div class="cal-stat"><b>'+totalDays+'</b><span>累计活跃(天)</span></div>'+
          '<div class="cal-stat"><b>'+best+'</b><span>最长连续(天)</span></div>'+
        '</div>'+
        '<div class="cal-sub">近 53 周养成热力图 · 颜色越深 = 当天活动越多</div>'+
        '<div class="cal-heat-wrap">'+svg+'</div>'+
        '<div class="cal-legend">少'+[0,1,2,3,4].map(function(i){return '<span class="cl '+(i?'cal-on lvl'+i:'cal-off')+'"></span>';}).join('')+'多</div>'+
        '<div class="cal-sec-title">'+icon('fire',15)+' 各栏目贡献</div>'+
        contribHtml+
      '</div>';
    applyBentoBackdrop(state.meta.material||"glass");
  }catch(e){
    const v=$("#view-module"); if(v)v.innerHTML='<div class="card" style="margin-top:20px"><h3>日历加载失败</h3><div class="mini-note">'+esc(e.message)+'</div><div class="modal-ops"><button class="save" onclick="showHome()">返回首页</button></div></div>';
    console.warn('renderCalendar failed',e);
  }
}
function setCalView(view){ state.meta.calView=view; save(); try{ renderCalendar(); }catch(e){ console.warn('setCalView失败',e); } }
function renderCalMonth(){
  try{
    const v=$("#view-module");
    const tb=$("#topTitle"); if(tb)tb.innerHTML=icon('calendar',18)+' 养成日历';
    const map=aggregateCalendar();
    const now=new Date();
    const ym=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
    const year=now.getFullYear(), month=now.getMonth();
    const first=new Date(year,month,1);
    const start=new Date(year,month,1-first.getDay());
    const cells=[];
    for(let i=0;i<42;i++){ const d=new Date(start); d.setDate(start.getDate()+i);
      const ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
      const cnt=map[ds]||0;
      cells.push({ds:ds,d:d,cur:(d.getMonth()===month),cnt:cnt});
    }
    const maxC=Math.max(1,Math.max.apply(null,cells.map(c=>c.cnt)));
    const totals=[0,0,0,0];
    // 本月在册天数与活动
    let activeDays=0,totalActs=0;
    cells.forEach(c=>{ if(c.cur&&c.cnt>0){activeDays++;totalActs+=c.cnt;} });
    let html='<div class="card cal-card">'+
      '<h3>'+icon('calendar',16)+' 养成日历</h3>'+
      '<div class="cal-view-toggle">'+
        '<button class="cal-vt" onclick="setCalView(\'heat\')">'+icon('fire',13)+' 热力图</button>'+
        '<button class="cal-vt on" onclick="setCalView(\'month\')">'+icon('calendar',13)+' 月历</button>'+
      '</div>'+
      '<div class="cal-hero">'+
        '<div class="cal-stat"><b>'+activeDays+'</b><span>本月打卡(天)</span></div>'+
        '<div class="cal-stat"><b>'+totalActs+'</b><span>本月活动(次)</span></div>'+
        '<div class="cal-stat"><b>'+monthStudyMin(ym)+'</b><span>学习(分)</span></div>'+
      '</div>'+
      '<div class="cal-month-grid">'+
        ['日','一','二','三','四','五','六'].map(w=>'<span class="cm-wd">'+w+'</span>').join('')+
        cells.map(function(c){
          const lvl=c.cnt>0?Math.min(4,Math.ceil(c.cnt/maxC*4)):0;
          const cls='cm-cell'+(c.cur?' cm-cur':'')+(c.cnt>0?' cm-on lvl'+lvl:'');
          return '<span class="'+cls+'" onclick="calDayDetail(\''+c.ds+'\')">'+c.d.getDate()+(c.cnt>0?'<i class="cm-dot"></i>':'')+'</span>';
        }).join('')+
      '</div>'+
      '<div class="cal-legend">少'+[0,1,2,3,4].map(function(i){return '<span class="cl '+(i?'cal-on lvl'+i:'cal-off')+'"></span>';}).join('')+'多</div>'+
      '<div class="cal-sub">点任意日期查看当天明细 · 圆点表示有记录</div>'+
    '</div>';
    v.setAttribute('data-curmod','calendar');
    v.innerHTML=html;
    applyBentoBackdrop(state.meta.material||"glass");
  }catch(e){
    const v=$("#view-module"); if(v)v.innerHTML='<div class="card" style="margin-top:20px"><h3>月历加载失败</h3><div class="mini-note">'+esc(e.message)+'</div></div>';
    console.warn('renderCalMonth failed',e);
  }
}
function showCalendar(){
  currentView="calendar";saveLastView();$("#view-home").classList.remove("active");$("#view-module").classList.add("active");navSmall();
  $("#topTitle").innerHTML=icon('calendar',18)+' 养成日历';renderCalendar();renderDrawer();renderBotTab();
}
function calDayDetail(dateStr){
  try{
    if(!dateStr) return;
    const items=[];
    const push=function(id,txt,kind){ items.push({id:id,label:COLUMN_TITLES[id]||id,text:txt,kind:kind}); };
    for(const id in MODULE_DEFS){
      const def=MODULE_DEFS[id]; const m=state.modules[id]; if(!m||!def.panels) continue;
      (def.panels||[]).forEach(function(p){
        const arr=(m.panels||{})[p.key]||[];
        if(p.type==="checklist") arr.forEach(function(it){ if(it.doneDate===dateStr){ let t=(p.fields||[]).map(function(f){return it[f.name];}).filter(Boolean).join(" · "); push(id,t||"(打卡)",'check'); } });
        else if(p.type==="table") arr.forEach(function(it){ const d=it.date||it.time||it.day||it.d; if(d===dateStr){ const txt=Object.keys(it).filter(function(k){return !["id","date","time","day","d","note"].includes(k);}).map(function(k){return it[k];}).filter(Boolean).join(" · "); push(id,txt||"(记录)",'table'); } });
        else if(p.type==="progress") arr.forEach(function(it){ if(it.doneDate===dateStr) push(id,(it.text||it.goal||"(达成)"),'progress'); });
      });
      const st=m.study||{}; if((numOf(st[dateStr])||0)>0) push(id,'专注学习 '+Math.round(numOf(st[dateStr]))+' 分钟','study');
    }
    (state.modules.money&&state.modules.money.panels.book||[]).forEach(function(r){ if(r.date===dateStr) push('money',(r.kind==='income'?'收入 ':'支出 ')+(numOf(r.amount)||0)+' 元'+(r.note?(' · '+r.note):''),'money'); });
    (state.modules.mood&&state.modules.mood.logs||[]).forEach(function(r){ if(r.date===dateStr) push('mood',(r.mood||'')+(r.note?(' · '+r.note):''),'mood'); });
    allCards().forEach(function(c){ if((c.time||'').slice(0,10)===dateStr) push('studyclub','新增知识卡：'+(c.title||''),'card'); if((c.lastReview||'').slice(0,10)===dateStr) push('studyclub','复习知识卡：'+(c.title||''),'card'); });
    (state.modules.feedbox&&state.modules.feedbox.feeds||[]).forEach(function(r){ if((r.time||'').slice(0,10)===dateStr) push('feedbox','投喂：'+(r.title||r.url||''),'feed'); });
    let html='<h3>'+icon('calendar',16)+' '+dateStr+'</h3>';
    if(!items.length){
      html+='<div class="empty-state" style="padding:18px 0"><div class="es-illu">'+emptyIllu('calendar')+'<span class="es-deco">✿</span></div><div class="es-tip">这一天没有记录</div><div class="es-sub">去各栏目打卡、记账、记心情，让星河更亮。</div></div>';
    } else {
      html+='<div class="cal-day-list">'+items.map(function(it){
        return '<div class="cd-item"><span class="cd-ic">'+icon(MODULE_DEFS[it.id]?MODULE_DEFS[it.id].icon:'star',14)+'</span>'+
          '<div class="cd-body"><div class="cd-lab">'+esc(it.label)+'</div><div class="cd-tx">'+esc(it.text)+'</div></div></div>';
      }).join('')+'</div>';
      html+='<div class="modal-ops"><button class="save" onclick="closeModal();showModule(\''+items[0].id+'\')">查看「'+esc(items[0].label)+'」</button></div>';
    }
    $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
  }catch(e){ console.warn('calDayDetail failed',e); }
}
function monthStudyMin(ym){
  let total=0;
  ["cet","gongkao","knowledge","studyclub"].forEach(function(id){
    const st=(state.modules[id]&&state.modules[id].study)||{};
    for(const k in st){if(k.indexOf(ym)===0)total+=numOf(st[k])||0;}
  });
  // 知识卡片新增/复习折算为学习投入（新增 15 分/张，复习 10 分/张）
  allCards().forEach(function(c){
    const ct=(c.time||"").slice(0,7);const rt=(c.lastReview||"").slice(0,7);
    if(ct===ym)total+=15;
    if(rt===ym)total+=10;
  });
  return total;
}
function dayStudyMin(dateStr){
  let total=0;
  ["cet","gongkao","knowledge","studyclub"].forEach(function(id){
    const st=(state.modules[id]&&state.modules[id].study)||{};
    total+=numOf(st[dateStr])||0;
  });
  // 知识卡片新增/复习折算（新增 15 分/张，复习 10 分/张）
  const ds=dateStr;
  allCards().forEach(function(c){
    if((c.time||"").slice(0,10)===ds)total+=15;
    if((c.lastReview||"").slice(0,10)===ds)total+=10;
  });
  return total;
}
function renderHeatmap(){
  try{
    // 近 12 周（84 天）学习热力图，canvas 渲染
    const days=84;const cells=[];const today=new Date();
    for(let i=days-1;i>=0;i--){
      const d=new Date(today);d.setDate(today.getDate()-i);
      const ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
      cells.push({ds:ds,min:dayStudyMin(ds)});
    }
    const max=Math.max(30,Math.max.apply(null,cells.map(c=>c.min)));
    const W=7,H=12,cell=12,gap=3,pad=4;
    const cw=W*(cell+gap)+pad*2, ch=H*(cell+gap)+pad*2+16;
    let html='<div class="heatmap"><div class="heatmap-title">🔥 近 12 周学习热力图（颜色越深=投入越多）</div>'+
      '<canvas id="heatCanvas" width="'+cw+'" height="'+ch+'" style="width:100%;max-width:'+cw+'px;height:auto"></canvas>'+
      '<div class="heatmap-legend">少<span class="hg" style="background:'+heatColor(0,max)+'"></span><span class="hg" style="background:'+heatColor(max*0.34,max)+'"></span><span class="hg" style="background:'+heatColor(max*0.67,max)+'"></span><span class="hg" style="background:'+heatColor(max,max)+'"></span>多</div></div>';
    html+='<script>setTimeout(function(){drawHeatmap('+JSON.stringify(cells)+','+max+');},0);<\/script>';
    return html;
  }catch(e){return '';}
}
function heatColor(min,max){
  const t=max>0?Math.min(1,min/max):0;
  // 从浅绿到深绿
  const r=Math.round(200-150*t),g=Math.round(230-90*t),b=Math.round(200-120*t);
  return "rgb("+r+","+g+","+b+")";
}
function drawHeatmap(cells,max){
  const cv=document.getElementById("heatCanvas");if(!cv)return;
  const ctx=cv.getContext("2d");ctx.clearRect(0,0,cv.width,cv.height);
  const W=7,cell=12,gap=3,pad=4;
  ctx.font="9px sans-serif";ctx.fillStyle="#999";
  ctx.fillText("周一",2,12);ctx.fillText("周日",2,12+6*(cell+gap));
  cells.forEach(function(c,idx){
    const col=Math.floor(idx/W),row=idx%W;
    const x=pad+col*(cell+gap),y=pad+14+row*(cell+gap);
    ctx.fillStyle=heatColor(c.min,max);
    ctx.fillRect(x,y,cell,cell);
  });
}

function computeStats(){
  try {
    const today=todayStr();let done=0,total=0,records=0;
    for(const id in MODULE_DEFS){
      if(!MODULE_DEFS[id]||!MODULE_DEFS[id].panels) continue;
      MODULE_DEFS[id].panels.forEach(p=>{
        if(!p) return;
        const arr=state.modules[id].panels[p.key]||[];
        if(p.type==="checklist"){arr.forEach(it=>{total++;records++;if(it.doneDate===today){done++;}});}
        else if(p.type==="progress"){arr.forEach(it=>{total++;records++;const cur=numOf(it.cur),goal=numOf(it.goal);const reached=(cur!=null&&goal!=null&&goal>0&&cur>=goal);if(it.doneDate===today||reached)done++;});}
        else if(p.type==="study"){const sd=(state.modules[id].study&&state.modules[id].study[today])||0;records+=arr.length;if(sd>0){total++;done++;}}
        else if(p.type==="table"||p.type==="cards"||p.type==="countdown"){records+=arr.length;}
      });
    }
    let streak=0;const set=new Set(state.meta.checkinDays);let d=new Date();
    while(set.has(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"))){streak++;d.setDate(d.getDate()-1);}
    return {streak,done,total,records,usageDays:state.meta.usageDays.length};
  } catch(e) {
    console.warn('统计计算失败', e);
    return {streak:0, done:0, total:0, records:0, usageDays:0};
  }
}
