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

(1) Der Anbieter legt Mandanten an, verwaltet Tarif, zusätzliche Fahrerplätze, Zahlweise, Laufzeitende („Laufzeit bis“), Store-App (nur Premium), eigene Domains (nur Premium), Firmen- und Kontaktdaten und den Status (Test, Aktiv, Gesperrt, Gekündigt; „Abgelaufen“ ergibt sich automatisch nach Ende der Testphase oder der Laufzeit). Er kann das Branding bei der Ersteinrichtung setzen, für einen ausgesperrten Admin ein Einmalpasswort erzeugen (die Zwei-Faktor-Anmeldung des Admins wird dabei ausgeschaltet), einen gekündigten Mandanten endgültig löschen und eine Abrechnungsvorschau je Monat mit dem Grund jeder Zeile ansehen und als CSV abrufen. Kündigungs- und Tarifwünsche der Admins erscheinen als Markierung, Filter „Anfragen“ und Karte auf der Übersicht; einen Tarifwunsch kann der Anbieter direkt übernehmen. Sperren, Kündigen, das Zurücksetzen des Admin-Passworts und das Verkleinern des Tarifs fragt die Konsole vor der Ausführung auf derselben Seite nach; beim Verkleinern zeigt sie, wo die Nutzung über den neuen Grenzen liegt. Je Mandant sieht er ausschließlich Kennzahlen (Anzahl Fahrer im Verhältnis zu den gebuchten Plätzen, Büro-Zugänge, Fahrzeuge, Lieferungen im Monat und insgesamt, letzte Aktivität, belegter Speicher) sowie Lizenz- und Abrechnungsdaten. Es gibt einen Lizenzgeber-Zugang; dessen Passwort ändert der Anbieter in der Konsole. Er kann ihn mit einer Zwei-Faktor-Anmeldung schützen; solange sie aus ist, zeigt die Konsole einen Warnhinweis. Ein vergessenes Passwort setzt nur der Betreiber auf dem Server zurück (`node server/index.js reset-platform-password <E-Mail> <Passwort>`); das schaltet die Zwei-Faktor-Anmeldung aus und beendet alle Sitzungen des Zugangs.

(2) Der Anbieter sieht keine Lieferungen, Lieferscheine, Fotos, Unterschriften, Notizen, Fahrernamen oder Standortangaben. Die Plattform setzt diese Trennung technisch durch. Der Admin des Kunden kann einen Support-Zugriff freigeben; einen Support-Modus, der dem Anbieter Einsicht gibt, hat die Plattform derzeit nicht (AVV Anlage 4).

### 2.2 Unternehmens-Admin

Alle Funktionen im eigenen Mandanten, insbesondere:

1. Einrichtung in vier Schritten: Logo und Farbe, Fahrzeuge, Fahrer, erste Lieferung, jeweils im zugehörigen Bereich der App (einen geführten Assistenten gibt es derzeit nicht);
2. Branding: Logo, Markenfarbe, App-Name; Subdomain (Flotte) bzw. eigene Domain (Premium);
3. Verwaltung von Team (Admins, Disponenten: anlegen, Name, E-Mail, Rolle und Sprache ändern, neues Passwort – schaltet auch die Zwei-Faktor-Anmeldung des Disponenten aus –, sperren, löschen), Fahrern und Fahrzeugen; Löschen von Personen (Anonymisierung, AVV Anlage 1 Ziffer 1.5); die E-Mail-Adresse eines Büro-Zugangs ist plattformweit eindeutig;
4. Einstellungen des Mandanten: Fahrer wählt Fahrzeug selbst, offene Touren für alle Fahrer, Fotopflicht vor Abschluss, Unterschrift, Ankunftserfassung (Standzeit), Palettentausch, Fahrsperre, Standort beim Statuswechsel, Auswertungen je Fahrer, Buchungsnummern-Präfix, Aufbewahrung der Lieferungen in Jahren (Ziffer 6; vor dem Senken zeigt die App, wie viele abgeschlossene Lieferungen dadurch gelöscht werden, und fragt nach);
5. Datenexport jederzeit, auch in den Status „Gesperrt“, „Abgelaufen“ und „Gekündigt“: „Alles als ZIP (mit Lieferscheinen)“, „Alles als JSON“, „Lieferungen als CSV“ (Ziffer 2.10); jeder Export steht im Protokoll;
6. Freigabe für 24 Stunden und vorzeitiges Beenden des Support-Zugriffs;
7. Einsicht in das Protokoll (Audit-Log) des Mandanten: die neuesten Einträge in den Einstellungen, das vollständige Protokoll im Datenexport;
8. Lizenz-Seite: Tarif, Preis mit Positionen (Grundpreis, zusätzliche Fahrer, Store-App), bei jährlicher Zahlweise die Vorauszahlung (zehnfacher Monatspreis), Fahrerplätze, Fahrzeuge und Büro-Zugänge im Verhältnis zu den Grenzen, belegter Speicher, Testende bzw. Laufzeitende und Lizenzstatus; „Tarif wechseln anfragen“ (mit Hinweis, wenn der gewählte Tarif zu klein ist) und „Kündigen“ (mit optionalem Grund und Bestätigung) senden eine Anfrage an den Anbieter, der sie ausführt bzw. bestätigt; eine offene Anfrage zeigt die Seite als Hinweis. Weitere Fahrerplätze, Zahlweise und einen Widerspruch gegen die Referenznennung teilt der Admin dem Anbieter auf anderem Weg mit;
9. REST-API-Schlüssel (Premium): Der Schlüssel erscheint nur einmal bei der Erzeugung; danach zeigt die Plattform nur die letzten 4 Zeichen;
10. Zwei-Faktor-Anmeldung für das eigene Konto unter „Mein Konto“ (wie für Disponenten, Ziffer 2.3).

