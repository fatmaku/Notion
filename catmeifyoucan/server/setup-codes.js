// Cat Me If You Can – Einrichtung per QR-Code (Erweiterung qr-setup).
//
// Einmal-Codes für drei Zwecke:
//   admin     – ein weiteres Gerät für die Moderation koppeln (10 Minuten, einmal)
//   partner   – das Handy/Tablet eines Cafés einrichten: Café wählt selbst die PIN (7 Tage, einmal)
//   volunteer – Freiwillige einladen (7 Tage, 1–50 Mal)
// Ein Code hat 144 Bit Zufall (base64url, 24 Zeichen). Gespeichert wird NUR sein SHA-256 (Journal,
// übersteht Neustarts). Der Code reist nur im Fragment der Adresse (#setup=… / #invite=…): Fragmente
// schickt der Browser nie an den Server und nie im Referer – sie landen in keinem Protokoll. Die
// Endpunkte lesen den Code nur aus dem JSON-Body, nie aus der Query.
//
// Admin-Sitzungen: Wer einen Admin-Code einlöst (oder sich mit dem ADMIN_TOKEN anmeldet), bekommt ein
// eigenes Sitzungs-Token (30 Tage, nur der Hash wird gespeichert, einzeln widerrufbar). So muss der
// ADMIN_TOKEN nie im Browser gespeichert oder in einen QR-Code geschrieben werden.
//
// Wem gehört ein Code / eine Sitzung („owner“)? Entweder dem ADMIN_TOKEN („master“, dazu ein kurzer
// Fingerabdruck des Tokens: „epoch“) oder einem Spielerkonto mit Rolle admin („player:<id>“). Geprüft
// wird bei jeder Benutzung: Wird der ADMIN_TOKEN geändert, sind alle davon abgeleiteten Sitzungen und
// Codes ungültig (Notbremse: Token in deploy/.env ändern, neu starten). Verliert ein Spielerkonto die
// Rolle admin oder wird gesperrt, gelten seine Geräte und Codes nicht mehr. Wird eine Sitzung abgemeldet,
// verfallen auch die offenen Admin-Codes, die sie erstellt hat (ein gestohlenes Handy kann so keinen
// Nachfolger mehr koppeln).

import crypto from 'node:crypto';
import { newToken, sha256, safeEqual, hashPin, bearer } from './auth.js';
import { HttpError, readJson } from './http.js';
import { weakPin } from '../public/js/qr-kit.js'; // dieselbe Regel wie im Browser (partner.js)

export { weakPin };

const MIN = 60000;
const DAY = 86400000;

export const PURPOSES = {
  admin: { ttlMs: 10 * MIN, defaultUses: 1, maxUses: 1 },
  partner: { ttlMs: 7 * DAY, defaultUses: 1, maxUses: 1 },
  volunteer: { ttlMs: 7 * DAY, defaultUses: 1, maxUses: 50 },
};
export const CODE_BYTES = 18; // 144 Bit
export const CODE_RE = /^[A-Za-z0-9_-]{22,64}$/;
export const SESSION_TTL_MS = 30 * DAY; // gekoppeltes Handy / „Gerät merken“
export const SESSION_SHORT_MS = 12 * 3600000; // Anmeldung mit dem Token ohne „Gerät merken“
/**
 * Fingerabdruck des ADMIN_TOKEN – ändert sich der Token, ändert er sich mit. Bewusst langsam (scrypt,
 * einmal beim Start): Wer ein Backup hat, soll daraus keinen schwachen Token durchprobieren können.
 */
export const adminEpoch = (token) => (token ? crypto.scryptSync(String(token), 'catme-admin-epoch-v1', 12).toString('hex') : null);

/** Seite + Fragment je Zweck – der Code hängt hinten dran. */
export const LINK_PATHS = { admin: 'admin.html#setup=', partner: 'partner.html#setup=', volunteer: 'app.html#invite=' };
const MAX_ACTIVE = 300; // Schutz gegen endloses Wachsen
const TOUCH_MS = 5 * MIN; // „zuletzt benutzt“ höchstens alle 5 Minuten ins Journal

