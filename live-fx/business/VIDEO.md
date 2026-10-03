# LiveFX – Marketing-Video (Trailer) · Pazarlama videosu · Marketing video

**Sprachen / Diller / Languages:** [Deutsch](#de) · [Türkçe](#tr) · [English](#en)

Der 50-Sekunden-Trailer gibt es in drei Sprachen und zwei Formaten. Alle sechs Dateien entstehen aus **demselben Code**
(`video/trailer.html` + `video/engine.js`), die Sprache wählt `?lang=de|tr|en`.
50 saniyelik tanıtım videosu üç dilde ve iki formatta hazır. · The 50-second trailer exists in three languages and two formats.

## Alle Trailer-Dateien · Tüm dosyalar · All files

| Sprache · Dil · Language | 9:16 (1080×1920) – TikTok, Reels, Shorts | 16:9 (1920×1080) – YouTube, LinkedIn, Website, Deck | Standbilder · Kareler · Stills |
|---|---|---|---|
| 🇩🇪 Deutsch (Master) | `video/LiveFX_Trailer_9x16.mp4` · 17,9 MB | `video/LiveFX_Trailer_16x9.mp4` · 17,8 MB | `video/stills/9x16-*.jpg`, `16x9-*.jpg` |
| 🇹🇷 Türkçe | `video/LiveFX_Trailer_tr_9x16.mp4` · 17,9 MB | `video/LiveFX_Trailer_tr_16x9.mp4` · 17,8 MB | `video/stills/tr-9x16-*.jpg`, `tr-16x9-*.jpg` |
| 🇬🇧 English | `video/LiveFX_Trailer_en_9x16.mp4` · 17,9 MB | `video/LiveFX_Trailer_en_16x9.mp4` · 17,8 MB | `video/stills/en-9x16-*.jpg`, `en-16x9-*.jpg` |

Alle: 50 s, 30 fps, H.264 (`yuv420p`, CRF 20) + AAC 160 kbit/s, `+faststart`, jede Datei < 20 MB.
Standbilder je Format und Sprache bei 2,7 s · 6,9 s · 29,6 s · 48,3 s.

**Vision-Trailer (35 s, Zukunftslinien A–D):** eigene Beschreibung in [`video/VISION-TRAILER.md`](video/VISION-TRAILER.md),
Dateien `video/LiveFX_Vision_de_9x16.mp4`, `LiveFX_Vision_de_16x9.mp4`, `LiveFX_Vision_tr_9x16.mp4`,
`LiveFX_Vision_tr_16x9.mp4`, `LiveFX_Vision_en_9x16.mp4`, `LiveFX_Vision_en_16x9.mp4` (gebaut mit `vision.html` /
`capture-vision.js`). Dieser Trailer hier zeigt, was LiveFX **heute** kann; der Vision-Trailer zeigt, wohin es geht.

---

<a id="de"></a>
## 🇩🇪 Deutsch

### Was die Datei ist

Ein fertiger Trailer, 50 Sekunden, mit Musik, komplett aus Code gerendert, ohne Schnittprogramm. Der Trailer ist eine
HTML-Seite (`trailer.html` + `engine.js`), die für jeden Zeitpunkt `t` deterministisch denselben Frame zeichnet
(`render(t)`). `capture.js` fährt mit Playwright Bild für Bild durch und gibt die Frames an ffmpeg; `music.js`
erzeugt die Musik synthetisch (keine Lizenzfrage). Alle Bildschirmtexte stehen in einem Wörterbuch (`STR` am Anfang
von `engine.js`) mit den Einträgen `de`, `tr` und `en`.

### Was das Video zeigt (deutsche Fassung)

| Zeit | Szene | Inhalt |
|---|---|---|
| 0–4 s | **Hook** | Schwarz → „Live-Untertitel? 🙄“ (wird durchgestrichen) → „Wir machen **LIVE-MEMES.**“ in Neon-Pink mit Flackern. |
| 4–14 s | **Du sagst es – es passiert** | Simuliertes Live-Transkript tippt „das ist **krass** …“ → Meme-Karte 🤯 KRASS! + Konfetti + 🔊 Airhorn. „**yok artık**!“ (Sprach-Badge springt auf Türkçe) → 😱 + Emoji-Regen + Vine-Boom. „**let's go**“ (English) → 🚀 Rakete mit Feuerschweif + Neon-Text LET'S GO. |
| 14–22 s | **3 Sprachen, automatisch** | Drei Karten klappen auf: 🇩🇪 Deutsch (49 Memes), 🇹🇷 Türkçe (85), 🇬🇧 English (50) mit Beispiel-Triggern, Zähler laufen hoch. „Die Sprache wird beim Reden erkannt – kein Umschalten.“ Pills: GIF-Suche (Tenor · Giphy), eigene Memes & Sounds. |
| 22–30 s | **Story-Modus** | „Es **regnete** in der **Nacht**…“ → Nachthimmel, Mond, Sterne, Regen (Canvas) + „🌧️ Atmo: Regen“. „**bir varmış bir yokmuş**…“ → Schloss-Silhouette mit leuchtenden Fenstern + „🦗 Atmo: Grillen · Nachtwind“. Danach ein **echter Screenshot** des LiveFX-Overlays (Nacht-Szene, Hochkant). |
| 30–38 s | **Zuschauer machen mit** | Chat-Blasen `mert_99: !airhorn` → 📣, `lena.streams: !hype` → 🎉 + Konfetti, `ayşe: !gg` → 🎮. Geschenke-Stufen: 1 Gift → Sticker, 10 → Emoji-Regen, 100 → Vollbild-Szene; Geschenk-Regen. |
| 38–44 s | **Überall, wo du live gehst** | **Echter Screenshot** des Control-Panels im Monitor-Rahmen, blendet über zum **echten Overlay-Screenshot** (KRASS!-Karte in OBS). Text-Badges Instagram Live · TikTok LIVE · YouTube Live · Twitch (nur Text, keine Logos), darunter: Handy als Fernbedienung, 4 Looks, läuft offline, Sounds ohne Lizenz-Risiko. |
| 44–50 s | **CTA** | 🎬 LiveFX – „Deine Stimme wird zum Effekt.“ – `livefx.app` (Platzhalter) – „Pilot-Partner gesucht: TikTok · Meta · YouTube“ – Fade to black, Musik blendet aus. |

### Was sich in der türkischen und englischen Fassung ändert

Bild, Timing, Musik und Effekte sind identisch; nur Texte und das simulierte Transkript wechseln. In der deutschen
Fassung springt das Transkript zwischen den Sprachen (Deutsch → Türkçe → English), um die automatische Erkennung zu
zeigen. In TR und EN spricht die Streamerin durchgehend die Zielsprache, mit Memes aus den echten Paketen:

| Stelle | 🇩🇪 Deutsch | 🇹🇷 Türkçe | 🇬🇧 English |
|---|---|---|---|
| Hook | Live-Untertitel? 🙄 → Wir machen LIVE-MEMES. | Canlı altyazı mı? 🙄 → Biz CANLI MEME yapıyoruz. | Live captions? 🙄 → We do LIVE MEMES. |
| Transkript 1 | „das ist **krass** …“ → 🤯 KRASS! | „bu çok fena … **efsane**!“ → 🏆 EFSANE! | „that's insane … **wild**!“ → 🤯 WILD! |
| Transkript 2 | „**yok artık**!“ → 😱 YOK ARTIK! | „**yok artık**!“ → 😱 YOK ARTIK! | „**oh my god**!“ → 😱 OMG |
| Transkript 3 | „**let's go**“ → 🚀 LET'S GO! | „**hadi bakalım**!“ → 🚀 HADİ BAKALIM! | „**let's go**!“ → 🚀 LET'S GO! |
| Story 1 | „Es **regnete** in der **Nacht**…“ | „**Gece** **yağmur yağıyordu**…“ | „It was **raining** at **night**…“ |
| Story 2 | „**bir varmış bir yokmuş**…“ | „**bir varmış bir yokmuş**…“ | „**once upon a time**…“ |
| CTA | LiveFX – Deine Stimme wird zum Effekt. · Pilot-Partner gesucht | LiveFX – Sesin efekte dönüşür. · Pilot ortaklar arıyoruz | LiveFX – Your voice becomes the effect. · Looking for pilot partners |

Die drei Screenshots sind echte Aufnahmen von LiveFX. Die beiden Overlay-Screenshots gibt es je Sprache: DE
„KRASS!“-Karte und Story-Szene „Es war einmal in der Nacht…“ (`overlay-card.jpg`, `overlay-story.jpg`), TR „EFSANE!“ und
„Gece yağmur yağıyordu…“ (`overlay-card.tr.jpg`, `overlay-story.tr.jpg`), EN „WILD!“ und „It was raining at night…“
(`overlay-card.en.jpg`, `overlay-story.en.jpg`). `engine.js` lädt die Datei der gewählten Sprache und fällt auf das
deutsche Bild zurück, wenn sie fehlt. Das Control-Panel hat noch keine übersetzte Oberfläche, deshalb zeigt `panel.jpg`
in allen Fassungen die deutsche Oberfläche (wird beim Überblenden ab 41,2 s vom Overlay-Screenshot abgelöst). Längere türkische und englische Texte haben im Wörterbuch eigene
Schriftgrößen (`sz`), damit nichts überläuft; ein automatischer Test hat alle Frames beider Formate geprüft.

Palette wie im Panel: Hintergrund `#0f1115`, Neon-Pink `#ff2d75`, Neon-Grün `#2dffb5`, Gold `#ffd166`.
Schrift: Lexend (inkl. Latin-Extended für ğ ş ı İ, liegt in `video/assets/`), Emojis aus Noto Color Emoji.
Keine Logos von Plattformen als Bild, keine echten Namen (Chat-Namen sind erfunden).

### Neu rendern

Voraussetzungen: Node 22, Playwright mit Chromium, ein **vollständiges ffmpeg** mit libx264 + AAC (`apt-get install ffmpeg`
→ `/usr/bin/ffmpeg`). Das von Playwright mitgelieferte ffmpeg ist ein Minimal-Build (nur VP8/WebM) und kann die
Trailer **nicht** rendern.

```bash
cd live-fx/business/video
export FFMPEG=/usr/bin/ffmpeg
node music.js                      # music.wav (60 s, 100 BPM, Peak 0,5) – nur nötig, wenn gelöscht/geändert
node capture.js 9x16               # → LiveFX_Trailer_9x16.mp4      (Deutsch, wie bisher)
node capture.js 16x9               # → LiveFX_Trailer_16x9.mp4
node capture.js 9x16 --lang=tr     # → LiveFX_Trailer_tr_9x16.mp4
node capture.js 16x9 --lang=tr     # → LiveFX_Trailer_tr_16x9.mp4
node capture.js 9x16 --lang=en     # → LiveFX_Trailer_en_9x16.mp4
node capture.js 16x9 --lang=en     # → LiveFX_Trailer_en_16x9.mp4
node capture.js 9x16 --lang=tr --stills        # 4 Key-Frames → stills/tr-9x16-<t>s.jpg
node capture.js 16x9 --stills=12.8,25.5        # eigene Zeitpunkte (Deutsch → stills/16x9-<t>s.jpg)
```

Ohne `--lang` (oder mit `--lang=de`) verhält sich `capture.js` exakt wie vorher: gleiche Dateinamen, gleiche Frames.
Ein Durchlauf dauert mit Software-Rendering (SwiftShader) etwa 7 Minuten ohne Last, 20–30 Minuten, wenn parallel weitere Renderings laufen, pro Datei. Höchstens zwei Renderings
gleichzeitig starten (4 CPUs). Render-Einstellungen: 30 fps, libx264, `-crf 20 -preset medium`, `yuv420p`,
`+faststart`; Audio AAC 160 kbit/s, `-shortest`, Fade-out in den letzten 2 Sekunden. Umgebungsvariablen: `FPS`,
`CRF`, `PRESET` (z. B. `FPS=24` für einen schnelleren Testlauf).

**Live-Vorschau im Browser:** `trailer.html?ratio=9x16&lang=tr` (läuft in Schleife), `&t=22` springt zu Sekunde 22.
**Texte ändern:** nur im Wörterbuch `STR` in `engine.js` (`de` / `tr` / `en`); Timing steht in den `scene(a, b, …)`-Blöcken.
**Neue Sprache:** einen weiteren Eintrag in `STR` anlegen (z. B. `uk`), in `LANG` und in `capture.js` freischalten.

Screenshots neu machen (Panel + Overlay vom laufenden Server):

```bash
PORT=8799 node live-fx/server.js &      # dann mit Playwright index.html bzw. overlay.html?theme=neon öffnen,
# Effekt auslösen: window.livefx.renderer.fire({ visual:{ kind:'card', emoji:'🤯', text:'KRASS!' } })
# und als JPEG (Qualität 80) nach video/assets/ speichern: panel.jpg, overlay-card.jpg, overlay-story.jpg
# TR/EN: dasselbe mit 🏆 EFSANE! / 🤯 WILD! und der Szene 'night' mit „Gece yağmur yağıyordu…“ /
# „It was raining at night…“ → overlay-card.tr.jpg, overlay-story.tr.jpg, overlay-card.en.jpg, overlay-story.en.jpg
# (Karte 1280×720; Story hochkant, TR/EN in 720×1280, damit „yağıyordu…“ nicht umbricht)
```

### Echte Stream-Aufnahmen einbauen

1. Clip (MP4/WebM, ≤ 3 s, Hochkant für 9:16, Quer für 16:9) nach `video/assets/` legen, z. B. `assets/clip-krass.mp4`.
2. In `engine.js` im `.frame`-Rahmen statt `<img>` ein `<video muted>` einsetzen und in `update(t)`
   `video.currentTime = clamp(t - startZeit, 0, video.duration)` setzen; in `capture.js` vor jedem `shot()` auf
   das `seeked`-Event warten (`await p.evaluate(() => window.SEEKED)`).
3. Empfohlene Stellen: 12,6–14 s, 28,5–30 s (Story-Screenshot), 41,2–44 s (Overlay im Monitor-Rahmen).
4. Aufnahme-Tipp: `demo.html` im LiveFX-Server nimmt Kamera + Overlay direkt als 9:16/16:9-Video auf
   (siehe `docs/DEMO-CLIP.md`). Für die TR- und EN-Fassung Clips in der jeweiligen Sprache aufnehmen.

### Wo hochladen (Deutsch)

| Kanal | Datei | Hinweis |
|---|---|---|
| TikTok, Instagram Reels/Story, YouTube Shorts (DACH) | `LiveFX_Trailer_9x16.mp4` | Hook (erste 2 s) nicht beschneiden; Safe-Zone unten eingehalten (Transkript-Leiste bei 78–84 %). Shorts-Titel mit „#Shorts“. |
| Türkischsprachige Community in DE/AT/CH und Türkei | `LiveFX_Trailer_tr_9x16.mp4` | Eigener Post statt Untertitel – die türkische Fassung spricht Türkisch. |
| YouTube, Website, LinkedIn (DE) | `LiveFX_Trailer_16x9.mp4` | Nativ hochladen (Autoplay); Thumbnail `stills/16x9-6_9s.jpg` oder `48_3s`. |
| Internationale Plattform-Pitches (TikTok, Meta, YouTube) | `LiveFX_Trailer_en_16x9.mp4` + `_en_9x16.mp4` | Zusammen mit `LiveFX_Pitch_EN.pptx`; danach den Vision-Trailer `LiveFX_Vision_en_16x9.mp4`. |
| Pitch-Deck | DE → `LiveFX_Pitch.pptx`, TR → `LiveFX_Pitch_TR.pptx`, EN → `LiveFX_Pitch_EN.pptx` | Je Deck die Trailer-Fassung derselben Sprache einbetten (Folie 4). |

### Bildunterschrift (Deutsch)

> Live-Untertitel? 🙄 Wir machen LIVE-MEMES. LiveFX hört dir beim Streamen zu und zeigt sofort das passende Meme,
> den Emoji-Regen oder den Sound – ohne Klick, auf Deutsch, Türkisch und Englisch. Story-Modus für Vorlese-Streams,
> Zuschauer lösen Effekte per Chat oder Geschenk aus. Läuft mit OBS auf Instagram, TikTok, YouTube und Twitch.
> Pilot-Partner gesucht. #LiveFX #Livestream #Memes #OBS #TikTokLIVE #CreatorTools

### Technische Daten / Kompromisse

- Dauer 50 s, 30 fps, jede Datei < 20 MB. Musik: synthetischer Loop (Am–F–C–G, 100 BPM), Peak ≤ 0,5 (−6 dBFS),
  Platz für ein Voice-over. Die Musik ist sprachneutral und für alle drei Fassungen gleich.
- Keine Sprachaufnahme, keine echten Stream-Clips: Transkript, Karten und Regen sind nachgebaut; echt sind nur die
  Screenshots (Overlay je Sprache, Control-Panel deutsch).
- Plattformen erscheinen nur als Text-Badges. `livefx.app` ist ein Platzhalter – vor dem Veröffentlichen gegen die
  echte Domain tauschen (Szene 6 in `engine.js`).
- Die deutsche Fassung ist nach dem Umbau auf das Wörterbuch Bild für Bild unverändert (Pixelvergleich vorher/nachher
  an 30 Frames (15 Zeitpunkte × 2 Formate): 23 bitgleich, 7 mit höchstens 196 von 2 073 600 Pixeln um ±1 Farbwert – dasselbe Rauschen wie zwischen zwei
  Läufen desselben Codes, verursacht durch das Software-Rendering der Funken-Gradienten).

---

<a id="tr"></a>
## 🇹🇷 Türkçe

### Bu dosya nedir?

50 saniyelik, müzikli, hazır bir tanıtım videosu. Tamamen koddan üretildi, kurgu programı gerekmedi. Video aslında bir
HTML sayfası (`trailer.html` + `engine.js`): her `t` anı için hep aynı kareyi çizer (`render(t)`). `capture.js`
Playwright ile kareleri tek tek alıp ffmpeg'e verir; `music.js` müziği sentetik olarak üretir (lisans sorunu yok).
Ekrandaki tüm yazılar `engine.js`'in başındaki sözlükte (`STR`) durur: `de`, `tr`, `en`.

### Türkçe videoda ne var?

| Zaman | Sahne | İçerik |
|---|---|---|
| 0–4 sn | **Kanca** | Siyah ekran → „Canlı altyazı mı? 🙄“ (üstü çizilir) → „Biz **CANLI MEME** yapıyoruz.“ – neon pembe, titreyerek. |
| 4–14 sn | **Sen söylersin – olur** | Canlı transkript yazıyor: „bu çok fena … **efsane**!“ → 🏆 EFSANE! kartı + konfeti + 🔊 Airhorn. „**yok artık**!“ → 😱 + emoji yağmuru + Vine-Boom. „**hadi bakalım**!“ → 🚀 alevli roket + neon yazı HADİ BAKALIM!. Dil rozeti: Türkçe. |
| 14–22 sn | **3 dil. Otomatik.** | Üç kart açılır: 🇩🇪 Deutsch (49 meme), 🇹🇷 Türkçe (85), 🇬🇧 English (50), örnek tetikleyicilerle; sayaçlar yükselir. „Dil, sen konuşurken kendiliğinden tanınır.“ Altında: GIF arama (Tenor · Giphy), kendi meme ve seslerin. |
| 22–30 sn | **Hikâye modu** | „**Gece** **yağmur yağıyordu**…“ → gece göğü, ay, yıldızlar, yağmur + „🌧️ Ortam sesi: Yağmur“. „**bir varmış bir yokmuş**…“ → pencereleri yanan şato silueti + „🦗 Ortam sesi: Cırcır böceği · Gece rüzgârı“. Ardından LiveFX katmanından **gerçek bir ekran görüntüsü**. |
| 30–38 sn | **İzleyiciler de oyunda** | Sohbet balonları `mert_99: !airhorn` → 📣, `lena.streams: !hype` → 🎉, `ayşe: !gg` → 🎮. Hediye seviyeleri: 1 hediye → Çıkartma, 10 → Emoji yağmuru, 100 → Tam ekran sahne. |
| 38–44 sn | **Canlı yayın nerede, LiveFX orada** | Kontrol panelinin ve OBS'teki katmanın **gerçek ekran görüntüleri**; Instagram Live · TikTok LIVE · YouTube Live · Twitch (yalnızca yazı, logo yok); telefonun uzaktan kumanda olur, 4 tema, tamamen çevrimdışı, lisans derdi olmayan sesler. |
| 44–50 sn | **Kapanış** | 🎬 LiveFX – „Sesin efekte dönüşür.“ – `livefx.app` (yer tutucu) – „Pilot ortaklar arıyoruz: TikTok · Meta · YouTube“ – kararma, müzik kısılır. |

Not: Ekran görüntüleri LiveFX'ten alınmış gerçek görüntülerdir. Türkçe videodaki iki katman görüntüsü de Türkçedir:
„EFSANE!“ kartı (`overlay-card.tr.jpg`) ve „Gece yağmur yağıyordu…“ yazılı hikâye sahnesi (`overlay-story.tr.jpg`).
Bir dosya eksikse `engine.js` Almanca görüntüyü kullanır. Kontrol panelinin henüz Türkçe arayüzü olmadığı için panel
görüntüsü (`panel.jpg`) Almancadır; 41,2. saniyeden itibaren yerini katman görüntüsüne bırakır. Türkçe metinler daha uzun olduğu için sözlükte kendi yazı boyutları (`sz`) var; tüm kareler
otomatik olarak taşma kontrolünden geçti. Türkçe karakterler (ç ğ ı İ ö ş ü) Lexend yazı tipinde eksiksiz görünür.

### Yeniden oluşturma

```bash
cd live-fx/business/video
export FFMPEG=/usr/bin/ffmpeg
node capture.js 9x16 --lang=tr     # → LiveFX_Trailer_tr_9x16.mp4
node capture.js 16x9 --lang=tr     # → LiveFX_Trailer_tr_16x9.mp4
node capture.js 9x16 --lang=tr --stills   # 4 kare → stills/tr-9x16-<t>s.jpg
```

Tarayıcıda önizleme: `trailer.html?ratio=9x16&lang=tr`, `&t=22` ile 22. saniyeye atlanır. Bir dosya yazılımsal
çizimle yaklaşık 7 dakika (yük yokken; başka işlemler varken 20–30 dakika) sürer; aynı anda en fazla iki işlem başlatın. Metinleri değiştirmek için yalnızca
`engine.js`'teki `STR.tr` bölümünü düzenleyin.

### Nereye yüklenmeli?

| Kanal | Dosya | Not |
|---|---|---|
| TikTok, Instagram Reels/Hikâye, YouTube Shorts (Türkiye ve Avrupa'daki Türkçe konuşan topluluk) | `LiveFX_Trailer_tr_9x16.mp4` | İlk 2 saniyeyi (kanca) kırpmayın; alttaki güvenli alan korunuyor. Shorts başlığına „#Shorts“ ekleyin. |
| YouTube, web sitesi, LinkedIn (Türkçe) | `LiveFX_Trailer_tr_16x9.mp4` | Doğrudan yükleyin (otomatik oynatma); küçük resim `stills/tr-16x9-6_9s.jpg` veya `48_3s`. |
| Türkçe sunum | `LiveFX_Pitch_TR.pptx` | 4. slayta Türkçe videoyu yerleştirin; ardından vizyon videosu `LiveFX_Vision_tr_16x9.mp4`. |

### Paylaşım metni (Türkçe)

> Canlı altyazı mı? 🙄 Biz CANLI MEME yapıyoruz. LiveFX yayında seni dinler; „yok artık!“ dediğin anda doğru
> meme'i, emoji yağmurunu ya da sesi ekrana getirir – hiçbir tuşa basmadan. Türkçe, Almanca ve İngilizce otomatik.
> Masal okuyanlar için hikâye modu, izleyiciler sohbetten ya da hediyeyle efekt tetikler. OBS ile Instagram,
> TikTok, YouTube ve Twitch'te çalışır. Pilot ortaklar arıyoruz.
> #LiveFX #CanlıYayın #Meme #TikTokLIVE #YayıncıAraçları

### Teknik bilgiler

- Süre 50 sn, 30 fps, her dosya 20 MB'tan küçük; müzik her üç dilde aynı (sentetik, 100 BPM, −6 dBFS tepe).
- Ses kaydı ve gerçek yayın klibi yok; transkript, kartlar ve yağmur canlandırmadır, gerçek olan yalnızca üç ekran
  görüntüsüdür. `livefx.app` bir yer tutucudur, yayından önce gerçek alan adıyla değiştirilmelidir.

---

<a id="en"></a>
## 🇬🇧 English

### What this is

A finished 50-second trailer with music, rendered entirely from code – no editing software involved. The trailer is an
HTML page (`trailer.html` + `engine.js`) that deterministically draws the same frame for every time `t`
(`render(t)`). `capture.js` steps through it frame by frame with Playwright and pipes the frames into ffmpeg;
`music.js` synthesises the music (no licensing issues). Every on-screen text lives in a dictionary (`STR` at the top
of `engine.js`) with the entries `de`, `tr` and `en`.

### What the English version shows

| Time | Scene | Content |
|---|---|---|
| 0–4 s | **Hook** | Black → “Live captions? 🙄” (struck through) → “We do **LIVE MEMES.**” in flickering neon pink. |
| 4–14 s | **You say it – it happens** | The simulated live transcript types “that's insane … **wild**!” → meme card 🤯 WILD! + confetti + 🔊 Airhorn. “**oh my god**!” → 😱 OMG + emoji rain + Scratch. “**let's go**!” → 🚀 rocket with a flame trail + neon LET'S GO!. Language badge: English. |
| 14–22 s | **3 languages. Automatic.** | Three cards flip open: 🇩🇪 Deutsch (49 memes), 🇹🇷 Türkçe (85), 🇬🇧 English (50) with sample triggers, counters run up. “The language is detected while you talk – no switching.” Pills: GIF search (Tenor · Giphy), your own memes & sounds. |
| 22–30 s | **Story mode** | “It was **raining** at **night**…” → night sky, moon, stars, rain + “🌧️ Ambience: rain”. “**once upon a time**…” → castle silhouette with glowing windows + “🦗 Ambience: crickets · night wind”. Then a **real screenshot** of the LiveFX overlay. |
| 30–38 s | **Viewers join in** | Chat bubbles `mert_99: !airhorn` → 📣, `lena.streams: !hype` → 🎉, `ayşe: !gg` → 🎮. Gift tiers: 1 gift → sticker, 10 → emoji rain, 100 → full-screen scene. |
| 38–44 s | **Wherever you go live** | **Real screenshots** of the control panel and of the overlay in OBS; text badges Instagram Live · TikTok LIVE · YouTube Live · Twitch (text only, no logos); your phone as a remote, 4 looks, runs fully offline, sounds with no licensing risk. |
| 44–50 s | **CTA** | 🎬 LiveFX – “Your voice becomes the effect.” – `livefx.app` (placeholder) – “Looking for pilot partners: TikTok · Meta · YouTube” – fade to black, music fades out. |

Note: the screenshots are real captures of LiveFX. Both overlay shots in the English version are in English: the
“WILD!” card (`overlay-card.en.jpg`) and the story scene reading “It was raining at night…” (`overlay-story.en.jpg`).
If a file is missing, `engine.js` falls back to the German shot. The control panel has no translated interface yet, so
the panel shot (`panel.jpg`) shows the German interface; from 41.2 s it cross-fades to the overlay shot. Longer English and Turkish strings have their own font sizes in the dictionary (`sz`); an automated
check covered every frame of both formats for overflow.

### Re-rendering

```bash
cd live-fx/business/video
export FFMPEG=/usr/bin/ffmpeg
node capture.js 9x16 --lang=en     # → LiveFX_Trailer_en_9x16.mp4
node capture.js 16x9 --lang=en     # → LiveFX_Trailer_en_16x9.mp4
node capture.js 9x16 --lang=en --stills   # 4 key frames → stills/en-9x16-<t>s.jpg
```

Browser preview: `trailer.html?ratio=16x9&lang=en`, `&t=22` jumps to second 22. With software rendering one file
takes about 7 minutes when idle (20–30 minutes while other renders run); run at most two renders at a time. To change wording, edit only `STR.en` in `engine.js`.

### Where to upload

| Channel | File | Note |
|---|---|---|
| TikTok, Instagram Reels/Stories, YouTube Shorts (international) | `LiveFX_Trailer_en_9x16.mp4` | Don't trim the first 2 s (hook); the bottom safe zone is respected. Add “#Shorts” to the Shorts title. |
| YouTube, website, LinkedIn (international) | `LiveFX_Trailer_en_16x9.mp4` | Upload natively (autoplay); thumbnail `stills/en-16x9-6_9s.jpg` or `48_3s`. |
| Platform pitches (TikTok, Meta, YouTube) | `_en_16x9` + `_en_9x16` | Together with `LiveFX_Pitch_EN.pptx`; follow up with the vision trailer `LiveFX_Vision_en_16x9.mp4`. |

### Caption (English)

> Live captions? 🙄 We do LIVE MEMES. LiveFX listens while you stream and instantly drops the matching meme,
> emoji rain or sound effect – hands-free, in English, German and Turkish. Story mode for read-aloud streams;
> viewers trigger effects via chat or gifts. Works with OBS on Instagram, TikTok, YouTube and Twitch.
> Looking for pilot partners. #LiveFX #Livestream #Memes #OBS #TikTokLIVE #CreatorTools

### Technical notes

- 50 s, 30 fps, every file under 20 MB; the music is the same in all three versions (synthetic, 100 BPM, −6 dBFS peak).
- No voice recording and no real stream clips: transcript, cards and rain are recreated; only the three screenshots
  are real. `livefx.app` is a placeholder – swap in the real domain before publishing.
