"""SQLite veri katmanı: öğeler (foto/video), paylaşımlar, hatırlatıcılar, üretimler."""
import datetime as dt
import json
import sqlite3
from pathlib import Path

from . import config

SCHEMA = [
    """CREATE TABLE IF NOT EXISTS items(
        id INTEGER PRIMARY KEY,
        uuid TEXT UNIQUE NOT NULL,
        source TEXT NOT NULL,
        path TEXT, path_original TEXT, thumb TEXT,
        filename TEXT,
        kind TEXT NOT NULL,
        created_at TEXT,
        year INTEGER, month INTEGER, day INTEGER, hour INTEGER, weekday INTEGER,
        width INTEGER DEFAULT 0, height INTEGER DEFAULT 0, duration REAL DEFAULT 0, size INTEGER DEFAULT 0,
        has_audio INTEGER DEFAULT 0,
        aspect TEXT, orientation TEXT,
        favorite INTEGER DEFAULT 0, edited INTEGER DEFAULT 0, hidden INTEGER DEFAULT 0, shared INTEGER DEFAULT 0,
        albums TEXT DEFAULT '[]', keywords TEXT DEFAULT '[]', persons TEXT DEFAULT '[]', labels TEXT DEFAULT '[]',
        title TEXT, description TEXT, place TEXT, lat REAL, lon REAL,
        dhash TEXT, qhash TEXT, apple_score REAL,
        social_score REAL DEFAULT 0, score_reasons TEXT DEFAULT '[]',
        available INTEGER DEFAULT 1, mtime REAL, indexed_at TEXT,
        posted_at TEXT, post_id INTEGER,
        notes TEXT
    )""",
    "CREATE INDEX IF NOT EXISTS ix_items_created ON items(created_at)",
    "CREATE INDEX IF NOT EXISTS ix_items_score ON items(social_score)",
    "CREATE INDEX IF NOT EXISTS ix_items_kind ON items(kind)",
    "CREATE INDEX IF NOT EXISTS ix_items_qhash ON items(qhash)",
    "CREATE INDEX IF NOT EXISTS ix_items_path ON items(path)",
    "CREATE INDEX IF NOT EXISTS ix_items_md ON items(month, day)",
    "CREATE INDEX IF NOT EXISTS ix_items_year ON items(year)",
    "CREATE INDEX IF NOT EXISTS ix_items_kind_created ON items(kind, created_at)",
    "CREATE INDEX IF NOT EXISTS ix_items_cand ON items(social_score) WHERE hidden=0 AND posted_at IS NULL",
    "CREATE INDEX IF NOT EXISTS ix_items_posted ON items(posted_at)",
    """CREATE TABLE IF NOT EXISTS posts(
        id INTEGER PRIMARY KEY,
        platform TEXT DEFAULT 'instagram', kind TEXT, posted_at TEXT,
        caption TEXT, media_path TEXT, media_dhash TEXT, duration REAL, width INTEGER, height INTEGER,
        item_id INTEGER, matched_by TEXT, confidence REAL,
        reach INTEGER, likes INTEGER, comments INTEGER, saves INTEGER, shares INTEGER, url TEXT,
        UNIQUE(platform, posted_at, media_path)
    )""",
    "CREATE INDEX IF NOT EXISTS ix_posts_item ON posts(item_id)",
    """CREATE TABLE IF NOT EXISTS reminders(
        id INTEGER PRIMARY KEY, due TEXT NOT NULL, title TEXT NOT NULL, note TEXT,
        item_ids TEXT DEFAULT '[]', post_id INTEGER, render_id INTEGER,
        status TEXT DEFAULT 'acik', created_at TEXT
    )""",
    """CREATE TABLE IF NOT EXISTS renders(
        id INTEGER PRIMARY KEY, created_at TEXT, template TEXT, brief TEXT, output TEXT, cover TEXT, caption TEXT,
        item_ids TEXT DEFAULT '[]', status TEXT DEFAULT 'bekliyor', error TEXT, duration REAL
    )""",
    "CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT)",
    """CREATE TABLE IF NOT EXISTS scans(
        id INTEGER PRIMARY KEY, root TEXT, source TEXT, started_at TEXT, finished_at TEXT,
        added INTEGER DEFAULT 0, updated INTEGER DEFAULT 0, skipped INTEGER DEFAULT 0, errors INTEGER DEFAULT 0
    )""",
]

