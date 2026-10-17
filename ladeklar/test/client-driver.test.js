// Driver client (fix round 2): offline outbox, idempotency keys, tap time, cached cold start,
// offline logout, service worker shell, i18n key extraction and the driver view rules.
// Browser pieces (fetch, EventSource, localStorage, window) are small stand-ins.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- browser stand-ins ----------
const ls = new Map();
globalThis.localStorage = { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k) };
globalThis.window = new EventTarget();
(await import('node:events')).setMaxListeners(100, globalThis.window);
globalThis.location = { origin: 'http://lk.test' };
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true, writable: true });
class FakeES { constructor(url) { this.url = url; this.readyState = 0; FakeES.made++; } addEventListener() {} close() { this.readyState = 2; } }
FakeES.made = 0;
globalThis.EventSource = FakeES;
URL.createObjectURL = () => 'blob:local';
URL.revokeObjectURL = () => {};

const DRIVER = { user: { id: 'u1', role: 'driver', name: 'Olena K', phone: '+49 176 1' }, tenant: { code: 'KAYA', name: 'Kaya' } };
const OTHER = { user: { id: 'u2', role: 'driver', name: 'Sven K', phone: '+49 176 2' }, tenant: { code: 'KAYA', name: 'Kaya' } };
const STAFF = { user: { id: 's1', role: 'dispatcher', name: 'Ayse' }, tenant: { code: 'KAYA', name: 'Kaya' } };
const json = (status, body) => ({ status, json: body });
const err = (status, code, message) => json(status, { error: { code, message } });

/** A tiny fake server behind fetch: `up`, a forced answer, the signed-in user and a log of requests. */
function fakeServer() {
  const s = { up: true, force: null, me: DRIVER, log: [], reply: null };
  globalThis.fetch = async (url, init = {}) => {
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    s.log.push({ method: init.method, url, body });
    if (!s.up) throw new TypeError('Failed to fetch');
    if (s.delay) await wait(s.delay);
    const r = s.force || route(url, body);
    if (r.html) return new Response(r.html, { status: r.status, headers: { 'content-type': 'text/html' } });
    return new Response(JSON.stringify(r.json ?? null), { status: r.status || 200, headers: { 'content-type': 'application/json' } });
  };
  function route(url, body) {
    if (url === '/api/session') return s.me ? json(200, s.me) : err(401, 'unauthorized', 'Bitte anmelden.');
    if (url === '/api/auth/logout') { s.me = null; return json(200, { ok: true }); }
    if (url === '/api/auth/driver') { s.me = body.phone === OTHER.user.phone ? OTHER : DRIVER; return json(200, { user: s.me.user }); }
    if (!s.me) return err(401, 'unauthorized', 'Bitte anmelden.');
    if (url.startsWith('/api/call/')) { const m = url.slice(10); const out = s.reply?.(m, body); return out?.http || json(200, out ?? { ok: true, m, step: body?.step }); }
    if (url.startsWith('/api/files')) return json(200, { id: 'f1' });
    if (url === '/api/push/key') return json(200, { publicKey: Buffer.alloc(65, 4).toString('base64url') });
    if (url === '/api/push/subscribe' || url === '/api/push/unsubscribe') return json(200, { ok: true });
    if (url.startsWith('/api/public/invite/')) return err(404, 'not_found', 'Einladung ungültig.');
    return err(404, 'not_found', 'Unbekannte Adresse.');
  }
  s.calls = (m) => s.log.filter((x) => x.url === '/api/call/' + m);
  return s;
}
const { createHttpApi, memoryDb, transient } = await import('../web/js/api-http.js');
async function signedIn(srv, db = memoryDb()) {
  const api = createHttpApi({ db });
  const events = [];
  api.on((e) => events.push(e));
  assert.ok(await api.session());
  return { api, db, events };
}

