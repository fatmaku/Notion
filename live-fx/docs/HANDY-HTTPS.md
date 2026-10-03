# Handy & HTTPS – Mikro am Handy freischalten

Die Handy-Seite (`/mobile.html`, Anleitung: [HANDY.md](HANDY.md)) funktioniert als **Fernbedienung
über normales HTTP**. Sobald das Handy aber selbst **zuhören** soll („🎙️ Mikro“), braucht LiveFX
eine verschlüsselte Verbindung. Diese Seite erklärt, warum, und wie du das in fünf Minuten einrichtest.

## Warum braucht das Mikro HTTPS?

Browser geben Mikrofon und Spracherkennung (`getUserMedia`, Web Speech API) nur in einem
**„sicheren Kontext“** frei: `https://…` oder `localhost`. Auf dem PC ist das Panel unter
`http://127.0.0.1:8787/` deshalb kein Problem. Vom Handy aus erreichst du den Server aber über die
LAN-Adresse (`http://192.168.1.20:8787/`) – die ist für den Browser „unsicher“, der Mikro-Button
zeigt den Hinweis „Mikro am Handy braucht HTTPS“ und die Seite bleibt eine reine Fernbedienung.

Lösung: LiveFX mit einem **selbst erstellten Zertifikat** per HTTPS starten und dem Handy dieses
Zertifikat einmal als vertrauenswürdig bekannt machen. Es geht nichts ins Internet; das Zertifikat
gilt nur in deinem Heimnetz.

## 1. Zertifikat erzeugen (einmalig)

Du brauchst `openssl` (auf macOS und Linux vorhanden; unter Windows über Git Bash oder
`winget install ShiningLight.OpenSSL.Light`). Ermittle zuerst die LAN-IP deines PCs – sie steht auch
in der Karte **📱 Handy** im Panel – und setze sie im Befehl ein:

```bash
cd live-fx
openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj "/CN=livefx" \
  -addext "subjectAltName=IP:192.168.x.x" \
  -keyout livefx-key.pem -out livefx-cert.pem
```

Ergebnis: `livefx-cert.pem` (öffentlich, kommt aufs Handy) und `livefx-key.pem` (geheim, bleibt auf
dem PC). Beide Dateien liegen im LiveFX-Ordner und werden nie ausgeliefert. Ändert sich die IP des PCs
(anderes WLAN, DHCP), einfach den Befehl mit der neuen IP wiederholen – oder im Router eine feste IP
für den PC eintragen. Mehrere Adressen gehen mit `subjectAltName=IP:192.168.1.20,IP:10.0.0.5,DNS:livefx.local`.

## 2. LiveFX mit HTTPS starten

```bash
HOST=0.0.0.0 LIVEFX_TLS_CERT=livefx-cert.pem LIVEFX_TLS_KEY=livefx-key.pem node server.js
```

Windows (PowerShell):

```powershell
$env:HOST="0.0.0.0"; $env:LIVEFX_TLS_CERT="livefx-cert.pem"; $env:LIVEFX_TLS_KEY="livefx-key.pem"; node server.js
```

Die Ausgabe zeigt jetzt `LiveFX läuft auf https://…`. Beide Variablen müssen gesetzt sein – fehlt eine
oder ist eine Datei nicht lesbar, bricht der Start mit einer deutschen Fehlermeldung ab (Exit-Code 1),
damit du nicht versehentlich unverschlüsselt im LAN läufst. `HOST=0.0.0.0` ist nötig, damit das Handy
den Server überhaupt erreicht.

## 3. Zertifikat auf dem Handy vertrauen

Beim ersten Aufruf von `https://192.168.x.x:8787/…` warnt der Handy-Browser vor dem unbekannten
Zertifikat. Einmalig „trotzdem fortfahren“ reicht für die Fernbedienung, **für das Mikro muss das
Zertifikat aber wirklich vertrauenswürdig sein** (sonst verweigern iOS/Android den Mikro-Zugriff still).

**iPhone / iPad (Safari)**

1. `livefx-cert.pem` aufs Handy bringen: per AirDrop, als Mail-Anhang oder über iCloud Drive.
   Der Browser darf die Datei nicht selbst laden (Safari blockt Downloads von unbekannten https-Seiten).
