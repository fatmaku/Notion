# Window Blaster – Anleitung für Mac & Handy (ohne GitHub)

## Braucht das Spiel Internet?

**Nein – nur einmal zum Installieren.** Beim ersten Öffnen lädt das Handy die App, die
KI-Erkennung und die Laufzeit (ca. 35 MB) und speichert sie dauerhaft. Danach läuft
alles offline: Kamera, Fahrzeugerkennung, Scheiben-Tracking, Punkte, Missionen,
Bestwerte. Es braucht dann weder WLAN noch den Mac. Nur die weltweite Rangliste
braucht Netz; ohne Netz werden Einträge gespeichert und später automatisch gesendet.

## Was ist im Paket?

| Datei / Ordner | Zweck |
|---|---|
| `Start-Window-Blaster.command` | Doppelklick: startet den lokalen Server auf dem Mac und öffnet die Demo |
| `Handy-vertrauen.command` | Einmalig: macht den Mac für dein Handy zu einer vertrauenswürdigen Adresse (nötig für Kamera **und** Offline-Installation über den Mac) |
| `app/` | Die fertige App inkl. KI-Modell – braucht kein Node, kein npm |
| `bin/` | Caddy, ein kleiner Open-Source-Webserver – kommt aus der separaten Server-Zip (Apple Silicon oder Intel) |
| `quelltext/` | Kompletter Quellcode, falls du etwas ändern willst (`npm install`, `npm run dev`) |
| `run/` | Entsteht beim ersten Start: Zertifikate und Konfiguration |

## Schritt 1 – Auf dem Mac starten

1. `WindowBlaster-Mac.zip` auf den Schreibtisch entpacken (Doppelklick). Danach die passende Server-Datei
   **in denselben Ordner** entpacken: `WindowBlaster-Mac-Server-AppleSilicon.zip` (Chip „Apple M1/M2/M3/M4“) oder
   `WindowBlaster-Mac-Server-Intel.zip` (Apple-Menü → „Über diesen Mac“ zeigt den Chip). Im Ordner `bin/` liegt dann `caddy-darwin-…`.
2. `Start-Window-Blaster.command` doppelklicken.
   - Meldet macOS „kann nicht geöffnet werden“: **Systemeinstellungen → Datenschutz & Sicherheit → „Trotzdem öffnen“**,
     dann erneut doppelklicken. Alternative im Terminal (Ordnername anpassen):
     `xattr -dr com.apple.quarantine ~/Desktop/WindowBlaster-Mac`
3. Es öffnet sich ein Terminalfenster mit den Adressen und der Browser mit der Demo. Das Fenster offen lassen, solange das Handy den Mac braucht.

Im Mac-Browser zeigt Safari beim ersten Mal eine Zertifikatswarnung („Details einblenden → Webseite öffnen“). Das ist bei einem lokalen Server normal.

## Schritt 2 – Aufs Handy bringen (drei Wege)

### Weg A – echte HTTPS-Adresse (am einfachsten, sobald irgendein Internet da ist)
Sobald GitHub bei dir wieder geht, deployt der Workflow automatisch nach
`https://fatmaku.github.io/Notion/window-blaster/`. Ohne GitHub geht es genauso mit
jedem kostenlosen Hoster: z. B. den Ordner `app/` bei **netlify.com/drop** hineinziehen
(danach kostenlos anmelden, sonst wird die Seite nach einer Stunde gelöscht) oder mit
Cloudflare: `npx wrangler pages deploy app`.
Dann am Handy: Adresse öffnen → „Zum Home-Bildschirm“ → in der App **„Für offline vorbereiten“** → fertig.

### Weg B – über den Mac, dauerhaft offline (unabhängigste Lösung)
1. Handy und Mac ins selbe WLAN. Kein WLAN-Router (Auto, Zug)? Mac: **Systemeinstellungen → Allgemein → Freigaben → Internetfreigabe**
   (Verbindung teilen von: irgendeinem freien Anschluss, z. B. Thunderbolt-Bridge; für Computer über: WLAN). Das Handy
   verbindet sich mit dem WLAN des Macs; der Mac ist dann immer `192.168.2.1`. Das funktioniert ohne Internet und ohne Datenvolumen.
2. `Handy-vertrauen.command` doppelklicken und die Schritte für iPhone bzw. Android ausführen (5 Minuten, einmalig).
3. Am Handy `https://<Mac-IP>:8443` öffnen (steht im Terminalfenster), „Zum Home-Bildschirm“, dann in der App
   „Für offline vorbereiten“. Ab jetzt braucht das Handy den Mac nicht mehr.

### Weg C – schnell mal spielen, ohne Zertifikat
Am Handy `https://<Mac-IP>:8443` öffnen und die Warnung bestätigen („Details → Webseite öffnen“). Kamera und Spiel
funktionieren, solange der Mac erreichbar ist. Offline-Speichern klappt so **nicht** (Browser erlauben das nur bei
vertrauenswürdigen Zertifikaten). Android-Sonderweg: In Chrome `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
öffnen, `http://<Mac-IP>:8080` eintragen, aktivieren, Chrome neu starten – dann geht auch die Offline-Installation über HTTP.

## Häufige Fragen

- **Handy findet den Mac nicht:** Beide im selben Netz? Firewall des Macs (Systemeinstellungen → Netzwerk → Firewall) erlaubt eingehende Verbindungen für „caddy“? IP-Adresse aus dem Terminalfenster verwenden, nicht `localhost`.
- **Kamera-Frage kommt nicht:** Adresse muss mit `https://` beginnen. Bei Weg C die Warnung bestätigen. In den Handy-Einstellungen prüfen, ob Safari/Chrome Kamera-Zugriff hat.
- **„Offline bereit“ erscheint nicht:** Nur bei vertrauenswürdiger Adresse möglich (Weg A oder B). Der Download braucht ca. 35 MB.
- **Neue Version einspielen:** Ordner `app/` ersetzen, Server neu starten, App am Handy einmal mit Netz öffnen – sie aktualisiert sich selbst und behält Modell und Bestwerte.
- **Diagnose im Spiel:** Fünfmal schnell oben links tippen (Erkennungs-ms, GPU/CPU, Gyro, Scheibenstatus).

## Neu in dieser Version
Hand-Läufer und Vögel (ducken!), Vorhalt für Wurfsachen, klebende Farb- und Milchshake-Spritzer, acht neue Waffen im
Shop (Punkte-Guthaben aus jeder Runde), Fehler werden abgefangen und auf dem Startbildschirm angezeigt statt das Spiel
einzufrieren.

## Sicherheit & Datenschutz
Nur als Fahrgast spielen. Kamera wird ausschließlich live auf dem Gerät ausgewertet; keine Aufnahme, kein Upload.
Das Zertifikat aus `Handy-vertrauen.command` gilt nur für deinen Mac; es lässt sich in den Handy-Einstellungen jederzeit löschen.
