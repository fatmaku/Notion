// LiveFX – GIF search (Tenor v2 / Giphy v1) and server-side import of a GIF URL into <dataDir>/assets.
//
// Routes (see docs/GIFS.md for the key setup):
//   GET  /api/gifs/status                      -> {ok, providers:{tenor, giphy}, mock}      (keys never leave the server)
//   PUT  /api/gifs/keys {tenorKey?, giphyKey?} -> stores keys in <dataDir>/config.json (0600); '' removes a key   [auth]
//   GET  /api/gifs/search?q=&provider=&limit=&lang= -> {ok, provider, results:[{id,title,preview,url,width,height}]} [auth]
//   POST /api/gifs/import {url, name?}         -> downloads an allow-listed GIF/PNG/JPEG/WEBP into the asset store [auth]
//   GET  /api/gifs/mock/<n>.gif                -> tiny GIF, only with LIVEFX_GIF_MOCK=1 (tests/demo without internet)
//
// Keys come from LIVEFX_TENOR_KEY / LIVEFX_GIPHY_KEY or from config.json. LIVEFX_GIF_MOCK=1 turns both
// providers into a deterministic in-process mock whose result URLs point at this server's mock route, so
// the whole search -> import -> library path is testable end-to-end without calling the real providers.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { HttpError, json, readJson } = require('./router');
const { requireAuth } = require('./auth');
const { sanitizeName, sniff } = require('./api-assets');
require('../js/schema.js');

const { LIMITS } = globalThis.LiveFXSchema;

const CONFIG_FILE = 'config.json';
const PROVIDERS = ['tenor', 'giphy'];
const LANGS = ['de', 'en', 'tr'];
const MAX_Q = 200;
const MAX_KEY = 200;
const KEY_RE = /^[A-Za-z0-9._~+/=-]{8,200}$/;
const DEFAULT_LIMIT = 24;
const SEARCH_TIMEOUT_MS = 6000;
const IMPORT_TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 3;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 200;
const MOCK_COUNT = 6;
const MAX_NAME = 100;

// 1x1 transparent GIF89a (43 bytes) – served by the mock route.
const MOCK_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');

/** Exact hosts and wildcard suffixes the importer may download from. */
const ALLOWED_HOSTS = ['media.tenor.com', 'c.tenor.com', 'media.giphy.com', 'i.giphy.com'];
const ALLOWED_SUFFIXES = ['.tenor.com', '.giphy.com'];

const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

function isMock() {
  return process.env.LIVEFX_GIF_MOCK === '1';
}

function assetLimit() {
  const n = Number(process.env.LIVEFX_ASSET_MAX);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : LIMITS.assetBytes;
}

// ---------------------------------------------------------------- keys / config.json

function configPath(ctx) {
  return path.join(ctx.dataDir, CONFIG_FILE);
}

