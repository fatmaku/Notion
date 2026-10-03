"""İçerik takvimi: Türkiye ve Almanya'da paylaşım için anlamlı özel günler (çocuk kitabı yazarı odağında)."""
import datetime as dt

from . import i18n


def _easter(y):
    a, b, c = y % 19, y // 100, y % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return dt.date(y, month, day)


def _nth_weekday(y, month, weekday, n):
    d = dt.date(y, month, 1)
    d += dt.timedelta(days=(weekday - d.weekday()) % 7)
    return d + dt.timedelta(weeks=n - 1)


# (ay, gün, anahtar) — anahtarlar aşağıdaki NAMES sözlüğünde üç dile çevrilir
FIXED = [
    (1, 1, "yilbasi"), (2, 14, "sevgililer"), (3, 21, "siir"), (4, 2, "cocuk_kitap"), (4, 2, "otizm"),
    (4, 23, "nisan23"), (4, 23, "kitap_gunu"), (5, 19, "genclik"), (6, 1, "cocuk_gunu"), (9, 8, "okuryazarlik"),
    (9, 20, "weltkindertag"), (10, 1, "dehb_ayi"), (10, 5, "ogretmen_dunya"), (10, 29, "cumhuriyet"),
    (11, 24, "ogretmenler"), (12, 31, "yil_ozeti"),
]
# Ay takvimine bağlı bayramlar (Diyanet takvimine göre; yıllar ilerledikçe güncellenmeli)
LUNAR = {2026: [(3, 20, "ramazan"), (5, 27, "kurban")], 2027: [(3, 9, "ramazan"), (5, 16, "kurban")],
         2028: [(2, 26, "ramazan"), (5, 4, "kurban")]}

NAMES = {
    "yilbasi": ("Yılbaşı", "Neujahr", "New Year's Day", "Yeni yıl dilekleri + geçen yılın en güzel anları", "montaj"),
    "sevgililer": ("Sevgililer Günü", "Valentinstag", "Valentine's Day", "Sevgi temalı anılar; aile ve dostluk", "montaj"),
    "siir": ("Dünya Şiir Günü", "Welttag der Poesie", "World Poetry Day", "Kitaptan bir dize ile alıntı kartı", "alinti"),
    "cocuk_kitap": ("Uluslararası Çocuk Kitapları Günü", "Internationaler Kinderbuchtag", "International Children's Book Day",
                    "Kitaplarınızın hikâyesi: yazım süreci, okur buluşmaları", "montaj"),
    "otizm": ("Dünya Otizm Farkındalık Günü", "Welt-Autismus-Tag", "World Autism Awareness Day",
              "Nörofarklılık teması: kitaptan alıntı + kısa video", "alinti"),
    "nisan23": ("23 Nisan Ulusal Egemenlik ve Çocuk Bayramı", "23. April: Kinderfest (Türkei)", "23 April Children's Day (Türkiye)",
                "Çocukluk fotoğrafları, Eskiden/Şimdi", "eskiden-simdi"),
    "kitap_gunu": ("Dünya Kitap Günü", "Welttag des Buches", "World Book Day", "Kitap fuarları, imza günleri, okur yorumları", "montaj"),
    "genclik": ("19 Mayıs Gençlik ve Spor Bayramı", "19. Mai: Jugend- und Sporttag (Türkei)", "19 May Youth Day (Türkiye)",
                "Gençlik anıları, spor ve doğa", "montaj"),
    "cocuk_gunu": ("Dünya Çocuk Günü", "Internationaler Kindertag", "International Children's Day", "Çocuklarla etkinlik anları", "montaj"),
    "okuryazarlik": ("Dünya Okuryazarlık Günü", "Weltalphabetisierungstag", "International Literacy Day", "Okuma alışkanlığı, kütüphane anları", "tekli"),
    "weltkindertag": ("Dünya Çocuk Günü (Almanya)", "Weltkindertag", "World Children's Day (Germany)", "Almanya'daki okurlar için çocuk teması", "montaj"),
    "dehb_ayi": ("DEHB Farkındalık Ayı başlangıcı", "ADHS-Awareness-Monat", "ADHD Awareness Month", "Nörofarklılık serisinden içerikler", "carousel"),
    "ogretmen_dunya": ("Dünya Öğretmenler Günü", "Weltlehrertag", "World Teachers' Day", "Öğretmenlere teşekkür, okul ziyaretleri", "montaj"),
    "cumhuriyet": ("29 Ekim Cumhuriyet Bayramı", "29. Oktober: Tag der Republik (Türkei)", "29 October Republic Day (Türkiye)", "Bayram anıları", "montaj"),
    "ogretmenler": ("Öğretmenler Günü", "Lehrertag (Türkei)", "Teachers' Day (Türkiye)", "Okul etkinlikleri ve öğretmenler", "montaj"),
    "yil_ozeti": ("Yıl özeti", "Jahresrückblick", "Year in review", "Yılın en iyi 10 anı: tek tıkla montaj", "montaj"),
    "anneler": ("Anneler Günü", "Muttertag", "Mother's Day", "Anne-çocuk anıları, Eskiden/Şimdi", "eskiden-simdi"),
    "babalar_tr": ("Babalar Günü (Türkiye)", "Vatertag (Türkei)", "Father's Day (Türkiye)", "Baba-çocuk anıları", "montaj"),
    "vatertag": ("Babalar Günü (Almanya)", "Vatertag", "Father's Day (Germany)", "Baba-çocuk anıları", "montaj"),
    "ramazan": ("Ramazan Bayramı", "Ramadanfest (Zuckerfest)", "Eid al-Fitr", "Bayram ve aile anıları", "montaj"),
    "kurban": ("Kurban Bayramı", "Opferfest", "Eid al-Adha", "Bayram ve aile anıları", "montaj"),
    "okul_tr": ("Okula dönüş (Türkiye)", "Schulanfang (Türkei)", "Back to school (Türkiye)", "İlk okul günü anıları, okul kitapları", "eskiden-simdi"),
}

