# Leistung (LiveFX 2.1, Paket A)

Der Live-Effekt soll auch auf schwachen Streaming-PCs flüssig laufen. Seit 2.1 rendert das Overlay jede
Partikelart nur noch einmal, animiert nur noch `transform` / `opacity` und kennt einen Leistungsmodus.

## Leistungsmodus

| Modus  | Verhalten |
|--------|-----------|
| `auto` (Standard) | Startet mit vollem Look (`high`). Bleibt die Bildzeit 30 Frames am Stück über dem Budget, wechselt das Overlay **dauerhaft** auf `eco` (bis zum nächsten `setPerf`). Das Budget ist 20 ms; bei einer gedrosselten Quelle (z. B. OBS mit 30 fps) gilt 1,25 × das gemessene Display-Intervall, damit 30 fps nicht als „langsam“ zählen. Jeder Wechsel zählt in `renderer.stats.perfSwitches`. |
| `eco`  | Halbe Partikel-Obergrenzen (Canvas-Cap, Szenen-Parallaxe, Regen-Burst), kein Glow, keine Lichtstrahlen / Ring, keine Einblend-Bewegung, kein Impact-Zoom, Konfetti = 45 Teile, Text-Stil `glitch` wird `neon` (ohne Puls), Sticker hüpfen nicht. |
| `high` | Voller Look (mit den günstigeren Techniken unten). |

### Steuerung

- **URL-Parameter:** `overlay.html?perf=auto|eco|high` – legt den Modus fest; Bus-Nachrichten ändern ihn dann
  nicht mehr (wie `?theme=`). Unbekannte Werte → `auto`.
- **Panel:** Karte **Einstellungen → Leistung** (`#perf`: Automatisch (empfohlen) / Eco (schwacher PC) /
  Hoch (beste Grafik)), gemerkt in `localStorage` → `livefx.perf`; `window.livefx.perf.set('eco')` für Skripte.
- **Bus-Nachricht:** `{ "type": "perf", "perf": "eco" }` schaltet live um (nur ohne `?perf=`). `POST /fire`
  prüft den Wert (`auto|eco|high`, sonst 400); der Server merkt sich den letzten Modus und schickt ihn in der
  `state`-Nachricht an jedes neu verbundene Overlay (Feld `perf`).
- **JavaScript:** `renderer.setPerf(mode)` → gibt den angewendeten Modus zurück. Ein erneuter Aufruf mit
  demselben Modus ändert nichts (ein automatischer Wechsel auf eco bleibt also erhalten); `setPerf('high')`
  und danach `setPerf('auto')` startet wieder mit vollem Look.
- **Zustand lesen:** `renderer.perf` = gewählter Modus (`auto|eco|high`), `renderer.perfActive` = Look in
  Benutzung (`high|eco`), `body[data-perf]` = `perfActive` (daran hängen die Eco-CSS-Regeln),
  `body[data-perf-mode]` = `perf`, `renderer.stats.perfSwitches` = Anzahl Auto-Wechsel.


## Was sich am Rendering geändert hat

- **Ein Renderpfad.** Regen: nur noch Canvas-Emoji (vorher bis zu 60 DOM-`.fx-drop` *plus* Canvas). Im DOM bleibt
  pro Regen ein unsichtbarer Marker `.fx-rain[data-count][data-emoji]` (4,5 s). Szenen-Partikel: nur noch die
  Canvas-Parallaxe (vorher zusätzlich ein DOM-Spawner mit `setInterval` + `setTimeout` je Partikel); die
  Szene trägt `data-particles="canvas"`. Die Parallaxe holt verpasste Spawns nach (max. 4 je Frame), damit die
  Dichte nicht von der Bildrate abhängt. DOM-Fallbacks (`.fx-drop`, `.fx-particle`, `.fx-confetti`,
  `.fx-rays`, `.fx-ring`) gibt es nur noch, wenn kein Canvas verfügbar ist.
- **Lichtstrahlen + Ring auf dem Canvas.** Die Strahlen sind ein einmal pro Theme-Farbe vorgerendertes
  512-px-Sprite (gleiche Strahlen und Ausblendung wie vorher), der Ring ein gestrichener Kreis. Vorher: je Karte
  ein 1400 × 1400 px `repeating-conic-gradient` mit Maske plus ein Ring mit animierter `border-width` –
  zwei riesige Compositor-Ebenen pro Karte. Höchstens 2 Strahlen / 3 Ringe gleichzeitig (Karten teilen sich die
  Bildmitte, mehr sieht gleich aus, kostet aber).
- **Nur `transform` / `opacity` animiert.** Einblenden: statt `filter: blur(14px → 0)` jetzt Opacity +
  `scale` / `translate` (einzelne Transform-Eigenschaften, kombinieren sich mit der Haupt-Animation; alte
  CEF-Versionen bekommen nur das Ausblenden). Neon-Puls: Opacity statt animiertem 4-fach-`text-shadow`.
  Regenstreifen / Schnee / Sonnenaufgang: `transform` statt animierter `background-position`.