### 2.3 Disponent

1. Lieferungen anlegen, ändern, zuweisen, stornieren und wiederholen; ohne Zuweisung als „offen für alle Fahrer“ veröffentlichen – sichtbar für alle Fahrer nur, wenn die Einstellung „Fahrer dürfen offene Aufträge übernehmen“ eingeschaltet ist, sonst wartet der Auftrag auf Zuweisung; Pflichtangaben sind Route (Ladeort und Entladeort) und Ladedatum; Ortsvorschläge aus früheren Lieferungen; abgeschlossene und stornierte Lieferungen lassen sich mit „Nachbearbeiten“ nur noch bei Auftraggeber, Referenz und interner Notiz ändern;
2. automatische Buchungsnummer im Format Präfix–Jahr/Monat–laufende Nummer (z. B. `KAY-2610-0042`); die laufende Nummer beginnt jeden Monat bei 0001 und ist je Unternehmen eindeutig;
3. Live-Board mit den Kacheln „Offen“, „Unterwegs“, „Heute zugestellt“, „Störungen“ und allen aktiven Touren;
4. Verlauf jeder Lieferung als Zeitstrahl mit Uhrzeit, Person und – falls eingeschaltet – Standort beim Statuswechsel;
5. Reiter „Live“ (laufende Touren; bestätigte Touren für spätere Tage stehen unter „Geplant“), „Geplant“, „Offen“, „Störungen“, „Erledigt“, „Alle“ und Suche nach Buchungsnummer, Ort, Fahrer, Kennzeichen und Referenz; „Erledigt“, „Alle“ und die Suche zeigen die neuesten Lieferungen zuerst;
6. Abliefernachweis als Druckansicht (über „Drucken / PDF“ als PDF speicherbar) mit Buchungsdaten, Zeitstempeln (Datum mit Jahr), Fahrer und Kennzeichen, Lieferschein-Fotos und Unterschrift sowie – falls gespeichert – dem Standort je Schritt;
7. Berichte je Monat (wählbar die letzten 24 Monate, nach deutscher Zeit): Zugestellt, Pünktlichkeit, mittlere Standzeit, Palettensaldo, Tabellen je Auftraggeber und je Lade- und Entladestelle (längste mittlere Standzeit zuerst) sowie – wenn „Auswertungen je Fahrer“ eingeschaltet ist – je Fahrer; der ganze Bericht als CSV; Zugestellt und Pünktlichkeit richten sich nach dem Zeitpunkt der Zustellung;
8. Fahrer und Fahrzeuge anlegen, ändern, Fahrer sperren, PIN zurücksetzen (mit neuem Einladungslink, Ziffer 2.4), Fahrzeuge löschen, belegte Fahrzeuge freigeben; den nächsten Schritt für einen Fahrer setzen, wenn er ihn telefonisch meldet (nicht das Bestätigen, kein Zurücknehmen); bekommt eine bestätigte, noch nicht beladene Tour einen anderen Fahrer, geht sie auf „Offen“ zurück, der neue Fahrer bestätigt sie selbst, das Fahrzeug des vorigen Fahrers wird entfernt und dessen Ankunftszeiten zählen nicht zur Standzeit; nach dem Beladen ist kein Fahrerwechsel möglich;
9. Fristen je Fahrzeug (HU/SP) mit Warnung 30 Tage vorher;
10. Lieferliste als CSV herunterladen (alle Lieferungen);
11. Zwei-Faktor-Anmeldung (TOTP) für das eigene Konto unter „Mein Konto“ einschalten (QR-Code oder Schlüssel für die Authenticator-App, dann den 6-stelligen Code eingeben) und mit dem Passwort ausschalten; Push-Mitteilungen in diesem Browser ein- und ausschalten;
12. Plausibilitätsprüfung der Eingaben: Gewicht bzw. Nutzlast 0 bis 60.000 kg, Paletten 0 bis 66, Zeitfenster „bis“ nicht vor „von“, Entladung nicht vor der Ladung.

Disponenten haben keinen Zugriff auf Branding, Einstellungen, Abonnement, Büro-Zugänge, Protokoll, den vollständigen Datenexport (ZIP, JSON) und das Löschen von Personen.

### 2.4 Fahrer

