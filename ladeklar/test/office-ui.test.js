// Office UI (fix round 2): staff.js forms and pages rendered against the real engine on a memory
// store, plus the Berlin-time helpers in format.js and common.js. Browser pieces are stand-ins.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, berlinDate } from '../core/engine.js';
import { createMemStore } from '../core/memstore.js';
import { totp } from '../core/totp.js';

const saved = [];
globalThis.window = { claude: { use: async () => ({ save: async (x) => { saved.push(x); } }) } };
globalThis.location = { origin: 'https://lk.test' };
const staff = await import('../web/js/views/staff.js');
const fmt = await import('../web/js/format.js');
const common = await import('../web/js/views/common.js');
const { setLang } = await import('../web/js/i18n.js');
setLang('de');

function setup() {
  let t = Date.now(), seq = 0;
  const store = createMemStore();
  const engine = createEngine({ store, now: () => t, newId: () => 'id' + (++seq).toString(36).padStart(5, '0'), hash: { make: (s) => 'h$' + s, verify: (s, h) => h === 'h$' + s } });
  const platform = engine.setupPlatform({ email: 'chef@ladeklar.de', password: 'sehrgeheim123', name: 'Plattform' });
  const mkTenant = (name, plan = 'flotte', extra = {}) => {
    const r = engine.call(platform, 'createTenant', { name, plan, trialDays: 0, adminEmail: name.toLowerCase().replace(/\W/g, '') + '@firma.de', adminPassword: 'adminpasswort1', ...extra });
    return { tenant: r.tenant, admin: engine.auth.login({ email: r.admin.email, password: 'adminpasswort1' }) };
  };
  const mkDriver = (admin, name, phone) => engine.call(admin, 'createUser', { role: 'driver', name, phone, pin: '424242' });
  const driverLogin = (tenant, u) => engine.auth.driverLogin({ code: tenant.code, phone: u.phone, pin: '424242' });
  return { engine, store, platform, mkTenant, mkDriver, driverLogin, set: (ms) => { t = ms; }, now: () => t };
}

/** A staff app like app.js builds it, talking to the engine directly (as api-local.js does). */
async function officeApp(engine, actor, { mode = 'demo', push = null } = {}) {
  const toasts = [], uploads = [], calls = [];
  const call = async (m, a = {}) => { calls.push({ m, a }); return JSON.parse(JSON.stringify(engine.call(actor, m, a) ?? null)); };
  const app = {
    me: await call('me'), data: {}, ui: {}, route: { name: 'live', params: {} }, flash: new Set(), lang: 'de',
    api: { mode, call, push, session: () => call('me'), inviteLink: (tk) => `https://lk.test/i/${tk}`, tenantLink: (c) => `https://lk.test/t/${c}`, exportUrl: () => '#', fileUrl: () => '', upload: async (blob, o) => { uploads.push(o); return { id: 'f1' }; } },
    tenant() { return this.me.tenant; }, role() { return this.me.user.role; }, fileUrl: () => '',
    invalidate() {}, render() {}, load() {}, refresh() {}, toast: (x) => toasts.push(x), error: (e) => toasts.push({ title: e.message, err: true }),
    open(s) { this.ui.sheet = s; }, close() { this.ui.sheet = null; this.ui.form = null; }, go(name) { this.route = { name, params: {} }; },
    root: { querySelector: () => null },
  };
  app.call = async (m, a, o = {}) => { try { return (await call(m, a)) ?? {}; } catch (e) { if (!o.quiet) app.error(e); throw e; } };
  return { app, toasts, uploads, calls };
}
const fdOf = (o) => { const fd = new FormData(); for (const [k, v] of Object.entries(o)) if (v !== undefined) fd.append(k, v); return fd; };
const fakeForm = () => { const marked = []; return { marked, querySelector: (sel) => ({ classList: { add: () => marked.push(sel) } }) }; };
const deliveryForm = (d, patch = {}) => ({ customer: d.customer || '', reference: d.reference || '', 'pickup.city': d.pickup.city, 'pickup.date': d.pickup.date, 'pickup.from': d.pickup.from || '', 'pickup.to': d.pickup.to || '', 'dropoff.city': d.dropoff.city, 'goods.text': '', instructions: '', internalNote: '', ...patch });
const today = () => berlinDate(Date.now());
const html0 = (app) => staff.render(app).replace(/\u00a0/g, ' '); // euro() uses a no-break space

