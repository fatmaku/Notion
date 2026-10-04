// Cat Me If You Can – statische Dateien (public/) und öffentliche Katzenfotos (nur Ausschnitte).

import fs from 'node:fs';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.bin': 'application/octet-stream',
  '.woff2': 'font/woff2',
};

function sendFile(req, res, file, { cache = 'no-cache', headers = {} } = {}) {
  let st;
  try {
    st = fs.statSync(file);
  } catch {
    return false;
  }
  if (!st.isFile()) return false;
  const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const h = { 'Content-Type': type, 'Cache-Control': cache, ETag: etag, ...headers };
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, h);
    res.end();
    return true;
  }
  res.writeHead(200, { ...h, 'Content-Length': st.size });
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  fs.createReadStream(file).pipe(res);
  return true;
}

/** Liefert eine Datei unterhalb von root aus – Pfade mit .. oder versteckten Dateien werden abgelehnt. */
export function serveStatic(req, res, root, pathname, { headers = {} } = {}) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  if (rel.includes('\0')) return false;
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(root, '.' + path.posix.normalize('/' + rel));
  if (!file.startsWith(path.resolve(root) + path.sep)) return false;
  if (file.split(path.sep).some((part) => part.startsWith('.') && part.length > 1)) return false;
  const long = /\/(vendor|icons)\//.test(rel);
  const isHtml = file.endsWith('.html');
  return sendFile(req, res, file, { cache: long ? 'public, max-age=604800' : 'no-cache', headers: isHtml ? headers : {} });
}

/** Öffentliche Fotos: nur Ausschnitte (<id>_c.jpg). */
export function servePhoto(req, res, photoDir, name) {
  if (!/^[0-9a-f]{20}_c\.jpg$/.test(name)) return false;
  return sendFile(req, res, path.join(photoDir, name), { cache: 'public, max-age=31536000, immutable' });
}

export function serveFullPhoto(req, res, file) {
  return sendFile(req, res, file, { cache: 'private, no-store' });
}
