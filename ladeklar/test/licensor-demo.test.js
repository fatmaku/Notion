// Licensor console (platform.js) and the demo transport (api-local.js), fix round 2: in-page
// confirmations, licence-end/trial actions, storage, billing view + demo CSV, plan downgrade with
// over_limit/force, customer requests, 2FA, demo links, demo re-seeding. Browser pieces are stand-ins.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, berlinDate, PLANS } from '../core/engine.js';
import { createMemStore } from '../core/memstore.js';
import { totp } from '../core/totp.js';
import { sha256 } from '../core/sha256.js';

function memStorage() {
  const s = {};
  Object.defineProperties(s, {
    getItem: { value: (k) => (Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null) },
    setItem: { value: (k, v) => { s[k] = String(v); } },
    removeItem: { value: (k) => { delete s[k]; } },
  });
  return s;
}
const saved = [], posted = [];
const local = memStorage(), session = memStorage();
globalThis.window = { localStorage: local, sessionStorage: session, claude: { use: async (cap) => (cap === 'downloads' ? { save: async (x) => { saved.push(x); } } : null) } };
globalThis.location = { href: 'https://demo.test/ladeklar/demo.html#impressum', origin: 'https://demo.test' };
globalThis.BroadcastChannel = class { postMessage(m) { posted.push(m); } };
const platform = await import('../web/js/views/platform.js');
const { createDemoWorld } = await import('../web/js/api-local.js');
const { setLang } = await import('../web/js/i18n.js');
setLang('de');

function setup() {
  let seq = 0;
  const store = createMemStore();
  const engine = createEngine({ store, newId: () => 'id' + (++seq).toString(36).padStart(5, '0'), hash: { make: (s) => 'h$' + s, verify: (s, h) => h === 'h$' + s } });
  const lic = engine.setupPlatform({ email: 'chef@ladeklar.de', password: 'sehrgeheim123', name: 'Plattform' });
  const mkTenant = (name, plan = 'flotte', extra = {}) => {
    const r = engine.call(lic, 'createTenant', { name, plan, trialDays: 0, adminEmail: name.toLowerCase().replace(/\W/g, '') + '@firma.de', adminPassword: 'adminpasswort1', ...extra });
    return { tenant: r.tenant, admin: engine.auth.login({ email: r.admin.email, password: 'adminpasswort1' }) };
  };
  return { engine, store, lic, mkTenant };
}

/** A licensor app like app.js builds it, talking to the engine directly (as api-local.js does). */
async function consoleApp(engine, actor, { mode = 'demo' } = {}) {
  const toasts = [], calls = [];
  const call = async (m, a = {}) => { calls.push({ m, a }); return JSON.parse(JSON.stringify(engine.call(actor, m, a) ?? null)); };
  const app = {
    me: await call('me'), data: {}, ui: {}, route: { name: 'overview', params: {} }, lang: 'de',
    api: { mode, call, exportUrl: (k, q) => `/api/export/${k}.csv${q}`, tenantLink: (c) => `https://lk.test/t/${c}`, fileUrl: () => '' },
    fileUrl: () => '', invalidate() {}, render() {}, refresh() {},
    load: async () => platform.load(app), toast: (x) => toasts.push(x), error: (e) => toasts.push({ title: e.message, err: true }),
    open(s) { this.ui.sheet = s; }, close() { this.ui.sheet = null; },
  };
  app.call = async (m, a, o = {}) => { try { return (await call(m, a)) ?? {}; } catch (e) { if (!o.quiet) app.error(e); throw e; } };
  await app.load();
  return { app, toasts, calls };
}
const fdOf = (o) => { const fd = new FormData(); for (const [k, v] of Object.entries(o)) if (v !== undefined) fd.append(k, v); return fd; };
const html = (app) => platform.render(app).replace(/ /g, ' ');
const el = (dataset = {}) => ({ dataset });
async function openTenant(app, id) { platform.actions.openTenant(el({ id }), null, app); await platform.refreshSheet(app); }
const licenseFd = (x, patch = {}) => fdOf({ plan: x.plan, extraDrivers: String(x.extraDrivers), billing: x.billing, licenseEnd: '', licenseNote: '', ...patch });
const yesterday = () => berlinDate(Date.now() - 864e5);

