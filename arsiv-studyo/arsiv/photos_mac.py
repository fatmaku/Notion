"""macOS Fotoğraflar (iCloud Fotoğraflar) kütüphanesini içe aktarır.

Tercih: `pip install osxphotos` (tam meta veri: albümler, kişiler, etiketler, Apple estetik puanı).
Yedek: Photos.sqlite dosyasını doğrudan okur (temel alanlar).
Orijinal dosya Mac'te yoksa (iCloud'da "Mac Depolamasını Optimize Et"), öğe yine kaydedilir; küçük resim
Fotoğraflar'ın kendi türevlerinden alınır; üretim sırasında `ensure_local` osxphotos ile indirir.
"""
import datetime as dt
import os
import shutil
import sqlite3
import subprocess
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import config, db, media, score

APPLE_EPOCH = 978307200  # 2001-01-01
FDA_MSG = ("Fotoğraflar kütüphanesi okunamadı (izin yok). Sistem Ayarları › Gizlilik ve Güvenlik › Tam Disk Erişimi'nde "
           "Terminal'i ekleyin; sonra Terminal'i tamamen kapatıp (Cmd+Q) Baslat.command'ı yeniden çalıştırın.")
NOT_FOUND_MSG = ("Fotoğraflar kütüphanesi bulunamadı. Web arayüzünde 'Kütüphane yolu' alanına ya da komut satırında --kutuphane ile "
                 "yolunu verin (Fotoğraflar › Ayarlar › Genel › Kütüphane konumu).")
THUMB_EXT = (".jpg", ".jpeg", ".heic")


def default_library():
    env = os.environ.get("ARSIV_PHOTOS_LIBRARY")
    if env:
        return Path(env).expanduser()
    try:  # Fotoğraflar'ın en son açtığı kütüphane
        from osxphotos.utils import get_last_library_path  # type: ignore
        p = get_last_library_path()
        if p and Path(p).exists():
            return Path(p)
    except Exception:
        pass
    cands = list(Path.home().glob("Pictures/*.photoslibrary"))
    if not cands:
        return None
    for c in cands:
        if c.name.lower().startswith("photos library"):
            return c
    return max(cands, key=lambda c: c.stat().st_mtime)


def _finish_item(item, thumb_src=None, known=None):
    """Tarih/oran/puan alanlarını tamamlar; küçük resim ve hash'leri yalnızca eksikse üretir."""
    created = item.pop("_created", None) or dt.datetime.now()
    item.update(created_at=created.replace(microsecond=0).isoformat(), year=created.year, month=created.month,
                day=created.day, hour=created.hour, weekday=created.weekday())
    item["aspect"], item["orientation"] = media.classify_aspect(item.get("width"), item.get("height"))
    prev = (known or {}).get(item["uuid"]) or {}
    thumb = config.THUMBS / f"{item['uuid']}.jpg"
    if thumb.exists() and prev.get("dhash"):
        item["thumb"], item["dhash"] = str(thumb), prev["dhash"]
    else:
        src = thumb_src or item.get("path")
        if src and Path(src).exists():
            try:
                if not thumb.exists():
                    media.thumbnail(src, thumb, "foto" if thumb_src else item["kind"], duration=item.get("duration") or 0)
                item["thumb"] = str(thumb)
                item["dhash"] = media.dhash_file(thumb)
            except Exception as e:
                item["notes"] = f"küçük resim yok: {e}"[:300]
    path = item.get("path")
    if path and Path(path).exists():
        try:
            size = Path(path).stat().st_size
            item["size"] = size
            item["qhash"] = prev["qhash"] if (prev.get("qhash") and prev.get("size") == size) else media.quick_hash(path, size)
        except OSError:
            pass
    item["social_score"], item["score_reasons"] = score.compute(item)
    return item


