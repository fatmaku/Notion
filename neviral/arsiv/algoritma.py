"""Platform algoritmaları için kural kitabı (2025-2026'da platformların kendi açıklamalarına ve yaygın ölçümlere dayalı).
Viral potansiyel bir TAHMİNDİR: içerik sinyallerini platformların ödüllendirdiği şeylerle eşleştirir; garanti değildir."""

# Her sinyal 0..1; ağırlıkların toplamı 1.
PLATFORMS = {
    "ig_reels": {
        "ad": ("Instagram Reels", "Instagram Reels", "Instagram Reels"),
        "agirlik": {"hook": 0.20, "quality": 0.17, "format": 0.14, "duration": 0.11, "topic": 0.13, "people": 0.09, "novelty": 0.08, "history": 0.08},
        "oran": {"9:16": 1.0, "4:5": 0.65, "3:4": 0.6, "1:1": 0.5, "2:3": 0.6, "16:9": 0.3, "4:3": 0.35, "3:2": 0.35},
        "sure": (7, 30, 90),  # ideal alt, ideal üst, kabul edilebilir üst (sn)
        "foto": 0.72,         # fotoğraftan hareketli Reel üretilebilir (Ken Burns + müzik)
        "konu": {"kitap": 0.9, "cocuk": 0.85, "okul": 0.7, "seyahat": 1.0, "kutlama": 0.85, "hayvan": 0.95, "yemek": 0.9, "sahne": 0.7, "gunluk": 0.6},
        "sinyal": ("DM ile gönderim (paylaşım) ve izlenme süresi en güçlü sinyaller; orijinal içerik öne çıkarılır, başka uygulamaların filigranı "
                   "ve yeniden yüklenen içerik geri itilir; ilk 3 saniye kanca belirler; 3-5 alakalı hashtag yeterli; takipçi olmayanlara "
                   "'Deneme Reels' ile test edilir.",
                   "DM-Weiterleitungen (Shares) und Wiedergabezeit sind die stärksten Signale; Originalinhalte werden bevorzugt, Wasserzeichen "
                   "anderer Apps und Reuploads werden abgewertet; die ersten 3 Sekunden entscheiden; 3–5 passende Hashtags genügen; "
                   "„Test-Reels“ erreichen zuerst Nicht-Follower.",
                   "Sends via DM (shares) and watch time are the strongest signals; original content is boosted, other apps' watermarks and "
                   "reuploads are demoted; the first 3 seconds decide; 3-5 relevant hashtags are enough; 'Trial Reels' are tested on non-followers first."),
    },
    "ig_feed": {
        "ad": ("Instagram gönderi / carousel", "Instagram-Beitrag / Carousel", "Instagram post / carousel"),
        "agirlik": {"hook": 0.10, "quality": 0.26, "format": 0.14, "duration": 0.04, "topic": 0.14, "people": 0.10, "novelty": 0.10, "history": 0.12},
        "oran": {"4:5": 1.0, "3:4": 0.95, "1:1": 0.85, "2:3": 0.8, "9:16": 0.6, "16:9": 0.45, "4:3": 0.6, "3:2": 0.55},
        "sure": (3, 60, 90),
        "foto": 1.0,
        "konu": {"kitap": 1.0, "cocuk": 0.85, "okul": 0.75, "seyahat": 0.95, "kutlama": 0.8, "hayvan": 0.85, "yemek": 0.85, "sahne": 0.7, "gunluk": 0.6},
        "sinyal": ("Kaydetme ve paylaşım ağırlıklı; carousel'ler etkileşim almazsa ikinci slaytla yeniden gösterilir; 4:5 veya 3:4 dikey kare "
                   "akışta en çok alan kaplar; açıklamadaki anahtar kelimeler aramada bulunmayı sağlar.",
                   "Speichern und Teilen zählen am meisten; Carousels werden mit der zweiten Folie erneut ausgespielt; 4:5 oder 3:4 nimmt im "
                   "Feed den meisten Platz ein; Schlüsselwörter in der Beschreibung helfen bei der Suche.",
                   "Saves and shares weigh most; carousels get re-shown with the second slide; 4:5 or 3:4 takes the most feed space; keywords "
                   "in the caption help search."),
    },
    "tiktok": {
        "ad": ("TikTok", "TikTok", "TikTok"),
        "agirlik": {"hook": 0.24, "quality": 0.10, "format": 0.15, "duration": 0.15, "topic": 0.14, "people": 0.08, "novelty": 0.08, "history": 0.06},
        "oran": {"9:16": 1.0, "4:5": 0.55, "3:4": 0.5, "1:1": 0.45, "16:9": 0.25, "4:3": 0.3, "3:2": 0.3, "2:3": 0.5},
        "sure": (12, 35, 60),
        "foto": 0.62,
        "konu": {"kitap": 1.0, "cocuk": 0.75, "okul": 0.7, "seyahat": 0.85, "kutlama": 0.8, "hayvan": 1.0, "yemek": 0.95, "sahne": 0.75, "gunluk": 0.75},
        "sinyal": ("Tamamlanma oranı, tekrar izleme, paylaşım ve yorum belirleyici; takipçi sayısından bağımsız 'Sana Özel' akışında test "
                   "edilir; ekranda yazı ve altyazı izlenmeyi artırır; açıklamadaki anahtar kelimeler TikTok aramasında (TikTok SEO) önemli; "
                   "BookTok/KitapTok kitap içeriği için çok güçlü bir topluluk.",
                   "Abschlussrate, erneutes Ansehen, Teilen und Kommentare entscheiden; Tests in „Für dich“ unabhängig von der Followerzahl; "
                   "Text und Untertitel im Bild erhöhen die Wiedergabe; Schlüsselwörter sind für die TikTok-Suche wichtig; BookTok ist für "
                   "Buchinhalte eine sehr starke Community.",
                   "Completion rate, rewatches, shares and comments decide; tested in For You regardless of follower count; on-screen text and "
                   "captions raise watch time; keywords matter for TikTok search; BookTok is a very strong community for book content."),
    },
    "yt_shorts": {
        "ad": ("YouTube Shorts", "YouTube Shorts", "YouTube Shorts"),
        "agirlik": {"hook": 0.22, "quality": 0.14, "format": 0.15, "duration": 0.13, "topic": 0.12, "people": 0.06, "novelty": 0.10, "history": 0.08},
        "oran": {"9:16": 1.0, "4:5": 0.45, "1:1": 0.45, "3:4": 0.45, "16:9": 0.2, "4:3": 0.25, "3:2": 0.25, "2:3": 0.45},
        "sure": (15, 45, 180),
        "foto": 0.55,
        "konu": {"kitap": 0.75, "cocuk": 0.8, "okul": 0.8, "seyahat": 0.9, "kutlama": 0.7, "hayvan": 0.95, "yemek": 0.9, "sahne": 0.7, "gunluk": 0.6},
        "sinyal": ("'İzlendi / kaydırıldı' oranı ve izlenme süresi ana sinyal; döngüye giren (loop) videolar tekrar izlenir; başlıktaki "
                   "anahtar kelimeler keşfi artırır; uzun videolara bağlantı kanal büyütür.",
                   "Das Verhältnis „angesehen / weggewischt“ und die Wiedergabezeit sind das Hauptsignal; Loops werden erneut angesehen; "
                   "Schlüsselwörter im Titel helfen beim Entdecken.",
                   "'Viewed vs. swiped away' and watch time are the main signals; looping videos get rewatched; keywords in the title help discovery."),
    },
    "fb_reels": {
        "ad": ("Facebook Reels", "Facebook Reels", "Facebook Reels"),
        "agirlik": {"hook": 0.16, "quality": 0.14, "format": 0.12, "duration": 0.10, "topic": 0.16, "people": 0.12, "novelty": 0.10, "history": 0.10},
        "oran": {"9:16": 1.0, "4:5": 0.8, "1:1": 0.7, "3:4": 0.75, "16:9": 0.45, "4:3": 0.5, "3:2": 0.5, "2:3": 0.75},
        "sure": (10, 45, 90),
        "foto": 0.7,
        "konu": {"kitap": 0.65, "cocuk": 0.95, "okul": 0.75, "seyahat": 0.8, "kutlama": 0.9, "hayvan": 0.9, "yemek": 0.8, "sahne": 0.65, "gunluk": 0.7},
        "sinyal": ("Paylaşım ve yorum öne çıkar; izleyici kitlesi daha yetişkin, aile ve nostalji içerikleri iyi çalışır; orijinal içerik "
                   "öncelikli; Instagram'dan çapraz paylaşım kolay.",
                   "Teilen und Kommentare zählen; das Publikum ist älter, Familien- und Nostalgie-Inhalte funktionieren gut; Originalinhalte "
                   "werden bevorzugt; einfaches Cross-Posting aus Instagram.",
                   "Shares and comments stand out; the audience is older, family and nostalgia content works well; original content is "
                   "prioritised; easy cross-posting from Instagram."),
    },
}
LANG_IDX = {"tr": 0, "de": 1, "en": 2}

