# Katzen-Spaziergänge (`routes`, „Kedi rotaları“)

## Was

Vier kuratierte Spaziergänge durch Kadıköy, die – wenn möglich – an einem Partner-Café enden:

| id | Name (en) | Start → Ziel | ca. |
|---|---|---|---|
| `moda-coast` | Moda by the sea | Fähranleger → Ufer → Moda-Park → Moda Caddesi | 2,5 km |
| `yeldegirmeni` | Yeldeğirmeni: wall art & cats | Fähranleger → Rıhtım → Yeldeğirmeni | 1,3 km |
| `carsi-bahariye` | Market streets & Bahariye | Fähranleger → Çarşı → Altıyol (Stier) → Süreyya-Oper | 1,1 km |
| `kalamis-fenerbahce` | Kalamış & Fenerbahçe Park | Yoğurtçu-Park → Kalamış → Yachthafen → Fenerbahçe-Park | 2,5 km |

Zu jedem Weg gibt es live: Katzen, die in den letzten 7 Tagen nahe am Weg gesehen wurden, wie
viele davon Hilfe brauchen, Partner-Cafés am Weg (mit Rabatt), „Jetzt der beste Weg“ und – für
angemeldete Spieler:innen – „Heute hier gefunden: N Katzen“.

## Warum

Viele Gäste wissen nicht, wo sie in Kadıköy anfangen sollen. Ein Weg mit Länge, Dauer und
Café am Ende macht aus dem Spiel einen Spaziergang: Gäste entdecken das Viertel, Cafés bekommen
Besuch am Ende des Wegs, und mehr Fotos entlang der Wege machen die Katzenzählung dichter.

## So benutzt man es

* **Einstieg:** Karte „Katzen-Spaziergänge“ auf *Heute* (unter dem Hilfe-Hinweis) und Knopf
  „Katzen-Spaziergänge“ unten auf der *Karte*. Direkt: `app.html#/routes`, ein Weg:
  `app.html#/routes/moda-coast` (nach dem Spitznamen landet man direkt dort).
* **Liste `#/routes`:** pro Weg Name, km, Minuten, kurze Geschichte, Katzen diese Woche, Hilfe
  (Link zum Hilfe-Radar), Café am Ende bzw. unterwegs mit Rabatt, Start → Ziel. Der beste Weg
  steht oben (orange umrandet). Darunter die Regeln („Nur Fotos, kein Blitz“ …).
* **„Spaziergang starten“** öffnet die Karten-App des Handys (Google Maps, Fußweg) mit Start,
  bis zu 3 Zwischenpunkten und dem Ziel. Liegt ein Partner-Café ≤ 400 m vom Ziel, ist das Café
  das Ziel (das Wegziel bleibt Zwischenpunkt, wenn es > 150 m entfernt ist).
* **„Auf der Karte zeigen“ `#/routes/<id>`:** Leaflet-Karte mit gestrichelter Linie („ungefähr
  hier lang“), Start 🚶 und Ziel 🏁, Partner-Cafés ☕, weiche orange Flecken für Sichtungen
  (gerundet), der eigene Standort (falls erlaubt). Dazu Zahlen, Cafés mit Rabatt, Katzen der
  Woche (Bild + Name → Katzenprofil) und die Regeln.
* **Neuer Weg:** Eintrag in `public/config/routes.js` (`WALKS`) – kein Code. `test/routes.test.js`
  prüft ihn automatisch.

## Rechnung

* Länge = Summe der Haversine-Abschnitte (`core/geo.js`) × **1,2** (Straßen sind nicht gerade).
* Dauer = Länge bei **4 km/h** + **5 min** pro Zwischenstopp, aufgerundet auf 5 Minuten.
* Katzen am Weg: Sichtungen der letzten **7 Tage** (ohne abgelehnte, entfernte, zusammengeführte
  Katzen), deren **gerundete** Position (3 Nachkommastellen, wie die öffentliche Karte) höchstens
  **200 m** von der Linie liegt. Jede Katze zählt einmal; „braucht Hilfe“ = aktueller Status.
