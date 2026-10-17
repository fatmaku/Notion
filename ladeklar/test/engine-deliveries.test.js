// Fix round 2, stream engine-deliveries: device time (C2), deliveredAt (C3), list order (C4), driver
// change (C20), optional arrival taps, validation, notification texts and the demo seed's timing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, EngineError, berlinDate } from '../core/engine.js';
import { createMemStore } from '../core/memstore.js';
import { NOTIFY_TEXT, fill, LANGS } from '../core/texts.js';
import { seedDemo } from '../core/seed.js';

const hash = { make: (s) => 'h$' + s, verify: (s, h) => h === 'h$' + s };
const MIN = 60e3, H = 3600e3;

function setup({ start = Date.parse('2026-10-16T06:00:00Z'), tenant = {} } = {}) {
  let t = start, seq = 0;
  const events = [];
  const store = createMemStore();
  const engine = createEngine({ store, now: () => t, newId: () => 'id' + (++seq).toString(36).padStart(5, '0'), hash, onEvent: (e) => events.push(e) });
  const platform = engine.setupPlatform({ email: 'chef@ladeklar.de', password: 'sehrgeheim123', name: 'Plattform' });
  engine.call(platform, 'createTenant', { name: 'Kaya', code: 'KAYA', plan: 'flotte', adminEmail: 'a@kaya.de', adminPassword: 'adminpasswort1', contact: 'Ayşe', ...tenant });
  const admin = engine.auth.login({ email: 'a@kaya.de', password: 'adminpasswort1' });
  const mk = (name, phone, lang = 'de') => engine.call(admin, 'createUser', { role: 'driver', name, phone, lang }).user;
  const settings = (s) => engine.call(admin, 'updateCompany', { settings: s }).settings;
  const D = (extra = {}) => engine.call(admin, 'createDelivery', { pickup: { city: 'Stuttgart', date: '2026-10-16' }, dropoff: { city: 'Hamburg' }, ...extra });
  const go = (actor, id, step, extra = {}) => engine.call(actor, 'advanceDelivery', { id, step, ...extra });
  const notes = (u, type) => engine.call(u, 'listNotifications', {}).filter((n) => !type || n.type === type);
  return { engine, store, events, admin, platform, mk, settings, D, go, notes, tick: (ms) => { t += ms; }, setT: (x) => { t = x; }, now: () => t };
}
const err = (fn) => { try { fn(); } catch (e) { assert.ok(e instanceof EngineError, 'expected EngineError, got ' + e); return e; } assert.fail('expected an error'); };
const ev = (d, type) => d.events.filter((e) => e.type === type).pop();

