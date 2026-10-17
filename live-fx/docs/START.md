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

### QR-Codes überall

Wo eine Adresse auf ein anderes Gerät muss, steht ein QR-Code: im **Startfenster**, im **Start-Assistenten**
(Schritt 0 „📱 Handy verbinden“, beim ersten Start hervorgehoben), in der Karte **📱 Handy**, hinter dem Knopf
**📱 Handy** oben rechts, in der **Kamera-Ansicht** („📱 Fernbedienung“), im OBS-Schritt (Overlay-Adresse für einen
2. PC oder eine Streaming-App am Handy) und auf der **🖨 Einrichtungskarte** zum Ausdrucken oder als Bild. Nach dem
Koppeln führt das Handy durch 4 kurze Schritte (verbunden → Paket → Test-Effekt → fertig); „➕ Weiteres Handy
koppeln“ am Handy zeigt den QR-Code fürs nächste Handy. Kommt nach 25 s kein Handy, bietet der Assistent **einen**
Knopf „🌐 Internet-Link starten“ an.

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
  zeigt dann auf `https://…trycloudflare.com/p#…` – HTTPS, damit funktioniert auch das Handy-Mikrofon. Live-Updates
  laufen dort von selbst per Long-Polling (Cloudflare-Schnelltunnel lassen kein SSE durch) – nichts einzustellen.
- Steht im Fenster „**LiveFX läuft schon**“, ist ein anderes LiveFX-Fenster offen – der Browser zeigt dieses
  Panel, ein zweiter Start ist nicht nötig.
- War Port 8787 von einem anderen Programm belegt, nimmt LiveFX den nächsten freien Port und **merkt ihn sich**
  (`data/server.json`), damit OBS-Adresse und Handy beim nächsten Start gleich bleiben.

### Erste Hilfe

| Problem | Lösung |
|---------|--------|
| Windows: „Der Computer wurde durch Windows geschützt“ | „Weitere Informationen“ → „Trotzdem ausführen“. Vermeiden: vor dem Entpacken Rechtsklick auf die ZIP → Eigenschaften → „Zulassen“. |
| Windows-Firewall fragt | „Zugriff zulassen“ (private Netzwerke). Später: Windows-Sicherheit → Firewall → „App durch Firewall zulassen“ → „Node.js JavaScript Runtime“ → Haken bei „Privat“. |
| Windows: Firewall erlaubt, QR tut trotzdem nichts | Windows 11 stellt ein neues WLAN oft auf **„Öffentlich“** – dann gilt „privat zulassen“ nicht. Einstellungen → Netzwerk und Internet → WLAN → dein Netz → Netzwerkprofil **„Privat“** (oder in der Firewall-Frage zusätzlich „Öffentliche Netzwerke“ ankreuzen). |
| macOS: **„Start-LiveFX.command“ ist beschädigt und kann nicht geöffnet werden** | Die Datei ist nicht kaputt – macOS sperrt nicht signierte Startdateien aus dem Internet (Quarantäne-Markierung). „Abbrechen“ klicken (**nicht** in den Papierkorb). Einmalig: Terminal öffnen (⌘ + Leertaste → „Terminal“) → `xattr -cr ` tippen (mit Leerzeichen) → den LiveFX-Ordner (`live-fx`) hineinziehen → Enter. Danach startet `Start-LiveFX.command` per Doppelklick. Kurzfassung: `start/MAC-HILFE.txt`. |
| macOS: „nicht verifizierter Entwickler“ / „Apple konnte nicht überprüfen …“ | Wie oben (`xattr -cr` + Ordner) – oder Systemeinstellungen → Datenschutz & Sicherheit → ganz unten „Dennoch öffnen“ (bis macOS 14: Rechtsklick → „Öffnen“ → „Öffnen“). |
| macOS: „keine Berechtigung“ oder nichts hilft | Terminal öffnen, `bash ` tippen (mit Leerzeichen), die Datei `start/start.sh` hineinziehen, Enter – das startet LiveFX immer. |
| macOS: „Terminal möchte auf ‚Downloads‘ zugreifen“ / „Eingehende Verbindungen erlauben?“ | „Erlauben“. |
| Handy findet den PC nicht | Gleiches WLAN? Kein Gäste-WLAN (trennt Geräte)? VPN aus? Im Fenster stehen „Weitere Adressen dieses PCs“ – im Panel die andere Adresse wählen. Sonst „Internet-Link“. |
| QR-Code „abgelaufen“ / „schon benutzt“ | Im Panel unter „📱 Handy“ einen neuen anzeigen. |
| „Zu viele Fehlversuche“ | Nach 20 falschen Codes ist das **Eintippen** 5 Minuten gesperrt. Den QR-Code scannen geht weiter – oder im Panel „Neuer Code“ klicken, dann klappt auch das Eintippen sofort wieder. |
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

