/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 17/18
   文件：js/17-music-app.js
   来源：原 index.html 第 28647–29817 行
   内容：音乐小 App：整页沉浸主页 + 装修面板 + 头像名片 + 心愿歌单 + 播放控制
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* === 音乐小 App · 主页（重做：整页沉浸 + 头像 + 4 歌单 + 已播列表 + 折叠更多信息）===
   风格对齐参考图左：Music 顶栏 → 圆形头像 → 用户名 → 签名 → 4 个方形歌单封面
                    → 已播音乐列表（3 首 + 全屏播放器按钮）→ 折叠的 ny-feed。
   整页背景 = 曲目封面取色 → 暗色蒙版 → 噪点纹理，由 .mp-app 容器统一驱动。 */
function buildMusicHome(){
  var h="";
  h+="<div class='music-root mp-app' id='musicRoot'>";
  // 整页背景：取色驱动 + 噪点（具体取色在 renderMusic 后由 mpAppApplyColor() 完成）
  h+="<div class='mp-app-bg' id='mpAppBg' aria-hidden='true'>";
  h+="<div class='mp-app-bg-img'></div>";
  h+="<div class='mp-app-bg-tint'></div>";
  h+="<div class='mp-app-bg-grain'></div>";
  h+="</div>";
  // 装饰壁纸（用户上传的）
  if(musicDecor.wallpaper) h+="<div class='md-wall' aria-hidden='true' style=\"background-image:url('"+musicDecor.wallpaper+"')\"></div>";

  h+="<div class='mp-page active' data-page='home'>";
  // 顶栏：居中 "Music"（参考图 1）
  h+="<div class='mp-app-top'><button onclick='showHome()' aria-label='返回首页'>"+icon('back',18)+"</button><b class='mp-app-title'>Music</b><button onclick='musicMore()' title='更多' aria-label='更多'>+</button></div>";

  // 头像区：昵称/头像/签名全部可自定义（musicDecor），点头像或名字即开「我的名片」
  var nick=musicNick();
  var avImg=musicDecor.avatar||"";
  var letter=(nick&&nick.charAt(0))||"笑";
  h+="<div class='mp-app-profile'>";
  h+="<div class='mp-app-avatar"+(avImg?" has-img":"")+"' data-letter='"+esc(letter)+"'"+
     " onclick='musicAvatarSheet()' role='button' tabindex='0' aria-label='更换头像'"+
     (avImg?" style=\"background-image:url('"+esc(avImg)+"')\"":"")+">"+
     "<span class='av-edit' aria-hidden='true'>✎</span></div>";
  h+="<div class='mp-app-name' onclick='musicAvatarSheet()' role='button' tabindex='0'>"+esc(nick)+"</div>";
  h+="<div class='mp-app-sig' onclick='musicAvatarSheet()' role='button' tabindex='0'>" + esc(musicDecor.signature||'"人类是我的兼职"') + "</div>";
  h+="</div>";

  // 4 个歌单封面（Love / Miss / Whisper / Eternity）
  var pvImgs=(musicDecor&&musicDecor.pvImgs)||[];
  var pfNames=["Love","Miss","Whisper","Eternity"];
  h+="<div class='mp-app-pfs'>";
  for(var p=0;p<4;p++){
    var bg = pvImgs[p] ? pvImgs[p] : (musicTracks[p]?nyCoverFor(musicTracks[p],p):"");
    var cls = pvImgs[p] ? "pf pf-custom" : (bg?"pf":"pf pf-empty");
    h+="<div class='"+cls+"' onclick='musicPickCover("+p+")' title='点此换封面'"+(bg?" style=\"background-image:url('"+bg+"')\"":"")+">";
    h+="<span class='pf-label'>"+pfNames[p]+"</span></div>";
  }
  h+="</div>";

  // 已播音乐列表
  h+="<div class='mp-app-pl-header'><b>已播音乐列表</b><span>"+(musicTracks.length||0)+" 首</span>";
  h+="<button class='mp-app-full-btn' onclick='showMusicPlayer()' aria-label='全屏播放器'>↗ 全屏播放器</button></div>";

  h+="<div class='mp-app-pl'>";
  musicTracks.slice(0,3).forEach(function(t,i){
    var realIdx=musicTracks.indexOf(t);
    var on=realIdx===musicIdx;
    var bg=nyCoverFor(t,realIdx);
    h+="<div class='mp-app-pl-row"+(on?" on":"")+"' onclick='musicPlay("+realIdx+",{go:true})'>";
    h+="<div class='mp-app-pl-cvr' style=\"background-image:url('"+bg+"')\"></div>";
    h+="<div class='mp-app-pl-tx'><b>"+esc(t.name)+"</b><i>"+esc(t.artist||"未知歌手")+" · 来自 "+(pfNames[i]||"Love")+"</i></div>";
    h+="<div class='mp-app-pl-go'>"+(on?"⏸":"▶")+"</div>";
    h+="</div>";
  });
  h+="</div>";

  // 折叠区（默认收起）：白噪音/定时/导入/待听/完整列表/说明
  h+="<div class='mp-app-fold'>";
  h+="<div class='mp-app-fold-h' onclick='mpFoldToggle(this)'><span>更多信息</span><i class='mp-f-arrow'>⌄</i></div>";
  h+="<div class='mp-app-fold-body' style='display:none'>";
  h+=buildMusicFeed();
  h+="</div></div>";

  h+="</div>"; // .mp-page
  h+="</div>"; // .music-root
  return h;
}
/* 主页折叠区切换 */
function mpFoldToggle(el){
  try{
    var body=el&&el.nextElementSibling; if(!body) return;
    var show=(body.style.display==='none');
    body.style.display=show?'':'none';
    if(el) el.classList.toggle('on', show);
  }catch(e){}
}

/* ══════════════════════════════════════════════════════════
   音乐主页「装修」系统
   底色/花体文案/装饰透明度都可随时改，存 localStorage，刷新保留。
   用法：musicDecorate({bg:'#f8f8f8', script:'Heal my wounds', decOp:.5, footer:'…'})
         musicDecorReset() 恢复默认
   ══════════════════════════════════════════════════════════ */
var MUSIC_DECOR_KEY="musicDecor.v1";
var MUSIC_DECOR_DEFAULT={bg:"#f8f8f8",script:"Heal my wounds",footer:"结束一起听歌 with your soft lips",decOp:.5,
  wallpaper:"",wallOp:.34,wallBlur:0,pvImgs:["","","",""]};
