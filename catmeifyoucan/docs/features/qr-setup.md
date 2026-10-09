# Einrichtung per QR-Code · alles am Handy

## Was

Für jeden Einrichtungsschritt gibt es einen **QR-Code**: mit der Handykamera scannen, fertig.

* **Admin-Handy koppeln:** Am Ende von `deploy/kur.sh` (und jederzeit mit `bash deploy/qr.sh`)
  steht ein QR-Code im Terminal. Scannen → die Moderation öffnet sich am Handy, schon angemeldet.
  In der Moderation selbst: „Weiteres Admin-Handy“ und am Desktop „Am Handy öffnen“.
* **Café einrichten:** Das Café scannt einen Einrichtungs-QR mit seinem Kassen-Handy, sieht seinen
  Namen, wählt seine PIN selbst und ist angemeldet. Danach: „Zum Startbildschirm“ und die Karte mit
  dem eigenen QR-Code des Cafés.
* **Freiwillige einladen:** QR-Code für 1, 5 oder 20 Personen. Wer scannt, wählt einen Spitznamen und
  ist danach „Ehrenamt“ (Rolle `volunteer`).
* **Geräte:** Liste aller angemeldeten Admin-Geräte („iPhone · Safari“, zuletzt benutzt, gültig bis)
  mit „Abmelden“ und „Alle anderen Geräte abmelden“.
* **Am Desktop:** Startseite und Spiel (Profil) zeigen ab 900 px Breite eine kleine Karte „Auf dem
  Handy spielen“ mit dem QR-Code der Seite.

## Warum

Die Leute, die das Spiel betreiben, sind am Handy unterwegs – im Café, auf der Straße. Ein langer
Admin-Token, Koordinaten aus Google Maps und eine PIN, die man dem Café diktiert, sind dort mühsam und
unsicher. Ein QR-Code ist schneller, und der Admin-Token muss nie abgetippt, gespeichert oder
verschickt werden.

## So benutzt man es

* **Terminal (Server):** `bash deploy/qr.sh` (Admin, 10 Minuten) · `bash deploy/qr.sh kafe` (Liste
  der Cafés mit ID) · `bash deploy/qr.sh kafe <placeId>` (Café, 7 Tage) · `bash deploy/qr.sh gonullu
  5` (Freiwillige, 7 Tage, 5 Personen). Ohne Docker:
  `node server/setup-qr.js admin|kafe <id>|gonullu <n> [--base https://domain] [--plain] [--json]`.
* **Moderation (`admin.html`):** Reiter **Einrichten** (Standard-Reiter) mit drei Karten: „Ein Café
  einrichten“ (Café wählen → **QR-Code erstellen**, dazu „Tischkarten drucken“ = `print.html?cafe=<id>`
  und „Neues Café anlegen“), „Freiwillige einladen“ (1/5/20) und „Weiteres Admin-Handy“. Jede Karte
  zeigt den QR-Code groß (≥ 240 px, schwarz auf weiß, Ruhezone), die Restzeit (läuft live), **Link
  kopieren**, **Teilen** (Web Share, wo es das gibt) und meldet „Benutzt ✓“, sobald gescannt wurde.
  Darunter **Offene QR-Codes** (mit „Ungültig machen“) und **Geräte**.
* **Neues Café am Handy:** „Cafés & Orte“ → „Neues Partner-Café“ → **Meinen Standort nehmen** (GPS mit
  hoher Genauigkeit, bis 15 s, zeigt ±m) → Name, Belohnung → **Speichern**. Die PIN darf leer bleiben.
  Gleich danach öffnet sich der Einrichtungs-QR für das Café-Handy.
* **Sprache der Moderation:** aus dem Browser bzw. der gemerkten Wahl (`catme.lang`), tr/en/de, sonst
  Englisch; Umschalter oben rechts.
