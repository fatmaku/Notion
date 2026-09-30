// Unit + integration tests for smart mode (server/smart.js, server/api-smart.js). No live API calls.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

require('../js/triggers.js');
require('../js/schema.js');
require('../js/matcher.js');
const { createSmart, isSdkErrorLike } = require('../server/smart');
const { HttpError } = require('../server/router');
const { startServer, api } = require('./helpers/server');

const FIXTURE = [
  { id: 'wow', label: 'Wow', hint: 'streamer is stunned', keywords: ['krass', 'wow', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] },
  { id: 'fail', label: 'Fail', keywords: ['oh nein'] },
  { id: 'off', label: 'Aus', keywords: ['aus'], enabled: false },
  { id: 'alpha', label: 'Alpha', keywords: [] },
];

function withEnv(vars, fn) {
  const saved = {};
  for (const k of Object.keys(vars)) {
    saved[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  const restore = () => {
    for (const k of Object.keys(vars)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  };
  return Promise.resolve()
    .then(fn)
    .finally(restore);
}

async function rejectsHttp(promise, status, code) {
  try {
    await promise;
  } catch (e) {
    assert.ok(e instanceof HttpError, `expected HttpError, got ${e && e.stack}`);
    assert.equal(e.status, status);
    if (code) assert.equal(e.code, code);
    return e;
  }
  assert.fail(`expected rejection ${status} ${code || ''}`);
}

function parseWith(result) {
  const calls = [];
  const parse = async (request, options) => {
    calls.push({ request, options });
    if (typeof result === 'function') return result(request, options);
    return result;
  };
  parse.calls = calls;
  return parse;
}

async function make(opts = {}) {
  const s = createSmart({ model: 'test-model', getTriggers: () => FIXTURE, log: () => {}, ...opts });
  await s.init();
  return s;
}

test('buildRequest shape (unit, parse mode uses the plain JSON-schema format)', async () => {
  const s = await make({ parse: parseWith({ parsed_output: null, stop_reason: 'end_turn' }) });
  const r1 = s.buildRequest('bitte trigger:wow', FIXTURE, 'de-DE');
  const r2 = s.buildRequest('ganz anderer text', FIXTURE, 'en-US');

  assert.equal(r1.model, 'test-model');
  assert.equal(r1.max_tokens, 400);
  assert.equal(r1.system.length, 2);
  assert.equal(r1.system[0].type, 'text');
  assert.equal(r1.system[0].cache_control, undefined);
  assert.deepEqual(r1.system[1].cache_control, { type: 'ephemeral' });
  assert.equal(r1.output_config.effort, 'low');
  assert.equal(r1.output_config.format.type, 'json_schema');
  assert.deepEqual(r1.output_config.format.schema.required, ['triggerId', 'confidence']);
  assert.equal(r1.messages[0].role, 'user');
  assert.match(r1.messages[0].content, /^Utterance \(de-DE\): "bitte trigger:wow"$/);
  assert.match(r2.messages[0].content, /^Utterance \(en-US\):/);
  assert.match(s.buildRequest('x', FIXTURE).messages[0].content, /^Utterance \(auto\):/);
  assert.ok(/German/.test(r1.system[0].text) && /null/.test(r1.system[0].text));

  // Catalog: byte-identical, sorted by id, only enabled triggers, <= 8 keywords.
  assert.equal(r1.system[1].text, r2.system[1].text);
  const lines = r1.system[1].text.split('\n');
  assert.deepEqual(
    lines.map((l) => l.split(' | ')[0]),
    ['alpha', 'fail', 'wow']
  );
  const wow = lines.find((l) => l.startsWith('wow'));
  assert.equal(wow, 'wow | Wow | streamer is stunned | krass, wow, a, b, c, d, e, f');
  assert.equal(lines.find((l) => l.startsWith('fail')), 'fail | Fail |  | oh nein');
  assert.ok(!lines.some((l) => l.startsWith('off')));

  // Long text is cut to 300 chars in the prompt.
  const long = s.buildRequest('x'.repeat(500), FIXTURE).messages[0].content;
  assert.ok(long.length < 330);
});

test('model comes from LIVEFX_MODEL when not passed', async () => {
  await withEnv({ LIVEFX_MODEL: 'env-model' }, async () => {
    const s = createSmart({ getTriggers: () => FIXTURE, parse: parseWith({}) });
    assert.equal(s.model, 'env-model');
    assert.equal(s.buildRequest('a', FIXTURE).model, 'env-model');
  });
  await withEnv({ LIVEFX_MODEL: undefined }, async () => {
    const s = createSmart({ getTriggers: () => FIXTURE, parse: parseWith({}) });
    assert.equal(s.model, 'claude-opus-5-5');
  });
});

test('result mapping through injected parse', async (t) => {
  await t.test('confidence clamped, known id kept', async () => {
    const s = await make({ parse: parseWith({ parsed_output: { triggerId: 'wow', confidence: 1.7 }, stop_reason: 'end_turn' }) });
    const r = await s.classify('das ist so krass', { lang: 'de-DE' });
    assert.equal(r.triggerId, 'wow');
    assert.equal(r.confidence, 1);
    assert.equal(r.cached, false);
    assert.equal(r.model, 'test-model');
    assert.equal(typeof r.ms, 'number');
    assert.equal(s.stats.calls, 1);
  });
  await t.test('negative confidence -> 0', async () => {
    const s = await make({ parse: parseWith({ parsed_output: { triggerId: 'wow', confidence: -3 }, stop_reason: 'end_turn' }) });
    assert.equal((await s.classify('a b c')).confidence, 0);
  });
  await t.test('unknown id -> null', async () => {
    const s = await make({ parse: parseWith({ parsed_output: { triggerId: 'nope', confidence: 0.9 }, stop_reason: 'end_turn' }) });
    assert.deepEqual(await s.classify('a b c').then(({ triggerId, confidence }) => ({ triggerId, confidence })), { triggerId: null, confidence: 0 });
  });
  await t.test('disabled id -> null', async () => {
    const s = await make({ parse: parseWith({ parsed_output: { triggerId: 'off', confidence: 0.9 }, stop_reason: 'end_turn' }) });
    assert.equal((await s.classify('a b c')).triggerId, null);
  });
  await t.test('parsed_output null -> null/0', async () => {
    const s = await make({ parse: parseWith({ parsed_output: null, stop_reason: 'end_turn' }) });
    const r = await s.classify('a b c');
    assert.equal(r.triggerId, null);
    assert.equal(r.confidence, 0);
  });
  await t.test('refusal -> null/0', async () => {
    const s = await make({ parse: parseWith({ parsed_output: { triggerId: 'wow', confidence: 1 }, stop_reason: 'refusal' }) });
    const r = await s.classify('a b c');
    assert.equal(r.triggerId, null);
    assert.equal(r.confidence, 0);
  });
  await t.test('parse receives timeout + maxRetries 0', async () => {
    const parse = parseWith({ parsed_output: null });
    const s = await make({ parse, timeoutMs: 1234 });
    await s.classify('a b c');
    assert.equal(parse.calls[0].options.timeout, 1234);
    assert.equal(parse.calls[0].options.maxRetries, 0);
  });
});

test('input validation', async () => {
  const s = await make({ parse: parseWith({ parsed_output: null }) });
  await rejectsHttp(s.classify(''), 400, 'invalid_text');
  await rejectsHttp(s.classify('   '), 400, 'invalid_text');
  await rejectsHttp(s.classify(42), 400, 'invalid_text');
  await rejectsHttp(s.classify('x'.repeat(2001)), 400, 'invalid_text');
});

test('timeout -> 504 within ~1.6 s', async () => {
  const s = await make({ parse: () => new Promise(() => {}), timeoutMs: 1500 });
  const started = Date.now();
  await rejectsHttp(s.classify('never answers'), 504, 'timeout');
  const took = Date.now() - started;
  assert.ok(took >= 1400 && took < 1700, `took ${took} ms`);
  assert.equal(s.stats.timeouts, 1);
  assert.equal(s.stats.errors, 1);
  // The in-flight slot is released after the timeout.
  const s2 = await make({ parse: parseWith({ parsed_output: null }) });
  assert.equal((await s2.classify('after timeout')).triggerId, null);
});

test('second concurrent call -> 429 busy', async () => {
  let release;
  const parse = () => new Promise((r) => (release = () => r({ parsed_output: { triggerId: 'wow', confidence: 0.8 } })));
  const s = await make({ parse });
  const first = s.classify('erste anfrage');
  await new Promise((r) => setImmediate(r));
  await rejectsHttp(s.classify('zweite anfrage'), 429, 'busy');
  release();
  assert.equal((await first).triggerId, 'wow');
});

test('31st call within a minute -> 429 rate_limited', async () => {
  const s = await make({ parse: parseWith({ parsed_output: null }), maxPerMinute: 30 });
  for (let i = 0; i < 30; i++) await s.classify(`text nummer ${i}`);
  await rejectsHttp(s.classify('text nummer 31'), 429, 'rate_limited');
  // Cached results do not consume the bucket.
  assert.equal((await s.classify('text nummer 3')).cached, true);
});

test('cache: repeated (normalized) text -> cached:true, parse called once', async () => {
  const parse = parseWith({ parsed_output: { triggerId: 'wow', confidence: 0.7 } });
  const s = await make({ parse });
  const a = await s.classify('Das ist KRASS!');
  const b = await s.classify('das ist krass');
  assert.equal(a.cached, false);
  assert.equal(b.cached, true);
  assert.equal(b.triggerId, 'wow');
  assert.equal(parse.calls.length, 1);
  s.clearCache();
  await s.classify('das ist krass');
  assert.equal(parse.calls.length, 2);
});

test('cache TTL expires', async () => {
  const parse = parseWith({ parsed_output: null });
  const s = await make({ parse, cacheTtlMs: 30 });
  await s.classify('kurz gecached');
  await new Promise((r) => setTimeout(r, 50));
  assert.equal((await s.classify('kurz gecached')).cached, false);
  assert.equal(parse.calls.length, 2);
});

test('SDK-like errors are mapped', async (t) => {
  await t.test('AuthenticationError -> 503 + bad_key', async () => {
    const s = await make({ parse: () => Promise.reject({ name: 'AuthenticationError', message: 'invalid x-api-key', status: 401 }) });
    await rejectsHttp(s.classify('a b c'), 503, 'smart_unavailable');
    assert.equal(s.available, false);
    assert.equal(s.reason, 'bad_key');
    assert.equal(s.stats.lastError, 'invalid x-api-key');
    await rejectsHttp(s.classify('d e f'), 503, 'smart_unavailable');
  });
  await t.test('RateLimitError -> 429', async () => {
    const s = await make({ parse: () => Promise.reject({ name: 'RateLimitError', status: 429 }) });
    await rejectsHttp(s.classify('a b c'), 429, 'rate_limited');
    assert.equal(s.available, true);
  });
  await t.test('APIConnectionTimeoutError -> 504', async () => {
    const s = await make({ parse: () => Promise.reject({ name: 'APIConnectionTimeoutError' }) });
    await rejectsHttp(s.classify('a b c'), 504, 'timeout');
    assert.equal(s.stats.timeouts, 1);
  });
  await t.test('APIError 500 -> 502 upstream', async () => {
    const s = await make({ parse: () => Promise.reject({ name: 'APIError', status: 500, message: 'boom' }) });
    await rejectsHttp(s.classify('a b c'), 502, 'upstream');
    assert.equal(s.stats.errors, 1);
  });
  await t.test('plain Error -> 502 upstream', async () => {
    const s = await make({ parse: () => Promise.reject(new Error('kaputt')) });
    await rejectsHttp(s.classify('a b c'), 502, 'upstream');
  });
  await t.test('isSdkErrorLike matches by name or class', () => {
    class AuthenticationError extends Error {}
    assert.equal(isSdkErrorLike({ name: 'RateLimitError' }, 'RateLimitError'), true);
    assert.equal(isSdkErrorLike(new AuthenticationError('x'), 'AuthenticationError'), true);
    assert.equal(isSdkErrorLike(new Error('x'), 'AuthenticationError'), false);
    const FakeSdk = { RateLimitError: class RateLimitError extends Error {} };
    assert.equal(isSdkErrorLike(new FakeSdk.RateLimitError('x'), 'RateLimitError', FakeSdk), true);
  });
});

test('init without SDK installed -> no_sdk', async () => {
  await withEnv({ LIVEFX_SMART_MOCK: undefined, LIVEFX_SMART: undefined }, async () => {
    let sdkInstalled = true;
    try {
      require.resolve('@anthropic-ai/sdk', { paths: [path.join(__dirname, '..')] });
    } catch (_) {
      sdkInstalled = false;
    }
    const s = createSmart({ getTriggers: () => FIXTURE });
    await s.init();
    if (sdkInstalled) {
      // Optional dependency present: without credentials the reason must be no_key.
      assert.ok(['no_key', null].includes(s.reason), `reason ${s.reason}`);
    } else {
      assert.equal(s.available, false);
      assert.equal(s.reason, 'no_sdk');
      assert.equal(s.mock, false);
      await rejectsHttp(s.classify('a b c'), 503, 'smart_unavailable');
    }
  });
});

test('LIVEFX_SMART=0 -> disabled', async () => {
  await withEnv({ LIVEFX_SMART: '0', LIVEFX_SMART_MOCK: '1' }, async () => {
    const s = createSmart({ getTriggers: () => FIXTURE });
    await s.init();
    assert.equal(s.available, false);
    assert.equal(s.reason, 'disabled');
    await rejectsHttp(s.classify('a b c'), 503, 'smart_unavailable');
  });
});

test('LIVEFX_SMART_MOCK=1 -> mock classifier', async () => {
  await withEnv({ LIVEFX_SMART: undefined, LIVEFX_SMART_MOCK: '1' }, async () => {
    const s = createSmart({ getTriggers: () => FIXTURE });
    await s.init();
    assert.equal(s.mock, true);
    assert.equal(s.available, true);
    assert.equal(s.reason, null);
    const r = await s.classify('bitte trigger:wow jetzt', { lang: 'de-DE' });
    assert.equal(r.triggerId, 'wow');
    assert.equal(r.confidence, 0.9);
    const n = await s.classify('trigger:nope');
    assert.equal(n.triggerId, null);
    assert.equal(n.confidence, 0);
    assert.equal((await s.classify('trigger:off')).triggerId, null, 'disabled ids are not returned');
  });
});

test('classifyFn injection replaces the classifier', async () => {
  const seen = [];
  const s = await make({
    classifyFn: (text, triggers, { lang, signal }) => {
      seen.push({ text, n: triggers.length, lang, hasSignal: !!signal });
      return { triggerId: 'fail', confidence: 0.75 };
    },
  });
  assert.equal(s.mock, false);
  const r = await s.classify('irgendwas', { lang: 'tr-TR' });
  assert.equal(r.triggerId, 'fail');
  assert.deepEqual(seen, [{ text: 'irgendwas', n: FIXTURE.length, lang: 'tr-TR', hasSignal: true }]);
});

test('HTTP integration (mock mode)', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());
  const { base } = server;
  const auth = { token: 'test-token' };

  await t.test('classify with Bearer', async () => {
    const r = await api(base, 'POST', '/api/smart/classify', { json: { text: 'bitte trigger:wow' }, ...auth });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.triggerId, 'wow');
    assert.equal(r.json.confidence, 0.9);
    assert.equal(r.json.cached, false);
    assert.equal(typeof r.json.ms, 'number');
    assert.equal(typeof r.json.model, 'string');
    const again = await api(base, 'POST', '/api/smart/classify', { json: { text: 'bitte trigger:wow' }, ...auth });
    assert.equal(again.json.cached, true);
  });

  await t.test('no match -> null', async () => {
    const r = await api(base, 'POST', '/api/smart/classify', { json: { text: 'einfach nur reden', lang: 'de-DE' }, ...auth });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.triggerId, null);
    assert.equal(r.json.confidence, 0);
  });

  await t.test('without auth -> 401', async () => {
    const r = await api(base, 'POST', '/api/smart/classify', { json: { text: 'bitte trigger:wow' } });
    assert.equal(r.status, 401);
    assert.equal(r.json.error, 'unauthorized');
  });

  await t.test('same-origin header passes', async () => {
    const r = await api(base, 'POST', '/api/smart/classify', { json: { text: 'trigger:fail bitte' }, headers: { 'sec-fetch-site': 'same-origin' } });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.triggerId, 'fail');
  });

  await t.test('invalid body', async () => {
    const r = await api(base, 'POST', '/api/smart/classify', { json: { text: '' }, ...auth });
    assert.equal(r.status, 400);
    assert.equal(r.json.error, 'invalid_text');
    const r2 = await api(base, 'POST', '/api/smart/classify', { body: 'nope', headers: { 'content-type': 'text/plain' }, ...auth });
    assert.equal(r2.status, 415);
  });

  await t.test('status', async () => {
    const r = await api(base, 'GET', '/api/smart/status');
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.available, true);
    assert.equal(r.json.mock, true);
    assert.equal(r.json.reason, null);
    assert.equal(typeof r.json.model, 'string');
    assert.ok(r.json.calls >= 2);
    assert.equal(r.json.errors, 0);
    assert.equal(r.json.timeouts, 0);
    assert.equal(r.json.lastError, null);
  });
});

test('HTTP integration (LIVEFX_SMART=0)', async (t) => {
  const server = await startServer({ env: { LIVEFX_SMART: '0' } });
  t.after(() => server.stop());
  const st = await api(server.base, 'GET', '/api/smart/status');
  assert.equal(st.json.available, false);
  assert.equal(st.json.reason, 'disabled');
  const r = await api(server.base, 'POST', '/api/smart/classify', { json: { text: 'bitte trigger:wow' }, token: 'test-token' });
  assert.equal(r.status, 503);
  assert.equal(r.json.error, 'smart_unavailable');
});