var musicDecor=(function(){
  try{ var o=JSON.parse(localStorage.getItem(MUSIC_DECOR_KEY)||"{}"); return (o&&typeof o==="object")?o:{}; }catch(e){ return {}; }
})();
/** 把装修配置写到 .music-root 的 CSS 变量上（渲染后、以及运行时换装时都要调） */
function applyMusicDecor(){
  var r=document.querySelector(".music-root"); if(!r) return;
  try{
    if(musicDecor.bg) r.style.setProperty("--music-bg",musicDecor.bg);
    if(typeof musicDecor.decOp==="number") r.style.setProperty("--music-deco-op",String(musicDecor.decOp));
    /* 壁纸两个可调项：透明度 + 柔化程度（都是纯视觉，写变量即可，无需重排） */
    if(typeof musicDecor.wallOp==="number") r.style.setProperty("--music-wall-op",String(musicDecor.wallOp));
    if(typeof musicDecor.wallBlur==="number") r.style.setProperty("--music-wall-blur",musicDecor.wallBlur+"px");
    /* 主题色：驱动播放按钮渐变与强调色 */
    if(musicDecor.accent){
      var ac=musicDecor.accent;
      r.style.setProperty("--mp-accent",ac);
      // 自动生成浅/深两档：浅色端提亮 35%，深色端压暗 20%
      try{
        var rgb=hexToRgb(ac); if(rgb){
          var l1="rgb("+Math.min(255,rgb.r+55)+","+Math.min(255,rgb.g+55)+","+Math.min(255,rgb.b+55)+")";
          var l2="rgb("+Math.max(0,rgb.r-40)+","+Math.max(0,rgb.g-40)+","+Math.max(0,rgb.b-40)+")";
          r.style.setProperty("--mp-play-1",l1);
          r.style.setProperty("--mp-play-2",l2);
        }
      }catch(e){}
    }
  }catch(e){}
}
/** 简易 hex→rgb（仅用于主题色派生，不依赖外部库） */
function hexToRgb(h){
  h=(h||"").replace(/^#/,""); if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  if(!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};
}
/** 运行时换装：合并配置 → 持久化 → 立即生效（不整页重建，只刷音乐视图） */
function musicDecorate(cfg){
  try{
    musicDecor=Object.assign({},musicDecor,cfg||{});
    localStorage.setItem(MUSIC_DECOR_KEY,JSON.stringify(musicDecor));
  }catch(e){}
  applyMusicDecor();
  if(document.querySelector(".music-root")&&typeof renderMusic==="function") renderMusic();
  return musicDecor;
}
/** 恢复默认装修 */
function musicDecorReset(){
  try{ localStorage.removeItem(MUSIC_DECOR_KEY); }catch(e){}
  musicDecor={};
  var r=document.querySelector(".music-root");
  if(r){ try{
    r.style.removeProperty("--music-bg"); r.style.removeProperty("--music-deco-op");
    r.style.removeProperty("--music-wall-op"); r.style.removeProperty("--music-wall-blur");
  }catch(e){} }
  if(document.querySelector(".music-root")&&typeof renderMusic==="function") renderMusic();
}
/** 装修面板：音乐主页顶栏 ⋯ 唤起（含灵动岛开关） */
function musicDecorSheet(){
  try{
    var oldM=document.getElementById("mdzMask"),oldS=document.getElementById("mdzSheet");
    if(oldM)oldM.remove(); if(oldS)oldS.remove();
    var sw=[["#f8f8f8","清冷灰白"],["#ffffff","纯白"],["#f4f1ec","米杏"],["#eef1ee","雾绿"],["#f5f0f3","藕粉"],["#1c1c1e","暗夜"]];
    var cur=musicDecor.bg||MUSIC_DECOR_DEFAULT.bg;
    var d=document.createElement("div");
    d.innerHTML=
      '<div class="mdz-mask" id="mdzMask"></div>'+
      '<div class="mdz-sheet" id="mdzSheet">'+
        '<div class="mdz-h"><b>装修主页</b><button id="mdzClose">✕</button></div>'+
        '<div class="mdz-row"><span>页面底色</span><div class="mdz-swatches" id="mdzSw">'+
          sw.map(function(s){return '<div class="mdz-sw'+(s[0]===cur?' on':'')+'" data-c="'+s[0]+'" title="'+s[1]+'" style="background:'+s[0]+'"></div>';}).join("")+
        '</div></div>'+
        '<div class="mdz-row"><span>自定义色值</span><input class="mdz-inp" id="mdzBgInp" placeholder="#f8f8f8" value="'+esc(musicDecor.bg||"")+'"></div>'+
        '<div class="mdz-row"><span>花体水印</span><input class="mdz-inp" id="mdzScriptInp" placeholder="Heal my wounds" value="'+esc(musicDecor.script||"")+'"></div>'+
        '<div class="mdz-row"><span>底部文案</span><input class="mdz-inp" id="mdzFooterInp" placeholder="结束一起听歌 with your soft lips" value="'+esc(musicDecor.footer||"")+'"></div>'+
        '<div class="mdz-row"><span>装饰浓度</span><input class="mdz-rng" id="mdzOp" type="range" min="0" max="100" value="'+Math.round((typeof musicDecor.decOp==="number"?musicDecor.decOp:MUSIC_DECOR_DEFAULT.decOp)*100)+'"></div>'+
        '<div class="mdz-row"><span>整页壁纸</span><div class="mdz-swatches">'+
          '<div class="mdz-wbox'+(musicDecor.wallpaper?' has':'')+'" id="mdzWallBox" title="点击选图"'+(musicDecor.wallpaper?' style="background-image:url(\''+musicDecor.wallpaper+'\')"':'')+'></div>'+
          '<button class="mdz-mini" id="mdzWallPick">选图</button>'+
          '<button class="mdz-mini" id="mdzWallClr">清除</button></div></div>'+
        '<div class="mdz-row"><span>壁纸透明度</span><input class="mdz-rng" id="mdzWallOp" type="range" min="5" max="100" value="'+Math.round((typeof musicDecor.wallOp==="number"?musicDecor.wallOp:.34)*100)+'"></div>'+
        '<div class="mdz-row"><span>壁纸柔化</span><input class="mdz-rng" id="mdzWallBlur" type="range" min="0" max="12" value="'+(typeof musicDecor.wallBlur==="number"?musicDecor.wallBlur:0)+'"></div>'+
        '<div class="mdz-row"><span>四格预览图</span><div class="mdz-swatches" id="mdzPv">'+
          [0,1,2,3].map(function(i){ var s=(musicDecor.pvImgs&&musicDecor.pvImgs[i])?musicDecor.pvImgs[i]:'';
            return '<div class="mdz-pv'+(s?' has':'')+'" data-i="'+i+'" title="第 '+(i+1)+' 格"'+(s?' style="background-image:url(\''+s+'\')"':'')+'></div>'; }).join("")+
          '<button class="mdz-mini" id="mdzPvClr" title="四格恢复自动封面">清空</button>'+
        '</div></div>'+
        '<div class="mdz-row"><span>灵动岛播放器</span><button class="mdz-toggle'+(window.censyIslandIsEnabled&&window.censyIslandIsEnabled()?' on':'')+'" id="mdzIsland"></button></div>'+
        '<div class="mdz-tip" style="padding-top:10px">壁纸铺满整页底层并自动压暗，不影响文字可读；四格图点主页格子也能直接换。</div>'+
        '<div class="mdz-acts"><button class="mdz-btn" id="mdzReset">恢复默认</button><button class="mdz-btn pri" id="mdzOk">完成</button></div>'+
      '</div>';
    while(d.firstChild) document.body.appendChild(d.firstChild);
    var mask=document.getElementById("mdzMask"),sheet=document.getElementById("mdzSheet");
    requestAnimationFrame(function(){ mask.classList.add("in"); sheet.classList.add("in"); });
    function close(){
      mask.classList.remove("in"); sheet.classList.remove("in");
      setTimeout(function(){ if(mask.parentNode)mask.remove(); if(sheet.parentNode)sheet.remove(); },300);
    }
    function applyNow(){
      var bgi=document.getElementById("mdzBgInp").value.trim();
      var si=document.getElementById("mdzScriptInp").value.trim();
      var fi=document.getElementById("mdzFooterInp").value.trim();
      var op=parseInt(document.getElementById("mdzOp").value,10)/100;
      var cfg={};
      if(bgi) cfg.bg=bgi;
      cfg.script=si||MUSIC_DECOR_DEFAULT.script;
      cfg.footer=fi||MUSIC_DECOR_DEFAULT.footer;
      cfg.decOp=op;
      musicDecorate(cfg);
    }
    document.getElementById("mdzClose").onclick=close;
    mask.onclick=close;
    document.getElementById("mdzOk").onclick=function(){ applyNow(); close(); };
    document.getElementById("mdzReset").onclick=function(){ musicDecorReset(); close(); };
    Array.prototype.forEach.call(document.querySelectorAll("#mdzSw .mdz-sw"),function(el){
      el.onclick=function(){
        Array.prototype.forEach.call(document.querySelectorAll("#mdzSw .mdz-sw"),function(x){x.classList.remove("on");});
        el.classList.add("on");
        document.getElementById("mdzBgInp").value=el.getAttribute("data-c");
      };
    });
    /* ── 图片装修：壁纸 / 四格 ── */
    var wallBox=document.getElementById("mdzWallBox");
    function setWallPreview(src){
      if(!wallBox) return;
      if(src){ wallBox.style.backgroundImage="url('"+src+"')"; wallBox.classList.add("has"); }
      else { wallBox.style.backgroundImage=""; wallBox.classList.remove("has"); }
    }
    function pickWall(){ try{ musicPickWallpaper(setWallPreview); }catch(e){} }
    if(wallBox) wallBox.onclick=pickWall;
    var wp=document.getElementById("mdzWallPick"); if(wp) wp.onclick=pickWall;
    var wc=document.getElementById("mdzWallClr");
    if(wc) wc.onclick=function(){ try{ musicClearWallpaper(setWallPreview); }catch(e){} };
    var wo=document.getElementById("mdzWallOp");
    if(wo) wo.oninput=function(){ musicDecorate({wallOp:parseInt(this.value,10)/100}); };
    var wb=document.getElementById("mdzWallBlur");
    if(wb) wb.oninput=function(){ musicDecorate({wallBlur:parseInt(this.value,10)}); };
    function setPvPreview(el,src){
      if(!el) return;
      if(src){ el.style.backgroundImage="url('"+src+"')"; el.classList.add("has"); }
      else { el.style.backgroundImage=""; el.classList.remove("has"); }
    }
    Array.prototype.forEach.call(document.querySelectorAll("#mdzPv .mdz-pv"),function(el){
      el.onclick=function(){
        var i=parseInt(el.getAttribute("data-i"),10)||0;
        /* 已有图时先问一句：确定→清除，取消→换新图（旧 WebView 支持原生 confirm） */
        if(el.classList.contains("has")){
          var rm=false;
          try{ rm=window.confirm("第 "+(i+1)+" 格：确定清除这张图？\n点「取消」则是换成新图"); }catch(e){}
          if(rm){ try{ musicClearCover(i); setPvPreview(el,""); }catch(e){} return; }
        }
        try{ musicPickCover(i,function(src){ setPvPreview(el,src); }); }catch(e){}
      };
    });
    var pvc=document.getElementById("mdzPvClr");
    if(pvc) pvc.onclick=function(){
      try{
        musicClearPvImgs();
        Array.prototype.forEach.call(document.querySelectorAll("#mdzPv .mdz-pv"),function(el){ setPvPreview(el,""); });
      }catch(e){}
    };
    document.getElementById("mdzIsland").onclick=function(){
      var on=!this.classList.contains("on");
      this.classList.toggle("on",on);
      try{ if(window.censyIslandSetEnabled) window.censyIslandSetEnabled(on); }catch(e){}
    };
  }catch(e){ try{ if(window.musicMore) window.musicMore(); }catch(_){} }
}

/* ══════════════════════════════════════════════════════════
   音乐「更多」菜单（歌单页 / 播放页右上 ⋯ 唤起）
   以前这里只有一句「更多功能开发中」的 toast，灵动岛藏在装修面板里
   根本找不到 —— 现在把高频操作全部摊平到这一层。
   ══════════════════════════════════════════════════════════ */
function musicMore(){
  try{
    var oldM=document.getElementById("mmMask"),oldS=document.getElementById("mmSheet");
    if(oldM)oldM.remove(); if(oldS)oldS.remove();
    var islOn=(window.censyIslandIsEnabled&&window.censyIslandIsEnabled())?true:false;
    var cur=(musicIdx>=0&&musicIdx<musicTracks.length)?musicTracks[musicIdx]:null;
    // 播放页皮肤：ink=暗色黑胶（默认），classic=暖灰玻璃
    var skinClassic=(musicDecor&&musicDecor.playerSkin==="classic");
    var d=document.createElement("div");
    d.innerHTML=
      '<div class="mdz-mask" id="mmMask"></div>'+
      '<div class="mdz-sheet" id="mmSheet">'+
        '<div class="mdz-h"><b>更多</b><button id="mmClose">✕</button></div>'+
        /* 灵动岛：给一个明确开关 + 预览按钮，用户不用再猜它在哪 */
        '<div class="mm-item" id="mmIslWrap">'+
          '<div class="mm-ic">'+icon('music',18)+'</div>'+
          '<div class="mm-tx"><b>灵动岛播放器</b><i>播放时浮在屏幕顶部，可拖动</i></div>'+
          '<div class="mm-right">'+
            '<button class="mm-mini" id="mmIslPeek" title="立刻看一眼它在哪">预览</button>'+
            '<button class="mdz-toggle'+(islOn?' on':'')+'" id="mmIsl"></button>'+
          '</div>'+
        '</div>'+
        '<div class="mm-item" id="mmImport"><div class="mm-ic">'+icon('plus',18)+'</div><div class="mm-tx"><b>导入本地音乐</b><i>支持 mp3 / m4a / flac / wav 等</i></div></div>'+
        (cur?('<div class="mm-item" id="mmCover"><div class="mm-ic">'+icon('image',18)+'</div><div class="mm-tx"><b>更换当前曲目封面</b><i>'+esc(cur.name)+'</i></div></div>'):'')+
        '<div class="mm-item" id="mmDecor"><div class="mm-ic">'+icon('sparkle',18)+'</div><div class="mm-tx"><b>装修主页</b><i>底色 / 壁纸 / 四格图</i></div></div>'+
        '<div class="mm-item" id="mmSkin"><div class="mm-ic">'+icon('sparkle',18)+'</div><div class="mm-tx"><b>播放页皮肤</b><i>当前：'+(skinClassic?'暖灰玻璃':'暗色黑胶')+'</i></div></div>'+
        '<div class="mm-item" id="mmTimer"><div class="mm-ic">'+icon('clock',18)+'</div><div class="mm-tx"><b>定时停止播放</b><i>'+(window._musicSleepAt?'已设置':'未设置')+'</i></div></div>'+
        '<div class="mdz-tip" style="padding-top:8px">灵动岛默认只在播放时出现；点「预览」可立刻看一眼位置。</div>'+
      '</div>';
    while(d.firstChild) document.body.appendChild(d.firstChild);
    var mask=document.getElementById("mmMask"),sheet=document.getElementById("mmSheet");
    requestAnimationFrame(function(){ mask.classList.add("in"); sheet.classList.add("in"); });
    function close(){
      mask.classList.remove("in"); sheet.classList.remove("in");
      setTimeout(function(){ if(mask.parentNode)mask.remove(); if(sheet.parentNode)sheet.remove(); },300);
    }
    document.getElementById("mmClose").onclick=close;
    mask.onclick=close;
    /* 灵动岛开关 */
    var islBtn=document.getElementById("mmIsl");
    if(islBtn) islBtn.onclick=function(){
      var on=!this.classList.contains("on");
      this.classList.toggle("on",on);
      try{ if(window.censyIslandSetEnabled) window.censyIslandSetEnabled(on); }catch(e){}
      if(on){ try{ if(window.censyIslandPeek) window.censyIslandPeek(4200); }catch(e){} }
    };
    var peek=document.getElementById("mmIslPeek");
    if(peek) peek.onclick=function(){
      try{
        if(window.censyIslandIsEnabled && !window.censyIslandIsEnabled()){
          // 关着的话先打开，再预览，否则用户点了没反应更懵
          if(window.censyIslandSetEnabled) window.censyIslandSetEnabled(true);
          if(islBtn) islBtn.classList.add("on");
        }
        if(window.censyIslandPeek) window.censyIslandPeek(4200);
        else toast("灵动岛未就绪");
      }catch(e){ toast("预览失败"); }
    };
    var imp=document.getElementById("mmImport"); if(imp) imp.onclick=function(){ close(); try{ pickMusic(); }catch(e){} };
    var cov=document.getElementById("mmCover"); if(cov) cov.onclick=function(){ close(); try{ pickCover(musicIdx); }catch(e){} };
    var dec=document.getElementById("mmDecor"); if(dec) dec.onclick=function(){ close(); try{ musicDecorSheet(); }catch(e){} };
    /* 播放页皮肤切换：暗色黑胶 ⇄ 暖灰玻璃 */
    var skn=document.getElementById("mmSkin");
    if(skn) skn.onclick=function(){
      close();
      try{
        var nowClassic=(musicDecor&&musicDecor.playerSkin==="classic");
        var next=nowClassic?"ink":"classic";
        if(typeof musicDecorate==="function") musicDecorate({playerSkin:next});
        else { musicDecor=musicDecor||{}; musicDecor.playerSkin=next; }
        try{ renderMusic(); }catch(e){}
        toast(next==="classic"?"播放页已切回「暖灰玻璃」":"播放页已切换为「暗色黑胶」");
      }catch(e){ toast("切换失败"); }
    };
    var tmr=document.getElementById("mmTimer");
    if(tmr) tmr.onclick=function(){
      close();
      try{
        var v=window.prompt("多少分钟后停止播放？（留空或 0 = 取消定时）", window._musicSleepMin||"");
        if(v===null) return;
        var m=parseInt(v,10);
        if(window._musicSleepTimer){ clearTimeout(window._musicSleepTimer); window._musicSleepTimer=null; }
        if(!m||m<=0){ window._musicSleepAt=null; window._musicSleepMin=null; toast("已取消定时停止"); return; }
        window._musicSleepMin=m; window._musicSleepAt=Date.now()+m*60000;
        window._musicSleepTimer=setTimeout(function(){
          try{ if(musicAudio) musicAudio.pause(); }catch(e){}
          window._musicSleepAt=null; window._musicSleepMin=null; window._musicSleepTimer=null;
          try{ renderMiniBar(); renderMusic(); }catch(e){}
          toast("⏰ 定时已到，已暂停播放");
        }, m*60000);
        toast("⏰ "+m+" 分钟后停止播放");
      }catch(e){}
    };
  }catch(e){ try{ toast("菜单打开失败"); }catch(_){} }
}

/* ══════════════════════════════════════════════════════════
   单曲菜单：歌单列表项右侧的 ⋯
   以前这里只 toast 一句歌名，点了等于没点。现在给到 5 个真实操作。
   ══════════════════════════════════════════════════════════ */
function musicItemMore(i){
  try{
    var t=musicTracks[i]; if(!t) return;
    var oldM=document.getElementById("mmMask"),oldS=document.getElementById("mmSheet");
    if(oldM)oldM.remove(); if(oldS)oldS.remove();
    var cover=nyCoverFor(t,i);
    var isCur=(i===musicIdx);
    var d=document.createElement("div");
    d.innerHTML=
      '<div class="mdz-mask" id="mmMask"></div>'+
      '<div class="mdz-sheet" id="mmSheet">'+
        '<div class="mdz-h"><b>歌曲</b><button id="mmClose">✕</button></div>'+
        /* 头部：直接把封面和歌名摆出来，避免「我点的到底是哪首」 */
        '<div class="mm-item mm-head">'+
          '<div class="mm-ic" style="background-image:url(\''+cover+'\');background-size:cover;background-position:center"></div>'+
          '<div class="mm-tx"><b>'+esc(t.name)+'</b><i>'+esc(t.artist||"未知歌手")+(isCur?" · 正在播放":"")+'</i></div>'+
        '</div>'+
        '<div class="mm-item" id="miPlay"><div class="mm-ic">'+icon('play',18)+'</div><div class="mm-tx"><b>播放</b><i>播放并进入播放详情页</i></div></div>'+
        '<div class="mm-item" id="miNext"><div class="mm-ic">'+icon('skipNext',18)+'</div><div class="mm-tx"><b>下一首播放</b><i>插到当前曲目之后</i></div></div>'+
        '<div class="mm-item" id="miFav"><div class="mm-ic">'+icon(t.liked?'heartFill':'heart',18)+'</div><div class="mm-tx"><b>'+(t.liked?"取消收藏":"收藏")+'</b><i>'+(t.liked?"已在「我喜欢的」里":"加入「我喜欢的」")+'</i></div></div>'+
        '<div class="mm-item" id="miCover"><div class="mm-ic">'+icon('image',18)+'</div><div class="mm-tx"><b>更换封面</b><i>从相册选一张图</i></div></div>'+
        '<div class="mm-item" id="miDel"><div class="mm-ic" style="color:#ff6b81">'+icon('trash',18)+'</div><div class="mm-tx"><b style="color:#ff6b81">删除</b><i>从歌单中移除这首</i></div></div>'+
      '</div>';
    while(d.firstChild) document.body.appendChild(d.firstChild);
    var mask=document.getElementById("mmMask"),sheet=document.getElementById("mmSheet");
    requestAnimationFrame(function(){ mask.classList.add("in"); sheet.classList.add("in"); });
    function close(){
      mask.classList.remove("in"); sheet.classList.remove("in");
      setTimeout(function(){ if(mask.parentNode)mask.remove(); if(sheet.parentNode)sheet.remove(); },300);
    }
    document.getElementById("mmClose").onclick=close;
    mask.onclick=close;
    document.getElementById("miPlay").onclick=function(){ close(); musicPlay(i,{go:true}); };
    document.getElementById("miNext").onclick=function(){ close(); musicPlayNext(i); };
    document.getElementById("miFav").onclick=function(){ close(); musicLikeAt(i); };
    document.getElementById("miCover").onclick=function(){ close(); try{ pickCover(i); }catch(e){} };
    document.getElementById("miDel").onclick=function(){ close(); musicDel(i); };
  }catch(e){ try{ toast("菜单打开失败"); }catch(_){} }
}
/** 收藏/取消收藏指定曲目（不依赖当前播放的是哪首） */
function musicLikeAt(i){
  var t=musicTracks[i]; if(!t) return;
  t.liked=!t.liked;
  /* 注意：dbPut 是整条覆盖，字段必须带全，否则 cover 会被抹掉 */
  dbPut({id:t.id,name:t.name,size:t.size,addedAt:t.addedAt,blob:t.blob,dur:t.dur,liked:t.liked,cover:t.cover}).catch(function(){});
  toast(t.liked?"❤️ 已收藏":"💔 取消收藏");
  renderMusic();
}
/** 把第 i 首插到当前曲目之后 */
function musicPlayNext(i){
  if(i<0||i>=musicTracks.length) return;
  var t=musicTracks[i];
  var curObj=(musicIdx>=0&&musicIdx<musicTracks.length)?musicTracks[musicIdx]:null;
  var pos=(musicIdx<0)?0:musicIdx+1;
  if(pos===i){ toast("已经是下一首了"); return; }
  musicTracks.splice(i,1);
  if(pos>i) pos--;                    // 被移走的元素在插入点之前，插入点左移一位
  musicTracks.splice(pos,0,t);
  if(curObj) musicIdx=musicTracks.indexOf(curObj);   // 数组动了，重新定位当前曲目
  renderMusic();
  toast("↻ 已排到下一首："+t.name);
}

/* ══════════════════════════════════════════════════════════
   图片装修：给音乐主页的空白处填图（壁纸 / 四格预览）
   · 图片先经 canvas 压缩再存 localStorage，避免把配额撑爆
   · 与音乐导入同一套「挂载 DOM 再 click」的写法，兼容旧 WebView
   ══════════════════════════════════════════════════════════ */
var MUSIC_IMG_MAX=820*1024;   // 单张上限（压缩后），超了就拒绝并提示
/** 选一张本地图片并压缩（maxW 限制最长边），回调拿到 dataURL
    ⚠️ 名字必须带 ToWidth 后缀：文件里另有全局 compressImage(file,cb,opts)（背景图/封面用，
    带格式校验与 fullRes 选项）。两者同名会互相覆盖，这里改名隔离，避免背景/封面上传调错签名。 */
function compressImageToWidth(file,maxW,cb){
  try{
    var fr=new FileReader();
    fr.onload=function(){
      var img=new Image();
      img.onload=function(){
        try{
          var scale=Math.min(1,(maxW||720)/(img.width||1));
          var w=Math.max(1,Math.round(img.width*scale)), h=Math.max(1,Math.round(img.height*scale));
          var cv=document.createElement("canvas"); cv.width=w; cv.height=h;
          var ctx=cv.getContext("2d");
          if(ctx){ ctx.drawImage(img,0,0,w,h); cb(cv.toDataURL("image/jpeg",0.72)); }
          else cb(null);
        }catch(e){ cb(null); }
      };
      img.onerror=function(){ cb(null); };
      img.src=fr.result;
    };
    fr.onerror=function(){ cb(null); };
    fr.readAsDataURL(file);
  }catch(e){ cb(null); }
}
function pickImageFile(maxW,cb){
  try{ Array.prototype.forEach.call(document.querySelectorAll("input[data-deco-pick]"),function(n){ if(n.parentNode) n.parentNode.removeChild(n); }); }catch(e){}
  var inp=document.createElement("input");
  inp.type="file"; inp.accept="image/*"; inp.setAttribute("data-deco-pick","1");
  inp.style.position="fixed";inp.style.left="-9999px";inp.style.width="1px";inp.style.height="1px";inp.style.opacity="0";
  document.body.appendChild(inp);            // ★ 挂载 DOM，否则旧 WebView 唤不起选择器
  var cleaned=false;
  function cleanup(){ if(cleaned)return; cleaned=true; try{ if(inp.parentNode) inp.parentNode.removeChild(inp); }catch(e){} }
  try{ inp.addEventListener("cancel",cleanup); }catch(e){}
  setTimeout(cleanup,90000);
  inp.onchange=function(){
    var f=(inp.files||[])[0]; cleanup();
    if(!f) return;
    if(!/^image\//.test(f.type||"")){ try{ toast("⚠️ 请选择图片文件"); }catch(e){} return; }
    try{ toast("⏳ 处理图片…"); }catch(e){}
    compressImageToWidth(f,maxW||720,function(dataUrl){
      if(!dataUrl){ try{ toast("⚠️ 这张图读不了，换一张试试"); }catch(e){} return; }
      if(dataUrl.length>MUSIC_IMG_MAX){ try{ toast("⚠️ 图片太大了，换张小一点的"); }catch(e){} return; }
      cb(dataUrl);
    });
  };
  inp.click();
}
/** 取当前四格装修图（始终返回长度 4 的数组，空位为空串） */
function musicPvImgs(){
  var arr=(musicDecor.pvImgs&&musicDecor.pvImgs.slice(0))||[];
  while(arr.length<4) arr.push("");
  return arr.slice(0,4);
}
/* 音乐主页昵称：优先取音乐自定义昵称，其次工作台昵称 */
function musicNick(){
  return (musicDecor&&musicDecor.nickname)||"";
}
/** 头像/名片面板：上传头像、改昵称、改签名、设主题色、选内置头像、输入图片链接 */
function musicAvatarSheet(){
  try{
    var oldM=document.getElementById("avMask"),oldS=document.getElementById("avSheet");
    if(oldM)oldM.remove(); if(oldS)oldS.remove();
    var curAv=musicDecor.avatar||"";
    var curNick=musicNick()||(state.meta&&state.meta.nickname)||"笑笑";
    var curSig=(musicDecor&&musicDecor.signature)||'"人类是我的兼职"';
    var curAccent=(musicDecor&&musicDecor.accent)||"#c9a98c";
    // 内置头像：渐变字母/纯色/花纹
    var builtins=[
      {id:"g1",label:"珊瑚暖",bg:"linear-gradient(145deg,#e8a87c,#c2453a)"},
      {id:"g2",label:"薄荷绿",bg:"linear-gradient(145deg,#7ecfb3,#3a8f7a)"},
      {id:"g3",label:"薰衣紫",bg:"linear-gradient(145deg,#b8a4d4,#7b5fa5)"},
      {id:"g4",label:"深海蓝",bg:"linear-gradient(145deg,#6baed6,#2c5f8a)"},
      {id:"g5",label:"暗夜黑",bg:"linear-gradient(145deg,#3a3a42,#18181c)"}
    ];
    var d=document.createElement("div");
    d.innerHTML=
      '<div class="mdz-mask" id="avMask"></div>'+
      '<div class="mdz-sheet" id="avSheet">'+
        '<div class="mdz-h"><b>我的名片</b><button id="avClose">✕</button></div>'+
        '<div class="mdz-row"><span>昵称</span><input class="mdz-inp" id="avNickInp" placeholder="你的名字" value="'+esc(curNick)+'"></div>'+
        '<div class="mdz-row"><span>签名</span><input class="mdz-inp" id="avSigInp" placeholder="一句话介绍自己" value="'+esc(curSig)+'"></div>'+
        '<div class="mdz-row"><span>主题色</span><div class="mdz-swatches" id="avAccSw">'+
          ["#ec4141","#c9a98c","#7ecfb3","#b8a4d4","#6baed6","#ffffff"].map(function(c){
            return '<div class="mdz-sw'+(c===curAccent?' on':'')+'" data-c="'+c+'" style="background:'+c+';border:1px solid rgba(0,0,0,.12)"></div>';
          }).join("")+
          '</div><input class="mdz-inp" style="width:90px;margin-left:8px" id="avAccInp" value="'+esc(curAccent)+'" placeholder="#c9a98c"></div>'+
        '<div class="mdz-row"><span>头像</span>'+
          '<div class="mdz-wbox'+(curAv?' has':'')+'" id="avBox" title="当前头像"'+(curAv?' style="background-image:url(\''+curAv+'\')"':'')+'></div>'+
          '<button class="mdz-mini" id="avPick">本地上传</button>'+
          '<button class="mdz-mini" id="avLink">粘贴链接</button>'+
          (curAv?'<button class="mdz-mini" id="avClr">移除</button>':'')+
        '</div>'+
        '<div class="mdz-row"><span>内置头像</span><div class="mdz-swatches" id="avBuiltins">'+
          builtins.map(function(b){
            return '<div class="mdz-sw mdz-bi" data-bg="'+esc(b.bg)+'" title="'+b.label+'" style="background:'+b.bg+';width:40px;height:40px;border-radius:50%"></div>';
          }).join("")+
        '</div></div>'+
        '<div class="mdz-acts"><button class="mdz-btn pri" id="avOk">保存</button></div>'+
      '</div>';
    while(d.firstChild) document.body.appendChild(d.firstChild);
    var mask=document.getElementById("avMask"),sheet=document.getElementById("avSheet");
    requestAnimationFrame(function(){ mask.classList.add("in"); sheet.classList.add("in"); });
    function close(){
      mask.classList.remove("in"); sheet.classList.remove("in");
      setTimeout(function(){ if(mask.parentNode)mask.remove(); if(sheet.parentNode)sheet.remove(); },300);
    }
    function applyNow(){
      var n=document.getElementById("avNickInp").value.trim();
      var s=document.getElementById("avSigInp").value.trim();
      var a=document.getElementById("avAccInp").value.trim();
      var cfg={};
      if(n) cfg.nickname=n;
      cfg.signature=s||MUSIC_DECOR_DEFAULT.signature;
      if(a) cfg.accent=a;
      musicDecorate(cfg);
    }
    document.getElementById("avClose").onclick=close;
    mask.onclick=close;
    /* 本地上传 */
    document.getElementById("avPick").onclick=function(){ close(); pickImageFile(400,function(url){ musicDecorate({avatar:url}); toast("✅ 头像已更换"); }); };
    /* 粘贴链接 */
    document.getElementById("avLink").onclick=function(){
      var u=prompt("请输入图片地址（http://… 或 data:image/…）：");
      if(u&&u.trim()){ close(); musicDecorate({avatar:u.trim()}); toast("✅ 头像已设置"); }
    };
    /* 移除 */
    var clr=document.getElementById("avClr"); if(clr) clr.onclick=function(){ close(); musicDecorate({avatar:""}); toast("已恢复默认头像"); };
    /* 内置头像点击 */
    sheet.querySelectorAll(".mdz-bi").forEach(function(el){
      el.onclick=function(){ close(); musicDecorate({avatar:this.getAttribute("data-bg")}); toast("✅ 已选用内置头像"); };
    });
    /* 主题色色块点击 */
    sheet.querySelectorAll("#avAccSw .mdz-sw").forEach(function(el){
      el.onclick=function(){
        sheet.querySelectorAll("#avAccSw .mdz-sw").forEach(function(x){ x.classList.remove("on"); });
        this.classList.add("on");
        document.getElementById("avAccInp").value=this.getAttribute("data-c");
      };
    });
    document.getElementById("avOk").onclick=function(){ applyNow(); close(); };
  }catch(e){ console.warn('musicAvatarSheet',e); }
}
/** 给第 i 个预览格选图（cb 可选：面板开着时用来刷新缩略图） */
function musicPickCover(i,cb){
  pickImageFile(400,function(dataUrl){
    var arr=musicPvImgs();
    arr[i]=dataUrl;
    musicDecorate({pvImgs:arr});
    try{ toast("✅ 第 "+(i+1)+" 格已换图"); }catch(e){}
    if(typeof cb==="function"){ try{ cb(dataUrl); }catch(e){} }
  });
}
/** 清除某一格的装修图 */
function musicClearCover(i){
  var arr=musicPvImgs(); arr[i]="";
  musicDecorate({pvImgs:arr});
}
/** 四格全部清空，恢复成自动取曲目封面 */
function musicClearPvImgs(){ musicDecorate({pvImgs:["","","",""]}); }
/** 选择整页壁纸（cb 可选） */
function musicPickWallpaper(cb){
  pickImageFile(760,function(dataUrl){
    musicDecorate({wallpaper:dataUrl});
    try{ toast("✅ 壁纸已换，可在面板里调透明度"); }catch(e){}
    if(typeof cb==="function"){ try{ cb(dataUrl); }catch(e){} }
  });
}
function musicClearWallpaper(cb){
  musicDecorate({wallpaper:""});
  if(typeof cb==="function"){ try{ cb(""); }catch(e){} }
}

/* ══════════════════════════════════════════════════════════
   待听清单：粘贴歌单文本 → 解析成清单
   ⚠️ 说明（也是刻意的取舍）：本 App 是纯前端离线架构，无法跨域拉取
   网易云/QQ音乐等平台的歌单接口，所以这里是「粘贴歌单内容文本」解析，
   只保存歌名/歌手文本做清单管理，**不下载也不播放任何受版权保护的音频**。
   链接行只作来源标记保留，不会自动展开。
   ══════════════════════════════════════════════════════════ */
var MUSIC_WISH_KEY="musicWishlist.v1";
var musicWishlist=(function(){
  try{ var a=JSON.parse(localStorage.getItem(MUSIC_WISH_KEY)||"[]"); return Array.isArray(a)?a:[]; }catch(e){ return []; }
})();
function saveWishlist(){ try{ localStorage.setItem(MUSIC_WISH_KEY,JSON.stringify(musicWishlist)); }catch(e){} }
function musicWishReload(){
  try{ var a=JSON.parse(localStorage.getItem(MUSIC_WISH_KEY)||"[]"); musicWishlist=Array.isArray(a)?a:[]; }catch(e){ musicWishlist=[]; }
}
/** 解析粘贴文本：逐行识别「歌名 - 歌手」「1. 歌名」「歌名（歌手）」等常见格式 */
function parseWishlistText(txt){
  var out=[], src="";
  String(txt||"").split(/\r?\n/).forEach(function(raw){
    var line=String(raw||"").trim();
    if(!line) return;
    // 纯链接：记为来源，不展开
    if(/^https?:\/\//i.test(line)){ if(!src) src=line; return; }
    // 平台分享套话（"分享XXX创建的歌单「…」"）→ 取书名号内作来源名
    if(/分享.*歌单|我的歌单|收藏歌单/.test(line)){
      var q=line.match(/[「【]([^」】]+)[」】]/);
      if(q) src=q[1];
      return;
    }
    if(/^(via|来自|from)[:： ]/i.test(line)) return;
    // 去掉序号前缀：01. / 1、/ A.
    line=line.replace(/^\d{1,3}\s*[.、,)]\s*/,"").trim();
    var name=line, artist="";
    // 格式一：歌名 - 歌手（含全角破折号）
    var parts=line.split(/\s+[-–—]\s+/);
    if(parts.length>=2 && parts[1].length>0 && parts[1].length<40){
      name=parts[0].trim(); artist=parts[1].trim();
    }else{
      // 格式二：歌名（歌手）
      var m2=line.match(/^(.+?)[（(]([^（）()]+)[）)]\s*$/);
      if(m2){ name=m2[1].trim(); artist=m2[2].trim(); }
    }
    name=name.trim();
    if(!name || name.length>60 || name.length<1) return;
    out.push({id:"w"+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
              name:name, artist:artist, done:false, addedAt:Date.now(), src:src});
  });
  return out;
}
/** 粘贴导入面板 */
function musicWishImport(){
  try{
    var oldM=document.getElementById("mdzMask"),oldS=document.getElementById("mdzSheet");
    if(oldM)oldM.remove(); if(oldS)oldS.remove();
    var d=document.createElement("div");
    d.innerHTML=
      '<div class="mdz-mask" id="mdzMask"></div>'+
      '<div class="mdz-sheet" id="mdzSheet">'+
        '<div class="mdz-h"><b>粘贴歌单生成待听清单</b><button id="mdzClose">✕</button></div>'+
        '<textarea class="mdz-ta" id="mdzTa" placeholder="在任意音乐 App 里打开歌单 → 长按/全选复制歌曲列表，粘贴到这里&#10;&#10;支持格式：&#10;歌名 - 歌手&#10;01. 歌名&#10;歌名（歌手）"></textarea>'+
        '<div class="mdz-tip">解析结果预览（点「导入清单」确认）：</div>'+
        '<div class="mdz-prev" id="mdzPrev">粘贴后将自动解析…</div>'+
        '<div class="mdz-acts"><button class="mdz-btn" id="mdzCancel">取消</button>'+
        '<button class="mdz-btn pri" id="mdzOk2">导入清单</button></div>'+
      '</div>';
    while(d.firstChild) document.body.appendChild(d.firstChild);
    var mask=document.getElementById("mdzMask"),sheet=document.getElementById("mdzSheet");
    var ta=document.getElementById("mdzTa"),prev=document.getElementById("mdzPrev");
    requestAnimationFrame(function(){ mask.classList.add("in"); sheet.classList.add("in"); });
    function close(){
      mask.classList.remove("in"); sheet.classList.remove("in");
      setTimeout(function(){ if(mask.parentNode)mask.remove(); if(sheet.parentNode)sheet.remove(); },300);
    }
    ta.oninput=function(){
      var list=parseWishlistText(ta.value);
      if(!list.length){ prev.innerHTML=ta.value.trim()?"<span style='opacity:.7'>没识别出歌曲，检查下每行是不是「歌名 - 歌手」这类格式</span>":"粘贴后将自动解析…"; return; }
      prev.innerHTML="共识别 <b style='color:var(--ink)'>"+list.length+"</b> 首：<br>"+
        list.slice(0,40).map(function(x,i){ return (i+1)+". "+esc(x.name)+(x.artist?" <span style='opacity:.65'>· "+esc(x.artist)+"</span>":""); }).join("<br>")+
        (list.length>40?"<br>…等共 "+list.length+" 首":"");
    };
    document.getElementById("mdzClose").onclick=close;
    document.getElementById("mdzCancel").onclick=close;
    mask.onclick=close;
    document.getElementById("mdzOk2").onclick=function(){
      var list=parseWishlistText(ta.value);
      if(!list.length){ try{ toast("⚠️ 没识别出歌曲，换个格式试试"); }catch(e){} return; }
      var exist={}; musicWishlist.forEach(function(x){ exist[(x.name+"|"+(x.artist||"")).toLowerCase()]=1; });
      var added=0;
      list.forEach(function(x){
        var k=(x.name+"|"+(x.artist||"")).toLowerCase();
        if(exist[k]) return;              // 去重：同名同歌手不重复加
        exist[k]=1; musicWishlist.push(x); added++;
      });
      saveWishlist();
      close();
      try{ toast(added?("✅ 待听清单 +"+added+" 首"+(added<list.length?"（已跳过重复）":"")):"⚠️ 这些歌已在清单里"); }catch(e){}
      if(typeof renderMusic==="function") renderMusic();
    };
    setTimeout(function(){ try{ ta.focus(); }catch(e){} },350);
  }catch(e){ try{ toast("⚠️ 打开失败，请重试"); }catch(_){} }
}
function musicWishToggle(i){
  if(!musicWishlist[i])return;
  musicWishlist[i].done=!musicWishlist[i].done;
  saveWishlist();
  if(typeof renderMusic==="function") renderMusic();
}
function musicWishDel(i){
  if(!musicWishlist[i])return;
  musicWishlist.splice(i,1); saveWishlist();
  if(typeof renderMusic==="function") renderMusic();
}
function musicWishClearDone(){
  var n=musicWishlist.filter(function(x){return x.done;}).length;
  if(!n){ try{ toast("还没有已完成的条目"); }catch(e){} return; }
  musicWishlist=musicWishlist.filter(function(x){return !x.done;});
  saveWishlist();
  try{ toast("🧹 已清除 "+n+" 条"); }catch(e){}
  if(typeof renderMusic==="function") renderMusic();
}
/* #32 播放封面：为每首曲子生成「确定性渐变封面」——按曲名哈希取色，离线安全、曲曲不同、不喧宾夺主。
   首字母作水印，播放时随封面旋转，听感与视觉联动。 */
function trackCoverCss(name){
  name=String(name||"♪");
  let h=0; for(let i=0;i<name.length;i++){ h=(h*31+name.charCodeAt(i))>>>0; }
  const hue=(h%360), hue2=((h>>3)%360);
  const ang=(h%360);
  return "linear-gradient("+ang+"deg, hsl("+hue+" 68% 72%), hsl("+hue2+" 64% 58%))";
}
function trackCoverInitial(name){
  name=String(name||"♪").trim();
  const ch=name.replace(/[\(\[【].*$/,"").trim().charAt(0);
  return (ch&&!/[0-9]/.test(ch))?ch:"♪";
}
/* 整页沉浸式小 App：根据当前曲目封面取色，驱动 .mp-app 整页背景。
   实现思路：
   1) 把封面图缩到 32x32 画到 canvas（只取一次均值，CPU < 1ms）
   2) 取最亮 + 最暗两个主色（亮做顶、暗做底）
   3) 把亮色作为整页背景主色 + 顶光蒙版；图片作为 .mp-app-bg-img 的 blur 背景
   4) 整页字色 fg 用亮度判断（暗底用白字、亮底用深字）
   这样每首歌"自带皮肤"——参考图右的"白色天使 vs 黑色遐想"切换就是这效果。 */
function mpAppApplyColor(){
  try{
    var root=document.getElementById('musicRoot');
    if(!root || !root.classList.contains('mp-app')) return;
    var t=(musicIdx>=0&&musicIdx<musicTracks.length)?musicTracks[musicIdx]:null;
    var coverUrl=t?nyCoverFor(t,musicIdx):'';
    var bgImg=root.querySelector('.mp-app-bg-img');
    if(bgImg && coverUrl) bgImg.style.backgroundImage="url('"+coverUrl+"')";

    // 默认深色（无曲目 / 取色失败时的兜底）
    var d1='#1a1a1d', d2='#0d0d10', tint='rgba(0,0,0,.55)', fg='#EDEDF0', fgs='rgba(237,237,240,.62)', fgd='rgba(237,237,240,.4)';

    if(coverUrl && /^(data:|https?:|file:)/.test(coverUrl)){
      try{
        var img=new Image();
        img.crossOrigin='anonymous';
        img.onload=function(){
          try{
            var c=document.createElement('canvas');
            c.width=c.height=32;
            var ctx=c.getContext('2d');
            ctx.drawImage(img,0,0,32,32);
            var px=ctx.getImageData(0,0,32,32).data;
            // 取每像素亮度，挑最亮 / 最暗 + 平均色
            var lum=function(r,g,b){return 0.2126*r+0.7152*g+0.0722*b;};
            var minL=999,maxL=-1,sumR=0,sumG=0,sumB=0,n=0;
            for(var i=0;i<px.length;i+=4){
              var r=px[i],g=px[i+1],b=px[i+2],a=px[i+3];
              if(a<128) continue;
              var L=lum(r,g,b);
              if(L<minL){minL=L;var minR=r,minG=g,minB=b;}
              if(L>maxL){maxL=L;var maxR=r,maxG=g,maxB=b;}
              sumR+=r;sumG+=g;sumB+=b; n++;
            }
            if(n===0) return;
            var avgR=sumR/n, avgG=sumG/n, avgB=sumB/n;
            // 用「暗色 + 平均色」做深色背景（避免极端黑）：暗色统一压到 18% 亮度
            var darkR=Math.round(minR*0.4+avgR*0.6*0.3),
                darkG=Math.round(minG*0.4+avgG*0.6*0.3),
                darkB=Math.round(minB*0.4+avgB*0.6*0.3);
            var brightR=Math.round(avgR*0.45+255*0.55),
                brightG=Math.round(avgG*0.45+255*0.55),
                brightB=Math.round(avgB*0.45+255*0.55);
            // 整页背景：暗→更深
            root.style.setProperty('--mp-bg-1','rgb('+darkR+','+darkG+','+darkB+')');
            root.style.setProperty('--mp-bg-2','rgb('+Math.round(darkR*0.55)+','+Math.round(darkG*0.55)+','+Math.round(darkB*0.55)+')');
            // 顶光：平均色提亮做暖光
            root.style.setProperty('--mp-tint','rgba('+brightR+','+brightG+','+brightB+',0.18)');
            // 字色：底色亮度低 → 白字
            var bgL=lum(darkR,darkG,darkB);
            if(bgL>120){
              fg='#2A2520'; fgs='rgba(42,37,32,.65)'; fgd='rgba(42,37,32,.42)';
            }
            root.style.setProperty('--mp-fg',fg);
            root.style.setProperty('--mp-fg-soft',fgs);
            root.style.setProperty('--mp-fg-dim',fgd);
            // 播放按钮配色也跟随封面：用「最亮色」做渐变，深色字保持可读
            root.style.setProperty('--mp-play-1','rgb('+brightR+','+brightG+','+brightB+')');
            root.style.setProperty('--mp-play-2','rgb('+Math.round(brightR*.82)+','+Math.round(brightG*.82)+','+Math.round(brightB*.82)+')');
            root.style.setProperty('--mp-play-fg', (lum(brightR,brightG,brightB)>140)?'#16161a':'#ffffff');
            if(bgImg) bgImg.style.opacity='.9';
          }catch(e){}
        };
        img.onerror=function(){};
        img.src=coverUrl;
      }catch(e){}
    } else {
      // 无封面：清掉图片层
      if(bgImg){ bgImg.style.backgroundImage=''; bgImg.style.opacity='0'; }
    }
  }catch(e){}
}

function renderMusic(){
  var v=$("#view-module"); if(!v)return;
  /* 长列表每次「加载更多」都会整块重建 DOM，滚动位置会跳回顶部，
     翻到第 5 屏再点加载就白白丢掉阅读位置。这里渲染前记下、渲染后还原。 */
  var keepTop=(typeof window._musicScroll==="number")?window._musicScroll:0;
  v.innerHTML=buildMusicHtml();
  applyMusicDecor(); /* 装修配置（底色/装饰浓度）落到 .music-root 的 CSS 变量 */
  // 整页沉浸式小 App：取当前曲目封面主色 → 驱动 .mp-app 背景
  try{ mpAppApplyColor(); }catch(e){}
  if(keepTop>0){ try{ v.scrollTop=keepTop; }catch(e){} }
  if(musicAudio){
    musicAudio.ontimeupdate=function(){updateSeekUI();};
    musicAudio.onloadedmetadata=function(){updateDur();updateSeekUI();};
    var pb=$("#mPlayBtn");if(pb)pb.textContent=(musicAudio.paused?"▶":"⏸");
  }
  updateSeekUI();
  renderMiniBar();
  initLzInfiniteScroll();
  // 当前播放的封面卡滚动到可视区居中（横滑轮播体验）
  try{
    var w=$("#nyWall"); if(w&&musicIdx>=0){
      var cur=w.querySelector(".ny-wall-item.ny-main");
      if(cur&&cur.scrollIntoView) cur.scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"});
    }
  }catch(e){}
  // 记录滚动位置（离开栏目时清零，下次进来还是从头开始）
  try{
    if(!renderMusic._bound){
      renderMusic._bound=true;
      v.addEventListener("scroll",function(){ window._musicScroll=v.scrollTop||0; },{passive:true});
    }
  }catch(e){}
}
/* 音乐栏目经 MODULE_DEFS 体系渲染（renderModule('music') 路径） */
function renderMusicSection(id){
  try{
    var h=buildMusicHtml();
    return '<section class="mod-sec" data-key="audio"><div class="sec-head"><span class="sec-ic">'+icon('music')+'</span><span class="sec-t">清音听雨阁</span></div>'+h+'</section>';
  }catch(e){ return '<div class="card"><div class="mini-note">音乐模块加载失败：'+(e&&e.message||e)+'</div></div>'; }
}
function updateDur(){
  var t=musicIdx>=0?musicTracks[musicIdx]:null;if(!t||!musicAudio||!isFinite(musicAudio.duration)||!musicAudio.duration)return;
  if(t.dur===musicAudio.duration)return;
  t.dur=musicAudio.duration;
  dbPut({id:t.id,name:t.name,size:t.size,addedAt:t.addedAt,blob:t.blob,dur:t.dur}).catch(function(){});
}
function updateSeekUI(){
  var seek=$("#musicSeek");
  if(seek&&musicAudio&&isFinite(musicAudio.duration)&&musicAudio.duration>0){
    seek.value=Math.round((musicAudio.currentTime/musicAudio.duration)*1000);
    var c=$("#mCurT");if(c)c.textContent=fmtDur(musicAudio.currentTime);
    var d=$("#mDurT");if(d)d.textContent=fmtDur(musicAudio.duration);
  }
  var cur=musicIdx>=0&&musicIdx<musicTracks.length?musicTracks[musicIdx]:null;
  var prog=$("#mpProg");
  if(prog){var pct=(musicAudio&&isFinite(musicAudio.duration)&&musicAudio.duration>0)?(musicAudio.currentTime/musicAudio.duration*100):0;prog.style.width=pct+"%";}
  if(cur){
    var t1=$("#mpTitle");if(t1)t1.textContent=cur.name;
    var s1=$("#mpSub");if(s1)s1.textContent=(musicAudio&&!musicAudio.paused?"播放中 · ":"已暂停 · ")+fmtDur(musicAudio?musicAudio.currentTime:0)+" / "+fmtDur(cur.dur);
  }
  var pb=$("#mpPlayBtn");if(pb)pb.innerHTML=(musicAudio&&!musicAudio.paused)?icon("pause",18):icon("play",18);
}
/** 释放当前音乐 Audio 资源：暂停、解绑事件、吊销对象 URL，避免切换/删除时内存与句柄泄漏。 */
function releaseMusicAudio(){
  try{
    if(musicAudio){ musicAudio.pause(); try{ musicAudio.onended=null; musicAudio.onerror=null; musicAudio.onloadedmetadata=null; musicAudio.ontimeupdate=null; }catch(e){} try{ musicAudio.removeAttribute("src"); musicAudio.load(); }catch(e){} }
    if(musicURL){ URL.revokeObjectURL(musicURL); musicURL=null; }
    musicAudio=null;
  }catch(e){}
}
function lzLoadMore(){
  if(!window._lzListShow)window._lzListShow=12;
  window._lzListShow+=12;
  try{ renderMusic(); }catch(e){}
}
/* 进入/离开音乐栏目时重置滚动记忆与分页，避免下次进来停在半山腰 */
function resetMusicScroll(){ window._musicScroll=0; window._lzListShow=12; }
/* 长列表无限滚动：列表底部哨兵进入视口即自动追加下一批（#3.1），保留「加载更多」按钮作降级 */
function initLzInfiniteScroll(){
  try{
    if(window._lzIO){ window._lzIO.disconnect(); window._lzIO=null; }
    const sentinel=document.getElementById("lzSentinel");
    if(!sentinel||!musicTracks.length)return;
    if(!("IntersectionObserver" in window))return; // 不支持则仅靠「加载更多」按钮
    window._lzIO=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting && (window._lzListShow||12) < musicTracks.length){
          window._lzListShow=(window._lzListShow||12)+12;
          renderMusic();
        }
      });
    },{root:document.querySelector(".music-list"),rootMargin:"120px",threshold:0.01});
    window._lzIO.observe(sentinel);
  }catch(e){}
}
/* ══ 播放令牌（防串线）══════════════════════════════════════════
   dbGet 是 IndexedDB 异步查询。快速连点两首歌、或从 mini-player／灵动岛／
   列表同时触发播放时，两次 dbGet 会并发返回，谁后回调谁就把 musicAudio 抢走。
   结果：musicIdx 指向 B 歌、实际响的却是 A 歌（串线），严重时两个 Audio 叠着响。
   解法：每次发起播放领一个递增令牌，回调里发现令牌已过期就整包丢弃。       */
