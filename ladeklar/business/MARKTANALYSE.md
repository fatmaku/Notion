# Ladeklar – Marktanalyse Deutschland

Stand: 16.10.2026 · Version 1.0 · gehört zu: `PLAN.md`, `BUSINESSPLAN.md`, `Ladeklar_Finanzmodell.xlsx`

**Lesehilfe.** Zahlen mit `[Qn]` verweisen auf `QUELLEN.md`. Zahlen mit **(Annahme)** sind eigene Schätzungen
und keine Messwerte. Die Recherche lief über eine Websuche: Primärquellen (BALM, KBA, Destatis) konnten in dieser
Umgebung nicht direkt geöffnet werden, die Werte stammen aus Suchtreffern der Primär- oder Fachpresseseiten.
Vor einer Veröffentlichung oder Bankvorlage prüfen wir jede Zahl einmal an der Originalquelle.

---

## 1. Das Wichtigste in zehn Punkten

1. Rund **46.900 Unternehmen** betreiben in Deutschland gewerblichen Güterkraftverkehr mit Lkw über 3,5 t, dazu
   **45.900 Unternehmen** mit Werkverkehr (Stichtag Oktober 2020, neueste veröffentlichte Strukturerhebung) [Q1][Q2].
2. Die Branche ist kleinteilig: **53 % der gewerblichen Unternehmen fahren mit 1–3 Fahrzeugen**, 30 % mit 4–10,
   16 % mit 11–50, nur 1 % mit mehr als 50 [Q6]. Ein BALM-Sonderbericht nennt rund 57 % mit höchstens 3 Lkw [Q7].
3. Bestand am 01.04.2026: **3,91 Mio. Lkw** (inkl. leichter Lkw/Transporter) und **230.342 Sattelzugmaschinen** [Q9].
4. Der Fahrermangel wächst: Der BGL rechnet mit **120.000 fehlenden Lkw-Fahrern** („120.000 plus X“) [Q18].
5. **30,4 % der sozialversicherungspflichtig beschäftigten Berufskraftfahrer** hatten Ende 2023 keine deutsche
   Staatsangehörigkeit, vor allem aus Polen, Tschechien und Rumänien [Q22]. Das begründet eine mehrsprachige Fahrer-App.
6. Nur **21 % der Fuhrparkbetreiber mit mindestens 5 Fahrzeugen** nutzen Telematik (Dataforce, 2024) [Q29].
7. An der Rampe warten **46 % der Transportunternehmen im Schnitt länger als eine Stunde** [Q35]; Standgeld liegt
   meist bei **30–50 € je Stunde** [Q36], wird aber nur mit Nachweis durchsetzbar.
8. Das Zahlungsziel in Verkehr und Logistik lag im 1. Halbjahr 2026 bei **29,05 Tagen**, bis zum Geldeingang
   vergehen im Schnitt **37,76 Tage** [Q42]. Jeder Tag, den der Lieferschein später im Büro ist, verlängert das.
9. **64 % der Speditionen können offene Stellen in der Disposition nicht besetzen** (DSLV) [Q28]. Disponentenzeit ist knapp.
10. Marktgröße für Ladeklar (eigene Rechnung, Kap. 6): **TAM ca. 140 Mio. € p. a.**, **SAM ca. 92 Mio. € p. a.**,
    **SOM Jahr 5: 1.276 Kunden / 1,98 Mio. € ARR** (Finanzmodell).

---

## 2. Marktstruktur

### 2.1 Unternehmen

| Kennzahl | Wert | Stand | Quelle |
|---|---|---|---|
| Unternehmen gewerblicher Güterkraftverkehr (Lkw > 3,5 t) | 46.902 (+4,1 % ggü. 2015) | Okt. 2020 | [Q1][Q2][Q4] |
| Unternehmen mit Werkverkehr (Lkw > 3,5 t) | 45.929 (+7,9 %) | Okt. 2020 | [Q1][Q5] |
| Unternehmen gesamt (gewerblich und/oder Werkverkehr) | 92.831 | Okt. 2020 | [Q2] |
| Unternehmen WZ 49.41 „Güterbeförderung im Straßenverkehr“ (Umsatzsteuer-/Strukturdaten) | 35.071 | Wägungsbasis 2021 | [Q15] |
| Unternehmen Post-, Kurier- und Expressdienste | ca. 13.700 | Berichtsjahr in Quelle unklar | [Q16] |
| Kraftverkehrsunternehmen in der Verkehrsunternehmensdatei | ca. 68.400 | Sept. 2023 | [Q85] Sekundärangabe, nicht geprüft |

Die BALM-Strukturerhebung („Struktur der Unternehmen des gewerblichen Güterkraftverkehrs und des Werkverkehrs“)
ist eine Stichprobe von rund 10 % der Unternehmen aus der Verkehrsunternehmensdatei, Stichtag letzter Werktag im
Oktober [Q3]. Eine Veröffentlichung nach dem Stichtag 2020 haben wir nicht gefunden; die Erhebung 2025 lief mit
Stichtag 30.10.2025 [Q3]. Die Abweichung zu Destatis (35.071) erklärt sich durch andere Abgrenzungen
(Schwerpunkt-Wirtschaftszweig statt Lkw-Einsatz).

### 2.2 Größenstruktur

| Fahrzeuge je Unternehmen | Anteil gewerbliche Unternehmen | passender Ladeklar-Tarif |
|---|---|---|
| 1–3 | 53 % | Start (3 Fahrer, 6 Fahrzeuge) |
| 4–10 | 30 % | Flotte (15 Fahrer, 40 Fahrzeuge) |
| 11–50 | 16 % | Flotte mit Zusatzfahrern oder Premium |
| über 50 | 1 % | Premium (40 Fahrer + Zusatzfahrer, API) |

