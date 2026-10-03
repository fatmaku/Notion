# LiveFX – Live-Memes, Sticker & Sounds für Livestreams

**Was es macht:** Du redest – LiveFX hört zu. Sagst du „krass“, „bruh“, „oh nein“, „Applaus“ …,
erscheint sofort das passende Meme/GIF/Emoji-Effekt im Stream und der passende Sound spielt.
Wie Live-Untertitel, nur mit Bildern, Animationen und Geräuschen. Läuft mit Instagram Live,
TikTok LIVE, YouTube Live, Twitch – überall, wo man per OBS/Streamlabs streamt.

```
Mikro ─► Spracherkennung ─► Keyword-Matcher (sofort) ──────────────┐
                        └► Smart-Modus (KI, satzweise, optional) ──┤
Stream Deck / Chat-Bot / Whisper ─► HTTP-API (Token) ──────────────┼─► Bridge (SSE) ─► Overlay in OBS ─► Stream
Panel: eigene GIFs/PNGs/MP3s hochladen, Trigger bearbeiten ────────┘      (Karten, Emoji-Regen, Banner,
                                                                          Konfetti, eigene Bilder, Sounds,
                                                                          Story-Szenen mit Atmosphäre)
```

## Schnellstart (2 Minuten)

```bash
cd live-fx
node server.js            # → http://127.0.0.1:8787
```

1. **Control Panel** öffnen: <http://127.0.0.1:8787/> (Chrome oder Edge – die haben die Spracherkennung).
2. **„Mikro starten“** klicken, Zugriff erlauben, etwas sagen: *„das ist ja krass“*.
3. **OBS / Streamlabs**: Quelle hinzufügen → *Browser* → URL `http://127.0.0.1:8787/overlay.html`
   – Größe = dein Canvas (1920×1080 quer). **Hochkant für TikTok/Instagram:**
   `http://127.0.0.1:8787/overlay.html?layout=portrait` mit 1080×1920.
   Häkchen bei *„Audio über OBS steuern“*, damit die Sounds im Stream landen.
4. Streamen wie gewohnt. Zusätzlich: Hotkeys **1–9, 0, Q, W, E, R, T** als Soundboard.

Ohne Mikro testen: im Panel Text eintippen → „Senden“. Ohne Server testen: `index.html` direkt im
Browser öffnen (Vorschau läuft dann über BroadcastChannel; Uploads/Speichern brauchen den Server).

OBS läuft auf einem **anderen PC**? `HOST=0.0.0.0 node server.js` und im Overlay die IP des
LiveFX-Rechners verwenden (`http://192.168.1.20:8787/overlay.html`).

## Demo-Clip ohne OBS

`http://127.0.0.1:8787/demo.html` → Kamera + Memes + Sounds in einem Fenster, „⏺ Aufnahme starten“,
reden, „Stopp“, Video herunterladen (16:9 oder 9:16). Anleitung: [docs/DEMO-CLIP.md](docs/DEMO-CLIP.md).
Für echte Streams bleibt OBS der Weg: [docs/OBS-ANLEITUNG.md](docs/OBS-ANLEITUNG.md).

## Meme-Pakete (Türkçe / Deutsch / English)

Im Panel unter **Meme-Pakete** mit einem Klick laden: **Türkçe (55 Trigger)** – yok artık, ohaa, helal olsun,
aynen, kral, efsane, rezil, maşallah, eyvallah … – sowie Deutsch (31) und English (32) mit den gängigen
Stream-/Internet-Ausdrücken. Jedes Paket lässt sich wieder entfernen; eigene Änderungen bleiben erhalten.

## Story-Modus – Vorlesen mit Szenen (1.3)

Karte **📖 Story-Modus** im Panel einschalten, vorlesen: „es regnete“, „in der Nacht“, „im Wald“, „der Drache“ …
werden zu Vollbild-Szenen mit Atmosphäre-Sound (Regen, Grillen, Vögel, Kamin …), die bis zur nächsten Szene
bleiben; Figuren erscheinen als Sticker oben. 13 Szenen, Geschichten-Pakete für Deutsch, Türkçe („bir varmış
bir yokmuş“) und English, Szenen-Pad zur Handsteuerung, eigene Szenen-Trigger im Editor.
Anleitung: [docs/STORY.md](docs/STORY.md).

