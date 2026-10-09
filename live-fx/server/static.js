// LiveFX – allow-listed static file serving. Only the panel, the overlay, the mobile page, the camera view, the pairing
// page, the PWA files (manifests, service worker, icons), css/, js/, docs/, vendored libraries (`vendor/`), offline
// models (`<dataDir>/models`) and uploaded assets are reachable; server code, tests,
// data/triggers.json and data/token.txt are never served.
// 2.1: strong ETag (size + mtime) with If-None-Match -> 304, gzip for text types > 1 KB when the client
// accepts it (small in-memory cache keyed by path + mtime + size), `Vary: Accept-Encoding` on text types.
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream');
const { HttpError } = require('./router');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.bin': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
};

const ROOT_FILES = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/overlay.html', 'overlay.html'],
  ['/demo.html', 'demo.html'],
  ['/mobile.html', 'mobile.html'],
  ['/camera.html', 'camera.html'], // 2.3 camera view (webcam + overlay in one window, docs/KAMERA.md)
  ['/pair.html', 'pair.html'], // 2.4 pairing page behind the QR code (also served as /p, server/api-pairing.js)
  ['/manifest.webmanifest', 'manifest.webmanifest'],
  ['/mobile.webmanifest', 'mobile.webmanifest'], // 2.4 phone home-screen app: starts at /mobile.html, not the panel
  ['/sw.js', 'sw.js'],
]);
const SUBDIR_RE = /^\/(css|js|docs)\/([a-z0-9][a-z0-9._-]{0,99}\.(css|js|md))$/i;
const ASSET_RE = /^\/assets\/([a-z0-9][a-z0-9._-]{0,99}\.(png|jpe?g|gif|webp|mp3|wav|ogg))$/i;
// PWA icons (`<root>/icons`) and vendored browser libraries (`<root>/vendor`, e.g. transformers.js).
const ICON_RE = /^\/icons\/([a-z0-9][a-z0-9._-]{0,99}\.(svg|png))$/i;
const VENDOR_RE = /^\/vendor\/([a-z0-9][a-z0-9._-]{0,99}\.(js|mjs|wasm))$/i;
// Offline ASR models live under `<dataDir>/models/<repo>/…` (subdirectories allowed, no `..`).
const MODEL_RE = /^\/models\/((?:[a-z0-9][a-z0-9._-]{0,99}\/){0,6}[a-z0-9][a-z0-9._-]{0,99}\.(json|onnx|bin|txt))$/i;
// The service worker must be revalidated on every load and may control the whole origin.
const EXTRA_HEADERS = { 'sw.js': { 'service-worker-allowed': '/' } };

// ---- conditional requests + compression ----
const GZIP_MIN_BYTES = 1024;
const GZIP_MAX_BYTES = 4 * 1024 * 1024; // larger text files (model json) stream uncompressed
const GZIP_CACHE_MAX_BYTES = 16 * 1024 * 1024;
const gzCache = new Map(); // `${abs}|${mtimeMs}|${size}` -> Buffer (insertion order = LRU order)
let gzCacheBytes = 0;

/** Text-like content types worth compressing. */
function compressible(type) {
  return /^text\/|javascript|json|svg\+xml|manifest\+json/.test(type);
}

/** Strong validator from size + mtime (hex), `-gz` suffix for the compressed representation. */
function etagFor(st, gz) {
  return `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}${gz ? '-gz' : ''}"`;
}

