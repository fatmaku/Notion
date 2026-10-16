# LADEKLAR – Produktplan

> **Ladeklar** – die White-Label-App für Speditionen und Transportunternehmen.
> Fahrer tippen statt telefonieren, die Disposition sieht jede Tour live, der Lieferschein ist da,
> bevor der LKW vom Hof rollt.
>
> Claim: **„Ein Tipp. Alles klar.“** · Zweitclaim: **„Tippen statt telefonieren.“**

Stand: 16.10.2026 · Version 1.0 · Zielmarkt Deutschland (DACH vorbereitet)

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
 • sperren/verlängern        • LKW- und Auflieger-Pool               • Lieferung wählen/bestätigen
 • Umsatz (MRR), Abrechnung  • Lieferungen anlegen (Route, Zeit)     • Aufgeladen / Abgeladen
 • keine Einsicht in         • Live-Übersicht, Verlauf, Push         • Lieferschein fotografieren
   Auftragsdaten (AVV)       • Lieferschein-Archiv, Export           • Notiz, Problem melden
```

## 2. Rollen und Rechte

| Rolle | Wer | Darf | Darf nicht |
|---|---|---|---|
| **Lizenzgeber** (`platform`) | Plattformbetreiber (du, ggf. Mitarbeiter) | Lizenznehmer anlegen, Tarif/Plätze/Laufzeit/Status ändern, Branding setzen, Kennzahlen (Anzahl Fahrer, Fahrzeuge, Lieferungen) und Abrechnung sehen | Lieferungen, Lieferscheine, Fahrernamen oder Notizen eines Lizenznehmers einsehen (Datenschutz, AVV). Support-Zugriff nur, wenn der Lizenznehmer ihn freigibt (zeitlich begrenzt, protokolliert). |
| **Unternehmens-Admin** (`admin`) | Inhaber/Leitung des Lizenznehmers | alles im eigenen Unternehmen: Branding, Einstellungen, Team, Fahrer, Fahrzeuge, Lieferungen, Export, Support-Freigabe | andere Unternehmen sehen |
| **Disponent** (`dispatcher`) | Disposition | Lieferungen anlegen/ändern/zuweisen/stornieren, Fahrer und Fahrzeuge anlegen, Live-Übersicht, Verlauf, Notizen | Branding, Abo, Team-Admins, Datenexport, Löschungen von Fahrern |
| **Fahrer** (`driver`) | angestellte Fahrer und Subunternehmer-Fahrer | eigene Fahrzeugwahl aus dem Pool, Lieferungen sehen, die ihm zugewiesen oder für alle freigegeben sind, Status bestätigen, Fotos/Lieferschein hochladen, Notizen, Problem melden, eigener Verlauf | Lieferungen anderer Fahrer sehen, Stammdaten ändern |

Mandantentrennung ist im Kern (Engine) erzwungen: Jede Abfrage und Aktion prüft die `tenantId` des
angemeldeten Nutzers. Ein Test stellt sicher, dass Unternehmen A nie Daten von Unternehmen B sieht.

## 3. Kernabläufe

### 3.1 Lizenzgeber legt einen Lizenznehmer an
1. Plattform-Konsole → **„+ Lizenznehmer“**: Firmenname, Anschrift, Ansprechpartner, E-Mail, Telefon.
2. Tarif wählen (Start / Flotte / Premium), Testzeitraum (Standard 30 Tage) oder Laufzeit.
3. Firmencode wird vorgeschlagen (z. B. `KAYA`), Buchungsnummern-Präfix (z. B. `KAY`).
4. Admin-Zugang wird erzeugt (E-Mail + Startpasswort, beim ersten Login ändern).
5. Optional: Logo und Markenfarbe gleich mitgeben – oder der Kunde macht es selbst.

### 3.2 Lizenznehmer richtet sich ein (Einrichtungs-Assistent, 4 Schritte)
1. **Logo & Farbe** hochladen → App, Login-Seite, Handy-Icon und Push-Mitteilungen tragen das eigene Logo.
2. **Fahrzeuge** anlegen: Kennzeichen, Art (Sattelzugmaschine, Solo-LKW, Gliederzug, Transporter,
   Kühlkoffer, Kipper, Tank, Auflieger Plane/Kühl/Kipper/Container), Nutzlast, Stellplätze,
   Ausstattung (Ladebordwand, Kühlung, ADR), HU-/SP-Termin.
3. **Fahrer** anlegen: Name, Handynummer, Sprache, Führerscheinklasse. Die App erzeugt eine 6-stellige PIN
   und einen **Einladungstext mit Link/QR** zum Weiterleiten per WhatsApp/SMS.
4. **Erste Lieferung** anlegen.

### 3.3 Disponent legt eine Lieferung an
Pflicht: **Route** (Ladeort → Entladeort, z. B. *Stuttgart → Hamburg*), **Ladedatum**.
Optional: Auftraggeber, Kundenreferenz, Adressen, Zeitfenster, Ansprechpartner + Telefon an Lade-/Entladestelle,
Ware, Paletten, Gewicht, ADR (Gefahrgut), Temperatur, Hinweise für den Fahrer, Fahrer und Fahrzeug.

- **Buchungsnummer** wird automatisch vergeben: `KAY-2610-0042` (Präfix – Jahr/Monat – laufende Nr.).
- **Zuweisen** an einen Fahrer **oder** als **„offen für alle Fahrer“** veröffentlichen – dann kann
  sich ein freier Fahrer die Tour selbst nehmen (abschaltbar).
- **„Wiederholen“** kopiert eine frühere Lieferung (Stammrouten in Sekunden).
- Orte, die schon einmal verwendet wurden, werden beim Tippen vorgeschlagen (kein extra Adressbuch nötig).

### 3.4 Fahrer – die ganze App ist ein Knopf
Die Fahrer-Ansicht zeigt **immer genau einen großen Knopf: den nächsten Schritt.**

```
 [Zugang]     Firmencode + Handynummer + PIN  (oder Einladungslink: nur PIN)
 [LKW]        Fahrzeug aus dem Pool tippen  (+ optional Auflieger)
 [Auftrag]    Lieferung aus „Meine/Offene Aufträge“ tippen
   ✔  Buchung bestätigen            → Status „Bestätigt“        → Push an Disposition
 ( 📍 Angekommen Ladestelle )        → optional, misst Standzeit (Standgeld)
   ⬆📦 Aufgeladen                    → Status „Beladen/Unterwegs“ → Push
 ( 📍 Angekommen Entladestelle )     → optional
   ⬇📦 Abgeladen                     → Status „Entladen“          → Push  (+ optional Palettentausch)
   📷 Lieferschein fotografieren     → 1–n Fotos/PDF, automatisch verkleinert
   ✍  optional Empfänger + Unterschrift
   ✔  Bestätigen & abschließen       → Status „Zugestellt“        → Push mit Lieferschein
