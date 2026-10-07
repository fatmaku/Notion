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
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wav': 'audio/wav',
};

/** Byte-Bereich aus „Range: bytes=a-b“ (nur ein Bereich). null = ganze Datei, false = ungültig. */
function parseRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if (!m || (m[1] === '' && m[2] === '')) return false;
  let start;
  let end;
  if (m[1] === '') {
    // „bytes=-500“ = die letzten 500 Bytes
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) return false;
  return { start, end };
}

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
  const h = { 'Content-Type': type, 'Cache-Control': cache, ETag: etag, 'Accept-Ranges': 'bytes', ...headers };
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, h);
    res.end();
    return true;
  }
  // Teilanfragen (Videos: iOS Safari lädt nur in Bereichen). If-Range mit fremdem ETag → ganze Datei.
  const ifRange = req.headers['if-range'];
  const range = ifRange && ifRange !== etag ? null : parseRange(req.headers.range, st.size);
  if (range === false) {
    res.writeHead(416, { ...h, 'Content-Range': `bytes */${st.size}` });
    res.end();
    return true;
  }
  if (range) {
    res.writeHead(206, { ...h, 'Content-Range': `bytes ${range.start}-${range.end}/${st.size}`, 'Content-Length': range.end - range.start + 1 });
  } else {
    res.writeHead(200, { ...h, 'Content-Length': st.size });
  }
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  fs.createReadStream(file, range || {}).on('error', () => res.destroy()).pipe(res);
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
  const relNorm = path.posix.normalize('/' + rel);
  const file = path.resolve(root, '.' + relNorm);
  if (!file.startsWith(path.resolve(root) + path.sep)) return false;
  // versteckte Dateien/Ordner nur INNERHALB von public/ ablehnen (der Installationspfad darf welche haben)
  if (relNorm.split('/').some((part) => part.startsWith('.') && part.length > 1)) return false;
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

// ---------------------------------------------------------------- Startseite mit Sprache

const SITE_LANGS = { tr: 'ltr', en: 'ltr', de: 'ltr', ru: 'ltr', ar: 'rtl', fa: 'rtl' };

/** Sprache für die Startseite: ?lang= vor Accept-Language (mit q-Werten), sonst Englisch. */
export function pickSiteLang(query, acceptLanguage) {
  if (query && SITE_LANGS[query]) return query;
  const wanted = String(acceptLanguage || '')
    .split(',')
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((x) => /^\s*q=([\d.]+)/.exec(x)).find(Boolean);
      return { lang: tag.toLowerCase().split('-')[0], q: q ? Number(q[1]) : 1, i };
    })
    .filter((x) => SITE_LANGS[x.lang] && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  return wanted.length ? wanted[0].lang : 'en';
}

let landingCache = null;

/**
 * Liefert public/index.html mit Sprache und Schreibrichtung schon im <html>-Tag (kein kurzes
 * Links-nach-rechts für Arabisch/Persisch, bevor das Skript läuft) und dem Vorschaubild der Sprache.
 * publicUrl (z. B. https://catme.example) macht die Vorschaubilder absolut – WhatsApp & Co. brauchen das.
 */
export function serveLanding(req, res, root, { headers = {}, lang = 'en', publicUrl = '' } = {}) {
  const file = path.join(root, 'index.html');
  let st;
  try {
    st = fs.statSync(file);
  } catch {
    return false;
  }
  if (!landingCache || landingCache.mtimeMs !== st.mtimeMs || landingCache.size !== st.size) {
    landingCache = { mtimeMs: st.mtimeMs, size: st.size, html: fs.readFileSync(file, 'utf8'), byKey: new Map() };
  }
  const key = `${lang}|${publicUrl}`;
  let html = landingCache.byKey.get(key);
  if (!html) {
    const og = fs.existsSync(path.join(root, 'media', `og-${lang}.png`)) ? `media/og-${lang}.png` : 'media/og.png';
    const base = publicUrl ? `${publicUrl.replace(/\/+$/, '')}/` : '';
    html = landingCache.html
      .replace(/<html lang="[a-z-]*" dir="(?:ltr|rtl)"/i, `<html lang="${lang}" dir="${SITE_LANGS[lang]}"`)
      .replace(/(<meta (?:property="og:image"|name="twitter:image") content=")media\/og\.png"/g, `$1${base}${og}"`);
    landingCache.byKey.set(key, html);
  }
  const body = Buffer.from(html);
  const etag = `"l-${lang}-${body.length.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
  const h = { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-cache', Vary: 'Accept-Language', ETag: etag, ...headers };
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, h);
    res.end();
    return true;
  }
  res.writeHead(200, { ...h, 'Content-Length': body.length });
  res.end(req.method === 'HEAD' ? undefined : body);
  return true;
}
