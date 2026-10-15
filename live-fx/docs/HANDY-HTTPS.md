# Handy & HTTPS – Mikro am Handy freischalten

[Deutsch](#warum-braucht-das-mikro-https) · [Türkçe](#türkçe-kısaca) · [English](#english-in-short)

Die Handy-Seite (`/mobile.html`, Anleitung: [HANDY.md](HANDY.md)) funktioniert als **Fernbedienung
über normales HTTP**. Sobald das Handy aber selbst **zuhören** soll („🎙️ Mikro“), braucht LiveFX
eine verschlüsselte Verbindung. Diese Seite erklärt, warum, und wie du das in fünf Minuten einrichtest.

## Warum braucht das Mikro HTTPS?

Browser geben Mikrofon und Spracherkennung (`getUserMedia`, Web Speech API) nur in einem
**„sicheren Kontext“** frei: `https://…` oder `localhost`. Auf dem PC ist das Panel unter
`http://127.0.0.1:8787/` deshalb kein Problem. Vom Handy aus erreichst du den Server aber über die
LAN-Adresse (`http://192.168.1.20:8787/`) – die ist für den Browser „unsicher“, der Mikro-Button
zeigt den Hinweis „Mikro am Handy braucht HTTPS“ und die Seite bleibt eine reine Fernbedienung.

> **Der einfachere Weg (seit 2.2):** im Panel (Start-Assistent „📱 Handy verbinden“, Karte **📱 Handy** oder am Handy
> unter „🎙 Handy-Mikro“) auf **🌐 Internet-Link starten** tippen – der QR-Code zeigt dann auf
> `https://…trycloudflare.com/p#…` (2.4: ein Einmal-Kopplungscode, nie der API-Token), das Mikro am Handy geht
> sofort, ohne Zertifikat, auch aus dem Mobilfunk; Live-Updates laufen dort automatisch per Long-Polling. Siehe
> [HANDY.md](HANDY.md) Abschnitt 4a. Diese Seite bleibt für alle, die **ohne Internet / ohne Cloudflare** im reinen
> Heimnetz bleiben wollen.

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
LIVEFX_TLS_CERT=livefx-cert.pem LIVEFX_TLS_KEY=livefx-key.pem node server.js --open
```

Windows (PowerShell):

```powershell
$env:LIVEFX_TLS_CERT="livefx-cert.pem"; $env:LIVEFX_TLS_KEY="livefx-key.pem"; node server.js --open
```

Windows (Eingabeaufforderung / cmd):

```bat
set LIVEFX_TLS_CERT=livefx-cert.pem
set LIVEFX_TLS_KEY=livefx-key.pem
node server.js --open
```

Die Ausgabe zeigt jetzt `LiveFX läuft auf https://…` und einen QR-Code mit einem `https://<LAN-IP>:8787/p#…`-Link.
Beide Variablen müssen gesetzt sein – fehlt eine oder ist eine Datei nicht lesbar, bricht der Start mit einer
deutschen Fehlermeldung ab (Exit-Code 1), damit du nicht versehentlich unverschlüsselt im LAN läufst. Seit 2.4 ist
LiveFX von selbst im WLAN erreichbar (nur gekoppelte Geräte dürfen etwas tun) – **kein `HOST=0.0.0.0` mehr nötig**;
nur nicht mit `--local` starten.

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
4. Safari komplett schließen und den **QR-Code aus dem Panel** (Start-Assistent oder Karte **📱 Handy**, jetzt ein
   `https://192.168.x.x:8787/p#…`-Link) erneut scannen – oder `https://192.168.x.x:8787/p` öffnen und den
   6-stelligen Code eintippen. Kein Warnhinweis mehr, das Schloss ist zu, „🎙️ Mikro“ funktioniert.

**Android (Chrome)**

1. `livefx-cert.pem` aufs Handy kopieren (USB, Mail, Nextcloud, Google Drive …).
2. **Einstellungen → Sicherheit (bzw. Sicherheit & Datenschutz) → Verschlüsselung & Anmeldedaten →
   Zertifikat installieren → CA-Zertifikat** → Warnung bestätigen → Datei auswählen.
   (Pfad je nach Hersteller leicht anders; Suche in den Einstellungen nach „Zertifikat“.)
3. Chrome neu starten und den QR-Code aus dem Panel scannen (`https://…/p#…`) bzw. `…/p` öffnen und den
   6-stelligen Code eintippen. Chrome zeigt dann das Schloss ohne Warnung.

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
- Das Geräte-Cookie (`livefx_dev`, nach dem Koppeln per QR-Code oder Code) bekommt bei HTTPS zusätzlich das
  `Secure`-Flag. Ein Handy, das vorher über `http://` gekoppelt war, einmal über den neuen `https://`-QR-Code koppeln;
  das alte Gerät in der Liste unter dem QR-Code „entfernen“. Der API-Token steht in keinem Link und keinem Cookie.

## Fehlersuche

| Symptom | Ursache / Lösung |
|---|---|
| `HTTPS-Konfiguration unvollständig …` beim Start | Nur eine der beiden Variablen gesetzt → beide setzen. |
| `HTTPS-Zertifikat nicht lesbar: …` | Pfad falsch oder Datei in einem anderen Ordner → absoluten Pfad angeben. |
| Handy: „Verbindung ist nicht privat“ trotz Installation | IP in der URL ≠ IP im Zertifikat, oder Schritt „Zertifikatsvertrauenseinstellungen“ (iOS) fehlt. |
| Mikro-Button meldet weiter „braucht HTTPS“ | Seite über `http://` geöffnet – den `https://`-QR-Code aus dem Panel scannen. |
| Mikro erlaubt, aber keine Erkennung | Web Speech API fehlt (Firefox, ältere Android-Browser) → Chrome (Android) bzw. Safari (iOS ab 14.5) nutzen. |
| Handy erreicht den Server gar nicht | Mit `--local` (bzw. `HOST=127.0.0.1`) gestartet, Firewall auf dem PC („Zugriff zulassen“; Windows: WLAN-Profil „Privat“ statt „Öffentlich“) oder Gäste-WLAN mit Client-Isolation – sonst Internet-Link. |
| „Dieses Gerät ist nicht gekoppelt“ | Über `https://` ist das Handy für den Browser eine neue Seite – einmal den QR-Code scannen. |

## Türkçe (kısaca)

Telefon mikrofonu (Web Speech) yalnızca **güvenli bağlantıda** (`https://` veya `localhost`) çalışır. **En kolayı:**
panelde **🌐 Internet-Link starten** – QR kod `https://…trycloudflare.com/p#…` olur, sertifika gerekmez, canlı
güncellemeler orada otomatik long-polling ile gelir. İnternetsiz ev ağında: yukarıdaki `openssl` komutuyla sertifika
oluştur, `LIVEFX_TLS_CERT` ve `LIVEFX_TLS_KEY` ile başlat (PowerShell: `$env:LIVEFX_TLS_CERT="livefx-cert.pem";
$env:LIVEFX_TLS_KEY="livefx-key.pem"; node server.js --open`), `livefx-cert.pem` dosyasını telefona güvenilir sertifika
olarak yükle (iPhone: Profil + Sertifika Güven Ayarları, Android: CA sertifikası), sonra paneldeki yeni `https://` QR
kodunu tara. 2.4'ten itibaren `HOST=0.0.0.0` gerekmez; yalnızca `--local` ile başlatma.

## English (in short)

The phone microphone (Web Speech) only works in a **secure context** (`https://` or `localhost`). **Easiest:**
**🌐 Internet-Link starten** in the panel – the QR code becomes `https://…trycloudflare.com/p#…`, no certificate,
live updates arrive there by long-polling automatically. Home network without internet: create a certificate with the
`openssl` command above, start with `LIVEFX_TLS_CERT` and `LIVEFX_TLS_KEY` (PowerShell: `$env:LIVEFX_TLS_CERT=
"livefx-cert.pem"; $env:LIVEFX_TLS_KEY="livefx-key.pem"; node server.js --open`), install `livefx-cert.pem` on the
phone as a trusted certificate (iPhone: profile + Certificate Trust Settings, Android: CA certificate), then scan the
panel's new `https://` QR code. Since 2.4 no `HOST=0.0.0.0` is needed; just don't start with `--local`.
