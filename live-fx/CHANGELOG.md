# Changelog

## 2.3.0 – Band ganz unten, Story räumt auf, Applaus läuft durch, Zeichenfilm, Kamera-Ansicht für WhatsApp & FaceTime

Antwort auf das Streamer-Feedback zu 2.2 (9:16-Band in der Mitte, „araba“ bleibt für immer, „alkış“ blitzt nur auf,
WhatsApp/FaceTime, gezeichnete Story).

- **📐 Band-Position im Hochformat** (`bandPosition`, `docs/STORY.md`): Standard ist jetzt **`bottom`** – das Band sitzt
  bündig am unteren Bildrand, volle Breite. **`chat`** gibt die 2.2-Lage über der Chat-Zone (unten 35 % frei). Panel
  **Einstellungen → Band-Position (Hochkant)**, Handy-Knopf **📐 Band**, URL `overlay.html?bandpos=bottom|chat`, Bus
  `{type:'layout', bandPosition}`; der Server merkt es sich (`state.layout`). Quer wird der Schlüssel ignoriert.
  Regen / Konfetti bleiben hochkant weiter oberhalb der Chat-Zone. Zone `edges`: zu breite Wörter in den Rand-Spalten
  werden verkleinert (`--fx-fit`) statt abgeschnitten.
- **🚗 Live-Story räumt auf** (`js/story-director.js`): Dinge gehen nach **3** Sätzen ohne Erwähnung oder **45 s**,
  Figuren nach **4** Sätzen oder **60 s** (`director.tick()` läuft im Overlay jede Sekunde). Neuer Ort / neues Wetter
  räumt Dinge weg, die nicht mehr vorkommen – „yağmur yağıyordu“ → „araba geldi“ → „güneş açtı“: das Auto geht mit dem
  Regen. Abgangswörter („gitti“, „kayboldu“, „ging weg“, „verschwand“, „left“, „disappeared“ …) entfernen ihr
  Subjekt; „kız ormana gitti“ bleibt ein Spaziergang. End-Wörter zählen nur am Satzende, das türkische „son“ nur als
  eigener kurzer Satz („en son“, „son dakika“, „… sonunda“ beenden nichts mehr). Der Szenen-Trigger „Son“ im Paket
  *📖 Masal (TR)* hört nicht mehr auf das nackte „son“, „Ende“ in *📖 Geschichten (DE)* nicht mehr auf das nackte
  „Ende“ („am Ende des Tages“) – bereits geladene Pakete einmal entfernen und neu laden.
- **💤 Ruhendes Band ist wirklich leer**: blendet das Band nach 60 s ohne Satz aus, verschwinden auch Figuren, Dinge,
  Szenen-Partikel und der Atmosphäre-Loop (nichts schwebt mehr über der Kamera). **Jeder** Story-Satz – auch einer,
  der nichts ändert – holt das Band zurück.
- **👏 Applaus läuft wieder durch** (`js/fx.js`): jedes Szenen-Partikel, das während eines Frames entstand, startete
  eine zweite Animationsschleife; nach ein paar Sekunden Szene lief die Physik N-fach (gemessen bis 300× pro Frame), der
  👏-Regen fiel in 0,3 s durch und die CPU-Last stieg linear. Jetzt genau **eine** Schleife (`particles._ticking`),
  `stats.fps` / `frameMs` pro Frame, Fallgeschwindigkeit passt sich der Fallhöhe an (Handy hochkant ≈ 2,5 s sichtbar).
- **✏️ Zeichenfilm** (`js/sketch.js`, `css/sketch.css`, `docs/SKETCH.md`): die Live-Story wird beim Erzählen **gezeichnet**
  – Strich für Strich mit Stift, Radierer für Abgänge, 59 Zeichnungen (Orte, Himmel, Wetter, Figuren mit Laufzyklus,
  Tiere, Dinge), komplett aus Code, nur im Band. Neuer Layout-Schlüssel **`storyStyle`**: `mixed` (Standard: gezeichnete
  Kulisse + Emoji-Figuren und -Dinge), `sketch` (alles gezeichnet), `emoji` (2.2-Look). Panel **Story-Stil**,
  Handy-Knopf **✏️ Stil**, `?storystyle=`, `{type:'layout', storyStyle}`. Kulissen-Cache + Takt nach Bewegung: im Stand
  ≈ 110 ms/s Main-Thread bei 1920 × 238 (billiger als der Emoji-Stil); still stehende Bilder zeichnen gar nicht.
  Renderer-Haken `LiveFXSketch.attach / update / setStyle` (`docs/CONTRACTS.md` §9), `LiveFXSketch.record()` für
  WebM aus der Konsole.
