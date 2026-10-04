// LiveFX – GIF search (KLIPY / GIPHY) with our own safety filter. Results are HOTLINKS on the provider's
// media host: nothing is downloaded, cached or proxied (GIPHY terms forbid it; KLIPY is treated the same).
//
// Routes (see docs/GIFS.md for the key setup):
//   GET  /api/gifs/status                       -> {ok, providers:{klipy, giphy}, mock, default, attribution, tenorRemoved?}
//   PUT  /api/gifs/keys {klipyKey?, giphyKey?}  -> stores keys in <dataDir>/config.json (0600); '' removes a key   [auth]
//   GET  /api/gifs/search?q=&provider=&limit=&lang=
//        -> {ok, provider, attribution, results:[{id,title,preview,url,width,height,provider}], filtered}       [auth]
//        -> blocked query: {ok:true, provider, attribution, results:[], blocked:true, reason, message}  (provider NOT called)
//   POST /api/gifs/import                       -> 403 provider_terms for KLIPY/GIPHY (and old Tenor) media;
//                                                  every other host 400 (uploads go through /api/assets)       [auth]
//   GET  /api/gifs/mock/<n>.gif, /api/gifs/mock-stats -> only with LIVEFX_GIF_MOCK=1 (tests/demo without internet)
//
// Every provider request carries rating=g (KLIPY additionally contentfilter=high) and the panel language
// (lang de|tr|en, KLIPY locale de_DE|tr_TR|en_US). Queries are checked with LiveFXSafety.check() first; the
// provider's results are filtered again by title/tags/slug because ratings are known to leak.
//
// Tenor shut its API down on 30 June 2026 – provider=tenor answers 410 provider_removed.
//
// Keys: LIVEFX_KLIPY_KEY / LIVEFX_GIPHY_KEY or config.json (klipyKey / giphyKey). LIVEFX_GIF_MOCK=1 turns
// both providers into a deterministic in-process mock that builds the real request URL (so rating/lang are
// observable via /api/gifs/mock-stats) and answers with provider-shaped JSON, including results that the
// safety filter must remove. LIVEFX_GIF_UPSTREAM=http://127.0.0.1:<port> (loopback only, tests) points both
// providers at a local stub instead of api.klipy.com / api.giphy.com.
'use strict';

const fs = require('fs');
const path = require('path');
const { HttpError, json, readJson } = require('./router');
const { requireAuth } = require('./auth');
const crypto = require('crypto');
const { sanitizeName, sniff } = require('./api-assets');
const Safety = require('../js/safety.js');
require('../js/schema.js');

const { LIMITS } = globalThis.LiveFXSchema;

const CONFIG_FILE = 'config.json';
const PROVIDERS = ['klipy', 'giphy'];
const REMOVED_PROVIDERS = ['tenor'];
const ATTRIBUTION = { klipy: 'Powered by KLIPY', giphy: 'Powered By GIPHY' };
const KEY_FIELDS = { klipy: 'klipyKey', giphy: 'giphyKey' };
const KEY_ENV = { klipy: 'LIVEFX_KLIPY_KEY', giphy: 'LIVEFX_GIPHY_KEY' };
const LANGS = ['de', 'en', 'tr'];
const KLIPY_LOCALE = { de: 'de_DE', tr: 'tr_TR', en: 'en_US' };
const KLIPY_COUNTRY = { de: 'DE', tr: 'TR', en: 'US' };
const MAX_Q = 200;
const MAX_KEY = 200;
const KEY_RE = /^[A-Za-z0-9._~+/=-]{8,200}$/;
const DEFAULT_LIMIT = 24;
const SEARCH_TIMEOUT_MS = 6000;
const MOCK_COUNT = 6;
const MAX_NAME = 100;
const TENOR_GONE =
  'Tenor hat seine API am 30.06.2026 abgeschaltet – bitte KLIPY (kostenlos) oder GIPHY verwenden, siehe docs/GIFS.md';

// 1x1 transparent GIF89a (43 bytes) – served by the mock route.
const MOCK_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');