test('C2: steps tapped in a dead zone count at the tap time (waiting time, timeline, rx)', () => {
  const { engine, admin, mk, settings, D, go, tick, now } = setup();
  settings({ trackArrival: true, requirePod: false });
  const A = mk('Anna Fahrer', '0151 1000001');
  const d = D({ driverId: A.id });
  engine.call(A, 'acceptDelivery', { id: d.id });
  tick(10 * MIN); const tArr = now();
  tick(42 * MIN); const tLoad = now();
  tick(5 * MIN); engine.call(admin, 'addNote', { id: d.id, text: 'Rampe 4' }); // office note while the phone is offline
  tick(25 * MIN); // back online: the queue replays with the tap times
  go(A, d.id, 'arrived_pickup', { at: tArr });
  const l = go(A, d.id, 'loaded', { at: tLoad });
  assert.equal(l.waitingMinutes, 42);
  assert.equal(ev(l, 'arrived_pickup').at, tArr);
  assert.equal(ev(l, 'arrived_pickup').rx, now(), 'server receive time is kept when it differs');
  assert.deepEqual(l.events.map((e) => e.type), ['created', 'assigned', 'accepted', 'arrived_pickup', 'loaded', 'note'], 'late taps go to their place in the timeline');
  // implausible tap times fall back to the server time: before the last step, > 2 min ahead, > 72 h old
  const d2 = D({ driverId: A.id });
  engine.call(A, 'acceptDelivery', { id: d2.id });
  tick(MIN);
  const x = go(A, d2.id, 'arrived_pickup', { at: now() - 5 * MIN });
  assert.equal(ev(x, 'arrived_pickup').at, now());
  assert.equal(ev(x, 'arrived_pickup').rx, undefined);
  tick(MIN);
  assert.equal(ev(go(A, d2.id, 'loaded', { at: now() + 3 * MIN }), 'loaded').at, now());
  tick(MIN);
  assert.equal(ev(go(A, d2.id, 'unloaded', { at: 'gestern' }), 'unloaded').at, now());
  const d3 = D({ driverId: A.id });
  tick(73 * H);
  assert.equal(ev(engine.call(A, 'acceptDelivery', { id: d3.id, at: now() - 72.5 * H }), 'accepted').at, now());
  // accept, problem, note and return take the tap time as well
  const d4 = D({ driverId: A.id });
  tick(30 * MIN);
  const tap = now() - 20 * MIN;
  assert.equal(ev(engine.call(A, 'acceptDelivery', { id: d4.id, at: tap }), 'accepted').at, tap);
  const p = engine.call(A, 'reportProblem', { id: d4.id, code: 'delay', at: tap + MIN });
  assert.equal(p.problem.at, tap + MIN);
  const n = engine.call(A, 'addNote', { id: d4.id, text: 'Stau', at: tap + 2 * MIN });
  assert.equal(n.notes.at(-1).at, tap + 2 * MIN);
  engine.call(A, 'returnDelivery', { id: d4.id, reason: 'krank', at: tap + 3 * MIN });
  assert.equal(ev(engine.call(admin, 'getDelivery', { id: d4.id }), 'returned').at, tap + 3 * MIN);
});

test('C2: the 2-minute undo window runs from the step tap to the undo tap', () => {
  const { engine, mk, D, go, tick, now } = setup();
  const A = mk('Anna Fahrer', '0151 1000001');
  const d = D({ driverId: A.id });
  engine.call(A, 'acceptDelivery', { id: d.id });
  tick(MIN); const tLoad = now();
  tick(10 * MIN); // both taps were queued offline and arrive 10 minutes later
  go(A, d.id, 'loaded', { at: tLoad });
  const u = engine.call(A, 'undoStep', { id: d.id, at: tLoad + 90e3 });
  assert.equal(u.status, 'accepted');
  go(A, d.id, 'loaded', { at: tLoad + 100e3 });
  assert.equal(err(() => engine.call(A, 'undoStep', { id: d.id, at: tLoad + 100e3 + 3 * MIN })).code, 'undo_expired');
  assert.equal(err(() => engine.call(A, 'undoStep', { id: d.id })).code, 'undo_expired', 'without a tap time the server time counts');
});

