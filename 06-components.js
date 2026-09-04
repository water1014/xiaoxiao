/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 06/18
   文件：js/06-components.js
   来源：原 index.html 第 20240–20788 行
   内容：通用精致组件 JS（Phase C）+ 视图级监听器/网络请求统一回收
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ============ 通用精致组件 JS（Phase C 集成） ============ */
/* 组件一：环形进度环 */
function setRingProgress(el, value){
  if(!el)return;
  const circle=el.querySelector('.ring-circle');
  const number=el.querySelector('.ring-number');
  const radius=24, circumference=2*Math.PI*radius;
  const clamped=Math.max(0,Math.min(100,value||0));
  if(circle){circle.style.strokeDasharray=circumference;circle.style.strokeDashoffset=circumference*(1-clamped/100);}
  if(number){
    if(clamped===100)number.textContent='✓';
    else if(clamped%1===0)number.textContent=Math.round(clamped)+'%';
    else number.textContent=clamped.toFixed(1)+'%';
  }
}
function initRings(scope){
  (scope||document).querySelectorAll('.ring-progress').forEach(function(el){
    setRingProgress(el, parseFloat(el.dataset.value)||0);
  });
}

/* 组件二：分段控制器 */
function initSegControl(container){
  if(!container)return;
  const items=container.querySelectorAll('.seg-item');
  items.forEach(function(item, index){
    item.addEventListener('click', function(){
      items.forEach(function(b){b.classList.remove('active');});
      this.classList.add('active');
      container.dataset.index=index;
      container.dispatchEvent(new CustomEvent('segChange',{detail:{value:this.dataset.value,index:index}}));
    });
  });
  const active=container.querySelector('.seg-item.active');
  if(active)container.dataset.index=Array.from(items).indexOf(active);
  else{ if(items[0])items[0].classList.add('active'); container.dataset.index=0; }
}

/* 组件三：滑动开关（状态由调用处绑定 onchange） */
/* 开关动作白名单（替代 eval）
   历史写法是对 dataset.onchange 求值执行：属性里放什么就执行什么，
   一旦该属性可被外部数据影响即可执行任意脚本。改为只认白名单函数，
   未登记的名称直接忽略并告警。 */
const TOGGLE_ACTIONS={
  autoDailyChanged:function(){ window._autoDailyChanged=1; },
  hapticToast:function(){ toast("🔘 已切换震动反馈"); },
  applySerifTitle:function(){ applySerifTitle(); },
  onNotifyToggle:function(el){ onNotifyToggle(el.checked); },
  applyReducedMotion:function(){ applyReducedMotion(); },
  applyToolFullscreen:function(){ applyToolFullscreen(); }
};
function runToggleAction(el){
  const raw=(el&&el.dataset&&el.dataset.onchange)||"";
  if(!raw)return;
  // 只接受「标识符 + 可选空参数列表」形式，其余一律拒绝（绝不 eval / new Function）
  const m=/^([A-Za-z_$][A-Za-z0-9_$]*)\s*\(\s*\)$/.exec(String(raw).trim());
  if(!m){ console.warn("[安全] 已忽略非法 data-onchange：", raw); return; }
  const fn=TOGGLE_ACTIONS[m[1]];
  if(typeof fn!=="function"){ console.warn("[安全] 未登记的开关动作：", m[1]); return; }
  fn(el);
}
function initToggles(scope){
  (scope||document).querySelectorAll('.toggle-input').forEach(function(input){
    if(input.__wired)return; input.__wired=true;
    input.addEventListener('change', function(){
      try{
        const key=this.dataset.key;
        if(key){
          if(key.indexOf(".")>=0){
            const parts=key.split(".");let o=state.meta;
            for(let i=0;i<parts.length-1;i++){o[parts[i]]=o[parts[i]]||{};o=o[parts[i]];}
            o[parts[parts.length-1]]=this.checked?1:0;
          } else { state.meta[key]=(this.checked?1:0); }
          try{ save(); }catch(e){}
        }
        try{ haptic(10); }catch(e){}
        try{ runToggleAction(this); }catch(e){}
      }catch(e){}
    });
  });
}

