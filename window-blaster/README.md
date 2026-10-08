# Window Blaster – Beifahrer-AR-Arcade fürs Fenster

Ein Handyspiel für lange Fahrten als **Fahrgast** – im Auto, Zug, Bus oder Fähre.
Du richtest die Rückkamera aus dem Seiten- oder Frontfenster, die App erkennt
echte Fahrzeuge draußen und du beschießt sie in AR mit Maschinenpistole,
Granate, Raketenwerfer, Milkshake oder Farbpistole. Im Display explodieren sie,
verschwinden, rutschen weg oder bekommen Farbflecken – in echt passiert
natürlich nichts. Im **Fenster-Runner** springt eine kleine Figur über die
Autos, Schilder und Masten, die wirklich draußen vorbeiziehen.

Alles läuft **komplett auf dem Handy** im Browser (PWA): kein App-Store, keine
Aufnahme, kein Upload. Nur wer freiwillig seinen Punktestand einreicht, schickt
ein Ereignisprotokoll an die weltweite Rangliste.

> **Nur für Mitfahrende.** Wer fährt, spielt nicht. Die App fragt das bei jedem
> Start ab.

---

## Braucht das Spiel Internet?

Nur **einmal** zum Installieren auf dem Handy. Beim ersten Start mit Netz lädt die App das Erkennungsmodell und die
Laufzeit (ca. 30 MB) im Hintergrund und zeigt „Offline bereit ✓“ (auf Mobilfunk erst nach Tippen auf
„Für offline vorbereiten“). Danach laufen Kamera, Erkennung, Scheiben-Tracking, Punkte, Missionen und Bestwerte
komplett ohne Internet. Nur die weltweite Rangliste braucht Netz; offline gespielte Runden werden gespeichert
und automatisch nachgereicht.

## Ohne GitHub: Download-Paket für den Mac

`npm run package` erzeugt **eine** Datei `WindowBlaster.zip` (unter 30 MB) mit dem Ordner `WindowBlaster/`:

| Inhalt | Zweck |
|---|---|
| `Start-Window-Blaster.command` | Startet alles. Erster Start im Terminal (`bash ` + Datei hineinziehen), danach Doppelklick. Entfernt die macOS-Download-Sperre nur für diesen Ordner. |
| `LIESMICH-ZUERST.txt`, `ANLEITUNG.html` | Kurz- und Langanleitung (MacBook, iPhone, Android, Hilfe bei Problemen). |
| `bin/windowblaster-mac-arm64`, `bin/windowblaster-mac-intel` | Kleiner Spiel-Server (Go, Quellcode in `launcher/`). |
| `app/` | Das fertige Spiel. |
| `quelltext.zip` | Quellcode. |

Der Server (`launcher/`) liefert das Spiel am Mac über `http://localhost:8080` aus (sicherer Kontext, keine
Zertifikatswarnung) und an Handys über HTTPS (`:8443`) mit einer eigenen kleinen Zertifizierungsstelle. Deren
Schlüssel liegt in `~/Library/Application Support/WindowBlaster`, deshalb muss das Handy bei Updates **nicht** neu
vertrauen. Zertifikate werden pro Adresse erzeugt, eine neue WLAN-IP stört also nicht. Er zeigt am Mac die Seite
`/verbinden` mit QR-Code und Live-Status („Handy verbunden → Zertifikat geladen → vertraut → Spiel offen → offline“)
und führt das Handy über `/handy` Schritt für Schritt durch Zertifikat, Vertrauen, Home-Bildschirm und Offline-Daten.

## Aufs Handy bekommen (mit GitHub)

Die App braucht HTTPS (Kamera-Zugriff). Der einfachste Weg ist GitHub Pages:

1. Im Repository **Settings → Pages → Build and deployment → Source: „GitHub Actions“** wählen (einmalig).
2. Der Workflow `.github/workflows/window-blaster.yml` testet, baut und deployt bei jedem Push
   auf diesen Branch (oder per **Actions → window-blaster → Run workflow**).
3. Auf dem Handy öffnen: `https://fatmaku.github.io/Notion/window-blaster/`
4. **Zum Homescreen hinzufügen** (Safari: Teilen → „Zum Home-Bildschirm“; Chrome: Menü → „App installieren“).
   In der App „Für offline vorbereiten“ abwarten – dann läuft es im Vollbild, quer und dauerhaft offline.

Lokal im WLAN testen (Handy und Rechner im selben Netz):

