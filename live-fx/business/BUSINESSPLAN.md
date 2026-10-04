# LiveFX – Businessplan

**Live-Streams, die zuhören.** Memes, Sounds und animierte Szenen in Echtzeit – ausgelöst durch die Stimme des Creators.

Stand: Oktober 2026 · Produktstand: Version 2.1 · Vertraulich
Gründer & Erfinder, Geschäftsführer: Tuncay Sancak · Investor Relations: Gönül Demet · Kontakt: [E-Mail] · [Ort]

> Auch auf Türkisch: BUSINESSPLAN.tr.md · In English: BUSINESSPLAN.en.md

> Alle Marktzahlen stammen aus öffentlichen Sekundärquellen und werden als Spannen angegeben; Nachweise als [Quelle n] im Text, Liste im Anhang. Eigene Annahmen sind ausdrücklich als „Schätzung“ gekennzeichnet. Zahlen in [eckigen Klammern] ergänzt der Gründer.

---

## 1. Executive Summary

**LiveFX** macht Live-Streams so lebendig wie geschnittene Kurzvideos. Die Software hört dem Creator zu und blendet in unter einer Sekunde passende Memes, GIFs, Sounds, Texteffekte oder ganze animierte Szenen in den Stream ein – hands-free, in drei Sprachen (Türkisch, Deutsch, Englisch, automatisch erkannt), kompatibel mit TikTok LIVE, Instagram Live, YouTube Live und Twitch über OBS/Streamlabs.

**Vision 2027–2029:** Aus derselben Engine wird eine Bildsprache für alles Gesprochene – ein fortlaufender Erzählfilm aus Worten, WortBild-Karten zum Sprachenlernen mit Aussprache, neue Räume von der Bühne bis zur Brille und ein Studio, das fertige Videos von selbst schneidet. Weil der Browser zeichnet statt eine Video-KI zu rechnen, kostet das ein Vielfaches weniger als generative Video-KI und läuft live (Kapitel 15).

| | |
|---|---|
| **Problem** | Alles, was Kurzvideos viral macht, entsteht *nach* der Aufnahme im Schnitt. Live ist roh. Bestehende Tools reagieren auf Zuschauer-Events oder Tastendruck – keines auf das gesprochene Wort. |
| **Lösung** | Sprache → Effekt. Stichwort-Matching mit Dialekt-Toleranz und Lernfunktion, optional KI-Verstehen ohne Stichwort, Story-Modus für Vorlesen, Zuschauer-Trigger per Chat und Geschenk, Handy-Fernbedienung. |
| **Status** | Version 2.1, funktionsfähig: 238 fertige Trigger in fünf Paketen plus Text-Sticker-Pakete, 143 kostenlose Sticker (MIT-Lizenz), 13 Szenen, 38 Sounds, Leistungsmodus (Bildzeit −63 bis −69 %), sichere GIF-Suche (KLIPY/GIPHY mit Inhaltsfilter), automatisierte Tests, im Einsatz in den eigenen Live-Streams des Gründers. |
| **Markt** | Live-Streaming weltweit 2026: 97–157 Mrd. USD [Quelle 1, 2]; Creator Economy ~216–260 Mrd. USD [Quelle 3, 4]; Geschenke ≈ 50 % des Einkommens von TikTok-LIVE-Streamern [Quelle 5, 6]. |
| **Geschäftsmodell** | Free + Pro-Abo (9,99 €/Monat), Creator-Packs (2,99–4,99 €), Agentur-Lizenz, B2B-Plattformlizenz; strategischer Exit an TikTok/Meta/YouTube. |
| **Go-to-Market** | Türkischsprachige Creator-Community zuerst, dann DE/EN; eigene Streams als Showcase; Creator-Partnerprogramm; LinkedIn und Presse. |
| **Bedarf** | **250.000 € Pre-Seed** für 18 Monate (Closing Januar 2027): schlankes Team mit Mobile-/Web-Entwickler:in ab Monat 3, Markteintritt, erste Vision-Linie WortBild, Recht und Marke. Runway: 18 Monate auch ganz ohne Umsatz. Erzählfilm, Studio und Räume folgen mit einer Seed-Runde von etwa 350.000 € nach Gate 2 (Monat 18). Dazu Plattform-Partnerschaften und Pilot-Partner (Kapitel 11.6). |
| **Finanzen** | Basis-Szenario: Umsatz 51 T€ (2027) → 336 T€ (2028) → 3,15 Mio. € (2031); EBITDA positiv ab 2028 (41 T€), 1,66 Mio. € in 2031; die Kasse fällt in den ersten 24 Monaten nie unter 125 T€ (Kapitel 11, `LiveFX_Finanzmodell.xlsx`). |
| **Bewertung** | Angebot der Gründer: 250.000 € für 10,0 % – Pre-Money 2,25 Mio. €, Post-Money 2,5 Mio. €; unter allen vier Referenzmethoden (Berkus 2,35 Mio. €, Scorecard 2,95 Mio. €, VC-Methode 2,43 Mio. €, Risk Factor Summation 3,0 Mio. €; gewichtet 2,71 Mio. €). Alternativ Wandeldarlehen/SAFE mit Cap 2,25 Mio. € und 20 % Discount. Verhandlungsbasis; mit Steuer-/Rechtsberater prüfen (Kapitel 11.6). |

Ask: 250.000 € Pre-Seed für 10,0 % (Pre-Money 2,25 Mio. €, Kapitel 11.6) und eine Pilot-Partnerschaft mit einer Plattform (TikTok LIVE Studio, Instagram Live Producer, YouTube Live) oder einem Creator-Tool-Anbieter – alternativ Übernahme von Technologie und Team.

---

## 2. Das Problem

Kurzvideos auf TikTok, Instagram Reels und YouTube Shorts leben von Memes, Sound-Effekten, Stickern und Zoom-Punches. All das entsteht **nach** der Aufnahme – in CapCut, im TikTok-Editor, in Edits. Live-Streams dagegen sind roh: Der Creator ist gleichzeitig Moderator, Regisseur und Cutter, und der Schnitt kommt nie.

Gleichzeitig verschiebt sich der Umsatz der Creator Economy *in* den Stream: Geschenke, Live-Commerce und Community-Abos entstehen während der Sendung. Bei TikTok LIVE machen Geschenke rund die Hälfte des Einkommens von Streamern aus [Quelle 5, 6]; Creator mit 20–100 T Followern erzielen laut Branchenquellen 500–3.000 USD pro Monat aus Geschenken [Quelle 5]. Jede Minute Verweildauer zählt – und ein monotoner Stream verliert Zuschauer.

Die vorhandenen Werkzeuge lösen das nicht:

- **Alerts** (Streamlabs, StreamElements, Sound Alerts) reagieren auf *Zuschauer*: Follow, Spende, Bits. Der Creator selbst löst nichts aus.
- **Soundboards** (Voicemod, Stream Deck) brauchen *Hände*: Hotkeys, Tasten, Klicks – während man redet, die Kamera hält oder vorliest.
- **Native Effekte** (TikTok, Instagram) sind Filter und Sticker, die manuell gewählt werden und nicht auf Inhalte reagieren.
- **Kein Werkzeug reagiert darauf, was der Creator sagt.** Auto-Untertitel haben bewiesen, dass Echtzeit-Text aus Sprache funktioniert. Echtzeit-*Effekte* aus Sprache gab es bisher nicht.

Für mehrsprachige Creator – etwa die große türkischsprachige Community in der Türkei und in Europa – kommt hinzu: Es gibt praktisch keine lokalisierten Creator-Tools, erst recht keine, die türkische Meme-Kultur („yok artık“, „helal olsun“, „ohaa“) verstehen.

---

## 3. Das Produkt (Stand 2.1)

### 3.1 In einem Satz

Der Creator redet – LiveFX hört zu. Sagt sie „krass“, „oh nein“, „Applaus“, „yok artık“ oder „bruh“, erscheint in unter einer Sekunde das passende Meme im Stream und der passende Sound spielt. Liest sie vor – „es regnete“, „in der Nacht“, „der Drache“ – verwandelt sich das Overlay in eine animierte Szene mit Atmosphäre-Klang.

```
Mikro ─► Spracherkennung (auto DE/TR/EN) ─► Matcher (Dialekt-Toleranz) ──┐
                                        └► KI-Verstehen (optional) ──────┤
Zuschauer-Chat / Geschenk / Handy / Stream Deck ─► HTTP-API (Token) ─────┼─► Bridge ─► Overlay in OBS ─► Stream
Panel: Meme-Pakete, GIF-Suche, Uploads, Trigger-Editor, Themes ──────────┘
```

### 3.2 Funktionsumfang

| Bereich | Stand 2.1 |
|---|---|
| **Spracherkennung** | Drei Sprachen (Deutsch, Türkisch, Englisch) mit **automatischer Sprachwahl** beim Sprechen; Varianten DE/AT/CH, US/GB/IN. Browser-Engine (Chrome/Edge), externe Engines (Whisper, Deepgram) per API oder **Offline-Whisper** direkt im Browser. Reaktion „schnell“ (Zwischenergebnisse) oder „sicher“ (ganze Sätze), 3 Lesarten, Selbsttest, Pegel- und Latenzanzeige. |
| **Dialekt und Lernen** | Unscharfes Matching in drei Stufen („grass“ → krass, „helal olsn“ → helal olsun) mit Schutz vor Fehltreffern. Nicht erkannte Sätze werden per Klick einem Trigger zugeordnet – beim nächsten Mal sitzt es. |
| **Meme-Pakete** | Türkçe (85), Deutsch (49), English (50), Familie & Kinder (27), Gaming (27) = **238 Trigger**, per Klick ladbar und wieder entfernbar. |
| **GIF-Suche und Medien** | Sichere GIF-Suche mit KLIPY und GIPHY direkt im Panel (immer Altersstufe G, Jugendschutz-Filter für Suchbegriffe und Ergebnisse, GIFs werden beim Anbieter verlinkt, nicht gespeichert), „Als Trigger“ in einem Schritt; eigene PNG/JPG/GIF/WebP und MP3/WAV/OGG bis 8 MB; Bildquellen nur eigene Uploads, mitgelieferte Sticker und KLIPY/GIPHY. |
| **Sticker** | 143 kostenlose Sticker (Microsoft Fluent Emoji, MIT-Lizenz; 119 animiert) mit Stichwörtern DE/TR/EN in eigenem Bibliotheks-Tab; Text-Sticker-Pakete TR/DE/EN (je 27–28) mit großen Comic-Wörtern (OHA, KRASS, SHEESH …). |
| **Leistung** | Leistungsmodus auto/eco/high und ein einziger Renderpfad: Bildzeit im Mittel −63 bis −69 %, p99 −74 bis −80 %, DOM-Knoten −56 % (gemessen mit 31 Effekten in 3 s auf 1920×1080); Eco-Modus für schwache PCs. |
| **Story-Modus** | 13 animierte Vollbild-Szenen (Regen, Nacht, Wald, Meer, Feuer, Schloss, Schnee, Wüste, Stadt, Weltraum, Sonnenaufgang, Gewitter, Szene beenden) mit 12 Atmosphäre-Loops (Regen, Wind, Kamin, Vögel, Meer, Donner, Grillen, Herzschlag, Glocken, Stadt, Weltraum, Sturm); Figuren als Sticker; Geschichten-Pakete DE/TR/EN; Szenen-Pad zur Handsteuerung. |
| **Effekte v2 und Themes** | Partikel mit Physik (60 fps mit automatischem Limit), Glow, 3D-Kippkarten, Impact-Zoom, Lichtstrahlen; Effekt-Typen Karte, Bild/GIF, Emoji-Regen, Banner, Konfetti, Szene, Sticker, Text (Neon/Verlauf/Bounce/Glitch), Bauchbinde, Kombi (Sequenz). Themes Neon, Pastell, Minimal, Kinderbuch. Kombis („krass“ 3× in 10 s → Konfetti) und Intensität aus der Stimme. |
| **Sound** | 38 synthetische, lizenzfreie Sounds in Gruppen (Impact, Lustig, Magie, Atmosphäre); Mixer mit Limiter, Ducking der Atmosphäre, Stereo nach Position, Hall für Szenen; Lautstärke pro Trigger; Ton-Check-Karte gegen Echo. |
| **Zuschauer-Trigger** | Twitch-Chat ohne Login, YouTube-Live-Chat per API-Key, Chat-Befehle (`!airhorn`) mit Cooldowns pro Zuschauer und global; **Geschenke-Webhook** mit Stufen (TikTok-Coins über TikFinity/Streamer.bot, YouTube Super Chat, Twitch Bits). |
| **Handy** | Fernbedienung als Web-App (PWA): alle Trigger als Kacheln, Szenen-Leiste, Pause, Lautstärke, Live-Transkript; mit HTTPS wird das Handy zum zweiten Mikro. |
| **Offline** | Panel, Overlay, Demo und Handy laufen ohne Internet (App-Shell im Cache); Offline-Spracherkennung mit Whisper (experimentell). |
| **Integration** | OBS/Streamlabs als Browser-Quelle → Instagram Live (Live Producer), TikTok LIVE (LIVE Studio oder Stream-Key), YouTube Live, Twitch; Hochkant-Layout mit Safe-Zones für den Chat; Demo-Aufnahme ohne OBS; API für Stream Deck, Streamer.bot, Chat-Bots. |
| **KI (optional)** | Semantisches Verstehen ohne Stichwort („das war so peinlich“ → Awkward) per Sprachmodell, mit 1,5-s-Timeout: lieber kein Meme als ein spätes. |