// ---------- office/data-1: retention ----------
test('retention: empty keeps the value, invalid is refused, lowering asks first with the count', async () => {
  const E = setup();
  const { tenant, admin } = E.mkTenant('Kaya Logistik');
  E.engine.call(admin, 'updateCompany', { settings: { requirePod: false } });
  const drv = E.mkDriver(admin, 'Piotr Nowak', '0176 1000 0001');
  // one delivery finished 14 months ago
  E.set(Date.now() - 425 * 864e5);
  const dl = E.driverLogin(tenant, drv.user);
  const d = E.engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: berlinDate(E.now()) }, dropoff: { city: 'Linz' }, driverId: drv.user.id });
  E.engine.call(dl, 'acceptDelivery', { id: d.id });
  for (const step of ['loaded', 'unloaded', 'delivered']) E.engine.call(dl, 'advanceDelivery', { id: d.id, step });
  E.set(Date.now());
  const { app, toasts } = await officeApp(E.engine, admin);
  const stored = () => E.engine.call(admin, 'me').tenant.settings.retentionYears;

  await staff.forms.flowExtra(fdOf({ bookingPrefix: 'KYL', retentionYears: '' }), fakeForm(), app);
  assert.equal(stored(), 3, 'empty field keeps 3 years');
  assert.equal(E.engine.call(admin, 'me').tenant.settings.bookingPrefix, 'KYL');
  for (const bad of ['0', '11', '2.5', 'abc']) {
    const form = fakeForm();
    await staff.forms.flowExtra(fdOf({ bookingPrefix: 'KYL', retentionYears: bad }), form, app);
    assert.equal(stored(), 3, bad);
    assert.deepEqual(form.marked, ['[name=retentionYears]'], bad);
    assert.ok(toasts.at(-1).err);
  }
  await staff.forms.flowExtra(fdOf({ bookingPrefix: 'KYL', retentionYears: '1' }), fakeForm(), app);
  assert.equal(stored(), 3, 'not saved before the confirmation');
  assert.equal(app.ui.retention.count, 1, 'says how many deliveries go at once');
  app.ui.ssec = 'flow'; app.route = { name: 'settings', params: {} };
  assert.match(staff.render(app), /1 abgeschlossene Lieferungen samt Lieferscheinen und Fotos werden innerhalb einer Stunde endgültig gelöscht/);
  staff.actions.retentionCancel(null, null, app);
  assert.equal(stored(), 3);
  await staff.forms.flowExtra(fdOf({ bookingPrefix: 'KYL', retentionYears: '1' }), fakeForm(), app);
  await staff.actions.retentionOk(null, null, app);
  assert.equal(stored(), 1);
  await staff.forms.flowExtra(fdOf({ bookingPrefix: 'KYL', retentionYears: '5' }), fakeForm(), app);
  assert.equal(stored(), 5, 'raising needs no confirmation');
  assert.match(staff.render(app), /Leeres Feld = bisheriger Wert/);
});

