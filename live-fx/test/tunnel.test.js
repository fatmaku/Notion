// Internet remote (2.2): server/tunnel.js with a fake cloudflared, the /api/tunnel routes, the host guard
// and the download path (checksum verification, failure message with the manual link).
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawn } = require('child_process');
const { createTunnel, assetFor, extractFromTgz, sha256, URL_RE } = require('../server/tunnel');
const apiTunnel = require('../server/api-tunnel');
const { startServer, api } = require('./helpers/server');
const http = require('http');

/** Raw request with an explicit Host header (fetch/undici would overwrite it). Resolves {status, headers}. */
function rawGet(base, p, headers = {}, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(base + p);
    const req = http.request({ host: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: { ...(body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {}), ...headers } }, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const FAKE = path.join(__dirname, 'helpers', 'fake-cloudflared.js');
const FAKE_SH = path.join(__dirname, 'helpers', 'fake-cloudflared.sh');

/** Writes a fake cloudflared: prints a trycloudflare URL on stderr after `delay` ms and waits for SIGTERM. */
function writeFake({ url = 'https://lazy-otter-ab12.trycloudflare.com', delay = 50, exitCode = null } = {}) {
  fs.writeFileSync(
    FAKE,
    `#!/usr/bin/env node
'use strict';
const args = process.argv.slice(2);
process.stderr.write('INF Starting tunnel ' + args.join(' ') + '\\n');
${exitCode !== null ? `setTimeout(() => { process.stderr.write('ERR failed to connect\\n'); process.exit(${exitCode}); }, ${delay});` : `setTimeout(() => { process.stderr.write('INF +----+\\nINF |  ${url}  |\\nINF +----+\\n'); }, ${delay});`}
process.on('SIGTERM', () => process.exit(0));
setInterval(() => {}, 1000);
`
  );
  fs.writeFileSync(FAKE_SH, `#!/bin/sh\nexec "${process.execPath}" "${FAKE}" "$@"\n`, { mode: 0o755 });
  fs.chmodSync(FAKE_SH, 0o755);
  return FAKE_SH;
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'livefx-tunnel-'));
}

test.after(() => {
  for (const f of [FAKE, FAKE_SH]) fs.rmSync(f, { force: true });
});

test('assetFor maps platforms to the official release assets', () => {
  assert.deepStrictEqual(assetFor('linux', 'x64'), { name: 'cloudflared-linux-amd64', archive: null });
  assert.deepStrictEqual(assetFor('linux', 'arm64'), { name: 'cloudflared-linux-arm64', archive: null });
  assert.deepStrictEqual(assetFor('win32', 'x64'), { name: 'cloudflared-windows-amd64.exe', archive: null });
  assert.deepStrictEqual(assetFor('darwin', 'arm64'), { name: 'cloudflared-darwin-arm64.tgz', archive: 'tgz' });
  assert.deepStrictEqual(assetFor('darwin', 'x64'), { name: 'cloudflared-darwin-amd64.tgz', archive: 'tgz' });
  assert.strictEqual(assetFor('freebsd', 'x64'), null);
});

test('URL_RE finds the trycloudflare address inside cloudflared chatter', () => {
  const m = URL_RE.exec('2026-01-01 INF |  https://quick-fox-1234.trycloudflare.com   |');
  assert.strictEqual(m[0], 'https://quick-fox-1234.trycloudflare.com');
  assert.strictEqual(URL_RE.exec('https://evil.example.com/x.trycloudflare.com'), null);
});

