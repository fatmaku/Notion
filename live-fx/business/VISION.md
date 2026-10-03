# LiveFX – Die nächsten Schritte

**Du redest. Es wird Bild.** Vision 2027–2029: Live-Video aus Worten, Sprachenlernen, neue Räume und ein Editor, der von selbst schneidet.

Stand: Oktober 2026 · Produktstand: Version 2.0 · Vertraulich
Gründerin: [Name] · Kontakt: [E-Mail]

> Auch auf Türkisch: VISION.tr.md · In English: VISION.en.md

> Marktzahlen stammen aus öffentlichen Sekundärquellen und tragen [Quelle n] (Liste in `QUELLEN.md`, Nummern 1–60). Eigene Preise, Mengen und Umsätze sind als „Schätzung“ gekennzeichnet. Funktionen, die es noch nicht gibt, sind mit **Vision** markiert. Angaben in [eckigen Klammern] ergänzt die Gründerin.

---

## 1. Worum es geht

Heute hört LiveFX der Streamerin zu und blendet in unter einer Sekunde Memes, GIFs, Sounds und animierte Szenen in den Live-Stream ein: Live-Untertitel, nur mit Bildern, Memes und Geräuschen. Version 2.0 versteht Deutsch, Türkisch und Englisch automatisch, toleriert Dialekt, bringt 238 Trigger in fünf Paketen, einen Story-Modus mit 13 Szenen und 12 Atmosphäre-Loops und läuft im Browser, auf Wunsch offline.

Die nächste Stufe macht aus LiveFX eine **Bildsprache für alles Gesprochene**. Was jemand erzählt, vorliest oder unterrichtet, erscheint in derselben Sekunde als fortlaufende Szene, als Wortbild mit Aussprache oder als fertig geschnittener Clip, im Stream, im Klassenzimmer, auf der Bühne, in der Brille und im Schnittprogramm. Gerendert wird im Browser auf dem eigenen Gerät, mit dem **Rechenbudget eines Untertitels statt eines Rechenzentrums**.

**Claim:** „Du redest. Es wird Bild.“ (Türkischer Vorschlag, von der Gründerin zu prüfen: „Sen anlat – sahne oluşsun.“)

**Die vier Linien**

| Linie | Name | Farbe | Was entsteht | Status |
|---|---|---|---|---|
| **A** | Erzählfilm – Generative Scene Engine | Neon-Grün | Ein fortlaufender, animierter Film aus Wörtern, Sätzen und Kontext, unter oder neben dem Live-Bild | Vision, Prototyp vorhanden |
| **B** | WortBild – Sprachenlernen und Lesehilfe | Gold | Gesprochenes Wort → Bild + Wort in der Zielsprache + Aussprache, oder als Lesehilfe in der eigenen Sprache | Vision, Prototyp vorhanden |
| **C** | LiveFX Räume – Bühne, Klassenzimmer, Hörbuch, AR/VR, Brille | Hellblau | Dieselbe Engine auf neuen Bildschirmen | Bühne heute nutzbar, Rest Vision |
| **D** | LiveFX Studio – Live-Schnitt und Auto-Edit | Neon-Pink | Highlights aus dem Stream und automatischer Schnitt fertiger Videos, lokal exportiert | Vision |

**Begleitmaterial**

- Prototyp Sprachenlernen: `prototypes/sprachlernen.html` (WortBild, Linie B, eine HTML-Datei, offline)
- Prototyp Live-Story: `prototypes/live-story.html` (Erzählfilm, Linie A, eine HTML-Datei, offline)
- Vision-Trailer (35 s): `video/LiveFX_Vision_de_16x9.mp4` und `video/LiveFX_Vision_de_9x16.mp4`, dazu die türkischen und englischen Fassungen `video/LiveFX_Vision_tr_16x9.mp4`, `video/LiveFX_Vision_tr_9x16.mp4`, `video/LiveFX_Vision_en_16x9.mp4`, `video/LiveFX_Vision_en_9x16.mp4`
- Pitch-Folien 12–15 in `LiveFX_Pitch.pptx` (DE), `LiveFX_Pitch_TR.pptx`, `LiveFX_Pitch_EN.pptx`
- Finanzielle Einordnung: `BUSINESSPLAN.md`, Kapitel „Zukunft“; Märkte: `MARKTANALYSE.md`, „Angrenzende Märkte“

---

## 2. Leitprinzip: zeichnen statt generieren

Generative Video-KI berechnet jedes Bild neu, auf teuren Grafikprozessoren, mit Sekunden bis Minuten Wartezeit. Für Live ist das zu langsam und zu teuer. LiveFX geht den umgekehrten Weg: Ein Satz wird in eine **kleine Zustandsänderung** übersetzt (wenige hundert Byte), und der Browser **zeichnet** die Szene daraus, deterministisch und mit 60 Bildern pro Sekunde.

| | Generative Video-KI | LiveFX |
|---|---|---|
| Was berechnet wird | jedes Pixel jedes Bildes | ein Zustands-Delta pro Satz (200–500 Byte) |
| Wo | Rechenzentrum (GPU) | Browser auf dem eigenen Gerät |
| Latenz | Sekunden bis Minuten | unter einer Sekunde |
| Live möglich | nein | ja |
| Kosten pro Stunde Begleitvideo | 180–2.700 USD nach Listenpreis [Quelle 24, 25] | 0 € ohne KI, 0,25–0,75 USD mit optionaler Text-KI (Projektmessung) |
| Wiederholbar | nein (Zufall im Modell) | ja: gleicher Text + gleicher Seed = gleiches Bild |
| Datenschutz | Upload nötig | Daten bleiben auf dem Gerät |

