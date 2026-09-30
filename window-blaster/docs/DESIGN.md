# Window Blaster – Design & Architektur

## Ziel

Ein AR-Arcade-Spiel für Mitfahrende, das mit der echten Kamera echte Fahrzeuge
hinter der Scheibe zu Zielen macht – ohne App-Store, ohne Server-Zwang, mit
belastbarer Spielmechanik (Punkte, Combos, Missionen, Ranglisten).

## Grundentscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Plattform | PWA (Vite + TypeScript), GitHub Pages | Sofort auf jedem Handy per Link; HTTPS für Kamera; offline-fähig per Service Worker. |
| Erkennung | MediaPipe Tasks Vision, EfficientDet-Lite0 float16, GPU-Delegate mit CPU-Fallback, selbst gehostet | 20–40 ms auf Mittelklasse-Handys, eingebautes NMS, Klassen-Allowlist. Kein CDN zur Laufzeit. |
| Ziele | car / truck / bus / train; Schilder & Ampeln nur Farbe/Münzen; person / bicycle / motorcycle nie | Ton und Ethik. |
| Scheibe | Bildmessung (Helligkeitskante) ist Pflicht, Gyro ist nur Vorhersage | Handbewegung verschiebt den Rahmen viel stärker als die Landschaft; Gyro allein driftet. |
| „Verschwinden“ | Echte Pixel des Autos als Splitter/Schrumpfen; Stretch-Fill aus Nachbarpixeln nur vor der Frontscheibe | Echtes Inpainting ist am Handy nicht echtzeitfähig; Straße vor dem Auto ist quasi statisch. |
| Progression | Keine Freischalt-Sperren; Anreiz über Bestwerte, Medaillen, Missionen, Tages-Challenge, Rangliste | Ein Fahrgast will sofort alles ausprobieren. |
| Anti-Cheat | Server rechnet den Score aus dem Ereignisprotokoll nach (gleiche Formeln wie der Client) | Ohne Accounts die einzige belastbare Hürde; Demo-/Endlos-Runden werden abgelehnt. |

## Datenfluss

```
FrameSource (Kamera | Demo-Canvas)
   │  <video>
   ├─► DetectionScheduler (adaptiv, ≤40 % Auslastung, Capture-Zeitstempel)
   │        └─► Detector (MediaPipe | Mock) ─► Tracker (IoU-Zuordnung, Alpha-Beta, Klassen-Vote, Coasting)
   ├─► FrameGrabber (240×135 Grau, 15 Hz) ─► WindowTracker (Gyro-Vorhersage → Kanten-Snap → One-Euro)
   │                                              ▲ Motion (devicemotion, Achsen nach screen.orientation)
   └─► GameLoop (rAF): Mode.update(dt) → Mode.render() auf FX-Canvas (Video-px) + HUD-Canvas (CSS-px)
```

Alle Spielgeometrie ist in **Video-Pixeln**; `Layers` besitzt die einzige Abbildung auf CSS-Pixel
(`object-fit: cover`). Trefferprüfungen benutzen den auf `now − Kameralatenz` extrapolierten Track,
damit sie zu dem passen, was der Spieler tatsächlich sieht.

## Scheiben-Tracking im Detail

1. **Schätzer (alle 500 ms):** Otsu-Schwelle; falls die dunkle Klasse selbst zweigeteilt ist (Innenraum vs. Asphalt),
   zweite Otsu-Stufe; größte helle Zusammenhangskomponente; Randpunkte je Zeile/Spalte, zentrale 80 %,
   robuste Linien (Theil-Sen + getrimmte TLS), Schnittpunkte = Ecken. Konfidenz = Kontrast × Solidität × Geradheit.
   >90 % Abdeckung ⇒ „Handy an der Scheibe“ ⇒ Vollbild.
2. **Vorhersage:** `Δx = f·ω_pan·dt`, `Δy = f·ω_tilt·dt`, Roll um den Bildmittelpunkt, integriert bis `now − Latenz`.
   `f = (W/2)/tan(HFOV/2)` als Start (69°), online als Median aus gemessener Verschiebung / Gyro-Winkel
   nachgeschätzt (geklemmt auf 0,6–1,6 W). Ein negatives Verhältnis kippt das Achsen-Vorzeichen automatisch.
3. **Messung (15 Hz):** je Kante 16 Stützpunkte, Suche ±8 px senkrecht nach dem stärksten Dunkel→Hell-Übergang,
   parabolische Subpixel-Verfeinerung, robuster Linien-Fit, Ecken = Schnittpunkte, Verschiebung > 12 px verworfen.
4. **Glättung:** One-Euro pro Ecke (minCutoff 1,2 Hz, β 0,03).
5. **Zustände:** `tracking` (Konfidenz ≥ 0,5, Snap < 400 ms alt) → `degraded` → `off` (ganzes Bild als Spielfläche).
   Re-Init, wenn der Schätzer 1,5 s lang eine deutlich andere Scheibe sieht (nicht bei manuell gesetzten Ecken).

