/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 05/18
   文件：js/05-boot.js
   来源：原 index.html 第 18844–20239 行
   内容：对比度工具 + 备份 + 开机 + 导航（一级/二级分组）
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ===== 对比度工具：按底色求一个「够清晰」的字色 =====
   自定义主题色时，主色/强调色常被直接当小字颜色用（color:var(--accent-ink)）。
   如果沿用原色不动，浅粉浅棕这类低饱和色在浅底上只有 1.5:1 左右，基本看不清。
   这里保持原色相与饱和度，二分调亮度直到对比度达到 WCAG AA（默认 4.5:1）。 */
function hexToRgbArr(h){
  h=String(h||"").trim();
  if(h.charAt(0)==="#")h=h.slice(1);
  if(h.length===3)h=h.charAt(0)+h.charAt(0)+h.charAt(1)+h.charAt(1)+h.charAt(2)+h.charAt(2);
  const n=parseInt(h.slice(0,6),16);
  if(isNaN(n))return null;
  return [(n>>16)&255,(n>>8)&255,n&255];
}
function relLumOf(rgb){
  const f=function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
  return 0.2126*f(rgb[0])+0.7152*f(rgb[1])+0.0722*f(rgb[2]);
}
function contrastRatio(a,b){
  const la=relLumOf(a),lb=relLumOf(b);
  const hi=Math.max(la,lb),lo=Math.min(la,lb);
  return (hi+0.05)/(lo+0.05);
}
function a11yInk(color,bg,target){
  target=target||4.5;
  const c=hexToRgbArr(color);
  // bg 可以是一个色值，也可以是一组候选底色（取最严的那个）
  const bgs=Array.isArray(bg)&&Array.isArray(bg[0])?bg:[hexToRgbArr(bg)];
  if(!c||!bgs.length||!bgs[0])return color;
  let ok=true;
  for(let i=0;i<bgs.length;i++){ if(contrastRatio(c,bgs[i])<target){ ok=false; break; } }
  if(ok)return color;
  const bgc=bgs[0];
  const r=c[0]/255,g=c[1]/255,b=c[2]/255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  let h=0,sat=0,l=(mx+mn)/2;
  if(d){
    sat=l>0.5?d/(2-mx-mn):d/(mx+mn);
    if(mx===r)h=((g-b)/d+(g<b?6:0));
    else if(mx===g)h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h/=6;
  }
  const toRgb=function(hh,ss,ll){
    if(!ss)return [ll,ll,ll];
    const q=ll<0.5?ll*(1+ss):ll+ss-ll*ss, pp=2*ll-q;
    const f=function(t){
      if(t<0)t+=1; if(t>1)t-=1;
      if(t<1/6)return pp+(q-pp)*6*t;
      if(t<1/2)return q;
      if(t<2/3)return pp+(q-pp)*(2/3-t)*6;
      return pp;
    };
    return [f(hh+1/3),f(hh),f(hh-1/3)];
  };
  const worst=function(rgb){ let m=99; for(let i=0;i<bgs.length;i++){ const r=contrastRatio(rgb,bgs[i]); if(r<m)m=r; } return m; };
  const shouldDarken=relLumOf(bgc)>0.4;         // 亮底往深调，暗底往浅调
  let lo=shouldDarken?0:l, hi=shouldDarken?l:1, best=null;
  for(let i=0;i<40;i++){
    const mid=(lo+hi)/2;
    const rgb=toRgb(h,sat,mid).map(function(v){return Math.max(0,Math.min(255,Math.round(v*255)));});
    if(worst(rgb)>=target){ best=rgb; if(shouldDarken)lo=mid; else hi=mid; }
    else { if(shouldDarken)hi=mid; else lo=mid; }
  }
  if(!best)return color;
  return "#"+best.map(function(v){return ("0"+v.toString(16)).slice(-2);}).join("");
}
/* 文字可能落在哪些底色上：页面底 + 三套材质各自的卡片面。
   applyMaterialVars() 会在运行时改写 --glass-solid，深浅都可能变，
   只按页面底算会在「玻璃」材质下翻车（暗色主题尤其明显）。 */
