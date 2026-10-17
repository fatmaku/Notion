# Checkliste Gründung und Betrieb – Anbieter von LADEKLAR

> **Hinweis – Muster, keine Rechtsberatung.**
> Diese Checkliste ist eine praktische Arbeitshilfe für den Anbieter (Lizenzgeber). Sie ersetzt keine Rechts- oder Steuerberatung und ist vor Verwendung anwaltlich bzw. steuerlich prüfen zu lassen. Platzhalter in [eckigen Klammern] ausfüllen. Kostenangaben sind Spannen aus öffentlich zugänglichen Quellen (siehe QUELLEN.md) oder ausdrücklich als Schätzung gekennzeichnet; sie ersetzen kein Angebot. Recherchestand: 16.10.2026.

Legende: [ ] offen · [x] erledigt · **Pflicht** = gesetzliche Pflicht · **Empfohlen** = dringend empfohlen

---

## 1. Rechtsform und Haftung

- [ ] **Rechtsform wählen** (Empfohlen: GmbH oder UG (haftungsbeschränkt)).

| Rechtsform | Haftung | Kapital | Gründungskosten (Notar, Handelsregister) | Hinweise |
|---|---|---|---|---|
| Einzelunternehmen | unbeschränkt mit Privatvermögen | keins | nur Gewerbeanmeldung; Eintragung als e. K. optional | für eine SaaS-Plattform mit Haftungsrisiken (Datenverlust, Ausfall bei Kunden) nicht empfohlen |
| UG (haftungsbeschränkt) | Gesellschaftsvermögen | ab 1 €, praktisch eher 1.000–5.000 €; 25 % des Jahresüberschusses in die Rücklage, bis 25.000 € erreicht sind (§ 5a GmbHG) | geringer als GmbH, da Notargebühren vom Geschäftswert abhängen [Schätzung: einige hundert Euro mit Musterprotokoll] | Rechtsformzusatz „UG (haftungsbeschränkt)“ auf allen Geschäftsbriefen und im Impressum |
| GmbH | Gesellschaftsvermögen | 25.000 €, mindestens 12.500 € bei Anmeldung eingezahlt | ca. 700–1.200 € mit Musterprotokoll; 1.500–2.500 € mit individueller Satzung und Beratung | höhere Seriosität gegenüber Speditionen und Banken |

- [ ] Gesellschaftervereinbarung (bei mehreren Gründern: Vesting, Rechte an Code und Marke, Ausscheiden).
- [ ] Geschäftsführervertrag; sozialversicherungsrechtlicher Status des Gesellschafter-Geschäftsführers (Statusfeststellung bei der Deutschen Rentenversicherung prüfen).
- [ ] Rechte am Quellcode und an der Marke in die Gesellschaft einbringen bzw. übertragen (sonst gehören sie dem Gründer persönlich).
- [ ] Geschäftsführerpflichten kennen: Sorgfalt (§ 43 GmbHG), Insolvenzantragspflicht (§ 15a InsO: spätestens drei Wochen nach Zahlungsunfähigkeit, sechs Wochen nach Überschuldung).
- [ ] Geschäftskonto eröffnen.

## 2. Anmeldungen

