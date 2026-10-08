// LiveFX – Server-Sent Events hub. Relays bus messages from the panel / API to every overlay (and
// transcripts to panels). Every event carries a sequence id so a reconnecting client can replay the
// last few seconds via Last-Event-ID.
'use strict';

require('../js/schema.js');
const { newId } = globalThis.LiveFXSchema;

const HEARTBEAT_MS = 15000;
const RETRY_MS = 2000;
const RING_SIZE = 64;
const REPLAY_MAX_AGE_MS = 5000;

function createSse({ state, log = () => {}, version = '0.0.0' }) {
  const clients = new Set(); // { res, role }
  const ring = []; // { seq, ts, line }

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
    return { overlays, panels };
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
    const seq = state.nextSeq();
    const line = frame(seq, out);
    ring.push({ seq, ts: Date.now(), line, audience });
    if (ring.length > RING_SIZE) ring.shift();
    let n = 0;
    for (const c of Array.from(clients)) {
      if (audience !== 'all' && c.role !== audience) continue;
      write(c, line);
      n++;
    }
    return n;
  }

  function attach(req, res, { role = 'overlay' } = {}) {
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

    // Replay what this client missed while reconnecting (only recent events).
    const last = Number(req.headers['last-event-id']);
    if (Number.isFinite(last)) {
      const cutoff = Date.now() - REPLAY_MAX_AGE_MS;
      for (const e of ring) {
        if (e.seq > last && e.ts >= cutoff && (e.audience === 'all' || e.audience === role)) write(client, e.line);
      }
    }

    // Initial state so a fresh overlay picks up the current volume (2.2: per-bus `volumes` and the `layout`, which
    // carries every key a `layout` message set – 2.2.1 incl. `bandPosition` / `storyStyle`).
    const c = counts();
    const stateMsg = stamp({
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
    write(client, frame(state.nextSeq(), stateMsg));

    client.ping = setInterval(() => write(client, ': ping\n\n'), HEARTBEAT_MS);
    const bye = () => evict(client);
    req.on('close', bye);
    req.on('error', bye);
    res.on('error', bye);
    log(`sse: ${role} connected (${clients.size} clients)`);
  }

  function close() {
    for (const c of Array.from(clients)) evict(c);
  }

  return { attach, broadcast, counts, close };
}

function register(router, ctx) {
  router.route('GET', '/events', (req, res, c) => {
    ctx.bus.attach(req, res, { role: c.url.searchParams.get('role') === 'panel' ? 'panel' : 'overlay' });
  });
}

module.exports = { createSse, register, HEARTBEAT_MS, RETRY_MS };
