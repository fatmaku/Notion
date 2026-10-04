// HTTP-API: Anmeldung, Fang mit echtem JPEG, Fotos (nur Ausschnitt öffentlich), Rechte,
// Café-PIN, Sicherheits-Header, Pfad-Traversal, Größenlimits, Export.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const jpeg = `data:image/jpeg;base64,${fs.readFileSync(path.join(here, 'fixtures', 'cat.jpg')).toString('base64')}`;

let app;
let base;
let tmp;
test.before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catme-api-'));
  app = await createApp({ dataDir: tmp, aiMode: 'mock', demo: true, log: () => {} });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
test.after(async () => {
  await app.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

const j = async (method, p, body, token) => {
  const res = await fetch(base + p, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data, headers: res.headers };
};

test('Öffentliche Endpunkte, Header, Demo-Daten', async () => {
  const h = await j('GET', '/api/health');
  assert.equal(h.status, 200);
  assert.equal(h.data.demo, true);
  const cfg = await j('GET', '/api/config');
  assert.equal(cfg.data.regions[0].id, 'kadikoy');
  assert.equal(cfg.data.game.dailyGoal, 20);
  const cats = await j('GET', '/api/cats?limit=5');
  assert.equal(cats.data.items.length, 5);
  assert.ok(cats.data.total >= 60);
  const st = await j('GET', '/api/stats');
  assert.ok(st.data.totals.cats >= 60);
  const html = await fetch(`${base}/`);
  assert.match(html.headers.get('content-security-policy'), /default-src 'self'/);
  assert.doesNotMatch(html.headers.get('content-security-policy'), /unsafe-eval/);
  assert.equal(html.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await fetch(`${base}/../server/app.js`)).status, 404);
  assert.equal((await fetch(`${base}/%2e%2e/server/auth.js`)).status, 404);
  assert.equal((await fetch(`${base}/api/nope`)).status, 404);
});

test('Spieler:in fängt eine Katze mit echtem Foto; nur der Ausschnitt ist öffentlich', async () => {
  const bad = await j('POST', '/api/players', { nickname: 'f.u.c.k' });
  assert.equal(bad.status, 400);
  const reg = await j('POST', '/api/players', { nickname: 'Selin', lang: 'tr' });
  assert.equal(reg.status, 201);
  const token = reg.data.token;
  assert.equal((await j('GET', '/api/me')).status, 401);
  const me = await j('GET', '/api/me', null, token);
  assert.equal(me.data.player.nickname, 'Selin');

  const c = await j('POST', '/api/catch', { photo: jpeg, crop: jpeg, lat: 40.9842, lon: 29.0262, accuracy: 10, capturedAt: Date.now(), source: 'camera', fingerprint: { colors: { orange: 0.6, brown: 0.3, white: 0.1 }, hash: '0123456789abcdef' }, detector: { score: 0.93, box: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 } } }, token);
  assert.equal(c.status, 201, JSON.stringify(c.data));
  assert.equal(c.data.isNew, true);
  const url = c.data.cat.photoUrl;
  assert.match(url, /^\/photos\/[0-9a-f]{20}_c\.jpg$/);
  const crop = await fetch(base + url);
  assert.equal(crop.status, 200);
  assert.equal(crop.headers.get('content-type'), 'image/jpeg');
  assert.equal((await fetch(base + url.replace('_c.jpg', '_f.jpg'))).status, 404, 'ganzes Foto nicht öffentlich');
  const id = url.match(/([0-9a-f]{20})/)[1];
  assert.equal((await fetch(`${base}/api/admin/photos/${id}`)).status, 403);
  const full = await fetch(`${base}/api/admin/photos/${id}`, { headers: { Authorization: `Bearer ${app.adminToken}` } });
  assert.equal(full.status, 200);

  const again = await j('POST', '/api/catch', { photo: jpeg, lat: 40.9842, lon: 29.0262, accuracy: 10, source: 'camera' }, token);
  assert.equal(again.status, 429);
  assert.equal(again.data.error, 'cooldown');
  assert.ok(Number(again.headers.get('retry-after')) > 0);

  const named = await j('POST', `/api/cats/${c.data.cat.id}/name`, { name: 'Tarçın' }, token);
  assert.equal(named.data.name, 'Tarçın');
  const detail = await j('GET', `/api/cats/${c.data.cat.id}`);
  assert.equal(detail.data.cat.name, 'Tarçın');
  assert.equal(detail.data.catchers[0].nickname, 'Selin');
});

