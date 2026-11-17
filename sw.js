// 运营部 APP：只缓存网页外壳（断网也能打开）；数据每次从网上读，读不到时网页自己显示上次的数据。
// 打开时先上网拿新网页，1.5 秒没拿到先用手机里存的。改版时这里的 V 和 index.html 的 APPV 一起改。
const V = 'yunying-v28';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // 数据接口不经过缓存
  if (u.pathname.endsWith('/sw.js')) return;                                // 查新版本用，永远上网
  const net = fetch(e.request, { cache: 'no-cache' }).then(r => {
    if (r && r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); }
    return r;
  });
  e.waitUntil(net.then(() => {}, () => {}));
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const fallback = hit || caches.match('./index.html');
    if (!hit) return net.catch(() => fallback);
    return Promise.race([net.catch(() => hit), new Promise(res => setTimeout(() => res(hit), 1500))]);
  }));
});
