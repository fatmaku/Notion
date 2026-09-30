// Unit tests for server/api-transcript.js: external ASR push reaches panels only.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, api, sseClient } = require('./helpers/server');

test('POST /api/transcript', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());
  const { base } = server;
  const auth = { token: 'test-token' };

  await t.test('without auth -> 401', async () => {
    const r = await api(base, 'POST', '/api/transcript', { json: { text: 'hallo' } });
    assert.equal(r.status, 401);
  });

  await t.test('panel receives the transcript, overlay does not', async () => {
    const panel = await sseClient(base, { role: 'panel' });
    const overlay = await sseClient(base, { role: 'overlay' });
    t.after(() => {
      panel.close();
      overlay.close();
    });
    await panel.next('state');
    await overlay.next('state');

    const r = await api(base, 'POST', '/api/transcript', { json: { text: 'oh nein das war ein fail' }, ...auth });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.panels, 1);

    const msg = await panel.next('transcript');
    assert.equal(msg.type, 'transcript');
    assert.equal(msg.text, 'oh nein das war ein fail');
    assert.equal(msg.final, true);
    assert.equal(msg.source, 'Extern');
    assert.equal(typeof msg.id, 'string');
    assert.equal(typeof msg.ts, 'number');

    await new Promise((r2) => setTimeout(r2, 300));
    assert.ok(!overlay.events.some((e) => e.msg.type === 'transcript'), 'overlay must not receive transcripts');
  });

  await t.test('final:false, lang and source are passed through (and truncated)', async () => {
    const panel = await sseClient(base, { role: 'panel' });
    t.after(() => panel.close());
    await panel.next('state');
    const r = await api(base, 'POST', '/api/transcript', {
      json: { text: '  ich hab  ', final: false, lang: 'de-DE-extra-long', source: 'x'.repeat(100) },
      ...auth,
    });
    assert.equal(r.status, 200, r.text);
    const msg = await panel.next('transcript');
    assert.equal(msg.text, 'ich hab');
    assert.equal(msg.final, false);
    assert.equal(msg.lang, 'de-DE-extr');
    assert.equal(msg.source, 'x'.repeat(80));
  });

  await t.test('empty text -> 400 invalid_text', async () => {
    for (const text of ['', '   ', 42, null, undefined]) {
      const r = await api(base, 'POST', '/api/transcript', { json: { text }, ...auth });
      assert.equal(r.status, 400, JSON.stringify(text));
      assert.equal(r.json.error, 'invalid_text');
    }
  });

  await t.test('text > 2000 chars -> 400 invalid_text', async () => {
    const r = await api(base, 'POST', '/api/transcript', { json: { text: 'a'.repeat(2001) }, ...auth });
    assert.equal(r.status, 400);
    assert.equal(r.json.error, 'invalid_text');
    const ok = await api(base, 'POST', '/api/transcript', { json: { text: 'a'.repeat(2000) }, ...auth });
    assert.equal(ok.status, 200);
  });

  await t.test('same-origin browser call works without token', async () => {
    const r = await api(base, 'POST', '/api/transcript', { json: { text: 'hallo' }, headers: { 'sec-fetch-site': 'same-origin' } });
    assert.equal(r.status, 200, r.text);
  });
});
