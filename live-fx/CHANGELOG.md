# Changelog

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