/** Media hosts per provider. Result URLs elsewhere are dropped; import refuses these hosts (provider terms). */
const MEDIA_SUFFIXES = { klipy: ['.klipy.com'], giphy: ['.giphy.com'], tenor: ['.tenor.com', '.tenor.co'] };
const MEDIA_EXACT = { klipy: ['klipy.com'], giphy: ['giphy.com'], tenor: ['tenor.com'] };
/** Hosts a search result's hotlink may point to (kept in sync with the visual.src allow-list in js/schema.js). */
const HOTLINK_HOST_RE = { klipy: /^(?:[a-z0-9-]{1,63}\.)?klipy\.com$/, giphy: /^(?:media[0-9]?|i)\.giphy\.com$/ };

/**
 * Hosts the importer may still download from. Deliberately EMPTY: GIF provider media must be hotlinked,
 * never stored, and own files are uploaded via POST /api/assets. The SSRF-guarded download path below stays
 * (used by the loopback mock route in tests) so a future, storage-friendly source can be enabled here.
 */
const IMPORT_HOSTS = [];

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
  if (!PROVIDERS.includes(provider)) return '';
  const fromEnv = envKey(KEY_ENV[provider]);
  if (fromEnv) return fromEnv;
  const v = readConfig(ctx)[KEY_FIELDS[provider]];
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

function providersStatus(ctx) {
  if (isMock()) return { klipy: true, giphy: true };
  return { klipy: !!keyFor(ctx, 'klipy'), giphy: !!keyFor(ctx, 'giphy') };
}

function defaultProvider(status) {
  return status.klipy ? 'klipy' : status.giphy ? 'giphy' : null;
}

/** True when an old Tenor key is still configured (shown as a hint in the panel). */
function tenorLeftover(ctx) {
  return !!(envKey('LIVEFX_TENOR_KEY') || readConfig(ctx).tenorKey || readConfig(ctx).gifProvider === 'tenor');
}

function statusBody(ctx) {
  const providers = providersStatus(ctx);
  const body = { ok: true, providers, mock: isMock(), default: defaultProvider(providers), attribution: ATTRIBUTION };
  if (tenorLeftover(ctx)) {
    body.tenorRemoved = true;
    body.notice = TENOR_GONE;
  }
  return body;
}

// ---------------------------------------------------------------- helpers

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

function hostIs(host, provider) {
  const h = String(host || '').toLowerCase();
  return MEDIA_EXACT[provider].includes(h) || MEDIA_SUFFIXES[provider].some((s) => h.endsWith(s) && h.length > s.length);
}

/** Which provider (klipy|giphy|tenor) owns this media URL's host, or null. */
function providerOfUrl(raw) {
  let u;
  try {
    u = new URL(String(raw));
  } catch (_) {
    return null;
  }
  for (const p of Object.keys(MEDIA_SUFFIXES)) if (hostIs(u.hostname, p)) return p;
  return null;
}

