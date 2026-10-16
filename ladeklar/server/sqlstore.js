// SQLite-backed store for the engine (node:sqlite, synchronous). One table holds every
// collection as JSON; expression indexes keep the lookups the engine makes fast
// (tenantId, userId, email, code, role, driverId).
import { DatabaseSync } from 'node:sqlite';

const INDEXED = ['tenantId', 'userId', 'email', 'code', 'role', 'driverId'];

export function createSqlStore(file) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS docs (col TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (col, id)) WITHOUT ROWID;
    ${INDEXED.map((k) => `CREATE INDEX IF NOT EXISTS docs_${k} ON docs (col, json_extract(data, '$.${k}'));`).join('\n')}
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL, agent TEXT);
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);
    CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS push_user ON push_subs (user_id);
    CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
  `);

  const q = {
    get: db.prepare('SELECT data FROM docs WHERE col = ? AND id = ?'),
    put: db.prepare('INSERT INTO docs (col, id, data) VALUES (?, ?, ?) ON CONFLICT (col, id) DO UPDATE SET data = excluded.data'),
    del: db.prepare('DELETE FROM docs WHERE col = ? AND id = ?'),
    all: db.prepare('SELECT data FROM docs WHERE col = ?'),
  };
  const findStmts = new Map();
  const findStmt = (key) => {
    if (!findStmts.has(key)) findStmts.set(key, db.prepare(`SELECT data FROM docs WHERE col = ? AND json_extract(data, '$.${key}') = ?`));
    return findStmts.get(key);
  };
  const sqlVal = (v) => (v === true ? 1 : v === false ? 0 : v);

  let depth = 0;
  const store = {
    get(col, id) { const r = q.get.get(col, id); return r ? JSON.parse(r.data) : null; },
    find(col, where = {}) {
      const keys = Object.keys(where);
      const lead = keys.find((k) => INDEXED.includes(k) && where[k] != null);
      const rows = lead ? findStmt(lead).all(col, sqlVal(where[lead])) : q.all.all(col);
      const out = [];
      for (const r of rows) {
        const d = JSON.parse(r.data);
        let ok = true;
        for (const k of keys) if (d[k] !== where[k] && !(where[k] == null && d[k] == null)) { ok = false; break; }
        if (ok) out.push(d);
      }
      return out;
    },
    put(col, doc) { q.put.run(col, doc.id, JSON.stringify(doc)); },
    del(col, id) { q.del.run(col, id); },
    tx(fn) {
      if (depth) return fn();
      depth++;
      db.exec('BEGIN IMMEDIATE');
      try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } finally { depth--; }
    },
    count(col) { return db.prepare('SELECT COUNT(*) n FROM docs WHERE col = ?').get(col).n; },
  };

  // ---------- sessions ----------
  const sess = {
    create: db.prepare('INSERT INTO sessions (token_hash, user_id, created, expires, agent) VALUES (?, ?, ?, ?, ?)'),
    get: db.prepare('SELECT * FROM sessions WHERE token_hash = ?'),
    touch: db.prepare('UPDATE sessions SET expires = ? WHERE token_hash = ?'),
    del: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    delUser: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
    purge: db.prepare('DELETE FROM sessions WHERE expires < ?'),
  };
  const push = {
    upsert: db.prepare('INSERT INTO push_subs (endpoint, user_id, p256dh, auth, created) VALUES (?, ?, ?, ?, ?) ON CONFLICT (endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth'),
    forUser: db.prepare('SELECT * FROM push_subs WHERE user_id = ?'),
    del: db.prepare('DELETE FROM push_subs WHERE endpoint = ?'),
    delUser: db.prepare('DELETE FROM push_subs WHERE user_id = ?'),
  };
  const kv = {
    get: (k) => { const r = db.prepare('SELECT v FROM kv WHERE k = ?').get(k); return r ? JSON.parse(r.v) : null; },
    set: (k, v) => db.prepare('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v').run(k, JSON.stringify(v)),
  };

  return { store, sessions: sess, push, kv, db, close: () => db.close() };
}