def _known(con):
    """Önceki içe aktarımdan kalan hash'ler: yeniden içe aktarmada tekrar hesaplanmaz."""
    return {r["uuid"]: {"dhash": r["dhash"], "qhash": r["qhash"], "size": r["size"]}
            for r in con.execute("SELECT uuid, dhash, qhash, size FROM items WHERE source='photos'")}


def _deriv_index(library):
    """resources/derivatives altındaki küçük JPEG'leri bir kez listeler: uuid → [yollar]."""
    idx = {}
    base = Path(library) / "resources" / "derivatives"
    if not base.is_dir():
        return idx
    for sub in base.iterdir():
        if not sub.is_dir():
            continue
        try:
            for e in os.scandir(sub):
                n = e.name.lower()
                if n.endswith(THUMB_EXT):
                    idx.setdefault(e.name.split("_", 1)[0], []).append(e.path)
        except OSError:
            continue
    return idx


def _pick_deriv(paths):
    """Küçük resim için uygun türev: ~40 KB'den büyük en küçüğü (çok küçük önizlemeler bulanık olur)."""
    sized = []
    for d in paths or []:
        try:
            sized.append((Path(d).stat().st_size, d))
        except OSError:
            pass
    if not sized:
        return None
    sized.sort()
    big = [d for sz, d in sized if sz >= 40_000]
    return big[0] if big else sized[-1][1]


def _store(con, jobs, total, progress, known, label):
    """(item, thumb_src) çiftlerini paralel tamamlar, ana iş parçacığında kısa işlemlerle yazar."""
    added = updated = errors = done = 0
    last = time.monotonic()
    workers = max(2, min(8, (os.cpu_count() or 4)))

    def work(pair):
        item, src = pair
        try:
            return _finish_item(item, thumb_src=src, known=known), None
        except Exception as e:  # tek öğe hatası tüm içe aktarmayı durdurmasın
            return None, f"{item.get('filename')}: {e}"

    with ThreadPoolExecutor(max_workers=workers) as ex:
        for item, err in ex.map(work, jobs):
            done += 1
            if err:
                errors += 1
                progress(f"  ! {err}")
            else:
                _, created = db.upsert_item(con, item)
                added += created
                updated += (not created)
            if time.monotonic() - last > 0.5:  # yazma kilidini kısa tut
                con.commit()
                last = time.monotonic()
            if done % 500 == 0:
                progress(f"  {done}/{total} ({label}: yeni {added}, güncellenen {updated}, hata {errors})")
    con.commit()
    return added, updated, errors


# ---------------------------------------------------------------- osxphotos yolu
def _import_osxphotos(con, library, progress, limit=None):
    import osxphotos  # type: ignore
    pdb = osxphotos.PhotosDB(dbfile=str(library)) if library else osxphotos.PhotosDB()
    photos = pdb.photos(intrash=False)
    if limit:
        photos = photos[:limit]
    progress(f"{len(photos)} öğe bulundu (osxphotos)")
    lib = Path(getattr(pdb, "library_path", None) or library or "")
    dindex = _deriv_index(lib) if str(lib) else {}
    known = _known(con)

    def jobs():
        for p in photos:
            try:
                yield _item_from_osxphotos(p, dindex)
            except Exception as e:
                progress(f"  ! {getattr(p, 'original_filename', '?')}: {e}")

    added, updated, errors = _store(con, jobs(), len(photos), progress, known, "osxphotos")
    return {"bulunan": len(photos), "yeni": added, "guncellenen": updated, "hata": errors}


def _item_from_osxphotos(p, dindex=None):
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
    # Küçük resim için Fotoğraflar'ın kendi küçük JPEG türevleri (12 MP orijinali çözmekten ~40 kat hızlı)
    derivs = (dindex or {}).get(p.uuid)
    if derivs is None:
        derivs = [d for d in (getattr(p, "path_derivatives", None) or []) if d and d.lower().endswith(THUMB_EXT)]
    return item, _pick_deriv(derivs)