- [ ] **Pflicht: Notartermin und Handelsregister** (GmbH/UG). Der Notar reicht die Anmeldung elektronisch ein.
- [ ] **Pflicht: Transparenzregister.** GmbH und UG müssen ihre wirtschaftlich Berechtigten (natürliche Personen mit mehr als 25 % der Anteile oder Stimmrechte bzw. Kontrolle) selbst aktiv mitteilen; der Notar übernimmt das nicht. Seit August 2021 Vollregister ohne Mitteilungsfiktion. Jahresgebühr des Registers: 19,80 € (Stand der Quelle). Bußgelder bei Verstoß bis 150.000 €, in qualifizierten Fällen mehr.
- [ ] **Pflicht: Gewerbeanmeldung** beim Gewerbeamt der Gemeinde (Software-as-a-Service ist in der Regel ein Gewerbe). Kosten je nach Gemeinde etwa 15–65 €, für juristische Personen etwa 25–70 €.
- [ ] **Pflicht: Finanzamt.** Fragebogen zur steuerlichen Erfassung über ELSTER innerhalb eines Monats nach Aufnahme der Tätigkeit (§ 138 AO); dabei USt-IdNr. beantragen.
- [ ] **Pflicht: IHK-Mitgliedschaft** entsteht automatisch mit der Gewerbeanmeldung. Beitrag nach Beitragsordnung der jeweiligen IHK (Grundbeitrag und Umlage nach Gewerbeertrag).
- [ ] **Pflicht: Berufsgenossenschaft.** Anmeldung bei der zuständigen Berufsgenossenschaft (für IT-Unternehmen in der Regel die VBG) binnen einer Woche nach Eröffnung (§ 192 SGB VII) – zuständige BG prüfen.
- [ ] Bei Beschäftigten: Betriebsnummer bei der Bundesagentur für Arbeit, Anmeldung bei den Krankenkassen.
- [ ] Rundfunkbeitrag für die Betriebsstätte prüfen.
- [ ] Künstlersozialabgabe prüfen, wenn regelmäßig selbstständige Designer oder Texter beauftragt werden (z. B. für Logo und Website).

## 3. Steuern

- [ ] **Umsatzsteuer-Regime wählen.**
  - Kleinunternehmerregelung (§ 19 UStG) seit 01.01.2025: Vorjahresumsatz höchstens 25.000 €, im laufenden Jahr höchstens 100.000 € (netto). Bei Überschreiten der 100.000 € im laufenden Jahr unterliegt bereits der Umsatz, der die Grenze überschreitet, der Regelbesteuerung.
  - Empfehlung für B2B-SaaS: Regelbesteuerung (Kunden sind vorsteuerabzugsberechtigt; Vorsteuer aus Hosting, Hardware und Beratung kann geltend gemacht werden; Reverse-Charge-Geschäfte mit EU-Kunden sind einfacher abzubilden).
- [ ] **Kunden in anderen EU-Staaten (z. B. Österreich):** Leistungsort beim Kunden (§ 3a Abs. 2 UStG); Rechnung ohne deutsche Umsatzsteuer mit USt-IdNr. beider Parteien und dem Hinweis „Steuerschuldnerschaft des Leistungsempfängers“ (Reverse Charge); Rechnung bis zum 15. des Folgemonats (§ 14a UStG); Zusammenfassende Meldung (§ 18a UStG); USt-IdNr. des Kunden beim Bundeszentralamt für Steuern bestätigen lassen (§ 18e UStG).
- [ ] **Kunden in der Schweiz:** Drittland; Leistungsort Schweiz; mögliche Schweizer Steuerpflicht prüfen (Prüfhinweis für DACH-Ausbau).
- [ ] **E-Rechnung:** Empfang strukturierter E-Rechnungen ist seit 01.01.2025 Pflicht. Ausstellung im B2B-Inland ab 01.01.2027 Pflicht, wenn der Vorjahresumsatz mehr als 800.000 € beträgt, ab 01.01.2028 für alle. Rechnungssoftware mit XRechnung/ZUGFeRD auswählen.
- [ ] Steuerberater beauftragen; Buchhaltungssoftware mit GoBD-konformer Archivierung.
- [ ] Ertragsteuern einplanen (Körperschaftsteuer, Gewerbesteuer), Vorauszahlungen beachten.

## 4. Aufbewahrung und GoBD (eigene Unterlagen des Anbieters)

- [ ] **Pflicht: Aufbewahrungsfristen** (seit 01.01.2025 nach dem Vierten Bürokratieentlastungsgesetz):