2. Datei antippen → Meldung „Profil geladen“ → **Einstellungen → Allgemein → VPN & Geräteverwaltung**
   → Profil „livefx“ → **Installieren** (Code eingeben).
3. **Einstellungen → Allgemein → Info → Zertifikatsvertrauenseinstellungen** → Schalter bei „livefx“
   einschalten → „Weiter“. Erst dieser Schritt macht das Zertifikat für Safari wirklich gültig.
4. Safari komplett schließen und `https://192.168.x.x:8787/m?token=…` (Link aus der Panel-Karte)
   erneut öffnen – kein Warnhinweis mehr, das Schloss ist zu, „🎙️ Mikro“ funktioniert.

**Android (Chrome)**

1. `livefx-cert.pem` aufs Handy kopieren (USB, Mail, Nextcloud, Google Drive …).
2. **Einstellungen → Sicherheit (bzw. Sicherheit & Datenschutz) → Verschlüsselung & Anmeldedaten →
   Zertifikat installieren → CA-Zertifikat** → Warnung bestätigen → Datei auswählen.
   (Pfad je nach Hersteller leicht anders; Suche in den Einstellungen nach „Zertifikat“.)
3. Chrome neu starten und den `/m?token=…`-Link öffnen. Chrome zeigt dann das Schloss ohne Warnung.

Samsung Internet und Firefox auf Android nutzen teils einen eigenen Speicher – im Zweifel Chrome
verwenden. Wenn nach dem Installieren weiterhin gewarnt wird, stimmt meist die IP im `subjectAltName`
nicht mit der Adresse in der URL überein → Zertifikat neu erzeugen (Schritt 1).

## 4. OBS & PC: Mixed Content, wer redet mit wem?

- **Das OBS-Overlay auf demselben PC darf bei HTTP bleiben** – muss es aber nicht. Läuft der Server mit
  HTTPS, gibt es nur noch `https://…`; im OBS-Browser einfach `https://127.0.0.1:8787/overlay.html`
  eintragen. Der eingebaute OBS-Browser akzeptiert selbstsignierte Zertifikate, ohne zu fragen.
  Wer lieber alles beim Alten lassen will, startet LiveFX ohne die TLS-Variablen und nutzt das Handy
  nur als Fernbedienung.
- Das Panel auf dem PC über `https://127.0.0.1:8787/` öffnen (Chrome warnt einmal, „Erweitert →
  trotzdem öffnen“) oder das Zertifikat auch auf dem PC in den Systemspeicher importieren.
- **Kein Mixed Content mischen:** eine `https://`-Seite darf keine `http://`-Ressourcen laden. Da alle
  Seiten und die API vom selben Server kommen, tritt das nur auf, wenn du Adressen von Hand mischst
  (z. B. Overlay per `https`, Panel per `http` in einer Einbettung). Also: **entweder alles `http`
  (Handy nur als Fernbedienung) oder alles `https`.**
- Das Sitzungs-Cookie bekommt bei HTTPS zusätzlich das `Secure`-Flag; der Link aus der Panel-Karte
  (`/m?token=…`) setzt es beim ersten Aufruf.

## Fehlersuche

| Symptom | Ursache / Lösung |
|---|---|
| `HTTPS-Konfiguration unvollständig …` beim Start | Nur eine der beiden Variablen gesetzt → beide setzen. |
| `HTTPS-Zertifikat nicht lesbar: …` | Pfad falsch oder Datei in einem anderen Ordner → absoluten Pfad angeben. |
| Handy: „Verbindung ist nicht privat“ trotz Installation | IP in der URL ≠ IP im Zertifikat, oder Schritt „Zertifikatsvertrauenseinstellungen“ (iOS) fehlt. |
| Mikro-Button meldet weiter „braucht HTTPS“ | Seite über `http://` geöffnet – den `https://`-Link aus der Panel-Karte verwenden. |
| Mikro erlaubt, aber keine Erkennung | Web Speech API fehlt (Firefox, ältere Android-Browser) → Chrome (Android) bzw. Safari (iOS ab 14.5) nutzen. |
| Handy erreicht den Server gar nicht | `HOST=0.0.0.0` vergessen, Firewall auf dem PC (Port 8787 freigeben) oder Gäste-WLAN mit Client-Isolation. |
