# LiveFX – Pitch-Deck (13 Folien, Stand 1.6)

> Text-, Struktur- und Notizen-Vorlage. Die PowerPoint-Fassung `LiveFX_Pitch.pptx` (16:9, dunkles Theme,
> Screenshots aus `landing-assets/`) folgt genau diesem Aufbau; die *Sprechernotizen* sind dort hinterlegt.
> Platzhalter in eckigen Klammern (`[Name]`, `[Zahl]`) bewusst nicht ausgefüllt – keine erfundenen Zahlen.
> Marktzahlen: Quellen in `QUELLEN.md`; Schätzungen sind als solche markiert.

---

## Folie 1 – Titel

**LiveFX**
*Deine Stimme wird zum Effekt.*
Memes, Sounds und Szenen in Echtzeit – ausgelöst durch das, was der Creator sagt.
[Name] · Gründerin, Autorin & Live-Streamerin · [Datum] · [E-Mail]

> **Notizen:** Kurz vorstellen: Ich streame selbst, ich schreibe Bücher, und ich habe LiveFX gebaut, weil ich im
> Live-Stream genau das vermisst habe, was jedes Kurzvideo hat. Was ihr heute seht, läuft in meinen eigenen
> Streams. 30 Sekunden, dann direkt zum Problem.

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

## Folie 5 – Produkt heute (Version 1.6)

- **Erkennung**: Browser-ASR (Chrome/Edge), automatische Sprache DE/TR/EN, Dialekt-Toleranz, Lernfunktion,
  Selbsttest & Diagnose; extern per Whisper/Deepgram über API; Offline-Whisper (experimentell)
- **Effekt-Engine v2**: Canvas-Partikel mit Physik (60 fps), Neon/Glitch-Text, Bauchbinden, Kombis, 4 Themes
- **Story-Modus**: 13 Vollbild-Szenen + 12 Atmosphäre-Loops, Geschichten-Pakete DE/TR/EN
- **Pakete**: Türkçe 85 · Deutsch 49 · English 50 · Familie & Kinder 27 · Gaming 27 Trigger
- **Sound**: 38 synthetische Sounds (keine Lizenzkosten), Mixer mit Limiter, Ducking, Stereo, Hall
- **Zuschauer-Trigger**: Twitch-Chat, YouTube-Chat, Geschenke-Webhook (TikTok via TikFinity/Streamer.bot)
- **Handy-Fernbedienung** (PWA), OBS/Streamlabs, TikTok LIVE Studio, Instagram Live Producer, Demo-Aufnahme ohne OBS
- **Offene HTTP-API** (Stream Deck, Chat-Bots, externe ASR), Token-Auth, 240+ automatisierte Tests

> **Notizen:** Das ist kein Prototyp mehr: sechs Releases, Unit- und End-to-End-Tests, Anleitungen in DE/TR.
> Zwei Dinge betonen: (1) eigene Sounds und Pakete = keine Copyright-Strikes, (2) die Zuschauer-Trigger sind die
> Brücke zur Monetarisierung – ein Geschenk kann heute schon einen Effekt auslösen.

## Folie 6 – Warum jetzt

- **Live-Commerce & Gifting**: Geschenke machen rund die Hälfte des Einkommens von Live-Streamern aus;
  Creator mit 20–100 T Followern verdienen 500–3.000 USD/Monat über Gifts (influencerfee.com, muvi.com).
- **TikTok LIVE wächst am schnellsten**: > 100 Mio. Creator gingen 2025 allein in SEA/Kaukasus/Zentralasien LIVE,
  +77 % zum Vorjahr (gyre.pro).
- **Creator Economy ~216–260 Mrd. USD 2026**, Live ≈ 14 % davon (datarefs.com, newmarketpitch.com).
- **Technik ist reif**: Streaming-ASR < 300 ms, Offline-Modelle im Browser, Prompt-Caching macht KI-Klassifikation
  für < 1 $/Stunde möglich.
- **Plattformen konkurrieren über Creator-Tools** (CapCut ↔ TikTok, Edits ↔ Instagram) – Live-Tools sind der nächste Schritt.

Quellen: siehe `QUELLEN.md` (Stand 30.09.2026).

> **Notizen:** Live ist kein Nebenkanal mehr, sondern ein Umsatzkanal. Und: Die Türkei ist ein junger, meme-affiner
> TikTok-Markt mit kaum lokalisierten Tools – unser größtes Paket ist das türkische, das ist kein Zufall.

## Folie 7 – Markt (Spannen; SAM/SOM = eigene Schätzung)

| | Spanne | Grundlage |
|---|---|---|
| **TAM** – Live-Streaming-Markt | 97–157 Mrd. USD (2026) → 250–345 Mrd. USD (2030), CAGR ~27 % | market.us, gyre.pro |
| **Live-Anteil Creator Economy** | ≈ 36 Mrd. USD (14 % von ~260 Mrd.) | newmarketpitch.com, datarefs.com |
| **SAM** – Creator-Tools für Live (Software-Ausgaben) *(Schätzung)* | 1–3 Mrd. USD | abgeleitet aus Streamlabs/StreamYard/Voicemod-Preisen × aktiven Live-Creatorn |
| **SOM** – Jahr 3 *(Schätzung)* | 20–40 T Pro-Abos × 9,99 €/Monat ≈ 2,4–4,8 Mio. € ARR | DACH + Türkei + EN-Nische, Fokus TikTok/IG |

