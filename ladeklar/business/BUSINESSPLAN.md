# Ladeklar – Businessplan

**„Ein Tipp. Alles klar.“** · Zweitclaim: **„Tippen statt telefonieren.“**

Stand: 16.10.2026 · Version 1.0 · Planungszeitraum Januar 2027 bis Dezember 2031
Dazugehörige Unterlagen: `PLAN.md` (Produkt), `MARKTANALYSE.md`, `Ladeklar_Finanzmodell.xlsx`, `PITCH.md`, `QUELLEN.md`,
Rechtsvorlagen in `docs/recht/`.

Alle Beträge netto. Quellen `[Qn]` siehe `QUELLEN.md`. **(Annahme)** kennzeichnet eigene Schätzungen.
Alle Planzahlen stammen aus `Ladeklar_Finanzmodell.xlsx` (Basisplan); Rundungsdifferenzen sind möglich.

---

## Inhalt

1. Executive Summary
2. Gründer und Lizenzgeber-Modell
3. Produkt
4. Nutzenversprechen und ROI-Beispiel
5. Markt
6. Wettbewerb
7. Marketing und Vertrieb
8. Preise
9. Organisation und Personalplan
10. Technik und Hosting
11. Recht
12. Finanzplan
13. Risiken und Gegenmaßnahmen
14. Meilensteine
15. Anhang

---

## 1. Executive Summary

**Problem.** In kleinen Speditionen und Transportbetrieben läuft die Auftragsabwicklung über Telefon, WhatsApp,
Zettel und Excel. Die Disposition fragt jede Tour einzeln nach („Wo bist du?“), Lieferscheine kommen Tage später
ins Büro, Wartezeiten an der Rampe werden nicht nachgewiesen. Gleichzeitig fehlen rund 120.000 Lkw-Fahrer [Q18],
64 % der Speditionen finden keine Disponenten [Q28], und 30,4 % der Berufskraftfahrer haben eine andere
Muttersprache als Deutsch [Q22].

**Lösung.** Ladeklar ist eine White-Label-App für Speditionen, Transportunternehmen, Kurierdienste und Betriebe mit
eigenem Fuhrpark. Die Disposition legt Lieferungen an, der Fahrer bestätigt jeden Schritt mit einem großen Knopf
(Bestätigt, Aufgeladen, Abgeladen, Lieferschein-Foto), die Disposition sieht alles live und bekommt eine
Push-Mitteilung. Keine Hardware, Einführung in 10 Minuten, Fahrer-App in 8 Sprachen, unter dem Logo des Kunden.
Standort nur im Moment eines Statuswechsels und nur, wenn der Betrieb es einschaltet – keine Dauerortung.

**Geschäftsmodell.** Der Gründer ist **Lizenzgeber** und vermietet Zugänge als Software-as-a-Service an
**Lizenznehmer** (Unternehmen): Start 49 €, Flotte 129 €, Premium 299 € je Monat, Zusatzfahrer 7 € bzw. 6 €,
White-Label-Store-App 1.990 € einmalig + 99 € je Monat. 30 Tage kostenlos testen, Jahreszahlung mit 2 Monaten
geschenkt.

**Markt.** 46.902 gewerbliche Güterkraftverkehrsunternehmen, 45.929 Werkverkehrsunternehmen [Q1] und rund
13.700 Kurier- und Expressbetriebe [Q16]. 53 % der gewerblichen Unternehmen haben 1–3 Fahrzeuge [Q6].
TAM rund 140 Mio. € pro Jahr, SAM rund 92 Mio. € (Rechnung in `MARKTANALYSE.md`, Kap. 6).

**Plan in Zahlen (Basisplan).**

| | 2027 | 2028 | 2029 | 2030 | 2031 |
|---|---|---|---|---|---|
| Kunden zum Jahresende | 86 | 300 | 595 | 922 | 1.276 |
| ARR zum Jahresende | 125.230 € | 444.980 € | 896.788 € | 1.413.271 € | 1.982.530 € |
| Umsatz | 58.559 € | 281.279 € | 666.154 € | 1.152.569 € | 1.676.944 € |
| EBITDA | −101.683 € | −140.426 € | 4.589 € | 128.677 € | 373.871 € |
| Mitarbeitende inkl. Gründer | 3 | 6 | 8 | 11 | 13 |

- **Break-even (EBITDA):** erstmals im Monat 30 (Juni 2029), dauerhaft positiv ab Monat 40 (April 2030).
- **Kapitalbedarf:** 347.354 € inklusive 50.000 € Sicherheitspuffer; tiefster Punkt des kumulierten Cashflows
  −297.354 € im Juli 2029.
- **Finanzierung:** 350.000 € = 25.000 € Eigenkapital + 125.000 € KfW ERP-Gründerkredit StartGeld +
  200.000 € Business Angel / Pre-Seed (Oktober 2027). Tiefster Kassenstand im Plan: 52.646 €.

---

## 2. Gründer und Lizenzgeber-Modell

### 2.1 Rollen

| Rolle | Wer | Was sie tun |
|---|---|---|
| **Lizenzgeber** | der Gründer, später das Ladeklar-Team (geplant als GmbH) | betreibt die Plattform, legt Lizenzen an, setzt Tarif, Plätze, Laufzeit, Branding; sieht Kennzahlen und Abrechnung, **keine Auftragsdaten** |
| **Lizenznehmer** | Spedition, Transportunternehmen, Kurierdienst, Bau- oder Handelsbetrieb mit Fuhrpark | arbeitet unter eigenem Logo, eigenen Farben und eigenem App-Namen; legt Disponenten, Fahrer, Fahrzeuge und Lieferungen an |
| **Fahrer** | angestellte Fahrer und Subunternehmer-Fahrer | bedienen die Fahrer-App über große Icon-Knöpfe |
| **Partner** (ab 2028) | Verbände, Telematik-Händler, Steuerberater, IT-Dienstleister | vermitteln Kunden, erhalten 20–30 % Provision (Plan: 25 %) |

Der Lizenzgeber ist datenschutzrechtlich **Auftragsverarbeiter** (Art. 28 DSGVO), der Lizenznehmer
**Verantwortlicher**. Support-Zugriff auf Kundendaten gibt es nur nach Freigabe durch den Kunden, zeitlich
begrenzt und protokolliert (PLAN.md Kap. 2).

### 2.2 Gründerprofil (Platzhalter)

| Feld | Inhalt |
|---|---|
| Name | [Name des Gründers] |
| Ausbildung/Erfahrung | [z. B. Softwareentwicklung, Erfahrung in Disposition/Logistik] |
| Rolle in Ladeklar | Geschäftsführer: Produkt, Vertrieb, Partner, Finanzen |
| Bisherige Leistung | Produkt v1.0 fertig (Lizenzkonsole, White-Label, Disposition, Fahrer-App, Push, Offline, 8 Sprachen, Rechtsvorlagen) |
| Lücken im Team | Vertrieb in der Fläche (Einstellung Juli 2027), zweite Entwicklerkapazität (Oktober 2027) |
| Beirat (geplant) | 1 Inhaber einer Spedition mit 10–30 Lkw, 1 Steuerberater/Branchenkenner |

### 2.3 Rechtsform

