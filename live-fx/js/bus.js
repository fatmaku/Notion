// LiveFX – message bus between the control panel and the overlay.
//
// Two transports, used together:
//   1. BroadcastChannel  – works when panel and overlay run in the same browser (demo, testing).
//   2. Server-Sent Events via server.js – needed when the overlay runs inside OBS / Streamlabs,
//      which is a separate Chromium and cannot see the panel's BroadcastChannel.
(function (global) {
  'use strict';

  const CHANNEL = 'livefx';

  class Bus {
    constructor({ role }) {
      this.role = role; // 'panel' | 'overlay'
      this.listeners = new Set();
      this.serverOk = false;
      this.bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
      if (this.bc) this.bc.onmessage = (e) => this._emit(e.data);

      const isHttp = /^https?:/.test(global.location.protocol);
      this.serverBase = isHttp ? '' : null;
      if (role === 'overlay' && isHttp && typeof EventSource !== 'undefined') this._connectSSE();
      if (role === 'panel' && isHttp) this._pingServer();
    }

    onMessage(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    /** Broadcast an event to every overlay. */
    send(msg) {
      const payload = { ...msg, ts: Date.now() };
      if (this.bc) this.bc.postMessage(payload);
      if (this.serverBase !== null) {
        fetch(`${this.serverBase}/fire`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then((r) => (this.serverOk = r.ok))
          .catch(() => (this.serverOk = false));
      }
    }

    _emit(msg) {
      for (const fn of this.listeners) {
        try {
          fn(msg);
        } catch (e) {
          console.error('LiveFX listener failed', e);
        }
      }
    }

    _connectSSE() {
      const es = new EventSource(`${this.serverBase}/events`);
      es.onopen = () => (this.serverOk = true);
      es.onerror = () => (this.serverOk = false);
      es.onmessage = (e) => {
        try {
          this._emit(JSON.parse(e.data));
        } catch (_) {
          /* ignore malformed */
        }
      };
      this.es = es;
    }

    _pingServer() {
      fetch(`${this.serverBase}/health`)
        .then((r) => (this.serverOk = r.ok))
        .catch(() => (this.serverOk = false));
    }
  }

  global.LiveFXBus = { Bus };
})(typeof window !== 'undefined' ? window : globalThis);