IDEA_T = {
    "de": {"Yeni yıl dilekleri + geçen yılın en güzel anları": "Neujahrswünsche + die schönsten Momente des Jahres",
           "Sevgi temalı anılar; aile ve dostluk": "Erinnerungen über Liebe, Familie und Freundschaft",
           "Kitaptan bir dize ile alıntı kartı": "Zitatkarte mit einer Zeile aus dem Buch",
           "Kitaplarınızın hikâyesi: yazım süreci, okur buluşmaları": "Die Geschichte hinter Ihren Büchern: Schreiben, Lesungen",
           "Nörofarklılık teması: kitaptan alıntı + kısa video": "Neurodiversität: Buchzitat + kurzes Video",
           "Çocukluk fotoğrafları, Eskiden/Şimdi": "Kinderfotos, Damals/Heute",
           "Kitap fuarları, imza günleri, okur yorumları": "Buchmessen, Signierstunden, Leserstimmen",
           "Gençlik anıları, spor ve doğa": "Jugenderinnerungen, Sport und Natur", "Çocuklarla etkinlik anları": "Momente mit Kindern",
           "Okuma alışkanlığı, kütüphane anları": "Lesegewohnheiten, Bibliotheksmomente",
           "Almanya'daki okurlar için çocuk teması": "Kinderthema für Leser in Deutschland",
           "Nörofarklılık serisinden içerikler": "Inhalte aus der Neurodiversitäts-Reihe",
           "Öğretmenlere teşekkür, okul ziyaretleri": "Dank an Lehrkräfte, Schulbesuche", "Bayram anıları": "Festtagserinnerungen",
           "Okul etkinlikleri ve öğretmenler": "Schulveranstaltungen und Lehrkräfte",
           "Yılın en iyi 10 anı: tek tıkla montaj": "Die 10 besten Momente des Jahres: Montage mit einem Klick",
           "Anne-çocuk anıları, Eskiden/Şimdi": "Mutter-Kind-Erinnerungen, Damals/Heute", "Baba-çocuk anıları": "Vater-Kind-Erinnerungen",
           "Bayram ve aile anıları": "Fest- und Familienerinnerungen",
           "İlk okul günü anıları, okul kitapları": "Erinnerungen an den ersten Schultag, Schulbücher"},
    "en": {"Yeni yıl dilekleri + geçen yılın en güzel anları": "New year wishes + the best moments of last year",
           "Sevgi temalı anılar; aile ve dostluk": "Memories about love, family and friendship",
           "Kitaptan bir dize ile alıntı kartı": "Quote card with a line from the book",
           "Kitaplarınızın hikâyesi: yazım süreci, okur buluşmaları": "The story behind your books: writing, reader events",
           "Nörofarklılık teması: kitaptan alıntı + kısa video": "Neurodiversity: book quote + short video",
           "Çocukluk fotoğrafları, Eskiden/Şimdi": "Childhood photos, Then/Now",
           "Kitap fuarları, imza günleri, okur yorumları": "Book fairs, signings, reader reviews",
           "Gençlik anıları, spor ve doğa": "Youth memories, sport and nature", "Çocuklarla etkinlik anları": "Moments with children",
           "Okuma alışkanlığı, kütüphane anları": "Reading habits, library moments",
           "Almanya'daki okurlar için çocuk teması": "Children's theme for readers in Germany",
           "Nörofarklılık serisinden içerikler": "Content from the neurodiversity series",
           "Öğretmenlere teşekkür, okul ziyaretleri": "Thanks to teachers, school visits", "Bayram anıları": "Holiday memories",
           "Okul etkinlikleri ve öğretmenler": "School events and teachers",
           "Yılın en iyi 10 anı: tek tıkla montaj": "The 10 best moments of the year: one-click montage",
           "Anne-çocuk anıları, Eskiden/Şimdi": "Mother-child memories, Then/Now", "Baba-çocuk anıları": "Father-child memories",
           "Bayram ve aile anıları": "Holiday and family memories",
           "İlk okul günü anıları, okul kitapları": "First-day-of-school memories, school books"},
}


