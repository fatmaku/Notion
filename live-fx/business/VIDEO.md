# LiveFX – Marketing-Video (Trailer)

Zwei fertige Trailer, 50 Sekunden, mit Musik – komplett aus Code gerendert (kein Schnittprogramm nötig):

| Datei | Format | Für |
|---|---|---|
| `video/LiveFX_Trailer_9x16.mp4` | 1080×1920, 30 fps, H.264 + AAC | TikTok, Instagram Reels/Stories, YouTube Shorts |
| `video/LiveFX_Trailer_16x9.mp4` | 1920×1080, 30 fps, H.264 + AAC | YouTube, LinkedIn, Website, Pitch-Deck |
| `video/stills/*.jpg` | 4 Key-Frames pro Format | Landing-Page, Docs, Social-Vorschau |

Alles liegt in `live-fx/business/video/`. Der Trailer ist eine HTML-Seite (`trailer.html` + `engine.js`), die für
jeden Zeitpunkt `t` deterministisch denselben Frame zeichnet (`render(t)`). `capture.js` fährt mit Playwright
Bild für Bild durch und gibt die Frames an ffmpeg; `music.js` erzeugt die Musik synthetisch (keine Lizenzfrage).

## Was das Video zeigt (Szenenliste)

| Zeit | Szene | Inhalt |
|---|---|---|
| 0–4 s | **Hook** | Schwarz → „Live-Untertitel? 🙄“ (wird durchgestrichen) → „Wir machen **LIVE-MEMES.**“ in Neon-Pink mit Flackern. |
| 4–14 s | **Du sagst es – es passiert** | Simuliertes Live-Transkript tippt „das ist **krass** …“ → Meme-Karte 🤯 KRASS! + Konfetti + 🔊 Airhorn. „**yok artık**!“ (Sprach-Badge springt auf Türkçe) → 😱 + Emoji-Regen + Vine-Boom. „**let's go**“ (English) → 🚀 Rakete mit Feuerschweif + Neon-Text LET'S GO. |
| 14–22 s | **3 Sprachen, automatisch** | Drei Karten klappen auf: 🇩🇪 Deutsch (49 Memes), 🇹🇷 Türkçe (85), 🇬🇧 English (50) mit Beispiel-Triggern, Zähler laufen hoch. „Die Sprache wird beim Reden erkannt – kein Umschalten.“ Pills: GIF-Suche (Tenor · Giphy), eigene Memes & Sounds. |
| 22–30 s | **Story-Modus** | „Es **regnete** in der **Nacht**…“ → Nachthimmel, Mond, Sterne, Regen (Canvas) + „🌧️ Atmo: Regen“. „**bir varmış bir yokmuş**…“ → Schloss-Silhouette mit leuchtenden Fenstern + „🦗 Atmo: Grillen“. Danach ein **echter Screenshot** des LiveFX-Overlays (Nacht-Szene, Hochkant). |
| 30–38 s | **Zuschauer machen mit** | Chat-Blasen `mert_99: !airhorn` → 📣, `lena.streams: !hype` → 🎉 + Konfetti, `ayşe: !gg` → 🎮. Geschenke-Stufen: 1 Gift → Sticker, 10 → Emoji-Regen, 100 → Vollbild-Szene; Geschenk-Regen. |
| 38–44 s | **Überall, wo du live gehst** | **Echter Screenshot** des Control-Panels im Monitor-Rahmen, blendet über zum **echten Overlay-Screenshot** (KRASS!-Karte in OBS). Text-Badges Instagram Live · TikTok LIVE · YouTube Live · Twitch (nur Text, keine Logos), darunter: Handy als Fernbedienung, 4 Looks, läuft offline, Sounds ohne Lizenz-Risiko. |
| 44–50 s | **CTA** | 🎬 LiveFX – „Deine Stimme wird zum Effekt.“ – `livefx.app` (Platzhalter) – „Pilot-Partner gesucht: TikTok · Meta · YouTube“ – Fade to black, Musik blendet aus. |

