// Cat Me If You Can – Service Worker: App-Hülle offline verfügbar, API immer frisch vom Netz.
const VERSION = 'catme-v1';
const SHELL = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/logo.svg', 'icons/icon-192.png',
  'js/app.js', 'js/api.js', 'js/i18n.js', 'js/ui.js', 'js/avatar.js', 'js/camera.js', 'js/charts.js', 'js/map.js',
  'js/views/home.js', 'js/views/catch.js', 'js/views/card.js', 'js/views/dex.js', 'js/views/cat.js', 'js/views/stats.js',
  'js/views/voucher.js', 'js/views/profile.js',
  'core/taxonomy.js', 'core/geo.js', 'core/fingerprint.js', 'core/time.js', 'core/analysis.js',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'vendor/qrcode.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // nie aus dem Cache
  // Netz zuerst (immer aktuelle Version), Cache als Rückfall ohne Verbindung
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && !url.pathname.startsWith('/photos/')) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});