* Cafés: freigegebene, aktive Partner-Cafés ≤ **250 m** von der Linie oder ≤ 400 m vom Ziel.
* Bester Weg: höchste Dichte (Katzen pro km), Sichtungen der letzten 2 Tage zählen doppelt.
  Ohne Sichtungen gibt es keinen besten Weg; dann gilt die Reihenfolge aus der Konfiguration.
* „Deine Katzen heute“: verschiedene, gezählte eigene Funde des heutigen Spieltags ≤ 200 m vom
  Weg (eigene genaue Positionen, ausgegeben wird nur die Zahl).

Alle Werte stehen in `WALK_RULES` (`public/config/routes.js`).

## API

| Methode | Pfad | Antwort |
|---|---|---|
| GET | `/api/routes` | `{ days, generatedAt, best, routes: [Weg] }` – bester Weg zuerst |
| GET | `/api/routes/:id` | `Weg` + `heat: [[lat, lon, n]]` (gerundet, ≤ 300 m vom Weg) + `catList` (≤ 12 Katzen, ohne Koordinaten) + `days`, `generatedAt` |

`Weg` = `{ id, regionId, icon, name, story, start, finish` (je 6 Sprachen)`, waypoints, distanceM,
durationMin, stops, cats, needHelp, density, cafes: [{ id, name, address, hours, lat, lon, reward,
demo, distM, endM }], cafeAtEnd, mapsUrl, mine: { today } | null, best }`.

* Öffentlich lesbar, nur `GET` (allgemeine API-Ratenbegrenzung). Mit `Authorization: Bearer` gibt
  es `mine`; ein falsches oder gesperrtes Token ergibt einfach `mine: null` (kein 401).
* Unbekannte oder ungültige id (`^[a-z0-9][a-z0-9-]{1,39}$`) → `404 route_not_found`.
* Browser-Demo (`app.html?demo=1`): dieselbe Engine (`engine.walkRoutes()`, `engine.walkRoute(id)`).

## Tierschutz und Datenschutz

* Antworten enthalten **nie** genaue Katzen- oder Spieler-Koordinaten: Sichtungen werden vor jeder
  Rechnung gerundet (~100 m); ausgegeben werden nur Zahlen, gerundete Flecken und öffentliche Orte
  (Wegpunkte, Partner-Cafés). Keine Spieler- oder Sichtungs-IDs. Nur Ausschnitt-Fotos.
* Wegpunkte liegen an bekannten öffentlichen Orten (Anleger, Plätze, Parks, Hauptstraßen) – nie an
  Futterstellen oder Höfen.

## Grenzen

* Die Wegpunkte sind aus Ortskenntnis gewählt (± 100 m), nicht vermessen. Die Linie in der App ist
  nur „ungefähr“; die echte Wegführung macht Google Maps. Vor dem echten Betrieb einmal ablaufen
  oder mit OpenStreetMap abgleichen.
* Google Maps nimmt auf dem Handy höchstens 3 Zwischenpunkte – daher 3–5 Wegpunkte pro Weg.
* Ohne Google Maps (z. B. nur Apple Karten) öffnet sich die Google-Maps-Webseite.
* Die Zählung rechnet bei jeder Anfrage über alle Sichtungen (reicht für einige tausend Katzen;
  für mehr Last: Ergebnis kurz zwischenspeichern).
* Wege gibt es nur für Kadıköy (`regionId: 'kadikoy'`); ein neuer Stadtteil braucht eigene Einträge.

## Dateien

| Teil | Datei |
|---|---|
| Wege + Regeln | `public/config/routes.js` |
| Rechnung, Karten-Link, Prüfung, Engine-API | `public/core/routes.js` (`routesApi`, `validateWalk`, `mapsUrl`, …) |
| Server | `server/app.js` (Anker `routes`) |
| Ansicht | `public/js/views/routes.js` (`renderRoutes`, `renderRoute`), CSS im Anker `routes` in `public/css/app.css` |
| Einstiege | `public/js/views/home.js` (Karte), `public/js/map.js` (Knopf) |
| Texte | `routes.*`, `err.route_not_found` in `public/js/lang/*.js` |
| Tests | `test/routes.test.js` |
