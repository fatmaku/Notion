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

Im Panel gibt es die Karte **📱 Handy**. Dort steht der fertige Link, z. B.

```
http://192.168.1.23:8787/m?token=…
```

„Link kopieren“ → per Messenger/Notiz ans Handy schicken (oder abtippen) → im Handy-Browser öffnen.
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
- **Lautstärke**: setzt die Lautstärke des Overlays (wie der Regler im Panel).
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

HTTPS einrichten: siehe `docs/HANDY-HTTPS.md` (selbstsigniertes Zertifikat, `LIVEFX_TLS_CERT` /
`LIVEFX_TLS_KEY`, Zertifikat am Handy vertrauen). Die Sprache richtet sich nach der Handy-Sprache
(Deutsch, Türkçe, English); die Toleranz ist „mittel“.

Alternative ohne HTTPS: Mikro am PC im Panel nutzen, das Handy nur als Soundboard.

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
| Mikro-Knopf grau | Seite ist nicht HTTPS – siehe Abschnitt 4. |
| Alte Version nach Update | Seite neu laden; notfalls in den Browser-Einstellungen die Website-Daten für die Adresse löschen. |
| Kein Ton am Handy | Gewollt: Sounds spielt das Overlay (OBS), nicht das Handy. |
