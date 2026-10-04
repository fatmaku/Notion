"""Plattforma ve dile özel açıklama (caption), kanca (hook) ve hashtag üretimi.
Kural tabanlı çalışır; ANTHROPIC_API_KEY varsa Claude fotoğrafa bakıp gerçek içeriğe göre yazar."""
import base64
import json
import os
import random
from pathlib import Path

from . import algoritma, konu

LANGS = ("tr", "de", "en")
HOOKS = {
    "kitap": {"tr": ["Bu kitabın arkasındaki hikâyeyi biliyor musunuz?", "Bir kitap nasıl doğar? 📚", "Okurlarımın en sevdiği an bu oldu"],
              "de": ["Kennt ihr die Geschichte hinter diesem Buch?", "Wie entsteht ein Buch? 📚", "Dieser Moment ist der Liebling meiner Leser"],
              "en": ["Do you know the story behind this book?", "How is a book born? 📚", "My readers' favourite moment"]},
    "cocuk": {"tr": ["Bu anı hiç unutmayacağım…", "Çocukların dünyasından bir an 🤍", "Büyümek ne kadar hızlı geçiyor…"],
              "de": ["Diesen Moment vergesse ich nie…", "Ein Moment aus Kinderaugen 🤍", "Wie schnell sie groß werden…"],
              "en": ["I'll never forget this moment…", "A moment through a child's eyes 🤍", "They grow up so fast…"]},
    "okul": {"tr": ["Okulda kendi yolunu bulmak 🎒", "Bir öğretmenin değiştirdiği hayatlar"],
             "de": ["Seinen eigenen Weg in der Schule finden 🎒", "Wie Lehrkräfte Leben verändern"],
             "en": ["Finding your own way at school 🎒", "How teachers change lives"]},
    "seyahat": {"tr": ["Bu manzarayı sizinle paylaşmak istedim 🌅", "Sesi açın ve bir dakika durun"],
                "de": ["Diesen Ausblick wollte ich mit euch teilen 🌅", "Ton an und kurz innehalten"],
                "en": ["I wanted to share this view with you 🌅", "Sound on and pause for a minute"]},
    "kutlama": {"tr": ["Böyle günler için yaşıyoruz 🎉", "O günü hatırlayan var mı?"],
                "de": ["Für solche Tage leben wir 🎉", "Wer erinnert sich an diesen Tag?"],
                "en": ["We live for days like this 🎉", "Who remembers this day?"]},
    "hayvan": {"tr": ["Sonuna kadar izleyin 😄", "Günün en tatlı anı"], "de": ["Bis zum Ende schauen 😄", "Der süßeste Moment des Tages"],
               "en": ["Wait for the end 😄", "Cutest moment of the day"]},
    "yemek": {"tr": ["Tarifi isteyen yorumlara 👇"], "de": ["Wer will das Rezept? 👇"], "en": ["Who wants the recipe? 👇"]},
    "sahne": {"tr": ["Sahneden kocaman bir teşekkür 🎤", "O gün salonda olan var mı?"],
              "de": ["Ein großes Dankeschön von der Bühne 🎤", "Wer war an diesem Tag dabei?"],
              "en": ["A huge thank-you from the stage 🎤", "Who was there that day?"]},
    "gunluk": {"tr": ["Perde arkasından küçük bir an", "Sonuna kadar izleyin 👀"], "de": ["Ein kleiner Blick hinter die Kulissen", "Bis zum Ende schauen 👀"],
               "en": ["A little behind-the-scenes moment", "Watch till the end 👀"]},
}
NOSTALGIA_HOOK = {"tr": "{y} → bugün 👀", "de": "{y} → heute 👀", "en": "{y} → today 👀"}
CTA = {
    "ig_reels": {"tr": "Birine göndermek istersen ✈️ gönder; kaydetmeyi unutma.", "de": "Schick es jemandem ✈️ und speichere es dir.",
                 "en": "Send it to someone ✈️ and save it for later."},
    "ig_feed": {"tr": "Kaydet, sonra tekrar bakarsın 🔖", "de": "Speichern und später nochmal ansehen 🔖", "en": "Save it for later 🔖"},
    "tiktok": {"tr": "Sen olsan ne yapardın? Yorumlara yaz 👇", "de": "Was hättest du gemacht? Schreib's in die Kommentare 👇",
               "en": "What would you have done? Tell me in the comments 👇"},
    "yt_shorts": {"tr": "Devamı için abone ol 🔔", "de": "Abonnieren für mehr 🔔", "en": "Subscribe for more 🔔"},
    "fb_reels": {"tr": "Sizin de böyle bir anınız var mı? Paylaşın 💬", "de": "Habt ihr auch so eine Erinnerung? Erzählt es mir 💬",
                 "en": "Do you have a memory like this? Share it 💬"},
}
BODY = {
    "tr": ["Arşivimden çıkan bu an bana neden yazdığımı hatırlatıyor.", "Bazı anlar yıllar geçse de aynı sıcaklıkta kalıyor.",
           "Bunu sizinle paylaşmadan duramazdım."],
    "de": ["Dieser Moment aus meinem Archiv erinnert mich daran, warum ich schreibe.", "Manche Momente bleiben auch nach Jahren genauso warm.",
           "Das musste ich einfach mit euch teilen."],
    "en": ["This moment from my archive reminds me why I write.", "Some moments stay just as warm years later.",
           "I couldn't keep this one to myself."],
}
TAGS = {
    "kitap": {"tr": ["kitap", "kitapönerisi", "çocukkitabı", "kitaptok", "okumakeyfi", "yazar"],
              "de": ["buch", "kinderbuch", "buchtipp", "booktokgermany", "lesen", "autorin"],
              "en": ["books", "childrensbooks", "booktok", "bookstagram", "reading", "author"]},
    "cocuk": {"tr": ["çocuk", "annelik", "aile", "çocukgelişimi", "anılar"], "de": ["kinder", "familie", "mamaleben", "kindheit", "erinnerungen"],
              "en": ["kids", "family", "momlife", "childhood", "memories"]},
    "okul": {"tr": ["okul", "öğretmen", "eğitim", "okulöncesi"], "de": ["schule", "lehrer", "bildung", "einschulung"],
             "en": ["school", "teacher", "education", "backtoschool"]},
    "seyahat": {"tr": ["seyahat", "doğa", "tatil", "gezi"], "de": ["reisen", "natur", "urlaub", "fernweh"], "en": ["travel", "nature", "vacation", "wanderlust"]},
    "kutlama": {"tr": ["kutlama", "bayram", "anılar"], "de": ["feier", "fest", "erinnerungen"], "en": ["celebration", "party", "memories"]},
    "hayvan": {"tr": ["kedi", "köpek", "hayvansevgisi"], "de": ["tiere", "haustier", "tierliebe"], "en": ["pets", "animals", "petsofinstagram"]},
    "yemek": {"tr": ["yemek", "tarif", "lezzet"], "de": ["essen", "rezept", "lecker"], "en": ["food", "recipe", "yummy"]},
    "sahne": {"tr": ["etkinlik", "söyleşi", "imzagünü"], "de": ["lesung", "veranstaltung", "bühne"], "en": ["event", "booksigning", "stage"]},
    "gunluk": {"tr": ["günlük", "perdearkası", "anılar"], "de": ["alltag", "behindthescenes", "erinnerungen"], "en": ["dailylife", "behindthescenes", "memories"]},
}
NOSTALGIA_TAGS = {"tr": ["eskidenşimdi", "throwback"], "de": ["damalsundheute", "throwback"], "en": ["thenandnow", "throwback"]}
PLATFORM_TAGS = {"tiktok": {"tr": ["keşfet"], "de": ["fyp"], "en": ["fyp"]}, "yt_shorts": {"tr": ["shorts"], "de": ["shorts"], "en": ["shorts"]}}
TAG_COUNT = {"ig_reels": 5, "ig_feed": 5, "tiktok": 4, "yt_shorts": 3, "fb_reels": 3}