- **📷 Kamera-Ansicht** (`camera.html`, `js/camera.js`, `css/camera.css`, `docs/KAMERA.md` DE/TR/EN): Webcam + echtes
  Overlay in **einem** Fenster in OBS-Ausgabegröße (720p/1080p, 16:9/9:16, spiegeln, Kamera wählen). Wege in den
  Videocall: **OBS „Virtuelle Kamera“** (Zoom, Teams, Meet, Discord, WhatsApp Desktop, FaceTime auf dem Mac ab macOS 13 +
  OBS 30 – Freigabe der Kamera-Erweiterung für macOS 13/14 und 15 beschrieben), **Fenster teilen** (⧉ Ausgabe = Fenster
  ohne Leiste) oder **⏺ Aufnahme**: Bild + Effekte + Live-Story + Mikro + Effekt-Sounds als MP4/H.264 (nur mit
  echtem avc1-Codec) oder WebM, am Handy **📤 Teilen** → WhatsApp; **Pixelgenau** (Tab-Aufnahme, prüft vorher, dass
  wirklich Bilder ankommen, Rückfall Ausschnitt → ganzer Tab → Leinwand). **🎙️ Live-Mikro** (`?mic=1`): Erkennung direkt
  in der Kamera-Ansicht – mit Story-Stil *Zeichnung* entsteht beim Erzählen ein gezeichnetes Video; **🎨 Ohne Kamera**
  (`?cam=off`) + **✏️ Zeichenfilm** im Panel (`?cam=off&storystyle=sketch&story=full&mic=1&record=1`) geben den reinen
  Zeichenfilm im ganzen Bild auf dunklem Grund. Ehrlich dokumentiert:
  Handy-Apps nehmen keine fremde Kamera. Panel-Karte **📷 Kamera-Ansicht** (Öffnen, ⏺ Aufnahme, **✏️ Zeichenfilm**, Link kopieren),
  `docs/OBS-ANLEITUNG.md` §6.
- **Panel / Handy**: Einstellungen **Story-Stil** + **Band-Position (Hochkant)** (`localStorage` `livefx.layout.look`,
  mit dem Layout an die Overlays, nach dem Start erneut gesendet); Handy-Knöpfe **✏️ Stil** (Gemischt → Zeichnung →
  Emoji) und **📐 Band** (ganz unten ↔ über dem Chat), `livefx.mobile.look`, folgen dem Server-Zustand.
- Versionen (Paket, Service-Worker-Shell) auf **2.3.0**; volle Shell + `sketch.js`, `sketch.css`, `camera.html`,
  `camera.js`, `camera.css`, Overlay-Shell + `sketch.js`, `sketch.css`. Tests: `test/sketch.test.js`,
  `test/e2e/31-sketch.js` (inkl. Main-Thread-Messung über CDP), `test/e2e/37-camera.js` (inkl. Pixelgenau),
  erweiterte `story-director.test.js`, `29-story-band` (Band unten, Lebensdauer, 👏-Regen neben laufender Szene nach
  1,5 s noch sichtbar, eine rAF-Schleife), `35-mobile` (Stil- und Band-Knopf), `packs.test.js`.

## 2.2.0 – Story-Band, Live-Story, schnellere Erkennung, Start-Assistent, Handy mit Internet-Link

- **📖 Story-Band & Effekt-Zonen** (`docs/STORY.md`): Szenen laufen in einem **Band am unteren Rand** (Standard 22 % der
  Höhe, hochkant 20 % über der Chat-Zone) statt über der Kamera; Layouts `band` / `full` / `frame` (Bild-im-Bild),
  Band-Höhe 15–35 %. **Effekt-Zonen** `full` / `edges` (Regen, Konfetti nur in den Rand-Spalten, Karten in den
  Spalten, kein Blitz / Impact-Zoom) / `bottom` (im Band) / `top`. Bus-Nachricht `{type:'layout', storyLayout?, band?, zone?}`
  (teilweise, nur die geschickten Schlüssel ändern sich), URL-Pins `overlay.html?story=band&band=22&zone=edges`; der Server
  merkt sich das Layout (`state.layout`) und gibt es neuen Overlays im `state`-Event mit. `renderer.setLayout()`,
  `#stage > .fx-band[data-layout][data-mood]`, Partikel und Figuren auf das Band begrenzt, Ausblenden nach 60 s ohne Story.