## GIF-Suche (Tenor / Giphy)

Im Panel unter **Medien → GIF-Suche** Memes direkt suchen, speichern oder per „Als Trigger“ sofort einem
Stichwort zuordnen. Braucht einen kostenlosen API-Key von Tenor oder Giphy: [docs/GIFS.md](docs/GIFS.md).

## Wie kommt das Overlay in Instagram / TikTok / YouTube?

| Plattform | Weg |
|---|---|
| **YouTube Live** | OBS → Stream-Key. Standard. |
| **Twitch** | OBS → Stream-Key. Standard. |
| **TikTok LIVE** | *TikTok LIVE Studio* (offizielle Desktop-App, Browser-Quelle möglich) oder OBS mit Stream-Key (Key wird ab bestimmter Follower-Zahl bzw. auf Anfrage freigeschaltet). Overlay mit `?layout=portrait`. |
| **Instagram Live** | *Live Producer* (instagram.com → Live → „Stream-Key“) → OBS mit RTMPS-Key, Canvas 1080×1920, Overlay mit `?layout=portrait`. |
| **Nur Handy (App)** | Kein Overlay-Zugriff durch Drittanbieter-Apps → genau die Lücke, die Meta/TikTok nativ schließen müssten (siehe [PITCH.md](PITCH.md)). Workaround: Streamlabs Mobile mit Browser-Quelle. |

Im Hochkant-Layout bleiben alle Effekte oberhalb der unteren 35 % (dort liegen bei TikTok/IG die
Kommentare) und der Emoji-Regen fällt entsprechend kürzer.

## Ton & Echo (Mikro in OBS, keine Doppel-Effekte)

Aus echten Streams gelernt: Das Mikro der Spracherkennung läuft **im Browser** – OBS hört es erst, wenn du es dort
als Quelle **Audioeingabeaufnahme** anlegst. Und das Overlay läuft zweimal (Panel-Vorschau + OBS-Browser-Quelle):
spielt die Vorschau Ton, hören Zuschauer jeden Effekt **doppelt**. Deshalb:

- Die **Overlay-Vorschau im Panel ist stumm** (Schalter „Vorschau-Ton“ nur zum Reinhören); ist dabei ein OBS-Overlay
  verbunden, zeigt das Panel eine **Echo-Warnung**.
- Karte **🔊 Ton-Check**: fünf Haken (Mikro-Quelle, „Audio über OBS steuern“, Desktop-Audio stumm, Monitoring aus,
  Vorschau-Ton aus), **Mikro-Test** und **„Test-Sound in OBS“**.
- Schritt-für-Schritt mit Fehlerhilfe („Zuschauer hören mich nicht“, „Echo“, „Effekte doppelt“): [`docs/AUDIO.md`](docs/AUDIO.md).

## Grafik, Sound & Zuschauer (1.6)

- **Effekte v2**: Partikel mit Physik auf einem Canvas (60 fps mit automatischem Limit), Glow, 3D-Karten, Impact-Zoom,
  Lichtstrahlen; neue Effekt-Typen **Text** (Neon/Verlauf/Bounce/Glitch), **Bauchbinde** und **Kombi** (Sequenz).
  Pro Effekt: Glow, Kippen, Impact, Intensität 1–3, Lautstärke (`gain`).
- **Look (Theme)** im Panel: Neon, Pastell, Minimal, Kinderbuch – oder fest per `overlay.html?theme=pastel`.
- **Sound-Mixer**: Limiter, Ducking der Atmosphäre, Stereo nach Position, Hall für Szenen, 38 Sounds in Gruppen
  ([`docs/SOUNDS.md`](docs/SOUNDS.md)).
- **Zuschauer-Trigger** 💬: Twitch-Chat ohne Login, YouTube-Live-Chat mit API-Key, `!befehl` → Trigger mit Cooldowns,
  Geschenke-Webhook mit Stufen (TikTok via TikFinity/Streamer.bot) – [`docs/VIEWER.md`](docs/VIEWER.md).
- **Kombis** („krass“ 3× in 10 s → Konfetti) und **Intensität aus Stimme**.
- **Pakete**: Türkçe 85, Deutsch 49, English 50, neu „Familie & Kinder“ und „Gaming“.