// ---------- outbox ----------
test('outbox: 502 gateway pages keep queued steps; the retry uses the same _op and tap time', async () => {
  const srv = fakeServer();
  const { api, db } = await signedIn(srv);
  srv.up = false;
  const r = await api.call('advanceDelivery', { id: 'd1', step: 'loaded' });
  assert.deepEqual(r, { queued: true });
  assert.equal(api.queueSize, 1);
  const [first] = srv.calls('advanceDelivery');
  assert.ok(first.body._op && first.body._op.length <= 64, 'idempotency key sent');
  assert.ok(Number.isFinite(first.body.at), 'tap time sent');
  srv.up = true; srv.force = { status: 502, html: '<html>502 Bad Gateway</html>' };
  await api.flush();
  assert.equal((await db.all()).length, 1, 'a 502 never drops the step');
  srv.force = json(503, { error: { code: 'server', message: 'Interner Fehler. Bitte erneut versuchen.' } });
  await api.flush();
  assert.equal((await db.all()).length, 1, 'a 503 never drops the step');
  srv.force = { status: 200, html: '<html>WLAN-Anmeldung</html>' }; // captive portal: 200, but not our answer
  await api.flush();
  assert.equal((await db.all()).length, 1, 'a portal page is not a success');
  srv.force = null;
  await api.flush();
  assert.equal((await db.all()).length, 0);
  const sent = srv.calls('advanceDelivery');
  assert.ok(sent.length >= 4);
  assert.ok(sent.every((x) => x.body._op === first.body._op && x.body.at === first.body.at), 'same _op and at on every retry');
  assert.equal(api.queueSize, 0);
});

test('outbox: a definite 4xx drops the item, reports which step failed and continues in order', async () => {
  const srv = fakeServer();
  const { api, db, events } = await signedIn(srv);
  srv.up = false;
  await api.call('advanceDelivery', { id: 'd1', step: 'delivered', receiver: 'X' });
  await api.call('addNote', { id: 'd1', text: 'Rampe 7' });
  srv.up = true;
  srv.reply = (m) => (m === 'advanceDelivery' ? { http: err(409, 'signature_required', 'Bitte den Empfänger unterschreiben lassen.') } : null);
  await api.flush();
  assert.equal((await db.all()).length, 0);
  const qe = events.find((e) => e.type === 'queue-error');
  assert.equal(qe.item.method, 'advanceDelivery');
  assert.equal(qe.item.step, 'delivered');
  assert.equal(qe.item.id, 'd1');
  assert.equal(qe.error.message, 'Bitte den Empfänger unterschreiben lassen.');
  const failed = await api.failed();
  assert.equal(failed.length, 1);
  assert.equal(failed[0].code, 'signature_required');
  assert.equal(srv.calls('addNote').at(-1).body.text, 'Rampe 7', 'the note behind it was still sent');
  await api.clearFailed();
  assert.deepEqual(await api.failed(), []);
});

test('outbox: 401 keeps the queue for the same user; another user never sends it', async () => {
  const srv = fakeServer();
  const { api, db, events } = await signedIn(srv);
  srv.up = false;
  await api.call('advanceDelivery', { id: 'd1', step: 'arrived_dropoff' });
  srv.up = true; srv.me = null; // e.g. the office reset the PIN
  await api.flush();
  assert.ok(events.some((e) => e.type === 'auth' && e.queued === 1), 'asks to sign in again');
  assert.equal((await db.all()).length, 1, 'nothing dropped');
  await api.driverLogin({ code: 'KAYA', phone: OTHER.user.phone, pin: '123456' });
  await api.flush();
  assert.equal(srv.calls('advanceDelivery').length, 2, 'not sent with somebody else\'s session');
  assert.equal(api.queueSize, 0, 'not shown to the other user');
  await api.logout();
  await api.driverLogin({ code: 'KAYA', phone: DRIVER.user.phone, pin: '123456' });
  await api.flush();
  assert.equal((await db.all()).length, 0);
  assert.equal(srv.calls('advanceDelivery').length, 3);
});

