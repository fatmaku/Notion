# LiveFX – Pitch-Deck (19 Folien, Stand 2.1 + Vision 2027–2029)

> Text-, Struktur- und Notizen-Vorlage. Die PowerPoint-Fassung `LiveFX_Pitch.pptx` (16:9, dunkles Theme,
> Screenshots aus `landing-assets/`) folgt genau diesem Aufbau; die *Sprechernotizen* sind dort hinterlegt.
> **Auch auf Türkisch/Englisch: `LiveFX_Pitch_TR.pptx`, `LiveFX_Pitch_EN.pptx`** (entstehen in der Übersetzungsrunde aus
> `tools/deck-content.tr.json` bzw. `tools/deck-content.en.json`; bis dahin gibt es nur die deutsche Fassung).
> Alle drei Fassungen entstehen aus demselben Generator – Texte stehen ausschließlich in der JSON-Datei:
> `node tools/build-pptx.js tools/deck-content.de.json LiveFX_Pitch.pptx` (TR: `deck-content.tr.json` →
> `LiveFX_Pitch_TR.pptx`, EN: `deck-content.en.json` → `LiveFX_Pitch_EN.pptx`; im Ordner `business/` ausführen).
> Folien 12–15 sind **Vision** (Badge „Vision“ auf der Folie); verbindliche Grundlage ist die Vision-Spezifikation
> (Erzählfilm, WortBild, Räume, Studio). Quellen ab [Quelle 19] stehen in `QUELLEN.md`.
> Stand: Oktober 2026 · Vertraulich (Fußzeile jeder Folie: „Vertraulich · Oktober 2026“).
> Platzhalter in eckigen Klammern (`[Zahl]`, `[E-Mail]`) bewusst nicht ausgefüllt – keine erfundenen Zahlen.
> Marktzahlen: Quellen in `QUELLEN.md` [Quelle n]; Schätzungen sind als solche markiert.

> Finanzzahlen (Folien 17–19) stammen aus dem Finanzmodell `LiveFX_Finanzmodell.xlsx` (Kennzahlen in `tools/finance-250k.json`).
> Stand Oktober 2026: Ask 250.000 €.
---

## Folie 1 – Titel

**LiveFX**
*Deine Stimme wird zum Effekt.*
Memes, Sounds und Szenen in Echtzeit – ausgelöst durch das, was der Creator sagt.
*Und morgen: Du redest. Es wird Bild.*
Tuncay Sancak · Gründer & Erfinder, Geschäftsführer · Investor Relations: Gönül Demet · [E-Mail] · Oktober 2026 · Vertraulich

> **Notizen:** Kurz vorstellen: Ich streame selbst, ich schreibe Bücher, und ich habe LiveFX gebaut, weil ich im
> Live-Stream genau das vermisst habe, was jedes Kurzvideo hat. Was ihr heute seht, läuft in meinen eigenen
> Streams. Am Ende zeige ich, wohin es geht: vom Meme-Overlay zur Bildsprache für alles Gesprochene.
> 30 Sekunden, dann direkt zum Problem.

## Folie 2 – Das Problem: Live ist roh

- Kurzvideos leben von Memes, Sounds, Zooms, Stickern – alles entsteht **nach** der Aufnahme im Schnitt.
- Live gibt es davon nichts. Der Creator ist Moderator, Regisseur und Cutter **gleichzeitig** – mit zwei Händen.
- Bestehende Tools reagieren auf **Zuschauer** (Alerts bei Spenden/Follows) oder auf **Tastendruck** (Soundboards).
- **Niemand reagiert auf das gesprochene Wort.** Der Schnitt kommt immer zu spät.

> **Notizen:** Auto-Untertitel haben bewiesen, dass Echtzeit-Text aus Sprache funktioniert und von Plattformen nativ
> eingebaut wird. Echtzeit-*Effekte* aus Sprache gibt es nicht. Genau diese Lücke füllen wir. Beispiel aus meinem
> Stream: Ich sage „krass“ – und nichts passiert, außer dass ich selbst zur Tastatur greife.

## Folie 3 – Die Lösung: Stimme → Effekt in unter einer Sekunde

LiveFX hört zu und reagiert, während du redest:
- „Krass“ → 🤯 Neon-Text + Airhorn
- „Yok artık“ → Meme-Karte + Vine-Boom
- „Es regnete…“ → Regen-Szene mit Atmosphäre-Loop (Story-Modus)

Mikro → Spracherkennung (DE/TR/EN, automatisch) → Matcher mit Dialekt-Toleranz → Overlay in OBS → Stream.
**< 1 s. Hands-free. Läuft lokal.** TikTok LIVE, Instagram Live, YouTube, Twitch – überall, wo OBS/Streamlabs streamt.

