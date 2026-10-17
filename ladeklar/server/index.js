#!/usr/bin/env node
// LADEKLAR server – Node.js 22, no dependencies.
//   node server/index.js                         start (PORT=8080, DATA_DIR=./data)
//   node server/index.js --demo-data             start and fill an empty database with the demo world
//   node server/index.js setup <email> <passwort> create the licensor account
//   node server/index.js reset-platform-password <email> <passwort>
//                                                new licensor password, two-factor login off, sessions end
// Env: PORT, HOST, DATA_DIR, BASE_URL (https://app.ladeklar.de), PUSH_SUBJECT (mailto:…),
//      PLATFORM_EMAIL + PLATFORM_PASSWORD (bootstrap), TRUST_PROXY=1 behind a reverse proxy,
//      TRUST_PROXY_HOPS (default 1): number of trusted proxies that append to X-Forwarded-For; the client
//      address is the entry that many places from the right (the left part is whatever the client sent).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createEngine, EngineError, VERSION, berlinDate, routeLabel, planOf } from '../core/engine.js';
import { statusText } from '../core/texts.js';
import { seedDemo } from '../core/seed.js';
import { createZip, exportFileName } from '../core/zip.js';
import { toCsv } from '../core/csv.js';
import { createSqlStore } from './sqlstore.js';
import { generateVapidKeys, sendPush } from './webpush.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