test('outbox: strict FIFO – a new tap queues behind older items, other writes wait for the outbox', async () => {
  const srv = fakeServer();
  const { api } = await signedIn(srv);
  srv.up = false;
  await api.call('advanceDelivery', { id: 'd1', step: 'arrived_pickup' });
  await assert.rejects(api.call('selectVehicle', { vehicleId: 'v1' }), (e) => e.code === 'network', 'no overtaking while offline');
  assert.equal(srv.calls('selectVehicle').length, 0);
  srv.up = true; // lie-fi is over, but no 'online' event: the next tap must still not overtake
  assert.deepEqual(await api.call('advanceDelivery', { id: 'd1', step: 'loaded' }), { queued: true });
  await api.flush();
  const steps = srv.calls('advanceDelivery').map((x) => x.body.step);
  assert.deepEqual(steps.slice(-2), ['arrived_pickup', 'loaded'], 'in order');
  assert.equal(steps.indexOf('loaded'), steps.length - 1, 'loaded never before arrived_pickup went through');
  // online with a slow item ahead: the tap waits for its turn and gets the real answer
  srv.up = false;
  await api.call('advanceDelivery', { id: 'd1', step: 'arrived_dropoff' });
  srv.up = true; srv.delay = 40;
  await api.call('driverHome', {}); // any answer: online again, the outbox starts
  const r = await api.call('advanceDelivery', { id: 'd1', step: 'unloaded' });
  assert.equal(r.step, 'unloaded');
  assert.deepEqual(srv.calls('advanceDelivery').map((x) => x.body.step).slice(-2), ['arrived_dropoff', 'unloaded']);
  srv.delay = 0;
  await api.call('selectVehicle', { vehicleId: 'v1' });
  assert.equal(srv.calls('selectVehicle').length, 1);
});

test('calls: reads carry no _op, writes do; undo and notes carry the tap time', async () => {
  const srv = fakeServer();
  const { api } = await signedIn(srv);
  await api.call('driverHome', {});
  await api.call('undoStep', { id: 'd1' });
  await api.call('selectVehicle', { vehicleId: 'v1' });
  assert.equal(srv.calls('driverHome')[0].body._op, undefined);
  assert.ok(srv.calls('undoStep')[0].body._op && Number.isFinite(srv.calls('undoStep')[0].body.at));
  assert.ok(srv.calls('selectVehicle')[0].body._op);
  assert.equal(srv.calls('selectVehicle')[0].body.at, undefined);
  srv.up = false;
  await assert.rejects(api.call('undoStep', { id: 'd1' }), (e) => e.code === 'network', 'undo is never queued');
  assert.equal(api.queueSize, 0);
  assert.equal(transient({ status: 409, code: 'wrong_step' }), false);
  assert.equal(transient({ status: 429, code: 'rate' }), true);
});

test('cold start in a dead zone: last session and driverHome from the phone, SSE starts, back online by itself', async () => {
  const srv = fakeServer();
  srv.reply = (m) => (m === 'driverHome' ? { mine: [{ id: 'd1', status: 'accepted' }], offered: [], current: null } : m === 'getDelivery' ? { id: 'd1', status: 'accepted', docs: [] } : null);
  const { db } = await signedIn(srv);
  const first = createHttpApi({ db });
  await first.session();
  await first.call('driverHome', {});
  await first.call('getDelivery', { id: 'd1' });
  srv.up = false; // the app was closed; now it starts without network
  const made = FakeES.made;
  const api = createHttpApi({ db });
  const events = []; api.on((e) => events.push(e));
  const me = await api.session();
  assert.equal(me.user.id, 'u1', 'cached session');
  assert.equal(api.online, false);
  assert.ok(FakeES.made > made, 'live connection started (EventSource retries by itself)');
  assert.equal((await api.call('driverHome', {})).mine[0].id, 'd1');
  assert.equal((await api.call('getDelivery', { id: 'd1' })).status, 'accepted');
  srv.up = true;
  window.dispatchEvent(new Event('online'));
  await wait(20);
  assert.equal(api.online, true);
  assert.ok(events.some((e) => e.type === 'session'), 'session confirmed by the server');
});

test('cache: staff data is never served from the phone', async () => {
  const srv = fakeServer();
  srv.me = STAFF;
  const { api } = await signedIn(srv);
  await api.call('listDeliveries', {});
  srv.up = false;
  await assert.rejects(api.call('listDeliveries', {}), (e) => e.code === 'network');
});

