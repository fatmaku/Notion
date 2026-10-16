// Engine tests: run with `node --test test/`. They walk through the real flows per role.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, EngineError, nextStep, waitingMinutes, monthlyPrice, PLANS } from '../core/engine.js';
import { createMemStore } from '../core/memstore.js';

function setup({ start = Date.parse('2026-10-16T06:00:00Z') } = {}) {
  let t = start, seq = 0;
  const events = [];
  const store = createMemStore();
  const engine = createEngine({
    store, now: () => t, newId: () => 'id' + (++seq).toString(36).padStart(5, '0'),
    hash: { make: (s) => 'h$' + s, verify: (s, h) => h === 'h$' + s }, onEvent: (e) => events.push(e),
    rand: (() => { let x = 7; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); })(),
  });
  const platform = engine.setupPlatform({ email: 'chef@ladeklar.de', password: 'sehrgeheim123', name: 'Plattform' });
  const tick = (ms) => { t += ms; };
  const mkTenant = (name, plan = 'flotte', extra = {}) => {
    const r = engine.call(platform, 'createTenant', { name, plan, adminEmail: name.toLowerCase().replace(/\W/g, '') + '@firma.de', adminPassword: 'adminpasswort1', contact: 'Chefin ' + name, ...extra });
    return { tenant: r.tenant, admin: engine.auth.login({ email: r.admin.email, password: 'adminpasswort1' }) };
  };
  const mkDriver = (admin, name, phone, lang = 'de') => {
    const r = engine.call(admin, 'createUser', { role: 'driver', name, phone, lang });
    return { user: r.user, pin: r.pin };
  };
  return { engine, store, events, platform, tick, mkTenant, mkDriver, now: () => t };
}

const code = (fn) => { try { fn(); } catch (e) { assert.ok(e instanceof EngineError, 'expected EngineError, got ' + e); return e.code; } assert.fail('expected an error'); };

test('licensor creates a licensee, admin logs in, wrong passwords lock the account', () => {
  const { engine, platform, mkTenant } = setup();
  const { tenant, admin } = mkTenant('Kaya Logistik');
  assert.equal(tenant.code, 'KAYALOGI');
  assert.equal(tenant.state, 'trial');
  assert.equal(admin.role, 'admin');
  assert.equal(admin.passwordHash, undefined, 'hash never leaves the engine');
  for (let i = 0; i < 5; i++) assert.equal(code(() => engine.auth.login({ email: admin.email, password: 'falsch' })), 'bad_login');
  assert.equal(code(() => engine.auth.login({ email: admin.email, password: 'adminpasswort1' })), 'locked');
  assert.equal(code(() => engine.call(platform, 'createTenant', { name: 'Kaya Logistik', adminEmail: 'x@y.de' })), 'conflict');
});

test('roles: every role can only do its own job', () => {
  const { engine, platform, mkTenant, mkDriver } = setup();
  const { admin } = mkTenant('Nordlicht', 'flotte');
  const { user: drv } = mkDriver(admin, 'Piotr Nowak', '0151 1111111', 'pl');
  const disp = engine.call(admin, 'createUser', { role: 'dispatcher', name: 'Dana Dispo', email: 'dana@nordlicht.de', password: 'dana-passwort-1' }).user;
  assert.equal(code(() => engine.call(drv, 'createDelivery', { pickup: { city: 'A', date: '2026-10-16' }, dropoff: { city: 'B' } })), 'forbidden');
  assert.equal(code(() => engine.call(disp, 'createUser', { role: 'dispatcher', name: 'X', email: 'x@n.de' })), 'forbidden');
  assert.equal(code(() => engine.call(disp, 'updateCompany', { name: 'X' })), 'forbidden');
  assert.equal(code(() => engine.call(platform, 'listDeliveries', {})), 'forbidden', 'licensor never sees delivery data');
  assert.equal(code(() => engine.call(admin, 'listTenants', {})), 'forbidden');
  assert.equal(code(() => engine.call(null, 'me', {})), 'unauthorized');
  assert.equal(code(() => engine.call(admin, 'doesNotExist', {})), 'not_found');
});

test('tenant isolation: company B never sees anything of company A', () => {
  const { engine, mkTenant, mkDriver } = setup();
  const A = mkTenant('Alpha Trans').admin;
  const B = mkTenant('Beta Cargo').admin;
  const dA = engine.call(A, 'createDelivery', { pickup: { city: 'Stuttgart', date: '2026-10-16' }, dropoff: { city: 'Hamburg' } });
  const vA = engine.call(A, 'createVehicle', { kind: 'truck', plate: 's-ab 123' });
  const { user: drvB } = mkDriver(B, 'Bea Fahrer', '0170 2222222');
  assert.equal(engine.call(B, 'listDeliveries', { tab: 'all' }).length, 0);
  assert.equal(code(() => engine.call(B, 'getDelivery', { id: dA.id })), 'not_found');
  assert.equal(code(() => engine.call(drvB, 'getDelivery', { id: dA.id })), 'not_found');
  assert.equal(code(() => engine.call(B, 'updateDelivery', { id: dA.id, customer: 'hack' })), 'not_found');
  assert.equal(code(() => engine.call(drvB, 'selectVehicle', { vehicleId: vA.id })), 'not_found');
  assert.equal(code(() => engine.call(B, 'createDelivery', { pickup: { city: 'X', date: '2026-10-16' }, dropoff: { city: 'Y' }, driverId: engine.call(A, 'listUsers', {})[0].id })), 'invalid');
  assert.equal(engine.call(B, 'listVehicles', {}).length, 0);
  assert.equal(engine.call(B, 'places', {}).length, 0);
});

