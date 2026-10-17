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
| Standortfunktionen | vom Kunden eingeschaltet, vom Fahrer im Gerät freigegeben und – für das Speichern beim Statuswechsel – in der App zugestimmt (Ziffer 2.8) |

## 2. Funktionen je Rolle

### 2.1 Anbieter (Plattform-Konsole)

(1) Der Anbieter legt Mandanten an, verwaltet Tarif, zusätzliche Fahrerplätze, Zahlweise, Laufzeitende („Laufzeit bis“), Store-App (nur Premium), eigene Domains (nur Premium), Firmen- und Kontaktdaten und den Status (Test, Aktiv, Gesperrt, Gekündigt; „Abgelaufen“ ergibt sich automatisch nach Ende der Testphase oder der Laufzeit). Er kann das Branding bei der Ersteinrichtung setzen, für einen ausgesperrten Admin ein Einmalpasswort erzeugen, einen gekündigten Mandanten endgültig löschen und eine Abrechnungsvorschau je Monat als CSV abrufen. Je Mandant sieht er ausschließlich Kennzahlen (Anzahl Fahrer im Verhältnis zu den gebuchten Plätzen, Büro-Zugänge, Fahrzeuge, Lieferungen im Monat und insgesamt, letzte Aktivität) sowie Lizenz- und Abrechnungsdaten. Es gibt einen Lizenzgeber-Zugang; dessen Passwort ändert der Anbieter in der Konsole.

(2) Der Anbieter sieht keine Lieferungen, Lieferscheine, Fotos, Unterschriften, Notizen, Fahrernamen oder Standortangaben. Die Plattform setzt diese Trennung technisch durch. Der Admin des Kunden kann einen Support-Zugriff freigeben; einen Support-Modus, der dem Anbieter Einsicht gibt, hat die Plattform derzeit nicht (AVV Anlage 4).

### 2.2 Unternehmens-Admin

Alle Funktionen im eigenen Mandanten, insbesondere:

1. Einrichtung in vier Schritten: Logo und Farbe, Fahrzeuge, Fahrer, erste Lieferung, jeweils im zugehörigen Bereich der App (einen geführten Assistenten gibt es derzeit nicht);
2. Branding: Logo, Markenfarbe, App-Name; Subdomain (Flotte) bzw. eigene Domain (Premium);
3. Verwaltung von Team (Admins, Disponenten: anlegen, Name, E-Mail, Rolle und Sprache ändern, neues Passwort, sperren, löschen), Fahrern und Fahrzeugen; Löschen von Personen (Anonymisierung, AVV Anlage 1 Ziffer 1.5);
4. Einstellungen des Mandanten: Fahrer wählt Fahrzeug selbst, offene Touren für alle Fahrer, Fotopflicht vor Abschluss, Unterschrift, Ankunftserfassung (Standzeit), Palettentausch, Fahrsperre, Standort beim Statuswechsel, Auswertungen je Fahrer, Buchungsnummern-Präfix, Aufbewahrung der Lieferungen in Jahren (Ziffer 6);
5. Datenexport jederzeit, auch in den Status „Gesperrt“, „Abgelaufen“ und „Gekündigt“: „Alles als ZIP (mit Lieferscheinen)“, „Alles als JSON“, „Lieferungen als CSV“ (Ziffer 2.10);
6. Freigabe für 24 Stunden und vorzeitiges Beenden des Support-Zugriffs;
7. Einsicht in das Protokoll (Audit-Log) des Mandanten: die neuesten Einträge in den Einstellungen, das vollständige Protokoll im Datenexport;
8. Einsicht in Tarif, Preis, Fahrerplätze, Fahrzeuggrenze, Testende bzw. Laufzeitende und Lizenzstatus; Tarifwechsel, weitere Fahrerplätze, Zahlweise, Kündigung und einen Widerspruch gegen die Referenznennung teilt der Admin dem Anbieter mit, die Plattform hat dafür derzeit keine eigene Funktion;
9. REST-API-Schlüssel (Premium).

### 2.3 Disponent

