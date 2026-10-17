// Engine tests for accounts, licences, billing, files and the call() dispatcher (fix round 2).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createEngine, EngineError, normPhone, PLANS } from '../core/engine.js';
import { createMemStore } from '../core/memstore.js';
import { sha256 } from '../core/sha256.js';
import { totp, verify, base32Encode } from '../core/totp.js';

function setup({ start = Date.parse('2026-10-16T06:00:00Z'), ...opts } = {}) {
  let t = start, seq = 0;
  const events = [];
  const store = createMemStore();
  const hashCalls = { verify: 0 };
  const engine = createEngine({
    store, now: () => t, newId: () => 'id' + (++seq).toString(36).padStart(5, '0'),
    hash: { make: (s) => 'h$' + s, verify: (s, h) => { hashCalls.verify++; return h === 'h$' + s; } }, onEvent: (e) => events.push(e),
    rand: (() => { let x = 7; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); })(), ...opts,
  });
  const platform = engine.setupPlatform({ email: 'chef@ladeklar.de', password: 'sehrgeheim123', name: 'Plattform' });
  const mkTenant = (name, plan = 'flotte', extra = {}) => {
    const r = engine.call(platform, 'createTenant', { name, plan, adminEmail: name.toLowerCase().replace(/\W/g, '') + '@firma.de', adminPassword: 'adminpasswort1', ...extra });
    return { tenant: r.tenant, admin: engine.auth.login({ email: r.admin.email, password: 'adminpasswort1' }) };
  };
  const mkDriver = (admin, name, phone, extra = {}) => engine.call(admin, 'createUser', { role: 'driver', name, phone, pin: '424242', ...extra });
  return { engine, store, events, platform, mkTenant, mkDriver, hashCalls, tick: (ms) => { t += ms; }, set: (iso) => { t = Date.parse(iso); }, now: () => t };
}
const code = (fn) => { try { fn(); } catch (e) { assert.ok(e instanceof EngineError, 'expected EngineError, got ' + e); return e.code; } assert.fail('expected an error'); };
const err = (fn) => { try { fn(); } catch (e) { return e; } assert.fail('expected an error'); };

test('sha256 and TOTP match Node crypto and the RFC 6238 vectors', () => {
  for (const s of ['', 'abc', 'x'.repeat(64), 'Grüße 🚚']) assert.equal(sha256(s), crypto.createHash('sha256').update(s).digest('hex'));
  const secret = base32Encode(new TextEncoder().encode('12345678901234567890'));
  assert.equal(secret, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  assert.equal(totp(secret, 59e3), '287082');
  assert.equal(totp(secret, 1111111109e3), '081804');
  assert.ok(verify(secret, '287082', 59e3 + 30e3), 'one step later still valid');
  assert.ok(!verify(secret, '287082', 59e3 + 61e3), 'two steps later invalid');
});

test('C19/sec-1: a driver with someone else\'s e-mail never blocks a staff or licensor login', () => {
  const { engine, platform, mkTenant, mkDriver } = setup();
  const a = mkTenant('Alpha Trans').admin;
  for (let i = 0; i < 4; i++) mkDriver(a, 'Fake ' + i, '0160 99000' + i, { email: 'chef@ladeklar.de' });
  mkDriver(a, 'Fake B', '0160 990009', { email: 'beta@firma.de' });
  assert.equal(engine.auth.login({ email: 'chef@ladeklar.de', password: 'sehrgeheim123' }).role, 'platform');
  // the squatted e-mail does not block a new customer either
  assert.ok(engine.call(platform, 'createTenant', { name: 'Beta', adminEmail: 'beta@firma.de', adminPassword: 'adminpasswort1' }));
  assert.equal(engine.auth.login({ email: 'beta@firma.de', password: 'adminpasswort1' }).role, 'admin');
  // drivers cannot sign in by e-mail; staff e-mails are unique across companies
  assert.equal(code(() => engine.call(a, 'createUser', { role: 'dispatcher', name: 'D', email: 'beta@firma.de' })), 'conflict');
  assert.equal(code(() => engine.call(a, 'createUser', { role: 'dispatcher', name: 'D', email: 'chef@ladeklar.de' })), 'conflict');
  assert.equal(code(() => mkDriver(a, 'Kaputt', '0160 9911111', { email: 'kein-mail' })), 'invalid');
  assert.equal(code(() => engine.setupPlatform({ email: 'x@y.de', password: 'langespasswort' })), 'conflict');
});

test('C6/sec-5/lic-7: sessions and API keys end with the licence', () => {
  const { engine, platform, mkTenant, mkDriver } = setup();
  const { tenant, admin } = mkTenant('Prem AG', 'premium', { trialDays: 0 });
  const disp = engine.call(admin, 'createUser', { role: 'dispatcher', name: 'Dana', email: 'dana@prem.de', password: 'dana-passwort-1' }).user;
  const drv = mkDriver(admin, 'Anna', '0151 1000001').user;
  const { apiKey } = engine.call(admin, 'rotateApiKey', {});
  assert.ok(engine.apiActor(apiKey));
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, status: 'suspended' });
  assert.equal(engine.auth.actor(drv.id), null, 'driver session ends when suspended');
  assert.ok(engine.auth.actor(disp.id), 'office keeps read access while suspended');
  assert.equal(engine.apiActor(apiKey), null, 'API only while the licence is writable');
  assert.ok(engine.call(admin, 'setUserActive', { id: drv.id, active: false }), 'switching a person off works in every state');
  assert.equal(code(() => engine.call(admin, 'setUserActive', { id: drv.id, active: true })), 'license_inactive');
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, status: 'cancelled' });
  assert.equal(engine.auth.actor(disp.id), null, 'only the admin stays after a cancellation');
  assert.ok(engine.auth.actor(admin.id));
  assert.deepEqual(engine.call(admin, 'rotateApiKey', { clear: true }), { apiKey: null }, 'the key can be cleared after the cancellation');
});