test('seat and vehicle limits follow the plan', () => {
  const { engine, platform, mkTenant, mkDriver } = setup();
  const { tenant, admin } = mkTenant('Klein GmbH', 'start');
  for (let i = 0; i < PLANS.start.drivers; i++) mkDriver(admin, 'Fahrer ' + i, '0151 00000' + i);
  assert.equal(code(() => mkDriver(admin, 'Zu viel', '0151 9999999')), 'seat_limit');
  for (let i = 0; i < PLANS.start.vehicles; i++) engine.call(admin, 'createVehicle', { plate: 'KL-' + i + ' 1' });
  assert.equal(code(() => engine.call(admin, 'createVehicle', { plate: 'KL-X 1' })), 'seat_limit');
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, plan: 'flotte', extraDrivers: 2 });
  mkDriver(admin, 'Jetzt geht es', '0151 9999999');
  const t = engine.call(platform, 'getTenantLicense', { id: tenant.id });
  assert.equal(t.seats, 17);
  assert.equal(t.monthly, 129 + 2 * 7);
});

test('full driver flow: truck from pool → take open job → loaded → unloaded → delivery note → delivered, dispatch is notified live', () => {
  const { engine, events, mkTenant, mkDriver, tick } = setup();
  const { admin } = mkTenant('Kaya Logistik');
  const { user: drv } = mkDriver(admin, 'Mehmet Yılmaz', '0176 5555555', 'tr');
  const drvActor = engine.auth.driverLogin({ code: 'KAYALOGI', phone: '+49 176 5555555', pin: engine.call(admin, 'resetSecret', { id: drv.id }).pin });
  const truck = engine.call(admin, 'createVehicle', { kind: 'truck', plate: 'S-KL 2041', type: 'sattelzug' });
  const trailer = engine.call(admin, 'createVehicle', { kind: 'trailer', plate: 'S-KL 9001', type: 'plane' });
  const d = engine.call(admin, 'createDelivery', { customer: 'Bosch', pickup: { city: 'Stuttgart', date: '2026-10-16', from: '07:00' }, dropoff: { city: 'Hamburg', date: '2026-10-17' }, goods: { text: 'Ersatzteile', pallets: 18 } });
  assert.match(d.bookingNo, /^KAY-2610-0001$/);
  assert.equal(d.route, 'Stuttgart → Hamburg');
  assert.equal(d.openForAll, true);

  // the driver got a push in Turkish about the open job
  const n0 = engine.call(drvActor, 'listNotifications', {});
  assert.equal(n0[0].type, 'open');
  assert.equal(n0[0].title, 'Açık sipariş');

  engine.call(drvActor, 'selectVehicle', { vehicleId: truck.id, trailerId: trailer.id });
  let home = engine.call(drvActor, 'driverHome', {});
  assert.equal(home.vehicle.plate, 'S-KL 2041');
  assert.equal(home.offered.length, 1);

  events.length = 0;
  let x = engine.call(drvActor, 'acceptDelivery', { id: d.id });
  assert.equal(x.status, 'accepted');
  assert.equal(x.vehiclePlate, 'S-KL 2041', 'truck from the pool is put on the delivery');
  assert.equal(x.trailerPlate, 'S-KL 9001');
  assert.ok(events.some((e) => e.type === 'notify' && e.userId === admin.id && /Bestätigt/.test(e.notification.title)));
  assert.ok(events.some((e) => e.type === 'change' && e.col === 'deliveries' && e.allDrivers), 'other drivers learn the job is gone');

  tick(60 * 60e3);
  assert.equal(code(() => engine.call(drvActor, 'advanceDelivery', { id: d.id, step: 'unloaded' })), 'wrong_step');
  x = engine.call(drvActor, 'advanceDelivery', { id: d.id, step: 'loaded' });
  assert.equal(x.status, 'loaded');
  tick(6 * 60 * 60e3);
  x = engine.call(drvActor, 'advanceDelivery', { id: d.id, step: 'unloaded' });
  assert.equal(x.next, 'delivered');
  assert.equal(code(() => engine.call(drvActor, 'advanceDelivery', { id: d.id, step: 'delivered' })), 'pod_required');
  const f = engine.call(drvActor, 'createFile', { kind: 'pod', mime: 'image/jpeg', size: 180000, name: 'lieferschein.jpg', deliveryId: d.id });
  assert.ok(engine.canReadFile(admin, f.id), 'dispatch can open the delivery note');
  assert.equal(engine.canReadFile({ ...admin, tenantId: 'other' }, f.id), null);
  x = engine.call(drvActor, 'advanceDelivery', { id: d.id, step: 'delivered', receiver: 'M. Hansen' });
  assert.equal(x.status, 'delivered');
  assert.equal(x.receiver, 'M. Hansen');
  const n = engine.call(admin, 'listNotifications', {});
  assert.equal(n[0].type, 'delivered');
  assert.match(n[0].title, /^Zugestellt · KAY-2610-0001$/);
  assert.deepEqual(x.events.map((e) => e.type), ['created', 'accepted', 'loaded', 'unloaded', 'doc', 'delivered']);
  const dash = engine.call(admin, 'dashboard', {});
  assert.equal(dash.counts.deliveredToday, 1);
  assert.equal(engine.call(drvActor, 'myHistory', {}).length, 1);
});