## Eigene Memes, GIFs & Sounds

- **Medien-Bibliothek** im Panel: PNG/JPG/GIF/WebP und MP3/WAV/OGG hochladen (bis 8 MB pro Datei).
  Die Dateien landen in `data/assets/` und sind sofort in jedem Overlay verfügbar.
- **Trigger-Editor** (✎ in der Trigger-Tabelle oder „+ Trigger“): Stichwörter, Effekt-Typ, Position,
  Emoji/Text/Farben, eigenes Bild, Sound (eingebaut oder hochgeladen), Cooldown, Screen-Shake,
  KI-Hinweis (für den Smart-Modus). „Testen“ spielt den Effekt sofort im Overlay.
- **26 eingebaute Sounds** sind per WebAudio synthetisiert (Airhorn, Vine-Boom, Sad Trombone,
  Rimshot, Grillen, Applaus, Record-Scratch, Ding, Buzzer, Tada, Trommelwirbel, Kasse, Whoosh, Pop,
  Lachen, Boing, Slide-Whistle, Dramatic, Coin, Level-up, Glocke, Ooh, Herzschlag, Sirene, Nope, Gong)
  → **keine Lizenzkosten, keine Copyright-Strikes**.
- Trigger werden serverseitig in `data/triggers.json` gespeichert (Panel und OBS sehen dasselbe);
  Export/Import als JSON bleibt möglich.

### Effekt-Typen

| Typ | Beschreibung |
|---|---|
| `card` | Großes Emoji + Text als Karte, poppt rein (`Screen-Shake` optional) |
| `image` | Eigenes Bild/GIF (aus der Medien-Bibliothek oder `https://…`) |
| `rain` | Emoji regnet von oben (Anzahl 1–60) |
| `banner` | Breites Textbanner fährt durch |
| `confetti` | Konfetti + optionale Karte |
| `scene` | Vollbild-Szene (`scene`: rain, night, forest, sea, fire, castle, snow, desert, city, space, sunrise, storm, clear) mit Partikeln, `intensity` 1–3, `text` als Bildunterschrift; bleibt bis zur nächsten Szene |
| `sticker` | 2–4 Emojis in Formation mit Hüpfer (Story-Modus) |

Sound: eingebauter Name (`airhorn` …), eigene Datei (`file:assets/…`) oder Atmosphäre-Loop (`loop:rain`, `loop:birds` …, läuft bis zur nächsten Szene).

Position: `center` (Mitte), `top` (oben), `safe` (im Hochkant-Layout im oberen Drittel, quer = Mitte).

## Robuste Erkennung (Dialekt, Lernen, Diagnose)

Im Panel unter **Erkennung**:

- **Sprache**: **Automatisch (DE/TR/EN)** erkennt beim Sprechen, ob du gerade Deutsch, Türkçe oder English
  redest (Standard, 1.5) – oder fest mit Varianten (Deutsch DE/AT/CH, Türkçe, English US/GB/IN). Die Kopfzeile zeigt
  „Auto · TR“ bzw. die feste Sprache, die Diagnose die erkannte Sprache und den Modus.
- **Dialekt-Toleranz** aus / mittel / hoch: „grass“ löst trotzdem *krass* aus, „helal olsn“ *helal olsun*. Kurze
  Wörter (≤ 4 Buchstaben) werden immer exakt verglichen, echte Stichwörter nie verwechselt („schön“ ≠ „schon“).
- **Reaktion**: *schnell* feuert schon bei Zwischenergebnissen, *sicher* erst beim fertigen Satz.
- **Alternativen prüfen**: bei einem Satz ohne Treffer werden bis zu 3 Lesarten der Spracherkennung geprüft.
- **Lernen**: unscharfe Treffer bekommen einen „als Stichwort speichern“-Button; Sätze ohne Treffer erscheinen
  unter dem Transkript – Wörter anklicken, Trigger zuweisen oder ignorieren.
- **Diagnose + Selbsttest**: Mikro-Pegel, Zustand (letztes Ergebnis, Neustarts), Latenz; der Selbsttest sagt dir
  in 8 s, ob Mikro, Erkennung und Matcher zusammenspielen.

Alle Einstellungen greifen sofort und liegen im Browser (`livefx.asr.*`).

