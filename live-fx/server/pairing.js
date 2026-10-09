// LiveFX – phone pairing (2.3): short-lived single-use pairing codes and long-lived, revocable device cookies.
//
//   create()                     → { id, code: '123456', secret, createdAt, expiresAt }   (10 min, single use)
//   current({ minRemainingMs })  → the newest open code with enough time left, else a fresh one
//   redeem({ secret | code, … }) → { ok, device, cookieValue } | { ok: false, reason: invalid | expired | used | locked }
//   mintDevice({ … })            → { device, cookieValue }   (legacy `/m?token=` link, server/api-mobile.js)
//   deviceFromRequest(req)       → device | null  (cookie `livefx_dev=<id>.<secret>`)
//   listDevices() / revoke(id) / revokeAll()
//
// The QR code carries only the pairing secret (`/p#<secret>`, URL fragment – never sent to a server log), the
// 6-digit code is the typed fallback. Redeeming either mints a device: random id + 32-byte secret, the cookie holds
// both, `<dataDir>/devices.json` keeps only the SHA-256 of the secret (mode 0600). The master token never goes into
// a cookie, a QR code or a link. Devices unused for 180 days expire; `revoke` takes effect on the next request.
//
// Brute force: a 6-digit code has 10^6 values. Besides the per-address limit in api-pairing.js (10 attempts/min),
// all open codes are burnt after MAX_GLOBAL_FAILURES wrong attempts (from any address) – a new QR is one click.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COOKIE_NAME = 'livefx_dev';
const DEVICES_FILE = 'devices.json';
const CODE_TTL_MS = 10 * 60 * 1000;
const DEVICE_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const COOKIE_MAX_AGE_S = Math.round(DEVICE_MAX_AGE_MS / 1000);
const MAX_OPEN_CODES = 20;
const MAX_DEVICES = 50;
const MAX_GLOBAL_FAILURES = 20;
const TOUCH_PERSIST_MS = 60 * 1000;
const COOKIE_RE = /^([A-Za-z0-9_-]{8,32})\.([A-Za-z0-9_-]{20,128})$/;
const SECRET_RE = /^[A-Za-z0-9_-]{16,128}$/;
const CODE_RE = /^\d{6}$/;

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || !a) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/** "iPhone · Safari", "Android · Chrome", "Windows-PC · Edge" … from a user-agent string (never the raw UA). */
function shortDeviceName(ua) {
  const s = String(ua || '');
  let os = 'Gerät';
  if (/iPhone/i.test(s)) os = 'iPhone';
  else if (/iPad/i.test(s)) os = 'iPad';
  else if (/Android/i.test(s)) os = /Mobile/i.test(s) ? 'Android' : 'Android-Tablet';
  else if (/CrOS/i.test(s)) os = 'Chromebook';
  else if (/Macintosh|Mac OS X/i.test(s)) os = 'Mac';
  else if (/Windows/i.test(s)) os = 'Windows-PC';
  else if (/Linux/i.test(s)) os = 'Linux';
  let browser = '';
  if (/EdgA?\/|EdgiOS\//.test(s)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(s)) browser = 'Opera';
  else if (/SamsungBrowser\//.test(s)) browser = 'Samsung Internet';
  else if (/Firefox\/|FxiOS\//.test(s)) browser = 'Firefox';
  else if (/CriOS\/|Chrome\//.test(s)) browser = 'Chrome';
  else if (/Safari\//.test(s)) browser = 'Safari';
  return browser ? `${os} · ${browser}` : os;
}

/** Trims a user-given device name: printable, max 40 chars; '' when nothing usable is left. */
function cleanName(name) {
  if (typeof name !== 'string') return '';
  return name
    .replace(/[\t\n\r]/g, ' ')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

function createPairing(opts = {}) {
  const { dataDir = null, log = () => {}, now = Date.now, ttlMs = CODE_TTL_MS, deviceMaxAgeMs = DEVICE_MAX_AGE_MS, maxDevices = MAX_DEVICES, onChange = null } = opts;
  const file = dataDir ? path.join(dataDir, DEVICES_FILE) : null;
  const codes = new Map(); // id -> { id, code, secretHash, createdAt, expiresAt, usedAt, deviceId, note }
  const devices = new Map(); // id -> { id, hash, name, ua, via, createdAt, lastSeen }
  const listeners = new Set(onChange ? [onChange] : []);
  let globalFailures = 0;
  let dirty = false;
  let lastPersist = 0;
  let persistTimer = null;

  function emit(event) {
    for (const fn of listeners) {
      try {
        fn(event);
      } catch (e) {
        log('pairing listener failed:', e.message);
      }
    }
  }

  // ---- persistence ----
  function load() {
    if (!file) return;
    let raw;
    try {
      raw = fs.readFileSync(file, 'utf8');
    } catch (e) {
      if (e.code !== 'ENOENT') log(`pairing: ${file} nicht lesbar (${e.message})`);
      return;
    }
    try {
      const data = JSON.parse(raw);
      const list = Array.isArray(data && data.devices) ? data.devices : [];
      for (const d of list) {
        if (!d || typeof d.id !== 'string' || typeof d.hash !== 'string' || !/^[a-f0-9]{64}$/.test(d.hash)) continue;
        devices.set(d.id, {
          id: d.id,
          hash: d.hash,
          name: cleanName(d.name) || 'Gerät',
          ua: String(d.ua || '').slice(0, 300),
          via: d.via === 'tunnel' ? 'tunnel' : d.via === 'local' ? 'local' : 'lan',
          createdAt: Number(d.createdAt) || now(),
          lastSeen: Number(d.lastSeen) || Number(d.createdAt) || now(),
        });
      }
    } catch (e) {
      const bak = `${file}.broken-${Date.now()}`;
      try {
        fs.renameSync(file, bak);
      } catch (_) {
        /* best effort */
      }
      log(`pairing: ${file} ist beschädigt (${e.message}) – gesichert als ${path.basename(bak)}, Geräte bitte neu koppeln`);
    }
    prune();
  }

  function persist() {
    dirty = false;
    lastPersist = now();
    if (!file) return;
    const body = JSON.stringify({ version: 1, devices: Array.from(devices.values()) }, null, 2);
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, `${body}\n`, { mode: 0o600 });
      fs.renameSync(tmp, file);
      try {
        fs.chmodSync(file, 0o600);
      } catch (_) {
        /* windows */
      }
    } catch (e) {
      log(`pairing: ${file} nicht speicherbar (${e.message})`);
    }
  }

  /** lastSeen changes are written at most once per TOUCH_PERSIST_MS (pair / revoke write at once). */
  function persistSoon() {
    dirty = true;
    if (persistTimer) return;
    const wait = Math.max(0, TOUCH_PERSIST_MS - (now() - lastPersist));
    persistTimer = setTimeout(() => {
      persistTimer = null;
      if (dirty) persist();
    }, wait);
    if (typeof persistTimer.unref === 'function') persistTimer.unref();
  }

  function flush() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    if (dirty) persist();
  }

  // ---- codes ----
  function prune() {
    const t = now();
    for (const [id, c] of codes) if (t - c.expiresAt > ttlMs) codes.delete(id); // keep a while for "expired"/"used" answers
    let removed = false;
    for (const [id, d] of devices) {
      if (t - d.lastSeen > deviceMaxAgeMs) {
        devices.delete(id);
        removed = true;
      }
    }
    if (removed) persist();
  }

  function openCodes() {
    const t = now();
    return Array.from(codes.values()).filter((c) => !c.usedAt && c.expiresAt > t);
  }

  function publicCode(c, secret) {
    return { id: c.id, code: c.code, secret, createdAt: c.createdAt, expiresAt: c.expiresAt, ttlMs };
  }

  function newCode() {
    const used = new Set(openCodes().map((c) => c.code));
    for (let i = 0; i < 50; i++) {
      const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      if (!used.has(code)) return code;
    }
    throw new Error('kein freier Kopplungscode');
  }

  /** New pairing code (single use, ttlMs). The secret is returned once and only its hash is kept. */
  function create({ note = '' } = {}) {
    prune();
    const open = openCodes().sort((a, b) => a.createdAt - b.createdAt);
    while (open.length >= MAX_OPEN_CODES) codes.delete(open.shift().id);
    const secret = b64url(crypto.randomBytes(16));
    const t = now();
    const c = { id: b64url(crypto.randomBytes(6)), code: newCode(), secretHash: sha256(secret), secret, createdAt: t, expiresAt: t + ttlMs, usedAt: 0, deviceId: null, note: String(note).slice(0, 40) };
    codes.set(c.id, c);
    return publicCode(c, secret);
  }

  /**
   * The newest open code that is still valid for at least `minRemainingMs` (so a panel that polls does not get a
   * new QR every few seconds), otherwise a fresh one. The secret of an open code stays in memory until it is used
   * or expires – it is needed to draw the same QR again.
   */
  function current({ minRemainingMs = 2 * 60 * 1000 } = {}) {
    prune();
    const t = now();
    const best = openCodes()
      .filter((c) => c.expiresAt - t >= minRemainingMs && c.secret)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    return best ? publicCode(best, best.secret) : create();
  }

  function burnOpenCodes() {
    let n = 0;
    for (const c of openCodes()) {
      codes.delete(c.id);
      n++;
    }
    return n;
  }

  // ---- devices ----
  function mintDevice({ name = '', userAgent = '', via = 'lan' } = {}) {
    prune();
    const secret = b64url(crypto.randomBytes(32));
    const t = now();
    const device = {
      id: b64url(crypto.randomBytes(9)),
      hash: sha256(secret),
      name: cleanName(name) || shortDeviceName(userAgent),
      ua: String(userAgent || '').slice(0, 300),
      via: via === 'tunnel' ? 'tunnel' : via === 'local' ? 'local' : 'lan',
      createdAt: t,
      lastSeen: t,
    };
    devices.set(device.id, device);
    if (devices.size > maxDevices) {
      const oldest = Array.from(devices.values()).sort((a, b) => a.lastSeen - b.lastSeen);
      while (devices.size > maxDevices) devices.delete(oldest.shift().id);
    }
    persist();
    emit({ event: 'paired', device: publicDevice(device) });
    return { device: publicDevice(device), cookieValue: `${device.id}.${secret}` };
  }

  /**
   * Redeems a pairing code by its secret (QR) or its 6 digits (typed). Wrong attempts count towards the global
   * limit; a device that already holds a valid cookie (`existing`) keeps its identity instead of a duplicate entry.
   */
  function redeem({ secret, code, name = '', userAgent = '', via = 'lan', existing = null } = {}) {
    prune();
    let c = null;
    if (typeof secret === 'string' && SECRET_RE.test(secret)) {
      const h = sha256(secret);
      for (const x of codes.values()) if (safeEqualHex(x.secretHash, h)) c = x;
    } else if (typeof code === 'string' && CODE_RE.test(code.trim())) {
      const digits = code.trim();
      const matches = Array.from(codes.values()).filter((x) => x.code === digits).sort((a, b) => b.createdAt - a.createdAt);
      c = matches.find((x) => !x.usedAt && x.expiresAt > now()) || matches[0] || null;
    }
    if (!c) {
      globalFailures++;
      if (globalFailures >= MAX_GLOBAL_FAILURES) {
        const n = burnOpenCodes();
        globalFailures = 0;
        log(`pairing: ${MAX_GLOBAL_FAILURES} falsche Kopplungsversuche – ${n} offene Codes ungültig gemacht (neuen QR-Code im Panel anzeigen)`);
        return { ok: false, reason: 'locked' };
      }
      return { ok: false, reason: 'invalid' };
    }
    if (c.usedAt) return { ok: false, reason: 'used' };
    if (c.expiresAt <= now()) return { ok: false, reason: 'expired' };
    c.usedAt = now();
    c.secret = null;
    globalFailures = 0;
    if (existing && devices.has(existing.id)) {
      const d = devices.get(existing.id);
      d.lastSeen = now();
      if (cleanName(name)) d.name = cleanName(name);
      c.deviceId = d.id;
      persist();
      emit({ event: 'paired', device: publicDevice(d), again: true });
      return { ok: true, device: publicDevice(d), cookieValue: null, again: true };
    }
    const minted = mintDevice({ name, userAgent, via });
    c.deviceId = minted.device.id;
    return { ok: true, device: minted.device, cookieValue: minted.cookieValue, again: false };
  }

  /** Device for a cookie value `<id>.<secret>`; null when unknown, revoked or expired. */
  function deviceFromCookie(value) {
    const m = COOKIE_RE.exec(String(value || ''));
    if (!m) return null;
    const d = devices.get(m[1]);
    if (!d) return null;
    if (!safeEqualHex(d.hash, sha256(m[2]))) return null;
    if (now() - d.lastSeen > deviceMaxAgeMs) {
      devices.delete(d.id);
      persist();
      return null;
    }
    return d;
  }

  function cookieValueFromRequest(req) {
    const raw = String((req && req.headers && req.headers.cookie) || '');
    for (const part of raw.split(';')) {
      const i = part.indexOf('=');
      if (i === -1) continue;
      if (part.slice(0, i).trim() === COOKIE_NAME) return part.slice(i + 1).trim();
    }
    return '';
  }

  /** Device for the request's `livefx_dev` cookie (memoised on the request object). */
  function deviceFromRequest(req) {
    if (!req) return null;
    if (Object.prototype.hasOwnProperty.call(req, '_livefxDevice')) return req._livefxDevice;
    const d = deviceFromCookie(cookieValueFromRequest(req));
    try {
      Object.defineProperty(req, '_livefxDevice', { value: d, enumerable: false, configurable: true });
    } catch (_) {
      /* frozen test object */
    }
    return d;
  }

  function touch(device) {
    if (!device || !devices.has(device.id)) return;
    const t = now();
    if (t - device.lastSeen < 5000) return;
    device.lastSeen = t;
    persistSoon();
  }

  function publicDevice(d) {
    return { id: d.id, name: d.name, via: d.via, createdAt: new Date(d.createdAt).toISOString(), lastSeen: new Date(d.lastSeen).toISOString() };
  }

  function listDevices(currentId = null) {
    prune();
    return Array.from(devices.values())
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .map((d) => ({ ...publicDevice(d), current: d.id === currentId }));
  }

  function revoke(id) {
    if (!devices.delete(String(id))) return false;
    persist();
    emit({ event: 'revoked', id: String(id) });
    return true;
  }

  function revokeAll() {
    const n = devices.size;
    devices.clear();
    burnOpenCodes();
    persist();
    if (n) emit({ event: 'revoked', id: '*' });
    return n;
  }

  function onChangeFn(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  load();

  return {
    create,
    current,
    redeem,
    mintDevice,
    deviceFromCookie,
    deviceFromRequest,
    touch,
    listDevices,
    revoke,
    revokeAll,
    flush,
    onChange: onChangeFn,
    get openCount() {
      return openCodes().length;
    },
    get deviceCount() {
      return devices.size;
    },
  };
}

/** Set-Cookie value for a device: HttpOnly, SameSite=Lax (the QR link is a top-level navigation), 180 days. */
function cookieHeader(value, { secure = false } = {}) {
  return `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE_S}${secure ? '; Secure' : ''}`;
}

function clearCookieHeader({ secure = false } = {}) {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? '; Secure' : ''}`;
}

module.exports = { createPairing, cookieHeader, clearCookieHeader, shortDeviceName, cleanName, COOKIE_NAME, CODE_TTL_MS, DEVICE_MAX_AGE_MS, MAX_GLOBAL_FAILURES, COOKIE_MAX_AGE_S };
