// LiveFX – authentication. See docs/CONTRACTS.md §4 "Auth" and docs/START.md §Sicherheit.
//
// Ways in:
//   1. `Authorization: Bearer <token>` – external tools (curl, Stream Deck, other ASR engines).
//      The token lives in LIVEFX_TOKEN or data/token.txt (created on first start).
//   2. The PC itself ("local" = loopback socket and NOT through the internet tunnel): same-origin browser requests
//      from an allowed Host (localhost, an IP literal, or a name in LIVEFX_ALLOWED_HOSTS). `sec-fetch-site:
//      same-origin` or a matching `Origin` header proves the request came from the panel served by this process.
//   3. Every other device (phone / second PC in the WLAN, anything through the tunnel) needs a session cookie:
//      a paired device (`livefx_dev`, server/pairing.js – QR code / 6-digit code) or the legacy panel cookie
//      (`livefx=<token>`, only ever set for local requests). Reads (GET/HEAD) need the cookie alone – on plain-http
//      LAN origins browsers send neither Sec-Fetch-Site nor Origin on same-origin GETs; writes additionally need a
//      matching Origin (CSRF guard).
//
// 2.3 – LAN by default: server.js listens on 0.0.0.0, so `guard()` runs before routing for every request that is
// not local. Without a session such a request only reaches the pairing page (/p, POST /api/pair, GET /m), public
// static code (css/js/icons/memes/vendor/models/docs, manifest, sw.js) and a minimal /health. The OBS overlay on
// another PC uses the overlay key (`overlay.html?key=<k>`, read-only: overlay page, overlay events, uploaded assets).
//
// Order of checks in requireAuth: a valid Bearer always wins. Without one, a disallowed Host is a
// 403 `bad_host` (DNS-rebinding guard) and everything else that is not authorised is a 401.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { HttpError } = require('./router');