GmbH mit 25.000 € Stammkapital (im Finanzmodell Monat 1). Begründung: Haftungsbegrenzung, Vertrauen bei
B2B-Kunden und Banken, Voraussetzung für Beteiligung eines Business Angels. Der Gesellschafter-Geschäftsführer
ist im Modell sozialversicherungsfrei angesetzt (Annahme; Statusfeststellung bei der Deutschen Rentenversicherung
beantragen).

---

## 3. Produkt

### 3.1 Was Ladeklar heute kann (v1.0)

- **Lizenzkonsole** für den Lizenzgeber: Lizenznehmer anlegen, Tarif, Plätze, Laufzeit, Status, Branding, MRR-Übersicht.
- **Einrichtungs-Assistent** in 4 Schritten: Logo & Farbe, Fahrzeuge, Fahrer (6-stellige PIN, Einladungslink/QR per
  WhatsApp oder SMS), erste Lieferung.
- **Disposition (Web/Tablet):** Lieferung anlegen (Pflicht nur Route und Ladedatum), automatische Buchungsnummer,
  zuweisen oder „offen für alle Fahrer“, „Wiederholen“ für Stammrouten, Live-Board, Verlauf, Suche,
  Abliefernachweis als PDF, Berichte, CSV-Export.
- **Fahrer-App (PWA, optional Store-App):** immer genau ein großer Knopf für den nächsten Schritt; Notiz und
  Schnellbausteine („Stau“, „Warte an Rampe“), Problem melden mit Foto, Navigation, Anrufen, Rückgängig 2 Minuten.
- **Eingebaute Antworten auf Alltagsprobleme:** 8 Sprachen (DE, EN, PL, RO, CS, TR, RU, UK), Fahrsperre ab ca. 8 km/h,
  Offline-Warteschlange, Foto-Pflicht vor Abschluss, Standzeit-Erfassung, Palettentausch, Fahrzeugbelegung, HU/SP-
  Fristen, Unterschrift, Dunkelmodus, Datenexport (EU Data Act), REST-API (Premium).

### 3.2 So funktioniert es in drei Schritten

1. **Einrichten (10 Minuten):** Logo hochladen, Fahrzeuge und Fahrer eintragen, Einladung per WhatsApp verschicken.
2. **Lieferung anlegen:** Route, Datum, Fahrer – fertig. Der Fahrer bekommt eine Push-Mitteilung.
3. **Tippen statt telefonieren:** Der Fahrer tippt Bestätigt, Aufgeladen, Abgeladen, fotografiert den Lieferschein.
   Die Disposition sieht jeden Schritt live; der Abliefernachweis geht am selben Tag an Kunde und Buchhaltung.

### 3.3 Roadmap (aus PLAN.md, ergänzt um Erkenntnisse aus der Wettbewerbsanalyse)

| Version | Zeitraum (Plan) | Inhalt |
|---|---|---|
| v1.0 | jetzt | siehe oben |
| v1.1 | Q2/2027 | **Zwischenstopps/Sammeltouren**, Kundenportal mit Sendungsverfolgungs-Link, Webhooks, Sprachen **Tschechisch und Bulgarisch**, **Gastzugänge für Subunternehmer-Fahrer** |
| v1.2 | Q4/2027 | Abrechnung automatisch (SEPA, Rechnungen, lexoffice/sevDesk/DATEV), **Schritt-Bausteine je Auftragsart** (Temperatur, Wiegeschein, Kran), **Saisonpause** |
| v1.3 | 2028 | eCMR, Schnittstellen zu Frachtbörsen, Telematik (Positionen optional übernehmen), Zeitfenster-Nummern, **automatischer Standgeld-Beleg** |
| v2.0 | 2029 | Arbeitszeit/Spesen, Lenk- und Ruhezeit-Hinweise, Lieferschein-Erkennung (OCR) |

---

## 4. Nutzenversprechen und ROI-Beispiel

### 4.1 Nutzen in einem Satz je Rolle

- **Inhaber:** Weniger Telefon, Rechnung am selben Tag, Standgeld mit Beleg – für 129 € im Monat bei 10 Fahrern.
- **Disposition:** Ein Board statt 60 Anrufe; sie sieht, was erledigt ist, und kümmert sich nur um Störungen.
- **Fahrer:** Ein Knopf in seiner Sprache, keine Rückrufe während der Pause, keine Dauerüberwachung.

### 4.2 ROI-Beispiel: Betrieb mit 10 Fahrern und 10 Lkw (Tarif Flotte, 129 €/Monat)

| Position | Rechnung | Nutzen je Monat |
|---|---|---|
| Grundlagen (Annahmen) | 10 Fahrer × 2 Lieferungen/Tag × 21 Arbeitstage = **420 Lieferungen/Monat**; Disponenten-Stundensatz **26 €** (Median 3.710 € brutto [Q80] × 1,21 Arbeitgeberkosten / 173 Std.) | – |
| Weniger Statusanrufe | 2 Anrufe je Lieferung × 3 Min. = 42 Std./Monat; Ladeklar ersetzt 60 % (Annahme) = **25,2 Std.** × 26 € | **655 €** |
| Weniger Suche nach Lieferscheinen | 3 % der Lieferungen (12,6) × 15 Min. = 3,15 Std. × 26 € (Annahme) | **82 €** |
| Schnellere Rechnung | Umsatz 10 Lkw × 10.700 € ≈ 107.000 €/Monat (Näherung aus [Q15][Q2]); Rechnung 4 Tage früher (Annahme) senkt den Forderungsbestand einmalig um **14.267 €**; Zinsvorteil 9 % p. a. (Kontokorrent, Annahme) | **107 €** |
| Standgeld mit Nachweis | 10 Lkw × 2 Fälle/Monat × 1 Std. über der freien Ladezeit × 40 € (Mitte der Spanne 30–50 € [Q36]) × 50 % durchsetzbar (Annahme) | **400 €** |
| **Summe Nutzen** | | **1.244 €** |
| Kosten Ladeklar Flotte | (Jahreszahlung: 1.290 €/Jahr = 107,50 €/Monat) | **129 €** |
| **Netto-Nutzen** | | **1.115 € je Monat / 13.380 € je Jahr** |
| **Verhältnis Nutzen zu Kosten** | 1.244 / 129 | **9,6 : 1** |

**Konservative Variante:** nur die Hälfte der Anrufersparnis (328 €), kein Standgeld: 328 + 82 + 107 = **517 €**
Nutzen je Monat, Verhältnis **4,0 : 1**. Nicht eingerechnet: Zeit der Fahrer (weniger Rückrufe), weniger
Reklamationen dank Fotos, Einarbeitung neuer Fahrer in ihrer Sprache, geringeres Bußgeldrisiko durch die Fahrsperre
(Handy am Steuer: 100 € + 1 Punkt [Q82]).

---

## 5. Markt

Ausführlich in `MARKTANALYSE.md`. Kernzahlen:

| Kennzahl | Wert | Quelle |
|---|---|---|
| Gewerbliche Güterkraftverkehrsunternehmen | 46.902 | [Q1] |
| Werkverkehrsunternehmen | 45.929 | [Q1] |
| Anteil Unternehmen mit 1–3 Fahrzeugen | 53 % | [Q6] |
| Lkw / Sattelzugmaschinen (01.04.2026) | 3,91 Mio. / 230.342 | [Q9] |
| Umsatz Güterbeförderung im Straßenverkehr (WZ 49.41) | 50,6 Mrd. € | [Q15] |
| KEP-Umsatz 2025 / Sendungen | 28,4 Mrd. € / 4,37 Mrd. | [Q17] |
| Fehlende Lkw-Fahrer | ca. 120.000 | [Q18] |
| Ausländische Berufskraftfahrer | 30,4 % | [Q22] |
| Fuhrparks (≥ 5 Fzg.) mit Telematik | 21 % | [Q29] |
| TAM / SAM (eigene Rechnung) | ca. 140 Mio. € / ca. 92 Mio. € p. a. | MARKTANALYSE Kap. 6 |
| SOM Jahr 5 (Finanzmodell) | 1.276 Kunden, 1,98 Mio. € ARR (1,75 % der SAM-Unternehmen) | Finanzmodell |