1. Lieferungen anlegen, ändern, zuweisen, stornieren und wiederholen; ohne Zuweisung als „offen für alle Fahrer“ veröffentlichen – sichtbar für alle Fahrer nur, wenn die Einstellung „Fahrer dürfen offene Aufträge übernehmen“ eingeschaltet ist, sonst wartet der Auftrag auf Zuweisung; Pflichtangaben sind Route (Ladeort und Entladeort) und Ladedatum; Ortsvorschläge aus früheren Lieferungen; abgeschlossene und stornierte Lieferungen lassen sich mit „Nachbearbeiten“ nur noch bei Auftraggeber, Referenz und interner Notiz ändern;
2. automatische Buchungsnummer im Format Präfix–Jahr/Monat–laufende Nummer (z. B. `KAY-2610-0042`); die laufende Nummer beginnt jeden Monat bei 0001 und ist je Unternehmen eindeutig;
3. Live-Board mit den Kacheln „Offen“, „Unterwegs“, „Heute zugestellt“, „Störungen“ und allen aktiven Touren;
4. Verlauf jeder Lieferung als Zeitstrahl mit Uhrzeit, Person und – falls eingeschaltet – Standort beim Statuswechsel;
5. Reiter „Aktiv“, „Geplant“, „Offen“, „Erledigt“, „Alle“ und Suche nach Buchungsnummer, Ort, Fahrer, Kennzeichen und Referenz;
6. Abliefernachweis als Druckansicht (über „Drucken / PDF“ als PDF speicherbar) mit Buchungsdaten, Zeitstempeln, Fahrer und Kennzeichen, Lieferschein-Fotos und Unterschrift;
7. Berichte je Monat: Zugestellt, Pünktlichkeit, mittlere Standzeit, Palettensaldo, Tabellen je Auftraggeber und je Lade- und Entladestelle (längste mittlere Standzeit zuerst) sowie – wenn „Auswertungen je Fahrer“ eingeschaltet ist – je Fahrer; der ganze Bericht als CSV;
8. Fahrer und Fahrzeuge anlegen, ändern, Fahrer sperren, PIN zurücksetzen, Fahrzeuge löschen, belegte Fahrzeuge freigeben; den nächsten Schritt für einen Fahrer setzen, wenn er ihn telefonisch meldet (nicht das Bestätigen, kein Zurücknehmen);
9. Fristen je Fahrzeug (HU/SP) mit Warnung 30 Tage vorher;
10. Lieferliste als CSV herunterladen.

Disponenten haben keinen Zugriff auf Branding, Einstellungen, Abonnement, Büro-Zugänge, Protokoll, den vollständigen Datenexport (ZIP, JSON) und das Löschen von Personen.

### 2.4 Fahrer

1. Anmeldung mit Firmencode, Handynummer und sechsstelliger PIN oder über einen Einladungslink mit PIN; die Sitzung bleibt 90 Tage ab der letzten Nutzung angemeldet;
2. Wahl des Fahrzeugs und optional des Aufliegers aus dem Pool; ein gewähltes Fahrzeug ist für andere Fahrer belegt;
3. Anzeige der eigenen Lieferungen und – wenn „Fahrer dürfen offene Aufträge übernehmen“ eingeschaltet ist – der offenen, für alle freigegebenen Aufträge; keine Einsicht in Lieferungen anderer Fahrer;
4. Schrittfolge mit genau einer großen Schaltfläche für den nächsten Schritt: Buchung bestätigen – optional „Angekommen Ladestelle“ – Aufgeladen – optional „Angekommen Entladestelle“ – Abgeladen (optional Palettentausch) – Lieferschein fotografieren (ein oder mehrere Fotos oder PDF) – optional Empfänger und Unterschrift – Bestätigen und abschließen;
5. jederzeit: Notiz (Freitext und Schnellbausteine), Problem melden (Stau/Verspätung, Panne, Unfall, Ware beschädigt, Annahme verweigert, Adresse falsch, Lange Wartezeit, Sonstiges – optional mit Foto), Navigation (öffnet auf iPhone und iPad Apple Karten, sonst Google Maps), Anruf bei Disposition oder Ansprechpartner;
6. **Rückgängig:** Der Fahrer kann seinen eigenen letzten Schritt innerhalb von 2 Minuten zurücknehmen; maßgeblich ist die Zeit des Servers. Für Schritte, die ohne Netz getippt wurden, bietet die App „Rückgängig“ nicht an. Die Rücknahme wird im Verlauf protokolliert;
7. **Zurückgeben:** Eine bestätigte, noch nicht beladene Tour kann mit Angabe eines Grundes zurückgegeben werden;
8. eigener Verlauf; automatischer Dunkelmodus; Schaltflächen mit mindestens 64 px Kantenlänge.

