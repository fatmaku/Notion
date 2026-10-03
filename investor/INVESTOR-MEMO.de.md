# LiveFX – Investment-Memo (Pre-Seed)

**Live-Streams, die zuhören. Und morgen: Du redest. Es wird Bild.**
Pre-Seed-Runde über **500.000 €** für LiveFX und alle LiveFX-Linien.

Vertraulich · Pre-Seed · Oktober 2026
Gründer & Erfinder, Geschäftsführer: **Tuncay Sancak** · Investor Relations: **Gönül Demet**

> Auch auf Türkisch: `INVESTOR-MEMO.tr.md` · In English: `INVESTOR-MEMO.en.md`
>
> **Grundlage:** Alle Zahlen stammen aus den LiveFX-Unterlagen in `../live-fx/business/` – `BUSINESSPLAN.md` (BP), `PITCH-DECK.md`, `MARKTANALYSE.md`, `VISION.md`, `QUELLEN.md`. Marktzahlen tragen die dortige Nummer **[Quelle n]**; eigene Annahmen sind als **Schätzung** markiert. Es gibt **noch keine Umsätze**. Nutzer-, Umsatz- und Bindungswerte, die erst gemessen werden, stehen als **[Zahl]**. Die Aufteilung der 500.000 € und alle Gate-Werte sind ein **Vorschlag – bitte bestätigen**.

---

## 1. Auf einen Blick

| | |
|---|---|
| **These** | Live-Streaming ist der am schnellsten wachsende Umsatzkanal der Creator Economy – aber Live ist roh. LiveFX macht aus der Stimme des Creators in unter einer Sekunde Memes, Sounds und animierte Szenen. Dieselbe Engine wird zur Bildsprache für alles Gesprochene: Erzählfilm, Sprachenlernen, neue Räume, Auto-Schnitt. |
| **Produkt** | Version 2.0, funktionsfähig: Deutsch, Türkisch, Englisch mit automatischer Erkennung, 238 Trigger in fünf Paketen, 13 Szenen, 12 Atmosphäre-Loops, 38 Sounds, Story-Modus, Zuschauer-Trigger, Handy-Fernbedienung, offline-fähig (BP §3). |
| **Vision** | Vier Linien: A Erzählfilm (Generative Scene Engine), B WortBild (Sprachenlernen), C Räume (Bühne, Klassenzimmer, AR/VR, Brille), D Studio (Live-Schnitt, Auto-Edit). Zwei klickbare Prototypen (A und B) liegen vor (`VISION.md`). |
| **Markt** | Live-Streaming weltweit 2026: 97–157 Mrd. USD [Quelle 1, 2]; Creator Economy ~216–260 Mrd. USD [Quelle 3, 4]; Geschenke ≈ 50 % des Streamer-Einkommens [Quelle 5, 6]. Angrenzend: Sprachlern-Apps 1,54 Mrd. USD [Quelle 33], KI-Video 3,67 Mrd. USD [Quelle 23], Videoschnitt 2,68 Mrd. USD [Quelle 51]. |
| **Modell** | Free + Pro 9,99 €/Monat, Creator-Packs 2,99–4,99 €, Agentur- und B2B-Lizenz; mit der Vision Pro+ 14,99 €, WortBild Familie 4,99 €/Monat, Schul-, Kurs-, Event- und Verlagslizenzen (BP §9, §15.6, Schätzung). |
| **Ask** | **500.000 €** Pre-Seed für 24 Monate: Team, Vision-Linien bis zum Produkt, Go-to-Market und Piloten, Recht und Plattform-Freigaben, Reserve. Konditionen **[offen]**. |
| **Status** | Produkt gebaut, noch keine Umsätze, Launch der türkischsprachigen Community ab Q4 2026 (BP §14.1). |

---

## 2. Investment-These

