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

## Aufs Handy bekommen

Die App braucht HTTPS (Kamera-Zugriff). Der einfachste Weg ist GitHub Pages:

1. Im Repository **Settings → Pages → Build and deployment → Source: „GitHub Actions“** wählen (einmalig).
2. Der Workflow `.github/workflows/window-blaster.yml` testet, baut und deployt bei jedem Push
   auf diesen Branch (oder per **Actions → window-blaster → Run workflow**).
3. Auf dem Handy öffnen: `https://fatmaku.github.io/Notion/window-blaster/`
4. **Zum Homescreen hinzufügen** (Safari: Teilen → „Zum Home-Bildschirm“; Chrome: Menü → „App installieren“).
   Dann läuft es im Vollbild, quer, und nach dem ersten Laden auch offline.

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
3. **Waffen:** zwei Slots, im Spiel per 🔁 wechselbar. Alle Waffen sind von Anfang an frei.
4. **Kamera & Sensoren freigeben** – ein Tipp erledigt Kamera- und Bewegungssensor-Zugriff (iOS braucht beides in derselben Geste).
5. **Scheibe vermessen:** Die App findet die helle Scheibe im dunklen Innenraum automatisch, zeigt vier Ecken
   und einen Status („Scheibe erkannt · 74 %“). Ecken bei Bedarf ziehen, im Runner zusätzlich die Bodenlinie.
   **Ganzes Bild**, wenn du das Handy direkt an die Scheibe hältst oder es dunkel ist. **Passt so** startet.
6. **Spielen:**
   - Tippen = schießen (MP und Farbpistole: halten = Dauerfeuer). Granate/Milkshake fliegen im Bogen zum Tippunkt,
     die Rakete wird durch Halten aufgeschaltet („LOCK“) und beim Loslassen abgefeuert.
   - Runner: Tippen oder 🅰️ = Sprung (kurz tippen = kleiner Sprung), Ducken-Knopf oder nach unten wischen = ducken.
     Lange Fahrzeuge kann man als Plattform benutzen.
   - ⌖ zentriert die Scheibe neu, ⏸ pausiert.

### Punkte und Anreiz

`Basis × Entfernung (kleines Ziel bis ×3) × Combo (bis ×5) × Volltreffer ×1,5 × Mehrfachtreffer ×2 × Fahrzeugklasse (LKW/Bus ×1,3)`

- Runden dauern 60 s (einstellbar), **jeder Abschuss bringt +3 s** bis maximal zur doppelten Länge.
- 3 Missionen pro Runde („2 LKW mit Milkshake“, „5er-Combo“, …), je +300…900.
- Farbpistole: Deckungsboni bei 25 / 50 / 100 %. Milkshake lässt Nachbarautos mitrutschen.
- Medaillen 🥉🥈🥇, Bestwerte je Modus, Tagesbestwert, Fahrt-Statistik – alles lokal gespeichert.
- **Tages-Challenge:** dieselben Missionen für alle, jeden Tag neu.
- **Weltweite Rangliste** (täglich / wöchentlich / allzeit, je Modus und Fahrzeugtyp), sobald der kleine
  Server eingerichtet ist – siehe unten. Demo- und Endlos-Runden zählen nicht.

### Tipps für gute Erkennung

- Handy quer halten, Linse frei, möglichst wenig Spiegelung (Handy nah an die Scheibe).
- Frontscheibe funktioniert am zuverlässigsten (Autos voraus sind lange im Bild), Seitenfenster ist Arcade pur.
- Bei Nacht oder Regen erkennt das Modell weniger; dann eher Runner mit „Ganzes Bild“.
- Fünfmal schnell oben links tippen öffnet die Diagnose (Erkennungs-ms, Delegate GPU/CPU, Gyro, Scheibenstatus).
- Einstellungen: Sichtfeld der Kamera (Tracking-Stärke), Latenzausgleich, Tracking invertieren, Sound, Vibration,
  Rundenlänge, realistisches Füllen verschwundener Autos, experimenteller Masten-/Baum-Detektor für den Runner.

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
npm run e2e          # Playwright, headless Chromium mit Fake-Kamera: 9 Szenarien inkl. echtem MediaPipe-Start
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
- Das „Verschwinden“ füllt die Lücke aus den Nachbarpixeln – vor der Frontscheibe glaubwürdig, im Seitenfenster
  ist das Objekt ohnehin nach einer halben Sekunde vorbei.
- iOS: Vibration wird vom System nicht unterstützt; Sound erfordert, dass der Stummschalter aus ist.
