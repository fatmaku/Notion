# LiveFX starten und das Handy koppeln

[Deutsch](#deutsch) · [Türkçe](#türkçe) · [English](#english)

## Deutsch

### In 2 Minuten startklar

1. **ZIP entpacken.** Unter Windows: Rechtsklick auf die ZIP → „Alle extrahieren…“. Nicht direkt aus der ZIP
   starten, sonst gehen Einstellungen verloren (das Startfenster warnt dann).
2. **Doppelklick auf die Startdatei** im Ordner `start`:

   | System  | Datei                        |
   |---------|------------------------------|
   | Windows | `start\Start-LiveFX.bat`     |
   | macOS   | `start/Start-LiveFX.command` |
   | Linux   | `start/start.sh` (im Terminal: `./start/start.sh`) |

3. Das **Panel öffnet sich im Browser** (`http://127.0.0.1:8787/`). Das schwarze Fenster offen lassen, solange
   du streamst – Schließen (oder Strg+C) beendet LiveFX.
4. **Handy koppeln** (optional): Im Startfenster und im Panel unter „📱 Handy“ steht ein **QR-Code**. Mit der
   Handy-Kamera scannen → die Fernbedienung öffnet sich. Fertig.

Die Startdatei prüft, ob **Node.js 20 oder neuer** da ist. Fehlt es, erklärt das Fenster die nächsten Schritte
und öffnet <https://nodejs.org/de/download>. Sie lädt selbst nie etwas herunter.

### Node.js installieren

- **Windows:** auf <https://nodejs.org/de/download> die **LTS**-Version (.msi) laden, installieren (immer
  „Weiter“). Schneller in PowerShell: `winget install OpenJS.NodeJS.LTS`.
- **macOS:** LTS-Version (.pkg) von <https://nodejs.org/de/download> oder `brew install node`.
- **Linux:** Paketmanager oder <https://nodejs.org/de/download> (z. B. `sudo apt install nodejs` – Version ≥ 20 prüfen
  mit `node -v`).
- **Ohne Installation (portabel):** „Windows Binary (.zip)“ bzw. „macOS/Linux Binary (.tar.gz)“ laden,
  entpacken, den Ordner in `node` umbenennen und in den LiveFX-Ordner legen: `LiveFX\node\node.exe` (Windows)
  oder `LiveFX/node/bin/node` (macOS/Linux). Ein nicht umbenannter Ordner `LiveFX/node/node-v22…/` wird auch
  gefunden. Die Startdatei nimmt dieses Node vor einem installierten.

### Das Startfenster

```
LiveFX läuft auf http://127.0.0.1:8787/
  Control Panel:  http://127.0.0.1:8787/   (öffnet sich im Browser)
  OBS-Overlay:    http://127.0.0.1:8787/overlay.html   (hochkant: …?layout=portrait)
  📱 Handy koppeln – QR-Code mit der Handy-Kamera scannen (Handy im selben WLAN):
    ███████████████████
    ██ ▄▄▄▄▄ █ ▀▄ ▄▄▄ ██   ← QR-Code (gültig 10 Minuten, einmal)
  Oder am Handy http://192.168.178.23:8787/p öffnen und den Code 123 456 eingeben.
  Anderes Netz? Im Panel auf ‚Internet-Link‘ klicken.
```

- Der QR-Code enthält nur einen **Kopplungscode** (`…/p#<geheim>`), **nie den API-Token**.
- Kein QR-Scanner? Am Handy `http://<PC-Adresse>:8787/p` öffnen und den **6-stelligen Code** eintippen.
- Der Code gilt **10 Minuten** und **einmal**. Neuer Code jederzeit im Panel unter „📱 Handy“.
- Danach bleibt das Handy **180 Tage gekoppelt** (Cookie, auch nach einem Neustart von LiveFX). Im Panel lassen
  sich gekoppelte Geräte jederzeit **entfernen** – das Handy ist dann sofort abgemeldet.
- **Unterwegs / anderes Netz / Mobilfunk:** im Panel „🌐 Internet-Link starten“ (Cloudflare-Tunnel). Der QR-Code
  zeigt dann auf `https://…trycloudflare.com/p#…` – HTTPS, damit funktioniert auch das Handy-Mikrofon.
- Steht im Fenster „**LiveFX läuft schon**“, ist ein anderes LiveFX-Fenster offen – der Browser zeigt dieses
  Panel, ein zweiter Start ist nicht nötig.