1. **Die Lücke ist leer.** Alerts reagieren auf Zuschauer, Soundboards auf Tasten, native Effekte auf manuelle Auswahl. Kein verbreitetes Werkzeug reagiert auf das, was der Creator *sagt* (BP §2, §7). Im 2×2 aus Auslöser (Zuschauer ↔ Sprache) und Bedienung (manuell ↔ automatisch) ist LiveFX allein im Feld „sprachgesteuert, automatisch“ (`PITCH-DECK.md`, Folie 10).
2. **Das Geld entsteht im Stream.** Geschenke machen rund die Hälfte des Einkommens von Live-Streamern aus [Quelle 5, 6]; Creator mit 20–100 T Followern erzielen 500–3.000 USD pro Monat aus Geschenken [Quelle 5]. Jede Minute Verweildauer zählt – LiveFX macht Streams unterhaltsamer und Geschenke sichtbar und hörbar.
3. **Gebaut vor der Finanzierung.** Version 2.0 läuft, mit 240+ automatisierten Tests (`PITCH-DECK.md`, Folie 9), dokumentierter Architektur und Einsatz in echten Streams. Das Kapital geht in Ausführung, nicht in einen Prototyp.
4. **Zeichnen statt generieren.** Generative Video-KI kostet nach Listenpreis 0,05–0,75 USD pro Sekunde [Quelle 24, 25], also 180–2.700 USD pro Stunde, und ist live nicht möglich. LiveFX übersetzt einen Satz in ein Zustands-Delta von 200–500 Byte und zeichnet die Szene im Browser: 0 € ohne KI, 0,25–0,75 USD pro Stunde mit optionaler Text-KI (Projektmessung) – 240- bis über 10.000-mal günstiger (BP §15.1, `VISION.md` §2).
5. **Eine Engine, mehrere Märkte.** Dieselbe Pipeline (Spracherkennung → Verstehen → Zeitleiste → Bildschirm) trägt Stream, Klassenzimmer, Bühne, Hörbuch und Schnittprogramm. Die Vision erweitert den Markt, ohne einen zweiten Technologie-Stack zu brauchen.
6. **Mehrsprachig von Anfang an.** Das größte Paket ist türkisch (85 Trigger), nicht englisch. Der Start in der türkischsprachigen Community (Türkei und Diaspora) trifft auf ausgeprägte Meme-Kultur und kaum lokalisierte Tools (`MARKTANALYSE.md` §4).

---

## 3. Das Problem

Alles, was Kurzvideos auf TikTok, Reels und Shorts viral macht – Memes, Sound-Effekte, Sticker, Zoom-Punches – entsteht **nach** der Aufnahme im Schnitt. Live-Streams sind roh: Der Creator ist Moderator, Regisseur und Cutter zugleich, und der Schnitt kommt nie (BP §2).

Gleichzeitig verschiebt sich der Umsatz *in* den Stream: Geschenke, Live-Commerce und Community-Abos entstehen während der Sendung. Ein monotoner Stream verliert Zuschauer – und damit Geschenke.

| Werkzeug heute | Auslöser | Was fehlt |
|---|---|---|
| Alerts (Streamlabs, StreamElements, Sound Alerts) | Zuschauer-Events (Follow, Spende, Bits) | der Creator selbst löst nichts aus |
| Soundboards (Voicemod, Stream Deck) | Hotkeys, Tasten | braucht Hände – beim Reden, Vorlesen, Kamera halten |
| Native Effekte (TikTok, Instagram) | manuelle Auswahl | reagieren nicht auf Inhalte |
| Editoren (CapCut u. a.) | nach der Aufnahme | nicht live |

Für mehrsprachige Creator kommt hinzu: Es gibt praktisch keine Creator-Tools, die türkische Meme-Kultur („yok artık“, „helal olsun“, „ohaa“) verstehen (BP §2).

---

## 4. Das Produkt: LiveFX 2.0

**In einem Satz:** Der Creator redet – LiveFX hört zu. Sagt er „krass“, „oh nein“, „Applaus“, „yok artık“ oder „bruh“, erscheint in unter einer Sekunde das passende Meme im Stream und der passende Sound spielt. Liest er vor – „es regnete“, „in der Nacht“, „der Drache“ – wird das Overlay zur animierten Szene mit Atmosphäre-Klang (BP §3.1).

| Bereich | Stand 2.0 (BP §3.2) |
|---|---|
| Spracherkennung | DE, TR, EN mit **automatischer Sprachwahl**; Browser-Engine, externe Engines (Whisper, Deepgram) oder Offline-Whisper im Browser |
| Dialekt und Lernen | unscharfes Matching in drei Stufen („grass“ → krass), Lernen aus dem Stream per Klick |
| Inhalte | **238 Trigger** in fünf Paketen: Türkçe 85, Deutsch 49, English 50, Familie & Kinder 27, Gaming 27 |
| Story-Modus | **13** animierte Szenen, **12** Atmosphäre-Loops, Geschichten-Pakete DE/TR/EN, Szenen-Pad |
| Effekte und Sound | Effekt-Engine v2 (Partikel, Glow, 3D-Karten, Impact-Zoom), Themes; **38** lizenzfreie, synthetische Sounds; Mixer mit Ducking und Hall |
| Zuschauer-Trigger | Twitch-Chat, YouTube-Live-Chat, Chat-Befehle; Geschenke-Webhook (TikTok-Coins über TikFinity/Streamer.bot, Super Chat, Bits) |
| Handy und Offline | PWA-Fernbedienung, Handy als zweites Mikro; Panel, Overlay und Demo offline |
| Integration | OBS/Streamlabs als Browser-Quelle → TikTok LIVE, Instagram Live, YouTube Live, Twitch; offene, token-geschützte HTTP-API |
| KI (optional) | Verstehen ohne Stichwort („das war so peinlich“ → Awkward), 1,5-s-Timeout; ≈ 0,004 USD pro Klassifikation, 0,25–0,75 USD pro Stunde Stream (Projektmessung, BP §9) |