Palette wie im Panel: Hintergrund `#0f1115`, Neon-Pink `#ff2d75`, Neon-Grün `#2dffb5`, Gold `#ffd166`.
Schrift: Lexend (aus `deniz-trailer` übernommen, liegt in `video/assets/`), Emojis aus Noto Color Emoji.
Keine Logos von Plattformen als Bild, keine echten Namen (Chat-Namen sind erfunden).

## Neu rendern

Voraussetzungen: Node 22, Playwright mit Chromium, ein **vollständiges ffmpeg** mit libx264 + AAC (`apt-get install ffmpeg`
→ `/usr/bin/ffmpeg`). Achtung: das von Playwright mitgelieferte `/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux` ist ein
Minimal-Build (nur VP8/WebM, kein MP4/H.264/AAC/WAV) und kann die Trailer **nicht** rendern.

```bash
cd live-fx/business/video
export FFMPEG=/usr/bin/ffmpeg    # Standard ist "ffmpeg" im PATH
node music.js            # music.wav (60 s, 100 BPM, Peak 0,5) – nur nötig, wenn gelöscht/geändert
node capture.js 9x16     # → LiveFX_Trailer_9x16.mp4  (ca. 4–6 Minuten)
node capture.js 16x9     # → LiveFX_Trailer_16x9.mp4
node capture.js 9x16 --stills            # 4 Key-Frames nach stills/ (2,7 s · 6,9 s · 29,6 s · 48,3 s)
node capture.js 16x9 --stills=12.8,25.5  # eigene Zeitpunkte
```

Render-Einstellungen (in `capture.js`): 30 fps, libx264, `-crf 20 -preset medium`, `yuv420p`, `+faststart`;
Audio AAC 160 kbit/s, `-shortest`, Fade-out der Musik in den letzten 2 Sekunden (`afade=t=out:st=48:d=2`).
Umgebungsvariablen: `FPS`, `CRF`, `PRESET` (z. B. `FPS=24` für einen schnelleren Testlauf).

**Live-Vorschau im Browser:** `trailer.html?ratio=9x16` bzw. `?ratio=16x9` öffnen (läuft in Schleife),
`&t=22` springt zu Sekunde 22. Zum Ändern von Texten/Timing: `engine.js`, jede Szene ist ein `scene(a, b, …)`-Block
mit absoluten Sekunden; `DUR` ist die Gesamtlänge.

Screenshots neu machen (Panel + Overlay vom laufenden Server):

```bash
PORT=8799 node live-fx/server.js &      # dann mit Playwright index.html bzw. overlay.html?theme=neon öffnen,
# Effekt auslösen: window.livefx.renderer.fire({ visual:{ kind:'card', emoji:'🤯', text:'KRASS!' } })
# und als JPEG (Qualität 80) nach video/assets/ speichern: panel.jpg, overlay-card.jpg, overlay-story.jpg
```

## Echte Stream-Aufnahmen einbauen

Der Trailer ist dafür vorbereitet, Platzhalter durch echte Clips zu ersetzen:

1. Clip (MP4/WebM, ohne Ton oder mit – der Trailer nutzt nur die Musik) nach `video/assets/` legen,
   z. B. `assets/clip-krass.mp4`. Kurz halten (≤ 3 s), Hochkant-Clips für 9:16, Quer für 16:9.
2. In `engine.js` in der jeweiligen Szene statt des `<img>` im `.frame`-Rahmen ein `<video muted>` einsetzen
   und in `update(t)` die Position setzen: `video.currentTime = clamp(t - startZeit, 0, video.duration)`.
   Da `capture.js` jeden Frame einzeln rendert, muss nach dem Setzen auf das `seeked`-Event gewartet werden –
   dafür in `capture.js` den `shot()`-Aufruf um `await p.evaluate(() => window.SEEKED)` ergänzen (Promise, das
   `engine.js` beim Setzen von `currentTime` anlegt).