// ---------- office/form-1 + extra: assignment is kept by the edit form ----------
test('delivery form: editing details keeps the assignment, a locked driver stays, open-for-all follows the setting', async () => {
  const E = setup();
  const { tenant, admin } = E.mkTenant('Kaya Logistik');
  const P = E.mkDriver(admin, 'Piotr Nowak', '0176 1000 0001'), S = E.mkDriver(admin, 'Sven Berg', '0176 1000 0002');
  const { app, calls } = await officeApp(E.engine, admin);
  app.data.drivers = E.engine.call(admin, 'listUsers', { role: 'driver' });
  app.data.vehicles = [];
  const open = (uid) => E.store.find('notifications', { userId: uid }).filter((n) => n.type === 'open').length;
  // A: returned by its driver → open, not offered to everyone; editing the time keeps it that way
  const pd = E.driverLogin(tenant, P.user);
  let d = E.engine.call(admin, 'createDelivery', { pickup: { city: 'Stuttgart', date: today(), from: '08:00' }, dropoff: { city: 'Hamburg' }, driverId: P.user.id });
  E.engine.call(pd, 'acceptDelivery', { id: d.id });
  E.engine.call(pd, 'returnDelivery', { id: d.id, reason: 'Krank' });
  d = E.engine.call(admin, 'getDelivery', { id: d.id });
  assert.equal(d.openForAll, false);
  const before = open(S.user.id);
  app.data.delivery = d; staff.actions.editDelivery({ dataset: { id: d.id } }, null, app);
  await staff.forms.delivery(fdOf(deliveryForm(d, { 'pickup.from': '09:00', driverId: '', vehicleId: '', trailerId: '' })), fakeForm(), app);
  const sent = calls.filter((c) => c.m === 'updateDelivery').at(-1).a;
  assert.ok(!('openForAll' in sent) && !('driverId' in sent), 'assignment not sent: ' + JSON.stringify(sent));
  d = E.engine.call(admin, 'getDelivery', { id: d.id });
  assert.equal(d.openForAll, false);
  assert.equal(d.pickup.from, '09:00');
  assert.equal(open(S.user.id), before, 'nobody gets an "open job" notice');
  // B: accepted tour whose driver is now locked: the form shows him and keeps him
  let d2 = E.engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: today() }, dropoff: { city: 'Linz' }, driverId: S.user.id });
  E.engine.call(E.driverLogin(tenant, S.user), 'acceptDelivery', { id: d2.id });
  E.engine.call(admin, 'setUserActive', { id: S.user.id, active: false });
  app.data.drivers = E.engine.call(admin, 'listUsers', { role: 'driver' });
  d2 = E.engine.call(admin, 'getDelivery', { id: d2.id });
  app.data.delivery = d2; staff.actions.editDelivery({ dataset: { id: d2.id } }, null, app);
  const html = staff.render(app);
  assert.match(html, new RegExp(`<option value="${S.user.id}" selected disabled>Sven Berg · gesperrt</option>`));
  // a disabled selected option is not part of the form data → no driverId entry at all
  await staff.forms.delivery(fdOf(deliveryForm(d2, { 'pickup.to': '12:00', vehicleId: '', trailerId: '' })), fakeForm(), app);
  d2 = E.engine.call(admin, 'getDelivery', { id: d2.id });
  assert.equal(d2.driverId, S.user.id);
  assert.equal(d2.status, 'accepted');
  // C: the assign form in the delivery sheet does not drop him either; unchanged = nothing sent
  const n = calls.length;
  app.data.delivery = d2;
  await staff.forms.assign(fdOf({ vehicleId: '', trailerId: '' }), fakeForm(), app);
  assert.equal(calls.length, n, 'nothing sent');
  // D: new delivery without driver: "offen für alle" only when drivers may take open jobs
  app.ui.form = {};
  await staff.forms.delivery(fdOf(deliveryForm({ pickup: { city: 'Köln', date: today() }, dropoff: { city: 'Bonn' } }, { driverId: '', vehicleId: '', trailerId: '' })), fakeForm(), app);
  assert.equal(calls.filter((c) => c.m === 'createDelivery').at(-1).a.openForAll, true);
  app.me.tenant = E.engine.call(admin, 'updateCompany', { settings: { driverTakesOpen: false } });
  app.ui.form = {};
  app.ui.sheet = { type: 'deliveryForm' };
  assert.match(staff.render(app), /— wartet auf Zuweisung —/);
  await staff.forms.delivery(fdOf(deliveryForm({ pickup: { city: 'Köln', date: today() }, dropoff: { city: 'Bonn' } }, { driverId: '', vehicleId: '', trailerId: '' })), fakeForm(), app);
  const created = calls.filter((c) => c.m === 'createDelivery').at(-1).a;
  assert.equal(created.openForAll, false);
  const last = E.engine.call(admin, 'listDeliveries', { tab: 'open' }).find((x) => x.pickup.city === 'Köln' && !x.openForAll);
  assert.equal(common.unassignedText(last, app), 'wartet auf Zuweisung');
  app.me.tenant = E.engine.call(admin, 'updateCompany', { settings: { driverTakesOpen: true } });
  assert.equal(common.unassignedText({ ...last, openForAll: true }, app), 'offen für alle Fahrer');
  app.me.tenant = E.engine.call(admin, 'updateCompany', { settings: { driverTakesOpen: false } });
  assert.equal(common.unassignedText({ ...last, openForAll: true }, app), 'wartet auf Zuweisung', 'not offered while the setting is off');
});