## Shooter

- Waffen sind reine Daten (`weapons/configs.ts`): Hitscan (MP, Farbe) mit Winkelstreuung in px über die Brennweite,
  Projektile mit analytischer Wurfparabel (`v0 = (Ziel − Start)/T − ½·g·T`), Rakete mit Lock-on und Zielverfolgung.
- Aim-Assist zieht den Tippunkt auf das nächste Ziel (Radius je Waffe), Tiefen-Heuristik „weiter unten = näher“.
- Trefferfolgen: HP je Klasse (Auto 3, LKW 6, Bus 8, Zug 10). Explosion = Splitter aus den echten Pixeln + Feuerball +
  Hit-Stop + Shake, danach Wrack (MP, Rakete) oder Verschwinden (Granate, Milkshake) mit Stretch-Fill vor der Frontscheibe.
  Milkshake: Wegrutschen mit Reifenrauch, Nachbar innerhalb 1,5 Boxbreiten rutscht mit (Mehrfachtreffer).
  Farbe: Decals in Box-Koordinaten, Deckung per 10×10-Raster.
- Runde: 60 s + 3 s pro Abschuss bis 2×; Combo-Fenster 2,5 s mit gewichteten Beiträgen (MP 0,25 pro Treffer, Kill 1).

## Runner

- Figur auf der Bodenlinie der Scheibe (verschiebbar), Position 68 % in Flussrichtung; Richtung aus der mittleren
  Track-Geschwindigkeit mit Hysterese; Laufgeschwindigkeit aus dem Median der Track-Geschwindigkeiten.
- Hindernisse aus Tracks: am Boden stehend ⇒ Hürde mit Dach (max. 1,3 R, begehbar wie eine Plattform),
  hoch hängend ⇒ Balken zum Ducken. Physik: Scheitel 2 R, Coyote-Time 90 ms, Sprungpuffer 120 ms, variable Höhe.
- Münzen auf Schildern/Ampeln plus virtuelle Münzen bei wenig Verkehr; 3 Leben mit 1,5 s Unverwundbarkeit.
- Experimenteller Masten-Detektor: dunkle schmale Spaltenläufe im Bodenband, über Frames mit erwarteter
  Bewegung getrackt, bestätigt nach 3 Frames, Fahrzeugboxen ausgeschlossen.

## Rangliste

- Client sendet `RoundResult` (Score + Ereignisliste). Worker: Plausibilität (Dauer, Raten), Nachrechnung jedes
  Treffers mit `hitPoints()`, Missions-/Bonus-/Runner-Punkte, Summe = Score (Runner: ±2 Sekundenpunkte).
- KV-Boards je Modus × Fahrzeugtyp × {Tag, Woche, Allzeit}, Top 200, ein Eintrag pro Spieler; Flagge aus dem
  Cloudflare-Land; Rate-Limits per KV-Zähler.

## Tests

- **Vitest (Node, ohne DOM):** Geometrie, Filter, Tracker-Szenarien, Scheiben-Schätzer/Snapper/Tracker auf synthetischen
  Graubildern inkl. Gyro-Vorzeichen-Selbstkorrektur, Brennweiten-Kalibrierung mit Ausreißern, Ballistik, Waffen,
  Combo, Missionen, Runner-Physik/Mapper/Masten-Detektor, Runden-Verifikation.
- **Playwright (headless Chromium, Fake-Kamera, 1 Worker):** Demo-Runden (Treffer, Kills, Ergebnis, Verifikations-Vertrag),
  Menüfluss inkl. Sicherheits-Gate, Kalibrierung auf der gerenderten Demo-Scheibe, Runner-Autoplay, Start des
  echten MediaPipe-Detektors mit selbst gehostetem WASM und Modell.
- **Worker:** lokal mit `wrangler dev` geprüft (gültig / manipuliert / Demo / Rate-Limit).

## Nicht am Handy prüfbar (bewusst abgesichert)

Erkennungsrate bei Nacht/Regen, Gyro-Vorzeichen je Gerät (Selbstkorrektur + Schalter), Linsenwahl (Label-Heuristik),
iOS-Berechtigungs-UX (eine Geste), Wärmedrosselung (adaptiver Scheduler). Diagnose-Overlay per 5-fach-Tipp.

## Roadmap-Ideen

Worker-Offload des Detektors bei Ruckeln, Segmentierungsmaske statt Box für Decals, Mehrspieler im selben Fahrzeug
(gleiche Ziele, geteilte Punkte via WebRTC), Skins für Runner und Fadenkreuz, Tages-Challenge mit globaler Wertung
je Fahrzeugtyp, Sprachpakete.