**Technik und Schutz.** Reines HTML/JS/CSS und ein Node.js-Server ohne externe Abhängigkeiten; lokal statt Cloud, damit Grenzkosten nahe null und DSGVO-freundlich (BP §4). Schutzfähige Bausteine: mehrsprachiger Matcher, kuratierte Trigger- und Geschichten-Pakete, synthetische Sound-Bibliothek, Szenen-Engine und Mixer, Lernschleife. Markenanmeldung „LiveFX“ (DE/EU/TR) ist zu prüfen, eine Patentprüfung kostet laut BP 5–10 T€ (Schätzung).

**Traction.** Im Einsatz in eigenen Live-Streams seit [Monat/Jahr], [Zahl] Streams, [Zahl] Stunden; [Zahl] Creator auf der Warteliste; [Zahl] Downloads (`PITCH-DECK.md`, Folie 9 – nur echte Zahlen eintragen).

---

## 5. Die Vision: vier Linien, eine Engine

Leitidee: LiveFX wird vom Meme-Overlay zur **Bildsprache für alles Gesprochene**. Alle Linien teilen ein JSON-Format (LiveFX-Zeitleiste LTF v1) und die vorhandenen Module; Leistungsbudget ein Canvas, ≤ 1.200 Partikel, Ziel 60 fps auf integrierter Grafik (BP §15.1).

| Linie | Was entsteht | Stand | Markt (Auszug) | Erlös (Schätzung) |
|---|---|---|---|---|
| **A · Erzählfilm** (Generative Scene Engine) | Während jemand erzählt oder vorliest, entsteht ein fortlaufender animierter Film aus Ort, Zeit, Wetter, Figuren, Aktion und Stimmung – Live-Video aus Worten | **Prototyp** `prototypes/live-story.html` | Hörbuch DE 374 Mio. € [Quelle 19]; 23,8 Mio. Podcast-Hörer:innen wöchentlich [Quelle 20]; KI-Video 3,67 Mrd. USD [Quelle 23] | Pro, Pro+ 14,99 €, Welten-Packs, Verlagslizenz, Scene-SDK |
| **B · WortBild** (Sprachenlernen, Lesehilfe) | Gesprochenes Wort → Bild + Wort in der Zielsprache + Aussprache; Lesehilfe, Nachsprechen, Quiz | **Prototyp** `prototypes/sprachlernen.html` (85 Wörter, DE/TR/EN) | Sprachlern-Apps 1,54 Mrd. USD [Quelle 33]; 307.000 neue Integrationskurs-Teilnehmende 2025 [Quelle 36]; DigitalPakt 2.0: 5 Mrd. € [Quelle 40] | Familie 4,99 €/Monat, Schule 300–800 €/Jahr, Kurs 49 €/Lehrkraft, Vokabel-Packs |
| **C · Räume** (Bühne, Klassenzimmer, Hörbuch, AR/VR, Brille) | Dieselbe Zeitleiste auf LED-Wand, Beamer, Handy-AR, VR-Headset, Display-Brille | Bühne heute nutzbar, Rest Vision | Smart Glasses 13,6 Mio. Geräte, 5,1 Mrd. USD 2026 [Quelle 45]; tonies 630 Mio. € [Quelle 50] | Event 19–49 €/Tag bzw. 299 €/Jahr; XR mit 0 € angesetzt |
| **D · Studio** (Live-Schnitt, Auto-Edit) | Highlights aus dem Stream; fertiges Video rein → Effekte, Memes, Szenen, Schnitte automatisch → lokaler Export | Vision | Videoschnitt 2,68 Mrd. USD 2026 [Quelle 51]; CapCut 736 Mio. MAU [Quelle 52] | Pro+ „Studio & Szenen“, Agentur, White-Label |

**Prototypen.** Beide sind je eine HTML-Datei, offline, ohne Konto, dreisprachig. Der Erzählfilm-Prototyp kennt 22 Figuren, 16 Objekte, 10 Orte, Zeit, Wetter und Stimmung, läuft mit 60 fps und unter 1 ms Skriptzeit pro Frame (Messung im Test) und zeigt „Cloud-Kosten: 0,00 €“. WortBild erkennt türkische Suffixe (`kitabı` → `kitap`), zeigt farbige Artikel und Silben und spricht über die Systemstimme (`prototypes/README.md`). Dazu gibt es Vision-Trailer in DE/TR/EN (`video/LiveFX_Vision_*.mp4`).