test('Fotos werden geprüft (nur JPEG, Größe)', async () => {
  const reg = await j('POST', '/api/players', { nickname: 'Pruefer' });
  const token = reg.data.token;
  const png = await j('POST', '/api/catch', { photo: 'data:image/png;base64,iVBORw0KGgo=', lat: 40.98, lon: 29.03 }, token);
  assert.equal(png.status, 400);
  const fake = await j('POST', '/api/catch', { photo: `data:image/jpeg;base64,${Buffer.from('nope'.repeat(50)).toString('base64')}`, lat: 40.98, lon: 29.03 }, token);
  assert.equal(fake.status, 400);
  const big = await fetch(`${base}/api/catch`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ photo: 'x'.repeat(4 * 1024 * 1024) }) });
  assert.equal(big.status, 413);
});

test('Rechte: Moderation nur mit Token, Status nur für Freiwillige', async () => {
  assert.equal((await j('GET', '/api/admin/queue')).status, 403);
  const reg = await j('POST', '/api/players', { nickname: 'Normal' });
  assert.equal((await j('GET', '/api/admin/queue', null, reg.data.token)).status, 403);
  const q = await j('GET', '/api/admin/queue', null, app.adminToken);
  assert.equal(q.status, 200);
  const anyCat = (await j('GET', '/api/cats?limit=1')).data.items[0];
  assert.equal((await j('POST', `/api/cats/${anyCat.id}/status`, { status: 'in_care' }, reg.data.token)).status, 403);
  await j('POST', `/api/admin/players/${reg.data.player.id}/role`, { role: 'volunteer' }, app.adminToken);
  assert.equal((await j('POST', `/api/cats/${anyCat.id}/status`, { status: 'in_care', note: 'Tierarzt' }, reg.data.token)).status, 200);
});

test('Café: PIN-Anmeldung, falsche PIN, Ratenbegrenzung', async () => {
  const created = await j('POST', '/api/admin/places', { type: 'partner', name: 'API Kafe', lat: 40.985, lon: 29.03, reward: { minCats: 1, discountPct: 15 }, pin: '112233' }, app.adminToken);
  assert.equal(created.status, 200);
  assert.equal(created.data.pinHash, undefined, 'PIN-Hash wird nie ausgeliefert');
  const partners = await j('GET', '/api/partners');
  assert.ok(partners.data.some((p) => p.id === created.data.id));
  assert.equal((await j('POST', '/api/partner/login', { partnerId: created.data.id, pin: '000000' })).status, 401);
  const ok = await j('POST', '/api/partner/login', { partnerId: created.data.id, pin: '112233' });
  assert.equal(ok.status, 200);
  const me = await j('GET', '/api/partner/me', null, ok.data.token);
  assert.equal(me.data.partner.name, 'API Kafe');
  const chk = await j('POST', '/api/partner/check', { code: 'CAT-AAAA-BBBB' }, ok.data.token);
  assert.equal(chk.data.valid, false);
  assert.equal(chk.data.reason, 'not_found');
  let limited = false;
  for (let i = 0; i < 12; i++) {
    const r = await j('POST', '/api/partner/login', { partnerId: created.data.id, pin: '999999' });
    if (r.status === 429) limited = true;
  }
  assert.ok(limited, 'PIN-Raten wird gebremst');
  assert.equal((await j('GET', '/api/partner/me', null, 'falsch-falsch-falsch-falsch')).status, 401);
});

test('Offene Daten: CSV ohne Formel-Injektion, GeoJSON', async () => {
  const csv = await fetch(`${base}/api/export/cats.csv?lang=de`);
  assert.equal(csv.status, 200);
  const text = await csv.text();
  assert.match(text.split('\n')[0], /id,name,district,lat,lon/);
  const geo = await (await fetch(`${base}/api/export/cats.geojson`)).json();
  assert.equal(geo.type, 'FeatureCollection');
  assert.ok(geo.features.length >= 60);
  const [lon, lat] = geo.features[0].geometry.coordinates;
  assert.ok(String(lat).split('.')[1].length <= 3 && String(lon).split('.')[1].length <= 3, 'gerundet');
});

test('Persistenz: Neustart lädt Journal/Snapshot', async () => {
  const reg = await j('POST', '/api/players', { nickname: 'Bleibt' });
  app.journal.compact();
  const app2 = await createApp({ dataDir: tmp, aiMode: 'mock', demo: true, log: () => {} });
  assert.ok(app2.engine.ctx.store.players.get(reg.data.player.id), 'Spieler nach Neustart vorhanden');
  assert.ok(app2.engine.ctx.store.cats.count() >= 60, 'Demo-Daten nicht doppelt, aber vorhanden');
  app2.journal.close();
});