> **Notizen:** Wichtig: Keyword-Matching ist sofort (Zwischenergebnisse der Erkennung), keine Cloud nötig. Der
> optionale KI-Modus fängt Sätze ohne Stichwort („das war so peinlich für ihn“ → Awkward). Alles läuft auf dem
> Rechner der Creatorin – Datenschutz ist eingebaut, nicht nachgerüstet.

## Folie 4 – Demo

Screenshots (bzw. 30-s-Trailer `video/LiveFX_Trailer_16x9.mp4`):
1. Overlay 16:9 – Neon-Text „KRASS!“ + Konfetti (`landing-assets/overlay-neon.jpg`)
2. Overlay 9:16 – Regen-Szene mit Bildunterschrift „Es regnete in Strömen…“ (`overlay-portrait-rain.jpg`)
3. Control Panel (`panel.jpg`) · Handy-Fernbedienung (`mobile.jpg`) · Demo-Seite ohne OBS (`demo.jpg`)

> **Notizen:** Wenn möglich live zeigen: Mikro starten, „das ist ja krass“ sagen, Effekt erscheint. Zweiter Take:
> Story-Modus an, einen Absatz vorlesen – „es regnete“, „in der Nacht“, „der Drache“ – und die Szenen wechseln.
> Fallback ist der Trailer. Satz, der hängen bleibt: Das erste Video, in dem Memes auf meine Sprache reagierten,
> hat mich mehr überzeugt als jede Folie.

## Folie 5 – Produkt heute (Version 2.1)

- **Erkennung**: Browser-ASR (Chrome/Edge), automatische Sprache DE/TR/EN, Dialekt-Toleranz, Lernfunktion,
  Selbsttest & Diagnose; extern via Whisper/Deepgram über die API; Offline-Whisper (experimentell)
- **Effekte & Leistung**: Canvas-Partikel mit Physik (60 fps), Neon/Glitch/Sticker-Text, Bauchbinden, Kombis,
  4 Themes; **Leistungsmodus** (auto/eco/high): Bildzeit im Mittel −63 bis −69 %
- **Story-Modus**: 13 Vollbild-Szenen + 12 Atmosphäre-Loops, Geschichten-Pakete DE/TR/EN
- **Pakete**: Türkçe 85 · Deutsch 49 · English 50 · Familie & Kinder 27 · Gaming 27 Trigger, dazu **Text-Sticker-Pakete** TR/DE/EN
- **Sticker & GIFs**: **143 kostenlose Sticker** (Microsoft Fluent Emoji, MIT-Lizenz, 119 animiert); **sichere GIF-Suche**
  über KLIPY/GIPHY mit Jugendschutz-Filter – GIFs werden verlinkt, nicht gespeichert
- **Sound**: 38 synthetische Sounds (keine Lizenzkosten), Mixer mit Limiter, Ducking, Stereo, Hall
- **Handy-Fernbedienung** (PWA), OBS/Streamlabs, TikTok LIVE Studio, Instagram Live Producer, Demo-Aufnahme ohne OBS
- **Zuschauer & offene API**: Twitch-Chat, YouTube-Chat, Geschenke-Webhook (TikTok via TikFinity/Streamer.bot),
  HTTP-API mit Token (Stream Deck, Chat-Bots, externe ASR), 575+ automatisierte Tests

> **Notizen:** Das ist kein Prototyp mehr: Releases von 0.1 bis 2.1, Unit- und End-to-End-Tests, Anleitungen auf
> Deutsch und Türkisch. Version 2.1 hat das Produkt leichter und sicherer gemacht: Leistungsmodus mit im Mittel 63–69 %
> weniger Bildzeit, 143 kostenlose Sticker unter MIT-Lizenz, Text-Sticker-Pakete in drei Sprachen und eine sichere
> GIF-Suche über KLIPY und GIPHY mit Jugendschutz-Filter (Google hat die Tenor-API im Juni 2026 abgeschaltet). Zwei
> Punkte betonen: (1) eigene Sounds, freie Sticker und verlinkte GIFs heißt keine Copyright-Strikes, (2) Zuschauer-Trigger
> sind die Brücke zur Monetarisierung.

## Folie 6 – Warum jetzt

- **Live-Commerce & Gifting**: Geschenke machen rund die Hälfte des Einkommens von Live-Streamern aus;
  Creator mit 20–100 T Followern verdienen 500–3.000 USD/Monat über Gifts [Quelle 5, 6].
- **TikTok LIVE wächst am schnellsten**: > 100 Mio. Creator gingen 2025 allein in Südostasien, im Kaukasus und in
  Zentralasien LIVE, +77 % zum Vorjahr [Quelle 2].
- **Creator Economy ~216–260 Mrd. USD 2026**, Live ≈ 14 % davon [Quelle 3, 4].
- **Technik ist reif**: Streaming-ASR < 300 ms, Offline-Modelle im Browser, WebGPU in allen großen Browsern
  [Quelle 27], Prompt-Caching macht KI-Klassifikation für < 1 USD/Stunde möglich.