- **Günstige Schatten.** Glow = ein Schatten (vorher 3 Box-Shadows + 2 gestapelte `drop-shadow`-Filter je
  Emoji); Emoji-Schatten als `text-shadow` statt `filter`; kein `backdrop-filter` mehr (Szenen-Untertitel mit
  halbtransparentem Hintergrund).
- **Weniger Ebenen und Knoten.** `will-change` nur auf Effekt-Containern (nicht mehr auf jedem Buchstaben);
  Glitch-Kopien enthalten Wörter statt einzelner Buchstaben-Spans; Banner ohne Extra-Spans; Sticker hüpfen
  max. 3×, Bounce-Text max. 3×; Szenen-Animationen pausieren bei `document.hidden` (`body.fx-hidden`).
- **Sound:** Rausch-Puffer werden pro AudioContext einmal erzeugt (2 s) und mit zufälligem Offset geloopt,
  statt bei jedem Abspielen neu mit `Math.random()` gefüllt.
- **Laden:** `overlay.html` lädt seine vier Skripte mit `defer` (Reihenfolge bleibt), der Bootstrap läuft nach
  `DOMContentLoaded`. Das Overlay registriert `/sw.js?shell=overlay` mit Scope `/overlay.html`: dieser
  Service Worker cached nur Overlay-Seite, `overlay.css`, `sounds.js`, `schema.js`, `fx.js`, `bus.js` und die
  Icons (eigener Cache `livefx-overlay-v…`) – kein Panel-/ASR-/Demo-Code in der OBS-Quelle. Das Panel behält
  die volle Shell.
- **Server:** statische Dateien bekommen ein starkes ETag (Größe + mtime; komprimierte Variante mit `-gz`),
  `If-None-Match` → `304`; Textdateien > 1 KB werden bei `Accept-Encoding: gzip` komprimiert (In-Memory-Cache je
  Pfad + mtime, max. 16 MB) und tragen `Vary: Accept-Encoding`.

## Messung (test/e2e/28-perf.js)

31 gemischte Effekte in 3 s auf 1920 × 1080 (Szene Regen, dann 3 × Karte, Bild, Banner, Regen 40, Konfetti,
Neon-Text, Glitch-Text, Sticker, Lower-Third, Combo; alles Intensität 3 mit Glow / Tilt / Impact), 5 s
gemessen im Browser (rAF-Zeitstempel, PerformanceObserver `longtask`, CDP `Performance.getMetrics`), Mittel aus
zwei Läufen, `?perf=high`; Spannweite über fünf Testläufe. Headless-Chromium im CI-Container mit **Software-Compositing** – deshalb sind die
absoluten Bildzeiten hoch; auf einer GPU (OBS) ist alles deutlich schneller, das Verhältnis zählt.

| Kennzahl | vorher (2.0) | nachher (2.1, high) | Änderung |
|---|---|---|---|
| Bildzeit Mittel | 203 ms | 63–76 ms | −63 bis −69 % |
| Bildzeit p99 | 842 ms | 167–217 ms | −74 bis −80 % |
| gerenderte Frames in 5 s | ~24 | 65–75 | ×3 |
| max. DOM-Knoten unter `#stage` | 379 | 166 | −56 % |
| Main-Thread-Arbeit pro Frame | 96 ms | 43–52 ms | −46 bis −55 % |
| Layout-Zeit (5 s) | 412 ms | 35–90 ms | −78 bis −92 % |
| Long Tasks (Summe) | 1636 ms | 1800–2560 ms | +10 bis +56 % ¹ |
| JS-Heap | 9,5 MB | 9,5 MB | ± 0 |

¹ Es werden dreimal so viele Frames gerendert; bei ~65 ms pro Frame zählt in diesem Container fast jeder Frame
als „Long Task“. Pro Frame sinkt die Main-Thread-Arbeit um gut die Hälfte (siehe Zeile darüber).

`?perf=eco` mit derselben Last: Mittel ~46 ms, p99 ~100 ms, 154 Knoten.

Das Szenario prüft großzügige Regressionsgrenzen gegen die im Test hinterlegte Baseline: DOM-Knoten ≤ 60 %,
Bildzeit-Mittel oder p99 ≤ 80 %. Screenshots: `perf-card-rays.png`, `perf-scene-rain.png`.

## Bekannte Kompromisse

- Lichtstrahlen / Ring liegen jetzt auf dem Canvas, also **hinter** allen DOM-Effekten (vorher je Karte direkt
  hinter deren Inhalt). Bei mehreren gleichzeitigen Karten bleiben höchstens die zwei neuesten Strahlen-Sprites.
- Der Ring ist ein dicker, ausblendender Kreis ohne weichen Box-Shadow-Glow (stattdessen ein zweiter,
  breiter, halbtransparenter Strich).
- Glow ist dezenter (ein Schatten statt mehrerer Lagen), der Neon-Puls ist ein Helligkeitspuls.
- Regenstreifen der Szene bewegen sich als eine Ebene (vorher zwei Ebenen mit leicht unterschiedlichem
  Tempo).
- Einblend-Bewegung ohne Unschärfe; in sehr alten OBS-Versionen (CEF < 104) nur als Ausblenden.
