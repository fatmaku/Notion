# Kamera-Ansicht – LiveFX in WhatsApp, FaceTime, Zoom & Co. · Kamera görünümü · Camera view

**Kurz / Kısaca / In short:** `http://127.0.0.1:8787/camera.html` zeigt deine Webcam **und** das LiveFX-Overlay in
**einem** Fenster. Dieses eine Fenster bekommst du über die **OBS-Kamera** in fast jede Video-App, teilst es im Call
als Bildschirm – oder nimmst es mit **⏺ Aufnahme** direkt als Video auf (auch am Handy) und schickst es per WhatsApp.

- [🇩🇪 Deutsch](#deutsch)
- [🇹🇷 Türkçe](#türkçe)
- [🇬🇧 English](#english)

---

## Deutsch

### Was ist die Kamera-Ansicht?

Im Panel gibt es die Karte **📷 Kamera-Ansicht** (Knöpfe **Öffnen**, **⏺ Aufnahme**, **✏️ Zeichenfilm**, **Link kopieren**). Die Seite
`camera.html` legt das echte Overlay (`overlay.html`, dieselben Effekte, dieselbe Live-Story) durchsichtig über dein
Kamerabild – genau so, wie es OBS mit Kamera + Browser-Quelle macht, nur ohne OBS.

Unten in der Leiste: Kamera wählen · **↔ Spiegeln** · **16:9 / 9:16** · 🔊 Effekt-Sounds in diesem Fenster ·
**⏺ Aufnahme** · **🎙️ Live-Mikro** · ⛶ Vollbild · **⧉ Ausgabe** (sauberes Fenster ohne Leiste) · ⚙ mehr (Mikrofon,
720p/1080p, MP4/WebM, Aufnahme-Art, Story-Stil, Sprache). Tasten: **R** Aufnahme, **M** spiegeln, **F** Vollbild,
**H** Leiste aus/ein (auch Doppelklick aufs Bild).

Das Bild hat immer die echte Ausgabegröße (1280 × 720 bzw. 720 × 1280, mit 1080p 1920 × 1080 / 1080 × 1920) und
wird nur fürs Fenster verkleinert – Effekte sitzen also genau da, wo sie auch in OBS säßen.

### Welche App – welcher Weg?

| App | Am PC / Mac | Am Handy |
|---|---|---|
| **Zoom, Teams, Google Meet, Discord, Skype** | **Weg A** (OBS-Kamera) – beste Qualität. Ohne OBS: **Weg B** (Fenster teilen). | Keine fremde Kamera möglich → **Weg C** (Video aufnehmen) oder vom PC aus anrufen |
| **WhatsApp** | Desktop-App: **Weg A**, wenn „OBS Virtual Camera“ in der Kamera-Liste auftaucht (unter Windows nicht bei jeder App-Version) – sonst **Weg B**: im Videoanruf **Bildschirm teilen** → Fenster „LiveFX – Kamera“ | **Weg C**: aufnehmen und als Video schicken (Knopf **📤 Teilen**) |
| **FaceTime** | Mac mit **macOS 13 (Ventura) oder neuer** + **OBS 30 oder neuer**: **Weg A** (OBS installiert dafür eine Kamera-Erweiterung) – oder SharePlay „Bildschirm teilen“ (**Weg B**) | iPhone: **Weg C** oder vom Mac aus anrufen |
| **TikTok / Instagram / YouTube Live** | Das ist Streaming, kein Call: [`OBS-ANLEITUNG.md`](OBS-ANLEITUNG.md) | Streamlabs Mobile o. ä. – siehe README |

> Ehrlich gesagt: **Handy-Apps (WhatsApp, FaceTime, Instagram) lassen keine fremde Kamera zu** – weder Android noch
> iOS erlauben eine „virtuelle Kamera“ ohne Root/Jailbreak. Live geht LiveFX deshalb nur vom PC/Mac aus in den Call;
> am Handy nimmst du ein Video auf und schickst es.

### Weg A – OBS „Virtuelle Kamera“ (beste Qualität, PC + Mac)

1. OBS einrichten wie in [`OBS-ANLEITUNG.md`](OBS-ANLEITUNG.md): **Videoaufnahmegerät** (Webcam) + **Browser**-Quelle
   mit `overlay.html` darüber. *Alternative:* statt beider Quellen nur **Fensteraufnahme** von `camera.html`
   (Knopf **⧉ Ausgabe** öffnet ein sauberes Fenster ohne Leiste) – praktisch, wenn du die Kamera-Ansicht
   sowieso offen hast.
2. In OBS unten rechts **Steuerung → „Virtuelle Kamera starten“**.
3. In der Call-App als Kamera **„OBS Virtual Camera“** wählen (Zoom: Einstellungen → Video; Teams: Geräteeinstellungen;
   Meet/Chrome: Zahnrad → Video; WhatsApp Desktop: im Anruf ⋯ → Kamera; FaceTime: Menü **Video** → Kamera).
4. **Mac:** OBS muss im Ordner **Programme** liegen (sonst installiert macOS die Kamera-Erweiterung nicht). Beim
   ersten Start fragt macOS nach der **Kamera-Erweiterung** und will sie erlaubt haben:
   - **macOS 15 (Sequoia) und neuer:** *Systemeinstellungen → Allgemein → Anmeldeobjekte & Erweiterungen →
     Kamera-Erweiterungen* → OBS einschalten.
   - **macOS 13 (Ventura) / 14 (Sonoma):** *Systemeinstellungen → Datenschutz & Sicherheit* → unten beim Hinweis zur
     Systemsoftware von „OBS“ auf **Erlauben** klicken.

   Danach FaceTime / die App neu starten.
5. **Windows:** Die OBS-Kamera ist eine klassische DirectShow-Kamera. Zoom, Teams, Discord, Chrome/Edge (Meet) sehen
   sie; manche Store-Apps (z. B. einzelne Versionen von WhatsApp Desktop, die Windows-Kamera-App) zeigen sie nicht –
   dann **Weg B**.

Wichtig:
- **Eine Webcam = ein Programm.** Unter Windows kann meist nur *ein* Programm die Webcam benutzen. Nutzt OBS sie,
  meldet `camera.html` „Kamera ist belegt“ (und umgekehrt). Also entweder OBS-Quellen *oder* `camera.html` als
  Fensteraufnahme – nicht beides mit derselben Kamera.
- **Ton:** Die virtuelle Kamera überträgt **nur Bild**. Deine Stimme nimmt die Call-App wie immer übers Mikro. Die
  Effekt-Sounds hören die anderen nur, wenn du in Zoom „Computerton teilen“ aktivierst oder (für Profis) den
  OBS-Ton über ein virtuelles Audiokabel (z. B. VB-CABLE) als Mikro in die App schickst.
- **Spiegeln:** Call-Apps spiegeln dein eigenes Vorschaubild selbst. Damit Schrift im Raum für die anderen richtig
  herum ist, in der Kamera-Ansicht **↔ Spiegeln** ausschalten (die LiveFX-Effekte werden nie gespiegelt).

### Weg B – ohne OBS: Fenster teilen

1. `camera.html` öffnen (Panel → **📷 Öffnen**), Format wählen, am besten **⧉ Ausgabe** für ein Fenster ohne Leiste.
2. Im Call **Bildschirm teilen** → das Fenster **„LiveFX – Kamera“** wählen (Meet in Chrome: den **Tab** teilen und
   **„Tab-Audio teilen“** anhaken – dann hören alle auch die Effekt-Sounds).
3. Die normale Kamera im Call **ausschalten**, sonst sieht man dich doppelt.

Bildschirmteilen ist auf Text optimiert und kann bei Bewegung ruckeln – in Zoom „Für Videoclip optimieren“
anhaken. Für flüssige Videocalls ist **Weg A** besser.

### Weg C – aufnehmen statt live (auch am Handy)

`camera.html?record=1` (Panel → **⏺ Aufnahme**): **⏺** drücken, erzählen, **⏹** – das Video bleibt auf deinem Gerät.
Danach **⬇ Herunterladen** oder **📤 Teilen** (am Handy direkt an WhatsApp, Instagram, …).

- Im Video: Kamerabild, alle Effekte, die Live-Story (auch als **Zeichnung**, die beim Erzählen entsteht),
  dein **Mikrofon** und die **Effekt-Sounds** (beides abschaltbar unter ⚙).
- Format: **MP4 mit H.264**, wo der Browser einen H.264-Encoder hat – Chrome/Edge 126+ unter **Windows / macOS**,
  **Safari** (Mac, iPhone); Android-Chrome je nach Gerät. Das spielen WhatsApp und iPhones ab. Sonst (z. B. Chrome
  unter Linux, Firefox) wird es **WebM** – das Ergebnis sagt es dir dann; fürs iPhone vorher umwandeln (z. B.
  HandBrake). Höchstens 20 Minuten pro Aufnahme.
- **Aufnahme-Art „Leinwand“** (Standard, läuft überall): LiveFX malt Kamera + Overlay selbst in ein Video.
  GIFs aus der GIF-Suche (KLIPY/GIPHY) fehlen dabei – der Browser sperrt fremde Bilder für Aufnahmen –, ebenso
  selbst hochgeladene MP3-Sounds (die eingebauten Sounds und Szenen-Loops sind drin).
- **„Pixelgenau – Tab-Aufnahme“** (Chrome/Edge am PC): nimmt exakt die Pixel des Bildes auf, inklusive GIFs; mit
  **„Tab-Audio teilen“** auch jeden Sound der Seite. Der Browser fragt einmal, ob er den Tab aufnehmen darf. Vor dem
  Start prüft LiveFX, ob wirklich Bild ankommt: am liebsten nur der Bildausschnitt; geht das nicht, der ganze Tab
  (die Leiste ist dann mit im Video – Taste **H** blendet sie aus); kommt gar kein Bild, nimmt LiveFX automatisch mit
  der „Leinwand“ auf (Hinweis in der Leiste). Die Videogröße ist die Größe des Bildes am Bildschirm – für die beste
  Qualität das Fenster groß ziehen. Klickst du in Chromes Leiste auf **„Freigabe beenden“**, endet auch die Aufnahme.
- Während der Aufnahme das Fenster **sichtbar** lassen (Browser bremsen Hintergrund-Tabs).
- **🎨 Zeichenfilm ohne Kamera** (2.3): Panel → **✏️ Zeichenfilm** öffnet
  `camera.html?cam=off&storystyle=sketch&story=full&mic=1&record=1` – keine Webcam, Story-Stil *Zeichnung*, die
  Geschichte füllt das **ganze Bild** (`story=full`), das Live-Mikro startet. **⏺**, erzählen, **⏹**: das Video zeigt,
  wie die Szene beim Erzählen Strich für Strich entsteht, mit deiner Stimme. Für 9:16 (Reels, TikTok, Status)
  `&aspect=9:16` anhängen. Nur die Kamera abschalten geht auch in der Kamera-Liste: **„🎨 Ohne Kamera“** (gilt für
  dieses Fenster; das nächste `camera.html` öffnet wieder die Webcam).

### Am Handy

1. **Kamera und Mikro brauchen HTTPS.** Der WLAN-Link (`http://192.168…`) reicht dafür nicht. Im Panel in der Karte
   **📱 Handy** den **🌐 Internet-Link** starten und am Handy öffnen (das meldet dich an). Dann in der Adresszeile
   hinten `/mobile.html` durch **`/camera.html?record=1&aspect=9:16`** ersetzen.
2. Hochkant **9:16** wählen, aufnehmen, **📤 Teilen** → WhatsApp.
3. Andere Wege, wenn du *live* telefonieren willst:
   - **Vom PC/Mac anrufen** (Weg A/B) – das Handy ist dann nur Fernbedienung.
   - **Handy als Webcam für den PC:** iPhone + Mac mit *Integrationskamera* (Continuity Camera, macOS 13 / iOS 16),
     Android unter Windows 11 über *Einstellungen → Bluetooth & Geräte → Mobile Geräte*, oder Apps wie Camo,
     DroidCam, Iriun. Dann läuft LiveFX am PC wie gewohnt.
   - *Experimentell:* Im WhatsApp-/FaceTime-Anruf die eigene Kamera aus und **Bildschirm teilen**, während
     `camera.html` im Browser im Vordergrund läuft. Ob das Handy der Seite die Kamera dabei gibt, hängt vom
     Gerät ab – nicht garantiert.

### 🎙️ Live-Mikro – die Kamera-Ansicht als komplettes Studio

**🎙️ Live-Mikro** (oder `camera.html?mic=1`) startet die Spracherkennung direkt in dieser Seite (Chrome/Edge am PC
und Android, Safari am iPhone; HTTPS oder localhost). Stichwörter feuern Effekte – an **alle** Overlays, auch an OBS –,
ganze Sätze bauen die **Live-Story** im Band; mit Story-Stil **Zeichnung** entsteht das Bild beim Erzählen. Sprache
unter ⚙ (Türkçe / Deutsch / English). Nicht gleichzeitig das Mikro im Panel laufen lassen, sonst kommt jeder Effekt
doppelt.

### URL-Parameter

| Parameter | Wirkung |
|---|---|
| `aspect=16:9` \| `9:16` | Format (quer / hochkant) |
| `res=720` \| `1080` | Ausgabegröße (Standard 720p) |
| `mirror=0` \| `1` | Bild spiegeln (Standard an) |
| `cam=<deviceId>` | bestimmte Kamera; `cam=off` = **ohne Kamera** (nur Effekte + Story auf dunklem Grund, 2.3) |
| `clean=1` | nur das Bild, keine Leiste (Taste **H** blendet sie ein) |
| `mute=1` | Effekt-Sounds in diesem Fenster stumm (die Aufnahme hat sie trotzdem) |
| `record=1` | Aufnahme-Modus (Aufnahme-Knopf hervorgehoben) |
| `mic=1` | Live-Mikro sofort starten; `lang=tr-TR` \| `de-DE` \| `en-US` |
| `theme`, `story`, `band`, `zone`, `bandpos`, `storystyle`, `perf`, `volume` | werden ans Overlay durchgereicht (siehe [`STORY.md`](STORY.md)) |

### Fehlerhilfe

| Problem | Lösung |
|---|---|
| „Kamera ist belegt“ | OBS, Zoom, Teams o. ä. benutzt die Webcam – dort Kamera-Quelle deaktivieren / App schließen, dann **Erneut versuchen**. |
| „Kamera blockiert“ | Schloss-Symbol neben der Adresse → Kamera **Zulassen**, Seite neu laden. |
| „Kamera braucht HTTPS“ (Handy) | Internet-Link aus der Handy-Karte nutzen (siehe „Am Handy“). |
| Punkt unten links orange | Der LiveFX-Server läuft nicht oder ist nicht erreichbar (`node server.js`). Effekte aus dem Panel kommen dann nicht an. |
| Keine Effekt-Sounds | Einmal ins Fenster klicken (Browser geben Ton erst nach einem Klick frei); 🔊 an? |
| Effekte doppelt | Panel-Mikro **und** Live-Mikro laufen – eins ausschalten. |
| WhatsApp / iPhone spielt das Video nicht | Steht im Ergebnis „WEBM“ oder „kein H.264“, kann dein Browser kein H.264 aufnehmen: in Chrome/Edge unter Windows / macOS oder in Safari aufnehmen, oder das Video umwandeln (z. B. HandBrake). |
| GIF fehlt im Video | Aufnahme-Art **Pixelgenau** (PC) oder mit OBS aufnehmen. |
| Pixelgenau: Leiste mit im Video / „Pixelgenau nicht möglich“ | Der Browser kann den Tab nicht aufs Bild zuschneiden (ganzer Tab) bzw. liefert gar kein Bild (dann automatisch „Leinwand“). Aktuelles Chrome/Edge nutzen; Taste **H** blendet die Leiste aus. |
| Ruckelt | 720p wählen, im Panel *Leistung → Eco*, andere Tabs schließen. |

---

## Türkçe

### Kamera görünümü nedir?

Paneldeki **📷 Kamera-Ansicht** kartı (**Öffnen**, **⏺ Aufnahme**, **Link kopieren**) `camera.html` sayfasını açar:
web kameran ve LiveFX overlay'i (aynı efektler, aynı canlı hikâye) **tek pencerede**. OBS'teki kamera + tarayıcı
kaynağının aynısı – ama OBS olmadan.

Alt çubuk: kamera seçimi · **↔ Spiegeln** (ayna) · **16:9 / 9:16** · 🔊 bu penceredeki efekt sesleri · **⏺ Aufnahme**
(kayıt) · **🎙️ Live-Mikro** · ⛶ tam ekran · **⧉ Ausgabe** (çubuksuz temiz pencere) · ⚙ (mikrofon, 720p/1080p, MP4/WebM,
kayıt türü, hikâye stili, dil). Tuşlar: **R** kayıt, **M** ayna, **F** tam ekran, **H** çubuğu gizle/göster.

### Hangi uygulama – hangi yol?

| Uygulama | PC / Mac | Telefon |
|---|---|---|
| **Zoom, Teams, Google Meet, Discord** | **Yol A** (OBS sanal kamera) – en iyi kalite. OBS yoksa **Yol B** (pencere paylaş). | Yabancı kamera mümkün değil → **Yol C** (video kaydet) veya PC'den ara |
| **WhatsApp** | Masaüstü uygulaması: kamera listesinde „OBS Virtual Camera“ görünürse **Yol A** (Windows'ta her sürümde değil) – yoksa **Yol B**: görüntülü aramada **ekran paylaş** → „LiveFX – Kamera“ penceresi | **Yol C**: kaydet, **📤 Teilen** ile video olarak gönder |
| **FaceTime** | **macOS 13+** ve **OBS 30+** olan Mac: **Yol A** (OBS bir kamera uzantısı kurar) – veya SharePlay ekran paylaşımı (**Yol B**) | iPhone: **Yol C** veya Mac'ten ara |
| **TikTok / Instagram / YouTube Live** | Bu yayın, arama değil: [`OBS-ANLEITUNG.md`](OBS-ANLEITUNG.md#türkçe) | |

> Dürüst olalım: **Telefondaki uygulamalar (WhatsApp, FaceTime, Instagram) başka bir kamerayı kabul etmez** –
> Android ve iOS root/jailbreak olmadan „sanal kamera“ya izin vermez. Canlı görüşmede LiveFX ancak PC/Mac'ten
> çalışır; telefonda video kaydedip gönderirsin.

### Yol A – OBS „Sanal Kamera“ (PC + Mac)

1. OBS'i [`OBS-ANLEITUNG.md`](OBS-ANLEITUNG.md#türkçe) gibi kur: **Video Yakalama Aygıtı** + üstünde `overlay.html`
   **Tarayıcı** kaynağı. *Alternatif:* sadece `camera.html` için **Pencere Yakalama** (**⧉ Ausgabe** çubuksuz pencere açar).
2. OBS sağ alt: **Kontroller → „Sanal Kamerayı Başlat“**.
3. Görüşme uygulamasında kamera olarak **„OBS Virtual Camera“** seç.
4. **Mac:** OBS **Uygulamalar** klasöründe olmalı (yoksa macOS kamera uzantısını kurmaz). İlk başlatmada macOS
   **kamera uzantısı** için izin ister:
   - **macOS 15 (Sequoia) ve sonrası:** *Sistem Ayarları → Genel → Giriş Öğeleri ve Uzantılar → Kamera Uzantıları* →
     OBS'i aç.
   - **macOS 13 (Ventura) / 14 (Sonoma):** *Sistem Ayarları → Gizlilik ve Güvenlik* → aşağıda „OBS“ sistem yazılımı
     uyarısının yanında **İzin Ver**'e tıkla.

   Sonra FaceTime'ı / uygulamayı yeniden başlat.
5. **Windows:** Zoom, Teams, Discord, Chrome/Edge (Meet) OBS kamerasını görür; bazı Store uygulamaları (bazı WhatsApp
   Desktop sürümleri) görmez – o zaman **Yol B**.

Önemli: Windows'ta web kamerasını genelde **tek program** kullanabilir (OBS kullanıyorsa `camera.html` „Kamera ist
belegt“ der). Sanal kamera **sadece görüntü** taşır – sesin uygulamanın mikrofonundan gider; efekt seslerini
karşı taraf ancak Zoom'da „Bilgisayar sesini paylaş“ ile duyar. Odadaki yazılar karşı tarafa doğru görünsün diye
**↔ Spiegeln**'i kapat.

### Yol B – OBS'siz: pencere paylaş

`camera.html`'i aç (tercihen **⧉ Ausgabe**), görüşmede **Ekranı paylaş** → „LiveFX – Kamera“ penceresi (Chrome'da
Meet: **sekmeyi** paylaş ve **„Sekme sesini paylaş“** – efekt sesleri de gider). Görüşmedeki normal kamerayı kapat.

### Yol C – canlı yerine kaydet (telefonda da)

`camera.html?record=1` (panelde **⏺ Aufnahme**): **⏺**'a bas, anlat, **⏹** – video cihazında kalır. Sonra
**⬇ Herunterladen** (indir) veya **📤 Teilen** (telefonda doğrudan WhatsApp'a).

- Videoda: kamera, tüm efektler, canlı hikâye (anlatırken çizilen **çizim** dahil), **mikrofonun** ve **efekt
  sesleri** (⚙ altında kapatılabilir).
- Biçim: tarayıcıda H.264 kodlayıcı varsa **H.264'lü MP4** – **Windows / macOS**'ta Chrome/Edge 126+, **Safari**
  (Mac, iPhone); Android Chrome cihaza göre. WhatsApp ve iPhone bunu oynatır. Yoksa (ör. Linux'ta Chrome, Firefox)
  **WebM** olur – sonuç penceresi bunu söyler; iPhone için önce dönüştür (ör. HandBrake). En fazla 20 dakika.
- **„Leinwand“** (varsayılan): GIF aramasından gelen GIF'ler (KLIPY/GIPHY) ve kendi yüklediğin MP3 sesleri videoda
  yok – tarayıcı yabancı resimleri kayda izin vermez (yerleşik sesler ve sahne döngüleri var). **„Pixelgenau“** (PC'de
  Chrome/Edge) ekrandaki pikselleri birebir kaydeder, GIF'ler dahil; **„Sekme sesini paylaş“** ile tüm sesler de.
  Başlamadan önce LiveFX gerçekten görüntü gelip gelmediğini kontrol eder: önce sadece resim alanı, olmazsa tüm sekme
  (çubuk da videoda olur – **H** tuşu gizler), hiç görüntü gelmezse otomatik „Leinwand“. Chrome'un **„Paylaşımı
  durdur“** çubuğuna basarsan kayıt da biter.
- Kayıt sırasında pencere **görünür** kalsın.
- **🎨 Kamerasız çizgi film** (2.3): panelde **✏️ Zeichenfilm** `camera.html?cam=off&storystyle=sketch&story=full&mic=1&record=1`
  açar – kamera yok, hikâye stili *Zeichnung*, hikâye **tüm resmi** doldurur (`story=full`), Live-Mikro başlar. Sadece
  kamerayı kapatmak için kamera listesinde **„🎨 Ohne Kamera“** seç (sadece bu pencere için).
  **🎙️ Live-Mikro** aç, **⏺**, anlat: video, sen anlatırken sahnenin nasıl çizildiğini senin sesinle gösterir. 9:16
  (Reels, TikTok, durum) için `&aspect=9:16` ekle. URL'de `cam=off` = kamerasız.

### Telefonda

1. **Kamera ve mikrofon HTTPS ister.** Wi-Fi bağlantısı (`http://192.168…`) yetmez. Panelde **📱 Handy** kartında
   **🌐 Internet-Link**'i başlat, telefonda aç (giriş yapar). Sonra adres çubuğunda sondaki `/mobile.html` yerine
   **`/camera.html?record=1&aspect=9:16`** yaz.
2. **9:16** dikey, kaydet, **📤 Teilen** → WhatsApp.
3. *Canlı* görüşmek istersen: **PC/Mac'ten ara** (Yol A/B); veya **telefonu PC'ye web kamerası yap** (iPhone + Mac:
   Süreklilik Kamerası, macOS 13 / iOS 16; Android + Windows 11: *Ayarlar → Bluetooth ve cihazlar → Mobil cihazlar*;
   ya da Camo, DroidCam, Iriun). *Deneysel:* WhatsApp/FaceTime aramasında kendi kameranı kapatıp **ekran paylaş**,
   `camera.html` tarayıcıda önde açıkken – telefona göre değişir, garanti değil.

### 🎙️ Live-Mikro – tek başına stüdyo

**🎙️ Live-Mikro** (veya `camera.html?mic=1`) konuşma tanımayı bu sayfada başlatır. Anahtar kelimeler efekt
ateşler (OBS dahil **tüm** overlay'lerde), cümleler bantta **canlı hikâyeyi** kurar; hikâye stili **Zeichnung**
(çizim) ile resim sen anlatırken çizilir. Dil ⚙ altında (Türkçe varsayılan, panelin ana diline göre). Paneldeki
mikrofonu aynı anda çalıştırma – her efekt iki kez gelir.

### Sorun giderme

| Sorun | Çözüm |
|---|---|
| „Kamera ist belegt“ | Kamerayı OBS/Zoom/Teams kullanıyor – orada kapat, **Erneut versuchen**. |
| „Kamera blockiert“ | Adresin yanındaki kilit → kameraya **izin ver**, sayfayı yenile. |
| „Kamera braucht HTTPS“ (telefon) | Handy kartındaki İnternet bağlantısını kullan. |
| Efekt sesi yok | Pencereye bir kez tıkla; 🔊 açık mı? |
| Efektler iki kez | Panel mikrofonu **ve** Live-Mikro açık – birini kapat. |
| WhatsApp/iPhone videoyu oynatmıyor | Sonuçta „WEBM“ veya „kein H.264“ yazıyorsa tarayıcın H.264 kaydedemiyor: Windows / macOS'ta Chrome/Edge ya da Safari ile kaydet veya videoyu dönüştür (ör. HandBrake). |
| Pixelgenau: çubuk videoda / „Pixelgenau nicht möglich“ | Tarayıcı sekmeyi resme göre kırpamıyor (tüm sekme) ya da hiç görüntü vermiyor (o zaman otomatik „Leinwand“). Güncel Chrome/Edge kullan; **H** çubuğu gizler. |
| Takılıyor | 720p, panelde *Leistung → Eco*, diğer sekmeleri kapat. |

---

## English

### What is the camera view?

The panel card **📷 Kamera-Ansicht** (**Öffnen** = open, **⏺ Aufnahme** = record, **Link kopieren** = copy link) opens
`camera.html`: your webcam with the real LiveFX overlay (same effects, same live story) on top, in **one window** – what
OBS does with a camera + browser source, without OBS. The picture always has the true output size (1280 × 720 /
720 × 1280, or 1920 × 1080 / 1080 × 1920 with 1080p) and is only scaled to fit the window.

Toolbar: camera picker · **↔ Spiegeln** (mirror) · **16:9 / 9:16** · 🔊 effect sounds in this window · **⏺ Aufnahme** ·
**🎙️ Live-Mikro** · ⛶ fullscreen · **⧉ Ausgabe** (clean output window) · ⚙ (microphone, 720p/1080p, MP4/WebM, recording
mode, story style, language). Keys: **R** record, **M** mirror, **F** fullscreen, **H** hide/show the toolbar.

### Which app – which way?

| App | PC / Mac | Phone |
|---|---|---|
| **Zoom, Teams, Google Meet, Discord** | **Way A** (OBS virtual camera) – best quality. Without OBS: **Way B** (share the window). | No third-party camera possible → **Way C** (record a video) or call from the PC |
| **WhatsApp** | Desktop app: **Way A** if “OBS Virtual Camera” shows up in its camera list (on Windows not in every app version) – otherwise **Way B**: **share screen** in the video call → window “LiveFX – Kamera” | **Way C**: record, send it as a video (**📤 Teilen**) |
| **FaceTime** | Mac with **macOS 13+** and **OBS 30+**: **Way A** (OBS installs a camera extension) – or SharePlay screen sharing (**Way B**) | iPhone: **Way C** or call from the Mac |
| **TikTok / Instagram / YouTube Live** | That is streaming, not a call: [`OBS-ANLEITUNG.md`](OBS-ANLEITUNG.md#english) | |

> Honestly: **phone apps (WhatsApp, FaceTime, Instagram) do not accept another camera** – neither Android nor iOS
> allows a “virtual camera” without root/jailbreak. Live calls with LiveFX therefore go from a PC/Mac; on the phone
> you record a video and send it.

### Way A – OBS “Virtual Camera” (PC + Mac)

1. Set up OBS as in [`OBS-ANLEITUNG.md`](OBS-ANLEITUNG.md#english): **Video Capture Device** + a **Browser** source with
   `overlay.html` on top. *Alternative:* a single **Window Capture** of `camera.html` (**⧉ Ausgabe** opens a clean window).
2. OBS bottom right: **Controls → “Start Virtual Camera”**.
3. In the call app pick the camera **“OBS Virtual Camera”**.
4. **Mac:** OBS must be in the **Applications** folder (otherwise macOS won't install the camera extension). On first
   start macOS asks you to allow the **camera extension**:
   - **macOS 15 (Sequoia) and later:** *System Settings → General → Login Items & Extensions → Camera Extensions* →
     switch OBS on.
   - **macOS 13 (Ventura) / 14 (Sonoma):** *System Settings → Privacy & Security* → click **Allow** next to the note
     about system software from “OBS”.

   Then restart FaceTime / the app.
5. **Windows:** Zoom, Teams, Discord, Chrome/Edge (Meet) see the OBS camera; some Store apps (some WhatsApp Desktop
   versions) do not – use **Way B** then.

Important: on Windows a webcam can usually be used by **one program** at a time (if OBS has it, `camera.html` says
“Kamera ist belegt”). The virtual camera carries **picture only** – your voice goes through the app's microphone as
usual; others hear the effect sounds only with Zoom's “Share computer sound” (or, advanced, OBS audio through a virtual
audio cable such as VB-CABLE used as the app's microphone). Turn **↔ Spiegeln** off so text in your room reads correctly
for the others (call apps mirror your self-view themselves; LiveFX effects are never mirrored).

### Way B – without OBS: share the window

Open `camera.html` (best: **⧉ Ausgabe**), in the call **Share screen** → window “LiveFX – Kamera” (Meet in Chrome:
share the **tab** and tick **“Share tab audio”** – effect sounds go along). Switch the call's own camera off. Screen
sharing is tuned for text; in Zoom tick “Optimize for video clip”.

### Way C – record instead of live (phones too)

`camera.html?record=1` (panel **⏺ Aufnahme**): press **⏺**, narrate, **⏹** – the video stays on your device. Then
**⬇ Herunterladen** (download) or **📤 Teilen** (share; on a phone straight to WhatsApp).

- In the video: camera, all effects, the live story (including the **drawing** that appears while you narrate), your
  **microphone** and the **effect sounds** (both switchable under ⚙).
- Format: **MP4 with H.264** where the browser has an H.264 encoder – Chrome/Edge 126+ on **Windows / macOS**,
  **Safari** (Mac, iPhone); Android Chrome depending on the device. WhatsApp and iPhones play that. Otherwise (e.g.
  Chrome on Linux, Firefox) it becomes **WebM** – the result tells you; convert it for iPhones (e.g. HandBrake). At most
  20 minutes per recording.
- **“Leinwand”** (canvas, default, works everywhere): LiveFX paints camera + overlay into the video itself; GIFs from the
  GIF search (KLIPY/GIPHY) are missing – browsers block foreign images in recordings – and so are your own uploaded MP3
  sounds (built-in sounds and scene loops are in). **“Pixelgenau”** (tab capture, Chrome/Edge on a PC) records the exact
  on-screen pixels, GIFs included, and with **“Share tab audio”** every sound of the page; the browser asks once.
  Before starting, LiveFX checks that a picture really arrives: just the picture area first; if the browser can't
  narrow it, the whole tab (the toolbar is in the video then – key **H** hides it); with no picture at all it records
  with “Leinwand” automatically (hint in the toolbar). Clicking Chrome's **“Stop sharing”** bar ends the recording too.
- Keep the window **visible** while recording (browsers throttle background tabs).
- **🎨 Drawn film without a camera** (2.3): panel **✏️ Zeichenfilm** opens
  `camera.html?cam=off&storystyle=sketch&story=full&mic=1&record=1` – no webcam, story style *Zeichnung*, the story
  fills the **whole picture** (`story=full`), Live-Mikro starts. To switch off just the camera, pick **“🎨 Ohne
  Kamera”** in the camera list (this window only).
  Switch on **🎙️ Live-Mikro**, press **⏺**, narrate: the video shows the scene being drawn as you tell it, with your
  voice. Add `&aspect=9:16` for Reels, TikTok or a status.

### On the phone

1. **Camera and microphone need HTTPS.** The Wi-Fi link (`http://192.168…`) is not enough. In the panel card
   **📱 Handy** start the **🌐 Internet-Link** and open it on the phone (this logs you in). Then replace the trailing
   `/mobile.html` in the address bar with **`/camera.html?record=1&aspect=9:16`**.
2. Portrait **9:16**, record, **📤 Teilen** → WhatsApp.
3. For *live* calls: **call from the PC/Mac** (Way A/B); or **use the phone as the PC's webcam** (iPhone + Mac:
   Continuity Camera, macOS 13 / iOS 16; Android + Windows 11: *Settings → Bluetooth & devices → Mobile devices*; or
   Camo, DroidCam, Iriun). *Experimental:* in a WhatsApp/FaceTime call switch your camera off and **share the screen**
   while `camera.html` runs in the browser in the foreground – depends on the phone, not guaranteed.

### 🎙️ Live-Mikro – a complete studio

**🎙️ Live-Mikro** (or `camera.html?mic=1`) runs speech recognition in this page (Chrome/Edge on PC and Android, Safari
on iPhone; HTTPS or localhost). Keywords fire effects (in **every** overlay, OBS too), sentences build the **live story**
in the band; with story style **Zeichnung** (sketch) the picture is drawn while you narrate. Language under ⚙. Don't run
the panel microphone at the same time – every effect would fire twice.

### URL parameters

`aspect=16:9|9:16` · `res=720|1080` · `mirror=0|1` · `cam=<deviceId>` (`cam=off` = no camera, 2.3) · `clean=1` (picture only) · `mute=1` (no effect
sounds in this window; recordings still have them) · `record=1` · `mic=1` + `lang=tr-TR|de-DE|en-US` · and the overlay's
own `theme`, `story`, `band`, `zone`, `bandpos`, `storystyle`, `perf`, `volume` (passed through, see [`STORY.md`](STORY.md)).

### Troubleshooting

| Problem | Fix |
|---|---|
| “Kamera ist belegt” (camera busy) | OBS/Zoom/Teams uses the webcam – release it there, then **Erneut versuchen** (retry). |
| “Kamera blockiert” (blocked) | Lock icon next to the address → allow the camera, reload. |
| “Kamera braucht HTTPS” (phone) | Use the Internet link from the Handy card. |
| Status dot orange | The LiveFX server is not running / not reachable (`node server.js`). |
| No effect sounds | Click into the window once (browsers unlock audio after a click); 🔊 on? |
| Effects twice | Panel microphone **and** Live-Mikro are running – stop one. |
| WhatsApp / iPhone won't play the video | If the result says “WEBM” or “kein H.264”, your browser can't record H.264: record in Chrome/Edge on Windows / macOS or in Safari, or convert the video (e.g. HandBrake). |
| Pixelgenau: toolbar in the video / “Pixelgenau nicht möglich” | The browser can't crop the tab to the picture (whole tab) or delivers no picture at all (then “Leinwand” automatically). Use a current Chrome/Edge; key **H** hides the toolbar. |
| GIF missing in the video | Recording mode **Pixelgenau** (PC) or record with OBS. |
| Stutters | 720p, panel *Leistung → Eco*, close other tabs. |

---

Technik: `js/camera.js` (Kompositor, Aufnahme, Live-Mikro), `css/camera.css`, `camera.html`; Tests
`test/e2e/37-camera.js`. Die Kamera-Ansicht lädt das unveränderte `overlay.html` in einem durchsichtigen,
klick-durchlässigen iframe in Ausgabegröße – was dort erscheint, erscheint auch in OBS.