| Unterlage | Frist | Norm |
|---|---|---|
| Bücher, Inventare, Jahresabschlüsse, Lageberichte, Eröffnungsbilanz | 10 Jahre | § 147 Abs. 3 AO, § 257 Abs. 4 HGB |
| Buchungsbelege (z. B. Rechnungen, Kontoauszüge) | 8 Jahre | § 147 Abs. 3 AO, § 257 Abs. 4 HGB |
| empfangene und abgesandte Handels- und Geschäftsbriefe | 6 Jahre | § 147 Abs. 3 AO, § 257 Abs. 4 HGB |
| Lieferscheine, die keine Buchungsbelege sind | bis Erhalt bzw. Versand der Rechnung | § 147 Abs. 3 AO (Sonderregel für Lieferscheine) |

Fristbeginn: Ende des Kalenderjahres, in dem die Unterlage entstanden ist. Die Frist läuft nicht ab, solange die Unterlagen für noch nicht verjährte Steuern von Bedeutung sind.

- [ ] **Lieferschein als Buchungsbeleg (für Kunden relevant):** Ein Lieferschein ist Buchungsbeleg, wenn er selbst gebucht wird oder Teil der Rechnung ist, etwa weil die Rechnung auf ihn Bezug nimmt und sich die nach § 14 Abs. 4 UStG erforderlichen Angaben aus ihm ergeben (§ 31 UStDV), oder wenn er Buchungsvermerke trägt. Dann gilt die Frist von acht Jahren. Diese Einordnung trifft der Kunde für seine Unterlagen; LADEKLAR bietet eine einstellbare Aufbewahrung abgeschlossener Lieferungen von 1 bis 10 Jahren (Voreinstellung 3 Jahre). Die Frist der Plattform zählt ab der Zustellung bzw. Stornierung der Lieferung, nicht ab dem Ende des Kalenderjahres; wer acht Jahre einhalten muss, stellt mindestens neun Jahre ein oder archiviert vorher. Eine Ausnahme einzelner Lieferungen von der Löschung gibt es nicht.
- [ ] GoBD (BMF-Schreiben, zweite Änderung vom 14.07.2025 wegen E-Rechnung): Verfahrensdokumentation für die eigene Buchhaltung anlegen; bei E-Rechnungen genügt in der Regel die Aufbewahrung des strukturierten Teils.
- [ ] Klarstellen (AGB § 5 Abs. 5, § 9 Abs. 7): LADEKLAR ist kein GoBD-Archiv.

> **Prüfhinweis:** Ob Lieferscheine handelsrechtlich als Handelsbriefe sechs Jahre aufzubewahren sind (§ 257 HGB enthält keine der Lieferschein-Regel des § 147 Abs. 3 AO entsprechende Ausnahme), ist für die Beratung der Kunden zu klären. Frachtrechtlich sind Abliefernachweise mindestens bis zum Ablauf der Verjährung (§ 439 HGB: ein Jahr, bei Vorsatz oder Leichtfertigkeit drei Jahre; Art. 32 CMR) relevant; daher die Voreinstellung von drei Jahren.

## 5. Marke, Domain, Name

- [ ] **Markenrecherche** zu „LADEKLAR“ (Identität und Ähnlichkeit) in DPMAregister, EUIPO eSearch, TMview; Prüfung von Firmen- und Domainnamen.
- [ ] **Deutsche Marke beim DPMA:** online 290 € inkl. bis zu drei Klassen, jede weitere Klasse 100 €. Für die Klassen 9, 35, 39 und 42: 390 €. Schutzdauer zehn Jahre, Verlängerung 750 € (Stand der Quelle).
- [ ] **Unionsmarke beim EUIPO** (empfohlen bei DACH-Ausbau): 850 € für eine Klasse, 50 € für die zweite, je 150 € ab der dritten. Für vier Klassen: 1.200 €.
- [ ] Klassenauswahl:

| Klasse | Inhalt (Beispiele) | Bedeutung |
|---|---|---|
| 9 | herunterladbare Software, mobile Apps | Kern (App) |
| 42 | Software as a Service, Bereitstellung von Software online, Plattformbetrieb | Kern (SaaS) |
| 39 | Transportwesen; Bereitstellung von Informationen über Transport und Sendungsverfolgung | empfohlen wegen Branchennähe |
| 35 | Organisation und Verwaltung von Geschäftsabläufen; Büroarbeiten | optional |

