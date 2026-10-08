// Cat Me If You Can – Service Worker: App-Hülle offline verfügbar, API immer frisch vom Netz.
const VERSION = 'catme-v2';
const SHELL = [
  'app.html', 'css/app.css', 'css/fonts.css', 'manifest.webmanifest', 'icons/logo.svg', 'icons/icon-192.png',
  'js/app.js', 'js/api.js', 'js/i18n.js', 'js/ui.js', 'js/avatar.js', 'js/camera.js', 'js/charts.js', 'js/map.js',
  'js/views/home.js', 'js/views/catch.js', 'js/views/card.js', 'js/views/dex.js', 'js/views/cat.js', 'js/views/stats.js',
  'js/views/voucher.js', 'js/views/profile.js', 'js/views/condition.js', 'js/share.js',
  'js/lang/tr.js', 'js/lang/en.js', 'js/lang/de.js', 'js/lang/ru.js', 'js/lang/ar.js', 'js/lang/fa.js',
  'core/labels/ru.js', 'core/labels/ar.js', 'core/labels/fa.js',
  'core/taxonomy.js', 'core/geo.js', 'core/fingerprint.js', 'core/time.js', 'core/analysis.js',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'vendor/qrcode.js',
  // ── Erweiterung: share ──

  // ── Erweiterung: cafe ──
  'js/views/cafe.js',

  // ── Erweiterung: routes ──
  'js/views/routes.js',

  // ── Erweiterung: impact ──
  'js/views/impact.js', 'js/views/guide.js', 'guide.html', 'js/guide-page.js',

  // ── Erweiterung: report ──

  // ── Erweiterung: perf ──

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
  // Trailer-Videos: groß und in Byte-Bereichen geladen (206) → direkt vom Netz, nie in den Cache
  if (url.pathname.startsWith('/media/') || e.request.headers.has('range')) return;
  // Netz zuerst (immer aktuelle Version), Cache als Rückfall ohne Verbindung
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.status === 200 && !url.pathname.startsWith('/photos/')) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('app.html'))),
  );
});
