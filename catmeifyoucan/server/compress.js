// Cat Me If You Can – Kompression für schwache Mobilnetze (Erweiterung perf).
//
// Textantworten (HTML, JS, CSS, JSON, SVG, Manifest, Markdown, Text) gehen ab 1 KB mit brotli oder
// gzip raus – je nachdem, was der Browser in Accept-Encoding (mit q-Werten) anbietet.
// Statische Dateien werden einmal gepackt und im Speicher gehalten (Schlüssel: Datei + Änderungszeit
// + Größe + Verfahren), API-Antworten werden schnell und direkt gepackt.
// Nie gepackt: Byte-Bereiche (Range, z. B. Videos), schon gepackte Formate (jpg, png, webp, woff2, mp4).

import fs from 'node:fs';
import zlib from 'node:zlib';
import { promisify } from 'node:util';

/** Unter dieser Größe lohnt sich Packen nicht (Kopfdaten + Rechenzeit > Ersparnis). */
export const MIN_BYTES = 1024;
/** Größere Dateien werden nicht im Speicher gepackt, sondern wie bisher direkt gestreamt. */
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

const TEXT_TYPE = /^(?:text\/|application\/(?:json|javascript|manifest\+json|geo\+json|xml)\b|image\/svg\+xml\b)/i;

/** Lohnt sich Packen für diesen Content-Type? (Bilder, Schriften, Videos sind schon gepackt.) */
export function isCompressible(contentType) {
  return TEXT_TYPE.test(String(contentType || '').trim());
}

/**
 * Bestes Verfahren aus Accept-Encoding: 'br', 'gzip' oder null (= unverpackt).
 * Beachtet q-Werte („br;q=0“ = nein), „*“ und die Schreibweise x-gzip. Bei Gleichstand gewinnt brotli.
 */
export function pickEncoding(header) {
  if (!header) return null;
  const q = new Map();
  for (const part of String(header).split(',')) {
    const [rawName, ...params] = part.split(';');
    let name = rawName.trim().toLowerCase();
    if (!name) continue;
    if (name === 'x-gzip') name = 'gzip';
    let qv = 1;
    for (const p of params) {
      const m = /^\s*q\s*=\s*(.*?)\s*$/i.exec(p);
      if (!m) continue;
      qv = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(m[1]) ? Number(m[1]) : 0; // ungültiger q-Wert → nicht annehmen
    }
    q.set(name, Math.max(q.get(name) ?? 0, qv));
  }
  const star = q.get('*');
  const of = (name) => (q.has(name) ? q.get(name) : star ?? 0);
  const br = of('br');
  const gz = of('gzip');
  if (br > 0 && br >= gz) return 'br';
  if (gz > 0) return 'gzip';
  return null;
}

/** Vary-Kopf ergänzen, ohne Doppelte. */
export function addVary(current, field) {
  const list = String(current || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.includes('*') || list.some((s) => s.toLowerCase() === field.toLowerCase())) return list.join(', ');
  return [...list, field].join(', ');
}

/** If-None-Match passt? Schwacher Vergleich (W/ zählt gleich), Listen und „*“ erlaubt (RFC 9110 13.1.2). */
export function etagMatches(header, etag) {
  if (!header || !etag) return false;
  const h = String(header).trim();
  if (h === '*') return true;
  const strip = (v) => v.trim().replace(/^W\//, '');
  const want = strip(etag);
  return h.split(',').some((v) => strip(v) === want);
}

/** ETag je Verfahren: "abc" → "abc-br" (der Browser darf die Varianten nicht verwechseln). */
export function etagFor(etag, enc) {
  if (!enc) return etag;
  const weak = etag.startsWith('W/');
  const core = weak ? etag.slice(2) : etag;
  return `${weak ? 'W/' : ''}${core.replace(/"$/, `-${enc}"`)}`;
}

const brotliAsync = promisify(zlib.brotliCompress);
const gzipAsync = promisify(zlib.gzip);

function brotliParams(size, quality) {
  return {
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      [zlib.constants.BROTLI_PARAM_QUALITY]: quality,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: size,
    },
  };
}

