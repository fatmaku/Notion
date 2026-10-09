# Gezeichnete Story – „Zeichenfilm“ (LiveFX 2.3, `js/sketch.js`)

Während du vorliest, **zeichnet LiveFX die Geschichte** im Story-Band – wie ein Whiteboard-Video, aber live und
komplett aus Code erzeugt (keine Bilder, keine Videos, kein Internet). Jedes neue Ding der Szene wird mit einem
**Stift** in 0,6–1,2 s Strich für Strich gezeichnet, mit leichter Handschrift-Unruhe (immer gleich für dasselbe Ding),
dünnem Anfang und Ende jeder Linie. Was die Geschichte nicht mehr braucht, wird kurz **wegradiert**. Regen fällt als
gezeichnete Striche, die Sonnenstrahlen drehen sich langsam, Figuren laufen, fliegen, tanzen.

- „yağmur yağıyordu“ → graue Wolken werden gezeichnet, Regenstriche fallen, der Himmel im Band wird dunkler.
- „araba geldi“ → ein Auto wird gezeichnet (Karosserie, Räder, Fenster).
- „ormanda yürüdük“ → Bäume und Tannen entstehen, das Auto wird wegradiert (es wurde nicht mehr genannt).
- „gece oldu“ → Mond und Sterne, nächtliche Himmelsfarbe – **nur im Band**, die Kamera darüber bleibt frei.

Gezeichnet wird nur auf der Leinwand im Band (`canvas.fx-sketch`, `renderer.sketchSurface()`): sie wird mit dem Band
maskiert, nach Stimmung getönt und mit dem Band ausgeblendet. Über dem Band kommt nie ein Pixel an.

## Einschalten

Der Schlüssel heißt `storyStyle` (Teil des Overlay-Layouts, Standard **`mixed`**):

| `storyStyle` | Was du siehst |
| --- | --- |
| `sketch` | **Nur die Zeichnung**: Landschaft, Himmel (halbtransparente Farbe nach Tageszeit / Wetter), Wetter-Striche, Dinge und Figuren – alles gezeichnet. Keine Emoji-Figuren, keine Emoji-Partikel. Tinte weiß mit weichem dunklem Rand → lesbar auf jedem Kamerabild. |
| `mixed` | **Gezeichnete Kulisse + Emoji-Figuren**: Bäume, Häuser, Berge, Sonne/Mond/Sterne, Wolken werden gezeichnet; Figuren (und Dinge, solange der Renderer sie als Emoji zeigt) bleiben bunte Emoji, Regen/Schnee bleiben die Emoji-Parallaxe. Kein doppeltes Auto: zeigt der Renderer keine Emoji-Dinge, zeichnet die Skizze sie selbst. |
| `emoji` | Der 2.2-Look: keine Zeichnung (die Leinwand ist ausgeblendet, die Schleife steht). |

- **URL** (pinnt den Stil): `overlay.html?storystyle=sketch` (z. B. `overlay.html?layout=portrait&storystyle=sketch`).
- **Live** per Bus: `{type:'layout', storyStyle:'sketch'}` (z. B. `POST /fire` mit Token) – das Overlay übernimmt es,
  sofern die URL den Stil nicht pinnt; der Server merkt sich das Layout.
- Ohne `js/sketch.js` sieht jeder Stil wie `emoji` aus.

Was die Zeichnung aus dem Story-Zustand macht (`js/story-director.js` oder eine `story-state`-Nachricht):