LiveFX ist ab 2.4 standardmäßig im WLAN erreichbar (damit das Handy ohne Einstellungen klappt), aber nur
**gekoppelte Geräte** dürfen etwas tun:

| Wer | darf |
|-----|------|
| **Dieser PC** (127.0.0.1, auch OBS hier) | alles wie bisher (Panel, Overlay, API) |
| **Gekoppeltes Gerät** (Handy, zweiter PC – Cookie `livefx_dev`) | Panel, Fernbedienung, Kamera-Ansicht, API. Lesen genügt das Cookie; Schreiben braucht zusätzlich passenden `Origin` (CSRF-Schutz). Den API-Token sieht es nicht (`/api/config` ohne `token`). |
| **Overlay-Schlüssel** (`overlay.html?key=…`) | nur Overlay-Seite, Overlay-Ereignisse (`/events`, nicht `role=panel`), hochgeladene Medien – nur lesen |
| **Externe Tools** mit `Authorization: Bearer <Token>` | alles (Token in `data/token.txt`) |
| **Alle anderen im WLAN / über den Tunnel** | nur die Kopplungsseite `/p` (= `pair.html`, + `POST /api/pair`), den alten Link `/m?token=…`, öffentliche Programmdateien (css/js/icons/memes/docs/vendor/models, beide Manifeste, `sw.js`) und `/health` (nur `{ok, version}`). Seiten leiten auf `/p` um, alles andere: `401`. |

- Der **API-Token** steht nie in einem QR-Code, Link oder Cookie für andere Geräte. Der alte Link
  `/m?token=…` funktioniert weiter, legt aber ein **widerrufbares Gerät** an statt den Token als Cookie zu setzen.
- **Kopplungscodes:** 6 Ziffern + 128-Bit-Geheimnis, 10 Minuten, einmalig. Höchstens 10 Versuche pro Minute
  und Adresse (über den Tunnel zählt die Adresse des Besuchers, `cf-connecting-ip`). Nach 20 Fehlversuchen insgesamt
  werden alle offenen Codes ungültig (Antwort `locked`, nicht „Code falsch“) und **getippte Codes 5 Minuten
  abgelehnt** – auch neue, die das Panel in der Zeit anzeigt. Das 128-Bit-Geheimnis im QR-Code gilt weiter; „Neuer
  Code“ im Panel (`POST /api/pairing`, `/api/setup?new=1`) hebt die Sperre sofort auf. So bringen wechselnde
  Adressen (IPv6 über den Tunnel) höchstens 20 Versuche pro Sperre.
- **Gerät entfernen** wirkt sofort: auch eine offene Live-Verbindung (`/events`, `/events/poll`) des Geräts wird getrennt.
- **Geräte** stehen in `data/devices.json` (nur SHA-256 des Geheimnisses, Dateirechte 0600), Cookie 180 Tage,
  HttpOnly, SameSite=Lax (über den Tunnel zusätzlich Secure). Unbenutzt 180 Tage → automatisch entfernt.
- **Alles zurücksetzen:** LiveFX beenden, `data/token.txt` und `data/devices.json` löschen, neu starten. Dann sind
  alle Handys abgemeldet, alte `/m?token=`-Links und der Overlay-Schlüssel ungültig.

### Schnittstellen (für Entwickler)

