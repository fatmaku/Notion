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

## Status
- Funktionierender Prototyp (dieses Repo): Spracherkennung → Trigger → Overlay + Sounds, OBS-fertig, mehrsprachig (DE/EN/TR).
- 15 Trigger, 14 lizenzfreie synthetische Sounds, 5 Effekt-Typen, eigene Memes importierbar.
- Nächster Schritt: Nutzertest mit 10 Creators, dann LLM-basiertes semantisches Matching.

## Ask
Pilot als Feature in *TikTok LIVE Studio* / *Instagram Live Producer*, oder Akquisition der Technologie + Team.