export const newSetupCode = (rand = crypto.randomBytes) => rand(CODE_BYTES).toString('base64url');
const newDocId = (prefix) => `${prefix}_${crypto.randomBytes(8).toString('hex')}`;

/** Kurzer Gerätename aus dem User-Agent („iPhone · Safari“) – nur zur Anzeige in „Geräte“. */
export function deviceLabel(ua) {
  const s = String(ua || '').slice(0, 500);
  const os = /iPhone/.test(s) ? 'iPhone'
    : /iPad/.test(s) ? 'iPad'
      : /Android/.test(s) ? 'Android'
        : /Windows/.test(s) ? 'Windows'
          : /Macintosh|Mac OS X/.test(s) ? 'Mac'
            : /CrOS/.test(s) ? 'ChromeOS'
              : /Linux/.test(s) ? 'Linux'
                : /catme-setup-qr|curl|node|undici/i.test(s) ? 'Terminal' : '';
  const br = /Edg\//.test(s) ? 'Edge'
    : /OPR\//.test(s) ? 'Opera'
      : /SamsungBrowser/.test(s) ? 'Samsung Internet'
        : /Firefox\/|FxiOS/.test(s) ? 'Firefox'
          : /Chrome\/|CriOS/.test(s) ? 'Chrome'
            : /Safari\//.test(s) ? 'Safari' : '';
  return [os, br].filter(Boolean).join(' · ') || 'Browser';
}

/** owner aus dem Ergebnis von admin(req): Master-Token/Sitzung bringen ihn mit, sonst Spielerkonto. */
export const ownerOf = (a) => (a && a.owner) || (a && a.id && a.id !== 'admin' ? `player:${a.id}` : 'master');

