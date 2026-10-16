// HTTP API tests against a real server instance (temporary data directory, random port).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer } from '../server/index.js';
import { encrypt, decrypt, vapidAuth, generateVapidKeys } from '../server/webpush.js';

const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

async function boot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ladeklar-'));
  const pushed = [];
  const s = createServer({ dataDir: dir, quiet: true, platformEmail: 'chef@ladeklar.de', platformPassword: 'plattform-pass-1', sendPush: async (sub, payload) => { pushed.push({ sub, payload }); return { ok: true, status: 201 }; } });
  const port = await s.listen(0, '127.0.0.1');
  const base = `http://127.0.0.1:${port}`;
  const client = () => {
    let cookie = '';
    const req = async (method, p, body, headers = {}) => {
      const isBuf = Buffer.isBuffer(body);
      const r = await fetch(base + p, { method, headers: { 'X-Ladeklar': '1', ...(cookie ? { Cookie: cookie } : {}), ...(body && !isBuf ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? (isBuf ? body : JSON.stringify(body)) : undefined });
      const sc = r.headers.get('set-cookie');
      if (sc) cookie = sc.split(';')[0];
      const ct = r.headers.get('content-type') || '';
      const data = ct.includes('json') ? await r.json() : await r.text();
      return { status: r.status, data, headers: r.headers };
    };
    return { req, call: (m, a = {}) => req('POST', '/api/call/' + m, a), get cookie() { return cookie; } };
  };
  return { s, base, client, pushed, dir, stop: async () => { await s.close(); fs.rmSync(dir, { recursive: true, force: true }); } };
}

function sseListen(base, cookie) {
  const events = [];
  const ctrl = new AbortController();
  const done = fetch(base + '/api/events', { headers: { Cookie: cookie }, signal: ctrl.signal }).then(async (r) => {
    const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { value, done: end } = await reader.read(); if (end) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
        const ev = /event: (\w+)/.exec(chunk)?.[1]; const data = /data: (.*)/.exec(chunk)?.[1];
        if (ev) events.push({ ev, data: data ? JSON.parse(data) : null });
      }
    }
  }).catch(() => {});
  const waitFor = async (pred, ms = 3000) => { const t = Date.now(); while (Date.now() - t < ms) { const e = events.find(pred); if (e) return e; await new Promise((r) => setTimeout(r, 20)); } throw new Error('event not received'); };
  return { events, waitFor, stop: () => { ctrl.abort(); return done; } };
}