### 3.3 Versionshistorie

| Version | Inhalt |
|---|---|
| 1.0 | Vom Prototyp zum Programm: Medien-Bibliothek, Trigger-Editor, serverseitige Speicherung, Smart-Modus, externe API, Hochkant-Layout, Sicherheitshärtung, Tests |
| 1.1 | Meme-Pakete TR/DE/EN, GIF-Suche, Demo-Seite ohne OBS, 26 Sounds |
| 1.2 | Dialekt-Toleranz, Lernen aus dem Stream, Diagnose und Selbsttest |
| 1.3 | Story-Modus: 13 Szenen, 12 Atmosphäre-Loops, Geschichten-Pakete in drei Sprachen |
| 1.4 | Handy-Fernbedienung, PWA, HTTPS, Offline-Erkennung |
| 1.5 | Ton-Check gegen Echo, automatische Spracherkennung DE/TR/EN |
| 1.6 | Effekt-Engine v2, Themes, Audio-Mixer, 38 Sounds, Zuschauer-Trigger (Chat + Geschenke), Pakete Familie und Gaming |
| 2.0 | Review- und Härtungsdurchlauf, Regressionstests, Business-Unterlagen (Trailer, Pitch-Deck, Businessplan, Landingpage DE/TR/EN) |
| 2.1 | Leistungsmodus (Bildzeit −63 bis −69 %), 143 kostenlose Sticker (MIT), Text-Sticker-Pakete, Pakete bereinigt (ohne religiöse Ausdrücke und Flaggen), sichere GIF-Suche KLIPY/GIPHY mit Inhaltsfilter (Tenor-API abgeschaltet) |

---

## 4. Technologie und geistiges Eigentum

**Architektur.** LiveFX besteht aus reinem HTML/JavaScript/CSS und einem Node.js-Server **ohne externe Abhängigkeiten** (zero-dependency). Der Server ist eine Composition Root mit getrennten Modulen (Router, Static, SSE-Bridge, Auth, State, APIs, Smart, Chat); Browser und Server teilen ein versioniertes **Trigger-Schema** (v2) mit Migration. Alle Schnittstellen sind in `docs/CONTRACTS.md` dokumentiert.

**Lokal statt Cloud.** Spracherkennung, Matching, Rendering und Speicherung laufen auf dem Rechner des Creators. Trigger, Medien und Einstellungen bleiben beim Nutzer. Es gibt **keine Cloud-Pflicht**: Die Browser-Erkennung nutzt den Dienst des Browsers, der Offline-Modus ein Whisper-Modell im Browser, und die KI-Komponente ist optional zuschaltbar. Das senkt Betriebskosten auf nahezu null, vereinfacht Datenschutz (DSGVO) und macht das Produkt für Bildung und Familie vertrauenswürdig.

**Offene API.** Token-geschützte HTTP-Routen (`/api/fire`, `/api/transcript`, `/api/gift`, `/api/chat/test`, `/api/triggers`, `/api/assets`) erlauben Stream Deck, Streamer.bot, Chat-Bots, TikFinity und externe Spracherkennungen den Zugriff. Dieselbe API ist die Basis für eine spätere native Plattform-Integration oder ein Mobile-SDK.

**Sicherheit.** Server lauscht standardmäßig nur lokal; schreibende Routen verlangen Token oder Same-Origin; Host-Allowlist gegen DNS-Rebinding; Uploads werden per Magic-Bytes geprüft; Overlay-Texte werden escaped. Automatisierte Unit- und End-to-End-Tests (Playwright) sichern Schema, Matcher, Server, APIs, Chat, Geschenke und Audio.

**Schutzfähige Bausteine (Know-how, Urheberrecht am Code und an den Inhalten):**

1. Mehrsprachiger Matcher mit Akzent-Faltung, Damerau-Levenshtein mit Längen-Gates und Stoppwort-Schutz („schön“ ≠ „schon“), Spezifitätsregeln („oh nein“ vor „nein“), Vorkommenszählung gegen Doppelfeuer bei Zwischenergebnissen.
2. Kuratierte, sprachspezifische Trigger-Pakete (238 Trigger) und Geschichten-Pakete mit kollisionsfreien Stichwörtern – der inhaltliche Burggraben.
3. Synthetische Sound-Bibliothek (38 Sounds, 12 Loops) ohne Lizenzkosten und Copyright-Strikes.
4. Szenen-Engine (Partikel-Physik, Parallax, Überblendung) und Audio-Mixer (Ducking, Panning, Hall).
5. Lernschleife aus dem Stream (unscharfe Treffer speichern, Sätze ohne Treffer zuordnen).

Markenanmeldung „LiveFX“ (DE/EU/TR) ist zu prüfen; Patentfähigkeit einzelner Verfahren (sprachgesteuertes Szenen-Overlay mit Atmosphäre-Loop) kann mit einem Patentanwalt geklärt werden [Kosten: Schätzung 5–10 T€].

---

## 5. Zielgruppen

| Segment | Bedarf | Was LiveFX liefert | Reife |
|---|---|---|---|
| **Entertainment-Creator TR/DE/EN** (TikTok LIVE, Instagram Live, YouTube, Twitch) | Rhythmus und Lacher im Stream, ohne Hände; mehr Verweildauer → mehr Geschenke | Meme-Pakete TR/DE/EN, GIF-Suche, Kombis, Intensität aus Stimme, Geschenk-Trigger | heute |
| **Live-Commerce** (Produktvorstellungen, Drops, Flash-Sales) | Produktname, „Angebot“, „nur heute“ → Sticker, Banner, Kasse-Sound; Social Proof bei Käufen | Trigger-Editor, Bauchbinde, Text-Effekte, Geschenk-/Webhook-Stufen für Bestellungen | heute mit eigenen Triggern; Paket geplant |
| **Vorlese- und Familien-Streams** (Autor:innen, Eltern, Kinderbuch-Creator) | Geschichten sichtbar machen; Kinder bei der Stange halten | Story-Modus mit 13 Szenen und Atmosphäre, Paket „Familie & Kinder“, Theme „Kinderbuch“ | heute |
| **Bildung** (Lehrkräfte, Sprachunterricht, Nachhilfe-Streams, Vorschule) | Visualisierung von Vokabeln, Stimmungen, Erzählungen; Belohnungseffekte | Story-Pakete in drei Sprachen, eigene Trigger („Vokabel → Bild“), offline nutzbar, keine Cloud | heute als Nische; Bildungs-Paket geplant |
| **Events und Bühne** (Moderation, Hochzeiten, Comedy, Vereinsabende) | Effekte auf Zuruf ohne Technik-Crew; Handy als Fernbedienung | PWA-Fernbedienung, Soundboard, Szenen-Pad, Kombi-Sequenzen | heute |
| **Agenturen und Netzwerke** (Creator-Management, MCNs) | Ein Set-up für viele Creator, markenkonforme Packs | Export/Import der Trigger, Themes, API | Agentur-Lizenz geplant |
| **Plattformen (B2B)** | Längere Watchtime, Sticker-Gifting 2.0, Short-taugliche Live-Clips | Technologie und Pakete als native Funktion oder SDK | Pitch-Phase |
| **EdTech und Sprachenlernen** (Familien, Grundschulen, DaZ- und Integrationskurse, Herkunftssprache Türkisch) | Wörter sichtbar und hörbar machen, Lesehilfe, datenschutzfreundlich ohne Konten | WortBild: gesprochenes Wort → Bild + Zielsprache + Aussprache, Lesehilfe, Nachsprechen, offline | Vision, Prototyp vorhanden (ab 2027) |
| **Vorlese-, Hörbuch- und Podcast-Formate, Verlage** | Bild zu reinem Audio, Vorlese-Streams mit „Film“ | Erzählfilm (Generative Scene Engine), Companion-Modus „Hörbuch mit Bildern“, Verlagslizenz | Vision, Prototyp vorhanden (aus der Folgerunde, H2 2028) |
| **Video-Editing** (Creator, Podcaster, Agenturen) | Clips und Shorts ohne stundenlangen Schnitt, ohne Upload | Studio: Highlights aus dem Stream, Auto-Edit fertiger Videos, lokaler MP4-Export | Vision (aus der Folgerunde, H2 2028) |
| **VR/AR, Bühne und Events** (Veranstalter, Bibliotheken, Hardware-Partner) | Effekte auf Zuruf, immersive Erzählungen | Bühnenmodus (heute), AR am Handy, WebXR und Display-Brillen als Schaufenster | Bühne heute; AR/XR Vision (2027–2029) |

Startsegment ist die **türkischsprachige Creator-Community** (Türkei und Diaspora in Deutschland/Europa): größtes Paket, kaum Wettbewerb, ausgeprägte Meme-Kultur, und der Gründer ist selbst Teil dieser Community.

Ab 2027 kommen mit der Vision (Kapitel 15) drei angrenzende Zielgruppen dazu: **Bildung und Sprachenlernen** (Familien, Schulen, Kurse), **Verlage und Audio** (Hörbuch, Podcast, Vorlesen) und **Video-Editing** (Creator und Agenturen, die nachträglich schneiden). VR/AR und Brillen sind bis 2029 Schaufenster, keine eigene Umsatzlinie.

---

## 6. Marktanalyse (Kurzfassung)

Die vollständige Analyse mit allen Spannen, der Türkei-Betrachtung und dem Preisvergleich steht in `MARKTANALYSE.md`. Die Eckdaten:

| Kennzahl | Spanne | Quelle |
|---|---|---|
| Live-Streaming-Markt weltweit 2026 | 97–157 Mrd. USD; Prognose 250–345 Mrd. USD bis 2030 (CAGR ~27 %) | [Quelle 1, 2] |
| Creator Economy 2026 | ~216–260 Mrd. USD (CAGR ~22 %) | [Quelle 3, 4] |
| Anteil Live-Streaming an der Creator Economy | ~14 % ≈ 36 Mrd. USD | [Quelle 3] |
| TikTok LIVE Creator-Wachstum | > 100 Mio. Creator gingen 2025 in SEA/Kaukasus/Zentralasien live, +77 % | [Quelle 2] |
| Anteil Geschenke am Streamer-Einkommen | ~50 % | [Quelle 5, 6] |
| Geschenk-Einnahmen (20–100 T Follower) | 500–3.000 USD/Monat | [Quelle 5] |
| Türkei: Preis pro TikTok-Jeton | 0,37–0,43 TL; Plattform behält ~50 % | [Quelle 8, 9, 10] |

**Adressierbarer Markt (Bottom-up, Schätzung):**

| Ebene | Annahme | Größe (Schätzung) |
|---|---|---|
| TAM | Aktive, monetarisierende Live-Creator weltweit auf TikTok/Instagram/YouTube/Twitch | 10–20 Mio. |
| SAM | Creator im TR/DE/EN-Sprachraum, die per Desktop-Software (OBS, LIVE Studio) oder Handy-Fernbedienung streamen | 1–3 Mio. |
| SOM (Jahr 3) | 0,3–0,5 % des SAM als zahlende Nutzer | 5.000–15.000 zahlende Nutzer |

Die TAM-Zahl ist aus dem Creator-Wachstum einzelner Regionen [Quelle 2] und den Zugangshürden (1.000 Follower für LIVE [Quelle 9, 14]) abgeleitet und bewusst grob; die Planung in Abschnitt 11 basiert auf dem SOM.

**Angrenzende Märkte der Vision (2027–2029):**

| Markt | Größe | Quelle | Linie |
|---|---|---|---|
| KI-Videogenerierung und -schnitt | 3,67 Mrd. USD 2026 → 24,89 Mrd. USD 2036 | [Quelle 23] | Erzählfilm, Studio |
| Videoschnitt-Software | 2,52 Mrd. USD 2025 → 2,68 Mrd. USD 2026 | [Quelle 51] | Studio |
| CapCut (Referenz) | 736 Mio. mobile MAU, > 1 Mrd. USD In-App-Umsatz 2025 | [Quelle 52] | Studio |
| Sprachlern-Apps (In-App) | 1,54 Mrd. USD 2025, +18,8 % | [Quelle 33] | WortBild |
| Sprachenlernen gesamt (inkl. Präsenz) | ≈ 84 Mrd. USD 2025 | [Quelle 34] | WortBild |
| Duolingo (Referenz) | 58,7 Mio. tägliche Nutzer, 12,7 Mio. Zahlende (Q2 2026) | [Quelle 32] | WortBild |
| Integrationskurse Deutschland | 307.000 neue Teilnehmende, 17.204 Kurse, 18.920 Lehrkräfte (2025) | [Quelle 36] | WortBild |
| Schüler:innen mit anderer Familiensprache | 20,4 % der unter 16-Jährigen | [Quelle 37] | WortBild |
| DigitalPakt 2.0 | 5 Mrd. € über fünf Jahre, Start 1.9.2026 | [Quelle 40] | WortBild, Räume |
| Hörbuch Deutschland | 374 Mio. € 2025, +13 % | [Quelle 19] | Erzählfilm, Räume |
| Podcast-Hörer:innen Deutschland | 23,8 Mio. wöchentlich | [Quelle 20] | Erzählfilm, Räume |
| Smart Glasses weltweit | 13,6 Mio. Geräte, 5,1 Mrd. USD (2026) | [Quelle 45] | Räume |

Diese Märkte sind nicht in TAM/SAM/SOM eingerechnet. Ihre Erlöse stehen getrennt in Abschnitt 11.5; die ausführliche Betrachtung steht in `MARKTANALYSE.md`, Abschnitt „Angrenzende Märkte“.

---

## 7. Wettbewerb

| | Streamlabs / StreamElements Alerts | Sound Alerts | Voicemod | TikTok-/Instagram-native Effekte | CapCut / Editoren | **LiveFX** |
|---|---|---|---|---|---|---|
| **Auslöser** | Zuschauer-Events (Follow, Spende, Bits) | Zuschauer kaufen Sound (Bits) | Hotkeys, Klicks | manuell, vor/während Live | nach der Aufnahme | **Stimme des Creators** + Zuschauer + Handy + API |
| **Sprachgesteuert** | nein | nein | nein | nein | nein | **ja, 3 Sprachen auto** |
| **Mehrsprachig (TR)** | nein | nein | nein | teilweise (Filter) | ja (Schnitt) | ja (85 TR-Trigger) |
| **Story-/Szenen-Modus** | nein | nein | nein | nein | nein | ja (13 Szenen, 12 Loops) |
| **Läuft lokal / offline** | Cloud | Cloud | lokal | App | App/Cloud | **lokal, offline-fähig** |
| **Offene API** | begrenzt | nein | nein | nein | nein | ja |
| **Geschenk → Effekt** | ja | ja | nein | Sticker | – | ja (Webhook, Stufen) |
| **Preis** | 0 / 27 USD/Monat Ultra / 79 USD Ultra+ [Quelle 11, 12] | 0 + Umsatzbeteiligung | 0 / ~10 USD/Monat [Quelle 13] | 0 | 0 / Abo | 0 / 9,99 €/Monat |

Weitere Anbieter im Umfeld: StreamYard (~35 USD/Monat) und Restream (~16 USD/Monat) für Browser-/Multistreaming [Quelle 12] – sie liefern Infrastruktur, keine Live-Effekte aus Sprache.

**Positionierung:** LiveFX ersetzt weder OBS noch Streamlabs, sondern liegt als Ebene darüber (Browser-Quelle) und ergänzt Alerts um den fehlenden Auslöser: die Stimme. Für Plattformen ist es die Funktion, die ein Plugin nicht liefern kann – native Integration in die Live-Kamera.

---

## 8. USP

1. **Der einzige Auslöser, der immer da ist: die Stimme.** Kein Klick, kein Zuschauer nötig – Effekte folgen dem Gesagten in unter einer Sekunde.
2. **Versteht Dialekt und Stil.** Toleranz-Stufen, Lernen aus dem Stream, drei Lesarten, optional KI-Verstehen ohne Stichwort.
3. **Mehrsprachig von Anfang an.** Türkisch, Deutsch, Englisch mit automatischer Erkennung – das größte Paket ist türkisch, nicht englisch.
4. **Story-Modus.** Vorlesen wird zur animierten Szene mit Atmosphäre – ein unbesetzter Nischenmarkt (Autor:innen, Eltern, Lehrkräfte).
5. **Lokal, offline, ohne Lizenzrisiko.** Daten bleiben beim Creator, 38 eigene Sounds, GIF-Provider mit API-Lizenz.
6. **Offen.** Zuschauer-Trigger (Chat, Geschenke), Handy-Fernbedienung, Stream Deck, externe Spracherkennung, Webhooks.
7. **Aus der Praxis.** Entwickelt und getestet in den eigenen Live-Streams des Gründers (Ton-Check, Echo-Warnung, Safe-Zones kommen aus echten Problemen).

---

## 9. Geschäftsmodell

| Stufe | Für wen | Inhalt | Preis |
|---|---|---|---|
| **Free** | alle Creator | Kernfunktion, Standard-Pakete, Demo-Aufnahme, Handy-Fernbedienung, Community-Support | 0 € |
| **Pro** | aktive Streamer | KI-Verstehen inklusive, alle Themes und Szenen, Zuschauer-Trigger ohne Limit, Cloud-Sync der Trigger (optional), Prioritäts-Support, keine Wasserzeichen in Demo-Clips | **9,99 €/Monat** oder 79 €/Jahr |
| **Creator-Packs** | Free und Pro | Kuratierte Meme-/Story-Packs (Gaming, Familie, Comedy, Bildung, Live-Commerce, regionale Dialekte), später Community-Marktplatz mit 70/30-Split | **2,99–4,99 €** pro Pack |
| **Agentur-Lizenz** | Creator-Management, Netzwerke, Bildungsträger | Mehrplatz-Lizenz, zentrale Pack-Verwaltung, markenkonforme Themes, Onboarding | [49–149 €/Monat] je nach Plätzen (Schätzung) |
| **B2B-Plattformlizenz** | Plattformen, Streaming-Software-Anbieter, Sender | Lizenz oder White-Label der Erkennungs-, Szenen- und Pack-Technologie; Pilot → Lizenz; SDK | individuell |
| **Exit** | ByteDance/TikTok, Meta, Google/YouTube, Logitech/Streamlabs, StreamElements | Übernahme von Technologie, Inhalten und Team | – |

**Warum das funktioniert:** Die Grenzkosten sind nahezu null (lokale Software), die KI-Komponente kostet nur bei Pro-Nutzung (≈ 0,004 $ pro Klassifikation, bei 1–3 Sätzen pro Minute 0,25–0,75 $ pro Stunde Stream – Projektmessung). Packs sind reine Inhaltsarbeit mit hoher Marge und binden die Community. Die Agentur-Lizenz skaliert ohne zusätzlichen Support, die B2B-Lizenz ist der Weg zum eigentlichen Ziel: native Integration.

---

## 10. Go-to-Market

**Phase 1 – Türkische Community (Monat 1–4).** Launch im türkischsprachigen Raum: eigene Streams des Gründers als dauerhafter Showcase, 10–20 Creator-Botschafter:innen mit Zugang und Feedback-Schleife über die Lernfunktion, Discord/Telegram-Gruppe, wöchentliche Pack-Drops. Clips aus echten Streams („Das Meme kam, weil ich ‚yok artık‘ gesagt habe“) sind das Marketing – das Produkt ist sein eigener Werbeträger.

**Phase 2 – DE/EN (Monat 4–9).** Deutschsprachige Creator (Twitch, YouTube, Instagram) und englischsprachige Early Adopters; Vorlese- und Bildungs-Streams als zweiter Flügel (Buchhandel, Bibliotheken, Lehrkräfte-Communities). Einträge in OBS-Plugin-Verzeichnissen, Streamlabs-App-Store, Stream-Deck-Marketplace.

**Phase 3 – Partner und Plattformen (Monat 6–12).** Creator-Partnerprogramm (Umsatzbeteiligung an Packs, „powered by LiveFX“ optional), Agenturen, erste B2B-Gespräche. Pitch-Deck und Demo an die Live-Teams von TikTok, Meta und YouTube.

**Kanäle**

| Kanal | Maßnahme | KPI |
|---|---|---|
| Eigene Streams | LiveFX in jedem Stream des Gründers, Clips als Shorts/Reels | Clips/Woche, Views, Downloads |
| Creator-Partnerprogramm | 10–20 Botschafter:innen TR/DE, Umsatzbeteiligung an Packs | aktive Partner, Referral-Registrierungen |
| LinkedIn und Presse | Vorstellungsartikel (DE/TR), Fachpresse Creator-Economy/Edtech, Podcasts | Kontakte zu Plattform-Teams, Pilot-Anfragen |
| Community | Discord/Telegram, Pack-Drops, Lernfunktion als Feedback-Kanal | aktive Mitglieder, eingereichte Trigger |
| Marktplätze | OBS-Plugins, Streamlabs-Apps, Stream Deck | Installationen |
| Bildung | Vorlese-Demos mit Kinderbuch-Theme, Lehrkräfte-Webinare | Pilot-Klassen, Bildungs-Packs |

---

## 11. Finanzplan (5 Jahre) – Schätzung