test('C3: deliveredAt – a later note or edit does not move a delivery to another day or month', () => {
  const { engine, admin, mk, settings, D, go, setT, tick } = setup({ start: Date.parse('2026-10-31T16:00:00Z'), tenant: { trialDays: 0 } });
  settings({ requirePod: false });
  const A = mk('Anna Fahrer', '0151 1000001');
  const d = D({ driverId: A.id, pickup: { city: 'Stuttgart', date: '2026-10-31' } });
  engine.call(A, 'acceptDelivery', { id: d.id });
  for (const s of ['loaded', 'unloaded']) go(A, d.id, s);
  const done = go(A, d.id, 'delivered');
  assert.equal(done.deliveredAt, ev(done, 'delivered').at);
  assert.equal(engine.call(admin, 'reports', { month: '2026-10' }).delivered, 1);
  assert.equal(engine.call(admin, 'dashboard', {}).counts.deliveredToday, 1);
  assert.equal(engine.call(A, 'driverHome', {}).doneToday, 1);
  setT(Date.parse('2026-11-02T09:00:00Z'));
  engine.call(A, 'addNote', { id: d.id, text: 'Lieferschein nachgereicht' });
  engine.call(admin, 'updateDelivery', { id: d.id, reference: 'PO-1' });
  assert.equal(engine.call(admin, 'reports', { month: '2026-10' }).delivered, 1);
  assert.equal(engine.call(admin, 'reports', { month: '2026-11' }).delivered, 0);
  assert.equal(engine.call(admin, 'dashboard', {}).counts.deliveredToday, 0);
  assert.equal(engine.call(A, 'driverHome', {}).doneToday, 0);
  // history sorted by the delivery time, not by the last change
  const d2 = D({ driverId: A.id, pickup: { city: 'Ulm', date: '2026-11-02' } });
  engine.call(A, 'acceptDelivery', { id: d2.id });
  for (const s of ['loaded', 'unloaded', 'delivered']) go(A, d2.id, s);
  tick(H); engine.call(admin, 'updateDelivery', { id: d.id, customer: 'Bosch' });
  assert.deepEqual(engine.call(A, 'myHistory', {}).map((x) => x.id), [d2.id, d.id]);
  // undo clears it, a cancellation gets cancelledAt
  const d3 = D({ driverId: A.id, pickup: { city: 'Ulm', date: '2026-11-02' } });
  engine.call(A, 'acceptDelivery', { id: d3.id });
  for (const s of ['loaded', 'unloaded', 'delivered']) go(A, d3.id, s);
  assert.equal(engine.call(A, 'undoStep', { id: d3.id }).deliveredAt, undefined);
  const c = engine.call(admin, 'cancelDelivery', { id: d3.id, reason: 'Kunde storniert' });
  assert.equal(c.cancelledAt, ev(c, 'cancelled').at);
});

test('C3: the retention purge counts from the delivery, not from the last edit', () => {
  const { engine, admin, mk, settings, D, go, setT, store } = setup({ start: Date.parse('2025-08-01T08:00:00Z'), tenant: { trialDays: 0 } });
  settings({ requirePod: false });
  const A = mk('Anna Fahrer', '0151 1000001');
  const old = D({ driverId: A.id, pickup: { city: 'Stuttgart', date: '2025-08-01' } });
  engine.call(A, 'acceptDelivery', { id: old.id });
  for (const s of ['loaded', 'unloaded', 'delivered']) go(A, old.id, s);
  setT(Date.parse('2026-05-01T08:00:00Z'));
  const recent = D({ driverId: A.id, pickup: { city: 'Ulm', date: '2026-05-01' } });
  engine.call(A, 'acceptDelivery', { id: recent.id });
  for (const s of ['loaded', 'unloaded', 'delivered']) go(A, recent.id, s);
  setT(Date.parse('2026-10-15T08:00:00Z'));
  engine.call(admin, 'updateDelivery', { id: old.id, reference: 'nachgetragen' });
  settings({ retentionYears: 1 });
  engine.purgeExpired();
  assert.ok(!store.get('deliveries', old.id), 'delivered 14 months ago → gone despite the edit');
  assert.ok(store.get('deliveries', recent.id));
});

test('C4: history lists show the newest first; limit 0 returns everything', () => {
  const { engine, admin, D } = setup();
  for (let i = 0; i < 305; i++) D({ pickup: { city: 'Stuttgart', date: new Date(Date.UTC(2026, 5, 1) + Math.floor(i / 3) * 864e5).toISOString().slice(0, 10) }, dropoff: { city: i % 2 ? 'Hamburg' : 'Bremen' } });
  const latest = D({ pickup: { city: 'Ulm', date: '2026-10-16', from: '09:00' }, dropoff: { city: 'Hamburg' } });
  const all = engine.call(admin, 'listDeliveries', { tab: 'all' });
  assert.equal(all.length, 300, 'default limit 300');
  assert.equal(all[0].id, latest.id);
  assert.ok(all.every((x, i) => !i || all[i - 1].pickup.date >= x.pickup.date));
  assert.equal(engine.call(admin, 'listDeliveries', { tab: 'all', limit: 0 }).length, 306);
  assert.equal(engine.call(admin, 'listDeliveries', { tab: 'done', limit: 'x' }).length, 0);
  const hits = engine.call(admin, 'listDeliveries', { tab: 'live', q: 'hamburg' });
  assert.equal(hits[0].id, latest.id, 'any search: newest first');
  // work lists keep the pickup order: same day, earlier pickup first
  D({ pickup: { city: 'Ulm', date: '2026-10-16', from: '07:00' }, dropoff: { city: 'Köln' } });
  assert.deepEqual(engine.call(admin, 'listDeliveries', { tab: 'live', from: '2026-10-16' }).map((x) => x.pickup.from), ['07:00', '09:00']);
});

