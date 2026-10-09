# LiveFX am Handy – Fernbedienung, Spiegel und App · Telefonda LiveFX · LiveFX on your phone

- [🇩🇪 Deutsch](#deutsch)
- [🇹🇷 Türkçe](#türkçe)
- [🇬🇧 English](#english)

---

## Deutsch

Das Handy wird zur Fernbedienung für das Overlay: alle Trigger als große Kacheln, die Szenen des
Story-Modus, Pause und Lautstärke – und optional das Handy-Mikro als Spracherkennung. Die Seite läuft
im normalen Browser und lässt sich wie eine App auf den Startbildschirm legen (PWA). **Keine App, nichts
abtippen: QR-Code scannen, fertig.**

### 1. Koppeln per QR-Code (empfohlen)

1. LiveFX starten (Doppelklick auf `start/Start-LiveFX.bat` bzw. `start/Start-LiveFX.command`, siehe
   [START.md](START.md)). Das Panel öffnet sich im Browser.
2. Ganz oben im **🚀 Start-Assistenten** steht Schritt 0 **„📱 Handy verbinden“** mit einem großen QR-Code.
   Denselben QR-Code gibt es in der Karte **📱 Handy**, über den Knopf **📱 Handy** oben rechts (von überall im Panel),
   in der Kamera-Ansicht (**📱 Fernbedienung**) und im schwarzen Startfenster.
3. **Handy-Kamera** auf den QR-Code halten → Link antippen. Das Handy meldet sich an und öffnet die Fernbedienung.
4. Im Panel springt der Status auf **„✔ Handy verbunden: iPhone · Safari“** (bzw. Android · Chrome …), Schritt 0
   wird grün, der Punkt am Knopf **📱 Handy** oben ebenfalls.

Gut zu wissen:

- Der QR-Code enthält nur einen **Einmal-Code** (`http://<PC>:8787/p#…`), **nie deinen API-Token**. Er gilt
  **10 Minuten** und **einmal**; danach zeigt das Panel automatisch einen neuen (Countdown unter dem Code).
  „🔄 Neuer Code“ erzeugt sofort einen frischen.
- **Kein QR-Scanner?** Unter dem QR-Code steht z. B. „Am Handy `http://192.168.178.23:8787/p` öffnen und den Code
  **482 913** eintippen“ – das Handy zeigt dafür ein Eingabefeld.
- **Mehrere Adressen** (WLAN, Docker, VPN …): LiveFX nimmt die wahrscheinlichste. Klappt es nicht, unter dem QR-Code
  bei „Andere Adresse probieren“ die nächste wählen.
- Einmal gekoppelt, bleibt das Handy **180 Tage** angemeldet – auch nach einem Neustart von LiveFX.
- **🖨 Einrichtungskarte**: druckbare Karte (A6/A5) oder Bild (PNG) mit Handy-QR + Code und Overlay-QR, dazu drei
  Zeilen Anleitung auf Deutsch, Türkçe und English. Der Handy-Code darauf gilt nur kurz – für ein weiteres Handy die
  Karte neu erzeugen; die Overlay-Adresse bleibt gleich.
- Handy und PC im **selben WLAN** (kein Gäste-WLAN – das trennt Geräte voneinander). Fragt die Windows-Firewall beim
  ersten Start: **„Zugriff zulassen“** (private Netzwerke).

### 2. Handy in einem anderen Netz (mobile Daten, Gäste-WLAN, unterwegs)

Kommt nach **25 Sekunden** kein Handy, zeigt der Assistent den Hinweis **„📶 Handy in einem anderen Netz (z. B. mobile
Daten)? → Internet-Link“** mit **einem** Knopf: **🌐 Internet-Link starten**. LiveFX öffnet dann einen sicheren
Cloudflare-Link (https, kostenlos, ohne Konto) und **tauscht den QR-Code automatisch aus** – jetzt einfach noch einmal
scannen. „↩ WLAN-Code zeigen“ holt den WLAN-QR zurück. Erreicht das Handy den PC gar nicht über das WLAN (z. B.
LiveFX mit `--local` gestartet oder kein Netzwerk), erscheint der Knopf sofort. Mehr zum Internet-Link: Abschnitt 4a.

### 3. Gekoppelte Handys verwalten und entfernen

Unter dem QR-Code (Start-Assistent, Karte **📱 Handy**, Knopf **📱 Handy**) stehen alle gekoppelten Geräte mit
„zuletzt gesehen“. **„entfernen“** meldet das Gerät sofort ab – es braucht dann einen neuen QR-Code. Handy verloren
oder verkauft? Einfach entfernen. Alles zurücksetzen (alle Handys abmelden, neuer Token): LiveFX beenden,
`data/devices.json` und `data/token.txt` löschen, neu starten ([START.md](START.md)).

### 3a. Der alte Link (2.2)

Der Link `http://<LAN-IP>:<port>/m?token=…` aus älteren Versionen funktioniert weiter, legt aber ab 2.3 ein
widerrufbares Gerät an (steht dann auch in der Geräteliste). Neue Handys bitte per QR-Code koppeln – der enthält
den Token nicht.

### 4. Was die Handy-Seite kann

- **Kacheln**: alle Trigger aus dem Panel (gleiche Reihenfolge, gleiche Bilder). Tippen = Effekt im
  Overlay. Deaktivierte Trigger sind ausgegraut und feuern nicht.
- **Suchen**: filtert nach Name oder Stichwort.
- **⏸ Pause**: Tippen auf Kacheln löst nichts aus, bis du auf „▶ Weiter“ tippst. (Nur für das Handy –
  die Pause im Panel ist unabhängig.)
- **⭐ Favoriten** (2.2): Kachel **lange drücken** (oder auf den Stern tippen) → sie erscheint oben in der
  Favoriten-Reihe. Wird am Handy gespeichert (`localStorage`), bis zu 60 Stück.
- **🔉 Leiser / 🔊 Lauter**: ändert die Master-Lautstärke des Overlays um **±6 dB** (halb / doppelt so laut);
  die Prozentzahl dazwischen zeigt den aktuellen Wert – auch, wenn das Panel ihn ändert.
- **📖 Band an/aus** (2.2): blendet das Story-Band im Overlay ein (`storyLayout: 'band'`) oder zeigt Szenen
  wieder im Vollbild (`'full'`). **🎯 Zone** wechselt die Effekt-Zone (überall → Ränder → unten → oben).
- **✏️ Stil** (2.3): Story-Stil im Overlay – Gemischt → Zeichnung (der Zeichenfilm, `docs/SKETCH.md`) → Emoji.
  **📐 Band** (2.3): Band-Position im Hochformat – ganz unten ↔ über dem Chat. Beide Knöpfe zeigen, was die
  Overlays gerade nutzen (auch wenn das Panel es ändert).
- **📦 Pakete** (2.2): die Meme-Pakete als Kacheln – antippen lädt, nochmal antippen entfernt. Gleiche Logik
  wie im Panel (`js/packs-store.js`), die Änderung landet auf dem Server und sofort im Panel.
- **Szenen**: die Story-Szenen (Regen, Nacht, …) inklusive Atmosphäre-Loop – genau wie das Szenen-Pad
  im Panel. „Szene beenden“ blendet die Szene aus.
- **Statuszeile**: zeigt, was zuletzt gefeuert hat (auch von anderen Quellen wie Stream Deck) und
  Transkripte externer Spracherkennung.
- Änderungen an Triggern im Panel erscheinen sofort auch am Handy.

### 4b. Mikro am Handy (optional)

Der Knopf **🎙️ Mikro** startet die Spracherkennung des Handy-Browsers und feuert erkannte Stichwörter
direkt ins Overlay. Browser erlauben das Mikro nur auf **sicheren Seiten** – also `https://` oder
`localhost`. Über `http://192.168.…` ist der Knopf ausgegraut. Die Fernbedienung funktioniert trotzdem.

Der einfachste Weg zu HTTPS ist der **Internet-Link** (nächster Abschnitt) – er ist immer `https://`.
Alternativ ein eigenes Zertifikat: `docs/HANDY-HTTPS.md` (`LIVEFX_TLS_CERT` / `LIVEFX_TLS_KEY`, Zertifikat
am Handy vertrauen). Die Sprache richtet sich nach der Handy-Sprache (Deutsch, Türkçe, English); die
Toleranz ist „mittel“. Alternative ohne HTTPS: Mikro am PC im Panel nutzen, das Handy nur als Soundboard.

### 4a. Internet-Fernzugriff (2.2) – Handy im Mobilfunk, HTTPS ohne Zertifikat

Der Knopf **🌐 Internet-Link starten** (im Hinweis von Schritt 0 und in der Karte **📱 Handy**) startet einen
**Cloudflare-Schnelltunnel** (`cloudflared tunnel --url http://127.0.0.1:8787`): kostenlos, ohne Konto, ohne
Port-Weiterleitung. Nach ein paar Sekunden zeigt der QR-Code auf eine Adresse wie
`https://lazy-otter-brave-cat.trycloudflare.com/p#…`. Damit erreicht das Handy LiveFX **aus jedem Netz** (Mobilfunk,
Café-WLAN, Gast-WLAN mit Client-Isolation) – und weil der Link `https://` ist, funktioniert auch das **🎙️ Mikro am
Handy** ohne eigenes Zertifikat.

- Beim **ersten Start** lädt LiveFX das Programm `cloudflared` einmalig herunter (offizielles GitHub-Release
  von Cloudflare, ca. 40 MB) nach `<Datenordner>/bin/cloudflared` und prüft die **SHA-256-Prüfsumme** gegen die
  veröffentlichte. Ist `cloudflared` schon installiert (im `PATH` oder per `LIVEFX_CLOUDFLARED=<Pfad>`), wird
  das genommen.
- Die zufällige Adresse gilt, **solange der Server läuft**; „Internet-Link stoppen“ (Karte **📱 Handy**) oder das
  Beenden von LiveFX beendet den Tunnel. Schon gekoppelte Handys müssen für den Tunnel einmal neu scannen (andere
  Adresse = anderes Cookie).
- **Sicherheit**: Durch den Tunnel kommt ohne Kopplung nur die Kopplungsseite – Panel, Fernbedienung und API
  brauchen ein gekoppeltes Gerät (oder den Bearer-Token). Den QR-Code trotzdem nicht im Stream zeigen.
- API: `GET /api/tunnel` (Status), `POST /api/tunnel/start`, `POST /api/tunnel/stop`.

**Kein Internet am PC / Download klappt nicht?**

- **Hotspot-Trick**: Am Handy den **persönlichen Hotspot** einschalten und den PC damit verbinden. Jetzt sind
  Handy und PC im selben (Handy-)Netz – der normale **WLAN-QR-Code** funktioniert, ganz ohne Tunnel (Adresse meist
  `172.20.10.x` beim iPhone, `192.168.43.x` bei Android).
- **Download von Hand**: `cloudflared` für dein System von
  <https://github.com/cloudflare/cloudflared/releases/latest> laden (Windows: `cloudflared-windows-amd64.exe`,
  Mac: `cloudflared-darwin-arm64.tgz` bzw. `-amd64.tgz` entpacken, Linux: `cloudflared-linux-amd64` bzw.
  `-arm64`), die Datei als `cloudflared` (Windows: `cloudflared.exe`) in den Ordner `data/bin/` legen und
  ausführbar machen (`chmod +x`) – oder `LIVEFX_CLOUDFLARED=/pfad/zu/cloudflared node server.js`. Alternativ per
  Paketmanager: `winget install Cloudflare.cloudflared`, `brew install cloudflared`, `apt install cloudflared`.
- Firewall/Firmennetz blockt ausgehende Verbindungen? Dann bleibt der Hotspot-Trick.

### 5. Als App auf den Startbildschirm

- **Android/Chrome**: Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
- **iPhone/Safari**: Teilen-Symbol → „Zum Home-Bildschirm“.

Danach startet LiveFX ohne Browserleiste. Die Oberfläche wird vom Service Worker zwischengespeichert und öffnet auch
ohne Netz – Effekte brauchen aber natürlich den laufenden Server. Nach einem LiveFX-Update einmal neu laden.

### 6. Fehlerhilfe

| Problem | Lösung |
| --- | --- |
| QR gescannt, Seite lädt nicht | Gleiches WLAN? Kein Gäste-WLAN, VPN am Handy aus? Windows-Firewall „Zugriff zulassen“ (privat)? Unter dem QR „Andere Adresse probieren“ – oder **🌐 Internet-Link starten**. |
| „Code abgelaufen“ / „schon benutzt“ | Im Panel „🔄 Neuer Code“ oder einfach den neuen QR scannen (er erneuert sich selbst). |
| „Zu viele Versuche“ | Eine Minute warten, dann den QR-Code scannen statt zu tippen. |
| Status bleibt „Warte auf dein Handy …“ | Das Handy hat den Link nicht geöffnet (Link antippen!) oder ist in einem anderen Netz → Internet-Link. |
| Schritt 0 zeigt „Handy-Zugriff ist aus“ | LiveFX wurde mit `--local` / `HOST=127.0.0.1` gestartet → normal starten oder Internet-Link. |
| Handy plötzlich abgemeldet | Im Panel „entfernt“? Browser-Daten am Handy gelöscht? → neu scannen. |
| Kachel tippen, nichts passiert | Pause aktiv? Trigger deaktiviert (grau)? Ist ein Overlay geöffnet (OBS-Browserquelle oder Vorschau)? |
| Mikro-Knopf grau | Seite ist nicht HTTPS – Internet-Link (Abschnitt 4a) nutzen oder Zertifikat (Abschnitt 4b). |
| Internet-Link: „Fehler … konnte nicht geladen werden“ | PC ohne Internet oder GitHub geblockt → Download von Hand oder Hotspot-Trick (Abschnitt 4a). |
| Internet-Link: „keine Adresse gemeldet“ | Firewall blockt `cloudflared` (ausgehend 7844/443) – Firewall fragen oder Hotspot-Trick. |
| Alte Version nach Update | Seite neu laden; notfalls in den Browser-Einstellungen die Website-Daten für die Adresse löschen. |
| Kein Ton am Handy | Gewollt: Sounds spielt das Overlay (OBS), nicht das Handy. |

---

## Türkçe

Telefon overlay için uzaktan kumanda olur: tüm tetikleyiciler büyük kutucuklar halinde, Story sahneleri, duraklatma ve
ses – istersen telefon mikrofonu da konuşma tanıma olarak. **Uygulama yok, yazı yazmak yok: QR kodu tara, bitti.**

### 1. QR kodla eşleştirme (önerilen)

1. LiveFX'i başlat (`start/Start-LiveFX.bat` veya `start/Start-LiveFX.command` dosyasına çift tıkla, bkz.
   [START.md](START.md#türkçe)). Panel tarayıcıda açılır.
2. **🚀 Start-Assistent**'in en üstünde 0. adım **„📱 Handy verbinden“** büyük bir QR kod gösterir. Aynı QR kod
   **📱 Handy** kartında, sağ üstteki **📱 Handy** düğmesinde (panelin her yerinden), kamera görünümünde
   (**📱 Fernbedienung**) ve siyah başlangıç penceresinde de var.
3. **Telefon kamerasını** QR koda tut → bağlantıya dokun. Telefon eşleşir ve kumandayı açar.
4. Panelde durum **„✔ Handy verbunden: iPhone · Safari“** olur, 0. adım yeşile döner.

- QR kod yalnızca **tek kullanımlık bir kod** taşır (`…/p#…`), **API anahtarını (token) asla**. **10 dakika** ve
  **bir kez** geçerlidir; süre dolunca panel kendiliğinden yenisini gösterir. „🔄 Neuer Code“ hemen yeni kod üretir.
- **QR okuyucu yok mu?** QR'ın altındaki adresi (ör. `http://192.168.178.23:8787/p`) telefonda aç ve **6 haneli kodu**
  yaz.
- Birden fazla adres varsa ve bağlanmıyorsa QR'ın altında „Andere Adresse probieren“ ile diğerini seç.
- Bir kez eşleşen telefon **180 gün** bağlı kalır (LiveFX yeniden başlasa bile).
- **🖨 Einrichtungskarte**: telefon QR'ı + kod ve overlay QR'ı olan, DE/TR/EN üç satırlık talimatlı yazdırılabilir kart
  (A6/A5) veya resim (PNG).
- Telefon ve PC **aynı Wi‑Fi**'de olmalı (misafir ağı cihazları ayırır). Windows güvenlik duvarı sorarsa
  **„Erişime izin ver“** (özel ağlar).

### 2. Telefon başka bir ağda (mobil veri, misafir Wi‑Fi, dışarıda)

**25 saniye** içinde telefon bağlanmazsa asistan **„📶 Handy in einem anderen Netz (z. B. mobile Daten)? →
Internet-Link“** ipucunu ve **tek** bir düğme gösterir: **🌐 Internet-Link starten**. LiveFX güvenli bir Cloudflare
bağlantısı (https, ücretsiz, hesapsız) açar ve **QR kodu otomatik değiştirir** – yeniden tara. „↩ WLAN-Code zeigen“
Wi‑Fi QR'ına geri döner. İlk seferde LiveFX `cloudflared` programını (~40 MB) bir kez indirir. İnternet yoksa: telefonda
**kişisel erişim noktası** aç, PC'yi ona bağla, Wi‑Fi QR'ı çalışır.

### 3. Eşleşmiş telefonları yönetmek ve kaldırmak

QR kodun altında tüm eşleşmiş cihazlar „son görülme“ ile listelenir. **„entfernen“** cihazın oturumunu hemen kapatır –
yeniden bağlanmak için yeni bir QR gerekir. Telefon kayıp mı? Sadece kaldır. Her şeyi sıfırlamak için: LiveFX'i kapat,
`data/devices.json` ve `data/token.txt` dosyalarını sil, yeniden başlat.

### 4. Sorun giderme

| Sorun | Çözüm |
| --- | --- |
| QR tarandı, sayfa açılmıyor | Aynı Wi‑Fi mi? Misafir ağı/VPN kapalı mı? Güvenlik duvarında izin? „Andere Adresse probieren“ – ya da **🌐 Internet-Link starten**. |
| „Kod süresi doldu“ / „zaten kullanıldı“ | Paneldeki yeni QR'ı tara (kendiliğinden yenilenir) veya „🔄 Neuer Code“. |
| Durum „Warte auf dein Handy …“ olarak kalıyor | Bağlantıya dokunulmadı ya da telefon başka ağda → Internet-Link. |
| Mikrofon düğmesi gri | Sayfa HTTPS değil – Internet-Link kullan. |
| Telefonda ses yok | Normal: sesleri overlay (OBS) çalar. |

---

## English

The phone becomes a remote for the overlay: every trigger as a big tile, the story scenes, pause and volume – and
optionally the phone microphone as speech recognition. **No app, no typing: scan the QR code, done.**

### 1. Pair by QR code (recommended)

1. Start LiveFX (double-click `start/Start-LiveFX.bat` or `start/Start-LiveFX.command`, see
   [START.md](START.md#english)). The panel opens in the browser.
2. At the top of the **🚀 Start-Assistent**, step 0 **“📱 Handy verbinden”** shows a big QR code. The same QR code is
   in the **📱 Handy** card, behind the **📱 Handy** button top right (from anywhere in the panel), in the camera view
   (**📱 Fernbedienung**) and in the black start window.
3. Point the **phone camera** at the QR code → tap the link. The phone pairs and opens the remote.
4. The panel switches to **“✔ Handy verbunden: iPhone · Safari”** and step 0 turns green.

- The QR code only carries a **one-time code** (`…/p#…`), **never your API token**. It is valid for **10 minutes**
  and **once**; the panel shows a fresh one by itself. “🔄 Neuer Code” makes a new one right away.
- **No QR scanner?** Open the address shown under the QR code (e.g. `http://192.168.178.23:8787/p`) on the phone and
  type the **6-digit code**.
- Several addresses and it does not connect? Pick another one under “Andere Adresse probieren”.
- A paired phone stays signed in for **180 days** (also after LiveFX restarts).
- **🖨 Einrichtungskarte**: printable card (A6/A5) or picture (PNG) with the phone QR + code, the overlay QR and three
  lines of instructions in German, Turkish and English.
- Phone and PC on the **same Wi‑Fi** (guest networks isolate devices). If the Windows firewall asks: **“Allow
  access”** (private networks).

### 2. Phone on another network (mobile data, guest Wi‑Fi, on the road)

If no phone shows up within **25 seconds**, the assistant shows **“📶 Handy in einem anderen Netz (z. B. mobile
Daten)? → Internet-Link”** with **one** button: **🌐 Internet-Link starten**. LiveFX opens a secure Cloudflare link
(https, free, no account) and **swaps the QR code automatically** – just scan again. “↩ WLAN-Code zeigen” brings the
Wi‑Fi QR back. The first time, LiveFX downloads `cloudflared` (~40 MB) once. No internet on the PC? Turn on the
phone's **personal hotspot**, connect the PC to it, and the Wi‑Fi QR works.

### 3. Manage and remove paired phones

Under the QR code all paired devices are listed with “last seen”. **“entfernen”** signs the device out at once – it
needs a new QR code to come back. Lost your phone? Just remove it. To reset everything: quit LiveFX, delete
`data/devices.json` and `data/token.txt`, start again.

### 4. Troubleshooting

| Problem | Fix |
| --- | --- |
| Scanned, page does not load | Same Wi‑Fi? Guest network / VPN off? Firewall allowed? Try “Andere Adresse probieren” – or **🌐 Internet-Link starten**. |
| “Code expired” / “already used” | Scan the new QR in the panel (it renews itself) or press “🔄 Neuer Code”. |
| Status stays “Warte auf dein Handy …” | The link was not opened (tap it!) or the phone is on another network → internet link. |
| Mic button greyed out | Page is not HTTPS – use the internet link. |
| No sound on the phone | Intended: the overlay (OBS) plays the sounds. |
