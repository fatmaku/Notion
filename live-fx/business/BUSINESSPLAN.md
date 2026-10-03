# LiveFX – Businessplan

**Live-Streams, die zuhören.** Memes, Sounds und animierte Szenen in Echtzeit – ausgelöst durch die Stimme des Creators.

Stand: Oktober 2026 · Produktstand: Version 1.6 · Vertraulich
Gründerin: [Name] · Kontakt: [E-Mail] · [Ort]

> Alle Marktzahlen stammen aus öffentlichen Sekundärquellen und werden als Spannen angegeben; Nachweise als [Quelle n] im Text, Liste im Anhang. Eigene Annahmen sind ausdrücklich als „Schätzung“ gekennzeichnet. Zahlen in [eckigen Klammern] ergänzt die Gründerin.

---

## 1. Executive Summary

**LiveFX** macht Live-Streams so lebendig wie geschnittene Kurzvideos. Die Software hört dem Creator zu und blendet in unter einer Sekunde passende Memes, GIFs, Sounds, Texteffekte oder ganze animierte Szenen in den Stream ein – hands-free, in drei Sprachen (Türkisch, Deutsch, Englisch, automatisch erkannt), kompatibel mit TikTok LIVE, Instagram Live, YouTube Live und Twitch über OBS/Streamlabs.

| | |
|---|---|
| **Problem** | Alles, was Kurzvideos viral macht, entsteht *nach* der Aufnahme im Schnitt. Live ist roh. Bestehende Tools reagieren auf Zuschauer-Events oder Tastendruck – keines auf das gesprochene Wort. |
| **Lösung** | Sprache → Effekt. Stichwort-Matching mit Dialekt-Toleranz und Lernfunktion, optional KI-Verstehen ohne Stichwort, Story-Modus für Vorlesen, Zuschauer-Trigger per Chat und Geschenk, Handy-Fernbedienung. |
| **Status** | Version 1.6, funktionsfähig, 238 fertige Trigger in fünf Paketen, 13 Szenen, 38 Sounds, automatisierte Tests, im Einsatz in den eigenen Live-Streams der Gründerin. |
| **Markt** | Live-Streaming weltweit 2026: 97–157 Mrd. USD [Quelle 1, 2]; Creator Economy ~216–260 Mrd. USD [Quelle 3, 4]; Geschenke ≈ 50 % des Einkommens von TikTok-LIVE-Streamern [Quelle 5, 6]. |
| **Geschäftsmodell** | Free + Pro-Abo (9,99 €/Monat), Creator-Packs (2,99–4,99 €), Agentur-Lizenz, B2B-Plattformlizenz; strategischer Exit an TikTok/Meta/YouTube. |
| **Go-to-Market** | Türkischsprachige Creator-Community zuerst, dann DE/EN; eigene Streams als Showcase; Creator-Partnerprogramm; LinkedIn und Presse. |
| **Bedarf** | Mobile-Entwickler:in, Plattform-Partnerschaften, Pilot-Partner; Seed-Finanzierung [250–350 T€] für 18–24 Monate (Schätzung) oder Bootstrapping mit langsamerem Wachstum. |

Ask: Pilot-Partnerschaft mit einer Plattform (TikTok LIVE Studio, Instagram Live Producer, YouTube Live) oder einem Creator-Tool-Anbieter – alternativ Übernahme von Technologie und Team.

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

## 3. Das Produkt (Stand 1.6)

### 3.1 In einem Satz

Der Creator redet – LiveFX hört zu. Sagt sie „krass“, „oh nein“, „Applaus“, „yok artık“ oder „bruh“, erscheint in unter einer Sekunde das passende Meme im Stream und der passende Sound spielt. Liest sie vor – „es regnete“, „in der Nacht“, „der Drache“ – verwandelt sich das Overlay in eine animierte Szene mit Atmosphäre-Klang.

```
Mikro ─► Spracherkennung (auto DE/TR/EN) ─► Matcher (Dialekt-Toleranz) ──┐
                                        └► KI-Verstehen (optional) ──────┤
Zuschauer-Chat / Geschenk / Handy / Stream Deck ─► HTTP-API (Token) ─────┼─► Bridge ─► Overlay in OBS ─► Stream
Panel: Meme-Pakete, GIF-Suche, Uploads, Trigger-Editor, Themes ──────────┘
```

### 3.2 Funktionsumfang