**Zielkunden in dieser Reihenfolge:** (1) Betriebe mit 4–15 Lkw in Stückgut-Nahverkehr und Baustofflogistik,
(2) Mittelstand 16–50 Lkw (Premium), (3) Werkverkehr im Bau- und Baustoffhandel, (4) Kleinstbetriebe 1–3 Lkw,
(5) Kurier/Express nach Einführung der Mehrstopp-Touren (v1.1).

---

## 6. Wettbewerb

Ausführlich mit Tabelle in `MARKTANALYSE.md`, Kap. 8. Kurzfassung:

- **Hauptwettbewerber ist der Status quo** aus Papier, Telefon, WhatsApp und Excel.
- **Telematik-Anbieter** (Webfleet ca. 15–35 €/Fahrzeug/Monat mit Hardware und 24–36 Monaten Laufzeit [Q51];
  YellowFox, Fleetboard, SPEDION, Couplink) lösen Ortung und Lenkzeiten, sind aber für Betriebe mit 5 Lkw oft
  zu groß. Couplink bietet einen kostenlosen Einstieg [Q47], SPEDION rechnet nur bewegte Fahrzeuge ab [Q46].
- **App-Tools** wie LOGISTIQO (Admin 125 €/Monat + 1 € je App-Nutzer [Q49]) sind preislich nah, aber ohne
  White-Label und ohne beworbene Mehrsprachigkeit.
- **TMS** (Soloplan CarLo, LIS WinSped) zielen auf den Mittelstand, Preise auf Anfrage [Q58][Q59].
- **Plattformen und digitale Speditionen** (TIMOCOM, Transporeon, sennder, Cargonexx) sind Ergänzungen oder eine
  andere Kategorie.

**Positionierung:** Ladeklar ist die **schnellste Einführung** (10 Minuten, keine Hardware), **unter eigener Marke**,
mit **Icon-Bedienung in 8 Sprachen** und **ohne Dauerortung** – deshalb auch in Betrieben mit Betriebsrat einführbar.

---

## 7. Marketing und Vertrieb

### 7.1 Botschaften

| Zielgruppe | Botschaft |
|---|---|
| Inhaber | „Tippen statt telefonieren. Ab 49 € im Monat, in 10 Minuten startklar, ohne Hardware.“ |
| Disposition | „Sie sehen jede Tour live. Das Telefon klingelt nur noch, wenn wirklich etwas ist.“ |
| Fahrer | „Ein Knopf. In deiner Sprache. Kein Tracking.“ |
| Betriebsrat | „Keine Dauerortung. Standort nur beim Statuswechsel, Muster-Betriebsvereinbarung liegt bei.“ |

### 7.2 Kanäle

| Kanal | Rolle | Start |
|---|---|---|
| **Direktvertrieb** (Telefon, Besuche, Demo per Video) | Hauptkanal Jahr 1; Gründer, ab Juli 2027 Vertrieb & Kundenerfolg. Rechtsrahmen: Werbeanrufe bei Unternehmen nur mit mindestens mutmaßlicher Einwilligung, Werbe-E-Mails nur mit ausdrücklicher Einwilligung (§ 7 Abs. 2 UWG) [Q93] – daher Anrufe vor allem bei Messe-, Verbands- und Empfehlungskontakten sowie Anfragen; Briefwerbung (Postkarte) ist der rechtlich einfachste Erstkontakt | Jan. 2027 |
| **Google Ads** (Suche) | Nachfrage abholen: „Fahrer App Spedition“, „digitaler Lieferschein“ | Jan. 2027 |
| **LinkedIn und Facebook-Gruppen** (Fahrer- und Unternehmergruppen) | Reichweite, Vertrauen, Fallbeispiele | Jan. 2027 |
| **Verbände** – BGL (ca. 7.000 Unternehmen in den Landesverbänden [Q67]) und Landesverbände, z. B. VSL Baden-Württemberg, LBT Bayern (ca. 1.100 Mitglieder [Q69]); BGL-Süd zusammen über 2.000 Mitglieder [Q68] | Vorträge, Mitgliedervorteil, später Partnerlizenz | ab Q2/2027 |
| **Messen** – LogiMAT 16.–18.03.2027 [Q65] (Besuch), **transport logistic 26.–29.04.2027** [Q64] (Start-up-Stand), IAA Transportation 19.–24.09.2028 [Q66] | Leads, Presse, Partner | März/April 2027 |
| **Fachpresse** – VerkehrsRundschau, DVZ, trans aktuell, eurotransport | Pressemitteilung zum Start, Anzeigen im Newsletter, Fallstudie | ab Jan. 2027 |
| **Partner** – Telematik-Händler, Steuerberater, IT-Dienstleister, Verbände | Empfehlung gegen 25 % Provision (Plan), ab 2028 10 %, 2029 20 %, 2030 25 %, 2031 30 % des Umsatzes über Partner | Pilot Q4/2027 |
| **Förder-Check** für Kunden | prüfen, ob Kunden ein Ladeklar-Abo über das BALM-Programm „Umweltschutz und Sicherheit“ (bis 33.000 € je Antragsteller/Jahr; Telematik- und Effizienzlösungen förderfähig) bezuschussen können [Q92] – **noch nicht bestätigt** | Q1/2027 |
| **Eingebaute Reichweite** | Einladungslink an Fahrer, später Gastzugänge für Subunternehmer, Abliefernachweis-PDF mit „erstellt mit Ladeklar“ (abschaltbar) | ab v1.1 |

### 7.3 Go-to-Market: die ersten 12 Monate

| Zeitraum | Ziel | Maßnahmen | Messgröße (Plan) |
|---|---|---|---|
| **Okt.–Dez. 2026** (Vorphase) | 5 Pilotbetriebe | Pilotbetriebe aus Netzwerk und Landesverbänden (Segment 4–15 Lkw, Stückgut/Baustoff), Strichliste Telefonate vorher/nachher, Website mit Preisen, Google-Ads-Konto, Fallstudie | 5 Piloten, ≥ 80 % der Fahrer aktiv in Woche 1 |
| **Jan.–März 2027** | Start, erste zahlende Kunden | Pilotkunden wandeln um; Google Ads 1.000 €/Monat; 20 Anrufe je Tag bei Kontakten mit Bezug (Postkarten-Rückläufer, Verbands- und Messekontakte, Empfehlungen); Postkarten-Mailing an 500 Betriebe in zwei Regionen; LinkedIn 2 Posts/Woche; Pressemitteilung; LogiMAT-Besuch | 13 Kunden Ende März |
| **Apr.–Juni 2027** | Sichtbarkeit | transport logistic (Start-up-/Gemeinschaftsstand, 9.000 €); erste Steuerberater-Partner; Fachpresse-Fallstudie; Release v1.1 (Zwischenstopps) | 30 Kunden Ende Juni |
| **Juli–Sep. 2027** | Vertrieb skalieren | Einstellung Vertrieb & Kundenerfolg (mehrsprachig, Ex-Disposition); Facebook-Gruppen-Posts; Vorträge bei Landesverbänden; Video-Fallstudie | 54 Kunden Ende September |
| **Okt.–Dez. 2027** | Finanzierung, Partner | Business-Angel-Runde 200.000 € (Okt.); Einstellung Entwicklung (Okt.); Verbandstage Herbst; Partnerprogramm mit 2 Telematik-Händlern testen | **86 Kunden, ARR 125.230 €** |