test('assigned delivery: driver confirms, sees only own jobs, can return before loading', () => {
  const { engine, mkTenant, mkDriver } = setup();
  const { admin } = mkTenant('Kaya Logistik');
  const a = mkDriver(admin, 'Andrei Popescu', '0151 3333333', 'ro').user;
  const b = mkDriver(admin, 'Sven Krause', '0151 4444444').user;
  const d = engine.call(admin, 'createDelivery', { pickup: { city: 'Heilbronn', date: '2026-10-16' }, dropoff: { city: 'Köln' }, driverId: a.id });
  assert.equal(d.openForAll, false);
  assert.equal(engine.call(a, 'listNotifications', {})[0].title, `Comandă nouă ${d.bookingNo}`);
  assert.equal(code(() => engine.call(b, 'getDelivery', { id: d.id })), 'not_found');
  assert.equal(code(() => engine.call(b, 'acceptDelivery', { id: d.id })), 'not_found');
  engine.call(a, 'acceptDelivery', { id: d.id });
  assert.equal(code(() => engine.call(a, 'returnDelivery', { id: d.id, reason: '' })), 'invalid');
  engine.call(a, 'returnDelivery', { id: d.id, reason: 'Krank' });
  const back = engine.call(admin, 'getDelivery', { id: d.id });
  assert.equal(back.status, 'open');
  assert.equal(back.driverId, null);
  assert.equal(engine.call(admin, 'listNotifications', {})[0].priority, 'high');
});

test('two drivers cannot take the same truck or the same open job', () => {
  const { engine, mkTenant, mkDriver } = setup();
  const { admin } = mkTenant('Kaya Logistik');
  const a = mkDriver(admin, 'A Fahrer', '0151 1000001').user;
  const b = mkDriver(admin, 'B Fahrer', '0151 1000002').user;
  const v = engine.call(admin, 'createVehicle', { plate: 'S-KL 1' });
  engine.call(a, 'selectVehicle', { vehicleId: v.id });
  assert.equal(code(() => engine.call(b, 'selectVehicle', { vehicleId: v.id })), 'vehicle_busy');
  assert.equal(engine.call(b, 'listVehicles', {})[0].busy, true);
  engine.call(a, 'releaseVehicle', {});
  engine.call(b, 'selectVehicle', { vehicleId: v.id });
  const d = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Augsburg' } });
  engine.call(a, 'acceptDelivery', { id: d.id });
  assert.equal(code(() => engine.call(b, 'acceptDelivery', { id: d.id })), 'not_found', 'gone for the other driver');
  engine.call(admin, 'updateVehicle', { id: v.id, status: 'workshop' });
  assert.equal(engine.call(b, 'driverHome', {}).vehicle, null, 'workshop releases the truck');
});

test('undo works for two minutes, only for the own last step', () => {
  const { engine, mkTenant, mkDriver, tick } = setup();
  const { admin } = mkTenant('Kaya Logistik');
  const a = mkDriver(admin, 'A Fahrer', '0151 1000001').user;
  const d = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Augsburg' } });
  engine.call(a, 'acceptDelivery', { id: d.id });
  let x = engine.call(a, 'advanceDelivery', { id: d.id, step: 'loaded' });
  assert.equal(x.canUndo, true);
  x = engine.call(a, 'undoStep', { id: d.id });
  assert.equal(x.status, 'accepted');
  tick(3 * 60e3);
  assert.equal(code(() => engine.call(a, 'undoStep', { id: d.id })), 'undo_expired');
  x = engine.call(a, 'advanceDelivery', { id: d.id, step: 'loaded' });
  assert.equal(x.status, 'loaded');
  // undo of a claimed open job puts it back into the pool
  const d2 = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Bern', country: 'CH' } });
  engine.call(a, 'acceptDelivery', { id: d2.id });
  const y = engine.call(a, 'undoStep', { id: d2.id });
  assert.equal(y.status, 'open');
  assert.equal(engine.call(admin, 'getDelivery', { id: d2.id }).openForAll, true);
});

