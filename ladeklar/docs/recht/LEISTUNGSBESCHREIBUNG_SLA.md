# Leistungsbeschreibung und Service Level Agreement LADEKLAR

> **Hinweis – Muster, keine Rechtsberatung.**
> Dieses Dokument ist ein Mustertext für LADEKLAR. Es ersetzt keine Rechtsberatung und ist vor Verwendung anwaltlich prüfen zu lassen. Platzhalter in [eckigen Klammern] ausfüllen. Mit „Prüfhinweis“ gekennzeichnete Anmerkungen richten sich an die prüfende Anwältin bzw. den prüfenden Anwalt und sind vor Veröffentlichung zu entfernen. Recherchestand: 16.10.2026.

Anlage zu den AGB von [Firma] [Rechtsform] („Anbieter“). Begriffe wie in § 2 AGB.

Stand: [Datum] · Version [1.0]

---

# Teil A – Leistungsbeschreibung

## 1. Überblick

(1) LADEKLAR ist eine White-Label-Plattform für Transportunternehmen. Fahrer melden den Fortschritt ihrer Lieferungen über große Schaltflächen in der App, die Disposition sieht jede Tour in Echtzeit, und Lieferscheine liegen als Foto vor, bevor das Fahrzeug die Entladestelle verlässt.

(2) Bereitstellungsformen:

1. **Web-App** für Desktop und Tablet (Disposition und Administration);
2. **installierbare Web-App (PWA)** für Android und iOS (Fahrer-App, Startbildschirm-Symbol, Push-Benachrichtigungen unter iOS ab Version 16.4);
3. **White-Label-App** für Apple App Store und Google Play (nur Tarif Premium als Zusatzleistung, § 6 Abs. 3 AGB).

(3) Die Plattform wird ausschließlich in Rechenzentren in Deutschland betrieben ([Hosting-Anbieter], [Standort], zertifiziert nach ISO/IEC 27001). Es werden keine Analyse-, Tracking- oder Werbedienste und keine extern geladenen Schriften oder Skripte eingesetzt.

(4) Technische Voraussetzungen beim Kunden:

| Komponente | Voraussetzung |
|---|---|
| Browser (Disposition) | jeweils aktuelle und vorherige Hauptversion von Chrome, Edge, Firefox, Safari |
| Fahrer-Geräte | Android ab Version [10] mit aktuellem Chrome; iOS/iPadOS ab Version 16.4 mit Safari |
| Netz | Internetzugang; die Fahrer-App arbeitet bei Funklöchern mit der Offline-Warteschlange (Ziffer 2.6) |
| Push | vom Nutzer erteilte Berechtigung für Benachrichtigungen; unter iOS nur nach Installation auf dem Startbildschirm |
| Standortfunktionen | vom Kunden eingeschaltet und vom Fahrer im Gerät freigegeben (Ziffer 2.8) |

## 2. Funktionen je Rolle

### 2.1 Anbieter (Plattform-Konsole)

(1) Der Anbieter legt Mandanten an, verwaltet Tarif, Plätze, Laufzeit und Status (Test, Aktiv, Gesperrt, Gekündigt), kann das Branding bei der Ersteinrichtung setzen und sieht je Mandant ausschließlich Kennzahlen (Anzahl Fahrer, Fahrzeuge, Lieferungen, belegter Speicher) sowie Abrechnungsdaten.

(2) Der Anbieter sieht keine Lieferungen, Lieferscheine, Fotos, Unterschriften, Notizen, Fahrernamen oder Standortangaben. Die Plattform setzt diese Trennung technisch durch. Ein Support-Zugriff ist nur nach Freigabe durch den Admin des Kunden möglich (AVV Anlage 4).

### 2.2 Unternehmens-Admin

Alle Funktionen im eigenen Mandanten, insbesondere:

1. Einrichtungsassistent in vier Schritten: Logo und Farbe, Fahrzeuge, Fahrer, erste Lieferung;
2. Branding: Logo, Markenfarbe, App-Name; Subdomain (Flotte) bzw. eigene Domain (Premium);
3. Verwaltung von Team (Admins, Disponenten), Fahrern und Fahrzeugen;
4. Einstellungen des Mandanten: Fahrer wählt Fahrzeug selbst, offene Touren für alle Fahrer, Fotopflicht vor Abschluss, Unterschrift, Ankunftserfassung (Standzeit), Palettentausch, Fahrsperre, Standort beim Statuswechsel, Buchungsnummern-Präfix, Löschfristen;
5. Datenexport (JSON, CSV, Dateien) jederzeit, auch im Status „Gesperrt“;
6. Freigabe und Widerruf des Support-Zugriffs;
7. Einsicht in das Protokoll (Audit-Log) des Mandanten;
8. Verwaltung des Abonnements (Tarif, Zahlweise, Kündigung) und der Referenznennung;
9. REST-API-Schlüssel (Premium).

### 2.3 Disponent

1. Lieferungen anlegen, ändern, zuweisen, als „offen für alle Fahrer“ veröffentlichen, stornieren und wiederholen; Pflichtangaben sind Route (Ladeort und Entladeort) und Ladedatum; Ortsvorschläge aus früheren Lieferungen;
2. automatische Buchungsnummer im Format Präfix–Jahr/Monat–laufende Nummer (z. B. `KAY-2610-0042`);
3. Live-Board mit den Kacheln „Offen“, „Unterwegs“, „Heute zugestellt“, „Störungen“ und allen aktiven Touren;
4. Verlauf jeder Lieferung als Zeitstrahl mit Uhrzeit, Person und – falls eingeschaltet – Standort beim Statuswechsel;
5. Reiter „Aktiv“, „Geplant“, „Offen“, „Erledigt“, „Alle“ und Suche nach Buchungsnummer, Ort, Fahrer, Kennzeichen und Referenz;
6. Abliefernachweis als PDF mit Buchungsdaten, Zeitstrahl, Lieferschein-Fotos und Unterschrift;
7. Berichte (Lieferungen je Fahrer und Monat, Pünktlichkeit, mittlere Standzeit) mit CSV-Export – im Tarif Start in Basisform;
8. Fahrer und Fahrzeuge anlegen, PIN zurücksetzen, belegte Fahrzeuge freigeben;
9. Fristen je Fahrzeug (HU/SP) mit Warnung 30 Tage vorher.

Disponenten haben keinen Zugriff auf Branding, Abonnement, Team-Admins, Datenexport und das Löschen von Fahrern.

### 2.4 Fahrer

1. Anmeldung mit Firmencode, Handynummer und sechsstelliger PIN oder über einen Einladungslink mit PIN; die Sitzung bleibt bis zu 90 Tage angemeldet;
2. Wahl des Fahrzeugs und optional des Aufliegers aus dem Pool; ein gewähltes Fahrzeug ist für andere Fahrer belegt;
3. Anzeige der eigenen und der für alle freigegebenen Lieferungen; keine Einsicht in Lieferungen anderer Fahrer;
4. Schrittfolge mit genau einer großen Schaltfläche für den nächsten Schritt: Buchung bestätigen – optional „Angekommen Ladestelle“ – Aufgeladen – optional „Angekommen Entladestelle“ – Abgeladen (optional Palettentausch) – Lieferschein fotografieren (ein oder mehrere Fotos oder PDF) – optional Empfänger und Unterschrift – Bestätigen und abschließen;
5. jederzeit: Notiz (Freitext und Schnellbausteine), Problem melden (Stau/Verspätung, Panne, Unfall, Ware beschädigt, Annahme verweigert, Adresse falsch, Sonstiges – mit Foto), Navigation (öffnet Google Maps bzw. Apple Karten), Anruf bei Disposition oder Ansprechpartner;
6. **Rückgängig:** Jeder Schritt kann innerhalb von 2 Minuten zurückgenommen werden. Die Rücknahme wird im Verlauf protokolliert;
7. **Zurückgeben:** Eine bestätigte, noch nicht beladene Tour kann mit Angabe eines Grundes zurückgegeben werden;
8. eigener Verlauf; automatischer Dunkelmodus; Schaltflächen mit mindestens 64 px Kantenlänge.

### 2.5 Benachrichtigungen