- **Plattformen konkurrieren über Creator-Tools** (CapCut ↔ TikTok, Edits ↔ Instagram) – Live-Tools sind der nächste Schritt.

Quellen: siehe `QUELLEN.md` (Recherche vom 30.09.2026 und 03.10.2026).

> **Notizen:** Live ist kein Nebenkanal mehr, sondern ein Umsatzkanal. Und: Die Türkei ist ein junger, meme-affiner
> TikTok-Markt mit kaum lokalisierten Tools – unser größtes Paket ist das türkische, das ist kein Zufall.
> Technik: Was vor drei Jahren einen Server brauchte, läuft heute im Browser – die Grundlage der Vision ab Folie 12.

## Folie 7 – Markt (Spannen; SAM/SOM = eigene Schätzung)

| | Spanne | Grundlage |
|---|---|---|
| **TAM** – Live-Streaming-Markt | 97–157 Mrd. USD (2026) → 250–345 Mrd. USD (2030), CAGR ~27 % | [Quelle 1, 2] |
| **Live-Anteil Creator Economy** | ≈ 30–36 Mrd. USD (14 % von ~216–260 Mrd.) | [Quelle 3, 4] |
| **SAM** – Creator-Tools für Live (Software-Ausgaben) *(Schätzung)* | 1–3 Mrd. USD | abgeleitet aus Streamlabs/StreamYard/Voicemod-Preisen × aktiven Live-Creatorn |
| **SOM** – Jahr 3 *(Schätzung)* | 5.000–15.000 zahlende Pro-Nutzer × 9,99 €/Monat ≈ 0,6–1,8 Mio. € ARR | wie Businessplan Kap. 6 (0,3–0,5 % der SAM-Creator); DACH + Türkei + EN-Nische, Fokus TikTok/IG |

**Angrenzende Märkte der Vision (Folien 12–15, nicht im SOM enthalten):**

| Segment | Größe |
|---|---|
| KI-Videogenerierung und -schnitt 2026 | 3,67 Mrd. USD [Quelle 23] |
| Sprachlern-Apps, In-App-Umsatz 2025 | 1,54 Mrd. USD [Quelle 33] |
| Videoschnitt-Software 2026 | 2,68 Mrd. USD [Quelle 51] |
| Hörbuchmarkt Deutschland 2025 | 374 Mio. €, +13 % [Quelle 19] |

> **Notizen:** Ehrlich sagen: TAM ist Sekundärquelle mit großer Spanne; SAM und SOM sind unsere Schätzung, keine
> Studie. Der Punkt ist nicht die genaue Zahl, sondern: Schon ein kleiner Anteil zahlender Live-Creator trägt ein
> Team – und der eigentliche Hebel ist die Plattform-Integration, nicht das Abo. Unten neu: Die Vision öffnet
> angrenzende Märkte (KI-Video, Sprachlernen, Videoschnitt, Hörbuch) – die rechnen wir bewusst nicht in den SOM ein.
> Der SOM entspricht dem Businessplan; das Basis-Szenario rechnet im Jahr 3 mit Ø 7.500 Pro-Nutzern.

## Folie 8 – Geschäftsmodell

1. **Free** – Kernfunktionen, Standard-Pakete, OBS-Overlay (Verbreitung, Community)
2. **Pro – 9,99 €/Monat** – KI-Modus, alle Szenen & Themes, Handy-Fernbedienung, Cloud-Sync, Priorität-Support
3. **Creator-Packs / Marktplatz** – Meme- & Story-Pakete von Creatorn für Creator, 70/30-Split
4. **B2B-Lizenz & Plattform-Integration** – SDK/White-Label für Streaming-Software, Agenturen, Plattformen

Vergleich: Streamlabs Ultra 27 USD/Monat, StreamYard 35 USD/Monat, Restream 16 USD/Monat, Voicemod Pro 10 USD/Monat
[Quelle 11, 12, 13]. Vision (Schätzung): Pro+ „Studio & Szenen“ 14,99 €, WortBild Familie 4,99 €/Monat,
Schul-, Kurs-, Event- und Verlagslizenzen – Details auf den Folien 13–15.

> **Notizen:** 9,99 € liegt bewusst unter Streamlabs Ultra und auf Voicemod-Niveau – Creator kennen diesen
> Preispunkt. Der Marktplatz macht aus Nutzern Lieferanten: Wer ein türkisches Meme-Paket baut, verkauft es.
> B2B ist der Weg zur Plattform: dieselbe Engine läuft als Browser-Quelle in TikTok LIVE Studio.

## Folie 9 – Traction

