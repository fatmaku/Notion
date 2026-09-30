// LiveFX – allow-listed static file serving. Only the panel, the overlay, css/, js/ and uploaded
// assets are reachable; server code, tests, data/triggers.json and data/token.txt are never served.
'use strict';

const fs = require('fs');
const path = require('path');
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
};

const ROOT_FILES = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/overlay.html', 'overlay.html'],
  ['/demo.html', 'demo.html'],
]);
const SUBDIR_RE = /^\/(css|js|docs)\/([a-z0-9][a-z0-9._-]{0,99}\.(css|js|md))$/i;
const ASSET_RE = /^\/assets\/([a-z0-9][a-z0-9._-]{0,99}\.(png|jpe?g|gif|webp|mp3|wav|ogg))$/i;

/** Maps a decoded pathname to {base, rel, cache} or null when not allow-listed. */
function resolveTarget(pathname, { rootDir, dataDir }) {
  if (pathname.includes('\0') || pathname.includes('..')) return null;
  if (ROOT_FILES.has(pathname)) return { base: rootDir, rel: ROOT_FILES.get(pathname), cache: 'no-cache' };
  let m = SUBDIR_RE.exec(pathname);
  if (m) return { base: path.join(rootDir, m[1]), rel: m[2], cache: 'no-cache' };
  m = ASSET_RE.exec(pathname);
  if (m) return { base: path.join(dataDir, 'assets'), rel: m[1], cache: 'public, max-age=3600' };
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
      const headers = {
        'content-type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream',
        ...(target.rel === 'index.html' && ctx.token ? { 'set-cookie': require('./auth').cookieHeader(ctx.token) } : {}),
        'content-length': st.size,
        'cache-control': target.cache,
        'last-modified': st.mtime.toUTCString(),
      };
      if (req.method === 'HEAD') {
        res.writeHead(200, headers);
        res.end();
        resolve();
        return;
      }
      res.writeHead(200, headers);
      // pipeline() destroys the read stream when the client aborts (plain pipe() would leak the fd).
      pipeline(fs.createReadStream(abs), res, () => resolve());
    });
  });
}

function register(router) {
  router.route('GET', /^\/.*/, serve);
  router.route('HEAD', /^\/.*/, serve);
}

module.exports = { register, resolveTarget, MIME };