| Route | Zweck |
|-------|-------|
| `GET /p`, `GET /p?next=camera\|panel` | Kopplungsseite `pair.html` + `js/pair.js` (strenge CSP; liest `#<geheim>` aus der Adresse, sonst Code-Eingabe). Offen sind auch `/pair.html` und `/mobile.webmanifest` (Startbildschirm-App) |
| `POST /api/pair` `{secret}` oder `{code, name?}` | Code einlösen → `Set-Cookie: livefx_dev=…`, `{ok, device, redirect}` (offen, same-origin, 10/min); Fehler `400 invalid_code\|expired\|used`, `429 rate_limited\|locked` (+ `Retry-After`) |
| `POST /api/pairing` `{next?}` | neuer Kopplungscode, hebt eine Eingabe-Sperre auf (Auth) |
| `GET /api/setup` (`?new=1`) | alles für den Einrichtungs-Assistenten: `lanUrls`, `bestLanUrl`, `panelUrl`, `overlayUrls`, `cameraUrl`, `tunnel{state,url,error,pairingUrl}`, `pairing{url,lanUrl,tunnelUrl,cameraUrl,manualUrl,code,expiresAt,ttlMs,via,reason,locked}`, `devices`, `lan{listening,bind,ips,port}`, `version` (Auth) |
| `GET /api/devices` · `DELETE /api/devices/<id>` · `DELETE /api/devices?all=1` | Geräte auflisten / entfernen (Auth) |
| `GET /api/tunnel` · `POST /api/tunnel/start` · `POST /api/tunnel/stop` | Internet-Link; `phoneUrl` = Kopplungslink auf der Tunnel-Adresse (Auth) |
| `GET /events/poll?role=&since=&wait=&cid=` | Long-Polling-Ersatz für `/events` (gleiche Regeln, wartet bis 25 s) – über den Internet-Link automatisch, weil Cloudflare-Schnelltunnel kein SSE durchlassen; `?transport=poll` an einer Seite erzwingt es (2.4) |

Panels bekommen über `/events?role=panel` live `{type:'pairing', event:'paired'|'revoked'|'locked', …}`.

## Türkçe

### 2 dakikada hazır

1. **ZIP’i aç** (Windows: sağ tık → „Tümünü ayıkla…“). ZIP’in içinden başlatma.
2. `start` klasöründe **çift tıkla**: Windows `Start-LiveFX.bat`, macOS `Start-LiveFX.command`, Linux `start.sh`.
3. **Panel tarayıcıda açılır** (`http://127.0.0.1:8787/`). Siyah pencere yayın boyunca açık kalsın; kapatmak
   LiveFX’i durdurur.
4. **Telefonu eşleştir:** başlangıç penceresindeki veya paneldeki („📱 Handy“) **QR kodu** telefon kamerasıyla
   tara – kumanda açılır.

- **QR kod her yerde:** başlangıç penceresi, asistanın 0. adımı „📱 Handy verbinden“, „📱 Handy“ kartı ve sağ üstteki
  düğme, kamera görünümü („📱 Fernbedienung“), OBS adımı (2. PC / telefon yayın uygulaması için overlay adresi) ve
  yazdırılabilir **🖨 Einrichtungskarte**. Eşleştirmeden sonra telefon 4 kısa adımda yol gösterir.
- Node.js yoksa pencere ne yapılacağını söyler ve <https://nodejs.org/de/download> açılır: **LTS** kur
  (Windows’ta hızlıca: `winget install OpenJS.NodeJS.LTS`, Mac: `brew install node`), sonra tekrar çift tıkla.
- **Kurulumsuz Node:** Node arşivini aç, klasörün adını `node` yap ve LiveFX klasörüne koy
  (`LiveFX\node\node.exe` veya `LiveFX/node/bin/node`).
- QR kod yalnızca bir **eşleştirme kodu** taşır, **API token’ı asla**. Kod **10 dakika** ve **tek kullanımlık**;
  telefon **180 gün** eşleşmiş kalır, panelden istediğin an silebilirsin.
- QR tarayıcı yoksa: telefonda `http://<PC-adresi>:8787/p` aç ve **6 haneli kodu** yaz.
- **Farklı ağ / mobil veri:** panelde „🌐 Internet-Link starten“ – QR kod `https://…trycloudflare.com/p#…`
  adresine gider (HTTPS, telefon mikrofonu da çalışır). Canlı güncellemeler orada kendiliğinden long-polling ile gelir.
- **Windows Güvenlik Duvarı** sorarsa „Erişime izin ver“ (özel ağlar). İzin verdin ama QR yine bir şey yapmıyor mu?
  Windows 11 yeni Wi‑Fi’yi çoğu zaman **„Ortak“** yapar: Ayarlar → Ağ ve İnternet → Wi‑Fi → ağın → Ağ profili
  **„Özel“** (ya da güvenlik duvarı sorusunda „Ortak ağlar“ı da işaretle).
