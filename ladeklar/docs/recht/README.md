# Rechtliche Mustertexte LADEKLAR – Übersicht

> **Hinweis – Muster, keine Rechtsberatung.**
> Alle Dokumente in diesem Ordner sind Mustertexte für die SaaS-Plattform LADEKLAR. Sie ersetzen keine Rechtsberatung und sind vor Verwendung anwaltlich prüfen zu lassen. Platzhalter in [eckigen Klammern] ausfüllen. Mit „Prüfhinweis“ gekennzeichnete Anmerkungen richten sich an die prüfende Anwältin bzw. den prüfenden Anwalt und sind vor Veröffentlichung oder Unterzeichnung zu entfernen. Recherchestand: 16.10.2026 (Quellen: QUELLEN.md).

---

## 1. Einheitliche Begriffe

| Begriff | Bedeutung |
|---|---|
| **Anbieter** | Lizenzgeber und Plattformbetreiber, [Firma] [Rechtsform] |
| **Kunde** | Lizenznehmer (Spedition, Transportunternehmen, Kurierdienst, Bauunternehmen mit Fuhrpark); nur Unternehmer nach § 14 BGB |
| **Nutzer** | Admins, Disponenten und Fahrer des Kunden |
| **Fahrer** | angestellte Fahrer und Fahrer von Subunternehmern des Kunden |
| **Plattform** | LADEKLAR als Web-App, PWA und optional White-Label-App |
| **Mandant** | der getrennte Bereich eines Kunden in der Plattform |
| **Kundendaten / Auftragsdaten** | alle Daten des Kunden / Daten zu Lieferungen (§ 2 AGB) |

Datenschutzrechtliche Rollen: Für Auftrags- und Fahrerdaten ist der **Kunde Verantwortlicher**, der **Anbieter Auftragsverarbeiter**. Für Website, Vertragsanbahnung, Kundenkonto und Abrechnung ist der **Anbieter Verantwortlicher**.

## 2. Dokumente

| Nr. | Datei | Zweck | Wer veröffentlicht / unterschreibt | Wo |
|---|---|---|---|---|
| 1 | `README.md` | diese Übersicht | intern | – |
| 2 | `AGB.md` | Allgemeine Geschäftsbedingungen und SaaS-Nutzungsvertrag (B2B), inkl. Data-Act-Wechselregeln und Anlage A (exportierbare Daten) | Anbieter stellt bereit; Kunde akzeptiert bei Registrierung bzw. Angebotsannahme | Website, Registrierung, Angebot |
| 3 | `LEISTUNGSBESCHREIBUNG_SLA.md` | Funktionsumfang je Rolle, Tarife, Speicher, Datensicherung, Löschfristen, Verfügbarkeit, Support, Reaktionszeiten | Anlage zu den AGB | Website, Kundenbereich |
| 4 | `AVV.md` | Auftragsverarbeitungsvertrag nach Art. 28 Abs. 3 DSGVO mit Anlagen 1–5 (u. a. Support-Zugriff) | Anbieter und Kunde (elektronisch, Art. 28 Abs. 9 DSGVO) | Registrierung, Kundenbereich |
| 5 | `TOM.md` | technische und organisatorische Maßnahmen (Anlage 2 AVV) | Anbieter | Kundenbereich bzw. Website |
| 6 | `UNTERAUFTRAGSVERARBEITER.md` | Liste der Unterauftragsverarbeiter, Push-Dienste, Änderungsverfahren (Anlage 3 AVV) | Anbieter | Website (öffentliche, aktuelle Liste) |
| 7 | `DATENSCHUTZ.md` | Datenschutzerklärung des Anbieters für Website und Plattform (Art. 13 DSGVO) | Anbieter | Website-Fuß, Anmeldeseite, Info-Menü der App |
| 8 | `DATENSCHUTZHINWEISE_FAHRER.md` | Vorlage: Information der Fahrer (Art. 13 DSGVO) inkl. Kurzfassung in einfacher Sprache und Kurzhinweis für Empfänger | **Kunde** gibt sie seinen Fahrern | Info-Menü der Fahrer-App, Aushang, Einweisung |
| 9 | `IMPRESSUM.md` | Impressum nach § 5 DDG (Varianten GmbH/UG und Einzelunternehmen), DSA-Kontaktstelle, Hinweise zu OS-Plattform und VSBG | Anbieter (und Kunde für White-Label) | Website, App, Store-Einträge |
| 10 | `NUTZUNGSBEDINGUNGEN_FAHRER.md` | Regeln für Fahrer: Bedienung nur im Stand, Zugangsdaten, Meldungen, Fotos, BYOD | **Kunde** gibt sie seinen Fahrern; Bestätigung der Einweisung | Einweisung, Info-Menü der App |
| 11 | `BETRIEBSVEREINBARUNG_MUSTER.md` | Muster-Betriebsvereinbarung nach § 87 Abs. 1 Nr. 6 BetrVG | **Kunde und Betriebsrat** | beim Kunden |
| 12 | `COOKIES_SPEICHER.md` | Hinweis zu lokal gespeicherten Informationen nach § 25 TDDDG, Begründung ohne Banner | Anbieter | Website, verlinkt aus der Datenschutzerklärung |
| 13 | `CHECKLISTE_GRUENDUNG.md` | Gründung und Betrieb des Anbieters, inkl. Muster-Kundenangebot | intern | – |
| 14 | `QUELLEN.md` | Quellen mit URL und Abrufdatum, gruppiert nach Thema | intern / Anwältin | – |

