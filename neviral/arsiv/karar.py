"""neviral karar motoru: bir öğe için NE yapmalı, NEDEN ve ne kadar KAZANDIRIR.

Puanı parçalarına ayırır (hangi sinyal kaç puan getirdi), paketin otomatik iyileştirmelerini simüle edip
"optimizasyon sonrası" puanı hesaplar, riskleri ve güven düzeyini söyler, tek paragraflık bir karar yazar (TR/DE/EN)."""
import datetime as dt

from . import algoritma, konu

LI = algoritma.LANG_IDX
VIDEO = ("ig_reels", "tiktok", "yt_shorts", "fb_reels")

NAME = {
    "hook": ("Açılış / dikkat", "Einstieg / Aufmerksamkeit", "Opening / attention"),
    "quality": ("Görüntü kalitesi", "Bildqualität", "Image quality"),
    "format": ("Format (en-boy)", "Format (Seitenverhältnis)", "Format (aspect ratio)"),
    "duration": ("Süre", "Länge", "Length"),
    "topic": ("Konu uyumu", "Themenpassung", "Topic fit"),
    "people": ("İnsan / yüz", "Menschen / Gesichter", "People / faces"),
    "novelty": ("Yenilik", "Neuheit", "Novelty"),
    "history": ("Kendi geçmişiniz", "Deine Historie", "Your history"),
}
GAIN = {
    "format": ("9:16 dikey dönüşüm (bulanık arka plan)", "Umwandlung in 9:16 (unscharfer Hintergrund)", "Convert to 9:16 (blurred background)"),
    "photo": ("Fotoğraftan hareketli Reel (Ken Burns + müzik)", "Foto → bewegtes Reel (Ken Burns + Musik)", "Photo → motion Reel (Ken Burns + music)"),
    "duration": ("En iyi {t} sn'nin kesilmesi", "Schnitt auf die besten {t} s", "Cut to the best {t} s"),
    "hook": ("İlk saniyede yazılı kanca + en iyi an", "Text-Hook in der 1. Sekunde + bester Moment", "Text hook in the first second + best moment"),
    "audio": ("Müzik eklenmesi (ses yok)", "Musik ergänzen (kein Ton)", "Add music (no audio)"),
    "quality": ("Otomatik renk/ışık/netlik düzeltmesi", "Auto-Korrektur Farbe/Licht/Schärfe", "Auto colour/light/sharpness fix"),
    "carousel": ("Aynı günün {n} fotoğrafıyla carousel", "Carousel aus {n} Fotos desselben Tages", "Carousel from {n} photos of the same day"),
}
RISK = {
    "hook": ("Zayıf açılış: ilk 3 saniyede hareket/netlik az — izleyici kaydırabilir",
             "Schwacher Einstieg: wenig Bewegung/Schärfe in den ersten 3 s — Zuschauer wischen weiter",
             "Weak opening: little motion/sharpness in the first 3 s — viewers may swipe"),
    "quality": ("Düşük görüntü kalitesi (bulanık/karanlık/soluk)", "Geringe Bildqualität (unscharf/dunkel/blass)", "Low image quality (blurry/dark/dull)"),
    "format": ("Yatay/kare: dikey akışta küçük görünür", "Quer/quadratisch: wirkt im Hochkant-Feed klein", "Landscape/square: looks small in vertical feeds"),
    "duration": ("Süre platform idealinin dışında", "Länge außerhalb des Plattform-Ideals", "Length outside the platform's ideal"),
    "topic": ("Konu platformda zayıf; metinle netleştirin", "Thema auf der Plattform schwach; mit Text schärfen", "Topic weak on this platform; sharpen with text"),
    "people": ("İnsan/yüz yok: duygusal bağ daha zayıf", "Keine Menschen/Gesichter: weniger emotionale Bindung", "No people/faces: weaker emotional pull"),
    "novelty": ("Daha önce paylaşıldı: 'throwback' olarak yeni kurgu gerekir", "Schon gepostet: braucht neuen Schnitt als „Throwback“", "Already posted: needs a fresh cut as a 'throwback'"),
    "history": ("Benzerleri sizde ortalamanın altında kaldı", "Ähnliches lief bei dir unter dem Schnitt", "Similar posts underperformed for you"),
    "lowres": ("Düşük çözünürlük", "Niedrige Auflösung", "Low resolution"),
    "offline": ("Orijinal bu Mac'te yok (iCloud): paket indirmeyi bekler", "Original nicht auf diesem Mac (iCloud): Paket wartet auf Download", "Original not on this Mac (iCloud): package waits for download"),
    "dup": ("Benzer bir kare zaten paylaşılmış", "Ein ähnliches Bild wurde schon gepostet", "A similar frame was already posted"),
}
LEVELS = [  # (eşik, anahtar, başlık, renk)
    (80, "simdi", ("Şimdi paylaş", "Jetzt posten", "Post now"), "#22c55e"),
    (65, "optimize", ("Optimizasyonla paylaş", "Mit Optimierung posten", "Post with optimisation"), "#84cc16"),
    (52, "guclu_kanca", ("Güçlü kanca ve seriyle dene", "Nur mit starkem Hook / als Serie", "Try with a strong hook / as a series"), "#f59e0b"),
    (0, "arsiv", ("Arşivde kalsın", "Besser im Archiv lassen", "Better keep in the archive"), "#94a3b8"),
]
CONF = (("düşük güven", "geringe Sicherheit", "low confidence"), ("orta güven", "mittlere Sicherheit", "medium confidence"),
        ("yüksek güven", "hohe Sicherheit", "high confidence"))