| Zustand | Zeichnung |
| --- | --- |
| `place` | forest → Tannen + Laubbäume · meadow → Blumen + Büsche · village → Häuser + Bäume · mountains → Bergkette · desert → Dünen + Kakteen · city → Straße + Skyline · castle → Burg · cave → Höhle · sea → animierte Wellen + Wasser · space → Planet, kein Boden |
| `time` | Himmelsfarbe im Band (Tag hellblau, Morgen orange + tiefe Sonne links, Abend violett + tiefe Sonne rechts, Nacht dunkelblau + Mond + Sterne) |
| `weather` | rain/storm → Wolken + fallende Regenstriche (Gewitter: dunkle Wolken + Blitz) · snow → wirbelnde Flocken · wind → Windböen · fog → Nebelschwaden · clear (Tag) → Sonne mit drehenden Strahlen |
| `actors` | Strichmännchen mit Laufzyklus und Kostüm (Mädchen, Junge, Oma, Opa, König, Prinzessin, Ritter, Hexe, Astronaut) und Tiere (Drache, Katze, Hund, Pferd, Einhorn, Vogel, Fisch, Bär, Fuchs, Hase, Eule, Roboter, Geist); `action` go/run = hin und her laufen, fly = schweben (Flügelschlag), jump, dance, swim, sleep (liegt), cry/laugh (zittern) |
| `props` | Auto, Haus, Schatztruhe, Schiff/Boot (schwimmt auf dem Meer), Blume, Lagerfeuer (flackert), Stern, Ball, Buch, Brücke, Zelt, Laterne, Kuchen, Schlüssel, Herz |
| `mood` | Tintenfarbe: happy warm-gelb, tense rötlich, sad bläulich, scary violett, calm weiß |
| Theme | neon/minimal: weiße Tinte, schwarzer Rand · pastel: rosa-weiß, aubergine Rand · kinderbuch: cremeweiß, brauner Rand |
| `end` / keine Szene | alles wird wegradiert, die Leinwand ist danach leer und die Schleife steht |

Himmel und Kulisse teilen sich den Platz: Sonne, Mond und Wolken suchen sich eine Stelle, an der kein Ding, keine
Figur und möglichst keine hohe Kulisse steht, und bleiben unter dem weich ausgeblendeten oberen Bandrand (obere 12 %).
Ein neu gezeichneter Baum (Haus, Berg …) unter einer Wolke, der Sonne oder dem Mond wird niedriger gezeichnet, damit
er nicht in sie hineinragt – im 16:9-Band mit 22 % (238 px) ist über vollen Bäumen kein Himmel mehr. Sterne kommen nur
an freie Stellen (nicht hinter Mond, Burg, Drache, Bäume). Eine schlafende Figur (`action: sleep`) liegt auf ihrem
untersten Strich, nicht über dem Boden.

Das Band blendet nach `storyIdleMs` ohne Satz aus → die Zeichnung hält an und wird nach 0,9 s verworfen; der nächste
Satz zeichnet die Szene neu.

## Video aufnehmen: der Zeichenfilm beim Erzählen

**Mit Knopf – die Kamera-Ansicht** (`camera.html`, [`KAMERA.md`](KAMERA.md)): Panel → **📷 Kamera-Ansicht →
⏺ Aufnahme**, unter ⚙ **Story-Stil: Zeichnung**, **🎙️ Live-Mikro** an, **⏺**, erzählen, **⏹** → MP4 (H.264, wo der
Browser es kann) oder WebM mit deiner Stimme und den Effekt-Sounds, **⬇ Herunterladen** oder **📤 Teilen**.

- Mit Kamerabild: die Zeichnung entsteht im Band unter dir.
- **Nur die Zeichnung, im ganzen Bild** (2.3): Panel → **📷 Kamera-Ansicht → ✏️ Zeichenfilm** – öffnet
  `camera.html?cam=off&storystyle=sketch&story=full&mic=1&record=1` (hochkant: `&aspect=9:16` anhängen): keine Webcam,
  die Geschichte füllt das ganze Bild (`story=full`) und wird beim Erzählen auf dunklem Grund gezeichnet. Nur die
  Kamera abschalten: in der Kamera-Liste **„🎨 Ohne Kamera“**.
- Nicht in der OBS-Browserquelle aufnehmen (dort gibt es keine Knöpfe und der Download landet nirgends) – OBS nimmt
  ohnehin selbst auf (*Aufnahme starten*).

