# Cat Me If You Can · Konzept

> **„Catch me if you can“ → „Cat me if you can“.** Kadıköy hat tausende Straßenkatzen. Sie sind
> Nachbarn, Fotomodelle und Wahrzeichen. Das Spiel macht aus jedem Spaziergang eine Katzenjagd
> mit der Kamera. Jede „gefangene“ Katze wird erfasst, sodass nebenbei ein lebendiger Zensus
> entsteht: Wie viele Katzen gibt es, wo leben sie, wie geht es ihnen, wer braucht Hilfe?

---

## 1. Name und Marke

**Empfehlung: „Cat Me If You Can“** als App-Name, **„KediDex“** für die Sammlung im Spiel
(Anspielung auf den Pokédex; *kedi* = Katze) und als türkischer Slogan
**„Yakalayabilirsen yakala!“**.

Warum: Das Wortspiel funktioniert auf Englisch, Deutsch und Türkisch. „Cat me“ klingt nach
„Catch me“ und nach „Fotografier mich“. Das Logo ist eine zwinkernde Sarman-Katze im
Kamera-Sucher: Sie ist im Visier, aber sie ist schlauer.

Alternativen, falls Marke oder Domain belegt sind:

| Name | Idee | Stärke | Schwäche |
|---|---|---|---|
| **CatMe Kadıköy** | Kurzform | kurz, Stadtteil drin | weniger Witz |
| **KediDex** | Pokédex für Katzen | sofort verständlich für Gamer | Nähe zu Nintendo-Marke |
| **Miyav GO** | Miau + GO | eingängig auf Türkisch | erinnert stark an Pokémon GO |
| **Pati Avı** | „Pfotenjagd“ | türkisch, verspielt | „Jagd“ klingt nach Tierquälerei |
| **Sokak Kedileri Ligi** | „Liga der Straßenkatzen“ | Wettkampf + Zensus | lang |
| **Bıyık** | „Schnurrbart“ | kurz, sympathisch | wenig Spielbezug |

**Vor dem Start prüfen:** Marke bei TÜRKPATENT und EUIPO (Klassen 9, 41, 43). Das Wortspiel
lehnt sich an einen Filmtitel an; das ist bei Wortspielen üblich, sollte aber rechtlich kurz
geprüft werden. Dazu Domains (`catmeifyoucan.app`, `.com.tr`) und die Social-Handles.

---

## 2. Für wen?

| Gruppe | Was sie davon haben |
|---|---|
| **Spieler:innen** (Studierende, junge Berufstätige, Familien, Tourist:innen) | Sammeln, Ranglisten, Entdecken, Rabatt im Café, „meine“ Katze benennen |
| **Cafés & Läden** | Laufkundschaft genau dann, wenn Leute unterwegs sind; sympathisches Image; Social-Media-Anlass |
| **Freiwillige & Tierschutzvereine** | Hilfe-Radar: kranke/dünne/verletzte Katzen mit Ort und Foto; Status-Pflege („beim Tierarzt“, „adoptiert“) |
| **Tierärzt:innen / Veterinärdienst der Stadt** | Offene Daten: Bestand je Mahalle, Kastrationsquote (Ohrmarke), Ernährungszustand, Brennpunkte |
| **Sponsoren** (Futtermarken, Tierbedarf) | Positive Reichweite, gesponserte Aufgaben, Futterspenden pro Gutschein |

---

## 3. Spielmechanik

### Fangen

> Sprachregel: „Fangen“ ist hier nur das Wortspiel. In der App und auf der Startseite heißt es
> **fotografieren, finden, sammeln** – nie „jagen“ oder „Beute“ (siehe [BRAND.md](BRAND.md)).

* **AR-Sucher:** Die Rückkamera läuft im Vollbild. Eine Katzenerkennung direkt auf dem Handy
  (COCO-SSD) legt einen Rahmen um die Katze, dann pulsiert der Auslöser.
* **Wurf:** Statt eines Pokéballs fliegt ein **Wollknäuel 🧶** auf die Katze, wackelt dreimal,
  und die Katze ist gefangen.