test('fake cloudflared: idle → starting → online, URL + hostname parsed, stop kills the child → idle', async () => {
  const bin = writeFake({ url: 'https://brave-cat-9f.trycloudflare.com' });
  const dir = tmpDir();
  const seen = [];
  const tunnel = createTunnel({ dataDir: dir, getPort: () => 8790, log: () => {}, env: { PATH: '' }, binaryPath: bin });
  tunnel.onChange((s) => seen.push(s.status));
  assert.strictEqual(tunnel.status().status, 'idle');
  const startP = tunnel.start();
  assert.strictEqual(tunnel.status().status, 'starting');
  const s = await startP;
  assert.strictEqual(s.status, 'online');
  assert.strictEqual(s.url, 'https://brave-cat-9f.trycloudflare.com');
  assert.strictEqual(s.hostname, 'brave-cat-9f.trycloudflare.com');
  assert.ok(typeof s.since === 'string' && !Number.isNaN(Date.parse(s.since)));
  assert.strictEqual(s.binary, bin);
  const pid = tunnel.child.pid;
  assert.ok(pid > 0);
  // a second start while online is a no-op
  assert.strictEqual((await tunnel.start()).status, 'online');
  const stopped = await tunnel.stop();
  assert.strictEqual(stopped.status, 'idle');
  assert.strictEqual(stopped.url, null);
  await new Promise((r) => setTimeout(r, 300));
  assert.throws(() => process.kill(pid, 0), 'child process is gone after stop');
  assert.deepStrictEqual(seen, ['starting', 'online', 'idle']);
  await tunnel.dispose();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('fake cloudflared that exits before printing a URL → status error with the stderr tail', async () => {
  const bin = writeFake({ exitCode: 1, delay: 30 });
  const dir = tmpDir();
  const tunnel = createTunnel({ dataDir: dir, getPort: () => 8790, log: () => {}, env: { PATH: '' }, binaryPath: bin });
  const s = await tunnel.start();
  assert.strictEqual(s.status, 'error');
  assert.match(s.error, /beendet/);
  assert.match(s.error, /failed to connect/);
  assert.strictEqual(s.url, null);
  await tunnel.dispose();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('start timeout: no URL within startTimeoutMs → error, child killed', async () => {
  const bin = writeFake({ delay: 5000 });
  const dir = tmpDir();
  const tunnel = createTunnel({ dataDir: dir, getPort: () => 8790, log: () => {}, env: { PATH: '' }, binaryPath: bin, startTimeoutMs: 200 });
  const s = await tunnel.start();
  assert.strictEqual(s.status, 'error');
  assert.match(s.error, /keine Adresse/);
  await tunnel.dispose();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('tunnel dying while online → error state (not idle)', async () => {
  const bin = writeFake();
  const dir = tmpDir();
  const tunnel = createTunnel({ dataDir: dir, getPort: () => 8790, log: () => {}, env: { PATH: '' }, binaryPath: bin });
  const s = await tunnel.start();
  assert.strictEqual(s.status, 'online');
  const changed = new Promise((r) => tunnel.onChange((st) => st.status === 'error' && r(st)));
  process.kill(tunnel.child.pid, 'SIGKILL');
  const st = await changed;
  assert.match(st.error, /abgebrochen/);
  await tunnel.dispose();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('download: unreachable → German error with the exact manual download link; nothing spawned', async () => {
  const dir = tmpDir();
  const calls = [];
  const tunnel = createTunnel({
    dataDir: dir,
    log: () => {},
    env: { PATH: '' },
    platform: 'linux',
    arch: 'x64',
    fetch: async (url) => {
      calls.push(url);
      throw new Error('ENOTFOUND github.com');
    },
    spawn: () => {
      throw new Error('spawn must not be called');
    },
  });
  const s = await tunnel.start();
  assert.strictEqual(s.status, 'error');
  assert.match(s.error, /ENOTFOUND/);
  assert.ok(s.error.includes('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64'), s.error);
  assert.ok(s.error.includes(path.join(dir, 'bin')), 'tells where to put the binary');
  assert.strictEqual(s.manualUrl, 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64');
  assert.strictEqual(calls[0], s.manualUrl);
  await tunnel.dispose();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('download: verified against the published SHA-256, stored executable in <dataDir>/bin, then spawned', async () => {
  const dir = tmpDir();
  const body = Buffer.from(`#!/bin/sh\necho "INF https://dl-ok-1.trycloudflare.com" 1>&2\nsleep 5\n`);
  const hash = sha256(body);
  const fetched = [];
  const warnings = [];
  const tunnel = createTunnel({
    dataDir: dir,
    log: (...a) => warnings.push(a.join(' ')),
    env: { PATH: '' },
    platform: 'linux',
    arch: 'x64',
    getPort: () => 8790,
    fetch: async (url) => {
      fetched.push(url);
      if (url.endsWith('cloudflared-linux-amd64')) return { ok: true, status: 200, arrayBuffer: async () => body };
      if (url.endsWith('.sha256')) return { ok: true, status: 200, arrayBuffer: async () => Buffer.from(`${hash}  cloudflared-linux-amd64\n`) };
      return { ok: false, status: 404, arrayBuffer: async () => Buffer.alloc(0) };
    },
  });
  const s = await tunnel.start();
  assert.strictEqual(s.status, 'online', JSON.stringify(s));
  assert.strictEqual(s.url, 'https://dl-ok-1.trycloudflare.com');
  const bin = path.join(dir, 'bin', 'cloudflared');
  assert.strictEqual(s.binary, bin);
  assert.ok(fs.statSync(bin).mode & 0o100, 'executable bit set');
  assert.match(fs.readFileSync(`${bin}.sha256`, 'utf8'), new RegExp(`^${hash}`));
  assert.deepStrictEqual(s.checksum, { sha256: hash, verified: true });
  assert.ok(!warnings.some((w) => w.includes('keine Prüfsumme')), 'no unverified warning');
  await tunnel.stop();
  // second start reuses the stored binary (no download)
  const n = fetched.length;
  assert.strictEqual((await tunnel.start()).status, 'online');
  assert.strictEqual(fetched.length, n, 'no further downloads');
  await tunnel.dispose();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('download: corrupted bytes (checksum mismatch) are refused; missing checksum → recorded + warning', async () => {
  const dir = tmpDir();
  const body = Buffer.from('#!/bin/sh\nexit 0\n');
  const tunnel = createTunnel({
    dataDir: dir,
    log: () => {},
    env: { PATH: '' },
    platform: 'linux',
    arch: 'arm64',
    fetch: async (url) => {
      if (url.endsWith('cloudflared-linux-arm64')) return { ok: true, status: 200, arrayBuffer: async () => body };
      if (url.endsWith('.sha256')) return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('0'.repeat(64)) };
      return { ok: false, status: 404, arrayBuffer: async () => Buffer.alloc(0) };
    },
    spawn: () => {
      throw new Error('must not spawn a corrupted binary');
    },
  });
  const s = await tunnel.start();
  assert.strictEqual(s.status, 'error');
  assert.match(s.error, /beschädigt/);
  assert.ok(!fs.existsSync(path.join(dir, 'bin', 'cloudflared')), 'nothing stored');
  await tunnel.dispose();

  const warnings = [];
  const t2 = createTunnel({
    dataDir: dir,
    log: (...a) => warnings.push(a.join(' ')),
    env: { PATH: '' },
    platform: 'linux',
    arch: 'arm64',
    fetch: async (url) => {
      if (url.endsWith('cloudflared-linux-arm64')) return { ok: true, status: 200, arrayBuffer: async () => body };
      return { ok: false, status: 404, arrayBuffer: async () => Buffer.alloc(0) };
    },
    spawn: () => {
      throw new Error('stop here');
    },
  });
  const s2 = await t2.start();
  assert.strictEqual(s2.status, 'error'); // the fake spawn throws – we only care about the download step
  assert.ok(fs.existsSync(path.join(dir, 'bin', 'cloudflared')), 'binary stored');
  assert.match(fs.readFileSync(path.join(dir, 'bin', 'cloudflared.sha256'), 'utf8'), /unverifiziert/);
  assert.ok(warnings.some((w) => w.includes('keine Prüfsumme')), warnings.join('\n'));
  await t2.dispose();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('download: release notes checksum (GitHub API) is used when there is no .sha256 asset', async () => {
  const dir = tmpDir();
  const body = Buffer.from('#!/bin/sh\nexit 0\n');
  const hash = sha256(body);
  const tunnel = createTunnel({
    dataDir: dir,
    log: () => {},
    env: { PATH: '' },
    platform: 'win32',
    arch: 'x64',
    fetch: async (url) => {
      if (url.endsWith('cloudflared-windows-amd64.exe')) return { ok: true, status: 200, arrayBuffer: async () => body };
      if (url.includes('api.github.com')) return { ok: true, status: 200, arrayBuffer: async () => Buffer.from(JSON.stringify({ body: `## Checksums\n| cloudflared-windows-amd64.exe | ${hash} |\n| cloudflared-linux-amd64 | ${'1'.repeat(64)} |` })) };
      return { ok: false, status: 404, arrayBuffer: async () => Buffer.alloc(0) };
    },
    spawn: () => {
      throw new Error('stop here');
    },
  });
  await tunnel.start();
  assert.deepStrictEqual(tunnel.status().checksum, { sha256: hash, verified: true });
  assert.ok(fs.existsSync(path.join(dir, 'bin', 'cloudflared.exe')));
  await tunnel.dispose();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('extractFromTgz pulls the cloudflared file out of a gzipped tar (mac release)', () => {
  const content = Buffer.from('#!/bin/sh\necho mac\n');
  const header = Buffer.alloc(512);
  header.write('cloudflared', 0);
  header.write('0000755\0', 100);
  header.write('0000000\0', 108);
  header.write('0000000\0', 116);
  header.write(`${content.length.toString(8).padStart(11, '0')}\0`, 124);
  header.write('00000000000\0', 136);
  header.write('        ', 148);
  header[156] = '0'.charCodeAt(0);
  let sum = 0;
  for (const b of header) sum += b;
  header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
  const file = Buffer.alloc(Math.ceil(content.length / 512) * 512);
  content.copy(file);
  const tar = Buffer.concat([header, file, Buffer.alloc(1024)]);
  assert.strictEqual(extractFromTgz(zlib.gzipSync(tar)).toString(), content.toString());
  assert.throws(() => extractFromTgz(zlib.gzipSync(Buffer.alloc(1024))), /nicht im Archiv/);
});

test('guard: tunnel requests need a session cookie or a Bearer; /m, /p, /health, static code are open; LAN requests untouched', () => {
  const ctx = { token: 'secret-token-1' };
  const req = (headers, url = '/', method = 'GET') => ({ headers, url, method });
  assert.strictEqual(apiTunnel.guard(req({ host: '192.168.1.5:8787' }), ctx), null, 'LAN request passes');
  assert.strictEqual(apiTunnel.guard(req({ host: 'lazy-otter.trycloudflare.com' }, '/m?token=x'), ctx), null, '/m is open');
  assert.strictEqual(apiTunnel.guard(req({ host: 'lazy-otter.trycloudflare.com' }, '/health'), ctx), null);
  const blocked = apiTunnel.guard(req({ host: 'lazy-otter.trycloudflare.com' }, '/'), ctx);
  assert.strictEqual(blocked.status, 401);
  assert.strictEqual(blocked.code, 'tunnel_login');
  assert.strictEqual(apiTunnel.guard(req({ host: 'lazy-otter.trycloudflare.com', cookie: 'livefx=secret-token-1' }, '/'), ctx), null, 'cookie passes');
  assert.strictEqual(apiTunnel.guard(req({ host: 'lazy-otter.trycloudflare.com', cookie: 'livefx=wrong' }, '/mobile.html'), ctx).status, 401);
  assert.strictEqual(apiTunnel.guard(req({ host: 'lazy-otter.trycloudflare.com', authorization: 'Bearer secret-token-1' }, '/api/fire', 'POST'), ctx), null, 'bearer passes');
  assert.strictEqual(apiTunnel.guard(req({ host: '127.0.0.1:8787', 'cf-connecting-ip': '203.0.113.9' }, '/'), ctx).status, 401, 'cf-connecting-ip marks a tunnel request');
  assert.strictEqual(apiTunnel.guard(req({ host: 'lazy-otter.trycloudflare.com' }, '/m', 'POST'), ctx).status, 401, 'only GET /m is open');
  // 2.3: the pairing page, its POST and public static code are reachable without a session
  assert.strictEqual(apiTunnel.guard(req({ host: 'lazy-otter.trycloudflare.com' }, '/p'), ctx), null, '/p is open');
  assert.strictEqual(apiTunnel.guard(req({ host: 'lazy-otter.trycloudflare.com' }, '/api/pair', 'POST'), ctx), null, 'POST /api/pair is open');
  assert.strictEqual(apiTunnel.guard(req({ host: 'lazy-otter.trycloudflare.com' }, '/js/bus.js'), ctx), null, 'static code is public');
  assert.strictEqual(apiTunnel.guard(req({ host: 'lazy-otter.trycloudflare.com' }, '/api/triggers'), ctx).status, 401, 'data needs a session');
  assert.strictEqual(apiTunnel.guard(req({ host: 'lazy-otter.trycloudflare.com' }, '/events?role=panel'), ctx).status, 401, 'panel events need a session');
  const paired = { token: 'secret-token-1', pairing: { deviceFromRequest: (r) => (/livefx_dev=ok/.test(r.headers.cookie || '') ? { id: 'd1' } : null) } };
  assert.strictEqual(apiTunnel.guard(req({ host: 'lazy-otter.trycloudflare.com', cookie: 'livefx_dev=ok' }, '/api/triggers'), paired), null, 'paired device passes');
  assert.strictEqual(apiTunnel.guard(req({ host: 'lazy-otter.trycloudflare.com', cookie: 'livefx_dev=nope' }, '/api/triggers'), paired).status, 401);
});

test('allowHost / disallowHost edit LIVEFX_ALLOWED_HOSTS without losing the operator entries', () => {
  const prev = process.env.LIVEFX_ALLOWED_HOSTS;
  process.env.LIVEFX_ALLOWED_HOSTS = 'streamer.lan';
  apiTunnel.allowHost('abc.trycloudflare.com');
  assert.strictEqual(process.env.LIVEFX_ALLOWED_HOSTS, 'streamer.lan,abc.trycloudflare.com');
  apiTunnel.allowHost('abc.trycloudflare.com');
  assert.strictEqual(process.env.LIVEFX_ALLOWED_HOSTS, 'streamer.lan,abc.trycloudflare.com', 'no duplicates');
  apiTunnel.disallowHost('abc.trycloudflare.com');
  assert.strictEqual(process.env.LIVEFX_ALLOWED_HOSTS, 'streamer.lan');
  if (prev === undefined) delete process.env.LIVEFX_ALLOWED_HOSTS;
  else process.env.LIVEFX_ALLOWED_HOSTS = prev;
});

test('API: GET/POST /api/tunnel with the fake binary; phone link is an https pairing link; tunnel host accepted; stop; dies with the server', async () => {
  const bin = writeFake({ url: 'https://api-test-77.trycloudflare.com', delay: 30 });
  const server = await startServer({ env: { LIVEFX_CLOUDFLARED: bin } });
  const { base, token } = server;
  try {
    assert.strictEqual((await api(base, 'GET', '/api/tunnel')).status, 401, 'needs auth');
    let r = await api(base, 'GET', '/api/tunnel', { token });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.status, 'idle');
    assert.strictEqual(r.json.phoneUrl, null);
    assert.match(r.json.manualUrl, /^https:\/\/github\.com\/cloudflare\/cloudflared\/releases/);

    // before the tunnel is online its hostname is a bad host
    const hostCheck = await rawGet(base, '/health', { host: 'api-test-77.trycloudflare.com' });
    assert.strictEqual(hostCheck.status, 403, 'tunnel host rejected while offline');

    r = await api(base, 'POST', '/api/tunnel/start', { token });
    assert.strictEqual(r.status, 200, r.text);
    assert.strictEqual(r.json.status, 'online');
    assert.strictEqual(r.json.url, 'https://api-test-77.trycloudflare.com');
    assert.match(r.json.phoneUrl, /^https:\/\/api-test-77\.trycloudflare\.com\/p#[A-Za-z0-9_-]{20,}$/, 'pairing link on the tunnel base');
    assert.ok(!r.json.phoneUrl.includes(token), 'the master token is not part of the phone link');
    assert.match(r.json.pairing.code, /^\d{6}$/);
    assert.ok(Date.parse(r.json.pairing.expiresAt) > Date.now());
    assert.ok(r.json.since);
    const setup = await api(base, 'GET', '/api/setup', { token });
    assert.strictEqual(setup.json.tunnel.state, 'online');
    assert.strictEqual(setup.json.pairing.tunnelUrl, r.json.phoneUrl, 'setup and tunnel share the open pairing code');
    assert.strictEqual(setup.json.pairing.url, r.json.phoneUrl, 'tunnel online → pairing URL uses the tunnel base');
    assert.strictEqual(setup.json.tunnel.pairingUrl, r.json.phoneUrl);

    // the server's host guard now accepts the tunnel hostname (/health is open, / needs the cookie)
    const viaTunnel = await rawGet(base, '/health', { host: 'api-test-77.trycloudflare.com' });
    assert.strictEqual(viaTunnel.status, 200, 'tunnel host accepted while online');
    const panel = await rawGet(base, '/', { host: 'api-test-77.trycloudflare.com' });
    assert.strictEqual(panel.status, 302, 'panel through the tunnel needs a session → pairing page');
    assert.strictEqual(panel.headers.location, '/p?next=panel');
    assert.strictEqual(panel.headers['set-cookie'], undefined, 'no cookie handed out');
    const triggersNoAuth = await rawGet(base, '/api/triggers', { host: 'api-test-77.trycloudflare.com' });
    assert.strictEqual(triggersNoAuth.status, 401);
    assert.match(triggersNoAuth.text, /tunnel_login/);
    const bad = await rawGet(base, '/m?token=wrong', { host: 'api-test-77.trycloudflare.com' });
    assert.strictEqual(bad.status, 401);
    const m = await rawGet(base, `/m?token=${token}`, { host: 'api-test-77.trycloudflare.com' });
    assert.strictEqual(m.status, 302, 'legacy token handshake works through the tunnel');
    assert.match(String(m.headers['set-cookie'][0]), /^livefx_dev=.*; Secure$/, 'device cookie, Secure (the phone sees https)');
    const cookie = String(m.headers['set-cookie'][0]).split(';')[0];
    // pairing through the tunnel: the secret from phoneUrl redeems once
    const secret = r.json.phoneUrl.split('#')[1];
    const pairBody = JSON.stringify({ secret });
    const pair = await rawGet(base, '/api/pair', { host: 'api-test-77.trycloudflare.com', origin: 'https://api-test-77.trycloudflare.com', 'cf-connecting-ip': '203.0.113.7' }, 'POST', pairBody);
    assert.strictEqual(pair.status, 200, pair.text);
    assert.match(String(pair.headers['set-cookie'][0]), /^livefx_dev=.*; HttpOnly; SameSite=Lax; Path=\/; Max-Age=15552000; Secure$/);
    const pairedCookie = String(pair.headers['set-cookie'][0]).split(';')[0];
    assert.strictEqual((await rawGet(base, '/mobile.html', { host: 'api-test-77.trycloudflare.com', cookie: pairedCookie })).status, 200, 'paired via the tunnel');
    const reuse = await rawGet(base, '/api/pair', { host: 'api-test-77.trycloudflare.com', origin: 'https://api-test-77.trycloudflare.com', 'cf-connecting-ip': '203.0.113.8' }, 'POST', pairBody);
    assert.strictEqual(reuse.status, 400, 'single use');
    const mobile = await rawGet(base, '/mobile.html', { host: 'api-test-77.trycloudflare.com', cookie });
    assert.strictEqual(mobile.status, 200, 'mobile page with the cookie');
    const triggers = await rawGet(base, '/api/triggers', { host: 'api-test-77.trycloudflare.com', cookie });
    assert.strictEqual(triggers.status, 200);
    const fire = await rawGet(base, '/fire', { host: 'api-test-77.trycloudflare.com', origin: 'https://api-test-77.trycloudflare.com', 'sec-fetch-site': 'same-origin' }, 'POST', JSON.stringify({ type: 'volume', volume: 0.5 }));
    assert.strictEqual(fire.status, 401, 'same-origin alone (no cookie) is not enough through the tunnel');
    const fireOk = await rawGet(base, '/fire', { host: 'api-test-77.trycloudflare.com', origin: 'https://api-test-77.trycloudflare.com', 'sec-fetch-site': 'same-origin', cookie }, 'POST', JSON.stringify({ type: 'volume', volume: 0.5 }));
    assert.strictEqual(fireOk.status, 200, 'with the cookie the phone can send bus messages');

    r = await api(base, 'GET', '/api/tunnel', { token });
    assert.strictEqual(r.json.status, 'online');
    r = await api(base, 'POST', '/api/tunnel/stop', { token });
    assert.strictEqual(r.json.status, 'idle');
    assert.strictEqual(r.json.url, null);
    const after = await rawGet(base, '/health', { host: 'api-test-77.trycloudflare.com' });
    assert.strictEqual(after.status, 403, 'tunnel host rejected again after stop');

    // start again, then the server goes down → the fake cloudflared must be gone too
    r = await api(base, 'POST', '/api/tunnel/start', { token });
    assert.strictEqual(r.json.status, 'online');
  } finally {
    await server.stop();
  }
  await new Promise((r) => setTimeout(r, 500));
  const left = await new Promise((resolve) => {
    const ps = spawn('ps', ['-eo', 'args']);
    let out = '';
    ps.stdout.on('data', (d) => (out += d));
    ps.on('close', () => resolve(out));
    ps.on('error', () => resolve(''));
  });
  assert.ok(!left.includes('fake-cloudflared.js tunnel'), 'fake cloudflared died with the server');
});