1. Anmeldung mit Firmencode, Handynummer (auch in Schreibweisen wie +49 (0)176 oder 0049 176) bzw. Personalnummer und sechsstelliger PIN oder über einen Einladungslink mit PIN; der Link gilt 14 Tage und für eine Anmeldung, ein benutzter oder abgelaufener Link zeigt einen Hinweis und die normale Anmeldung; die Sitzung bleibt 90 Tage ab der letzten Nutzung angemeldet und endet sofort mit einem neuen PIN, einer Sperre des Zugangs oder einer Sperre des Mandanten;
2. Wahl des Fahrzeugs und optional des Aufliegers aus dem Pool; ein gewähltes Fahrzeug ist für andere Fahrer belegt;
3. Anzeige der eigenen Lieferungen und – wenn „Fahrer dürfen offene Aufträge übernehmen“ eingeschaltet ist – der offenen, für alle freigegebenen Aufträge; keine Einsicht in Lieferungen anderer Fahrer;
4. Schrittfolge mit genau einer großen Schaltfläche für den nächsten Schritt: Buchung bestätigen – optional „Angekommen Ladestelle“ – Aufgeladen – optional „Angekommen Entladestelle“ – Abgeladen (optional Palettentausch) – Lieferschein fotografieren (ein oder mehrere Fotos oder PDF) – optional Empfänger und Unterschrift – Bestätigen und abschließen; ist die Unterschrift Pflicht, bleibt der Abschluss gesperrt, bis der Empfänger unterschrieben hat, auch ohne Netz; ein doppeltes Tippen löst den Schritt nur einmal aus;
5. jederzeit: Notiz (Freitext und Schnellbausteine), Problem melden (Stau/Verspätung, Panne, Unfall, Ware beschädigt, Annahme verweigert, Adresse falsch, Lange Wartezeit, Sonstiges – optional mit Foto), Navigation (öffnet auf iPhone und iPad Apple Karten, sonst Google Maps), Anruf bei Disposition oder Ansprechpartner;
6. **Rückgängig:** Der Fahrer kann seinen eigenen letzten Schritt innerhalb von 2 Minuten zurücknehmen; die 2 Minuten zählen vom Tippen des Schritts bis zum Tippen auf „Rückgängig“. Rückgängig geht nur mit Netz; für Schritte, die ohne Netz getippt wurden, bietet die App „Rückgängig“ nicht an. Die Rücknahme wird im Verlauf protokolliert;
7. **Zurückgeben:** Eine bestätigte, noch nicht beladene Tour kann mit Angabe eines Grundes zurückgegeben werden;
8. eigener Verlauf mit dem Zeitpunkt der Zustellung; unter „Mehr“ ein Schalter für Push-Mitteilungen auf diesem Handy; ist der Zugang der Firma gesperrt, nur der Hinweis „Zugang gesperrt – bitte die Disposition anrufen.“; ein entzogener Auftrag schließt sich mit einem Hinweis; automatischer Dunkelmodus; die Schaltfläche für den nächsten Schritt ist mindestens 88 px hoch, die übrigen Schaltflächen meist mindestens 54 px.

### 2.5 Benachrichtigungen

(1) Die Disposition erhält bei jedem Schritt eine Benachrichtigung (Bestätigt, Aufgeladen, Abgeladen, Zugestellt mit bzw. ohne Lieferschein, Problem mit hoher Priorität, Notiz, Zurückgegeben) als In-App-Mitteilung mit Ton und – soweit freigegeben – als Push-Benachrichtigung. Fahrer erhalten neue, geänderte und stornierte Aufträge (mit Stornogrund); „Auftrag geändert“ nur bei einer echten Änderung von Adressen, Zeiten, Ware, Hinweisen, Fahrzeug oder Dringlichkeit. Admins erhalten außerdem Hinweise bei 80 % und 100 % Speicherbelegung, Admins und Disponenten bei der ersten 24-Stunden-Sperre eines Zugangs. Push-Mitteilungen lassen sich je Gerät in der App ein- und ausschalten; nach einer Passwortänderung richtet die App sie ohne Nachfrage neu ein.

(2) Push-Benachrichtigungen werden nach dem Web-Push-Standard mit VAPID versendet. Die Nachrichteninhalte werden Ende-zu-Ende verschlüsselt (RFC 8291) und über den Push-Dienst übermittelt, den der jeweilige Browser bzw. das Betriebssystem vorgibt (z. B. Google, Apple, Mozilla, Microsoft). Push-Nachrichten enthalten Titel und Text der Mitteilung in der Sprache des Empfängers: Buchungsnummer, Route mit Lade- und Entladeort, Ladedatum, Status, den Namen des Fahrers bzw. des Absenders einer Notiz, bei Notizen und Problemen den Anfang des Textes (bis zu 120 bzw. 80 Zeichen) und bei Rückgaben und Stornierungen den angegebenen Grund. Fotos und Dokumente werden nicht per Push übertragen, sondern nach Anmeldung in der App angezeigt. Der Push-Dienst hält eine Nachricht höchstens 24 Stunden vor.