* **Anmelden mit Token** geht weiter. „Dieses Gerät merken“ legt eine eigene Sitzung (30 Tage) in
  `localStorage` ab, sonst eine Sitzung für 12 Stunden in `sessionStorage` (nur dieser Tab). Gespeichert
  wird nie der Admin-Token selbst; ein von früher noch im Tab liegender Admin-Token
  (`catme.admin.token`) wird beim Öffnen gegen eine Sitzung getauscht und gelöscht.
* **Handy verloren?** „Geräte“ → „Alle anderen Geräte abmelden“. Ganz sicher: `ADMIN_TOKEN` in
  `deploy/.env` ändern und `bash deploy/kur.sh` – dann sind alle Geräte abgemeldet und alle offenen
  QR-Codes ungültig.

## Wie es funktioniert

* **Codes** (`server/setup-codes.js`): 18 Zufallsbytes = 144 Bit, base64url (24 Zeichen). Gespeichert
  (Sammlung `setupCodes`, über das Journal, übersteht Neustarts) wird nur `codeHash` = SHA-256 des Codes,
  dazu `purpose`, `expiresAt`, `maxUses`/`uses`, `placeId` (Café), `owner`/`epoch` (siehe unten),
  `createdBy`, `createdAt`, `usedAt`, `revokedAt`, `via` (admin/terminal). Nachschlagen über den Hash (Index), Vergleich zeitkonstant.
  Gültig: admin 10 Minuten/1×, partner 7 Tage/1×, volunteer 7 Tage/1–50×. Ein neuer Café-Code macht
  ältere offene Codes desselben Cafés ungültig.
* **Nur im Fragment:** Links sehen so aus: `admin.html#setup=<code>`, `partner.html#setup=<code>`,
  `app.html#invite=<code>`. Das Fragment schickt der Browser nie an den Server und nie im Referer – der
  Code landet in keinem Protokoll (Caddy, Proxy). Die Seiten lesen es beim Laden und entfernen es sofort
  mit `history.replaceState` aus der Adresszeile. Die Endpunkte lesen den Code nur aus dem JSON-Body;
  `?code=…` wird ignoriert.
* **Besitzer** (`owner`): Jeder Code und jede Admin-Sitzung gehört entweder dem `ADMIN_TOKEN`
  (`master`, dazu `epoch` = scrypt-Fingerabdruck des Tokens, einmal beim Start berechnet – nicht der
  Token und absichtlich langsam zu raten) oder einem Spielerkonto mit Rolle admin (`player:<id>`).
  Geprüft wird bei jeder Benutzung: anderer `ADMIN_TOKEN` → Fingerabdruck passt nicht → alles davon
  Abgeleitete gilt nicht mehr (Notbremse). Spielerkonto nicht mehr admin oder gesperrt → seine Geräte
  und Codes gelten nicht mehr. Ein per QR gekoppeltes Gerät erbt den Besitzer des Codes.
* **Abmelden nimmt Codes mit:** Wird ein Gerät abgemeldet, verfallen die offenen Admin-Codes, die es
  erstellt hat. „Alle anderen Geräte abmelden“ macht zusätzlich alle offenen Admin-Codes ungültig,
  die nicht von diesem Gerät stammen (auch die aus dem Terminal). Café- und Einladungs-Codes bleiben.
* **Einlösen ist atomar:** Prüfen, Verbrauchen und Wirkung laufen in einem synchronen Abschnitt (kein
  `await` dazwischen). Zwei gleichzeitige Versuche → genau einer gewinnt, der andere bekommt
  `409 code_used`. Falsche Eingaben (z. B. eine zu kurze PIN) verbrauchen den Code nicht.
* **Leichte PINs** (`weakPin` in `public/js/qr-kit.js`, Browser und Server gleich): gleiche Ziffern
  (000000), Reihen (123456, 654321, 890123), Wiederholungen (121212, 123123, 12341234) und Paare (112233)
  lehnt die Café-Einrichtung mit `400 weak_pin` ab – das Café wählt eine andere.