/** https URL on the provider's media host, else ''. */
function mediaUrl(v, provider) {
  if (typeof v !== 'string' || !/^https:\/\/[^\s"'<>]{1,500}$/i.test(v)) return '';
  try {
    const u = new URL(v);
    if (u.username || u.password || u.port) return '';
    return HOTLINK_HOST_RE[provider].test(u.hostname) ? u.href : '';
  } catch (_) {
    return '';
  }
}

function tagList(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((t) => typeof t === 'string').slice(0, 30).map((t) => t.slice(0, 60));
}

// ---------------------------------------------------------------- provider response mapping (pure, mock-tested)

/**
 * KLIPY. Primary shape: the Tenor-v2-compatible layer (https://api.klipy.com/v2/search, `results[]` with
 * `media_formats.{gif,mediumgif,tinygif,nanogif,webp,tinywebp,…}.{url,dims}`). Also tolerates KLIPY's
 * native shape (`data.data[]` with `file.{hd,md,sm,xs}.{webp,gif}.{url,width,height}`).
 * Picks a small webp/gif for `url` (performance) and the tiniest rendition for `preview`.
 */
function normalizeKlipy(body) {
  const out = [];
  const list = Array.isArray(body && body.results) ? body.results : Array.isArray(body && body.data && body.data.data) ? body.data.data : Array.isArray(body && body.data) ? body.data : [];
  for (const r of list) {
    if (!r || typeof r !== 'object') continue;
    let main = null;
    let small = null;
    if (r.media_formats && typeof r.media_formats === 'object') {
      const mf = r.media_formats;
      const pick = (names) => {
        for (const n of names) {
          const f = mf[n];
          const url = f && mediaUrl(f.url, 'klipy');
          if (url) return { url, width: num(Array.isArray(f.dims) ? f.dims[0] : f.width), height: num(Array.isArray(f.dims) ? f.dims[1] : f.height) };
        }
        return null;
      };
      main = pick(['webp', 'mediumgif', 'tinygif', 'gif']);
      small = pick(['tinywebp', 'nanowebp', 'tinygif', 'nanogif']);
    } else if (r.file && typeof r.file === 'object') {
      const pick = (pairs) => {
        for (const [size, fmt] of pairs) {
          const f = r.file[size] && r.file[size][fmt];
          const url = f && mediaUrl(f.url, 'klipy');
          if (url) return { url, width: num(f.width), height: num(f.height) };
        }
        return null;
      };
      main = pick([['md', 'webp'], ['md', 'gif'], ['sm', 'webp'], ['sm', 'gif'], ['hd', 'webp'], ['hd', 'gif']]);
      small = pick([['xs', 'webp'], ['xs', 'gif'], ['sm', 'webp'], ['sm', 'gif']]);
    }
    if (!main) continue;
    out.push({
      id: str(String(r.id ?? r.slug ?? ''), 64),
      title: str(r.title || r.content_description || r.h1_title || '', 200),
      preview: (small && small.url) || main.url,
      url: main.url,
      width: main.width,
      height: main.height,
      provider: 'klipy',
      tags: tagList(r.tags),
      slug: str(r.slug || '', 200),
      content_description: str(r.content_description || '', 300),
    });
  }
  return out;
}

/**
 * GIPHY v1 search (`data[]` with `images.{fixed_height,fixed_width_small,preview_gif,downsized,original}`).
 * `url` = fixed_height (200 px) webp → gif, `preview` = fixed_width_small (100 px) webp → gif.
 */
function normalizeGiphy(body) {
  const out = [];
  for (const r of Array.isArray(body && body.data) ? body.data : []) {
    if (!r || typeof r !== 'object') continue;
    const im = r.images || {};
    const pick = (cands) => {
      for (const [name, field] of cands) {
        const f = im[name];
        const url = f && mediaUrl(f[field], 'giphy');
        if (url) return { url, width: num(f.width), height: num(f.height) };
      }
      return null;
    };
    const main = pick([['fixed_height', 'webp'], ['fixed_height', 'url'], ['downsized', 'url'], ['original', 'webp'], ['original', 'url']]);
    if (!main) continue;
    const small = pick([['fixed_width_small', 'webp'], ['fixed_width_small', 'url'], ['preview_gif', 'url'], ['fixed_height_small', 'url']]);
    out.push({
      id: str(r.id, 64),
      title: str(r.title || '', 200),
      preview: (small && small.url) || main.url,
      url: main.url,
      width: main.width,
      height: main.height,
      provider: 'giphy',
      tags: tagList(r.tags),
      slug: str(r.slug || '', 200),
      alt_text: str(r.alt_text || '', 300),
      username: str(r.username || '', 60),
    });
  }
  return out;
}

/** Safety filter on title/tags/slug/description, then strip the internal fields. */
function publicResults(items) {
  const { kept, removed } = Safety.partition(items);
  const results = kept.map((r) => ({ id: r.id, title: r.title, preview: r.preview, url: r.url, width: r.width, height: r.height, provider: r.provider }));
  return { results, filtered: removed.length };
}

// ---------------------------------------------------------------- request building

/** Builds the provider request URL. Every request: rating=g + language. */
function buildRequest(provider, key, q, lang, limit) {
  const up = upstreamBase();
  if (provider === 'klipy') {
    const u = new URL(up ? `${up}/klipy/v2/search` : 'https://api.klipy.com/v2/search');
    u.searchParams.set('q', q);
    u.searchParams.set('key', key);
    u.searchParams.set('client_key', 'livefx');
    u.searchParams.set('limit', String(limit));
    u.searchParams.set('locale', KLIPY_LOCALE[lang]);
    u.searchParams.set('country', KLIPY_COUNTRY[lang]);
    u.searchParams.set('rating', 'g');
    u.searchParams.set('contentfilter', 'high');
    u.searchParams.set('media_filter', 'webp,tinywebp,mediumgif,tinygif,nanogif,gif');
    return u;
  }
  const u = new URL(up ? `${up}/giphy/v1/gifs/search` : 'https://api.giphy.com/v1/gifs/search');
  u.searchParams.set('api_key', key);
  u.searchParams.set('q', q);
  u.searchParams.set('limit', String(limit));
  u.searchParams.set('rating', 'g');
  u.searchParams.set('lang', lang);
  return u;
}

/** LIVEFX_GIF_UPSTREAM – loopback http(s) base only (test stub); anything else is ignored. */
function upstreamBase() {
  const v = envKey('LIVEFX_GIF_UPSTREAM');
  if (!v) return '';
  try {
    const u = new URL(v);
    if (!/^https?:$/.test(u.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)) return '';
    return u.origin;
  } catch (_) {
    return '';
  }
}

async function fetchJson(url) {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS), headers: { accept: 'application/json' }, redirect: 'error' });
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

