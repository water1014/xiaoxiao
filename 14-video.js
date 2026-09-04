/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 14/18
   文件：js/14-video.js
   来源：原 index.html 第 27154–27615 行
   内容：B 站视频学习区 + 影音汇聚台（播放器单例 / 全屏横屏）+ 映画观览厅
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ============ B站视频学习区 ============ */
function biliOrient(bvid){
  // 通过 B站 view 接口探测视频分辨率，判断横/竖屏；失败或跨域则回退 "landscape"
  // 用「竞速」：第一个成功的代理即返回，避免逐个等待导致卡顿
  bvid=String(bvid||"").trim();
  const m=bvid.match(/BV[0-9A-Za-z]{10}/);
  if(!m)return Promise.resolve("landscape");
  const api="https://api.bilibili.com/x/web-interface/view?bvid="+m[0];
  const proxied=[
    "https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(api),
    "https://api.allorigins.win/raw?url="+encodeURIComponent(api),
    "https://corsproxy.io/?url="+encodeURIComponent(api)
  ];
  const TIMEOUT=5000;
  const tryOne=function(u){
    const ctrl=mkAbort();
    let to=setTimeout(function(){ if(ctrl)ctrl.abort(); }, TIMEOUT);
    return fetch(u,{cache:"no-store",signal:(ctrl?ctrl.signal:undefined)}).then(function(r){
      clearTimeout(to);
      if(!r.ok)throw new Error("http "+r.status);
      return r.json();
    }).then(function(j){
      const dim=(j&&j.data&&j.data.dimension)||(j&&j.data&&j.data.dimensions);
      if(dim&&dim.width&&dim.height) return (dim.height>dim.width)?"portrait":"landscape";
      throw new Error("no dim");
    }).catch(function(e){ clearTimeout(to); if(ctrl)ctrl.abort(); throw e; });
  };
  // #14 竞速：任一成功即返回；统一在 finally 清理定时器与中止信号，避免 Promise.race 泄漏
  const ctrlList=[];
  const proxiedWithCtrl=proxied.map(function(u){
    const ctrl=mkAbort();
    if(ctrl)ctrlList.push(ctrl);
    return fetch(u,{cache:"no-store",signal:(ctrl?ctrl.signal:undefined)}).then(function(r){
      if(!r.ok)throw new Error("http "+r.status);
      return r.json();
    }).then(function(j){
      const dim=(j&&j.data&&j.data.dimension)||(j&&j.data&&j.data.dimensions);
      if(dim&&dim.width&&dim.height) return (dim.height>dim.width)?"portrait":"landscape";
      throw new Error("no dim");
    });
  });
  const cleanup=function(){ ctrlList.forEach(function(c){try{c.abort();}catch(e){}}); };
  // 旧 WebView 无 Promise.any；改用 allSettled 取首个成功结果，等价于竞速
  const race=Promise.allSettled(proxiedWithCtrl);
  return race.then(function(rs){
    var ok=null;
    for(var i=0;i<rs.length;i++){ if(rs[i].status==="fulfilled"){ ok=rs[i].value; break; } }
    cleanup();
    return ok!=null?ok:"landscape";
  }).catch(function(){ cleanup(); return "landscape"; });
}
function biliEmbed(url){
  var s=String(url).trim();
  var m;
  var params="page=1&high_quality=1&danmaku=0&autoplay=0&as_wide=1&from=workbench";
  // 1) BV 号（完整链接 / 分享文案 / 纯 BV 号都能抓）
  m=s.match(/BV[0-9A-Za-z]{10}/);
  if(m)return "https://player.bilibili.com/player.html?bvid="+m[0]+"&"+params;
  // 2) URL 里显式带 bvid= 参数
  m=s.match(/[?&]bvid=(BV[0-9A-Za-z]{10})/i);
  if(m)return "https://player.bilibili.com/player.html?bvid="+m[1]+"&"+params;
  // 3) av 号（av123456 / /av123456 / ?aid=123456）
  m=s.match(/[?&]aid=(\d+)/i);
  if(m)return "https://player.bilibili.com/player.html?aid="+m[1]+"&"+params;
  m=s.match(/(?:^|\/)av(\d+)/i);
  if(m)return "https://player.bilibili.com/player.html?aid="+m[1]+"&"+params;
  // 4) /video/纯数字（旧链接）
  m=s.match(/\/video\/(\d{6,})/);
  if(m)return "https://player.bilibili.com/player.html?aid="+m[1]+"&"+params;
  return null;
}
function resolveB23(short){
  // 竞速解析：直接请求 + 三个代理并行，第一个拿到 BV 号即返回，避免逐个等待
  var B23_TIMEOUT=6000;
  function extractB23(txt){
    if(!txt)return "";
    var m=txt.match(/BV[0-9A-Za-z]{10}/);
    if(m)return "https://www.bilibili.com/video/"+m[0];
    var m2=txt.match(/[?&]bvid=(BV[0-9A-Za-z]{10})/);
    if(m2)return "https://www.bilibili.com/video/"+m2[1];
    return "";
  }
  function tryFetch(u){
    var ctrl=mkAbort();
    var to=setTimeout(function(){ if(ctrl)ctrl.abort(); }, B23_TIMEOUT);
    return fetch(u,{redirect:"follow",signal:(ctrl?ctrl.signal:undefined)}).then(function(r){
      clearTimeout(to);
      if(r&&r.url&&/BV[0-9A-Za-z]{10}|av\d+|\/video\//.test(r.url))return r.url;
      return r.text().then(function(t){ return extractB23(t); });
    }).catch(function(){ clearTimeout(to); return ""; });
  }
  var candidates=[
    short,
    "https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(short),
    "https://api.allorigins.win/raw?url="+encodeURIComponent(short),
    "https://corsproxy.io/?url="+encodeURIComponent(short)
  ];
  var overall=new Promise(function(res){ setTimeout(function(){res("");}, B23_TIMEOUT+1500); });
  // 旧 WebView 无 Promise.any；用 allSettled 取首个非空结果，配合 overall 超时兜底
  return Promise.race([
    Promise.allSettled(candidates.map(tryFetch)).then(function(rs){
      var ok=null;
      for(var i=0;i<rs.length;i++){ if(rs[i].status==="fulfilled"&&rs[i].value){ ok=rs[i].value; break; } }
      return ok||"";
    }),
    overall
  ]).then(function(url){ return url||""; }).catch(function(){ return ""; });
}
function proxyB23(short,idx){
  var proxies=[
    "https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(short),
    "https://api.allorigins.win/raw?url="+encodeURIComponent(short),
    "https://corsproxy.io/?url="+encodeURIComponent(short)
  ];
  // 与其它 fetch 保持一致：挂上超时中断，避免短链解析卡死后请求悬挂
  var _pCtrl=mkAbort();
  var _pTo=setTimeout(function(){ if(_pCtrl)try{_pCtrl.abort();}catch(e){} },8000);
  return fetch(proxies[idx],{signal:(_pCtrl?_pCtrl.signal:undefined)}).then(function(r){
    clearTimeout(_pTo);
    return r.text();
  }).then(function(t){
    clearTimeout(_pTo);
    if(!t)return "";
    var m=t.match(/BV[0-9A-Za-z]{10}/);
    if(m)return "https://www.bilibili.com/video/"+m[0];
    var m2=t.match(/[?&]bvid=(BV[0-9A-Za-z]{10})/);
    if(m2)return "https://www.bilibili.com/video/"+m2[1];
    return "";
  }).catch(function(){
    return "";
  });
}
function addVideoDirect(colId,raw,embed,orientation){
  state.videos[colId]=state.videos[colId]||[];
  state.videos[colId].unshift({id:uid(),title:raw,embed:embed,orientation:orientation||"landscape"});
  save();var el=$("#videoIn_"+colId);if(el)el.value="";
  renderModule(colId);toast("✅ 视频已添加到【"+colTitle(colId)+"】");
}
function addVideo(colId){
  const el=$("#videoIn_"+colId);if(!el)return;const v=el.value.trim();if(!v)return;
  const embed=biliEmbed(v);
  if(embed){
    const bv=(v.match(/BV[0-9A-Za-z]{10}/)||[""])[0];
    if(bv){ biliOrient(bv).then(function(o){ addVideoDirect(colId,v,embed,o); }); }
    else { addVideoDirect(colId,v,embed,"landscape"); }
    return;
  }
  // b23.tv 短链：自动解析跳转，抓真实地址
  const sm=v.match(/https?:\/\/b23\.tv\/[A-Za-z0-9]+/i);
  if(sm){
    toast("正在解析短链…");
    resolveB23(sm[0]).then(function(url){
      const e2=biliEmbed(url);
      if(e2){addVideoDirect(colId,v,e2);toast("✅ 短链解析成功，视频已添加");}
      else{toast("⚠️ 短链解析失败，请在浏览器打开短链，复制地址栏的完整链接再粘贴");}
    });
    return;
  }
  toast("⚠️ 没找到 BV/av 号，请粘贴完整视频链接，如 https://www.bilibili.com/video/BV1xx411c7mD");
}

function delVideo(colId,fid){
  if(!confirm("删除该视频？"))return;
  const arr=state.videos[colId]||[];
  const idx=arr.findIndex(function(x){return x.id===fid;});
  if(idx<0)return;
  const it=arr[idx];
  undoableDelete("一个视频",
    function(){ state.videos[colId]=arr.filter(function(x){return x.id!==fid;}); save(); renderModule(colId); return true; },
    function(){ const a=state.videos[colId]||[];
                a.splice(Math.min(idx,a.length),0,it); state.videos[colId]=a; save(); renderModule(colId); });
}
function calAspect(v){
  // B站官方播放器 iframe 内部固定 16:9，统一按 16:9 渲染避免 WebView 中缩放异常
  return "16/9";
}
function renderVideoArea(colId){
  const list=state.videos[colId]||[];
  let h='<div class="card"><h3>'+icon('video',16)+' B站视频学习 <span class="tag">'+list.length+' 个</span></h3>';
  h+='<div class="mini-note">粘贴 B站链接或 BV号，点击「播放」在本页展开，或「小窗」悬浮在各页面观看。统一 16:9 比例，避免 App 中画面变形。</div>';
  h+='<div class="video-input"><input id="videoIn_'+colId+'" placeholder="粘贴B站链接 / BV号" /><button onclick="addVideo(\''+colId+'\')">添加</button></div>';
  if(list.length){
    h+='<div class="video-list">';
    list.forEach(v=>{
      h+='<div class="video-item"><div class="vhead"><span class="vtitle">▶ '+esc(v.title||"B站视频")+'</span>'+
         '<button class="feed-play" onclick="playBiliInline(\''+colId+'\',\''+v.id+'\')" title="播放">'+icon('play',12)+'</button>'+
         '<button class="feed-play" onclick="playBiliFloat(\''+escJs(v.embed)+'\',\''+escJs(v.title||"B站视频")+'\')" title="小窗">'+icon('picture',12)+' 小窗</button>'+
         '<button class="feed-play" onclick="delVideo(\''+colId+'\',\''+v.id+'\')">'+icon('trash',12)+'</button></div>'+
         '<div id="biliInline_'+colId+'_'+v.id+'" class="bili-inline" style="display:none"></div>'+'</div>';
    });
    h+='</div>';
  }else{
    h+='<div class="mini-note">暂无视频，粘贴一个 B站链接试试 '+icon('sparkle',12)+'</div>';
  }
  h+='</div>';
  return h;
}

/* ============ 影音汇聚台（站内B站播放） ============ */
function showBili(){
  currentView="bili";saveLastView();$("#view-home").classList.remove("active");$("#view-module").classList.add("active");navSmall();
  $("#topTitle").innerHTML=icon("video")+" B站播放";renderBili();renderDrawer();renderBotTab();
}
function renderBili(){
  const v=$("#view-module");
  const list=(state.biliVideos||[]).slice().reverse();
  let h='<div class="back-row"><button onclick="showHome()" aria-label="返回"><svg class="svg-ic" viewBox="0 0 24 24" width="20" height="20"><path d="M15 5l-7 7 7 7"/></svg></button><div style="font-weight:600">'+icon('video',18)+' B站播放</div></div>';
  h+='<div class="mod-head"><div class="mod-h1">'+icon('video',18)+' B站播放</div><div class="mod-sub">粘贴 B站链接 / BV号 / b23短链 · 点「'+icon('play',12)+'」直接在工作台观看，不跳转</div></div>';
  h+='<div class="card" style="margin-top:12px"><h3>'+icon('plus',16)+' 添加视频</h3>';
  h+='<div class="feed-input"><input id="biliIn" placeholder="粘贴链接，如 https://www.bilibili.com/video/BV1xx 或 BV1xx" /><button onclick="addBiliVideo()">添加</button></div>';
  h+='<div class="mini-note">支持：完整链接 / BV号（BV+10位）/ b23.tv 短链（短链可能需重新解析）</div></div>';
  h+='<div class="card" style="margin-top:12px"><h3>'+icon('video',16)+' 视频列表 <span class="tag">'+list.length+' 个</span></h3>';
  if(!list.length)h+='<div class="mini-note">还没有视频，先粘一条链接吧 '+icon('sparkle',12)+'</div>';
  list.forEach(f=>{
    const label=(f.title||f.url||"").replace(/^https?:\/\/(www\.)?/,"");
    h+='<div style="padding:10px 0;border-bottom:1px solid var(--glass-border);display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
      '<span style="flex:1;min-width:120px;font-size:13px;color:var(--ink);word-break:break-all">'+esc(label)+'</span>'+
      '<span style="font-size:11px;color:var(--gray)">'+esc(f.time)+'</span>'+
      '<button class="feed-play" onclick="playBili(\''+f.id+'\')">'+icon('play',12)+' 播放</button>'+
      '<button class="feed-play" onclick="playBiliFloat(\''+escJs(f.embed)+'\',\''+escJs(f.title||"B站视频")+'\')">'+icon('picture',12)+' 小窗</button>'+
      '<button class="feed-play" onclick="delBili(\''+f.id+'\')">'+icon('trash',12)+'</button>'+
      '</div>';
    h+='<div id="biliWrap_'+f.id+'" style="display:none;margin:6px 0"></div>';
  });
  h+='</div>';
  v.innerHTML=h;
}
function addBiliVideo(){
  const el=$("#biliIn");if(!el)return;const v=el.value.trim();if(!v)return;
  const emb=biliEmbed(v);
  const rec={id:uid(),url:v,title:(v.match(/BV[0-9A-Za-z]{10}/)||[""])[0]||"B站视频",embed:emb||"",time:nowStamp()};
  state.biliVideos=state.biliVideos||[];state.biliVideos.push(rec);save();
  el.value="";renderBili();toast("✅ 已添加，点「▶ 播放」观看");
  if(!emb&&/b23\.tv/i.test(v)){
    toast("⏳ 正在解析 b23 短链…");
    resolveB23(v).then(function(url){
      const i=(state.biliVideos||[]).findIndex(x=>x.id===rec.id);
      if(i>=0){state.biliVideos[i].embed=biliEmbed(url)||"";state.biliVideos[i].url=url;save();renderBili();}
      if(state.biliVideos[i]&&state.biliVideos[i].embed)toast("✅ 短链解析成功，可播放了");
      else toast("⚠️ 短链解析失败，请粘贴完整链接或BV号");
    });
  }
}
function biliIframeHtml(emb){
  return '<iframe src="'+emb+'" style="width:100%;height:100%;border:none;display:block" allowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" scrolling="no" loading="lazy"></iframe>';
}
/* ===== 修复：B站播放器单例 —— 任意时刻只允许一个视频在播放 =====
   悬浮窗 / 栏目内联 / B站页内嵌 三处互不关闭，会出现两个视频同时响。
   打开任一播放器前先清空其它所有播放容器。 */
function closeAllBiliPlayers(keep){
  try{
    document.querySelectorAll('[id^="biliWrap_"],[id^="biliInline_"],.bili-inline').forEach(function(w){
      if(w===keep)return;
      if(!w.innerHTML)return;
      try{ if(w.classList&&w.classList.contains("video-fs"))exitFsVideo(w); }catch(e){}
      w.innerHTML=""; w.style.display="none";
    });
    const box=$("#floatVideo"),body=$("#floatVideoBody");
    if(body&&body!==keep&&body.innerHTML){ body.innerHTML=""; }
    if(box&&body!==keep&&(!keep||(keep.parentNode!==box))){ box.style.display="none"; }
  }catch(e){}
}
function playBili(id){
  const f=(state.biliVideos||[]).find(x=>x.id===id);if(!f)return;
  const wrap=document.getElementById("biliWrap_"+id);
  if(!wrap)return;
  if(wrap.style.display!=="none"){wrap.style.display="none";wrap.innerHTML="";return;}
  closeAllBiliPlayers(wrap);
  let emb=f.embed||biliEmbed(f.url);
  if(!emb){wrap.innerHTML='<div class="mini-note">⚠️ 无法解析，请粘贴完整链接或BV号</div>';wrap.style.display="";return;}
  wrap.innerHTML='<div class="bili-inline">'+
    '<div style="position:absolute;top:8px;right:8px;z-index:3;display:flex;gap:6px">'+
    '<button class="feed-play" style="padding:4px 10px" onclick="toggleFsVideo(this)">'+icon("expand",14)+' 全屏</button>'+
    '<button class="feed-play" style="padding:4px 10px" onclick="this.closest(\'.bili-inline\').parentNode.style.display=\'none\';this.closest(\'.bili-inline\').parentNode.innerHTML=\'\';">关闭</button>'+
    '</div>'+biliIframeHtml(emb)+'</div>';
  wrap.style.display="";
}
function playBiliInline(colId,id){
  const list=state.videos[colId];const f=list?list.find(x=>x.id===id):null;
  if(!f)return;
  const wrap=document.getElementById("biliInline_"+colId+"_"+id);
  if(!wrap)return;
  if(wrap.style.display!=="none"){wrap.style.display="none";wrap.innerHTML="";return;}
  closeAllBiliPlayers(wrap);
  let emb=f.embed||biliEmbed(f.url);
  if(!emb){wrap.innerHTML='<div class="mini-note">⚠️ 无法解析</div>';wrap.style.display="";return;}
  wrap.innerHTML='<div style="position:absolute;top:8px;right:8px;z-index:3;display:flex;gap:6px">'+
    '<button class="feed-play" style="padding:4px 10px" onclick="toggleFsVideo(this)">'+icon("expand",14)+' 全屏</button>'+
    '<button class="feed-play" style="padding:4px 10px" onclick="this.closest(\'.bili-inline\').style.display=\'none\';this.closest(\'.bili-inline\').innerHTML=\'\';">关闭</button>'+
    '</div>'+biliIframeHtml(emb);
  wrap.style.display="";
}
function playBiliFloat(emb,title){
  if(!emb){toast("⚠️ 无法解析");return;}
  const box=$("#floatVideo"),body=$("#floatVideoBody"),tit=$("#floatVideoTitle");
  if(!box||!body)return;
  closeAllBiliPlayers(body);
  tit.textContent=title||"小窗播放";
  // 修复：小窗原本没有全屏入口，只能竖着在小框里看；补一个全屏按钮（走横屏伪全屏）
  body.innerHTML=biliIframeHtml(emb)+'<button class="fv-fs" onclick="toggleFsVideo(this)" title="全屏">'+icon("expand",14)+' 全屏</button>';
  box.style.display="block";
  initFloatVideoDrag();
}
function closeFloatVideo(){
  const box=$("#floatVideo"),body=$("#floatVideoBody");
  if(box)box.style.display="none";
  if(body){
    try{ if(body.classList&&body.classList.contains("video-fs"))exitFsVideo(body); }catch(e){}
    body.innerHTML="";
  }
}
function initFloatVideoDrag(){
  const box=$("#floatVideo");const head=box?box.querySelector(".fv-head"):null;
  if(!box||!head||head._dragBound)return;
  head._dragBound=true;
  head.addEventListener("pointerdown",function(e){
    e.preventDefault();
    const startX=e.clientX,startY=e.clientY;
    const rect=box.getBoundingClientRect();
    const startL=rect.left,startT=rect.top;
    function move(ev){
      const dx=ev.clientX-startX,dy=ev.clientY-startY;
      box.style.left=(startL+dx)+"px";box.style.top=(startT+dy)+"px";
      box.style.right="auto";box.style.bottom="auto";
    }
    function up(){document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",up);document.removeEventListener("pointercancel",up);}
    document.addEventListener("pointermove",move);document.addEventListener("pointerup",up);document.addEventListener("pointercancel",up);
  });
}
/* ===== 修复：全屏横屏 =====
   旧实现：先调 iframe.requestFullscreen（多数 WebView 直接失败），失败则套一层
   width:100vw/height:100vh 的 CSS 容器 —— 16:9 画面被强拉变形，且永远是竖的，
   在锁定竖屏的 APK 里根本无法横屏放大。
   新实现：CSS 伪全屏 + 16:9 画面按视口计算尺寸并居中；竖屏视口下把画面
   旋转 90° 铺满整屏，得到真正的「横屏大画面」。同时把容器挂到 body 下，
   避免被 .float-video 的 backdrop-filter / .app 的 overflow:hidden 困住。 */
function biliFsIframe(container){
  try{
    const fr=container?container.querySelector("iframe"):null; if(!fr)return;
    const vw=window.innerWidth||document.documentElement.clientWidth||screen.width;
    const vh=window.innerHeight||document.documentElement.clientHeight||screen.height;
    let w,h,rot;
    if(vh>vw){                       // 竖屏视口：旋转 90° 后可用区域为 vh × vw
      w=vh; h=Math.round(vh*9/16);
      if(h>vw){ h=vw; w=Math.round(vw*16/9); }
      rot=90;
    }else{                           // 已是横屏：直接 16:9 居中
      w=vw; h=Math.round(vw*9/16);
      if(h>vh){ h=vh; w=Math.round(vh*16/9); }
      rot=0;
    }
    fr.style.position="absolute";
    fr.style.left="50%"; fr.style.top="50%";
    fr.style.width=w+"px"; fr.style.height=h+"px";
    fr.style.maxWidth="none"; fr.style.maxHeight="none";
    fr.style.border="none";
    fr.style.transform="translate(-50%,-50%)"+(rot?(" rotate("+rot+"deg)"):"");
    fr.style.transformOrigin="center center";
  }catch(e){}
}
function exitFsVideo(container){
  try{
    if(!container)return;
    container.classList.remove("video-fs");
    const c=container.querySelector(".fs-close"); if(c)c.remove();
    const fr=container.querySelector("iframe");
    if(fr){
      fr.style.width="100%"; fr.style.height="100%";
      fr.style.position=""; fr.style.left=""; fr.style.top="";
      fr.style.transform=""; fr.style.transformOrigin="";
      fr.style.maxWidth=""; fr.style.maxHeight="";
    }
    // 还原到原来的 DOM 位置（全屏时被临时挂到 body 下）
    if(container._fsParent){
      try{ container._fsParent.insertBefore(container, container._fsNext||null); }
      catch(e){ container._fsParent.appendChild(container); }
      container._fsParent=null; container._fsNext=null;
    }
    try{ if(screen.orientation&&screen.orientation.unlock){ screen.orientation.unlock(); } }catch(e){}
  }catch(e){}
}
/* 退出全屏，并同步回收为「返回键退出全屏」压入的历史记录 */
function biliFsExit(container){
  try{
    var ns=(container&&container.classList&&container.classList.contains("video-fs"))?[container]:document.querySelectorAll(".video-fs");
    for(var i=0;i<ns.length;i++) exitFsVideo(ns[i]);
  }catch(e){}
  if(window._fsPushed&&!window._fsPopping){
    window._fsPushed=false; window._fsBack=true;
    try{ history.back(); }catch(e){ window._fsBack=false; }
  }else{ window._fsPushed=false; }
}
window.addEventListener("popstate",function(){
  if(window._fsBack){ window._fsBack=false; return; }
  window._fsPopping=true;
  try{ var ns=document.querySelectorAll(".video-fs"); for(var i=0;i<ns.length;i++) exitFsVideo(ns[i]); }catch(e){}
  window._fsPopping=false; window._fsPushed=false;
});
function toggleFsVideo(btn){
  try{
    const container=(btn.closest?btn.closest(".bili-inline"):null)||(btn.closest?btn.closest(".fv-body"):null);
    if(!container){toast("⚠️ 未找到可全屏的视频");return;}
    if(container.classList.contains("video-fs")){ biliFsExit(container); return; }
    // 先记住原父级，再停掉其它播放器（清理会移除 container，顺序反了就还原不回去）
    if(!container._fsParent){
      container._fsParent=container.parentNode;
      container._fsNext=container.nextSibling;
    }
    closeAllBiliPlayers(container);
    // 脱离原父级（小窗的 backdrop-filter / .app 的 overflow 会限制 fixed 全屏范围）
    document.body.appendChild(container);
    container.classList.add("video-fs");
    const c=document.createElement("button");c.className="fs-close";c.textContent="✕ 退出全屏";
    c.setAttribute("onclick","toggleFsVideo(this)");
    container.appendChild(c);
    biliFsIframe(container);
    // 全屏时压一条历史，Android 返回键先退出全屏，而不是直接退出 App
    if(!window._fsPushed){ try{ history.pushState({biliFs:1},""); window._fsPushed=true; }catch(e){} }
    try{ if(screen.orientation&&screen.orientation.lock){ screen.orientation.lock('landscape')["catch"](function(){}); } }catch(e){}
    if(!window._biliFsResize){
      window._biliFsResize=true;
      var onRs=function(){ try{
        var ns=document.querySelectorAll(".video-fs");
        for(var i=0;i<ns.length;i++)biliFsIframe(ns[i]);
      }catch(e){} };
      window.addEventListener("resize",onRs);
      window.addEventListener("orientationchange",function(){ setTimeout(onRs,300); });
    }
  }catch(e){ toast("⚠️ 当前环境不支持全屏"); }
}
function flipBiliOrient(colId,fid,btn){
  // 已禁用竖屏，切换无意义，改为提示
  toast("已统一使用 16:9 横屏播放，避免 App 中画面缩放异常");
}
function delBili(id){if(!confirm("删除这条视频？"))return;state.biliVideos=(state.biliVideos||[]).filter(x=>x.id!==id);save();renderBili();}
/* ============ 映画观览厅 + 视频开关 ============ */
function showVideoHub(){
  currentView="videos";saveLastView();$("#view-home").classList.remove("active");$("#view-module").classList.add("active");navSmall();
  $("#topTitle").innerHTML=icon("video")+" 视频汇总";
  const v=$("#view-module");
  let html='<div class="back-row"><button onclick="showHome()" aria-label="返回"><svg class="svg-ic" viewBox="0 0 24 24" width="20" height="20"><path d="M15 5l-7 7 7 7"/></svg></button><div style="font-weight:600">'+icon('video',16)+' 视频汇总</div></div>';
  html+='<div class="mod-head"><div class="mod-h1">'+icon('video',20)+' 视频汇总</div><div class="mod-sub">所有栏目的 B站视频汇总，一处看全部</div></div>';
  let total=0;
  for(const id in MODULE_DEFS){
    const list=state.videos[id]||[];
    if(!list.length)continue;
    total+=list.length;
    html+='<div class="card"><h3>'+icon(MODULE_DEFS[id].icon,16)+' '+esc(MODULE_DEFS[id].title)+' <span class="tag">'+list.length+' 个</span></h3>';
    list.forEach(vv=>{html+='<div class="video-item"><div class="vhead"><span class="vtitle">'+icon('play',12)+' '+esc(vv.title)+'</span><button class="feed-play" onclick="playBiliInline(\''+id+'\',\''+vv.id+'\')">播放</button><button class="feed-play" onclick="playBiliFloat(\''+escJs(vv.embed)+'\',\''+escJs(vv.title)+'\')">小窗</button></div><div id="biliInline_'+id+'_'+vv.id+'" class="bili-inline" style="display:none"></div></div>';});
    html+='</div>';
  }
  if(!total)html+='<div class="card"><h3>暂无视频</h3><div class="mini-note">在各栏目底部「B站视频学习」区添加视频后，会自动汇总到这里。</div></div>';
  v.innerHTML=html;
  renderDrawer();renderBotTab();
}
function toggleVideo(id){
  state.meta.videoOn=state.meta.videoOn||{};
  if(state.meta.videoOn[id]===false){delete state.meta.videoOn[id];}
  else{state.meta.videoOn[id]=false;}
  save();renderDecor();toast("✅ 视频区开关已更新");
}