export function createSetupStore({ store, now = () => Date.now(), epoch = null }) {
  const codes = store.setupCodes;
  const sessions = store.adminSessions;

  /** Gilt der Besitzer noch? master → derselbe ADMIN_TOKEN wie beim Erstellen; player → noch admin, nicht gesperrt. */
  function ownerOk(doc) {
    const o = doc && doc.owner;
    if (o === 'master') return !!epoch && doc.epoch === epoch;
    if (typeof o === 'string' && o.startsWith('player:')) {
      const p = store.players && store.players.get(o.slice(7));
      return !!p && p.role === 'admin' && !p.banned;
    }
    return false;
  }
  const ownerFields = (owner) => (owner === 'master' ? { owner, epoch } : { owner, epoch: null });

  const isActive = (d, t = now()) => !d.revokedAt && d.expiresAt > t && (d.uses || 0) < d.maxUses;

  /** Alte Einträge entfernen (abgelaufen, aufgebraucht oder widerrufen seit über einem Tag). */
  function prune() {
    const t = now();
    for (const d of codes.all()) {
      const end = Math.min(d.expiresAt, d.revokedAt || Infinity, (d.uses || 0) >= d.maxUses ? d.usedAt || t : Infinity);
      if (end < t - DAY) codes.remove(d.id);
    }
    for (const s of sessions.all()) if (s.expiresAt < t) sessions.remove(s.id);
  }

  /** Neuer Code. Rückgabe: { doc, code } – den Code gibt es nur hier, gespeichert wird sein Hash. */
  function create({ purpose, placeId = null, maxUses, owner = 'master', createdBy = 'admin', via = 'admin' }) {
    const def = PURPOSES[purpose];
    if (owner === 'master' && !epoch) throw new HttpError(500, 'no_admin_token', 'ADMIN_TOKEN fehlt');
    if (!def) throw new HttpError(400, 'invalid_purpose', 'Zweck: admin, partner oder volunteer');
    let uses = def.defaultUses;
    if (maxUses !== undefined && maxUses !== null && maxUses !== '') {
      uses = Number(maxUses);
      if (!Number.isInteger(uses) || uses < 1 || uses > def.maxUses) throw new HttpError(400, 'invalid_max_uses', `maxUses: 1–${def.maxUses}`);
    }
    prune();
    if (codes.all().filter((d) => isActive(d)).length >= MAX_ACTIVE) throw new HttpError(429, 'too_many_codes', 'Zu viele offene Codes – alte widerrufen');
    const t = now();
    const code = newSetupCode();
    const doc = {
      id: newDocId('sc'),
      codeHash: sha256(code),
      purpose,
      placeId: purpose === 'partner' ? placeId : null,
      maxUses: uses,
      uses: 0,
      ...ownerFields(owner),
      createdBy: String(createdBy || 'admin').slice(0, 80),
      via: String(via || 'admin').slice(0, 20),
      createdAt: t,
      expiresAt: t + def.ttlMs,
      usedAt: null,
      revokedAt: null,
    };
    codes.insert(doc);
    return { doc, code };
  }

  /** Code → Eintrag (über den Hash, Vergleich zeitkonstant) oder null. */
  function find(code) {
    if (typeof code !== 'string' || !CODE_RE.test(code)) return null;
    const h = sha256(code);
    for (const d of codes.where('codeHash', h)) if (safeEqual(d.codeHash, h)) return d;
    return null;
  }

  /**
   * Prüfen ohne zu verbrauchen. Falscher Zweck, unbekannt oder widerrufen → dieselbe Antwort
   * (invalid_code); abgelaufen und schon benutzt bekommen eigene Hinweise für die Oberfläche.
   */
  function check(code, purpose) {
    const d = find(code);
    if (!d || d.revokedAt || (purpose && d.purpose !== purpose) || !ownerOk(d) || !creatorAlive(d)) throw new HttpError(400, 'invalid_code', 'Dieser Code gilt nicht');
    if ((d.uses || 0) >= d.maxUses) throw new HttpError(409, 'code_used', 'Dieser Code wurde schon benutzt');
    if (d.expiresAt <= now()) throw new HttpError(410, 'code_expired', 'Dieser Code ist abgelaufen');
    return d;
  }

  /** Admin-Code von einer Sitzung erstellt, die inzwischen abgemeldet ist → gilt nicht mehr. */
  function creatorAlive(d) {
    if (d.purpose !== 'admin' || !String(d.createdBy || '').startsWith('session:')) return true;
    return !!sessions.get(d.createdBy.slice(8));
  }

  /** Offene Admin-Codes widerrufen (Abmelden eines Geräts) – keep(d) → behalten. */
  function revokeAdminCodes(keep = () => false) {
    let n = 0;
    for (const d of codes.all()) {
      if (d.purpose !== 'admin' || !isActive(d) || keep(d)) continue;
      codes.update(d.id, { revokedAt: now() });
      n++;
    }
    return n;
  }

  /** Zustand eines Codes für die Anzeige („benutzt“ / „ungültig“ / „abgelaufen“ / „offen“). */
  function state(d) {
    if (d.revokedAt || !ownerOk(d) || !creatorAlive(d)) return 'revoked';
    if ((d.uses || 0) >= d.maxUses) return 'used';
    if (d.expiresAt <= now()) return 'expired';
    return 'open';
  }

  /** Einen Gebrauch verbuchen. Muss im selben synchronen Abschnitt wie check() laufen (kein await dazwischen). */
  function consume(d) {
    return codes.update(d.id, { uses: (d.uses || 0) + 1, usedAt: now() });
  }

  function revoke(id) {
    const d = codes.get(id);
    if (!d) throw new HttpError(404, 'not_found');
    if (!d.revokedAt) codes.update(d.id, { revokedAt: now() });
    return { ok: true };
  }

  /** Andere offene Café-Codes desselben Cafés beenden – es gilt immer nur der neueste QR-Code. */
  function revokeOthers(doc) {
    for (const d of codes.all()) if (d.id !== doc.id && d.purpose === doc.purpose && d.placeId === doc.placeId && isActive(d)) codes.update(d.id, { revokedAt: now() });
  }

  const listActive = () => codes.all().filter((d) => isActive(d) && ownerOk(d) && creatorAlive(d)).sort((a, b) => b.createdAt - a.createdAt);

  // ---------------------------------------------------------------- Admin-Sitzungen

  function createSession({ label = 'Browser', via = 'login', codeId = null, owner = 'master', ttlMs = SESSION_TTL_MS } = {}) {
    if (owner === 'master' && !epoch) throw new HttpError(500, 'no_admin_token', 'ADMIN_TOKEN fehlt');
    const t = now();
    const token = newToken();
    const doc = {
      id: newDocId('as'),
      tokenHash: sha256(token),
      label: String(label).slice(0, 60),
      via,
      codeId,
      ...ownerFields(owner),
      createdAt: t,
      lastUsedAt: t,
      expiresAt: t + Math.min(SESSION_TTL_MS, Math.max(MIN, Number(ttlMs) || SESSION_TTL_MS)),
    };
    sessions.insert(doc);
    return { token, doc };
  }

  function sessionByToken(token) {
    if (!token) return null;
    const h = sha256(token);
    const s = sessions.where('tokenHash', h).find((x) => safeEqual(x.tokenHash, h));
    if (!s) return null;
    const t = now();
    if (s.expiresAt <= t || !ownerOk(s)) {
      revokeSession(s.id); // abgelaufen, ADMIN_TOKEN geändert oder Konto nicht mehr admin
      return null;
    }
    if (t - (s.lastUsedAt || 0) > TOUCH_MS) sessions.update(s.id, { lastUsedAt: t });
    return s;
  }

  const publicSession = (s, currentId = null) => ({ id: s.id, label: s.label, via: s.via, createdAt: s.createdAt, lastUsedAt: s.lastUsedAt, expiresAt: s.expiresAt, current: s.id === currentId });
  const listSessions = (currentId = null) => sessions.all().filter((s) => s.expiresAt > now() && ownerOk(s)).sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0)).map((s) => publicSession(s, currentId));

  /** Ein Gerät abmelden – seine offenen Admin-Codes gleich mit. */
  function revokeSession(id) {
    if (!sessions.remove(id)) return false;
    revokeAdminCodes((d) => d.createdBy !== `session:${id}`);
    return true;
  }

  /**
   * Alle anderen Geräte abmelden. Dazu alle offenen Admin-Codes, die nicht von diesem Gerät stammen –
   * sonst könnte ein abgemeldetes Gerät vorher noch einen Kopplungs-Code erstellt haben.
   */
  function revokeOtherSessions(exceptId = null) {
    let n = 0;
    for (const s of sessions.all()) {
      if (s.id === exceptId) continue;
      sessions.remove(s.id);
      n++;
    }
    const codesRevoked = revokeAdminCodes((d) => exceptId && d.createdBy === `session:${exceptId}`);
    return { sessions: n, codes: codesRevoked };
  }

  const getCode = (id) => (typeof id === 'string' ? codes.get(id) : null);

  return { create, find, check, consume, revoke, revokeOthers, listActive, prune, state, getCode, ownerOk, createSession, sessionByToken, publicSession, listSessions, revokeSession, revokeOtherSessions };
}