# ---------------------------------------------------------------- doğrudan SQLite yolu
def _copy_db(library):
    src = Path(library) / "database" / "Photos.sqlite"
    try:
        with open(src, "rb") as f:
            f.read(1)
    except FileNotFoundError:
        raise FileNotFoundError(f"Photos.sqlite bulunamadı: {src}")
    except PermissionError as e:
        raise PermissionError(FDA_MSG) from e
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
    ext_cols = {r[1] for r in pc.execute("PRAGMA table_info(ZEXTENDEDATTRIBUTES)")} if "ZEXTENDEDATTRIBUTES" in tables else set()
    comp_cols = {r[1] for r in pc.execute("PRAGMA table_info(ZCOMPUTEDASSETATTRIBUTES)")} if "ZCOMPUTEDASSETATTRIBUTES" in tables else set()

    def col(name, alias=None, table="a", have=cols):
        return f"{table}.{name} AS {alias or name}" if name in have else f"NULL AS {alias or name}"

    adj = "ZADJUSTMENTSSTATE" if "ZADJUSTMENTSSTATE" in cols else "ZHASADJUSTMENTS"  # Photos 9.9+ (macOS 15) adı değiştirdi
    dur_parts = [x for x in (("a.ZDURATION" if "ZDURATION" in cols else None), ("ea.ZDURATION" if "ZDURATION" in ext_cols else None)) if x]
    dur_expr = (f"COALESCE({', '.join(dur_parts)})" if len(dur_parts) > 1 else dur_parts[0]) if dur_parts else "NULL"
    score_expr = "a.ZOVERALLAESTHETICSCORE" if "ZOVERALLAESTHETICSCORE" in cols else ("ca.ZOVERALLAESTHETICSCORE" if "ZOVERALLAESTHETICSCORE" in comp_cols else "NULL")
    sql = f"""SELECT a.Z_PK, a.ZUUID, a.ZFILENAME, a.ZDIRECTORY, a.ZDATECREATED, {dur_expr} AS ZDURATION, a.ZWIDTH, a.ZHEIGHT,
                {col('ZFAVORITE')}, {col('ZKIND')}, {col('ZHIDDEN')}, {col('ZTRASHEDSTATE')}, {col(adj, alias='ZHASADJUSTMENTS')},
                {col('ZLATITUDE')}, {col('ZLONGITUDE')}, {col('ZAVALANCHEUUID')}, {col('ZAVALANCHEPICKTYPE')}, {col('ZCLOUDBATCHPUBLISHDATE')},
                {col('ZORIGINALFILENAME', table='aa', have=attr_cols)}, {col('ZTITLE', table='aa', have=attr_cols)},
                {col('ZTIMEZONEOFFSET', table='aa', have=attr_cols)}, {score_expr} AS ZOVERALLAESTHETICSCORE
              FROM {asset} a LEFT JOIN ZADDITIONALASSETATTRIBUTES aa ON aa.ZASSET = a.Z_PK
              {'LEFT JOIN ZEXTENDEDATTRIBUTES ea ON ea.ZASSET = a.Z_PK' if ext_cols else ''}
              {'LEFT JOIN ZCOMPUTEDASSETATTRIBUTES ca ON ca.ZASSET = a.Z_PK' if (comp_cols and 'ZOVERALLAESTHETICSCORE' not in cols) else ''}"""
    # albümler: Z_nnASSETS bağlantı tablosunu dinamik bul (yalnızca kullanıcı 2 ve paylaşılan 1505 albümler, çöpte olmayanlar)
    albums = {}
    join = None
    for t in sorted(tables):
        if t.startswith("Z_") and t.endswith("ASSETS"):
            jc = [r[1] for r in pc.execute(f"PRAGMA table_info({t})")]
            ac = [c for c in jc if c.endswith("ALBUMS") and not c.startswith("Z_FOK")]
            sc = [c for c in jc if c.endswith("ASSETS") and not c.startswith("Z_FOK")]
            if ac and sc:
                join = (t, ac[0], sc[0])
                break
    if join and "ZGENERICALBUM" in tables:
        t, ac, sc = join
        gcols = {r[1] for r in pc.execute("PRAGMA table_info(ZGENERICALBUM)")}
        where = "g.ZTITLE IS NOT NULL"
        if "ZKIND" in gcols:
            where += " AND g.ZKIND IN (2, 1505)"
        if "ZTRASHEDSTATE" in gcols:
            where += " AND COALESCE(g.ZTRASHEDSTATE, 0) = 0"
        for r in pc.execute(f"SELECT j.{sc} AS asset, g.ZTITLE AS title FROM {t} j JOIN ZGENERICALBUM g ON g.Z_PK=j.{ac} WHERE {where}"):
            albums.setdefault(r["asset"], []).append(r["title"])
    rows = pc.execute(sql).fetchall()
    if limit:
        rows = rows[:limit]
    progress(f"{len(rows)} öğe bulundu (Photos.sqlite)")
    dindex = _deriv_index(library)
    known = _known(con)
    stat = {"seri": 0}

    def jobs():
        for r in rows:
            try:
                if r["ZTRASHEDSTATE"]:
                    continue
                pick = r["ZAVALANCHEPICKTYPE"]
                if r["ZAVALANCHEUUID"] and pick not in (None, 0) and (int(pick) & 24) == 0:
                    stat["seri"] += 1  # seri çekimde seçilmemiş kare
                    continue
                yield _item_from_row(r, library, albums, dindex)
            except Exception as e:
                progress(f"  ! {r['ZFILENAME']}: {e}")

    added, updated, errors = _store(con, jobs(), len(rows), progress, known, "Photos.sqlite")
    pc.close()
    shutil.rmtree(dbcopy.parent, ignore_errors=True)
    return {"bulunan": len(rows), "yeni": added, "guncellenen": updated, "hata": errors, "seri_atlanan": stat["seri"]}