Nötige Testzugänge im Jahr 1: **257** (90 Neukunden / 35 % Umwandlung, Annahme).

### 7.4 Kosten je Kanal und CAC im Jahr 1

| Kanal | Kosten Jahr 1 | Neukunden (Annahme) | CAC |
|---|---|---|---|
| Direktvertrieb (Personal Vertrieb ab Juli 2027) | 27.588 € | 32 | 862 € |
| Google Ads (1.000 €/Monat) | 12.000 € | 24 | 500 € |
| LinkedIn-/Facebook-Anzeigen und Gruppen (400 €/Monat) | 4.800 € | 10 | 480 € |
| Messen und Verbandstage | 12.300 € | 10 | 1.230 € |
| Fachpresse, Newsletter-Anzeigen (400 €/Monat) | 4.800 € | 6 | 800 € |
| Druck/Postkarten (300 €/Monat), Video/Content (300 €/Monat), Verbände/Sponsoring (100 €/Monat) | 8.400 € | 8 | 1.050 € |
| **Summe** | **69.888 €** | **90** | **777 €** |

Die Summe entspricht im Finanzmodell: Vertrieb & Marketing-Personal 27.588 € + Marketing laufend 30.000 € +
Messen 12.300 € (Partnerprovision im Jahr 1: 0 €). Der Gründer-Vertrieb ist darin nicht enthalten.

### 7.5 Vertriebs- und Marketingbudget Jahr 1–5

| | 2027 | 2028 | 2029 | 2030 | 2031 |
|---|---|---|---|---|---|
| Marketing laufend | 30.000 € | 48.000 € | 72.000 € | 96.000 € | 120.000 € |
| Messen und Veranstaltungen | 12.300 € | 24.000 € | 19.000 € | 28.000 € | 23.000 € |
| Partnerprovision | 0 € | 7.032 € | 33.308 € | 72.036 € | 125.771 € |
| Personal Vertrieb & Marketing | 27.588 € | 119.645 € | 154.043 € | 257.036 € | 333.385 € |
| **Summe** | **69.888 €** | **198.677 €** | **278.351 €** | **453.072 €** | **602.156 €** |
| Neukunden | 90 | 264 | 417 | 540 | 660 |
| **CAC** | **777 €** | **753 €** | **668 €** | **839 €** | **912 €** |
| LTV (ARPA × DB-Marge / Monats-Churn) | 6.880 € | 5.450 € | 5.096 € | 4.976 € | 4.998 € |
| **LTV / CAC** | 8,9 | 7,2 | 7,6 | 5,9 | 5,5 |
| CAC-Amortisation | 6,6 Monate | 6,4 Monate | 5,8 Monate | 7,2 Monate | 7,8 Monate |

Der CAC steigt ab 2030, weil das Vertriebsteam wächst und mehr Umsatz über provisionierte Partner kommt.
Ein LTV/CAC über 3 gilt als tragfähig; der Plan bleibt in allen Jahren deutlich darüber.

### 7.6 Google Ads – Suchbegriffe (Auswahl)

„Fahrer App Spedition“, „Lieferschein App“, „digitaler Lieferschein“, „Abliefernachweis App“, „Disposition App LKW“,
„Auftragsmanagement Transportunternehmen“, „Fahrer App mehrsprachig“, „Standgeld Nachweis“, „Spedition Software
klein“, „Alternative zu WhatsApp Fahrer“. Anzeigentexte in `WERBETEXTE.md`. CPC in Deutschland meist 0,50–4,00 € [Q70];
im Modell nicht einzeln gerechnet, sondern über das Budget.

---

## 8. Preise

| | **Start** | **Flotte** | **Premium** |
|---|---|---|---|
| Preis je Monat (netto) | **49 €** | **129 €** | **299 €** |
| Jahreszahlung (2 Monate geschenkt) | 490 € | 1.290 € | 2.990 € |
| Fahrer inklusive | 3 | 15 | 40 |
| jeder weitere Fahrer | – (Upgrade) | 7 € | 6 € |
| Fahrzeuge | 6 | 40 | unbegrenzt |
| Disponenten-Zugänge | 1 | 5 | unbegrenzt |
| Lieferschein-Speicher | 5 GB | 50 GB | 250 GB |
| Eigene Domain | – | Subdomain | eigene Domain |
| REST-API, Prioritäts-Support, SLA 99,5 % | – | – | ja |
| White-Label-App im App Store / Google Play | – | – | 1.990 € einmalig + 99 €/Monat |

Preis je enthaltenem Fahrer: Start 16,33 €, Flotte 8,60 €, Premium 7,48 €. 30 Tage kostenlos testen, ohne Zahlungsdaten.
Nur für Unternehmer (§ 14 BGB).

**Planannahmen im Modell:** Tarifmix der Neukunden 50 % Start, 38 % Flotte, 12 % Premium; Ø 1,5 Zusatzfahrer je
Flotte-Kunde und 5 je Premium-Kunde; 20 % der neuen Premium-Kunden buchen die Store-App; 30 % zahlen jährlich
(effektiver Rabatt 5 % auf den MRR). Daraus ergibt sich ein ARPA von 122 € (Dez. 2027) bis 130 € (Dez. 2031),
weil Flotte- und Premium-Kunden seltener kündigen.

**Preispolitik:** Listenpreise sind öffentlich. Rabatte nur über Jahreszahlung und Partnerprogramme (Verbandsmitglieder:
erster Monat nach dem Test kostenlos, Annahme, nicht im Modell). Preiserhöhungen frühestens 2029 und nur für
Neukunden; das Modell rechnet ohne Preiserhöhung.

---

## 9. Organisation und Personalplan