- War Port 8787 von einem anderen Programm belegt, nimmt LiveFX den nächsten freien Port und **merkt ihn sich**
  (`data/server.json`), damit OBS-Adresse und Handy beim nächsten Start gleich bleiben.

### Erste Hilfe

| Problem | Lösung |
|---------|--------|
| Windows: „Der Computer wurde durch Windows geschützt“ | „Weitere Informationen“ → „Trotzdem ausführen“. Vermeiden: vor dem Entpacken Rechtsklick auf die ZIP → Eigenschaften → „Zulassen“. |
| Windows-Firewall fragt | „Zugriff zulassen“ (private Netzwerke). Später: Windows-Sicherheit → Firewall → „App durch Firewall zulassen“ → „Node.js JavaScript Runtime“ → Haken bei „Privat“. |
| macOS: „nicht verifizierter Entwickler“ | Rechtsklick (ctrl-Klick) auf `Start-LiveFX.command` → „Öffnen“ → „Öffnen“. Ab macOS 15: Systemeinstellungen → Datenschutz & Sicherheit → „Dennoch öffnen“. |
| macOS: „keine Berechtigung“ | Terminal öffnen, `bash ` tippen (mit Leerzeichen), die Datei hineinziehen, Enter. |
| Handy findet den PC nicht | Gleiches WLAN? Kein Gäste-WLAN (trennt Geräte)? VPN aus? Im Fenster stehen „Weitere Adressen dieses PCs“ – im Panel die andere Adresse wählen. Sonst „Internet-Link“. |
| QR-Code „abgelaufen“ / „schon benutzt“ | Im Panel unter „📱 Handy“ einen neuen anzeigen. |
| Nur am PC benutzen, kein Handy | `Start-LiveFX.bat --local` bzw. `node server.js --local`. |

### OBS

- **OBS auf demselben PC:** Browser-Quelle `http://127.0.0.1:8787/overlay.html` – wie bisher, kein Schlüssel nötig.
- **OBS auf einem anderen PC (2-PC-Setup):** die Adresse mit Schlüssel aus dem Startfenster bzw. dem Panel nehmen:
  `http://<PC-Adresse>:8787/overlay.html?key=<Overlay-Schlüssel>`. Der Schlüssel erlaubt nur das Overlay
  (Seite, Overlay-Ereignisse, hochgeladene Medien) – keine Steuerung, keinen Chat, keine Einstellungen.

### Optionen (für Fortgeschrittene)

| Aufruf | Wirkung |
|--------|---------|
| `node server.js` | wie die Startdatei, aber ohne Browser zu öffnen |
| `--open` | Panel nach dem Start im Browser öffnen (die Startdateien setzen es) |
| `--local` | nur dieser PC (`127.0.0.1`), kein Handy-Zugriff |
| `--lan` | im WLAN/LAN erreichbar (Standard) |
| `--port 8790` | fester Port |
| `--no-qr` | kein QR-Code im Fenster |
| `npm run start:open` / `npm run start:local` | Kurzformen |

Umgebungsvariablen: `HOST` (Bind-Adresse; `--local`/`--lan` haben Vorrang), `PORT`, `LIVEFX_DATA_DIR`,
`LIVEFX_TOKEN`, `LIVEFX_TLS_CERT`/`LIVEFX_TLS_KEY` (HTTPS, docs/HANDY-HTTPS.md), `LIVEFX_NO_QR=1`,
`LIVEFX_QR_ASCII=1` (QR aus `##` statt Blockzeichen – alte Windows-Konsole), `LIVEFX_QR_INVERT=1` (helles
Terminal ohne Farben), `LIVEFX_NO_BROWSER=1` (`--open` ignorieren).

### Sicherheit – was wer erreicht

LiveFX ist ab 2.3 standardmäßig im WLAN erreichbar (damit das Handy ohne Einstellungen klappt), aber nur
**gekoppelte Geräte** dürfen etwas tun:

| Wer | darf |
|-----|------|
| **Dieser PC** (127.0.0.1, auch OBS hier) | alles wie bisher (Panel, Overlay, API) |
| **Gekoppeltes Gerät** (Handy, zweiter PC – Cookie `livefx_dev`) | Panel, Fernbedienung, Kamera-Ansicht, API. Lesen genügt das Cookie; Schreiben braucht zusätzlich passenden `Origin` (CSRF-Schutz). Den API-Token sieht es nicht (`/api/config` ohne `token`). |
| **Overlay-Schlüssel** (`overlay.html?key=…`) | nur Overlay-Seite, Overlay-Ereignisse (`/events`, nicht `role=panel`), hochgeladene Medien – nur lesen |
| **Externe Tools** mit `Authorization: Bearer <Token>` | alles (Token in `data/token.txt`) |
| **Alle anderen im WLAN / über den Tunnel** | nur die Kopplungsseite `/p` (+ `POST /api/pair`), den alten Link `/m?token=…`, öffentliche Programmdateien (css/js/icons/memes/docs/vendor/models, Manifest, `sw.js`) und `/health` (nur `{ok, version}`). Seiten leiten auf `/p` um, alles andere: `401`. |

- Der **API-Token** steht nie in einem QR-Code, Link oder Cookie für andere Geräte. Der alte Link
  `/m?token=…` funktioniert weiter, legt aber ein **widerrufbares Gerät** an statt den Token als Cookie zu setzen.
- **Kopplungscodes:** 6 Ziffern + 128-Bit-Geheimnis, 10 Minuten, einmalig. Höchstens 10 Versuche pro Minute
  und Adresse (über den Tunnel zählt die Adresse des Besuchers, `cf-connecting-ip`), nach 20 Fehlversuchen insgesamt
  werden alle offenen Codes ungültig.
- **Geräte** stehen in `data/devices.json` (nur SHA-256 des Geheimnisses, Dateirechte 0600), Cookie 180 Tage,
  HttpOnly, SameSite=Lax (über den Tunnel zusätzlich Secure). Unbenutzt 180 Tage → automatisch entfernt.
- **Alles zurücksetzen:** LiveFX beenden, `data/token.txt` und `data/devices.json` löschen, neu starten. Dann sind
  alle Handys abgemeldet, alte `/m?token=`-Links und der Overlay-Schlüssel ungültig.

### Schnittstellen (für Entwickler)

| Route | Zweck |
|-------|-------|
| `GET /p`, `GET /p?next=camera\|panel` | Kopplungsseite (liest `#<geheim>` aus der Adresse, sonst Code-Eingabe) |
| `POST /api/pair` `{secret}` oder `{code, name?}` | Code einlösen → `Set-Cookie: livefx_dev=…`, `{ok, device, redirect}` (offen, same-origin, 10/min) |
| `POST /api/pairing` `{next?}` | neuer Kopplungscode (Auth) |
| `GET /api/setup` (`?new=1`) | alles für den Einrichtungs-Assistenten: `lanUrls`, `bestLanUrl`, `panelUrl`, `overlayUrls`, `cameraUrl`, `tunnel{state,url,error,pairingUrl}`, `pairing{url,lanUrl,tunnelUrl,cameraUrl,manualUrl,code,expiresAt,ttlMs,via,reason}`, `devices`, `lan{listening,bind,ips,port}`, `version` (Auth) |
| `GET /api/devices` · `DELETE /api/devices/<id>` · `DELETE /api/devices?all=1` | Geräte auflisten / entfernen (Auth) |
| `GET /api/tunnel` · `POST /api/tunnel/start` · `POST /api/tunnel/stop` | Internet-Link; `phoneUrl` = Kopplungslink auf der Tunnel-Adresse (Auth) |

Panels bekommen über `/events?role=panel` live `{type:'pairing', event:'paired'|'revoked', …}`.

## Türkçe

### 2 dakikada hazır

1. **ZIP’i aç** (Windows: sağ tık → „Tümünü ayıkla…“). ZIP’in içinden başlatma.
2. `start` klasöründe **çift tıkla**: Windows `Start-LiveFX.bat`, macOS `Start-LiveFX.command`, Linux `start.sh`.
3. **Panel tarayıcıda açılır** (`http://127.0.0.1:8787/`). Siyah pencere yayın boyunca açık kalsın; kapatmak
   LiveFX’i durdurur.
4. **Telefonu eşleştir:** başlangıç penceresindeki veya paneldeki („📱 Handy“) **QR kodu** telefon kamerasıyla
   tara – kumanda açılır.

- Node.js yoksa pencere ne yapılacağını söyler ve <https://nodejs.org/de/download> açılır: **LTS** kur
  (Windows’ta hızlıca: `winget install OpenJS.NodeJS.LTS`, Mac: `brew install node`), sonra tekrar çift tıkla.