Die Rechnung: Video-KI kostet nach Listenpreis 0,05 USD (Veo 3.1 Lite, 720p) bis 0,75 USD pro Sekunde [Quelle 24, 25]. Eine Stunde sind 3.600 Sekunden, also 180–2.700 USD. LiveFX ist damit **240- bis über 10.000-mal günstiger** und läuft, anders als Video-KI, live. **Ehrlich positioniert:** Das Ergebnis ist eine stilisierte Bilderbuch-Welt, kein fotorealistisches KI-Video. Gerade deshalb ist es schnell, billig und kindgerecht.

---

## 3. Architektur: eine Pipeline, ein Datenformat, viele Bildschirme

```
Stimme/Datei ─► Transkript ───────────► Verstehen ─────────────────► Zeitleiste (LTF) ─► Renderer-Ziele
                asr.js · whisper-worker   matcher.js · langdetect.js    timeline.js           fx.js-Overlay · Band/Split · WortBild
                /api/transcript           scene-director.js · smart.js  (ein JSON-Format)     Bühne · Companion · AR/XR · Studio-Export
```

**Gemeinsames Rückgrat: die LiveFX-Zeitleiste (LTF v1).** Ein JSON-Format für alle vier Linien, das in `docs/CONTRACTS.md` festgeschrieben wird (Vision, Q4 2026):

```
{ v:1, lang, seed, start, events:[ {t, kind, …} ] }
kinds: state (Weltzustand, A) · fire (Trigger, wie heute) · word (WortBild, B)
       caption (Wort mit Zeitstempel) · cut / zoom (Schnitt, D) · gift / chat (Signale)
```

- **A** schreibt die Zeitleiste live, **B** ergänzt Wörter, **C** spielt sie auf anderen Bildschirmen ab, **D** bearbeitet und exportiert sie.
- Jedes Bild ist `render(zustand, t, seed)`, nach dem Muster der Trailer-Engine `video/engine.js`. Damit ist jedes Bild deterministisch, wiederholbar und exportierbar.
- Was wiederverwendet wird: Spracherkennung (`asr.js`, Reaktion „schnell“ und „sicher“), Offline-Whisper (`whisper-worker.js`), Fuzzy-/Dialekt-Matcher (`matcher.js`), Spracherkennung der Sprache (`langdetect.js`), Effekt-Engine (`fx.js`, ParticleLayer mit Auto-Reduktion), Audio-Mixer (`sounds.js`, Ducking, Hall), Bridge (`bus.js`, SSE), Handy-Fernbedienung (`mobile.html`), optionale KI (`smart.js`).
- **Neu** sind im Kern nur drei Bausteine: `scene-director.js` (Satz → Zustands-Delta), die Effekt-Arten `actor`, `camera` und `word` in `schema.js` v4 sowie `timeline.js` (Zeitleisten-Log und Abspielen).

**Leistungsbudget (verbindlich):** ein Canvas, eine `requestAnimationFrame`-Schleife, höchstens 1.200 Partikel und 8–12 gecachte Sprites, Weltzustand ≤ 1 KB, Ziel 60 fps auf integrierter Grafik bei < 4 ms Skriptzeit pro Frame. Standard ist Canvas2D. WebGPU ist seit 2026 in allen großen Browsern verfügbar [Quelle 27] und wird nur optional für Licht und Tiefe genutzt.

---

## 4. Linie A – Erzählfilm: die Generative Scene Engine

### 4.1 Nutzererlebnis

Die Streamerin liest vor oder erzählt frei. Unter ihrem Kamerabild läuft ein fortlaufender Bilderbuch-Film, der sich mit jedem Satz weiterentwickelt. Im Hochformat (9:16) liegt er als Band zwischen Gesicht und Chat-Zone, im Querformat (16:9) als Split oder Hintergrund.

| Gesagt | Was im Bild passiert |
|---|---|
| „Es war Nacht.“ | Der Himmel wird dunkel, Sterne erscheinen. |
| „Ein Mädchen ging in den Wald.“ | Bäume wachsen von unten, eine Figur läuft ein und bleibt. |
| „Es begann zu regnen.“ | Regen fällt über den Wald, der Atmosphäre-Loop wechselt auf Regen. |
| „Plötzlich stand da ein Drache.“ | Blitz, kurzer Kamera-Ruck, der Drache tritt auf. |
| „Er flog los.“ | Der Drache hebt ab („er“ bezieht sich auf die zuletzt genannte Figur). |
| „Der Regen hörte auf.“ | Das Wetter wird klar (Negation erkannt). |

Die Streamerin tut nichts außer reden. Im Panel füllt sich die Zeitleiste mit den Szenenwechseln, am Handy gibt es zwei Tasten: „Szene halten“ und „Zurück“. Nach dem Stream liegt die Erzählung als Zeitleiste vor und ist Rohstoff für Clips (Linie D) und für „Hörbuch mit Bildern“ (Linie C).

### 4.2 So funktioniert es

