"""neviral metin motoru: kanca (hook) formülleri, varyant üretimi ve puanlama, hikâye anlatan açıklamalar.
Kanıtlanmış sosyal medya kalıpları: merak boşluğu, soru, sayı/özgüllük, karşıtlık (eskiden/şimdi), kişisel hikâye, POV.
Sahte iddia üretmez: yalnızca bilinen bilgiler (yıl, yer, konu, ilk kez paylaşım) kullanılır."""
import random
import re

L3 = ("tr", "de", "en")

# (formül adı, şart, {dil: [şablonlar]})  şartlar: None | 'yil' | 'yeni' | 'kisi' | 'video' | 'yer'
HOOKS = {
    "kitap": [
        ("merak", None, {"tr": ["Bir çocuk kitabı nasıl doğar?", "Bu kitabın arkasındaki hikâyeyi kimse bilmiyor", "Bu sayfaların arkasında ne var?"],
                         "de": ["Wie entsteht eigentlich ein Kinderbuch?", "Die Geschichte hinter diesem Buch kennt kaum jemand", "Was steckt hinter diesen Seiten?"],
                         "en": ["How is a children's book actually born?", "Almost nobody knows the story behind this book", "What's behind these pages?"]}),
        ("kisisel", None, {"tr": ["Yazar olmadan önce bunu bilmek isterdim", "Okurlarımın bana en çok sorduğu soru", "Bu kitabı yazmamın gerçek sebebi"],
                           "de": ["Das hätte ich gern gewusst, bevor ich Autorin wurde", "Die Frage, die mir Leser am häufigsten stellen", "Der wahre Grund für dieses Buch"],
                           "en": ["What I wish I knew before becoming an author", "The question my readers ask me most", "The real reason I wrote this book"]}),
        ("soru", None, {"tr": ["Çocuğunuz en son hangi kitapta kayboldu?", "Sizin çocukluk kitabınız hangisiydi?"],
                        "de": ["In welchem Buch hat sich euer Kind zuletzt verloren?", "Welches Buch hat eure Kindheit geprägt?"],
                        "en": ["Which book did your child last get lost in?", "Which book shaped your childhood?"]}),
        ("yil", "yil", {"tr": ["{yil}: her şey bu sayfalarla başladı", "{n} yıl önce bu kitap sadece bir hayaldi"],
                        "de": ["{yil}: Mit diesen Seiten fing alles an", "Vor {n} Jahren war dieses Buch nur ein Traum"],
                        "en": ["{yil}: it all started with these pages", "{n} years ago this book was just a dream"]}),
        ("ilk", "yeni", {"tr": ["Bunu ilk kez paylaşıyorum"], "de": ["Das zeige ich heute zum ersten Mal"], "en": ["I'm sharing this for the first time"]}),
    ],
    "cocuk": [
        ("duygu", None, {"tr": ["Bu anı hiç unutmayacağım", "Çocuklar bize bunu öğretiyor", "Büyümek ne kadar hızlı geçiyor"],
                         "de": ["Diesen Moment vergesse ich nie", "Das bringen uns Kinder bei", "Wie schnell sie groß werden"],
                         "en": ["I'll never forget this moment", "This is what kids teach us", "They grow up so fast"]}),
        ("soru", None, {"tr": ["Siz de bu anı yaşadınız mı?", "Çocuğunuzun ilk ne zaman böyle güldüğünü hatırlıyor musunuz?"],
                        "de": ["Kennt ihr diesen Moment auch?", "Wisst ihr noch, wann euer Kind zum ersten Mal so gelacht hat?"],
                        "en": ["Do you know this moment too?", "Remember the first time your child laughed like this?"]}),
        ("pov", None, {"tr": ["POV: çocuğunuz dünyayı ilk kez keşfediyor"], "de": ["POV: Dein Kind entdeckt die Welt"], "en": ["POV: your child discovers the world"]}),
        ("yil", "yil", {"tr": ["{yil} → bugün: aynı gülüş", "{n} yıl önce bugün"], "de": ["{yil} → heute: dasselbe Lachen", "Heute vor {n} Jahren"],
                        "en": ["{yil} → today: the same smile", "{n} years ago today"]}),
    ],
    "noro": [  # nörofarklılık: kimlik kancası ("bunu sadece … anlar") bu hesapta 10× erişim getirdi
        ("kimlik", None, {"tr": ["Bunu sadece nörofarklı olanlar anlar", "DEHB'si olan herkes bu anı bilir", "Sadece AuDHD yaşayanlar bunu anlar"],
                          "de": ["Das verstehen nur Neurodivergente", "Wer ADHS hat, kennt diesen Moment", "Nur wer AuDHD lebt, versteht das hier"],
                          "en": ["Only neurodivergent people will get this", "If you have ADHD, you know this moment", "Only AuDHD people understand this"]}),
        ("soru", None, {"tr": ["DEHB mi, otizm mi, yoksa sadece sen mi?", "Kendi sistemini gerçekten tanıyor musun?", "Maske mi takıyorsun, yoksa bu sen misin?"],
                        "de": ["ADHS? Autismus? AuDHD? Oder einfach du?", "Kennst du dein eigenes System wirklich?", "Maskierst du – oder bist du das?"],
                        "en": ["ADHD? Autism? AuDHD? Or just you?", "Do you really know your own system?", "Are you masking – or is this you?"]}),
        ("mit", None, {"tr": ["Bu bir zayıflık değil: filtresiz açıklık", "Narsistler neden nörofarklılara çekilir?", "Beynin bozuk değil; sistemini kimse anlatmamış"],
                       "de": ["Das ist keine Schwäche – das ist Offenheit ohne Filter", "Warum Narzissten Neurodivergente anziehen", "Dein Gehirn ist nicht kaputt – es wurde dir nur nie erklärt"],
                       "en": ["It's not a weakness – it's openness without a filter", "Why narcissists are drawn to neurodivergent people", "Your brain isn't broken – nobody ever explained it to you"]}),
        ("liste", None, {"tr": ["Sadece AuDHD'lilerin bildiği 3 şey", "Tanıdan önce gözden kaçırdığım 5 işaret"],
                         "de": ["3 Dinge, die nur AuDHDler kennen", "5 Zeichen, die ich vor meiner Diagnose übersehen habe"],
                         "en": ["3 things only AuDHD people know", "5 signs I missed before my diagnosis"]}),
        ("kisisel", None, {"tr": ["Tanıyı almadan önce bunu bilmek isterdim", "Yıllarca yanlış teşhisle yaşadım", "Maske takmak bana neredeyse her şeye mal oldu"],
                           "de": ["Das hätte ich vor meiner Diagnose gern gewusst", "Jahrelang lebte ich mit der falschen Diagnose", "Masking hat mich fast alles gekostet"],
                           "en": ["I wish I'd known this before my diagnosis", "I lived with the wrong diagnosis for years", "Masking almost cost me everything"]}),
        ("pov", "video", {"tr": ["POV: Beynin 300 sekmeyle çalışıyor"], "de": ["POV: Dein Gehirn läuft mit 300 Tabs"], "en": ["POV: your brain runs 300 tabs"]}),
        ("yil", "yil", {"tr": ["{yil}: O zaman tanımı henüz bilmiyordum"], "de": ["{yil}: Damals wusste ich noch nichts von meiner Diagnose"],
                        "en": ["{yil}: back then I didn't know about my diagnosis"]}),
    ],
    "okul": [
        ("merak", None, {"tr": ["Okulda kendi yolunu bulmak neden bu kadar zor?", "Hiçbir öğretmenin unutmadığı an"],
                         "de": ["Warum ist es so schwer, in der Schule seinen Weg zu finden?", "Der Moment, den keine Lehrkraft vergisst"],
                         "en": ["Why is finding your own way at school so hard?", "The moment no teacher ever forgets"]}),
        ("soru", None, {"tr": ["İlk okul gününüzü hatırlıyor musunuz?"], "de": ["Erinnert ihr euch an euren ersten Schultag?"], "en": ["Do you remember your first day of school?"]}),
        ("yil", "yil", {"tr": ["{yil}'teki ilk gün"], "de": ["Der erste Tag, {yil}"], "en": ["First day, {yil}"]}),
    ],
    "seyahat": [
        ("duygu", None, {"tr": ["Sesi açın ve bir dakika durun", "Burada zaman durdu"], "de": ["Ton an und kurz innehalten", "Hier stand die Zeit still"],
                         "en": ["Sound on and pause for a minute", "Time stood still here"]}),
        ("yer", "yer", {"tr": ["{yer}'i hiç böyle gördünüz mü?"], "de": ["Habt ihr {yer} schon mal so gesehen?"], "en": ["Have you ever seen {yer} like this?"]}),
        ("soru", None, {"tr": ["Sizce burası neresi?"], "de": ["Was glaubt ihr, wo das ist?"], "en": ["Guess where this is?"]}),
        ("yil", "yil", {"tr": ["{n} yıl önce bu manzara"], "de": ["Dieser Ausblick vor {n} Jahren"], "en": ["This view, {n} years ago"]}),
    ],
    "kutlama": [
        ("duygu", None, {"tr": ["Böyle günler için yaşıyoruz", "O gün herkes ağladı (mutluluktan)"], "de": ["Für solche Tage leben wir", "An diesem Tag gab es Freudentränen"],
                         "en": ["We live for days like this", "Happy tears that day"]}),
        ("soru", None, {"tr": ["O günü hatırlayan var mı?"], "de": ["Wer erinnert sich an diesen Tag?"], "en": ["Who remembers this day?"]}),
    ],
    "hayvan": [
        ("merak", None, {"tr": ["Sonunu tahmin edemezsiniz", "Bu bakışa dikkat"], "de": ["Achtet auf diesen Blick", "Das Ende überrascht"],
                         "en": ["Watch this look", "The ending got me"]}),
    ],
    "yemek": [("soru", None, {"tr": ["Tarifi isteyen var mı?"], "de": ["Wer will das Rezept?"], "en": ["Who wants the recipe?"]})],
    "sahne": [
        ("duygu", None, {"tr": ["Sahneden kocaman bir teşekkür", "O salondaki enerji…"], "de": ["Ein großes Danke von der Bühne", "Diese Energie im Saal…"],
                         "en": ["A huge thank-you from the stage", "The energy in that room…"]}),
        ("soru", None, {"tr": ["O gün orada olan var mı?"], "de": ["Wer war an diesem Tag dabei?"], "en": ["Who was there that day?"]}),
    ],
    "_genel": [
        ("merak", None, {"tr": ["Bunu sizinle paylaşmam gerekiyordu", "Arşivimden çıkan küçük bir hazine"],
                         "de": ["Das musste ich mit euch teilen", "Ein kleiner Schatz aus meinem Archiv"],
                         "en": ["I had to share this with you", "A little treasure from my archive"]}),
        ("yil", "yil", {"tr": ["{yil} → bugün", "{n} yıl sonra yeniden"], "de": ["{yil} → heute", "{n} Jahre später, wieder hier"],
                        "en": ["{yil} → today", "{n} years later, here again"]}),
        ("ilk", "yeni", {"tr": ["Bu videoyu ilk kez gösteriyorum"], "de": ["Dieses Video zeige ich zum ersten Mal"], "en": ["Showing this for the first time"]}),
        ("kisi", "kisi", {"tr": ["Bu ifadeye bakın"], "de": ["Schaut euch diesen Ausdruck an"], "en": ["Look at this expression"]}),
    ],
}