| Bereich | Stand 1.6 |
|---|---|
| **Spracherkennung** | Drei Sprachen (Deutsch, Türkisch, Englisch) mit **automatischer Sprachwahl** beim Sprechen; Varianten DE/AT/CH, US/GB/IN. Browser-Engine (Chrome/Edge), externe Engines (Whisper, Deepgram) per API oder **Offline-Whisper** direkt im Browser. Reaktion „schnell“ (Zwischenergebnisse) oder „sicher“ (ganze Sätze), 3 Lesarten, Selbsttest, Pegel- und Latenzanzeige. |
| **Dialekt und Lernen** | Unscharfes Matching in drei Stufen („grass“ → krass, „helal olsn“ → helal olsun) mit Schutz vor Fehltreffern. Nicht erkannte Sätze werden per Klick einem Trigger zugeordnet – beim nächsten Mal sitzt es. |
| **Meme-Pakete** | Türkçe (85), Deutsch (49), English (50), Familie & Kinder (27), Gaming (27) = **238 Trigger**, per Klick ladbar und wieder entfernbar. |
| **GIF-Suche und Medien** | Tenor/Giphy-Suche direkt im Panel, Import mit Prüfung, „Als Trigger“ in einem Schritt; eigene PNG/JPG/GIF/WebP und MP3/WAV/OGG bis 8 MB. |
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

Startsegment ist die **türkischsprachige Creator-Community** (Türkei und Diaspora in Deutschland/Europa): größtes Paket, kaum Wettbewerb, ausgeprägte Meme-Kultur, und die Gründerin ist selbst Teil dieser Community.

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
7. **Aus der Praxis.** Entwickelt und getestet in den eigenen Live-Streams der Gründerin (Ton-Check, Echo-Warnung, Safe-Zones kommen aus echten Problemen).

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

**Phase 1 – Türkische Community (Monat 1–4).** Launch im türkischsprachigen Raum: eigene Streams der Gründerin als dauerhafter Showcase, 10–20 Creator-Botschafter:innen mit Zugang und Feedback-Schleife über die Lernfunktion, Discord/Telegram-Gruppe, wöchentliche Pack-Drops. Clips aus echten Streams („Das Meme kam, weil ich ‚yok artık‘ gesagt habe“) sind das Marketing – das Produkt ist sein eigener Werbeträger.

**Phase 2 – DE/EN (Monat 4–9).** Deutschsprachige Creator (Twitch, YouTube, Instagram) und englischsprachige Early Adopters; Vorlese- und Bildungs-Streams als zweiter Flügel (Buchhandel, Bibliotheken, Lehrkräfte-Communities). Einträge in OBS-Plugin-Verzeichnissen, Streamlabs-App-Store, Stream-Deck-Marketplace.

**Phase 3 – Partner und Plattformen (Monat 6–12).** Creator-Partnerprogramm (Umsatzbeteiligung an Packs, „powered by LiveFX“ optional), Agenturen, erste B2B-Gespräche. Pitch-Deck und Demo an die Live-Teams von TikTok, Meta und YouTube.

**Kanäle**

| Kanal | Maßnahme | KPI |
|---|---|---|
| Eigene Streams | LiveFX in jedem Stream der Gründerin, Clips als Shorts/Reels | Clips/Woche, Views, Downloads |
| Creator-Partnerprogramm | 10–20 Botschafter:innen TR/DE, Umsatzbeteiligung an Packs | aktive Partner, Referral-Registrierungen |
| LinkedIn und Presse | Vorstellungsartikel (DE/TR), Fachpresse Creator-Economy/Edtech, Podcasts | Kontakte zu Plattform-Teams, Pilot-Anfragen |
| Community | Discord/Telegram, Pack-Drops, Lernfunktion als Feedback-Kanal | aktive Mitglieder, eingereichte Trigger |
| Marktplätze | OBS-Plugins, Streamlabs-Apps, Stream Deck | Installationen |
| Bildung | Vorlese-Demos mit Kinderbuch-Theme, Lehrkräfte-Webinare | Pilot-Klassen, Bildungs-Packs |

---

## 11. Finanzplan (3 Jahre) – Schätzung

Alle Zahlen sind **Schätzungen** der Gründerin auf Basis der Annahmen unten; es gibt noch keine Umsätze. Jahr 1 beginnt mit dem Launch des Pro-Abos.

### 11.1 Annahmen

| Annahme | Konservativ | Basis | Optimistisch |
|---|---|---|---|
| Registrierte Nutzer (Jahresende) J1 / J2 / J3 | 8.000 / 30.000 / 80.000 | 20.000 / 80.000 / 250.000 | 40.000 / 180.000 / 500.000 |
| Conversion Free → Pro | 3 % | 4 % | 5 % |
| ARPU Pro (netto, Mix Monat/Jahr) | 8,50 €/Monat | 8,50 €/Monat | 8,50 €/Monat |
| Pack-Käufe pro Jahr (Anteil der Nutzer × 1 Pack à Ø 3,99 €) | 7 % | 10 % | 12 % |
| Agentur-Lizenzen (Jahresende) J1 / J2 / J3 à 49 €/Monat | 2 / 8 / 25 | 3 / 15 / 40 | 5 / 30 / 80 |
| B2B-Pilot/Lizenz | 0 / 0 / 50 T€ | 0 / 50 / 150 T€ | 0 / 100 / 400 T€ |
| Zahlende Pro-Nutzer werden als Jahresdurchschnitt gerechnet (≈ 50 % des Jahresendwerts in J1, 75 % in J2/J3) | | | |