Quelle der Anteile: BAG-Strukturbericht, berichtet von eurotransport [Q6]. Die Daten sind älter als die Erhebung
2020; die Grundstruktur bestätigen die Erhebung 2015 („mehr als die Hälfte hat 2–10 Fahrzeuge, nur 856 Unternehmen
mehr als 50“) [Q8] und der BALM-Sonderbericht zum Strukturwandel (rund 57 % mit höchstens 3 Lkw) [Q7].
Seit 2010 schrumpft vor allem die Zahl der Kleinstbetriebe mit bis zu 9 Beschäftigten, während Unternehmen mit
10 und mehr Beschäftigten zulegen [Q8].

### 2.3 Fahrzeuge

| Kennzahl | Wert | Stand | Quelle |
|---|---|---|---|
| Lkw-Bestand (alle Gewichtsklassen, inkl. Transporter N1) | 3.909.284 | 01.04.2026 | [Q9] |
| Sattelzugmaschinen | 230.342 | 01.04.2026 | [Q9] |
| Veränderung Lkw-Bestand ggü. Vorjahr | +1,8 % | 01.01.2026 | [Q10] |
| Lkw und Sattelzugmaschinen im gewerblichen Güterkraftverkehr | 395.428 | Okt. 2020 | [Q2] |
| Anhänger/Auflieger im gewerblichen Güterkraftverkehr | 318.405 | Okt. 2020 | [Q2] |
| Werkverkehrsflotte | 193.009 | Okt. 2020 | [Q5] |
| Fahrleistung Lkw > 3,5 t (deutsche Lkw) | 14,9 Mrd. km (−3,3 %) | 2025 | [Q11] |

Abgeleitet: Im Werkverkehr kommen auf ein Unternehmen im Schnitt **4,2 Fahrzeuge** (193.009 / 45.929), im
gewerblichen Verkehr **8,4 Lkw/SZM** (395.428 / 46.902). Der Durchschnitt wird von wenigen großen Flotten
gezogen; der Median liegt nach Kap. 2.2 bei höchstens 3 Fahrzeugen.

### 2.4 Beschäftigte und Fahrer

| Kennzahl | Wert | Stand | Quelle |
|---|---|---|---|
| Beschäftigte (ausschließlich/überwiegend Güterkraftverkehr) in gewerblichen Unternehmen | 652.557 | Okt. 2020 | [Q2] |
| Beschäftigte WZ 49.41 | 440.632 | Wägungsbasis 2021 | [Q15] |
| Berufskraftfahrerinnen und -fahrer (BA-Statistik) | 559.347 | 2022 | [Q24] |
| Fehlende Lkw-Fahrer (Schätzung BGL) | ca. 120.000 („plus X“), ohne Konjunkturdelle > 140.000 | 2026 | [Q18] |
| Renteneintritte vs. Nachwuchs je Jahr | 30.000–35.000 vs. 15.000–20.000 | 2026 | [Q18] |
| Anteil Fahrer über 55 Jahre | rund ein Drittel | 2026 | [Q18] |
| Unbesetzte Fahrerstellen Europa (IRU) | ca. 502.000, Vakanzquote 13 % | 2025/26 | [Q21] |

Ältere Branchenangaben nannten „mehr als 70.000“ fehlende Fahrer [Q20]; die Zahl steigt seit Jahren.
Gemeinsam mit weiteren Verbänden fordert der BGL seit Januar 2026 eine nationale Strategie gegen den Fahrermangel [Q19].

### 2.5 Umsatz und Transportleistung

| Kennzahl | Wert | Stand | Quelle |
|---|---|---|---|
| Umsatz WZ 49.41 Güterbeförderung im Straßenverkehr | 50,6 Mrd. € | Wägungsbasis 2021 | [Q15] |
| Transportmenge deutscher Lkw | 2.764 Mio. t (−2,8 %) | 2024 | [Q12] |
| Verkehrsleistung deutscher Lkw | 263,6 Mrd. tkm (−1,9 %) | 2024 | [Q12] |
| Verkehrsleistung Straße 2025 | −0,9 % (Schätzung) | 2025 | [Q13][Q14] |
| Prognose Straße 2026 | rund +1 % Menge und Leistung, Treiber Bau (Steine, Erden) | Winter 2025/26 | [Q14] |

Abgeleitet (Näherung, Annahme): 50,6 Mrd. € Umsatz / 395.428 Lkw und SZM ≈ **128.000 € Umsatz je Fahrzeug und Jahr**
(≈ 10.700 € je Monat). Die Werte stammen aus unterschiedlichen Jahren (2021 und 2020) und dienen nur als
Größenordnung für das ROI-Beispiel im Businessplan.

### 2.6 Kurier, Express, Paket (KEP)

| Kennzahl | Wert | Stand | Quelle |
|---|---|---|---|
| Sendungen | 4,37 Mrd. (+1,8 %) | 2025 | [Q17] |
| Umsatz | 28,4 Mrd. € (+2,6 %) | 2025 | [Q17] |
| Beschäftigte | ca. 270.000 | 2025 | [Q17] |
| Prognose Sendungen 2026 | +1,5 bis +2,5 % | 2026 | [Q17] |

Der Bundesverband heißt inzwischen BPEX (früher BIEK). Für Ladeklar relevant sind die vielen kleinen
Kurier- und Expressbetriebe, nicht die Paketkonzerne mit eigener IT. Kosten für Energie, Maut und Personal
steigen laut BPEX stärker als die Umsätze [Q17] – Kurierbetriebe sind preissensibel.

