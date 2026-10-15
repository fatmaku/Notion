// js/pair.js – the pairing page behind the QR code (pair.html): pure helpers (typed code, secret from the fragment,
// redirect target, error mapping, platform for the home-screen tip, language) and the DE / TR / EN text tables.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const P = require('../js/pair.js');

test('cleanCode / formatCode: digits only, at most 6, grouped 3 + 3 like in the panel', () => {
  assert.equal(P.cleanCode(' 123-456 '), '123456');
  assert.equal(P.cleanCode('12 34 56 78'), '123456');
  assert.equal(P.cleanCode(null), '');
  assert.equal(P.cleanCode('abc'), '');
  assert.equal(P.formatCode('123'), '123');
  assert.equal(P.formatCode('1234'), '123 4');
  assert.equal(P.formatCode('123456'), '123 456');
  assert.equal(P.formatCode('123 456 7'), '123 456');
});

test('parseSecret: only a plausible pairing secret from the fragment is used', () => {
  assert.equal(P.parseSecret('#abcdefghijklmnop'), 'abcdefghijklmnop');
  assert.equal(P.parseSecret('abcDEF0123_-xyzQ'), 'abcDEF0123_-xyzQ');
  assert.equal(P.parseSecret('#short'), '', 'too short');
  assert.equal(P.parseSecret('#abcdefghijklmnop<script>'), '', 'foreign characters');
  assert.equal(P.parseSecret(''), '');
  assert.equal(P.parseSecret(undefined), '');
  assert.equal(P.parseSecret(`#${'a'.repeat(129)}`), '', 'too long');
});

test('redirectTarget / nextKey: only our own pages, default the phone remote', () => {
  assert.equal(P.redirectTarget('/camera.html', 'mobile'), '/camera.html');
  assert.equal(P.redirectTarget('https://evil.example/', 'mobile'), '/mobile.html', 'never an outside address');
  assert.equal(P.redirectTarget('//evil.example', 'camera'), '/camera.html');
  assert.equal(P.redirectTarget(null, 'panel'), '/');
  assert.equal(P.redirectTarget(undefined, 'nonsense'), '/mobile.html');
  assert.equal(P.nextKey('camera'), 'camera');
  assert.equal(P.nextKey('__proto__'), 'mobile');
  assert.equal(P.nextKey(''), 'mobile');
});

test('errorKey: server codes and HTTP statuses map to a friendly state', () => {
  assert.equal(P.errorKey(0, null), 'network');
  assert.equal(P.errorKey(400, { error: 'invalid' }), 'invalid_code');
  assert.equal(P.errorKey(400, { error: 'invalid_code' }), 'invalid_code');
  for (const k of ['expired', 'used', 'locked', 'rate_limited', 'cross_origin']) assert.equal(P.errorKey(410, { error: k }), k);
  assert.equal(P.errorKey(429, null), 'rate_limited');
  assert.equal(P.errorKey(403, {}), 'cross_origin');
  assert.equal(P.errorKey(500, { error: 'boom' }), 'other');
});

test('platform: iPhone / iPad (also the desktop-class iPad UA) / Android / other', () => {
  assert.equal(P.platform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)', 5), 'ios');
  assert.equal(P.platform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 5), 'ios', 'iPadOS pretends to be a Mac');
  assert.equal(P.platform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 0), 'other', 'a real Mac');
  assert.equal(P.platform('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 5), 'android');
  assert.equal(P.platform('', 0), 'other');
});

test('pickLang: saved choice first, then the phone language, German by default', () => {
  assert.equal(P.pickLang('en', 'tr-TR'), 'en');
  assert.equal(P.pickLang('xx', 'tr-TR'), 'tr');
  assert.equal(P.pickLang(null, 'en-GB'), 'en');
  assert.equal(P.pickLang(null, 'fr-FR'), 'de');
  assert.equal(P.pickLang(null, undefined), 'de');
});

