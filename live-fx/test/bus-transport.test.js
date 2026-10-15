// 2.4 js/bus.js transport choice: Server-Sent Events by default, long-poll (/events/poll) on a Quick Tunnel host
// (trycloudflare does not pass SSE), after two EventSource failures within 10 s, or when the stream opens but stays
// silent; `?transport=` pins one. Runs the browser module in Node with a fake EventSource / fetch / location.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/schema.js');
require('../js/bus.js');

const { Bus, pickTransport, POLL_WAIT_MS } = globalThis.LiveFXBus;

class FakeES {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    FakeES.all.push(this);
  }
  close() {
    this.readyState = 2;
    this.closed = true;
  }
  open() {
    this.readyState = 1;
    if (this.onopen) this.onopen();
  }
  message(seq, msg) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(msg), lastEventId: String(seq) });
  }
  fail(closed = false) {
    this.readyState = closed ? 2 : 0;
    if (this.onerror) this.onerror();
  }
}
FakeES.CONNECTING = 0;
FakeES.OPEN = 1;
FakeES.CLOSED = 2;
FakeES.all = [];

/** fetch stub for /events/poll: answers from `script` (array of { status, body } or 'neterr'), then hangs. */
function fakeFetch(script) {
  const calls = [];
  const fn = (url, opts = {}) => {
    calls.push(String(url));
    const step = script.shift();
    if (!step) {
      return new Promise((resolve, reject) => {
        if (opts.signal) opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }
    if (step === 'neterr') return Promise.reject(new TypeError('Failed to fetch'));
    return Promise.resolve({ ok: step.status >= 200 && step.status < 300, status: step.status, json: () => Promise.resolve(step.body) });
  };
  fn.calls = calls;
  return fn;
}

const saved = {};
function env({ host = '192.168.1.20', search = '', protocol = 'http:', fetch: f = fakeFetch([]) } = {}) {
  for (const k of ['location', 'EventSource', 'fetch', 'BroadcastChannel']) saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
  FakeES.all = [];
  Object.defineProperty(globalThis, 'location', { value: { protocol, hostname: host, search }, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'EventSource', { value: FakeES, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'fetch', { value: f, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'BroadcastChannel', { value: undefined, configurable: true, writable: true });
  return f;
}
function restore() {
  for (const [k, d] of Object.entries(saved)) {
    if (d) Object.defineProperty(globalThis, k, d);
    else delete globalThis[k];
  }
}
const tick = () => new Promise((r) => setImmediate(r));

test('pickTransport: ?transport= pins, trycloudflare means poll, everything else SSE first', () => {
  assert.deepEqual(pickTransport({ hostname: '127.0.0.1', search: '' }), { transport: 'sse', forced: false, reason: null });
  assert.deepEqual(pickTransport({ hostname: 'lazy-otter-abc.trycloudflare.com', search: '' }), { transport: 'poll', forced: true, reason: 'tunnel' });
  assert.deepEqual(pickTransport({ hostname: 'LAZY.TRYCLOUDFLARE.COM', search: '' }).transport, 'poll');
  assert.deepEqual(pickTransport({ hostname: 'trycloudflare.com.evil.example', search: '' }).transport, 'sse');
  assert.deepEqual(pickTransport({ hostname: '127.0.0.1', search: '?layout=portrait&transport=poll' }), { transport: 'poll', forced: true, reason: 'param' });
  assert.deepEqual(pickTransport({ hostname: 'x.trycloudflare.com', search: '?transport=sse' }), { transport: 'sse', forced: true, reason: 'param' });
  assert.equal(pickTransport({ hostname: '127.0.0.1', search: '?transport=carrier-pigeon' }).transport, 'sse');
  assert.equal(POLL_WAIT_MS, 25000);
});

test('Bus on a Quick Tunnel host long-polls right away: cursor, dedupe by id, status open', async (t) => {
  const f = env({
    host: 'lazy-otter.trycloudflare.com',
    protocol: 'https:',
    fetch: fakeFetch([
      { status: 200, body: { ok: true, events: [{ type: 'state', id: 's1', volume: 0.5 }], next: 7 } },
      { status: 200, body: { ok: true, events: [{ type: 'fire', id: 'f1' }, { type: 'fire', id: 'f1' }, { type: 'transcript', id: 't1', text: 'hi' }], next: 9 } },
    ]),
  });
  t.after(restore);
  const bus = new Bus({ role: 'panel' });
  t.after(() => bus.close());
  const got = [];
  bus.onMessage((m) => got.push(m.id));
  const states = [];
  bus.onStatus((s) => states.push(s));
  await tick();
  await tick();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(FakeES.all.length, 0, 'no EventSource on a trycloudflare host');
  assert.match(f.calls[0], /^\/events\/poll\?role=panel&cid=[A-Za-z0-9_-]+&wait=25000$/);
  assert.match(f.calls[1], /&since=7$/, 'second poll sends the cursor of the first answer');
  assert.match(f.calls[2], /&since=9$/);
  assert.deepEqual(got, ['s1', 'f1', 't1'], 'a repeated id is delivered once');
  const s = bus.status();
  assert.equal(s.transport, 'poll');
  assert.equal(s.sse, 'open');
  assert.equal(s.serverOk, true);
  assert.equal(bus.transportReason, 'tunnel');
});

test('Bus: a refused poll (401) reads like an EventSource that gave up (closed); a network error like a retry (connecting)', async (t) => {
  env({ search: '?transport=poll', fetch: fakeFetch([{ status: 401, body: { ok: false } }]) });
  t.after(restore);
  const bus = new Bus({ role: 'panel' });
  t.after(() => bus.close());
  await tick();
  await tick();
  assert.equal(bus.status().sse, 'closed');
  assert.equal(bus.status().serverOk, false);
  bus.close();
  env({ search: '?transport=poll', fetch: fakeFetch(['neterr']) });
  const bus2 = new Bus({ role: 'overlay' });
  t.after(() => bus2.close());
  await tick();
  await tick();
  assert.equal(bus2.status().sse, 'connecting');
  assert.equal(bus2.status().transport, 'poll');
});

test('Bus: SSE first; two EventSource failures within 10 s switch to long-poll and keep the last event id', async (t) => {
  const f = env({ fetch: fakeFetch([]) });
  t.after(restore);
  const bus = new Bus({ role: 'overlay' });
  t.after(() => bus.close());
  const got = [];
  bus.onMessage((m) => got.push(m.id));
  assert.equal(FakeES.all.length, 1);
  assert.equal(FakeES.all[0].url, '/events?role=overlay');
  const es = FakeES.all[0];
  es.open();
  es.message(41, { type: 'state', id: 'st' });
  assert.equal(bus.status().transport, 'sse');
  es.fail();
  assert.equal(bus.status().transport, 'sse', 'one failure is a normal reconnect');
  assert.equal(f.calls.length, 0);
  es.fail();
  assert.equal(bus.status().transport, 'poll', 'second failure within 10 s → long-poll');
  assert.equal(es.closed, true, 'the EventSource is closed');
  await tick();
  assert.match(f.calls[0], /^\/events\/poll\?role=overlay&cid=.+&since=41$/, 'continues after the last SSE event');
  assert.equal(bus.transportReason, 'errors');
  assert.deepEqual(got, ['st']);
});

test('Bus: a stream that opens but stays silent (buffering proxy) switches to long-poll after 8 s', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const f = env({ fetch: fakeFetch([]) });
  t.after(restore);
  const bus = new Bus({ role: 'panel' });
  t.after(() => bus.close());
  FakeES.all[0].open();
  t.mock.timers.tick(7000);
  assert.equal(bus.status().transport, 'sse');
  t.mock.timers.tick(1500);
  assert.equal(bus.status().transport, 'poll');
  assert.equal(bus.transportReason, 'stall');
  assert.equal(f.calls.length, 1);
  assert.doesNotMatch(f.calls[0], /since=/, 'nothing seen yet → first poll gets the state message');
  // automatic fallback: SSE gets another chance after 2 minutes
  t.mock.timers.tick(120000);
  assert.equal(bus.status().transport, 'sse');
  assert.equal(FakeES.all.length, 2);
});

test('Bus: ?transport=sse never falls back; an SSE stream that delivers data is not a stall', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const f = env({ search: '?transport=sse', fetch: fakeFetch([]) });
  t.after(restore);
  const bus = new Bus({ role: 'overlay' });
  t.after(() => bus.close());
  const es = FakeES.all[0];
  es.fail();
  es.fail();
  es.fail(true);
  assert.equal(bus.status().transport, 'sse');
  assert.equal(f.calls.length, 0);
  bus.close();
  env({ fetch: fakeFetch([]) });
  const bus2 = new Bus({ role: 'overlay' });
  t.after(() => bus2.close());
  const es2 = FakeES.all[0];
  es2.open();
  es2.message(3, { type: 'state', id: 'x' });
  t.mock.timers.tick(60000);
  assert.equal(bus2.status().transport, 'sse');
  // failures far apart are normal reconnects (server restart once an hour)
  es2.fail();
  t.mock.timers.tick(11000);
  es2.fail();
  assert.equal(bus2.status().transport, 'sse');
});
