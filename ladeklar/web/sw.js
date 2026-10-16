// Ladeklar service worker: app shell offline, push notifications with the company's logo.
const VERSION = 'lk-1.0.0';
const SHELL = ['/', '/web/css/app.css', '/web/css/fonts.css', '/web/js/main.js', '/web/js/app.js', '/web/fonts/manrope-latin.woff2', '/web/fonts/archivo-latin.woff2', '/web/icons/icon-192.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put('/', copy)); return r; }).catch(() => caches.match('/')));
    return;
  }
  if (url.pathname.startsWith('/web/') || url.pathname.startsWith('/core/')) {
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'Ladeklar', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Ladeklar', {
    body: d.body || '', icon: d.icon || '/web/icons/icon-192.png', badge: d.badge || '/web/icons/badge-96.png', tag: d.tag, renotify: true,
    requireInteraction: d.priority === 'high', vibrate: d.priority === 'high' ? [200, 80, 200, 80, 300] : [80, 40, 80],
    data: { url: d.url || '/', deliveryId: d.deliveryId || null },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const { url, deliveryId } = e.notification.data || {};
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const c = list.find((x) => new URL(x.url).origin === location.origin);
    if (c) { c.postMessage({ type: 'open', deliveryId }); return c.focus(); }
    return self.clients.openWindow(url || '/');
  }));
});