// ---------- office/lic-1, ui-3, C9, C16: licence page ----------
test('licence page: real monthly price with extras, yearly amount, dates with year, storage bar, requests', async () => {
  const E = setup();
  const { admin } = E.mkTenant('Rhein Main Kurier', 'premium', { storeApp: true, billing: 'yearly', trialDays: 10 });
  const { app } = await officeApp(E.engine, admin);
  app.route = { name: 'settings', params: {} }; app.ui.ssec = 'license';
  await staff.load(app);
  assert.equal(app.data.license.monthly, 398);
  let html = html0(app);
  assert.match(html, /398 € netto \/ Monat/);
  assert.match(html, /Grundpreis 299 € · Store-App 99 €/);
  assert.match(html, /Jährlich im Voraus: 3\.980 € netto \(10 × Monatspreis\)/);
  assert.match(html, /Test bis<\/dt><dd>\d\d\.\d\d\.20\d\d</, 'date with year');
  assert.match(html, /0 B von 250 GB belegt \(0 %\)/);
  // storage at 85 % → warning, full → banner on every page
  app.me.license = { ...app.me.license, storageUsed: 0.85 * app.me.license.storageLimit };
  html = staff.render(app);
  assert.match(html, /class="bar warn"/);
  assert.match(html, /Der Speicher ist fast voll/);
  app.me.license = { ...app.me.license, storageUsed: app.me.license.storageLimit };
  app.route = { name: 'live', params: {} };
  assert.match(staff.render(app), /Der Speicher Ihres Tarifs ist voll/);
  app.route = { name: 'settings', params: {} };
  // plan change request
  staff.actions.licReq({ dataset: { k: 'plan' } }, null, app);
  assert.match(staff.render(app), /data-form="planRequest"/);
  await staff.forms.planRequest(fdOf({ plan: 'flotte', note: 'Wir werden kleiner' }), fakeForm(), app);
  assert.equal(E.engine.call(admin, 'getTenantLicense').planRequest.plan, 'flotte');
  assert.match(staff.render(app), /Tarifwunsch „Flotte“ gesendet am \d\d\.\d\d\.20\d\d/);
  // cancellation: reason, then a confirmation step inside the page
  staff.actions.licReq({ dataset: { k: 'cancel' } }, null, app);
  staff.forms.cancelRequest(fdOf({ reason: 'Zu teuer' }), fakeForm(), app);
  assert.equal(app.ui.licReq, 'cancelConfirm');
  assert.equal(E.engine.call(admin, 'getTenantLicense').cancelRequestedAt, null, 'nothing sent before the confirmation');
  assert.match(staff.render(app), /Vertrag wirklich kündigen\?/);
  await staff.actions.cancelSend(null, null, app);
  const lic = E.engine.call(admin, 'getTenantLicense');
  assert.ok(lic.cancelRequestedAt);
  assert.equal(lic.cancelReason, 'Zu teuer');
  assert.match(staff.render(app), /Kündigung gesendet am/);
  assert.ok(!staff.render(app).includes('data-k="cancel"'), 'no second cancellation');
});

test('licence page: Flotte with extra drivers is priced with them; over the plan after a downgrade', async () => {
  const E = setup();
  const { admin } = E.mkTenant('Kaya Logistik', 'flotte', { extraDrivers: 3 });
  const { app } = await officeApp(E.engine, admin);
  app.route = { name: 'settings', params: {} }; app.ui.ssec = 'license';
  await staff.load(app);
  const html = html0(app);
  assert.match(html, /150 € netto \/ Monat/);
  assert.match(html, /3 zusätzliche Fahrer à 7 €/);
  assert.ok(!html.includes('Jährlich im Voraus'));
  // drivers page: more active drivers than seats (licensor forced a smaller plan)
  app.route = { name: 'drivers', params: {} };
  app.data.drivers = Array.from({ length: 19 }, (_, i) => ({ id: 'u' + i, name: 'Fahrer ' + i, active: true, phone: '+4917610000' + i }));
  assert.match(staff.render(app), /Mehr aktive Fahrer \(19\) als Ihr Tarif umfasst \(18\)/);
});