test('C5/sec-17: tenant change events carry the tenant id', () => {
  const { engine, events, platform, mkTenant } = setup();
  const { tenant, admin } = mkTenant('Kaya');
  events.length = 0;
  engine.call(admin, 'updateCompany', { settings: { driveLock: false } });
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, status: 'suspended' });
  const ch = events.filter((e) => e.type === 'change' && e.col === 'tenants');
  assert.equal(ch.length, 2);
  assert.ok(ch.every((e) => e.tenantId === tenant.id));
});

test('sec-18: unknown accounts cost the same hash work; sec-19: escalating lockout, office is told', () => {
  const { engine, store, hashCalls, mkTenant, mkDriver, tick, now } = setup();
  const { tenant, admin } = mkTenant('Kaya');
  const disp = engine.call(admin, 'createUser', { role: 'dispatcher', name: 'Dana', email: 'dana@kaya.de', password: 'dana-passwort-1' }).user;
  const drv = mkDriver(admin, 'Anna Fahrer', '0151 1000001', { personalNo: '1001' }).user;
  let n = hashCalls.verify;
  code(() => engine.auth.login({ email: 'niemand@nirgends.de', password: 'x' }));
  assert.equal(hashCalls.verify, n + 1, 'staff login: dummy hash');
  n = hashCalls.verify;
  code(() => engine.auth.driverLogin({ code: tenant.code, phone: '0151 9999999', pin: '111111' }));
  assert.equal(hashCalls.verify, n + 1, 'driver login: dummy hash');
  const wrong = () => code(() => engine.auth.driverLogin({ code: tenant.code, phone: '1001', pin: '000000' }));
  const lockLeft = () => store.get('users', drv.id).lockedUntil - now();
  for (let i = 0; i < 5; i++) assert.equal(wrong(), 'bad_login');
  assert.equal(wrong(), 'locked');
  assert.equal(lockLeft(), 15 * 60e3, 'first lock: 15 minutes');
  tick(15 * 60e3 + 1);
  for (let i = 0; i < 5; i++) wrong();
  assert.equal(lockLeft(), 60 * 60e3, 'second lock: 1 hour');
  assert.match(err(() => engine.auth.driverLogin({ code: tenant.code, phone: '1001', pin: '424242' })).message, /einer Stunde/);
  assert.equal(engine.call(admin, 'listNotifications', {}).filter((x) => x.type === 'lockout').length, 0);
  tick(60 * 60e3 + 1);
  for (let i = 0; i < 5; i++) wrong();
  assert.equal(lockLeft(), 24 * 3600e3, 'third lock: 24 hours');
  assert.equal(code(() => engine.auth.driverLogin({ code: tenant.code, phone: '1001', pin: '424242' })), 'locked', 'even the right PIN');
  assert.equal(engine.call(admin, 'listNotifications', {})[0].type, 'lockout', 'office is told about the 24 h lock');
  assert.ok(engine.call(engine.auth.actor(disp.id), 'listNotifications', {}).some((x) => x.type === 'lockout'));
  // a new PIN lifts the lock and the counter starts again
  const { pin } = engine.call(admin, 'resetSecret', { id: drv.id });
  assert.equal(engine.auth.driverLogin({ code: tenant.code, phone: '1001', pin }).id, drv.id);
  assert.equal(store.get('users', drv.id).failedLogins, 0);
});

