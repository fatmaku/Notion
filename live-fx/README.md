# LiveFX – Live-Memes, Sticker & Sounds für Livestreams

**Was es macht:** Du redest – LiveFX hört zu. Sagst du „krass“, „bruh“, „oh nein“, „Applaus“ …,
erscheint sofort das passende Meme/Emoji-Effekt im Stream und der passende Sound spielt.
Wie Live-Untertitel, nur mit Bildern, Animationen und Geräuschen. Läuft mit Instagram Live,
TikTok LIVE, YouTube Live, Twitch – überall, wo man per OBS/Streamlabs streamt.

```
Mikro ──► Spracherkennung ──► Keyword-Matcher ──► Bridge (SSE) ──► Overlay in OBS ──► Stream
             (Browser)          (Cooldowns,          server.js        Emoji-Regen,
                                 Mehrsprachig)                        Karten, Konfetti,
                                                                      synthetische Sounds
```

## Schnellstart (2 Minuten)

```bash
cd live-fx
node server.js
```

1. **Control Panel** öffnen: <http://localhost:8787/> (Chrome oder Edge – die haben die Spracherkennung).
2. **„Mikro starten“** klicken, Zugriff erlauben, etwas sagen: *„das ist ja krass“*.
3. **OBS / Streamlabs**: Quelle hinzufügen → *Browser* → URL `http://localhost:8787/overlay.html`
   – Größe = dein Canvas (1920×1080 quer, **1080×1920 hoch für TikTok/Instagram**).
   Häkchen bei *„Audio über OBS steuern“*, damit die Sounds im Stream landen.
4. Streamen wie gewohnt. Zusätzlich: Hotkeys **1–9, 0, Q, W, E, R, T** als Soundboard.

Ohne Mikro testen: im Panel Text eintippen → „Senden“. Ohne Server testen: `index.html`
direkt im Browser öffnen, Vorschau läuft über BroadcastChannel.

## Wie kommt das Overlay in Instagram / TikTok / YouTube?

| Plattform | Weg |
|---|---|
| **YouTube Live** | OBS → Stream-Key. Standard. |
| **Twitch** | OBS → Stream-Key. Standard. |
| **TikTok LIVE** | *TikTok LIVE Studio* (offizielle Desktop-App, Fenster/Browser-Quelle möglich) oder OBS mit Stream-Key (Key wird ab bestimmter Follower-Zahl bzw. auf Anfrage freigeschaltet). |
| **Instagram Live** | *Live Producer* (instagram.com → Live → „Stream-Key“) → OBS mit RTMPS-Key, Canvas 1080×1920. |
| **Nur Handy (App)** | Kein Overlay-Zugriff durch Drittanbieter-Apps → das ist genau die Lücke, die Meta/TikTok nativ schließen müssten (siehe [PITCH.md](PITCH.md)). Workaround: Handy filmt einen Monitor/zweites Gerät mit Overlay, oder Streamlabs Mobile mit Browser-Quelle. |

## Eigene Memes & Sounds

- **Trigger-Tabelle** im Panel: Stichwörter, Sound, an/aus, Test-Button. Wird im Browser gespeichert; Export/Import als JSON.
- **Eigene Bilder**: Trigger-JSON exportieren und `visual` auf `{"kind":"image","src":"assets/mein-meme.png","text":"..."}` setzen, Bild in `live-fx/assets/` legen.
- **Eigene Sounds**: eigene Datei in `assets/` ablegen und in `js/sounds.js` einen Eintrag hinzufügen, der sie per `<audio>` abspielt – oder eine der 14 synthetischen SFX nutzen (Airhorn, Vine-Boom, Sad Trombone, Rimshot, Grillen, Applaus, Record-Scratch, Ding, Buzzer, Tada, Trommelwirbel, Kasse, Whoosh, Pop). Die sind per WebAudio generiert → **keine Lizenzkosten, keine Copyright-Strikes**.

### Effekt-Typen (`visual.kind`)

| kind | Beschreibung |
|---|---|
| `card` | Großes Emoji + Text als Karte in der Mitte, poppt rein (`shake: true` für Screen-Shake + Blitz) |
| `rain` | Emoji regnet von oben (`count`) |
| `banner` | Breites Textbanner fährt durch |
| `confetti` | Konfetti + optionale Karte |
| `image` | Eigenes Bild (`src`) |

## Technik

- Reines HTML/JS/CSS, **keine Dependencies**, Node nur für den Bridge-Server (SSE).
- Spracherkennung: Web Speech API (Chrome/Edge). Für Produktion austauschbar gegen Whisper/Deepgram-Streaming – der Matcher bekommt einfach Text.
- Matcher (`js/matcher.js`): Whole-Word-Match, Mehrsprachig (DE/EN/TR im Standardpaket), per-Trigger-Cooldown und globaler Mindestabstand gegen Effekt-Spam; zählt Vorkommen im laufenden Satz, damit Interim-Ergebnisse nicht doppelt feuern.
- Tests: `node test/matcher.test.js` und `node test/e2e.js` (Playwright, Chromium).

## Roadmap Richtung Produkt

1. **Semantisches Matching** statt Stichwörtern (LLM-Klassifikation: „das war so peinlich für ihn“ → *awkward*), Kontext-Timing (Effekt erst am Satzende).
2. **Meme-Bibliothek** mit lizenzierten GIFs/Sounds (Giphy/Tenor-API), Community-Packs.
3. **Native Mobile-SDK** für In-App-Live (die eigentliche Lücke bei Instagram/TikTok).
4. **Zuschauer-Trigger**: Chat-Kommandos / Geschenke lösen Effekte aus (Monetarisierung).