ITEM_COLS = {
    "uuid", "source", "path", "path_original", "thumb", "filename", "kind", "created_at", "year", "month", "day",
    "hour", "weekday", "width", "height", "duration", "size", "has_audio", "aspect", "orientation", "favorite",
    "edited", "hidden", "shared", "albums", "keywords", "persons", "labels", "title", "description", "place",
    "lat", "lon", "dhash", "qhash", "apple_score", "social_score", "score_reasons", "available", "mtime",
    "indexed_at", "posted_at", "post_id", "notes",
}
LIST_COLS = {"albums", "keywords", "persons", "labels", "score_reasons"}
HAS_FTS = None


def now():
    return dt.datetime.now().replace(microsecond=0).isoformat()


_READY = set()
_FTS_DDL = "CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(text, tokenize='unicode61 remove_diacritics 2')"


def connect(path=None):
    """Veritabanını açar. Şema yalnızca süreç başına bir kez hazırlanır (her istekte değil)."""
    global HAS_FTS
    p = Path(path or config.DB_PATH)
    p.parent.mkdir(parents=True, exist_ok=True)
    key = str(p.resolve())
    if not p.exists():  # dosya silinmiş/yeni: şema yeniden kurulmalı
        _READY.discard(key)
    con = sqlite3.connect(str(p), check_same_thread=False, timeout=30)
    con.row_factory = sqlite3.Row
    if key in _READY:
        return con
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    for stmt in SCHEMA:
        con.execute(stmt)
    try:
        cols = [r[1] for r in con.execute("PRAGMA table_info(items_fts)")]
        if "uuid" in cols:  # eski şema: dizinsiz uuid sütunu her güncellemede tüm tabloyu tarıyordu
            con.execute("DROP TABLE items_fts")
            cols = []
        con.execute(_FTS_DDL)
        HAS_FTS = True
        if not cols:
            rebuild_fts(con)
    except sqlite3.OperationalError:
        HAS_FTS = False
    con.commit()
    _READY.add(key)
    return con


def rebuild_fts(con):
    con.execute("DELETE FROM items_fts")
    batch = []
    for r in con.execute("SELECT * FROM items"):
        batch.append((r["id"], fts_text(dict(r))))
        if len(batch) >= 5000:
            con.executemany("INSERT INTO items_fts(rowid, text) VALUES(?,?)", batch)
            batch = []
    if batch:
        con.executemany("INSERT INTO items_fts(rowid, text) VALUES(?,?)", batch)


def _fts_put(con, item_id, full):
    con.execute("DELETE FROM items_fts WHERE rowid=?", (item_id,))
    con.execute("INSERT INTO items_fts(rowid, text) VALUES(?,?)", (item_id, fts_text(full)))


# ---------------------------------------------------------------- yardımcılar
def _ser(d):
    out = {}
    for k, v in d.items():
        if k not in ITEM_COLS:
            continue
        if k in LIST_COLS and not isinstance(v, str):
            v = json.dumps(list(v or []), ensure_ascii=False)
        out[k] = v
    return out


def row_to_item(r):
    if r is None:
        return None
    d = dict(r)
    for k in LIST_COLS:
        if k in d:
            try:
                d[k] = json.loads(d[k] or "[]")
            except (TypeError, ValueError):
                d[k] = []
    return d


def fts_text(d):
    parts = [d.get("filename") or "", d.get("title") or "", d.get("description") or "", d.get("place") or "",
             str(d.get("year") or "")]
    for k in ("albums", "keywords", "persons", "labels"):
        v = d.get(k) or []
        if isinstance(v, str):
            try:
                v = json.loads(v)
            except ValueError:
                v = [v]
        parts.extend(str(x) for x in v)
    return tr_fold(" ".join(p for p in parts if p))


def tr_fold(s):
    """Türkçe İ/ı/I → i (FTS5 unicode61 noktasız ı'yı katlamaz)."""
    return str(s).replace("İ", "i").replace("ı", "i").replace("I", "i")


def fts_query(q):
    words = [tr_fold(w).replace('"', "").replace("*", "") for w in str(q).split()]
    words = [w for w in words if w]
    return " ".join(f'"{w}"*' for w in words) if words else '""'


# ---------------------------------------------------------------- öğeler
def upsert_item(con, d):
    """uuid'ye göre ekler/günceller. (id, yeni_mi) döndürür."""
    d = _ser(d)
    row = con.execute("SELECT id FROM items WHERE uuid=?", (d["uuid"],)).fetchone()
    if row:
        cols = [k for k in d if k != "uuid"]
        con.execute(f"UPDATE items SET {', '.join(k + '=?' for k in cols)} WHERE uuid=?",
                    [d[k] for k in cols] + [d["uuid"]])
        item_id, created = row["id"], False
    else:
        cols = list(d)
        cur = con.execute(f"INSERT INTO items({', '.join(cols)}) VALUES({', '.join('?' * len(cols))})",
                          [d[k] for k in cols])
        item_id, created = cur.lastrowid, True
    if HAS_FTS:
        _fts_put(con, item_id, dict(con.execute("SELECT * FROM items WHERE id=?", (item_id,)).fetchone()))
    return item_id, created


