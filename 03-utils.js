/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 03/18
   文件：js/03-utils.js
   来源：原 index.html 第 17301–18231 行
   内容：工具函数 + 操作历史撤销栈 + 语音输入 + 图片外置存储 + 封面调整编辑器
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ============ 工具 ============ */
function $(s){return document.querySelector(s);}
function toast(msg){msg=String(msg==null?"":msg);const t=$("#toast");if(!t)return;
  /* 无障碍：toast 是动态插入的内容，读屏软件默认不会播报。
     这里标记为 status + polite（礼貌播报，不打断用户当前操作），atomic 保证整句一次念完。 */
  try{ if(!t.hasAttribute("role"))t.setAttribute("role","status"); if(!t.hasAttribute("aria-live"))t.setAttribute("aria-live","polite"); t.setAttribute("aria-atomic","true"); }catch(e){}
if(toast._last===msg&&Date.now()-toast._lt<800)return;toast._last=msg;toast._lt=Date.now();
  // 上一条若带动作按钮，先收掉它（按钮会占着 DOM，且 pointer-events 需复位）
  try{ if(typeof t._act==="function"){ t._act(); } }catch(e){}
  t._act=null;t.classList.remove("act");
  t.textContent=msg;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),1800);}
/* #21 带按钮的 toast。用于「撤销」这类需要用户当场反应的动作；
   普通 toast 只显示文本，这里额外挂一个可点按钮。文本与按钮都用 textContent 写入，不走 innerHTML。 */
function toastAction(msg,btnLabel,onAction,ms){
  try{
    const t=$("#toast"); if(!t) return;
    ms=ms||6000;
    let used=false;
    const close=function(){ used=true; clearTimeout(t._t); t.classList.remove("show","act"); if(t._act===close) t._act=null; };
    try{ if(typeof t._act==="function"){ t._act(); } }catch(e){}
    clearTimeout(t._t);
    t.textContent="";
    const span=document.createElement("span");
    span.textContent=String(msg==null?"":msg);
    const btn=document.createElement("button");
    btn.type="button"; btn.className="toast-act"; btn.textContent=String(btnLabel||"撤销");
    btn.setAttribute("aria-label",String(btnLabel||"撤销"));
    btn.addEventListener("click",function(){
      if(used) return;
      close();
      try{ if(typeof onAction==="function") onAction(); }catch(e){ console.warn("toast 动作执行失败",e); }
    });
    /* 关闭按钮：带动作的 toast 一停就是好几秒，只给一个「立即备份」这种正向按钮，
       不想执行的人就只能干等它自己消失。给个 ✕ 让用户能当场把它划走。 */
    const x=document.createElement("button");
    x.type="button"; x.className="toast-x"; x.textContent="✕";
    x.setAttribute("aria-label","关闭提示");
    x.addEventListener("click",function(){ if(!used) close(); });
    t.appendChild(span); t.appendChild(btn); t.appendChild(x);
    t.classList.add("show","act");
    t._act=close;
    toast._last=null; // 别让普通 toast 的 800ms 去重逻辑吃掉紧随其后的提示
    t._t=setTimeout(close,ms);
  }catch(e){ try{ toast(String(msg==null?"":msg)); }catch(e2){} }
}
/* ===== 操作历史 / 撤销栈 =====
   undoableDelete 已经解决了「刚刚手滑」；但那条撤销 toast 只活 6 秒，
   切个栏目、接个电话回来就没机会了。这里把每次可撤销操作连同它的恢复函数
   压进一个内存栈（最多 12 层），在「操作历史」面板里随时能翻回去。
   恢复函数是闭包、无法序列化，所以它只活在本次会话——关掉 App 就清空，
   这也是有意的：跨会话恢复一份陈旧快照，反而更容易把新数据冲掉。 */
const _undoStack=[];
const UNDO_MAX=12;
function undoPush(label,doRestore,detail){
  try{
    if(typeof doRestore!=="function") return null;
    _undoStack.unshift({label:String(label||"操作"),detail:detail||"",at:Date.now(),restore:doRestore,used:false});
    if(_undoStack.length>UNDO_MAX) _undoStack.length=UNDO_MAX;
    return _undoStack[0];
  }catch(e){ return null; }
}
/* 恢复第 idx 步（0 = 最近一次）。已用过的步骤不能重复恢复。 */
function undoStep(idx){
  try{
    const it=_undoStack[idx];
    if(!it) { toast("⚠️ 没有这一步了"); return false; }
    if(it.used){ toast("这一步已经恢复过了"); return false; }
    it.used=true;
    it.restore();
    it.undoneAt=Date.now();
    toast("↩️ 已恢复："+it.label);
    return true;
  }catch(e){ console.warn("恢复失败",e); toast("⚠️ 恢复失败"); return false; }
}
function undoAgo(ts){
  try{
    const s=Math.floor((Date.now()-ts)/1000);
    if(s<60) return "刚刚";
    if(s<3600) return Math.floor(s/60)+" 分钟前";
    const d=new Date(ts);
    const p=function(n){return String(n).padStart(2,"0");};
    const today=new Date(); today.setHours(0,0,0,0);
    if(d>=today) return "今天 "+p(d.getHours())+":"+p(d.getMinutes());
    return (d.getMonth()+1)+"月"+d.getDate()+"日 "+p(d.getHours())+":"+p(d.getMinutes());
  }catch(e){ return ""; }
}
function showUndoHistory(){
  try{
    let rows;
    if(!_undoStack.length){
      rows='<div class="mini-note">最近没有可撤销的操作。删除记录、卡片、投喂之后，这里会出现「撤销」入口。</div>';
    }else{
      rows=_undoStack.map(function(it,i){
        const can=!it.used;
        const dot=can?'<span class="mig-dot"></span>':'<span class="mig-dot ok"></span>';
        return '<div class="mig-row">'+dot+'<div class="mig-tx">'+
          '<div class="mig-step">🗑 删除 '+esc(it.label)+(it.detail?' <span class="mig-tag">'+esc(it.detail)+'</span>':'')+'</div>'+
          '<div class="mig-meta">'+esc(undoAgo(it.at))+(it.used?' · 已恢复':'')+'</div>'+
          (can?'<div class="mig-actions"><button class="btn-ghost" onclick="closeModal();undoStep('+i+')">恢复</button></div>':
              '<div class="mig-actions"><span class="mig-tag">已完成</span></div>')+
          '</div></div>';
      }).join("");
    }
    openModalBox('<h3>↩️ 操作历史</h3>'+
      '<div class="mini-note">最近 '+_undoStack.length+' 步可撤销操作（本次会话内有效，最多保留 '+UNDO_MAX+' 步）。</div>'+
      '<div class="mig-list">'+rows+'</div>'+
      '<div class="modal-ops"><button class="save" onclick="closeModal()">关闭</button></div>');
  }catch(e){ toast("⚠️ 无法打开操作历史"); }
}
/* ===== 语音输入（Web Speech API）=====
   国内 ROM 自带的多数 WebView 没有语音识别服务，所以这里是「能用才出现」：
   检测不到 SpeechRecognition 就一个字都不渲染，绝不摆一个点了毫无反应的图标。
   识别结果直接追加到目标输入框，并派发 input 事件，让字数统计之类照常工作。 */