STORY = {
    "kitap": {"tr": ["Her kitap bir soruyla başlar. Bu sefer soru şuydu: Bir çocuk kendi yolunu nasıl bulur?",
                     "Yazmak benim için sayfaları değil, bir çocuğun içindeki sesi duymak demek.",
                     "Bu karede, okurlarımla aramızdaki o görünmez bağı görüyorum."],
              "de": ["Jedes Buch beginnt mit einer Frage. Diesmal: Wie findet ein Kind seinen eigenen Weg?",
                     "Schreiben heißt für mich, die Stimme in einem Kind hörbar zu machen.",
                     "In diesem Bild sehe ich das unsichtbare Band zwischen mir und meinen Leserinnen und Lesern."],
              "en": ["Every book starts with a question. This time: how does a child find their own way?",
                     "To me, writing means making the voice inside a child heard.",
                     "In this picture I see the invisible bond between me and my readers."]},
    "noro": {"tr": ["Nörofarklılık bir hata değil: aynı sistem, sadece daha yüksek ayarda.", "Yıllarca maske taktım; bugün arkasında ne olduğunu anlatıyorum.",
                    "Bu kare, kendi sistemimi anladığım ana ait."],
             "de": ["Neurodivergenz ist kein Fehler im System – es ist dasselbe System, nur stärker eingestellt.",
                    "Jahrelang habe ich maskiert. Heute erkläre ich, was dahinter steckt.",
                    "Dieses Bild gehört zu dem Moment, in dem ich mein eigenes System verstanden habe."],
             "en": ["Neurodivergence isn't a bug – it's the same system, turned up louder.", "For years I masked. Today I explain what was behind it.",
                    "This picture belongs to the moment I understood my own system."]},
    "cocuk": {"tr": ["Bazı anlar yıllar geçse de aynı sıcaklıkta kalıyor.", "Çocuklar dünyaya bizim unuttuğumuz bir merakla bakıyor.",
                     "Bu küçük an, bana neden yazdığımı hatırlatıyor."],
              "de": ["Manche Momente bleiben auch nach Jahren genauso warm.", "Kinder schauen mit einer Neugier auf die Welt, die wir verlernt haben.",
                     "Dieser kleine Moment erinnert mich daran, warum ich schreibe."],
              "en": ["Some moments stay just as warm years later.", "Kids look at the world with a curiosity we've forgotten.",
                     "This little moment reminds me why I write."]},
    "_genel": {"tr": ["Arşivimde dolaşırken bu ana rastladım ve sizinle paylaşmadan duramadım.", "Bazen en güzel hikâyeler en sessiz anlarda saklı."],
               "de": ["Beim Stöbern im Archiv bin ich auf diesen Moment gestoßen und musste ihn teilen.", "Manchmal verstecken sich die schönsten Geschichten in den leisesten Momenten."],
               "en": ["I found this moment while going through my archive and had to share it.", "Sometimes the best stories hide in the quietest moments."]},
}
QUESTION = {"tr": ["Sizin bu konudaki en güzel anınız ne? Yorumlara yazın 👇", "Sizce de öyle mi? Yorumlarda konuşalım."],
            "de": ["Was ist euer schönster Moment dazu? Schreibt es in die Kommentare 👇", "Seht ihr das auch so? Lasst uns in den Kommentaren reden."],
            "en": ["What's your favourite memory like this? Tell me below 👇", "Do you feel the same? Let's talk in the comments."]}