- 20 yanlış kod yazılırsa **kod yazma** 5 dakika kilitlenir (QR kodu taramak çalışır; panelde „Neuer Code“ kilidi
  hemen kaldırır). Panelden silinen cihazın bağlantısı anında kesilir.
- **Mac** „… hasarlı ve açılamıyor“ ya da „doğrulanmamış geliştirici“ derse: dosya bozuk **değil** – macOS
  internetten gelen imzasız başlatma dosyalarını engelliyor. „Vazgeç“e bas (Çöp Sepeti’ne taşıma). Bir kez:
  Terminal’i aç (⌘ + boşluk → „Terminal“) → `xattr -cr ` yaz (boşlukla) → LiveFX klasörünü (`live-fx`) sürükle →
  Enter; sonra `Start-LiveFX.command` çift tıkla çalışır. Ya da Terminal’de `bash ` + `start/start.sh` sürükle → Enter.
  (Sadece „doğrulanmamış geliştirici“de: Sistem Ayarları → Gizlilik ve Güvenlik → „Yine de Aç“.) Kısa: `start/MAC-HILFE.txt`.
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

- **QR codes everywhere:** the start window, assistant step 0 “📱 Handy verbinden”, the “📱 Handy” card and the
  header button, the camera view (“📱 Fernbedienung”), the OBS step (overlay address for a 2nd PC / a phone streaming
  app) and the printable **🖨 setup card**. After pairing, the phone walks you through 4 short steps.
- Without Node.js the window explains the next steps and opens <https://nodejs.org/de/download>: install **LTS**
  (Windows: `winget install OpenJS.NodeJS.LTS`, Mac: `brew install node`) and double-click again.
- **Portable Node:** unzip the official Node archive, rename the folder to `node` and put it into the LiveFX
  folder (`LiveFX\node\node.exe` or `LiveFX/node/bin/node`). The launchers never download anything.
- The QR code carries a one-time **pairing code** only – **never the API token**. It is valid for **10 minutes**,
  **once**; the phone then stays paired for **180 days** and can be removed in the panel at any time.
- No QR scanner: open `http://<pc-address>:8787/p` on the phone and type the **6-digit code**.
- **Other network / mobile data:** “🌐 Internet-Link starten” in the panel – the QR code then points to
  `https://…trycloudflare.com/p#…` (HTTPS, so the phone microphone works too). Live updates use long-polling there
  by themselves (Cloudflare Quick Tunnels do not pass Server-Sent Events).
- **Windows Firewall** asks: “Allow access” (private networks). Allowed, but the QR code still does nothing?
  Windows 11 often marks a new Wi‑Fi as **“Public”**: Settings → Network & internet → Wi‑Fi → your network →
  Network profile **“Private”** (or also tick “Public networks” in the firewall prompt).
- 20 wrong typed codes lock **typing** for 5 minutes (scanning the QR code still works; “Neuer Code” in the panel
  lifts the lock). Removing a device in the panel disconnects it at once.
- **macOS** “… is damaged and can’t be opened” or “unidentified developer”: the file is **not** broken – macOS
  blocks unsigned start files downloaded from the internet. Click “Cancel” (don’t move it to the Trash). Once: open
  Terminal (⌘ + Space → “Terminal”) → type `xattr -cr ` (with a space) → drag the LiveFX folder (`live-fx`) in →
  Enter; then `Start-LiveFX.command` works by double-click. Or in Terminal: `bash ` + drag `start/start.sh` → Enter.
  (“Unidentified developer” only: System Settings → Privacy & Security → “Open Anyway”.) Short: `start/MAC-HILFE.txt`.
- **OBS on the same PC:** `http://127.0.0.1:8787/overlay.html`. **OBS on another PC:** use the
  `…/overlay.html?key=…` address shown in the start window / panel (the key opens the overlay only, read-only).
- This PC only (no phone): `node server.js --local`. Options: `--open`, `--lan` (default), `--port <n>`, `--no-qr`.
- **Security:** unpaired devices in the Wi‑Fi (or through the tunnel) only reach the pairing page (`/p`,
  `POST /api/pair`), the legacy `/m?token=` link, public static files and a minimal `/health`; pages redirect to
  `/p`, everything else is `401`. Paired devices use an HttpOnly, SameSite=Lax cookie (`livefx_dev`, 180 days,
  stored hashed in `data/devices.json`); writes additionally need a matching `Origin`. To reset everything, stop
  LiveFX, delete `data/token.txt` and `data/devices.json`, start again.