- **Im Einsatz in den eigenen Live-Streams des Gründers** seit [Monat/Jahr] – [Zahl] Streams, [Zahl] Stunden
- **Produkt**: aktuelle Version 2.1 (Releases 0.1 → 2.1), 575+ automatisierte Tests, Anleitungen DE/TR, Demo-Clips
- **Inhalte**: 5 Trigger-Pakete (238 Trigger), 3 Story-Pakete, 38 Sounds, 13 Szenen – in 3 Sprachen
- **Community**: [Zahl] Follower · [Zahl] Creator auf der Warteliste · [Zahl] Downloads
- **Nächste 60 Tage**: 10 Creator-Tests TR/DE, Landingpage + Trailer, Community-Launch, erste Pro-Abos

> **Notizen:** Zahlen vor dem Termin eintragen – nur echte. Die Story: Das Produkt ist in echten Streams gereift
> (Echo-Problem, Dialekte, Hochkant-Safe-Zones kamen alle aus der Praxis). Jetzt geht es um die ersten 10 externen
> Creator und um messbare Watchtime-Effekte.

## Folie 10 – Wettbewerb (2×2)

Achsen: **Auslöser** (Zuschauer-gesteuert ↔ Sprach-gesteuert) × **Bedienung** (manuell ↔ automatisch)

| | manuell | automatisch |
|---|---|---|
| **Zuschauer-gesteuert** | Native Plattform-Effekte, Sticker-Gifting | Streamlabs / StreamElements Alerts |
| **Sprach-gesteuert** | Voicemod, Soundboards, Stream Deck (Hotkey) | **LiveFX** (einziger Anbieter) |

Zusätzlich: Türkçe-Pakete ✓, Story-Szenen ✓, offene API ✓, läuft lokal ✓ – bei keinem Wettbewerber vorhanden.

> **Notizen:** Der rechte untere Quadrant ist leer – noch. Wer ihn besetzen könnte, sind die Plattformen selbst;
> deshalb reden wir mit ihnen. Streamlabs & Co. sind keine Gegner, sondern Hosts: LiveFX läuft als Browser-Quelle in
> jedem von ihnen.

## Folie 11 – Roadmap: schlank bis Gate 2, dann die Seed-Runde

- **Q1 2027 (Monat 1–3)** – Pro-Abo live; Pre-Seed abgeschlossen; Mobile-/Web-Entwickler:in an Bord (Monat 3); TR-Launch – Gate G0
- **Q2 2027 (Monat 4–6)** – Mobile-App/PWA; WortBild mit 300 Wörtern und Lesehilfe; 20 Beta-Creator TR/DE – Gate G1
- **Q3–Q4 2027 (Monat 7–12)** – DE/EN-Launch, Marktplätze, Agentur-Lizenz, Plattform- oder Bildungspilot – Gate G2a
- **H1 2028 (Monat 13–18)** – WortBild-Pilot ausgewertet; Seed-Runde von etwa 350 T€ nach Gate 2; ab Monat 19
  Story-Engine (Erzählfilm), Studio (Auto-Edit), Räume (VR/AR) und Ausbau-Team

*Schlank bis Monat 18: eine Entwickler:in, Pro-Abo, Mobile-App/PWA, WortBild. Story-Engine, Auto-Edit und VR/AR
werden aus der Folgerunde finanziert.*

> **Notizen:** Sortiert nach Geld und Beweis: Die 250 T€ tragen uns 18 Monate mit einer Entwickler:in. Zuerst Pro-Abo
> und Mobile-App/PWA, parallel WortBild als erste Vision-Linie, dann DE/EN und ein Plattform- oder Bildungspilot. Jeder
> Schritt hat ein Gate (Folie 18). In Monat 18 holen wir die Seed-Runde von etwa 350 T€ – erst dann starten
> Story-Engine, Auto-Edit und VR/AR. Die Szenen werden prozedural gezeichnet, nicht von einer Video-KI generiert – das
> ist die Brücke zu den Folien 12–15.

## Folie 12 – Die Vision: Live-Video aus Worten *(Badge „Vision“)*

**„Du redest. Es wird Bild.“**

Schaubild (aus Formen): **Stimme → Verstehen → Szene → Video**
- 🎙 *Stimme* – Mikro, Vorlesen oder eine fertige Videodatei
- 🧠 *Verstehen* – Lexikon DE/TR/EN, Dialekt-tolerant, KI optional
- 🎬 *Szene* – Weltzustand ≤ 1 KB, eine gemeinsame Zeitleiste
- 📺 *Video* – im Browser gezeichnet, 60 fps, auf dem eigenen Gerät

Vier Linien (Linienfarben): 🌳 **Erzählfilm** (Grün) · 🍎 **WortBild** (Gold) · 🥽 **Räume** (Hellblau) · ✂ **Studio** (Pink)

- **Heute:** Aus Stimme wird in unter einer Sekunde Meme, Sound oder Szene – in den eigenen Streams des Gründers im Einsatz.
- **Morgen:** Aus Stimme wird ein Film, ein Wortbild mit Aussprache oder ein fertiger Clip – im Stream, in der Schule,
  auf der Bühne, in der Brille.