test('C20: a new driver confirms the tour himself and drives his own truck', () => {
  const { engine, admin, mk, settings, D, go, tick } = setup();
  settings({ trackArrival: true, requirePod: false });
  const A = mk('Anna Fahrer', '0151 1000001'), B = mk('Bert Fahrer', '0151 1000002'), C = mk('Cem Fahrer', '0151 1000003');
  const vA = engine.call(admin, 'createVehicle', { kind: 'truck', plate: 'S-KL 100' });
  const tA = engine.call(admin, 'createVehicle', { kind: 'trailer', plate: 'S-KL 900' });
  const vB = engine.call(admin, 'createVehicle', { kind: 'truck', plate: 'S-KL 200' });
  const vC = engine.call(admin, 'createVehicle', { kind: 'truck', plate: 'S-KL 300' });
  engine.call(A, 'selectVehicle', { vehicleId: vA.id, trailerId: tA.id });
  engine.call(B, 'selectVehicle', { vehicleId: vB.id });
  // 1) A claims an open job and undoes it, B takes it
  const d1 = D({ openForAll: true });
  assert.equal(engine.call(A, 'acceptDelivery', { id: d1.id }).vehiclePlate, 'S-KL 100');
  const u = engine.call(A, 'undoStep', { id: d1.id });
  assert.deepEqual([u.status, u.driverId, u.vehicleId, u.trailerId], ['open', null, null, null]);
  const b1 = engine.call(B, 'acceptDelivery', { id: d1.id });
  assert.deepEqual([b1.vehiclePlate, b1.trailerPlate], ['S-KL 200', '']);
  // 2) A accepts and gives it back, the office assigns B
  const d2 = D({ driverId: A.id });
  engine.call(A, 'acceptDelivery', { id: d2.id });
  engine.call(A, 'returnDelivery', { id: d2.id, reason: 'krank' });
  assert.equal(engine.call(admin, 'getDelivery', { id: d2.id }).vehicleId, null);
  engine.call(admin, 'updateDelivery', { id: d2.id, driverId: B.id });
  engine.call(B, 'acceptDelivery', { id: d2.id });
  assert.deepEqual([go(B, d2.id, 'loaded').vehiclePlate, engine.call(admin, 'getDelivery', { id: d2.id }).trailerPlate], ['S-KL 200', '']);
  // 3) reassigned at "An Ladestelle" with the assign form re-sending A's vehicles
  const d3 = D({ driverId: A.id });
  engine.call(A, 'acceptDelivery', { id: d3.id });
  go(A, d3.id, 'arrived_pickup');
  tick(3 * H);
  const r = engine.call(admin, 'updateDelivery', { id: d3.id, driverId: B.id, vehicleId: vA.id, trailerId: tA.id });
  assert.deepEqual([r.status, r.vehicleId, r.trailerId, r.next], ['open', null, null, 'accepted']);
  assert.equal(ev(r, 'arrived_pickup').void, true);
  engine.call(B, 'acceptDelivery', { id: d3.id });
  go(B, d3.id, 'arrived_pickup');
  tick(20 * MIN);
  assert.equal(go(B, d3.id, 'loaded').waitingMinutes, 20, 'A\'s arrival does not count');
  // 4) a vehicle the office picks together with the new driver stays (C has none of his own)
  const d4 = D({ driverId: A.id });
  engine.call(A, 'acceptDelivery', { id: d4.id });
  const r4 = engine.call(admin, 'updateDelivery', { id: d4.id, driverId: C.id, vehicleId: vC.id, trailerId: tA.id });
  assert.deepEqual([r4.status, r4.vehiclePlate, r4.trailerPlate], ['open', 'S-KL 300', '']);
  assert.equal(engine.call(C, 'acceptDelivery', { id: d4.id }).vehiclePlate, 'S-KL 300');
  // 5) unassigned at "An Ladestelle": back to open, nobody counted on tour
  const d5 = D({ driverId: A.id });
  engine.call(A, 'acceptDelivery', { id: d5.id });
  go(A, d5.id, 'arrived_pickup');
  const r5 = engine.call(admin, 'updateDelivery', { id: d5.id, driverId: null });
  assert.equal(r5.status, 'open');
  assert.ok(!engine.call(admin, 'dashboard', {}).active.some((x) => x.id === d5.id));
  // 6) after loading the driver stays
  assert.equal(err(() => engine.call(admin, 'updateDelivery', { id: d3.id, driverId: A.id })).code, 'invalid');
  // 7) deleting a driver hands his confirmed tours back without his truck
  const d7 = D({ driverId: A.id });
  engine.call(A, 'acceptDelivery', { id: d7.id });
  engine.call(admin, 'deleteUser', { id: A.id });
  const g7 = engine.call(admin, 'getDelivery', { id: d7.id });
  assert.deepEqual([g7.status, g7.driverId, g7.vehicleId, g7.trailerId], ['open', null, null, null]);
  // 8) the office assigns the trucks itself: its truck stays with the tour when the driver changes
  settings({ driverPicksTruck: false });
  const d8 = D({ driverId: C.id, vehicleId: vC.id });
  engine.call(C, 'acceptDelivery', { id: d8.id });
  const r8 = engine.call(admin, 'updateDelivery', { id: d8.id, driverId: B.id, vehicleId: vC.id, trailerId: null }); // assign form
  assert.deepEqual([r8.status, r8.vehiclePlate], ['open', 'S-KL 300']);
  assert.equal(engine.call(B, 'acceptDelivery', { id: d8.id }).vehiclePlate, 'S-KL 300', 'B\'s old pool selection does not count');
});