/**
 * Gründlich packen (für Dateien, die im Speicher bleiben). Läuft im Thread-Pool, blockiert also nicht.
 * Brotli-Stufe 11 bis 256 KB (≤ ~0,3 s), darüber Stufe 9 (three.js: ~0,1 s statt ~1,4 s).
 */
export function compressBest(buf, enc) {
  if (enc === 'br') return brotliAsync(buf, brotliParams(buf.length, buf.length <= 256 * 1024 ? 11 : 9));
  if (enc === 'gzip') return gzipAsync(buf, { level: 9 });
  return Promise.resolve(buf);
}

/** Schnell packen (für API-Antworten, die sich ständig ändern): 50 KB in ~1–2 ms. */
export function compressFast(buf, enc) {
  if (enc === 'br') return zlib.brotliCompressSync(buf, brotliParams(buf.length, 5));
  if (enc === 'gzip') return zlib.gzipSync(buf, { level: 6 });
  return buf;
}

/**
 * Speicher für gepackte Dateien: Schlüssel Datei + Verfahren, gültig solange Änderungszeit und Größe
 * gleich bleiben. Gleichzeitige Anfragen teilen sich eine Pack-Arbeit. Höchstens maxBytes (älteste fliegen raus).
 */
export function createCompressionCache({ maxBytes = 64 * 1024 * 1024 } = {}) {
  const entries = new Map();
  let total = 0;

  function drop(key) {
    const e = entries.get(key);
    if (!e) return;
    entries.delete(key);
    if (e.buf) total -= e.buf.length;
  }

  function get(file, st, enc) {
    const key = `${enc}\0${file}`;
    const hit = entries.get(key);
    if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) {
      entries.delete(key); // ans Ende = zuletzt benutzt
      entries.set(key, hit);
      return hit.buf ? Promise.resolve(hit.buf) : hit.pending;
    }
    drop(key);
    const entry = { mtimeMs: st.mtimeMs, size: st.size, buf: null, pending: null };
    entry.pending = fs.promises
      .readFile(file)
      .then((raw) => compressBest(raw, enc))
      .then((buf) => {
        if (entries.get(key) === entry) {
          entry.buf = buf;
          entry.pending = null;
          total += buf.length;
          for (const k of entries.keys()) {
            if (total <= maxBytes) break;
            if (k !== key) drop(k);
          }
        }
        return buf;
      })
      .catch((err) => {
        if (entries.get(key) === entry) entries.delete(key);
        throw err;
      });
    entries.set(key, entry);
    return entry.pending;
  }

  return {
    get,
    clear() {
      entries.clear();
      total = 0;
    },
    stats: () => ({ entries: entries.size, bytes: total }),
  };
}

/**
 * Fertigen Antwort-Körper (Buffer/String) senden – gepackt, wenn der Typ passt, er ≥ 1 KB ist und der
 * Browser es kann. Setzt Vary: Accept-Encoding, Content-Length und (falls etag) 304 bei passendem ETag.
 * Für dynamische Antworten (API-JSON, Katzenseiten, CSV). headers muss Content-Type enthalten.
 */
export function sendBody(req, res, status, body, headers = {}, { etag = null } = {}) {
  let buf = Buffer.isBuffer(body) ? body : Buffer.from(body == null ? '' : String(body));
  const h = { ...headers };
  const type = h['Content-Type'] || h['content-type'];
  let enc = null;
  if (isCompressible(type) && !h['Content-Encoding'] && status !== 204 && status !== 304) {
    h.Vary = addVary(h.Vary, 'Accept-Encoding');
    if (buf.length >= MIN_BYTES) enc = pickEncoding(req && req.headers['accept-encoding']);
  }
  if (etag) h.ETag = etagFor(etag, enc);
  if (etag && status === 200 && req && etagMatches(req.headers['if-none-match'], h.ETag)) {
    res.writeHead(304, h);
    res.end();
    return;
  }
  if (enc) {
    const packed = compressFast(buf, enc);
    if (packed.length < buf.length) {
      buf = packed;
      h['Content-Encoding'] = enc;
    } else if (etag) {
      h.ETag = etag; // Packen hat nichts gebracht → unverpackt mit dem normalen ETag
    }
  }
  res.writeHead(status, { ...h, 'Content-Length': buf.length });
  res.end(req && req.method === 'HEAD' ? undefined : buf);
}