- [ ] Optional anwaltliche Begleitung der Anmeldung [Schätzung: wenige hundert bis etwa 2.000 € je nach Umfang].
- [ ] **Domains:** ladeklar.de sowie [.com, .eu, .at, .ch] registrieren; Kosten je Domain und Jahr in der Regel gering [Schätzung: 5–30 €]. Inhaber sollte die Gesellschaft sein, nicht der Gründer persönlich.
- [ ] Wort-/Bildmarke für das Logo erst nach finaler Gestaltung.

## 6. Versicherungen

- [ ] **Empfohlen: IT-Haftpflicht / Vermögensschadenhaftpflicht.** Deckt Vermögensschäden bei Kunden durch Fehler (z. B. Ausfall, Datenverlust, fehlerhafte Funktion). Übliche Deckungssummen für IT-Dienstleister 300.000–500.000 €, bei höherem Risiko 1 Mio. € und mehr. Wichtig: ausdrücklich den Betrieb einer SaaS-/Cloud-Plattform mitversichern (einige Versicherer schließen Cloud-Anbieter aus); Deckungssumme mit der Haftungsklausel der AGB (§ 20) abstimmen. Beiträge sind stark einzelfallabhängig; belastbare Durchschnittswerte wurden nicht gefunden – mehrere Angebote einholen.
- [ ] **Empfohlen: Cyberversicherung** (Eigenschäden: Forensik, Wiederherstellung, Betriebsunterbrechung, Krisenkommunikation; Drittschäden). Klassische Betriebshaftpflicht deckt Cyber-Ereignisse oft nicht ab.
- [ ] **Betriebshaftpflicht** (Personen- und Sachschäden); ab 09.12.2026 Software-Produkthaftung nach neuem Produkthaftungsrecht mitversichern lassen.
- [ ] Optional: D&O für die Geschäftsführung, Rechtsschutz (Vertrags- und Arbeitsrecht).

## 7. Hosting, Technik, Verträge mit Dienstleistern

