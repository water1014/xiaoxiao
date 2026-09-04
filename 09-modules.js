/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 09/18
   文件：js/09-modules.js
   来源：原 index.html 第 22851–23927 行
   内容：首页 Bento 看板 + 今日概览/心情/待办 + 模块渲染 + 板块拖拽 + 周月报 + 成就分享卡
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ============ 首页 Bento Grid 看板 ============ */
function bentoData(){
  const now=new Date();const ym=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const studyMin=monthStudyMin(ym);
  const st=computeStats();
  const cards=allCards();
  const total=cards.length;
  const mastered=cards.filter(function(c){return c.status==="mastered";}).length;
  const rate=total?Math.round(mastered/total*100):0;
  return {studyMin,streak:st.streak,cardTotal:total,rate};
}
function renderBento(){
  const d=bentoData();
  const ICON={study:icon('brain'),fire:icon('fire'),brain:icon('brain'),rate:icon('checkCircle')};
  const ring='<svg class="bc-ring" viewBox="0 0 44 44" width="44" height="44">'+
    '<circle cx="22" cy="22" r="18" fill="none" stroke="var(--glass-border)" stroke-width="4"/>'+
    '<circle cx="22" cy="22" r="18" fill="none" stroke="url(#bcGrad)" stroke-width="4" stroke-linecap="round" '+
      'stroke-dasharray="'+(2*Math.PI*18).toFixed(1)+'" stroke-dashoffset="'+((2*Math.PI*18)*(1-d.rate/100)).toFixed(1)+'" transform="rotate(-90 22 22)"/>'+
    '<defs><linearGradient id="bcGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="var(--primary)"/><stop offset="100%" stop-color="var(--accent)"/></linearGradient></defs>'+
  '</svg>';
  return '<div class="bento">'+
    '<div class="bento-card wide bend-tone-study stagger-item" style="--bi:0">'+
      '<div class="bc-head"><span class="bh-ic">'+icon('chart',14)+'</span><span class="bh-tx">数据看板</span><span class="bh-sub">本月</span></div>'+
      '<div class="bc-ic">'+ICON.study+'</div>'+
      '<div class="bc-val">'+d.studyMin+'<span class="bc-unit">分钟</span></div>'+
      '<div class="bc-lb">本月学习时长</div>'+
    '</div>'+
    '<div class="bento-card stagger-item" style="--bi:1">'+
      '<div class="bc-ic">'+ICON.fire+'</div>'+
      '<div class="bc-val">'+d.streak+'<span class="bc-unit">天</span></div>'+
      '<div class="bc-lb">连续打卡</div>'+
    '</div>'+
    '<div class="bento-card stagger-item" style="--bi:2">'+
      '<div class="bc-ic">'+ICON.brain+'</div>'+
      '<div class="bc-val">'+d.cardTotal+'<span class="bc-unit">张</span></div>'+
      '<div class="bc-lb">知识卡片</div>'+
    '</div>'+
    '<div class="bento-card wide bend-tone-rate stagger-item" style="--bi:3">'+
      '<div class="bc-ring-wrap">'+ring+'<div class="bc-ring-val">'+d.rate+'<span class="bc-unit">%</span></div></div>'+
      '<div class="bc-ring-info"><div class="bc-lb">知识掌握率</div><div class="bc-sub2">已掌握 '+Math.round(d.cardTotal*d.rate/100)+' / '+d.cardTotal+' 张</div></div>'+
    '</div>'+
  '</div>';
}
/* ============ 首页『一直游到海水变蓝』主题装饰块 ============ */
/* 自包含：标题八字 + 诗句 + 三块纯 CSS 海面渐变图，无外链字体/图片依赖。
   默认不进首页，可在「排序 → 自定义」里开启；可见时加 .show 触发入场动画。 */
function renderYnBoard(){
  const chars=['一','直','游','到','海','水','变','蓝'];
  const cls=['yn-c1','yn-c2','yn-c3','yn-c4','yn-c5','yn-c6','yn-c7','yn-c8'];
  const title=chars.map(function(c,i){return '<span class="'+cls[i]+'">'+c+'</span>';}).join('');
  return '<div class="yn-board" data-home-block="ynboard" onclick="this.classList.add(\'show\')">'+
    '<div class="yn-dl d1"></div><div class="yn-dl d2"></div><div class="yn-dl d3"></div>'+
    '<div class="yn-dh h1"></div><div class="yn-dh h2"></div>'+
    '<div class="yn-fr f1"></div><div class="yn-fr f2"></div>'+
    '<div class="yn-tile t1"></div><div class="yn-tile t2"></div><div class="yn-tile t3"></div>'+
    '<div class="yn-title">'+title+'</div>'+
    '<div class="yn-poem">一直游到海水变蓝<span class="l2">把整片海，游成想念你的形状</span></div>'+
    '<div class="yn-en">UNTIL THE SEA TURNS BLUE</div>'+
    '<div class="yn-foot">— 鞠式工作台 · 潮湿雨季</div>'+
  '</div>';
}
/* 进入视口时给 yn-board 加 show 触发动画（IntersectionObserver 兜底） */
function initYnBoard(){
  try{
    const el=document.querySelector('.yn-board');
    if(!el) return;
    if(typeof IntersectionObserver!=='undefined'){
      const io=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){el.classList.add('show');io.disconnect();}});},{threshold:.2});
      io.observe(el);
    } else { el.classList.add('show'); }
  }catch(e){}
}

/* ============ 首页「今日概览」卡 ============ */
function todayOverviewData(){
  const today=todayStr();
  const st=computeStats(); // {streak,done,total,records,usageDays}
  const study=dayStudyMin(today);
  let exp=0;
  try{
    const recs=(state.modules.money&&state.modules.money.panels&&state.modules.money.panels.book)||[];
    recs.forEach(function(r){ if(r.date===today && r.kind!=="income") exp+=(numOf(r.amount)||0); });
  }catch(e){}
  let todos=0,todoDone=0;
  try{
    const arr=(state.modules.schedule&&state.modules.schedule.panels&&state.modules.schedule.panels.daily)||[];
    arr.forEach(function(it){ todos++; if(it.done)todoDone++; });
  }catch(e){}
  const checkRate=st.total>0?Math.round(st.done/st.total*100):0;
  const todoLeft=Math.max(0,todos-todoDone);
  return {done:st.done,total:st.total,streak:st.streak,study:study,exp:exp,todos:todos,todoDone:todoDone,todoLeft:todoLeft,checkRate:checkRate,today:today};
}
function renderTodayOverview(){
  const d=todayOverviewData();
  const pct=d.checkRate;
  const streak=calcStreak();
  const badge = pct>=100 ? '<span class="to-badge done">今日全勤</span>' : '<span class="to-badge">'+pct+'% 完成</span>';
  const streakBadge = streak>0 ? '<span class="to-streak" title="连续打卡天数">🔥 '+streak+' 天</span>' : '';
  // 完成率 + 待办项数 合并到「今日完成」格的副行，减少视觉负担
  const combo = pct+'% 完成率 · 待办 '+d.todoLeft+' 项';
  return '<div class="today-ov accent-check">'+
    '<div class="to-head"><span class="to-title">'+icon('calendar',16)+' 今日概览</span><span class="to-badges">'+badge+streakBadge+'</span></div>'+
    '<div class="to-grid">'+
      '<div class="to-cell" onclick="quickCheckModal()" aria-label="今日打卡"><span class="to-ic">'+icon('check',20)+'</span><span class="to-val">'+d.done+'<span class="to-sep">/</span>'+d.total+'</span><span class="to-lb">今日完成</span><span class="to-sub">'+combo+'</span></div>'+
      '<div class="to-cell" onclick="showModule(\'knowledge\')" aria-label="今日学习"><span class="to-ic">'+icon('clock',20)+'</span><span class="to-val">'+d.study+'<span class="to-unit">分</span></span><span class="to-lb">今日学习</span></div>'+
      '<div class="to-cell" onclick="showModule(\'money\')" aria-label="今日支出"><span class="to-ic">'+icon('yen',20)+'</span><span class="to-val">'+d.exp.toFixed(0)+'<span class="to-unit">元</span></span><span class="to-lb">今日支出</span></div>'+
    '</div>'+
  '</div>';
}