> **Prüfhinweis (Technik):** Inhalt der Push-Nachrichten festlegen und dokumentieren (insbesondere, ob Fahrernamen enthalten sind). Stand 17.10.2026: Fahrernamen und Textauszüge sind enthalten (`core/texts.js`, `NOTIFY_TEXT`). Die Hinweise zu Speicher, Sperre und Kundenanfragen gibt es bisher nur auf Deutsch (`ACCOUNT_TEXT` in `core/engine.js`). Die Plattform nimmt nur Abonnements der Push-Dienste von Google, Apple, Mozilla und Microsoft an (`pushEndpointOk` in `server/index.js`). Bei der White-Label-App laufen Benachrichtigungen über Firebase Cloud Messaging bzw. Apple Push Notification service; dort ist die Nutzlast nicht automatisch Ende-zu-Ende verschlüsselt. Empfehlung: nur Kennungen übertragen, Inhalte nach Abruf laden.

### 2.6 Offline-Funktion

(1) Bei fehlender Verbindung speichert die Fahrer-App Bestätigen, Statusschritte, Notizen, Problemmeldungen, Lieferschein-Fotos, Problemfotos und die Unterschrift in einer Warteschlange im Gerät (IndexedDB) und sendet sie streng in der Reihenfolge der Erfassung, sobald wieder eine Verbindung besteht. Neue Schritte überholen ältere nie. Der Abschluss einer Lieferung funktioniert vollständig ohne Netz; die Abschlussanzeige entsteht aus den Daten im Gerät. Fotos werden im Gerät auf höchstens 1.400 Pixel Kantenlänge verkleinert.

(2) Die App startet auch ohne Netz, z. B. nach einem Neustart des Handys im Funkloch: Sie zeigt die zuletzt geladenen Touren mit allen Angaben, den Verlauf, die Mitteilungen und das Firmenlogo und legt die noch nicht gesendeten Schritte und Fotos darüber. Ist wieder Netz da, verbindet sie sich von selbst und lädt neu.

(3) Jeder Eintrag trägt den Zeitpunkt des Tippens und eine Kennung gegen doppeltes Senden; beide bleiben bei jedem neuen Versuch gleich. Der Server speichert als Zeitpunkt des Schritts die Gerätezeit des Tippens, wenn sie höchstens 2 Minuten in der Zukunft und höchstens 72 Stunden zurück liegt und nicht vor dem vorigen Schritt der Lieferung; sonst den Eingang. Weicht der Eingang ab, speichert er ihn zusätzlich. Verlauf, Standzeiten, Berichte und Abliefernachweis zeigen die Zeit des Tippens. Kommt eine Antwort des Servers nicht an und sendet die App den Eintrag erneut, speichert der Server ihn nicht doppelt.

(4) Bei Netzfehlern, Zeitüberschreitung, Serverfehlern, Anfragebegrenzung oder einer Zwischenseite (z. B. WLAN-Anmeldung) bleibt der Eintrag erhalten. Lehnt der Server einen Eintrag endgültig ab (z. B. weil die Tour inzwischen storniert ist), nimmt die App ihn aus der Warteschlange und zeigt ihn mit Grund in der Karte „Nicht gesendet“, bis der Fahrer „Verstanden“ tippt. Endet die Sitzung (z. B. neuer PIN), bleiben die Einträge im Gerät; die App bittet um eine neue Anmeldung und sendet sie danach. Ein anderer Fahrer, der sich auf demselben Gerät anmeldet, sieht und sendet sie nicht.

(5) Noch nicht gesendete Einträge gehen verloren, wenn der Fahrer die Browserdaten löscht oder die App deinstalliert, bevor die Warteschlange gesendet ist. Solange Einträge warten, zeigt die App deren Zahl an und sperrt „Abmelden“. Abmelden löscht die Kopie der Touren auf dem Gerät; ohne Netz wirkt es sofort, der Server erfährt es beim nächsten Kontakt.

> **Prüfhinweis (Technik):** Stand 17.10.2026 umgesetzt (`web/js/api-http.js`, `web/sw.js`, `tapTime` in `core/engine.js`). Die Gerätezeit hängt von der Uhr des Handys ab; die Plausibilitätsprüfung fängt nur grobe Abweichungen ab. Eine Kennzeichnung „offline erfasst“ im Verlauf und im Abliefernachweis gibt es nicht; die Eingangszeit ist gespeichert (Feld `rx`), wird aber nicht angezeigt. Lehnt der Server einen Upload wegen vollen Speichers ab, erscheint er ebenfalls unter „Nicht gesendet“ (Ziffer 4).

### 2.7 Sprachen

Die Plattform ist in acht Sprachen verfügbar: Deutsch, Englisch, Polnisch, Rumänisch, Tschechisch, Türkisch, Russisch und Ukrainisch. Das gilt für die Fahrer-App und für Disposition, Administration und Lizenzgeber-Konsole; jeder Nutzer wählt seine Sprache selbst. Die Fahrer-Oberfläche nutzt zusätzlich Symbole. Mitteilungen zu Lieferungen erscheinen in der Sprache des Empfängers. Meldungen der Plattform (z. B. Fehlermeldungen) sind übersetzt, soweit sie feste Texte sind.