- [ ] **Hosting-Vertrag** mit Rechenzentrum in Deutschland, ISO/IEC 27001-Zertifikat anfordern und ablegen.
- [ ] **AVV mit jedem Unterauftragsverarbeiter** (Hosting, Backup; E-Mail-Versand nur falls eingesetzt – die Plattform versendet derzeit keine E-Mails) abschließen und in UNTERAUFTRAGSVERARBEITER.md eintragen.
- [ ] **Datensicherung einrichten:** `deploy/backup.sh` täglich per Cron starten (Beispiel im Skript: `15 2 * * * /opt/ladeklar/deploy/backup.sh /srv/backups`). Das Skript erzeugt eine konsistente Kopie der Datenbank (`VACUUM INTO`) und packt sie mit allen hochgeladenen Dateien in ein `.tar.gz`; Archive älter als 30 Tage löscht es. Es verschlüsselt nicht und überträgt nichts: Die Archive liegen zunächst auf demselben Server. Deshalb zusätzlich verschlüsseln (z. B. mit `age` oder `restic`) und an ein räumlich getrenntes Ziel in Deutschland übertragen; Schlüssel getrennt verwahren. Ersten Wiederherstellungstest dokumentieren (Archiv entpacken, `backup.db` als `ladeklar.db` und den Ordner `files` in `DATA_DIR` legen, Server starten).
- [ ] Statusseite und Erreichbarkeitsüberwachung einrichten (der Server meldet unter `/api/health` seinen Zustand; der Docker-Healthcheck nutzt das bereits).
- [ ] **Betrieb hinter dem Reverse Proxy:** `BASE_URL` mit `https://` setzen (sonst fehlen `Secure` am Sitzungs-Cookie und HSTS). Das Docker-Image setzt `TRUST_PROXY=1`; in `deploy/.env.example` `TRUST_PROXY_HOPS` auf die Zahl der vorgeschalteten Proxys setzen, die je eine Adresse an `X-Forwarded-For` anhängen (nur Caddy: 1; zusätzlich ein Load Balancer oder CDN: 2). Ist der Wert zu klein, treffen Anmeldesperren und Protokoll-IP den Proxy statt des Geräts; ist er zu groß, kann ein Angreifer seine Adresse fälschen. Ohne Proxy `TRUST_PROXY` nicht setzen.
- [ ] Für jede Subdomain (Tarife Flotte und Premium) und jede eigene Domain (Premium) eine Zeile im `deploy/Caddyfile` ergänzen; die Plattform zeigt die Firmen-Marke unter einer Subdomain nur in Tarifen mit Subdomain bzw. eigener Domain.
- [ ] `security.txt` und Postfach [Sicherheits-E-Mail] für Schwachstellenmeldungen einrichten.
- [ ] TOM.md mit der tatsächlichen Umsetzung abgleichen (alle Zeilen „U“ oder mit Termin „G“).
- [ ] Exportformate dokumentieren und unter [Website-URL/export-formate] veröffentlichen (Data Act Art. 26): Inhalt des ZIP-Archivs (`daten.json`, `lieferungen.csv`, Ordner `dateien/`, `LIESMICH.txt`), Aufbau von `daten.json`, Spalten der CSV-Dateien.
- [ ] Den einzigen Lizenzgeber-Zugang (anlegen mit `node server/index.js setup <E-Mail> <Passwort>`, im Docker-Betrieb über `docker compose exec app …`) mit langem Passwort schützen und in der Konsole unter „Mein Konto“ die **Zwei-Faktor-Anmeldung einschalten**; die Konsole zeigt einen Warnhinweis, solange sie aus ist. Einen zweiten Lizenzgeber-Zugang gibt es nicht. `PLATFORM_EMAIL` und `PLATFORM_PASSWORD` nach dem ersten Start aus der `.env` entfernen.
- [ ] **Notfall „Passwort vergessen oder Handy verloren“:** Auf dem Server `node server/index.js reset-platform-password <E-Mail> <neues Passwort>` ausführen (im Docker-Betrieb `docker compose exec app node server/index.js reset-platform-password …`). Das setzt ein neues Passwort (mindestens 10 Zeichen), schaltet die Zwei-Faktor-Anmeldung aus, hebt eine Sperre auf und beendet alle Sitzungen und Push-Abonnements des Zugangs; der Vorgang steht im Protokoll. Danach sofort anmelden und die Zwei-Faktor-Anmeldung neu einrichten. Den Ablauf im Notfallplan festhalten.
- [ ] Löschung gekündigter Kunden organisieren: Frist (§ 18 AGB) überwachen, Kunden vorher an den Export erinnern, Abrechnungsdaten des Kunden außerhalb der Plattform sichern (die Lizenz-Historie steckt nicht im Export des Kunden und geht mit dem Mandanten verloren), dann in der Konsole löschen (nur im Status „Gekündigt“, Eingabe des Firmencodes). Eine automatische Löschung gibt es nicht. Die Dateien entfernt der Server mit.
- [ ] Informationsseite zum Anbieterwechsel und zum Schutz vor Drittstaatenzugriff veröffentlichen (Data Act Art. 26, 28).

## 8. Datenschutz

