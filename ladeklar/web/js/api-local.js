// Demo transport: the real engine runs in the browser on an in-memory store. The demo world is
// kept in localStorage, mirrored to other tabs (BroadcastChannel) and – optionally – to other
// devices through a sync adapter (see demo-sync.js). Each screen pane gets its own client with
// its own session, so the office and the driver phone can run side by side.
import { createEngine } from '../../core/engine.js';
import { createMemStore } from '../../core/memstore.js';
import { seedDemo, DEMO } from '../../core/seed.js';
import { sha256 } from '../../core/sha256.js';

const KEY = 'ladeklar.demo.v2';
const MAX_AGE = 12 * 3600e3; // an older demo world is seeded again, so "today's" tours and trial ends stay current
const PERSIST = ['tenants', 'users', 'vehicles', 'deliveries', 'notifications', 'files', 'audit'];
const storage = (() => { try { const s = window.localStorage; s.setItem('lk.t', '1'); s.removeItem('lk.t'); return s; } catch { return null; } })();
const sess = (() => { try { return window.sessionStorage; } catch { return null; } })();
const rid = () => { const a = new Uint8Array(9); crypto.getRandomValues(a); return Array.from(a, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 14); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const B64U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const token = () => { const a = new Uint8Array(24); crypto.getRandomValues(a); return Array.from(a, (b) => B64U[b & 63]).join(''); };
// links created in the demo open the demo itself (#t/CODE, #i/TOKEN – see demo.js), never production
const here = () => { try { return String(location.href).split('#')[0]; } catch { return ''; } };

export { DEMO };

export function createDemoWorld() {
  let fixed = null;
  const clock = { set: (t) => { fixed = t; }, reset: () => { fixed = null; } };
  const listeners = new Set();
  const emit = (e) => listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } });
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ladeklar-demo') : null;
  let saveTimer = 0, frozen = false; // frozen: the world is being reset – nothing may write it back
  const world = { sync: null, storageOk: !!storage, refreshed: false };

  let initial = {}, seededAt = 0;
  try { const raw = storage?.getItem(KEY); if (raw) { const { seededAt: at, ...cols } = JSON.parse(raw); initial = cols; seededAt = Number(at) || 0; } } catch { initial = {}; }
  // a world without seededAt (older demo version) or seeded more than 12 h ago starts afresh
  const age = Date.now() - seededAt;
  if ((initial.users || []).some((u) => u.role === 'platform') && !(age > -6e4 && age < MAX_AGE)) { initial = {}; world.refreshed = true; }
  const store = createMemStore({
    data: initial,
    onWrite: (batch) => {
      scheduleSave();
      try { bc?.postMessage({ batch }); } catch { /* ignore */ }
      world.sync?.push(batch);
    },
  });
  function save() {
    if (!storage || frozen) return;
    const d = store.dump(); const out = { seededAt };
    for (const c of PERSIST) out[c] = d[c] || [];
    try { storage.setItem(KEY, JSON.stringify(out)); } catch { /* quota: keep in memory */ }
  }
  function scheduleSave() {
    if (!storage) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = 0; save(); }, 250);
  }
  // a reload or a closed tab right after a tap must not lose the last write
  try { window.addEventListener('pagehide', () => { if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; save(); } }); } catch { /* no window */ }
  const engine = createEngine({
    store, now: () => fixed ?? Date.now(), newId: rid,
    hash: { make: (s) => 'demo$' + s, verify: (s, h) => h === 'demo$' + s },
    digest: sha256, token, // C12 API keys hashed, C11 invite tokens – as on the server
    onEvent: (e) => emit(e),
  });
  if (!store.find('users', { role: 'platform' }).length) {
    seedDemo({ engine, store, clock });
    seededAt = Date.now();
    clearTimeout(saveTimer); saveTimer = 0; save();
    if (world.refreshed) {
      // sessions of the old world point to users that no longer exist; other open tabs reload the new world
      try { for (const k of Object.keys(sess || {})) if (k.startsWith('lk.demo.') && k !== 'lk.demo.mode') sess.removeItem(k); } catch { /* */ }
      try { bc?.postMessage({ reset: true }); } catch { /* */ }
    }
  }

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
  bc && (bc.onmessage = (m) => { if (m.data?.batch) applyRemote(m.data.batch); if (m.data?.reset) { frozen = true; location.reload(); } });

  world.store = store;
  world.engine = engine;
  world.applyRemote = applyRemote;
  world.on = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
  world.reset = () => {
    frozen = true; clearTimeout(saveTimer);
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
  world.seededAt = () => seededAt;
  /** The people of the sample company Kaya (the licensor may delete it) – null/[] when gone. */
  world.demoUsers = () => {
    const live = (u) => u.active !== false && !u.deleted;
    const kaya = store.find('tenants', { code: 'KAYA' })[0] || null;
    const of = (role) => (kaya ? store.find('users', { tenantId: kaya.id, role }).filter(live) : []);
    const drivers = of('driver');
    return {
      kaya, platform: store.find('users', { role: 'platform' }).filter(live)[0] || null,
      admin: of('admin')[0] || null, dispatcher: of('dispatcher')[0] || null, drivers,
      mehmet: drivers.find((d) => d.name.startsWith('Mehmet')) || drivers[0] || null,
    };
  };

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
      inviteLink: (tk) => `${here()}#i/${tk}`,
      tenantLink: (code) => `${here()}#t/${code}`,
      push: null,
    };
    return api;
  };
  return world;
}