(1) Die Disposition erhält bei jedem Schritt eine Benachrichtigung (Bestätigt, Aufgeladen, Abgeladen, Zugestellt, Problem mit hoher Priorität, Notiz, Zurückgegeben) als In-App-Mitteilung mit Ton und – soweit freigegeben – als Push-Benachrichtigung.

(2) Push-Benachrichtigungen werden nach dem Web-Push-Standard mit VAPID versendet. Die Nachrichteninhalte werden Ende-zu-Ende verschlüsselt (RFC 8291) und über den Push-Dienst übermittelt, den der jeweilige Browser bzw. das Betriebssystem vorgibt (z. B. Google, Apple, Mozilla, Microsoft). Push-Nachrichten enthalten nur die für die Benachrichtigung erforderlichen Angaben (z. B. Buchungsnummer, Status); Fotos und Dokumente werden nicht per Push übertragen, sondern nach Anmeldung in der App angezeigt.

> **Prüfhinweis (Technik):** Inhalt der Push-Nachrichten festlegen und dokumentieren (insbesondere, ob Fahrernamen enthalten sind). Bei der White-Label-App laufen Benachrichtigungen über Firebase Cloud Messaging bzw. Apple Push Notification service; dort ist die Nutzlast nicht automatisch Ende-zu-Ende verschlüsselt. Empfehlung: nur Kennungen übertragen, Inhalte nach Abruf laden.

### 2.6 Offline-Funktion

(1) Bei fehlender Verbindung speichert die Fahrer-App Schritte, Notizen und Fotos in einer Warteschlange im Gerät und sendet sie automatisch, sobald wieder eine Verbindung besteht. Fotos werden im Gerät auf etwa 200 KB verkleinert.

(2) Für offline erfasste Schritte werden der Zeitpunkt der Erfassung im Gerät und der Zeitpunkt des Eingangs beim Server gespeichert und im Verlauf als „offline erfasst“ gekennzeichnet.

(3) Noch nicht gesendete Einträge gehen verloren, wenn der Fahrer die Browserdaten löscht oder die App deinstalliert, bevor die Warteschlange gesendet ist. Die App weist vor dem Abmelden auf ungesendete Einträge hin.

> **Prüfhinweis (Technik):** Ziffer (2) und der Hinweis vor dem Abmelden sind als Anforderungen formuliert und vor Veröffentlichung mit der Umsetzung abzugleichen. Doppelte Zeitstempel erhöhen die Nachvollziehbarkeit (Integrität) der Abliefernachweise.

### 2.8 Sprachen

Die Fahrer-App ist in acht Sprachen verfügbar: Deutsch, Englisch, Polnisch, Rumänisch, Türkisch, Russisch und Ukrainisch. Die Oberfläche nutzt zusätzlich Symbole. Disposition und Administration sind in [Deutsch und Englisch] verfügbar.

### 2.8 Standortfunktionen

(1) Die Plattform ortet Fahrer und Fahrzeuge **nicht fortlaufend**. Es gibt keine Dauerortung und keine Bewegungsprofile.

(2) **Standort beim Statuswechsel** (optional, Einstellung des Kunden): Ist die Funktion eingeschaltet und hat der Fahrer die Standortfreigabe im Gerät erteilt, wird im Moment des Tippens auf einen Statusschritt einmalig der Standort abgefragt und mit dem Ereignis gespeichert. Ohne Freigabe funktioniert der Statusschritt ohne Standort.

(3) **Fahrsperre** (optional, Einstellung des Kunden): Ab einer Geschwindigkeit von etwa 8 km/h überdeckt ein Hinweis die Schaltflächen. Die Geschwindigkeit wird ausschließlich im Gerät ausgewertet und nicht an den Server übertragen. Die Fahrsperre setzt eine Standortfreigabe voraus und erkennt nicht, ob bei stehendem Fahrzeug der Motor läuft.

(4) **Ankunftserfassung** (optional): Die Schritte „Angekommen Ladestelle/Entladestelle“ dienen der Berechnung der Standzeit (Grundlage für Standgeld). Sie werden vom Fahrer ausgelöst, nicht automatisch erkannt.

