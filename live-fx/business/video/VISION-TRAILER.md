# LiveFX Vision-Trailer (35 s) · DE · TR · EN

Der Vision-Trailer zeigt die vier Zukunftslinien aus der Vision-Spezifikation (Erzählfilm, Sprachenlernen, VR/AR und Bühne, Auto-Edit). Es gibt ihn in drei Sprachen und zwei Formaten. Alle sechs Fassungen entstehen aus derselben deterministischen HTML-Engine.

| Datei | Sprache | Format | Größe |
|---|---|---|---|
| `LiveFX_Vision_de_9x16.mp4` | Deutsch | 1080 × 1920 | 5,8 MB |
| `LiveFX_Vision_de_16x9.mp4` | Deutsch | 1920 × 1080 | 6,1 MB |
| `LiveFX_Vision_tr_9x16.mp4` | Türkçe | 1080 × 1920 | 5,8 MB |
| `LiveFX_Vision_tr_16x9.mp4` | Türkçe | 1920 × 1080 | 6,0 MB |
| `LiveFX_Vision_en_9x16.mp4` | English | 1080 × 1920 | 5,7 MB |
| `LiveFX_Vision_en_16x9.mp4` | English | 1920 × 1080 | 6,0 MB |

Technik: H.264 (yuv420p, CRF 24, 30 fps), AAC 128 kbit/s Stereo, 35,0 s, `+faststart`. Standbilder für Deck und LinkedIn liegen unter `stills/vision-<sprache>-<format>-<sekunde>s.jpg` (2/8/15/22/29/34 s).

---

## 🇩🇪 Deutsch

### Szenenliste

| Zeit | Linie (Farbe) | Bild | Text auf dem Bildschirm | Ton |
|---|---|---|---|---|
| 0,0–3,0 | Hook (Pink) | Schwarz, pinke Stimm-Wellenform. Schnitt bei 1,5 s | „Was wäre, wenn Worte Bilder machen?“ → „Du redest.“ „Es wird Bild.“ | Beat setzt ein |
| 3,0–11,0 | A · Erzählfilm (Grün) | Kamerarahmen mit Silhouette (Platzhalter), darunter tippt die Transkript-Leiste „Es war Nacht … ein Mädchen ging in den Wald … es begann zu regnen … plötzlich ein Drache!“. Darunter entsteht die Welt: Himmel wird dunkel, Mond und Sterne, Bäume wachsen, ein Mädchen läuft ein, Regen, Badge „Atmo: ☔ Regen“, Blitz, Kamera-Ruck, der Drache erscheint und fliegt los. Erkannte Wörter erscheinen als Chips | „Live aus Worten. Kein Schnitt. Kein Rechenzentrum.“, „☁️ 0,00 €“ | Regen, Donner |
| 11,0–18,0 | B · Sprachen lernen (Gold) | Kind sagt „Apfel“ → Kinderbuch-Karte 🍎 „der Apfel“ (Artikel blau, Silbenbögen, 🔊-Welle), die Karte dreht sich zu „elma“ (TR) und „apple“ (EN). Dann „kedi“ → 🐈 „die Katze“ (Artikel rot) mit Haken „✓ Nachgesprochen“. Pills DE · TR · EN | „Jedes Wort ein Bild. Jede Sprache eine Stimme.“ | Ding je Karte, Erfolgs-Glöckchen |
| 18,0–25,0 | C · VR/AR & Bühne (Hellblau) | Drei Felder klappen auf: LED-Bühne mit „Applaus!“, Konfetti und Bauchbinde · Handy über einem Kinderbuch, der Drache steht im Bild, Parallax-Ebenen wandern beim Kippen, Badge „🎧 Hörbuch“ · Brillen-Umriss mit HUD-Karte „☔ yağmur · Regen“ | „Bühne · Klassenzimmer · Hörbuch · Brille“ | Applaus |
| 25,0–32,0 | D · Auto-Edit (Pink) | „LiveFX Studio“-Fenster: `mein_stream.mp4` fällt hinein, „Höre zu … (lokal)“, Fortschritt, „✓ 42 Ereignisse erkannt“. Die Zeitleiste füllt sich mit Chips (Meme, Szene, Zoom, Schnitt), Klick auf „3 Clips exportieren“, drei 9:16-Clips springen heraus, einer spielt mit Wort-für-Wort-Untertitel und Karte „KRASS!“ | „Video rein. Fertig geschnitten raus. Kein Upload.“ | Whoosh, Klick, Pops |
| 32,0–35,0 | CTA | Vier Farbkacheln (🎬 🍎 🥽 ✂️) fliegen zu einem Ring um das Mikrofon, Logo „LiveFX“ | „Deine Stimme wird zum Video.“ · „Läuft im Browser · DE · TR · EN“ · „Pilot-Partner gesucht: Plattformen · Bildung · Verlage“ · „[Website]“ | Whoosh, Funkeln, Ausblende 2 s |

