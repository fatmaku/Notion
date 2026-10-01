# İki Roman – Buchtrailer-Renderpipeline

Trailer für das Kunstprojekt **YOLCU** (Tuncay Sancak) und **ŞAHİT** (Mustafa Sefa Güvenir):
zwei eigenständige Romane, zusammen gelesen erscheint eine dritte Geschichte; die beiden Cover treffen sich im Faustgruß.

Alles in diesem Ordner ist eigenständig; die bestehende Engine in `deniz-trailer/` wurde nur als Vorbild genutzt
(Playwright-Frame-für-Frame-Capture, JPEG-Pipe nach ffmpeg, `window.render(t)` / `window.DUR`, `--stills`).

**Hinweise vorab**

- **Musik ist ein generierter Platzhalter** (`music_dark.py`, numpy-Synthese). Sie hält die Schlag-/Impact-Zeiten des
  Schnitts, ist aber kein lizenziertes Musikstück. Vor der Veröffentlichung durch lizenzierte Musik ersetzen
  (gleiche Datei-Namen `music_60.wav` / `music_30.wav`, dann `render_all.sh` erneut laufen lassen; das Muxen kopiert
  den Videostream, es wird nichts neu gerendert, wenn man nur die Mux-Zeile ausführt).
- **Kein Voice-over.** Der Trailer arbeitet nur mit Text auf dem Bild. Das VO-Skript gehört ins Marketing-Dokument
  (`../marketing/Marketing_DE.md`), nicht in diese Pipeline.
- Die Titel-/Autorentypografie stammt aus den Coverdateien (`../assets/upscaled/*_front.png`) und bleibt in allen
  Sprachen türkisch. Die eBook-Cover für die Endkarte kommen aus `../cover/out/{SA,BY}/TR/eBook-Cover.jpg`.

## Ausgabe (9 Videos + 9 SRT + Storyboard)

| Format | Auflösung | Dauer | Datei |
|---|---|---|---|
| 16x9 | 1920 × 1080 | 60 s | `out/Iki_Roman_Fragman_16x9_60s_{TR,EN,DE}.mp4` |
| 9x16 | 1080 × 1920 | 30 s | `out/Iki_Roman_Fragman_9x16_30s_{TR,EN,DE}.mp4` |
| 1x1 | 1080 × 1080 | 30 s | `out/Iki_Roman_Fragman_1x1_30s_{TR,EN,DE}.mp4` |

30 fps, H.264 (libx264, preset slow, crf 18, yuv420p), AAC 160 kb/s, `+faststart`.
Untertitel gleichnamig als `.srt`, Storyboard-Stills in `out/storyboard/<format>_<lang>_t<sek>.jpg`,
Metadaten-Prüfung in `out/render_report.txt`.

## Dateien

| Datei | Zweck |
|---|---|
| `engine2.html` | Die Trailer-Engine: eine HTML-Seite, die pro Zeitpunkt `t` ein Bild aufbaut. URL-Parameter: `?capture&format=16x9|9x16|1x1&lang=tr|en|de[&cut=60|30][&t=12.5]`. Ohne `?capture` läuft eine Echtzeit-Vorschau im Browser (Leertaste = Pause, ←/→ = ±1 s; `&t=…` startet pausiert an dieser Stelle). |
| `config/tr.js`, `config/en.js`, `config/de.js` | Texte und Zeitleisten (60-s- und 30-s-Schnitt). Setzen `window.CFG`; auch von `make_srt.py` gelesen. Die Zeitleisten sind in allen drei Dateien identisch. |
| `capture2.js` | Playwright-Treiber: Chromium mit Viewport je Format, deterministische Uhr, JPEG-Frames (Qualität 90) per Pipe in ffmpeg (libx264). `--stills` schreibt Storyboard-JPEGs. |
| `music_dark.py` | Platzhalter-Score (dunkles Drone/Pad, Sub-Puls, Metallschläge, Swell, Impact, ruhiger Ausklang, 2 s Fade-out, Peaks ≤ −1 dBFS). |
| `make_srt.py` | Schreibt die 9 SRT-Dateien aus den Config-Zeitleisten. |
| `render_all.sh` | Gesamtlauf: Musik → SRT → 9 Videos (2 parallel) → Stills → Report. |
| `fonts/` | Cinzel 400/700/900, Literata 400/400i/600/700 (OFL, mit türkischen Glyphen). |
| `out/` | Ergebnisse. `out/tmp/` enthält die Render-Logs pro Variante. |

