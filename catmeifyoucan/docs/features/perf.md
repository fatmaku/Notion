# Schnell im Mobilnetz · Kompression, Ansichten bei Bedarf, kleine Schriften

## Was

Startseite und Spiel laden auf schwachem Handynetz (Gäste mit Roaming, volles Café-WLAN) deutlich
schneller und mit viel weniger Daten. Es gibt **keine sichtbare Änderung** und kein anderes
Verhalten – nur weniger Bytes, weniger Anfragen und eine bessere Reihenfolge.

* **Server packt Text:** HTML, JS, CSS, JSON, SVG, Manifest, Markdown und Text ab 1 KB gehen mit
  **brotli** oder **gzip** raus (je nach `Accept-Encoding` des Browsers, mit q-Werten).
* **Spiel lädt Ansichten erst, wenn man sie öffnet** (`import()` je Route). Für „Heute“ holt
  `app.html` alle nötigen Module sofort parallel (`modulepreload`) statt Ebene für Ebene.
* **Lade-Logo ohne Anfrage:** Das Logo im Startbildschirm steht als `data:`-URL in `app.html`.
* **Kleine Türkisch-Schriften:** Für Ğ ğ İ Ş ş lädt der Browser jetzt eine 4-KB-Datei statt der
  ganzen latin-ext-Datei (Unbounded: 118 KB). Die Formen sind pixelgleich.
* **Startseite:** Bilder unterhalb des ersten Bildschirms laden später (`loading="lazy"`), three.js
  (3D-Szene) erst nach dem ersten Bild.

## Warum

Viele Spieler:innen sind Gäste und zahlen für mobile Daten. Bei „Slow 4G“ (1,6 Mbit/s, 150 ms) war
die Startseite über 1 MB groß, die 3D-Szene kam nach 7 s, und „Heute“ war erst nach 3,4 s da.

## Messung (vorher → nachher)

Chromium über Playwright + CDP: 1,6 Mbit/s runter, 750 kbit/s hoch, 150 ms Laufzeit, CPU ×4,
Handy 390 × 844, leerer Cache, Median aus 3 Läufen, Englisch (`/?lang=en`). App = angemeldete
Spielerin, Ansicht „Heute“. „Bereit“ = Startseite: Skript fertig, Knöpfe gehen; App: „Heute“ gezeichnet.

| Seite | Daten | Anfragen | FCP | DOMContentLoaded | load | LCP | bereit | 3D da |
|---|---|---|---|---|---|---|---|---|
| Startseite | 1133 → **317 KB** | 42 → 42 | 1852 → **1236 ms** | 2625 → **1784 ms** | 2707 → **2176 ms** | 1852 → **1236 ms** | 2625 → **1782 ms** | 7379 → **4193 ms** |
| Spiel „Heute“ | 490 → **174 KB** | 43 → **30** | 720 → **664 ms** | 2631 → **937 ms** | 2632 → **1862 ms** | 720 → **664 ms** | 3438 → **1514 ms** | – |
| Startseite, 2. Besuch | 12 → 9 KB | 42 → 42 | 844 → 868 ms | 1762 → 1705 ms | 1832 → 1776 ms | 1260 → 1076 ms | 1761 → 1704 ms | 2980 → 3166 ms |
| Spiel, 2. Besuch | 38 → **13 KB** | 43 → **30** | 200 → 204 ms | 296 → 225 ms | 298 → 229 ms | 200 → 204 ms | 1055 → **754 ms** | – |

Türkisch (`/?lang=tr`): Startseite 1148 → 319 KB, „bereit“ 2614 → 1847 ms, 3D 7910 → 4235 ms;
Spiel 490 → 174 KB, „Heute“ 3506 → 1537 ms. Beim 2. Besuch kommt die 3D-Szene ~0,2 s später, weil
three.js jetzt bewusst erst nach dem ersten Bild startet.

Selbst messen:

```bash
CATME_DEMO=1 CATME_AI=mock PORT=8790 node server.js &
node scripts/perf-measure.js                       # BASE=… RUNS=3 PERF_LANG=en OUT=datei.json
```

## Wie es funktioniert

### Server (`server/compress.js`)

* `pickEncoding(accept)` wählt `br` oder `gzip` (q-Werte, `*`, `x-gzip`, `br;q=0` = nein; bei
  Gleichstand brotli). Kein passendes Verfahren → unverpackt.
* **Statische Dateien** (`server/static.js`): einmal gründlich gepackt (brotli 11 bis 256 KB,
  darüber 9; gzip 9) und im Speicher gehalten – Schlüssel Datei + Änderungszeit + Größe + Verfahren,
  höchstens 64 MB. Gleichzeitige Anfragen teilen sich eine Pack-Arbeit. Ändert sich die Datei, wird
  neu gepackt.