### 2.7 Werkverkehr

45.929 Unternehmen befördern eigene Güter mit eigenen Lkw über 3,5 t (Bauunternehmen, Baustoffhandel,
Getränke- und Lebensmittelhandel, Entsorger, Landwirtschaft) [Q1]. Sie brauchen keine Güterkraftverkehrs-Lizenz,
müssen aber in die Werkverkehrsdatei des BALM eingetragen sein [Q86]. Diese Betriebe haben oft keinen
hauptberuflichen Disponenten: Die Lagerleitung oder der Inhaber disponiert nebenbei. Für sie zählt Einfachheit
mehr als Funktionsumfang.

### 2.8 Lage der Branche 2025/2026

- 2024 schrumpften Transportmenge und -leistung, viele Unternehmen beendeten das Jahr finanziell angeschlagen [Q12].
- Die Insolvenzdichte war 2024 in Verkehr und Logistik mit 14 von 1.000 Unternehmen die höchste aller Branchen [Q45];
  2025 gab es insgesamt 24.064 Unternehmensinsolvenzen (+10,3 %) [Q87].
- Für 2026 erwartet das BALM eine leichte Erholung, getragen vom Bau [Q14].
- Personalkosten steigen weiter: gesetzlicher Mindestlohn 13,90 € (2026) und 14,60 € (2027) [Q77].

Folge für Ladeklar: Kunden geben nur Geld für Werkzeuge aus, die sich sofort rechnen. Der Preis muss klein,
der Nutzen in der ersten Woche sichtbar sein. Insolvenzen erhöhen die Kündigungsquote; das Finanzmodell setzt
deshalb 21–28 % Jahres-Churn an (1,2–3,0 % je Monat je Tarif). Das liegt unter gängigen SMB-SaaS-Benchmarks
von 3–7 % je Monat [Q71], weil Ladeklar täglich im Betrieb genutzt wird (**Annahme**); das Risiko zeigt die
Sensitivität „Churn doppelt“ im Businessplan.

---

## 3. Fahrermangel und Mehrsprachigkeit

| Jahr | Anteil ausländischer Berufskraftfahrer (sv-pflichtig) | Quelle |
|---|---|---|
| 2013 | 9,1 % | [Q27] |
| 2016 | 15,5 % | [Q27] |
| 2019 | ca. 22,8 % | [Q27] |
| 2022 | 28,6 % | [Q23][Q24] |
| Ende 2023 | **30,4 %** (Höchstwert) | [Q22] |

- Herkunft: überwiegend EU-Staaten, vorrangig **Polen, Tschechien und Rumänien** [Q22]; ältere BAG-Berichte nennen
  zusätzlich Ungarn und Bulgarien [Q27].
- Unter allen ausländischen Beschäftigten in Deutschland sind Personen mit **türkischer** Staatsangehörigkeit die
  größte Gruppe, gefolgt von Rumänien (519.200) und Polen (517.711; August 2025) [Q26].
- Im internationalen Straßentransport arbeiten zunehmend Fahrer aus **Belarus, der Ukraine und Moldau** [Q25];
  Russisch ist dort häufig Verkehrssprache (Annahme, aus Praxisgesprächen abzuleiten, nicht statistisch belegt).

**Folgerung für die sieben Sprachen der Fahrer-App (DE, EN, PL, RO, TR, RU, UK):** Polnisch und Rumänisch decken
die beiden größten Herkunftsgruppen ab, Türkisch die größte ausländische Beschäftigtengruppe insgesamt, Russisch und
Ukrainisch Fahrer aus Osteuropa, Englisch dient als Brücke. **Tschechisch fehlt** – Tschechien gehört laut BALM zu den
drei wichtigsten Herkunftsländern [Q22]. Empfehlung: Tschechisch (CS) und Bulgarisch (BG) in v1.1 ergänzen; der
Aufwand ist gering, weil die App fast nur Icons und kurze Texte nutzt.

---

## 4. Digitalisierungsgrad kleiner Transportunternehmen

| Befund | Zahl | Quelle |
|---|---|---|
| Fuhrparkbetreiber (≥ 5 Fahrzeuge) mit Telematik | 21 %; bei ≥ 16 Nutzfahrzeugen ca. 40 % | [Q29] |
| Lkw mit Telematik (wegen Lenkzeit-Pflicht) | mehr als 8 von 10 | [Q30] |
| Unternehmen, die Messenger häufig/sehr häufig für Kommunikation nutzen (alle Branchen) | 61 % | [Q31] |
| Unternehmen, die überwiegend papierlos arbeiten (alle Branchen); Transport und Logistik „muss aufholen“ | 34 % | [Q32] |
| Unternehmen mit Logistikprozessen, denen digitale Frachtpapiere helfen würden | 88 % | [Q33] |
| Logistikunternehmen (ab 20 Beschäftigten), die Digitalisierung als Chance sehen | 91 % | [Q34] |
| Spediteure, denen Zeit und Sachkompetenz für IT und Prozesse fehlen (VVWL-Umfrage, 2017) | mehr als zwei Drittel | [Q91] |

**Einordnung.** Die Zahlen widersprechen sich nur scheinbar: Viele Lkw haben eine Telematik-Box (Tachograph,
Ortung), aber die **Auftragskommunikation** zwischen Disposition und Fahrer läuft trotzdem über Telefon,
WhatsApp, Zettel und Excel. Eine Studie, die genau das für Kleinbetriebe misst, haben wir nicht gefunden.
Unsere Arbeitsannahme (aus Branchengesprächen, **Annahme**): In Betrieben mit bis zu 15 Lkw läuft die
Auftragsübermittlung in der Mehrheit ohne Auftrags-App. Das prüfen wir in der Pilotphase mit einem
Fragebogen bei 50 Betrieben (Kap. 12).