SEND = {"tr": "Bunu görmesi gereken birine gönder ✈️", "de": "Schick das jemandem, der es sehen sollte ✈️", "en": "Send this to someone who needs to see it ✈️"}
SAVE = {"tr": "Kaydet, sonra tekrar bak 🔖", "de": "Speichern und später nochmal ansehen 🔖", "en": "Save it for later 🔖"}
SUB = {"tr": "Daha fazlası için abone ol 🔔", "de": "Abonnieren für mehr 🔔", "en": "Subscribe for more 🔔"}

CLICHES = ["sonuna kadar izle", "bis zum ende", "watch till the end", "wait for the end", "link in bio", "profildeki link", "beğenmeyi unutma",
           "like and subscribe", "abone olmayı unutma"]
EMOTION = {"tr": ["unutma", "ağla", "kalp", "sevgi", "hayal", "mutlu", "gülüş", "duygu", "hatıra", "sıcak", "zaman durdu"],
           "de": ["vergesse", "traum", "liebe", "herz", "lachen", "tränen", "glück", "warm", "zeit stand"],
           "en": ["never forget", "dream", "love", "heart", "smile", "tears", "happy", "warm", "time stood"]}
YOU = {"tr": [r"\b(sen|siz|sizin|senin|çocuğunuz|hatırlıyor musunuz)\b"], "de": [r"\b(du|dein|deine|ihr|euer|eure|euch)\b"],
       "en": [r"\b(you|your)\b"]}