**Für Entwickler – aus der Konsole:** `LiveFXSketch.record({canvas, audio?, ms})` nimmt nur die Band-Leinwand als
**WebM** auf (MediaRecorder, VP9/VP8, optional mit Ton) und lädt sie herunter (die Kamera-Ansicht nutzt es für WebM
selbst). `overlay.html?storystyle=sketch` in einem **normalen** Tab öffnen (er hängt am selben Bus wie OBS), F12 →
Konsole, den Tab sichtbar lassen:

```js
const mic = await navigator.mediaDevices.getUserMedia({ audio: true }); // optional: deine Stimme dazu
const r = await LiveFXSketch.record({ canvas: livefx.renderer.sketch.canvas, audio: mic, ms: 60000, background: '#20242c' });
// -> livefx-sketch-JJJJMMTT-hhmmss.webm, r = { blob, url, mimeType, bytes, ms, filename }
```

Optionen: `ms` (100 ms … 30 min, Standard 10 s), `fps` (30), `bitrate` (6 Mbit/s), `background` (CSS-Farbe; ohne sie
bleibt der Hintergrund transparent – nicht jeder Player kann WebM mit Alpha), `download: false` (nur das Blob),
`filename`, `mimeType`. Das zurückgegebene Promise hat `.stop()` zum vorzeitigen Beenden; die Tonspuren des Aufrufers
werden nicht gestoppt. Ohne `canvas.captureStream()` / `MediaRecorder` wird das Promise abgelehnt.

## Schnittstelle

```js
const sketch = LiveFXSketch.attach(renderer, () => renderer.sketchSurface()); // macht js/fx.js einmal (Sketch-Hook)
sketch.update(state);          // bei jedem Story-Zustand: Diff -> neu zeichnen / wegradieren / gleiten
sketch.setStyle('sketch');     // 'emoji' | 'sketch' | 'mixed'
sketch.stats;                  // { style, elements, drawing, erasing, animated, sprites, frames, frameMs, meanMs, avgMs, p95Ms, maxMs, fps, cached, rebuilds, running, updates, ink, surface }
sketch.elements;               // Debug: [{ key, id, state: wait|draw|show|erase, x, y, h, layer, action }]
sketch.canvas; sketch.redraw(); sketch.resetStats(); sketch.detach();
LiveFXSketch.LIBRARY;          // alle Zeichnungs-IDs (59)
LiveFXSketch.pathFor('car', { seed, phase, aspect, variant }); // { id, aspect, length, strokes: [{ pts: [x0,y0,…] 0..1, w, closed, fill, dot, len }] }
LiveFXSketch.record({ canvas, audio, ms });
// rein funktional (für Tests / eigene Renderer): compose(state, {w,h}, {style}), schedule(lengths, dur),
// progress(sched, t), durationFor(length), stagger(n), inkFor(theme, mood), washFor(state), idFor({role, emoji}), diff(a, b)
```

- `attach()` ist pro Renderer idempotent (gibt dieselbe Skizze zurück). `getCtx()` darf die Band-Fläche
  `{canvas, ctx, width, height, dpr}` liefern, einen nackten 2D-Kontext oder nichts – dann legt die Skizze selbst eine
  `.fx-sketch`-Leinwand ins `.fx-band`.
- `update(state)` nimmt den normalisierten Story-Zustand plus `style` und `idle` (Vertrag: `docs/CONTRACTS.md` §9
  „sketch hook“). Elemente haben stabile Schlüssel (`prop:car`, `actor:girl`, `forest:3`, `sky:moon`, `wx:rain` …):
  Neues wird gezeichnet, Entferntes wegradiert, was bleibt, bleibt an seinem Platz (Figuren gleiten zu neuen Plätzen).
- Sobald die Skizze angehängt ist (erster Story-Zustand), werden auch Szenen ohne Story (Szenen-Pad, Story-Pakete)
  über `renderer.onScene` gezeichnet – nur Ort/Wetter/Zeit der Szene; der nächste Story-Zustand gewinnt wieder.
