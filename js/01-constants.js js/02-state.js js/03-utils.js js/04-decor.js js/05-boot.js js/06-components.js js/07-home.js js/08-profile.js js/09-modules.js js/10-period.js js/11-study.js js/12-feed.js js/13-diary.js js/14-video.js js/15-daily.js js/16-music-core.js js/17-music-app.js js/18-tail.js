/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 18/18
   文件：js/18-tail.js
   来源：原 index.html 第 30186–30460 行、第 30464–30479 行、第 30482–30564 行
   内容：尾部脚本：灵动岛交互 + 收尾初始化
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
(function(){
  try {
    const Doc = document;
    const ID = 'censy-liquid-island-v4';
    // 永生协议：若已存在（刷新恢复）则不再重建
    if (Doc.getElementById(ID)) return;
    const tpl = Doc.getElementById('censy-island-tpl-v4');
    if(!tpl) return;
    const host = Doc.createElement('div');
    host.id = ID;
    host.appendChild(Doc.importNode(tpl.content, true));
    Doc.body.appendChild(host);

    // 动态读取项目主题，挂到灵动岛根节点
    function applyTheme(){
      const theme = document.documentElement.getAttribute('data-theme') || 'dark';
      const layer = Doc.getElementById('censy-island-drag-v4');
      if(layer) layer.setAttribute('data-theme', theme);
    }
    window.censyIslandApplyTheme = applyTheme;
    applyTheme();

    const dragLayer = Doc.getElementById('censy-island-drag-v4');
    const visualBox = Doc.getElementById('censy-island-visual-v4');
    const handle = Doc.getElementById('cen-v4-handle');
    const titleEl = Doc.getElementById('cen-v4-title');
    const artistEl = Doc.getElementById('cen-v4-artist');
    const btnPlay = Doc.getElementById('cen-v4-btn-play');
    const btnLike = Doc.getElementById('cen-v4-btn-like');
    const btnLoop = Doc.getElementById('cen-v4-btn-loop');
    const btnList = Doc.getElementById('cen-v4-btn-list');
    const playlistContainer = Doc.getElementById('cen-v4-playlist-container');
    const avL = Doc.getElementById('cen-v4-avL');
    const avR = Doc.getElementById('cen-v4-avR');

    // 状态：只存 UI 态（位置/展开），音频完全交给项目的 musicAudio
    const STORE = 'details.censy-liquid-v4';
    let state = { expanded:false, listOpen:false, x:null, y:null, enabled:true };
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
      if(typeof saved.expanded==='boolean') state.expanded = saved.expanded;
      if(typeof saved.enabled==='boolean') state.enabled = saved.enabled;
      if(typeof saved.x==='number') state.x = saved.x;
      if(typeof saved.y==='number') state.y = saved.y;
    } catch(e){}

    function coverFor(i){
      try { if(window.musicTracks && window.musicTracks[i]) return window.nyCoverFor(window.musicTracks[i], i); } catch(e){}
      return '';
    }
    function curTrack(){
      const i = (typeof window.musicIdx==='number')?window.musicIdx:-1;
      if(i>=0 && window.musicTracks && window.musicTracks[i]) return window.musicTracks[i];
      return null;
    }
    function getAudio(){ return window.musicAudio || null; }

    function renderPlaylist(){
      if(!playlistContainer) return;
      playlistContainer.innerHTML = '';
      const list = window.musicTracks || [];
      if(!list.length){
        const e = Doc.createElement('div'); e.className='cen-v4-empty'; e.textContent='列表为空，去导入音乐吧'; playlistContainer.appendChild(e); return;
      }
      list.forEach(function(t, i){
        const item = Doc.createElement('div');
        item.className = 'cen-v4-song-item' + (i===window.musicIdx?' is-active':'');
        const name = Doc.createElement('div'); name.className='cen-v4-song-name'; name.textContent = (i+1)+'. '+(t.name||'未命名');
        item.appendChild(name);
        item.onclick = function(){ try{ window.musicPlay(i); }catch(e){} syncUI(); };
        playlistContainer.appendChild(item);
      });
    }

    function syncUI(){
      if(!visualBox) return;
      const t = curTrack();
      const a = getAudio();
      if(t){
        titleEl.textContent = t.name || '未命名';
        artistEl.textContent = (t.artist || '未知歌手');
        const c = coverFor(window.musicIdx);
        if(avL) avL.style.backgroundImage = c?("url('"+c+"')"):'';
        if(avR) avR.style.backgroundImage = (window.musicTracks[1])?("url('"+coverFor(1)+"')"):(c?("url('"+c+"')"):'');
      } else {
        titleEl.textContent = '未播放';
        artistEl.textContent = '清音听雨阁';
      }
      renderPlaylist();
      const playing = !!(a && !a.paused);
      if(playing){
        visualBox.classList.add('censy-v4-playing');
        const ip=Doc.getElementById('cen-v4-icon-play'), iq=Doc.getElementById('cen-v4-icon-pause');
        if(ip) ip.style.display='none'; if(iq) iq.style.display='block';
        const eq=Doc.getElementById('cen-v4-eq'); if(eq) eq.style.display='flex';
      } else {
        visualBox.classList.remove('censy-v4-playing');
        const ip=Doc.getElementById('cen-v4-icon-play'), iq=Doc.getElementById('cen-v4-icon-pause');
        if(ip) ip.style.display='block'; if(iq) iq.style.display='none';
        const eq=Doc.getElementById('cen-v4-eq'); if(eq) eq.style.display='none';
      }
      if(state.expanded){ visualBox.classList.add('censy-v4-expanded'); const eq=Doc.getElementById('cen-v4-eq'); if(eq) eq.style.opacity='0'; }
      else { visualBox.classList.remove('censy-v4-expanded'); const eq=Doc.getElementById('cen-v4-eq'); if(eq) eq.style.opacity='1'; state.listOpen=false; }
      if(state.listOpen){ visualBox.classList.add('censy-list-open'); if(btnList) btnList.classList.add('is-open'); }
      else { visualBox.classList.remove('censy-list-open'); if(btnList) btnList.classList.remove('is-open'); }
      // 循环：映射到项目 musicMode
      let loop = (window.musicMode==='one');
      if(btnLoop) btnLoop.style.color = loop ? '#ff4785' : (dragLayer.getAttribute('data-theme')==='dark'?'white':'#4a4036');
      // 收藏：映射当前曲目 liked
      const liked = !!(t && t.liked);
      if(btnLike){ if(liked) btnLike.classList.add('is-liked'); else btnLike.classList.remove('is-liked'); }
      // 显隐同步（播放淡入 / 暂停 4s 后淡出）
      try{ syncVisibility(); }catch(e){}
    }

    function persist(){ try{ localStorage.setItem(STORE, JSON.stringify({expanded:state.expanded, enabled:state.enabled, x:state.x, y:state.y})); }catch(e){} }

    /* ───────── 显隐策略 ─────────
       ① 没播放 → 完全隐藏（opacity:0 / pointer-events:none），不占画面
       ② 播放 → 加 .cen-v4-active 淡入，只显示小胶囊；展开必须点击
       ③ 暂停/结束 → 起 4s 倒计时，到点移除 .cen-v4-active 自动隐藏
       ④ 4s 内重新播放 → 清掉计时器，继续显示
       ⑤ 展开面板/打开列表时不自动隐藏，避免打断操作
       ⑥ 用户在装修面板里可整体关闭 */
    const HIDE_DELAY = 4000;
    let hideTimer = null, lastPlaying = null;
    function isPlaying(){ const a = getAudio(); return !!(a && !a.paused && !a.ended); }
    function showIsland(){
      if(hideTimer){ clearTimeout(hideTimer); hideTimer = null; }   // ④ 取消待隐藏
      if(dragLayer) dragLayer.classList.add('cen-v4-active');
    }
    function scheduleHide(){
      if(hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function(){
        hideTimer = null;
        if(dragLayer) dragLayer.classList.remove('cen-v4-active');
        // 隐藏时顺带收起面板，下次出现是干净的小胶囊
        if(state.expanded || state.listOpen){ state.expanded=false; state.listOpen=false; persist(); syncUI(); }
      }, HIDE_DELAY);
    }
    function collapseToPill(){ /* 收起面板但保持胶囊可见 */ }
    function syncVisibility(){
      if(!dragLayer) return;
      // ⑥ 手动关闭：彻底移除
      if(!state.enabled){
        dragLayer.classList.add('cen-v4-disabled');
        dragLayer.classList.remove('cen-v4-active');
        if(hideTimer){ clearTimeout(hideTimer); hideTimer=null; }
        lastPlaying = null;
        return;
      }
      dragLayer.classList.remove('cen-v4-disabled');
      const p = isPlaying();
      if(p === lastPlaying) return;   // 状态没变化 → 不动计时器（否则 800ms 轮询会把 4s 一直重置）
      lastPlaying = p;
      if(p){ showIsland(); }                                    // ② 播放 → 淡入
      else if(state.expanded || state.listOpen){                // ⑤ 展开中 → 不自动隐藏
        if(hideTimer){ clearTimeout(hideTimer); hideTimer=null; }
      } else { scheduleHide(); }                                // ③ 暂停 → 4s 倒计时
    }
    /** 归位到手机灵动岛默认位置（顶部安全区下方居中） */
    function resetPos(){
      if(!dragLayer) return;
      dragLayer.style.transform = '';
      dragLayer.style.left = '';
      dragLayer.style.top = '';
      state.x = null; state.y = null; persist();
    }
    /* 对外开关：装修面板 / 控制台都可调 */
    window.censyIslandSetEnabled = function(on){ state.enabled = !!on; persist(); syncVisibility(); return state.enabled; };
    window.censyIslandIsEnabled  = function(){ return !!state.enabled; };
    window.censyIslandResetPos   = resetPos;
    /* 「预览」：没播歌时也能看一眼灵动岛在哪。
       独立于 hideTimer，避免和「暂停 4s 后自动隐藏」互相打架；
       收起时若已恢复播放就什么都不做，绝不会把正在显示的岛关掉。 */
    let peekTimer = null;
    window.censyIslandPeek = function(ms){
      if(!dragLayer) return false;
      if(!state.enabled) return false;              // 关着就不显
      ms = ms || 3600;
      dragLayer.classList.remove('cen-v4-disabled');
      dragLayer.classList.add('cen-v4-active');
      if(peekTimer) clearTimeout(peekTimer);
      peekTimer = setTimeout(function(){
        peekTimer = null;
        const playingNow = (function(){ try{ return !!(window.musicAudio && !window.musicAudio.paused); }catch(e){ return false; } })();
        if(!playingNow && dragLayer) dragLayer.classList.remove('cen-v4-active');
      }, ms);
      return true;
    };
    /* 首次引导：音乐模块第一次打开时，弹一次 toast 告诉用户灵动岛的入口在哪。
       只提示一次（存 localStorage），不重复打扰。 */
    function islandFirstHint(){
      try{
        if(localStorage.getItem('censyIsland.hinted')) return;
        if(!state.enabled) return;
        localStorage.setItem('censyIsland.hinted','1');
        setTimeout(function(){
          try{ window.toast && window.toast('灵动岛已开启：播放时会浮在屏幕顶部，右上 ⋯ 里可开关'); }catch(e){}
        }, 900);
      }catch(e){}
    }
    window.censyIslandHint = islandFirstHint;

    // 控制：全部驱动项目的播放逻辑（共用同一音频实例）
    if(btnPlay) btnPlay.onclick = function(){ try{ window.musicToggle(); }catch(e){ if(window.musicTracks&&window.musicTracks.length) window.musicPlay(0); } syncUI(); };
    const bn = Doc.getElementById('cen-v4-btn-next'); if(bn) bn.onclick = function(){ try{ window.musicNext(); }catch(e){} syncUI(); };
    const bp = Doc.getElementById('cen-v4-btn-prev'); if(bp) bp.onclick = function(){ try{ window.musicPrev(); }catch(e){} syncUI(); };
    if(btnLoop) btnLoop.onclick = function(){ try{ window.musicSwitch(); }catch(e){} syncUI(); };
    if(btnLike) btnLike.onclick = function(){ try{ window.musicLikeToggle(); }catch(e){} syncUI(); };
    if(btnList) btnList.onclick = function(){ state.listOpen = !state.listOpen; syncUI(); };

    // 拖拽（含边界限制，避开安全区）
    let isDrag=false, startX=0, startY=0, initL=0, initT=0, isMove=false;
    if(handle && dragLayer){
      handle.addEventListener('pointerdown', function(e){
        isDrag=true; isMove=false;
        try{ handle.setPointerCapture(e.pointerId); }catch(_){}
        startX=e.clientX; startY=e.clientY;
        const rect=dragLayer.getBoundingClientRect();
        if(dragLayer.style.transform){ dragLayer.style.transform='none'; dragLayer.style.left=rect.left+'px'; dragLayer.style.top=rect.top+'px'; }
        initL=parseFloat(dragLayer.style.left)||rect.left;
        initT=parseFloat(dragLayer.style.top)||rect.top;
        e.preventDefault();
      }, true);
      handle.addEventListener('pointermove', function(e){
        if(!isDrag) return;
        const dx=e.clientX-startX, dy=e.clientY-startY;
        if(Math.abs(dx)>5||Math.abs(dy)>5) isMove=true;
        if(isMove){
          const w=dragLayer.offsetWidth||160, h=dragLayer.offsetHeight||40;
          const safe=8;
          let nx=Math.max(safe, Math.min(window.innerWidth - w - safe, initL+dx));
          let ny=Math.max(safe + (window.visualViewport?window.visualViewport.offsetTop:0), Math.min(window.innerHeight - h - safe, initT+dy));
          // 避开底部 mini-player（高约 64+safe-area）
          const mpBottom = 70 + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--mp-h'))||0);
          if(ny > window.innerHeight - h - mpBottom) ny = window.innerHeight - h - mpBottom;
          dragLayer.style.left=nx+'px'; dragLayer.style.top=ny+'px';
          state.x=nx; state.y=ny;
        }
      }, true);
      handle.addEventListener('pointerup', function(e){
        isDrag=false; try{ handle.releasePointerCapture(e.pointerId); }catch(_){}
        if(!isMove){ state.expanded=!state.expanded; }
        persist(); syncUI();
      }, true);
    }

    // 恢复永生位置
    if(typeof state.x==='number' && typeof state.y==='number'){
      dragLayer.style.transform='none'; dragLayer.style.left=state.x+'px'; dragLayer.style.top=state.y+'px';
    }
    syncUI();

    // 暴露给项目的同步钩子（在 musicPlay / renderMusic 后调用）
    window.syncCensyIsland = syncUI;

    // 监听项目音频变化（musicAudio 会被重建，这里每次同步重新绑定）
    // 注意：用 addEventListener 而不是 a.onended=… 赋值，避免覆盖项目自身的 onended（否则会重复切歌）
    function bindAudio(){
      const a=getAudio(); if(!a) return;
      if(a._censyV4Bound) return;          // 同一实例只绑一次，防止 800ms 轮询叠加重复监听
      a._censyV4Bound = true;
      try{ a.addEventListener('play',  function(){ syncUI(); }); }catch(e){}
      try{ a.addEventListener('pause', function(){ syncUI(); }); }catch(e){}
      try{ a.addEventListener('ended', function(){ try{ if(window.musicMode!=='one') window.musicNext(); }catch(e){} syncUI(); }); }catch(e){}
    }
    // 初次及定时兜底绑定
    bindAudio();
    setInterval(function(){ bindAudio(); if(getAudio()) syncUI(); }, 800);

  } catch(e){ console.warn('Censy Island init fail', e); }
})();