- *Zeichnen statt generieren – mit dem Rechenbudget eines Untertitels, nicht eines Rechenzentrums.*

> **Notizen:** Live-Untertitel haben gezeigt, dass Plattformen Sprache in Echtzeit verarbeiten wollen – kostenlos und
> auf Milliarden Geräten. Wir sind die nächste Stufe: Bild statt Text. Eine Engine, eine Zeitleiste, vier Linien.
> Ein Satz wird zu einem Zustands-Delta von wenigen hundert Byte, gezeichnet in einem Canvas – kein
> Video-Diffusionsmodell, kein GPU-Server. Ehrlich: Das ist Vision 2027–2029, deshalb das Badge. Grundlage ist der Code,
> der heute läuft (Story-Modus, Effekt-Engine, Offline-Erkennung). WebGPU ist inzwischen in allen großen Browsern
> verfügbar [Quelle 27] – wir nutzen es nur optional.

## Folie 13 – Generative Scene Engine: Live-Video aus Worten (HTML/JS, ressourcenschonend) *(Vision · Linie A „Erzählfilm“)*

Schaubild: Szene aus Formen – Transkript-Leiste „Es war Nacht … ein Mädchen ging in den Wald … es begann zu regnen …
plötzlich ein Drache!“, darunter Nachthimmel, Mond, Sterne, Bäume, Regen, 👧 und 🐉, Badge „Atmo: Regen“, Weltzustand als
JSON. Daneben Kostenbalken (logarithmisch).

- Jeder Satz verändert den Weltzustand: **Ort · Zeit · Wetter · Figur · Objekt · Aktion · Stimmung**.
- Die Streamerin liest vor oder erzählt – darunter entsteht Satz für Satz ein animierter Film.
- Läuft mit 60 fps im Browser neben OBS, offline und deterministisch: gleiche Zeitleiste, gleiches Bild – jede
  Erzählung wird sofort zum Clip.
- Kosten pro Stunde: Video-KI 180–2.700 USD [Quelle 24, 25] · LiveFX mit Text-KI 0,25–0,75 USD · ohne KI 0 €
  → 240- bis über 10.000-mal günstiger, und live überhaupt erst möglich.
- Für Vorlese-, Hörbuch- und Podcast-Formate: Hörbuch DE 374 Mio. €, +13 % [Quelle 19]; YouTube > 1 Mrd.
  Podcast-Zuschauer pro Monat [Quelle 21].
- *Bewusst Bilderbuch, kein Fotorealismus:* stilisierte Welt aus Emoji/SVG und Partikeln; die optionale KI wählt nur
  die Szene, sie erzeugt keine Bilder.

> **Notizen:** Die Streamerin tut nichts außer reden. „Es war Nacht“ – der Himmel wird dunkel. „Ein Mädchen ging in den
> Wald“ – Bäume wachsen, die Figur läuft ein. „Es begann zu regnen“ – Regen, der Atmosphäre-Loop wechselt. „Plötzlich
> ein Drache“ – Blitz, Kamera-Ruck, Drache. Technisch: 200–500 Byte pro Satz, Szenenwechsel 1- bis 3-mal pro Minute,
> ein Canvas mit höchstens 1.200 Partikeln – dieses Budget hält unsere Effekt-Engine schon heute neben OBS. Video-KI
> kostet nach Listenpreis 0,05 USD (Veo 3.1 Lite, 720p) bis 0,75 USD pro Sekunde [Quelle 24, 25]. Markt: 23,8 Mio.
> Menschen hören wöchentlich Podcasts [Quelle 20]; KI-Video wächst von 3,67 auf 24,89 Mrd. USD bis 2036 [Quelle 23].
> Aus der Folgerunde nach Gate 2 finanziert: MVP Deutsch ab Monat 19 (H2 2028), danach TR/EN und Welten-Packs. Erster Verlagsfall: die eigene Kinderbuchreihe.

## Folie 14 – Sprachenlernen & Bildung: jedes Wort ein Bild *(Vision · Linie B „WortBild“)*

Schaubild: Sprachlern-Karte **„🍎 elma · apple · Apfel 🔊“** – großes 🍎, „elma“, Silben „el · ma“, „apple · der Apfel“
(Artikel farbig), Lautsprecher „elma – tr-TR“, Pills DE · TR · EN; Modi **Übersetzen · Lesehilfe · Nachsprechen**.

- Ein Kind sagt „Apfel“ – sofort: 🍎, „elma“ in der Zielsprache, „der Apfel“ mit farbigem Artikel und die Aussprache.
  Ohne Klick.