test('options: arrival taps measure waiting time, pallet exchange, signature', () => {
  const { engine, mkTenant, mkDriver, tick } = setup();
  const { admin } = mkTenant('Kaya Logistik');
  engine.call(admin, 'updateCompany', { settings: { trackArrival: true, palletExchange: true, requireSignature: true, requirePod: false } });
  const a = mkDriver(admin, 'A Fahrer', '0151 1000001').user;
  const d = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Augsburg', date: '2026-10-16', to: '18:00' }, driverId: a.id });
  assert.deepEqual(d.steps, ['accepted', 'arrived_pickup', 'loaded', 'arrived_dropoff', 'unloaded', 'delivered']);
  engine.call(a, 'acceptDelivery', { id: d.id });
  engine.call(a, 'advanceDelivery', { id: d.id, step: 'arrived_pickup' });
  tick(45 * 60e3);
  engine.call(a, 'advanceDelivery', { id: d.id, step: 'loaded' });
  tick(90 * 60e3);
  engine.call(a, 'advanceDelivery', { id: d.id, step: 'arrived_dropoff' });
  tick(20 * 60e3);
  let x = engine.call(a, 'advanceDelivery', { id: d.id, step: 'unloaded', palletExchange: { given: 18, taken: 16 } });
  assert.equal(x.waitingMinutes, 65);
  assert.deepEqual(x.palletExchange, { given: 18, taken: 16 });
  assert.equal(code(() => engine.call(a, 'advanceDelivery', { id: d.id, step: 'delivered' })), 'signature_required');
  const sig = engine.call(a, 'createFile', { kind: 'signature', mime: 'image/png', size: 5000 });
  x = engine.call(a, 'advanceDelivery', { id: d.id, step: 'delivered', receiver: 'Lager Süd', signatureFileId: sig.id });
  assert.equal(x.status, 'delivered');
  const r = engine.call(admin, 'reports', {});
  assert.equal(r.delivered, 1);
  assert.equal(r.avgWaiting, 65);
  assert.equal(r.onTimeRate, 100);
  assert.equal(r.palletsGiven, 18);
});

test('problems and notes reach the right people', () => {
  const { engine, mkTenant, mkDriver } = setup();
  const { admin } = mkTenant('Kaya Logistik');
  const a = mkDriver(admin, 'Olena Bondarenko', '0151 1000001', 'uk').user;
  const d = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Augsburg' }, driverId: a.id });
  engine.call(a, 'acceptDelivery', { id: d.id });
  engine.call(a, 'reportProblem', { id: d.id, code: 'delay', note: 'A8 Stau' });
  assert.equal(engine.call(admin, 'dashboard', {}).counts.problems, 1);
  const n = engine.call(admin, 'listNotifications', {})[0];
  assert.equal(n.priority, 'high');
  assert.match(n.title, /Stau \/ Verspätung/);
  engine.call(admin, 'addNote', { id: d.id, text: 'Danke, Kunde ist informiert.' });
  assert.equal(engine.call(a, 'listNotifications', {})[0].title, 'Нотатка від Chefin Kaya Logistik');
  engine.call(admin, 'resolveProblem', { id: d.id });
  assert.equal(engine.call(admin, 'dashboard', {}).counts.problems, 0);
  assert.equal(engine.call(a, 'markNotificationsRead', {}).marked, 3);
});

test('licence state: suspended or expired means read and export only; drivers are locked out', () => {
  const { engine, platform, mkTenant, mkDriver, tick } = setup();
  const { tenant, admin } = mkTenant('Kaya Logistik', 'flotte', { trialDays: 30 });
  const { user: drv, pin } = mkDriver(admin, 'A Fahrer', '0151 1000001');
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, status: 'suspended' });
  assert.equal(code(() => engine.call(admin, 'createDelivery', { pickup: { city: 'A', date: '2026-10-16' }, dropoff: { city: 'B' } })), 'license_inactive');
  assert.ok(engine.call(admin, 'listDeliveries', {}));
  assert.ok(engine.call(admin, 'exportData', {}).users.every((u) => !u.passwordHash && !u.pinHash), 'export without secrets');
  assert.equal(code(() => engine.auth.driverLogin({ code: tenant.code, phone: '01511000001', pin })), 'license_inactive');
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, status: 'trial' });
  assert.ok(engine.auth.driverLogin({ code: tenant.code, phone: '01511000001', pin }));
  tick(31 * 864e5);
  assert.equal(engine.call(admin, 'me', {}).license.state, 'expired');
  assert.equal(code(() => engine.call(drv, 'selectVehicle', { vehicleId: null })), 'license_inactive');
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, status: 'active' });
  assert.equal(engine.call(admin, 'me', {}).license.state, 'active');
});

test('reassigning informs new and old driver; done deliveries only allow bookkeeping changes', () => {
  const { engine, mkTenant, mkDriver } = setup();
  const { admin } = mkTenant('Kaya Logistik');
  const a = mkDriver(admin, 'A Fahrer', '0151 1000001').user;
  const b = mkDriver(admin, 'B Fahrer', '0151 1000002').user;
  const d = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Augsburg' }, driverId: a.id });
  engine.call(a, 'acceptDelivery', { id: d.id });
  const x = engine.call(admin, 'updateDelivery', { id: d.id, driverId: b.id });
  assert.equal(x.status, 'open', 'new driver has to confirm again');
  assert.equal(engine.call(b, 'listNotifications', {})[0].type, 'assigned');
  assert.equal(engine.call(a, 'listNotifications', {})[0].type, 'cancelled');
  engine.call(admin, 'cancelDelivery', { id: d.id, reason: 'Kunde storniert' });
  assert.equal(code(() => engine.call(admin, 'updateDelivery', { id: d.id, pickup: { city: 'X' } })), 'invalid');
  assert.equal(engine.call(admin, 'updateDelivery', { id: d.id, reference: 'R-1' }).reference, 'R-1');
});