Die eigentlichen Wettbewerber von Ladeklar sind deshalb **Papier, Telefon, WhatsApp und Excel**:
kostenlos, bekannt, sofort verfügbar – aber ohne Zeitstempel, ohne Archiv, ohne Trennung von Privat und
Firma, und mit Datenschutzrisiken bei privaten Messengern auf Fahrerhandys (Einschätzung).

---

## 5. Schmerzpunkte mit Zahlen

| Schmerzpunkt | Zahl | Quelle | Ladeklar-Antwort |
|---|---|---|---|
| Statusanrufe („Wo bist du?“, „Bist du geladen?“) unterbrechen die Disposition | 2 Anrufe je Lieferung à 3 Min. (**Annahme**); keine Studie gefunden, Praxisberichte [Q89] | [Q89] | Push bei jedem Schritt, Live-Board |
| Disposition ist unterbesetzt | 64 % der Speditionen können Dispo-Stellen nicht besetzen | [Q28] | weniger Telefon je Tour, mehr Touren je Disponent |
| Lieferscheine kommen Tage später ins Büro, Rechnung verzögert sich | 4 Tage Verzug (**Annahme**); Zahlungsziel 29,05 Tage, Geldeingang nach 37,76 Tagen (Creditreform, ca. 4 Mio. Rechnungen); 82 % der Firmen von Zahlungsverzug betroffen (Coface 2026); in einer älteren DSLV-Umfrage warteten 78 % der Speditionen 28–40 Tage auf ihr Geld | [Q42][Q43][Q88][Q44] | Foto-Pflicht vor Abschluss, Abliefernachweis als PDF am selben Tag |
| Wartezeit an der Rampe wird nicht bezahlt | 78 % warten > 30 Min., 46 % > 1 Std., ca. 12 % ca. 2 Std.; 62,2 % der Rampenbetreiber informieren Fahrer selten oder nie über die erwartete Wartezeit | [Q35][Q37] | Ankunft erfassen, Standzeit mit Zeitstempel |
| Standgeld ohne Nachweis kaum durchsetzbar | üblich 30–50 €/Std., oft erst nach 2–3 Std.; VBGL: 2 Std. Be- und 2 Std. Entladung frei (Komplettladung 40 t) | [Q36][Q39][Q40] | Standzeit-Bericht je Lieferung |
| Fahrer warten teils sehr lange | 37 % der Fahrer warten manchmal über 3 Std. (Stiftung Truckers Life 2021, Sekundärzitat); 55 % warten oft länger als geplant (Verdi, 200 Fahrer, nicht repräsentativ) | [Q41][Q38] | wie oben |
| Sprachbarriere | 30,4 % ausländische Berufskraftfahrer | [Q22] | 7 Sprachen, Icons statt Text |
| Handy am Steuer | 100 € Bußgeld + 1 Punkt (BKatV Nr. 246.1) | [Q82] | Fahrsperre ab ca. 8 km/h |
| Betriebsrat und Datenschutz bei Ortung | GPS-Ortung ist mitbestimmungspflichtig (§ 87 Abs. 1 Nr. 6 BetrVG; ArbG Kaiserslautern 1 BVGa 5/08); Test mit Echtdaten ohne Information unzulässig (BayLDA) | [Q83] | keine Dauerortung, Standort nur beim Statuswechsel, Muster-Betriebsvereinbarung |
| Kostendruck, Insolvenzen | Insolvenzdichte 14 je 1.000 Unternehmen (höchster Wert) | [Q45] | ab 49 € im Monat, keine Hardware, 30 Tage Test |

---

## 6. Marktgröße: TAM, SAM, SOM

### 6.1 Rechenweg

**Schritt 1 – Unternehmen.** Wir zählen Betriebe, nicht Fahrzeuge, weil Ladeklar je Unternehmen abrechnet.

**Schritt 2 – Wert je Unternehmen.** Wir ordnen jeder Größenklasse (Kap. 2.2) einen Listenpreis zu (**Annahme**):

| Größenklasse | Anteil [Q6] | Preis je Monat (Annahme) | gewichteter Beitrag |
|---|---|---|---|
| 1–3 Fahrzeuge | 53 % | 49 € (Start) | 25,97 € |
| 4–10 Fahrzeuge | 30 % | 129 € (Flotte) | 38,70 € |
| 11–50 Fahrzeuge | 16 % | 250 € (Mix aus Flotte + Zusatzfahrer und Premium) | 40,00 € |
| über 50 Fahrzeuge | 1 % | 479 € (Premium + 30 Zusatzfahrer à 6 €) | 4,79 € |
| **gewichteter Durchschnitt** | | | **109,46 €/Monat = 1.313,52 €/Jahr** |

Wir übertragen diese Verteilung vereinfacht auf Werkverkehr und Kurierbetriebe (**Annahme**).

### 6.2 TAM – gesamter adressierbarer Markt Deutschland

| Baustein | Unternehmen | Quelle |
|---|---|---|
| gewerblicher Güterkraftverkehr | 46.902 | [Q1] |
| Werkverkehr | 45.929 | [Q1] |
| Post-, Kurier- und Expressdienste | 13.700 | [Q16] |
| **Summe** | **106.531** | |