Alle Zahlen sind **Schätzungen** des Gründers auf Basis der Annahmen unten; es gibt noch keine Umsätze. Grundlage ist das Finanzmodell **`LiveFX_Finanzmodell.xlsx`** (Blätter: Annahmen, GuV 5 Jahre, Mittelverwendung, Liquidität monatlich über 24 Monate, Gates, Bewertung, Sensitivität; erzeugt mit `tools/build-finance.py`, Kennzahlen in `tools/finance-250k.json`). Zeitachse: Closing der Pre-Seed-Runde im Januar 2027 = Monat 1; J1 = 2027 (Start Pro-Abo) … J5 = 2031.

### 11.1 Annahmen

| Annahme | Konservativ | Basis | Optimistisch |
|---|---|---|---|
| Registrierte Nutzer (Jahresende) J1 / J2 / J3 | 8.000 / 30.000 / 80.000 | 20.000 / 80.000 / 250.000 | 40.000 / 180.000 / 500.000 |
| Conversion Free → Pro | 3 % | 4 % | 5 % |
| ARPU Pro (netto, Mix Monat/Jahr) | 8,50 €/Monat | 8,50 €/Monat | 8,50 €/Monat |
| Pack-Käufe pro Jahr (Anteil der Nutzer × 1 Pack à Ø 3,99 €) | 7 % | 10 % | 12 % |
| Agentur-Lizenzen (Jahresende) J1 / J2 / J3 à 49 €/Monat | 2 / 8 / 25 | 3 / 15 / 40 | 5 / 30 / 80 |
| B2B-Pilot/Lizenz | 0 / 0 / 50 T€ | 0 / 50 / 150 T€ | 0 / 100 / 400 T€ |
| Zahlende Pro-Nutzer werden als Jahresdurchschnitt gerechnet (≈ 50 % des Jahresendwerts in J1, 75 % ab J2) | | | |

Die Jahre 4–5 schreibt das Modell fort: Das Nutzerwachstum verlangsamt sich, Agentur- und B2B-Lizenzen laufen weiter, die Kosten wachsen mit Team und Marketing (Arbeitsmappe, Blatt „Annahmen“, Abschnitt B). Die Kosten J1–J2 stammen aus dem Monatsplan der 250-T€-Runde (11.3, 11.6), J3 aus dem bisherigen Plan.

### 11.2 Umsatz (T€) – 5 Jahre

| Szenario | J1 2027 | J2 2028 | J3 2029 | J4 2030 | J5 2031 |
|---|---|---|---|---|---|
| Konservativ | 16 | 82 | 271 | 432 | 602 |
| **Basis** | **51** | **336** | **1.038** | **1.984** | **3.152** |
| Optimistisch | 124 | 892 | 2.599 | 4.828 | 7.444 |

Basis-Szenario nach Erlösquelle:

| Basis (T€) | J1 2027 | J2 2028 | J3 2029 | J4 2030 | J5 2031 |
|---|---|---|---|---|---|
| Pro-Abo | 41 | 245 | 765 | 1.463 | 2.324 |
| Creator-Packs | 8 | 32 | 100 | 180 | 269 |
| Agentur-Lizenz | 2 | 9 | 24 | 41 | 59 |
| B2B / Pilot | 0 | 50 | 150 | 300 | 500 |
| **Summe** | **51** | **336** | **1.038** | **1.984** | **3.152** |

J1–J3 folgen unverändert den Annahmen aus 11.1; die konservative Agentur-Zeile ist formelgerecht gerechnet (J2 4,7 statt 4 T€, J3 14,7 statt 12 T€); übrige Abweichungen zu früheren Fassungen sind Rundung.

### 11.3 Kosten (T€) – Basis-Szenario, schlanker Plan

Bis Monat 18 finanziert die 250-T€-Runde ein schlankes Team: eine Mobile-/Web-Entwickler:in ab Monat 3, ein anteiliges Gründergehalt von 2.000 € pro Monat, Markteintritt, WortBild sowie Recht. Das Ausbau-Team (zweite Entwickler:in, Backend/ML, Community/Support) startet erst in Monat 19, nach Gate 2 und der Folgerunde.

| Position | J1 2027 | J2 2028 | J3 2029 | Bisheriger Plan J1 / J2 |
|---|---|---|---|---|
| Personal: Mobile-/Web-Entwicklung (1 Person ab Monat 3; 2 Personen ab Monat 19) | 56 | 113 | 240 | 75 / 160 |
| Personal: Backend/ML, Community/Support (ab Monat 19) | 0 | 30 | 160 | 0 / 60 |
| Gründer (Gehalt; 2.000 €/Monat bis Monat 18) | 24 | 36 | 60 | 30 / 48 |
| Freelance Design/Sound → Linie WortBild (37,5 T€, Monat 4–15) | 28 | 22 | 40 | 15 / 25 |
| Marketing, Creator-Programm, Events, Piloten | 32 | 48 | 120 | 25 / 60 |
| Infrastruktur, KI-API (nur Pro), Store-Gebühren (fix + Anteil am Umsatz) | 7 | 30 | 60 | 8 / 25 |
| Recht, Marke, Steuer, Verwaltung | 19 | 16 | 30 | 12 / 20 |
| **Gesamt** | **166** | **295** | **710** | **165 / 398** |

J4 und J5 (fortgeschrieben): 1.065 T€ und 1.491 T€. Gesamtkosten der anderen Szenarien (J1–J5, T€): konservativ 163 / 196 / 330 / 396 / 455, optimistisch 172 / 396 / 1.100 / 1.650 / 2.310.

### 11.4 Ergebnis und Kasse (T€) – 5 Jahre

**EBITDA (Ergebnis)**

| Szenario | J1 2027 | J2 2028 | J3 2029 | J4 2030 | J5 2031 | Kumuliert nach 5 Jahren |
|---|---|---|---|---|---|---|
| Konservativ | −148 | −114 | −59 | +36 | +147 | −138 |
| **Basis** | **−116** | **+41** | **+328** | **+919** | **+1.661** | **+2.833** |
| Optimistisch | −48 | +496 | +1.499 | +3.178 | +5.134 | +10.259 |

**Kasse zum Jahresende** (Start 250 T€, ohne Folgerunde)

| Szenario | J1 2027 | J2 2028 | J3 2029 | J4 2030 | J5 2031 |
|---|---|---|---|---|---|
| Konservativ | 102 | −11 | −71 | −34 | 112 |
| **Basis** | **134** | **175** | **503** | **1.422** | **3.083** |
| Optimistisch | 202 | 698 | 2.197 | 5.375 | 10.509 |

J1/J2 stammen aus dem Monatsplan (Monat 12 und 24); ab J3 gilt Kasse = Vorjahr + EBITDA (vereinfacht, ohne Steuern und Working Capital). Ab Monat 19 enthalten alle Szenarien bereits das Ausbau-Team, obwohl es erst mit der Folgerunde eingestellt wird – der konservative Fall zeigt deshalb die Lücke, die die Seed-Runde schließen muss. Basis: operativer Break-even dauerhaft ab Monat 22 (J2); konservativ: EBITDA positiv ab J4.

**Finanzierungsbedarf:** 250.000 € Pre-Seed für 18 Monate (Abschnitt 11.6); Folgerunde (Seed) von etwa 350.000 € nach Gate 2.

### 11.5 Zusätzliche Erlösquellen ab Jahr 2/3 (Schätzung)

Die Vision (Kapitel 15) ist in den Tabellen 11.2–11.4 **nicht** enthalten. Diese Tabelle zeigt sie getrennt, im Basis-Szenario. J1–J3 entsprechen 2027–2029; die Pro-Nutzer kommen aus der Basis oben (Ø 400 / 2.400 / 7.500). Alle Werte sind Schätzungen in T€.

| Erlösquelle | Annahme | J1 2027 | J2 2028 | J3 2029 |
|---|---|---|---|---|
| Pro+-Aufpreis „Studio & Szenen“ (14,99 €, netto ≈ 4,25 €/Monat über Pro) | 10 % (ab Q3) / 20 % / 25 % der Pro-Nutzer | 1 | 24 | 96 |
| Zusatz-Conversion durch Highlights und WortBild | +0,5 Prozentpunkte auf registrierte Nutzer, ARPU 8,50 € | 5 | 31 | 96 |
| WortBild Familie (4,99 €, netto ≈ 4,25 €/Monat) | Ø 0 / 500 / 2.000 Abos | 0 | 26 | 102 |
| Schullizenzen (Ø 500 €/Jahr) | 5 / 40 / 150 Schulen | 3 | 20 | 75 |
| Kurslizenzen (49 € pro Lehrkraft und Jahr) | 0 / 200 / 800 Lehrkräfte | 0 | 10 | 39 |
| Welten- und Vokabel-Packs | zusätzlich zu den Creator-Packs | 5 | 25 | 60 |
| Event- und Bühnenlizenzen | 20 / 80 / 200 × 299 € + 100 / 400 / 1.000 Tagespässe × 29 € | 9 | 36 | 89 |
| Verlagslizenzen | 2 / 10 / 30 Titel à [2.000 €] pro Titel und Jahr | 4 | 20 | 60 |
| **Summe Zusatzumsatz** | | **≈ 27** | **≈ 192** | **≈ 617** |
| Zusatzkosten (Illustration, Sprecher-Audios, Didaktik, Bildungsvertrieb, XR-Prototyp) | | 30 | 115 | 210 |
| **Deckungsbeitrag Vision** | | **≈ −3** | **≈ +77** | **≈ +407** |

**Wie die Vision finanziert wird:** Die 250-T€-Runde finanziert nur die erste Vision-Linie, **WortBild** (37.500 €, Monat 4–15, Abschnitt 11.6); ihre Erlöse (Familien-Abo, Schul- und Kurslizenzen: 2,5 / 55,8 / 216,2 T€ in J1–J3, Basis) führt das Modell nur als Memo-Position, also als Upside. **Erzählfilm, Studio/Auto-Edit und Räume/VR-AR wandern in die Folgerunde**; das Modell plant dafür 160,5 T€ von Monat 19 bis Ende J3. SDK- und Plattform-Erlöse werden **nicht** zusätzlich gezählt; sie stecken schon in der B2B-Zeile. XR und Brille sind mit 0 € angesetzt.

### 11.6 Finanzierung: 250.000 € Pre-Seed

**Bedarf:** eine **Pre-Seed-Runde über 250.000 €**, geplant für **18 Monate** (Closing Januar 2027 = Monat 1, bis Juni 2028). Sie finanziert ein schlankes Team, den Markteintritt, die erste Vision-Linie WortBild und die rechtlichen Grundlagen – bis Gate 2, zu dem die Folgerunde (Seed) eingeworben wird. Alle Zahlen in diesem Abschnitt: **Vorschlag – mit Steuer-/Rechtsberater prüfen.**

**Mittelverwendung über 18 Monate – Vorschlag – mit Steuer-/Rechtsberater prüfen**

| Bereich | Anteil | Betrag | Verplant Monat 1–18 | Inhalt |
|---|---|---|---|---|
| Team/Produkt: Mobile-/Web-Entwickler:in, Gründergehalt anteilig, Testgeräte | 50 % | 125.000 € | 125.000 € | Entwickler:in ab Monat 3 (16 × 5.500 € = 88 T€), Gründer 18 × 2.000 € = 36 T€, Testgeräte 1 T€; Ziel: Pro-Abo, Mobile-App/PWA, Stabilität v2.1 |
| Markteintritt: Creator-Programm, Community, Plattform- und Bildungspiloten | 20 % | 50.000 € | 50.000 € | TR-Launch, 10–20 Botschafter:innen, Pack-Drops, Marktplatz-Einträge, DE/EN-Launch, 1 Plattform- oder Bildungspilot |
| Erste Vision-Linie WortBild (Sprachenlernen) | 15 % | 37.500 € | 37.500 € | 300 Wörter, Lesehilfe, Sprecher-Audios DE/TR/EN, Didaktik-Prüfung, Kurs-/Klassen-Pilot (Monat 4–15) |
| Recht, Marke, Datenschutz | 10 % | 25.000 € | 25.000 € | Marke LiveFX DE/EU/TR, Beteiligungsvertrag, DSGVO/DSFA Schul-/Familienprofil, Jugendschutz, Steuerberatung |
| Reserve | 5 % | 12.500 € | – | Nicht verplant: Verzögerungen bei Einstellung, Store-/Plattform-Freigaben; deckt Infrastruktur-Fixkosten im Fall ohne Umsatz |
| **Summe** | **100 %** | **250.000 €** | **237.500 €** | |