# Pazar saatleri: pazarın yerel saatiyle iyi paylaşım pencereleri (hafta içi / hafta sonu)
WINDOWS = {
    "ig_reels": {"wk": [(11, 13), (19, 21)], "we": [(10, 12), (19, 21)]},
    "ig_feed": {"wk": [(8, 10), (19, 21)], "we": [(10, 12)]},
    "tiktok": {"wk": [(18, 22)], "we": [(11, 13), (19, 22)]},
    "yt_shorts": {"wk": [(12, 15), (19, 21)], "we": [(11, 14)]},
    "fb_reels": {"wk": [(9, 11), (19, 21)], "we": [(10, 12)]},
}
MARKET_TZ = {"TR": "Europe/Istanbul", "DE": "Europe/Berlin", "INT": "America/New_York"}


def duration_fit(dur, rng):
    lo, hi, mx = rng
    if dur <= 0:
        return 0.5
    if lo <= dur <= hi:
        return 1.0
    if dur < lo:
        return max(0.3, dur / lo)
    if dur <= mx:
        return 0.85  # kırpılabilir: en iyi an otomatik seçilir
    return 0.7       # uzun: kesit alınacak


def score_platform(key, s, item, tops):
    """s: sinyaller sözlüğü (0..1). Dönüş: (puan 0-100, katkılar)."""
    p = PLATFORMS[key]
    is_photo = item.get("kind") == "foto"
    sig = dict(s)
    sig["format"] = p["oran"].get(item.get("aspect") or "", 0.4)
    if is_photo and key != "ig_feed":
        sig["format"] = min(1.0, sig["format"]) * p["foto"]
    sig["duration"] = 0.75 if is_photo else duration_fit(float(item.get("duration") or 0), p["sure"])
    sig["topic"] = max((p["konu"].get(k, 0.6) * c for k, c in tops), default=0.6)
    if key == "fb_reels":
        sig["topic"] = max(sig["topic"], s.get("nostalgia", 0) * 0.95)
    if key in ("ig_reels", "fb_reels", "tiktok") and s.get("nostalgia", 0) > 0.5:
        sig["topic"] = min(1.0, sig["topic"] + 0.08)  # 'eskiden/şimdi' trendi
    total = sum(w * sig.get(k, 0.5) for k, w in p["agirlik"].items())
    return round(100 * total, 1), {k: round(sig.get(k, 0.5), 2) for k in p["agirlik"]}


