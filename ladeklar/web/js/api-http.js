// Transport for the real server: JSON calls, live events over SSE, uploads, Web Push and an
// offline outbox (IndexedDB) so drivers in a dead zone can keep tapping – steps and photos are
// sent in order as soon as the network is back.
const OFFLINE_OK = new Set(['acceptDelivery', 'advanceDelivery', 'addNote', 'reportProblem', 'undoStep']);

export class ApiError extends Error {
  constructor(code, message, status, details) { super(message); this.code = code; this.status = status; this.details = details; }
}

// ---------- tiny IndexedDB queue ----------
function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('ladeklar', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function qAll() { const db = await idb(); return new Promise((res) => { const out = []; db.transaction('outbox').objectStore('outbox').openCursor().onsuccess = (e) => { const c = e.target.result; if (c) { out.push(c.value); c.continue(); } else res(out); }; }); }
async function qAdd(item) { const db = await idb(); return new Promise((res) => { db.transaction('outbox', 'readwrite').objectStore('outbox').add(item).onsuccess = (e) => res(e.target.result); }); }
async function qDel(seq) { const db = await idb(); return new Promise((res) => { db.transaction('outbox', 'readwrite').objectStore('outbox').delete(seq).onsuccess = () => res(); }); }

export function createHttpApi() {
  const listeners = new Set();
  const emit = (e) => listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } });
  let es = null, online = navigator.onLine, queueSize = 0, flushing = false;

  async function req(method, url, body, headers = {}) {
    let res;
    try {
      res = await fetch(url, { method, credentials: 'same-origin', headers: { 'X-Ladeklar': '1', ...(body && !(body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? (body instanceof Blob ? body : JSON.stringify(body)) : undefined });
    } catch (e) {
      throw new ApiError('network', 'Keine Verbindung.', 0);
    }
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : null;
    if (!res.ok) throw new ApiError(data?.error?.code || 'http', data?.error?.message || 'Fehler ' + res.status, res.status, data?.error?.details);
    return data;
  }

  function setOnline(v) { if (online !== v) { online = v; emit({ type: 'online', online: v }); if (v) flush(); } }
  window.addEventListener('online', () => setOnline(true));
  window.addEventListener('offline', () => setOnline(false));

  async function refreshQueue() { try { queueSize = (await qAll()).length; } catch { queueSize = 0; } emit({ type: 'queue', size: queueSize }); }
  async function flush() {
    if (flushing) return;
    flushing = true;
    try {
      for (const item of await qAll()) {
        try {
          if (item.kind === 'upload') await req('POST', item.url, item.blob, { 'Content-Type': item.blob.type });
          else await req('POST', '/api/call/' + item.method, item.args);
          await qDel(item.seq);
        } catch (e) {
          if (e.code === 'network') { setOnline(false); break; }
          await qDel(item.seq); // the server rejected it (e.g. step already done) – drop and tell the UI
          emit({ type: 'queue-error', error: e, item: { method: item.method } });
        }
      }
    } finally { flushing = false; await refreshQueue(); emit({ type: 'change', col: 'deliveries', id: null }); }
  }
  setInterval(() => { if (queueSize) flush(); }, 15000);

  function connect() {
    if (es) es.close();
    es = new EventSource('/api/events');
    es.addEventListener('hello', () => setOnline(true));
    es.addEventListener('change', (e) => emit({ type: 'change', ...JSON.parse(e.data) }));
    es.addEventListener('notify', (e) => emit({ type: 'notify', notification: JSON.parse(e.data) }));
    es.onerror = () => { if (!navigator.onLine) setOnline(false); };
  }

  const api = {
    mode: 'server',
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get online() { return online; },
    get queueSize() { return queueSize; },
    async session() {
      try { const me = await req('GET', '/api/session'); connect(); refreshQueue(); flush(); return me; } catch (e) { if (e.status === 401) return null; if (e.code === 'network') { const cached = localStorage.getItem('lk.me'); return cached ? JSON.parse(cached) : null; } throw e; }
    },
    async login(b) { await req('POST', '/api/auth/login', b); return api.session(); },
    async driverLogin(b) { await req('POST', '/api/auth/driver', b); return api.session(); },
    async inviteLogin(b) { await req('POST', '/api/auth/invite', b); return api.session(); },
    async logout() { try { await api.push.disable(); } catch { /* ignore */ } await req('POST', '/api/auth/logout'); if (es) es.close(); try { localStorage.removeItem('lk.me'); } catch { /* */ } },
    publicTenant: (code) => req('GET', '/api/public/tenant/' + encodeURIComponent(code)).catch(() => null),
    inviteInfo: (id) => req('GET', '/api/public/invite/' + encodeURIComponent(id)).catch(() => null),
    async call(method, args = {}) {
      try { return await req('POST', '/api/call/' + method, args); } catch (e) {
        if (e.code === 'network' && OFFLINE_OK.has(method)) { await qAdd({ kind: 'call', method, args, at: Date.now() }); await refreshQueue(); setOnline(false); return { queued: true }; }
        throw e;
      }
    },
    async upload(blob, { kind, deliveryId, name } = {}) {
      const url = `/api/files?kind=${encodeURIComponent(kind || 'other')}${deliveryId ? '&deliveryId=' + encodeURIComponent(deliveryId) : ''}${name ? '&name=' + encodeURIComponent(name) : ''}`;
      try { return await req('POST', url, blob, { 'Content-Type': blob.type }); } catch (e) {
        if (e.code === 'network' && deliveryId) { await qAdd({ kind: 'upload', url, blob, at: Date.now() }); await refreshQueue(); setOnline(false); return { queued: true, id: 'local-' + Date.now(), localUrl: URL.createObjectURL(blob) }; }
        throw e;
      }
    },
    fileUrl: (id) => '/api/files/' + encodeURIComponent(id),
    exportUrl: (kind, q = '') => ({ zip: '/api/export/all.zip', json: '/api/export/all.json', csv: '/api/export/deliveries.csv', billing: '/api/export/billing.csv' + q }[kind]),
    inviteLink: (userId) => `${location.origin}/i/${userId}`,
    tenantLink: (code) => `${location.origin}/t/${code}`,
    push: {
      supported: () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
      state: () => ('Notification' in window ? Notification.permission : 'unsupported'),
      async enable() {
        const reg = await navigator.serviceWorker.ready;
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return perm;
        const { publicKey } = await req('GET', '/api/push/key');
        const key = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (publicKey.length % 4)) % 4)), (c) => c.charCodeAt(0));
        const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
        await req('POST', '/api/push/subscribe', sub.toJSON());
        return 'granted';
      },
      async disable() {
        if (!('serviceWorker' in navigator)) return;
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) { await req('POST', '/api/push/unsubscribe', { endpoint: sub.endpoint }); await sub.unsubscribe(); }
      },
    },
  };
  return api;
}
