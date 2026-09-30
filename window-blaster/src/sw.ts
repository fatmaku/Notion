/// <reference lib="webworker" />
// Service worker: the app shell is precached on install (list generated at build
// time), navigations are served cache-first with a background refresh (instant
// offline start), and the heavy immutable files (MediaPipe WASM, detector model)
// are cache-first and carried over across versions.
const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `wb-${__APP_VERSION__}`;
const HEAVY = /\/(mediapipe|models)\//;
const scopeUrl = new URL(sw.registration.scope);
const abs = (p: string) => new URL(p, scopeUrl).href;

sw.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(abs('precache.json'), { cache: 'no-cache' });
        const { files } = (await res.json()) as { files: string[] };
        await Promise.all(
          [...files, './'].map(async (f) => {
            try {
              const r = await fetch(abs(f), { cache: 'no-cache' });
              if (r.ok) await cache.put(abs(f), r);
            } catch {
              /* offline during install: keep going */
            }
          }),
        );
      } catch {
        /* dev server without precache.json */
      }
      await sw.skipWaiting();
    })(),
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const fresh = await caches.open(CACHE);
      for (const k of keys) {
        if (!k.startsWith('wb-') || k === CACHE) continue;
        // keep already downloaded heavy files (35 MB) across app updates
        const old = await caches.open(k);
        for (const req of await old.keys()) {
          if (HEAVY.test(new URL(req.url).pathname) && !(await fresh.match(req))) {
            const r = await old.match(req);
            if (r) await fresh.put(req, r);
          }
        }
        await caches.delete(k);
      }
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
        const cache = await caches.open(CACHE);
        const cached = (await cache.match(abs('./'))) ?? (await cache.match(abs('index.html')));
        const refresh = fetch(req)
          .then((res) => {
            if (res.ok) void cache.put(abs('./'), res.clone());
            return res;
          })
          .catch(() => null);
        if (cached) {
          void refresh;
          return cached;
        }
        return (await refresh) ?? new Response('<h1>Offline</h1><p>Window Blaster wurde auf diesem Gerät noch nicht geladen.</p>', { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
      })(),
    );
    return;
  }

  if (HEAVY.test(url.pathname) || /\.(tflite|wasm)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req, { ignoreSearch: true });
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok && res.status === 200) void cache.put(req, res.clone());
        return res;
      })(),
    );
    return;
  }

  // app shell & everything else: cache-first, refresh in background
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req, { ignoreSearch: url.pathname.endsWith('.json') ? false : true });
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
