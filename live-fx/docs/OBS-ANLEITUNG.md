# OBS einrichten – Klick für Klick

Ziel: Deine Kamera + LiveFX-Overlay + Sounds landen zusammen im Stream (TikTok, Instagram, YouTube, Twitch).

## 1. Vorbereitung
1. **OBS Studio** installieren: <https://obsproject.com> (kostenlos, Windows/Mac).
2. LiveFX starten: Terminal im Ordner `live-fx` → `node server.js` (Fenster offen lassen).
3. Panel im Browser öffnen: `http://127.0.0.1:8787/` – hier bleibt das Mikro an.

## 2. Szene bauen (einmalig, 3 Minuten)
1. OBS öffnen → unten links unter **Szenen** ist „Szene“ schon da – reicht.
2. Unter **Quellen** auf **+** → **Videoaufnahmegerät** → OK → deine Webcam wählen → OK.
3. Unter **Quellen** auf **+** → **Browser** → Name `LiveFX Overlay` → OK. Einstellungen:
   - **URL**: `http://127.0.0.1:8787/overlay.html`
     - Hochkant (TikTok/Instagram): `http://127.0.0.1:8787/overlay.html?layout=portrait`
   - **Breite/Höhe**: genauso wie deine Leinwand (Querformat 1920 × 1080, Hochkant 1080 × 1920).
   - **„Audio über OBS steuern“** ✅ anhaken – sonst hört der Stream keine Sounds.
   - „Quelle aktualisieren, wenn Szene aktiv wird“ ✅ (optional, schadet nicht).
   - OK.
4. Die Browser-Quelle muss in der Liste **über** der Kamera stehen (mit den Pfeilen ▲▼ verschieben) – sonst liegt das Meme hinter dem Bild.
5. **Mikrofon** als eigene Quelle: **+** → **Audioeingabeaufnahme** → dein Mikro → OK. Ohne diesen Schritt hören
   dich die Zuschauer nicht – das Mikro der Spracherkennung läuft nur im Browser. Dazu **Desktop-Audio** im Mixer
   stumm schalten (sonst kommt der Panel-Tab doppelt rein) und Audio-Monitoring aus lassen. Alles Weitere, inkl.
   Echo-Fehlerhilfe: [`docs/AUDIO.md`](AUDIO.md) bzw. die Karte **🔊 Ton-Check** im Panel.
6. Sound-Check: Im Panel Taste **1** drücken → Karte erscheint in OBS, und im OBS-**Audiomixer** bewegt sich der Balken „LiveFX Overlay“. Wenn nicht: Zahnrad im Mixer → „Audio-Erweiterte Eigenschaften“ → Audioüberwachung auf „Überwachen und ausgeben“, falls du es auch selbst hören willst.

## 3. Hochkant für TikTok / Instagram
1. OBS → **Einstellungen** → **Video** → Basis- und Ausgabeauflösung `1080x1920` → OK.
2. Browser-Quelle bearbeiten → URL mit `?layout=portrait`, Breite 1080, Höhe 1920.
3. Kamera so skalieren, dass sie die Leinwand füllt (Rechtsklick → Transformieren → „An Bildschirm anpassen“).
   LiveFX lässt das untere Drittel automatisch frei, dort liegen Chat und Kommentare.

## 4. Streamen
| Plattform | So bekommst du den Stream-Key |
|---|---|
| **YouTube** | studio.youtube.com → „Live“ → Stream-Key kopieren → OBS Einstellungen → Stream → Dienst YouTube |
| **Twitch** | dashboard.twitch.tv → Einstellungen → Stream → Primärer Stream-Key |
| **TikTok LIVE** | TikTok LIVE Studio (Desktop-App) nutzen und dort die Browser-Quelle anlegen – oder OBS mit Stream-Key, sofern dein Account den Key freigeschaltet hat (ab bestimmter Follower-Zahl / auf Anfrage) |
| **Instagram Live** | instagram.com → „Live-Video erstellen“ → „Streaming-Software“ → Stream-URL + Key → OBS Einstellungen → Stream → Benutzerdefiniert |

Dann in OBS **„Stream starten“**. Im LiveFX-Panel **„Mikro starten“** – fertig.

## 5. Während des Streams
- **Hotkeys 1–9, 0, Q, W, E, R, T** feuern die ersten 15 Trigger manuell (Panel-Fenster muss den Fokus haben).
- **Pause** im Panel stoppt Effekte, ohne das Mikro abzuschalten.
- Lautstärke der Effekte: Schieberegler im Panel (wirkt sofort im Overlay).
- Zu viele Effekte? Im Panel „Mindestabstand zwischen Effekten“ hochsetzen (z. B. 3 s) oder Cooldowns einzelner Trigger im Editor erhöhen.

## Typische Probleme
| Problem | Lösung |
|---|---|
| Overlay bleibt leer | URL prüfen (`127.0.0.1:8787`), läuft `node server.js` noch? Im Panel muss „OBS-Bridge“ grün sein. |
| Bild da, kein Ton | „Audio über OBS steuern“ in der Browser-Quelle anhaken; Mixer-Balken prüfen. |
| Zuschauer hören mich nicht | Mikro als OBS-Quelle „Audioeingabeaufnahme“ anlegen (Schritt 5) – siehe `docs/AUDIO.md`. |
| Echo / Effekt kommt doppelt | Vorschau-Ton im Panel aus (Standard), Desktop-Audio stumm, Monitoring aus, nur **eine** Browser-Quelle mit dem Overlay – Ton-Check im Panel bzw. `docs/AUDIO.md`. |
| Mikro erkennt nichts | Panel nur in Chrome/Edge; Mikro-Berechtigung erlauben; Sprache im Panel auf „Automatisch (DE/TR/EN)“ lassen oder passend wählen. |
| OBS auf anderem PC | LiveFX mit `HOST=0.0.0.0 node server.js` starten und im Overlay die IP des LiveFX-PCs verwenden. |
