# Café-QR · Empfehlungscode, Zuordnung, Zahlen fürs Café, Druckvorlagen

## Was

Jedes Partner-Café bekommt einen eigenen, öffentlichen **Empfehlungscode** (`refCode`, 6 Zeichen
ohne verwechselbare Zeichen, z. B. `EGSWCM`) und damit einen eigenen QR-Code:
`https://<adresse>/?ref=EGSWCM`. Wer den Code am Tisch scannt und danach ein Konto anlegt, wird
diesem Café zugeordnet. Das Café sieht in seiner Ansicht, wie viele Gäste über seinen QR-Code kamen,
wie viele davon das Tagesziel geschafft haben und wie viele Gutscheine bei ihm eingelöst wurden.
Für den Tisch gibt es fertige Druckvorlagen: **Tischkarte** (A6, 2 Stück je A4), **runde Sticker**
(8 cm, 6 Stück je A4) und ein **Poster** (A4) – Türkisch + Englisch, auf Wunsch mit einer dritten
Sprache (Deutsch, Russisch, Arabisch, Persisch; Arabisch/Persisch von rechts nach links).

## Warum

Cafés sind der beste Vertriebsweg: Dort sitzen Gäste mit Zeit und Handy, und das Café hat selbst
etwas davon (neue Gäste, Gutscheine). Mit eigenen Zahlen sieht ein Café, dass sich das Mitmachen
lohnt – und die Moderation sieht, welche Partner wirklich Spieler:innen bringen.

## So benutzt man es

* **Neues Café:** richtet sein Kassen-Handy per Einrichtungs-QR ein und wählt die PIN selbst; danach
  erscheint gleich die Karte unten (siehe [qr-setup.md](qr-setup.md)).
* **Café:** `partner.html` → Café wählen, PIN eingeben → unten die Karte **„Dein QR-Code“**:
  QR-Code, Link (kopieren), QR als Bild speichern (PNG, z. B. für Instagram), **Tischkarten drucken**
  und die Zahlen, jeweils gesamt und letzte 30 Tage: über den QR-Code gekommen, davon Tagesziel
  geschafft, hier eingelöste Gutscheine.
* **Drucken:** `print.html?cafe=<placeId>` (vom Knopf in der Café-Ansicht oder aus der Moderation).
  Oben Format und Zusatzsprache wählen, dann **Drucken**. Auf A4 mit **100 %** drucken (nicht „an
  Seite anpassen“), am besten auf dickem Papier.
  * Tischkarte: am senkrechten Strich (✂) schneiden, in der Mitte falten, aufstellen. Vorderseite:
    Logo, „Cat me if you can.“, das echte Angebot des Cafés (z. B. „15 verschiedene Katzen an einem
    Tag = 25 % Rabatt hier“), QR-Code, „Scannen und im Browser spielen“. Rückseite: 4 Regeln für
    einen freundlichen Umgang mit den Katzen und die Macher-Zeile.
  * Sticker: 6 Kreise à 80 mm – auf Sticker-Papier drucken und ausschneiden.
  * Poster: für Tür oder Fenster, mit Erklärung, Angebot, großem QR-Code und Regeln.
  * Ohne Café (`print.html`): allgemeine Version, QR-Code zur Startseite, Angebot „20 = 20 % in
    Partner-Cafés“. Über die Auswahl „Café“ lässt sich jedes freigegebene Café wählen.
  * Ist die Seite nur unter einer lokalen Adresse erreichbar (localhost, 192.168.…), warnt sie:
    Dann `CATME_PUBLIC_URL=https://…` setzen – der QR-Code nutzt diese Adresse.
* **Gast:** scannt den QR-Code → Startseite → „Jetzt spielen“. Im Spiel steht vor dem Spitznamen ein
  kurzer Gruß: „Willkommen! Mırmır Kafe sagt Hallo. 20 verschiedene Katzen an einem Tag = 20 % Rabatt
  dort.“ (echtes Angebot des Cafés, in der Sprache des Gasts). So sieht der Gast, dass der Scan
  geklappt hat und wo der Rabatt gilt.
* **Moderation:** `admin.html` → „Cafés & Orte“: bei jedem Café Code, „über QR“ gesamt (30 Tage),
  Tagesziel und ein Link zur Druckvorlage.
* **Demo:** Mit `CATME_DEMO=1` gibt es Demo-Cafés (PIN `246810`); die Demo-Spieler:innen „kamen“
  über die Demo-Cafés, damit die Zahlen nicht leer sind. `print.html?demo=1` (oder statisch gehostet)
  läuft ganz im Browser mit den Demo-Cafés.

