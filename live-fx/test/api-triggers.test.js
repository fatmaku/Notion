// Integration tests for GET/PUT /api/triggers and server/state.js persistence.
// Run: node --test "test/*.test.js"
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { startServer, api, sseClient } = require('./helpers/server');
require('../js/triggers.js');

const DEFAULTS = globalThis.LiveFXDefaultTriggers;
const DEFAULT_IDS = DEFAULTS.map((t) => t.id);

function readState(dataDir) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, 'triggers.json'), 'utf8'));
}

test('GET /api/triggers on a fresh data dir returns the merged defaults and seeds triggers.json', async () => {
  const server = await startServer();
  try {
    const r = await api(server.base, 'GET', '/api/triggers');
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.version, 2);
    assert.equal(r.json.triggers.length, DEFAULTS.length);
    assert.equal(r.json.triggers.length, 15);
    assert.deepEqual(
      r.json.triggers.map((t) => t.id),
      DEFAULT_IDS
    );
    assert.deepEqual(r.json.removed, []);
    assert.equal(typeof r.json.updatedAt, 'string');
    // Every trigger has the normalized v2 shape.
    for (const t of r.json.triggers) {
      assert.equal(typeof t.enabled, 'boolean');
      assert.equal(typeof t.cooldown, 'number');
      assert.ok(['card', 'image', 'banner', 'rain', 'confetti'].includes(t.visual.kind));
      assert.ok(['center', 'top', 'safe'].includes(t.visual.position));
    }
    // The file exists after first start so users can edit it by hand.
    const file = readState(server.dataDir);
    assert.equal(file.version, 2);
    assert.equal(file.triggers.length, DEFAULTS.length);
    assert.deepEqual(file.removed, []);
    assert.equal(file.updatedAt, r.json.updatedAt);
  } finally {
    await server.stop();
  }
});

test('PUT /api/triggers persists, normalizes, and survives a restart on the same data dir', async () => {
  const server = await startServer();
  let second = null;
  try {
    const before = (await api(server.base, 'GET', '/api/triggers')).json;
    const mine = {
      id: 'custom-hype',
      label: 'Hype',
      keywords: ['hype', 'HYPE', 'lets go'],
      sound: 'airhorn',
      visual: { kind: 'banner', position: 'top', text: 'HYPE', emoji: '🔥' },
    };
    const edited = { ...before.triggers.find((t) => t.id === 'wow'), label: 'Edited wow', enabled: false };
    const list = [mine, edited, ...before.triggers.filter((t) => t.id !== 'wow'), { id: 'bad id', sound: 'no sound!' }];
    const put = await api(server.base, 'PUT', '/api/triggers', { json: { triggers: list, removed: [] }, token: server.token });
    assert.equal(put.status, 200, put.text);
    assert.equal(put.json.ok, true);
    assert.equal(put.json.count, list.length);
    assert.ok(Array.isArray(put.json.warnings));
    assert.ok(put.json.warnings.some((w) => /invalid id/.test(w)));
    assert.ok(put.json.warnings.some((w) => /invalid sound/.test(w)));
    assert.equal(typeof put.json.updatedAt, 'string');
    assert.notEqual(put.json.updatedAt, before.updatedAt);

    const after = (await api(server.base, 'GET', '/api/triggers')).json;
    assert.equal(after.triggers.length, list.length);
    assert.equal(after.triggers[0].id, 'custom-hype');
    assert.deepEqual(after.triggers[0].keywords, ['hype', 'lets go']);
    assert.equal(after.triggers[1].label, 'Edited wow');
    assert.equal(after.triggers[1].enabled, false);
    assert.equal(after.triggers[after.triggers.length - 1].id, `custom-${list.length}`);
    assert.equal(after.updatedAt, put.json.updatedAt);

    // On disk.
    const file = readState(server.dataDir);
    assert.equal(file.version, 2);
    assert.equal(file.triggers.length, list.length);
    assert.equal(file.updatedAt, put.json.updatedAt);
    assert.ok(!fs.readdirSync(server.dataDir).some((f) => f.endsWith('.tmp')), 'no leftover tmp files');

    // A second server process on the same data dir sees the same data.
    second = await startServer({ env: { LIVEFX_DATA_DIR: server.dataDir } });
    const again = (await api(second.base, 'GET', '/api/triggers')).json;
    assert.deepEqual(again.triggers, after.triggers);
    assert.equal(again.updatedAt, put.json.updatedAt);
  } finally {
    if (second) await second.stop();
    await server.stop();
  }
});

