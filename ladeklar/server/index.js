#!/usr/bin/env node
// LADEKLAR server – Node.js 22, no dependencies.
//   node server/index.js                         start (PORT=8080, DATA_DIR=./data)
//   node server/index.js --demo-data             start and fill an empty database with the demo world
//   node server/index.js setup <email> <passwort> create the licensor account
// Env: PORT, HOST, DATA_DIR, BASE_URL (https://app.ladeklar.de), PUSH_SUBJECT (mailto:…),
//      PLATFORM_EMAIL + PLATFORM_PASSWORD (bootstrap), TRUST_PROXY=1 behind a reverse proxy.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createEngine, EngineError, VERSION, berlinDate, routeLabel } from '../core/engine.js';
import { statusText } from '../core/texts.js';
import { seedDemo } from '../core/seed.js';
import { createSqlStore } from './sqlstore.js';
import { generateVapidKeys, sendPush } from './webpush.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

export function createServer(opts = {}) {
  const DATA_DIR = path.resolve(opts.dataDir || process.env.DATA_DIR || path.join(ROOT, 'data'));
  const BASE_URL = opts.baseUrl || process.env.BASE_URL || '';
  const SECURE = BASE_URL.startsWith('https://');
  const TRUST_PROXY = opts.trustProxy ?? process.env.TRUST_PROXY === '1';
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
  const clients = new Set(); // { res, user }
  const pushLog = [];
  const engine = createEngine({
    store: sql.store, now, newId: () => crypto.randomBytes(12).toString('base64url'), hash,
    onEvent: (evt) => {
      if (evt.type === 'notify') {
        for (const c of clients) if (c.user.id === evt.userId) sse(c.res, 'notify', evt.notification);
        deliverPush(evt.userId, evt.notification);
        return;
      }
      for (const c of clients) {
        const u = c.user;
        if (u.role === 'platform') { if (evt.col === 'tenants') sse(c.res, 'change', { col: evt.col, id: evt.id }); continue; }
        if (u.tenantId !== evt.tenantId) continue;
        if (u.role === 'driver' && !(evt.allDrivers || (evt.drivers || []).includes(u.id) || evt.col === 'tenants')) continue;
        sse(c.res, 'change', { col: evt.col, id: evt.id });
      }
    },
  });
  function sse(res, event, data) { try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch { /* closed */ } }
  async function deliverPush(userId, n) {
    const subs = sql.push.forUser.all(userId);
    if (!subs.length) return;
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
  const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((x) => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
  const ip = (req) => (TRUST_PROXY && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : req.socket.remoteAddress);
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
  function limited(key, max, windowMs) {
    const t = Date.now(); const b = buckets.get(key);
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
    if (custom) return custom.code;
    const m = /^([a-z0-9-]+)\.ladeklar\.(de|app)$/.exec(h);
    if (m && !['app', 'www', 'demo'].includes(m[1])) return m[1].toUpperCase();
    return null;
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
  function csv(rows) {
    const esc = (v) => { const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  }
  const fmt = (ms) => (ms ? new Date(ms).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) : '');
  function deliveriesCsv(actor) {
    const ds = engine.call(actor, 'listDeliveries', { tab: 'all', limit: 1000 });
    const head = ['Buchungsnummer', 'Status', 'Auftraggeber', 'Referenz', 'Route', 'Ladeort', 'Ladedatum', 'Entladeort', 'Entladedatum', 'Fahrer', 'Kennzeichen', 'Auflieger', 'Ware', 'Paletten', 'Gewicht kg', 'Standzeit min', 'Empfänger', 'Lieferscheine', 'Zugestellt am'];
    return csv([head, ...ds.map((d) => [d.bookingNo, statusText('de', d.status), d.customer, d.reference, routeLabel(d), [d.pickup.place, d.pickup.street, d.pickup.zip, d.pickup.city].filter(Boolean).join(', '), d.pickup.date, [d.dropoff.place, d.dropoff.street, d.dropoff.zip, d.dropoff.city].filter(Boolean).join(', '), d.dropoff.date, d.driverName, d.vehiclePlate, d.trailerPlate, d.goods?.text, d.goods?.pallets, d.goods?.weightKg, d.waitingMinutes, d.receiver, (d.docs || []).filter((x) => x.kind === 'pod').length, d.status === 'delivered' ? fmt(d.updatedAt) : ''])]);
  }

  // ---------- request handler ----------
  async function handle(req, res) {
    const t0 = Date.now();
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    baseHeaders(res);
    res.on('finish', () => { if (!p.startsWith('/web/') && p !== '/api/events') log(req.method, p, res.statusCode, Date.now() - t0 + 'ms'); });

    try {
      // ---- API ----
      if (p.startsWith('/api/')) {
        if (req.method === 'POST' && !p.startsWith('/api/v1/') && req.headers['x-ladeklar'] !== '1') return json(res, 403, { error: { code: 'csrf', message: 'Ungültige Anfrage.' } });

        if (p === '/api/health') return json(res, 200, { ok: true, version: VERSION, time: Date.now() });

        if (p === '/api/auth/login' && req.method === 'POST') {
          if (limited('login:' + ip(req), 20, 60e3)) return json(res, 429, { error: { code: 'rate', message: 'Zu viele Versuche. Bitte eine Minute warten.' } });
          const b = await readJson(req);
          const u = engine.auth.login(b);
          startSession(res, u, req);
          return json(res, 200, { user: u });
        }
        if ((p === '/api/auth/driver' || p === '/api/auth/invite') && req.method === 'POST') {
          if (limited('login:' + ip(req), 20, 60e3)) return json(res, 429, { error: { code: 'rate', message: 'Zu viele Versuche. Bitte eine Minute warten.' } });
          const b = await readJson(req);
          const u = p === '/api/auth/invite' ? engine.auth.inviteLogin(b) : engine.auth.driverLogin(b);
          startSession(res, u, req);
          return json(res, 200, { user: u });
        }
        if (p === '/api/auth/logout' && req.method === 'POST') {
          const tok = cookies(req)[COOKIE];
          if (tok) sql.sessions.del.run(sha(tok));
          clearSession(res);
          return json(res, 200, { ok: true });
        }
        if (p.startsWith('/api/public/tenant/')) {
          const t = engine.auth.publicTenant(decodeURIComponent(p.slice(19)));
          return t ? json(res, 200, t) : json(res, 404, { error: { code: 'not_found', message: 'Firmencode unbekannt.' } });
        }
        if (p.startsWith('/api/public/invite/')) {
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
          if (req.method === 'GET') return json(res, 200, engine.call(actor, 'listDeliveries', { tab: url.searchParams.get('tab') || 'all', q: url.searchParams.get('q') || '' }));
          if (req.method === 'POST' && !m[1]) return json(res, 201, engine.call(actor, 'createDelivery', await readJson(req)));
          if (req.method === 'PATCH' && m[1]) return json(res, 200, engine.call(actor, 'updateDelivery', { ...(await readJson(req)), id: m[1] }));
          return json(res, 405, { error: { code: 'method' } });
        }

        const user = sessionUser(req);

        if (p.startsWith('/api/files/') && req.method === 'GET') {
          const id = decodeURIComponent(p.slice(11));
          const f = engine.canReadFile(user, id);
          if (!f) return json(res, 404, { error: { code: 'not_found', message: 'Datei nicht gefunden.' } });
          let buf;
          if (f.data) buf = Buffer.from(f.data.split(',')[1], 'base64');
          else { try { buf = fs.readFileSync(path.join(DATA_DIR, 'files', f.tenantId, f.id + '.bin')); } catch { return json(res, 404, { error: { code: 'not_found', message: 'Datei nicht gefunden.' } }); } }
          const pub = ['logo', 'icon'].includes(f.kind);
          res.writeHead(200, {
            'Content-Type': f.mime, 'Content-Length': buf.length, 'Cache-Control': pub ? 'public, max-age=86400' : 'private, max-age=3600',
            'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox", 'Content-Disposition': `inline; filename="${encodeURIComponent(f.name || f.id)}"`,
          });
          return res.end(buf);
        }

        if (!user) return json(res, 401, { error: { code: 'unauthorized', message: 'Bitte anmelden.' } });

        if (p === '/api/session') return json(res, 200, engine.call(user, 'me', {}));

        if (p.startsWith('/api/call/') && req.method === 'POST') {
          const name = p.slice(10);
          if (name === 'createFile') return json(res, 400, { error: { code: 'invalid', message: 'Dateien bitte über /api/files hochladen.' } });
          const b = await readJson(req);
          const out = engine.call(user, name, b);
          if (name === 'setUserActive' && b.active === false) sql.sessions.delUser.run(b.id);
          if (name === 'resetSecret') sql.sessions.delUser.run(b.id);
          return json(res, 200, out ?? null);
        }

        if (p === '/api/files' && req.method === 'POST') {
          const mime = String(req.headers['content-type'] || '').split(';')[0];
          const buf = await readBody(req, 15e6);
          const sniff = sniffMime(buf);
          if (!sniff || sniff !== mime) return json(res, 400, { error: { code: 'invalid', message: 'Erlaubt sind Fotos (JPG, PNG, WebP) und PDF.' } });
          const f = engine.call(user, 'createFile', { kind: url.searchParams.get('kind'), mime, size: buf.length, name: url.searchParams.get('name'), deliveryId: url.searchParams.get('deliveryId') || null });
          const dir = path.join(DATA_DIR, 'files', f.tenantId);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, f.id + '.bin'), buf);
          return json(res, 200, f);
        }

        if (p === '/api/events' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
          res.write('retry: 4000\n\n');
          const c = { res, user };
          clients.add(c);
          sse(res, 'hello', { at: Date.now() });
          const hb = setInterval(() => { try { res.write(': ping\n\n'); } catch { /* closed */ } }, 25e3);
          req.on('close', () => { clearInterval(hb); clients.delete(c); });
          return;
        }

        if (p === '/api/push/key') return json(res, 200, { publicKey: vapid.publicKey });
        if (p === '/api/push/subscribe' && req.method === 'POST') {
          const b = await readJson(req);
          if (!b?.endpoint || !/^https:\/\//.test(b.endpoint) || !b.keys?.p256dh || !b.keys?.auth) return json(res, 400, { error: { code: 'invalid', message: 'Ungültiges Push-Abo.' } });
          sql.push.upsert.run(b.endpoint, user.id, b.keys.p256dh, b.keys.auth, Date.now());
          return json(res, 200, { ok: true });
        }
        if (p === '/api/push/unsubscribe' && req.method === 'POST') {
          const b = await readJson(req);
          if (b?.endpoint) sql.push.del.run(b.endpoint);
          return json(res, 200, { ok: true });
        }

        if (p === '/api/export/all.json') {
          const data = engine.call(user, 'exportData', {});
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="ladeklar-export-${berlinDate(Date.now())}.json"`, 'Cache-Control': 'no-store' });
          return res.end(JSON.stringify(data, null, 2));
        }
        if (p === '/api/export/deliveries.csv') {
          if (!['admin', 'dispatcher'].includes(user.role)) return json(res, 403, { error: { code: 'forbidden', message: 'Dafür fehlt die Berechtigung.' } });
          res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="lieferungen-${berlinDate(Date.now())}.csv"`, 'Cache-Control': 'no-store' });
          return res.end(deliveriesCsv(user));
        }
        if (p === '/api/export/billing.csv') {
          if (user.role !== 'platform') return json(res, 403, { error: { code: 'forbidden', message: 'Dafür fehlt die Berechtigung.' } });
          const b = engine.call(user, 'billingRun', { month: url.searchParams.get('month') });
          res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="abrechnung-${b.month}.csv"` });
          return res.end(csv([['Monat', 'Kunde', 'Code', 'Zahlweise', 'Positionen', 'Netto €', 'USt 19 % €', 'Brutto €'], ...b.lines.map((l) => [l.period, l.name, l.code, l.billing === 'yearly' ? 'jährlich' : 'monatlich', l.items.map((i) => `${i.qty} × ${i.text} à ${i.unit} €`).join(' | '), l.net.toFixed(2).replace('.', ','), l.vat.toFixed(2).replace('.', ','), l.gross.toFixed(2).replace('.', ',')])]));
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
      if (p === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('User-agent: *\nDisallow: /api/\n'); }
      if ((m = /^\/t\/([A-Za-z0-9]+)\/?$/.exec(p))) return indexHtml(req, res, m[1].toUpperCase());
      if (p === '/' || /^\/(i|login|fahrer|app|admin)(\/.*)?$/.test(p)) return indexHtml(req, res, tenantForHost(req.headers.host));
      return notFound(res);
    } catch (e) {
      return fail(res, e);
    }
  }
  function notFound(res) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Nicht gefunden'); }

  // ---------- maintenance ----------
  function maintenance() {
    try {
      for (const id of engine.purgeExpired()) for (const dir of fs.readdirSync(path.join(DATA_DIR, 'files'))) fs.rmSync(path.join(DATA_DIR, 'files', dir, id + '.bin'), { force: true });
      sql.sessions.purge.run(Date.now());
    } catch (e) { log('Wartung', e.message); }
  }
  const timer = setInterval(maintenance, 3600e3);
  timer.unref();

  const server = http.createServer(handle);
  server.keepAliveTimeout = 65e3;
  return {
    server, engine, sql, vapid, clients, pushLog,
    listen: (port = Number(process.env.PORT || 8080), host = process.env.HOST || '0.0.0.0') => new Promise((r) => server.listen(port, host, () => r(server.address().port))),
    close: () => new Promise((r) => { clearInterval(timer); for (const c of clients) { try { c.res.end(); } catch { /* */ } } server.closeAllConnections?.(); server.close(() => { sql.close(); r(); }); }),
  };
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
  } else {
    const s = createServer();
    const port = await s.listen();
    console.log(`\n  LADEKLAR ${VERSION} läuft auf http://localhost:${port}\n`);
    if (!s.sql.store.find('users', { role: 'platform' }).length) console.log('  Noch kein Lizenzgeber-Zugang: node server/index.js setup <email> <passwort>\n  oder Demo-Daten: npm run dev\n');
    const stop = () => { s.close().then(() => process.exit(0)); };
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
  }
}