function a11yInkSurfaces(bgHex){
  const bg=hexToRgbArr(bgHex); if(!bg)return [];
  const out=[bg];
  try{
    const cs=getComputedStyle(document.documentElement);
    const isDark=["dark","frost","liquid","postcard"].indexOf(document.documentElement.getAttribute("data-theme"))>=0;
    const mix=function(v){                       // rgba / hex → 合成到 bg 上
      v=String(v||"").trim();
      const m=/^rgba?\(([^)]+)\)$/.exec(v);
      if(m){
        const p=m[1].split(",");
        const a=p.length>3?parseFloat(p[3]):1;
        if(isNaN(a))return null;
        return [0,1,2].map(function(i){return Math.round(parseFloat(p[i])*a+bg[i]*(1-a));});
      }
      const h=hexToRgbArr(v);
      return h&&h.length===4?h.slice(0,3):h;
    };
    [cs.getPropertyValue("--glass-solid"),
     isDark?"rgba(60,60,60,0.55)":"rgba(255,255,255,0.52)",
     isDark?"rgba(48,48,48,0.98)":"rgba(255,255,255,0.98)"].forEach(function(v){
      const c=mix(v);
      if(c&&c.length===3&&!(c[0]===bg[0]&&c[1]===bg[1]&&c[2]===bg[2]))out.push(c);
    });
  }catch(e){}
  return out;
}
function themeColorOverrideCss(o){
  if(!o)return "";
  const P=o.primary||"#E8A0A0", A=o.accent||"#F4C3A1", B=o.bg||"#F5F3F0", I=o.ink||"#2C2C2C";
  // 主色/强调色也会被当小字用，这里同步算出一版达标的 -ink 字色，避免出现 1.5:1 的糊字
  let PI="", AI="";
  try{
    const surfaces=a11yInkSurfaces(B);
    PI=a11yInk(P, surfaces.length?surfaces:B, 4.5);
    AI=a11yInk(A, surfaces.length?surfaces:B, 4.5);
  }catch(e){ PI=P; AI=A; }
  return '\n/* 🎛 主题色独立控制 */\n:root, [data-theme] { --primary: '+P+' !important; --accent: '+A+' !important; --bg: '+B+' !important; --ink: '+I+' !important; --primary-ink: '+PI+' !important; --accent-ink: '+AI+' !important; }\n';
}
function previewThemeColor(){
  const p=$("#pickPrimary"),a=$("#pickAccent"),bg=$("#pickBg"),ink=$("#pickInk");
  if(!p||!a||!bg||!ink)return;
  const P=p.value,A=a.value,B=bg.value,I=ink.value;
  const prev=$("#themePreview");if(!prev)return;
  prev.style.background=B;
  const t=document.getElementById("pcTitle");if(t){t.style.color=I;}
  const tx=document.getElementById("pcText");if(tx){tx.style.color=I;}
  const btn=document.getElementById("pcBtn");if(btn){btn.style.background="linear-gradient(135deg,"+P+","+A+")";}
  const fill=document.getElementById("pcBarFill");if(fill){fill.style.background="linear-gradient(135deg,"+P+","+A+")";}
}
function applyIndependentTheme(){
  const o={primary:$("#pickPrimary").value,accent:$("#pickAccent").value,bg:$("#pickBg").value,ink:$("#pickInk").value};
  liveThemeColorCore(o);
  state.meta.themeColor=o;
  pushHistory("主题色独立控制",state.meta.userCss,state.meta.decorBg);
  renderDecor();toast("已应用独立配色");
}
/* 拖动取色器时即时把配色套用到整个界面（不再只预览示例卡） */
function liveThemeColor(){
  const p=$("#pickPrimary"),a=$("#pickAccent"),bg=$("#pickBg"),ink=$("#pickInk");
  if(!p||!a||!bg||!ink)return;
  const o={primary:p.value,accent:a.value,bg:bg.value,ink:ink.value};
  liveThemeColorCore(o);
  state.meta.themeColor=o;
  const el=$("#cssInput");if(el)el.value=state.meta.userCss;
}
function liveThemeColorCore(o){
  if(!o)return;
  let css=clearThemeColorBlocks(state.meta.userCss||DEFAULT_CSS);
  css+=themeColorOverrideCss(o);
  state.meta.userCss=css;save();applyUserStyle();
  // 同步刷新预览示例卡
  try{
    const prev=$("#themePreview");if(prev)prev.style.background=o.bg;
    const t=document.getElementById("pcTitle");if(t)t.style.color=o.ink;
    const tx=document.getElementById("pcText");if(tx)tx.style.color=o.ink;
    const btn=document.getElementById("pcBtn");if(btn)btn.style.background="linear-gradient(135deg,"+o.primary+","+o.accent+")";
    const fill=document.getElementById("pcBarFill");if(fill)fill.style.background="linear-gradient(135deg,"+o.primary+","+o.accent+")";
  }catch(e){}
}
function resetThemeColor(){
  state.meta.themeColor=null;
  let css=clearThemeColorBlocks(state.meta.userCss||DEFAULT_CSS);
  state.meta.userCss=css;save();applyUserStyle();
  const el=$("#cssInput");if(el)el.value=css;
  renderDecor();toast("↺ 已恢复默认配色");
}
function applyThemePreset(idx){
  const tc=THEME_COLORS[idx];if(!tc)return;
  applyThemeColor(tc.p,tc.a);
  state.meta.themePreset=idx;save();
  // 套用推荐背景渐变：仅当用户未自定义「图片」背景（gradient 视为预设生成的、可覆盖）
  if(state.meta.decorBgMode!=="image"){state.meta.decorBg=tc.bg;state.meta.decorBgMode="gradient";}
  applyUserStyle();
  // 极简磨砂预设一键进入「磨砂·雨季」暗色模式
  if(tc.mode==="frost"){ state.meta.theme=state.meta.theme||{}; state.meta.theme.mode="frost"; applyTheme(); }
  // 若当前正在美化设置页，重建视图以刷新高亮态
  if(window._decorOpened){try{renderDecor();}catch(e){}}
  toast("已应用主题：「"+tc.n+"」");
}
function toggleAutoRemote(on){
  state.meta.autoRemoteCss=!!on;save();
  if(on&&state.meta.remoteCssUrl)fetchRemoteCss(true);
  toast(on?"✅ 已开启：打开工作台时自动拉取最新样式":"已关闭自动拉取");
}
function fetchRemoteCss(silent){
  const el=$("#remoteCssUrl");
  const url=(el?el.value.trim():"")||state.meta.remoteCssUrl;
  if(!url){toast("⚠️ 请先填写远程 CSS 地址");return;}
  if(!/^https?:\/\//.test(url)){toast("⚠️ 地址需以 http(s):// 开头");return;}
  if(el)state.meta.remoteCssUrl=url;save();
  if(!silent)toast("⏳ 正在拉取远程样式…");
  fetchPageText(url).then(function(css){
    if(!css||css.length<20){if(!silent)toast("⚠️ 拉取失败：地址不可访问或跨域被拦");return;}
    css=css.trim();
    const override='\n/* 🌐 远程样式 '+new Date().toLocaleString()+' */\n';
    state.meta.userCss=css;save();applyUserStyle();pushHistory("远程样式更新",state.meta.userCss,state.meta.decorBg);
    const box=$("#cssInput");if(box)box.value=css;
    renderDecor();toast("✅ 远程样式已应用（"+css.length+" 字符）");
  });
}
function validateCSS(css){
  let open=0,line=1;
  for(let i=0;i<css.length;i++){
    const c=css[i];
    if(c==="\n")line++;
    else if(c==="{")open++;
    else if(c==="}"){open--;if(open<0)return "第 "+line+" 行：右花括号 } 多了或未配对，请检查是否少了对应的 {";}
  }
  if(open>0)return "括号未闭合：还差 "+open+" 个 }，请检查最后一段 CSS 是否少写了 }";
  if(/\/\*([^*]|\*(?!\/))*$/.test(css))return "注释未闭合：发现有 /* 但没有对应的 */";
  return null;
}
function applyCssFromDecor(){
  const css=$("#cssInput").value;
  const err=validateCSS(css);
  if(err){toast("⚠️ CSS错误："+err);return;}
  state.meta.userCss=css;save();applyUserStyle();
  pushHistory("CSS已更新",css,state.meta.decorBg);renderDecor();toast("CSS已应用");
}
function uploadDecorBg(){
  // 从相册选图：走「可靠写入」，不依赖 IndexedDB，选完立即生效且重启不丢
  pickImageToBg();
}
/* 背景图专用选图：压缩 → 可靠写入 → 立即生效 */
function pickImageToBg(){
  try{
    const inp=document.createElement("input");inp.type="file";inp.accept="image/*";
    inp.onchange=()=>{const f=inp.files&&inp.files[0];if(!f)return;
      toast("⏳ 正在处理图片…");
      compressImage(f,(data,err)=>{
        if(err){ toast(err); return; }
        writeImageReliable("meta.decorBg",data,function(didInline){
          afterBgSet(didInline);
        });
      },{fullRes:true});
    };
    inp.click();
  }catch(e){ toast("⚠️ 无法打开相册："+(e&&e.message||e)); }
}
/* 不依赖系统文件对话框的图片入口（兼容 WebView 未启用文件选择的 APK）：
   接受 data:URL / https URL / 剪贴板图片；优先尝试剪贴板读取图片，失败再读入参文本。
   这样在弹不出「选图器」的离线 WebView 里也能设背景图。 */
async function applyBgFromClipOrText(txt){
  try{
    // 1) 先尝试从剪贴板直接读图片
    try{
      if(navigator.clipboard && navigator.clipboard.read){
        const items=await navigator.clipboard.read();
        for(const it of items){
          if(it.types && it.types.some(t=>t.indexOf("image/")===0)){
            const blob=await it.getType(it.types.find(t=>t.indexOf("image/")===0));
            const data=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res(null);r.readAsDataURL(blob);});
            if(data){ writeImageReliable("meta.decorBg",data,function(d){ afterBgSet(d); }); return; }
          }
        }
      }
    }catch(e){}
    // 2) 否则用入参文本：data:URL 或 http(s) 链接
    const v=String(txt||"").trim();
    if(!v){ toast("请粘贴图片（data: 链接或直接复制的图片）"); return; }
    if(/^https?:\/\//i.test(v)){
      // 远程图：直接用链接（不占本机空间），同样可靠写入
      writeImageReliable("meta.decorBg",v,function(d){ afterBgSet(d); }); return;
    }
    if(/^data:image\//i.test(v)){
      writeImageReliable("meta.decorBg",v,function(d){ afterBgSet(d); }); return;
    }
    toast("⚠️ 无法识别该图片：请粘贴以 data:image/ 开头的内容，或复制一张图片后重试");
  }catch(e){ toast("⚠️ 设置背景失败："+(e&&e.message||e)); }
}
function afterBgSet(didInline){
  try{ applyUserStyle(); }catch(e){}
  try{ renderBoot(); }catch(e){}
  /* ⚠️ 这里原来写的是 dataset.mod（对应 data-mod），但模块视图上根本没有 data-mod 属性：
     renderModule 写的是 data-curmod / data-module（见 23232 / 20643 行），还有处用 dataset.module。
     属性名对不上导致判断永远为 false —— 用户在美化设置里上传背景图后，页面预览不刷新，
     看起来像「上传没成功」。这里兼容读取全部可能的属性名，确保预览一定重绘。 */
  try{
    /* 美化设置是独立视图（showDecor() 里设 currentView="decor"），不是 module 子视图，
       所以仅靠 data-curmod/data-module 判定会漏；这里三种信号任一命中即重绘预览。 */
    var _isDecor=false;
    var _vm=$("#view-module");
    var _mid=_vm?(_vm.getAttribute("data-curmod")||_vm.getAttribute("data-module")||(_vm.dataset&&_vm.dataset.module)):null;
    if(_mid==="decor") _isDecor=true;
    if(!_isDecor && typeof currentView!=="undefined" && currentView==="decor") _isDecor=true;
    if(!_isDecor && typeof lastModuleId!=="undefined" && lastModuleId==="decor") _isDecor=true;
    if(_isDecor) renderDecor();
  }catch(e){}
  try{ renderHome(); }catch(e){}
  pushHistory("背景图已替换",state.meta.userCss,state.meta.decorBg);
  // 校验是否真的读得回来，避免「显示已成功、实际读不出」的假成功
  var ok=!!readImage("meta.decorBg");
  toast(ok?"✅ 背景已设置并保存（重启后仍在）":(didInline?"⚠️ 已保存但读取校验未通过，建议重设":"⚠️ 背景可能未保存成功，请重试"));
}
function restoreDefaultBg(){
  state.meta.decorBg=null;save();applyUserStyle();
  pushHistory("恢复默认背景",state.meta.userCss,null);renderDecor();toast("已恢复纯色背景");
}
/* 统一封面风格滤镜切换（#2） */
function setCoverFilter(f){
  state.meta.coverFilter=f;save();renderDecor();
  try{ renderHome(); }catch(e){}
  /* 同上：dataset.mod 取不到，改为兼容 data-curmod / data-module / dataset.module */
  try{
    var _cv=$("#view-module");
    if(_cv&&_cv.innerHTML){
      var _cid=_cv.getAttribute("data-curmod")||_cv.getAttribute("data-module")||(_cv.dataset&&_cv.dataset.module);
      if(_cid) renderModule(_cid);
    }
  }catch(e){}
  toast(f==="none"?"已取消统一封面滤镜":("封面风格已设为「"+(f==="bw"?"黑白":f==="warm"?"暖调":"冷调")+"」"));
}
function restoreDefaultStyle(){
  state.meta.userCss=DEFAULT_CSS;state.meta.decorBg=null;save();applyUserStyle();
  pushHistory("恢复默认样式",DEFAULT_CSS,null);renderDecor();toast("已恢复初始黑灰白样式");
}
function saveCurrentStyle(){
  pushHistory("手动存档",state.meta.userCss||DEFAULT_CSS,state.meta.decorBg);renderDecor();toast("已存档当前样式");
}
function pushHistory(suffix,css,bg){
  const d=todayStr();
  const desc=d+" "+(css&&css!==DEFAULT_CSS?"自定义CSS":"默认CSS")+(bg?" + 背景图":" + 默认背景")+"（"+suffix+"）";
  state.meta.decorHistory.unshift({date:d,desc,css:css||DEFAULT_CSS,bg:bg||null});
  if(state.meta.decorHistory.length>5)state.meta.decorHistory=state.meta.decorHistory.slice(0,5);
  save();
}
function restoreHistory(idx){
  const h=state.meta.decorHistory[idx];if(!h)return;
  state.meta.userCss=h.css;state.meta.decorBg=h.bg;save();applyUserStyle();renderDecor();toast("已恢复该次存档");
}
/* 主题方案：把当前整套视觉（配色 + 材质 + 圆角 + 背景 + 风格氛围）打包命名保存，可随时切换 */
function snapshotTheme(){
  const m=state.meta;
  return {
    primary:getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
    accent:getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
    userCss:m.userCss||DEFAULT_CSS,
    decorBg:m.decorBg||null, decorBgMode:m.decorBgMode||"cover",
    decorBgOp:m.decorBgOp!=null?m.decorBgOp:100, decorBgBlur:m.decorBgBlur!=null?m.decorBgBlur:0,
    blur:m.blur!=null?m.blur:16, radius:m.radius!=null?m.radius:20,
    themeColor:m.themeColor||null, font:JSON.parse(JSON.stringify(m.font||{})),
    toggles:JSON.parse(JSON.stringify(m.toggles||{})),
    material:m.material||"glass", matParams:JSON.parse(JSON.stringify(m.matParams||{}))
  };
}
function saveThemeScheme(name,emoji){
  try{
    name=(name||"").trim()||("方案 "+((state.meta.themeSchemes||[]).length+1));
    state.meta.themeSchemes=state.meta.themeSchemes||[];
    state.meta.themeSchemes.push({name:name,emoji:emoji||"🌸",date:todayStr(),snap:snapshotTheme()});
    state.meta.activeScheme=name;
    save();renderDecor();toast("💾 已保存主题方案："+name);
  }catch(e){ console.warn("保存主题方案失败",e); toast("⚠️ 保存失败"); }
}
function applyThemeScheme(idx){
  try{
    const s=(state.meta.themeSchemes||[])[idx];if(!s)return;
    const m=state.meta, sn=s.snap||{};
    m.userCss=sn.userCss; m.decorBg=sn.decorBg; m.decorBgMode=sn.decorBgMode;
    m.decorBgOp=sn.decorBgOp; m.decorBgBlur=sn.decorBgBlur;
    m.blur=sn.blur; m.radius=sn.radius; m.themeColor=sn.themeColor;
    m.font=JSON.parse(JSON.stringify(sn.font||{})); m.toggles=JSON.parse(JSON.stringify(sn.toggles||{}));
    m.material=sn.material||"glass"; m.matParams=JSON.parse(JSON.stringify(sn.matParams||{}));
    m.activeScheme=s.name;
    save();applyUserStyle();applySerifTitle();applyFontVars();applyMaterialVars();applyReducedMotion();
    renderDecor();toast("🎨 已切换主题方案："+s.name);
  }catch(e){ console.warn("切换主题方案失败",e); toast("⚠️ 切换失败"); }
}
/* 主题方案排序：dir=-1 上移 / 1 下移 */
function moveScheme(idx,dir){
  try{
    const arr=state.meta.themeSchemes||[]; const j=idx+dir;
    if(idx<0||idx>=arr.length||j<0||j>=arr.length)return;
    const t=arr[idx]; arr[idx]=arr[j]; arr[j]=t;
    state.meta.themeSchemes=arr; save(); renderDecor();
  }catch(e){ console.warn("方案排序失败",e); }
}
function deleteThemeScheme(idx){
  try{
    const arr=state.meta.themeSchemes||[]; if(!arr[idx])return;
    const s=arr[idx].name; arr.splice(idx,1); state.meta.themeSchemes=arr;
    if(state.meta.activeScheme===s)state.meta.activeScheme=null;
    save(); renderDecor(); toast("🗑 已删除方案："+s);
  }catch(e){ console.warn("删除主题方案失败",e); }
}
function promptThemeScheme(){
  // #31 主题方案保存：自定义弹窗，可选 emoji 图标 + 命名
  const EMOJIS=["🌸","🌿","🌊","🌙","⭐","🔥","🍃","💎","🌈","☕","🎀","🪷","🌟","🫧","🍂","❄️"];
  let html='<h3>保存主题方案</h3>'+
    '<div class="field"><label>方案名称</label><input id="schemeName" type="text" placeholder="例如：奶油假日 / 薄荷夜"></div>'+
    '<div class="field"><label>选个图标</label><div class="scheme-emoji-grid">'+
      EMOJIS.map(function(e,i){return '<button class="se-btn'+(i===0?' on':'')+'" onclick="window.__schemeEmoji=\''+e+'\';document.querySelectorAll(\'.se-btn\').forEach(b=>b.classList.remove(\'on\'));this.classList.add(\'on\')">'+e+'</button>';}).join('')+
    '</div></div>'+
    '<div class="modal-ops"><button class="cancel" onclick="closeModal()">取消</button><button class="save" onclick="saveThemeSchemeFromModal()">保存</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
  window.__schemeEmoji=EMOJIS[0];
  setTimeout(function(){const n=$("#schemeName");if(n)n.focus();},120);
}
function saveThemeSchemeFromModal(){
  const name=($("#schemeName")?$("#schemeName").value:"").trim();
  saveThemeScheme(name, window.__schemeEmoji||"🌸");
}
function navSmall(){const tb=$("#topbar");if(tb)tb.classList.remove("large");}
function showDecor(){
  try{ const bm=$("#bootMask"); if(bm&&getComputedStyle(bm).display!=="none"){ closeBoot(); } }catch(e){}
  currentView="decor";saveLastView();$("#view-home").classList.remove("active");$("#view-module").classList.add("active");navSmall();
  $("#topTitle").innerHTML=icon("sparkle")+" 美化设置";renderDecor();renderDrawer();renderBotTab();
}
/* 服务商注册表：免费 / 公益 / 官方全兼容。
   fmt: openai = OpenAI 风格 chat/completions；baidu = 文心一言特殊鉴权；
   charity = 公益中转（用户自定义 URL，走 OpenAI 兼容）。 */