| Rolle | Start | Brutto/Monat (Basis 2027) | Kosten 2027 | 2028 | 2029 | 2030 | 2031 |
|---|---|---|---|---|---|---|---|
| Gründer/Geschäftsführer | Jan. 2027 | 2.500 € → 7.000 € (Staffel) | 30.000 € | 48.000 € | 66.000 € | 78.000 € | 84.000 € |
| Vertrieb & Kundenerfolg 1 (mehrsprachig, Ex-Disposition) | Juli 2027 | 3.800 € | 27.588 € | 56.831 € | 58.536 € | 60.292 € | 62.101 € |
| Softwareentwicklung 1 (Full-Stack) | Okt. 2027 | 5.200 € | 18.876 € | 77.769 € | 80.102 € | 82.505 € | 84.980 € |
| Vertrieb 2 / Partnermanagement | Jan. 2028 | 4.200 € | – | 62.814 € | 64.698 € | 66.639 € | 68.638 € |
| Support Teilzeit (PL/RO/TR) | Jan. 2028 | 1.600 € | – | 23.929 € | 24.647 € | 25.386 € | 26.148 € |
| Softwareentwicklung 2 | Okt. 2028 | 5.200 € | – | 19.442 € | 80.102 € | 82.505 € | 84.980 € |
| Kundenerfolg 2 | Apr. 2029 | 3.800 € | – | – | 43.902 € | 60.292 € | 62.101 € |
| Marketing | Juli 2029 | 4.000 € | – | – | 30.809 € | 63.466 € | 65.370 € |
| Softwareentwicklung 3 | Jan. 2030 | 5.400 € | – | – | – | 85.679 € | 88.249 € |
| Vertrieb 3 | Jan. 2030 | 4.200 € | – | – | – | 66.639 € | 68.638 € |
| Kundenerfolg 3 | Juli 2030 | 3.800 € | – | – | – | 30.146 € | 62.101 € |
| Vertrieb 4 | Jan. 2031 | 4.200 € | – | – | – | – | 68.638 € |
| Support 2 (Vollzeit) | Jan. 2031 | 3.000 € | – | – | – | – | 49.027 € |
| **Personal gesamt** | | | **76.464 €** | **288.785 €** | **448.796 €** | **701.549 €** | **874.972 €** |
| Köpfe zum Jahresende | | | 3 | 6 | 8 | 11 | 13 |

Arbeitgeberkosten = Brutto × 1,21; Gehaltssteigerung 3 % je Modelljahr (Annahme). Marktwerte zur Einordnung:
Disponent Median 3.710 € brutto [Q80], Senior Full-Stack 54.700–75.264 € p. a. [Q81].

**Einstellungsregel (Gegensteuerung):** Jede Einstellung ab 2028 erfolgt erst, wenn der MRR die Planlinie des Vormonats
zu mindestens 90 % erreicht. Liegt das Wachstum 30 % unter Plan, werden Einstellungen um 6–12 Monate verschoben
(siehe Sensitivität, Kap. 12.7).

**Aufgabenverteilung:** Gründer – Produkt, Großkunden, Partner, Finanzen. Vertrieb & Kundenerfolg – Demos,
Einrichtung, Schulung der Disposition, Kündigungsprävention. Support – Fahrer-Hotline in Polnisch, Rumänisch,
Türkisch (Teilzeit, Rückruf binnen 2 Stunden).

---

## 10. Technik und Hosting

- **Architektur:** eine Codebasis, drei Oberflächen (Web-App, PWA für Android/iOS mit Push ab iOS 16.4,
  optional Store-Apps über Capacitor). Kern-Engine in JavaScript, Server Node.js 22 ohne Framework, SQLite,
  Live-Updates per Server-Sent Events, Web-Push (VAPID) – siehe PLAN.md Kap. 8.
- **Mandantentrennung** in der Engine erzwungen (jede Abfrage prüft die `tenantId`), automatisierter Test.
- **Hosting in Deutschland** bei einem deutschen Anbieter, verschlüsselte Backups täglich, Wiederherstellung monatlich
  getestet, Monitoring, Staging-System. Plankosten: Grundkosten 300 € (2027) bis 1.000 € (2031) je Monat plus
  variabel 0,80 € (Start), 2,00 € (Flotte), 5,00 € (Premium) je Kunde und Monat. Hetzner hat die Cloud-Preise 2026
  zweimal erhöht (April und Juni) [Q79]; das Modell enthält deshalb Puffer.
- **Skalierung:** SQLite reicht nach unserer Einschätzung für die ersten Hundert Mandanten auf einem Server; vor
  500 Kunden (Plan: Mitte 2029) wird die Datenhaltung auf PostgreSQL oder eine Instanz je Kundengruppe umgestellt
  (Aufwand in Softwareentwicklung 2 eingeplant).
- **Sicherheit:** Passwörter mit scrypt, Login-Sperre, Sicherheits-Header, Typprüfung bei Uploads, Audit-Log,
  keine externen Schriften und Tracker, Datenexport jederzeit.
- **Verfügbarkeit:** SLA 99,5 % für Premium (≈ 3,6 Std. Ausfall je Monat zulässig).
- **Store-Apps:** Apple verlangt 99 USD je Jahr für ein Entwicklerkonto, Google einmalig 25 USD [Q84]. Nach unserem
  Kenntnisstand müssen White-Label-Apps im App Store über das Entwicklerkonto des Kunden veröffentlicht werden
  (App-Store-Richtlinie 4.2.6 – vor dem ersten Auftrag prüfen). Die Einrichtungsgebühr von 1.990 € deckt Aufbau,
  Store-Texte, Prüfung und erste Veröffentlichung; 99 € je Monat decken Updates.
- **Zahlungsabwicklung:** SEPA-Lastschrift und Rechnung über einen Zahlungsdienst (z. B. Stripe: SEPA 0,35 € je
  Zahlung, Karten 1,5 % + 0,25 € [Q78]); im Modell 0,8 % vom Umsatz + 0,35 € je Kunde und Monat.

---

## 11. Recht

Alle Vorlagen liegen in `docs/recht/` und müssen vor Verwendung anwaltlich geprüft werden (Kosten in den
Einmalkosten Gründung, 8.000 €, und in „Recht und Datenschutz“ laufend):

1. AGB / SaaS-Lizenzvertrag (B2B) mit Leistungsbeschreibung, SLA, Laufzeit, Kündigung, Sperrung bei Zahlungsverzug,
   Haftung, Datenexport und Anbieterwechsel (EU Data Act)
2. Auftragsverarbeitungsvertrag (Art. 28 DSGVO), TOM (Art. 32 DSGVO), Liste der Unterauftragsverarbeiter
3. Datenschutzerklärung Website/App, Datenschutzhinweise für Fahrer als Vorlage für den Lizenznehmer
4. Impressum (§ 5 DDG), Cookie-/Speicherhinweis (§ 25 TDDDG)
5. Nutzungsbedingungen Fahrer-App, **Muster-Betriebsvereinbarung** (§ 87 Abs. 1 Nr. 6 BetrVG) – wichtig, weil
   Ortungssysteme mitbestimmungspflichtig sind [Q83]
6. Checkliste Gründung und Betrieb: Gewerbe, GmbH, Marke (DPMA/EUIPO), Domain, Versicherungen (Cyber/IT-Haftpflicht),
   Hosting in Deutschland, Aufbewahrungsfristen, Barrierefreiheit, NIS2-Einordnung, Steuer

**Zusätzliche Punkte für den Betrieb:** Statusfeststellung Gesellschafter-Geschäftsführer; Handyverbot am Steuer
(§ 23 Abs. 1a StVO) – die Fahrsperre ist eine Hilfe, keine Garantie, das steht in den Nutzungsbedingungen;
Standgeld-Berichte sind Belege, keine Rechtsberatung.

---

## 12. Finanzplan

### 12.1 Wichtigste Annahmen (vollständig im Blatt „Annahmen“)