test('drv-15: arrival taps are optional when the office changes "Ankunft erfassen" mid-tour', () => {
  const { engine, mk, settings, D, go } = setup();
  settings({ requirePod: false, trackArrival: false });
  const A = mk('Anna Fahrer', '0151 1000001');
  const d = D({ driverId: A.id });
  engine.call(A, 'acceptDelivery', { id: d.id });
  settings({ trackArrival: true }); // the phone still works with the old setting
  for (const s of ['loaded', 'unloaded', 'delivered']) go(A, d.id, s);
  const d2 = D({ driverId: A.id });
  engine.call(A, 'acceptDelivery', { id: d2.id });
  settings({ trackArrival: false });
  for (const s of ['arrived_pickup', 'loaded', 'arrived_dropoff', 'unloaded']) go(A, d2.id, s);
  const d3 = D({ driverId: A.id });
  engine.call(A, 'acceptDelivery', { id: d3.id });
  assert.equal(err(() => go(A, d3.id, 'unloaded')).code, 'wrong_step', 'skipping loading is still refused');
  assert.equal(err(() => go(A, d3.id, 'delivered')).code, 'wrong_step');
});

test('dash-1: a tour confirmed for a later day is planned, not running', () => {
  const { engine, admin, mk, D } = setup();
  const A = mk('Anna Fahrer', '0151 1000001');
  const d = D({ driverId: A.id, pickup: { city: 'Stuttgart', date: '2026-10-23' } });
  engine.call(A, 'acceptDelivery', { id: d.id });
  let dash = engine.call(admin, 'dashboard', {});
  assert.deepEqual([dash.counts.active, dash.counts.planned, dash.drivers.onTour, dash.active.length], [0, 1, 0, 0]);
  assert.equal(engine.call(admin, 'listDeliveries', { tab: 'live' }).length, 0);
  assert.equal(engine.call(admin, 'listDeliveries', { tab: 'planned' }).length, 1);
  const today = D({ driverId: A.id });
  engine.call(A, 'acceptDelivery', { id: today.id });
  dash = engine.call(admin, 'dashboard', {});
  assert.deepEqual([dash.counts.active, dash.drivers.onTour], [1, 1]);
});