// ---------- lic-4: phone layout hooks ----------
test('console topbar CTA keeps its accessible name; the tab bar uses the short label and keeps Konto', async () => {
  const E = setup();
  const { app } = await consoleApp(E.engine, E.lic);
  const h = html(app);
  assert.match(h, /class="btn btn-primary topcta" data-act="newTenant" aria-label="Lizenznehmer anlegen"/);
  const tabbar = h.slice(h.indexOf('<nav class="tabbar">'));
  assert.match(tabbar, /data-to="tenants"[^>]*>.*?Kunden/);
  assert.match(tabbar, /data-act="openAccount">.*?Konto/);
});

// ---------- lic-12: licence end and trial actions ----------
test('"Aktivieren" with an expired licence end asks for a new end and then activates; "Test +14 Tage" only for trials', async () => {
  const E = setup();
  const paid = E.mkTenant('Bauer Bau', 'start');
  const trial = E.mkTenant('Nord Licht', 'start', { trialDays: 30 });
  E.engine.call(E.lic, 'updateTenantLicense', { id: paid.tenant.id, licenseEnd: yesterday() });
  const { app, calls } = await consoleApp(E.engine, E.lic);
  await openTenant(app, paid.tenant.id);
  assert.equal(app.data.tenant.state, 'expired');
  let h = html(app);
  assert.ok(h.includes('data-act="setStatus" data-s="active"'));
  assert.ok(!h.includes('data-act="extendTrial"'), 'a paid licence is not offered a test phase');
  const before = calls.length;
  platform.actions.setStatus(el({ s: 'active' }), null, app);
  assert.equal(calls.length, before, 'no call before the new end is chosen');
  assert.equal(app.ui.ask.kind, 'activate');
  h = html(app);
  assert.match(h, /data-form="activate"/);
  assert.match(h, /Die Laufzeit endete am/);
  const end = berlinDate(Date.now() + 200 * 864e5);
  await platform.forms.activate(fdOf({ licenseEnd: end }), null, app);
  assert.equal(app.data.tenant.state, 'active');
  assert.equal(berlinDate(app.data.tenant.licenseEnd), end);
  assert.equal(app.ui.ask, null);
  // empty end = open-ended
  E.engine.call(E.lic, 'updateTenantLicense', { id: paid.tenant.id, licenseEnd: yesterday() });
  await platform.refreshSheet(app);
  await platform.forms.activate(fdOf({ licenseEnd: '' }), null, app);
  assert.equal(app.data.tenant.licenseEnd, null);
  assert.equal(app.data.tenant.state, 'active');
  // trials (also suspended ones) get "Test +14 Tage"
  await openTenant(app, trial.tenant.id);
  assert.ok(html(app).includes('data-act="extendTrial"'));
  E.engine.call(E.lic, 'updateTenantLicense', { id: trial.tenant.id, status: 'suspended' });
  await platform.refreshSheet(app);
  assert.ok(html(app).includes('data-act="extendTrial"'), 'a suspended trial can be extended again');
  await platform.actions.extendTrial(el(), null, app);
  assert.equal(app.data.tenant.state, 'trial');
});

// ---------- lic-13: in-page confirmations ----------
test('Sperren, Kündigen and Admin-Passwort zurücksetzen act only after the in-page confirmation', async () => {
  const E = setup();
  const k = E.mkTenant('Kaya Logistik');
  const { app, calls } = await consoleApp(E.engine, E.lic);
  await openTenant(app, k.tenant.id);
  for (const s of ['suspended', 'cancelled']) {
    const n = calls.length;
    platform.actions.setStatus(el({ s }), null, app);
    assert.equal(calls.length, n);
    assert.equal(app.ui.ask.kind, s);
    assert.match(html(app), new RegExp(`data-key="ask-${s}"`));
    platform.actions.askCancel(el(), null, app);
    assert.equal(app.ui.ask, null);
    assert.equal(E.engine.call(E.lic, 'getTenantLicense', { id: k.tenant.id }).state, 'active');
  }
  platform.actions.setStatus(el({ s: 'suspended' }), null, app);
  await platform.actions.askOk(el(), null, app);
  assert.equal(app.data.tenant.state, 'suspended');
  const pwBefore = E.store.get('users', k.admin.id).passwordHash;
  platform.actions.resetAdmin(el(), null, app);
  assert.equal(app.ui.ask.kind, 'resetAdmin');
  assert.match(html(app), /Das bisherige Passwort gilt sofort nicht mehr/);
  assert.equal(E.store.get('users', k.admin.id).passwordHash, pwBefore);
  await platform.actions.askOk(el(), null, app);
  assert.equal(app.ui.sheet.type, 'adminReset');
  assert.notEqual(E.store.get('users', k.admin.id).passwordHash, pwBefore);
  // a confirmation of another customer is never carried over
  platform.actions.backToTenant(el(), null, app);
  platform.actions.setStatus(el({ s: 'cancelled' }), null, app);
  const other = E.mkTenant('Andere Firma');
  await openTenant(app, other.tenant.id);
  assert.equal(app.ui.ask, null);
});

