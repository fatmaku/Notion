// Demo transport: the real engine runs in the browser on an in-memory store. The demo world is
// kept in localStorage, mirrored to other tabs (BroadcastChannel) and – optionally – to other
// devices through a sync adapter (see demo-sync.js). Each screen pane gets its own client with
// its own session, so the office and the driver phone can run side by side.
import { createEngine } from '../../core/engine.js';
import { createMemStore } from '../../core/memstore.js';
import { seedDemo, DEMO } from '../../core/seed.js';

const KEY = 'ladeklar.demo.v2';
const PERSIST = ['tenants', 'users', 'vehicles', 'deliveries', 'notifications', 'files', 'audit'];
const storage = (() => { try { const s = window.localStorage; s.setItem('lk.t', '1'); s.removeItem('lk.t'); return s; } catch { return null; } })();
const sess = (() => { try { return window.sessionStorage; } catch { return null; } })();
const rid = () => { const a = new Uint8Array(9); crypto.getRandomValues(a); return Array.from(a, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 14); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export { DEMO };

export function createDemoWorld() {
  let fixed = null;
  const clock = { set: (t) => { fixed = t; }, reset: () => { fixed = null; } };
  const listeners = new Set();
  const emit = (e) => listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } });
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ladeklar-demo') : null;
  let saveTimer = 0;
  const world = { sync: null, storageOk: !!storage };

  let initial = {};
  try { const raw = storage?.getItem(KEY); if (raw) initial = JSON.parse(raw); } catch { initial = {}; }
  const store = createMemStore({
    data: initial,
    onWrite: (batch) => {
      scheduleSave();
      try { bc?.postMessage({ batch }); } catch { /* ignore */ }
      world.sync?.push(batch);
    },
  });
  function scheduleSave() {
    if (!storage) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const d = store.dump(); const out = {};
      for (const c of PERSIST) out[c] = d[c] || [];
      try { storage.setItem(KEY, JSON.stringify(out)); } catch { /* quota: keep in memory */ }
    }, 250);
  }
  const engine = createEngine({
    store, now: () => fixed ?? Date.now(), newId: rid,
    hash: { make: (s) => 'demo$' + s, verify: (s, h) => h === 'demo$' + s },
    onEvent: (e) => emit(e),
  });
  if (!store.find('users', { role: 'platform' }).length) { seedDemo({ engine, store, clock }); scheduleSave(); }

  /** Apply documents that arrived from another tab/device and tell the panes. */
  function applyRemote(batch) {
    for (const { col, id, doc } of batch) {
      const before = store.get(col, id);
      if (JSON.stringify(before) === JSON.stringify(doc)) continue;
      store.applyRemote(col, id, doc);
      if (col === 'notifications' && doc && !before && !doc.read && Date.now() - doc.at < 120000) emit({ type: 'notify', userId: doc.userId, notification: doc });
      else if (['deliveries', 'vehicles', 'tenants', 'users'].includes(col)) emit({ type: 'change', col, id, tenantId: (doc || before)?.tenantId || null, allDrivers: true, remote: true });
    }
    scheduleSave();
  }
  bc && (bc.onmessage = (m) => { if (m.data?.batch) applyRemote(m.data.batch); if (m.data?.reset) location.reload(); });

  world.store = store;
  world.engine = engine;
  world.applyRemote = applyRemote;
  world.on = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
  world.reset = () => {
    try { storage?.removeItem(KEY); } catch { /* */ }
    try { for (const k of Object.keys(sess || {})) if (k.startsWith('lk.demo.')) sess.removeItem(k); } catch { /* */ }
    try { bc?.postMessage({ reset: true }); } catch { /* */ }
    location.reload();
  };
  /** Replace the whole world (joining a live-sync room). */
  world.replaceAll = (docsByCol) => {
    store.clear();
    for (const [col, docs] of Object.entries(docsByCol)) for (const d of docs) store.applyRemote(col, d.id, d);
    scheduleSave();
    emit({ type: 'reset' });
  };
  world.find = (col, where) => store.find(col, where);
  world.user = (id) => store.get('users', id);

  /** One client per pane (own session). */
  world.client = (paneId) => {
    const own = new Set();
    let userId = null;
    try { userId = sess?.getItem('lk.demo.' + paneId) || null; } catch { /* */ }
    const actor = () => (userId ? engine.auth.actor(userId) : null);
    const setUser = (id) => { userId = id; try { if (id) sess?.setItem('lk.demo.' + paneId, id); else sess?.removeItem('lk.demo.' + paneId); } catch { /* */ } };
    world.on((e) => {
      const a = actor();
      if (!a) return;
      if (e.type === 'reset') { own.forEach((fn) => fn({ type: 'change', col: 'tenants', id: null })); return; }
      if (e.type === 'notify') { if (e.userId === a.id) own.forEach((fn) => fn(e)); return; }
      if (e.type !== 'change') return;
      if (a.role === 'platform') { if (e.col === 'tenants' || e.remote) own.forEach((fn) => fn(e)); return; }
      if (e.tenantId && e.tenantId !== a.tenantId) return;
      if (a.role === 'driver' && !(e.allDrivers || (e.drivers || []).includes(a.id) || e.col === 'tenants')) return;
      own.forEach((fn) => fn(e));
    });
    const run = async (fn, ms = 90) => { await sleep(ms); return fn(); };
    const api = {
      mode: 'demo', online: true, queueSize: 0,
      on(fn) { own.add(fn); return () => own.delete(fn); },
      get userId() { return userId; },
      loginAs(id) { setUser(id); },
      async session() { const a = actor(); return a ? engine.call(a, 'me', {}) : null; },
      login: (b) => run(() => { const u = engine.auth.login(b); setUser(u.id); return engine.call(u, 'me', {}); }, 250),
      driverLogin: (b) => run(() => { const u = engine.auth.driverLogin(b); setUser(u.id); return engine.call(u, 'me', {}); }, 250),
      inviteLogin: (b) => run(() => { const u = engine.auth.inviteLogin(b); setUser(u.id); return engine.call(u, 'me', {}); }, 250),
      async logout() { setUser(null); },
      publicTenant: async (code) => engine.auth.publicTenant(code),
      inviteInfo: async (id) => engine.auth.inviteInfo(id),
      call: (method, args = {}) => run(() => {
        const a = actor();
        if (!a) { const e = new Error('Bitte anmelden.'); e.code = 'unauthorized'; throw e; }
        return JSON.parse(JSON.stringify(engine.call(a, method, args) ?? null));
      }),
      async upload(blob, { kind, deliveryId, name } = {}) {
        const data = await new Promise((r, j) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = j; fr.readAsDataURL(blob); });
        return api.call('createFile', { kind, mime: blob.type, size: blob.size, name, deliveryId: deliveryId || null, data });
      },
      fileUrl(id) {
        const a = actor();
        const f = engine.canReadFile(a, id);
        return f?.data || '';
      },
      exportUrl: () => '#',
      inviteLink: (id) => `https://app.ladeklar.de/i/${id}`,
      tenantLink: (code) => `https://app.ladeklar.de/t/${code}`,
      push: null,
    };
    return api;
  };
  return world;
}