- **Weltzustand** (≤ 1 KB) mit sieben Rollen: ORT, ZEIT, WETTER, FIGUR, OBJEKT, AKTION, STIMMUNG. Beispiel: `{ort:'wald', zeit:'nacht', wetter:'regen', figuren:[…], objekte:[…], stimmung:'spannend', kamera:{zoom, pan}}`.
- **Lexikon:** Die vorhandenen Story-Pakete (`STORY_DE/TR/EN`) erhalten ein Feld `role`. Die 13 Szenen decken bereits ORT, ZEIT und WETTER ab, die Sticker FIGUR und OBJEKT. Ziel: 300–500 Einträge pro Sprache.
- **Szenengrammatik**, deterministisch, Satz für Satz: ORT tauscht die Kulisse (Überblendung 800 ms), ZEIT färbt den Himmel um, WETTER tauscht das Partikelsystem, eine neue FIGUR läuft vom Rand ein, AKTION bewegt die genannte oder zuletzt genannte Figur, STIMMUNG ergibt Farbton und Vignette, „plötzlich“ löst Kamera-Ruck und Lichtblitz aus. Ein Satz ohne Treffer ändert nichts.
- **Timing in zwei Stufen:** Kulisse und Wetter reagieren schon auf Zwischenergebnisse (Reaktion „schnell“), Figuren erst bei fertigen Sätzen (Reaktion „sicher“). Ein Szenenwechsel braucht mindestens 8 s Abstand.
- **Optionale KI:** Für Sätze ohne Lexikon-Treffer liefert die Text-KI ein Zustands-Delta als JSON (Timeout 1,5 s). In Kinder- und Schulprofilen ist die KI standardmäßig aus.
- **Ausgabe:** `overlay.html?layout=band|split|full` als OBS-Browserquelle, Ton über den vorhandenen Mixer.
- **Bilder:** Grundvokabular Noto Color Emoji (Apache 2.0) [Quelle 30], OpenMoji (CC BY-SA 4.0) nur in Gratis- und Bildungs-Packs mit Namensnennung [Quelle 31], eigene SVG-Illustrationen im Kinderbuch-Stil als Marken-Pack. Zur Laufzeit wird kein Bild generiert.

### 4.3 Warum es so wenig Rechenleistung braucht

Ein Satz erzeugt ein Delta von 200–500 Byte, Szenen wechseln ein- bis dreimal pro Minute. Ein Frame besteht aus Farbverlauf, Silhouetten, höchstens 1.200 Partikeln und wenigen gecachten Figuren in *einem* Canvas. Dieses Budget hält die heutige Effekt-Engine schon neben dem OBS-Encoder auf einem Laptop mit integrierter Grafik.

### 4.4 Machbarkeit, Markt, Erlöse

- **Machbarkeit:** Prototyp vorhanden (`prototypes/live-story.html`). MVP im echten Datenfluss (DE, 4 Orte, 20 Figuren) in 8–12 Wochen, TR/EN und KI-Delta weitere 8 Wochen, Welten-Packs im eigenen Stil 6–9 Monate.
- **Markt:** Vorlese-, Hörbuch-, Podcast- und Talk-Formate, die heute nur Ton oder ein Standbild haben. Hörbuchmarkt Deutschland 2025: 374 Mio €, +13 % [Quelle 19]. 23,8 Mio Menschen in Deutschland hören wöchentlich Podcasts [Quelle 20], YouTube hat über 1 Mrd monatliche Podcast-Zuschauer [Quelle 21]. 32,3 % der 1- bis 8-Jährigen wird selten oder nie vorgelesen [Quelle 22]. KI-Videogenerierung und -schnitt: 3,67 Mrd USD 2026, 24,89 Mrd USD 2036 [Quelle 23]. Synthesia zeigt mit rund 150 Mio USD ARR die Zahlungsbereitschaft für „Video ohne Kamera“ [Quelle 26].
- **Erlöse (Schätzung):** Erzählfilm mit Lexikon in Pro (9,99 €), KI-Szenenplanung in Pro+ (14,99 €), Welten-Packs 2,99–4,99 € (Märchen/Masal, Meer, Weltraum, Stadt, Schule), Verlagslizenz [2.000 €] pro Titel und Jahr (Schätzung, von der Gründerin zu prüfen; erster Fall die eigene Kinderbuchreihe der Gründerin), später Scene-SDK als B2B-Lizenz.

### 4.5 Risiken

| Risiko | Antwort |
|---|---|
| Erwartung „KI-Video wie im Werbespot“ | Als animiertes Bilderbuch positionieren, den Stil zur Stärke machen |
| Metaphern („platzte vor Wut“) und Mehrdeutigkeit („Schloss“, „Meer/mehr“) | Negativliste, Kontextregeln, Reaktion „sicher“, Taste „Zurück“ |
| Lexikon-Pflege in drei Sprachen | Marktplatz und Lernfunktion |
| Ablenkung vom Gesicht | ruhiges Band, Mindestabstand zwischen Wechseln |
| Plattform baut nach | Burggraben aus Packs, Mehrsprachigkeit, Praxisnachweis und Tempo |

---

## 5. Linie B – WortBild: Sprachenlernen und Lesehilfe

### 5.1 Nutzererlebnis

Ein Kind sagt „Apfel“. Sofort erscheint ein großes 🍎, darunter „elma“ in der Zielsprache, klein „der Apfel“ mit farbigem Artikel und Silbenbögen, und eine Stimme spricht „elma“. Die Lehrkraft stellt nur drei Dinge ein: „Ich spreche: Deutsch“, „Zeige: Türkçe“ und den Modus. Dann liest sie vor, und jedes Wort aus der Lernliste wird zu Bild, Wort und Aussprache, ohne Klick. Der türkische Produktname ist „Kelime-Resim“.