### 2.5 Benachrichtigungen

(1) Die Disposition erhält bei jedem Schritt eine Benachrichtigung (Bestätigt, Aufgeladen, Abgeladen, Zugestellt, Problem mit hoher Priorität, Notiz, Zurückgegeben) als In-App-Mitteilung mit Ton und – soweit freigegeben – als Push-Benachrichtigung.

(2) Push-Benachrichtigungen werden nach dem Web-Push-Standard mit VAPID versendet. Die Nachrichteninhalte werden Ende-zu-Ende verschlüsselt (RFC 8291) und über den Push-Dienst übermittelt, den der jeweilige Browser bzw. das Betriebssystem vorgibt (z. B. Google, Apple, Mozilla, Microsoft). Push-Nachrichten enthalten Titel und Text der Mitteilung in der Sprache des Empfängers: Buchungsnummer, Route mit Lade- und Entladeort, Ladedatum, Status, den Namen des Fahrers bzw. des Absenders einer Notiz, bei Notizen und Problemen den Anfang des Textes (bis zu 120 bzw. 80 Zeichen) und bei Rückgaben den angegebenen Grund. Fotos und Dokumente werden nicht per Push übertragen, sondern nach Anmeldung in der App angezeigt. Der Push-Dienst hält eine Nachricht höchstens 24 Stunden vor.

> **Prüfhinweis (Technik):** Inhalt der Push-Nachrichten festlegen und dokumentieren (insbesondere, ob Fahrernamen enthalten sind). Stand 17.10.2026: Fahrernamen und Textauszüge sind enthalten (`core/texts.js`, `NOTIFY_TEXT`). Bei der White-Label-App laufen Benachrichtigungen über Firebase Cloud Messaging bzw. Apple Push Notification service; dort ist die Nutzlast nicht automatisch Ende-zu-Ende verschlüsselt. Empfehlung: nur Kennungen übertragen, Inhalte nach Abruf laden.

### 2.6 Offline-Funktion

(1) Bei fehlender Verbindung speichert die Fahrer-App Bestätigen, Statusschritte, Notizen, Problemmeldungen, Lieferschein-Fotos, Problemfotos und die Unterschrift in einer Warteschlange im Gerät (IndexedDB) und sendet sie in der Reihenfolge der Erfassung, sobald wieder eine Verbindung besteht. Der Abschluss einer Lieferung funktioniert vollständig ohne Netz; die Abschlussanzeige entsteht aus den Daten im Gerät. Fotos werden im Gerät auf höchstens 1.400 Pixel Kantenlänge verkleinert.

(2) Für offline erfasste Schritte speichert der Server den Zeitpunkt, zu dem die Meldung bei ihm eingeht; den Zeitpunkt des Tippens im Gerät überträgt die App nicht. Lehnt der Server einen gespeicherten Eintrag ab (z. B. weil der Schritt inzwischen erledigt ist oder die Lizenz nicht mehr aktiv ist), verwirft die App ihn und zeigt einen Hinweis.

(3) Noch nicht gesendete Einträge gehen verloren, wenn der Fahrer die Browserdaten löscht oder die App deinstalliert, bevor die Warteschlange gesendet ist. Solange Einträge warten, zeigt die App deren Zahl an und sperrt „Abmelden“.

> **Prüfhinweis (Technik):** Ziffer (2) war als Anforderung formuliert (Gerätezeit und Eingangszeit, Kennzeichnung „offline erfasst“); umgesetzt ist nur die Eingangszeit. Bei längeren Funklöchern weichen dadurch Zeitstempel und Standzeiten von der Wirklichkeit ab. Doppelte Zeitstempel erhöhen die Nachvollziehbarkeit (Integrität) der Abliefernachweise; Umsetzung empfohlen.

### 2.7 Sprachen

Die Fahrer-App ist in acht Sprachen verfügbar: Deutsch, Englisch, Polnisch, Rumänisch, Tschechisch, Türkisch, Russisch und Ukrainisch. Die Oberfläche nutzt zusätzlich Symbole. Mitteilungen erscheinen in der Sprache des Empfängers. Disposition, Administration und Lizenzgeber-Konsole sind vollständig auf Deutsch, Englisch und Türkisch übersetzt; in den übrigen fünf Sprachen erscheinen dort noch nicht übersetzte Texte auf Englisch.