const TOKEN_FILE = 'token.txt';
const COOKIE_NAME = 'livefx';
const DEVICE_COOKIE = 'livefx_dev';
const OVERLAY_COOKIE = 'livefx_ov';
const TOKEN_RE = /^[A-Za-z0-9._~+/=-]{8,256}$/;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6_RE = /^[0-9a-f:.]+$/i; // bracket-stripped literal like ::1 or fe80::1%eth0 (zone removed below)
const TUNNEL_HOST_RE = /\.trycloudflare\.com$/i;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Returns the configured token or creates `<dataDir>/token.txt` (32 hex chars, mode 0600). */
function loadOrCreateToken({ dataDir, log = () => {} }) {
  const fromEnv = typeof process.env.LIVEFX_TOKEN === 'string' ? process.env.LIVEFX_TOKEN.trim() : '';
  if (fromEnv) {
    log('auth: Token aus LIVEFX_TOKEN');
    return fromEnv;
  }
  const file = path.join(dataDir, TOKEN_FILE);
  try {
    const existing = fs.readFileSync(file, 'utf8').trim();
    if (TOKEN_RE.test(existing)) {
      log(`auth: Token aus ${file}`);
      return existing;
    }
    if (existing) log(`auth: ${file} enthält keinen gültigen Token – wird neu erzeugt`);
  } catch (e) {
    if (e.code !== 'ENOENT') log(`auth: ${file} nicht lesbar (${e.message}) – wird neu erzeugt`);
  }
  const token = crypto.randomBytes(16).toString('hex');
  fs.mkdirSync(dataDir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${token}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
  try {
    fs.chmodSync(file, 0o600);
  } catch (_) {
    /* best effort (Windows) */
  }
  log(`auth: neuer API-Token erzeugt und gespeichert in ${file}`);
  return token;
}

/** Host header without the port and without IPv6 brackets, lower-cased. '' when missing. */
function hostName(req) {
  const raw = String((req && req.headers && req.headers.host) || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.startsWith('[')) {
    const end = raw.indexOf(']');
    return end === -1 ? '' : raw.slice(1, end);
  }
  const colon = raw.indexOf(':');
  // A bare IPv6 literal (no brackets, more than one colon) has no port to strip.
  if (colon !== -1 && raw.indexOf(':', colon + 1) === -1) return raw.slice(0, colon);
  return raw;
}

function isIpLiteral(host) {
  if (IPV4_RE.test(host)) return host.split('.').every((n) => Number(n) <= 255);
  const noZone = host.replace(/%.*$/, '');
  return noZone.includes(':') && IPV6_RE.test(noZone);
}

function allowedHosts() {
  return String(process.env.LIVEFX_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/** True when the Host header names this machine (or a host the operator explicitly allowed). */
function hostAllowed(req) {
  const host = hostName(req);
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  if (isIpLiteral(host)) return true;
  return allowedHosts().includes(host);
}

function bearerOk(req, token) {
  const header = String((req && req.headers && req.headers.authorization) || '');
  const m = /^Bearer\s+(\S+)\s*$/i.exec(header);
  if (!m || typeof token !== 'string' || !token) return false;
  const a = Buffer.from(m[1], 'utf8');
  const b = Buffer.from(token, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sameOrigin(req) {
  const h = req.headers || {};
  if (String(h['sec-fetch-site'] || '').toLowerCase() === 'same-origin') return true;
  const origin = String(h.origin || '').trim().toLowerCase();
  const host = String(h.host || '').trim().toLowerCase();
  if (!origin || !host) return false;
  return origin === `http://${host}` || origin === `https://${host}`;
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** Value of cookie `name` ('' when absent). */
function readCookie(req, name) {
  const raw = String((req && req.headers && req.headers.cookie) || '');
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

/** Legacy panel cookie `livefx=<token>` (index.html sets it for local requests only, see server.js). */
function cookieOk(req, token) {
  const raw = String((req.headers && req.headers.cookie) || '');
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === COOKIE_NAME && safeEqual(rest.join('='), token)) return true;
  }
  return false;
}

function isLoopback(req) {
  const ra = req && req.socket && req.socket.remoteAddress;
  return ra === '127.0.0.1' || ra === '::1' || ra === '::ffff:127.0.0.1';
}

function tunnelHostOf(req) {
  const raw = String((req && req.headers && req.headers.host) || '').trim().toLowerCase();
  const colon = raw.lastIndexOf(':');
  return colon !== -1 && !raw.startsWith('[') && raw.indexOf(':') === colon ? raw.slice(0, colon) : raw.replace(/^\[|\].*$/g, '');
}

/** True when this request came in through the internet tunnel (Host *.trycloudflare.com or a cf-connecting-ip header). */
function viaTunnel(req) {
  const h = (req && req.headers) || {};
  return TUNNEL_HOST_RE.test(tunnelHostOf(req)) || typeof h['cf-connecting-ip'] === 'string';
}

/** The PC itself: loopback socket and not forwarded by cloudflared (which also connects from 127.0.0.1). */
function isLocal(req) {
  return isLoopback(req) && !viaTunnel(req);
}

/**
 * Address for rate limits. Through the tunnel every request comes from 127.0.0.1, so the visitor's address is
 * taken from `cf-connecting-ip` – trusted only in exactly that case (loopback socket = our own cloudflared).
 */
function clientAddress(req) {
  const ra = String((req && req.socket && req.socket.remoteAddress) || 'unknown');
  if (isLoopback(req) && viaTunnel(req)) {
    const cf = String((req.headers && req.headers['cf-connecting-ip']) || '').trim();
    if (cf && cf.length <= 64 && /^[0-9a-f:.]+$/i.test(cf)) return `cf:${cf.toLowerCase()}`;
    return 'tunnel';
  }
  return ra;
}

function isSafeMethod(req) {
  return SAFE_METHODS.has(String((req && req.method) || '').toUpperCase());
}

function ctxOf(tokenOrCtx) {
  if (typeof tokenOrCtx === 'string') return { token: tokenOrCtx };
  return tokenOrCtx || {};
}

/** Paired device for this request (server/pairing.js), or null. */
function deviceOf(req, ctx) {
  const p = ctx && ctx.pairing;
  return p && typeof p.deviceFromRequest === 'function' ? p.deviceFromRequest(req) : null;
}

/** A session cookie: paired device or the legacy panel cookie. */
function sessionOk(req, tokenOrCtx) {
  const ctx = ctxOf(tokenOrCtx);
  return !!deviceOf(req, ctx) || cookieOk(req, ctx.token);
}

/** Read-only key for an OBS overlay on another PC; derived from the token, so rotating the token rotates it. */
function overlayKeyFor(token) {
  if (typeof token !== 'string' || !token) return '';
  return crypto.createHmac('sha256', token).update('livefx-overlay-key-v1').digest('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
}

/** Overlay key from the `key` query parameter or the overlay cookie; returns 'query' | 'cookie' | ''. */
function overlayKeySource(req, ctx, url) {
  const expected = (ctx && ctx.overlayKey) || overlayKeyFor(ctx && ctx.token);
  if (!expected) return '';
  const q = url && url.searchParams ? url.searchParams.get('key') : null;
  if (q && safeEqual(q, expected)) return 'query';
  if (safeEqual(readCookie(req, OVERLAY_COOKIE), expected)) return 'cookie';
  return '';
}

function overlayCookieHeader(key, { secure = false } = {}) {
  return `${OVERLAY_COOKIE}=${key}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${secure ? '; Secure' : ''}`;
}

/**
 * Bearer token (constant-time), or the PC itself with a same-origin signal, or – for any other device – a session
 * cookie (paired device or legacy panel cookie) plus, for writes, a same-origin signal. A request without a method is
 * judged like a write. `sec-fetch-site`/`Origin` alone are forgeable by non-browser clients, so off-host they are
 * never sufficient on their own. Accepts the token string (legacy) or a ctx `{ token, pairing }`.
 */
function isAuthorized(req, tokenOrCtx) {
  const ctx = ctxOf(tokenOrCtx);
  if (bearerOk(req, ctx.token)) return true;
  if (!hostAllowed(req)) return false;
  if (isLocal(req)) return sameOrigin(req);
  if (!sessionOk(req, ctx)) return false;
  return isSafeMethod(req) || sameOrigin(req);
}

/** Wraps a route handler; runs before the body is read, so unauthenticated bodies are never parsed. */
function requireAuth(handler) {
  return async function authed(req, res, ctx) {
    if (!bearerOk(req, ctx && ctx.token)) {
      if (!hostAllowed(req)) throw new HttpError(403, 'bad_host', 'Host-Header nicht erlaubt (LIVEFX_ALLOWED_HOSTS setzen)');
      if (isLocal(req)) {
        if (!sameOrigin(req)) throw new HttpError(401, 'unauthorized', 'Bearer-Token oder Same-Origin-Aufruf nötig');
      } else {
        if (!sessionOk(req, ctx)) throw new HttpError(401, 'unauthorized', 'Dieses Gerät ist nicht gekoppelt – im Panel „📱 Handy“ den QR-Code scannen (oder Bearer-Token senden)');
        if (!isSafeMethod(req) && !sameOrigin(req)) throw new HttpError(401, 'unauthorized', 'Same-Origin-Aufruf nötig (Origin passt nicht zum Host)');
      }
    }
    return handler(req, res, ctx);
  };
}

// ---------- guard for requests that are not local ----------

// Public without a session (GET/HEAD): pairing page, legacy phone handshake, health, PWA files and static code.
const OPEN_GET_RE = /^\/(?:p\/?|m|health|favicon\.ico|manifest\.webmanifest|sw\.js|(?:css|js|icons|memes|vendor|models|docs)\/.+)$/;
const OPEN_POST = new Set(['/api/pair']);
// HTML pages that need a session: an unpaired device is sent to the pairing page instead.
const PAGE_NEXT = new Map([
  ['/', 'panel'],
  ['/index.html', 'panel'],
  ['/mobile.html', ''],
  ['/camera.html', 'camera'],
  ['/demo.html', 'panel'],
]);

const PHONE_UA_RE = /iPhone|iPod|Android.*Mobile|Windows Phone/i;

function overlayPath(pathname, url) {
  if (pathname === '/overlay.html' || pathname.startsWith('/assets/')) return true;
  return pathname === '/events' && !(url && url.searchParams && url.searchParams.get('role') === 'panel');
}

function parseUrl(req) {
  try {
    return new URL(String((req && req.url) || '/'), 'http://x');
  } catch (_) {
    return new URL('http://x/');
  }
}

/**
 * Access decision for one request: `{ action: 'pass', level: 'local' | 'full' | 'open' | 'overlay', device?, setCookie? }`,
 * `{ action: 'redirect', location }` or `{ action: 'deny', status, code, message, html? }`.
 * Local requests always pass (unchanged 2.2 behaviour); requireAuth still checks the routes that need it.
 */
function decide(req, ctx = {}) {
  if (isLocal(req)) return { action: 'pass', level: 'local' };
  const url = parseUrl(req);
  const pathname = url.pathname;
  const method = String(req.method || 'GET').toUpperCase();
  const safe = method === 'GET' || method === 'HEAD';
  if (bearerOk(req, ctx.token)) return { action: 'pass', level: 'full' };
  const device = deviceOf(req, ctx);
  if (device || cookieOk(req, ctx.token)) return { action: 'pass', level: 'full', device: device || null };
  if (safe && OPEN_GET_RE.test(pathname)) return { action: 'pass', level: 'open' };
  if (method === 'POST' && OPEN_POST.has(pathname)) return { action: 'pass', level: 'open' };
  if (safe && overlayPath(pathname, url)) {
    const src = overlayKeySource(req, ctx, url);
    if (src) {
      const key = ctx.overlayKey || overlayKeyFor(ctx.token);
      return { action: 'pass', level: 'overlay', setCookie: src === 'query' ? overlayCookieHeader(key, { secure: viaTunnel(req) }) : null };
    }
  }
  const tunnel = viaTunnel(req);
  if (safe && PAGE_NEXT.has(pathname)) {
    let next = PAGE_NEXT.get(pathname);
    // A phone opening the panel address (or the home-screen app, start_url "/") gets the phone remote after pairing.
    if (next === 'panel' && PHONE_UA_RE.test(String(req.headers['user-agent'] || ''))) next = '';
    return { action: 'redirect', location: next ? `/p?next=${next}` : '/p' };
  }
  if (safe && pathname === '/overlay.html') {
    return {
      action: 'deny',
      status: 401,
      code: 'overlay_key',
      message: 'Overlay-Schlüssel fehlt: im Panel die OBS-Adresse „für einen anderen PC“ kopieren (…/overlay.html?key=…).',
      html: true,
    };
  }
  return {
    action: 'deny',
    status: 401,
    code: tunnel ? 'tunnel_login' : 'pairing_required',
    message: tunnel
      ? 'Über das Internet bitte zuerst koppeln: im Panel „📱 Handy“ → Internet-Link → QR-Code scannen.'
      : 'Dieses Gerät ist nicht gekoppelt – im Panel „📱 Handy“ den QR-Code scannen (oder /p öffnen und den 6-stelligen Code eingeben).',
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/**
 * Runs `decide()` and answers redirects / denials itself. Returns the decision when the request may continue
 * (and sets the overlay cookie / touches the device), null when the response was already sent.
 */
function guard(req, res, ctx = {}) {
  const d = decide(req, ctx);
  if (d.action === 'pass') {
    if (d.setCookie) res.setHeader('set-cookie', d.setCookie);
    if (d.device && ctx.pairing && typeof ctx.pairing.touch === 'function') ctx.pairing.touch(d.device);
    return d;
  }
  if (d.action === 'redirect') {
    res.writeHead(302, { location: d.location, 'cache-control': 'no-store', 'content-length': 0 });
    res.end();
    return null;
  }
  if (d.html) {
    const body = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LiveFX – Overlay-Schlüssel fehlt</title></head><body style="margin:0;font:600 22px/1.4 system-ui,sans-serif;color:#fff"><div style="margin:24px;padding:18px 22px;background:rgba(15,17,21,.85);border-radius:14px;max-width:760px">⚠️ LiveFX: ${escapeHtml(d.message)}</div></body></html>`;
    res.writeHead(d.status, { 'content-type': 'text/html; charset=utf-8', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
    return null;
  }
  const body = JSON.stringify({ ok: false, error: d.code, message: d.message });
  res.writeHead(d.status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store' });
  res.end(req.method === 'HEAD' ? undefined : body);
  return null;
}

function cookieHeader(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/`;
}

function register() {
  /* no routes of its own */
}

module.exports = {
  loadOrCreateToken,
  hostAllowed,
  isAuthorized,
  requireAuth,
  register,
  cookieHeader,
  cookieOk,
  sessionOk,
  isLoopback,
  isLocal,
  viaTunnel,
  clientAddress,
  sameOrigin,
  bearerOk,
  overlayKeyFor,
  overlayCookieHeader,
  decide,
  guard,
  readCookie,
  COOKIE_NAME,
  DEVICE_COOKIE,
  OVERLAY_COOKIE,
  TUNNEL_HOST_RE,
};