## Smart-Modus (KI, optional)

Stichwörter treffen nicht alles: *„das war so peinlich für ihn“* enthält kein Trigger-Wort.
Im Smart-Modus wird jeder **fertige Satz ohne Stichwort-Treffer** von einem Sprachmodell einem
Trigger zugeordnet (oder keinem). Der Effekt feuert dann über dieselben Cooldowns wie ein Stichwort.

```bash
cd live-fx
npm install @anthropic-ai/sdk zod        # optional – nur für den Smart-Modus
export ANTHROPIC_API_KEY=sk-ant-…        # Key aus https://platform.claude.com
node server.js
```

Im Panel den Schalter **„KI-Modus“** aktivieren. Status-Punkt: grün = verfügbar, gelb = SDK/Key
fehlt (Panel zeigt den Grund). Details:

- Modell: `claude-opus-5-5` (Standard), änderbar mit `LIVEFX_MODEL=…`. Die Klassifikation läuft mit
  niedriger Denk-Tiefe (`effort: low`) und einem Timeout von 1,5 s (`LIVEFX_SMART_TIMEOUT_MS`).
  Dauert die Antwort länger, passiert einfach nichts – lieber kein Meme als ein spätes.
- Die Trigger-Liste (Name, Stichwörter, KI-Hinweis) wird per Prompt-Caching wiederverwendet.
  Kosten ≈ 0,004 $ pro Klassifikation, bei 1–3 Sätzen/Minute ≈ 0,25–0,75 $ pro Stunde.
- Höchstens 30 Aufrufe/Minute, ein Aufruf gleichzeitig, gleiche Sätze werden 60 s gecacht.
- Ohne Key testen: `LIVEFX_SMART_MOCK=1 node server.js` – dann löst der Text `trigger:<id>` den
  jeweiligen Trigger aus. `LIVEFX_SMART=0` schaltet den Modus ab.

## Externe Trigger & Spracherkennung (HTTP-API)

Jeder Server erzeugt beim ersten Start einen **API-Token** (`data/token.txt`, im Panel unter
„Externe API“ sichtbar; alternativ `LIVEFX_TOKEN=…`). Externe Tools senden ihn als
`Authorization: Bearer <token>`. Das Panel selbst braucht keinen Token (Same-Origin).

```bash
TOKEN=$(cat data/token.txt)

# Trigger per ID auslösen (respektiert Cooldowns; "force": true ignoriert sie)
curl -X POST http://127.0.0.1:8787/api/fire \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"id":"wow","source":"Stream Deck"}'

# Ad-hoc-Effekt ohne gespeicherten Trigger
curl -X POST http://127.0.0.1:8787/api/fire \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"trigger":{"label":"Hallo","sound":"tada","visual":{"kind":"card","emoji":"👋","text":"HALLO CHAT"}}}'

# Externe Spracherkennung (Whisper, Deepgram, …) pusht Text – LiveFX matcht wie beim Mikro
curl -X POST http://127.0.0.1:8787/api/transcript \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"text":"oh nein das war ein fail","final":true,"lang":"de"}'
```

Im Panel dafür die Spracherkennung auf **„Extern“** stellen – dann kommen die Sätze aus der API
statt vom Browser-Mikro (funktioniert damit auch in Firefox/Safari oder offline mit lokalem Whisper).

| Route | Zweck |
|---|---|
| `POST /api/fire` | `{id}` oder `{trigger}`, optional `source`, `force` |
| `POST /api/transcript` | `{text, final?, lang?, source?}` → an das Panel |
| `GET/PUT /api/triggers` | Trigger lesen/schreiben (`{triggers, removed?}`) |
| `GET/POST /api/assets`, `DELETE /api/assets/<name>` | Medien-Bibliothek (Upload: Body = Datei, Header `x-filename`) |
| `POST /api/smart/classify` | `{text}` → `{triggerId, confidence}` |
| `GET /api/smart/status`, `GET /health` | Status |
| `GET /m?token=<token>` | Handy-Login: setzt das Sitzungs-Cookie, leitet auf `/mobile.html` (10 Fehlversuche/Minute) |
| `GET /events?role=overlay\|panel` | SSE-Stream (das benutzt das Overlay) |

