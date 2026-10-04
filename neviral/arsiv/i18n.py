"""Çok dillilik: Türkçe metin anahtar, Almanca ve İngilizce karşılıkları burada. UI kendi sözlüğünü taşır."""
LANGS = ("tr", "de", "en")

T = {
    "de": {
        # puan gerekçeleri
        "dikey/kare format": "Hoch-/Quadratformat",
        "ideal süre (5-60 sn)": "ideale Länge (5–60 s)",
        "reel süresi (60-90 sn)": "Reel-Länge (60–90 s)",
        "uzun; kırpılabilir": "lang; kürzbar",
        "yüksek çözünürlük": "hohe Auflösung",
        "düşük çözünürlük": "niedrige Auflösung",
        "favori": "Favorit",
        "düzenlenmiş": "bearbeitet",
        "paylaşılan albümde": "in geteiltem Album",
        "kişi var": "Personen erkannt",
        "sosyal medya albümü/etiketi": "Social-Media-Album/-Tag",
        "Apple estetik puanı yüksek": "hoher Apple-Ästhetikwert",
        # yeniden paylaşım gerekçeleri
        "{n} beğeni almıştı": "hatte {n} Likes",
        "{n} gün önce paylaşıldı": "vor {n} Tagen gepostet",
        # fikirler
        "Bugün geçen yıl": "Heute vor einem Jahr",
        "{n} uygun öğe var; hikâye olarak paylaş.": "{n} passende Elemente; als Story teilen.",
        "Yatay videoları dikeye çevir": "Querformat-Videos ins Hochformat bringen",
        "{n}+ yatay video bulanık arka planla Reel olabilir.": "{n}+ Querformat-Videos können mit Unschärfe-Hintergrund zu Reels werden.",
        "Eskiden ({a}) / Şimdi ({b})": "Damals ({a}) / Heute ({b})",
        "Aynı konuda iki dönem: üst-alt karşılaştırma.": "Zwei Zeiten, ein Thema: Vergleich oben/unten.",
        "Favorilerden carousel": "Carousel aus Favoriten",
        "{n} favori fotoğraf, 4:5 kaydırmalı gönderi.": "{n} Favoriten-Fotos als 4:5-Carousel.",
        "Hiç paylaşılmamış en güçlü video": "Stärkstes noch nie gepostetes Video",
        "Yüksek puan.": "Hohe Punktzahl.",
        "Yeniden paylaşım zamanı": "Zeit für einen Repost",
        "{y} yılının en iyileri": "Das Beste aus {y}",
        "{n} en yüksek puanlı an: tek tıkla yıl özeti montajı.": "{n} Momente mit der höchsten Punktzahl: Jahresrückblick mit einem Klick.",
        # hatırlatıcılar
        "Yeniden paylaş: {f}": "Erneut posten: {f}",
        "Bugün geçen yıl: {n} öğe ({y})": "Heute vor Jahren: {n} Elemente ({y})",
        "Hikâye ya da 'Eskiden/Şimdi' için uygun": "Geeignet für Story oder „Damals/Heute“",
        # stüdyo
        "ESKİDEN": "DAMALS", "ŞİMDİ": "HEUTE",
        "Hazırlan: {ad} ({tarih})": "Vorbereiten: {ad} ({tarih})",
        # pazarlama
        "Yeterli performans verisi yok; Instagram Profesyonel Panel CSV'sini içe aktarın.": "Nicht genug Leistungsdaten; CSV aus dem Instagram-Profi-Dashboard importieren.",
        "En iyi performanslı video süresi ~{n} sn": "Beste Videolänge ≈ {n} s",
        "gunler": ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
    },
    "en": {
        "dikey/kare format": "portrait/square format",
        "ideal süre (5-60 sn)": "ideal length (5–60 s)",
        "reel süresi (60-90 sn)": "reel length (60–90 s)",
        "uzun; kırpılabilir": "long; can be trimmed",
        "yüksek çözünürlük": "high resolution",
        "düşük çözünürlük": "low resolution",
        "favori": "favourite",
        "düzenlenmiş": "edited",
        "paylaşılan albümde": "in a shared album",
        "kişi var": "people detected",
        "sosyal medya albümü/etiketi": "social-media album/tag",
        "Apple estetik puanı yüksek": "high Apple aesthetic score",
        "{n} beğeni almıştı": "had {n} likes",
        "{n} gün önce paylaşıldı": "posted {n} days ago",
        "Bugün geçen yıl": "On this day",
        "{n} uygun öğe var; hikâye olarak paylaş.": "{n} suitable items; share as a story.",
        "Yatay videoları dikeye çevir": "Turn landscape videos into vertical",
        "{n}+ yatay video bulanık arka planla Reel olabilir.": "{n}+ landscape videos can become Reels with a blurred background.",
        "Eskiden ({a}) / Şimdi ({b})": "Then ({a}) / Now ({b})",
        "Aynı konuda iki dönem: üst-alt karşılaştırma.": "Two eras, one topic: top/bottom comparison.",
        "Favorilerden carousel": "Carousel from favourites",
        "{n} favori fotoğraf, 4:5 kaydırmalı gönderi.": "{n} favourite photos as a 4:5 carousel.",
        "Hiç paylaşılmamış en güçlü video": "Strongest never-posted video",
        "Yüksek puan.": "High score.",
        "Yeniden paylaşım zamanı": "Time for a repost",
        "{y} yılının en iyileri": "Best of {y}",
        "{n} en yüksek puanlı an: tek tıkla yıl özeti montajı.": "{n} top-scoring moments: one-click year-in-review montage.",
        "Yeniden paylaş: {f}": "Repost: {f}",
        "Bugün geçen yıl: {n} öğe ({y})": "On this day: {n} items ({y})",
        "Hikâye ya da 'Eskiden/Şimdi' için uygun": "Good for a story or 'Then/Now'",
        "ESKİDEN": "THEN", "ŞİMDİ": "NOW",
        "Hazırlan: {ad} ({tarih})": "Get ready: {ad} ({tarih})",
        "Yeterli performans verisi yok; Instagram Profesyonel Panel CSV'sini içe aktarın.": "Not enough performance data; import the CSV from the Instagram professional dashboard.",
        "En iyi performanslı video süresi ~{n} sn": "Best-performing video length ≈ {n} s",
        "gunler": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    },
}
GUNLER_TR = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]


def norm(lang):
    lang = (lang or "tr").lower()[:2]
    return lang if lang in LANGS else "tr"


def t(lang, key, **kw):
    """Anahtar Türkçe metindir; dilde karşılığı yoksa Türkçe döner."""
    table = T.get(norm(lang), {})
    s = table.get(key)
    if s is None and isinstance(key, str) and key.endswith(")") and " (" in key:  # "dikey/kare format (9:16)" gibi eski kayıtlar
        base, _, suffix = key.rpartition(" (")
        s = table.get(base, base) + " (" + suffix
    if s is None:
        s = key
    return s.format(**kw) if kw else s


def days(lang):
    return T.get(norm(lang), {}).get("gunler") or GUNLER_TR


def lang_of(con):
    from . import db
    return norm(db.get_setting(con, "dil", "tr"))


def localize(obj, lang):
    """API çıktısındaki sabit gerekçe listelerini çevirir (score_reasons, gerekce)."""
    lang = norm(lang)
    if lang == "tr":
        return obj
    if isinstance(obj, list):
        return [localize(x, lang) for x in obj]
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in ("score_reasons", "gerekce") and isinstance(v, list):
                out[k] = [t(lang, x) if isinstance(x, str) else x for x in v]
            else:
                out[k] = localize(v, lang)
        return out
    return obj
