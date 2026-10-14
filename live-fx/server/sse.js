// LiveFX – Server-Sent Events hub. Relays bus messages from the panel / API to every overlay (and
// transcripts to panels). Every event carries a sequence id so a reconnecting client can replay the
// last few seconds via Last-Event-ID.
//
// 2.4 – long-poll fallback `GET /events/poll?role=&since=<seq>&wait=<ms>&cid=<id>` for networks that do not pass
// Server-Sent Events: Cloudflare Quick Tunnels (trycloudflare.com) buffer / drop `text/event-stream`, so a phone or an
// overlay opened through the Internet link would get no live updates. Same audience rules as /events (panel ⊇ all,
// overlay ⊇ all) and the same replay ring + age cutoff as a Last-Event-ID reconnect. Without `since` (first call, or a
// `since` from before a server restart) it answers at once with the `state` message; otherwise it holds the request
// until a matching event arrives or `wait` (≤ 25 s) passes – no heartbeats. Answer: `{ ok, events: [msg…], next }`,
// the client sends `next` as the following `since`. Polling clients count as connected (counts()) for 35 s after
// their last request (by `cid`). See docs/CONTRACTS.md §5.
'use strict';

require('../js/schema.js');
const { newId } = globalThis.LiveFXSchema;

const HEARTBEAT_MS = 15000;
const RETRY_MS = 2000;
const RING_SIZE = 64;
const REPLAY_MAX_AGE_MS = 5000;
const POLL_WAIT_MAX_MS = 25000;
const POLL_ALIVE_MS = 35000; // a polling client counts as connected this long after its last request
const POLL_WAITERS_MAX = 200; // pending long-polls at once (beyond that: answered empty at once)
const CID_RE = /^[A-Za-z0-9_-]{4,64}$/;

