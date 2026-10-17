// Transport for the real server: JSON calls, live events over SSE, uploads, Web Push and an
// offline outbox (IndexedDB) so drivers in a dead zone can keep tapping – steps and photos are
// sent in order as soon as the network is back.
// Outbox rules: strict FIFO per user; while it holds items, new writes queue behind them. An item
// leaves only when the server accepted it or answered with a definite 4xx (then it is listed as
// "not sent" for the driver). Network errors, timeouts, 5xx, 429 and 401 keep it (401: until the
// same user signs in again). Every write carries an idempotency key `_op` (C1), driver steps and
// notes the tap time `at` (C2) – both stay the same for retries. The driver's last session and
// data stay in IndexedDB, so a cold start in a dead zone still shows the tours.
const OFFLINE_OK = new Set(['acceptDelivery', 'advanceDelivery', 'addNote', 'reportProblem']);
const READ = new Set(['me', 'listNotifications', 'listTenants', 'getTenantLicense', 'platformStats', 'billingRun', 'exportData', 'auditLog', 'listUsers', 'listVehicles', 'listDeliveries', 'getDelivery', 'dashboard', 'places', 'reports', 'driverHome', 'myHistory']);
const CACHED = new Set(['driverHome', 'getDelivery', 'myHistory', 'listNotifications', 'listVehicles']); // drivers only
const TAP_AT = new Set(['acceptDelivery', 'advanceDelivery', 'undoStep', 'reportProblem', 'addNote', 'returnDelivery']);
const MAX_UPLOAD = 15e6;
const PENDING_LOGOUT = 'lk.logoutPending';

export class ApiError extends Error {
  constructor(code, message, status, details) { super(message); this.code = code; this.status = status; this.details = details; }
}
const offline = (status = 0) => new ApiError('network', 'Keine Verbindung.', status);
/** Worth retrying later: no network, timeout, gateway/server trouble, rate limit, CSRF hiccup. */
export const transient = (e) => !e?.status || e.code === 'network' || e.status === 408 || e.status === 425 || e.status === 429 || e.status >= 500 || (e.status === 403 && e.code === 'csrf');
export function newOp() {
  const a = new Uint8Array(16);
  try { crypto.getRandomValues(a); } catch { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); }
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- storage: outbox (FIFO by seq) + key/value cache ----------
export function memoryDb() {
  const box = new Map(), kv = new Map();
  const copy = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v))); // like IndexedDB: values are copies
  let seq = 0;
  return {
    all: async () => [...box.values()].sort((a, b) => a.seq - b.seq),
    add: async (item) => { const s = ++seq; box.set(s, { ...item, seq: s }); return s; },
    del: async (s) => { box.delete(s); },
    get: async (k) => copy(kv.get(k)),
    set: async (k, v) => { kv.set(k, copy(v)); },
    drop: async (pred) => { for (const k of [...kv.keys()]) if (pred(k)) kv.delete(k); },
  };
}
function indexedDbStore() {
  let dbp = null;
  const store = { broken: false };
  const open = () => dbp || (dbp = new Promise((resolve, reject) => {
    const r = indexedDB.open('ladeklar', 2);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    r.onsuccess = () => { const db = r.result; db.onversionchange = () => { db.close(); dbp = null; }; resolve(db); };
    r.onerror = () => { dbp = null; store.broken = true; reject(r.error); };
    // an old tab still holding version 1 blocks the upgrade: do not hang the app, use memory for now
    setTimeout(() => { if (!r.readyState || r.readyState === 'pending') { store.broken = true; reject(new Error('IndexedDB blocked')); } }, 4000);
  }));
  const tx = async (name, mode, fn) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(name, mode);
      let out;
      const r = fn(t.objectStore(name));
      if (r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => resolve(out);
      t.onerror = t.onabort = () => reject(t.error);
    });
  };
  return Object.assign(store, {
    all: () => tx('outbox', 'readonly', (s) => s.getAll()),
    add: (item) => tx('outbox', 'readwrite', (s) => s.add(item)),
    del: (seq) => tx('outbox', 'readwrite', (s) => s.delete(seq)),
    get: (k) => tx('kv', 'readonly', (s) => s.get(k)),
    set: (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k)),
    drop: (pred) => tx('kv', 'readwrite', (s) => { s.openCursor().onsuccess = (e) => { const c = e.target.result; if (c) { if (pred(String(c.key))) c.delete(); c.continue(); } }; }),
  });
}
/** IndexedDB, or memory when the browser blocks it (private mode): the app works, nothing survives a reload. */
function defaultDb() {
  const mem = memoryDb();
  let real = typeof indexedDB !== 'undefined' ? indexedDbStore() : null;
  // only a database that cannot be opened at all is replaced – a failing write must not hide queued steps
  const pick = (k) => async (...a) => { if (real) { try { return await real[k](...a); } catch (e) { if (!real.broken) throw e; real = null; } } return mem[k](...a); };
  return Object.fromEntries(['all', 'add', 'del', 'get', 'set', 'drop'].map((k) => [k, pick(k)]));
}
const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

