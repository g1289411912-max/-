// 德语背单词助手 · Service Worker
// 作用：① 让手机可以"添加到主屏" ② 断网时也能打开应用并用上次同步的数据
// 策略：index.html 与 data/ 下的数据文件 = 网络优先（保证拿到你刚上传的最新内容），失败时回退缓存；其余资源缓存优先。
const CACHE = 'deutsch-vocab-v1';
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

  const isData = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html') || url.pathname.indexOf('/data/') >= 0;
  if (isData) {
    // 网络优先：拿到最新上传的词表/笔记；离线时用缓存
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
  // 静态资源：缓存优先
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