## Wie es funktioniert

1. Aufruf von `/`, `/index.html` oder `/app.html` mit `?ref=<code>`: Gehört der Code zu einem
   **freigegebenen, aktiven** Partner-Café, setzt der Server das Cookie
   `catme_ref=<code>; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly` (+ `Secure` bei HTTPS, auch
   hinter einem Proxy mit `TRUST_PROXY` und `X-Forwarded-Proto: https`). Gibt es schon ein gültiges
   Cookie, bleibt es (erster Kontakt zählt). Sonst passiert nichts – die Seite selbst ist unverändert.
2. `POST /api/players` liest das Cookie, speichert `player.referral = { placeId, at }` (nur wenn
   noch keins da ist, nie überschrieben) und löscht das Cookie (`Max-Age=0`).
3. Gespeichert wird nur Café-ID und Zeitpunkt – **keine IP**, kein weiteres Tracking. Die Herkunft
   ist nicht öffentlich (nicht in `publicPlayer`), das Café sieht nur Summen.

Code: `public/core/cafe.js` (Engine: Code, Zuordnung, Zahlen, Druckdaten), `server/cafe.js`
(Cookie, Endpunkte), `public/js/views/cafe.js` (Karte in der Café-Ansicht, Gruß im Onboarding – eine
Zeile in `js/app.js` –, Helfer für Moderation und Druck), `public/print.html` + `public/js/print.js` + `public/css/print.css` (Druckvorlagen), Texte in
`public/js/lang/*.js` (`cafe.*`, `print.*`).

## API

| Methode | Pfad | Wer | Antwort |
|---|---|---|---|
| GET | `/api/partner/stats` | Café-Sitzung (Bearer aus `/api/partner/login`) | `{placeId, name, refCode, days: 30, players: {total, recent}, reachedGoal: {total, recent}, redeemed: {total, recent}, reward: {minCats, discountPct}, publicUrl}` |
| GET | `/api/cafe/kit?cafe=<placeId>` | öffentlich | `{dailyGoal, discountPct, cafe: {id, name, address, refCode, minCats, discountPct, demo} \| null, publicUrl}` – 404 für unbekannte, nicht freigegebene oder pausierte Cafés |
| GET | `/api/cafe/ref?code=<code>` | öffentlich | `{cafe: {id, name, address, minCats, discountPct} \| null}` – ohne `code` aus dem eigenen Cookie (Gruß im Onboarding, `api.cafeWelcome()`) |
| GET | `/api/admin/cafe/referrals` | Moderation | `{<placeId>: {placeId, live, refCode, players, reachedGoal, redeemed}}` |

Außerdem: `POST /api/admin/places` gibt bei Partnern den `refCode` mit zurück.
„Tagesziel geschafft“ = Tagesziel-XP bekommen **oder** einen Gutschein geholt (bei Cafés mit
kleinerer Schwelle zählt der Gutschein). „Letzte 30 Tage“: bei Gästen der Zeitpunkt der Anmeldung,
beim Tagesziel und bei Gutscheinen der Zeitpunkt des Ereignisses. Gesperrte Konten zählen nicht.

## Grenzen

* Zugeordnet wird nur, wer **nach** dem Scan im selben Browser ein **neues** Konto anlegt (30 Tage).
  Wer schon spielt, Cookies blockiert oder im Browser-Demo spielt, wird nicht gezählt.
* Die Zahlen sind ein Richtwert für das Café, keine Abrechnungsgrundlage: Ein Café könnte selbst
  Konten anlegen. Für Abrechnung mit Sponsoren zählen weiter die eingelösten Gutscheine.
* Der Code ist öffentlich und bleibt gleich (gedruckte Karten sollen gültig bleiben). Wird ein Café
  pausiert oder abgelehnt, setzt sein Code kein Cookie mehr; die Druckvorlage gibt 404.
* Druck: Die Vorlagen sind für A4 und 100 % gebaut; Drucker ohne Randlos-Druck schneiden außen
  wenige Millimeter ab – alle Inhalte halten mindestens 8 mm Abstand. Der QR-Code ist ohne Ruhezone
  mindestens 30 mm groß (Tischkarte ≈ 38 mm, Sticker ≈ 31 mm, Poster ≈ 58 mm; geprüft im Test mit jsQR).
* Die Café-Ansicht selbst hat (wie bisher) nur Türkisch, Deutsch und Englisch; die neuen Texte gibt
  es in allen 6 Sprachen.
