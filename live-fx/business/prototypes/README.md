# LiveFX Vision-Prototypen

[Deutsch](#deutsch) · [Türkçe](#türkçe) · [English](#english)

---

## Deutsch

Zwei Klick-Prototypen zur LiveFX-Vision 2027–2029 (siehe `../VISION.md`). Jeder Prototyp ist **eine einzige HTML-Datei**: CSS und JavaScript stehen inline, es gibt keine CDN-Abhängigkeiten, keine externen Requests und kein Konto. Die Oberfläche ist dreisprachig. Oben rechts schaltest du zwischen DE, TR und EN um. Beim ersten Start gilt die Browsersprache, danach merkt sich die Seite die Wahl.

| Datei | Linie | Was der Prototyp zeigt |
|---|---|---|
| `sprachlernen.html` | B · WortBild (Sprachenlernen und Lesehilfe) | Ein gesprochenes oder getipptes Wort erscheint als große Karte: Emoji, Wort in der Zielsprache (bei Deutsch mit farbigem Artikel der/die/das und Silbenbögen), gesagtes Wort, alle drei Sprachen als Leiste, Beispielsatz in Ziel- und Ausgangssprache. Die Aussprache kommt über die Systemstimme (🔊). Es gibt vier Modi: **Übersetzen**, **Lesehilfe** (eigene Sprache, großes Wort mit Silben), **Nachsprechen** (Karte spricht vor, ✓ bei Treffer, keine Noten) und **Quiz** (Bild → Wort sagen oder tippen, mit Trefferzähler). Dazu kommen ein Verlauf der letzten 10 Wörter (Antippen spielt die Aussprache) und „Karteikarten drucken“ (2 × 4 Karten pro A4-Seite). Das Wörterbuch hat 85 Alltagswörter in 10 Kategorien, jeweils auf DE, TR und EN. |
| `live-story.html` | A · Erzählfilm (Generative Scene Engine) | Aus erzähltem Text entsteht fortlaufend eine animierte Szene auf einem Canvas. **Zeit** (Morgen, Tag, Abend, Nacht) steuert Himmel, Sterne, Sonne und Mond. **Wetter** (Regen, Schnee, Gewitter mit Blitzen, Wind, Nebel) steuert Partikel. **Ort** (Wald, Meer, Stadt, Schloss, Wüste, Berge, Dorf, Wiese, Weltraum, Höhle) steuert Silhouetten-Ebenen mit Parallax. **Figuren und Objekte** (22 Figuren, 16 Objekte) treten als Emoji-Sprites auf, laufen ein, fliegen, springen oder schlafen. **Stimmung** (fröhlich, spannend, traurig, gruselig, ruhig) steuert Farbton, Tempo und Vignette, „plötzlich“ löst einen Kamera-Ruck aus. Die Statuszeile zeigt, welches Wort welche Szenen-Entscheidung ausgelöst hat. |

### Starten

- **Doppelklick** auf die HTML-Datei. Sie läuft direkt als `file://` in Chrome, Edge, Firefox und Safari.
- **Mit Mikrofon:** Das Mikro braucht `localhost` oder HTTPS. Am einfachsten im Ordner `business/prototypes` einen lokalen Webserver starten, z. B. `python3 -m http.server 8080` oder `npx serve`, und `http://localhost:8080/sprachlernen.html` bzw. `…/live-story.html` öffnen. Der LiveFX-Server (`node server.js`) liefert bisher nur freigegebene Dateien aus (Allow-List in `server/static.js`). Damit er die Prototypen ausliefert, muss der Pfad `business/prototypes/` dort ergänzt werden.
- **Ohne Mikro testen:**
  - WortBild: „Der Apfel ist rot“, „kediler uyuyor“ oder „I have two dogs“ ins Textfeld tippen.
  - Erzählfilm: einen der Knöpfe DE, TR oder EN drücken. Die Beispielgeschichte wird dann Wort für Wort „vorgelesen“.

### Bedienung Erzählfilm

- **Eingabe:** Enter schließt einen Satz ab. „Vorlesen simulieren“ tippt den Text Wort für Wort. Kulisse und Wetter reagieren schon auf halbe Sätze („schnell“), Figuren und Aktionen erst am Satzende („sicher“).
- **Format:** 16:9 oder 9:16-Band. Im Hochformat ist oben ein Platzhalter für das Kamerabild, die Szene läuft als Band darunter.
- **Seed, „Nochmal abspielen“, Zeitleiste:** Die Zeitleiste lässt sich als JSON exportieren und wieder importieren (Format LTF v1: `{v:1, lang, seed, start, events:[{t, kind, …}]}`). Gleicher Seed plus gleiche Zeitleiste ergeben exakt dasselbe Bild.
- **Aufnehmen (WebM):** zeichnet den Canvas per `MediaRecorder` auf (VP9/VP8, 30 fps) und lädt die Datei herunter.
- **Anzeige:** Bildrate, Skriptzeit pro Frame, Partikelzahl, Qualitätsstufe und „Cloud-Kosten: 0,00 €“, daneben der Weltzustand als Live-JSON.

### Technik in Kürze

- **WortBild:**
  - Erkennung über einen Formen-Index (Map).
  - Türkische Suffix-Abtrennung mit Konsonantenwechsel (`kitabı` → `kitap`, `elmaları` → `elma`).
  - Tippfehler-Toleranz nach Damerau-Levenshtein ≤ 1 ab 5 Zeichen; Groß- und Kleinschreibung sowie ı/i, ş/s, ğ/g, ç/c, ö/o, ü/u werden ignoriert.
  - Im Auto-Modus entscheidet die Trefferzahl pro Sprache.
  - Mehrere Treffer in einem Satz kommen in eine Warteschlange (max. 3, je 1,6 s).
  - Ohne Treffer erscheint keine Karte.
  - Echo-Schutz: Solange die Stimme spricht, werden Mikro-Ergebnisse verworfen.
- **Erzählfilm:**
  - Lexikon mit gut 200 bis 280 Formen pro Sprache (Ort, Zeit, Wetter, Figur, Objekt, Aktion, Stimmung, Steuerwörter wie „hörte auf“/„durdu“/„stopped“, „Ende“/„Son“/„The end“ und Märchenanfänge).
  - Die Szenengrammatik ist deterministisch. Nennt ein Satz eine Natur-Kulisse und ein Bauwerk („Wald … Schloss“), wird die Natur zur Kulisse und das Bauwerk zum Wahrzeichen im Hintergrund.
  - Gerendert wird mit einem Canvas und einer `requestAnimationFrame`-Schleife. Statische Ebenen werden nur bei einem Zustandswechsel offscreen gezeichnet.
  - Partikel kommen aus einem festen Pool (höchstens 600, ohne Allokation pro Frame). Sind 30 Frames in Folge langsamer als 20 ms, sinkt die Partikelzahl automatisch auf 60 %.
  - Emoji-Sprites werden gecacht, Übergänge laufen als Crossfade in 1,5 s.
  - Typische Skriptzeit: unter 1 ms pro Frame (Messung im Test mit Headless-Chromium).

### Grenzen (ehrlich)

- Prototypen, keine Produkte: Es gibt keine Anbindung an `packs.js`, `fx.js` oder den OBS-Overlay-Datenfluss. Diese Integration ist der MVP-Schritt aus `../VISION.md`.
- **Spracherkennung:** Web Speech gibt es nur in Chromium-Browsern und Safari. Im Datei-Modus (`file://`) ist das Mikrofon oft gesperrt, Texteingabe geht immer. Chrome schickt die Audiodaten zur Erkennung an Google-Server, darauf weist die Seite hin. Die Vollversion nutzt dafür den lokalen Offline-Modus.
- **Aussprache:** Sie hängt von den Stimmen des Betriebssystems ab. Fehlt z. B. eine türkische Stimme, steht ein Hinweis da und der Text bleibt sichtbar.
- **Inhalte:**
  - Das Wörterbuch (85 Wörter) und das Szenen-Lexikon sind bewusst klein. Übersetzungen und Beispielsätze müssen vor einem Schuleinsatz fachlich geprüft werden.
  - Emoji sehen je nach Gerät unterschiedlich aus.
  - Mehrdeutige Wörter („Schloss“, „Bank“, „top“) werden nicht aufgelöst.
- **Darstellung:** Der Erzählfilm ist eine stilisierte Bilderbuch-Welt, kein fotorealistisches KI-Video. Genau deshalb läuft er live, deterministisch und auf schwacher Hardware.
- Die Oberfläche hat nur ein dunkles Design.

---

## Türkçe

LiveFX 2027–2029 vizyonu için tıklayarak denenebilen iki prototip (bkz. `../VISION.tr.md`). Her prototip **tek bir HTML dosyası**: CSS ve JavaScript dosyanın içinde, CDN bağımlılığı yok, dış istek yok, hesap gerekmiyor. Arayüz üç dilli. Sağ üstteki DE, TR ve EN düğmeleriyle dil değişir. İlk açılışta tarayıcının dili kullanılır, sonra seçim hatırlanır.

| Dosya | Hat | Prototip neyi gösteriyor |
|---|---|---|
| `sprachlernen.html` | B · Kelime-Resim (dil öğrenme ve okuma desteği) | Söylenen ya da yazılan kelime büyük bir kart olarak çıkar: emoji, hedef dildeki kelime (Almancada renkli artikel der/die/das ve hece yayları ile), söylenen kelime, üç dil yan yana ve hem hedef dilde hem kaynak dilde örnek cümle. Telaffuzu sistem sesi okur (🔊). Dört mod var: **Çeviri**, **Okuma desteği** (kendi dilinde, heceli büyük kelime), **Tekrar et** (kart önce söyler, doğru tekrarda ✓, not yok) ve **Bil bakalım** (resim → kelimeyi söyle ya da yaz, doğru sayacıyla). Bunlara son 10 kelimelik geçmiş (dokununca telaffuz) ve „Kelime kartlarını yazdır“ (A4 sayfasına 2 × 4 kart) eklenir. Sözlükte 10 kategoride 85 günlük kelime var, her biri DE, TR ve EN olarak. |
| `live-story.html` | A · Anlatı Filmi (Generative Scene Engine) | Anlatılan metinden tuval üzerinde kesintisiz, animasyonlu bir sahne oluşur. **Zaman** (sabah, gündüz, akşam, gece) gökyüzünü, yıldızları, güneşi ve ayı belirler. **Hava** (yağmur, kar, şimşekli fırtına, rüzgâr, sis) parçacıkları belirler. **Mekân** (orman, deniz, şehir, kale, çöl, dağlar, köy, çayır, uzay, mağara) paralaks efektli siluet katmanlarını belirler. **Karakterler ve nesneler** (22 karakter, 16 nesne) emoji olarak sahneye girer, uçar, zıplar ya da uyur. **Duygu** (neşeli, gerilimli, hüzünlü, ürkütücü, sakin) renk tonunu, tempoyu ve vinyeti belirler; „birden“ kamerayı sarsar. Durum satırı hangi kelimenin hangi sahne kararını tetiklediğini gösterir. |

### Başlatma

- **Dosyaya çift tıkla.** Chrome, Edge, Firefox ve Safari’de doğrudan `file://` olarak çalışır.
- **Mikrofonla:** Mikrofon için `localhost` ya da HTTPS gerekir. En kolayı `business/prototypes` klasöründe yerel bir web sunucusu başlatmak, örneğin `python3 -m http.server 8080` ya da `npx serve`, ve `http://localhost:8080/sprachlernen.html` veya `…/live-story.html` adresini açmak. LiveFX sunucusu (`node server.js`) şimdilik yalnızca izin verilen dosyaları sunuyor (`server/static.js` içindeki izin listesi). Prototipleri de sunması için `business/prototypes/` yolunun oraya eklenmesi gerekir.
- **Mikrofonsuz deneme:**
  - Kelime-Resim: metin kutusuna „Der Apfel ist rot“, „kediler uyuyor“ ya da „I have two dogs“ yaz.
  - Anlatı Filmi: DE, TR ya da EN düğmesine bas. Örnek hikâye kelime kelime „okunur“.

### Anlatı Filmi’ni kullanma

- **Giriş:** Enter cümleyi bitirir. „Okumayı canlandır“ metni kelime kelime yazar. Dekor ve hava yarım cümleye bile tepki verir („hızlı“), karakterler ve eylemler cümle bitince gelir („güvenli“).
- **Biçim:** 16:9 ya da 9:16 bant. Dikey biçimde üstte kamera görüntüsü için bir yer tutucu var, sahne altında bant olarak akar.
- **Tohum (seed), „Yeniden oynat“, zaman çizelgesi:** Zaman çizelgesi JSON olarak dışa aktarılıp yeniden yüklenebilir (LTF v1 biçimi: `{v:1, lang, seed, start, events:[{t, kind, …}]}`). Aynı tohum ve aynı zaman çizelgesi birebir aynı görüntüyü verir.
- **Kaydet (WebM):** Tuvali `MediaRecorder` ile kaydeder (VP9/VP8, 30 fps) ve dosyayı indirir.
- **Gösterge:** kare hızı, kare başına betik süresi, parçacık sayısı, kalite düzeyi ve „bulut maliyeti: 0,00 €“; yanında canlı JSON olarak dünya durumu.

### Kısaca teknik

- **Kelime-Resim:**
  - Tanıma, biçim dizini (Map) üzerinden çalışır.
  - Türkçe ekler ünsüz değişimiyle birlikte ayrılır (`kitabı` → `kitap`, `elmaları` → `elma`).
  - 5 harften itibaren Damerau-Levenshtein ≤ 1 ile yazım hatası toleransı var; büyük-küçük harf ve ı/i, ş/s, ğ/g, ç/c, ö/o, ü/u farkları dikkate alınmaz.
  - Otomatik modda dili, her dildeki eşleşme sayısı belirler.
  - Bir cümlede birden fazla kelime varsa sıraya girer (en fazla 3, her biri 1,6 sn).
  - Eşleşme yoksa kart çıkmaz.
  - Yankı koruması: Ses konuşurken mikrofon sonuçları dikkate alınmaz.
- **Anlatı Filmi:**
  - Sözlükte dil başına yaklaşık 200–280 biçim var (mekân, zaman, hava, karakter, nesne, eylem, duygu ve „hörte auf“/„durdu“/„stopped“, „Ende“/„Son“/„The end“ gibi kontrol kelimeleri ile masal başlangıçları).
  - Sahne dilbilgisi deterministiktir. Bir cümlede hem doğa mekânı hem yapı geçerse („orman … kale“), doğa dekor olur, yapı arka planda simge yapı olarak görünür.
  - Çizim tek tuval ve tek `requestAnimationFrame` döngüsüyle yapılır. Sabit katmanlar yalnızca durum değişince ekran dışında yeniden çizilir.
  - Parçacıklar sabit bir havuzdan gelir (en fazla 600, karede yeni bellek ayırma yok). Arka arkaya 30 kare 20 ms’den yavaşsa parçacık sayısı otomatik olarak %60’a iner.
  - Emoji görselleri önbellekte tutulur, geçişler 1,5 sn’lik yumuşak geçişle olur.
  - Tipik betik süresi: kare başına 1 ms’nin altında (headless Chromium ile yapılan testte ölçüldü).

### Sınırlar (açıkça)

- Bunlar ürün değil, prototip: `packs.js`, `fx.js` ya da OBS kaplama veri akışına bağlı değiller. Bu entegrasyon `../VISION.tr.md` belgesindeki MVP adımı.
- **Konuşma tanıma:** Web Speech yalnızca Chromium tabanlı tarayıcılarda ve Safari’de var. Dosya modunda (`file://`) mikrofon çoğu zaman engellenir, metinle giriş her zaman çalışır. Chrome sesi tanıma için Google sunucularına gönderir, sayfa bunu belirtir. Tam sürüm bunun için yerel çevrimdışı modu kullanır.
- **Telaffuz:** İşletim sisteminin seslerine bağlı. Örneğin Türkçe ses yoksa bir uyarı çıkar ve metin ekranda kalır.
- **İçerik:**
  - Sözlük (85 kelime) ve sahne sözlüğü bilinçli olarak küçük tutuldu. Okulda kullanılmadan önce çeviriler ve örnek cümleler bir uzman tarafından kontrol edilmeli.
  - Emojiler cihaza göre farklı görünür.
  - Çok anlamlı kelimeler („Schloss“, „Bank“, „top“) ayırt edilmez.
- **Görünüm:** Anlatı Filmi stilize bir resimli kitap dünyası, fotogerçekçi bir yapay zekâ videosu değil. Canlı, deterministik ve zayıf donanımda çalışabilmesinin nedeni de bu.
- Arayüzün yalnızca koyu teması var.

---

## English

Two click-through prototypes for the LiveFX vision 2027–2029 (see `../VISION.en.md`). Each prototype is **a single HTML file**: CSS and JavaScript are inline, with no CDN dependencies, no external requests and no account. The interface is trilingual. Switch between DE, TR and EN at the top right. On first launch the page follows the browser language, after that it remembers your choice.

| File | Line | What the prototype shows |
|---|---|---|
| `sprachlernen.html` | B · WordPicture (language learning and reading help) | A spoken or typed word appears as a large card: emoji, the word in the target language (German with a colour-coded article der/die/das and syllable arcs), the word you said, all three languages side by side, and an example sentence in both the target and the source language. Pronunciation comes from the system voice (🔊). There are four modes: **Translate**, **Reading help** (your own language, big word with syllables), **Repeat after me** (the card speaks first, ✓ on a match, no grades) and **Quiz** (picture → say or type the word, with a score counter). It also has a history of the last 10 words (tap to hear them again) and “Print flashcards” (2 × 4 cards per A4 page). The dictionary holds 85 everyday words in 10 categories, each in DE, TR and EN. |
| `live-story.html` | A · Story Film (Generative Scene Engine) | Narrated text continuously becomes an animated scene on a canvas. **Time** (morning, day, evening, night) drives the sky, stars, sun and moon. **Weather** (rain, snow, thunderstorm with lightning, wind, fog) drives particles. **Place** (forest, sea, city, castle, desert, mountains, village, meadow, space, cave) drives silhouette layers with parallax. **Characters and objects** (22 characters, 16 objects) appear as emoji sprites that walk in, fly, jump or sleep. **Mood** (happy, tense, sad, spooky, calm) drives tint, tempo and vignette; “suddenly” triggers a camera shake. The status line shows which word triggered which scene decision. |

### Getting started

- **Double-click** the HTML file. It runs directly as `file://` in Chrome, Edge, Firefox and Safari.
- **With a microphone:** the mic needs `localhost` or HTTPS. The easiest way is to start a local web server in the `business/prototypes` folder, e.g. `python3 -m http.server 8080` or `npx serve`, and open `http://localhost:8080/sprachlernen.html` or `…/live-story.html`. The LiveFX server (`node server.js`) currently only serves allow-listed files (`server/static.js`). For it to serve the prototypes, the path `business/prototypes/` needs to be added there.
- **Testing without a mic:**
  - WordPicture: type “Der Apfel ist rot”, “kediler uyuyor” or “I have two dogs” into the text box.
  - Story Film: press one of the DE, TR or EN buttons. The sample story is then “read aloud” word by word.

### Using the Story Film

- **Input:** Enter completes a sentence. “Simulate reading” types the text word by word. Backdrop and weather already react to half sentences (“fast”), characters and actions only at the end of the sentence (“safe”).
- **Format:** 16:9 or 9:16 band. In portrait there is a placeholder for the camera feed at the top, with the scene running as a band underneath.
- **Seed, “Replay”, timeline:** The timeline can be exported as JSON and imported again (LTF v1 format: `{v:1, lang, seed, start, events:[{t, kind, …}]}`). The same seed and the same timeline produce exactly the same picture.
- **Record (WebM):** records the canvas via `MediaRecorder` (VP9/VP8, 30 fps) and downloads the file.
- **Readout:** frame rate, script time per frame, particle count, quality level and “cloud cost: €0.00”, with the world state as live JSON next to it.

### Tech in brief

- **WordPicture:**
  - Recognition runs on a word-form index (Map).
  - Turkish suffixes are stripped, including consonant mutation (`kitabı` → `kitap`, `elmaları` → `elma`).
  - Typo tolerance uses Damerau-Levenshtein ≤ 1 from 5 letters up; upper/lower case and ı/i, ş/s, ğ/g, ç/c, ö/o, ü/u are ignored.
  - In auto mode, the number of matches per language decides.
  - Several matches in one sentence go into a queue (max. 3, 1.6 s each).
  - No match means no card.
  - Echo protection: while the voice is speaking, mic results are discarded.
- **Story Film:**
  - A lexicon of roughly 200–280 word forms per language (place, time, weather, character, object, action, mood, plus control words such as “hörte auf”/“durdu”/“stopped”, “Ende”/“Son”/“The end”, and story openings).
  - The scene grammar is deterministic. If a sentence names both a natural setting and a building (“forest … castle”), nature becomes the backdrop and the building becomes a landmark in the background.
  - Rendering uses one canvas and one `requestAnimationFrame` loop. Static layers are drawn offscreen only when the state changes.
  - Particles come from a fixed pool (max. 600, no allocation per frame). If 30 frames in a row take longer than 20 ms, the particle count drops to 60 % automatically.
  - Emoji sprites are cached, and transitions use a 1.5 s crossfade.
  - Typical script time: under 1 ms per frame (measured in the headless Chromium test).

### Limitations (honestly)

- These are prototypes, not products: they are not connected to `packs.js`, `fx.js` or the OBS overlay data flow. That integration is the MVP step in `../VISION.en.md`.
- **Speech recognition:** Web Speech exists only in Chromium browsers and Safari. In file mode (`file://`) the microphone is often blocked, but typing always works. Chrome sends the audio to Google’s servers for recognition, and the page says so. The full version uses the local offline mode for this.
- **Pronunciation:** It depends on the operating system’s voices. If, say, no Turkish voice is installed, a notice appears and the text stays on screen.
- **Content:**
  - The dictionary (85 words) and the scene lexicon are deliberately small. Translations and example sentences need an expert review before use in schools.
  - Emoji look different on different devices.
  - Ambiguous words (“Schloss”, “Bank”, “top”) are not disambiguated.
- **Look:** The Story Film is a stylised picture-book world, not photorealistic AI video. That is exactly why it runs live, deterministically and on weak hardware.
- The interface has a dark theme only.