- [ ] **Datenschutzbeauftragter:** Pflicht nach § 38 Abs. 1 BDSG, wenn in der Regel mindestens 20 Personen ständig mit der automatisierten Verarbeitung personenbezogener Daten beschäftigt sind, sowie unabhängig von der Größe nach Art. 37 DSGVO (z. B. umfangreiche regelmäßige und systematische Überwachung als Kerntätigkeit). Bund und Länder haben in der Föderalen Modernisierungsagenda vom 04.12.2025 die Aufhebung des § 38 Abs. 1 BDSG bis Ende 2026 angekündigt; ein Gesetz lag am 16.10.2026 nach Recherche nicht vor. Empfehlung: freiwillig einen externen Datenschutzbeauftragten benennen – Speditionen fragen danach.
- [ ] **Verzeichnis von Verarbeitungstätigkeiten** als Verantwortlicher (Art. 30 Abs. 1 DSGVO: Website, Kundenkonto, Abrechnung, Support, Sicherheitsprotokolle) und **als Auftragsverarbeiter** (Art. 30 Abs. 2 DSGVO: je Kunde bzw. als Sammelverzeichnis).
- [ ] Prozess für Datenschutzverletzungen: Erkennen, Bewerten, Kunden binnen [24] Stunden informieren (AVV § 9).
- [ ] Prozess für Betroffenenanfragen (Weiterleitung an Kunden).
- [ ] Prozess für ausgesperrte Kunden-Admins: Einmalpasswort nur auf Anforderung des Kunden erzeugen, auf einem zweiten Weg (z. B. telefonisch) übermitteln, Vorgang dokumentieren (AVV Anlage 4 Abs. 7).
- [ ] Mitarbeiter und Freelancer auf Vertraulichkeit verpflichten, schulen.
- [ ] DPF-Zertifizierung der US-Push-Dienste prüfen und dokumentieren (dataprivacyframework.gov); Stand des Verfahrens C-703/25 P beobachten.
- [ ] Datenschutz-Folgenabschätzung: Pflicht liegt beim Kunden; Anbieter stellt Unterlagen bereit (Systembeschreibung, Datenflüsse, TOM).

## 9. Barrierefreiheit

- [ ] **BFSG-Einordnung:** Das Barrierefreiheitsstärkungsgesetz gilt seit 28.06.2025 für bestimmte Produkte und Dienstleistungen, die sich an Verbraucher richten (u. a. Dienstleistungen im elektronischen Geschäftsverkehr). Ausschließlich im B2B-Verkehr erbrachte Dienstleistungen fallen nicht darunter. LADEKLAR richtet sich nur an Unternehmer; Fahrer nutzen die App als Beschäftigte, nicht als Verbraucher. Ergebnis: nach derzeitiger Einordnung keine Pflicht.
- [ ] Prüfhinweis für die Roadmap: Ein Kundenportal mit Sendungsverfolgung für Endkunden (v1.1) kann eine Leistung an Verbraucher sein; dann BFSG neu prüfen (Ausnahme für Kleinstunternehmen bei Dienstleistungen: weniger als zehn Beschäftigte und höchstens 2 Mio. € Umsatz oder Bilanzsumme).
- [ ] Empfohlen: Orientierung an WCAG 2.2 Stufe AA bzw. EN 301 549 (große Schaltflächen, Kontraste, Bedienbarkeit mit Handschuhen) – auch weil öffentliche Auftraggeber Barrierefreiheit verlangen können.

## 10. NIS2, Cyber Resilience Act, Produkthaftung, Data Act, DSA