CONF_WHY = {
    "deep": ("video derin analiz edildi", "Video tief analysiert", "video deeply analysed"),
    "nodeep": ("video yalnızca küçük resimden değerlendirildi", "Video nur über das Vorschaubild bewertet", "video judged from the thumbnail only"),
    "apple": ("Apple estetik puanı var", "Apple-Ästhetikwert vorhanden", "Apple aesthetic score available"),
    "hist": ("{n} geçmiş paylaşımdan öğrenildi", "aus {n} eigenen Posts gelernt", "learned from {n} of your posts"),
    "nohist": ("Instagram istatistiği yok (CSV içe aktarın)", "keine Instagram-Statistik (CSV importieren)", "no Instagram stats (import the CSV)"),
    "persons": ("kişi etiketleri var", "Personen-Tags vorhanden", "people tags available"),
}
SEASON = ("{ad} {n} gün sonra: konu zamanında", "{ad} in {n} Tagen: Thema ist gerade dran", "{ad} in {n} days: topic is timely")
HIST_LINE = ("{konu} {tur} içerikleriniz ortalamanızın {x}× etkileşimini aldı", "Deine {konu}-{tur} holten {x}× deine übliche Interaktion",
             "Your {konu} {tur} earned {x}× your usual engagement")
KIND = {"foto": ("fotoğraf", "Fotos", "photos"), "video": ("video", "Videos", "videos")}

SUMMARY = (
    "{karar}. {platform} olarak {pazar} için {dil} dilinde{fmt}: puan {simdi} → optimizasyon sonrası {sonra} (arşivinizin ilk %{pct}). "
    "En güçlü yan: {top}. {risk}Önerilen stil: {stil}; kanca: „{kanca}“{zaman}.",
    "{karar}. Als {platform} für {pazar} auf {dil}{fmt}: {simdi} → {sonra} Punkte nach Optimierung (Top {pct} % deines Archivs). "
    "Stärkster Faktor: {top}. {risk}Empfohlener Stil: {stil}; Hook: „{kanca}“{zaman}.",
    "{karar}. As {platform} for {pazar} in {dil}{fmt}: {simdi} → {sonra} points after optimisation (top {pct}% of your archive). "
    "Strongest factor: {top}. {risk}Recommended style: {stil}; hook: “{kanca}”{zaman}.",
)
RISK_LEAD = ("Dikkat: {r}. ", "Achtung: {r}. ", "Watch out: {r}. ")
TIME_LEAD = ("; en iyi zaman {t}", "; beste Zeit {t}", "; best time {t}")
MARKET_DE = {"TR": "die Türkei", "DE": "Deutschland/DACH", "INT": "international"}  # Almanca cümle içinde doğal okunsun
LANG_NAME = {"tr": ("Türkçe", "Türkisch", "Turkish"), "de": ("Almanca", "Deutsch", "German"), "en": ("İngilizce", "Englisch", "English")}


def tops_of(v):
    """Kayıtlı konular + güvenleri (eski kayıtlarda güven yoksa 1.0)."""
    t = v.get("t") or ["gunluk"]
    c = v.get("tc") or []
    return [(k, float(c[i]) if i < len(c) else 1.0) for i, k in enumerate(t)]