test('PUT with a removed default keeps it removed; omitted removed list is derived', async () => {
  const server = await startServer();
  try {
    const all = (await api(server.base, 'GET', '/api/triggers')).json.triggers;

    // Explicit removed list.
    const withoutWow = all.filter((t) => t.id !== 'wow');
    let r = await api(server.base, 'PUT', '/api/triggers', { json: { triggers: withoutWow, removed: ['wow'] }, token: server.token });
    assert.equal(r.status, 200, r.text);
    let got = (await api(server.base, 'GET', '/api/triggers')).json;
    assert.equal(got.triggers.length, all.length - 1);
    assert.ok(!got.triggers.some((t) => t.id === 'wow'));
    assert.deepEqual(got.removed, ['wow']);
    assert.deepEqual(readState(server.dataDir).removed, ['wow']);

    // Omitted removed list -> derived from the missing default ids.
    const withoutTwo = all.filter((t) => t.id !== 'wow' && t.id !== 'lol');
    r = await api(server.base, 'PUT', '/api/triggers', { json: { triggers: withoutTwo }, token: server.token });
    assert.equal(r.status, 200, r.text);
    got = (await api(server.base, 'GET', '/api/triggers')).json;
    assert.equal(got.triggers.length, all.length - 2);
    assert.deepEqual(got.removed.slice().sort(), ['lol', 'wow']);

    // An explicit empty removed list lets the defaults come back (appended).
    r = await api(server.base, 'PUT', '/api/triggers', { json: { triggers: withoutTwo, removed: [] }, token: server.token });
    assert.equal(r.status, 200, r.text);
    got = (await api(server.base, 'GET', '/api/triggers')).json;
    assert.equal(got.triggers.length, all.length);
    assert.deepEqual(got.removed, []);
    assert.deepEqual(got.triggers.slice(-2).map((t) => t.id), ['wow', 'lol']);
  } finally {
    await server.stop();
  }
});

test('PUT rejects bad payloads', async () => {
  const server = await startServer();
  try {
    let r = await api(server.base, 'PUT', '/api/triggers', { json: { triggers: 'x' }, token: server.token });
    assert.equal(r.status, 400);
    assert.equal(r.json.error, 'invalid_triggers');

    r = await api(server.base, 'PUT', '/api/triggers', { json: { removed: [] }, token: server.token });
    assert.equal(r.status, 400);
    assert.equal(r.json.error, 'invalid_triggers');

    r = await api(server.base, 'PUT', '/api/triggers', { json: { triggers: [], removed: 'wow' }, token: server.token });
    assert.equal(r.status, 400);
    assert.equal(r.json.error, 'invalid_triggers');

    r = await api(server.base, 'PUT', '/api/triggers', { body: 'triggers=1', headers: { 'content-type': 'text/plain' }, token: server.token });
    assert.equal(r.status, 415);
    assert.equal(r.json.ok, false);

    r = await api(server.base, 'PUT', '/api/triggers', { body: '{"triggers": [', headers: { 'content-type': 'application/json' }, token: server.token });
    assert.equal(r.status, 400);
    assert.equal(r.json.error, 'bad_json');

    // Nothing was persisted by the rejected requests.
    const got = (await api(server.base, 'GET', '/api/triggers')).json;
    assert.equal(got.triggers.length, DEFAULTS.length);
  } finally {
    await server.stop();
  }
});

test('PUT broadcasts triggers-updated to SSE clients (overlay and panel)', async () => {
  const server = await startServer();
  try {
    const overlay = await sseClient(server.base, { role: 'overlay' });
    const panel = await sseClient(server.base, { role: 'panel' });
    await overlay.next('state');
    await panel.next('state');

    const put = await api(server.base, 'PUT', '/api/triggers', { json: { triggers: [{ id: 'only', keywords: ['nur'] }], removed: [] }, token: server.token });
    assert.equal(put.status, 200, put.text);

    const a = await overlay.next('triggers-updated');
    const b = await panel.next('triggers-updated');
    assert.equal(a.updatedAt, put.json.updatedAt);
    assert.equal(b.updatedAt, put.json.updatedAt);
    assert.equal(typeof a.id, 'string');
    assert.ok(Number.isFinite(a.ts));
    overlay.close();
    panel.close();
  } finally {
    await server.stop();
  }
});

test('corrupt triggers.json: server starts, serves defaults and backs the file up', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'livefx-corrupt-'));
  fs.writeFileSync(path.join(dir, 'triggers.json'), '{"version": 2, "triggers": [ this is not json');
  const server = await startServer({ env: { LIVEFX_DATA_DIR: dir } });
  try {
    const got = (await api(server.base, 'GET', '/api/triggers')).json;
    assert.equal(got.ok, true);
    assert.equal(got.triggers.length, DEFAULTS.length);
    const files = fs.readdirSync(dir);
    assert.ok(files.some((f) => /^triggers\.json\.corrupt-\d+$/.test(f)), `backup present: ${files.join(', ')}`);
    assert.ok(files.includes('triggers.json'), 'fresh triggers.json written');
    assert.equal(readState(dir).triggers.length, DEFAULTS.length);
    assert.match(server.logs().out, /unusable/);
  } finally {
    await server.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('triggers.json with an unexpected shape is backed up too; a bare array is accepted', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'livefx-shape-'));
  fs.writeFileSync(path.join(dir, 'triggers.json'), '"just a string"');
  let server = await startServer({ env: { LIVEFX_DATA_DIR: dir } });
  try {
    const got = (await api(server.base, 'GET', '/api/triggers')).json;
    assert.equal(got.triggers.length, DEFAULTS.length);
    assert.ok(fs.readdirSync(dir).some((f) => f.startsWith('triggers.json.corrupt-')));
  } finally {
    await server.stop();
  }

  fs.writeFileSync(path.join(dir, 'triggers.json'), JSON.stringify([{ id: 'legacy', keywords: ['alt'] }]));
  server = await startServer({ env: { LIVEFX_DATA_DIR: dir } });
  try {
    const got = (await api(server.base, 'GET', '/api/triggers')).json;
    // Bare array: stored as-is, missing defaults are merged back in (no removed list known).
    assert.equal(got.triggers[0].id, 'legacy');
    assert.equal(got.triggers.length, DEFAULTS.length + 1);
    assert.deepEqual(got.removed, []);
  } finally {
    await server.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