| Modus | Was passiert | Für wen |
|---|---|---|
| **Übersetzen** | Wort in der Zielsprache, mit Aussprache | Familien, Schule, Integrationskurse, Herkunftssprache Türkisch |
| **Lesehilfe** | gleiche Sprache, großes Wort mit Silben und Bild | Kinder vor dem Lesealter, Kinder mit Lese- oder Aufmerksamkeitsschwierigkeiten, DaZ; anschlussfähig an die Neurodiversitäts-Bücher der Gründerin |
| **Nachsprechen** | Karte spricht vor, das Kind spricht nach, ein grüner Haken zeigt „erkannt“ | Üben ohne Noten; bewusst **keine** Aussprachebewertung |

Am Tablet wiederholt Antippen die Aussprache. Nach der Stunde lässt sich die Wortliste als Karteikarten drucken.

### 5.2 So funktioniert es

- **Neue Effekt-Art `word`** mit Bild, Grundform, Quell- und Zielsprache, Artikel, Silben, Beispielsatz und Aussprache.
- **Vokabel-Pakete** konzeptbasiert: ein Konzept, drei Sprachen, mit Formen (z. B. `elma`, `elmalar`, `elmayı`). 500 Konzepte × 3 Sprachen ≈ 100 KB JSON. Zur Laufzeit gibt es keine Übersetzungs-API.
- **Erkennung:** türkische Suffix-Abtrennung (`elmalar`, `elmayı` → `elma`), Toleranz „hoch“ für Kinderstimmen, automatische Sprachwahl. Kein Treffer bedeutet keine Karte, also nie eine falsche.
- **Aussprache:** `speechSynthesis` nutzt die Stimmen des Betriebssystems, kostenlos und je nach Gerät offline [Quelle 29]. Fallbacks: eingesprochene Audios für den Kernwortschatz, dann Piper-TTS als WebAssembly im Worker [Quelle 44].
- **Klassenzimmer-Preset:** Kinderbuch-Theme, große Schrift, nur Wörter der gewählten Liste; das Handy dient der Lehrkraft als Fernbedienung.
- **Datenschutz:** Die Browser-Spracherkennung in Chrome arbeitet standardmäßig über Server. Das Schulprofil erzwingt deshalb die Erkennung auf dem Gerät (`processLocally`, Chrome 139+) [Quelle 28] oder Offline-Whisper. Die App läuft offline und ohne Konten.

### 5.3 Warum es so wenig Rechenleistung braucht

Wort → Bild ist ein Tabellen-Lookup in Mikrosekunden. Die Aussprache liefert das Betriebssystem, die Bilder sind Emoji oder SVG (Kilobyte), sichtbar ist immer nur eine Karte. Ein Schul-Tablet oder Chromebook reicht, Serverkosten pro Schüler:in fallen nicht an. Der eigentliche Aufwand ist Inhaltsarbeit: Bilder, geprüfte Übersetzungen, Audios.

### 5.4 Machbarkeit, Markt, Erlöse

- **Machbarkeit:** Prototyp vorhanden (`prototypes/sprachlernen.html`). MVP mit 300 Wörtern DE↔TR↔EN, Lesehilfe und Arbeitsblatt in 4–6 Wochen; schulfähig (Offline-Profil, Dokumentation, Pilot) in 3–6 Monaten.
- **Endkunden:** Duolingo hatte in Q2 2026 58,7 Mio tägliche Nutzer und 12,7 Mio zahlende Abonnenten [Quelle 32]. Sprachlern-Apps setzten 2025 1,54 Mrd USD In-App um, +18,8 % [Quelle 33]; der Gesamtmarkt Sprachenlernen inklusive Präsenzunterricht lag 2025 bei ≈ 84 Mrd USD [Quelle 34]. Lingokids sammelte 2025 120 Mio USD ein [Quelle 35].
- **Integration und Schule:** 2025 begannen 307.000 Menschen einen Integrationskurs, in 17.204 Kursen mit 18.920 Lehrkräften [Quelle 36]. 20,4 % der Schüler:innen unter 16 sprechen zu Hause vorwiegend eine andere Sprache als Deutsch [Quelle 37]. 2,65 Mio Menschen in Deutschland haben eine Einwanderungsgeschichte aus der Türkei [Quelle 38]. 25 % der Viertklässler:innen liegen unter dem Lese-Mindeststandard [Quelle 39]. Der DigitalPakt 2.0 stellt 5 Mrd € über fünf Jahre bereit [Quelle 40].
- **Preis-Anker und kostenlose Konkurrenz:** ANTON-Schullizenz 250–700 € pro Schule und Jahr [Quelle 41]; Microsoft Reading Coach [Quelle 42] und Google Read Along [Quelle 43] sind kostenlos, aber einsprachig und nicht auf Stream, Vorlesen und Türkisch ausgelegt.
- **Erlöse (Schätzung):** Free mit 200 Grundwörtern; Pro (9,99 €) mit allen Listen und WortBild im Stream; **WortBild Familie** 4,99 €/Monat; Vokabel-Packs 4,99 € (DaZ-Grundwortschatz, Türkisch als Herkunftssprache, Englisch Grundschule, später Ukrainisch und Arabisch); Schullizenz 300–800 € pro Schule und Jahr; Kurslizenz 49 € pro Lehrkraft und Jahr; Verlags-Edition zweisprachiger Bücher.
- **Ehrlich:** Der Integrationsbereich ist in Euro klein (selbst bei voller Abdeckung 18.920 × 49 € ≈ 0,9 Mio €/Jahr, Schätzung). Er bringt Glaubwürdigkeit und Zugang zu Förderung; das Volumen liegt bei Familien, Verlagen und Plattformen.

### 5.5 Risiken

