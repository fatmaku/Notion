// Ladeklar service worker: app shell offline, push notifications with the company's logo.
// Bump VERSION with every release: the new worker then caches the whole shell again.
const VERSION = 'lk-1.0.1';
// Everything a cold start without network needs. The JS modules are not listed: install follows the
// imports from main.js, so a module can never be missing offline (a blank page in a dead zone).
const SHELL = ['/', '/web/css/app.css', '/web/css/fonts.css',
  ...['manrope-latin', 'manrope-latin-ext', 'manrope-cyrillic', 'manrope-cyrillic-ext', 'archivo-latin', 'archivo-latin-ext'].map((f) => `/web/fonts/${f}.woff2`),
  ...['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'badge-96.png', 'apple-touch-icon.png', 'favicon.svg', 'mark.svg'].map((f) => `/web/icons/${f}`)];
const ENTRY = '/web/js/main.js';
const IMPORTS = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)['"]([./][^'"]*\.m?js)['"]/gm;
const APP_PAGE = /^\/($|t\/|i\/|login|fahrer|app|admin)/; // pages that are the app itself (not /legal/…)

async function precache() {
  const c = await caches.open(VERSION);
  const get = async (u) => {
    const r = await fetch(new Request(u, { cache: 'reload' }));
    if (!r.ok) throw new Error(`${u}: ${r.status}`);
    await c.put(u, r.clone());
    return r;
  };
  await Promise.all(SHELL.map(get));
  const seen = new Set([ENTRY]);
  let wave = [ENTRY];
  while (wave.length) {
    const next = [];
    await Promise.all(wave.map(async (u) => {
      const src = await (await get(u)).text();
      for (const m of src.matchAll(IMPORTS)) {
        const p = new URL(m[1], new URL(u, self.location.origin)).pathname;
        if (!seen.has(p)) { seen.add(p); next.push(p); }
      }
    }));
    wave = next;
  }
  return [...SHELL, ...seen];
}

self.addEventListener('install', (e) => { e.waitUntil(precache().then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') {
    if (!APP_PAGE.test(url.pathname)) return;
    // the app page: fresh when the network answers quickly, else the cached shell (lie-fi never hangs)
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const net = fetch(e.request).then((r) => { if (r.ok) c.put('/', r.clone()); return r; });
      const hit = await c.match('/');
      if (!hit) return net;
      return Promise.race([net.then((r) => (r.ok ? r : hit)).catch(() => hit), new Promise((r) => setTimeout(() => r(hit), 4000))]);
    }));
    return;
  }
  if (url.pathname.startsWith('/web/') || url.pathname.startsWith('/core/')) {
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit || Response.error());
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
    const c = list.find((x) => new URL(x.url).origin === self.location.origin);
    if (c) { c.postMessage({ type: 'open', deliveryId }); return c.focus(); }
    return self.clients.openWindow(url || '/');
  }));
});
