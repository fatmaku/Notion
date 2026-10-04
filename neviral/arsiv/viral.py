"""neviral: tüm arşivin viral potansiyel analizi, sıralama ve tek tıkla paylaşım paketi."""
import datetime as dt
import json
import math
import os
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import algoritma, config, db, i18n, kalite, konu, media, yazi

DEFAULT_AUDIENCE = {"TR": 0.5, "DE": 0.35, "INT": 0.15}


# ---------------------------------------------------------------- ayarlar
def settings(con):
    try:
        aud = json.loads(db.get_setting(con, "kitle", "") or "{}")
    except ValueError:
        aud = {}
    aud = {k: float(aud.get(k, v)) for k, v in DEFAULT_AUDIENCE.items()}
    tot = sum(aud.values()) or 1
    return {"kitle": {k: round(v / tot, 3) for k, v in aud.items()}, "saat_dilimi": db.get_setting(con, "saat_dilimi", "Europe/Berlin"),
            "hesap": db.get_setting(con, "hesap", "") or "", "dil": i18n.lang_of(con)}


def save_settings(con, kitle=None, saat_dilimi=None, hesap=None):
    if kitle:
        clean = {k: max(0.0, float(kitle.get(k, 0))) for k in DEFAULT_AUDIENCE}
        db.set_setting(con, "kitle", json.dumps(clean))
    if saat_dilimi:
        try:
            from zoneinfo import ZoneInfo
            ZoneInfo(saat_dilimi)
            db.set_setting(con, "saat_dilimi", saat_dilimi)
        except Exception:
            pass
    if hesap is not None:
        db.set_setting(con, "hesap", str(hesap).strip()[:60])
    return settings(con)


# ---------------------------------------------------------------- geçmişten öğrenme
def _features(item, tops):
    a = item.get("aspect") or ""
    orient = "v" if a in ("9:16", "4:5", "3:4", "2:3") else ("s" if a == "1:1" else "h")
    d = float(item.get("duration") or 0)
    dur = "foto" if item.get("kind") == "foto" else ("<15" if d < 15 else "15-35" if d < 35 else "35-90" if d < 90 else "90+")
    return [f"tur:{item.get('kind')}", f"yon:{orient}", f"sure:{dur}", f"konu:{tops[0][0] if tops else 'gunluk'}",
            f"kisi:{1 if item.get('persons') else 0}"]