| Risiko | Antwort |
|---|---|
| Systemstimmen fehlen oder klingen schwach (z. B. Türkisch auf älteren Geräten) | Selbsttest, eingesprochene Audios, Piper als Fallback |
| Kinderstimmen und Dialekte werden schlechter erkannt | Toleranz „hoch“, mehrere Versuche, keine Noten |
| Wirkung übertreiben | „unterstützt Vokabellernen“ statt Versprechen; Prüfung durch einen Edtech-Beirat |
| Homonyme und abstrakte Wörter | Themenlisten statt Gesamtwörterbuch, SVG statt Emoji |
| Lange Beschaffungszyklen im öffentlichen Sektor | Familien und Verlage tragen das erste Jahr |

---

## 6. Linie C – LiveFX Räume: Bühne, Klassenzimmer, Hörbuch, AR/VR, Brille

### 6.1 Nutzererlebnis

- **Bühne und Events:** Die Moderatorin sagt „Applaus!“, auf der LED-Wand explodiert Konfetti. Bei „und jetzt: die Gewinnerin“ fährt eine Bauchbinde ein. Die Regie hält nur ein Handy.
- **Klassenzimmer:** Am Beamer läuft der Erzählfilm, auf den Tablets erscheinen WortBild-Kacheln.
- **Hörbuch und Podcast mit Bildern:** Das Hörbuch läuft, das Handy-Display zeigt ruhige Szenen zum Gesagten. Kippt man das Handy, verschieben sich die Ebenen wie ein Fenster in die Geschichte.
- **AR am Handy:** Die Mutter liest vor, das Kind hält das Handy über das Buch, und der Drache steht auf dem Küchentisch.
- **VR und Brille:** In VR wird der Szenenhimmel zur Kuppel über den Zuschauer:innen. In der Display-Brille schwebt neben der Tasse die Karte „çay · Tee“.

### 6.2 So funktioniert es: ein Zustand, viele Bildschirme

| Ziel | Gerät | Technik | Reife |
|---|---|---|---|
| `stage` | LED-Wand, Beamer | Vollbild ohne Safe-Zones, Handy als Regie, `/api/fire` für VJ-Software und Lichtpulte | heute nutzbar |
| `classroom` | Beamer + Tablets | Erzählfilm und WortBild, Tablets mit Live-Transkript | 1–2 Wochen |
| `companion` | Handy, Tablet | spielt eine fertige Zeitleiste synchron zum Audio-Player, **ganz ohne Spracherkennung**; Neigung steuert die Parallax-Ebenen | 4–8 Wochen |
| `ar-light` | alle Handys, auch iPhone | Rückkamera + Effekt-Canvas darüber, Aufnahme als Clip | 4–8 Wochen |
| `xr` | Android/Chrome, Quest, visionOS | WebXR `immersive-ar` mit DOM-Overlay [Quelle 47, 48], in VR eine Canvas-Textur auf einer gebogenen Fläche | Monate, Schaufenster |
| `glasses` | Meta Ray-Ban Display | Web-App (HTML/CSS/JS, Developer Preview seit Mai 2026) [Quelle 46], Erkennung auf dem Handy | Monate, Schaufenster |

### 6.3 Warum es so wenig Rechenleistung braucht

Es gibt kein neues Modell und kein Cloud-Rendering, nur neue Ausgabeziele für dasselbe JSON. Der Companion-Modus rechnet nur Uhrzeit → Zustand → Zeichnen und erzeugt weniger Last als ein YouTube-Video. In XR genügt *eine* Canvas-Textur, die Brille zeigt ohnehin nur Karte, Icon und Wort. Auf der Bühne ersetzt ein Laptop mit Browser einen Media-Server.

### 6.4 Markt, Erlöse, Risiken

- **Markt:** IDC erwartet 2026 13,6 Mio Smart Glasses und 5,1 Mrd USD Umsatz [Quelle 45]; Display-Brillen sind darin noch eine kleine Teilmenge, der Massenmarkt bleibt das Handy. Preis-Anker Bühne: VJ-Software Resolume Avenue 299 €, Arena 799 € [Quelle 49]. Kinder-Audio zahlt: tonies setzte 2025 630 Mio € um, +31 % [Quelle 50]. Für Bühne, Events und Klassenzimmer gibt es keine belastbare Gesamtzahl.
- **Erlöse (Schätzung):** Event- und Bühnenlizenz 19–49 € pro Tag oder 299 €/Jahr (Bildung −50 %); Verlagslizenz „Hörbuch mit Bildern“ pro Titel oder als Umsatzanteil; Schullizenz gebündelt mit B; AR-light gratis als Reichweitenmotor; XR und Brille als Freemium-Showcase, Umsatz mit 0 € angesetzt.
- **Risiken:** kleine Hardware-Basis und SDKs im Preview-Stadium (iOS-Safari ohne WebXR); Spracherkennung auf der Bühne durch Beschallung gestört (Nahmikro, Szenen-Pad als Rückfallebene); Privatsphäre bei mithörenden Brillen, Altersgrenzen und Motion Sickness bei VR (für Kinder nur Handy und Beamer); betreuungsintensive Events (nur Lizenz und Anleitung).

**Einordnung:** WebXR und Brille sind 2027–2028 ein **Schaufenster, keine Umsatzlinie**.

---

## 7. Linie D – LiveFX Studio: Live-Schnitt und Auto-Edit

### 7.1 Nutzererlebnis: zwei Türen in dasselbe Werkzeug