- Lesehilfe in der eigenen Sprache: für Kinder vor dem Lesealter, DaZ, Integrationskurse und neurodiverse Lernende.
- Lokal, ohne Konto, offline – Schul-Datenschutz als Verkaufsargument; Aussprache über die Systemstimmen [Quelle 29].
- **12,7 Mio.** zahlende Duolingo-Abonnenten [Quelle 32] · **307.000** neue Teilnehmende in Integrationskursen 2025
  [Quelle 36] · **5 Mrd. €** DigitalPakt 2.0 [Quelle 40].
- Erlöse (Schätzung): WortBild Familie 4,99 €/Monat · Schullizenz 300–800 €/Jahr · Kurslizenz 49 € pro Lehrkraft
  und Jahr · Verlags-Edition.

> **Notizen:** Der persönlichste Teil: Ich schreibe Kinderbücher über Neurodiversität und bin deutsch-türkisch. Die
> Lehrkraft stellt „Ich spreche“, „Zeige“ und den Modus ein und liest vor. Nachsprechen ist bewusst keine
> Aussprachebewertung, sondern ein grüner Haken. Technik: Wort → Bild ist ein Tabellen-Lookup, die Aussprache liefert
> das Betriebssystem, ein Schul-Tablet reicht, Serverkosten pro Kind: null. Markt: Sprachlern-Apps 1,54 Mrd. USD
> In-App [Quelle 33]; 20,4 % der Schüler:innen unter 16 sprechen zu Hause vorwiegend eine andere Sprache [Quelle 37];
> 2,65 Mio. Menschen mit Einwanderungsgeschichte aus der Türkei [Quelle 38]; 25 % der Viertklässler:innen unter dem
> Lese-Mindeststandard [Quelle 39]. Preis-Anker ANTON 250–700 € pro Schule [Quelle 41]. Ehrlich: Integration ist in Euro
> klein, bringt aber Glaubwürdigkeit und Förderung; das Volumen liegt bei Familien, Verlagen, Plattformen. Wir sagen
> „unterstützt Vokabellernen“, nicht „doppelt so schnell“.

## Folie 15 – Auto-Edit, Editor, VR/AR – und ein größerer Markt *(Vision · Linien D „Studio“ + C „Räume“)*

**LiveFX Studio: Live-Schnitt und Auto-Edit**
- **Live → Highlights:** nach dem Stream 3–5 Clips im Format 9:16, dort, wo Memes, Geschenke und Chat am dichtesten
  waren – ohne Upload.
- **Datei rein → fertig raus:** Video ziehen → lokales Transkript → Effekte, Szenen, Schnitte als Chips → MP4 per
  Hardware-Encoder [Quelle 57, 59]. Schaubild: Zeitleiste mit Chips (Meme pink, Szene grün, Zoom gold, Schnitt grau).

**LiveFX Räume: ein Zustand, viele Bildschirme** – 🎤 Bühne & Events (geht heute) · 🏫 Klassenzimmer (geht heute) ·
🎧 Hörbuch mit Bildern (Folgerunde) · 📱 AR am Handy (Folgerunde) · 🥽 WebXR/VR (Vision 2029) · 👓 Display-Brille (Vision 2029)

*Erweiterter Markt:*

| Segment | Größe |
|---|---|
| Videoschnitt-Software 2026 | 2,68 Mrd. USD [Quelle 51] |
| KI-Video (Generierung + Schnitt) 2026 | 3,67 Mrd. USD [Quelle 23] |
| Sprachlern-Apps (In-App) 2025 | 1,54 Mrd. USD [Quelle 33] |
| Hörbuch Deutschland 2025 | 374 Mio. € [Quelle 19] |
| Smart Glasses 2026 | 13,6 Mio. Geräte / 5,1 Mrd. USD [Quelle 45] |
| Live-Streaming (Kern) 2026 | 97–157 Mrd. USD [Quelle 1, 2] |

Preis-Anker: OpusClip 15–29 USD, Descript 16–65 USD pro Monat [Quelle 54, 55]. LiveFX Pro+ 14,99 € (Schätzung) – ohne
Cloud-Kosten, ohne Minutenlimit. XR und Brille: Schaufenster, keine Umsatzlinie.

> **Notizen:** Zwei Türen in dasselbe Werkzeug. Live → Highlights: Der Server kennt schon heute jeden Trigger, jedes
> Geschenk, jede Chat-Nachricht mit Zeitstempel. Auto-Edit: Eine 20-Minuten-MP4 wird ins Fenster gezogen, Whisper
> transkribiert lokal im Browser [Quelle 60], der Export läuft über WebCodecs und den Hardware-Encoder [Quelle 57, 58, 59].
> Die Datei verlässt den Rechner nie. Räume: Bühne und Klassenzimmer gehen heute; Hörbuch mit Bildern und AR am Handy
> 2027; WebXR [Quelle 47, 48] und Display-Brillen wie Meta Ray-Ban Display [Quelle 46] sind Vision. Wettbewerb ehrlich:
> CapCut hat 736 Mio. MAU [Quelle 52] – wir treten nicht als Universal-Editor an, sondern über Sprache → Effekt, Szenen,
> TR/DE und lokale Verarbeitung. Käufer-Signal: Canva kaufte 2026 Cavalry und MangoAI [Quelle 56].

