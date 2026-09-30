// LiveFX – message bus between the control panel and the overlay(s).
//
// Two transports, used together:
//   1. BroadcastChannel  – instant delivery when panel and overlay run in the same browser
//      (preview iframe, an opened overlay tab, file:// demo mode).
//   2. Server-Sent Events via server.js – needed when the overlay runs inside OBS / Streamlabs
//      (a separate browser). The panel POSTs to /fire, every overlay subscribes to /events.
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

      this.bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
      if (this.bc) this.bc.onmessage = (e) => this._emit(e.data);

      const isHttp = /^https?:$/.test(global.location ? global.location.protocol : '');
      this.serverBase = isHttp ? '' : null;
      if (isHttp && typeof EventSource !== 'undefined') this._connectSSE();
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
      return { serverOk: this.serverOk, sse: this.sse, authError: this.authError, queued: this.queue.length };
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
      if (this.es) this.es.close();
      this.sse = 'connecting';
      this._status();
      const es = new EventSource(`${this.serverBase}/events?role=${this.role}`);
      this.es = es;
      es.onopen = () => {
        if (es !== this.es) return;
        this.serverOk = true;
        this.sse = 'open';
        this._sseBackoff = 0;
        this._status();
      };
      es.onmessage = (e) => {
        if (es !== this.es) return;
        try {
          this._emit(JSON.parse(e.data));
        } catch (_) {
          /* ignore malformed frames */
        }
      };
      es.onerror = () => {
        if (es !== this.es) return;
        this.serverOk = false;
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
  }

  global.LiveFXBus = { Bus };
})(typeof window !== 'undefined' ? window : globalThis);