def hashtags(tops, lang, platform, nostalgia=0.0, extra=None):
    tags = []
    for k, _ in tops[:2]:
        tags += TAGS.get(k, TAGS["gunluk"])[lang]
    if nostalgia > 0.5:
        tags = NOSTALGIA_TAGS[lang] + tags
    tags = PLATFORM_TAGS.get(platform, {}).get(lang, []) + tags + list(extra or [])
    seen, out = set(), []
    for t in tags:
        t = t.strip("#").replace(" ", "")
        if t and t.lower() not in seen:
            seen.add(t.lower()); out.append("#" + t)
    return out[:TAG_COUNT.get(platform, 5)]


def hook(item, tops, lang, nost, seed=0):
    if nost > 0.6 and item.get("year"):
        return NOSTALGIA_HOOK[lang].format(y=item["year"])
    k = tops[0][0] if tops else "gunluk"
    opts = HOOKS.get(k, HOOKS["gunluk"])[lang]
    return random.Random(f"{item.get('id')}-{seed}").choice(opts)


def rule_captions(item, tops, nost, handle=""):
    """{dil: {platform: {'hook','caption','hashtags','title'}}}"""
    out = {}
    rng = random.Random(item.get("id"))
    for lang in LANGS:
        out[lang] = {}
        h = hook(item, tops, lang, nost)
        body = rng.choice(BODY[lang])
        topic = konu.topic_name(tops[0][0], lang) if tops else ""
        for p in algoritma.PLATFORMS:
            tags = hashtags(tops, lang, p, nost)
            cta = CTA[p][lang]
            if p == "tiktok":
                cap = f"{h} {topic.lower()} · {cta}"
            elif p == "yt_shorts":
                cap = f"{body}\n{cta}"
            elif p == "ig_feed":
                cap = f"{h}\n\n{body}\n\n{cta}"
            else:
                cap = f"{h}\n\n{body}\n\n{cta}"
            if handle:
                cap += f"\n{handle}"
            title = (h if len(h) <= 70 else h[:67] + "…") + (" #Shorts" if p == "yt_shorts" else "")
            out[lang][p] = {"hook": h, "caption": cap + "\n\n" + " ".join(tags), "hashtags": tags, "title": title}
    return out


