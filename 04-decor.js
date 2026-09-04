/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 04/18
   文件：js/04-decor.js
   来源：原 index.html 第 18232–18843 行
   内容：妆点美意坊（样式/背景/字体/存档）+ 全局背景纸 + 主题跟随系统/时间
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ============ 妆点美意坊：样式 / 背景 / 字体 / 存档 ============ */
/* 图片加载失败兜底（#2）：把一张背景图元素标记为「破损占位」。
   背景图没有 onerror，所以这里手动探测：URL 非 data:/blob:/http(s): 直接判破损；
   否则用一个临时 Image 探一次，失败就加占位类。统一走极简 SVG 斜纹占位。 */
function markImgBroken(el){
  try{ if(el&&el.classList) el.classList.add("img-broken"); }catch(e){}
}
function tryImgBg(el,url){
  if(!el)return;
  if(!url || !/^(data:|blob:|https?:)/i.test(url)){ markImgBroken(el); return; }
  try{
    const probe=new Image();
    probe.onload=function(){};
    probe.onerror=function(){ markImgBroken(el); };
    probe.src=url;
  }catch(e){ markImgBroken(el); }
}
/* 图片加载失败兜底（#2）：全局事件委托，所有 <img> 一旦加载失败就套上占位类。
   这样无需逐个给 img 加 onerror，新增的图片标签自动享受兜底。 */
let _imgErrBound=false;
function bindImgErrorFallback(){
  try{
    if(_imgErrBound) return; _imgErrBound=true;
    document.addEventListener("error",function(e){
      const t=e.target;
      if(t&&(t.tagName==="IMG")){ tryImgBroken(t); }
    },true); // 捕获阶段，才能拦到 img 的 error 事件
  }catch(e){}
}
function tryImgBroken(img){
  try{
    if(!img) return;
    img.classList.add("img-broken");
    // 把裂图标记成占位：隐藏原图内在内容，露出 CSS 斜纹 + 图标
    img.style.objectFit="cover";
    img.style.background="repeating-linear-gradient(45deg,#e9e6e0 0 10px,#f3f1ec 10px 20px)";
    img.alt="图片加载失败";
  }catch(e){}
}
/* 把页面上所有背景图（.banner-img / .hero-img / .cov-img / .bg-thumb 等）探一遍：
   链接失效或解码失败时套占位类，避免离线 APK 里露出浏览器裂图。
   每次渲染后调一次即可（开销极小，只探当前文档里真实存在的背景图）。 */
function autoGuardBgImages(root){
  try{
    const sel=".banner-img,.hero-img,.cov-img,.bg-thumb,.home-block-thumb .hbt-frame,.mood-photo";
    const els=(root||document).querySelectorAll(sel);
    Array.prototype.forEach.call(els,function(el){
      if(el.classList.contains("img-broken")) return;
      // 读「作者设置的」背景图（内联 style），computed 在 URL 失效时会被浏览器清空为 none
      const bg=(el.style&&el.style.backgroundImage)||getComputedStyle(el).backgroundImage||"";
      const m=/url\(\s*["']?([^"')]+)["']?\s*\)/.exec(bg);
      const url=m?m[1]:"";
      if(!url){ return; }
      if(!/^(data:|blob:|https?:)/i.test(url)){
        // 非法协议（理论上不会进这里）直接判破损
        markImgBroken(el); return;
      }
      if(el._bgProbed) return; el._bgProbed=true;
      try{
        const p=new Image(); const u=url;
        p.onerror=function(){ markImgBroken(el); };
        p.onload=function(){ el._bgProbed=true; };
        p.src=u;
      }catch(e){ markImgBroken(el); }
    });
  }catch(e){}
}
/* 长列表滚动位置记忆（#1）：知识库 / 投喂列表分页「加载更多」时整块重建 DOM，
   真正的滚动容器是 #view-module（而非内层列表），重绘会跳回顶部。
   策略：renderModule / renderHome / renderKnowledge 在重写 innerHTML 前记下 scrollTop，
   写完后若仍超出新内容高度就还原——只在「内容足够高」时还原，避免短列表被错误位移。
   这里提供通用工具，供上述入口调用。 */
function keepScroll(container,onRender){
  try{
    if(!container) return onRender&&onRender();
    const keep=container.scrollTop||0;
    onRender();
    // 仅当新内容仍然可滚动到该位置时还原（新增内容后高度更大，必然能还原）
    if(keep>0 && (container.scrollHeight-container.clientHeight)>=keep){ container.scrollTop=keep; }
    return;
  }catch(e){ try{ onRender&&onRender(); }catch(e2){} }
}
/* 长列表滚动位置记忆（#1）：paginate 列表「加载更多」整块重建后会跳回顶部，
   这里渲染前记 scrollTop、渲染后还原；并挂一次性滚动监听持续记录。
   约定：调用方在 onRender 里用本函数包裹真实渲染即可，无需各自维护变量。 */