test('logout without network: ends here at once, the server logout goes first when the network is back', async () => {
  const srv = fakeServer();
  const { api, db } = await signedIn(srv);
  srv.up = false;
  await api.logout();
  assert.ok(localStorage.getItem('lk.logoutPending'), 'pending logout stored');
  assert.equal(await db.get('me'), undefined, 'cached session wiped');
  assert.equal(await api.session(), null, 'a reload offline shows the login, not the old driver');
  srv.up = true;
  srv.log.length = 0;
  assert.equal(await api.session(), null);
  assert.deepEqual(srv.log.map((x) => x.url).slice(0, 2), ['/api/auth/logout', '/api/session'], 'logout sent before anything else');
  assert.equal(localStorage.getItem('lk.logoutPending'), null);
});

test('logout pending + new login: the old session is logged out before the new login', async () => {
  const srv = fakeServer();
  const { api } = await signedIn(srv);
  srv.up = false;
  await api.logout();
  srv.up = true; srv.me = DRIVER; srv.log.length = 0;
  await api.driverLogin({ code: 'KAYA', phone: OTHER.user.phone, pin: '123456' });
  assert.deepEqual(srv.log.map((x) => x.url).slice(0, 3), ['/api/auth/logout', '/api/auth/driver', '/api/session']);
});

test('invite info: null for an unknown or used invite, an error without network', async () => {
  const srv = fakeServer();
  const api = createHttpApi({ db: memoryDb() });
  assert.equal(await api.inviteInfo('x'.repeat(24)), null);
  srv.up = false;
  await assert.rejects(api.inviteInfo('x'.repeat(24)), (e) => e.code === 'network');
  assert.equal(api.inviteLink('abc'), 'http://lk.test/i/abc');
});

test('uploads: too large is refused at once; a queued photo keeps its blob and delivery', async () => {
  const srv = fakeServer();
  const { api, db } = await signedIn(srv);
  await assert.rejects(api.upload(new Blob([new Uint8Array(15e6 + 1)], { type: 'application/pdf' }), { kind: 'pod', deliveryId: 'd1' }), (e) => e.code === 'too_large');
  srv.up = false;
  const r = await api.upload(new Blob([new Uint8Array(10)], { type: 'image/jpeg' }), { kind: 'pod', deliveryId: 'd1', name: 'ls.jpg' });
  assert.equal(r.queued, true);
  const [item] = await db.all();
  assert.equal(item.kind, 'upload');
  assert.equal(item.fileKind, 'pod');
  assert.equal(item.deliveryId, 'd1');
  assert.equal(item.blob.size, 10);
});

test('push: silent re-subscribe when allowed (C7), in-app switch off is respected, offline logout ends it later', async () => {
  const srv = fakeServer();
  let sub = null;
  const mkSub = () => ({ endpoint: 'https://push.example/abc', toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'p', auth: 'a' } }; }, unsubscribe: async () => { sub = null; return true; } });
  const reg = { pushManager: { getSubscription: async () => sub, subscribe: async () => (sub = mkSub()) } };
  navigator.serviceWorker = { getRegistration: async () => reg, ready: Promise.resolve(reg) };
  window.PushManager = function PushManager() {};
  window.Notification = globalThis.Notification = { permission: 'granted', requestPermission: async () => 'granted' };
  try {
    const { api } = await signedIn(srv);
    assert.equal(await api.push.resubscribe(), true);
    assert.equal(srv.log.filter((x) => x.url === '/api/push/subscribe').length, 1);
    assert.equal(await api.push.status(), 'on');
    await api.push.disable({ byUser: true }); // the driver's switch in "Mehr"
    assert.equal(await api.push.status(), 'off');
    assert.equal(await api.push.resubscribe(), false, 'switched off stays off');
    assert.equal(await api.push.enable(), 'granted');
    assert.equal(await api.push.status(), 'on');
    Notification.permission = 'denied';
    assert.equal(await api.push.status(), 'blocked');
    Notification.permission = 'granted';
    srv.up = false;
    await api.logout(); // offline: the server still has the subscription
    srv.up = true; srv.log.length = 0;
    await api.session();
    assert.deepEqual(srv.log.map((x) => x.url).slice(0, 3), ['/api/push/unsubscribe', '/api/auth/logout', '/api/session']);
  } finally { delete navigator.serviceWorker; delete window.PushManager; delete window.Notification; delete globalThis.Notification; }
});