### 2.8 Standortfunktionen

(1) Die Plattform ortet Fahrer und Fahrzeuge **nicht fortlaufend**. Es gibt keine Dauerortung und keine Bewegungsprofile.

(2) **Standort beim Statuswechsel** (optional, Einstellung des Kunden, Voreinstellung aus): Ist die Funktion eingeschaltet, fragt die App den Fahrer einmal, ob er den Standort teilen möchte („Ja, teilen“ / „Nein, danke“; änderbar unter „Mehr“). Hat er zugestimmt und die Standortfreigabe im Gerät erteilt, wird beim Tippen auf einen Statusschritt und beim Melden eines Problems einmalig der Standort abgefragt (das Gerät darf eine bis zu einer Minute alte Position liefern) und mit dem Ereignis gespeichert. Der Server speichert ihn nur bei eingeschalteter Funktion und erteilter Zustimmung und löscht die Koordinaten nach 90 Tagen. Die Disposition sieht den Standort im Verlauf als Link, der Google Maps öffnet. Ohne Zustimmung oder Freigabe funktioniert der Statusschritt ohne Standort.

(3) **Fahrsperre** (optional, Einstellung des Kunden, Voreinstellung an): Ab einer Geschwindigkeit von etwa 8 km/h überdeckt ein Hinweis die Schaltflächen; etwa 5 Sekunden nach dem Anhalten sind sie wieder frei. Die Geschwindigkeit wird ausschließlich im Gerät ausgewertet; die App speichert und überträgt die Position dafür nicht. Die Fahrsperre ist von Abs. 2 unabhängig und setzt nur die Standortfreigabe im Gerät voraus. Die App bittet den Fahrer einmal mit einer Erklärung um die Freigabe; „Später“ blendet die Frage 7 Tage aus. Die Fahrsperre erkennt nicht, ob bei stehendem Fahrzeug der Motor läuft, und ist in der Online-Demo nicht aktiv.

(4) **Ankunftserfassung** (optional): Die Schritte „Angekommen Ladestelle/Entladestelle“ dienen der Berechnung der Standzeit (Grundlage für Standgeld): von „Angekommen“ bis „Aufgeladen“ bzw. „Abgeladen“. Sie werden vom Fahrer ausgelöst, nicht automatisch erkannt. Ohne diese Schritte gibt es keine Standzeit.

> **Prüfhinweis (Technik):** Bestätigen, dass (a) die Fahrsperre die Position nur lokal auswertet und nicht speichert oder überträgt, (b) der Statusschritt ohne Standort funktioniert, (c) beim Verkleinern der Fotos Metadaten (EXIF, insbesondere GPS-Koordinaten) entfernt werden. Andernfalls sind AVV, TOM und Datenschutzhinweise anzupassen. Stand 17.10.2026: (a) bis (c) treffen nach dem Code zu (`web/js/views/driver.js`, `web/js/media.js`); PDF-Dateien werden nicht verändert und können eigene Metadaten enthalten.

### 2.9 Abliefernachweis, Dokumente, Unterschrift

(1) Der Abliefernachweis fasst Buchungsdaten, Fahrer und Kennzeichen, die Zeitstempel der Schritte mit der jeweils meldenden Person, Lieferschein-Fotos und – falls erfasst – Name des Empfängers, Standzeit, Palettentausch und Unterschrift zusammen. Die Plattform erzeugt ihn bei Bedarf als Druckansicht; als PDF speichert ihn der Nutzer über die Druckfunktion des Browsers. Er wird nicht als Datei gespeichert.

(2) Die Unterschrift auf dem Display ist eine einfache elektronische Signatur. Sie ersetzt keine gesetzlich vorgeschriebene Schriftform. Die Plattform erstellt keinen elektronischen Frachtbrief nach § 408 Abs. 3 HGB oder nach dem eCMR-Zusatzprotokoll. Ein CMR-Frachtbrief auf Papier kann als Dokumentart fotografiert werden.

(3) Nach Ablauf der Rückgängig-Frist von 2 Minuten können Fahrer Schritte nicht mehr ändern. Auch Disponenten können Schritte weder zurücknehmen noch ändern; sie können nur den nächsten Schritt für den Fahrer setzen, was im Verlauf als Eintrag des Büros erscheint. Änderungen an Lieferdaten stehen im Verlauf mit Person, Zeitpunkt und den Namen der geänderten Felder; die früheren Werte speichert die Plattform nicht. Abgeschlossene und stornierte Lieferungen lassen sich nur noch bei Auftraggeber, Referenz und interner Notiz ändern.