- **Live → Highlights:** Nach dem Stream schlägt LiveFX 3–5 Kurzclips vor, an den Stellen, an denen Memes, Geschenke und Chat am dichtesten waren. Format 9:16, dieselben Effekte, fertig zum Posten.
- **Datei rein:** Eine 20-Minuten-MP4 wird ins Fenster gezogen (alter Stream, Podcast, Vorlese-Video). LiveFX meldet „Höre zu … (lokal)“, dann steht die Zeitleiste: Transkript, Trigger, Szenen, laute Stellen, Pausen und Füllwörter. Die Creatorin wählt einen Look und „Nur Highlights, 60 s, 9:16“ oder „Ganzes Video mit Effekten“. Jeder Vorschlag ist ein Chip, der sich verschieben, tauschen oder löschen lässt. Die Vorschau zeichnet die Effekte live, ohne Rendern. Dann folgt der Export. **Die Datei verlässt den Rechner nie.**

### 7.2 So funktioniert es

| Schritt | Technik |
|---|---|
| Signale sammeln (Live) | Zeitleisten-Log im Server aus vorhandenen Quellen: Trigger, Transkript, Chat, Geschenke; Highlight-Score über gleitende 30-s-Fenster |
| Transkript (Datei) | WebAudio dekodiert die Tonspur, Whisper im Browser transkribiert mit Wort-Zeitstempeln (WebGPU/WASM) [Quelle 60] |
| Analyse | Matcher und Scene-Director lesen den ganzen Satz voraus; Pegel- und Pausenerkennung liefert Schnitte und Zoom-Punches |
| Bearbeiten | Zeitleiste (LTF) mit `cut`, `zoom`, `caption`, `fire`, `state` als Chips |
| Vorschau | `<video>` + Effekt-Canvas, synchron über `requestVideoFrameCallback` |
| Export | WebCodecs mit Hardware-Encoder, Mediabunny verpackt als MP4/WebM [Quelle 57, 58, 59]; Fallback MediaRecorder; Untertitel Wort für Wort; Hochkant per Zuschnitt |

### 7.3 Warum es so wenig Rechenleistung braucht

Kein Upload, kein Cloud-Transcoding. Das Whisper-Modell (≈ 40–150 MB) wird einmal geladen. Der „Schnitt“ ist eine JSON-Datei von wenigen Kilobyte, die Vorschau zeichnet denselben Canvas wie live, und erst der Export rechnet, einmal und per Hardware-Encoder. Die Grenzkosten pro Video liegen bei null, Minutenkontingente entfallen.

### 7.4 Machbarkeit, Markt, Erlöse, Risiken

- **Machbarkeit:** Highlights mit MediaRecorder-Export 4–6 Wochen; Datei-Import mit Auto-Effekten 3–4 Monate; robuster MP4-Export für alle Browser 6–9 Monate. WebCodecs gibt es in Chrome und Edge ab 94, Firefox ab 130 (Desktop), mit Audio in Safari ab 26 [Quelle 57, 58].
- **Markt:** Videoschnitt-Software 2,52 Mrd USD 2025 → 2,68 Mrd USD 2026 [Quelle 51]; KI-Videogenerierung und -schnitt 3,67 Mrd USD 2026 [Quelle 23]. CapCut: 736 Mio mobile MAU und über 1 Mrd USD In-App-Umsatz 2025 [Quelle 52]. OpusClip: über 10 Mio Nutzer, ARR geschätzt 10–20 Mio USD [Quelle 53]. Preis-Anker: OpusClip 15–29 USD, Submagic 19–69 USD [Quelle 54], Descript 16–65 USD pro Monat [Quelle 55]. Käufer-Signal: Canva kaufte im Februar 2026 Cavalry und MangoAI [Quelle 56].
- **Erlöse (Schätzung):** Free mit 3 Highlight-Clips pro Stream und Wasserzeichen (Conversion-Hebel); Pro ohne Wasserzeichen mit Live-Editor; **Pro+ „Studio & Szenen“ 14,99 €/Monat** mit Datei-Import, Auto-Edit, MP4-Export, ohne Minutenlimit; Stil-Packs 2,99–4,99 €; Agentur-Lizenz mit Batch; White-Label/SDK für Editor- und Streaming-Anbieter.
- **Risiken:** starker, teils kostenloser Wettbewerb (nicht als Universal-Editor antreten, sondern über Sprache → Effekt, Story-Szenen, TR/DE und lokale Verarbeitung); Browser-Grenzen bei langen oder 4K-Videos (Längenlimit, Desktop zuerst); Urheberrecht beim Export (nur eigene Sounds, GIFs mit Lizenz); Whisper bei Türkisch und Dialekt schwächer (größere Modelle, Korrektur im Transkript); niedrige Zahlungsquote (Studio als Aufpreis zu Pro, nicht als eigenes Produkt).

---

## 8. Markt im Überblick

| Segment | Größe | Quelle | Bezug |
|---|---|---|---|
| Live-Streaming weltweit (Kern) | 97–157 Mrd USD 2026 | [Quelle 1, 2] | heute |
| KI-Videogenerierung und -schnitt | 3,67 Mrd USD 2026 → 24,89 Mrd USD 2036 | [Quelle 23] | A, D |
| Videoschnitt-Software | 2,52 → 2,68 Mrd USD (2025 → 2026) | [Quelle 51] | D |
| Sprachlern-Apps (In-App) | 1,54 Mrd USD 2025, +18,8 % | [Quelle 33] | B |
| Sprachenlernen gesamt | ≈ 84 Mrd USD 2025 | [Quelle 34] | B |
| Hörbuch Deutschland | 374 Mio € 2025, +13 % | [Quelle 19] | A, C |
| Smart Glasses | 13,6 Mio Geräte / 5,1 Mrd USD 2026 | [Quelle 45] | C |
| Kinder-Audio (tonies) | 630 Mio € 2025, +31 % | [Quelle 50] | C |
| Integrationskurse Deutschland | 307.000 neue Teilnehmende, 18.920 Lehrkräfte (2025) | [Quelle 36] | B |
| DigitalPakt 2.0 | 5 Mrd € über fünf Jahre | [Quelle 40] | B, C |