def get_item(con, item_id):
    return row_to_item(con.execute("SELECT * FROM items WHERE id=?", (item_id,)).fetchone())


def get_items(con, ids):
    if not ids:
        return []
    rows = con.execute(f"SELECT * FROM items WHERE id IN ({','.join('?' * len(ids))})", list(ids)).fetchall()
    by_id = {r["id"]: row_to_item(r) for r in rows}
    return [by_id[i] for i in ids if i in by_id]


def set_item(con, item_id, **fields):
    fields = _ser(fields)
    if not fields:
        return
    con.execute(f"UPDATE items SET {', '.join(k + '=?' for k in fields)} WHERE id=?", [*fields.values(), item_id])
    if HAS_FTS and (set(fields) & {"albums", "keywords", "persons", "labels", "title", "description", "place"}):
        _fts_put(con, item_id, dict(con.execute("SELECT * FROM items WHERE id=?", (item_id,)).fetchone()))
    con.commit()


SORTS = {
    "score": "social_score DESC, created_at DESC",
    "date": "created_at DESC",
    "date_asc": "created_at ASC",
    "duration": "duration DESC",
    "size": "size DESC",
    "random": "RANDOM()",
}


def search(con, q=None, kind=None, aspect=None, orientation=None, year=None, year_from=None, year_to=None,
           month=None, day=None, min_dur=None, max_dur=None, favorite=None, edited=None, posted=None,
           min_score=None, available=None, source=None, album=None, person=None, ids=None, hidden=False,
           sort="score", limit=60, offset=0, with_total=True):
    """Filtreli arama. {'items': [...], 'total': n} döndürür (with_total=False ise total=None)."""
    where, args = [], []
    if not hidden:
        where.append("hidden=0")
    if q:
        if HAS_FTS:
            where.append("id IN (SELECT rowid FROM items_fts WHERE items_fts MATCH ?)")
            args.append(fts_query(q))
        else:
            like = f"%{q}%"
            where.append("(filename LIKE ? OR albums LIKE ? OR keywords LIKE ? OR persons LIKE ? OR labels LIKE ? OR title LIKE ? OR description LIKE ? OR place LIKE ?)")
            args += [like] * 8
    if kind:
        where.append("kind=?"); args.append(kind)
    if aspect:
        where.append("aspect=?"); args.append(aspect)
    if orientation:
        where.append("orientation=?"); args.append(orientation)
    if year:
        where.append("year=?"); args.append(int(year))
    if year_from:
        where.append("year>=?"); args.append(int(year_from))
    if year_to:
        where.append("year<=?"); args.append(int(year_to))
    if month:
        where.append("month=?"); args.append(int(month))
    if day:
        where.append("day=?"); args.append(int(day))
    if min_dur is not None:
        where.append("duration>=?"); args.append(float(min_dur))
    if max_dur is not None:
        where.append("duration<=?"); args.append(float(max_dur))
    if favorite is not None:
        where.append("favorite=?"); args.append(1 if favorite else 0)
    if edited is not None:
        where.append("edited=?"); args.append(1 if edited else 0)
    if posted is True:
        where.append("posted_at IS NOT NULL")
    elif posted is False:
        where.append("posted_at IS NULL")
    if min_score is not None:
        where.append("social_score>=?"); args.append(float(min_score))
    if available is not None:
        where.append("available=?"); args.append(1 if available else 0)
    if source:
        where.append("source=?"); args.append(source)
    if album:
        where.append("albums LIKE ?"); args.append(f'%"{album}%')
    if person:
        where.append("persons LIKE ?"); args.append(f"%{person}%")
    if ids:
        where.append(f"id IN ({','.join('?' * len(ids))})"); args += list(ids)
    sql_where = ("WHERE " + " AND ".join(where)) if where else ""
    total = con.execute(f"SELECT COUNT(*) FROM items {sql_where}", args).fetchone()[0] if with_total else None
    order = SORTS.get(sort, SORTS["score"])
    rows = con.execute(f"SELECT * FROM items {sql_where} ORDER BY {order} LIMIT ? OFFSET ?",
                       args + [int(limit), int(offset)]).fetchall()
    return {"items": [row_to_item(r) for r in rows], "total": total}