- **Kurulumsuz Node:** Node arşivini aç, klasörün adını `node` yap ve LiveFX klasörüne koy
  (`LiveFX\node\node.exe` veya `LiveFX/node/bin/node`).
- QR kod yalnızca bir **eşleştirme kodu** taşır, **API token’ı asla**. Kod **10 dakika** ve **tek kullanımlık**;
  telefon **180 gün** eşleşmiş kalır, panelden istediğin an silebilirsin.
- QR tarayıcı yoksa: telefonda `http://<PC-adresi>:8787/p` aç ve **6 haneli kodu** yaz.
- **Farklı ağ / mobil veri:** panelde „🌐 Internet-Link starten“ – QR kod `https://…trycloudflare.com/p#…`
  adresine gider (HTTPS, telefon mikrofonu da çalışır).
- **Windows Güvenlik Duvarı** sorarsa „Erişime izin ver“ (özel ağlar). **Mac** „doğrulanmamış geliştirici“
  derse: sağ tık → „Aç“ → „Aç“ (macOS 15+: Sistem Ayarları → Gizlilik ve Güvenlik → „Yine de Aç“).
- **OBS aynı PC’de:** `http://127.0.0.1:8787/overlay.html`. **OBS başka PC’de:** pencerede/panelde gösterilen
  `…/overlay.html?key=…` adresini kullan (anahtar yalnızca overlay’i açar).
- Sadece bu PC (telefonsuz): `node server.js --local`.
- **Güvenlik:** Wi‑Fi’deki eşleşmemiş cihazlar yalnızca eşleştirme sayfasını (`/p`), genel program dosyalarını ve
  `/health` görür; geri kalan her şey `401`. Her şeyi sıfırlamak için LiveFX’i kapat, `data/token.txt` ve
  `data/devices.json` dosyalarını sil, yeniden başlat.

## English

### Ready in 2 minutes

1. **Unzip** (Windows: right-click → “Extract All…”). Do not run it from inside the ZIP.
2. **Double-click** in the `start` folder: Windows `Start-LiveFX.bat`, macOS `Start-LiveFX.command`,
   Linux `start.sh`.
3. The **panel opens in your browser** (`http://127.0.0.1:8787/`). Keep the black window open while streaming;
   closing it stops LiveFX.
4. **Pair your phone:** scan the **QR code** in the start window or in the panel (“📱 Handy”) with the phone
   camera – the remote opens.

- Without Node.js the window explains the next steps and opens <https://nodejs.org/de/download>: install **LTS**
  (Windows: `winget install OpenJS.NodeJS.LTS`, Mac: `brew install node`) and double-click again.
- **Portable Node:** unzip the official Node archive, rename the folder to `node` and put it into the LiveFX
  folder (`LiveFX\node\node.exe` or `LiveFX/node/bin/node`). The launchers never download anything.
- The QR code carries a one-time **pairing code** only – **never the API token**. It is valid for **10 minutes**,
  **once**; the phone then stays paired for **180 days** and can be removed in the panel at any time.
- No QR scanner: open `http://<pc-address>:8787/p` on the phone and type the **6-digit code**.
- **Other network / mobile data:** “🌐 Internet-Link starten” in the panel – the QR code then points to
  `https://…trycloudflare.com/p#…` (HTTPS, so the phone microphone works too).
- **Windows Firewall** asks: “Allow access” (private networks). **macOS** “unidentified developer”: right-click →
  “Open” → “Open” (macOS 15+: System Settings → Privacy & Security → “Open Anyway”).
- **OBS on the same PC:** `http://127.0.0.1:8787/overlay.html`. **OBS on another PC:** use the
  `…/overlay.html?key=…` address shown in the start window / panel (the key opens the overlay only, read-only).
- This PC only (no phone): `node server.js --local`. Options: `--open`, `--lan` (default), `--port <n>`, `--no-qr`.
- **Security:** unpaired devices in the Wi‑Fi (or through the tunnel) only reach the pairing page (`/p`,
  `POST /api/pair`), the legacy `/m?token=` link, public static files and a minimal `/health`; pages redirect to
  `/p`, everything else is `401`. Paired devices use an HttpOnly, SameSite=Lax cookie (`livefx_dev`, 180 days,
  stored hashed in `data/devices.json`); writes additionally need a matching `Origin`. To reset everything, stop
  LiveFX, delete `data/token.txt` and `data/devices.json`, start again.