let _scrollKeepers=[];
function scrollKeep(container,onRender){
  try{
    if(!container) return onRender&&onRender();
    const keep=(typeof container._keepTop==="number")?container._keepTop:0;
    onRender();
    if(keep>0){ try{ container.scrollTop=keep; }catch(e){} }
    if(!container._keepBound){
      container._keepBound=true;
      container.addEventListener("scroll",function(){ container._keepTop=container.scrollTop||0; },{passive:true});
    }
  }catch(e){ try{ onRender&&onRender(); }catch(e2){} }
}
function applyUserStyle(){
  try {
    const css=state.meta.userCss||DEFAULT_CSS;
    const el=$("#user-style");if(el)el.textContent=css;
    const layer=$("#bg-layer");const bg=readImage("meta.decorBg");
    const bgm=state.meta.decorBgMode||"cover";
    if(bg){layer.style.display="block";
      if(bgm==="gradient"||(!/^https?:|^data:/.test(bg)&&bg.indexOf("gradient")>=0)){layer.style.backgroundImage=bg;layer.style.backgroundSize="cover";}
      else{layer.style.backgroundImage="url("+bg+")";layer.style.backgroundSize=(bgm==="cover"?"cover":bgm==="stretch"?"100% 100%":"contain");layer.style.backgroundPosition="center";layer.style.backgroundRepeat="no-repeat";}
      // #7 背景图增强：透明度 / 模糊
      const bo=(state.meta.decorBgOp!=null?state.meta.decorBgOp:100);
      layer.style.opacity=(bo/100).toFixed(2);
      const bf=(state.meta.decorBgBlur!=null?state.meta.decorBgBlur:0);
      layer.style.filter=bf>0?("blur("+bf+"px)"):"none";
    }
    else{layer.style.display="none";layer.style.backgroundImage="none";}
    const fc=state.meta.font||{zh:"",en:"",fs:15,titleScale:1.2};
    const imp=state.meta.importedFont||{};
    // #52 选择「导入字体」时，仅用导入字体栈；否则静态字典 + 导入字体叠加
    const zhStack=(fc.zh==="imported:zh")?(imp.zh||'"PingFang SC",sans-serif')
      :(FONT_ZH[fc.zh]||'"PingFang SC","Source Han Sans SC","Noto Sans SC Light",-apple-system,"Microsoft YaHei",sans-serif')+(imp.zh?(","+imp.zh):'');
    const enStack=(fc.en==="imported:en")?(imp.en||'"Cormorant Garamond",serif')
      :(FONT_EN[fc.en]||'"Didot","Cormorant Garamond",Georgia,"Times New Roman",serif')+(imp.en?(","+imp.en):'');
    document.documentElement.style.setProperty("--font-zh",zhStack);
    document.documentElement.style.setProperty("--font-en",enStack);
    document.documentElement.style.setProperty("--fs-size",(fc.fs||16)+"px");    document.documentElement.style.setProperty("--title-scale",(fc.titleScale||1.2));
    const tc=state.meta.textColors||{};
    const setVC=(name,val)=>{ if(val){document.documentElement.style.setProperty(name,val);} else {document.documentElement.style.removeProperty(name);} };
    setVC("--ink",tc.ink);
    setVC("--text",tc.text);
    setVC("--gray",tc.gray);
    document.documentElement.style.setProperty("--blur",(state.meta.blur!=null?state.meta.blur:16)+"px");
    document.documentElement.style.setProperty("--radius",(state.meta.radius!=null?state.meta.radius:14)+"px");
    // 材质系统：data-material 决定变量映射；matParams 注入实时参数
    applyMaterialVars();
    // 全局背景纸
    applyPaper();
    // 修复：body 自带的 background:var(--bg) 是不透明实色，会盖住 z-index:-1 的 #bg-layer，
    // 导致「美化设置里设好了背景图但页面不显示」。必须在 applyPaper() 重设 --bg 之后
    // 用 important 把 body 背景透明化；没有背景图时交回 applyPaper 的预设底色。
    try{
      if(bg){ document.body.style.setProperty("background","transparent","important"); document.documentElement.setAttribute("data-hasbg","1"); }
      else{ document.body.style.removeProperty("background"); document.body.style.removeProperty("background-color"); document.documentElement.removeAttribute("data-hasbg"); }
    }catch(e){}
    applyGlassAll(); applyTexMaster();
  } catch(e) {
    console.warn('样式应用失败', e);
  }
}
/* 材质：把 state.meta.material 与 matParams 落到 html 属性与 CSS 变量 */
function applyMaterialVars(){
  try{
    const mat=state.meta.material||"glass";
    document.documentElement.setAttribute("data-material",mat);
    const mp=state.meta.matParams||{glassBlur:30,clearBorder:18,cardOpacity:55};
    const isDark=["dark","frost","liquid","postcard"].includes(document.documentElement.getAttribute("data-theme"));
    const setV=(k,v)=>document.documentElement.style.setProperty(k,v);
    const rmV=(k)=>document.documentElement.style.removeProperty(k);
    // 清透材质描边透明度（5%-40%）
    const cb=mp.clearBorder!=null?mp.clearBorder:18;
    const cbAlpha=(cb/100).toFixed(3);
    setV("--clear-border", isDark?("rgba(255,255,255,"+cbAlpha+")"):("rgba(200,195,190,"+cbAlpha+")"));
    // 卡片透明度（30%-80%），作为清透材质基础透明度的微调
    const op=Math.max(30,Math.min(80,mp.cardOpacity!=null?mp.cardOpacity:55))/100;
    if(mat==="glass"){
      setV("--blur",(mp.glassBlur!=null?mp.glassBlur:34)+"px");
      setV("--glass-bg", isDark?"rgba(60,60,60,0.38)":"rgba(255,255,255,0.35)");
      setV("--glass-solid", isDark?"rgba(60,60,60,0.55)":"rgba(255,255,255,0.52)");
      setV("--glass-flat", isDark?"rgba(40,40,40,0.68)":"rgba(255,255,255,0.68)");
      rmV("--mat-border");
    }else if(mat==="clear"){
      setV("--blur","6px");
      // 清透：半透明 + 精致描边（边框可见）
      const a=(0.50+(op-0.55)*0.15).toFixed(3); // 0.50~0.65
      setV("--glass-bg", isDark?("rgba(60,60,60,"+a+")"):("rgba(255,255,255,"+a+")"));
      setV("--glass-solid", isDark?("rgba(60,60,60,"+(parseFloat(a)+0.12).toFixed(3)+")"):("rgba(255,255,255,"+(parseFloat(a)+0.12).toFixed(3)+")"));
      setV("--glass-flat", isDark?("rgba(40,40,40,"+(parseFloat(a)+0.22).toFixed(3)+")"):("rgba(255,255,255,"+(parseFloat(a)+0.22).toFixed(3)+")"));
      setV("--mat-border","var(--clear-border)");
    }else{ // flat 平面
      rmV("--blur"); // 交回 CSS 的 0px
      // 平面：纯色填充、无模糊、无描边
      setV("--glass-bg", isDark?"rgba(40,40,40,0.96)":"rgba(255,255,255,0.95)");
      setV("--glass-solid", isDark?"rgba(48,48,48,0.98)":"rgba(255,255,255,0.98)");
      setV("--glass-flat", isDark?"rgba(36,36,36,1)":"rgba(255,255,255,1)");
      setV("--mat-border","rgba(0,0,0,0)");
    }
    // Chromium 中 .bento-card 的 backdrop-filter 在 var() 变化时不实时刷新，直接内联修正
    applyBentoBackdrop(mat);
  }catch(e){ console.warn('材质变量应用失败',e); }
}
/* Bento card 的 backdrop-filter 内联修正：规避 Chromium var() 缓存 */
function applyBentoBackdrop(mat){
  try{
    const bf = mat==="glass" ? "blur(24px) saturate(1.3)"
            : mat==="clear" ? "blur(6px) saturate(1.2)"
            : "none";
    document.querySelectorAll('.bento-card').forEach(function(el){
      el.style.webkitBackdropFilter=bf;
      el.style.backdropFilter=bf;
    });
  }catch(e){}
}
/* 每日精选轮播：touch 滑动 + 点状指示器 + snap */
function initDailyPickSwipe(){
  const track=document.querySelector('.dp-track'); if(!track)return;
  const wrap=track.closest('.daily-pick'); if(!wrap)return;
  const dots=[].slice.call(wrap.querySelectorAll('.dp-dot'));
  if(track._dpBound)return; track._dpBound=true;
  let startX=0,startY=0,startLeft=0,dragging=false;
  const updateDots=function(){
    if(!dots.length)return;
    const cardW=track.querySelector('.dp-card')?.offsetWidth||track.offsetWidth*.7;
    const gap=parseFloat(getComputedStyle(track).gap)||10;
    const idx=Math.round((track.scrollLeft + track.offsetWidth/2 - cardW/2) / (cardW + gap));
    dots.forEach((d,i)=>d.classList.toggle('active', i===idx));
  };
  track.addEventListener('scroll', function(){ window.requestAnimationFrame(updateDots); }, {passive:true});
  track.addEventListener('touchstart', function(e){
    startX=e.touches[0].clientX; startY=e.touches[0].clientY; startLeft=track.scrollLeft; dragging=true;
  }, {passive:true});
  track.addEventListener('touchmove', function(e){
    if(!dragging)return;
    const x=e.touches[0].clientX, y=e.touches[0].clientY;
    const dx=startX-x, dy=startY-y;
    if(Math.abs(dx) > Math.abs(dy)){
      if(e.cancelable)e.preventDefault();
      track.scrollLeft = startLeft + dx;
    }
  }, {passive:false});
  track.addEventListener('touchend', function(e){
    if(!dragging)return; dragging=false;
    const dx=startX-(e.changedTouches[0].clientX);
    const cardW=track.querySelector('.dp-card')?.offsetWidth||track.offsetWidth*.7;
    const gap=parseFloat(getComputedStyle(track).gap)||10;
    const step=cardW+gap;
    let idx=Math.round(track.scrollLeft/step);
    if(dx>40) idx++; else if(dx<-40) idx--;
    idx=Math.max(0,Math.min(dots.length-1,idx));
    track.scrollTo({left:idx*step, behavior:'smooth'});
  }, {passive:true});
  updateDots();
}
/* 下拉刷新：仅对 .view 容器生效 */
function initPullToRefresh(){
  document.querySelectorAll('.view').forEach(function(view){
    if(view._ptrBound)return; view._ptrBound=true;
    let startY=0,dragging=false,ptr=view.querySelector('.ptr-wrap');
    if(!ptr){ ptr=document.createElement('div'); ptr.className='ptr-wrap'; ptr.innerHTML='<div class="ptr-inner"><span class="ptr-dot"></span><span class="ptr-dot"></span><span class="ptr-dot"></span><span>松开刷新</span></div>'; view.insertBefore(ptr, view.firstChild); }
    view.addEventListener('touchstart',function(e){ if(view.scrollTop<=0){ startY=e.touches[0].clientY; dragging=true; } },{passive:true});
    view.addEventListener('touchmove',function(e){ if(!dragging)return; const dy=e.touches[0].clientY-startY; if(dy>0 && dy<120){ ptr.classList.toggle('show', dy>50); } },{passive:true});
    view.addEventListener('touchend',function(e){ if(!dragging)return; dragging=false; const dy=(e.changedTouches[0].clientY||startY)-startY; ptr.classList.remove('show'); if(dy>80){ toast('刷新中…'); setTimeout(function(){ location.reload(); },400); } },{passive:true}); 
  });
}
/* ============ 全局背景纸（纯净 / 通透 / 沉浸 + 更多质感）============ */
/* 纹理统一用轻量 inline-SVG（data-uri），WebView 原生支持，零依赖 */
const PAPER_TEXTURES={
  none:"none",
  frost:"url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMjAnIGhlaWdodD0nMTIwJz48ZmlsdGVyIGlkPSdmJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC45JyBudW1PY3RhdmVzPScyJyBzdGl0Y2hUaWxlcz0nc3RpdGNoJy8+PGZlQ29sb3JNYXRyaXggdHlwZT0nc2F0dXJhdGUnIHZhbHVlcz0nMCcvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPScxMjAnIGhlaWdodD0nMTIwJyBmaWx0ZXI9J3VybCgjZiknIG9wYWNpdHk9JzAuMDUnLz48L3N2Zz4=\")",
  linen:"url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2JyBoZWlnaHQ9JzYnPjxyZWN0IHdpZHRoPSc2JyBoZWlnaHQ9JzYnIGZpbGw9J25vbmUnLz48cGF0aCBkPSdNMCAwTDYgNk02IDBMMCA2JyBzdHJva2U9JyMwMDAnIHN0cm9rZS1vcGFjaXR5PScwLjA0JyBzdHJva2Utd2lkdGg9JzAuNScvPjwvc3ZnPg==\")",
  dots:"url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyMCcgaGVpZ2h0PScyMCc+PGNpcmNsZSBjeD0nMycgY3k9JzMnIHI9JzEnIGZpbGw9JyMwMDAnIGZpbGwtb3BhY2l0eT0nMC4wNScvPjwvc3ZnPg==\")",
  noise:"url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMDAnIGhlaWdodD0nMTAwJz48ZmlsdGVyIGlkPSduJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC42NScgbnVtT2N0YXZlcz0nMycgc3RpdGNoVGlsZXM9J3N0aXRjaCcvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPScxMDAnIGhlaWdodD0nMTAwJyBmaWx0ZXI9J3VybCgjbiknIG9wYWNpdHk9JzAuMDgnLz48L3N2Zz4=\")",
  grid:"url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScyMicgaGVpZ2h0PScyMic+PHBhdGggZD0nTTIyIDBIMFYyMicgZmlsbD0nbm9uZScgc3Ryb2tlPScjMDAwJyBzdHJva2Utb3BhY2l0eT0nMC4wNDUnIHN0cm9rZS13aWR0aD0nMC41Jy8+PC9zdmc+\")",
  wave:"url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4MCcgaGVpZ2h0PSc0MCc+PHBhdGggZD0nTTAgMjBRMjAgMCA0MCAyMFQ4MCAyMCcgZmlsbD0nbm9uZScgc3Ryb2tlPScjMDAwJyBzdHJva2Utb3BhY2l0eT0nMC4wNScgc3Ryb2tlLXdpZHRoPScxLjInLz48L3N2Zz4=\")"
};
const PAPER_PRESETS={
  pure:{n:"纯净",bg:"#F5F3F0",halo1:"rgba(212,197,176,0)",halo2:"rgba(196,181,160,0)",tex:"none"},
  clear:{n:"通透",bg:"#FAF8F5",halo1:"rgba(212,197,176,0.14)",halo2:"rgba(196,181,160,0.10)",tex:"none"},
  deep:{n:"沉浸",bg:"#EDE9E3",halo1:"rgba(212,197,176,0.20)",halo2:"rgba(196,181,160,0.16)",tex:"none"},
  frost:{n:"磨砂",bg:"#F3F1EE",halo1:"rgba(200,205,210,0.18)",halo2:"rgba(210,200,190,0.14)",tex:"frost"},
  linen:{n:"亚麻",bg:"#F2EFEA",halo1:"rgba(210,196,176,0.16)",halo2:"rgba(196,181,160,0.12)",tex:"linen"},
  dots:{n:"点阵",bg:"#F6F5F3",halo1:"rgba(212,197,176,0.12)",halo2:"rgba(196,181,160,0.10)",tex:"dots"},
  noise:{n:"颗粒",bg:"#EFEDEA",halo1:"rgba(180,180,180,0.16)",halo2:"rgba(200,190,180,0.12)",tex:"noise"},
  grid:{n:"格纹",bg:"#F4F3F1",halo1:"rgba(200,196,188,0.14)",halo2:"rgba(196,181,160,0.10)",tex:"grid"},
  wave:{n:"波纹",bg:"#F1F4F5",halo1:"rgba(190,205,210,0.18)",halo2:"rgba(200,195,205,0.12)",tex:"wave"}
};
function applyPaper(){
  try{
    const p=state.meta.paper||{preset:"pure",opacity:92,halo:"on"};
    const preset=PAPER_PRESETS[p.preset]||PAPER_PRESETS.pure;
    document.documentElement.setAttribute("data-paper",p.preset);
    // 纸张底色
    document.documentElement.style.setProperty("--bg",preset.bg);
    // 纸张透明度参数（70-100%）→ 控制光晕叠层强度
    const op=Math.max(70,Math.min(100,p.opacity!=null?p.opacity:92))/100;
    const ha=document.documentElement;
    const h1=p.halo==="off"?"rgba(0,0,0,0)":preset.halo1;
    const h2=p.halo==="off"?"rgba(0,0,0,0)":preset.halo2;
    // 把预设光晕按透明度缩放
    const scaleHalo=function(rgba,scale){
      const m=rgba.match(/rgba?\(([\d.]+),([\d.]+),([\d.]+),([\d.]+)\)/);
      if(!m)return rgba;
      return "rgba("+m[1]+","+m[2]+","+m[3]+","+(parseFloat(m[4])*scale).toFixed(3)+")";
    };
    ha.style.setProperty("--paper-halo1",scaleHalo(h1,op));
    ha.style.setProperty("--paper-halo2",scaleHalo(h2,op));
    // 纹理叠层（缩放后的不透明度，与光晕同步）
    const tex=PAPER_TEXTURES[preset.tex]||"none";
    ha.style.setProperty("--paper-tex",tex);
    ha.style.setProperty("--paper-tex-op",p.halo==="off"?"0":(0.55*op).toFixed(3));
    // 光晕叠层显隐
    const halos=document.querySelector(".halos");
    if(halos)halos.style.opacity=(p.halo==="off"?0:op);
  }catch(e){ console.warn('背景纸应用失败',e); }
}
function setPaper(preset){
  state.meta.paper=state.meta.paper||{preset:"pure",opacity:92,halo:"on"};
  state.meta.paper.preset=preset;save();applyPaper();
  // 同步主题色：仅当未自定义背景图时，让底栏/导航玻璃基色随纸张
  renderDecor();
  toast("📄 背景纸："+(PAPER_PRESETS[preset]?PAPER_PRESETS[preset].n:preset));
}
function setPaperOpacity(v){
  state.meta.paper=state.meta.paper||{preset:"pure",opacity:92,halo:"on"};
  v=parseInt(v);state.meta.paper.opacity=v;applyPaper();save();
  const el=$("#paperOp");if(el)el.textContent=v+"%";
}
function setPaperHalo(on){
  state.meta.paper=state.meta.paper||{preset:"pure",opacity:92,halo:"on"};
  state.meta.paper.halo=on?"on":"off";applyPaper();save();
  renderDecor();
  toast(on?"✨ 光晕纹理：开":"🚫 光晕纹理：关");
}
const THEME_COLORS=[
  {n:"韩系奶油",p:"#C9A98C",a:"#E3C4C8",bg:"linear-gradient(135deg,#FBF7F3,#F1E7E2)"},
  {n:"韩系奶茶",p:"#B89B82",a:"#D8C2AE",bg:"linear-gradient(135deg,#F6F1EB,#E8DCCF)"},
  {n:"韩系柔粉",p:"#D6A5AD",a:"#EFD0D5",bg:"linear-gradient(135deg,#FDF4F5,#F6E2E5)"},
  {n:"韩系雾蓝",p:"#9BB0BE",a:"#C5D6DE",bg:"linear-gradient(135deg,#F2F6F8,#DDE8ED)"},
  {n:"韩系抹茶",p:"#A3B29A",a:"#CAD6C2",bg:"linear-gradient(135deg,#F4F7F1,#E2E9DC)"},
  {n:"冷淡黑灰",p:"#2C2C2C",a:"#888888",bg:"linear-gradient(135deg,#ECEAE7,#D6D2CC)"},
  {n:"雾霾蓝",p:"#5B7A9D",a:"#8FA8C7",bg:"linear-gradient(135deg,#E5EDF4,#C9D8E8)"},
  {n:"藕粉",p:"#C98A94",a:"#E0B4BC",bg:"linear-gradient(135deg,#FBEFF1,#F3D7DC)"},
  {n:"奶油白",p:"#C9A87C",a:"#E5CDA8",bg:"linear-gradient(135deg,#FBF6EE,#EFE0CC)"},
  {n:"莫兰迪绿",p:"#7C8B7C",a:"#A8B8A0",bg:"linear-gradient(135deg,#EDF1EC,#D6DED2)"},
  {n:"香芋紫",p:"#8B7FA8",a:"#B9AED0",bg:"linear-gradient(135deg,#F1EDF6,#DED6EA)"},
  {n:"落日橙",p:"#C97B4A",a:"#E8A87C",bg:"linear-gradient(135deg,#FDF2EA,#F6D9C6)"},
  {n:"薄荷青",p:"#5F9B8F",a:"#92C7BB",bg:"linear-gradient(135deg,#E9F4F1,#CDE7E1)"},
  {n:"极简磨砂",p:"#FFFFFF",a:"#B5B5B5",bg:"linear-gradient(135deg,#0B0B0C,#1A1A1A)",mode:"frost"}
];
/* ============ M-14 主题跟随系统/时间 ============ */
var _themeMq=null;
function resolveThemeMode(){
  const mode=(state.meta.theme&&state.meta.theme.mode)||"cold";
  if(mode!=="auto")return mode;
  // 自动：优先系统偏好，再结合本地时段兜底
  let dark=false;
  try{
    if(window.matchMedia){
      const mq=window.matchMedia("(prefers-color-scheme: dark)");
      if(mq&&mq.matches)dark=true;
    }
  }catch(e){}
  if(!dark){
    const h=new Date().getHours();
    if(h>=19||h<7)dark=true; // 19:00–07:00 视为夜间
  }
  return dark?"dark":"cold";
}
function applySerifTitle(){
  try{ document.body.classList.toggle("serif-title", !!(state.meta.toggles&&state.meta.toggles.serifTitle)); }catch(e){}
}
function applyRainAtmos(){
  try{
    const on=!!state.meta.rainAtmos;
    document.body.classList.toggle("rain-atmos",on);
    // 雨天氛围会改变 hero 结构（显示/隐藏 hero-main、叠加雨丝/雾气/状态栏），需要重绘首页
    if(typeof renderHome==="function"){
      const vh=document.getElementById("view-home");
      if(vh && vh.innerHTML){ renderHome(); }
    }
  }catch(e){}
}
function toggleRainAtmos(){
  state.meta.rainAtmos=!state.meta.rainAtmos;save();
  applyRainAtmos();renderHome();
  toast(state.meta.rainAtmos?"🌧 雨天氛围：开":"☀️ 雨天氛围：关");
}
/* 减弱动效总开关：晕动症 / 弱网环境下的全局降级 */
function applyReducedMotion(){
  try{
    const on=!!(state.meta.toggles&&state.meta.toggles.reducedMotion);
    document.documentElement.classList.toggle("reduced-motion",on);
    document.body.classList.toggle("reduced-motion",on);
    toast(on?"🌿 已减弱动效":"✨ 已恢复动效");
  }catch(e){}
}
/* 工具页全屏开关：番茄钟/呼吸等轻量工具弹窗充满屏幕（request 3，默认关） */
function applyToolFullscreen(){
  try{
    const on=!!(state.meta.toggles&&state.meta.toggles.toolFullscreen);
    document.body.classList.toggle("tool-fullscreen",on);
    toast(on?"🖥 工具页已全屏":"📱 工具页已恢复底部弹窗");
  }catch(e){}
}
function applyTheme(){
  const mode=resolveThemeMode();
  document.documentElement.setAttribute("data-theme",mode);
  applySerifTitle();
  applyRainAtmos();
  // #7 微光粒子背景：除暗色/极简外默认开启（极淡，不扰阅读）
  document.documentElement.classList.toggle("particles", !(mode==="dark"||mode==="minimal"));
  // 同步浏览器地址栏/状态栏配色
  try{
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute("content",mode==="frost"?"#0B0B0C":mode==="dark"?"#1F1F1F":mode==="neu"?"#E6EBF2":mode==="liquid"?"#1b1f3b":"#D4C5B0");
  }catch(e){}
  // 仅 auto 模式下跟随系统切换
  if((state.meta.theme&&state.meta.theme.mode)==="auto"){
    try{
      if(window.matchMedia&&!_themeMq){
        _themeMq=window.matchMedia("(prefers-color-scheme: dark)");
        const onCh=function(){applyTheme();};
        if(_themeMq.addEventListener)_themeMq.addEventListener("change",onCh);
        else if(_themeMq.addListener)_themeMq.addListener(onCh);
      }
    }catch(e){}
  }
  // 主题切换后卡片透明度基色需重算（dark/light 不同）
  try{ applyMaterialVars(); }catch(e){}
}
function setMaterial(mat){
  if(mat!=="flat"&&mat!=="clear"&&mat!=="glass")mat="glass";
  state.meta.material=mat;save();
  applyMaterialVars();
  renderDecor();
  const labels={flat:"平面（原版实色）",clear:"清透（弱模糊半透）",glass:"玻璃（强模糊毛玻璃）"};
  toast("材质："+(labels[mat]||mat));
}
function setMatParam(key,val){
  state.meta.matParams=state.meta.matParams||{glassBlur:30,clearBorder:18,cardOpacity:55};
  val=parseInt(val);
  state.meta.matParams[key]=val;
  applyMaterialVars();save();
  const v=$("#mat_"+key);if(v)v.textContent=val+(key==="glassBlur"?"px":key==="cardOpacity"?"%":"%");
}
function setThemeMode(mode){
  state.meta.theme=state.meta.theme||{blur:16,glass:0.38,radius:20};
  state.meta.theme.mode=mode;save();
  if(mode==="frost"){
    state.meta.rainAtmos=true; // 进入磨砂·雨季自动开启雨天氛围
    // 套用暗色背景渐变（仅当用户未自定义「图片」背景），让磨砂·雨季真正呈现暗底
    if(state.meta.decorBgMode!=="image"){state.meta.decorBg="linear-gradient(135deg,#0B0B0C,#1A1A1A)";state.meta.decorBgMode="gradient";}
    applyUserStyle();
  }else if(mode==="neu"){
    // 新拟态：统一纯色底 + 平面材质，卡片才能与背景同色做浮雕
    state.meta.rainAtmos=false;
    state.meta.material="flat"; applyMaterialVars();
    if(state.meta.decorBgMode!=="image"){ state.meta.decorBg=null; state.meta.decorBgMode="cover"; applyUserStyle(); }
  }else if(mode==="liquid"){
    // 液态玻璃：强模糊玻璃材质 + 多彩极光底，折射光泽才看得清
    state.meta.rainAtmos=false;
    state.meta.material="glass"; applyMaterialVars();
    if(state.meta.decorBgMode!=="image"){ state.meta.decorBg="linear-gradient(135deg,#04081f,#0a1040 25%,#2a1a6e 55%,#5b2a86 78%,#1f0d4a)"; state.meta.decorBgMode="gradient"; applyUserStyle(); }
  }else if(mode==="postcard"){
    // 黑白明信片：直接把 docx 整套暗色单色玻璃语言铺到整台工作台（衬线宋体 + 暗玻璃 + 灰度）
    state.meta.rainAtmos=false;
    state.meta.material="glass"; applyMaterialVars();
    if(state.meta.decorBgMode!=="image"){ state.meta.decorBg="radial-gradient(120% 80% at 30% 20%,#1a1a1c 0%,#0a0a0b 60%)"; state.meta.decorBgMode="gradient"; applyUserStyle(); }
  }
  applyTheme();renderDecor();
  // 灵动岛主题同步（如已加载则实时跟随 data-theme）
  try{ if(window.censyIslandApplyTheme) window.censyIslandApplyTheme(mode); }catch(e){}
  const labels={cold:"冷色（默认）",warm:"暖色",minimal:"极简",postcard:"🪶 黑白明信片",neu:"新拟态",liquid:"液态玻璃",dark:"暗色",frost:"磨砂·雨季",auto:"自动（跟随系统+时段）"};
  toast("🌗 主题模式："+(labels[mode]||mode));
}
/* 顶栏一键明暗切换（与主题模式联动） */
function toggleThemeQuick(){
  try{ haptic(8); }catch(e){}
  const cur=resolveThemeMode();
  const seq=["cold","minimal","postcard","neu","liquid","dark","frost"];
  const i=seq.indexOf(cur); const next=seq[(i+1)%seq.length];
  setThemeMode(next);
  try{ updateThemeBtn(); }catch(e){}
}
function updateThemeBtn(){
  const b=document.getElementById("themeToggle");if(!b)return;
  const dark=resolveThemeMode()==="dark";
  b.innerHTML = dark
    ? '<svg class="svg-ic" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
    : '<svg class="svg-ic" viewBox="0 0 24 24" width="20" height="20"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  b.setAttribute("aria-label", dark?"切换到亮色 🌞":"切换到暗色 🌙");
}
/* 统一清除所有主题色覆盖块（一键主题色 / 主题色独立控制），避免多块 !important 互相覆盖 */
function clearThemeColorBlocks(css){
  return (css||"").replace(/\/\* 🎨 一键主题色 \*\/[\s\S]*?--accent: [^;]+ !important; }\n?/g,"")
                 .replace(/\/\* 🎛 主题色独立控制 \*\/[\s\S]*?--ink: [^;]+ !important; }\n?/g,"");
}
function applyThemeColor(primary,accent){
  const cur=state.meta.userCss||DEFAULT_CSS;
  // 补全 bg / ink 为当前计算值，保证一键换色只改主色+强调色，不破坏背景与文字
  const cs=getComputedStyle(document.documentElement);
  const o={primary:primary,accent:accent,
    bg:rgbToHex(cs.getPropertyValue("--bg")),
    ink:rgbToHex(cs.getPropertyValue("--ink"))};
  let css=clearThemeColorBlocks(cur)+themeColorOverrideCss(o);
  state.meta.userCss=css;state.meta.themeColor=o;save();applyUserStyle();pushHistory("一键主题色 "+primary,state.meta.userCss,state.meta.decorBg);
  const el=$("#cssInput");if(el)el.value=css;
  renderDecor();toast("主题色已应用，全界面变色");
}
/* 韩系一键美化：从韩系低饱和色板随机取一组，套用到全界面 */
const KOREAN_PALETTE=[
  {p:"#C9A98C",a:"#E3C4C8",n:"奶油"},
  {p:"#B89B82",a:"#D8C2AE",n:"奶茶"},
  {p:"#D6A5AD",a:"#EFD0D5",n:"柔粉"},
  {p:"#9BB0BE",a:"#C5D6DE",n:"雾蓝"},
  {p:"#A3B29A",a:"#CAD6C2",n:"抹茶"},
  {p:"#C2A0B0",a:"#E8D0DC",n:"丁香"}
];
/* 多风格随机美化套系：在韩系基础上扩展 国风 / 莫兰迪 / 奶油 / 韩系 */
const STYLE_PALETTES={
  kr:{name:"韩系",flag:"🇰🇷",serif:false,titleWeight:700,bg:"linear-gradient(160deg,#F5F0EA 0%,#EDE3DA 55%,#E3D3C8 100%)",items:KOREAN_PALETTE},
  cn:{name:"国风",flag:"🏮",serif:true,titleWeight:700,bg:"linear-gradient(160deg,#F3E7D6 0%,#EBD9C2 55%,#DEC3A8 100%)",items:[
    {p:"#C0392B",a:"#E8B04B",n:"朱砂金"},
    {p:"#8C2E2E",a:"#D9A441",n:"故宫红"},
    {p:"#2E5C53",a:"#C9A227",n:"青绿"},
    {p:"#3A4A5A",a:"#B08D57",n:"水墨蓝"},
    {p:"#6B4226",a:"#C9A87C",n:"檀木"},
    {p:"#7B3F4E",a:"#E0C097",n:"胭脂"}
  ]},
  mo:{name:"莫兰迪",flag:"🤍",serif:false,titleWeight:600,bg:"linear-gradient(160deg,#EDEAE4 0%,#E2DED7 55%,#D6D1C8 100%)",items:[
    {p:"#A7B0A0",a:"#CDBBA7",n:"雾绿"},
    {p:"#B0A8B9",a:"#D6C7C2",n:"藕灰"},
    {p:"#9FB1BC",a:"#D3C0B0",n:"雾霾蓝"},
    {p:"#C2B2A3",a:"#E0D2C3",n:"燕麦"},
    {p:"#A8A29A",a:"#CFC6B8",n:"砾石灰"},
    {p:"#B7A6A0",a:"#D8C9BE",n:"豆沙"}
  ]},
  cy:{name:"奶油",flag:"🍦",serif:false,titleWeight:600,bg:"linear-gradient(160deg,#FBF4E9 0%,#F6EAD8 55%,#F0DEC6 100%)",items:[
    {p:"#E8C9A0",a:"#F3E2D0",n:"焦糖"},
    {p:"#F0D9B5",a:"#FBEFDD",n:"香草"},
    {p:"#E6C2B5",a:"#F6E0D6",n:"蜜桃"},
    {p:"#D9C7A3",a:"#F2E7CC",n:"奶茶"},
    {p:"#EAD7C3",a:"#F8EDE0",n:"奶霜"},
    {p:"#E2B8A8",a:"#F4DCCF",n:"杏粉"}
  ]},
  ne:{name:"霓虹",flag:"🌃",serif:false,titleWeight:800,bg:"linear-gradient(160deg,#1E1B3A 0%,#2A2350 55%,#3A2A5E 100%)",items:[
    {p:"#FF4FD8",a:"#5BE8FF",n:"霓粉蓝"},
    {p:"#7C5CFF",a:"#23E0C8",n:"紫青"},
    {p:"#FF6B9D",a:"#FFD166",n:"桃金"},
    {p:"#00D4FF",a:"#B14BFF",n:"电光"},
    {p:"#FF7A45",a:"#FF3D81",n:"熔岩"},
    {p:"#39FFE0",a:"#7A5CFF",n:"极光"}
  ]},
  fo:{name:"森系",flag:"🌿",serif:true,titleWeight:600,bg:"linear-gradient(160deg,#E7EEE0 0%,#D7E4CC 55%,#C5D6B6 100%)",items:[
    {p:"#5B7B4B",a:"#A7C08A",n:"苔绿"},
    {p:"#6B8E5A",a:"#C2D6A0",n:"嫩绿"},
    {p:"#4A6B52",a:"#9CB87E",n:"松柏"},
    {p:"#7A8B5A",a:"#D6E0B0",n:"橄榄"},
    {p:"#8A9B6A",a:"#CDD9A8",n:"蕨绿"},
    {p:"#3E5C44",a:"#B0C48C",n:"林深"}
  ]},
  vf:{name:"复古",flag:"📻",serif:true,titleWeight:700,bg:"linear-gradient(160deg,#EFE3D0 0%,#E3D2B8 55%,#D4BE9C 100%)",items:[
    {p:"#9C5B3B",a:"#D9A05B",n:"赤陶"},
    {p:"#7A5230",a:"#C28B4E",n:"焦糖棕"},
    {p:"#8C6A4A",a:"#D8C08A",n:"驼黄"},
    {p:"#6B4A3A",a:"#B5895C",n:"栗棕"},
    {p:"#9A7B4F",a:"#E0C79A",n:"芥黄"},
    {p:"#5E4636",a:"#C99A6A",n:"深褐"}
  ]}
};
function randomKoreanTheme(){
  try{
    const k=KOREAN_PALETTE[Math.floor(Math.random()*KOREAN_PALETTE.length)];
    applyThemeColor(k.p,k.a);
    toast("🇰🇷 韩系美化 · "+k.n);
  }catch(e){ console.warn("韩系美化失败",e); }
}
/* 指定风格随机套系美化（styleKey: kr/cn/mo/cy；缺省随机选一种风格） */
function randomStyle(styleKey){
  try{
    // 套用前先记录当前整套视觉，供「撤销风格」一键还原
    state.meta.lastStyle=snapshotTheme();
    const keys=Object.keys(STYLE_PALETTES);
    const sk=styleKey&&STYLE_PALETTES[styleKey]?styleKey:keys[Math.floor(Math.random()*keys.length)];
    const s=STYLE_PALETTES[sk];
    const k=s.items[Math.floor(Math.random()*s.items.length)];
    applyThemeColor(k.p,k.a);
    // 联动背景：仅当用户未自定义背景图（本地图 / 远程 url）时套用该风格的推荐渐变
    const curBg=state.meta.decorBg||"";
    const hasCustomBg=/^https?:|^data:image/.test(curBg)||(curBg.indexOf("gradient")<0&&curBg.length>0);
    if(!hasCustomBg&&s.bg){
      state.meta.decorBg=s.bg;state.meta.decorBgMode="gradient";save();applyUserStyle();
    }
    // 联动氛围：衬线标题 + 标题字重（国风自动衬线，莫兰迪/奶油更轻盈）
    state.meta.toggles=state.meta.toggles||{};
    state.meta.toggles.serifTitle=!!s.serif;
    state.meta.font=state.meta.font||{};
    if(s.titleWeight)state.meta.font.titleWeight=s.titleWeight;
    save();
    state.meta.activeScheme=null; // 手动风格变更后，「当前方案」身份失效
    applySerifTitle();applyFontVars();
    toast(s.flag+" "+s.name+"美化 · "+k.n+(s.serif?"（衬线）":""));
  }catch(e){ console.warn("风格美化失败",e); }
}
/* 撤销风格：还原到上一次 randomStyle 之前的整套视觉（套系随机后想退回去） */
function undoStyle(){
  const ls=state.meta.lastStyle; if(!ls){ toast("暂无可撤销的风格变更"); return; }
  const m=state.meta, sn=ls;
  m.userCss=sn.userCss; m.decorBg=sn.decorBg; m.decorBgMode=sn.decorBgMode;
  m.decorBgOp=sn.decorBgOp; m.decorBgBlur=sn.decorBgBlur;
  m.blur=sn.blur; m.radius=sn.radius; m.themeColor=sn.themeColor;
  m.font=JSON.parse(JSON.stringify(sn.font||{})); m.toggles=JSON.parse(JSON.stringify(sn.toggles||{}));
  m.material=sn.material||"glass"; m.matParams=JSON.parse(JSON.stringify(sn.matParams||{}));
  save();applyUserStyle();applySerifTitle();applyFontVars();applyMaterialVars();applyReducedMotion();
  try{ if(state.meta.toggles&&state.meta.toggles.toolFullscreen)document.body.classList.add("tool-fullscreen"); }catch(e){}
  toast("↩ 已撤销上一次风格变更");
}
/* #51 主题色独立控制 / #53 实时预览 */
function rgbToHex(c){
  if(!c)return "#E8A0A0";
  c=c.trim();
  if(c.charAt(0)==="#")return c.length===4?("#"+c[1]+c[1]+c[2]+c[2]+c[3]+c[3]):c.slice(0,7);
  const m=c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);if(!m)return "#E8A0A0";
  return "#"+[m[1],m[2],m[3]].map(function(x){return ("0"+parseInt(x,10).toString(16)).slice(-2);}).join("");
}