test('end to end over HTTP: licensor → company → driver, live events, push, files, exports', async () => {
  const { s, base, client, pushed, stop } = await boot();
  try {
    const anon = client();
    assert.equal((await anon.req('GET', '/api/health')).data.ok, true);
    assert.equal((await anon.req('GET', '/api/session')).status, 401);
    // CSRF guard: POST without the custom header is refused
    const noHdr = await fetch(base + '/api/auth/login', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
    assert.equal(noHdr.status, 403);

    const lic = client();
    assert.equal((await lic.req('POST', '/api/auth/login', { email: 'chef@ladeklar.de', password: 'falsch-falsch' })).status, 401);
    const login = await lic.req('POST', '/api/auth/login', { email: 'chef@ladeklar.de', password: 'plattform-pass-1' });
    assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
    const created = await lic.call('createTenant', { name: 'Kaya Logistik', code: 'KAYA', plan: 'premium', adminEmail: 'ayse@kaya.de', contact: 'Ayşe Kaya' });
    assert.equal(created.status, 200);
    assert.ok(created.data.password.length >= 12, 'start password is generated');

    const admin = client();
    assert.equal((await admin.req('POST', '/api/auth/login', { email: 'ayse@kaya.de', password: created.data.password })).status, 200);
    const me = await admin.req('GET', '/api/session');
    assert.equal(me.data.tenant.code, 'KAYA');
    assert.equal(me.data.user.mustChangePassword, true);
    assert.equal((await admin.call('changePassword', { current: created.data.password, next: 'neues-passwort-123' })).status, 200);

    const drv = await admin.call('createUser', { role: 'driver', name: 'Mehmet Yılmaz', phone: '0176 1234567', lang: 'tr' });
    assert.match(drv.data.pin, /^\d{6}$/);
    const truck = await admin.call('createVehicle', { kind: 'truck', plate: 'S-KL 2041' });

    const driver = client();
    assert.equal((await driver.req('POST', '/api/auth/driver', { code: 'kaya', phone: '+491761234567', pin: '000000' })).status, 401);
    const dl = await driver.req('POST', '/api/auth/driver', { code: 'kaya', phone: '+491761234567', pin: drv.data.pin });
    assert.equal(dl.status, 200);
    assert.match(dl.headers.get('set-cookie'), /Max-Age=7776000/, 'drivers stay signed in for 90 days');

    // push subscription for the dispatcher
    const ua = crypto.createECDH('prime256v1'); ua.generateKeys();
    const auth = crypto.randomBytes(16).toString('base64url');
    assert.equal((await admin.req('POST', '/api/push/subscribe', { endpoint: 'https://push.example.net/sub/1', keys: { p256dh: ua.getPublicKey().toString('base64url'), auth } })).status, 200);
    assert.equal((await admin.req('POST', '/api/push/subscribe', { endpoint: 'http://evil', keys: {} })).status, 400);

    const staffSse = sseListen(base, admin.cookie);
    const driverSse = sseListen(base, driver.cookie);
    await staffSse.waitFor((e) => e.ev === 'hello');
    await driverSse.waitFor((e) => e.ev === 'hello');

    const d = await admin.call('createDelivery', { customer: 'Bosch', pickup: { city: 'Stuttgart', date: '2026-10-16' }, dropoff: { city: 'Hamburg' } });
    assert.equal(d.status, 200);
    const n1 = await driverSse.waitFor((e) => e.ev === 'notify');
    assert.equal(n1.data.title, 'Açık sipariş', 'driver gets the open job in Turkish, live');

    assert.equal((await driver.call('selectVehicle', { vehicleId: truck.data.id })).status, 200);
    assert.equal((await driver.call('acceptDelivery', { id: d.data.id })).data.status, 'accepted');
    const live = await staffSse.waitFor((e) => e.ev === 'notify' && /Bestätigt/.test(e.data.title));
    assert.match(live.data.body, /Stuttgart → Hamburg/);
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(pushed.some((x) => x.sub.endpoint === 'https://push.example.net/sub/1' && /Bestätigt/.test(x.payload.title)), 'web push sent to the dispatcher');

    await driver.call('advanceDelivery', { id: d.data.id, step: 'loaded' });
    await driver.call('advanceDelivery', { id: d.data.id, step: 'unloaded' });
    assert.equal((await driver.call('advanceDelivery', { id: d.data.id, step: 'delivered' })).data.error.code, 'pod_required');

    // file upload: type is sniffed from the bytes, not trusted from the header
    assert.equal((await driver.req('POST', `/api/files?kind=pod&deliveryId=${d.data.id}`, Buffer.from('<script>alert(1)</script>xxxxxxxx'), { 'Content-Type': 'image/jpeg' })).status, 400);
    const up = await driver.req('POST', `/api/files?kind=pod&deliveryId=${d.data.id}&name=lieferschein.jpg`, JPEG, { 'Content-Type': 'image/jpeg' });
    assert.equal(up.status, 200);
    const fileAdmin = await fetch(base + '/api/files/' + up.data.id, { headers: { Cookie: admin.cookie } });
    assert.equal(fileAdmin.status, 200);
    assert.match(fileAdmin.headers.get('content-security-policy'), /sandbox/);
    assert.equal((await fetch(base + '/api/files/' + up.data.id)).status, 404, 'no access without login');

    const fin = await driver.call('advanceDelivery', { id: d.data.id, step: 'delivered', receiver: 'Lager HH' });
    assert.equal(fin.data.status, 'delivered');
    await staffSse.waitFor((e) => e.ev === 'notify' && /Zugestellt/.test(e.data.title));

    // a second company must not see the file or delivery
    const other = await lic.call('createTenant', { name: 'Fremd GmbH', code: 'FREMD', adminEmail: 'x@fremd.de', adminPassword: 'fremd-passwort-1' });
    assert.equal(other.status, 200);
    const fremd = client();
    await fremd.req('POST', '/api/auth/login', { email: 'x@fremd.de', password: 'fremd-passwort-1' });
    assert.equal((await fetch(base + '/api/files/' + up.data.id, { headers: { Cookie: fremd.cookie } })).status, 404);
    assert.equal((await fremd.call('getDelivery', { id: d.data.id })).status, 404);

    // exports
    const csvRes = await admin.req('GET', '/api/export/deliveries.csv');
    assert.match(csvRes.data, /KAY-\d{4}-0001;Zugestellt;Bosch/);
    const exp = await admin.req('GET', '/api/export/all.json');
    assert.equal(exp.data.format, 'ladeklar-export');
    assert.ok(!JSON.stringify(exp.data).includes('scrypt$'), 'no password hashes in the export');
    assert.equal((await driver.req('GET', '/api/export/deliveries.csv')).status, 403);
    const bill = await lic.req('GET', '/api/export/billing.csv');
    assert.equal(bill.status, 200);

    // REST API with key (Premium)
    const key = (await admin.call('rotateApiKey')).data.apiKey;
    const api = await fetch(base + '/api/v1/deliveries', { headers: { Authorization: 'Bearer ' + key } });
    assert.equal(api.status, 200);
    assert.equal((await api.json())[0].status, 'delivered');
    const post = await fetch(base + '/api/v1/deliveries', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ pickup: { city: 'Ulm', date: '2026-10-20' }, dropoff: { city: 'Wien', country: 'AT' } }) });
    assert.equal(post.status, 201);
    assert.equal((await fetch(base + '/api/v1/deliveries', { headers: { Authorization: 'Bearer lk_falsch' } })).status, 401);

    // deactivating a driver ends the session immediately
    await admin.call('setUserActive', { id: drv.data.user.id, active: false });
    assert.equal((await driver.req('GET', '/api/session')).status, 401);

    await staffSse.stop(); await driverSse.stop();
    void s;
  } finally { await stop(); }
});

