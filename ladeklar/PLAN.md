# LADEKLAR – Produktplan

> **Ladeklar** – die White-Label-App für Speditionen und Transportunternehmen.
> Fahrer tippen statt telefonieren, die Disposition sieht jede Tour live, der Lieferschein ist da,
> bevor der LKW vom Hof rollt.
>
> Claim: **„Ein Tipp. Alles klar.“** · Zweitclaim: **„Tippen statt telefonieren.“**

Stand: 17.10.2026 · Version 1.0 · Zielmarkt Deutschland (DACH vorbereitet)

---

## 1. Geschäftsmodell in einem Satz

Du bist **Lizenzgeber** (Plattformbetreiber). Du vermietest Ladeklar als Software-as-a-Service an
**Lizenznehmer** (Speditionen, Transportunternehmen, Kurierdienste, Bauunternehmen mit eigenem Fuhrpark).
Jeder Lizenznehmer arbeitet unter **eigenem Logo, eigenen Farben und eigenem App-Namen** (White-Label),
legt seine **Fahrer**, seinen **Fahrzeug-Pool** (LKW und Auflieger) und seine **Lieferungen** an. Die Fahrer
bekommen einen Zugang und bedienen die App fast nur über große Icon-Knöpfe.

```
 Lizenzgeber (du)            Lizenznehmer (Unternehmen)              Fahrer
 ─────────────────           ──────────────────────────             ──────────────
 Plattform-Konsole   ──►     Disposition (Web/Tablet)   ◄─ live ─►  Fahrer-App (Handy/Tablet)
 • Lizenzen anlegen          • Logo, Farben, App-Name                • Zugang: Firmencode + PIN
 • Tarif, Plätze, Laufzeit   • Fahrer & Disponenten anlegen          • LKW/Auflieger aus Pool wählen
 • sperren/kündigen/löschen  • LKW- und Auflieger-Pool               • Lieferung wählen/bestätigen
 • Umsatz (MRR), Abrechnung  • Lieferungen anlegen (Route, Zeit)     • Aufgeladen / Abgeladen
 • keine Einsicht in         • Live-Übersicht, Verlauf, Push         • Lieferschein fotografieren
   Auftragsdaten (AVV)       • Lieferschein-Archiv, Berichte, Export • Notiz, Problem melden
```

## 2. Rollen und Rechte

| Rolle | Wer | Darf | Darf nicht |
|---|---|---|---|
| **Lizenzgeber** (`platform`) | Plattformbetreiber (genau ein Lizenzgeber-Zugang) | Lizenznehmer anlegen, Tarif/Zusatzfahrer/Zahlweise/Laufzeit/Status ändern, Firmendaten und eigene Domains (Premium) pflegen, Markenfarbe bei der Anlage setzen, Admin-Passwort des Kunden zurücksetzen (neues Startpasswort, steht im Protokoll des Kunden), gekündigte Kunden endgültig löschen, Kennzahlen (Anzahl Fahrer, Fahrzeuge, Lieferungen, belegter Speicher) und Abrechnung sehen, Kündigungs- und Tarifwünsche der Kunden sehen und übernehmen, eigenes Passwort ändern und eine Zwei-Faktor-Anmeldung einschalten | Lieferungen, Lieferscheine, Fahrernamen oder Notizen eines Lizenznehmers einsehen (Datenschutz, AVV). Die Support-Freigabe des Kunden (befristet) wird nur gespeichert und protokolliert; einen Zugriff auf Kundendaten gibt es in der Konsole auch dann nicht. |
| **Unternehmens-Admin** (`admin`) | Inhaber/Leitung des Lizenznehmers | alles im eigenen Unternehmen: Branding, Abläufe, Büro-Zugänge (Name, E-Mail, Rolle, Sprache), Fahrer, Fahrzeuge, Lieferungen, Personen löschen, Protokoll, Export, API-Schlüssel (Premium), Support-Freigabe, Lizenz-Seite mit Tarifwunsch und Kündigung, eigene Zwei-Faktor-Anmeldung | andere Unternehmen sehen, den eigenen Zugang sperren oder löschen |
| **Disponent** (`dispatcher`) | Disposition | Lieferungen anlegen/ändern/zuweisen/stornieren, Fahrer anlegen, ändern, sperren und PIN zurücksetzen, Fahrzeuge anlegen, ändern und entfernen, Live-Übersicht, Verlauf, Notizen, Berichte, Lieferungen als CSV, eigene Zwei-Faktor-Anmeldung | Marke und Abläufe, Büro-Zugänge, Personen löschen, Gesamtexport (ZIP/JSON), Protokoll, API-Schlüssel |
| **Fahrer** (`driver`) | angestellte Fahrer und Subunternehmer-Fahrer | eigene Fahrzeugwahl aus dem Pool, Lieferungen sehen, die ihm zugewiesen oder für alle freigegeben sind (wenn „Fahrer dürfen offene Aufträge übernehmen“ an ist), Status bestätigen, Fotos/Lieferschein hochladen, Notizen, Problem melden, eigener Verlauf (30 Tage) | Lieferungen anderer Fahrer sehen, Stammdaten ändern |