- **🎬 Live-Story** (`js/story-director.js`, `LiveFXStoryDirector`): Wortlisten DE / TR / EN (Orte, Tageszeiten, Wetter, 22
  Figuren, 16 Dinge, Tätigkeiten, Stimmungen) machen aus jedem gesprochenen Satz sofort Szene, Loop, Wetter, Tageszeit und
  Emoji-Figuren im Band – ohne Modell, ohne Cloud. Nachrichten `{type:'story', text, final, lang?}` (jedes Overlay führt
  seinen eigenen Director) und `{type:'story-state', state}` (fertiger Zustand, `normalizeStoryState`). Zwischenergebnisse
  bewegen nur Ort / Zeit / Wetter / Stimmung; „Ende“ räumt die Bühne, „es war einmal“ beginnt neu. Demo-Seite mit Haken.
- **🔊 Drei Lautstärken & Pegel** (`docs/SOUNDS.md`): `master` 0,5 / `sfx` 0,8 / `ambient` 0,5 (`{type:'volume', volume, bus?}`,
  ohne `bus` wie bisher master, `state.volumes`), Szenen-Loops über den Ambient-Bus des Mixers (Ducking + Limiter).
  **Loudness-Normalisierung**: jeder eingebaute One-Shot ≤ 0,6 Peak pro Stimme (`PEAK_BUDGET`), Limiter −9 dB,
  `test/sounds.test.js` prüft alle 38 One-Shots und 12 Loops.
- **⚡ Schnellere Erkennung** (`js/matcher.js`): ein durch Cooldown / Mindestabstand **blockierter Treffer wird nicht mehr
  verbraucht** – er feuert, sobald die Sperre vorbei ist; **Präfix-Feuern** (eindeutiger Wortanfang ≥ 4 Zeichen eines
  Stichworts ≥ 6 Zeichen feuert schon im Zwischenergebnis, Reaktion „schnell“); Mindestabstand standardmäßig **0,5 s**
  (war 1,2); 1000 Trigger × 8 Stichwörter in < 3 ms. `LIMITS.triggers` **1000** (war 200), `PUT /api/triggers` bis 6 MB.
- **🇹🇷 Türkisch & Hauptsprache**: Türkische Groß-/Kleinschreibung (I → ı, İ → i) in Matcher und Spracherkennung, ı≡i ş≡s
  ç≡c ğ≡g bei Toleranz „mittel“; `js/langdetect.js` erkennt Türkisch sofort an ı ş ğ İ und an kurzen Stream-Wörtern
  („len“, „hocam“, „yav“). **Hauptsprache** im Panel → Erkennung startet darin (`primaryLang`), **Aussprache-Varianten**
  (`js/phonetic.js`, `matcher.setPhonetic()`): Stichwörter der anderen Sprachen werden so indiziert, wie der Erkenner der
  Hauptsprache sie schreibt („no way“ → „no vey“, „krass“ → „kras“). Backend `auto`: Start in der Hauptsprache, Wechsel
  nach **einem** sicheren Satz (Score ≥ 0,6) oder zwei Sätzen ≥ 0,45, Umschalten in einer Sprechpause (max. 2 s
  Wartezeit), zurück zur Hauptsprache nach zwei Sätzen oder 8 s Stille; parallel: erster sicherer Zwischensatz macht den
  Erkenner zum Leader. **On-Device-Erkennung** (Chrome `processLocally`, Feature-Detection, `onDevice: 'auto'|'off'`,
  Ereignis `{type:'ondevice', state}`, bei Fehlern Cloud-Fallback).
- **🚀 Start-Assistent** oben im Panel, drei Schritte: **Mikro testen** (5-s-Pegeltest), **OBS verbinden**
  (Overlay-URL mit Kopier-Knopf, Format 16:9 / 9:16 mit exakter Breite × Höhe, 6-Schritte-Kurzanleitung,
  Live-Status „Overlay verbunden ✔“ sobald OBS das Overlay lädt – aus `/health`, `overlays ≥ 2` –, Test-Effekt),
  **Pakete wählen** (Kacheln, Zähler `x / LIMITS.triggers`, Stichwort-Kollisionen zwischen Paketen). Karten für
  Fortgeschrittene (Externe API, Kombis, Demo-Clip, OBS-Text, Log) sind hinter **„⚙️ Erweitert anzeigen“**
  eingeklappt (`localStorage` `livefx.panel.advanced`).