**Reihenfolge nach Nähe zum Umsatz** (BP §14.2): Highlights (D) und WortBild (B) zuerst, der Erzählfilm (A) als Kern, Räume (C) über die Bühne, XR später und nur als Schaufenster. In dieser Runde werden **WortBild und die Story-Engine (Erzählfilm)** vom Prototyp zum Produkt gebracht.

---

## 6. Markt

### 6.1 Kernmarkt Live-Streaming

| Kennzahl | Spanne | Quelle |
|---|---|---|
| Live-Streaming-Markt weltweit 2026 | 97–157 Mrd. USD; 250–345 Mrd. USD bis 2030 (CAGR ~27 %) | [Quelle 1, 2] |
| Creator Economy 2026 | ~216–260 Mrd. USD (CAGR ~22 %) | [Quelle 3, 4] |
| Live-Anteil an der Creator Economy | ~14 % ≈ 36 Mrd. USD | [Quelle 3] |
| TikTok-LIVE-Creator 2025 | > 100 Mio. gingen allein in SEA, Kaukasus und Zentralasien live, +77 % | [Quelle 2] |
| Geschenke am Streamer-Einkommen | ~50 % | [Quelle 5, 6] |
| Türkei: Preis pro TikTok-Jeton | 0,37–0,43 TL; Plattform behält ~50 % | [Quelle 8, 9, 10] |

**Bottom-up (BP §6, Schätzung):**

| Ebene | Annahme | Größe |
|---|---|---|
| **TAM** | aktive, monetarisierende Live-Creator weltweit (TikTok, Instagram, YouTube, Twitch) | 10–20 Mio. Creator |
| **SAM** | Creator im TR/DE/EN-Sprachraum mit Desktop-Software oder Handy-Fernbedienung | 1–3 Mio. Creator |
| **SOM (Jahr 3)** | 0,3–0,5 % des SAM als zahlende Nutzer | 5.000–15.000 zahlende Nutzer |

Das Pitch-Deck rechnet ergänzend in Ausgaben: SAM Creator-Tools für Live 1–3 Mrd. USD, SOM 20–40 T Pro-Abos (Schätzung, `PITCH-DECK.md` Folie 7). Für den Finanzplan gilt die vorsichtigere BP-Rechnung.

### 6.2 Angrenzende Märkte der Vision (nicht im SOM)

| Markt | Größe | Quelle | Linie |
|---|---|---|---|
| KI-Videogenerierung und -schnitt | 3,67 Mrd. USD 2026 → 24,89 Mrd. USD 2036 | [Quelle 23] | A, D |
| Videoschnitt-Software | 2,52 Mrd. USD 2025 → 2,68 Mrd. USD 2026 | [Quelle 51] | D |
| Sprachlern-Apps (In-App) | 1,54 Mrd. USD 2025, +18,8 % | [Quelle 33] | B |
| Sprachenlernen gesamt | ≈ 84 Mrd. USD 2025 | [Quelle 34] | B |
| Duolingo (Referenz) | 58,7 Mio. tägliche Nutzer, 12,7 Mio. Zahlende (Q2 2026) | [Quelle 32] | B |
| Schüler:innen mit anderer Familiensprache (DE) | 20,4 % der unter 16-Jährigen | [Quelle 37] | B |
| DigitalPakt 2.0 | 5 Mrd. € über fünf Jahre, Start 1.9.2026 | [Quelle 40] | B, C |
| Hörbuch Deutschland | 374 Mio. € 2025, +13 % | [Quelle 19] | A, C |
| Smart Glasses weltweit | 13,6 Mio. Geräte, 5,1 Mrd. USD 2026 | [Quelle 45] | C |

**Warum jetzt:** Streaming-ASR unter 300 ms, Offline-Modelle im Browser, WebGPU in allen großen Browsern [Quelle 27], Spracherkennung auf dem Gerät in Chrome 139+ [Quelle 28]; Plattformen konkurrieren über Creator-Tools (`PITCH-DECK.md`, Folie 6). Canva kaufte im Februar 2026 Cavalry und MangoAI [Quelle 56] – Editor-Anbieter kaufen genau solche Bausteine zu.

---

## 7. Geschäftsmodell