(4) Am Unterschriftenfeld zeigt die App einen festen Kurzhinweis: „Die Unterschrift wird nur als Empfangsnachweis für diese Lieferung gespeichert und an [Firma des Kunden] übermittelt.“ Einen eigenen Text kann der Kunde dort nicht hinterlegen; die ausführliche Information für Empfänger (Vorlage im Anhang der Datenschutzhinweise für Fahrer) stellt der Kunde auf anderem Weg bereit.

(5) Die Plattform ist kein revisionssicheres Archiv im Sinne der GoBD.

> **Prüfhinweis (Technik):** Ziffer (3) letzter Halbsatz und Ziffer (4) als Anforderungen mit der Umsetzung abgleichen. Stand 17.10.2026: Frühere Werte geänderter Felder und ein vom Kunden einstellbarer Hinweistext sind nicht umgesetzt; der Text oben beschreibt den tatsächlichen Stand. Empfehlung: Prüfsumme (SHA-256) je Datei im Abliefernachweis ausweisen.

### 2.10 Berichte und Export

1. Berichte je Monat (Ziffer 2.3 Nr. 7) mit CSV-Download des ganzen Berichts, in allen Tarifen gleich;
2. vollständiger Datenexport nach § 17 AGB in allen Tarifen, nur für Admins, in jedem Lizenzstatus:
   - „Alles als ZIP (mit Lieferscheinen)“: `daten.json` (Firma und Einstellungen, Nutzer ohne Passwort- und PIN-Hashes, Fahrzeuge, Lieferungen mit Verlauf, Notizen und Dokumentenliste, Dateiliste, Protokoll), `lieferungen.csv`, Ordner `dateien/` mit jedem gespeicherten Foto, Lieferschein, jeder Unterschrift und dem Logo (Zuordnung in `daten.json` unter `files[].path`) und `LIESMICH.txt`; der Server erzeugt das Archiv beim Herunterladen, ohne es zwischenzuspeichern;
   - „Alles als JSON“: derselbe Datenbestand ohne Dateien;
   - „Lieferungen als CSV“ (auch für Disponenten): eine Zeile je Lieferung mit Buchungsnummer, Status, Auftraggeber, Referenz, Orten, Daten, Fahrer, Kennzeichen, Ware, Paletten, Gewicht, Standzeit, Empfänger, Anzahl Lieferscheine und Zustellzeitpunkt; Trennzeichen Semikolon, Zeichensatz UTF-8; höchstens 1.000 Lieferungen je Datei (vollständig nur in `daten.json`);
   - Dokumentation der Formate unter [Website-URL/export-formate].

### 2.11 REST-API (Premium)

Lesender und schreibender Zugriff auf Lieferungen des eigenen Mandanten mit API-Schlüssel: Lieferungen auflisten, abrufen, anlegen und ändern. Fahrzeuge und Dokumente sind über die REST-API nicht erreichbar. Nutzungsgrenze: 600 Anfragen je Minute und Mandant. Webhooks sind Gegenstand der Produktplanung.

### 2.12 Status des Mandanten

| Status | Bedeutung |
|---|---|
| Test | Testphase (30 Tage), voller Funktionsumfang des gewählten Tarifs ohne White-Label-App |
| Aktiv | kostenpflichtiger Vertrag; ist ein Laufzeitende eingetragen, gilt danach automatisch „Abgelaufen“ |
| Abgelaufen | ergibt sich automatisch nach Ende der Testphase oder der eingetragenen Laufzeit; wirkt wie „Gesperrt“ |
| Gesperrt | Admins und Disponenten können sich anmelden und alles lesen, der Admin kann exportieren und Personen löschen; keine neuen Lieferungen, Statusmeldungen, Uploads oder sonstigen Änderungen; Fahrer können sich nicht neu anmelden (bei Zahlungsverzug) |
| Gekündigt | setzt der Anbieter mit dem Vertragsende; nur noch der Admin kann sich anmelden, alles lesen, exportieren und Personen löschen; Disponenten und Fahrer werden bei der Anmeldung abgewiesen; alle Änderungen sind gesperrt; die App zeigt einen Hinweis; danach Abrufzeitraum (30 Tage) und Löschung durch den Anbieter (§ 18 AGB) |