function createSse({ state, log = () => {}, version = '0.0.0' }) {
  const clients = new Set(); // { res, role }
  const ring = []; // { seq, ts, line, msg, audience }
  const waiters = new Set(); // pending long-polls { res, role, timer, tag, done }
  const pollers = new Map(); // cid -> { role, seen }
  let lastSeq = 0; // highest sequence id handed out by this hub (broadcasts + state messages)

  function frame(seq, msg) {
    return `id: ${seq}\ndata: ${JSON.stringify(msg)}\n\n`;
  }

  function write(client, chunk) {
    try {
      client.res.write(chunk);
    } catch (e) {
      evict(client);
    }
  }

  function evict(client) {
    if (!clients.has(client)) return;
    clients.delete(client);
    clearInterval(client.ping);
    try {
      client.res.end();
    } catch (_) {
      /* already closed */
    }
  }

  function counts() {
    let overlays = 0;
    let panels = 0;
    for (const c of clients) {
      if (c.role === 'panel') panels++;
      else overlays++;
    }
    const cutoff = Date.now() - POLL_ALIVE_MS;
    for (const [cid, p] of pollers) {
      if (p.seen < cutoff) {
        pollers.delete(cid);
        continue;
      }
      if (p.role === 'panel') panels++;
      else overlays++;
    }
    return { overlays, panels };
  }

  function seq() {
    lastSeq = state.nextSeq();
    return lastSeq;
  }

  function stamp(msg) {
    const out = { ...msg };
    if (typeof out.id !== 'string' || !out.id) out.id = newId('srv');
    if (!Number.isFinite(out.ts)) out.ts = Date.now();
    return out;
  }

  /** Sends msg to the selected audience. Returns the number of clients written to. */
  function broadcast(msg, { audience = 'all' } = {}) {
    const out = stamp(msg);
    const n0 = seq();
    const line = frame(n0, out);
    ring.push({ seq: n0, ts: Date.now(), line, msg: out, audience });
    if (ring.length > RING_SIZE) ring.shift();
    let n = 0;
    for (const c of Array.from(clients)) {
      if (audience !== 'all' && c.role !== audience) continue;
      write(c, line);
      n++;
    }
    for (const w of Array.from(waiters)) {
      if (audience !== 'all' && w.role !== audience) continue;
      // Answer on the next tick: events broadcast in the same tick (fire + transcript) travel in one answer.
      if (!w.flush) w.flush = setImmediate(() => answerPoll(w, w.since));
      n++;
    }
    return n;
  }

  function stateMessage() {
    const c = counts();
    return stamp({
      type: 'state',
      volume: state.volume ?? null,
      theme: state.theme ?? null,
      perf: state.perf ?? null,
      layout: state.layout ?? null,
      volumes: state.volumes ?? null,
      overlays: c.overlays,
      panels: c.panels,
      version,
    });
  }

  function attach(req, res, { role = 'overlay', since = null } = {}) {
    role = role === 'panel' ? 'panel' : 'overlay';
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    res.write(`retry: ${RETRY_MS}\n\n`);
    const client = { res, role, ping: null };
    clients.add(client);

    // Replay what this client missed while reconnecting (only recent events). The browser's reconnect sends
    // Last-Event-ID; `?since=` (2.4) is what js/bus.js sends when it switches back from long-poll to SSE.
    const hdr = req.headers['last-event-id'];
    const last = Number(hdr !== undefined && hdr !== '' ? hdr : since !== null && since !== '' ? since : NaN);
    if (Number.isFinite(last)) {
      const cutoff = Date.now() - REPLAY_MAX_AGE_MS;
      for (const e of ring) {
        if (e.seq > last && e.ts >= cutoff && (e.audience === 'all' || e.audience === role)) write(client, e.line);
      }
    }

    // Initial state so a fresh overlay picks up the current volume (2.2: per-bus `volumes` and the `layout`, which
    // carries every key a `layout` message set – 2.3 incl. `bandPosition` / `storyStyle`).
    write(client, frame(seq(), stateMessage()));

    client.ping = setInterval(() => write(client, ': ping\n\n'), HEARTBEAT_MS);
    const bye = () => evict(client);
    req.on('close', bye);
    req.on('error', bye);
    res.on('error', bye);
    log(`sse: ${role} connected (${clients.size} clients)`);
  }

  // ---------- long-poll ----------

  /** Ring events newer than `since` for `role`, not older than the replay cutoff (same rule as a reconnect). */
  function pending(role, since) {
    const cutoff = Date.now() - REPLAY_MAX_AGE_MS;
    const out = [];
    let next = since;
    for (const e of ring) {
      if (e.seq <= since) continue;
      if (e.audience !== 'all' && e.audience !== role) continue;
      next = e.seq;
      if (e.ts >= cutoff) out.push(e.msg);
    }
    return { events: out, next };
  }

  function sendPoll(res, status, body) {
    const text = JSON.stringify(body);
    try {
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(text),
        'cache-control': 'no-store, no-transform',
        'x-accel-buffering': 'no',
      });
      res.end(text);
    } catch (_) {
      /* client gone */
    }
  }

  function finishWaiter(w) {
    if (w.done) return false;
    w.done = true;
    waiters.delete(w);
    clearTimeout(w.timer);
    if (w.flush) clearImmediate(w.flush);
    return true;
  }

  function answerPoll(w, since) {
    if (!finishWaiter(w)) return;
    const r = pending(w.role, since);
    sendPoll(w.res, 200, { ok: true, events: r.events, next: Math.max(r.next, since) });
  }

  /**
   * One long-poll request. `since` = the `next` of the previous answer (absent = first call), `waitMs` how long to
   * hold the request when nothing is pending (0 … 25000), `cid` a random client id (counts as connected), `tag` an
   * optional owner (paired device id) – endTagged() answers its pending polls with 401 when the device is revoked.
   */
  function poll(req, res, { role = 'overlay', since = null, waitMs = POLL_WAIT_MAX_MS, cid = '', tag = null } = {}) {
    role = role === 'panel' ? 'panel' : 'overlay';
    if (typeof cid === 'string' && CID_RE.test(cid)) {
      const known = pollers.has(cid);
      pollers.set(cid, { role, seen: Date.now() });
      if (!known) log(`sse: ${role} polling (${cid.slice(0, 8)})`);
    }
    const s = Number(since);
    // First call – or a `since` from a previous server run (sequence restarted): start over with the state message.
    if (since === null || since === undefined || since === '' || !Number.isFinite(s) || s < 0 || s > lastSeq) {
      const n0 = seq();
      sendPoll(res, 200, { ok: true, events: [stateMessage()], next: n0, reset: since !== null && since !== undefined && since !== '' });
      return;
    }
    const now = pending(role, s);
    const wait = Math.max(0, Math.min(POLL_WAIT_MAX_MS, Number.isFinite(Number(waitMs)) ? Number(waitMs) : POLL_WAIT_MAX_MS));
    if (now.events.length || wait === 0 || waiters.size >= POLL_WAITERS_MAX) {
      sendPoll(res, 200, { ok: true, events: now.events, next: Math.max(now.next, s) });
      return;
    }
    const w = { res, role, since: Math.max(now.next, s), tag, timer: null, flush: null, done: false };
    w.timer = setTimeout(() => answerPoll(w, w.since), wait);
    waiters.add(w);
    const bye = () => finishWaiter(w);
    req.on('close', bye);
    res.on('close', bye);
    res.on('error', bye);
  }

  /** Ends the pending polls of a revoked device (`'*'` = every tagged poll) with 401 – like closing its SSE stream. */
  function endTagged(tag) {
    for (const w of Array.from(waiters)) {
      if (!w.tag || (tag !== '*' && w.tag !== tag)) continue;
      if (finishWaiter(w)) sendPoll(w.res, 401, { ok: false, error: 'pairing_required', message: 'Dieses Gerät ist nicht mehr gekoppelt.' });
    }
  }

  function close() {
    for (const c of Array.from(clients)) evict(c);
    for (const w of Array.from(waiters)) if (finishWaiter(w)) sendPoll(w.res, 503, { ok: false, error: 'shutting_down' });
  }

  return { attach, broadcast, counts, close, poll, endTagged };
}

function register(router, ctx) {
  router.route('GET', '/events', (req, res, c) => {
    ctx.bus.attach(req, res, { role: c.url.searchParams.get('role') === 'panel' ? 'panel' : 'overlay', since: c.url.searchParams.get('since') });
  });
  // Long-poll fallback (Quick Tunnel). Access is decided before routing exactly like /events (server/auth.js guard).
  router.route('GET', '/events/poll', (req, res, c) => {
    const q = c.url.searchParams;
    ctx.bus.poll(req, res, {
      role: q.get('role') === 'panel' ? 'panel' : 'overlay',
      since: q.has('since') ? q.get('since') : null,
      waitMs: q.has('wait') ? Number(q.get('wait')) : POLL_WAIT_MAX_MS,
      cid: q.get('cid') || '',
      tag: req.livefxDevice ? req.livefxDevice.id : null,
    });
  });
}

module.exports = { createSse, register, HEARTBEAT_MS, RETRY_MS, POLL_WAIT_MAX_MS, REPLAY_MAX_AGE_MS };