function readConfig(ctx) {
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath(ctx), 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeConfig(ctx, cfg) {
  const file = configPath(ctx);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(cfg, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(tmp, file);
  } catch (e) {
    try {
      fs.unlinkSync(tmp);
    } catch (_) {
      /* already gone */
    }
    throw e;
  }
  try {
    fs.chmodSync(file, 0o600);
  } catch (_) {
    /* best effort (Windows) */
  }
}

function envKey(name) {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

/** Resolves the key for a provider: env first, then config.json. '' when none. */
function keyFor(ctx, provider) {
  const fromEnv = envKey(provider === 'tenor' ? 'LIVEFX_TENOR_KEY' : 'LIVEFX_GIPHY_KEY');
  if (fromEnv) return fromEnv;
  const cfg = readConfig(ctx);
  const v = cfg[provider === 'tenor' ? 'tenorKey' : 'giphyKey'];
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

function providersStatus(ctx) {
  if (isMock()) return { tenor: true, giphy: true };
  return { tenor: !!keyFor(ctx, 'tenor'), giphy: !!keyFor(ctx, 'giphy') };
}

// ---------------------------------------------------------------- search

const cache = new Map(); // key -> {at, value}

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) {
    const now = Date.now();
    for (const [k, v] of cache) if (now - v.at > CACHE_TTL_MS) cache.delete(k);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  }
  cache.set(key, { at: Date.now(), value });
}

function clampLimit(raw) {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(50, Math.max(1, n));
}

function str(v, max) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function httpsUrl(v) {
  return typeof v === 'string' && /^https:\/\/[^\s"'<>]{1,500}$/i.test(v) ? v : '';
}

/** Base URL other clients (and this server itself) reach us under in mock mode. */
function ownBase(req, ctx) {
  let host = (ctx.config && ctx.config.host) || '127.0.0.1';
  if (host === '0.0.0.0' || host === '::' || host === '') host = '127.0.0.1';
  if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
  const port = (req.socket && req.socket.localPort) || (ctx.config && ctx.config.port) || 8787;
  return `http://${host}:${port}`;
}

function mockSearch(req, ctx, q, provider, limit) {
  const base = ownBase(req, ctx);
  const sizes = [
    [480, 270],
    [320, 320],
    [400, 225],
    [500, 281],
    [360, 360],
    [498, 280],
  ];
  const results = [];
  for (let n = 1; n <= Math.min(MOCK_COUNT, limit); n++) {
    const [width, height] = sizes[(n - 1) % sizes.length];
    results.push({
      id: `mock-${n}`,
      title: `${q} #${n} (Mock ${provider === 'tenor' ? 'Tenor' : 'Giphy'})`,
      preview: `${base}/api/gifs/mock/${n}.gif`,
      url: `${base}/api/gifs/mock/${n}.gif`,
      width,
      height,
    });
  }
  return results;
}

async function fetchJson(url) {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS), headers: { accept: 'application/json' } });
  } catch (e) {
    throw new HttpError(502, 'upstream', `GIF-Anbieter nicht erreichbar (${e && e.name === 'TimeoutError' ? 'Timeout' : e.message})`);
  }
  if (!res.ok) throw new HttpError(502, 'upstream', `GIF-Anbieter antwortet mit HTTP ${res.status}`);
  try {
    return await res.json();
  } catch (_) {
    throw new HttpError(502, 'upstream', 'GIF-Anbieter liefert kein JSON');
  }
}

function normalizeTenor(body) {
  const out = [];
  for (const r of Array.isArray(body && body.results) ? body.results : []) {
    const mf = (r && r.media_formats) || {};
    const gif = mf.gif || mf.mediumgif || {};
    const tiny = mf.tinygif || mf.nanogif || gif;
    const url = httpsUrl(gif.url);
    if (!url) continue;
    const dims = Array.isArray(gif.dims) ? gif.dims : [];
    out.push({
      id: str(r.id, 64),
      title: str(r.content_description || r.title || r.h1_title || '', 200),
      preview: httpsUrl(tiny.url) || url,
      url,
      width: num(dims[0]),
      height: num(dims[1]),
    });
  }
  return out;
}

function normalizeGiphy(body) {
  const out = [];
  for (const r of Array.isArray(body && body.data) ? body.data : []) {
    const im = (r && r.images) || {};
    const orig = im.original || im.downsized || {};
    const small = im.fixed_width_small || im.preview_gif || im.fixed_width || orig;
    const url = httpsUrl(orig.url);
    if (!url) continue;
    out.push({
      id: str(r.id, 64),
      title: str(r.title || '', 200),
      preview: httpsUrl(small.url) || url,
      url,
      width: num(orig.width),
      height: num(orig.height),
    });
  }
  return out;
}