/* 组件四：底部操作菜单 Action Sheet */
function showActionSheet(title, options, callback){
  const mask=document.getElementById('actionSheetMask');
  const titleEl=document.getElementById('actionTitle');
  const optionsEl=document.getElementById('actionOptions');
  if(!mask)return;
  if(titleEl)titleEl.textContent=title||'选择操作';
  if(optionsEl)optionsEl.innerHTML=options.map(function(opt,i){
    return '<div class="action-sheet-item '+(opt.danger?'danger':'')+'" data-index="'+i+'"><span class="as-icon">'+(opt.icon||'📌')+'</span>'+(opt.label||'')+'</div>';
  }).join('');
  if(optionsEl)optionsEl.querySelectorAll('.action-sheet-item').forEach(function(el){
    el.addEventListener('click', function(){
      const idx=parseInt(this.dataset.index,10);
      hideActionSheet();
      if(callback)callback(options[idx], idx);
    });
  });
  mask.classList.add('show');
  try{document.body.style.overflow='hidden';}catch(e){}
}
function hideActionSheet(){
  const mask=document.getElementById('actionSheetMask');
  if(mask){mask.classList.remove('show');try{ haptic(10); }catch(e){} try{document.body.style.overflow='';}catch(e){}}
}
(function(){
  const m=document.getElementById('actionSheetMask');
  if(m)m.addEventListener('click', function(e){ if(e.target===this)hideActionSheet(); });
})();

/* 组件五：标签云 */
function initTagCloud(container, onSelect){
  if(!container)return;
  container.querySelectorAll('.tag-chip').forEach(function(chip){
    chip.addEventListener('click', function(){
      container.querySelectorAll('.tag-chip').forEach(function(c){c.classList.remove('active');});
      this.classList.add('active');
      if(onSelect)onSelect(this.dataset.tag);
    });
  });
}

/* 组件六：骨架屏 */
function showSkeleton(container, count){
  if(!container)return;
  count=count||2;
  let h='<div class="skeleton-wrapper">';
  for(let i=0;i<count;i++){
    h+='<div class="skeleton-card"><div class="skeleton-line w-80"></div><div class="skeleton-line w-60"></div><div class="skeleton-line w-40"></div></div>';
  }
  h+='</div>';
  container.innerHTML=h;
}
function hideSkeleton(container, content){
  if(container)container.innerHTML=content||'';
}

/* 组件七：下拉刷新 */
function initPullRefresh(){
  const containers=document.querySelectorAll('.pull-to-refresh');
  containers.forEach(function(container){
    if(container.__ptr)return; container.__ptr=true;
    let startY=0, pulling=false, refreshing=false;
    const indicator=container.querySelector('.pull-indicator');
    const spinner=indicator?indicator.querySelector('.pull-spinner'):null;
    const text=indicator?indicator.querySelector('.pull-text'):null;
    const reset=function(){
      pulling=false; refreshing=false;
      if(indicator)indicator.style.transform='translateY(0)';
      if(text)text.textContent='下拉刷新';
      if(spinner)spinner.classList.remove('active');
      try{document.body.style.overflow='';}catch(e){}
    };
    container.addEventListener('touchstart', function(e){
      if(refreshing||container.scrollTop>0)return;
      startY=e.touches[0].clientY; pulling=true;
    }, {passive:true});
    container.addEventListener('touchmove', function(e){
      if(!pulling||refreshing)return;
      const delta=e.touches[0].clientY-startY;
      if(delta>0&&container.scrollTop<=0){
        const translate=Math.min(delta*0.5,80);
        if(indicator)indicator.style.transform='translateY('+translate+'px)';
        if(text)text.textContent=translate>50?'松开刷新':'下拉刷新';
      }
    }, {passive:true});
    container.addEventListener('touchend', function(){
      if(!pulling||refreshing)return;
      pulling=false;
      const translate=parseFloat((indicator?indicator.style.transform:'').replace(/[^0-9.\-]/g,''))||0;
      if(translate>50){
        refreshing=true;
        if(text)text.textContent='刷新中…';
        if(spinner)spinner.classList.add('active');
        if(indicator)indicator.style.transform='translateY(40px)';
        try{document.body.style.overflow='hidden';}catch(e){}
        try{
          const cb=container.__onRefresh;
          Promise.resolve(cb?cb():null).then(reset).catch(reset);
        }catch(e){ reset(); }
      } else { reset(); }
    }, {passive:true});
  });
}
function bindPullRefresh(container, onRefresh){
  if(!container)return;
  container.__onRefresh=onRefresh;
}

