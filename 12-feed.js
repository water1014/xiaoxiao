/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 12/18
   文件：js/12-feed.js
   来源：原 index.html 第 25674–26593 行
   内容：表单弹窗 + 各栏目投喂记录 + 标签选择器 + 天气定位与城市选择
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ============ 表单弹窗 ============ */
let formCtx=null;
function openForm(id,key,iid){
  const p=MODULE_DEFS[id].panels.find(x=>x.key===key);const arr=state.modules[id].panels[key];
  const item=iid?arr.find(x=>x.id===iid):null;formCtx={id,key,iid,p};
  let html='<h3>'+(iid?"编辑":"添加")+' · '+esc(p.title||"")+'</h3>';
  const fields=p.type==="funds"?p.fields:p.columns||p.fields;
  (fields||[]).forEach(c=>{
    const val=item?item[c.name]:"";
    if(c.type==="image"){
      html+='<div class="field"><label>'+esc(c.label)+'</label><div class="imgpick" id="imgpick" style="'+(val?('background-image:url('+val+')'):'')+'">'+(val?"点击更换":"点击上传图片 📷")+'</div></div>';
    }else if(c.type==="select"){
      html+='<div class="field"><label>'+esc(c.label)+'</label><select id="f_'+c.name+'">'+c.options.map(o=>'<option '+(val==o?"selected":"")+'>'+esc(o)+'</option>').join("")+'</select></div>';
    }else if(c.type==="textarea"){
      html+='<div class="field"><label>'+esc(c.label)+'</label><textarea id="f_'+c.name+'">'+esc(val)+'</textarea></div>';
    }else{
      const tp=c.type==="number"?"number":(c.type==="date"?"date":"text");
      let dv=val; if(c.type==="date" && !dv) dv=todayStr();
      html+='<div class="field"><label>'+esc(c.label)+'</label><input id="f_'+c.name+'" type="'+tp+'" value="'+esc(dv)+'"></div>';
      /* 快选标签：像「症状」这种每次都要手打几个字的字段，
         点一下就填好，还能自己维护标签库（存在 chipsSrc 指向的路径里）。 */
      const chips=fieldChips(c);
      if(chips.length){
        const cur=String(val||"").split(/[、,，\s]+/).filter(Boolean);
        html+='<div class="chip-row" id="chips_'+c.name+'">'+
          chips.map(function(t){
            return '<button type="button" class="chip-btn'+(cur.indexOf(t)>=0?' on':'')+'" onclick="chipsToggle(\''+c.name+'\',this)">'+esc(t)+'</button>';
          }).join("")+
          (c.chipsSrc?'<button type="button" class="chip-btn chip-add" onclick="editChips(\''+esc(c.chipsSrc)+'\')">＋ 管理</button>':'')+
          '</div>';
      }
    }
  });
  html+='<div class="modal-ops"><button class="cancel" onclick="closeModal()">取消</button><button class="save" onclick="saveForm()">保存</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
  const ip=$("#imgpick");if(ip)ip.onclick=()=>pickImage("__tmpimg",()=>{const t=getPath("__tmpimg");ip.style.backgroundImage="url("+t+")";ip.textContent="点击更换";formCtx._img=t;setPath("__tmpimg",null);});
}
/* 快选标签库：优先读用户自定义（chipsSrc 指向的路径），
   第一次使用时把字段自带的默认标签写进去，之后就以用户维护的为准。 */
function fieldChips(c){
  try{
    const def=Array.isArray(c&&c.chips)?c.chips:[];
    if(c&&c.chipsSrc){
      const custom=getPath(c.chipsSrc);
      if(Array.isArray(custom)&&custom.length) return custom;
      if(def.length){ setPath(c.chipsSrc,def.slice()); try{ save(); }catch(e){} }
    }
    return def;
  }catch(e){ return Array.isArray(c&&c.chips)?c.chips:[]; }
}
/* 点一下标签：往对应输入框里加/删这个词（用「、」连接，自动去重） */
function chipsToggle(name,btn){
  try{
    const input=document.getElementById("f_"+name);
    if(!input||!btn) return;
    const tag=(btn.textContent||"").trim();
    if(!tag) return;
    const cur=(input.value||"").split(/[、,，\s]+/).filter(Boolean);
    const i=cur.indexOf(tag);
    if(i>=0){ cur.splice(i,1); btn.classList.remove("on"); }
    else{ cur.push(tag); btn.classList.add("on"); }
    input.value=cur.join("、");
    try{ haptic(8); }catch(e){}
  }catch(e){}
}
/* 自定义标签库（用在「＋ 管理」按钮上） */
function editChips(pathStr){
  try{
    const cur=fieldChips({chipsSrc:pathStr});
    const v=prompt("自定义标签，用逗号或顿号分隔（最多 20 个）", cur.join("，"));
    if(v===null) return;
    const arr=String(v).split(/[、,，\s]+/).map(function(x){return x.trim();}).filter(Boolean).slice(0,20);
    setPath(pathStr,arr); save();
    toast(arr.length?("✅ 已保存 "+arr.length+" 个标签"):"已清空标签库");
    // 用新标签库重开当前表单
    try{ if(formCtx&&formCtx.id) openForm(formCtx.id,formCtx.key,formCtx.iid); }catch(e){}
  }catch(e){ toast("⚠️ 保存失败"); }
}
function saveForm(){
  const {id,key,iid,p}=formCtx;const arr=state.modules[id].panels[key];
  const fields=p.type==="funds"?p.fields:p.columns||p.fields;const obj={};
  fields.forEach(c=>{
    if(c.type==="image"){obj[c.name]=formCtx._img!=null?formCtx._img:(iid?arr.find(x=>x.id===iid)[c.name]:"");}
    else{const el=$("#f_"+c.name);obj[c.name]=el?el.value:"";}
  });
  if(p.type==="funds"){state.modules[id].panels[key]=obj;}
  else if(iid){const it=arr.find(x=>x.id===iid);Object.assign(it,obj);}
  else{obj.id=uid();if(p.type==="checklist"){obj.done=false;obj.doneDate=null;}arr.push(obj);}
  save();closeModal();
  if(currentView==="home")renderHome();else renderModule(id);
}
function closeModal(){$("#modalMask").classList.remove("show");const box=$("#modalBox");if(box)box.classList.remove("ticket");formCtx=null;}
function initModalClose(){
  const mask=$("#modalMask");if(!mask||initModalClose._on)return;initModalClose._on=true;
  const inject=function(){
    const box=$("#modalBox");if(!box)return;
    if(box.querySelector(".modal-close"))return;
    const b=document.createElement("button");
    b.className="modal-close";b.innerHTML='<svg class="svg-ic" viewBox="0 0 24 24" width="18" height="18"><path d="M6 6l12 12M18 6L6 18"/></svg>';b.setAttribute("onclick","closeModal()");b.setAttribute("aria-label","关闭");
    box.insertBefore(b,box.firstChild);
  };
  const mo=new MutationObserver(function(){ if(mask.classList.contains("show"))setTimeout(inject,0); });
  mo.observe(mask,{attributes:true,attributeFilter:["class"]});
  if(mask.classList.contains("show"))inject();
}

