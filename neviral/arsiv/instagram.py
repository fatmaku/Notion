"""Instagram 'Bilgilerini indir' (JSON) dışa aktarımını okur; eski paylaşımları arşivdeki öğelerle eşler.

Instagram > Ayarlar > Hesap Merkezi > Bilgilerin ve izinlerin > Bilgilerini indir > JSON formatı.
Dışa aktarım klasörü içinde posts_1.json, reels.json, stories.json, igtv_videos.json vb. dosyalar aranır.
"""
import datetime as dt
import json
import re
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
    try:
        if import_account_insights(con, root, progress):
            res["hesap_ozeti"] = True
    except Exception as ex:
        progress(f"  ! kitle özeti: {ex}")
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
# Anahtarlar dışa aktarım diline göre gelir; alt dize eşleşmesi ("„Gefällt mir“-Angaben" gibi tırnaklı başlıklar dahil).
INSIGHT_KEYS = {
    "reach": ("accounts reached", "reach", "erreichte konten", "reichweite", "erişilen hesap", "erişim", "ulaşılan hesap"),
    "views": ("impressionen", "impressions", "plays", "wiedergaben", "gösterim", "izlenme", "views"),
    "likes": ("likes", "gefällt mir", "beğeni", "reaktionen", "reactions", "tepki"),
    "comments": ("comments", "kommentare", "yorum", "antworten", "replies", "yanıt"),
    "shares": ("shares", "geteilt", "paylaşım", "paylaşıl"),
    "saves": ("saves", "gespeichert", "kaydet", "saved"),
    "follows": ("neue follower", "new follows", "follows", "yeni takipçi", "takip"),
}
NOT_PER_POST = ("delta", "insgesamt", "prozent", "zeitraum", "aktivität", "nach follower", "im vergleich")


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


def _insight_file(jf, want=None):
    """Dosya bir istatistik dosyası mı? Klasör/ad 'insights' içerir ya da üst anahtar 'organic_insights_…' ile başlar.
    want: 'audience' | 'interactions' | 'media' (gönderi/reel/hikâye/canlı) süzgeci."""
    name = jf.name.lower()
    try:
        with jf.open("r", encoding="utf-8") as fh:
            head = fh.read(160)
    except (OSError, UnicodeDecodeError):
        return False
    m = re.search(r'"organic_insights_(\w+)"', head)
    key = m.group(1) if m else None
    if not key and "insights" not in str(jf.parent).lower() and "insights" not in name:
        return False
    kind = key or name
    if want == "audience":
        return "audience" in kind or "kitle" in kind
    if want == "interactions":
        return "interaction" in kind or "etkile" in kind
    return not any(x in kind for x in ("audience", "interaction", "kitle", "etkile"))


def _insight_kind(name):
    n = name.lower()
    return "reel" if "reel" in n else "story" if "stor" in n else "live" if "live" in n else "post"


