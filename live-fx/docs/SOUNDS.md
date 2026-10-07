# Sounds & Mixer (LiveFX 2.0 – `js/sounds.js`, global `LiveFXSounds`)

Alle Sounds werden **synthetisiert** (WebAudio, keine Dateien, keine Lizenzfragen). 38 One-Shots in drei
Gruppen plus 12 Atmosphäre-Loops für Szenen. Seit 2.0 laufen sie über einen **Mixer** mit zwei Bussen,
Limiter, Ducking, Panning, Intensitäts-Layern und synthetischem Hall. Die alte API
(`LiveFXSounds.play(name, ctx, out, volume)`, `LiveFXSounds.loop(...)`) funktioniert unverändert.

## Sound-Liste

`LiveFXSounds.names` (38, in Gruppenreihenfolge) und `LiveFXSounds.GROUPS` (`impact`, `funny`, `magic`,
`ambient-loops`). Jeder One-Shot gehört zu genau einer Gruppe. Neu in 2.0: **fett**.

### impact – Wucht, Übergänge, Drama (17)

| Name | Beschreibung | Einsatz |
| --- | --- | --- |
| `airhorn` | MLG-Airhorn, drei verstimmte Sägezähne mit Vibrato (0.9 s) | Hype, Treffer, „Let's go“ |
| `boom` | Vine-Boom: Sub-Sweep 160→38 Hz + Punch (1.3 s) | Pointe, Bass-Drop |
| **`punch`** | Tiefer Thud (130→45 Hz) + kurzer Noise-Slap (0.3 s) | Schlag, Treffer, „Oof“ |
| `rimshot` | Snare-Doppel + Crash (0.9 s) | Witz-Pointe („ba-dum-tss“) |
| `drumroll` | Beschleunigender Trommelwirbel + Becken (2.9 s) | Ankündigung, Auslosung |
| `buzzer` | Tiefer Rechteck-Buzzer (0.7 s) | Falsch, Game-Over |
| `nope` | Zwei kurze tiefe Töne „uh-uh“ (0.35 s) | Ablehnung |
| `dramatic` | „Dun dun duuun“ – drei Moll-Akkorde mit Filter-Sweep (2.3 s) | Enthüllung, Cliffhanger |
| `siren` | Polizeisirene, zwei Auf/Ab-Sweeps (1.6 s) | Alarm, Verfolgung |
| `heartbeat` | Zwei Lub-dub-Schläge (1.3 s) | Spannung |
| `gong` | Tiefer Gong mit 2.5 s Ausklang | Rundenstart, Zeremonie |
| **`glass`** | Glasbruch: Noise-Burst, klingelnde Hochtöne, Splitter (1 s) | Crash, Missgeschick |
| **`door`** | Türknarren: langsam steigender, wabernder Sägezahn mit Holz-Klopfer (1.4 s) | Horror, „Wer ist da?“ |
| **`camera`** | Kamera-Verschluss: Klappe, Klick, Motor, zweiter Klick (0.13 s) | Screenshot, Foto |
| `scratch` | Plattenscratch, Band-Sweep hoch/runter (0.55 s) | Abbruch, Rekord-Stop |
| `whoosh` | Einzelner Noise-Swoosh (0.5 s) | Übergang |
| **`whoosh2`** | Doppel-Swish: hoch dann runter, mit Luft-Sinus (0.75 s) | Schneller Übergang, Vorbeiflug |

### funny – Comedy, Reaktionen, Publikum (12)

| Name | Beschreibung | Einsatz |
| --- | --- | --- |
| `sadTrombone` | „Wah wah wah waaah“, vier fallende Töne (2.5 s) | Fehlschlag |
| `crickets` | 14 Grillen-Zirper (2.5 s) | Peinliche Stille |
| `applause` | 60 Klatscher + Rauschteppich (2.4 s) | Erfolg, Danke |
| `laugh` | Sitcom-Lacher, 5 „ha“-Pulse (1.5 s) | Witz |
| **`kidlaugh`** | Kurzes Kinderkichern, 6 schnelle Pulse (0.65 s) | Niedlich, Schadenfreude |
| `ooh` | Publikum „oooh“, Formant-Rauschen (1.5 s) | Enttäuschung, Autsch |
| `boing` | Cartoon-Feder mit Pitch-Wobble (0.7 s) | Sprung, Fehler |
| `slideWhistle` | Lotusflöte hoch und runter (1.2 s) | Rutsch, Fall |
| **`bleat`** | Meme-Ziege/Schaf: Sägezahn mit tiefem Vibrato (0.75 s) | Scream-Goat-Moment |
| **`duck`** | Quietsche-Ente: Zwei-Ton-Chirp hoch/runter (0.36 s) | Albernheit, Fehlklick |
| **`scream`** | Wilhelm-artiges „aaah!“ – fallende Formanten + Vibrato (1 s) | Sturz, Schreck |
| **`tick`** | Uhr „tick … tock“ (0.55 s) | Warten, Countdown |