// ---------- office/rep-2, ui-1 ----------
test('reports: month picker in Berlin time (24 months) and no contradictory driver rows', async (t) => {
  const E = setup();
  const { admin } = E.mkTenant('Kaya Logistik');
  const { app } = await officeApp(E.engine, admin);
  app.route = { name: 'reports', params: {} };
  app.data.reports = { month: '2026-11', delivered: 0, onTimeRate: null, avgWaiting: null, palletsGiven: 0, palletsTaken: 0, byDriver: [], byDriverHidden: true, byCustomer: [], byPlace: [] };
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-01T00:30:00+01:00') });
  const html = staff.render(app);
  const months = [...html.matchAll(/<option value="(\d{4}-\d{2})"/g)].map((m) => m[1]);
  assert.equal(months.length, 24);
  assert.equal(months[0], '2026-11');
  assert.equal(new Set(months).size, 24, 'no month twice');
  assert.match(html, /<option value="2026-11" selected>November 2026<\/option>/);
  assert.equal(fmt.lastMonths(3, Date.parse('2026-07-10T01:30:00+02:00')).join(), '2026-07,2026-06,2026-05');
  const body = /<h3>Je Fahrer<\/h3>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/.exec(html)[1];
  assert.ok(body.includes('ausgeschaltet') && !body.includes('Keine Daten'), body);
});

// ---------- office/tz-1, ui-3 ----------
test('timeline day labels and printed dates follow Berlin and carry the year', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-17T00:20:00+02:00') });
  const d = { events: [{ type: 'created', at: Date.parse('2026-10-17T00:10:00+02:00') }, { type: 'loaded', at: Date.parse('2026-10-16T23:50:00+02:00') }] };
  const html = common.timeline(d);
  assert.match(html, /00:10<br><span class="xs">Heute</);
  assert.match(html, /23:50<br><span class="xs">Gestern</);
  assert.equal(fmt.dateTimeFull(Date.parse('2026-10-16T16:30:00+02:00')), '16.10.2026, 16:30');
  assert.equal(fmt.dateFull(Date.parse('2026-10-16T23:30:00Z')), '17.10.2026');
});

test('proof of delivery: timestamps with year, stored positions with a maps link, delivery time', async () => {
  const E = setup();
  const { admin } = E.mkTenant('Kaya Logistik');
  const { app } = await officeApp(E.engine, admin);
  const at = Date.parse('2026-10-16T16:30:00+02:00');
  app.data.delivery = { id: 'd1', bookingNo: 'KAY-1', status: 'delivered', deliveredAt: at, pickup: { city: 'Ulm' }, dropoff: { city: 'Linz' }, docs: [],
    events: [{ type: 'loaded', at: at - 3600e3, byName: 'Piotr', geo: { lat: 48.401, lng: 9.987 } }, { type: 'delivered', at, byName: 'Piotr' }] };
  app.ui.sheet = { type: 'proof', id: 'd1' };
  const html = staff.render(app);
  assert.match(html, /16\.10\.2026, 15:30/);
  assert.match(html, /Zugestellt · 16\.10\.2026, 16:30/);
  assert.match(html, /<a href="https:\/\/www\.google\.com\/maps\?q=48\.401000,9\.987000"[^>]*>48\.40100, 9\.98700<\/a>/);
});

// ---------- office/ui-2 ----------
test('Lieferungen loads the drivers for its filter itself', async () => {
  const E = setup();
  const { admin } = E.mkTenant('Kaya Logistik');
  E.mkDriver(admin, 'Piotr Nowak', '0176 1000 0001');
  const { app } = await officeApp(E.engine, admin);
  app.route = { name: 'deliveries', params: {} };
  await staff.load(app);
  assert.equal(app.data.drivers.length, 1);
  assert.match(staff.render(app), /<option value="[^"]+" >Piotr Nowak<\/option>/);
});