| Stufe | Inhalt | Preis (BP §9, §15.6) |
|---|---|---|
| Free | Kernfunktion, Standard-Pakete, Demo-Aufnahme, Handy-Fernbedienung | 0 € |
| **Pro** | KI-Verstehen, alle Szenen und Themes, Zuschauer-Trigger ohne Limit, Cloud-Sync optional | **9,99 €/Monat** oder 79 €/Jahr |
| Pro+ „Studio & Szenen“ (Vision) | KI-Szenen, Auto-Edit aus Datei, MP4-Export, Hörbuch-Visualizer | 14,99 €/Monat |
| WortBild Familie (Vision) | Sprachenlernen und Lesehilfe ohne Streaming-Funktionen | 4,99 €/Monat |
| Creator-, Welten-, Vokabel-Packs | kuratierte Pakete, später Marktplatz mit 70/30-Split | 2,99–4,99 € |
| Agentur-Lizenz | Mehrplatz, zentrale Pack-Verwaltung | [49–149 €/Monat] (Schätzung) |
| Lizenzen Bildung, Bühne, Verlage | Schule 300–800 €/Jahr · Kurs 49 €/Lehrkraft/Jahr · Event 19–49 €/Tag bzw. 299 €/Jahr · Verlag [2.000 €] pro Titel und Jahr | Schätzung |
| B2B-Plattformlizenz / SDK | Lizenz oder White-Label der Erkennungs-, Szenen- und Pack-Technologie | individuell |

**Unit Economics.** Grenzkosten nahe null, weil die Software lokal läuft; KI kostet nur bei Pro-Nutzung (siehe §4). Preisanker: Streamlabs Ultra 27 USD/Monat [Quelle 11, 12], StreamYard ~35 USD, Restream ~16 USD [Quelle 12], Voicemod ~10 USD/Monat [Quelle 13]; ANTON-Schullizenz 250–700 € pro Schule und Jahr [Quelle 41].

**Strategische Option.** Übernahme von Technologie, Inhalten und Team durch eine Plattform oder einen Tool-Anbieter (ByteDance/TikTok, Meta, Google/YouTube, Logitech/Streamlabs, StreamElements – BP §9). Das ist eine Option, kein Plan-Bestandteil.

---

## 8. Wettbewerb

| | Alerts (Streamlabs/StreamElements) | Voicemod / Stream Deck | Native Effekte | CapCut / Editoren | **LiveFX** |
|---|---|---|---|---|---|
| Auslöser | Zuschauer-Events | Hotkeys | manuell | nach der Aufnahme | **Stimme** + Zuschauer + Handy + API |
| Sprachgesteuert | nein | nein | nein | nein | **ja, 3 Sprachen automatisch** |
| Türkisch | nein | nein | teilweise | ja (Schnitt) | ja, 85 Trigger |
| Story-/Szenen-Modus | nein | nein | nein | nein | ja, 13 Szenen |
| Lokal / offline | Cloud | lokal | App | App/Cloud | **lokal, offline-fähig** |
| Offene API | begrenzt | nein | nein | nein | ja |

Quelle: BP §7. **Positionierung:** LiveFX ersetzt weder OBS noch Streamlabs, sondern liegt als Browser-Quelle darüber – Streaming-Software ist Host, nicht Gegner. Größtes Wettbewerbsrisiko ist der Nachbau durch eine Plattform; deshalb ist der frühe Pilot mit Plattformen Teil der Strategie. In Sprachenlernen und Video-Editing tritt LiveFX nicht als Universal-App an, sondern über Sprache → Bild, TR/DE/EN und lokale Verarbeitung; kostenlose Konkurrenz sind Microsoft Reading Coach [Quelle 42] und Google Read Along [Quelle 43].

---

## 9. Go-to-Market

| Phase | Zeitraum | Maßnahmen (BP §10) |
|---|---|---|
| 1 · Türkische Community | Monat 1–4 | eigene Streams als Showcase, 10–20 Creator-Botschafter:innen, Discord/Telegram, wöchentliche Pack-Drops; Clips aus echten Streams sind das Marketing |
| 2 · DE/EN | Monat 4–9 | deutsch- und englischsprachige Creator; Vorlese- und Bildungs-Streams; OBS-, Streamlabs- und Stream-Deck-Verzeichnisse |
| 3 · Partner und Plattformen | Monat 6–12 | Creator-Partnerprogramm mit Umsatzbeteiligung, Agenturen, Pitch an die Live-Teams von TikTok, Meta, YouTube |
| 4 · Bildung und Verlage (Vision) | ab 2027 | WortBild-Pilot in [Zahl] Kursen/Klassen, Familien-Abo, Schullizenz über Medienzentren und DigitalPakt-Budgets, Verlags-Pilot |

**Pilotangebot an Plattformen** (`PITCH-DECK.md`, Folie 17): 8 Wochen, 20 Creator, gemessene Watchtime, Geschenke und Clips. **Pilot Bildung & Sprachen:** WortBild und Erzählfilm in [Zahl] Kursen/Klassen bzw. mit [Zahl] Titeln.

---

## 10. Das Angebot: 500.000 € Pre-Seed

### 10.1 Mittelverwendung über 24 Monate – Vorschlag – bitte bestätigen

