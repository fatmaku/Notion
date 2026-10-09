LiveFX starten – in 2 Minuten (Deutsch)
=========================================

1) ZIP entpacken
   Windows: Rechtsklick auf die ZIP-Datei → „Alle extrahieren…“. Nicht direkt aus der ZIP starten.
   Tipp: Vorher Rechtsklick auf die ZIP → Eigenschaften → Haken bei „Zulassen“ → OK.
   Dann fragt Windows später nicht nach („Der Computer wurde durch Windows geschützt“).

2) Doppelklick auf die Startdatei in diesem Ordner „start“
   Windows:  Start-LiveFX.bat
   Mac:      Start-LiveFX.command
   Linux:    start.sh   (im Terminal: ./start/start.sh)

   Fehlt Node.js, erklärt das Fenster, was zu tun ist, und öffnet https://nodejs.org/de/download
   → dort die „LTS“-Version installieren (immer „Weiter“) und die Startdatei noch einmal doppelklicken.
   Schneller: Windows (PowerShell) „winget install OpenJS.NodeJS.LTS“, Mac „brew install node“.

3) Das Panel öffnet sich im Browser (http://127.0.0.1:8787/).
   Das schwarze Fenster offen lassen, solange du streamst. Beenden: Fenster schließen oder Strg+C.

4) Handy koppeln (optional, Handy im selben WLAN)
   Im Startfenster und im Panel unter „📱 Handy“ steht ein QR-Code → mit der Handy-Kamera scannen
   → fertig, die Fernbedienung öffnet sich. Kein Passwort, kein Abtippen.
   Kein QR-Scanner? Am Handy die angezeigte Adresse …/p öffnen und den 6-stelligen Code eintippen.
   Anderes Netz / unterwegs? Im Panel auf „Internet-Link“ klicken und den neuen QR-Code scannen.
   Der Code gilt 10 Minuten und nur einmal – das Handy bleibt danach 180 Tage gekoppelt
   (im Panel jederzeit wieder entfernbar).

Windows-Firewall
   Beim ersten Start fragt Windows: „Zugriff zulassen“ klicken (private Netzwerke).
   Sonst findet das Handy den PC nicht. Nachträglich: Windows-Sicherheit → Firewall →
   „App durch Firewall zulassen“ → „Node.js JavaScript Runtime“ → Haken bei „Privat“.

Mac: „kann nicht geöffnet werden, da es von einem nicht verifizierten Entwickler stammt“
   Das ist Gatekeeper (Dateien aus dem Internet). Einmalig:
   Rechtsklick (oder ctrl-Klick) auf Start-LiveFX.command → „Öffnen“ → „Öffnen“.
   Ab macOS 15: einmal doppelklicken, dann Systemeinstellungen → Datenschutz & Sicherheit →
   ganz unten „Dennoch öffnen“. Danach reicht ein Doppelklick.
   „Keine Berechtigung“? Terminal öffnen, „bash “ tippen (mit Leerzeichen), die Datei
   Start-LiveFX.command ins Terminal ziehen, Enter.
   Die Mac-Firewall fragt ggf. „Eingehende Verbindungen erlauben?“ → „Erlauben“.

Node.js ohne Installation (portabel)
   Auf https://nodejs.org/de/download die Datei „Windows Binary (.zip)“ (Mac: „macOS Binary (.tar.gz)“)
   laden, entpacken und den entpackten Ordner in „node“ umbenennen und in den LiveFX-Ordner legen:
     LiveFX\node\node.exe                 (Windows)
     LiveFX/node/bin/node                 (Mac / Linux)
   Die Startdatei nimmt dann dieses Node. Der Startknopf lädt selbst nie etwas herunter.

Nur auf diesem PC (ohne Handy): Start-LiveFX.bat --local   (oder: node server.js --local)
Anderer Port: node server.js --port 8790        Mehr: docs/START.md, docs/HANDY.md, docs/OBS-ANLEITUNG.md


LiveFX’i başlat (Türkçe)
========================
1) ZIP’i aç (Windows: sağ tık → „Tümünü ayıkla…“). ZIP’in içinden başlatma.
2) „start“ klasöründe çift tıkla: Windows „Start-LiveFX.bat“, Mac „Start-LiveFX.command“, Linux „start.sh“.
   Node.js yoksa pencere ne yapılacağını söyler ve https://nodejs.org/de/download açılır → „LTS“ kur, tekrar çift tıkla.
3) Panel tarayıcıda açılır (http://127.0.0.1:8787/). Siyah pencere yayın boyunca açık kalsın; kapatmak = LiveFX’i durdurmak.
4) Telefon: başlangıç penceresindeki veya paneldeki („📱 Handy“) QR kodu telefon kamerasıyla tara – bitti.
   Telefon ve PC aynı Wi‑Fi’de olmalı. Dışarıdaysan panelde „Internet-Link“.
   Kod 10 dakika ve tek kullanımlık; telefon 180 gün eşleşmiş kalır (panelden silinebilir).
Windows Güvenlik Duvarı sorarsa: „Erişime izin ver“ (özel ağlar).
Mac „doğrulanmamış geliştirici“ derse: dosyaya sağ tık → „Aç“ → „Aç“ (macOS 15+: Sistem Ayarları →
Gizlilik ve Güvenlik → „Yine de Aç“).
Kurulumsuz Node: Node ZIP’ini aç, klasörün adını „node“ yap ve LiveFX klasörüne koy (LiveFX\node\node.exe).


Start LiveFX (English)
======================
1) Unzip (Windows: right-click → “Extract All…”). Do not run it from inside the ZIP.
2) Double-click in the “start” folder: Windows “Start-LiveFX.bat”, Mac “Start-LiveFX.command”, Linux “start.sh”.
   Without Node.js the window explains what to do and opens https://nodejs.org/de/download → install “LTS”, double-click again.
3) The panel opens in your browser (http://127.0.0.1:8787/). Keep the black window open while streaming; closing it stops LiveFX.
4) Phone: scan the QR code in the start window or in the panel (“📱 Handy”) with the phone camera – done.
   Phone and PC on the same Wi‑Fi; elsewhere use “Internet-Link” in the panel.
   The code is valid for 10 minutes, once; the phone stays paired for 180 days (removable in the panel).
Windows Firewall asks: click “Allow access” (private networks).
Mac “unidentified developer”: right-click the file → “Open” → “Open” (macOS 15+: System Settings →
Privacy & Security → “Open Anyway”).
Portable Node: unzip the official Node archive, rename the folder to “node”, put it into the LiveFX folder
(LiveFX\node\node.exe or LiveFX/node/bin/node).