def learn(con):
    """Geçmiş paylaşımların etkileşiminden özellik başına kaldıraç (lift). Yeterli veri yoksa boş."""
    rows = con.execute("""SELECT p.likes, p.reach, p.comments, p.saves, p.shares, i.* FROM posts p JOIN items i ON i.id=p.item_id
                          WHERE (p.likes IS NOT NULL OR p.reach IS NOT NULL) AND (p.matched_by IS NULL OR p.matched_by<>'tarih?')""").fetchall()
    data = []
    for r in rows:
        eng = (r["likes"] or 0) + 3 * (r["comments"] or 0) + 5 * (r["saves"] or 0) + 6 * (r["shares"] or 0)
        rate = eng / r["reach"] if r["reach"] else eng
        it = db.row_to_item(r)
        data.append((rate, _features(it, konu.topics(it))))
    if len(data) < 8:
        return {"n": len(data), "lift": {}}
    rates = sorted(x for x, _ in data)
    med = rates[len(rates) // 2] or (sum(rates) / len(rates)) or 1
    by = {}
    for rate, feats in data:
        for f in feats:
            by.setdefault(f, []).append(min(5.0, rate / med))
    lift = {}
    for f, v in by.items():
        n = len(v)
        mean = sum(v) / n
        lift[f] = round((n * mean + 5 * 1.0) / (n + 5), 3)  # az örnekte 1'e doğru büzülür
    return {"n": len(data), "lift": lift}


def history_signal(item, tops, learned):
    lift = learned.get("lift") or {}
    if not lift:
        return 0.5
    vals = [lift.get(f, 1.0) for f in _features(item, tops)]
    g = math.exp(sum(math.log(max(0.2, v)) for v in vals) / len(vals))
    return max(0.05, min(1.0, 0.5 * g))


# ---------------------------------------------------------------- puanlama
def signals(item, q, tops, learned, year_now, dup_posted=False):
    q = q or {}
    apple = item.get("apple_score")
    base_q = q.get("quality")
    if base_q is None:
        m = min(item.get("width") or 0, item.get("height") or 0)
        base_q = 0.65 if m >= 1080 else 0.5 if m >= 720 else 0.35
    if q.get("vsharp") is not None:
        base_q = 0.7 * base_q + 0.3 * q["vsharp"]
    quality = 0.75 * base_q + 0.25 * float(apple) if apple is not None else base_q
    if item.get("kind") == "video":
        hook = q.get("hook")
        if hook is None:
            hook = 0.42 + 0.08 * bool(item.get("has_audio")) + 0.08 * bool(item.get("persons"))
        hook = 0.8 * hook + 0.2 * q.get("pace", 0.4)
    else:
        hook = 0.45 * q.get("color", 0.45) + 0.3 * q.get("contrast", 0.5) + 0.25 * q.get("focus", 0.5)
    people = 1.0 if item.get("persons") else (0.75 if any(k == "cocuk" and c >= 0.7 for k, c in tops) else 0.4)
    if item.get("posted_at"):
        try:
            days = (dt.datetime.now() - dt.datetime.fromisoformat(item["posted_at"][:19])).days
        except ValueError:
            days = 0
        novelty = 0.55 if days >= 365 else 0.35 if days >= 180 else 0.15
    else:
        novelty = 1.0
    if dup_posted:
        novelty *= 0.6
    return {"quality": quality, "hook": hook, "people": people, "novelty": novelty,
            "history": history_signal(item, tops, learned), "nostalgia": konu.nostalgia(item, year_now)}


def score_item(item, q, audience, learned, year_now, dup_posted=False):
    tops = konu.topics(item)
    s = signals(item, q, tops, learned, year_now, dup_posted)
    plats = {}
    for key in algoritma.PLATFORMS:
        if key == "ig_feed" and item.get("kind") == "video":
            continue  # Instagram'da paylaşılan her video artık Reel olarak dağıtılır
        plats[key], _ = algoritma.score_platform(key, s, item, tops)
    best = max(plats, key=plats.get)
    score = plats[best] + (3 if item.get("favorite") else 0) + (2 if item.get("edited") else 0)
    if item.get("available") == 0 and not item.get("thumb"):
        score -= 5  # içeriği görülemiyor
    mk = konu.markets(item, audience, tops)
    return round(max(0.0, min(100.0, score)), 1), {
        "p": plats, "best": best, "m": mk, "mb": next(iter(mk)), "t": [k for k, _ in tops[:3]], "nost": round(s["nostalgia"], 2),
        "s": {k: round(v, 3) for k, v in s.items()}}


def _metrics_job(row):
    thumb = row["thumb"]
    try:
        return row["id"], kalite.image_metrics(thumb) if thumb and Path(thumb).exists() else None
    except Exception:
        return row["id"], None


def analyze(con, progress=print, force=False, deep_videos=300):
    """1) küçük resimlerden kalite  2) en umutlu videolarda kanca analizi  3) tüm arşivi yeniden puanla."""
    t0 = time.time()
    where = "" if force else "WHERE quality IS NULL"
    rows = con.execute(f"SELECT id, thumb FROM items {where}").fetchall()
    progress(f"1/3 görsel kalite: {len(rows)} öğe")
    done, batch = 0, []
    with ThreadPoolExecutor(max_workers=max(2, min(8, os.cpu_count() or 4))) as ex:
        for iid, q in ex.map(_metrics_job, rows, chunksize=64):
            batch.append((json.dumps(q or {}), iid))
            done += 1
            if len(batch) >= 500:
                con.executemany("UPDATE items SET quality=? WHERE id=?", batch); con.commit(); batch = []
            if done % 5000 == 0:
                progress(f"   {done}/{len(rows)}")
    if batch:
        con.executemany("UPDATE items SET quality=? WHERE id=?", batch); con.commit()
    rescore(con, progress=lambda *_: None)  # derin analiz adaylarını seçmek için ön puan
    vids = con.execute("""SELECT id, path, duration, quality FROM items WHERE kind='video' AND path IS NOT NULL AND available=1 AND hidden=0
                          AND (quality IS NULL OR quality NOT LIKE '%"hook"%') ORDER BY viral_score DESC LIMIT ?""", (int(deep_videos),)).fetchall()
    progress(f"2/3 video kanca analizi (ilk saniyeler): {len(vids)} video")
    for k, r in enumerate(vids, 1):
        try:
            p = Path(r["path"])
            if not p.exists() or media.is_dataless(p.stat()):
                continue
            q = json.loads(r["quality"] or "{}")
            q.update(kalite.video_metrics(p, r["duration"]))
            con.execute("UPDATE items SET quality=? WHERE id=?", (json.dumps(q), r["id"]))
            if k % 20 == 0:
                con.commit(); progress(f"   {k}/{len(vids)}")
        except Exception as e:
            progress(f"   ! {r['id']}: {e}")
    con.commit()
    n = rescore(con, progress)
    progress(f"Bitti: {n} öğe puanlandı ({time.time() - t0:.0f} sn)")
    return {"puanlanan": n, "kalite": len(rows), "video_analiz": len(vids)}


def rescore(con, progress=print):
    st = settings(con)
    learned = learn(con)
    if learned["lift"]:
        progress(f"3/3 geçmiş {learned['n']} paylaşımın performansından öğrenildi")
    year_now = dt.date.today().year
    posted_hashes = {r[0] for r in con.execute("SELECT dhash FROM items WHERE posted_at IS NOT NULL AND dhash IS NOT NULL")}
    progress("3/3 puanlama")
    batch, n = [], 0
    for r in con.execute("SELECT * FROM items").fetchall():
        it = db.row_to_item(r)
        try:
            q = json.loads(r["quality"] or "{}")
        except (TypeError, ValueError):
            q = {}
        dup = bool(it.get("dhash") and not it.get("posted_at") and it["dhash"] in posted_hashes)
        sc, info = score_item(it, q, st["kitle"], learned, year_now, dup)
        batch.append((sc, json.dumps(info, separators=(",", ":")), db.now(), it["id"]))
        n += 1
        if len(batch) >= 1000:
            con.executemany("UPDATE items SET viral_score=?, viral=?, analyzed_at=? WHERE id=?", batch); con.commit(); batch = []
    if batch:
        con.executemany("UPDATE items SET viral_score=?, viral=?, analyzed_at=? WHERE id=?", batch)
    con.commit()
    return n


# ---------------------------------------------------------------- liste
REASON = {
    "hook": ("Güçlü açılış (ilk saniyeler)", "Starker Einstieg (erste Sekunden)", "Strong opening (first seconds)"),
    "quality": ("Yüksek görüntü kalitesi", "Hohe Bildqualität", "High image quality"),
    "format": ("Platform için ideal format", "Ideales Format für die Plattform", "Ideal format for the platform"),
    "duration": ("İdeal süre", "Ideale Länge", "Ideal length"),
    "topic": ("Platformda sevilen konu", "Beliebtes Thema auf der Plattform", "Popular topic on the platform"),
    "people": ("İnsan/yüz içeriyor", "Zeigt Menschen/Gesichter", "Shows people/faces"),
    "novelty": ("Hiç paylaşılmamış (yeni)", "Noch nie gepostet (neu)", "Never posted (fresh)"),
    "history": ("Geçmiş paylaşımlarınızda benzerleri iyi çalıştı", "Ähnliches lief bei Ihnen gut", "Similar posts performed well for you"),
    "nostalgia": ("Nostalji / eskiden-şimdi potansiyeli", "Nostalgie / Damals-heute-Potenzial", "Nostalgia / then-and-now potential"),
}


def present(con, it, lang, st=None, total=None, detail=False):
    st = st or settings(con)
    li = algoritma.LANG_IDX.get(lang, 0)
    v = it.get("viral") or {}
    q = it.get("quality") or {}
    best = v.get("best") or "ig_reels"
    sig = dict(v.get("s") or {})
    tops = [(k, 1.0) for k in v.get("t") or ["gunluk"]]
    _, contrib = algoritma.score_platform(best, sig, it, tops)
    if sig.get("nostalgia", 0) > 0.5:
        contrib["nostalgia"] = sig["nostalgia"]
    photo_hook = ("Göz alıcı: kaydırmayı durdurur", "Blickfang: stoppt das Scrollen", "Eye-catching: stops the scroll")
    reasons = [(photo_hook[li] if (k == "hook" and it.get("kind") == "foto") else REASON[k][li])
               for k, val in sorted(contrib.items(), key=lambda kv: -kv[1]) if val >= 0.7 and k in REASON][:4]
    mk = v.get("m") or {}
    out = {
        "viral_score": it.get("viral_score"), "platformlar": [{"key": k, "ad": algoritma.platform_name(k, lang), "puan": s}
                                                            for k, s in sorted((v.get("p") or {}).items(), key=lambda kv: -kv[1])],
        "en_iyi": {"key": best, "ad": algoritma.platform_name(best, lang)},
        "pazarlar": [{"key": k, "ad": konu.market_name(k, lang), "bayrak": konu.MARKETS[k][4], "dil": konu.MARKETS[k][3], "pay": p}
                     for k, p in mk.items()],
        "konular": [{"key": k, "ad": konu.topic_name(k, lang)} for k in v.get("t") or []],
        "nedenler": reasons, "iyilestirmeler": algoritma.improvements(it, q, lang, best),
    }
    if total:
        better = con.execute("SELECT COUNT(*) FROM items WHERE hidden=0 AND viral_score > ?", (it.get("viral_score") or 0,)).fetchone()[0]
        out["yuzdelik"] = round(100 * (better + 1) / total, 1)
    mb = v.get("mb") or "TR"
    times = algoritma.best_times(best, mb, st["saat_dilimi"], days=3)
    if times:
        out["zaman"] = {"kullanici": times[0][0].isoformat(timespec="minutes"), "yerel": times[0][1], "pazar": mb}
    if detail:
        tops2 = konu.topics(it)
        out["metinler"] = yazi.rule_captions(it, tops2, sig.get("nostalgia", 0), st["hesap"])
        out["sinyaller"] = {k: algoritma.platform_signal(k, lang) for k in algoritma.PLATFORMS}
        out["kalite"] = q
    return out


def rank(con, lang="tr", platform=None, kind=None, market=None, topic=None, posted=None, min_score=None, q=None, limit=50, offset=0,
         source=None):
    where, args = ["hidden=0", "viral_score IS NOT NULL"], []
    if source == "harici":
        where.append("source='harici'")
    if kind:
        where.append("kind=?"); args.append(kind)
    if market in konu.MARKETS:
        where.append("json_extract(viral,'$.mb')=?"); args.append(market)
    if topic in konu.TOPICS:
        where.append("viral LIKE ?"); args.append(f'%"t":[%"{topic}"%')
    if posted is True:
        where.append("posted_at IS NOT NULL")
    elif posted is False:
        where.append("posted_at IS NULL")
    if min_score is not None:
        where.append("viral_score>=?"); args.append(float(min_score))
    if q:
        where.append("id IN (SELECT rowid FROM items_fts WHERE items_fts MATCH ?)"); args.append(db.fts_query(q))
    order = "viral_score DESC"
    if platform in algoritma.PLATFORMS:
        order = f"json_extract(viral,'$.p.{platform}') DESC"
    sw = " AND ".join(where)
    total_all = con.execute("SELECT COUNT(*) FROM items WHERE hidden=0 AND viral_score IS NOT NULL").fetchone()[0]
    total = con.execute(f"SELECT COUNT(*) FROM items WHERE {sw}", args).fetchone()[0]
    rows = con.execute(f"SELECT * FROM items WHERE {sw} ORDER BY {order}, id LIMIT ? OFFSET ?", args + [int(limit), int(offset)]).fetchall()
    st = settings(con)
    items = []
    for r in rows:
        it = db.row_to_item(r)
        it["neviral"] = present(con, it, lang, st, total_all)
        items.append(it)
    return {"items": items, "total": total, "analiz_edilen": total_all,
            "analiz_bekleyen": con.execute("SELECT COUNT(*) FROM items WHERE viral_score IS NULL").fetchone()[0]}


# ---------------------------------------------------------------- paket
def _enhance_photo(src, out, q, size=(1080, 1350)):
    from PIL import ImageEnhance, ImageOps
    img = media.open_image(src).convert("RGB")
    img = ImageOps.fit(img, size, centering=(0.5, 0.45))
    bright = (q or {}).get("brightness", 125)
    img = ImageEnhance.Brightness(img).enhance(max(0.92, min(1.25, 1 + (118 - bright) / 255 * 0.8)))
    img = ImageEnhance.Contrast(img).enhance(1.08 if (q or {}).get("contrast", 0.5) < 0.35 else 1.03)
    img = ImageEnhance.Color(img).enhance(1.15 if (q or {}).get("color", 0.5) < 0.35 else 1.06)
    img = ImageEnhance.Sharpness(img).enhance(1.35 if (q or {}).get("sharp", 0.5) < 0.45 else 1.12)
    img.save(out, "JPEG", quality=94, optimize=True)
    return out


VIDEO_PLATFORMS = ("ig_reels", "tiktok", "yt_shorts", "fb_reels")


def package(con, item_id, platforms=None, langs=None, progress=print, use_claude=True, opts=None):
    """Tek tıkla: platforma uygun video (+ akış görseli), 3 dilde metinler, en iyi saat, hatırlatıcı.
    opts: format ('9:16'|'4:5'|'1:1'), sure (sn ya da None=otomatik), muzik ('auto'|'yok'|'sakin'|'enerjik'|'duygusal'),
          hook (ekrandaki yazı; boş = otomatik), iyilestir (bool), hatirlat (bool)"""
    opts = dict(opts or {})
    from . import studio
    it = db.get_item(con, int(item_id))
    if not it:
        raise ValueError("öğe yok")
    if not it.get("viral"):
        rescore(con, lambda *_: None)
        it = db.get_item(con, int(item_id))
    st = settings(con)
    v = it["viral"]
    platforms = [p for p in (platforms or list(v["p"])) if p in v["p"]] or [v["best"]]
    langs = [l for l in (langs or list(yazi.LANGS)) if l in yazi.LANGS] or ["tr"]
    tops = konu.topics(it)
    nost = konu.nostalgia(it, dt.date.today().year)
    progress(i18n.t(st["dil"], "metinler hazırlanıyor") + (" (Claude)" if use_claude and yazi.claude_available() else ""))
    ai = yazi.claude_captions(it, tops, nost, st["hesap"]) if use_claude else None
    texts = ai["metinler"] if ai else yazi.rule_captions(it, tops, nost, st["hesap"])
    mb = (ai or {}).get("en_iyi_pazar") or v["mb"]
    main_lang = konu.MARKETS[mb][3] if konu.MARKETS[mb][3] in langs else langs[0]
    hook = str(opts.get("hook") or "").strip()[:60] or texts[main_lang][v["best"] if v["best"] in texts[main_lang] else "ig_reels"]["hook"]
    from . import metin, tasarim
    stil = opts.get("stil") if (opts.get("stil") in tasarim.STYLES or opts.get("stil") == "klasik") else tasarim.style_for([k for k, _ in tops])
    alt_hooks = [x["text"] for x in metin.variants(it, [k for k, _ in tops], main_lang, nost, n=4) if x["text"] != hook]
    vids = [p for p in platforms if p in VIDEO_PLATFORMS]
    res = {"klasor": None, "output": None, "cover": None}
    if vids:
        length = min(algoritma.PLATFORMS[p]["sure"][1] for p in vids)
        try:
            if opts.get("sure"):
                length = max(3, min(float(opts["sure"]), max(algoritma.PLATFORMS[p]["sure"][2] for p in vids)))
        except (TypeError, ValueError):
            pass
        fmt = opts.get("format") if opts.get("format") in ("9:16", "4:5", "1:1") else "9:16"
        mood = "enerjik" if any(k in ("hayvan", "kutlama", "yemek") for k, _ in tops[:1]) else "sakin"
        music = opts.get("muzik") or "auto"
        if music == "auto":
            music = "yok" if (it["kind"] == "video" and it.get("has_audio")) else mood
        enhance = opts.get("iyilestir", True) is not False
        brief = {"sablon": "tekli", "format": fmt, "baslik": hook[:60], "altbaslik": "", "cta": "", "etiket": st["hesap"],
                 "ogeler": [{"id": it["id"], "sure": min(7, length) if it["kind"] == "foto" else length}], "max_sure": length,
                 "muzik": music, "kalite": "yuksek", "iyilestir": enhance, "dil": main_lang, "stil": stil}
        progress(i18n.t(st["dil"], "video üretiliyor ({f}, en çok {n} sn)", f=fmt, n=int(length)) + f" · {stil}")
        res = studio.render(con, brief, progress=progress)
        if opts.get("ab") and alt_hooks:  # A/B: aynı video, farklı kanca (Instagram'ın deneme/test özelliği için)
            progress("A/B: B varyantı")
            res_b = studio.render(con, dict(brief, baslik=alt_hooks[0][:60]), progress=lambda *_: None)
            b_path = Path(res["klasor"]) / ("B-" + Path(res_b["output"]).name)
            Path(res_b["output"]).replace(b_path)
            res["ab"] = {"A": {"hook": hook, "dosya": res["output"]}, "B": {"hook": alt_hooks[0], "dosya": str(b_path)}}
    out_dir = Path(res["klasor"]) if res.get("klasor") else studio._out_dir("neviral-" + (it.get("filename") or str(it["id"])))
    files = [res["output"]] if res.get("output") else []
    if res.get("ab"):
        files.append(res["ab"]["B"]["dosya"])
    try:
        (out_dir / "aciklama.txt").unlink()  # tek dilli eski açıklama; yerine aciklamalar.txt
    except OSError:
        pass
    if "ig_feed" in platforms or not vids:
        src = it.get("path")
        if it["kind"] == "foto" and src:
            from . import photos_mac
            src = photos_mac.ensure_local(con, it, progress)
            files.append(str(_enhance_photo(src, out_dir / "instagram-4x5.jpg", it.get("quality"))))
        elif res.get("cover"):
            files.append(res["cover"])
    times = {}
    for p in platforms:
        ts = algoritma.best_times(p, mb, st["saat_dilimi"], days=4)[:3]
        times[p] = [{"kullanici": t.isoformat(timespec="minutes"), "yerel": loc} for t, loc in ts]
    pkg = {"uygulama": "neviral", "oge": it["id"], "dosya": it.get("filename"), "viral_puan": it.get("viral_score"),
           "platform_puanlari": v["p"], "en_iyi_platform": v["best"], "pazarlar": v["m"], "en_iyi_pazar": mb, "ana_dil": main_lang,
           "konular": [k for k, _ in tops], "kaynak": "claude" if ai else "kural", "aciklama": (ai or {}).get("aciklama"),
           "stil": stil, "kanca": hook, "ab_test": res.get("ab"),
           "kanca_varyantlari": {l: (texts[l].get("_varyantlar") if isinstance(texts.get(l), dict) else None) for l in langs},
           "zamanlar": times, "metinler": {l: {p: texts[l][p] for p in platforms if p in texts[l]} for l in langs}, "dosyalar": files}
    (out_dir / "paket.json").write_text(json.dumps(pkg, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = [f"neviral · {it.get('filename')} · {it.get('viral_score')}/100 · {stil}", ""]
    if res.get("ab"):
        lines += [f"A/B: A = {res['ab']['A']['hook']}  |  B = {res['ab']['B']['hook']}", ""]
    for p in platforms:
        lines.append("=" * 60)
        lines.append(f"{algoritma.platform_name(p, main_lang)} · {v['p'].get(p)}/100")
        if times.get(p):
            lines.append("⏰ " + ", ".join(f"{t['kullanici'].replace('T', ' ')} ({mb} {t['yerel']})" for t in times[p]))
        for l in langs:
            tx = texts[l][p]
            lines += ["", f"[{l.upper()}] {tx['title'] if p == 'yt_shorts' else tx['hook']}", tx["caption"]]
        lines.append("")
    (out_dir / "aciklamalar.txt").write_text("\n".join(lines), encoding="utf-8")
    cap = texts[main_lang][v["best"]]["caption"] if v["best"] in texts[main_lang] else texts[main_lang][platforms[0]]["caption"]
    rid = db.add_render(con, "neviral", {"baslik": hook, "platformlar": platforms, "diller": langs}, [it["id"]])
    db.set_render(con, rid, output=res.get("output") or str(out_dir), cover=res.get("cover") or (files[-1] if files else None),
                  caption=cap, status="hazir", duration=res.get("duration"))
    first = times.get(v["best"] if v["best"] in times else platforms[0]) or []
    if first and opts.get("hatirlat", True) is not False:
        db.add_reminder(con, first[0]["kullanici"], f"neviral · {algoritma.platform_name(v['best'] if v['best'] in times else platforms[0], main_lang)}: {it.get('filename')}",
                        note=hook, item_ids=[it["id"]], render_id=rid)
    progress(i18n.t(st["dil"], "Paket hazır") + f": {out_dir}")
    return {"klasor": str(out_dir), "render_id": rid, "dosyalar": files, "kaynak": pkg["kaynak"], "en_iyi_pazar": mb}


def top_packages(con, n=10, platforms=None, langs=None, progress=print, use_claude=True, opts=None):
    rows = con.execute("SELECT id FROM items WHERE hidden=0 AND posted_at IS NULL AND viral_score IS NOT NULL ORDER BY viral_score DESC LIMIT ?",
                       (int(n),)).fetchall()
    out = []
    for k, r in enumerate(rows, 1):
        progress(f"[{k}/{len(rows)}] öğe #{r['id']}")
        try:
            out.append(package(con, r["id"], platforms, langs, progress, use_claude, opts))
        except Exception as e:
            progress(f"  ! #{r['id']}: {e}")
    return out


# ---------------------------------------------------------------- dışarıdan yüklenen dosya
def ingest_external(con, path):
    """Dışarıdan gelen (yüklenen) dosyayı arşive 'harici' kaynağıyla ekler, hemen analiz edip puanlar."""
    from . import scan
    path = Path(path)
    st_ = path.stat()
    item = scan.analyze_file(path, st_, path.parent, "harici")
    iid, _ = db.upsert_item(con, item)
    q = {}
    try:
        if item.get("thumb"):
            q = kalite.image_metrics(item["thumb"])
        if item["kind"] == "video":
            q.update(kalite.video_metrics(path, item.get("duration")))
    except Exception:
        pass
    con.execute("UPDATE items SET quality=? WHERE id=?", (json.dumps(q), iid))
    it = db.get_item(con, iid)
    stg = settings(con)
    sc, info = score_item(it, q, stg["kitle"], learn(con), dt.date.today().year)
    con.execute("UPDATE items SET viral_score=?, viral=?, analyzed_at=? WHERE id=?", (sc, json.dumps(info, separators=(",", ":")), db.now(), iid))
    con.commit()
    return iid


def compare(con, item_id, lang="tr", hook=None, size=(360, 640)):
    """Tasarım karşılaştırması: her stil için önizleme + okunurluk puanı + konuya uygunluk; kanca varyantları."""
    import hashlib
    from . import metin, tasarim
    it = db.get_item(con, int(item_id))
    if not it:
        raise ValueError("öğe yok")
    tops = konu.topics(it)
    keys = [k for k, _ in tops]
    nost = konu.nostalgia(it, dt.date.today().year)
    var = {l: metin.variants(it, keys, l, nost, n=6) for l in yazi.LANGS}
    hook = (hook or (var[lang][0]["text"] if var[lang] else "neviral")).strip()[:60]
    src = it.get("thumb") if it.get("kind") == "video" else (it.get("path") or it.get("thumb"))
    if it.get("kind") == "video" and it.get("path") and Path(it["path"]).exists():
        src, kind = it["path"], "video"
    else:
        kind = "foto"
    rec = tasarim.style_for(keys)
    out_dir = config.CACHE / "stil"
    out_dir.mkdir(parents=True, exist_ok=True)
    h = hashlib.sha1(hook.encode()).hexdigest()[:10]
    styles = []
    accent = None
    for s in tasarim.style_list(lang):
        name = f"{it['id']}-{s['key']}-{h}.jpg"
        f = out_dir / name
        img, leg, accent = tasarim.preview(src, kind, hook, s["key"], accent, W=size[0], H=size[1], at=1.0)
        img.save(f, quality=85)
        fit = 12 if s["key"] == rec else 0
        styles.append({**s, "url": f"/api/viral/onizleme/{name}", "okunurluk": leg, "puan": round(min(100, leg * 0.85 + fit + 8), 1),
                       "onerilen": s["key"] == rec})
    best = max(styles, key=lambda x: x["puan"])["key"]
    for s in styles:
        s["en_iyi"] = s["key"] == best
    return {"kanca": hook, "kancalar": var, "stiller": styles, "onerilen_stil": rec, "en_iyi_stil": best}