test('login rate limit and lockout', async () => {
  const { client, stop } = await boot();
  try {
    const c = client();
    let last;
    for (let i = 0; i < 21; i++) last = await c.req('POST', '/api/auth/login', { email: 'chef@ladeklar.de', password: 'nope' });
    assert.equal(last.status, 429);
  } finally { await stop(); }
});

test('web push encryption round-trips (aes128gcm) and VAPID header is well-formed', () => {
  const ua = crypto.createECDH('prime256v1'); ua.generateKeys();
  const auth = crypto.randomBytes(16).toString('base64url');
  const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: ua.getPublicKey().toString('base64url'), auth } };
  const msg = JSON.stringify({ title: 'Zugestellt · KAY-2610-0001', body: 'Stuttgart → Hamburg' });
  const enc = encrypt(sub, msg);
  assert.equal(enc.readUInt32BE(16), 4096);
  assert.equal(decrypt(ua, auth, enc), msg);
  const keys = generateVapidKeys();
  const h = vapidAuth(sub.endpoint, keys, 'mailto:support@ladeklar.de');
  const [, jwt] = /t=([^,]+)/.exec(h);
  const [hd, pl, sig] = jwt.split('.');
  const pub = Buffer.from(keys.publicKey, 'base64url');
  const key = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33).toString('base64url') }, format: 'jwk' });
  assert.ok(crypto.verify('sha256', Buffer.from(hd + '.' + pl), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url')));
  assert.equal(JSON.parse(Buffer.from(pl, 'base64url')).aud, 'https://fcm.googleapis.com');
});

test('demo data boots into a consistent world', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ladeklar-demo-'));
  const s = createServer({ dataDir: dir, quiet: true, demoData: true });
  try {
    const p = s.engine.auth.login({ email: 'inhaber@ladeklar.de', password: 'Ladeklar-Demo-2026' });
    const st = s.engine.call(p, 'platformStats', {});
    assert.equal(st.tenants, 6);
    const admin = s.engine.auth.login({ email: 'ayse@kaya-logistik.de', password: 'Demo-Passwort-2026' });
    const dash = s.engine.call(admin, 'dashboard', {});
    assert.equal(dash.counts.active, 4);
    assert.equal(dash.counts.problems, 1);
  } finally { await s.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
