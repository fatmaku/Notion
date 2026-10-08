"""Konu (tema) sınıflandırması ve pazar (ülke/dil) tahmini — çok dilli anahtar kelimeler + Apple'ın görüntü etiketleri."""
import re

# anahtar: (TR adı, DE adı, EN adı), anahtar kelimeler, uluslararası çekicilik (0..1)
TOPICS = {
    "kitap": (("Kitap & okuma", "Bücher & Lesen", "Books & reading"),
              ["kitap", "okuma", "yazar", "imza", "fuar", "kütüphane", "masal", "hikaye", "hikâye", "buch", "bücher", "lesen", "lesung",
               "autorin", "messe", "bibliothek", "book", "books", "reading", "library", "author", "signing", "novel", "fragman", "lansman"], 0.7),
    "cocuk": (("Çocuk & aile", "Kinder & Familie", "Kids & family"),
              ["çocuk", "cocuk", "bebek", "anne", "baba", "aile", "kız", "oğul", "kind", "kinder", "baby", "familie", "mama", "papa",
               "child", "children", "kid", "kids", "family", "toddler", "son", "daughter", "people", "portrait"], 0.8),
    "okul": (("Okul & eğitim", "Schule & Bildung", "School & learning"),
             ["okul", "öğretmen", "sınıf", "ders", "mezuniyet", "schule", "lehrer", "klasse", "einschulung", "school", "teacher",
              "classroom", "graduation", "kindergarten", "kita", "anaokulu"], 0.6),
    "seyahat": (("Seyahat & doğa", "Reisen & Natur", "Travel & nature"),
                ["tatil", "seyahat", "deniz", "plaj", "dağ", "orman", "doğa", "gezi", "urlaub", "reise", "meer", "strand", "berg", "wald",
                 "natur", "travel", "vacation", "beach", "sea", "ocean", "mountain", "forest", "nature", "sunset", "sky", "lake", "snow"], 0.9),
    "kutlama": (("Kutlama & bayram", "Feste & Feiern", "Celebrations"),
                ["doğum günü", "dogum gunu", "bayram", "düğün", "parti", "kutlama", "yılbaşı", "geburtstag", "hochzeit", "feier", "fest",
                 "weihnachten", "birthday", "wedding", "party", "celebration", "christmas", "cake", "balloon", "fireworks"], 0.75),
    "hayvan": (("Hayvanlar", "Tiere", "Animals"),
               ["kedi", "köpek", "hayvan", "kuş", "at", "katze", "hund", "tier", "vogel", "pferd", "cat", "dog", "pet", "animal", "bird", "horse"], 1.0),
    "yemek": (("Yemek", "Essen", "Food"),
              ["yemek", "tarif", "kahvaltı", "pasta", "essen", "rezept", "frühstück", "kuchen", "food", "recipe", "breakfast", "dessert", "meal"], 0.85),
    "sahne": (("Etkinlik & sahne", "Events & Bühne", "Events & stage"),
              ["etkinlik", "sahne", "konser", "söyleşi", "atölye", "veranstaltung", "bühne", "konzert", "workshop", "event", "stage",
               "concert", "talk", "festival"], 0.6),
    "noro": (("Nörofarklılık & psikoloji", "Neurodivergenz & Psychologie", "Neurodivergence & psychology"),
             ["adhs", "adhd", "dehb", "autismus", "autism", "otizm", "audhd", "neurodivergent", "neurodivergenz", "neurodiversität", "neurodiversity",
              "nörodivers", "nörofarklılık", "nörofarklı", "narzissmus", "narsisizm", "narcissism", "neurotypisch", "nörotipik", "neurotypical",
              "asperger", "beziehungskompass", "neurodiverse", "neurodivers"], 0.85),  # 'therapie', 'diagnose', 'masking' gibi genel sözcükler yanlış eşler
    "gunluk": (("Günlük & perde arkası", "Alltag & Backstage", "Daily life & behind the scenes"), [], 0.5),
}
MARKETS = {"TR": ("Türkiye", "Türkei", "Türkiye", "tr", "🇹🇷"), "DE": ("Almanya/DACH", "Deutschland/DACH", "Germany/DACH", "de", "🇩🇪"),
           "INT": ("Uluslararası", "International", "International", "en", "🌍")}
