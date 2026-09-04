/* ============================================================
   笑笑养成记 · Service Worker
   ------------------------------------------------------------
   策略（不硬编码文件清单，新增 css/js 自动纳入缓存）：
   1. HTML 导航请求：network-first —— 优先拿最新页面，离线时回退缓存
   2. 同源静态资源（css/js/图片/字体/图标）：stale-while-revalidate
      —— 先回缓存保证秒开，同时后台拉新版静默更新
   3. 跨域请求（AI 接口、远程字体等）：直接放行不缓存
   发新版本时改 CACHE_VERSION，activate 阶段自动清理旧缓存。
   注意：file:// 协议下浏览器不支持 SW（注册失败有 catch，不影响 APK 使用）；
        部署到 https（GitHub Pages / PWA Builder）后生效。
   ============================================================ */

const CACHE_VERSION = "xiaoxiao-v1";   // 发新版本时改这里，例如 v2、v3
const NAV_CACHE   = CACHE_VERSION + "-nav";
const ASSET_CACHE = CACHE_VERSION + "-assets";

/* 安装：预缓存入口页，保证首次离线也能打开；立即接管旧 SW */
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(NAV_CACHE)
      .then(function (c) { return c.addAll(["./", "./index.html"]); })
      .catch(function () { /* 入口页缓存失败不阻塞安装 */ })
      .then(function () { return self.skipWaiting(); })
  );
});

/* 激活：清掉所有旧版本缓存，接管所有页面 */
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          if (k.indexOf(CACHE_VERSION) !== 0) return caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* 请求拦截 */
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;                    // 只处理 GET
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== location.origin) return;          // 跨域放行

  /* HTML 导航：network-first，离线回退 */
  if (req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        try {
          var copy = res.clone();
          caches.open(NAV_CACHE).then(function (c) { c.put(req, copy); });
        } catch (err) {}
        return res;
      }).catch(function () {
        return caches.match(req).then(function (r) {
          return r || caches.match("./index.html");
        });
      })
    );
    return;
  }

  /* 其余同源资源：stale-while-revalidate */
  e.respondWith(
    caches.match(req).then(function (cached) {
      var fetching = fetch(req).then(function (res) {
        if (res && res.ok) {
          try {
            var copy = res.clone();
            caches.open(ASSET_CACHE).then(function (c) { c.put(req, copy); });
          } catch (err) {}
        }
        return res;
      }).catch(function () { return cached; });
      return cached || fetching;
    })
  );
});
