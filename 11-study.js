/* ============================================================
   笑笑养成记 · 工作台 —— 脚本分片 11/18
   文件：js/11-study.js
   来源：原 index.html 第 24771–25673 行
   内容：智能研习社 + 艾宾浩斯复习曲线 + 知识库
   ------------------------------------------------------------
   ⚠️ 用普通 <script src> 顺序加载，**不是** ES module：
      · 页面有 531 处内联 onclick/oninput/onchange 依赖全局函数，
        type="module" 的作用域不挂 window，会让它们全部失效；
      · ES module 在 file:// 下会因 CORS 直接失败，
        而 HBuilder 打包的 5+ App / 本地 WebView 正是 file:// 加载。
      → 所有分片共享同一个全局作用域，按文件序号串行执行。
   ============================================================ */
/* ============ 智能研习社 🧠 ============ */
function clubCards(){return kbCards();}
function allCards(){return kbCards();}
function clubTags(){const cards=clubCards().filter(c=>(c.from||"studyclub")==="studyclub");const set=new Set();cards.forEach(c=>(c.tags||[]).forEach(t=>set.add(t)));return Array.from(set);}
function renderStudyClub(){
  const v=$("#view-module");
  const cards=clubCards().filter(c=>(c.from||"studyclub")==="studyclub");
  let html='<div class="back-row"><button onclick="showHome()" aria-label="返回"><svg class="svg-ic" viewBox="0 0 24 24" width="20" height="20"><path d="M15 5l-7 7 7 7"/></svg></button><div style="font-weight:600">'+icon('brain',18)+' 知识研习</div></div>';
  html+='<div class="mod-head"><div class="mod-h1">'+icon('brain',18)+' 知识研习</div><div class="mod-sub">粘贴小红书/公众号/B站等链接 → 自动解析提炼成知识卡片，沉淀个人知识库</div></div>';
  const scimg=readImage("meta.images.studyclub");
  const sccov=(state.meta.coverStyle&&state.meta.coverStyle.studyclub)||{mode:"cover",x:0,y:0,scale:1};
  const scimgHtml=scimg?('<div class="banner-img" style="background-image:url('+scimg+');'+coverCss(sccov)+';'+coverFilterCss()+'"></div>'):'';
  html+='<div class="banner" onclick="openCoverEditor(\'studyclub\')">'+scimgHtml+'<span class="bcap">点击设置 / 调整栏目配图</span></div>';
  // 输入区
  html+='<div class="card"><h3>'+icon('link',16)+' 投喂链接提炼知识</h3><div class="club-input"><input id="clubIn" placeholder="粘贴帖子链接…" /><button onclick="clubFetch()">解析提炼</button></div>'+
    '<div class="target-pick"><span style="font-size:12px;color:var(--gray)">默认存入：</span>'+
    '<select id="clubTarget" style="padding:6px 10px;border:1px solid var(--glass-border);border-radius:var(--radius-sm);background:var(--glass-flat);color:var(--text);font-size:12px">'+
    '<option value="library">个人知识库</option><option value="beauty">变美日记（灵感收藏）</option><option value="cet">英语等级考试 CET</option><option value="gongkao">公考备战</option></select></div>'+
    '<div id="clubResult" class="mini-note"></div></div>';
  // 统计
  const total=cards.length;const mastered=cards.filter(c=>c.status==="mastered").length;const pending=cards.filter(c=>c.status!=="mastered").length;
  const unreviewed=cards.filter(c=>!c.lastReview||daysSince(c.lastReview)>=7).length;
  html+='<div class="club-stats"><div class="club-st"><b>'+total+'</b><span>知识卡片总数</span></div><div class="club-st"><b>'+pending+'</b><span>待消化</span></div><div class="club-st"><b>'+mastered+'</b><span>已掌握</span></div><div class="club-st"><b>'+unreviewed+'</b><span>待复习(≥7天)</span></div></div>';
  const masterRate = total>0 ? Math.round(mastered/total*100) : 0;
  html+='<div class="club-master"><div class="ring-progress" data-value="'+masterRate+'" title="掌握度 '+masterRate+'%">'+
    '<svg class="ring-svg" viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="var(--line)" stroke-width="4"></circle>'+
    '<circle cx="28" cy="28" r="24" fill="none" stroke="url(#clubGrad)" stroke-width="4" stroke-linecap="round" class="ring-circle"></circle></svg>'+
    '<div class="ring-center"><span class="ring-number">'+masterRate+'%</span><span class="ring-label">掌握度</span></div></div>'+
    '<div class="club-master-txt"><b>'+mastered+' / '+total+'</b> 张已掌握<span class="club-master-sub">'+(total-mastered)+' 张待消化，继续加油 🌸</span></div></div>';
  html+='<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="clubGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="var(--primary)"/><stop offset="100%" stop-color="var(--accent)"/></linearGradient></defs></svg>';
  // 搜索 + 知识库
  html+='<div class="card"><h3>📚 个人知识库 <span class="tag">按标签分类 · 支持检索</span></h3>';
  html+='<div class="kb-search"><input id="clubSearch" placeholder="🔍 检索知识点（标题/核心观点/标签）" oninput="clubRenderKb()" onkeydown="if(event.key===\'Enter\')this.blur()" /><span class="feed-search-tip" id="clubSearchTip"></span></div>';
  html+='<div class="target-pick" id="clubTagFilter"></div>';
  html+='<div id="clubKb"></div></div>';
  // 投喂记录区（栏目最底部统一放置）
  html+=renderFeedArea("studyclub");
  v.innerHTML=html;
  clubRenderTags();
  clubRenderKb();
  // 复习提醒（周日）
  clubReviewCheck();
}
function clubTargetSelect(){
  const el=$("#clubTarget");return el?el.value:"library";
}
function clubFetch(){
  const el=$("#clubIn");if(!el)return;const url=el.value.trim();if(!url){toast("⚠️ 请粘贴链接");return;}
  if(!/^https?:\/\//.test(url)){toast("⚠️ 链接格式不正确");return;}
  const box=$("#clubResult");box.innerHTML='<div class="mini-note">⏳ 正在抓取并解析链接内容…（首次调用需联网，可能几秒）</div>';
  box.className="";
  fetchPageText(url).then(function(html){
    if(!html){box.innerHTML='<div class="mini-note">⚠️ 抓取失败：该平台有反爬/跨域限制。可手动把内容粘贴到知识库，或换用其它可访问链接。</div>';return;}
    const meta=extractMeta(html,url);
    const title=meta.title||url.slice(0,40);
    const content=meta.content||meta.description||meta.firstPara||"";
    box.innerHTML='<div class="skeleton-wrapper"><div class="skeleton-card"><div class="skeleton-line w-50" style="height:16px"></div><div class="skeleton-line w-90"></div><div class="skeleton-line w-80"></div><div class="skeleton-line w-70"></div><div class="skeleton-line w-80"></div></div><div class="mini-note" style="text-align:center;margin-top:4px">✨ 正在调用 AI 提炼知识点…（如未配置 API Key，将用规则提炼）</div></div>';
    clubExtract(url,title,content).then(function(res){
      window._clubDraft=res;
      box.innerHTML='<div class="club-card pop-in"><div class="club-card-top"><span class="club-card-title">📌 '+esc(res.title)+'</span></div>'+
        '<div class="club-core">'+esc(res.core)+'</div>'+
        '<div class="club-meta">来源：<a href="'+esc(url)+'" target="_blank" style="color:var(--accent-ink)">'+esc(url.slice(0,50))+'…</a></div>'+
        '<div class="club-tags">'+res.tags.map(t=>'<span class="club-tag" onclick="clubAddTagFromDraft(\''+t.replace(/'/g,"\\'")+'\')">+ '+esc(t)+'</span>').join('')+'</div>'+
        '<div class="club-actions"><button class="club-act" onclick="clubSaveDraft()">💾 存入知识库</button><button class="club-act" onclick="clubSaveDraft(\'beauty\')">→ 变美日记</button><button class="club-act" onclick="clubSaveDraft(\'cet\')">→ CET</button><button class="club-act" onclick="clubSaveDraft(\'gongkao\')">→ 公考</button></div></div>';
    }).catch(function(e){box.innerHTML='<div class="mini-note">⚠️ 提炼失败：'+(e&&e.message||e)+'</div>';});
  }).catch(function(){box.innerHTML='<div class="mini-note">⚠️ 网络错误，抓取失败。</div>';});
}
/* 通用「导入资料」：粘贴链接（自动抓取解析）/ 文本 / 上传 .txt/.md 文件，提炼成知识卡片 */
function showImportMaterial(){
  const html='<div class="back-row"><button onclick="closeModal()" aria-label="返回">'+icon('back',20)+'</button><div style="font-weight:600">导入资料</div></div>'+
    '<div class="card"><h3>'+icon('download',16)+' 导入资料</h3>'+
    '<div class="mini-note">粘贴网页链接（自动抓取并解析正文），或粘贴文字 / 上传 .txt·.md 文件，一键提炼成知识卡片。</div>'+
    '<div class="field" style="margin-top:10px"><label>链接 / 文字（多行可批量）</label><textarea id="impMatText" rows="4" placeholder="https://example.com/article&#10;或直接粘贴要收藏的文字…"></textarea></div>'+
    '<div class="field"><label>或上传文件</label><input type="file" id="impMatFile" accept=".txt,.md,text/plain,text/markdown" multiple></div>'+
    '<div class="field"><label>存入</label><select id="impMatTarget">'+
      '<option value="library">个人知识库</option>'+
      '<option value="beauty">变美日记</option>'+
      '<option value="cet">英语等级考试 CET</option>'+
      '<option value="gongkao">公考备战</option></select></div>'+
    '<div id="impMatLog" class="mini-note" style="min-height:18px"></div>'+
    '<div id="impMatResult" style="margin-top:10px"></div>'+
    '<div class="modal-ops"><button class="cancel" onclick="closeModal()">取消</button><button class="save" id="impMatBtn" onclick="importMaterialParse()">解析并导入</button></div>'+
    '</div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
}
function importMaterialParse(){
  const ta=$("#impMatText");const fileEl=$("#impMatFile");const tgt=$("#impMatTarget")?$("#impMatTarget").value:"library";
  const log=$("#impMatLog");
  const tasks=[];
  // 文本区：按行拆分，能识别 http(s) 链接则抓网页，否则当正文
  const lines=(ta&&ta.value||"").split(/\n+/).map(s=>s.trim()).filter(Boolean);
  lines.forEach(function(line){
    if(/^https?:\/\//i.test(line)) tasks.push({type:"url",val:line});
    else tasks.push({type:"text",val:line});
  });
  // 文件：读取为文本
  const files=(fileEl&&fileEl.files)?[].slice.call(fileEl.files):[];
  files.forEach(function(f){ tasks.push({type:"file",file:f}); });
  if(!tasks.length){toast("⚠️ 请粘贴链接/文字或选择文件");return;}
  if(log)log.textContent="正在分析 "+tasks.length+" 项…（摘要 + 关键词 + 分类）";
  const btn=$("#impMatBtn");if(btn){btn.disabled=true;btn.textContent="分析中…";}
  const results=[];
  let done=0,ok=0,fail=0;
  function renderPreview(){
    const box=$("#impMatResult");if(!box)return;
    if(!results.length){box.innerHTML='<div class="mini-note">暂无解析结果</div>';return;}
    box.innerHTML='<div class="imp-res"><div class="imp-res-h">📊 分析完成（共 '+results.length+' 条）</div>'+
      results.map(function(r,i){
        return '<div class="imp-item"><div class="imp-it"><b>'+esc((r.title||"未命名").slice(0,40))+'</b><span class="imp-type">'+esc(r.type)+'</span>'+(r.cat?'<span class="imp-cat">'+esc(r.cat)+'</span>':'')+'</div>'+
          '<div class="imp-sum">'+esc((r.summary||"").slice(0,140))+(r.summary&&r.summary.length>140?"…":"")+'</div>'+
          (r.tags&&r.tags.length?'<div class="imp-tags">'+r.tags.map(t=>'<span class="imp-tag">#'+esc(t)+'</span>').join('')+'</div>':'')+
          '</div>';
      }).join('')+'</div>';
  }
  function finishOne(){ done++; if(log)log.textContent="已完成 "+done+"/"+tasks.length+"（成功 "+ok+" · 失败 "+fail+"）"; renderPreview(); if(done>=tasks.length){ if(btn){btn.disabled=false;btn.textContent="解析并导入";} toast(fail?"⚠️ 部分资料导入失败":"✅ 资料已导入「"+(tgt==="beauty"?"变美日记":tgt==="cet"?"英语等级考试 CET":tgt==="gongkao"?"公考备战":"个人知识库")+"」"); } }
  tasks.forEach(function(t){
    if(t.type==="url"){
      fetchPageText(t.val).then(function(html){
        if(!html){ fail++; finishOne(); return; }
        const meta=extractMeta(html,t.val);
        const title=meta.title||t.val.slice(0,40);
        const content=meta.content||meta.description||meta.firstPara||"";
        return clubExtract(t.val,title,content).then(function(res){
          const card=saveMaterialCard(res.title,res.core,t.val,res.tags||[],tgt);
          results.push({title:res.title,summary:res.core,type:"链接",tags:res.tags,cat:tgt!=="library"?tgt:""});
          ok++; finishOne();
        }).catch(function(){ fail++; finishOne(); });
      }).catch(function(){ fail++; finishOne(); });
    } else if(t.type==="text"){
      const r=clubRuleExtract("",t.val.slice(0,40),t.val);
      saveMaterialCard(r.title||t.val.slice(0,40),r.core||t.val,"",r.tags||[],tgt);
      results.push({title:r.title||t.val.slice(0,40),summary:r.core||t.val,type:"文字",tags:r.tags,cat:tgt!=="library"?tgt:""});
      ok++; finishOne();
    } else if(t.type==="file"){
      const fr=new FileReader();
      fr.onload=function(){
        const txt=fr.result||"";
        const name=t.file.name||"资料";
        // 大文件截断分析，避免卡顿
        const sample=txt.length>6000?txt.slice(0,6000):txt;
        const r=clubRuleExtract("",name,sample);
        const card=saveMaterialCard(r.title||name,r.core||sample,"",r.tags||[],tgt);
        results.push({title:r.title||name,summary:r.core||sample,type:"文件",tags:r.tags,cat:tgt!=="library"?tgt:""});
        ok++; finishOne();
      };
      fr.onerror=function(){ fail++; finishOne(); };
      fr.readAsText(t.file);
    }
  });
}
function saveMaterialCard(title,core,source,tags,target){
  target=target||"library";
  const card={id:uid(),title:sanitizeText(title||"未命名").slice(0,80),core:sanitizeText(core||"").slice(0,2000),source:sanitizeUrl(source||"")||"",tags:sanitizeTags(tags&&tags.length?tags:["导入资料"]),time:nowStamp(),status:"pending",lastReview:null,from:"studyclub"};
  clubCards().unshift(card);
  if(target==="beauty"){state.modules.xiaohongshu.panels.posts.push({id:uid(),title:card.title.slice(0,30),link:source,cat:"变美",points:card.core.slice(0,50)});}
  else if(target==="cet"||target==="gongkao"){const p=MODULE_DEFS[target].panels.find(x=>x.type==="checklist");if(p)state.modules[target].panels[p.key].push({id:uid(),text:card.title.slice(0,30),done:false,doneDate:null});}
  save();try{renderStudyClub();}catch(e){}
  return card;
}
function clubExtract(url,title,content){
  const api=state.meta.apiCfg||{};
  const text=((title||"")+"\n"+(content||"")).slice(0,4000);
  const hasKey=(api.key||(api.keys&&api.keys[api.provider]&&api.keys[api.provider].length));
  if(hasKey){
    const fb=(api.fallback!==false);
    return clubCallAI(api,text,title).catch(function(err){
      if(fb){ console.warn("AI调用失败，降级规则提炼",err); return clubRuleExtract(url,title,content); }
      throw err;
    });
  }
  return Promise.resolve(clubRuleExtract(url,title,content));
}
function apiLogPush(provider,model,ms,ok,err){
  try{
    state.meta.apiCfg=state.meta.apiCfg||{};
    state.meta.apiCfg.log=state.meta.apiCfg.log||[];
    state.meta.apiCfg.log.unshift({t:new Date().toLocaleString("zh-CN"),provider:provider,model:model,ms:Math.round(ms),ok:ok,err:(err&&err.message)||""});
    if(state.meta.apiCfg.log.length>20)state.meta.apiCfg.log=state.meta.apiCfg.log.slice(0,20);
    // 不立即 save，避免高频 IO；调用方负责
  }catch(e){}
}
/* API Key 轻量 Base64 混淆：仅用于本地存储/展示时避免明文落地，调用时还原（非加密，防窥探用） */
/** 对 API Key 做轻量 Base64 混淆（仅避免明文落地，非加密），前缀 "b64:" 标记。 */
function encodeKey(k){ if(!k)return k; try{ return "b64:"+btoa(unescape(encodeURIComponent(k))); }catch(e){ return k; } }
/** 还原 encodeKey 混淆后的密钥；非混淆值原样返回。 */
function decodeKey(s){ if(!s)return s; if(typeof s==="string"&&s.indexOf("b64:")===0){ try{ return decodeURIComponent(escape(atob(s.slice(4)))); }catch(e){ return s; } } return s; }
function deobfApiCfg(api){
  // 返回一份「密钥已还原」的副本，供实际调用使用；不改动原 state
  const a=JSON.parse(JSON.stringify(api||{}));
  a.key=decodeKey(a.key);
  a.keys=a.keys||{}; for(const p in a.keys){ if(Array.isArray(a.keys[p])) a.keys[p]=a.keys[p].map(decodeKey); }
  return a;
}
function apiKeyBanned(provider,key){
  state.meta.apiCfg._ban=state.meta.apiCfg._ban||{};
  const b=state.meta.apiCfg._ban[provider]||{};
  return (b[key]&&b[key]>Date.now());
}
function apiKeyBan(provider,key,ms){
  state.meta.apiCfg._ban=state.meta.apiCfg._ban||{};
  state.meta.apiCfg._ban[provider]=state.meta.apiCfg._ban[provider]||{};
  state.meta.apiCfg._ban[provider][key]=Date.now()+(ms||60000);
}
/* 自动清除已过期的封禁（避免死循环：所有 key 因历史封禁但已到时却一直被判为不可用） */
function clearExpiredBans(provider){
  try{
    state.meta.apiCfg._ban=state.meta.apiCfg._ban||{};
    const now=Date.now();
    const b=state.meta.apiCfg._ban[provider]; if(!b)return;
    for(const k in b){ if(b[k]<=now) delete b[k]; }
    if(Object.keys(b).length===0) delete state.meta.apiCfg._ban[provider];
  }catch(e){}
}
/* 计算可用 key 池：先剔除被封禁的；若剔除后为空，尝试清除过期封禁再算一次；仍为空则拒绝 */
function usableKeyPool(api){
  const p=api.provider;
  clearExpiredBans(p);
  const pool0=(api.keys&&api.keys[p]&&api.keys[p].length)?api.keys[p]:(api.key?[api.key]:[]);
  if(!pool0.length) return {pool0:pool0,usable:[]};
  const pool=pool0.filter(function(k){return !apiKeyBanned(p,k);});
  if(pool.length) return {pool0:pool0,usable:pool};
  // 全部被封禁：再清一次过期（保险），若过期已清除则重新计算
  clearExpiredBans(p);
  const pool2=pool0.filter(function(k){return !apiKeyBanned(p,k);});
  return {pool0:pool0,usable:pool2}; // 若仍为空，usable 为空，调用方应 reject
}
/**
 * 调用 AI 提炼接口（多 Key 轮换 / 封禁跳过 / 超时重试 / 失败降级）。
 * @param {Object} api   配置对象（state.meta.apiCfg），密钥会自动还原
 * @param {string} text  待提炼正文
 * @param {string} title 标题
 * @returns {Promise<{title:string,core:string,data:string,tags:string[]}>}
 */
function clubCallAI(api,text,title){
  api=deobfApiCfg(api); // 还原混淆后的密钥再调用
  const params=api.params||{temperature:0.3,maxTokens:800,topP:1,timeout:15};
  const pr=getProvider(api.provider);
  const pool0=(api.keys&&api.keys[api.provider]&&api.keys[api.provider].length)?api.keys[api.provider]:(api.key?[api.key]:[]);
  if(!pool0.length)return Promise.reject(new Error("未配置 API Key"));
  /* 过滤被临时拉黑的 key；若全部不可用直接拒绝，避免死循环。
     注释一直写着「自动清除过期封禁」，但这里从未真正调用 —— 于是历史封禁到期后
     密钥仍被判为不可用，用户会一直看到「所有 API Key 均不可用」，其实等一会就好。
     （usableKeyPool() 里写对了，但本函数是内联的简化版，没有走它。） */
  clearExpiredBans(api.provider);
  const pool=pool0.filter(function(k){return !apiKeyBanned(api.provider,k);});
  if(!pool.length)return Promise.reject(new Error('所有 API Key 均不可用'));
  const usable=pool;
  // 选下一个 key（轮询，跳过被ban）
  const base=(state.meta.apiCfg&&state.meta.apiCfg._keyIdx)||0;
  let idx=-1;for(let i=0;i<usable.length;i++){ const cand=usable[(base+i)%usable.length]; if(!apiKeyBanned(api.provider,cand)){idx=(base+i)%usable.length;break;} }
  if(idx<0)return Promise.reject(new Error('所有 API Key 均不可用'));
  const usedKey=usable[idx];
  state.meta.apiCfg=state.meta.apiCfg||{}; state.meta.apiCfg._keyIdx=(idx+1)%usable.length;
  const sys="你是一个知识提炼助手。请从用户提供的文章/帖子内容中，提炼出结构化的知识点。只输出 JSON，不要多余文字。格式：{\"title\":\"知识卡片标题\",\"core\":\"3-5条核心观点/方法论/干货步骤，用换行分隔\",\"data\":\"关键数据或具体方法（如时长/数量/公式，没有则留空字符串）\",\"tags\":[\"标签1\",\"标签2\"]}。标签从以下选或自创：变美,穿搭,护肤,学习,六级,四级,公考,方法,效率,健康,心态,阅读。";
  const user="标题："+title+"\n内容：\n"+text;
  const model=api.model||pr.defModel||"model";
  const T=params.temperature!=null?params.temperature:0.3;
  const MAX=params.maxTokens!=null?params.maxTokens:800;
  const TOP=params.topP!=null?params.topP:1;
  function buildReq(key){
    let endpoint,headers,body;
    if(pr.fmt==="openai"){ endpoint=(api.provider==="custom"||(api.provider==="charity"))?api.base:pr.url; headers={"Content-Type":"application/json","Authorization":"Bearer "+key}; body={model:model,messages:[{role:"system",content:sys},{role:"user",content:user}],temperature:T,top_p:TOP,max_tokens:MAX,response_format:{type:"json_object"}}; }
    else if(pr.fmt==="claude"){ endpoint="https://api.anthropic.com/v1/messages"; headers={"Content-Type":"application/json","Authorization":"Bearer "+key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"}; body={model:model,max_tokens:MAX,system:sys,messages:[{role:"user",content:user}],temperature:T}; }
    else if(pr.fmt==="qwen"){ endpoint=pr.url; headers={"Content-Type":"application/json","Authorization":"Bearer "+key}; body={model:model,input:{messages:[{role:"system",content:sys},{role:"user",content:user}]},parameters:{temperature:T,top_p:TOP,max_tokens:MAX,result_format:"message"}}; }
    else if(pr.fmt==="baidu"){ endpoint=pr.url+"?access_token="+key; headers={"Content-Type":"application/json"}; body={messages:[{role:"system",content:sys},{role:"user",content:user}],temperature:T}; }
    return {endpoint:endpoint,headers:headers,body:body};
  }
  function classifyErr(e,status){
    if(status===401||status===403)return "auth";
    if(status===429)return "rate";
    if(e&&/abort|timeout/i.test(e.message||""))return "timeout";
    return "net";
  }
  function attempt(retry){
    const req=buildReq(usedKey);
    if(!req.endpoint)return Promise.reject(new Error("未配置接口地址"));
    const ctrl=mkAbort();
    const timeoutMs=(params.timeout||15)*1000;
    const to=setTimeout(function(){ if(ctrl)ctrl.abort(); }, timeoutMs);
    const t0=Date.now();
    return fetch(req.endpoint,{method:"POST",headers:req.headers,body:JSON.stringify(req.body),signal:(ctrl?ctrl.signal:undefined)}).then(function(r){
      return r.json().then(function(d){return {d:d,ms:Date.now()-t0,status:r.status};});
    }).then(function(o){
      clearTimeout(to);
      const d=o.d;
      if(d.error_code)throw Object.assign(new Error("API错误 "+(d.error_code)+" "+(d.error_msg||"")),{status:o.status});
      if(d.error)throw Object.assign(new Error("API错误 "+(d.error.message||d.error)),{status:o.status});
      let raw="";
      if(d.choices&&d.choices[0]){raw=d.choices[0].message.content;}
      else if(d.output&&d.output.choices&&d.output.choices[0]){raw=d.output.choices[0].message.content;}
      else if(d.content){raw=Array.isArray(d.content)?d.content.map(x=>x.text||"").join(""):d.content;}
      else if(d.result){raw=d.result;}
      raw=(raw||"").trim();
      const m=raw.match(/\{[\s\S]*\}/);if(m)raw=m[0];
      let j;try{j=JSON.parse(raw);}catch(e){ throw Object.assign(new Error("AI 返回非 JSON，已降级规则提炼"),{status:o.status}); }
      apiLogPush(api.provider,model,o.ms,true);save();
      return {title:j.title||title,core:(j.core||"").replace(/^[\s\-•]*|[\s\-•]*$/g,""),data:(j.data||"").replace(/^[\s\-•]*|[\s\-•]*$/g,""),tags:Array.isArray(j.tags)?j.tags.slice(0,6):[]};
    }).catch(function(e){
      clearTimeout(to);
      const kind=classifyErr(e,e.status);
      if(kind==="auth"){ apiKeyBan(api.provider,usedKey,10*60*1000); apiLogPush(api.provider,model,Date.now()-t0,false,e); save(); return Promise.reject(Object.assign(e,{kind:kind})); }
      if(kind==="rate"){ apiKeyBan(api.provider,usedKey,60*1000); apiLogPush(api.provider,model,Date.now()-t0,false,e); save(); if(retry>0)return attempt(retry-1); return Promise.reject(Object.assign(e,{kind:kind})); }
      apiLogPush(api.provider,model,Date.now()-t0,false,e);
      if(retry>0 && kind!=="timeout")return attempt(retry-1);
      return Promise.reject(Object.assign(e,{kind:kind}));
    });
  }
  return attempt(1);
}
/* 通用 AI 问答（复用多 Key 轮换 / 黑名单 / 日志）：用于各栏目「问 AI」浮钮 */
function aiChat(prompt,sysTip){
  const api=deobfApiCfg(state.meta.apiCfg||{}); // 还原混淆后的密钥再调用
  const pool0=(api.keys&&api.keys[api.provider]&&api.keys[api.provider].length)?api.keys[api.provider]:(api.key?[api.key]:[]);
  if(!pool0.length)return Promise.reject(new Error("未配置 API Key"));
  const pool=pool0.filter(function(k){return !apiKeyBanned(api.provider,k);});
  if(!pool.length)return Promise.reject(new Error('所有 API Key 均不可用'));
  const usable=pool;
  const base=(state.meta.apiCfg&&state.meta.apiCfg._keyIdx)||0;
  let idx=-1;for(let i=0;i<usable.length;i++){ if(!apiKeyBanned(api.provider,usable[(base+i)%usable.length])){idx=(base+i)%usable.length;break;} }
  if(idx<0)return Promise.reject(new Error('所有 API Key 均不可用'));
  const usedKey=usable[idx];
  state.meta.apiCfg=state.meta.apiCfg||{}; state.meta.apiCfg._keyIdx=(idx+1)%usable.length;
  const pr=getProvider(api.provider);
  const params=api.params||{temperature:0.3,maxTokens:800,topP:1,timeout:15};
  const model=api.model||pr.defModel||"model";
  const T=params.temperature!=null?params.temperature:0.3, MAX=params.maxTokens!=null?params.maxTokens:800, TOP=params.topP!=null?params.topP:1;
  const sys=sysTip||"你是一个贴心又专业的养成助手，回答简洁、可执行、鼓励为主。用中文，分段清晰。";
  let endpoint,headers,body;
  if(pr.fmt==="openai"){ endpoint=(api.provider==="custom"||(api.provider==="charity"))?api.base:pr.url; headers={"Content-Type":"application/json","Authorization":"Bearer "+usedKey}; body={model:model,messages:[{role:"system",content:sys},{role:"user",content:prompt}],temperature:T,top_p:TOP,max_tokens:MAX}; }
  else if(pr.fmt==="claude"){ endpoint="https://api.anthropic.com/v1/messages"; headers={"Content-Type":"application/json","Authorization":"Bearer "+usedKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"}; body={model:model,max_tokens:MAX,system:sys,messages:[{role:"user",content:prompt}],temperature:T}; }
  else if(pr.fmt==="qwen"){ endpoint=pr.url; headers={"Content-Type":"application/json","Authorization":"Bearer "+usedKey}; body={model:model,input:{messages:[{role:"system",content:sys},{role:"user",content:prompt}]},parameters:{temperature:T,top_p:TOP,max_tokens:MAX,result_format:"message"}}; }
  else if(pr.fmt==="baidu"){ endpoint=pr.url+"?access_token="+usedKey; headers={"Content-Type":"application/json"}; body={messages:[{role:"system",content:sys},{role:"user",content:prompt}],temperature:T}; }
  else return Promise.reject(new Error("未配置接口地址"));
  const ctrl=mkAbort();
  const to=setTimeout(function(){ if(ctrl)ctrl.abort(); }, (params.timeout||15)*1000);
  const t0=Date.now();
  return fetch(endpoint,{method:"POST",headers:headers,body:JSON.stringify(body),signal:(ctrl?ctrl.signal:undefined)}).then(function(r){return r.json().then(function(d){return {d:d,ms:Date.now()-t0};});}).then(function(o){
    clearTimeout(to);
    const d=o.d;let raw="";
    if(d.error_code)throw Object.assign(new Error("API错误 "+(d.error_code)),{status:o.status});
    if(d.error)throw Object.assign(new Error("API错误 "+(d.error.message||d.error)),{status:o.status});
    if(d.choices&&d.choices[0])raw=d.choices[0].message.content;
    else if(d.output&&d.output.choices&&d.output.choices[0])raw=d.output.choices[0].message.content;
    else if(d.content)raw=Array.isArray(d.content)?d.content.map(x=>x.text||"").join(""):d.content;
    else if(d.result)raw=d.result;
    apiLogPush(api.provider,model,o.ms,true);save();
    return (raw||"").trim();
  }).catch(function(e){ clearTimeout(to); apiLogPush(api.provider,model,Date.now()-t0,false,e); save(); throw e; });
}
function clubRuleExtract(url,title,content){
  const txt=(content||"").replace(/\s+/g," ").trim();
  // 拆分步骤/要点
  let core=txt.slice(0,260);
  let tags=[];
  const t=((url||"")+" "+(title||"")+" "+(txt||"")).toLowerCase();
  const reg=[[/小红书|红书/, "变美"], [/穿搭|穿/, "穿搭"], [/护肤|美妆|妆容|口红|发型/, "护肤"], [/六级|四级|cet|考研|英语|单词|词汇|学习/, "学习"], [/公考|行测|申论|公务员|国考|省考/, "公考"], [/方法|技巧|如何|怎么/, "方法"], [/效率|时间管理|番茄/, "效率"], [/健康|减脂|运动|饮食|睡眠/, "健康"], [/心态|焦虑|情绪/, "心态"], [/读书|阅读|书单/, "阅读"]];
  reg.forEach(function(r){if(r[0].test(t))tags.push(r[1]);});
  if(!tags.length)tags=["方法"];
  // 尝试从内容里提取要点列表
  const lines=txt.split(/[。\n.!?；;]/).map(function(s){return s.trim();}).filter(function(s){return s.length>=6&&s.length<=40;}).slice(0,4);
  if(lines.length>=2)core=lines.join("；")+"。";
  return {title:(title||"未命名笔记").slice(0,40),core:core,source:url,tags:tags.slice(0,5)};
}
function clubAddTagFromDraft(t){window._clubDraftTags=window._clubDraftTags||[];if(!window._clubDraftTags.includes(t))window._clubDraftTags.push(t);toast("已加入标签："+t);renderStudyClub();}
function clubSaveDraft(target){
  const d=window._clubDraft;if(!d)return;
  const tags=(window._clubDraftTags&&window._clubDraftTags.length)?window._clubDraftTags:d.tags;
  const card={id:uid(),title:sanitizeText(d.title),core:sanitizeText(d.core),source:sanitizeUrl(d.source||"")||"",tags:sanitizeTags(tags),time:nowStamp(),status:"pending",lastReview:null,target:target||clubTargetSelect(),from:"studyclub"};
  clubCards().unshift(card);
  // 同步存入对应栏目
  if(target==="beauty"){state.modules.xiaohongshu.panels.posts.push({id:uid(),title:card.title.slice(0,30),link:card.source,cat:"变美",points:card.core.slice(0,50)});}
  else if(target==="cet"||target==="gongkao"){const p=MODULE_DEFS[target].panels.find(x=>x.type==="checklist");if(p)state.modules[target].panels[p.key].push({id:uid(),text:card.title.slice(0,30),done:false,doneDate:null});}
  window._clubDraft=null;window._clubDraftTags=null;
  save();renderStudyClub();toast("✅ 知识卡片已存入「"+(target==="beauty"?"变美日记":target==="cet"?"英语等级考试 CET":target==="gongkao"?"公考备战":"个人知识库")+"」");
}
function clubRenderTags(){
  const el=$("#clubTagFilter");if(!el)return;
  const tags=clubTags();const cur=window._clubTagFilter||"";
  el.innerHTML='<span class="club-tag" style="'+(cur===""?"background:var(--primary)":"")+'" onclick="clubTagFilter(\"\")">全部</span>'+
    tags.map(t=>'<span class="club-tag" style="'+(cur===t?"background:var(--primary)":"")+'" onclick="clubTagFilter(\''+t.replace(/'/g,"\\'")+'\')">'+esc(t)+'</span>').join('');
}
function clubTagFilter(t){window._clubTagFilter=t;clubRenderTags();clubRenderKb();}
function clubClearFilter(){const s=$("#clubSearch");if(s)s.value="";window._clubTagFilter="";try{clubRenderTags();}catch(e){}clubRenderKb();}
function clubRenderKb(){
  const el=$("#clubKb");if(!el)return;
  const q=(($("#clubSearch")&&$("#clubSearch").value)||"").trim().toLowerCase();
  const ft=window._clubTagFilter||"";
  let cards=clubCards().filter(c=>(c.from||"studyclub")==="studyclub");
  if(ft)cards=cards.filter(c=>(c.tags||[]).includes(ft));
  if(q)cards=cards.filter(c=>((c.title||"")+" "+(c.core||"")+" "+((c.tags||[]).join(" "))).toLowerCase().indexOf(q)>=0);
  const tip=$("#clubSearchTip");if(tip)tip.textContent=(q||ft)?("匹配 "+cards.length+" 张"):"";
  if(!cards.length){el.innerHTML='<div class="empty-state" style="padding:24px 0"><div class="es-illu">'+emptyIllu('brain')+'<span class="es-deco">✿</span></div><div class="es-tip">知识库还空空</div><div class="es-sub">'+(q||ft?'无匹配卡片，<a href="#" style="color:var(--accent-ink)" onclick="event.preventDefault();clubClearFilter()">清除筛选</a>':"去各栏目底部「投喂记录区」粘贴链接，我来帮你提炼第一张知识卡")+'</div></div>';return;}
  // 按标签分组
  const byTag={};cards.forEach(c=>{(c.tags||["未分类"]).forEach(t=>{byTag[t]=byTag[t]||[];byTag[t].push(c);});});
  let h="";let gi=0;
  Object.keys(byTag).forEach(t=>{
    h+='<div class="kb-group"><div class="kb-group-title">🏷 '+esc(t)+' <span class="grp-cnt">'+byTag[t].length+'</span></div>';
    h+=byTag[t].map(c=>{
      const mastered=c.status==="mastered";
      const rv=reviewLevel(c);
      return '<div class="club-card stagger-item" id="clubCard_'+c.id+'" style="--i:'+(gi++)+'">'+
        '<div class="club-card-top"><span class="club-card-title">'+esc(c.title)+'</span>'+(mastered?'<span class="club-view">'+icon('check',14)+' 已掌握</span>':'')+(rv.label?'<span class="rv-badge '+rv.cls+'">'+rv.label+'</span>':'')+'<span class="from-badge">'+cardFromLabel(c)+'</span></div>'+
        '<div class="club-core" oncontextmenu="event.preventDefault();copyText(\''+escJs(c.core||"")+'\')">'+esc(c.core)+'</div>'+
        '<div class="club-meta">'+icon('clock',13)+' '+esc(c.time)+(c.source?' · '+icon('link',13)+' <a href="'+esc(c.source)+'" target="_blank" style="color:var(--accent-ink)">来源</a>':'')+'</div>'+
        '<div class="club-actions">'+
          '<span class="club-act '+(mastered?"on":"")+'" onclick="clubToggleMaster(\''+c.id+'\')">'+(mastered?'✅ 已掌握':'⭕ 标记为已掌握')+'</span>'+
          '<span class="club-act" onclick="clubToTodo(\''+c.id+'\')">📌 转待办</span>'+
          '<span class="club-act" onclick="clubMarkReview(\''+c.id+'\')">🔁 已复习</span>'+
          '<span class="club-act" onclick="clubDel(\''+c.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg> 删除</span>'+
        '</div></div>';
    }).join('');
    h+='</div>';
  });
  el.innerHTML=h;
}
function clubToggleMaster(cid){const c=clubCards().find(x=>x.id===cid);if(!c)return;c.status=(c.status==="mastered")?"pending":"mastered";save();clubRenderKb();toast(c.status==="mastered"?"✅ 已掌握，干得漂亮！":"已移回待消化");}
function clubMarkReview(cid){
  const c=clubCards().find(x=>x.id===cid);if(!c)return;
  markCardReviewed(c); save(); clubRenderKb();
  const left=reviewDaysLeft(c);
  toast("🔁 已记录复习 · 下次 "+(left>0?left+" 天后":"明天记得再来")+"（间隔 "+reviewInterval(c)+" 天）");
}
function clubToTodo(cid){
  const c=clubCards().find(x=>x.id===cid);if(!c)return;
  const p=MODULE_DEFS.schedule.panels.find(x=>x.key==="daily")||MODULE_DEFS.schedule.panels.find(x=>x.type==="checklist");
  state.modules.schedule.panels[p.key].push({id:uid(),time:"📌 待办",task:c.title.slice(0,30),done:false,doneDate:null,note:("来自知识研习："+(c.core||"").slice(0,40))});
  save();toast("📌 已转入今日待办");
}
function clubDel(cid){
  if(!confirm("删除这张知识卡片？"))return;
  const cards=state.meta.knowledge.cards||[];
  const idx=cards.findIndex(function(x){return x.id===cid;});
  if(idx<0)return;
  const it=cards[idx];
  undoableDelete("「"+String((it&&it.title)||"").slice(0,14)+"」",
    function(){ state.meta.knowledge.cards=cards.filter(function(x){return x.id!==cid;}); save(); renderStudyClub(); return true; },
    function(){ const a=state.meta.knowledge.cards||[];
                a.splice(Math.min(idx,a.length),0,it); state.meta.knowledge.cards=a; save(); renderStudyClub(); });
}
/* ===== 艾宾浩斯复习曲线 =====
   原来是固定的 7/14/30 天三档，跟「这张卡你到底复习过几次」完全无关：
   一张刚背的新卡和一张背了十遍的老卡，提醒节奏一模一样，这显然不合理。
   改为按复习次数递增间隔：1 → 3 → 7 → 14 → 30 → 60 天。
   老数据没有 reviewCount，按 0 处理（新卡待遇），第一次复习后就进入正轨。 */
const REVIEW_STEPS=[1,3,7,14,30,60];
function reviewInterval(card){
  const n=Math.max(0,Math.min(REVIEW_STEPS.length-1,(card&&card.reviewCount)||0));
  return REVIEW_STEPS[n];
}
function reviewDueDate(card){
  if(!card||!card.lastReview) return null;          // 从未复习：一直处于到期状态
  const base=new Date(card.lastReview+"T00:00:00");
  if(isNaN(base.getTime())) return null;
  base.setDate(base.getDate()+reviewInterval(card));
  const pad=function(x){return String(x).padStart(2,"0");};
  return base.getFullYear()+"-"+pad(base.getMonth()+1)+"-"+pad(base.getDate());
}
/* 距离下次到期还剩几天：正数=还有几天，负数=已逾期几天，-99=从未复习 */
function reviewDaysLeft(card){
  const due=reviewDueDate(card);
  if(!due) return -99;
  try{ return daysBetween(todayStr(),due); }catch(e){ return -99; }
}
function reviewLevel(card){
  if(!card) return {lv:0,label:"",cls:""};
  const left=reviewDaysLeft(card);
  if(left<0){
    // 已逾期：逾期超过本次间隔的一半，判定为「遗忘边缘」
    const iv=reviewInterval(card)||1;
    return (-left)>=Math.max(1,Math.round(iv/2))
      ? {lv:3,label:"🔴 遗忘边缘",cls:"rv3"}
      : {lv:2,label:"🟠 该复习",cls:"rv2"};
  }
  if(left<=1) return {lv:1,label:"🟡 待巩固",cls:"rv1"};
  return {lv:0,label:"",cls:""};
}
/* 统一的复习落库入口：记录时间 + 递增次数，间隔随之变长 */
function markCardReviewed(c){
  if(!c) return;
  c.lastReview=todayStr();
  c.reviewCount=((c.reviewCount)||0)+1;
}
/* 给卡片页显示用：下次复习时间 / 当前所处阶段 */
function reviewHint(card){
  const left=reviewDaysLeft(card);
  if(left===-99) return "还没复习过 · 今天记一遍吧";
  if(left<0) return "已逾期 "+(-left)+" 天 · 间隔 "+reviewInterval(card)+" 天";
  if(left===0) return "今天到期 · 间隔 "+reviewInterval(card)+" 天";
  return left+" 天后复习 · 间隔 "+reviewInterval(card)+" 天";
}
function cardFromLabel(card){
  const f=card.from||(card.target==="library"?"":card.target)||"knowledge";
  if(f==="studyclub")return "🧠 知识研习";
  if(f==="knowledge")return "📚 知识库";
  if(f&&MODULE_DEFS[f])return "📌 "+(COLUMN_TITLES[f]||MODULE_DEFS[f].title);
  return "📚 知识库";
}
function reviewStats(){
  const all=allCards();
  const s={l1:0,l2:0,l3:0,pending:0};
  all.forEach(c=>{const r=reviewLevel(c);if(r.lv===1)s.l1++;else if(r.lv===2)s.l2++;else if(r.lv===3)s.l3++;if(c.status!=="mastered")s.pending++;});
  return s;
}
function clubReviewCheck(){
  try{
    if(state.meta.reviewReminder===false)return;
    const now=new Date();if(now.getDay()!==0)return; // 仅周日
    const wk=now.getFullYear()+"-W"+getWeekNum(now);
    if(state.meta.lastReviewSunday===wk)return;
    // #13 已掌握的知识卡片排除在外，不再提示复习
    const unreviewed=clubCards().filter(c=>(c.status!=="mastered")&&((c.from||"studyclub")==="studyclub")&&(!c.lastReview||daysSince(c.lastReview)>=7));
    if(unreviewed.length){state.meta.lastReviewSunday=wk;save();setTimeout(function(){toast("📚 本周有 "+unreviewed.length+" 条未复习的知识卡片，记得回「知识研习」复习～");},1500);}
  }catch(e){}
}
function getWeekNum(d){const onejan=new Date(d.getFullYear(),0,1);return Math.ceil((((d-onejan)/86400000)+onejan.getDay()+1)/7);}

/* ============ 知识库 📚（独立数据源，与投喂分离） ============ */
function kbCards(){state.meta.knowledge=state.meta.knowledge||{cards:[]};state.meta.knowledge.cards=state.meta.knowledge.cards||[];return state.meta.knowledge.cards;}
function showKnowledge(){
  currentView="knowledge";saveLastView();$("#view-home").classList.remove("active");$("#view-module").classList.add("active");navSmall();
  $("#topTitle").innerHTML=icon("book2")+" 知识库";renderKnowledge();renderDrawer();renderBotTab();
}
function renderKnowledge(){
  const v=$("#view-module");
  const cards=kbCards().slice();
  // #1 整块重绘前记下滚动位置（分页加载更多之后回到此处不会跳回顶部）
  let _keep=0; try{ _keep=(v&&v.scrollTop)||0; }catch(e){}
  // 顶部 banner 配图
  const bimg=readImage("meta.images.knowledge");
  const bcov=(state.meta.coverStyle&&state.meta.coverStyle.knowledge)||{mode:"cover",x:0,y:0,scale:1};
  const bimgHtml=bimg?('<div class="banner-img" style="background-image:url('+bimg+');'+coverCss(bcov)+';'+coverFilterCss()+'"></div>'):'';
  let html='<div class="back-row"><button onclick="showHome()" aria-label="返回"><svg class="svg-ic" viewBox="0 0 24 24" width="20" height="20"><path d="M15 5l-7 7 7 7"/></svg></button><div style="font-weight:600">'+icon('book',18)+' 知识库</div></div>';
  html+='<div class="banner" onclick="openCoverEditor(\'knowledge\')">'+bimgHtml+'<span class="bcap">点击设置 / 调整栏目配图</span></div>';
  // API 配置按钮
  html+='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">API 提炼配置</h3><button class="feed-play" style="padding:6px 12px" onclick="openKbApiCfg()">配置 API</button></div>'+
    '<div class="mini-note">有 Key 调 AI 提炼，无 Key 用规则提炼。Key 仅存本机。</div></div>';
  // 输入区
  html+='<div class="card"><h3>'+icon('download',16)+' 投喂与提炼</h3>'+
    '<div class="club-input"><textarea id="kbIn" rows="3" placeholder="粘贴链接（小红书/公众号/B站/知乎/任意网页）或文本；多行可批量导入多个链接" style="flex:1;padding:11px;border:1px solid var(--glass-border);border-radius:var(--radius-l);font-size:13px;background:var(--glass-flat);color:var(--text);resize:vertical"></textarea></div>'+
    '<div class="mb-ops"><button class="feed-play" onclick="kbExtract()">'+icon('sparkle',14)+' 提炼</button><button class="btn-ghost" onclick="kbExtractBatch()">'+icon('book',14)+' 批量导入</button></div>'+
    '<div id="kbResult" class="mini-note"></div></div>';
  // 统计
  const total=cards.length,mastered=cards.filter(c=>c.status==="mastered").length,pending=total-mastered;
  html+='<div class="club-stats"><div class="club-st"><b>'+total+'</b><span>总卡片</span></div><div class="club-st"><b>'+pending+'</b><span>待消化</span></div><div class="club-st"><b>'+mastered+'</b><span>已掌握</span></div>'+
    '<div class="club-st"><b>'+kbTagList().length+'</b><span>标签数</span></div></div>';
  const masterRate = total>0 ? Math.round(mastered/total*100) : 0;
  html+='<div class="club-master"><div class="ring-progress" data-value="'+masterRate+'" title="掌握度 '+masterRate+'%">'+
    '<svg class="ring-svg" viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="var(--line)" stroke-width="4"></circle>'+
    '<circle cx="28" cy="28" r="24" fill="none" stroke="url(#kbGrad)" stroke-width="4" stroke-linecap="round" class="ring-circle"></circle></svg>'+
    '<div class="ring-center"><span class="ring-number">'+masterRate+'%</span><span class="ring-label">掌握度</span></div></div>'+
    '<div class="club-master-txt"><b>'+mastered+' / '+total+'</b> 张已掌握<span class="club-master-sub">'+(total-mastered)+' 张待消化，继续加油 🌸</span></div></div>';
  html+='<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="kbGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="var(--primary)"/><stop offset="100%" stop-color="var(--accent)"/></linearGradient></defs></svg>';
  // 筛选/检索/排序
  html+='<div class="card accent-knowledge"><h3>🗂 知识卡片管理 <span class="tag">筛选 / 检索 / 排序</span></h3>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><button class="feed-play" style="padding:5px 12px;font-size:12px" onclick="kbToggleSelMode()">'+(window._kbSelMode?''+icon("close",14)+' 退出选择':''+icon("check",14)+' 选择')+'</button>'+(window._kbSelMode?'<span id="kbSelCount" style="font-size:12px;color:var(--accent-ink)">已选 0 张</span>':'')+'</div>'+
    '<div class="kb-search"><input id="kbSearch" placeholder="🔍 检索（标题/核心观点/标签）" oninput="kbRenderList()" onkeydown="if(event.key===\'Enter\')this.blur()" /><span class="feed-search-tip" id="kbSearchTip"></span></div>'+
    '<div class="target-pick" id="kbTagFilter"></div>'+
    '<div style="display:flex;gap:6px;margin:6px 0"><span style="font-size:12px;color:var(--gray)">排序：</span>'+
      '<button class="feed-act '+(window._kbSort==="time"||!window._kbSort?"on":"")+'" onclick="kbSetSort(\'time\')">最新</button>'+
      '<button class="feed-act '+(window._kbSort==="status"?"on":"")+'" onclick="kbSetSort(\'status\')">待消化优先</button>'+
      '<button class="feed-act '+(window._kbSort==="title"?"on":"")+'" onclick="kbSetSort(\'title\')">标题</button></div>'+
    (window._kbSelMode?'<div class="kb-batch"><button class="feed-play" onclick="kbBatchMaster()">'+icon("checkCircle",14)+' 标记掌握</button><button class="feed-play" style="background:linear-gradient(135deg,#c88,#a66) !important" onclick="kbBatchDel()"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg> 批量删除</button><button class="feed-play" style="background:var(--glass-solid) !important;color:var(--text)" onclick="kbSelAll()">全选</button></div>':'')+
    /* #19 列表容器先落骨架：紧随其后的 kbRenderList() 会整段覆写；
       若 kbRenderList 抛错，这里也不会留下一个空白的容器。 */
    '<div id="kbList">'+skeletonHtml(2)+'</div></div>';
  // 投喂记录区（栏目最底部统一放置）
  html+=renderFeedArea("knowledge");
  v.innerHTML=html;
  // #1 还原滚动位置（仅当新内容仍足够高）
  try{ if(_keep>0 && (v.scrollHeight-v.clientHeight)>=_keep){ requestAnimationFrame(function(){ try{ v.scrollTop=_keep; }catch(e){} }); } }catch(e){}
  kbRenderTagsFilter();
  kbRenderList();
  // 组件八：知识卡片长按菜单（事件委托到 #kbList，重渲染后依然有效）
  bindCtxDelegated("#kbList", ".club-card", [
    {icon:"✏️",label:"编辑卡片",cb:function(el){ kbEdit(el.id.replace("kbCard_","")); }},
    {icon:"✅",label:"标记掌握",cb:function(el){ kbToggleMaster(el.id.replace("kbCard_","")); }},
    {icon:"📌",label:"转为待办",cb:function(el){ kbToTodo(el.id.replace("kbCard_","")); }},
    {icon:"🗑",label:"删除卡片",danger:true,cb:function(el){ kbDel(el.id.replace("kbCard_","")); }}
  ]);
}
function kbTagList(){const set=new Set();kbCards().forEach(c=>(c.tags||[]).forEach(t=>set.add(t)));return Array.from(set);}
function kbSetSort(s){window._kbSort=s;kbRenderList();}
function kbRenderTagsFilter(){
  const el=$("#kbTagFilter");if(!el)return;const tags=kbTagList();const cur=window._kbTag||"";
  let h='<div class="tag-cloud" id="kbTagCloud">';
  h+='<span class="tag-chip'+(cur===""?" active":"")+'" data-tag="">全部</span>';
  tags.forEach(function(t){ h+='<span class="tag-chip'+(cur===t?" active":"")+'" data-tag="'+esc(t)+'">'+esc(t)+'</span>'; });
  h+='</div>';
  el.innerHTML=h;
  const cloud=$("#kbTagCloud");
  if(cloud)initTagCloud(cloud, function(tag){ kbTagFilter(tag||""); });
}
function kbTagFilter(t){window._kbTag=t;kbRenderTagsFilter();kbRenderList();}
function kbClearFilter(){const s=$("#kbSearch");if(s)s.value="";window._kbTag="";window._kbSort="time";try{kbRenderTagsFilter();}catch(e){}kbRenderList();}
/* 知识卡片列表：分页渲染（默认 20 张，点「加载更多」每次追加 20 张）
   过去一次性渲染全部 + 硬截断 60 张：卡片多了会卡，且 60 张之后的卡片根本看不到，只能靠搜索。
   现在改为「筛选结果签名 + 已显示数量」驱动，切换筛选/排序/检索时自动回到第一页。 */
const KB_PAGE=20;
/* 按当前检索/标签/排序产出完整结果集（分页与「加载更多」共用，保证两处口径一致） */
function kbFilteredCards(){
  const q=(($("#kbSearch")&&$("#kbSearch").value)||"").trim().toLowerCase();
  const ft=window._kbTag||"";
  const sort=window._kbSort||"time";
  let cards=kbCards().slice();
  if(ft)cards=cards.filter(function(c){ return (c.tags||[]).indexOf(ft)>=0; });
  if(q)cards=cards.filter(function(c){
    return (((c.title||"")+" "+(c.core||"")+" "+((c.tags||[]).join(" "))).toLowerCase().indexOf(q)>=0);
  });
  if(sort==="time")cards.sort(function(a,b){ return String(b.time||"").localeCompare(String(a.time||"")); });
  else if(sort==="status")cards.sort(function(a,b){ return (a.status==="mastered"?1:0)-(b.status==="mastered"?1:0); });
  else if(sort==="title")cards.sort(function(a,b){ return (a.title||"").localeCompare(b.title||""); });
  return cards;
}
/* 单张卡片 HTML（分页首屏与追加复用同一份实现，避免两处样式漂移） */
function kbCardHtml(c,i){
  const mastered=c.status==="mastered";
  const rv=reviewLevel(c);
  const sel=window._kbSelMode&&(window._kbSel||{});
  const checked=sel&&sel[c.id];
  const selAttr=window._kbSelMode?(' onclick="kbToggleSelect(\''+c.id+'\')"'):'';
  return '<div class="club-card stagger-item'+(window._kbSelMode?" sel-mode":"")+(checked?" selected":"")+'" id="kbCard_'+c.id+'" style="--i:'+i+selAttr+'">'+
    (window._kbSelMode?'<span class="kb-check '+(checked?"on":"")+'">'+(checked?"✓":"")+'</span>':'')+
    '<div class="club-card-top"><span class="club-card-title">'+esc(c.title)+'</span>'+(mastered?'<span class="club-view">✅ 已掌握</span>':'')+(rv.label?'<span class="rv-badge '+rv.cls+'">'+rv.label+'</span>':'')+'<span class="from-badge">'+cardFromLabel(c)+'</span></div>'+
    '<div class="club-core" oncontextmenu="event.preventDefault();copyText(\''+escJs(c.core||"")+'\')">'+(c.core||"").replace(/\n/g,"<br>")+'</div>'+
    (c.data?'<div class="club-meta">'+icon('chart',13)+' 关键数据/方法：'+esc(c.data)+'</div>':'')+
    '<div class="club-meta">'+icon('clock',13)+' '+esc(c.time)+(c.source?' · '+icon('link',13)+' <a href="'+esc(c.source)+'" target="_blank" style="color:var(--accent-ink)">来源</a>':'')+'</div>'+
    '<div class="club-tags">'+(c.tags||[]).map(function(t){ return '<span class="club-tag">'+esc(t)+'</span>'; }).join('')+'</div>'+
    (window._kbSelMode?'':'<div class="club-actions">'+
      '<span class="club-act '+(mastered?"on":"")+'" onclick="kbToggleMaster(\''+c.id+'\')">'+(mastered?'✅ 已掌握':'⭕ 标记掌握')+'</span>'+
      '<span class="club-act" onclick="kbEdit(\''+c.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg> 编辑</span>'+
      '<span class="club-act" onclick="kbToTodo(\''+c.id+'\')">📌 转待办</span>'+
      '<span class="club-act" onclick="kbSend(\''+c.id+'\',\'refinement\')">→ 变美日记</span>'+
      '<span class="club-act" onclick="kbSend(\''+c.id+'\',\'cet\')">→ CET</span>'+
      '<span class="club-act" onclick="kbSend(\''+c.id+'\',\'gongkao\')">→ 公考</span>'+
      '<span class="club-act" onclick="kbSend(\''+c.id+'\',\'schedule\')">→ 今日日程</span>'+
      '<span class="club-act" onclick="kbDel(\''+c.id+'\')"><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg> 删除</span>'+
    '</div>')+'</div></div>';
}
/* 列表尾部提示 / 加载更多按钮 */
function kbMoreHtml(total,shown){
  if(shown>=total) return '<div class="mini-note kb-tail" style="text-align:center;color:var(--gray);margin-top:10px">已显示全部 '+total+' 张卡片</div>';
  return '<button class="feed-more-btn kb-tail" id="kbMore" onclick="kbShowMore()">加载更多（已显示 '+shown+' / '+total+'）</button>';
}
function kbRenderList(){
  const el=$("#kbList"); if(!el)return;
  const cards=kbFilteredCards();
  const q=(($("#kbSearch")&&$("#kbSearch").value)||"").trim().toLowerCase();
  const ft=window._kbTag||"";
  const tip=$("#kbSearchTip"); if(tip)tip.textContent=(q||ft)?("匹配 "+cards.length+" 张"):"";
  if(!cards.length){
    el.innerHTML='<div class="empty-state" style="padding:24px 0"><div class="es-illu">'+emptyIllu('brain')+'<span class="es-deco">🌸</span></div><div class="es-tip">知识库还空空</div><div class="es-sub">'+(q||ft?'无匹配卡片，<a href="#" style="color:var(--accent-ink)" onclick="event.preventDefault();kbClearFilter()">清除筛选</a>':"去各栏目底部「📥 投喂记录区」粘贴链接，我来帮你提炼第一张知识卡 🌸")+'</div></div>';
    return;
  }
  // 筛选条件变化（或卡片增删）时回到第一页
  const sig=(window._kbSort||"time")+"|"+ft+"|"+q+"|"+cards.length;
  if(window._kbSig!==sig){ window._kbSig=sig; window._kbShown=KB_PAGE; }
  const show=Math.max(KB_PAGE,Math.min(cards.length,window._kbShown||KB_PAGE));
  window._kbShown=show;
  el.innerHTML=cards.slice(0,show).map(function(c,i){ return kbCardHtml(c,i); }).join('')+kbMoreHtml(cards.length,show);
  if(window._kbSelMode)updateKbSelCount();
}
/* 追加下一页：只插入新增片段，不整表重绘，滚动位置不丢失 */
function kbShowMore(){
  const el=$("#kbList"); if(!el)return;
  const cards=kbFilteredCards();
  const prev=window._kbShown||KB_PAGE;
  const next=Math.min(cards.length,prev+KB_PAGE);
  const tail=el.querySelector(".kb-tail"); if(tail)tail.remove();
  const frag=document.createElement("div");
  frag.innerHTML=cards.slice(prev,next).map(function(c,k){ return kbCardHtml(c,prev+k); }).join('');
  while(frag.firstChild) el.appendChild(frag.firstChild);
  window._kbShown=next;
  const wrap=document.createElement("div");
  wrap.innerHTML=kbMoreHtml(cards.length,next);
  el.appendChild(wrap.firstChild);
  if(window._kbSelMode)updateKbSelCount();
}
function kbToggleSelMode(){window._kbSelMode=!window._kbSelMode;if(!window._kbSelMode)window._kbSel={};renderKnowledge();}
function kbToggleSelect(id){window._kbSel=window._kbSel||{};if(window._kbSel[id])delete window._kbSel[id];else window._kbSel[id]=true;const card=document.getElementById("kbCard_"+id);if(card)card.classList.toggle("selected");updateKbSelCount();}
function kbSelAll(){const cards=kbCards();window._kbSel={};cards.forEach(c=>window._kbSel[c.id]=true);renderKnowledge();}
function updateKbSelCount(){const n=window._kbSel?Object.keys(window._kbSel).length:0;const el=document.getElementById("kbSelCount");if(el)el.textContent="已选 "+n+" 张";}
function kbBatchMaster(){const sel=window._kbSel||{};const ids=Object.keys(sel);if(!ids.length){toast("⚠️ 请先选择卡片");return;}let n=0;ids.forEach(id=>{const c=kbCards().find(x=>x.id===id);if(c&&c.status!=="mastered"){c.status="mastered";c.lastReview=c.lastReview||todayStr();n++;}});save();window._kbSelMode=false;window._kbSel={};renderKnowledge();toast("✅ 已标记 "+n+" 张为掌握");}
function kbBatchDel(){
  const sel=window._kbSel||{};const ids=Object.keys(sel);
  if(!ids.length){toast("⚠️ 请先选择卡片");return;}
  showActionSheet("批量删除", [
    {icon:"🗑",label:"确认删除选中的 "+ids.length+" 张",danger:true,cb:function(){
      const pairs=[];kbCards().forEach(function(c,i){ if(sel[c.id]) pairs.push({i:i,c:c}); });
      undoableDelete(" "+pairs.length+" 张卡片",
        function(){ state.meta.knowledge.cards=kbCards().filter(x=>!sel[x.id]);
                    save();window._kbSelMode=false;window._kbSel={};renderKnowledge();return true; },
        function(){ const a=kbCards();
                    pairs.slice().sort(function(p,q){return p.i-q.i;}).forEach(function(p){ a.splice(Math.min(p.i,a.length),0,p.c); });
                    state.meta.knowledge.cards=a; save(); renderKnowledge(); });
    }},
    {icon:"↩️",label:"取消"}
  ], function(item){ if(item&&item.cb)item.cb(); });
}
function kbToggleMaster(cid){const c=kbCards().find(x=>x.id===cid);if(!c)return;c.status=(c.status==="mastered")?"pending":"mastered";save();kbRenderList();renderKnowledge();toast(c.status==="mastered"?"✅ 已掌握":"已移回待消化");}
function kbDel(cid){
  const c=kbCards().find(x=>x.id===cid);
  const idx=kbCards().findIndex(x=>x.id===cid);
  showActionSheet("删除知识卡片"+(c?("：「"+c.title.slice(0,12)+"」"):""), [
    {icon:"🗑",label:"确认删除这张卡片",danger:true,cb:function(){
      undoableDelete("「"+String((c&&c.title)||"").slice(0,14)+"」",
        function(){ state.meta.knowledge.cards=kbCards().filter(x=>x.id!==cid); save(); renderKnowledge(); return true; },
        function(){ const a=kbCards(); a.splice(Math.min(idx,a.length),0,c);
                    state.meta.knowledge.cards=a; save(); renderKnowledge(); });
    }},
    {icon:"↩️",label:"取消"}
  ], function(item){ if(item&&item.cb)item.cb(); });
}
function kbEdit(cid){
  const c=kbCards().find(x=>x.id===cid);if(!c)return;
  let html='<h3><svg class="svg-ic" viewBox="0 0 24 24" width="15" height="15"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg> 编辑知识卡片</h3>'+
    '<div class="field"><label>标题</label><input id="kbe_title" value="'+esc(c.title||"")+'"></div>'+
    '<div class="field"><label>核心观点（每行一条）</label><textarea id="kbe_core" style="min-height:90px">'+esc(c.core||"")+'</textarea></div>'+
    '<div class="field"><label>关键数据 / 方法</label><input id="kbe_data" value="'+esc(c.data||"")+'"></div>'+
    '<div class="field"><label>来源链接</label><input id="kbe_source" value="'+esc(c.source||"")+'"></div>'+
    '<div class="field"><label>标签（逗号分隔）</label><input id="kbe_tags" value="'+esc((c.tags||[]).join(","))+'"></div>'+
    '<div class="modal-ops"><button class="cancel" onclick="closeModal()">取消</button><button class="save" onclick="kbSaveEdit(\''+cid+'\')">保存</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
}
function kbSaveEdit(cid){
  const c=kbCards().find(x=>x.id===cid);if(!c)return;
  c.title=$("#kbe_title").value.trim()||"未命名";
  c.core=$("#kbe_core").value.trim();
  c.data=$("#kbe_data").value.trim();
  c.source=$("#kbe_source").value.trim();
  c.tags=$("#kbe_tags").value.split(/[,，]/).map(s=>s.trim()).filter(Boolean);
  save();closeModal();renderKnowledge();toast("✅ 已保存");
}
function kbSend(cid,target){
  const c=kbCards().find(x=>x.id===cid);if(!c)return;
  if(target==="schedule"){const p=MODULE_DEFS.schedule.panels.find(x=>x.key==="daily")||MODULE_DEFS.schedule.panels.find(x=>x.type==="checklist");const arr=state.modules.schedule.panels[p.key];arr.push({id:uid(),time:"📚 知识卡片",task:c.title.slice(0,28),done:false,doneDate:null});save();toast("✅ 已加入今日日程打卡");}
  else{const p=MODULE_DEFS[target].panels.find(x=>x.type==="checklist");if(!p){toast("⚠️ 该栏目无打卡项");return;}const arr=state.modules[target].panels[p.key];arr.push({id:uid(),text:c.title.slice(0,28),done:false,doneDate:null});save();toast("✅ 已存入「"+(COLUMN_TITLES[target]||target)+"」");}
}
function kbToTodo(cid){
  // 一键转待办：作为「今日日程·每日待办」可勾选打卡项（带来源标签便于回溯）
  const c=kbCards().find(x=>x.id===cid);if(!c)return;
  const p=MODULE_DEFS.schedule.panels.find(x=>x.key==="daily")||MODULE_DEFS.schedule.panels.find(x=>x.type==="checklist");
  state.modules.schedule.panels[p.key].push({id:uid(),time:"📌 待办",task:c.title.slice(0,30),done:false,doneDate:null,note:("来自知识库："+(c.core||"").slice(0,40))});
  save();toast("📌 已转入今日待办，去勾选完成吧");
}
function kbMakeCard(draft,target,fromCol){
  const card={id:uid(),title:sanitizeText(draft.title),core:sanitizeText(draft.core),data:sanitizeText(draft.data||""),source:sanitizeUrl(draft.source||"")||"",tags:sanitizeTags(draft.tags||[]),time:nowStamp(),status:"pending",lastReview:null,target:target||"",from:fromCol||"knowledge"};
  kbCards().unshift(card);
  if(target&&target!=="knowledge"&&target!=="library"){
    if(target==="schedule"){const p=MODULE_DEFS.schedule.panels.find(x=>x.key==="daily")||MODULE_DEFS.schedule.panels.find(x=>x.type==="checklist");state.modules.schedule.panels[p.key].push({id:uid(),time:"📚 知识卡片",task:card.title.slice(0,28),done:false,doneDate:null});}
    else{const p=MODULE_DEFS[target].panels.find(x=>x.type==="checklist");if(p)state.modules[target].panels[p.key].push({id:uid(),text:card.title.slice(0,28),done:false,doneDate:null});}
  }
  save();
}
function kbExtract(){
  const el=$("#kbIn");if(!el)return;const raw=el.value.trim();if(!raw){toast("⚠️ 请输入链接或文本");return;}
  const box=$("#kbResult");box.innerHTML='<div class="mini-note">⏳ 解析中…</div>';
  const links=raw.match(/https?:\/\/\S+/g)||[];
  if(links.length){
    const url=links[0];const note=raw.replace(url,"").trim();
    fetchPageText(url).then(function(html){
      const meta=extractMeta(html,url);const title=meta.title||url.slice(0,40);const content=meta.content||meta.description||meta.firstPara||note;
      box.innerHTML='<div class="mini-note">✅ 已抓取，调用提炼…</div>';
      kbDoExtract(url,title,content,note).then(function(r){window._kbDraft=r;box.innerHTML=kbDraftPreview(r);});
    }).catch(function(){box.innerHTML='<div class="mini-note">⚠️ 抓取失败，可手动粘贴文本再提炼。</div>';});
  }else{
    // 纯文本直接规则提炼
    const r=clubRuleExtract("",raw.slice(0,60),raw);
    window._kbDraft=r;box.innerHTML=kbDraftPreview(r);
  }
}
function kbNormTag(t){
  if(!t)return "";
  t=String(t).trim().replace(/[,，;；、]+/g," ").replace(/\s+/g,"");
  if(!t)return "";
  // 统一别名
  const alias={知識:"知识",學習:"学习",閱讀:"阅读",讀書:"阅读",減脂:"健康",運動:"健康",情緒:"心态",焦慮:"心态",效率:"效率",方法:"方法",技巧:"方法"};
  return alias[t]||t;
}
function kbAutoTag(draft){
  // 标签标准化 + 兜底，确保每张卡至少带标签且不超过 6 个
  let tags=(draft.tags||[]).map(kbNormTag).filter(Boolean);
  const seen={};tags=tags.filter(t=>{if(seen[t])return false;seen[t]=1;return true;});
  if(!tags.length)tags=["方法"];
  draft.tags=tags.slice(0,6);
  return draft;
}
/* AI 提炼结果本地缓存（#31）：以链接 URL 为 key，7 天内重复点击直接返回缓存，
   省 API 额度也更快。规则提炼（无 Key 时）稳定可复现，也一并缓存。 */
function kbExtractCacheGet(url){
  try{
    if(!url) return null;
    const c=state.meta.kbExtractCache; if(!c||!c[url]) return null;
    const rec=c[url]; if(Date.now()-(rec.at||0) > 7*24*3600*1000) return null; // 7 天过期
    return rec.r;
  }catch(e){ return null; }
}
function kbExtractCachePut(url,r){
  try{
    if(!url) return;
    state.meta.kbExtractCache=state.meta.kbExtractCache||{};
    state.meta.kbExtractCache[url]={at:Date.now(),r:r};
    // 控制体积：最多保留 200 条，超出删最旧的
    const keys=Object.keys(state.meta.kbExtractCache);
    if(keys.length>200){ keys.sort(function(a,b){return (state.meta.kbExtractCache[a].at||0)-(state.meta.kbExtractCache[b].at||0);});
      keys.slice(0,keys.length-200).forEach(function(k){ delete state.meta.kbExtractCache[k]; }); }
  }catch(e){}
}
function kbDoExtract(url,title,content,note){
  const api=state.meta.apiCfg||{};
  const text=((title||"")+"\n"+(content||note||"")).slice(0,4000);
  const hasKey=(api.key||(api.keys&&api.keys[api.provider]&&api.keys[api.provider].length));
  // 命中缓存直接返回（#31）
  const cached=kbExtractCacheGet(url);
  if(cached){
    if(!window._kbCacheHint){ window._kbCacheHint=true; setTimeout(function(){ try{ toast("💡 本次直接用了 7 天内的提炼缓存，没再调接口"); }catch(e){} },400); }
    return Promise.resolve(kbAutoTag(cached));
  }
  if(hasKey){
    const fb=(api.fallback!==false);
    return clubCallAI(api,text,title).then(function(r){ kbExtractCachePut(url,r); return kbAutoTag(r); }).catch(function(){
      if(fb)return kbAutoTag(clubRuleExtract(url,title,content||note));
      return {title:title,core:"",tags:[],source:url};
    });
  }
  const rr=kbAutoTag(clubRuleExtract(url,title,content||note));
  kbExtractCachePut(url,rr);
  return Promise.resolve(rr);
}
function kbDraftPreview(r){
  return '<div class="club-card pop-in"><div class="club-card-top"><span class="club-card-title">📌 '+esc(r.title)+'</span></div>'+
    '<div class="club-core">'+esc(r.core)+'</div>'+
    (r.data?'<div class="club-meta">📊 关键数据/方法：'+esc(r.data)+'</div>':'')+
    (r.source?'<div class="club-meta">🔗 '+esc(r.source.slice(0,50))+'…</div>':'')+
    '<div class="club-tags">'+r.tags.map(function(t){return '<span class="club-tag" onclick="kbDraftAddTag(\''+t.replace(/'/g,"\\'")+'\')">+ '+esc(t)+'</span>';}).join('')+'</div>'+
    '<div class="club-actions"><button class="club-act" onclick="kbSaveDraft(\'knowledge\')">💾 存入知识库</button><button class="club-act" onclick="kbSaveDraft(\'refinement\')">→ 变美日记</button><button class="club-act" onclick="kbSaveDraft(\'cet\')">→ CET</button><button class="club-act" onclick="kbSaveDraft(\'gongkao\')">→ 公考</button><button class="club-act" onclick="kbSaveDraft(\'schedule\')">→ 今日日程</button></div></div>';
}
function kbDraftAddTag(t){window._kbDraftTags=window._kbDraftTags||[];if(!window._kbDraftTags.includes(t))window._kbDraftTags.push(t);toast("已加标签："+t);renderKnowledge();}
function kbSaveDraft(target){
  const d=window._kbDraft;if(!d){toast("⚠️ 无提炼结果");return;}
  const tags=(window._kbDraftTags&&window._kbDraftTags.length)?window._kbDraftTags:d.tags;
  d.tags=tags;kbMakeCard(d,target,"knowledge");window._kbDraft=null;window._kbDraftTags=null;
  renderKnowledge();toast("✅ 已"+(target==="knowledge"||!target?"存入知识库":("存入「"+(COLUMN_TITLES[target]||target)+"」")));
}
function kbExtractBatch(){
  const el=$("#kbIn");if(!el)return;const raw=el.value.trim();if(!raw){toast("⚠️ 请输入内容");return;}
  const links=raw.match(/https?:\/\/\S+/g)||[];
  if(links.length){
    toast("⏳ 批量提炼 "+links.length+" 个链接…");
    let done=0;
    links.forEach(function(url){
      fetchPageText(url).then(function(html){
        const meta=extractMeta(html,url);const title=meta.title||url.slice(0,40);const content=meta.content||meta.description||meta.firstPara||"";
        return kbDoExtract(url,title,content,"");
      }).then(function(r){r.source=url;kbMakeCard(r,"knowledge");done++;if(done===links.length){renderKnowledge();toast("✅ 已批量提炼 "+done+" 张卡到知识库");}})
      .catch(function(){done++;if(done===links.length){renderKnowledge();toast("⚠️ 部分链接失败，已处理 "+done+" 张");}});
    });
  }else{
    // 多行文本，逐行规则提炼
    const lines=raw.split(/\n+/).map(s=>s.trim()).filter(Boolean);
    lines.forEach(function(t){const r=clubRuleExtract("",t.slice(0,40),t);kbMakeCard(r,"knowledge");});
    renderKnowledge();toast("✅ 已提炼 "+lines.length+" 条文本为知识卡");
  }
}
function openKbApiCfg(){
  const api=state.meta.apiCfg||{provider:"kimi",key:"",model:""};
  let html='<h3>配置 AI 提炼 API</h3><div class="mini-note">填入后提炼更精准；不填则用规则提炼。Key 仅存本机。</div>'+
    '<div class="field"><label>服务商</label><select id="kbApiProv" onchange="kbProvChange()">'+providerOptions(api.provider)+'</select></div>'+
    '<div class="field"><label>API Key</label><input id="kbApiKey" type="password" placeholder="sk-..." value="'+esc(api.key||"")+'"></div>'+
    '<div class="field"><label>模型</label>'+modelSelectHtml(api.provider, api.model, "kb")+'</div>'+
    '<div class="modal-ops"><button class="cancel" onclick="closeModal()">取消</button><button class="save" onclick="saveKbApiCfg()">保存</button></div>';
  $("#modalBox").innerHTML=html;$("#modalMask").classList.add("show");
}
function kbProvChange(){
  const p=$("#kbApiProv").value;
  state.meta.apiCfg=state.meta.apiCfg||{}; state.meta.apiCfg.provider=p;
  // 重新渲染模型字段（第 3 个 .field）
  const modelField=document.querySelectorAll("#modalBox .field")[2];
  if(modelField)modelField.innerHTML='<label>模型</label>'+modelSelectHtml(p, "", "kb");
}
function saveKbApiCfg(){
  state.meta.apiCfg=state.meta.apiCfg||{};
  state.meta.apiCfg.provider=$("#kbApiProv").value;
  state.meta.apiCfg.key=$("#kbApiKey").value.trim();
  const sel=$("#kbModelSel");
  state.meta.apiCfg.model=(sel&&sel.value!=="__custom__")?sel.value.trim():($("#kbModel")?$("#kbModel").value.trim():"");
  const p=$("#kbApiProv").value;
  if(p==="custom"||p==="charity"){/* KB 弹窗不含 base，保留原值 */}
  save();closeModal();renderKnowledge();toast(state.meta.apiCfg.key?"🔑 API 已保存":"✅ 已保存（无 Key，规则提炼）");
}

function renderPhotos(id){
  const m=state.modules[id];m.photos=m.photos||{};
  const plusPh='<svg class="svg-ic" viewBox="0 0 24 24" width="22" height="22"><path d="M12 5v14M5 12h14"/></svg>';
  const slot=(key,label)=>'<div class="photo-slot" onclick="uploadColPhoto(\''+id+'\',\''+key+'\')">'+(m.photos[key]?'<img src="'+m.photos[key]+'" alt="'+label+'" loading="lazy">':'<div class="photo-ph">'+plusPh+'<br>'+label+'</div>')+'</div>';
  return '<div class="photo-compare">'+slot("before","Before 起始")+slot("after","After 现在")+'</div>'+
    '<div class="mini-note">点击上传对比照，记录你的变化 ✨（Before 选最早一张，After 选最近的）</div>';
}
function uploadColPhoto(id,key){
  const inp=document.createElement("input");inp.type="file";inp.accept="image/*";
  inp.onchange=()=>{const f=inp.files[0];if(!f)return;compressImage(f,(data,err)=>{if(err){toast(err);return;}const m=state.modules[id];m.photos=m.photos||{};m.photos[key]=data;save();renderModule(id);toast("✅ 已保存"+key+"照");},{fullRes:true});};
  inp.click();
}
