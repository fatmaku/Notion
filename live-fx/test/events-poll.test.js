// 2.4 long-poll fallback GET /events/poll (Cloudflare Quick Tunnels do not pass Server-Sent Events): the hub part
// (since, timeout, audience, reset after a restart, revoked devices, connected counts) against fake requests, then the
// real route with the auth rules of /events – from this PC, and "through the tunnel" (loopback + cf-connecting-ip,
// exactly what cloudflared sends): no credentials → 401, overlay key → overlay events only, paired device → panel events.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { EventEmitter } = require('events');
const sse = require('../server/sse');
const auth = require('../server/auth');
const { startServer, api } = require('./helpers/server');

function fakeState() {
  let seq = 0;
  return { volume: null, theme: null, perf: null, layout: null, volumes: null, nextSeq: () => ++seq };
}

/** Fake request/response pair; `res.done` resolves with { status, body } once the poll answers. */
function pair() {
  const req = new EventEmitter();
  req.headers = {};
  const res = new EventEmitter();
  let resolve;
  res.done = new Promise((r) => (resolve = r));
  res.answered = false;
  res.writeHead = (status, headers) => {
    res.status = status;
    res.headers = headers;
  };
  res.end = (text) => {
    res.answered = true;
    resolve({ status: res.status, body: JSON.parse(text), headers: res.headers });
  };
  return { req, res };
}

function hub() {
  return sse.createSse({ state: fakeState(), version: '9.9.9' });
}

async function poll(bus, opts) {
  const { req, res } = pair();
  bus.poll(req, res, opts);
  return res.done;
}

test('poll: first call answers at once with the state message and a cursor; an idle poll answers empty after `wait`', async () => {
  const bus = hub();
  const first = await poll(bus, { role: 'overlay' });
  assert.equal(first.status, 200);
  assert.equal(first.body.ok, true);
  assert.equal(first.body.events.length, 1);
  assert.equal(first.body.events[0].type, 'state');
  assert.equal(first.body.events[0].version, '9.9.9');
  assert.equal(typeof first.body.next, 'number');
  assert.equal(first.body.reset, false);
  assert.match(first.headers['cache-control'], /no-store/);
  const t0 = Date.now();
  const idle = await poll(bus, { role: 'overlay', since: first.body.next, waitMs: 150 });
  assert.ok(Date.now() - t0 >= 140, 'held until wait passed');
  assert.deepEqual(idle.body.events, []);
  assert.equal(idle.body.next, first.body.next, 'cursor unchanged when nothing happened');
  const now = await poll(bus, { role: 'overlay', since: first.body.next, waitMs: 0 });
  assert.deepEqual(now.body.events, [], 'wait=0 answers at once');
});

test('poll: a held request is answered by the next broadcast; events of one tick travel together; ids keep the order', async () => {
  const bus = hub();
  const { body: f } = await poll(bus, { role: 'panel' });
  const { req, res } = pair();
  bus.poll(req, res, { role: 'panel', since: f.next, waitMs: 5000 });
  assert.equal(res.answered, false, 'held while nothing happens');
  const t0 = Date.now();
  bus.broadcast({ type: 'fire', id: 'a1', trigger: { id: 'x' } });
  bus.broadcast({ type: 'transcript', id: 'a2', text: 'hallo' }, { audience: 'panel' });
  const r = await res.done;
  assert.ok(Date.now() - t0 < 1000, 'answered right away');
  assert.deepEqual(
    r.body.events.map((e) => e.id),
    ['a1', 'a2']
  );
  assert.ok(r.body.next > f.next);
  // the cursor is exact: polling again with `next` does not repeat anything
  const again = await poll(bus, { role: 'panel', since: r.body.next, waitMs: 0 });
  assert.deepEqual(again.body.events, []);
  // events that happened between two polls come from the replay ring
  bus.broadcast({ type: 'volume', id: 'a3', volume: 0.4 });
  const late = await poll(bus, { role: 'panel', since: r.body.next, waitMs: 5000 });
  assert.deepEqual(
    late.body.events.map((e) => e.id),
    ['a3']
  );
});

test('poll: audience rules match /events (overlay never sees panel-only transcripts / chat)', async () => {
  const bus = hub();
  const { body: f } = await poll(bus, { role: 'overlay' });
  bus.broadcast({ type: 'transcript', id: 'p1', text: 'geheim' }, { audience: 'panel' });
  const ov = await poll(bus, { role: 'overlay', since: f.next, waitMs: 120 });
  assert.deepEqual(ov.body.events, [], 'panel event not delivered to an overlay');
  // a held overlay poll is not woken by a panel event
  const { req, res } = pair();
  bus.poll(req, res, { role: 'overlay', since: ov.body.next, waitMs: 200 });
  bus.broadcast({ type: 'chat', id: 'p2' }, { audience: 'panel' });
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(res.answered, false);
  bus.broadcast({ type: 'fire', id: 'o1', trigger: { id: 'y' } }, { audience: 'overlay' });
  const r = await res.done;
  assert.deepEqual(
    r.body.events.map((e) => e.id),
    ['o1']
  );
  const pn = await poll(bus, { role: 'panel', since: f.next, waitMs: 0 });
  assert.deepEqual(
    pn.body.events.map((e) => e.id),
    ['p1', 'p2'],
    'panel sees panel + all, not overlay-only'
  );
});