| # | Bereich | Anteil | Betrag | Wofür | Ableitung aus dem Businessplan |
|---|---|---|---|---|---|
| 1 | **Produkt- & Engineering-Team** | 50 % | **250.000 €** | Mobile-/Web-Entwickler:in, 24 Monate (150.000 €); Backend/ML-Entwickler:in ab Monat 13 (60.000 €); Gründergehalt anteilig (40.000 €) | Personal J1 + J2 laut BP §11.3: Mobile/Web 75 + 160 T€, Backend/ML/Community 0 + 60 T€, Gründer 30 + 48 T€ = 373 T€; Rest aus Umsätzen |
| 2 | **Vision-Linien vom Prototyp zum Produkt** | 20 % | **100.000 €** | WortBild (B): 300 Wörter, Lesehilfe, Sprecher-Audios DE/TR/EN, Didaktik-Prüfung, Kurs-Pilot (40.000 €); Story-Engine/Erzählfilm (A): Canvas-Entwicklung, Illustration, Welten-Packs, TR/EN (40.000 €); Highlights (D) und Bühnen-/Klassenzimmer-Preset (C) (20.000 €) | Zusatzkosten Vision BP §11.5: 30 + 115 T€; Freelance Design/Sound BP §11.3: 15 + 25 T€ |
| 3 | **Go-to-Market, Creator-Programm, Piloten** | 15 % | **75.000 €** | 10–20 Botschafter:innen TR/DE, Community und Pack-Drops, Plattform-Pilot (8 Wochen, 20 Creator), Bildungs- und Verlags-Piloten, Marktplatz-Einträge | Marketing BP §11.3: 25 + 60 T€ |
| 4 | **Recht, Marke, Datenschutz, Plattform-Zertifizierung** | 10 % | **50.000 €** | Marke „LiveFX“ DE/EU/TR, Patentprüfung, DSGVO/Datenschutz-Folgenabschätzung für Schul- und Familienprofil, Jugendschutz, App-Store- und Plattform-Freigaben, Steuer und Verwaltung | Recht/Verwaltung BP §11.3: 12 + 20 T€; Patentprüfung 5–10 T€ (BP §4) |
| 5 | **Reserve** | 5 % | **25.000 €** | Puffer für Verzögerungen bei Plattform-Freigaben oder Einstellungen | – |
| | **Summe** | **100 %** | **500.000 €** | | |

Infrastruktur, KI-API und Store-Gebühren (BP §11.3: 8 + 25 T€) wachsen mit der Nutzung und werden aus Pro-Umsätzen getragen.

### 10.2 Warum 500.000 € statt 250–350 T€

Der Businessplan nennt 250–350 T€ Seed für 18–24 Monate, nur für das Kernprodukt, und lässt die Vision bewusst außen vor (BP §11.4, §11.5). Die 500.000 € decken **alle LiveFX-Linien** und machen den Plan robuster:

| Rechnung (aus BP §11.2–11.5) | 250–350 T€ | 500.000 € |
|---|---|---|
| Runway bei **null Umsatz** im Basis-Kostenplan (J1 165 T€, J2 398 T€ ≈ 33 T€/Monat) | ≈ 15–18 Monate | ≈ 22 Monate |
| Kumulierter Verlust **konservativ** nach 3 Jahren: −316 T€ | mit 250 T€ nicht gedeckt, mit 350 T€ knapp (34 T€ Rest) | gedeckt, ≈ 184 T€ Rest |
| Kumulierter Verlust **Basis** nach 2 Jahren: −176 T€ (mit Vision ≈ −102 T€) | gedeckt | gedeckt, Rest für Vision-Linien und Piloten |
| Vision-Linien A und B im Zeitplan 2027 | nicht finanziert | 100.000 € reserviert |

**Lesart:** Die Kernausgaben der 24 Monate sind aus dem Kapital gedeckt, nicht aus erhofften Umsätzen. Treten die Umsätze des Basis-Szenarios ein, verlängert sich der Runway über Monat 24 hinaus; tritt nur das konservative Szenario ein, bleibt das Unternehmen bis Jahr 3 finanziert.

### 10.3 Konditionen

Instrument (Eigenkapital oder Wandeldarlehen), Bewertung bzw. Cap, Beteiligungshöhe, Closing-Datum, mögliche Tranchen entlang der Gates (§11), Informations- und Mitspracherechte und Gründerbindung: **[offen]**. Planungsannahme für die Zeitachse: Closing Anfang 2027; verschiebt sich das Closing, verschieben sich die Gates entsprechend.

---

## 11. Meilensteine und KPI-Gates (halbjährlich)

Skalieren erst, wenn die Evidenz das Gate passiert. Werte sind **Zielwerte** aus dem Basis-Szenario des Businessplans (Schätzung) oder **[Zahl]**, wo der Wert erst nach den ersten Kohorten festgelegt werden kann. **Vorschlag – bitte bestätigen.**