| Bereich | Annahme |
|---|---|
| Start | Januar 2027 mit 5 zahlenden Pilotkunden |
| Neukunden je Monat (zahlend) | 2027: 3 → 6 → 9 → 12 (je Quartal); 2028: 16 → 20 → 24 → 28; 2029: 30 → 33 → 36 → 40; 2030: 45; 2031: 55 |
| Churn je Monat | Start 3,0 %, Flotte 2,0 %, Premium 1,2 % (Jahres-Churn gesamt 21–28 %); unter SMB-SaaS-Benchmarks von 3–7 % je Monat [Q71] – deshalb Szenario „Churn doppelt“ in Kap. 12.7 |
| Tarifmix Neukunden | 50 % Start, 38 % Flotte, 12 % Premium |
| Variable Kosten | Hosting 0,80/2,00/5,00 € je Kunde; Zahlung 0,8 % + 0,35 €; Partnerprovision 25 % auf 0–30 % des Umsatzes |
| Marketing laufend | 2.500 €/Monat (2027) bis 10.000 €/Monat (2031), dazu Messen nach Kalender |
| Steuern | GmbH: KSt 15 % (2027), ab 2028 jährlich −1 Punkt [Q76], Soli 5,5 %, Gewerbesteuer-Hebesatz 400 %; Verlustvortrag |
| Finanzierung | 25.000 € EK (Jan. 2027), 125.000 € KfW StartGeld (Jan. 2027, 4,0 %, 24 Monate tilgungsfrei, 10 Jahre), 200.000 € Business Angel (Okt. 2027) |

### 12.2 Kunden, MRR und ARR

| | 2027 | 2028 | 2029 | 2030 | 2031 |
|---|---|---|---|---|---|
| Neukunden im Jahr | 90 | 264 | 417 | 540 | 660 |
| Kündigungen im Jahr | 9 | 50 | 122 | 213 | 307 |
| Kunden Start (Jahresende) | 42 | 144 | 279 | 423 | 574 |
| Kunden Flotte | 33 | 117 | 235 | 369 | 514 |
| Kunden Premium | 11 | 39 | 81 | 131 | 187 |
| **Kunden gesamt** | **86** | **300** | **595** | **922** | **1.276** |
| davon mit Store-App | 2 | 8 | 16 | 26 | 37 |
| MRR im Dezember | 10.436 € | 37.082 € | 74.732 € | 117.773 € | 165.211 € |
| **ARR zum Jahresende** | **125.230 €** | **444.980 €** | **896.788 €** | **1.413.271 €** | **1.982.530 €** |
| ARPA im Dezember | 121,82 € | 123,60 € | 125,60 € | 127,67 € | 129,50 € |

Das Modell rechnet mit Bruchteilen von Kunden (Erwartungswerte); die gerundeten Tarifzahlen ergeben deshalb nicht
immer exakt die gerundete Summe.

### 12.3 Gewinn- und Verlustrechnung

| | 2027 | 2028 | 2029 | 2030 | 2031 |
|---|---|---|---|---|---|
| Abo-Umsatz (nach Jahreszahler-Rabatt) | 54.261 € | 268.670 € | 646.238 € | 1.126.779 € | 1.645.422 € |
| Einrichtung Store-Apps | 4.298 € | 12.609 € | 19.916 € | 25.790 € | 31.522 € |
| **Umsatz** | **58.559 €** | **281.279 €** | **666.154 €** | **1.152.569 €** | **1.676.944 €** |
| Variable Kosten (Hosting, Zahlung, Provision, Store) | 1.799 € | 15.200 € | 52.049 € | 103.903 € | 171.701 € |
| **Deckungsbeitrag** | **56.761 €** | **266.079 €** | **614.105 €** | **1.048.666 €** | **1.505.242 €** |
| Personal | 76.464 € | 288.785 € | 448.796 € | 701.549 € | 874.972 € |
| Marketing laufend | 30.000 € | 48.000 € | 72.000 € | 96.000 € | 120.000 € |
| Messen und Veranstaltungen | 12.300 € | 24.000 € | 19.000 € | 28.000 € | 23.000 € |
| Übrige Fixkosten (Hosting, Miete, Beratung, Reisen, Werkzeuge, Ausstattung, Gründung) | 39.680 € | 45.720 € | 69.720 € | 94.440 € | 113.400 € |
| **EBITDA** | **−101.683 €** | **−140.426 €** | **4.589 €** | **128.677 €** | **373.871 €** |
| EBITDA-Marge | −174 % | −50 % | 0,7 % | 11,2 % | 22,3 % |
| Abschreibungen | 0 € | 0 € | 0 € | 0 € | 0 € |
| Zinsen | 5.000 € | 5.000 € | 4.714 € | 4.089 € | 3.464 € |
| Ergebnis vor Steuern | −106.683 € | −145.426 € | −125 € | 124.588 € | 370.407 € |
| Steuern (nach Verlustvortrag) | 0 € | 0 € | 0 € | 0 € | 62.159 € |
| **Jahresergebnis** | **−106.683 €** | **−145.426 €** | **−125 €** | **124.588 €** | **308.248 €** |
| Kasse zum Jahresende | 243.317 € | 97.890 € | 82.141 € | 191.104 € | 545.886 € |

Der Verlustvortrag (252.234 € Ende 2029) wird 2030 und 2031 verbraucht; erste Steuerzahlung im Juni 2032 (außerhalb
des Planungszeitraums). Hardware wird sofort als Aufwand gebucht, daher keine Abschreibungen.

### 12.4 Break-even

| Kennzahl | Wert |
|---|---|
| Erster Monat mit EBITDA ≥ 0 | **Monat 30 = Juni 2029** (438 Kunden, MRR 54.618 €) |
| EBITDA dauerhaft positiv ab | **Monat 40 = April 2030** (vorher drücken Messe- und Einstellungsmonate einzelne Monate ins Minus) |
| Nötige Kunden für EBITDA = 0 | Dez. 2027: 153 · Dez. 2028: 315 · Dez. 2029: 467 · Dez. 2030: 679 · Dez. 2031: 820 |
| Tatsächliche Kunden | Dez. 2027: 86 · Dez. 2028: 300 · Dez. 2029: 595 · Dez. 2030: 922 · Dez. 2031: 1.276 |
| Kumulierter Cashflow wieder ≥ 0 | Monat 56 = August 2031 |

### 12.5 Liquiditätsplan 24 Monate