Vorlagen und Bilder werden relativ referenziert (`../assets/upscaled/`, `../cover/out/`, `fonts/`); der Ordner
muss also innerhalb von `iki-roman/` bleiben.

## Befehle

```bash
cd /home/user/Notion/iki-roman/trailer

# Alles rendern (Musik, SRT, 9 Videos zu je 2 parallel, Stills, Report). Dauer auf 4 CPUs ≈ 30 min.
./render_all.sh
#   Varianten einschränken: FORMATS="16x9" LANGS="tr" ./render_all.sh      Parallelität: JOBS=3 ./render_all.sh

# Einzelne Bausteine
python3 music_dark.py --dur 60 --knocks 1.0,1.8,2.6,34.0,34.8,35.6 --impact 47.0 --end 53.0 --out music_60.wav
python3 music_dark.py --dur 30 --knocks 0.7,1.3,1.9,17.0,17.6,18.2 --impact 23.0 --end 26.0 --out music_30.wav
python3 make_srt.py                                  # -> out/*.srt

# Ein Video ohne Ton rendern (Frame-Bereich optional: --from 1260 --to 1350 = Frames, nicht Sekunden)
/opt/node22/bin/node capture2.js --page engine2.html --format 16x9 --lang tr --out out/tmp/x_silent.mp4 --fps 30

# Musik dazumischen (Video wird kopiert, nicht neu kodiert)
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
$FF -y -i out/tmp/x_silent.mp4 -i music_60.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart out/Iki_Roman_Fragman_16x9_60s_TR.mp4

# Storyboard-Stills an den Szenenmarken (Sekunden) -> out/storyboard/16x9_tr_t<sek>.jpg
/opt/node22/bin/node capture2.js --page engine2.html --format 16x9 --lang tr --stills 2,5,9,14,18,23,28,30,33,38,43,47,50,56
/opt/node22/bin/node capture2.js --page engine2.html --format 9x16 --lang tr --stills 2,5,9,13,17,20,23,25,28

# Vorschau im Browser (Echtzeit, ohne Capture)
xdg-open "engine2.html?format=16x9&lang=de"
```

`capture2.js` nutzt standardmäßig Chromiums Software-Compositing (`--disable-gpu`); das ist auf dieser Maschine
2,5–3× schneller als der SwiftShader-Pfad der alten Engine (`--swiftshader` schaltet ihn wieder ein).
ffmpeg: Umgebungsvariable `FFMPEG`, sonst die imageio-ffmpeg-Binary (hat libx264 + AAC), sonst `ffmpeg` im PATH.
Die Playwright-eigene ffmpeg-Binary in `/opt/pw-browsers` kann kein H.264 und wird nicht verwendet.

## Layout-Regeln

Alle Positionen werden aus Bühnenbreite/-höhe berechnet (Schriftgrößen relativ zu `min(W,H)`), Bilder werden per
Cover-Math skaliert (kein Verzerren). Titelsichere Zone: 16x9 5 % Rand, 1x1 6 % Rand, 9x16 Text nur im Band
15 %–80 % der Höhe (Plattform-UI oben/unten). Die Push-ins auf die Frontcover sind so gerahmt, dass die eingebrannte
Titeltypografie der Cover (obere ~44 %) außerhalb des Bildes bleibt und die Fahrt auf der Faust endet.
Der Faustgruß: beide Cover als perspektivisch gekippte Karten, Berührungspunkt exakt Bühnenmitte, Kontaktzeile bei
65,6 % der beschnittenen Coverhöhe (aus der Referenzgrafik gemessen). Der Faustgruß im 9x16 beschneidet die Karten
seitlich leicht (Faustregion bleibt vollständig sichtbar).

Typografie: Cinzel (Display, wie die Goldtitel der Cover), Literata (Zeilen, Sub-Line kursiv). Cinzel hat
türkische Lokalformen (gepunktetes Kapitälchen-İ); die Seite setzt `lang` pro Sprache, türkische Namen und Titel
bleiben `lang="tr"`.