Mandantentrennung ist im Kern (Engine) erzwungen: Jede Abfrage und Aktion prüft die `tenantId` des
angemeldeten Nutzers. Ein Test stellt sicher, dass Unternehmen A nie Daten von Unternehmen B sieht.

## 3. Kernabläufe

### 3.1 Lizenzgeber legt einen Lizenznehmer an
1. Plattform-Konsole → **„+ Lizenznehmer“**: Firmenname, Anschrift, Ansprechpartner, E-Mail, Telefon.
2. Tarif wählen (Start / Flotte / Premium), Zahlweise (monatlich/jährlich), Testzeitraum (Standard 30 Tage, 0 = sofort
   aktiv). Laufzeit, Zusatzfahrer, Store-App und eigene Domains setzt der Lizenzgeber danach im Kundenblatt.
3. Firmencode wird vorgeschlagen (z. B. `KAYA`), Buchungsnummern-Präfix (z. B. `KAY`).
4. Admin-Zugang wird erzeugt (E-Mail + Startpasswort). Beim ersten Login erscheint zuerst „Eigenes Passwort
   vergeben“ – vorher lässt die Plattform keine andere Aktion zu. Hat sich ein Kunde ausgesperrt, setzt der
   Lizenzgeber das Admin-Passwort zurück (neues Startpasswort, Zwei-Faktor-Anmeldung aus, alle Sitzungen enden, Eintrag im
   Protokoll des Kunden).
5. Optional: Markenfarbe gleich mitgeben. Das Logo lädt der Kunde selbst hoch.

### 3.2 Lizenznehmer richtet sich ein (4 Schritte über die Menüs, kein geführter Assistent)
1. **Logo & Farbe** hochladen → App, Login-Seite, Handy-Icon und Push-Mitteilungen tragen das eigene Logo.
2. **Fahrzeuge** anlegen: Kennzeichen, Art (Sattelzugmaschine, Solo-LKW, Gliederzug, Transporter,
   Kühlkoffer, Kipper, Tank; Auflieger Plane/Kühl/Kipper/Container/Tieflader/Koffer), Nutzlast, Stellplätze,
   Ausstattung (Ladebordwand, Kühlung, ADR, Mitnahmestapler, Hebebühne, Kran), HU-/SP-Termin.
3. **Fahrer** anlegen: Name, Handynummer, Sprache, Führerscheinklasse. Die App erzeugt eine 6-stellige PIN
   und einen **Einladungstext mit Link/QR** zum Weiterleiten per WhatsApp/SMS. Der Link enthält ein zufälliges
   Token, gilt 14 Tage und für eine Anmeldung; „Neue Einladung“ erzeugt Link und PIN neu.
4. **Erste Lieferung** anlegen.

### 3.3 Disponent legt eine Lieferung an
Pflicht: **Route** (Ladeort → Entladeort, z. B. *Stuttgart → Hamburg*), **Ladedatum**.
Optional: Auftraggeber, Kundenreferenz, Adressen, Zeitfenster, Ansprechpartner + Telefon an Lade-/Entladestelle,
Ware, Paletten, Gewicht, ADR (Gefahrgut), Temperatur, Hinweise für den Fahrer, Fahrer und Fahrzeug.