def duplicates(con, limit=200):
    rows = con.execute("""SELECT qhash, COUNT(*) n FROM items WHERE qhash IS NOT NULL AND qhash<>''
                          GROUP BY qhash HAVING n>1 ORDER BY n DESC LIMIT ?""", (limit,)).fetchall()
    groups = []
    for r in rows:
        items = [row_to_item(x) for x in con.execute("SELECT * FROM items WHERE qhash=?", (r["qhash"],))]
        groups.append(items)
    return groups


def stats(con):
    r = con.execute("""SELECT SUM(hidden=0), SUM(kind='foto' AND hidden=0), SUM(kind='video' AND hidden=0),
                              COALESCE(SUM(CASE WHEN kind='video' THEN duration END),0), COALESCE(SUM(size),0),
                              SUM(posted_at IS NOT NULL), SUM(social_score>=55 AND posted_at IS NULL AND hidden=0),
                              SUM(favorite=1), SUM(available=0) FROM items""").fetchone()
    r = [x or 0 for x in r]
    s = {"toplam": r[0], "foto": r[1], "video": r[2], "video_saat": round(r[3] / 3600, 1), "boyut_gb": round(r[4] / 1e9, 1),
         "paylasilan": r[5], "aday": r[6], "favori": r[7], "yerel_degil": r[8]}
    s["yillar"] = [dict(x) for x in con.execute("SELECT year, COUNT(*) n FROM items WHERE year IS NOT NULL GROUP BY year ORDER BY year")]
    s["kaynaklar"] = [dict(x) for x in con.execute("SELECT source, COUNT(*) n FROM items GROUP BY source")]
    s["paylasim"] = con.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
    s["hatirlatici_acik"] = con.execute("SELECT COUNT(*) FROM reminders WHERE status='acik'").fetchone()[0]
    s["uretim"] = con.execute("SELECT COUNT(*) FROM renders WHERE status='hazir'").fetchone()[0]
    s["albumler"] = top_values(con, "albums", 40)
    s["kisiler"] = top_values(con, "persons", 40)
    s["etiketler"] = top_values(con, "labels", 40)
    return s


def top_values(con, col, n=30):
    assert col in LIST_COLS
    try:
        rows = con.execute(f"""SELECT j.value AS v, COUNT(*) AS n FROM items, json_each(items.{col}) j
                               WHERE items.{col} IS NOT NULL AND items.{col}<>'[]' GROUP BY j.value ORDER BY n DESC LIMIT ?""", (n,))
        return [(x["v"], x["n"]) for x in rows]
    except sqlite3.OperationalError:  # json1 yoksa
        counts = {}
        for (v,) in con.execute(f"SELECT {col} FROM items WHERE {col} IS NOT NULL AND {col}<>'[]'"):
            try:
                for x in json.loads(v):
                    counts[x] = counts.get(x, 0) + 1
            except ValueError:
                pass
        return sorted(counts.items(), key=lambda kv: -kv[1])[:n]


# ---------------------------------------------------------------- paylaşımlar
POST_COLS = {"platform", "kind", "posted_at", "caption", "media_path", "media_dhash", "duration", "width", "height",
             "item_id", "matched_by", "confidence", "reach", "likes", "comments", "saves", "shares", "url"}


def upsert_post(con, d):
    d = {k: v for k, v in d.items() if k in POST_COLS}
    d.setdefault("platform", "instagram")
    row = con.execute("SELECT id FROM posts WHERE platform=? AND posted_at IS ? AND media_path IS ?",
                      (d["platform"], d.get("posted_at"), d.get("media_path"))).fetchone()
    if row:
        cols = [k for k in d if k not in ("platform", "posted_at", "media_path")]
        if cols:
            con.execute(f"UPDATE posts SET {', '.join(k + '=?' for k in cols)} WHERE id=?", [d[k] for k in cols] + [row["id"]])
        return row["id"], False
    cols = list(d)
    cur = con.execute(f"INSERT INTO posts({', '.join(cols)}) VALUES({', '.join('?' * len(cols))})", [d[k] for k in cols])
    return cur.lastrowid, True


def link_post(con, post_id, item_id, matched_by, confidence):
    con.execute("UPDATE posts SET item_id=?, matched_by=?, confidence=? WHERE id=?", (item_id, matched_by, confidence, post_id))
    post = con.execute("SELECT posted_at FROM posts WHERE id=?", (post_id,)).fetchone()
    con.execute("UPDATE items SET posted_at=COALESCE(posted_at, ?), post_id=COALESCE(post_id, ?) WHERE id=?",
                (post["posted_at"], post_id, item_id))


