# Katzenseiten mit Link-Vorschau (`share`)

## Was

Jede Katze hat eine eigene öffentliche Seite: **`/c/<katzen-id>`**. Sie sieht aus wie eine
Sammelkarte (Foto oder gezeichneter Avatar, Name, Seltenheit, Typ, Mahalle, wie oft gesehen,
zuletzt gesehen, wer sie zuerst gefunden hat, Status) und erscheint beim Teilen in WhatsApp,
Instagram, X und Telegram mit Bild, Titel („Duman ile tanış“ / „Meet Duman“) und Beschreibung.

Dazu: **`/robots.txt`** und **`/sitemap.xml`** (Startseite, App, alle benannten echten Katzen).

## Warum

Das ist die wichtigste Viral-Schleife: Wer eine Katze findet, teilt ihren Link – Freund:innen
sehen eine schöne Vorschau, öffnen die Seite und kommen mit einem Tipp ins Spiel
(„Jetzt spielen – finde Duman“). Gleichzeitig können Katzenfreund:innen und Freiwillige eine
bestimmte Katze verlinken (z. B. „Wer hat Bulut gesehen?“).

## So benutzt man es

* **In der App:** Katzenprofil → „Teilen“ teilt wie bisher das Kartenbild, jetzt mit dem Link im
  Text. Ohne Bild-Teilen (Desktop) wird der Link geteilt; ganz ohne Teilen-Menü wird das Bild
  gespeichert und der Text mit Link kopiert. Neu: **„Link kopieren“** (Zwischenablage, sonst
  ein Dialog mit dem Link zum Markieren). Auch die Karte direkt nach dem Fang teilt den Link mit.
  Der Link enthält die Sprache der App (`?lang=tr`), damit Vorschau und Seite zur Nachricht passen.
* **Auf der Seite:** „Jetzt spielen – finde {Name}“ öffnet `/app.html#/cat/<id>` (nach dem
  Spitznamen landet man direkt bei der Katze), „Was ist Cat Me If You Can?“ führt zur Startseite.
  Mit JavaScript gibt es zusätzlich „Teilen“ und „Link kopieren“ (`js/catpage.js`). Die
  Sprachwahl oben rechts funktioniert ohne JavaScript (`<details>`) und wird für App und
  Startseite gemerkt.
* **Status:** braucht Hilfe → ruhiger Hinweis „Freiwillige wissen Bescheid“ (+ Link zum
  Hilfe-Leitfaden, falls vorhanden); in Behandlung / adoptiert → Hinweis, Knopf „Katzen in
  Kadıköy finden“ statt „finde {Name}“; lange nicht gesehen → „Hast du {Name} gesehen?“;
  verstorben → ruhige „In Erinnerung“-Seite ohne Spielaufforderung. Unbekannt/entfernt → 404-Seite.
  Zusammengeführte Katzen leiten mit 301 auf die Ziel-Katze um.

## Technik

| Teil | Datei |
|---|---|
| Öffentliche Daten (Engine, auch im Browser-Demo) | `public/core/share.js` → `engine.publicCatPage(id)`, `engine.sitemapCats()` |
| HTML, Meta-Tags, robots/sitemap, HTTP | `server/share.js` (`createSharePages`, `renderCatPage`, `translator`) |
| Einbindung | `server/app.js` (Anker `share` + eine Zeile in `handle()`), `public/core/engine.js` |
| Aussehen | `public/css/catpage.css` (Marke: Navy/Orange/Creme, Unbounded/Manrope/Vazirmatn) |
| Teilen/Kopieren auf der Seite | `public/js/catpage.js` (eigenes Modul, CSP `script-src 'self'`) |
| App | `public/js/share.js` (`shareCat(cat, a, {url})`, `copyLink`, `shareMessage`), `api.catPageUrl(id, lang)` |
| Texte | `cp.*` und `share.copy*` in `public/js/lang/*.js` (6 Sprachen) |

* **Sprache:** `?lang=` → `Accept-Language` → Englisch (`pickSiteLang`). `<html lang dir>`,
  `Content-Language`, `Vary: Accept-Language`, `hreflang`-Alternativen und `x-default`.
* **Absolute Adressen** (og:image, og:url, Sitemap): `CATME_PUBLIC_URL` (createApp `publicUrl`).
  Sonst aus der `Host`-Kopfzeile, aber nur wenn sie `^[a-z0-9.-]+(:\d+)?$` entspricht;
  `X-Forwarded-Proto` nur mit `TRUST_PROXY > 0`. Sonst relativ.
* **Vorschaubild:** Ausschnitt-Foto `/photos/<id>_c.jpg` (Breite/Höhe aus dem JPEG-Kopf), sonst
  `media/og-<lang>.png` (1200 × 630). Nie das ganze Foto.
* **Cache:** `Cache-Control: public, max-age=300` + ETag (304). 404: `no-cache`.
* **Suchmaschinen:** Demo-Katzen und unbenannte Katzen haben `noindex` und stehen nicht in der
  Sitemap. `robots.txt` erlaubt alles und nennt die Sitemap (nur mit absoluter Adresse).
  Bitte keine statische `public/robots.txt` oder `public/sitemap.xml` anlegen – der Server erzeugt beide.
* **Hilfe-Leitfaden:** `CATME_HELP_GUIDE_URL` (oder createApp `helpGuideUrl`). Ohne Angabe wird
  `public/help.html`, `hilfe.html` oder `guide.html` automatisch verlinkt, sobald es sie gibt.

## API

| Methode | Pfad | Antwort |
|---|---|---|
| GET/HEAD | `/c/:catId[?lang=tr\|en\|de\|ru\|ar\|fa]` | HTML-Seite (200), 301 bei Zusammenführung, 404-Seite |
| GET | `/sitemap.xml` | XML-Sitemap |
| GET | `/robots.txt` | Text |

Seiten zählen zur gleichen Ratenbegrenzung wie die API (600/min pro IP). Es gibt keine neuen
Schreib-Endpunkte.

## Grenzen

* **Datenschutz/Tierschutz:** keine Koordinaten (auch keine gerundeten), keine Karte, keine
  einzelnen Sichtungen, keine Notizen. Nur Spitznamen wie in der Rangliste; gesperrte Konten nie.
* Die Seite zeigt den Stand von höchstens 5 Minuten (Cache). Vorschauen in WhatsApp & Co.
  werden von den Diensten selbst länger zwischengespeichert.
* Für Katzen ohne Foto ist das Vorschaubild das allgemeine Bild der Sprache (kein eigenes Bild
  pro Katze – dafür bräuchte der Server eine Bildbibliothek).
* Im reinen Browser-Demo (`/app.html?demo=1`) gibt es keinen Link: die Katzen existieren nur auf
  diesem Gerät. „Link kopieren“ ist dort ausgeblendet, „Teilen“ teilt nur das Bild.
* Die Seite selbst ist nicht offline verfügbar (kein Teil der App-Hülle im Service Worker).