> **Prüfhinweis (Technik):** Bestätigen, dass (a) die Fahrsperre die Position nur lokal auswertet und nicht speichert oder überträgt, (b) der Statusschritt ohne Standort funktioniert, (c) beim Verkleinern der Fotos Metadaten (EXIF, insbesondere GPS-Koordinaten) entfernt werden. Andernfalls sind AVV, TOM und Datenschutzhinweise anzupassen.

### 2.9 Abliefernachweis, Dokumente, Unterschrift

(1) Der Abliefernachweis fasst Buchungsdaten, Zeitstrahl, Lieferschein-Fotos und – falls erfasst – Name des Empfängers und Unterschrift als PDF zusammen.

(2) Die Unterschrift auf dem Display ist eine einfache elektronische Signatur. Sie ersetzt keine gesetzlich vorgeschriebene Schriftform. Die Plattform erstellt keinen elektronischen Frachtbrief nach § 408 Abs. 3 HGB oder nach dem eCMR-Zusatzprotokoll. Ein CMR-Frachtbrief auf Papier kann als Dokumentart fotografiert werden.

(3) Nach Ablauf der Rückgängig-Frist von 2 Minuten können Fahrer Schritte nicht mehr ändern. Korrekturen durch Disponenten werden mit Person und Zeitpunkt protokolliert; der ursprüngliche Eintrag bleibt im Protokoll erhalten.

(4) Am Unterschriftenfeld wird ein vom Kunden hinterlegbarer Kurzhinweis zum Datenschutz für Empfänger angezeigt (Vorlage im Anhang der Datenschutzhinweise für Fahrer).

(5) Die Plattform ist kein revisionssicheres Archiv im Sinne der GoBD.

> **Prüfhinweis (Technik):** Ziffer (3) letzter Halbsatz und Ziffer (4) als Anforderungen mit der Umsetzung abgleichen. Empfehlung: Prüfsumme (SHA-256) je Datei im Abliefernachweis ausweisen.

### 2.10 Berichte und Export

1. Berichte und CSV-Export nach Tarif (Ziffer 3);
2. vollständiger Datenexport nach § 17 AGB in allen Tarifen: JSON, CSV und Originaldateien als ZIP-Archiv; Dokumentation der Formate unter [Website-URL/export-formate].

### 2.11 REST-API (Premium)

Lesender und schreibender Zugriff auf Lieferungen, Fahrzeuge und Dokumente des eigenen Mandanten mit API-Schlüssel. Nutzungsgrenze: [Anzahl] Anfragen je Minute. Webhooks sind Gegenstand der Produktplanung.

### 2.12 Status des Mandanten

| Status | Bedeutung |
|---|---|
| Test | Testphase (30 Tage), voller Funktionsumfang des gewählten Tarifs ohne White-Label-App |
| Aktiv | kostenpflichtiger Vertrag |
| Gesperrt | nur Lesen und Datenexport (nach Testphase, bei Zahlungsverzug) |
| Gekündigt | voller Funktionsumfang bis Vertragsende, danach Abrufzeitraum (30 Tage) |

## 3. Tarife

| Leistung | Start | Flotte | Premium |
|---|---|---|---|
| Grundpreis je Monat (netto) | 49 € | 129 € | 299 € |
| Fahrer inklusive / weitere Fahrer | 3 / nicht buchbar | 15 / 7 € | 40 / 6 € |
| Fahrzeuge (LKW und Auflieger) | 6 | 40 | unbegrenzt |
| Disponenten-Zugänge | 1 | 5 | unbegrenzt |
| Lieferschein-Speicher | 5 GB | 50 GB | 250 GB |
| Berichte, CSV-Export | Basis | voll | voll |
| Subdomain / eigene Domain | – | Subdomain | eigene Domain |
| REST-API | – | – | ja |
| Support | Standard | Standard | Priorität |
| Verfügbarkeit im Monatsmittel | 99,0 % | 99,0 % | 99,5 % |
| White-Label-App | – | – | 1.990 € einmalig + 99 €/Monat |

Jährliche Zahlweise: zwölf Monate zum zehnfachen Monatspreis. Alle Preise zuzüglich Umsatzsteuer.