// ---------- office/csv-1, security/sec-4, C18, demo ZIP ----------
test('client exports: formulas neutralised, export logged, demo ZIP like the server ZIP', async () => {
  const E = setup();
  const { admin } = E.mkTenant('Kaya Logistik');
  E.engine.call(admin, 'createDelivery', { customer: '=HYPERLINK("https://evil.example/x","Rechnung")', reference: '@SUM(1+1)', pickup: { city: '+1+cmd', date: today() }, dropoff: { city: 'Linz' } });
  const { app } = await officeApp(E.engine, admin);
  saved.length = 0;
  await staff.actions.exportCsv(null, null, app);
  const csv = saved.at(-1).data;
  assert.ok(csv.startsWith('﻿Buchungsnummer;Status;'), 'same header as the server CSV');
  assert.ok(csv.includes(`"'=HYPERLINK(""https://evil.example/x"",""Rechnung"")"`), csv);
  assert.ok(csv.includes(";'@SUM(1+1);") && csv.includes("'+1+cmd"));
  assert.ok(!/;=|;\+|;@/.test(csv), 'no cell starts with a formula character');
  // report CSV (built in the browser) goes through the same escaper and is logged
  app.data.reports = { month: '2026-10', delivered: 1, onTimeRate: 100, avgWaiting: null, palletsGiven: 0, palletsTaken: 0, byDriver: [{ driverName: '=cmd', delivered: 1, waiting: 0, problems: 0 }], byCustomer: [{ customer: '-2+3', count: 1, avgWaiting: null, problems: 0 }], byPlace: [] };
  await staff.actions.reportCsv(null, null, app);
  const rep = saved.at(-1).data;
  assert.ok(rep.includes("'-2+3;1") && rep.includes("'=cmd;1"), rep);
  await staff.actions.exportJson(null, null, app);
  await staff.actions.exportZip(null, null, app);
  const zip = Buffer.from(await saved.at(-1).data.arrayBuffer()).toString('latin1');
  for (const name of ['lieferungen.csv', 'daten.json', 'LIESMICH.txt']) assert.ok(zip.includes(name), name);
  assert.ok(zip.includes("'=HYPERLINK"), 'lieferungen.csv in the ZIP is escaped too');
  const audit = E.engine.call(admin, 'auditLog', { limit: 40 }).map((x) => x.action);
  for (const k of ['export.csv', 'export.report', 'export.json', 'export.zip']) assert.ok(audit.includes(k), k);
});

// ---------- C11: invite link ----------
test('driver invite: link from the token, expiry shown, "Neue Einladung" makes a new one', async () => {
  const E = setup();
  const { admin } = E.mkTenant('Kaya Logistik');
  const { app } = await officeApp(E.engine, admin);
  await staff.forms.driver(fdOf({ name: 'Olena Kravets', phone: '0176 2000 0001', lang: 'uk' }), fakeForm(), app);
  const first = app.ui.access.invite.token;
  assert.equal(first.length, 24);
  let html = staff.render(app);
  assert.ok(html.includes(`https://lk.test/i/${first}`), 'link uses the token');
  assert.ok(!html.includes(`/i/${app.ui.access.user.id}`), 'never the user id');
  assert.match(html, /Link gültig bis<\/dt><dd>\d\d\.\d\d\.20\d\d/);
  assert.match(html, /data-act="resetPin" data-id="[^"]+">.*Neue Einladung/);
  await staff.actions.resetPin({ dataset: { id: app.ui.access.user.id } }, null, app);
  assert.notEqual(app.ui.access.invite.token, first);
  html = staff.render(app);
  assert.ok(html.includes(app.ui.access.invite.token) && !html.includes(first));
});

// ---------- C12: API key ----------
test('API key: shown once after rotation, afterwards only the last 4 characters', async () => {
  const E = setup();
  const { admin } = E.mkTenant('Rhein Main Kurier', 'premium');
  const { app } = await officeApp(E.engine, admin);
  app.route = { name: 'settings', params: {} }; app.ui.ssec = 'api';
  await staff.actions.rotateKey(null, null, app);
  const key = app.ui.apiKey;
  assert.ok(staff.render(app).includes(key));
  app.route = { name: 'live', params: {} };
  await staff.load(app);
  app.route = { name: 'settings', params: {} };
  await staff.load(app);
  const html = staff.render(app);
  assert.ok(!html.includes(key), 'gone after leaving the page');
  assert.ok(html.includes('lk_…' + key.slice(-4)));
  assert.match(html, /nur die letzten 4 Zeichen/);
});