def _dates_for_year(y):
    out = [(dt.date(y, m, d), k) for m, d, k in FIXED]
    out += [(dt.date(y, m, d), k) for m, d, k in LUNAR.get(y, [])]
    out.append((_nth_weekday(y, 5, 6, 2), "anneler"))            # Mayıs'ın 2. pazarı (TR + DE)
    out.append((_nth_weekday(y, 6, 6, 3), "babalar_tr"))         # Haziran'ın 3. pazarı
    out.append((_easter(y) + dt.timedelta(days=39), "vatertag"))  # Christi Himmelfahrt
    out.append((_nth_weekday(y, 9, 0, 2), "okul_tr"))            # Eylül'ün 2. pazartesi (yaklaşık)
    return out


def upcoming(lang="tr", start=None, days=45):
    """Önümüzdeki `days` gün içindeki özel günler: [{tarih, kalan_gun, ad, fikir, sablon, anahtar}]"""
    lang = i18n.norm(lang)
    start = start or dt.date.today()
    end = start + dt.timedelta(days=days)
    col = {"tr": 0, "de": 1, "en": 2}[lang]
    rows = []
    for y in {start.year, end.year}:
        for d, key in _dates_for_year(y):
            if start <= d <= end:
                n = NAMES[key]
                idea = n[3] if lang == "tr" else IDEA_T[lang].get(n[3], n[3])
                rows.append({"tarih": d.isoformat(), "kalan_gun": (d - start).days, "ad": n[col], "fikir": idea,
                             "sablon": n[4], "anahtar": key})
    return sorted(rows, key=lambda r: r["tarih"])