## Folie 16 – Team

- **Tuncay Sancak** – Gründer & Erfinder, Geschäftsführer · deutsch-türkischer Autor & Live-Streamer · Produkt, Inhalte,
  Community, die eigenen Streams als Testlabor · Pakete in TR/DE/EN aus erster Hand · Kinderbuchreihe zu Neurodiversität
  (Brücke zu WortBild und Erzählfilm)
- **[Position offen]** – Mobile-/Web-Entwickler:in: erste Einstellung aus dem Pre-Seed (Monat 3) – iOS/Android, PWA, später SDK
- **[Position offen]** – Creator-Partnerschaften / Growth (TR + DACH), Bildungsvertrieb – mit der Seed-Runde
- **Gönül Demet** – Investor Relations · Ansprechpartnerin für Investoren und die Pre-Seed-Runde
- Beirat / Partner (gesucht): Creator-Management TR · Ex-Produktverantwortung „Live“ einer Plattform · Edtech/Didaktik

> **Notizen:** Der Gründer ist Nutzer, Content-Lieferant und Product Owner in einer Person – deshalb funktioniert das
> Produkt mit Dialekten, im Hochformat und auf Türkisch. Als Kinderbuchautor bringt er den ersten Verlags- und
> Bildungsfall selbst mit. Gönül Demet verantwortet Investor Relations. Die Pre-Seed-Runde (250.000 €) finanziert eine
> Einstellung – eine Mobile-/Web-Entwickler:in ab Monat 3; weitere Einstellungen folgen mit der Seed-Runde nach Gate 2.
> Ein Edtech-Beirat prüft WortBild fachlich.

## Folie 17 – Finanzen & Bewertung *(neu)*

**„250 T€ für 18 Monate – dann die Seed-Runde“** (Schätzungen; Quelle `LiveFX_Finanzmodell.xlsx`)

GuV 5 Jahre, Basis-Szenario (T€):

| T€ | 2027 | 2028 | 2029 | 2030 | 2031 |
|---|---|---|---|---|---|
| Umsatz | 51 | 336 | 1.038 | 1.984 | 3.152 |
| Kosten | 166 | 295 | 710 | 1.065 | 1.491 |
| **EBITDA** | **−116** | **+41** | **+328** | **+919** | **+1.661** |
| Kasse Jahresende | 134 | 175 | 503 | 1.422 | 3.083 |

Umsatz 2031: konservativ 602 T€ · optimistisch 7,44 Mio. €; Jahre 4–5 fortgeschrieben; noch kein Umsatz.

- **18 Monate Runway ganz ohne Umsatz** (Ø Kosten 13.444 € pro Monat)
- **Kasse in Monat 18:** 49 T€ (konservativ) · 146 T€ (Basis) · 369 T€ (optimistisch)
- **Seed-Runde ~350 T€** nach Gate 2 (Monat 15–18)

**Bewertung – Angebot der Gründer: 2,25 Mio. € Pre-Money** (250 T€ für 10,0 %, Post-Money 2,5 Mio. €) – unter allen
vier Referenzmethoden: Berkus 2,35 Mio. € · Scorecard 2,95 Mio. € · VC-Methode 2,43 Mio. € · Risk Factor Summation
3,0 Mio. € (gewichtet 2,71 Mio. €). Alternative: SAFE/Wandeldarlehen mit Cap 2,25 Mio. €, 20 % Discount, ohne Zins –
max. 10 %. *Verhandlungsbasis – mit Steuer-/Rechtsberater prüfen.*

> **Notizen:** Basis-Szenario: Der Umsatz wächst von 51 T€ in 2027 auf 3,15 Mio. € in 2031; das EBITDA wird 2028
> positiv und bleibt es ab Monat 22. Ganz ohne Umsatz reichen die 250 T€ 18 Monate; in Monat 18 erwarten wir
> 49–369 T€ Kasse, danach eine Seed-Runde von etwa 350 T€ nach Gate 2. Bewertung: Unser Angebot von 2,25 Mio. €
> Pre-Money für 10 % ist ein fairer, investorenfreundlicher Einstiegspreis unter jeder Referenzmethode. Warum:
> funktionsfähiges Produkt (v2.1) mit 575+ automatisierten Tests, eigenes IP und eigene Inhalte, drei Sprachen inkl.
> türkischer Nische, Vision-Optionen A–D auf einer Engine und Kapitaleffizienz – bis v2.1 ohne externes Kapital gebaut.
> Ehrlich dagegen: Solo-Gründer, noch kein Umsatz und keine unterzeichneten Partner.

## Folie 18 – Gates: was die 250 T€ beweisen müssen *(neu)*

