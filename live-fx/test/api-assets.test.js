// Unit tests for /api/assets (upload, list, delete, sanitizing, magic bytes, limits, auth).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, api } = require('./helpers/server');
require('../js/schema.js');

const { LIMITS, SAFE_NAME } = globalThis.LiveFXSchema;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

function makeWav(pcmBytes = 100) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(36 + pcmBytes, 4);
  header.write('WAVE', 8, 'latin1');
  header.write('fmt ', 12, 'latin1');
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(8000, 24); // sample rate
  header.writeUInt32LE(8000 * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36, 'latin1');
  header.writeUInt32LE(pcmBytes, 40);
  return Buffer.concat([header, Buffer.alloc(pcmBytes)]);
}

const WAV = makeWav();

function upload(base, name, body, extra = {}) {
  return api(base, 'POST', '/api/assets', {
    body,
    token: 'test-token',
    headers: { 'x-filename': name, 'content-type': 'application/octet-stream' },
    ...extra,
  });
}

test('assets API', async (t) => {
  const server = await startServer();
  const { base } = server;
  t.after(() => server.stop());

  await t.test('empty list', async () => {
    const r = await api(base, 'GET', '/api/assets');
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, { ok: true, assets: [] });
  });

  await t.test('upload png + wav, listed with type, served with headers', async () => {
    const p = await upload(base, 'meme.png', PNG);
    assert.equal(p.status, 200, p.text);
    assert.equal(p.json.asset.name, 'meme.png');
    assert.equal(p.json.asset.url, 'assets/meme.png');
    assert.equal(p.json.asset.type, 'image');
    assert.equal(p.json.asset.size, PNG.length);
    assert.ok(p.json.asset.mtime > 0);

    const w = await upload(base, 'boom.wav', WAV);
    assert.equal(w.status, 200, w.text);
    assert.equal(w.json.asset.type, 'sound');

    const list = await api(base, 'GET', '/api/assets');
    assert.deepEqual(
      list.json.assets.map((a) => [a.name, a.type, a.url]),
      [
        ['boom.wav', 'sound', 'assets/boom.wav'],
        ['meme.png', 'image', 'assets/meme.png'],
      ]
    );

    const png = await fetch(`${base}/assets/meme.png`);
    assert.equal(png.status, 200);
    assert.equal(png.headers.get('content-type'), 'image/png');
    assert.equal(png.headers.get('cache-control'), 'public, max-age=3600');
    assert.equal(Buffer.from(await png.arrayBuffer()).equals(PNG), true);

    const wav = await fetch(`${base}/assets/boom.wav`);
    assert.equal(wav.status, 200);
    assert.equal(wav.headers.get('content-type'), 'audio/wav');
    assert.equal(wav.headers.get('cache-control'), 'public, max-age=3600');
  });

  await t.test('name collision -> -2, -3', async () => {
    const r2 = await upload(base, 'meme.png', PNG);
    assert.equal(r2.status, 200);
    assert.equal(r2.json.asset.name, 'meme-2.png');
    const r3 = await upload(base, 'meme.png', PNG);
    assert.equal(r3.json.asset.name, 'meme-3.png');
  });

  await t.test('oversized body -> 413', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(LIMITS.assetBytes + 1 - PNG.length)]);
    let status;
    try {
      const r = await upload(base, 'big.png', big);
      status = r.status;
    } catch (e) {
      // The server may close the connection before the whole body is sent; fetch then rejects.
      status = 413;
    }
    assert.equal(status, 413);
  });

  await t.test('wrong magic bytes -> 415', async () => {
    const r = await upload(base, 'fake.png', Buffer.from('hello, this is not a png'));
    assert.equal(r.status, 415);
    assert.equal(r.json.error, 'unsupported_type');
    // extension family mismatch: png content with a .wav name
    const r2 = await upload(base, 'fake.wav', PNG);
    assert.equal(r2.status, 415);
  });

  await t.test('path parts stripped', async () => {
    const r = await upload(base, '../../x.png', PNG);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.asset.name, 'x.png');
    const r2 = await upload(base, '..\\..\\win.png', PNG);
    assert.equal(r2.json.asset.name, 'win.png');
  });

  await t.test('names are sanitized to SAFE_NAME', async () => {
    const r = await upload(base, 'Mein Meme (final).PNG', PNG);
    assert.equal(r.status, 200, r.text);
    assert.match(r.json.asset.name, SAFE_NAME);
    assert.ok(r.json.asset.name.endsWith('.png'));
    assert.ok(r.json.asset.name.startsWith('mein-meme'));
    assert.ok(!r.json.asset.name.includes(' '));
    assert.ok(!r.json.asset.name.includes('('));
    const long = `${'a'.repeat(200)}.png`;
    const r2 = await upload(base, long, PNG);
    assert.equal(r2.status, 200);
    assert.ok(r2.json.asset.name.length <= 100);
    assert.match(r2.json.asset.name, SAFE_NAME);
  });

  await t.test('bad file names -> 400', async () => {
    const noHeader = await api(base, 'POST', '/api/assets', { body: PNG, token: 'test-token', headers: { 'content-type': 'image/png' } });
    assert.equal(noHeader.status, 400);
    assert.equal(noHeader.json.error, 'bad_filename');
    const badExt = await upload(base, 'script.html', PNG);
    assert.equal(badExt.status, 400);
    assert.equal(badExt.json.error, 'bad_filename');
    const onlyExt = await upload(base, '.png', PNG);
    assert.equal(onlyExt.status, 400); // nothing usable left after sanitizing
    const empty = await upload(base, '   ', PNG);
    assert.equal(empty.status, 400);
  });

  await t.test('delete', async () => {
    const d = await api(base, 'DELETE', '/api/assets/meme-3.png', { token: 'test-token' });
    assert.equal(d.status, 200);
    assert.deepEqual(d.json, { ok: true });
    const gone = await fetch(`${base}/assets/meme-3.png`);
    assert.equal(gone.status, 404);
    const again = await api(base, 'DELETE', '/api/assets/meme-3.png', { token: 'test-token' });
    assert.equal(again.status, 404);
    assert.equal(again.json.error, 'not_found');
    const list = await api(base, 'GET', '/api/assets');
    assert.ok(!list.json.assets.some((a) => a.name === 'meme-3.png'));
  });

  await t.test('delete with traversal -> 400/404, never 500', async () => {
    const r = await api(base, 'DELETE', '/api/assets/..%2fx', { token: 'test-token' });
    assert.ok([400, 404].includes(r.status), `status ${r.status}`);
    const r2 = await api(base, 'DELETE', '/api/assets/..%2f..%2ftriggers.json', { token: 'test-token' });
    assert.ok([400, 404].includes(r2.status), `status ${r2.status}`);
  });

  await t.test('unauthenticated POST / DELETE -> 401', async () => {
    const r = await api(base, 'POST', '/api/assets', { body: PNG, headers: { 'x-filename': 'nope.png', 'content-type': 'image/png' } });
    assert.equal(r.status, 401);
    const d = await api(base, 'DELETE', '/api/assets/meme.png');
    assert.equal(d.status, 401);
    const still = await fetch(`${base}/assets/meme.png`);
    assert.equal(still.status, 200);
  });

  await t.test('same-origin browser request passes without token', async () => {
    const r = await api(base, 'POST', '/api/assets', {
      body: PNG,
      headers: { 'x-filename': 'browser.png', 'content-type': 'image/png', 'sec-fetch-site': 'same-origin' },
    });
    assert.equal(r.status, 200, r.text);
  });
});