test('sec-20: method names from Object.prototype are unknown actions', () => {
  const { engine, mkTenant } = setup();
  const { admin } = mkTenant('Kaya');
  for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) assert.equal(code(() => engine.call(admin, name, {})), 'not_found', name);
});

test('C1/drv-7: a repeated _op returns the first result instead of writing twice', () => {
  const { engine, store, mkTenant, mkDriver, tick } = setup();
  const { admin } = mkTenant('Kaya');
  const drv = mkDriver(admin, 'Anna', '0151 1000001').user;
  const d = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Köln' }, driverId: drv.id });
  const r1 = engine.call(drv, 'addNote', { id: d.id, text: 'Warte an der Rampe 7', _op: 'op-1' });
  const r2 = engine.call(drv, 'addNote', { id: d.id, text: 'Warte an der Rampe 7', _op: 'op-1' });
  assert.deepEqual(r2, JSON.parse(JSON.stringify(r1)));
  assert.equal(engine.call(admin, 'getDelivery', { id: d.id }).notes.length, 1, 'one note for one tap');
  assert.equal(store.get('ops', drv.id + ':op-1').method, 'addNote');
  // errors are not stored: the same _op can succeed later
  assert.equal(code(() => engine.call(drv, 'addNote', { id: d.id, text: '', _op: 'op-2' })), 'invalid');
  assert.equal(store.get('ops', drv.id + ':op-2'), null);
  // another user's _op is separate; secrets (PIN) are never stored
  engine.call(admin, 'addNote', { id: d.id, text: 'Ok', _op: 'op-1' });
  assert.equal(engine.call(admin, 'getDelivery', { id: d.id }).notes.length, 2);
  engine.call(admin, 'resetSecret', { id: drv.id, _op: 'op-3' });
  assert.equal(store.get('ops', admin.id + ':op-3'), null);
  // kept 7 days, then purged
  tick(8 * 864e5);
  engine.purgeExpired();
  assert.equal(store.find('ops', {}).length, 0);
});

test('C9/sec-9: storage quota of the plan, warnings at 80 % and 100 %', () => {
  const { engine, store, mkTenant, mkDriver } = setup();
  const { tenant, admin } = mkTenant('Klein', 'start', { trialDays: 0 });
  const drv = mkDriver(admin, 'Anna', '0151 1000001').user;
  const limit = PLANS.start.storageGB * 2 ** 30;
  assert.equal(engine.call(admin, 'me', {}).license.storageLimit, limit);
  store.put('tenants', { ...store.get('tenants', tenant.id), storageUsed: Math.floor(limit * 0.8) - 1000 });
  engine.call(drv, 'createFile', { kind: 'other', mime: 'image/jpeg', size: 5000 });
  assert.equal(engine.call(admin, 'listNotifications', {}).filter((n) => n.type === 'storage80').length, 1);
  engine.call(drv, 'createFile', { kind: 'other', mime: 'image/jpeg', size: 5000 });
  assert.equal(engine.call(admin, 'listNotifications', {}).filter((n) => n.type === 'storage80').length, 1, 'only once');
  store.put('tenants', { ...store.get('tenants', tenant.id), storageUsed: limit - 1000 });
  const e = err(() => engine.call(drv, 'createFile', { kind: 'pod', mime: 'image/jpeg', size: 5000 }));
  assert.equal(e.code, 'quota');
  assert.equal(e.status, 413);
  assert.equal(engine.call(admin, 'listNotifications', {})[0].type, 'storage100', 'admin told although the upload was refused');
  assert.equal(store.get('tenants', tenant.id).storageUsed, limit - 1000, 'refused upload is not counted');
  const v = engine.call(admin, 'getTenantLicense', {});
  assert.equal(v.storageUsed, limit - 1000);
  assert.equal(v.licenseNote, undefined);
  // the recount in the purge resets the warning below 75 %
  engine.purgeExpired();
  assert.equal(store.get('tenants', tenant.id).storageUsed, 10000);
  assert.equal(store.get('tenants', tenant.id).storageWarn, null);
});

