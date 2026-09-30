"""Pazarlama: açıklama (caption) ve hashtag üretimi, kanca cümleleri, en iyi paylaşım saatleri, içerik fikirleri.
Kural tabanlı çalışır; ANTHROPIC_API_KEY (ya da `ant auth login`) varsa açıklamayı Claude ile zenginleştirir."""
import datetime as dt
import os
import random
import re
from pathlib import Path

from . import db

HOOKS = [
    "{yil}'dan bugüne… bu anı hâlâ içimi ısıtıyor. 🤍",
    "Bunu ilk paylaştığımda takipçi sayım bugünkünün onda biriydi. Yeniden görmenizi istedim:",
    "Arşivden çıkan bir hazine: {konu}.",
    "Küçük bir an, büyük bir hikâye. {konu} ✨",
    "Bugün geçen yıl neredeydim? Cevap bu videoda 👇",
    "{konu} deyince aklıma hep bu geliyor.",
]
BODIES = [
    "Sonuna kadar izleyin; en güzel kısmı sonda. 🎬",
    "Sizce de yeniden paylaşmaya değer miydi? Yorumlarda buluşalım.",
    "Bu kareyi kaydedin, sonra tekrar bakmak isteyeceksiniz.",
    "Hikâyeyi bilmeyenler için: her şey burada başladı.",
]
CTAS = ["Beğendiysen kaydet ve bir arkadaşına gönder. 💌", "Devamı için takipte kal. 👉", "Yorumlara bekliyorum: sen ne düşünüyorsun?",
        "Profildeki linke göz at. 🔗"]
HASHTAG_SETS = {
    "genel": ["keşfet", "kesfet", "reels", "anılar", "arşivden", "hikaye"],
    "kitap": ["kitap", "kitapönerisi", "çocukkitabı", "okumakeyfi", "yazar", "kitapsever", "okuyorum", "kitapkurdu"],
    "cocuk": ["çocuk", "çocukgelişimi", "anne", "annelik", "aile", "ebeveyn", "okulöncesi", "nörofarklılık", "otizm", "dehb"],
    "aile": ["aile", "anılar", "birlikte", "hafızam", "bizimhikayemiz"],
    "motivasyon": ["motivasyon", "ilham", "başarı", "hedef", "kendinegüven"],
    "seyahat": ["seyahat", "gezi", "tatil", "doğa", "deniz", "yaz", "gezginler"],
    "video": ["video", "montaj", "hikaye", "throwback", "tbt", "eskiden", "eskidenşimdi"],
}
TOPIC_KEYS = {"kitap": "kitap", "book": "kitap", "çocuk": "cocuk", "cocuk": "cocuk", "okul": "cocuk", "aile": "aile", "family": "aile",
              "deniz": "seyahat", "tatil": "seyahat", "seyahat": "seyahat", "travel": "seyahat", "beach": "seyahat", "motivasyon": "motivasyon",
              "video": "video", "reel": "video", "story": "video"}


def topics_from_items(items):
    words = []
    for it in items or []:
        for k in ("albums", "keywords", "labels"):
            words += [str(x) for x in (it.get(k) or [])]
        if it.get("place"):
            words.append(str(it["place"]))
    seen, out = set(), []
    for w in words:
        wl = w.strip().lower()
        if wl and wl not in seen and not wl.isdigit():
            seen.add(wl)
            out.append(w.strip())
    return out


def hashtags(topics, n=14):
    sets = ["genel"]
    for t in topics:
        for key, s in TOPIC_KEYS.items():
            if key in t.lower() and s not in sets:
                sets.append(s)
    if len(sets) == 1:
        sets.append("video")
    tags = []
    for s in sets:
        tags += HASHTAG_SETS[s]
    for t in topics[:4]:
        clean = re.sub(r"[^\w]", "", t.replace(" ", ""))
        if clean and len(clean) > 2:
            tags.append(clean.lower())
    seen, out = set(), []
    for t in tags:
        if t not in seen:
            seen.add(t)
            out.append("#" + t)
    return out[:n]


