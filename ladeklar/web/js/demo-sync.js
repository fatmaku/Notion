// Live sync between devices for the online demo (Claude artifact "db" capability):
// every document of the demo world is mirrored to rooms/<CODE>/<collection>/<id>, and
// snapshots from the other device are applied locally – so a driver on the phone and the
// office on the PC see each other's taps live. Without the capability the demo stays local.
const COLS = ['tenants', 'users', 'vehicles', 'deliveries', 'notifications', 'files'];
const MAX_DOC = 240 * 1024;

export async function dbAvailable() {
  try { const db = await window.claude?.use?.('db'); return db || null; } catch { return null; }
}

export function newRoomCode() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = new Uint8Array(6); crypto.getRandomValues(r);
  return Array.from(r, (x) => a[x % a.length]).join('');
}

export async function startSync(world, db, code, { create = false, onStatus = () => {} } = {}) {
  const base = `rooms/${code}`;
  const pending = new Map(); // path -> doc|null
  let busy = false, stopped = false;
  const subs = [];

  async function pump() {
    if (busy) return;
    busy = true;
    try {
      while (pending.size && !stopped) {
        const batch = [...pending.entries()].slice(0, 4);
        batch.forEach(([p]) => pending.delete(p));
        await Promise.all(batch.map(async ([p, doc]) => {
          for (let attempt = 0; attempt < 3; attempt++) {
            try { if (doc) await db.doc(p).set(doc); else await db.doc(p).delete(); return; }
            catch (e) { if (e?.code === 'resource_exhausted' || e?.code === 'unavailable') await new Promise((r) => setTimeout(r, 600 + Math.random() * 900)); else { console.warn('sync', e); return; } }
          }
        }));
        onStatus({ state: 'live', queued: pending.size });
      }
    } finally { busy = false; }
  }
  const enqueue = (col, id, doc) => {
    if (!COLS.includes(col)) return;
    if (doc && JSON.stringify(doc).length > MAX_DOC) return;
    pending.set(`${base}/${col}/${id}`, doc ? JSON.parse(JSON.stringify(doc)) : null);
  };

  onStatus({ state: create ? 'uploading' : 'joining' });
  if (create) {
    await db.doc(`${base}/meta/info`).set({ createdAt: Date.now(), version: 2 });
    const dump = world.store.dump();
    for (const col of COLS) for (const d of dump[col] || []) enqueue(col, d.id, d);
    await pump();
  } else {
    const info = await db.doc(`${base}/meta/info`).get();
    if (!info.exists) throw Object.assign(new Error('Diesen Code gibt es nicht. Bitte am ersten Gerät „Live-Sync starten“ wählen.'), { code: 'not_found' });
    const all = {};
    for (const col of COLS) { const snap = await db.collection(`${base}/${col}`).limit(1000).get(); all[col] = snap.docs.map((d) => d.data()); }
    world.replaceAll(all);
  }

  world.sync = { push(batch) { for (const { col, id, doc } of batch) enqueue(col, id, doc); pump(); }, code };
  for (const col of COLS) {
    subs.push(db.collection(`${base}/${col}`).onSnapshot((snap) => {
      const incoming = [];
      for (const ch of snap.docChanges()) {
        if (ch.doc.metadata?.hasPendingWrites) continue;
        incoming.push({ col, id: ch.doc.id, doc: ch.type === 'removed' ? null : ch.doc.data() });
      }
      if (incoming.length) world.applyRemote(incoming.map((x) => ({ ...x, doc: x.doc ? JSON.parse(JSON.stringify(x.doc)) : null })));
    }, (e) => onStatus({ state: 'error', error: e })));
  }
  onStatus({ state: 'live', queued: pending.size });
  return { code, stop() { stopped = true; subs.forEach((u) => u()); world.sync = null; } };
}
