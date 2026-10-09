# LiveFX am Handy – Fernbedienung, Spiegel und App

Das Handy wird zur Fernbedienung für das Overlay: alle Trigger als große Kacheln, die Szenen des
Story-Modus, Pause und Lautstärke – und optional das Handy-Mikro als Spracherkennung. Die Seite läuft
im normalen Browser und lässt sich wie eine App auf den Startbildschirm legen (PWA).

## 1. Server fürs WLAN starten

Standardmäßig hört `server.js` nur auf dem PC selbst (`127.0.0.1`). Damit das Handy ihn erreicht,
muss er im WLAN erreichbar sein:

```bash
HOST=0.0.0.0 node server.js
```

(Windows PowerShell: `$env:HOST="0.0.0.0"; node server.js`.) Handy und PC müssen im **selben WLAN**
sein. Gast-WLANs blockieren oft den Verkehr zwischen Geräten („Client-Isolation“) – dann geht es nicht.

Wenn die Firewall des PCs fragt: Zugriff im privaten Netz erlauben (Port 8787).

## 2. Link am Handy öffnen

Im Panel gibt es die Karte **📱 Handy**. Dort steht der fertige Link als **QR-Code** und als Text, z. B.

```
http://192.168.1.23:8787/m?token=…
```

**QR-Code mit der Handy-Kamera scannen** (2.2) – fertig. Oder „Link kopieren“ → per Messenger/Notiz ans
Handy schicken → im Handy-Browser öffnen. Der QR-Code wird im Browser erzeugt (`js/qr.js`); der Link mit
deinem Token verlässt den PC dabei nicht.
Der Link meldet das Handy einmalig an (Sitzungs-Cookie) und leitet auf die Handy-Seite weiter. Der
Token gehört nur dir – nicht in den Chat posten. Zeigt die Karte mehrere Adressen, ist meist die
erste die richtige (WLAN-Adapter); bei Docker/VPN-Adaptern die andere probieren.

Ohne Server (Panel per `file://` geöffnet) gibt es keinen Handy-Link.

## 3. Was die Handy-Seite kann

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
- **Punkt oben links**: grün = mit dem Server verbunden, gelb = verbindet, rot = nicht angemeldet
  (Link aus dem Panel erneut öffnen).
- Änderungen an Triggern im Panel erscheinen sofort auch am Handy.

## 4. Mikro am Handy (optional)

Der Knopf **🎙️ Mikro** startet die Spracherkennung des Handy-Browsers und feuert erkannte Stichwörter
direkt ins Overlay. Browser erlauben das Mikro nur auf **sicheren Seiten** – also `https://` oder
`localhost`. Über `http://192.168.…` ist der Knopf ausgegraut und es steht dort:
„Mikro am Handy braucht HTTPS – siehe Anleitung“. Die Fernbedienung funktioniert trotzdem.

Der einfachste Weg zu HTTPS ist der **Internet-Link** (nächster Abschnitt) – er ist immer `https://`.
Alternativ ein eigenes Zertifikat: `docs/HANDY-HTTPS.md` (`LIVEFX_TLS_CERT` / `LIVEFX_TLS_KEY`, Zertifikat
am Handy vertrauen). Die Sprache richtet sich nach der Handy-Sprache (Deutsch, Türkçe, English); die
Toleranz ist „mittel“.

Alternative ohne HTTPS: Mikro am PC im Panel nutzen, das Handy nur als Soundboard.

## 4a. Internet-Fernzugriff (2.2) – Handy im Mobilfunk, HTTPS ohne Zertifikat

In der Karte **📱 Handy** gibt es rechts den Knopf **🌐 Internet-Link starten**. LiveFX startet dann einen
**Cloudflare-Schnelltunnel** (`cloudflared tunnel --url http://127.0.0.1:8787`): kostenlos, ohne Konto, ohne
Port-Weiterleitung. Nach ein paar Sekunden steht dort ein Link wie

```
https://lazy-otter-brave-cat.trycloudflare.com/m?token=…
```

als QR-Code und Text. Damit erreicht das Handy LiveFX **aus jedem Netz** (Mobilfunk, Café-WLAN, Gast-WLAN
mit Client-Isolation) – und weil der Link `https://` ist, funktioniert auch das **🎙️ Mikro am Handy** ohne
eigenes Zertifikat.

Was dabei passiert:

- Beim **ersten Start** lädt LiveFX das Programm `cloudflared` einmalig herunter (offizielles GitHub-Release
  von Cloudflare, ca. 40 MB) nach `<Datenordner>/bin/cloudflared` und prüft die **SHA-256-Prüfsumme** gegen die
  veröffentlichte. Ist `cloudflared` schon installiert (im `PATH` oder per `LIVEFX_CLOUDFLARED=<Pfad>`), wird
  das genommen. Status im Panel: *aus → startet … → online* (oder *Fehler* mit Grund).