> **Prüfhinweis (Technik):** Vor Veröffentlichung die Vollständigkeit der Übersetzungen prüfen (`node tools/extract-i18n.js`, Abgleich mit `web/js/lang/*.js`). Fehlt ein Text, erscheint er in Büro und Konsole auf Englisch, in der Fahrer-App auf Deutsch. Stand 17.10.2026 lief die Übersetzungsrunde noch: Für Rumänisch, Tschechisch, Russisch und Ukrainisch fehlten Texte der Büro-Oberfläche. Nur auf Deutsch sind bisher die Hinweise zu Speicher, Sperre und Kundenanfragen (Ziffer 2.5) sowie Meldungen, die aus Daten zusammengesetzt werden (z. B. „S-KL 2041 fährt gerade …“).

### 2.8 Standortfunktionen

(1) Die Plattform ortet Fahrer und Fahrzeuge **nicht fortlaufend**. Es gibt keine Dauerortung und keine Bewegungsprofile.

(2) **Standort beim Statuswechsel** (optional, Einstellung des Kunden, Voreinstellung aus): Ist die Funktion eingeschaltet, fragt die App den Fahrer einmal, ob er den Standort teilen möchte („Ja, teilen“ / „Nein, danke“; änderbar unter „Mehr“). Hat er zugestimmt und die Standortfreigabe im Gerät erteilt, wird beim Tippen auf einen Statusschritt und beim Melden eines Problems einmalig der Standort abgefragt (das Gerät darf eine bis zu einer Minute alte Position liefern) und mit dem Ereignis gespeichert. Der Server speichert ihn nur bei eingeschalteter Funktion und erteilter Zustimmung und löscht die Koordinaten nach 90 Tagen. Die Disposition sieht den Standort im Verlauf als Link, der Google Maps öffnet. Ohne Zustimmung oder Freigabe funktioniert der Statusschritt ohne Standort.

(3) **Fahrsperre** (optional, Einstellung des Kunden, Voreinstellung an): Ab einer Geschwindigkeit von etwa 8 km/h überdeckt ein Hinweis die Schaltflächen; etwa 5 Sekunden nach dem Anhalten sind sie wieder frei. Die Geschwindigkeit wird ausschließlich im Gerät ausgewertet; die App speichert und überträgt die Position dafür nicht. Die Fahrsperre ist von Abs. 2 unabhängig und setzt nur die Standortfreigabe im Gerät voraus. Die App bittet den Fahrer einmal mit einer Erklärung um die Freigabe; „Später“ blendet die Frage 7 Tage aus. Die Fahrsperre erkennt nicht, ob bei stehendem Fahrzeug der Motor läuft, und ist in der Online-Demo nicht aktiv.

(4) **Ankunftserfassung** (optional): Die Schritte „Angekommen Ladestelle/Entladestelle“ dienen der Berechnung der Standzeit (Grundlage für Standgeld): von „Angekommen“ bis „Aufgeladen“ bzw. „Abgeladen“. Sie werden vom Fahrer ausgelöst, nicht automatisch erkannt. Ohne diese Schritte gibt es keine Standzeit.

> **Prüfhinweis (Technik):** Bestätigen, dass (a) die Fahrsperre die Position nur lokal auswertet und nicht speichert oder überträgt, (b) der Statusschritt ohne Standort funktioniert, (c) beim Verkleinern der Fotos Metadaten (EXIF, insbesondere GPS-Koordinaten) entfernt werden. Andernfalls sind AVV, TOM und Datenschutzhinweise anzupassen. Stand 17.10.2026: (a) bis (c) treffen nach dem Code zu (`web/js/views/driver.js`, `web/js/media.js`); PDF-Dateien werden nicht verändert und können eigene Metadaten enthalten.

### 2.9 Abliefernachweis, Dokumente, Unterschrift

(1) Der Abliefernachweis fasst Buchungsdaten, Fahrer und Kennzeichen, die Zeitstempel der Schritte (Datum mit Jahr) mit der jeweils meldenden Person, Lieferschein-Fotos und – falls erfasst – Name des Empfängers, Zeitpunkt der Zustellung, Standzeit, Palettentausch, Unterschrift und den Standort je Schritt (solange er gespeichert ist, mit Link auf Google Maps) zusammen. Die Plattform erzeugt ihn bei Bedarf als Druckansicht; als PDF speichert ihn der Nutzer über die Druckfunktion des Browsers. Er wird nicht als Datei gespeichert.

(2) Die Unterschrift auf dem Display ist eine einfache elektronische Signatur. Sie ersetzt keine gesetzlich vorgeschriebene Schriftform. Die Plattform erstellt keinen elektronischen Frachtbrief nach § 408 Abs. 3 HGB oder nach dem eCMR-Zusatzprotokoll. Ein CMR-Frachtbrief auf Papier kann fotografiert werden; im Büro wählt der Nutzer beim Hinzufügen eines Dokuments die Dokumentart (Lieferschein, CMR, Schaden, Ladung, Foto). Ohne Lieferschein erscheint die Zustellung im Verlauf als „Zugestellt – ohne Lieferschein“.