**TAM = 106.531 × 1.313,52 € ≈ 139,9 Mio. € pro Jahr** (gerundet 140 Mio. €).

Plausibilitätsprüfung über Fahrer: 559.347 Berufskraftfahrer [Q24] × 8,60 € (Flotte-Preis je enthaltenem Fahrer,
129 € / 15) × 12 = **57,7 Mio. €**. Das ist eine Untergrenze, weil Kurierfahrer, mitfahrende Inhaber und der
Grundpreis kleiner Betriebe fehlen. Österreich und die Schweiz (DACH) sind im TAM nicht enthalten.

### 6.3 SAM – erreichbarer Markt

Ladeklar zielt auf Betriebe mit **1–50 Fahrzeugen** ohne eigenes TMS-Team. Große Flotten (> 50) haben meist
TMS und Telematik und fallen heraus.

| Baustein | Rechnung | Unternehmen |
|---|---|---|
| gewerblicher Güterkraftverkehr bis 50 Fahrzeuge | 46.902 × 99 % | 46.433 |
| Werkverkehr in Zielbranchen (Bau/Baustoffe, Handel, Entsorgung, Lebensmittel) bis 50 Fahrzeuge | 45.929 × 40 % (**Annahme**) × 99 % | 18.188 |
| unabhängige Kurier- und Expressbetriebe (ohne Paketkonzerne) | 13.700 × 60 % (**Annahme**) | 8.220 |
| **SAM Unternehmen** | | **72.841** |

Preis je Unternehmen ohne die Klasse über 50: (25,97 + 38,70 + 40,00) / 0,99 = **105,73 €/Monat = 1.268,73 €/Jahr**.

**SAM = 72.841 × 1.268,73 € ≈ 92,4 Mio. € pro Jahr.**

### 6.4 SOM – realistisch erreichbar in 5 Jahren (aus dem Finanzmodell)

| | Jahr 1 (2027) | Jahr 2 (2028) | Jahr 3 (2029) | Jahr 4 (2030) | Jahr 5 (2031) |
|---|---|---|---|---|---|
| Kunden zum Jahresende | 86 | 300 | 595 | 922 | 1.276 |
| ARR zum Jahresende | 125.230 € | 444.980 € | 896.788 € | 1.413.271 € | 1.982.530 € |
| Anteil an SAM-Unternehmen | 0,12 % | 0,41 % | 0,82 % | 1,27 % | **1,75 %** |
| Anteil am SAM-Wert | 0,14 % | 0,48 % | 0,97 % | 1,53 % | **2,15 %** |

Ein Marktanteil von unter 2 % nach fünf Jahren ist bewusst vorsichtig. Er setzt keine Marktführerschaft voraus,
sondern rund 55 neue zahlende Kunden je Monat im Jahr 5 (Kap. E im Finanzmodell).

---

## 7. Zielgruppen

### 7.1 Segmente nach Flottengröße

| Segment | Typischer Betrieb | Wer entscheidet | Größter Schmerz | Tarif | Priorität |
|---|---|---|---|---|---|
| A – Kleinst (1–3 Lkw) | Inhaber fährt selbst, Ehepartner macht Büro | Inhaber | Lieferscheine, Rechnungen schreiben am Abend | Start 49 € | mittel (viele, aber preissensibel) |
| **B – Klein (4–15 Lkw)** | Inhaber + 1 Disponentin/Bürokraft | Inhaber | Telefon klingelt ständig, Fahrer verschiedener Sprachen | **Flotte 129 €** | **hoch (Kernzielgruppe)** |
| C – Mittel (16–50 Lkw) | 2–5 Disponenten, oft TMS oder Excel | Geschäftsführung + Dispoleitung | Übersicht über viele Touren, Subunternehmer einbinden | Premium 299 € | hoch (höchster Umsatz je Kunde) |
| D – Groß (> 50 Lkw) | TMS, Telematik, IT-Abteilung | IT/Einkauf | Integration | Premium + API | niedrig (lange Vertriebszyklen) |

### 7.2 Branchen

| Branche | Besonderheiten | Passung Ladeklar v1 | Lücke / Ergänzung |
|---|---|---|---|
| **Stückgut / Verteilerverkehr** | viele Stopps je Tour, Palettentausch (EPAL), feste Stammrouten | Palettentausch, „Wiederholen“, Lieferschein-Foto | **Zwischenstopps/Sammeltouren erst v1.1** – Pflicht für dieses Segment |
| **Baustofflogistik** (Kipper, Kran-Lkw, Werkverkehr Baustoffhandel) | Baustellen ohne Hausnummer, Wiegescheine, Unterschrift des Poliers, Bau trägt 2026 die Erholung [Q14] | Unterschrift auf Display, Foto, Standort bei Statuswechsel | Felder „Abladestelle per Kartenpin“, „Wiegeschein“ als Dokumentart |
| **Kühltransporte** | Temperaturvorgaben, Reklamationen, Nachweispflichten | Temperaturfeld, Fotos, Zeitstempel | kein Temperaturlogger: Ladeklar ergänzt Kühlgeräte-Telematik, ersetzt sie nicht; Schritt „Temperatur ablesen“ als Pflichtfeld |
| **Kurier / Express** | viele kurze Aufträge, Subunternehmer, Transporter < 3,5 t | schnelle Auftragsanlage, offene Aufträge für alle Fahrer | Mehrstopp-Touren und Sendungsverfolgungs-Link für Endkunden (v1.1) |
| **Werkverkehr** (Handel, Entsorgung, Landwirtschaft) | kein Vollzeit-Disponent, Fahrer sind Lager-/Betriebspersonal | 10-Minuten-Einrichtung, Icons | – |

