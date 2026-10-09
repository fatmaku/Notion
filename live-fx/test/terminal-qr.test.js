// server/terminal-qr.js (2.3): the start window prints the phone pairing link as a QR code (▀▄█ half blocks or
// ASCII "##"). Every rendering is read back into a module matrix and decoded with the independent reference
// decoder of test/qr.test.js (loaded from that file, not copied), so what the terminal shows really scans.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const T = require('../server/terminal-qr');
const QR = require('../js/qr.js');
const { startServer, api } = require('./helpers/server');

/** decode() + readFormat() from test/qr.test.js, evaluated with a no-op `node:test` so its tests do not run twice. */
function referenceDecoder() {
  const file = path.join(__dirname, 'qr.test.js');
  const src = `${fs.readFileSync(file, 'utf8')}\n;module.exports = { decode, readFormat };`;
  const mod = { exports: {} };
  const noop = () => {};
  noop.before = noop.after = noop.beforeEach = noop.afterEach = noop.describe = noop.it = noop;
  const localRequire = (id) => (id === 'node:test' ? noop : id.startsWith('.') ? require(path.join(__dirname, id)) : require(id));
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', '__dirname', '__filename', src)(localRequire, mod, mod.exports, __dirname, file);
  return mod.exports;
}
const { decode, readFormat } = referenceDecoder();

/** Rendered block → payload text via the reference decoder. */
function scan(block, opts) {
  const m = T.parse(block, opts);
  const qr = { version: (m.size - 17) / 4, size: m.size, modules: m.modules };
  assert.ok(Number.isInteger(qr.version) && qr.version >= 1, `size ${m.size} is a QR size`);
  qr.mask = readFormat(qr).mask;
  return decode(qr).text;
}

const LAN = 'http://192.168.178.23:8787/p#Q2hlY2tUaGlzU2VjcmV0';
const TUNNEL = 'https://lazy-otter-brave-cat-9f.trycloudflare.com/p?next=camera#Q2hlY2tUaGlzU2VjcmV0';
const MODES = [
  { mode: 'unicode' },
  { mode: 'unicode', color: true },
  { mode: 'unicode', invert: true },
  { mode: 'ascii' },
  { mode: 'ascii', color: true },
  { mode: 'ascii', invert: true },
];

test('reference decoder is the one from test/qr.test.js', () => {
  assert.equal(decode(QR.encode('HELLO WORLD')).text, 'HELLO WORLD');
});

test('every rendering mode decodes back to the pairing link (LAN + tunnel)', () => {
  for (const text of [LAN, TUNNEL]) {
    for (const o of MODES) {
      const block = T.render(text, { ...o, indent: '    ' });
      assert.equal(scan(block, { ...o, indent: '    ' }), text, `${JSON.stringify(o)}: ${text}`);
    }
  }
});

test('half-block layout: (size+4)/2 rows, only ▀▄█ and spaces, quiet zone of 2 modules', () => {
  const q = QR.encode(LAN);
  const block = T.render(LAN, {});
  const rows = block.split('\n');
  assert.equal(rows.length, Math.ceil((q.size + 4) / 2), `${rows.length} lines for a ${q.size}-module code`);
  for (const r of rows) {
    assert.equal(Array.from(r).length, q.size + 4);
    assert.match(r, /^[▀▄█ ]+$/u);
  }
  // no colour → glyphs draw LIGHT modules (dark terminals): the quiet-zone rows are solid blocks
  assert.match(rows[0], /^█+$/u, 'top quiet zone (2 light rows) = full blocks');
  assert.ok(rows.every((r) => r.startsWith('██') && r.endsWith('██')), 'two light columns left and right');
  // the finder pattern (dark ring) shows up as gaps on a dark terminal
  assert.equal(rows[1].slice(2, 9), ' ▄▄▄▄▄ ');
  // invert → glyphs draw dark modules (light terminals), the quiet zone is blank
  const inv = T.render(LAN, { invert: true }).split('\n');
  assert.match(inv[0], /^ +$/);
  assert.equal(inv[1].slice(2, 9), '█▀▀▀▀▀█');
});

