# Changelog

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
