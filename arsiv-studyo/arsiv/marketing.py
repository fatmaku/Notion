"""Pazarlama: açıklama (caption) ve hashtag üretimi, kanca cümleleri, en iyi paylaşım saatleri, içerik fikirleri.
Kural tabanlı çalışır; ANTHROPIC_API_KEY (ya da `ant auth login`) varsa açıklamayı Claude ile zenginleştirir."""
import datetime as dt
import os
import random
import re
from pathlib import Path

from . import db, i18n

TEXTS = {
    "tr": {
        "hooks": [
            "{yil}'dan bugüne… bu anı hâlâ içimi ısıtıyor. 🤍",
            "Bunu ilk paylaştığımda takipçi sayım bugünkünün onda biriydi. Yeniden görmenizi istedim:",
            "Arşivden çıkan bir hazine: {konu}.",
            "Küçük bir an, büyük bir hikâye. {konu} ✨",
            "Bugün geçen yıl neredeydim? Cevap bu videoda 👇",
            "{konu} deyince aklıma hep bu geliyor.",
        ],
        "bodies": [
            "Sonuna kadar izleyin; en güzel kısmı sonda. 🎬",
            "Sizce de yeniden paylaşmaya değer miydi? Yorumlarda buluşalım.",
            "Bu kareyi kaydedin, sonra tekrar bakmak isteyeceksiniz.",
            "Hikâyeyi bilmeyenler için: her şey burada başladı.",
        ],
        "ctas": ["Beğendiysen kaydet ve bir arkadaşına gönder. 💌", "Devamı için takipte kal. 👉",
                 "Yorumlara bekliyorum: sen ne düşünüyorsun?", "Profildeki linke göz at. 🔗"],
        "default_topic": "bu anlar",
        "tags": {
            "genel": ["keşfet", "kesfet", "reels", "anılar", "arşivden", "hikaye"],
            "kitap": ["kitap", "kitapönerisi", "çocukkitabı", "okumakeyfi", "yazar", "kitapsever", "okuyorum", "kitapkurdu"],
            "cocuk": ["çocuk", "çocukgelişimi", "anne", "annelik", "aile", "ebeveyn", "okulöncesi", "nörofarklılık", "otizm", "dehb"],
            "aile": ["aile", "anılar", "birlikte", "hafızam", "bizimhikayemiz"],
            "motivasyon": ["motivasyon", "ilham", "başarı", "hedef", "kendinegüven"],
            "seyahat": ["seyahat", "gezi", "tatil", "doğa", "deniz", "yaz", "gezginler"],
            "video": ["video", "montaj", "hikaye", "throwback", "tbt", "eskiden", "eskidenşimdi"],
        },
    },
    "de": {
        "hooks": [
            "Von {yil} bis heute … dieser Moment wärmt mich immer noch. 🤍",
            "Als ich das zum ersten Mal gepostet habe, hatte ich ein Zehntel der Follower von heute. Ihr sollt es nochmal sehen:",
            "Ein Schatz aus dem Archiv: {konu}.",
            "Ein kleiner Moment, eine große Geschichte. {konu} ✨",
            "Wo war ich heute vor einem Jahr? Die Antwort steckt in diesem Video 👇",
            "Bei {konu} denke ich immer an das hier.",
        ],
        "bodies": [
            "Bis zum Ende schauen – das Beste kommt zum Schluss. 🎬",
            "War das einen Repost wert? Sagt es mir in den Kommentaren.",
            "Speichert euch das – ihr wollt es später nochmal sehen.",
            "Für alle, die die Geschichte nicht kennen: Hier hat alles angefangen.",
        ],
        "ctas": ["Wenn es dir gefällt: speichern und einer Freundin schicken. 💌", "Folge mir für mehr. 👉",
                 "Was denkst du? Ab in die Kommentare.", "Link im Profil. 🔗"],
        "default_topic": "diese Momente",
        "tags": {
            "genel": ["entdecken", "reels", "erinnerungen", "ausdemarchiv", "story"],
            "kitap": ["buch", "buchtipp", "kinderbuch", "lesen", "autorin", "bücherliebe", "leseempfehlung"],
            "cocuk": ["kinder", "kindheit", "mama", "mamaleben", "familie", "eltern", "neurodivers", "autismus", "adhs"],
            "aile": ["familie", "erinnerungen", "zusammen", "unseregeschichte"],
            "motivasyon": ["motivation", "inspiration", "erfolg", "ziele", "selbstvertrauen"],
            "seyahat": ["reisen", "urlaub", "natur", "meer", "sommer", "reiselust"],
            "video": ["video", "throwback", "tbt", "damalsundheute", "flashback"],
        },
    },
    "en": {
        "hooks": [
            "From {yil} to today… this moment still warms my heart. 🤍",
            "When I first posted this I had a tenth of today's followers. I wanted you to see it again:",
            "A treasure from the archive: {konu}.",
            "A small moment, a big story. {konu} ✨",
            "Where was I a year ago today? The answer is in this video 👇",
            "Whenever I think of {konu}, this comes to mind.",
        ],
        "bodies": [
            "Watch until the end; the best part is last. 🎬",
            "Was it worth reposting? Let's talk in the comments.",
            "Save this one, you'll want to come back to it.",
            "For those who don't know the story: this is where it all began.",
        ],
        "ctas": ["If you liked it, save it and send it to a friend. 💌", "Follow for more. 👉",
                 "What do you think? Tell me in the comments.", "Link in bio. 🔗"],
        "default_topic": "these moments",
        "tags": {
            "genel": ["explore", "reels", "memories", "fromthearchive", "story"],
            "kitap": ["book", "bookrecommendation", "childrensbook", "reading", "author", "booklover", "bookstagram"],
            "cocuk": ["kids", "childhood", "mom", "momlife", "family", "parenting", "neurodivergent", "autism", "adhd"],
            "aile": ["family", "memories", "together", "ourstory"],
            "motivasyon": ["motivation", "inspiration", "success", "goals", "confidence"],
            "seyahat": ["travel", "vacation", "nature", "sea", "summer", "wanderlust"],
            "video": ["video", "throwback", "tbt", "thenandnow", "flashback"],
        },
    },
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


def hashtags(topics, n=14, lang="tr"):
    sets_src = TEXTS[i18n.norm(lang)]["tags"]
    sets = ["genel"]
    for t in topics:
        for key, s in TOPIC_KEYS.items():
            if key in t.lower() and s not in sets:
                sets.append(s)
    if len(sets) == 1:
        sets.append("video")
    tags = []
    for s in sets:
        tags += sets_src[s]
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


def rule_caption(brief, items, tone="samimi", lang="tr"):
    lang = i18n.norm(lang)
    tx = TEXTS[lang]
    rng = random.Random(str(brief.get("baslik")) + str(len(items)))
    topics = topics_from_items(items)
    konu = brief.get("baslik") or (topics[0] if topics else tx["default_topic"])
    y0, y1 = _year_span(items)
    hook = rng.choice(tx["hooks"]).format(yil=y0 or {"tr": "eskiden", "de": "damals", "en": "back then"}[lang], konu=konu)
    parts = [hook]
    if brief.get("altbaslik"):
        parts.append(brief["altbaslik"])
    parts.append(rng.choice(tx["bodies"]))
    parts.append(brief.get("cta") or rng.choice(tx["ctas"]))
    if brief.get("etiket"):
        parts.append(brief["etiket"])
    return "\n\n".join(parts) + "\n\n" + " ".join(hashtags(topics + ([brief.get("baslik")] if brief.get("baslik") else []), lang=lang))


LANG_NAMES = {"tr": "Türkçe", "de": "Almanca (Deutsch)", "en": "İngilizce (English)"}
SYSTEM_PROMPT = """Sen bir sosyal medya editörüsün. Açıklamayı {dil} dilinde yazarsın. Instagram/TikTok için kısa, samimi ve doğal açıklamalar yazarsın.
Kurallar: ilk cümle güçlü bir kanca olsun; 2-4 kısa paragraf; sonda bir harekete çağrı; en sonda 10-15 alakalı {dil} hashtag
(bir satırda). Abartılı reklam dili ve emoji bombardımanı yok (en çok 3 emoji). Yalnızca açıklama metnini döndür."""


def _claude_available():
    if os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"):
        return True
    return (Path.home() / ".config" / "anthropic").exists()


def claude_caption(brief, items, tone="samimi", lang="tr"):
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
            system=SYSTEM_PROMPT.format(dil=LANG_NAMES[i18n.norm(lang)]),
            messages=[{"role": "user", "content": "Şu içerik için Instagram açıklaması yaz:\n" + repr(desc)}],
        )
        if resp.stop_reason == "refusal":
            return None
        text = "".join(b.text for b in resp.content if b.type == "text").strip()
        return text or None
    except Exception:
        return None