- **Buchungsnummer** wird automatisch vergeben: `KAY-2610-0042` (Präfix – Jahr/Monat – laufende Nr.). Die
  laufende Nummer beginnt jeden Monat wieder bei 0001 und ist je Unternehmen und Monat eindeutig.
- **Zuweisen** an einen Fahrer **oder** als **„offen für alle Fahrer“** veröffentlichen – dann kann
  sich ein freier Fahrer die Tour selbst nehmen. Ist „Fahrer dürfen offene Aufträge übernehmen“ aus, sehen die
  Fahrer offene Aufträge nicht; der Auftrag wartet, bis die Disposition ihn zuteilt.
- **Nachbearbeiten**: Bei zugestellten oder stornierten Lieferungen lassen sich nur noch Auftraggeber, Referenz und
  interne Notiz ändern (Route, Zeiten und Nachweise bleiben, wie sie sind).
- **Fahrerwechsel**: Bekommt eine bestätigte, noch nicht beladene Tour einen anderen Fahrer, geht sie auf „Offen“
  zurück, der neue Fahrer bestätigt sie selbst, das Fahrzeug des vorigen Fahrers wird entfernt und dessen
  Ankunftszeiten zählen nicht zur Standzeit. Nach dem Beladen ist kein Fahrerwechsel möglich.
- **„Wiederholen“** kopiert eine frühere Lieferung (Stammrouten in Sekunden).
- Orte, die schon einmal verwendet wurden, werden beim Tippen vorgeschlagen (kein extra Adressbuch nötig).

### 3.4 Fahrer – die ganze App ist ein Knopf
Die Fahrer-Ansicht zeigt **immer genau einen großen Knopf: den nächsten Schritt.**

```
 [Zugang]     Firmencode + Handynummer + PIN  (oder Einladungslink: nur PIN)
 [LKW]        Fahrzeug aus dem Pool tippen  (+ optional Auflieger)
 [Auftrag]    Lieferung unter „Aufträge“ (Neu für Sie / Meine Touren / Freie Aufträge) tippen
   ✔  Buchung bestätigen            → Status „Bestätigt“        → Push an Disposition
 ( 📍 Angekommen Ladestelle )        → optional, misst Standzeit (Standgeld)
   ⬆📦 Aufgeladen                    → Status „Beladen/Unterwegs“ → Push
 ( 📍 Angekommen Entladestelle )     → optional
   ⬇📦 Abgeladen                     → Status „Entladen“          → Push  (+ optional Palettentausch)
   📷 Lieferschein fotografieren     → 1–n Fotos/PDF, Fotos automatisch verkleinert
   ✍  optional Empfänger + Unterschrift
   ✔  Bestätigen & abschließen       → Status „Zugestellt“        → Push „Lieferschein liegt vor“
```

Jederzeit verfügbar: **Notiz** (Freitext + Schnellbausteine: „Stau, ca. 30 Min. später“, „Warte an der Rampe“,
„Kunde nicht erreichbar“, …), **Problem melden** (Stau/Verspätung, Panne, Unfall, Ware beschädigt, Annahme verweigert,
Adresse falsch, Lange Wartezeit, Sonstiges – optional mit Foto), **Navigation** (öffnet auf iPhone/iPad Apple Karten,
sonst Google Maps), **Anrufen** (Ansprechpartner der nächsten Stelle, sonst Disposition; unter „Mehr“ immer
„Disposition anrufen“). **Rückgängig** ist 2 Minuten lang nach dem eigenen Schritt möglich (gezählt ab dem Tippen) –
nur mit Netz, für offline getippte Schritte wird es nicht angeboten.
**Zurückgeben**: Der Fahrer kann eine bestätigte, noch nicht beladene Tour mit Grund zurückgeben.

### 3.5 Disposition sieht alles live
- **Live-Board**: Kacheln „Offen · Unterwegs · Heute zugestellt · Störungen“, darunter jede aktive Tour mit
  Fortschrittsleiste, Fahrer, Kennzeichen, Route, letzter Meldung („vor 3 Min.“).