* **Eigener ETag je Verfahren** (`"…-br"`, `"…-gzip"`), `Vary: Accept-Encoding`, 304 auch bei
  schwachen ETags (`W/"…"`, z. B. hinter einem Proxy).
* **Nie gepackt:** Byte-Bereiche (`Range`, z. B. Videos auf iOS – die bekommen wie bisher die rohen
  Bytes), jpg/png/webp/woff2/mp4 und Dateien unter 1 KB oder über 8 MB.
* **Startseite** (`serveLanding`): gepackt je Sprache, `Vary: Accept-Language, Accept-Encoding`,
  Sicherheits-Header bleiben.
* **API** (`sendJson`/`sendText` in `server/http.js`) und **Katzenseiten** `/c/<id>`, `robots.txt`,
  `sitemap.xml` (`server/share.js`): ab 1 KB schnell gepackt (brotli 5 / gzip 6, ~1 ms für 50 KB).

### Spiel (`public/js/app.js`, `public/app.html`)

* `ROUTES` ist gleich geblieben, jede Route lädt ihr Modul über `loadView('<name>')`. Solange
  läuft der bekannte Lade-Kreis. Wechselt man währenddessen die Route, wird die alte nicht mehr
  gezeichnet. Lädt ein Modul nicht (kein Netz), kommt „Keine Verbindung“ mit „Nochmal“; ist das Netz
  wieder da, lädt „Nochmal“ die Seite neu (Chrome merkt sich fehlgeschlagene Module bis dahin).
* Leaflet (Karte) lädt nur in Karte und Katzenprofil, TF.js/AR nur in der Kamera – wie bisher.
* `/api/config` wird parallel zur Server-Prüfung `/api/health` geholt (eine Wartezeit weniger).
* `app.html`: `modulepreload` für alle Module von „Heute“, danach der Preload der Überschrift-Schrift
  (Unbounded latin). Die Reihenfolge ist gemessen: Schrift **vor** den Modulen kostet ~250 ms.
* Bilder in Listen (Profil, Katzenprofil) mit `loading="lazy" decoding="async"`.
* Service Worker: `VERSION` → `catme-v3`. Alle Ansichten bleiben in der Liste, die App geht also auch
  ohne Netz auf jede Seite.

### Schriften (`public/css/fonts.css`)

Drei zusätzliche `@font-face`-Regeln am Ende (Unbounded, Manrope, Vazirmatn) mit
`unicode-range: U+011E-011F,U+0130,U+015E-015F`. Weil sie hinter den latin-ext-Regeln stehen, gelten
sie für diese Zeichen zuerst. Alle anderen Zeichen kommen wie bisher aus den großen Dateien.
Erzeugt mit `scripts/fonts-tr-subset.py` (fonttools, alle Achsen und OpenType-Funktionen bleiben;
SIL OFL erlaubt das, die Schriften haben keinen reservierten Namen). Geprüft: alle Stärken 200–900
pixelgleich.

### Startseite (`public/index.html`, `public/site/site.js`)

* 15 Bilder unterhalb des ersten Bildschirms: `loading="lazy" decoding="async"`.
* `setupHero()`: `await afterFirstPaint()` vor `import('./hero3d.js')`. Das Standbild/der Sternenhimmel
  verhält sich wie vorher.

## API für andere Teile

* Neue Routen können ihr Modul auch erst bei Bedarf laden:
  `[/^\/x$/, 'tab', async (v, app) => (await loadView(() => import('./views/x.js'))).renderX(v, app)]`
* Server: neue Antworten über `sendJson`/`sendText` werden automatisch gepackt. Eigene fertige
  Antworten: `sendBody(req, res, status, body, headers, { etag })` aus `server/compress.js`.
* Lade-Logo nach Änderung an `icons/logo.svg` neu erzeugen: `node scripts/boot-logo.js`
  (`test/perf.test.js` prüft, dass beide gleich sind).

## Grenzen

* Der Server spricht HTTP/1.1 (6 Verbindungen je Seite). Hinter nginx/Caddy mit HTTP/2 wird es noch
  schneller; packt der Proxy selbst, schadet das doppelte Angebot nicht (er sieht `Content-Encoding`).
* Dateien haben keine Hash-Namen, deshalb `Cache-Control: no-cache` (bei jedem Besuch eine kurze
  Rückfrage, Antwort meist 304). Dauerhaftes Zwischenspeichern bräuchte einen Build-Schritt.
* Alle 6 Sprachdateien laden mit (gepackt ~42 KB), damit der Sprachwechsel sofort geht.
* Die Sprachauswahl zeigt „Русский“ – dafür lädt der Browser auch auf Englisch die kyrillische
  Manrope (15 KB).
* Der Service Worker lädt nach dem ersten Besuch die übrigen Ansichten und Leaflet für „offline“ im
  Hintergrund nach: jetzt ~100 KB (gepackt), vorher ~330 KB. Die Messung oben zählt nur die Seite selbst.