test('colour: every line is black on white and reset, glyphs = dark modules; ASCII = "##" per module', () => {
  const block = T.render(LAN, { color: true, indent: '  ' });
  for (const line of block.split('\n')) {
    assert.ok(line.startsWith(`  ${T.COLOR_ON}`), JSON.stringify(line.slice(0, 20)));
    assert.ok(line.endsWith(T.COLOR_OFF));
  }
  const q = QR.encode(LAN);
  const ascii = T.render(LAN, { mode: 'ascii' }).split('\n');
  assert.equal(ascii.length, q.size + 4);
  for (const r of ascii) {
    assert.equal(r.length, (q.size + 4) * 2);
    assert.match(r, /^(##|  )+$/);
  }
  assert.ok(!/[▀▄█]/u.test(ascii.join('')), 'pure ASCII');
});

test('options(): LIVEFX_NO_QR, LIVEFX_QR_ASCII, legacy Windows console, TTY colour, NO_COLOR, LIVEFX_QR_INVERT', () => {
  const tty = { isTTY: true };
  const pipe = { isTTY: false };
  assert.deepEqual(T.options({ env: {}, stream: tty, platform: 'linux', release: '6.1.0' }), { enabled: true, mode: 'unicode', color: true, invert: false });
  assert.equal(T.options({ env: {}, stream: pipe, platform: 'linux' }).color, false, 'piped: no escape codes');
  assert.equal(T.options({ env: { NO_COLOR: '' }, stream: tty, platform: 'linux' }).color, false);
  assert.equal(T.options({ env: { LIVEFX_NO_QR: '1' }, stream: tty }).enabled, false);
  assert.equal(T.options({ env: { LIVEFX_QR_ASCII: '1' }, stream: tty, platform: 'linux' }).mode, 'ascii');
  assert.equal(T.options({ env: {}, stream: tty, platform: 'win32', release: '6.1.7601' }).mode, 'ascii', 'Windows 7 console');
  assert.equal(T.options({ env: {}, stream: tty, platform: 'win32', release: '10.0.22631' }).mode, 'unicode', 'Windows 10/11');
  assert.equal(T.options({ env: { TERM: 'dumb' }, stream: tty, platform: 'linux' }).mode, 'ascii');
  assert.equal(T.options({ env: { LIVEFX_QR_INVERT: 'yes' }, stream: pipe }).invert, true);
  assert.equal(T.isLegacyWindowsConsole('linux', '3.0'), false);
});

/** The QR block between the "Handy koppeln" line and the "Oder am Handy" line of the start banner. */
function bannerQr(out) {
  const lines = out.split('\n');
  const start = lines.findIndex((l) => l.includes('📱 Handy koppeln'));
  const end = lines.findIndex((l, i) => i > start && l.includes('Oder am Handy'));
  assert.ok(start !== -1 && end > start + 5, `QR block in the banner:\n${out}`);
  return { block: lines.slice(start + 1, end).join('\n'), info: lines[end] };
}

test('start banner: the printed QR is a working pairing link on the LAN address (or a clear hint without LAN)', async (t) => {
  const server = await startServer({ env: { HOST: '0.0.0.0' } });
  t.after(() => server.stop());
  const out = server.logs().out;
  assert.match(out, /LiveFX läuft auf http:\/\/127\.0\.0\.1:\d+\//, 'local panel URL first (helpers / users rely on it)');
  assert.match(out, /Anderes Netz\? Im Panel auf ‚Internet-Link‘ klicken/);
  if (/kein WLAN\/LAN gefunden/.test(out)) {
    t.diagnostic('no LAN address on this machine – banner shows the hint instead of a QR code');
    return;
  }
  const { block, info } = bannerQr(out);
  const url = scan(block, { mode: 'unicode', indent: '    ' }); // piped stdout: no colour, dark-terminal polarity
  const port = new URL(server.base).port;
  assert.match(url, new RegExp(`^http://\\d+\\.\\d+\\.\\d+\\.\\d+:${port}/p#[A-Za-z0-9_-]{22}$`), url);
  assert.ok(!url.includes(server.token), 'the token is not in the QR code');
  const m = /Code (\d{3}) (\d{3}) eingeben \(gültig 10 Minuten\)/.exec(info);
  assert.ok(m, info);
  assert.ok(info.includes(`${url.split('#')[0]}`), 'typed fallback URL /p');
  const obs = new RegExp(`OBS auf einem anderen PC: http://\\d+\\.\\d+\\.\\d+\\.\\d+:${port}/overlay\\.html\\?key=[A-Za-z0-9]{20}`);
  assert.match(out, obs, 'overlay address for a second PC carries the real port and the key');
  // the QR secret really pairs a phone (once)
  const secret = url.split('#')[1];
  const pair = () => api(server.base, 'POST', '/api/pair', { json: { secret }, headers: { origin: server.base } });
  const first = await pair();
  assert.equal(first.status, 200, first.text);
  assert.match(first.headers.get('set-cookie'), /^livefx_dev=/);
  assert.equal((await pair()).status, 400, 'single use');
});

test('start banner: LIVEFX_NO_QR=1 prints no code; LIVEFX_QR_ASCII=1 prints "##" blocks', async (t) => {
  const noQr = await startServer({ env: { HOST: '0.0.0.0', LIVEFX_NO_QR: '1' } });
  t.after(() => noQr.stop());
  assert.ok(!/[▀▄█]/u.test(noQr.logs().out), 'no blocks');
  if (/kein WLAN\/LAN gefunden/.test(noQr.logs().out)) return;
  assert.match(noQr.logs().out, /Code \d{3} \d{3} eingeben/, 'the typed code is still shown');
  const ascii = await startServer({ env: { HOST: '0.0.0.0', LIVEFX_QR_ASCII: '1' } });
  t.after(() => ascii.stop());
  const { block } = bannerQr(ascii.logs().out);
  assert.match(block, /##/);
  assert.match(scan(block, { mode: 'ascii', indent: '    ' }), /\/p#[A-Za-z0-9_-]{22}$/);
});
