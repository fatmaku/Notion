// LADEKLAR domain engine. Pure JavaScript, no dependencies: the Node server runs it on SQLite,
// the browser demo runs the very same code on an in-memory replica. Every rule that matters
// (tenant isolation, roles, licence state, seat limits, the delivery status machine,
// notifications) lives here, so both transports behave identically and are tested once.
//
//   const engine = createEngine({ store, now, newId, hash, onEvent });
//   engine.call(actor, 'createDelivery', { ... })
//
// store: synchronous { get(col,id), find(col, where), put(col, doc), del(col, id), tx(fn) }
// hash:  { make(secret) -> string, verify(secret, stored) -> boolean }
// onEvent(evt): { type:'change', tenantId, col, id, drivers?, allDrivers? } | { type:'notify', userId, notification }

import { NOTIFY_TEXT, fill, pickLang, statusText, problemText, PROBLEMS } from './texts.js';

export const VERSION = '1.0.0';

export const PLANS = {
  start: { id: 'start', name: 'Start', price: 49, drivers: 3, extraDriver: null, vehicles: 6, staff: 1, storageGB: 5, api: false, domain: 'none' },
  flotte: { id: 'flotte', name: 'Flotte', price: 129, drivers: 15, extraDriver: 7, vehicles: 40, staff: 5, storageGB: 50, api: false, domain: 'subdomain' },
  premium: { id: 'premium', name: 'Premium', price: 299, drivers: 40, extraDriver: 6, vehicles: null, staff: null, storageGB: 250, api: true, domain: 'custom' },
};
export const STORE_APP = { setup: 1990, monthly: 99 };
export const VAT = 0.19;
export const TRIAL_DAYS = 30;

export const STATUSES = ['open', 'accepted', 'arrived_pickup', 'loaded', 'arrived_dropoff', 'unloaded', 'delivered', 'cancelled'];
export const ACTIVE = ['accepted', 'arrived_pickup', 'loaded', 'arrived_dropoff', 'unloaded'];
export const DONE = ['delivered', 'cancelled'];
const PROGRESS = { open: 0, accepted: 1, arrived_pickup: 2, loaded: 3, arrived_dropoff: 4, unloaded: 5, delivered: 6, cancelled: -1 };

export const VEHICLE_TYPES = {
  truck: ['sattelzug', 'solo', 'gliederzug', 'kuehlkoffer', 'kipper', 'tank', 'transporter'],
  trailer: ['plane', 'kuehl', 'kipper', 'container', 'tieflader', 'koffer'],
};
export const VEHICLE_FEATURES = ['ladebordwand', 'kuehlung', 'adr', 'mitnahmestapler', 'hebebuehne', 'kran'];

export const DEFAULT_SETTINGS = {
  driverPicksTruck: true, // drivers choose their truck/trailer from the pool
  driverTakesOpen: true, // drivers may take deliveries that are open for everyone
  requirePod: true, // delivery note photo required before finishing
  requireSignature: false, // receiver signs on the display
  trackArrival: false, // extra "arrived" taps → waiting time (Standgeld)
  palletExchange: false, // pallet exchange counter when unloading
  driveLock: true, // cover the buttons while the truck is moving
  geoOnStatus: false, // store the position only at the moment of a status change
  retentionYears: 3, // how long finished deliveries + delivery notes are kept (1–10 years)
  reportsByDriver: true, // per-driver statistics (may need a works agreement, § 87 BetrVG)
  bookingPrefix: '',
};

export const UNDO_MS = 2 * 60 * 1000;
const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60 * 1000;
const NOTIFY_KEEP = 100;

export class EngineError extends Error {
  constructor(code, message, status = 400, details) {
    super(message);
    this.code = code;
    this.status = status;
    if (details) this.details = details;
  }
}
const fail = (code, message, status = 400, details) => { throw new EngineError(code, message, status, details); };

// ---------- small helpers ----------
const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
const str = (v, max = 200) => (v == null ? '' : String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max));
const text = (v, max = 2000) => (v == null ? '' : String(v).replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max));
const num = (v, min = 0, max = 1e9) => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null; };
const bool = (v) => v === true || v === 'true' || v === 1 || v === 'on';
export const normPhone = (v) => { let s = str(v, 40).replace(/[^\d+]/g, ''); if (s.startsWith('00')) s = '+' + s.slice(2); if (s.startsWith('0')) s = '+49' + s.slice(1); return s; };
export const normPlate = (v) => str(v, 20).toUpperCase().replace(/\s+/g, ' ').replace(/\s*-\s*/g, '-');
const normEmail = (v) => str(v, 160).toLowerCase();
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