// ---------------------------------------------------------------- mock provider

const mockStats = { calls: 0, last: null };

/** Provider-shaped mock body. Contains 2–3 items the safety filter must remove (by title, tag and slug). */
function mockBody(provider, u) {
  const q = provider === 'klipy' ? u.searchParams.get('q') : u.searchParams.get('q');
  const limit = Number(u.searchParams.get('limit')) || DEFAULT_LIMIT;
  const sizes = [
    [356, 200],
    [200, 200],
    [356, 200],
    [300, 169],
    [200, 200],
    [355, 200],
  ];
  const unsafe = [
    { title: `${q} beer party`, tags: ['fun'], slug: 'fun-drinks' },
    { title: `${q} funny`, tags: ['gun', 'action'], slug: 'action' },
    { title: `${q} crowd`, tags: [], slug: 'crowd-in-church-xyz' },
  ];
  const items = [];
  const name = provider === 'klipy' ? 'KLIPY' : 'GIPHY';
  for (let n = 1; n <= MOCK_COUNT; n++) {
    const [w, h] = sizes[n - 1];
    items.push({ n, title: `${q} #${n} (Mock ${name})`, tags: ['mock', 'reaction'], slug: `mock-${n}`, w, h });
    if (n === 2 || n === 4 || n === 5) {
      const bad = unsafe[[2, 4, 5].indexOf(n)];
      items.push({ n: 100 + n, ...bad, w, h });
    }
  }
  const take = items.slice(0, limit + 3); // the filter removes up to 3
  if (provider === 'klipy') {
    return {
      results: take.map((it) => ({
        id: `mock-${it.n}`,
        title: it.title,
        content_description: it.title,
        tags: it.tags,
        slug: it.slug,
        media_formats: {
          webp: { url: `https://static.klipy.com/mock/${it.n}/md.webp`, dims: [it.w, it.h] },
          tinygif: { url: `https://static.klipy.com/mock/${it.n}/tiny.gif`, dims: [Math.round(it.w / 2), Math.round(it.h / 2)] },
        },
      })),
      next: '',
    };
  }
  return {
    data: take.map((it) => ({
      id: `mock-${it.n}`,
      title: it.title,
      slug: it.slug,
      tags: it.tags,
      images: {
        fixed_height: { url: `https://media.giphy.com/media/mock${it.n}/200.gif`, webp: `https://media.giphy.com/media/mock${it.n}/200.webp`, width: String(it.w), height: '200' },
        fixed_width_small: { url: `https://media.giphy.com/media/mock${it.n}/100w.gif`, width: '100', height: String(Math.round((100 * it.h) / it.w)) },
      },
    })),
    meta: { status: 200 },
  };
}

/** Base URL this server is reachable under (mock previews point here so they render offline). */
function ownBase(req, ctx) {
  let host = (ctx.config && ctx.config.host) || '127.0.0.1';
  if (host === '0.0.0.0' || host === '::' || host === '') host = '127.0.0.1';
  if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
  const port = (req.socket && req.socket.localPort) || (ctx.config && ctx.config.port) || 8787;
  return `http://${host}:${port}`;
}

// ---------------------------------------------------------------- search