**Startreihenfolge:** Segment B in Stückgut-Nahverkehr und Baustofflogistik zuerst (hoher Telefonanteil,
klare Lieferscheinpflicht, regionale Verbände). Kurier erst mit Mehrstopp-Touren (v1.1).

### 7.3 Personas

- **Inhaber (52), 8 Lkw, Raum Stuttgart.** Fährt bei Engpässen selbst. Entscheidet allein, will keinen Vertrag
  über 24 Monate und keine Einbautermine. Frage: „Was kostet mich das, und merke ich es in der ersten Woche?“
- **Disponentin (38), 12 Lkw, Stückgut.** Führt 60–80 Telefonate am Tag (Annahme), schreibt Touren in Excel,
  sammelt Lieferscheine am Freitag ein. Will ein Board, auf dem sie sieht, was erledigt ist.
- **Fahrer (44), aus Rumänien, seit 6 Jahren in Deutschland.** Nutzt WhatsApp und YouTube, liest ungern lange
  deutsche Texte. Will einen Knopf, nicht zehn Menüs, und keine Dauerüberwachung.

---

## 8. Wettbewerb

### 8.1 Kategorien

1. **Status quo:** Papier, Telefon, WhatsApp, Excel – keine Lizenzkosten, aber versteckte Kosten (ROI-Beispiel im
   Businessplan: ca. 1.244 € je Monat bei 10 Fahrern).
2. **Telematik mit Auftragsmodul:** Webfleet, YellowFox, Fleetboard, SPEDION, Couplink.
3. **App-basierte Auftrags-/Zustell-Tools:** LOGISTIQO, TruckFox, FrachtPilot, international Track-POD und OptimoRoute.
4. **TMS/Speditionssoftware:** Soloplan CarLo, LIS WinSped.
5. **Plattformen und Börsen (Ergänzung, kein Ersatz):** TIMOCOM, Transporeon.
6. **Digitale Speditionen (andere Kategorie):** sennder, Cargonexx – sie vermitteln Ladungen, verkaufen aber keine
   Software für den eigenen Fuhrpark.

### 8.2 Vergleichstabelle

„k. A.“ = keine öffentliche Angabe gefunden. „nicht beworben“ = keine Hinweise auf diese Funktion in den Quellen.

| Anbieter | Kategorie | Kernfunktionen | Preis (öffentlich) | Hardware nötig? | White-Label? | Sprachen Fahrer-App | Quelle |
|---|---|---|---|---|---|---|---|
| **Ladeklar** | Auftrags-App | Aufträge, Status per Knopf, Push, Lieferschein-Foto, Unterschrift, Standzeit, Palettentausch, Fristen, Offline | **49 / 129 / 299 €/Monat**, öffentlich | **nein** (PWA, Firmencode + PIN) | **ja, alle Tarife**; Store-App als Zusatz | **7** (DE, EN, PL, RO, TR, RU, UK) | PLAN.md |
| Papier + Telefon + WhatsApp + Excel | Status quo | Nachrichten, Fotos, Tabellen | 0 € Lizenz | nein | – | jede, aber unstrukturiert | – |
| SPEDION | App-Telematik | Telematik-App (Android), Aufträge, Navigation, Lenk-/Ruhezeiten, Module einzeln buchbar | k. A.; Pay-per-Use: Kombigebühr je bewegtes Fahrzeug, Einrichtungsgebühr, keine Laufzeitbindung | Android-Gerät; keine Box beworben | nicht beworben | k. A. | [Q46] |
| Couplink | Telematik, hardwareunabhängig | Smartmatics-App, Auftragsmanagement, Disposition, Ortung, Workflow-Creator; seit 2000, > 800 Kunden DACH | Starter-Paket mit Ortung kostenlos (Stand älterer Artikel), sonst k. A. | nein (Smartphone) oder vorhandene Telematik | nicht beworben | k. A. | [Q47] |
| Webfleet (Bridgestone) | Telematik | Ortung, Fahrverhalten, Tachograph, Aufträge | ca. 15–35 €/Fahrzeug/Monat (Drittquelle), Tacho-Modul extra, Laufzeit 24–36 Monate | ja (Telematik-Box) | nicht beworben | k. A. | [Q51] |
| YellowFox | Telematik | Ortung, Fuhrparkmanagement, Auftragsmanagement, Trailer-Schnittstelle | Fuhrparkmanagement 0,99 € statt 3,00 €/Fahrzeug/Monat (Aktion bis 31.03.2027); Auftragsmanagement k. A. | ja (für Ortung) | nicht beworben | k. A. | [Q52] |
| Fleetboard (Daimler Truck) | Telematik | herstellerübergreifende Lkw-Telematik, Fahrzeugdaten | k. A. | ja (Fahrzeugtelematik) | nicht beworben | k. A. | [Q53] |
| LOGISTIQO | Cloud-TMS light + App | Touren, Disposition während der Tour, Subunternehmer setzen Status | Admin 125 €, Benutzer 75 €, App/externe Nutzer 1 € je Monat (GetApp/Capterra) | nein | nicht beworben | k. A. | [Q49] |
| TruckFox | Branchen-Software (Luftfrachtzubringer RFS) | Auftragserfassung, Disposition, Abrechnung, Fahrer-App, Kundenportal | k. A. | nein | nicht beworben | k. A. | [Q50] |
| FrachtPilot (FlexFleet Solutions, Münster) | ERP + Tourenplanung für Direktvermarkter/Lieferdienste | Touren auf Karte, Liefer-App offline, Rechnungen, Webshop, REST-API | k. A. | nein | nicht beworben | k. A. | [Q48] |
| Track-POD (international) | ePOD + Routenplanung | Routen, Zustellnachweis mit Foto/Unterschrift, Kundenbenachrichtigung | 49–89 $/Fahrer/Monat (jährlich), min. 3 Fahrer (Drittquelle) | nein | nicht beworben | k. A. | [Q60] |
| OptimoRoute (international) | Routenoptimierung | Routen, Fahrer-App, POD (Pro) | 35,10–44,10 $/Fahrer/Monat (jährlich, Drittquelle) | nein | nicht beworben | k. A. | [Q61] |
| Soloplan CarLo | TMS | Auftrag bis Abrechnung, Telematik- und Börsenanbindung; ca. 1.700–1.800 Kunden | auf Anfrage | nein (On-Premise oder Cloud) | nein | k. A. | [Q58] |
| LIS WinSped | TMS | modulare Speditionssoftware, Cloud-Version | auf Anfrage | nein | nein | k. A. | [Q59] |
| TIMOCOM | Frachtenbörse | Frachten- und Laderaumbörse, Preis-API | individuelle Flatrate, keine Listenpreise | nein | nein | mehrsprachig (Plattform) | [Q54] |
| Transporeon | Plattform der Verlader | Ausschreibung, Zeitfenstermanagement (> 100.000 Slots/Tag) | Enterprise auf Anfrage | nein | nein | k. A. | [Q55] |
| sennder | digitale Spedition | vermittelt Komplettladungen, Netzwerk > 40.000 Lkw | Marge je Ladung | – | – | – | [Q56] |
| Cargonexx | digitale Spedition | Ladungsnetzwerk, tritt als haftender Spediteur auf | Preisdifferenz je Auftrag | – | – | – | [Q57] |

