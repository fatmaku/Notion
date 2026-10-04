// Cat Me If You Can – Persistenz: MemoryStore + JSONL-Journal.
//
// Jede Änderung wird als eine Zeile {op, col, doc} an data/journal.jsonl angehängt (schnell,
// absturzsicher: eine halbe letzte Zeile wird beim Laden ignoriert). Beim Start und danach
// stündlich wird das Journal zu einem Snapshot verdichtet (data/snapshot.json, atomar per rename).
//
// Für einen Bezirk mit einigen tausend Katzen reicht das locker. Größer → Store-Schnittstelle
// (public/core/store.js) gegen Postgres/PostGIS tauschen.

import fs from 'node:fs';
import path from 'node:path';
import { MemoryStore } from '../public/core/store.js';

export function openJournalStore(dataDir, { log = () => {}, compactEveryMs = 3600000 } = {}) {
  fs.mkdirSync(dataDir, { recursive: true });
  const snapPath = path.join(dataDir, 'snapshot.json');
  const journalPath = path.join(dataDir, 'journal.jsonl');
  const store = new MemoryStore();

  if (fs.existsSync(snapPath)) {
    try {
      store.load(JSON.parse(fs.readFileSync(snapPath, 'utf8')));
    } catch (e) {
      throw new Error(`snapshot.json ist beschädigt (${e.message}) – bitte aus Backup wiederherstellen`);
    }
  }
  let replayed = 0;
  let broken = 0;
  if (fs.existsSync(journalPath)) {
    const lines = fs.readFileSync(journalPath, 'utf8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        store.apply(JSON.parse(line));
        replayed++;
      } catch {
        broken++;
      }
    }
  }
  if (broken) log(`journal: ${broken} unvollständige Zeile(n) übersprungen`);

  let fd = null;
  let dirty = false;
  function compact() {
    const tmp = `${snapPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store.snapshot()));
    fs.renameSync(tmp, snapPath);
    if (fd !== null) fs.closeSync(fd);
    fs.writeFileSync(journalPath, '');
    fd = fs.openSync(journalPath, 'a');
    dirty = false;
  }
  compact();
  if (replayed) log(`journal: ${replayed} Änderung(en) eingespielt und verdichtet`);

  store.onChange = (entry) => {
    fs.writeSync(fd, JSON.stringify(entry) + '\n');
    dirty = true;
  };

  const timer = setInterval(() => {
    if (!dirty) return;
    try {
      compact();
    } catch (e) {
      log('journal: Verdichten fehlgeschlagen:', e.message);
    }
  }, compactEveryMs);
  timer.unref();

  return {
    store,
    compact,
    close() {
      clearInterval(timer);
      if (dirty) compact();
      if (fd !== null) {
        fs.closeSync(fd);
        fd = null;
      }
    },
  };
}