test('veh-1: editing a trailer keeps it a trailer; broken trailers are repaired on start', () => {
  const { engine, admin, store, now } = setup();
  const tr = engine.call(admin, 'createVehicle', { kind: 'trailer', plate: 'S-KL 9001', type: 'plane' });
  assert.equal(engine.call(admin, 'updateVehicle', { id: tr.id, status: 'workshop' }).kind, 'trailer');
  const f = engine.call(admin, 'updateVehicle', { id: tr.id, kind: 'truck', plate: 'S-KL 9001', type: 'kuehl', status: 'ok' });
  assert.deepEqual([f.kind, f.type], ['trailer', 'kuehl']);
  assert.equal(engine.call(admin, 'listVehicles', { kind: 'trailer' }).length, 1);
  store.put('vehicles', { ...store.get('vehicles', tr.id), kind: 'truck' }); // data written by the old bug
  const truck = engine.call(admin, 'createVehicle', { kind: 'truck', plate: 'S-KL 1', type: 'kipper' });
  createEngine({ store, now, newId: () => 'x' + Math.random(), hash });
  assert.equal(store.get('vehicles', tr.id).kind, 'trailer');
  assert.equal(store.get('vehicles', truck.id).kind, 'truck', '"kipper" exists for both kinds and is left alone');
});

test('val-1: impossible times and out-of-range numbers are refused with a clear message', () => {
  const { engine, admin, D } = setup();
  const P = (o) => ({ city: 'Stuttgart', date: '2026-10-20', ...o }), Q = (o) => ({ city: 'Hamburg', date: '2026-10-20', ...o });
  let e = err(() => D({ pickup: P({ from: '14:00', to: '16:00' }), dropoff: Q({ from: '08:00', to: '10:00' }) }));
  assert.equal(e.message, 'Die Entladezeit liegt vor der Ladezeit.');
  assert.ok(e.details.fields.includes('dropoff.from'));
  e = err(() => D({ pickup: P({ from: '16:00', to: '08:00' }), dropoff: Q() }));
  assert.equal(e.message, 'Ladestelle: Die Uhrzeit „bis“ liegt vor „von“.');
  assert.equal(err(() => D({ pickup: P(), dropoff: Q({ from: '18:00', to: '12:00' }) })).message, 'Entladestelle: Die Uhrzeit „bis“ liegt vor „von“.');
  for (const w of [72000, -500, 'viel']) assert.equal(err(() => D({ goods: { weightKg: w } })).message, 'Gewicht bitte zwischen 0 und 60.000 kg angeben.');
  assert.deepEqual(err(() => D({ goods: { pallets: 67 } })).details.fields, ['goods.pallets']);
  // possible combinations still work
  D({ pickup: P({ from: '14:00', to: '16:00' }), dropoff: Q({ from: '15:00', to: '17:00' }), goods: { pallets: 66, weightKg: 60000 } });
  D({ pickup: P({ from: '14:00' }), dropoff: Q({ date: '2026-10-21', from: '08:00' }) });
  D({ pickup: P({ from: '14:00' }), dropoff: { city: 'Hamburg', from: '08:00' } });
  const d = D({ pickup: P({ from: '14:00' }), dropoff: Q() });
  assert.equal(err(() => engine.call(admin, 'updateDelivery', { id: d.id, dropoff: { to: '09:00' } })).code, 'invalid');
  assert.equal(err(() => engine.call(admin, 'createVehicle', { kind: 'truck', plate: 'S-KL 1', payloadKg: 80000 })).message, 'Nutzlast bitte zwischen 0 und 60.000 kg angeben.');
  assert.equal(err(() => engine.call(admin, 'createVehicle', { kind: 'trailer', plate: 'S-KL 2', pallets: 70 })).message, 'Palettenstellplätze bitte zwischen 0 und 66 angeben.');
});