// ---------- service worker ----------
test('service worker: install caches index, CSS, fonts, icons and every module the app imports', async () => {
  const handlers = {}, cached = new Map();
  const mime = (p) => (p.endsWith('.js') || p.endsWith('.mjs') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream');
  const file = (p) => path.join(ROOT, p === '/' ? 'web/index.html' : p.slice(1));
  const origin = 'http://lk.test';
  const sandbox = {
    self: { addEventListener: (n, fn) => { handlers[n] = fn; }, location: { origin }, skipWaiting: () => {}, clients: { claim: () => {} } },
    caches: { open: async () => ({ put: async (u, r) => { cached.set(typeof u === 'string' ? u : new URL(u.url).pathname, r); }, match: async (u) => cached.get(typeof u === 'string' ? u : new URL(u.url).pathname) }), keys: async () => [] },
    fetch: async (req) => { const p = new URL(req.url).pathname; return fs.existsSync(file(p)) ? new Response(fs.readFileSync(file(p)), { headers: { 'content-type': mime(p) } }) : new Response('nope', { status: 404 }); },
    Request: class extends Request { constructor(u, o) { super(new URL(u, origin), o); } },
    Response, URL, Promise, setTimeout,
  };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'web/sw.js'), 'utf8'), sandbox);
  let done; handlers.install({ waitUntil: (p) => { done = p; } });
  await done;
  const keys = [...cached.keys()];
  for (const k of ['/', '/web/css/app.css', '/web/css/fonts.css', '/web/fonts/manrope-cyrillic.woff2', '/web/icons/icon-192.png', '/web/js/main.js', '/web/js/views/driver.js', '/web/js/lang/uk.js', '/web/vendor/qrcode.mjs', '/core/engine.js', '/core/texts.js', '/core/seed.js']) assert.ok(keys.includes(k), 'cached: ' + k);
  // every JS file of the app (not the demo) is there, and every import of a cached module is cached too
  const demoOnly = new Set(['demo.js', 'demo-sync.js', 'api-local.js']);
  const walk = (d) => fs.readdirSync(d).flatMap((f) => (fs.statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));
  for (const f of walk(path.join(ROOT, 'web/js')).filter((f) => f.endsWith('.js') && !demoOnly.has(path.basename(f)))) assert.ok(keys.includes('/' + path.relative(ROOT, f)), 'module cached: ' + path.relative(ROOT, f));
  for (const k of keys.filter((k) => /\.m?js$/.test(k))) {
    const src = fs.readFileSync(file(k), 'utf8');
    for (const m of src.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)['"]([./][^'"]*\.m?js)['"]/g)) assert.ok(keys.includes(new URL(m[1], origin + k).pathname), `${k} imports ${m[1]}`);
  }
  // offline navigation: the cached app shell; /legal pages are not swallowed
  sandbox.fetch = async () => { throw new TypeError('offline'); };
  let resp; handlers.fetch({ request: { url: origin + '/t/KAYA', method: 'GET', mode: 'navigate' }, respondWith: (p) => { resp = p; } });
  assert.ok((await (await resp).text()).includes('/web/js/main.js'));
  resp = null; handlers.fetch({ request: { url: origin + '/legal/agb', method: 'GET', mode: 'navigate' }, respondWith: (p) => { resp = p; } });
  assert.equal(resp, null);
});

// ---------- i18n keys ----------
test('extract-i18n: engine and server error messages are keys for all 8 languages', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lk-keys-')), 'keys.json');
  execFileSync(process.execPath, [path.join(ROOT, 'tools/extract-i18n.js'), out], { stdio: 'pipe' });
  const keys = JSON.parse(fs.readFileSync(out, 'utf8'));
  for (const k of ['Bitte den Empfänger unterschreiben lassen.', 'Firmencode, Telefonnummer oder PIN ist falsch.', 'Dieser Schritt passt gerade nicht. Bitte die Ansicht aktualisieren.', 'Bitte anmelden.', 'Zu viele Versuche. Bitte eine Minute warten.', 'Bitte den 6-stelligen Code aus der Authenticator-App eingeben.', 'Einladung abgelaufen – bitte neue Einladung im Büro anfordern', 'Dieser Auftrag ist nicht mehr für Sie.', 'Rückgängig geht nur mit Netz.', 'z. B. KAYA', 'ab {t}', 'bis {t}']) assert.equal(keys[k], 'all', k);
  assert.equal(keys.addNote, undefined, 'method names are not labels');
  assert.equal(keys.cancelled, undefined, 'codes are not messages');
});