(3) Nach Ablauf der Rückgängig-Frist von 2 Minuten können Fahrer Schritte nicht mehr ändern. Auch Disponenten können Schritte weder zurücknehmen noch ändern; sie können nur den nächsten Schritt für den Fahrer setzen, was im Verlauf als Eintrag des Büros erscheint. Änderungen an Lieferdaten stehen im Verlauf mit Person, Zeitpunkt und den Namen der geänderten Felder; die früheren Werte speichert die Plattform nicht. Abgeschlossene und stornierte Lieferungen lassen sich nur noch bei Auftraggeber, Referenz und interner Notiz ändern.

(4) Am Unterschriftenfeld zeigt die App einen festen Kurzhinweis: „Die Unterschrift wird nur als Empfangsnachweis für diese Lieferung gespeichert und an [Firma des Kunden] übermittelt.“ Einen eigenen Text kann der Kunde dort nicht hinterlegen; die ausführliche Information für Empfänger (Vorlage im Anhang der Datenschutzhinweise für Fahrer) stellt der Kunde auf anderem Weg bereit.

(5) Die Plattform ist kein revisionssicheres Archiv im Sinne der GoBD.

> **Prüfhinweis (Technik):** Ziffer (3) letzter Halbsatz und Ziffer (4) als Anforderungen mit der Umsetzung abgleichen. Stand 17.10.2026: Frühere Werte geänderter Felder und ein vom Kunden einstellbarer Hinweistext sind nicht umgesetzt; der Text oben beschreibt den tatsächlichen Stand. Empfehlung: Prüfsumme (SHA-256) je Datei im Abliefernachweis ausweisen.

### 2.10 Berichte und Export

1. Berichte je Monat (Ziffer 2.3 Nr. 7) mit CSV-Download des ganzen Berichts, in allen Tarifen gleich;
2. vollständiger Datenexport nach § 17 AGB in allen Tarifen, nur für Admins, in jedem Lizenzstatus:
   - „Alles als ZIP (mit Lieferscheinen)“: `daten.json` (Firma und Einstellungen, Nutzer ohne Passwort- und PIN-Hashes, Fahrzeuge, Lieferungen mit Verlauf, Notizen und Dokumentenliste, Dateiliste, Protokoll), `lieferungen.csv`, Ordner `dateien/` mit jedem gespeicherten Foto, Lieferschein, jeder Unterschrift und dem Logo (Zuordnung in `daten.json` unter `files[].path`, fehlende Dateien unter `missingFiles`) und `LIESMICH.txt`; der Server erzeugt das Archiv beim Herunterladen, ohne es zwischenzuspeichern, und liest die Dateien nacheinander; Archive über 4 GB und mit mehr als 65.535 Dateien im Format ZIP64; Dateinamen tragen das deutsche Datum;
   - „Alles als JSON“: derselbe Datenbestand ohne Dateien;
   - „Lieferungen als CSV“ (auch für Disponenten): eine Zeile je Lieferung mit Buchungsnummer, Status, Auftraggeber, Referenz, Orten, Daten, Fahrer, Kennzeichen, Ware, Paletten, Gewicht, Standzeit, Empfänger, Anzahl Lieferscheine und Zustellzeitpunkt; Trennzeichen Semikolon, Zeichensatz UTF-8; alle Lieferungen, neueste zuerst; „Zugestellt am“ ist der Zeitpunkt der Zustellung;
   - in allen CSV-Dateien bekommen Textzellen, die mit `=`, `+`, `-`, `@`, Tabulator oder Wagenrücklauf beginnen, ein vorangestelltes Apostroph, damit Tabellenprogramme sie nicht als Formel ausführen;
   - jeder Export steht mit Zeitpunkt, Person und IP-Adresse im Protokoll;
   - Dokumentation der Formate unter [Website-URL/export-formate].

### 2.11 REST-API (Premium)

Lesender und schreibender Zugriff auf Lieferungen des eigenen Mandanten mit API-Schlüssel: Lieferungen auflisten, abrufen, anlegen und ändern. Die Liste kommt mit den neuesten Lieferungen zuerst und lässt sich mit `offset`, `limit` (Voreinstellung 300, höchstens 1.000) und `updatedSince` abrufen; die Gesamtzahl steht in der Kopfzeile `X-Total-Count`. Der Schlüssel ist nur einmal bei der Erzeugung sichtbar und wird nur als Hash gespeichert. Die API funktioniert nur in der Testphase und bei aktiver Lizenz. Fahrzeuge und Dokumente sind über die REST-API nicht erreichbar. Nutzungsgrenze: 600 Anfragen je Minute und Mandant. Webhooks sind Gegenstand der Produktplanung.

### 2.12 Status des Mandanten