function voiceSupported(){
  // 有些 ROM 的 WebView 里构造函数存在、但背后没有识别服务，
  // 于是 button 显示出来、一点就报错。首次硬失败后记住，之后干脆不再显示。
  try{ if(window._voiceBroken) return false; }catch(e){}
  try{ return !!(window.SpeechRecognition||window.webkitSpeechRecognition); }catch(e){ return false; }
}
function voiceBtnHtml(targetId){
  if(!voiceSupported()) return "";
  return '<button type="button" class="voice-btn" id="vb_'+targetId+'" onclick="startVoiceInput(\''+targetId+'\')" title="语音输入" aria-label="语音输入">'+
    '<svg class="svg-ic" viewBox="0 0 24 24" width="14" height="14"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg><span>语音</span></button>';
}
function startVoiceInput(targetId){
  try{
    const el=document.getElementById(targetId);
    if(!el){ toast("⚠️ 找不到输入框"); return; }
    if(!voiceSupported()){ toast("⚠️ 当前环境不支持语音输入"); return; }
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    let rec;
    try{ rec=new SR(); }catch(e){ toast("⚠️ 无法启动语音识别"); return; }
    const btn=document.getElementById("vb_"+targetId);
    rec.lang="zh-CN"; rec.interimResults=true; rec.continuous=false; rec.maxAlternatives=1;
    let base=String(el.value||"");
    if(base && !/[\s，。；！？、]$/.test(base)) base+=" ";
    let finalTxt="";
    const setUI=function(on,txt){
      if(!btn) return;
      try{ btn.classList.toggle("rec",!!on); }catch(e){}
      const sp=btn.querySelector("span"); if(sp) sp.textContent=on?(txt||"聆听中"):"语音";
    };
    rec.onresult=function(ev){
      let interim="";
      for(let i=ev.resultIndex;i<ev.results.length;i++){
        const r=ev.results[i];
        if(r&&r[0]){ if(r.isFinal) finalTxt+=r[0].transcript; else interim+=r[0].transcript; }
      }
      el.value=base+finalTxt+interim;
      setUI(true, interim?"聆听中…":"识别中");
      try{ el.dispatchEvent(new Event("input",{bubbles:true})); }catch(e){}
    };
    rec.onerror=function(ev){
      setUI(false);
      const e=(ev&&ev.error)||"";
      if(e==="not-allowed"||e==="service-not-allowed"||e==="network"){
        // 构造函数在但服务不可用：这次之后就别再显示了，免得一直失望
        try{ window._voiceBroken=true; }catch(e2){}
        try{ if(btn) btn.remove(); }catch(e2){}
        toast(e==="network"?"⚠️ 语音识别需要联网，已收起这个按钮":"⚠️ 这台设备用不了语音输入，已收起这个按钮");
      }
      else if(e==="no-speech") toast("没有听到声音，再靠近点说一次？");
      else toast("⚠️ 语音识别失败"+(e?("（"+e+"）"):""));
    };
    rec.onend=function(){ setUI(false); };
    try{ rec.start(); setUI(true,"聆听中…"); toast("🎤 请说话…"); }
    catch(e){ setUI(false); toast("⚠️ 无法启动语音识别"); }
  }catch(e){ toast("⚠️ 语音输入异常"); }
}
/* 删除统一走「先删 + 可撤销」，而不是「再确认一遍」——少一次打断，且误删可挽回。
   doDelete / doRestore 各自负责 save() 与重渲染；返回 false 表示没删成（例如条目已不存在）。 */
function undoableDelete(label,doDelete,doRestore,opt){
  opt=opt||{};
  let ok=false;
  try{ ok=!!doDelete(); }catch(e){ console.warn("删除失败",e); toast("⚠️ 删除失败"); return false; }
  if(!ok) return false;
  let used=false;
  // 压进历史栈：toast 撤销之外多留一条后路
  const rec=undoPush(label,doRestore,opt.detail);
  const restore=function(){
    if(used) return; used=true;
    if(rec) rec.used=true;
    try{ doRestore(); toast("↩️ 已恢复"); }catch(e){ console.warn("恢复失败",e); toast("⚠️ 恢复失败"); }
  };
  if(rec) rec.restore=restore;      // 历史面板走同一条路径，避免重复恢复
  toastAction("🗑 已删除"+label,"撤销",restore,opt.ms||6000);
  return true;
}
/* 静默失败治理：把「只有 console.warn」的关键失败升级为用户可见提示。
   同一 key 在 cooldownMs（默认 60s）内只提示一次，避免刷屏。 */
const _failToastAt={};
function failToast(key,msg,cooldownMs){
  try{
    cooldownMs=cooldownMs||60000;
    const now=Date.now();
    if(_failToastAt[key]&&(now-_failToastAt[key])<cooldownMs) return;
    _failToastAt[key]=now;
    toast(msg);
  }catch(e){}
}
/* 桌面通知：带权限降级（不支持/未授权则回退为 toast） */
function notifyNotify(title,body){
  try{
    if(state.meta.notifyOn===false) return false;
    if(!("Notification" in window)){ return false; }
    if(Notification.permission==="granted"){ try{ new Notification(title,{body:body||""}); return true; }catch(e){ return false; } }
    return false;
  }catch(e){ return false; }
}
function notify(title,body){ if(!notifyNotify(title,body)){ toast("🔔 "+title+(body?("："+body):"")); } }
function onNotifyToggle(on){ state.meta.notifyOn=!!on; save(); if(on){ requestNotifyPerm(); } else { toast("🔕 已关闭桌面提醒（仍用应用内提示）"); } }
function requestNotifyPerm(){
  try{
    if(!("Notification" in window)){ toast("📱 当前浏览器不支持桌面通知，已用应用内提示替代"); return; }
    if(Notification.permission==="granted"){ toast("✅ 桌面通知已开启"); return; }
    if(Notification.permission==="denied"){ toast("⚠️ 通知权限已被系统拒绝，请在浏览器设置里开启"); return; }
    Notification.requestPermission().then(function(p){ toast(p==="granted"?"✅ 桌面通知已开启，到点会提醒你":"提醒已关闭，将使用应用内提示"); }).catch(function(){ toast("提醒已关闭，将使用应用内提示"); });
  }catch(e){ toast("提醒设置不可用，将使用应用内提示"); }
}
/* 番茄钟提示音：用 WebAudio 生成短促「叮咚」，零外部音频依赖 */
function beep(kind){
  try{
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    const ctx=new AC();
    const now=ctx.currentTime;
    const seq=(kind==="done")?[[880,0,0.12],[1320,0.14,0.18]]:[[660,0,0.1]];
    seq.forEach(function(s){
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type="sine"; o.frequency.value=s[0];
      o.connect(g); g.connect(ctx.destination);
      const st=now+s[1]; g.gain.setValueAtTime(0.0001,st); g.gain.exponentialRampToValueAtTime(0.25,st+0.02); g.gain.exponentialRampToValueAtTime(0.0001,st+s[2]);
      o.start(st); o.stop(st+s[2]+0.02);
    });
    setTimeout(function(){ try{ctx.close();}catch(e){} },700);
  }catch(e){}
}
function copyText(t){t=String(t==null?"":t);if(!t.trim()){toast("⚠️ 没有可复制的内容");return;}try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){toast("📋 已复制");},function(){fallbackCopy(t);});}else fallbackCopy(t);}catch(e){fallbackCopy(t);}}
function fallbackCopy(t){try{const ta=document.createElement("textarea");ta.value=t;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();toast("📋 已复制");}catch(e){toast("⚠️ 复制失败");}}
function showInstallHint(){
  const bar=document.getElementById("installHint");if(!bar)return;
  const until=state.meta.installDismissUntil;
  if(until && new Date(until) > new Date())return;
  bar.style.display="flex";
  try{ syncBottomStack(); }catch(e){}      // 多了一层，toast 要相应上移
}
function hideInstallHint(){const bar=document.getElementById("installHint");if(bar)bar.style.display="none";try{ syncBottomStack(); }catch(e){}}
function installApp(){const p=window._deferredPrompt;if(!p){toast("💡 可点浏览器菜单「添加到主屏幕」");return;}p.prompt();p.userChoice.then(function(){});window._deferredPrompt=null;hideInstallHint();}
function dismissInstall(){
  const d=new Date(); d.setDate(d.getDate()+7);
  state.meta.installDismissUntil=d.toISOString();
  try{ save(); }catch(e){}
  hideInstallHint();
}
function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}
/* 转义到「内联事件属性里的单引号 JS 字符串」上下文（XSS 关键修复）
   esc() 只处理 & < > "，不处理单引号；而本项目大量使用 onclick="fn('...')" 结构，
   只过 esc() 时，' 会提前闭合 JS 字符串 → 可注入任意脚本。
   顺序：反斜杠 → 单引号 → HTML 实体 → 换行（换行会截断 JS 字符串字面量）。 */