/* 组件八：长按菜单 Context Menu */
function showContextMenu(x, y, items, callback){
  let menu=document.getElementById('contextMenu');
  if(!menu){
    menu=document.createElement('div'); menu.id='contextMenu'; menu.className='context-menu';
    document.body.appendChild(menu);
    document.addEventListener('click', function(){ hideContextMenu(); });
  }
  menu.innerHTML=items.map(function(item,i){
    return '<div class="context-item '+(item.danger?'danger':'')+'" data-index="'+i+'"><span class="ci-icon">'+(item.icon||'📌')+'</span>'+(item.label||'')+'</div>';
  }).join('');
  const maxX=window.innerWidth-180, maxY=window.innerHeight-200;
  menu.style.left=Math.min(x,maxX)+'px';
  menu.style.top=Math.min(y,maxY)+'px';
  menu.classList.add('show');
  menu.querySelectorAll('.context-item').forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      const idx=parseInt(this.dataset.index,10);
      hideContextMenu();
      if(callback)callback(items[idx], idx);
    });
  });
}
function hideContextMenu(){
  const menu=document.getElementById('contextMenu');
  if(menu)menu.classList.remove('show');
}
function bindContextMenu(selector, items, callback){
  document.querySelectorAll(selector).forEach(function(el){
    let timer=null;
    const fire=function(x,y){ window.__ctxEl=el; try{haptic(12);}catch(e){} showContextMenu(x,y,items,function(item,idx){ if(callback)callback(item,idx,el); }); };
    el.addEventListener('touchstart', function(){ timer=setTimeout(function(){ const r=el.getBoundingClientRect(); fire(r.left+20, r.top+20); },350); }, {passive:true});
    el.addEventListener('touchend', function(){ clearTimeout(timer); }, {passive:true});
    el.addEventListener('touchmove', function(){ clearTimeout(timer); }, {passive:true});
    el.addEventListener('mousedown', function(){ timer=setTimeout(function(){ const r=el.getBoundingClientRect(); fire(r.left+20, r.top+20); },350); });
    el.addEventListener('mouseup', function(){ clearTimeout(timer); });
    el.addEventListener('mouseleave', function(){ clearTimeout(timer); });
  });
}
/* 事件委托版：容器稳定、子元素频繁重渲染时长按依然有效 */
function bindCtxDelegated(containerSel, childSel, items){
  const cont=document.querySelector(containerSel); if(!cont||cont.__ctxBound)return; cont.__ctxBound=true;
  let timer=null, target=null;
  const fire=function(x,y){ if(!target)return; const r=target.getBoundingClientRect(); showContextMenu(x,y,items,function(item){ if(item&&item.cb)item.cb(target); }); };
  cont.addEventListener('touchstart', function(e){ const el=e.target.closest(childSel); if(!el)return; target=el; timer=setTimeout(function(){ const t=target; if(t){ try{haptic(12);}catch(err){} const r=t.getBoundingClientRect(); fire(r.left+20,r.top+20); } },350); }, {passive:true});
  cont.addEventListener('touchend', function(){ clearTimeout(timer); target=null; }, {passive:true});
  cont.addEventListener('touchmove', function(){ clearTimeout(timer); target=null; }, {passive:true});
  cont.addEventListener('mousedown', function(e){ const el=e.target.closest(childSel); if(!el)return; target=el; timer=setTimeout(function(){ const t=target; if(t){ try{haptic(12);}catch(err){} const r=t.getBoundingClientRect(); fire(r.left+20,r.top+20); } },350); });
  cont.addEventListener('mouseup', function(){ clearTimeout(timer); target=null; });
  cont.addEventListener('mouseleave', function(){ clearTimeout(timer); target=null; });
}
/* 数字计数动画：从 0 滚动到目标值（入场触发） */
function countUp(el,target,dur){
  if(!el)return;
  if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches){el.textContent=String(target);return;}
  const unit=el.querySelector(".sc-unit");const unitHtml=unit?unit.outerHTML:"";
  target=Number(target)||0;const start=performance.now();dur=dur||700;
  function step(now){
    const p=Math.min(1,(now-start)/dur);
    const eased=1-Math.pow(1-p,3);
    const val=Math.round(target*eased);
    el.firstChild&&el.firstChild.nodeType===3?el.firstChild.textContent=String(val):el.childNodes[0]?el.childNodes[0].textContent=String(val):el.textContent=String(val);
    if(unitHtml){ if(!el.querySelector(".sc-unit")){const span=document.createElement("span");span.className="sc-unit";span.innerHTML=unitHtml.replace(/^<span[^>]*>|<\/span>$/g,"");el.insertAdjacentHTML("beforeend",unitHtml);} }
    if(p<1)requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
/* 对容器内所有数字统计触发计数动画 */
function animateStatNumbers(scope){
  if(!scope)return;
  scope.querySelectorAll(".bc-val,.sc-val").forEach(function(el){
    const raw=(el.textContent||"").replace(/[^\d]/g,"");
    if(raw!=="")countUp(el,parseInt(raw,10),700);
  });
}
function skeletonHtml(n){
  n=n||3;let h='<div class="skeleton-wrapper">';
  for(let i=0;i<n;i++){h+='<div class="skeleton-card"><div class="skeleton-line w-80"></div><div class="skeleton-line w-60"></div><div class="skeleton-line w-40"></div></div>';}
  h+='</div>';return h;
}
/* #19 统计卡骨架：给「首页 / 个人页四宫格统计」在数据就绪前占位，
   尺寸与 .stats-row 里的 .stat-card 一致，替换成真数据时不会产生布局跳动。 */
function skeletonStatsHtml(n){
  n=n||4;let h='<div class="sk-stats">';
  for(let i=0;i<n;i++){h+='<div class="sk-stat skeleton"></div>';}
  h+='</div>';return h;
}
/* 暴露到 window：骨架屏在若干 render 分支（含内联 onclick / 后加载的补丁脚本）里按需调用 */
window.skeletonHtml=skeletonHtml;
window.skeletonStatsHtml=skeletonStatsHtml;

// #18 视图切换时统一清理全局定时器，避免切出页面后仍在后台空转
/* ============================================================
   无障碍（a11y）兜底扫描
   —— 用 MutationObserver 统一处理，避免在几十个 render 函数里各写一遍。
   ① 纯图标按钮（无文字）补 aria-label：优先用 title，其次按 onclick 函数名查表
   ② 可点击的 span（.club-act / .feed-act / .qs-btn / .tag-chip 等）
      补 role="button" + tabindex="0"，并支持 Enter / Space 触发
   ============================================================ */
const A11Y_LABELS={
  showHome:"返回首页", toggleThemeQuick:"切换主题", openGlobalSearch:"打开全局搜索",
  toggleQuickActions:"打开快捷操作", dismissInstall:"关闭安装提示", switchBootQuote:"换一句开场语",
  toggleHomeEdit:"编辑首页板块", refreshHome:"刷新首页", openForm:"新增一项", delItem:"删除该项",
  addStudyTime:"记录学习时长", openMoneyForm:"新增账目", delMoneyRec:"删除账目",
  catEdit:"编辑分类", catDel:"删除分类", catAdd:"新增分类",
  incCatEdit:"编辑收入分类", incCatDel:"删除收入分类", incCatAdd:"新增收入分类",
  kbBatchDel:"批量删除卡片", clearFeedBoxSearch:"清空投喂搜索",
  delFeedRec:"删除该条记录", clearFeedSearch:"清空搜索",
  editAvatar:"更换头像", editNickname:"编辑昵称", closeModal:"关闭",
  toggleLayoutEdit:"编辑板块顺序", copyModuleAsMD:"复制为 Markdown",
  moodShiftMonth:"切换月份", moodGotoToday:"回到本月", playBiliFloat:"小窗播放",
  delBili:"删除该视频", feedDigest:"提炼这条内容", toggleFeedPlay:"播放",
  /* 音乐播放器 */
  musicPrev:"上一首", musicToggle:"播放或暂停", musicNext:"下一首",
  musicSpeedToggle:"切换播放倍速", musicLikeToggle:"收藏或取消收藏",
  musicSwitch:"切换播放模式", musicSeek:"拖动进度", musicVol:"调整音量"
};
/* onclick 里这些不是「动作」，取标签时要跳过 */
const A11Y_SKIP={event:1,window:1,console:1,stopPropagation:1,preventDefault:1,haptic:1,setTimeout:1};
function a11ySweep(root){
  try{
    const scope=(root&&root.querySelectorAll)?root:document;
    // ① 纯图标按钮补 aria-label
    const btns=scope.querySelectorAll?scope.querySelectorAll("button"):[];
    for(let i=0;i<btns.length;i++){
      const b=btns[i];
      if(b.getAttribute("aria-label")||b.getAttribute("aria-labelledby"))continue;
      if((b.textContent||"").trim())continue;                 // 有文字，读屏能读到
      let lb=b.getAttribute("title")||"";
      if(!lb){
        // onclick 可能是「event.stopPropagation();musicToggle()」这种组合，
        // 要跳过 event.* 之类的噪音，取第一个查得到中文标签的动作名
        const oc=b.getAttribute("onclick")||"";
        const names=(oc.match(/([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)||[])
          .map(function(x){return x.replace(/\s*\($/,"").replace(/\s*\(/,"");})
          .filter(function(n){return !A11Y_SKIP[n];});
        for(let k=0;k<names.length;k++){
          if(A11Y_LABELS[names[k]]){ lb=A11Y_LABELS[names[k]]; break; }
        }
      }
      if(lb)b.setAttribute("aria-label",lb);
    }
    // ② 可点击的非语义元素补 role / tabindex
    const sel=".club-act,.feed-act,.qs-btn,.tag-chip,.mc-c,.cb,.pill,.seg-item,.ach-medal";
    const els=scope.querySelectorAll?scope.querySelectorAll(sel):[];
    for(let j=0;j<els.length;j++){
      const el=els[j];
      if(el.tagName==="BUTTON")continue;
      if(!el.getAttribute("role"))el.setAttribute("role","button");
      if(!el.hasAttribute("tabindex"))el.setAttribute("tabindex","0");
    }
    // ③ #15 数字滚动计数：任何一次渲染后统一扫描统计数字。
    //    挂在 a11ySweep 里是因为它本来就有 MutationObserver 兜底 + 120ms 防抖，
    //    不必再给每个 render 函数单独加钩子，也不会漏掉异步填充的区块。
    try{ if(typeof countUpSweep==="function") countUpSweep(scope); }catch(e){}
  }catch(e){}
}
/* 键盘可达：为补了 role=button 的元素接上 Enter / Space */
(function bindA11yKeys(){
  try{
    document.addEventListener("keydown",function(e){
      if(e.key!=="Enter"&&e.key!==" "&&e.key!=="Spacebar")return;
      const t=e.target;
      if(!t||t.getAttribute("role")!=="button")return;
      if(t.tagName==="BUTTON"||t.tagName==="A"||t.tagName==="INPUT")return; // 原生已支持
      e.preventDefault();
      try{ t.click(); }catch(e2){}
    },false);
    // 统一扫描：任何一次渲染导致的 DOM 变化都覆盖到
    if(typeof MutationObserver!=="undefined"){
      let pending=0;
      const mo=new MutationObserver(function(){
        if(pending)return;
        pending=setTimeout(function(){ pending=0; try{ a11ySweep(document); }catch(e){} },120);
      });
      if(document.body) mo.observe(document.body,{childList:true,subtree:true});
    }
  }catch(e){}
})();
/* 定时器统一登记：视图级定时器切视图时集中回收。
   历史做法靠各自变量清理，新增定时器很容易忘记配对，改为统一登记 + 按组清理。 */
const _timerGroups={view:new Set(),app:new Set()};
function trackTimer(t,group){
  try{ (_timerGroups[group||"view"]||_timerGroups.view).add(t); }catch(e){}
  return t;
}
function setViewInterval(fn,ms){ return trackTimer(setInterval(fn,ms),"view"); }
function setViewTimeout(fn,ms){ const g=_timerGroups.view; const t=setTimeout(function(){ try{g.delete(t);}catch(e){} try{fn();}catch(e){} },ms); g.add(t); return t; }
function clearTimerGroup(group){
  try{
    const st=_timerGroups[group]; if(!st)return;
    st.forEach(function(t){ try{clearInterval(t);}catch(e){} try{clearTimeout(t);}catch(e){} });
    st.clear();
  }catch(e){}
}
/* ===== 视图级监听器统一回收 =====
   以前挂在 window 上的监听（例如封面编辑器的 mouseup）从来不解绑，
   每开一次就多挂一个，切栏目也不回收，属于典型的监听器泄漏。
   这里用一个 AbortController 统一登记，切换视图时一次 abort 全部撤掉。 */
/* ===== 视图级网络请求统一中断 =====
   定时器与监听器已由 clearViewTimers / clearViewListeners 回收，但各 fetch 自建的
   AbortController 此前无人管理：切走视图后请求仍在飞，回来时把过期结果写回 UI，
   或者继续弹「网络失败」。这里统一登记，切视图时一次 abort。
   请求方 catch 里用 isAbortError(e) 短路，避免把它当成真错误去弹提示/降级。 */
var _netACs=[];
function mkAbort(timeoutMs){
  var ctrl=null;
  try{ ctrl=(typeof AbortController!=="undefined")?new AbortController():null; }catch(e){ ctrl=null; }
  if(!ctrl) return null;
  try{
    _netACs.push(ctrl);
    if(_netACs.length>40) _netACs.splice(0,_netACs.length-40);   // 上限保护，防止长期驻留无限增长
  }catch(e){}
  if(timeoutMs>0){
    try{ ctrl._to=setTimeout(function(){ try{ctrl.abort();}catch(e2){} },timeoutMs); }catch(e){}
  }
  return ctrl;
}
function isAbortError(e){
  try{ return !!(e&&(e.name==="AbortError"||e.name==="TimeoutError"||/abort/i.test(String(e.message||"")))); }catch(_){ return false; }
}
function netAbortAll(){
  try{
    var list=_netACs.slice(); _netACs.length=0;
    list.forEach(function(c){
      if(!c)return;
      try{ if(c._to)clearTimeout(c._to); }catch(e){}
      try{ if(c.signal&&!c.signal.aborted)c.abort(); }catch(e){}
    });
  }catch(e){}
}
let _viewAC=null;
function viewSignal(){
  try{
    if(typeof AbortController!=="function") return null;
    if(!_viewAC||_viewAC.signal.aborted) _viewAC=new AbortController();
    return _viewAC.signal;
  }catch(e){ return null; }
}
function addViewListener(target,type,fn,opts){
  if(!target||!target.addEventListener) return false;
  try{
    const sig=viewSignal();
    if(sig){ target.addEventListener(type,fn,Object.assign({},opts||{},{signal:sig})); return true; }
  }catch(e){}
  try{ target.addEventListener(type,fn,opts||false); }catch(e){}
  return false;
}
function clearViewListeners(){
  try{ if(_viewAC&&!_viewAC.signal.aborted) _viewAC.abort(); }catch(e){}
  _viewAC=null;
  try{ netAbortAll(); }catch(e){}   // 顺带掐断上一个视图遗留的网络请求
}
function clearViewTimers(){
  try{ clearViewListeners(); }catch(e){}
  try{ stopRainClock(); }catch(e){}
  try{ if(focusState&&focusState.tick){ clearInterval(focusState.tick); focusState.tick=null; } }catch(e){}
  try{ if(typeof ambientTimer!=="undefined" && ambientTimer){ clearInterval(ambientTimer); ambientTimer=null; } }catch(e){}
  try{ if(window._breatheTimer){ clearInterval(window._breatheTimer); window._breatheTimer=null; } }catch(e){}
  // 兜底：回收所有经 setViewInterval / setViewTimeout 登记却未单独清理的定时器
  try{ clearTimerGroup("view"); }catch(e){}
  // 离开视图时解绑挂在 window 上的刮擦监听，避免切栏目后残留
  try{ disposeCensyScratch(); }catch(e){}
}
function showModule(id){
  window._navigating=true;
  try{ closeBoot(); closeModal(); }catch(e){}
  clearViewTimers(); // 离开首页时兜底清理各类定时器
  state.meta.tourDone=true;
  if(id==="decor"){haptic(8);showDecor();return;}
  if(id==="videos"){haptic(8);showVideoHub();return;}
  if(id==="music"){haptic(8);showMusic();return;}
  if(id==="bili"){haptic(8);showBili();return;}
  if(id==="calendar"){haptic(8);showCalendar();return;}
  if(id==="dashboard"){haptic(8);showDashboard();return;}
  if(id==="mood"){haptic(8);showMood();return;}
  haptic(8);
  try{
    currentView="module";$("#view-home").classList.remove("active");$("#view-module").classList.add("active");const tb=$("#topbar");if(tb)tb.classList.remove("large");try{var mv=$("#view-module");if(mv)mv.scrollTop=0;}catch(e){}
    lastModuleId=id;try{var mv2=$("#view-module");if(mv2)mv2.setAttribute("data-module",id);}catch(e){}
    const d=MODULE_DEFS[id];$("#topTitle").innerHTML=icon(d.icon||id)+" "+esc(d.title);
    const v=$("#view-module");
    // 骨架屏仅在「视图尚为空」时显示（避免每次切换都闪一下），renderModule 完成后必被替换（含异常分支）
    const empty=!v||!v.children.length;
    if(empty){ v.innerHTML=skeletonHtml(3); }
    setTimeout(function(){
      try{ renderModule(id);renderDrawer();renderBotTab();playViewIn(v,"in"); }
      catch(e){ v.innerHTML='<div class="card" style="margin-top:20px"><h3>⚠️ 该栏目渲染出错</h3><div class="mini-note">错误信息：'+esc(e.message)+'<br>可点下方按钮重建该栏目数据（不影响其他栏目）。</div><div class="modal-ops"><button class="cancel" onclick="repairModule(\''+id+'\')">重建此栏目</button><button class="save" onclick="showHome()">回首页</button></div></div>'; }
      setTimeout(function(){window._navigating=false;},100);
    },160);
  }catch(e){
    $("#view-module").innerHTML='<div class="card" style="margin-top:20px"><h3>⚠️ 该栏目渲染出错</h3><div class="mini-note">错误信息：'+esc(e.message)+'<br>可点下方按钮重建该栏目数据（不影响其他栏目）。</div><div class="modal-ops"><button class="cancel" onclick="repairModule(\''+id+'\')">重建此栏目</button><button class="save" onclick="showHome()">回首页</button></div></div>';
  }
}
/* 首次进入栏目时补齐缺失分区：同样「只补不删」，已有内容绝不重建 */
function ensureModulePanels(id){
  const def=MODULE_DEFS[id]; if(!def)return false;
  const isO=function(v){ return v&&typeof v==="object"&&!Array.isArray(v); };
  if(!isO(state.modules[id]))state.modules[id]={panels:{}};
  if(!isO(state.modules[id].panels))state.modules[id].panels={};
  const panels=state.modules[id].panels; let changed=false;
  (def.panels||[]).forEach(function(p){
    if(!p||!p.key)return;
    const isMap=(p.type==="funds"||p.type==="budget");
    const cur=panels[p.key];
    if(isMap?isO(cur):Array.isArray(cur))return;
    panels[p.key]=isMap
      ? JSON.parse(JSON.stringify(p.defaults||{}))
      : (p.defaults||[]).map(d=>({id:uid(),...JSON.parse(JSON.stringify(d))}));
    changed=true;
  });
  return changed;
}
/* 重建栏目：只补结构、不动内容。
   旧实现把 state.modules[id] 整个换成默认结构，用户自己加的条目、以及 panels
   之外的自定义字段（皮肤、备注、自定义排序等）会被一次性抹掉 —— 「重建」这个
   按钮本意是修结构，不该变成清数据。
   新实现：panels 里类型正确（对象型对对象、列表型对数组）的原样保留，只有缺失
   或类型错的分区才用默认值补齐；panels 之外的自有字段一并浅拷贝保留。 */
function repairModule(id){
  if(!MODULE_DEFS[id])return;
  const def=MODULE_DEFS[id];
  const isO=function(v){ return v&&typeof v==="object"&&!Array.isArray(v); };
  const prev=isO(state.modules[id])?state.modules[id]:{};
  const prevPanels=isO(prev.panels)?prev.panels:{};
  const m=isO(prev)?Object.assign({},prev):{};   // 保留 panels 之外的自定义字段
  m.panels={};
  let kept=0,fixed=0;
  (def.panels||[]).forEach(function(p){
    if(!p||!p.key)return;
    const isMap=(p.type==="funds"||p.type==="budget");
    const cur=prevPanels[p.key];
    const ok=isMap?isO(cur):Array.isArray(cur);
    if(ok){ m.panels[p.key]=cur; kept++; }
    else{
      m.panels[p.key]=isMap
        ? JSON.parse(JSON.stringify(p.defaults||{}))
        : (p.defaults||[]).map(d=>({id:uid(),...JSON.parse(JSON.stringify(d))}));
      fixed++;
    }
  });
  // 用户自建的、定义里已不存在的旧分区不删，避免历史数据无声蒸发
  Object.keys(prevPanels).forEach(function(k){ if(m.panels[k]===undefined)m.panels[k]=prevPanels[k]; });
  state.modules[id]=m;save();showModule(id);
  toast(fixed?("✅ 已修复「"+def.title+"」（保留 "+kept+" 个分区，补齐 "+fixed+" 个）"):("✅ 结构正常，已保留「"+def.title+"」全部内容"));
}
function showMood(){
  window._navigating=true;
  try{ closeBoot(); closeModal(); }catch(e){}
  state.meta.tourDone=true;
  currentView="module";lastModuleId="mood";
  $("#view-home").classList.remove("active");$("#view-module").classList.add("active");
  const tb=$("#topbar");if(tb)tb.classList.remove("large");
  const d=MODULE_DEFS["mood"];
  $("#topTitle").innerHTML=(d&&d.icon?icon(d.icon):icon('mood'))+" "+esc(d&&d.title?d.title:"心情日记");
  try{ renderMood();renderDrawer();renderBotTab();playViewIn($("#view-module"),"in"); }catch(e){ $("#view-module").innerHTML='<div class="card" style="margin-top:20px"><h3>⚠️ 心情日记渲染出错</h3><div class="mini-note">'+esc(e.message)+'</div><div class="modal-ops"><button class="save" onclick="showHome()">回首页</button></div></div>'; }
  setTimeout(function(){window._navigating=false;},100);
}