| Status | Bedeutung |
|---|---|
| Test | Testphase (30 Tage), voller Funktionsumfang des gewählten Tarifs ohne White-Label-App |
| Aktiv | kostenpflichtiger Vertrag; ist ein Laufzeitende eingetragen, gilt danach automatisch „Abgelaufen“ |
| Abgelaufen | ergibt sich automatisch nach Ende der Testphase oder der eingetragenen Laufzeit; wirkt wie „Gesperrt“ |
| Gesperrt | Admins und Disponenten können sich anmelden und alles lesen, der Admin kann exportieren, Personen löschen und Kündigungs- oder Tarifwünsche senden; keine neuen Lieferungen, Statusmeldungen, Uploads oder sonstigen Änderungen; REST-API gesperrt; angemeldete Fahrer werden abgemeldet, und Fahrer können sich nicht anmelden (bei Zahlungsverzug) |
| Gekündigt | setzt der Anbieter mit dem Vertragsende; nur noch der Admin kann sich anmelden, alles lesen, exportieren und Personen löschen; angemeldete Disponenten und Fahrer werden abgemeldet und bei der Anmeldung abgewiesen; alle Änderungen sind gesperrt; die App zeigt einen Hinweis; danach Abrufzeitraum (30 Tage) und Löschung durch den Anbieter (§ 18 AGB) |

> **Prüfhinweis (Technik):** Stand 17.10.2026 prüft der Server bei jeder Anfrage und vor jedem Live-Ereignis, ob Zugang und Lizenz noch gelten (`auth.actor` in `core/engine.js`). Eine bestehende Sitzung endet deshalb mit der nächsten Anfrage nach dem Statuswechsel; eine offene Live-Verbindung spätestens nach 25 Sekunden. Eine Sitzung, die während einer kurzen Sperre nicht benutzt wird, gilt nach der Aufhebung wieder.

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

(1) Das Speicherkontingent umfasst alle Dateien des Mandanten (Fotos, PDF-Dokumente, Unterschriften, Logo). Datenbankeinträge zählen nicht dazu. Es beträgt im Tarif Start 5 GB, in Flotte 50 GB und in Premium 250 GB (1 GB = 2³⁰ Byte). Je Datei gelten höchstens 10 MB für Bilder und 15 MB für PDF-Dateien.

(2) Die Plattform zählt den belegten Speicher bei jedem Upload und jeder Löschung mit und rechnet ihn bei der stündlichen Wartung neu nach. Die Lizenz-Seite zeigt dem Admin die Belegung mit Balken; die Lizenzgeber-Konsole zeigt sie je Kunde. Bei 80 % und bei 100 % Belegung erhält der Admin je eine Mitteilung; fällt die Belegung unter 75 %, warnt die Plattform beim nächsten Anstieg erneut. Bei 100 % erscheint auf allen Büro-Seiten ein Hinweis.

(3) Ist das Kontingent erreicht, lehnt die Plattform jeden weiteren Upload ab, mit der Meldung „Der Speicher Ihres Tarifs ist voll. Bitte alte Lieferscheine exportieren und löschen oder den Tarif wechseln.“ Das gilt auch für Lieferschein-Fotos und Unterschriften der Fahrer: Ein solcher Upload erscheint in der Fahrer-App unter „Nicht gesendet“, und ist die Fotopflicht bzw. die Unterschrift eingeschaltet, kann der Fahrer die Lieferung nicht abschließen. Einen Überlaufpuffer gibt es nicht. Neue Uploads sind erst wieder nach einem Tarifwechsel oder nach dem Entfernen älterer Dokumente möglich (Export vorher empfohlen; eine kürzere Aufbewahrungsfrist nach Ziffer 6 wirkt ebenfalls).

(4) Der Anbieter löscht keine Daten wegen Überschreitung des Kontingents.

> **Prüfhinweis (Technik):** Stand 17.10.2026 umgesetzt (`createFile`, `setStorage` in `core/engine.js`). Nicht umgesetzt sind ein Überlaufpuffer für laufende Zustellungen und Zusatzspeicher (AGB § 6 Abs. 2): Das Kontingent ist fest an den Tarif gebunden. Empfehlung an die Technik: Uploads zu bereits laufenden Lieferungen bis zu einem Puffer (z. B. 110 %) weiter annehmen.

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
| Zugestellte und stornierte Lieferungen mit Verlauf, Notizen, Dokumenten, Fotos und Unterschriften | Voreinstellung 3 Jahre, gerechnet ab der Zustellung bzw. Stornierung; spätere Änderungen (z. B. „Nachbearbeiten“, eine Notiz oder ein weiteres Dokument) verschieben die Frist nicht; gelöscht wird die ganze Lieferung samt Dateien auf dem Datenträger | 1 bis 10 Jahre |
| Einzelne Dokumente, die aus einer Lieferung entfernt werden | sofort, auch vom Datenträger | – |
| Hochgeladene Dateien ohne Zuordnung (keine Lieferung, kein Logo, keine Unterschrift) | 24 Stunden | – |
| Standortangaben in Statusmeldungen und Problemmeldungen | 90 Tage nach der Meldung | – |
| In-App-Benachrichtigungen | 90 Tage; je Nutzer bleiben höchstens die 100 neuesten | – |
| Zugänge (Stammdaten) | bis der Admin die Person löscht (Anonymisierung, AVV Anlage 1 Ziffer 1.5); gesperrte Zugänge löscht die Plattform nicht von selbst | – |
| Audit-Log des Mandanten | 3 Jahre; IP-Adressen und bei Fehlversuchen eingegebene Kennungen 90 Tage | – |
| Sitzungen | 90 Tage (Fahrer) bzw. 14 Tage (Büro) ab der letzten Nutzung; vorher mit Abmelden, Passwortänderung (andere Geräte), neuem PIN bzw. Passwort, Sperren oder Löschen des Zugangs | – |
| Kennungen gegen doppeltes Senden mit dem Ergebnis der Aktion | 7 Tage | – |