function escJs(s){
  return (s==null?"":String(s))
    .replace(/\\/g,"\\\\")
    .replace(/'/g,"\\'")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/\r/g,"")
    .replace(/\n/g,"\\n");
}
/* URL 协议白名单：阻断 javascript: / vbscript: / file: / 非图片 data: */
function sanitizeUrl(u,allowDataImage){
  try{
    var v=String(u==null?"":u).trim();
    if(!v)return "";
    v=v.replace(/[\u0000-\u001F\u007F-\u009F]/g,"");   // 去控制字符，防 java\x00script: 绕过
    var low=v.toLowerCase().replace(/\s+/g,"");
    if(/^(javascript|vbscript|file|blob):/.test(low))return "";
    if(/^data:/i.test(low)){ return (allowDataImage&&/^data:image\//i.test(low))?v:""; }
    return v;
  }catch(e){ return ""; }
}
/* 文本消毒：剥离脚本类标签与事件属性。
   用于「不可信来源」文本：导入的备份文件 / 远端抓取的网页元数据 / AI 返回内容。 */
function sanitizeText(s){
  try{
    var v=String(s==null?"":s);
    if(!v)return "";
    v=v.replace(/<\s*(script|iframe|object|embed|link|style|meta|base|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,"");
    v=v.replace(/<\s*(script|iframe|object|embed|link|style|meta|base|form)\b[\s\S]*?>/gi,"");
    v=v.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,"");
    v=v.replace(/\s(?:href|src)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,function(m0){
      var val=m0.slice(m0.indexOf("=")+1).replace(/^["'\s]+|["']+$/g,"");
      return m0.slice(0,m0.indexOf("=")+1)+'"'+sanitizeUrl(val,true)+'"';
    });
    v=v.replace(/javascript\s*:/gi,"");
    return v;
  }catch(e){ return String(s==null?"":s); }
}
/* 深度消毒：递归清洗导入/远端数据里的所有字符串（就地修改并返回）*/
/* 标签数组消毒：限长、限量、去脚本，防止标签字段被塞入结构化攻击串 */
function sanitizeTags(t){
  try{
    if(!t)return [];
    if(typeof t==="string")t=t.split(/[,，;；\s]+/);
    if(!Array.isArray(t))return [];
    return t.map(function(x){ return sanitizeText(x).slice(0,24); }).filter(Boolean).slice(0,12);
  }catch(e){ return []; }
}
function sanitizeDeep(v,depth){
  depth=depth||0;
  if(depth>8||v==null)return v;
  try{
    if(typeof v==="string")return sanitizeText(v);
    if(typeof v!=="object")return v;
    if(Object.prototype.toString.call(v)==="[object Array]"){
      for(var i=0;i<v.length;i++) v[i]=sanitizeDeep(v[i],depth+1);
      return v;
    }
    for(var k in v){ if(Object.prototype.hasOwnProperty.call(v,k)) v[k]=sanitizeDeep(v[k],depth+1); }
    return v;
  }catch(e){ return v; }
}

function daysBetween(a,b){const d1=new Date(a+"T00:00:00");const d2=new Date(b+"T00:00:00");return Math.round((d2-d1)/86400000);}

function pickImage(path,cb,opts){
  opts=opts||{};
  const inp=document.createElement("input");inp.type="file";inp.accept="image/*";
  inp.onchange=()=>{const f=inp.files[0];if(!f)return;
    compressImage(f,(data,err)=>{
      if(err){toast(err);return;}
      writeImage(path,data);cb&&cb();
    },opts);
  };
  inp.click();
}
function setPath(path,val){
  const parts=path.split(".");let o=state;
  for(let i=0;i<parts.length-1;i++)o=o[parts[i]];
  o[parts[parts.length-1]]=val;
}
function getPath(path){const parts=path.split(".");let o=state;for(const p of parts){if(o==null)return null;o=o[p];}return o;}
/* ============ 图片外置存储（IndexedDB，避免 localStorage 配额溢出） ============
   state.meta.heroImage / decorBg / images.* 现在只保存轻量引用 id（形如 "idb:hero"），
   真正的 Base64 数据存放进 IndexedDB；渲染时通过 imgCache 同步取回。
   兼容旧备份：若字段仍是原始 data: URL，则按原样使用，并首次写入时自动迁移到 IDB。 */
const IMG_DB="ju_workbench_img";
let imgDB=null, imgCache={};
function imgDBOpen(){return new Promise(function(res,rej){ if(imgDB){res(imgDB);return;} if(!window.indexedDB){res(null);return;} try{ var rq=indexedDB.open(IMG_DB,1); rq.onupgradeneeded=function(){var db=rq.result;if(!db.objectStoreNames.contains("blobs"))db.createObjectStore("blobs",{keyPath:"id"});}; rq.onsuccess=function(){imgDB=rq.result;res(imgDB);}; rq.onerror=function(){rej(rq.error);}; }catch(e){ res(null);} });}
// #2 IndexedDB 写入增加重试与失败提示
function imgDBPut(id,data){
  return new Promise(function(res,rej){
    var attempt=0;
    function giveUp(e){
      // 三次重试仍失败：不再静默，明确告知用户（多半是本机存储不可用或空间不足）
      console.warn("[存储] 图片写入 IndexedDB 失败", e||"");
      // 降级：暂存内存数组，当前会话仍可显示；存储恢复后由 retryPendingWrites() 自动重放
      try{
        if(!window._pendingWrites) window._pendingWrites=[];
        window._pendingWrites.push({store:"blobs",id:id,data:data});
      }catch(_e){}
      failToast("idbImg","⚠️ 图片保存到本机失败，可能是存储空间不足或浏览器限制了本地数据库；已暂存内存，请及时导出备份");
    }
    function tryOnce(){
      attempt++;
      imgDBOpen().then(function(db){
        if(!db){ if(attempt<3){ setTimeout(tryOnce,300*attempt); return; } giveUp("no db"); res(); return; }
        try{
          var rq=db.transaction("blobs","readwrite").objectStore("blobs").put({id:id,data:data});
          rq.onsuccess=function(){ res(); };
          rq.onerror=function(){ if(attempt<3){ setTimeout(tryOnce,300*attempt); return; } giveUp(rq.error); rej(rq.error); };
        }catch(e){ if(attempt<3){ setTimeout(tryOnce,300*attempt); return; } giveUp(e); res(); }
      }).catch(function(e){ if(attempt<3){ setTimeout(tryOnce,300*attempt); return; } giveUp(e); res(); });
    }
    tryOnce();
  });
}
function imgDBGet(id){return new Promise(function(res,rej){ imgDBOpen().then(function(db){ if(!db){res(null);return;} try{ var rq=db.transaction("blobs","readonly").objectStore("blobs").get(id); rq.onsuccess=function(){res((rq.result&&rq.result.data)||null);}; rq.onerror=function(){rej(rq.error);}; }catch(e){res(null);} }); });}
/* IndexedDB 写入失败时，数据会暂存进 window._pendingWrites（当前会话仍可用，关页会丢）。
   这里在存储恢复后尝试重放，避免「一次暂时性失败」变成永久丢失：
   成功的条目从队列移除，失败的留在队列等下次机会。返回成功重放的条数。 */
function retryPendingWrites(){
  var q=window._pendingWrites;
  if(!q||!q.length) return Promise.resolve(0);
  var rest=[],done=0;
  return Promise.all(q.map(function(it){
    var p;
    try{
      if(it.store==="tracks"){ p=(typeof dbPut==="function")?dbPut(it.data):Promise.reject(new Error("no writer")); }
      else { p=(typeof imgDBPut==="function")?imgDBPut(it.id,it.data):Promise.reject(new Error("no writer")); }
    }catch(e){ p=Promise.reject(e); }
    return p.then(function(){ done++; }, function(){ rest.push(it); });
  })).then(function(){
    window._pendingWrites=rest;
    if(done>0){ try{ toast("✅ 已补存 "+done+" 条此前写入失败的数据"); }catch(e){} }
    return done;
  });
}
/* IndexedDB 不可用 / 写满时的兜底（#6）：小图（估算 <55KB）直接把 data URL 内联进 state，
   虽然占 localStorage，但至少图片不丢、不依赖外部库。大图仍提示清理，避免瞬间撑爆配额。 */
/* 内联阈值分级：背景图是「整站底图」，丢失代价最大，单独放宽；
   其余封面图维持小阈值，避免多张累积把 localStorage 顶爆。 */
const IMG_INLINE_LIMIT_BG=1200000;   // 背景图：约 900KB 图片。放宽阈值，确保真机大照片压缩后也能内联进 localStorage（不依赖 IndexedDB，后者在 PWA/file:///隐私模式下常不可用）
const IMG_INLINE_LIMIT_OTHER=60000; // 其他：约 45KB
function imgInlineLimit(id){ return (id==="idb:decorBg"||id==="idb:hero")?IMG_INLINE_LIMIT_BG:IMG_INLINE_LIMIT_OTHER; }
function imgInlineFallback(id,data){
  try{
    state.meta=state.meta||{};
    var fb=state.meta._imgFallback||{};
    var est=(data||"").length; // data URL 长度近似原始体积
    if(est>imgInlineLimit(id)){ // 超过该类型上限就不再内联
      state.meta._imgFallback=fb; return false;
    }
    fb[id]=data; state.meta._imgFallback=fb; save(); return true;
  }catch(e){ return false; }
}
function imgInlineGet(id){
  try{ var fb=(state.meta&&state.meta._imgFallback)||{}; return fb[id]||null; }catch(e){ return null; }
}
function imgInlineDel(id){ try{ var fb=(state.meta&&state.meta._imgFallback)||{}; if(fb[id]){delete fb[id]; save();} }catch(e){} }
function imgDBDel(id){return new Promise(function(res){ imgDBOpen().then(function(db){ if(!db){res();return;} try{ var rq=db.transaction("blobs","readwrite").objectStore("blobs").delete(id); rq.onsuccess=function(){res();}; rq.onerror=function(){res();}; }catch(e){res();} }); });}
/* 由字段路径推导 IDB 键 */
function imgIdOf(field){ if(field==="meta.heroImage")return "idb:hero"; if(field==="meta.decorBg")return "idb:decorBg"; var m=/^meta\.images\.(.+)$/.exec(field); if(m)return "idb:img:"+m[1]; return "idb:"+field; }
/**
 * 写入一张图片：真实 Base64 存进 IndexedDB，state 中只保留轻量引用 id（避免 localStorage 配额溢出）。
 * @param {string} field 字段路径，如 "meta.heroImage" / "meta.images.knowledge"
 * @param {string|null} data 图片 data URL；传 null 表示清空
 */
function writeImage(field,data){
  if(!data){ // 清空
    var id=imgIdOf(field); delete imgCache[id]; try{imgDBDel(id);}catch(e){} imgInlineDel(id); setPath(field,null); save(); return;
  }
  var id=imgIdOf(field); imgCache[id]=data; setPath(field,id);
  save();
  try{
    imgDBPut(id,data).catch(function(e){
      // IndexedDB 写入失败：先尝试小图内联兜底，再不行才提示清理
      if(imgInlineFallback(id,data)){ toast("⚠️ 本机数据库不可用，已用「内联」方式暂存这张小图（导出备份时记得一并带走）"); }
      else { failToast("idbImg","⚠️ 图片保存到本机失败，建议导出备份后清理部分配图"); }
    });
  }catch(e){ failToast("idbImg","⚠️ 图片保存失败："+(e&&e.message||"未知原因")); }
}
/**
 * 可靠写入（背景图 / 关键配图专用）：不再把生死交给 IndexedDB。
 * 策略：
 *  1) 先尝试压缩到「可内联」体积以内（迭代降质量 → 降尺寸）；
 *  2) 无论 IndexedDB 成功与否，都强制内联一份到 state（localStorage），保证重启后一定能读回；
 *  3) IDB 仍并行写入，作为大图主存（可用时读它更快、不占配额）。
 * 这样即使 APK WebView 的 IndexedDB 被禁用（file:// 下常见），背景图也不会丢。
 * @param {string} field 字段路径
 * @param {string} data 图片 data URL
 * @param {Function} done 回调(didInline:boolean)
 */
function writeImageReliable(field,data,done){
  done=done||function(){};
  var id=imgIdOf(field);
  var limit=imgInlineLimit(id);
  if((data||"").length<=limit){
    // 体积已达标：直接落盘
    imgCache[id]=data; setPath(field,id); save();
    imgInlineFallback(id,data);
    // IDB 写失败不致命（还有内联兜底）；但两条路都断时要说出来，别让图片悄悄丢
    try{ imgDBPut(id,data).catch(function(){
        if(!imgInlineGet(id)){ try{ toast("⚠️ 图片未能存入本机，重启后可能丢失"); }catch(e){} }
      }); }catch(e){}
    done(imgInlineGet(id)?true:false); return;
  }
  // 体积超标：迭代压缩到阈值内
  shrinkDataUrl(data,limit,function(shrunk){
    if(!shrunk){ // 压缩失败也要尽力内联原始图（哪怕略超阈值）
      imgCache[id]=data; setPath(field,id);
      /* 这里原来是「无论 save() 成功与否都 done(true)」——配额写满时 save() 抛错被吞，
         调用方以为成功，图片其实没落地。改成如实回传，并在失败时明确提示。 */
      var ok=false;
      try{ var fb=state.meta._imgFallback||{}; fb[id]=data; state.meta._imgFallback=fb; save(); ok=true; }catch(e){ ok=false; }
      if(!ok){ try{ toast("⚠️ 图片过大，本机空间不足，建议换一张小一些的图"); }catch(e){} }
      done(ok); return;
    }
    imgCache[id]=shrunk; setPath(field,id); save();
    imgInlineFallback(id,shrunk);
    try{ imgDBPut(id,shrunk).catch(function(){
        if(!imgInlineGet(id)){ try{ toast("⚠️ 图片未能存入本机，重启后可能丢失"); }catch(e){} }
      }); }catch(e){}
    done(imgInlineGet(id)?true:false);
  });
}
/* 把 data URL 迭代压缩到目标字符长度以内：先降 JPEG 质量，再降最大边长 */
function shrinkDataUrl(dataUrl,limit,cb){
  try{
    var img=new Image();
    img.onerror=function(){ cb(null); };
    img.onload=function(){
      try{
        var w0=img.width||1000, h0=img.height||1000;
        if(!w0||!h0){ cb(null); return; }
        // 尺寸阶梯与质量阶梯（由清晰到压缩）
        var sizes=[1200,1000,820,680,560,460,380];
        var quals=[0.72,0.62,0.55,0.48,0.42,0.38,0.34];
        var best=null;
        for(var i=0;i<sizes.length;i++){
          var m=sizes[i]/Math.max(w0,h0);
          var w=Math.round(w0*m), h=Math.round(h0*m);
          if(w<1||h<1) continue;
          var c=document.createElement("canvas"); c.width=w; c.height=h;
          c.getContext("2d").drawImage(img,0,0,w,h);
          for(var j=0;j<quals.length;j++){
            var out=c.toDataURL("image/jpeg",quals[j]);
            if(!out||out.length<64) continue;
            if(out.length<=limit){ cb(out); return; }   // 达标
            if(!best||out.length<best.length) best=out;  // 记录最小的一份兜底
          }
        }
        cb(best); // 无法达标则返回最小的一份
      }catch(e){ cb(null); }
    };
    img.src=dataUrl;
  }catch(e){ cb(null); }
}
/**
 * 读取图片：优先从内存缓存取回，其次兼容旧备份里的原始 data URL，最后返回 null。
 * @param {string} field 字段路径
 * @returns {string|null} 图片 data URL 或 null
 */
function readImage(field){
  var v=getPath(field); if(!v)return null;
  if(typeof v==="string"&&v.indexOf("idb:")===0){
    // 兜底：内存无命中时，同步返回 null 并异步回源 IndexedDB，下次渲染即可恢复，避免封面永久空白
    if(!imgCache[v]){
      var inline=imgInlineGet(v);
      if(inline){ imgCache[v]=inline; }
      else { imgDBGet(v).then(function(d){ if(d){ imgCache[v]=d; try{ applyUserStyle(); }catch(e){} try{ renderBoot(); }catch(e){} try{ rerenderCurrentView(); }catch(e){} } }).catch(function(){}); }
    }
    return imgCache[v]||null;
  }
  return v; // 兼容旧备份里的原始 data URL
}
/* 启动时把 state 中所有图片引用预热进缓存 */
function hydrateImages(){
  var ids=[]; ids.push("idb:hero"); ids.push("idb:decorBg");
  try{ var imgs=state.meta&&state.meta.images; for(var k in (imgs||{})) ids.push("idb:img:"+k); }catch(e){}
  var n=0;
  // 已在内存缓存里的不必再跑一次 IDB；返回「本次新预热到的张数」供首屏调度判断是否补刷
  return Promise.all(ids.map(function(id){
    if(imgCache[id]) return Promise.resolve();
    return imgDBGet(id).then(function(d){ if(d){ imgCache[id]=d; n++; } }).catch(function(){});
  })).then(function(){ return n; });
}
/* 按 id 渲染栏目内容：优先走专属渲染器（知识库/音乐/心情/日历/年报/看板），否则走通用面板渲染。
   统一入口，避免各处 if-else 遗漏导致「刷新后跳回通用页」。 */
function renderModuleAny(id){
  if(!id)return;
  try{
    const cap=id[0].toUpperCase()+id.slice(1);
    const f=window["render"+cap];
    if(typeof f==="function"){ f(); return; }
  }catch(e){}
  try{ renderModule(id); }catch(e){}
}
/* 重绘当前视图（图片异步到货 / 数据热更新后补刷用），不会影响导航状态与滚动意图 */
function rerenderCurrentView(){
  try{
    if(typeof currentView==="undefined"){ renderHome(); return; }
    if(currentView==="home"){ renderHome(); return; }
    if(currentView==="profile"){ renderProfile($("#view-profile")); return; }
    if(currentView==="decor"){ renderDecor(); return; }
    if(currentView==="module"){
      const v=$("#view-module");
      const id=(v&&v.getAttribute("data-curmod"))||lastModuleId;
      renderModuleAny(id); return;
    }
    renderHome();
  }catch(e){ console.warn("rerenderCurrentView 失败",e); }
}
/* 命中旧式原始 data URL 时，懒迁移到 IDB（下次保存即只留引用） */
function maybeMigrateImage(field){
  var v=getPath(field); if(typeof v==="string"&&v.indexOf("data:image")===0){ writeImage(field,v); }
}
/* 安全读取某栏目的分区数据：任何一级缺失都返回兜底值（默认 []），绝不抛错。
   用于在渲染/统计/搜索等只读场景替代直接 state.modules[id].panels[key] 访问。 */
function getPanelData(id,key,fallback){
  fallback = fallback===undefined ? [] : fallback;
  try{
    if(!id||!state.modules||!state.modules[id]) return fallback;
    const m=state.modules[id];
    if(!m.panels) return fallback;
    const v=m.panels[key];
    return (v===undefined||v===null)?fallback:v;
  }catch(e){ return fallback; }
}
/**
 * 向某栏目的分区数组追加一条记录（自动补 id / done 字段）。
 * @param {string} id    栏目 id
 * @param {string} key   分区 key
 * @param {Object} obj   记录对象（其余默认字段会被填充）
 * @returns {Object} 追加后的完整记录
 */
function addPanelItem(id,key,obj){
  const arr=getPanelData(id,key,null);
  if(arr===null){ state.modules[id].panels[key]=[]; }
  const rec=Object.assign({id:uid(),done:false,doneDate:null},obj||{});
  getPanelData(id,key,[]).push(rec);
  return rec;
}
/**
 * 按 id 更新某条记录的部分字段。
 * @param {string} id   栏目 id
 * @param {string} key  分区 key
 * @param {string} iid  记录 id
 * @param {Object} patch 需要合并的字段
 * @returns {Object|null} 更新后的记录，未找到返回 null
 */
function updatePanelItem(id,key,iid,patch){
  const arr=getPanelData(id,key,[]);
  const it=arr.find(function(x){return x.id===iid;});
  if(!it)return null;
  Object.assign(it,patch||{});
  return it;
}
/**
 * 按 id 删除某条记录。
 * @param {string} id   栏目 id
 * @param {string} key  分区 key
 * @param {string} iid  记录 id
 * @returns {boolean} 是否删除成功
 */
function removePanelItem(id,key,iid){
  const arr=getPanelData(id,key,[]);
  const before=arr.length;
  state.modules[id].panels[key]=arr.filter(function(x){return x.id!==iid;});
  return state.modules[id].panels[key].length<before;
}
function compressImage(file,cb,opts){
  opts=opts||{};
  const name=(file.name||"").toLowerCase();
  const type=(file.type||"").toLowerCase();
  const maxBytes=opts.maxBytes||(5*1024*1024);
  const okExt=/\.(jpe?g|png|gif|webp|bmp)$/.test(name);
  const okType=/^image\/(jpeg|png|gif|webp|bmp)/.test(type);
  if(!okExt && !okType){
    if(/\.heic|\.heif/.test(name)||type==="image/heic"||type==="image/heif")
      return cb(null,"⚠️ 图片格式不支持：iPhone 实况/HEIC 格式浏览器无法识别。请在相册中把该照片「导出为 JPG」或改用 JPEG/PNG 后重试。");
    return cb(null,"⚠️ 图片格式不支持（仅支持 JPG / PNG / GIF / WEBP）。");
  }
  if(file.size>maxBytes)
    return cb(null,"⚠️ 图片过大（当前 "+Math.round(file.size/1024/1024*10)/10+"MB，上限 "+Math.round(maxBytes/1024/1024)+"MB）。请压缩或换小图后重试。");
  const r=new FileReader();
  r.onerror=()=>cb(null,"⚠️ 读取图片失败，请重试。");
  r.onload=()=>{const img=new Image();
    img.onerror=()=>cb(null,"⚠️ 图片解码失败，可能是损坏或特殊格式。请换一张 JPG/PNG。");
    img.onload=()=>{try{
      let max=opts.fullRes?2000:1200;
      let w=img.width,h=img.height;if(!w||!h)return cb(null,"⚠️ 图片尺寸异常，解码失败。");
      if(w>max||h>max){const s=max/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);}
      const c=document.createElement("canvas");c.width=w;c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      let q=0.62,out=c.toDataURL("image/jpeg",q);
      while(out.length>1200000 && q>0.35){q=Math.max(0.35,q-0.08);out=c.toDataURL("image/jpeg",q);}
      cb(out,null);
    }catch(e){cb(null,"⚠️ 处理图片出错："+(e&&e.message?e.message:e)+"。请换一张 JPG/PNG。");}};
    img.src=r.result;
  };
  r.readAsDataURL(file);
}
/* ============ 封面调整编辑器 ============ */
function openCoverEditor(key){
  const url=key==="hero"?readImage("meta.heroImage"):readImage("meta.images."+key);
  if(!url){pickImageForCover(key);return;}
  showCoverEditor(key,url,(state.meta.coverStyle&&state.meta.coverStyle[key])||{mode:"cover",x:0,y:0,scale:1});
}
function pickImageForCover(key){
  const inp=document.createElement("input");inp.type="file";inp.accept="image/*";
  inp.onchange=()=>{const f=inp.files[0];if(!f)return;
      compressImage(f,(data,err)=>{if(err){toast(err);return;}
      writeImage(key==="hero"?"meta.heroImage":("meta.images."+key),data);
      showCoverEditor(key,data,{mode:"cover",x:0,y:0,scale:1});
    },{fullRes:true});
  };
  inp.click();
}
/* 封面推荐模板：仅调显示样式（缩放/位置/滤镜），不替换图片 */
const COVER_TEMPLATES=[
  {name:"原图居中",scale:1,x:0,y:0,filter:"none",swatch:"background:linear-gradient(135deg,#C9A98C,#E3C4C8)"},
  {name:"放大特写",scale:1.6,x:0,y:0,filter:"none",swatch:"background:linear-gradient(135deg,#E3C4C8,#C9A98C)"},
  {name:"柔光",scale:1.15,x:0,y:-10,filter:"brightness(1.06) saturate(1.08)",swatch:"background:linear-gradient(135deg,#F3E2E6,#E8C9CF)"},
  {name:"胶片",scale:1.1,x:0,y:0,filter:"sepia(.18) contrast(1.08)",swatch:"background:linear-gradient(135deg,#D9C3A5,#C8A98C)"},
  {name:"清冷",scale:1.1,x:0,y:0,filter:"grayscale(.22) brightness(1.05)",swatch:"background:linear-gradient(135deg,#BFD0D6,#9FB3BC)"},
  {name:"暖阳",scale:1.2,x:0,y:5,filter:"saturate(1.2) brightness(1.04) hue-rotate(-6deg)",swatch:"background:linear-gradient(135deg,#F0C98A,#E3A98C)"},
  {name:"暗调",scale:1.25,x:0,y:0,filter:"brightness(.9) contrast(1.12)",swatch:"background:linear-gradient(135deg,#6b6b6b,#3a3a3a)"},
  {name:"樱花",scale:1.1,x:0,y:-6,filter:"saturate(1.3) brightness(1.05) hue-rotate(8deg)",swatch:"background:linear-gradient(135deg,#F7D7E3,#F2B8CD)"}
];
function applyCoverTemplate(key,idx){
  const t=COVER_TEMPLATES[idx]; if(!t)return;
  state.meta.coverStyle=state.meta.coverStyle||{};
  state.meta.coverStyle[key]={mode:"cover",x:t.x,y:t.y,scale:t.scale};
  // 联动滤镜：写入 BANNER_FILTER 让各视图 banner 同步
  if(key!=="hero"){ BANNER_FILTER[key]=t.filter; }
  save();
  // 重新打开编辑器以预览
  const url=key==="hero"?readImage("meta.heroImage"):readImage("meta.images."+key);
  if(url) showCoverEditor(key,url,state.meta.coverStyle[key]);
  toast("✨ 已套用模板：「"+t.name+"」");
}
function clampPct(v,lim){ v=Number(v)||0; lim=Number(lim)||0; if(lim<0)lim=0; return Math.max(-lim,Math.min(lim,v)); }
function coverCss(st){
  if(!st) st={mode:'cover',x:0,y:0,scale:1};
  var mode=st.mode||'cover';
  var x=clampPct(st.x,50), y=clampPct(st.y,50);
  var scale=Number(st.scale)||1; if(scale<=0) scale=1;
  // 覆盖模式下缩小到 1 以下会露出容器底色，这里兜底夹住
  if(mode==='cover'&&scale<1) scale=1;
  var size = (mode==='contain') ? 'background-size:contain;'
           : (mode==='stretch') ? 'background-size:100% 100%;'
           : 'background-size:cover;';
  /* 关键修复：旧实现把 x/y 只写进 transform-origin，而 transform-origin 在 scale=1 时
     不产生任何位移，所以拖动预览「毫无反应、位置像被固定住」。
     现在位移统一走 transform:translate(x%,y%)（百分比相对于自身盒子，换算稳定），
     缩放走 scale()，两者叠加即「先放大、再挪动」，任何图片都能拖到想要的位置。 */
  return size+'background-position:center;background-repeat:no-repeat;'+
         'transform:translate('+x.toFixed(3)+'%,'+y.toFixed(3)+'%) scale('+scale.toFixed(3)+');'+
         'transform-origin:center center;';
}
/* 计算某张图在当前容器里「还能挪动多少」（百分比，相对自身宽/高）
   —— 图片比容器大时两边各剩 (ratio-1)/2，比容器小时则是留白量，两种情况都能拖。 */
function covHeadroom(st,r,natW,natH){
  var W=(r&&r.width)||0, H=(r&&r.height)||0;
  if(!W||!H||!natW||!natH) return {mx:50,my:50,unknown:true};
  var s=Number(st&&st.scale)||1; if(s<=0)s=1;
  var mode=(st&&st.mode)||'cover';
  var f = (mode==='stretch') ? 1
        : (mode==='contain') ? Math.min(W/natW,H/natH)
        : Math.max(W/natW,H/natH);
  var rx=(natW*f*s)/W, ry=(natH*f*s)/H;
  // 关键修复：封面图与预览框比例接近时，cover 模式余量趋近 0，用户「只能挪一点点、像被截断卡死」。
  // 这里给 cover 模式预留最小安全余量（±8%），保证始终能拖、且拖到边缘也不露白。
  var mx=Math.max(0,Math.abs(rx-1)*50), my=Math.max(0,Math.abs(ry-1)*50);
  if(mode==='cover'){ mx=Math.max(mx,8); my=Math.max(my,8); }
  return {mx:mx, my:my, unknown:false};
}
/* 统一刷新封面预览（作用于内层 .cov-img，避免提示文字被一起缩放） */
function covApply(){
  var st=window._covState, url=window._covUrl;
  var el=document.getElementById("covImg")||document.getElementById("covPrev");
  if(!el||!st)return;
  el.style.cssText='background-image:url('+url+');'+coverCss(st);
}
/* 统一封面风格滤镜（#2）：黑白 / 暖调 / 冷调，全局套用到所有栏目封面 + Hero */
function coverFilterCss(){
  var f=(state.meta&&state.meta.coverFilter)||"none";
  if(f==="bw") return "filter:grayscale(1) contrast(1.05);";
  if(f==="warm") return "filter:sepia(.35) saturate(1.25) hue-rotate(-12deg) brightness(1.02);";
  if(f==="cool") return "filter:hue-rotate(15deg) saturate(1.1) brightness(.98) contrast(1.03);";
  return "";
}
function showCoverEditor(key,url,style){
  const st={mode:style.mode||"cover",x:style.x||0,y:style.y||0,scale:style.scale||1};
  window._covState=st; window._covUrl=url;   // 提前挂载，模式切换等回调里才取得到当前值
  /* 拖拽监听统一挂在一个 AbortController 上：每次重开编辑器先 abort 上一次的，
     避免 window 上的 mouseup 监听反复叠加（编辑器是 innerHTML 重建的，prev 上的监听会随
     旧 DOM 一起回收，但 window 上的不会，长期累积就是监听器泄漏）。 */
  try{ if(window._covAC && !window._covAC.signal.aborted) window._covAC.abort(); }catch(e){}
  try{ window._covAC=(typeof AbortController!=="undefined")?new AbortController():null; }catch(e){ window._covAC=null; }
  const box=$("#coverBox");
  box.innerHTML=
  '<h3>设置封面 · 调整显示</h3>'+
  '<div class="cover-preview" id="covPrev"><div class="cov-img" id="covImg" style="background-image:url('+url+');'+coverCss(st)+'"></div><div class="cov-crop-hint"><span class="cov-crop-label">拖动图片调整位置 · 滑块可放大</span></div></div>'+
  '<div class="cover-modes">'+
      '<button data-m="cover" class="'+(st.mode==="cover"?"active":"")+'">覆盖</button>'+
      '<button data-m="contain" class="'+(st.mode==="contain"?"active":"")+'">适应</button>'+
      '<button data-m="stretch" class="'+(st.mode==="stretch"?"active":"")+'">拉伸</button>'+
    '</div>'+
    '<div class="field" id="covScaleRow"><label>缩放 <span id="covScaleV">'+st.scale.toFixed(2)+'</span></label><input type="range" min="0.5" max="2.5" step="0.05" value="'+st.scale+'" id="covScale" oninput="covZoom(this.value)"></div>'+
    '<div class="mini-note">• 覆盖模式：自动铺满预览框，在预览框内「拖动」图片即可 1:1 跟手调整位置；若图片刚好铺满没有余量，首次拖动会自动放大到 1.30 倍，之后就能自由挪动。<br>• 适应：完整显示，自动留白，可缩放、可拖动。<br>• 拉伸：强制填满，可缩放、可拖动（覆盖模式最小 1.0 倍，不会露白）。<br>• 换一张：重新从相册选择新图片。<br>• 智能建议：自动居中并采用覆盖（浏览器端无法真正识别人脸，此处以智能居中替代）。<br>• 预览框与实际显示同为 4:3，所见即所得。</div>'+
    '<div class="cov-extra"><button class="cancel" onclick="addCoverToPool()">'+icon('refresh',14)+' 加入随机池</button>'+
      '<label class="switch-label">随机展示<span class="switch"><input type="checkbox" '+(state.meta.coverRandom?'checked':'')+' onchange="toggleCoverRandom()"><span class="slider"></span></span></label>'+
      '<button class="cancel" onclick="clearCoverPool()">清空池('+(state.meta.heroCovers||[]).length+')</button></div>'+
    '<div class="cover-tpl-title">'+icon('sparkle',13)+' 套用推荐模板（仅调样式，不改图片）</div>'+
    '<div class="cover-tpls">'+COVER_TEMPLATES.map(function(t,i){return '<span class="cover-tpl" style="'+t.swatch+'" onclick="applyCoverTemplate(\''+key+'\','+i+')" title="'+esc(t.name)+'"></span>';}).join('')+'</div>'+
    '<div class="modal-ops"><button class="cancel" onclick="covSmart()">'+icon('sparkle',14)+' 智能建议</button><button class="cancel" onclick="covReplace(\''+key+'\')">'+icon('image',14)+' 换一张</button><button class="cancel" onclick="covReset(\''+key+'\')">'+icon('refresh',14)+' 恢复默认</button><button class="cancel" onclick="closeCover()">取消</button><button class="save" onclick="covConfirm(\''+key+'\')">确认保存</button></div>';
  $("#coverMask").classList.add("show");
  box.querySelectorAll(".cover-modes button").forEach(b=>b.onclick=()=>{
  st.mode=b.dataset.m;box.querySelectorAll(".cover-modes button").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  covApply();
  var sr=document.getElementById("covScaleRow");if(sr)sr.style.display="block";
});
    const prev = document.getElementById("covPrev");
  let dragging=false,sx=0,sy=0,ox=st.x,oy=st.y;
  // 预加载图片以获取自然尺寸，用于精确换算「还能挪动多少」
  let natW=0,natH=0;
  const pre=new Image();pre.onload=function(){natW=pre.naturalWidth||0;natH=pre.naturalHeight||0;window._covNatW=natW;window._covNatH=natH;};pre.src=url;
  window._covNatW=0; window._covNatH=0;
  const down=(x,y)=>{dragging=true;sx=x;sy=y;ox=st.x;oy=st.y;};
  window._covAutoZoom=false;
  // 拖动：手指位移 1:1 换算成 translate 百分比（百分比基准是自身盒子宽/高，
  // 与最终 Hero / 栏目 banner 的换算方式一致，做到所见即所得）
  const move=(x,y)=>{if(!dragging||!prev)return;
    var r=prev.getBoundingClientRect(); if(!r.width||!r.height)return;
    var hr=covHeadroom(st,r,natW,natH);
    // 图片刚好铺满、没有可挪动余量时，按真实比例一次性放大到「能完整自由拖动」的程度，
    // 而不是固定 1.3 倍（对竖图 1.3 倍仍可能不够，导致依旧卡死）。
    if(!hr.unknown && !window._covAutoZoom && st.scale<=1.001 && (hr.mx<8.5 || hr.my<8.5)){
      window._covAutoZoom=true;
      var fit=Math.max((r.width*1.16)/natW,(r.height*1.16)/natH,1.25); // 留 16% 余量
      st.scale=Math.round(fit*100)/100;
      var sl=document.getElementById("covScale");
      if(sl) sl.value=st.scale;
      var sv=document.getElementById("covScaleV"); if(sv) sv.textContent=st.scale.toFixed(2);
      try{ toast("已自动放大，现在可以拖动了"); }catch(e){}
      hr=covHeadroom(st,r,natW,natH);
    }
    var nx=clampPct(ox + (x-sx)*100/r.width,  hr.mx);
    var ny=clampPct(oy + (y-sy)*100/r.height, hr.my);
    if(st.x!==nx||st.y!==ny){ st.x=nx; st.y=ny; covApply(); }
  };
  const _covSig=(window._covAC&&window._covAC.signal)||null;
  const _covOpts=function(extra){ return _covSig?Object.assign({},extra||{},{signal:_covSig}):(extra||false); };
  prev.addEventListener("touchstart",e=>down(e.touches[0].clientX,e.touches[0].clientY),_covOpts({passive:true}));
  prev.addEventListener("touchmove",e=>{move(e.touches[0].clientX,e.touches[0].clientY);e.preventDefault();},_covOpts({passive:false}));
  prev.addEventListener("touchend",()=>dragging=false,_covOpts({passive:true}));
  prev.addEventListener("mousedown",e=>down(e.clientX,e.clientY),_covOpts(false));
  prev.addEventListener("mousemove",e=>move(e.clientX,e.clientY),_covOpts(false));
  // mouseup 挂 window：用 _covAC 统一回收，重开编辑器/切栏目时自动解绑，不再叠加
  if(_covSig){ window.addEventListener("mouseup",function(){dragging=false;},_covOpts(false)); }
  else { addViewListener(window,"mouseup",function(){dragging=false;}); }
  window._covUrl=url;   // 新增这一行
  var sr=document.getElementById("covScaleRow");if(sr)sr.style.display="block";
}
function covZoom(v){
  const st=window._covState;
  const url=window._covUrl;
  var vv=Math.max(0.5,Math.min(2.5,parseFloat(v)||1));
  if((st.mode||'cover')==='cover'&&vv<1) vv=1;   // 覆盖模式不露白
  st.scale=vv;
  var sv=document.getElementById("covScaleV"); if(sv) sv.textContent=st.scale.toFixed(2);
  var sl=document.getElementById("covScale"); if(sl&&sl.value!=st.scale) sl.value=st.scale;
  // 缩放变化后可挪动范围也变了，把已有的位移重新夹回合法区间
  var prev=document.getElementById("covPrev");
  if(prev){
    var r=prev.getBoundingClientRect();
    var hr=covHeadroom(st,r,window._covNatW||0,window._covNatH||0);
    if(!hr.unknown){ st.x=clampPct(st.x,hr.mx); st.y=clampPct(st.y,hr.my); }
  }
  covApply();
}
function covSmart(){
  const st=window._covState;
  const url=window._covUrl;
  st.mode="cover";
  st.x=0;
  st.y=0;
  st.scale=1;
  covApply();
  window._covAutoZoom=true;   // 智能建议后不再自动放大
  const sl=document.getElementById("covScale");
  if(sl){ sl.value=1; document.getElementById("covScaleV").textContent="1.00"; }
  var sr=document.getElementById("covScaleRow");if(sr)sr.style.display="none";
  document.getElementById("coverBox").querySelectorAll(".cover-modes button").forEach(function(b){
    b.classList.toggle("active", b.dataset.m==="cover");
  });
}
function covConfirm(key){
  const st=window._covState;state.meta.coverStyle=state.meta.coverStyle||{};state.meta.coverStyle[key]=st;save();
  $("#coverMask").classList.remove("show");
  if(key==="hero")renderHome();else renderModule(key);
  toast("封面已保存");
}
function covReplace(key){closeCover();pickImageForCover(key);}
function covReset(key){
  // 恢复默认：清空该字段图片引用（写 null），并复位显示样式，刷新视图
  writeImage(key===("hero")?"meta.heroImage":(key==="decorBg"?"meta.decorBg":("meta.images."+key)), null);
  if(key==="hero"){ state.meta.coverStyle=state.meta.coverStyle||{}; delete state.meta.coverStyle[key]; }
  save(); closeCover();
  if(key==="hero")renderHome(); else renderModule(key);
  toast("已恢复默认封面");
}
function closeCover(){$("#coverMask").classList.remove("show");}
/* 随机封面池 */
function addCoverToPool(){const u=window._covUrl;if(!u){toast("⚠️ 请先设置一张封面");return;}state.meta.heroCovers=state.meta.heroCovers||[];if(!state.meta.heroCovers.includes(u))state.meta.heroCovers.push(u);save();toast("已加入随机池（共 "+state.meta.heroCovers.length+" 张）");}
function toggleCoverRandom(){const on=!state.meta.coverRandom;if(on&&(!state.meta.heroCovers||!state.meta.heroCovers.length)){toast("⚠️ 随机池为空，先点「加入随机池」");return;}state.meta.coverRandom=on;save();renderHome();hapticPattern("tap");toast(on?"已开启随机封面":"已关闭随机封面");}
function clearCoverPool(){state.meta.heroCovers=[];state.meta.coverRandom=false;save();renderHome();toast("已清空随机封面池");}
function setDecorBgMode(m){
  state.meta.decorBgMode=m;save();applyUserStyle();
  const map={cover:"覆盖",contain:"适应",stretch:"拉伸"};
  renderDecor();toast("背景模式："+(map[m]||m));
}
/* #7 背景图增强：透明度 / 模糊（实时，不重渲染页面） */
function setDecorBgOpacity(v){$("#bgOpV").textContent=v+"%";state.meta.decorBgOp=parseInt(v);applyUserStyle();save();}
function setDecorBgBlur(v){$("#bgBlurV").textContent=v+"px";state.meta.decorBgBlur=parseInt(v);applyUserStyle();save();}
function applyTextColors(){
  state.meta.textColors=state.meta.textColors||{};
  state.meta.textColors.ink=$("#tcInk").value;
  state.meta.textColors.text=$("#tcText").value;
  state.meta.textColors.gray=$("#tcGray").value;
  save();applyUserStyle();pushHistory("文字颜色已调整",state.meta.userCss,state.meta.decorBg);renderDecor();toast("文字颜色已应用");
}
function clearTextColors(){
  state.meta.textColors={};save();applyUserStyle();
  pushHistory("文字颜色恢复默认",state.meta.userCss,state.meta.decorBg);renderDecor();toast("已恢复默认文字色");
}
function setBlur(v){$("#blurV").textContent=v+"px";state.meta.blur=parseInt(v);document.documentElement.style.setProperty("--blur",v+"px");save();}
/* #54 组件级毛玻璃开关 */
function setGlassPart(part,on){
  state.meta.glassParts=state.meta.glassParts||{nav:true,card:true,tab:true,modal:true,grid:true};
  state.meta.glassParts[part]=(on?1:0);
  applyGlassParts();save();
}
function applyGlassParts(){
  const gp=state.meta.glassParts||{nav:true,card:true,tab:true,modal:true,grid:true};
  const root=document.documentElement;
  ["nav","card","tab","modal","grid"].forEach(function(p){
    root.classList.toggle("glass-off-"+p, !gp[p]);
  });
}
/* 毛玻璃总开关：true=全界面磨砂；false=去掉所有模糊，背景材质更突出 */
function applyGlassAll(){
  document.documentElement.classList.toggle("no-glass", state.meta.glassAll===false);
}
function setGlassAll(on){
  state.meta.glassAll=(on?true:false); applyGlassAll(); save();
  toast("毛玻璃："+(on?"✅ 开":"🚫 关"));
}
/* 材质纹理总开关：控制 body::after 整层（--tex-master） */
function applyTexMaster(){
  document.documentElement.style.setProperty("--tex-master", state.meta.texMaster===false?"0":"1");
}
function setTexMaster(on){
  state.meta.texMaster=(on?true:false); applyTexMaster(); save();
  toast("材质纹理："+(on?"✅ 开":"🚫 关"));
}
function setRadius(v){const rv=$("#radV");if(rv)rv.textContent=v+"px";state.meta.radius=parseInt(v);document.documentElement.style.setProperty("--radius",v+"px");save();}
function setBlurPreset(v){v=parseInt(v);state.meta.blur=v;document.documentElement.style.setProperty("--blur",v+"px");const bv=$("#blurV");if(bv)bv.textContent=v+"px";const bs=$('input[oninput="setBlur(this.value)"]');if(bs)bs.value=v;save();toast("毛玻璃："+(v<=8?"轻":v<=20?"中":"重"));}