TR_PLACES = ["türkiye", "turkey", "türkei", "istanbul", "ankara", "izmir", "antalya", "bursa", "trabzon", "bodrum", "kapadokya", "konya",
             "eskişehir", "muğla", "fethiye", "alanya", "adana", "samsun", "karadeniz", "ege"]
DE_PLACES = ["deutschland", "germany", "almanya", "berlin", "münchen", "munich", "hamburg", "köln", "cologne", "frankfurt", "stuttgart",
             "düsseldorf", "dortmund", "essen", "bremen", "hannover", "leipzig", "dresden", "nürnberg", "österreich", "austria", "wien",
             "schweiz", "switzerland", "zürich", "bodensee", "nordsee", "ostsee"]
TR_CHARS = re.compile(r"[ğşıİĞŞ]")
DE_CHARS = re.compile(r"[äßÄ]|\b(und|der|die|das|mit|im|am|zum)\b", re.I)


def _text(item, persons=True):
    parts = [item.get("filename") or "", item.get("title") or "", item.get("description") or "", item.get("place") or ""]
    for k in ("albums", "keywords", "labels") + (("persons",) if persons else ()):
        parts += [str(x) for x in (item.get(k) or [])]
    return " ".join(parts)


# kelime başı eşleşmesi (Türkçe ekler için 'kitap' → 'kitapları'); kısa kelimeler tam eşleşir ('kita' ≠ 'kitap')
_WORD_RE = {w: re.compile(r"(?<!\w)" + re.escape(w) + (r"(?!\w)" if len(w) <= 4 else "")) for _, ws, _ in TOPICS.values() for w in ws}


def _low(txt):
    return txt.replace("İ", "i").lower()  # Python 'İ'.lower() birleşik nokta üretir; 'istanbul' eşleşmesi için


def topics(item, year_now=None):
    """[(konu, güven)] en güçlüden zayıfa. Eski içerik ayrıca 'nostalji' açısı taşır (ayrı alan)."""
    txt = _low(_text(item, persons=False))  # kişi adları konu sayılmaz ('Deniz' bir isim, deniz değil)
    found = []
    for key, (_, words, _) in TOPICS.items():
        hits = sum(1 for w in words if w and _WORD_RE[w].search(txt))
        if hits:
            found.append((key, min(1.0, 0.5 + 0.2 * hits)))
    if item.get("persons") and not any(k == "cocuk" for k, _ in found):
        found.append(("cocuk", 0.5))
    found.sort(key=lambda kv: -kv[1])
    return found or [("gunluk", 0.4)]


def nostalgia(item, year_now):
    y = item.get("year")
    if not y:
        return 0.0
    age = year_now - int(y)
    return max(0.0, min(1.0, (age - 3) / 10))  # 3 yıldan eskisi 'eskiden/şimdi' için değer kazanır


def markets(item, audience, tops):
    """Pazar uygunluğu (toplam 1): kitle payları + içerik ipuçları (yer, dil, konunun evrenselliği)."""
    txt = _text(item)
    low = _low(txt)
    sc = {k: max(0.02, float(audience.get(k, 0))) for k in MARKETS}
    if any(p in low for p in TR_PLACES):
        sc["TR"] += 0.35
    if any(p in low for p in DE_PLACES):
        sc["DE"] += 0.35
    if TR_CHARS.search(txt):
        sc["TR"] += 0.12
    if DE_CHARS.search(txt):
        sc["DE"] += 0.12
    uni = max((TOPICS[k][2] * c for k, c in tops), default=0.5)
    sc["INT"] += 0.25 * uni
    tot = sum(sc.values())
    return {k: round(v / tot, 3) for k, v in sorted(sc.items(), key=lambda kv: -kv[1])}


def topic_name(key, lang):
    return TOPICS.get(key, TOPICS["gunluk"])[0][{"tr": 0, "de": 1, "en": 2}.get(lang, 0)]


def market_name(key, lang):
    m = MARKETS[key]
    return m[{"tr": 0, "de": 1, "en": 2}.get(lang, 0)]