/* ============ 首页「今日心情」卡 ============ */
function renderHomeMood(){
  const today=moodToday();
  const t=today.length?today[today.length-1]:null;
  const cloud=recentMoodCloud(7);
  let h='<div class="card mood-home accent-mood" onclick="showModule(\'mood\')" style="cursor:pointer">';
  h+='<div class="mh-top"><span class="mh-t">'+icon('sparkle',16)+' 今日心情</span>';
  h+= t?('<span class="mood-badge">'+t.emoji+' '+(t.note?esc(t.note.slice(0,12)+(t.note.length>12?'…':'')):'记录一下')+'</span>')
        :('<span class="mood-badge" style="color:var(--gray)">点此记一笔 '+icon('edit',14)+'</span>');
  h+='</div>';
  if(cloud.length){
    h+='<div class="mood-cloud" style="margin-top:8px">'+cloud.map(function(c){return '<span class="mood-cloud-item" title="'+c.date+'">'+c.emoji+'</span>';}).join('')+'</div>';
  }
  h+='</div>';
  return h;
}
/* ============ 首页「今日待办」可勾选卡 ============ */
function renderHomeTodos(){
  // BUGFIX：此处原本写死 arr=[]，导致首页「今日待办」永远为空。
  // 数据源应与 homeToggleTodo 一致，取自 state.modules.schedule.panels.daily，并做全链路防御。
  let arr=(state.modules&&state.modules.schedule&&state.modules.schedule.panels&&state.modules.schedule.panels.daily)||[];
  if(!Array.isArray(arr))arr=[];
  arr=[...arr].sort(function(a,b){return (a.done?1:0)-(b.done?1:0);});
  const left=arr.filter(function(it){return !it.done;}).length;
  const list = arr.length ? arr.map(function(it){
    const tag = it.time ? '<span class="ht-tag">'+esc(it.time)+'</span>' : '';
    return '<div class="item" onclick="homeToggleTodo(\''+it.id+'\')" role="button" tabindex="0">'+
      '<div class="cb '+(it.done?'done':'')+'">'+(it.done?'✓':'')+'</div>'+
      '<div class="body">'+tag+esc(it.task||it.text||'(未命名待办)')+'</div>'+
    '</div>';
  }).join('') : '<div class="mini-note">今天还没有待办，点下方「+ 添加今日待办」开始</div>';
  return '<div class="card home-todos accent-check">'+
    '<h3>'+icon('edit',18)+' 今日待办 <span class="hh-count">'+left+' 项待做</span></h3>'+
    '<div class="ht-list">'+list+'</div>'+
    '<button class="ht-add" onclick="showModule(\'schedule\')">+ 添加今日待办</button>'+
  '</div>';
}
function homeToggleTodo(iid){
  try{
    const arr=(state.modules.schedule&&state.modules.schedule.panels&&state.modules.schedule.panels.daily)||[];
    const it=arr.find(function(x){return x.id===iid;}); if(!it)return;
    const wasDone=it.done; it.done=!it.done; it.doneDate=it.done?todayStr():null;
    const t=todayStr();
    if(it.done){ if(!state.meta.checkinDays.includes(t))state.meta.checkinDays.push(t); }
    else{ state.meta.checkinDays=state.meta.checkinDays.filter(function(x){return x!==t;}); }
    save(); renderHome(); haptic(it.done?12:6);
  }catch(e){}
}
// 跨栏目「今日全部待办」汇总：扫描所有 checklist 面板里未完成项
function renderGlobalTodos(){
  try{
    const today=todayStr();
    const groups=[];
    for(const id in MODULE_DEFS){
      const def=MODULE_DEFS[id]; if(!def.panels)continue;
      def.panels.forEach(function(p){
        if(p.type!=="checklist")return;
        const arr=(state.modules[id]&&state.modules[id].panels&&state.modules[id].panels[p.key])||[];
        const open=arr.filter(function(it){return !it.done;});
        if(!open.length)return;
        const label=COLUMN_TITLES[id]||def.title;
        open.forEach(function(it){
          const txt=(p.fields||[]).map(function(f){return it[f.name];}).filter(Boolean).join(" · ")||it.text||it.task||"(待办)";
          groups.push({id:id,label:label,mid:(it.time||""),txt:txt.slice(0,40)});
        });
      });
    }
    if(!groups.length) return '';
    const counts={}; groups.forEach(function(g){counts[g.label]=(counts[g.label]||0)+1;});
    const top=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];}).slice(0,4);
    return '<div class="card home-gtodos">'+
      '<h3>'+icon('check',18)+' 今日全部待办 <span class="hh-count">'+groups.length+' 项待做</span></h3>'+
      '<div class="gt-chips">'+top.map(function(l){return '<span class="gt-chip">'+esc(l)+' '+counts[l]+'</span>';}).join('')+'</div>'+
      '<div class="gt-list">'+groups.slice(0,8).map(function(g){
        return '<div class="item" onclick="showModule(\''+g.id+'\')" role="button">'+
          '<div class="cb"></div>'+
          '<div class="body"><span class="gt-from">'+esc(g.label)+'</span>'+esc(g.txt)+'</div>'+
        '</div>';
      }).join('')+'</div>'+
      (groups.length>8?'<div class="mini-note">还有 '+(groups.length-8)+' 项在其他栏目，点对应栏目查看</div>':'')+
    '</div>';
  }catch(e){ console.warn('renderGlobalTodos失败',e); return ''; }
}

/* ============ 模块渲染 ============ */
/* ============ 栏目统一布局规范 ============
   每个栏目界面自上而下固定分区（renderModule 统一装配）：
   1) 返回 + 标题栏（icon + 标题 + 一句话主张 quote）   ← 顶部 #topbar + mod-head
   2) 栏目配图 banner（点击换图）                      ← banner
   3) 核心数据卡（进度/连续天数/今日概览，Bento 式）    ← 专用卡（如 focus-card / 统计）
   4) 主体面板区（checklist/table/progress/study/photos…）← def.panels 顺序渲染
   5) 辅助区（专注计时 / AI 助手入口 / 视频 / 投喂）     ← 分支 + renderVideoArea + renderFeedArea
   6) 页脚留白                                          ← 卡片 margin
   各栏目只需维护 MODULE_DEFS.panels 顺序与专用卡即可保证一致美观。 */