**Kostenlinien Monat 1–18** (in allen Szenarien gleich)

| Kostenlinie | €/Monat | Monate | Einmalig | Summe Monat 1–18 |
|---|---|---|---|---|
| Mobile-/Web-Entwickler:in (Vollzeit) | 5.500 € | 3–18 | – | 88.000 € |
| Gründergehalt (anteilig) | 2.000 € | 1–18 | – | 36.000 € |
| Entwicklungs-Tools, Testgeräte (iOS/Android) | – | – | 1.000 € (Monat 1) | 1.000 € |
| Creator-Programm, Community, Marketing – Phase 1 (TR-Launch) | 2.000 € | 1–6 | – | 12.000 € |
| Creator-Programm, Marketing, Marktplätze – Phase 2 (DE/EN, Partner) | 3.000 € | 7–18 | – | 36.000 € |
| Plattform- oder Bildungspilot (8 Wochen, Material, Reisen) | – | – | 2.000 € (Monat 9) | 2.000 € |
| WortBild: Illustration, Sprecher-Audios DE/TR/EN, Didaktik, Kurs-Pilot | 3.125 € | 4–15 | – | 37.500 € |
| Recht, Marke (DE/EU/TR), Datenschutz/DSFA, Jugendschutz, Steuerberatung | 1.000 € | 1–18 | 7.000 € (Monat 1) | 25.000 € |
| **Summe verplant** | | | | **237.500 €** |

**In die Folgerunde verschoben** (nicht aus den 250 T€ finanziert): Erzählfilm / Story-Engine (Linie A), Studio / Auto-Edit (Linie D), Räume / VR-AR (Linie C) sowie Backend/ML, Community/Support und eine zweite Entwickler:in ab Monat 19.

**Runway – monatlicher Liquiditätsplan** (Arbeitsmappe, Blatt „Liquidität 24M“):

- **Ganz ohne Umsatz** reichen die 250 T€ **18 Monate**: Ø Kosten 13.444 € pro Monat (Monat 1–18, inkl. fixer Infrastruktur), Kasse Ende Monat 18 8.000 €, erster negativer Monat 19.
- Mit Umsatz sehen die Szenarien so aus (T€; ab Monat 19 inkl. Ausbau-Team):

| Szenario | Kasse Monat 6 | Monat 12 | Monat 18 | Monat 24 | Niedrigste Kasse (Monat) | Runway | Dauerhafter Break-even |
|---|---|---|---|---|---|---|---|
| Konservativ | 183 | 102 | 49 | −11 | −11 (24) | 22 Monate (Cash-out Monat 23) | nach Monat 24 |
| **Basis** | **191** | **134** | **146** | **175** | **125 (15)** | **> 24 Monate** | **Monat 22** |
| Optimistisch | 208 | 202 | 369 | 698 | 197 (9) | > 24 Monate | Monat 10 |
| Ohne Umsatz | 179 | 88 | 8 | −62,5 | – | 18 Monate | – |

Im konservativen Fall fällt die Kasse in Monat 19 unter den Sicherheitsbestand von drei Monatskosten – genau dort muss die Folgerunde stehen.

**Folgerunde (Seed):** Richtwert für die Planung **etwa 350.000 €** (deckt den konservativen Fall, auf 50 T€ gerundet). Gespräche ab Monat 12, Abschluss nach Gate 2 (Monat 15–18, spätestens Monat 18). Mindestbedarf bis Ende J3:

| T€ | Konservativ | Basis | Optimistisch |
|---|---|---|---|
| Sicherheitsbestand (3 Monatskosten J3) | 82,5 | 177,5 | 275 |
| Kasse Ende J3 ohne Folgerunde | −71 | 503 | 2.197 |
| Liquiditätslücke (Sicherheitsbestand minus niedrigster Kassenstand bis Ende J3) | 153 | 52 | 78 |
| Nachgelagerte Vision-Linien (Erzählfilm, Studio, Räume), Monat 19 bis Ende J3 | 160,5 | 160,5 | 160,5 |
| **Mindestbedarf Folgerunde** | **314** | **213** | **239** |

**Bewertung: Angebot der Gründer 2,25 Mio. € Pre-Money – Verhandlungsbasis; mit Steuer-/Rechtsberater prüfen**

**Angebot:** 250.000 € für **10,0 %** – Pre-Money **2,25 Mio. €**, Post-Money **2,5 Mio. €**, der Gründer behält 90 %. Das Angebot liegt **unter allen vier üblichen Referenzmethoden** für Unternehmen ohne Umsatz (2,35–3,0 Mio. €, gewichtet 2,71 Mio. €): ein fairer, investorenfreundlicher Einstiegspreis unter jeder Referenzmethode.

Referenzmethoden (Arbeitsmappe, Blatt „Bewertung“; jede Annahme ist dort belegt und gekennzeichnet):

| Methode | Ansatz | Pre-Money | Gewicht |
|---|---|---|---|
| Berkus | Moderne Variante „moderate 2×“: fünf Faktoren mit je bis zu 1 Mio. $ (valu.vc, icanpitch 2026; $ → € 1:1). Idee 0,7 · Prototyp/Produkt 0,8 · Team 0,5 · strategische Beziehungen 0,25 · Markteinführung/Umsatz 0,1 | 2,35 Mio. € | 25 % |
| Scorecard (Payne) | Referenz-Pre-Money 2,5 Mio. € – unterer Teil der DACH-Pre-Seed-Spanne (1,5–5 Mio. €, upxcale; Deutschland 1–5 Mio. €, Capvisory), unter dem Europa-Median (≈ 4,2 Mio. €, Equidam) – × Faktor 1,18 (Team 1,0 · Markt 1,4 · Produkt 1,4 · Wettbewerb 1,3 · Vertrieb 0,8 · weitere Finanzierung 1,0 · Sonstiges 1,2) | 2,95 Mio. € | 30 % |
| VC-Methode | Optimistisches Szenario (Upside): Umsatz J5 7,44 Mio. € × Exit-Multiple 6 = Exit-Wert 44,7 Mio. €; ÷ Ziel-Rendite 10× × (1 − 40 % spätere Verwässerung) = Post-Money 2,68 Mio. €; abzüglich 250 T€ | 2,43 Mio. € | 20 % |
| Risk Factor Summation | Basiswert 2,5 Mio. €; zwölf Risikofaktoren mit je ±250 T€; Summe +2 (Entwicklungsstadium, Herstellung, Wettbewerb, Technologie, International positiv; Management, Vertrieb, Kapitalbeschaffung negativ) | 3,0 Mio. € | 25 % |
| **Gewichteter Mittelwert** | | **2,71 Mio. €** | |

**Warum 2,25 Mio. € begründet sind:**

- **Funktionsfähiges Produkt v2.1 statt Konzept:** Stimme → Effekt in Echtzeit, Leistungsmodus, sichere GIF-Suche; 575+ automatisierte Tests und eine e2e-Testsuite (Playwright) – das Technologierisiko ist weitgehend abgebaut.
- **Eigenes IP und eigene Inhalte:** 238 Sprach-Trigger, 143 freie Sticker, Text- und Sticker-Inhalte sowie die Matcher-Logik sind selbst entwickelt; die Markenanmeldung LiveFX (DE/EU/TR) ist budgetiert.
- **Drei Sprachen (DE/TR/EN) inkl. türkischer Nische:** kaum spezialisierte Streaming-Tools auf Türkisch, eigene TR-Community als Startmarkt.
- **Vision-Optionen A–D auf derselben Engine:** Erzählfilm (A), WortBild Sprachenlernen (B), Räume/VR-AR (C), Studio/Auto-Edit (D) – Optionswert über das Creator-Tool hinaus.
- **Marktgröße:** Live-Streaming-Markt 97–157 Mrd. USD, SAM 1–3 Mio. Creator (Kapitel 6); Bildung/Sprachenlernen als zweiter Markt.
- **Kapitaleffizienz:** Produkt bis v2.1 ohne externes Kapital gebaut; die 250.000 € tragen laut Modell 18 Monate bis Gate 2.

Ehrlich dagegen: Solo-Gründer, noch kein Umsatz und keine unterzeichneten Partner – deshalb liegt das Angebot unter jeder Referenzmethode.

**Instrumente – Vorschlag – mit Steuer-/Rechtsberater prüfen**

- **A. Eigenkapital (Priced Round):** 250.000 € bei 2,25 Mio. € Pre-Money = 10,0 % (Post-Money 2,5 Mio. €).
- **B. Wandeldarlehen / SAFE:** Valuation Cap 2,25 Mio. € (Pre-Money, gleich dem Angebot), 20 % Discount auf den Preis der Seed-Runde (15–20 % verhandelbar), ohne Zins, Wandlung in der Seed-Runde nach etwa 18 Monaten. Beispiel: Seed-Pre-Money 3 Mio. € → Wandlungsbewertung = niedrigerer Wert aus Cap und 3 Mio. € × (1 − 20 %) = 2,25 Mio. € → Anteil 10,0 %; am Cap liegt der Anteil nie über 10 %.

**Sensitivität (Basis-Szenario)** – Umsatz in J3 und Kasse; die Runway bleibt in jedem Fall über 24 Monaten:

| Fall | Umsatz J3 (T€) | Abweichung zur Basis | Kasse Monat 18 (T€) | Niedrigste Kasse (T€) |
|---|---|---|---|---|
| Basis | 1.038 | – | 146 | 125 |
| Conversion −1 Punkt | 847 | −18,4 % | 117 | 83 |
| Conversion +1 Punkt | 1.230 | +18,4 % | 174 | 140 |
| ARPU −20 % | 885 | −14,7 % | 123 | 91 |
| ARPU +20 % | 1.191 | +14,7 % | 169 | 137 |
| Nutzer −30 % | 779 | −25,0 % | 106 | 65 |
| Nutzer +30 % | 1.298 | +25,0 % | 186 | 145 |

Marktreferenzen zur Bewertung (Web-Recherche vom 4. 10. 2026, Werte vor Verwendung gegenprüfen; die Berkus-Variante folgt valu.vc und icanpitch 2026):

- upxcale (DACH-Pre-Seed-Spanne 1,5–5 Mio. €; Deutschland typ. 0,5–1,5 Mio. €): https://upxcale.de/blog/pre-seed-funding/
- Capvisory (Deutschland 1–5 Mio. €): https://capvisory.de/the-startup-funding-stages-from-pre-seed-to-series-c/
- Equidam (Europa-Median Pre-Seed 4,57 Mio. USD): https://www.equidam.com/startup-valuation-delta-q1-2025/
- SaaS Capital (Umsatz-Multiples 4,8x / 5,3x): https://www.saas-capital.com/blog-posts/private-saas-company-valuations-multiples/
- Carta (Verwässerung je Runde): https://carta.com/data/state-of-private-markets-q1-2025/
- Lexr (Cap, Discount, Zins): https://www.lexr.com/en-de/blog/convertible-loan-in-practice-conversion-interest-rate-discount-cap-valuation/
- Vektora (15–25 % Discount üblich): https://vektora.eu/de/fachbeitraege/pre-seed-finanzierung-in-deutschland-instrumente-und-prozess