def parse_insights(root):
    """[{posted_at, kind, uri, caption, reach, views, likes, comments, shares, saves, follows}] — dosya adından tür."""
    root = Path(root).expanduser()
    rows = []
    for jf in sorted(root.rglob("*.json")):
        if not _insight_file(jf, "media"):
            continue
        try:
            data = json.loads(jf.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            continue
        kind = _insight_kind(jf.name)
        found = []
        _insight_rows(data, found)
        for n in found:
            try:
                row = _insight_row(n, kind)
            except Exception:  # tek bozuk kayıt (ms zaman damgası, liste yerine sözlük…) tüm istatistiği düşürmesin
                row = None
            if row:
                rows.append(row)
    return rows


def _insight_row(n, kind):
    smd = {_fix_mojibake(str(k)).lower(): v for k, v in n["string_map_data"].items()}
    ts, uri, caption = None, None, None
    for k, v in smd.items():
        if isinstance(v, dict) and v.get("timestamp") and any(x in k for x in ("timestamp", "zeitstempel", "zaman", "startzeit", "start time")):
            ts = int(v["timestamp"]); break
    mmd = n.get("media_map_data")
    for m in (mmd.values() if isinstance(mmd, dict) else []):
        if isinstance(m, dict):
            uri = m.get("uri") if isinstance(m.get("uri"), str) else uri
            caption = _fix_mojibake(m.get("title")) if isinstance(m.get("title"), str) else caption
            if not ts and m.get("creation_timestamp"):
                ts = int(m["creation_timestamp"])
    if not ts:
        return None
    if ts > 10 ** 11:  # milisaniye
        ts //= 1000
    row = {"posted_at": dt.datetime.fromtimestamp(ts).replace(microsecond=0).isoformat(), "kind": kind, "uri": uri, "caption": caption or None}
    for k, v in smd.items():
        if any(x in k for x in NOT_PER_POST):
            continue
        for col, names in INSIGHT_KEYS.items():
            if col not in row and any(nm in k for nm in names):
                num = _insight_num(v)
                if num is not None:
                    row[col] = num
                break
    return row if any(c in row for c in INSIGHT_KEYS) else None


def _like_suffix(base):
    """'%/<dosya adı>' için LIKE deseni; _ ve % joker sayılmasın."""
    esc = base.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return "%/" + esc


def _find_post(con, r):
    """İstatistik satırını mevcut paylaşıma bağla. Dönüş: (satır, 'dosya'|'tarih') ya da (None, None).
    - Medya adı varsa yalnızca dosya adıyla eşleşir (yol ayracına sabitlenmiş, joker kaçışlı); bulunamazsa YENİ satır açılır —
      tarih tahmini aynı gün çekilmiş başka bir hikâyenin/gönderinin sayılarını ezerdi.
    - Medya adı yoksa (CSV benzeri kayıt) aynı türde ±12 saat içindeki en yakın paylaşım; hikâye/canlı için tarih tahmini yok."""
    uri = str(r.get("uri") or "")
    if uri and not uri.startswith(("http://", "https://")):
        base = Path(uri).name
        if base:
            p = con.execute("SELECT id FROM posts WHERE media_path LIKE ? ESCAPE '\\' OR media_path=? ORDER BY id LIMIT 1",
                            (_like_suffix(base), base)).fetchone()
            return (p, "dosya") if p else (None, None)
        return None, None
    if r["kind"] in ("story", "live"):  # uzak (http) küçük resim ya da ad yok: hikâye/canlı için tarih tahmini güvenilmez
        return None, None
    pa = dt.datetime.fromisoformat(r["posted_at"])
    lo, hi = (pa - dt.timedelta(hours=12)).isoformat(), (pa + dt.timedelta(hours=12)).isoformat()
    p = con.execute("SELECT id FROM posts WHERE posted_at BETWEEN ? AND ? AND COALESCE(kind,'post')=? "
                    "ORDER BY ABS(julianday(posted_at)-julianday(?)) LIMIT 1", (lo, hi, r["kind"], r["posted_at"])).fetchone()
    return (p, "tarih") if p else (None, None)


def import_insights_export(con, root, progress=print):
    """Dışa aktarımdaki istatistikleri (varsa) paylaşımlara bağlar; CSV gerekmez. Dönüş: işlenen satır sayısı."""
    rows = parse_insights(root)
    if not rows:
        return 0
    n = 0
    for r in rows:
        nums = {k: r[k] for k in INSIGHT_KEYS if k in r}
        post, how = _find_post(con, r)
        if post:
            sets = dict(nums)
            cur = con.execute("SELECT caption FROM posts WHERE id=?", (post["id"],)).fetchone()[0] or ""
            if how == "dosya" and r.get("caption") and len(r["caption"]) > len(cur):
                sets["caption"] = r["caption"]  # istatistik dosyasındaki açıklama daha eksiksizse (hashtag'ler dahil) onu kullan
            if sets:
                con.execute(f"UPDATE posts SET {', '.join(k + '=?' for k in sets)} WHERE id=?", [*sets.values(), post["id"]])
        else:
            db.upsert_post(con, {"platform": "instagram", "kind": r["kind"], "posted_at": r["posted_at"], "caption": r.get("caption"),
                                 "media_path": r.get("uri"), **nums})
        n += 1
    con.commit()
    progress(f"{n} paylaşımın istatistiği dışa aktarımdan okundu (erişim/beğeni/kaydetme/paylaşım)")
    return n


# ---- hesap düzeyinde: kitle (ülke/yaş/cinsiyet) ve içerik etkileşim özeti
def _pct_map(text):
    """'Deutschland: 84,5%, Schweiz: 5,1%' → {'deutschland': 84.5, ...}"""
    out = {}
    for part in re.split(r",\s+(?=[^:,]+:)", str(text or "")):  # ondalık virgül ('84,5%') ayraç değildir
        if ":" not in part:
            continue
        k, v = part.rsplit(":", 1)
        v = v.strip().replace("%", "").replace(",", ".")
        try:
            out[k.strip().lower()] = float(v)
        except ValueError:
            pass
    return out


DACH = ("deutschland", "germany", "almanya", "österreich", "austria", "avusturya", "schweiz", "switzerland", "isviçre", "isvicre")
TR_NAMES = ("türkei", "türkiye", "turkey", "turkiye")


def _smd_find(smd, *needles):
    for k, v in smd.items():
        if all(nd in k for nd in needles):
            return v.get("value") if isinstance(v, dict) else v
    return None


def parse_audience(root):
    """audience_insights.json → {takipci, donem, delta, ulke: {...}, kitle: {TR, DE, INT}, kadin, erkek, yas: {...}, gun_aktivite: {...}}"""
    root = Path(root).expanduser()
    for jf in root.rglob("*.json"):
        if not _insight_file(jf, "audience"):
            continue
        try:
            data = json.loads(jf.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            continue
        found = []
        _insight_rows(data, found)
        for n in found:
            smd = {_fix_mojibake(str(k)).lower(): v for k, v in n["string_map_data"].items()}
            country = _pct_map(_fix_mojibake(_smd_find(smd, "land") or _smd_find(smd, "country") or _smd_find(smd, "ülke")))
            if not country:
                continue
            de = sum(v for k, v in country.items() if k in DACH)
            tr = sum(v for k, v in country.items() if k in TR_NAMES)
            rest = max(0.0, 100 - de - tr)
            ages = _pct_map(_smd_find(smd, "alter", "alle") or _smd_find(smd, "age", "all") or _smd_find(smd, "yaş", "tüm"))
            days = {}
            for k, v in smd.items():
                if ("aktivität am" in k or "activity on" in k or "aktivite" in k) and isinstance(v, dict):
                    days[k.split(" am ")[-1].split(" on ")[-1].strip()] = _insight_num(v)
            out = {"takipci": _insight_num(_smd_find(smd, "follower") if "followers" not in smd else smd.get("followers")),
                   "donem": _smd_find(smd, "zeitraum") or _smd_find(smd, "period") or _smd_find(smd, "dönem"),
                   "delta": _smd_find(smd, "delta", "follower") or _smd_find(smd, "delta", "takip"),
                   "yeni": _insight_num(_smd_find(smd, "neue follower") or _smd_find(smd, "new followers") or _smd_find(smd, "yeni takip")),
                   "kayip": _insight_num(_smd_find(smd, "verlorene") or _smd_find(smd, "lost") or _smd_find(smd, "kaybedilen")),
                   "ulke": country, "kitle": {"TR": round(tr, 1), "DE": round(de, 1), "INT": round(rest, 1)},
                   "kadin": _pct_map("x: " + str(_smd_find(smd, "weiblich", "insgesamt") or _smd_find(smd, "women", "total") or _smd_find(smd, "kadın", "toplam") or "")).get("x"),
                   "erkek": _pct_map("x: " + str(_smd_find(smd, "männlich", "insgesamt") or _smd_find(smd, "men", "total") or _smd_find(smd, "erkek", "toplam") or "")).get("x"),
                   "yas": ages, "gun_aktivite": days}
            # "Follower" anahtarı birçok satırla çakışır: tam eşleşen sayıyı tercih et
            for k, v in smd.items():
                if k in ("follower", "followers", "takipçi", "takipçiler"):
                    out["takipci"] = _insight_num(v)
            return out
    return None


def parse_interactions(root):
    """content_interactions.json → {toplam, reels, gonderi, hikaye, takipci_disi_pct, delta_toplam, reel_paylasim, ...}"""
    root = Path(root).expanduser()
    for jf in root.rglob("*.json"):
        if not _insight_file(jf, "interactions"):
            continue
        try:
            data = json.loads(jf.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            continue
        found = []
        _insight_rows(data, found)
        for n in found:
            smd = {_fix_mojibake(str(k)).lower(): v for k, v in n["string_map_data"].items()}
            tot = _insight_num(_smd_find(smd, "content-interaktionen") or _smd_find(smd, "content interactions") or _smd_find(smd, "içerik etkileşim"))
            if tot is None:
                continue
            def g(*alts):
                for a in alts:
                    v = _smd_find(smd, *a) if isinstance(a, tuple) else _smd_find(smd, a)
                    if v not in (None, ""):
                        return _insight_num(v)
                return None
            nf = _smd_find(smd, "follower-status") or _smd_find(smd, "follower status") or _smd_find(smd, "takipçi durumu")
            nfp = _pct_map(nf)
            out = {"toplam": tot, "donem": _smd_find(smd, "zeitraum") or _smd_find(smd, "period"),
                   "delta_toplam": _smd_find(smd, "delta", "content") or _smd_find(smd, "delta", "içerik"),
                   "reels": g("reels-interaktionen", "reel interactions", "reels etkileşim"),
                   "gonderi": g("beitragsinteraktionen", "post interactions", "gönderi etkileşim"),
                   "hikaye": g("story-interaktionen", "story interactions", "hikaye etkileşim"),
                   "reel_begeni": g(("gefällt mir", "reels"), ("likes", "reel"), ("beğeni", "reel")), "reel_paylasim": g("geteilte reels", "reel shares", "paylaşılan reel"),
                   "reel_kaydet": g("gespeicherte reels", "reel saves", "kaydedilen reel"),
                   "gonderi_begeni": g(("gefällt mir", "beitrag"), ("likes", "post"), ("beğeni", "gönderi")), "gonderi_paylasim": g("geteilte beiträge", "post shares", "paylaşılan gönderi"),
                   "gonderi_kaydet": g("gespeicherte beiträge", "post saves", "kaydedilen gönderi"),
                   "takipci_disi_pct": next((v for k, v in nfp.items() if "nicht" in k or "non" in k or "olmayan" in k), None)}
            return out
    return None


def import_account_insights(con, root, progress=print):
    """Kitle ülke dağılımını kitle ayarına yazar (TR/DE/INT) ve hesap özetini kaydeder; UI 'Hesap özeti' olarak gösterir."""
    aud = parse_audience(root)
    inter = parse_interactions(root)
    if not aud and not inter:
        return None
    summary = {"kitle": aud, "etkilesim": inter, "guncelleme": db.now()}
    if aud and aud.get("kitle") and sum(aud["kitle"].values()) > 0:
        db.set_setting(con, "kitle", json.dumps(aud["kitle"]))
        progress(f"kitle ayarı Instagram'dan alındı: TR {aud['kitle']['TR']}% · DACH {aud['kitle']['DE']}% · diğer {aud['kitle']['INT']}%")
    db.set_setting(con, "hesap_ozeti", json.dumps(summary, ensure_ascii=False))
    return summary


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