SCHEMA = {
    "type": "object",
    "properties": {
        "aciklama": {"type": "string"},
        "konu": {"type": "string", "enum": list(konu.TOPICS)},
        "en_iyi_pazar": {"type": "string", "enum": list(konu.MARKETS)},
        "metinler": {"type": "object", "properties": {lang: {"type": "object", "properties": {
            p: {"type": "object", "properties": {"hook": {"type": "string"}, "caption": {"type": "string"},
                                                 "hashtags": {"type": "array", "items": {"type": "string"}}, "title": {"type": "string"}},
                "required": ["hook", "caption", "hashtags", "title"], "additionalProperties": False} for p in algoritma.PLATFORMS},
            "required": list(algoritma.PLATFORMS), "additionalProperties": False} for lang in LANGS},
            "required": list(LANGS), "additionalProperties": False},
    },
    "required": ["aciklama", "konu", "en_iyi_pazar", "metinler"],
    "additionalProperties": False,
}
SYSTEM = """You are a senior social media editor for a Turkish children's book author who lives in Germany and posts to Turkish, German
and international audiences. Look at the image and the metadata, then write native-sounding copy (not translations) for each language
and platform, following each platform's current ranking signals:
- Instagram Reels: hook in the first line, invite sends/saves, 3-5 relevant hashtags.
- Instagram feed/carousel: short storytelling, save prompt, up to 5 hashtags, searchable keywords.
- TikTok: very short punchy caption with search keywords, 3-4 hashtags (BookTok/KitapTok if about books).
- YouTube Shorts: title under 70 characters with a keyword and #Shorts; caption 1-2 lines.
- Facebook Reels: warm, ask a question that sparks comments, 1-3 hashtags.
Never invent facts that are not visible or given (no fake places, names or events). At most 2 emojis per caption.
'hook' is the on-screen text for the first second (max 45 characters)."""


def claude_available():
    if os.environ.get("ARSIV_NO_CLAUDE"):
        return False
    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN") or (Path.home() / ".config" / "anthropic").exists()):
        return False
    try:
        import anthropic  # noqa: F401
        return True
    except ImportError:
        return False


def claude_captions(item, tops, nost, handle=""):
    """Claude ile görsele bakarak tüm metinler. Başarısızsa None."""
    if not claude_available():
        return None
    import anthropic
    meta = {"dosya": item.get("filename"), "tur": item.get("kind"), "yil": item.get("year"), "sure_sn": item.get("duration"),
            "albumler": (item.get("albums") or [])[:5], "etiketler": (item.get("labels") or [])[:10], "kisiler": len(item.get("persons") or []),
            "yer": item.get("place"), "tahmini_konular": [k for k, _ in tops[:3]], "nostalji": round(nost, 2), "hesap": handle}
    content = []
    thumb = item.get("thumb")
    if thumb and Path(thumb).exists():
        content.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                                    "data": base64.standard_b64encode(Path(thumb).read_bytes()).decode()}})
    content.append({"type": "text", "text": "Metadata: " + json.dumps(meta, ensure_ascii=False)})
    try:
        client = anthropic.Anthropic()
        resp = client.beta.messages.create(
            model="claude-opus-5-5", max_tokens=16000, system=SYSTEM,
            betas=["server-side-fallback-2026-07-01"], fallbacks="default",
            output_config={"effort": "low", "format": {"type": "json_schema", "schema": SCHEMA}},
            messages=[{"role": "user", "content": content}])
        if resp.stop_reason in ("refusal", "max_tokens"):
            return None
        text = next((b.text for b in resp.content if b.type == "text"), "")
        data = json.loads(text)
        for lang in LANGS:  # hashtag biçimini düzelt
            for p, v in data["metinler"][lang].items():
                v["hashtags"] = ["#" + h.strip("#").replace(" ", "") for h in v["hashtags"]][:TAG_COUNT.get(p, 5)]
                if v["hashtags"] and not any(h in v["caption"] for h in v["hashtags"]):
                    v["caption"] = v["caption"].rstrip() + "\n\n" + " ".join(v["hashtags"])
        return data
    except Exception:
        return None