test('texts: DE / TR / EN have the same keys and every error state; pair.html uses only known keys', () => {
  const keys = (o) => Object.keys(o).sort();
  for (const l of ['tr', 'en']) {
    assert.deepEqual(keys(P.T[l]), keys(P.T.de), `${l}: same keys as de`);
    assert.deepEqual(keys(P.T[l].errors), keys(P.T.de.errors), `${l}: same error states as de`);
    for (const [k, v] of Object.entries(P.T[l].errors)) assert.ok(Array.isArray(v) && v.length === 2 && v.every((s) => s.length > 3), `${l}.errors.${k}: [title, text]`);
  }
  for (const k of ['expired', 'used', 'invalid_code', 'locked', 'rate_limited', 'cross_origin', 'network', 'other']) assert.ok(P.T.de.errors[k], `de.errors.${k}`);
  assert.match(P.T.de.errors.expired[1], /neuen QR-Code/, 'expired → show a new QR in the panel');
  const html = fs.readFileSync(path.join(__dirname, '..', 'pair.html'), 'utf8');
  const used = [...html.matchAll(/data-t="(\w+)"/g)].map((m) => m[1]);
  assert.ok(used.length > 10);
  for (const k of used) assert.equal(typeof P.T.de[k], 'string', `pair.html data-t="${k}" has a text`);
  assert.match(html, /<script src="\/js\/pair\.js"><\/script>/, 'one external script (works with a CSP of script-src \'self\')');
  assert.doesNotMatch(html, /<script>(?!<\/script>)/, 'no inline script');
  assert.doesNotMatch(html, /\son[a-z]+="/i, 'no inline event handlers');
});

// ---------------------------------------------------------------- sw.js and the pairing redirect

/** Runs sw.js in a fake worker scope: fetch answers per path, caches are Maps. */
function loadSw(answer) {
  const vm = require('vm');
  const handlers = {};
  const stores = new Map();
  const cacheOf = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    return { put: async (k, r) => void m.set(typeof k === 'string' ? k : new URL(k.url).pathname, r), match: async (k) => m.get(typeof k === 'string' ? k : new URL(k.url).pathname) };
  };
  class Req {
    constructor(u, o = {}) {
      this.url = new URL(u, 'http://pc.test').href;
      this.method = o.method || 'GET';
      this.mode = o.mode || 'cors';
    }
  }
  const resp = (path) => {
    const a = answer(path) || { status: 200 };
    const r = { ok: a.status >= 200 && a.status < 300, status: a.status, redirected: !!a.redirected, url: a.url || `http://pc.test${path}` };
    r.clone = () => ({ ...r });
    return r;
  };
  const self = {
    location: { search: '', origin: 'http://pc.test' },
    addEventListener: (t, fn) => (handlers[t] = fn),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  const ctx = {
    self,
    URL,
    URLSearchParams,
    Request: Req,
    Response: class {
      constructor(body, o) {
        this.status = o && o.status;
      }
    },
    caches: { open: async (n) => cacheOf(n), keys: async () => [...stores.keys()], delete: async (n) => stores.delete(n) },
    fetch: async (r) => resp(new URL(typeof r === 'string' ? r : r.url, 'http://pc.test').pathname),
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), ctx);
  return { handlers, stores, Req };
}

test('sw.js: a page the server answers with the pairing redirect is never cached under its own path', async () => {
  // a revoked device behind the tunnel: guarded pages are 302 → /p (fetch follows it: ok + redirected)
  const guarded = new Set(['/', '/index.html', '/mobile.html', '/camera.html', '/demo.html']);
  const sw = loadSw((p) => (guarded.has(p) ? { status: 200, redirected: true, url: 'http://pc.test/p?next=panel' } : p === '/overlay.html' ? { status: 401 } : { status: 200 }));
  let wait = null;
  sw.handlers.install({ waitUntil: (p) => (wait = p) });
  await wait;
  const [name] = [...sw.stores.keys()];
  assert.match(name, /^livefx-shell-v/);
  const cached = sw.stores.get(name);
  for (const p of guarded) assert.equal(cached.has(p), false, `${p} not cached as the pairing page`);
  assert.equal(cached.has('/overlay.html'), false, 'errors are not cached');
  for (const p of ['/pair.html', '/js/pair.js', '/js/mobile.js', '/mobile.webmanifest']) assert.equal(cached.has(p), true, `${p} precached`);
  // runtime refresh (cache first, background revalidation): a redirected answer does not replace the entry
  const before = cached.get('/js/mobile.js');
  const sw2 = loadSw(() => ({ status: 200, redirected: true, url: 'http://pc.test/p' }));
  sw2.stores.set(name, new Map([['/js/mobile.js', before]]));
  let responded = null;
  sw2.handlers.fetch({ request: new sw2.Req('/js/mobile.js'), respondWith: (p) => (responded = p) });
  assert.equal(await responded, before, 'cache hit served');
  await new Promise((r) => setImmediate(r));
  assert.equal(sw2.stores.get(name).get('/js/mobile.js'), before, 'redirected revalidation ignored');
  // a navigation whose fresh answer is a redirect is passed through, but not stored
  sw2.handlers.fetch({ request: new sw2.Req('/camera.html', { mode: 'navigate' }), respondWith: (p) => (responded = p) });
  const nav = await responded;
  assert.equal(nav.redirected, true);
  assert.equal(sw2.stores.get(name).has('/camera.html'), false);
});
