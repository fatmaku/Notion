// Integration checks across the fix-round-2 streams (engine ↔ server ↔ clients): the places where one
// stream's change needs the other side to follow.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer } from '../server/index.js';
import { exportFileName } from '../core/zip.js';
import { window_ } from '../web/js/format.js';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const JPEG = fs.readFileSync(path.join(ROOT, 'e2e', 'fixtures', 'lieferschein.jpg'));

async function boot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ladeklar-int-'));
  const s = createServer({ dataDir: dir, quiet: true, demoData: true });
  const base = `http://127.0.0.1:${await s.listen(0, '127.0.0.1')}`;
  const client = () => {
    let cookie = '';
    const req = async (method, p, body, headers = {}) => {
      const isBuf = Buffer.isBuffer(body);
      const r = await fetch(base + p, { method, headers: { 'X-Ladeklar': '1', ...(cookie ? { Cookie: cookie } : {}), ...(body && !isBuf ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? (isBuf ? body : JSON.stringify(body)) : undefined });
      const sc = r.headers.get('set-cookie');
      if (sc) cookie = sc.split(';')[0];
      const ct = r.headers.get('content-type') || '';
      return { status: r.status, data: ct.includes('json') ? await r.json() : await r.text(), headers: r.headers };
    };
    return { req, call: (m, a = {}) => req('POST', '/api/call/' + m, a) };
  };
  return { s, dir, base, client, stop: async () => { await s.close(); fs.rmSync(dir, { recursive: true, force: true }); } };
}

test('an upload replayed with the same op is stored once (C1 for photos)', async () => {
  const { s, dir, client, stop } = await boot();
  try {
    const office = client();
    assert.equal((await office.req('POST', '/api/auth/login', { email: 'ayse@kaya-logistik.de', password: 'Demo-Passwort-2026' })).status, 200);
    const d = (await office.call('listDeliveries', { tab: 'all', limit: 0 })).data.find((x) => x.status !== 'cancelled');
    const files = () => s.sql.store.find('files', { tenantId: d.tenantId }).length;
    const before = files();
    const url = `/api/files?kind=pod&deliveryId=${d.id}&op=0123456789abcdef`;
    const a = await office.req('POST', url, JPEG, { 'Content-Type': 'image/jpeg' });
    const b = await office.req('POST', url, JPEG, { 'Content-Type': 'image/jpeg' });
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.equal(b.data.id, a.data.id, 'the replay answers with the first upload');
    assert.equal(files(), before + 1);
    assert.equal((await office.call('getDelivery', { id: d.id })).data.docs.filter((x) => x.fileId === a.data.id).length, 1);
    assert.equal(fs.readdirSync(path.join(dir, 'files', d.tenantId)).filter((f) => f.endsWith('.part')).length, 0, 'no temporary file left');
    const c = await office.req('POST', `/api/files?kind=pod&deliveryId=${d.id}`, JPEG, { 'Content-Type': 'image/jpeg' });
    assert.notEqual(c.data.id, a.data.id, 'without op every upload counts');
  } finally { await stop(); }
});

test('REST API lists newest first with offset, limit and updatedSince (list-1)', async () => {
  const { s, base, client, stop } = await boot();
  try {
    const admin = client();
    assert.equal((await admin.req('POST', '/api/auth/login', { email: 'it@rhein-main-kurier.de', password: 'Demo-Passwort-2026' })).status, 200);
    const key = (await admin.call('rotateApiKey')).data.apiKey;
    assert.match(key, /^lk_/);
    const get = async (q = '') => { const r = await fetch(base + '/api/v1/deliveries' + q, { headers: { Authorization: 'Bearer ' + key } }); return { status: r.status, total: Number(r.headers.get('x-total-count')), list: await r.json() }; };
    for (const [i, date] of ['2026-11-02', '2026-11-03', '2026-11-04'].entries()) {
      const r = await fetch(base + '/api/v1/deliveries', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ pickup: { city: 'Mainz', date }, dropoff: { city: 'Köln' }, reference: 'API-' + i }) });
      assert.equal(r.status, 201);
    }
    const all = await get();
    assert.equal(all.status, 200);
    assert.equal(all.total, all.list.length);
    assert.equal(all.list[0].reference, 'API-2', 'newest pickup first');
    const page = await get('?limit=2&offset=1');
    assert.deepEqual(page.list.map((d) => d.id), all.list.slice(1, 3).map((d) => d.id));
    assert.equal(page.total, all.total);
    const since = Math.max(...all.list.map((d) => d.updatedAt)) - 1;
    const recent = await get('?updatedSince=' + since);
    assert.ok(recent.list.length >= 1 && recent.list.every((d) => d.updatedAt > since));
    assert.equal((await get('?updatedSince=' + new Date(since + 10e3).toISOString())).list.length, 0);
    assert.equal((await get('?limit=abc')).list.length, Math.min(300, all.total), 'an invalid limit falls back to 300');
    void s;
  } finally { await stop(); }
});

test('export file names and ZIP times use the German date, whatever the time zone of the machine', () => {
  // 00:30 in Berlin on 17.10. is still the 16th in UTC
  assert.equal(exportFileName({ at: Date.parse('2026-10-16T22:30:00Z'), kind: 'pod', id: 'a/b', mime: 'image/jpeg' }), 'dateien/pod/2026-10-17_ab.jpg');
  assert.equal(exportFileName({ at: Date.parse('2026-01-01T22:59:00Z'), kind: 'cmr', id: 'x', mime: 'application/pdf' }), 'dateien/cmr/2026-01-01_x.pdf');
});

test('time windows follow the UI language when the view passes its t()', () => {
  const t = (k, v) => ({ 'ab {t}': 'from {t}', 'bis {t}': 'until {t}' }[k] || k).replace('{t}', v.t);
  assert.equal(window_({ from: '07:00' }, t), 'from 07:00');
  assert.equal(window_({ to: '16:00' }, t), 'until 16:00');
  assert.equal(window_({ from: '07:00', to: '09:00' }, t), '07:00–09:00');
  assert.equal(window_({ from: '07:00' }), 'ab 07:00', 'German without a dictionary');
});

test('i18n extractor collects the billing rules and reasons shown in the licensor console', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lk-keys-')), 'keys.json');
  execFileSync(process.execPath, [path.join(ROOT, 'tools', 'extract-i18n.js'), out], { stdio: 'pipe' });
  const keys = JSON.parse(fs.readFileSync(out, 'utf8'));
  for (const k of ['Monatsbeitrag', 'Monatsbeitrag – läuft während der Sperre weiter', 'Jahresbeitrag – Verlängerung', 'Einrichtung der White-Label-App']) assert.ok(keys[k], k);
  assert.ok(Object.keys(keys).some((k) => k.startsWith('Bezahlt ist eine Lizenz')), 'billing rules');
  assert.equal(keys['Zugestellt – ohne Lieferschein'], 'all', 'timeline text without a delivery note');
  assert.equal(keys['ab {t}'], 'all');
});