def unlink_post(con, post_id):
    post = con.execute("SELECT item_id FROM posts WHERE id=?", (post_id,)).fetchone()
    if post and post["item_id"]:
        con.execute("UPDATE items SET posted_at=NULL, post_id=NULL WHERE id=? AND post_id=?", (post["item_id"], post_id))
    con.execute("UPDATE posts SET item_id=NULL, matched_by=NULL, confidence=NULL WHERE id=?", (post_id,))
    con.commit()


def posts(con, matched=None, limit=200, offset=0, kind=None):
    where, args = [], []
    if matched is True:
        where.append("item_id IS NOT NULL")
    elif matched is False:
        where.append("item_id IS NULL")
    if kind:
        where.append("kind=?"); args.append(kind)
    sql_where = ("WHERE " + " AND ".join(where)) if where else ""
    total = con.execute(f"SELECT COUNT(*) FROM posts {sql_where}", args).fetchone()[0]
    rows = con.execute(f"SELECT * FROM posts {sql_where} ORDER BY posted_at DESC LIMIT ? OFFSET ?", args + [limit, offset]).fetchall()
    return {"posts": [dict(r) for r in rows], "total": total}


# ---------------------------------------------------------------- hatırlatıcılar
def add_reminder(con, due, title, note=None, item_ids=None, post_id=None, render_id=None):
    cur = con.execute("INSERT INTO reminders(due,title,note,item_ids,post_id,render_id,status,created_at) VALUES(?,?,?,?,?,?,'acik',?)",
                      (due, title, note, json.dumps(list(item_ids or [])), post_id, render_id, now()))
    con.commit()
    return cur.lastrowid


def reminders(con, status="acik", until=None, limit=500):
    where, args = [], []
    if status and status != "hepsi":
        where.append("status=?"); args.append(status)
    if until:
        where.append("due<=?"); args.append(until)
    sql_where = ("WHERE " + " AND ".join(where)) if where else ""
    out = []
    for r in con.execute(f"SELECT * FROM reminders {sql_where} ORDER BY due ASC LIMIT ?", args + [limit]):
        d = dict(r)
        d["item_ids"] = json.loads(d.get("item_ids") or "[]")
        out.append(d)
    return out


def set_reminder(con, rid, **fields):
    allowed = {"due", "title", "note", "status", "item_ids", "post_id", "render_id"}
    fields = {k: (json.dumps(v) if k == "item_ids" else v) for k, v in fields.items() if k in allowed}
    if fields:
        con.execute(f"UPDATE reminders SET {', '.join(k + '=?' for k in fields)} WHERE id=?", [*fields.values(), rid])
        con.commit()


# ---------------------------------------------------------------- üretimler
def add_render(con, template, brief, item_ids):
    cur = con.execute("INSERT INTO renders(created_at,template,brief,item_ids,status) VALUES(?,?,?,?,'bekliyor')",
                      (now(), template, json.dumps(brief, ensure_ascii=False), json.dumps(list(item_ids))))
    con.commit()
    return cur.lastrowid


def set_render(con, rid, **fields):
    allowed = {"output", "cover", "caption", "status", "error", "duration", "brief"}
    fields = {k: v for k, v in fields.items() if k in allowed}
    if "brief" in fields and not isinstance(fields["brief"], str):
        fields["brief"] = json.dumps(fields["brief"], ensure_ascii=False)
    if fields:
        con.execute(f"UPDATE renders SET {', '.join(k + '=?' for k in fields)} WHERE id=?", [*fields.values(), rid])
        con.commit()


def renders(con, limit=100):
    out = []
    for r in con.execute("SELECT * FROM renders ORDER BY id DESC LIMIT ?", (limit,)):
        d = dict(r)
        d["item_ids"] = json.loads(d.get("item_ids") or "[]")
        try:
            d["brief"] = json.loads(d.get("brief") or "{}")
        except ValueError:
            d["brief"] = {}
        out.append(d)
    return out


def get_render(con, rid):
    r = con.execute("SELECT * FROM renders WHERE id=?", (rid,)).fetchone()
    if not r:
        return None
    d = dict(r)
    d["item_ids"] = json.loads(d.get("item_ids") or "[]")
    try:
        d["brief"] = json.loads(d.get("brief") or "{}")
    except ValueError:
        d["brief"] = {}
    return d


# ---------------------------------------------------------------- ayarlar
def get_setting(con, key, default=None):
    r = con.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return r["value"] if r else default


def set_setting(con, key, value):
    con.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, value))
    con.commit()
