# Sticker & Reaktionen (LiveFX 2.1)

## Deutsch

**Was ist dabei?**

- **143 Reaktions-Sticker** in `memes/fluent/` (62 animiert, 81 statisch, WebP 160 px, zusammen ca. 3,0 MB),
  Liste mit DE/TR/EN-Stichwörtern und Kategorie in `memes/index.json`. Quelle: Microsoft Fluent Emoji (MIT).
  Statische Sticker bewegen sich im Overlay trotzdem: Pop/Tilt/Bounce kommen aus dem CSS.
- **Paket „🎞️ Reaktionen (animiert)“** (`reactions`, 42 Trigger, davon 31 animiert): z. B. „tränen gelacht“, „kopf explodiert“,
  „daumen hoch“, „grab the popcorn“, „aya gidiyoruz“. Die Stichwörter überschneiden sich mit keinem anderen
  Paket, das Paket lässt sich also mit allen kombinieren.
- **Eigene Text-Sticker** (`text-tr`, `text-de`, `text-en`, je 27–28): große Comic-Wörter wie OHA, KRASS,
  LÄUFT, EHRENFRAU, GG, SHEESH. Das sind keine Dateien: Sie werden live gerendert, im Textstil `sticker`.
  Die Stichwörter dürfen sich mit dem Meme-Paket derselben Sprache überschneiden. Am besten lädst du nur
  einen der beiden Stile.

**Lizenzen:** Fluent Emoji: MIT, © Microsoft Corporation (Volltext in `THIRD-PARTY-NOTICES.md`).
Text-Sticker: eigene Inhalte. Klassische Meme-Bilder (Filmszenen, Fotos von Personen) sind
urheberrechtlich geschützt und werden deshalb **nicht** mitgeliefert.

**Ausgeschlossen** (im Code geprüft, siehe `scripts/build-memes.js` → `EXCLUDED` und `test/memes.test.js`):
alle Flaggen; religiöse Symbole und Orte; Waffen und Gewalt (inkl. 💀 ☠ 🩸); Drogen, Alkohol und Tabak;
obszöne oder anzügliche Emoji (🖕 🍆 🍑 💦 …); Markenlogos. Emoji mit Personen und Identitäten sind erlaubt.

**Neu bauen:** `node scripts/build-memes.js` (braucht `git`, `ffmpeg` mit libwebp und Internet).
Das Skript sucht die Dateipfade über einen blob-losen Klon (ohne Checkout), lädt die animierten APNGs
(Git LFS) von `media.githubusercontent.com` und die statischen 3D-PNGs von `raw.githubusercontent.com`,
prüft für jeden Sticker die Glyphe in `metadata.json` und konvertiert dann. Der Download-Cache liegt in
`$MEMES_CACHE` (Standard: `<tmp>/livefx-memes-cache`). `--force` kodiert alles neu, `--check` prüft nur
die Liste (ohne Netz). Animationen, die auch mit 5 fps und niedriger Qualität größer als 46 KB bleiben
(58 KB bei Stickern des Reaktionen-Pakets), werden als statisches 3D-Bild gebaut (`animated:false`).

**Eigene Sticker hinzufügen:**
1. *Hochladen* (einfach): Bild über die Asset-Verwaltung im Panel hochladen und als `image`-Trigger mit
   `src: "assets/<name>.webp"` benutzen.
2. *Als Set mitliefern*: Dateien als `memes/<set>/<id>.webp` oder `.png` ablegen (nur `a-z 0-9 _ -`,
   ≤ 60 KB empfohlen). Sie werden dann mit 7 Tagen Cache ausgeliefert und vom Schema als `visual.src`
   akzeptiert (`^memes/[a-z0-9_-]{1,40}/[a-z0-9_-]{1,80}\.(webp|png)$`). Für Fluent-Emoji trägst du eine
   Zeile in `LIST` in `scripts/build-memes.js` ein und baust neu.
   Nur Material mit klarer Lizenz verwenden und die Lizenz in `THIRD-PARTY-NOTICES.md` eintragen.

## Türkçe

**Neler var?** `memes/fluent/` klasöründe **143 tepki stickerı** var: 62 animasyonlu, 81 sabit, WebP
160 px, toplam yaklaşık 3,0 MB. Kaynak: Microsoft Fluent Emoji (MIT). Liste ve DE/TR/EN anahtar kelimeler
`memes/index.json` dosyasında. **„🎞️ Reaktionen (animiert)“** paketi 42 tetikleyici içeriyor (31'i animasyonlu); anahtar
kelimeleri başka hiçbir paketle çakışmıyor. **Kendi yazı stickerlarımız** (`text-tr`, `text-de`, `text-en`):
OHA, YOK ARTIK, AYNEN, EYVAH, HELAL, EFSANE … Bunlar dosya değil, `sticker` yazı stiliyle canlı çiziliyor.

**Lisans:** Fluent Emoji MIT lisanslı (© Microsoft, tam metin `THIRD-PARTY-NOTICES.md` dosyasında). Yazı
stickerları bize ait. Klasik meme görselleri telif hakkıyla korunduğu için pakete eklenmedi.

**Hariç tutulanlar:** bayraklar, dini semboller ve mekânlar, silah ve şiddet, uyuşturucu, alkol ve tütün,
müstehcen emojiler, marka logoları. Bu kurallar kodda ve testlerde kontrol ediliyor.

**Yeniden oluşturma:** `node scripts/build-memes.js` (git, ffmpeg ve internet gerekir).
**Kendi sticker:** dosyayı `memes/<set>/<id>.webp` olarak koy ya da panelden yükle (`assets/…`). Lisansını
`THIRD-PARTY-NOTICES.md` dosyasına yaz.

## English

**What's bundled:** **143 reaction stickers** in `memes/fluent/`: 62 animated and 81 static, WebP 160 px,
about 3.0 MB in total. Source: Microsoft Fluent Emoji (MIT). They are indexed with DE/TR/EN keywords in
`memes/index.json`. The pack **"🎞️ Reaktionen (animiert)"** (`reactions`, 42 triggers, 31 of them animated) has keywords that
collide with no other pack. The **own text stickers** (`text-tr`, `text-de`, `text-en`: GG, W, L, LET'S GO,
NO WAY, SHEESH, CLUTCH, SLAY, BRUH …) are not files. They are rendered live with the text style `sticker`.

**Licences:** Fluent Emoji is MIT, © Microsoft Corporation (full text in `THIRD-PARTY-NOTICES.md`). The text
stickers are our own work. Classic meme images are copyrighted and are **not** bundled.

**Excluded** (enforced in code and tests): flags, religious symbols and places, weapons and violence,
drugs, alcohol and tobacco, obscene or innuendo emoji, brand logos. People and identity emoji are allowed.

**Rebuild:** `node scripts/build-memes.js` (needs git, ffmpeg with libwebp, and network access). Use
`--force` to re-encode everything and `--check` to validate the list offline.
**Add your own:** upload an image in the panel (`assets/<name>`), or drop files into
`memes/<set>/<id>.webp|png` (lower-case `a-z0-9_-`, ≤ 60 KB). Record the licence in
`THIRD-PARTY-NOTICES.md`.