(2) Eine Ausnahme einzelner Lieferungen von der automatischen Löschung (z. B. wegen eines Streitfalls) gibt es nicht. Wer Unterlagen länger braucht, exportiert sie vor Ablauf der Frist („Alles als ZIP“) oder verlängert die Frist für alle Lieferungen. Ein leeres Feld behält die bisherige Frist; erlaubt sind ganze Jahre von 1 bis 10. Eine kürzere Frist wirkt sofort: Die nächste stündliche Wartung löscht alle Lieferungen, die danach zu alt sind. Vor dem Senken zeigt die App, wie viele abgeschlossene Lieferungen das betrifft, und speichert erst nach einer Bestätigung.

(3) Die Wahl der Löschfrist ist eine Weisung des Kunden. Er berücksichtigt dabei eigene Aufbewahrungspflichten (z. B. acht Jahre für Buchungsbelege nach § 147 Abs. 3 AO und § 257 Abs. 4 HGB) und Verjährungsfristen (z. B. § 439 HGB). Die gesetzlichen Aufbewahrungsfristen beginnen mit dem Schluss des Kalenderjahres, die Frist der Plattform dagegen mit der Zustellung bzw. Stornierung der Lieferung. Wer eine Frist von acht Jahren einhalten muss, stellt deshalb mindestens neun Jahre ein oder archiviert die Unterlagen vorher in eigenen Systemen.

> **Prüfhinweis (Technik):** PLAN.md sieht eine Löschfrist je Mandant in Jahren vor (`retentionYears`). Getrennte Fristen für Standortangaben, Benachrichtigungen, Stammdaten deaktivierter Fahrer und Protokolle sowie die Ausnahme wegen Streitfall sind als Anforderungen formuliert und umzusetzen bzw. anzupassen. Stand 17.10.2026: Standortangaben (90 Tage), Benachrichtigungen (90 Tage) und Protokoll (3 Jahre, IP 90 Tage) sind mit festen Fristen umgesetzt (`core/engine.js`, `purgeExpired`); eine automatische Löschung gesperrter Zugänge und die Ausnahme wegen Streitfall fehlen; die Tabelle oben beschreibt den tatsächlichen Stand.

> **Prüfhinweis:** Offen ist, ob die in der Plattform gespeicherten Fotos von Lieferscheinen und die Abliefernachweise beim Kunden Buchungsbelege (acht Jahre), Handels- oder Geschäftsbriefe (sechs Jahre) oder keine aufbewahrungspflichtigen Unterlagen sind (vgl. die Sonderregel für Lieferscheine in § 147 Abs. 3 AO und den Prüfhinweis in CHECKLISTE_GRUENDUNG.md Ziffer 4), und ob ein in der Plattform verkleinertes Foto (JPEG, höchstens 1.400 Pixel) als bildliche Wiedergabe nach § 147 Abs. 2 AO und den GoBD genügt. Das hängt vom Einzelfall des Kunden ab; die Voreinstellung von drei Jahren orientiert sich an der frachtrechtlichen Verjährung, nicht an steuerlichen Pflichten.

## 7. Nicht geschuldete Leistungen

Siehe § 5 Abs. 5 AGB, insbesondere Rechts- und Steuerberatung, GoBD-Archivierung, Beweiskraft und Formwirksamkeit von Dokumenten, eCMR, Dauerortung, Arbeitszeiterfassung und Leistungen Dritter.

## 8. Informationen zum Anbieterwechsel (Art. 26 und 28 Data Act)

1. Wechselverfahren, Fristen und Unterstützung: § 17 AGB.
2. Methoden und Formate: Self-Service-Export durch den Admin (ZIP mit `daten.json`, `lieferungen.csv` und allen gespeicherten Dateien; JSON; CSV), auch nach der Kündigung; REST-API für Lieferungen (Premium); Formatdokumentation unter [Website-URL/export-formate].
3. Bekannte Einschränkungen: Zugangsdaten (Passwörter, PINs, Schlüssel der Zwei-Faktor-Anmeldung) und Push-Abonnements können nicht übertragen werden und sind beim Zielanbieter neu einzurichten; die White-Label-App ist an die Plattform gebunden; `daten.json` entsteht beim Export im Arbeitsspeicher des Servers, sehr große Datenbestände brauchen dafür entsprechend Zeit; Berichte und Abliefernachweise sind nicht als Dateien im Export enthalten, weil die Plattform sie bei Bedarf aus den exportierten Daten berechnet; In-App-Mitteilungen werden nicht exportiert.
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