async function providerSearch(ctx, provider, q, lang, limit) {
  const key = keyFor(ctx, provider);
  if (!key) throw new HttpError(503, 'no_provider', 'Kein GIF-API-Key konfiguriert – siehe docs/GIFS.md');
  if (provider === 'tenor') {
    const u = new URL('https://tenor.googleapis.com/v2/search');
    u.searchParams.set('q', q);
    u.searchParams.set('key', key);
    u.searchParams.set('limit', String(limit));
    u.searchParams.set('media_filter', 'gif,tinygif');
    u.searchParams.set('locale', lang);
    u.searchParams.set('contentfilter', 'medium');
    return normalizeTenor(await fetchJson(u.href));
  }
  const u = new URL('https://api.giphy.com/v1/gifs/search');
  u.searchParams.set('api_key', key);
  u.searchParams.set('q', q);
  u.searchParams.set('limit', String(limit));
  u.searchParams.set('rating', 'pg-13');
  u.searchParams.set('lang', lang);
  return normalizeGiphy(await fetchJson(u.href));
}

// ---------------------------------------------------------------- import (SSRF-guarded download)

/** Loopback hosts of this very server (only honoured in mock mode). */
function isOwnMockHost(u, req) {
  const host = u.hostname.toLowerCase();
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '[::1]' && host !== '::1') return false;
  const port = Number(u.port || (u.protocol === 'https:' ? 443 : 80));
  const own = req.socket && req.socket.localPort;
  return !!own && port === own;
}

/**
 * Validates a download URL against the allow-list. Throws 400 host_not_allowed. Applied to the
 * initial URL and to every redirect target, so a trusted host can never bounce us elsewhere.
 */
function checkAllowed(raw, req) {
  let u;
  try {
    u = new URL(String(raw));
  } catch (_) {
    throw new HttpError(400, 'bad_url', 'URL ungültig');
  }
  if (u.username || u.password) throw new HttpError(400, 'host_not_allowed', 'URL mit Zugangsdaten nicht erlaubt');
  const host = u.hostname.toLowerCase();
  if (isMock() && isOwnMockHost(u, req) && u.protocol === 'http:') return u;
  if (u.protocol !== 'https:') throw new HttpError(400, 'host_not_allowed', 'Nur https-URLs von Tenor/Giphy erlaubt');
  // Every IP literal (public, private, loopback, IPv6) is rejected outside the mock case above.
  if (IPV4_RE.test(host) || host.includes(':')) throw new HttpError(400, 'host_not_allowed', 'IP-Adressen sind nicht erlaubt');
  const ok = ALLOWED_HOSTS.includes(host) || ALLOWED_SUFFIXES.some((s) => host.endsWith(s) && host.length > s.length);
  if (!ok) throw new HttpError(400, 'host_not_allowed', `Host „${host}“ ist nicht erlaubt (nur Tenor/Giphy)`);
  return u;
}

/** Reads a fetch body with a hard byte cap; throws 413 when exceeded. */
async function readCapped(res, limit, signal) {
  const declared = Number(res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) throw new HttpError(413, 'payload_too_large', `Datei größer als ${limit} Bytes`);
  const chunks = [];
  let size = 0;
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  for (;;) {
    if (signal.aborted) throw new HttpError(504, 'timeout', 'Download abgebrochen (Timeout)');
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      try {
        await reader.cancel();
      } catch (_) {
        /* ignore */
      }
      throw new HttpError(413, 'payload_too_large', `Datei größer als ${limit} Bytes`);
    }
    chunks.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
  }
  return Buffer.concat(chunks);
}

async function download(rawUrl, req) {
  const limit = assetLimit();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), IMPORT_TIMEOUT_MS);
  try {
    let u = checkAllowed(rawUrl, req);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      let res;
      try {
        res = await fetch(u.href, { redirect: 'manual', signal: ac.signal, headers: { accept: 'image/gif,image/*' } });
      } catch (e) {
        if (ac.signal.aborted) throw new HttpError(504, 'timeout', 'Download abgebrochen (Timeout)');
        throw new HttpError(502, 'upstream', `Download fehlgeschlagen (${e.message})`);
      }
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get('location');
        try {
          await res.body?.cancel();
        } catch (_) {
          /* ignore */
        }
        if (!loc) throw new HttpError(502, 'upstream', 'Redirect ohne Ziel');
        if (hop === MAX_REDIRECTS) throw new HttpError(502, 'upstream', 'Zu viele Weiterleitungen');
        u = checkAllowed(new URL(loc, u).href, req);
        continue;
      }
      if (!res.ok) {
        try {
          await res.body?.cancel();
        } catch (_) {
          /* ignore */
        }
        throw new HttpError(502, 'upstream', `Download antwortet mit HTTP ${res.status}`);
      }
      return { buf: await readCapped(res, limit, ac.signal), finalUrl: u };
    }
    throw new HttpError(502, 'upstream', 'Zu viele Weiterleitungen');
  } finally {
    clearTimeout(timer);
  }
}