/* ============ 各栏目投喂记录区 ============ */
function nowStamp(){const d=new Date();const p=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+":"+p(d.getMinutes());}
function daysSince(s){if(!s)return 99;return daysBetween(s,todayStr());}
function typeLabel(t){return FEED_TYPES[t]||t;}
function feedRecord(colId,type,source,summary,dataUrl){
  state.feeds[colId]=state.feeds[colId]||[];
  const f={id:uid(),time:nowStamp(),type,source:sanitizeUrl(source||"")||"",summary:sanitizeText(summary||""),dataUrl:dataUrl?(sanitizeUrl(dataUrl,true)||null):null,tag:autoTag(sanitizeUrl(source||"")||"",sanitizeText(summary||""),"")};
  state.feeds[colId].unshift(f);
  save();tryAutoFill(colId,type,source,summary);
  return f;
}
function colTitle(id){return id==="home"?"首页":(MODULE_DEFS[id]?MODULE_DEFS[id].title:id);}
function feedFromInput(colId){
  const el=$("#feedIn_"+colId);if(!el)return;const v=el.value.trim();if(!v)return;
  const title=colTitle(colId);
  const url=v.match(/https?:\/\/\S+/);
  if(url){
    const link=url[0];const note=(v.replace(link,"").trim())||"链接待整理";
    const f=feedRecord(colId,"link",link,note);
    autoFetchFeed(colId,f.id,link);
    el.value="";renderModule(colId);
    toast("✅ 已投喂链接到【"+title+"】，正在后台抓取标题/摘要…");
  }else{
    feedRecord(colId,"text","",v);
    el.value="";renderModule(colId);
    toast("✅ 文字记录已存入【"+title+"】");
  }
}
function feedUpload(colId,type){
  const title=colTitle(colId);
  if(type==="image"){const arr=state.feeds[colId]||[];const n=arr.filter(x=>x.type==="image").length;if(n>=5){toast("⚠️ 图片最多保留 5 张，请先删除旧图再上传。");return;}}
  const inp=document.createElement("input");inp.type="file";
  if(type==="image")inp.accept="image/*";
  inp.onchange=()=>{const f=inp.files[0];if(!f)return;
    if(type==="image"){compressImage(f,(data,err)=>{
        if(err){toast(err);return;}
        feedRecord(colId,"image",f.name,"已存档图片",data);renderModule(colId);toast("✅ 图片已上传到【"+title+"】，已存档");
      });}
    else{feedRecord(colId,"file",f.name,"已上传文件："+f.name);renderModule(colId);toast("✅ 文件已记录到【"+title+"】");}
  };
  inp.click();
}
function autoTag(link,title,summary){
  const t=((link||"")+" "+(title||"")+" "+(summary||"")).toLowerCase();
  const map=[
    [/bilibili|bv[0-9a-z]{10}|b23\.tv|哔哩|acg\.tv/, "B站视频"],
    [/xiaohongshu|xhslink|小红书|红书|xiaohongshu\.com/, "小红书"],
    [/weibo|微博|weibo\.com/, "微博"],
    [/douyin|抖音|ies\.douyin\.com|v\.douyin/, "抖音"],
    [/zhihu|知乎|zhuanlan\.zhihu/, "知乎"],
    [/mp\.weixin|公众号|微信文章|weixin\.qq\.com/, "公众号"],
    [/youtube|youtu\.be/, "YouTube"],
    [/英语|四级|六级|cet|考研|单词|词汇|gre|toefl/, "学习"],
    [/穿搭|护肤|美妆|妆容|口红|发型|瘦身/, "变美"],
    [/公考|行测|申论|公务员|国考|省考/, "考公"],
    [/饮食|减脂|食谱|健身|体重|运动/, "健康"],
    [/电影|剧|综艺|音乐|歌|专辑|演唱会/, "娱乐"],
    [/书|阅读|读书|名著|小说/, "阅读"]
  ];
  for(let i=0;i<map.length;i++){ if(map[i][0].test(t)) return map[i][1]; }
  return "其他";
}
function feedPlatformIcon(tag){
  const map={"B站视频":"📺","小红书":"📕","微博":"🐦","抖音":"🎵","知乎":"💡","公众号":"📰","YouTube":"▶️","学习":"📖","变美":"💄","考公":"⚔️","健康":"🥗","娱乐":"🎬","阅读":"📚"};
  return map[tag]||"🔖";
}
function autoFetchFeed(colId,fid,link){
  fetchPageText(link).then(function(html){
    if(!html)return;
    const d=extractMeta(html,link)||{};
    const rec=(state.feeds[colId]||[]).find(x=>x.id===fid);if(!rec)return;
    const title=d.title||"";const desc=d.description||d.firstPara||"";
    if(title&&(rec.summary==="链接待整理"||!rec.summary))rec.summary=(title+(desc?(" —— "+(desc.length>80?desc.slice(0,80)+"…":desc)):""));
    rec.tag=autoTag(link,title,rec.summary);
    save();renderModule(colId);
    // 抓到了页面但什么都读不出来：关键词匹配大概率是瞎猜的，请用户确认一下
    if(!title&&!desc){ openFeedTagPicker(colId,fid,rec.tag); }
  }).catch(function(){
    /* 抓取失败（链接需要登录 / 反爬 / 断网）：以前是静默跳过，
       结果标签要么是猜的要么空着，整理时还得一条条改。
       这里直接把标签选择器递上去，顺手就选了。 */
    try{
      const rec=(state.feeds[colId]||[]).find(x=>x.id===fid);
      openFeedTagPicker(colId,fid,(rec&&rec.tag)||"其他");
    }catch(e){}
  });
}
/* ===== 投喂·手动标签选择器 ===== */
function feedTagList(){
  const base=["B站视频","小红书","微博","抖音","知乎","公众号","YouTube","学习","变美","考公","健康","娱乐","阅读","其他"];
  let custom=[];
  try{ custom=getPath("meta.feedCustomTags")||[]; }catch(e){ custom=[]; }
  if(!Array.isArray(custom))custom=[];
  return base.concat(custom.filter(function(t){ return base.indexOf(t)<0; }));
}
function openFeedTagPicker(colId,fid,currentTag){
  try{
    const all=feedTagList();
    const html='<h3>🏷 这个链接是什么类型？</h3>'+
      '<div class="mini-note">没能自动识别内容，手动选一个吧；也可以直接输入新标签，它会自动进入以后的候选列表。</div>'+
      '<div class="chip-row" id="ftpRow">'+
        all.map(function(t){
          return '<button type="button" class="chip-btn'+(t===currentTag?' on':'')+'" onclick="feedTagPick(this)">'+esc(t)+'</button>';
        }).join("")+
      '</div>'+
      '<div class="field"><label>或输入新标签</label><input id="ftpNew" placeholder="例如：设计灵感"></div>'+
      '<div class="modal-ops"><button class="cancel" onclick="closeModal()">跳过</button>'+
      '<button class="save" onclick="feedTagSave(\''+colId+'\',\''+fid+'\')">保存</button></div>';
    openModalBox(html);
  }catch(e){}
}
function feedTagPick(btn){
  const row=document.getElementById("ftpRow");
  if(!row||!btn)return;
  Array.prototype.forEach.call(row.querySelectorAll(".chip-btn"),function(b){ b.classList.remove("on"); });
  btn.classList.add("on");
  const inp=document.getElementById("ftpNew"); if(inp) inp.value="";   // 手选优先，清掉输入框
  try{ haptic(8); }catch(e){}
}
function feedTagSave(colId,fid){
  try{
    const row=document.getElementById("ftpRow");
    const on=row?row.querySelector(".chip-btn.on"):null;
    const inp=document.getElementById("ftpNew");
    const typed=inp?String(inp.value||"").trim():"";
    const tag=typed||(on?String(on.textContent||"").trim():"");
    if(!tag){ toast("⚠️ 先选一个标签，或输入新标签"); return; }
    // 新标签自动进候选列表，下次就是现成的了（内置标签不重复存，避免列表越来越臃肿）
    let custom=[];
    try{ custom=getPath("meta.feedCustomTags")||[]; }catch(e){ custom=[]; }
    if(!Array.isArray(custom))custom=[];
    const isBuiltIn=["B站视频","小红书","微博","抖音","知乎","公众号","YouTube","学习","变美","考公","健康","娱乐","阅读","其他"].indexOf(tag)>=0;
    if(!isBuiltIn && custom.indexOf(tag)<0){ custom.push(tag); setPath("meta.feedCustomTags",custom); }
    const rec=(state.feeds[colId]||[]).find(function(x){ return x.id===fid; });
    if(rec){ rec.tag=tag; }
    save(); closeModal();
    try{ renderModule(colId); }catch(e){}
    toast("🏷 已标记为「"+tag+"」");
  }catch(e){ toast("⚠️ 保存失败"); }
}
/* 手动改标签入口：直接点投喂卡片上的标签也能改 */
function editFeedTag(colId,fid){
  const rec=(state.feeds[colId]||[]).find(function(x){ return x.id===fid; });
  if(!rec){ toast("⚠️ 找不到这条投喂"); return; }
  openFeedTagPicker(colId,fid,rec.tag||"其他");
}
function filterFeedList(colId,val){
  val=(val||"").trim().toLowerCase();
  const list=document.getElementById("feedList_"+colId);if(!list)return;
  const clr=document.querySelector("#feedSearch_"+colId+" ~ .feed-clear");
  if(clr)clr.style.display=val?"":"none";
  applyFeedFilter(colId,val);
}
function clearFeedSearch(colId){
  const inp=document.getElementById("feedSearch_"+colId);if(inp)inp.value="";
  const clr=document.querySelector("#feedSearch_"+colId+" ~ .feed-clear");if(clr)clr.style.display="none";
  applyFeedFilter(colId,"");
}
function feedTypeFilter(colId,key){
  window["_fft_"+colId]=key;
  const box=document.getElementById("feedTypeFilter_"+colId);if(box)box.querySelectorAll(".ff-chip").forEach(c=>c.classList.remove("on"));
  const chips=document.getElementById("feedTypeFilter_"+colId);if(chips){const all=chips.querySelectorAll(".ff-chip");for(let i=0;i<all.length;i++){if(all[i].getAttribute("onclick").indexOf("'"+key+"'")>=0)all[i].classList.add("on");}}
  const val=(document.getElementById("feedSearch_"+colId)||{}).value||"";
  applyFeedFilter(colId,val.trim().toLowerCase());
}
function applyFeedFilter(colId,val){
  const list=document.getElementById("feedList_"+colId);if(!list)return;
  const key=window["_fft_"+colId]||"";
  list.querySelectorAll(".feed-card").forEach(c=>{
    const txt=c.textContent.toLowerCase();
    let ok=!val||txt.indexOf(val)>=0;
    if(ok&&key){
      if(key.indexOf("type:")===0)ok=c.getAttribute("data-type")===key.slice(5);
      else if(key.indexOf("tag:")===0)ok=(c.getAttribute("data-tag")||"")===key.slice(4);
    }
    c.style.display=ok?"":"none";
  });
  const cnt=list.querySelectorAll('.feed-card:not([style*="display: none"])').length;
  const tip=document.getElementById("feedSearchTip_"+colId);if(tip)tip.textContent=(val||key)?("匹配 "+cnt+" 条"):"";
}
function filterFeedBox(val){
  val=(val||"").trim().toLowerCase();
  const clr=document.querySelector("#feedboxSearch ~ .feed-clear");
  if(clr)clr.style.display=val?"":"none";
  document.querySelectorAll("#view-module .feedbox-item").forEach(c=>{
    c.style.display=(!val||c.textContent.toLowerCase().indexOf(val)>=0)?"":"none";
  });
}
function clearFeedBoxSearch(){
  const inp=document.getElementById("feedboxSearch");if(inp)inp.value="";
  const clr=document.querySelector("#feedboxSearch ~ .feed-clear");if(clr)clr.style.display="none";
  document.querySelectorAll("#view-module .feedbox-item").forEach(c=>{c.style.display="";});
}
function feedPlatformHint(url){
  if(/bilibili\.com|b23\.tv/.test(url))return {ic:"📺",t:"哔哩哔哩",act:"window.open('"+url+"','_blank')"};
  if(/xiaohongshu\.com|xhslink\.com/.test(url))return {ic:"📕",t:"小红书",act:"window.open('"+url+"','_blank')"};
  if(/zhihu\.com/.test(url))return {ic:"📘",t:"知乎",act:"window.open('"+url+"','_blank')"};
  if(/weibo\.com/.test(url))return {ic:"🔶",t:"微博",act:"window.open('"+url+"','_blank')"};
  if(/douyin\.com/.test(url))return {ic:"🎵",t:"抖音",act:"window.open('"+url+"','_blank')"};
  return null;
}
function feedDigest(colId,fid){
  try{
    const f=(state.feeds[colId]||[]).find(x=>x.id===fid);if(!f)return;
    const row=document.getElementById("feedDigestRow_"+colId+"_"+fid);
    const box=document.getElementById("feedDigest_"+colId+"_"+fid);
    if(!row||!box)return;
    if(row.style.display!=="none"){row.style.display="none";return;}
    box.innerHTML='<div class="mini-note" style="padding:6px">⏳ 正在抓取并提炼…（可能需要几秒）</div>';
    row.style.display="";
    // 小红书笔记：结构化提炼（标题/正文/图片文字/评论/相关性）
    if(/xiaohongshu\.com|xhslink\.com/.test(f.source||"")){ feedDigestXhs(colId,fid,f,row,box); return; }
    const ph=feedPlatformHint(f.source);
    const phHtml=ph?('<div style="margin-bottom:6px"><span class="feed-ph">'+ph.ic+' '+ph.t+'</span> <button class="feed-play" style="padding:4px 10px;font-size:12px" onclick="'+ph.act+'">打开 ↗</button></div>'):'';
    fetchPageText(f.source).then(function(html){
      if(!html){
        box.innerHTML=phHtml+'<div class="mini-note" style="padding:6px">⚠️ 抓取失败：该网站有反爬/跨域限制。可点上方「打开」查看，或把链接发给我（说「喂给 XX」），我帮你提炼。</div>';
        return;
      }
      const d=extractMeta(html,f.source);
      const title=d.title||f.source.slice(0,40);
      const summary=(d.content&&d.content.length>1?d.content:(d.description||d.firstPara||""));
      const kws=d.keywords?('🏷 '+(d.keywords.split(/[,，、]/).slice(0,6).join(" / "))):"";
      const hasContent=summary&&summary.trim().length>0&&!/^[\s\W\d]*$/.test(summary);
      const api=state.meta.apiCfg||{};
      const hasKey=(api.key||(api.keys&&api.keys[api.provider]&&api.keys[api.provider].length));
      if(hasKey){
        box.innerHTML=phHtml+'<div class="mini-note" style="padding:6px">🤖 已抓取到内容，正在调用 AI 提炼核心观点…</div>';
        clubExtract(f.source,title,summary).then(function(res){
          box.innerHTML=phHtml+'<div style="padding:6px;font-size:13px;line-height:1.7">'+
            '<div style="font-weight:600;color:var(--ink)">📌 '+esc(res.title)+'</div>'+
            '<div style="margin-top:4px;color:var(--text)">'+esc((res.core||'').slice(0,220))+'</div>'+
            (res.tags&&res.tags.length?'<div style="margin-top:4px;color:var(--accent-ink)">🏷 '+esc(res.tags.join(' / '))+'</div>':'')+
            '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">'+
            '<button class="feed-play" onclick="feedAdoptDigest(\''+colId+'\',\''+fid+'\')">'+icon("checkCircle",14)+' 采纳为摘要</button>'+
            '<button class="feed-play" onclick="feedToTask(\''+colId+'\',\''+fid+'\')">'+icon("arrowRight",14)+' 转任务</button>'+
            '<button class="feed-play" onclick="clubSaveDigestFromFeed(\''+colId+'\',\''+fid+'\')">'+icon("disk",14)+' 存知识卡</button>'+
            '<button class="feed-play" onclick="document.getElementById(\'feedDigestRow_'+colId+'_'+fid+'\').style.display=\'none\'">收起</button>'+
            '</div></div>';
        }).catch(function(e){ // 降级规则，并给出可读错误提示
          console.warn('AI 提炼失败，降级规则提取',e);
          const errTip=e?apiErrHtml(e):'';
          box.innerHTML=phHtml+(errTip?('<div style="margin-bottom:6px">'+errTip+'</div>'):'')+ruleDigestHtml(colId,fid,title,summary,kws,hasContent);
        });
        return;
      }
      box.innerHTML=phHtml+ruleDigestHtml(colId,fid,title,summary,kws,hasContent);
    }).catch(function(e){
      console.warn('feedDigest 抓取/解析失败',e);
      box.innerHTML=phHtml+'<div class="mini-note" style="padding:6px">⚠️ 处理出错：'+(e&&e.message?e.message.slice(0,120):'未知错误')+'</div>';
    });
  }catch(e){
    console.warn('feedDigest 异常',e);
  }
}
function ruleDigestHtml(colId,fid,title,summary,kws,hasContent){
  return '<div style="padding:6px;font-size:13px;line-height:1.7">'+
    '<div style="font-weight:600;color:var(--ink)">📌 '+esc(title)+'</div>'+
    (hasContent?'<div style="margin-top:4px;color:var(--text)">'+esc(summary.slice(0,200))+(summary.length>200?"…":"")+'</div>':'<div class="mini-note" style="margin-top:4px">⚠️ 暂未提取到知识内容，可手动输入摘要</div>')+
    (kws?'<div style="margin-top:4px">'+kws+'</div>':'')+
    '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">'+
    (hasContent?'<button class="feed-play" onclick="feedAdoptDigest(\''+colId+'\',\''+fid+'\')">'+icon("checkCircle",14)+' 采纳为摘要</button>':'')+
    '<button class="feed-play" onclick="feedToTask(\''+colId+'\',\''+fid+'\')">'+icon("arrowRight",14)+' 转任务</button>'+
    '<button class="feed-play" onclick="document.getElementById(\'feedDigestRow_'+colId+'_'+fid+'\').style.display=\'none\'">收起</button>'+
    '</div></div>';
}
/* 小红书笔记结构化提炼：标题 / 正文 / 图片文字(OCR) / 评论 / 相关性判断 */
function feedDigestXhs(colId,fid,f,row,box){
  try{
    box.innerHTML='<div class="mini-note" style="padding:6px">📕 正在解析小红书笔记（标题/正文/图片文字/评论/相关性）…</div>';
    const ph='<div style="margin-bottom:6px"><span class="feed-ph">📕 小红书</span> <button class="feed-play" style="padding:4px 10px;font-size:12px" onclick="window.open(\''+escJs(f.source)+'\',\'_blank\')">打开 ↗</button></div>';
    parseXHS(f.source).then(function(r){
      const title=(r&&r.ok&&r.title)||"";
      const desc=(r&&r.ok&&r.desc)||"";
      const api=state.meta.apiCfg||{};
      const hasKey=(api.key||(api.keys&&api.keys[api.provider]&&api.keys[api.provider].length));
      const wrapId="xhsDig_"+colId+"_"+fid;
      const base=
        '<div id="'+wrapId+'">'+
        '<div class="xhs-sec"><div class="xhs-h">📌 帖子标题</div><div class="xhs-b">'+(title?esc(title):'<span class="xhs-empty">未抓取到（小红书反爬，可手动粘贴）</span>')+'</div></div>'+
        '<div class="xhs-sec"><div class="xhs-h">📝 正文内容</div><textarea class="xhs-ta" id="xhsBody_'+fid+'" placeholder="小红书正文（复制正文粘贴到这里，或等待 AI 提炼）">'+esc(desc)+'</textarea></div>'+
        '<div class="xhs-sec"><div class="xhs-h">🖼 图片文字（OCR）</div><textarea class="xhs-ta" id="xhsImg_'+fid+'" placeholder="图片里的文字：可手动摘抄，或用 OCR 工具识别后粘贴"></textarea></div>'+
        '<div class="xhs-sec"><div class="xhs-h">💬 评论内容</div><textarea class="xhs-ta" id="xhsCmt_'+fid+'" placeholder="挑几条相关评论粘贴，下面会自动判断是否与本帖主题相关"></textarea></div>'+
        '<div class="xhs-sec"><div class="xhs-h">🔗 相关性判断</div><div id="xhsRel_'+fid+'" class="xhs-rel">填写上方正文 / 评论后点「分析相关性」</div></div>'+
        '</div>';
      if(!hasKey){
        box.innerHTML=ph+base+
          '<div class="xhs-actions">'+
          '<button class="feed-play" onclick="xhsRelCheck(\''+fid+'\')">'+icon("search",14)+' 分析相关性</button>'+
          '<button class="feed-play" onclick="xhsAdopt(\''+colId+'\',\''+fid+'\')">'+icon("checkCircle",14)+' 采纳为摘要</button>'+
          '<button class="feed-play" onclick="document.getElementById(\'feedDigestRow_'+colId+'_'+fid+'\').style.display=\'none\'">收起</button>'+
          '</div>';
        return;
      }
      box.innerHTML=ph+'<div class="mini-note" style="padding:6px">🤖 已抓取到内容，正在用 AI 提炼核心观点并判断相关性…</div>';
      clubExtract(f.source,title,desc).then(function(res){
        const core=res&&res.core||desc||"";
        box.innerHTML=ph+base+
          '<div class="xhs-actions">'+
          '<button class="feed-play" onclick="document.getElementById(\'xhsBody_'+fid+'\').value=\''+escJs((core||"").replace(/'/g,"\\'"))+'\'">'+icon("ai",14)+' 填入AI提炼</button>'+
          '<button class="feed-play" onclick="xhsRelCheck(\''+fid+'\')">'+icon("search",14)+' 分析相关性</button>'+
          '<button class="feed-play" onclick="xhsAdopt(\''+colId+'\',\''+fid+'\')">'+icon("checkCircle",14)+' 采纳为摘要</button>'+
          '<button class="feed-play" onclick="document.getElementById(\'feedDigestRow_'+colId+'_'+fid+'\').style.display=\'none\'">收起</button>'+
          '</div>';
      }).catch(function(){
        box.innerHTML=ph+base+
          '<div class="xhs-actions">'+
          '<button class="feed-play" onclick="xhsRelCheck(\''+fid+'\')">'+icon("search",14)+' 分析相关性</button>'+
          '<button class="feed-play" onclick="xhsAdopt(\''+colId+'\',\''+fid+'\')">'+icon("checkCircle",14)+' 采纳为摘要</button>'+
          '<button class="feed-play" onclick="document.getElementById(\'feedDigestRow_'+colId+'_'+fid+'\').style.display=\'none\'">收起</button>'+
          '</div>';
      });
    }).catch(function(){
      // #16 解析失败明确引导手动粘贴：聚焦标题输入框
      box.innerHTML=ph+'<div class="mini-note" style="padding:6px">⚠️ 解析失败：小红书有反爬限制。可手动粘贴标题/正文/图片文字/评论到下方，或点下方按钮直接编辑。</div>'+
        '<div class="xhs-actions"><button class="feed-play" onclick="try{var t=document.getElementById(\'xhsBody_'+fid+'\');if(t)t.focus();}catch(e){}">✍️ 手动填写内容</button></div>';
    });
  }catch(e){ console.warn('feedDigestXhs 异常',e); }
}
/* 相关性判断：把「标题+正文」作为主题，逐条比对评论/图片文字，标注相关/无关 */
function xhsRelCheck(fid){
  try{
    const title=($("#xhsBody_"+fid)||{}).value||"";
    const cmt=($("#xhsCmt_"+fid)||{}).value||"";
    const img=($("#xhsImg_"+fid)||{}).value||"";
    const rel=document.getElementById("xhsRel_"+fid);
    if(!rel)return;
    const theme=(title||"").slice(0,60);
    const items=[];
    cmt.split(/\n+/).map(s=>s.trim()).filter(Boolean).forEach(function(c,i){ items.push({type:"评论",t:c}); });
    img.split(/\n+/).map(s=>s.trim()).filter(Boolean).forEach(function(c,i){ items.push({type:"图片文字",t:c}); });
    if(!theme){ rel.innerHTML='<span class="xhs-empty">请先填写「正文内容」（作为主题）</span>'; return; }
    if(!items.length){ rel.innerHTML='<span class="xhs-empty">请先填写评论或图片文字</span>'; return; }
    // 关键词交集法（无需网络）：计算主题词与每条文本的词重叠
    const kw=function(s){ return (s||"").toLowerCase().replace(/[\s，。、！？!?.,]/g," ").split(/\s+/).filter(function(w){return w.length>=2;}); };
    const tset=new Set(kw(theme+" "+title));
    let html='<div class="mini-note">主题：'+esc(theme||"（空）")+'</div>';
    items.forEach(function(it){
      const w=kw(it.t);
      let hit=0; w.forEach(function(x){ if(tset.has(x))hit++; });
      const rel3 = hit>=2? "相关" : (hit===1? "弱相关" : "可能无关");
      const cls = hit>=2? "rel-yes" : (hit===1? "rel-weak":"rel-no");
      html+='<div class="xhs-rel-row '+cls+'"><span class="xhs-rel-tag">'+rel3+'</span><span class="xhs-rel-txt">'+esc((it.type+": "+it.t).slice(0,80))+'</span></div>';
    });
    rel.innerHTML=html;
  }catch(e){ console.warn('xhsRelCheck 异常',e); }
}
/* 采纳小红书结构化提炼为摘要 */
function xhsAdopt(colId,fid){
  const f=(state.feeds[colId]||[]).find(x=>x.id===fid);if(!f)return;
  const body=($("#xhsBody_"+fid)||{}).value||"";
  const img=($("#xhsImg_"+fid)||{}).value||"";
  const cmt=($("#xhsCmt_"+fid)||{}).value||"";
  let txt="";
  if(body)txt+="正文："+body.slice(0,120);
  if(img)txt+=(txt?"；":"")+"图片文字："+img.slice(0,80);
  if(cmt)txt+=(txt?"；":"")+"评论："+cmt.slice(0,80);
  if(!txt){toast("⚠️ 没有可采纳的内容");return;}
  f.summary=txt.slice(0,200);
  // 同时沉淀到灵感收藏
  try{
    state.modules.xiaohongshu.panels.posts.push({id:uid(),title:(f.summary.slice(0,30)),link:f.source,cat:"变美",points:f.summary.slice(0,50)});
  }catch(e){}
  save();renderModule(colId);toast("✅ 已采纳为摘要并存入灵感收藏");
}
function clubSaveDigestFromFeed(colId,fid){
  const f=(state.feeds[colId]||[]).find(x=>x.id===fid);if(!f)return;
  const box=document.getElementById("feedDigest_"+colId+"_"+fid);
  const txt=box?box.innerText:"";
  const card={id:uid(),title:sanitizeText((txt.split('📌')[1]||'').split('➡️')[0].split('💾')[0].trim()).slice(0,40)||"提炼卡片",core:sanitizeText((txt.split('➡️')[0].replace('📌','').trim())).slice(0,200),tags:["方法"],time:nowStamp(),status:"pending",lastReview:null,from:"studyclub"};
  clubCards().unshift(card);
  save();renderStudyClub();toast("✅ 已存入知识库");
}
function feedAdoptDigest(colId,fid){
  const f=(state.feeds[colId]||[]).find(x=>x.id===fid);if(!f)return;
  const box=document.getElementById("feedDigest_"+colId+"_"+fid);
  let txt="";
  if(box){const d=box.querySelector("div");if(d)txt=d.textContent||"";}
  const clean=txt.split("✅")[0].split("➡️")[0].trim().slice(0,80);
  if(clean)f.summary=clean;
  save();renderModule(colId);toast("✅ 已采纳为摘要");
}
function fetchPageText(url){
  var proxies=[
    "https://r.jina.ai/http://"+url,
    "https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(url),
    "https://api.allorigins.win/raw?url="+encodeURIComponent(url),
    "https://corsproxy.io/?url="+encodeURIComponent(url)
  ];
  var PER=8000, TOTAL=18000; // 单个代理 / 整体超时，避免永久挂起
  var outer=mkAbort();
  function tryOne(i){
    if(i>=proxies.length)return Promise.resolve("");
    if(outer&&outer.signal&&outer.signal.aborted)return Promise.resolve("");
    var ctrl=mkAbort();
    var to=setTimeout(function(){ if(ctrl)ctrl.abort(); }, PER);
    return fetch(proxies[i],{signal:(ctrl?ctrl.signal:undefined)}).then(function(r){ return r.text(); }).then(function(txt){
      clearTimeout(to);
      // 空响应（部分代理返回 200 但无内容）视为失败，继续下一个代理
      if(!txt||!txt.trim()) return tryOne(i+1);
      return txt;
    }).catch(function(){ clearTimeout(to); return tryOne(i+1); });
  }
  var chain=tryOne(0).catch(function(){ return ""; });
  // 整体超时兜底：超过 TOTAL 直接返回空，避免等待所有代理
  var overallTimer=null;
  var overall=new Promise(function(res){ overallTimer=setTimeout(function(){ if(outer)outer.abort(); res(""); }, TOTAL); });
  // chain 先完成时清除 overall 定时器，避免对已完成的请求继续施加 abort
  chain.finally(function(){ if(overallTimer){clearTimeout(overallTimer);overallTimer=null;} });
  return Promise.race([chain,overall]);
}
function fetchFreeApi(url,timeoutMs){
  timeoutMs=timeoutMs||8000;
  // 环境守卫：无 fetch（老浏览器/内嵌 WebView）时直接明确拒绝，避免抛同步异常
  if(typeof fetch!=="function") return Promise.reject(new Error("当前环境不支持 fetch"));
  const ctrl=mkAbort();
  const to=setTimeout(function(){ if(ctrl)ctrl.abort(); }, timeoutMs);
  return fetch(url,{signal:(ctrl?ctrl.signal:undefined)}).then(function(r){ if(!r.ok)throw new Error("HTTP "+r.status); return r.json(); }).then(function(d){clearTimeout(to);return d;}).catch(function(e){
    clearTimeout(to);
    if(isAbortError(e)) return Promise.reject(e);   // 被视图切换/超时掐断：不再走代理兜底
    // 代理兜底（免费接口偶发 CORS 时）
    return fetchPageText(url).then(function(txt){
      try{ return JSON.parse(txt); }catch(e2){ throw e; }
    }).catch(function(){ throw e; });
  });
}
/* —— 天气 / 节假日：本地缓存 + 失败重试 + 陈旧兜底 ——
   目标：弱网或接口抖动时首页问候区不空白；非首次进入不再重复打网络。
   缓存写在独立 localStorage key（ju_wx_cache），不污染主状态。 */
function wxCacheGet(key,ttlMs){
  try{
    const raw=localStorage.getItem("ju_wx_cache"); if(!raw)return null;
    const all=JSON.parse(raw)||{};
    const it=all[key]; if(!it||!it.t)return null;
    const age=Date.now()-it.t;
    return age>ttlMs ? {stale:it.v,age:age} : {fresh:it.v,age:age};
  }catch(e){ return null; }
}
function wxCacheSet(key,val){
  try{
    let all={};
    try{ const raw=localStorage.getItem("ju_wx_cache"); all=raw?(JSON.parse(raw)||{}):{}; }catch(e){}
    all[key]={t:Date.now(),v:val};
    const ks=Object.keys(all);
    if(ks.length>12){ ks.sort(function(a,b){return (all[a].t||0)-(all[b].t||0);}); ks.slice(0,ks.length-12).forEach(function(k){delete all[k];}); }
    localStorage.setItem("ju_wx_cache",JSON.stringify(all));
  }catch(e){}
}
/* 天气（open-meteo，无需 Key，开放 CORS）。默认上海，可经 geolocation 覆盖
   策略：命中 30 分钟缓存直接返回 → 失败重试 1 次 → 仍失败则用陈旧缓存兜底 */
/* 轻量 JSON 请求：定位类接口要快，不走 fetchFreeApi 的代理兜底链（代理常要十几秒） */
function fetchJsonFast(url,timeoutMs){
  timeoutMs=timeoutMs||6000;
  if(typeof fetch!=="function") return Promise.reject(new Error("no fetch"));
  var ctrl=mkAbort();
  var to=setTimeout(function(){ if(ctrl){ try{ctrl.abort();}catch(e){} } },timeoutMs);
  return fetch(url,{signal:(ctrl?ctrl.signal:undefined)}).then(function(r){
    clearTimeout(to); if(!r.ok) throw new Error("HTTP "+r.status); return r.json();
  }).catch(function(e){ clearTimeout(to); throw e; });
}
/* 真·竞速：第一个成功即返回，不等其余（allSettled 会等到最慢的那个，定位会明显变慢） */
function raceOk(jobs){
  return new Promise(function(resolve,reject){
    var total=jobs.length, failed=0, settled=false;
    jobs.forEach(function(j){
      j.then(function(v){ if(!settled){ settled=true; resolve(v); } })
       .catch(function(){ failed++; if(failed>=total&&!settled){ settled=true; reject(new Error("all failed")); } });
    });
    if(!total) reject(new Error("no job"));
  });
}
/* ===== 天气定位 =====
   APK 里 navigator.geolocation 需要原生权限（AndroidManifest 的 ACCESS_FINE_LOCATION
   + WebChromeClient.onGeolocationPermissionsShowPrompt），打包工具基本没配，
   必然失败并回落到默认城市。改为多级定位链：
   手动城市 > 系统GPS(带超时，权限被拒会立刻失败) > IP定位(无需任何权限) > 缓存位置 > 默认 */
var WX_FALLBACK={lat:31.23, lon:121.47, city:"上海"};
var WX_CITY_PRESETS=[
  {n:"北京",lat:39.90,lon:116.41},{n:"上海",lat:31.23,lon:121.47},
  {n:"广州",lat:23.13,lon:113.26},{n:"深圳",lat:22.54,lon:114.06},
  {n:"杭州",lat:30.27,lon:120.16},{n:"南京",lat:32.06,lon:118.80},
  {n:"成都",lat:30.57,lon:104.07},{n:"重庆",lat:29.56,lon:106.55},
  {n:"武汉",lat:30.59,lon:114.31},{n:"西安",lat:34.34,lon:108.94},
  {n:"苏州",lat:31.30,lon:120.58},{n:"天津",lat:39.13,lon:117.20},
  {n:"长沙",lat:28.23,lon:112.94},{n:"郑州",lat:34.75,lon:113.63},
  {n:"青岛",lat:36.07,lon:120.38},{n:"沈阳",lat:41.80,lon:123.43},
  {n:"哈尔滨",lat:45.80,lon:126.53},{n:"昆明",lat:25.04,lon:102.72},
  {n:"厦门",lat:24.48,lon:118.09},{n:"福州",lat:26.07,lon:119.30},
  {n:"济南",lat:36.65,lon:117.12},{n:"合肥",lat:31.82,lon:117.23},
  {n:"南昌",lat:28.68,lon:115.86},{n:"贵阳",lat:26.65,lon:106.63}
];
/* IP 定位：不需要任何系统权限，APK 里最可能成功的一条路（多源竞速） */
function geoByIP(){
  var srcs=[
    {u:"https://get.geojs.io/v1/ip/geo.json", p:function(d){ return (d&&d.latitude!=null&&d.longitude!=null)?{lat:parseFloat(d.latitude),lon:parseFloat(d.longitude),city:d.city||d.region||""}:null; }},
    {u:"https://ipapi.co/json/", p:function(d){ return (d&&d.latitude!=null&&d.longitude!=null)?{lat:parseFloat(d.latitude),lon:parseFloat(d.longitude),city:d.city||""}:null; }},
    {u:"https://ipwho.is/", p:function(d){ return (d&&d.latitude!=null&&d.longitude!=null)?{lat:parseFloat(d.latitude),lon:parseFloat(d.longitude),city:d.city||""}:null; }}
  ];
  var jobs=srcs.map(function(s){
    return fetchJsonFast(s.u,6000).then(function(d){ var r=s.p(d); if(!r||isNaN(r.lat)||isNaN(r.lon)) throw new Error("bad ip geo"); return r; });
  });
  return raceOk(jobs);
}
/* 系统 GPS：带超时与失败兜底，权限未授权时会立刻走 error 分支，不会挂住界面 */
function geoByGPS(timeoutMs){
  timeoutMs=timeoutMs||5000;
  return new Promise(function(resolve,reject){
    try{
      if(!navigator.geolocation) return reject(new Error("no geolocation"));
      var done=false;
      var to=setTimeout(function(){ if(!done){done=true;reject(new Error("gps timeout"));} },timeoutMs);
      navigator.geolocation.getCurrentPosition(function(pos){
        if(done)return; done=true; clearTimeout(to);
        try{ resolve({lat:pos.coords.latitude, lon:pos.coords.longitude}); }catch(e){ reject(e); }
      }, function(err){ if(done)return; done=true; clearTimeout(to); reject(err||new Error("gps denied")); },
      {timeout:Math.max(1000,timeoutMs-500), maximumAge:30*60*1000, enableHighAccuracy:false});
    }catch(e){ reject(e); }
  });
}
/* 反地理编码：经纬度 → 中文城市名 */
function reverseGeocode(lat,lon){
  return fetchJsonFast("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude="+lat+"&longitude="+lon+"&localityLanguage=zh",6000)
    .then(function(d){ if(!d) throw new Error("empty"); return d.city||d.locality||d.principalSubdivision||""; });
}
/* 城市名 → 经纬度（open-meteo 地理编码，支持中文检索） */
function geoSearchCity(name){
  return fetchJsonFast("https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(name)+"&count=8&language=zh&format=json",8000)
    .then(function(d){
      var arr=(d&&d.results)||[];
      return arr.map(function(x){ return {n:x.name||"", lat:x.latitude, lon:x.longitude, region:x.admin1||x.country||""}; })
                .filter(function(x){ return x.lat!=null&&x.lon!=null; });
    });
}
/* 综合定位：返回 {lat,lon,city,src} */
function resolveWeatherLocation(force){
  return new Promise(function(resolve){
    try{ state.meta=state.meta||{}; }catch(e){}
    var meta=state.meta||{};
    // 1) 手动设定的城市优先（APK 里最可靠）
    if(!force && meta.weatherCity && meta.weatherCity.lat!=null){
      resolve({lat:meta.weatherCity.lat, lon:meta.weatherCity.lon, city:meta.weatherCity.name||"", src:"manual"});
      return;
    }
    // 2) 位置缓存（7 天）：城市不会频繁变，命中即可瞬时出天气
    if(!force){
      var gc=wxCacheGet("wx_geo",7*24*60*60*1000);
      var g=gc?(gc.fresh||gc.stale):null;
      if(g&&g.lat!=null){ resolve({lat:g.lat, lon:g.lon, city:g.city||"", src:"cache"}); return; }
    }
    var settled=false;
    function ok(r){ if(settled)return; settled=true; try{ wxCacheSet("wx_geo",r); }catch(e){} resolve(r); }
    // 3) GPS 与 IP 并行：GPS 更准优先采用，权限被拒/超时则无缝接上 IP 结果
    var ipJob=null;
    function useIP(){
      if(settled)return;
      if(!ipJob) ipJob=geoByIP();
      ipJob.then(function(r){
        // IP 库一般只给英文城市名，补一次反地理编码换成中文
        reverseGeocode(r.lat,r.lon).then(function(cn){
          ok({lat:r.lat, lon:r.lon, city:cn||r.city||"本地", src:"ip"});
        }).catch(function(){ ok({lat:r.lat, lon:r.lon, city:r.city||"本地", src:"ip"}); });
      }).catch(function(){ if(settled)return; settled=true;
             resolve({lat:WX_FALLBACK.lat,lon:WX_FALLBACK.lon,city:WX_FALLBACK.city,src:"default"}); });
    }
    var gpTimer=setTimeout(useIP, 5200);
    geoByGPS(5000).then(function(p){
      clearTimeout(gpTimer);
      reverseGeocode(p.lat,p.lon).then(function(cn){
        ok({lat:p.lat, lon:p.lon, city:cn||"当前位置", src:"gps"});
      }).catch(function(){ ok({lat:p.lat, lon:p.lon, city:"当前位置", src:"gps"}); });
    }).catch(function(){ clearTimeout(gpTimer); useIP(); });
  });
}
/* 天气（open-meteo，无需 Key，开放 CORS）
   策略：定位链取坐标 → 命中 30 分钟缓存直接返回 → 失败重试 1 次 → 陈旧缓存兜底 */
function loadWeather(force){
  return new Promise(function(resolve){
    var settled=false;
    function done(r){ if(settled)return; settled=true; clearTimeout(guard); resolve(r); }
    // 总闸：任何分支卡死都保证 20s 内收敛，首页不会一直空白
    var guard=setTimeout(function(){ done({ok:false}); }, 20000);
    resolveWeatherLocation(force).then(function(loc){
      var key="wx_"+loc.lat.toFixed(2)+"_"+loc.lon.toFixed(2);
      if(!force){
        var hit=wxCacheGet(key,30*60*1000);
        if(hit&&hit.fresh){ var f=hit.fresh; f.city=loc.city||f.city; f.src=loc.src; done(f); return; }
      }
      function go(attempt){
        var url="https://api.open-meteo.com/v1/forecast?latitude="+loc.lat+"&longitude="+loc.lon+
                "&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1";
        try{
          fetchFreeApi(url,9000).then(function(d){
            var cur=(d&&d.current)||{}, day=(d&&d.daily)||{};
            var temp=cur.temperature_2m, code=cur.weather_code;
            if(temp==null&&code==null) throw new Error("天气数据为空");
            var r={ok:true, city:loc.city||"", lat:loc.lat, lon:loc.lon, src:loc.src,
                   temp:temp, code:code, desc:weatherDesc(code),
                   hi:(day.temperature_2m_max||[])[0], lo:(day.temperature_2m_min||[])[0]};
            wxCacheSet(key,r); done(r);
          }).catch(function(e){
            // 视图切换/超时导致的中断不是真失败：不再重试、不再打网络，直接用缓存收敛
            if(isAbortError(e)){
              var ca=wxCacheGet(key,30*60*1000); var ra=ca&&(ca.fresh||ca.stale);
              if(ra){ ra.fromCache=true; ra.city=loc.city||ra.city; done(ra); } else done({ok:false});
              return;
            }
            if(attempt<2){ setTimeout(function(){ go(attempt+1); },700*attempt); return; }
            var c=wxCacheGet(key,30*60*1000);
            var r=(c&&(c.fresh||c.stale));
            if(r){ r.fromCache=true; r.city=loc.city||r.city; done(r); } else done({ok:false});
          });
        }catch(e){ done({ok:false}); }
      }
      go(1);
    }).catch(function(){ done({ok:false}); });
  });
}
function weatherDesc(code){
  var m={0:"晴",1:"大致晴朗",2:"局部多云",3:"阴",45:"雾",48:"雾凇",51:"毛毛雨",53:"小雨",55:"中雨",61:"小雨",63:"中雨",65:"大雨",71:"小雪",73:"中雪",75:"大雪",80:"阵雨",81:"阵雨",82:"强阵雨",95:"雷阵雨",96:"雷阵雨伴冰雹"};
  return m[code]!=null?m[code]:"未知";
}

/* ===== 天气城市选择面板（复用 ActionSheet 容器） ===== */
function openCityPicker(){
  var mask=document.getElementById('actionSheetMask');
  var titleEl=document.getElementById('actionTitle');
  var opts=document.getElementById('actionOptions');
  if(!mask||!opts)return;
  try{ state.meta=state.meta||{}; }catch(e){}
  var cur=(state.meta&&state.meta.weatherCity)?state.meta.weatherCity:null;
  if(titleEl)titleEl.textContent='天气城市 · 点击切换';
  var chips=WX_CITY_PRESETS.map(function(c,ix){
    return '<button class="city-chip'+(cur&&cur.name===c.n?' on':'')+'" onclick="wxPickCity('+ix+')">'+c.n+'</button>';
  }).join('');
  opts.innerHTML='<div class="city-pick">'+
    '<button class="as-opt" onclick="wxUseAuto()">🎯 自动定位（GPS / 网络）</button>'+
    '<div class="city-search"><input id="cityIn" placeholder="输入城市名，如 杭州 / 成都" onkeydown="if(event.key===\'Enter\')wxSearchCity()" /><button onclick="wxSearchCity()">搜索</button></div>'+
    '<div class="city-result" id="cityResult"></div>'+
    '<div class="city-cap">常用城市</div><div class="city-chips">'+chips+'</div>'+
    '</div>';
  mask.classList.add('show');
  try{ document.body.style.overflow='hidden'; }catch(e){}
}
function wxRefreshHome(){
  try{
    if(currentView==="home"&&typeof renderHome==="function") renderHome();
    else if(typeof updateHomeWeatherHoliday==="function") updateHomeWeatherHoliday();
  }catch(e){}
}
/* 自动定位：清掉手动城市，强制走一遍 定位链（GPS → IP） */
function wxUseAuto(){
  hideActionSheet();
  toast('📍 正在定位…');
  try{ state.meta=state.meta||{}; delete state.meta.weatherCity; if(typeof save==="function")save(); }catch(e){}
  loadWeather(true).then(function(w){
    if(w&&w.ok) toast('✅ 已定位到 '+(w.city||'当前位置'));
    else toast('⚠️ 定位失败，已回退默认城市');
    wxRefreshHome();
  }).catch(function(){ toast('⚠️ 定位失败'); });
}
function wxPickCity(ix){
  var c=WX_CITY_PRESETS[ix]; if(!c)return;
  try{ state.meta=state.meta||{}; state.meta.weatherCity={name:c.n,lat:c.lat,lon:c.lon}; if(typeof save==="function")save(); }catch(e){}
  hideActionSheet(); toast('✅ 已切换到 '+c.n);
  wxRefreshHome();
}
function wxSearchCity(){
  var el=document.getElementById('cityIn');
  var v=el?String(el.value||'').trim():'';
  var box=document.getElementById('cityResult'); if(!box)return;
  if(!v){ box.innerHTML='<div class="mini-note">请输入城市名</div>'; return; }
  box.innerHTML='<div class="mini-note">搜索中…</div>';
  geoSearchCity(v).then(function(list){
    if(!list||!list.length){ box.innerHTML='<div class="mini-note">没找到「'+esc(v)+'」，换个名字试试</div>'; return; }
    box.innerHTML=list.map(function(x,ix){
      return '<div class="city-item" data-i="'+ix+'">'+esc(x.n)+(x.region?'<span class="ci-r">'+esc(x.region)+'</span>':'')+'</div>';
    }).join('');
    try{
      var nodes=box.querySelectorAll('.city-item');
      for(var k=0;k<nodes.length;k++){
        (function(node){
          node.addEventListener('click',function(){
            var x=list[parseInt(node.getAttribute('data-i'),10)]; if(!x)return;
            try{ state.meta=state.meta||{}; state.meta.weatherCity={name:x.n,lat:x.lat,lon:x.lon}; if(typeof save==="function")save(); }catch(e){}
            hideActionSheet(); toast('✅ 已切换到 '+x.n); wxRefreshHome();
          });
        })(nodes[k]);
      }
    }catch(e){}
  }).catch(function(){ box.innerHTML='<div class="mini-note">⚠️ 搜索失败，请检查网络</div>'; });
}
/* 节假日（timor.tech，开放 CORS）
   同一天的判定结果 6 小时内不会变，缓存后当天只请求一次；失败重试 1 次并回落陈旧缓存 */
function loadHoliday(){
  var ymd=todayStr();
  var ck="hd_"+ymd;
  var cached=wxCacheGet(ck,6*60*60*1000);
  function pack(x){ return {ok:true,holiday:(x&&x.holiday)||"",type:(x&&x.type)||"",isHoliday:!!(x&&x.holiday)}; }
  return new Promise(function(resolve){
    if(cached&&cached.fresh){ resolve(cached.fresh); return; }
    function attempt(n){
      try{
        fetchFreeApi("https://timor.tech/api/holiday/info/"+ymd+".json",9000).then(function(r){
          if(r&&r.code===0&&r.data){ var v=pack(r.data); wxCacheSet(ck,v); resolve(v); return; }
          if(r&&r.code!==0){ var v2={ok:true,holiday:"",isHoliday:false}; wxCacheSet(ck,v2); resolve(v2); return; }
          throw new Error("节假日数据格式异常");
        }).catch(function(e){
          if(n<2){ setTimeout(function(){ attempt(n+1); },700*n); return; }
          resolve((cached&&cached.stale)||{ok:false});
        });
      }catch(e){ resolve((cached&&cached.stale)||{ok:false}); }
    }
    attempt(1);
  });
}
function updateHomeWeatherHoliday(){
  var box=document.getElementById("homeWx"); if(!box)return;
  function hide(){ try{ box.style.display="none"; }catch(e){} }
  try{
    Promise.all([loadWeather(),loadHoliday()]).then(function(rs){
      try{
        var w=rs[0]||{}, h=rs[1]||{};
        var s="";
        if(w.ok&&w.temp!=null){
          s+=icon('cloud',14)+' '+esc(w.city||'本地')+' '+Math.round(w.temp)+'° '+esc(w.desc);
          if(w.hi!=null&&w.lo!=null&&Math.round(w.hi)!==Math.round(w.lo)){
            if(Math.round(w.lo)===Math.round(w.temp)) s+=' · 最高 '+Math.round(w.hi)+'°';
            else if(Math.round(w.hi)===Math.round(w.temp)) s+=' · 最低 '+Math.round(w.lo)+'°';
            else s+=' · '+Math.round(w.lo)+'~'+Math.round(w.hi)+'°';
          }
          if(w.fromCache) s+=' · 缓存';
          s+=' <span class="wx-pick">切换</span>';
        }
        if(h.ok && h.isHoliday) s+=(s?' · ':'')+icon('sparkle',14)+' '+esc(h.holiday);
        if(s){ box.innerHTML=s; box.style.display=""; box.setAttribute("onclick","openCityPicker()"); box.setAttribute("title","点击切换城市 / 重新定位"); }
        else hide();
      }catch(e){ hide(); }
    }).catch(function(){ hide(); });
  }catch(e){ hide(); }
}
function extractMeta(html,url){
  var r={title:"",description:"",keywords:"",content:"",firstPara:""};
  try{
    var doc=new DOMParser().parseFromString(html,"text/html");
    var g=function(sel){var el=doc.querySelector(sel);return el?(el.getAttribute("content")||el.textContent||"").trim():"";};
    r.title=g('meta[property="og:title"]')||g('meta[name="title"]')||(doc.title?doc.title.trim():"");
    var metaDesc=g('meta[property="og:description"]')||g('meta[name="description"]')||g('meta[name="twitter:description"]');
    r.keywords=g('meta[name="keywords"]');
    // 互动数据（点赞/收藏/评论等）过滤：这类短文本不是知识正文
    var INTERACT=/赞|藏|评论|收藏|转发|点赞|在看|❤|♡|repost|like|favorite|watch/i;
    // 优先从正文容器提取真实内容
    var contentSel=["article","main",".content",".text",".note",".post-content",".note-content",".desc",".detail",".article","#detail",".content-box",".rich-media-content"];
    var blocks=[];
    contentSel.forEach(function(sel){try{doc.querySelectorAll(sel).forEach(function(el){var t=(el.textContent||"").replace(/\s+/g," ").trim();if(t.length>30)blocks.push(t);});}catch(e){}});
    doc.querySelectorAll("p,li").forEach(function(p){var t=(p.textContent||"").replace(/\s+/g," ").trim();if(t.length>30)blocks.push(t);});
    var best="";
    blocks.forEach(function(t){ if((!INTERACT.test(t)||t.length>=60) && t.length>best.length) best=t; });
    // 若 meta 描述本身是互动数据且很短，则忽略，改用正文
    if(metaDesc && metaDesc.length<30 && INTERACT.test(metaDesc)) metaDesc="";
    r.description=metaDesc;
    r.content=best||metaDesc||"";
    r.firstPara=r.content?r.content.slice(0,160):(metaDesc?metaDesc.slice(0,160):"");
    if(!r.content&&!r.description){var body=(doc.body&&doc.body.textContent||"").replace(/\s+/g," ").trim();r.firstPara=body.slice(0,160);}
    if(!r.title&&/BV[0-9A-Za-z]{10}/.test(url))r.title="B站视频";
  }catch(e){}
  return r;
}
function toggleFeedPlay(colId,fid){
  const row=document.getElementById("feedPlayerRow_"+colId+"_"+fid);
  const box=document.getElementById("feedPlayer_"+colId+"_"+fid);
  if(!row||!box)return;
  if(row.style.display!=="none"){
    row.style.display="none";
    const ifr=box.querySelector("iframe");if(ifr)ifr.src="about:blank";
    return;
  }
  const f=(state.feeds[colId]||[]).find(x=>x.id===fid);if(!f)return;
  const emb=biliEmbed(f.source);if(!emb){toast("⚠️ 无法解析该视频链接");return;}
  if(!box.querySelector("iframe")){
    const ifr=document.createElement("iframe");
    ifr.src=emb;ifr.scrolling="no";ifr.frameBorder="no";ifr.allowFullscreen=true;ifr.setAttribute("webkitallowfullscreen","true");
    ifr.style.cssText="width:100%;aspect-ratio:16/9;border:none;border-radius:var(--radius-sm);background:#000;display:block";
    ifr.setAttribute("allow","autoplay; fullscreen; encrypted-media; picture-in-picture");
    box.appendChild(ifr);
  }
  row.style.display="";
}
function feedToTask(colId,fid){
  const def=MODULE_DEFS[colId];if(!def){toast("⚠️ 该栏目不支持转任务");return;}
  const p=def.panels.find(x=>x.type==="checklist");if(!p){toast("⚠️ 该栏目没有任务清单，无法转换");return;}
  const f=(state.feeds[colId]||[]).find(x=>x.id===fid);if(!f)return;
  const txt=(f.summary||f.source||"新任务").trim().slice(0,30);
  const fields=p.fields||p.columns||[];
  let field=fields.find(c=>/task|text|content|item|name|title/i.test(c.name));
  if(!field)field=fields.find(c=>!/^(time|date|start|end)$/i.test(c.name));
  if(!field)field=fields[0];
  if(!field){toast("⚠️ 该栏目任务格式不支持转换");return;}
  const arr=state.modules[colId].panels[p.key]||[];
  arr.push({id:uid(),[field.name]:txt,done:false,doneDate:null});
  save();renderModule(colId);toast("✅ 已转为「"+def.title+"」任务");
}
function delFeedRec(colId,fid){
  if(!confirm("删除该条记录？"))return;
  const arr=state.feeds[colId]||[];
  const idx=arr.findIndex(function(x){return x.id===fid;});
  if(idx<0)return;
  const it=arr[idx];
  undoableDelete("一条投喂",
    function(){ state.feeds[colId]=arr.filter(function(x){return x.id!==fid;}); save(); renderModule(colId); return true; },
    function(){ const a=state.feeds[colId]||[];
                a.splice(Math.min(idx,a.length),0,it); state.feeds[colId]=a; save(); renderModule(colId); });
}
function feedIcon(t){return t==="link"?icon('link',15):t==="image"?icon('image',15):t==="file"?icon('download',15):icon('edit',15);}
function feedPlatformIcon(tag){return '';}
