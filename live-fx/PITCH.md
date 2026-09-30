# LiveFX – Pitch (Meta / TikTok / YouTube)

## Das Problem
Alles, was Kurzvideos viral macht – Memes, Sticker, Sound-Effekte, Zoom-Punches – entsteht **nach** der
Aufnahme im Schnitt. Live gibt es davon nichts: Live-Streams sind roh, monoton, und Creator müssen
selbst „Entertainer + Cutter“ gleichzeitig sein. Auto-Untertitel haben gezeigt, dass Echtzeit-Text
aus Sprache funktioniert. **Echtzeit-Effekte aus Sprache gibt es noch nicht.**

## Die Lösung
LiveFX hört dem Creator zu und blendet in unter einer Sekunde das passende Meme, Sticker, Emoji-Regen
oder den passenden Sound ein – hands-free, während des Streams. Wie Live-Untertitel, nur mit Bildern
und Geräuschen. Plus Soundboard-Hotkeys für manuelle Kontrolle.

## Warum jetzt
- Streaming-ASR ist billig und schnell genug (<300 ms Latenz).
- Live-Commerce & Live-Gifting (TikTok LIVE, Instagram Badges) wachsen – Live ist Umsatzkanal.
- Creator-Tools sind der Wettbewerbsvorteil der Plattformen (CapCut ↔ TikTok, Edits ↔ Instagram).

## Was die Plattform davon hat
| | |
|---|---|
| **Retention** | Live-Streams werden „geschnitten“ ohne Schnitt → längere Watchtime. |
| **Monetarisierung** | Zuschauer können Effekte per Geschenk auslösen (Sticker-Gifting 2.0). |
| **Content-Loop** | Live-Clips mit Effekten sind sofort Short-tauglich → mehr Reels/Shorts aus Lives. |
| **Lock-in** | Native Integration in die Live-Kamera – das kann kein OBS-Plugin bieten. |

## Status (v1.0)
- Funktionierendes Programm (dieses Repo): Spracherkennung → Trigger → Overlay + Sounds, OBS-fertig, mehrsprachig (DE/EN/TR), Hochkant-Layout mit Safe-Zones für TikTok/Instagram.
- Eigene Memes/GIFs/Sounds per Upload, Trigger-Editor, serverseitige Speicherung.
- **Semantisches Matching** per Sprachmodell („das war so peinlich für ihn“ → Awkward) – optional zuschaltbar.
- Offene API für Zuschauer-Trigger (Chat-Bots, Stream Deck) und externe Spracherkennung (Whisper/Deepgram) – die Bausteine für Monetarisierung und Latenz < 300 ms sind vorhanden.
- Gehärtet: Token-Auth, Same-Origin-Schutz, Upload-Prüfung, automatisierte Tests (Unit + End-to-End).
- Nächster Schritt: Nutzertest mit 10 Creators, Demo-Clip aus einem echten Live.

## Ask
Pilot als Feature in *TikTok LIVE Studio* / *Instagram Live Producer*, oder Akquisition der Technologie + Team.
