// Tests for server/api-gift.js: auth, validation, tier selection, SSE gift + fire events.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, api, sseClient } = require('./helpers/server');

const auth = { token: 'test-token' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('/api/gift', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());
  const { base } = server;

  await t.test('auth required (401), bad amount -> 400', async () => {
    assert.equal((await api(base, 'POST', '/api/gift', { json: { platform: 'tiktok', user: 'x', amount: 5 } })).status, 401);
    const bad = await api(base, 'POST', '/api/gift', { ...auth, json: { platform: 'tiktok', user: 'x', amount: 'lots' } });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.error, 'invalid_amount');
    assert.equal((await api(base, 'POST', '/api/gift', { ...auth, json: { amount: -1 } })).status, 400);
  });

  await t.test('no tiers configured -> ok but not fired (reason no_tier), gift event still reaches panels', async () => {
    const panel = await sseClient(base, { role: 'panel' });
    t.after(() => panel.close());
    await panel.next('state');
    const r = await api(base, 'POST', '/api/gift', { ...auth, json: { platform: 'tiktok', user: 'Fan', amount: 50, gift: 'rose' } });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.fired, false);
    assert.equal(r.json.reason, 'no_tier');
    const ev = await panel.next('gift');
    assert.equal(ev.platform, 'tiktok');
    assert.equal(ev.user, 'Fan');
    assert.equal(ev.amount, 50);
    assert.equal(ev.gift, 'rose');
    assert.equal(ev.fired, null);
  });

  await t.test('tiers: highest min <= amount wins, below the lowest tier nothing fires, gifts ignore cooldowns', async () => {
    const put = await api(base, 'PUT', '/api/chat', { ...auth, json: { gifts: { tiers: [{ min: 1, trigger: 'lol' }, { min: 10, trigger: 'wow' }, { min: 100, trigger: 'money' }] } } });
    assert.equal(put.status, 200, put.text);
    assert.deepEqual(put.json.settings.gifts.tiers.map((x) => x.min), [1, 10, 100]);
    const overlay = await sseClient(base, { role: 'overlay' });
    const panel = await sseClient(base, { role: 'panel' });
    t.after(() => {
      overlay.close();
      panel.close();
    });
    await overlay.next('state');
    await panel.next('state');

    const cases = [
      [0.5, null, null],
      [1, 1, 'lol'],
      [9.99, 1, 'lol'],
      [10, 10, 'wow'],
      [99, 10, 'wow'],
      [100, 100, 'money'],
      [5000, 100, 'money'],
    ];
    for (const [amount, tier, trigger] of cases) {
      const r = await api(base, 'POST', '/api/gift', { ...auth, json: { platform: 'tiktok', user: 'Fan', amount, currency: 'EUR' } });
      assert.equal(r.status, 200, r.text);
      assert.equal(r.json.tier, tier, `amount ${amount} -> tier ${tier}`);
      assert.equal(r.json.trigger, trigger, `amount ${amount} -> trigger ${trigger}`);
      assert.equal(r.json.fired, !!trigger);
      const ev = await panel.next('gift');
      assert.equal(ev.amount, amount);
      assert.equal(ev.tier, tier);
      assert.equal(ev.fired, trigger);
      if (trigger) {
        const fire = await overlay.next('fire');
        assert.equal(fire.trigger.id, trigger);
        assert.equal(fire.source, 'gift:tiktok:Fan');
      }
    }
    // two gifts in a row for the same tier both fire (no cooldown for paid effects)
    await api(base, 'POST', '/api/gift', { ...auth, json: { platform: 'tiktok', user: 'Fan', amount: 1 } });
    await api(base, 'POST', '/api/gift', { ...auth, json: { platform: 'tiktok', user: 'Fan', amount: 1 } });
    await sleep(100);
    const fires = overlay.events.filter((e) => e.msg.type === 'fire' && e.msg.trigger.id === 'lol').length;
    assert.ok(fires >= 4, `lol fired ${fires} times (2 from the table + 2 back to back)`);
  });

  await t.test('tier pointing at a disabled trigger -> reason disabled; unknown trigger id -> reason unknown', async () => {
    const trig = (await api(base, 'GET', '/api/triggers')).json.triggers;
    const list = trig.map((x) => (x.id === 'lol' ? { ...x, enabled: false } : x));
    assert.equal((await api(base, 'PUT', '/api/triggers', { ...auth, json: { triggers: list } })).status, 200);
    const r = await api(base, 'POST', '/api/gift', { ...auth, json: { platform: 'tiktok', user: 'Fan', amount: 2 } });
    assert.equal(r.json.fired, false);
    assert.equal(r.json.reason, 'disabled');
    await api(base, 'PUT', '/api/chat', { ...auth, json: { gifts: { tiers: [{ min: 1, trigger: 'does-not-exist' }] } } });
    const r2 = await api(base, 'POST', '/api/gift', { ...auth, json: { platform: 'tiktok', user: 'Fan', amount: 2 } });
    assert.equal(r2.json.fired, false);
    assert.equal(r2.json.reason, 'unknown');
  });

  await t.test('gift settings persist in chat.json and come back after a restart', async () => {
    await api(base, 'PUT', '/api/chat', { ...auth, json: { gifts: { tiers: [{ min: 3, trigger: 'wow' }] } } });
    const file = JSON.parse(require('fs').readFileSync(require('path').join(server.dataDir, 'chat.json'), 'utf8'));
    assert.deepEqual(file.gifts.tiers, [{ min: 3, trigger: 'wow' }]);
    const again = await startServer({ env: { LIVEFX_DATA_DIR: server.dataDir } });
    try {
      const g = await api(again.base, 'GET', '/api/chat', auth);
      assert.deepEqual(g.json.settings.gifts.tiers, [{ min: 3, trigger: 'wow' }]);
      const r = await api(again.base, 'POST', '/api/gift', { ...auth, json: { platform: 'other', user: 'Z', amount: 4 } });
      assert.equal(r.json.fired, true);
      assert.equal(r.json.trigger, 'wow');
    } finally {
      again.proc.kill('SIGTERM'); // do not rm the shared data dir twice
      await sleep(200);
    }
  });
});