* **Ratenbegrenzung:** Einlösen 5/min pro IP (Puffer 10, wie der Café-Login), Prüfen
  (`/api/setup/info`) 20/min pro IP. Einladungen pro Konto 5/min (Puffer 10) und pro IP großzügig
  30/min (Puffer 60) – bei einem Treffen teilen sich viele Freiwillige ein WLAN. Bei `429` versucht
  das Spiel es nach der genannten Wartezeit von selbst noch einmal.
* **Admin-Sitzungen** (Sammlung `adminSessions`): Zufalls-Token (32 Byte), gespeichert nur als SHA-256,
  30 Tage gültig (QR-Kopplung, „Gerät merken“) bzw. 12 Stunden (Token-Login ohne „Gerät merken“), fest
  ab Anlegen, Gerätename aus dem User-Agent, „zuletzt benutzt“ höchstens alle 5 Minuten ins Journal.
  `admin(req)` in `server/app.js` akzeptiert den Master-`ADMIN_TOKEN`, eine gültige Admin-Sitzung (mit
  gültigem Besitzer) oder ein Spielerkonto mit Rolle `admin`. Der Master-Token selbst lässt sich nicht
  widerrufen – ändern (`deploy/.env`) meldet aber alle davon abgeleiteten Geräte ab.
* **Café:** `POST /api/setup/partner` setzt `pinHash` (scrypt, wie bisher `hashPin`), beendet alle
  alten Café-Sitzungen (`revokePartner`) und gibt eine neue Café-Sitzung zurück. Nur für freigegebene,
  aktive Partner. Cafés ohne PIN fehlen in der Anmeldeliste (`/api/partners`); die Moderation sieht
  `hasPin`.
* **Freiwillige:** `POST /api/invites/redeem` (Spieler-Token) setzt `role = volunteer`. Moderation
  bleibt Moderation (und verbraucht keinen Gebrauch), wer schon Freiwillige:r ist, verbraucht auch
  keinen; gesperrte Konten → `403 banned`; über `volunteer` hinaus geht es nie. Im Spiel wird der Code
  in `sessionStorage` (`catme.invite`) über das Onboarding gerettet und gleich nach der Anmeldung (oder
  sofort mit Konto) eingelöst → Hinweis, Rollen-Chip im Profil.
* **Terminal-QR** (`server/setup-qr.js` + `server/terminal-qr.js`, beide im Docker-Image): benutzt
  `public/vendor/qrcode.js` (in einer `vm`-Umgebung), ECC M, Halbblöcke `▀▄█`, Ruhezone 4 Module. Standard
  mit festen Farben (`ESC[30;107m`, schwarz auf hellweiß) – sieht auf dunklen und hellen Terminals gleich
  aus; `--plain`/`NO_COLOR` ohne Farben (helle Module als `█`, auf hellen Terminals invertiert – die
  meisten Kamera-Apps lesen auch das). Das CLI fragt die laufende App über `127.0.0.1:$PORT` mit dem
  `ADMIN_TOKEN` aus der Umgebung (oder `$CATME_DATA/admin-token.txt`); den Token gibt es nie aus. Läuft
  keine App (Verbindung abgelehnt), hängt es den Code nur ans Journal an (`journal.jsonl`, nichts wird
  überschrieben oder verdichtet); die App spielt ihn beim Start ein. `--online` schreibt nie selbst ins
  Journal, sondern wartet bis ~10 s auf die App (sonst Fehler) – so benutzt es `deploy/qr.sh` bei
  laufendem Container (`docker compose exec`). Ist der Container aus, startet `qr.sh` einen
  Wegwerf-Container mit demselben Daten-Volume (`docker compose run --rm --no-deps`): Der Code gilt,
  sobald die App wieder läuft. `deploy/kur.sh` zeigt am Ende den Admin-QR (wenn HTTPS schon geht),
  `deploy/qr.sh` jederzeit.