* **Analyse:** Claude schätzt aus dem Foto Fellmuster/Typ, einen Rasse-Tipp, Alter, Gewicht,
  Ernährungszustand (BCS 1–9), Geschlecht (wenn erkennbar), Ohrmarke (kastriert), sichtbare
  Gesundheitsprobleme mit Dringlichkeit, Verhalten, Umgebung und Erkennungsmerkmale. Dazu kommt
  ein kurzer Karten-Text in drei Sprachen. Die Karte sagt immer dazu: Das ist eine Schätzung
  und ersetzt keine Untersuchung beim Tierarzt.
* **Nur Straßenkatzen:** Halsband, Wohnung, Leine oder „auf dem Arm“ bedeutet Hauskatze, und
  die wird nicht erfasst. Katzen, die Nachbar:innen draußen füttern, und Katzen mit Ohrmarke
  zählen als Straßenkatzen.

### Sammeln (KediDex)
* **14 Typen** wie Pokémon-Typen: Tekir (Tiger), Sarman (rot), Krem, Siyah (schwarz), Beyaz
  (weiß), Gri, Smokin (Smoking), Beyaz-Tekir, Beyaz-Sarman, Gri-Beyaz, Üç Renkli (Glückskatze),
  Kaplumbağa (Schildpatt), Siyam-Typ, Van-Zeichnung. Nicht gefangene Typen erscheinen als
  Silhouette mit „???“.
* **Seltenheit** in 1–5 Sternen: häufig, selten, rar, episch, **Legende**. Seltener machen
  verschiedenfarbige Augen, langes Fell oder blaue Augen. Legenden ernennt die Moderation,
  z. B. die stadtbekannte Katze am Moda-Ufer.

### Wer zuerst kommt, benennt
* Wer eine Katze **als Erste:r** findet, die noch nicht im KediDex ist, darf ihr **24 Stunden
  lang exklusiv einen Namen geben**. Danach darf jede:r, die/der sie gefangen hat, eine
  namenlose Katze benennen.
* Die KI schlägt drei passende Namen vor (Paşa, Duman, Tarçın …).
* **Namensfilter:** Eine Wortliste mit Schimpfwörtern in elf Sprachen erkennt auch
  Verschleierung wie `S1KT1R`, `f.u.c.k`, `fuuuck` oder kyrillische Doppelgänger-Buchstaben.
  Wenn ein API-Key gesetzt ist, prüft Claude zusätzlich in **jeder Sprache**, auch Anspielungen
  (z. B. Kurdisch, Arabisch, Balkansprachen). Harmlose Wörter, die nur ähnlich aussehen
  („Işık“, „Klasik“, „Computadora“), bleiben erlaubt. Dieselben Regeln gelten für Spitznamen.

### Ranglisten
* **Global:** XP, **Entdeckungen** (Erstfunde) und verschiedene Katzen, jeweils für heute, die
  Woche oder insgesamt.
* **Pro Katze:** „Fänger:innen“-Liste, ganz oben die Entdeckerin/der Entdecker mit Krone 👑
  und Namensgeber-Abzeichen, darunter alle, die sie gefangen haben, nach Anzahl.

### Fortschritt
* **XP:** neue Katze 100, eigene Erstbegegnung 50, bekannte Katze heute 20, Wiedersehen am
  selben Tag 5, Gesundheitshinweis 30, Tagesziel 200, Tagesaufgabe 75. Seltenere Katzen geben
  ein Vielfaches (bis ×3).
* **20 Level** mit Titeln von „Çırak“ (Lehrling) bis „Kadıköy Efsanesi“ (Kadıköy-Legende).
* **17 Abzeichen**, z. B. „Gece Kuşu“ (nachts), „Kadıköy Haritası“ (alle 21 Mahalle),
  „Sağlık Bekçisi“ (3 Katzen in Not gemeldet) oder „7-Tage-Serie“. Neue Abzeichen sind nur ein
  Eintrag in `config/game.js`.