> **Notizen:** Ehrlich sagen: TAM ist Sekundärquelle mit großer Spanne; SAM und SOM sind unsere Schätzung, keine
> Studie. Der Punkt ist nicht die genaue Zahl, sondern: Schon ein kleiner Anteil zahlender Live-Creator trägt ein
> Team – und der eigentliche Hebel ist die Plattform-Integration, nicht das Abo.

## Folie 8 – Geschäftsmodell

1. **Free** – Kernfunktionen, Standard-Pakete, OBS-Overlay (Verbreitung, Community)
2. **Pro – 9,99 €/Monat** – KI-Modus, alle Szenen & Themes, Handy-Fernbedienung, Cloud-Sync, Priorität-Support
3. **Creator-Packs / Marktplatz** – Meme- & Story-Pakete von Creatorn für Creator, 70/30-Split
4. **B2B-Lizenz & Plattform-Integration** – SDK/White-Label für Streaming-Software, Agenturen, Plattformen

Vergleich: Streamlabs Ultra 27 $/Monat, StreamYard 35 $/Monat, Voicemod Pro 10 $/Monat (capterra.com, toolchase.com).

> **Notizen:** 9,99 € liegt bewusst unter Streamlabs Ultra und auf Voicemod-Niveau – Creator kennen diesen
> Preispunkt. Der Marktplatz macht aus Nutzern Lieferanten: Wer ein türkisches Meme-Paket baut, verkauft es.
> B2B ist der Weg zur Plattform: dieselbe Engine läuft als Browser-Quelle in TikTok LIVE Studio.

## Folie 9 – Traction

- **Im Einsatz in den eigenen Live-Streams der Gründerin** seit [Monat/Jahr] – [Zahl] Streams, [Zahl] Stunden
- **Produkt**: 6 Releases (0.1 → 1.6), 240+ automatisierte Tests, Anleitungen DE/TR, Demo-Clips
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

## Folie 11 – Roadmap

- **Q4 2026** – Natives Mobile-SDK (Effekte direkt in der Kamera-App statt nur OBS), Offline-Erkennung stabil,
  Creator-Tests
- **Q1 2027** – Plattform-Integration (TikTok LIVE Studio Plug-in / Instagram Live Producer), Installer, Marktplatz-Beta
- **Q2 2027** – KI-Verstehen v2 (Stimmung, Kontext, Ironie; Multi-Trigger pro Satz), Pro-Abo, Live-Commerce-Trigger
- **Q3–Q4 2027** – Story-Engine (ganze Geschichten als Szenenfolge, generierte Hintergründe), Zuschauer-gestiftete
  Effekte in allen Plattformen, erster Plattform-Pilot

> **Notizen:** Reihenfolge nach Hebel: Mobile-SDK löst das größte Problem (Handy-Streamer ohne OBS). Plattform-
> Integration ist der Ask dieses Decks. KI-Verstehen und Story-Engine sind unsere technische Differenzierung.

## Folie 12 – Team

- **[Name]** – Gründerin · deutsch-türkische Autorin & Live-Streamerin · Produkt, Inhalte, Community, eigene Streams
  als Testlabor · Pakete in TR/DE/EN aus erster Hand
- **[Position offen]** – Tech-Lead (Audio/Realtime, Mobile-SDK)
- **[Position offen]** – Creator-Partnerschaften / Growth (TR + DACH)
- Beirat / Partner: [Name], [Name]

> **Notizen:** Die Gründerin ist Nutzerin, Content-Lieferantin und Produktverantwortliche in einer Person – das ist
> der Grund, warum das Produkt in Dialekten, Hochkant und Türkçe funktioniert. Mit dem Seed kommen zwei Hires.

## Folie 13 – Ask

- **Pilot**: LiveFX als Feature in *TikTok LIVE Studio*, *Instagram Live Producer* oder *YouTube Live* –
  Browser-Quelle läuft heute, SDK in 2 Quartalen
- **Partner**: Streaming-Software (OBS-Plug-in, Streamlabs), Creator-Agenturen TR/DACH, Audio-/ASR-Anbieter
- **Übernahme-Gespräch**: Technologie + Team
- Parallel: Seed [Zahl] € für 18 Monate (2 Hires, Creator-Programm, Pilot)

Kontakt: [E-Mail] · Demo: [Link] · Code & Doku: live-fx/

> **Notizen:** Konkret enden: Was wir brauchen, ist ein Ansprechpartner im Live-Team und einen 8-Wochen-Pilot mit
> 20 Creatorn. Wir liefern Overlay, Pakete, Support und die Messung (Watchtime, Gifts, Clips aus Lives).