## 4. Speicherkontingente

(1) Das Speicherkontingent umfasst alle Dateien des Mandanten (Fotos, PDF-Dokumente, Unterschriften, Logo). Datenbankeinträge zählen nicht dazu.

(2) Bei 80 % und bei 100 % Belegung informiert die Plattform den Admin. Damit laufende Zustellungen nicht scheitern, nimmt die Plattform Uploads bis zu einer Belegung von 110 % weiter an. Danach sind neue Uploads erst nach einem Tarifwechsel, der Buchung von Zusatzspeicher oder dem Löschen bzw. Exportieren älterer Dokumente möglich.

(3) Der Anbieter löscht keine Daten wegen Überschreitung des Kontingents.

## 5. Datensicherung

| Merkmal | Festlegung |
|---|---|
| Umfang | Datenbank und alle Dateien aller Mandanten |
| Häufigkeit | mindestens täglich [zzgl. fortlaufende Sicherung des Datenbankjournals alle [15] Minuten] |
| Verschlüsselung | vor Übertragung mit [AES-256], Schlüssel getrennt von den Sicherungen verwahrt |
| Speicherort | [Backup-Anbieter], räumlich getrennt vom Produktivsystem, in Deutschland |
| Aufbewahrung | 30 Tage rollierend |
| Wiederherstellungstest | mindestens vierteljährlich, dokumentiert |
| maximaler Datenverlust (RPO) | [24 Stunden / 15 Minuten] |

Eine Wiederherstellung einzelner Datensätze auf Wunsch des Kunden ist keine geschuldete Leistung; der Anbieter kann sie nach Aufwand anbieten.

## 6. Löschfristen je Mandant

(1) Der Admin legt die Löschfristen für seinen Mandanten fest. Nach Ablauf löscht die Plattform die Daten automatisch.

| Datenart | Voreinstellung | einstellbar |
|---|---|---|
| Lieferungen mit Verlauf, Dokumenten, Fotos, Unterschriften | [3] Jahre nach Ende des Kalenderjahres der Zustellung | 1 bis 10 Jahre |
| Standortangaben beim Statuswechsel | [90] Tage nach Zustellung | [30 Tage bis 1 Jahr] |
| In-App-Benachrichtigungen | [90] Tage | – |
| Stammdaten deaktivierter Fahrer (Handynummer, Sprache, Führerscheinklasse, PIN-Hash) | [3] Monate nach Deaktivierung; der Name bleibt in den Lieferungen bis zu deren Löschung | – |
| Audit-Log des Mandanten | [12] Monate | – |

(2) Der Admin kann einzelne Lieferungen wegen eines Streitfalls von der automatischen Löschung ausnehmen („Aufbewahrung wegen Streitfall“).

(3) Die Wahl der Löschfristen ist eine Weisung des Kunden. Er berücksichtigt dabei eigene Aufbewahrungspflichten (z. B. acht Jahre für Buchungsbelege nach § 147 Abs. 3 AO und § 257 Abs. 4 HGB) und Verjährungsfristen (z. B. § 439 HGB).

> **Prüfhinweis (Technik):** PLAN.md sieht eine Löschfrist je Mandant in Jahren vor (`retentionYears`). Getrennte Fristen für Standortangaben, Benachrichtigungen, Stammdaten deaktivierter Fahrer und Protokolle sowie die Ausnahme wegen Streitfall sind als Anforderungen formuliert und umzusetzen bzw. anzupassen.

## 7. Nicht geschuldete Leistungen

Siehe § 5 Abs. 5 AGB, insbesondere Rechts- und Steuerberatung, GoBD-Archivierung, Beweiskraft und Formwirksamkeit von Dokumenten, eCMR, Dauerortung, Arbeitszeiterfassung und Leistungen Dritter.

## 8. Informationen zum Anbieterwechsel (Art. 26 und 28 Data Act)