* **Tagesaufgaben:** drei pro Tag, für alle gleich, z. B. „Fange 3 × Tekir“, „Eine Katze in
  Göztepe“, „Fange in 3 Mahalle“, „Eine Katze vor 9 Uhr“.

### Tagesziel und Café-Gutschein
* **20 verschiedene Katzen an einem Tag** (Ortszeit Istanbul). Dieselbe Katze zweimal zählt
  nicht doppelt.
* Danach gibt es einen Gutschein (`CAT-XXXX-XXXX` + QR-Code), **gültig nur an diesem Tag bis
  23:59**, und **einmal einlösbar**. Er gilt bei allen Partner-Cafés, deren Schwelle erreicht
  ist; jedes Café legt Rabatt (Standard 20 %) und Schwelle selbst fest.
* Gegen Screenshots zeigt der Gutschein eine laufende Uhr und eine tanzende Pfote. Das Café
  scannt den Code ohnehin und sieht live, ob er gültig ist, wie viele Katzen es heute waren und
  die Katzenfotos des Tages als Nachweis.

---

## 4. Fairness & Anti-Cheat

| Trick | Gegenmittel |
|---|---|
| Dieselbe Katze 20× fotografieren | Wiedererkennung; Tagesziel zählt verschiedene Katzen |
| Foto aus dem Netz / vom Bildschirm | KI prüft „echtes Foto“ (Moiré, Ränder, Pixelraster); Galerie-Uploads zählen nie |
| Dasselbe Foto mehrfach / unter Freund:innen teilen | dHash-Vergleich: gleiche Fotos werden 48 h lang global abgelehnt, für dieselbe Person immer |
| Standort fälschen | Spielgebiet-Polygon, GPS-Genauigkeit, „unmögliche Reise“ (> 45 km/h zwischen zwei Fängen) |
| Fotos von Hauskatzen sammeln | KI-Einschätzung Straße/Haus → Hauskatzen werden abgelehnt |
| Spam / Bots | 20 s Abklingzeit (schont auch die Katzen), Tageslimit, Ratenbegrenzung je IP |
| PIN des Cafés erraten | 6–12-stellige PIN, scrypt-Hash, Login-Bremse je IP und je Café |
| Doppelt einlösen | Code ist einmalig und serverseitig gesperrt; das Café sieht „schon eingelöst (wo, wann)“ |
| Falsche Zuordnung durch die KI | „Das ist nicht diese Katze“-Knopf → Prüfliste; Moderation führt zusammen oder trennt ab, und alle Zähler rechnen automatisch neu |

---

## 5. Tierschutz zuerst

* **Spielregeln beim Start:** nur fotografieren; nicht jagen, nicht anfassen, nicht in die Enge
  treiben; kein Blitz; schlafende und fressende Katzen nicht stören; füttern nur mit
  Katzenfutter und Wasser.
* **Abklingzeit 20 s** zwischen zwei Fängen. Die Katzen sollen nicht im Sekundentakt
  angeblitzt werden.
* **Keine metergenauen Orte öffentlich**, damit Tierquäler:innen die Karte nicht nutzen können:
  Öffentliche Positionen sind auf ~100 m gerundet.
* **Hilfe-Radar:** Jeder Fang mit Gesundheitshinweis (Augenentzündung, Wunde, Abmagerung …)
  setzt die Katze auf „braucht Hilfe“. Zusätzlich kann jede:r eine Hilfe-Meldung mit Text
  schreiben. Freiwillige (Rolle „volunteer“) setzen den Status „in Behandlung“, „adoptiert“
  oder „verstorben“, und das Protokoll zeigt den Verlauf.
* **Lange nicht gesehen:** Eine Katze, die 30 Tage niemand gefangen hat, wird als vermisst
  markiert, ein frühes Warnsignal.

---

## 6. Der Zensus

Aus dem Spiel entsteht eine Datenbasis, die es so für Kadıköy bisher nicht gibt:

* **Bestand:** Katzen je Mahalle, neue Katzen pro Woche, in 7/30 Tagen gesehen
* **Kastrationsquote** über die Ohrmarke, je Mahalle. Das zeigt, wo TNR-Aktionen fehlen.
* **Ernährungszustand** (BCS-Klassen, Durchschnitt je Mahalle) und **sichtbare Gesundheitsprobleme**
* **Altersstruktur**: viele Kitten heißt viele unkastrierte Katzen in der Gegend
* **Aktivität nach Tageszeit**, Karte mit Dichte, Futter- und Wasserstellen (Vorschläge der
  Community, von der Moderation freigegeben)
* **Offene Daten:** CSV und GeoJSON (gerundet) für Vereine, Forschung und Verwaltung

---

## 7. Partner-Cafés

* Ein Café legt Rabatt, Schwelle (z. B. 20 Katzen) und optional ein Tageslimit fest.
* Das Personal öffnet `partner.html` auf einem Handy oder Tablet, meldet sich mit der Café-PIN
  an, scannt den QR-Code (oder tippt ihn ein) und tippt auf „Einlösen“. Das dauert keine zehn
  Sekunden.
* Das Café sieht seine Einlösungen. Für die Abrechnung mit einem Sponsor gibt es die
  Gesamtzahl.
* Optional: **„Jeder Gutschein = 100 g Futter“**. Das Café oder ein Sponsor spendet pro
  Einlösung an eine Futterstelle in der Nähe, und die App zeigt die Summe.
* Ablauf für neue Cafés: [PARTNER.md](PARTNER.md).

---

## 8. Geschäftsmodell (Vorschlag)

Für Spieler:innen bleibt das Spiel **kostenlos**. Einnahmen kommen von Partnern, die von
Laufkundschaft und Image profitieren:

| Quelle | Idee | Pilotphase |
|---|---|---|
| **Café-Partnerschaft** | Monatlicher Betrag für Listung + Gutscheinsystem, oder ein kleiner Betrag pro eingelöstem Gutschein | gratis, um Erfahrung zu sammeln |
| **Sponsoren** (Futter, Tierbedarf, Tierkliniken) | Gesponserte Tagesaufgaben („Fange 3 Katzen an einer Futterstelle“), Futterspende pro Gutschein, Logo im Hilfe-Radar | 1 Sponsor |
| **Daten-Dashboard** für Verwaltung und Vereine | Auswertungen je Mahalle, TNR-Planung, Verlauf (Rohdaten bleiben offen) | Kooperation statt Verkauf |
| **Events** | Kedi-Woche, Foto-Rallye, Team-Wettkampf der Mahalle, Stadtführung „Moda Cat Walk“ | 1 Event zum Start |
| **Merch** | Sticker/Postkarten der Kadıköy-Legenden, Erlös teilweise an Futter/Kastration | optional |
| **Förderung** | Programme für Tierschutz, Digitalisierung und Bürgerbeteiligung (Stadt, EU) | Antrag nach dem Pilot |

---

## 9. Ausbau

**Phase 0 – Pilot Moda (4 Wochen):** 3–5 Cafés in Caferağa/Moda, 50–200 Spieler:innen, ein
Tierschutzverein für den Hilfe-Radar. Ziel: Funktioniert das Tagesziel, wie gut ist die
Wiedererkennung, wie viel kostet die KI pro Tag?

**Phase 1 – ganz Kadıköy:** alle 21 Mahalle, 15–30 Partner, Teams je Mahalle („Moda gegen
Yeldeğirmeni“), Kedi-Woche.

**Phase 2 – weitere Stadtteile:** Beşiktaş, Cihangir/Beyoğlu, Üsküdar, Balat. Jeder Stadtteil
ist ein Eintrag in `public/config/regions.js` (Polygon + Mahalle); Gutscheine, Statistik und
Ranglisten laufen pro Region.

**Phase 3 – andere Städte:** İzmir (Alsancak), Antalya (Kaleiçi). International bieten sich
Orte an, die für Straßenkatzen bekannt sind (z. B. Kotor, Athen, Rom).

### Funktions-Backlog