IMPROVE = {
    "format": ("{a} → 9:16'ya bulanık arka planla dönüştürülecek", "{a} → 9:16 mit unscharfem Hintergrund", "{a} → 9:16 with blurred background"),
    "long": ("{d} sn → en iyi {t} sn otomatik kesilecek", "{d} s → die besten {t} s werden automatisch geschnitten", "{d} s → best {t} s cut automatically"),
    "short": ("Çok kısa ({d} sn): döngü/tekrar ile uzatılabilir", "Sehr kurz ({d} s): als Loop verlängern", "Very short ({d} s): extend as a loop"),
    "dark": ("Karanlık: parlaklık otomatik artırılacak", "Dunkel: Helligkeit wird automatisch angehoben", "Dark: brightness will be raised automatically"),
    "blur": ("Bulanık: keskinleştirme uygulanacak", "Unscharf: wird nachgeschärft", "Blurry: will be sharpened"),
    "dull": ("Soluk renkler: canlılık artırılacak", "Blasse Farben: Sättigung wird erhöht", "Dull colours: saturation will be boosted"),
    "hook": ("Zayıf açılış: ilk saniyeye yazılı kanca eklenecek", "Schwacher Einstieg: Text-Hook in der ersten Sekunde", "Weak opening: text hook in the first second"),
    "noaudio": ("Ses yok: müzik eklenecek", "Kein Ton: Musik wird ergänzt", "No audio: music will be added"),
    "photo": ("Fotoğraf: Ken Burns hareketi + müzikle 7 sn'lik Reel'e dönüştürülecek", "Foto: wird mit Ken-Burns-Bewegung + Musik zum 7-s-Reel",
              "Photo: turned into a 7 s Reel with Ken Burns motion + music"),
    "posted": ("Daha önce paylaşıldı: yeni kurgu ve 'throwback' açıklamasıyla yeniden paylaş", "Schon gepostet: neu geschnitten als „Throwback“ erneut posten",
               "Already posted: re-cut and repost as a 'throwback'"),
    "lowres": ("Düşük çözünürlük: büyük ekranda yumuşak görünebilir", "Niedrige Auflösung: kann weich wirken", "Low resolution: may look soft"),
}