### magic – Belohnung, Erfolg, Glanz (9)

| Name | Beschreibung | Einsatz |
| --- | --- | --- |
| `ding` | Heller Glockenton (1.1 s) | Benachrichtigung, richtig |
| `pop` | Kurzer Pop (0.1 s) | Klick, Blase |
| `tada` | Vier-Ton-Fanfare (1.3 s) | Erfolg |
| **`fanfare`** | Trompeten-Fanfare C-E-G mit gehaltenem Akkord (1.4 s) | Sieg, Ankündigung |
| `cash` | Kasse „ka-ching“ (0.9 s) | Spende, Sub |
| `coin` | Mario-Münze (0.55 s) | Punkt, Bonus |
| `levelUp` | Aufsteigendes Arpeggio + Schimmer (1.4 s) | Level-Up, Meilenstein |
| `bell` | Kirchen-/Boxglocke (2.3 s) | Rundenstart |
| **`sparkle`** | Magisches Glitzern: aufsteigendes Glocken-Arpeggio (1 s) | Zauber, Verwandlung |

### ambient-loops – Atmosphäre für Szenen (12)

`LiveFXSounds.loops` = `rain`, `wind`, `fireplace`, `birds`, `sea`, `thunder`, `nightCrickets`, `heartbeatSlow`,
`churchBells`, `cityHum`, `spaceDrone`, `storm`. Endlos, 1.5 s Ein-/Ausblendung, ohne Timer (laufen auch im
OfflineAudioContext). Trigger-Encoding: `sound: "loop:<name>"`.

## Pegel (Loudness-Normalisierung, 2.2)

- **Jeder** eingebaute One-Shot hält **Peak ≤ 0.6** pro Stimme (`LiveFXSounds.PEAK_BUDGET`, Hüllkurven-Spitze und
  statische Gains auf dem Audio-Pfad). In 2.2 wurden die letzten Ausreißer (`heartbeat` 0.8, `ooh` 0.9) angepasst,
  Loops halten jede Schicht ≤ 1.0 (`storm` war 1.05). Modulations-Gains (LFO-Tiefe in Hz, z. B. Vibrato bei
  `bleat`/`scream`/`door`) sind keine Audio-Pegel.
- Der Mixer-Limiter (jetzt **−9 dB**, `LiveFXSounds.LIMITER_DB`) fängt Summen mehrerer Stimmen und die Loops ab.
  `test/sounds.test.js` prüft die Budgets für alle 38 One-Shots und 12 Loops mit einem Fake-AudioContext
  (Node hat kein WebAudio).

## Drei Lautstärken (2.2)

Overlay und Renderer kennen drei Pegel: **master** 0.5, **sfx** 0.8 (One-Shots), **ambient** 0.5 (Szenen-Loops).
Bus-Nachricht `{type:'volume', volume, bus?}` – ohne `bus` ist es wie bisher die Master-Lautstärke (alte Panels
funktionieren unverändert), `bus:'sfx'|'ambient'` setzt den jeweiligen Bus (`mixer.setBus`). Der Server merkt
sich die Pegel pro Bus (`state.volumes`) und schickt sie im `state`-Event; `overlay.html?volume=0.3` pinnt nur
master. Im Renderer: `renderer.setVolume('master'|'sfx'|'ambient', v)`, `renderer.volumes`, `renderer.volume`
(= master). Szenen-Loops laufen seit 2.2 über den Ambient-Bus des Mixers (Ducking durch One-Shots + Limiter).

## Mixer (`LiveFXSounds.mixer`)

```
Stimme ─▶ [StereoPanner] ─▶ sfxBus ───────────────────────────────┐
Loop   ─▶ ambientBus ─▶ duckGain ─▶ (dry) ─────────────────────────┼─▶ master ─▶ Limiter ─▶ destination
                                 └─▶ Convolver (Hall) ─▶ wetGain ──┘
```