def _year_span(items):
    years = sorted({int(i["year"]) for i in items if i.get("year")})
    if not years:
        return None, None
    return years[0], years[-1]


def rule_caption(brief, items, tone="samimi"):
    rng = random.Random(str(brief.get("baslik")) + str(len(items)))
    topics = topics_from_items(items)
    konu = brief.get("baslik") or (topics[0] if topics else "bu anlar")
    y0, y1 = _year_span(items)
    hook = rng.choice(HOOKS).format(yil=y0 or "eskiden", konu=konu)
    if y0 and y1 and y0 != y1:
        hook = hook.replace("bugüne", f"{y1}'e") if "bugüne" in hook else hook
    parts = [hook]
    if brief.get("altbaslik"):
        parts.append(brief["altbaslik"])
    parts.append(rng.choice(BODIES))
    parts.append(brief.get("cta") or rng.choice(CTAS))
    if brief.get("etiket"):
        parts.append(brief["etiket"])
    return "\n\n".join(parts) + "\n\n" + " ".join(hashtags(topics + ([brief.get("baslik")] if brief.get("baslik") else [])))


SYSTEM_PROMPT = """Sen bir Türkçe sosyal medya editörüsün. Instagram/TikTok için kısa, samimi ve doğal açıklamalar yazarsın.
Kurallar: ilk cümle güçlü bir kanca olsun; 2-4 kısa paragraf; sonda bir harekete çağrı; en sonda 10-15 alakalı Türkçe hashtag
(bir satırda). Abartılı reklam dili ve emoji bombardımanı yok (en çok 3 emoji). Yalnızca açıklama metnini döndür."""


def _claude_available():
    if os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"):
        return True
    return (Path.home() / ".config" / "anthropic").exists()


def claude_caption(brief, items, tone="samimi"):
    """Claude ile açıklama üretir; SDK yoksa / hata olursa None döndürür (kural tabanlı metne düşülür)."""
    if os.environ.get("ARSIV_NO_CLAUDE") or not _claude_available():
        return None
    try:
        import anthropic  # type: ignore
    except ImportError:
        return None
    topics = topics_from_items(items)
    y0, y1 = _year_span(items)
    desc = {
        "sablon": brief.get("sablon"), "baslik": brief.get("baslik"), "altbaslik": brief.get("altbaslik"), "cta": brief.get("cta"),
        "hesap": brief.get("etiket"), "ton": tone, "konular": topics[:12], "yillar": [y0, y1],
        "icerik": [{"tur": i.get("kind"), "yil": i.get("year"), "sure_sn": i.get("duration"), "yer": i.get("place"),
                    "kisiler": (i.get("persons") or [])[:3]} for i in items[:8]],
    }
    try:
        client = anthropic.Anthropic()
        resp = client.beta.messages.create(
            model="claude-opus-5-5",
            max_tokens=4000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": "Şu içerik için Instagram açıklaması yaz:\n" + repr(desc)}],
        )
        if resp.stop_reason == "refusal":
            return None
        text = "".join(b.text for b in resp.content if b.type == "text").strip()
        return text or None
    except Exception:
        return None


def caption(brief, items, tone="samimi", use_claude=True):
    text = claude_caption(brief, items, tone) if use_claude else None
    return text or rule_caption(brief, items, tone)


# ---------------------------------------------------------------- analiz
GUNLER = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]