// ---------- C9 storage ----------
test('storage used / limit is shown per customer in the list and on the customer page', async () => {
  const E = setup();
  const k = E.mkTenant('Kaya Logistik', 'start');
  E.engine.call(k.admin, 'createFile', { kind: 'logo', mime: 'image/png', size: 3 * 1024 * 1024, name: 'logo.png' });
  const { app } = await consoleApp(E.engine, E.lic);
  app.route = { name: 'tenants', params: {} };
  assert.match(html(app), /3 MB \/ 5 GB/);
  await openTenant(app, k.tenant.id);
  assert.match(html(app), /data-key="storage".*3 MB \/ 5 GB · 0 %/s);
});

// ---------- C14 billing ----------
test('billing: 25 months (12 back, 12 ahead), reason per row, rules text, server CSV link vs. demo CSV download', async () => {
  const months = platform.billingMonths(Date.UTC(2026, 9, 17, 12));
  assert.equal(months.length, 25);
  assert.deepEqual([months[0], months[12], months[24]], ['2027-10', '2026-10', '2025-10']);
  const E = setup();
  E.mkTenant('Kaya Logistik');
  const { app } = await consoleApp(E.engine, E.lic);
  app.route = { name: 'billing', params: {} };
  await app.load();
  const b = app.data.billing;
  assert.ok(b.lines.length >= 1 && b.lines[0].reason);
  let h = html(app);
  assert.ok(h.includes(`<div class="xs muted">${b.lines[0].reason}</div>`), 'reason under the period');
  assert.equal((h.match(/<li>/g) || []).length >= b.rules.split('\n').length, true);
  assert.match(h, /class="bill-rules"/);
  assert.ok(!h.includes('Testphasen, gesperrte und gekündigte Kunden'), 'the old, wrong rule text is gone');
  assert.match(h, /data-act="billingCsv"/);
  saved.length = 0;
  await platform.actions.billingCsv(el(), null, app);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].filename, `abrechnung-${b.month}.csv`);
  assert.ok(saved[0].data.startsWith('﻿Monat;Kunde;Code;Zahlweise;Positionen;Netto €;USt 19 % €;Brutto €;Grund'));
  assert.ok(saved[0].data.includes(';' + b.lines[0].reason));
  app.api.mode = 'http';
  h = html(app);
  assert.match(h, /href="\/api\/export\/billing\.csv\?month=\d{4}-\d{2}" download/);
});

// ---------- C15 downgrade ----------
test('a smaller plan is confirmed first; over_limit shows the numbers and "Trotzdem ändern" sends force', async () => {
  const E = setup();
  const k = E.mkTenant('Kaya Logistik', 'flotte');
  for (let i = 0; i < 4; i++) E.engine.call(k.admin, 'createUser', { role: 'driver', name: 'Fahrer ' + i, phone: '0176 100000' + i, pin: '424242' });
  const { app, calls } = await consoleApp(E.engine, E.lic);
  await openTenant(app, k.tenant.id);
  const n = calls.length;
  await platform.forms.license(licenseFd(app.data.tenant, { plan: 'start' }), null, app);
  assert.equal(calls.length, n, 'nothing sent before the confirmation');
  assert.equal(app.ui.ask.kind, 'downgrade');
  assert.match(html(app), /Tarif auf Start verkleinern\?.*3 Fahrer, 6 Fahrzeuge, 5 GB Speicher/s);
  await platform.actions.askOk(el(), null, app);
  assert.equal(app.ui.ask.kind, 'force');
  assert.equal(app.data.tenant.plan, 'flotte');
  assert.match(html(app), /Fahrer: 4 in Nutzung, erlaubt 3/);
  const updates = () => calls.filter((c) => c.m === 'updateTenantLicense');
  assert.ok(!updates().at(-1).a.force);
  await platform.actions.askOk(el(), null, app);
  assert.equal(updates().at(-1).a.force, true);
  assert.equal(app.data.tenant.plan, 'start');
  assert.equal(app.ui.ask, null);
  // an upgrade needs no confirmation
  await platform.forms.license(licenseFd(app.data.tenant, { plan: 'premium' }), null, app);
  assert.equal(app.data.tenant.plan, 'premium');
});