* **„Auf dem Handy spielen“** (`public/js/qr-kit.js`): QR der aktuellen Seite ohne Fragment und ohne
  Query – außer `?lang` und `?ref` (Sprache und Café-Herkunft kommen mit). Startseite: Karte unten rechts
  in der ersten Ansicht, schließen wird gemerkt (`catme.phoneCard`). Spiel: Karte im Profil. Der
  QR-Erzeuger lädt erst, wenn der Bildschirm breit genug ist.

## API

| Methode | Pfad | Wer | Body → Antwort |
|---|---|---|---|
| POST | `/api/admin/setup-codes` | Moderation | `{purpose: admin\|partner\|volunteer, placeId?, maxUses?}` → `201 {id, code, path, url, purpose, expiresAt, maxUses, uses, placeId, placeName}` (`url` absolut mit `CATME_PUBLIC_URL`) |
| GET | `/api/admin/setup-codes` | Moderation | offene Codes (ohne Code/Hash) |
| GET | `/api/admin/setup-codes/:id` | Moderation | ein Code mit `state: open\|used\|revoked\|expired` (für „Benutzt ✓“ auf der QR-Karte) |
| DELETE | `/api/admin/setup-codes/:id` | Moderation | widerrufen |
| GET | `/api/admin/sessions` | Moderation | `{current, sessions: [{id, label, via, createdAt, lastUsedAt, expiresAt, current}]}` – nie Tokens |
| POST | `/api/admin/sessions` | Moderation | `{remember?}` → neue Sitzung für dieses Gerät (Token-Login; 30 Tage mit `remember: true`, sonst 12 h) → `201 {token, session}` |
| DELETE | `/api/admin/sessions/:id` | Moderation | ein Gerät abmelden |
| POST | `/api/admin/sessions/revoke-others` | Moderation | alle anderen Geräte abmelden (dazu fremde offene Admin-Codes) → `{revoked, revokedCodes}` |
| POST | `/api/admin/logout` | Moderation | eigene Sitzung beenden |
| POST | `/api/setup/info` | öffentlich | `{code, purpose?}` → `{purpose, expiresAt, maxUses, uses, cafe?}` (verbraucht nichts) |
| POST | `/api/setup/admin` | öffentlich | `{code}` → `201 {token, session}` |
| POST | `/api/setup/partner` | öffentlich | `{code, pin}` → `201 {token, partner}` |
| POST | `/api/invites/redeem` | Spieler-Token | `{code}` → `{role, changed, player}` |

Fehler: `400 invalid_code` (unbekannt, widerrufen, falscher Zweck – absichtlich gleich), `409 code_used`,
`410 code_expired`, `400 invalid_pin`, `400 weak_pin`, `400|409 cafe_not_ready`, `403 banned`, `429 rate_limited`.

## Grenzen

* Ein QR-Code ist wie ein Schlüssel: Wer ihn in der Gültigkeitszeit scannt, ist drin. Deshalb kurz
  (10 Minuten für Admin), einmal, im Fragment, widerrufbar – und nur der richtigen Person zeigen.
* Admin-Sitzungen laufen nach 30 Tagen ab (fest, nicht verlängert; ohne „Gerät merken“ nach 12 Stunden);
  dann einfach neu koppeln.
* Die Seite entfernt den Code sofort aus der Adresszeile; je nach Browser kann der Verlauf die erste
  Adresse trotzdem enthalten. Wurde ein Café-Link geöffnet, aber nicht eingelöst, gilt der Code dort
  also noch bis zu 7 Tage – deshalb: einmal, und ein neuer QR macht den alten ungültig.
* Café-Sitzungen bleiben wie bisher im Speicher (12 h, nach Neustart neu anmelden).
* „Zum Startbildschirm“ ist ein Hinweis (iPhone/Android), kein eigener Installations-Dialog.
* Der Standort im Browser braucht HTTPS (oder `localhost`) und die Erlaubnis; die Genauigkeit hängt
  vom Gerät ab (drinnen oft ±20–50 m).
