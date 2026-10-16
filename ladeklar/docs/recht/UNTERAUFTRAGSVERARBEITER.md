# Liste der Unterauftragsverarbeiter

> **Hinweis – Muster, keine Rechtsberatung.**
> Dieses Dokument ist ein Mustertext für LADEKLAR. Es ersetzt keine Rechtsberatung und ist vor Verwendung anwaltlich prüfen zu lassen. Platzhalter in [eckigen Klammern] ausfüllen. Mit „Prüfhinweis“ gekennzeichnete Anmerkungen sind vor Veröffentlichung zu entfernen. Recherchestand: 16.10.2026.

Anlage 3 zum Auftragsverarbeitungsvertrag von [Firma] [Rechtsform] („Anbieter“)

Stand: [Datum] · Version [1.0] · veröffentlicht unter [Website-URL/unterauftragsverarbeiter]

---

## 1. Unterauftragsverarbeiter

| Nr. | Unterauftragsverarbeiter (Name, Anschrift) | Leistung | Verarbeitete Daten | Ort der Verarbeitung | Garantie bei Drittland | Weitere Unterauftragsverarbeiter (Kette) | seit |
|---|---|---|---|---|---|---|---|
| 1 | [Hosting-Anbieter], [Anschrift] | Rechenzentrum, Server, Speicher, Netz | alle Kundendaten (Anlage 1 AVV) | [Ort], Deutschland; Rechenzentrum zertifiziert nach ISO/IEC 27001 | nicht erforderlich | [keine / Angabe] | [Datum] |
| 2 | [Backup-Anbieter], [Anschrift] | Speicherung verschlüsselter Datensicherungen | alle Kundendaten, vor Übertragung verschlüsselt; kein Zugriff auf Schlüssel | [Ort], Deutschland | nicht erforderlich | [keine / Angabe] | [Datum] |
| 3 | [E-Mail-Versanddienst], [Anschrift] | Versand von System-E-Mails (Einladung von Admins und Disponenten, Passwort zurücksetzen, Benachrichtigungen zum Konto) | Name, E-Mail-Adresse, Inhalt der System-E-Mail, Zustellprotokolle | [Ort], [EU/Deutschland] | [nicht erforderlich / Angabe] | [Angabe] | [Datum] |

## 2. Push-Dienste (Sonderstellung)

Push-Benachrichtigungen werden über den Push-Dienst zugestellt, den der Browser bzw. das Betriebssystem des jeweiligen Geräts vorgibt. Der Anbieter wählt den Dienst nicht aus. Bei Web-Push ist die Nutzlast Ende-zu-Ende verschlüsselt (RFC 8291); der Push-Dienst kann den Inhalt nicht lesen. Er verarbeitet die Endpunkt-Adresse des Abonnements, Zeitpunkt, Größe und Dringlichkeit der Nachricht sowie die IP-Adresse des Servers und des Geräts.

| Nr. | Dienst | Betroffene Geräte/Browser | Anbieter | Ort | Garantie bei Drittland |
|---|---|---|---|---|---|
| P1 | Firebase Cloud Messaging (FCM) | Chrome, Opera, Samsung Internet und andere Chromium-Browser unter Android und Desktop; White-Label-App unter Android | Google [Ireland Limited / LLC, USA] | EU/USA | EU-US Data Privacy Framework [Zertifizierung prüfen]; Standardvertragsklauseln |
| P2 | Apple Push Notification service (APNs) bzw. Web Push von Apple | Safari unter macOS, iOS/iPadOS ab 16.4 (installierte Web-App); White-Label-App unter iOS | Apple [Distribution International Ltd. / Inc., USA] | EU/USA | EU-US Data Privacy Framework [Zertifizierung prüfen]; Standardvertragsklauseln |
| P3 | Mozilla Push Service (Autopush) | Firefox | Mozilla Corporation, USA | USA | [Zertifizierung prüfen]; Standardvertragsklauseln |
| P4 | Windows Push Notification Services (WNS) | Microsoft Edge unter Windows | Microsoft [Ireland Operations Ltd. / Corporation, USA] | EU/USA | EU-US Data Privacy Framework [Zertifizierung prüfen]; Standardvertragsklauseln |

> **Prüfhinweis:** Ob Push-Dienste Unterauftragsverarbeiter (Art. 28 Abs. 2 DSGVO) oder eigenständige Übermittlungsdienste sind, ist nicht abschließend geklärt. Für Web-Push spricht vieles für eine bloße Transportfunktion (verschlüsselte Nutzlast, Dienst vom Browser vorgegeben, kein Vertrag des Anbieters mit Mozilla oder Microsoft). Bei der White-Label-App schließt der Anbieter bzw. Kunde dagegen Verträge mit Google (Firebase) und Apple; dort ist eine Einordnung als Unterauftragsverarbeiter naheliegend. Die Liste führt die Dienste vorsorglich transparent auf. Vor Veröffentlichung: (a) tatsächlich vorkommende Endpunkt-Hosts aus den gespeicherten Abonnements auswerten (z. B. `fcm.googleapis.com`, `web.push.apple.com`, `updates.push.services.mozilla.com`, `*.notify.windows.com`), (b) DPF-Zertifizierung je Unternehmen in der offiziellen Liste prüfen (dataprivacyframework.gov), (c) Vertragspartner und Auftragsverarbeitungsbedingungen von Firebase und Apple dokumentieren. Zum DPF: Klage abgewiesen durch das EuG am 03.09.2025 (T-553/23), Rechtsmittel C-703/25 P beim EuGH anhängig.

## 3. Keine Unterauftragsverarbeiter

Nicht als Unterauftragsverarbeiter gelten insbesondere:

1. Telekommunikations- und Internetzugangsanbieter;
2. die App-Stores von Apple und Google beim Vertrieb der White-Label-App (eigene Verantwortlichkeit gegenüber den Nutzern der Stores);
3. Navigationsdienste (Google Maps, Apple Karten), die die Fahrer-App lediglich mit der Zieladresse öffnet; die Plattform bindet keine Karten ein;
4. Messenger-Dienste, über die der Kunde Einladungslinks selbst weiterleitet;
5. Dienstleister des Anbieters ohne Zugriff auf Kundendaten (z. B. Buchhaltung, Steuerberatung, Erreichbarkeitsüberwachung ohne personenbezogene Daten).

## 4. Änderungen

(1) Der Anbieter informiert den Kunden mindestens [30] Tage vor der Hinzuziehung oder dem Austausch eines Unterauftragsverarbeiters per E-Mail an den Admin und über einen Hinweis in der Plattform. Die Mitteilung nennt Name, Anschrift, Leistung, Ort der Verarbeitung und gegebenenfalls die Garantie für die Drittlandübermittlung.

(2) Der Kunde kann innerhalb dieser Frist aus wichtigem datenschutzrechtlichem Grund in Textform an [Datenschutzkontakt] widersprechen. Die Folgen eines Widerspruchs regelt § 5 Abs. 2 AVV.

(3) Kunden können Änderungsmitteilungen zusätzlich unter [Website-URL/unterauftragsverarbeiter] abonnieren.

## 5. Änderungsverlauf

| Datum | Änderung |
|---|---|
| [Datum] | Erstfassung |
