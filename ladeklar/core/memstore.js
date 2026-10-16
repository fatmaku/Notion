// In-memory store for the engine (browser demo and tests). Synchronous, with a write journal
// so that a failed call() rolls back every put/del it made. `onWrite` lets a transport mirror
// committed writes (localStorage, the artifact db, BroadcastChannel).

export function createMemStore({ data = {}, onWrite = () => {} } = {}) {
  const cols = new Map();
  const col = (name) => { if (!cols.has(name)) cols.set(name, new Map()); return cols.get(name); };
  for (const [name, docs] of Object.entries(data)) for (const d of docs) col(name).set(d.id, d);

  let journal = null; // Map key -> previous value (undefined = absent)
  let writes = null; // list of {col, id} written in this transaction
  const remember = (c, id) => {
    if (!journal) return;
    const key = c + '\u0000' + id;
    if (!journal.has(key)) journal.set(key, col(c).get(id));
    writes.push({ col: c, id });
  };
  const matches = (doc, where) => {
    for (const k in where) if (doc[k] !== where[k]) return false;
    return true;
  };

  const store = {
    get(c, id) { return col(c).get(id) || null; },
    find(c, where = {}) { const out = []; for (const d of col(c).values()) if (matches(d, where)) out.push(d); return out; },
    put(c, doc) {
      if (!doc || !doc.id) throw new Error('put needs a doc with id');
      remember(c, doc.id);
      col(c).set(doc.id, doc);
      if (!journal) onWrite([{ col: c, id: doc.id, doc }]);
    },
    del(c, id) {
      remember(c, id);
      col(c).delete(id);
      if (!journal) onWrite([{ col: c, id, doc: null }]);
    },
    tx(fn) {
      if (journal) return fn(); // nested: part of the outer transaction
      journal = new Map(); writes = [];
      try {
        const r = fn();
        const done = writes; journal = null; writes = null;
        const seen = new Set(), batch = [];
        for (let i = done.length - 1; i >= 0; i--) {
          const k = done[i].col + '\u0000' + done[i].id;
          if (seen.has(k)) continue;
          seen.add(k);
          batch.unshift({ col: done[i].col, id: done[i].id, doc: col(done[i].col).get(done[i].id) || null });
        }
        if (batch.length) onWrite(batch);
        return r;
      } catch (e) {
        for (const [key, prev] of journal) {
          const [c, id] = key.split('\u0000');
          if (prev === undefined) col(c).delete(id); else col(c).set(id, prev);
        }
        journal = null; writes = null;
        throw e;
      }
    },
    /** Apply a document coming from another device/tab without echoing it back. */
    applyRemote(c, id, doc) { if (doc) col(c).set(id, doc); else col(c).delete(id); },
    dump() { const o = {}; for (const [name, m] of cols) o[name] = [...m.values()]; return o; },
    clear() { cols.clear(); },
  };
  return store;
}