Alle Werte sind Ziele (nicht erreicht): Ziel = Basis-Szenario, Schwelle = konservatives Szenario.

| Gate | KPIs (Ziel, Schwelle in Klammern) | Gibt frei |
|---|---|---|
| **G0 · Monat 3** – Start | Pro-Abo live (Zahlung); Mobile-/Web-Entwickler:in an Bord | Budget Markteintritt Phase 2 |
| **G1 · Monat 6** – Aktivierung | 10.000 registrierte Nutzer (4.000); 400 zahlende Pro (120); 20 Beta-Creator TR/DE, 10–20 Botschafter:innen; WortBild mit 300 Wörtern; Woche-4-Retention ≥ 30 % | Mobile-App/PWA-Release |
| **G2a · Monat 12** – Traktion | 20.000 Nutzer (8.000); 800 zahlende Pro (240); MRR 8.073 € (2.500 €); 1 Plattform- oder Bildungspilot; WortBild in ≥ 3 Kursen/Klassen | DE/EN-Ausbau, Plattform-Gespräche |
| **G2 · Monat 18** – Folgerunde | 50.000 Nutzer (19.000); 2.000 zahlende Pro (570); MRR 22.586 € (6.495 €); Monat-3-Retention Pro ≥ 75 %; Conversion ≥ 3 % / 4 %; ≥ 5 zahlende Schulen oder Kurse | Seed-Runde, Ausbau-Team ab Monat 19, Story-Engine/Studio |

> **Notizen:** Vier Gates in 18 Monaten – jedes gibt das nächste Budget frei. Gate 2 in Monat 18 ist die Grundlage
> für die Seed-Runde. Alles das sind Ziele – erreicht ist davon noch nichts.

## Folie 19 – Ask

**„Lasst uns Live-Streams zuhören lassen.“**

- **Pilot Plattform**: LiveFX als Feature in *TikTok LIVE Studio*, *Instagram Live Producer* oder *YouTube Live* –
  die Browser-Quelle läuft heute; 8 Wochen, 20 Creator, gemessene Watchtime, Gifts und Clips
- **Pilot Bildung & Sprachen**: Bildungsträger, Integrationskurse, Schulen, Sprachlern-Plattformen und Verlage –
  WortBild und Erzählfilm in [Zahl] Kursen/Klassen bzw. mit [Zahl] Titeln testen
- **Partner**: Streaming-Software (OBS-Plug-in, Streamlabs), Creator-Agenturen TR/DACH, Audio-/ASR-Anbieter,
  Editor-Anbieter (Studio-SDK)
- **Pre-Seed: 250.000 € für 10 %** (Pre-Money 2,25 Mio. €, Post-Money 2,5 Mio. €) oder SAFE mit Cap 2,25 Mio. €;
  18 Monate, schlank: Pro-Abo, Mobile-App/PWA, TR → DE/EN-Launch, WortBild; parallel offen für Übernahme-Gespräche

**Mittelverwendung über 18 Monate – Vorschlag – mit Steuer-/Rechtsberater prüfen** (Balken auf der Folie; Details im Businessplan 11.6):

| Bereich | Anteil | Betrag |
|---|---|---|
| Team/Produkt: Mobile-/Web-Entwickler:in, Gründergehalt anteilig, Testgeräte | 50 % | 125.000 € |
| Markteintritt: Creator-Programm, Community, Plattform- und Bildungspiloten | 20 % | 50.000 € |
| Erste Vision-Linie WortBild (Sprachenlernen) | 15 % | 37.500 € |
| Recht, Marke, Datenschutz | 10 % | 25.000 € |
| Reserve | 5 % | 12.500 € |
| **Summe** | **100 %** | **250.000 €** |

Kontakt: Tuncay Sancak, Gründer & Geschäftsführer · Investor Relations: Gönül Demet · [E-Mail] · Demo: [Link] · Code & Doku: live-fx/
*Dieses Deck gibt es auch auf Türkisch und Englisch: `LiveFX_Pitch_TR.pptx` · `LiveFX_Pitch_EN.pptx`*

> **Notizen:** Konkret enden: Wir brauchen einen Kontakt im Live-Team und einen 8-Wochen-Pilot mit 20 Creatorn. Wir
> liefern Overlay, Pakete, Support und die Messung (Watchtime, Gifts, Clips aus Lives). Für WortBild und Erzählfilm
> suchen wir einen zweiten Pilot mit Bildungsträgern, Sprachlern-Plattformen oder Verlagen – der erste Verlagsfall ist
> die eigene Kinderbuchreihe. Zur Runde: 250.000 € für 10 % bei 2,25 Mio. € Pre-Money – ganz ohne Umsatz reicht das
> 18 Monate; Story-Engine, Auto-Edit und VR/AR folgen mit einer Seed-Runde von etwa 350 T€ nach Gate 2
> (Businessplan 11.6). Ansprechpartnerin für Investoren: Gönül Demet.
