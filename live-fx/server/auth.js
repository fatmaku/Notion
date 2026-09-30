// LiveFX – authentication for mutating routes. See docs/CONTRACTS.md §4 "Auth".
//
// Two ways in:
//   1. `Authorization: Bearer <token>` – external tools (curl, Stream Deck, other ASR engines).
//      The token lives in LIVEFX_TOKEN or data/token.txt (created on first start).
//   2. Same-origin browser requests from an allowed Host (localhost, an IP literal, or a name listed in
//      LIVEFX_ALLOWED_HOSTS). Browsers never send the token; `sec-fetch-site: same-origin` or a matching
//      `Origin` header proves the request came from the panel served by this process.
//
// Order of checks in requireAuth: a valid Bearer always wins. Without one, a disallowed Host is a
// 403 `bad_host` (DNS-rebinding guard) and everything else that is not same-origin is a 401.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { HttpError } = require('./router');

const TOKEN_FILE = 'token.txt';
const COOKIE_NAME = 'livefx';
const TOKEN_RE = /^[A-Za-z0-9._~+/=-]{8,256}$/;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6_RE = /^[0-9a-f:.]+$/i; // bracket-stripped literal like ::1 or fe80::1%eth0 (zone removed below)

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

/** The panel receives the token as an HttpOnly cookie when index.html is served (see static.js). */
function cookieOk(req, token) {
  const raw = String((req.headers && req.headers.cookie) || '');
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === COOKIE_NAME && safeEqual(rest.join('='), token)) return true;
  }
  return false;
}

function isLoopback(req) {
  const ra = req.socket && req.socket.remoteAddress;
  return ra === '127.0.0.1' || ra === '::1' || ra === '::ffff:127.0.0.1';
}

function cookieHeader(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/`;
}

/**
 * Bearer token (constant-time) OR (allowed Host AND same-origin browser request AND the request
 * either comes from this machine or carries the panel cookie). `sec-fetch-site`/`Origin` alone are
 * forgeable by non-browser clients, so off-host they are never sufficient on their own.
 */
function isAuthorized(req, token) {
  if (bearerOk(req, token)) return true;
  return hostAllowed(req) && sameOrigin(req) && (isLoopback(req) || cookieOk(req, token));
}

/** Wraps a route handler; runs before the body is read, so unauthenticated bodies are never parsed. */
function requireAuth(handler) {
  return async function authed(req, res, ctx) {
    if (!bearerOk(req, ctx && ctx.token)) {
      if (!hostAllowed(req)) throw new HttpError(403, 'bad_host', 'Host-Header nicht erlaubt (LIVEFX_ALLOWED_HOSTS setzen)');
      if (!sameOrigin(req)) throw new HttpError(401, 'unauthorized', 'Bearer-Token oder Same-Origin-Aufruf nötig');
      if (!isLoopback(req) && !cookieOk(req, ctx && ctx.token)) throw new HttpError(401, 'unauthorized', 'Panel neu laden (Sitzungs-Cookie fehlt) oder Bearer-Token senden');
    }
    return handler(req, res, ctx);
  };
}

function register() {
  /* no routes of its own */
}

module.exports = { loadOrCreateToken, hostAllowed, isAuthorized, requireAuth, register, cookieHeader, cookieOk, isLoopback, COOKIE_NAME };