### 11.2 Umsatz (T€)

| | Konservativ | | | Basis | | | Optimistisch | | |
|---|---|---|---|---|---|---|---|---|---|
| | J1 | J2 | J3 | J1 | J2 | J3 | J1 | J2 | J3 |
| Pro-Abo | 12 | 69 | 184 | 41 | 245 | 765 | 102 | 689 | 1.913 |
| Creator-Packs | 2 | 8 | 22 | 8 | 32 | 100 | 19 | 86 | 240 |
| Agentur-Lizenz | 1 | 4 | 12 | 2 | 9 | 24 | 3 | 18 | 48 |
| B2B / Pilot | 0 | 0 | 50 | 0 | 50 | 150 | 0 | 100 | 400 |
| **Gesamt** | **15** | **81** | **268** | **51** | **336** | **1.039** | **124** | **893** | **2.601** |

### 11.3 Kosten (T€) – Basis-Szenario

| Position | J1 | J2 | J3 |
|---|---|---|---|
| Personal: Mobile-/Web-Entwicklung | 75 | 160 | 240 |
| Personal: Backend/ML (ab J2), Community/Support (ab J2) | 0 | 60 | 160 |
| Gründerin (Gehalt) | 30 | 48 | 60 |
| Freelance Design, Sound, Illustration (Packs) | 15 | 25 | 40 |
| Marketing, Creator-Partnerprogramm, Events | 25 | 60 | 120 |
| Infrastruktur, KI-API (nur Pro), Store-Gebühren | 8 | 25 | 60 |
| Recht, Marke, Steuer, Verwaltung | 12 | 20 | 30 |
| **Gesamt** | **165** | **398** | **710** |

Konservativ wird mit einem kleineren Team geplant (Kosten ≈ 120 / 230 / 330 T€), optimistisch mit schnellerem Aufbau (≈ 190 / 520 / 1.100 T€).

### 11.4 Ergebnis (T€)

| Szenario | J1 | J2 | J3 | Kumuliert nach 3 Jahren |
|---|---|---|---|---|
| Konservativ | −105 | −149 | −62 | −316 |
| **Basis** | **−114** | **−62** | **+329** | **+153** |
| Optimistisch | −66 | +373 | +1.501 | +1.808 |

**Finanzierungsbedarf (Schätzung):** 250–350 T€ Seed für 18–24 Monate decken das Basis-Szenario bis zum Break-even in Jahr 3 inklusive Puffer. Alternative: Bootstrapping – Pro-Abo und Packs finanzieren eine:n Entwickler:in in Teilzeit, das Wachstum verlangsamt sich entsprechend (ungefähr konservatives Szenario). Förderprogramme (EXIST, Gründungsstipendien, Medien-/Edtech-Förderung) werden parallel geprüft.

---

## 12. Team und Bedarf

**Gründerin [Name].** Autorin einer fünfbändigen Kinderbuchreihe zu Neurodiversität (Türkisch, mit Buch-Trailern), Live-Streamerin, deutsch-türkisch, Produktvision und Community. Nutzt LiveFX in jedem eigenen Stream – Vorlesen mit Story-Modus ist aus der eigenen Praxis entstanden.

**Entwicklung bisher.** KI-gestützt aufgebaut, mit dokumentierter Architektur (Schema, Contracts, Design-Dokumente), Changelog und automatisierten Tests – ein Stand, den ein Entwicklungsteam direkt übernehmen kann.

**Gesucht**

| Rolle | Warum | Zeitpunkt |
|---|---|---|
| **Mobile-Entwickler:in** (iOS/Android, WebView/PWA, später SDK) | Handy-first-Creator ohne OBS erreichen; Vorstufe zur Plattform-Integration | sofort / Jahr 1 |
| Backend/ML-Entwickler:in | Streaming-ASR < 300 ms, Offline-Modelle, KI-Verstehen als Standard | Jahr 2 |
| Community- und Partnermanagement (TR/DE) | Creator-Partnerprogramm, Packs, Support | Jahr 1–2 (Teilzeit → Vollzeit) |
| **Partnerschaften** | Plattform-Pilot (TikTok LIVE Studio, Instagram Live Producer, YouTube), Streaming-Software, Bildungsträger, Verlage | laufend |
| Beirat | Creator-Manager:in TR, ehemalige Produktverantwortliche „Live“ einer Plattform, Edtech | Jahr 1 |