## Zeitleiste 60 s (16x9)

| Zeit | Bild | Text | Audio |
|---|---|---|---|
| 0,0–7,0 | Schwarz. Drei warme Lichtblitze + leichtes Bildzittern bei 1,0 / 1,8 / 2,6 s. Ab 3,2 s die Frage (Cinzel, zentriert, leichter Tracking-Einlauf). | TR „Bir şeyin var olduğunu nasıl anlarsın?“ · EN „How do you know that something exists?“ · DE „Wie erkennst du, dass etwas existiert?“ (3,2–6,7 s) | Drone setzt ein; drei Metallschläge 1,0 / 1,8 / 2,6 s |
| 7,0–19,0 | YOLCU-Front (warme Seite), langsamer Push-in auf die Faust; ab 7,8 s schwarzes Paket mit roter Schnur (Linien-Grafik), ab 8,6 s Uhr 14:53. Goldene Linie über dem Textblock, Zeilen bauen sich wortweise auf. 17,0–19,3 s Titelkarte (Abdunklung). | 8,4 „Kapının önünde siyah bir paket.“ · 11,0 „Gönderen yok. Adres yok.“ · 13,6 „İçindeki kitap… onu anlatıyor.“ (bis 16,7) · 17,0 „YOLCU / 1453 — Uyanışın Bedeli / Tuncay Sancak“ (EN: THE TRAVELLER / 1453 — The Price of Awakening; DE: DER REISENDE / 1453 — Der Preis des Erwachens) (EN/DE-Zeilen siehe `config/`) | Pad Am–F–Dm–E, Sub-Puls alle 2 s (leise) |
| 19,0–31,0 | ŞAHİT-Front (kühle Seite), Push-in; ab 19,8 s die Gazelle (Ceylan aus dem ersten Brief, Linien-Grafik, zeichnet sich in 1,6 s), ab 20,7 s der Brief (Gold-Linien). 29,0–31,3 s Titelkarte. | 20,4 „Bir yolcu yola çıkar.“ · 23,0 „Bir şahit onu bekler.“ · 25,6 „Artık konuşmayan bir adam… Şahit kim?“ (bis 28,7) · 29,0 „ŞAHİT / Mustafa Sefa Güvenir“ (EN: THE WITNESS; DE: DER ZEUGE) (EN „A traveller sets out. / A witness awaits him. / A man who no longer speaks… Who is the witness?“, DE „Ein Reisender bricht auf. / Ein Zeuge erwartet ihn. / Ein Mann, der nicht mehr spricht … Wer ist der Zeuge?“) | Pad, Sub-Puls wächst |
| 31,0–44,0 | Split-Screen: links kühl (SA), rechts warm (BY), weich verwischt, dünne goldene Naht. Grüner Raum-Umriss (32,0), Türblitze bei den Schlägen, Wasserglas (37,0), Hand mit verbundenem Daumen (38,8), Stuhl (40,6). Zeilen ersetzen einander. | 32,4 „Yeşil bir oda.“ · 34,2 „Üç vuruş.“ (EN „Three knocks.“, DE „Drei Schläge.“) · 37,0 „Bir bardak su.“ · 40,0 „Aynı sahneyi iki kişi hatırlıyor.“ (bis 43,6) | Drei Metallschläge 34,0 / 34,8 / 35,6 s; ab 40,0 s Swell (steigendes Rauschen + Riser) |
| 44,0–53,0 | Die beiden Frontcover gleiten als gekippte 3D-Karten von links (SA) und rechts (BY) herein, Fäuste berühren sich bei **47,0 s** exakt in der Mitte: Blitz, Sonnenstrahlen, Bildzittern, kurzer Rückstoß; die Karten setzen sich leicht ab. | 47,8 Tagline (Cinzel Gold) „İki Roman – İki Yol – Üçüncü Bir Hikâye“ · 48,8 Sub-Line (Literata kursiv) „Her biri tek başına bir roman. Birlikte okununca üçüncü bir kitap belirir.“ (bis 52,9) | Kurzer Dip vor 47,0, tiefer Impact-Hit mit langem Nachhall |
| 53,0–60,0 | Endkarte: beide eBook-Cover nebeneinander (SA links, BY rechts) auf dunklem Grund mit Goldglühen, Skyline-Silhouette unten, Autorennamen (54,0), Schmetterling fliegt 54,2–59,2 s zwischen den Covern hindurch nach oben rechts. Fade to black ab 58,8 s. | 54,8 „Şimdi Amazon'da“ / „Now on Amazon“ / „Jetzt bei Amazon“ · 55,5 „@happytuncay“ | Ruhiges Pad, 2 s Fade-out |