test('C10/sec-10/drv-12: removed and orphan files are dropped with an event for the transport', () => {
  const { engine, store, events, mkTenant, mkDriver, tick } = setup();
  const { tenant, admin } = mkTenant('Kaya');
  const drv = mkDriver(admin, 'Anna', '0151 1000001').user;
  const d = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Köln' }, driverId: drv.id });
  const f = engine.call(drv, 'createFile', { kind: 'damage', mime: 'image/jpeg', size: 4000, deliveryId: d.id });
  const orphan = engine.call(drv, 'createFile', { kind: 'other', mime: 'image/jpeg', size: 3000 });
  const logo = engine.call(admin, 'createFile', { kind: 'logo', mime: 'image/png', size: 2000 });
  engine.call(admin, 'updateCompany', { branding: { logoFileId: logo.id } });
  assert.equal(store.get('tenants', tenant.id).storageUsed, 9000);
  events.length = 0;
  engine.call(drv, 'removeDoc', { id: d.id, fileId: f.id });
  assert.equal(store.get('files', f.id), null);
  assert.deepEqual(events.filter((e) => e.type === 'fileRemoved'), [{ type: 'fileRemoved', tenantId: tenant.id, fileId: f.id }]);
  assert.equal(store.get('tenants', tenant.id).storageUsed, 5000);
  assert.ok(!engine.purgeExpired().includes(orphan.id), 'orphans get 24 hours');
  tick(25 * 3600e3);
  assert.deepEqual(engine.purgeExpired(), [orphan.id]);
  assert.ok(store.get('files', logo.id), 'the logo in use stays');
  assert.equal(store.get('tenants', tenant.id).storageUsed, 2000);
});

test('lic-8: licensor-only fields never reach the customer', () => {
  const { engine, platform, mkTenant } = setup();
  const { tenant, admin } = mkTenant('Kaya', 'flotte', { trialDays: 0 });
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, licenseNote: 'INTERN: zahlt schleppend' });
  for (const view of [engine.call(admin, 'me', {}).tenant, engine.call(admin, 'exportData', {}).company]) {
    for (const k of ['licenseNote', 'createdBy', 'history', 'statusAt', 'apiKeyHash']) assert.equal(view[k], undefined, k);
  }
  assert.ok(!JSON.stringify(engine.call(admin, 'exportData', {})).includes('schleppend'));
  assert.equal(engine.call(platform, 'getTenantLicense', { id: tenant.id }).licenseNote, 'INTERN: zahlt schleppend');
});

test('C12: API keys are stored hashed with a hint; old plain keys are migrated', () => {
  const { engine, store, mkTenant } = setup({ digest: (s) => crypto.createHash('sha256').update(s).digest('hex') });
  const { tenant, admin } = mkTenant('Prem AG', 'premium');
  const { apiKey } = engine.call(admin, 'rotateApiKey', {});
  const t = store.get('tenants', tenant.id);
  assert.equal(t.apiKey, undefined);
  assert.equal(t.apiKeyHash, sha256(apiKey));
  const me = engine.call(admin, 'me', {}).tenant;
  assert.equal(me.apiKeyHint, apiKey.slice(-4));
  assert.ok(me.apiKeySet);
  assert.ok(!JSON.stringify(me).includes(apiKey));
  assert.equal(engine.apiActor(apiKey).tenantId, tenant.id);
  store.put('tenants', { ...store.get('tenants', tenant.id), apiKeyHash: null, apiKey: 'lk_legacy-key-123' });
  assert.equal(engine.apiActor('lk_legacy-key-123').tenantId, tenant.id);
  assert.equal(store.get('tenants', tenant.id).apiKey, undefined, 'plain key replaced by its hash');
  assert.ok(engine.apiActor('lk_legacy-key-123'));
});