- **Push-Benachrichtigung** bei jedem Schritt (Bestätigt, Aufgeladen, Abgeladen, Zugestellt mit bzw. ohne Lieferschein,
  Problem = hohe Priorität, Notiz, Zurückgegeben, Schritt zurückgenommen). Zusätzlich In-App-Mitteilung mit Ton und Glocke.
  Der Push lässt sich je Gerät ein- und ausschalten (Büro: „Mein Konto“, Fahrer: „Mehr“).
- **Für Fahrer setzen**: Meldet ein Fahrer telefonisch, setzt die Disposition den nächsten Schritt für ihn. Eine Buchung
  bestätigen oder einen Schritt zurücknehmen kann nur der Fahrer selbst.
- **Verlauf** jeder Lieferung: Zeitstrahl mit Uhrzeit, Person, optional Standort beim Statuswechsel.
- **Gegenwart / Zukunft / Vergangenheit**: Reiter „Live“, „Geplant“, „Offen“, „Störungen“, „Erledigt“, „Alle“ + Suche
  nach Buchungsnummer, Auftraggeber, Referenz, Ort, Fahrer, Kennzeichen, Ware. „Live“ zeigt nur laufende Touren,
  bestätigte Touren für spätere Tage stehen unter „Geplant“; „Erledigt“, „Alle“ und die Suche zeigen die neuesten zuerst.
- **Abliefernachweis** (druckbar als PDF): Buchungsdaten, Zeitstrahl (Datum mit Jahr), Lieferschein-Fotos, Unterschrift,
  falls gespeichert der Standort je Schritt – sofort an Kunde oder Buchhaltung, Rechnung kann am selben Tag raus.
- **Berichte** je Monat: Lieferungen je Fahrer (abschaltbar), je Auftraggeber und je Lade-/Entladestelle mit
  mittlerer Standzeit (längste zuerst – zeigt, wo Standgeld fällig ist; die Tabellen je Auftraggeber und Stelle
  erscheinen auch, wenn die Auswertung je Fahrer aus ist), Pünktlichkeit, Palettenkonto, Export des ganzen Berichts
  als CSV. Standzeit an einer Stelle = Tipp „Angekommen“ bis „Aufgeladen“ bzw. „Abgeladen“; ohne Ankunfts-Tipps
  bleibt sie leer.

## 4. Was wir zusätzlich eingebaut haben (Lückenanalyse → geschlossen)