export function createServer(opts = {}) {
  const DATA_DIR = path.resolve(opts.dataDir || process.env.DATA_DIR || path.join(ROOT, 'data'));
  const BASE_URL = opts.baseUrl || process.env.BASE_URL || '';
  const SECURE = BASE_URL.startsWith('https://');
  const TRUST_PROXY = opts.trustProxy ?? process.env.TRUST_PROXY === '1';
  const PROXY_HOPS = Math.max(1, Math.floor(Number(opts.trustProxyHops ?? process.env.TRUST_PROXY_HOPS ?? 1)) || 1);
  const PUSH_SUBJECT = process.env.PUSH_SUBJECT || 'mailto:support@ladeklar.de';
  const log = opts.quiet ? () => {} : (...a) => console.log(new Date().toISOString(), ...a);
  fs.mkdirSync(path.join(DATA_DIR, 'files'), { recursive: true });

  const sql = createSqlStore(path.join(DATA_DIR, 'ladeklar.db'));
  let vapid = sql.kv.get('vapid');
  if (!vapid) { vapid = generateVapidKeys(); sql.kv.set('vapid', vapid); }

  let fixedNow = null;
  const clock = { set: (t) => { fixedNow = t; }, reset: () => { fixedNow = null; } };
  const now = opts.now || (() => fixedNow ?? Date.now());
  const hash = {
    make: (s) => { const salt = crypto.randomBytes(16); return 'scrypt$' + salt.toString('base64') + '$' + crypto.scryptSync(s, salt, 32, { N: 16384, r: 8, p: 1 }).toString('base64'); },
    verify: (s, stored) => {
      if (!stored || !stored.startsWith('scrypt$')) return false;
      const [, salt, h] = stored.split('$');
      const a = crypto.scryptSync(s, Buffer.from(salt, 'base64'), 32, { N: 16384, r: 8, p: 1 });
      const b = Buffer.from(h, 'base64');
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    },
  };

  // ---------- live events: SSE clients + web push ----------
  const clients = new Set(); // { res, user, tok (session token hash), hb }
  const pushLog = [];
  const sha256hex = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
  const engine = createEngine({
    store: sql.store, now, newId: () => crypto.randomBytes(12).toString('base64url'), hash,
    digest: sha256hex, token: () => crypto.randomBytes(18).toString('base64url'),
    onEvent: (evt) => {
      if (evt.type === 'fileRemoved') return unlinkFile(evt.tenantId, evt.fileId);
      if (evt.type === 'notify') {
        for (const c of [...clients]) if (c.user.id === evt.userId) sse(c, 'notify', evt.notification);
        deliverPush(evt.userId, evt.notification).catch((e) => log('push failed', e.message));
        return;
      }
      if (evt.type !== 'change') return;
      // C5: a company's events go to that company's users (drivers only what concerns them), all to the licensor
      for (const c of [...clients]) {
        const u = c.user;
        if (u.role !== 'platform') {
          if (!evt.tenantId || u.tenantId !== evt.tenantId) continue;
          if (u.role === 'driver' && !(evt.allDrivers || (evt.drivers || []).includes(u.id) || evt.col === 'tenants')) continue;
        }
        sse(c, 'change', { col: evt.col, id: evt.id });
      }
    },
  });
  // C6: before every write the session and the user's access are checked again; a stream without access ends
  function streamOk(c) {
    const s = sql.sessions.get.get(c.tok);
    const u = s && s.expires >= Date.now() ? engine.auth.actor(s.user_id) : null;
    if (!u || u.mustChangePassword) return false;
    c.user = u;
    return true;
  }
  function sse(c, event, data) {
    if (!streamOk(c)) return dropStream(c);
    try { c.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch { dropStream(c); }
  }
  function dropStream(c) {
    clients.delete(c);
    clearInterval(c.hb);
    try { c.res.end(); } catch { /* closed */ }
  }
  const closeStreams = (pred) => { for (const c of [...clients]) if (pred(c)) dropStream(c); };
  // C7: access ends → sessions, push subscriptions and live streams of that person end with it
  function endAccess(userId) {
    sql.sessions.delUser.run(userId);
    sql.push.delUser.run(userId);
    closeStreams((c) => c.user.id === userId);
  }
  // C10: the engine dropped a file record → delete the bytes
  const safeId = (s) => typeof s === 'string' && /^[\w-]{1,64}$/.test(s);
  const binPath = (tenantId, fileId) => path.join(DATA_DIR, 'files', tenantId, fileId + '.bin');
  function unlinkFile(tenantId, fileId) {
    if (safeId(tenantId) && safeId(fileId)) fs.rm(binPath(tenantId, fileId), { force: true }, (e) => { if (e) log('Datei löschen', e.message); });
  }
  async function deliverPush(userId, n) {
    const subs = sql.push.forUser.all(userId);
    if (!subs.length || !engine.auth.actor(userId)) return;
    const u = sql.store.get('users', userId);
    const t = u?.tenantId ? sql.store.get('tenants', u.tenantId) : null;
    const icon = t?.branding?.iconFileId ? `/api/files/${t.branding.iconFileId}` : '/web/icons/icon-192.png';
    const payload = { title: n.title, body: n.body, tag: n.deliveryId || n.id, deliveryId: n.deliveryId, priority: n.priority, icon, badge: '/web/icons/badge-96.png', url: n.deliveryId ? `/?d=${encodeURIComponent(n.deliveryId)}` : '/' };
    for (const s of subs) {
      try {
        const r = await (opts.sendPush || sendPush)({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { keys: vapid, subject: PUSH_SUBJECT, urgency: n.priority === 'high' ? 'high' : 'normal' });
        pushLog.push({ userId, endpoint: s.endpoint, status: r.status, title: n.title });
        if (pushLog.length > 200) pushLog.shift();
        if (r.gone) sql.push.del.run(s.endpoint);
      } catch (e) { log('push failed', e.message); }
    }
  }

  // ---------- bootstrap ----------
  if (opts.demoData || args.includes('--demo-data')) {
    if (!sql.store.find('users', { role: 'platform' }).length) {
      log('Fülle die leere Datenbank mit der Demo-Welt …');
      seedDemo({ engine, store: sql.store, clock, realNow: Date.now() });
    }
  }
  const pe = opts.platformEmail || process.env.PLATFORM_EMAIL, pp = opts.platformPassword || process.env.PLATFORM_PASSWORD;
  if (pe && pp && !sql.store.find('users', { role: 'platform' }).length) engine.setupPlatform({ email: pe, password: pp, name: 'Lizenzgeber' });

  // ---------- helpers ----------
  const COOKIE = 'lk_sid';
  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
  const unesc = (v) => { try { return decodeURIComponent(v); } catch { return v; } }; // a broken foreign cookie must not fail every request
  const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((x) => x[0]).map(([k, ...v]) => [k, unesc(v.join('='))]));
  // behind TRUST_PROXY the proxy appends the address it saw: count PROXY_HOPS entries from the right
  // (the leftmost entries are whatever the client sent and must not be trusted)
  const ip = (req) => {
    const xff = TRUST_PROXY && req.headers['x-forwarded-for'];
    if (!xff) return req.socket.remoteAddress;
    const list = String(xff).split(',').map((x) => x.trim()).filter(Boolean);
    return list[Math.max(0, list.length - PROXY_HOPS)] || req.socket.remoteAddress;
  };
  const sessionHash = (req) => { const tok = cookies(req)[COOKIE]; return tok ? sha(tok) : null; };
  function sessionUser(req) {
    const tok = cookies(req)[COOKIE];
    if (!tok) return null;
    const s = sql.sessions.get.get(sha(tok));
    if (!s || s.expires < Date.now()) return null;
    const u = engine.auth.actor(s.user_id);
    if (!u) { sql.sessions.del.run(sha(tok)); return null; }
    // sliding expiry, written at most once per hour
    const life = u.role === 'driver' ? 90 * 864e5 : 14 * 864e5;
    if (s.expires - Date.now() < life - 3600e3) sql.sessions.touch.run(Date.now() + life, s.token_hash);
    return u;
  }
  function startSession(res, user, req) {
    const tok = crypto.randomBytes(32).toString('base64url');
    const life = user.role === 'driver' ? 90 * 864e5 : 14 * 864e5;
    sql.sessions.create.run(sha(tok), user.id, Date.now(), Date.now() + life, String(req.headers['user-agent'] || '').slice(0, 160));
    res.setHeader('Set-Cookie', `${COOKIE}=${tok}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(life / 1000)}${SECURE ? '; Secure' : ''}`);
  }
  const clearSession = (res) => res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${SECURE ? '; Secure' : ''}`);

  const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
  function baseHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=(), payment=(), usb=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    if (SECURE) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  function json(res, status, data) {
    // an error after the headers went out (e.g. while streaming) can only end the connection
    if (res.headersSent) { try { res.destroy(); } catch { /* gone */ } return; }
    const body = JSON.stringify(data);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(body);
  }
  function fail(res, e) {
    if (e instanceof EngineError) return json(res, e.status || 400, { error: { code: e.code, message: e.message, details: e.details } });
    log('Fehler', e && e.stack || e);
    return json(res, 500, { error: { code: 'server', message: 'Interner Fehler. Bitte erneut versuchen.' } });
  }
  function readBody(req, limit) {
    if (Number(req.headers['content-length']) > limit) return Promise.reject(new EngineError('too_large', 'Die Datei ist zu groß.', 413));
    return new Promise((resolve, reject) => {
      const chunks = []; let size = 0;
      req.on('data', (c) => { size += c.length; if (size > limit) { reject(new EngineError('too_large', 'Die Datei ist zu groß.', 413)); req.destroy(); } else chunks.push(c); });
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }
  async function readJson(req) {
    const b = await readBody(req, 1e6);
    if (!b.length) return {};
    try { return JSON.parse(b.toString('utf8')); } catch { throw new EngineError('invalid', 'Ungültige Anfrage.', 400); }
  }
  // simple fixed-window rate limit per key
  const buckets = new Map();
  const pruneBuckets = () => { const t = Date.now(); for (const [k, b] of buckets) if (b.reset < t) buckets.delete(k); };
  function limited(key, max, windowMs) {
    const t = Date.now();
    if (buckets.size > 50000) pruneBuckets();
    const b = buckets.get(key);
    if (!b || b.reset < t) { buckets.set(key, { n: 1, reset: t + windowMs }); return false; }
    b.n++; return b.n > max;
  }

  // ---------- static files ----------
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.pdf': 'application/pdf' };
  const staticCache = new Map();
  function serveFile(req, res, file, { cache = 'no-cache', transform } = {}) {
    let st;
    try { st = fs.statSync(file); } catch { return false; }
    if (!st.isFile()) return false;
    const ext = path.extname(file);
    const key = file + ':' + st.mtimeMs + (transform ? ':t' + transform.key : '');
    let entry = staticCache.get(key);
    if (!entry) {
      let buf = fs.readFileSync(file);
      if (transform) buf = Buffer.from(transform.fn(buf.toString('utf8')));
      const etag = '"' + crypto.createHash('sha1').update(buf).digest('base64url').slice(0, 20) + '"';
      const gz = /\.(html|js|css|json|svg|webmanifest|txt)$/.test(ext) && buf.length > 1024 ? zlib.gzipSync(buf) : null;
      entry = { buf, gz, etag };
      staticCache.set(key, entry);
    }
    if (req.headers['if-none-match'] === entry.etag) { res.writeHead(304, { ETag: entry.etag }); res.end(); return true; }
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache, ETag: entry.etag };
    if (ext === '.html') headers['Content-Security-Policy'] = CSP;
    const useGz = entry.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    if (useGz) { headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'; }
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : useGz ? entry.gz : entry.buf);
    return true;
  }
  const safeJoin = (base, rel) => { const p = path.normalize(path.join(base, rel)); return p.startsWith(base + path.sep) ? p : null; };

  // tenant from the Host header (subdomain or custom domain) or from /t/<code>
  function tenantForHost(host) {
    const h = String(host || '').split(':')[0].toLowerCase();
    const custom = sql.store.find('tenants', {}).find((t) => (t.domains || []).includes(h));
    if (custom) return planOf(custom).domain === 'custom' ? custom.code : null;
    // <code>.ladeklar.de only for plans with a subdomain (C15: Start has none)
    const m = /^([a-z0-9-]+)\.ladeklar\.(de|app)$/.exec(h);
    if (!m || ['app', 'www', 'demo'].includes(m[1])) return null;
    const t = sql.store.find('tenants', { code: m[1].toUpperCase() })[0];
    return t && planOf(t).domain !== 'none' ? t.code : null;
  }
  function indexHtml(req, res, code) {
    const t = code ? engine.auth.publicTenant(code) : null;
    const manifest = t ? `/m/${encodeURIComponent(t.code)}/manifest.webmanifest` : '/manifest.webmanifest';
    const title = t ? t.branding?.appName || t.name : 'Ladeklar';
    return serveFile(req, res, path.join(ROOT, 'web', 'index.html'), {
      transform: {
        key: (t?.code || '-') + (t?.branding?.color || '') + title,
        fn: (html) => html
          .replace('href="/manifest.webmanifest"', `href="${manifest}"`)
          .replace(/<title>[^<]*<\/title>/, `<title>${title.replace(/[<>&"]/g, '')}</title>`)
          .replace('<meta name="lk-tenant" content="">', `<meta name="lk-tenant" content="${t ? t.code : ''}">`)
          .replace(/<meta name="theme-color" content="[^"]*">/, `<meta name="theme-color" content="${t?.branding?.color || '#0b1622'}">`),
      },
    });
  }
  function tenantManifest(res, code) {
    const t = engine.auth.publicTenant(code);
    if (!t) return json(res, 404, { error: { code: 'not_found' } });
    const icon = t.branding?.iconFileId;
    const icons = icon
      ? [{ src: `/api/files/${icon}`, sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: `/api/files/${icon}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }]
      : [{ src: '/web/icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/web/icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/web/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }];
    res.writeHead(200, { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify({
      id: `/t/${t.code}`, name: t.branding?.appName || t.name, short_name: (t.branding?.appName || t.name).slice(0, 14),
      start_url: `/t/${t.code}?pwa=1`, scope: '/', display: 'standalone', orientation: 'any',
      background_color: '#0b1622', theme_color: t.branding?.color || '#0b1622', lang: 'de', icons,
    }));
  }

  // ---------- CSV export ----------
  // BOM for Excel; cells starting with = + - @ are neutralised in core/csv.js (CSV injection)
  const csv = (rows) => '\ufeff' + toCsv(rows);
  const fmt = (ms) => (ms ? new Date(ms).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) : '');
  function deliveriesCsv(actor) {
    const ds = engine.call(actor, 'listDeliveries', { tab: 'all', limit: 0 }); // every delivery, newest first (C4)
    const head = ['Buchungsnummer', 'Status', 'Auftraggeber', 'Referenz', 'Route', 'Ladeort', 'Ladedatum', 'Entladeort', 'Entladedatum', 'Fahrer', 'Kennzeichen', 'Auflieger', 'Ware', 'Paletten', 'Gewicht kg', 'Standzeit min', 'Empfänger', 'Lieferscheine', 'Zugestellt am'];
    return csv([head, ...ds.map((d) => [d.bookingNo, statusText('de', d.status), d.customer, d.reference, routeLabel(d), [d.pickup.place, d.pickup.street, d.pickup.zip, d.pickup.city].filter(Boolean).join(', '), d.pickup.date, [d.dropoff.place, d.dropoff.street, d.dropoff.zip, d.dropoff.city].filter(Boolean).join(', '), d.dropoff.date, d.driverName, d.vehiclePlate, d.trailerPlate, d.goods?.text, d.goods?.pallets, d.goods?.weightKg, d.waitingMinutes, d.receiver, (d.docs || []).filter((x) => x.kind === 'pod').length, d.status === 'delivered' ? fmt(d.deliveredAt || d.updatedAt) : ''])]);
  }

  // ---------- request handler ----------
  async function handle(req, res) {
    const t0 = Date.now();
    let url;
    try { url = new URL(req.url, 'http://x'); } catch { res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Ungültige Anfrage'); }
    const p = url.pathname;
    baseHeaders(res);
    res.on('finish', () => { if (!p.startsWith('/web/') && p !== '/api/events') log(req.method, p, res.statusCode, Date.now() - t0 + 'ms'); });
    req.on('error', () => { /* client went away */ });
    res.on('error', () => { /* client went away */ });

    try {
      // ---- API ----
      if (p.startsWith('/api/')) {
        if (req.method === 'POST' && !p.startsWith('/api/v1/') && req.headers['x-ladeklar'] !== '1') return json(res, 403, { error: { code: 'csrf', message: 'Ungültige Anfrage.' } });

        if (p === '/api/health') return json(res, 200, { ok: true, version: VERSION, time: Date.now() });

        if (p === '/api/auth/login' && req.method === 'POST') {
          if (limited('login:' + ip(req), 20, 60e3)) return json(res, 429, { error: { code: 'rate', message: 'Zu viele Versuche. Bitte eine Minute warten.' } });
          const b = await readJson(req);
          // C13: the 6-digit code goes along; without it a 2FA account answers need_2fa
          const u = engine.auth.login({ email: b.email, password: b.password, code: b.code }, { ip: ip(req) });
          startSession(res, u, req);
          return json(res, 200, { user: u });
        }
        if ((p === '/api/auth/driver' || p === '/api/auth/invite') && req.method === 'POST') {
          if (limited('login:' + ip(req), 20, 60e3)) return json(res, 429, { error: { code: 'rate', message: 'Zu viele Versuche. Bitte eine Minute warten.' } });
          const b = await readJson(req);
          const u = p === '/api/auth/invite' ? engine.auth.inviteLogin(b, { ip: ip(req) }) : engine.auth.driverLogin(b, { ip: ip(req) });
          startSession(res, u, req);
          return json(res, 200, { user: u });
        }
        if (p === '/api/auth/logout' && req.method === 'POST') {
          const th = sessionHash(req);
          if (th) { sql.sessions.del.run(th); closeStreams((c) => c.tok === th); }
          clearSession(res);
          return json(res, 200, { ok: true });
        }
        if (p.startsWith('/api/public/tenant/')) {
          const t = engine.auth.publicTenant(decodeURIComponent(p.slice(19)));
          return t ? json(res, 200, t) : json(res, 404, { error: { code: 'not_found', message: 'Firmencode unbekannt.' } });
        }
        if (p.startsWith('/api/public/invite/')) {
          if (limited('invite:' + ip(req), 60, 60e3)) return json(res, 429, { error: { code: 'rate', message: 'Zu viele Versuche. Bitte eine Minute warten.' } });
          const i = engine.auth.inviteInfo(decodeURIComponent(p.slice(19)));
          return i ? json(res, 200, i) : json(res, 404, { error: { code: 'not_found', message: 'Einladung ungültig.' } });
        }

        // ---- REST API v1 for integrations (Premium, API key) ----
        if (p.startsWith('/api/v1/')) {
          const key = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
          const actor = engine.apiActor(key);
          if (!actor) return json(res, 401, { error: { code: 'unauthorized', message: 'API-Schlüssel fehlt oder ist ungültig.' } });
          if (limited('api:' + actor.tenantId, 600, 60e3)) return json(res, 429, { error: { code: 'rate', message: 'Zu viele Anfragen.' } });
          const m = /^\/api\/v1\/deliveries(?:\/([\w-]+))?$/.exec(p);
          if (!m) return json(res, 404, { error: { code: 'not_found' } });
          if (req.method === 'GET' && m[1]) return json(res, 200, engine.call(actor, 'getDelivery', { id: m[1] }));
          if (req.method === 'GET') {
            // newest first (C4); paging with offset/limit (max 1000) and updatedSince (ms or ISO date) for syncs (list-1)
            const sp = url.searchParams;
            const int = (k, d, max) => { const v = Number(sp.get(k)); return sp.get(k) != null && Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), max) : d; };
            const since = sp.get('updatedSince'), sinceMs = since ? (/^\d+$/.test(since) ? Number(since) : Date.parse(since)) : NaN;
            let list = engine.call(actor, 'listDeliveries', { tab: sp.get('tab') || 'all', q: sp.get('q') || '', limit: 0 });
            if (Number.isFinite(sinceMs)) list = list.filter((d) => (d.updatedAt || 0) > sinceMs);
            const offset = int('offset', 0, Number.MAX_SAFE_INTEGER), limit = int('limit', 300, 1000) || 300;
            res.setHeader('X-Total-Count', String(list.length));
            return json(res, 200, list.slice(offset, offset + limit));
          }
          if (req.method === 'POST' && !m[1]) return json(res, 201, engine.call(actor, 'createDelivery', await readJson(req)));
          if (req.method === 'PATCH' && m[1]) return json(res, 200, engine.call(actor, 'updateDelivery', { ...(await readJson(req)), id: m[1] }));
          return json(res, 405, { error: { code: 'method' } });
        }

        const user = sessionUser(req);
        const sid = user ? sessionHash(req) : null;
        // with a start password only the session, the own-password call and logout work (sec-12);
        // logos and icons stay public (login screen, manifest)
        const fresh = !!user?.mustChangePassword;

        if (p.startsWith('/api/files/') && req.method === 'GET') {
          const id = decodeURIComponent(p.slice(11));
          const f = engine.canReadFile(fresh ? null : user, id);
          if (!f) return json(res, 404, { error: { code: 'not_found', message: 'Datei nicht gefunden.' } });
          const buf = await fileBytes(f);
          if (!buf) return json(res, 404, { error: { code: 'not_found', message: 'Datei nicht gefunden.' } });
          const pub = ['logo', 'icon'].includes(f.kind);
          res.writeHead(200, {
            'Content-Type': f.mime, 'Content-Length': buf.length, 'Cache-Control': pub ? 'public, max-age=86400' : 'private, max-age=3600',
            'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox", 'Content-Disposition': `inline; filename="${encodeURIComponent(f.name || f.id)}"`,
          });
          return res.end(buf);
        }

        if (!user) return json(res, 401, { error: { code: 'unauthorized', message: 'Bitte anmelden.' } });
        if (fresh && !(p === '/api/session' || p.startsWith('/api/call/') || p === '/api/push/key' || p === '/api/push/unsubscribe')) return json(res, 403, { error: { code: 'password_change', message: 'Bitte zuerst ein eigenes Passwort vergeben.' } });

        if (p === '/api/session') return json(res, 200, engine.call(user, 'me', {}));

        if (p.startsWith('/api/call/') && req.method === 'POST') {
          const name = p.slice(10);
          if (name === 'createFile') return json(res, 400, { error: { code: 'invalid', message: 'Dateien bitte über /api/files hochladen.' } });
          const b = await readJson(req);
          const out = engine.call(user, name, b, { ip: ip(req) });
          // C7: sessions, push subscriptions and live streams end together with the access
          if (name === 'changePassword') {
            // the other devices sign in again; this device keeps its session and subscribes to push again
            sql.sessions.delOthers.run(user.id, sid);
            sql.push.delUser.run(user.id);
            closeStreams((c) => c.user.id === user.id && c.tok !== sid);
          }
          if (name === 'setUserActive' && out && out.active === false) endAccess(out.id);
          if (name === 'resetSecret' || name === 'resetTenantAdmin') endAccess(out.user.id);
          if (name === 'deleteUser') endAccess(out.id);
          if (name === 'deleteTenant') {
            for (const id of out.userIds) endAccess(id);
            if (safeId(out.tenantId)) await fs.promises.rm(path.join(DATA_DIR, 'files', out.tenantId), { recursive: true, force: true });
            return json(res, 200, { ok: true, users: out.userIds.length, files: out.fileIds.length });
          }
          return json(res, 200, out ?? null);
        }

        if (p === '/api/files' && req.method === 'POST') {
          if (!safeId(user.tenantId)) return json(res, 403, { error: { code: 'forbidden', message: 'Dafür fehlt die Berechtigung.' } });
          if (limited('upload:' + user.id, 30, 60e3)) return json(res, 429, { error: { code: 'rate', message: 'Zu viele Uploads. Bitte eine Minute warten.' } });
          const mime = String(req.headers['content-type'] || '').split(';')[0];
          const buf = await readBody(req, 15e6);
          const sniff = sniffMime(buf);
          if (!sniff || sniff !== mime) return json(res, 400, { error: { code: 'invalid', message: 'Erlaubt sind Fotos (JPG, PNG, WebP) und PDF.' } });
          // the bytes go to a temporary file first (no blocking write); renamed once the record exists
          const dir = path.join(DATA_DIR, 'files', user.tenantId);
          const tmp = path.join(dir, crypto.randomBytes(9).toString('base64url') + '.part');
          await fs.promises.mkdir(dir, { recursive: true });
          await fs.promises.writeFile(tmp, buf);
          let f;
          try { f = engine.call(user, 'createFile', { kind: url.searchParams.get('kind'), mime, size: buf.length, name: url.searchParams.get('name'), deliveryId: url.searchParams.get('deliveryId') || null, _op: url.searchParams.get('op') || undefined }); } // C1: a replayed upload (same op) is not stored twice
          catch (e) { await fs.promises.rm(tmp, { force: true }).catch(() => {}); throw e; }
          fs.renameSync(tmp, binPath(f.tenantId, f.id));
          return json(res, 200, f);
        }

        if (p === '/api/events' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
          res.write('retry: 4000\n\n');
          const c = { res, user, tok: sid, hb: null };
          c.hb = setInterval(() => { if (!streamOk(c)) return dropStream(c); try { res.write(': ping\n\n'); } catch { dropStream(c); } }, 25e3);
          clients.add(c);
          sse(c, 'hello', { at: Date.now() });
          req.on('close', () => dropStream(c));
          res.on('close', () => dropStream(c));
          return;
        }

        if (p === '/api/push/key') return json(res, 200, { publicKey: vapid.publicKey });
        if (p === '/api/push/subscribe' && req.method === 'POST') {
          const b = await readJson(req);
          const key = (k) => typeof k === 'string' && /^[\w-]{1,200}=*$/.test(k);
          if (!pushEndpointOk(b?.endpoint) || !key(b.keys?.p256dh) || !key(b.keys?.auth)) return json(res, 400, { error: { code: 'invalid', message: 'Ungültiges Push-Abo.' } });
          sql.push.upsert.run(b.endpoint, user.id, b.keys.p256dh, b.keys.auth, Date.now());
          sql.push.trim.run(user.id, user.id, PUSH_MAX); // the oldest devices go first
          return json(res, 200, { ok: true });
        }
        if (p === '/api/push/unsubscribe' && req.method === 'POST') {
          const b = await readJson(req);
          if (b?.endpoint) sql.push.delOwn.run(String(b.endpoint), user.id);
          return json(res, 200, { ok: true });
        }

        // C18: every export download is in the company's audit log
        if (p === '/api/export/all.zip') {
          // everything incl. delivery notes, photos, signatures and logo – streamed with backpressure
          const data = engine.call(user, 'exportData', {}, { ip: ip(req) });
          const table = deliveriesCsv(user);
          engine.call(user, 'logExport', { kind: 'zip' }, { ip: ip(req) });
          res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="ladeklar-export-${data.company.code}-${berlinDate(Date.now())}.zip"`, 'Cache-Control': 'no-store' });
          return await sendZip(res, data, table);
        }
        if (p === '/api/export/all.json') {
          const data = engine.call(user, 'exportData', {}, { ip: ip(req) });
          engine.call(user, 'logExport', { kind: 'json' }, { ip: ip(req) });
          const body = JSON.stringify(data, null, 2);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="ladeklar-export-${berlinDate(Date.now())}.json"`, 'Cache-Control': 'no-store' });
          return res.end(body);
        }
        if (p === '/api/export/deliveries.csv') {
          if (!['admin', 'dispatcher'].includes(user.role)) return json(res, 403, { error: { code: 'forbidden', message: 'Dafür fehlt die Berechtigung.' } });
          // the body is built before the headers, so an engine error still becomes a proper answer (sec-1)
          const body = deliveriesCsv(user);
          engine.call(user, 'logExport', { kind: 'csv' }, { ip: ip(req) });
          res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="lieferungen-${berlinDate(Date.now())}.csv"`, 'Cache-Control': 'no-store' });
          return res.end(body);
        }
        if (p === '/api/export/billing.csv') {
          if (user.role !== 'platform') return json(res, 403, { error: { code: 'forbidden', message: 'Dafür fehlt die Berechtigung.' } });
          const b = engine.call(user, 'billingRun', { month: url.searchParams.get('month') });
          const body = csv([['Monat', 'Kunde', 'Code', 'Zahlweise', 'Positionen', 'Netto €', 'USt 19 % €', 'Brutto €', 'Grund'], ...b.lines.map((l) => [l.period, l.name, l.code, l.billing === 'yearly' ? 'jährlich' : 'monatlich', l.items.map((i) => `${i.qty} × ${i.text} à ${i.unit} €`).join(' | '), l.net.toFixed(2).replace('.', ','), l.vat.toFixed(2).replace('.', ','), l.gross.toFixed(2).replace('.', ','), l.reason || ''])]);
          res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="abrechnung-${b.month}.csv"`, 'Cache-Control': 'no-store' });
          return res.end(body);
        }
        if (p === '/api/debug/push-log' && opts.exposePushLog) return json(res, 200, pushLog);

        return json(res, 404, { error: { code: 'not_found', message: 'Unbekannte Adresse.' } });
      }

      // ---- pages & static ----
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: { code: 'method' } });
      if (p === '/sw.js') return serveFile(req, res, path.join(ROOT, 'web', 'sw.js'), { cache: 'no-cache' }) || notFound(res);
      if (p === '/manifest.webmanifest') {
        const code = tenantForHost(req.headers.host);
        if (code) return tenantManifest(res, code);
        return serveFile(req, res, path.join(ROOT, 'web', 'manifest.webmanifest')) || notFound(res);
      }
      let m;
      if ((m = /^\/m\/([A-Za-z0-9]+)\/manifest\.webmanifest$/.exec(p))) return tenantManifest(res, m[1]);
      if (p.startsWith('/web/') || p.startsWith('/core/')) {
        const f = safeJoin(ROOT, p.slice(1));
        return (f && serveFile(req, res, f, { cache: p.startsWith('/web/fonts/') || p.startsWith('/web/icons/') ? 'public, max-age=604800' : 'no-cache' })) || notFound(res);
      }
      if (p.startsWith('/legal/')) {
        const f = safeJoin(path.join(ROOT, 'web', 'legal'), p.slice(7) + (path.extname(p) ? '' : '.html'));
        return (f && serveFile(req, res, f)) || notFound(res);
      }
      if (p === '/.well-known/security.txt') { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end(`Contact: mailto:${(process.env.SECURITY_CONTACT || 'security@ladeklar.de')}\nExpires: ${new Date(Date.now() + 365 * 864e5).toISOString()}\nPreferred-Languages: de, en\nPolicy: ${BASE_URL || ''}/legal/sicherheit\n`); }
      if (p === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('User-agent: *\nDisallow: /api/\nDisallow: /i/\n'); }
      if ((m = /^\/t\/([A-Za-z0-9]+)\/?$/.exec(p))) return indexHtml(req, res, m[1].toUpperCase());
      // C11: invite link /i/<token> opens the app in the company's branding (the token is checked again at login)
      if ((m = /^\/i\/([\w-]{16,64})\/?$/.exec(p))) {
        const inv = limited('invite:' + ip(req), 60, 60e3) ? null : engine.auth.inviteInfo(m[1]);
        return indexHtml(req, res, inv?.tenant?.code || tenantForHost(req.headers.host));
      }
      if (p === '/' || /^\/(i|login|fahrer|app|admin)(\/.*)?$/.test(p)) return indexHtml(req, res, tenantForHost(req.headers.host));
      return notFound(res);
    } catch (e) {
      return fail(res, e);
    }
  }
  function notFound(res) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Nicht gefunden'); }

  // ---------- files and the ZIP export ----------
  async function fileBytes(f) {
    const rec = f.data ? f : sql.store.get('files', f.id);
    if (rec?.data) { const raw = rec.data.slice(rec.data.indexOf(',') + 1); return rec.data.includes(';base64,') ? Buffer.from(raw, 'base64') : Buffer.from(decodeURIComponent(raw)); }
    try { return await fs.promises.readFile(binPath(f.tenantId, f.id)); } catch { return null; }
  }
  /**
   * Stream the full export: one file at a time from disk, waiting for 'drain' whenever the socket
   * buffer is full, so memory stays flat and other requests are served in between. Stops when the
   * client goes away. ZIP64 above 4 GiB / 65,535 entries (core/zip.js).
   */
  async function sendZip(res, data, table) {
    let gone = false;
    res.on('close', () => { gone = true; });
    const drained = () => (gone || !res.writableNeedDrain ? null : new Promise((r) => {
      const done = () => { res.off('drain', done); res.off('close', done); r(); };
      res.on('drain', done); res.on('close', done);
    }));
    const pace = async () => { const w = drained(); if (w) await w; return !gone; };
    const zip = createZip((chunk) => { if (!gone) res.write(chunk); }, { crc: fastCrc });
    const missing = [];
    const files = data.files.map((f) => ({ ...f, path: exportFileName(f) }));
    for (const f of files) {
      if (!(await pace())) return log('Export abgebrochen', data.company.code);
      const buf = await fileBytes(f);
      if (gone) return log('Export abgebrochen', data.company.code);
      if (buf) zip.add(f.path, buf, f.at); else missing.push(f.id);
    }
    const now0 = Date.now();
    const extra = [
      ['lieferungen.csv', table],
      ['daten.json', JSON.stringify({ ...data, files, missingFiles: missing }, null, 2)],
      ['LIESMICH.txt', `Ladeklar-Datenexport ${data.company.name} (${data.company.code}) vom ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}\r\n\r\ndaten.json      alle Daten (Firma, Nutzer ohne Passwörter, Fahrzeuge, Lieferungen mit Verlauf und Notizen, Protokoll)\r\nlieferungen.csv Lieferungen als Tabelle (Excel: Daten > Aus Text/CSV, Trennzeichen Semikolon)\r\ndateien/        Lieferscheine, Fotos, Unterschriften und Logo; die Zuordnung steht in daten.json unter files[].path\r\n`],
    ];
    for (const [name, text] of extra) { if (!(await pace())) return log('Export abgebrochen', data.company.code); zip.add(name, text, now0); }
    if (!(await pace())) return log('Export abgebrochen', data.company.code);
    zip.end();
    res.end();
  }

  // ---------- maintenance ----------
  const fileIdsOf = sql.db.prepare("SELECT id FROM docs WHERE col = 'files' AND json_extract(data, '$.tenantId') = ?");
  /**
   * Bytes without a record go: ids the retention purge returned (C10), files removed before the
   * engine reported removals, and upload leftovers (.part) older than an hour.
   */
  async function sweepFiles(removed) {
    const root = path.join(DATA_DIR, 'files');
    const old = Date.now() - 3600e3;
    for (const dir of await fs.promises.readdir(root)) {
      if (!safeId(dir)) continue;
      let names;
      try { names = await fs.promises.readdir(path.join(root, dir)); } catch { continue; }
      const known = new Set(fileIdsOf.all(dir).map((r) => r.id));
      for (const n of names) {
        const m = /^([\w-]+)\.(bin|part)$/.exec(n);
        if (!m || (m[2] === 'bin' && known.has(m[1]) && !removed.has(m[1]))) continue;
        const full = path.join(root, dir, n);
        const st = removed.has(m[1]) ? null : await fs.promises.stat(full).catch(() => null);
        if (removed.has(m[1]) || (st && st.mtimeMs < old)) await fs.promises.rm(full, { force: true });
      }
    }
  }
  let maintaining = false;
  async function maintenance() {
    if (maintaining) return;
    maintaining = true;
    try {
      // the engine's fileRemoved events already deleted most bytes; the sweep catches the rest
      const removed = new Set(engine.purgeExpired());
      sql.sessions.purge.run(Date.now());
      pruneBuckets();
      await sweepFiles(removed);
    } catch (e) { log('Wartung', e.message); } finally { maintaining = false; }
  }
  const timer = setInterval(maintenance, 3600e3);
  timer.unref();

  // no request may take the process down: log, answer 500 or cut the connection when headers went out
  const server = http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      log('Fehler', e && e.stack || e);
      if (res.headersSent) { try { res.destroy(); } catch { /* gone */ } return; }
      try { json(res, 500, { error: { code: 'server', message: 'Interner Fehler. Bitte erneut versuchen.' } }); } catch { try { res.destroy(); } catch { /* gone */ } }
    });
  });
  server.keepAliveTimeout = 65e3;
  return {
    server, engine, sql, vapid, clients, pushLog, maintenance,
    listen: (port = Number(process.env.PORT || 8080), host = process.env.HOST || '0.0.0.0') => new Promise((r, j) => { server.once('error', j); server.listen(port, host, () => { server.off('error', j); r(server.address().port); }); }),
    close: () => new Promise((r) => { clearInterval(timer); for (const c of [...clients]) dropStream(c); server.closeAllConnections?.(); server.close(() => { sql.close(); r(); }); }),
  };
}

// native CRC-32 for the ZIP export; zlib.crc32 is wrong for one input of 4 GiB or more, so feed it in parts
const fastCrc = zlib.crc32 ? (b) => { let c = 0; for (let i = 0; i < b.length; i += 2 ** 30) c = zlib.crc32(b.subarray(i, i + 2 ** 30), c); return c; } : undefined;

// Web Push only to the browser vendors' push services: no internal hosts, no other ports (sec-14)
const PUSH_HOST = /^(?:fcm\.googleapis\.com|(?:[a-z0-9-]+\.)+push\.apple\.com|(?:[a-z0-9-]+\.)*push\.services\.mozilla\.com|(?:[a-z0-9-]+\.)+notify\.windows\.com)$/;
const PUSH_MAX = 10; // subscriptions per person (devices); the oldest go first
export function pushEndpointOk(ep) {
  if (typeof ep !== 'string' || ep.length > 1000) return false;
  let u;
  try { u = new URL(ep); } catch { return false; }
  return u.protocol === 'https:' && !u.port && !u.username && !u.password && PUSH_HOST.test(u.hostname);
}

function sniffMime(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  return null;
}

// ---------- CLI ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (args[0] === 'setup') {
    const s = createServer({ quiet: true });
    try { const u = s.engine.setupPlatform({ email: args[1], password: args[2], name: args[3] || 'Lizenzgeber' }); console.log('Lizenzgeber-Zugang angelegt:', u.email); }
    catch (e) { console.error(e.message); process.exitCode = 1; }
    s.sql.close();
  } else if (args[0] === 'reset-platform-password') {
    // C17: recovery when the licensor lost the password or the authenticator; all sessions and pushes end
    const s = createServer({ quiet: true });
    try {
      const u = s.engine.resetPlatformPassword({ email: args[1], password: args[2] });
      s.sql.sessions.delUser.run(u.id);
      s.sql.push.delUser.run(u.id);
      console.log('Neues Passwort gesetzt, Zwei-Faktor-Anmeldung aus, alle Sitzungen beendet:', u.email);
    } catch (e) { console.error(e.message); process.exitCode = 1; }
    s.sql.close();
  } else {
    // a failing request is logged and answered; it never ends the process (only a failed start does)
    let up = false;
    process.on('unhandledRejection', (e) => console.error(new Date().toISOString(), 'unhandledRejection', e && e.stack || e));
    process.on('uncaughtException', (e) => { console.error(new Date().toISOString(), 'uncaughtException', e && e.stack || e); if (!up) process.exit(1); });
    const s = createServer();
    const port = await s.listen();
    up = true;
    console.log(`\n  LADEKLAR ${VERSION} läuft auf http://localhost:${port}\n`);
    if (!s.sql.store.find('users', { role: 'platform' }).length) console.log('  Noch kein Lizenzgeber-Zugang: node server/index.js setup <email> <passwort>\n  oder Demo-Daten: npm run dev\n');
    else console.log('  Passwort des Lizenzgebers vergessen: node server/index.js reset-platform-password <email> <neues-passwort>\n');
    const stop = () => { s.close().then(() => process.exit(0)); };
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
  }
}