- [ ] **NIS2 (BSIG neu, in Kraft seit 06.12.2025):** Betroffenheit selbst prüfen (BSI-Betroffenheitsprüfung). Erfasst sind Einrichtungen der Anlagen 1 und 2 ab 50 Beschäftigten oder mehr als 10 Mio. € Umsatz und Bilanzsumme. Ein kleiner SaaS-Anbieter unterhalb dieser Schwellen ist nach der Systematik nicht erfasst; Prüfung wiederholen bei Wachstum oder Konzernzugehörigkeit. Registrierungsfrist für Betroffene war der 06.03.2026. Kunden aus dem Bereich Post- und Kurierdienste (Anlage 2) können erfasst sein und fordern dann Lieferkettenmaßnahmen (Sicherheitsfragebogen, Meldewege) – Antworten vorbereiten. Speditionen und Frachtführer sind in den Anlagen nicht genannt.
- [ ] **Cyber Resilience Act (VO (EU) 2024/2847):** Reine Web-SaaS ist nach überwiegender Ansicht nur erfasst, soweit sie Fernverarbeitung für ein Produkt mit digitalen Elementen ist. Die **White-Label-App (Capacitor) ist als installierte App ein Produkt mit digitalen Elementen**. Meldepflichten für aktiv ausgenutzte Schwachstellen und schwerwiegende Sicherheitsvorfälle gelten seit **11.09.2026** (Frühwarnung binnen 24 Stunden, Meldung binnen 72 Stunden, Abschlussbericht nach 14 Tagen bzw. einem Monat; in Deutschland über die ENISA-Meldeplattform/BSI), alle übrigen Pflichten ab **11.12.2027** (CE-Kennzeichnung, Konformitätsbewertung, Sicherheitsupdates, SBOM). Leitlinien der Kommission vom 27.07.2026 zur Abgrenzung von Fernverarbeitung prüfen. Klären: Wer ist Hersteller der White-Label-App – der Kunde (Vertrieb unter eigener Marke) oder der Anbieter? (AGB § 6 Abs. 3 Nr. 6).
- [ ] **Produkthaftung:** Neues Produkthaftungsrecht (Richtlinie (EU) 2024/2853; Umsetzungsgesetz vom Bundestag am 08.10.2026 beschlossen, Inkrafttreten vorgesehen zum 09.12.2026; Bundesrat stand aus) erfasst Software als Produkt; Haftung auch für Fehler, die durch Updates oder fehlende Updates entstehen. Versicherungsschutz prüfen.
- [ ] **Data Act (seit 12.09.2025, deutsches Durchführungsgesetz seit 30.05.2026, Aufsicht: Bundesnetzagentur):** Datenexport, Wechselverfahren und Informationspflichten umgesetzt (AGB § 17, Anlage A); keine Wechselentgelte (ab 12.01.2027 ohnehin verboten).
- [ ] **Digital Services Act:** Kontaktstellen (Art. 11, 12) im Impressum, Meldeweg für rechtswidrige Inhalte (Art. 16), Angaben zu Inhaltsbeschränkungen in den AGB (Art. 14).

## 11. App-Stores (White-Label-App)

- [ ] **D-U-N-S-Nummer** für die Organisation beantragen (kostenlos; Bearbeitung bis zu etwa 30 Werktage, über das Apple-Abfragetool oft schneller). Gilt für den Anbieter (eigene Demo-App) und für jeden Kunden mit White-Label-App.
- [ ] **Apple Developer Program** als Organisation: 99 € bzw. 99 US-$ je Jahr (Preis auf der Apple-Seite prüfen). Wegen Ziffer 4.2.6 der App Review Guidelines die White-Label-App im Konto des Kunden einreichen; der Anbieter erhält eine technische Rolle.
- [ ] **Google Play Console** als Organisation: einmalig 25 US-$; D-U-N-S-Nummer erforderlich.
- [ ] Händlerangaben nach DSA (Anschrift, Telefon, E-Mail) in beiden Stores hinterlegen.
- [ ] Datenschutz-Labels (Apple „App Privacy“, Google „Data safety“) anhand von AVV Anlage 1 ausfüllen; keine Tracking-SDKs.
- [ ] Meldeprozess nach CRA für die Store-Apps einrichten (Ziffer 10).

## 12. Zahlungsabwicklung und Vertrieb

- [ ] Zahlungsweg festlegen: Rechnung mit Überweisung (Start), später SEPA-Lastschrift über [Zahlungsdienstleister] (Roadmap v1.2). Vertrag und gegebenenfalls AVV mit dem Zahlungsdienstleister prüfen; Rolle (eigener Verantwortlicher oder Auftragsverarbeiter) in der Datenschutzerklärung angeben.
- [ ] Mahnwesen und Sperrprozess nach § 14 AGB (Mahnung mit Sperrandrohung, Frist von mindestens [10] Werktagen). Die Abrechnungsvorschau der Konsole berechnet einen bezahlten Kunden auch während einer Sperre weiter (§ 14 Abs. 4 AGB) und nennt in jeder Zeile den Grund; die Regeln stehen unter der Tabelle. Sie erzeugt keine Rechnungen; zeitanteilige Tarifwechsel, Erstattungen nach § 16 Abs. 3 AGB und individuelle Leistungen gesondert abrechnen.
- [ ] Kündigungs- und Tarifwünsche, die Kunden in der Plattform senden, täglich prüfen (Markierung und Filter „Anfragen“ in der Konsole); Zugang und Vertragsende in Textform bestätigen (§ 16 Abs. 5 AGB) und das Laufzeitende eintragen.
- [ ] Reseller-/Partnerverträge (20–30 % Provision, Roadmap) erst nach anwaltlicher Prüfung; Datenschutzrollen klären.
- [ ] **Muster-Kundenangebot** (Abschnitt 13) verwenden.