def _level(score):
    for thr, key, title, color in LEVELS:
        if score >= thr:
            return key, title, color
    return LEVELS[-1][1:]


def _score(best, sig, item, tops):
    sc, _ = algoritma.score_platform(best, sig, item, tops)
    return sc + (3 if item.get("favorite") else 0) + (2 if item.get("edited") else 0)


def simulate(it, q, v, best=None):
    """Paketin otomatik iyileştirmelerini sırayla uygular; her adımın kazancını döndürür."""
    q = q or {}
    sig = dict(v.get("s") or {})
    tops = tops_of(v)
    best = best or v.get("best") or "ig_reels"
    item = dict(it)
    cur = _score(best, sig, item, tops)
    gains = []

    def step(key, fmt=None, **chg):
        nonlocal cur, item, sig
        item2, sig2 = dict(item), dict(sig)
        for k, val in chg.items():
            (sig2 if k in sig2 or k in ("hook", "quality") else item2)[k] = val
        new = _score(best, sig2, item2, tops)
        if new > cur + 0.05:
            gains.append({"key": key, "kazanc": round(new - cur, 1), "ad": GAIN[key]})
            if fmt:
                gains[-1]["fmt"] = fmt
            item, sig, cur = item2, sig2, new

    is_photo = it.get("kind") == "foto"
    if best in VIDEO and is_photo:  # fotoğraf 7 sn'lik 9:16 video olur (Ken Burns + müzik)
        step("photo", aspect="9:16", kind="video", duration=7.0)
    elif best in VIDEO and (it.get("aspect") or "") != "9:16":
        step("format", aspect="9:16")
    d = float(it.get("duration") or 0)
    hi = algoritma.PLATFORMS[best]["sure"][1]
    if not is_photo and d > hi + 1:
        step("duration", {"t": hi}, duration=float(hi))
    if not is_photo:
        if sig.get("hook", 0.5) < 0.62:
            step("hook", hook=max(sig.get("hook", 0.5), 0.62))
        if not it.get("has_audio"):
            step("audio", hook=min(1.0, sig.get("hook", 0.5) + 0.05))
    weak = q.get("sharp", 1) < 0.35 or q.get("color", 1) < 0.25 or (q.get("exposure", 1) < 0.45 and q.get("brightness", 125) < 90)
    if weak:
        step("quality", quality=min(1.0, sig.get("quality", 0.5) + 0.08))
    if is_photo and best == "ig_feed" and (v.get("seri") or 0) >= 3:
        step("carousel", {"n": v["seri"]}, hook=max(sig.get("hook", 0.5), 0.75))
    return round(min(100.0, cur), 1), gains


