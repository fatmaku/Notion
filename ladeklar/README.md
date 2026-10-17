# LADEKLAR

**Ein Tipp. Alles klar.** – White-Label-App für Speditionen und Transportunternehmen.

Sie sind **Lizenzgeber** und vermieten Ladeklar an Logistikunternehmen (**Lizenznehmer**). Jeder Lizenznehmer
arbeitet unter seinem eigenen Logo: Das Büro legt Fahrer, Lkw und Lieferungen an. Die Fahrer bestätigen jeden
Schritt mit einem Tipp und laden den Lieferschein hoch, auch im Funkloch: Die App startet dort mit den zuletzt geladenen
Touren, speichert Schritte und Fotos und sendet sie der Reihe nach mit der echten Tipp-Zeit, sobald Netz da ist.
Das Büro sieht alles live und bekommt Push-Mitteilungen. Fahrer-App, Büro und Konsole gibt es in 8 Sprachen.
Büro und Lizenzgeber können ihr Konto mit einer Zwei-Faktor-Anmeldung (Authenticator-App) schützen.

| Rolle | Wo | Was |
|---|---|---|
| Lizenzgeber | Konsole (Web) | Lizenznehmer anlegen, Tarif und Laufzeit, sperren/kündigen, Admin-Passwort zurücksetzen, nach Kündigung endgültig löschen, Abrechnung aus der Lizenz-Historie (mit Grund je Zeile), Kündigungs- und Tarifwünsche der Kunden, Speicher je Kunde |
| Lizenznehmer: Admin, Disposition | Web, Tablet, Handy | Live-Übersicht, Lieferungen, Fahrer, Fahrzeuge, Berichte; nur Admin: Marke, Abläufe, Büro-Zugänge, Lizenz (Preis, Speicher, Tarifwunsch, Kündigung), Löschen, Protokoll, Gesamtexport (ZIP) |
| Fahrer | Handy oder Tablet (installierbare App) | Lkw wählen, Auftrag bestätigen, Aufgeladen/Abgeladen, Lieferschein, Notiz, Problem; Anmeldung mit PIN oder Einladungslink (einmal gültig, 14 Tage) |

## Die wichtigsten Dateien

| Was | Datei |
|---|---|
| Produktplan mit Lückenanalyse | `PLAN.md` (PDF: `docs/pdf/PLAN.pdf`) |
| Benutzerhandbücher | `docs/handbuch/` (PDF nach `node tools/build-docs.js handbuch` in `docs/handbuch/pdf/`) |
| Rechtstexte (Muster) | `docs/recht/` (PDF/DOCX: `docs/recht/pdf/`) |
| Marktanalyse, Businessplan, Werbetexte | `business/` (PDF/DOCX: `business/pdf/`) |
| Pitch-Deck | `business/Ladeklar_Pitch.pptx` und `business/pdf/Ladeklar_Pitch.pdf` |
| Flyer A4 und Postkarte A6 (druckfertig, 3 mm Beschnitt) | `marketing/Ladeklar_Flyer_A4.pdf`, `marketing/Ladeklar_Postkarte_A6.pdf` |
| Social-Media-Bilder zu den 5 LinkedIn-Posts (1080 × 1350) | `marketing/social/Ladeklar_Post_1.png` … `_5.png`, Texte in `business/WERBETEXTE.md` |
| Trailer | `video/Ladeklar_Trailer_16x9.mp4` (72 s), `video/Ladeklar_Trailer_9x16.mp4` (30 s, Social Media) |
| Website | Quelle `site/`, fertig gebaut `dist/site/` |
| Online-Demo ohne Server | `dist/demo.html` (eine Datei, läuft im Browser; Büro und Fahrer-Handy nebeneinander) |
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
| Büro Kaya Logistik (Admin) | `ayse@kaya-logistik.de` / `Demo-Passwort-2026` (Disponent: `jonas@kaya-logistik.de`, gleiches Passwort) |
| Fahrer | Firmencode `KAYA`, Telefon `+49 176 1000 0004` (Sven Krause), PIN `123456` |