/**
 * Routen. admin(req) → Admin oder 403 (inkl. sessionId bei Admin-Sitzungen), player(req) → Spieler:in.
 * lim: { setup, setupInfo, invite } – eigene, knappe Grenzen pro IP wie beim Café-Login (Einladungen:
 * pro Konto knapp, pro IP großzügig – viele Freiwillige teilen sich bei einem Treffen ein WLAN).
 */
export function mountSetup({ r, engine, setup, admin, player, partnerSessions, lim, publicUrl = '' }) {
  const store = engine.ctx.store;
  const pub = String(publicUrl || '').replace(/\/+$/, '');
  const pathFor = (purpose, code) => `/${LINK_PATHS[purpose]}${code}`;
  const codeOf = (body) => (typeof body.code === 'string' ? body.code.trim() : '');

  /** Café bereit für die Einrichtung: Partner, freigegeben, aktiv. */
  function readyCafe(placeId) {
    const p = typeof placeId === 'string' ? store.places.get(placeId) : null;
    return p && p.type === 'partner' && p.status === 'approved' && p.active !== false ? p : null;
  }

  function publicCode(d) {
    const place = d.placeId ? store.places.get(d.placeId) : null;
    return { id: d.id, purpose: d.purpose, createdAt: d.createdAt, expiresAt: d.expiresAt, maxUses: d.maxUses, uses: d.uses || 0, placeId: d.placeId || null, placeName: place ? place.name : null, via: d.via };
  }

  // ---- Moderation: Codes anlegen, auflisten, widerrufen
  r.post('/api/admin/setup-codes', async ({ req }) => {
    const a = admin(req);
    const body = await readJson(req);
    const purpose = String(body.purpose || '');
    let placeId = null;
    if (purpose === 'partner') {
      const place = readyCafe(body.placeId);
      if (!place) throw new HttpError(400, 'cafe_not_ready', 'Nur freigegebene, aktive Partner-Cafés');
      placeId = place.id;
    }
    const createdBy = a.sessionId ? `session:${a.sessionId}` : a.id;
    const { doc, code } = setup.create({ purpose, placeId, maxUses: body.maxUses, owner: ownerOf(a), createdBy, via: body.via === 'terminal' ? 'terminal' : 'admin' });
    if (purpose === 'partner') setup.revokeOthers(doc);
    const p = pathFor(purpose, code);
    return { status: 201, body: { ...publicCode(doc), code, path: p, url: pub ? pub + p : null } };
  });
  r.get('/api/admin/setup-codes', ({ req }) => {
    admin(req);
    return setup.listActive().map(publicCode);
  });
  // Zustand eines Codes (die QR-Karte fragt alle paar Sekunden: offen · benutzt · ungültig · abgelaufen)
  r.get('/api/admin/setup-codes/:id', ({ req, params }) => {
    admin(req);
    const d = setup.getCode(params.id);
    if (!d) throw new HttpError(404, 'not_found');
    return { ...publicCode(d), state: setup.state(d) };
  });
  r.delete('/api/admin/setup-codes/:id', ({ req, params }) => {
    admin(req);
    return setup.revoke(params.id);
  });

  // ---- Moderation: Geräte (Admin-Sitzungen)
  r.get('/api/admin/sessions', ({ req }) => {
    const a = admin(req);
    return { current: a.sessionId || null, sessions: setup.listSessions(a.sessionId || null) };
  });
  // Anmeldung mit dem ADMIN_TOKEN → eigene Sitzung für dieses Gerät (der Token selbst wird nicht gespeichert)
  // Ohne „Gerät merken“ (remember ≠ true) gilt die Sitzung nur 12 Stunden – der Tab vergisst sie ohnehin.
  r.post('/api/admin/sessions', async ({ req }) => {
    const a = admin(req);
    const body = await readJson(req);
    const ttlMs = body.remember === true ? SESSION_TTL_MS : SESSION_SHORT_MS;
    const { token, doc } = setup.createSession({ label: deviceLabel(req.headers['user-agent']), via: 'login', owner: ownerOf(a), ttlMs });
    return { status: 201, body: { token, session: setup.publicSession(doc, doc.id) } };
  });
  r.post('/api/admin/sessions/revoke-others', ({ req }) => {
    const a = admin(req);
    const out = setup.revokeOtherSessions(a.sessionId || null);
    return { ok: true, revoked: out.sessions, revokedCodes: out.codes };
  });
  r.delete('/api/admin/sessions/:id', ({ req, params }) => {
    admin(req);
    if (!setup.revokeSession(params.id)) throw new HttpError(404, 'not_found');
    return { ok: true };
  });
  r.post('/api/admin/logout', ({ req }) => {
    const a = admin(req);
    if (a.sessionId) setup.revokeSession(a.sessionId);
    return { ok: true };
  });

  // ---- Einlösen (öffentlich, Code nur im Body)
  r.post('/api/setup/info', async ({ req, ip }) => {
    lim.setupInfo.take(ip);
    const body = await readJson(req);
    const d = setup.check(codeOf(body), body.purpose ? String(body.purpose) : null);
    const out = { purpose: d.purpose, expiresAt: d.expiresAt, maxUses: d.maxUses, uses: d.uses || 0 };
    if (d.purpose === 'partner') {
      const place = readyCafe(d.placeId);
      if (!place) throw new HttpError(409, 'cafe_not_ready', 'Café ist nicht freigegeben');
      out.cafe = { id: place.id, name: place.name, address: place.address || '' };
    }
    return out;
  });

  r.post('/api/setup/admin', async ({ req, ip }) => {
    lim.setup.take(ip);
    const body = await readJson(req);
    // ab hier synchron: prüfen → verbrauchen → Sitzung (zwei gleichzeitige Versuche: genau einer gewinnt)
    const d = setup.check(codeOf(body), 'admin');
    setup.consume(d);
    // das neue Gerät gehört demselben Besitzer wie der Code (ADMIN_TOKEN oder Admin-Spielerkonto)
    const { token, doc } = setup.createSession({ label: deviceLabel(req.headers['user-agent']), via: 'qr', codeId: d.id, owner: d.owner });
    return { status: 201, body: { token, session: setup.publicSession(doc, doc.id) } };
  });

  r.post('/api/setup/partner', async ({ req, ip }) => {
    lim.setup.take(ip);
    const body = await readJson(req);
    const d = setup.check(codeOf(body), 'partner');
    const place = readyCafe(d.placeId);
    if (!place) throw new HttpError(409, 'cafe_not_ready', 'Café ist nicht freigegeben');
    const pin = String(body.pin ?? '');
    // falsche oder zu leichte PIN → 400, der Code bleibt gültig
    if (weakPin(pin)) throw new HttpError(400, 'weak_pin', 'Diese PIN ist zu leicht zu raten');
    const pinHash = hashPin(pin);
    setup.consume(d);
    store.places.update(place.id, { pinHash });
    partnerSessions.revokePartner(place.id); // alte Sitzungen (alte PIN) sind beendet
    return { status: 201, body: { token: partnerSessions.create(place.id), partner: engine.publicPlace(store.places.get(place.id)) } };
  });

  r.post('/api/invites/redeem', async ({ req, ip }) => {
    // Pro IP großzügig (Treffen von Freiwilligen im selben WLAN), pro Konto knapp
    lim.invite.take(ip);
    const p = player(req, { allowBanned: true });
    lim.setup.take(`player:${p.id}`);
    const body = await readJson(req);
    if (p.banned) throw new HttpError(403, 'banned', 'Konto gesperrt');
    const d = setup.check(codeOf(body), 'volunteer');
    // Nie herabstufen (Moderation bleibt Moderation), nie heraufstufen über volunteer hinaus
    if (p.role === 'admin' || p.role === 'volunteer') return { role: p.role, changed: false, player: engine.publicPlayer(p) };
    setup.consume(d);
    store.players.update(p.id, { role: 'volunteer' });
    return { role: 'volunteer', changed: true, player: engine.publicPlayer(store.players.get(p.id)) };
  });

  return { bearerSession: (req) => setup.sessionByToken(bearer(req)) };
}
