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
                                                                          Konfetti, eigene Bilder, Sounds)
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

## Eigene Memes, GIFs & Sounds

- **Medien-Bibliothek** im Panel: PNG/JPG/GIF/WebP und MP3/WAV/OGG hochladen (bis 8 MB pro Datei).
  Die Dateien landen in `data/assets/` und sind sofort in jedem Overlay verfügbar.
- **Trigger-Editor** (✎ in der Trigger-Tabelle oder „+ Trigger“): Stichwörter, Effekt-Typ, Position,
  Emoji/Text/Farben, eigenes Bild, Sound (eingebaut oder hochgeladen), Cooldown, Screen-Shake,
  KI-Hinweis (für den Smart-Modus). „Testen“ spielt den Effekt sofort im Overlay.
- **14 eingebaute Sounds** sind per WebAudio synthetisiert (Airhorn, Vine-Boom, Sad Trombone,
  Rimshot, Grillen, Applaus, Record-Scratch, Ding, Buzzer, Tada, Trommelwirbel, Kasse, Whoosh, Pop)
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

Position: `center` (Mitte), `top` (oben), `safe` (im Hochkant-Layout im oberen Drittel, quer = Mitte).

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

## Konfiguration (Umgebungsvariablen)

| Variable | Standard | Bedeutung |
|---|---|---|
| `PORT` | `8787` | HTTP-Port (`0` = zufällig, wird ausgegeben) |
| `HOST` | `127.0.0.1` | `0.0.0.0` macht LiveFX im LAN erreichbar (für OBS auf anderem PC) |
| `LIVEFX_DATA_DIR` | `live-fx/data` | Ablage für `triggers.json`, `token.txt`, `assets/` |
| `LIVEFX_TOKEN` | (aus Datei) | API-Token vorgeben |
| `LIVEFX_ALLOWED_HOSTS` | – | Zusätzliche Hostnamen, unter denen das Panel geöffnet werden darf (z. B. `livefx.local`) |
| `LIVEFX_MODEL` | `claude-opus-5-5` | Modell für den Smart-Modus |
| `LIVEFX_SMART` | `1` | `0` = Smart-Modus aus |
| `LIVEFX_SMART_MOCK` | `0` | `1` = Test-Klassifikator ohne API-Key |
| `LIVEFX_SMART_TIMEOUT_MS` | `1500` | Timeout pro Klassifikation |

## Sicherheit

- Der Server lauscht standardmäßig nur auf `127.0.0.1`.
- Jede schreibende Route verlangt den Token **oder** einen Same-Origin-Aufruf aus dem Panel
  (`Sec-Fetch-Site`/`Origin`-Prüfung + Host-Allowlist gegen DNS-Rebinding). Fremde Webseiten
  können keine Effekte auslösen.
- Ausgeliefert werden nur Panel, Overlay, `css/`, `js/` und hochgeladene Medien – nie Server-Code,
  Tests, `triggers.json` oder `token.txt`. Dateinamen werden bereinigt, Uploads per Magic-Bytes geprüft.
- Alle Texte aus Triggern werden im Overlay escaped; Bildquellen sind auf `assets/…` und `https://…` beschränkt.

## Technik

- Reines HTML/JS/CSS, **keine Dependencies**; Node nur für Server/Bridge. Optional: Anthropic SDK + zod für den Smart-Modus.
- Spracherkennung: Web Speech API (Chrome/Edge) oder externer Push (`POST /api/transcript`).
- Matcher (`js/matcher.js`): Whole-Word-Match, mehrsprachig (DE/EN/TR im Standardpaket), spezifischere
  Stichwörter gewinnen („oh nein“ vor „nein“), per-Trigger-Cooldown und globaler Mindestabstand gegen
  Effekt-Spam; zählt Vorkommen im laufenden Satz, damit Zwischenergebnisse nicht doppelt feuern.
- Bridge: Server-Sent Events mit Event-IDs und Replay nach Reconnect; Nachrichten sind per ID
  dedupliziert, damit Vorschau (BroadcastChannel) und OBS (SSE) nie doppelt feuern.
- Struktur: `server.js` (Composition Root) + `server/*.js` (Router, Static, SSE, Auth, State, APIs, Smart),
  `js/*.js` (Schema, Matcher, Bus, Renderer, Store, Assets, Editor, ASR, Smart, Panel).

## Tests

```bash
npm run test:unit    # node --test "test/*.test.js" – Schema, Matcher, Server, APIs, Smart (Mock)
npm run test:e2e     # Playwright/Chromium: Panel + Overlay end-to-end (test/e2e/*.js)
npm test             # beides
```

Playwright wird lokal (`npm install playwright`) oder aus der globalen Installation aufgelöst;
Browser: `PLAYWRIGHT_BROWSERS_PATH` bzw. `npx playwright install chromium`.

## Roadmap Richtung Produkt

1. **Native Mobile-SDK** für In-App-Live (die eigentliche Lücke bei Instagram/TikTok).
2. **Meme-Bibliothek** mit lizenzierten GIFs/Sounds (Giphy/Tenor-API), Community-Packs.
3. **Zuschauer-Trigger**: Chat-Kommandos / Geschenke lösen Effekte aus (Monetarisierung) – die API dafür ist da.
4. Kontext-Timing (Effekt erst am Satzende) und Streaming-ASR mit < 300 ms Latenz.
