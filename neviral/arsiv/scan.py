"""Klasör tarayıcı: iCloud Drive, harici disk, indirilmiş orijinaller vb. Yalnızca meta veri okur; dosya kopyalamaz."""
import datetime as dt
import hashlib
import traceback
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import config, db, media, score


def _uuid_for(path):
    return "f:" + hashlib.sha1(str(path).encode("utf-8")).hexdigest()[:24]


def analyze_file(path, st, root, source, make_thumb=True):
    """Tek dosyayı inceler; veritabanı sözlüğü döndürür."""
    p = Path(path)
    ext = p.suffix.lower()
    kind = "video" if ext in config.VIDEO_EXT else "foto"
    uuid = _uuid_for(p)
    item = {
        "uuid": uuid, "source": source, "path": str(p), "filename": p.name, "kind": kind,
        "size": st.st_size, "mtime": st.st_mtime, "available": 1, "indexed_at": db.now(),
        "has_audio": 0, "duration": 0.0,
    }
    created = None
    if kind == "foto":
        info = media.image_info(p)
        item["width"], item["height"] = info["width"], info["height"]
        created = info.get("created")
    else:
        info = media.probe(p)
        item["width"], item["height"] = info["width"], info["height"]
        item["duration"] = round(float(info["duration"] or 0), 2)
        item["has_audio"] = 1 if info["has_audio"] else 0
        created = info.get("created")
    created = created or dt.datetime.fromtimestamp(st.st_mtime)
    item.update(created_at=created.replace(microsecond=0).isoformat(), year=created.year, month=created.month,
                day=created.day, hour=created.hour, weekday=created.weekday())
    item["aspect"], item["orientation"] = media.classify_aspect(item["width"], item["height"])
    # Klasör adları albüm gibi davranır ("2019/Instagram/…" → ["2019", "Instagram"])
    try:
        rel = p.relative_to(root)
        item["albums"] = [x for x in rel.parts[:-1] if x and not x.startswith(".")]
    except ValueError:
        item["albums"] = []
    item["qhash"] = media.quick_hash(p, st.st_size)
    if make_thumb:
        thumb = config.THUMBS / f"{uuid}.jpg"
        try:
            if not thumb.exists():
                media.thumbnail(p, thumb, kind, duration=item["duration"])
            item["thumb"] = str(thumb)
            item["dhash"] = media.dhash_file(thumb)
        except Exception as e:  # küçük resim üretilemedi; öğe yine de kaydedilir
            item["notes"] = f"küçük resim yok: {e}"[:300]
    item["social_score"], item["score_reasons"] = score.compute(item)
    return item


def dataless_item(path, st, root, source):
    """iCloud'da duran (indirilmemiş) dosya: okumadan, yalnızca dosya sistemi bilgisiyle kaydet."""
    p = Path(path)
    kind = "video" if p.suffix.lower() in config.VIDEO_EXT else "foto"
    created = dt.datetime.fromtimestamp(st.st_mtime)
    try:
        albums = [x for x in p.relative_to(root).parts[:-1] if x and not x.startswith(".")]
    except ValueError:
        albums = []
    item = {"uuid": _uuid_for(p), "source": source, "path": str(p), "filename": p.name, "kind": kind, "size": st.st_size,
            "mtime": st.st_mtime, "available": 0, "indexed_at": db.now(), "albums": albums,
            "created_at": created.replace(microsecond=0).isoformat(), "year": created.year, "month": created.month,
            "day": created.day, "hour": created.hour, "weekday": created.weekday(), "aspect": "bilinmiyor",
            "orientation": "bilinmiyor", "notes": "iCloud'da (indirilmemiş)"}
    item["social_score"], item["score_reasons"] = score.compute(item)
    return item


def scan_folder(con, root, source="klasor", workers=4, progress=print, make_thumb=True, force=False):
    """Klasörü (alt klasörleriyle) tarar. Değişmemiş dosyaları atlar. Özet sözlük döndürür."""
    root = Path(root).expanduser().resolve()
    if not root.exists():
        raise FileNotFoundError(f"Klasör yok: {root}")
    config.ensure_dirs()
    started = db.now()
    files = []
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in config.MEDIA_EXT and not p.name.startswith("."):
            files.append(p)
    progress(f"{len(files)} medya dosyası bulundu: {root}")
    existing = {r["path"]: (r["size"], r["mtime"]) for r in con.execute("SELECT path, size, mtime FROM items WHERE source=?", (source,))}
    todo, skipped, cloud = [], 0, []
    for p in files:
        st = p.stat()
        ex = existing.get(str(p))
        if not force and ex and ex[0] == st.st_size and abs((ex[1] or 0) - st.st_mtime) < 1:
            skipped += 1
            continue
        if media.is_dataless(st):
            cloud.append((p, st))
            continue
        todo.append((p, st))
    for p, st in cloud:
        db.upsert_item(con, dataless_item(p, st, root, source))
    if cloud:
        con.commit()
        progress(f"{len(cloud)} dosya yalnızca iCloud'da (indirilmedi, okunmadı); Finder'da 'Şimdi İndir' ile indirip yeniden tarayın.")
    added = updated = errors = 0

    def work(args):
        p, st = args
        try:
            return analyze_file(p, st, root, source, make_thumb)
        except Exception as e:
            progress(f"  ! {p.name}: {e}")
            return None

    with ThreadPoolExecutor(max_workers=max(1, workers)) as ex:
        for i, item in enumerate(ex.map(work, todo), 1):
            if item is None:
                errors += 1
            else:
                _, created = db.upsert_item(con, item)
                added += created
                updated += (not created)
            con.commit()  # kısa işlem: arayüz yazmaları beklemesin
            if i % 50 == 0 or i == len(todo):
                progress(f"  {i}/{len(todo)} işlendi (yeni {added}, güncellenen {updated}, hata {errors})")
    # kaybolan dosyalar
    present = {str(p) for p in files}
    missing = 0
    for r in con.execute("SELECT id, path FROM items WHERE source=? AND available=1", (source,)).fetchall():
        if r["path"] and r["path"].startswith(str(root)) and r["path"] not in present:
            con.execute("UPDATE items SET available=0 WHERE id=?", (r["id"],))
            missing += 1
    con.execute("INSERT INTO scans(root,source,started_at,finished_at,added,updated,skipped,errors) VALUES(?,?,?,?,?,?,?,?)",
                (str(root), source, started, db.now(), added, updated, skipped, errors))
    con.commit()
    summary = {"klasor": str(root), "bulunan": len(files), "yeni": added, "guncellenen": updated,
               "atlanan": skipped, "hata": errors, "kaybolan": missing}
    try:
        con.execute("PRAGMA optimize")  # sorgu planlayıcısı için istatistikler
    except Exception:
        pass
    progress(f"Bitti: {summary}")
    return summary