**Killer-Argument für Plattformen.** Plattformen wandeln Sprache heute in Untertitel um: in Echtzeit, kostenlos, auf Milliarden Geräten. LiveFX wandelt Sprache in **Bilder, Szenen, Lernkarten und Schnitte** um, mit derselben Rechenlast. So kann eine Plattform jedem Live-Creator einen „produzierten“ Stream geben, ohne zusätzlichen GPU-Server. Allein in Südostasien, im Kaukasus und in Zentralasien gingen 2025 über 100 Mio Creator auf TikTok live [Quelle 2]. Jede Minute Verweildauer zahlt auf Geschenke ein, die rund die Hälfte des Streamer-Einkommens ausmachen; die Plattform behält etwa 50 % [Quelle 5, 8]. Jeder Stream hinterlässt außerdem eine Zeitleiste, aus der Shorts von selbst entstehen: Live wird zur Quelle für Kurzvideo statt zur Konkurrenz.

---

## 9. Geschäftsmodell und Preisarchitektur

Alle Preise sind **Schätzungen** und von der Gründerin zu prüfen.

| Stufe | Preis | Inhalt |
|---|---|---|
| **Free** | 0 € | Erzählfilm mit einer Welt, WortBild mit 200 Wörtern, 3 Highlights pro Stream mit Wasserzeichen |
| **Pro** | 9,99 €/Monat | alle Grundwelten, Band und Split, alle WortBild-Listen, Highlights ohne Wasserzeichen, Live-Editor |
| **Pro+ „Studio & Szenen“** | 14,99 €/Monat | KI-Szenen, Auto-Edit aus Datei, MP4-Export, Batch, Hörbuch-Visualizer |
| **WortBild Familie** | 4,99 €/Monat | Sprachenlernen und Lesehilfe ohne Streaming-Funktionen |
| **Packs** | 2,99–4,99 € | Welten-, Vokabel- und Stil-Packs, später Marktplatz mit 70/30-Aufteilung |
| **Schullizenz** | 300–800 €/Jahr | WortBild + Erzählfilm, Offline-Profil |
| **Kurslizenz** | 49 € pro Lehrkraft und Jahr | Integrations- und DaZ-Kurse |
| **Event-/Bühnenlizenz** | 19–49 €/Tag oder 299 €/Jahr | Bühnenmodus, Event-Packs |
| **Verlagslizenz** | [2.000 €] pro Titel und Jahr (Schätzung, von der Gründerin zu prüfen) | Hörbuch mit Bildern, zweisprachige Bücher |
| **Scene-SDK / Plattform** | nach Vereinbarung | LTF, Renderer, Packs als Lizenz oder White-Label |

**Zusatzumsatz durch die Vision, Basis-Szenario (Schätzung, T€):** ≈ 27 (2027), ≈ 192 (2028), ≈ 617 (2029); nach Zusatzkosten ein Deckungsbeitrag von ≈ −3, +77 und +407 T€. Die Herleitung steht im Businessplan, Kapitel „Zukunft“. SDK- und Plattform-Erlöse sind dort nicht doppelt gezählt; XR und Brille stehen mit 0 € in der Rechnung.

---

## 10. Roadmap 2027–2029

Die Reihenfolge folgt der Nähe zum Umsatz: **D-Highlights und B zuerst, A als Kern, C über die Bühne, XR später.**

| Quartal | Produkt | Markt / Vertrieb | Messgröße |
|---|---|---|---|
| Q4 2026 (Vorlauf) | Prototypen `sprachlernen.html` und `live-story.html`, LTF v1, Vision-Trailer DE/TR/EN | Pitch-Folien 12–15, LinkedIn-Post „Vision“ | Prototypen laufen offline mit 60 fps |
| Q1 2027 | D1 Zeitleisten-Log und Highlights · B1 WortBild mit 300 Wörtern, Lesehilfe | Pro-Abo live, 20 Beta-Creator TR/DE | Anteil der Streams mit geteiltem Highlight |
| Q2 2027 | A1 Scene-Director, Figuren, Kamera, Band/Split (DE) · C1 Bühnen- und Klassenzimmer-Preset | Event-Lizenz, WortBild-Pilot in [Zahl] Kursen/Klassen | Watchtime mit und ohne Erzählfilm |
| Q3 2027 | A2 TR/EN, KI-Delta, 3 Welten-Packs · D2 Datei-Import und Auto-Effekte | **Pro+ live**, Verlags-Pilot (eigene Reihe), SDK-Prototyp | Upgrade-Quote Pro → Pro+ |
| Q4 2027 | D3 Timeline-Editor und MP4-Export · C2 Companion und AR-light · B2 Nachsprechen | Schullizenz, Listung bei Medienzentren | [Zahl] zahlende Schulen |
| Q1 2028 | C3 WebXR-Prototyp · B3 Ukrainisch/Arabisch als Community-Packs | Familien-Abo WortBild | Familien-Abos, Pack-Käufe |
| Q2 2028 | Brillen-Web-App-Prototyp · D4 Batch und Agentur-CLI | Plattform-Pitch „Live → Clip“ | Gespräche mit Folgetermin |
| Q3 2028 | Welten-Pack-Editor für Verlage, Marktplatz für Welten- und Vokabel-Packs | Bildungsträger-Pilot in der Breite | Packs von Dritten, Verlagstitel |
| Q4 2028 | **Scene-SDK v1**, KI-Delta Standard in Pro+ | Auswertung WortBild-Pilot (vorher/nachher) | ein SDK-Pilotpartner |
| Q1 2029 | Erzählfilm 2.0 (Figuren interagieren, optional WebGPU-Tiefe) | Verlagsprogramm mit 10+ Titeln | Lizenzumsatz Verlage |
| Q2 2029 | Entscheidung über native Apps bzw. Brillen-Partnerschaft | Partnergespräche XR/Brille | Hardware-Basis, Nachfrage |
| Q3 2029 | weitere Sprachen über die Community, Bildungs-Edition als Bündel | Internationalisierung Edtech | aktive Schulen und Kurse |
| Q4 2029 | Plattform-Integration Scene-SDK oder „Live → Clip“ | Plattform-Pilot bzw. Exit-Gespräch | unterzeichneter Pilot |