```bash
cd window-blaster
npm install
VITE_HTTPS=1 npm run dev      # https://<deine-IP>:5173 – Zertifikatswarnung einmal bestätigen
```

Ohne Kamera ausprobieren (Desktop reicht): Startbildschirm → **Demo ohne Kamera**.

## So spielst du

1. **Sicherheits-Gate:** Fahrzeugtyp wählen (Auto / Zug / Bus / Sonstiges) und den Knopf 2 Sekunden halten.
2. **Modus:** Front-Shooter, Seiten-Shooter (mit Fensterseite links/rechts) oder Fenster-Runner.
3. **Waffen:** zwei Slots, im Spiel per 🔁 wechselbar. Fünf Waffen sind von Anfang an frei (MP, Granate, Rakete,
   Milkshake, Farbpistole); acht weitere schaltest du im **Shop 🎁** mit gesammelten Punkten frei: Ei, Tomate,
   Schneeball (friert ein), Bananenschale, Wasserbombe (wäscht Farbe ab – „Autowäsche“-Bonus), Klopapier (wickelt ein),
   Laserpointer (halten – das Auto löst sich auf) und Boxhandschuh (POW!). Dazu Hand-Skins, Fadenkreuze und Farbpaletten.
4. **Kamera & Sensoren freigeben** – ein Tipp erledigt Kamera- und Bewegungssensor-Zugriff (iOS braucht beides in derselben Geste).
5. **Scheibe vermessen:** Die App findet die helle Scheibe im dunklen Innenraum automatisch, zeigt vier Ecken
   und einen Status („Scheibe erkannt · 74 %“). Ecken (○) oder ganze Kanten (▬) bei Bedarf ziehen – eine Lupe zeigt
   das Bild unter dem Finger, ein Finger in der Mitte verschiebt den Rahmen, zwei Finger ändern die Größe. Solange ein
   Finger aufliegt, ist das Tracking eingefroren; danach wird der Rahmen nur noch um wenige Pixel nachjustiert.
   Im Runner zusätzlich die Bodenlinie.
   **Ganzes Bild**, wenn du das Handy direkt an die Scheibe hältst oder es dunkel ist. **Passt so** startet.
6. **Spielen:**
   - Tippen = schießen (MP und Farbpistole: halten = Dauerfeuer). Granate/Milkshake fliegen im Bogen zum Tippunkt,
     die Rakete wird durch Halten aufgeschaltet („LOCK“) und beim Loslassen abgefeuert.
   - Runner: Du bist eine **Hand, die auf zwei Fingern läuft**. Tippen = Sprung (kurz tippen = kleiner Sprung),
     Ducken-Knopf oder nach unten wischen = ducken – nötig, weil **Vögel** auf Kopfhöhe angeflogen kommen (Warnpfeil am Rand).
     Der seltene goldene Vogel fliegt höher und bringt +300, wenn du ihn im Sprung fängst. Lange Fahrzeuge kann man als Plattform benutzen.
     **Power-ups** schweben alle ~14 s heran: 🧲 Magnet (Münzen fliegen 8 s zu dir), 🛡️ Schild (schluckt den nächsten
     Treffer), ⭐ Doppelte Punkte (8 s lang zählt jedes Hindernis doppelt – als nachrechenbarer Bonus).
   - ⌖ zentriert die Scheibe neu, ⏸ pausiert (im Pausemenü: **📸 Foto teilen**).
   - **Frenzy:** Ab einer 5er-Kill-Combo brennt 8 Sekunden lang alles: unbegrenzte Munition, 1,6-fache Feuerrate,
     +250 Bonus, orangener Rahmen, Musik auf Anschlag. Danach 15 s Abkühlung.
   - **Beweisfoto:** Der beste Moment der Runde (höchste Combo beim Abschuss, goldener Vogel im Runner) landet als Bild
     auf dem Ergebnis-Bildschirm. **📤 Ergebnis teilen** baut daraus eine Karte mit Punkten und schickt sie über das
     System-Teilen-Menü (oder speichert sie). Nichts davon verlässt das Handy von selbst.
7. **📅 Challenges:** Tages-Challenge (freie Wahl, dieselben Missionen für alle) und **Wochen-Challenge** (Modus, Waffen
   und Missionen für die ganze ISO-Woche fest, Montag kommt die nächste) – eigene Bestwerte je Tag und Woche.
8. **👥 Duell:** 2–4 Leute spielen abwechselnd am selben Handy – gleiche Art Runde, gleiche Waffen, gleiche Scheibe.
   Zwischen den Runden zeigt die Tabelle den Stand, am Ende gibt es Krone oder Unentschieden und eine Revanche.