test('retention: an empty or invalid value keeps the current one (1–10 years)', () => {
  const { settings } = setup();
  assert.equal(settings({ retentionYears: 5 }).retentionYears, 5);
  for (const v of ['', 0, null, 11, -1, 2.5, 'abc', true]) assert.equal(settings({ retentionYears: v, bookingPrefix: 'KYL' }).retentionYears, 5, `value ${JSON.stringify(v)}`);
  assert.equal(settings({ retentionYears: '7' }).retentionYears, 7);
  assert.equal(settings({ retentionYears: 1 }).retentionYears, 1);
  assert.equal(settings({ retentionYears: 10 }).retentionYears, 10);
});

test('notification texts: no double full stops; the cancel reason reaches the driver; no delivery note claimed without one', () => {
  const p = { no: 'KAY-2610-0001', route: 'Stuttgart → Hamburg', date: '18.10.', driver: 'Sven', status: 'Beladen', problem: 'Panne', note: ' – Grund.', text: 'Text.', from: 'Ayşe' };
  for (const lang of LANGS) for (const [type, tpl] of Object.entries(NOTIFY_TEXT[lang])) for (const x of tpl) assert.ok(!/\.\./.test(fill(x, p)), `${lang}.${type}: ${fill(x, p)}`);
  const { engine, admin, mk, settings, D, go, notes } = setup();
  settings({ requirePod: false });
  const A = mk('Anna Fahrer', '0151 1000001'), B = mk('Bartek Kowalski', '0151 1000002', 'pl');
  const d = D({ driverId: A.id, pickup: { city: 'Stuttgart', date: '2026-10-18' } });
  assert.equal(notes(A, 'assigned')[0].body, 'Stuttgart → Hamburg · Laden 18.10. – bitte bestätigen.');
  engine.call(admin, 'cancelDelivery', { id: d.id, reason: 'Kunde hat verschoben' });
  assert.equal(notes(A, 'cancelled')[0].body, `${d.bookingNo} · Stuttgart → Hamburg – Kunde hat verschoben`);
  const d2 = D({ driverId: B.id });
  engine.call(admin, 'cancelDelivery', { id: d2.id });
  assert.equal(notes(B, 'cancelled')[0].title, 'Zlecenie anulowane');
  assert.equal(notes(B, 'cancelled')[0].body, `${d2.bookingNo} · Stuttgart → Hamburg`);
  const d3 = D({ driverId: A.id });
  engine.call(A, 'acceptDelivery', { id: d3.id });
  for (const s of ['loaded', 'unloaded', 'delivered']) go(A, d3.id, s);
  const n = notes(admin).find((x) => x.deliveryId === d3.id && x.title.startsWith('Zugestellt'));
  assert.equal(n.body, 'Stuttgart → Hamburg · ohne Lieferschein (Anna Fahrer)');
  const d4 = D({ driverId: A.id });
  engine.call(A, 'acceptDelivery', { id: d4.id });
  for (const s of ['loaded', 'unloaded']) go(A, d4.id, s);
  engine.call(A, 'createFile', { kind: 'pod', mime: 'image/jpeg', size: 1000, deliveryId: d4.id });
  go(A, d4.id, 'delivered');
  assert.equal(notes(admin, 'delivered').find((x) => x.deliveryId === d4.id).body, 'Stuttgart → Hamburg · Lieferschein liegt vor (Anna Fahrer)');
});

test('ntf-1: "Auftrag geändert" only when something the driver works with really changed', () => {
  const { engine, admin, mk, D, notes } = setup();
  const A = mk('Anna Fahrer', '0151 1000001');
  const d = D({ driverId: A.id, pickup: { city: 'Stuttgart', date: '2026-10-16', from: '07:00' }, goods: { text: 'Teile', pallets: 18 } });
  engine.call(A, 'acceptDelivery', { id: d.id });
  const g = engine.call(admin, 'getDelivery', { id: d.id });
  // the edit form sends every field; only bookkeeping changed
  engine.call(admin, 'updateDelivery', { id: d.id, customer: 'Bosch', reference: 'R-1', internalNote: 'intern', pickup: g.pickup, dropoff: g.dropoff, goods: g.goods, instructions: '', urgent: false });
  engine.call(admin, 'updateDelivery', { id: d.id, driverId: A.id, vehicleId: null, trailerId: null }); // unchanged assignment
  assert.equal(notes(A, 'changed').length, 0);
  engine.call(admin, 'updateDelivery', { id: d.id, pickup: { from: '08:00' } });
  assert.equal(notes(A, 'changed').length, 1);
  engine.call(admin, 'updateDelivery', { id: d.id, urgent: true });
  assert.equal(notes(A, 'changed').length, 2);
});