3. Empfohlene Stellen: 12,6–14 s (nach der Rakete: „So sieht's im Stream aus“), 28,5–30 s (Story-Screenshot),
   41,2–44 s (Overlay im Monitor-Rahmen). Die `clips`-Idee: ein Array `[{ at, dur, src, caption }]` am Anfang von
   `engine.js`, das pro Eintrag einen `.frame` mit Video erzeugt – die drei Screenshot-Rahmen zeigen, wie
   Position und Beschriftung pro Format (`P` = Hochkant) gesetzt werden.
4. Aufnahme-Tipp: `demo.html` im LiveFX-Server nimmt Kamera + Overlay direkt als 9:16/16:9-Video auf
   (siehe `docs/DEMO-CLIP.md`) – das ist die schnellste Quelle für echte Clips mit der Gründerin.

## Wo hochladen

| Kanal | Datei | Hinweis |
|---|---|---|
| TikTok | 9x16 | Als normales Video posten; die ersten 2 s (Hook) nicht beschneiden. Hashtags unten. |
| Instagram Reels / Story | 9x16 | Reel + als Story mit Link-Sticker; Safe-Zone unten 35 % ist eingehalten (Transkript-Leiste liegt bei 78–84 %). |
| YouTube Shorts | 9x16 | Titel mit „#Shorts“. |
| YouTube (normal) / Website / Pitch-Deck | 16x9 | Als eingebettetes Video auf der Landing-Page; Thumbnail: `stills/16x9-6_9s.jpg` oder `48_3s`. |
| LinkedIn | 16x9 | Nativ hochladen (Autoplay im Feed), Untertitel braucht es nicht – alles steht im Bild. |
| Pitch an Plattformen | 16x9 + 9x16 | Beide Dateien anhängen, 9:16 zeigt die Hochkant-Safe-Zones. |

## Caption-Vorschläge

**Deutsch**
> Live-Untertitel? 🙄 Wir machen Live-MEMES. LiveFX hört dir beim Streamen zu und zeigt sofort das passende Meme,
> den Emoji-Regen oder den Sound – hands-free, in Deutsch, Türkçe und English. Story-Modus für Vorlese-Streams,
> Zuschauer lösen Effekte per Chat oder Geschenk aus. Läuft mit OBS auf Instagram, TikTok, YouTube, Twitch.
> Pilot-Partner gesucht. #LiveFX #Livestream #Memes #OBS #TikTokLIVE #CreatorTools

**Türkçe**
> Canlı altyazı mı? 🙄 Biz canlı MEME yapıyoruz. LiveFX yayında seni dinler, „yok artık!“ dediğin anda doğru
> meme'i, emoji yağmurunu ve sesi ekrana basar – ellerini kullanmadan. Türkçe, Almanca, İngilizce otomatik.
> Hikâye modu, izleyici tetikleri, OBS ile Instagram/TikTok/YouTube/Twitch. Pilot ortak arıyoruz.
> #LiveFX #CanlıYayın #Meme #TikTokLIVE

**English**
> Live captions? 🙄 We do live MEMES. LiveFX listens while you stream and instantly drops the matching meme,
> emoji rain or sound effect – hands-free, in German, Turkish and English. Story mode for read-aloud streams,
> viewers trigger effects via chat or gifts. Works with OBS on Instagram, TikTok, YouTube and Twitch.
> Looking for pilot partners. #LiveFX #Livestream #Memes #OBS #CreatorTools

## Technische Daten / Kompromisse

- Dauer 50 s, 30 fps, beide Formate < 30 MB. Musik: synthetischer Loop (Am–F–C–G, 100 BPM, Bass, Pad, Pluck,
  Hi-Hat), 60 s erzeugt, per `-shortest` auf 50 s geschnitten, Peak ≤ 0,5 (−6 dBFS) – Platz für Voice-over.
- Es gibt **keine Sprachaufnahme** und keine echten Stream-Clips: alles ist im Trailer nachgebaut (Transkript,
  Karten, Regen), echt sind nur die drei Screenshots von Panel und Overlay. Wie echte Clips reinkommen: oben.
- Plattformen erscheinen nur als Text-Badges (keine Markenlogos). `livefx.app` ist ein Platzhalter – vor dem
  Veröffentlichen gegen die echte Domain tauschen (Szene 6 in `engine.js`, Zeile mit `livefx.app`).
- Rendering läuft softwareseitig (SwiftShader) – ohne GPU dauert ein Durchlauf einige Minuten; `FPS=24` halbiert
  fast die Zeit, wenn es nur um eine Vorschau geht.