**Stream Deck**: Plugin „API Ninja“/„HTTP Request“ → POST mit obigem Body und Header.
**Streamer.bot**: Aktion „Fetch URL“ (Method POST, Header `Authorization`, Body wie oben).
**Chat-Bot** (Node, z. B. bei `!airhorn` im Chat):

```js
await fetch('http://127.0.0.1:8787/api/fire', {
  method: 'POST',
  headers: { authorization: `Bearer ${process.env.LIVEFX_TOKEN}`, 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'wow', source: `Chat: ${username}` }),
});
```

## Handy & HTTPS

Das Handy wird zur **Fernbedienung und zum zweiten Mikro**: Panel-Karte **📱 Handy** öffnen, den Link
`http://<LAN-IP>:<port>/m?token=…` am Handy eintippen (oder per Messenger schicken) – der Link setzt das
Sitzungs-Cookie und leitet auf `/mobile.html` weiter: alle Trigger als große Kacheln, Szenen-Leiste,
Pause, Lautstärke, Live-Transkript, als Web-App auf den Homescreen legbar. Dafür muss der Server im
LAN erreichbar sein: `HOST=0.0.0.0 node server.js`. Anleitung: [docs/HANDY.md](docs/HANDY.md).

Soll das **Handy selbst zuhören**, braucht der Browser eine HTTPS-Verbindung (Mikro nur im „sicheren
Kontext“). LiveFX spricht HTTPS mit einem selbst erstellten Zertifikat:

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj "/CN=livefx" \
  -addext "subjectAltName=IP:192.168.x.x" -keyout livefx-key.pem -out livefx-cert.pem
HOST=0.0.0.0 LIVEFX_TLS_CERT=livefx-cert.pem LIVEFX_TLS_KEY=livefx-key.pem node server.js
```

Dann das Zertifikat einmal auf dem Handy als vertrauenswürdig installieren (iPhone: Profil +
Zertifikatsvertrauenseinstellungen, Android: CA-Zertifikat) – Schritt für Schritt in
[docs/HANDY-HTTPS.md](docs/HANDY-HTTPS.md). Ohne HTTPS bleibt das Handy eine Fernbedienung; das
OBS-Overlay auf dem PC funktioniert in beiden Fällen. Fehlt eine der beiden Variablen oder ist eine
Datei nicht lesbar, startet LiveFX nicht (deutsche Fehlermeldung, Exit 1).

## Offline-Erkennung (experimentell)

Ohne Google-Dienst und ohne Internet im Stream: ein **Whisper-Modell läuft direkt im Browser**
(transformers.js, WebGPU/WASM). Einmalig mit Internet einrichten, danach im Panel die Engine
**„Offline (Whisper, experimentell)“** wählen:

```bash
npm run setup-offline                 # Whisper tiny (≈ 40 MB) nach vendor/ + data/models/
npm run setup-offline -- --model base # genauer, ≈ 150 MB
```

Rechne mit 1–3 s Verzögerung pro Sprechpause; Details, Grenzen und Fehlersuche in
[`docs/OFFLINE.md`](docs/OFFLINE.md).

## Konfiguration (Umgebungsvariablen)

| Variable | Standard | Bedeutung |
|---|---|---|
| `PORT` | `8787` | HTTP-Port (`0` = zufällig, wird ausgegeben) |
| `HOST` | `127.0.0.1` | `0.0.0.0` macht LiveFX im LAN erreichbar (für OBS auf anderem PC) |
| `LIVEFX_DATA_DIR` | `live-fx/data` | Ablage für `triggers.json`, `token.txt`, `assets/` |
| `LIVEFX_TOKEN` | (aus Datei) | API-Token vorgeben |
| `LIVEFX_ALLOWED_HOSTS` | – | Zusätzliche Hostnamen, unter denen das Panel geöffnet werden darf (z. B. `livefx.local`) |
| `LIVEFX_TLS_CERT` | – | Pfad zum Zertifikat (PEM) → Server läuft per HTTPS; nur zusammen mit `LIVEFX_TLS_KEY` |
| `LIVEFX_TLS_KEY` | – | Pfad zum privaten Schlüssel (PEM); siehe [docs/HANDY-HTTPS.md](docs/HANDY-HTTPS.md) |
| `LIVEFX_MODEL` | `claude-opus-5-5` | Modell für den Smart-Modus |
| `LIVEFX_SMART` | `1` | `0` = Smart-Modus aus |
| `LIVEFX_SMART_MOCK` | `0` | `1` = Test-Klassifikator ohne API-Key |
| `LIVEFX_SMART_TIMEOUT_MS` | `1500` | Timeout pro Klassifikation |

## Sicherheit

- Der Server lauscht standardmäßig nur auf `127.0.0.1`.
- Jede schreibende Route verlangt den Token **oder** einen Same-Origin-Aufruf aus dem Panel
  (`Sec-Fetch-Site`/`Origin`-Prüfung + HttpOnly-Sitzungs-Cookie, das nur die Panel-Seite setzt;
  Host-Allowlist gegen DNS-Rebinding auf allen Routen). Fremde Webseiten und fremde Rechner im LAN
  können ohne Token keine Effekte auslösen.
- Ausgeliefert werden nur Panel, Overlay, `css/`, `js/` und hochgeladene Medien – nie Server-Code,
  Tests, `triggers.json` oder `token.txt`. Dateinamen werden bereinigt, Uploads per Magic-Bytes geprüft.
- Alle Texte aus Triggern werden im Overlay escaped; Bildquellen sind auf `assets/…` und `https://…` beschränkt.