| Gate | Zeitraum | Thema | KPI-Ziele (Zielwerte, nicht erreicht) | Gibt frei |
|---|---|---|---|---|
| **01** | H1 2027 | **Aktivierung** | Pro-Abo live (Q1 2027) · Mobile-Entwickler:in an Bord · 20 Beta-Creator TR/DE und 10–20 Botschafter:innen aktiv · WortBild mit 300 Wörtern · Wochen-4-Retention aktiver Streamer ≥ [Zahl] % | Mobile-App-Release, Budget Erzählfilm |
| **02** | H2 2027 | **Traktion** | 20.000 registrierte Nutzer und ≈ 800 zahlende Pro-Nutzer zum Jahresende (BP §11.1: 4 % Conversion) · 1 Plattform-Pilot gestartet (BP §14.1, Q3 2027) · Pro+ live · 5 zahlende Schulen (BP §11.5) | Einstellung Backend/ML |
| **03** | H1 2028 | **Bindung** | Conversion Free → Pro stabil ≥ 4 % · Monat-3-Retention Pro ≥ [Zahl] % · Upgrade Pro → Pro+ auf dem Weg zu 20 % (BP §11.5) · WortBild-Pilot in [Zahl] Kursen ausgewertet · [Zahl] aktive Streamer pro Woche | Ausbau Bildungsvertrieb und Packs |
| **04** | H2 2028 | **Skalierung** | 80.000 registrierte Nutzer und ≈ 3.200 Pro zum Jahresende (BP §11.1) · B2B-Pilot/Lizenz 50 T€ (BP §11.1) · 40 Schulen, 200 Kurslizenzen (BP §11.5) · ein SDK-Pilotpartner (BP §14.2) | Folgerunde oder Plattform-Gespräch; Break-even-Pfad Jahr 3 |

Messgrößen laufend: registrierte Nutzer, aktive Streamer pro Woche, Conversion Free → Pro, Retention nach Kohorte, Pack-Umsatz, Partner-Creator, Piloten mit Plattformen und Bildungsträgern (BP §14.1).

---

## 12. Finanzszenario

Alle Werte in T€, **Schätzungen** aus BP §11; es gibt noch keine Umsätze. J1–J3 = 2027–2029.

| Basis-Szenario | J1 | J2 | J3 |
|---|---|---|---|
| Umsatz Kernprodukt (Pro, Packs, Agentur, B2B) | 51 | 336 | 1.039 |
| Kosten | 165 | 398 | 710 |
| **Ergebnis Kernprodukt** | **−114** | **−62** | **+329** |
| Zusatzumsatz Vision (BP §11.5) | ≈ 27 | ≈ 192 | ≈ 617 |
| Zusatzkosten Vision | 30 | 115 | 210 |
| **Ergebnis inkl. Vision** | **≈ −117** | **≈ +15** | **≈ +736** |

| Szenario | Ergebnis J1 / J2 / J3 | kumuliert 3 Jahre |
|---|---|---|
| Konservativ | −105 / −149 / −62 | −316 |
| **Basis** | **−114 / −62 / +329** | **+153** |
| Optimistisch | −66 / +373 / +1.501 | +1.808 |

Wichtige Annahmen (Basis): 20.000 / 80.000 / 250.000 registrierte Nutzer zum Jahresende, 4 % Conversion, ARPU Pro 8,50 € netto, B2B 0 / 50 / 150 T€ (BP §11.1). Mit der Vision rückt der Break-even im Basis-Szenario von Jahr 3 in Jahr 2 (BP §11.5). XR und Brille sind mit 0 € angesetzt. Szenarien sind keine Prognosen.

---

## 13. Risiken und Gegenmaßnahmen

| Risiko | Gegenmaßnahme (BP §13, §15.8) |
|---|---|
| Nachfrage und Zahlungsbereitschaft unbewiesen | Gates mit Kohorten-Messung; Free-Stufe für Reichweite, Packs als niedrigschwelliger Kauf; Budget erst nach Gate-Freigabe |
| Plattform baut die Funktion nativ nach | früher Pilot-/Partner-Pitch; Mehrsprachigkeit und Community-Packs als Burggraben; offene API |
| Handy-only-Creator ohne OBS | Mobile-Entwickler:in als erste Einstellung, PWA, Demo-Aufnahme ohne OBS |
| Spracherkennung bei Dialekt, Lärm, Musik | Toleranz-Stufen, Lernfunktion, externe Engines, Offline-Whisper, Szenen-Pad |
| Abhängigkeit von Browser-Spracherkennung und Plattform-Richtlinien | pluggbare Engine, mehrere Wege pro Plattform, Fallback Handy |
| Urheberrecht an Memes, GIFs, Sounds | eigene synthetische Sounds, lizenzierte GIF-Provider, Nutzungsbedingungen |
| Datenschutz und Jugendschutz (Familie, Schule) | lokale Verarbeitung ohne Cloud-Pflicht, keine Konten nötig, Spracherkennung auf dem Gerät im Schulprofil |
| Vision verzettelt das kleine Team | Reihenfolge nach Umsatznähe, 20 % Budgetdeckel, XR nur Schaufenster |
| Lange Beschaffung im Bildungssektor | Familien-Abo und Verlage tragen das erste Jahr; Schullizenz über Medienzentren |
| Schlüsselperson | Dokumentation und Tests, frühe Einstellungen, Beirat |