| Lücke im Alltag | Lösung in Ladeklar | Status |
|---|---|---|
| Fahrer sprechen oft Polnisch, Rumänisch, Tschechisch, Türkisch, Russisch, Ukrainisch | Fahrer-App, Büro und Konsole in **8 Sprachen** (DE, EN, PL, RO, CS, TR, RU, UK), in der Fahrer-App dazu Icons statt Text; Mitteilungen in der Sprache des Empfängers | v1 |
| Handy während der Fahrt ist verboten (§ 23 Abs. 1a StVO) | **Fahrsperre**: ab ca. 8 km/h überdeckt ein Hinweis die Knöpfe. Braucht die Standortfreigabe im Browser – der Fahrer wird einmal mit Erklärung gefragt („Später“ blendet die Frage 7 Tage aus); die Geschwindigkeit wird nur auf dem Gerät ausgewertet, nichts gespeichert oder gesendet (unabhängig von „Standort beim Statuswechsel“). Ohne Freigabe ist die Fahrsperre aus | v1 |
| Funklöcher, Auslandsroaming | **Offline-Warteschlange**: Schritte, Notizen, Problemmeldungen und Fotos werden gespeichert und streng in der richtigen Reihenfolge gesendet, sobald Netz da ist; nichts geht still verloren (endgültig abgelehnte Einträge erscheinen als „Nicht gesendet“), nichts kommt doppelt an. Die App startet auch im Funkloch mit den zuletzt geladenen Touren (Voraussetzung: einmal mit Netz geladen). Im Verlauf steht die Uhrzeit des Tippens (Gerätezeit mit Plausibilitätsprüfung), die Eingangszeit wird zusätzlich gespeichert. Fotos werden vor dem Senden verkleinert (lange Seite höchstens 1.400 Pixel) | v1 |
| Versehentliche Tipps mit Handschuhen | großer Schritt-Knopf (≥ 88 px hoch), doppeltes Tippen zählt einmal, **Rückgängig 2 Min.** statt Rückfragen (mit Netz) | v1 |
| Lieferscheine kommen Tage später oder gar nicht ins Büro | Foto-Pflicht vor Abschluss (abschaltbar), Archiv je Lieferung, Abliefernachweis | v1 |
| Wartezeiten an der Rampe werden nicht bezahlt | optional **Ankunft erfassen** → Standzeit wird berechnet (Grundlage für Standgeld) | v1 |
| Palettentausch (EPAL) wird vergessen | optional **Palettentausch** beim Abladen (abgegeben/mitgenommen) | v1 |
| Ein LKW darf nicht von zwei Fahrern gleichzeitig gewählt werden | Fahrzeug ist belegt, bis der Fahrer es freigibt; Disposition kann freigeben | v1 |
| Abgelaufene HU/SP werden übersehen | **Fristen** je Fahrzeug, Warnung 30 Tage vorher, belegte/werkstatt-Status | v1 |
| Stammrouten jede Woche neu tippen | **Wiederholen** + Ortsvorschläge aus dem Verlauf | v1 |
| Unterschrift des Empfängers | optional **Unterschriftenfeld** auf dem Display | v1 |
| Datenschutz/Betriebsrat bei Ortung | **keine Dauerortung**: Standort nur im Moment eines Statuswechsels und nur, wenn das Unternehmen es einschaltet und der Fahrer zustimmt; Löschung nach 90 Tagen; Muster-Betriebsvereinbarung liegt bei | v1 |
| Fahrer verlieren Zugangsdaten | Einladungslink/QR (einmal gültig, 14 Tage), PIN-Reset durch Disposition, Sitzung bleibt 90 Tage angemeldet; Login-Sperre steigt bei Fehlversuchen (15 Min., 1 Std., 24 Std.) | v1 |
| Büro-Zugang abgegriffen | optionale **Zwei-Faktor-Anmeldung** (Authenticator-App) für Lizenzgeber, Admins und Disponenten; ein Passwortwechsel meldet alle anderen Geräte ab; neues Passwort durch Admin bzw. Lizenzgeber schaltet sie bei verlorenem Handy aus; für den Lizenzgeber `node server/index.js reset-platform-password` | v1 |
| Kunde will eigene App im Store | **White-Label-App** (Capacitor) mit eigenem Namen/Icon – Premium-Zusatz; Push über APNs/FCM in der Store-App fehlt noch (heute Web-Push) | vorbereitet |
| Anbindung an TMS/Buchhaltung | **REST-API** mit API-Schlüssel (Premium), CSV-Export, Webhook (Roadmap) | v1 (API Basis) |
| Daten mitnehmen bei Kündigung (EU Data Act) | **Datenexport** jederzeit durch den Admin, auch bei Sperre und nach Kündigung: ZIP mit allen Daten (JSON, CSV) und jeder Datei (Lieferscheine, Fotos, Unterschriften, Logo), auch über 4 GB (ZIP64), einzeln auch JSON/CSV; Disponenten laden die Lieferungen als CSV (alle, ohne Grenze); Formeln in CSV-Zellen werden entschärft; jeder Export steht im Protokoll | v1 |
| Kunde will Tarif wechseln oder kündigen | „Tarif wechseln anfragen“ und „Kündigen“ (mit Grund und Bestätigung) auf der Lizenz-Seite; die Konsole zeigt die Anfrage und übernimmt den Tarif auf Knopfdruck (beim Verkleinern mit Prüfung der Grenzen) | v1 |
| Lizenz läuft ab / Zahlung fehlt | Status *Test · Aktiv · Gesperrt · Gekündigt* (dazu *Abgelaufen* nach Test- oder Laufzeitende); gesperrt oder abgelaufen = nur Lesen + Export, angemeldete Fahrer werden abgemeldet und können sich nicht anmelden; gekündigt = nur der Admin meldet sich noch an (lesen + Export, Hinweisbanner), angemeldete Disponenten und Fahrer werden abgemeldet; danach löscht der Lizenzgeber den Kunden endgültig (Firmencode zur Bestätigung) | v1 |
| Löschpflicht (DSGVO) für ausgeschiedene Fahrer/Disponenten | **Löschen** durch den Admin: Name, Kontakt, PIN/Passwort, Zwei-Faktor-Schlüssel, Einladungslink und Mitteilungen weg, Anmeldung und Push enden sofort; abgeschlossene Lieferungen bleiben mit „Gelöschter Nutzer“; offene und bestätigte Touren gehen zurück an die Disposition; solange der Fahrer eine beladene Tour hat, wird das Löschen abgelehnt | v1 |
| Nachweis bei Anmeldeproblemen / Angriffen | **Protokoll** mit Anmeldungen und Fehlversuchen inkl. IP-Adresse (IP und eingegebener Name nach 90 Tagen entfernt) | v1 |
| Funkloch beim Abschluss | Abladen, Lieferschein-Foto, Unterschrift und „Zugestellt“ funktionieren offline; alles wird in der richtigen Reihenfolge nachgesendet | v1 |
| Platzgrenzen je Tarif | Fahrer-, Fahrzeug- und Disponentenlimits werden geprüft, klare Hinweise zum Upgrade; **Speicherkontingent** je Tarif mit Anzeige, Mitteilung bei 80 % und 100 % und Ablehnung weiterer Uploads bei vollem Speicher (ein Puffer für laufende Zustellungen fehlt noch); gelöschte Dokumente verschwinden auch vom Datenträger | v1 |
| Nachtschicht / Kabine dunkel | automatischer **Dunkelmodus** | v1 |
| Grenzüberschreitend (CMR) | Land je Lade- und Entladestelle; Dokumentart „CMR“ (im Büro beim Hinzufügen wählbar: Lieferschein, CMR, Schaden, Ladung, Foto; Uploads der Fahrer sind Lieferscheine bzw. Schadensfotos); eCMR-Schnittstelle (Roadmap) | v1 / Roadmap |