Neue Büro- und Admin-Zugänge mit Startpasswort müssen beim ersten Login ein eigenes Passwort vergeben.

## Betrieb (Produktion)

```bash
node server/index.js setup inhaber@ihre-firma.de 'langes-sicheres-Passwort'   # Lizenzgeber-Zugang anlegen
PORT=8080 BASE_URL=https://app.ladeklar.de node server/index.js
# Lizenzgeber-Passwort vergessen oder Handy mit der Authenticator-App verloren:
node server/index.js reset-platform-password inhaber@ihre-firma.de 'neues-langes-Passwort'
```

| Variable | Bedeutung |
|---|---|
| `PORT`, `HOST` | Adresse des Servers (Standard 8080, 0.0.0.0) |
| `DATA_DIR` | Datenbank und Dateien (Standard `./data`) – täglich sichern, siehe `deploy/backup.sh` |
| `BASE_URL` | öffentliche https-Adresse; mit `https://` gelten Secure-Cookies und HSTS (Einladungslinks nutzen die aufgerufene Adresse) |
| `TRUST_PROXY=1` | hinter Caddy/nginx (im Docker-Image gesetzt), damit die echte IP im Protokoll steht und Anmeldesperren je Gerät greifen |
| `TRUST_PROXY_HOPS` | Zahl der vertrauenswürdigen Proxys, die je eine Adresse an `X-Forwarded-For` anhängen (Standard 1, nur Caddy: 1); die IP des Geräts ist der Eintrag so viele Stellen von rechts |
| `PUSH_SUBJECT`, `SECURITY_CONTACT` | Kontakt für Push-Dienste und `/.well-known/security.txt` |
| `PLATFORM_EMAIL`, `PLATFORM_PASSWORD` | legt beim ersten Start den Lizenzgeber-Zugang an (danach entfernen); es gibt genau einen Lizenzgeber-Zugang |

`reset-platform-password` setzt ein neues Passwort (mindestens 10 Zeichen), schaltet die Zwei-Faktor-Anmeldung
aus, hebt eine Sperre auf und beendet alle Sitzungen und Push-Abonnements des Lizenzgebers. Im Docker-Betrieb:
`docker compose exec app node server/index.js reset-platform-password …`. Danach die Zwei-Faktor-Anmeldung in der
Konsole unter „Mein Konto“ neu einrichten.