/** If-None-Match: `*` or a list of (weak or strong) tags; weak comparison per RFC 9110 §13.1.2. */
function notModified(req, etag) {
  const inm = req.headers['if-none-match'];
  if (!inm) return false;
  if (inm.trim() === '*') return true;
  const want = etag.replace(/^W\//, '');
  return inm.split(',').some((t) => t.trim().replace(/^W\//, '') === want);
}

/** Accept-Encoding contains gzip with a non-zero q. */
function acceptsGzip(req) {
  const ae = String(req.headers['accept-encoding'] || '');
  const m = /(?:^|,)\s*gzip\s*(?:;\s*q\s*=\s*([\d.]+))?/i.exec(ae);
  return !!m && (m[1] === undefined || Number(m[1]) > 0);
}

/** gzip body for `abs` (cached per path + mtime + size; the cache is bounded by total bytes). */
function gzipped(abs, st) {
  const key = `${abs}|${st.mtimeMs}|${st.size}`;
  const hit = gzCache.get(key);
  if (hit) {
    gzCache.delete(key); // refresh LRU position
    gzCache.set(key, hit);
    return hit;
  }
  const buf = zlib.gzipSync(fs.readFileSync(abs), { level: 6 });
  for (const k of gzCache.keys()) {
    if (k.startsWith(`${abs}|`)) {
      gzCacheBytes -= gzCache.get(k).length;
      gzCache.delete(k); // older mtime of the same file
    }
  }
  gzCache.set(key, buf);
  gzCacheBytes += buf.length;
  while (gzCacheBytes > GZIP_CACHE_MAX_BYTES && gzCache.size > 1) {
    const [k, v] = gzCache.entries().next().value;
    gzCache.delete(k);
    gzCacheBytes -= v.length;
  }
  return buf;
}

/** Maps a decoded pathname to {base, rel, cache} or null when not allow-listed. */
function resolveTarget(pathname, { rootDir, dataDir }) {
  if (pathname.includes('\0') || pathname.includes('..')) return null;
  if (ROOT_FILES.has(pathname)) return { base: rootDir, rel: ROOT_FILES.get(pathname), cache: 'no-cache' };
  let m = SUBDIR_RE.exec(pathname);
  if (m) return { base: path.join(rootDir, m[1]), rel: m[2], cache: 'no-cache' };
  m = ASSET_RE.exec(pathname);
  if (m) return { base: path.join(dataDir, 'assets'), rel: m[1], cache: 'public, max-age=3600' };
  m = ICON_RE.exec(pathname);
  if (m) return { base: path.join(rootDir, 'icons'), rel: m[1], cache: 'public, max-age=86400' };
  m = VENDOR_RE.exec(pathname);
  if (m) return { base: path.join(rootDir, 'vendor'), rel: m[1], cache: 'public, max-age=86400' };
  m = MODEL_RE.exec(pathname);
  if (m) return { base: path.join(dataDir, 'models'), rel: m[1], cache: 'public, max-age=86400' };
  // Bundled sticker sets (2.1, docs/STICKER.md): `/memes/index.json` and `/memes/<set>/<file>.(webp|png|json)`.
  m = /^\/memes\/((?:[a-z0-9_-]{1,40}\/)?[a-z0-9_-]{1,80}\.(?:webp|png|json))$/.exec(pathname);
  if (m && (m[1].includes('/') || m[1] === 'index.json')) return { base: path.join(rootDir, 'memes'), rel: m[1], cache: 'public, max-age=604800' };
  return null;
}

function serve(req, res, ctx) {
  let pathname;
  try {
    pathname = decodeURIComponent(ctx.url.pathname);
  } catch (_) {
    throw new HttpError(400, 'bad_request', 'malformed URL encoding');
  }
  if (pathname === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  const target = resolveTarget(pathname, ctx);
  if (!target) throw new HttpError(404, 'not_found', 'not found');
  const base = path.resolve(target.base);
  const abs = path.resolve(base, target.rel);
  if (!abs.startsWith(base + path.sep)) throw new HttpError(404, 'not_found', 'not found');

  return new Promise((resolve, reject) => {
    fs.stat(abs, (err, st) => {
      if (err || !st.isFile()) {
        reject(new HttpError(404, 'not_found', 'not found'));
        return;
      }
      const type = MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream';
      const text = compressible(type);
      const useGzip = text && st.size > GZIP_MIN_BYTES && st.size <= GZIP_MAX_BYTES && acceptsGzip(req);
      const etag = etagFor(st, useGzip);
      const headers = {
        'content-type': type,
        ...(target.rel === 'index.html' && ctx.token ? { 'set-cookie': require('./auth').cookieHeader(ctx.token) } : {}),
        ...(EXTRA_HEADERS[target.rel] || {}),
        'cache-control': target.cache,
        'last-modified': st.mtime.toUTCString(),
        etag,
        ...(text ? { vary: 'Accept-Encoding' } : {}),
      };
      if (notModified(req, etag)) {
        delete headers['content-type'];
        res.writeHead(304, headers);
        res.end();
        resolve();
        return;
      }
      let body = null;
      if (useGzip) {
        try {
          body = gzipped(abs, st);
          headers['content-encoding'] = 'gzip';
        } catch (_) {
          body = null; // unreadable mid-flight: fall back to the plain stream below
          headers.etag = etagFor(st, false);
        }
      }
      headers['content-length'] = body ? body.length : st.size;
      res.writeHead(200, headers);
      if (req.method === 'HEAD') {
        res.end();
        resolve();
        return;
      }
      if (body) {
        res.end(body);
        resolve();
        return;
      }
      // pipeline() destroys the read stream when the client aborts (plain pipe() would leak the fd).
      pipeline(fs.createReadStream(abs), res, () => resolve());
    });
  });
}

function register(router) {
  router.route('GET', /^\/.*/, serve);
  router.route('HEAD', /^\/.*/, serve);
}

module.exports = { register, resolveTarget, MIME, etagFor, acceptsGzip, compressible };
