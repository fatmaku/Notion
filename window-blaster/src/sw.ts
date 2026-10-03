/// <reference lib="webworker" />
// Service worker.
// - install: the app shell (list from precache.json, generated at build time) is cached
//   all-or-nothing – if anything fails, the previous version keeps running untouched.
// - activate: already downloaded offline data (MediaPipe WASM + model, ~30 MB) is carried
//   over from the previous version if the files are unchanged, then old caches are removed.
// - navigations: network first with a short timeout (updates arrive on the first launch while
//   the Mac is reachable), cache fallback (instant offline start).
// - heavy files: cache first.  Everything else: cache first, refreshed in the background.
// No imports: this file is loaded as a classic worker.
const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `wb-${__APP_VERSION__}-${__BUILD_ID__}`; // keep in sync with OfflinePrep.cacheName
const HEAVY = /\/(mediapipe|models)\//;
const NAV_TIMEOUT_MS = 2500;
const scopeUrl = new URL(sw.registration.scope);
const abs = (p: string) => new URL(p, scopeUrl).href;

sw.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch(abs('precache.json'), { cache: 'no-store' });
      if (!res.ok) throw new Error(`precache.json ${res.status}`);
      const { files } = (await res.json()) as { files: string[] };
      const cache = await caches.open(CACHE);
      try {
        // addAll is atomic: one failed file → nothing cached → install fails → old version stays
        await cache.addAll([...files, './', 'offline-assets.json'].map((f) => new Request(abs(f), { cache: 'reload' })));
      } catch (e) {
        await caches.delete(CACHE);
        throw e;
      }
      await sw.skipWaiting();
    })(),
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const fresh = await caches.open(CACHE);
      // which heavy files does this version expect (path → size)?
      let wanted: Map<string, number> | null = null;
      try {
        const m = await fresh.match(abs('offline-assets.json'));
        if (m) wanted = new Map(((await m.json()) as { files: { path: string; size: number }[] }).files.map((f) => [abs(f.path), f.size]));
      } catch {
        wanted = null;
      }
      for (const k of await caches.keys()) {
        if (!k.startsWith('wb-') || k === CACHE) continue;
        const old = await caches.open(k);
        for (const req of await old.keys()) {
          if (!HEAVY.test(new URL(req.url).pathname) || (await fresh.match(req))) continue;
          const r = await old.match(req);
          if (!r) continue;
          const size = Number(r.headers.get('content-length') ?? -1);
          // carry over only files this version still uses, with the same size
          if (wanted && (!wanted.has(req.url) || (size >= 0 && wanted.get(req.url) !== size))) continue;
          await fresh.put(req, r);
        }
        await caches.delete(k);
      }
      await sw.clients.claim();
    })(),
  );
});

function timeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

sw.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== sw.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const res = await timeout(fetch(req, { cache: 'no-store' }), NAV_TIMEOUT_MS);
          if (res.ok && url.pathname === scopeUrl.pathname) void cache.put(abs('./'), res.clone());
          return res;
        } catch {
          const cached = (await cache.match(abs('./'))) ?? (await caches.match(abs('./')));
          return cached ?? new Response('<!doctype html><meta charset="utf-8"><h1>Offline</h1><p>Window Blaster wurde auf diesem Gerät noch nicht vollständig geladen. Bitte einmal im WLAN des Macs öffnen.</p>', { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
        }
      })(),
    );
    return;
  }

  if (HEAVY.test(url.pathname) || /\.(tflite|wasm)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok && res.status === 200) {
          const cache = await caches.open(CACHE);
          void cache.put(req, res.clone());
        }
        return res;
      })(),
    );
    return;
  }

  // app shell & everything else: cache first, refresh in background
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req, { ignoreSearch: !url.pathname.endsWith('.json') });
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