const PROVIDERS={
  kimi:   {name:"Kimi (月之暗面)", url:"https://api.moonshot.cn/v1/chat/completions", defModel:"moonshot-v1-8k", fmt:"openai", models:["moonshot-v1-8k","moonshot-v1-32k","moonshot-v1-auto"]},
  gpt:    {name:"OpenAI GPT", url:"https://api.openai.com/v1/chat/completions", defModel:"gpt-3.5-turbo", fmt:"openai", models:["gpt-3.5-turbo","gpt-4o-mini","gpt-4o","gpt-4-turbo"]},
  claude: {name:"Claude (Anthropic)", url:"https://api.anthropic.com/v1/messages", defModel:"claude-3-haiku-20240307", fmt:"claude", models:["claude-3-haiku-20240307","claude-3-sonnet-20240229","claude-3-5-sonnet-20240620","claude-3-opus-20240229"]},
  siliconflow:{name:"硅基流动 SiliconFlow (免费额度)", url:"https://api.siliconflow.cn/v1/chat/completions", defModel:"deepseek-ai/DeepSeek-V3", fmt:"openai", free:true, signup:"https://cloud.siliconflow.cn/", models:["deepseek-ai/DeepSeek-V3","deepseek-ai/DeepSeek-V2.5","Qwen/Qwen2.5-72B-Instruct","meta-llama/Llama-3.3-70B-Instruct","GLM-4-9B-0414"]},
  deepseek:{name:"DeepSeek (官方)", url:"https://api.deepseek.com/v1/chat/completions", defModel:"deepseek-chat", fmt:"openai", free:true, signup:"https://platform.deepseek.com/", models:["deepseek-chat","deepseek-reasoner"]},
  zhipu:  {name:"智谱 GLM (免费额度)", url:"https://open.bigmodel.cn/api/paas/v4/chat/completions", defModel:"glm-4-flash", fmt:"openai", free:true, signup:"https://open.bigmodel.cn/usercenter/register", models:["glm-4-flash","glm-4-plus","glm-4-air","glm-3-turbo"]},
  qwen:   {name:"阿里云 通义千问 (免费额度)", url:"https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", defModel:"qwen-turbo", fmt:"qwen", free:true, signup:"https://dashscope.console.aliyun.com/", models:["qwen-turbo","qwen-plus","qwen-max","qwen2.5-72b-instruct"]},
  wenxin: {name:"百度 文心一言 (免费额度)", url:"https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions", defModel:"ernie-4.0-8k", fmt:"baidu", free:true, signup:"https://console.bce.baidu.com/qianfan/", models:["ernie-4.0-8k","ernie-4.0-8k-preview","ernie-3.5-8k","ernie-speed-8k"]},
  charity:{name:"自定义 (公益中转)", url:"", defModel:"", fmt:"openai", charity:true, free:true},
  custom: {name:"自定义 OpenAI 兼容", url:"", defModel:"", fmt:"openai"}
};
function providerOptions(sel){
  return Object.keys(PROVIDERS).map(function(p){
    const pr=PROVIDERS[p];
    return '<option value="'+p+'" '+(sel===p?"selected":"")+'>'+pr.name+(pr.free?" 🆓":"")+'</option>';
  }).join("");
}
function getProvider(p){return PROVIDERS[p]||PROVIDERS.custom;}
function defaultModelFor(p){return (PROVIDERS[p]&&PROVIDERS[p].defModel)||"model";}
/* 组件化：模型下拉（已知服务商给候选列表 + 自定义输入项；自定义/公益中转给文本框） */
function modelSelectHtml(p, cur, prefix){
  prefix=prefix||"api";
  const pr=getProvider(p);
  if(p==="custom"||p==="charity"){
    return '<input id="'+prefix+'Model" placeholder="'+(p==="charity"?"公益中转模型名（如 DeepSeek-V3）":defaultModelFor(p))+'" value="'+esc(cur||"")+'" />';
  }
  const list=pr.models||[pr.defModel];
  const opts=list.map(function(m){return '<option value="'+m+'" '+(cur===m?"selected":"")+'>'+m+'</option>';}).join("");
  const customSel=(list.indexOf(cur)>=0||!cur)?"":"selected";
  const hideCustom=(list.indexOf(cur)>=0||!cur)?"display:none":"";
  return '<select id="'+prefix+'ModelSel" onchange="onModelSelChange(\''+prefix+'\')">'+opts+'<option value="__custom__" '+customSel+'>✏️ 自定义输入…</option></select>'+
    '<input id="'+prefix+'Model" style="'+hideCustom+'" placeholder="输入自定义模型名" value="'+esc(cur||"")+'" />';
}
function onModelSelChange(prefix){
  prefix=prefix||"api";
  const sel=$("#"+prefix+"ModelSel");const inp=$("#"+prefix+"Model");
  if(!sel||!inp)return;
  if(sel.value==="__custom__"){inp.style.display="";inp.focus();}
  else{inp.style.display="none";inp.value=sel.value;}
}
/* #51 API 模型自动检索：填入 Key + 接口地址后，自动调用 /models 拉取可用模型并填充下拉 */
/* 各家 /models 端点与返回结构（尽量覆盖内置服务商 + OpenAI 兼容兜底） */
/* 把 API 调用错误分类成 {type,title,detail}，方便 UI 渲染成 alert card */
function apiErrHint(err){
  if(!err) return {type:"error",title:"未知错误",detail:""};
  const msg=(err.message||String(err));
  if(/Failed to fetch|NetworkError|net::ERR/i.test(msg))
    return {type:"cors",title:"网络或跨域(CORS)被拦截",detail:"该地址不允许浏览器/打包 APP 直接访问。建议换成 DeepSeek / 硅基流动 / 通义 / 智谱 等国内可达的服务商；或在「自定义 OpenAI 兼容」里填写支持 CORS 的代理地址。"};
  if(/abort|timeout|超时/i.test(msg))
    return {type:"timeout",title:"请求超时",detail:"服务商响应慢或模型较大，可换小模型、增加超时时间，或检查网络。"};
  if(/401|403|Unauthorized|鉴权|auth/i.test(msg))
    return {type:"auth",title:"鉴权失败",detail:"API Key 无效、已过期或前缀不对。请检查 Key 是否正确填写并点「保存配置」。"};
  if(/404|Not Found/i.test(msg))
    return {type:"notfound",title:"接口或模型不存在",detail:"模型名或 URL 路径填错，可在「检索可用模型」后选择正确模型名。"};
  if(/JSON/i.test(msg))
    return {type:"format",title:"返回格式异常",detail:"已自动降级为本地规则提炼，不影响使用。"};
  return {type:"error",title:"请求失败",detail:msg.slice(0,160)};
}
function apiErrHtml(err){
  const h=apiErrHint(err);
  const icon=h.type==="cors"?"🌐":h.type==="auth"?"🔑":h.type==="timeout"?"⏳":h.type==="notfound"?"🔍":"⚠️";
  return '<div class="alert alert-'+h.type+'"><div class="alert-title">'+icon+' '+esc(h.title)+'</div><div class="alert-detail">'+esc(h.detail)+'</div></div>';
}
function modelsEndpoint(p, base){
  switch(p){
    case "kimi": return "https://api.moonshot.cn/v1/models";
    case "zhipu": return "https://open.bigmodel.cn/api/paas/v4/models";
    case "deepseek": return "https://api.deepseek.com/v1/models";
    case "minimax": return "https://api.minimax.chat/v1/models?GroupId="+(state.meta.apiCfg&&state.meta.apiCfg.minimaxGroup||"");
    case "qwen": return "https://dashscope.aliyuncs.com/compatible-mode/v1/models";
    case "wenxin": return ""; // 文心无公开 /models，靠内置列表
    case "siliconflow": return "https://api.siliconflow.cn/v1/models";
    case "grok": return "https://api.x.ai/v1/models";
    case "gemini": return "https://generativelanguage.googleapis.com/v1beta/models?key="+(state.meta.apiCfg&&state.meta.apiCfg.key||"");
    case "custom": return (base||"").replace(/\/chat\/completions.*$/,"")+"/models";
    case "charity": return (base||"").replace(/\/chat\/completions.*$/,"")+"/models";
    default: return "";
  }
}
function fetchModels(){
  const box=$("#apiModelsResult"); if(box)box.style.display="block";
  const provider=$("#apiProvider").value;
  const key=($("#apiKey").value||"").trim();
  const base=($("#apiBase")?($("#apiBase").value||"").trim():"");
  if(!key){ if(box){box.style.color="var(--gray)";box.innerHTML="⚠️ 请先填写 API Key 再检索";} return; }
  let url=modelsEndpoint(provider, base);
  if(!url){ if(box){box.style.color="var(--gray)";box.innerHTML="ℹ️ 该服务商不提供 /models 检索，可手动输入模型名，或从下拉候选选择。";} return; }
  if(box){box.style.color="var(--accent)";box.innerHTML="⏳ 正在检索可用模型…";}
  const headers={ "Authorization":"Bearer "+key, "Content-Type":"application/json" };
  const ctrl=mkAbort(20000); const to=null;
  fetch(url,{headers:headers, signal:ctrl.signal}).then(function(r){
    if(!r.ok) throw new Error("HTTP "+r.status);
    return r.json();
  }).then(function(data){
    clearTimeout(to);
    let models=[];
    if(Array.isArray(data)) models=data;
    else if(data&&data.data&&Array.isArray(data.data)) models=data.data;
    else if(data&&data.models&&Array.isArray(data.models)) models=data.models;
    else if(data&&data.model&&Array.isArray(data.model)) models=data.model;
    else if(provider==="gemini"&&data&&data.models&&Array.isArray(data.models)) models=data.models.map(function(m){return {id:m.name&&m.name.replace(/^models\//,"")};});
    models=models.map(function(m){ return (m&&(m.id||m.name||m.model||m))||""; }).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;});
    if(!models.length) throw new Error("接口返回为空");
    fillModelOptions(models, provider);
    if(box){box.style.color="#2a8";box.innerHTML="✅ 检索到 "+models.length+" 个模型，已填充到上方下拉，点击选择即可。";}
  }).catch(function(err){
    clearTimeout(to);
    if(box){box.style.color="";box.innerHTML=apiErrHtml(err);}
  });
}
/* 把检索到的模型列表写回下拉，并补全自定义输入 */
function fillModelOptions(models, provider){
  const sel=$("#apiModelSel"); const inp=$("#apiModel");
  if(sel){
    const prev=sel.value;
    let html=sel.innerHTML;
    const existing=new Set(Array.prototype.map.call(sel.options,function(o){return o.value;}));
    models.forEach(function(m){
      if(!existing.has(m)){ html+='<option value="'+esc(m)+'">'+esc(m)+'</option>'; existing.add(m); }
    });
    html+='<option value="__custom__">✏️ 自定义输入…</option>';
    sel.innerHTML=html;
    if(prev&&existing.has(prev)) sel.value=prev;
  }
  // 同步到知识研习的 kb 下拉（若存在）
  const ksel=$("#kbModelSel");
  if(ksel){
    models.forEach(function(m){
      const o=document.createElement("option"); o.value=m; o.textContent=m;
      if(Array.prototype.map.call(ksel.options,function(x){return x.value;}).indexOf(m)<0) ksel.appendChild(o);
    });
  }
  // 把本次列表存进该服务商候选，便于下次直接选
  try{
    const pr=PROVIDERS[provider];
    if(pr){ pr.models=(pr.models||[]).concat(models).filter(function(v,i,a){return a.indexOf(v)===i;}); }
  }catch(e){}
  toast("🔍 已检索并填充 "+models.length+" 个模型");
}

function saveApiCfg(){
  state.meta.apiCfg=state.meta.apiCfg||{};
  state.meta.apiCfg.provider=$("#apiProvider").value;
  const rawKey=$("#apiKey").value.trim();
  state.meta.apiCfg.key=rawKey?encodeKey(rawKey):"";
  const sel=$("#apiModelSel");
  state.meta.apiCfg.model=(sel&&sel.value!=="__custom__")?sel.value.trim():($("#apiModel")?$("#apiModel").value.trim():"");
  const p=$("#apiProvider").value;
  if(p==="custom"||p==="charity")state.meta.apiCfg.base=$("#apiBase").value.trim();
  // #47 多 Key 池：按当前服务商存为数组（混淆存储）
  state.meta.apiCfg.keys=state.meta.apiCfg.keys||{};
  const keysRaw=$("#apiKeys")?$("#apiKeys").value.trim():"";
  state.meta.apiCfg.keys[p]=keysRaw?keysRaw.split(/\n+/).map(function(s){return encodeKey(s.trim());}).filter(Boolean):[];
  // #48 可调参数
  state.meta.apiCfg.params={
    temperature:parseFloat($("#pTempV")?$("#pTempV").textContent:0.3)||0.3,
    maxTokens:parseInt($("#pMaxV")?$("#pMaxV").textContent:800)||800,
    topP:parseFloat($("#pTopV")?$("#pTopV").textContent:1)||1,
    timeout:parseInt($("#pTimeoutV")?$("#pTimeoutV").textContent:15)||15
  };
  // #49 本地降级策略
  const fb=$("#apiFallback"); state.meta.apiCfg.fallback=fb?fb.checked:true;
  save();renderDecor();toast(state.meta.apiCfg.key?"🔑 API 配置已保存，可调用 AI 提炼":"✅ 已保存（未填 Key，将使用规则提炼）");
}
function clearApiKey(){
  showActionSheet("清除 API Key", [
    {icon:"🧹",label:"确认清除已保存的 Key",danger:true,cb:function(){
      state.meta.apiCfg=state.meta.apiCfg||{};state.meta.apiCfg.key="";save();renderDecor();toast("已清除 API Key");
    }},
    {icon:"↩️",label:"暂不清除"}
  ], function(item){ if(item&&item.cb)item.cb(); });
}
/* #46 连接测试：用当前表单值发一条测试消息，显示响应时间 + 成功/失败 */
function testApiConn(){
  const box=$("#apiTestResult");if(!box)return;
  const provider=$("#apiProvider").value;
  const key=($("#apiKey").value||"").trim();
  if(!key){ box.style.display="block"; box.style.color="var(--gray)"; box.innerHTML="⚠️ 请先填写 API Key 再测试"; return; }
  const sel=$("#apiModelSel");
  const model=(sel&&sel.value!=="__custom__")?sel.value.trim():($("#apiModel")?$("#apiModel").value.trim():"");
  const api={provider:provider,key:key,model:model,base:($("#apiBase")?($("#apiBase").value||"").trim():"")};
  box.style.display="block"; box.style.color="var(--accent)"; box.innerHTML='⏳ 正在测试连接…';
  const t0=Date.now();
  // 用最小测试消息，避免消耗太多额度；加 15s 超时兜底，避免网络挂起无反馈
  const timeout=new Promise(function(_,rej){ setTimeout(function(){rej(new Error("请求超时（15s）"));},15000); });
  Promise.race([clubCallAI(api,"测试：请用一句话回答「OK」即可。","连接测试"), timeout]).then(function(res){
    const ms=Date.now()-t0;
    box.style.color="#2a8"; box.innerHTML='✅ 连接成功 · 响应 '+ms+'ms · 模型返回：'+esc((res&&res.title)||'(空)').slice(0,24);
    // 记录统计
    try{ recordApiStat(true,ms); }catch(e){}
  }).catch(function(err){
    const ms=Date.now()-t0;
    box.style.color=""; box.innerHTML=apiErrHtml(err)+'<div style="font-size:11px;color:var(--gray);margin-top:4px">响应时间：'+ms+'ms</div>';
    try{ recordApiStat(false,ms); }catch(e){}
  });
}
function apiProviderChange(){renderDecor();}
/* #50 API 调用统计：本地记录每月调用/成功/失败，仅展示 */
function recordApiStat(ok, ms){
  const st=state.meta.apiStats||{month:"",calls:0,success:0,fail:0,lastMs:0};
  const ym=todayStr().slice(0,7);
  if(st.month!==ym){ st.month=ym; st.calls=0; st.success=0; st.fail=0; }
  st.calls=(st.calls||0)+1;
  if(ok)st.success=(st.success||0)+1; else st.fail=(st.fail||0)+1;
  st.lastMs=ms||0;
  state.meta.apiStats=st;
  try{ save(); }catch(e){}
}
function apiStatLine(){
  const st=state.meta.apiStats||{month:todayStr().slice(0,7),calls:0,success:0,fail:0,lastMs:0};
  const ym=todayStr().slice(0,7);
  if(st.month!==ym)return null;
  if(!st.calls)return {calls:0,success:0,fail:0};
  return st;
}
function renderDecor(){
  try{ renderDecorInner(); }
  catch(e){ renderDecorFallback(e); }
}
function renderDecorInner(){
  window._decorOpened=true;
  const v=$("#view-module");
  const cur=state.meta.userCss||DEFAULT_CSS;
  const bg=readImage("meta.decorBg");
  const fc=state.meta.font||{zh:"system",en:"system",fs:16,titleScale:1.2};
  let h='<div class="back-row"><button onclick="showHome()" aria-label="返回"><svg class="svg-ic" viewBox="0 0 24 24" width="20" height="20"><path d="M15 5l-7 7 7 7"/></svg></button><div style="font-weight:600">'+icon('sparkle',18)+' 美化设置</div></div>';
  h+='<div class="quote-bar">全局样式 / 背景图 / 字体 / 历史存档，均本地离线储存。改动立即生效。</div>';

  /* 板块0：字体控制 */
  const imp=state.meta.importedFont||{};
  h+='<div class="card"><h3>全局字体控制</h3>';
  h+='<div class="field"><label>中文字体</label><select id="fontZh" onchange="applyFont()">'+importedFontOptions("zh", fc.zh)+'</select></div>';
  h+='<div class="field"><label>英文字体</label><select id="fontEn" onchange="applyFont()">'+importedFontOptions("en", fc.en)+'</select></div>';
  h+='<div class="slider-row"><label>全局基础字号 <span id="fsV">'+(fc.fs||16)+'px</span></label><input type="range" min="13" max="19" step="1" value="'+(fc.fs||16)+'" oninput="setFontSize(this.value)"></div>';
  h+='<div class="slider-row"><label>标题字号比例 <span id="tsV">'+(fc.titleScale||1.2)+'x</span></label><input type="range" min="1.0" max="1.8" step="0.1" value="'+(fc.titleScale||1.2)+'" oninput="setTitleScale(this.value)"></div>';
  h+='<div class="slider-row"><label>正文粗细 <span id="bwV">'+(fc.bodyWeight||400)+'</span></label><input type="range" min="300" max="700" step="100" value="'+(fc.bodyWeight||400)+'" oninput="setBodyWeight(this.value)"></div>';
  h+='<div class="slider-row"><label>标题粗细 <span id="twV">'+(fc.titleWeight||700)+'</span></label><input type="range" min="400" max="900" step="100" value="'+(fc.titleWeight||700)+'" oninput="setTitleWeight(this.value)"></div>';
  h+='<div class="slider-row"><label>行高 <span id="lhV">'+(fc.lineHeight||1.6)+'</span></label><input type="range" min="1.2" max="2.2" step="0.1" value="'+(fc.lineHeight||1.6)+'" oninput="setLineHeight(this.value)"></div>';
  h+='<div class="modal-ops"><button class="save" onclick="applyFont()">应用字体</button></div>';
  h+='<div class="import-font"><div class="if-title">导入网络字体（Google Fonts 等）</div>'+
    '<div class="if-row"><select id="impKind"><option value="zh">中文</option><option value="en">英文</option></select>'+
    '<input id="impName" placeholder="字体名，如 Ma Shan Zheng / Noto Serif SC">'+
    '<button onclick="importFont(document.getElementById(\'impKind\').value,document.getElementById(\'impName\').value)">导入</button></div>'+
    '<div class="if-row" style="margin-top:8px"><select id="impKind2"><option value="zh">中文</option><option value="en">英文</option></select>'+
    '<input id="impLocalName" placeholder="显示名（可留空）" style="flex:.9">'+
    '<label class="if-file"><input type="file" id="impFontFile" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff" style="display:none" onchange="importLocalFont(document.getElementById(\'impKind2\').value,document.getElementById(\'impLocalName\').value,this.files[0])">选择字体文件</label></div>'+
    '<div class="mini-note">本地字体：选 .ttf/.otf/.woff/.woff2 文件即可离线使用（当前已导入：'+(imp.zh||imp.en||'无')+'）。网络字体需联网加载。</div>'+
  '</div>';
  h+='</div>';

  /* 板块0.1：卡片样式独立控制（#6） */
  const cc=state.meta.card||{pad:16,borderOp:0.18,shadow:0.08};
  h+='<div class="card"><h3>🃏 卡片样式微调</h3><div class="mini-note">独立控制所有卡片的内边距、边框透明度与阴影强度，不影响主题色与毛玻璃。</div>';
  h+='<div class="slider-row"><label>内边距 Padding <span id="cardPadV">'+(cc.pad!=null?cc.pad:14)+'px</span></label><input type="range" min="8" max="28" step="1" value="'+(cc.pad!=null?cc.pad:14)+'" oninput="setCardPad(this.value)"></div>';
  h+='<div class="slider-row"><label>边框透明度 <span id="cardBorderV">'+Math.round((cc.borderOp!=null?cc.borderOp:0.18)*100)+'%</span></label><input type="range" min="0" max="60" step="2" value="'+Math.round((cc.borderOp!=null?cc.borderOp:0.18)*100)+'" oninput="setCardBorder(this.value)"></div>';
  h+='<div class="slider-row"><label>阴影强度 <span id="cardShadowV">'+(cc.shadow!=null?cc.shadow:0.08)+'</span></label><input type="range" min="0" max="0.30" step="0.01" value="'+(cc.shadow!=null?cc.shadow:0.08)+'" oninput="setCardShadow(this.value)"></div>';
  h+='<div class="modal-ops"><button class="cancel" onclick="resetCardStyle()">恢复默认</button></div>';
  h+='</div>';

  /* 板块0.5：视频区开关 */
  h+='<div class="card"><h3>'+icon('video',16)+' 视频区开关</h3><div class="mini-note">按栏目控制是否显示「B站视频学习」区，不需要的关掉即可。</div>';
  h+='<div style="display:flex;flex-wrap:wrap;gap:6px">';
  for(const id in MODULE_DEFS){
    if(id==="xiaohongshu")continue;
    const on=!(state.meta.videoOn&&state.meta.videoOn[id]===false);
    h+='<span class="pill" style="cursor:pointer;border-color:'+(on?'var(--accent)':'var(--glass-border)')+';opacity:'+(on?'1':'.45')+'" onclick="toggleVideo(\''+id+'\')">'+(on?'✅':'⬜')+' '+MODULE_DEFS[id].icon+' '+esc(MODULE_DEFS[id].title)+'</span>';
  }
  h+='</div></div>';

  /* 板块0：一键主题色 */
  h+='<div class="card"><h3>'+icon('sparkle',16)+' 一键主题色</h3>';
  h+='<div class="mini-note">点一个色卡 → 按钮/进度条/强调色/侧边栏选中项全部跟着变（改的是 --primary 和 --accent 两个变量）。</div>';
  h+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">';
  THEME_COLORS.forEach(function(tc){
    h+='<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:var(--radius-l);cursor:pointer;border:1px solid var(--glass-border);background:var(--glass-solid)" onclick="applyThemeColor(\''+tc.p+'\',\''+tc.a+'\')">'+
      '<span style="width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,'+tc.p+','+tc.a+');display:inline-block;border:1px solid rgba(0,0,0,.1)"></span>'+
      '<span style="font-size:12px;color:var(--text)">'+tc.n+'</span></div>';
  });
  h+='</div></div>';

  /* 板块0.0：主题色独立控制（#51）+ 实时预览卡片（#53） */
  const cs=getComputedStyle(document.documentElement);
  const curPrimary=cs.getPropertyValue("--primary").trim()||"#E8A0A0";
  const curAccent=cs.getPropertyValue("--accent").trim()||"#F4C3A1";
  const curBg=cs.getPropertyValue("--bg").trim()||"#F5F3F0";
  const curInk=cs.getPropertyValue("--ink").trim()||"#2C2C2C";
  h+='<div class="card"><h3>主题色独立控制</h3><div class="mini-note">分别调主色 / 强调色 / 背景 / 文字，拖动即时预览右侧示例卡。</div>';
  h+='<div style="display:flex;gap:12px;align-items:center;margin-top:6px">';
  h+='<div style="flex:1;display:flex;flex-direction:column;gap:8px">'+
    '<div class="color-row"><label>主色</label><input type="color" id="pickPrimary" value="'+rgbToHex(curPrimary)+'" oninput="liveThemeColor()"></div>'+
    '<div class="color-row"><label>强调色</label><input type="color" id="pickAccent" value="'+rgbToHex(curAccent)+'" oninput="liveThemeColor()"></div>'+
    '<div class="color-row"><label>背景</label><input type="color" id="pickBg" value="'+rgbToHex(curBg)+'" oninput="liveThemeColor()"></div>'+
    '<div class="color-row"><label>文字</label><input type="color" id="pickInk" value="'+rgbToHex(curInk)+'" oninput="liveThemeColor()"></div>'+
  '</div>';
  h+='<div class="preview-card" id="themePreview">'+
    '<div class="pc-demo-bg" id="pcBg"></div>'+
    '<div class="pc-title" id="pcTitle">示例标题</div>'+
    '<div class="pc-text" id="pcText">这是一段正文示例文字，用于预览字体与配色效果。</div>'+
    '<button class="pc-btn" id="pcBtn">主按钮</button>'+
    '<div class="pc-bar" id="pcBar"><div class="pc-bar-fill" id="pcBarFill"></div></div>'+
  '</div>';
  h+='</div>';
  h+='<div class="modal-ops"><button class="cancel" onclick="resetThemeColor()">恢复默认</button><button class="save" onclick="applyIndependentTheme()">'+icon('sparkle',14)+' 应用配色</button></div>';
  h+='</div>';

  /* 板块0.1：主题预设（一键整体风格） */
  const preset=state.meta.themePreset;
  h+='<div class="card"><h3>'+icon('sparkle',16)+' 主题预设</h3><div class="mini-note">一键切换整体风格（主色 + 推荐背景渐变），比单独调色更省心。</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px">';
  THEME_COLORS.forEach(function(tc,i){
    h+='<div class="theme-opt'+(preset===i?' active':'')+'" style="cursor:pointer" onclick="applyThemePreset('+i+')"><div class="sw" style="background:'+tc.bg+'"></div>'+tc.n+'</div>';
  });
  h+='</div></div>';

  /* 板块0.1.2：雨天氛围开关（磨砂·雨季专属） */
  const rainOn=!!state.meta.rainAtmos;
  h+='<div class="card"><h3 data-en="ATMOSPHERE">🌧 雨天氛围</h3><div class="mini-note">磨砂·雨季主题的专属氛围层：首页封面飘落雨丝、浮动雾气与水面涟漪（参考「雨滴时间栏 / 潮湿雨季版头」）。仅在首页封面展示，不影响阅读。</div><div class="modal-ops"><button class="'+(rainOn?'save':'cancel')+'" onclick="toggleRainAtmos()">'+(rainOn?'🌧 已开启（点击关闭）':'☀️ 已关闭（点击开启）')+'</button></div></div>';

  /* 板块0.1.1：主题模式（含自动跟随系统/时段） */
  const curMode=(state.meta.theme&&state.meta.theme.mode)||"cold";
  const modes=[["cold","❄️ 冷色","#F2EFEC"],["minimal","⚪ 极简","#FFFFFF"],["postcard","🪶 黑白明信片","linear-gradient(135deg,#1a1a1c,#0a0a0b)"],["neu","🌀 新拟态","#E6EBF2"],["liquid","💠 液态玻璃","linear-gradient(135deg,#1b1f3b,#d6457f)"],["dark","🌙 暗色","#1F1F1F"],["frost","🌧 磨砂·雨季","#0B0B0C"],["auto","🔄 自动","linear-gradient(135deg,#0B0B0C,#F2EFEC)"]];
  h+='<div class="card"><h3>🌗 主题模式</h3><div class="mini-note">「自动」会根据系统深色模式 + 本地时段（19:00–07:00 自动暗色）智能切换，省去手动来回切。</div><div class="theme-grid">';
  modes.forEach(function(m){
    h+='<div class="theme-opt'+(curMode===m[0]?' active':'')+'" style="cursor:pointer" onclick="setThemeMode(\''+m[0]+'\')"><div class="sw" style="background:'+m[2]+'"></div>'+m[1]+'</div>';
  });
  h+='</div></div>';

  /* 板块0.1.2：材质系统（平面 / 清透 / 玻璃） */
  const mat=state.meta.material||"glass";
  const mp=state.meta.matParams||{glassBlur:30,clearBorder:18,cardOpacity:55};
  const mats=[["flat","🧱 平面","实色填充，无模糊，干净利落（原版观感）"],["clear","💧 清透","弱模糊 + 半透明，描边清晰（最通透）"],["glass","🪟 玻璃","强模糊毛玻璃，层次柔和（iOS 风）"]];
  h+='<div class="card"><h3>🧱 材质系统</h3><div class="mini-note">控制全界面质感。导航栏、底栏、弹窗始终为玻璃；卡片/九宫格随材质变化。</div>';
  h+='<div class="mat-grid">';
  mats.forEach(function(mt){
    h+='<div class="mat-opt'+(mat===mt[0]?' active':'')+'" style="cursor:pointer" onclick="setMaterial(\''+mt[0]+'\')"><div class="mat-sw mat-'+mt[0]+'"></div><div class="mat-lb">'+mt[1]+'</div><div class="mat-desc">'+mt[2]+'</div></div>';
  });
  h+='</div>';
  h+='<div class="slider-row"><label>毛玻璃动态模糊强度 <span id="mat_glassBlur">'+(mp.glassBlur!=null?mp.glassBlur:30)+'px</span></label><input type="range" min="0" max="40" step="1" value="'+(mp.glassBlur!=null?mp.glassBlur:30)+'" oninput="setMatParam(\'glassBlur\',this.value)"></div>';
  h+='<div class="slider-row"><label>清透材质描边透明度 <span id="mat_clearBorder">'+(mp.clearBorder!=null?mp.clearBorder:18)+'%</span></label><input type="range" min="5" max="40" step="1" value="'+(mp.clearBorder!=null?mp.clearBorder:18)+'" oninput="setMatParam(\'clearBorder\',this.value)"></div>';
  h+='<div class="slider-row"><label>全局卡片透明度 <span id="mat_cardOpacity">'+(mp.cardOpacity!=null?mp.cardOpacity:55)+'%</span></label><input type="range" min="30" max="80" step="1" value="'+(mp.cardOpacity!=null?mp.cardOpacity:55)+'" oninput="setMatParam(\'cardOpacity\',this.value)"></div>';
  h+='<div class="mini-note">拖动即实时预览，刷新后保留。</div></div>';

  /* 板块0.2：AI API 配置（智能研习社提炼用） */
  const api=state.meta.apiCfg||{provider:"kimi",key:"",model:"",base:"",autoDaily:true};
  const pr=getProvider(api.provider);
  const apiModelPh=defaultModelFor(api.provider);
  h+='<div class="card"><h3>🤖 AI 提炼 API 配置</h3>';
  h+='<div class="mini-note">知识研习默认走「规则提炼」无需 Key；填入 Key 后启用 AI 提炼。Key 只存本机。</div>';
  h+='<div class="field"><label>服务商</label><select id="apiProvider" onchange="state.meta.apiCfg.provider=this.value;renderDecor()">'+providerOptions(api.provider)+'</select></div>';
  if(pr.free)h+='<div class="mini-note">🆓 该服务商提供免费额度'+(pr.signup?' · <a href="'+pr.signup+'" target="_blank" style="color:var(--accent-ink)">申请 Key ↗</a>':'')+'</div>';
  if(api.provider==="custom"||api.provider==="charity"){
    h+='<div class="field"><label>接口地址 '+(api.provider==="charity"?"（公益中转 URL）":"")+'</label><input id="apiBase" placeholder="'+(api.provider==="charity"?"https://公益中转地址/v1/chat/completions":"https://your-api/v1/chat/completions")+'" value="'+esc(api.base||"")+'" /></div>';
    h+='<div class="alert alert-cors"><div class="alert-title">🌐 关于自定义/公益地址</div><div class="alert-detail">打包 APP 内浏览器需目标地址支持跨域(CORS)。若提示 CORS 被拦截，请换 DeepSeek / 硅基流动 / 通义 / 智谱 等国内可达的服务商。</div></div>';
  }else{
    h+='<div class="mini-note">接口地址：<code style="font-size:11px">'+esc(pr.url)+'</code></div>';
  }
  h+='<div class="field"><label>API Key</label><input id="apiKey" type="password" placeholder="sk-..." value="'+esc(decodeKey(api.key)||"")+'" /></div>';
  h+='<div class="mini-note" style="color:var(--gray)">🔒 安全提示：Key 仅做 Base64 混淆后存于本机浏览器，适合个人单机使用。若部署为公开服务，请勿在此填写真实 Key，应改用自建服务端代理转发。</div>';
  h+='<div class="field"><label>模型</label>'+modelSelectHtml(api.provider, api.model)+'</div>';
  h+='<div class="api-action-row"><button class="feed-play" onclick="fetchModels()">'+icon("search",14)+' 检索模型</button><button class="feed-play" onclick="testApiConn()">'+icon("plug",14)+' 测试连接</button></div>';
  h+='<div id="apiModelsResult" class="api-result" style="display:none"></div>';
  /* 板块0.2.1：高级参数 */
  const keysPool=(api.keys&&api.keys[api.provider]||[]).map(decodeKey);
  const params=api.params||{temperature:0.3,maxTokens:800,topP:1,timeout:15};
  const fallback=(api.fallback!==false);
  h+='<details class="adv-details"><summary>高级参数（多 Key 轮换 · 温度 · 降级）</summary>'+
    '<div class="field"><label>多 Key 轮换（每行一个，仅对当前服务商生效）</label><textarea id="apiKeys" rows="2" placeholder="sk-xxx\nsk-yyy">'+esc(keysPool.join("\n"))+'</textarea></div>'+
    '<div class="mini-note">开启多 Key 后，每次调用自动轮换使用，降低单 Key 限频风险。</div>'+
    '<div class="slider-row"><label>温度 Temperature <span id="pTempV">'+params.temperature+'</span></label><input type="range" min="0" max="1" step="0.1" value="'+params.temperature+'" oninput="document.getElementById(\'pTempV\').textContent=this.value"></div>'+
    '<div class="slider-row"><label>最大 Token <span id="pMaxV">'+params.maxTokens+'</span></label><input type="range" min="200" max="4000" step="100" value="'+params.maxTokens+'" oninput="document.getElementById(\'pMaxV\').textContent=this.value"></div>'+
    '<div class="slider-row"><label>Top P <span id="pTopV">'+params.topP+'</span></label><input type="range" min="0" max="1" step="0.05" value="'+params.topP+'" oninput="document.getElementById(\'pTopV\').textContent=this.value"></div>'+
    '<div class="slider-row"><label>超时（秒） <span id="pTimeoutV">'+params.timeout+'</span></label><input type="range" min="5" max="60" step="1" value="'+params.timeout+'" oninput="document.getElementById(\'pTimeoutV\').textContent=this.value"></div>'+
    '<div class="toggle-wrap"><label class="toggle-label"><span class="toggle-text">调用失败自动降级为规则提炼</span>'+
      '<span class="toggle"><input type="checkbox" class="toggle-input" '+(fallback?"checked":"")+' id="apiFallback"></span></label></div>'+
    '<div class="mini-note">默认开启：AI 调用异常时自动回退到本地规则提炼，保证功能不中断。</div>'+
  '</details>';
  h+='<div id="apiTestResult" class="api-result" style="display:none"></div>';
  (function(){
    const s=apiStatLine();
    if(s)h+='<div class="mini-note" style="color:var(--gray);margin-top:8px">📊 本月调用 '+s.calls+' 次 · 成功 '+s.success+' · 失败 '+s.fail+(s.lastMs?' · 上次 '+s.lastMs+'ms':'')+'</div>';
  })();
  h+='<div class="modal-ops">'+
    '<button class="cancel" onclick="clearApiKey()">清除密钥</button>'+
    '<button class="save" onclick="saveApiCfg()">保存配置'+icon("key",14)+'</button></div>';
  h+='</div>';
  /* 板块0.2.6：调用日志 */
  const log=(state.meta.apiCfg&&state.meta.apiCfg.log)||[];
  h+='<details class="adv-details"><summary>📜 调用日志（最近 '+log.length+' 条）</summary>'+
    '<div class="api-log">'+(log.length?log.map(function(l){
      return '<div class="api-log-row '+(l.ok?'ok':'err')+'"><span class="al-t">'+esc(l.t)+'</span>'+
        '<span class="al-p">'+esc(l.provider)+' · '+(l.model||'')+'</span>'+
        '<span class="al-ms">'+(l.ms!=null?l.ms+'ms':'—')+'</span>'+
        '<span class="al-st">'+(l.ok?'✓':'✕ '+(l.err||''))+'</span></div>';
    }).join(''):'<div class="mini-note">暂无调用记录，配置 Key 后调用会在这里显示。</div>')+'</div>'+
  '</details>';

  /* 板块0.2.5：开关设置（组件三：滑动开关） */
  const tog=state.meta.toggles||{};
  const autoDaily=(state.meta.apiCfg&&state.meta.apiCfg.autoDaily!==false);
  h+='<div class="card"><h3>🔘 快捷开关</h3><div class="mini-note">常用开关，改动即时生效并本地保存。</div>'+
    '<div class="toggle-wrap"><label class="toggle-label"><span class="toggle-text">每日自动 AI 提炼</span>'+
      '<span class="toggle"><input type="checkbox" class="toggle-input" '+(autoDaily?"checked":"")+' data-key="apiCfg.autoDaily" data-onchange="autoDailyChanged()"></span></label></div>'+
    '<div class="toggle-wrap"><label class="toggle-label"><span class="toggle-text">交互震动反馈</span>'+
      '<span class="toggle"><input type="checkbox" class="toggle-input" '+(tog.haptic!==false?"checked":"")+' data-key="toggles.haptic" data-onchange="hapticToast()"></span></label></div>'+
    '<div class="toggle-wrap"><label class="toggle-label"><span class="toggle-text">韩系衬线标题</span>'+
      '<span class="toggle"><input type="checkbox" class="toggle-input" '+(tog.serifTitle?"checked":"")+' data-key="toggles.serifTitle" data-onchange="applySerifTitle()"></span></label></div>'+
    '<div class="toggle-wrap"><label class="toggle-label"><span class="toggle-text">列表长按提示气泡</span>'+
      '<span class="toggle"><input type="checkbox" class="toggle-input" '+(tog.lpHint!==false?"checked":"")+' data-key="toggles.lpHint"></span></label></div>'+
    '<div class="toggle-wrap"><label class="toggle-label"><span class="toggle-text">桌面提醒（专注/考试）</span>'+
      '<span class="toggle"><input type="checkbox" class="toggle-input" '+(state.meta.notifyOn!==false?"checked":"")+' data-key="meta.notifyOn" data-onchange="onNotifyToggle()"></span></label></div>'+
    '<div class="toggle-wrap"><label class="toggle-label"><span class="toggle-text">减弱动效（晕动/弱网友好）</span>'+
      '<span class="toggle"><input type="checkbox" class="toggle-input" '+((tog.reducedMotion)?"checked":"")+' data-key="toggles.reducedMotion" data-onchange="applyReducedMotion()"></span></label></div>'+
    '<div class="toggle-wrap"><label class="toggle-label"><span class="toggle-text">工具页全屏（番茄钟/呼吸充满屏幕）</span>'+
      '<span class="toggle"><input type="checkbox" class="toggle-input" '+((tog.toolFullscreen)?"checked":"")+' data-key="toggles.toolFullscreen" data-onchange="applyToolFullscreen()"></span></label></div>'+
  '</div>';

  /* 板块0.3：文字颜色（独立于主题色） */
  const tc0=state.meta.textColors||{};
  h+='<div class="card"><h3>✒️ 文字颜色（独立于主题色）</h3>';
  h+='<div class="mini-note">单独控制标题 / 正文 / 辅助文字颜色，不影响主题强调色（按钮等）。</div>';
  h+='<div class="color-row"><label>标题色</label><input type="color" id="tcInk" value="'+(tc0.ink||"#2C2C2C")+'"></div>';
  h+='<div class="color-row"><label>正文色</label><input type="color" id="tcText" value="'+(tc0.text||"#3A3A3A")+'"></div>';
  h+='<div class="color-row"><label>辅助色</label><input type="color" id="tcGray" value="'+(tc0.gray||"#AAAAAA")+'"></div>';
  h+='<div class="modal-ops"><button class="cancel" onclick="clearTextColors()">恢复默认</button><button class="save" onclick="applyTextColors()">应用文字色'+icon("sparkle",14)+'</button></div>';
  h+='</div>';

  /* 板块0.4：毛玻璃 / 圆角 */
  h+='<div class="card"><h3>🪟 毛玻璃强度 / 卡片圆角</h3>';  h+='<div class="toggle-wrap" style="margin:6px 0 10px"><label class="toggle-label"><span class="toggle-text">✨ 毛玻璃总开关（关闭后全界面变清透实色，背景材质更突出）</span>'+
     '<span class="toggle"><input type="checkbox" class="toggle-input" '+(state.meta.glassAll!==false?"checked":"")+' onchange="setGlassAll(this.checked)"></span></label></div>';
  h+='<div class="mini-note">快捷预设：</div>';
  h+='<div class="pill-row"><button class="pill" onclick="setBlurPreset(6)">轻</button><button class="pill" onclick="setBlurPreset(16)">中</button><button class="pill" onclick="setBlurPreset(28)">重</button></div>';
  h+='<div class="slider-row"><label>毛玻璃强度 <span id="blurV">'+(state.meta.blur!=null?state.meta.blur:16)+'px</span></label><input type="range" min="0" max="30" step="1" value="'+(state.meta.blur!=null?state.meta.blur:16)+'" oninput="setBlur(this.value)"></div>';
  h+='<div class="slider-row"><label>卡片圆角 <span id="radV">'+(state.meta.radius!=null?state.meta.radius:20)+'px</span></label><input type="range" min="0" max="40" step="1" value="'+(state.meta.radius!=null?state.meta.radius:20)+'" oninput="setRadius(this.value)"></div>';
  h+='<div class="mini-note">快捷档位：</div>';
  h+='<div class="pill-row"><button class="pill" onclick="setRadius(8)">利落 8</button><button class="pill" onclick="setRadius(14)">柔和 14</button><button class="pill" onclick="setRadius(20)">圆润 20</button><button class="pill" onclick="setRadius(28)">娇憨 28</button></div>';
  h+='<div class="mini-note">拖动即实时预览，刷新后保留。</div></div>';

  /* 板块0.4.1：组件级毛玻璃控制（#54） */
  const gp=state.meta.glassParts||{nav:true,card:true,tab:true,modal:true,grid:true};
  const gpParts=[["nav","顶部导航栏"],["card","卡片"],["tab","底部 Tab"],["modal","弹窗"],["grid","九宫格"]];
  h+='<div class="card"><h3>🧩 组件级毛玻璃</h3><div class="mini-note">单独开关各区域的毛玻璃效果（关闭后变实色，更省电 / 更清晰）。</div>';
  gpParts.forEach(function(pt){
    h+='<div class="toggle-wrap"><label class="toggle-label"><span class="toggle-text">'+pt[1]+'</span>'+
      '<span class="toggle"><input type="checkbox" class="toggle-input" '+(gp[pt[0]]!==false?"checked":"")+' onchange="setGlassPart(\''+pt[0]+'\',this.checked)"></span></label></div>';
  });
  h+='</div>';

  /* 板块0.5：远程样式（打包APK后也能更新美化） */
  h+='<div class="card"><h3>🌐 远程样式更新</h3>';
  h+='<div class="mini-note">把 CSS 文件传到 Vercel / GitHub Pages 等任意可访问的网址，填地址点「拉取并应用」→ 打包成 APK 后也能随时换主题美化。开启自动后每次打开工作台自动拉取最新样式。</div>';
  h+='<div class="feed-input"><input id="remoteCssUrl" placeholder="https://你的域名/style.css" value="'+esc(state.meta.remoteCssUrl||"")+'" /><button onclick="fetchRemoteCss()">拉取并应用</button></div>';
  h+='<div style="display:flex;gap:8px;margin-top:8px;align-items:center">'+
    '<label class="switch-label">打开工作台时自动拉取<span class="switch"><input type="checkbox" id="autoRemoteCss" '+(state.meta.autoRemoteCss?"checked":"")+' onchange="toggleAutoRemote(this.checked)"><span class="slider"></span></span></label>'+
    '<button class="feed-play" style="margin-left:auto" onclick="document.getElementById(\'remoteCssUrl\').value=\'\';state.meta.remoteCssUrl=null;save();toast(\'已清空远程地址\')">清空</button></div></div>';

  /* 板块1：全局CSS */
  h+='<div class="card"><h3>① 全局CSS样式库 <span class="tag" onclick="resetCssBox()" style="cursor:pointer">载入默认</span></h3>';
  h+='<div class="mini-note">粘贴CSS后点「应用样式」→ 可改所有视觉：<b>按钮颜色</b>（--primary/--accent）、字体、背景、圆角、毛玻璃、卡片、进度条…工作台里看到的一切都能美化。改色最快方式：改上面两个变量，或用「一键主题色」。</div>';
  h+='<div class="code-editor-wrap"><textarea id="cssInput" class="code-editor" spellcheck="false" placeholder="在此粘贴或编写 CSS...">'+esc(cur)+'</textarea></div>';
  h+='<div id="cssCheck" class="css-check" style="display:none"></div>';
  h+='<div class="modal-ops"><button class="cancel" onclick="formatCss()">格式化</button><button class="cancel" onclick="checkCss()">语法检查</button><button class="cancel" onclick="resetCssBox()">载入默认</button><button class="save" onclick="applyCssFromDecor()">应用样式'+icon("sparkle",14)+'</button></div>';
  h+='</div>';

  /* 板块1.5：全局背景纸（纯净 / 通透 / 沉浸 + 更多质感） */
  const paper=state.meta.paper||{preset:"pure",opacity:92,halo:"on"};
  const paperSw={pure:"linear-gradient(135deg,#F5F3F0,#EDE9E3)",clear:"linear-gradient(135deg,#FAF8F5,#F0ECE6)",deep:"linear-gradient(135deg,#EDE9E3,#DCD6CC)",frost:"linear-gradient(135deg,#F3F1EE,#E4E2DE)",linen:"linear-gradient(135deg,#F2EFEA,#E7E2DA)",dots:"linear-gradient(135deg,#F6F5F3,#ECEAE6)",noise:"linear-gradient(135deg,#EFEDEA,#E2DFDA)",grid:"linear-gradient(135deg,#F4F3F1,#E8E5E0)",wave:"linear-gradient(135deg,#F1F4F5,#E2E8EA)"};
  const paperList=Object.keys(PAPER_PRESETS);
  h+='<div class="card"><h3>📄 全局背景纸</h3><div class="mini-note">纸张底色作为全界面基础背景，以下共 '+paperList.length+' 种质感：纯净（留白）/ 通透（微光晕）/ 沉浸（深沉）/ 磨砂 · 亚麻 · 点阵 · 颗粒 · 格纹 · 波纹（带细腻纹理）。</div>';
  h+='<div class="theme-grid">';
  paperList.forEach(function(pk){
    const tv=PAPER_TEXTURES[(PAPER_PRESETS[pk]&&PAPER_PRESETS[pk].tex)||"none"];
    // 修复：纹理 url() 内含双引号，直接拼进 style="..." 会提前闭合属性，
    // 剩余字符当作普通文本渲染 → 设置面板出现「乱码」。这里做 HTML 属性转义。
    const tvSafe=(tv&&tv!=="none")?String(tv).replace(/"/g,"&quot;").replace(/</g,"%3C").replace(/>/g,"%3E"):"";
    h+='<div class="theme-opt'+(paper.preset===pk?' active':'')+'" style="cursor:pointer" onclick="setPaper(\''+pk+'\')"><div class="sw" style="background:'+(paperSw[pk]||'#eee')+(tvSafe?';background-image:'+tvSafe+';background-blend-mode:overlay':'')+'"></div>'+(PAPER_PRESETS[pk]?PAPER_PRESETS[pk].n:pk)+'</div>';
  });
  h+='</div>';
  h+='<div class="slider-row"><label>纸张透明度 <span id="paperOp">'+(paper.opacity!=null?paper.opacity:92)+'%</span></label><input type="range" min="70" max="100" step="1" value="'+(paper.opacity!=null?paper.opacity:92)+'" oninput="setPaperOpacity(this.value)"></div>';
  h+='<div class="modal-ops"><button class="'+(paper.halo==="off"?"cancel":"save")+'" onclick="setPaperHalo(\''+(paper.halo==="off"?"on":"off")+'\')">'+(paper.halo==="off"?"✨ 开启光晕纹理":"🚫 关闭光晕纹理")+'</button>'+
    '<button class="'+(state.meta.texMaster===false?"cancel":"save")+'" onclick="setTexMaster('+(state.meta.texMaster===false?"true":"false")+')">'+(state.meta.texMaster===false?"✨ 开启材质纹理":"🚫 关闭材质纹理")+'</button></div>';
  h+='</div>';

  /* 板块2：背景图 */
  const bgm=state.meta.decorBgMode||"cover";
  h+='<div class="card"><h3>② 背景图片上传区</h3>';
  h+='<div class="field"><div class="imgpick" id="decorBgPick" style="'+(bg?('background-image:url('+bg+')'):'')+'">'+(bg?"点击更换背景图 📷":"点击从相册选择背景图 📷")+'</div></div>';
  h+='<div class="mini-note">显示模式：</div>';
  h+='<div class="cover-modes" style="margin-top:4px"><button data-m="cover" class="'+(bgm==="cover"?"active":"")+'" onclick="setDecorBgMode(\'cover\')">覆盖</button><button data-m="contain" class="'+(bgm==="contain"?"active":"")+'" onclick="setDecorBgMode(\'contain\')">适应</button><button data-m="stretch" class="'+(bgm==="stretch"?"active":"")+'" onclick="setDecorBgMode(\'stretch\')">拉伸</button></div>';
  const bo=state.meta.decorBgOp!=null?state.meta.decorBgOp:100, bf=state.meta.decorBgBlur!=null?state.meta.decorBgBlur:0;
  h+='<div class="slider-row"><label>背景透明度 <span id="bgOpV">'+bo+'%</span></label><input type="range" min="0" max="100" step="5" value="'+bo+'" oninput="setDecorBgOpacity(this.value)"></div>';
  h+='<div class="slider-row"><label>背景模糊 <span id="bgBlurV">'+bf+'px</span></label><input type="range" min="0" max="20" step="1" value="'+bf+'" oninput="setDecorBgBlur(this.value)"></div>';
  h+='<div class="mini-note">透明度调低可让背景更隐约；模糊调高可虚化背景突出内容。</div>';
  h+='<div class="modal-ops"><button class="cancel" onclick="restoreDefaultBg()">移除背景（#F5F5F5）</button><button class="save" onclick="uploadDecorBg()">上传背景图'+icon("sparkle",14)+'</button></div>';
  h+='<div class="field" style="margin-top:8px"><textarea id="bgPaste" rows="2" placeholder="若上方按钮选不了图，可在此粘贴图片：复制一张图后点「粘贴设置」，或粘贴 data:image/... 链接" style="width:100%;font-size:12px;font-family:monospace"></textarea></div>';
  h+='<div class="modal-ops"><button class="save" onclick="(async()=>{var t=document.getElementById(\'bgPaste\');await applyBgFromClipOrText(t?t.value:\'\');})()">📋 粘贴设置背景</button><button class="cancel" onclick="(async()=>{await applyBgFromClipOrText(\'\');})()">从剪贴板读图</button></div>';
  h+='</div>';

  /* 板块2.7：统一封面风格（#2 全局滤镜） */
  const cf=state.meta.coverFilter||"none";
  const cfOpts=[["none","原色"],["bw","黑白"],["warm","暖调"],["cool","冷调"]];
  h+='<div class="card"><h3>🖼 统一封面风格</h3><div class="mini-note">一键给所有栏目的封面图（含首页大图）套用相同滤镜，形成整体感。单个栏目仍可单独微调。</div>';
  h+='<div class="cf-row">';
  cfOpts.forEach(function(o){
    h+='<button class="cf-chip'+(cf===o[0]?' active':'')+'" onclick="setCoverFilter(\''+o[0]+'\')">'+o[1]+'</button>';
  });
  h+='</div></div>';

  /* 板块2.8：主题方案（命名保存整套视觉，可切换） */
  const schemes=(state.meta.themeSchemes||[]);
  h+='<div class="card"><h3>🎨 主题方案</h3><div class="mini-note">把当前整套视觉（配色 + 材质 + 圆角 + 背景 + 风格氛围）打包命名保存，随时一键切换。</div>';
  h+='<div class="modal-ops"><button class="save" onclick="promptThemeScheme()">＋ 保存当前为方案</button></div>';
  if(!schemes.length)h+='<div class="mini-note">暂无方案，点上方按钮保存当前这一套吧。</div>';
  h+='<div class="scheme-list">';
  schemes.forEach(function(s,i){
    const isActive=(s.name===state.meta.activeScheme);
    h+='<div class="scheme-row'+(isActive?' active':'')+'">'+
      '<span class="scheme-handle" onclick="moveScheme('+i+',-1)" title="上移">▲</span>'+
      '<span class="scheme-emoji">'+(s.emoji||"🌸")+'</span>'+
      '<span class="scheme-name">'+esc(s.name||("方案"+(i+1)))+(isActive?' <span class="scheme-cur">● 当前</span>':'')+'</span>'+
      '<span class="scheme-date">'+esc(s.date||"")+'</span>'+
      '<span class="scheme-ops">'+
        '<button class="scheme-btn apply" onclick="applyThemeScheme('+i+')">切换</button>'+
        '<button class="scheme-btn del" onclick="deleteThemeScheme('+i+')">删除</button>'+
        '<span class="scheme-handle down" onclick="moveScheme('+i+',1)" title="下移">▼</span>'+
      '</span></div>';
  });
  h+='</div></div>';

  /* 板块3：历史存档 */
  h+='<div class="card"><h3>③ 历史样式存档 <span class="tag" onclick="saveCurrentStyle()" style="cursor:pointer">存档当前</span></h3>';
  h+='<div class="mini-note">最近 5 次操作，点击任意一条可一键恢复当时的 CSS + 背景组合。</div>';
  if(!state.meta.decorHistory.length)h+='<div class="mini-note">暂无存档，应用CSS或更换背景会自动记录。</div>';
  state.meta.decorHistory.forEach((rec,i)=>{
    h+='<div class="item" onclick="restoreHistory('+i+')" style="cursor:pointer"><div class="body">'+icon('clock',14)+' '+esc(rec.desc)+'</div><div class="ops"><button onclick="event.stopPropagation();restoreHistory('+i+')">'+icon('refresh',13)+'</button></div></div>';
  });
  h+='</div>';

  /* 板块4：备份 */
  h+='<div class="card"><h3>💾 数据备份</h3>';
  h+='<div class="mini-note">导出为 JSON 文件，可保存到本地或云端；换设备时用「导入」恢复全部数据。</div>';
  h+='<div class="modal-ops"><button class="save" onclick="exportFullBackup()">导出备份'+icon("download",14)+'</button><button class="cancel" onclick="importFullBackup()">导入恢复'+icon("upload",14)+'</button></div>';
  h+='</div>';

  /* 板块4.5：一键恢复出厂（#9） */
  h+='<div class="card"><h3>🏭 一键恢复出厂</h3><div class="mini-note">把美化设置（CSS / 字体 / 卡片 / 主题色 / 毛玻璃 / 背景增强等）全部回到初始状态。可选择<strong>保留你上传的封面 / 背景图</strong>。</div>';
  h+='<div class="modal-ops"><button class="cancel" onclick="factoryReset()">恢复出厂设置'+icon("alert",14)+'</button></div>';
  h+='</div>';

  h+=renderFeedArea("decor");

  h+='<div class="card"><h3>💡 快捷指令</h3><div class="mini-note">对我说：<br>·「打开美化设置」→ 点菜单最底部 🎨<br>·「应用这个CSS」+ 粘贴代码 → 粘到板块①点「应用样式」<br>·「换背景」+ 图片 → 用板块②上传<br>·「恢复默认」→ 板块①「恢复默认」+ 板块②「移除背景」<br>·「存档当前样式」→ 板块③「存档当前」</div></div>';
  v.innerHTML=h;
  const ip=$("#decorBgPick");if(ip)ip.onclick=uploadDecorBg;
  initToggles(v);
}
function renderDecorFallback(e){
  const v=$("#view-module");
  const hist=state.meta.decorHistory.length?state.meta.decorHistory.map(r=>"🕘 "+esc(r.desc)).join("<br>"):"暂无";
  v.innerHTML='<div class="back-row"><button onclick="showHome()" aria-label="返回"><svg class="svg-ic" viewBox="0 0 24 24" width="20" height="20"><path d="M15 5l-7 7 7 7"/></svg></button><div style="font-weight:600">'+icon('sparkle',18)+' 美化设置</div></div>'+
    '<div class="card"><h3>'+icon('alert',18)+' 渲染异常 · 纯文本备选</h3><div class="mini-note">错误信息：'+esc(e&&e.message||String(e))+'</div></div>'+
    '<div class="card"><h3>CSS粘贴区</h3><textarea id="cssInput" style="width:100%;min-height:160px;font-family:monospace;font-size:12px">'+esc(state.meta.userCss||DEFAULT_CSS)+'</textarea>'+
      '<div class="modal-ops"><button class="save" onclick="applyCssFromDecor()">应用样式</button><button class="cancel" onclick="restoreDefaultStyle()">恢复默认</button></div></div>'+
    '<div class="card"><h3>背景上传区</h3><div class="modal-ops"><button class="save" onclick="uploadDecorBg()">上传背景</button><button class="cancel" onclick="restoreDefaultBg()">移除背景</button></div></div>'+
    '<div class="card"><h3>历史存档</h3><div class="mini-note">'+hist+'</div></div>';
  const ip=$("#decorBgPick");if(ip)ip.onclick=uploadDecorBg;
}
function resetCssBox(){$("#cssInput").value=DEFAULT_CSS;toast("已载入默认CSS，点「应用样式」提交");}
/* #8 语法检查：显示结果到 #cssCheck */
function checkCss(){
  const ta=$("#cssInput"); const box=$("#cssCheck");
  if(!ta||!box)return;
  const err=validateCSS(ta.value);
  box.style.display="block";
  if(err){box.className="css-check css-check-err";box.textContent="⚠️ "+err;}
  else{box.className="css-check css-check-ok";box.textContent="✅ 语法检查通过，没有发现括号或注释错误。";}
}
/* #8 CSS 编辑器增强：格式化（美化缩进） */
function formatCss(){
  const ta=$("#cssInput"); if(!ta)return;
  let css=ta.value;
  // 去首尾空白，按 } 切分规则块
  const blocks=css.replace(/\/\*[\s\S]*?\*\//g,"").split("}");
  let out="";
  blocks.forEach(function(b){
    b=b.trim(); if(!b)return;
    const idx=b.indexOf("{");
    if(idx<0){out+=b+"\n";return;}
    const sel=b.slice(0,idx).trim();
    const body=b.slice(idx+1).trim();
    if(!body){out+=sel+" {}\n";return;}
    const decls=body.split(";").map(s=>s.trim()).filter(Boolean).map(s=>"  "+s+";");
    out+=sel+" {\n"+decls.join("\n")+"\n}\n\n";
  });
  ta.value=out.trim()+"\n";
  toast("已格式化");
}
function setFontSize(v){$("#fsV").textContent=v+"px";state.meta.font=state.meta.font||{};state.meta.font.fs=parseInt(v);applyFontVars();}
function setTitleScale(v){$("#tsV").textContent=v+"x";state.meta.font=state.meta.font||{};state.meta.font.titleScale=parseFloat(v);applyFontVars();}
function setBodyWeight(v){$("#bwV").textContent=v;state.meta.font=state.meta.font||{};state.meta.font.bodyWeight=parseInt(v);applyFontVars();}
function setTitleWeight(v){$("#twV").textContent=v;state.meta.font=state.meta.font||{};state.meta.font.titleWeight=parseInt(v);applyFontVars();}
function setLineHeight(v){$("#lhV").textContent=v;state.meta.font=state.meta.font||{};state.meta.font.lineHeight=parseFloat(v);applyFontVars();}
/* #55 把字体参数写入 CSS 变量，实时预览（写入 #app-font，确保覆盖默认样式基线） */
/* #52 把导入的字体并入全局字体控制下拉：静态字典 + 已导入项（带 imported: 前缀便于 applyFont 识别） */
function importedFontOptions(kind, cur){
  const dict=kind==="en"?FONT_EN:FONT_ZH;
  let html=Object.keys(dict).map(function(k){
    return '<option value="'+esc(k)+'" '+(cur===k?"selected":"")+'>'+esc(k)+'</option>';
  }).join("");
  const imported=state.meta.importedFont||{};
  const val=(kind==="en"?imported.en:imported.zh)||"";
  if(val){
    const label="导入："+val.replace(/^'/,'').replace(/'.*$/,'');
    const isSel=(cur==="imported:"+kind);
    html+='<option value="imported:'+kind+'" '+(isSel?"selected":"")+'>'+esc(label)+'</option>';
  }
  return html;
}
function applyFontVars(){
  const f=state.meta.font||{};
  const root=document.documentElement.style;
  root.setProperty("--font-size",(f.fs||16)+"px");
  if(f.titleScale)root.setProperty("--title-scale",f.titleScale);
  root.setProperty("--body-weight",f.bodyWeight||400);
  root.setProperty("--title-weight",f.titleWeight||700);
  root.setProperty("--line-height",f.lineHeight||1.6);
  const tag=document.getElementById("app-font");
  if(!tag)return;
  const bw=f.bodyWeight||400, tw=f.titleWeight||700, lh=f.lineHeight||1.6, fs=f.fs||16;
  tag.textContent='body{font-weight:'+bw+' !important;line-height:'+lh+' !important;font-size:'+fs+'px !important;}'+
    'h1,h2,h3,h4{font-weight:'+tw+' !important;}'+
    '.bc-val,.dnum{font-weight:'+bw+' !important;}';
}
/* 导入网络字体（如 Google Fonts）：注入 <link> 并把字体名加入字体栈 */
function importFont(kind,name,url){
  kind=kind||"zh";name=(name||"").trim();url=(url||"").trim();
  if(!name){toast("⚠️ 请填写字体名称");return;}
  // 若提供的是完整 Google Fonts CSS 链接，直接注入；否则按名字拼一个默认链接
  let cssUrl=url;
  if(!cssUrl){
    const fam=encodeURIComponent(name);
    cssUrl="https://fonts.googleapis.com/css2?family="+fam.replace(/ /g,"+")+"&display=swap";
  }
  try{
    const id="gf-"+kind+"-"+name.replace(/[^a-z0-9]/gi,"");
    if(!document.getElementById(id)){
      const l=document.createElement("link");l.id=id;l.rel="stylesheet";l.href=cssUrl;
      l.onerror=function(){toast("⚠️ 字体加载失败（可能无外网）");};
      document.head.appendChild(l);
    }
  }catch(e){}
  state.meta.importedFont=state.meta.importedFont||{};
  if(kind==="en")state.meta.importedFont.en="'"+name+"',"+name; else state.meta.importedFont.zh="'"+name+"',"+name;
  state.meta.font=state.meta.font||{};
  if(kind==="en")state.meta.font.en="imported:en"; else state.meta.font.zh="imported:zh";
  save();applyUserStyle();renderDecor();
  toast("✅ 已导入字体："+name+"（已自动套用，可在全局字体控制中切换）");
}
/* 导入本地字体文件（.ttf/.otf/.woff/.woff2），用 @font-face 注入，离线可用 */
function importLocalFont(kind,name,file){
  kind=kind||"zh";
  if(!file){toast("⚠️ 请先选择字体文件");return;}
  const fam=(name&&name.trim())||file.name.replace(/\.[^.]+$/,"")||("localFont_"+kind);
  const reader=new FileReader();
  reader.onload=function(){
    try{
      const dataUrl=reader.result;
      const tag=document.getElementById("local-font-face");
      // 注入 @font-face（同名先去重）
      const rule="@font-face{font-family:'"+fam+"';src:url("+dataUrl+") format('"+fontFormat(file.name)+"');font-display:swap;}";
      let css=(tag.textContent||"");
      css=css.replace(new RegExp("@font-face\\{font-family:'"+fam.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"'[^}]*\\}","g"),"");
      tag.textContent=css+rule;
      state.meta.localFonts=state.meta.localFonts||[];
      state.meta.localFonts=state.meta.localFonts.filter(function(x){return x.fam!==fam;});
      state.meta.localFonts.push({fam:fam,kind:kind,url:dataUrl});
      state.meta.importedFont=state.meta.importedFont||{};
      if(kind==="en")state.meta.importedFont.en="'"+fam+"',"+fam; else state.meta.importedFont.zh="'"+fam+"',"+fam;
      state.meta.font=state.meta.font||{};
      if(kind==="en")state.meta.font.en="imported:en"; else state.meta.font.zh="imported:zh";
      save();applyUserStyle();renderDecor();
      toast("✅ 已导入本地字体："+fam+"（离线可用，已自动套用）");
    }catch(e){ toast("⚠️ 字体读取失败："+(e&&e.message||e)); }
  };
  reader.onerror=function(){ toast("⚠️ 字体文件读取失败"); };
  reader.readAsDataURL(file);
}
function fontFormat(fn){
  const e=(fn.split(".").pop()||"").toLowerCase();
  if(e==="woff2")return "woff2";
  if(e==="woff")return "woff";
  if(e==="otf")return "opentype";
  return "truetype";
}
/* 启动时把已保存的本地字体重新注入 @font-face */
function restoreLocalFonts(){
  try{
    const list=state.meta.localFonts||[];if(!list.length)return;
    const tag=document.getElementById("local-font-face");if(!tag)return;
    tag.textContent=list.map(function(x){
      return "@font-face{font-family:'"+x.fam+"';src:url("+x.url+") format('"+(x.fmt||fontFormat(x.fam))+"');font-display:swap;}";
    }).join("");
  }catch(e){}
}
/* #6 卡片样式独立控制：padding / 边框透明度 / 阴影强度（实时写入 CSS 变量） */
function setCardPad(v){$("#cardPadV").textContent=v+"px";state.meta.card=state.meta.card||{};state.meta.card.pad=parseInt(v);applyCardStyle();}
function setCardBorder(v){$("#cardBorderV").textContent=v+"%";state.meta.card=state.meta.card||{};state.meta.card.borderOp=parseInt(v)/100;applyCardStyle();}
function setCardShadow(v){$("#cardShadowV").textContent=v;state.meta.card=state.meta.card||{};state.meta.card.shadow=parseFloat(v);applyCardStyle();}
function applyCardStyle(){
  const c=state.meta.card||{};
  const root=document.documentElement.style;
  const pad=c.pad!=null?c.pad:16;
  const op=c.borderOp!=null?c.borderOp:0.18;
  const sh=c.shadow!=null?c.shadow:0.08;
  root.setProperty("--card-pad",pad+"px");
  // 边框色 / 阴影：DEFAULT_CSS 基线用 !important 锁定了 .card 的 border/box-shadow（并优先取 --mat-border / --mat-shadow），
  // 玻璃材质规则也用 !important 硬设白色边框。故用 #card-style（位于 #user-style 之后）写入 !important 规则覆盖之。
  const gb=getComputedStyle(document.documentElement).getPropertyValue("--glass-border").trim()||"rgba(120,120,120,0.18)";
  const border=rgbOf(gb,op);
  const shadow="0 4px 18px rgba(0,0,0,"+sh+")";
  root.setProperty("--mat-border",border);
  root.setProperty("--mat-shadow",shadow);
  const tag=document.getElementById("card-style");
  if(tag)tag.textContent='html[data-material] .card,html[data-material] .goal-card,html[data-material] .daily-pick,html[data-material] .dash-card{border-color:'+border+' !important;box-shadow:'+shadow+' !important;padding:var(--card-pad,'+pad+'px) !important;}';
}
function rgbOf(color,a){
  color=(color||"").trim();
  if(color.startsWith("rgb")){
    const m=color.match(/[\d.]+/g);
    if(m&&m.length>=3) return "rgba("+m[0]+","+m[1]+","+m[2]+","+a+")";
    return "rgba(120,120,120,"+a+")";
  }
  let h=color.replace("#","");
  if(h.length===3)h=h.split("").map(x=>x+x).join("");
  const n=parseInt(h,16);
  if(isNaN(n))return "rgba(120,120,120,"+a+")";
  return "rgba("+((n>>16)&255)+","+((n>>8)&255)+","+(n&255)+","+a+")";
}
function resetCardStyle(){state.meta.card={pad:16,borderOp:0.18,shadow:0.08};applyCardStyle();save();toast("🃏 卡片样式已恢复默认");}
/* #9 一键恢复出厂（保留已上传的背景图） */
function factoryReset(){
  showActionSheet("恢复出厂设置",[
    {label:"保留背景图 · 仅重置美化",icon:"image",keep:true},
    {label:"全部清空（含背景图）",icon:"🗑",danger:true,keep:false}
  ],function(opt){
    if(!opt)return;
    factoryResetDo(opt.keep);
  });
}
function factoryResetDo(keepBg){
  const keepBgVal=keepBg?state.meta.decorBg:null;
  const keepBgMode=keepBg?state.meta.decorBgMode:null;
  state.meta.userCss=DEFAULT_CSS;
  state.meta.blur=16;state.meta.radius=20;
  state.meta.font={zh:"system",en:"system",fs:16,titleScale:1.2,bodyWeight:400,titleWeight:700,lineHeight:1.6};
  state.meta.card={pad:16,borderOp:0.18,shadow:0.08};
  state.meta.textColors={};
  state.meta.themeColor=null;
  state.meta.glassParts={nav:true,card:true,tab:true,modal:true,grid:true};
  state.meta.paper={preset:"pure",opacity:92,halo:"on"};
  state.meta.decorBgOp=100;state.meta.decorBgBlur=0;
  if(keepBg){state.meta.decorBg=keepBgVal;state.meta.decorBgMode=keepBgMode||"cover";}
  else{state.meta.decorBg=null;state.meta.decorBgMode="cover";}
  save();applyUserStyle();renderDecor();toast(keepBg?"✅ 已恢复出厂（背景图已保留）":"✅ 已全部恢复出厂");
}
function applyFont(){
  state.meta.font=state.meta.font||{};
  const zhV=$("#fontZh").value, enV=$("#fontEn").value;
  // imported: 前缀 = 用户选择了「导入字体」，仅用导入字体栈（不再叠加静态字典）
  const zhMark=zhV.indexOf("imported:")===0?"imported:zh":"";
  const enMark=enV.indexOf("imported:")===0?"imported:en":"";
  state.meta.font.zh=zhMark||zhV;
  state.meta.font.en=enMark||enV;
  applyFontVars();
  save();applyUserStyle();toast("字体已应用");
}

/* ============ 备份 ============ */
function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download="鞠式工作台备份_"+todayStr()+".json";a.click();
  URL.revokeObjectURL(a.href);toast("✅ 备份已导出");
}
function importData(){
  const inp=document.createElement("input");inp.type="file";inp.accept="application/json";
  inp.onchange=()=>{const f=inp.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=()=>{try{
      const data=JSON.parse(r.result);
      if(!data||!data.modules)throw new Error("文件格式不正确");
      state=data;saveNow();applyUserStyle();renderHome();renderDrawer();toast("✅ 数据已恢复");
    }catch(e){toast("⚠️ 导入失败："+(e.message||"文件损坏"));}};
    r.readAsText(f);
  };
  inp.click();
}

/* ============ 开机 ============ */
let bootQuoteIdx=-1;
function dayIndex(){const d=new Date();const start=new Date(d.getFullYear(),0,0);return Math.floor((d-start)/86400000);}
function renderBoot(){
  const q=QUOTES[((bootQuoteIdx<0?dayIndex():bootQuoteIdx)%QUOTES.length+QUOTES.length)%QUOTES.length];
  // #29 自定义 Splash：标题/语录可被用户覆盖
  const titleEl=$("#bootTitle");
  if(titleEl) titleEl.textContent = (state.meta.bootTitle && state.meta.bootTitle.trim()) ? state.meta.bootTitle : "今天也要像笑笑一样闪闪发光";
  const zhEl=$("#bootZh"), enEl=$("#bootEn");
  if(zhEl) zhEl.textContent = (state.meta.bootSlogan && state.meta.bootSlogan.trim()) ? state.meta.bootSlogan : q.zh;
  if(enEl) enEl.textContent = (state.meta.bootSlogan && state.meta.bootSlogan.trim()) ? "" : q.en;
  // 开屏壁纸与 App 背景统一走 meta.decorBg（一处设置、处处生效），兼容旧版 meta.bgImage
  // ⚠️ 必须用 readImage() 解析引用指针（如 "idb:decorBg"）为真实 data URL，
  //   不能直接用 getPath() 拿原始值——否则 style.background-image 会变成 url("idb:decorBg") 这种无效路径。
  const bg=readImage("meta.decorBg")||readImage("meta.bgImage");const el=$("#bootBg");
  if(bg && /^data:image|^https?:/.test(bg)){ el.style.backgroundImage="url("+bg+")"; el.textContent=""; }
  else if(bg){ /* readImage 返回了非 URL 值（理论上不应发生），降级尝试 getPath */ const raw=getPath("meta.decorBg")||getPath("meta.bgImage"); if(raw) el.style.backgroundImage="url("+raw+")"; else{ el.style.backgroundImage=""; el.textContent="点击设置背景图"; } }
  else{ el.style.backgroundImage=""; el.textContent="点击设置背景图"; }
}
/* #29 自定义 Splash：点按标题/语录即可改写，持久化到 meta */
function editBootField(which){
  try{
    const cur = which==="title" ? (state.meta.bootTitle||"") : (state.meta.bootSlogan||"");
    const label = which==="title" ? "自定义开机标题" : "自定义开机语录";
    const ph = which==="title" ? "例如：今天也要元气满满" : "例如：慢慢来，比较快";
    const v=prompt(label+"（留空恢复默认）", cur);
    if(v===null) return;
    if(which==="title"){ state.meta.bootTitle=v.trim(); } else { state.meta.bootSlogan=v.trim(); }
    save(); renderBoot();
    toast(which==="title"?"✅ 开机标题已更新":"✅ 开机语录已更新");
  }catch(e){}
}
function switchBootQuote(){bootQuoteIdx=(bootQuoteIdx<0?dayIndex():bootQuoteIdx)+1+Math.floor(Math.random()*3);renderBoot();}
function closeBoot(){
  const bm=$("#bootMask"); if(bm){ bm.style.display="none"; bm.classList.add("done"); }
  // 记录已关闭开屏，下次打开直接进入首页
  try{ state.meta.bootDone=true; save(); }catch(e){}
  // 关闭开屏后恢复上次视图，而不是强制回首页；但如果正在主动导航（点底部 tab 等）则不覆盖
  setTimeout(function(){ try{ if(!window._navigating)restoreLastView(); }catch(e){} },0);
  setTimeout(function(){
    try{
      if(!state.meta.tourDone){ showTour(0); return; }
      if(!state.meta.nickname){ showNicknameSetup(); }
      else { showMorning(); checkStreakCelebrate(); aiEveningSummary(); }
    }catch(e){console.warn('体验优化触发失败',e);}
  },500);
}
function showTour(step){
  step=step||0;
  const pages=[
    {ic:icon('sparkle',32),t:"欢迎来到笑笑养成记工作台",b:"这里收纳你备考、变美、知识沉淀的一切。所有数据只存在你本机，不上传、不泄露。"},
    {ic:icon('download',32),t:"看见好东西，先「投喂」",b:"每个栏目底部都有投喂记录区：粘贴 B站/小红书链接或文字，先扔进来收藏，周末一起消化成知识卡片。"},
    {ic:icon('check',32),t:"每天勾勾打卡就行",b:"首页点栏目 → 勾选今日任务。坚持会累积连续打卡天数，milestone 到了会有惊喜。"}
  ];
  const p=pages[Math.min(step,pages.length-1)];
  const last=step>=pages.length-1;
  let html='<div class="greet-card"><div class="gd" style="font-size:32px">'+p.ic+'</div>'+
    '<div class="gbig">'+esc(p.t)+'</div>'+
    '<div class="mini-note" style="text-align:left;line-height:1.7">'+esc(p.b)+'</div>'+
    '<div class="tour-dots">'+(pages.map(function(_,i){return '<span class="td'+(i===step?' on':'')+'"></span>';}).join(''))+'</div>'+
    '<div class="modal-ops"><button class="cancel" onclick="closeModal();state.meta.tourDone=true;save();">跳过</button>'+
    '<button class="save" onclick="'+(last?('closeModal();state.meta.tourDone=true;save();showMorning();'):('showTour('+(step+1)+')'))+'">'+(last?'开始使用'+icon("sparkle",14)+'':'下一步 ›')+'</button></div></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
}

/* ============ 导航（一级 + 二级分组） ============ */
function openDrawer(){
  try{ toggleQuickActions(); }catch(e){}
}
function closeDrawer(){
  try{ closeQuickActions(); }catch(e){}
}
function drawerTitleOf(id){
  if(id==="knowledge")return "知识库 📚";
  if(id==="home")return "首页";
  if(id==="decor")return "美化设置 🎨";
  if(id==="videos")return "视频汇总";
  if(id==="music")return "清音听雨阁";
  if(id==="feedbox")return "全部投喂";
  if(id==="bili")return "B站播放";
  if(id==="studyclub")return "知识研习";
  if(id==="calendar")return "养成日历";
  const d=MODULE_DEFS[id];return d?d.title:id;
}
function renderDrawer(){
  // 侧边栏（drawer）已在 Part 3 移除；保留空实现兼容各处调用点
  return;
}
let currentView="home";
let lastModuleId=null; // 最近一次进入的栏目 id，供 refreshCurrentView 等回退使用
/* 最后视图单独持久化（独立 key），避免 state 整体过大导致 setItem 失败时连 lastView 也存不上 */
const LV_KEY="ju_lastview_v1";
function saveLastView(){
  try{
    const lv={view:currentView};
    if(currentView==="module"){
      const v=$("#view-module");
      lv.module=v?v.getAttribute("data-curmod")||null:null;
    }
    state.meta.lastView=lv;
    // 冗余：单独写一个小 key，最不容易受存储配额影响
    try{ localStorage.setItem(LV_KEY,JSON.stringify(lv)); }catch(e){}
    try{ save(true); }catch(e){} // 静默保存 state，失败也不影响 lastView 的独立 key
  }catch(e){}
}
function restoreLastView(){
  try{
    let lv=state.meta.lastView;
    // 优先从独立 key 读（更可靠）
    try{
      const raw=localStorage.getItem(LV_KEY);
      if(raw){ const d=JSON.parse(raw); if(d&&d.view) lv=d; }
    }catch(e){}
    if(!lv || !lv.view || lv.view==="home"){ showHome(); return; }
    if(lv.view==="profile"){ showProfile(); return; }
    if(lv.view==="module" && lv.module && MODULE_DEFS[lv.module]){ showModule(lv.module); return; }
    if(lv.view==="bili"){ showBili(); return; }
    if(lv.view==="music"){ showMusic(); return; }
    if(lv.view==="calendar"){ showCalendar(); return; }
    if(lv.view==="knowledge"){ showKnowledge(); return; }
    if(lv.view==="video"){ showVideoHub(); return; }
    showHome();
  }catch(e){ showHome(); }
}
function showHome(){window._navigating=true;try{ closeBoot(); closeModal(); }catch(e){} clearViewTimers(); state.meta.tourDone=true; currentView="home";saveLastView();document.body.classList.remove("layout-edit");haptic(8);$("#view-module").classList.remove("active");$("#view-profile").classList.remove("active");try{$("#view-allcols").classList.remove("active");}catch(e){}$("#view-home").classList.add("active");const tb=$("#topbar");if(tb)tb.classList.add("large");$("#topTitle").innerHTML="笑笑养成记";try{var av=$("#view-home");if(av)av.scrollTop=0;}catch(e){}renderHome();renderDrawer();renderBotTab();playViewIn($("#view-home"),"back");}
/* 刷新当前所在视图（导入备份/恢复后调用，避免停留在旧内容） */
/**
 * 刷新当前正在查看的视图（导入备份/恢复后调用），避免停留在旧内容。
 * 依据 currentView 决定重渲染首页 / 栏目 / 美化 / 个人页。
 */
function refreshCurrentView(){
  try{
    if(currentView==="profile"){ renderProfile(); return; }
    if(currentView==="module"){ const id=(document.querySelector(".view.active")&&document.querySelector(".view.active").dataset&&document.querySelector(".view.active").dataset.module)||lastModuleId; if(id){ renderModule(id); return; } }
    if(currentView==="decor"){ renderDecor(); return; }
    renderHome();
  }catch(e){ try{ renderHome(); }catch(e2){} }
}
function renderBotTab(){
  const tab=document.getElementById("botTab");if(!tab)return;
  const moreOpen=!!(document.getElementById("quickActionsSheet")&&document.getElementById("quickActionsSheet").classList.contains("show"));
  tab.querySelectorAll(".bt-item").forEach(function(b){
    const v=b.getAttribute("data-v");
    let on=false;
    if(v==="home")on=(currentView==="home");
    else if(v==="more")on=moreOpen||currentView==="allcols"||!!document.querySelector(".allcols-card");
    else if(v==="profile")on=(currentView==="profile");
    else if(TAB_GROUPS[v])on=TAB_GROUPS[v].indexOf(currentView)>=0;
    b.classList.toggle("active",!!on);
    // #14 弹性切换：active 由假变真时打标记触发一次弹跳动画（重复渲染同一 tab 不重播）
    if(on){
      if(b.getAttribute("data-was-on")!=="1"){
        b.classList.remove("just-switched");
        void b.offsetWidth;                 // 强制回流，保证动画能重头播
        b.classList.add("just-switched");
      }
    }else{
      b.classList.remove("just-switched");
    }
    b.setAttribute("data-was-on",on?"1":"0");
    // 新用户引导脉冲：首次使用时高亮「学习」入口
    const isNew=(state.meta.usageDays||[]).length<=1;
    b.classList.toggle("pulse",isNew&&v==="study");
  });
  // mini-player 显示时上移避让（position:fixed 元素 offsetParent 恒为 null，改用计算样式判定可见性）
  const mp=document.querySelector(".mini-player");
  let mpOn=false;
  if(mp){ try{ mpOn=getComputedStyle(mp).display!=="none"; }catch(e){ mpOn=mp.style.display!=="none"; } }
  tab.classList.toggle("shift",mpOn);
  try{ document.body.classList.toggle("mp-on",mpOn); }catch(e){}
  syncMiniPlayerSpace();
  // #5 底部 Tab 滑动指示条：移动到当前激活项中心
  try{
    let ind=tab.querySelector(".bt-indicator");
    if(!ind){ ind=document.createElement("div"); ind.className="bt-indicator"; tab.appendChild(ind); }
    const active=tab.querySelector(".bt-item.active");
    if(active){
      const tr=tab.getBoundingClientRect(), ar=active.getBoundingClientRect();
      const x=ar.left-tr.left+ar.width/2-12; // 12 = 半宽
      ind.style.transform="translateX("+x+"px)";
      ind.style.opacity="1";
    } else { ind.style.opacity="0"; }
  }catch(e){}
}
function playPageIn(el){if(!el)return;el.classList.remove("page-in");void el.offsetWidth;el.classList.add("page-in");}
/* A-3 卡片式方向滑动：dir="in"=从右推入（进模块），dir="back"=从左回退（回首页） */
function playViewIn(el,dir){if(!el)return;const cls=dir==="back"?"anim-back":"anim-in";el.classList.remove("anim-in","anim-back");void el.offsetWidth;el.classList.add(cls);}
/* A-4 触感反馈：轻量震动，失败静默；尊重系统「减少动态效果」偏好 */
function haptic(ms){try{ if(!motionOK())return; if(navigator.vibrate)navigator.vibrate(ms||8);}catch(e){}}
/* 分级触感：为核心操作提供可辨识的震动节奏，形成肌肉记忆 */
function hapticPattern(type){ try{ if(!motionOK())return; if(!navigator.vibrate)return;
  const PAT={ tap:[12], double:[12,46,12], affirm:[10,34,10], heavy:[34] };
  const p=PAT[type]||[10]; navigator.vibrate(p);
}catch(e){} }
/* 动效是否允许：系统偏好 OR 应用级「减弱动效」任一开启即降级（震动 / 高频动画共用） */
function motionOK(){try{ if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return false; if(state.meta&&state.meta.toggles&&state.meta.toggles.reducedMotion)return false; }catch(e){} return true;}
/* 音频氛围是否静默随机鸟鸣/咖啡声：减弱动效时一并静音（基础白噪仍保留） */
function audioQuiet(){try{ if(state.meta&&state.meta.toggles&&state.meta.toggles.reducedMotion)return true; }catch(e){} return false;}