Alternative, falls die Runde nicht zustande kommt: Bootstrapping – Pro-Abo und Packs finanzieren eine Teilzeit-Entwickler:in, das Wachstum verlangsamt sich entsprechend (etwa konservatives Szenario). Förderprogramme (EXIST, Gründungszuschüsse, Medien-/Edtech-Förderung) werden parallel geprüft.

*Stand Oktober 2026: Ask 250.000 €.*

---

## 12. Team und Bedarf

**Tuncay Sancak – Gründer & Erfinder, Geschäftsführer.** Hat LiveFX erfunden und gebaut. Autor und Live-Streamer, deutsch-türkisch; Kinderbuchreihe zu Neurodiversität (Türkisch, mit Buch-Trailern); Produktvision und Community. Nutzt LiveFX in jedem eigenen Stream – Vorlesen mit Story-Modus ist aus der eigenen Praxis entstanden.

**Gönül Demet – Investor Relations.** Ansprechpartnerin für Investoren und die Pre-Seed-Runde (Kontakt: [E-Mail] · [Telefon]).

**Entwicklung bisher.** KI-gestützt aufgebaut, mit dokumentierter Architektur (Schema, Contracts, Design-Dokumente), Changelog und automatisierten Tests – ein Stand, den ein Entwicklungsteam direkt übernehmen kann.

**Gesucht**

| Rolle | Warum | Zeitpunkt |
|---|---|---|
| **Mobile-/Web-Entwickler:in** (iOS/Android, WebView/PWA, später SDK) | Handy-first-Creator ohne OBS erreichen; Vorstufe zur Plattform-Integration | ab Monat 3 (Pre-Seed) |
| Backend/ML-Entwickler:in | Streaming-ASR < 300 ms, Offline-Modelle, KI-Verstehen als Standard | ab Monat 19 (Folgerunde) |
| Community- und Partnermanagement (TR/DE) | Creator-Partnerprogramm, Packs, Support | Botschafter:innen ab Jahr 1; Stelle ab Monat 19 (Folgerunde) |
| **Partnerschaften** | Plattform-Pilot (TikTok LIVE Studio, Instagram Live Producer, YouTube), Streaming-Software, Bildungsträger, Verlage | laufend |
| Beirat | Creator-Manager:in TR, ehemalige Produktverantwortliche „Live“ einer Plattform, Edtech | Jahr 1 |
| Grafik-/Web-Entwickler:in (Canvas, WebCodecs) | Erzählfilm-Renderer, Studio-Export (Vision) | Folgerunde (ab Monat 19) |
| Illustration (Kinderbuch-Stil), Sprecher:innen DE/TR/EN, Didaktik | Aussprache-Audios und fachliche Prüfung WortBild (Pre-Seed, Monat 4–15); Welten-Packs (Folgerunde) | freiberuflich |

---

## 13. Risiken und Gegenmaßnahmen

| Risiko | Eintritt | Wirkung | Gegenmaßnahme |
|---|---|---|---|
| Plattform baut die Funktion nativ nach | mittel | hoch | Früher Pitch als Pilot-/Übernahmepartner; Community-Packs und Mehrsprachigkeit als Burggraben; Geschwindigkeit; offene API als Standard für Dritt-Tools |
| Spracherkennung versagt bei Dialekt, Lärm, Musik | mittel | mittel | Toleranz-Stufen, Lernfunktion, 3 Lesarten, externe Engines, Offline-Whisper, Handy als zweites Mikro, Szenen-Pad als Handsteuerung |
| Handy-only-Creator ohne OBS bleiben außen vor | hoch | hoch | Demo-Aufnahme ohne OBS, PWA-Fernbedienung, Mobile-Entwickler:in als erste Einstellung, Plattform-Integration als Ziel |
| Urheberrecht an Memes/GIFs/Sounds | niedrig–mittel | mittel | Eigene synthetische Sounds, kostenlose Sticker unter MIT-Lizenz, GIF-Provider mit API-Lizenz (KLIPY/GIPHY, verlinkt statt gespeichert), Attribution, Community-Upload mit Nutzungsbedingungen |
| Abhängigkeit von Browser-Spracherkennung (Google-Dienst) | mittel | mittel | Offline-Whisper, externe API, pluggbare Engine-Schnittstelle |
| Geringe Zahlungsbereitschaft bei Kleinst-Creatorn | mittel | mittel | Free-Stufe als Reichweite, Packs als niedrigschwelliger Kauf, Agentur- und B2B-Umsatz als zweites Standbein |
| Ein-Personen-Risiko | hoch | hoch | Dokumentation und Tests, frühe Einstellung, Beirat, Partnerprogramm |
| Plattform-Richtlinien (Stream-Key-Zugang, Chat-APIs, Quotas) | mittel | mittel | Mehrere Wege pro Plattform (LIVE Studio, Stream-Key, Webhook über Dritt-Tools), YouTube-Quota-Management, Fallback Handy |
| Datenschutz / Jugendschutz (Familien- und Bildungs-Segment) | niedrig | hoch | Lokale Verarbeitung ohne Cloud-Pflicht, keine Konten nötig, Kinderbuch-Theme ohne Tracking |
| Vision verzettelt das kleine Team | mittel | hoch | Pre-Seed finanziert nur WortBild; Erzählfilm, Studio und Räume erst nach Gate 2 mit der Folgerunde; Gates in Monat 3, 6, 12 und 18; XR nur als Schaufenster |
| Starker Wettbewerb bei Sprachlern-Apps und Video-Editoren | hoch | mittel | Nicht als Universal-App antreten, sondern über Sprache → Bild, TR/DE/EN, Vorlesen und lokale Verarbeitung |
| Lange Beschaffung im Bildungssektor | hoch | mittel | Familien-Abo und Verlage tragen das erste Jahr; Schullizenz über DigitalPakt-Budgets und Medienzentren |

---

## 14. Meilensteine

### 14.1 Die nächsten 18 Monate

Monat 1 = Closing der Pre-Seed-Runde im Januar 2027; Monat 18 = Juni 2028.

| Zeitraum | Produkt | Markt | Organisation und Finanzierung |
|---|---|---|---|
| **Q4 2026** | Version 2.1 (Leistungsmodus, 143 freie Sticker, Text-Sticker-Pakete, sichere GIF-Suche), Landingpage und Download-Paket (Windows/Mac), Onboarding-Assistent | Launch TR-Community, 10–20 Creator-Botschafter:innen, LinkedIn-Artikel DE/TR, Marketingvideo | Pre-Seed-Gespräche (250 T€), Marke anmelden, Beirat ansprechen |
| **Q1 2027** (Monat 1–3) | Pro-Abo live (Zahlung), erste Creator-Packs | TR-Launch (Markteintritt Phase 1) | Pre-Seed abgeschlossen (Monat 1); Mobile-/Web-Entwickler:in an Bord (Monat 3) – **Gate G0** |
| **Q2 2027** (Monat 4–6) | Mobile-App/PWA, WortBild mit 300 Wörtern und Lesehilfe | 20 Beta-Creator TR/DE, Community-Pack-Upload | **Gate G1** (Monat 6) |
| **Q3–Q4 2027** (Monat 7–12) | Marktplatz-Einträge (OBS, Streamlabs, Stream Deck), Agentur-Lizenz, Bildungs-Paket | DE/EN-Launch (Phase 2), Plattform- oder Bildungspilot (Monat 9), WortBild-Pilot in Kursen/Klassen | **Gate G2a** (Monat 12); Seed-Gespräche beginnen |
| **H1 2028** (Monat 13–18) | Stabilität und KI-Verstehen für Pro, Auswertung WortBild-Pilot | Partner, erste zahlende Schulen oder Kurse | **Gate G2** (Monat 18): Seed-Runde abgeschlossen, Ausbau-Team ab Monat 19 |

Messgrößen: registrierte Nutzer, aktive Streamer pro Woche, Conversion Free → Pro, monatlich wiederkehrender Umsatz, Pack-Umsatz, Anzahl Partner-Creator, Plattform-Gespräche mit Folgetermin.

### 14.2 Gates für 18 Monate

Alle Werte sind **Ziele (nicht erreicht)**. Ein Gate gilt als erfüllt, wenn mindestens die Schwelle (konservatives Szenario) erreicht ist; das Ziel ist das Basis-Szenario. Vorschlag – mit Investor:innen abstimmen.

| Gate | KPI | Ziel (Basis) | Schwelle (konservativ) | Optimistisch | Gibt frei |
|---|---|---|---|---|---|
| **G0** Start (Monat 3) | Pro-Abo live (Zahlung), Mobile-/Web-Entwickler:in an Bord | – | – | – | Budget Markteintritt Phase 2 |
| **G1** Aktivierung (Monat 6) | Registrierte Nutzer | 10.000 | 4.000 | 20.000 | Mobile-App/PWA-Release |
| G1 (Monat 6) | Zahlende Pro-Nutzer | 400 | 120 | 1.000 | |
| G1 (Monat 6) | 20 Beta-Creator TR/DE aktiv, 10–20 Botschafter:innen; WortBild mit 300 Wörtern | – | – | – | |
| G1 (Monat 6) | Woche-4-Retention aktiver Streamer ≥ 30 % (Ziel, erste Kohorten) | – | – | – | |
| **G2a** Traktion (Monat 12) | Registrierte Nutzer | 20.000 | 8.000 | 40.000 | DE/EN-Ausbau, Plattform-Gespräche |
| G2a (Monat 12) | Zahlende Pro-Nutzer (Jahresende J1) | 800 | 240 | 2.000 | |
| G2a (Monat 12) | Wiederkehrender Umsatz im Monat 12 (MRR) | 8.073 € | 2.500 € | 19.820 € | |
| G2a (Monat 12) | 1 Plattform- oder Bildungspilot gestartet; WortBild-Pilot in ≥ 3 Kursen/Klassen | – | – | – | |
| **G2** Folgerunde (Monat 18) | Registrierte Nutzer | 50.000 | 19.000 | 110.000 | Seed-Runde, Ausbau-Team ab Monat 19, Erzählfilm/Studio |
| G2 (Monat 18) | Zahlende Pro-Nutzer | 2.000 | 570 | 5.500 | |
| G2 (Monat 18) | Wiederkehrender Umsatz im Monat 18 (MRR) | 22.586 € | 6.495 € | 62.473 € | |
| G2 (Monat 18) | Monat-3-Retention Pro ≥ 75 %; Conversion Free → Pro ≥ 3 % (Schwelle) / 4 % (Ziel) | – | – | – | |
| G2 (Monat 18) | WortBild-Pilot ausgewertet; ≥ 5 zahlende Schulen oder Kurse | – | – | – | |

### 14.3 Vision 2027–2029

Die Reihenfolge folgt der Nähe zu Umsatz und Finanzierung: Die Pre-Seed-Runde finanziert nur **WortBild**; Erzählfilm, Studio und Räume starten nach Gate 2 mit der **Folgerunde** (ab Monat 19 = Juli 2028). Bühne und Klassenzimmer funktionieren schon heute.