## 13. Muster-Kundenangebot

> **Angebot Nr. [Nummer] vom [Datum]**
>
> **Anbieter:** [Firma] [Rechtsform], [Anschrift], [E-Mail], [Telefon]
> **Kunde:** [Firma des Kunden], [Anschrift des Kunden], Ansprechpartner [Name], USt-IdNr. [falls EU-Ausland]
>
> **Leistung:** Nutzung der Plattform LADEKLAR als Software-as-a-Service nach Leistungsbeschreibung/SLA
>
> | Position | Menge | Einzelpreis netto | Gesamt netto |
> |---|---|---|---|
> | Tarif [Start/Flotte/Premium], [monatliche/jährliche] Zahlweise | 1 | [49/129/299] € je Monat [bzw. Jahrespreis: zehnfacher Monatspreis] | [Betrag] € |
> | Zusatzfahrer über [15/40] hinaus (gebuchte Plätze, mit dem Monatspreis) | [Anzahl] | [7/6] € je Monat | [Betrag] € |
> | [Zusatzspeicher – erst anbieten, wenn die Plattform ihn abbildet (AGB § 6 Abs. 2)] | [Anzahl] × [10] GB | [Preis] € je Monat | [Betrag] € |
> | White-Label-App (nur Premium): Erstellung | 1 | 1.990 € einmalig | 1.990 € |
> | White-Label-App: Betrieb und Pflege | 1 | 99 € je Monat | [Betrag] € |
> | Einrichtung/Schulung [optional] | [Anzahl] Std. | [Preis] € | [Betrag] € |
>
> Alle Preise zuzüglich gesetzlicher Umsatzsteuer.
>
> **Laufzeit:** [Monatsvertrag, kündbar mit 14 Tagen zum Monatsende / Jahresvertrag, 12 Monate mit automatischer Verlängerung um 12 Monate, Kündigung einen Monat vor Ablauf]. Das Recht auf Anbieterwechsel nach § 17 AGB bleibt unberührt.
> **Testphase:** 30 Tage kostenlos ab [Datum], ohne Zahlungsdaten.
> **Vertragsgrundlagen:** AGB, Leistungsbeschreibung/SLA und Auftragsverarbeitungsvertrag in der Fassung vom [Datum], abrufbar unter [Website-URL/recht].
> **Gültigkeit des Angebots:** bis [Datum].
>
> **Annahme:** Das Angebot wird durch Erklärung in Textform (z. B. E-Mail) oder Unterschrift angenommen.
>
> [Ort, Datum] – für den Kunden: ______________________

## 14. Reihenfolge vor dem ersten zahlenden Kunden (Kurzfassung)

1. Gesellschaft gründen, Konto, Steuernummer und USt-IdNr.
2. Marke anmelden, Domains sichern.
3. Hosting- und Backup-Verträge (und, falls eingesetzt, E-Mail-Versand) mit AVV schließen.
4. TOM und Unterauftragsverarbeiter-Liste mit der Technik abgleichen.
5. Rechtstexte anwaltlich prüfen lassen, Platzhalter füllen, Prüfhinweise entfernen.
6. Impressum, Datenschutzerklärung, Speicherhinweis, AGB, AVV, Leistungsbeschreibung veröffentlichen.
7. Versicherungen abschließen.
8. Vorlagen für Kunden (Datenschutzhinweise Fahrer, Nutzungsbedingungen, Muster-Betriebsvereinbarung) im Kundenbereich bereitstellen.
9. Prozesse für Support, Sicherheitsvorfälle, Betroffenenanfragen und CRA-Meldungen dokumentieren.