- **Einstellungen**: drei Regler **Master / Effekte / Atmosphäre** (`{type:'volume', volume, bus:'master'|'sfx'|'ambient'}`,
  Standard 0,5 / 0,8 / 0,5), **Story-Layout** Band / Vollbild / Rahmen, **Band-Höhe** 15–35 %, **Effekt-Zone**
  überall / Ränder / unten / oben (`{type:'layout', storyLayout, band, zone}`), **Hauptsprache** TR / DE / EN
  (`primaryLang` an die Erkennung, `matcher.setPhonetic()` – Stichwörter der anderen Sprachen werden phonetisch
  mitgehört, `js/phonetic.js`), **Live-Story** (jede Transkriptzeile als `{type:'story', text, final, lang}` ans
  Overlay, `js/story-director.js`). Mindestabstand standardmäßig 0,5 s; der Story-Modus erzwingt nicht mehr
  Reaktion „sicher“. Alles in `localStorage` (`livefx.volumes`, `livefx.layout`, `livefx.asr.primary`,
  `livefx.liveStory`).
- **📱 Handy**: Link als **QR-Code** (`js/qr.js`, eigener Encoder, Byte-Modus, Level M, Version 1–10, im
  Test gegen einen unabhängigen Decoder geprüft), **⭐ Favoriten** (lange drücken), **Leiser / Lauter ±6 dB**,
  **Story-Band an/aus**, **Effekt-Zone**, **Pakete** laden/entfernen (`js/packs-store.js`, gleiche Logik wie im
  Panel), Mikro-Start. Größere Kacheln.
- **🌐 Internet-Link** (`server/tunnel.js`, `server/api-tunnel.js`): Cloudflare-Schnelltunnel per Knopf –
  `cloudflared` aus `PATH` / `LIVEFX_CLOUDFLARED` oder einmaliger Download nach `<dataDir>/bin/` mit
  SHA-256-Prüfung gegen die veröffentlichte Prüfsumme; Status idle / starting / online / error; Routen
  `GET /api/tunnel`, `POST /api/tunnel/start`, `POST /api/tunnel/stop` (Auth nötig); Handy-Link
  `https://<zufall>.trycloudflare.com/m?token=…` als QR-Code (HTTPS → Handy-Mikro ohne Zertifikat). Der
  Tunnel-Host wird nur solange akzeptiert, wie der Tunnel läuft; Anfragen durch den Tunnel brauchen Cookie oder
  Bearer (nur `GET /m`, `/health` sind offen). Endet mit dem Server. Fehlerhilfe: Hotspot-Trick, Download von
  Hand (`docs/HANDY.md` §4a).
- **Doku**: `docs/OBS-ANLEITUNG.md` jetzt Schritt für Schritt auf **Deutsch, Türkçe und English** (exakte
  OBS-Menünamen, Streamlabs, TikTok LIVE Studio), README-Schnellstart mit Assistent, `docs/HANDY.md` §4a.
- Versionen (Paket, Service-Worker-Shell) auf 2.2.0; Shell um `qr.js`, `packs-store.js`, `story-director.js`,
  `phonetic.js` erweitert. Tests: `test/tunnel.test.js`, `test/qr.test.js`, `test/e2e/36-wizard.js`, erweiterte
  `35-mobile` / `mobile.test.js`.

## 2.1.0 – Leichter, schneller, freie Sticker, sichere GIF-Suche

- **Leistung** (`docs/PERFORMANCE.md`): ein Renderpfad (Regen, Szenen-Partikel, Lichtstrahlen und Ring auf dem
  Canvas statt großer DOM-Ebenen), nur noch `transform`/`opacity`-Animationen. Gemessen mit 31 Effekten in 3 s
  auf 1920×1080: **Bildzeit im Mittel −63 bis −69 %, p99 −74 bis −80 %, DOM-Knoten −56 %**.
  **Leistungsmodus** `auto` (Standard, schaltet bei Dauer-Ruckeln selbst auf Eco) / `eco` (schwacher PC: halbe
  Partikel, kein Glow, keine Strahlen) / `high`: im Panel unter **Einstellungen → Leistung**, per
  `overlay.html?perf=eco` fest, als Bus-Nachricht `{type:'perf', perf}`; der Server merkt sich den Modus für
  später verbundene Overlays (`state.perf`).
