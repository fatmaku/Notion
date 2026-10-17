// Engine tests for the last fixes before release: storage on downgrade, undo bound by receive time,
// closing customer requests, translatable templated errors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, EngineError } from '../core/engine.js';
import { createMemStore } from '../core/memstore.js';

function setup({ start = Date.parse('2026-10-16T06:00:00Z') } = {}) {
  let t = start, seq = 0;
  const store = createMemStore();
  const engine = createEngine({
    store, now: () => t, newId: () => 'id' + (++seq).toString(36).padStart(5, '0'),
    hash: { make: (s) => 'h$' + s, verify: (s, h) => h === 'h$' + s }, onEvent: () => {},
    rand: (() => { let x = 7; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); })(),
  });
  const platform = engine.setupPlatform({ email: 'chef@ladeklar.de', password: 'sehrgeheim123', name: 'Plattform' });
  const mkTenant = (name, plan = 'flotte') => {
    const r = engine.call(platform, 'createTenant', { name, plan, adminEmail: name.toLowerCase().replace(/\W/g, '') + '@firma.de', adminPassword: 'adminpasswort1' });
    let admin = engine.auth.login({ email: r.admin.email, password: 'adminpasswort1' });
    if (admin.mustChangePassword) { engine.call(admin, 'changePassword', { current: 'adminpasswort1', next: 'eigenespasswort1' }); admin = engine.auth.login({ email: r.admin.email, password: 'eigenespasswort1' }); }
    return { tenant: r.tenant, admin };
  };
  return { engine, store, platform, mkTenant, tick: (ms) => { t += ms; }, now: () => t };
}
const err = (fn) => { try { fn(); } catch (e) { assert.ok(e instanceof EngineError, 'expected EngineError, got ' + e); return e; } assert.fail('expected an error'); };

test('a downgrade must fit the storage in use (or be forced)', () => {
  const { engine, store, platform, mkTenant } = setup();
  const { tenant } = mkTenant('Speicher Logistik');
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, status: 'active' });
  store.put('tenants', { ...store.get('tenants', tenant.id), storageUsed: 6 * 2 ** 30 });
  const e = err(() => engine.call(platform, 'updateTenantLicense', { id: tenant.id, plan: 'start' }));
  assert.equal(e.code, 'over_limit');
  assert.match(e.message, /GB Speicher \(erlaubt 5 GB\)/);
  assert.equal(e.details.storageLimit, 5 * 2 ** 30);
  assert.equal(store.get('tenants', tenant.id).plan, 'flotte');
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, plan: 'start', force: true });
  assert.equal(store.get('tenants', tenant.id).plan, 'start');
});

test('undo is bounded by the server receive time, not only by the device time', () => {
  const { engine, platform, mkTenant, tick, now } = setup();
  const { tenant, admin } = mkTenant('Undo Spedition');
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, status: 'active' });
  const drv = engine.call(admin, 'createUser', { role: 'driver', name: 'Sven Krause', phone: '+49 176 1000 0004', pin: '424242' });
  const d = engine.call(admin, 'createDelivery', { pickup: { city: 'Stuttgart', date: '2026-10-16' }, dropoff: { city: 'Hamburg', date: '2026-10-17' }, driverId: drv.user.id });
  const me = engine.auth.driverLogin({ code: tenant.code, phone: '+49 176 1000 0004', pin: '424242' });
  engine.call(me, 'acceptDelivery', { id: d.id });
  const stepAt = now();
  engine.call(me, 'advanceDelivery', { id: d.id, step: 'loaded', at: stepAt });
  // within the window an undo works
  tick(60e3);
  engine.call(me, 'undoStep', { id: d.id, at: stepAt + 30e3 });
  engine.call(me, 'advanceDelivery', { id: d.id, step: 'loaded', at: now() });
  const at2 = now();
  // 30 hours later a forged device time close to the step must not reopen it
  tick(30 * 3600e3);
  assert.equal(err(() => engine.call(me, 'undoStep', { id: d.id, at: at2 + 30e3 })).code, 'undo_expired');
});

test('the licensor can close a customer request without acting on it', () => {
  const { engine, store, platform, mkTenant } = setup();
  const { tenant, admin } = mkTenant('Anfrage GmbH');
  engine.call(admin, 'requestPlanChange', { plan: 'premium', note: 'mehr Fahrer' });
  engine.call(admin, 'requestCancellation', { reason: 'Betrieb wird verkauft' });
  assert.ok(store.get('tenants', tenant.id).planRequest);
  engine.call(platform, 'closeRequest', { id: tenant.id, kind: 'plan' });
  engine.call(platform, 'closeRequest', { id: tenant.id, kind: 'cancel' });
  const t = store.get('tenants', tenant.id);
  assert.equal(t.planRequest, null);
  assert.equal(t.cancelRequestedAt, null);
  assert.equal(store.get('tenants', tenant.id).plan, 'flotte', 'plan unchanged');
  assert.equal(err(() => engine.call(admin, 'closeRequest', { id: tenant.id, kind: 'plan' })).code, 'forbidden');
  assert.equal(err(() => engine.call(platform, 'closeRequest', { id: tenant.id, kind: 'x' })).code, 'invalid');
});

test('templated errors carry a translatable key and their values', () => {
  const { engine, platform, mkTenant } = setup();
  const { tenant, admin } = mkTenant('Kennzeichen KG');
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, status: 'active' });
  engine.call(admin, 'createVehicle', { kind: 'truck', plate: 'S-KL 2041' });
  const e = err(() => engine.call(admin, 'createVehicle', { kind: 'truck', plate: 'S-KL 2041' }));
  assert.equal(e.code, 'conflict');
  assert.equal(e.message, 'Das Kennzeichen S-KL 2041 ist schon angelegt.');
  assert.equal(e.details.tkey, 'Das Kennzeichen {plate} ist schon angelegt.');
  assert.deepEqual(e.details.params, { plate: 'S-KL 2041' });
});