## 5. Datenmodell (vereinfacht)

- **Tenant** (Lizenznehmer): `id, code, name, legalName, address, phone, email, vatId, plan, extraDrivers, storeApp, billing,
  status, statusAt, trialEnd, licenseEnd, paidSince, domains[], branding{appName, logoFileId, iconFileId, color},
  settings{driverPicksTruck, driverTakesOpen, requirePod, requireSignature, trackArrival, palletExchange, driveLock,
  geoOnStatus, reportsByDriver, bookingPrefix, retentionYears}, bookingSeq, bookingSeqMonth, apiKeyHash, apiKeyHint,
  supportAccessUntil, storageUsed, storageWarn, history[] (Lizenz-Historie), cancelRequestedAt, cancelReason, planRequest`
- **User**: `id, tenantId, role, name, email | phone, passwordHash | pinHash, mustChangePassword, lang, active, deleted,
  vehicleId, trailerId, geoConsent, failedLogins, lockedUntil, inviteToken, inviteExpires, twoFactorSecret, twoFactorStep`
- **Vehicle**: `id, tenantId, kind(truck|trailer), plate, type, payloadKg, pallets, features[], status(ok|workshop), driverId (belegt), huDue, spDue, note`
- **Delivery**: `id, tenantId, bookingNo, customer, reference, pickup{place, street, zip, city, country, date, from, to, contact, phone},
  dropoff{…}, goods{text, pallets, weightKg, adr, temp}, driverId, vehicleId, trailerId, openForAll, status, problem,
  notes[], events[{at (Tipp-Zeit), rx (Eingang, falls abweichend), type, by, …}], docs[], palletExchange, receiver,
  signatureFileId, internalNote, createdAt, updatedAt, deliveredAt, cancelledAt, autoVehicle`
- **Status**: `open → accepted → (arrived_pickup) → loaded → (arrived_dropoff) → unloaded → delivered` · `cancelled`
- **Notification**, **File** (Lieferschein, Foto, Unterschrift, Logo), **AuditLog**, **Session**, **PushSubscription**,
  **Op** (Kennung gegen doppeltes Senden mit gespeichertem Ergebnis, 7 Tage)

## 6. Tarife (Lizenzmodell, netto zzgl. 19 % USt.)