## Zeitleiste 30 s (9x16 und 1x1)

| Zeit | Bild | Text | Audio |
|---|---|---|---|
| 0,0–4,0 | Schwarz, drei Lichtblitze 0,7 / 1,3 / 1,9 s, Frage 2,2–3,9 s | Frage (TR/EN/DE) | Drone, Schläge 0,7 / 1,3 / 1,9 |
| 4,0–10,0 | BY-Front, Push-in, Paket + Uhr | 4,8 „Kapının önünde siyah bir paket.“ · 6,5 „İçindeki kitap… onu anlatıyor.“ · 8,5–10,3 Titelkarte YOLCU | Pad, Sub-Puls |
| 10,0–16,0 | SA-Front, Push-in, Gazelle + Brief | 10,8 „Bir yolcu yola çıkar.“ · 12,5 „Artık konuşmayan bir adam… Şahit kim?“ · 14,5–16,3 Titelkarte ŞAHİT | Pad |
| 16,0–21,0 | Split-Screen, grüner Raum (16,3), Glas (18,5), Hand (18,9), Stuhl (19,3) | 16,6 „Üç vuruş.“ · 19,0 „Aynı sahneyi iki kişi hatırlıyor.“ | Schläge 17,0 / 17,6 / 18,2; Swell ab 16,0 |
| 21,0–26,0 | Karten gleiten herein, Kontakt bei **23,0 s** (9x16: Karten 40 % Höhe, seitlich leicht beschnitten; 1x1: 60 % Höhe) | 23,6 Tagline · 24,3 Sub-Line (bis 25,9) | Impact 23,0 |
| 26,0–30,0 | Endkarte (Cover nebeneinander, 9x16 im Band 18–54 % der Höhe), Schmetterling 26,4–29,4, Fade ab 28,8 | 27,3 CTA · 27,8 „@happytuncay“ | Ruhiges Pad, Fade-out |

Die Untertitel (`out/*.srt`) enthalten genau diese Zeilen mit diesen Zeiten (gestapelte Zeilen jeweils bis zum
Erscheinen der nächsten Zeile; Titelkarten als Mehrzeiler; Tagline + Sub-Line als ein Cue).

## Änderungen vornehmen

- Texte/Zeiten: nur in `config/<lang>.js` (die drei Dateien müssen dieselben `cuts` haben, weil Musik-Schläge und
  Impact in `render_all.sh` fest auf diese Zeiten gesetzt sind).
- Layout je Format: Tabelle `LAYOUTS` oben im zweiten Script-Block von `engine2.html` (Anteile von Breite/Höhe).
- Grafiken (Paket, Uhr, Gazelle, Schreibmaschine, Brief, Raum, Glas, Hand, Stuhl): Inline-SVG in `SVGS` in `engine2.html`;
  sie werden mit `stroke-dashoffset` „gezeichnet“, Füllungen blenden danach ein.
- Qualität prüfen: Stills an den Szenenmarken rendern (siehe oben) und die JPEGs ansehen, bevor alles gerendert wird.

## Bekannte Grenzen

- Musik ist ein Platzhalter (siehe oben), kein Voice-over.
- Kein GPU-Rendering: ein 60-s-Video (1800 Frames) braucht auf 4 CPUs etwa 6–8 min, alle 9 Videos zu je 2 parallel
  etwa 30 min. Chromium rendert Frame für Frame deterministisch; Timing-Änderungen brauchen keinen Neustart.
- Die 3D-Karten sind CSS-`perspective`-Kippungen (keine echte Buchdicke).
- `ffprobe` ist auf dieser Maschine nicht installiert; `render_all.sh` liest die Metadaten mit `ffmpeg -i`.
