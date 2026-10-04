// Cat Me If You Can – Server-Zusammenbau: Speicher, Fotos, Analyse, Engine, Routen.
// createApp() wird von server.js und von den Tests benutzt.

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createEngine } from '../public/core/engine.js';
import { GAME } from '../public/config/game.js';
import { REGIONS } from '../public/config/regions.js';
import { seedDemo } from '../public/core/demo.js';
import { openJournalStore } from './journal.js';
import { createPhotoStore, decodeJpegDataUrl } from './photos.js';
import { chooseAnalyzer } from './analyzers.js';
import { newToken, sha256, hashPin, verifyPin, safeEqual, bearer, createPartnerSessions } from './auth.js';
import { createLimiter } from './ratelimit.js';
import { createRouter, readJson, sendJson, sendText, sendError, securityHeaders, clientIp, HttpError } from './http.js';
import { serveStatic, servePhoto, serveFullPhoto } from './static.js';
import { catsCsv, catsGeoJson } from './export.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

const AR_CDN = {
  tf: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js',
  cocoSsd: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js',
};
const DEFAULT_TILES = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap-Mitwirkende',
  host: 'https://*.tile.openstreetmap.org',
};

function mergeGame(dataDir) {
  const p = path.join(dataDir, 'game.override.json');
  if (!fs.existsSync(p)) return GAME;
  const o = JSON.parse(fs.readFileSync(p, 'utf8'));
  return { ...GAME, ...o, xp: { ...GAME.xp, ...(o.xp || {}) }, reid: { ...GAME.reid, ...(o.reid || {}) }, quests: { ...GAME.quests, ...(o.quests || {}) } };
}

function adminTokenFor(dataDir, envToken, log) {
  if (envToken) {
    if (envToken.length < 16) throw new Error('ADMIN_TOKEN muss mindestens 16 Zeichen haben');
    return envToken;
  }
  const p = path.join(dataDir, 'admin-token.txt');
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  const t = newToken();
  fs.writeFileSync(p, t + '\n', { mode: 0o600 });
  log(`Admin-Token erzeugt: ${p}`);
  return t;
}

