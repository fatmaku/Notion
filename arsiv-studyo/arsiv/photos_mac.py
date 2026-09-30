"""macOS Fotoğraflar (iCloud Fotoğraflar) kütüphanesini içe aktarır.

Tercih: `pip install osxphotos` (tam meta veri: albümler, kişiler, etiketler, Apple estetik puanı).
Yedek: Photos.sqlite dosyasını doğrudan okur (temel alanlar).
Orijinal dosya Mac'te yoksa (iCloud'da "Mac Depolamasını Optimize Et"), öğe yine kaydedilir; küçük resim
Fotoğraflar'ın kendi türevlerinden alınır; üretim sırasında `ensure_local` osxphotos ile indirir.
"""
import datetime as dt
import glob
import os
import shutil
import sqlite3
import subprocess
import tempfile
from pathlib import Path

from . import config, db, media, score

APPLE_EPOCH = 978307200  # 2001-01-01


def default_library():
    env = os.environ.get("ARSIV_PHOTOS_LIBRARY")
    if env:
        return Path(env).expanduser()
    cands = sorted(Path.home().glob("Pictures/*.photoslibrary"))
    return cands[0] if cands else None


def _finish_item(item, thumb_src=None):
    created = item.pop("_created", None) or dt.datetime.now()
    item.update(created_at=created.replace(microsecond=0).isoformat(), year=created.year, month=created.month,
                day=created.day, hour=created.hour, weekday=created.weekday())
    item["aspect"], item["orientation"] = media.classify_aspect(item.get("width"), item.get("height"))
    thumb = config.THUMBS / f"{item['uuid']}.jpg"
    src = thumb_src or item.get("path")
    if src and Path(src).exists():
        try:
            if not thumb.exists():
                media.thumbnail(src, thumb, "foto" if thumb_src else item["kind"], duration=item.get("duration") or 0)
            item["thumb"] = str(thumb)
            item["dhash"] = media.dhash_file(thumb)
        except Exception as e:
            item["notes"] = f"küçük resim yok: {e}"[:300]
    if item.get("path") and Path(item["path"]).exists():
        try:
            item["qhash"] = media.quick_hash(item["path"])
            item["size"] = Path(item["path"]).stat().st_size
        except OSError:
            pass
    item["social_score"], item["score_reasons"] = score.compute(item)
    return item


# ---------------------------------------------------------------- osxphotos yolu
def _import_osxphotos(con, library, progress, limit=None):
    import osxphotos  # type: ignore
    pdb = osxphotos.PhotosDB(dbfile=str(library)) if library else osxphotos.PhotosDB()
    photos = pdb.photos(intrash=False)
    progress(f"{len(photos)} öğe bulundu (osxphotos)")
    added = updated = errors = 0
    for i, p in enumerate(photos[:limit] if limit else photos, 1):
        try:
            item = _item_from_osxphotos(p)
            _, created = db.upsert_item(con, item)
            added += created
            updated += (not created)
        except Exception as e:
            errors += 1
            progress(f"  ! {getattr(p, 'original_filename', '?')}: {e}")
        if i % 200 == 0:
            con.commit()
            progress(f"  {i}/{len(photos)} (yeni {added}, güncellenen {updated}, hata {errors})")
    con.commit()
    return {"bulunan": len(photos), "yeni": added, "guncellenen": updated, "hata": errors}


def _item_from_osxphotos(p):
    kind = "video" if p.ismovie else "foto"
    path_edited = getattr(p, "path_edited", None)
    path = p.path
    use_path = path_edited if (p.hasadjustments and path_edited and Path(path_edited).exists()) else path
    exif = getattr(p, "exif_info", None)
    duration = 0.0
    if kind == "video":
        duration = float(getattr(exif, "duration", 0) or 0) if exif else 0.0
    sc = getattr(p, "score", None)
    apple = float(sc.overall) if sc is not None and getattr(sc, "overall", None) is not None else None
    place = None
    try:
        if p.place and p.place.name:
            place = p.place.name
    except Exception:
        pass
    labels = []
    try:
        labels = list(p.labels or [])
    except Exception:
        pass
    item = {
        "uuid": "p:" + p.uuid, "source": "photos", "path": use_path, "path_original": path,
        "filename": p.original_filename or p.filename, "kind": kind, "_created": p.date.replace(tzinfo=None) if p.date else None,
        "width": p.width or 0, "height": p.height or 0, "duration": round(duration, 2),
        "favorite": 1 if p.favorite else 0, "edited": 1 if p.hasadjustments else 0, "hidden": 1 if p.hidden else 0,
        "shared": 1 if getattr(p, "shared", False) else 0,
        "albums": list(p.albums or []), "keywords": list(p.keywords or []), "persons": [x for x in (p.persons or []) if x and x != "_UNKNOWN_"],
        "labels": labels, "title": p.title, "description": p.description, "place": place,
        "lat": p.latitude, "lon": p.longitude, "apple_score": apple,
        "available": 1 if (use_path and Path(use_path).exists()) else 0, "indexed_at": db.now(),
        "has_audio": 1 if kind == "video" else 0,
    }
    thumb_src = None
    if not item["available"]:
        derivs = getattr(p, "path_derivatives", None) or []
        derivs = [d for d in derivs if d and Path(d).exists()]
        if derivs:
            thumb_src = min(derivs, key=lambda d: Path(d).stat().st_size)
    if not item["available"] and kind == "video" and not thumb_src:
        thumb_src = None
    return _finish_item(item, thumb_src=thumb_src)