```

Jederzeit verfügbar: **Notiz** (Freitext + Schnellbausteine: „Stau“, „Warte an Rampe“, „Kunde nicht da“, …),
**Problem melden** (Stau/Verspätung, Panne, Unfall, Ware beschädigt, Annahme verweigert, Adresse falsch,
Sonstiges – mit Foto), **Navigation** (öffnet Google Maps / Apple Karten), **Anrufen** (Disposition,
Ansprechpartner Ladestelle). **Rückgängig** ist 2 Minuten lang nach jedem Schritt möglich.
**Zurückgeben**: Der Fahrer kann eine bestätigte, noch nicht beladene Tour mit Grund zurückgeben.

### 3.5 Disposition sieht alles live
- **Live-Board**: Kacheln „Offen · Unterwegs · Heute zugestellt · Störungen“, darunter jede aktive Tour mit
  Fortschrittsleiste, Fahrer, Kennzeichen, Route, letzter Meldung („vor 3 Min.“).
- **Push-Benachrichtigung** bei jedem Schritt (Bestätigt, Aufgeladen, Abgeladen, Zugestellt + Lieferschein,
  Problem = hohe Priorität, Notiz, Zurückgegeben). Zusätzlich In-App-Mitteilung mit Ton und Glocke.
- **Verlauf** jeder Lieferung: Zeitstrahl mit Uhrzeit, Person, optional Standort beim Statuswechsel.
- **Gegenwart / Zukunft / Vergangenheit**: Reiter „Aktiv“, „Geplant“, „Offen“, „Erledigt“, „Alle“ + Suche
  nach Buchungsnummer, Ort, Fahrer, Kennzeichen, Referenz.
- **Abliefernachweis** (druckbar als PDF): Buchungsdaten, Zeitstrahl, Lieferschein-Fotos, Unterschrift –
  sofort an Kunde oder Buchhaltung, Rechnung kann am selben Tag raus.
- **Berichte**: Lieferungen je Fahrer/Monat, Pünktlichkeit, mittlere Standzeit, Export CSV.

## 4. Was wir zusätzlich eingebaut haben (Lückenanalyse → geschlossen)

| Lücke im Alltag | Lösung in Ladeklar | Status |
|---|---|---|
| Fahrer sprechen oft Polnisch, Rumänisch, Tschechisch, Türkisch, Russisch, Ukrainisch | Fahrer-App in **8 Sprachen** (DE, EN, PL, RO, CS, TR, RU, UK), dazu Icons statt Text | v1 |
| Handy während der Fahrt ist verboten (§ 23 Abs. 1a StVO) | **Fahrsperre**: ab ca. 8 km/h überdeckt ein Hinweis die Knöpfe (optional, nur mit Standortfreigabe) | v1 |
| Funklöcher, Auslandsroaming | **Offline-Warteschlange**: Schritte und Fotos werden gespeichert und gesendet, sobald Netz da ist; Fotos werden auf ~200 KB verkleinert | v1 |
| Versehentliche Tipps mit Handschuhen | große Knöpfe (≥ 64 px), **Rückgängig 2 Min.** statt Rückfragen | v1 |
| Lieferscheine kommen Tage später oder gar nicht ins Büro | Foto-Pflicht vor Abschluss (abschaltbar), Archiv je Lieferung, Abliefernachweis | v1 |
| Wartezeiten an der Rampe werden nicht bezahlt | optional **Ankunft erfassen** → Standzeit wird berechnet (Grundlage für Standgeld) | v1 |
| Palettentausch (EPAL) wird vergessen | optional **Palettentausch** beim Abladen (abgegeben/mitgenommen) | v1 |
| Ein LKW darf nicht von zwei Fahrern gleichzeitig gewählt werden | Fahrzeug ist belegt, bis der Fahrer es freigibt; Disposition kann freigeben | v1 |
| Abgelaufene HU/SP werden übersehen | **Fristen** je Fahrzeug, Warnung 30 Tage vorher, belegte/werkstatt-Status | v1 |
| Stammrouten jede Woche neu tippen | **Wiederholen** + Ortsvorschläge aus dem Verlauf | v1 |
| Unterschrift des Empfängers | optional **Unterschriftenfeld** auf dem Display | v1 |
| Datenschutz/Betriebsrat bei Ortung | **keine Dauerortung**: Standort nur im Moment eines Statuswechsels und nur, wenn das Unternehmen es einschaltet; Muster-Betriebsvereinbarung liegt bei | v1 |
| Fahrer verlieren Zugangsdaten | Einladungslink/QR, PIN-Reset durch Disposition, Sitzung bleibt 90 Tage angemeldet | v1 |
| Kunde will eigene App im Store | **White-Label-App** (Capacitor) mit eigenem Namen/Icon – Premium-Zusatz | vorbereitet |
| Anbindung an TMS/Buchhaltung | **REST-API** mit API-Schlüssel (Premium), CSV-Export, Webhook (Roadmap) | v1 (API Basis) |
| Daten mitnehmen bei Kündigung (EU Data Act) | **Datenexport** (JSON + CSV + Dateien) jederzeit durch Admin | v1 |
| Lizenz läuft ab / Zahlung fehlt | Status *Test · Aktiv · Gesperrt · Gekündigt*; gesperrt = nur Lesen + Export | v1 |
| Platzgrenzen je Tarif | Fahrer-/Fahrzeuglimits werden geprüft, klare Hinweise zum Upgrade | v1 |
| Nachtschicht / Kabine dunkel | automatischer **Dunkelmodus** | v1 |
| Grenzüberschreitend (CMR) | Feld Land/Länderkennzeichen, CMR-Frachtbrief als Dokumentart, eCMR-Schnittstelle (Roadmap) | v1 / Roadmap |

## 5. Datenmodell (vereinfacht)

- **Tenant** (Lizenznehmer): `id, code, name, address, phone, email, plan, seats, status, trialEnd, licenseEnd,
  branding{appName, logo, color}, settings{driverPicksTruck, driverTakesOpen, requirePod, requireSignature,
  trackArrival, palletExchange, driveLock, geoOnStatus, bookingPrefix, retentionYears}, apiKey, supportAccessUntil`
- **User**: `id, tenantId, role, name, email | phone, passwordHash | pinHash, lang, active, vehicleId, trailerId`
- **Vehicle**: `id, tenantId, kind(truck|trailer), plate, type, payloadKg, pallets, features[], status(available|in_use|workshop), driverId, huDue, spDue, note`
- **Delivery**: `id, tenantId, bookingNo, customer, reference, pickup{place, street, zip, city, country, date, from, to, contact, phone},
  dropoff{…}, goods{text, pallets, weightKg, adr, temp}, driverId, vehicleId, trailerId, openForAll, status, problem,
  notes[], events[], docs[], palletExchange, receiver, signatureId, createdAt, updatedAt`
- **Status**: `open → accepted → (arrived_pickup) → loaded → (arrived_dropoff) → unloaded → delivered` · `cancelled`
- **Notification**, **File** (Lieferschein, Foto, Unterschrift, Logo), **AuditLog**, **Session**, **PushSubscription**

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
| Berichte & CSV-Export | Basis | ✔ | ✔ |
| Eigene Subdomain / eigene Domain | – | Subdomain | eigene Domain |
| REST-API, Prioritäts-Support, SLA 99,5 % | – | – | ✔ |
| **White-Label-App im App Store / Google Play** | – | – | Zusatz: 1.990 € einmalig + 99 €/Monat |

- **30 Tage kostenlos testen**, ohne Zahlungsdaten. Jahreszahlung: 2 Monate geschenkt.
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

Technische Umsetzung der Pflichten in der App: Hosting EU/Deutschland, keine externen Schriften/Tracker
(Schriften lokal), Rollen- und Mandantentrennung, Passwörter mit scrypt, Protokoll (Audit-Log), Löschfristen
je Mandant, Datenexport, Standort nur mit Einwilligung und nur bei Statuswechsel, Support-Zugriff nur mit
Freigabe.

## 8. Technik

- **Eine Codebasis, drei Oberflächen**: Web-App (Desktop/Tablet), installierbare **PWA** für Android und iOS
  (Home-Bildschirm, Push ab iOS 16.4), optional **Store-Apps** über Capacitor (Ordner `mobile/`).
- **Kern-Engine** `core/engine.js` – reine JavaScript-Logik (Rechte, Statusmaschine, Benachrichtigungen),
  identisch im Server und in der Online-Demo.
- **Server** Node.js 22 ohne Framework, SQLite (`node:sqlite`), Live-Updates per Server-Sent Events,
  **Web-Push (VAPID)**, Datei-Uploads mit Typprüfung, Sicherheits-Header, Login-Sperre nach Fehlversuchen.
- **Mandanten-Branding** dynamisch: Manifest, Icons und Login-Seite je Firmencode bzw. Subdomain.
- **Online-Demo**: dieselbe App mit lokaler Engine; Live-Sync zwischen zwei Geräten (Handy ↔ PC) möglich.

## 9. Roadmap

| Phase | Inhalt |
|---|---|
| **v1.0 (jetzt)** | alles oben: Lizenzkonsole, White-Label, Disposition, Fahrer-App, Push, Offline, 8 Sprachen, Recht |
| v1.1 | Zwischenstopps (Sammeltouren), Kundenportal mit Sendungsverfolgungs-Link, Webhooks |
| v1.2 | Abrechnung automatisch (SEPA-Lastschrift, Rechnungen, Anbindung lexoffice/sevDesk/DATEV) |
| v1.3 | eCMR (elektronischer Frachtbrief), Schnittstellen zu Frachtbörsen und Telematik |
| v2.0 | Arbeitszeit-/Spesenerfassung, Lenk- und Ruhezeit-Hinweise, KI-Erkennung von Lieferscheinen (OCR) |
