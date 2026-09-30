/// <reference lib="webworker" />
// Service worker: offline-capable app shell + cache-first for the heavy,
// immutable assets (MediaPipe WASM, detector model, hashed bundles).
const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `wb-${__APP_VERSION__}`;
const HEAVY = /\/(mediapipe|models|assets|icons)\//;

sw.addEventListener('install', () => {
  void sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('wb-') && k !== CACHE).map((k) => caches.delete(k)));
      await sw.clients.claim();
    })(),
  );
});

sw.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== sw.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          void cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = (await caches.match(req)) ?? (await caches.match(new URL('./', sw.registration.scope).href));
          return cached ?? new Response('offline', { status: 503 });
        }
      })(),
    );
    return;
  }

  if (HEAVY.test(url.pathname) || url.pathname.endsWith('.webmanifest') || url.pathname.endsWith('.tflite')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok && res.status === 200) void cache.put(req, res.clone());
        return res;
      })(),
    );
    return;
  }

  // everything else: stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      const net = fetch(req)
        .then((res) => {
          if (res.ok) void cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit ?? new Response('offline', { status: 503 }));
      return hit ?? net;
    })(),
  );
});