- **143 kostenlose Sticker** (Microsoft Fluent Emoji, MIT; 119 animiert) in `memes/fluent/`, Liste mit DE/TR/EN-
  Stichwörtern in `memes/index.json`. Neuer Tab **„Sticker (kostenlos)“** in der Medien-Bibliothek: Suche in drei
  Sprachen, Kategorien, „Als Trigger“ legt einen Bild-Trigger mit Emoji-Ersatz an. Sticker schweben frei im
  Overlay (ohne dunkle Karte); Paket „🎞️ Reaktionen (animiert)“. `npm run build-memes` baut die Sticker neu.
- **Text-Sticker** `text-tr` / `text-de` / `text-en` (je 27–28): große Comic-Wörter (OHA, KRASS, SHEESH …) im
  neuen Textstil **`sticker`** – dicke Kontur, Comic-Stern in der zweiten Farbe, Pop-in (Eco: ohne Wackeln).
- **Pakete aufgeräumt**: religiöse Ausdrücke und Flaggen aus den Paketen Türkçe, Deutsch und English entfernt und
  durch neutrale Reaktionen ersetzt; Sticker ohne Flaggen, Religion, Gewalt, Drogen/Alkohol und Anzügliches.
- **GIF-Suche neu: KLIPY und GIPHY.** Google hat die Tenor-API am 30. 6. 2026 abgeschaltet; Tenor ist entfernt
  (alte Keys werden ignoriert, Hinweis im Panel). KLIPY (kostenlos, empfohlen) und GIPHY laufen über den Server,
  immer mit `rating=g`. **Kein Speichern von Anbieter-GIFs**: „Als Trigger“ verlinkt das GIF direkt beim Anbieter
  (Nutzungsbedingungen), nichts landet im Medienordner.
- **Jugendschutz-Filter** (`js/safety.js`, auf dem Server und im Panel): gesperrte Suchbegriffe (DE/TR/EN, auch
  in Schreibvarianten) und Ergebnisse mit unpassenden Titeln/Tags werden entfernt; einzelne GIFs lassen sich
  ausblenden (wird gemerkt).
- **Sichere Bildquellen**: `visual.src` akzeptiert nur noch eigene Uploads (`assets/…`), mitgelieferte Sticker
  (`memes/…`) und HTTPS-Links von KLIPY/GIPHY. Beliebige `http(s)://`-Adressen, Ports, Benutzerangaben und
  nachgemachte Hostnamen werden abgelehnt. Lädt ein Bild nicht, zeigt das Overlay das Emoji als Karte.
- Versionen (Paket, Service-Worker-Shell) auf 2.1.0; Doku: `docs/PERFORMANCE.md`, `docs/STICKER.md`,
  `docs/GIFS.md`, `docs/CONTRACTS.md` §15.

## 2.0.0 – Release „Reif für Bühne und Verkauf“

- **Review-Durchlauf** über alle Teile aus 1.5/1.6 (Zuschauer-Trigger, Geschenke-Webhook, Effekt-Engine v2,
  Audio-Mixer, Auto-Sprache, Panel-Karten): Härtung gegen fehlerhafte Eingaben, Escaping, Grenzwerte,
  sauberes Beenden der Chat-Verbindungen; Regressionstests dazu.
- **Business-Ordner** `business/`: Marketingvideo 9:16 und 16:9 (aus Code gerendert), Pitch-Deck (PPTX),
  Businessplan (MD + DOCX), Marktanalyse mit Quellen, LinkedIn-Texte DE/TR, Landingpage DE/TR/EN.
- Versionsnummern, Service-Worker-Shell und Doku auf 2.0 gezogen.

## 1.6.0 – Grafik-, Sound- und Technik-Upgrade

