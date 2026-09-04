/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 10/18
   文件：js/10-period.js
   来源：原 index.html 第 23928–24770 行
   内容：生理期记录（数据 + 概览 + 月历标记）+ 记账功能 + 预算总览/预警
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ============ 生理期记录：数据 + 概览 + 月历标记 ============ */
function menstrualData(){
  const m=state.modules.menstrual||{panels:{records:[]}};
  m.settings=m.settings||{cycle:28,period:5,lastStart:null};
  return m;
}
/* #18 生理期周期自动修正：用实际「经期开始」记录反推平均周期，预测更准。
   仅当记录≥2次且周期落在 20~45 天区间时才采用推断值，否则回退到用户手填值。 */
function inferredCycle(m){
  // #11 自动/手动开关：手动模式直接信任用户手填值，不被推断覆盖
  const mode=(m.settings&&m.settings.cycleMode)||"auto";
  if(mode==="manual") return (m.settings&&m.settings.cycle)||28;
  try{
    const recs=(m.panels&&m.panels.records)||[];
    const flows=recs.filter(function(r){return r&&r.flow&&r.flow!=="—";}).map(function(r){return r.date;}).sort();
    if(flows.length>=2){
      const gaps=[];
      for(let i=1;i<flows.length;i++){ const g=daysBetween(flows[i-1],flows[i]); if(g>0&&g<90) gaps.push(g); }
      if(gaps.length){
        gaps.sort(function(a,b){return a-b;});
        const med=gaps[Math.floor(gaps.length/2)];
        if(med>=20&&med<=45) return med;
      }
    }
  }catch(e){}
  return (m.settings&&m.settings.cycle)||28;
}
function menstrualPhase(lastStart,cycle,period,today){
  if(!lastStart) return {name:"未记录",emoji:"🌿",tip:"在「设置」里填最近一次开始日，我来帮你预测周期。",days:0,idx:-1};
  const past=daysBetween(lastStart,today);
  if(past<0) return {name:"尚未开始",emoji:"⏳",tip:"距预测开始还有 "+(-past)+" 天。",days:-past,idx:-1};
  const inCycle=past%cycle;
  if(inCycle<period) return {name:"经期",emoji:"🩸",tip:"特殊时期，少碰冷水、多休息，吃点暖的。",days:inCycle,idx:0};
  if(inCycle<period+Math.round(cycle*0.4)) return {name:"卵泡期",emoji:"🌱",tip:"状态回升，精力充沛，适合安排重要任务。",days:inCycle-period,idx:1};
  if(inCycle<period+Math.round(cycle*0.55)) return {name:"排卵期",emoji:"🌸",tip:"易孕窗口期，注意身体信号与作息。",days:inCycle-period,idx:2};
  return {name:"黄体期",emoji:"🍂",tip:"可能情绪起伏，提前规划、温柔对待自己。",days:inCycle-period,idx:3};
}
function menstrualNextStart(lastStart,cycle,today){
  if(!lastStart) return null;
  const past=daysBetween(lastStart,today);
  if(past<0) return lastStart;
  const rem=cycle-(past%cycle);
  return addDays(today,rem);
}
function addDays(d,n){const x=new Date(d+"T00:00:00");x.setDate(x.getDate()+n);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0");}
function mdShort(d){const x=new Date(d+"T00:00:00");return (x.getMonth()+1)+"/"+x.getDate();}
function renderPeriodSection(){
  const m=menstrualData();
  const s=m.settings;
  const cyc=inferredCycle(m); // #18 实际记录反推的周期
  const today=todayStr();
  const phase=menstrualPhase(s.lastStart,cyc,s.period,today);
  const next=menstrualNextStart(s.lastStart,cyc,today);
  const records=(m.panels.records||[]);
  // 最近一次记录经期开始（以 records 中 flow 非空的日期推断）
  let lastFlow=records.filter(function(r){return r&&r.flow&&r.flow!=="—";}).map(function(r){return r.date;}).sort().pop()||null;
  const phaseColors=["#E78B9A","#8FCF9B","#E8B4C4","#E0B07A"];
  const phColor=phase.idx>=0?phaseColors[phase.idx]:"var(--gray)";
  // 月历：当前月 + 前后各 1 月，标记经期区间
  const calHtml=menstrualCalendar(Object.assign({},s,{cycle:cyc}), today, lastFlow);
  let html='<div class="card period-hero" style="border-left:3px solid '+phColor+'">'+
    '<div class="ph-top"><div class="ph-emoji">'+phase.emoji+'</div>'+
    '<div class="ph-main"><div class="ph-phase" style="color:'+phColor+'">'+phase.name+'</div>'+
    '<div class="ph-tip">'+phase.tip+'</div></div></div>';
  if(s.lastStart){
    const startInfo = lastFlow&&lastFlow!==s.lastStart ? ('（记录推断 '+mdShort(lastFlow)+'）') : '';
    html+='<div class="ph-stats">'+
      '<div class="phs"><b>'+mdShort(s.lastStart)+'</b><span>上次开始'+startInfo+'</span></div>'+
      '<div class="phs"><b>'+(next?mdShort(next):'—')+'</b><span>预计下次</span></div>'+
      '<div class="phs"><b>'+cyc+'天</b><span>平均周期'+(cyc!==s.cycle?' · 自动':'')+'</span></div>'+
      '<div class="phs"><b>'+s.period+'天</b><span>经期长度</span></div>'+
    '</div>';
  }else{
    html+='<div class="ph-set-hint">👉 在下方「周期设置」填写最近一次开始日，即可自动预测下次时间与当前阶段。</div>';
  }
  html+='</div>';
  html+=calHtml;
  // 最近症状云
  const symRecords=records.filter(function(r){return r&&r.sym;}).slice(-6).reverse();
  if(symRecords.length){
    html+='<div class="card"><h3>'+icon('heart',16)+' 近期身体信号</h3><div class="mood-cloud">'+symRecords.map(function(r){return '<span class="mood-cloud-item" title="'+r.date+'：'+esc(r.sym)+'">'+esc(r.sym.slice(0,8))+'</span>';}).join('')+'</div></div>';
  }
  return html;
}
function menstrualCalendar(s,today,lastFlow){
  const startRef = s.lastStart||lastFlow||today;
  // 计算需要标记的经期日：从 startRef 往前/往后按 cycle 推，每个 period 天为经期
  function isPeriodDay(dStr){
    const dp=daysBetween(startRef,dStr);
    if(dp<0){ // 之前：往前推整周期
      const back=Math.ceil(-dp/s.cycle)*s.cycle;
      const idx=(-dp+back)%s.cycle;
      return idx<s.period;
    }
    return (dp%s.cycle)<s.period;
  }
  // 渲染三个月视图：上月、本月、下月
  const months=[];
  const base=new Date(today+"T00:00:00");
  for(let i=-1;i<=1;i++){
    const dt=new Date(base.getFullYear(),base.getMonth()+i,1);
    months.push({y:dt.getFullYear(),m:dt.getMonth()});
  }
  let html='<div class="card period-cal"><h3>'+icon('calendar',16)+' 周期日历</h3><div class="mini-note">粉色为经期区间，会根据周期长度自动推算</div><div class="pm-wrap">';
  months.forEach(function(mo){
    const y=mo.y,m=mo.m;
    const first=new Date(y,m,1);
    const startDow=(first.getDay()+6)%7; // 周一为起点
    const days=new Date(y,m+1,0).getDate();
    let cells='';
    for(let k=0;k<startDow;k++) cells+='<span class="pm-cell empty"></span>';
    for(let d=1;d<=days;d++){
      const ds=y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
      const cls=['pm-cell'];
      if(isPeriodDay(ds)) cls.push('period');
      if(ds===today) cls.push('today');
      cells+='<span class="'+cls.join(' ')+'">'+d+'</span>';
    }
    html+='<div class="pm-month"><div class="pm-cap">'+(m+1)+'月</div><div class="pm-grid">'+cells+'</div></div>';
  });
  html+='</div></div>';
  return html;
}
function renderMenstrualSettings(){
  const m=menstrualData();const s=m.settings;
  const mode=s.cycleMode||"auto";
  return '<div class="card"><h3>'+icon('flower',16)+' 周期设置</h3>'+
    '<div class="toggle-wrap"><label class="toggle-label"><span class="toggle-text">自动推算周期（按实际记录反推）</span>'+
      '<span class="switch"><input type="checkbox" '+(mode==="auto"?"checked":"")+' onchange="setMenstrual(\'cycleMode\',this.checked?\'auto\':\'manual\')"><span class="slider"></span></span></label></div>'+
    '<div class="mini-note">关闭后仅使用下方手填的周期长度，不被记录推断覆盖。</div>'+
    '<div class="field"><label>最近一次开始日</label><input type="date" value="'+(s.lastStart||"")+'" onchange="setMenstrual(\'lastStart\',this.value)"></div>'+
    '<div class="field"><label>平均周期长度（天）'+(mode==="auto"?'（自动推算时仅供参考）':'')+'</label><input type="number" min="20" max="45" value="'+s.cycle+'" onchange="setMenstrual(\'cycle\',parseInt(this.value)||28)"></div>'+
    '<div class="field"><label>经期长度（天）</label><input type="number" min="2" max="12" value="'+s.period+'" onchange="setMenstrual(\'period\',parseInt(this.value)||5)"></div>'+
    '<div class="mini-note">数据仅保存在本机，不会上传。周期长度与经期长度用于预测下次时间与当前阶段。</div>'+
    '<div class="mb-ops" style="margin-top:10px"><button class="feed-play" onclick="openForm(\'menstrual\',\'records\',null)">'+icon('plus',14)+' 记今天</button></div>'+
    '</div>';
}
function setMenstrual(k,v){
  const m=menstrualData();m.settings=m.settings||{cycle:28,period:5,lastStart:null};
  m.settings[k]=v;state.modules.menstrual=m;save();renderModule('menstrual');
  if(k==='lastStart'&&v) toast("✅ 已记录，周期预测已更新");
}
function renderMoodPanelContent(){
  const logs=(state.modules.mood&&state.modules.mood.logs)||[];
  const t=todayStr();
  const todayLog=logs.slice().reverse().find(r=>r.date===t);
  const sorted=logs.slice().sort((a,b)=>b.date.localeCompare(a.date)||(b.ts||0)-(a.ts||0));
  let h='<div class="mood-today-quick">';
  h+='<div class="mood-emoji-row">';
  const MOJI=["😊","😌","🥰","😎","🤔","😴","😢","😡","😱","🥳","🌟","🥱"];
  MOJI.forEach(function(e){ h+='<button class="mood-em'+(todayLog&&todayLog.emoji===e?' active':'')+'" onclick="pickMood(\''+e+'\')">'+e+'</button>'; });
  h+='</div>';
  h+='<textarea id="moodNote" class="mood-note" placeholder="今天怎么样？写一句给未来的自己…" rows="2">'+esc(todayLog?todayLog.note||'':'')+'</textarea>';
  h+=voiceBtnHtml("moodNote");
  h+='<div class="modal-ops"><button class="save" onclick="saveMood()">保存今天</button>'+(todayLog?'<button class="cancel" onclick="delMood(\''+todayLog.id+'\')">删除</button>':'')+'</div>';
  h+='</div>';
  if(sorted.length){
    h+='<div class="mood-list">';
    sorted.forEach(function(r){
      h+='<div class="mood-item" onclick="delMood(\''+r.id+'\')">'+
           '<span class="mood-e">'+esc(r.emoji||'🙂')+'</span>'+
           '<span class="mood-d">'+esc((r.date||'').slice(5))+'</span>'+
           '<span class="mood-t">'+esc(r.note||'')+'</span>'+
           '<span class="mood-x">✕</span></div>';
    });
    h+='</div>';
  }else{
    h+='<div class="mini-note" style="margin-top:8px">还没有心情记录，点上方表情写下今天吧 🌸</div>';
  }
  return h;
}
function renderPanel(id,p,pi){
  const m=state.modules[id]||{panels:{}};const arr=(m.panels&&m.panels[p.key])||[];
  const pIcon={checklist:icon('check',15),table:icon('list',15),progress:icon('chart',15),study:icon('clock',15),photos:icon('image',15),countdown:icon('calendar',15),cards:icon('book',15),moneybook:icon('yen',15),funds:icon('yen',15),quote:icon('quote',15),note:icon('edit',15)}[p.type]||icon('star',15);
  let h='<div class="card"><h3>'+pIcon+esc(p.title||"")+(p.addLabel?'<span class="tag" onclick="openForm(\''+id+'\',\''+p.key+'\',null)">+ '+esc(p.addLabel)+'</span>':'')+'</h3>';
  if(id==="mood" && p.type==="note"){ h+=renderMoodPanelContent(); h+='</div>'; return h; }
  if(p.type==="checklist"){
    if(arr.length){
      const so=streakOf(arr.map(function(it){return it.doneDate;}));
      if(so.total>0){
        h+='<div class="chk-badge">'+
          '<span class="cb-fire">'+icon('fire',13)+(so.streak>0?('<b>'+so.streak+'</b>'):'')+'</span>'+
          '<span class="cb-tx">'+(so.streak>0?('已连续打卡 <b>'+so.streak+'</b> 天'):'今天还没打卡，动起来～')+'</span>'+
          '<span class="cb-total">累计 '+so.total+' 次</span>'+
        '</div>';
      }
    }
    if(!arr.length)h+=emptyStateHtml(id,p);
    arr.forEach((it,idx)=>{
      const txt=p.fields.map(f=>it[f.name]).filter(Boolean).join(" · ");
      h+='<div class="item stagger-item'+(it.done?" done":"")+'" id="item_'+it.id+'" style="--i:'+idx+'"><div class="cb" onclick="toggleCheck(\''+id+'\',\''+p.key+'\',\''+it.id+'\')">'+(it.done?"✓":"")+'</div>'+
         '<div class="body">'+esc(txt)+'</div><div class="ops"><button onclick="openForm(\''+id+'\',\''+p.key+'\',\''+it.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button><button onclick="delItem(\''+id+'\',\''+p.key+'\',\''+it.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></div></div>';
    });
  }else if(p.type==="table"){
    if(!arr.length)h+=emptyStateHtml(id,p);
    if(p.groupBy){
      const groups={},order=[];
      arr.forEach(it=>{const g=(it[p.groupBy]||"未分类");if(!groups[g]){groups[g]=[];order.push(g);}groups[g].push(it);});
      order.forEach(g=>{
        h+='<div class="grp-title">'+esc(g)+' <span class="grp-cnt">'+groups[g].length+'</span></div>';
        h+='<div class="grp-list">'+groups[g].map(it=>{
          const txt=p.columns.filter(c=>c.name!==p.groupBy).map(c=>{const v=c.type==="image"?(it[c.name]?'🖼️':'—'):esc(it[c.name]);return v;}).filter(Boolean).join(" · ");
          return '<div class="grp-item"><span>'+txt+'</span><span class="row-ops"><button onclick="openForm(\''+id+'\',\''+p.key+'\',\''+it.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button><button onclick="delItem(\''+id+'\',\''+p.key+'\',\''+it.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></span></div>';
        }).join("")+'</div>';
      });
    }else{
      h+='<table><thead><tr>'+p.columns.map(c=>'<th>'+esc(c.label)+'</th>').join("")+'<th></th></tr></thead><tbody>';
      arr.forEach(it=>{
        h+='<tr>'+p.columns.map(c=>{
          let val=it[c.name];
          if(c.type==="countdown"){val=countdownCell(it[c.dateField||c.name]);}
          else if(c.type==="formula"){val=formulaCell(p.columns,it,c);}
          else if(c.type==="image"){val=val?'<img src="'+val+'" loading="lazy" style="width:46px;height:46px;object-fit:cover;border-radius:var(--radius-sm);cursor:pointer" onclick="event.stopPropagation();bigImg(\''+encodeURIComponent(val)+'\')">':'<span style="color:#bbb">无</span>';}
          else val=esc(val);
          return '<td>'+val+'</td>';
        }).join("")+'<td><div class="row-ops"><button onclick="openForm(\''+id+'\',\''+p.key+'\',\''+it.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button><button onclick="delItem(\''+id+'\',\''+p.key+'\',\''+it.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></div></td></tr>';
      });
      h+='</tbody></table>';
    }
  }else if(p.type==="progress"){
    if(!arr.length)h+=emptyStateHtml(id,p);
    arr.forEach(it=>{
      const cur=numOf(it.cur), goal=numOf(it.goal);
      const pct=(cur!=null&&goal&&goal>0)?Math.max(0,Math.min(100,Math.round(cur/goal*100))):null;
      const reached=(pct!=null&&pct>=100);
      const ringColor=reached?'var(--accent)':'linear-gradient(135deg,var(--primary),var(--accent))';
      h+='<div class="prog-row" onclick="openForm(\''+id+'\',\''+p.key+'\',\''+it.id+'\')">';
      h+='<div class="prog-ring-wrap"><div class="ring-progress" data-value="'+(pct!=null?pct:0)+'" title="'+esc(it.name)+' '+(pct!=null?pct:'—')+'%">'+
          '<svg class="ring-svg" viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="var(--line)" stroke-width="4"></circle>'+
          '<circle cx="28" cy="28" r="24" fill="none" stroke="'+(reached?'var(--accent)':'url(#progGrad_'+id+')')+'" stroke-width="4" stroke-linecap="round" class="ring-circle"></circle></svg>'+
          '<div class="ring-center"><span class="ring-number">'+(pct!=null?pct:'—')+'%</span><span class="ring-label">完成</span></div></div></div>';
      h+='<div class="prog-main">';
      h+='<div class="prog-top"><span class="prog-name">'+esc(it.name)+'</span><span class="prog-val">'+(pct!=null?(pct+'%'):esc(it.cur||"—"))+' <small>('+esc(it.cur||"0")+' / '+esc(it.goal||"—")+')</small></span></div>';
      if(pct!=null)h+='<div class="prog-bar"><i style="width:'+pct+'%"></i></div>';
      if(it.trend){
        const hist=(it.history||[]).slice(-7);
        h+='<div class="prog-trend">'+(hist.length?hist.map(v=>'<span class="tdot" style="height:'+Math.max(4,Math.min(40,numOf(v)||0))+'px" title="'+esc(v)+'"></span>').join(""):'暂无趋势，点右侧 📈 记录')+'</div>';
        h+='<div class="prog-trend-add"><button onclick="event.stopPropagation();pushTrend(\''+id+'\',\''+p.key+'\',\''+it.id+'\')">'+icon("trending",14)+' 记录本次分数</button></div>';
      }
      h+='</div>';
      h+='</div>';
    });
    // 渐变定义（每个栏目一次）
    h+='<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="progGrad_'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="var(--primary)"/><stop offset="100%" stop-color="var(--accent)"/></linearGradient></defs></svg>';
  }else if(p.type==="study"){
    h+=renderStudy(id);
  }else if(p.type==="photos"){
    h+=renderPhotos(id);
  }else if(p.type==="countdown"){
    if(!arr.length)h+=emptyStateHtml(id,p);
    arr.forEach((it,idx)=>{const left=daysBetween(todayStr(),it.date);h+='<div class="countdown-row stagger-item" style="--i:'+idx+'"><span class="nm">'+esc(it.name)+'</span><span class="dd">'+(left>=0?left:"已过期")+'<small> 天 ('+esc(it.date)+')</small></span><span class="ops"><button onclick="openForm(\''+id+'\',\''+p.key+'\',\''+it.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button><button onclick="delItem(\''+id+'\',\''+p.key+'\',\''+it.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></span></div>';});
  }else if(p.type==="cards"){
    h+='<div class="cards-scroll">';
    arr.forEach(it=>{h+='<div class="skill-card"><div class="nm">'+esc(it.name)+'</div><div class="bar"><i style="width:'+(it.prog||0)+'%"></i></div><div class="gl">进度 '+(it.prog||0)+'% · 目标：'+esc(it.goal||"")+'</div><div class="stt">状态：'+esc(it.status||"")+'</div><div class="row-ops" style="margin-top:6px;display:flex;gap:6px;align-items:center"><button class="mini-step" onclick="stepProg(\''+id+'\',\''+p.key+'\',\''+it.id+'\',5)">+5%</button><button class="mini-step" onclick="stepProg(\''+id+'\',\''+p.key+'\',\''+it.id+'\',-5)">-5%</button><button onclick="openForm(\''+id+'\',\''+p.key+'\',\''+it.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button><button onclick="delItem(\''+id+'\',\''+p.key+'\',\''+it.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></div></div>';});
    h+='</div>';
  }else if(p.type==="moneybook"){
    h+=renderMoneyBook(id);
  }else if(p.type==="funds"){
    const f=m.panels[p.key]||{};
    h+='<div class="field"><label>本月存入</label><input type="number" value="'+(f.month||0)+'" onchange="setFund(\''+id+'\',\'month\',this.value)"></div>'+
       '<div class="field"><label>累计</label><input type="number" value="'+(f.total||0)+'" onchange="setFund(\''+id+'\',\'total\',this.value)"></div>'+
       '<div class="field"><label>下一目标</label><input type="text" value="'+esc(f.goal||"")+'" onchange="setFund(\''+id+'\',\'goal\',this.value)"></div>';
  }else if(p.type==="budget"){
    const f=m.panels[p.key]||{budget:0,fixed:0};
    const ym=todayStr().slice(0,7);
    const recs=(state.modules.money&&state.modules.money.panels&&state.modules.money.panels.book)||[];
    let exp=0,inc=0;
    recs.forEach(function(r){ if((r.date||"").slice(0,7)===ym){ if(r.kind==="income")inc+=(numOf(r.amount)||0); else exp+=(numOf(r.amount)||0); } });
    const budget=numOf(f.budget)||0, fixed=numOf(f.fixed)||0;
    const balance=budget+inc-exp-fixed;
    const used=(budget>0)?Math.min(100,Math.round((exp+fixed)/budget*100)):0;
    const cls=balance<0?'neg':'pos';
    h+='<div class="budget-wrap">'+
       '<div class="budget-balance '+(balance<0?'neg':'pos')+'"><b>'+(balance>=0?'+':'')+balance.toFixed(0)+'</b><span>本月可自由支配（结余）</span></div>'+
       '<div class="budget-bars">'+
         '<div class="bb-row"><span>收入</span><div class="bb-bar"><i style="width:'+(inc>0?Math.min(100,Math.round(inc/Math.max(budget,inc,1)*100)):'0')+'%;background:var(--accent)"></i></div><b>'+inc.toFixed(0)+'</b></div>'+
         '<div class="bb-row"><span>预算</span><div class="bb-bar"><i style="width:100%;background:var(--primary)"></i></div><b>'+budget.toFixed(0)+'</b></div>'+
         '<div class="bb-row"><span>已花</span><div class="bb-bar"><i style="width:'+used+'%;background:#d98"></i></div><b>'+(exp+fixed).toFixed(0)+'</b></div>'+
       '</div>'+
       '<div class="budget-note">'+(budget>0?(used>=100?'⚠️ 已超预算，注意节制':(used>=80?'⏳ 已用 '+used+'%，接近预算上限':'✅ 预算使用 '+used+'%，节奏健康')):'设置预算后这里会显示结余与进度')+'</div>'+
       '<div class="budget-fields">'+
         '<div class="field"><label>本月预算(元)</label><input type="number" value="'+budget.toFixed(0)+'" onchange="setBudget(\''+id+'\',\'budget\',this.value)"></div>'+
         '<div class="field"><label>固定支出(元)</label><input type="number" value="'+fixed.toFixed(0)+'" onchange="setBudget(\''+id+'\',\'fixed\',this.value)"></div>'+
       '</div></div>';
  }else if(p.type==="quote"){
    h='<div class="card" style="text-align:center;background:var(--glass-solid)"><div style="font-size:18px;font-style:italic;color:var(--ink)">'+esc(p.text)+'</div></div>';
    return h;
  }
  h+='</div>';
  return h;
}
function countdownCell(date){if(!date)return "—";const left=daysBetween(todayStr(),date);return left>=0?(left+"天"):"已过期";}
function formulaCell(cols,row,c){
  if(c.name==="balance"){const b=parseFloat(row.budget)||0;const a=parseFloat(row.actual)||0;return (b-a);}
  return "—";
}
function bigImg(data){const w=window.open("");if(w)w.document.write('<img src="'+decodeURIComponent(data)+'" style="width:100%">');}

function toggleCheck(id,key,iid){const arr=getPanelData(id,key,[]);if(!arr.length)return;const it=arr.find(x=>x.id===iid);if(!it)return;const wasDone=it.done;it.done=!it.done;it.doneDate=it.done?todayStr():null;const t=todayStr();if(it.done){if(!state.meta.checkinDays.includes(t))state.meta.checkinDays.push(t);}else{state.meta.checkinDays=state.meta.checkinDays.filter(x=>x!==t);}save();renderModule(id);if(it.done&&!wasDone){flashItem(iid);}}
function flashItem(iid){requestAnimationFrame(function(){const el=document.getElementById("item_"+iid);if(!el)return;el.classList.add("just-done");el.addEventListener("animationend",function handler(e){if(e.animationName==="halo-flash"){el.classList.remove("just-done");el.removeEventListener("animationend",handler);}},{once:true});});}
/** 删除某栏目分区中的一条记录（带确认）。 */
function delItem(id,key,iid){
  if(!confirm("确定删除？"))return;
  const m=state.modules[id];
  if(!m||!m.panels||!Array.isArray(m.panels[key]))return;
  const arr=m.panels[key];
  const idx=arr.findIndex(function(x){return x.id===iid;});
  if(idx<0)return;
  const it=arr[idx];
  const nm=String((it&&(it.title||it.task||it.name||it.text))||"").slice(0,14);
  undoableDelete(nm?("「"+nm+"」"):"",
    function(){ removePanelItem(id,key,iid); save(); renderModule(id); return true; },
    function(){ const a=(state.modules[id]&&state.modules[id].panels[key])||[];
                a.splice(Math.min(idx,a.length),0,it); state.modules[id].panels[key]=a; save(); renderModule(id); });
}
function stepProg(id,key,iid,d){
  const arr=state.modules[id].panels[key];const it=arr.find(x=>x.id===iid);if(!it)return;
  const before=parseInt(it.prog||0,10),st0=it.status;
  it.prog=Math.max(0,Math.min(100,(before+d)));
  if(it.prog>=100)it.status="已完成";else if(it.prog>0&&it.status==="未开始")it.status="进行中";
  save();renderModule(id);
  // 每点一下都弹提示会刷屏，只在跨过里程碑时说一句
  const nm=String(it.title||it.task||"").slice(0,12);
  if(it.prog>=100&&before<100)toast("🎉 "+(nm?("「"+nm+"」"):"")+"已完成");
  else if(st0==="未开始"&&it.status==="进行中")toast("🚀 已开始："+nm);
}
function setFund(id,field,val){const f=state.modules[id].panels["fund"];f[field]=(field==="goal"?val:(parseFloat(val)||0));save();toast("💰 资金池已更新");}
function setBudget(id,field,val){const f=state.modules[id].panels["budget"]||{budget:0,fixed:0};f[field]=(parseFloat(val)||0);state.modules[id].panels["budget"]=f;save();toast("💡 预算已更新");}
function numOf(s){if(s==null)return null;const m=String(s).match(/-?\d+(\.\d+)?/);return m?parseFloat(m[0]):null;}
function pushTrend(id,key,iid){const arr=getPanelData(id,key,[]);if(!arr.length)return;const it=arr.find(x=>x.id===iid);if(!it)return;it.history=it.history||[];it.history.push(it.cur);save();renderModule(id);toast("📈 已记录趋势："+it.cur);}
function renderStudy(id){
  const m=state.modules[id];m.study=m.study||{};
  const today=todayStr();const todayMin=m.study[today]||0;
  const days=[];const base=new Date();
  for(let i=6;i>=0;i--){const d=new Date(base);d.setDate(base.getDate()-i);const s=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");days.push({s,min:m.study[s]||0});}
  const maxMin=Math.max(30,...days.map(x=>x.min));
  const bars=days.map(x=>'<div class="study-col"><div class="study-bar" style="height:'+(maxMin?Math.round(x.min/maxMin*60):0)+'px"></div><div class="study-d">'+x.s.slice(5)+'</div><div class="study-n">'+x.min+'</div></div>').join("");
  const chartDays=(window._studyChartDays&&window._studyChartDays[id])||7;
  const h='<div class="study-widget">'+
    '<div class="study-today">今日已学 <b>'+todayMin+'</b> 分钟 · 近7天累计 <b>'+days.reduce((a,b)=>a+b.min,0)+'</b> 分钟</div>'+
    '<div class="study-bars">'+bars+'</div>'+
    '<div class="study-add"><input id="studyIn_'+id+'" type="number" placeholder="本次分钟" min="1">'+
    '<button onclick="addStudyTime(\''+id+'\',document.getElementById(\'studyIn_'+id+'\').value)"><svg class="svg-ic" viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14"/></svg> 记录</button></div>'+
    '<div class="study-chart"><div class="study-chart-head"><span>📈 学习时长趋势</span>'+
      '<span class="seg"><button data-d="7" class="'+(chartDays===7?"on":"")+'" onclick="setStudyChartDays(\''+id+'\',7)">7天</button><button data-d="30" class="'+(chartDays===30?"on":"")+'" onclick="setStudyChartDays(\''+id+'\',30)">30天</button></span></div>'+
    '<canvas id="studyChart_'+id+'" width="340" height="130" style="width:100%;height:130px;display:block"></canvas></div>'+
    '</div>';
  return h;
}
/* 专注计时器（六级 / 考公栏目顶部的 ⏱） */
let focusState={id:null,running:false,startTs:0,acc:0,tick:null,goalReached:false,visPaused:false};
function focusFmt(ms){const s=Math.floor(ms/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");}
function focusGoalMin(id){const g=parseInt((state.modules[id]&&state.modules[id].focusGoal)||25);return isNaN(g)||g<1?25:g;}
function focusRender(id){const el=document.getElementById("focusTime_"+id);if(el)el.textContent=focusFmt(focusState.acc+(focusState.running?Date.now()-focusState.startTs:0));}
function renderFocusBtns(id){
  const b=document.getElementById("focusBtns_"+id);if(!b)return;
  b.innerHTML=focusState.running
    ? '<button class="feed-play" onclick="pauseFocus(\''+id+'\')">⏸ 暂停</button><button class="feed-play" onclick="stopFocus(\''+id+'\')">⏹ 结束并记录</button>'
    : '<button class="feed-play" onclick="startFocus(\''+id+'\')">▶ 开始专注</button>'+(focusState.acc>0?'<button class="feed-play" onclick="stopFocus(\''+id+'\')">⏹ 结束并记录</button>':'');
}
function setFocusGoal(id,v){const g=parseInt(v);if(isNaN(g)||g<1)return;state.modules[id].focusGoal=g;save();toast("🍅 目标时长已设为 "+g+" 分钟");}
function startFocus(id){
  focusState.id=id;
  if(focusState.running){pauseFocus(id);return;}
  focusState.running=true;focusState.startTs=Date.now();focusState.goalReached=false;
  if(focusState.tick)clearInterval(focusState.tick);
  focusState.tick=setInterval(function(){
    focusRender(id);
    const goalMs=focusGoalMin(id)*60000;
    const el=document.getElementById("focusTime_"+id);
    if(el)el.style.color=(focusState.acc+(Date.now()-focusState.startTs)>=goalMs)?"var(--accent)":"";
    if(!focusState.goalReached && (focusState.acc+(Date.now()-focusState.startTs))>=goalMs){
      focusState.goalReached=true;
      toast("⏰ 已专注满 "+focusGoalMin(id)+" 分钟，目标达成！可继续或结束记录");
      try{ if(navigator.vibrate)navigator.vibrate([200,100,200]); }catch(e){}
      notify("🍅 专注目标达成", "已专注满 "+focusGoalMin(id)+" 分钟，休息一下吧");
      try{ beep("done"); }catch(e){}
    }
  },1000);
  focusRender(id);renderFocusBtns(id);
}
function pauseFocus(id){
  if(focusState.running){focusState.acc+=Date.now()-focusState.startTs;focusState.running=false;}
  if(focusState.tick){clearInterval(focusState.tick);focusState.tick=null;}
  focusRender(id);renderFocusBtns(id);
}
function stopFocus(id){
  if(focusState.running){focusState.acc+=Date.now()-focusState.startTs;focusState.running=false;}
  if(focusState.tick){clearInterval(focusState.tick);focusState.tick=null;}
  const mins=Math.round(focusState.acc/60000);
  const reached=focusState.goalReached;
  focusState.acc=0;focusState.id=null;focusState.goalReached=false;
  const el=document.getElementById("focusTime_"+id);if(el)el.style.color="";
  if(mins>0){
    addStudyTime(id,mins);
    if(reached)autoCheckStudyItem(id,mins);
    toast("✅ 专注 "+mins+" 分钟已计入学习时长"+(reached?"，已自动勾选今日学习打卡 ✨":""));
    if(reached){ notify("✅ 专注结束", "本次专注 "+mins+" 分钟，已记入学习时长"); try{ beep("done"); }catch(e){} }
  }
  else{toast("专注时间太短，未记录");renderFocusBtns(id);}
}
function autoCheckStudyItem(id,mins){
  try{
    const p=MODULE_DEFS[id].panels.find(x=>x.key==="daily");
    if(!p)return;
    const arr=state.modules[id].panels[p.key];
    const t=todayStr();
    const kw=/学习|备考|六级|公考|考研|专注|复习|刷题|单词/;
    let target=arr.find(it=>!it.done&&kw.test(it.text||it.task||""));
    if(!target){target={id:uid(),text:"🍅 专注学习 "+mins+" 分钟",task:"🍅 专注学习 "+mins+" 分钟",done:false,doneDate:null};arr.push(target);}
    if(!target.done){target.done=true;target.doneDate=t;if(!state.meta.checkinDays.includes(t))state.meta.checkinDays.push(t);}
    save();
  }catch(e){}
}
function drawStudyChart(id){
  const cv=document.getElementById("studyChart_"+id);if(!cv)return;
  const m=state.modules[id];const study=(m&&m.study)||{};
  const daysN=(window._studyChartDays&&window._studyChartDays[id])||7;
  const data=[];const base=new Date();
  for(let i=daysN-1;i>=0;i--){const d=new Date(base);d.setDate(base.getDate()-i);const s=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");data.push(study[s]||0);}
  const ctx=cv.getContext("2d");const W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);
  const pad=14,max=Math.max(30,...data);
  const css=getComputedStyle(document.documentElement);
  const accent=css.getPropertyValue("--accent").trim()||"#888";
  const primary=css.getPropertyValue("--primary").trim()||"#2C2C2C";
  // 网格
  ctx.strokeStyle="rgba(150,150,150,0.15)";ctx.lineWidth=1;
  for(let g=0;g<=4;g++){const y=pad+(H-2*pad)*g/4;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-pad,y);ctx.stroke();}
  const bw=(W-2*pad)/data.length;
  // 柱
  data.forEach((v,i)=>{const bh=(H-2*pad)*(v/max);const x=pad+bw*i+bw*0.22;const w=bw*0.56;const y=H-pad-bh;const grad=ctx.createLinearGradient(0,y,0,H-pad);grad.addColorStop(0,accent);grad.addColorStop(1,primary);ctx.fillStyle=grad;ctx.fillRect(x,y,w,Math.max(0,bh));});
  // 折线
  ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.beginPath();
  data.forEach((v,i)=>{const x=pad+bw*i+bw/2;const y=H-pad-(H-2*pad)*(v/max);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();
  // 数值标注
  ctx.fillStyle="rgba(120,120,120,0.85)";ctx.font="9px sans-serif";ctx.textAlign="center";
  const step=Math.ceil(data.length/7);
  data.forEach((v,i)=>{if(i%step===0){const x=pad+bw*i+bw/2;ctx.fillText(v+"'",x,H-2);}});
}
function setStudyChartDays(id,days){
  window._studyChartDays=window._studyChartDays||{};window._studyChartDays[id]=days;
  drawStudyChart(id);
  const cv=document.getElementById("studyChart_"+id);if(!cv)return;
  const btns=cv.parentNode.querySelectorAll(".seg button");
  btns.forEach(b=>b.classList.toggle("on",parseInt(b.getAttribute("data-d"))===days));
}
function addStudyTime(id,mins){
  mins=parseInt(mins,10);if(!mins||mins<=0){toast("⚠️ 请输入有效的分钟数");return;}
  const m=state.modules[id];m.study=m.study||{};const t=todayStr();m.study[t]=(m.study[t]||0)+mins;save();renderModule(id);toast("✅ 已记录 "+mins+" 分钟");
}

/* ============ 记账功能（金玉收支账） ============ */
function moneyBookData(){
  const m=state.modules.money;m.panels.book=m.panels.book||[];
  return m.panels.book;
}
function moneyCats(){state.meta.money=state.meta.money||{};return state.meta.money.cats||["餐饮","穿搭","护肤美妆","学习","社交","零食饮品","交通","购物","娱乐","医疗健康","其他"];}
function moneyIncomeCats(){state.meta.money=state.meta.money||{};return state.meta.money.incomeCats||["工资","奖学金","兼职","红包","理财","其他"];}
function moneyBudgets(){state.meta.money=state.meta.money||{};state.meta.money.budgets=state.meta.money.budgets||{};return state.meta.money.budgets;}
function monthKeyOf(d){return (d||"").slice(0,7);}
function renderMoneyBook(id){
  const recs=moneyBookData().slice().sort((a,b)=> (b.date+a.id).localeCompare(a.date+a.id));
  const cats=moneyCats();const budgets=moneyBudgets();
  // 当前查看月份
  let cur=window._moneyMonth||todayStr().slice(0,7);
  window._moneyMonth=cur;
  const thisMonth=recs.filter(r=>monthKeyOf(r.date)===cur);
  const filterFrom=window._moneyFilterFrom||"", filterTo=window._moneyFilterTo||"";
  const searchKw=(window._moneySearch||"").trim().toLowerCase();
  const catFilter=window._moneyCatFilter||"";
  let view=thisMonth;
  if(filterFrom||filterTo){
    view=recs.filter(r=> (!filterFrom||r.date>=filterFrom)&&(!filterTo||r.date<=filterTo));
  }
  // #16 关键字搜索 + 分类筛选
  if(catFilter){
    view=view.filter(r=> (r.kind==="income"? (r.incomeCat||"其他") : (r.cat||"其他"))===catFilter);
  }
  if(searchKw){
    view=view.filter(r=>{
      const hay=((r.item||"")+" "+(r.note||"")+" "+(r.cat||"")+" "+(r.incomeCat||"")).toLowerCase();
      return hay.indexOf(searchKw)>=0;
    });
  }
  // 汇总
  let exp=0,inc=0;const byCat={};cats.forEach(c=>byCat[c]=0);
  // parseFloat：导入的旧数据里 amount 可能是字符串，直接 += 会变成字符串拼接
  thisMonth.forEach(r=>{ const a=parseFloat(r.amount)||0; if(r.kind==="income"){inc+=a;} else {exp+=a;byCat[r.cat]=(byCat[r.cat]||0)+a;} });
  const net=inc-exp;
  // 预算预警
  const warns=[];const totalBudget=Object.values(budgets).reduce((a,b)=>a+(parseFloat(b)||0),0);
  cats.forEach(c=>{const b=parseFloat(budgets[c]);if(b>0&&byCat[c]>b*0.8)warns.push({c,cur:byCat[c],b,over:byCat[c]>b});});
  // B1：进度环数据
  const expPctOfBudget = totalBudget>0 ? Math.min(100, Math.round(exp/totalBudget*100)) : 0;
  const balanceRate = (inc+exp)>0 ? Math.round(Math.max(0,net)/(inc+exp)*100) : 0;
  const ringSvg=function(val,color,label){ return '<div class="ring-progress" data-value="'+val+'" title="'+label+' '+val+'%">'+
      '<svg class="ring-svg" viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="var(--line)" stroke-width="4"></circle>'+
      '<circle cx="28" cy="28" r="24" fill="none" stroke="'+color+'" stroke-width="4" stroke-linecap="round" class="ring-circle"></circle></svg>'+
      '<div class="ring-center"><span class="ring-number">'+val+'%</span><span class="ring-label">'+label+'</span></div></div>'; };
  const h=''+
  '<div class="card accent-money"><h3>📊 本月概览</h3><div class="mb-summary">'+
    '<div class="mb-sum"><b style="color:#d98">-'+exp.toFixed(2)+'</b><span>本月支出</span></div>'+
    '<div class="mb-sum"><b style="color:#7a8">+'+inc.toFixed(2)+'</b><span>本月收入</span></div>'+
    '<div class="mb-sum"><b class="'+(net>=0?"mb-pos":"mb-neg")+'">'+(net>=0?"+":"")+net.toFixed(2)+'</b><span>本月结余</span></div>'+
  '</div>'+
  '<div class="mb-rings">'+
    '<div class="mb-ring"><div class="ring-progress-wrap">'+ringSvg(expPctOfBudget,'var(--accent)','支出/预算')+'</div><div class="mb-ring-cap">支出占预算<b>'+exp.toFixed(0)+' / '+totalBudget.toFixed(0)+'</b></div></div>'+
    '<div class="mb-ring"><div class="ring-progress-wrap">'+ringSvg(balanceRate,'#7a8','结余率')+'</div><div class="mb-ring-cap">结余率<b>'+net.toFixed(0)+'</b></div></div>'+
  '</div>'+
  '<div class="mb-bar"><canvas id="mbPie_'+id+'" width="320" height="220" style="width:100%;height:220px;display:block"></canvas></div>'+
  (warns.length?'<div class="mb-warn">'+(warns.map(w=>'⚠️ '+(w.over?'【'+w.c+'】已超预算 '+w.cur.toFixed(0)+'/'+w.b+' 元！':w.c+' 已用 '+Math.round(w.cur/w.b*100)+'%，接近预算上限')).join('<br>'))+'</div>':'')+
  '</div>'+
  moneySpanHtml(id, moneyCumulative())+
  moneyYearRingHtml()+
  '<div class="card"><h3>📈 本月支出趋势</h3><div class="mb-trend"><canvas id="mbTrend_'+id+'" width="340" height="120" style="width:100%;height:120px;display:block"></canvas></div></div>'+
  '<div class="card"><h3>📊 分类明细</h3><div class="mb-catlist">'+
    cats.map(c=>{
      const v=byCat[c]||0;const b=parseFloat(budgets[c])||0;
      const overAmt=(b>0&&v>b)?(v-b):0;                 // 超支金额
      const pct=b>0?Math.min(100,Math.round(v/b*100)):0;
      const share=exp>0?Math.round(v/exp*100):0;
      const barColor=overAmt>0?'#d9534f':(pct>=80?'#e8a33d':'');
      return '<div class="mb-cat'+(overAmt>0?' mb-cat-over':'')+'">'+
        '<span class="mb-cat-n">'+esc(c)+(overAmt>0?'<em class="mb-over-tag">已超支 ¥'+overAmt.toFixed(0)+'</em>':'')+'</span>'+
        '<span class="mb-cat-v'+(overAmt>0?' over':'')+'">¥'+v.toFixed(2)+(b>0?' / 预算¥'+b:'')+'</span>'+
        (b>0?'<span class="mb-cat-bar"><i style="width:'+pct+'%;background:'+barColor+'"></i></span>':'')+
        '<span class="mb-cat-pct">占总支出 '+share+'%</span></div>';
    }).join('')+
  '</div></div>'+
  '<div class="card"><h3>📋 记账明细</h3><div class="mb-ops"><button class="feed-play" onclick="openMoneyForm(\''+id+'\',\'exp\')">'+icon("money",14)+' 记一笔支出</button><button class="btn-ghost" onclick="openMoneyForm(\''+id+'\',\'income\')">'+icon("money",14)+' 记一笔收入</button></div>'+
  '<div class="mb-filter"><div style="font-size:12px;color:var(--text);display:flex;gap:6px;align-items:center;flex-wrap:wrap">'+
    '<span>🔍 搜索：</span><input type="search" class="mb-search" placeholder="备注/项目关键字" value="'+esc(window._moneySearch||"")+'" oninput="window._moneySearch=this.value;renderModule(\''+id+'\')">'+
    '<span>分类：</span><select class="mb-cat-sel" onchange="window._moneyCatFilter=this.value;renderModule(\''+id+'\')">'+
      '<option value="">全部</option>'+
      (cats.map(c=>'<option value="'+esc(c)+'" '+(c===catFilter?"selected":"")+'>'+esc(c)+'</option>').join(''))+
    '</select>'+
    '<span>📅 按月：</span><select onchange="moneySwitchMonth(this.value)">'+
      (monthsAvailable(recs).map(mo=>'<option value="'+mo+'" '+(mo===cur?"selected":"")+'>'+mo+'</option>').join(''))+
    '</select>'+
    '<span>或范围：</span><input type="date" value="'+filterFrom+'" onchange="window._moneyFilterFrom=this.value;renderModule(\''+id+'\')">至<input type="date" value="'+filterTo+'" onchange="window._moneyFilterTo=this.value;renderModule(\''+id+'\')"><button class="feed-act" onclick="window._moneyFilterFrom=\'\';window._moneyFilterTo=\'\';window._moneySearch=\'\';window._moneyCatFilter=\'\';renderModule(\''+id+'\')">清除</button>'+
  '</div></div>'+
  '<div class="mb-list">'+
    (view.length?'':'<div class="empty-state" style="padding:18px 0"><div class="es-illu">'+emptyIllu('money')+'<span class="es-deco">✿</span></div><div class="es-tip">还没有记账记录</div><div class="es-sub">'+(filterFrom||filterTo?'该范围内暂无记录':'点上方「记一笔」开始记录本月收支 🌸')+'</div></div>')+
    view.map((r,idx)=>{
      const tag=r.kind==="income"?('💰 '+esc(r.incomeCat||"其他")):('🏷 '+esc(r.cat||"其他"));
      return '<div class="mb-item stagger-item" style="--i:'+idx+'">'+
        '<div class="mb-item-main"><div class="mb-item-top"><span class="mb-item-item">'+esc(r.item||"未命名")+'</span><span class="mb-item-amt '+(r.kind==="income"?"mb-inc":"")+'">'+(r.kind==="income"?"+":"-")+parseFloat(r.amount).toFixed(2)+'</span></div>'+
        '<div class="mb-item-sub"><span class="mb-item-date">'+esc(r.date)+'</span><span class="mb-item-cat">'+tag+'</span>'+(r.note?'<span class="mb-item-note">📝 '+esc(r.note)+'</span>':'')+'</div></div>'+
        '<div class="mb-item-ops"><button onclick="openMoneyForm(\''+id+'\',\''+(r.kind||"exp")+'\',\''+r.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button><button onclick="delMoneyRec(\''+id+'\',\''+r.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></div>'+
      '</div>';
    }).join('')+
  '</div></div>'+
  '<div style="margin-top:10px"><button class="add-btn" onclick="openCatManage()">管理分类 / 预算</button></div>';
  // 延迟绘制图表
  setTimeout(function(){ try{ drawMoneyPie(id,byCat,cats); }catch(e){console.warn('饼图失败',e);} try{ drawMoneyTrend(id,thisMonth); }catch(e){console.warn('趋势图失败',e);} },0);
  return h;
}
/* ===== 记账·年度预算总览 =====
   单月和跨月累计都只能看到「一段」的开销，年度视角才能回答
   「今年到底花超了没有」。环形图用 SVG stroke-dasharray 画，不依赖任何图表库。 */
function moneyYearStats(){
  const recs=(state.modules.money&&state.modules.money.panels.book)||[];
  const y=String(new Date().getFullYear());
  let yExp=0,yInc=0;
  recs.forEach(function(r){
    if((r.date||"").slice(0,4)!==y) return;
    if(r.kind==="income") yInc+=(numOf(r.amount)||0);
    else yExp+=(numOf(r.amount)||0);
  });
  const mm=(state.meta&&state.meta.money)||{};
  const bf=(state.modules.money&&state.modules.money.panels.budget)||{budget:0,fixed:0};
  const monthly=(numOf(bf.budget)||0)+(numOf(bf.fixed)||0);
  let yb=parseFloat(mm.yearBudget);
  if(!(yb>0)) yb=monthly*12;                    // 未单独设置时，按月预算 ×12 推一个
  const monthsElapsed=new Date().getMonth()+1;
  const pct=yb>0?Math.round(yExp/yb*100):0;
  return {year:y, yExp:yExp, yInc:yInc, yBudget:yb, monthly:monthly,
          monthsElapsed:monthsElapsed, pct:pct,
          pacePct:Math.round(monthsElapsed/12*100),   // 时间进度，用来判断「花得比时间快」
          left:yb-yExp, hasCustom:parseFloat(mm.yearBudget)>0};
}
function moneyYearRingHtml(){
  const s=moneyYearStats();
  if(!(s.yBudget>0)) return "";
  const R=52, C=2*Math.PI*R;
  const shown=Math.max(0,Math.min(100,s.pct));
  const off=C*(1-shown/100);
  const over=s.yExp>s.yBudget;
  const ahead=s.pct-s.pacePct;
  const color=over?"#d9534f":(ahead>8?"#e8a33d":"#3aa76d");
  let note;
  if(over) note="⚠️ 已超出年度预算 ¥"+Math.round(-s.left)+(ahead>0?("，且比时间进度快 "+Math.round(ahead)+" 个百分点"):"");
  else if(ahead>8) note="⏳ 花得比时间快 "+Math.round(ahead)+" 个百分点，按这个节奏年底会超支";
  else note="✅ 支出节奏健康，慢于时间进度";
  return '<div class="card"><h3>🎯 '+s.year+' 年度预算</h3>'+
    '<div class="yr-wrap">'+
      '<svg class="yr-ring" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="年度预算使用 '+shown+'%">'+
        '<circle cx="60" cy="60" r="'+R+'" fill="none" stroke="var(--glass-border)" stroke-width="10"/>'+
        '<circle cx="60" cy="60" r="'+R+'" fill="none" stroke="'+color+'" stroke-width="10" stroke-linecap="round"'+
          ' stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'" transform="rotate(-90 60 60)"/>'+
        '<text x="60" y="57" text-anchor="middle" font-size="21" font-weight="700" fill="var(--ink)">'+shown+'%</text>'+
        '<text x="60" y="75" text-anchor="middle" font-size="10" fill="var(--gray)">已用 ¥'+Math.round(s.yExp)+'</text>'+
      '</svg>'+
      '<div class="yr-tx">'+
        '<div class="yr-row"><span>年度预算</span><b>¥'+Math.round(s.yBudget)+(s.hasCustom?"":" <em>(按月推)</em>")+'</b></div>'+
        '<div class="yr-row"><span>今年支出</span><b>¥'+Math.round(s.yExp)+'</b></div>'+
        '<div class="yr-row"><span>今年收入</span><b>¥'+Math.round(s.yInc)+'</b></div>'+
        '<div class="yr-row"><span>剩余额度</span><b class="'+(s.left<0?"neg":"pos")+'">¥'+Math.round(s.left)+'</b></div>'+
        '<div class="yr-row"><span>时间进度</span><b>'+s.pacePct+'%</b></div>'+
      '</div>'+
    '</div>'+
    '<div class="yr-note">'+note+'</div>'+
    '<div style="margin-top:8px"><button class="btn-ghost" onclick="setYearBudget()">'+(s.hasCustom?"修改年度预算":"单独设置年度预算")+'</button></div>'+
  '</div>';
}
function setYearBudget(){
  try{
    const s=moneyYearStats();
    const v=prompt("设置 "+s.year+" 年度总预算（元）\n留空则按「月预算 × 12」自动推算", s.hasCustom?String(Math.round(s.yBudget)):"");
    if(v===null) return;
    state.meta=state.meta||{}; state.meta.money=state.meta.money||{};
    const num=parseFloat(v);
    if(!(num>0)){ delete state.meta.money.yearBudget; save(); refreshCurrentView(); toast("已恢复为按月预算自动推算"); return; }
    state.meta.money.yearBudget=num; save(); refreshCurrentView();
    toast("✅ 年度预算已设为 ¥"+Math.round(num));
  }catch(e){ toast("⚠️ 设置失败"); }
}
/* ===== 记账·跨月累计预算预警 =====
   单月口径有个盲区：这个月花超、下个月省回来，账面上每个月都「还行」，
   累计其实早就超了。这里按「月预算 × 月数」做累计口径，
   把「累计超支金额」和「连续超支月数」两件事暴露出来。 */
function moneySpan(){
  const n=parseInt(window._moneySpan,10);
  return (n===3||n===6||n===12)?n:6;
}
function moneyCumulative(){
  const N=moneySpan();
  const recs=moneyBookData();
  const budgets=moneyBudgets();
  const monthBudget=Object.keys(budgets).reduce(function(a,k){return a+(parseFloat(budgets[k])||0);},0);
  // 最近 N 个月的 key（含当月）
  const keys=[];const now=new Date();
  for(let i=N-1;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    keys.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));
  }
  const expM={},incM={};
  keys.forEach(function(k){expM[k]=0;incM[k]=0;});
  recs.forEach(function(r){
    const k=monthKeyOf(r.date);
    if(!Object.prototype.hasOwnProperty.call(expM,k))return;
    const a=parseFloat(r.amount)||0;
    if(r.kind==="income")incM[k]+=a; else expM[k]+=a;
  });
  let totalExp=0,totalInc=0;
  keys.forEach(function(k){totalExp+=expM[k];totalInc+=incM[k];});
  const totalBudget=monthBudget*N;
  const gap=totalExp-totalBudget;                       // >0 就是累计超支
  // 最近连续超支月数：从最新一个月往回数，遇到没超的就停
  let streak=0;
  for(let i=keys.length-1;i>=0;i--){
    if(monthBudget>0&&expM[keys[i]]>monthBudget+1e-9)streak++;
    else break;
  }
  let overMonths=0;
  keys.forEach(function(k){ if(monthBudget>0&&expM[k]>monthBudget+1e-9)overMonths++; });
  const used=totalBudget>0?Math.round(totalExp/totalBudget*100):0;
  // 分级：累计超支 > 接近上限 > 健康
  let level="ok";
  if(monthBudget>0&&gap>0)level="bad";
  else if(monthBudget>0&&used>=85)level="warn";
  return {N:N,keys:keys,expM:expM,incM:incM,monthBudget:monthBudget,
          totalExp:totalExp,totalInc:totalInc,totalBudget:totalBudget,
          gap:gap,used:used,streak:streak,overMonths:overMonths,level:level,
          hasBudget:monthBudget>0};
}
function moneySetSpan(id,n){ window._moneySpan=n; renderModule(id); }
function moneySpanHtml(id,s){
  if(!s.hasBudget){
    return '<div class="card"><h3>📅 跨月累计</h3>'+
      '<div class="mini-note">给分类设好预算后，这里会按「月预算 × 月数」累计统计，'+
      '把单月口径下看不出来的连续超支揪出来。</div></div>';
  }
  const seg=[3,6,12].map(function(n){
    return '<button class="seg-item'+(n===s.N?" on":"")+'" onclick="moneySetSpan(\''+id+'\','+n+')" '+
           'aria-label="查看近 '+n+' 个月">'+n+'月</button>';
  }).join('');
  let txt;
  if(s.level==="bad"){
    txt='🚨 累计超支 <b>'+s.gap.toFixed(0)+'</b> 元'+
        (s.streak>=2?('，且已<b>连续 '+s.streak+' 个月</b>超支 —— 不是偶发，是节奏问题'):
                     (s.overMonths>1?('（'+s.overMonths+' 个月单月超支）'):''));
  }else if(s.level==="warn"){
    txt='⏳ 累计已用 <b>'+s.used+'%</b>，接近近'+s.N+'个月的总预算上限，留点余量';
  }else{
    txt='✅ 近'+s.N+'个月累计使用 <b>'+s.used+'%</b>，节奏健康'+
        (s.overMonths?('（其中 '+s.overMonths+' 个月单月超支，但已被其他月份补回来）'):'');
  }
  // 每月支出条：灰色底 + 实际支出条 + 预算位置刻度线
  let maxV=s.monthBudget;
  s.keys.forEach(function(k){ if(s.expM[k]>maxV)maxV=s.expM[k]; });
  if(maxV<=0)maxV=1;
  const rows=s.keys.map(function(k){
    const v=s.expM[k], b=s.monthBudget;
    const pct=Math.min(140,Math.round(v/maxV*100));
    const over=b>0&&v>b+1e-9;
    const near=b>0&&!over&&v>b*0.85;
    const col=over?'var(--danger-ink)':(near?'var(--warn-ink)':'var(--accent)');
    return '<div class="mb-month">'+
      '<span class="mb-month-k">'+esc(k.slice(5))+'月</span>'+
      '<div class="mb-month-bar"><i style="width:'+pct+'%;background:'+col+'"></i>'+
        (b>0?'<u style="left:'+Math.min(100,Math.round(b/maxV*100))+'%"></u>':'')+'</div>'+
      '<span class="mb-month-v'+(over?' over':'')+'">'+v.toFixed(0)+(b>0?(' / '+b.toFixed(0)):'')+'</span>'+
    '</div>';
  }).join('');
  return '<div class="card"><h3>📅 跨月累计 <span class="mb-span-seg">'+seg+'</span></h3>'+
    '<div class="mb-cum-top">'+
      '<div class="mb-cum"><b>-'+s.totalExp.toFixed(0)+'</b><span>累计支出</span></div>'+
      '<div class="mb-cum"><b>'+s.totalBudget.toFixed(0)+'</b><span>累计预算</span></div>'+
      '<div class="mb-cum"><b class="'+(s.gap>0?"mb-neg":"mb-pos")+'">'+(s.gap>0?"+":"")+s.gap.toFixed(0)+'</b><span>'+(s.gap>0?"累计超支":"预算结余")+'</span></div>'+
    '</div>'+
    '<div class="mb-months">'+rows+'</div>'+
    '<div class="mb-cum-note lv-'+s.level+'">'+txt+'</div>'+
  '</div>';
}
function monthsAvailable(recs){
  const set=new Set(recs.map(r=>monthKeyOf(r.date)).filter(Boolean));
  set.add(todayStr().slice(0,7));
  return Array.from(set).sort().reverse();
}
function moneySwitchMonth(mo){window._moneyMonth=mo;window._moneyFilterFrom="";window._moneyFilterTo="";renderModule("money");}
function drawMoneyPie(id,byCat,cats){
  const cv=document.getElementById("mbPie_"+id);if(!cv)return;
  const ctx=cv.getContext("2d");const W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);
  const data=cats.map((c,i)=>({c,v:byCat[c]||0})).filter(x=>x.v>0);
  const total=data.reduce((a,b)=>a+b.v,0);
  const css=getComputedStyle(document.documentElement);
  const accent=css.getPropertyValue("--accent").trim()||"#888";
  const pal=css.getPropertyValue("--primary").trim()||"#2C2C2C";
  const colors=["#D4C5B0","#C4B5A0","#E8C4C4","#A8B8A0","#8FA8C7","#B9AED0","#E0B4BC","#E5CDA8","#92C7BB","#C97B4A","#AAAAAA","#C0C0C0"];
  const cx=W*0.36,cy=H/2,R=Math.min(W*0.34,H*0.42);
  if(total<=0){ctx.fillStyle="rgba(150,150,150,0.5)";ctx.font="13px sans-serif";ctx.textAlign="center";ctx.fillText("本月暂无支出",cx,cy);drawMoneyLegend(cv,data,colors,cx,cy,R);return;}
  let ang=-Math.PI/2;
  data.forEach((d,i)=>{const a2=ang+d.v/total*Math.PI*2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,ang,a2);ctx.closePath();ctx.fillStyle=colors[i%colors.length];ctx.fill();ang=a2;});
  // 中心文字
  ctx.fillStyle=accent;ctx.font="bold 16px sans-serif";ctx.textAlign="center";ctx.fillText("¥"+total.toFixed(0),cx,cy-4);
  ctx.fillStyle="rgba(120,120,120,0.8)";ctx.font="10px sans-serif";ctx.fillText("总支出",cx,cy+12);
  drawMoneyLegend(cv,data,colors,cx,cy,R);
}
function drawMoneyLegend(cv,data,colors,cx,cy,R){
  const ctx=cv.getContext("2d");const lx=R*2+24,ly=cy-R;
  ctx.textAlign="left";ctx.font="11px sans-serif";
  data.forEach((d,i)=>{const yy=ly+i*18;ctx.fillStyle=colors[i%colors.length];ctx.fillRect(lx,yy-8,10,10);ctx.fillStyle="rgba(80,80,80,0.9)";ctx.fillText(d.c+" "+Math.round(d.v/totalOf(data)*100)+"%",lx+14,yy);});
}
function totalOf(d){return d.reduce((a,b)=>a+b.v,0);}
function drawMoneyTrend(id,thisMonth){
  const cv=document.getElementById("mbTrend_"+id);if(!cv)return;
  const ctx=cv.getContext("2d");const W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);
  const pad=14;const daysInMonth=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
  const cur=window._moneyMonth||todayStr().slice(0,7);
  const ym=cur.split("-");const year=parseInt(ym[0]),month=parseInt(ym[1]);
  const data=new Array(daysInMonth).fill(0);
  thisMonth.forEach(r=>{if(r.kind!=="income"){const d=parseInt((r.date||"").slice(8,10));if(d>=1&&d<=daysInMonth)data[d-1]+=r.amount;}});
  const max=Math.max(30,...data);
  const css=getComputedStyle(document.documentElement);
  const accent=css.getPropertyValue("--accent").trim()||"#888";
  const primary=css.getPropertyValue("--primary").trim()||"#2C2C2C";
  ctx.strokeStyle="rgba(150,150,150,0.15)";ctx.lineWidth=1;
  for(let g=0;g<=3;g++){const y=pad+(H-2*pad)*g/3;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-pad,y);ctx.stroke();}
  const bw=(W-2*pad)/data.length;
  data.forEach((v,i)=>{const bh=(H-2*pad)*(v/max);const x=pad+bw*i+bw*0.22;const w=bw*0.56;const y=H-pad-bh;const grad=ctx.createLinearGradient(0,y,0,H-pad);grad.addColorStop(0,accent);grad.addColorStop(1,primary);ctx.fillStyle=grad;ctx.fillRect(x,y,w,Math.max(0,bh));});
  ctx.fillStyle="rgba(120,120,120,0.85)";ctx.font="9px sans-serif";ctx.textAlign="center";
  const step=Math.ceil(data.length/8);
  data.forEach((v,i)=>{if(i%step===0){const x=pad+bw*i+bw/2;ctx.fillText((i+1),x,H-2);}});
}
function openMoneyForm(id,kind,iid){
  const arr=moneyBookData();const item=iid?arr.find(x=>x.id===iid):null;
  const cats=moneyCats();const incCats=moneyIncomeCats();
  const isInc=kind==="income";
  let html='<h3>'+(iid?"编辑":"记一笔")+(isInc?" · 收入":" · 支出")+'</h3>';
  html+='<div class="field"><label>日期</label><input id="mf_date" type="date" value="'+(item?item.date:todayStr())+'"></div>';
  html+='<div class="field"><label>'+(isInc?"收入类型":"消费分类")+'</label><select id="mf_cat">'+
    (isInc?incCats:cats).map(c=>'<option '+(item&&(item.cat===c||item.incomeCat===c)?"selected":"")+'>'+esc(c)+'</option>').join('')+'</select></div>';
  html+='<div class="field"><label>项目/说明</label><input id="mf_item" type="text" placeholder="如：和朋友聚餐 / 一套真题" value="'+esc(item?item.item:"")+'"></div>';
  html+='<div class="field"><label>金额（元）</label><input id="mf_amt" type="number" step="0.01" placeholder="0.00" value="'+esc(item?item.amount:"")+'"></div>';
  html+='<div class="field"><label>备注（可选）</label><input id="mf_note" type="text" placeholder="如：朋友请客 / 双十一凑单" value="'+esc(item?item.note:"")+'"></div>';
  html+='<div class="modal-ops"><button class="cancel" onclick="closeModal()">取消</button><button class="save" onclick="saveMoneyForm(\''+id+'\',\''+kind+'\',\''+(iid||"")+'\')">保存</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
}
function saveMoneyForm(id,kind,iid){
  const date=$("#mf_date").value||todayStr();
  const cat=$("#mf_cat").value;const item=$("#mf_item").value.trim()||"未命名";
  const amount=parseFloat($("#mf_amt").value)||0;const note=$("#mf_note").value.trim();
  if(amount<=0){toast("⚠️ 金额需大于 0");return;}
  const arr=moneyBookData();
  const budgets=moneyBudgets();
  if(iid){const it=arr.find(x=>x.id===iid);Object.assign(it,{date,item,amount,note,kind:kind==="income"?"income":"exp",cat:kind==="income"?"":cat,incomeCat:kind==="income"?cat:"",need:it.need||"否"});}
  else{arr.push({id:uid(),date,item,amount,note,kind:kind==="income"?"income":"exp",cat:kind==="income"?"":cat,incomeCat:kind==="income"?cat:"",need:"否"});}
  save();closeModal();renderModule(id);
  if(currentView==="profile"){ try{ renderProfile($("#view-profile")); }catch(e){} }
  if(kind!=="income"&&budgets[cat]){const cur=arr.filter(r=>r.kind!=="income"&&r.cat===cat&&monthKeyOf(r.date)===monthKeyOf(date)).reduce((a,b)=>a+b.amount,0);if(cur>budgets[cat])toast("🚨 "+cat+" 已超预算！");else if(cur>budgets[cat]*0.8)toast("⚠️ "+cat+" 已用 "+Math.round(cur/budgets[cat]*100)+"%");}
  else toast("✅ 已保存");
}
function delMoneyRec(id,iid){
  if(!confirm("删除这条记录？"))return;
  const arr=(state.modules.money&&state.modules.money.panels&&state.modules.money.panels.book)||[];
  const idx=arr.findIndex(function(x){return x.id===iid;});
  if(idx<0)return;
  const it=arr[idx];
  undoableDelete("一笔账单",
    function(){ state.modules.money.panels.book=arr.filter(function(x){return x.id!==iid;}); save(); renderModule(id); return true; },
    function(){ const a=(state.modules.money&&state.modules.money.panels&&state.modules.money.panels.book)||[];
                a.splice(Math.min(idx,a.length),0,it); state.modules.money.panels.book=a; save(); renderModule(id); });
}
function openCatManage(){
  const cats=moneyCats();const budgets=moneyBudgets();const incCats=moneyIncomeCats();
  let html='<h3>分类与预算管理</h3>';
  html+='<div class="grp-title">消费分类 <span class="grp-cnt">'+cats.length+'</span></div>';
  html+='<div class="grp-list" id="catMgrList">'+cats.map((c,i)=>'<div class="grp-item"><span>'+esc(c)+'</span><span class="row-ops"><button onclick="catEdit(\''+i+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button><button onclick="catDel(\''+i+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></span></div>').join('')+'</div>';
  html+='<button class="add-btn" style="margin-top:8px" onclick="catAdd()"><svg class="svg-ic" viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14"/></svg> 新增分类</button>';
  html+='<div class="grp-title" style="margin-top:12px">每月预算（元）</div>';
  html+='<div id="budgetMgr">'+cats.map(c=>'<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><span style="flex:1;font-size:13px">'+esc(c)+'</span><input type="number" style="width:100px;padding:6px;border:1px solid var(--glass-border);border-radius:var(--radius-sm);background:var(--glass-flat);color:var(--text)" value="'+(budgets[c]||"")+'" placeholder="不限" onchange="setBudget(\''+c.replace(/'/g,"\\'")+'\',this.value)"></div>').join('')+'</div>';
  html+='<div class="grp-title" style="margin-top:12px">收入分类</div>';
  html+='<div class="grp-list" id="incCatMgr">'+incCats.map((c,i)=>'<div class="grp-item"><span>'+esc(c)+'</span><span class="row-ops"><button onclick="incCatEdit(\''+i+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button><button onclick="incCatDel(\''+i+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></span></div>').join('')+'</div>';
  html+='<button class="add-btn" style="margin-top:8px" onclick="incCatAdd()"><svg class="svg-ic" viewBox="0 0 24 24" width="12" height="12"><path d="M12 5v14M5 12h14"/></svg> 新增收入分类</button>';
  html+='<div class="modal-ops"><button class="save" onclick="closeModal()">完成</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
}
function setBudget(cat,val){state.meta.money=state.meta.money||{};state.meta.money.budgets=state.meta.money.budgets||{};const v=parseFloat(val);state.meta.money.budgets[cat]=isNaN(v)?"":v;save();toast("✅ 预算已更新");}
function catAdd(){const c=prompt("新分类名称：");if(!c)return;state.meta.money=state.meta.money||{};state.meta.money.cats=state.meta.money.cats||[];
  // 重名时原来什么都不发生，用户只会以为没点上
  if(state.meta.money.cats.includes(c)){toast("⚠️ 分类「"+c+"」已存在");}
  else{state.meta.money.cats.push(c);save();toast("✅ 已新增分类「"+c+"」");}
  openCatManage();}
function catEdit(i){const cats=moneyCats();const c=prompt("修改分类名称：",cats[i]);if(!c)return;cats[i]=c;save();openCatManage();}
function catDel(i){const cats=moneyCats();if(cats.length<=1){toast("⚠️ 至少保留一个分类");return;}if(!confirm("删除分类「"+cats[i]+"」？已有该分类的账单会标记为「其他」"))return;const nm=cats[i];cats.splice(i,1);moneyBookData().forEach(r=>{if(r.cat===nm)r.cat="其他";});save();openCatManage();}
function incCatAdd(){const c=prompt("新收入分类：");if(!c)return;state.meta.money=state.meta.money||{};state.meta.money.incomeCats=state.meta.money.incomeCats||[];
  if(state.meta.money.incomeCats.includes(c)){toast("⚠️ 收入分类「"+c+"」已存在");}
  else{state.meta.money.incomeCats.push(c);save();toast("✅ 已新增收入分类「"+c+"」");}
  openCatManage();}
function incCatEdit(i){const c=prompt("修改收入分类：",moneyIncomeCats()[i]);if(!c)return;moneyIncomeCats()[i]=c;save();openCatManage();}
function incCatDel(i){const c=moneyIncomeCats();if(c.length<=1){toast("⚠️ 至少保留一个");return;}c.splice(i,1);save();openCatManage();}