test('poll: a cursor from a previous server run (sequence restarted) starts over with the state message', async () => {
  const bus = hub();
  await poll(bus, { role: 'overlay' });
  const r = await poll(bus, { role: 'overlay', since: 987654, waitMs: 5000 });
  assert.equal(r.body.reset, true);
  assert.equal(r.body.events[0].type, 'state');
  for (const bad of ['abc', '-1']) {
    const x = await poll(bus, { role: 'overlay', since: bad, waitMs: 5000 });
    assert.equal(x.body.events[0].type, 'state', bad);
  }
});

test('poll: events older than the replay window (5 s) are skipped like on an SSE reconnect', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_700_000_000_000 });
  const bus = hub();
  const { body: f } = await poll(bus, { role: 'overlay' });
  bus.broadcast({ type: 'fire', id: 'old', trigger: { id: 'z' } });
  t.mock.timers.tick(sse.REPLAY_MAX_AGE_MS + 1000);
  bus.broadcast({ type: 'fire', id: 'new', trigger: { id: 'z' } });
  const r = await poll(bus, { role: 'overlay', since: f.next, waitMs: 0 });
  assert.deepEqual(
    r.body.events.map((e) => e.id),
    ['new'],
    'a stale effect is not played late'
  );
  assert.ok(r.body.next > f.next + 1, 'the cursor moves past the skipped event');
});

test('poll: endTagged() answers the pending polls of a revoked device with 401; close() ends every poll', async () => {
  const bus = hub();
  const { body: f } = await poll(bus, { role: 'overlay' });
  const a = pair();
  const b = pair();
  bus.poll(a.req, a.res, { role: 'overlay', since: f.next, waitMs: 5000, tag: 'dev1' });
  bus.poll(b.req, b.res, { role: 'overlay', since: f.next, waitMs: 5000, tag: 'dev2' });
  bus.endTagged('dev1');
  const ra = await a.res.done;
  assert.equal(ra.status, 401);
  assert.equal(ra.body.error, 'pairing_required');
  assert.equal(b.res.answered, false, 'other devices keep waiting');
  bus.close();
  assert.equal((await b.res.done).status, 503);
});

test('poll: a client that went away is dropped (no answer written); polling clients count as connected by cid', async () => {
  const bus = hub();
  const { body: f } = await poll(bus, { role: 'panel', cid: 'phone-abc123' });
  await poll(bus, { role: 'overlay', cid: 'obs-xyz789', waitMs: 0 });
  assert.deepEqual(bus.counts(), { overlays: 1, panels: 1 });
  await poll(bus, { role: 'overlay', cid: 'bad id!', waitMs: 0 });
  assert.deepEqual(bus.counts(), { overlays: 1, panels: 1 }, 'an invalid cid is not counted');
  const { req, res } = pair();
  bus.poll(req, res, { role: 'panel', since: f.next, waitMs: 5000 });
  req.emit('close');
  bus.broadcast({ type: 'fire', id: 'gone', trigger: { id: 'q' } });
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(res.answered, false);
});

// ---------------------------------------------------------------- integration

/** Raw GET with explicit headers (no cookie jar), resolves { status, json, headers }. */
function get(base, p, headers = {}) {
  const u = new URL(base);
  return new Promise((resolve, reject) => {
    http
      .get({ host: u.hostname, port: u.port, path: p, headers }, (res) => {
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
          resolve({ status: res.statusCode, json, headers: res.headers });
        });
      })
      .on('error', reject);
  });
}