def _item_from_row(r, library, albums, dindex):
    kind = "video" if (r["ZKIND"] == 1 or str(r["ZFILENAME"] or "").lower().endswith((".mov", ".mp4", ".m4v"))) else "foto"
    shared = r["ZCLOUDBATCHPUBLISHDATE"] is not None
    rel = Path(r["ZDIRECTORY"] or "") / (r["ZFILENAME"] or "")
    path = library / "originals" / rel
    if shared:
        for base in ("scopes/cloudsharing/data", "resources/cloudsharing/data"):
            cand = library / base / rel
            if cand.exists():
                path = cand
                break
    ts = r["ZDATECREATED"]
    created = None
    if ts:
        tzoff = r["ZTIMEZONEOFFSET"]
        if tzoff is not None:
            created = dt.datetime.fromtimestamp(APPLE_EPOCH + float(ts), tz=dt.timezone(dt.timedelta(seconds=int(tzoff)))).replace(tzinfo=None)
        else:
            created = dt.datetime.fromtimestamp(APPLE_EPOCH + float(ts))
    lat, lon = r["ZLATITUDE"], r["ZLONGITUDE"]
    if lat == -180.0 and lon == -180.0:  # Photos'un "konum yok" işareti
        lat = lon = None
    uuid = r["ZUUID"]
    exists = path.exists()
    item = {
        "uuid": "p:" + uuid, "source": "photos", "path": str(path) if exists else None,
        "path_original": str(path), "filename": r["ZORIGINALFILENAME"] or r["ZFILENAME"], "kind": kind,
        "_created": created, "width": r["ZWIDTH"] or 0, "height": r["ZHEIGHT"] or 0,
        "duration": round(float(r["ZDURATION"] or 0), 2), "favorite": 1 if r["ZFAVORITE"] else 0,
        "edited": 1 if r["ZHASADJUSTMENTS"] else 0, "hidden": 1 if r["ZHIDDEN"] else 0, "shared": 1 if shared else 0,
        "albums": albums.get(r["Z_PK"], []), "title": r["ZTITLE"], "lat": lat, "lon": lon,
        "apple_score": r["ZOVERALLAESTHETICSCORE"], "available": 1 if exists else 0,
        "indexed_at": db.now(), "has_audio": 1 if kind == "video" else 0,
    }
    return item, _pick_deriv(dindex.get(uuid))