## Technik

- Reines HTML/JS/CSS, **keine Dependencies**; Node nur für Server/Bridge. Optional: Anthropic SDK + zod für den Smart-Modus.
- Spracherkennung: Web Speech API (Chrome/Edge), externer Push (`POST /api/transcript`) oder
  experimentell offline mit Whisper im Browser (`js/whisper-worker.js`, `docs/OFFLINE.md`).
- Matcher (`js/matcher.js`): Whole-Word-Match, mehrsprachig (DE/EN/TR im Standardpaket), spezifischere
  Stichwörter gewinnen („oh nein“ vor „nein“), per-Trigger-Cooldown und globaler Mindestabstand gegen
  Effekt-Spam; zählt Vorkommen im laufenden Satz, damit Zwischenergebnisse nicht doppelt feuern.
  Optional unscharf (Dialekt-Toleranz): Akzent-Faltung + Damerau-Levenshtein mit Längen-Gates und
  Stoppwort-Schutz, Details in `docs/DESIGN-RECOGNITION.md`.
- Bridge: Server-Sent Events mit Event-IDs und Replay nach Reconnect; Nachrichten sind per ID
  dedupliziert, damit Vorschau (BroadcastChannel) und OBS (SSE) nie doppelt feuern.
- Struktur: `server.js` (Composition Root) + `server/*.js` (Router, Static, SSE, Auth, State, APIs, Smart),
  `js/*.js` (Schema, Matcher, Bus, Renderer, Store, Assets, Editor, Meter, ASR, Smart, Panel).

## Tests

```bash
npm run test:unit    # node --test "test/*.test.js" – Schema, Matcher, Server, APIs, Smart (Mock)
npm run test:e2e     # Playwright/Chromium: Panel + Overlay end-to-end (test/e2e/*.js)
npm test             # beides
```

Playwright wird lokal (`npm install playwright`) oder aus der globalen Installation aufgelöst;
Browser: `PLAYWRIGHT_BROWSERS_PATH` bzw. `npx playwright install chromium`.

## Business & Pitch

Alles für Vorstellung und Verkauf liegt in [`business/`](business/README.md): Marketingvideo (9:16 und 16:9),
Pitch-Deck (PPTX), Businessplan (MD + DOCX), Marktanalyse mit Quellen, LinkedIn-Artikel (DE/TR) und eine
statische Landingpage (DE/TR/EN).

## Roadmap Richtung Produkt

1. **Native Mobile-SDK** für In-App-Live (die eigentliche Lücke bei Instagram/TikTok).
2. **Meme-Bibliothek** mit lizenzierten GIFs/Sounds (Giphy/Tenor-API), Community-Packs.
3. **Plattform-Integration**: Pilot mit TikTok/Meta/YouTube, Zuschauer-Trigger nativ (Geschenke → Effekte).
4. Kontext-Timing (Effekt erst am Satzende) und Streaming-ASR mit < 300 ms Latenz.