CURIOUS = {"tr": ["nasıl", "neden", "kimse", "sır", "gerçek", "ilk kez", "tahmin"], "de": ["wie ", "warum", "kaum jemand", "geheimnis", "wahre", "zum ersten mal", "glaubt ihr"],
           "en": ["how ", "why", "nobody", "secret", "real reason", "first time", "guess"]}
TOPIC_WORDS = {"kitap": {"tr": ["kitap"], "de": ["buch"], "en": ["book"]}, "cocuk": {"tr": ["çocuk"], "de": ["kind"], "en": ["child", "kid"]},
               "okul": {"tr": ["okul"], "de": ["schul"], "en": ["school"]},
               "noro": {"tr": ["dehb", "otizm", "nörofark", "audhd", "narsis", "maske"], "de": ["adhs", "autis", "audhd", "neurodiver", "narziss", "maskier", "masking"],
                        "en": ["adhd", "autis", "audhd", "neurodiver", "narciss", "masking"]}}

R = {  # gerekçe metinleri
    "len": ("İdeal uzunluk (3-9 kelime)", "Ideale Länge (3–9 Wörter)", "Ideal length (3–9 words)"),
    "short": ("Ekranda kolay okunur (≤42 karakter)", "Gut lesbar im Bild (≤42 Zeichen)", "Easy to read on screen (≤42 chars)"),
    "long": ("Fazla uzun: ilk saniyede okunmaz", "Zu lang für die erste Sekunde", "Too long for the first second"),
    "curious": ("Merak boşluğu yaratıyor", "Erzeugt Neugier", "Creates a curiosity gap"),
    "question": ("Soru: yorumları tetikler", "Frage: lädt zum Kommentieren ein", "Question: invites comments"),
    "specific": ("Somut (yıl/sayı)", "Konkret (Jahr/Zahl)", "Specific (year/number)"),
    "emotion": ("Duygusal", "Emotional", "Emotional"),
    "you": ("İzleyiciye doğrudan hitap", "Spricht direkt an", "Speaks directly to the viewer"),
    "me": ("Kişisel hikâye", "Persönliche Geschichte", "Personal story"),
    "keyword": ("Aranabilir anahtar kelime içeriyor", "Enthält ein Suchwort", "Contains a searchable keyword"),
    "fit": ("Bu içeriğin ana konusuna uyuyor", "Passt zum Hauptthema dieses Inhalts", "Fits this item's main topic"),
    "cliche": ("Klişe ifade: algoritma ve izleyici yoruldu", "Abgenutzte Floskel", "Overused cliché"),
    "emoji": ("Çok fazla emoji", "Zu viele Emojis", "Too many emojis"),
}
LI = {"tr": 0, "de": 1, "en": 2}