// ---------- C13: two-factor login ----------
test('2FA in Mein Konto: QR code + otpauth link, enable with a code, disable with the password', async () => {
  const E = setup();
  const { admin } = E.mkTenant('Kaya Logistik');
  const { app } = await officeApp(E.engine, admin);
  app.route = { name: 'settings', params: {} }; app.ui.ssec = 'account';
  assert.match(staff.render(app), /data-act="tfaSetup"/);
  await staff.actions.tfaSetup(null, null, app);
  let html = staff.render(app);
  assert.match(html, /<div class="qr"><svg/);
  assert.ok(html.includes('href="otpauth://totp/'), 'otpauth link');
  const wrong = await staff.forms.tfaOn(fdOf({ code: '000000' }), fakeForm(), app).catch((e) => e);
  assert.deepEqual(wrong?.details?.fields, ['code']);
  await staff.forms.tfaOn(fdOf({ code: totp(app.ui.tfa.secret, E.now()) }), fakeForm(), app);
  assert.equal(E.engine.call(admin, 'me').twoFactor, true);
  html = staff.render(app);
  assert.match(html, /data-form="tfaOff"/);
  await staff.forms.tfaOff(fdOf({ password: 'adminpasswort1' }), fakeForm(), app);
  assert.equal(E.engine.call(admin, 'me').twoFactor, false);
  assert.match(staff.render(app), /data-act="tfaSetup"/);
});

// ---------- C7, push switch, 8 languages ----------
test('Mein Konto: all 8 languages, push switch; push is renewed silently once per user', async () => {
  const E = setup();
  const { admin } = E.mkTenant('Kaya Logistik');
  const log = [];
  const push = { supported: () => true, state: () => 'granted', status: async () => 'on', enable: async () => 'granted', disable: async (o) => { log.push(['disable', o]); }, resubscribe: async () => { log.push(['resubscribe']); return true; } };
  const { app } = await officeApp(E.engine, admin, { push });
  app.route = { name: 'settings', params: {} }; app.ui.ssec = 'account';
  await staff.load(app);
  await staff.load(app);
  assert.deepEqual(log, [['resubscribe']], 'once, not on every load');
  await new Promise((r) => setTimeout(r, 0));
  const html = staff.render(app);
  assert.equal([...html.matchAll(/data-act="lang" data-lang="/g)].length, 8);
  assert.match(html, /data-input="pushToggle" checked/);
  await staff.inputs.pushToggle({ checked: false }, { type: 'change' }, app);
  assert.deepEqual(log.at(-1), ['disable', { byUser: true }]);
  app.ui.form = {}; app.ui.sheet = { type: 'staffForm' };
  assert.equal([...staff.render(app).matchAll(/<option value="(de|en|pl|ro|cs|tr|ru|uk)"/g)].length, 8, 'staff form offers 8 languages');
});

// ---------- CMR upload, delete dialog ----------
test('office upload: the chosen document type (CMR) is used; delete text matches the engine rule', async () => {
  const E = setup();
  const { admin } = E.mkTenant('Kaya Logistik');
  const { app, uploads } = await officeApp(E.engine, admin);
  app.data.drivers = []; app.data.vehicles = [];
  app.data.delivery = E.engine.call(admin, 'createDelivery', { pickup: { city: 'Ulm', date: today() }, dropoff: { city: 'Linz' } });
  app.ui.sheet = { type: 'delivery', id: app.data.delivery.id };
  assert.match(staff.render(app), /data-input="docKind"[^>]*>.*<option value="cmr" >CMR<\/option>/);
  staff.inputs.docKind({ value: 'cmr' }, { type: 'change' }, app);
  const el = { dataset: { id: app.data.delivery.id }, files: [new File(['%PDF-1.4'], 'cmr.pdf', { type: 'application/pdf' })], value: 'x' };
  await staff.inputs.officeFile(el, { type: 'change' }, app);
  assert.equal(uploads[0].kind, 'cmr');
  assert.equal(common.eventDetail({ type: 'doc', kind: 'cmr' }), 'CMR');
  app.ui.del = { id: 'u1', name: 'Piotr', role: 'driver' }; app.ui.sheet = { type: 'deleteUser', id: 'u1' };
  assert.match(staff.render(app), /Eine schon beladene Tour bitte vorher abschließen oder stornieren\./);
});