def caption(brief, items, tone="samimi", use_claude=True, lang="tr"):
    text = claude_caption(brief, items, tone, lang) if use_claude else None
    return text or rule_caption(brief, items, tone, lang)


# ---------------------------------------------------------------- analiz
def best_times(con, lang=None):
    """Paylaşım performansından (reach/likes) hafta günü + saat önerisi. Veri yoksa varsayılanlar."""
    lang = lang or i18n.lang_of(con)
    GUNLER = i18n.days(lang)
    rows = con.execute("SELECT posted_at, reach, likes, comments, saves, kind, duration FROM posts WHERE posted_at IS NOT NULL").fetchall()
    scored = [r for r in rows if (r["reach"] or r["likes"])]
    if len(scored) < 5:
        return {"kaynak": "varsayilan", "not": i18n.t(lang, "Yeterli performans verisi yok; Instagram Profesyonel Panel CSV'sini içe aktarın."),
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
        dur_note = i18n.t(lang, "En iyi performanslı video süresi ~{n} sn", n=int(best['duration']))
    return {"kaynak": "analiz", "saatler": out, "sure_notu": dur_note, "ornek_sayisi": len(scored)}


def ideas(con, n=8, lang=None):
    """Arşive bakarak içerik fikirleri üretir."""
    from . import score
    lang = lang or i18n.lang_of(con)
    T = lambda k, **kw: i18n.t(lang, k, **kw)  # noqa: E731
    out = []
    otd = score.on_this_day(con, limit=5)
    if otd:
        out.append({"baslik": T("Bugün geçen yıl"), "aciklama": T("{n} uygun öğe var; hikâye olarak paylaş.", n=len(otd)), "sablon": "montaj",
                    "ogeler": [i["id"] for i in otd[:5]]})
    yatay = db.search(con, kind="video", orientation="yatay", posted=False, min_score=40, min_dur=5, limit=5, with_total=False)["items"]
    if yatay:
        out.append({"baslik": T("Yatay videoları dikeye çevir"), "aciklama": T("{n}+ yatay video bulanık arka planla Reel olabilir.", n=len(yatay)),
                    "sablon": "yeniden", "ogeler": [yatay[0]["id"]]})
    years = [r["year"] for r in con.execute("SELECT DISTINCT year FROM items WHERE year IS NOT NULL ORDER BY year")]
    if len(years) >= 3:
        old = db.search(con, year=years[0], min_score=50, limit=1, with_total=False)["items"]
        new = db.search(con, year=years[-1], min_score=50, limit=1, with_total=False)["items"]
        if old and new:
            out.append({"baslik": T("Eskiden ({a}) / Şimdi ({b})", a=years[0], b=years[-1]), "aciklama": T("Aynı konuda iki dönem: üst-alt karşılaştırma."),
                        "sablon": "eskiden-simdi", "ogeler": [old[0]["id"], new[0]["id"]]})
    fav = db.search(con, favorite=True, posted=False, kind="foto", limit=6, with_total=False)["items"]
    if len(fav) >= 3:
        out.append({"baslik": T("Favorilerden carousel"), "aciklama": T("{n} favori fotoğraf, 4:5 kaydırmalı gönderi.", n=len(fav)),
                    "sablon": "carousel", "ogeler": [i["id"] for i in fav[:6]]})
    top = db.search(con, kind="video", posted=False, min_score=65, limit=3, with_total=False)["items"]
    if top:
        out.append({"baslik": T("Hiç paylaşılmamış en güçlü video"), "aciklama": ", ".join(T(x) for x in (top[0].get("score_reasons") or [])) or T("Yüksek puan."),
                    "sablon": "tekli", "ogeler": [top[0]["id"]]})
    # Yıl özeti: geçen yılın (Aralık'tan itibaren bu yılın) en iyi 10 anı
    today = dt.date.today()
    yr = today.year if today.month >= 12 else today.year - 1
    best = db.search(con, year=yr, sort="score", limit=10, with_total=False)["items"]
    if len(best) >= 4:
        out.append({"baslik": T("{y} yılının en iyileri", y=yr), "aciklama": T("{n} en yüksek puanlı an: tek tıkla yıl özeti montajı.", n=len(best)),
                    "sablon": "montaj", "ogeler": [i["id"] for i in best]})
    q = score.reshare_queue(con, limit=3, lang=lang)
    if q:
        out.append({"baslik": T("Yeniden paylaşım zamanı"), "aciklama": "; ".join(q[0].get("gerekce") or [])[:140], "sablon": "yeniden",
                    "ogeler": [q[0]["id"]]})
    return out[:n]