test('GET /events/poll: fire → overlay poll from this PC; same auth as /events through the tunnel; device revoke', async () => {
  const s = await startServer();
  try {
    const { base, token } = s;
    // ---- this PC (loopback): open like /events
    const first = await get(base, '/events/poll?role=overlay&cid=obs-local1');
    assert.equal(first.status, 200);
    assert.equal(first.json.events[0].type, 'state');
    const held = get(base, `/events/poll?role=overlay&since=${first.json.next}&wait=5000`);
    await new Promise((r) => setTimeout(r, 100));
    const fired = await api(base, 'POST', '/api/fire', { token, json: { id: 'lol' } });
    assert.equal(fired.status, 200, fired.text);
    const got = await held;
    assert.equal(got.status, 200);
    const fire = got.json.events.find((e) => e.type === 'fire');
    assert.ok(fire, JSON.stringify(got.json));
    assert.equal(fire.trigger.id, 'lol');
    const health = await api(base, 'GET', '/health');
    assert.ok(health.json.overlays >= 1, 'a polling overlay counts as connected');

    // ---- through the tunnel (cloudflared connects from 127.0.0.1 and adds cf-connecting-ip)
    const cf = { 'cf-connecting-ip': '203.0.113.9' };
    for (const role of ['overlay', 'panel']) {
      const r = await get(base, `/events/poll?role=${role}`, cf);
      assert.equal(r.status, 401, role);
      assert.equal(r.json.error, 'tunnel_login', role);
    }
    const key = auth.overlayKeyFor(token);
    const ov = await get(base, `/events/poll?role=overlay&key=${key}`, cf);
    assert.equal(ov.status, 200, 'overlay key opens the overlay events');
    assert.equal((await get(base, `/events/poll?role=panel&key=${key}`, cf)).status, 401, 'but never the panel audience');

    // pair a phone "through the tunnel" with the 6-digit code
    const setup = await api(base, 'GET', '/api/setup', { token });
    const code = setup.json.pairing.code;
    assert.match(code, /^\d{6}$/);
    const paired = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ code });
      const u = new URL(base);
      const req = http.request(
        { host: u.hostname, port: u.port, path: '/api/pair', method: 'POST', headers: { ...cf, origin: base, 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Mobile/15E148 Safari/604.1' } },
        (res) => {
          let text = '';
          res.on('data', (c) => (text += c));
          res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(text), headers: res.headers }));
        }
      );
      req.on('error', reject);
      req.end(body);
    });
    assert.equal(paired.status, 200, JSON.stringify(paired.json));
    assert.equal(paired.json.device.via, 'tunnel');
    const cookie = String(paired.headers['set-cookie'][0]).split(';')[0];
    const ph = { ...cf, cookie };
    const p1 = await get(base, '/events/poll?role=panel&cid=phone-tunnel1', ph);
    assert.equal(p1.status, 200);
    // transcript (panel audience) reaches the phone's poll
    const heldPanel = get(base, `/events/poll?role=panel&since=${p1.json.next}&wait=5000`, ph);
    await new Promise((r) => setTimeout(r, 100));
    assert.equal((await api(base, 'POST', '/api/transcript', { token, json: { text: 'hallo welt', source: 'Handy-Mikro' } })).status, 200);
    const tr = await heldPanel;
    assert.equal(tr.status, 200);
    assert.ok(
      tr.json.events.some((e) => e.type === 'transcript' && e.text === 'hallo welt'),
      JSON.stringify(tr.json)
    );
    // revoke while a poll waits: the phone first gets the `pairing revoked` event, the next poll is refused
    const heldRevoke = get(base, `/events/poll?role=panel&since=${tr.json.next}&wait=5000`, ph);
    // the same device also waits on the overlay audience, which the panel-only revoke event does not wake
    const ovFirst = await get(base, '/events/poll?role=overlay', ph);
    const heldOverlay = get(base, `/events/poll?role=overlay&since=${ovFirst.json.next}&wait=5000`, ph);
    await new Promise((r) => setTimeout(r, 100));
    const rv = await api(base, 'DELETE', `/api/devices/${encodeURIComponent(paired.json.device.id)}`, { token });
    assert.equal(rv.status, 200, rv.text);
    const last = await heldRevoke;
    assert.equal(last.status, 200);
    assert.ok(
      last.json.events.some((e) => e.type === 'pairing' && e.event === 'revoked'),
      JSON.stringify(last.json)
    );
    const t0 = Date.now();
    const ovEnd = await heldOverlay;
    assert.equal(ovEnd.status, 401, 'a waiting poll of the revoked device is ended at once');
    assert.ok(Date.now() - t0 < 2000);
    assert.equal((await get(base, `/events/poll?role=panel&since=${last.json.next}`, ph)).status, 401, 'revoked device is out');
  } finally {
    await s.stop();
  }
});

test('GET /events?since= replays like Last-Event-ID (js/bus.js switching back from long-poll)', async () => {
  const s = await startServer();
  try {
    const { base, token } = s;
    const first = await get(base, '/events/poll?role=overlay');
    await api(base, 'POST', '/api/fire', { token, json: { id: 'lol' } });
    const got = await new Promise((resolve, reject) => {
      const u = new URL(base);
      const req = http.get({ host: u.hostname, port: u.port, path: `/events?role=overlay&since=${first.json.next}`, headers: { accept: 'text/event-stream' } }, (res) => {
        let buf = '';
        res.setEncoding('utf8');
        res.on('data', (c) => {
          buf += c;
          if (/"type":"state"/.test(buf)) {
            req.destroy();
            resolve(buf);
          }
        });
      });
      req.on('error', (e) => (e.code === 'ECONNRESET' ? null : reject(e)));
    });
    const fireAt = got.indexOf('"type":"fire"');
    assert.ok(fireAt !== -1, got);
    assert.ok(fireAt < got.indexOf('"type":"state"'), 'replayed before the state message');
  } finally {
    await s.stop();
  }
});