// ---------- driver view ----------
const driver = await import('../web/js/views/driver.js');
const { setLang } = await import('../web/js/i18n.js');
setLang('de');
function fakeApp({ settings = {}, license = 'trial', outbox = [], call } = {}) {
  const calls = [], toasts = [], errors = [];
  const d1 = { id: 'd1', bookingNo: 'KAY-1', status: 'accepted', next: 'loaded', pickup: { city: 'Ulm', from: '08:00' }, dropoff: { city: 'Linz', to: '16:00' }, docs: [], events: [], driverId: 'u1' };
  const home = { me: { ...DRIVER.user }, tenant: { name: 'Kaya', settings: { requirePod: true, ...settings } }, license, vehicle: null, trailer: null, current: d1, mine: [{ ...d1 }], offered: [], doneToday: 0 };
  const app = {
    me: { user: { ...DRIVER.user }, tenant: home.tenant, license: { state: license, trialEnd: Date.now() + 3 * 864e5, plan: { name: 'Flotte' } } },
    data: { home }, ui: {}, route: { name: 'home' }, flash: new Set(), online: true, queue: 0,
    api: { mode: 'server', push: null, outbox: async () => outbox, failed: async () => [], call: call || (async (m, a) => { calls.push({ m, a }); return m === 'driverHome' ? JSON.parse(JSON.stringify(home)) : { ok: true, status: a?.step }; }) },
    tenant() { return this.me.tenant; }, fileUrl: (id) => '/f/' + id, invalidate() {}, render() {}, load() {},
    toast: (x) => toasts.push(x), error: (e) => errors.push(e), open(s) { this.ui.sheet = s; }, go() {},
    root: { querySelector: () => null },
  };
  app.call = (m, a, o) => app.api.call(m, a, o);
  return { app, calls, toasts, errors };
}

test('driver: no billing banner, only a neutral line when the access is blocked; windows in the driver language', () => {
  const { app } = fakeApp({ license: 'trial' });
  const html = driver.render(app);
  assert.ok(!html.includes('Testphase'), 'no trial/billing text for drivers');
  assert.ok(!html.includes('Zugang gesperrt'));
  assert.ok(html.includes('ab 08:00') && html.includes('bis 16:00'));
  app.data.home.license = 'suspended';
  assert.ok(driver.render(app).includes('Zugang gesperrt – bitte die Disposition anrufen.'));
});

test('driver: "Unterschrift Pflicht" keeps the finish button disabled until signed – also offline', async () => {
  const { app, calls, errors } = fakeApp({ settings: { requireSignature: true, requirePod: false } });
  app.data.job = { ...app.data.home.current, status: 'unloaded', next: 'delivered' };
  app.ui.sheet = { type: 'pod', id: 'd1' };
  const btn = () => /<button class="step-btn ok"[^>]*data-act="finish"[^>]*>/.exec(driver.render(app))[0];
  assert.ok(btn().includes('disabled'));
  await driver.actions.finish(null, null, app);
  assert.equal(errors[0]?.message, 'Bitte den Empfänger unterschreiben lassen.');
  assert.equal(calls.length, 0, 'nothing sent or queued');
  app._sig = { isEmpty: () => false, toBlob: async () => new Blob(['x'], { type: 'image/png' }) };
  assert.ok(!btn().includes('disabled'));
});

test('driver: undo only with network, never reported as done when nothing happened', async () => {
  const { app, calls, toasts } = fakeApp();
  app.ui.undo = { id: 'd1', until: Date.now() + 60000, label: 'Aufgeladen' };
  assert.ok(driver.render(app).includes('data-act="undo"'));
  app.online = false;
  assert.ok(!driver.render(app).includes('data-act="undo"'), 'not offered offline');
  await driver.actions.undo({ dataset: { id: 'd1' } }, null, app);
  assert.equal(calls.length, 0);
  assert.equal(toasts.at(-1).title, 'Rückgängig geht nur mit Netz.');
  app.online = true;
  app.api.call = async () => { const e = new Error('Keine Verbindung.'); e.code = 'network'; throw e; };
  await driver.actions.undo({ dataset: { id: 'd1' } }, null, app);
  assert.equal(toasts.at(-1).title, 'Rückgängig geht nur mit Netz.');
  assert.ok(app.ui.undo, 'still offered for a retry');
});