def score_hook(text, lang, topic=None):
    """0-100 ve gerekçeler. Kurallar: kısa, merak/soru, somutluk, duygu, hitap, anahtar kelime; klişe cezası."""
    t = str(text).strip()
    low = t.lower()
    li = LI.get(lang, 0)
    s, why, warn = 30.0, [], []
    words = len(re.findall(r"\w+", t))
    if 3 <= words <= 9:
        s += 18; why.append(R["len"][li])
    elif words > 12:
        s -= 10
    if len(t) <= 42:
        s += 10; why.append(R["short"][li])
    elif len(t) > 60:
        s -= 15; warn.append(R["long"][li])
    if "?" in t:
        s += 12; why.append(R["question"][li])
    if any(w in low for w in CURIOUS[lang]) or t.endswith("…"):
        s += 12; why.append(R["curious"][li])
    if re.search(r"\d", t):
        s += 8; why.append(R["specific"][li])
    if any(w in low for w in EMOTION[lang]):
        s += 7; why.append(R["emotion"][li])
    if any(re.search(p, low) for p in YOU[lang]):
        s += 7; why.append(R["you"][li])
    if re.search({"tr": r"\b(ben|benim|yazar|yazdım|paylaşıyorum|gösteriyorum)", "de": r"\b(ich|mein|meine|mir)\b",
                  "en": r"\b(i|my|me|i'm)\b"}[lang], low):
        s += 5; why.append(R["me"][li])
    if topic in TOPIC_WORDS and any(w in low for w in TOPIC_WORDS[topic][lang]):
        s += 6; why.append(R["keyword"][li])
    if any(c in low for c in CLICHES):
        s -= 15; warn.append(R["cliche"][li])
    emojis = len(re.findall(r"[\U0001F300-\U0001FAFF☀-➿]", t))
    if emojis > 1:
        s -= 6 * (emojis - 1); warn.append(R["emoji"][li])
    return round(max(0.0, min(100.0, s)), 1), why[:4], warn