---

## 13. Risiken und Gegenmaßnahmen

| Risiko | Eintritt | Wirkung | Gegenmaßnahme |
|---|---|---|---|
| Plattform baut die Funktion nativ nach | mittel | hoch | Früher Pitch als Pilot-/Übernahmepartner; Community-Packs und Mehrsprachigkeit als Burggraben; Geschwindigkeit; offene API als Standard für Dritt-Tools |
| Spracherkennung versagt bei Dialekt, Lärm, Musik | mittel | mittel | Toleranz-Stufen, Lernfunktion, 3 Lesarten, externe Engines, Offline-Whisper, Handy als zweites Mikro, Szenen-Pad als Handsteuerung |
| Handy-only-Creator ohne OBS bleiben außen vor | hoch | hoch | Demo-Aufnahme ohne OBS, PWA-Fernbedienung, Mobile-Entwickler:in als erste Einstellung, Plattform-Integration als Ziel |
| Urheberrecht an Memes/GIFs/Sounds | niedrig–mittel | mittel | Eigene synthetische Sounds, GIF-Provider mit API-Lizenz (Tenor/Giphy), Attribution, Community-Upload mit Nutzungsbedingungen |
| Abhängigkeit von Browser-Spracherkennung (Google-Dienst) | mittel | mittel | Offline-Whisper, externe API, pluggbare Engine-Schnittstelle |
| Geringe Zahlungsbereitschaft bei Kleinst-Creatorn | mittel | mittel | Free-Stufe als Reichweite, Packs als niedrigschwelliger Kauf, Agentur- und B2B-Umsatz als zweites Standbein |
| Ein-Personen-Risiko | hoch | hoch | Dokumentation und Tests, frühe Einstellung, Beirat, Partnerprogramm |
| Plattform-Richtlinien (Stream-Key-Zugang, Chat-APIs, Quotas) | mittel | mittel | Mehrere Wege pro Plattform (LIVE Studio, Stream-Key, Webhook über Dritt-Tools), YouTube-Quota-Management, Fallback Handy |
| Datenschutz / Jugendschutz (Familien- und Bildungs-Segment) | niedrig | hoch | Lokale Verarbeitung ohne Cloud-Pflicht, keine Konten nötig, Kinderbuch-Theme ohne Tracking |

---

## 14. Meilensteine (12 Monate)

| Quartal | Produkt | Markt | Organisation |
|---|---|---|---|
| **Q4 2026** | Landingpage und Download-Paket (Windows/Mac), Onboarding-Assistent, Live-Commerce-Trigger im Standardpaket | Launch TR-Community, 10–20 Creator-Botschafter:innen, LinkedIn-Artikel DE/TR, Marketingvideo | Marke anmelden, Seed-Gespräche, Beirat ansprechen |
| **Q1 2027** | Pro-Abo live (Zahlung), erste Creator-Packs, Community-Pack-Upload (Beta), Streaming-ASR-Test < 300 ms | DE/EN-Launch, Marktplatz-Einträge (OBS, Streamlabs, Stream Deck), Vorlese-Pilot mit [Zahl] Lehrkräften/Autor:innen | Mobile-Entwickler:in eingestellt |
| **Q2 2027** | Mobile-App (Fernbedienung + Mikro, Stores), Bildungs-Paket, Agentur-Lizenz (Mehrplatz) | Creator-Partnerprogramm offiziell, erste Agenturen, Presse Edtech/Creator Economy | Seed abgeschlossen oder Bootstrapping-Pfad bestätigt |
| **Q3 2027** | Marktplatz offen, KI-Verstehen als Pro-Standard, SDK-Prototyp | Plattform-Pilot gestartet (Ziel: ein Partner), [Zahl] registrierte Nutzer, [Zahl] Pro-Abos | Community/Support-Rolle besetzt |

Messgrößen: registrierte Nutzer, aktive Streamer pro Woche, Conversion Free → Pro, Pack-Umsatz, Anzahl Partner-Creator, Plattform-Gespräche mit Folgetermin.

---

## 15. Anhang

### 15.1 Quellen

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

Abgerufen am 30.09.2026. Produktangaben (Trigger-, Szenen- und Sound-Zahlen, Latenz, KI-Kosten) stammen aus dem Projekt selbst (`CHANGELOG.md`, `README.md`, `docs/`).

### 15.2 Begleitdokumente

- `MARKTANALYSE.md` – ausführliche Marktanalyse
- `PITCH-DECK.md` / `LiveFX_Pitch.pptx` – Pitch-Deck
- `LINKEDIN.md` – Vorstellungsartikel DE/TR
- `../README.md`, `../CHANGELOG.md`, `../docs/` – Produktdokumentation