9. **Merken:** Die bestätigte Scheibe wird je Modus und Fensterseite gespeichert und beim nächsten Mal direkt
   vorgeschlagen („✨ Automatisch“ sucht neu). **📊 Statistik** zeigt Runden, Spielzeit, Trefferquote, Bestwerte,
   Lieblingswaffen und die letzten Runden.

### Punkte und Anreiz

`Basis × Entfernung (kleines Ziel bis ×3) × Combo (bis ×5) × Volltreffer ×1,5 × Mehrfachtreffer ×2 × Fahrzeugklasse (LKW/Bus ×1,3)`

- Runden dauern 60 s (einstellbar), **jeder Abschuss bringt +3 s** bis maximal zur doppelten Länge.
- 3 Missionen pro Runde („2 LKW mit Milkshake“, „5er-Combo“, …), je +300…900.
- Farbpistole: Deckungsboni bei 25 / 50 / 100 %. Milkshake lässt Nachbarautos mitrutschen.
- Medaillen 🥉🥈🥇, Bestwerte je Modus, Tagesbestwert, Fahrt-Statistik – alles lokal gespeichert.
- **Guthaben:** Jede Runde zahlt ihre Punkte auf dein Konto ein; im Shop kaufst du damit Waffen (1.500–20.000) und Skins.
- Wurfsachen zielen automatisch **vor** fahrende Autos (Vorhalt), Treffer werden entlang der Flugbahn geprüft.
- Farbe, Ei, Tomate und Klopapier bleiben am Auto kleben – auch wenn die Erkennung kurz aussetzt; Milkshake, Schneeball
  und Banane zeigen erst den Treffer, dann rutscht das Auto weg.
- **Tages-Challenge:** dieselben Missionen für alle, jeden Tag neu.
- **Weltweite Rangliste** (täglich / wöchentlich / allzeit, je Modus und Fahrzeugtyp), sobald der kleine
  Server eingerichtet ist – siehe unten. Demo- und Endlos-Runden zählen nicht.

### Tipps für gute Erkennung

- Handy quer halten, Linse frei, möglichst wenig Spiegelung (Handy nah an die Scheibe).
- Frontscheibe funktioniert am zuverlässigsten (Autos voraus sind lange im Bild), Seitenfenster ist Arcade pur.
- Bei Nacht oder Regen erkennt das Modell weniger; dann eher Runner mit „Ganzes Bild“.
- Fünfmal schnell oben links tippen öffnet die Diagnose (Erkennungs-ms, Delegate GPU/CPU, Gyro, Scheibenstatus).
- Ein Fehler im Spiel friert nichts mehr ein: Er wird abgefangen, das Spiel läuft weiter, und der Startbildschirm zeigt
  „Letzter Fehler“ mit Kopier-Knopf – schick mir den Text, wenn etwas hakt.
- Einstellungen: Schwierigkeit (Vogeldichte, Zielhilfe) und Linkshänder-Layout.
- Einstellungen: Sichtfeld der Kamera (Tracking-Stärke), Latenzausgleich, Tracking invertieren, Sound-Effekte und Musik
  mit Lautstärke, Vibration, Rundenlänge, Füllen getroffener Autos, experimenteller Masten-/Baum-Detektor für den Runner.
- **🔋 Akku-Sparmodus** für lange Fahrten: weniger Erkennungen pro Sekunde, 30 fps, weniger Partikel.
- **🌐 Sprache:** Deutsch (Standard) oder Englisch – in den Einstellungen oder per `?lang=en`. Alle Texte des Spiels
  liegen in `src/ui/i18n/strings.de.ts` / `strings.en.ts`; die englische Tabelle wird gegen die deutsche typgeprüft,
  eine fehlende Übersetzung ist ein Compile-Fehler.
- Musik und alle Geräusche werden live mit WebAudio erzeugt (keine Audiodateien): Synthwave-Loop in den Schieß-Modi,
  Chiptune im Runner; die Musik zieht mit Combo und Restzeit an und duckt sich kurz unter Explosionen.

## Mit AR-Brille oder Headset spielen

Startbildschirm → **🕶️ Brillen & AR** (mit Headset: „Brillen & Headset“). Kurz und ehrlich, was geht:

| Gerät | Wie | Status |
|---|---|---|
| **Display-Brillen am Handy**: XREAL Air/One/One Pro, VITURE, Rokid Max, RayNeo Air | USB-C an iPhone 15+ (nicht 16e, 17e, Air) oder Android mit DisplayPort (Galaxy S, Pixel 8+); das Handy spiegelt | ✅ **Leinwand** (ohne Einstellung) · ✅ **Durchsicht-Modus**: Kamerabild aus, nur Effekte – Schwarz ist in der Brille durchsichtig, also liegen Explosionen auf der echten Welt. Einmal **Brille ausrichten**. Ausrichtung nur ungefähr (die Webseite kennt die Kopfbewegung nicht). |
| **Meta Quest 3 / 3S** | Im Quest-Browser öffnen, „Headset-Kameras“ erlauben | ✅ WebXR: **Leinwand** (schwebendes Bild, folgt träge dem Blick) oder **AR-Overlay** (Effekte kopf-fest über der Durchsicht, Ausrichtung per Stick). Kamera über `getUserMedia` (im Quest-Browser laut Meta noch experimentell); liefert sie im Headset keine Bilder, beendet das Spiel den Headset-Modus mit Hinweis. Reisemodus im Zug; im Auto unterstützt Meta das Tracking nicht. |
| Quest 2 / Pro | Quest-Browser | ⚠️ WebXR ja, aber kein Kamerazugriff → Demo |
| Samsung Galaxy XR / Android XR, Pico 4 Ultra | Chrome / Pico-Browser | ⚠️ WebXR mit Durchsicht ja; ob der Browser die Außenkamera hergibt, ist nicht dokumentiert – ausprobieren, sonst Demo |
| Ray-Ban Meta / Oakley Meta | – | ❌ kein Display; Kamera nur über Metas native Toolkits, nicht im Browser |
| Meta Ray-Ban Display | – | ❌ kann kein Handy spiegeln, Web-Apps dort haben keine Kamera |
| Apple Vision Pro | Safari | ❌ nur WebXR-VR, kein AR, keine Kamera für Webseiten |

**Steuerung ohne aufs Handy zu schauen** (alles gleichzeitig nutzbar):

- **Handy als Touchpad** (Einstellung auf dem Brillen-Bildschirm): wischen = Fadenkreuz bewegen, tippen = Schuss,
  still halten = Dauerfeuer, zweiter Finger = feuern.
- **Bluetooth-Gamepad** (Gamepad-API, „Standard“-Belegung; einmal eine Taste drücken): A/RT schießen, X nachladen,
  Y/LB/RB wechseln, Stick/Steuerkreuz zielen, Start Pause, Back neu zentrieren. Runner: A/↑ springen, B/↓ ducken.
  In den Menüs: Steuerkreuz wählt, A drückt (auch Halte-Knöpfe), B = Zurück.
- **Tastatur / Presenter:** Leertaste schießen, Pfeile zielen (Alt = fein), R nachladen, Q/E wechseln, Esc Pause,
  C neu zentrieren; Presenter „Bild ↓“ schießt, „Bild ↑“ wechselt.
- **Headset-Controller / Hände:** Trigger oder Pinch = schießen (Runner: springen), Griff = Waffe wechseln (Runner: ducken),
  A/X = nachladen, B/Y = Pause (zurück ins Browserfenster, dort „🥽 Weiter im Headset“), Stick drücken = Leinwand
  zurückholen bzw. AR-Overlay ausrichten (links schieben, rechts zoomen, nochmal drücken speichert).

Der Durchsicht-Modus wirkt nur mit der echten Kamera – in der Demo bleibt die Demo-Straße sichtbar. Zum Ausprobieren
des Looks erzwingt `?glasses=1` ihn für einen Besuch (wird nicht gespeichert). Die Ausrichtung gilt für die
Bildschirm-Ausrichtung, in der sie gemacht wurde; quer ↔ hoch fragt beim nächsten Start neu. Mit Hand-Tracking im
Headset gilt nur der Pinch (= Trigger); Daumengesten werden bewusst ignoriert.

Technik: `src/input/` (Gamepad-/Tastatur-Belegung, Touchpad-Zustandsautomat, Menü-Navigation), `src/xr/` (WebXR-Sitzung,
WebGL2-Leinwand ohne three.js, Strahl-Treffer, träges Nachführen). Getestet mit Unit-Tests und mit Metas
WebXR-Emulator **IWER** (emulierte Quest 3 in Playwright: Sitzung, Frames, Controller-Strahl, Trigger, B-Pause, AR-Ausrichtung).
Auf echter Hardware ist das noch **nicht** getestet.