---

## 11. Prototypen und Vision-Trailer

**Prototypen** (je eine HTML-Datei, Vanilla JS, ohne externe Anfragen, offline lauffähig, Hell/Dunkel, reduzierte Bewegung wird beachtet):

- `prototypes/sprachlernen.html` – WortBild: Auswahl „Ich spreche“ / „Zeige“, Modi Übersetzen, Lesehilfe und Nachsprechen, Mikro oder Texteingabe, eine große Karte mit Bild, Wort, Artikelfarbe, Silben, Beispielsatz und Aussprache, Verlauf aus sechs Kacheln, Karteikarten drucken. Mindestens 60 Konzepte in 10 Kategorien, DE/TR/EN, mit türkischer Suffix-Abtrennung. Testsätze: „Der Apfel ist rot“ (DE→TR) → 🍎 elma; „kediler uyuyor“ (TR→DE) → 🐈 die Katze.
- `prototypes/live-story.html` – Erzählfilm: Texteingabe oder Mikro, „Geschichte abspielen“, 16:9 oder 9:16-Band, Seed-Feld, Zeitleiste als JSON exportieren und importieren, Aufnahme als WebM, Anzeige von Bildrate, Skriptzeit pro Frame und „Cloud-Kosten: 0,00 €“. Testgeschichte DE: „Es war einmal ein kleines Dorf. Es war Nacht. Ein Mädchen ging in den Wald. Es begann zu regnen. Plötzlich stand da ein Drache. Er flog los. Der Regen hörte auf. Am Morgen schlief das Mädchen. Ende.“ TR: „Bir varmış bir yokmuş. Gece ormanda küçük bir ejderha vardı. Yağmur yağıyordu. Ejderha uçtu.“

Hinweis in beiden Prototypen: Die Spracherkennung im Browser läuft je nach Browser über Server; der Offline-Modus der Vollversion arbeitet lokal.

**Vision-Trailer (35 s, 9:16 und 16:9, je DE/TR/EN):** `video/LiveFX_Vision_<de|tr|en>_<16x9|9x16>.mp4`, gerendert aus HTML/JS wie der bestehende Trailer.

| Zeit | Linie | Inhalt | Text (DE) |
|---|---|---|---|
| 0–3 s | Hook | pinke Stimm-Wellenform | „Du redest.“ → „Es wird Bild.“ |
| 3–11 s | A · Grün | Erzählung tippt mit, darunter entsteht die Welt: Nacht, Wald, Mädchen, Regen, Drache | „Live aus Worten. Kein Schnitt. Kein Rechenzentrum.“ |
| 11–18 s | B · Gold | „Apfel“ → 🍎 der Apfel → elma → apple, Aussprache; „kedi“ → 🐈 die Katze | „Jedes Wort ein Bild. Jede Sprache eine Stimme.“ |
| 18–25 s | C · Hellblau | Bühne mit Konfetti, Drache auf dem Tisch (AR), Brille mit „☔ yağmur · Regen“ | „Bühne · Klassenzimmer · Hörbuch · Brille“ |
| 25–32 s | D · Pink | Datei fliegt ins Fenster, Zeitleiste füllt sich, drei 9:16-Clips springen heraus | „Video rein. Fertig geschnitten raus. Kein Upload.“ |
| 32–35 s | CTA | vier Farbkacheln, Logo | „LiveFX – Deine Stimme wird zum Bild.“ |

Keine Plattform-Logos, keine echten Namen oder Gesichter; Zukunftsfunktionen tragen das Badge „Vision“.

---

## 12. Was wir suchen

- **Pilot-Partner Plattform:** Live-Teams von Streaming- und Kurzvideo-Plattformen für „Live → Clip“ oder das Scene-SDK.
- **Pilot-Partner Bildung:** [Zahl] DaZ- und Integrationskurse, [Zahl] Grundschulklassen, Medienzentren, Bildungsträger.
- **Pilot-Partner Verlage und Hörbuch:** Kinderbuch- und Hörbuchverlage für „Hörbuch mit Bildern“ und zweisprachige Editionen; erster Fall ist die eigene Kinderbuchreihe der Gründerin.
- **Team:** Web-/Grafik-Entwicklung (Canvas, WebCodecs), Illustration im Kinderbuch-Stil, Sprecher:innen DE/TR/EN, Didaktik (Beirat).
- **Förderung:** EXIST, Bildungs- und Integrationsstiftungen (ohne Umsatzannahme in der Planung).

Kontakt: [Name] · [E-Mail] · [Website]
