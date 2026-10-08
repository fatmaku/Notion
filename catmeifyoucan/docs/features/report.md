# Monatsbericht „Straßenkatzen von Kadıköy“ (`report`)

## Was

Eine öffentliche Seite **`/report.html`** mit einem Bericht pro Monat: Wie viele Katzen wurden gesehen,
wie viele davon neu, wie viele Fotos und aktive Spieler:innen, Anteil kastrierter Katzen (Ohrmarke),
gemeldete Zustände (hungrig, krank, verletzt …), Hilfe-Fälle (neu, geholfen, am Monatsende noch offen),
Körper- und Altersverteilung, eine Tabelle je Mahalle, die Datenlage und ein ehrlicher Kasten
„So zählen wir“. Jede Kennzahl steht neben dem Wert des Vormonats. Dazu offene Daten (CSV, GeoJSON,
JSON), Teilen, Link kopieren und Drucken bzw. als PDF speichern (A4).

## Warum

Die ernste Seite des Spiels braucht etwas, das man zitieren und weitergeben kann: Journalist:innen,
Tierschutzvereine und die Stadtverwaltung (Veterinäramt) bekommen eine ruhige, nachvollziehbare
Monatsübersicht statt einer Spiel-Ansicht. Die Methodik steht auf derselben Seite – so bleibt der
Bericht glaubwürdig, auch wenn die Daten aus einem Spiel kommen.

## So benutzt man es

* **Seite:** `report.html` (ohne Monat: letzter abgeschlossener Monat; gibt es dort keine Fotos, der
  laufende Monat). `?month=2026-09` wählt einen Monat, `?lang=tr|en|de|ru|ar|fa` die Sprache
  (wird wie in App und Startseite gemerkt). Oben: Monat zurück/vor oder aus der Liste wählen
  (vom ersten Monat mit Daten bis heute), Sprache rechts im Kopf. Die Adresse merkt sich Monat und
  Sprache – so lässt sich genau dieser Bericht teilen. Ein ungültiger Monat in der Adresse zeigt den
  Standardmonat mit Hinweis.
* **In der App:** Kadıköy-Zahlen → Karte **„Monatsbericht“** direkt unter den Kennzahlen.
* **Teilen:** „Bericht teilen“ (Teilen-Menü des Handys, sonst Link kopieren), „Link kopieren“
  (Zwischenablage, sonst ein Dialog zum Markieren), „Drucken oder als PDF speichern“.
* **Druck:** A4 hochkant, 3–4 Seiten. Bedienung, Sprachwahl und Knöpfe fallen weg, Farben bleiben
  (auch bei dunklem Systemdesign hell), unten steht die Adresse des Berichts. Diagramme werden vor
  dem Drucken in Druckbreite neu gezeichnet; die Mahalle-Tabelle darf über eine Seite laufen
  (Kopfzeile wiederholt sich).
* **Offene Daten:** alle Katzen als CSV/GeoJSON (bestehende Exporte, Positionen auf ~100 m
  gerundet), dieser Bericht als JSON und die Mahalle-Tabelle als CSV (im Browser erzeugt, keine
  Koordinaten).
* **Ohne Server** (statisch gehostet) oder mit `?demo=1`: Die Spiel-Engine rechnet im Browser mit den
  Demo-Daten (wie Startseite und App). Dann steht oben „Demo“ und ein gelber Hinweis; Server-Downloads
  sind ausgeblendet. Ein Server mit `CATME_DEMO=1` zeigt ebenfalls „Demo“. Ohne Netz (offline)
  erscheint „Keine Verbindung“ statt Demo-Zahlen.

## So wird gezählt

* **Zeit:** Monate und Tage in Istanbul-Zeit (`Europe/Istanbul`): 31.08. 21:30 UTC (00:30 vor Ort)
  gehört zum September. Der laufende Monat ist als „läuft noch“ markiert (Zahlen bis heute).
* **Gezählt** werden Fotos, die die Moderation nicht abgelehnt hat und die nicht von gesperrten
  Konten stammen. Zusammengeführte Katzen zählen einmal (als Ziel-Katze).
* **Katzen** = verschiedene Katzen mit mindestens einem Foto im Monat. **Neu** = das erste Foto der
  Katze überhaupt liegt in diesem Monat. **Aktive Spieler:innen** = verschiedene Konten mit Fotos.
* **Kastriert:** Ohrmarke auf irgendeinem Foto bis Monatsende = kastriert; sonst „keine Ohrmarke“,
  wenn die Ohren einmal zu sehen waren; sonst unbekannt. Anteil nur unter Katzen mit bekanntem
  Befund; je Mahalle erst ab 3 geprüften Katzen.
* **Meldungen:** Zustands-Meldungen von Spieler:innen (beim Fang und vom Katzenprofil) im Monat, je
  Zustand; „hungrig“ in der Tabelle = Meldungen „hungrig“ oder „durstig“ (Mahalle des Fotos bzw. der
  letzten Sichtung davor).
