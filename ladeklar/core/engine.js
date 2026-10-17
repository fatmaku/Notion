// LADEKLAR domain engine. Pure JavaScript, no dependencies: the Node server runs it on SQLite,
// the browser demo runs the very same code on an in-memory replica. Every rule that matters
// (tenant isolation, roles, licence state, seat limits, the delivery status machine,
// notifications) lives here, so both transports behave identically and are tested once.
//
//   const engine = createEngine({ store, now, newId, hash, onEvent, digest, token });
//   engine.call(actor, 'createDelivery', { ... })
//
// store: synchronous { get(col,id), find(col, where), put(col, doc), del(col, id), tx(fn) }
// hash:  { make(secret) -> string, verify(secret, stored) -> boolean }
// digest(s) -> hex string (API keys are stored hashed; default: pure-JS SHA-256)
// token() -> 24-char base64url random string (invite links; default: crypto.getRandomValues)
// onEvent(evt): { type:'change', tenantId, col, id, drivers?, allDrivers? } | { type:'notify', userId, notification }
//               | { type:'fileRemoved', tenantId, fileId } (the transport deletes the bytes)

import { NOTIFY_TEXT, fill, pickLang, statusText, problemText, PROBLEMS } from './texts.js';
import { sha256 } from './sha256.js';
import { base32Encode, matchStep } from './totp.js';

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
// Steps a delivery may take from each status. The arrival taps are optional, so a step queued on the
// phone still fits when the office switches "trackArrival" on or off in the middle of a tour.
const STEP_OK = { accepted: ['arrived_pickup', 'loaded'], arrived_pickup: ['loaded'], loaded: ['arrived_dropoff', 'unloaded'], arrived_dropoff: ['unloaded'], unloaded: ['delivered'] };
/** Running today: a tour confirmed for a later day only counts as planned. */
const isRunning = (d, today) => ACTIVE.includes(d.status) && !(d.status === 'accepted' && (d.pickup?.date || '') > today);
/** When a finished delivery was finished (older records without the field: last change). */
const doneAt = (d) => d.deliveredAt || d.cancelledAt || d.updatedAt || 0;

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
// every LOCK_AFTER failed logins in a row lock the account longer (15 min, 1 h, 24 h); a successful login resets the count
const LOCKS = [15 * 60 * 1000, 60 * 60 * 1000, 24 * 3600 * 1000];
const NOTIFY_KEEP = 100;
const OP_KEEP_MS = 7 * 864e5; // idempotency records (C1)
const INVITE_MS = 14 * 864e5;
const GiB = 2 ** 30;

export class EngineError extends Error {
  constructor(code, message, status = 400, details) {
    super(message);
    this.code = code;
    this.status = status;
    if (details) this.details = details;
  }
}
const fail = (code, message, status = 400, details) => { throw new EngineError(code, message, status, details); };
// fail with a translatable template: the client shows t(details.tkey, details.params), logs keep the filled German text
const fillT = (tpl, p = {}) => tpl.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(p[k]) : m));
const failT = (code, tkey, params, status = 400, details = {}) => fail(code, fillT(tkey, params), status, { ...details, tkey, params });

// ---------- small helpers ----------
const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
const str = (v, max = 200) => (v == null ? '' : String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max));
const text = (v, max = 2000) => (v == null ? '' : String(v).replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max));
const num = (v, min = 0, max = 1e9) => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null; };
const bool = (v) => v === true || v === 'true' || v === 1 || v === 'on';
// '+49 (0)176 …', '0049 176 …', '0176 …' and '+49 176 …' all become +49176…; the trunk zero after
// +49/+43/+41 is dropped (countries like Italy keep their leading zero).
export const normPhone = (v) => {
  let s = str(v, 40).replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s.startsWith('0')) s = '+49' + s.slice(1);
  return s.replace(/^\+(49|43|41)0(?=\d)/, '+$1');
};
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
  // void: arrivals of an earlier driver (the tour was handed to someone else before loading)
  const at = (type) => (d.events || []).filter((e) => e.type === type && !e.undone && !e.void).map((e) => e.at).pop();
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

// Public view of a user (never hashes, lock counters or secrets).
export function publicUser(u) {
  if (!u) return null;
  const { passwordHash, pinHash, failedLogins, lockedUntil, inviteToken, twoFactorSecret, twoFactorPending, twoFactorStep, ...rest } = u;
  if (u.role !== 'driver') rest.twoFactor = !!twoFactorSecret;
  return rest;
}
// Fields only the licensor sees (internal note, billing history, who created the customer …)
const LICENSOR_ONLY = ['apiKey', 'apiKeyHash', 'licenseNote', 'createdBy', 'history', 'statusAt', 'storageWarn'];
function publicTenant(t, { full = false } = {}) {
  if (!t) return null;
  const base = {
    id: t.id, code: t.code, name: t.name, branding: t.branding, phone: t.phone, status: t.status,
    settings: { ...DEFAULT_SETTINGS, ...t.settings },
  };
  if (!full) return base;
  const rest = { ...t };
  for (const k of LICENSOR_ONLY) delete rest[k];
  return { ...rest, settings: base.settings, apiKeySet: !!(t.apiKeyHash || t.apiKey), apiKeyHint: t.apiKeyHash ? t.apiKeyHint || '' : '' };
}

