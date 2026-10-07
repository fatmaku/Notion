"""Instagram 'Bilgilerini indir' (JSON) dışa aktarımını okur; eski paylaşımları arşivdeki öğelerle eşler.

Instagram > Ayarlar > Hesap Merkezi > Bilgilerin ve izinlerin > Bilgilerini indir > JSON formatı.
Dışa aktarım klasörü içinde posts_1.json, reels.json, stories.json, igtv_videos.json vb. dosyalar aranır.
"""
import datetime as dt
import json
from pathlib import Path

from . import config, db, media

POST_FILES = {"posts": "post", "reels": "reel", "stories": "story", "igtv_videos": "igtv", "archived_posts": "post",
              "profile_photos": "profil"}


def _fix_mojibake(s):
    """Instagram dışa aktarımında Türkçe karakterler latin-1 olarak bozuk gelir; düzeltir."""
    if not s or not isinstance(s, str):
        return s
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def _kind_for(filename):
    name = filename.lower()
    for key, kind in POST_FILES.items():
        if name.startswith(key):
            return kind
    return None


def _walk(node, out, caption=None):
    """JSON içinde uri+creation_timestamp taşıyan tüm sözlükleri toplar."""
    if isinstance(node, dict):
        cap = node.get("title") if isinstance(node.get("title"), str) else caption
        if "uri" in node and "creation_timestamp" in node:
            out.append({"uri": node["uri"], "ts": node["creation_timestamp"], "caption": _fix_mojibake(node.get("title") or caption)})
            return
        for v in node.values():
            _walk(v, out, cap)
    elif isinstance(node, list):
        for v in node:
            _walk(v, out, caption)


