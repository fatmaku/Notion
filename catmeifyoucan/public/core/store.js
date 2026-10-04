// Cat Me If You Can – Datenspeicher (im Speicher, synchron) mit Sekundärindizes.
//
// Dieselbe Klasse läuft im Browser (Demo-Modus, Persistenz in localStorage) und auf dem Server
// (Persistenz als JSONL-Journal, server/journal.js). Wer später Postgres/PostGIS will, ersetzt
// diese Schnittstelle: get / insert / update / remove / where / all / count.
//
// Jede Änderung ruft onChange({op, col, doc}) – darauf hängt die Persistenz.

export const COLLECTIONS = {
  players: ['tokenHash'],
  cats: [],
  observations: ['playerId', 'catId', 'dayKey'],
  vouchers: ['code', 'playerId'],
  places: ['type'],
  events: ['catId', 'by'],
  xp: ['playerId', 'dayKey'],
  disputes: ['observationId'],
  meta: [],
};

class Collection {
  constructor(name, indexFields, emit) {
    this.name = name;
    this.docs = new Map();
    this.indexFields = indexFields;
    this.indexes = Object.fromEntries(indexFields.map((f) => [f, new Map()]));
    this.emit = emit;
  }

  _index(doc) {
    for (const f of this.indexFields) {
      const v = doc[f];
      if (v == null) continue;
      let set = this.indexes[f].get(v);
      if (!set) this.indexes[f].set(v, (set = new Set()));
      set.add(doc.id);
    }
  }

  _unindex(doc) {
    for (const f of this.indexFields) {
      const v = doc[f];
      if (v == null) continue;
      const set = this.indexes[f].get(v);
      if (set) {
        set.delete(doc.id);
        if (!set.size) this.indexes[f].delete(v);
      }
    }
  }

  get(id) {
    return id == null ? null : this.docs.get(id) || null;
  }

  insert(doc, { silent = false } = {}) {
    if (!doc || typeof doc.id !== 'string' || !doc.id) throw new Error(`${this.name}: id fehlt`);
    if (this.docs.has(doc.id)) throw new Error(`${this.name}: id ${doc.id} existiert schon`);
    this.docs.set(doc.id, doc);
    this._index(doc);
    if (!silent) this.emit({ op: 'insert', col: this.name, doc });
    return doc;
  }

  /** Flaches Merge-Update. patch-Werte `undefined` werden ignoriert. */
  update(id, patch, { silent = false } = {}) {
    const doc = this.docs.get(id);
    if (!doc) return null;
    this._unindex(doc);
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) doc[k] = v;
    this._index(doc);
    if (!silent) this.emit({ op: 'update', col: this.name, doc });
    return doc;
  }

  /** Ganzes Dokument ersetzen (z. B. beim Laden eines Journals). */
  put(doc) {
    const old = this.docs.get(doc.id);
    if (old) this._unindex(old);
    this.docs.set(doc.id, doc);
    this._index(doc);
    return doc;
  }

  remove(id, { silent = false } = {}) {
    const doc = this.docs.get(id);
    if (!doc) return false;
    this._unindex(doc);
    this.docs.delete(id);
    if (!silent) this.emit({ op: 'remove', col: this.name, doc: { id } });
    return true;
  }

  where(field, value) {
    const idx = this.indexes[field];
    if (idx) {
      const set = idx.get(value);
      return set ? [...set].map((id) => this.docs.get(id)) : [];
    }
    return this.all().filter((d) => d[field] === value);
  }

  all() {
    return [...this.docs.values()];
  }

  count() {
    return this.docs.size;
  }
}

export class MemoryStore {
  constructor({ onChange = () => {} } = {}) {
    this.onChange = onChange;
    const emit = (e) => this.onChange(e);
    for (const [name, fields] of Object.entries(COLLECTIONS)) this[name] = new Collection(name, fields, emit);
  }

  /** Snapshot als einfaches Objekt {col: [docs]}. */
  snapshot() {
    const out = {};
    for (const name of Object.keys(COLLECTIONS)) out[name] = this[name].all();
    return out;
  }

  load(snapshot) {
    for (const name of Object.keys(COLLECTIONS)) {
      const docs = snapshot && Array.isArray(snapshot[name]) ? snapshot[name] : [];
      for (const d of docs) if (d && typeof d.id === 'string') this[name].put(d);
    }
  }

  /** Journal-Eintrag anwenden (ohne erneutes onChange). */
  apply(entry) {
    const col = this[entry.col];
    if (!col || !(col instanceof Collection) || !entry.doc || typeof entry.doc.id !== 'string') return;
    if (entry.op === 'remove') col.remove(entry.doc.id, { silent: true });
    else col.put(entry.doc);
  }
}