## 3. Reihenfolge der Einführung

**Phase 1 – vor dem ersten Testkunden**

1. Gründung nach `CHECKLISTE_GRUENDUNG.md` (Rechtsform, Register, Steuer, Marke, Versicherungen).
2. Verträge mit Hosting-, Backup- und E-Mail-Dienstleistern samt AVV; `UNTERAUFTRAGSVERARBEITER.md` ausfüllen.
3. `TOM.md` mit der tatsächlichen Technik abgleichen (Spalte Status).
4. Anwaltliche Prüfung aller Texte; Platzhalter füllen; Prüfhinweise entfernen.
5. Veröffentlichen: `IMPRESSUM.md`, `DATENSCHUTZ.md`, `COOKIES_SPEICHER.md` auf der Website und in der App.

**Phase 2 – vor der Registrierung von Kunden**

6. `AGB.md`, `LEISTUNGSBESCHREIBUNG_SLA.md`, `AVV.md` (mit TOM und Unterauftragsverarbeitern) unter [Website-URL/recht] veröffentlichen und in die Registrierung einbinden (Checkbox, Speichermöglichkeit).
7. Exportformate und Informationen zum Anbieterwechsel veröffentlichen (Data Act Art. 26, 28).

**Phase 3 – beim Kunden vor dem produktiven Einsatz mit Fahrern**

8. Kunde wählt Einstellungen (Standort, Fahrsperre, Fotopflicht, Löschfristen).
9. Bei Betriebsrat: Betriebsvereinbarung nach `BETRIEBSVEREINBARUNG_MUSTER.md` abschließen – **vor** dem Einsatz mit Beschäftigten.
10. Kunde passt `DATENSCHUTZHINWEISE_FAHRER.md` und `NUTZUNGSBEDINGUNGEN_FAHRER.md` an, hinterlegt sie in der App und weist die Fahrer ein (Bestätigung aufbewahren).
11. Kunde hinterlegt den Kurzhinweis für Empfänger am Unterschriftenfeld.

**Phase 4 – laufender Betrieb**

12. Änderungen der Unterauftragsverarbeiter 30 Tage vorher ankündigen; TOM jährlich prüfen; Wiederherstellungstest vierteljährlich.
13. Rechtsentwicklungen beobachten (Abschnitt 5).

## 4. Anforderungen an die App, die sich aus den Texten ergeben

Die Texte beschreiben einige Funktionen, die in PLAN.md nicht oder nur grob festgelegt sind. Sie sind vor Veröffentlichung umzusetzen oder die Texte anzupassen:

| Anforderung | Grundlage in den Texten |
|---|---|
| Statusschritt funktioniert ohne Standortfreigabe; Standortabfrage nur nach Hinweis in der App (Einwilligung) | DATENSCHUTZHINWEISE_FAHRER Ziff. 5, COOKIES_SPEICHER Ziff. 4 |
| Fahrsperre wertet Positionen nur lokal aus, keine Speicherung/Übertragung | LEISTUNGSBESCHREIBUNG A 2.8, TOM 2.5 |
| EXIF-/GPS-Metadaten beim Verkleinern der Fotos entfernen | TOM 2.5, BV § 4 Abs. 5 |
| getrennte Löschfristen (Standort, Benachrichtigungen, deaktivierte Fahrer, Audit-Log) und Ausnahme „Streitfall“; bisher nur `retentionYears` | LEISTUNGSBESCHREIBUNG A 6, TOM 8, BV § 7 |
| Gerätezeit und Server-Eingangszeit bei Offline-Schritten; Kennzeichnung „offline erfasst“ | LEISTUNGSBESCHREIBUNG A 2.6 |
| Warnhinweis vor Abmelden bei ungesendeter Warteschlange | LEISTUNGSBESCHREIBUNG A 2.6, NUTZUNGSBEDINGUNGEN Ziff. 6 |
| Korrekturen nach Ablauf der 2-Minuten-Frist protokolliert, Original bleibt erhalten | LEISTUNGSBESCHREIBUNG A 2.9, TOM 3.2 |
| Datenschutz-Kurzhinweis am Unterschriftenfeld (vom Kunden hinterlegbar) | LEISTUNGSBESCHREIBUNG A 2.9 Abs. 4 |
| Einstellung „Fahrer im Abliefernachweis: Name / Vorname / Kürzel“ | DATENSCHUTZHINWEISE_FAHRER Ziff. 8 |
| Support-Freigabe mit Dauer (Voreinstellung 24 h, max. 7 Tage), nur lesend, Protokoll für den Kunden sichtbar | AVV Anlage 4 |
| Zwei-Faktor-Authentifizierung für Plattform-Konsole und Support-Modus | TOM 2.2, AVV Anlage 4 |
| Datenexport auch im Status „Gesperrt“ und „Gekündigt“; Formatdokumentation veröffentlicht | AGB § 14, § 17, Anlage A |
| Kündigung und Wechselverlangen über die Plattform; Erinnerung vor Verlängerung | AGB § 16 Abs. 2 und 5 |
| Speicherkontingent: Hinweise bei 80/100 %, Überlauf bis 110 % | LEISTUNGSBESCHREIBUNG A 4 |
| Push-Inhalte minimal (keine Dokumente, möglichst keine Namen) | LEISTUNGSBESCHREIBUNG A 2.5 |
| Einladungslinks einmalig und befristet | TOM 2.2 |
| Opt-out der Referenznennung in den Einstellungen | AGB § 25 |
| Impressum und Datenschutz von Kunde **und** Anbieter im Info-Menü (White-Label) | IMPRESSUM Ziff. 1 |
| Schwachstellen-Meldeweg (`security.txt`), CRA-Meldeprozess für Store-Apps | AGB § 24, CHECKLISTE Ziff. 10 |

## 5. Rechtsentwicklungen, die zu beobachten sind (Stand 16.10.2026)

| Thema | Stand | betroffene Dokumente |
|---|---|---|
| Digital Omnibus (DSGVO, ePrivacy/Cookies, Data Act) | Kommissionsvorschlag 19.11.2025; Trilog nach Recherche noch nicht begonnen | AVV § 9, COOKIES_SPEICHER, AGB § 16, § 17 |
| EU-US Data Privacy Framework | EuG 03.09.2025 (T-553/23) bestätigt; Rechtsmittel C-703/25 P anhängig | AVV § 6, UNTERAUFTRAGSVERARBEITER, DATENSCHUTZ |
| Produkthaftungsrecht | Bundestag 08.10.2026 beschlossen, Bundesrat ausstehend (Frist 30.10.2026), Inkrafttreten vorgesehen 09.12.2026 | AGB § 20 |
| Cyber Resilience Act | Meldepflichten seit 11.09.2026, volle Anwendung 11.12.2027 | AGB § 6 Abs. 3, CHECKLISTE |
| Data Act – Wechselentgelte | ab 12.01.2027 verboten | AGB § 17 Abs. 6 |
| Beschäftigtendatengesetz | Referentenentwurf 08.10.2024, nicht beschlossen | DATENSCHUTZHINWEISE_FAHRER, BV |
| § 38 BDSG (Datenschutzbeauftragter ab 20 Personen) | Aufhebung bis Ende 2026 angekündigt, kein Gesetz | CHECKLISTE |
| E-Rechnung | Ausstellungspflicht ab 2027 (> 800.000 € Vorjahresumsatz) bzw. 2028 | AGB § 13, CHECKLISTE |
| eFTI-Verordnung | Behörden müssen elektronische Frachtinformationen ab 09.07.2027 akzeptieren | Roadmap eCMR |