| Thema | Idee |
|---|---|
| Konto | Login per E-Mail-Link oder Telefon, damit ein neues Handy das Konto übernehmen kann |
| Benachrichtigungen | Push: „Paşa wurde seit 30 Tagen nicht gesehen“, „Deine Katze braucht Hilfe“, „Tagesziel fast geschafft“ |
| Teams | Clans je Mahalle, Wochen-Duelle, gemeinsames Teamziel |
| Events | Saison-Events (Kedi-Woche, Ramadan-Nächte, Winterhilfe mit Futterstellen-Aufgaben) |
| Adoption | Zu „adoptiert“ den Weg mit Tierheimen/Vereinen anbieten, Steckbrief teilen |
| Tierärzt:innen | Partner-Kliniken: Rabatt auf Kastration für gemeldete Katzen, Rückmeldung „behandelt“ |
| Futterstellen | Check-in „heute gefüllt“, Lücken auf der Karte („hier braucht es Wasser“) |
| Teilen | Sammelkarte als Bild für Instagram/TikTok mit Logo und Slogan |
| AR | WebXR: Wollknäuel mit echter Flugbahn im Raum, Katze „springt“ in den KediDex |
| Offline | Fänge in Funklöchern zwischenspeichern, mit GPS-Zeitstempel nachreichen |
| Technik | Postgres/PostGIS statt Journal, Bild-Embeddings für die Wiedererkennung, native Hülle (Capacitor) |

---

## 10. Recht & Datenschutz (Türkei)

* **KVKK** (türkisches Datenschutzgesetz): Verantwortliche Stelle benennen,
  Aufklärungstext (*Aydınlatma Metni*), Einwilligung für Standort und Fotos, ggf.
  VERBİS-Registrierung, Löschung auf Anfrage. Die App speichert Spitznamen statt Klarnamen.
  Öffentlich sind nur Katzen-Ausschnitte und gerundete Orte.
* **Gutscheine** sind Rabatte des jeweiligen Cafés (kein Gewinnspiel). Die Bedingungen
  stehen in der Partnervereinbarung.
* **Karten:** Für echten Betrieb einen eigenen oder kommerziellen Kachel-Dienst nutzen
  (Nutzungsrichtlinie der OSM-Kachelserver beachten).
* **Mindestalter** und Nutzungsbedingungen (Verhaltensregeln, Sperren bei Tierquälerei oder Betrug).

---

## 11. Woran man Erfolg misst

| Kennzahl | Warum |
|---|---|
| Tägliche aktive Fänger:innen, Anteil mit Tagesziel | Spielspaß |
| Erfasste Katzen, Anteil in 30 Tagen gesehen | Abdeckung des Zensus |
| Zeit von Hilfe-Meldung bis „in Behandlung“ | echter Nutzen für die Tiere |
| Kastrationsquote je Mahalle im Verlauf | Wirkung von TNR-Aktionen |
| Eingelöste Gutscheine je Café, Wiederkehr | Partner-Nutzen |
| Anteil Fänge mit KI-Analyse, Kosten je Fang | Wirtschaftlichkeit |
| Moderationsaufwand (Dubletten, Einsprüche) | Qualität der Wiedererkennung |

---

## 12. Wo man im Code erweitert

| Was | Wo |
|---|---|
| Neuer Stadtteil | `public/config/regions.js` |
| Regeln, XP, Abzeichen, Tagesaufgaben | `public/config/game.js` (oder `data/game.override.json`) |
| Neue Fellmuster, Gesundheitsmerkmale, Status | `public/core/taxonomy.js` (Schema, Filter, Oberfläche und Export ziehen nach) |
| Andere Datenbank | Schnittstelle in `public/core/store.js` |
| Andere/zusätzliche Analyse | `server/analyzers.js` (`analyze()`, `compare()`) |
| Neue Sprache | `public/js/i18n.js` + `LANGS` in `public/core/taxonomy.js` |
| Wortfilter | `public/core/moderation.js` (Listen) + KI-Prüfung `server/moderator-claude.js` |