export async function createApp(options = {}) {
  const {
    dataDir = path.join(ROOT, 'data'),
    publicDir = PUBLIC_DIR,
    aiMode = process.env.CATME_AI || 'auto',
    model = process.env.CATME_MODEL || undefined,
    demo = process.env.CATME_DEMO === '1',
    adminToken: envAdmin = process.env.ADMIN_TOKEN || '',
    trustProxy = Number(process.env.TRUST_PROXY) || 0, // Anzahl Proxys vor dem Server
    tiles = process.env.CATME_TILES ? { url: process.env.CATME_TILES, attribution: process.env.CATME_TILES_ATTRIB || '', host: new URL(process.env.CATME_TILES.replace(/\{s\}/, 'a').replace(/\{[xyz]\}/g, '0')).origin } : DEFAULT_TILES,
    tls = null,
    now = () => Date.now(),
    analyzerOverride = null,
    log = (...a) => console.log('[catme]', ...a),
  } = options;

  fs.mkdirSync(dataDir, { recursive: true });
  const game = mergeGame(dataDir);
  const journal = openJournalStore(dataDir, { log });
  const photos = createPhotoStore(path.join(dataDir, 'photos'));
  const ai = analyzerOverride || (await chooseAnalyzer({ mode: aiMode, model, readCrop: (id) => photos.readCrop(id), log }));
  const engine = createEngine({
    store: journal.store,
    regions: REGIONS,
    game,
    analyzer: ai.analyzer,
    verifier: ai.verifier || null,
    moderator: ai.moderator || null,
    photos,
    now,
    log,
  });
  if (demo) {
    const r = seedDemo(engine, { hashPin });
    if (!r.skipped) log(`Demo-Daten: ${r.cats} Katzen, ${r.partners} Partner-Cafés (PIN ${r.partnerPin})`);
  }
  const adminToken = adminTokenFor(dataDir, envAdmin, log);
  const partnerSessions = createPartnerSessions({ now });
  const arLocal = fs.existsSync(path.join(publicDir, 'vendor', 'ar', 'tf.min.js')) && fs.existsSync(path.join(publicDir, 'vendor', 'ar', 'coco-ssd.min.js'));
  const ar = arLocal ? { tf: '/vendor/ar/tf.min.js', cocoSsd: '/vendor/ar/coco-ssd.min.js', local: true } : { ...AR_CDN, local: false };
  const headers = securityHeaders({ tileHost: tiles.host, arCdn: !arLocal });

  const lim = {
    // großzügig pro IP: viele Spieler:innen teilen sich oft ein Café-WLAN (NAT)
    api: createLimiter({ perMinute: 600, burst: 200, now }),
    register: createLimiter({ perMinute: 0.5, burst: 20, now }),
    catch: createLimiter({ perMinute: 120, burst: 40, now }),
    write: createLimiter({ perMinute: 30, burst: 15, now }),
    login: createLimiter({ perMinute: 5, burst: 5, now }),
    loginPartner: createLimiter({ perMinute: 10, burst: 10, now }),
    partner: createLimiter({ perMinute: 60, burst: 30, now }),
  };

  // ------------------------------------------------------------ Anmeldung

  function player(req, { required = true, allowBanned = false } = {}) {
    const token = bearer(req);
    const p = token ? engine.playerByTokenHash(sha256(token)) : null;
    if (!p && required) throw new HttpError(401, 'login_required', 'Bitte zuerst einen Spitznamen wählen');
    if (p && p.banned && !allowBanned) throw new HttpError(403, 'banned', 'Konto gesperrt');
    return p;
  }

  /** Admin: ADMIN_TOKEN oder Spielerkonto mit Rolle admin. */
  function admin(req) {
    const token = bearer(req);
    if (token && safeEqual(token, adminToken)) return { id: 'admin', role: 'admin', nickname: 'Admin' };
    const p = token ? engine.playerByTokenHash(sha256(token)) : null;
    if (p && p.role === 'admin' && !p.banned) return p;
    throw new HttpError(403, 'forbidden', 'Nur für Moderation');
  }

  function partner(req) {
    const id = partnerSessions.get(bearer(req));
    const p = id ? engine.ctx.store.places.get(id) : null;
    if (!p || p.type !== 'partner' || p.active === false || p.status !== 'approved') throw new HttpError(401, 'partner_login_required', 'Bitte als Café anmelden');
    return p;
  }

  // ------------------------------------------------------------ Routen

  const r = createRouter();
  const q = (url, k) => url.searchParams.get(k) || undefined;

  r.get('/api/health', () => ({ ok: true, version: VERSION, ai: ai.info || ai.analyzer.name, demo }));
  r.get('/api/config', () => ({ ...engine.config(), ar, tiles: { url: tiles.url, attribution: tiles.attribution }, demo, version: VERSION }));

  r.get('/api/cats', ({ url }) => engine.listCats({
    district: q(url, 'district'), status: q(url, 'status'), pattern: q(url, 'pattern'), severity: q(url, 'severity'),
    q: q(url, 'q'), sort: q(url, 'sort'), limit: q(url, 'limit'), offset: q(url, 'offset'),
  }));
  r.get('/api/cats/:id', ({ params }) => engine.getCat(params.id));
  r.get('/api/map', () => engine.mapData());
  r.get('/api/stats', ({ url }) => engine.stats({ days: Math.max(7, Math.min(90, Number(q(url, 'days')) || 30)) }));
  r.get('/api/leaderboard', ({ url }) => engine.leaderboard({ period: q(url, 'period'), metric: q(url, 'metric'), limit: Number(q(url, 'limit')) || 20 }));
  r.get('/api/places', ({ url }) => engine.listPlaces({ type: q(url, 'type') }));
  r.get('/api/help', () => engine.helpList());
  r.get('/api/export/cats.csv', ({ url, res }) => {
    sendText(res, 200, catsCsv(engine, { lang: q(url, 'lang') || 'tr' }), 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="catmeifyoucan-cats.csv"' });
  });
  r.get('/api/export/cats.geojson', ({ res }) => {
    sendText(res, 200, JSON.stringify(catsGeoJson(engine)), 'application/geo+json; charset=utf-8', { 'Content-Disposition': 'attachment; filename="catmeifyoucan-cats.geojson"' });
  });

  // Spieler:innen
  r.post('/api/players', async ({ req, ip }) => {
    lim.register.take(ip);
    const body = await readJson(req);
    const token = newToken();
    const p = await engine.createPlayer({ nickname: body.nickname, lang: body.lang, tokenHash: sha256(token) });
    return { status: 201, body: { token, player: engine.publicPlayer(p) } };
  });
  r.get('/api/me', ({ req }) => {
    const p = player(req, { allowBanned: true });
    return { player: engine.publicPlayer(p), today: engine.today(p), profile: engine.profile(p) };
  });
  r.patch('/api/me', async ({ req }) => {
    const p = player(req);
    const body = await readJson(req);
    return engine.updatePlayer(p, { nickname: body.nickname, lang: body.lang });
  });
  r.get('/api/me/dex', ({ req }) => engine.myDex(player(req)));
  r.get('/api/me/observations', ({ req }) => engine.observationsOf(player(req)));

  r.post('/api/catch', async ({ req, ip }) => {
    const p = player(req);
    lim.catch.take(ip);
    const body = await readJson(req, 3.6 * 1024 * 1024);
    const images = { full: decodeJpegDataUrl(body.photo, 1.8 * 1024 * 1024, 'photo') };
    images.crop = body.crop ? decodeJpegDataUrl(body.crop, 600 * 1024, 'crop') : null;
    const result = await engine.catchCat(p, {
      lat: body.lat, lon: body.lon, accuracy: body.accuracy, capturedAt: body.capturedAt, source: body.source,
      fingerprint: body.fingerprint, detector: body.detector, lang: body.lang, images,
    });
    return { status: 201, body: result };
  });
  r.post('/api/cats/:id/name', async ({ req, params, ip }) => {
    const p = player(req);
    lim.write.take(ip);
    const body = await readJson(req);
    return engine.nameCat(p, params.id, body.name);
  });
  r.post('/api/cats/:id/help', async ({ req, params, ip }) => {
    const p = player(req);
    lim.write.take(ip);
    const body = await readJson(req);
    return engine.reportHelp(p, params.id, body.note);
  });
  r.post('/api/cats/:id/status', async ({ req, params }) => {
    const p = player(req);
    const body = await readJson(req);
    return engine.setCatStatus(p, params.id, body.status, body.note);
  });
  r.post('/api/observations/:id/dispute', async ({ req, params, ip }) => {
    const p = player(req);
    lim.write.take(ip);
    const body = await readJson(req);
    return engine.dispute(p, params.id, body.reason);
  });
  r.post('/api/places', async ({ req, ip }) => {
    const p = player(req);
    lim.write.take(ip);
    const body = await readJson(req);
    return { status: 201, body: engine.suggestPlace(p, body) };
  });
  r.post('/api/vouchers', ({ req }) => ({ status: 201, body: engine.claimVoucher(player(req)) }));
  r.get('/api/vouchers/today', ({ req }) => ({ voucher: engine.voucherToday(player(req)) }));

  // Cafés
  r.get('/api/partners', () => engine.listPlaces({ type: 'partner' }).map((p) => ({ id: p.id, name: p.name, address: p.address, demo: p.demo })));
  r.post('/api/partner/login', async ({ req, ip }) => {
    lim.login.take(ip);
    const body = await readJson(req);
    const p = typeof body.partnerId === 'string' ? engine.ctx.store.places.get(body.partnerId) : null;
    if (p) lim.loginPartner.take(p.id);
    if (!p || p.type !== 'partner' || p.active === false || p.status !== 'approved' || !verifyPin(String(body.pin || ''), p.pinHash)) {
      throw new HttpError(401, 'bad_login', 'Café oder PIN falsch');
    }
    return { token: partnerSessions.create(p.id), partner: engine.publicPlace(p) };
  });
  r.post('/api/partner/logout', ({ req }) => {
    partnerSessions.revoke(bearer(req));
    return { ok: true };
  });
  r.get('/api/partner/me', ({ req }) => {
    const p = partner(req);
    return { partner: engine.publicPlace(p), redemptions: engine.partnerRedemptions(p) };
  });
  r.post('/api/partner/check', async ({ req, ip }) => {
    const p = partner(req);
    lim.partner.take(ip);
    const body = await readJson(req);
    return engine.checkVoucher(p, body.code);
  });
  r.post('/api/partner/redeem', async ({ req, ip }) => {
    const p = partner(req);
    lim.partner.take(ip);
    const body = await readJson(req);
    return engine.redeemVoucher(p, body.code);
  });

  // Moderation
  r.get('/api/admin/queue', ({ req }) => engine.reviewQueue(admin(req)));
  r.get('/api/admin/cats/:id', ({ req, params }) => {
    admin(req);
    return engine.getCat(params.id, { precise: true });
  });
  r.post('/api/admin/cats/:id/merge', async ({ req, params }) => {
    const a = admin(req);
    const body = await readJson(req);
    return engine.mergeCats(a, params.id, body.into);
  });
  r.post('/api/admin/cats/:id/legend', async ({ req, params }) => {
    const a = admin(req);
    const body = await readJson(req);
    return engine.setLegendary(a, params.id, body);
  });
  r.post('/api/admin/cats/:id/rename', async ({ req, params }) => {
    const a = admin(req);
    const body = await readJson(req);
    return engine.renameCat(a, params.id, body.name);
  });
  r.post('/api/admin/cats/:id/reviewed', ({ req, params }) => engine.markReviewed(admin(req), { catId: params.id }));
  r.post('/api/admin/cats/:id/status', async ({ req, params }) => {
    const a = admin(req);
    const body = await readJson(req);
    return engine.setCatStatus(a, params.id, body.status, body.note);
  });
  r.post('/api/admin/observations/:id/split', ({ req, params }) => engine.splitObservation(admin(req), params.id));
  r.post('/api/admin/observations/:id/reject', async ({ req, params }) => {
    const a = admin(req);
    const body = await readJson(req);
    return engine.rejectObservation(a, params.id, body.reason);
  });
  r.post('/api/admin/observations/:id/reviewed', ({ req, params }) => engine.markReviewed(admin(req), { observationId: params.id }));
  r.post('/api/admin/disputes/:id/resolve', async ({ req, params }) => {
    const a = admin(req);
    const body = await readJson(req);
    return engine.resolveDispute(a, params.id, body.resolution);
  });
  r.get('/api/admin/players', ({ req, url }) => engine.listPlayers(admin(req), { q: q(url, 'q') }));
  r.post('/api/admin/players/:id/role', async ({ req, params }) => {
    const a = admin(req);
    const body = await readJson(req);
    return engine.setRole(a, params.id, body.role);
  });
  r.post('/api/admin/players/:id/ban', async ({ req, params }) => {
    const a = admin(req);
    const body = await readJson(req);
    return engine.setBanned(a, params.id, body.banned);
  });
  r.get('/api/admin/places', ({ req }) => {
    admin(req);
    return engine.listPlaces({ includePending: true });
  });
  r.post('/api/admin/places', async ({ req }) => {
    const a = admin(req);
    const body = await readJson(req);
    const data = { ...body };
    delete data.pinHash;
    if (body.pin) data.pinHash = hashPin(String(body.pin));
    const place = engine.upsertPlace(a, data);
    if (body.pin || body.active === false || body.status) partnerSessions.revokePartner(place.id); // neue PIN / gesperrt → alte Sitzungen ungültig
    return place;
  });
  r.post('/api/admin/places/:id/review', async ({ req, params }) => {
    const a = admin(req);
    const body = await readJson(req);
    if (body.approve !== true) partnerSessions.revokePartner(params.id);
    return engine.reviewPlace(a, params.id, body.approve === true);
  });
  r.get('/api/admin/photos/:id', ({ req, res, params }) => {
    admin(req);
    const file = photos.fullPath(params.id);
    if (!file || !serveFullPhoto(req, res, file)) throw new HttpError(404, 'not_found');
  });
  r.get('/api/admin/ai', ({ req }) => {
    admin(req);
    return { info: ai.info, stats: ai.claude ? ai.claude.stats : null };
  });

  // ------------------------------------------------------------ HTTP

  async function handle(req, res) {
    const url = new URL(req.url, 'http://local');
    const ip = clientIp(req, trustProxy);
    try {
      if (url.pathname.startsWith('/api/')) {
        lim.api.take(ip);
        const m = r.match(req.method, url.pathname);
        if (!m) throw new HttpError(404, 'not_found', 'Unbekannter Endpunkt');
        if (m.methodNotAllowed) throw new HttpError(405, 'method_not_allowed');
        const out = await m.handler({ req, res, url, params: m.params, ip });
        if (res.headersSent) return;
        if (out && typeof out === 'object' && 'status' in out && 'body' in out) sendJson(res, out.status, out.body);
        else sendJson(res, 200, out === undefined ? { ok: true } : out);
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method_not_allowed');
      if (url.pathname.startsWith('/photos/')) {
        if (servePhoto(req, res, photos.dir, url.pathname.slice('/photos/'.length))) return;
        throw new HttpError(404, 'not_found');
      }
      if (serveStatic(req, res, publicDir, url.pathname, { headers })) return;
      sendText(res, 404, 'Nicht gefunden');
    } catch (e) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      sendError(res, e, log);
    }
  }

  const server = tls ? https.createServer(tls, handle) : http.createServer(handle);
  server.requestTimeout = 180000; // Analyse + ggf. Foto-Vergleich durch die KI
  server.headersTimeout = 30000;

  return {
    server,
    engine,
    adminToken,
    ai,
    journal,
    photos,
    close() {
      return new Promise((resolve) => {
        server.close(() => {
          journal.close();
          resolve();
        });
        server.closeAllConnections && server.closeAllConnections();
      });
    },
  };
}