| Monat | Kunden | Umsatz | Kosten | EBITDA | Zinsen | Finanzierung | Kasse Monatsende |
|---|---|---|---|---|---|---|---|
| Jan. 2027 | 8 | 1.040 € | 16.996 € | −15.956 € | 417 € | 150.000 € (EK + KfW) | 133.627 € |
| Feb. 2027 | 11 | 1.363 € | 7.204 € | −5.842 € | 417 € | – | 127.369 € |
| März 2027 | 13 | 1.679 € | 8.013 € | −6.333 € | 417 € | – | 120.618 € |
| Apr. 2027 | 19 | 2.474 € | 16.242 € | −13.768 € | 417 € | – | 106.433 € |
| Mai 2027 | 25 | 3.112 € | 7.259 € | −4.147 € | 417 € | – | 101.870 € |
| Juni 2027 | 30 | 3.738 € | 7.276 € | −3.537 € | 417 € | – | 97.916 € |
| Juli 2027 | 38 | 4.836 € | 13.751 € | −8.915 € | 417 € | – | 88.584 € |
| Aug. 2027 | 46 | 5.772 € | 11.976 € | −6.203 € | 417 € | – | 81.964 € |
| Sep. 2027 | 54 | 6.691 € | 12.000 € | −5.309 € | 417 € | – | 76.238 € |
| Okt. 2027 | 65 | 8.075 € | 22.677 € | −14.602 € | 417 € | 200.000 € (Angel) | 261.220 € |
| Nov. 2027 | 75 | 9.293 € | 18.409 € | −9.116 € | 417 € | – | 251.687 € |
| Dez. 2027 | 86 | 10.487 € | 18.441 € | −7.954 € | 417 € | – | 243.317 € |
| Jan. 2028 | 100 | 12.304 € | 34.073 € | −21.769 € | 417 € | – | 221.131 € |
| Feb. 2028 | 113 | 13.898 € | 30.555 € | −16.657 € | 417 € | – | 204.058 € |
| März 2028 | 127 | 15.462 € | 37.635 € | −22.173 € | 417 € | – | 181.468 € |
| Apr. 2028 | 144 | 17.641 € | 30.758 € | −13.117 € | 417 € | – | 167.934 € |
| Mai 2028 | 160 | 19.592 € | 30.859 € | −11.267 € | 417 € | – | 156.251 € |
| Juni 2028 | 176 | 21.505 € | 30.957 € | −9.452 € | 417 € | – | 146.382 € |
| Juli 2028 | 196 | 24.027 € | 31.098 € | −7.070 € | 417 € | – | 138.895 € |
| Aug. 2028 | 215 | 26.314 € | 31.215 € | −4.901 € | 417 € | – | 133.577 € |
| Sep. 2028 | 234 | 28.558 € | 45.331 € | −16.773 € | 417 € | – | 116.388 € |
| Okt. 2028 | 257 | 31.404 € | 42.809 € | −11.405 € | 417 € | – | 104.567 € |
| Nov. 2028 | 279 | 34.009 € | 38.143 € | −4.134 € | 417 € | – | 100.016 € |
| Dez. 2028 | 300 | 36.565 € | 38.274 € | −1.709 € | 417 € | – | 97.890 € |

Kostenspitzen: Januar 2027 (Gründung 8.000 €), April 2027 (transport logistic 9.000 €), Januar 2028 (zwei
Einstellungen), März 2028 (LogiMAT 7.000 €), September 2028 (IAA Transportation 14.000 €). Die KfW-Tilgung
(1.302 € je Monat) beginnt im Januar 2029. Umsatzsteuer ist durchlaufend und nicht dargestellt.
Vorauszahlungen der Jahreszahler würden die Kasse zusätzlich stärken, sind aber konservativ nicht angesetzt.

### 12.6 Kapitalbedarf und Finanzierung

| Position | Betrag |
|---|---|
| Tiefster kumulierter Cashflow ohne Finanzierung (Juli 2029) | −297.354 € |
| Sicherheitspuffer | 50.000 € |
| **Kapitalbedarf** | **347.354 €** |
| Eigenkapital Gründer (Stammkapital) | 25.000 € |
| KfW ERP-Gründerkredit StartGeld | 125.000 € |
| Business Angel / Pre-Seed | 200.000 € |
| **Finanzierung gesamt** | **350.000 €** |
| Überdeckung | 2.646 € |
| Tiefster Kassenstand im Plan (Juli 2029) | 52.646 € |

**Wofür das Geld bis zum Tiefpunkt (Monate 1–31) verwendet wird:** Kosten 950.036 €, davon Personal 64 %,
Marketing und Messen 18 %, übrige Fixkosten 13 %, variable Kosten 5 %; der Umsatz von 674.622 € deckt 71 % davon.

**Geprüfte Förderungen und Kredite:**

| Instrument | Konditionen (laut Quelle) | Passt? | Im Plan |
|---|---|---|---|
| **KfW ERP-Gründerkredit StartGeld** | Höchstbetrag laut Handwerksblatt auf 200.000 € erhöht (bei KfW prüfen); ab 3,49 % eff. (Stand 01/2026), bis 10 Jahre, bis 2 Jahre tilgungsfrei, 80 % Haftungsfreistellung für die Hausbank, kein Eigenkapital nötig [Q73] | ja | 125.000 €, 4,0 % |
| **Gründungszuschuss** (§ 93 SGB III) | nur bei ALG-I-Anspruch mit ≥ 150 Tagen Rest; 6 Monate ALG + 300 €, dann 9 Monate 300 €; Ermessensleistung; Tragfähigkeitsbescheinigung nötig [Q72] | nur wenn der Gründer arbeitslos gemeldet ist | 0 € (Option, im Modell als Eingabe vorhanden) |
| **EXIST-Gründungsstipendium** | 2.500 €/Monat für Hochschulabsolventen, 3.000 € Promovierte, bis 12 Monate, Sachmittel bis 10.000 € (Einzel) / 30.000 € (Team); nur für innovative, technologiebasierte Gründungen aus Hochschulen oder Forschungseinrichtungen [Q74] | **eher nicht**: Ladeklar ist eine Anwendungsinnovation; passt nur mit Hochschulanbindung und Mentor | 0 € |
| **Gründerstipendium NRW** | 1.200 €/Monat bis 12 Monate (bis 14.400 € je Gründer), neue Richtlinie ab 01.10.2026 [Q75] | nur bei Sitz in NRW | 0 € |
| Andere Landesprogramme (z. B. Baden-Württemberg, Bayern) | nicht recherchiert | vor Standortwahl prüfen | 0 € |
| BALM-Programm „Umweltschutz und Sicherheit“ | fördert **Kunden** (Güterkraftverkehr mit schweren Nfz) u. a. bei Telematik- und Effizienzlösungen, bis 33.000 € je Antragsteller/Jahr [Q92] | als Vertriebsargument prüfen, keine Förderung für Ladeklar selbst | 0 € |

### 12.7 Sensitivität (Blatt „Sensitivität“, vor Steuern, Fixkosten wie Basisplan)

| Szenario | Kunden M60 | ARR M60 | EBITDA 2029 | EBITDA 2031 | Break-even (Monat) | Finanzbedarf vor Puffer |
|---|---|---|---|---|---|---|
| **Basisplan** | **1.276** | **1.982.530 €** | **4.589 €** | **373.871 €** | **30** | **297.354 €** |
| Churn +50 % | 1.066 | 1.705.531 € | −44.078 € | 182.158 € | 33 | 366.820 € |
| Churn doppelt | 909 | 1.488.933 € | −86.312 € | 29.631 € | 35 | 525.117 € |
| Churn −30 % | 1.437 | 2.187.572 € | 37.436 € | 513.576 € | 27 | 273.610 € |
| Preise −15 % | 1.276 | 1.685.151 € | −89.539 € | 143.207 € | 35 | 485.605 € |
| Preise +10 % | 1.276 | 2.180.783 € | 67.341 € | 527.647 € | 24 | 241.487 € |
| Wachstum −30 % | 893 | 1.388.491 € | −178.578 € | −77.025 € | 57 | 856.932 € |
| Wachstum −50 % | 639 | 992.465 € | −300.688 € | −377.621 € | nicht in 60 Monaten | 1.540.022 € |
| Wachstum +30 % | 1.658 | 2.576.570 € | 187.755 € | 824.766 € | 20 | 171.533 € |
| Pessimistisch (Churn ×1,5, Preis ×0,9, Wachstum ×0,7) | 746 | 1.074.876 € | −253.431 € | −305.457 € | nicht in 60 Monaten | 1.326.497 € |
| Optimistisch (Churn ×0,8, Wachstum ×1,2) | 1.656 | 2.537.919 € | 152.494 € | 783.273 € | 20 | 190.312 € |