Mit Docker: `deploy/docker-compose.yml` (App + Caddy mit Let's-Encrypt-Zertifikat), Einstellungen in
`deploy/.env.example`. Subdomains (`kaya.ladeklar.de`) und eigene Domains von Premium-Kunden brauchen je eine Zeile im
`deploy/Caddyfile` und einen DNS-Eintrag beim Kunden. Die Website (`dist/site/`) ist statisch und kann von jedem
Webserver ausgeliefert werden. Eigene Store-Apps für Premium-Kunden: `mobile/README.md` (vorbereitet; Push über
APNs/FCM fehlt noch). Sicherung: `deploy/backup.sh` täglich per Cron einrichten; das Skript legt ein
unverschlüsseltes Archiv auf demselben Server ab, Verschlüsselung und Kopie an einen zweiten Ort kommen dazu
(`docs/recht/CHECKLISTE_GRUENDUNG.md`, Ziffer 7).

## Tests

```bash
npm run test:unit    # Unit- und API-Tests: node --test test/*.test.js
npm run test:e2e     # Browser-Tests je Rolle auf Handy, Tablet und Desktop, schreibt e2e/TESTBERICHT.md
```

`node --test test/` (nur der Ordner) findet unter Node 22 keine Tests; bitte `npm run test:unit` nutzen.
Anzahl der Tests und Ergebnisse: siehe `e2e/TESTBERICHT.md`.

| Datei | Prüft |
|---|---|
| `test/engine.test.js` | Engine: Rechte, Mandantentrennung, Lieferablauf, Berichte, Abrechnung |
| `test/engine-deliveries.test.js` | Tipp-Zeit vom Gerät, Zustellzeitpunkt, Listen, Fahrerwechsel, Eingabeprüfung, Mitteilungstexte |
| `test/engine-accounts.test.js` | Sitzungen und Lizenz, Speicher, Dateien löschen, Einladungslinks, API-Schlüssel als Hash, Zwei-Faktor-Anmeldung, Abrechnung aus der Historie, Tarifwechsel, Kundenanfragen, Login-Sperre |
| `test/api.test.js` | HTTP-API vom Lizenzgeber bis zum Fahrer, Live-Ereignisse, Push, Dateien, Exporte, Login-Sperre, Push-Verschlüsselung, Demo-Daten |
| `test/api-hardening.test.js` | Absturzsicherheit, ZIP-Export (auch ZIP64), CSV-Formeln, Sitzungsende, Push-Freigabeliste, Proxy-Adressen, Uploads, CLI `reset-platform-password` |
| `test/client-driver.test.js` | Fahrer-App: Warteschlange, doppeltes Senden, Reihenfolge, Start ohne Netz, Abmelden offline, Einladung, Push, Service Worker |
| `test/office-ui.test.js` | Büro: Formulare, Aufbewahrung, Lizenz-Seite, Exporte, Zwei-Faktor-Anmeldung, Einladungslink |
| `test/licensor-demo.test.js` | Konsole und Online-Demo: Rückfragen, Abrechnung, Tarifverkleinerung, Kundenanfragen, Zwei-Faktor-Anmeldung |
| `test/integration.test.js` | Zusammenspiel der Teile: Foto-Upload ohne Doppel nach Wiederholung, REST-API mit Seiten, deutsches Datum in Exporten, Übersetzungsliste |
| `test/final.test.js` | Letzte Korrekturen: Speicher beim Tarifwechsel, Rückgängig nur kurz nach Eingang, Kundenanfragen schließen, übersetzbare Fehlermeldungen |

## Bauen

| Befehl | Ergebnis |
|---|---|
| `npm run build:demo` | `dist/demo.html` und `dist/ladeklar-demo.artifact.html` (mit `--out <Ordner>` an einen anderen Ort) |
| `node tools/extract-i18n.js` | Liste aller Oberflächentexte für die Übersetzungen (`web/js/lang/_keys.json`) |
| `node tools/build-site.js` | Website nach `dist/site/` (Bilder, Trailer in Web-Größe, Rechtsseiten) |
| `node tools/build-docs.js [handbuch\|recht\|business\|root]` | PDF und DOCX aus den Markdown-Texten |
| `node tools/build-print.js` | Flyer und Postkarte; Kontaktdaten vorher in `marketing/print-config.json` eintragen |
| `node tools/build-social.js` | Social-Media-Bilder |
| `python3 tools/build-deck.py` | Pitch-Deck als PPTX |
| `node video/capture.js 16x9` / `9x16` | Trailer neu rendern (Musik: `python3 video/music.py`) |
| `node tools/manual-shots.js` | Bildschirmfotos für das Handbuch |

## Vor dem Start erledigen

- Platzhalter füllen: Firma, Anschrift, Telefon, E-Mail (`marketing/print-config.json`, `docs/recht/*`, Pitch-Folie „Kontakt“).
- Rechtstexte anwaltlich prüfen lassen (Hinweise „Prüfhinweis“ in den Texten), danach die Hinweise entfernen.
- Marke „Ladeklar“ und Domain prüfen und sichern (DPMA/EUIPO-Recherche, `ladeklar.de`).
- Hosting in Deutschland wählen und in `docs/recht/UNTERAUFTRAGSVERARBEITER.md` eintragen.
- Checkliste Gründung und Betrieb: `docs/recht/CHECKLISTE_GRUENDUNG.md`.