/* ===== 栏目板块可拖拽排序 ===== */
function defaultSectionKeys(id){
  if(id==="calendar") return ['calendar'];
  if(id==="menstrual") return ['period','panel:records','settings'];
  if(id==="music") return ['banner','audio'];
  const def=MODULE_DEFS[id]; if(!def) return ['banner','feed'];
  const keys=['banner'];
  if(id==='cet'||id==='gongkao'){ keys.push('focus','ai'); }
  if(id==='refinement') keys.push('weight');
  if(id==='posture') keys.push('posture');
  if(id==='schedule') keys.push('schedule');
  if(id==='books') keys.push('books');
  if(id==='xiaohongshu') keys.push('xhs');
  def.panels.forEach(function(p){ keys.push('panel:'+p.key); });
  if(!(state.meta.videoOn&&state.meta.videoOn[id]===false)) keys.push('video');
  keys.push('feed');
  return keys;
}
function getModuleOrder(id){
  const def=defaultSectionKeys(id);
  const saved=(state.meta.moduleOrder&&state.meta.moduleOrder[id])||null;
  if(!saved) return def;
  const out=saved.filter(function(k){return def.indexOf(k)>=0;});
  def.forEach(function(k){ if(out.indexOf(k)<0) out.push(k); });
  return out;
}
// #6 增加合法性校验：过滤掉非本模块板块，防止脏数据导致渲染越界
function saveModuleOrder(id,order){
  try{
    const def=state.modules[id];
    if(def && def.sections){
      const valid=new Set(def.sections.map(function(s){return s.key;}));
      order=(order||[]).filter(function(k){return valid.has(k);});
      // 补齐缺失板块（保持默认顺序）
      def.sections.forEach(function(s){ if(order.indexOf(s.key)<0) order.push(s.key); });
    }
  }catch(e){ console.warn("saveModuleOrder 校验失败",e); }
  state.meta.moduleOrder=state.meta.moduleOrder||{};
  state.meta.moduleOrder[id]=order; save();
}
function sectionMeta(key,id){
  const map={
    banner:['image','栏目配图'], focus:['clock','专注计时'], ai:['ai','智能助手'],
    weight:['chart','体重趋势'], posture:['figure','体态变化'], schedule:['list','今日时间轴'],
    books:['book','阅读进度'], xhs:['link','小红书解析'], video:['video','视频区'], feed:['download','投喂区'],
    audio:['music','清音听雨阁']
  };
  if(map[key]) return map[key];
  if(key.indexOf('panel:')===0){
    const def=MODULE_DEFS[id]; const k=key.slice(6);
    const p=def&&def.panels.find(function(x){return x.key===k;});
    return [p&&p.icon||'list', p?p.title:k];
  }
  return ['list',key];
}
function modSectionInner(id,key){
  const def=MODULE_DEFS[id];
  if(key==='banner'){
    const bimg=readImage("meta.images."+id);
    const bcov=(state.meta.coverStyle&&state.meta.coverStyle[id])||{mode:"cover",x:0,y:0,scale:1};
    const bfilter=BANNER_FILTER[id]?("filter:"+BANNER_FILTER[id]+";"):"";
    const bimgHtml=bimg?('<div class="banner-img" style="background-image:url('+bimg+');'+coverCss(bcov)+';'+coverFilterCss()+'"></div>'):'';
    return '<div class="banner" onclick="openCoverEditor(\''+id+'\')">'+bimgHtml+'<span class="bcap">点击设置 / 调整栏目配图</span></div>';
  }
  if(key==='focus'){
    const goalMin=(state.modules[id].focusGoal)||25;
    return '<div class="card focus-card"><h3>'+icon('clock',16)+' 专注计时</h3>'+
      '<div class="focus-row"><span id="focusTime_'+id+'" class="focus-time">0:00</span><span id="focusBtns_'+id+'" class="focus-btns"><button class="feed-play" onclick="startFocus(\''+id+'\')">'+icon('play',14)+' 开始专注</button></span></div>'+
      '<div class="mini-note">点击开始计时，暂停/结束后自动计入下方「学习时长」。可设番茄钟目标时长，到点提醒。</div>'+
      '<div class="field" style="margin-top:8px"><label>'+icon('fire',14)+' 目标时长（分钟）</label><input type="number" id="focusGoal_'+id+'" value="'+goalMin+'" min="1" style="padding:8px 10px;border:1px solid var(--glass-border);border-radius:var(--radius-sm);background:var(--glass-flat);color:var(--text)" onchange="setFocusGoal(\''+id+'\',this.value)"></div>'+
      '</div>';
  }
  if(key==='ai'){
    return '<div class="card mod-widget"><h3>'+icon('ai',16)+' 智能助手</h3>'+
      '<div class="mini-note">已配置 AI Key 后，可一键获得专属答疑 / 规划建议。</div>'+
      '<div class="modal-ops" style="margin-top:8px"><button class="feed-play" onclick="openAIModal()">问 AI · 今日规划 / 考点答疑</button></div></div>';
  }
  if(key==='weight'){
    const body=(state.modules.refinement.panels.body||[]).filter(function(r){return r&&r.weight&&!isNaN(parseFloat(r.weight));});
    const vals=body.map(function(r){return parseFloat(r.weight);});
    const latest=body.length?body[body.length-1].weight:'—';
    const first=body.length?body[0].weight:'—';
    const diff=(body.length>=2)?(parseFloat(latest)-parseFloat(first)):0;
    return '<div class="card mod-widget"><h3>'+icon('chart',16)+' 体重趋势</h3>'+
      '<div class="spark-wrap">'+(sparklineSVG(vals)||'<div class="mini-note">记录 2 条及以上体重后显示趋势曲线</div>')+'</div>'+
      '<div class="trend-foot"><span>最新 <b>'+esc(latest)+'</b></span>'+(body.length>=2?'<span class="'+(diff<0?'down':'up')+'">'+(diff<0?'▼ ':'▲ ')+(diff>0?'+':'')+diff.toFixed(1)+' kg</span>':'')+'</div>'+
      '</div>';
  }
  if(key==='posture'){
    const rows=(state.modules.posture.panels.monthly||[]).filter(function(r){return r&&r.weight&&!isNaN(parseFloat(r.weight));});
    const wv=rows.map(function(r){return parseFloat(r.weight);});
    const wTb=rows.length?'<div class="spark-wrap">'+(sparklineSVG(wv)||'<div class="mini-note">记录体重后显示曲线</div>')+'</div>':'<div class="mini-note">在「月度记录」里记体重/腰围后，这里会画出趋势线</div>';
    const lw=rows.length?rows[rows.length-1].weight:'—';
    return '<div class="card mod-widget"><h3>'+icon('figure',16)+' 体态变化</h3>'+wTb+'<div class="trend-foot"><span>最新体重 <b>'+esc(lw)+'</b></span></div></div>';
  }
  if(key==='schedule'){
    const segs=(state.modules.schedule.panels.segments||[]);
    const done=(state.modules.schedule.panels.daily||[]).filter(function(d){return d.done;}).length;
    const total=(state.modules.schedule.panels.daily||[]).length;
    const tl=segs.length?segs.map(function(s){
      const t=(s.time||"").replace(/^[^\u4e00-\u9fa5]+/,"");
      return '<div class="tl-row"><span class="tl-dot"></span><span class="tl-time">'+esc(t)+'</span><span class="tl-task">'+esc(s.task||"")+'</span></div>';
    }).join(''):'<div class="mini-note">在「任务模板」里添加一天节奏，这里会变成时间轴</div>';
    return '<div class="card mod-widget"><h3>'+icon('list',16)+' 今日时间轴</h3>'+tl+
      (total?'<div class="trend-foot"><span>今日待办 <b>'+done+'/'+total+'</b> 已完成</span></div>':'')+
      '<div class="mb-ops" style="margin-top:10px"><button class="feed-play" onclick="startFocus(\'schedule\')">'+icon('play',14)+' 开始专注计时</button><button class="btn-ghost" onclick="openForm(\'schedule\',\'daily\',null)">+ 加待办</button></div></div>';
  }
  if(key==='period'){ return renderPeriodSection(); }
  if(key==='settings'){ return renderMenstrualSettings(); }
  if(key==='books'){
    const list=(state.modules.books.panels.list||[]);
    const withProg=list.filter(function(r){return r&&r.prog&&!isNaN(parseFloat(r.prog));});
    const avg=withProg.length?Math.round(withProg.reduce(function(a,b){return a+parseFloat(b.prog);},0)/withProg.length):0;
    return '<div class="card mod-widget"><h3>'+icon('book',16)+' 阅读进度汇总</h3>'+
      '<div class="ring-progress" data-value="'+avg+'"><svg class="ring-svg" viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="var(--line)" stroke-width="4"></circle><circle cx="28" cy="28" r="24" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" class="ring-circle"></circle></svg><div class="ring-center"><span class="ring-number">'+avg+'%</span><span class="ring-label">平均进度</span></div></div>'+
      '<div class="trend-foot"><span>在读 <b>'+list.length+'</b> 本</span><span>已记录进度 <b>'+withProg.length+'</b> 本</span></div>'+
      '<div class="mb-ops" style="margin-top:10px"><button class="feed-play" onclick="openForm(\'books\',\'list\',null)">+ 添加书目</button></div></div>';
  }
  if(key==='xhs'){ return renderXhsParse(); }
  if(key.indexOf('panel:')===0){ const k=key.slice(6); const p=def&&def.panels.find(function(x){return x.key===k;}); return p?renderPanel(id,p,def.panels.indexOf(p)):''; }
  if(key==='video'){ return renderVideoArea(id); }
  if(key==='audio'){ return renderMusicSection(id); }
  if(key==='feed'){ return renderFeedArea(id); }
  return '';
}
function toggleLayoutEdit(id,on){ state.meta.layoutEdit=state.meta.layoutEdit||{}; state.meta.layoutEdit[id]=!!on; document.body.classList.toggle('layout-edit',!!on); save(); renderModule(id); }
function moveSection(id,key,dir){
  const order=getModuleOrder(id); const i=order.indexOf(key); if(i<0) return;
  const j=i+dir; if(j<0||j>=order.length) return;
  order.splice(i,1); order.splice(j,0,key);
  saveModuleOrder(id,order); renderModule(id);
}
/* 每个栏目的「今日/累计」速览条，随栏目数据动态变化 */
function modQuickStats(id){
  try{
    const m=state.modules[id]; if(!m) return '';
    const t=todayStr();
    const cells=[];
    const add=function(label,val,sub,pct,barPct){
      let bar='';
      if(typeof barPct==='number'){
        bar='<div class="qs-bar"><i style="width:'+barPct+'%"></i></div>';
      }else if(typeof pct==='number'){
        bar='<div class="qs-bar"><i style="width:'+pct+'%"></i></div>';
      }
      cells.push('<div class="qs-cell"><b>'+val+'</b>'+bar+'<span>'+label+(sub?(' · '+sub):'')+'</span></div>');
    };
    if(id==='schedule'){
      const arr=m.panels.daily||[]; const done=arr.filter(function(it){return it.done;}).length; const total=arr.length;
      const left=Math.max(0,total-done);
      const pct=total?Math.round(done/total*100):0;
      add('待办完成', done+'/'+total, left?('剩'+left+'项 · '+pct+'%'):'全完成 · '+pct+'%', pct);
      const segs=m.panels.segments||[]; add('时间轴节点', segs.length, '今日节奏', null, segs.length?Math.min(100,segs.length*14):0);
      return qsStrip(cells);
    }
    if(id==='cet'||id==='gongkao'){
      const todayMin=dayStudyMin(t); const goal=(m.focusGoal)||25;
      add('今日学习', todayMin+'分', '目标'+goal+'分');
      const st=m.study||{}; let days=0; for(const k in st){ if((numOf(st[k])||0)>0) days++; }
      add('累计专注', days+'天', '已坚持');
      return qsStrip(cells);
    }
    if(id==='refinement'){
      const body=(m.panels.body||[]).filter(function(r){return r&&r.weight&&!isNaN(parseFloat(r.weight));});
      add('体重记录', body.length+'次', body.length?('最新'+body[body.length-1].weight):'去记一条');
      const daily=(m.panels.daily||[]).filter(function(it){return it.done;}).length;
      add('今日打卡', daily, '变美坚持');
      return qsStrip(cells);
    }
    if(id==='posture'){
      const rows=(m.panels.monthly||[]).filter(function(r){return r&&r.weight&&!isNaN(parseFloat(r.weight));});
      add('体态记录', rows.length+'次', rows.length?('最新'+rows[rows.length-1].weight):'去记录');
      return qsStrip(cells);
    }
    if(id==='money'){
      const recs=m.panels.book||[]; let exp=0,inc=0;
      recs.forEach(function(r){ if(r.date===t){ if(r.kind==='income')inc+=(numOf(r.amount)||0); else exp+=(numOf(r.amount)||0); } });
      add('今日支出', exp.toFixed(0)+'元', '今日'+recs.filter(function(r){return r.date===t;}).length+'笔');
      const cats={}; recs.forEach(function(r){ if(r.date===t&&r.kind!=='income'){ cats[r.cat||'其他']=(cats[r.cat||'其他']||0)+(numOf(r.amount)||0); } });
      const top=Object.keys(cats).sort(function(a,b){return cats[b]-cats[a];})[0];
      add('主要开销', top||'无', '今日分类');
      const ym=t.slice(0,7); let mexp=0,mInc=0;
      recs.forEach(function(r){ if((r.date||"").slice(0,7)===ym){ if(r.kind==='income')mInc+=(numOf(r.amount)||0); else mexp+=(numOf(r.amount)||0); } });
      const bf=m.panels.budget||{budget:0,fixed:0};
      const balance=(numOf(bf.budget)||0)+mInc-mexp-(numOf(bf.fixed)||0);
      add('本月结余', (balance>=0?'+':'')+balance.toFixed(0)+'元', '可自由支配');
      return qsStrip(cells);
    }
    if(id==='books'){
      const list=m.panels.list||[]; const withP=list.filter(function(r){return r&&r.prog&&!isNaN(parseFloat(r.prog));});
      const avg=withP.length?Math.round(withP.reduce(function(a,b){return a+parseFloat(b.prog);},0)/withP.length):0;
      add('在读', list.length+'本', '平均进度'+avg+'%');
      return qsStrip(cells);
    }
    if(id==='hot'){
      add('今日热点', (m.items||[]).length, '实时速览');
      return qsStrip(cells);
    }
    if(id==='studyclub'||id==='knowledge'){
      const cards=allCards(); const pend=cards.filter(function(c){return c.status!=='mastered';}).length;
      const mast=cards.filter(function(c){return c.status==='mastered';}).length;
      add('知识卡片', cards.length+'张', '已掌握'+mast+'张');
      add('待消化', pend, '复习中');
      return qsStrip(cells);
    }
    if(id==='mood'){
      const logs=m.logs||[]; add('心情记录', logs.length+'条', '近7天'+(recentMoodCloud(7).length)+'天');
      return qsStrip(cells);
    }
    if(id==='skills'){
      const list=m.panels.list||[]; const done=list.filter(function(it){return it.done;}).length;
      add('技能', list.length+'项', '已掌握'+done);
      return qsStrip(cells);
    }
    if(id==='travel'){
      const list=m.panels.list||[]; add('生活记录', list.length+'条', '点点滴滴');
      return qsStrip(cells);
    }
    if(id==='alert'){
      const list=m.panels.list||[]; add('重要提醒', list.length+'条', '别错过');
      return qsStrip(cells);
    }
    return '';
  }catch(e){ return ''; }
}
function qsStrip(cells){ return '<div class="mod-qs">'+cells.join('')+'</div>'; }
/* 模块英文档案标签（磨砂·雨季主题的 module-head kicker） */
const MODULE_EN={
  schedule:"DAILY ROUTINE",refinement:"BEAUTY LOG",posture:"POSTURE",
  cet:"CET ENGLISH",gongkao:"CIVIL EXAM",period:"CYCLE",mood:"MOOD DIARY",
  money:"LEDGER",feedbox:"FEED INBOX",bookshelf:"LIBRARY",life:"LIFE NOTES",
  growth:"GROWTH CALENDAR",dashboard:"DASHBOARD",profile:"PROFILE",
  music:"RAIN PAVILION",xiaohongshu:"KNOWLEDGE",video:"VIDEO HUB",
  allfeed:"ALL FEEDS",study:"STUDY",knowledge:"KNOWLEDGE BASE"
};
function renderModule(id){
  window._decorOpened=false;
  if(id==="feedbox"){renderFeedBox();return;}
  const def=MODULE_DEFS[id];
  if(!def){ const v=$("#view-module"); navSmall(); const tb=$("#topTitle"); if(tb)tb.innerHTML="栏目"; if(v)v.innerHTML='<div class="card" style="margin-top:20px"><h3>📭 该栏目暂不可用</h3><div class="mini-note">栏目数据缺失或已失效，可在「更多 → 数据 → 重置」恢复初始状态。</div><div class="modal-ops"><button class="save" onclick="showHome()">返回首页</button></div></div>'; return; }
  // 自动修复：模块定义存在但数据缺失时，用默认数据重建
  if(ensureModulePanels(id)) save(true);   // 只补缺失分区，已有数据原样保留
  const m=state.modules[id];const v=$("#view-module");
  v.setAttribute('data-curmod',id);v.setAttribute('data-skin',SKIN_OF(id));saveLastView();
  const order=getModuleOrder(id);
  const edit=state.meta.layoutEdit&&state.meta.layoutEdit[id];
  let html='<div class="back-row"><button onclick="showHome()" aria-label="返回">'+icon('back',20)+'</button>'+
    '<div style="font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(def.title)+'</div>'+
    (edit?'<span class="edit-flag">排序中</span><button class="edit-done" onclick="toggleLayoutEdit(\''+id+'\',false)">完成</button>'
         :'<button class="edit-btn" title="编辑板块顺序" onclick="toggleLayoutEdit(\''+id+'\',true)">'+icon('list',16)+'<span class="eb-lb">编辑板块</span></button>')+
    (COPYABLE_MODULES.indexOf(id)>=0?'<button class="edit-btn" title="复制为 Markdown" onclick="copyModuleAsMD(\''+id+'\')">'+icon('copy',15)+'</button>':'')+
    '</div>';
  const enLabel=(MODULE_EN&&MODULE_EN[id])||"SECTION";
  html+='<div class="mod-head" data-en="'+enLabel+'"><div class="mod-h1">'+esc(def.title)+'</div><div class="mod-sub">'+esc(def.quote)+'</div></div>';
  let qsHtml=''; try{ qsHtml=modQuickStats(id); }catch(e){}
  const secs=order.map(function(key){
    const meta=sectionMeta(key,id);
    const bar=edit?('<div class="sec-bar show"><span class="sec-handle" data-key="'+key+'">'+icon('drag',18)+'</span><span class="sec-name">'+icon(meta[0],14)+' '+esc(meta[1])+'</span><span class="sec-move"><button onclick="moveSection(\''+id+'\',\''+key+'\',-1)" aria-label="上移">'+icon('up',14)+'</button><button onclick="moveSection(\''+id+'\',\''+key+'\',1)" aria-label="下移">'+icon('down',14)+'</button></span></div>'):'';
    let out='<section class="mod-sec" data-key="'+key+'">'+bar+modSectionInner(id,key)+'</section>';
    // 速览条与栏目配图（封面）放一起，紧跟在封面 section 之后
    if(key==='banner' && qsHtml) out+='<div class="qs-wrap">'+qsHtml+'</div>';
    return out;
  });
  html+='<div class="mod-body">'+secs.join('')+'</div>';
  html+='<div class="view-end"></div>';
  // #1 记下当前滚动位置（分页「加载更多」整块重建后会跳回顶部）。
  //    先清零再读：万一读取前就抛异常，不会误用上一次残留的旧位置把页面滚到奇怪的地方。
  try{ window._moduleScrollTop=0; window._moduleScrollTop=(v.scrollTop||0); }catch(e){ window._moduleScrollTop=0; }
  v.innerHTML=html;
  decorateEmptyStates(v);
  autoGuardBgImages(v);
  // #1 分页列表（知识库/投喂）加载更多会整块重建，#view-module 滚动位置要保住
  try{ const km=window._moduleScrollTop||0; if(km>0){ requestAnimationFrame(function(){ try{ if(v.scrollHeight-v.clientHeight>=km) v.scrollTop=km; }catch(e){} }); } }catch(e){}
  if(id==="cet"||id==="gongkao"){ setTimeout(function(){ try{ drawStudyChart(id); }catch(e){ console.warn('绘制学习曲线失败',e); } },0); }
  try{ initRings(v); }catch(e){ console.warn('initRings失败',e); }
  if(edit){ try{ enableSectionDrag(); }catch(e){ console.warn('enableSectionDrag失败',e); } }
}
function renderMonthTrend(){
  try{
    const months=[];const now=new Date();
    for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}
    const rows=months.map(function(ym){
      const study=monthStudyMin(ym);
      const days=state.meta.checkinDays.filter(function(x){return x.indexOf(ym)===0;}).length;
      return {ym:ym,study:study,days:days};
    });
    const maxStudy=Math.max(1,Math.max.apply(null,rows.map(function(r){return r.study;})));
    const maxDays=Math.max(1,Math.max.apply(null,rows.map(function(r){return r.days;})));
    const lbl=function(ym){return parseInt(ym.slice(5),10)+"月";};
    const trendSvg='<svg class="svg-ic" viewBox="0 0 24 24" width="18" height="18" style="vertical-align:-4px;margin-right:4px"><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>';
    let h='<div class="card"><h3>'+trendSvg+'近 6 月趋势</h3><div class="mini-note">学习投入与打卡天数，坚持的复利看得见</div>';
    rows.forEach(function(r){
      h+='<div class="trend-row"><span class="tr-m">'+lbl(r.ym)+'</span>'+
        '<div class="tr-bars">'+
          '<div class="tr-line"><div class="tr-fill study" style="width:'+Math.round(r.study/maxStudy*100)+'%"></div></div>'+
          '<div class="tr-line"><div class="tr-fill days" style="width:'+Math.round(r.days/maxDays*100)+'%"></div></div>'+
        '</div>'+
        '<span class="tr-v">'+r.study+'′ · '+r.days+'天</span></div>';
    });
    h+='<div class="trend-legend"><span><i class="dot study"></i>学习分钟</span><span><i class="dot days"></i>打卡天数</span></div></div>';
    return h;
  }catch(e){return '';}
}
function renderAnnual(){
  const v=$("#view-module");
  let html='<div class="back-row"><button onclick="showHome()" aria-label="返回">'+icon('back',20)+'</button><div style="font-weight:600">年度复盘</div></div>';
  html+='<div class="card"><h3>'+icon('chart',16)+' 周期报告 & 数据管理</h3>'+
    '<div class="mini-note">一键生成周报、导出数据做本地备份，数据始终在你本机。</div>'+
    '<div class="mb-ops" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">'+
    '<button class="feed-play" onclick="showWeeklyReport()">'+icon('calendar',16)+' 生成本周周报</button>'+
    '<button class="feed-play" onclick="showMonthlyReport()">'+icon('calendar',16)+' 生成本月月报</button>'+
    '<button class="feed-play" onclick="previewExport(\'csv\')">'+icon('download',16)+' 导出 CSV</button>'+
    '<button class="feed-play" onclick="previewExport(\'md\')">'+icon('download',16)+' 导出 Markdown</button>'+
    '<button class="feed-play" onclick="downloadBackup()">'+icon('download',16)+' 备份 JSON</button>'+
    '<button class="feed-play" onclick="document.getElementById(\'impBackup\').click()">'+icon('refresh',16)+' 恢复备份</button>'+
    '<input id="impBackup" type="file" accept="application/json" style="display:none" onchange="importBackup(this)">'+
    '</div>'+
    '<div class="card"><h3>'+icon('star',16)+' 成就墙</h3><div class="mini-note">连续打卡、知识沉淀、投喂积累都会解锁成就。</div>'+
    '<button class="feed-play" onclick="renderAchievements()">查看我的成就</button></div>';
  html+=renderMonthTrend();
  // 渲染现有年度面板
  const def=MODULE_DEFS.annual;const m=state.modules.annual;
  def.panels.forEach(function(p,pi){html+=renderPanel("annual",p,pi);});
  html+=renderFeedArea("annual");
  v.innerHTML=html;
}
function weekStart(d){const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x;}
function weeklyReportData(){
  const ws=weekStart(new Date());const we=new Date(ws);we.setDate(ws.getDate()+6);
  const fmt=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const sStr=fmt(ws),eStr=fmt(we);
  let studyMin=0;
  ["cet","gongkao","knowledge","studyclub"].forEach(function(id){
    const st=(state.modules[id]&&state.modules[id].study)||{};
    for(const k in st){if(k>=sStr&&k<=eStr)studyMin+=numOf(st[k])||0;}
  });
  const checkins=state.meta.checkinDays.filter(function(d){return d>=sStr&&d<=eStr;}).length;
  const newCards=(allCards()).filter(function(c){const ds=(c.time||"").slice(0,10);return ds>=sStr&&ds<=eStr;}).length;
  const allC=allCards();
  const masteredWeek=allC.filter(function(c){const lr=(c.lastReview||"").slice(0,10);return c.status==="mastered"&&lr>=sStr&&lr<=eStr;}).length;
  const masteredTotal=allC.filter(function(c){return c.status==="mastered";}).length;
  const masteredRate=allC.length?Math.round(masteredTotal/allC.length*100):0;
  const rs=reviewStats();
  const recs=moneyBookData();
  let exp=0;recs.forEach(function(r){if(r.kind!=="income")exp+=numOf(r.amount)||0;});
  return {ws:ws,we:we,sStr:sStr,eStr:eStr,studyMin:studyMin,checkins:checkins,newCards:newCards,masteredWeek:masteredWeek,masteredTotal:masteredTotal,masteredRate:masteredRate,rs:rs,exp:Math.round(exp*100)/100};
}
/* 小票底部条形码 + 品牌字装饰 */
function barcodeHTML(){
  let bars='';for(let i=0;i<42;i++){bars+='<i></i>';}
  return '<div class="ticket-barcode">'+bars+'</div><div class="ticket-brand">JU · 养成日记 · '+new Date().getFullYear()+'</div>';
}
/* atne 风极淡装饰线稿（opacity 由 .t-art 控制）*/
function ticketArt(){
  return '<svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="currentColor" stroke-width=".7" stroke-linecap="round" stroke-linejoin="round">'+
    '<circle cx="26" cy="26" r="22"/>'+
    '<circle cx="26" cy="26" r="16"/>'+
    '<circle cx="26" cy="26" r="5"/>'+
    '<path d="M26 4 L26 12 M26 40 L26 48 M4 26 L12 26 M40 26 L48 26"/>'+
    '<path d="M10.4 10.4 L16 16 M36 36 L41.6 41.6 M41.6 10.4 L36 16 M16 36 L10.4 41.6"/>'+
    '</svg>';
}
function showWeeklyReport(){
  const w=weeklyReportData();
  const md="# 📑 本周周报（"+w.sStr+" ~ "+w.eStr+"）\n\n"+
    "- ⏱ 学习投入：**"+w.studyMin+" 分钟**（约 "+(Math.round(w.studyMin/60*10)/10)+" 小时）\n"+
    "- ✅ 打卡天数：**"+w.checkins+" 天**\n"+
    "- 📚 新增知识卡片：**"+w.newCards+" 张**\n"+
    "- 🎯 本周掌握：**"+w.masteredWeek+" 张**（累计掌握 "+w.masteredTotal+" 张，掌握率 "+w.masteredRate+"%）\n"+
    "- 🔁 待复习：🟡"+w.rs.l1+" · 🟠"+w.rs.l2+" · 🔴"+w.rs.l3+"\n"+
    "- 💸 本周支出：**"+w.exp+" 元**\n\n"+
    "> 坚持不是一时的热血，是一天天的复利。下周继续闪闪发光 ✨";
  window._weeklyMd=md;window._weeklyRange={s:w.sStr,e:w.eStr};
  const rows=[
    {k:"学习投入",v:w.studyMin+" 分钟",sub:"约 "+(Math.round(w.studyMin/60*10)/10)+" 小时"},
    {k:"打卡天数",v:w.checkins+" 天",sub:""},
    {k:"新增知识卡",v:w.newCards+" 张",sub:""},
    {k:"本周掌握",v:w.masteredWeek+" 张",sub:"累计 "+w.masteredTotal+" · 率 "+w.masteredRate+"%"},
    {k:"待复习",v:w.rs.l1+" / "+w.rs.l2+" / "+w.rs.l3,sub:""},
    {k:"本周支出",v:w.exp+" 元",sub:""}
  ];
  window._weeklyRows=rows;
  let html='<div class="ticket-head"><div class="t-art">'+ticketArt()+'</div><div class="t-eyebrow">Weekly Report</div><div class="t-title">本周周报</div><div class="t-date">'+w.sStr+' ~ '+w.eStr+'</div></div>'+
    '<div class="ticket-body"><hr class="ticket-div">';
  rows.forEach(function(r){
    html+='<div class="ticket-row"><span class="t-k">'+r.k+'</span><span class="t-v">'+r.v+(r.sub?'<small>'+r.sub+'</small>':'')+'</span></div>';
  });
  html+='<hr class="ticket-div"><div class="ticket-note">坚持不是一时的热血，是一天天的复利。<br>下周继续像笑笑一样，慢慢发光。</div>'+
    '<div style="text-align:center"><span class="ticket-stamp">本周打卡 '+w.checkins+' 天</span></div>'+
    barcodeHTML()+'</div>'+
    '<div class="ticket-ops">'+
      '<button class="t-save" onclick="saveTicketImage(window._weeklyRows,\'本周周报\',window._weeklyRange,{eyebrow:\'Weekly Report\',stamp:\'本周打卡 '+w.checkins+' 天\',note:\'坚持不是一时的热血，是一天天的复利。下周继续像笑笑一样，慢慢发光。\'})">'+icon('download',18)+'保存图片</button>'+
      '<button class="t-copy" onclick="copyText(window._weeklyMd)">'+icon('copy',18)+'复制文本</button>'+
      '<button class="t-close" onclick="saveReport(\'week\')">'+icon('download',18)+'存档</button>'+
      '<button class="t-close" onclick="closeModal()">'+icon('close',18)+'关闭</button>'+
    '</div>';
  const box=$("#modalBox");box.className="modal ticket";box.innerHTML=html;$("#modalMask").classList.add("show");
}
/* ===== 周报 / 月报存档 =====
   报告原本只能在小票弹窗里看一眼，关掉就没了。
   存档后可以在「年度复盘」里翻回去，看看自己一路是怎么走过来的。 */