* **Hilfe-Fälle:** *neu* = Statuswechsel zu „braucht Hilfe“ (KI-Befund, Meldung, Freiwillige), nur
  wenn er wirklich gegriffen hat (eine Meldung bei einer adoptierten Katze ist kein Fall).
  *Geholfen* = Katzen, die Freiwillige von „braucht Hilfe“/„in Behandlung“ auf „in Behandlung“,
  „draußen, gut“ oder „adoptiert“ gesetzt haben – per Hand oder mit den Hilfe-Knöpfen „Zum Tierarzt
  gebracht“ / „Wieder gut“ (aufgeschlüsselt; „gestorben“ separat und nur, wenn
  es vorkommt). *Offen* = Katzen, die am Monatsende „braucht Hilfe“ hatten – auch ohne neues Foto.
  Der Status zu einem Zeitpunkt kommt aus `statusAt` der Katze bzw. dem Ereignisverlauf.
* **Verteilungen** (Körper, Alter, Gesundheit): je Katze der letzte Befund im Monat; ohne KI-Befund
  (einfache Analyse) zählt der Körper als „nicht beurteilbar“.
* **Datenlage:** Tage mit Fotos, Mahalle mit Fotos, Anteil von der KI beurteilter Katzen und
  sichtbarer Ohren. Mahalle mit weniger als 10 Fotos im Monat = „wenig Daten“ (○), ohne Fotos =
  „noch keine Fotos“.

## API

| Methode | Pfad | Antwort |
|---|---|---|
| GET | `/api/report[?month=YYYY-MM]` | Bericht (JSON). Ungültig, vor `2024-01` oder in der Zukunft → `400 invalid_month` (`details: {min, max}`). `Cache-Control: public, max-age=…` + `ETag` (304) |

Felder: `region`, `month`, `hasData`, `partial`, `throughDay`, `generatedAt`, `demo`, `totals`
(`cats, newCats, observations, players, tnrPct, tnrKnown, tnrTipped, reports, hungryReports,
fedReports, helpOpened, helped, helpOpen, inCare`), `help` (`opened, helped, open, inCare, toCare,
resolved, adopted, died`), `reports` (je Zustand), `bcs`, `ages`, `severity`, `perDay`
(`day, observations, newCats`), `districts` (`id, name, cats, observations, needsHelp, hungry,
tnrKnown, tnrPct, coverage: ok|low|none`), `coverage`, `previous` (`month, hasData, totals`),
`months` (Monate für die Auswahl), `currentMonth`, `method`.

Zwischenspeicher je Monat (`server/report.js`): laufender Monat und Standardmonat 2 Minuten,
abgeschlossene Monate 30 Minuten, höchstens 300 Einträge. Ungültige Monate werden vor dem Rechnen
abgewiesen. Es gibt keinen neuen Schreib-Endpunkt; die Route zählt zur allgemeinen
Ratenbegrenzung der API (600/min pro IP).

| Teil | Datei |
|---|---|
| Berechnung (Server und Browser) | `public/core/report.js` → `engine.report({ month, regionId })`, `engine.defaultReportMonth()` (Anker `report` in `engine.js`) |
| Route + Cache | `server/report.js` (Anker `report` in `server/app.js`) |
| API-Client | `public/js/api.js` → `api.report(month)` (RemoteApi und Browser-Demo) |
| Seite | `public/report.html`, `public/js/report.js`, `public/css/report.css` (+ `.report-teaser` in `app.css`) |
| Link in der App | eine Zeile in `public/js/views/stats.js` |
| Texte | `mr.*` in `public/js/lang/*.js` (6 Sprachen); dazu vorhandene `stats.*`, `share.*`, `brand.maker` |
| Tests | `test/report.test.js` |

## Grenzen

* **Kein vollständiger Zensus:** Gezählt wird, was fotografiert wurde. Viertel mit vielen
  Spieler:innen sehen „besser“ aus; die Datenlage steht deshalb im Bericht.
* **KI-Schätzungen** (Alter, Körper, Gesundheit, Ohrmarke) können falsch sein – auch das steht auf
  der Seite.
* **Datenschutz/Tierschutz:** keine Koordinaten (auch keine gerundeten), keine Karte, keine
  Katzen-IDs oder -Namen, keine Spitznamen, keine Notizen. Feinste Ebene ist die Mahalle.
* **Nachträgliche Änderungen** (Moderation lehnt alte Fotos ab, Katzen werden zusammengeführt)
  ändern auch alte Monate; abgeschlossene Monate sind bis zu 30 Minuten zwischengespeichert.
* **Hilfe-Zahlen** hängen davon ab, dass Freiwillige den Status pflegen. Die Demo-Daten enthalten
  keine Statuswechsel von Freiwilligen – „geholfen“ ist dort 0, und die KI-Hinweise der Demo-Katzen
  liegen meist im laufenden Monat.
* Mahalle-Zuordnung über das nächste Mahalle-Zentrum (wie im Rest des Spiels), nicht über
  offizielle Grenzen.
* Monatsnamen sind gregorianisch (auch auf Persisch), weil die Monate so gezählt werden.
* Die Seite ist nicht Teil der Offline-App-Hülle (Service Worker); offline gibt es keinen Bericht.
* Noch nicht verlinkt: Startseite, Fußzeile, Sitemap und README (andere Teams) – Vorschläge siehe
  Übergabe.