// ---------- C16 customer requests ----------
test('cancellation and plan requests: badge, filter, overview card, and the console acts on them', async () => {
  const E = setup();
  const k = E.mkTenant('Kaya Logistik', 'start');
  const n = E.mkTenant('Nord Licht', 'flotte');
  E.engine.call(k.admin, 'requestPlanChange', { plan: 'flotte', note: 'Wir wachsen' });
  E.engine.call(n.admin, 'requestCancellation', { reason: 'Betrieb wird eingestellt' });
  const { app } = await consoleApp(E.engine, E.lic);
  let h = html(app);
  assert.match(h, /Offene Anfragen von Kunden/);
  assert.match(h, /<span class="count bad"[^>]*>2<\/span>/);
  assert.match(h, /<span class="dot">2<\/span>/);
  app.route = { name: 'tenants', params: {} };
  h = html(app);
  assert.match(h, /data-k="requests" aria-pressed="false">Anfragen<span class="count">2<\/span>/);
  assert.match(h, /Kündigungswunsch/);
  assert.match(h, /Tarifwunsch: Flotte/);
  platform.actions.tfilter(el({ k: 'requests' }), null, app);
  assert.equal((html(app).match(/data-act="openTenant"/g) || []).length, 2);
  // plan request: one tap takes it over (an upgrade, no confirmation) and clears it
  await openTenant(app, k.tenant.id);
  assert.match(html(app), /Wir wachsen/);
  await platform.actions.applyPlanRequest(el(), null, app);
  assert.equal(app.data.tenant.plan, 'flotte');
  assert.equal(app.data.tenant.planRequest, null);
  // cancellation request: "Kündigen" next to the request, confirmed in place
  await openTenant(app, n.tenant.id);
  assert.match(html(app), /Grund: Betrieb wird eingestellt/);
  platform.actions.ask(el({ k: 'cancelled', at: 'req' }), null, app);
  const sh = html(app);
  assert.ok(sh.indexOf('data-key="ask-cancelled"') < sh.indexOf('id="licForm"'), 'confirmation shown at the request');
  await platform.actions.askOk(el(), null, app);
  assert.equal(app.data.tenant.state, 'cancelled');
  assert.equal(app.data.tenant.cancelRequestedAt, null);
  await app.load();
  assert.equal(app.data.tenants.filter((x) => x.cancelRequestedAt || x.planRequest).length, 0);
});

// ---------- C13 two-factor for the licensor ----------
test('2FA: strong hint while off, setup with QR in "Mein Konto", hint gone when on, off again with the password', async () => {
  const E = setup();
  const { app } = await consoleApp(E.engine, E.lic);
  assert.match(html(app), /banner bad tfa-hint/);
  platform.actions.openAccount(el(), null, app);
  assert.match(html(app), /data-act="tfaSetup"/);
  await platform.actions.tfaSetup(el(), null, app);
  assert.match(html(app), /<div class="qr"><svg/);
  await platform.forms.tfaOn(fdOf({ code: totp(app.ui.tfa.secret, Date.now()) }), null, app);
  assert.equal(app.me.user.twoFactor, true);
  assert.equal(E.engine.call(E.lic, 'me', {}).user.twoFactor, true);
  assert.ok(!html(app).includes('tfa-hint'));
  assert.match(html(app), /data-form="tfaOff"/);
  await platform.forms.tfaOff(fdOf({ password: 'sehrgeheim123' }), null, app);
  assert.equal(app.me.user.twoFactor, false);
  assert.match(html(app), /tfa-hint/);
});

// ---------- plan page, created sheet ----------
test('plan page promises Web-Push today, not native APNs/FCM; the created sheet marks demo links', async () => {
  const E = setup();
  const { app } = await consoleApp(E.engine, E.lic);
  app.route = { name: 'plans', params: {} };
  const h = html(app);
  assert.ok(!h.includes('Push über APNs/FCM'));
  assert.match(h, /heute per Web-Push, native Push \(APNs\/FCM\) ist geplant/);
  await platform.forms.tenant(fdOf({ name: 'Testfirma QA GmbH', code: 'TESTQA', adminEmail: 'qa@testfirma.de', plan: 'flotte', trialDays: '30', billing: 'monthly' }), { querySelector: () => ({ placeholder: '' }) }, app);
  assert.equal(app.ui.sheet.type, 'created');
  assert.match(html(app), /https:\/\/lk\.test\/t\/TESTQA<div class="xs muted">Nur in dieser Demo gültig\.<\/div>/);
  app.api.mode = 'http';
  assert.ok(!html(app).includes('Nur in dieser Demo gültig.'));
});