test('C11: driver invite links are tokens, valid 14 days and single use', () => {
  const { engine, store, mkTenant, mkDriver, tick } = setup();
  const { admin } = mkTenant('Kaya');
  const r = mkDriver(admin, 'Anna Fahrer', '0151 1000001');
  assert.match(r.invite.token, /^[A-Za-z0-9_-]{24}$/);
  assert.equal(r.user.inviteToken, undefined, 'never listed');
  assert.equal(engine.auth.inviteInfo(r.user.id), null, 'old /i/<userId> links do not work');
  const info = engine.auth.inviteInfo(r.invite.token);
  assert.equal(info.name, 'Anna');
  assert.equal(info.tenant.code, 'KAYA');
  assert.equal(info.userId, undefined);
  assert.equal(code(() => engine.auth.inviteLogin({ token: r.invite.token, pin: '000000' })), 'bad_login');
  assert.equal(engine.auth.inviteLogin({ token: r.invite.token, pin: '424242' }).id, r.user.id);
  assert.equal(engine.auth.inviteInfo(r.invite.token), null, 'used once');
  assert.equal(code(() => engine.auth.inviteLogin({ token: r.invite.token, pin: '424242' })), 'bad_login');
  const again = engine.call(admin, 'resetSecret', { id: r.user.id });
  assert.ok(engine.auth.inviteInfo(again.invite.token));
  tick(15 * 864e5);
  assert.equal(engine.auth.inviteInfo(again.invite.token), null, 'expired');
  assert.ok(store.get('users', r.user.id).inviteExpires);
});

test('C13: two-factor login with TOTP, recovery by the licensor and the CLI', () => {
  const { engine, store, platform, mkTenant, now, tick } = setup();
  const { tenant, admin } = mkTenant('Kaya');
  assert.equal(engine.call(admin, 'me', {}).twoFactor, false);
  const { secret, otpauthUrl } = engine.call(admin, 'twoFactorSetup', {});
  assert.match(otpauthUrl, /^otpauth:\/\/totp\/Kaya:kaya%40firma\.de\?secret=[A-Z2-7]+&issuer=Kaya/);
  assert.equal(code(() => engine.call(admin, 'twoFactorEnable', { code: '000000' })), 'invalid');
  engine.call(admin, 'twoFactorEnable', { code: totp(secret, now()) });
  assert.equal(engine.call(admin, 'me', {}).twoFactor, true);
  assert.equal(store.get('users', admin.id).twoFactorSecret, secret);
  assert.equal(engine.call(admin, 'me', {}).user.twoFactorSecret, undefined);
  const login = (c) => engine.auth.login({ email: 'kaya@firma.de', password: 'adminpasswort1', code: c });
  assert.equal(code(() => login()), 'need_2fa');
  assert.equal(store.get('users', admin.id).failedLogins || 0, 0, 'asking for the code is no failed attempt');
  const bad = ['111111', '222222', '333333'].find((c) => !verify(secret, c, now()));
  assert.equal(code(() => login(bad)), 'need_2fa');
  assert.equal(store.get('users', admin.id).failedLogins, 1, 'a wrong code counts');
  assert.equal(code(() => login(totp(secret, now()))), 'need_2fa', 'the code used for enabling cannot be replayed');
  tick(30e3); // next time step: a fresh code works
  assert.equal(login(totp(secret, now())).id, admin.id);
  assert.equal(store.get('users', admin.id).failedLogins, 0);
  assert.equal(code(() => engine.call(admin, 'twoFactorDisable', { password: 'falsch' })), 'bad_login');
  assert.equal(engine.call(admin, 'twoFactorDisable', { password: 'adminpasswort1' }).twoFactor, false);
  engine.call(admin, 'twoFactorEnable', { code: totp(engine.call(admin, 'twoFactorSetup', {}).secret, now()) });
  // the licensor's reset switches it off for a locked-out admin
  engine.call(platform, 'resetTenantAdmin', { id: tenant.id });
  assert.equal(store.get('users', admin.id).twoFactorSecret, null);
  // licensor 2FA, then the CLI recovery
  const ps = engine.call(platform, 'twoFactorSetup', {}).secret;
  engine.call(platform, 'twoFactorEnable', { code: totp(ps, now()) });
  assert.equal(code(() => engine.auth.login({ email: 'chef@ladeklar.de', password: 'sehrgeheim123' })), 'need_2fa');
  assert.equal(code(() => engine.call(platform, 'resetPlatformPassword', {})), 'not_found', 'not callable through call()');
  engine.resetPlatformPassword({ email: 'chef@ladeklar.de', password: 'ganz-neues-pw-1' });
  assert.equal(engine.auth.login({ email: 'chef@ladeklar.de', password: 'ganz-neues-pw-1' }).role, 'platform');
  assert.equal(code(() => engine.resetPlatformPassword({ email: 'kaya@firma.de', password: 'ganz-neues-pw-1' })), 'not_found');
});