- **Effekt-Engine v2**: Canvas-Partikel mit Physik (Schwerkraft, Wind, Drift, Rotation) und dynamischem
  Partikel-Limit (60-fps-Budget), Glow, Motion-Blur, 3D-Kippkarten, Impact-Zoom, Lichtstrahlen; neue Effekte
  **Text** (Neon / Verlauf / Bounce / Glitch, Buchstaben-Stagger), **Bauchbinde** (Lower-Third), **Kombi**
  (Sequenz aus bis zu 6 Schritten); Szenen mit Parallax-Ebenen. Optionen pro Effekt: Glow, Kippen, Impact,
  Intensität 1–3, zweite Farbe; Lautstärke pro Trigger (`gain`).
- **Themes**: Neon (Standard), Pastell, Minimal, Kinderbuch – im Panel unter „Look“, `overlay.html?theme=…`
  pinnt; der Server merkt sich das Theme für neu verbundene Overlays.
- **Audio-Engine v2**: Mixer mit Effekt-/Atmosphäre-Bus, Master-Limiter, Ducking (Atmosphäre −8 dB während
  Effekten), Stereo-Panning nach Position, Hall für Szenen, Intensitäts-Layer; **12 neue Sounds** (38 gesamt:
  Bleat, Quietscheente, Fanfare, Kinderlachen, Schrei, Glasbruch, Kamera, Tür, Uhr, Glitzer, Punch, Whoosh 2),
  Gruppen Impact / Lustig / Magie / Atmosphäre. Doku: `docs/SOUNDS.md`.
- **Zuschauer-Trigger** 💬: Twitch-Chat (ohne Login), YouTube-Live-Chat (API-Key), Befehle `!airhorn` → Trigger,
  Cooldown pro Zuschauer und global, Chat-Feed im Panel; **Geschenke-Webhook** `POST /api/gift` mit Stufen
  (TikTok über TikFinity/Streamer.bot, YouTube Super Chat, Twitch Bits automatisch). Doku: `docs/VIEWER.md`.
- **Kombis** 🔥 („krass“ 3× in 10 s → Konfetti) und **Intensität aus Stimme** (lauter sprechen = stärkerer Effekt).
- **Pakete**: Türkçe 85 (+30), Deutsch 49 (+18), English 50 (+18); neu „👨‍👩‍👧 Familie & Kinder“ (27) und
  „🎮 Gaming“ (27).

## 1.5.0 – Ton-Check & automatische Sprache

- **Vorschau stumm** (`overlay.html?volume=0`): Die Overlay-Vorschau im Panel spielt keinen Ton mehr, damit der
  Stream Effekte nicht doppelt bekommt. Schalter **„Vorschau-Ton“** (`livefx.previewSound`) nur zum Reinhören;
  ein stummer Preview bleibt stumm, auch wenn der Lautstärke-Regler (Panel/Handy/API) `volume`-Nachrichten schickt.
- **Echo-Warnung**: Ist Vorschau-Ton an und ein zweites Overlay (OBS) verbunden (`/health` alle 5 s), warnt das
  Panel mit Ausschalt-Knopf.
- **Karte „🔊 Ton-Check“**: fünf Haken (Mikro als OBS-Quelle, „Audio über OBS steuern“, Desktop-Audio, Monitoring,
  Vorschau-Ton – letzter automatisch), **Mikro-Test** (5 s Pegel) und **„Test-Sound in OBS“** (Karte TON-TEST mit
  `pop` über die Bridge). Neue Anleitung `docs/AUDIO.md` (Echo-Ursachen, OBS-Mikro, Monitoring, Fehlerhilfe);
  OBS-Anleitung mit Mikro-Schritt; Demo-Seite mit Hinweis.
- **Automatische Sprache**: `#lang` → „Automatisch (DE/TR/EN)“ (Standard für neue Nutzer; gespeicherte Sprache bleibt).
  Nutzt das Backend `auto` von `js/asr.js` (`langs: de-DE/tr-TR/en-US`, `lang`-Events), Whisper bekommt `lang:'auto'`;
  fehlt das Backend, Browser-Erkennung mit Deutsch. Diagnose „Erkannte Sprache: Türkçe (tr-TR) · Modus: parallel“,
  Kopfzeile „Auto · TR“, Matcher und Story-Paket folgen der erkannten Sprache.

## 1.4.0 – Handy, PWA, HTTPS, Offline-Erkennung

- **Handy-Fernbedienung** (`mobile.html`): alle Trigger als große Kacheln, Suche, Pause, Lautstärke, Szenen-Reihe,
  Live-Transkript; Link mit Token aus der Panel-Karte „📱 Handy“ (`/m?token=…`), Mikro am Handy bei HTTPS.