| | **Start** | **Flotte** | **Premium** |
|---|---|---|---|
| Preis / Monat | **49 €** | **129 €** | **299 €** |
| Fahrer inklusive | 3 | 15 | 40 |
| jeder weitere Fahrer | – (Upgrade) | 7 € | 6 € |
| Fahrzeuge (LKW + Auflieger) | 6 | 40 | unbegrenzt |
| Disponenten-Zugänge | 1 | 5 | unbegrenzt |
| Eigenes Logo, Farben, App-Name | ✔ | ✔ | ✔ |
| Lieferungen, Push, 8 Sprachen, Offline | ✔ unbegrenzt | ✔ | ✔ |
| Lieferschein-Speicher | 5 GB | 50 GB | 250 GB |
| Berichte & CSV-Export | ✔ | ✔ | ✔ |
| Eigene Subdomain / eigene Domain | – | Subdomain | eigene Domain |
| REST-API, Prioritäts-Support, SLA 99,5 % | – | – | ✔ |
| **White-Label-App im App Store / Google Play** | – | – | Zusatz: 1.990 € einmalig + 99 €/Monat |

- **30 Tage kostenlos testen**, ohne Zahlungsdaten. Jahreszahlung: 2 Monate geschenkt.
- **Abrechnungsregel** (Rechnungsvorschau der Konsole, aus der Lizenz-Historie): Bezahlt ist eine Lizenz, solange sie
  aktiv ist – auch während einer Sperre (AGB § 14 Abs. 4) – bis zum Ende der Laufzeit; Testtage werden nie berechnet.
  Monatszahler: jeder Kalendermonat mit mindestens einem bezahlten Tag, auch der Monat, in dem eine Kündigung wirksam
  wird; Tarif und Zusätze wie am letzten bezahlten Tag des Monats. Jahreszahler: 12 Monate zum Preis von 10 im ersten
  bezahlten Monat und dann alle 12 Monate, nicht, wenn die Laufzeit vor dem Verlängerungstag endet; Änderungen im
  bezahlten Jahr gelten ab der Verlängerung. Wechsel monatlich → jährlich startet im Wechselmonat ein neues Jahr,
  jährlich → monatlich rechnet Monatsbeiträge erst nach dem bezahlten Jahr. Einrichtung der Store-App: 1.990 €
  einmalig im ersten bezahlten Monat mit App. Jede Zeile nennt ihren Grund; die Vorschau zeigt 12 Monate zurück und
  12 voraus. Die Store-App gibt es nur zu Premium, zusätzliche Fahrer nicht im Tarif Start. Beim Verkleinern des
  Tarifs prüft die Konsole die Grenzen; eigene Domains entfallen ohne Premium, Start hat keine Subdomain.
- Partner-/Reseller-Lizenz (z. B. Verbände, Telematik-Händler): 20–30 % Provision, Roadmap.
- Nur für Unternehmer (§ 14 BGB) – kein Verbrauchergeschäft, kein Widerrufsrecht.

## 7. Recht & Compliance (Deutschland) – was mitgeliefert wird

Ordner `docs/recht/` – Muster, vor Verwendung von einer Rechtsanwältin/einem Rechtsanwalt prüfen lassen:

1. **AGB / SaaS-Lizenzvertrag (B2B)** inkl. Leistungsbeschreibung, Verfügbarkeit (SLA), Vergütung, Laufzeit,
   Kündigung, Sperrung bei Zahlungsverzug, Haftung, Datenexport und Anbieterwechsel (EU Data Act).
2. **Auftragsverarbeitungsvertrag (AVV)** nach Art. 28 DSGVO – Lizenznehmer = Verantwortlicher,
   Lizenzgeber = Auftragsverarbeiter.
3. **TOM** (technisch-organisatorische Maßnahmen, Art. 32 DSGVO) und **Liste der Unterauftragsverarbeiter**.
4. **Datenschutzerklärung** für Website und App (Art. 13 DSGVO), **Datenschutzhinweise für Fahrer**
   (Beschäftigtendaten) als Vorlage für den Lizenznehmer.