// ---------- demo transport (api-local.js) ----------
test('demo world: seededAt stamp, demo-local links, hashed API keys, invite tokens; demoUsers survives a deleted Kaya', async () => {
  for (const k of Object.keys(local)) local.removeItem(k);
  const w = createDemoWorld();
  assert.equal(w.refreshed, false);
  const snap = JSON.parse(local.getItem('ladeklar.demo.v4'));
  assert.ok(Math.abs(snap.seededAt - Date.now()) < 60e3, 'seededAt written with the first save');
  const api = w.client('main');
  assert.equal(api.tenantLink('KAYA'), 'https://demo.test/ladeklar/demo.html#t/KAYA');
  assert.equal(api.inviteLink('abc'), 'https://demo.test/ladeklar/demo.html#i/abc');
  const u = w.demoUsers();
  assert.ok(u.platform && u.admin && u.mehmet && u.drivers.length >= 3);
  // C12: the demo engine stores the key hashed with the shared SHA-256
  const rmk = w.find('tenants', { code: 'RMK' })[0];
  const rmkAdmin = w.find('users', { tenantId: rmk.id, role: 'admin' })[0];
  api.loginAs(rmkAdmin.id);
  const { apiKey } = await api.call('rotateApiKey', {});
  const t = w.store.get('tenants', rmk.id);
  assert.equal(t.apiKeyHash, sha256(apiKey));
  assert.ok(!t.apiKey);
  // C11: invite tokens are 24 base64url characters
  api.loginAs(u.admin.id);
  const r = await api.call('createUser', { role: 'driver', name: 'Neu Fahrer', phone: '0176 5550199' });
  assert.match(r.invite.token, /^[A-Za-z0-9_-]{24}$/);
  assert.equal((await api.inviteInfo(r.invite.token)).name, 'Neu');
  // the licensor deletes Kaya: demoUsers reports the gap instead of crashing
  api.loginAs(u.platform.id);
  await api.call('updateTenantLicense', { id: u.kaya.id, status: 'cancelled' });
  await api.call('deleteTenant', { id: u.kaya.id, confirmCode: 'KAYA' });
  const g = w.demoUsers();
  assert.equal(g.kaya, null); assert.equal(g.admin, null); assert.equal(g.mehmet, null); assert.deepEqual(g.drivers, []);
  assert.ok(g.platform);
});

test('demo world older than 12 hours (or without seededAt) is seeded again; a younger one is kept', async () => {
  for (const k of Object.keys(local)) local.removeItem(k);
  createDemoWorld();
  const KEY = 'ladeklar.demo.v4';
  const mark = (fn) => { const s = JSON.parse(local.getItem(KEY)); fn(s); local.setItem(KEY, JSON.stringify(s)); };
  // 11 h old, with a visitor's change: kept
  mark((s) => { s.seededAt = Date.now() - 11 * 3600e3; s.tenants[0].name = 'GEÄNDERT'; });
  const kept = createDemoWorld();
  assert.equal(kept.refreshed, false);
  assert.ok(kept.find('tenants', {}).some((x) => x.name === 'GEÄNDERT'));
  // 13 h old: fresh world, stale pane sessions dropped (the mode stays), other tabs told to reload
  mark((s) => { s.seededAt = Date.now() - 13 * 3600e3; });
  session.setItem('lk.demo.main', 'old-user'); session.setItem('lk.demo.mode', 'office');
  posted.length = 0;
  const fresh = createDemoWorld();
  assert.equal(fresh.refreshed, true);
  assert.ok(!fresh.find('tenants', {}).some((x) => x.name === 'GEÄNDERT'));
  assert.equal(fresh.find('users', { role: 'platform' }).length, 1, 'no second licensor from seeding on top');
  assert.ok(Math.abs(JSON.parse(local.getItem(KEY)).seededAt - Date.now()) < 60e3);
  assert.equal(session.getItem('lk.demo.main'), null);
  assert.equal(session.getItem('lk.demo.mode'), 'office');
  assert.ok(posted.some((m) => m.reset));
  // a snapshot from before this change has no seededAt
  mark((s) => { delete s.seededAt; });
  assert.equal(createDemoWorld().refreshed, true);
  assert.ok(PLANS.start); // engine module shared with the demo bundle
});