// ========================================================================================
export function createEngine({ store, now = () => Date.now(), newId, hash, onEvent = () => {}, rand = Math.random, digest = sha256, token }) {
  if (!store || !newId || !hash) throw new Error('createEngine needs store, newId and hash');
  const randBytes = (n) => {
    const b = new Uint8Array(n);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(b);
    else for (let i = 0; i < n; i++) b[i] = Math.floor(rand() * 256);
    return b;
  };
  const B64U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const newToken = token || (() => Array.from(randBytes(24), (x) => B64U[x & 63]).join(''));
  let dummyHash = null; // compared against when the account does not exist (same timing, sec-18)
  const slowNoMatch = (secret) => { dummyHash = dummyHash || hash.make(B64U); hash.verify(String(secret || '') + '\u0000', dummyHash); };

  // Events raised inside call() are held back until the write has committed.
  let pending = null;
  const deliver = (evt) => { try { onEvent(evt); } catch (e) { /* listeners must never break a write */ } };
  const emit = (evt) => { if (pending) pending.push(evt); else deliver(evt); };
  const getT = (id) => store.get('tenants', id);
  let ctx = null; // context of the running call from the transport, e.g. { ip } on the server
  let failHooks = null; // work that must happen even when the running call fails and is rolled back
  const onFail = (fn) => { if (failHooks) failHooks.push(fn); };
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
  const adminIds = (tenantId) => store.find('users', { tenantId, role: 'admin' }).filter((u) => u.active).map((u) => u.id);
  const platformIds = () => store.find('users', { role: 'platform' }).filter((u) => u.active).map((u) => u.id);
  // a tenant doc is its own tenant: its change events go to that company's users too (C5)
  const changed = (col, doc, extra = {}) => emit({ type: 'change', tenantId: col === 'tenants' ? doc.id : (doc.tenantId || null), col, id: doc.id, ...extra });
  const offered = (d) => d.status === 'open' && !d.driverId && d.openForAll;
  // a job that was offered to everyone (before) and is withdrawn or taken must vanish from every driver's list
  const deliveryChanged = (d, before) => changed('deliveries', d, offered(d) || (before && offered(before)) ? { allDrivers: true } : { drivers: d.driverId ? [d.driverId] : [] });

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

  // at: effective time (the driver's tap, see tapTime); `rx` keeps the server's receive time when it differs
  function addEvent(d, actor, type, extra = {}, at = null) {
    d.events = d.events || [];
    const rx = now(), ts = at ?? rx;
    const e = { id: newId(), at: ts, ...(ts !== rx ? { rx } : {}), type, by: actor?.id || null, role: actor?.role || null, ...extra };
    d.events.push(e);
    // a tap sent late from a dead zone goes to its place in the timeline (stable sort)
    if (d.events.length > 1 && d.events[d.events.length - 2].at > ts) d.events.sort((x, y) => x.at - y.at);
    if (d.events.length > 200) d.events = d.events.slice(-200);
    d.updatedAt = rx;
    return e;
  }

  // C2: a driver's tap counts at its device time `at` (ms) when that is plausible – at most 2 minutes
  // ahead of the server, at most 72 hours old and not before the last step or (re)assignment of the
  // delivery (notes, documents and edits do not count: uploads replayed after a dead zone get the
  // server time and must not void the tap time of the next step). Otherwise the server time.
  const TIMELINE = new Set([...STATUSES, 'created', 'assigned', 'unassigned', 'returned', 'undo']);
  function tapTime(d, at) {
    const n = now(), x = Number(at);
    if (!Number.isFinite(x) || x > n + 2 * 60e3 || x < n - 72 * 3600e3) return n;
    const last = (d.events || []).reduce((m, e) => (!e.undone && TIMELINE.has(e.type) && e.at > m ? e.at : m), 0);
    return x >= last ? x : n;
  }

  // Vehicle fields taken from the driver's own selection are listed in d.autoVehicle; a vehicle the
  // office picked itself is not (deliveryInput takes a changed field off the list).
  const takeVehicle = (d, k, id) => { d[k] = id; if (!(d.autoVehicle || []).includes(k)) d.autoVehicle = [...(d.autoVehicle || []), k]; };
  // C20: when the driver changes before loading, the new driver confirms the tour himself and brings his
  // own truck (the previous driver's truck/trailer go, a vehicle set by the office stays); arrivals of
  // the earlier driver no longer count as waiting time.
  function newDriverReset(d) {
    if (['accepted', 'arrived_pickup'].includes(d.status)) d.status = 'open';
    for (const k of d.autoVehicle || []) d[k] = null;
    delete d.autoVehicle;
    for (const e of d.events || []) if ((e.type === 'arrived_pickup' || e.type === 'arrived_dropoff') && !e.undone) e.void = true;
  }
  const outOfRange = (v, max) => v !== '' && v != null && !(Number(v) >= 0 && Number(v) <= max);

  // ---------- validation of delivery input ----------
  function deliveryInput(t, input, existing) {
    const d = existing ? clone(existing) : {};
    if ('customer' in input) d.customer = str(input.customer, 120);
    if ('reference' in input) d.reference = str(input.reference, 60);
    if ('pickup' in input) d.pickup = cleanPlace({ ...(d.pickup || {}), ...input.pickup });
    if ('dropoff' in input) d.dropoff = cleanPlace({ ...(d.dropoff || {}), ...input.dropoff });
    if ('goods' in input) {
      const g = input.goods || {};
      if (outOfRange(g.pallets, 66)) fail('invalid', 'Paletten bitte zwischen 0 und 66 angeben.', 400, { fields: ['goods.pallets'] });
      if (outOfRange(g.weightKg, 60000)) fail('invalid', 'Gewicht bitte zwischen 0 und 60.000 kg angeben.', 400, { fields: ['goods.weightKg'] });
      d.goods = { text: str(g.text, 200), pallets: num(g.pallets, 0, 66), weightKg: num(g.weightKg, 0, 60000), adr: bool(g.adr), temp: str(g.temp, 30) };
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
      // a changed vehicle is the office's own choice (a form re-sending the same value changes nothing)
      if (k !== 'driverId' && d.autoVehicle && v !== (d[k] || null)) d.autoVehicle = d.autoVehicle.filter((x) => x !== k);
      d[k] = v;
    }
    const pc = d.pickup?.city || d.pickup?.place, dc = d.dropoff?.city || d.dropoff?.place;
    if (!pc || !dc) fail('invalid', 'Bitte Lade- und Entladeort angeben (z. B. Stuttgart → Hamburg).', 400, { fields: ['pickup.city', 'dropoff.city'] });
    if (!d.pickup.date) fail('invalid', 'Bitte das Ladedatum angeben.', 400, { fields: ['pickup.date'] });
    if (d.dropoff.date && d.dropoff.date < d.pickup.date) fail('invalid', 'Das Entladedatum liegt vor dem Ladedatum.', 400, { fields: ['dropoff.date'] });
    if ('pickup' in input || 'dropoff' in input) {
      const P = d.pickup, D = d.dropoff;
      if (P.from && P.to && P.to < P.from) fail('invalid', 'Ladestelle: Die Uhrzeit „bis“ liegt vor „von“.', 400, { fields: ['pickup.from', 'pickup.to'] });
      if (D.from && D.to && D.to < D.from) fail('invalid', 'Entladestelle: Die Uhrzeit „bis“ liegt vor „von“.', 400, { fields: ['dropoff.from', 'dropoff.to'] });
      // same day: the drop-off window must not end before the pickup window starts
      const dropEnd = D.to || D.from, pickStart = P.from || P.to;
      if (D.date === P.date && dropEnd && pickStart && dropEnd < pickStart) fail('invalid', 'Die Entladezeit liegt vor der Ladezeit.', 400, { fields: ['dropoff.from', 'dropoff.to'] });
    }
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
      if (users.filter((u) => u.role === 'driver').length >= max) failT('seat_limit', 'Ihr Tarif „{plan}“ umfasst {max} Fahrer. Für weitere Fahrer bitte Tarif erweitern.', { plan: p.name, max }, 409, { max });
    } else if (p.staff != null && users.filter((u) => u.role !== 'driver').length >= p.staff + 1) {
      failT('seat_limit', 'Ihr Tarif „{plan}“ umfasst {max} Büro-Zugänge plus Admin.', { plan: p.name, max: p.staff }, 409, { max: p.staff });
    }
  }

  // Staff and licensor e-mails are unique across all companies, because the login is global by
  // e-mail (C19). Driver e-mails are contact data only: never used to sign in, never unique.
  const STAFF_LOGIN = ['admin', 'dispatcher', 'platform'];
  function emailTaken(email, exceptId) {
    return store.find('users', { email }).some((u) => u.id !== exceptId && u.role !== 'driver');
  }
  // Phone and personal number identify a driver at the login, so both are unique per company.
  // Stored phones are compared normalised (older records may still hold '+490176…').
  function driverIdCheck(tenantId, phone, personalNo, exceptId) {
    const others = store.find('users', { tenantId, role: 'driver' }).filter((x) => x.id !== exceptId && !x.deleted);
    if (phone && others.some((x) => normPhone(x.phone) === phone)) fail('conflict', 'Diese Handynummer ist schon vergeben.', 409, { fields: ['phone'] });
    if (personalNo && others.some((x) => x.personalNo === personalNo || normPhone(x.phone) === normPhone(personalNo))) fail('conflict', 'Diese Personalnummer ist schon vergeben.', 409, { fields: ['personalNo'] });
  }
  /** Invite link for a driver (C11): single use, valid 14 days. Returned once, never listed. */
  function newInvite(u) {
    u.inviteToken = newToken();
    u.inviteExpires = now() + INVITE_MS;
    return { token: u.inviteToken, expiresAt: u.inviteExpires };
  }
  function inviteUser(tk) {
    const s = str(tk, 64);
    if (s.length < 16) return null;
    const u = store.find('users', { inviteToken: s }).find((x) => x.role === 'driver' && x.active && !x.deleted);
    const t = u && getT(u.tenantId);
    return u && u.inviteExpires > now() && t && t.status !== 'cancelled' ? u : null;
  }

  // ---------- login ----------
  // 5 failed logins in a row → 15 min, 10 → 1 h, 15 and more → 24 h (sec-19)
  const lockLevel = (u) => Math.min(LOCKS.length, Math.max(1, Math.floor((u.failedLogins || 0) / LOCK_AFTER))) - 1;
  function checkLock(u) {
    if (!(u.lockedUntil && u.lockedUntil > now())) return;
    const until = { until: u.lockedUntil }, level = lockLevel(u);
    if (level === 0) fail('locked', 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.', 429, until);
    if (level === 1) fail('locked', 'Zu viele Fehlversuche. Bitte in einer Stunde erneut versuchen.', 429, until);
    fail('locked', 'Zu viele Fehlversuche. Der Zugang ist für 24 Stunden gesperrt. Ein neuer PIN bzw. ein neues Passwort hebt die Sperre auf.', 429, until);
  }
  function loginFailed(u) {
    const x = clone(u);
    x.failedLogins = (x.failedLogins || 0) + 1;
    if (x.failedLogins % LOCK_AFTER === 0) {
      x.lockedUntil = now() + LOCKS[lockLevel(x)];
      // the first 24-hour lock is reported to the company's office
      if (x.tenantId && x.failedLogins === LOCK_AFTER * LOCKS.length) notify(staffIds(x.tenantId).filter((id) => id !== x.id), 'lockout', { name: x.name });
    }
    store.put('users', x);
  }
  function loginOk(u, meta, extra = null) {
    const x = { ...clone(u), ...extra };
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
  function driverPin(t, u, pin, meta, extra) {
    checkLock(u);
    if (!hash.verify(String(pin || ''), u.pinHash)) { loginFailed(u); loginRefused(u, meta, null, 'bad_login', 'Firmencode, Telefonnummer oder PIN ist falsch.'); }
    if (['cancelled', 'suspended', 'expired'].includes(licenseState(t, now()))) fail('license_inactive', 'Der Zugang ist zurzeit gesperrt. Bitte die Disposition anrufen.', 403);
    return publicUser(loginOk(u, meta, extra));
  }

  const auth = {
    /** Staff and platform login with e-mail + password (+ 6-digit code with 2FA). meta: { ip } from the transport. */
    login({ email, password, code } = {}, meta = null) {
      const e = normEmail(email);
      // drivers never sign in by e-mail, so a driver record can never take over or block a login
      const list = e ? store.find('users', { email: e }).filter((x) => STAFF_LOGIN.includes(x.role) && !x.deleted) : [];
      const u = list.find((x) => x.active) || list[0];
      // unknown account: spend the same time on a hash as for a real one (sec-18)
      if (!u || !u.active) { slowNoMatch(password); loginRefused(null, meta, { who: e }, 'bad_login', 'E-Mail oder Passwort ist falsch.'); }
      checkLock(u);
      if (!hash.verify(String(password || ''), u.passwordHash)) { loginFailed(u); loginRefused(u, meta, null, 'bad_login', 'E-Mail oder Passwort ist falsch.'); }
      if (u.tenantId) {
        const t = getT(u.tenantId);
        // after a cancellation only the admin may still sign in – read-only, to export the data
        if (!t || (licenseState(t, now()) === 'cancelled' && u.role !== 'admin')) fail('license_inactive', 'Der Zugang dieses Unternehmens ist beendet. Nur der Admin kann die Daten noch exportieren.', 403);
      }
      let extra = null;
      if (u.twoFactorSecret) {
        const c = str(code, 12).replace(/\s/g, '');
        // the password was right: asking for the code is not a failed attempt
        if (!c) fail('need_2fa', 'Bitte den 6-stelligen Code aus der Authenticator-App eingeben.', 401);
        const step = matchStep(u.twoFactorSecret, c, now());
        // a code works once (no replay within its 90-second window)
        if (step == null || step <= (u.twoFactorStep ?? -1)) { loginFailed(u); loginRefused(u, meta, null, 'need_2fa', 'Der Code stimmt nicht. Bitte den aktuellen Code aus der App eingeben.'); }
        extra = { twoFactorStep: step };
      }
      return publicUser(loginOk(u, meta, extra));
    },
    /** Driver login with company code + phone (or personal number) + 6-digit PIN. */
    driverLogin({ code, phone, pin } = {}, meta = null) {
      const t = store.find('tenants', { code: str(code, 20).toUpperCase() })[0];
      if (!t) { slowNoMatch(pin); fail('bad_login', 'Firmencode, Telefonnummer oder PIN ist falsch.', 401); }
      const p = normPhone(phone), no = str(phone, 20);
      const list = store.find('users', { tenantId: t.id, role: 'driver' }).filter((x) => !x.deleted);
      // the phone number wins over a personal number that looks the same
      const u = (p && list.find((x) => normPhone(x.phone) === p)) || (no && list.find((x) => x.personalNo && x.personalNo === no));
      if (!u || !u.active) { slowNoMatch(pin); loginRefused(null, meta, { tenantId: t.id, who: p }, 'bad_login', 'Firmencode, Telefonnummer oder PIN ist falsch.'); }
      return driverPin(t, u, pin, meta);
    },
    /** Driver login from an invite link /i/<token>: the driver types only the PIN. The link works once. */
    inviteLogin({ token: tk, pin } = {}, meta = null) {
      const u = inviteUser(tk);
      if (!u) { slowNoMatch(pin); fail('bad_login', 'Einladung ungültig oder PIN falsch.', 401); }
      return driverPin(getT(u.tenantId), u, pin, meta, { inviteToken: null, inviteExpires: null });
    },
    /**
     * Resolve a session's user id to the current actor, or null when the session must end:
     * user deactivated/deleted, company gone, company cancelled (only the admin stays, read-only),
     * drivers of a suspended or expired company (the same rules as the login, C6).
     */
    actor(userId) {
      const u = store.get('users', userId);
      if (!u || !u.active || u.deleted) return null;
      if (u.tenantId) {
        const t = getT(u.tenantId);
        if (!t) return null;
        const st = licenseState(t, now());
        if (st === 'cancelled' && u.role !== 'admin') return null;
        if (u.role === 'driver' && ['suspended', 'expired', 'cancelled'].includes(st)) return null;
      }
      return publicUser(u);
    },
    /** Branding for the login screen of a company code (public). */
    publicTenant(code) {
      const t = store.find('tenants', { code: str(code, 20).toUpperCase() })[0];
      if (!t || t.status === 'cancelled') return null;
      return { code: t.code, name: t.name, branding: t.branding, phone: t.phone };
    },
    /** What the invite page shows before the PIN: first name, language, company branding. */
    inviteInfo(tk) {
      const u = inviteUser(tk);
      if (!u) return null;
      const t = getT(u.tenantId);
      return { name: u.name.split(' ')[0], lang: u.lang, tenant: { code: t.code, name: t.name, branding: t.branding, phone: t.phone } };
    },
  };

  // ========================================================================================
  // Methods callable through engine.call(actor, name, args). `roles` lists who may call;
  // `write` marks methods that need an active licence (trial or paid).
  const M = {};
  // `write` may be a function of the args (e.g. deactivating a user works in every licence state)
  // `secret` marks calls whose answer holds a PIN, password or key (never stored for idempotency)
  const def = (name, roles, fn, opts = {}) => { M[name] = { roles, fn, write: typeof opts.write === 'function' ? opts.write : !!opts.write, secret: !!opts.secret }; };
  const STAFF = ['admin', 'dispatcher'];
  const TENANT = ['admin', 'dispatcher', 'driver'];

  // ---------- session / profile ----------
  def('me', [...TENANT, 'platform'], (a) => {
    const t = a.tenantId ? getT(a.tenantId) : null;
    return {
      user: publicUser(store.get('users', a.id)),
      tenant: t ? publicTenant(t, { full: a.role === 'admin' }) : null,
      license: t ? { state: licenseState(t, now()), plan: planOf(t), trialEnd: t.trialEnd || null, licenseEnd: t.licenseEnd || null, driverSeats: driverSeats(t), ...(a.role !== 'driver' ? { storageUsed: storageOf(t), storageLimit: storageLimit(t) } : {}) } : null,
      unread: store.find('notifications', { userId: a.id }).filter((n) => !n.read).length,
      twoFactor: !!store.get('users', a.id)?.twoFactorSecret,
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

  // ---------- two-factor login (TOTP, RFC 6238) for office and licensor accounts ----------
  def('twoFactorSetup', STAFF_LOGIN, (a) => {
    const u = clone(store.get('users', a.id));
    if (u.twoFactorSecret) fail('invalid', 'Die Zwei-Faktor-Anmeldung ist schon eingeschaltet.', 409);
    u.twoFactorPending = base32Encode(randBytes(20)); // active only after the first correct code
    store.put('users', u);
    const t = u.tenantId ? getT(u.tenantId) : null;
    const issuer = t ? t.name : 'Ladeklar';
    return { secret: u.twoFactorPending, otpauthUrl: `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(u.email || '')}?secret=${u.twoFactorPending}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30` };
  }, { secret: true });
  def('twoFactorEnable', STAFF_LOGIN, (a, { code } = {}) => {
    const u = clone(store.get('users', a.id));
    if (!u.twoFactorPending) fail('invalid', 'Bitte die Einrichtung zuerst starten.', 409);
    const step = matchStep(u.twoFactorPending, code, now());
    if (step == null) fail('invalid', 'Der Code stimmt nicht. Bitte den aktuellen Code aus der App eingeben.', 400, { fields: ['code'] });
    Object.assign(u, { twoFactorSecret: u.twoFactorPending, twoFactorPending: null, twoFactorStep: step, twoFactorAt: now() });
    store.put('users', u);
    audit(a, '2fa.enable', u.id);
    return { twoFactor: true };
  });
  def('twoFactorDisable', STAFF_LOGIN, (a, { password } = {}) => {
    const u = clone(store.get('users', a.id));
    if (!hash.verify(String(password || ''), u.passwordHash)) fail('bad_login', 'Das aktuelle Passwort stimmt nicht.', 400);
    Object.assign(u, { twoFactorSecret: null, twoFactorPending: null, twoFactorStep: null, twoFactorAt: null });
    store.put('users', u);
    audit(a, '2fa.disable', u.id);
    return { twoFactor: false };
  });

  /** Export downloads are logged in the company's audit log (the server calls this for every download). */
  def('logExport', STAFF, (a, { kind } = {}) => {
    if (!['csv', 'json', 'zip', 'report'].includes(kind)) fail('invalid', 'Unbekannte Exportart.', 400);
    audit(a, 'export.' + kind, a.tenantId);
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
  // seats of a licence: drivers, vehicles and office accounts (staff counts the admin; null = unlimited)
  const limitsOf = (t) => { const p = planOf(t); return { drivers: driverSeats(t), vehicles: p.vehicles, staff: p.staff == null ? null : p.staff + 1 }; };
  function licenseView(t) {
    return {
      id: t.id, code: t.code, name: t.name, legalName: t.legalName || '', vatId: t.vatId || '', contact: t.contact, email: t.email, phone: t.phone, address: t.address,
      plan: t.plan, extraDrivers: t.extraDrivers || 0, storeApp: !!t.storeApp, status: t.status, state: licenseState(t, now()), domains: t.domains || [], domain: planOf(t).domain,
      trialEnd: t.trialEnd || null, licenseEnd: t.licenseEnd || null, paidSince: t.paidSince || null, createdAt: t.createdAt, branding: t.branding,
      licenseNote: t.licenseNote || '', billing: t.billing || 'monthly', seats: driverSeats(t), limits: limitsOf(t), monthly: monthlyPrice(t), usage: usage(t),
      storageUsed: storageOf(t), storageLimit: storageLimit(t),
      cancelRequestedAt: t.cancelRequestedAt || null, cancelReason: t.cancelReason || '', planRequest: t.planRequest || null,
    };
  }
  def('listTenants', ['platform'], () => store.find('tenants', {}).sort((a, b) => b.createdAt - a.createdAt).map(licenseView));
  // the licensor reads any customer; a customer admin reads the own licence (without the internal note)
  def('getTenantLicense', ['platform', 'admin'], (a, { id } = {}) => {
    const t = getT(a.role === 'admin' ? a.tenantId : id);
    if (!t) fail('not_found', 'Lizenznehmer nicht gefunden.', 404);
    const v = licenseView(t);
    if (a.role === 'admin') delete v.licenseNote;
    return v;
  });

  // Licence history: every change of status, plan, payment mode, extras or licence end is appended;
  // billingRun derives the invoices from it.
  const HISTORY_KEYS = ['state', 'plan', 'billing', 'extraDrivers', 'storeApp', 'licenseEnd'];
  const snapshot = (t, at = now()) => ({ at, state: t.status, plan: t.plan, billing: t.billing === 'yearly' ? 'yearly' : 'monthly', extraDrivers: t.extraDrivers || 0, storeApp: !!t.storeApp, licenseEnd: t.licenseEnd || null });
  function pushHistory(t) {
    const h = t.history || historyOf(t), s = snapshot(t), last = h[h.length - 1];
    if (last && HISTORY_KEYS.every((k) => last[k] === s[k])) return;
    t.history = [...h, s].slice(-500);
  }
  // customers created before the history existed: rebuilt from the dates on the record
  function historyOf(t) {
    if (t.history?.length) return t.history;
    const base = snapshot(t, t.createdAt), h = [];
    if (!t.paidSince || t.paidSince > t.createdAt) h.push({ ...base, state: 'trial' });
    if (t.paidSince) h.push({ ...base, at: t.paidSince, state: 'active' });
    if (['suspended', 'cancelled'].includes(t.status)) h.push({ ...base, at: Math.max(t.statusAt || 0, t.paidSince || 0, t.createdAt), state: t.status });
    return h;
  }

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
      bookingSeq: 0, apiKeyHash: null, supportAccessUntil: null, storageUsed: 0, createdAt: now(), createdBy: a.id,
    };
    t.history = [snapshot(t)];
    const password = str(input.adminPassword, 100) || genPassword(rand);
    const admin = {
      id: newId(), tenantId: t.id, role: 'admin', name: str(input.contact || 'Admin', 80) || 'Admin', email: adminEmail,
      phone: normPhone(input.phone), lang: 'de', active: true, passwordHash: hash.make(password), mustChangePassword: !input.adminPassword, createdAt: now(),
    };
    store.tx(() => { store.put('tenants', t); store.put('users', admin); });
    audit(a, 'tenant.create', t.id, { plan });
    changed('tenants', t);
    return { tenant: licenseView(t), admin: publicUser(admin), password };
  }, { secret: true });

  def('updateTenantLicense', ['platform'], (a, { id, force, ...p }) => {
    const before = getT(id);
    if (!before) fail('not_found', 'Lizenznehmer nicht gefunden.', 404);
    const t = clone(before);
    if (p.plan && PLANS[p.plan]) t.plan = p.plan;
    if ('extraDrivers' in p) t.extraDrivers = num(p.extraDrivers, 0, 999) || 0;
    if (!planOf(t).extraDriver) t.extraDrivers = 0; // Start has a fixed number of drivers
    if ('storeApp' in p) t.storeApp = bool(p.storeApp);
    if (t.storeApp && t.plan !== 'premium') fail('invalid', 'Die White-Label-App im Store ist ein Zusatz zum Tarif Premium.', 400, { fields: ['storeApp'] });
    if ('billing' in p) t.billing = p.billing === 'yearly' ? 'yearly' : 'monthly';
    // a test phase is only for customers who never paid (also a suspended or cancelled trial)
    if (('extendTrialDays' in p || (p.status === 'trial' && t.status !== 'trial')) && t.paidSince) fail('invalid', 'Die Testphase kann nur verlängert werden, solange der Kunde noch nicht bezahlt hat.', 409);
    if (p.status && ['trial', 'active', 'suspended', 'cancelled'].includes(p.status) && p.status !== t.status) {
      t.status = p.status;
      t.statusAt = now();
      if (p.status === 'active' && !t.paidSince) t.paidSince = now();
      if (p.status === 'cancelled') { t.cancelRequestedAt = null; t.cancelReason = ''; }
    }
    if ('trialEnd' in p) t.trialEnd = num(p.trialEnd) || null;
    if ('licenseEnd' in p) t.licenseEnd = isDate(p.licenseEnd) ? berlinEndOfDay(p.licenseEnd) : num(p.licenseEnd) || null;
    if ('extendTrialDays' in p) t.trialEnd = Math.max(t.trialEnd || 0, now()) + (num(p.extendTrialDays, 1, 365) || 0) * 864e5;
    // 'Aktivieren' with a licence end in the past would silently stay expired
    if (p.status === 'active' && t.licenseEnd && t.licenseEnd < now()) fail('invalid', 'Die Laufzeit ist abgelaufen. Bitte „Laufzeit bis“ ändern oder leeren und dann aktivieren.', 409, { fields: ['licenseEnd'] });
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
    if (planOf(t).domain !== 'custom') t.domains = []; // a downgrade frees the own domains
    if (p.branding) t.branding = { ...t.branding, ...cleanBranding(p.branding, t) };
    // a smaller plan must fit the drivers, vehicles and office accounts in use – or is forced on purpose;
    // then new drivers/vehicles are refused until the numbers fit again
    const lim = limitsOf(t), old = limitsOf(before);
    const shrinks = ['drivers', 'vehicles', 'staff'].some((k) => lim[k] != null && (old[k] == null || lim[k] < old[k])) || storageLimit(t) < storageLimit(before);
    if (!bool(force) && shrinks) {
      const u = usage(t), over = [];
      // the files in use must fit too – otherwise every delivery-note upload would be refused afterwards
      if (storageOf(t) > storageLimit(t)) over.push(`${(storageOf(t) / GiB).toLocaleString('de-DE', { maximumFractionDigits: 1 })} GB Speicher (erlaubt ${planOf(t).storageGB} GB)`);
      if (u.drivers > lim.drivers) over.push(`${u.drivers} Fahrer (erlaubt ${lim.drivers})`);
      if (lim.vehicles != null && u.vehicles > lim.vehicles) over.push(`${u.vehicles} Fahrzeuge (erlaubt ${lim.vehicles})`);
      if (lim.staff != null && u.staff > lim.staff) over.push(`${u.staff} Büro-Zugänge (erlaubt ${lim.staff})`);
      if (over.length) fail('over_limit', `Der neue Tarif ist zu klein: ${over.join(', ')}.`, 409, { drivers: u.drivers, vehicles: u.vehicles, staff: u.staff, storageUsed: storageOf(t), storageLimit: storageLimit(t), limits: lim });
    }
    if (t.plan !== before.plan) t.planRequest = null;
    pushHistory(t);
    store.put('tenants', t);
    audit(a, 'tenant.license', t.id, { plan: t.plan, status: t.status, ...(bool(force) ? { force: true } : {}) });
    changed('tenants', t);
    return licenseView(t);
  });

  /** Support case: the customer's admin is locked out. New one-time password (and 2FA off), must be changed at login. */
  def('resetTenantAdmin', ['platform'], (a, { id }) => {
    const t = getT(id);
    if (!t) fail('not_found', 'Lizenznehmer nicht gefunden.', 404);
    const admins = store.find('users', { tenantId: t.id, role: 'admin' }).filter((u) => !u.deleted).sort((x, y) => (y.active - x.active) || (x.createdAt - y.createdAt));
    if (!admins.length) fail('not_found', 'Dieser Kunde hat keinen Admin-Zugang.', 404);
    const u = clone(admins[0]);
    const password = genPassword(rand);
    Object.assign(u, { passwordHash: hash.make(password), mustChangePassword: true, failedLogins: 0, lockedUntil: null, active: true, twoFactorSecret: null, twoFactorPending: null, twoFactorStep: null });
    store.put('users', u);
    audit({ ...a, tenantId: t.id }, 'user.reset_by_licensor', u.id); // visible in the customer's own log
    return { password, user: publicUser(u) };
  }, { secret: true });

  /** Final deletion after a cancellation (AVV: return or delete). Type the company code to confirm. */
  def('deleteTenant', ['platform'], (a, { id, confirmCode }) => {
    const t = getT(id);
    if (!t) fail('not_found', 'Lizenznehmer nicht gefunden.', 404);
    if (t.status !== 'cancelled') fail('invalid', 'Löschen ist erst nach der Kündigung möglich.', 409);
    if (str(confirmCode, 20).toUpperCase() !== t.code) fail('invalid', `Zur Bestätigung bitte den Firmencode ${t.code} eingeben.`, 400, { fields: ['confirmCode'] });
    const userIds = store.find('users', { tenantId: t.id }).map((u) => u.id);
    const fileIds = store.find('files', { tenantId: t.id }).map((f) => f.id);
    for (const col of ['deliveries', 'vehicles', 'notifications', 'files', 'audit', 'ops', 'users']) for (const x of store.find(col, { tenantId: t.id })) store.del(col, x.id);
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

  // Billing rules (derived from tenant.history, months in German time):
  // - Paid = status 'active', or 'suspended' after the licence had been paid (AGB § 14 Abs. 4: payment
  //   continues during a suspension), until the licence end ('Laufzeit bis'). Trial days are never paid.
  // - Monthly: every calendar month with at least one paid day is billed – also the month in which a
  //   cancellation takes effect. Plan and extras as in effect at the last paid moment of the month.
  // - Yearly: 12 months at the price of 10 (base + extra drivers + store-app operation), billed in the
  //   first paid month with yearly payment and again every 12 months (renewal day = same day of the
  //   month a year later) – unless the licence ends before the renewal day. Plan/extras as at the start
  //   of the year; changes within a paid year count from the next renewal.
  // - Monthly → yearly: a new year starts in the month of the switch (no monthly fee that month).
  //   Yearly → monthly: monthly fees start once the paid year has ended.
  // - Store app (Premium): 1.990 € set-up once, in the first paid month with the app switched on.
  const BILLING_RULES = [
    'Bezahlt ist eine Lizenz, solange sie aktiv ist – auch während einer Sperre (AGB § 14 Abs. 4) – bis zum Ende der Laufzeit. Testtage werden nie berechnet.',
    'Monatlich: jeder Kalendermonat mit mindestens einem bezahlten Tag, auch der Monat, in dem eine Kündigung wirksam wird. Tarif und Zusätze wie am letzten bezahlten Tag des Monats.',
    'Jährlich: 12 Monate zum Preis von 10, im ersten bezahlten Monat und dann alle 12 Monate – nicht, wenn die Laufzeit vor dem Verlängerungstag endet. Änderungen im bezahlten Jahr gelten ab der Verlängerung.',
    'Wechsel monatlich → jährlich: Im Wechselmonat beginnt ein neues Jahr (ohne Monatsbeitrag). Wechsel jährlich → monatlich: Monatsbeiträge erst nach dem bezahlten Jahr.',
    'White-Label-App: Einrichtung 1.990 € einmalig im ersten bezahlten Monat mit App (nur Premium).',
  ].join('\n');
  const dayIso = (y, m, d) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
  const dayStart = (iso) => { const [y, m, d] = iso.split('-').map(Number); return berlinEndOfDay(dayIso(y, m - 1, d - 1)) + 1000; };
  const monthStart = (idx) => dayStart(dayIso(Math.floor(idx / 12), idx % 12, 1));
  /** Start of the German day one year after `ms` (29 Feb → 28 Feb). */
  const yearAfter = (ms) => { const [y, m, d] = berlinDate(ms).split('-').map(Number); return dayStart(dayIso(y + 1, m - 1, Math.min(d, new Date(Date.UTC(y + 1, m, 0)).getUTCDate()))); };
  /** Paid intervals [from, to) up to `until`, each with the history entry in effect. */
  function paidSegments(t, until) {
    const h = historyOf(t), out = [];
    let paidBefore = false;
    h.forEach((e, i) => {
      if (e.state === 'active') paidBefore = true;
      if (!(e.state === 'active' || (e.state === 'suspended' && paidBefore))) return;
      const to = Math.min(i + 1 < h.length ? h[i + 1].at : until, until, e.licenseEnd ? e.licenseEnd + 1 : Infinity);
      if (to > e.at) out.push({ from: e.at, to, e });
    });
    return out;
  }
  /** The invoice of one customer for the month index `cur`, or null. */
  function invoiceFor(t, cur) {
    const segs = paidSegments(t, monthStart(cur + 1));
    if (!segs.length) return null;
    let coveredUntil = -Infinity, bill = null;
    for (let i = monthIndex(monthOf(segs[0].from)); i <= cur; i++) {
      const s = monthStart(i), e = monthStart(i + 1);
      const part = segs.map((g) => ({ ...g, from: Math.max(g.from, s, coveredUntil), to: Math.min(g.to, e) })).filter((g) => g.to > g.from);
      bill = null;
      if (!part.length) continue;
      const y = part.find((g) => g.e.billing === 'yearly');
      if (y) {
        const renewal = y.from === coveredUntil;
        coveredUntil = yearAfter(y.from);
        bill = { yearly: true, e: y.e, reason: renewal ? 'Jahresbeitrag – Verlängerung' : segs.some((g) => g.from < y.from && g.e.billing === 'monthly') ? 'Jahresbeitrag – Wechsel auf jährliche Zahlung' : 'Jahresbeitrag' };
      } else {
        const last = part[part.length - 1];
        bill = { yearly: false, e: last.e, reason: part.some((g) => g.e.state === 'suspended') ? 'Monatsbeitrag – läuft während der Sperre weiter' : last.to < e && !segs.some((g) => g.from >= last.to) ? 'Monatsbeitrag – letzter Monat' : 'Monatsbeitrag' };
      }
    }
    const app = segs.find((g) => g.e.storeApp && g.e.plan === 'premium');
    const setup = app && monthIndex(monthOf(app.from)) === cur;
    if (!bill && !setup) return null;
    const items = [];
    if (bill) {
      const p = PLANS[bill.e.plan] || PLANS.start;
      items.push({ text: `Ladeklar ${p.name}`, qty: 1, unit: p.price });
      if (p.extraDriver && bill.e.extraDrivers) items.push({ text: 'Zusätzliche Fahrer', qty: bill.e.extraDrivers, unit: p.extraDriver });
      if (bill.e.storeApp) items.push({ text: 'White-Label-App (Store-Betrieb)', qty: 1, unit: STORE_APP.monthly });
    }
    const recurring = items.reduce((s, i) => s + i.qty * i.unit, 0) * (bill?.yearly ? 10 : 1);
    if (setup) items.push({ text: 'White-Label-App (Einrichtung, einmalig)', qty: 1, unit: STORE_APP.setup, once: true });
    const net = Math.round((recurring + (setup ? STORE_APP.setup : 0)) * 100) / 100;
    return {
      tenantId: t.id, name: t.legalName || t.name, code: t.code, billing: bill?.yearly ? 'yearly' : 'monthly',
      period: bill?.yearly ? `${monthLabel(cur)} – ${monthLabel(cur + 11)}` : monthLabel(cur), items, net,
      vat: Math.round(net * VAT * 100) / 100, gross: Math.round(net * (1 + VAT) * 100) / 100,
      reason: [bill?.reason, setup && 'Einrichtung der White-Label-App'].filter(Boolean).join(' · '),
    };
  }
  def('billingRun', ['platform'], (a, { month } = {}) => {
    const m = /^\d{4}-\d{2}$/.test(month || '') ? month : monthOf(now());
    const cur = monthIndex(m);
    const lines = store.find('tenants', {}).map((t) => invoiceFor(t, cur)).filter(Boolean).sort((x, y) => x.name.localeCompare(y.name, 'de'));
    return { month: m, lines, net: Math.round(lines.reduce((s, l) => s + l.net, 0) * 100) / 100, gross: Math.round(lines.reduce((s, l) => s + l.gross, 0) * 100) / 100, rules: BILLING_RULES };
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
        if (k === 'retentionYears') {
          // 1–10 whole years; an empty field (sent as '' or 0) or anything else keeps the current value
          const v = p.settings[k], n = ['number', 'string'].includes(typeof v) ? Number(v) : NaN;
          if (Number.isInteger(n) && n >= 1 && n <= 10) s[k] = n;
        }
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

  // The key is shown once; only its hash and the last 4 characters are stored. { clear: true }
  // switches the API off and works in every licence state.
  def('rotateApiKey', ['admin'], (a, { clear } = {}) => {
    const t = clone(tenantOf(a));
    delete t.apiKey;
    if (bool(clear)) {
      Object.assign(t, { apiKeyHash: null, apiKeyHint: '' });
      store.put('tenants', t);
      audit(a, 'apikey.clear', t.id);
      return { apiKey: null };
    }
    if (!planOf(t).api) fail('plan', 'Die REST-API ist im Tarif Premium enthalten.', 403);
    const key = 'lk_' + newToken() + newToken();
    Object.assign(t, { apiKeyHash: digest(key), apiKeyHint: key.slice(-4) });
    store.put('tenants', t);
    audit(a, 'apikey.rotate', t.id);
    return { apiKey: key };
  }, { write: (p) => !bool(p.clear), secret: true });

  def('grantSupportAccess', ['admin'], (a, { hours = 0 } = {}) => {
    const t = clone(tenantOf(a));
    const h = num(hours, 0, 72) || 0;
    t.supportAccessUntil = h ? now() + h * 3600e3 : null;
    store.put('tenants', t);
    audit(a, h ? 'support.grant' : 'support.revoke', t.id, { hours: h });
    return { supportAccessUntil: t.supportAccessUntil };
  });

  // ---------- customer requests to the licensor (cancellation, plan change) ----------
  function requestable(a) {
    const t = clone(tenantOf(a));
    if (licenseState(t, now()) === 'cancelled') fail('license_inactive', 'Der Vertrag ist schon gekündigt.', 409);
    return t;
  }
  def('requestCancellation', ['admin'], (a, { reason } = {}) => {
    const t = requestable(a);
    Object.assign(t, { cancelRequestedAt: now(), cancelReason: text(reason, 500) });
    store.put('tenants', t);
    audit(a, 'tenant.cancel_request', t.id, t.cancelReason ? { reason: t.cancelReason.slice(0, 200) } : null);
    notify(platformIds(), 'cancelRequest', { name: t.name, code: t.code, reason: t.cancelReason ? ` Grund: ${t.cancelReason.slice(0, 160)}` : '' }, { priority: 'high' });
    changed('tenants', t);
    return { cancelRequestedAt: t.cancelRequestedAt, cancelReason: t.cancelReason };
  });
  def('requestPlanChange', ['admin'], (a, { plan, note } = {}) => {
    const t = requestable(a);
    if (!PLANS[plan]) fail('invalid', 'Bitte einen Tarif wählen.', 400, { fields: ['plan'] });
    t.planRequest = { plan, note: text(note, 500), at: now() };
    store.put('tenants', t);
    audit(a, 'tenant.plan_request', t.id, { plan });
    notify(platformIds(), 'planRequest', { name: t.name, code: t.code, plan: PLANS[plan].name, note: t.planRequest.note ? ` ${t.planRequest.note.slice(0, 160)}` : '' });
    changed('tenants', t);
    return { planRequest: t.planRequest };
  });

  // the licensor closes a customer request without changing plan or status (e.g. after a phone call)
  def('closeRequest', ['platform'], (a, { id, kind } = {}) => {
    const t = clone(getT(str(id, 64)));
    if (!t) fail('not_found', 'Lizenznehmer nicht gefunden.', 404);
    if (kind === 'cancel') { t.cancelRequestedAt = null; t.cancelReason = null; }
    else if (kind === 'plan') t.planRequest = null;
    else fail('invalid', 'Unbekannte Anfrage.');
    store.put('tenants', t);
    audit(a, 'tenant.request_closed', t.id, { kind });
    changed('tenants', t);
    return { ok: true };
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
    let secret, invite;
    if (role === 'driver') {
      u.phone = normPhone(input.phone);
      if (u.phone.length < 8) fail('invalid', 'Bitte eine gültige Handynummer angeben (für den Login).', 400, { fields: ['phone'] });
      u.personalNo = str(input.personalNo, 20);
      driverIdCheck(t.id, u.phone, u.personalNo);
      u.licenseClass = str(input.licenseClass, 20);
      u.note = text(input.note, 300);
      // contact only – a driver's e-mail is never a login and never blocks anyone else's
      const e = normEmail(input.email);
      if (e && !isEmail(e)) fail('invalid', 'Bitte eine gültige E-Mail angeben.', 400, { fields: ['email'] });
      u.email = e || null;
      secret = str(input.pin, 6);
      if (!/^\d{6}$/.test(secret)) secret = genPin(rand);
      u.pinHash = hash.make(secret);
      u.vehicleId = null; u.trailerId = null;
      invite = newInvite(u);
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
    return { user: publicUser(u), [role === 'driver' ? 'pin' : 'password']: secret, ...(invite ? { invite } : {}) };
  }, { write: true, secret: true });

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
      if (u.role === 'driver' && ph.length < 8) fail('invalid', 'Bitte eine gültige Handynummer angeben.', 400, { fields: ['phone'] });
      u.phone = ph;
    }
    if (u.role === 'driver' && ('phone' in p || 'personalNo' in p)) driverIdCheck(u.tenantId, 'phone' in p ? u.phone : '', 'personalNo' in p ? u.personalNo : '', u.id);
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
  }, { write: (p) => bool(p.active) }); // switching a person off works in every licence state

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
    if (ds.some((d) => progressOf(d.status) >= progressOf('loaded'))) fail('invalid', 'Der Fahrer hat eine beladene Tour. Bitte die Tour erst abschließen oder stornieren.', 409);
    for (const d0 of ds) {
      const d = clone(d0);
      newDriverReset(d); // C20
      d.driverId = null; d.status = 'open'; d.openForAll = false;
      addEvent(d, a, 'unassigned', { from: d0.status });
      store.put('deliveries', d);
      deliveryChanged(d);
    }
    if (u.role === 'driver') releaseAll(u);
    Object.assign(u, {
      name: 'Gelöschter Nutzer', email: null, phone: '', personalNo: '', licenseClass: '', note: '', passwordHash: null, pinHash: null,
      active: false, deleted: true, deletedAt: now(), geoConsent: null, geoConsentAt: null, failedLogins: 0, lockedUntil: null, mustChangePassword: false,
      inviteToken: null, inviteExpires: null, twoFactorSecret: null, twoFactorPending: null, twoFactorStep: null,
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
    let secret, invite = null;
    if (u.role === 'driver') { secret = genPin(rand); u.pinHash = hash.make(secret); invite = newInvite(u); }
    // new password = recovery for a lost authenticator, too: two-factor login is switched off
    else { secret = genPassword(rand); u.passwordHash = hash.make(secret); u.mustChangePassword = true; Object.assign(u, { twoFactorSecret: null, twoFactorPending: null, twoFactorStep: null }); }
    u.failedLogins = 0; u.lockedUntil = null;
    store.put('users', u);
    audit(a, 'user.reset', u.id);
    return { [u.role === 'driver' ? 'pin' : 'password']: secret, user: publicUser(u), ...(invite ? { invite } : {}) };
  }, { write: true, secret: true });

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
    if (store.find('vehicles', { tenantId: t.id }).some((x) => x.active !== false && x.plate === v.plate && x.id !== v.id)) failT('conflict', 'Das Kennzeichen {plate} ist schon angelegt.', { plate: v.plate }, 409, { fields: ['plate'] });
    if ('type' in p) v.type = VEHICLE_TYPES[v.kind || 'truck'].includes(p.type) ? p.type : VEHICLE_TYPES[v.kind || 'truck'][0];
    if (!v.type) v.type = VEHICLE_TYPES[v.kind || 'truck'][0];
    if ('name' in p) v.name = str(p.name, 40);
    if (outOfRange(p.payloadKg, 60000)) fail('invalid', 'Nutzlast bitte zwischen 0 und 60.000 kg angeben.', 400, { fields: ['payloadKg'] });
    if (outOfRange(p.pallets, 66)) fail('invalid', 'Palettenstellplätze bitte zwischen 0 und 66 angeben.', 400, { fields: ['pallets'] });
    if ('payloadKg' in p) v.payloadKg = num(p.payloadKg, 0, 60000);
    if ('pallets' in p) v.pallets = num(p.pallets, 0, 66);
    if ('features' in p) v.features = (Array.isArray(p.features) ? p.features : []).filter((f) => VEHICLE_FEATURES.includes(f));
    if ('huDue' in p) v.huDue = isDate(p.huDue) ? p.huDue : '';
    if ('spDue' in p) v.spDue = isDate(p.spDue) ? p.spDue : '';
    if ('status' in p) v.status = p.status === 'workshop' ? 'workshop' : 'ok';
    if ('note' in p) v.note = text(p.note, 300);
    return v;
  }
  // One-off repair of stored data: an edit used to turn trailers into trucks (office/veh-1). A truck can
  // never get a trailer-only body type, so such a "truck" was a trailer. (A trailer re-saved through the
  // form also lost its type and cannot be told apart – the office corrects those by hand.)
  for (const v of store.find('vehicles', {})) {
    if (v.kind === 'truck' && VEHICLE_TYPES.trailer.includes(v.type) && !VEHICLE_TYPES.truck.includes(v.type)) store.put('vehicles', { ...v, kind: 'trailer' });
  }
  def('createVehicle', STAFF, (a, p) => {
    const t = tenantOf(a);
    const max = planOf(t).vehicles;
    if (max != null && store.find('vehicles', { tenantId: t.id }).filter((v) => v.active !== false).length >= max) failT('seat_limit', 'Ihr Tarif „{plan}“ umfasst {max} Fahrzeuge.', { plan: planOf(t).name, max }, 409, { max });
    const v = vehicleInput({ id: newId(), tenantId: t.id, kind: p.kind === 'trailer' ? 'trailer' : 'truck', status: 'ok', driverId: null, features: [], active: true, createdAt: now() }, p, t);
    store.put('vehicles', v);
    audit(a, 'vehicle.create', v.id);
    changed('vehicles', v, { allDrivers: true });
    return vehicleView(v);
  }, { write: true });
  def('updateVehicle', STAFF, (a, { id, ...p }) => {
    const t = tenantOf(a);
    const { kind, ...rest } = p; // the kind (truck/trailer) of an existing vehicle never changes
    const v = vehicleInput(clone(scoped('vehicles', id, a)), rest, t);
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
      if (v.status === 'workshop') failT('vehicle_busy', '{plate} ist in der Werkstatt.', { plate: v.plate }, 409);
      if (v.driverId && v.driverId !== me.id) failT('vehicle_busy', '{plate} fährt gerade {name}.', { plate: v.plate, name: userName(v.driverId).split(' ')[0] }, 409);
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
      if (!d.vehicleId && me.vehicleId) { takeVehicle(d, 'vehicleId', me.vehicleId); ch = true; }
      if (!d.trailerId && me.trailerId) { takeVehicle(d, 'trailerId', me.trailerId); ch = true; }
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
      newDriverReset(d); // C20 – a vehicle re-sent unchanged by the assign form is still the previous driver's
      if (d.driverId) { d.openForAll = false; addEvent(d, a, 'assigned', { driverId: d.driverId }); }
    }
    if (!d.driverId && 'openForAll' in p) d.openForAll = bool(p.openForAll);
    addEvent(d, a, 'updated', { fields: Object.keys(p).slice(0, 12) });
    store.put('deliveries', d);
    audit(a, 'delivery.update', d.id);
    deliveryChanged(d, before);
    if (prevDriver && prevDriver !== d.driverId) changed('deliveries', d, { drivers: [prevDriver] });
    const params = { no: d.bookingNo, route: routeLabel(d), date: deDate(d.pickup.date) };
    // "changed" only when something the driver works with really differs (forms send every field)
    const val = (v) => JSON.stringify(v == null || v === '' || v === false ? null : v);
    const relevant = ['pickup', 'dropoff', 'goods', 'instructions', 'vehicleId', 'trailerId', 'urgent'].some((k) => val(before[k]) !== val(d[k]));
    if (d.driverId && d.driverId !== prevDriver) notify([d.driverId], 'assigned', params, { deliveryId: d.id, priority: d.urgent ? 'high' : 'normal' });
    else if (d.driverId && relevant) notify([d.driverId], 'changed', params, { deliveryId: d.id });
    if (prevDriver && prevDriver !== d.driverId) notify([prevDriver], 'cancelled', params, { deliveryId: d.id });
    if (!d.driverId && d.openForAll && (prevDriver || !before.openForAll) && settingsOf(t).driverTakesOpen) notify(driverIds(t.id), 'open', params, { deliveryId: d.id });
    return decorate(d, a);
  }, { write: true });

  def('cancelDelivery', STAFF, (a, { id, reason }) => {
    const before = scoped('deliveries', id, a);
    const d = clone(before);
    if (DONE.includes(d.status)) fail('invalid', 'Die Lieferung ist schon abgeschlossen.');
    const from = d.status;
    const why = text(reason, 300);
    d.status = 'cancelled';
    d.cancelledAt = addEvent(d, a, 'cancelled', { from, note: why }).at;
    store.put('deliveries', d);
    audit(a, 'delivery.cancel', d.id);
    deliveryChanged(d, before);
    // the cancel sheet promises that the reason goes to the driver
    if (d.driverId) notify([d.driverId], 'cancelled', { no: d.bookingNo, route: routeLabel(d), note: why ? ` – ${why.slice(0, 120)}` : '' }, { deliveryId: d.id, priority: 'high' });
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
    if (tab === 'live') ds = ds.filter((d) => isRunning(d, today) || (d.status === 'open' && (d.pickup?.date || today) <= today));
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
    // C4: history views (done, all, any search) newest first, so a limit drops the oldest; work lists by pickup time
    const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
    if (tab === 'done' || tab === 'all' || needle) ds.sort((x, y) => cmp(y.pickup?.date || '', x.pickup?.date || '') || (y.createdAt || 0) - (x.createdAt || 0));
    else {
      const sortKey = (d) => `${d.problem ? 0 : 1}${d.urgent ? 0 : 1}${d.pickup?.date || '9999'}${d.pickup?.from || '99:99'}`;
      ds.sort((x, y) => cmp(sortKey(x), sortKey(y)));
    }
    const n = Number(limit); // 0 = everything (exports), default 300, at most 1000 per page
    return (n === 0 ? ds : ds.slice(0, Math.min(1000, n > 0 ? n : 300))).map((d) => decorate(d, a));
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
    const active = ds.filter((d) => isRunning(d, today));
    const feed = [];
    for (const d of ds) for (const e of d.events || []) if (now() - e.at < 3 * 864e5) feed.push({ ...e, deliveryId: d.id, bookingNo: d.bookingNo, route: routeLabel(d), byName: userName(e.by) });
    feed.sort((x, y) => y.at - x.at);
    const drivers = store.find('users', { tenantId: t.id, role: 'driver' }).filter((u) => u.active);
    const vehicles = store.find('vehicles', { tenantId: t.id }).filter((v) => v.active !== false).map(vehicleView);
    return {
      counts: {
        open: ds.filter((d) => d.status === 'open').length,
        active: active.length,
        deliveredToday: ds.filter((d) => d.status === 'delivered' && berlinDate(doneAt(d)) === today).length,
        problems: ds.filter((d) => d.problem && !DONE.includes(d.status)).length,
        planned: ds.filter((d) => ['open', 'accepted'].includes(d.status) && (d.pickup?.date || '') > today).length,
      },
      active: active.sort((x, y) => (y.problem ? 1 : 0) - (x.problem ? 1 : 0) || (y.updatedAt - x.updatedAt)).map((d) => decorate(d, a)),
      openToday: ds.filter((d) => d.status === 'open' && (d.pickup?.date || today) <= today).map((d) => decorate(d, a)),
      feed: feed.slice(0, 25),
      drivers: { total: drivers.length, onTour: new Set(active.map((d) => d.driverId).filter(Boolean)).size, withVehicle: drivers.filter((u) => u.vehicleId).length },
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
    const ds = store.find('deliveries', { tenantId: t.id }).filter((d) => d.status === 'delivered' && berlinDate(doneAt(d)).slice(0, 7) === m);
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
    const evAt = (d, type) => (d.events || []).filter((e) => e.type === type && !e.undone && !e.void).map((e) => e.at).pop();
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
    const doneToday = all.filter((d) => d.driverId === a.id && d.status === 'delivered' && berlinDate(doneAt(d)) === today).length;
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
      .filter((d) => DONE.includes(d.status) && doneAt(d) >= since)
      .sort((x, y) => doneAt(y) - doneAt(x)).map((d) => decorate(d, a));
  });

  function applyVehicle(d, actor) {
    if (actor.role !== 'driver') return;
    const me = store.get('users', actor.id);
    if (!d.vehicleId && me.vehicleId) takeVehicle(d, 'vehicleId', me.vehicleId);
    if (!d.trailerId && me.trailerId) takeVehicle(d, 'trailerId', me.trailerId);
  }
  const cleanGeo = (g, s, actor) => (s.geoOnStatus && g && (!actor || actor.role !== 'driver' || store.get('users', actor.id)?.geoConsent) && Number.isFinite(+g.lat) && Number.isFinite(+g.lng)
    ? { lat: Math.round(+g.lat * 1e5) / 1e5, lng: Math.round(+g.lng * 1e5) / 1e5, acc: num(g.acc, 0, 1e5) } : undefined);

  def('acceptDelivery', ['driver'], (a, { id, geo, at }) => {
    const t = tenantOf(a);
    const s = settingsOf(t);
    const d = deliveryFor(a, id);
    if (d.status !== 'open') fail('wrong_step', d.driverId === a.id ? 'Die Buchung ist schon bestätigt.' : 'Diesen Auftrag hat schon jemand übernommen.', 409);
    if (d.driverId && d.driverId !== a.id) fail('conflict', 'Diesen Auftrag hat schon jemand übernommen.', 409);
    const ts = tapTime(d, at);
    const claimed = !d.driverId;
    d.driverId = a.id;
    d.openForAll = false;
    d.status = 'accepted';
    // C20: the tour runs with the vehicle the accepting driver has selected (an office choice stays when he
    // has none, or when the office assigns the vehicles itself)
    const me = store.get('users', a.id);
    if (s.driverPicksTruck && me.vehicleId) takeVehicle(d, 'vehicleId', me.vehicleId);
    if (s.driverPicksTruck && me.trailerId) takeVehicle(d, 'trailerId', me.trailerId);
    addEvent(d, a, 'accepted', { from: 'open', claimed, geo: cleanGeo(geo, s, a) }, ts);
    store.put('deliveries', d);
    deliveryChanged(d);
    if (claimed) changed('deliveries', d, { allDrivers: true });
    notify(staffIds(t.id), 'status', { driver: a.name, status: 'accepted', route: routeLabel(d), no: d.bookingNo }, { deliveryId: d.id });
    return decorate(d, a);
  }, { write: true });

  def('advanceDelivery', TENANT, (a, { id, step, geo, palletExchange, receiver, signatureFileId, at }) => {
    const t = tenantOf(a);
    const s = settingsOf(t);
    const d = deliveryFor(a, id);
    if (a.role === 'driver' && d.driverId !== a.id) fail('forbidden', 'Diese Lieferung ist nicht Ihnen zugeteilt.', 403);
    if (d.status === 'open') fail('wrong_step', 'Bitte zuerst die Buchung bestätigen.', 409);
    const expected = nextStep(d, s);
    // drv-15: arrival taps are optional (accepted → loaded and loaded → unloaded always work)
    if (!(STEP_OK[d.status] || []).includes(step)) fail('wrong_step', 'Dieser Schritt passt gerade nicht. Bitte die Ansicht aktualisieren.', 409, { expected });
    const ts = tapTime(d, at);
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
    const e = addEvent(d, a, step, extra, ts);
    if (step === 'delivered') d.deliveredAt = e.at;
    store.put('deliveries', d);
    deliveryChanged(d);
    const params = { driver: userName(d.driverId), status: step, route: routeLabel(d), no: d.bookingNo };
    if (a.role === 'driver') notify(staffIds(t.id), step !== 'delivered' ? 'status' : extra.pods ? 'delivered' : 'delivered_nopod', params, { deliveryId: d.id });
    else if (d.driverId) notify([d.driverId], 'changed', { no: d.bookingNo, route: routeLabel(d) }, { deliveryId: d.id });
    return decorate(d, a);
  }, { write: true });

  def('undoStep', ['driver'], (a, { id, at }) => {
    const t = tenantOf(a);
    const d = deliveryFor(a, id);
    const e = [...(d.events || [])].reverse().find((x) => !x.undone && STATUSES.includes(x.type));
    // the 2 minutes run from the step's tap to the undo tap (both device times when plausible, C2)
    const ts = tapTime(d, at);
    // also bounded by the server receive time, so a forged device time cannot reopen a step days later
    const rx = e ? (e.rx ?? e.at) : 0;
    if (!e || e.by !== a.id || !e.from || ts - e.at > UNDO_MS || now() - rx > UNDO_MS + 60e3) fail('undo_expired', 'Rückgängig ist nur 2 Minuten nach dem eigenen Schritt möglich.', 409);
    e.undone = true;
    d.status = e.from;
    if (e.type === 'accepted') { newDriverReset(d); if (e.claimed) { d.driverId = null; d.openForAll = true; } }
    if (e.type === 'unloaded') delete d.palletExchange;
    if (e.type === 'delivered') delete d.deliveredAt;
    addEvent(d, a, 'undo', { undid: e.type, to: e.from }, ts);
    store.put('deliveries', d);
    deliveryChanged(d);
    if (e.type === 'accepted' && e.claimed) changed('deliveries', d, { allDrivers: true });
    notify(staffIds(t.id), 'undo', { driver: a.name, no: d.bookingNo, status: d.status }, { deliveryId: d.id });
    return decorate(d, a);
  }, { write: true });

  def('returnDelivery', ['driver'], (a, { id, reason, at }) => {
    const t = tenantOf(a);
    const d = deliveryFor(a, id);
    if (d.driverId !== a.id) fail('forbidden', 'Diese Lieferung ist nicht Ihnen zugeteilt.', 403);
    if (progressOf(d.status) >= progressOf('loaded')) fail('invalid', 'Nach dem Beladen bitte die Disposition anrufen.');
    const why = text(reason, 300);
    if (!why) fail('invalid', 'Bitte kurz den Grund angeben.', 400, { fields: ['reason'] });
    const from = d.status;
    const ts = tapTime(d, at);
    newDriverReset(d);
    d.status = 'open'; d.driverId = null; d.openForAll = false;
    addEvent(d, a, 'returned', { from, note: why }, ts);
    store.put('deliveries', d);
    deliveryChanged(d);
    changed('deliveries', d, { drivers: [a.id] });
    notify(staffIds(t.id), 'returned', { driver: a.name, no: d.bookingNo, text: why }, { deliveryId: d.id, priority: 'high' });
    return { ok: true };
  }, { write: true });

  def('reportProblem', ['driver'], (a, { id, code, note, fileId, photo, geo, at }) => {
    const t = tenantOf(a);
    const d = deliveryFor(a, id);
    if (d.driverId !== a.id) fail('forbidden', 'Diese Lieferung ist nicht Ihnen zugeteilt.', 403);
    if (DONE.includes(d.status)) fail('invalid', 'Die Lieferung ist schon abgeschlossen.');
    const ts = tapTime(d, at);
    const c = PROBLEMS.includes(code) ? code : 'other';
    let fid = null;
    if (fileId) { const f = store.get('files', fileId); if (f && f.tenantId === t.id) fid = f.id; }
    // photo: true – the picture was uploaded to this delivery right before (also queued offline)
    if (!fid && photo) fid = [...(d.docs || [])].reverse().find((x) => x.kind === 'damage' && x.by === a.id && now() - x.at < 6 * 3600e3)?.fileId || null;
    d.problem = { code: c, note: text(note, 500), at: ts, by: a.id, fileId: fid };
    if (fid && !(d.docs || []).some((x) => x.fileId === fid)) d.docs = [...(d.docs || []), { fileId: fid, kind: 'damage', at: now(), by: a.id }];
    addEvent(d, a, 'problem', { code: c, note: d.problem.note, geo: cleanGeo(geo, settingsOf(t), a) }, ts);
    store.put('deliveries', d);
    deliveryChanged(d);
    notify(staffIds(t.id), 'problem', { problem: c, driver: a.name, no: d.bookingNo, route: routeLabel(d), note: d.problem.note ? ` – ${d.problem.note.slice(0, 80)}` : '' }, { deliveryId: d.id, priority: 'high' });
    return decorate(d, a);
  }, { write: true });

  def('addNote', TENANT, (a, { id, text: body, at }) => {
    const t = tenantOf(a);
    const d = deliveryFor(a, id);
    const msg = text(body, 1000);
    if (!msg) fail('invalid', 'Die Notiz ist leer.');
    if (a.role === 'driver' && d.driverId !== a.id) fail('forbidden', 'Diese Lieferung ist nicht Ihnen zugeteilt.', 403);
    const ts = tapTime(d, at);
    d.notes = [...(d.notes || []), { id: newId(), at: ts, by: a.id, role: a.role, text: msg }].sort((x, y) => x.at - y.at).slice(-100);
    addEvent(d, a, 'note', { note: msg.slice(0, 140) }, ts);
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
    // storage quota of the plan (C9); the 100 % notice is sent even though this call is rolled back
    const used = storageOf(t), bytes = Number(size);
    if (used + bytes > storageLimit(t)) { onFail(() => setStorage(t.id, used, true)); fail('quota', 'Der Speicher Ihres Tarifs ist voll. Bitte alte Lieferscheine exportieren und löschen oder den Tarif wechseln.', 413, { used, limit: storageLimit(t) }); }
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
    setStorage(t.id, used + bytes);
    return (({ data: _, ...rest }) => rest)(f);
  }, { write: true });

  // ---------- storage accounting ----------
  const storageLimit = (t) => planOf(t).storageGB * GiB;
  const sumFiles = (tenantId) => store.find('files', { tenantId }).reduce((s, f) => s + (Number(f.size) || 0), 0);
  const storageOf = (t) => (Number.isFinite(t.storageUsed) ? t.storageUsed : sumFiles(t.id));
  /** Store the bytes in use; tell the admins once at 80 % and at 100 % (again after falling below 75 %). */
  function setStorage(tenantId, bytes, full = false) {
    const t = getT(tenantId);
    if (!t) return;
    const x = { ...t, storageUsed: Math.max(0, Math.round(bytes)) };
    const pct = (x.storageUsed / storageLimit(x)) * 100, warned = x.storageWarn || 0;
    const level = (pct >= 100 || full) && warned < 100 ? 100 : pct >= 80 && warned < 80 ? 80 : 0;
    if (level) x.storageWarn = level;
    else if (pct < 75) x.storageWarn = null;
    if (x.storageUsed === t.storageUsed && x.storageWarn === t.storageWarn) return;
    store.put('tenants', x);
    if (level) notify(adminIds(tenantId), level === 100 ? 'storage100' : 'storage80', {}, { priority: level === 100 ? 'high' : 'normal' });
  }
  /** Remove a file record: storage goes down and the transport deletes the bytes (C10). */
  function dropFile(f) {
    if (!f) return;
    const t = getT(f.tenantId), used = t ? storageOf(t) : 0;
    store.del('files', f.id);
    if (t) setStorage(t.id, used - (Number(f.size) || 0));
    emit({ type: 'fileRemoved', tenantId: f.tenantId, fileId: f.id });
  }

  def('removeDoc', TENANT, (a, { id, fileId }) => {
    const d = deliveryFor(a, id);
    const doc = (d.docs || []).find((x) => x.fileId === fileId);
    if (!doc) fail('not_found', 'Dokument nicht gefunden.', 404);
    if (a.role === 'driver' && (doc.by !== a.id || DONE.includes(d.status))) fail('forbidden', 'Dieses Dokument können Sie nicht entfernen.', 403);
    d.docs = d.docs.filter((x) => x.fileId !== fileId);
    addEvent(d, a, 'doc_removed', { kind: doc.kind, fileId });
    store.put('deliveries', d);
    const f = store.get('files', fileId);
    if (f && f.tenantId === d.tenantId) dropFile(f);
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
        if (!DONE.includes(d0.status) || doneAt(d0) > limit) continue; // C3: from delivery/cancellation, not the last edit
        for (const fid of new Set([...(d0.docs || []).map((x) => x.fileId), d0.signatureFileId, d0.problem?.fileId].filter(Boolean))) { dropFile(store.get('files', fid)); removed.push(fid); }
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
    // uploads nothing refers to (no delivery, logo or signature) go after 24 h; then storage is recounted
    for (const t of store.find('tenants', {})) {
      const used = new Set([t.branding?.logoFileId, t.branding?.iconFileId]);
      for (const d of store.find('deliveries', { tenantId: t.id })) for (const fid of [...(d.docs || []).map((x) => x.fileId), d.signatureFileId, d.problem?.fileId]) used.add(fid);
      for (const f of store.find('files', { tenantId: t.id })) if (!used.has(f.id) && f.at < now() - 864e5) { dropFile(f); removed.push(f.id); }
      setStorage(t.id, sumFiles(t.id));
    }
    for (const o of store.find('ops', {})) if (!(now() - o.at <= OP_KEEP_MS)) store.del('ops', o.id);
    // the log is kept 3 years; IP addresses and typed login names in it only 90 days
    for (const e of store.find('audit', {})) {
      if (e.at < now() - 3 * 365.25 * 864e5) store.del('audit', e.id);
      else if (e.at < geoLimit && (e.ip || e.extra?.who)) { const { ip, ...rest } = e; if (rest.extra?.who) rest.extra = (({ who, ...x }) => x)(rest.extra); store.put('audit', rest); }
    }
    return removed;
  }

  // ---------- integrations (Premium REST API) ----------
  // Keys are stored as digest(key) only (C12). The API works while the licence is writable (C6).
  function apiActor(key) {
    const k = String(key || '');
    if (!k.startsWith('lk_') || k.length > 200) return null;
    const h = digest(k);
    let t = store.find('tenants', {}).find((x) => x.apiKeyHash && x.apiKeyHash === h);
    if (!t) {
      // a key from before hashing: accepted, and from now on only its hash is kept
      t = store.find('tenants', {}).find((x) => x.apiKey && x.apiKey === k);
      if (t) { t = { ...t, apiKeyHash: h, apiKeyHint: k.slice(-4) }; delete t.apiKey; store.put('tenants', t); }
    }
    if (!t || !planOf(t).api || !writable(t, now())) return null;
    return { id: 'api:' + t.id, tenantId: t.id, role: 'dispatcher', name: 'API', active: true };
  }

  // ---------- dispatcher ----------
  // With a start password only these calls work – the app shows the "own password" form first.
  const BEFORE_OWN_PASSWORD = new Set(['me', 'changePassword', 'updateProfile', 'listNotifications', 'markNotificationsRead']);
  /** meta: transport context, e.g. { ip } – written to the audit log. */
  function call(actor, name, args = {}, meta = null) {
    const m = Object.prototype.hasOwnProperty.call(M, name) ? M[name] : null; // never 'constructor', '__proto__' …
    if (!m) fail('not_found', `Unbekannte Aktion: ${name}`, 404);
    if (!actor) fail('unauthorized', 'Bitte anmelden.', 401);
    if (!m.roles.includes(actor.role)) fail('forbidden', 'Dafür fehlt die Berechtigung.', 403);
    const { _op, ...input } = args && typeof args === 'object' ? args : {};
    // Idempotency (C1): a call repeated with the same _op (lost answer, offline replay, double tap)
    // returns the stored first result. Not for calls that return a secret (PIN, password, key).
    const opId = typeof _op === 'string' && _op && _op.length <= 64 && !m.secret ? `${actor.id}:${_op}` : null;
    const done = opId ? store.get('ops', opId) : null;
    if (done && done.method === name && now() - done.at <= OP_KEEP_MS) return clone(done.result);
    if (actor.mustChangePassword && !BEFORE_OWN_PASSWORD.has(name)) fail('password_change', 'Bitte zuerst ein eigenes Passwort vergeben.', 403);
    if ((typeof m.write === 'function' ? m.write(input) : m.write) && actor.role !== 'platform') {
      const t = getT(actor.tenantId);
      if (!writable(t, now())) fail('license_inactive', licenseState(t, now()) === 'cancelled' ? 'Der Vertrag ist gekündigt. Daten können bis zur Löschung angesehen und exportiert, aber nicht geändert werden.' : 'Die Lizenz ist nicht aktiv. Daten können angesehen und exportiert, aber nicht geändert werden.', 403, { state: licenseState(t, now()) });
    }
    let out;
    const queue = [], hooks = [];
    pending = queue;
    failHooks = hooks;
    ctx = meta;
    try {
      store.tx(() => {
        out = m.fn(actor, input);
        if (opId) store.put('ops', { id: opId, userId: actor.id, tenantId: actor.tenantId || null, method: name, result: out === undefined ? null : clone(out), at: now() });
      });
    } catch (e) {
      // the write was rolled back: drop its events, then run what must happen anyway (e.g. "storage full")
      queue.length = 0;
      failHooks = null;
      if (hooks.length) {
        try { store.tx(() => hooks.forEach((fn) => fn())); } catch { queue.length = 0; }
        pending = null;
        queue.forEach(deliver);
      }
      throw e;
    } finally {
      pending = null;
      failHooks = null;
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
    if (emailTaken(e)) fail('conflict', 'Diese E-Mail hat schon einen Zugang.', 409);
    if (String(password || '').length < 10) fail('invalid', 'Das Passwort braucht mindestens 10 Zeichen.');
    const u = { id: newId(), tenantId: null, role: 'platform', name: str(name, 80) || 'Lizenzgeber', email: e, lang: 'de', active: true, passwordHash: hash.make(String(password)), createdAt: now() };
    store.put('users', u);
    return publicUser(u);
  }

  /**
   * Licensor password recovery from the server's command line (never through call()):
   * new password, two-factor login off, lock cleared (C17).
   */
  function resetPlatformPassword({ email, password } = {}) {
    const u = store.find('users', { email: normEmail(email) }).find((x) => x.role === 'platform');
    if (!u) fail('not_found', 'Kein Lizenzgeber-Zugang mit dieser E-Mail.', 404);
    if (String(password || '').length < 10) fail('invalid', 'Das Passwort braucht mindestens 10 Zeichen.');
    const x = { ...clone(u), passwordHash: hash.make(String(password)), mustChangePassword: false, failedLogins: 0, lockedUntil: null, active: true, twoFactorSecret: null, twoFactorPending: null, twoFactorStep: null };
    store.put('users', x);
    audit(x, 'password.reset_cli', x.id, null, null);
    return publicUser(x);
  }

  return { call, auth, setupPlatform, resetPlatformPassword, canReadFile, purgeExpired, apiActor, methods: Object.keys(M), PLANS };
}
