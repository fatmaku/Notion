// TLS: LIVEFX_TLS_CERT/LIVEFX_TLS_KEY switch server.js to https; a half-configured pair exits with a
// German hint. A self-signed cert is generated with openssl (test is skipped when openssl is missing).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { startServer } = require('./helpers/server');

const SERVER = path.join(__dirname, '..', 'server.js');

function makeCert() {
  const probe = spawnSync('openssl', ['version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'livefx-tls-'));
  const cert = path.join(dir, 'livefx-cert.pem');
  const key = path.join(dir, 'livefx-key.pem');
  const r = spawnSync(
    'openssl',
    ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1', '-keyout', key, '-out', cert],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw new Error(`openssl req failed: ${r.stderr}`);
  }
  return { dir, cert, key };
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false, headers: { 'sec-fetch-site': 'same-origin' } }, (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (text += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(text);
          } catch (_) {
            /* not json */
          }
          resolve({ status: res.statusCode, headers: res.headers, json, text });
        });
      })
      .on('error', reject);
  });
}

/** Spawns server.js directly (the helper waits for a URL, which a failing start never prints). */
function runUntilExit(env, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [SERVER], {
      env: { ...process.env, PORT: '0', HOST: '127.0.0.1', LIVEFX_SMART_MOCK: '1', LIVEFX_TOKEN: 'test-token', ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => (out += d));
    proc.stderr.on('data', (d) => (err += d));
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      resolve({ code: null, out, err, timedOut: true });
    }, timeoutMs);
    proc.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ code, out, err, timedOut: false });
    });
  });
}

test('TLS via LIVEFX_TLS_CERT / LIVEFX_TLS_KEY', async (t) => {
  const pem = makeCert();
  if (!pem) {
    t.skip('openssl nicht gefunden – TLS-Test übersprungen');
    return;
  }
  t.after(() => fs.rmSync(pem.dir, { recursive: true, force: true }));
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'livefx-tls-data-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

  await t.test('server answers over https; /api/config says secure:true; /m device cookie carries Secure', async () => {
    const server = await startServer({ env: { LIVEFX_TLS_CERT: pem.cert, LIVEFX_TLS_KEY: pem.key }, https: true });
    t.after(() => server.stop());
    assert.ok(server.base.startsWith('https://'), server.base);
    assert.match(server.logs().out, /LiveFX läuft auf https:\/\//);
    const h = await httpsGet(`${server.base}/health`);
    assert.equal(h.status, 200);
    assert.equal(h.json.ok, true);
    const c = await httpsGet(`${server.base}/api/config`);
    assert.equal(c.status, 200, c.text);
    assert.equal(c.json.secure, true);
    assert.equal(c.json.port, Number(new URL(server.base).port));
    const m = await httpsGet(`${server.base}/m?token=test-token`);
    assert.equal(m.status, 302);
    assert.match(String(m.headers['set-cookie']), /^livefx_dev=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+; HttpOnly; SameSite=Lax; Path=\/; Max-Age=15552000; Secure$/);
  });

  await t.test('only LIVEFX_TLS_CERT set -> exit 1 within 5 s with a German hint', async () => {
    const r = await runUntilExit({ LIVEFX_TLS_CERT: pem.cert, LIVEFX_DATA_DIR: dataDir });
    assert.equal(r.timedOut, false, 'process did not exit');
    assert.notEqual(r.code, 0);
    assert.equal(r.code, 1);
    assert.match(r.err, /LIVEFX_TLS_CERT und LIVEFX_TLS_KEY müssen BEIDE gesetzt sein/);
    assert.match(r.err, /HANDY-HTTPS/);
  });

  await t.test('only LIVEFX_TLS_KEY set -> exit 1', async () => {
    const r = await runUntilExit({ LIVEFX_TLS_KEY: pem.key, LIVEFX_DATA_DIR: dataDir });
    assert.equal(r.code, 1);
    assert.match(r.err, /BEIDE gesetzt/);
  });

  await t.test('unreadable cert file -> exit 1 with the file name', async () => {
    const missing = path.join(pem.dir, 'does-not-exist.pem');
    const r = await runUntilExit({ LIVEFX_TLS_CERT: missing, LIVEFX_TLS_KEY: pem.key, LIVEFX_DATA_DIR: dataDir });
    assert.equal(r.code, 1);
    assert.match(r.err, /nicht lesbar/);
    assert.ok(r.err.includes(missing), r.err);
  });
});