function saveReport(type){
  try{
    const isW=(type==="week");
    const md=isW?window._weeklyMd:window._monthlyMd;
    const range=isW?window._weeklyRange:window._monthlyRange;
    if(!md){ toast("⚠️ 报告内容还没生成"); return; }
    state.meta=state.meta||{};
    state.meta.reports=state.meta.reports||[];
    const key=(isW?"week":"month")+"_"+(range?range.s:"")+"_"+(range?range.e:"");
    const rec={key:key, type:isW?"week":"month",
      title:(isW?"本周周报":"本月月报")+"（"+((range?range.s:"")+" ~ "+(range?range.e:""))+"）",
      s:(range?range.s:""), e:(range?range.e:""), md:md, at:new Date().toISOString()};
    const idx=state.meta.reports.findIndex(function(r){ return r.key===key; });
    const isNew=(idx<0);
    if(isNew) state.meta.reports.unshift(rec); else state.meta.reports[idx]=rec;
    if(state.meta.reports.length>60) state.meta.reports=state.meta.reports.slice(0,60);
    save();
    toast(isNew?("✅ 已存档 · 共 "+state.meta.reports.length+" 份"):"✅ 已更新这份存档");
  }catch(e){ toast("⚠️ 存档失败"); }
}
function showReportArchive(){
  try{
    const list=(state.meta&&state.meta.reports)||[];
    let rows;
    if(!list.length) rows='<div class="mini-note">还没有存档的报告。打开周报 / 月报后点「存档」，以后就能在这里回看。</div>';
    else rows=list.map(function(r){
      return '<div class="mig-row"><span class="mig-dot ok"></span><div class="mig-tx">'+
        '<div class="mig-step">'+esc(r.title||"")+'</div>'+
        '<div class="mig-meta">'+esc(String(r.at||"").replace("T"," ").slice(0,16))+'</div>'+
        '<div class="mig-actions">'+
          '<button class="btn-ghost" onclick="viewReport(\''+esc(r.key)+'\')">查看</button>'+
          '<button class="btn-ghost" onclick="delReport(\''+esc(r.key)+'\')">删除</button>'+
        '</div></div></div>';
    }).join("");
    openModalBox('<h3>🗂 报告存档</h3><div class="mig-list">'+rows+'</div>'+
      '<div class="modal-ops"><button class="save" onclick="closeModal()">关闭</button></div>');
  }catch(e){ toast("⚠️ 无法打开存档"); }
}
function viewReport(key){
  const r=((state.meta&&state.meta.reports)||[]).filter(function(x){ return x.key===key; })[0];
  if(!r){ toast("⚠️ 找不到这份报告"); return; }
  openModalBox('<h3>'+esc(r.title||"报告")+'</h3><pre class="rp-md">'+esc(r.md||"")+'</pre>'+
    '<div class="modal-ops"><button class="cancel" onclick="copyText(window.__rpMd)">复制文本</button>'+
    '<button class="save" onclick="showReportArchive()">返回列表</button></div>');
  window.__rpMd=r.md||"";
}
function delReport(key){
  if(!confirm("删除这份存档报告？"))return;
  state.meta.reports=(state.meta.reports||[]).filter(function(x){ return x.key!==key; });
  save(); showReportArchive(); toast("🗑 已删除");
}
/* ============ 本月月报 ============ */
function monthlyReportData(){
  const now=new Date();
  const ym=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const sStr=ym+"-01";
  const last=new Date(now.getFullYear(),now.getMonth()+1,0);
  const eStr=last.getFullYear()+"-"+String(last.getMonth()+1).padStart(2,"0")+"-"+String(last.getDate()).padStart(2,"0");
  const studyMin=monthStudyMin(ym);
  const checkins=state.meta.checkinDays.filter(function(d){return d>=sStr&&d<=eStr;}).length;
  const newCards=(allCards()).filter(function(c){const ds=(c.time||"").slice(0,10);return ds>=sStr&&ds<=eStr;}).length;
  const allC=allCards();
  const masteredMonth=allC.filter(function(c){const lr=(c.lastReview||"").slice(0,10);return c.status==="mastered"&&lr>=sStr&&lr<=eStr;}).length;
  const masteredTotal=allC.filter(function(c){return c.status==="mastered";}).length;
  const masteredRate=allC.length?Math.round(masteredTotal/allC.length*100):0;
  const rs=reviewStats();
  const recs=moneyBookData();
  let exp=0;recs.forEach(function(r){if(r.kind!=="income")exp+=numOf(r.amount)||0;});
  const st=computeStats();
  return {sStr:sStr,eStr:eStr,studyMin:studyMin,checkins:checkins,newCards:newCards,masteredMonth:masteredMonth,masteredTotal:masteredTotal,masteredRate:masteredRate,rs:rs,exp:Math.round(exp*100)/100,streak:st.streak,usageDays:st.usageDays};
}
function showMonthlyReport(){
  const m=monthlyReportData();
  const md="# 📅 本月月报（"+m.sStr+" ~ "+m.eStr+"）\n\n"+
    "- ⏱ 学习投入：**"+m.studyMin+" 分钟**（约 "+(Math.round(m.studyMin/60*10)/10)+" 小时）\n"+
    "- 🔥 当前连击：**"+m.streak+" 天**\n"+
    "- ✅ 本月打卡：**"+m.checkins+" 天**\n"+
    "- 📚 新增知识卡片：**"+m.newCards+" 张**\n"+
    "- 🎯 本月掌握：**"+m.masteredMonth+" 张**（累计掌握 "+m.masteredTotal+" 张，掌握率 "+m.masteredRate+"%）\n"+
    "- 🔁 待复习：🟡"+m.rs.l1+" · 🟠"+m.rs.l2+" 🔴"+m.rs.l3+"\n"+
    "- 💸 本月支出：**"+m.exp+" 元**\n\n"+
    "> 一月一复盘，沉淀比努力更重要。下个月继续闪闪发光 ✨";
  window._monthlyMd=md;window._monthlyRange={s:m.sStr,e:m.eStr};
  const rows=[
    {k:"当前连击",v:m.streak+" 天",sub:"累计使用 "+m.usageDays+" 天"},
    {k:"本月打卡",v:m.checkins+" 天",sub:""},
    {k:"新增知识卡",v:m.newCards+" 张",sub:""},
    {k:"本月掌握",v:m.masteredMonth+" 张",sub:"累计 "+m.masteredTotal+" · 率 "+m.masteredRate+"%"},
    {k:"待复习",v:m.rs.l1+" / "+m.rs.l2+" / "+m.rs.l3,sub:""},
    {k:"本月支出",v:m.exp+" 元",sub:""}
  ];
  window._monthlyRows=rows;
  let html='<div class="ticket-head"><div class="t-art">'+ticketArt()+'</div><div class="t-eyebrow">Monthly Report</div><div class="t-title">本月月报</div><div class="t-date">'+m.sStr+' ~ '+m.eStr+'</div></div>'+
    '<div class="ticket-body"><hr class="ticket-div">';
  rows.forEach(function(r){
    html+='<div class="ticket-row"><span class="t-k">'+r.k+'</span><span class="t-v">'+r.v+(r.sub?'<small>'+r.sub+'</small>':'')+'</span></div>';
  });
  html+='<hr class="ticket-div"><div class="ticket-note">一月一复盘，沉淀比努力更重要。<br>下个月继续像笑笑一样，慢慢发光。</div>'+
    '<div style="text-align:center"><span class="ticket-stamp">连击 '+m.streak+' 天 · 打卡 '+m.checkins+' 天</span></div>'+
    barcodeHTML()+'</div>'+
    '<div class="ticket-ops">'+
      '<button class="t-save" onclick="saveTicketImage(window._monthlyRows,\'本月月报\',window._monthlyRange,{eyebrow:\'Monthly Report\',stamp:\'连击 '+m.streak+' 天 · 打卡 '+m.checkins+' 天\',note:\'一月一复盘，沉淀比努力更重要。下个月继续像笑笑一样，慢慢发光。\'})">'+icon('download',18)+'保存图片</button>'+
      '<button class="t-copy" onclick="copyText(window._monthlyMd)">'+icon('copy',18)+'复制文本</button>'+
      '<button class="t-close" onclick="saveReport(\'month\')">'+icon('download',18)+'存档</button>'+
      '<button class="t-close" onclick="closeModal()">'+icon('close',18)+'关闭</button>'+
    '</div>';
  const box=$("#modalBox");box.className="modal ticket";box.innerHTML=html;$("#modalMask").classList.add("show");
}
/* 周报/月报小票保存为图片（canvas 绘制，atne 实体卡券风，与屏幕小票一致） */
function saveTicketImage(rows,title,range,extra){
  try{
    rows=rows||window._weeklyRows||[];
    title=title||"本周周报";
    range=range||{s:"",e:""};
    extra=extra||{};
    const w=range;
    const eyebrow=(extra.eyebrow||"REPORT").toUpperCase();
    const stampText=extra.stamp||"";
    const rawNote=extra.note||"";
    const noteLines=[];
    if(rawNote){const mid=Math.ceil(rawNote.length/2);let splitAt=rawNote.indexOf("。",Math.max(0,mid-4));if(splitAt<0||splitAt>mid+6)splitAt=rawNote.indexOf("，",mid-4);if(splitAt<0||splitAt>mid+6)splitAt=mid;noteLines.push(rawNote.slice(0,splitAt+1).trim());if(splitAt+1<rawNote.length)noteLines.push(rawNote.slice(splitAt+1).trim());}
    const W=600;
    const padL=52,padR=W-52;
    const headH=154,rowH=40,noteH=noteLines.length*16+32,stampH=stampText?70:28,barH=86,bottomH=26;
    const H=Math.max(520, headH+20+rows.length*rowH+28+noteH+stampH+barH+bottomH);
    const cv=document.createElement("canvas");cv.width=W*2;cv.height=H*2;
    cv.style.width=W+"px";cv.style.height=H+"px";
    const ctx=cv.getContext("2d");ctx.scale(2,2);
    // 等待字体
    const fontPromises=[
      document.fonts.load("10px 'Noto Serif SC'"),
      document.fonts.load("300 32px 'Shippori Mincho'"),
      document.fonts.load("9px 'DM Sans'"),
      document.fonts.load("8px 'DM Sans'"),
      document.fonts.load("13px 'DM Sans'")
    ];
    const draw=function(){
      // 背景
      ctx.fillStyle="#fffffd";ctx.fillRect(0,0,W,H);
      // 顶部装饰线稿（淡灰 opacity .14）
      ctx.save();
      ctx.translate(padL,36);ctx.strokeStyle="rgba(58,58,58,.14)";ctx.lineWidth=.7;
      ctx.beginPath();ctx.arc(26,26,22,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.arc(26,26,16,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.arc(26,26,5,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(26,4);ctx.lineTo(26,12);ctx.moveTo(26,40);ctx.lineTo(26,48);ctx.moveTo(4,26);ctx.lineTo(12,26);ctx.moveTo(40,26);ctx.lineTo(48,26);ctx.stroke();
      ctx.beginPath();ctx.moveTo(10.4,10.4);ctx.lineTo(16,16);ctx.moveTo(36,36);ctx.lineTo(41.6,41.6);ctx.moveTo(41.6,10.4);ctx.lineTo(36,16);ctx.moveTo(16,36);ctx.lineTo(10.4,41.6);ctx.stroke();
      ctx.restore();
      // eyebrow
      ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.fillStyle="#a0a0a0";
      ctx.font="10px 'Noto Serif SC', serif";ctx.fillText(eyebrow,padL,110);
      // title
      ctx.fillStyle="#3a3a3a";ctx.font="300 32px 'Shippori Mincho', 'Noto Serif SC', serif";
      ctx.fillText(title,padL,144);
      // date
      ctx.fillStyle="#a8a4a0";ctx.font="9px 'DM Sans', sans-serif";
      ctx.fillText((w.s||"")+" ~ "+(w.e||""),padL,164);
      // 分隔线
      ctx.strokeStyle="#e8e6e2";ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(padL,headH);ctx.lineTo(padR,headH);ctx.stroke();
      // rows
      let y=headH+20;
      rows.forEach(function(r){
        // label
        ctx.textAlign="left";ctx.fillStyle="#b0aab0";ctx.font="8px 'DM Sans', sans-serif";
        ctx.fillText(String(r.k||"").toUpperCase(),padL,y+12);
        // value
        ctx.textAlign="right";ctx.fillStyle="#5a5a5a";ctx.font="13px 'DM Sans', sans-serif";
        ctx.fillText(String(r.v||""),padR,y+12);
        // sub
        if(r.sub){
          ctx.fillStyle="#b0aaa4";ctx.font="9px 'DM Sans', sans-serif";
          ctx.fillText(String(r.sub),padR,y+26);
        }
        y+=rowH;
      });
      // 分隔线
      ctx.strokeStyle="#e8e6e2";ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(padL,y+4);ctx.lineTo(padR,y+4);ctx.stroke();
      y+=28;
      // note
      ctx.textAlign="center";ctx.fillStyle="#b0b0b0";ctx.font="italic 7.5px 'DM Sans', sans-serif";
      noteLines.forEach(function(line,i){ctx.fillText(line,W/2,y+i*16);});
      y+=noteH-16;
      // stamp
      if(stampText){
        ctx.save();ctx.translate(W/2,y+18);ctx.rotate(-2.5*Math.PI/180);
        ctx.strokeStyle="#d9b48f";ctx.lineWidth=1;ctx.strokeRect(-ctx.measureText(stampText).width/2-18,-11,ctx.measureText(stampText).width+36,22);
        ctx.fillStyle="#b08a6a";ctx.font="10px 'DM Sans', sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(stampText,0,0);
        ctx.restore();
        y+=56;
      }
      // barcode
      const by=y+8;ctx.fillStyle="#6a6258";
      let bx=W/2-108;
      for(let i=0;i<44;i++){const bw=(i%3===0?3:(i%2===0?2:1));ctx.globalAlpha=.5;ctx.fillRect(bx,by,bw,34);bx+=bw+2;}
      ctx.globalAlpha=1;
      // brand
      ctx.fillStyle="#bcb4a6";ctx.font="7.5px 'DM Sans', sans-serif";ctx.textAlign="center";ctx.textBaseline="alphabetic";
      ctx.fillText("JU · 养成日记 · "+new Date().getFullYear(),W/2,by+54);
      // 导出
      try{
        const dataURL=cv.toDataURL("image/png");
        window._lastTicketImage=dataURL;
        const a=document.createElement("a");a.href=dataURL;a.download=(title||"周报")+"_"+(w.s||todayStr())+".png";
        document.body.appendChild(a);a.click();a.remove();
        toast("已保存小票图片");
      }catch(e){
        try{const wnd=window.open();if(wnd){wnd.document.write('<img src="'+cv.toDataURL("image/png")+'" style="width:100%">');wnd.document.title=(title||"周报");toast("已在新窗口打开，长按/右键保存");}
        else toast("导出受限，请用「复制文本」");}
        catch(e2){toast("保存失败："+(e.message||e));}
      }
    };
    Promise.all(fontPromises).then(draw).catch(function(){draw();});
  }catch(e){toast("保存图片失败："+(e.message||e));}
}
function downloadText(name,text){
  try{const blob=new Blob([text],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href);toast("⬇ 已下载 "+name);}catch(e){toast("⚠️ 下载失败");}
}
function buildExport(fmt){
  let out="",checkCount=0,cardCount=0,moneyCount=0;
  if(fmt==="csv"){
    const lines=["栏目,类型,内容,状态,完成日期"];
    for(const id in MODULE_DEFS){MODULE_DEFS[id].panels.forEach(function(p){if(p.type==="checklist"){(state.modules[id].panels[p.key]||[]).forEach(function(it){const c=(p.fields||[]).map(function(f){return (it[f.name]||"");}).join(" ");lines.push([COLUMN_TITLES[id]||id,"打卡",c.replace(/,/g,"，"),it.done?"已完成":"" ,it.doneDate||""].join(","));checkCount++;});}});}
    lines.push("");
    lines.push("来源,标题,标签,核心观点,状态,创建时间,复习时间,来源链接");
    (allCards()).forEach(function(c){
      const fromLbl=(c.from==="studyclub"?"知识研习":c.from==="knowledge"?"知识库":(c.from&&MODULE_DEFS[c.from]?(COLUMN_TITLES[c.from]||MODULE_DEFS[c.from].title):"知识库"));
      lines.push([fromLbl,(c.title||"").replace(/,/g,"，"),(c.tags||[]).join("/").replace(/,/g,"，"),(c.core||"").replace(/\n/g,"；").replace(/,/g,"，"),(c.status==="mastered"?"已掌握":"待消化"),(c.time||"").slice(0,10),(c.lastReview||"").slice(0,10),(c.source||"").replace(/,/g,"，")].join(","));
      cardCount++;
    });
    out=lines.join("\n");
    moneyCount=(moneyBookData()||[]).length;
  }else{
    let md="# 鞠式工作台 · 数据导出\n\n## 知识卡片（共 "+(allCards()).length+" 张）\n";
    (allCards()).forEach(function(c){const fromLbl=(c.from==="studyclub"?"知识研习":c.from==="knowledge"?"知识库":(c.from&&MODULE_DEFS[c.from]?(COLUMN_TITLES[c.from]||MODULE_DEFS[c.from].title):"知识库"));md+="- **["+(c.status==="mastered"?"已掌握":"待消化")+"] "+c.title+"**（"+fromLbl+" · "+(c.tags||[]).join("/")+"）："+(c.core||"").replace(/\n/g,"；")+(c.source?(" _来源："+c.source+"_"):"")+"\n";cardCount++;});
    md+="\n## 记账记录\n";
    moneyBookData().forEach(function(r){md+="- "+(r.kind==="income"?"[收入]":"[支出]")+" "+r.date+" "+(r.item||"")+"："+r.amount+"元 / "+r.cat+"\n";moneyCount++;});
    out=md;
  }
  return {out:out,checkCount:checkCount,cardCount:cardCount,moneyCount:moneyCount,fmt:fmt};
}
function exportData(fmt){
  try{
    const r=buildExport(fmt);
    downloadText(fmt==="csv"?"鞠式工作台_数据.csv":"鞠式工作台_数据.md",r.out);
    toast("✅ 已导出");
  }catch(e){toast("⚠️ 导出失败："+e.message);}
}
function previewExport(fmt){
  try{
    const r=buildExport(fmt);
    const preview=(r.fmt==="csv"?r.out:r.out).split("\n").slice(0,12).join("\n");
    let html='<h3>📤 导出预览 · '+(r.fmt==="csv"?"CSV":"Markdown")+'</h3>'+
      '<div class="mini-note">将导出以下内容（数据始终在你本机，不上传服务器）：</div>'+
      '<div class="exp-summary">'+
        '<span class="exp-chip">✅ 打卡项 '+r.checkCount+' 条</span>'+
        '<span class="exp-chip">📚 知识卡片 '+r.cardCount+' 张</span>'+
        '<span class="exp-chip">💸 记账 '+r.moneyCount+' 条</span>'+
      '</div>'+
      '<div class="exp-preview">'+esc(preview)+(r.fmt==="md"?"…":"")+'</div>'+
      '<div class="modal-ops"><button class="cancel" onclick="closeModal()">取消</button><button class="save" onclick="closeModal();exportData(\''+r.fmt+'\')">'+icon("download",14)+' 确认下载</button></div>';
    $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
  }catch(e){toast("⚠️ 预览失败："+e.message);}
}
function downloadBackup(){
  try{const data=JSON.stringify(state);downloadText("鞠式工作台_备份_"+todayStr()+".json",data);toast("💾 备份已下载，请妥善保管");}catch(e){toast("⚠️ 备份失败");}
}
function importBackup(inp){
  const f=inp.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=function(){
    try{
      const obj=JSON.parse(rd.result);
      if(!obj||!obj.modules)throw new Error("文件格式不正确");
      // 与 importFullBackup 同口径：外部文件属不可信来源，先留回滚点再深度消毒
      try{ localStorage.setItem("ju_workbench_preimport",JSON.stringify({at:new Date().toISOString(),from:(obj.meta&&obj.meta._dataVersion)||1,state:state})); }catch(e){}
      try{ sanitizeDeep(obj); }catch(e){ console.warn("导入数据消毒失败",e); }
      state=obj; save();
      // 与 importFullBackup 同口径：补齐形状 + 跑迁移，否则导入无 meta 的旧备份会白屏
      try{ repairStateShape(); }catch(e){}
      try{ runMigrations(state, obj); }catch(e){ console.warn("导入后迁移失败",e); }
      try{ repairStateShape(); }catch(e){}
      toast("✅ 备份已恢复，正在刷新…");
      setTimeout(function(){renderHome();renderDrawer();},300);
    }catch(e){ toast("⚠️ 恢复失败："+((e&&e.message)||e)); }
  };
  rd.readAsText(f);
}
function totalStudyMin(){
  let sum=0;
  for(const id in MODULE_DEFS){const st=(state.modules[id]&&state.modules[id].study)||{};for(const k in st){sum+=numOf(st[k])||0;}}
  return sum;
}
function achievements(){
  const today=todayStr();
  const st=computeStats();
  const cards=(allCards()).length;
  const feeds=Object.keys(state.feeds||{}).reduce(function(n,k){return n+(state.feeds[k]||[]).length;},0);
  const tsm=totalStudyMin();
  const ym=todayStr().slice(0,7);
  const dayNow=new Date().getDate();
  const monthCheckin=state.meta.checkinDays.filter(function(d){return d.indexOf(ym)===0;}).length;
  const fullMonth=dayNow>0 && (monthCheckin/dayNow)>=0.9;
  const goalDone=!!(state.meta.dailyReplay&&state.meta.dailyReplay[todayStr()]&&function(){const goals=(state.meta.dailyReplay[todayStr()].goals)||[];const done=state.modules.schedule.panels.daily.filter(function(it){return it.auto&&goals.some(function(g){return g&&it.task&&it.task.indexOf(g.replace(/^专注学习 \d+ 分钟$/,"").slice(0,4))>=0;});}).length;return goals.length>0&&done>=goals.length;}());
  const unlockDates=state.meta.achievementDates||{};
  const defs=[
    {id:"d1",icon:"sparkle",name:"初次点亮",desc:"完成第一次打卡",ok:(st.records>0&&st.done>0)||state.meta.checkinDays.length>0,target:1,current:Math.min(1,state.meta.checkinDays.length)},
    {id:"d3",icon:"figure",name:"习惯萌芽",desc:"连续打卡 3 天",ok:st.streak>=3,target:3,current:st.streak},
    {id:"d7",icon:"fire",name:"一周坚持",desc:"连续打卡 7 天",ok:st.streak>=7,target:7,current:st.streak},
    {id:"d30",icon:"star",name:"月度定力",desc:"连续打卡 30 天",ok:st.streak>=30,target:30,current:st.streak},
    {id:"d90",icon:"bolt",name:"季度恒心",desc:"连续打卡 90 天",ok:st.streak>=90,target:90,current:st.streak},
    {id:"d100",icon:"star",name:"百日成光",desc:"连续打卡 100 天",ok:st.streak>=100,target:100,current:st.streak},
    {id:"mFull",icon:"calendar",name:"月度全勤",desc:"当月打卡率 ≥90%",ok:fullMonth,target:90,current:Math.round(monthCheckin/dayNow*100)},
    {id:"c10",icon:"book",name:"知识初成",desc:"沉淀 10 张知识卡",ok:cards>=10,target:10,current:cards},
    {id:"c50",icon:"brain",name:"知识富翁",desc:"沉淀 50 张知识卡",ok:cards>=50,target:50,current:cards},
    {id:"c100",icon:"brain",name:"知识宗师",desc:"沉淀 100 张知识卡",ok:cards>=100,target:100,current:cards},
    {id:"s1k",icon:"clock",name:"千钟之勤",desc:"累计学习 ≥1000 分钟",ok:tsm>=1000,target:1000,current:tsm},
    {id:"s5k",icon:"compass",name:"学海无涯",desc:"累计学习 ≥5000 分钟",ok:tsm>=5000,target:5000,current:tsm},
    {id:"f20",icon:"download",name:"收藏达人",desc:"投喂 20 条内容",ok:feeds>=20,target:20,current:feeds},
    {id:"goal",icon:"check",name:"目标达成者",desc:"当日目标全部完成",ok:goalDone,target:1,current:goalDone?1:0},
    {id:"kd",icon:"yen",name:"账单管家",desc:"记账本有记录",ok:(moneyBookData()||[]).length>0,target:1,current:Math.min(1,(moneyBookData()||[]).length)}
  ].map(function(d){
    d.progress=Math.min(100,Math.round(d.current/d.target*100));
    d.date=d.ok?(unlockDates[d.id]||today):'';
    return d;
  });
  // 解锁即记录日期：新达成且无记录时写入 today，保证成就墙展示稳定且可持久化
  try{
    let changed=false; const fresh=[];
    defs.forEach(function(d){ if(d.ok && !state.meta.achievementDates[d.id]){ state.meta.achievementDates[d.id]=today; changed=true; fresh.push(d); } });
    if(changed) save(true);
    // #30 成就彩带：仅在「非首屏静默渲染」时庆祝，避免开屏一拥而上
    if(fresh.length && !window._booting && typeof celebrateAchievement==="function"){
      // 仅庆祝最新一枚（克制），其余静默记录
      const d=fresh[fresh.length-1];
      setTimeout(function(){ try{ celebrateAchievement(d.name, icon(d.icon,24)); }catch(e){} }, 350);
    }
  }catch(e){}
  return {list:defs,got:defs.filter(function(d){return d.ok;}).length};
}
/* ===== 成就分享卡 =====
   用原生 Canvas 手绘，不引 html2canvas 之类的外链库 ——
   APK 是离线环境，CDN 挂了就整个功能用不了，不值得为一张图冒这个险。 */
function downloadDataUrl(url,filename){
  try{
    const a=document.createElement("a");
    a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); a.remove();
    toast("📥 已保存到下载目录");
  }catch(e){ toast("⚠️ 保存失败，可长按图片另存"); }
}
function shareAchievementCard(){
  try{
    const a=achievements();
    const st=computeStats();
    const W=750,H=1000;
    const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
    const g=cv.getContext("2d");
    if(!g){ toast("⚠️ 当前环境不支持生成图片"); return; }
    // 背景
    const grad=g.createLinearGradient(0,0,W,H);
    grad.addColorStop(0,"#2b2440"); grad.addColorStop(.55,"#3d3357"); grad.addColorStop(1,"#6b5670");
    g.fillStyle=grad; g.fillRect(0,0,W,H);
    // 装饰光斑
    g.globalAlpha=.08; g.fillStyle="#fff";
    g.beginPath(); g.arc(W-70,70,160,0,Math.PI*2); g.fill();
    g.beginPath(); g.arc(50,H-110,120,0,Math.PI*2); g.fill();
    g.globalAlpha=1;
    g.textAlign="center";
    // 标题
    g.fillStyle="#fff"; g.font="bold 42px sans-serif";
    g.fillText("我的养成成就", W/2, 118);
    g.fillStyle="rgba(255,255,255,.7)"; g.font="22px sans-serif";
    g.fillText("笑笑工作台 · "+todayStr(), W/2, 156);
    // 连续打卡大数字
    g.fillStyle="#FFD98E"; g.font="bold 160px sans-serif";
    g.fillText(String(st.streak||0), W/2, 330);
    g.fillStyle="rgba(255,255,255,.9)"; g.font="28px sans-serif";
    g.fillText("天连续打卡", W/2, 378);
    // 三项小统计
    const cells=[["累计使用",(st.usageDays||0)+" 天"],["记录条数",(st.records||0)+" 条"],["解锁成就",a.got+" / "+a.list.length]];
    const cw=200, gap=25, totalW=cw*3+gap*2, sx=(W-totalW)/2;
    cells.forEach(function(c,i){
      const x=sx+i*(cw+gap);
      g.fillStyle="rgba(255,255,255,.09)";
      g.beginPath();
      if(g.roundRect) g.roundRect(x,420,cw,96,18); else g.rect(x,420,cw,96);
      g.fill();
      g.fillStyle="#fff"; g.font="bold 30px sans-serif";
      g.fillText(c[1], x+cw/2, 468);
      g.fillStyle="rgba(255,255,255,.6)"; g.font="18px sans-serif";
      g.fillText(c[0], x+cw/2, 496);
    });
    // 已解锁徽章（最多 6 枚）
    const got=a.list.filter(function(d){ return d.ok; }).slice(0,6);
    const bw=210, bh=112, bgap=22;
    const cols=2, startX=(W-(bw*cols+bgap*(cols-1)))/2;
    got.forEach(function(d,i){
      const col=i%cols, row=Math.floor(i/cols);
      const x=startX+col*(bw+bgap), y=560+row*(bh+bgap);
      g.fillStyle="rgba(255,255,255,.12)";
      g.beginPath();
      if(g.roundRect) g.roundRect(x,y,bw,bh,16); else g.rect(x,y,bw,bh);
      g.fill();
      g.fillStyle="#FFD98E"; g.font="34px sans-serif"; g.textAlign="left";
      g.fillText("🏅", x+18, y+52);
      g.fillStyle="#fff"; g.font="bold 22px sans-serif";
      g.fillText(String(d.name||"").slice(0,7), x+70, y+50);
      g.fillStyle="rgba(255,255,255,.6)"; g.font="16px sans-serif";
      g.fillText(String(d.desc||"").slice(0,12), x+70, y+78);
      g.textAlign="center";
    });
    if(!got.length){
      g.fillStyle="rgba(255,255,255,.5)"; g.font="22px sans-serif";
      g.fillText("还没有解锁成就，从今天的第一笔记录开始吧", W/2, 620);
    }
    // 底部文案
    g.fillStyle="rgba(255,255,255,.85)"; g.font="26px sans-serif";
    g.fillText("坚持不是一时的热血，是一天天的复利。", W/2, 900);
    g.fillStyle="rgba(255,255,255,.5)"; g.font="19px sans-serif";
    g.fillText("—— 笑笑工作台", W/2, 940);
    const url=cv.toDataURL("image/png");
    const html='<h3>🖼 成就分享卡</h3>'+
      '<div class="mini-note">长按图片可保存到相册；也可以直接点下面的按钮下载。</div>'+
      '<img class="share-card-img" src="'+url+'" alt="成就分享卡">'+
      '<div class="modal-ops">'+
        '<button class="cancel" onclick="downloadDataUrl(window._achCardUrl,\'成就分享卡_'+todayStr()+'.png\')">'+icon('download',16)+' 保存图片</button>'+
        '<button class="cancel" onclick="copyText(\'我的养成成就：连续打卡 '+(st.streak||0)+' 天，已解锁 '+a.got+' 项成就 ✨\')">复制文案</button>'+
        '<button class="save" onclick="closeModal()">关闭</button>'+
      '</div>';
    window._achCardUrl=url;
    openModalBox(html);
  }catch(e){ toast("⚠️ 生成失败："+((e&&e.message)||e)); }
}
function renderAchievements(){
  try{
    const a=achievements();
    let html=icon('star',18)+'<h3 style="display:inline-flex;align-items:center;gap:8px;margin:0 0 4px">成就墙</h3><div class="mini-note">已解锁 '+a.got+' / '+a.list.length+' · 坚持与积累都会被看见</div><div class="ach-grid">';
    a.list.forEach(function(d){
      html+='<div class="ach'+(d.ok?' on':'')+'"><span class="ach-medal">'+(d.ok?icon(d.icon,22):'🔒')+'</span><div class="ach-n">'+d.name+'</div><div class="ach-d">'+d.desc+'</div><div class="ach-bar"><div class="ach-bar-fill" style="width:'+d.progress+'%"></div></div><div class="ach-meta"><span>'+d.progress+'%</span><span>'+(d.ok?(d.date?'✓ '+d.date:'已解锁'):d.current+'/'+d.target)+'</span></div></div>';
    });
    html+='</div><div class="modal-ops"><button class="cancel" onclick="shareAchievementCard()">'+icon('sparkle',16)+' 生成分享卡</button><button class="save" onclick="closeModal()">关闭</button></div>';
    $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
  }catch(e){toast("⚠️ 成就加载失败");}
}
function emptyHint(id,p){
  const tips={
    cet:"CET 从今天开始——背 20 个词、刷一套真题，点右上角 + 记下第一项",
    gongkao:"公考贵在日拱一卒，点右上角 + 记一条行测/申论练习",
    refinement:"今日变美打卡，护肤/运动/饮食任选一项，点右上角 + 开始",
    posture:"记录今日体态，坚持塑形看得见，点右上角 + 记一笔",
    schedule:"添加今日待办，开启有序的一天，点右上角 + 新建",
    money:"记一笔今日开销，月底心里有数，点右上角 + 记一笔",
    skills:"技能清单空空，把想练的本领列进来，点右上角 + 添加",
    books:"读书笔记从第一条开始，点右上角 + 记录感悟",
    travel:"生活记录留白，记一段小旅行或日常，点右上角 + 添加",
    hot:"还没收藏热点，看到好内容点投喂区存进来",
    feedbox:"还没有任何投喂，去各栏目底部喂一条吧"
  };
  return tips[id]||("「"+esc(p.title||"该栏目")+"」还没有内容，点右上角 + 添加第一条");
}
function emptyStateHtml(id,p){
  const keyMap={cet:"brain",gongkao:"sword",refinement:"heart",posture:"figure",schedule:"sun",money:"money",skills:"chip",books:"book",travel:"compass",hot:"news",feedbox:"image",studyclub:"brain",knowledge:"book",alert:"fire",annual:"calendar",
    /* #16 补齐音乐/心情/生理期/视频/日历：此前落到默认值，各栏目空状态图形雷同 */
    music:"music",mood:"mood",menstrual:"heart",videos:"film",calendar:"calendar",xiaohongshu:"image"};
  const illu=emptyIllu(keyMap[id]||"box");
  const deco='<span class="es-deco">✿</span>';
  const tip=emptyHint(id,p);
  const addSvg='<svg class="svg-ic" viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14"/></svg>';
  const add=p&&p.addLabel?'<button class="feed-play" style="margin-top:12px;font-size:12px;padding:5px 14px" onclick="openForm(\''+id+'\',\''+(p.key||"")+'\',null)">'+addSvg+' '+esc(p.addLabel)+'</button>':'';
  return '<div class="empty-state"><div class="es-illu">'+illu+deco+'</div><div class="es-tip">还没有内容，来写下第一条吧 ✨</div><div class="es-sub">'+tip+'</div>'+add+'</div>';
}