Eine Investition in ein Unternehmen in dieser Phase kann zum Totalverlust führen.

---

## 14. Team

| Person | Rolle | Hintergrund |
|---|---|---|
| **Tuncay Sancak** | Gründer & Erfinder, Geschäftsführer | Hat LiveFX erfunden und vor jeder Finanzierung bis Version 2.0 gebaut; verantwortet Produkt, Technologie und Inhalte. Produktarchitekt und Brücke Deutschland–Türkei; ehemaliger Projektleiter, KI-Experte und Data Scientist bei Mercedes-Benz; Deutsch und Türkisch als Muttersprachen, dreisprachig im Geschäft. Autor von Kinderbüchern, darunter das Geschenkbuch „Gut, dass es dich gibt“ (DE/TR/EN) – Erfahrung mit Inhalten und Vorlese-Formaten. |
| **Gönül Demet** | Investor Relations & Fundraising | Leitet die Investorenansprache für die Pre-Seed-Runde und hat diese Unterlagen erstellt. |

**Aufbau nach der Finanzierung** (BP §12):

| Rolle | Zeitpunkt |
|---|---|
| Mobile-Entwickler:in (iOS/Android, PWA, später SDK) | ab der Runde |
| Community- und Partnermanagement TR/DE | Jahr 1–2, Teilzeit → Vollzeit |
| Grafik-/Web-Entwickler:in (Canvas, WebCodecs) für Erzählfilm und Studio | Jahr 1–2 |
| Backend/ML-Entwickler:in (Streaming-ASR < 300 ms, Offline-Modelle) | ab Monat 13 |
| Illustration, Sprecher:innen DE/TR/EN, Didaktik (freiberuflich) | Jahr 2 |
| Beirat: Creator-Management TR, ehemalige Live-Produktverantwortliche einer Plattform, Edtech | Jahr 1 |

Investor-Kontakt: **Gönül Demet** · [E-Mail] · [Telefon]

---

## 15. Unterlagen

- Investor-Deck: `LiveFX_Investor_Deck_DE.pptx` (TR, EN) · One-Pager: `OnePager_DE.pdf` (TR, EN)
- Investor-Show: `LiveFX_Investor_Show.html`, Video `LiveFX_Investor_Show_DE.mp4` (TR, EN)
- Businessplan `../live-fx/business/BUSINESSPLAN.md` (TR, EN), Marktanalyse, Vision, Pitch-Deck, Quellen
- Prototypen `../live-fx/business/prototypes/live-story.html`, `sprachlernen.html`; Trailer und Vision-Trailer in `../live-fx/business/video/`

### Zitierte Quellen (Nummern wie in `QUELLEN.md`, dort mit URL)

1 market.us – Live Streaming Market · 2 Gyre – Live Streaming Statistics · 3 datarefs – Creator Economy · 4 New Market Pitch – Creator Economy · 5 InfluencerFee – TikTok LIVE Gifting · 6 Muvi – TikTok LIVE · 8 Shopify TR – TikTok-Jetons · 9 Juntire – TikTok canlı yayın 2026 · 10 Milliyet – Jeton-Preise · 11 Capterra – Streamlabs · 12 CreatorStackClub – Streamlabs, StreamYard, Restream · 13 ToolChase – Voicemod · 19 Börsenverein – Buchmarkt kompakt · 20 ARD/ZDF-Medienstudie 2025 · 23 Meticulous Research – KI-Video · 24 Google – Gemini API Pricing · 25 Veo 3 API Pricing 2026 · 27 web.dev – WebGPU · 28 Chrome 139 · 32 Duolingo Q2 2026 · 33 Business of Apps – Sprachlern-Apps · 34 Mordor Intelligence – Sprachenlernen · 36 BAMF – Integrationskurse · 37 bpb – Familiensprache · 40 Deutsches Schulportal – DigitalPakt 2.0 · 41 ANTON – Schullizenz · 42 Microsoft Reading Coach · 43 Google Read Along · 45 IDC – Smart Glasses · 50 Musikwoche – tonies · 51 The Business Research Company – Video Editing · 52 Expanded Ramblings – CapCut · 56 CNBC – Canva/Cavalry

*Vertraulich. Szenarien und Schätzungen, keine Prognosen. Dieses Memo ist kein Angebot zum Verkauf von Wertpapieren.*