function assetsDir(ctx) {
  const dir = path.join(ctx.dataDir, 'assets');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function uniqueName(dir, name) {
  if (!fs.existsSync(path.join(dir, name))) return name;
  const dot = name.lastIndexOf('.');
  const ext = name.slice(dot + 1);
  const base = name.slice(0, dot);
  for (let n = 2; n < 10000; n++) {
    const room = MAX_NAME - ext.length - 1 - String(n).length - 1;
    const candidate = `${base.slice(0, room)}-${n}.${ext}`;
    if (!fs.existsSync(path.join(dir, candidate))) return candidate;
  }
  throw new HttpError(409, 'conflict', 'too many files with this name');
}

/** Builds the stored file name: caller's name (sanitized, extension forced) or gif-<hash>.<ext>. */
function importName(rawName, url, ext) {
  let base = '';
  if (typeof rawName === 'string' && rawName.trim()) {
    base = rawName.trim().split(/[\\/]/).pop().replace(/\.[a-z0-9]{1,5}$/i, '');
  }
  if (!base) {
    const m = /\/([a-z0-9_-]{4,64})\.(gif|png|jpe?g|webp)(?:[?#]|$)/i.exec(url.pathname + url.search);
    const id = m ? m[1].toLowerCase() : crypto.createHash('sha1').update(url.href).digest('hex').slice(0, 10);
    base = `gif-${id}`;
  }
  const name = sanitizeName(`${base}.${ext}`);
  if (!name) throw new HttpError(400, 'bad_filename', 'Dateiname ungültig');
  return name;
}

function describe(dir, name) {
  const st = fs.statSync(path.join(dir, name));
  return { name, url: `assets/${name}`, size: st.size, type: 'image', mtime: Math.round(st.mtimeMs) };
}

function writeAsset(dir, name, buf) {
  const finalName = uniqueName(dir, name);
  const tmp = path.join(dir, `.import-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`);
  try {
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, path.join(dir, finalName));
  } catch (e) {
    try {
      fs.unlinkSync(tmp);
    } catch (_) {
      /* already gone */
    }
    throw e;
  }
  return finalName;
}

// ---------------------------------------------------------------- routes

/**
 * server.js replaces the message of every 5xx with 'internal error'. The 502/503/504 answers here
 * carry user-facing German hints (missing key, upstream down), so they are written directly.
 */
function withUpstreamErrors(handler) {
  return async function wrapped(req, res, ctx) {
    try {
      await handler(req, res, ctx);
    } catch (e) {
      if (e instanceof HttpError && e.status >= 500 && e.status < 600 && !res.headersSent) {
        json(res, e.status, { ok: false, error: e.code, message: e.message });
        return;
      }
      throw e;
    }
  };
}

function register(router, appCtx) {
  router.route('GET', '/api/gifs/status', (req, res, ctx) => {
    json(res, 200, { ok: true, providers: providersStatus(ctx), mock: isMock() });
  });

  router.route(
    'PUT',
    '/api/gifs/keys',
    requireAuth(async (req, res, ctx) => {
      const body = await readJson(req, 16 * 1024);
      const cfg = readConfig(ctx);
      for (const [field, prop] of [
        ['tenorKey', 'tenorKey'],
        ['giphyKey', 'giphyKey'],
      ]) {
        if (!(field in body)) continue;
        const v = body[field];
        if (v === null || v === '') {
          delete cfg[prop];
          continue;
        }
        if (typeof v !== 'string' || v.length > MAX_KEY || !KEY_RE.test(v.trim())) {
          throw new HttpError(400, 'bad_key', `${field} ungültig (8–${MAX_KEY} Zeichen, keine Leerzeichen)`);
        }
        cfg[prop] = v.trim();
      }
      writeConfig(ctx, cfg);
      cache.clear();
      json(res, 200, { ok: true, providers: providersStatus(ctx), mock: isMock() });
    })
  );

  router.route(
    'GET',
    '/api/gifs/search',
    requireAuth(withUpstreamErrors(async (req, res, ctx) => {
      const sp = ctx.url.searchParams;
      const q = String(sp.get('q') || '').replace(/\s+/g, ' ').trim();
      if (!q) throw new HttpError(400, 'bad_query', 'Suchbegriff (q) fehlt');
      if (q.length > MAX_Q) throw new HttpError(400, 'bad_query', `Suchbegriff zu lang (max. ${MAX_Q} Zeichen)`);
      const wanted = String(sp.get('provider') || 'auto').toLowerCase();
      if (wanted !== 'auto' && !PROVIDERS.includes(wanted)) throw new HttpError(400, 'bad_provider', 'provider muss auto, tenor oder giphy sein');
      const limit = clampLimit(sp.get('limit'));
      const langRaw = String(sp.get('lang') || 'en').toLowerCase().slice(0, 2);
      const lang = LANGS.includes(langRaw) ? langRaw : 'en';
      const status = providersStatus(ctx);
      const provider = wanted === 'auto' ? (status.tenor ? 'tenor' : status.giphy ? 'giphy' : null) : wanted;
      if (!provider || !status[provider]) {
        throw new HttpError(503, 'no_provider', 'Kein GIF-API-Key konfiguriert (Tenor oder Giphy) – Anleitung in docs/GIFS.md');
      }
      if (isMock()) {
        json(res, 200, { ok: true, provider, mock: true, results: mockSearch(req, ctx, q, provider, limit) });
        return;
      }
      const cacheKey = JSON.stringify([provider, q.toLowerCase(), lang, limit]);
      let results = cacheGet(cacheKey);
      let cached = true;
      if (!results) {
        results = await providerSearch(ctx, provider, q, lang, limit);
        cacheSet(cacheKey, results);
        cached = false;
      }
      json(res, 200, { ok: true, provider, cached, results });
    }))
  );

  router.route(
    'POST',
    '/api/gifs/import',
    requireAuth(withUpstreamErrors(async (req, res, ctx) => {
      const body = await readJson(req, 16 * 1024);
      if (typeof body.url !== 'string' || !body.url.trim() || body.url.length > 2000) throw new HttpError(400, 'bad_url', 'url fehlt');
      const { buf, finalUrl } = await download(body.url.trim(), req);
      const sniffed = sniff(buf);
      if (!sniffed || sniffed.type !== 'image') throw new HttpError(415, 'unsupported_type', 'Datei ist kein GIF/PNG/JPEG/WEBP');
      const dir = assetsDir(ctx);
      const name = importName(body.name, finalUrl, sniffed.ext);
      const finalName = writeAsset(dir, name, buf);
      ctx.log && ctx.log(`gifs: importiert ${finalName} (${buf.length} B) von ${finalUrl.host}`);
      json(res, 200, { ok: true, asset: describe(dir, finalName) });
    }))
  );

  if (isMock()) {
    router.route('GET', '/api/gifs/mock/:file', (req, res, ctx) => {
      if (!/^[1-9]\d{0,2}\.gif$/.test(ctx.params.file)) throw new HttpError(404, 'not_found', 'not found');
      res.writeHead(200, { 'content-type': 'image/gif', 'content-length': MOCK_GIF.length, 'cache-control': 'no-store' });
      res.end(MOCK_GIF);
    });
  }
  void appCtx;
}

module.exports = { register, checkAllowed, normalizeTenor, normalizeGiphy, MOCK_GIF };