Alle Linien A–D tragen oben rechts das Badge „VISION“ und eine Vier-Punkte-Fortschrittsanzeige in der Linienfarbe, damit die Reihenfolge auch ohne Ton lesbar ist. Im 9:16-Format stehen keine Texte in den unteren 35 % (Zone für die Bedienelemente der Plattform). Dort laufen nur Bildelemente (Welt, Schallwelle, Clips). Auch im CTA endet die Website-Pille oberhalb dieser Grenze (y ≈ 1196 von 1920, Grenze 1248). Prüfen lässt sich das mit `vision.html?ratio=9x16&safe&t=34.5` (rote Linie). Es gibt keine Plattform-Logos, keine echten Namen und keine Gesichter, nur Silhouetten und Emoji.

### Render-Befehle

```bash
cd live-fx/business/video
node music-vision.js                      # → music-vision.wav (35 s, Musikbett aus music.js + Soundeffekte)
export FFMPEG=/usr/bin/ffmpeg FPS=30 CRF=24
node capture-vision.js 9x16 --lang=de     # → LiveFX_Vision_de_9x16.mp4
node capture-vision.js 16x9 --lang=de     # → LiveFX_Vision_de_16x9.mp4
#   --lang=tr | en für die anderen Sprachen
node capture-vision.js 9x16 --lang=tr --stills          # Standbilder 2/8/15/22/29/34 s
node capture-vision.js 16x9 --lang=en --stills=12.6,30  # eigene Zeiten
```

Vorschau im Browser: `vision.html?ratio=9x16&lang=tr` (läuft in Schleife, `&t=18` springt zu Sekunde 18). Die Engine (`vision-engine.js`) zeichnet jedes Bild als reine Funktion `render(t)` auf *einem* Canvas. Alle Texte stehen im Wörterbuch `DICT` (de/tr/en). Lange Texte werden per Messung (`fitWrap`) verkleinert oder umbrochen, damit nichts überläuft. Benötigt werden Node 22, Playwright (Chromium) und ein ffmpeg mit libx264/AAC. Render-Dauer auf 4 CPUs bei zwei parallelen Jobs (andere Prozesse liefen mit): etwa 3 Minuten pro Fassung, alle sechs in rund 9 Minuten. Chromium läuft mit Software-Canvas (`--disable-gpu`), das ist hier etwa 30-mal schneller als SwiftShader.

### Einsatz

- **Pitch-Deck, Folien 12–15:** 16:9-Fassung einbetten oder verlinken, Standbilder 8 s (A), 15 s (B), 22 s (C), 29 s (D) als Folienbilder.
- **LinkedIn-Post „Vision“:** 16:9 im Feed oder 9:16 als Hochformat. Die TR-Fassung für den türkischen Post.
- **TikTok, Instagram Reels, YouTube Shorts:** 9:16 in der Sprache des Publikums. Die Untertitel-Zone unten ist frei.
- **Gespräche mit Plattformen, Bildung und Verlagen:** Der Trailer zeigt Zukunftsfunktionen, gekennzeichnet mit „VISION“. Er ist ausdrücklich kein Mitschnitt des heutigen Produkts. Die Live-Demo von LiveFX 2.0 zeigt der Haupt-Trailer `LiveFX_Trailer_*.mp4`.
- Vor der Veröffentlichung `[Website]` in `vision-engine.js` (`DICT.*.web`) ersetzen und neu rendern.

### Kompromisse

