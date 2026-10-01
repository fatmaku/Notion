// LiveFX – service worker: makes the app shell (panel, overlay, demo, mobile page, css/js, icons)
// available offline. See docs/HANDY.md.
//
// Strategy:
//   - install: precache the whole app shell (every path in SHELL, listed explicitly – no build step).
//   - navigations (/, /index.html, …): network first, cache fallback. The panel cookie is set when
//     index.html is served, so a fresh copy is preferred whenever the server is reachable.
//   - other shell files (css/js/icons/manifest): cache first, refreshed in the background.
//   - everything live is network-only and never cached: /api/*, /fire, /events, /assets/*, /docs/*,
//     /m, /models/*, /health.
// The cache name carries SHELL_VERSION – bump it when shipping a new version (an activated worker
// also compares it with the server's /health version and re-precaches when they differ).
'use strict';

const SHELL_VERSION = '1.6.0';
const CACHE = `livefx-shell-v${SHELL_VERSION}`;
const CACHE_PREFIX = 'livefx-shell-';

const SHELL = [
  '/',
  '/index.html',
  '/overlay.html',
  '/demo.html',
  '/mobile.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/css/panel.css',
  '/css/editor.css',
  '/css/overlay.css',
  '/css/demo.css',
  '/css/mobile.css',
  '/js/sounds.js',
  '/js/triggers.js',
  '/js/packs.js',
  '/js/schema.js',
  '/js/matcher.js',
  '/js/bus.js',
  '/js/store.js',
  '/js/assets.js',
  '/js/editor.js',
  '/js/meter.js',
  '/js/langdetect.js',
  '/js/asr.js',
  '/js/smart.js',
  '/js/fx.js',
  '/js/demo.js',
  '/js/panel.js',
  '/js/mobile.js',
  '/js/mobile-link.js',
];
const SHELL_SET = new Set(SHELL);
const NETWORK_ONLY = /^\/(api\/|fire$|events$|assets\/|docs\/|m$|models\/|health$)/;

async function precache() {
  const cache = await caches.open(CACHE);
  // One missing file (e.g. an optional module) must not break the whole install.
  await Promise.all(
    SHELL.map(async (p) => {
      try {
        const r = await fetch(new Request(p, { cache: 'no-cache', credentials: 'same-origin' }));
        if (r.ok) await cache.put(p, r);
      } catch (_) {
        /* offline during install – the file is fetched on first use */
      }
    })
  );
}

async function clearOldCaches() {
  const names = await caches.keys();
  await Promise.all(names.filter((n) => n.startsWith(CACHE_PREFIX) && n !== CACHE).map((n) => caches.delete(n)));
}

/** Re-precaches when the server reports a version that differs from this worker's SHELL_VERSION. */
async function checkServerVersion() {
  try {
    const r = await fetch('/health', { cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json();
    if (d && typeof d.version === 'string' && d.version !== SHELL_VERSION) {
      await caches.delete(CACHE);
      await precache();
    }
  } catch (_) {
    /* offline */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clearOldCaches().then(() => self.clients.claim()).then(() => checkServerVersion()));
});

async function refresh(request, cache) {
  try {
    const r = await fetch(request);
    if (r && r.ok) await cache.put(request, r.clone());
    return r;
  } catch (_) {
    return null;
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const fresh = await refresh(request, cache);
  if (fresh) return fresh;
  const hit = (await cache.match(request)) || (await cache.match(request.url.replace(/\?.*$/, '')));
  if (hit) return hit;
  return new Response('offline', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) {
    refresh(request, cache); // background revalidation, result ignored
    return hit;
  }
  const fresh = await refresh(request, cache);
  if (fresh) return fresh;
  return new Response('offline', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (NETWORK_ONLY.test(url.pathname)) return; // live data: never cached
  if (!SHELL_SET.has(url.pathname)) return; // unknown paths (e.g. /m) are left to the network
  event.respondWith(req.mode === 'navigate' ? networkFirst(req) : cacheFirst(req));
});