> **Prüfhinweis (Technik):** Bei „Gesperrt“, „Abgelaufen“ und „Gekündigt“ behalten bereits angemeldete Disponenten und Fahrer derzeit Lesezugriff, bis ihre Sitzung abläuft (Fahrer 90 Tage, Büro 14 Tage ab der letzten Nutzung); nur neue Anmeldungen werden abgewiesen. Ein Ende aller Sitzungen bei Statuswechsel ist nicht umgesetzt.

## 3. Tarife

| Leistung | Start | Flotte | Premium |
|---|---|---|---|
| Grundpreis je Monat (netto) | 49 € | 129 € | 299 € |
| Fahrer inklusive / weitere Fahrer | 3 / nicht buchbar | 15 / 7 € | 40 / 6 € |
| Fahrzeuge (LKW und Auflieger) | 6 | 40 | unbegrenzt |
| Disponenten-Zugänge | 1 | 5 | unbegrenzt |
| Lieferschein-Speicher | 5 GB | 50 GB | 250 GB |
| Berichte, CSV-Export | ja | ja | ja |
| Subdomain / eigene Domain | – | Subdomain | eigene Domain |
| REST-API | – | – | ja |
| Support | Standard | Standard | Priorität |
| Verfügbarkeit im Monatsmittel | 99,0 % | 99,0 % | 99,5 % |
| White-Label-App | – | – | 1.990 € einmalig + 99 €/Monat |

Jährliche Zahlweise: zwölf Monate zum zehnfachen Monatspreis, einschließlich gebuchter Zusatzfahrer und White-Label-App. Zusätzliche Fahrerplätze gibt es nur in Flotte und Premium, die White-Label-App nur in Premium. Alle Preise zuzüglich Umsatzsteuer.

## 4. Speicherkontingente

(1) Das Speicherkontingent umfasst alle Dateien des Mandanten (Fotos, PDF-Dokumente, Unterschriften, Logo). Datenbankeinträge zählen nicht dazu.

(2) Bei 80 % und bei 100 % Belegung informiert die Plattform den Admin. Damit laufende Zustellungen nicht scheitern, nimmt die Plattform Uploads bis zu einer Belegung von 110 % weiter an. Danach sind neue Uploads erst nach einem Tarifwechsel, der Buchung von Zusatzspeicher oder dem Löschen bzw. Exportieren älterer Dokumente möglich.

(3) Der Anbieter löscht keine Daten wegen Überschreitung des Kontingents.

> **Prüfhinweis (Technik):** Abs. 2 ist als Anforderung formuliert. Stand 17.10.2026 misst die Plattform den belegten Speicher nicht, informiert nicht bei 80 % oder 100 % und begrenzt Uploads nicht; es gelten nur die Grenzen je Datei (10 MB je Bild, 15 MB je PDF).

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

(1) Der Admin legt unter „Einstellungen → Abläufe“ fest, wie lange abgeschlossene Lieferungen aufbewahrt werden („Lieferscheine aufbewahren (Jahre)“). Alle anderen Fristen sind fest. Nach Ablauf löscht die Plattform die Daten automatisch bei ihrer stündlichen Wartung.

| Datenart | Frist | einstellbar |
|---|---|---|
| Zugestellte und stornierte Lieferungen mit Verlauf, Notizen, Dokumenten, Fotos und Unterschriften | Voreinstellung 3 Jahre, gerechnet ab der letzten Änderung der Lieferung (in der Regel Zustellung oder Storno; jede spätere Änderung, z. B. „Nachbearbeiten“, eine Notiz oder ein weiteres Dokument, lässt die Frist neu beginnen); gelöscht wird die ganze Lieferung | 1 bis 10 Jahre |
| Standortangaben in Statusmeldungen und Problemmeldungen | 90 Tage nach der Meldung | – |
| In-App-Benachrichtigungen | 90 Tage; je Nutzer bleiben höchstens die 100 neuesten | – |
| Zugänge (Stammdaten) | bis der Admin die Person löscht (Anonymisierung, AVV Anlage 1 Ziffer 1.5); gesperrte Zugänge löscht die Plattform nicht von selbst | – |
| Audit-Log des Mandanten | 3 Jahre; IP-Adressen und bei Fehlversuchen eingegebene Kennungen 90 Tage | – |
| Sitzungen | 90 Tage (Fahrer) bzw. 14 Tage (Büro) ab der letzten Nutzung | – |