async function providerSearch(req, ctx, provider, q, lang, limit) {
  const key = isMock() ? 'mock-key' : keyFor(ctx, provider);
  if (!key) throw new HttpError(503, 'no_provider', 'Kein GIF-API-Key konfiguriert – siehe docs/GIFS.md');
  const u = buildRequest(provider, key, q, lang, limit);
  let body;
  if (isMock()) {
    mockStats.calls++;
    const params = Object.fromEntries(u.searchParams);
    delete params.key;
    delete params.api_key;
    mockStats.last = { provider, host: u.host, path: u.pathname, params };
    body = mockBody(provider, u);
  } else {
    body = await fetchJson(u.href);
  }
  const items = (provider === 'klipy' ? normalizeKlipy(body) : normalizeGiphy(body)).slice(0, limit + 10);
  const out = publicResults(items);
  out.results = out.results.slice(0, limit);
  if (isMock()) {
    // previews are served by this server so the demo renders offline; `url` stays the provider hotlink
    const base = ownBase(req, ctx);
    out.results.forEach((r, i) => (r.preview = `${base}/api/gifs/mock/${(i % MOCK_COUNT) + 1}.gif`));
  }
  return out;
}

// ---------------------------------------------------------------- import (SSRF-guarded, provider media refused)

function providerTerms(provider) {
  const name = provider === 'giphy' ? 'GIPHY' : provider === 'klipy' ? 'KLIPY' : 'Tenor';
  return new HttpError(
    403,
    'provider_terms',
    `${name}-GIFs dürfen laut Nutzungsbedingungen nicht gespeichert werden – „Als Trigger“ verlinkt sie direkt. Eigene Dateien über „Datei hochladen“.`
  );
}

/** Loopback hosts of this very server (only honoured in mock mode). */
function isOwnMockHost(u, req) {
  const host = u.hostname.toLowerCase();
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '[::1]' && host !== '::1') return false;
  const port = Number(u.port || (u.protocol === 'https:' ? 443 : 80));
  const own = req.socket && req.socket.localPort;
  return !!own && port === own;
}