let musicPlayToken=0;
/**
 * 播放第 i 首
 * @param {number} i        曲目索引
 * @param {object} [opt]    {go:true} 播完顺带跳到「播放详情页」（列表点歌用）
 *                          {silent:true} 不弹任何 toast（内部续播用）
 */
function musicPlay(i,opt){
  opt=opt||{};
  if(i<0||i>=musicTracks.length)return;
  window._npHomeDismissed=false; // 重新选曲：让首页「正在播放」卡重新出现
  var t=musicTracks[i];musicIdx=i;
  var myToken=++musicPlayToken;          // ★ 领号：本次播放的唯一凭证
  // 先掐掉正在响的旧音，避免切歌瞬间两首歌重疊
  try{ if(musicAudio&&!musicAudio.paused) musicAudio.pause(); }catch(e){}
  dbGet(t.id).then(function(rec){
    if(myToken!==musicPlayToken) return;  // ★ 过期请求：已被更新的播放取代，直接丢弃
    if(!rec||!rec.blob){toast("⚠️ 找不到该音乐文件");return;}
    releaseMusicAudio(); // 切换前释放旧 Audio / 旧对象 URL，避免内存/句柄泄漏
    musicAudio=new Audio(); // 每次新建实例，彻底释放旧实例（避免复用导致的事件/句柄泄漏）
    musicAudio.src=URL.createObjectURL(rec.blob);musicURL=musicAudio.src;
    musicAudio.volume=musicVol;
    musicAudio.onloadedmetadata=function(){ if(myToken===musicPlayToken) updateDur(); };
    musicAudio.onended=function(){ if(myToken===musicPlayToken) musicEnded(); };
    musicAudio.onerror=function(){ if(myToken===musicPlayToken) toast("⚠️ 播放失败，格式可能不支持"); };
    musicAudio.play().catch(function(e){ if(myToken===musicPlayToken) toast("⚠️ 播放出错："+(e&&e.message||e)); });
    if(opt.go){ musicPage="player"; renderMusic(); }   // 列表点歌 → 进入播放详情页
    else renderMusic();
    if(currentView==="home")renderHome();
  }).catch(function(){ if(myToken===musicPlayToken) toast("⚠️ 读取音乐失败"); });
}
/** 直接打开「播放详情页」（mini-player / 首页正在播放卡 / 灵动岛都走这里） */
function showMusicPlayer(){
  if(!musicTracks.length){ showMusic(); return; }
  if(musicIdx<0||musicIdx>=musicTracks.length) musicIdx=0;
  musicPage="player"; showMusic();
}
function musicToggle(){if(!musicAudio||musicIdx<0){if(musicTracks.length)musicPlay(0);return;}if(musicAudio.paused){musicAudio.play().catch(function(){});}else{musicAudio.pause();}updateSeekUI();var pb=$("#mPlayBtn");if(pb)pb.textContent=musicAudio.paused?"▶":"⏸";renderMiniBar();if(currentView==="home")renderHome();}
function dismissNpHome(){window._npHomeDismissed=true;if(currentView==="home")renderHome();toast("已收起「正在播放」卡片（音乐继续播放）");}
function musicNext(){if(!musicTracks.length)return;var i;if(musicMode==="rand"){i=Math.floor(Math.random()*musicTracks.length);}else{i=(musicIdx+1)%musicTracks.length;}musicPlay(i);}
function musicPrev(){if(!musicTracks.length)return;if(musicAudio&&musicAudio.currentTime>3){musicAudio.currentTime=0;return;}var i=musicIdx-1;if(i<0)i=musicTracks.length-1;musicPlay(i);}
function musicEnded(){if(musicMode==="one"){musicAudio.currentTime=0;musicAudio.play().catch(function(){});}else{musicNext();}}
function musicSwitch(){musicMode=musicMode==="seq"?"one":musicMode==="one"?"rand":"seq";toast(musicMode==="seq"?"🔁 顺序播放":musicMode==="one"?"🔂 单曲循环":"🔀 随机播放");renderMusic();}
/* 音乐变速：循环切换常用倍速，实时作用于当前 Audio */
let musicSpeedIdx=0;
const musicSpeeds=[1.0,1.25,1.5,0.75];
function musicSpeedToggle(){
  musicSpeedIdx=(musicSpeedIdx+1)%musicSpeeds.length;
  if(musicAudio)musicAudio.playbackRate=musicSpeeds[musicSpeedIdx];
  toast("⏩ 速度 "+musicSpeeds[musicSpeedIdx].toFixed(2)+"x");
}
/* 收藏（真持久化）：写入当前曲目的 liked 字段并落库，刷新不丢 */
function musicLikeToggle(){
  if(musicIdx<0||musicIdx>=musicTracks.length)return;
  const t=musicTracks[musicIdx];
  t.liked=!t.liked;
  /* cover 必须一起写回：dbPut 是整条覆盖，漏了就会把已换好的封面抹掉 */
  dbPut({id:t.id,name:t.name,size:t.size,addedAt:t.addedAt,blob:t.blob,dur:t.dur,liked:t.liked,cover:t.cover}).catch(function(){});
  toast(t.liked?"❤️ 已收藏":"💔 取消收藏");
  renderMusic();
}
function musicSeek(v){if(!musicAudio||!isFinite(musicAudio.duration)||!musicAudio.duration)return;musicAudio.currentTime=(v/1000)*musicAudio.duration;}
function musicSetVol(v){musicVol=(parseFloat(v)||0)/100;if(musicAudio)musicAudio.volume=musicVol;localStorage.setItem("ju_music_vol",String(musicVol));var el=$("#volV");if(el)el.textContent=Math.round(musicVol*100);}
function musicDel(i){
  var t=musicTracks[i];if(!t)return;
  if(!confirm("删除「"+t.name+"」？"))return;
  var snap=musicTracks.slice();var snapIdx=musicIdx; // 内存快照，dbDel 失败可回滚
  musicTracks.splice(i,1);
  if(i===musicIdx){musicIdx=-1;releaseMusicAudio();}
  else if(i<musicIdx)musicIdx--;
  renderMusic();
  dbDel(t.id).then(function(){
    toast("🗑 已删除");
  }).catch(function(e){
    // 数据库删除失败：回滚内存与 UI，避免数据不一致
    musicTracks=snap;musicIdx=snapIdx;
    renderMusic();
    toast("⚠️ 删除失败，已撤销："+(e&&e.message||e));
  });
}
/* 换封面：从相册选图 → 压缩成 base64 → 写入 t.cover 并持久化（离线安全、直接被 CSS url() 使用） */
function pickCover(i){
  var t=musicTracks[i];if(!t)return;
  var inp=document.createElement("input");inp.type="file";inp.accept="image/*";
  inp.onchange=function(){
    var f=inp.files&&inp.files[0];if(!f)return;
    if(!/^image\//.test(f.type||"")){toast("⚠️ 请选择图片");return;}
    toast("⏳ 正在处理封面…");
    // 复用项目已有的图片压缩流程（compressImage，压制到 512px / JPEG）
    if(typeof compressImage==="function"){
      compressImage(f,function(out,err){
        if(err||!out){toast(err||"⚠️ 封面处理失败");return;}
        applyCover(i,out);
      },{fullRes:false,max:512});
    } else {
      // 兜底：直接用 FileReader 读原图（不压缩，适合小图）
      var r=new FileReader();
      r.onload=function(){applyCover(i,r.result);};
      r.onerror=function(){toast("⚠️ 读取图片失败");};
      r.readAsDataURL(f);
    }
  };
  inp.click();
}
function applyCover(i,dataUrl){
  var t=musicTracks[i];if(!t)return;
  t.cover=dataUrl;
  // 检查 imageToDataURL 是否已把 blob 一并放入；这里 cover 用 base64 即可直接渲染
  dbPut({id:t.id,name:t.name,size:t.size,addedAt:t.addedAt,blob:t.blob,dur:t.dur,liked:!!t.liked,cover:dataUrl}).then(function(){
    toast("🖼 封面已更新");
    renderMusic();
  }).catch(function(){toast("⚠️ 封面保存失败");});
}
function pickMusic(){
  /* 关键修复：旧版 Android WebView 上，游离（未挂载到 DOM）的 <input type=file> 调 .click()
     经常唤不起系统文件选择器，表现就是「点导入没反应」。这里必须挂进 body 再触发。
     accept 同时给 MIME 与显式扩展名，避免部分 ROM 过滤过严导致列表里看不到音乐文件。 */
  // 先清掉上一次可能残留的节点（低版本 WebView 不一定触发 cancel 事件）
  try{ Array.prototype.forEach.call(document.querySelectorAll("input[data-music-pick]"),function(n){ if(n.parentNode) n.parentNode.removeChild(n); }); }catch(e){}
  var inp=document.createElement("input");
  inp.type="file";
  inp.setAttribute("data-music-pick","1");
  inp.accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus,.amr,.webm,.3gp";
  inp.multiple=true;
  inp.style.position="fixed";inp.style.left="-9999px";inp.style.width="1px";inp.style.height="1px";inp.style.opacity="0";
  document.body.appendChild(inp);           // ★ 挂载到 DOM，否则很多 WebView 不响应
  var cleaned=false;
  function cleanup(){ if(cleaned)return; cleaned=true; try{ if(inp.parentNode) inp.parentNode.removeChild(inp); }catch(e){} }
  try{ inp.addEventListener("cancel", cleanup); }catch(e){}
  setTimeout(cleanup, 90000);               // 兜底：长时间无操作也回收节点，避免堆积
  inp.onchange=function(){
    var files=Array.from(inp.files||[]);
    cleanup();
    if(!files.length)return;
    if(files.length>20){toast("⚠️ 一次最多 20 首");return;}
    toast("⏳ 正在导入 "+files.length+" 首…");
    var ok=0, fail=0, skipped=0, done=0;
    var total=files.length;
    // 用 filter 统计真正尝试导入的数量，避免失败导致 ok 永远到不了 total
    var tasks=files.map(function(f){
      var ext=(f.name||"").toLowerCase();
      if(!/\.(mp3|m4a|aac|wav|ogg|flac|opus|amr|webm)$/.test(ext)&&!/^audio\//.test(f.type||"")){skipped++;return null;}
      var id=uid();
      var rec={id:id,name:f.name,size:f.size,addedAt:Date.now(),blob:f,dur:0};
      return dbPut(rec).then(function(){
        var url=URL.createObjectURL(f);var a=new Audio();
        a.preload="metadata";a.src=url;
        var _probeDone=false;
        var _freeUrl=function(){ if(_probeDone)return; _probeDone=true; try{URL.revokeObjectURL(url);}catch(e){} };
        a.onloadedmetadata=function(){rec.dur=a.duration;dbPut(rec).catch(function(){});_freeUrl();};
        a.onerror=function(){_freeUrl();};
        // 兜底：元数据事件始终不触发（格式异常 / 解码器缺失）时也要释放，避免对象 URL 悬挂
        setTimeout(_freeUrl,15000);
        musicTracks.push(rec);ok++;
      }).catch(function(e){fail++;console.warn("import fail",f.name,e);});
    }).filter(Boolean);
    // 等所有 dbPut（含元数据回写）完成再统一刷新与提示，避免提前 render / 计数不准
    Promise.all(tasks).then(function(){
      renderMusic();
      var msg="✅ 已导入 "+ok+" 首";
      if(skipped)msg+="（跳过 "+skipped+" 个非音频文件）";
      if(fail)msg+=" ⚠️ "+fail+" 首导入失败";
      toast(msg);
    });
  };
  inp.click();
}
/* 迷你播放条避让：播放条贴在底栏「上方」，底栏始终贴屏幕底。
   —— 播放条的实际高度写进 --mp-h，供 .view 底部留白使用；
   —— 底栏的真实高度写进 --tab-real-h，播放条据此定位，两者严丝合缝。
   旧逻辑是把底栏抬到播放条上方（z-index:95 压住 50，观感像播放条插在按钮底下），
   且只在切换视图时算一次，「原地开始播放」时播放条看起来像没出现。 */
function syncMiniPlayerSpace(){
  try{
    var mp=document.querySelector(".mini-player");
    var tab=document.getElementById("botTab")||document.querySelector(".bot-tab");
    if(!mp) return;
    var on=false;
    try{ on=getComputedStyle(mp).display!=="none"; }catch(e){ on=mp.style.display!=="none"; }
    var h=on?Math.round(mp.getBoundingClientRect().height||0):0;
    try{ document.documentElement.style.setProperty("--mp-h", h+"px"); }catch(e){}
    /* 底栏真实高度（含安全区）→ 播放条据此贴在其上方 */
    if(tab){
      var th=0;
      try{
        if(getComputedStyle(tab).display!=="none") th=Math.round(tab.getBoundingClientRect().height||0);
      }catch(e){}
      if(th>0) try{ document.documentElement.style.setProperty("--tab-real-h", th+"px"); }catch(e){}
      tab.classList.toggle("shift",on&&h>0);
      /* 底栏不再抬高：清掉可能残留的内联 bottom，统一由 CSS 贴底 */
      if(tab.style.bottom) tab.style.bottom="";
    }
    try{ document.body.classList.toggle("mp-on", !!on); }catch(e){}
    /* 底部堆叠高度变了 → 让 toast 跟着抬 */
    try{ syncBottomStack(); }catch(e){}
  }catch(e){}
}
/* ══════════════════════════════════════════════════════════
   底部悬浮层统一调度
   底部一共可能同时存在三层：迷你播放条 → 底栏（学习·变美…）→ 安装提示，
   最上面才是 toast。旧代码里 toast 的 bottom 写死 74px，只要播放条一出现、
   底栏被抬高，toast 就直接压在「学习·变美」那一栏上（实测重叠 58px）。
   这里把三层实际高度加总写进 --stack-b，toast 基于它定位，自动避让。
   任何一层的显隐都必须调一次本函数。
   ══════════════════════════════════════════════════════════ */
function syncBottomStack(){
  try{
    var hOf=function(e){
      if(!e) return 0;
      try{ if(getComputedStyle(e).display==="none") return 0; }catch(_){}
      return Math.round(e.getBoundingClientRect().height||0);
    };
    var tabH=hOf(document.getElementById("botTab"));
    var mpH =hOf(document.querySelector(".mini-player"));
    var ihH =hOf(document.getElementById("installHint"));
    var stack=tabH+mpH;
    if(ihH>0) stack+=ihH+8;          // 安装提示与它上方的 toast 留 8px 间隙
    try{ var _sb=(typeof stack==="number"&&isFinite(stack)&&stack>0)?Math.round(stack):64; document.documentElement.style.setProperty("--stack-b", _sb+"px"); }catch(e){}
    return stack;
  }catch(e){ return 0; }
}
function renderMiniBar(){
  var bar=$("#miniPlayer");if(!bar)return;
  var cur=musicIdx>=0&&musicIdx<musicTracks.length?musicTracks[musicIdx]:null;
  if(!cur){bar.style.display="none";syncMiniPlayerSpace();return;}
  bar.style.display="flex";
  syncMiniPlayerSpace();
  var t1=$("#mpTitle");if(t1)t1.textContent=cur.name;
  var s1=$("#mpSub");if(s1)s1.textContent=(musicAudio&&!musicAudio.paused?"播放中":"已暂停");
  var pb=$("#mpPlayBtn");if(pb)pb.innerHTML=(musicAudio&&!musicAudio.paused)?icon("pause",18):icon("play",18);
  var prog=$("#mpProg");
  if(prog){var pct=(musicAudio&&isFinite(musicAudio.duration)&&musicAudio.duration>0)?(musicAudio.currentTime/musicAudio.duration*100):0;prog.style.width=pct+"%";}
  syncMiniPlayerSpace();
}
function mpToggle(){musicToggle();}
function mpNext(){musicNext();}
function mpPrev(){musicPrev();}
function mpSeek(ev){
  var el=ev.currentTarget;var r=el.getBoundingClientRect();
  var x=(ev.clientX!==undefined?ev.clientX:(ev.touches&&ev.touches[0]?ev.touches[0].clientX:0))-r.left;
  var pct=Math.max(0,Math.min(1,x/r.width));
  if(musicAudio&&isFinite(musicAudio.duration)&&musicAudio.duration>0)musicAudio.currentTime=pct*musicAudio.duration;
}

/* 播放条避让：尺寸/横竖屏变化后重算一次，避免底栏压住播放条 */
try{
  var _mpSync=function(){ setTimeout(syncMiniPlayerSpace,120); };
  window.addEventListener("resize",_mpSync);
  window.addEventListener("orientationchange",_mpSync);
}catch(e){}
boot();