| Zeitraum | Produkt | Markt / Vertrieb | Gate (Messgröße) |
|---|---|---|---|
| Q4 2026 | Prototypen Sprachenlernen und Live-Story, Zeitleistenformat LTF v1, Vision-Trailer DE/TR/EN | Pitch-Folien „Vision“, LinkedIn-Post | Prototypen offline mit 60 fps |
| 2027 (Pre-Seed, Monat 4–15) | WortBild mit 300 Wörtern, Lesehilfe, Sprecher-Audios DE/TR/EN, Didaktik-Prüfung, Nachsprechen | WortBild-Pilot in Kursen/Klassen, Bühnen- und Klassenzimmer-Preset | WortBild-Pilot in ≥ 3 Kursen/Klassen (G2a) |
| H1 2028 (Monat 13–18) | Auswertung WortBild-Pilot, Schullizenz | Listung bei Medienzentren, Seed-Runde | ≥ 5 zahlende Schulen oder Kurse (G2) |
| H2 2028 (Folgerunde, ab Monat 19) | Erzählfilm DE (Scene-Director, Figuren, Kamera) · Zeitleisten-Log und „Highlights finden“ · Datei-Import und Auto-Effekte | **Pro+ live**, Verlags-Pilot (eigene Reihe), Familien-Abo WortBild | Upgrade-Quote Pro → Pro+ |
| 2029 | Erzählfilm TR/EN und Welten-Packs · Timeline-Editor und MP4-Export · Companion „Hörbuch mit Bildern“ und AR am Handy · WebXR-/Brillen-Prototyp · Scene-SDK | Verlagsprogramm, Plattform-Pitch „Live → Clip“, Entscheidung XR/Brille, Plattform-Pilot oder Exit-Gespräch | unterzeichneter Plattform-Pilot |

Die Quartalsplanung in `VISION.md`, Abschnitt 10, beschreibt die volle Vision; wo ihre Termine abweichen, gilt dieser Abschnitt (Linien A, C und D kommen aus der Folgerunde).

---

## 15. Zukunft: Generative Scene Engine, Sprachenlernen, Auto-Edit, VR/AR

> Dieses Kapitel beschreibt geplante Funktionen (**Vision**). Das ausführliche Vision-Dokument ist `VISION.md`, die Prototypen liegen unter `prototypes/`, der Vision-Trailer unter `video/LiveFX_Vision_<de|tr|en>_<16x9|9x16>.mp4`.

### 15.1 Leitidee: zeichnen statt generieren

LiveFX wird von einem Meme-Overlay zur **Bildsprache für alles Gesprochene**: Was jemand erzählt, vorliest oder unterrichtet, erscheint in derselben Sekunde als fortlaufende Szene, als Wortbild mit Aussprache oder als fertig geschnittener Clip. Generative Video-KI berechnet jedes Pixel im Rechenzentrum und kostet nach Listenpreis 0,05–0,75 USD pro Sekunde [Quelle 24, 25], also 180–2.700 USD pro Stunde Begleitvideo, und ist live nicht möglich. LiveFX übersetzt einen Satz in ein Zustands-Delta von 200–500 Byte und **zeichnet** die Szene im Browser: 0 € ohne KI, 0,25–0,75 USD pro Stunde mit optionaler Text-KI (Projektmessung), 240- bis über 10.000-mal günstiger. Das Ergebnis ist bewusst eine stilisierte Bilderbuch-Welt, kein fotorealistisches Video.

```
Stimme/Datei ─► Transkript ─► Verstehen ─► Zeitleiste (LTF) ─► Bildschirme
                (lokal)       Matcher,     ein JSON-Format     Stream · Klassenzimmer · Bühne
                              Scene-       für alle Linien     Handy/AR · Brille
                              Director,                        Studio-Export (MP4)
                              opt. KI
```

Alle vier Linien teilen ein JSON-Format, die **LiveFX-Zeitleiste (LTF v1)**, und die vorhandenen Module (Spracherkennung, Matcher, Effekt-Engine, Mixer, Handy-Fernbedienung). Leistungsbudget: ein Canvas, ≤ 1.200 Partikel, Weltzustand ≤ 1 KB, Ziel 60 fps auf integrierter Grafik. WebGPU ist seit 2026 in allen großen Browsern verfügbar [Quelle 27] und wird nur optional genutzt.

### 15.2 Die vier Linien

| Linie | Was entsteht | Technik | Markt | Erlös (Schätzung) |
|---|---|---|---|---|
| **A · Erzählfilm** (Generative Scene Engine) | Während jemand erzählt oder vorliest, entsteht unter oder neben dem Live-Bild ein fortlaufender animierter Film aus Ort, Zeit, Wetter, Figuren, Aktion und Stimmung | Scene-Director übersetzt Sätze in Zustands-Deltas; Canvas zeichnet deterministisch; Lexikon 300–500 Einträge pro Sprache; KI nur optional | Hörbuch DE 374 Mio. € [Quelle 19]; 23,8 Mio. Podcast-Hörer:innen [Quelle 20]; KI-Video 3,67 Mrd. USD [Quelle 23] | Pro, Pro+ 14,99 €, Welten-Packs, Verlagslizenz, Scene-SDK |
| **B · WortBild** (Sprachenlernen, Lesehilfe) | Gesprochenes Wort → Bild + Wort in der Zielsprache + Aussprache; oder als Lesehilfe in der eigenen Sprache; Nachsprechen ohne Noten | Tabellen-Lookup, Systemstimmen per `speechSynthesis` [Quelle 29], Fallback Piper-TTS [Quelle 44]; offline, ohne Konto | Sprachlern-Apps 1,54 Mrd. USD [Quelle 33]; 307.000 neue Integrationskurs-Teilnehmende [Quelle 36]; DigitalPakt 2.0 [Quelle 40] | Familie 4,99 €/Monat, Schule 300–800 €/Jahr, Kurs 49 €/Lehrkraft, Vokabel-Packs |
| **C · Räume** (Bühne, Klassenzimmer, Hörbuch, AR/VR, Brille) | Dieselbe Zeitleiste auf LED-Wand, Beamer, Handy (AR, „Hörbuch mit Bildern“), VR-Headset und Display-Brille | Nur neue Ausgabeziele; Companion-Modus ohne Spracherkennung; WebXR mit DOM-Overlay [Quelle 47, 48] | Smart Glasses 13,6 Mio. Geräte [Quelle 45]; tonies 630 Mio. € [Quelle 50]; VJ-Software als Preis-Anker [Quelle 49] | Event 19–49 €/Tag bzw. 299 €/Jahr, Verlagslizenz; XR mit 0 € angesetzt |
| **D · Studio** (Live-Schnitt, Auto-Edit) | Highlights aus dem Stream; fertiges Video rein → Transkript → Effekte, Memes, Szenen, Schnitte automatisch → Export | Whisper im Browser [Quelle 60], WebCodecs mit Hardware-Encoder und Mediabunny [Quelle 57, 58, 59]; kein Upload | Videoschnitt 2,68 Mrd. USD [Quelle 51]; CapCut 736 Mio. MAU [Quelle 52]; OpusClip, Submagic, Descript als Preis-Anker [Quelle 53, 54, 55] | Free mit Wasserzeichen, Pro, Pro+ „Studio & Szenen“, Agentur, White-Label |

### 15.3 Sprachenlernen im Detail

Ein Kind sagt „Apfel“ – es erscheint 🍎, darunter „elma“, klein „der Apfel“ mit farbigem Artikel und Silben, und eine Stimme spricht „elma“. Die Lehrkraft wählt nur „Ich spreche“, „Zeige“ und den Modus (Übersetzen, Lesehilfe, Nachsprechen). Zielgruppen sind Familien, Grundschulen (20,4 % der Schüler:innen unter 16 sprechen zu Hause vorwiegend eine andere Sprache [Quelle 37]; 25 % der Viertklässler:innen liegen unter dem Lese-Mindeststandard [Quelle 39]), DaZ- und Integrationskurse sowie Türkisch als Herkunftssprache (2,65 Mio. Menschen mit Einwanderungsgeschichte aus der Türkei [Quelle 38]). Die Lesehilfe knüpft an die Neurodiversitäts-Bücher des Gründers an. Preis-Anker ist die ANTON-Schullizenz mit 250–700 € pro Schule und Jahr [Quelle 41]; kostenlose Konkurrenz sind Microsoft Reading Coach [Quelle 42] und Google Read Along [Quelle 43]. Für Schulen erzwingt das Schulprofil Spracherkennung auf dem Gerät (`processLocally`, Chrome 139+ [Quelle 28]) oder Offline-Whisper.

### 15.4 Auto-Edit im Detail

LiveFX Studio hat zwei Türen: **Live → Highlights** (nach dem Stream 3–5 Kurzclips an den Stellen mit den meisten Memes, Geschenken und Chat-Nachrichten) und **Datei rein** (eine MP4 ins Fenster ziehen, LiveFX hört lokal zu, schlägt Effekte, Szenen, Zooms und Schnitte als verschiebbare Chips vor und exportiert per Hardware-Encoder). Die Vorschau zeichnet die Effekte live, gerendert wird nur einmal beim Export. Weil kein Upload und kein Cloud-Transcoding anfallen, liegen die Grenzkosten pro Video bei null, Minutenkontingente entfallen. LiveFX tritt nicht als Universal-Editor gegen CapCut an, sondern über Sprache → Effekt, Story-Szenen, TR/DE/EN und lokale Verarbeitung. Canva kaufte im Februar 2026 Cavalry und MangoAI [Quelle 56] – ein Signal, dass Editor-Anbieter genau solche Bausteine zukaufen.

### 15.5 VR/AR und weitere Anwendungsfelder

- **Bühne und Events** (heute nutzbar): „Applaus!“ → Konfetti auf der LED-Wand; das Handy ist die Regie.
- **Klassenzimmer:** Erzählfilm am Beamer, WortBild auf den Tablets.
- **Hörbuch und Podcast mit Bildern:** Der Companion-Modus spielt eine fertige Zeitleiste synchron zum Audio, ganz ohne Spracherkennung auf dem Gerät.
- **AR am Handy** (alle Handys, auch iPhone): Der Drache aus der Geschichte steht auf dem Küchentisch; Clips werden geteilt und wirken als Reichweitenmotor.
- **VR und Display-Brillen:** Szenenhimmel als Kuppel, WortBild-Karte im Blickfeld; Meta öffnete die Ray-Ban Display im Mai 2026 für Web-Apps [Quelle 46]. Bis 2029 Schaufenster und Partnerschaftsthema, **keine Umsatzlinie**.

### 15.6 Preisarchitektur (Schätzung)

| Stufe | Preis | Neu durch die Vision |
|---|---|---|
| Free | 0 € | Erzählfilm mit einer Welt, WortBild mit 200 Wörtern, 3 Highlights mit Wasserzeichen |
| Pro | 9,99 €/Monat | alle Grundwelten, Band und Split, alle WortBild-Listen, Highlights ohne Wasserzeichen, Live-Editor |
| Pro+ „Studio & Szenen“ | 14,99 €/Monat | KI-Szenen, Auto-Edit aus Datei, MP4-Export, Batch, Hörbuch-Visualizer |
| WortBild Familie | 4,99 €/Monat | Sprachenlernen und Lesehilfe ohne Streaming-Funktionen |
| Packs | 2,99–4,99 € | Welten-, Vokabel- und Stil-Packs |
| Lizenzen | Schule 300–800 €/Jahr · Kurs 49 €/Lehrkraft/Jahr · Event 19–49 €/Tag bzw. 299 €/Jahr · Verlag [2.000 €] pro Titel und Jahr (Schätzung, vom Gründer zu prüfen) · SDK nach Vereinbarung | Bildung, Bühne, Verlage, Plattformen |

Die Erlöse daraus stehen getrennt in Abschnitt 11.5, die Meilensteine in Abschnitt 14.2.

### 15.7 Warum das für Plattformen zählt

Plattformen wandeln Sprache heute in Untertitel um, in Echtzeit und kostenlos. LiveFX wandelt Sprache mit derselben Rechenlast in Bilder, Szenen, Lernkarten und Schnitte um. Eine Plattform kann damit jedem Live-Creator einen „produzierten“ Stream geben, ohne zusätzliche GPU-Server – bei über 100 Mio. Creatorn, die allein in einigen Regionen 2025 auf TikTok live gingen [Quelle 2]. Jede Minute Verweildauer zahlt auf Geschenke ein [Quelle 5, 8], und aus jeder Stream-Zeitleiste entstehen Shorts von selbst: Live wird zur Quelle für Kurzvideo.