# ---------------------------------------------------------------- doğrudan SQLite yolu
def _copy_db(library):
    src = Path(library) / "database" / "Photos.sqlite"
    if not src.exists():
        raise FileNotFoundError(f"Photos.sqlite bulunamadı: {src}  (Terminal'e 'Tam Disk Erişimi' verildi mi?)")
    tmp = Path(tempfile.mkdtemp(prefix="arsiv-photos-"))
    for suf in ("", "-wal", "-shm"):
        s = Path(str(src) + suf)
        if s.exists():
            shutil.copy2(s, tmp / s.name)
    return tmp / "Photos.sqlite"


def _import_sqlite(con, library, progress, limit=None):
    library = Path(library)
    dbcopy = _copy_db(library)
    pc = sqlite3.connect(f"file:{dbcopy}?mode=ro", uri=True)
    pc.row_factory = sqlite3.Row
    tables = {r[0] for r in pc.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    asset = "ZASSET" if "ZASSET" in tables else "ZGENERICASSET"
    cols = {r[1] for r in pc.execute(f"PRAGMA table_info({asset})")}
    attr_cols = {r[1] for r in pc.execute("PRAGMA table_info(ZADDITIONALASSETATTRIBUTES)")} if "ZADDITIONALASSETATTRIBUTES" in tables else set()

    def col(name, alias=None, table="a", have=cols):
        return f"{table}.{name} AS {alias or name}" if name in have else f"NULL AS {alias or name}"

    sql = f"""SELECT a.Z_PK, a.ZUUID, a.ZFILENAME, a.ZDIRECTORY, a.ZDATECREATED, {col('ZDURATION')}, a.ZWIDTH, a.ZHEIGHT,
                {col('ZFAVORITE')}, {col('ZKIND')}, {col('ZHIDDEN')}, {col('ZTRASHEDSTATE')}, {col('ZHASADJUSTMENTS')},
                {col('ZLATITUDE')}, {col('ZLONGITUDE')}, {col('ZORIGINALFILENAME', table='aa', have=attr_cols)}, {col('ZTITLE', table='aa', have=attr_cols)},
                {col('ZOVERALLAESTHETICSCORE')}
              FROM {asset} a LEFT JOIN ZADDITIONALASSETATTRIBUTES aa ON aa.ZASSET = a.Z_PK"""
    # albümler: Z_nnASSETS bağlantı tablosunu dinamik bul
    albums = {}
    join = None
    for t in tables:
        if t.startswith("Z_") and t.endswith("ASSETS"):
            jc = [r[1] for r in pc.execute(f"PRAGMA table_info({t})")]
            ac = [c for c in jc if c.endswith("ALBUMS")]
            sc = [c for c in jc if c.endswith("ASSETS")]
            if ac and sc:
                join = (t, ac[0], sc[0])
                break
    if join and "ZGENERICALBUM" in tables:
        t, ac, sc = join
        for r in pc.execute(f"SELECT j.{sc} AS asset, g.ZTITLE AS title FROM {t} j JOIN ZGENERICALBUM g ON g.Z_PK=j.{ac} WHERE g.ZTITLE IS NOT NULL"):
            albums.setdefault(r["asset"], []).append(r["title"])
    rows = pc.execute(sql).fetchall()
    progress(f"{len(rows)} öğe bulundu (Photos.sqlite)")
    added = updated = errors = 0
    for i, r in enumerate(rows[:limit] if limit else rows, 1):
        try:
            if r["ZTRASHEDSTATE"]:
                continue
            kind = "video" if (r["ZKIND"] == 1 or str(r["ZFILENAME"] or "").lower().endswith((".mov", ".mp4", ".m4v"))) else "foto"
            path = library / "originals" / (r["ZDIRECTORY"] or "") / (r["ZFILENAME"] or "")
            created = dt.datetime.fromtimestamp(APPLE_EPOCH + float(r["ZDATECREATED"] or 0)) if r["ZDATECREATED"] else None
            uuid = r["ZUUID"]
            item = {
                "uuid": "p:" + uuid, "source": "photos", "path": str(path) if path.exists() else None,
                "path_original": str(path), "filename": r["ZORIGINALFILENAME"] or r["ZFILENAME"], "kind": kind,
                "_created": created, "width": r["ZWIDTH"] or 0, "height": r["ZHEIGHT"] or 0,
                "duration": round(float(r["ZDURATION"] or 0), 2), "favorite": 1 if r["ZFAVORITE"] else 0,
                "edited": 1 if r["ZHASADJUSTMENTS"] else 0, "hidden": 1 if r["ZHIDDEN"] else 0,
                "albums": albums.get(r["Z_PK"], []), "title": r["ZTITLE"], "lat": r["ZLATITUDE"], "lon": r["ZLONGITUDE"],
                "apple_score": r["ZOVERALLAESTHETICSCORE"], "available": 1 if path.exists() else 0,
                "indexed_at": db.now(), "has_audio": 1 if kind == "video" else 0,
            }
            thumb_src = None
            if not item["available"] or kind == "video":
                derivs = sorted(glob.glob(str(library / "resources" / "derivatives" / uuid[0] / f"{uuid}_*")))
                derivs = [d for d in derivs if d.lower().endswith((".jpg", ".jpeg", ".heic"))]
                if derivs:
                    thumb_src = min(derivs, key=lambda d: Path(d).stat().st_size)
            _, created_new = db.upsert_item(con, _finish_item(item, thumb_src=thumb_src))
            added += created_new
            updated += (not created_new)
        except Exception as e:
            errors += 1
            progress(f"  ! {r['ZFILENAME']}: {e}")
        if i % 200 == 0:
            con.commit()
            progress(f"  {i}/{len(rows)}")
    con.commit()
    pc.close()
    shutil.rmtree(dbcopy.parent, ignore_errors=True)
    return {"bulunan": len(rows), "yeni": added, "guncellenen": updated, "hata": errors}


def import_photos(con, library=None, progress=print, limit=None):
    """Fotoğraflar kütüphanesini içe aktarır (osxphotos varsa onu, yoksa SQLite'ı kullanır)."""
    config.ensure_dirs()
    library = Path(library).expanduser() if library else default_library()
    if not library or not Path(library).exists():
        raise FileNotFoundError("Fotoğraflar kütüphanesi bulunamadı. Yol verin: --kutuphane '~/Pictures/Photos Library.photoslibrary'")
    started = db.now()
    try:
        import osxphotos  # noqa: F401
        progress("osxphotos ile içe aktarılıyor…")
        res = _import_osxphotos(con, library, progress, limit)
    except ImportError:
        progress("osxphotos yok; Photos.sqlite doğrudan okunuyor (albüm/kişi bilgisi sınırlı). Tam veri için: pip install osxphotos")
        res = _import_sqlite(con, library, progress, limit)
    con.execute("INSERT INTO scans(root,source,started_at,finished_at,added,updated,skipped,errors) VALUES(?,?,?,?,?,?,?,?)",
                (str(library), "photos", started, db.now(), res["yeni"], res["guncellenen"], 0, res["hata"]))
    con.commit()
    progress(f"Bitti: {res}")
    return res


def ensure_local(con, item, progress=print):
    """Öğenin yerel dosya yolunu döndürür; iCloud'daysa osxphotos ile indirmeyi dener."""
    path = item.get("path")
    if path and Path(path).exists():
        return path
    if item.get("source") != "photos":
        raise FileNotFoundError(f"Dosya yerelde yok: {path or item.get('filename')}")
    uuid = item["uuid"].split(":", 1)[1]
    dest = config.CACHE / "photos-export"
    dest.mkdir(parents=True, exist_ok=True)
    exe = shutil.which("osxphotos")
    if not exe:
        raise FileNotFoundError("Orijinal Mac'te yok ve osxphotos kurulu değil. `pip install osxphotos` sonra tekrar deneyin "
                                "ya da Fotoğraflar > Ayarlar > iCloud > 'Orijinalleri Bu Mac'e İndir'.")
    progress(f"iCloud'dan indiriliyor: {item.get('filename')}")
    subprocess.run([exe, "export", str(dest), "--uuid", uuid, "--download-missing", "--skip-original-if-edited",
                    "--overwrite", "--no-progress"], capture_output=True, text=True, timeout=1800)
    stem = Path(item.get("filename") or "").stem
    found = sorted(dest.glob(f"{stem}*"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not found:
        raise FileNotFoundError(f"İndirilemedi: {item.get('filename')}")
    db.set_item(con, item["id"], path=str(found[0]), available=1)
    return str(found[0])