**Lesart:** Das Neukundenwachstum ist der wichtigste Hebel, danach der Preis, dann der Churn. Weil die Sensitivität
die Fixkosten unverändert lässt, überzeichnet sie die Wachstumsrisiken: Mit der Einstellungsregel aus Kap. 9
(Einstellungen erst bei ≥ 90 % der MRR-Planlinie) sinkt der Finanzbedarf bei 30 % weniger Wachstum deutlich.
Eine Preissenkung ist teurer als 50 % mehr Churn – Rabatte sind daher kein Wachstumsinstrument.

---

## 13. Risiken und Gegenmaßnahmen

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme |
|---|---|---|---|
| Neukunden wachsen langsamer als geplant | mittel | hoch (Wachstum −30 % → Break-even Monat 57) | Einstellungsregel (Kap. 9), Partnerkanal früh testen, Förder-Check als Türöffner, Kosten je Kanal monatlich messen |
| Fahrer nutzen die App nicht | mittel | hoch | Ein-Knopf-Bedienung, 8 Sprachen, Einladung per WhatsApp, Erfolgsquote je Fahrer im Board, Einführungsschulung per Video in der Muttersprache |
| Betriebsrat oder Fahrer lehnen Privathandy ab | mittel | mittel | keine Dauerortung, Muster-Betriebsvereinbarung, Firmen-Handys/Tablets als Option, PWA ohne Store-Download |
| Churn höher als geplant (Insolvenzen, Saisonbetrieb) | mittel | mittel | Saisonpause (v1.2), Kundenerfolgs-Anrufe in Monat 1 und 3, Jahreszahlung fördern |
| Wettbewerber bietet Gleiches kostenlos (Telematik-Bündel) | mittel | mittel | Schnittstellen statt Konkurrenz (v1.3), White-Label und Einfachheit als Unterschied, Partnerschaften mit Telematik-Händlern |
| Preisdruck | mittel | hoch (Preise −15 % → Finanzbedarf +188.251 €) | keine Listenpreis-Rabatte, Nutzen über ROI-Rechner belegen, Premium-Funktionen ausbauen |
| Abhängigkeit vom Gründer | hoch im Jahr 1 | hoch | Dokumentation, Beirat, früh Vertrieb (Juli 2027) und Entwicklung (Okt. 2027) einstellen, Schlüsselpersonen-Versicherung |
| Technischer Ausfall oder Datenverlust | niedrig | hoch | tägliche Backups, Wiederherstellungstest, Monitoring, Offline-Warteschlange in der App, SLA nur Premium |
| Datenschutzverstoß | niedrig | hoch | AVV, TOM, Mandantentest, Support-Zugriff nur mit Freigabe, externer DSB, Cyber-Versicherung |
| Apple/Google ändern PWA- oder Store-Regeln | niedrig | mittel | Store-App über Capacitor vorbereitet, Push-Fallback per In-App-Mitteilung |
| Finanzierungsrunde verzögert sich | mittel | hoch | Angel-Gespräche ab Q2/2027, KfW-Betrag bis 200.000 € erhöhbar (prüfen), Kostenbremse, sobald die Kasse mehr als 25.000 € unter der Planlinie liegt |

---

## 14. Meilensteine

| Datum | Meilenstein | Messgröße |
|---|---|---|
| Dez. 2026 | Pilotphase abgeschlossen, GmbH gegründet, Marke angemeldet | 5 Piloten, Telefonate −50 % in der Strichliste (Ziel) |
| Jan. 2027 | Verkaufsstart, KfW-Kredit ausgezahlt | 150.000 € auf dem Konto |
| Apr. 2027 | transport logistic, v1.1 (Zwischenstopps, Gastzugänge, CS/BG) | 19 Kunden |
| Juli 2027 | erste Einstellung Vertrieb & Kundenerfolg | 38 Kunden |
| Okt. 2027 | Business-Angel-Runde 200.000 €, Entwickler eingestellt | 65 Kunden |
| Dez. 2027 | Ende Jahr 1 | 86 Kunden, ARR 125.230 € |
| 2028 | Partnerprogramm live, IAA Transportation, v1.3 (eCMR, Schnittstellen) | 300 Kunden, ARR 444.980 € |
| Juni 2029 | erster Monat mit positivem EBITDA | 438 Kunden |
| Dez. 2029 | EBITDA im Gesamtjahr positiv | 595 Kunden, ARR 896.788 € |
| Apr. 2030 | EBITDA dauerhaft positiv | – |
| Dez. 2031 | Ende Jahr 5 | 1.276 Kunden, ARR 1.982.530 €, EBITDA 373.871 € |

---

## 15. Anhang

### 15.1 Aufbau des Finanzmodells (`Ladeklar_Finanzmodell.xlsx`)

| Blatt | Inhalt |
|---|---|
| Annahmen | alle Eingaben, blau auf gelb markiert (Preise, Tarifmix, Neukunden, Churn, Zusatzfahrer, Store-App-Quote, Hosting, Zahlungsgebühren, Gehälter, Marketing, Messen, Miete, Versicherung, Steuern, Finanzierung) |
| Monat 1–36 | Monatsplan Januar 2027 bis Dezember 2029: Kunden je Tarif, MRR, Umsatz, Kosten, EBITDA, Finanzierung, Kasse |
| Monat 37–60 | Fortsetzung Januar 2030 bis Dezember 2031 (gleiche Formeln), Grundlage für Jahr 4 und 5 |
| 5 Jahre | GuV-Übersicht, Steuern mit Verlustvortrag, Kennzahlen (CAC, LTV, Churn) |
| Break-even | EBITDA-Break-even, Kapitalbedarf, Break-even-Kunden |
| Sensitivität | 11 Szenarien zu Churn, Preis und Wachstum, jeweils 60 Monate neu gerechnet |

Alle Ergebnisse sind Formeln. Das Modell wurde mit LibreOffice neu berechnet und auf Fehlerwerte geprüft (keine
#REF!, #DIV/0!, #WERT!); ein Kontrollfeld im Blatt „Sensitivität“ bestätigt, dass der Basisfall mit dem Hauptmodell
übereinstimmt.

### 15.2 Definitionen

- **MRR:** monatlich wiederkehrender Umsatz zu Listenpreisen (Abo + Zusatzfahrer + Store-App-Gebühr).
- **ARR:** MRR × 12 zum Stichtag.
- **ARPA:** MRR je Kunde.
- **Churn:** Anteil der Kunden, die im Monat kündigen.
- **CAC:** (Personal Vertrieb & Marketing + Marketing + Messen + Partnerprovision) / Neukunden.
- **LTV:** ARPA × Deckungsbeitragsmarge / Monats-Churn.
- **EBITDA:** Umsatz − variable Kosten − Fixkosten (vor Zinsen, Steuern, Abschreibungen).

### 15.3 Offene Prüfpunkte vor Bank- oder Investorentermin

1. Primärquellen (BALM, KBA, Destatis) einmal direkt aufrufen und Zahlen bestätigen (`QUELLEN.md`).
2. KfW-Höchstbetrag und aktuellen Zinssatz bei der Hausbank bestätigen.
3. Förderfähigkeit eines Ladeklar-Abos im BALM-Programm „Umweltschutz und Sicherheit“ beim BALM erfragen.
4. Pilotergebnisse (Telefonate vorher/nachher, Aktivierungsquote) in die Unterlagen übernehmen.
5. Rechtsvorlagen anwaltlich prüfen lassen.