### 15.8 Risiken der Vision

| Risiko | Gegenmaßnahme |
|---|---|
| Erwartung „KI-Video wie im Werbespot“ | als animiertes Bilderbuch positionieren, Stil als Stärke |
| Mehrdeutigkeit und Metaphern im Erzählfilm | Negativliste, Kontextregeln, Reaktion „sicher“, Taste „Zurück“ |
| Systemstimmen fehlen (z. B. Türkisch auf älteren Geräten) | Selbsttest, eingesprochene Audios, Piper-TTS |
| Browser-Grenzen bei langen oder 4K-Videos | Längenlimit, Desktop zuerst, WebM-Fallback |
| Urheberrecht beim Export | nur eigene Sounds, GIFs mit Lizenz, Hinweis im Export-Dialog |
| Kleine Hardware-Basis bei XR und Brillen | nur Schaufenster, Entscheidung 2029 bei nachgewiesener Nachfrage |
| Wirkung beim Lernen übertreiben | „unterstützt Vokabellernen“, fachliche Prüfung durch den Edtech-Beirat |

---

## 16. Anhang

### 16.1 Quellen

1. market.us – Live Streaming Market Report (Marktgröße, CAGR 26,7 %): https://market.us/report/live-streaming-market/
2. Gyre – Live Streaming Statistics (Marktgröße, TikTok-LIVE-Creator-Wachstum): https://gyre.pro/blog/live-streaming-statistics-insights-from-platforms-to-profit
3. datarefs – Creator Economy Statistics (216 Mrd. USD, Live-Anteil ~14 %): https://www.datarefs.com/statistics/social-media/creator-economy/
4. New Market Pitch – Creator Economy Market Size (260 Mrd. USD, CAGR 22 %): https://newmarketpitch.com/blogs/news/creator-economy-market-size
5. InfluencerFee – TikTok LIVE Gifting Revenue Guide (Geschenkanteil, 500–3.000 USD/Monat, 50 % Creator-Anteil): https://influencerfee.com/blog/tiktok-live-gifting-revenue-guide/
6. Muvi – How to make money on TikTok LIVE (Geschenkanteil ~50 %): https://www.muvi.com/blogs/how-to-make-money-on-tiktok-live/
7. TTS Vibes – TikTok LIVE Gift Conversion Rate by Viewer: https://insights.ttsvibes.com/tiktok-live-gift-conversion-rate-by-viewer
8. Shopify TR – TikTok ne kadar ödeme yapıyor (Jeton-Preise, Kommission): https://www.shopify.com/tr/blog/tiktok-ne-kadar-odeme-yapiyor
9. Juntire – TikTok canlı yayın para kazanma 2026 (Voraussetzungen, Jeton-Preise): https://juntire.com/blog/tiktok-canli-yayin-para-kazanma-2026
10. Milliyet – TikTok jeton ve hediye fiyatları 2025: https://www.milliyet.com.tr/teknoloji/sosyalmedya/tiktok-jeton-ve-hediye-fiyatlari-2025-tiktok-puan-hesaplamasi-nasil-yapilir-6659460
11. Capterra – Streamlabs (Preise): https://www.capterra.com/p/228751/Streamlabs/
12. CreatorStackClub – Streamlabs, StreamYard, Restream (Preise): https://www.creatorstackclub.com/software/streamlabs
13. ToolChase – Voicemod (Preise, Funktionen): https://toolchase.com/tool/voicemod/
14. BIGVU – How to get a TikTok stream key (1.000 Follower, 18+): https://bigvu.tv/blog/how-to-get-a-tiktok-stream-key/
15. SMMNut – TikTok LIVE Studio Guide 2026: https://smmnut.com/blog/tiktok-live-studio-guide-2026/
16. OBS Versions – OBS TikTok Live Streaming Guide: https://obs-versions.com/blog/obs-tiktok-live-streaming-guide
17. Instagram – Instagram Live Producer (Desktop-Streaming mit OBS): https://about.instagram.com/blog/tips-and-tricks/instagram-live-producer
18. StreamYard – Streaming software for Instagram Live: https://streamyard.com/blog/streaming-software-for-instagram-live
19. Börsenverein – Buchmarkt kompakt 2025/2026 (Hörbuch 374 Mio €, +13 %): https://www.boersenverein.de/fileadmin/bundesverband/dokumente/presse/digitale_pressemappen/WIPK/Buchmarkt_kompakt_2025_2026_Zahlenuebersicht.pdf
20. ARD/ZDF-Medienstudie 2025 (Podcast 34 %, 23,8 Mio): https://www.media-perspektiven.de/fileadmin/user_upload/media-perspektiven/pdf/2025/MP_30_2025_ARD_ZDF-Medienstudie_Zuwachs_bei_Podcastnutzung_nach_Jahren_der_Stagnation.pdf
21. TechCrunch – YouTube über 1 Mrd monatliche Podcast-Zuschauer: https://techcrunch.com/2025/02/26/youtube-surpasses-1-billion-monthly-podcast-viewers/
22. Stiftung Lesen – Vorlesemonitor 2024: https://www.stiftunglesen.de/ueber-uns/newsroom/pressemitteilung-detail/vorlesemonitor-2024-jedem-dritten-kind-fehlen-praegende-vorleseerfahrungen
23. Meticulous Research – KI-Videogenerierung und -schnitt 2026–2036: https://www.meticulousresearch.com/product/ai-video-generation-and-editing-software-market-forecast-6359
24. Google – Gemini API Pricing (Veo 3.1 Lite 0,05 USD/s): https://ai.google.dev/gemini-api/docs/pricing
25. Veo 3 API Pricing 2026 (bis 0,75 USD/s): https://www.veo3ai.io/blog/veo-3-api-pricing-2026
26. CNBC – Synthesia: Bewertung und ARR: https://www.cnbc.com/2026/01/26/nvidia-alphabet-vc-arms-back-synthesia.html
27. web.dev – WebGPU in allen großen Browsern: https://web.dev/blog/webgpu-supported-major-browsers
28. Chrome 139 – Spracherkennung auf dem Gerät (`processLocally`): https://developer.chrome.com/blog/new-in-chrome-139
29. MDN – SpeechSynthesis: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
30. Google Noto Emoji (Apache 2.0): https://github.com/googlefonts/noto-emoji
31. OpenMoji FAQ (CC BY-SA 4.0): https://openmoji.org/faq/
32. Duolingo – Aktionärsbrief Q2 2026 (SEC): https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm
33. Business of Apps – Language Learning App Market: https://www.businessofapps.com/data/language-learning-app-market/
34. Mordor Intelligence – Language Learning Market: https://www.mordorintelligence.com/industry-reports/language-learning-market
35. GlobeNewswire – Lingokids 120 Mio USD: https://www.globenewswire.com/news-release/2025/09/18/3152590/0/en/Lingokids-raises-120M-in-funding-to-expand-its-position-as-the-1-interactive-app-for-kids.html
36. BAMF – Integrationskurszahlen 2025: https://www.bamf.de/DE/Themen/Statistik/Integrationskurszahlen/integrationskurszahlen-node.html
37. bpb – Schüler:innen mit anderer Familiensprache: https://www.bpb.de/themen/bildung/dossier-bildung/519697/schueler-innen-mit-einer-anderen-familiensprache-als-deutsch/
38. Destatis – Einwanderungsgeschichte 2025: https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/04/PD26_128_125.html
39. Deutsches Schulportal – IGLU-Lesekompetenz: https://deutsches-schulportal.de/bildungswesen/iglu-studie-lesekompetenz-der-viertklaessler-verschlechtert-sich-deutlich/
40. Deutsches Schulportal – DigitalPakt 2.0: https://deutsches-schulportal.de/bildungswesen/was-hat-der-digitalpakt-schule-bislang-gebracht/
41. ANTON – Schullizenz-Bestellunterlagen: https://files.anton.app/files/ANTON-Schullizenz-Bestellunterlagen-DE.pdf
42. Microsoft – Reading Coach: https://techcommunity.microsoft.com/blog/educationblog/reading-coach-the-ai-powered-fluency-practice-tool-is-now-generally-available-in/4291953
43. Google – Read Along: https://readalong.google/
44. Piper TTS: https://github.com/rhasspy/piper
45. IDC – Smart Glasses 2026: https://www.idc.com/resource-center/blog/smart-glasses-surge-the-xr-market-is-rewriting-its-own-rules/
46. gHacks – Meta Ray-Ban Display für Web-Apps geöffnet: https://www.ghacks.net/2026/05/18/meta-opens-ray-ban-display-glasses-to-third-party-developers-through-wearables-toolkit/
47. W3C Immersive Web – WebXR DOM Overlays: https://immersive-web.github.io/dom-overlays/
48. MDN – WebXR Device API: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
49. Resolume – Avenue/Arena Preise: https://www.resolume.com/software/avenue-arena
50. Musikwoche – tonies Umsatz 2025: https://musikwoche.de/recorded-publishing/tonies-steigerte-umsatz-und-gewinn-a2f6b99ac4f426723ff1690ecb65e839/
51. The Business Research Company – Video Editing Software: https://www.thebusinessresearchcompany.com/report/video-editing-software-global-market-report
52. Expanded Ramblings – CapCut-Statistiken (Sensor Tower): https://expandedramblings.com/index.php/capcut/
53. Sacra – OpusClip: https://sacra.com/c/opusclip/
54. ngram – OpusClip vs. Submagic (Preise): https://www.ngram.com/blog/opus-clip-vs-submagic
55. Castmagic – Descript Pricing: https://www.castmagic.io/blog/descript-pricing
56. CNBC – Canva kauft Cavalry und MangoAI: https://www.cnbc.com/2026/02/23/canva-acquires-cavalry-for-motion-graphics-and-mangoai-for-video-ads.html
57. caniuse – WebCodecs: https://caniuse.com/webcodecs
58. WebKit – Features in Safari 26.0 (AudioEncoder): https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
59. Mediabunny: https://mediabunny.dev/
60. Xenova – whisper-web (WebGPU): https://github.com/xenova/whisper-web

Quellen 1–18 abgerufen am 30.09.2026, Quellen 19–60 am 03.10.2026. Produktangaben (Trigger-, Szenen- und Sound-Zahlen, Latenz, KI-Kosten) stammen aus dem Projekt selbst (`CHANGELOG.md`, `README.md`, `docs/`).

### 16.2 Begleitdokumente

- `LiveFX_Finanzmodell.xlsx` – Finanzmodell zur 250-T€-Pre-Seed-Runde (GuV 5 Jahre, Mittelverwendung, Liquidität monatlich, Gates, Bewertung, Sensitivität; Quelle der Zahlen in Kapitel 11)
- `VISION.md` – Vision 2027–2029 (Erzählfilm, WortBild, Räume, Studio)
- `prototypes/sprachlernen.html`, `prototypes/live-story.html` – Prototypen der Vision
- `video/LiveFX_Vision_*.mp4` – Vision-Trailer (DE/TR/EN, 16:9 und 9:16)
- `MARKTANALYSE.md` – ausführliche Marktanalyse
- `PITCH-DECK.md` / `LiveFX_Pitch.pptx` (DE), `LiveFX_Pitch_TR.pptx`, `LiveFX_Pitch_EN.pptx` – Pitch-Deck
- `LINKEDIN.md` – Vorstellungsartikel DE/TR
- `../README.md`, `../CHANGELOG.md`, `../docs/` – Produktdokumentation