- Stilisierte Bilderbuch-Grafik aus Canvas-Formen und Noto-Color-Emoji, kein Foto-Realismus. Das ist Absicht und entspricht dem Produktversprechen.
- Der Kamerarahmen in Linie A ist eine Silhouette als Platzhalter für einen späteren echten Clip.
- Die Szenenfolge folgt der Spezifikation (A → B → C → D). Der Hook kombiniert die Frage aus dem Auftrag mit dem Claim aus der Spezifikation. Der CTA sagt „wird zum Video“, wie im Auftrag.
- Kein Sprecher. Die Aussprache in Linie B wird gezeigt (Silben, 🔊-Welle), aber nicht gesprochen. Eine TTS-Spur lässt sich später dazumischen.
- Die Kennzahlen im Bild („42 Ereignisse“, „60 fps“, „0,00 €“) sind illustrativ.

---

## 🇹🇷 Türkçe

### Sahne listesi

| Zaman | Hat (renk) | Görüntü | Ekrandaki metin | Ses |
|---|---|---|---|---|
| 0,0–3,0 | Kanca (pembe) | Siyah ekran, pembe ses dalgası. 1,5 sn'de kesme | “Ya kelimeler resim yapsaydı?” → “Sen anlat.” “Sahne oluşsun.” | Ritim başlar |
| 3,0–11,0 | A · Anlatı filmi (yeşil) | Kamera çerçevesinde siluet (yer tutucu). Altındaki altyazı çubuğunda şu cümleler yazılır: “Geceydi … bir kız ormana gitti … yağmur yağmaya başladı … birden bir ejderha!”. Altında dünya kelime kelime oluşur: gökyüzü kararır, ay ve yıldızlar çıkar, ağaçlar büyür, bir kız yürüyerek gelir, yağmur yağar, “Atmosfer: ☔ Yağmur” rozeti belirir, şimşek çakar, kamera sarsılır, ejderha belirip havalanır. Tanınan kelimeler etiket olarak görünür | “Kelimelerden canlı film. Kurgu yok. Veri merkezi yok.”, “☁️ 0,00 €” | Yağmur, gök gürültüsü |
| 11,0–18,0 | B · Dil öğrenme (altın) | Çocuk “elma” der → çocuk kitabı tarzında kart: 🍎 “elma” (heceler, 🔊 dalgası). Kart dönerek “der Apfel” (DE, artikel mavi) ve “apple” (EN) olur. Ardından “cat” → 🐈 “kedi” ve “✓ Doğru söyledin” işareti. DE · TR · EN rozetleri | “Her kelime bir resim. Her dil bir ses.” | Her kartta “ding”, başarı zili |
| 18,0–25,0 | C · VR/AR ve sahne (açık mavi) | Üç pano sırayla açılır: LED sahne, “Alkış!”, konfeti ve alt bant · Çocuk kitabının üzerinde telefon: ejderha masada duruyor, telefon eğildikçe katmanlar kayar, “🎧 Sesli kitap” rozeti · Gözlük silueti ve HUD kartı “☔ Regen · yağmur” | “Sahne · Sınıf · Sesli kitap · Gözlük” | Alkış |
| 25,0–32,0 | D · Otomatik kurgu (pembe) | “LiveFX Studio” penceresine `yayınım.mp4` düşer, “Dinliyorum … (yerel)”, ilerleme çubuğu, “✓ 42 olay bulundu”. Zaman çizelgesi etiketlerle dolar (Meme, Sahne, Zoom, Kesme), “3 klibi dışa aktar” tıklanır, üç 9:16 klip fırlar. Biri kelime kelime altyazıyla ve “MÜTHİŞ!” kartıyla oynar | “Videoyu bırak. Kurgulanmış klipler çıksın. Yükleme yok.” | Hışırtı, tık, pop |
| 32,0–35,0 | Çağrı (CTA) | Dört renkli kare (🎬 🍎 🥽 ✂️) mikrofonun etrafında halka olur, ardından “LiveFX” logosu | “Sesin videoya dönüşür.” · “Tarayıcıda çalışır · DE · TR · EN” · “Pilot ortaklar arıyoruz: Platformlar · Eğitim · Yayınevleri” · “[Web sitesi]” | Hışırtı, parıltı, 2 sn'de sönme |

