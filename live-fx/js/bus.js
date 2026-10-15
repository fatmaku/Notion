// LiveFX – message bus between the control panel and the overlay(s).
//
// Two transports, used together:
//   1. BroadcastChannel  – instant delivery when panel and overlay run in the same browser
//      (preview iframe, an opened overlay tab, file:// demo mode).
//   2. Server-Sent Events via server.js – needed when the overlay runs inside OBS / Streamlabs
//      (a separate browser). The panel POSTs to /fire, every overlay subscribes to /events.
//      2.4: long-poll fallback `GET /events/poll` (same events, same ids) where SSE does not get through –
//      Cloudflare Quick Tunnels (`*.trycloudflare.com`, the Internet link) do not support Server-Sent Events.
//      Chosen automatically on a trycloudflare host, when EventSource fails twice within 10 s, or when the
//      stream opens but not even the initial `state` frame arrives within 8 s (a buffering proxy); in the
//      automatic fallback SSE is tried again after 2 / 5 / 10 minutes. `?transport=poll|sse` pins one (tests).
//      status().transport tells which one is live ('sse' | 'poll').
//
// A message can therefore arrive twice (once per transport). Every message carries an `id`
// created by the sender; receivers remember the last 300 ids and drop repeats, and a sender
// never processes its own echo.
(function (global) {
  'use strict';

  const CHANNEL = 'livefx';
  const SEEN_MAX = 300;
  const QUEUE_MAX = 20;
  const FIRE_MAX_AGE_MS = 5000;
  const SEND_RETRY_MS = [300, 1000, 3000];
  const SSE_BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];
  const POLL_WAIT_MS = 25000; // the server holds a poll this long when nothing happens (server/sse.js caps it at 25 s)
  const POLL_TIMEOUT_MS = POLL_WAIT_MS + 10000;
  const SSE_FAIL_WINDOW_MS = 10000;
  const SSE_FAILS_TO_POLL = 2;
  const SSE_STALL_MS = 8000;
  const SSE_RETRY_AFTER_MS = [120000, 300000, 600000];
  const TUNNEL_HOST_RE = /\.trycloudflare\.com$/i;

  /** Transport for this page: `?transport=poll|sse` pins it, a Quick Tunnel host means poll, otherwise SSE first. */
  function pickTransport(loc) {
    let forced = '';
    try {
      forced = String(new URLSearchParams((loc && loc.search) || '').get('transport') || '').toLowerCase();
    } catch (_) {
      forced = '';
    }
    if (forced === 'poll' || forced === 'sse') return { transport: forced, forced: true, reason: 'param' };
    if (TUNNEL_HOST_RE.test(String((loc && loc.hostname) || ''))) return { transport: 'poll', forced: true, reason: 'tunnel' };
    return { transport: 'sse', forced: false, reason: null };
  }

  function newId(prefix) {
    const S = global.LiveFXSchema;
    if (S && typeof S.newId === 'function') return S.newId(prefix);
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  class Bus {
    constructor({ role }) {
      this.role = role === 'panel' ? 'panel' : 'overlay';
      this.listeners = new Set();
      this.statusListeners = new Set();
      this.serverOk = false;
      this.sse = 'off'; // 'off' | 'connecting' | 'open' | 'closed'
      this.authError = false;
      this.seen = new Map(); // id -> true, insertion ordered (LRU)
      this.queue = [];
      this.inFlight = null;
      this.draining = false;
      this.closed = false;
      this._sseTimer = null;
      this._sseBackoff = 0;
      this._sseStall = null;
      this._sseFails = []; // timestamps of recent EventSource failures (fallback to long-poll)
      this._sseRetryStep = 0;
      this._sseRetryTimer = null;
      this.transport = 'sse'; // 'sse' | 'poll'
      this.transportForced = false;
      this.transportReason = null;
      this._lastSeq = null; // sequence id of the last event seen (SSE lastEventId / poll `next`)
      this._pollTimer = null;
      this._pollBackoff = 0;
      this._pollGen = 0;
      this._pollCtl = null;
      this.cid = String(newId(this.role)).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);

      this.bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
      if (this.bc) this.bc.onmessage = (e) => this._emit(e.data);

      const isHttp = /^https?:$/.test(global.location ? global.location.protocol : '');
      this.serverBase = isHttp ? '' : null;
      if (isHttp) {
        const pick = pickTransport(global.location);
        const canSse = typeof EventSource !== 'undefined';
        const canPoll = typeof fetch === 'function';
        this.transportForced = pick.forced;
        this.transportReason = pick.reason;
        if (canPoll && (pick.transport === 'poll' || !canSse)) {
          this.transport = 'poll';
          this._connectPoll();
        } else if (canSse) this._connectSSE();
      }
    }

    // ---------- public API ----------

    onMessage(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    onStatus(fn) {
      this.statusListeners.add(fn);
      fn(this.status());
      return () => this.statusListeners.delete(fn);
    }

    status() {
      return { serverOk: this.serverOk, sse: this.sse, authError: this.authError, queued: this.queue.length, transport: this.transport };
    }

    /** Broadcasts a message to every overlay (and other panels). Returns the message id. */
    send(msg) {
      const payload = { ...msg, id: typeof msg.id === 'string' && msg.id ? msg.id : newId(this.role), ts: Date.now() };
      this._remember(payload.id);
      if (this.bc) {
        try {
          this.bc.postMessage(payload);
        } catch (e) {
          console.warn('LiveFX: BroadcastChannel failed', e);
        }
      }
      if (this.serverBase !== null) this._enqueue(payload);
      return payload.id;
    }

    close() {
      this.closed = true;
      clearTimeout(this._sseTimer);
      clearTimeout(this._sseStall);
      clearTimeout(this._sseRetryTimer);
      this._stopPoll();
      if (this.es) this.es.close();
      if (this.bc) this.bc.close();
      this.sse = 'off';
      this._status();
    }

    /** Kept for older callers; the SSE stream is the live health signal now. */
    _pingServer() {
      if (this.serverBase === null) return Promise.resolve(false);
      return fetch(`${this.serverBase}/health`)
        .then((r) => r.ok)
        .catch(() => false);
    }

    // ---------- receiving ----------

    _remember(id) {
      if (this.seen.has(id)) this.seen.delete(id);
      this.seen.set(id, true);
      if (this.seen.size > SEEN_MAX) this.seen.delete(this.seen.keys().next().value);
    }

    _emit(msg) {
      if (!msg || typeof msg !== 'object') return;
      if (typeof msg.id === 'string' && msg.id) {
        if (this.seen.has(msg.id)) return; // duplicate (other transport) or own echo
        this._remember(msg.id);
      }
      for (const fn of this.listeners) {
        try {
          fn(msg);
        } catch (e) {
          console.error('LiveFX listener failed', e);
        }
      }
    }

    _status() {
      const s = this.status();
      for (const fn of this.statusListeners) {
        try {
          fn(s);
        } catch (e) {
          console.error('LiveFX status listener failed', e);
        }
      }
    }

    // ---------- sending (HTTP queue) ----------

    _enqueue(payload) {
      if (payload.type === 'volume') this.queue = this.queue.filter((q) => q.msg.type !== 'volume' || q === this.inFlight);
      this.queue.push({ msg: payload, attempt: 0 });
      while (this.queue.length > QUEUE_MAX) {
        const victim = this.queue[0] === this.inFlight ? 1 : 0; // never evict the item being sent
        this.queue.splice(victim, 1);
      }
      this._drain();
    }

    _drop(item) {
      const i = this.queue.indexOf(item);
      if (i !== -1) this.queue.splice(i, 1);
      if (this.inFlight === item) this.inFlight = null;
    }

    async _drain() {
      if (this.draining) return;
      this.draining = true;
      try {
        while (this.queue.length && !this.closed) {
          const item = this.queue[0];
          if (item.msg.type === 'fire' && Date.now() - item.msg.ts > FIRE_MAX_AGE_MS) {
            this._drop(item); // stale effect – nobody wants a meme five seconds late
            continue;
          }
          this.inFlight = item;
          let status = 0;
          try {
            const r = await fetch(`${this.serverBase}/fire`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(item.msg),
            });
            status = r.status;
          } catch (_) {
            status = 0;
          }
          if (status >= 200 && status < 300) {
            this._drop(item);
            continue;
          }
          if (status === 401 || status === 403) {
            this.authError = true;
            this._drop(item);
            this._status();
            continue;
          }
          if (status >= 400 && status < 500) {
            console.warn('LiveFX: server rejected message', status, item.msg.type);
            this._drop(item);
            continue;
          }
          if (item.attempt >= SEND_RETRY_MS.length) {
            this._drop(item);
            continue;
          }
          this.inFlight = null;
          await new Promise((r) => setTimeout(r, SEND_RETRY_MS[item.attempt++]));
        }
      } finally {
        this.inFlight = null;
        this.draining = false;
        this._status();
      }
    }

    // ---------- SSE ----------

    _connectSSE() {
      if (this.closed) return;
      clearTimeout(this._sseTimer);
      clearTimeout(this._sseStall);
      if (this.es) this.es.close();
      this.transport = 'sse';
      this.sse = 'connecting';
      this._status();
      // `since` lets a switch back from long-poll replay what happened meanwhile (the browser's own reconnects
      // send Last-Event-ID, which the server prefers).
      const since = this._lastSeq !== null ? `&since=${this._lastSeq}` : '';
      const es = new EventSource(`${this.serverBase}/events?role=${this.role}${since}`);
      this.es = es;
      let gotData = false;
      es.onopen = () => {
        if (es !== this.es) return;
        this.serverOk = true;
        this.sse = 'open';
        this._sseBackoff = 0;
        this._status();
        clearTimeout(this._sseStall);
        // The server writes the `state` frame right away; nothing within 8 s = a proxy buffers the stream.
        if (!gotData) this._sseStall = setTimeout(() => es === this.es && !gotData && this._sseFailed(true), SSE_STALL_MS);
      };
      es.onmessage = (e) => {
        if (es !== this.es) return;
        gotData = true;
        clearTimeout(this._sseStall);
        const seq = Number(e.lastEventId);
        if (e.lastEventId !== '' && Number.isFinite(seq)) this._lastSeq = seq;
        try {
          this._emit(JSON.parse(e.data));
        } catch (_) {
          /* ignore malformed frames */
        }
      };
      es.onerror = () => {
        if (es !== this.es) return;
        clearTimeout(this._sseStall);
        this.serverOk = false;
        if (this._sseFailed(false)) return; // switched to long-poll
        if (es.readyState === EventSource.CLOSED) {
          // The browser gave up (non-200 response, wrong content type). Reconnect ourselves.
          this.sse = 'closed';
          const delay = SSE_BACKOFF_MS[Math.min(this._sseBackoff++, SSE_BACKOFF_MS.length - 1)];
          this._sseTimer = setTimeout(() => this._connectSSE(), delay);
        } else {
          this.sse = 'connecting'; // browser retries on its own (retry: 2000)
        }
        this._status();
      };
    }

    /** Counts an EventSource failure; switches to long-poll (and returns true) after 2 within 10 s or a stall. */
    _sseFailed(stalled) {
      if (this.transportForced || this.closed || typeof fetch !== 'function') return false;
      const now = Date.now();
      this._sseFails = this._sseFails.filter((t) => now - t < SSE_FAIL_WINDOW_MS);
      this._sseFails.push(now);
      if (!stalled && this._sseFails.length < SSE_FAILS_TO_POLL) return false;
      this._switchToPoll(stalled ? 'stall' : 'errors');
      return true;
    }

    _switchToPoll(reason) {
      clearTimeout(this._sseTimer);
      clearTimeout(this._sseStall);
      if (this.es) {
        this.es.onopen = this.es.onmessage = this.es.onerror = null;
        this.es.close();
        this.es = null;
      }
      this._sseFails = [];
      this.transport = 'poll';
      this.transportReason = reason;
      this.serverOk = false;
      this._pollBackoff = 0;
      this._connectPoll();
      // automatic fallback only: SSE gets another chance later (the network may have changed, the server restarted)
      clearTimeout(this._sseRetryTimer);
      const wait = SSE_RETRY_AFTER_MS[Math.min(this._sseRetryStep++, SSE_RETRY_AFTER_MS.length - 1)];
      this._sseRetryTimer = setTimeout(() => {
        if (this.closed || this.transport !== 'poll' || this.transportForced) return;
        this._stopPoll();
        this._connectSSE();
      }, wait);
    }

    // ---------- long-poll (2.4) ----------

    _stopPoll() {
      this._pollGen++;
      clearTimeout(this._pollTimer);
      if (this._pollCtl) {
        try {
          this._pollCtl.abort();
        } catch (_) {
          /* already done */
        }
      }
      this._pollCtl = null;
    }

    _connectPoll() {
      if (this.closed) return;
      clearTimeout(this._pollTimer);
      if (this.sse !== 'open') {
        this.sse = 'connecting';
        this._status();
      }
      const gen = ++this._pollGen;
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      this._pollCtl = ctl;
      const q = [`role=${this.role}`, `cid=${encodeURIComponent(this.cid)}`, `wait=${POLL_WAIT_MS}`];
      if (this._lastSeq !== null) q.push(`since=${this._lastSeq}`);
      const kill = ctl ? setTimeout(() => ctl.abort(), POLL_TIMEOUT_MS) : null;
      const done = () => clearTimeout(kill);
      fetch(`${this.serverBase}/events/poll?${q.join('&')}`, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
        signal: ctl ? ctl.signal : undefined,
      })
        .then((r) => {
          if (gen !== this._pollGen || this.closed) return null;
          if (!r.ok) {
            done();
            this._pollFailed(r.status);
            return null;
          }
          return r.json().then((d) => {
            done();
            if (gen !== this._pollGen || this.closed) return;
            if (!d || !Array.isArray(d.events)) throw new Error('bad poll answer');
            if (Number.isFinite(Number(d.next))) this._lastSeq = Number(d.next);
            const changed = this.sse !== 'open' || !this.serverOk;
            this.serverOk = true;
            this.sse = 'open';
            this._pollBackoff = 0;
            if (changed) this._status();
            for (const m of d.events) this._emit(m);
            this._pollTimer = setTimeout(() => this._connectPoll(), 0);
          });
        })
        .catch(() => {
          done();
          if (gen !== this._pollGen || this.closed) return;
          this._pollFailed(0);
        });
    }

    /** Like EventSource: network trouble = 'connecting' (retrying), an HTTP refusal (401 not paired …) = 'closed'. */
    _pollFailed(status) {
      this.serverOk = false;
      this.sse = status ? 'closed' : 'connecting';
      this._status();
      const delay = SSE_BACKOFF_MS[Math.min(this._pollBackoff++, SSE_BACKOFF_MS.length - 1)];
      this._pollTimer = setTimeout(() => this._connectPoll(), delay);
    }
  }

  global.LiveFXBus = { Bus, pickTransport, POLL_WAIT_MS };
})(typeof window !== 'undefined' ? window : globalThis);