test('validation gives clear messages and failed calls leave no trace', () => {
  const { engine, store, events, mkTenant } = setup();
  const { admin } = mkTenant('Kaya Logistik');
  const e = (() => { try { engine.call(admin, 'createDelivery', { pickup: { city: 'Stuttgart' }, dropoff: { city: 'Hamburg' } }); } catch (x) { return x; } })();
  assert.equal(e.code, 'invalid');
  assert.deepEqual(e.details.fields, ['pickup.date']);
  const before = JSON.stringify(store.dump());
  events.length = 0;
  assert.throws(() => store.tx(() => { store.put('deliveries', { id: 'tmp', tenantId: 'x' }); throw new Error('boom'); }));
  assert.equal(JSON.stringify(store.dump()), before, 'rollback');
  assert.equal(code(() => engine.call(admin, 'createVehicle', { plate: '' })), 'invalid');
  assert.equal(events.length, 0, 'no events from failed calls');
});

test('licensor sees revenue and billing, but no personal or delivery data', () => {
  const { engine, platform, mkTenant } = setup();
  const k = mkTenant('Kaya Logistik', 'flotte', { trialDays: 0, extraDrivers: 3 });
  mkTenant('Nordlicht', 'premium', { trialDays: 0, storeApp: true, billing: 'yearly' });
  mkTenant('Testfirma', 'start');
  engine.call(k.admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Augsburg' } });
  const s = engine.call(platform, 'platformStats', {});
  assert.equal(s.active, 2);
  assert.equal(s.trial, 1);
  assert.equal(s.mrr, Math.round((129 + 21 + (299 + 99) * 10 / 12) * 100) / 100);
  const list = engine.call(platform, 'listTenants', {});
  assert.equal(list.find((t) => t.name === 'Kaya Logistik').usage.deliveriesMonth, 1);
  assert.ok(!JSON.stringify(list).includes('Ulm'), 'no delivery content in the licensor view');
  const bill = engine.call(platform, 'billingRun', {});
  assert.equal(bill.lines.length, 2);
  const kaya = bill.lines.find((l) => l.code === 'KAYALOGI');
  assert.equal(kaya.net, 150);
  assert.equal(kaya.gross, 178.5);
  assert.equal(monthlyPrice({ plan: 'premium', extraDrivers: 5, storeApp: true }), 299 + 30 + 99);
});

test('places are suggested from history, booking numbers count up, API key only for Premium', () => {
  const { engine, mkTenant } = setup();
  const { admin } = mkTenant('Kaya Logistik', 'flotte');
  for (let i = 0; i < 3; i++) engine.call(admin, 'createDelivery', { pickup: { place: 'Bosch Werk Feuerbach', street: 'Wernerstr. 1', zip: '70469', city: 'Stuttgart', date: '2026-10-16' }, dropoff: { city: 'Hamburg' } });
  const p = engine.call(admin, 'places', { q: 'feuer' });
  assert.equal(p[0].place, 'Bosch Werk Feuerbach');
  assert.equal(p[0].count, 3);
  assert.equal(engine.call(admin, 'listDeliveries', { tab: 'all' }).map((d) => d.bookingNo).sort().pop(), 'KAY-2610-0003');
  assert.equal(code(() => engine.call(admin, 'rotateApiKey', {})), 'plan');
  const { admin: prem } = mkTenant('Premium AG', 'premium');
  const { apiKey } = engine.call(prem, 'rotateApiKey', {});
  assert.equal(engine.apiActor(apiKey).role, 'dispatcher');
  assert.equal(engine.apiActor('lk_wrong'), null);
});

test('retention: old documents are purged per company setting', () => {
  const { engine, store, mkTenant, mkDriver, tick } = setup();
  const { admin } = mkTenant('Kaya Logistik');
  engine.call(admin, 'updateCompany', { settings: { retentionYears: 1 } });
  const a = mkDriver(admin, 'A Fahrer', '0151 1000001').user;
  const d = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Augsburg' }, driverId: a.id });
  engine.call(a, 'acceptDelivery', { id: d.id });
  engine.call(a, 'advanceDelivery', { id: d.id, step: 'loaded' });
  engine.call(a, 'advanceDelivery', { id: d.id, step: 'unloaded' });
  const f = engine.call(a, 'createFile', { kind: 'pod', mime: 'image/jpeg', size: 1000, deliveryId: d.id });
  engine.call(a, 'advanceDelivery', { id: d.id, step: 'delivered' });
  assert.deepEqual(engine.purgeExpired(), []);
  tick(367 * 864e5);
  assert.deepEqual(engine.purgeExpired(), [f.id]);
  assert.equal(store.get('deliveries', d.id), null);
});

test('nextStep and waitingMinutes are pure helpers', () => {
  assert.equal(nextStep({ status: 'accepted' }, { trackArrival: false }), 'loaded');
  assert.equal(nextStep({ status: 'accepted' }, { trackArrival: true }), 'arrived_pickup');
  assert.equal(nextStep({ status: 'delivered' }), null);
  assert.equal(waitingMinutes({ events: [] }), null);
});

test('billing: monthly from the paid start, yearly only in the renewal month, stops with suspension', () => {
  const { engine, platform, mkTenant, tick } = setup();
  const m = mkTenant('Monat GmbH', 'flotte', { trialDays: 0 });
  const y = mkTenant('Jahr AG', 'premium', { trialDays: 0, billing: 'yearly', storeApp: true });
  const tr = mkTenant('Test KG', 'start', { trialDays: 30 });
  const codes = (month) => engine.call(platform, 'billingRun', { month }).lines.map((l) => l.code).sort();
  assert.deepEqual(codes('2026-10'), ['JAHRAG', 'MONATGMB']);
  assert.deepEqual(codes('2026-11'), ['MONATGMB'], 'yearly payers are not billed every month');
  assert.deepEqual(codes('2026-09'), [], 'nothing before the paid start');
  assert.deepEqual(codes('2027-10'), ['JAHRAG', 'MONATGMB'], 'yearly renewal after 12 months');
  const yl = engine.call(platform, 'billingRun', { month: '2026-10' }).lines.find((l) => l.code === 'JAHRAG');
  assert.equal(yl.net, (299 + 99) * 10);
  assert.equal(yl.period, '10/2026 – 09/2027');
  // trial converts in November → billed from November
  tick(20 * 864e5);
  engine.call(platform, 'updateTenantLicense', { id: tr.tenant.id, status: 'active' });
  assert.ok(codes('2026-11').includes('TESTKG'));
  assert.ok(!codes('2026-10').includes('TESTKG'));
  // suspended in November: October stays billed, November not
  engine.call(platform, 'updateTenantLicense', { id: m.tenant.id, status: 'suspended' });
  assert.ok(codes('2026-10').includes('MONATGMB'));
  assert.ok(!codes('2026-11').includes('MONATGMB'));
  // store app only with Premium; extra drivers have no effect on Start
  assert.equal(code(() => engine.call(platform, 'updateTenantLicense', { id: m.tenant.id, storeApp: true })), 'invalid');
  assert.equal(code(() => engine.call(platform, 'updateTenantLicense', { id: y.tenant.id, plan: 'flotte' })), 'invalid', 'downgrade with store app must drop the app first');
  assert.equal(engine.call(platform, 'updateTenantLicense', { id: tr.tenant.id, extraDrivers: 5 }).extraDrivers, 0);
  assert.equal(code(() => engine.call(platform, 'createTenant', { name: 'Klein', plan: 'start', storeApp: true, adminEmail: 'k@klein.de' })), 'invalid');
});

test('booking numbers restart every month and stay unique', () => {
  const { engine, mkTenant, tick } = setup();
  const { admin } = mkTenant('Kaya Logistik');
  const mk = () => engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-12-01' }, dropoff: { city: 'Augsburg' } }).bookingNo;
  assert.equal(mk(), 'KAY-2610-0001');
  assert.equal(mk(), 'KAY-2610-0002');
  tick(20 * 864e5); // November
  assert.equal(mk(), 'KAY-2611-0001');
  engine.call(admin, 'updateCompany', { settings: { bookingPrefix: 'KX' } });
  assert.equal(mk(), 'KX-2611-0002');
  engine.call(admin, 'updateCompany', { settings: { bookingPrefix: 'KAY' } });
  assert.equal(mk(), 'KAY-2611-0003');
});

test('deleting a person anonymises the account, keeps the records and frees open tours', () => {
  const { engine, store, mkTenant, mkDriver } = setup();
  const { admin } = mkTenant('Kaya Logistik');
  const a = mkDriver(admin, 'Anna Fahrer', '0151 1000001');
  const b = mkDriver(admin, 'Bert Fahrer', '0151 1000002');
  const done = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Augsburg' }, driverId: a.user.id });
  engine.call(a.user, 'acceptDelivery', { id: done.id });
  engine.call(admin, 'cancelDelivery', { id: done.id, reason: 'x' });
  const open = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-17' }, dropoff: { city: 'Köln' }, driverId: a.user.id });
  engine.call(a.user, 'acceptDelivery', { id: open.id });
  const loaded = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Bonn' }, driverId: b.user.id });
  engine.call(b.user, 'acceptDelivery', { id: loaded.id });
  engine.call(b.user, 'advanceDelivery', { id: loaded.id, step: 'loaded' });
  assert.equal(code(() => engine.call(admin, 'deleteUser', { id: b.user.id })), 'invalid', 'a loaded tour has to be finished first');
  assert.equal(code(() => engine.call(admin, 'deleteUser', { id: admin.id })), 'invalid');
  engine.call(admin, 'deleteUser', { id: a.user.id });
  const u = store.get('users', a.user.id);
  assert.equal(u.name, 'Gelöschter Nutzer');
  assert.equal(u.phone, '');
  assert.equal(u.pinHash, null);
  assert.equal(engine.auth.actor(a.user.id), null, 'session ends');
  assert.equal(code(() => engine.auth.driverLogin({ code: 'KAYALOGI', phone: '01511000001', pin: a.pin })), 'bad_login');
  assert.equal(store.find('notifications', { userId: a.user.id }).length, 0);
  assert.equal(engine.call(admin, 'getDelivery', { id: done.id }).driverName, 'Gelöschter Nutzer', 'finished records stay');
  const reopened = engine.call(admin, 'getDelivery', { id: open.id });
  assert.equal(reopened.status, 'open');
  assert.equal(reopened.driverId, null);
  assert.ok(!engine.call(admin, 'listUsers', { role: 'driver' }).some((x) => x.id === a.user.id));
  assert.equal(code(() => engine.call(admin, 'setUserActive', { id: a.user.id, active: true })), 'not_found');
  assert.ok(engine.call(admin, 'auditLog', {}).some((e) => e.action === 'user.delete'));
});

test('cancelled company: admin signs in read-only and exports, everyone else is out; then the licensor deletes it', () => {
  const { engine, store, platform, mkTenant, mkDriver } = setup();
  const { tenant, admin } = mkTenant('Kaya Logistik');
  const drv = mkDriver(admin, 'Anna Fahrer', '0151 1000001');
  engine.call(admin, 'createUser', { role: 'dispatcher', name: 'Dana', email: 'dana@kaya.de', password: 'dana-passwort-1' });
  const d = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Augsburg' } });
  engine.call(admin, 'createFile', { kind: 'pod', mime: 'image/jpeg', size: 1000, deliveryId: d.id });
  assert.equal(code(() => engine.call(platform, 'deleteTenant', { id: tenant.id, confirmCode: tenant.code })), 'invalid', 'only after cancellation');
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, status: 'cancelled' });
  const again = engine.auth.login({ email: admin.email, password: 'adminpasswort1' });
  assert.equal(engine.call(again, 'me', {}).license.state, 'cancelled');
  assert.equal(engine.call(again, 'exportData', {}).deliveries.length, 1);
  assert.equal(code(() => engine.call(again, 'createDelivery', { pickup: { city: 'A', date: '2026-10-16' }, dropoff: { city: 'B' } })), 'license_inactive');
  assert.equal(code(() => engine.auth.login({ email: 'dana@kaya.de', password: 'dana-passwort-1' })), 'license_inactive');
  assert.equal(code(() => engine.auth.driverLogin({ code: tenant.code, phone: '01511000001', pin: drv.pin })), 'license_inactive');
  assert.equal(code(() => engine.call(platform, 'deleteTenant', { id: tenant.id, confirmCode: 'FALSCH' })), 'invalid');
  const r = engine.call(platform, 'deleteTenant', { id: tenant.id, confirmCode: tenant.code.toLowerCase() });
  assert.equal(r.userIds.length, 3);
  assert.equal(r.fileIds.length, 1);
  for (const col of ['users', 'deliveries', 'files', 'notifications', 'vehicles', 'audit']) assert.equal(store.find(col, { tenantId: tenant.id }).length, 0, col);
  assert.equal(store.get('tenants', tenant.id), null);
  assert.equal(engine.call(platform, 'listTenants', {}).length, 0);
});