def import_photos(con, library=None, progress=print, limit=None):
    """Fotoğraflar kütüphanesini içe aktarır (osxphotos varsa onu, yoksa SQLite'ı kullanır)."""
    config.ensure_dirs()
    library = Path(library).expanduser() if library else default_library()
    if not library or not Path(library).exists():
        raise FileNotFoundError(NOT_FOUND_MSG)
    started = db.now()
    try:
        import osxphotos  # type: ignore  # noqa: F401
        have_osx = True
    except ImportError:
        have_osx = False
    try:
        if have_osx:
            progress("osxphotos ile içe aktarılıyor…")
            try:
                res = _import_osxphotos(con, library, progress, limit)
            except PermissionError:
                raise
            except Exception as e:
                progress(f"osxphotos okuyamadı ({e}); Photos.sqlite doğrudan okunuyor…")
                res = _import_sqlite(con, library, progress, limit)
        else:
            progress("osxphotos yok; Photos.sqlite doğrudan okunuyor (albüm/kişi bilgisi sınırlı). Tam veri için: pip install osxphotos")
            res = _import_sqlite(con, library, progress, limit)
    except PermissionError as e:
        raise PermissionError(FDA_MSG) from e
    except sqlite3.OperationalError as e:
        if "unable to open" in str(e).lower() or "permission" in str(e).lower():
            raise PermissionError(FDA_MSG) from e
        raise
    con.execute("INSERT INTO scans(root,source,started_at,finished_at,added,updated,skipped,errors) VALUES(?,?,?,?,?,?,?,?)",
                (str(library), "photos", started, db.now(), res["yeni"], res["guncellenen"], res.get("seri_atlanan", 0), res["hata"]))
    con.commit()
    try:
        con.execute("PRAGMA optimize")  # sorgu planlayıcısı için istatistikler
    except Exception:
        pass
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
    dest = config.CACHE / "photos-export" / uuid
    dest.mkdir(parents=True, exist_ok=True)
    exe = shutil.which("osxphotos") or str(Path(os.sys.executable).with_name("osxphotos"))
    if not Path(exe).exists():
        raise FileNotFoundError("Orijinal Mac'te yok ve osxphotos kurulu değil. `pip install osxphotos` sonra tekrar deneyin "
                                "ya da Fotoğraflar › Ayarlar › iCloud › 'Orijinalleri Bu Mac'e İndir'.")
    progress(f"iCloud'dan indiriliyor: {item.get('filename')} (Fotoğraflar uygulaması açılabilir)")
    r = subprocess.run([exe, "export", str(dest), "--uuid", uuid, "--download-missing", "--skip-original-if-edited",
                        "--overwrite", "--no-progress"], capture_output=True, text=True, timeout=1800)
    if r.returncode != 0:
        raise FileNotFoundError(f"İndirilemedi ({item.get('filename')}): {r.stderr.strip()[-400:] or r.stdout.strip()[-400:]}\n"
                                "İpucu: Sistem Ayarları › Gizlilik ve Güvenlik › Otomasyon › Terminal › Fotoğraflar izni gerekir.")
    found = [p for p in dest.iterdir() if p.is_file() and not p.name.startswith(".")]
    if not found:
        raise FileNotFoundError(f"İndirilemedi: {item.get('filename')}")
    best = max(found, key=lambda p: p.stat().st_size)
    db.set_item(con, item["id"], path=str(best), available=1)
    return str(best)