const berlinParts = (ms) => {
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms))) p[x.type] = x.value;
  return p;
};
export const berlinDate = (ms) => { const p = berlinParts(ms); return `${p.year}-${p.month}-${p.day}`; };
export const berlinTime = (ms) => { const p = berlinParts(ms); return `${p.hour}:${p.minute}`; };
const deDate = (iso) => (isDate(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.` : '');
/** 23:59:59 German time on the given ISO day (CET or CEST). */
export const berlinEndOfDay = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  let x = Date.UTC(y, m - 1, d, 22, 59, 59);
  if (berlinDate(x) !== iso) x -= 3600e3;
  return x;
};
const monthIndex = (ym) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;
const monthOf = (ms) => berlinDate(ms).slice(0, 7);
const monthLabel = (idx) => `${String((idx % 12) + 1).padStart(2, '0')}/${Math.floor(idx / 12)}`;
const normHost = (v) => str(v, 253).toLowerCase().replace(/^https?:\/\//, '').replace(/[/:].*$/, '').replace(/\.$/, '');
const isHost = (h) => /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(h);

export const routeLabel = (d) => `${d.pickup?.city || d.pickup?.place || '?'} → ${d.dropoff?.city || d.dropoff?.place || '?'}`;
export const progressOf = (status) => PROGRESS[status] ?? 0;

export function planOf(tenant) { return PLANS[tenant?.plan] || PLANS.start; }
export function driverSeats(tenant) { const p = planOf(tenant); return p.drivers + (p.extraDriver ? Math.max(0, tenant.extraDrivers || 0) : 0); }
export function monthlyPrice(tenant) {
  const p = planOf(tenant);
  return p.price + (p.extraDriver ? Math.max(0, tenant.extraDrivers || 0) * p.extraDriver : 0) + (tenant.storeApp ? STORE_APP.monthly : 0);
}
export function licenseState(tenant, now) {
  if (!tenant) return 'none';
  if (tenant.status === 'suspended') return 'suspended';
  if (tenant.status === 'cancelled') return 'cancelled';
  if (tenant.status === 'trial') return tenant.trialEnd && tenant.trialEnd < now ? 'expired' : 'trial';
  if (tenant.licenseEnd && tenant.licenseEnd < now) return 'expired';
  return 'active';
}
const writable = (tenant, now) => ['trial', 'active'].includes(licenseState(tenant, now));

/** Next step a driver can tap for this delivery, or null. */
export function nextStep(d, settings = DEFAULT_SETTINGS) {
  switch (d.status) {
    case 'open': return 'accepted';
    case 'accepted': return settings.trackArrival ? 'arrived_pickup' : 'loaded';
    case 'arrived_pickup': return 'loaded';
    case 'loaded': return settings.trackArrival ? 'arrived_dropoff' : 'unloaded';
    case 'arrived_dropoff': return 'unloaded';
    case 'unloaded': return 'delivered';
    default: return null;
  }
}

/** Steps shown in the progress bar for a delivery under the given settings. */
export function stepsFor(settings = DEFAULT_SETTINGS) {
  return settings.trackArrival
    ? ['accepted', 'arrived_pickup', 'loaded', 'arrived_dropoff', 'unloaded', 'delivered']
    : ['accepted', 'loaded', 'unloaded', 'delivered'];
}

/** Minutes waited at the ramps, from the arrival taps (null when not tracked). */
export function waitingMinutes(d) {
  const at = (type) => (d.events || []).filter((e) => e.type === type && !e.undone).map((e) => e.at).pop();
  const pairs = [['arrived_pickup', 'loaded'], ['arrived_dropoff', 'unloaded']];
  let total = null;
  for (const [a, b] of pairs) {
    const ta = at(a), tb = at(b);
    if (ta && tb && tb > ta) total = (total || 0) + Math.round((tb - ta) / 60000);
  }
  return total;
}

function cleanPlace(p = {}) {
  return {
    place: str(p.place, 120), street: str(p.street, 120), zip: str(p.zip, 12), city: str(p.city, 80),
    country: str(p.country || 'DE', 3).toUpperCase(), date: isDate(p.date) ? p.date : '',
    from: isTime(p.from) ? p.from : '', to: isTime(p.to) ? p.to : '',
    contact: str(p.contact, 80), phone: str(p.phone, 40),
  };
}

function genPin(rand) { let s = ''; for (let i = 0; i < 6; i++) s += Math.floor(rand() * 10); return s; }
function genPassword(rand) {
  const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = ''; for (let i = 0; i < 12; i++) s += a[Math.floor(rand() * a.length)];
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8);
}
const genApiKey = (newId) => 'lk_' + newId() + newId();

// Public view of a user (never hashes, lock counters or secrets).
export function publicUser(u) {
  if (!u) return null;
  const { passwordHash, pinHash, failedLogins, lockedUntil, ...rest } = u;
  return rest;
}
function publicTenant(t, { full = false } = {}) {
  if (!t) return null;
  const base = {
    id: t.id, code: t.code, name: t.name, branding: t.branding, phone: t.phone, status: t.status,
    settings: { ...DEFAULT_SETTINGS, ...t.settings },
  };
  if (!full) return base;
  const { apiKey, ...rest } = t;
  return { ...rest, settings: base.settings, apiKeySet: !!apiKey };
}

// ========================================================================================
export function createEngine({ store, now = () => Date.now(), newId, hash, onEvent = () => {}, rand = Math.random }) {
  if (!store || !newId || !hash) throw new Error('createEngine needs store, newId and hash');

  // Events raised inside call() are held back until the write has committed.
  let pending = null;
  const deliver = (evt) => { try { onEvent(evt); } catch (e) { /* listeners must never break a write */ } };
  const emit = (evt) => { if (pending) pending.push(evt); else deliver(evt); };
  const getT = (id) => store.get('tenants', id);
  let ctx = null; // context of the running call from the transport, e.g. { ip } on the server
  const audit = (actor, action, target, extra, meta = ctx) => {
    store.put('audit', { id: newId(), at: now(), tenantId: actor?.tenantId || null, actorId: actor?.id || null, role: actor?.role || null, action, target: target || null, ...(extra ? { extra } : {}), ...(meta?.ip ? { ip: str(meta.ip, 64) } : {}) });
  };

  // ---------- notifications ----------
  let ordSeq = 0;
  const byNewest = (a, b) => (b.ord || b.at * 1000) - (a.ord || a.at * 1000);
  function notify(userIds, type, params, { deliveryId = null, priority = 'normal', tenantId = null } = {}) {
    const seen = new Set();
    for (const uid of userIds) {
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      const u = store.get('users', uid);
      if (!u || !u.active) continue;
      const lang = pickLang(u.lang);
      const tpl = (NOTIFY_TEXT[lang] || NOTIFY_TEXT.de)[type] || NOTIFY_TEXT.de[type];
      const p = { ...params };
      if (params.status) p.status = statusText(lang, params.status);
      if (params.problem) p.problem = problemText(lang, params.problem);
      const n = { id: newId(), tenantId: tenantId || u.tenantId, userId: uid, type, title: fill(tpl[0], p), body: fill(tpl[1], p), deliveryId, priority, at: now(), ord: now() * 1000 + (ordSeq++ % 1000), read: false };
      store.put('notifications', n);
      const all = store.find('notifications', { userId: uid });
      if (all.length > NOTIFY_KEEP) all.sort(byNewest).slice(NOTIFY_KEEP).forEach((x) => store.del('notifications', x.id));
      emit({ type: 'notify', userId: uid, notification: n });
    }
  }
  const staffIds = (tenantId) => store.find('users', { tenantId }).filter((u) => u.active && (u.role === 'admin' || u.role === 'dispatcher')).map((u) => u.id);
  const driverIds = (tenantId) => store.find('users', { tenantId, role: 'driver' }).filter((u) => u.active).map((u) => u.id);
  const changed = (col, doc, extra = {}) => emit({ type: 'change', tenantId: doc.tenantId || null, col, id: doc.id, ...extra });
  const deliveryChanged = (d) => changed('deliveries', d, d.status === 'open' && !d.driverId && d.openForAll ? { allDrivers: true } : { drivers: d.driverId ? [d.driverId] : [] });

  // ---------- access helpers ----------
  function tenantOf(actor) {
    if (!actor?.tenantId) fail('forbidden', 'Kein Unternehmen zugeordnet.', 403);
    const t = getT(actor.tenantId);
    if (!t) fail('not_found', 'Unternehmen nicht gefunden.', 404);
    return t;
  }
  const settingsOf = (t) => ({ ...DEFAULT_SETTINGS, ...(t.settings || {}) });
  function scoped(col, id, actor) {
    const doc = store.get(col, id);
    if (!doc || doc.tenantId !== actor.tenantId) fail('not_found', 'Nicht gefunden.', 404);
    return doc;
  }
  function visibleToDriver(d, me, t) {
    if (d.driverId === me.id) return true;
    return d.status === 'open' && !d.driverId && d.openForAll && settingsOf(t).driverTakesOpen;
  }
  function deliveryFor(actor, id) {
    const d = scoped('deliveries', id, actor);
    if (actor.role === 'driver' && !visibleToDriver(d, actor, getT(actor.tenantId))) fail('not_found', 'Nicht gefunden.', 404);
    return clone(d);
  }
  const userName = (id) => (id ? store.get('users', id)?.name || '–' : '');
  const vehiclePlate = (id) => (id ? store.get('vehicles', id)?.plate || '' : '');

  function decorate(d, actor) {
    const t = getT(d.tenantId);
    const s = settingsOf(t);
    const out = clone(d);
    out.route = routeLabel(d);
    out.driverName = userName(d.driverId);
    out.vehiclePlate = vehiclePlate(d.vehicleId);
    out.trailerPlate = vehiclePlate(d.trailerId);
    out.next = nextStep(d, s);
    out.steps = stepsFor(s);
    out.waitingMinutes = waitingMinutes(d);
    out.lastAt = (d.events || []).length ? d.events[d.events.length - 1].at : d.createdAt;
    out.events = (d.events || []).map((e) => ({ ...e, byName: userName(e.by) }));
    out.notes = (d.notes || []).map((n) => ({ ...n, byName: userName(n.by) }));
    const last = [...(d.events || [])].reverse().find((e) => !e.undone && STATUSES.includes(e.type));
    out.canUndo = !!(last && last.by === actor?.id && last.from && now() - last.at < UNDO_MS && actor?.role === 'driver');
    out.undoUntil = out.canUndo ? last.at + UNDO_MS : null;
    if (actor?.role === 'driver') { delete out.internalNote; }
    return out;
  }

  function addEvent(d, actor, type, extra = {}) {
    d.events = d.events || [];
    const e = { id: newId(), at: now(), type, by: actor?.id || null, role: actor?.role || null, ...extra };
    d.events.push(e);
    if (d.events.length > 200) d.events = d.events.slice(-200);
    d.updatedAt = e.at;
    return e;
  }

  // ---------- validation of delivery input ----------
  function deliveryInput(t, input, existing) {
    const d = existing ? clone(existing) : {};
    if ('customer' in input) d.customer = str(input.customer, 120);
    if ('reference' in input) d.reference = str(input.reference, 60);
    if ('pickup' in input) d.pickup = cleanPlace({ ...(d.pickup || {}), ...input.pickup });
    if ('dropoff' in input) d.dropoff = cleanPlace({ ...(d.dropoff || {}), ...input.dropoff });
    if ('goods' in input) {
      const g = input.goods || {};
      d.goods = { text: str(g.text, 200), pallets: num(g.pallets, 0, 99), weightKg: num(g.weightKg, 0, 60000), adr: bool(g.adr), temp: str(g.temp, 30) };
    }
    if ('instructions' in input) d.instructions = text(input.instructions, 1000);
    if ('internalNote' in input) d.internalNote = text(input.internalNote, 1000);
    if ('urgent' in input) d.urgent = bool(input.urgent);
    if ('openForAll' in input) d.openForAll = bool(input.openForAll);
    for (const k of ['driverId', 'vehicleId', 'trailerId']) {
      if (!(k in input)) continue;
      const v = input[k] || null;
      if (v) {
        const col = k === 'driverId' ? 'users' : 'vehicles';
        const x = store.get(col, v);
        if (!x || x.tenantId !== t.id || x.active === false) fail('invalid', k === 'driverId' ? 'Fahrer nicht gefunden.' : 'Fahrzeug nicht gefunden.');
        if (k === 'driverId' && x.role !== 'driver') fail('invalid', 'Nur Fahrer können Lieferungen bekommen.');
        if (k === 'vehicleId' && x.kind !== 'truck') fail('invalid', 'Bitte eine Zugmaschine/LKW wählen.');
        if (k === 'trailerId' && x.kind !== 'trailer') fail('invalid', 'Bitte einen Auflieger/Anhänger wählen.');
      }
      d[k] = v;
    }
    const pc = d.pickup?.city || d.pickup?.place, dc = d.dropoff?.city || d.dropoff?.place;
    if (!pc || !dc) fail('invalid', 'Bitte Lade- und Entladeort angeben (z. B. Stuttgart → Hamburg).', 400, { fields: ['pickup.city', 'dropoff.city'] });
    if (!d.pickup.date) fail('invalid', 'Bitte das Ladedatum angeben.', 400, { fields: ['pickup.date'] });
    if (d.dropoff.date && d.dropoff.date < d.pickup.date) fail('invalid', 'Das Entladedatum liegt vor dem Ladedatum.', 400, { fields: ['dropoff.date'] });
    return d;
  }

  // PREFIX-YYMM-NNNN: the running number starts at 0001 every month and is unique per company.
  function nextBookingNo(t) {
    const tt = clone(t);
    const p = berlinParts(now());
    const ym = p.year.slice(2) + p.month;
    if (tt.bookingSeqMonth && tt.bookingSeqMonth !== ym) tt.bookingSeq = 0;
    tt.bookingSeqMonth = ym;
    const prefix = (settingsOf(tt).bookingPrefix || tt.code.slice(0, 3)).toUpperCase();
    const taken = new Set(store.find('deliveries', { tenantId: tt.id }).map((d) => d.bookingNo));
    let no;
    do { tt.bookingSeq = (tt.bookingSeq || 0) + 1; no = `${prefix}-${ym}-${String(tt.bookingSeq).padStart(4, '0')}`; } while (taken.has(no));
    store.put('tenants', tt);
    return no;
  }

  function seatCheck(t, role) {
    const users = store.find('users', { tenantId: t.id }).filter((u) => u.active);
    const p = planOf(t);
    if (role === 'driver') {
      const max = driverSeats(t);
      if (users.filter((u) => u.role === 'driver').length >= max) fail('seat_limit', `Ihr Tarif „${p.name}“ umfasst ${max} Fahrer. Für weitere Fahrer bitte Tarif erweitern.`, 409, { max });
    } else if (p.staff != null && users.filter((u) => u.role !== 'driver').length >= p.staff + 1) {
      fail('seat_limit', `Ihr Tarif „${p.name}“ umfasst ${p.staff} Disponenten-Zugang/Zugänge plus Admin.`, 409, { max: p.staff });
    }
  }

  function emailTaken(email, exceptId) {
    return store.find('users', { email }).some((u) => u.id !== exceptId);
  }

  // ---------- login ----------
  function checkLock(u) {
    if (u.lockedUntil && u.lockedUntil > now()) fail('locked', 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.', 429, { until: u.lockedUntil });
  }
  function loginFailed(u) {
    const x = clone(u);
    x.failedLogins = (x.failedLogins || 0) + 1;
    if (x.failedLogins >= LOCK_AFTER) { x.lockedUntil = now() + LOCK_MS; x.failedLogins = 0; }
    store.put('users', x);
  }
  function loginOk(u, meta) {
    const x = clone(u);
    x.failedLogins = 0; x.lockedUntil = null; x.lastLoginAt = now();
    store.put('users', x);
    audit(x, 'login', x.id, null, meta);
    return x;
  }
  // failed logins go into the company's log (with IP on the server) – the account owner can see them
  const loginRefused = (u, meta, extra, code, message, status = 401) => {
    audit(u ? { id: u.id, tenantId: u.tenantId, role: u.role } : extra?.tenantId ? { tenantId: extra.tenantId } : null, 'login.failed', u?.id || null, { reason: code, ...(extra?.who ? { who: extra.who } : {}) }, meta);
    fail(code, message, status);
  };

  const auth = {
    /** Staff and platform login with e-mail + password. meta: { ip } from the transport. */
    login({ email, password } = {}, meta = null) {
      const e = normEmail(email);
      const u = store.find('users', { email: e })[0];
      if (!u || !u.active || u.role === 'driver') loginRefused(null, meta, { who: e }, 'bad_login', 'E-Mail oder Passwort ist falsch.');
      checkLock(u);
      if (!hash.verify(String(password || ''), u.passwordHash)) { loginFailed(u); loginRefused(u, meta, null, 'bad_login', 'E-Mail oder Passwort ist falsch.'); }
      if (u.tenantId) {
        const t = getT(u.tenantId);
        // after a cancellation only the admin may still sign in – read-only, to export the data
        if (!t || (licenseState(t, now()) === 'cancelled' && u.role !== 'admin')) fail('license_inactive', 'Der Zugang dieses Unternehmens ist beendet. Nur der Admin kann die Daten noch exportieren.', 403);
      }
      return publicUser(loginOk(u, meta));
    },
    /** Driver login with company code + phone (or personal number) + 6-digit PIN. */
    driverLogin({ code, phone, pin } = {}, meta = null) {
      const t = store.find('tenants', { code: str(code, 20).toUpperCase() })[0];
      if (!t) fail('bad_login', 'Firmencode, Telefonnummer oder PIN ist falsch.', 401);
      const p = normPhone(phone);
      const u = store.find('users', { tenantId: t.id, role: 'driver' }).find((x) => x.phone === p || (x.personalNo && x.personalNo === str(phone, 20)));
      if (!u || !u.active) loginRefused(null, meta, { tenantId: t.id, who: p }, 'bad_login', 'Firmencode, Telefonnummer oder PIN ist falsch.');
      checkLock(u);
      if (!hash.verify(String(pin || ''), u.pinHash)) { loginFailed(u); loginRefused(u, meta, null, 'bad_login', 'Firmencode, Telefonnummer oder PIN ist falsch.'); }
      if (['cancelled', 'suspended', 'expired'].includes(licenseState(t, now()))) fail('license_inactive', 'Der Zugang ist zurzeit gesperrt. Bitte die Disposition anrufen.', 403);
      return publicUser(loginOk(u, meta));
    },
    /** Driver login from an invite link: the link carries the user id, the driver types only the PIN. */
    inviteLogin({ userId, pin } = {}, meta = null) {
      const u = store.get('users', str(userId, 64));
      if (!u || u.role !== 'driver' || !u.active) fail('bad_login', 'Einladung ungültig oder PIN falsch.', 401);
      const t = getT(u.tenantId);
      return auth.driverLogin({ code: t.code, phone: u.phone, pin }, meta);
    },
    /** Resolve a session's user id to the current actor (null when deactivated). */
    actor(userId) {
      const u = store.get('users', userId);
      if (!u || !u.active) return null;
      return publicUser(u);
    },
    /** Branding for the login screen of a company code (public). */
    publicTenant(code) {
      const t = store.find('tenants', { code: str(code, 20).toUpperCase() })[0];
      if (!t || t.status === 'cancelled') return null;
      return { code: t.code, name: t.name, branding: t.branding, phone: t.phone };
    },
    inviteInfo(userId) {
      const u = store.get('users', str(userId, 64));
      if (!u || u.role !== 'driver' || !u.active) return null;
      const t = getT(u.tenantId);
      return { userId: u.id, name: u.name.split(' ')[0], lang: u.lang, tenant: { code: t.code, name: t.name, branding: t.branding, phone: t.phone } };
    },
  };

  // ========================================================================================
  // Methods callable through engine.call(actor, name, args). `roles` lists who may call;
  // `write` marks methods that need an active licence (trial or paid).
  const M = {};
  const def = (name, roles, fn, opts = {}) => { M[name] = { roles, fn, write: !!opts.write }; };
  const STAFF = ['admin', 'dispatcher'];
  const TENANT = ['admin', 'dispatcher', 'driver'];

  // ---------- session / profile ----------
  def('me', [...TENANT, 'platform'], (a) => {
    const t = a.tenantId ? getT(a.tenantId) : null;
    return {
      user: publicUser(store.get('users', a.id)),
      tenant: t ? publicTenant(t, { full: a.role === 'admin' }) : null,
      license: t ? { state: licenseState(t, now()), plan: planOf(t), trialEnd: t.trialEnd || null, licenseEnd: t.licenseEnd || null, driverSeats: driverSeats(t) } : null,
      unread: store.find('notifications', { userId: a.id }).filter((n) => !n.read).length,
    };
  });
  def('updateProfile', [...TENANT, 'platform'], (a, { lang, name, geoConsent }) => {
    const u = clone(store.get('users', a.id));
    if (lang) u.lang = pickLang(lang);
    if (geoConsent !== undefined && a.role === 'driver') { u.geoConsent = bool(geoConsent); u.geoConsentAt = now(); audit(a, u.geoConsent ? 'geo.consent' : 'geo.withdraw', u.id); }
    if (name && a.role !== 'driver') u.name = str(name, 80) || u.name;
    store.put('users', u);
    return publicUser(u);
  });
  def('changePassword', ['admin', 'dispatcher', 'platform'], (a, { current, next }) => {
    const u = clone(store.get('users', a.id));
    if (!hash.verify(String(current || ''), u.passwordHash)) fail('bad_login', 'Das aktuelle Passwort stimmt nicht.', 400);
    if (String(next || '').length < 10) fail('invalid', 'Das neue Passwort braucht mindestens 10 Zeichen.');
    u.passwordHash = hash.make(String(next));
    u.mustChangePassword = false;
    store.put('users', u);
    audit(a, 'password.change', u.id);
    return { ok: true };
  });

  // ---------- notifications ----------
  def('listNotifications', [...TENANT, 'platform'], (a, { limit = 30 } = {}) =>
    store.find('notifications', { userId: a.id }).sort(byNewest).slice(0, Math.min(100, limit)));
  def('markNotificationsRead', [...TENANT, 'platform'], (a, { ids } = {}) => {
    let n = 0;
    for (const x of store.find('notifications', { userId: a.id })) {
      if (!x.read && (!ids || ids.includes(x.id))) { store.put('notifications', { ...x, read: true }); n++; }
    }
    return { marked: n };
  });

  // ---------- platform (licensor) ----------
  function usage(t) {
    const users = store.find('users', { tenantId: t.id }).filter((u) => u.active);
    const ds = store.find('deliveries', { tenantId: t.id });
    const month = berlinDate(now()).slice(0, 7);
    const last = ds.reduce((m, d) => Math.max(m, d.updatedAt || 0), 0);
    return {
      drivers: users.filter((u) => u.role === 'driver').length,
      staff: users.filter((u) => u.role !== 'driver').length,
      vehicles: store.find('vehicles', { tenantId: t.id }).filter((v) => v.active !== false).length,
      deliveriesMonth: ds.filter((d) => berlinDate(d.createdAt).slice(0, 7) === month).length,
      deliveriesTotal: ds.length,
      lastActivity: last || null,
    };
  }
  function licenseView(t) {
    return {
      id: t.id, code: t.code, name: t.name, legalName: t.legalName || '', vatId: t.vatId || '', contact: t.contact, email: t.email, phone: t.phone, address: t.address,
      plan: t.plan, extraDrivers: t.extraDrivers || 0, storeApp: !!t.storeApp, status: t.status, state: licenseState(t, now()), domains: t.domains || [],
      trialEnd: t.trialEnd || null, licenseEnd: t.licenseEnd || null, paidSince: t.paidSince || null, createdAt: t.createdAt, branding: t.branding,
      licenseNote: t.licenseNote || '', billing: t.billing || 'monthly', seats: driverSeats(t), monthly: monthlyPrice(t), usage: usage(t),
    };
  }
  def('listTenants', ['platform'], () => store.find('tenants', {}).sort((a, b) => b.createdAt - a.createdAt).map(licenseView));
  def('getTenantLicense', ['platform'], (a, { id }) => { const t = getT(id); if (!t) fail('not_found', 'Lizenznehmer nicht gefunden.', 404); return licenseView(t); });

  def('createTenant', ['platform'], (a, input) => {
    const name = str(input.name, 120);
    if (!name) fail('invalid', 'Bitte den Firmennamen angeben.', 400, { fields: ['name'] });
    let code = str(input.code || name.replace(/[^A-Za-z0-9]/g, '').slice(0, 8), 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 3) fail('invalid', 'Der Firmencode braucht mindestens 3 Buchstaben/Ziffern.', 400, { fields: ['code'] });
    if (store.find('tenants', { code }).length) fail('conflict', `Der Firmencode ${code} ist schon vergeben.`, 409, { fields: ['code'] });
    const plan = PLANS[input.plan] ? input.plan : 'start';
    const adminEmail = normEmail(input.adminEmail);
    if (!isEmail(adminEmail)) fail('invalid', 'Bitte eine gültige E-Mail für den Admin-Zugang angeben.', 400, { fields: ['adminEmail'] });
    if (emailTaken(adminEmail)) fail('conflict', 'Diese E-Mail hat schon einen Zugang.', 409, { fields: ['adminEmail'] });
    const trialDays = num(input.trialDays, 0, 365) ?? TRIAL_DAYS;
    if (bool(input.storeApp) && plan !== 'premium') fail('invalid', 'Die White-Label-App im Store ist ein Zusatz zum Tarif Premium.', 400, { fields: ['storeApp'] });
    const t = {
      id: newId(), code, name, legalName: str(input.legalName || name, 160), contact: str(input.contact, 80),
      email: adminEmail, phone: str(input.phone, 40), address: str(input.address, 200), vatId: str(input.vatId, 30),
      plan, extraDrivers: PLANS[plan].extraDriver ? num(input.extraDrivers, 0, 999) || 0 : 0, storeApp: bool(input.storeApp),
      status: trialDays > 0 ? 'trial' : 'active', trialEnd: trialDays > 0 ? now() + trialDays * 864e5 : null, licenseEnd: null,
      paidSince: trialDays > 0 ? null : now(), statusAt: now(), domains: [],
      billing: input.billing === 'yearly' ? 'yearly' : 'monthly',
      branding: { appName: str(input.appName || name, 40), color: /^#[0-9a-f]{6}$/i.test(input.color || '') ? input.color : '#1f6feb', logoFileId: null, iconFileId: null },
      settings: { ...DEFAULT_SETTINGS, bookingPrefix: str(input.bookingPrefix || code.slice(0, 3), 6).toUpperCase() },
      bookingSeq: 0, apiKey: null, supportAccessUntil: null, createdAt: now(), createdBy: a.id,
    };
    const password = str(input.adminPassword, 100) || genPassword(rand);
    const admin = {
      id: newId(), tenantId: t.id, role: 'admin', name: str(input.contact || 'Admin', 80) || 'Admin', email: adminEmail,
      phone: normPhone(input.phone), lang: 'de', active: true, passwordHash: hash.make(password), mustChangePassword: !input.adminPassword, createdAt: now(),
    };
    store.tx(() => { store.put('tenants', t); store.put('users', admin); });
    audit(a, 'tenant.create', t.id, { plan });
    changed('tenants', t);
    return { tenant: licenseView(t), admin: publicUser(admin), password };
  });

  def('updateTenantLicense', ['platform'], (a, { id, ...p }) => {
    const t = clone(getT(id));
    if (!t) fail('not_found', 'Lizenznehmer nicht gefunden.', 404);
    if (p.plan && PLANS[p.plan]) t.plan = p.plan;
    if ('extraDrivers' in p) t.extraDrivers = num(p.extraDrivers, 0, 999) || 0;
    if (!planOf(t).extraDriver) t.extraDrivers = 0; // Start has a fixed number of drivers
    if ('storeApp' in p) t.storeApp = bool(p.storeApp);
    if (t.storeApp && t.plan !== 'premium') fail('invalid', 'Die White-Label-App im Store ist ein Zusatz zum Tarif Premium.', 400, { fields: ['storeApp'] });
    if ('billing' in p) t.billing = p.billing === 'yearly' ? 'yearly' : 'monthly';
    if (p.status && ['trial', 'active', 'suspended', 'cancelled'].includes(p.status) && p.status !== t.status) {
      t.status = p.status;
      t.statusAt = now();
      if (p.status === 'active' && !t.paidSince) t.paidSince = now();
    }
    if ('trialEnd' in p) t.trialEnd = num(p.trialEnd) || null;
    if ('licenseEnd' in p) t.licenseEnd = isDate(p.licenseEnd) ? berlinEndOfDay(p.licenseEnd) : num(p.licenseEnd) || null;
    if ('extendTrialDays' in p) t.trialEnd = Math.max(t.trialEnd || 0, now()) + (num(p.extendTrialDays, 1, 365) || 0) * 864e5;
    if ('licenseNote' in p) t.licenseNote = text(p.licenseNote, 500);
    if ('name' in p) t.name = str(p.name, 120) || t.name;
    if ('legalName' in p) t.legalName = str(p.legalName, 160) || t.name;
    if ('vatId' in p) t.vatId = str(p.vatId, 30);
    if ('contact' in p) t.contact = str(p.contact, 80);
    if ('email' in p) {
      const e = normEmail(p.email);
      if (e && !isEmail(e)) fail('invalid', 'Bitte eine gültige E-Mail angeben.', 400, { fields: ['email'] });
      t.email = e;
    }
    if ('phone' in p) t.phone = str(p.phone, 40);
    if ('address' in p) t.address = str(p.address, 200);
    if ('domains' in p) {
      const list = [...new Set((Array.isArray(p.domains) ? p.domains : String(p.domains || '').split(/[\s,;]+/)).map(normHost).filter(Boolean))].slice(0, 5);
      if (list.length && planOf(t).domain !== 'custom') fail('plan', 'Eigene Domains gibt es im Tarif Premium.', 403, { fields: ['domains'] });
      for (const h of list) {
        if (!isHost(h)) fail('invalid', `„${h}“ ist keine gültige Domain (Beispiel: fahrer.firma.de).`, 400, { fields: ['domains'] });
        if (store.find('tenants', {}).some((x) => x.id !== t.id && (x.domains || []).includes(h))) fail('conflict', `Die Domain ${h} ist schon einem anderen Kunden zugeordnet.`, 409, { fields: ['domains'] });
      }
      t.domains = list;
    }
    if (p.branding) t.branding = { ...t.branding, ...cleanBranding(p.branding, t) };
    store.put('tenants', t);
    audit(a, 'tenant.license', t.id, { plan: t.plan, status: t.status });
    changed('tenants', t);
    return licenseView(t);
  });

  /** Support case: the customer's admin is locked out. New one-time password, must be changed at login. */
  def('resetTenantAdmin', ['platform'], (a, { id }) => {
    const t = getT(id);
    if (!t) fail('not_found', 'Lizenznehmer nicht gefunden.', 404);
    const admins = store.find('users', { tenantId: t.id, role: 'admin' }).filter((u) => !u.deleted).sort((x, y) => (y.active - x.active) || (x.createdAt - y.createdAt));
    if (!admins.length) fail('not_found', 'Dieser Kunde hat keinen Admin-Zugang.', 404);
    const u = clone(admins[0]);
    const password = genPassword(rand);
    Object.assign(u, { passwordHash: hash.make(password), mustChangePassword: true, failedLogins: 0, lockedUntil: null, active: true });
    store.put('users', u);
    audit({ ...a, tenantId: t.id }, 'user.reset_by_licensor', u.id); // visible in the customer's own log
    return { password, user: publicUser(u) };
  });

  /** Final deletion after a cancellation (AVV: return or delete). Type the company code to confirm. */
  def('deleteTenant', ['platform'], (a, { id, confirmCode }) => {
    const t = getT(id);
    if (!t) fail('not_found', 'Lizenznehmer nicht gefunden.', 404);
    if (t.status !== 'cancelled') fail('invalid', 'Löschen ist erst nach der Kündigung möglich.', 409);
    if (str(confirmCode, 20).toUpperCase() !== t.code) fail('invalid', `Zur Bestätigung bitte den Firmencode ${t.code} eingeben.`, 400, { fields: ['confirmCode'] });
    const userIds = store.find('users', { tenantId: t.id }).map((u) => u.id);
    const fileIds = store.find('files', { tenantId: t.id }).map((f) => f.id);
    for (const col of ['deliveries', 'vehicles', 'notifications', 'files', 'audit', 'users']) for (const x of store.find(col, { tenantId: t.id })) store.del(col, x.id);
    store.del('tenants', t.id);
    audit(a, 'tenant.delete', t.id, { code: t.code, name: t.name, users: userIds.length, files: fileIds.length });
    emit({ type: 'change', tenantId: null, col: 'tenants', id: t.id });
    return { ok: true, tenantId: t.id, userIds, fileIds };
  });

  def('platformStats', ['platform'], () => {
    const ts = store.find('tenants', {});
    const live = ts.filter((t) => ['active'].includes(licenseState(t, now())));
    const trial = ts.filter((t) => licenseState(t, now()) === 'trial');
    const soon = trial.filter((t) => t.trialEnd - now() < 7 * 864e5);
    const mrr = live.reduce((s, t) => s + (t.billing === 'yearly' ? monthlyPrice(t) * 10 / 12 : monthlyPrice(t)), 0);
    let drivers = 0, deliveriesMonth = 0;
    for (const t of ts) { const u = usage(t); drivers += u.drivers; deliveriesMonth += u.deliveriesMonth; }
    const byPlan = Object.fromEntries(Object.keys(PLANS).map((k) => [k, ts.filter((t) => t.plan === k && !['cancelled'].includes(t.status)).length]));
    return { tenants: ts.length, active: live.length, trial: trial.length, trialEndingSoon: soon.map((t) => ({ id: t.id, name: t.name, trialEnd: t.trialEnd })), suspended: ts.filter((t) => t.status === 'suspended').length, mrr: Math.round(mrr * 100) / 100, arr: Math.round(mrr * 12 * 100) / 100, drivers, deliveriesMonth, byPlan };
  });

  // Billing rule. The paid licence starts at `paidSince` (creation without a trial, or the switch from
  // trial to active). Monthly payers are billed for every calendar month from that month on. Yearly
  // payers are billed once a year in advance – in the start month and every 12 months after – for 12
  // months at the price of 10. A month is billed only while the licence is paid: a suspension or
  // cancellation counts from the month of the status change (`statusAt`), a licence end after its month.
  // The positions use today's plan and add-ons (the preview does not keep a price history).
  def('billingRun', ['platform'], (a, { month } = {}) => {
    const m = /^\d{4}-\d{2}$/.test(month || '') ? month : monthOf(now());
    const cur = monthIndex(m);
    const billable = (t) => {
      if (!t.paidSince || t.status === 'trial') return false;
      const start = monthIndex(monthOf(t.paidSince));
      if (cur < start) return false;
      if (['suspended', 'cancelled'].includes(t.status) && monthIndex(monthOf(t.statusAt || t.createdAt)) <= cur) return false;
      if (t.licenseEnd && monthIndex(monthOf(t.licenseEnd)) < cur) return false;
      return t.billing !== 'yearly' || (cur - start) % 12 === 0;
    };
    const lines = store.find('tenants', {}).filter(billable).map((t) => {
      const p = planOf(t);
      const items = [{ text: `Ladeklar ${p.name}`, qty: 1, unit: p.price }];
      if (p.extraDriver && t.extraDrivers) items.push({ text: 'Zusätzliche Fahrer', qty: t.extraDrivers, unit: p.extraDriver });
      if (t.storeApp) items.push({ text: 'White-Label-App (Store-Betrieb)', qty: 1, unit: STORE_APP.monthly });
      const yearly = t.billing === 'yearly';
      const net = items.reduce((s, i) => s + i.qty * i.unit, 0) * (yearly ? 10 : 1);
      return { tenantId: t.id, name: t.legalName || t.name, code: t.code, billing: t.billing || 'monthly', period: yearly ? `${monthLabel(cur)} – ${monthLabel(cur + 11)}` : monthLabel(cur), items, net, vat: Math.round(net * VAT * 100) / 100, gross: Math.round(net * (1 + VAT) * 100) / 100 };
    });
    return { month: m, lines, net: lines.reduce((s, l) => s + l.net, 0), gross: Math.round(lines.reduce((s, l) => s + l.gross, 0) * 100) / 100 };
  });

  // ---------- tenant: company, branding, settings ----------
  function cleanBranding(b, t) {
    const out = {};
    if ('appName' in b) out.appName = str(b.appName, 40) || t.name;
    if ('color' in b && /^#[0-9a-f]{6}$/i.test(b.color)) out.color = b.color.toLowerCase();
    for (const k of ['logoFileId', 'iconFileId']) {
      if (!(k in b)) continue;
      if (!b[k]) { out[k] = null; continue; }
      const f = store.get('files', b[k]);
      if (!f || f.tenantId !== t.id || !['logo', 'icon'].includes(f.kind)) fail('invalid', 'Logo-Datei nicht gefunden.');
      out[k] = f.id;
    }
    return out;
  }

  def('updateCompany', ['admin'], (a, p) => {
    const t = clone(tenantOf(a));
    for (const k of ['name', 'legalName', 'address', 'phone', 'contact', 'vatId']) if (k in p) t[k] = str(p[k], k === 'address' ? 200 : 120) || (k === 'name' ? t.name : '');
    if (p.branding) t.branding = { ...t.branding, ...cleanBranding(p.branding, t) };
    if (p.settings) {
      const s = { ...settingsOf(t) };
      for (const k of Object.keys(DEFAULT_SETTINGS)) {
        if (!(k in p.settings)) continue;
        if (k === 'retentionYears') s[k] = num(p.settings[k], 1, 10) || DEFAULT_SETTINGS.retentionYears;
        else if (k === 'bookingPrefix') s[k] = str(p.settings[k], 6).toUpperCase().replace(/[^A-Z0-9]/g, '') || t.code.slice(0, 3);
        else s[k] = bool(p.settings[k]);
      }
      t.settings = s;
    }
    store.put('tenants', t);
    audit(a, 'company.update', t.id);
    changed('tenants', t, { allDrivers: true });
    return publicTenant(t, { full: true });
  }, { write: true });

  def('rotateApiKey', ['admin'], (a) => {
    const t = clone(tenantOf(a));
    if (!planOf(t).api) fail('plan', 'Die REST-API ist im Tarif Premium enthalten.', 403);
    t.apiKey = genApiKey(newId);
    store.put('tenants', t);
    audit(a, 'apikey.rotate', t.id);
    return { apiKey: t.apiKey };
  }, { write: true });

  def('grantSupportAccess', ['admin'], (a, { hours = 0 } = {}) => {
    const t = clone(tenantOf(a));
    const h = num(hours, 0, 72) || 0;
    t.supportAccessUntil = h ? now() + h * 3600e3 : null;
    store.put('tenants', t);
    audit(a, h ? 'support.grant' : 'support.revoke', t.id, { hours: h });
    return { supportAccessUntil: t.supportAccessUntil };
  });

  def('exportData', ['admin'], (a) => {
    const t = tenantOf(a);
    const by = (col) => store.find(col, { tenantId: t.id });
    audit(a, 'data.export', t.id);
    return {
      format: 'ladeklar-export', version: VERSION, exportedAt: now(),
      company: publicTenant(t, { full: true }),
      users: by('users').map(publicUser), vehicles: by('vehicles'), deliveries: by('deliveries'),
      files: by('files').map(({ data, ...f }) => f), audit: by('audit'),
    };
  });

  def('auditLog', ['admin'], (a, { limit = 200 } = {}) =>
    store.find('audit', { tenantId: a.tenantId }).sort((x, y) => y.at - x.at).slice(0, Math.min(1000, limit)).map((e) => ({ ...e, actorName: userName(e.actorId) })));

  // ---------- team & drivers ----------
  def('listUsers', STAFF, (a, { role } = {}) => {
    const t = tenantOf(a);
    const vehicles = store.find('vehicles', { tenantId: t.id });
    const active = store.find('deliveries', { tenantId: t.id }).filter((d) => ACTIVE.includes(d.status));
    return store.find('users', { tenantId: t.id })
      .filter((u) => !u.deleted && (!role || u.role === role || (role === 'staff' && u.role !== 'driver')))
      .sort((x, y) => (y.active - x.active) || x.name.localeCompare(y.name, 'de'))
      .map((u) => ({ ...publicUser(u), vehiclePlate: vehicles.find((v) => v.id === u.vehicleId)?.plate || '', trailerPlate: vehicles.find((v) => v.id === u.trailerId)?.plate || '', activeDeliveries: active.filter((d) => d.driverId === u.id).length }));
  });

  def('createUser', STAFF, (a, input) => {
    const t = tenantOf(a);
    const role = ['driver', 'dispatcher', 'admin'].includes(input.role) ? input.role : 'driver';
    if (role !== 'driver' && a.role !== 'admin') fail('forbidden', 'Nur der Admin kann Disponenten anlegen.', 403);
    seatCheck(t, role);
    const name = str(input.name, 80);
    if (!name) fail('invalid', 'Bitte den Namen angeben.', 400, { fields: ['name'] });
    const u = { id: newId(), tenantId: t.id, role, name, lang: pickLang(input.lang), active: true, createdAt: now(), createdBy: a.id };
    let secret;
    if (role === 'driver') {
      u.phone = normPhone(input.phone);
      if (u.phone.length < 8) fail('invalid', 'Bitte eine gültige Handynummer angeben (für den Login).', 400, { fields: ['phone'] });
      if (store.find('users', { tenantId: t.id, role: 'driver' }).some((x) => x.phone === u.phone)) fail('conflict', 'Diese Handynummer ist schon vergeben.', 409, { fields: ['phone'] });
      u.personalNo = str(input.personalNo, 20);
      u.licenseClass = str(input.licenseClass, 20);
      u.note = text(input.note, 300);
      u.email = normEmail(input.email) || null;
      secret = str(input.pin, 6);
      if (!/^\d{6}$/.test(secret)) secret = genPin(rand);
      u.pinHash = hash.make(secret);
      u.vehicleId = null; u.trailerId = null;
    } else {
      u.email = normEmail(input.email);
      if (!isEmail(u.email)) fail('invalid', 'Bitte eine gültige E-Mail angeben.', 400, { fields: ['email'] });
      if (emailTaken(u.email)) fail('conflict', 'Diese E-Mail hat schon einen Zugang.', 409, { fields: ['email'] });
      u.phone = normPhone(input.phone);
      secret = str(input.password, 100);
      if (secret.length < 10) secret = genPassword(rand);
      u.passwordHash = hash.make(secret);
      u.mustChangePassword = !input.password;
    }
    store.put('users', u);
    audit(a, 'user.create', u.id, { role });
    changed('users', u);
    return { user: publicUser(u), [role === 'driver' ? 'pin' : 'password']: secret };
  }, { write: true });

  def('updateUser', STAFF, (a, { id, ...p }) => {
    const u = clone(scoped('users', id, a));
    if (u.deleted) fail('not_found', 'Nicht gefunden.', 404);
    if (u.role !== 'driver' && a.role !== 'admin') fail('forbidden', 'Nur der Admin kann Team-Zugänge ändern.', 403);
    if ('name' in p) u.name = str(p.name, 80) || u.name;
    if ('lang' in p) u.lang = pickLang(p.lang);
    if ('licenseClass' in p) u.licenseClass = str(p.licenseClass, 20);
    if ('personalNo' in p) u.personalNo = str(p.personalNo, 20);
    if ('note' in p) u.note = text(p.note, 300);
    if ('phone' in p) {
      const ph = normPhone(p.phone);
      if (u.role === 'driver') {
        if (ph.length < 8) fail('invalid', 'Bitte eine gültige Handynummer angeben.', 400, { fields: ['phone'] });
        if (store.find('users', { tenantId: u.tenantId, role: 'driver' }).some((x) => x.phone === ph && x.id !== u.id)) fail('conflict', 'Diese Handynummer ist schon vergeben.', 409, { fields: ['phone'] });
      }
      u.phone = ph;
    }
    if ('email' in p && u.role !== 'driver') {
      const e = normEmail(p.email);
      if (!isEmail(e)) fail('invalid', 'Bitte eine gültige E-Mail angeben.', 400, { fields: ['email'] });
      if (emailTaken(e, u.id)) fail('conflict', 'Diese E-Mail hat schon einen Zugang.', 409, { fields: ['email'] });
      u.email = e;
    }
    if ('role' in p && a.role === 'admin' && u.id !== a.id && ['dispatcher', 'admin'].includes(p.role) && u.role !== 'driver') u.role = p.role;
    store.put('users', u);
    audit(a, 'user.update', u.id);
    changed('users', u);
    return publicUser(u);
  }, { write: true });

  def('setUserActive', STAFF, (a, { id, active }) => {
    const u = clone(scoped('users', id, a));
    if (u.deleted) fail('not_found', 'Nicht gefunden.', 404);
    if (u.role !== 'driver' && a.role !== 'admin') fail('forbidden', 'Nur der Admin kann Team-Zugänge sperren.', 403);
    if (u.id === a.id) fail('invalid', 'Den eigenen Zugang können Sie nicht sperren.');
    const on = bool(active);
    if (on && !u.active) seatCheck(tenantOf(a), u.role);
    u.active = on;
    if (!on && u.role === 'driver') releaseAll(u);
    store.put('users', u);
    audit(a, on ? 'user.activate' : 'user.deactivate', u.id);
    changed('users', u);
    return publicUser(u);
  }, { write: true });

  /**
   * Delete a person (GDPR): the account is anonymised – name, contact data, secrets and messages go;
   * finished deliveries keep the reference so the company's records stay complete. Open or confirmed
   * tours go back to the office; a tour that is already loaded has to be finished or re-planned first.
   * Allowed in every licence state, also when the company may no longer change anything else.
   */
  def('deleteUser', ['admin'], (a, { id }) => {
    const u = clone(scoped('users', id, a));
    if (u.id === a.id) fail('invalid', 'Den eigenen Zugang können Sie nicht löschen.');
    if (u.deleted) return { ok: true, id: u.id };
    const ds = store.find('deliveries', { tenantId: u.tenantId, driverId: u.id }).filter((d) => !DONE.includes(d.status));
    if (ds.some((d) => progressOf(d.status) >= progressOf('loaded'))) fail('invalid', 'Der Fahrer hat eine beladene Tour. Bitte erst abschließen oder einem anderen Fahrer geben.', 409);
    for (const d0 of ds) {
      const d = clone(d0);
      d.driverId = null; d.status = 'open'; d.openForAll = false;
      addEvent(d, a, 'unassigned', { from: d0.status });
      store.put('deliveries', d);
      deliveryChanged(d);
    }
    if (u.role === 'driver') releaseAll(u);
    Object.assign(u, {
      name: 'Gelöschter Nutzer', email: null, phone: '', personalNo: '', licenseClass: '', note: '', passwordHash: null, pinHash: null,
      active: false, deleted: true, deletedAt: now(), geoConsent: null, geoConsentAt: null, failedLogins: 0, lockedUntil: null, mustChangePassword: false,
    });
    store.put('users', u);
    for (const n of store.find('notifications', { userId: u.id })) store.del('notifications', n.id);
    audit(a, 'user.delete', u.id, { role: u.role });
    changed('users', u);
    return { ok: true, id: u.id };
  });

  def('resetSecret', STAFF, (a, { id }) => {
    const u = clone(scoped('users', id, a));
    if (u.deleted) fail('not_found', 'Nicht gefunden.', 404);
    if (u.role !== 'driver' && a.role !== 'admin') fail('forbidden', 'Nur der Admin kann Passwörter zurücksetzen.', 403);
    let secret;
    if (u.role === 'driver') { secret = genPin(rand); u.pinHash = hash.make(secret); }
    else { secret = genPassword(rand); u.passwordHash = hash.make(secret); u.mustChangePassword = true; }
    u.failedLogins = 0; u.lockedUntil = null;
    store.put('users', u);
    audit(a, 'user.reset', u.id);
    return { [u.role === 'driver' ? 'pin' : 'password']: secret, user: publicUser(u) };
  }, { write: true });

  // ---------- vehicles ----------
  function vehicleView(v) {
    const today = berlinDate(now());
    const soon = berlinDate(now() + 30 * 864e5);
    const due = ['huDue', 'spDue'].filter((k) => v[k] && v[k] <= soon).map((k) => ({ kind: k, date: v[k], overdue: v[k] < today }));
    return { ...v, driverName: userName(v.driverId), due, busy: !!v.driverId, available: v.active !== false && v.status !== 'workshop' && !v.driverId };
  }
  def('listVehicles', TENANT, (a, { kind } = {}) => {
    const t = tenantOf(a);
    return store.find('vehicles', { tenantId: t.id })
      .filter((v) => v.active !== false && (!kind || v.kind === kind))
      .sort((x, y) => (x.kind === y.kind ? x.plate.localeCompare(y.plate, 'de') : x.kind === 'truck' ? -1 : 1))
      .map(vehicleView)
      .map((v) => (a.role === 'driver' ? { id: v.id, kind: v.kind, plate: v.plate, type: v.type, name: v.name, features: v.features, payloadKg: v.payloadKg, pallets: v.pallets, status: v.status, busy: v.busy && v.driverId !== a.id, mine: v.driverId === a.id, driverName: v.driverId && v.driverId !== a.id ? v.driverName.split(' ')[0] : '', available: v.available || v.driverId === a.id } : v));
  });
  function vehicleInput(v, p, t) {
    if ('kind' in p) v.kind = p.kind === 'trailer' ? 'trailer' : 'truck';
    if ('plate' in p) v.plate = normPlate(p.plate);
    if (!v.plate || v.plate.length < 3) fail('invalid', 'Bitte das Kennzeichen angeben.', 400, { fields: ['plate'] });
    if (store.find('vehicles', { tenantId: t.id }).some((x) => x.active !== false && x.plate === v.plate && x.id !== v.id)) fail('conflict', `Das Kennzeichen ${v.plate} ist schon angelegt.`, 409, { fields: ['plate'] });
    if ('type' in p) v.type = VEHICLE_TYPES[v.kind || 'truck'].includes(p.type) ? p.type : VEHICLE_TYPES[v.kind || 'truck'][0];
    if (!v.type) v.type = VEHICLE_TYPES[v.kind || 'truck'][0];
    if ('name' in p) v.name = str(p.name, 40);
    if ('payloadKg' in p) v.payloadKg = num(p.payloadKg, 0, 60000);
    if ('pallets' in p) v.pallets = num(p.pallets, 0, 99);
    if ('features' in p) v.features = (Array.isArray(p.features) ? p.features : []).filter((f) => VEHICLE_FEATURES.includes(f));
    if ('huDue' in p) v.huDue = isDate(p.huDue) ? p.huDue : '';
    if ('spDue' in p) v.spDue = isDate(p.spDue) ? p.spDue : '';
    if ('status' in p) v.status = p.status === 'workshop' ? 'workshop' : 'ok';
    if ('note' in p) v.note = text(p.note, 300);
    return v;
  }
  def('createVehicle', STAFF, (a, p) => {
    const t = tenantOf(a);
    const max = planOf(t).vehicles;
    if (max != null && store.find('vehicles', { tenantId: t.id }).filter((v) => v.active !== false).length >= max) fail('seat_limit', `Ihr Tarif „${planOf(t).name}“ umfasst ${max} Fahrzeuge.`, 409, { max });
    const v = vehicleInput({ id: newId(), tenantId: t.id, kind: p.kind === 'trailer' ? 'trailer' : 'truck', status: 'ok', driverId: null, features: [], active: true, createdAt: now() }, p, t);
    store.put('vehicles', v);
    audit(a, 'vehicle.create', v.id);
    changed('vehicles', v, { allDrivers: true });
    return vehicleView(v);
  }, { write: true });
  def('updateVehicle', STAFF, (a, { id, ...p }) => {
    const t = tenantOf(a);
    const v = vehicleInput(clone(scoped('vehicles', id, a)), { ...p, kind: undefined }, t);
    if (v.status === 'workshop' && v.driverId) releaseVehicleDoc(v);
    store.put('vehicles', v);
    audit(a, 'vehicle.update', v.id);
    changed('vehicles', v, { allDrivers: true });
    return vehicleView(v);
  }, { write: true });
  def('deleteVehicle', STAFF, (a, { id }) => {
    const v = clone(scoped('vehicles', id, a));
    if (v.driverId) releaseVehicleDoc(v);
    v.active = false;
    store.put('vehicles', v);
    audit(a, 'vehicle.delete', v.id);
    changed('vehicles', v, { allDrivers: true });
    return { ok: true };
  }, { write: true });

  function releaseVehicleDoc(v) {
    const d = v.driverId ? clone(store.get('users', v.driverId)) : null;
    if (d) { if (d.vehicleId === v.id) d.vehicleId = null; if (d.trailerId === v.id) d.trailerId = null; store.put('users', d); }
    v.driverId = null;
  }
  function releaseAll(driver) {
    for (const k of ['vehicleId', 'trailerId']) {
      if (!driver[k]) continue;
      const v = clone(store.get('vehicles', driver[k]));
      if (v && v.driverId === driver.id) { v.driverId = null; store.put('vehicles', v); changed('vehicles', v, { allDrivers: true }); }
      driver[k] = null;
    }
  }
  def('releaseVehicle', TENANT, (a, { id } = {}) => {
    if (a.role === 'driver') {
      const me = clone(store.get('users', a.id));
      releaseAll(me);
      store.put('users', me);
      return { ok: true };
    }
    const v = clone(scoped('vehicles', id, a));
    releaseVehicleDoc(v);
    store.put('vehicles', v);
    audit(a, 'vehicle.release', v.id);
    changed('vehicles', v, { allDrivers: true });
    return vehicleView(v);
  }, { write: true });

  def('selectVehicle', ['driver'], (a, { vehicleId, trailerId }) => {
    const t = tenantOf(a);
    if (!settingsOf(t).driverPicksTruck) fail('forbidden', 'Die Disposition teilt die Fahrzeuge zu.', 403);
    const me = clone(store.get('users', a.id));
    const take = (id, kind) => {
      const v = clone(scoped('vehicles', id, a));
      if (v.active === false || v.kind !== kind) fail('invalid', 'Fahrzeug nicht verfügbar.');
      if (v.status === 'workshop') fail('vehicle_busy', `${v.plate} ist in der Werkstatt.`, 409);
      if (v.driverId && v.driverId !== me.id) fail('vehicle_busy', `${v.plate} fährt gerade ${userName(v.driverId).split(' ')[0]}.`, 409);
      return v;
    };
    const truck = vehicleId ? take(vehicleId, 'truck') : null;
    const trailer = trailerId ? take(trailerId, 'trailer') : null;
    if (vehicleId !== undefined) {
      if (me.vehicleId && me.vehicleId !== vehicleId) { const old = clone(store.get('vehicles', me.vehicleId)); if (old && old.driverId === me.id) { old.driverId = null; store.put('vehicles', old); changed('vehicles', old, { allDrivers: true }); } }
      me.vehicleId = truck ? truck.id : null;
      if (truck) { truck.driverId = me.id; store.put('vehicles', truck); changed('vehicles', truck, { allDrivers: true }); }
    }
    if (trailerId !== undefined) {
      if (me.trailerId && me.trailerId !== trailerId) { const old = clone(store.get('vehicles', me.trailerId)); if (old && old.driverId === me.id) { old.driverId = null; store.put('vehicles', old); changed('vehicles', old, { allDrivers: true }); } }
      me.trailerId = trailer ? trailer.id : null;
      if (trailer) { trailer.driverId = me.id; store.put('vehicles', trailer); changed('vehicles', trailer, { allDrivers: true }); }
    }
    store.put('users', me);
    // running deliveries without a vehicle inherit the selection
    for (const d0 of store.find('deliveries', { tenantId: t.id, driverId: me.id })) {
      if (!ACTIVE.includes(d0.status)) continue;
      const d = clone(d0); let ch = false;
      if (!d.vehicleId && me.vehicleId) { d.vehicleId = me.vehicleId; ch = true; }
      if (!d.trailerId && me.trailerId) { d.trailerId = me.trailerId; ch = true; }
      if (ch) { addEvent(d, a, 'vehicle', { vehicleId: d.vehicleId, trailerId: d.trailerId }); store.put('deliveries', d); deliveryChanged(d); }
    }
    return { vehicleId: me.vehicleId, trailerId: me.trailerId };
  }, { write: true });

  // ---------- deliveries: staff ----------
  def('createDelivery', STAFF, (a, input) => {
    const t = tenantOf(a);
    const d = deliveryInput(t, { goods: {}, ...input, pickup: input.pickup || {}, dropoff: input.dropoff || {} });
    Object.assign(d, { id: newId(), tenantId: t.id, status: 'open', problem: null, notes: [], events: [], docs: [], createdAt: now(), createdBy: a.id, updatedAt: now() });
    if (d.openForAll == null) d.openForAll = !d.driverId;
    if (d.driverId) d.openForAll = false;
    d.bookingNo = nextBookingNo(getT(t.id));
    addEvent(d, a, 'created');
    if (d.driverId) addEvent(d, a, 'assigned', { driverId: d.driverId });
    store.put('deliveries', d);
    audit(a, 'delivery.create', d.id);
    deliveryChanged(d);
    const params = { no: d.bookingNo, route: routeLabel(d), date: deDate(d.pickup.date) };
    if (d.driverId) notify([d.driverId], 'assigned', params, { deliveryId: d.id, priority: d.urgent ? 'high' : 'normal' });
    else if (d.openForAll && settingsOf(t).driverTakesOpen) notify(driverIds(t.id), 'open', params, { deliveryId: d.id });
    return decorate(d, a);
  }, { write: true });

  def('updateDelivery', STAFF, (a, { id, ...p }) => {
    const t = tenantOf(a);
    const before = scoped('deliveries', id, a);
    if (DONE.includes(before.status)) {
      // after the fact only bookkeeping fields may change
      const allowed = ['customer', 'reference', 'internalNote'];
      if (Object.keys(p).some((k) => !allowed.includes(k))) fail('invalid', 'Abgeschlossene Lieferungen können nur bei Kunde, Referenz und interner Notiz geändert werden.');
    }
    if (progressOf(before.status) >= progressOf('loaded') && ('pickup' in p) && JSON.stringify(cleanPlace({ ...before.pickup, ...p.pickup })) !== JSON.stringify(before.pickup)) {
      fail('invalid', 'Die Ladestelle kann nach dem Beladen nicht mehr geändert werden.');
    }
    const d = deliveryInput(t, p, before);
    const prevDriver = before.driverId;
    if ('driverId' in p && d.driverId !== prevDriver) {
      if (progressOf(before.status) >= progressOf('loaded')) fail('invalid', 'Nach dem Beladen kann der Fahrer nicht mehr gewechselt werden.');
      if (d.driverId) { d.openForAll = false; addEvent(d, a, 'assigned', { driverId: d.driverId }); }
      if (before.status === 'accepted' && d.driverId !== prevDriver) { d.status = 'open'; }
    }
    if (!d.driverId && 'openForAll' in p) d.openForAll = bool(p.openForAll);
    addEvent(d, a, 'updated', { fields: Object.keys(p).slice(0, 12) });
    store.put('deliveries', d);
    audit(a, 'delivery.update', d.id);
    deliveryChanged(d);
    if (prevDriver && prevDriver !== d.driverId) changed('deliveries', d, { drivers: [prevDriver] });
    const params = { no: d.bookingNo, route: routeLabel(d), date: deDate(d.pickup.date) };
    if (d.driverId && d.driverId !== prevDriver) notify([d.driverId], 'assigned', params, { deliveryId: d.id, priority: d.urgent ? 'high' : 'normal' });
    else if (d.driverId && Object.keys(p).some((k) => ['pickup', 'dropoff', 'goods', 'instructions', 'vehicleId', 'trailerId', 'urgent'].includes(k))) notify([d.driverId], 'changed', params, { deliveryId: d.id });
    if (prevDriver && prevDriver !== d.driverId) notify([prevDriver], 'cancelled', params, { deliveryId: d.id });
    if (!d.driverId && d.openForAll && (prevDriver || !before.openForAll) && settingsOf(t).driverTakesOpen) notify(driverIds(t.id), 'open', params, { deliveryId: d.id });
    return decorate(d, a);
  }, { write: true });

  def('cancelDelivery', STAFF, (a, { id, reason }) => {
    const d = clone(scoped('deliveries', id, a));
    if (DONE.includes(d.status)) fail('invalid', 'Die Lieferung ist schon abgeschlossen.');
    const from = d.status;
    d.status = 'cancelled';
    addEvent(d, a, 'cancelled', { from, note: text(reason, 300) });
    store.put('deliveries', d);
    audit(a, 'delivery.cancel', d.id);
    deliveryChanged(d);
    if (d.driverId) notify([d.driverId], 'cancelled', { no: d.bookingNo, route: routeLabel(d) }, { deliveryId: d.id, priority: 'high' });
    return decorate(d, a);
  }, { write: true });

  def('resolveProblem', STAFF, (a, { id, note }) => {
    const d = clone(scoped('deliveries', id, a));
    if (!d.problem) return decorate(d, a);
    addEvent(d, a, 'problem_resolved', { code: d.problem.code, note: text(note, 300) });
    d.problem = null;
    store.put('deliveries', d);
    deliveryChanged(d);
    if (d.driverId) notify([d.driverId], 'resolved', { no: d.bookingNo }, { deliveryId: d.id });
    return decorate(d, a);
  }, { write: true });

  def('listDeliveries', STAFF, (a, { tab = 'live', q = '', driverId, status, from, to, limit = 300 } = {}) => {
    const t = tenantOf(a);
    const today = berlinDate(now());
    let ds = store.find('deliveries', { tenantId: t.id });
    if (tab === 'live') ds = ds.filter((d) => ACTIVE.includes(d.status) || (d.status === 'open' && (d.pickup?.date || today) <= today));
    else if (tab === 'planned') ds = ds.filter((d) => ['open', 'accepted'].includes(d.status) && (d.pickup?.date || '') > today);
    else if (tab === 'open') ds = ds.filter((d) => d.status === 'open');
    else if (tab === 'done') ds = ds.filter((d) => DONE.includes(d.status));
    else if (tab === 'problems') ds = ds.filter((d) => d.problem && !DONE.includes(d.status));
    if (driverId) ds = ds.filter((d) => d.driverId === driverId);
    if (status) ds = ds.filter((d) => d.status === status);
    if (from) ds = ds.filter((d) => (d.pickup?.date || '') >= from);
    if (to) ds = ds.filter((d) => (d.pickup?.date || '') <= to);
    const needle = str(q, 80).toLowerCase();
    if (needle) {
      ds = ds.filter((d) => [d.bookingNo, d.customer, d.reference, d.pickup?.city, d.pickup?.place, d.pickup?.street, d.dropoff?.city, d.dropoff?.place, d.dropoff?.street, userName(d.driverId), vehiclePlate(d.vehicleId), vehiclePlate(d.trailerId), d.goods?.text]
        .some((x) => (x || '').toLowerCase().includes(needle)));
    }
    const sortKey = tab === 'done' ? (d) => -(d.updatedAt || 0) : (d) => `${d.problem ? 0 : 1}${d.urgent ? 0 : 1}${d.pickup?.date || '9999'}${d.pickup?.from || '99:99'}`;
    ds.sort((x, y) => { const kx = sortKey(x), ky = sortKey(y); return kx < ky ? -1 : kx > ky ? 1 : 0; });
    return ds.slice(0, Math.min(1000, limit)).map((d) => decorate(d, a));
  });

  def('getDelivery', TENANT, (a, { id }) => {
    const d = deliveryFor(a, id);
    const out = decorate(d, a);
    out.docs = (d.docs || []).map((x) => ({ ...x, byName: userName(x.by) }));
    return out;
  });

  def('dashboard', STAFF, (a) => {
    const t = tenantOf(a);
    const today = berlinDate(now());
    const ds = store.find('deliveries', { tenantId: t.id });
    const active = ds.filter((d) => ACTIVE.includes(d.status));
    const feed = [];
    for (const d of ds) for (const e of d.events || []) if (now() - e.at < 3 * 864e5) feed.push({ ...e, deliveryId: d.id, bookingNo: d.bookingNo, route: routeLabel(d), byName: userName(e.by) });
    feed.sort((x, y) => y.at - x.at);
    const drivers = store.find('users', { tenantId: t.id, role: 'driver' }).filter((u) => u.active);
    const vehicles = store.find('vehicles', { tenantId: t.id }).filter((v) => v.active !== false).map(vehicleView);
    return {
      counts: {
        open: ds.filter((d) => d.status === 'open').length,
        active: active.length,
        deliveredToday: ds.filter((d) => d.status === 'delivered' && berlinDate(d.updatedAt) === today).length,
        problems: ds.filter((d) => d.problem && !DONE.includes(d.status)).length,
        planned: ds.filter((d) => ['open', 'accepted'].includes(d.status) && (d.pickup?.date || '') > today).length,
      },
      active: active.sort((x, y) => (y.problem ? 1 : 0) - (x.problem ? 1 : 0) || (y.updatedAt - x.updatedAt)).map((d) => decorate(d, a)),
      openToday: ds.filter((d) => d.status === 'open' && (d.pickup?.date || today) <= today).map((d) => decorate(d, a)),
      feed: feed.slice(0, 25),
      drivers: { total: drivers.length, onTour: new Set(active.map((d) => d.driverId)).size, withVehicle: drivers.filter((u) => u.vehicleId).length },
      vehicles: { total: vehicles.length, inUse: vehicles.filter((v) => v.busy).length, workshop: vehicles.filter((v) => v.status === 'workshop').length, due: vehicles.filter((v) => v.due.length).map((v) => ({ id: v.id, plate: v.plate, due: v.due })) },
    };
  });

  def('places', STAFF, (a, { q = '' } = {}) => {
    const needle = str(q, 60).toLowerCase();
    const map = new Map();
    const ds = store.find('deliveries', { tenantId: a.tenantId }).sort((x, y) => y.createdAt - x.createdAt).slice(0, 500);
    for (const d of ds) for (const p of [d.pickup, d.dropoff]) {
      if (!p || !(p.city || p.place)) continue;
      const key = [p.place, p.street, p.zip, p.city].join('|').toLowerCase();
      const hay = key;
      if (needle && !hay.includes(needle)) continue;
      const cur = map.get(key);
      if (cur) cur.count++;
      else map.set(key, { place: p.place, street: p.street, zip: p.zip, city: p.city, country: p.country, contact: p.contact, phone: p.phone, count: 1 });
    }
    return [...map.values()].sort((x, y) => y.count - x.count).slice(0, 8);
  });

  def('reports', STAFF, (a, { month } = {}) => {
    const t = tenantOf(a);
    const m = /^\d{4}-\d{2}$/.test(month || '') ? month : berlinDate(now()).slice(0, 7);
    const ds = store.find('deliveries', { tenantId: t.id }).filter((d) => d.status === 'delivered' && berlinDate(d.updatedAt).slice(0, 7) === m);
    const rows = new Map();
    let onTime = 0, withWindow = 0, waitSum = 0, waitN = 0, palletsGiven = 0, palletsTaken = 0;
    for (const d of ds) {
      const r = rows.get(d.driverId) || { driverId: d.driverId, driverName: userName(d.driverId), delivered: 0, waiting: 0, problems: 0 };
      r.delivered++;
      const w = waitingMinutes(d); if (w != null) { r.waiting += w; waitSum += w; waitN++; }
      if ((d.events || []).some((e) => e.type === 'problem')) r.problems++;
      const done = (d.events || []).filter((e) => e.type === 'delivered' && !e.undone).pop();
      if (done && d.dropoff?.date) {
        withWindow++;
        const deadline = `${d.dropoff.date} ${d.dropoff.to || '23:59'}`;
        if (`${berlinDate(done.at)} ${berlinTime(done.at)}` <= deadline) onTime++;
      }
      if (d.palletExchange) { palletsGiven += d.palletExchange.given || 0; palletsTaken += d.palletExchange.taken || 0; }
      rows.set(d.driverId, r);
    }
    // Per customer and per loading/unloading place (no personal data, so not tied to reportsByDriver).
    // Waiting time at a stop = "arrived" tap → "loaded" (pickup) or → "unloaded" (dropoff), the same
    // pairs as waitingMinutes(). Without the arrival tap (setting trackArrival off) a stop has no
    // waiting time and only counts. Sorted by the longest average waiting time first.
    const evAt = (d, type) => (d.events || []).filter((e) => e.type === type && !e.undone).map((e) => e.at).pop();
    const stopWait = (d, arrived, done) => { const a = evAt(d, arrived), b = evAt(d, done); return a && b && b > a ? Math.round((b - a) / 60000) : null; };
    const avg = (sum, n) => (n ? Math.round(sum / n) : null);
    const byWait = (x, y) => (y.avgWaiting ?? -1) - (x.avgWaiting ?? -1) || y.count - x.count;
    const cust = new Map(), places = new Map();
    for (const d of ds) {
      const ck = (d.customer || '').trim().toLowerCase();
      const c = cust.get(ck) || { customer: d.customer || '', count: 0, problems: 0, waitSum: 0, waitN: 0 };
      c.count++;
      if ((d.events || []).some((e) => e.type === 'problem')) c.problems++;
      const w = waitingMinutes(d); if (w != null) { c.waitSum += w; c.waitN++; }
      cust.set(ck, c);
      for (const [side, p, arrived, done] of [['pickup', d.pickup, 'arrived_pickup', 'loaded'], ['dropoff', d.dropoff, 'arrived_dropoff', 'unloaded']]) {
        if (!p || !(p.place || p.city)) continue;
        const key = `${side}|${(p.place || '').toLowerCase()}|${(p.city || '').toLowerCase()}`;
        const x = places.get(key) || { side, place: p.place || '', city: p.city || '', count: 0, waitSum: 0, waitN: 0 };
        x.count++;
        const sw = stopWait(d, arrived, done); if (sw != null) { x.waitSum += sw; x.waitN++; }
        places.set(key, x);
      }
    }
    const out = (x) => { const { waitSum, waitN, ...rest } = x; return { ...rest, avgWaiting: avg(waitSum, waitN), measured: waitN }; };
    return {
      month: m, delivered: ds.length, onTimeRate: withWindow ? Math.round((onTime / withWindow) * 100) : null,
      avgWaiting: waitN ? Math.round(waitSum / waitN) : null, palletsGiven, palletsTaken,
      byDriver: settingsOf(t).reportsByDriver ? [...rows.values()].sort((x, y) => y.delivered - x.delivered) : [],
      byDriverHidden: !settingsOf(t).reportsByDriver,
      byCustomer: [...cust.values()].map(out).sort(byWait),
      byPlace: [...places.values()].map(out).sort(byWait),
    };
  });

  // ---------- deliveries: driver ----------
  def('driverHome', ['driver'], (a) => {
    const t = tenantOf(a);
    const s = settingsOf(t);
    const me = store.get('users', a.id);
    const all = store.find('deliveries', { tenantId: t.id });
    const mine = all.filter((d) => d.driverId === a.id && !DONE.includes(d.status))
      .sort((x, y) => (progressOf(y.status) - progressOf(x.status)) || ((x.pickup?.date || '') < (y.pickup?.date || '') ? -1 : 1));
    const today = berlinDate(now());
    const offered = s.driverTakesOpen ? all.filter((d) => d.status === 'open' && !d.driverId && d.openForAll).sort((x, y) => ((x.pickup?.date || '') < (y.pickup?.date || '') ? -1 : 1)) : [];
    const doneToday = all.filter((d) => d.driverId === a.id && d.status === 'delivered' && berlinDate(d.updatedAt) === today).length;
    const v = me.vehicleId ? store.get('vehicles', me.vehicleId) : null;
    const tr = me.trailerId ? store.get('vehicles', me.trailerId) : null;
    return {
      me: publicUser(me), tenant: publicTenant(t), license: licenseState(t, now()),
      vehicle: v ? { id: v.id, plate: v.plate, type: v.type, name: v.name } : null,
      trailer: tr ? { id: tr.id, plate: tr.plate, type: tr.type } : null,
      current: mine.find((d) => progressOf(d.status) >= 1) ? decorate(mine.find((d) => progressOf(d.status) >= 1), a) : null,
      mine: mine.map((d) => decorate(d, a)),
      offered: offered.map((d) => decorate(d, a)),
      doneToday,
    };
  });

  def('myHistory', ['driver'], (a, { days = 30 } = {}) => {
    const since = now() - Math.min(365, days) * 864e5;
    return store.find('deliveries', { tenantId: a.tenantId, driverId: a.id })
      .filter((d) => DONE.includes(d.status) && d.updatedAt >= since)
      .sort((x, y) => y.updatedAt - x.updatedAt).map((d) => decorate(d, a));
  });

  function applyVehicle(d, actor) {
    if (actor.role !== 'driver') return;
    const me = store.get('users', actor.id);
    if (!d.vehicleId && me.vehicleId) d.vehicleId = me.vehicleId;
    if (!d.trailerId && me.trailerId) d.trailerId = me.trailerId;
  }
  const cleanGeo = (g, s, actor) => (s.geoOnStatus && g && (!actor || actor.role !== 'driver' || store.get('users', actor.id)?.geoConsent) && Number.isFinite(+g.lat) && Number.isFinite(+g.lng)
    ? { lat: Math.round(+g.lat * 1e5) / 1e5, lng: Math.round(+g.lng * 1e5) / 1e5, acc: num(g.acc, 0, 1e5) } : undefined);

  def('acceptDelivery', ['driver'], (a, { id, geo }) => {
    const t = tenantOf(a);
    const s = settingsOf(t);
    const d = deliveryFor(a, id);
    if (d.status !== 'open') fail('wrong_step', d.driverId === a.id ? 'Die Buchung ist schon bestätigt.' : 'Diesen Auftrag hat schon jemand übernommen.', 409);
    if (d.driverId && d.driverId !== a.id) fail('conflict', 'Diesen Auftrag hat schon jemand übernommen.', 409);
    const claimed = !d.driverId;
    d.driverId = a.id;
    d.openForAll = false;
    d.status = 'accepted';
    applyVehicle(d, a);
    addEvent(d, a, 'accepted', { from: 'open', claimed, geo: cleanGeo(geo, s, a) });
    store.put('deliveries', d);
    deliveryChanged(d);
    if (claimed) changed('deliveries', d, { allDrivers: true });
    notify(staffIds(t.id), 'status', { driver: a.name, status: 'accepted', route: routeLabel(d), no: d.bookingNo }, { deliveryId: d.id });
    return decorate(d, a);
  }, { write: true });

  def('advanceDelivery', TENANT, (a, { id, step, geo, palletExchange, receiver, signatureFileId }) => {
    const t = tenantOf(a);
    const s = settingsOf(t);
    const d = deliveryFor(a, id);
    if (a.role === 'driver' && d.driverId !== a.id) fail('forbidden', 'Diese Lieferung ist nicht Ihnen zugeteilt.', 403);
    if (d.status === 'open') fail('wrong_step', 'Bitte zuerst die Buchung bestätigen.', 409);
    const expected = nextStep(d, s);
    if (!expected || step !== expected) fail('wrong_step', 'Dieser Schritt passt gerade nicht. Bitte die Ansicht aktualisieren.', 409, { expected });
    const extra = { from: d.status, geo: cleanGeo(geo, s, a) };
    if (step === 'unloaded' && palletExchange && s.palletExchange) {
      d.palletExchange = { given: num(palletExchange.given, 0, 99) || 0, taken: num(palletExchange.taken, 0, 99) || 0 };
      extra.pallets = d.palletExchange;
    }
    if (step === 'delivered') {
      const pods = (d.docs || []).filter((x) => x.kind === 'pod');
      if (s.requirePod && !pods.length) fail('pod_required', 'Bitte zuerst den Lieferschein fotografieren.', 409);
      if (receiver != null) d.receiver = str(receiver, 80);
      if (signatureFileId) {
        const f = store.get('files', signatureFileId);
        if (!f || f.tenantId !== t.id || f.kind !== 'signature') fail('invalid', 'Unterschrift nicht gefunden.');
        d.signatureFileId = f.id;
      } else {
        // signed offline: the signature arrived as a document of this delivery just before this step
        const sig = [...(d.docs || [])].reverse().find((x) => x.kind === 'signature');
        if (sig) d.signatureFileId = sig.fileId;
      }
      if (s.requireSignature && !d.signatureFileId) fail('signature_required', 'Bitte den Empfänger unterschreiben lassen.', 409);
      extra.pods = pods.length;
    }
    d.status = step;
    applyVehicle(d, a);
    addEvent(d, a, step, extra);
    store.put('deliveries', d);
    deliveryChanged(d);
    const params = { driver: userName(d.driverId), status: step, route: routeLabel(d), no: d.bookingNo };
    if (a.role === 'driver') notify(staffIds(t.id), step === 'delivered' ? 'delivered' : 'status', params, { deliveryId: d.id });
    else if (d.driverId) notify([d.driverId], 'changed', { no: d.bookingNo, route: routeLabel(d) }, { deliveryId: d.id });
    return decorate(d, a);
  }, { write: true });

  def('undoStep', ['driver'], (a, { id }) => {
    const t = tenantOf(a);
    const d = deliveryFor(a, id);
    const e = [...(d.events || [])].reverse().find((x) => !x.undone && STATUSES.includes(x.type));
    if (!e || e.by !== a.id || !e.from || now() - e.at > UNDO_MS) fail('undo_expired', 'Rückgängig ist nur 2 Minuten nach dem eigenen Schritt möglich.', 409);
    e.undone = true;
    d.status = e.from;
    if (e.type === 'accepted' && e.claimed) { d.driverId = null; d.openForAll = true; }
    if (e.type === 'unloaded') delete d.palletExchange;
    addEvent(d, a, 'undo', { undid: e.type, to: e.from });
    store.put('deliveries', d);
    deliveryChanged(d);
    if (e.type === 'accepted' && e.claimed) changed('deliveries', d, { allDrivers: true });
    notify(staffIds(t.id), 'undo', { driver: a.name, no: d.bookingNo, status: d.status }, { deliveryId: d.id });
    return decorate(d, a);
  }, { write: true });

  def('returnDelivery', ['driver'], (a, { id, reason }) => {
    const t = tenantOf(a);
    const d = deliveryFor(a, id);
    if (d.driverId !== a.id) fail('forbidden', 'Diese Lieferung ist nicht Ihnen zugeteilt.', 403);
    if (progressOf(d.status) >= progressOf('loaded')) fail('invalid', 'Nach dem Beladen bitte die Disposition anrufen.');
    const why = text(reason, 300);
    if (!why) fail('invalid', 'Bitte kurz den Grund angeben.', 400, { fields: ['reason'] });
    const from = d.status;
    d.status = 'open'; d.driverId = null; d.openForAll = false;
    addEvent(d, a, 'returned', { from, note: why });
    store.put('deliveries', d);
    deliveryChanged(d);
    changed('deliveries', d, { drivers: [a.id] });
    notify(staffIds(t.id), 'returned', { driver: a.name, no: d.bookingNo, text: why }, { deliveryId: d.id, priority: 'high' });
    return { ok: true };
  }, { write: true });

  def('reportProblem', ['driver'], (a, { id, code, note, fileId, photo, geo }) => {
    const t = tenantOf(a);
    const d = deliveryFor(a, id);
    if (d.driverId !== a.id) fail('forbidden', 'Diese Lieferung ist nicht Ihnen zugeteilt.', 403);
    if (DONE.includes(d.status)) fail('invalid', 'Die Lieferung ist schon abgeschlossen.');
    const c = PROBLEMS.includes(code) ? code : 'other';
    let fid = null;
    if (fileId) { const f = store.get('files', fileId); if (f && f.tenantId === t.id) fid = f.id; }
    // photo: true – the picture was uploaded to this delivery right before (also queued offline)
    if (!fid && photo) fid = [...(d.docs || [])].reverse().find((x) => x.kind === 'damage' && x.by === a.id && now() - x.at < 6 * 3600e3)?.fileId || null;
    d.problem = { code: c, note: text(note, 500), at: now(), by: a.id, fileId: fid };
    if (fid && !(d.docs || []).some((x) => x.fileId === fid)) d.docs = [...(d.docs || []), { fileId: fid, kind: 'damage', at: now(), by: a.id }];
    addEvent(d, a, 'problem', { code: c, note: d.problem.note, geo: cleanGeo(geo, settingsOf(t), a) });
    store.put('deliveries', d);
    deliveryChanged(d);
    notify(staffIds(t.id), 'problem', { problem: c, driver: a.name, no: d.bookingNo, route: routeLabel(d), note: d.problem.note ? ` – ${d.problem.note.slice(0, 80)}` : '' }, { deliveryId: d.id, priority: 'high' });
    return decorate(d, a);
  }, { write: true });

  def('addNote', TENANT, (a, { id, text: body }) => {
    const t = tenantOf(a);
    const d = deliveryFor(a, id);
    const msg = text(body, 1000);
    if (!msg) fail('invalid', 'Die Notiz ist leer.');
    if (a.role === 'driver' && d.driverId !== a.id) fail('forbidden', 'Diese Lieferung ist nicht Ihnen zugeteilt.', 403);
    d.notes = [...(d.notes || []), { id: newId(), at: now(), by: a.id, role: a.role, text: msg }].slice(-100);
    addEvent(d, a, 'note', { note: msg.slice(0, 140) });
    store.put('deliveries', d);
    deliveryChanged(d);
    const params = { from: a.name, no: d.bookingNo, text: msg.slice(0, 120) };
    if (a.role === 'driver') notify(staffIds(t.id), 'note', params, { deliveryId: d.id });
    else if (d.driverId) notify([d.driverId], 'note', params, { deliveryId: d.id });
    return decorate(d, a);
  }, { write: true });

  // ---------- files ----------
  const FILE_KINDS = ['pod', 'load', 'damage', 'signature', 'cmr', 'other', 'logo', 'icon'];
  const MIME_OK = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  /** Register an uploaded file (bytes are stored by the transport). Returns the file record. */
  def('createFile', TENANT, (a, { kind, mime, size, name, data, deliveryId }) => {
    const t = tenantOf(a);
    const k = FILE_KINDS.includes(kind) ? kind : 'other';
    if (['logo', 'icon'].includes(k) && a.role !== 'admin') fail('forbidden', 'Nur der Admin kann das Logo ändern.', 403);
    if (!MIME_OK.includes(mime) || (['logo', 'icon', 'signature'].includes(k) && mime === 'application/pdf')) fail('invalid', 'Erlaubt sind Fotos (JPG, PNG, WebP) und PDF.');
    const max = mime === 'application/pdf' ? 15e6 : 10e6;
    if (!(size > 0) || size > max) fail('invalid', 'Die Datei ist zu groß.');
    const f = { id: newId(), tenantId: t.id, kind: k, mime, size, name: str(name, 120) || `${k}.${mime.split('/')[1]}`, by: a.id, at: now(), deliveryId: deliveryId || null };
    if (data) f.data = data; // demo transport keeps the bytes inline (data URL)
    if (deliveryId) {
      const d = deliveryFor(a, deliveryId);
      if (a.role === 'driver' && d.driverId !== a.id) fail('forbidden', 'Diese Lieferung ist nicht Ihnen zugeteilt.', 403);
      if (d.status === 'cancelled') fail('invalid', 'Die Lieferung ist storniert.');
      if (d.status === 'delivered' && a.role === 'driver') fail('invalid', 'Die Lieferung ist schon abgeschlossen.');
      d.docs = [...(d.docs || []), { fileId: f.id, kind: k, at: f.at, by: a.id, name: f.name, mime }];
      addEvent(d, a, 'doc', { kind: k, fileId: f.id });
      store.put('files', f);
      store.put('deliveries', d);
      deliveryChanged(d);
    } else store.put('files', f);
    return (({ data: _, ...rest }) => rest)(f);
  }, { write: true });

  def('removeDoc', TENANT, (a, { id, fileId }) => {
    const d = deliveryFor(a, id);
    const doc = (d.docs || []).find((x) => x.fileId === fileId);
    if (!doc) fail('not_found', 'Dokument nicht gefunden.', 404);
    if (a.role === 'driver' && (doc.by !== a.id || DONE.includes(d.status))) fail('forbidden', 'Dieses Dokument können Sie nicht entfernen.', 403);
    d.docs = d.docs.filter((x) => x.fileId !== fileId);
    addEvent(d, a, 'doc_removed', { kind: doc.kind, fileId });
    store.put('deliveries', d);
    store.del('files', fileId);
    deliveryChanged(d);
    return decorate(d, a);
  }, { write: true });

  /** Can this actor read the file? Logos/icons are public (login screen, manifest). */
  function canReadFile(actor, fileId) {
    const f = store.get('files', fileId);
    if (!f) return null;
    if (['logo', 'icon'].includes(f.kind)) return f;
    if (!actor || actor.tenantId !== f.tenantId) return null;
    if (actor.role === 'driver' && f.deliveryId) {
      const d = store.get('deliveries', f.deliveryId);
      if (!d || d.driverId !== actor.id) return null;
    }
    return f;
  }

  // ---------- maintenance ----------
  /** Delete delivery documents older than each tenant's retention. Returns removed file ids. */
  function purgeExpired() {
    const removed = [];
    for (const t of store.find('tenants', {})) {
      const years = settingsOf(t).retentionYears;
      const limit = now() - years * 365.25 * 864e5;
      for (const d0 of store.find('deliveries', { tenantId: t.id })) {
        if (!DONE.includes(d0.status) || d0.updatedAt > limit) continue;
        for (const doc of d0.docs || []) { store.del('files', doc.fileId); removed.push(doc.fileId); }
        if (d0.signatureFileId) { store.del('files', d0.signatureFileId); removed.push(d0.signatureFileId); }
        store.del('deliveries', d0.id);
      }
    }
    // positions are kept 90 days only, notifications 90 days, the audit log 3 years
    const geoLimit = now() - 90 * 864e5;
    for (const d0 of store.find('deliveries', {})) {
      if (!(d0.events || []).some((e) => e.geo && e.at < geoLimit)) continue;
      store.put('deliveries', { ...d0, events: d0.events.map((e) => (e.geo && e.at < geoLimit ? (({ geo, ...rest }) => rest)(e) : e)) });
    }
    for (const n of store.find('notifications', {})) if (n.at < geoLimit) store.del('notifications', n.id);
    // the log is kept 3 years; IP addresses and typed login names in it only 90 days
    for (const e of store.find('audit', {})) {
      if (e.at < now() - 3 * 365.25 * 864e5) store.del('audit', e.id);
      else if (e.at < geoLimit && (e.ip || e.extra?.who)) { const { ip, ...rest } = e; if (rest.extra?.who) rest.extra = (({ who, ...x }) => x)(rest.extra); store.put('audit', rest); }
    }
    return removed;
  }

  // ---------- integrations (Premium REST API) ----------
  function apiActor(key) {
    if (!key || !String(key).startsWith('lk_')) return null;
    const t = store.find('tenants', {}).find((x) => x.apiKey && x.apiKey === key);
    if (!t || !planOf(t).api) return null;
    return { id: 'api:' + t.id, tenantId: t.id, role: 'dispatcher', name: 'API', active: true };
  }

  // ---------- dispatcher ----------
  // With a start password only these calls work – the app shows the "own password" form first.
  const BEFORE_OWN_PASSWORD = new Set(['me', 'changePassword', 'updateProfile', 'listNotifications', 'markNotificationsRead']);
  /** meta: transport context, e.g. { ip } – written to the audit log. */
  function call(actor, name, args = {}, meta = null) {
    const m = M[name];
    if (!m) fail('not_found', `Unbekannte Aktion: ${name}`, 404);
    if (!actor) fail('unauthorized', 'Bitte anmelden.', 401);
    if (!m.roles.includes(actor.role)) fail('forbidden', 'Dafür fehlt die Berechtigung.', 403);
    if (actor.mustChangePassword && !BEFORE_OWN_PASSWORD.has(name)) fail('password_change', 'Bitte zuerst ein eigenes Passwort vergeben.', 403);
    if (m.write && actor.role !== 'platform') {
      const t = getT(actor.tenantId);
      if (!writable(t, now())) fail('license_inactive', licenseState(t, now()) === 'cancelled' ? 'Der Vertrag ist gekündigt. Daten können bis zur Löschung angesehen und exportiert, aber nicht geändert werden.' : 'Die Lizenz ist nicht aktiv. Daten können angesehen und exportiert, aber nicht geändert werden.', 403, { state: licenseState(t, now()) });
    }
    let out;
    const queue = [];
    pending = queue;
    ctx = meta;
    try {
      store.tx(() => { out = m.fn(actor, args && typeof args === 'object' ? args : {}); });
    } finally {
      pending = null;
      ctx = null;
    }
    queue.forEach(deliver);
    return out;
  }

  /** Create the first licensor account (only while none exists). */
  function setupPlatform({ email, password, name }) {
    if (store.find('users', { role: 'platform' }).length) fail('conflict', 'Es gibt schon einen Lizenzgeber-Zugang.', 409);
    const e = normEmail(email);
    if (!isEmail(e)) fail('invalid', 'Bitte eine gültige E-Mail angeben.');
    if (String(password || '').length < 10) fail('invalid', 'Das Passwort braucht mindestens 10 Zeichen.');
    const u = { id: newId(), tenantId: null, role: 'platform', name: str(name, 80) || 'Lizenzgeber', email: e, lang: 'de', active: true, passwordHash: hash.make(String(password)), createdAt: now() };
    store.put('users', u);
    return publicUser(u);
  }

  return { call, auth, setupPlatform, canReadFile, purgeExpired, apiActor, methods: Object.keys(M), PLANS };
}