test('start password: nothing works until the own password is set; licensor reset is logged for the customer', () => {
  const { engine, platform } = setup();
  const r = engine.call(platform, 'createTenant', { name: 'Kaya Logistik', adminEmail: 'ayse@kaya.de' });
  const admin = engine.auth.login({ email: 'ayse@kaya.de', password: r.password }, { ip: '203.0.113.7' });
  assert.equal(admin.mustChangePassword, true);
  assert.ok(engine.call(admin, 'me', {}));
  assert.equal(code(() => engine.call(admin, 'listDeliveries', {})), 'password_change');
  engine.call(admin, 'changePassword', { current: r.password, next: 'mein-eigenes-pw-1' });
  const fresh = engine.auth.actor(admin.id);
  assert.equal(fresh.mustChangePassword, false);
  assert.ok(engine.call(fresh, 'listDeliveries', {}));
  const reset = engine.call(platform, 'resetTenantAdmin', { id: r.tenant.id });
  assert.equal(engine.auth.actor(admin.id).mustChangePassword, true);
  assert.equal(engine.auth.login({ email: 'ayse@kaya.de', password: reset.password }).mustChangePassword, true);
  // failed logins and the reset are in the customer's log, with the IP of the request
  assert.equal(code(() => engine.auth.login({ email: 'ayse@kaya.de', password: 'falsch' }, { ip: '198.51.100.9' })), 'bad_login');
  engine.call(engine.auth.actor(admin.id), 'changePassword', { current: reset.password, next: 'noch-ein-pw-123' });
  const log = engine.call(engine.auth.actor(admin.id), 'auditLog', {});
  assert.ok(log.some((e) => e.action === 'user.reset_by_licensor'));
  const failed = log.find((e) => e.action === 'login.failed');
  assert.equal(failed.ip, '198.51.100.9');
  assert.equal(log.find((e) => e.action === 'login' && e.ip === '203.0.113.7')?.actorId, admin.id);
});