- **PWA**: Manifest + Service Worker – Panel/Overlay/Demo/Handy laufen ohne Internet (App-Shell aus dem Cache).
- **HTTPS** optional über `LIVEFX_TLS_CERT`/`LIVEFX_TLS_KEY` (`docs/HANDY-HTTPS.md`), `/api/config` liefert LAN-IPs.
- **Offline-Erkennung (experimentell)**: Whisper im Web-Worker, einmalig `npm run setup-offline` (`docs/OFFLINE.md`).

## 1.3.0 – Story-Modus

- **Szenen** (`visual.kind: 'scene'`): 13 Vollbild-Szenen (Regen, Nacht, Wald, Meer, Feuer, Schloss, Schnee, Wüste,
  Stadt, Weltraum, Sonnenaufgang, Gewitter, Szene beenden) mit animierten Partikeln, Überblendung, Bildunterschrift
  und Intensität; bleiben bis zur nächsten Szene. **Sticker** (`sticker`): 2–4 Emojis in Formation.
- **Atmosphäre-Loops** (`sound: "loop:<name>"`): 12 synthetische Endlos-Klänge (Regen, Wind, Kamin, Vögel, Meer,
  Donner, Grillen, Herzschlag, Glocken, Stadt, Weltraum, Sturm) mit sanftem Ein-/Ausblenden; nur einer läuft.
- **Geschichten-Pakete** 📖 Deutsch (28), Türkçe (30, „bir varmış bir yokmuş“, „yağmur yağıyordu“ …), English (29):
  Szenen-Trigger mit Loop und Sticker für Drache, Prinzessin, Ritter, Schatz, Hexe … – Stichwörter kollidieren nicht
  mit den Meme-Paketen.
- **Panel-Karte „Story-Modus“**: ein Haken lädt das Paket der aktuellen Sprache, stellt Toleranz mittel /
  Reaktion sicher / 2 s Abstand ein (beim Ausschalten wieder zurück) und zeigt das Szenen-Pad. Editor mit Effekt
  „Szene“ (Szene, Intensität, Text) und „Sticker“, Sound-Gruppe „Atmosphäre (Loop)“; Pad-Kacheln zeigen das Szenen-Emoji.
- Demo-Seite zeichnet Szenen und Loops mit auf. Anleitung: `docs/STORY.md`.

## 1.2.0 – Robuste Erkennung

- **Dialekt-Toleranz** (aus / mittel / hoch): Der Matcher erkennt Stichwörter auch bei kleinen Abweichungen
  („grass“ → krass, „helal olsn“ → helal olsun) – mit Schutz vor Fehltreffern (kurze Wörter nur exakt, echte
  Stichwörter und Stoppwörter werden nie unscharf gematcht). Standard: mittel; Server und Demo-Seite ziehen mit.
- **Karte „Erkennung“** im Panel: Sprache mit Varianten (de-DE/AT/CH, tr-TR, en-US/GB/IN), Toleranz, Reaktion
  „schnell“ (Zwischenergebnisse) oder „sicher“ (nur finale Sätze), Alternativen (3 Lesarten), geplanter
  Neustart alle 60 s. Alles greift sofort, ohne Neuladen, und bleibt gespeichert.
- **Lernen aus dem Stream**: unscharfe Treffer lassen sich per Klick als Stichwort speichern; Sätze ohne Treffer
  erscheinen als Liste – Wörter anklicken, Trigger zuweisen oder ignorieren.
- **Diagnose**: Mikro-Pegel, Zustand der Erkennung (letztes Ergebnis, Neustarts), Latenz nach Sprachende und
  Matcher-Zeit; **Selbsttest** („sag krass“) prüft Mikro → Erkennung → Matcher in einem Schritt.
- Spracherkennung: Watchdog gegen hängende Sitzungen, geplante Neustarts nur in Sprechpausen, Zwischenergebnisse
  werden korrekt mit Leerzeichen zusammengesetzt.

## 1.1.0 – Memes, Sprachen, Demo