1. Wechselverfahren, Fristen und Unterstützung: § 17 AGB.
2. Methoden und Formate: Self-Service-Export (JSON, CSV, Originaldateien als ZIP), REST-API (Premium); Formatdokumentation unter [Website-URL/export-formate].
3. Bekannte Einschränkungen: Zugangsdaten (Passwörter, PINs) und Push-Abonnements können nicht übertragen werden und sind beim Zielanbieter neu einzurichten; die White-Label-App ist an die Plattform gebunden.
4. Standort der IT-Infrastruktur: ausschließlich Deutschland ([Hosting-Anbieter], [Backup-Anbieter]).
5. Schutz vor unrechtmäßigem staatlichem Zugriff aus Drittstaaten: Betrieb ausschließlich durch Anbieter mit Sitz in der EU, Verschlüsselung bei Übertragung und von Sicherungen, Prüfung und Anfechtung von Herausgabeverlangen, Information des Kunden, soweit zulässig. [Ergänzen]

---

# Teil B – Service Level Agreement (SLA)

## 1. Geltungsbereich

Das SLA gilt für kostenpflichtige Verträge. Für die Testphase und für Beta-Funktionen gelten keine Zusagen.

## 2. Verfügbarkeit

(1) **Zusage.** Die Plattform ist im Monatsmittel in den Tarifen Start und Flotte zu 99,0 % und im Tarif Premium zu 99,5 % verfügbar.

(2) **Verfügbar** ist die Plattform, wenn die Kernfunktionen Anmeldung, Anzeigen und Anlegen von Lieferungen sowie das Übermitteln von Statusmeldungen und Fotos am Übergabepunkt (Routerausgang des Rechenzentrums) nutzbar sind.

(3) **Berechnung:**

Verfügbarkeit (%) = (Gesamtminuten des Monats – ausgeschlossene Minuten – Ausfallminuten) ÷ (Gesamtminuten des Monats – ausgeschlossene Minuten) × 100

Bei 99,0 % entspricht dies in einem Monat mit 30 Tagen etwa 7 Stunden 12 Minuten, bei 99,5 % etwa 3 Stunden 36 Minuten zulässiger Ausfallzeit.

(4) **Messung** durch ein Überwachungssystem des Anbieters im Abstand von höchstens [einer] Minute. Ein Ausfall beginnt mit der ersten fehlgeschlagenen Prüfung, die durch eine zweite Prüfung bestätigt wird, oder mit einer berechtigten Störungsmeldung des Kunden, je nachdem, was früher liegt.

(5) **Nicht als Ausfall** gelten:

1. geplante Wartung innerhalb der Wartungsfenster (Ziffer 3) bis zu [4] Stunden je Monat;
2. Störungen außerhalb des Einflussbereichs des Anbieters, insbesondere des Internets außerhalb des Rechenzentrums, der Mobilfunknetze, der Push-Dienste, der App-Stores sowie höhere Gewalt;
3. Störungen, die der Kunde oder seine Nutzer verursacht haben, etwa durch Nutzung entgegen § 10 AGB;
4. Sperrungen nach § 14 AGB und Beschränkungen nach § 10 Abs. 2 AGB;
5. Einschränkungen von Beta-Funktionen und der REST-API, soweit die Kernfunktionen nutzbar sind.

## 3. Wartung

(1) **Wartungsfenster:** werktags zwischen 22:00 und 05:00 Uhr sowie sonn- und feiertags [ganztägig] (Zeitzone Europe/Berlin).

(2) **Ankündigung:** geplante Wartungen mit erwarteter Unterbrechung von mehr als [15] Minuten mindestens [3] Werktage vorher per E-Mail an den Admin und auf der Statusseite.

(3) **Notfallwartung:** Zur Behebung kritischer Sicherheitslücken oder zur Abwehr akuter Gefahren kann der Anbieter jederzeit Wartungen durchführen. Notfallwartungen außerhalb der Wartungsfenster gelten als Ausfallzeit, soweit sie [30] Minuten je Monat überschreiten.

(4) Die Offline-Warteschlange der Fahrer-App überbrückt kurze Unterbrechungen; Schritte werden nach Ende der Wartung übermittelt.

## 4. Gutschriften