A–D hatlarının her birinde sağ üstte “VİZYON” rozeti ve hat renginde dört noktalı bir ilerleme göstergesi var. Böylece sıra sessiz izlerken de anlaşılır. 9:16 formatında alttaki %35'lik alanda yazı yok, çünkü orası platformun düğmelerine ayrılmış. Bu alanda yalnızca görseller (dünya, ses dalgası, klipler) yer alıyor. Çağrı sahnesinde de web sitesi etiketi bu sınırın üstünde bitiyor (1920 pikselin yaklaşık 1196. pikseli, sınır 1248). Kontrol için `vision.html?ratio=9x16&safe&t=34.5` açılabilir (kırmızı çizgi). Platform logosu, gerçek isim ya da yüz kullanılmadı. Görsellerde yalnızca siluetler ve emojiler var.

### Oluşturma komutları

```bash
cd live-fx/business/video
node music-vision.js                      # → music-vision.wav (35 sn, music.js müziği + ses efektleri)
export FFMPEG=/usr/bin/ffmpeg FPS=30 CRF=24
node capture-vision.js 9x16 --lang=tr     # → LiveFX_Vision_tr_9x16.mp4
node capture-vision.js 16x9 --lang=tr     # → LiveFX_Vision_tr_16x9.mp4
node capture-vision.js 9x16 --lang=tr --stills   # 2/8/15/22/29/34. saniyelerden kareler
```

Tarayıcıda önizleme için `vision.html?ratio=9x16&lang=tr` adresini açın. Önizleme döngü halinde oynar, `&t=18` 18. saniyeye atlar. Bütün metinler `vision-engine.js` içindeki `DICT` sözlüğünde. Uzun Türkçe metinler ölçülerek küçültülür ya da alt satıra geçer, böylece taşmaz. Oluşturma süresi (4 CPU, aynı anda 2 iş): sürüm başına yaklaşık 3 dakika, altı sürümün tamamı yaklaşık 9 dakika. Chromium yazılım tabanlı canvas ile (`--disable-gpu`) çalışır, bu ortamda SwiftShader’dan yaklaşık 30 kat daha hızlı.

### Kullanım

- **Sunum, slayt 12–15:** 16:9 sürümü ve 8/15/22/29. saniyelerdeki kareler.
- **LinkedIn'de Türkçe “Vizyon” paylaşımı:** TR sürümü (16:9 ya da 9:16).
- **TikTok, Instagram Reels, YouTube Shorts:** TR 9:16.
- Videoda gösterilenler “VİZYON” etiketli gelecek özelliklerdir, bugünkü ürünün kaydı değildir. LiveFX 2.0'ın canlı demosu ana fragmanda (`LiveFX_Trailer_*.mp4`).
- Yayından önce `[Web sitesi]` alanını `vision-engine.js` (`DICT.tr.web`) içinde değiştirip videoyu yeniden oluşturun.

### Ödünler

- Canvas şekilleri ve Noto Color Emoji ile stilize resimli kitap görünümü kullanıldı, fotogerçekçilik hedeflenmedi. Bu bilinçli bir tercih.
- A hattındaki kamera çerçevesi şimdilik bir siluet, ileride gerçek bir klip gelecek.
- Seslendirme yok. B hattında telaffuz heceler ve 🔊 dalgasıyla gösteriliyor ama seslendirilmiyor.
- Ekrandaki sayılar (“42 olay”, “60 fps”, “0,00 €”) örnek amaçlıdır.

---

## 🇬🇧 English

### Scene list

