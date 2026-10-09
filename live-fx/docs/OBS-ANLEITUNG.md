# OBS einrichten – Klick für Klick · OBS kurulumu – adım adım · OBS setup – step by step

Ziel / Amaç / Goal: Kamera + LiveFX-Overlay + Sounds landen zusammen im Stream (TikTok, Instagram, YouTube,
Twitch). Der **🚀 Start-Assistent** oben im Panel führt durch dieselben Schritte und zeigt
**„Overlay verbunden ✔“**, sobald OBS das Overlay lädt. Neben „Kopieren“ steht die Overlay-Adresse fürs WLAN als
**QR-Code** – für OBS auf einem 2. PC oder eine Streaming-App am Handy (§7).

- [🇩🇪 Deutsch](#deutsch)
- [🇹🇷 Türkçe](#türkçe)
- [🇬🇧 English](#english)

---

## Deutsch

### 1. Vorbereitung
1. **OBS Studio** installieren: <https://obsproject.com> (kostenlos, Windows/Mac/Linux).
2. LiveFX starten: **Doppelklick auf `start/Start-LiveFX.bat`** (Mac: `start/Start-LiveFX.command`) – das schwarze
   Fenster offen lassen. Node.js fehlt? Das Fenster erklärt es, Details: [`START.md`](START.md). (Alternativ: Terminal
   im LiveFX-Ordner → `node server.js`.)
3. Das Panel öffnet sich im Browser: `http://127.0.0.1:8787/` (Chrome oder Edge) – hier läuft das Mikro. Erst das
   Handy per QR koppeln (Schritt 0 im Assistenten, [`HANDY.md`](HANDY.md)), dann OBS.

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
   **Band-Position (Hochkant)** (2.3): **ganz unten** (Standard, bündig am Bildrand) oder **über dem Chat** (das Band
   sitzt dann über den Kommentaren) – im Panel unter Einstellungen, am Handy mit **📐 Band** oder fest per
   `?layout=portrait&bandpos=chat`.

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

### 6. Virtuelle Kamera – LiveFX in WhatsApp, FaceTime, Zoom, Teams, Meet
Dieselbe Szene (Kamera + Overlay) kann statt eines Streams auch eine **Kamera** für Videocalls sein:
1. Unten rechts **Steuerung → „Virtuelle Kamera starten“**.
2. In der Call-App als Kamera **„OBS Virtual Camera“** wählen (Zoom: Einstellungen → Video · Teams: Geräteeinstellungen ·
   Meet in Chrome: Zahnrad → Video · WhatsApp Desktop: im Anruf ⋯ → Kamera · FaceTime: Menü **Video**).
3. **Mac** (macOS 13+, OBS 30+, OBS im Ordner **Programme**): beim ersten Start die **Kamera-Erweiterung** erlauben –
   macOS 15+: *Systemeinstellungen → Allgemein → Anmeldeobjekte & Erweiterungen → Kamera-Erweiterungen*; macOS 13 / 14:
   *Systemeinstellungen → Datenschutz & Sicherheit* → **Erlauben** beim Hinweis auf Systemsoftware von „OBS“ –,
   danach FaceTime neu starten.
4. **Windows:** Zoom, Teams, Discord, Chrome/Edge sehen die OBS-Kamera; manche Store-Apps (einzelne WhatsApp-Desktop-
   Versionen) nicht – dann im Anruf **Bildschirm teilen** und das Fenster der **📷 Kamera-Ansicht** wählen.
- Die virtuelle Kamera überträgt **nur Bild** – deine Stimme geht wie immer übers Mikro der App; Effekt-Sounds hören
  die anderen nur mit „Computerton teilen“ (Zoom) oder über ein virtuelles Audiokabel.
- Ohne OBS-Szene geht es auch: Panel → **📷 Kamera-Ansicht** (`camera.html`) zeigt Webcam + Overlay in einem Fenster →
  in OBS als **Fensteraufnahme** (Knopf **⧉ Ausgabe** = Fenster ohne Leiste) und dann „Virtuelle Kamera starten“. Die
  Webcam dann nicht zusätzlich als OBS-Quelle benutzen (unter Windows kann sie nur ein Programm gleichzeitig nutzen).
- Handy-Apps (WhatsApp/FaceTime am Handy) nehmen keine virtuelle Kamera – dort mit der Kamera-Ansicht ein Video
  **aufnehmen** und schicken. Alles dazu: [`KAMERA.md`](KAMERA.md).

### 7. OBS auf einem 2. PC oder Streaming-App am Handy – per QR-Code
Im Start-Assistenten (Schritt 2 „OBS verbinden“) steht neben **„📋 Kopieren“** ein kleiner **QR-Code**: die
Overlay-Adresse, wie sie **im WLAN** erreichbar ist, z. B. `http://192.168.178.23:8787/overlay.html?key=…`. Der
Schlüssel (`key=…`) öffnet nur das Overlay (Seite + Effekte, nur lesen) – keine Steuerung. Format „Hochkant 9:16“
wählen, dann trägt der QR-Code `layout=portrait`. Dieselbe Adresse steht auf der **🖨 Einrichtungskarte** und im
Startfenster („OBS auf einem anderen PC“).

**OBS auf einem zweiten PC (2-PC-Setup):** QR-Code mit dem Handy scannen und dir die Adresse schicken – oder sie vom
Bildschirm abtippen. Im Streaming-PC in OBS **Quellen → + → Browser** → diese URL, Größe wie in Schritt 2. Beide PCs
im selben Netz; fragt die Windows-Firewall am LiveFX-PC: „Zugriff zulassen“ (privat).

**Streaming-Apps am Handy** – ehrlicher Überblick (Stand Oktober 2026, Menünamen können je nach Version abweichen,
nicht jede App von uns selbst getestet):

| App | Web-Overlay per URL? | Hinweis |
|---|---|---|
| **PRISM Live Studio** (iOS/Android, kostenlos) | ja – „Web-Widget“: URL eingeben → Webseite als Ebene im Stream | laut App-Store-Beschreibung gedacht für Spenden-/Alert-Widgets |
| **Larix Broadcaster** (iOS/Android) | ja – Einstellungen → Overlays → „Web widgets“ → URL | HTML-Ebenen teils nur mit Larix Premium |
| **Moblin** (iOS, kostenlos, Open Source, IRL-Streaming) | ja – Widget „Browser“ mit URL | transparenter Hintergrund laut Release-Notizen möglich |
| **Streamlabs Mobile** (iOS/Android) | unklar – eigene Widgets/Themes; ob beliebige URLs als Ebene gehen, ist nicht offiziell beschrieben | vorher testen |
| **TikTok LIVE Studio** (Windows-PC, keine Handy-App) | ja – Quelle „Link“ | manche Versionen laden Link-Quellen mit 0 × 0 Pixeln (bekanntes Problem) → dann OBS + „Virtuelle Kamera“ |
| **TikTok-, Instagram-, YouTube-, Twitch-App** | nein – die Apps nehmen keine fremden Overlays | Weg über OBS/Streaming-Software (§4) |

So geht es mit einer App, die Web-Ebenen kann:
1. Handy und LiveFX-PC ins **gleiche WLAN** (die Overlay-Adresse läuft übers WLAN; über mobile Daten erreicht die App
   den PC nicht).
2. Im Start-Assistenten das Format wählen (meist **Hochkant 9:16**), den kleinen QR-Code mit der Handy-Kamera scannen,
   Link lang drücken → **kopieren**.
3. In der App die Web-/Browser-Ebene anlegen, die Adresse einfügen, Ebene auf **volle Bildgröße** ziehen.
4. Im Panel **„✨ Test-Effekt“** – die Karte muss in der App-Vorschau erscheinen.
- **Ton:** Viele Apps spielen den Ton einer Web-Ebene nicht in den Stream – Effekt-Sounds dann notfalls über den
  Handy-Lautsprecher/Mikro oder ganz ohne.
- **Leistung:** Das Overlay rechnet auf dem Handy mit – bei Rucklern `&perf=eco` an die Adresse hängen.
- **Kamera-Ansicht statt App:** Für fertige Clips ohne Streaming-App: Panel → **📷 Kamera-Ansicht** → **⏺ Aufnahme**
  ([`KAMERA.md`](KAMERA.md)).

### Typische Probleme
| Problem | Lösung |
|---|---|
| Overlay bleibt leer / Status bleibt „noch nicht verbunden“ | URL prüfen (`127.0.0.1:8787`), läuft `node server.js` noch? Im Panel muss „OBS-Bridge“ grün sein. Browser-Quelle einmal mit Rechtsklick → **Aktualisieren**. |
| Bild da, kein Ton | „Audio über OBS steuern“ in der Browser-Quelle anhaken; Mixer-Balken prüfen. |
| Zuschauer hören mich nicht | Mikro als OBS-Quelle „Audioeingabeaufnahme“ anlegen (Schritt 5) – siehe `docs/AUDIO.md`. |
| Echo / Effekt kommt doppelt | Vorschau-Ton im Panel aus (Standard), Desktop-Audio stumm, Monitoring aus, nur **eine** Browser-Quelle mit dem Overlay. |
| Mikro erkennt nichts | Panel nur in Chrome/Edge; Mikro-Berechtigung erlauben; Sprache auf „Automatisch (DE/TR/EN)“ lassen oder passend wählen; Hauptsprache einstellen. |
| OBS auf anderem PC | Die Adresse mit Schlüssel aus dem QR-Code neben „Kopieren“ nehmen (`http://<PC>:8787/overlay.html?key=…`) – siehe §7. LiveFX ist ab 2.3 von selbst im WLAN erreichbar (nicht mit `--local` starten). |

---

## Türkçe

### 1. Hazırlık
1. **OBS Studio** kur: <https://obsproject.com> (ücretsiz, Windows/Mac/Linux).
2. LiveFX'i başlat: **`start/Start-LiveFX.bat`** (Mac: `start/Start-LiveFX.command`) dosyasına **çift tıkla** – siyah
   pencereyi açık bırak. Node.js yok mu? Pencere anlatır, ayrıntılar: [`START.md`](START.md#türkçe). (Alternatif: LiveFX
   klasöründe terminal → `node server.js`.)
3. Panel tarayıcıda açılır: `http://127.0.0.1:8787/` (Chrome veya Edge) – mikrofon burada çalışır. Önce telefonu QR ile
   eşleştir (asistanda 0. adım, [`HANDY.md`](HANDY.md#türkçe)), sonra OBS.

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
   **Band-Position (Hochkant)** (2.3): **ganz unten** (varsayılan, tam alt kenarda) veya **über dem Chat** (bant
   yorumların üstünde durur) – panelde Ayarlar altında, telefonda **📐 Band** ile ya da sabit olarak
   `?layout=portrait&bandpos=chat`.

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

### 6. Sanal kamera – WhatsApp, FaceTime, Zoom, Teams, Meet'te LiveFX
Aynı sahne (kamera + overlay) yayın yerine görüntülü aramalar için **kamera** da olabilir:
1. Sağ alt **Kontroller → „Sanal Kamerayı Başlat“**.
2. Görüşme uygulamasında kamera olarak **„OBS Virtual Camera“** seç (Zoom: Ayarlar → Video · Teams: Cihaz ayarları ·
   Chrome'da Meet: dişli → Video · WhatsApp Desktop: aramada ⋯ → Kamera · FaceTime: **Video** menüsü).
3. **Mac** (macOS 13+, OBS 30+, OBS **Uygulamalar** klasöründe): ilk başlatmada **kamera uzantısına** izin ver –
   macOS 15+: *Sistem Ayarları → Genel → Giriş Öğeleri ve Uzantılar → Kamera Uzantıları*; macOS 13 / 14: *Sistem
   Ayarları → Gizlilik ve Güvenlik* → „OBS“ sistem yazılımı uyarısında **İzin Ver** –, sonra FaceTime'ı yeniden başlat.
4. **Windows:** Zoom, Teams, Discord, Chrome/Edge OBS kamerasını görür; bazı Store uygulamaları (bazı WhatsApp Desktop
   sürümleri) görmez – o zaman aramada **ekran paylaş** ve **📷 Kamera-Ansicht** penceresini seç.
- Sanal kamera **sadece görüntü** taşır – sesin uygulamanın mikrofonundan gider; efekt seslerini karşı taraf ancak
  „Bilgisayar sesini paylaş“ (Zoom) veya sanal ses kablosuyla duyar.
- OBS sahnesi olmadan da olur: Panel → **📷 Kamera-Ansicht** (`camera.html`) web kamerası + overlay'i tek pencerede
  gösterir → OBS'te **Pencere Yakalama** (**⧉ Ausgabe** = çubuksuz pencere), sonra „Sanal Kamerayı Başlat“.
- Telefon uygulamaları sanal kamera kabul etmez – Kamera görünümüyle video **kaydet** ve gönder. Ayrıntılar:
  [`KAMERA.md`](KAMERA.md#türkçe).

### 7. İkinci PC'de OBS veya telefonda yayın uygulaması – QR kodla
Asistanın 2. adımında („OBS verbinden“) **„📋 Kopieren“** düğmesinin yanında küçük bir **QR kod** var: overlay
adresinin **Wi‑Fi'deki** hali, ör. `http://192.168.178.23:8787/overlay.html?key=…`. Anahtar (`key=…`) yalnızca overlay'i
açar (sayfa + efektler, salt okunur) – kontrol yok. „Hochkant 9:16“ seçilirse QR `layout=portrait` içerir. Aynı adres
**🖨 Einrichtungskarte** üzerinde ve başlangıç penceresinde de yazar.

**İkinci PC'de OBS:** QR'ı telefonla tara ve adresi kendine gönder (ya da ekrandan yaz). Yayın PC'sinde OBS'te
**Kaynaklar → + → Tarayıcı** → bu URL, boyut 2. adımdaki gibi. İki PC aynı ağda olmalı.

**Telefonda yayın uygulamaları** – dürüst özet (Ekim 2026, menü adları sürüme göre değişebilir, hepsini biz test
etmedik):

| Uygulama | URL ile web overlay? | Not |
|---|---|---|
| **PRISM Live Studio** (iOS/Android, ücretsiz) | evet – „Web Widget“: URL gir → web sayfası yayında katman olur | mağaza açıklamasına göre bağış/uyarı widget'ları için |
| **Larix Broadcaster** (iOS/Android) | evet – Ayarlar → Overlays → „Web widgets“ → URL | HTML katmanları kısmen yalnızca Larix Premium ile |
| **Moblin** (iOS, ücretsiz, açık kaynak) | evet – „Browser“ widget'ı, URL ile | sürüm notlarına göre şeffaf arka plan mümkün |
| **Streamlabs Mobile** (iOS/Android) | belirsiz – kendi widget'ları var; rastgele URL'nin çalışıp çalışmadığı resmi olarak açıklanmamış | önce dene |
| **TikTok LIVE Studio** (Windows PC, telefon uygulaması değil) | evet – „Link“ kaynağı | bazı sürümler link kaynağını 0 × 0 piksel yükler (bilinen sorun) → o zaman OBS + „Sanal Kamera“ |
| **TikTok, Instagram, YouTube, Twitch uygulaması** | hayır – yabancı overlay almaz | OBS/yayın yazılımı ile (§4) |

Web katmanı destekleyen bir uygulamayla:
1. Telefon ve LiveFX PC'si **aynı Wi‑Fi**'de (overlay adresi Wi‑Fi üzerinden çalışır; mobil veriyle uygulama PC'ye
   ulaşamaz).
2. Asistanda formatı seç (çoğunlukla **Hochkant 9:16**), küçük QR'ı telefon kamerasıyla tara, bağlantıya uzun bas →
   **kopyala**.
3. Uygulamada web/tarayıcı katmanı ekle, adresi yapıştır, katmanı **tam ekran** yap.
4. Panelde **„✨ Test-Effekt“** – kart uygulamanın önizlemesinde görünmeli.
- **Ses:** Birçok uygulama web katmanının sesini yayına vermez.
- **Performans:** Takılma olursa adresin sonuna `&perf=eco` ekle.

### Sık görülen sorunlar
| Sorun | Çözüm |
|---|---|
| Overlay boş / durum „noch nicht verbunden“ kalıyor | URL'yi kontrol et (`127.0.0.1:8787`), `node server.js` hâlâ çalışıyor mu? Panelde „OBS-Bridge“ yeşil olmalı. Tarayıcı kaynağına sağ tık → **Yenile**. |
| Görüntü var, ses yok | Tarayıcı kaynağında „Sesi OBS üzerinden kontrol et“ işaretli olmalı; mikser çubuğuna bak. |
| İzleyiciler beni duymuyor | Mikrofonu OBS kaynağı „Ses Giriş Yakalama“ olarak ekle (adım 5) – bkz. `docs/AUDIO.md`. |
| Yankı / efekt iki kez geliyor | Panelde önizleme sesi kapalı (varsayılan), masaüstü sesi sessiz, izleme kapalı, overlay'li **tek** tarayıcı kaynağı. |
| Mikrofon hiçbir şey tanımıyor | Panel yalnız Chrome/Edge'de; mikrofon iznini ver; dili „Automatisch (DE/TR/EN)“ bırak ya da uygun seç; ana dili (Hauptsprache) Türkçe yap. |
| OBS başka bilgisayarda | „Kopieren“ yanındaki QR koddaki anahtarlı adresi kullan (`http://<PC>:8787/overlay.html?key=…`) – bkz. §7. LiveFX 2.3'ten itibaren Wi‑Fi'de kendiliğinden erişilebilir (`--local` ile başlatma). |

---

## English

### 1. Preparation
1. Install **OBS Studio**: <https://obsproject.com> (free, Windows/Mac/Linux).
2. Start LiveFX: **double-click `start/Start-LiveFX.bat`** (Mac: `start/Start-LiveFX.command`) – keep the black window
   open. Node.js missing? The window explains it, details: [`START.md`](START.md#english). (Alternative: terminal in the
   LiveFX folder → `node server.js`.)
3. The panel opens in the browser: `http://127.0.0.1:8787/` (Chrome or Edge) – this is where the mic runs. Pair the
   phone by QR first (step 0 in the assistant, [`HANDY.md`](HANDY.md#english)), then OBS.

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
   **Band-Position (Hochkant)** (2.3): **ganz unten** (default, flush with the bottom edge) or **über dem Chat** (the
   band sits above the comments) – in the panel settings, on the phone with **📐 Band**, or pinned with
   `?layout=portrait&bandpos=chat`.

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

### 6. Virtual camera – LiveFX in WhatsApp, FaceTime, Zoom, Teams, Meet
The same scene (camera + overlay) can be a **camera** for video calls instead of a stream:
1. Bottom right **Controls → “Start Virtual Camera”**.
2. In the call app pick the camera **“OBS Virtual Camera”** (Zoom: Settings → Video · Teams: Device settings · Meet in
   Chrome: gear → Video · WhatsApp Desktop: in the call ⋯ → Camera · FaceTime: **Video** menu).
3. **Mac** (macOS 13+, OBS 30+, OBS in the **Applications** folder): on first start allow the **camera extension** –
   macOS 15+: *System Settings → General → Login Items & Extensions → Camera Extensions*; macOS 13 / 14: *System
   Settings → Privacy & Security* → **Allow** next to the note about system software from “OBS” –, then restart FaceTime.
4. **Windows:** Zoom, Teams, Discord, Chrome/Edge see the OBS camera; some Store apps (some WhatsApp Desktop versions)
   don't – then **share the screen** in the call and pick the **📷 Kamera-Ansicht** window.
- The virtual camera carries **picture only** – your voice goes through the app's microphone; others hear the effect
  sounds only with “Share computer sound” (Zoom) or a virtual audio cable.
- Works without an OBS scene too: panel → **📷 Kamera-Ansicht** (`camera.html`) shows webcam + overlay in one window →
  OBS **Window Capture** (**⧉ Ausgabe** = window without toolbar), then “Start Virtual Camera”. Don't also use the
  webcam as an OBS source (on Windows only one program can use it at a time).
- Phone apps don't accept a virtual camera – **record** a video with the camera view and send it. Details:
  [`KAMERA.md`](KAMERA.md#english).

### 7. OBS on a second PC or a streaming app on the phone – by QR code
In step 2 of the assistant (“OBS verbinden”) there is a small **QR code** next to **“📋 Kopieren”**: the overlay
address as it is reachable **in the Wi‑Fi**, e.g. `http://192.168.178.23:8787/overlay.html?key=…`. The key (`key=…`)
opens the overlay only (page + effects, read-only) – no control. Pick “Hochkant 9:16” and the QR code carries
`layout=portrait`. The same address is on the **🖨 Einrichtungskarte** and in the start window.

**OBS on a second PC:** scan the QR code with your phone and send yourself the address (or type it from the screen).
On the streaming PC in OBS: **Sources → + → Browser** → this URL, size as in step 2. Both PCs on the same network.

**Streaming apps on the phone** – an honest overview (October 2026, menu names differ between versions, we have not
tested every app ourselves):

| App | Web overlay by URL? | Note |
|---|---|---|
| **PRISM Live Studio** (iOS/Android, free) | yes – “Web Widget”: enter a URL → the web page becomes a layer in the stream | the store listing pitches it for donation/alert widgets |
| **Larix Broadcaster** (iOS/Android) | yes – Settings → Overlays → “Web widgets” → URL | HTML layers partly need Larix Premium |
| **Moblin** (iOS, free, open source, IRL streaming) | yes – “Browser” widget with a URL | transparent background possible according to the release notes |
| **Streamlabs Mobile** (iOS/Android) | unclear – own widgets/themes; whether any URL works as a layer is not officially documented | test first |
| **TikTok LIVE Studio** (Windows PC, not a phone app) | yes – “Link” source | some versions load link sources at 0 × 0 pixels (known issue) → then OBS + “Virtual Camera” |
| **TikTok, Instagram, YouTube, Twitch apps** | no – they don't take third-party overlays | go through OBS / streaming software (§4) |

With an app that supports web layers:
1. Phone and LiveFX PC on the **same Wi‑Fi** (the overlay address runs over the Wi‑Fi; on mobile data the app cannot
   reach the PC).
2. Pick the format in the assistant (mostly **Hochkant 9:16**), scan the small QR code with the phone camera,
   long-press the link → **copy**.
3. Add a web/browser layer in the app, paste the address, stretch the layer to **full frame**.
4. Press **“✨ Test-Effekt”** in the panel – the card must show up in the app's preview.
- **Sound:** many apps do not put a web layer's audio into the stream.
- **Performance:** the overlay renders on the phone too – on stutter append `&perf=eco` to the address.

### Common problems
| Problem | Fix |
|---|---|
| Overlay stays empty / status stays “noch nicht verbunden” | Check the URL (`127.0.0.1:8787`), is `node server.js` still running? “OBS-Bridge” in the panel must be green. Right-click the browser source → **Refresh**. |
| Picture but no sound | Tick “Control audio via OBS” in the browser source; check the mixer bar. |
| Viewers cannot hear me | Add the mic as OBS source “Audio Input Capture” (step 5) – see `docs/AUDIO.md`. |
| Echo / effect plays twice | Preview sound off in the panel (default), desktop audio muted, monitoring off, only **one** browser source with the overlay. |
| Mic recognises nothing | Panel only in Chrome/Edge; allow the mic permission; keep language “Automatisch (DE/TR/EN)” or pick yours; set the main language (Hauptsprache). |
| OBS on another PC | Use the address with key from the QR code next to “Kopieren” (`http://<PC>:8787/overlay.html?key=…`) – see §7. Since 2.3 LiveFX is reachable in the Wi‑Fi by itself (don't start it with `--local`). |