test('driver: a notification of a tour that now belongs to someone else does not load forever', async () => {
  const { app, toasts } = fakeApp({ call: async (m) => { if (m === 'getDelivery') { const e = new Error('Nicht gefunden.'); e.code = 'not_found'; throw e; } return {}; } });
  app.data.home.mine = []; app.data.home.current = null;
  app.open({ type: 'job', id: 'gone' });
  await driver.sheetOpened(app);
  assert.equal(app.ui.sheet, null);
  assert.equal(toasts.at(-1).title, 'Dieser Auftrag ist nicht mehr für Sie.');
  // without network and without a copy on the phone: a clear message instead of a skeleton
  app.api.call = async () => { const e = new Error('Keine Verbindung.'); e.code = 'network'; throw e; };
  app.open({ type: 'job', id: 'other' });
  await driver.sheetOpened(app);
  assert.ok(driver.render(app).includes('Ohne Netz gerade nicht verfügbar.'));
});

test('driver: a second tap while the step is on its way sends nothing more', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); // the success screen and the 2-minute undo timer
  const { app, calls } = fakeApp();
  const el = { dataset: { id: 'd1', step: 'loaded' }, classList: { add() {}, remove() {} } };
  await Promise.all([driver.actions.step(el, null, app), driver.actions.step(el, null, app)]);
  assert.equal(calls.filter((c) => c.m === 'advanceDelivery').length, 1);
  assert.ok(Number.isFinite(calls[0].a.at), 'tap time passed on');
});

test('driver: drive lock off in the office unlocks at once; works without the Permissions API', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let cleared = 0, watched = 0;
  navigator.geolocation = { watchPosition: () => ++watched, clearWatch: () => { cleared++; }, getCurrentPosition: (ok) => ok({ coords: {} }) };
  navigator.permissions = undefined;
  const { app, calls } = fakeApp({ settings: { driveLock: true } });
  await driver.load(app);
  assert.equal(app.ui.lockPerm, 'prompt', 'asks with the card (tap → browser question)');
  assert.ok(driver.render(app).includes('data-act="lockAllow"'));
  driver.actions.lockAllow(null, null, app);
  assert.equal(watched, 1, 'lock watch started after the tap');
  app.ui.locked = true;
  app.data.home.tenant.settings.driveLock = false; // the office switches it off
  app.api.call = async (m, a) => { calls.push({ m, a }); return m === 'driverHome' ? JSON.parse(JSON.stringify({ ...app.data.home, tenant: { name: 'Kaya', settings: { driveLock: false } } })) : { ok: true }; };
  await driver.load(app);
  assert.equal(app.ui.locked, false);
  assert.equal(cleared, 1);
  await driver.actions.step({ dataset: { id: 'd1', step: 'loaded' }, classList: { add() {}, remove() {} } }, null, app);
  assert.ok(calls.some((c) => c.m === 'advanceDelivery'), 'taps work again');
  delete navigator.geolocation; delete navigator.permissions;
});

test('driver: steps and photos still in the outbox are shown after a restart', async () => {
  const blob = new Blob(['x'], { type: 'image/jpeg' });
  const outbox = [
    { seq: 1, kind: 'call', method: 'advanceDelivery', args: { id: 'd1', step: 'loaded' }, at: 1000 },
    { seq: 2, kind: 'upload', fileKind: 'pod', deliveryId: 'd1', blob, at: 2000 },
  ];
  const { app } = fakeApp({ outbox });
  await driver.load(app);
  assert.equal(app.data.home.current.status, 'loaded');
  assert.equal(app.data.home.current.next, 'unloaded');
  assert.ok(driver.render(app).includes('data-step="unloaded"'));
  assert.equal(app.ui.localDocs.d1[0].kind, 'pod');
  assert.equal(driver.queueLabel(app, { kind: 'call', method: 'advanceDelivery', step: 'loaded', id: 'd1' }), 'Beladen · unterwegs · KAY-1');
});