/* Censy 灵动岛 V4 果冻版永生协议（刷新恢复 DOM + 重新绑定到项目实例） */
(function(){
  try {
    const pDoc = document;
    const ID = 'censy-liquid-island-v4';
    if (!pDoc.getElementById(ID)) {
      // 本体由 template 脚本在首次加载时创建；这里仅作兜底恢复（极少数情况下 template 脚本晚于本段执行）
      const tpl = pDoc.getElementById('censy-island-tpl-v4');
      if(tpl){
        const host = pDoc.createElement('div'); host.id = ID;
        host.appendChild(pDoc.importNode(tpl.content, true));
        pDoc.body.appendChild(host);
      }
    }
  } catch(e){}
})();
/* ==========================================================================
   WorkBuddy 交互补丁 v1 —— 任务 #15（统计数字滚动计数）/#20（主题切换平滑过渡）/
                                   #22（关键字体预加载）
   定位：只做「包装 + 扫描」，不覆盖任何既有业务逻辑；任一环节出错都静默降级。
   ========================================================================== */
(function(){
  "use strict";
  var REDUCED=false;
  try{ REDUCED=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches); }catch(e){}

  /* ---------------- #15 统计数字滚动计数 ----------------
     只动「第一个文本节点」：.sc-val 这类元素里数字后面还跟着
     <span class="sc-unit">项</span> 之类的单位，整体重写会把单位一起抹掉。 */
  function easeOutCubic(t){ return 1-Math.pow(1-t,3); }
  function firstTextNode(el){
    var ch=el.childNodes;
    for(var i=0;i<ch.length;i++){
      if(ch[i].nodeType===3 && String(ch[i].nodeValue).replace(/\s/g,"")) return ch[i];
    }
    return null;
  }
  var COUNT_SEL=".sc-val,.stat-num,.st-num,.streak-num,.ach-num,.goal-num,.count-num,.ring-number,.dash-item b,.hs-num";
  function countUp(el){
    if(!el) return;
    if(el.getAttribute("data-counted")==="1") return;          // 同一个节点只滚一次
    var tn=firstTextNode(el); if(!tn) return;
    var raw=String(tn.nodeValue);
    var m=raw.match(/-?\d+(?:\.\d+)?/);
    if(!m) return;                                              // 「—」「暂无」之类不处理
    var target=parseFloat(m[0]);
    if(!isFinite(target)||target===0){ el.setAttribute("data-counted","1"); return; }
    var at=raw.indexOf(m[0]);
    var pre=raw.slice(0,at), suf=raw.slice(at+m[0].length);
    if(/^,/.test(suf)) return;                                  // 千分位金额（¥1,234）：跳过，滚动会显示成 ¥0,234
    if(suf.replace(/\s/g,"").length>6) return;                  // 数字后面跟了大段文字，说明不是纯统计值
    var dec=(m[0].split(".")[1]||"").length;
    el.setAttribute("data-counted","1");
    if(REDUCED||typeof requestAnimationFrame!=="function") return;
    var dur=Math.min(900,Math.max(420,Math.abs(target)*26));    // 数值越大滚得越久，但设上下限
    var t0=0;
    function step(ts){
      if(!t0)t0=ts;
      var p=Math.min(1,(ts-t0)/dur);
      tn.nodeValue=pre+(target*easeOutCubic(p)).toFixed(dec)+suf;
      if(p<1) requestAnimationFrame(step);
      else tn.nodeValue=pre+target.toFixed(dec)+suf;
    }
    tn.nodeValue=pre+(0).toFixed(dec)+suf;
    requestAnimationFrame(step);
  }
  function countUpSweep(root){
    if(!root||!root.querySelectorAll) return;
    var list=root.querySelectorAll(COUNT_SEL);
    for(var i=0;i<list.length;i++){ try{ countUp(list[i]); }catch(e){} }
  }
  try{ window.countUpSweep=countUpSweep; }catch(e){}

  /* ---------------- #20 主题切换平滑过渡 ----------------
     给 <html> 挂 400ms 的 .theme-anim，让配色渐变而不是瞬切；
     到点摘掉，避免通配 transition 常驻拖慢滚动。 */
  function wrapThemeFn(name){
    try{
      var orig=window[name];
      if(typeof orig!=="function") return;
      window[name]=function(){
        try{
          var h=document.documentElement;
          h.classList.add("theme-anim");
          clearTimeout(window._themeAnimTo);
          window._themeAnimTo=setTimeout(function(){ try{ h.classList.remove("theme-anim"); }catch(e2){} },420);
        }catch(e){}
        return orig.apply(this,arguments);
      };
    }catch(e){}
  }
  ["applyTheme","applyThemeColor","applyThemePreset","applyThemeScheme","setThemeMode"].forEach(wrapThemeFn);

  /* ---------------- #22 关键字体预加载（已随外部 Google Fonts 一并移除）----------------
     外链字体已删除，界面直接使用 :root 里的系统字体栈，不存在 FOUT（字体跳变），
     因此不再需要预加载外部子集。这里直接标记就绪，避免依赖 .fonts-ready 的样式一直停在「未就绪」态。 */
  function markFontsReady(){ try{ document.documentElement.classList.add("fonts-ready"); }catch(e){} }
  try{ markFontsReady(); }catch(e){}
})();