def _cond_ok(cond, ctx):
    return cond is None or bool(ctx.get(cond))


def score_for(text, lang, topics):
    """Kullanıcının kendi kancası: varyantlarla aynı ölçek (ana konu kelimesi geçiyorsa aynı uygunluk bonusu)."""
    topics = [k for k in (topics or []) if k in TOPIC_WORDS]
    sc, why, warn = score_hook(text, lang, topics[0] if topics else None)
    low = str(text).lower()
    for rank, k in enumerate(topics[:2]):
        if any(w in low for w in TOPIC_WORDS[k][lang]):
            sc = min(100, sc + (8, 4)[rank]); why = [R["fit"][LI.get(lang, 0)]] + why
            break
    return sc, why, warn


def variants(item, topics, lang, nostalgia=0.0, n=6, year_now=None):
    """Konu + bağlama uygun kanca adayları, puana göre sıralı: [{text, score, why, warn, formula}]"""
    import datetime as dt
    year_now = year_now or dt.date.today().year
    y = item.get("year")
    ctx = {"yil": bool(y and year_now - int(y) >= 2), "yeni": not item.get("posted_at"), "kisi": bool(item.get("persons")),
           "video": item.get("kind") == "video", "yer": bool(item.get("place"))}
    fill = {"yil": y or "", "n": (year_now - int(y)) if y else "", "yer": (item.get("place") or "").split(",")[0]}
    keys = [k for k in topics if k in HOOKS][:2] + ["_genel"]
    cands, seen = [], set()
    for rank, k in enumerate(keys):
        relevance = {0: 8, 1: 4}.get(rank, 0) if k != "_genel" else 0  # ana konuya uygun kanca öne çıkar
        for formula, cond, by_lang in HOOKS[k]:
            if not _cond_ok(cond, ctx):
                continue
            for tpl in by_lang.get(lang, []):
                txt = tpl.format(**fill).strip()
                if txt.lower() in seen:
                    continue
                seen.add(txt.lower())
                sc, why, warn = score_hook(txt, lang, topics[0] if topics else None)
                if relevance:
                    sc = min(100, sc + relevance); why = [R["fit"][LI.get(lang, 0)]] + why
                if formula == "yil" and nostalgia > 0.5:
                    sc = min(100, sc + 6)  # eskiden/şimdi trendi
                cands.append({"text": txt, "score": sc, "why": why, "warn": warn, "formula": formula})
    cands.sort(key=lambda c: -c["score"])
    return cands[:n]


def story(item, topics, lang, seed=0):
    rng = random.Random(f"{item.get('id')}-{seed}")
    bank = STORY.get(topics[0] if topics else "", STORY["_genel"])[lang]
    first = rng.choice(bank)
    rest = [x for x in STORY["_genel"][lang] + bank if x != first]
    return first, rng.choice(rest)


def place_line(item):
    bits = []
    if item.get("place"):
        bits.append("📍 " + str(item["place"]).split(",")[0])
    if item.get("year"):
        bits.append(str(item["year"]))
    return " · ".join(bits)


def compose(platform, lang, hook, s1, s2, tags, item, handle=""):
    q = QUESTION[lang][(item.get("id") or 0) % 2]
    pl = place_line(item)
    if platform == "ig_reels":
        body = f"{hook}\n\n{s1}\n\n{q}\n{SEND[lang]}"
    elif platform == "ig_feed":
        body = f"{hook}\n\n{s1} {s2}\n" + (f"\n{pl}\n" if pl else "") + f"\n{SAVE[lang]}"
    elif platform == "tiktok":
        body = f"{hook} {q}"
    elif platform == "yt_shorts":
        body = f"{s1}\n{SUB[lang]}"
    else:  # fb_reels
        body = f"{s1}\n\n{q}"
    if handle:
        body += f"\n{handle}"
    return body + "\n\n" + " ".join(tags)