| Time | Line (colour) | Picture | On-screen text | Sound |
|---|---|---|---|---|
| 0.0–3.0 | Hook (pink) | Black, a pink voice waveform. Cut at 1.5 s | “What if words made pictures?” → “You talk.” “It becomes a scene.” | Beat kicks in |
| 3.0–11.0 | A · Story film (green) | Camera frame with a silhouette (placeholder). Below it, the transcript bar types “It was night … a girl walked into the forest … it started to rain … suddenly, a dragon!”. Underneath, the world builds itself word by word: the sky darkens, moon and stars appear, trees grow, a girl walks in, rain starts, an “Ambience: ☔ Rain” badge pops up, lightning strikes, the camera shakes, and the dragon appears and takes off. Recognised words show up as chips | “Live from words. No editing. No data center.”, “☁️ €0.00” | Rain, thunder |
| 11.0–18.0 | B · Language learning (gold) | A child says “apple” → picture-book card 🍎 “apple” (syllables, 🔊 wave). The card flips to “der Apfel” (DE, article in blue) and “elma” (TR). Then “Katze” → 🐈 “cat” with a “✓ Well said” tick. DE · TR · EN pills | “Every word a picture. Every language a voice.” | Ding per card, success chime |
| 18.0–25.0 | C · VR/AR & stage (light blue) | Three panels fold open: an LED stage with “Applause!”, confetti and a lower third · a phone over a children's book with the dragon standing on the table and parallax layers shifting as the phone tilts, plus an “🎧 Audiobook” badge · a glasses outline with the HUD card “☔ yağmur · rain” | “Stage · Classroom · Audiobook · Glasses” | Applause |
| 25.0–32.0 | D · Auto-edit (pink) | A “LiveFX Studio” window: `my_stream.mp4` drops in, “Listening … (local)”, a progress bar, “✓ 42 moments found”. The timeline fills with chips (Meme, Scene, Zoom, Cut), “Export 3 clips” is clicked, and three 9:16 clips pop out. One plays with word-by-word captions and a “WILD!” card | “Video in. Edited clips out. No upload.” | Whoosh, click, pops |
| 32.0–35.0 | CTA | Four colour tiles (🎬 🍎 🥽 ✂️) fly into a ring around the microphone, followed by the “LiveFX” logo | “Your voice becomes video.” · “Runs in your browser · DE · TR · EN” · “Looking for pilot partners: Platforms · Education · Publishers” · “[Website]” | Whoosh, sparkle, 2 s fade-out |

Lines A–D each carry a “VISION” badge and a four-dot progress indicator in the line colour, so the order reads even with the sound off. In 9:16 there is no text in the bottom 35 %, which is kept clear for platform UI. Only visuals run there (world, sound wave, clips). In the CTA the website pill also ends above that line (y ≈ 1196 of 1920, limit 1248). You can check this with `vision.html?ratio=9x16&safe&t=34.5` (red line). There are no platform logos, no real names and no faces, only silhouettes and emoji.

### Render commands

```bash
cd live-fx/business/video
node music-vision.js                      # → music-vision.wav (35 s, music.js bed + sound effects)
export FFMPEG=/usr/bin/ffmpeg FPS=30 CRF=24
node capture-vision.js 9x16 --lang=en     # → LiveFX_Vision_en_9x16.mp4
node capture-vision.js 16x9 --lang=en     # → LiveFX_Vision_en_16x9.mp4
node capture-vision.js 16x9 --lang=en --stills   # stills at 2/8/15/22/29/34 s
```

To preview in a browser, open `vision.html?ratio=16x9&lang=en`. It loops, and `&t=18` jumps to second 18. Every string lives in the `DICT` object in `vision-engine.js`. Long strings are measured and shrunk or wrapped (`fitWrap`) so they never overflow. Render time on 4 CPUs with 2 jobs in parallel: about 3 minutes per cut, roughly 9 minutes for all six. Chromium runs with a software canvas (`--disable-gpu`), which is about 30 times faster than SwiftShader here.

### Use

- **Pitch deck, slides 12–15:** the 16:9 cut, plus stills at 8/15/22/29 s.
- **LinkedIn “Vision” post:** EN 16:9 in the feed, or 9:16.
- **TikTok, Instagram Reels, YouTube Shorts:** 9:16, in the language of the audience.
- The trailer shows future features, labelled “VISION”. It is not a screen recording of today's product. The live demo of LiveFX 2.0 is in the main trailer (`LiveFX_Trailer_*.mp4`).
- Before publishing, replace `[Website]` in `vision-engine.js` (`DICT.*.web`) and re-render.

### Trade-offs

- The look is a stylised picture book built from canvas shapes and Noto Color Emoji, not photorealism. That is deliberate and matches the product promise.
- The camera frame in line A is a silhouette standing in for a real clip later on.
- There is no voice-over. Pronunciation in line B is shown (syllables, 🔊 wave) but not spoken.
- The on-screen figures (“42 moments”, “60 fps”, “€0.00”) are illustrative.