def decide(it, lang, st, learned=None, total=None, better=None, hook=None, style=None, time_text=None):
    """Karar sözlüğü: seviye, özet, katkılar, kazançlar, riskler, güven, alternatif platform, öneri."""
    li = LI.get(lang, 0)
    v = it.get("viral") or {}
    q = it.get("quality") or {}
    sig = dict(v.get("s") or {})
    best = v.get("best") or "ig_reels"
    tops = tops_of(v)
    now = float(it.get("viral_score") or 0)
    _, contrib = algoritma.score_platform(best, sig, it, tops)
    w = algoritma.PLATFORMS[best]["agirlik"]
    parts = sorted(({"key": k, "ad": NAME[k][li], "deger": contrib[k], "puan": round(100 * w[k] * contrib[k], 1), "max": round(100 * w[k], 1)}
                    for k in w), key=lambda x: -x["puan"])
    _, gains = simulate(it, q, v, best)
    after = round(min(100.0, now + sum(g["kazanc"] for g in gains)), 1)  # kazançlar mevcut puana eklenir
    level_key, level_title, color = _level(after)

    risks = [{"key": k, "ad": RISK[k][li]} for k in w if contrib.get(k, 1) < 0.45 and k in RISK]
    if it.get("posted_at") and not any(r["key"] == "novelty" for r in risks):
        risks.append({"key": "novelty", "ad": RISK["novelty"][li]})
    if v.get("dup"):
        risks.append({"key": "dup", "ad": RISK["dup"][li]})
    if min(it.get("width") or 0, it.get("height") or 0) and min(it.get("width") or 0, it.get("height") or 0) < 720:
        risks.append({"key": "lowres", "ad": RISK["lowres"][li]})
    if it.get("available") == 0:
        risks.append({"key": "offline", "ad": RISK["offline"][li]})

    conf, why = 0.35, []
    if it.get("kind") == "video":
        if q.get("hook") is not None:
            conf += 0.25; why.append(CONF_WHY["deep"][li])
        else:
            why.append(CONF_WHY["nodeep"][li])
    else:
        conf += 0.15
    if it.get("apple_score") is not None:
        conf += 0.15; why.append(CONF_WHY["apple"][li])
    n_hist = (learned or {}).get("n", 0)
    if (learned or {}).get("lift"):
        conf += 0.2; why.append(CONF_WHY["hist"][li].format(n=n_hist))
    else:
        why.append(CONF_WHY["nohist"][li])
    if it.get("persons"):
        conf += 0.05; why.append(CONF_WHY["persons"][li])
    conf = min(0.95, conf)
    conf_ad = CONF[2 if conf >= 0.7 else 1 if conf >= 0.5 else 0][li]

    hist_line = None
    lift = (learned or {}).get("lift") or {}
    if lift:
        from .viral import _features
        fs = _features(it, tops)
        x = 1.0
        for f in fs:
            x *= lift.get(f, 1.0)
        x = round(x ** (1 / len(fs)), 2)
        if abs(x - 1) >= 0.15:
            hist_line = HIST_LINE[li].format(konu=konu.topic_name(tops[0][0], lang), tur=KIND.get(it.get("kind"), KIND["foto"])[li], x=x)

    season = None
    if v.get("ev"):
        season = SEASON[li].format(ad=v["ev"].get("ad") or v["ev"].get("key"), n=v["ev"].get("gun"))

    plats = v.get("p") or {}
    alt = None
    if len(plats) > 1:
        k2 = sorted(plats, key=plats.get, reverse=True)[1]
        alt = {"key": k2, "ad": algoritma.platform_name(k2, lang), "fark": round(plats[best] - plats[k2], 1)}
    mk = v.get("m") or {}
    mb = v.get("mb") or (next(iter(mk)) if mk else "TR")
    dil = konu.MARKETS[mb][3]
    pct = round(100 * ((better or 0) + 1) / total, 1) if total else None
    fmt = ""
    if best in VIDEO:
        hi = algoritma.PLATFORMS[best]["sure"][1]
        d = float(it.get("duration") or 0)
        fmt = f" (9:16, {min(int(d), hi) if d else 7} s)"
    elif best == "ig_feed":
        fmt = " (4:5)"
    top_part = parts[0]["ad"] if parts else ""
    risk_txt = RISK_LEAD[li].format(r=risks[0]["ad"]) if risks else ""
    summary = SUMMARY[li].format(karar=level_title[li], platform=algoritma.platform_name(best, lang), pazar=MARKET_DE.get(mb, mb) if lang == "de" else konu.market_name(mb, lang),
                                 dil=LANG_NAME[dil][li], fmt=fmt, simdi=round(now), sonra=round(after), pct=pct if pct is not None else "–",
                                 top=top_part, risk=risk_txt, stil=style or "–", kanca=hook or "–",
                                 zaman=TIME_LEAD[li].format(t=time_text) if time_text else "")
    for g in gains:
        g["ad"] = g["ad"][li].format(**g.pop("fmt", {}))
    return {"seviye": level_key, "baslik": level_title[li], "renk": color, "ozet": summary,
            "simdi": round(now, 1), "sonra": round(after, 1), "katkilar": parts, "kazanclar": gains, "riskler": risks,
            "guven": {"puan": round(conf, 2), "ad": conf_ad, "neden": why}, "gecmis": hist_line, "mevsim": season, "alternatif": alt,
            "oneri": {"platform": best, "pazar": mb, "dil": dil, "stil": style, "kanca": hook, "zaman": time_text}}


def brief(it, lang):
    """Liste satırı için kısa karar: seviye + başlık + sonra-puanı (ucuz: tek simülasyon)."""
    li = LI.get(lang, 0)
    v = it.get("viral") or {}
    _, gains = simulate(it, it.get("quality") or {}, v)
    after = min(100.0, float(it.get("viral_score") or 0) + sum(g["kazanc"] for g in gains))
    key, title, color = _level(after)
    return {"seviye": key, "baslik": title[li], "renk": color, "sonra": round(after), "kazanc": round(sum(g["kazanc"] for g in gains), 1)}