- Die zufällige Adresse gilt, **solange der Server läuft**; „Internet-Link stoppen“ oder das Beenden von
  LiveFX beendet den Tunnel. Beim nächsten Start gibt es eine neue Adresse (QR-Code neu scannen).
- **Sicherheit**: Nur wer den Link **mit Token** hat, kommt rein. Alles, was durch den Tunnel kommt, braucht
  das Sitzungs-Cookie aus dem `/m?token=…`-Aufruf oder den Bearer-Token – das Panel wird über die Tunnel-
  Adresse nicht ohne Anmeldung ausgeliefert. Den Link also nicht im Stream zeigen; bei Verdacht Tunnel
  stoppen (oder `data/token.txt` löschen und LiveFX neu starten → neuer Token).
- API: `GET /api/tunnel` (Status), `POST /api/tunnel/start`, `POST /api/tunnel/stop` – alle mit Bearer-Token
  oder Panel-Cookie.

**Kein Internet am PC / Download klappt nicht?**

- **Hotspot-Trick**: Am Handy den **persönlichen Hotspot** einschalten und den PC damit verbinden. Jetzt sind
  Handy und PC im selben (Handy-)Netz – der normale **WLAN-Link** aus der Karte funktioniert, ganz ohne
  Tunnel. Dafür den Server mit `HOST=0.0.0.0 node server.js` starten; die Adresse steht in der Karte
  (meist `172.20.10.x` beim iPhone, `192.168.43.x` bei Android).
- **Download von Hand**: `cloudflared` für dein System von
  <https://github.com/cloudflare/cloudflared/releases/latest> laden (Windows: `cloudflared-windows-amd64.exe`,
  Mac: `cloudflared-darwin-arm64.tgz` bzw. `-amd64.tgz` entpacken, Linux: `cloudflared-linux-amd64` bzw.
  `-arm64`), die Datei als `cloudflared` (Windows: `cloudflared.exe`) in den Ordner `data/bin/` legen und
  ausführbar machen (`chmod +x`) – oder `LIVEFX_CLOUDFLARED=/pfad/zu/cloudflared node server.js`. Die
  Fehlermeldung im Panel nennt den genauen Download-Link und Zielordner. Alternativ per Paketmanager:
  `winget install Cloudflare.cloudflared`, `brew install cloudflared`, `apt install cloudflared`.
- Firewall/Firmennetz blockt ausgehende Verbindungen? Dann bleibt der Hotspot-Trick.

## 5. Als App auf den Startbildschirm

- **Android/Chrome**: Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
- **iPhone/Safari**: Teilen-Symbol → „Zum Home-Bildschirm“.

Danach startet LiveFX ohne Browserleiste. Die Oberfläche (Panel, Overlay, Handy-Seite) wird vom
Service Worker zwischengespeichert und öffnet auch ohne Netz – Effekte brauchen aber natürlich den
laufenden Server. Nach einem LiveFX-Update einmal die Seite neu laden (der Service Worker holt sich
die neue Version im Hintergrund).

## 6. Fehlerhilfe

| Problem | Lösung |
| --- | --- |
| Seite lädt nicht | Server mit `HOST=0.0.0.0` gestartet? Gleiches WLAN? Firewall? Adresse aus der Handy-Karte verwenden, nicht `127.0.0.1`. |
| Punkt bleibt rot / „Nicht angemeldet“ | Den Link **mit** `?token=…` aus dem Panel erneut öffnen (Cookie abgelaufen oder Browser-Daten gelöscht). Zu viele falsche Versuche → eine Minute warten. |
| Kachel tippen, nichts passiert | Pause aktiv? Trigger deaktiviert (grau)? Ist ein Overlay geöffnet (OBS-Browserquelle oder Vorschau)? |
| Mikro-Knopf grau | Seite ist nicht HTTPS – Internet-Link (Abschnitt 4a) nutzen oder Zertifikat (Abschnitt 4). |
| Internet-Link: „Fehler … konnte nicht geladen werden“ | PC ohne Internet oder GitHub geblockt → Download von Hand oder Hotspot-Trick (Abschnitt 4a). |
| Internet-Link: „keine Adresse gemeldet“ | Firewall blockt `cloudflared` (ausgehend 7844/443) – Firewall fragen oder Hotspot-Trick. |
| Internet-Link geht, aber Seite sagt „Nicht angemeldet“ | Link **mit** `?token=…` (QR-Code aus der Karte) öffnen; der Tunnel liefert nichts ohne Anmeldung aus. |
| Alte Version nach Update | Seite neu laden; notfalls in den Browser-Einstellungen die Website-Daten für die Adresse löschen. |
| Kein Ton am Handy | Gewollt: Sounds spielt das Overlay (OBS), nicht das Handy. |