- `mixed` und Dinge: `sketch.mixedProps = true | false | 'auto'` (oder `attach(renderer, getCtx, { mixedProps })`
  vor dem Renderer); Standard `auto` = zeichnen, wenn der Renderer keine Emoji-Dinge zeigt. Mit js/fx.js 2.3 zeigt
  der Renderer im Stil `mixed` Figuren **und** Dinge als Emoji; gibt er dort nur die Figuren an seine Emoji-Ebene
  (`setActors(st.actors, [])`), zeichnet die Skizze die Dinge automatisch.

## Leistung

Gemessen in Headless-Chromium (Software-Rendering, wie OBS ohne GPU-Beschleunigung), Story-Band 1920×238 (16:9,
22 %), Regen + Wald (8 Bäume) + Auto + laufendes Mädchen. `test/e2e/31-sketch.js` misst das bei jedem Lauf.

**Zwei Zahlen, nicht verwechseln:** `stats.frameMs / meanMs / avgMs / p95Ms / maxMs` sind **nur JavaScript**. Den
größeren Teil erledigt Chromium danach beim Frame-Commit: die Canvas-Befehle rastern und die Band-Leinwand hochladen
– ≈ 2 ms für **jeden** gezeichneten Frame bei 1920×238, egal wie wenig sich bewegt. Das zeigt nur der ganze
Main-Thread (CDP `Performance.getMetrics` → `TaskDuration`). Darum zählt vor allem, **wie oft** gezeichnet wird.

| Messung (16:9, 1920×238) | JavaScript pro gezeichnetem Frame | ganzer Main-Thread |
| --- | --- | --- |
| Szene zeichnet sich hinein (≈ 2,5 s) | Ø 1,2 ms, p95 ≈ 3 ms, einzelne Frames bis ≈ 7 ms (Cache wird neu gemalt) | – |
| steht (Regen fällt, Mädchen läuft, 30 Bilder/s) | Ø 0,3 ms, p95 0,4 ms | ≈ 110 ms/s ≈ 3,6 ms pro Frame |
| dieselbe Szene, Stil `mixed` / `emoji` | – | ≈ 180 / ≈ 160 ms/s |
| Skizzen-Schleife angehalten | – | ≈ 0–1 ms/s |
| zum Vergleich: erste Fassung (Entwicklungsstand, alles bei 60 fps neu) | Ø 0,2 ms | ≈ 640–680 ms/s ≈ 10 ms pro Frame |

Weitere Szenen (Main-Thread ms/s, `sketch` / `mixed` / `emoji`): Sonne + Wolke + Wald ohne Figuren 37 / 184 / 157 ·
Gewitter in der Stadt mit Hund und Junge 151 / 220 / 181 · Meer mit Schiff und schwimmendem Fisch 151 / 190 / 152 ·
Nacht im Wald mit Zelt + Lagerfeuer ≈ 30 (nur das Feuer flackert, ≈ 7 Bilder/s) · 9:16 (1080×384) Regen-Szene
145 / 213 / 172. Die e2e-Prüfung
verlangt `sketch` ≤ 2× `emoji`, `mixed` ≤ 1,5× `emoji`, ≤ 30 gezeichnete Frames/s im Stand und ≤ 2 ms JavaScript
(Ø und p95) – Ø auch beim Hineinzeichnen.

So bleibt es billig:

- **Kulissen-Cache:** Was fertig gezeichnet ist und sich nicht bewegt (Himmelsfarbe, Boden, Bäume, Häuser, stehende
  Dinge und Figuren), wird **einmal** in eine bandgroße Leinwand gemalt; jeder Frame ist dann `clearRect` + ein
  `drawImage` dafür + nur das, was sich bewegt. Die Zeichenreihenfolge bleibt exakt: Liegt etwas Bewegtes (eine
  ziehende Wolke) hinter einem stehenden Baum, bekommt die Kulisse davor einen eigenen Cache samt Silhouetten-Maske
  (höchstens 3 Caches); überschneidet es nichts, wird es einfach darüber gemalt und die Kulisse bleibt ein Cache.
  Neu gemalt wird ein Cache nur, wenn sich seine Elemente ändern (fertig gezeichnet, wegradiert, Farbe/Theme,
  Größe) – während eine Szene hereinzeichnet höchstens alle 0,3 s, dazwischen wird direkt gezeichnet.