- **Limiter**: `DynamicsCompressorNode`, Threshold **−9 dB** (2.2; vorher −6), Ratio 12, Attack 3 ms, Release 250 ms, Knee 6.
  Fehlt der Node (sehr alte Engines), geht `master` direkt auf `destination`.
- **init(ctx, out?)** baut den Graphen (idempotent für denselben Kontext; neuer Kontext = Neuaufbau, Pegel bleiben).
  Ohne `init` legt `play()` beim ersten Aufruf selbst einen `AudioContext` an (nur wenn `AudioContext`/
  `webkitAudioContext` existiert, sonst `null`).
- **play(name, {gain=1, pan=0, intensity=1, when=0}) → {stop(), name, end} | null**
  - `gain` 0..1 (geclampt), `pan` −1..1 (StereoPannerNode; Fallback 3-D-Panner „equalpower“, sonst mono),
    `when` Sekunden ab jetzt (0..60), `intensity` 1..3.
  - **Intensität**: 2 und 3 legen zusätzliche Stimmen auf dieselbe Voice. Sounds mit eigenem Layer-Rezept
    (`boom` Sub-Oktave + Rumpeln, `punch` tieferer Thud + Slap, `airhorn` Oktave tiefer, `glass` mehr Splitter,
    `applause` mehr Klatscher + Pfiff) nutzen das; alle anderen bekommen eine generische, leicht verzögerte
    (14 ms/Layer) und verstimmte (+9 / −14 Cent) Wiederholung bei 0.5 bzw. 0.4 Gain – breiter und dicker,
    ohne zu übersteuern.
  - `stop()` blendet die Stimme in 20 ms aus und stoppt alle Quellen; `end` = geplantes Ende (Kontext-Uhr).
- **startLoop(name, {gain=1, fade?}) / stopLoop(fadeSec=1.5)**: ein Loop zur Zeit auf dem Ambient-Bus;
  gleicher Name = No-op, anderer Name blendet den alten aus (1.5 s) und den neuen ein.
- **duck(ms=300, db=−8)**: senkt `duckGain` sofort (Zeitkonstante 15 ms) um `db` und fährt es nach dem Ende der
  **letzten aktiven SFX-Stimme** mit `setTargetAtTime` (Zeitkonstante `ms/4` → ~98 % nach `ms`) zurück. Läuft
  kein SFX, startet die Rückkehr sofort. `play()` duckt automatisch, solange ein Loop läuft
  (`mixer.autoDuck=false` schaltet das ab; `mixer.duckMs`/`mixer.duckDb` sind die Defaults). Alles reine
  AudioParam-Automation – keine Timer.
- **setMaster(v)**, **setBus('sfx'|'ambient', v)**: 0..1, 20 ms Rampe; Rückgabe = gesetzter Wert
  (`setBus` mit unbekanntem Bus → `null`).
- **reverb(on, {seconds=1.8, mix=0.25})**: synthetische Impulsantwort (Stereo-Rauschen, exponentiell auf −60 dB
  in `seconds` abfallend) in einem `ConvolverNode` parallel zum trockenen Ambient-Pfad; `mix` = Wet-Gain.
  Gleiche Länge nutzt die Impulsantwort wieder, neue Länge baut sie neu. `reverb(false)` fährt Wet auf 0.
  Für Szenen gedacht (Kirche, Höhle); SFX bleiben trocken. Ohne `createConvolver` → `false`.
- **stats** (Getter): `{voices, ducked, master, sfx, ambient, reverb, loop, limiter}` – `voices` = aktive
  `play()`-Stimmen (Layer zählen zur Stimme), `ducked` solange die Rückkehr noch läuft.

### Beispiel (Renderer)

```js
const S = LiveFXSounds;
S.mixer.init(ctx);                                  // einmal nach der ersten Nutzergeste
S.mixer.setMaster(renderer.volumes.master);                // 0.5 / sfx 0.8 / ambient 0.5 (2.2)
S.mixer.setBus('sfx', renderer.volumes.sfx);
S.mixer.setBus('ambient', renderer.volumes.ambient);
S.mixer.startLoop('rain', { gain: 0.8 });           // Szene
S.mixer.reverb(true, { seconds: 2.5, mix: 0.3 });   // Kirche
S.mixer.play('punch', { pan: -0.6, intensity: 3 }); // links, fett – duckt den Regen automatisch
```