Zu „Tourdriver“ haben wir keine öffentlichen Informationen gefunden. Zur Einordnung der Preise: Fuhrparkmanagement-
Software kostet laut Marktvergleich 5–30 € je Fahrzeug und Monat [Q62]; Telematik mit Auftragsmanagement lag in
einer älteren Spediteursbefragung bei rund 60 € je Fahrzeug und Monat [Q63].

### 8.3 Preisvergleich für einen Betrieb mit 10 Fahrern und 10 Lkw

| Lösung | Monatliche Kosten | Rechnung |
|---|---|---|
| **Ladeklar Flotte** | **129 €** | 15 Fahrer inklusive |
| LOGISTIQO | ca. 135 € | 125 € Admin + 10 × 1 € App |
| Webfleet | ca. 150–350 € + Hardware/Einbau | 10 × 15–35 € |
| OptimoRoute | ca. 351–441 $ | 10 × 35,10–44,10 $ |
| Track-POD | ca. 490–590 $ | 10 × 49–59 $ |
| Telematik mit Auftragsmodul (ältere Befragung) | ca. 600 € | 10 × 60 € |
| Papier + Telefon + WhatsApp | 0 € Lizenz, ca. 1.244 € versteckte Kosten | ROI-Beispiel, Businessplan Kap. 4 |

### 8.4 Positionierung

```
                         viel Funktionsumfang / Integration
                                        ▲
                 TMS (CarLo, WinSped)   │   Telematik-Suiten (Webfleet, Fleetboard, YellowFox)
                                        │
 lange Einführung, ─────────────────────┼───────────────────── schnell startklar,
 Projekt, Vertrag                        │                      keine Hardware
                                        │   LOGISTIQO, Couplink-App, SPEDION-App
                                        │
                                        │           ● LADEKLAR  (10 Minuten, eigene Marke,
                                        │                        7 Sprachen, keine Dauerortung)
                                        ▼
                         wenig, aber genau die nötigen Schritte
```

Kernaussage: **Ladeklar ist das schnellste Werkzeug vom Zettel zur digitalen Tour.** Keine Hardware, kein
Einbautermin, Fahrer starten mit Firmencode und PIN, Bedienung über einen großen Knopf, Fahrer-App in 7 Sprachen,
unter dem Logo des Kunden. Standort nur beim Statuswechsel und nur wenn eingeschaltet – damit auch in Betrieben
mit Betriebsrat einführbar.

---

## 9. SWOT

| Stärken | Schwächen |
|---|---|
| Einführung in 10 Minuten, keine Hardware, PWA ohne Store-Download | Neue Marke ohne Referenzen, Gründer allein im ersten Halbjahr |
| White-Label in allen Tarifen (eigene Marke gegenüber Fahrern und Kunden) | Noch keine Mehrstopp-Touren (v1.1), keine Telematik-Schnittstelle |
| Icons + 7 Sprachen, Fahrsperre, Offline-Warteschlange | Keine Live-Ortung – für manche Kunden ein Nachteil |
| Datenschutz by Design: keine Dauerortung, AVV, Muster-Betriebsvereinbarung | Kein Temperatur-Monitoring, kein Lenkzeit-Modul (v2.0) |
| Öffentliche, niedrige Preise ab 49 € | Niedriger ARPA (ca. 122–130 €) verlangt viele Kunden und effizienten Vertrieb |

