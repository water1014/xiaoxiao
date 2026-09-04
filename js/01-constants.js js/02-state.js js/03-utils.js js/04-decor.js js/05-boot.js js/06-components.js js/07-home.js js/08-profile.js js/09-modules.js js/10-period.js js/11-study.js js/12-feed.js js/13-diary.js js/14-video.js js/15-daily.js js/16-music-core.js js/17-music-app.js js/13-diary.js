/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 13/18
   文件：js/13-diary.js
   来源：原 index.html 第 26594–27153 行
   内容：心情日记模块 + 情绪趋势统计 + 小红书链接解析
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ============ 心情日记模块 ============ */
const MOOD_EMOJI=["😊","😌","🥰","😎","🤔","😴","😢","😡","😱","🥳","🌟","🥱"];
/* ===== 情绪趋势统计 =====
   情绪云能看出「最近怎么样」，但看不出「这个月整体往哪走」。
   这里给每个表情一个 1~5 的情绪分，于是天数可以连成一条曲线，
   月份之间也能横向比较。图表用纯 SVG 画，不引入任何图表库（离线也能用）。 */
const MOOD_SCORE={"🥳":5,"😊":5,"🥰":5,"🌟":5,"😌":4,"😎":4,"🤔":3,"🥱":3,"😴":3,"😱":2,"😢":2,"😡":1};
function moodScoreOf(e){ return MOOD_SCORE[e]!=null?MOOD_SCORE[e]:3; }
function moodMonthStats(y,m){
  const logs=(state.modules.mood&&state.modules.mood.logs)||[];
  const key=y+"-"+String(m+1).padStart(2,"0");
  const rows=logs.filter(function(r){ return (r.date||"").indexOf(key+"-")===0; })
                 .slice().sort(function(a,b){ return String(a.date).localeCompare(String(b.date)); });
  const counts={};
  rows.forEach(function(r){ if(r.emoji) counts[r.emoji]=(counts[r.emoji]||0)+1; });
  // 同一天记多次时取最后一次，避免曲线被重复日期拉歪
  const byDay={};
  rows.forEach(function(r){ byDay[r.date]=r; });
  const days=Object.keys(byDay).sort().map(function(d){
    return {date:d, emoji:byDay[d].emoji, score:moodScoreOf(byDay[d].emoji)};
  });
  const avg=days.length?days.reduce(function(a,b){return a+b.score;},0)/days.length:0;
  return {key:key, rows:rows, counts:counts, days:days, avg:avg, total:rows.length};
}
function moodBarChartHtml(st){
  const items=Object.keys(st.counts).map(function(e){ return {e:e,n:st.counts[e]}; })
              .sort(function(a,b){ return b.n-a.n; });
  if(!items.length) return "";
  const max=Math.max.apply(null,items.map(function(x){return x.n;}));
  const W=340, labelW=26, numW=22, barH=22, gap=7;
  const chartW=W-labelW-numW;
  const H=items.length*(barH+gap)+4;
  let sv="";
  items.forEach(function(it,i){
    const y=i*(barH+gap);
    const w=Math.max(4,Math.round(it.n/max*chartW));
    sv+='<text x="0" y="'+(y+barH/2+5)+'" font-size="14">'+it.e+'</text>';
    sv+='<rect x="'+labelW+'" y="'+y+'" width="'+chartW+'" height="'+barH+'" rx="6" style="fill:var(--glass-flat)"/>';
    sv+='<rect x="'+labelW+'" y="'+y+'" width="'+w+'" height="'+barH+'" rx="6" style="fill:var(--primary)"/>';
    sv+='<text x="'+(labelW+chartW+5)+'" y="'+(y+barH/2+4)+'" font-size="11" style="fill:var(--gray)">'+it.n+'</text>';
  });
  return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" height="'+H+'" preserveAspectRatio="xMinYMin meet" role="img" aria-label="各情绪出现次数">'+sv+'</svg>';
}
function moodLineChartHtml(st){
  if(st.days.length<2) return "";
  const W=340,H=112,padL=20,padB=14,padT=8,padR=8;
  const cw=W-padL-padR, ch=H-padT-padB;
  const n=st.days.length;
  const px=function(i){ return padL + (n>1 ? i*cw/(n-1) : cw/2); };
  const py=function(v){ return padT + ch - (v-1)/4*ch; };
  let grid="";
  [1,2,3,4,5].forEach(function(v){
    grid+='<line x1="'+padL+'" y1="'+py(v).toFixed(1)+'" x2="'+(W-padR)+'" y2="'+py(v).toFixed(1)+'" style="stroke:var(--glass-border)" stroke-width="1" stroke-dasharray="2 3"/>';
    grid+='<text x="2" y="'+(py(v)+3).toFixed(1)+'" font-size="9" style="fill:var(--gray)">'+v+'</text>';
  });
  const path=st.days.map(function(d,i){ return (i?"L":"M")+px(i).toFixed(1)+" "+py(d.score).toFixed(1); }).join(" ");
  const dots=st.days.map(function(d,i){
    return '<circle cx="'+px(i).toFixed(1)+'" cy="'+py(d.score).toFixed(1)+'" r="3.2" style="fill:var(--primary)"><title>'+esc(d.date)+" "+esc(d.emoji||"")+'</title></circle>';
  }).join("");
  return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" height="'+H+'" preserveAspectRatio="xMinYMin meet" role="img" aria-label="本月情绪走势">'+grid+
    '<path d="'+path+'" fill="none" style="stroke:var(--primary)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'+dots+'</svg>';
}
function moodStatsCardHtml(mm){
  try{
    const st=moodMonthStats(mm.y,mm.m);
    if(!st.total) return "";
    const rank=Object.keys(st.counts).sort(function(a,b){ return st.counts[b]-st.counts[a]; });
    const top=rank[0]||"—";
    let trend="";
    if(st.days.length>=4){
      const half=Math.floor(st.days.length/2);
      const a=st.days.slice(0,half).reduce(function(x,y){return x+y.score;},0)/half;
      const b=st.days.slice(half).reduce(function(x,y){return x+y.score;},0)/(st.days.length-half);
      const diff=b-a;
      trend = diff>0.4 ? "📈 后半段比前半段好一些" : (diff<-0.4 ? "📉 后半段略低落，注意休息" : "➡️ 整体平稳");
    }
    return '<div class="card"><h3>📊 本月情绪统计</h3>'+
      '<div class="ms-top">'+
        '<div class="ms-cell"><b>'+st.total+'</b><span>记录条数</span></div>'+
        '<div class="ms-cell"><b>'+st.avg.toFixed(1)+'</b><span>平均情绪分</span></div>'+
        '<div class="ms-cell"><b style="font-size:18px">'+top+'</b><span>最常出现</span></div>'+
      '</div>'+
      (trend?'<div class="ms-trend">'+trend+'</div>':'')+
      '<div class="ms-sub">各情绪出现次数</div>'+moodBarChartHtml(st)+
      (st.days.length>1?'<div class="ms-sub">情绪走势（5 分最高）</div>'+moodLineChartHtml(st):'')+
    '</div>';
  }catch(e){ return ""; }
}
function moodToday(){const t=todayStr();const logs=(state.modules.mood&&state.modules.mood.logs)||[];return logs.filter(x=>x.date===t);}
function renderMood(){
  const v=$("#view-module");
  const logs=(state.modules.mood&&state.modules.mood.logs)||[];
  const sorted=logs.slice().sort((a,b)=>b.date.localeCompare(a.date));
  const today=moodToday();
  const todayMood=today.length?today[today.length-1]:null;
  const tnow=new Date();
  const mm=state.meta.moodMonth||{y:tnow.getFullYear(),m:tnow.getMonth()};
  let h='<div class="back-row"><button onclick="showHome()" aria-label="返回">'+icon('back',20)+'</button><div style="font-weight:600">心情日记</div></div>';
  h+='<div class="mod-head" data-en="MOOD DIARY"><div class="mod-h1">'+icon('mood',20)+' 心情日记</div><div class="mod-sub">记录每一天的天气，也记录每一天的你。</div></div>';
  // 今日心情速记
  h+='<div class="card mood-today">';
  h+='<h3>'+icon('cloud',16)+' 今天的心情</h3>';
  h+='<div class="mood-emoji-row">';
  MOOD_EMOJI.forEach(function(e){ h+='<button class="mood-em" onclick="pickMood(\''+e+'\')" style="'+(todayMood&&todayMood.emoji===e?'border-color:var(--primary-ink);background:var(--glass-solid);transform:scale(1.12)':'')+'">'+e+'</button>'; });
  h+='</div>';
  h+='<textarea id="moodNote" class="mood-note" placeholder="今天怎么样？写一句给未来的自己…" rows="2" style="margin-top:10px">'+esc(todayMood?todayMood.note||'':'')+'</textarea>';
  h+='<div class="mood-img-row">';
  h+='<button class="mood-img-btn" onclick="pickMoodImage()">'+(todayMood&&todayMood.image?''+icon("image",14)+' 已配图 · 点击更换':''+icon("picture",14)+' 配一张图')+'</button>';
  if(todayMood&&todayMood.image){ h+='<div class="mood-img-prev" style="background-image:url('+esc(todayMood.image)+')"></div>'; }
  h+='</div>';
  h+='<div class="modal-ops"><button class="save" onclick="saveMood()">保存今天</button>'+(todayMood?'<button class="cancel" onclick="delMood(\''+todayMood.id+'\')">删除</button>':'')+'</div>';
  h+='</div>';
  // 近 7 天情绪云
  const cloud=recentMoodCloud(7);
  if(cloud.length){
    h+='<div class="card"><h3>🌈 近 7 天情绪云</h3><div class="mood-cloud">'+cloud.map(function(c){return '<span class="mood-cloud-item" title="'+c.date+'">'+c.emoji+'</span>';}).join('')+'</div></div>';
  }
  // 本月情绪统计（柱状图 + 走势曲线）
  h+=moodStatsCardHtml(mm);
  // 心情日历（可看往期）
  h+=moodCalendarHtml(mm, logs);
  // 历史手账（当月全部）—— ins日记风格杂志卡片
  const calKey=mm.y+"-"+String(mm.m+1).padStart(2,"0");
  const monthLogs=sorted.filter(function(r){return r.date.indexOf(calKey+"-")===0;});
  h+='<div class="card" style="padding:0;background:transparent;border:none;box-shadow:none;"><div class="yanj-diary-wrapper">';
  if(!monthLogs.length){ h+='<div class="mini-note" style="padding:10px">这个月还没有记录～点上面的表情，或在日历里挑一天补记吧 🌸</div>'; }
  else{
    monthLogs.forEach(function(r, idx){
      const isEven=idx%2===0;
      h+='<div class="yanj-row '+(isEven?'':'yanj-row-reverse')+' YJ-anim-target">'+
           '<div class="yanj-frame-container">'+
             '<div class="yanj-tape"></div>'+
             '<div class="yanj-frame-inner"><div class="yanj-content">'+esc(r.note||'无记录')+'</div></div>'+
             '<div class="yanj-polaroid">'+(r.image?'<img class="yanj-photo" src="'+esc(r.image)+'" alt="心情配图">':'<span>'+(r.emoji||'📝')+'</span>')+'</div>'+
             '<button class="yanj-del" onclick="delMood(\''+r.id+'\')" aria-label="删除这条">'+icon("close",14)+'</button>'+
           '</div>'+
           '<div class="yanj-typo-box">'+
             '<div class="yanj-title-item yanj-date">'+r.date.slice(5)+'</div>'+
             '<div class="yanj-title-item yanj-weather">'+(r.mood||'—')+'</div>'+
             '<div class="yanj-title-item yanj-index">NO.'+String(idx+1).padStart(2,'0')+'</div>'+
           '</div>'+
         '</div>';
    });
  }
  h+='</div></div>';
  // 情绪刮刮乐（文排刮擦组件）：刮开上层"今日密语"露出下层"真心话"
  const scratchTop = todayMood ? ("今天你写：「"+(todayMood.note||todayMood.emoji||"无记录")+"」") : "今天还没记录心情，刮一刮看看？";
  const scratchBottom = "愿你所念皆星河，所行皆坦途。慢慢来，一切都来得及。";
  h+='<div class="card" style="padding:0;background:transparent;border:none;box-shadow:none;margin-top:18px">'+
       '<div style="font-size:11px;color:var(--gray);text-align:center;margin-bottom:6px">✨ 情绪刮刮乐 · 用手指刮开雾气</div>'+
       '<div id="censy-scratch-box" class="censy-drowning-container">'+
         '<div class="censy-english-deco">Drowning in the humidity of love</div>'+
         '<svg width="100%" height="100%" style="position:absolute;top:0;left:0;pointer-events:none;z-index:5">'+
           '<defs>'+
             '<mask id="censy-hide-mask"><rect width="100%" height="100%" fill="white"/><path id="censy-hide-path" d="" stroke="black" stroke-width="35" fill="none" stroke-linecap="round" stroke-linejoin="round"/></mask>'+
             '<mask id="censy-reveal-mask"><rect width="100%" height="100%" fill="black"/><path id="censy-reveal-path" d="" stroke="white" stroke-width="35" fill="none" stroke-linecap="round" stroke-linejoin="round"/></mask>'+
           '</defs>'+
           '<g mask="url(#censy-reveal-mask)"><foreignObject x="0" y="0" width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" class="censy-fo-content">'+esc(scratchBottom)+'</div></foreignObject></g>'+
           '<g mask="url(#censy-hide-mask)"><foreignObject x="0" y="0" width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" class="censy-fo-content">'+esc(scratchTop)+'</div></foreignObject></g>'+
         '</svg>'+
       '</div>'+
     '</div>';
  v.innerHTML=h+'<div class="view-end"></div>';
  // 触发 ins日记卡片入场动画（IntersectionObserver）
  setTimeout(initYanjObserver, 60);
  setTimeout(initCensyScratch, 80);
}
// ins日记风格卡片滚动入场
function initYanjObserver(){
  try{
    const targets=document.querySelectorAll('.YJ-anim-target');
    if(!targets.length)return;
    if(window._yanjObserver){ window._yanjObserver.disconnect(); }
    const ob=new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('YJ-visible'); } });
    }, {threshold:0.15});
    targets.forEach(function(el){ ob.observe(el); });
    window._yanjObserver=ob;
  }catch(e){}
}
/* 文排刮擦（censy-drowning）：SVG mask 刮除上层文字露出下层。每次 renderMood 后调用 */
class CensyScratch {
  constructor(id){
    this.box=document.getElementById(id);
    if(!this.box)return;
    this.hPath=document.getElementById('censy-hide-path');
    this.rPath=document.getElementById('censy-reveal-path');
    this.drawing=false;this.pStr="";
    // 挂在 window 上的监听必须持有引用，否则 destroy() 无法解绑；
    // 之前是匿名箭头函数，每次 renderMood 都会再叠一层，切几次心情栏目就堆几十个
    this._onMouseUp=()=>this.end();
    this._onTouchEnd=()=>this.end();
    this.init();
  }
  destroy(){
    this.drawing=false;
    try{ window.removeEventListener('mouseup',this._onMouseUp); }catch(e){}
    try{ window.removeEventListener('touchend',this._onTouchEnd); }catch(e){}
  }
  getPos(e){const rect=this.box.getBoundingClientRect();let cx=e.clientX,cy=e.clientY;if(e.touches&&e.touches.length>0){cx=e.touches[0].clientX;cy=e.touches[0].clientY;}return{x:cx-rect.left,y:cy-rect.top};}
  start(e){this.drawing=true;const p=this.getPos(e);this.pStr+="M "+p.x+" "+p.y+" ";this.update();if(e.cancelable)e.preventDefault();}
  move(e){if(!this.drawing)return;const p=this.getPos(e);this.pStr+="L "+p.x+" "+p.y+" ";this.update();if(e.cancelable)e.preventDefault();}
  end(){this.drawing=false;}
  update(){if(this.hPath)this.hPath.setAttribute('d',this.pStr);if(this.rPath)this.rPath.setAttribute('d',this.pStr);}
  init(){
    this.box.addEventListener('mousedown',e=>this.start(e),{passive:false});
    this.box.addEventListener('mousemove',e=>this.move(e),{passive:false});
    this.box.addEventListener('touchstart',e=>this.start(e),{passive:false});
    this.box.addEventListener('touchmove',e=>this.move(e),{passive:false});
    window.addEventListener('mouseup',this._onMouseUp,{passive:true});
    window.addEventListener('touchend',this._onTouchEnd,{passive:true});
  }
}
let _censyScratch=null;
function initCensyScratch(){
  try{
    if(_censyScratch){ _censyScratch.destroy(); _censyScratch=null; }
    _censyScratch=new CensyScratch('censy-scratch-box');
  }catch(e){}
}
function disposeCensyScratch(){ try{ if(_censyScratch){ _censyScratch.destroy(); _censyScratch=null; } }catch(e){} }
function moodCalendarHtml(mm, logs){
  const y=mm.y, m=mm.m;
  const first=new Date(y,m,1);
  const startDow=(first.getDay()+6)%7; // 周一为一周起点
  const daysInMonth=new Date(y,m+1,0).getDate();
  const map={};logs.forEach(function(r){ if(r.date.indexOf(y+"-"+String(m+1).padStart(2,"0")+"-")===0)map[r.date]=r; });
  const tkey=todayStr(); // #7 用统一日期格式，确保翻月后“今天”高亮始终指向真实今日
  let cells='';
  const wk=['一','二','三','四','五','六','日'];
  wk.forEach(function(w){ cells+='<span class="mc-w">'+w+'</span>'; });
  for(let i=0;i<startDow;i++)cells+='<span class="mc-c empty"></span>';
  for(let d=1;d<=daysInMonth;d++){
    const key=y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    const rec=map[key];
    const isT=key===tkey;
    cells+='<span class="mc-c'+(isT?' today':'')+(rec?' has':'')+'" onclick="moodCalPick(\''+key+'\')">'+'<span class="mc-d">'+d+'</span>'+'<span class="mc-e">'+(rec?rec.emoji:'')+'</span>'+'</span>';
  }
  // 修复：本函数参数是 (mm, logs)，作用域内并无 tnow（历史遗留引用会抛 ReferenceError，导致心情栏目白屏）
  const isCur=(tkey.slice(0,7)===y+"-"+String(m+1).padStart(2,"0"));
  return '<div class="card mood-cal"><div class="mc-head">'+
    '<button class="mc-nav" onclick="moodShiftMonth(-1)" aria-label="上个月">‹</button>'+
    '<div class="mc-title">'+y+'年 '+(m+1)+'月</div>'+
    '<button class="mc-nav" onclick="moodShiftMonth(1)" aria-label="下个月">›</button>'+
    (isCur?'':'<button class="mc-today" onclick="moodGotoToday()">今天</button>')+
    '</div>'+
    '<div class="mc-grid">'+cells+'</div>'+
    '<div class="mc-hint">点任意有记录的日期可查看/补记当天心情 · 点空白日期也能补记往期</div>'+
    '</div>';
}
function moodShiftMonth(delta){
  const tnow=new Date();
  const mm=state.meta.moodMonth||{y:tnow.getFullYear(),m:tnow.getMonth()};
  let y=mm.y, m=mm.m+delta;
  if(m<0){m=11;y--;} if(m>11){m=0;y++;}
  // 不允许翻到比最早记录还早太多：宽松限制到 2015 年
  if(y<2015){toast("已到最早可查看范围");return;}
  state.meta.moodMonth={y:y,m:m};save();renderMood();
}
function moodGotoToday(){const t=new Date();state.meta.moodMonth={y:t.getFullYear(),m:t.getMonth()};save();renderMood();}
function moodCalPick(key){
  // 展开一个轻量弹层：显示/编辑该日心情
  const logs=(state.modules.mood&&state.modules.mood.logs)||[];
  const rec=logs.find(function(x){return x.date===key;});
  const mk=document.createElement("div");
  mk.className="fb-mask";
  mk.style.cssText="position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:18px";
  const box=document.createElement("div");
  box.style.cssText="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius);padding:18px;max-width:340px;width:100%;backdrop-filter:blur(var(--blur));-webkit-backdrop-filter:blur(var(--blur));box-shadow:var(--shadow)";
  box.innerHTML='<div style="font-weight:700;margin-bottom:10px">'+key+' 的心情</div>'+
    '<div class="mood-emoji-row" id="mcPickRow">'+
    MOOD_EMOJI.map(function(e){return '<button class="mood-em" onclick="pickMood(\''+e+'\')" style="'+(rec&&rec.emoji===e?'border-color:var(--primary-ink);background:var(--glass-solid);transform:scale(1.12)':'')+'">'+e+'</button>';}).join('')+
    '</div>'+
    '<textarea id="mcPickNote" class="mood-note" placeholder="给这一天写一句…" rows="2" style="margin-top:10px">'+(rec?esc(rec.note||''):'')+'</textarea>'+
    '<div class="modal-ops" style="margin-top:10px"><button class="cancel" onclick="this.closest(\'.fb-mask\').remove()">取消</button>'+
    '<button class="save" onclick="saveMoodAt(\''+key+'\',this)">保存</button>'+
    (rec?'<button class="cancel" onclick="delMood(\''+rec.id+'\')">删除</button>':'')+'</div>';
  mk.appendChild(box);
  mk.addEventListener("click",function(e){if(e.target===mk)mk.remove();});
  document.body.appendChild(mk);
}
function saveMoodAt(key,btn){
  const e=window._pickMood||(moodToday()[0]&&moodToday()[0].emoji)||"😊";
  const note=(document.getElementById("mcPickNote")?document.getElementById("mcPickNote").value:"").trim();
  const logs=(state.modules.mood.logs)||[];
  const ex=logs.find(function(x){return x.date===key;});
  if(ex){ex.emoji=e;ex.note=note;}
  else{ logs.push({id:uid(),date:key,emoji:e,note:note}); }
  state.modules.mood.logs=logs;save();
  const mask=btn&&btn.closest?btn.closest(".fb-mask"):null;if(mask)mask.remove();
  renderMood();toast("🌈 已记下 "+key+" 的心情");
}
function recentMoodCloud(n){
  const logs=(state.modules.mood&&state.modules.mood.logs)||[];
  const map={};logs.forEach(function(r){ if(!map[r.date])map[r.date]=r; });
  const arr=[];const d=new Date();
  for(let i=n-1;i>=0;i--){const dd=new Date(d);dd.setDate(d.getDate()-i);const key=dd.getFullYear()+"-"+String(dd.getMonth()+1).padStart(2,"0")+"-"+String(dd.getDate()).padStart(2,"0");if(map[key])arr.push({date:key,emoji:map[key].emoji});}
  return arr;
}
function pickMood(e){ try{ document.querySelectorAll(".mood-em").forEach(function(b){b.style.borderColor="";b.style.background="";b.style.transform="";}); var t=event&&event.currentTarget; if(t){t.style.borderColor="var(--primary)";t.style.background="var(--glass-solid)";t.style.transform="scale(1.12)";} }catch(err){} window._pickMood=e; }
/* 心情配图：选图后暂存到 window._pickMoodImg，保存时写入记录（#5） */
function pickMoodImage(){
  pickImage(null,function(url){
    window._pickMoodImg=url;
    // 轻量刷新当前心情卡，显示预览
    try{ renderMood(); }catch(e){}
    toast("已选好图片，点「保存今天」生效 🌸");
  });
}
function saveMood(){
  const e=window._pickMood||(moodToday()[0]&&moodToday()[0].emoji)||"😊";
  const note=(document.getElementById("moodNote")?document.getElementById("moodNote").value:"").trim();
  const img=window._pickMoodImg||null;
  const t=todayStr();const logs=(state.modules.mood.logs)||[];
  const ex=logs.find(function(x){return x.date===t;});
  if(ex){ex.emoji=e;ex.note=note; if(img!==undefined) ex.image=img;}
  else{ logs.push({id:uid(),date:t,emoji:e,note:note,image:img||null}); }
  window._pickMoodImg=undefined;
  state.modules.mood.logs=logs;save();
  /* 在首页速记时只换掉那一张心情卡，不整页重绘：
     全量 renderHome() 会把滚动位置、正在播放的动画一起重置，体感上就是「闪一下」。 */
  if(currentView==="home" && document.querySelector(".mood-home")){
    try{
      const el=document.querySelector(".mood-home");
      const tmp=document.createElement("div");
      tmp.innerHTML=renderHomeMood();
      if(tmp.firstChild) el.replaceWith(tmp.firstChild);
    }catch(e){ renderHome(); }
  } else {
    renderMood();
  }
  toast("🌈 已记下今天的心情");
}
function delMood(id){ if(!confirm("删除这条心情记录？"))return; state.modules.mood.logs=(state.modules.mood.logs||[]).filter(function(x){return x.id!==id;}); save();renderMood();toast("🗑 已删除"); }
function renderFeedBox(){
  const v=$("#view-module");
  let h='<div class="back-row"><button onclick="showHome()" aria-label="返回"><svg class="svg-ic" viewBox="0 0 24 24" width="20" height="20"><path d="M15 5l-7 7 7 7"/></svg></button><div style="font-weight:600">全部投喂</div></div>';
  h+='<div class="mod-head"><div class="mod-h1">'+icon('download',20)+' 全部投喂</div><div class="mod-sub">所有栏目的投喂都收在这里 · 点任意一条可重新打开</div></div>';
  const fbimg=readImage("meta.images.feedbox");
  const fbcov=(state.meta.coverStyle&&state.meta.coverStyle.feedbox)||{mode:"cover",x:0,y:0,scale:1};
  const fbimgHtml=fbimg?('<div class="banner-img" style="background-image:url('+fbimg+');'+coverCss(fbcov)+';'+coverFilterCss()+'"></div>'):'';
  h+='<div class="banner" onclick="openCoverEditor(\'feedbox\')">'+fbimgHtml+'<span class="bcap">点击设置 / 调整栏目配图</span></div>';
  h+='<div class="feed-search" style="margin-bottom:12px"><input id="feedboxSearch" placeholder="全文检索全部投喂" oninput="filterFeedBox(this.value)" onkeydown="if(event.key===\'Enter\')this.blur()" /><button class="feed-clear" onclick="clearFeedBoxSearch()" style="display:none"><svg class="svg-ic" viewBox="0 0 24 24" width="13" height="13"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
  h+='<div class="mb-ops" style="margin-bottom:12px"><button class="feed-play" onclick="showImportMaterial()">'+icon('download',15)+' 导入资料（链接自动解析）</button></div>';
  const groups=[];
  Object.keys(state.feeds||{}).forEach(colId=>{
    const arr=state.feeds[colId]||[];
    if(arr.length)groups.push({id:colId,title:colTitle(colId),icon:(MODULE_DEFS[colId]||{}).icon||"download",items:arr});
  });
  groups.sort((a,b)=>b.items.length-a.items.length);
  if(!groups.length)h+='<div class="card" style="margin-top:12px"><div class="mini-note">还没有任何投喂～去各栏目底部喂一条吧</div></div>';
  groups.forEach(g=>{
    h+='<div class="card" style="margin-top:12px"><h3>'+g.icon+' '+esc(g.title)+' <span class="tag">'+g.items.length+' 条</span></h3>';
    h+='<div class="feedbox-list">';
    g.items.forEach(f=>{
      h+='<div class="feedbox-item" onclick="openFeedPreview(\''+g.id+'\',\''+f.id+'\')">'+
        '<span class="fb-ic">'+feedIcon(f.type)+'</span>'+
        '<span class="fb-main"><span class="fb-title">'+esc(f.summary||f.source||"(无标题)")+'</span>'+
        '<span class="fb-meta">'+typeLabel(f.type)+' · '+esc(f.time)+(f.tag?' · '+feedPlatformIcon(f.tag)+' <span class="fb-tag" title="点击修改标签" onclick="event.stopPropagation();editFeedTag(\''+g.id+'\',\''+f.id+'\')">✎ '+esc(f.tag)+'</span>':'')+'</span></span>'+
        '<span class="fb-arrow">›</span></div>';
    });
    h+='</div></div>';
  });
  v.innerHTML=h+'<div class="view-end"></div>';
}
function openFeedPreview(colId,fid){
  const f=(state.feeds[colId]||[]).find(x=>x.id===fid);if(!f)return;
  const mk=document.createElement("div");
  mk.className="fb-mask";
  mk.style.cssText="position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px";
  const box=document.createElement("div");
  box.style.cssText="background:#fff;border-radius:var(--radius);max-width:92vw;max-height:86vh;overflow:auto;padding:16px;width:100%";
  let inner='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px"><b>'+typeLabel(f.type)+' · '+esc(f.time)+'</b><button onclick="this.closest(\'.fb-mask\').remove()" style="border:none;background:#eee;border-radius:50%;width:28px;height:28px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--gray)"><svg class="svg-ic" viewBox="0 0 24 24" width="13" height="13"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
  if(f.type==="image"&&f.dataUrl){
    inner+='<img src="'+f.dataUrl+'" style="width:100%;border-radius:var(--radius-sm);display:block">';
  }else if(f.type==="file"&&f.dataUrl){
    inner+='<div class="mini-note">'+icon('download',13)+' '+esc(f.source||"文件")+'</div><a href="'+f.dataUrl+'" download="'+esc(f.source||"file")+'" style="display:inline-block;margin-top:8px;padding:8px 14px;background:var(--primary);color:#fff;border-radius:var(--radius-sm);text-decoration:none">'+icon('download',13)+' 下载文件</a>';
  }else if(f.type==="link"){
    inner+='<a href="'+esc(f.source)+'" target="_blank" style="color:var(--accent-ink);word-break:break-all">'+icon('link',13)+' '+esc(f.source)+'</a>'+(f.summary?'<div style="margin-top:8px;color:var(--text)">'+esc(f.summary)+'</div>':'');
  }else{
    inner+='<div style="font-size:15px;line-height:1.8;color:var(--ink);white-space:pre-wrap">'+esc(f.summary||f.source||"")+'</div>';
  }
  inner+='<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">';
  if(f.type==="link"&&biliEmbed(f.source))inner+='<button class="feed-play" onclick="feedPlayInline(\''+colId+'\',\''+f.id+'\',this)">▶ 在工作台播放</button>';
  if(f.type==="link")inner+='<button class="feed-play" onclick="var mk=this.closest(\'.fb-mask\');if(mk)mk.remove();feedDigest(\''+colId+'\',\''+f.id+'\')">'+icon("sparkle",14)+' 提炼</button>';
  inner+='<button class="feed-play" onclick="var mk=this.closest(\'.fb-mask\');if(mk)mk.remove();feedToTask(\''+colId+'\',\''+f.id+'\')">'+icon("arrowRight",14)+' 转任务</button>';
  inner+='<button class="feed-play" onclick="delFeedRec(\''+colId+'\',\''+f.id+'\');this.closest(\'.fb-mask\').remove()"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg> 删除</button>';
  inner+='<button class="feed-play" onclick="this.closest(\'.fb-mask\').remove()">关闭</button></div>';
  box.innerHTML=inner;
  mk.appendChild(box);
  mk.onclick=function(e){if(e.target===mk)mk.remove();};
  document.body.appendChild(mk);
}
function feedPlayInline(colId,fid,btn){
  const f=(state.feeds[colId]||[]).find(x=>x.id===fid);if(!f)return;
  const emb=biliEmbed(f.source);if(!emb){toast("⚠️ 无法解析该视频链接");return;}
  const wrap=document.createElement("div");
  wrap.innerHTML='<iframe src="'+emb+'" style="width:100%;aspect-ratio:16/9;border:none;border-radius:var(--radius-sm);background:#000;margin-top:10px" allowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" scrolling="no"></iframe>';
  btn.parentNode.insertBefore(wrap,btn.nextSibling);
  btn.style.display="none";
}
/* ============ 小红书链接解析 ============ */
function renderXhsParse(){
  return '<div class="card" style="margin-top:12px"><h3>'+icon('link',16)+' 小红书链接解析</h3>'+
    '<div class="mini-note">粘贴小红书链接（笔记 / xhslink 短链）→ 自动解析标题 / 作者 / 内容 / 封面 → 一键存入下方收藏</div>'+
    '<div class="feed-input"><input id="xhsIn" placeholder="粘贴小红书链接" /><button onclick="xhsParse()">解析</button></div>'+
    '<div id="xhsResult"></div></div>';
}
function xhsParse(){
  const el=$("#xhsIn");if(!el)return;const url=el.value.trim();if(!url)return;
  const box=$("#xhsResult");if(!box)return;
  box.innerHTML='<div class="mini-note">正在解析小红书链接…（可能需要几秒）</div>';
  parseXHS(url).then(function(r){
    if(!r.ok){box.innerHTML='<div class="mini-note">⚠️ '+esc(r.msg||"解析失败")+'<br>可以：① 确认链接完整 ② 在小红书 App 用「分享 → 复制链接」 ③ 手动填进下方收藏表</div>';return;}
    window._xhsParsed=r;
    box.innerHTML='<div style="padding:8px;background:var(--glass-solid);border-radius:var(--radius-sm);font-size:13px;line-height:1.7">'+
      (r.title?'<div style="font-weight:700;color:var(--ink)">📌 '+esc(r.title)+'</div>':'')+
      (r.author?'<div style="margin-top:2px;color:var(--gray)">✍️ '+esc(r.author)+(r.likes?' · '+esc(r.likes):'')+'</div>':'')+
      (r.desc?'<div style="margin-top:6px;color:var(--text)">'+esc(r.desc.slice(0,200))+(r.desc.length>200?"…":"")+'</div>':'')+
      (r.img?'<img src="'+esc(r.img)+'" loading="lazy" style="width:100%;max-height:200px;object-fit:cover;border-radius:var(--radius-sm);margin-top:8px">':'')+
      '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">'+
      '<button class="feed-play" onclick="xhsSave(true)">'+icon("checkCircle",14)+' 存入收藏</button>'+
      '<button class="feed-play" onclick="xhsSave(false)">只存链接</button>'+
      '<button class="feed-play" onclick="document.getElementById(\'xhsResult\').innerHTML=\'\'">收起</button>'+
      '</div></div>';
  });
}
function parseXHS(url){
  return fetchPageText(url).then(function(html){
    if(!html)return {ok:false,msg:"抓取失败：小红书有反爬限制，浏览器端抓不到完整内容。可以发链接给我（说「喂给小红书栏目」），我帮你提炼。"};
    let r={ok:true,title:"",author:"",desc:"",img:"",likes:"",url:url};
    try{
      const doc=new DOMParser().parseFromString(html,"text/html");
      const g=function(sel){const el=doc.querySelector(sel);return el?(el.getAttribute("content")||el.textContent||"").trim():"";};
      r.url=g('meta[property="og:url"]')||url;
      r.title=g('meta[property="og:title"]')||g('meta[name="title"]')||(doc.title||"").trim().replace(/ - 小红书.*$/,"");
      r.desc=g('meta[property="og:description"]')||g('meta[name="description"]');
      r.img=g('meta[property="og:image"]');
      const m=html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})<\/script>/);
      if(m){
        try{
          const st=JSON.parse(m[1].replace(/undefined/g,"null"));
          const note=st.note||{};
          const map=note.noteDetailMap||{};
          const key=Object.keys(map)[0];
          if(key&&map[key].note){
            const nn=map[key].note;
            if(nn.title)r.title=nn.title;
            if(nn.desc)r.desc=nn.desc;
            if(nn.user&&nn.user.nickname)r.author=nn.user.nickname;
            if(nn.interactInfo&&nn.interactInfo.likedCount)r.likes="❤️ "+nn.interactInfo.likedCount;
            if(nn.imageList&&nn.imageList.length)r.img=nn.imageList[0].urlDefault||r.img;
          }
        }catch(e){}
      }
      if(!r.title&&!r.desc){r.ok=false;r.msg="页面抓到了但没提取到内容（小红书反爬）。可以发链接给我帮你提炼。";return r;}
      return r;
    }catch(e){return {ok:false,msg:"解析出错："+e.message};}
  });
}
function xhsSave(withInfo){
  const r=window._xhsParsed;if(!r)return;
  const posts=state.modules.xiaohongshu.panels.posts;
  posts.push({id:uid(),title:(r.title||"小红书笔记").slice(0,30),link:r.url||"",cat:"变美",points:withInfo?(r.desc||"").slice(0,50):""});
  save();renderModule("xiaohongshu");toast("✅ 已存入小红书收藏");
}
function renderFeedArea(colId){
  const allFeeds=(state.feeds[colId]||[]).slice();
  // 性能：投喂超过 20 条时只渲染最近 20 条，避免长列表重建卡顿（#3.2）
  const SHOW_MAX=20;
  const feeds=allFeeds.slice(0,SHOW_MAX);
  const hiddenCount=allFeeds.length-feeds.length;
  let h='<div class="card"><h3>📥 投喂记录区 <span class="tag">链接/图片/文件/文字</span></h3><div class="mini-note">投喂 = 收藏：链接可「▶ 播放」或「'+icon("arrowRight",14)+' 转任务」变成打卡项。</div>';
  if(feeds[0]){const d=daysSince(feeds[0].time.slice(0,10));if(d>=3)h+='<div class="quote-bar" style="border-color:var(--accent-ink)">🌸 该栏目已 '+d+' 天没新投喂，该喂点新内容了～</div>';}
  const counts={};feeds.forEach(f=>counts[f.type]=(counts[f.type]||0)+1);
  Object.keys(counts).forEach(t=>{if(counts[t]>=5)h+='<div class="mini-note">「'+typeLabel(t)+'」已投喂 '+counts[t]+' 条，是否整理成一份合集/心得？📒</div>';});
  h+='<div class="feed-input"><input id="feedIn_'+colId+'" placeholder="粘贴链接或文字，或点下方上传" /><button onclick="feedFromInput(\''+colId+'\')">投喂</button></div>';
  h+='<div style="display:flex;gap:8px;margin-bottom:10px"><button class="add-btn" style="margin:0;flex:1" onclick="feedUpload(\''+colId+'\',\'image\')">'+icon('image',15)+' 上传图片</button><button class="add-btn" style="margin:0;flex:1" onclick="feedUpload(\''+colId+'\',\'file\')">'+icon('download',15)+' 上传文件</button></div>';
  h+='<div class="feed-search"><input id="feedSearch_'+colId+'" placeholder="🔍 全文检索投喂内容" oninput="filterFeedList(\''+colId+'\',this.value)" /><button class="feed-clear" onclick="clearFeedSearch(\''+colId+'\')" style="display:none"><svg class="svg-ic" viewBox="0 0 24 24" width="13" height="13"><path d="M6 6l12 12M18 6L6 18"/></svg></button><span id="feedSearchTip_'+colId+'" class="feed-search-tip"></span></div>';
  const types=Array.from(new Set(feeds.map(f=>f.type)));
  const allTags=Array.from(new Set(feeds.map(f=>f.tag).filter(Boolean)));
  if(types.length){h+='<div class="feed-filter" id="feedTypeFilter_'+colId+'"><span class="ff-chip on" onclick="feedTypeFilter(\''+colId+'\',\'\')">全部</span><span class="ff-sep">类型</span>'+types.map(t=>'<span class="ff-chip" onclick="feedTypeFilter(\''+colId+'\',\'type:'+t+'\')">'+typeLabel(t)+'</span>').join('')+(allTags.length?'<span class="ff-sep">平台</span>'+allTags.map(t=>'<span class="ff-chip" onclick="feedTypeFilter(\''+colId+'\',\'tag:'+escJs(t).replace(/'/g,"\\'")+'\')">🏷 '+esc(t)+'</span>').join(''):'')+'</div>';}
  h+='<div class="feed-card-list" id="feedList_'+colId+'">';
  if(!feeds.length)h+='<div class="mini-note" style="text-align:center;padding:10px;color:var(--gray)">暂无投喂记录，来喂第一条吧 🌸</div>';
  feeds.forEach((f,idx)=>{ h+=feedCardHtml(colId,f,idx); });
  h+='</div></div>';
  // 列表渲染后兜底探测破损配图（#2）；scrollKeep 由调用方处理（见 renderModule）
  if(hiddenCount>0){
    h+='<div class="feed-more-wrap" id="feedMore_'+colId+'"><button class="feed-more-btn" onclick="feedShowAll(\''+colId+'\')">查看全部 '+allFeeds.length+' 条记录（已显示前 '+SHOW_MAX+' 条）</button></div>';
  }
  return h;
}
/* 单张投喂卡片 HTML（renderFeedArea 与 feedShowAll 共用） */
function feedCardHtml(colId,f,idx){
  let card='<div class="feed-card stagger-item" id="feedCard_'+colId+'_'+f.id+'" data-type="'+esc(f.type)+'" data-tag="'+esc(f.tag||"")+'" style="--i:'+idx+'">';
  card+='<div class="feed-card-top"><span class="feed-ic">'+feedPlatformIcon(f.tag)+'</span><span class="feed-type">'+typeLabel(f.type)+'</span><span class="feed-time">'+esc(f.time)+'</span>'+(f.tag?'<span class="feed-tag" title="点击修改标签" onclick="event.stopPropagation();editFeedTag(\''+colId+'\',\''+f.id+'\')">✎ '+esc(f.tag)+'</span>':'')+'</div>';
  if(f.type==="link"&&/^https?:\/\//.test(f.source)){
    const emb=biliEmbed(f.source);
    const playBtn=emb?('<button class="feed-play" onclick="toggleFeedPlay(\''+colId+'\',\''+f.id+'\')">▶ 播放</button>'):'';
    const digBtn='<button class="feed-play" onclick="feedDigest(\''+colId+'\',\''+f.id+'\')">'+icon("sparkle",14)+' 提炼</button>';
    card+='<div class="feed-src"><a href="'+esc(f.source)+'" target="_blank" class="feed-link">'+icon('link',13)+' '+esc(f.source)+'</a></div>';
    card+='<div class="feed-actions">'+playBtn+digBtn+'</div>';
    if(emb)card+='<div id="feedPlayerRow_'+colId+'_'+f.id+'" style="display:none"><div id="feedPlayer_'+colId+'_'+f.id+'"></div></div>';
    card+='<div id="feedDigestRow_'+colId+'_'+f.id+'" style="display:none"><div id="feedDigest_'+colId+'_'+f.id+'"></div></div>';
  }
  else if(f.dataUrl)card+='<div class="feed-src"><a href="'+f.dataUrl+'" target="_blank" class="feed-link">'+icon('download',13)+' '+esc(f.source||"附件")+'</a></div>';
  else card+='<div class="feed-src">'+esc(f.source||"—")+'</div>';
  if(f.summary)card+='<div class="feed-summary">'+esc(f.summary)+'</div>';
  card+='<div class="feed-actions feed-actions-bottom"><span class="feed-act" onclick="openFeedPreview(\''+colId+'\',\''+f.id+'\')">🔍 打开</span><span class="feed-act" onclick="feedToTask(\''+colId+'\',\''+f.id+'\')">'+icon("arrowRight",14)+' 转任务</span><span class="feed-act feed-del" onclick="delFeedRec(\''+colId+'\',\''+f.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg> 删除</span></div>';
  card+='</div>';
  return card;
}
/* 投喂列表展开全部（#3.2/#10）：分块追加而非一次性重建，长列表不卡顿 */
function feedShowAll(colId){
  const box=document.getElementById("feedList_"+colId);
  if(!box)return;
  const allFeeds=(state.feeds[colId]||[]).slice();
  const shown=box.querySelectorAll(".feed-card").length;
  const next=Math.min(allFeeds.length, shown+20); // 每次多渲染 20 条
  // 复用已有卡片，仅追加尚未渲染的部分
  const frag=document.createDocumentFragment();
  for(let i=shown;i<next;i++){
    const f=allFeeds[i];
    const tmp=document.createElement("div");
    tmp.innerHTML=feedCardHtml(colId,f,i);
    const node=tmp.firstElementChild;
    if(node)frag.appendChild(node);
  }
  box.appendChild(frag);
  const remaining=allFeeds.length-next;
  let more=document.getElementById("feedMore_"+colId);
  if(remaining>0){
    if(!more){ more=document.createElement("div"); more.className="feed-more-wrap"; more.id="feedMore_"+colId; box.parentNode.insertBefore(more, box.nextSibling); }
    more.innerHTML='<button class="feed-more-btn" onclick="feedShowAll(\''+colId+'\')">再加载 '+remaining+' 条（已显示 '+next+'/'+allFeeds.length+'）</button>';
  } else if(more){ more.remove(); }
}
/* 含结构化数据时，尝试自动填入对应表格（启发式，失败静默） */
function tryAutoFill(colId,type,source,summary){
  try{
    const text=(source||"")+" "+(summary||"");
    if(colId==="alert"){
      const dm=text.match(/((?:六级|国考|期末|考研|省考|教资))[^\d]*?(\d{4})[-./](\d{1,2})(?:[-./](\d{1,2}))?/);
      if(dm){const name=dm[1];let date=dm[2]+"-"+dm[3].padStart(2,"0")+(dm[4]?"-"+dm[4].padStart(2,"0"):"-01");
        const arr=state.modules.alert.panels.exams;if(!arr.some(x=>x.name===name&&x.date===date)){arr.push({id:uid(),name,date,status:"未报名"});save();toast("🔔 已自动创建考试节点："+name);}}
    }
    if(colId==="posture"){
      const wm=text.match(/体重[^\d]*?(\d+(?:\.\d+)?)\s*斤?/);
      if(wm){const arr=state.modules.posture.panels.monthly;if(!arr.some(x=>x.weight===wm[1]+"斤")){arr.push({id:uid(),date:"投喂",weight:wm[1]+"斤",waist:"",thigh:"",score:""});save();toast("📏 已自动填入体重记录");}}
    }
    if(colId==="money"){
      const am=text.match(/(?:¥|￥|花费|金额)?\s*(\d+(?:\.\d+)?)\s*(?:元|块)?/);
      const catm=text.match(/(餐饮|穿搭|护肤美妆|学习|社交|零食饮品|交通|购物|娱乐|医疗健康|其他)/);
      if(am){const arr=moneyBookData();arr.push({id:uid(),date:todayStr(),item:(source||summary||"投喂").slice(0,12),amount:parseFloat(am[1]),cat:catm?catm[1]:"其他",note:"",kind:"exp",incomeCat:"",need:"否"});save();toast("💰 已自动记入一笔账单");}}
    if(colId==="annual"){
      const wm=text.match(/体重[^\d]*?(\d+(?:\.\d+)?)\s*斤?/);
      if(wm){const arr=state.modules.annual.panels.compare;const r=arr.find(x=>x.dim==="体重");if(r&&!r.start){r.start=wm[1]+"斤";save();}}
    }
  }catch(e){}
}