test('live-1: an open-for-all job that is assigned, withdrawn or cancelled reaches every driver\'s app', () => {
  const { engine, admin, mk, D, events } = setup();
  const B = mk('Bert Fahrer', '0151 1000002');
  const toAll = (id) => events.some((e) => e.type === 'change' && e.col === 'deliveries' && e.id === id && e.allDrivers);
  const d1 = D({ openForAll: true });
  events.length = 0; engine.call(admin, 'updateDelivery', { id: d1.id, driverId: B.id });
  assert.ok(toAll(d1.id));
  const d2 = D({ openForAll: true });
  events.length = 0; engine.call(admin, 'cancelDelivery', { id: d2.id });
  assert.ok(toAll(d2.id));
  const d3 = D({ openForAll: true });
  events.length = 0; engine.call(admin, 'updateDelivery', { id: d3.id, openForAll: false });
  assert.ok(toAll(d3.id));
  const d4 = D({ driverId: B.id });
  events.length = 0; engine.call(admin, 'updateDelivery', { id: d4.id, customer: 'X' });
  assert.ok(!toAll(d4.id), 'assigned jobs only go to their driver');
});

test('seed: the demo world is consistent at any time of day and keeps its booking numbers', () => {
  for (const iso of ['2026-10-17T00:30:00+02:00', '2026-10-17T06:00:00+02:00', '2026-10-17T14:00:00+02:00', '2026-10-17T23:30:00+02:00']) {
    const realNow = Date.parse(iso);
    let fixed = null, seq = 0;
    const store = createMemStore();
    const engine = createEngine({ store, now: () => fixed ?? realNow, newId: () => 'i' + (++seq), hash });
    const ids = seedDemo({ engine, store, clock: { set: (t) => { fixed = t; }, reset: () => { fixed = null; } }, realNow });
    const admin = engine.auth.actor(ids.users.admin);
    const dash = engine.call(admin, 'dashboard', {});
    assert.deepEqual([dash.counts.deliveredToday, dash.counts.active, dash.counts.problems], [1, 4, 1], iso);
    const ds = store.find('deliveries', { tenantId: ids.tenants.kaya });
    for (const d of ds) {
      assert.ok(d.events.every((e) => e.at <= realNow), `${iso} ${d.bookingNo}: no step in the future`);
      const l = d.events.find((e) => e.type === 'loaded');
      if (l) assert.ok(berlinDate(l.at) >= d.pickup.date, `${iso} ${d.bookingNo}: loaded on/after its pickup day`);
      if (d.pickup.from && d.pickup.to) assert.ok(d.pickup.from <= d.pickup.to, `${iso} ${d.bookingNo}: pickup window`);
      if (d.status === 'delivered') assert.equal(d.deliveredAt, ev(d, 'delivered').at);
      if (d.status === 'cancelled') assert.ok(d.cancelledAt);
    }
    const no = (ref) => ds.filter((d) => d.reference === ref).map((d) => d.bookingNo).sort().pop(); // past tours get random PO numbers
    assert.deepEqual(['PO-4519921', 'PO-4519870', 'PAG-55012', 'IBM-77-201', 'LH-0091'].map(no), ['KAY-2610-0009', 'KAY-2610-0012', 'KAY-2610-0013', 'KAY-2610-0015', 'KAY-2610-0017'], iso);
    const elbe = store.find('tenants', { code: 'ELBE' })[0];
    assert.equal(berlinDate(elbe.statusAt), berlinDate(realNow - 60 * 864e5), 'ELBE was suspended two months ago');
  }
});