| Chancen | Risiken |
|---|---|
| 79 % der Fuhrparks (≥ 5 Fzg.) ohne Telematik [Q29] | Telematik-Anbieter bündeln kostenlose Auftrags-Apps (Couplink-Starter kostenlos [Q47]) |
| Fahrermangel: Betriebe müssen Fahrer halten und mehrsprachig führen [Q18][Q22] | Hohe Insolvenzdichte erhöht Churn [Q45] |
| Disponentenmangel (64 % finden niemanden [Q28]) | Preisdruck: Fuhrparkmodule ab 0,99 €/Fahrzeug [Q52] |
| eCMR und eFTI bringen digitale Frachtpapiere in den Alltag [Q90] | Fahrer verweigern App auf Privathandy (Datenschutz, Akku, Datenvolumen) |
| BALM-Förderprogramm „Umweltschutz und Sicherheit“ (früher De-minimis) fördert u. a. Telematik- und Effizienzlösungen, bis 33.000 € je Antragsteller und Jahr – Förderfähigkeit eines Ladeklar-Abos ist zu prüfen [Q92] | Wettbewerber senken Preise oder kopieren die Einfachheit |
| Verbände (BGL ca. 7.000 Mitgliedsunternehmen [Q67]) und Telematik-Händler als Vertriebspartner | Abhängigkeit von Push-Regeln von Apple/Google (iOS-PWA-Push seit 16.4) |

---

## 10. Lücken im Markt, die Ladeklar schließt

1. **Ein Werkzeug für Betriebe mit 1–15 Lkw, das ohne Projekt startet.** TMS und Telematik-Suiten sind für
   diese Größe zu teuer und zu aufwendig; WhatsApp ist zu chaotisch. Ladeklar füllt die Mitte.
2. **Mehrsprachige Fahrerführung über Icons.** Bei 30,4 % ausländischen Fahrern [Q22] reicht eine deutsche App nicht.
3. **Die eigene Marke.** White-Label kennt man im Telematik-Markt als Händlerangebot, nicht als Funktion für den
   Transportbetrieb mit 8 Lkw. Bei Ladeklar erscheint das Logo des Kunden auf Login, App-Icon und Push.
4. **Betriebsrat- und datenschutzfreundliche Statusmeldung statt Ortung.** Ortung ist mitbestimmungspflichtig [Q83];
   Ladeklar braucht keine Dauerortung und liefert eine Muster-Betriebsvereinbarung mit.
5. **Nachweise, die Geld bringen:** Abliefernachweis am selben Tag (schnellere Rechnung) und Standzeit mit
   Zeitstempel (Standgeld nach § 412 HGB [Q40]).
6. **Transparente Preise.** Bei den meisten Wettbewerbern stehen Preise „auf Anfrage“ (CarLo, WinSped, Fleetboard,
   TIMOCOM, Transporeon). Kleine Betriebe wollen den Preis auf der Website sehen.

---

## 11. Erkenntnisse aus dem Wettbewerb: was Ladeklar übernehmen sollte

| # | Beobachtung | Quelle | Vorschlag für Ladeklar |
|---|---|---|---|
| 1 | Couplink bietet einen **Workflow-Creator** für eigene Abläufe | [Q47] | **Schritt-Bausteine je Auftragsart**: z. B. Kühl = „Temperatur ablesen“ Pflicht, Baustoff = „Wiegeschein-Foto“, Kran = „Abladestelle fotografieren“. Bleibt ein Knopf, nur mit anderen Schritten. |
| 2 | Track-POD, OptimoRoute und FrachtPilot planen **Mehrstopp-Routen** und benachrichtigen Empfänger | [Q60][Q61][Q48] | **Zwischenstopps und Sendungsverfolgungs-Link aus v1.1 vorziehen** – Voraussetzung für Stückgut und Kurier. |
| 3 | SPEDION rechnet **nur bewegte Fahrzeuge** ab | [Q46] | **Saisonpause** (z. B. Bau im Winter: 1–3 Monate zum halben Preis, Daten bleiben) – senkt Churn in saisonalen Branchen. |
| 4 | LOGISTIQO berechnet externe App-Nutzer mit 1 €, Couplink hat ein kostenloses Starter-Paket | [Q49][Q47] | **Kostenlose Gastzugänge für Subunternehmer-Fahrer** (pro Auftrag, ohne Platz im Tarif). Jeder Subunternehmer lernt Ladeklar kennen – eingebauter Vertriebskanal. |
| 5 | Über 80 % der Lkw haben bereits Telematik [Q30]; Transporeon bucht > 100.000 Zeitfenster am Tag [Q55] | [Q30][Q55] | **Schnittstellen statt Konkurrenz:** Telematik-Positionen (Webfleet, YellowFox) optional übernehmen, Zeitfenster-Buchungsnummer erfassen, daraus **Standgeld-Beleg automatisch** erzeugen; eCMR früher angehen. |

Weitere Hinweise: Tschechisch und Bulgarisch als Sprachen ergänzen (Kap. 3); Lenk- und Ruhezeiten (SPEDION-Kernfunktion)
bleiben bewusst draußen, weil Telematik das bereits abdeckt.

---

## 12. Datenlücken und nächste Schritte

| Lücke | Wie wir sie schließen | Bis |
|---|---|---|
| Neuere BALM-Strukturdaten als 2020 | Anfrage beim BALM (Unternehmensstatistik), Ergebnis 2025 abwarten | Q1/2027 |
| Anteil Kleinbetriebe ohne Auftrags-App | Kurzumfrage bei 50 Betrieben über Pilotkunden und Landesverbände | Dez. 2026 |
| Telefonzeit der Disposition | Strichliste bei 5 Pilotbetrieben je 2 Wochen vor und nach Einführung | Jan. 2027 |
| Wettbewerberpreise (SPEDION, Couplink, YellowFox-Auftragsmodul) | Testzugänge und Angebote anfordern | Nov. 2026 |
| Größenverteilung im Werkverkehr und bei Kurieren | Destatis-GENESIS-Abfrage, IHK-Daten | Q1/2027 |
