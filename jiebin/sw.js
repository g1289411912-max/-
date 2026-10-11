// 德语介宾助手 · Service Worker
// 作用：① 手机上可以「添加到主屏」当 App 用 ② 断网也能打开、断网也能练
// 策略：index.html = 网络优先（保证拿到你刚上传的新版），失败时回退缓存；其余资源缓存优先。
const CACHE = 'deutsch-prep-v1';
const CORE = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE).catch(function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 只处理本站资源

  // 页面本体：网络优先，联网时总是拿最新版；断网时用缓存
  const isDoc = req.mode === 'navigate' ||
                url.pathname.endsWith('/') ||
                url.pathname.endsWith('/index.html');
  if (isDoc) {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (r) {
          return r || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // 静态资源（manifest / 图标等）：缓存优先
  e.respondWith(
    caches.match(req).then(function (r) {
      return r || fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    })
  );
});