test('licensor edits licence end, contact data and custom domains (Premium only)', () => {
  const { engine, platform, mkTenant } = setup();
  const f = mkTenant('Flotte GmbH', 'flotte', { trialDays: 0 });
  const p = mkTenant('Premium AG', 'premium', { trialDays: 0 });
  assert.equal(code(() => engine.call(platform, 'updateTenantLicense', { id: f.tenant.id, domains: 'fahrer.flotte.de' })), 'plan');
  const x = engine.call(platform, 'updateTenantLicense', { id: p.tenant.id, domains: 'https://Fahrer.Premium.de/, app.premium.de', licenseEnd: '2026-12-31', legalName: 'Premium AG & Co. KG', vatId: 'DE123456789', email: 'rechnung@premium.de' });
  assert.deepEqual(x.domains, ['fahrer.premium.de', 'app.premium.de']);
  assert.equal(new Date(x.licenseEnd).toISOString(), '2026-12-31T22:59:59.000Z');
  assert.equal(x.legalName, 'Premium AG & Co. KG');
  assert.equal(code(() => engine.call(platform, 'updateTenantLicense', { id: p.tenant.id, domains: 'kein domain' })), 'invalid');
  assert.equal(code(() => engine.call(platform, 'updateTenantLicense', { id: p.tenant.id, email: 'kaputt' })), 'invalid');
});