def best_times(con):
    """Paylaşım performansından (reach/likes) hafta günü + saat önerisi. Veri yoksa varsayılanlar."""
    rows = con.execute("SELECT posted_at, reach, likes, comments, saves, kind, duration FROM posts WHERE posted_at IS NOT NULL").fetchall()
    scored = [r for r in rows if (r["reach"] or r["likes"])]
    if len(scored) < 5:
        return {"kaynak": "varsayilan", "not": "Yeterli performans verisi yok; Instagram Profesyonel Panel CSV'sini içe aktarın.",
                "saatler": [{"gun": d, "gun_adi": GUNLER[d], "saat": h, "puan": None} for d in (1, 3, 5) for h in (12, 19)]}
    buckets = {}
    for r in scored:
        t = dt.datetime.fromisoformat(r["posted_at"][:19])
        eng = (r["likes"] or 0) + 3 * (r["comments"] or 0) + 5 * (r["saves"] or 0)
        val = eng / (r["reach"] or 1) * 100 if r["reach"] else eng
        b = buckets.setdefault((t.weekday(), t.hour), [])
        b.append(val)
    ranked = sorted(((sum(v) / len(v), len(v), k) for k, v in buckets.items()), reverse=True)
    out = [{"gun": k[0], "gun_adi": GUNLER[k[0]], "saat": k[1], "puan": round(avg, 2), "ornek": n} for avg, n, k in ranked[:8]]
    durs = [r for r in scored if r["duration"]]
    dur_note = None
    if durs:
        best = max(durs, key=lambda r: (r["likes"] or 0) + (r["reach"] or 0) / 50)
        dur_note = f"En iyi performanslı video süresi ~{int(best['duration'])} sn"
    return {"kaynak": "analiz", "saatler": out, "sure_notu": dur_note, "ornek_sayisi": len(scored)}


def ideas(con, n=6):
    """Arşive bakarak içerik fikirleri üretir."""
    from . import score
    out = []
    otd = score.on_this_day(con, limit=5)
    if otd:
        out.append({"baslik": "Bugün geçen yıl", "aciklama": f"{len(otd)} uygun öğe var; hikâye olarak paylaş.", "sablon": "montaj",
                    "ogeler": [i["id"] for i in otd[:5]]})
    yatay = db.search(con, kind="video", orientation="yatay", posted=False, min_score=40, min_dur=5, limit=5)["items"]
    if yatay:
        out.append({"baslik": "Yatay videoları dikeye çevir", "aciklama": f"{len(yatay)}+ yatay video bulanık arka planla Reel olabilir.",
                    "sablon": "yeniden", "ogeler": [yatay[0]["id"]]})
    years = [r["year"] for r in con.execute("SELECT DISTINCT year FROM items WHERE year IS NOT NULL ORDER BY year")]
    if len(years) >= 3:
        old = db.search(con, year=years[0], min_score=50, limit=1)["items"]
        new = db.search(con, year=years[-1], min_score=50, limit=1)["items"]
        if old and new:
            out.append({"baslik": f"Eskiden ({years[0]}) / Şimdi ({years[-1]})", "aciklama": "Aynı konuda iki dönem: üst-alt karşılaştırma.",
                        "sablon": "eskiden-simdi", "ogeler": [old[0]["id"], new[0]["id"]]})
    fav = db.search(con, favorite=True, posted=False, kind="foto", limit=6)["items"]
    if len(fav) >= 3:
        out.append({"baslik": "Favorilerden carousel", "aciklama": f"{len(fav)} favori fotoğraf, 4:5 kaydırmalı gönderi.",
                    "sablon": "carousel", "ogeler": [i["id"] for i in fav[:6]]})
    top = db.search(con, kind="video", posted=False, min_score=65, limit=3)["items"]
    if top:
        out.append({"baslik": "Hiç paylaşılmamış en güçlü video", "aciklama": ", ".join(top[0].get("score_reasons") or []) or "Yüksek puan.",
                    "sablon": "tekli", "ogeler": [top[0]["id"]]})
    q = score.reshare_queue(con, limit=3)
    if q:
        out.append({"baslik": "Yeniden paylaşım zamanı", "aciklama": "; ".join(q[0].get("gerekce") or [])[:140], "sablon": "yeniden",
                    "ogeler": [q[0]["id"]]})
    return out[:n]
