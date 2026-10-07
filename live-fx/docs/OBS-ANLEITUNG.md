# OBS einrichten – Klick für Klick · OBS kurulumu – adım adım · OBS setup – step by step

Ziel / Amaç / Goal: Kamera + LiveFX-Overlay + Sounds landen zusammen im Stream (TikTok, Instagram, YouTube,
Twitch). Der **🚀 Start-Assistent** oben im Panel führt durch dieselben Schritte und zeigt
**„Overlay verbunden ✔“**, sobald OBS das Overlay lädt.

- [🇩🇪 Deutsch](#deutsch)
- [🇹🇷 Türkçe](#türkçe)
- [🇬🇧 English](#english)

---

## Deutsch

### 1. Vorbereitung
1. **OBS Studio** installieren: <https://obsproject.com> (kostenlos, Windows/Mac/Linux).
2. LiveFX starten: Terminal im Ordner `live-fx` → `node server.js` (Fenster offen lassen).
3. Panel im Browser öffnen: `http://127.0.0.1:8787/` (Chrome oder Edge) – hier läuft das Mikro.

### 2. Szene bauen (einmalig, 3 Minuten)
1. OBS öffnen → unten links unter **Szenen** ist „Szene“ schon da – reicht.
2. Unter **Quellen** auf **+** → **Videoaufnahmegerät** → OK → deine Webcam wählen → OK.
3. Unter **Quellen** auf **+** → **Browser** → Name `LiveFX Overlay` → OK. Einstellungen:
   - **URL**: im Panel-Assistenten auf **„Kopieren“** klicken und einfügen – das ist
     `http://127.0.0.1:8787/overlay.html` (Querformat) bzw.
     `http://127.0.0.1:8787/overlay.html?layout=portrait` (Hochkant für TikTok/Instagram).
   - **Breite / Höhe**: genau wie deine Leinwand – **1920 × 1080** (quer) oder **1080 × 1920** (hochkant).
     Der Assistent zeigt die passende Zahl zum gewählten Format.
   - **„Audio über OBS steuern“** ✅ anhaken – sonst hört der Stream keine Sounds.
   - „Quelle aktualisieren, wenn Szene aktiv wird“ ✅ (optional, schadet nicht).
   - OK.
4. Die Browser-Quelle in der Liste **über** die Kamera schieben (Pfeile ▲▼ oder Rechtsklick → **Reihenfolge**
   → **Nach ganz oben**) – sonst liegt das Meme hinter dem Kamerabild.
5. **Mikrofon** als eigene Quelle: **+** → **Audioeingabeaufnahme** → dein Mikro → OK. Ohne diesen Schritt hören
   dich die Zuschauer nicht – das Mikro der Spracherkennung läuft nur im Browser. Dazu **Desktop-Audio** im
   Mixer stumm schalten (sonst kommt der Panel-Tab doppelt rein) und Audio-Monitoring aus lassen. Details inkl.
   Echo-Fehlerhilfe: [`docs/AUDIO.md`](AUDIO.md) bzw. die Karte **🔊 Ton-Check** im Panel.
6. Sound-Check: Im Assistenten **„✨ Test-Effekt“** drücken (oder Taste **1**) → Karte erscheint in OBS, der
   Status springt auf **„Overlay verbunden ✔“**, und im OBS-**Audiomixer** bewegt sich der Balken „LiveFX
   Overlay“. Willst du es selbst hören: Zahnrad im Mixer → **Erweiterte Audioeigenschaften** → Audio-Monitoring
   auf „Monitoring und Ausgabe“.

### 3. Hochkant für TikTok / Instagram
1. OBS → **Einstellungen** → **Video** → Basis- und Ausgabeauflösung `1080x1920` → OK.
2. Browser-Quelle bearbeiten → URL mit `?layout=portrait`, Breite 1080, Höhe 1920.
3. Kamera so skalieren, dass sie die Leinwand füllt (Rechtsklick → **Transformieren** → **An Bildschirm anpassen**).
   LiveFX hält das untere Drittel automatisch frei – dort liegen Chat und Kommentare. Mit **Story-Layout „Band“**
   (Einstellungen) bleiben Szenen in einem Streifen am unteren Rand, die Kamera darüber bleibt frei.

### 4. Streamen
| Plattform | So bekommst du den Stream-Key |
|---|---|
| **YouTube** | studio.youtube.com → „Live“ → Stream-Key kopieren → OBS **Einstellungen → Stream** → Dienst YouTube |
| **Twitch** | dashboard.twitch.tv → Einstellungen → Stream → Primärer Stream-Key |
| **TikTok LIVE** | **TikTok LIVE Studio** (Desktop-App, Windows): dort **Quelle hinzufügen → Browser** mit derselben URL und Größe anlegen – oder OBS mit Stream-Key, sofern dein Account den Key freigeschaltet hat (ab bestimmter Follower-Zahl / auf Anfrage) |
| **Instagram Live** | instagram.com → „Live-Video erstellen“ → „Streaming-Software“ → Stream-URL + Key → OBS **Einstellungen → Stream → Benutzerdefiniert** |

**Streamlabs Desktop**: gleiche Schritte – **Quellen → + → Browserquelle**, URL, Breite/Höhe, Haken bei
**„Audio über OBS steuern“** (heißt dort gleich); Reihenfolge per Drag & Drop. Streamlabs bringt Mikro und
Desktop-Audio schon als Quellen mit – Desktop-Audio stumm schalten.

Dann in OBS **„Stream starten“**. Im LiveFX-Panel **„Mikro starten“** – fertig.

### 5. Während des Streams
- **Hotkeys 1–9, 0, Q, W, E, R, T** feuern die ersten 15 Trigger manuell (Panel-Fenster muss den Fokus haben).
- **📱 Handy** als Fernbedienung: QR-Code in der Handy-Karte scannen (Favoriten, Leiser/Lauter, Szenen, Pakete).
- **Pause** im Panel stoppt Effekte, ohne das Mikro abzuschalten.
- Lautstärke: Regler **Master / Effekte / Atmosphäre** im Panel (wirken sofort im Overlay).
- Zu viele Effekte? „Mindestabstand zwischen Effekten“ hochsetzen (z. B. 3 s) oder Cooldowns einzelner Trigger erhöhen.

### Typische Probleme
| Problem | Lösung |
|---|---|
| Overlay bleibt leer / Status bleibt „noch nicht verbunden“ | URL prüfen (`127.0.0.1:8787`), läuft `node server.js` noch? Im Panel muss „OBS-Bridge“ grün sein. Browser-Quelle einmal mit Rechtsklick → **Aktualisieren**. |
| Bild da, kein Ton | „Audio über OBS steuern“ in der Browser-Quelle anhaken; Mixer-Balken prüfen. |
| Zuschauer hören mich nicht | Mikro als OBS-Quelle „Audioeingabeaufnahme“ anlegen (Schritt 5) – siehe `docs/AUDIO.md`. |
| Echo / Effekt kommt doppelt | Vorschau-Ton im Panel aus (Standard), Desktop-Audio stumm, Monitoring aus, nur **eine** Browser-Quelle mit dem Overlay. |
| Mikro erkennt nichts | Panel nur in Chrome/Edge; Mikro-Berechtigung erlauben; Sprache auf „Automatisch (DE/TR/EN)“ lassen oder passend wählen; Hauptsprache einstellen. |
| OBS auf anderem PC | LiveFX mit `HOST=0.0.0.0 node server.js` starten und im Overlay die IP des LiveFX-PCs verwenden. |

---

## Türkçe

### 1. Hazırlık
1. **OBS Studio** kur: <https://obsproject.com> (ücretsiz, Windows/Mac/Linux).
2. LiveFX'i başlat: `live-fx` klasöründe terminal → `node server.js` (pencereyi açık bırak).
3. Paneli tarayıcıda aç: `http://127.0.0.1:8787/` (Chrome veya Edge) – mikrofon burada çalışır.

### 2. Sahneyi kur (bir kez, 3 dakika)
1. OBS'yi aç → sol altta **Sahneler** altında „Sahne“ zaten var – yeterli.
2. **Kaynaklar** altında **+** → **Video Yakalama Aygıtı** → Tamam → web kameranı seç → Tamam.
3. **Kaynaklar** altında **+** → **Tarayıcı** → Ad `LiveFX Overlay` → Tamam. Ayarlar:
   - **URL**: Paneldeki asistanda **„Kopyala“ (Kopieren)** tuşuna bas ve yapıştır – bu
     `http://127.0.0.1:8787/overlay.html` (yatay) veya
     `http://127.0.0.1:8787/overlay.html?layout=portrait` (dikey, TikTok/Instagram için).
   - **Genişlik / Yükseklik**: tuvalinle birebir aynı – **1920 × 1080** (yatay) veya **1080 × 1920** (dikey).
     Asistan seçtiğin formata uygun sayıyı gösterir.
   - **„Sesi OBS üzerinden kontrol et“** ✅ işaretle – yoksa yayında ses duyulmaz.
   - „Sahne etkinleştiğinde kaynağı yenile“ ✅ (isteğe bağlı, zararı yok).
   - Tamam.
4. Tarayıcı kaynağını listede kameranın **üstüne** taşı (▲▼ okları veya sağ tık → **Sıra** → **En üste taşı**) –
   yoksa meme kamera görüntüsünün arkasında kalır.
5. **Mikrofonu** ayrı kaynak olarak ekle: **+** → **Ses Giriş Yakalama** → mikrofonunu seç → Tamam. Bu adım
   olmadan izleyiciler seni duymaz – konuşma tanımanın mikrofonu yalnızca tarayıcıda çalışır. Ayrıca mikserde
   **Masaüstü Sesi**'ni sessize al (yoksa panel sekmesi iki kez girer) ve ses izlemeyi kapalı tut. Ayrıntılar
   ve yankı sorunları: [`docs/AUDIO.md`](AUDIO.md) veya paneldeki **🔊 Ton-Check** kartı.
6. Ses kontrolü: Asistanda **„✨ Test-Effekt“** tuşuna bas (veya **1** tuşu) → OBS'de kart görünür, durum
   **„Overlay verbunden ✔“** olur ve OBS **Ses Mikseri**'nde „LiveFX Overlay“ çubuğu hareket eder. Kendin de
   duymak istersen: mikserdeki dişli → **Gelişmiş Ses Özellikleri** → Ses İzleme: „İzle ve Çıkış Ver“.

### 3. TikTok / Instagram için dikey
1. OBS → **Ayarlar** → **Video** → Temel ve Çıkış Çözünürlüğü `1080x1920` → Tamam.
2. Tarayıcı kaynağını düzenle → URL sonuna `?layout=portrait`, Genişlik 1080, Yükseklik 1920.
3. Kamerayı tuvali dolduracak şekilde ölçekle (sağ tık → **Dönüştür** → **Ekrana sığdır**).
   LiveFX alt üçte birlik alanı otomatik boş bırakır – sohbet ve yorumlar oraya gelir. **Story-Layout „Band“**
   (Ayarlar) ile sahneler alt kenarda bir şeritte kalır, üstteki kamera görüntüsü boş kalır.

### 4. Yayın
| Platform | Yayın anahtarını (stream key) böyle alırsın |
|---|---|
| **YouTube** | studio.youtube.com → „Canlı“ → Yayın anahtarını kopyala → OBS **Ayarlar → Yayın** → Hizmet YouTube |
| **Twitch** | dashboard.twitch.tv → Ayarlar → Yayın → Birincil yayın anahtarı |
| **TikTok LIVE** | **TikTok LIVE Studio** (masaüstü uygulaması, Windows): orada **Kaynak ekle → Tarayıcı** ile aynı URL ve boyutu gir – ya da hesabında anahtar açıksa (belirli takipçi sayısından sonra / talep üzerine) OBS ile yayın anahtarı |
| **Instagram Live** | instagram.com → „Canlı video oluştur“ → „Yayın yazılımı“ → Yayın URL'si + anahtar → OBS **Ayarlar → Yayın → Özel** |

**Streamlabs Desktop**: aynı adımlar – **Kaynaklar → + → Tarayıcı Kaynağı**, URL, genişlik/yükseklik,
**„Sesi OBS üzerinden kontrol et“** işaretli; sıralama sürükle-bırak. Streamlabs mikrofon ve masaüstü sesini
hazır getirir – masaüstü sesini sessize al.

Sonra OBS'de **„Yayını Başlat“**. LiveFX panelinde **„Mikro starten“** – bitti.

### 5. Yayın sırasında
- **Kısayollar 1–9, 0, Q, W, E, R, T** ilk 15 tetikleyiciyi elle ateşler (panel penceresi odakta olmalı).
- **📱 Telefon** uzaktan kumanda: telefon kartındaki QR kodunu tara (favoriler, kısık/yüksek, sahneler, paketler).
- Paneldeki **Pause** mikrofonu kapatmadan efektleri durdurur.
- Ses: paneldeki **Master / Effekte / Atmosphäre** sürgüleri (overlay'de anında etkili).
- Çok fazla efekt mi? „Mindestabstand“ (efektler arası en az süre) değerini yükselt (ör. 3 s) ya da tekil tetikleyicilerin bekleme süresini artır.

### Sık görülen sorunlar
| Sorun | Çözüm |
|---|---|
| Overlay boş / durum „noch nicht verbunden“ kalıyor | URL'yi kontrol et (`127.0.0.1:8787`), `node server.js` hâlâ çalışıyor mu? Panelde „OBS-Bridge“ yeşil olmalı. Tarayıcı kaynağına sağ tık → **Yenile**. |
| Görüntü var, ses yok | Tarayıcı kaynağında „Sesi OBS üzerinden kontrol et“ işaretli olmalı; mikser çubuğuna bak. |
| İzleyiciler beni duymuyor | Mikrofonu OBS kaynağı „Ses Giriş Yakalama“ olarak ekle (adım 5) – bkz. `docs/AUDIO.md`. |
| Yankı / efekt iki kez geliyor | Panelde önizleme sesi kapalı (varsayılan), masaüstü sesi sessiz, izleme kapalı, overlay'li **tek** tarayıcı kaynağı. |
| Mikrofon hiçbir şey tanımıyor | Panel yalnız Chrome/Edge'de; mikrofon iznini ver; dili „Automatisch (DE/TR/EN)“ bırak ya da uygun seç; ana dili (Hauptsprache) Türkçe yap. |
| OBS başka bilgisayarda | LiveFX'i `HOST=0.0.0.0 node server.js` ile başlat ve overlay'de LiveFX bilgisayarının IP'sini kullan. |

---

## English

### 1. Preparation
1. Install **OBS Studio**: <https://obsproject.com> (free, Windows/Mac/Linux).
2. Start LiveFX: terminal in the `live-fx` folder → `node server.js` (keep the window open).
3. Open the panel in the browser: `http://127.0.0.1:8787/` (Chrome or Edge) – this is where the mic runs.

### 2. Build the scene (once, 3 minutes)
1. Open OBS → bottom left under **Scenes** there is already „Scene“ – that is enough.
2. Under **Sources** click **+** → **Video Capture Device** → OK → pick your webcam → OK.
3. Under **Sources** click **+** → **Browser** → name `LiveFX Overlay` → OK. Properties:
   - **URL**: press **“Copy” (Kopieren)** in the panel assistant and paste – that is
     `http://127.0.0.1:8787/overlay.html` (landscape) or
     `http://127.0.0.1:8787/overlay.html?layout=portrait` (portrait for TikTok/Instagram).
   - **Width / Height**: exactly your canvas – **1920 × 1080** (landscape) or **1080 × 1920** (portrait).
     The assistant shows the right numbers for the chosen format.
   - Tick **“Control audio via OBS”** ✅ – otherwise the stream hears no sounds.
   - “Refresh browser when scene becomes active” ✅ (optional, harmless).
   - OK.
4. Move the browser source **above** the camera in the list (▲▼ arrows or right-click → **Order** →
   **Move to Top**) – otherwise the meme sits behind the camera image.
5. Add the **microphone** as its own source: **+** → **Audio Input Capture** → your mic → OK. Without this
   step viewers cannot hear you – the speech-recognition mic only runs in the browser. Also mute
   **Desktop Audio** in the mixer (otherwise the panel tab comes in twice) and keep audio monitoring off.
   Details incl. echo troubleshooting: [`docs/AUDIO.md`](AUDIO.md) or the **🔊 Ton-Check** card in the panel.
6. Sound check: press **“✨ Test-Effekt”** in the assistant (or key **1**) → a card appears in OBS, the status
   switches to **“Overlay verbunden ✔”** and the “LiveFX Overlay” bar moves in the OBS **Audio Mixer**. To hear
   it yourself: gear icon in the mixer → **Advanced Audio Properties** → Audio Monitoring “Monitor and Output”.

### 3. Portrait for TikTok / Instagram
1. OBS → **Settings** → **Video** → Base and Output Resolution `1080x1920` → OK.
2. Edit the browser source → URL with `?layout=portrait`, width 1080, height 1920.
3. Scale the camera to fill the canvas (right-click → **Transform** → **Fit to Screen**).
   LiveFX keeps the bottom third free automatically – chat and comments live there. With **Story-Layout
   “Band”** (settings) scenes stay in a strip along the bottom edge and the camera above stays clear.

### 4. Go live
| Platform | How to get the stream key |
|---|---|
| **YouTube** | studio.youtube.com → “Go live” → copy the stream key → OBS **Settings → Stream** → service YouTube |
| **Twitch** | dashboard.twitch.tv → Settings → Stream → Primary Stream key |
| **TikTok LIVE** | **TikTok LIVE Studio** (desktop app, Windows): there **Add source → Browser** with the same URL and size – or OBS with a stream key if your account has it unlocked (follower threshold / on request) |
| **Instagram Live** | instagram.com → “Create live video” → “Streaming software” → stream URL + key → OBS **Settings → Stream → Custom** |

**Streamlabs Desktop**: same steps – **Sources → + → Browser Source**, URL, width/height, tick
**“Control audio via OBS”** (same name there); order via drag & drop. Streamlabs already brings mic and desktop
audio as sources – mute desktop audio.

Then **“Start Streaming”** in OBS. In the LiveFX panel **“Mikro starten”** – done.

### 5. During the stream
- **Hotkeys 1–9, 0, Q, W, E, R, T** fire the first 15 triggers by hand (the panel window needs focus).
- **📱 Phone** as remote: scan the QR code in the phone card (favourites, quieter/louder, scenes, packs).
- **Pause** in the panel stops effects without switching the mic off.
- Volume: the **Master / Effekte / Atmosphäre** sliders in the panel (take effect in the overlay at once).
- Too many effects? Raise “Mindestabstand” (minimum gap between effects, e.g. 3 s) or the cooldown of single triggers.

### Common problems
| Problem | Fix |
|---|---|
| Overlay stays empty / status stays “noch nicht verbunden” | Check the URL (`127.0.0.1:8787`), is `node server.js` still running? “OBS-Bridge” in the panel must be green. Right-click the browser source → **Refresh**. |
| Picture but no sound | Tick “Control audio via OBS” in the browser source; check the mixer bar. |
| Viewers cannot hear me | Add the mic as OBS source “Audio Input Capture” (step 5) – see `docs/AUDIO.md`. |
| Echo / effect plays twice | Preview sound off in the panel (default), desktop audio muted, monitoring off, only **one** browser source with the overlay. |
| Mic recognises nothing | Panel only in Chrome/Edge; allow the mic permission; keep language “Automatisch (DE/TR/EN)” or pick yours; set the main language (Hauptsprache). |
| OBS on another PC | Start LiveFX with `HOST=0.0.0.0 node server.js` and use the LiveFX PC's IP in the overlay URL. |
