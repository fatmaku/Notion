// LiveFX – trigger store for the control panel. See docs/CONTRACTS.md §11.
//
// Sources, in order: the server (GET /api/triggers, http/https only), localStorage
// ('livefx.triggers.v2', migrating 'livefx.triggers.v1'), then LiveFXDefaultTriggers. Every result
// is normalized and merged with the defaults. Saves are debounced (300 ms), mirrored to
// localStorage and PUT to the server; failures are logged, never thrown.
(function (global) {
  'use strict';

  const KEY_V2 = 'livefx.triggers.v2';
  const KEY_V1 = 'livefx.triggers.v1';
  const DEBOUNCE_MS = 300;
  const API = '/api/triggers';

  const S = () => global.LiveFXSchema;

  let bus = null;
  let lastSavedAt = null; // updatedAt of our own last successful PUT
  let inFlight = null; // Promise of the running PUT (null when idle)
  let timer = null;
  let pending = null; // { triggers, removed }
  let waiters = []; // resolve() callbacks of save() calls waiting for the debounced PUT
  const remoteListeners = new Set();
  let heldRemote = []; // triggers-updated messages received while our own PUT was in flight

  // ---- helpers ----
  function isHttp() {
    return typeof global.location !== 'undefined' && /^https?:$/.test(global.location.protocol);
  }

  function warn(...a) {
    if (global.console) console.warn('[LiveFXStore]', ...a);
  }

  function defaults() {
    return S().normalizeTriggers(global.LiveFXDefaultTriggers || []).triggers;
  }

  /** Normalizes any raw list and appends the defaults that are neither present nor removed. */
  function finish(list, removed) {
    const n = S().normalizeTriggers(list);
    if (n.warnings.length) warn('Trigger bereinigt:', n.warnings);
    const rem = Array.isArray(removed) ? removed.filter((id) => typeof id === 'string') : undefined;
    return S().mergeWithDefaults({ triggers: n.triggers, removed: rem }, defaults());
  }

  function lsGet(key) {
    try {
      const raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function lsSet(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function lsRemove(key) {
    try {
      global.localStorage.removeItem(key);
    } catch (_) {
      /* unavailable */
    }
  }

  /** Extracts {triggers, removed} from a stored blob (array or {triggers, removed}). */
  function unpack(blob) {
    if (Array.isArray(blob)) return { triggers: blob, removed: undefined };
    if (blob && typeof blob === 'object' && Array.isArray(blob.triggers)) {
      return { triggers: blob.triggers, removed: Array.isArray(blob.removed) ? blob.removed : undefined };
    }
    return null;
  }

  function mirror(triggers, removed) {
    lsSet(KEY_V2, { version: 2, updatedAt: new Date().toISOString(), removed, triggers });
  }

  function removedFor(triggers) {
    return S().deriveRemoved(triggers, defaults());
  }

  // ---- load ----
  async function load() {
    if (isHttp()) {
      try {
        const r = await fetch(API, { cache: 'no-store' });
        if (r.ok) {
          const d = await r.json();
          if (d && d.ok && Array.isArray(d.triggers)) {
            lastSavedAt = typeof d.updatedAt === 'string' ? d.updatedAt : lastSavedAt;
            const triggers = finish(d.triggers, d.removed);
            mirror(triggers, removedFor(triggers));
            return { triggers, source: 'server' };
          }
        } else warn('Server antwortete mit', r.status, '– lokale Daten werden verwendet');
      } catch (e) {
        warn('Server nicht erreichbar – lokale Daten werden verwendet', e && e.message);
      }
    }

    let local = unpack(lsGet(KEY_V2));
    if (!local) {
      const v1 = unpack(lsGet(KEY_V1));
      if (v1) {
        // Migrate: v1 had no `removed` list, so missing defaults are treated as deleted.
        const n = S().normalizeTriggers(v1.triggers);
        local = { triggers: n.triggers, removed: removedFor(n.triggers) };
        if (lsSet(KEY_V2, { version: 2, updatedAt: new Date().toISOString(), removed: local.removed, triggers: local.triggers })) {
          lsRemove(KEY_V1);
        }
      }
    }
    if (local) return { triggers: finish(local.triggers, local.removed), source: 'local' };

    return { triggers: defaults(), source: 'defaults' };
  }

  // ---- save ----
  async function put(payload) {
    if (!isHttp()) return;
    try {
      const r = await fetch(API, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let d = null;
      try {
        d = await r.json();
      } catch (_) {
        /* no body */
      }
      if (!r.ok || !d || !d.ok) {
        warn('Speichern auf dem Server fehlgeschlagen:', r.status, d && (d.error || d.message));
        return;
      }
      if (typeof d.updatedAt === 'string') lastSavedAt = d.updatedAt;
      if (Array.isArray(d.warnings) && d.warnings.length) warn('Server-Hinweise:', d.warnings);
    } catch (e) {
      warn('Speichern auf dem Server fehlgeschlagen:', e && e.message);
    }
  }

  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return inFlight || Promise.resolve();
    const payload = pending;
    const resolvers = waiters;
    pending = null;
    waiters = [];
    const run = (async () => {
      try {
        await put(payload);
      } finally {
        for (const r of resolvers) r();
      }
    })().finally(() => {
      if (inFlight === run) inFlight = null;
      releaseHeldRemote();
    });
    inFlight = run;
    return run;
  }

  /** Debounced save. Resolves once the PUT has settled (or immediately when there is no server). */
  function save(triggers) {
    // Normalize only – never merge here, or a default the user just deleted would come back.
    const n = S().normalizeTriggers(Array.isArray(triggers) ? triggers : []);
    if (n.warnings.length) warn('Trigger bereinigt:', n.warnings);
    const list = n.triggers;
    const removed = removedFor(list);
    mirror(list, removed);
    pending = { triggers: list, removed };
    return new Promise((resolve) => {
      waiters.push(resolve);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => flush(), DEBOUNCE_MS);
    });
  }

  /** Restores the defaults and clears the removed list (immediate PUT). */
  async function reset() {
    const triggers = defaults();
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
    const resolvers = waiters;
    waiters = [];
    mirror(triggers, []);
    if (inFlight) await inFlight.catch(() => {});
    const run = put({ triggers, removed: [] }).finally(() => {
      if (inFlight === run) inFlight = null;
      releaseHeldRemote();
    });
    inFlight = run;
    try {
      await run;
    } finally {
      for (const r of resolvers) r();
    }
    return { triggers };
  }

  // ---- remote changes ----
  function releaseHeldRemote() {
    const held = heldRemote;
    heldRemote = [];
    for (const msg of held) dispatchRemote(msg);
  }

  function dispatchRemote(msg) {
    if (msg.updatedAt && msg.updatedAt === lastSavedAt) return; // our own save echoed back
    for (const fn of remoteListeners) {
      try {
        fn({ updatedAt: msg.updatedAt ?? null });
      } catch (e) {
        warn('onRemoteChange listener failed', e);
      }
    }
  }

  function onBusMessage(msg) {
    if (!msg || msg.type !== 'triggers-updated') return;
    if (inFlight || pending) heldRemote.push(msg); // decide once our PUT reported its updatedAt
    else dispatchRemote(msg);
  }

  function attachBus(b) {
    if (bus && bus.__livefxStoreOff) bus.__livefxStoreOff();
    bus = b || null;
    if (bus && typeof bus.onMessage === 'function') {
      const off = bus.onMessage(onBusMessage);
      bus.__livefxStoreOff = typeof off === 'function' ? off : () => {};
    }
  }

  function onRemoteChange(fn) {
    if (typeof fn !== 'function') return () => {};
    remoteListeners.add(fn);
    return () => remoteListeners.delete(fn);
  }

  global.LiveFXStore = {
    KEY_V2,
    KEY_V1,
    DEBOUNCE_MS,
    load,
    save,
    flush,
    reset,
    attachBus,
    onRemoteChange,
    get lastSavedAt() {
      return lastSavedAt;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