/**
 * Validates a download URL. 400 bad_url / host_not_allowed, 403 provider_terms for KLIPY/GIPHY/Tenor media.
 * Applied to the initial URL and to every redirect target, so a trusted host can never bounce us elsewhere.
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
  if (isMock() && isOwnMockHost(u, req) && u.protocol === 'http:' && /^\/api\/gifs\/mock\//.test(u.pathname)) return u;
  if (u.protocol !== 'https:') throw new HttpError(400, 'host_not_allowed', 'Nur https-URLs erlaubt');
  // Every IP literal (public, private, loopback, IPv6) is rejected outside the mock case above.
  if (IPV4_RE.test(host) || host.includes(':') || host.startsWith('[')) throw new HttpError(400, 'host_not_allowed', 'IP-Adressen sind nicht erlaubt');
  const owner = providerOfUrl(u.href);
  if (owner) throw providerTerms(owner);
  if (!IMPORT_HOSTS.includes(host)) throw new HttpError(400, 'host_not_allowed', `Import von „${host}“ ist nicht erlaubt – eigene Dateien bitte hochladen`);
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
  const timer = setTimeout(() => ac.abort(), 10000);
  try {
    let u = checkAllowed(rawUrl, req);
    for (let hop = 0; hop <= 3; hop++) {
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
        if (!loc || hop === 3) throw new HttpError(502, 'upstream', 'Weiterleitung ungültig');
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
  if (!base) base = `gif-${crypto.createHash('sha1').update(url.href).digest('hex').slice(0, 10)}`;
  const name = sanitizeName(`${base}.${ext}`);
  if (!name) throw new HttpError(400, 'bad_filename', 'Dateiname ungültig');
  return name;
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
  const st = fs.statSync(path.join(dir, finalName));
  return { name: finalName, url: `assets/${finalName}`, size: st.size, type: 'image', mtime: Math.round(st.mtimeMs) };
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

function langOf(raw) {
  const l = String(raw || 'en').toLowerCase().slice(0, 2);
  return LANGS.includes(l) ? l : 'en';
}

function register(router, appCtx) {
  router.route('GET', '/api/gifs/status', (req, res, ctx) => {
    json(res, 200, statusBody(ctx));
  });

  router.route(
    'PUT',
    '/api/gifs/keys',
    requireAuth(async (req, res, ctx) => {
      const body = await readJson(req, 16 * 1024);
      const cfg = readConfig(ctx);
      if ('tenorKey' in body) {
        if (body.tenorKey === null || body.tenorKey === '') delete cfg.tenorKey; // allow cleaning up the old key
        else throw new HttpError(410, 'provider_removed', TENOR_GONE);
      }
      for (const field of Object.values(KEY_FIELDS)) {
        if (!(field in body)) continue;
        const v = body[field];
        if (v === null || v === '') {
          delete cfg[field];
          continue;
        }
        if (typeof v !== 'string' || v.length > MAX_KEY || !KEY_RE.test(v.trim())) {
          throw new HttpError(400, 'bad_key', `${field} ungültig (8–${MAX_KEY} Zeichen, keine Leerzeichen)`);
        }
        cfg[field] = v.trim();
      }
      if (cfg.gifProvider === 'tenor') delete cfg.gifProvider;
      writeConfig(ctx, cfg);
      json(res, 200, statusBody(ctx));
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
      if (REMOVED_PROVIDERS.includes(wanted)) throw new HttpError(410, 'provider_removed', TENOR_GONE);
      if (wanted !== 'auto' && !PROVIDERS.includes(wanted)) throw new HttpError(400, 'bad_provider', 'provider muss auto, klipy oder giphy sein');
      const limit = clampLimit(sp.get('limit'));
      const lang = langOf(sp.get('lang'));
      const status = providersStatus(ctx);
      const provider = wanted === 'auto' ? defaultProvider(status) : wanted;
      const attribution = provider ? ATTRIBUTION[provider] : null;

      // 1. our own safety check – a blocked query never reaches the provider
      const verdict = Safety.check(q);
      if (!verdict.ok) {
        json(res, 200, { ok: true, provider, attribution, results: [], blocked: true, reason: verdict.reason, message: Safety.message(verdict.reason, lang) });
        return;
      }
      if (!provider || !status[provider]) {
        const hint = tenorLeftover(ctx) ? `${TENOR_GONE}.` : 'Kein GIF-API-Key konfiguriert (KLIPY oder GIPHY) – Anleitung in docs/GIFS.md';
        throw new HttpError(503, 'no_provider', hint);
      }
      // 2. provider call (rating=g, lang) + 3. result filter
      const out = await providerSearch(req, ctx, provider, q, lang, limit);
      const body = { ok: true, provider, attribution, lang, results: out.results, filtered: out.filtered };
      if (isMock()) body.mock = true;
      json(res, 200, body);
    }))
  );

  router.route(
    'POST',
    '/api/gifs/import',
    requireAuth(withUpstreamErrors(async (req, res, ctx) => {
      const body = await readJson(req, 16 * 1024);
      const prov = typeof body.provider === 'string' ? body.provider.toLowerCase() : '';
      if (PROVIDERS.includes(prov) || REMOVED_PROVIDERS.includes(prov)) throw providerTerms(prov);
      if (typeof body.url !== 'string' || !body.url.trim() || body.url.length > 2000) throw new HttpError(400, 'bad_url', 'url fehlt');
      const { buf, finalUrl } = await download(body.url.trim(), req);
      const sniffed = sniff(buf);
      if (!sniffed || sniffed.type !== 'image') throw new HttpError(415, 'unsupported_type', 'Datei ist kein GIF/PNG/JPEG/WEBP');
      // Only reachable for IMPORT_HOSTS (none today) or the loopback mock route in tests.
      const asset = writeAsset(assetsDir(ctx), importName(body.name, finalUrl, sniffed.ext), buf);
      ctx.log && ctx.log(`gifs: importiert ${asset.name} (${buf.length} B) von ${finalUrl.host}`);
      json(res, 200, { ok: true, asset });
    }))
  );

  if (isMock()) {
    router.route('GET', '/api/gifs/mock-stats', (req, res) => {
      json(res, 200, { ok: true, calls: mockStats.calls, last: mockStats.last });
    });
    router.route('GET', '/api/gifs/mock/:file', (req, res, ctx) => {
      if (!/^[1-9]\d{0,2}\.gif$/.test(ctx.params.file)) throw new HttpError(404, 'not_found', 'not found');
      res.writeHead(200, { 'content-type': 'image/gif', 'content-length': MOCK_GIF.length, 'cache-control': 'no-store' });
      res.end(MOCK_GIF);
    });
  }
  void appCtx;
}

module.exports = {
  register,
  checkAllowed,
  normalizeKlipy,
  normalizeGiphy,
  publicResults,
  buildRequest,
  providerOfUrl,
  ATTRIBUTION,
  MOCK_GIF,
};