5. **Impressum** nach § 5 DDG (Platzhalter).
6. **Nutzungsbedingungen Fahrer-App** und **Muster-Betriebsvereinbarung** (§ 87 Abs. 1 Nr. 6 BetrVG).
7. **Cookie-/Speicherhinweis** nach § 25 TDDDG (nur technisch notwendige Speicherung → kein Banner nötig).
8. **Checkliste Gründung & Betrieb**: Gewerbeanmeldung, Rechtsform, Marke (DPMA/EUIPO), Domain,
   Versicherungen (IT-/Cyber-Haftpflicht), Hosting in Deutschland, Aufbewahrungsfristen, Barrierefreiheit,
   NIS2-Einordnung, Steuer.

Technische Umsetzung der Pflichten in der App: keine externen Schriften/Tracker (Schriften lokal), Rollen- und
Mandantentrennung, Passwörter mit scrypt, eigenes Passwort beim ersten Login erzwungen, optionale Zwei-Faktor-Anmeldung,
API-Schlüssel nur als Hash, Einladungslinks einmal gültig und befristet, Sitzungen enden mit Sperre, Kündigung und
Passwortwechsel, Protokoll (Audit-Log) mit Anmeldungen, Fehlversuchen und Exporten inkl. IP (IP nach 90 Tagen
entfernt), Löschfristen je Mandant (gelöschte Dateien auch vom Datenträger), Löschen von Personen (anonymisiert),
Datenexport als ZIP, entschärfte Formeln in CSV-Dateien, Standort nur mit Einwilligung und nur bei Statuswechsel,
kein Zugriff des Lizenzgebers auf Auftragsdaten. Hosting in Deutschland ist eine Betriebsentscheidung (geplant; Vorlage in `deploy/`),
keine Eigenschaft des Codes.

## 8. Technik

- **Eine Codebasis, drei Oberflächen**: Web-App (Desktop/Tablet), installierbare **PWA** für Android und iOS
  (Home-Bildschirm, Push auf dem iPhone ab iOS 16.4, wenn die App auf dem Home-Bildschirm liegt), optional
  **Store-Apps** über Capacitor (Ordner `mobile/`, vorbereitet).
- **Kern-Engine** `core/engine.js` – reine JavaScript-Logik (Rechte, Statusmaschine, Benachrichtigungen),
  identisch im Server und in der Online-Demo.
- **Server** Node.js 22 ohne Framework, SQLite (`node:sqlite`), Live-Updates per Server-Sent Events,
  **Web-Push (VAPID)** nur über die Push-Dienste der Browser-Hersteller, Datei-Uploads mit Typprüfung und
  Speicherkontingent, Sicherheits-Header, steigende Login-Sperre nach Fehlversuchen, Kennung gegen doppeltes Senden
  für jede schreibende Aktion; ein Fehler in einer Anfrage beendet den Server nicht.
- **Service Worker**: speichert die ganze App (alle Module, Schriften, Symbole, Firmenlogo) für den Start ohne Netz.
- **Mandanten-Branding** dynamisch: Manifest, Icons und Login-Seite je Firmencode, Subdomain oder eigener Domain
  (Subdomain und Domain brauchen einen DNS-Eintrag und eine Zeile im `deploy/Caddyfile`).
- **Online-Demo**: dieselbe App mit lokaler Engine; Büro und Fahrer-Handy nebeneinander in einem Fenster; Live-Sync
  zwischen zwei Geräten (Handy ↔ PC) in der Artifact-Fassung mit gemeinsamem Speicher. Export als ZIP auch in der Demo.

## 9. Roadmap

| Phase | Inhalt |
|---|---|
| **v1.0 (jetzt)** | alles oben: Lizenzkonsole, White-Label, Disposition, Fahrer-App, Push, Offline, 8 Sprachen, Recht |
| v1.1 | Zwischenstopps (Sammeltouren), Kundenportal mit Sendungsverfolgungs-Link, Webhooks |
| v1.2 | Abrechnung automatisch (SEPA-Lastschrift, Rechnungen, Anbindung lexoffice/sevDesk/DATEV) |
| v1.3 | eCMR (elektronischer Frachtbrief), Schnittstellen zu Frachtbörsen und Telematik |
| v2.0 | Arbeitszeit-/Spesenerfassung, Lenk- und Ruhezeit-Hinweise, KI-Erkennung von Lieferscheinen (OCR) |