## Weltweite Rangliste einrichten (optional, kostenlos)

Der Server ist ein Cloudflare Worker in `server/leaderboard-worker/`. Er rechnet jede eingereichte Runde aus
ihrem Ereignisprotokoll **nach** und lehnt alles ab, was die Formeln nicht erklären. Anleitung:
[server/leaderboard-worker/README.md](server/leaderboard-worker/README.md) – danach in GitHub die
Actions-Variable `LEADERBOARD_URL` setzen; der nächste Deploy aktiviert die Rangliste in der App.

## Entwicklung

```bash
npm install          # kopiert auch die MediaPipe-WASM-Laufzeit nach public/
npm run dev          # http://localhost:5173  (Demo: ?demo=1&skipTo=play&mode=side-runner)
npm test             # Vitest: Tracker, Scheiben-Erkennung, Physik, Scoring, Verifikation (50+ Tests)
npm run e2e          # Playwright, headless Chromium mit Fake-Kamera: 10 Szenarien inkl. echtem MediaPipe-Start und Offline-Betrieb
npm run package      # WindowBlaster.zip: App + Go-Server für Mac (baut die App neu; braucht Go ≥ 1.24, siehe launcher/; Mac: macOS 11+)
(cd launcher && go test ./...)   # Server-Tests: Zertifikate, MIME-Typen, Seiten, Tracking
npm run build        # dist/ (≈ 100 kB JS + 34 MB WASM/Modell, nach dem ersten Laden gecacht)
```

Nützliche URL-Parameter: `?demo=1` (synthetische Szene), `?mode=front-shooter|side-shooter|side-runner`,
`?weapons=smg,rocket`, `?skipTo=play|calibrate`, `?seed=42`, `?round=30`, `?night=1`, `?debug=1`.

Ordner:

| Pfad | Inhalt |
|---|---|
| `src/camera/` | Kamera (Linsenwahl, Neustart nach Hintergrund) und Demo-Szene |
| `src/vision/` | MediaPipe-Detektor, Mock-Detektor, adaptiver Scheduler, Multi-Objekt-Tracker |
| `src/vision/window/` | Scheiben-Erkennung, Kanten-Snap, Tracking-Fusion mit Gyro |
| `src/game/` | Waffen, Projektile, Trefferauflösung, Effekte, Scoring, Missionen, Shooter- und Runner-Modus |
| `src/ui/` | Screens (Deutsch), HUD |
| `shared/` | Punkteformeln und Runden-Verifikation, gemeinsam mit dem Server |
| `server/leaderboard-worker/` | Rangliste (Cloudflare Worker + KV) |
| `docs/DESIGN.md` | Architektur, Entscheidungen, Mathe, Roadmap |

## Datenschutz & Sicherheit

- Kamera und Bewegungssensor werden nur live ausgewertet, auf dem Gerät. Es gibt keine Aufnahme, keinen Upload von Bildern.
- Die Rangliste erhält nur: zufällige Spieler-ID, Spitzname, Punktestand und das Ereignisprotokoll der Runde (Zeitpunkte, Waffe, Klasse, Punkte).
- Menschen, Radfahrende und Motorräder werden **nie** als Ziel behandelt – nur Autos, LKW, Busse, Züge (und Schilder/Ampeln für Farbe).
- Nur als Fahrgast spielen. Das Handy gut festhalten, die fahrende Person nicht ablenken.

## Bekannte Grenzen

- Erkennung braucht Tageslicht und Sicht; sehr kleine oder weit entfernte Fahrzeuge werden nicht erkannt.
- Bäume kennt das COCO-Modell nicht; dafür gibt es den experimentellen Masten-Detektor (Einstellungen).
- Das „Verschwinden“ füllt die Lücke mit der Umgebung des Autos (Straße, Himmel, Häuser von links, rechts, oben und
  unten darübergezogen) und löst das Auto in Pixelblöcken auf. Die Füllung folgt dem Auto, auch wenn die Erkennung
  es kurz verliert und neu findet. Bei sehr unruhigem Hintergrund bleibt eine leichte Verschmierung sichtbar.
- iOS: Vibration wird vom System nicht unterstützt; Sound erfordert, dass der Stummschalter aus ist.
- Brillen/Headsets: Die Durchsicht-Ausrichtung ist ungefähr und verrutscht, wenn sich Kopf und Handy gegeneinander
  bewegen; Headset-Tracking in fahrenden Autos ist von Meta nicht unterstützt. Getestet nur im Emulator.