(1) Wird die zugesagte Verfügbarkeit unterschritten, erhält der Kunde auf Antrag in Textform innerhalb von [30] Tagen nach Monatsende eine Gutschrift auf den monatlichen Grundpreis des betroffenen Monats:

| Erreichte Verfügbarkeit | Start / Flotte | Premium |
|---|---|---|
| unter 99,5 % bis 99,0 % | – | 5 % |
| unter 99,0 % bis 98,0 % | 5 % | 10 % |
| unter 98,0 % bis 97,0 % | 10 % | 15 % |
| unter 97,0 % | 15 % | 25 % |

(2) Gutschriften sind auf 25 % des monatlichen Grundpreises begrenzt und werden mit der nächsten Rechnung verrechnet. Sie werden auf Minderungs- und Schadensersatzansprüche angerechnet (§ 19 Abs. 5 AGB). Das Recht zur außerordentlichen Kündigung nach § 16 Abs. 4 AGB bleibt unberührt.

## 5. Support

| Merkmal | Start / Flotte (Standard) | Premium (Priorität) |
|---|---|---|
| Kanäle | E-Mail [Support-E-Mail], Ticket in der Plattform | zusätzlich Telefon [Telefon] |
| Supportzeiten | Werktage 09:00–17:00 Uhr | Werktage 07:00–19:00 Uhr; für Priorität 1 zusätzlich samstags 08:00–14:00 Uhr |
| Sprache | Deutsch, [Englisch] | Deutsch, [Englisch] |
| Ansprechpartner | Support-Team | [benannter Ansprechpartner] |

Support wird gegenüber Admins und Disponenten des Kunden erbracht. Fahrer wenden sich an ihre Disposition.

## 6. Störungsklassen und Reaktionszeiten

(1) Der Anbieter ordnet Meldungen nach sachlicher Prüfung einer Störungsklasse zu. Die Reaktionszeit ist die Zeit bis zur ersten qualifizierten Rückmeldung (Bestätigung, Einordnung, nächste Schritte) innerhalb der Supportzeiten. Sie ist keine Behebungszeit.

| Klasse | Beschreibung | Reaktionszeit Start / Flotte | Reaktionszeit Premium |
|---|---|---|---|
| 1 – kritisch | Plattform für alle Nutzer des Kunden nicht nutzbar, Verdacht auf Sicherheitsvorfall oder Datenverlust | 4 Stunden | 1 Stunde |
| 2 – hoch | wesentliche Funktion erheblich gestört (z. B. Anmeldung mehrerer Fahrer, Foto-Upload, Push für alle) | 8 Stunden | 4 Stunden |
| 3 – mittel | Funktion eingeschränkt, Umgehung möglich | 2 Werktage | 1 Werktag |
| 4 – gering | Fragen, Darstellungsfehler, Verbesserungsvorschläge | 5 Werktage | 3 Werktage |

(2) Der Anbieter beginnt bei Klasse 1 und 2 unverzüglich mit der Behebung und informiert den Kunden in angemessenen Abständen über den Stand.

## 7. Wiederherstellung

| Merkmal | Start / Flotte | Premium |
|---|---|---|
| Wiederherstellungszeit nach Totalausfall (RTO) | [8] Stunden | [4] Stunden |
| maximaler Datenverlust (RPO) | siehe Teil A Ziffer 5 | siehe Teil A Ziffer 5 |

## 8. Statusseite und Kommunikation

Der Anbieter veröffentlicht Störungen und Wartungen unter [Statusseite-URL]. Bei Störungen der Klasse 1 informiert er den Admin zusätzlich per E-Mail.

## 9. Pflichten des Kunden bei Störungen

Der Kunde meldet Störungen über die Supportkanäle mit Angabe von Zeitpunkt, betroffenen Nutzern und Geräten, Fehlermeldung und – soweit möglich – Bildschirmfoto, und unterstützt die Analyse in zumutbarem Umfang. Bildschirmfotos sollen keine Auftragsdaten enthalten, die für die Analyse nicht erforderlich sind.

## 10. Bericht

Auf Anfrage stellt der Anbieter einmal im Monat einen Bericht über die erreichte Verfügbarkeit des Vormonats bereit, im Tarif Premium unaufgefordert.