- **Takt nach Bewegung:** Stift, Radierer, Gleiten → jeder Frame (nur solange sie laufen); Regen, Schnee, Wind,
  laufende / tanzende / fliegende Figuren → 30 Bilder/s; Meereswellen → 15/s; nur Sonnenstrahlen, ziehende Wolken,
  schaukelndes Schiff, flackerndes Feuer → ≈ 7/s; ein Blitz (`mixed`) nur, solange er zuckt; steht alles still (z. B.
  Nacht im Wald mit Haus) → **kein requestAnimationFrame**, die Zeichnung bleibt einfach stehen. Ebenso aus: Stil
  `emoji`, Band im Leerlauf, Tab unsichtbar.
- Regentropfen sind ein einmal vorgezeichneter Strich, der pro Tropfen nur noch kopiert wird; die Wellen sind
  vorgezeichnete Streifen, die seitlich verschoben werden.
- Pfade werden einmal berechnet und gecacht (`pathFor`, max. 600 Einträge); jede Zeichnung wird **einmal** in ein
  eigenes Sprite gerastert (Rand-/Farbschicht + Tintenschicht), der Stift malt pro Frame nur die neuen Linienstücke
  hinzu. Laufzyklen (8 Posen) und Flackern (4) werden höchstens eine Pose pro Frame gerastert (bis dahin steht die
  nächste fertige Pose ein) und wiederverwendet.
- Verdeckung: Kulisse, Dinge und Figuren stanzen ihre Silhouette aus dem, was hinter ihnen liegt (`destination-out`)
  – kein Baumstamm scheint durchs Auto.
- `perf: eco` (docs/PERFORMANCE.md): alle Takte 1,5× länger (höchstens 30 Bilder/s), halb so viele Regen-/
  Schneestriche, kein Blitz im Regen.
- Speicher: bis zu 3 Caches + 3 Masken in Bandgröße (1920×238 ≈ 1,8 MB je Leinwand); sie werden mit der Zeichnung
  verworfen (Leerlauf, Stil `emoji`, `detach()`).
- Größenänderung des Bands (Layout-Nachricht, hochkant/quer): alles wird sofort neu gelegt (ohne erneutes
  Hineinzeichnen).

## Eine Zeichnung hinzufügen

Alle Zeichnungen stehen in `js/sketch.js` im Abschnitt „the library“. Eine Zeichnung ist eine Funktion, die mit dem
`Builder` Striche **in Zeichenreihenfolge** in eine Box zeichnet: Höhe 1 (y nach unten, **1 = Boden**), Breite =
`aspect`.

```js
def('windmill', {
  aspect: 0.8,   // Boxbreite / Boxhöhe
  size: 0.6,     // Höhe im Band in Einheiten u (u ≈ Bandhöhe, max. 420 px; ein Baum hat 0.74)
  // anim: 'walk' | 'legs' | 'flap' | 'flicker'  -> build bekommt P.phase 0..1 (Posen), null = Ruhepose
  build(b, P) {
    b.poly([[0.3, 0.98], [0.34, 0.4], [0.46, 0.4], [0.5, 0.98]], { closed: true, fill: 'wood' }); // Turm
    b.dot(0.4, 0.38, 0.03);                                                                     // Achse
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + 0.4;
      b.line(0.4, 0.38, 0.4 + Math.cos(a) * 0.36, 0.38 + Math.sin(a) * 0.36, { w: 1.2 });           // Flügel
    }
  },
});
```