(2) Eine Ausnahme einzelner Lieferungen von der automatischen Löschung (z. B. wegen eines Streitfalls) gibt es nicht. Wer Unterlagen länger braucht, exportiert sie vor Ablauf der Frist („Alles als ZIP“) oder verlängert die Frist für alle Lieferungen. Eine kürzere Frist wirkt sofort: Die nächste stündliche Wartung löscht alle Lieferungen, die danach zu alt sind.

(3) Die Wahl der Löschfrist ist eine Weisung des Kunden. Er berücksichtigt dabei eigene Aufbewahrungspflichten (z. B. acht Jahre für Buchungsbelege nach § 147 Abs. 3 AO und § 257 Abs. 4 HGB) und Verjährungsfristen (z. B. § 439 HGB). Die gesetzlichen Aufbewahrungsfristen beginnen mit dem Schluss des Kalenderjahres, die Frist der Plattform dagegen mit der letzten Änderung der Lieferung. Wer eine Frist von acht Jahren einhalten muss, stellt deshalb mindestens neun Jahre ein oder archiviert die Unterlagen vorher in eigenen Systemen.

> **Prüfhinweis (Technik):** PLAN.md sieht eine Löschfrist je Mandant in Jahren vor (`retentionYears`). Getrennte Fristen für Standortangaben, Benachrichtigungen, Stammdaten deaktivierter Fahrer und Protokolle sowie die Ausnahme wegen Streitfall sind als Anforderungen formuliert und umzusetzen bzw. anzupassen. Stand 17.10.2026: Standortangaben (90 Tage), Benachrichtigungen (90 Tage) und Protokoll (3 Jahre, IP 90 Tage) sind mit festen Fristen umgesetzt (`core/engine.js`, `purgeExpired`); eine automatische Löschung gesperrter Zugänge und die Ausnahme wegen Streitfall fehlen; die Tabelle oben beschreibt den tatsächlichen Stand.

> **Prüfhinweis:** Offen ist, ob die in der Plattform gespeicherten Fotos von Lieferscheinen und die Abliefernachweise beim Kunden Buchungsbelege (acht Jahre), Handels- oder Geschäftsbriefe (sechs Jahre) oder keine aufbewahrungspflichtigen Unterlagen sind (vgl. die Sonderregel für Lieferscheine in § 147 Abs. 3 AO und den Prüfhinweis in CHECKLISTE_GRUENDUNG.md Ziffer 4), und ob ein in der Plattform verkleinertes Foto (JPEG, höchstens 1.400 Pixel) als bildliche Wiedergabe nach § 147 Abs. 2 AO und den GoBD genügt. Das hängt vom Einzelfall des Kunden ab; die Voreinstellung von drei Jahren orientiert sich an der frachtrechtlichen Verjährung, nicht an steuerlichen Pflichten.

## 7. Nicht geschuldete Leistungen

Siehe § 5 Abs. 5 AGB, insbesondere Rechts- und Steuerberatung, GoBD-Archivierung, Beweiskraft und Formwirksamkeit von Dokumenten, eCMR, Dauerortung, Arbeitszeiterfassung und Leistungen Dritter.

## 8. Informationen zum Anbieterwechsel (Art. 26 und 28 Data Act)

1. Wechselverfahren, Fristen und Unterstützung: § 17 AGB.
2. Methoden und Formate: Self-Service-Export durch den Admin (ZIP mit `daten.json`, `lieferungen.csv` und allen gespeicherten Dateien; JSON; CSV), auch nach der Kündigung; REST-API für Lieferungen (Premium); Formatdokumentation unter [Website-URL/export-formate].
3. Bekannte Einschränkungen: Zugangsdaten (Passwörter, PINs) und Push-Abonnements können nicht übertragen werden und sind beim Zielanbieter neu einzurichten; die White-Label-App ist an die Plattform gebunden; `lieferungen.csv` enthält höchstens 1.000 Lieferungen (vollständig in `daten.json`); Berichte und Abliefernachweise sind nicht als Dateien im Export enthalten, weil die Plattform sie bei Bedarf aus den exportierten Daten berechnet; In-App-Mitteilungen werden nicht exportiert.
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