- **Meme-Pakete** Türkçe (55), Deutsch (31), English (32) – im Panel per Klick laden/entfernen.
- **GIF-Suche** (Tenor/Giphy) in der Medien-Bibliothek mit sicherem Server-Import und „Als Trigger“.
- **Demo-Seite ohne OBS** (`demo.html`): Kamera + Effekte + Sounds aufnehmen und als Video herunterladen.
- **12 neue Sounds** (26 gesamt); Vine-Boom übersteuert nicht mehr.
- Panel: Demo-Karte, ausführlichere OBS-Schritte, Anleitungen (`docs/`) direkt verlinkt; Layout auf Handybreite ohne Überlauf.

## 1.0.0 – vom Prototyp zum Programm

### Neu
- **Medien-Bibliothek**: eigene PNG/JPG/GIF/WebP und MP3/WAV/OGG direkt im Panel hochladen (`POST /api/assets`, bis 8 MB, Magic-Bytes-Prüfung); Bilder als `image`-Effekt, Sounds als `file:assets/…`.
- **Trigger-Editor** als Dialog: Stichwörter, Effekt-Typ, Position, Emoji/Text/Farben, Bild, Sound, Cooldown, Screen-Shake, KI-Hinweis, „Testen“.
- **Serverseitige Speicherung** der Trigger in `data/triggers.json` (Panel und OBS sehen dasselbe; neue Standard-Trigger werden nachgemergt, gelöschte bleiben gelöscht; localStorage nur noch als Fallback).
- **Smart-Modus** (optional): finale Sätze ohne Stichwort-Treffer werden per Sprachmodell einem Trigger zugeordnet (`server/smart.js`, Anthropic SDK + zod als optionale Dependencies, Prompt-Caching, 1,5-s-Timeout, Rate-Limit, Mock-Modus für Tests).
- **Pluggbare Spracherkennung** (`js/asr.js`): Browser-Mikro (Web Speech) oder **Extern** – Whisper/Deepgram/… pushen Text per `POST /api/transcript`.
- **Externe Trigger-API** mit Token (`data/token.txt`): `POST /api/fire {id|trigger}` für Stream Deck, Streamer.bot, Chat-Bots.
- **Hochkant-Layout** `overlay.html?layout=portrait` mit Safe-Zones (untere 35 % bleiben frei für den Chat), Effekt-Position `center|top|safe`.
- Overlay bekommt beim Verbinden die zuletzt gesetzte Lautstärke; mehrere Overlays gleichzeitig möglich.

### Behoben
- Effekte feuerten in Vorschau/zweitem Tab **doppelt** (BroadcastChannel + SSE) → Nachrichten-IDs mit Dedup.
- Overlay verband sich nach SSE-Abbruch nicht neu → Reconnect mit Backoff, Event-IDs und Replay.
- Server stürzte bei `GET /%`, `GET /%00` oder kaputtem Host-Header ab → Router mit sauberer Fehlerbehandlung.
- Pfad-Traversal und Auslieferung von `server.js`/Tests → Allow-List für statische Dateien.
- Jede Website konnte `POST /fire` auslösen (CSRF) → Token oder Same-Origin + Host-Allowlist; keine CORS-Header mehr.
- HTML-Injection über Emoji/Text/Bildquelle im Overlay und Panel → konsequentes Escaping, Bildquellen-Allowlist, Emoji-Regen auf 60 gedeckelt.
- Mikro-Neustart-Schleife und Sprachwechsel-Race (zwei Recognizer) → Backoff, Generationen-Guard.
- Hotkeys feuerten deaktivierte Trigger und bei gedrückter Taste/Modifier; Transcript-Highlight scheiterte an Apostrophen; Import ohne `id` teilte Cooldowns; kaputte localStorage-Daten crashten das Panel.
- Zu große Request-Bodies ließen die Verbindung hängen → 413 nach Drain.

### Intern
- `server.js` ist Composition Root, Logik in `server/*` (Router, Static, SSE, Auth, State, APIs, Smart).
- Gemeinsames Schema v2 (`js/schema.js`) für Browser und Server; `docs/CONTRACTS.md` beschreibt alle Schnittstellen.
- Tests: `node --test` für Schema/Matcher/Server/APIs/Smart, Playwright-e2e-Szenarien in `test/e2e/`.

## 0.1.0 – Prototyp
- Web-Speech-Erkennung → Keyword-Matcher → SSE-Bridge → OBS-Overlay, 15 Trigger (DE/EN/TR), 14 synthetische Sounds, Soundboard-Hotkeys, Trigger-Tabelle mit JSON-Export/Import.