export function createHttpApi(opts = {}) {
  const db = opts.db || defaultDb();
  const listeners = new Set();
  const emit = (e) => listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } });
  let es = null, online = navigator.onLine !== false, queueSize = 0, flushP = null, dirty = false;
  let user = null, fromCache = false, logoutP = null, pendingP = null, nextP = null;
  const waiters = new Map(); // outbox seq → resolve, for a tap that waits briefly for its own turn

  async function req(method, url, body, headers = {}, ms = 20000) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), ms) : 0;
    try {
      let res;
      try {
        res = await fetch(url, { method, credentials: 'same-origin', signal: ctl?.signal, headers: { 'X-Ladeklar': '1', ...(body && !(body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? (body instanceof Blob ? body : JSON.stringify(body)) : undefined });
      } catch { throw offline(); }
      const ct = res.headers.get('content-type') || '';
      // not our JSON (gateway page, captive portal): only a plain 4xx is a real answer
      if (!ct.includes('json')) {
        if (res.status >= 400 && res.status < 500 && ![401, 408, 425, 429].includes(res.status)) throw new ApiError('http', 'Das hat nicht geklappt.', res.status);
        throw offline(res.status);
      }
      let data;
      try { data = await res.json(); } catch { throw offline(res.status); }
      if (!res.ok) throw new ApiError(data?.error?.code || 'http', data?.error?.message || 'Das hat nicht geklappt.', res.status, data?.error?.details);
      return data;
    } finally { clearTimeout(timer); }
  }

  function setOnline(v) {
    if (online === v) return;
    online = v;
    emit({ type: 'online', online: v });
    if (v) { if (fromCache || !es || es.readyState === 2) revalidate(); else flush(); }
  }
  const reached = () => setOnline(true); // any answer from our server proves the network is back
  window.addEventListener('online', () => { if (user) revalidate(); else setOnline(true); });
  window.addEventListener('offline', () => setOnline(false));

  const mine = (x) => !x.userId || (user && x.userId === user.id);
  async function refreshQueue() {
    try { queueSize = user ? (await db.all()).filter(mine).length : 0; } catch { queueSize = 0; }
    emit({ type: 'queue', size: queueSize });
  }
  async function enqueue(item, { wait = false, kick = true } = {}) {
    const seq = await db.add({ ...item, userId: user?.id || null, at: Date.now() });
    dirty = true;
    await refreshQueue();
    // online with older items ahead: give the tap a moment to get its real answer
    const answer = wait && online ? new Promise((r) => { waiters.set(seq, r); setTimeout(() => r(null), 3000); }) : null;
    if (kick) flush();
    const a = answer && (await answer);
    waiters.delete(seq);
    if (a?.error) throw a.error;
    if (a) return a.result;
    return null;
  }
  const describe = (x) => ({ kind: x.kind, method: x.method || null, step: x.args?.step || null, id: x.args?.id || x.deliveryId || null, fileKind: x.fileKind || null, at: x.at });
  async function addFailed(item, e) {
    const k = 'failed:' + (item.userId || user?.id || '');
    const list = (await db.get(k)) || [];
    await db.set(k, [...list, { ...describe(item), code: e.code, message: e.message, failedAt: Date.now() }].slice(-50));
  }

  /** Sends the outbox in order; callers that must not overtake it can await the running flush. */
  function flush() {
    // already sending: one more round right after it (it may have stopped at a dead network)
    if (flushP) { dirty = true; return (nextP = nextP || flushP.then(() => { nextP = null; return flush(); })); }
    if (!user || ls.get(PENDING_LOGOUT)) return Promise.resolve();
    flushP = flushNow().finally(() => { flushP = null; });
    return flushP;
  }
  async function flushNow() {
    let sent = 0;
    try {
      for (;;) {
        dirty = false;
        const item = (await db.all()).find(mine);
        if (!item) { if (dirty) continue; break; }
        let out;
        try {
          out = item.kind === 'upload' ? await req('POST', item.url, item.blob, { 'Content-Type': item.blob.type }, 120000) : await req('POST', '/api/call/' + item.method, item.args);
        } catch (e) {
          if (e.status === 401) { authLost(); break; }
          if (transient(e)) { setOnline(false); break; }
          // a definite answer (wrong step, missing proof …): out of the queue, but never silently
          await db.del(item.seq);
          const w = waiters.get(item.seq);
          if (w) w({ error: e });
          else { await addFailed(item, e); emit({ type: 'queue-error', error: e, item: describe(item) }); }
          sent++;
          continue;
        }
        await db.del(item.seq);
        sent++;
        reached();
        waiters.get(item.seq)?.({ result: out ?? {} });
      }
    } finally {
      for (const w of waiters.values()) w(null); // stopped (no network, signed out): the waiting taps stay queued
      await refreshQueue();
      if (sent) emit({ type: 'change', col: 'deliveries', id: null });
    }
  }

  // ---------- session ----------
  async function cachedMe() {
    const me = await db.get('me').catch(() => null);
    if (me) return me;
    try { return JSON.parse(ls.get('lk.me') || 'null'); } catch { return null; } // written by older versions
  }
  async function fresh(me) {
    const changed = fromCache;
    user = me.user; fromCache = false;
    await db.set('me', me).catch(() => {});
    if (!es || es.readyState === 2) connect();
    reached();
    await refreshQueue();
    flush();
    return changed;
  }
  /** 401: the session is gone. The outbox stays and is sent after the same user signs in again. */
  function authLost() {
    const queued = queueSize;
    if (es) { es.close(); es = null; }
    user = null; fromCache = false;
    db.drop((k) => k === 'me').catch(() => {});
    ls.set('lk.me', null);
    refreshQueue();
    emit({ type: 'auth', queued });
  }
  let checking = null;
  /** After a start from the cache or a dead stream: ask the server who we are, then go live. */
  function revalidate() {
    if (checking || !user) return checking;
    checking = (async () => {
      try {
        if (!(await loggedOut())) return;
        const me = await req('GET', '/api/session');
        if (me?.user?.id !== user?.id) return authLost();
        if (await fresh(me)) emit({ type: 'session', me });
      } catch (e) {
        if (e.status === 401) authLost();
        else if (transient(e)) setOnline(false);
      } finally { checking = null; }
    })();
    return checking;
  }
  /** Logout that could not reach the server: sent before anything else once the network is back. */
  function sendPendingLogout() {
    return pendingP || (pendingP = (async () => {
      const raw = ls.get(PENDING_LOGOUT);
      if (!raw) return true;
      let p = {};
      try { p = JSON.parse(raw) || {}; } catch { /* old flag */ }
      try {
        if (p.endpoint) await req('POST', '/api/push/unsubscribe', { endpoint: p.endpoint }).catch((e) => { if (transient(e)) throw e; });
        await req('POST', '/api/auth/logout');
      } catch (e) { if (transient(e)) return false; }
      ls.set(PENDING_LOGOUT, null);
      return true;
    })().finally(() => { pendingP = null; }));
  }
  /** A logout still on its way must finish before a new login (its answer clears the cookie). */
  async function loggedOut() { if (logoutP) await logoutP.catch(() => {}); return sendPendingLogout(); }

  const tick = setInterval(() => {
    if (!user) { if (ls.get(PENDING_LOGOUT)) sendPendingLogout(); return; }
    if (fromCache || !online || !es || es.readyState === 2) revalidate();
    else if (queueSize) flush();
  }, 15000);
  tick?.unref?.();

  function connect() {
    if (es) es.close();
    if (typeof EventSource === 'undefined') return;
    es = new EventSource('/api/events');
    es.addEventListener('hello', () => { reached(); if (queueSize) flush(); });
    es.addEventListener('change', (e) => emit({ type: 'change', ...JSON.parse(e.data) }));
    es.addEventListener('notify', (e) => emit({ type: 'notify', notification: JSON.parse(e.data) }));
    es.onerror = () => { if (!navigator.onLine) setOnline(false); };
  }

  const cacheKey = (method, args) => `c:${user?.id}:${method}${args?.id ? ':' + args.id : ''}`;
  const caches = () => user?.role === 'driver';
  async function remember(method, args, out) {
    if (!caches() || !CACHED.has(method)) return;
    await db.set(cacheKey(method, args), JSON.parse(JSON.stringify(out ?? null))).catch(() => {}); // a copy: the view adds offline steps to `out`
    if (method === 'driverHome') { // keep the details of the tours the driver still has, nothing older
      const ids = new Set([out?.current, ...(out?.mine || []), ...(out?.offered || [])].filter(Boolean).map((d) => d.id));
      const pre = `c:${user.id}:getDelivery:`;
      db.drop((k) => k.startsWith(pre) && !ids.has(k.slice(pre.length))).catch(() => {});
    }
  }
  async function wipe(uid) {
    await db.drop((k) => k === 'me' || (uid && (k.startsWith(`c:${uid}:`) || k === 'failed:' + uid))).catch(() => {});
    ls.set('lk.me', null);
  }
  const loginThen = async (url, b) => { await loggedOut(); await req('POST', url, b); return api.session(); };

  const pushOffKey = () => 'lk.pushOff.' + (user?.id || '');
  async function pushReg() { return navigator.serviceWorker?.getRegistration ? navigator.serviceWorker.getRegistration() : null; }
  async function subscribe(reg) {
    const { publicKey } = await req('GET', '/api/push/key');
    const key = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (publicKey.length % 4)) % 4)), (c) => c.charCodeAt(0));
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
    await req('POST', '/api/push/subscribe', sub.toJSON());
  }

  const api = {
    mode: 'server',
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get online() { return online; },
    get queueSize() { return queueSize; },
    /** Send the outbox now (also runs by itself: back online, SSE hello, every 15 s, after each answer). */
    flush: () => flush(),
    async session() {
      if (!(await loggedOut())) { user = null; return null; } // logged out offline: never resume that session
      try {
        const me = await req('GET', '/api/session');
        await fresh(me);
        return me;
      } catch (e) {
        if (e.status === 401) { user = null; await wipe(null); await refreshQueue(); return null; }
        if (!transient(e)) throw e;
        setOnline(false);
        const me = await cachedMe();
        if (!me) return null;
        user = me.user; fromCache = true;
        connect(); // EventSource retries on its own; 'hello' brings the app back online
        await refreshQueue();
        return me;
      }
    },
    login: (b) => loginThen('/api/auth/login', b),
    driverLogin: (b) => loginThen('/api/auth/driver', b),
    inviteLogin: (b) => loginThen('/api/auth/invite', b),
    /** Ends the session locally at once; the server hears about it now or as soon as there is network. */
    async logout() {
      const uid = user?.id, at = Date.now();
      if (es) { es.close(); es = null; }
      user = null; fromCache = false;
      ls.set(PENDING_LOGOUT, JSON.stringify({ at })); // cleared once the server has heard it
      await wipe(uid);
      await refreshQueue();
      logoutP = (async () => {
        let endpoint = null;
        try { endpoint = await api.push.disable(); } catch { /* ignore */ }
        if (endpoint) ls.set(PENDING_LOGOUT, JSON.stringify({ endpoint, at }));
        await sendPendingLogout();
      })().finally(() => { logoutP = null; });
      await Promise.race([logoutP, new Promise((r) => setTimeout(r, 1500))]); // the login screen never waits for a dead network
    },
    publicTenant: (code) => req('GET', '/api/public/tenant/' + encodeURIComponent(code)).catch(() => null),
    /** null = invite unknown, used or expired; throws when the server cannot be reached. */
    inviteInfo: (token) => req('GET', '/api/public/invite/' + encodeURIComponent(token)).catch((e) => { if (e.status === 404) return null; throw e; }),
    async call(method, args = {}) {
      const write = !READ.has(method);
      if (write) {
        args = { ...args };
        if (!args._op) args._op = newOp();
        if (TAP_AT.has(method) && args.at == null) args.at = Date.now();
      }
      const queueable = OFFLINE_OK.has(method) && user;
      if (queueable && queueSize > 0) return (await enqueue({ kind: 'call', method, args }, { wait: true })) || { queued: true };
      if (write && queueSize > 0) { // never overtake queued steps
        await flush();
        if (!user) throw new ApiError('unauthorized', 'Bitte anmelden.', 401);
        if (queueSize > 0) throw offline();
      }
      try {
        const out = await req('POST', '/api/call/' + method, args);
        reached();
        remember(method, args, out);
        if (queueSize) flush();
        return out;
      } catch (e) {
        if (queueable && (transient(e) || e.status === 401)) {
          await enqueue({ kind: 'call', method, args }, { kick: false });
          if (e.status === 401) authLost(); else setOnline(false);
          return { queued: true };
        }
        if (transient(e)) {
          setOnline(false);
          if (caches() && CACHED.has(method)) { const c = await db.get(cacheKey(method, args)).catch(() => undefined); if (c !== undefined) return c; }
        }
        throw e;
      }
    },
    async upload(blob, { kind, deliveryId, name } = {}) {
      if (blob.size > MAX_UPLOAD) throw new ApiError('too_large', 'Die Datei ist zu groß.', 413);
      const url = `/api/files?kind=${encodeURIComponent(kind || 'other')}${deliveryId ? '&deliveryId=' + encodeURIComponent(deliveryId) : ''}${name ? '&name=' + encodeURIComponent(name) : ''}`;
      const item = { kind: 'upload', url, blob, fileKind: kind || 'other', deliveryId: deliveryId || null, name: name || null };
      const local = () => ({ queued: true, id: 'local-' + Date.now(), localUrl: URL.createObjectURL(blob) });
      const queueable = deliveryId && user;
      if (queueable && queueSize > 0) return (await enqueue(item, { wait: true })) || local();
      try { const f = await req('POST', url, blob, { 'Content-Type': blob.type }, 120000); reached(); if (queueSize) flush(); return f; } catch (e) {
        if (queueable && (transient(e) || e.status === 401)) {
          await enqueue(item, { kick: false });
          if (e.status === 401) authLost(); else setOnline(false);
          return local();
        }
        throw e;
      }
    },
    /** What still waits in the outbox for the signed-in user (steps, photos) – for the offline view. */
    outbox: async () => (user ? (await db.all().catch(() => [])).filter(mine) : []),
    /** Queued items the server refused for good, so the driver sees what was not sent and why. */
    failed: async () => (user ? (await db.get('failed:' + user.id).catch(() => null)) || [] : []),
    clearFailed: async () => { if (user) await db.set('failed:' + user.id, []).catch(() => {}); },
    fileUrl: (id) => '/api/files/' + encodeURIComponent(id),
    exportUrl: (kind, q = '') => ({ zip: '/api/export/all.zip', json: '/api/export/all.json', csv: '/api/export/deliveries.csv', billing: '/api/export/billing.csv' + q }[kind]),
    inviteLink: (token) => `${location.origin}/i/${token}`,
    tenantLink: (code) => `${location.origin}/t/${code}`,
    push: {
      supported: () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window,
      state: () => ('Notification' in window ? Notification.permission : 'unsupported'),
      /** 'on' | 'off' | 'blocked' | 'unsupported' – for the switch in the driver's "Mehr" screen */
      async status() {
        if (!api.push.supported()) return 'unsupported';
        if (Notification.permission === 'denied') return 'blocked';
        if (Notification.permission !== 'granted' || ls.get(pushOffKey())) return 'off';
        const sub = await (await pushReg())?.pushManager.getSubscription().catch(() => null);
        return sub ? 'on' : 'off';
      },
      async enable() {
        const reg = await navigator.serviceWorker.ready;
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return perm;
        ls.set(pushOffKey(), null);
        await subscribe(reg);
        return 'granted';
      },
      /** Ends the subscription here and on the server. Returns the endpoint when the server could not be told. */
      async disable({ byUser = false } = {}) {
        if (byUser) ls.set(pushOffKey(), '1');
        const sub = await (await pushReg())?.pushManager.getSubscription().catch(() => null);
        if (!sub) return null;
        let endpoint = sub.endpoint;
        try { await req('POST', '/api/push/unsubscribe', { endpoint }); endpoint = null; } catch { /* told later (pending logout) */ }
        try { await sub.unsubscribe(); } catch { /* browser offline */ }
        return endpoint;
      },
      /** C7: subscriptions end with a PIN/password change – renew silently when the permission is still there. */
      async resubscribe() {
        if (!api.push.supported() || Notification.permission !== 'granted' || ls.get(pushOffKey()) || !user || fromCache) return false;
        const reg = await pushReg();
        if (!reg) return false;
        await subscribe(reg);
        return true;
      },
    },
  };
  return api;
}