def improvements(item, q, lang, target):
    li = LANG_IDX.get(lang, 0)
    out = []
    a = item.get("aspect") or ""
    if a not in ("9:16",) and target in ("ig_reels", "tiktok", "yt_shorts", "fb_reels"):
        out.append(IMPROVE["photo" if item.get("kind") == "foto" else "format"][li].format(a=a))
    d = float(item.get("duration") or 0)
    if item.get("kind") == "video":
        hi = PLATFORMS[target]["sure"][1]
        if d > hi + 1:
            out.append(IMPROVE["long"][li].format(d=int(d), t=hi))
        elif 0 < d < 5:
            out.append(IMPROVE["short"][li].format(d=round(d, 1)))
        if not item.get("has_audio"):
            out.append(IMPROVE["noaudio"][li])
        if q.get("hook") is not None and q["hook"] < 0.35:
            out.append(IMPROVE["hook"][li])
    if q.get("exposure", 1) < 0.45 and q.get("brightness", 125) < 90:
        out.append(IMPROVE["dark"][li])
    if q.get("sharp", 1) < 0.35:
        out.append(IMPROVE["blur"][li])
    if q.get("color", 1) < 0.25:
        out.append(IMPROVE["dull"][li])
    if min(item.get("width") or 0, item.get("height") or 0) and min(item.get("width") or 0, item.get("height") or 0) < 720:
        out.append(IMPROVE["lowres"][li])
    if item.get("posted_at"):
        out.append(IMPROVE["posted"][li])
    return out


def platform_name(key, lang):
    return PLATFORMS[key]["ad"][LANG_IDX.get(lang, 0)]


def platform_signal(key, lang):
    return PLATFORMS[key]["sinyal"][LANG_IDX.get(lang, 0)]


def best_times(platform, market, user_tz="Europe/Berlin", learned=None, days=7, start=None):
    """Önümüzdeki günlerde pazarın iyi saatlerini kullanıcının saat dilimine çevirir: [(datetime_kullanici, 'yerel HH:MM')]."""
    import datetime as dt
    try:
        from zoneinfo import ZoneInfo
        mtz, utz = ZoneInfo(MARKET_TZ.get(market, "Europe/Berlin")), ZoneInfo(user_tz)
    except Exception:
        mtz = utz = None
    now = (start or dt.datetime.now(utz) if utz else dt.datetime.now())
    out = []
    for k in range(days):
        day = (now + dt.timedelta(days=k)).date()
        wins = WINDOWS[platform]["we" if day.weekday() >= 5 else "wk"]
        for lo, hi in wins:
            hour = (lo + hi) // 2
            if learned and market != "INT":
                hs = [h for (wd, h) in learned if wd == day.weekday() and lo - 2 <= h <= hi + 1]
                if hs:
                    hour = hs[0]
            local = dt.datetime(day.year, day.month, day.day, hour, 0, tzinfo=mtz) if mtz else dt.datetime(day.year, day.month, day.day, hour)
            mine = local.astimezone(utz) if utz else local
            if mine > now:
                out.append((mine.replace(tzinfo=None), f"{hour:02d}:00"))
    return out
