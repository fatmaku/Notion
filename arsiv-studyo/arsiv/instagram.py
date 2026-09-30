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
        if not kind:
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


def import_export(con, root, progress=print, match=True):
    """Paylaşımları veritabanına yazar ve arşivle eşleştirir."""
    config.ensure_dirs()
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
    if match:
        res["eslesen"] = match_posts(con, progress)
    progress(f"Bitti: {res}")
    return res


def match_posts(con, progress=print, only_unmatched=True):
    """Paylaşımları arşiv öğeleriyle eşler: önce görsel hash, sonra tarih yakınlığı."""
    where = "WHERE item_id IS NULL" if only_unmatched else ""
    posts = [dict(r) for r in con.execute(f"SELECT * FROM posts {where}")]
    matched = 0
    for post in posts:
        best = None
        if post.get("media_dhash"):
            is_video = (post.get("duration") or 0) > 0
            rows = con.execute("SELECT id, dhash, duration, kind FROM items WHERE dhash IS NOT NULL AND kind=?",
                               ("video" if is_video else "foto",)).fetchall()
            for r in rows:
                d = media.hamming(post["media_dhash"], r["dhash"])
                if d <= 10:
                    if is_video and post.get("duration") and abs((r["duration"] or 0) - post["duration"]) > 2.5:
                        continue
                    conf = 1.0 - d / 20.0
                    if best is None or conf > best[1]:
                        best = (r["id"], conf, "gorsel")
        if best is None and post.get("posted_at"):
            # Tarih yakınlığı: paylaşımdan en çok 21 gün önce çekilmiş, aynı türde, en yüksek puanlı öğe
            pa = dt.datetime.fromisoformat(post["posted_at"][:19])
            lo, hi = (pa - dt.timedelta(days=21)).isoformat(), (pa + dt.timedelta(hours=2)).isoformat()
            kind = "video" if post.get("kind") in ("reel", "igtv") or (post.get("duration") or 0) > 0 else None
            sql = "SELECT id, duration, social_score, created_at FROM items WHERE created_at BETWEEN ? AND ? AND posted_at IS NULL"
            args = [lo, hi]
            if kind:
                sql += " AND kind=?"; args.append(kind)
            cands = con.execute(sql + " ORDER BY social_score DESC LIMIT 20", args).fetchall()
            for r in cands:
                if post.get("duration") and abs((r["duration"] or 0) - post["duration"]) > 3:
                    continue
                days = (pa - dt.datetime.fromisoformat(r["created_at"][:19])).days
                conf = max(0.15, 0.6 - days * 0.02)
                if post.get("duration"):
                    conf += 0.2
                if best is None or conf > best[1]:
                    best = (r["id"], round(conf, 2), "tarih")
        if best:
            db.link_post(con, post["id"], best[0], best[2], best[1])
            matched += 1
    con.commit()
    progress(f"{matched}/{len(posts)} paylaşım eşleşti")
    return matched


def import_insights_csv(con, path, progress=print):
    """Instagram Profesyonel Panel dışa aktarımı (CSV) ile erişim/beğeni verisi ekler.

    Beklenen sütunlar (Türkçe/İngilizce başlıklar tanınır): tarih|date, erişim|reach, beğeni|likes,
    yorum|comments, kaydetme|saves, paylaşım|shares, açıklama|caption (isteğe bağlı)."""
    import csv
    aliases = {"tarih": "posted_at", "date": "posted_at", "yayın tarihi": "posted_at", "publish time": "posted_at",
               "erişim": "reach", "reach": "reach", "beğeni": "likes", "beğeniler": "likes", "likes": "likes",
               "yorum": "comments", "yorumlar": "comments", "comments": "comments", "kaydetme": "saves", "kaydetmeler": "saves",
               "saves": "saves", "paylaşım": "shares", "paylaşımlar": "shares", "shares": "shares",
               "açıklama": "caption", "description": "caption", "caption": "caption", "tür": "kind", "post type": "kind"}
    n = 0
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            d = {}
            for k, v in row.items():
                key = aliases.get((k or "").strip().lower())
                if key:
                    d[key] = v
            if not d.get("posted_at"):
                continue
            pa = media.parse_iso(d["posted_at"].replace("/", "-").replace(" ", "T", 1))
            if not pa:
                continue
            lo, hi = (pa - dt.timedelta(hours=12)).isoformat(), (pa + dt.timedelta(hours=12)).isoformat()
            post = con.execute("SELECT id FROM posts WHERE posted_at BETWEEN ? AND ? ORDER BY ABS(julianday(posted_at)-julianday(?)) LIMIT 1",
                               (lo, hi, pa.isoformat())).fetchone()
            nums = {k: int(float(d[k].replace(".", "").replace(",", "") or 0)) for k in ("reach", "likes", "comments", "saves", "shares") if d.get(k)}
            if post:
                if nums:
                    con.execute(f"UPDATE posts SET {', '.join(k + '=?' for k in nums)} WHERE id=?", [*nums.values(), post["id"]])
            else:
                db.upsert_post(con, {"platform": "instagram", "kind": (d.get("kind") or "post").lower(), "posted_at": pa.isoformat(),
                                     "caption": d.get("caption"), "media_path": None, **nums})
            n += 1
    con.commit()
    progress(f"{n} satır işlendi")
    return n