def parse_export(root):
    """Dışa aktarım klasöründeki tüm paylaşımları listeler."""
    root = Path(root).expanduser()
    found = []
    for jf in root.rglob("*.json"):
        kind = _kind_for(jf.name)
        if not kind or "insights" in str(jf.parent).lower():  # istatistik dosyaları ayrı okunur (import_insights_export)
            continue
        try:
            data = json.loads(jf.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            continue
        entries = []
        _walk(data, entries)
        for e in entries:
            media_path = root / e["uri"] if e["uri"] and not str(e["uri"]).startswith("http") else None
            found.append({
                "platform": "instagram", "kind": kind,
                "posted_at": dt.datetime.fromtimestamp(int(e["ts"])).replace(microsecond=0).isoformat() if e["ts"] else None,
                "caption": e["caption"], "media_path": str(media_path) if media_path else e["uri"],
                "media_exists": bool(media_path and media_path.exists()),
            })
    found.sort(key=lambda d: d["posted_at"] or "")
    return found


def _safe_extract(zf, dest):
    """Zip'i güvenle açar (yol kaçışı yok); zaten açılmış üyeleri atlar."""
    import zipfile  # noqa: F401
    dest = Path(dest).resolve()
    for m in zf.infolist():
        if m.is_dir():
            continue
        target = (dest / m.filename).resolve()
        if dest not in target.parents:
            continue  # ../ gibi tehlikeli yollar
        if target.exists() and target.stat().st_size == m.file_size:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(m) as src, open(target, "wb") as out:
            while True:
                chunk = src.read(4 * 1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)


def prepare_source(path, progress=print):
    """Zip dosyası ya da zip'lerle dolu klasör verildiyse (Instagram büyük dışa aktarımı parçalara böler) açar; klasörü döndürür."""
    import zipfile
    p = Path(path).expanduser()
    zips = [p] if p.is_file() and p.suffix.lower() == ".zip" else sorted(p.glob("*.zip")) if p.is_dir() else []
    if not zips or (p.is_dir() and any(p.rglob("*.json"))):
        return p  # zaten açılmış klasör
    dest = config.HOME / "instagram-disa-aktarim" / (zips[0].stem.split("-part")[0] if len(zips) > 1 else zips[0].stem)
    dest.mkdir(parents=True, exist_ok=True)
    for z in zips:
        progress(f"zip açılıyor: {z.name} ({z.stat().st_size / 1e9:.1f} GB) → {dest}")
        try:
            with zipfile.ZipFile(z) as zf:
                _safe_extract(zf, dest)
        except zipfile.BadZipFile as ex:
            raise ValueError(f"{z.name}: bozuk/eksik zip (indirme tamamlanmamış olabilir): {ex}")
    return dest


def import_export(con, root, progress=print, match=True):
    """Paylaşımları veritabanına yazar ve arşivle eşleştirir. root: açılmış klasör, .zip ya da zip'lerin olduğu klasör."""
    config.ensure_dirs()
    root = prepare_source(root, progress)
    entries = parse_export(root)
    progress(f"{len(entries)} paylaşım bulundu: {root}")
    new = 0
    for e in entries:
        d = dict(e)
        exists = d.pop("media_exists", False)
        if exists:
            p = Path(d["media_path"])
            try:
                if p.suffix.lower() in config.VIDEO_EXT:
                    info = media.probe(p)
                    d["duration"], d["width"], d["height"] = round(info["duration"], 2), info["width"], info["height"]
                    tmp = config.CACHE / f"ig-{abs(hash(str(p)))}.jpg"
                    media.thumbnail(p, tmp, "video", duration=info["duration"])
                    d["media_dhash"] = media.dhash_file(tmp)
                else:
                    info = media.image_info(p)
                    d["width"], d["height"] = info["width"], info["height"]
                    d["media_dhash"] = media.dhash_file(p)
            except Exception as ex:
                progress(f"  ! {p.name}: {ex}")
        _, created = db.upsert_post(con, d)
        new += created
    con.commit()
    res = {"bulunan": len(entries), "yeni": new}
    try:
        res["istatistik"] = import_insights_export(con, root, progress)
    except Exception as ex:  # istatistik okunamadı diye içe aktarma durmasın
        progress(f"  ! istatistik: {ex}")
    if match:
        res["eslesen"] = match_posts(con, progress)
    try:
        con.execute("PRAGMA optimize")  # sorgu planlayıcısı için istatistikler
    except Exception:
        pass
    progress(f"Bitti: {res}")
    return res


def match_posts(con, progress=print, only_unmatched=True):
    """Paylaşımları arşiv öğeleriyle eşler.
    1) Görsel hash (güvenilir) → öğe 'paylaşıldı' işaretlenir.
    2) Tarih yakınlığı (tahmin) → yalnızca öneri olarak saklanır (matched_by='tarih?'); kullanıcı 'Paylaşılanlar'da onaylar."""
    where = "WHERE item_id IS NULL OR matched_by='tarih?'" if only_unmatched else ""
    posts = [dict(r) for r in con.execute(f"SELECT * FROM posts {where}")]
    # Hash'ler bir kez yüklenir ve numpy ile vektörel karşılaştırılır (200k öğe × 1000 paylaşım saniyeler sürer)
    import numpy as np
    pool = {}
    for kind in ("foto", "video"):
        rows = con.execute("SELECT id, dhash, duration FROM items WHERE dhash IS NOT NULL AND kind=?", (kind,)).fetchall()
        rows = [r for r in rows if r["dhash"]]
        pool[kind] = (np.array([r["id"] for r in rows], dtype=np.int64),
                      np.array([int(r["dhash"], 16) for r in rows], dtype=np.uint64),
                      np.array([r["duration"] or 0 for r in rows], dtype=np.float64))
    lut = np.array([bin(i).count("1") for i in range(256)], dtype=np.uint8)

    def popcount(x):
        if hasattr(np, "bitwise_count"):
            return np.bitwise_count(x)
        return lut[x.view(np.uint8)].reshape(-1, 8).sum(axis=1)

    matched = suggested = 0
    for k, post in enumerate(posts, 1):
        best = None
        if post.get("media_dhash"):
            is_video = (post.get("duration") or 0) > 0
            ids, hs, durs = pool["video" if is_video else "foto"]
            if len(ids):
                d = popcount(hs ^ np.uint64(int(post["media_dhash"], 16))).astype(np.int32)
                ok = d <= 10
                pdur = post.get("duration") or 0
                if is_video and pdur:
                    ok &= np.abs(durs - pdur) <= 2.5
                if ok.any():
                    j = int(np.argmin(np.where(ok, d, 99)))
                    best = (int(ids[j]), 1.0 - int(d[j]) / 20.0, "gorsel")
        if best:
            db.link_post(con, post["id"], best[0], best[2], best[1])
            matched += 1
        elif post.get("posted_at"):
            # Tahmin: paylaşımdan en çok 3 gün önce çekilmiş, aynı türde; çok aday varsa belirsiz → öneri yok
            pa = dt.datetime.fromisoformat(post["posted_at"][:19])
            lo, hi = (pa - dt.timedelta(days=3)).isoformat(), (pa + dt.timedelta(hours=2)).isoformat()
            kind = "video" if post.get("kind") in ("reel", "igtv") or (post.get("duration") or 0) > 0 else None
            if kind:  # tarih aralığı dizini kullanılsın (posted_at dizini neredeyse tüm tabloyu tarar)
                sql = "SELECT id, duration, social_score FROM items INDEXED BY ix_items_kind_created WHERE kind=? AND created_at BETWEEN ? AND ? AND posted_at IS NULL"
                args = [kind, lo, hi]
            else:
                sql = "SELECT id, duration, social_score FROM items INDEXED BY ix_items_created WHERE created_at BETWEEN ? AND ? AND posted_at IS NULL"
                args = [lo, hi]
            cands = [r for r in con.execute(sql + " ORDER BY social_score DESC LIMIT 8", args)
                     if not (post.get("duration") and abs((r["duration"] or 0) - post["duration"]) > 3)]
            if 0 < len(cands) <= 5:
                con.execute("UPDATE posts SET item_id=?, matched_by='tarih?', confidence=? WHERE id=?",
                            (cands[0]["id"], round(0.35 / len(cands), 2), post["id"]))
                suggested += 1
        if k % 50 == 0:
            con.commit()
    con.commit()
    progress(f"{matched}/{len(posts)} paylaşım görsel olarak eşleşti; {suggested} tahmini eşleşme onayınızı bekliyor")
    return matched


# "Bilgilerini indir" içindeki past_instagram_insights/*.json (profesyonel hesaplar): paylaşım başına erişim/beğeni/…
INSIGHT_KEYS = {
    "reach": ("accounts reached", "reach", "erreichte konten", "reichweite", "erişilen hesap", "erişim", "ulaşılan hesap"),
    "likes": ("likes", "gefällt mir", "beğeni"),
    "comments": ("comments", "kommentare", "yorum"),
    "shares": ("shares", "geteilt", "paylaşım"),
    "saves": ("saves", "gespeichert", "kaydet"),
}


def _insight_rows(node, out):
    """string_map_data taşıyan sözlükleri toplar (yapı: {"...": [{"media_map_data": {...}, "string_map_data": {...}}]})."""
    if isinstance(node, dict):
        if isinstance(node.get("string_map_data"), dict):
            out.append(node)
            return
        for v in node.values():
            _insight_rows(v, out)
    elif isinstance(node, list):
        for v in node:
            _insight_rows(v, out)


def _insight_num(v):
    if isinstance(v, dict):
        v = v.get("value", v.get("timestamp"))
    digits = "".join(ch for ch in str(v if v is not None else "") if ch.isdigit())
    return int(digits) if digits else None


def parse_insights(root):
    """[{posted_at, kind, reach, likes, comments, shares, saves}] — dosya adından tür (posts/reels/stories)."""
    root = Path(root).expanduser()
    rows = []
    for jf in root.rglob("*.json"):
        if "insights" not in str(jf.parent).lower() and "insights" not in jf.name.lower():
            continue
        try:
            data = json.loads(jf.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            continue
        kind = "reel" if "reel" in jf.name.lower() else "story" if "stor" in jf.name.lower() else "post"
        found = []
        _insight_rows(data, found)
        for n in found:
            smd = n["string_map_data"]
            ts = None
            for k, v in smd.items():
                if "timestamp" in k.lower() or "zeitstempel" in k.lower() or "zaman" in k.lower():
                    ts = _insight_num(v) if isinstance(v, dict) and v.get("timestamp") else ts
            if not ts:
                for m in (n.get("media_map_data") or {}).values():
                    if isinstance(m, dict) and m.get("creation_timestamp"):
                        ts = int(m["creation_timestamp"]); break
            if not ts:
                continue
            row = {"posted_at": dt.datetime.fromtimestamp(ts).replace(microsecond=0).isoformat(), "kind": kind}
            for k, v in smd.items():
                kl = _fix_mojibake(k).lower()
                for col, names in INSIGHT_KEYS.items():
                    if any(kl.startswith(nm) or kl == nm for nm in names) and col not in row:
                        num = _insight_num(v)
                        if num is not None:
                            row[col] = num
            if any(c in row for c in INSIGHT_KEYS):
                rows.append(row)
    return rows


def import_insights_export(con, root, progress=print):
    """Dışa aktarımdaki istatistikleri (varsa) paylaşımlara tarih yakınlığıyla bağlar; CSV gerekmez."""
    rows = parse_insights(root)
    if not rows:
        return 0
    n = 0
    for r in rows:
        pa = dt.datetime.fromisoformat(r["posted_at"])
        lo, hi = (pa - dt.timedelta(hours=12)).isoformat(), (pa + dt.timedelta(hours=12)).isoformat()
        nums = {k: r[k] for k in INSIGHT_KEYS if k in r}
        post = con.execute("SELECT id FROM posts WHERE posted_at BETWEEN ? AND ? ORDER BY ABS(julianday(posted_at)-julianday(?)) LIMIT 1",
                           (lo, hi, r["posted_at"])).fetchone()
        if post:
            con.execute(f"UPDATE posts SET {', '.join(k + '=?' for k in nums)} WHERE id=?", [*nums.values(), post["id"]])
        else:
            db.upsert_post(con, {"platform": "instagram", "kind": r["kind"], "posted_at": r["posted_at"], "media_path": None, **nums})
        n += 1
    con.commit()
    progress(f"{n} paylaşımın istatistiği dışa aktarımdan okundu (erişim/beğeni/kaydetme/paylaşım)")
    return n


def _parse_when(s):
    s = (s or "").strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%m/%d/%Y %H:%M", "%m/%d/%Y %I:%M %p",
                "%m/%d/%Y", "%d.%m.%Y %H:%M", "%d.%m.%Y %H:%M:%S", "%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y %H:%M"):
        try:
            return dt.datetime.strptime(s, fmt)
        except ValueError:
            pass
    return media.parse_iso(s)


def import_insights_csv(con, path, progress=print):
    """Instagram Profesyonel Panel dışa aktarımı (CSV) ile erişim/beğeni verisi ekler.

    Beklenen sütunlar (Türkçe/İngilizce başlıklar tanınır): tarih|date, erişim|reach, beğeni|likes,
    yorum|comments, kaydetme|saves, paylaşım|shares, açıklama|caption (isteğe bağlı)."""
    import csv
    aliases = {"yayın tarihi": "posted_at", "publish time": "posted_at", "veröffentlichungszeit": "posted_at", "tarih": "posted_at", "date": "posted_at", "datum": "posted_at",
               "reichweite": "reach", "gefällt mir": "likes", "kommentare": "comments", "gespeichert": "saves", "geteilt": "shares", "beschreibung": "caption",
               "erişim": "reach", "reach": "reach", "beğeni": "likes", "beğeniler": "likes", "likes": "likes",
               "yorum": "comments", "yorumlar": "comments", "comments": "comments", "kaydetme": "saves", "kaydetmeler": "saves",
               "saves": "saves", "paylaşım": "shares", "paylaşımlar": "shares", "shares": "shares",
               "açıklama": "caption", "description": "caption", "caption": "caption", "tür": "kind", "post type": "kind"}
    n = skipped = 0
    with open(path, newline="", encoding="utf-8-sig") as f:
        sample = f.read(4096); f.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
        except csv.Error:
            dialect = csv.excel
        for row in csv.DictReader(f, dialect=dialect):
            d = {}
            for k, v in row.items():
                key = aliases.get((k or "").strip().lower())
                if key and not d.get(key) and v and _parse_ok(key, v):  # önce gelen anlamlı sütun kazanır ('Date: Lifetime' ezmez)
                    d[key] = v
            pa = _parse_when(d.get("posted_at"))
            if not pa:
                skipped += 1
                continue
            lo, hi = (pa - dt.timedelta(hours=12)).isoformat(), (pa + dt.timedelta(hours=12)).isoformat()
            post = con.execute("SELECT id FROM posts WHERE posted_at BETWEEN ? AND ? ORDER BY ABS(julianday(posted_at)-julianday(?)) LIMIT 1",
                               (lo, hi, pa.isoformat())).fetchone()
            nums = {}
            for k in ("reach", "likes", "comments", "saves", "shares"):
                digits = "".join(ch for ch in str(d.get(k) or "") if ch.isdigit())
                if digits:
                    nums[k] = int(digits)
            if post:
                if nums:
                    con.execute(f"UPDATE posts SET {', '.join(k + '=?' for k in nums)} WHERE id=?", [*nums.values(), post["id"]])
            else:
                db.upsert_post(con, {"platform": "instagram", "kind": (d.get("kind") or "post").lower(), "posted_at": pa.isoformat(),
                                     "caption": d.get("caption"), "media_path": None, **nums})
            n += 1
    con.commit()
    progress(f"{n} satır işlendi" + (f", {skipped} satırda tarih okunamadı" if skipped else ""))
    return n


def _parse_ok(key, v):
    return key != "posted_at" or _parse_when(v) is not None