test('usr-1: phone notations normalise alike; usr-2: personal numbers are unique', () => {
  for (const p of ['+49 (0)176 1000 0004', '0049 (0) 176 10000004', '0049 0176 10000004', '+49 176 1000 0004', '0176 1000 0004']) assert.equal(normPhone(p), '+4917610000004', p);
  assert.equal(normPhone('+43 (0)664 1234567'), '+436641234567');
  assert.equal(normPhone('+39 06 1234567'), '+39061234567', 'Italy keeps its zero');
  const { engine, store, mkTenant, mkDriver } = setup();
  const { tenant, admin } = mkTenant('Kaya');
  const a = mkDriver(admin, 'Sven', '+49 (0)176 1000 0004', { personalNo: '1001' }).user;
  for (const p of ['0176 1000 0004', '+49 176 10000004', '0049 176 10000004']) assert.equal(engine.auth.driverLogin({ code: tenant.code, phone: p, pin: '424242' }).id, a.id, p);
  assert.equal(code(() => mkDriver(admin, 'Sven 2', '0176 1000 0004')), 'conflict');
  assert.equal(code(() => mkDriver(admin, 'Piotr', '0176 2000 0000', { personalNo: '1001' })), 'conflict');
  const b = mkDriver(admin, 'Piotr', '0176 2000 0000', { personalNo: '1002' }).user;
  assert.equal(code(() => engine.call(admin, 'updateUser', { id: b.id, personalNo: '1001' })), 'conflict');
  assert.equal(engine.call(admin, 'updateUser', { id: b.id, personalNo: '1002', phone: '0176 2000 0000' }).personalNo, '1002', 'own values are fine');
  // a record stored with the old normalisation still signs in and still counts as taken
  store.put('users', { ...store.get('users', a.id), phone: '+49017610000004' });
  assert.equal(engine.auth.driverLogin({ code: tenant.code, phone: '0176 1000 0004', pin: '424242' }).id, a.id);
  assert.equal(code(() => engine.call(admin, 'updateUser', { id: b.id, phone: '+49 176 10000004' })), 'conflict');
});

test('lic-9/plan-1/C15: smaller plans must fit unless forced; own domains go with Premium', () => {
  const { engine, store, platform, mkTenant, mkDriver } = setup();
  const { tenant, admin } = mkTenant('Prem AG', 'premium', { trialDays: 0 });
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, domains: 'fahrer.prem.de' });
  for (let i = 0; i < 4; i++) mkDriver(admin, 'Fahrer ' + i, '0151 100000' + i);
  for (let i = 0; i < 7; i++) engine.call(admin, 'createVehicle', { plate: 'S-P ' + (100 + i) });
  engine.call(admin, 'requestPlanChange', { plan: 'start', note: 'Wir werden kleiner.' });
  const e = err(() => engine.call(platform, 'updateTenantLicense', { id: tenant.id, plan: 'start' }));
  assert.equal(e.code, 'over_limit');
  assert.match(e.message, /^Der neue Tarif ist zu klein: 4 Fahrer \(erlaubt 3\), 7 Fahrzeuge \(erlaubt 6\)/);
  assert.deepEqual(e.details.limits, { drivers: 3, vehicles: 6, staff: 2 });
  assert.equal(store.get('tenants', tenant.id).plan, 'premium');
  const v = engine.call(platform, 'updateTenantLicense', { id: tenant.id, plan: 'flotte' });
  assert.deepEqual(v.domains, [], 'a downgrade frees the own domain');
  assert.equal(v.domain, 'subdomain');
  assert.equal(v.planRequest, null, 'a plan change answers the request');
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, plan: 'start', force: true });
  assert.equal(code(() => mkDriver(admin, 'Noch einer', '0151 2000000')), 'seat_limit');
  assert.equal(code(() => engine.call(admin, 'createVehicle', { plate: 'S-P 200' })), 'seat_limit');
});

