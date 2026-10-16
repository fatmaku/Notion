# LADEKLAR

**Ein Tipp. Alles klar.** – White-Label-App für Speditionen und Transportunternehmen.

Sie sind **Lizenzgeber** und vermieten Ladeklar an Logistikunternehmen (**Lizenznehmer**). Jeder Lizenznehmer
arbeitet unter seinem eigenen Logo: Das Büro legt Fahrer, Lkw und Lieferungen an. Die Fahrer bestätigen jeden
Schritt mit einem Tipp und laden den Lieferschein hoch. Das Büro sieht alles live und bekommt Push-Mitteilungen.

| Rolle | Wo | Was |
|---|---|---|
| Lizenzgeber | Konsole (Web) | Lizenznehmer anlegen, Tarif und Laufzeit, sperren/kündigen, Abrechnung |
| Lizenznehmer: Admin, Disposition | Web, Tablet, Handy | Live-Übersicht, Lieferungen, Fahrer, Fahrzeuge, Berichte, Marke, Abläufe |
| Fahrer | Handy oder Tablet (installierbare App) | Lkw wählen, Auftrag bestätigen, Aufgeladen/Abgeladen, Lieferschein, Notiz, Problem |

## Die wichtigsten Dateien

| Was | Datei |
|---|---|
| Produktplan mit Lückenanalyse | `PLAN.md` (PDF: `docs/pdf/PLAN.pdf`) |
| Benutzerhandbücher | `docs/handbuch/` (PDF: `docs/handbuch/pdf/`) |
| Rechtstexte (Muster) | `docs/recht/` (PDF/DOCX: `docs/recht/pdf/`) |
| Marktanalyse, Businessplan, Werbetexte | `business/` (PDF/DOCX: `business/pdf/`) |
| Pitch-Deck | `business/Ladeklar_Pitch.pptx` und `business/pdf/Ladeklar_Pitch.pdf` |
| Flyer A4 und Postkarte A6 (druckfertig, 3 mm Beschnitt) | `marketing/Ladeklar_Flyer_A4.pdf`, `marketing/Ladeklar_Postkarte_A6.pdf` |
| Trailer | `video/Ladeklar_Trailer_16x9.mp4` (72 s), `video/Ladeklar_Trailer_9x16.mp4` (30 s, Social Media) |
| Website | Quelle `site/`, fertig gebaut `dist/site/` |
| Online-Demo ohne Server | `dist/demo.html` (eine Datei, läuft im Browser) |
| Testbericht | `e2e/TESTBERICHT.md` (PDF: `docs/pdf/TESTBERICHT.pdf`), Bildschirmfotos `e2e/screens/` |

## Schnellstart (lokal)

Voraussetzung: Node.js 22.5 oder neuer. Der Server braucht keine weiteren Pakete (SQLite ist in Node eingebaut).

```bash
npm install          # nur esbuild für den Demo-Build
npm run dev          # startet mit Demo-Daten auf http://localhost:8080
```

Demo-Zugänge (nur mit `--demo-data`):

| Rolle | Anmeldung |
|---|---|
| Lizenzgeber | `inhaber@ladeklar.de` / `Ladeklar-Demo-2026` |
| Büro Kaya Logistik | Firmencode `KAYA`, `ayse@kaya-logistik.de` / `Demo-Passwort-2026` |
| Fahrer | Firmencode `KAYA`, Telefon `+49 176 1000 0004` (Sven Krause), PIN `123456` |

## Betrieb (Produktion)

```bash
node server/index.js setup inhaber@ihre-firma.de 'langes-sicheres-Passwort'   # Lizenzgeber-Zugang anlegen
PORT=8080 BASE_URL=https://app.ladeklar.de node server/index.js
```

| Variable | Bedeutung |
|---|---|
| `PORT`, `HOST` | Adresse des Servers (Standard 8080, 0.0.0.0) |
| `DATA_DIR` | Datenbank und Dateien (Standard `./data`) – täglich sichern, siehe `deploy/backup.sh` |
| `BASE_URL` | öffentliche https-Adresse (Cookies, Einladungslinks, Push) |
| `TRUST_PROXY=1` | hinter Caddy/nginx, damit die echte IP im Protokoll steht |
| `PUSH_SUBJECT`, `SECURITY_CONTACT` | Kontakt für Push-Dienste und `/.well-known/security.txt` |

Mit Docker: `deploy/docker-compose.yml` (App + Caddy mit Let's-Encrypt-Zertifikat), Einstellungen in
`deploy/.env.example`. Die Website (`dist/site/`) ist statisch und kann von jedem Webserver ausgeliefert werden;
Beispiel im `deploy/Caddyfile`. Eigene Store-Apps für Premium-Kunden: `mobile/README.md`.

## Tests

```bash
npm run test:unit    # Engine und HTTP-API (node --test)
npm run test:e2e     # Browser-Tests je Rolle auf Handy, Tablet und Desktop, schreibt e2e/TESTBERICHT.md
```

## Bauen

| Befehl | Ergebnis |
|---|---|
| `npm run build:demo` | `dist/demo.html` und `dist/ladeklar-demo.artifact.html` |
| `node tools/build-site.js` | Website nach `dist/site/` (Bilder, Trailer in Web-Größe, Rechtsseiten) |
| `node tools/build-docs.js [handbuch\|recht\|business\|root]` | PDF und DOCX aus den Markdown-Texten |
| `node tools/build-print.js` | Flyer und Postkarte; Kontaktdaten vorher in `marketing/print-config.json` eintragen |
| `python3 tools/build-deck.py` | Pitch-Deck als PPTX |
| `node video/capture.js 16x9` / `9x16` | Trailer neu rendern (Musik: `python3 video/music.py`) |
| `node tools/manual-shots.js` | Bildschirmfotos für das Handbuch |

## Vor dem Start erledigen

- Platzhalter füllen: Firma, Anschrift, Telefon, E-Mail (`marketing/print-config.json`, `docs/recht/*`, Pitch-Folie „Kontakt“).
- Rechtstexte anwaltlich prüfen lassen (Hinweise „Prüfhinweis“ in den Texten), danach die Hinweise entfernen.
- Marke „Ladeklar“ und Domain prüfen und sichern (DPMA/EUIPO-Recherche, `ladeklar.de`).
- Hosting in Deutschland wählen und in `docs/recht/UNTERAUFTRAGSVERARBEITER.md` eintragen.
- Checkliste Gründung und Betrieb: `docs/recht/CHECKLISTE_GRUENDUNG.md`.