test('dead zone: signature and damage photo uploaded to the delivery are picked up by the following step', () => {
  const { engine, mkTenant, mkDriver } = setup();
  const { admin } = mkTenant('Kaya Logistik');
  engine.call(admin, 'updateCompany', { settings: { requireSignature: true } });
  const a = mkDriver(admin, 'Anna Fahrer', '0151 1000001').user;
  const d = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Augsburg' }, driverId: a.id });
  engine.call(a, 'acceptDelivery', { id: d.id });
  const photo = engine.call(a, 'createFile', { kind: 'damage', mime: 'image/jpeg', size: 500, deliveryId: d.id });
  const p = engine.call(a, 'reportProblem', { id: d.id, code: 'damaged', photo: true });
  assert.equal(p.problem.fileId, photo.id);
  assert.equal(p.docs.filter((x) => x.fileId === photo.id).length, 1, 'no duplicate document');
  engine.call(admin, 'resolveProblem', { id: d.id });
  engine.call(a, 'advanceDelivery', { id: d.id, step: 'loaded' });
  engine.call(a, 'advanceDelivery', { id: d.id, step: 'unloaded' });
  engine.call(a, 'createFile', { kind: 'pod', mime: 'image/jpeg', size: 500, deliveryId: d.id });
  assert.equal(code(() => engine.call(a, 'advanceDelivery', { id: d.id, step: 'delivered' })), 'signature_required');
  const sig = engine.call(a, 'createFile', { kind: 'signature', mime: 'image/png', size: 300, deliveryId: d.id });
  const fin = engine.call(a, 'advanceDelivery', { id: d.id, step: 'delivered' });
  assert.equal(fin.status, 'delivered');
  assert.equal(fin.signatureFileId, sig.id);
});

test('reports per customer and per loading/unloading place, longest waiting first', () => {
  const { engine, mkTenant, mkDriver, tick } = setup();
  const { admin } = mkTenant('Kaya Logistik');
  engine.call(admin, 'updateCompany', { settings: { trackArrival: true, requirePod: false, reportsByDriver: false } });
  const a = mkDriver(admin, 'Anna Fahrer', '0151 1000001').user;
  const run = (customer, from, to, waitPick, waitDrop) => {
    const d = engine.call(admin, 'createDelivery', { customer, pickup: { place: from[0], city: from[1], date: '2026-10-16' }, dropoff: { place: to[0], city: to[1] }, driverId: a.id });
    engine.call(a, 'acceptDelivery', { id: d.id });
    engine.call(a, 'advanceDelivery', { id: d.id, step: 'arrived_pickup' }); tick(waitPick * 60000);
    engine.call(a, 'advanceDelivery', { id: d.id, step: 'loaded' }); tick(3 * 3600e3);
    engine.call(a, 'advanceDelivery', { id: d.id, step: 'arrived_dropoff' }); tick(waitDrop * 60000);
    engine.call(a, 'advanceDelivery', { id: d.id, step: 'unloaded' });
    engine.call(a, 'advanceDelivery', { id: d.id, step: 'delivered' });
  };
  run('Bosch', ['Werk Feuerbach', 'Stuttgart'], ['HHLA Terminal', 'Hamburg'], 20, 90);
  run('Bosch', ['Werk Feuerbach', 'Stuttgart'], ['HHLA Terminal', 'Hamburg'], 40, 30);
  run('Daimler', ['Werk Sindelfingen', 'Sindelfingen'], ['Lager Süd', 'Leipzig'], 10, 5);
  const r = engine.call(admin, 'reports', { month: '2026-10' });
  assert.deepEqual(r.byDriver, [], 'per driver switched off …');
  assert.equal(r.byCustomer.length, 2, '… per customer still shown (no personal data)');
  assert.deepEqual(r.byCustomer[0], { customer: 'Bosch', count: 2, problems: 0, avgWaiting: 90, measured: 2 });
  assert.deepEqual(r.byPlace.map((x) => [x.side, x.place, x.avgWaiting, x.count]), [['dropoff', 'HHLA Terminal', 60, 2], ['pickup', 'Werk Feuerbach', 30, 2], ['pickup', 'Werk Sindelfingen', 10, 1], ['dropoff', 'Lager Süd', 5, 1]]);
});