test('lic-12: activation with an expired licence end fails clearly; trial extension only for trials', () => {
  const { engine, platform, mkTenant, set } = setup({ start: Date.parse('2026-10-01T08:00:00Z') });
  const paid = mkTenant('Bauer', 'start', { trialDays: 0 });
  engine.call(platform, 'updateTenantLicense', { id: paid.tenant.id, licenseEnd: '2026-10-15' });
  set('2026-10-16T08:00:00Z');
  const e = err(() => engine.call(platform, 'updateTenantLicense', { id: paid.tenant.id, status: 'active' }));
  assert.equal(e.code, 'invalid');
  assert.deepEqual(e.details.fields, ['licenseEnd']);
  assert.equal(engine.call(platform, 'updateTenantLicense', { id: paid.tenant.id, status: 'active', licenseEnd: '2027-10-15' }).state, 'active');
  assert.equal(code(() => engine.call(platform, 'updateTenantLicense', { id: paid.tenant.id, status: 'trial', extendTrialDays: 14 })), 'invalid');
  assert.equal(code(() => engine.call(platform, 'updateTenantLicense', { id: paid.tenant.id, extendTrialDays: 14 })), 'invalid');
  const trial = mkTenant('Nord', 'start', { trialDays: 30 });
  engine.call(platform, 'updateTenantLicense', { id: trial.tenant.id, status: 'suspended' });
  assert.equal(engine.call(platform, 'updateTenantLicense', { id: trial.tenant.id, status: 'trial', extendTrialDays: 14 }).state, 'trial', 'a suspended trial can go back to trial');
});

test('C14/lic-10/lic-11: invoices follow the licence history', () => {
  const { engine, platform, mkTenant, set } = setup({ start: Date.parse('2026-10-16T08:00:00Z') });
  const run = (m) => engine.call(platform, 'billingRun', { month: m });
  const bill = (m, c) => run(m).lines.find((l) => l.code === c) || null;
  // lic-10: a yearly licence ending the day before its renewal is not renewed
  const y = mkTenant('Jahr', 'flotte', { trialDays: 0, billing: 'yearly' });
  engine.call(platform, 'updateTenantLicense', { id: y.tenant.id, licenseEnd: '2027-10-15' });
  // lic-11 a: monthly → yearly in February 2027; b: yearly → monthly in December 2026
  const a = mkTenant('Wechsel', 'flotte', { trialDays: 0 });
  const b = mkTenant('Rueck', 'flotte', { trialDays: 0, billing: 'yearly' });
  const tr = mkTenant('Probe', 'premium', { trialDays: 30, storeApp: true });
  set('2026-12-10T08:00:00Z');
  engine.call(platform, 'updateTenantLicense', { id: b.tenant.id, billing: 'monthly' });
  set('2027-01-05T08:00:00Z');
  engine.call(platform, 'updateTenantLicense', { id: tr.tenant.id, status: 'active' });
  set('2027-02-10T08:00:00Z');
  engine.call(platform, 'updateTenantLicense', { id: a.tenant.id, billing: 'yearly' });
  assert.equal(bill('2026-10', 'JAHR').net, 1290);
  assert.equal(bill('2027-10', 'JAHR'), null, 'no renewal for a contract that ends');
  assert.deepEqual(['2026-11', '2027-01', '2027-02', '2027-03', '2027-09', '2028-01', '2028-02'].map((m) => bill(m, 'WECHSEL')?.net ?? 0), [129, 129, 1290, 0, 0, 0, 1290]);
  assert.equal(bill('2027-02', 'WECHSEL').reason, 'Jahresbeitrag – Wechsel auf jährliche Zahlung');
  assert.equal(bill('2027-02', 'WECHSEL').period, '02/2027 – 01/2028');
  assert.equal(bill('2028-02', 'WECHSEL').reason, 'Jahresbeitrag – Verlängerung');
  assert.deepEqual(['2026-10', '2026-11', '2026-12', '2027-09', '2027-10', '2027-11'].map((m) => bill(m, 'RUECK')?.net ?? 0), [1290, 0, 0, 0, 129, 129], 'monthly only after the paid year');
  // trial days are never billed; the store-app set-up comes once, with the first paid month
  assert.equal(bill('2026-11', 'PROBE'), null);
  const first = bill('2027-01', 'PROBE');
  assert.equal(first.net, 299 + 99 + 1990);
  assert.ok(first.items.some((i) => i.once && i.unit === 1990));
  assert.equal(bill('2027-02', 'PROBE').net, 299 + 99);
  // the plan in effect at the end of the month counts; a suspension keeps billing, the cancellation month is the last
  set('2027-03-20T08:00:00Z');
  engine.call(platform, 'updateTenantLicense', { id: b.tenant.id, plan: 'premium' });
  set('2027-11-05T08:00:00Z');
  engine.call(platform, 'updateTenantLicense', { id: b.tenant.id, status: 'suspended' });
  set('2027-12-05T08:00:00Z');
  engine.call(platform, 'updateTenantLicense', { id: b.tenant.id, status: 'cancelled' });
  assert.equal(bill('2027-10', 'RUECK').net, 299);
  assert.equal(bill('2027-11', 'RUECK').reason, 'Monatsbeitrag – läuft während der Sperre weiter');
  assert.ok(bill('2027-12', 'RUECK'), 'the cancellation month is billed');
  assert.equal(bill('2028-01', 'RUECK'), null);
  const r = run('2027-01');
  assert.match(r.rules, /AGB § 14 Abs\. 4/);
  assert.equal(r.gross, Math.round(r.lines.reduce((s, l) => s + l.gross, 0) * 100) / 100);
  assert.ok(engine.call(platform, 'listTenants', {}).length && !('history' in engine.call(platform, 'listTenants', {})[0]));
});