- Befehle: `s(o).M(x,y).L(x,y).Q(cx,cy,x,y).C(…).A(cx,cy,rx,ry,a0,a1).T([[x,y],…], closed).Z().end()` und die
  Kurzformen `line`, `poly(pts, {closed})`, `curve(pts, {closed})`, `rect`, `circle`, `ellipse`, `arc`,
  `scallop(cx,cy,rx,ry,n,bulge)` (Baumkrone, Wolke), `dot(x,y,r)`.
- Optionen je Strich: `w` (Breitenfaktor, 1 = normal), `fill` (Farbschlüssel aus `FILL`, nur für geschlossene Formen;
  wird halbtransparent unter die Tinte gelegt), `part: 'rays'` (dreht sich wie Sonnenstrahlen), `jitter` (0 = exakt).
- Reihenfolge = Stiftreihenfolge: Umriss zuerst, Details danach. Bei animierten Zeichnungen in jeder Pose **dieselben
  Striche in derselben Reihenfolge** erzeugen (sonst „kocht“ die Linie).
- Zuordnung: `ROLE_ID` (Rolle aus dem Director → ID) und `EMOJI_ID` (Emoji → ID) ergänzen; neue Orte/Szenerie in
  `compose()`.
- Testen: `node --test test/sketch.test.js` prüft u. a., dass jede Zeichnung in der Box liegt, deterministisch ist
  und in 0,6–1,2 s gezeichnet wird; `node test/e2e.js 31` rendert im Browser und legt Screenshots ab
  (`sketch-16x9.png`, `sketch-9x16.png`, `SHOT_DIR`).

## Kurz auf Türkçe

**Çizilen hikâye („çizgi film“):** Sen anlatırken LiveFX hikâyeyi alttaki bantta kalemle çizer – ev, ağaç, araba,
güneş, yağmur, ejderha … hepsi koddan üretilir. Yeni şeyler 0,6–1,2 saniyede çizilir, artık geçmeyen şeyler silgiyle
silinir; yağmur çizgi olarak yağar, güneşin ışınları döner, figürler yürür/uçar. Açmak için: `overlay.html?storystyle=sketch`
(sadece çizim) veya `mixed` (çizilmiş manzara + emoji figürler, varsayılan). Kameranın üstüne hiçbir şey çizilmez.
Video: panelde **📷 Kamera-Ansicht → ⏺ Aufnahme**, ⚙ altında hikâye stili **Zeichnung**, **🎙️ Live-Mikro** aç ve
anlat – MP4/WebM, sesinle birlikte. Sadece çizim için kamera listesinde **„🎨 Ohne Kamera“** seç ya da
`camera.html?cam=off&storystyle=sketch&story=full&mic=1&record=1` aç (dikey: `&aspect=9:16`).

## Short in English

**Drawn story ("cartoon"):** while you narrate, LiveFX draws the story in the story band like a whiteboard video –
houses, trees, cars, sun, rain, dragons, all generated from code. New things are pen-drawn in 0.6–1.2 s, things the
story drops get a quick eraser wipe, rain falls as strokes, sun rays turn, figures walk and fly. Turn it on with
`overlay.html?storystyle=sketch` (drawing only) or `mixed` (drawn scenery + emoji figures, the default); nothing is
ever drawn over the camera above the band. Video: panel **📷 Kamera-Ansicht → ⏺ Aufnahme**, story style
**Zeichnung** under ⚙, switch on **🎙️ Live-Mikro** and narrate – MP4/WebM with your voice. For the drawing alone pick
**“🎨 Ohne Kamera”** in the camera list or open `camera.html?cam=off&storystyle=sketch&story=full&mic=1&record=1` (portrait:
`&aspect=9:16`); developers can also call `LiveFXSketch.record({ canvas, audio, ms })` from the console. Cost at 1080p: ≤ 2 ms JavaScript per drawn frame, and the whole main thread (incl. the browser's canvas raster
and upload, ≈ 2 ms per drawn frame) about 110 ms/s for rain + forest + car + walking girl – less than the emoji style
on the same scene; settled scenery is cached, weather and walking run at 30 fps, slow motion at ≈ 7 fps, and the
loop stops when nothing moves.