test('C16: customer requests reach the licensor; C18: export downloads are logged', () => {
  const { engine, store, platform, mkTenant } = setup();
  const { tenant, admin } = mkTenant('Kaya', 'flotte', { trialDays: 0 });
  assert.equal(code(() => engine.call(admin, 'requestPlanChange', { plan: 'gold' })), 'invalid');
  engine.call(admin, 'requestPlanChange', { plan: 'premium', note: 'Wir brauchen die API.' });
  engine.call(admin, 'requestCancellation', { reason: 'Betrieb wird eingestellt' });
  const n = engine.call(platform, 'listNotifications', {});
  assert.deepEqual(n.map((x) => x.type).sort(), ['cancelRequest', 'planRequest']);
  assert.equal(n.find((x) => x.type === 'cancelRequest').title, 'Kündigungswunsch: Kaya');
  assert.match(n.find((x) => x.type === 'planRequest').body, /Tarif Premium wechseln\. Wir brauchen die API\./);
  const v = engine.call(platform, 'listTenants', {}).find((x) => x.id === tenant.id);
  assert.equal(v.planRequest.plan, 'premium');
  assert.ok(v.cancelRequestedAt);
  assert.equal(v.cancelReason, 'Betrieb wird eingestellt');
  assert.ok(engine.call(admin, 'auditLog', {}).some((e) => e.action === 'tenant.cancel_request'));
  engine.call(platform, 'updateTenantLicense', { id: tenant.id, status: 'cancelled' });
  assert.equal(store.get('tenants', tenant.id).cancelRequestedAt, null, 'answered by the cancellation');
  assert.equal(code(() => engine.call(admin, 'requestCancellation', {})), 'license_inactive');
  // C18 (also after the cancellation: the admin exports the data)
  engine.call(admin, 'logExport', { kind: 'zip' });
  assert.ok(engine.call(admin, 'auditLog', {}).some((e) => e.action === 'export.zip'));
  assert.equal(code(() => engine.call(admin, 'logExport', { kind: 'exe' })), 'invalid');
});

test('deleting a driver with a loaded tour says what to do', () => {
  const { engine, mkTenant, mkDriver } = setup();
  const { admin } = mkTenant('Kaya');
  const drv = mkDriver(admin, 'Anna', '0151 1000001').user;
  const d = engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: '2026-10-16' }, dropoff: { city: 'Köln' }, driverId: drv.id });
  engine.call(drv, 'acceptDelivery', { id: d.id });
  engine.call(drv, 'advanceDelivery', { id: d.id, step: 'loaded' });
  assert.match(err(() => engine.call(admin, 'deleteUser', { id: drv.id })).message, /erst abschließen oder stornieren/);
});
