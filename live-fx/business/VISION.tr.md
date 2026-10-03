# LiveFX – Sonraki Adımlar

**Sen anlat – sahne oluşsun.** Vizyon 2027–2029: kelimelerden canlı video, dil öğrenme, yeni mekânlar ve kendi kendine kurgu yapan bir editör.

Tarih: Ekim 2026 · Ürün sürümü: 2.0 · Gizli
Kurucu: [İsim] · İletişim: [E-posta]

> Almanca: VISION.md · English: VISION.en.md

> Pazar verileri kamuya açık ikincil kaynaklardan alınmıştır ve [Kaynak n] ile işaretlenmiştir (liste `QUELLEN.tr.md` dosyasında, 1–60 numaralar). Kendi fiyatlarımız, adetlerimiz ve gelirlerimiz „tahmin“ olarak belirtilmiştir. Henüz var olmayan işlevler **Vizyon** olarak işaretlenmiştir. [Köşeli parantez] içindeki bilgileri kurucu tamamlayacaktır.

---

## 1. Mesele ne?

LiveFX bugün yayıncıyı dinliyor ve bir saniyeden kısa sürede canlı yayına meme'ler, GIF'ler, sesler ve animasyonlu sahneler ekliyor: canlı altyazı gibi, ama yazı yerine resimler, meme'ler ve seslerle. Sürüm 2.0 Almanca, Türkçe ve İngilizceyi otomatik tanıyor, şiveye toleranslı, beş pakette 238 tetikleyici, 13 sahne ve 12 atmosfer döngüsüyle bir hikâye modu sunuyor, tarayıcıda ve istenirse çevrimdışı çalışıyor.

Bir sonraki aşama LiveFX'i **konuşulan her şeyin görsel diline** dönüştürüyor. Birinin anlattığı, sesli okuduğu ya da derste söylediği her şey aynı saniyede kesintisiz bir sahne, telaffuzlu bir kelime kartı ya da kurgusu bitmiş bir klip olarak beliriyor: yayında, sınıfta, sahnede, akıllı gözlükte ve kurgu programında. Görüntü kişinin kendi cihazındaki tarayıcıda oluşuyor; **bir veri merkezinin değil, bir altyazının işlem bütçesiyle**.

**Slogan:** „Sen anlat – sahne oluşsun.“ (Almanca özgün slogan „Du redest. Es wird Bild.“; Türkçe öneri kurucu tarafından kontrol edilecek.)

**Dört hat**

| Hat | Ad | Renk | Ne oluşuyor | Durum |
|---|---|---|---|---|
| **A** | Anlatı Filmi – Generative Scene Engine | Neon yeşil | Kelimelerden, cümlelerden ve bağlamdan, canlı görüntünün altında ya da yanında akan animasyonlu bir film | Vizyon, prototip mevcut |
| **B** | Kelime-Resim – Dil öğrenme ve okuma desteği | Altın | Söylenen kelime → resim + hedef dildeki kelime + telaffuz; ya da kendi dilinde okuma desteği | Vizyon, prototip mevcut |
| **C** | LiveFX Mekânlar – Sahne, sınıf, sesli kitap, AR/VR, gözlük | Açık mavi | Aynı motor, yeni ekranlarda | Sahne bugün kullanılabilir, gerisi vizyon |
| **D** | LiveFX Studio – Canlı kurgu ve otomatik kurgu | Neon pembe | Yayından öne çıkan anlar ve hazır videoların otomatik kurgusu, yerel olarak dışa aktarılır | Vizyon |

**Ek materyaller**

- Dil öğrenme prototipi: `prototypes/sprachlernen.html` (Kelime-Resim, B hattı, tek HTML dosyası, çevrimdışı)
- Canlı hikâye prototipi: `prototypes/live-story.html` (Anlatı Filmi, A hattı, tek HTML dosyası, çevrimdışı)
- Vizyon fragmanı (35 sn): Türkçe sürüm `video/LiveFX_Vision_tr_16x9.mp4` ve `video/LiveFX_Vision_tr_9x16.mp4`; ayrıca Almanca ve İngilizce sürümler `video/LiveFX_Vision_de_16x9.mp4`, `video/LiveFX_Vision_de_9x16.mp4`, `video/LiveFX_Vision_en_16x9.mp4`, `video/LiveFX_Vision_en_9x16.mp4`
- Sunumda 12–15. slaytlar: `LiveFX_Pitch_TR.pptx` (Almanca `LiveFX_Pitch.pptx`, İngilizce `LiveFX_Pitch_EN.pptx`)
- Finansal değerlendirme: `BUSINESSPLAN.tr.md`, „Gelecek“ bölümü; pazarlar: `MARKTANALYSE.tr.md`, „Komşu pazarlar“

---

## 2. Temel ilke: üretmek yerine çizmek

Üretken video yapay zekâsı her kareyi pahalı grafik işlemcilerinde sıfırdan hesaplar; bekleme süresi saniyelerden dakikalara uzanır. Canlı yayın için bu hem fazla yavaş hem fazla pahalı. LiveFX tersini yapıyor: Bir cümle **küçük bir durum değişikliğine** (birkaç yüz bayt) çevriliyor ve tarayıcı sahneyi bundan **çiziyor**; deterministik olarak, saniyede 60 kareyle.

| | Üretken video yapay zekâsı | LiveFX |
|---|---|---|
| Ne hesaplanıyor | her karenin her pikseli | cümle başına bir durum farkı (200–500 bayt) |
| Nerede | veri merkezi (GPU) | kişinin kendi cihazındaki tarayıcı |
| Gecikme | saniyelerden dakikalara | bir saniyenin altında |
| Canlı mümkün mü | hayır | evet |
| Saatlik eşlik videosu maliyeti | liste fiyatıyla 180–2.700 USD [Kaynak 24, 25] | yapay zekâsız 0 €, isteğe bağlı metin yapay zekâsıyla 0,25–0,75 USD (proje ölçümü) |
| Tekrarlanabilir mi | hayır (modelde rastlantı) | evet: aynı metin + aynı seed = aynı görüntü |
| Veri koruma | yükleme gerekli | veriler cihazda kalır |

Hesap şöyle: Video yapay zekâsı liste fiyatıyla saniyesi 0,05 USD (Veo 3.1 Lite, 720p) ile 0,75 USD arasında [Kaynak 24, 25]. Bir saat 3.600 saniye eder, yani 180–2.700 USD. LiveFX böylece **240 ile 10.000 kattan fazla daha ucuz** ve video yapay zekâsının aksine canlı çalışıyor. **Dürüst konumlandırma:** Sonuç stilize bir resimli kitap dünyası, fotogerçekçi bir yapay zekâ videosu değil. Hızlı, ucuz ve çocuklara uygun olmasının sebebi de tam olarak bu.

---

## 3. Mimari: tek akış, tek veri formatı, birçok ekran

```
Ses/Dosya ─► Transkript ──────────────► Anlama ────────────────────► Zaman çizelgesi (LTF) ─► Çıkış hedefleri
             asr.js · whisper-worker      matcher.js · langdetect.js    timeline.js                fx.js katmanı · Bant/Split · Kelime-Resim
             /api/transcript              scene-director.js · smart.js  (tek JSON formatı)         Sahne · Companion · AR/XR · Studio dışa aktarım
```

**Ortak omurga: LiveFX zaman çizelgesi (LTF v1).** Dört hattın hepsi için tek bir JSON formatı; `docs/CONTRACTS.md` dosyasında sabitlenecek (Vizyon, 2026 4. çeyrek):

```
{ v:1, lang, seed, start, events:[ {t, kind, …} ] }
kinds: state (dünya durumu, A) · fire (tetikleyici, bugünkü gibi) · word (Kelime-Resim, B)
       caption (zaman damgalı kelime) · cut / zoom (kurgu, D) · gift / chat (sinyaller)
```

- **A** zaman çizelgesini canlı yazar, **B** kelimeleri ekler, **C** onu başka ekranlarda oynatır, **D** düzenler ve dışa aktarır.
- Her kare, fragman motoru `video/engine.js` örneğindeki gibi `render(zustand, t, seed)` ile oluşur. Böylece her kare deterministik, tekrarlanabilir ve dışa aktarılabilir.
- Yeniden kullanılanlar: konuşma tanıma (`asr.js`, „hızlı“ ve „kesin“ tepki), çevrimdışı Whisper (`whisper-worker.js`), bulanık eşleştirme ve şive toleranslı eşleştirici (`matcher.js`), dil algılama (`langdetect.js`), efekt motoru (`fx.js`, otomatik azaltmalı ParticleLayer), ses mikseri (`sounds.js`, ducking, yankı), köprü (`bus.js`, SSE), telefondan uzaktan kumanda (`mobile.html`), isteğe bağlı yapay zekâ (`smart.js`).
- Çekirdekte **yeni** olan yalnızca üç yapı taşı: `scene-director.js` (cümle → durum farkı), `schema.js` v4 içindeki `actor`, `camera` ve `word` efekt türleri ile `timeline.js` (zaman çizelgesi kaydı ve oynatma).

**Performans bütçesi (bağlayıcı):** tek canvas, tek `requestAnimationFrame` döngüsü, en fazla 1.200 parçacık ve 8–12 önbelleğe alınmış sprite, dünya durumu ≤ 1 KB; hedef, tümleşik grafikte kare başına < 4 ms betik süresiyle 60 fps. Varsayılan Canvas2D. WebGPU 2026'dan beri tüm büyük tarayıcılarda var [Kaynak 27] ve yalnızca isteğe bağlı olarak ışık ve derinlik için kullanılıyor.

---

## 4. A hattı – Anlatı Filmi: Generative Scene Engine

### 4.1 Kullanıcı deneyimi

Yayıncı kitap okuyor ya da serbestçe anlatıyor. Kamera görüntüsünün altında, her cümleyle gelişen kesintisiz bir resimli kitap filmi akıyor. Dikey formatta (9:16) yüz ile sohbet alanı arasında bir bant olarak, yatay formatta (16:9) bölünmüş ekran ya da arka plan olarak duruyor.

| Söylenen | Görüntüde ne oluyor |
|---|---|
| „Geceydi.“ | Gökyüzü kararıyor, yıldızlar beliriyor. |
| „Bir kız ormana gitti.“ | Ağaçlar aşağıdan büyüyor, bir karakter yürüyerek giriyor ve kalıyor. |
| „Yağmur yağmaya başladı.“ | Ormanın üzerine yağmur yağıyor, atmosfer döngüsü yağmura geçiyor. |
| „Birden karşısında bir ejderha belirdi.“ | Şimşek, kısa bir kamera sarsıntısı, ejderha sahneye çıkıyor. |
| „Uçup gitti.“ | Ejderha havalanıyor (özne, en son anılan karaktere bağlanıyor). |
| „Yağmur durdu.“ | Hava açılıyor (olumsuzluk algılandı). |

Yayıncının konuşmaktan başka yapacağı bir şey yok. Panelde zaman çizelgesi sahne geçişleriyle doluyor, telefonda iki düğme var: „Sahneyi tut“ ve „Geri“. Yayından sonra anlatı bir zaman çizelgesi olarak hazır; klipler (D hattı) ve „resimli sesli kitap“ (C hattı) için ham malzeme.

### 4.2 Nasıl çalışıyor

- Yedi rollü **dünya durumu** (≤ 1 KB): MEKÂN, ZAMAN, HAVA, KARAKTER, NESNE, EYLEM, DUYGU. Örnek: `{ort:'wald', zeit:'nacht', wetter:'regen', figuren:[…], objekte:[…], stimmung:'spannend', kamera:{zoom, pan}}`.
- **Sözlük:** Mevcut hikâye paketleri (`STORY_DE/TR/EN`) bir `role` alanı kazanıyor. 13 sahne MEKÂN, ZAMAN ve HAVA'yı, çıkartmalar KARAKTER ve NESNE'yi zaten kapsıyor. Hedef: dil başına 300–500 kayıt.
- **Sahne grameri**, deterministik, cümle cümle: MEKÂN dekoru değiştirir (800 ms geçiş), ZAMAN gökyüzünün rengini değiştirir, HAVA parçacık sistemini değiştirir, yeni bir KARAKTER kenardan yürüyerek girer, EYLEM anılan ya da en son anılan karakteri hareket ettirir, DUYGU renk tonunu ve vinyeti belirler, „birden“ kamera sarsıntısı ve ışık çakması tetikler. Eşleşme olmayan bir cümle hiçbir şeyi değiştirmez.
- **İki aşamalı zamanlama:** Dekor ve hava ara sonuçlara bile tepki verir („hızlı“ tepki), karakterler ise ancak cümle bittiğinde gelir („kesin“ tepki). Bir sahne geçişi için en az 8 sn ara gerekir.
- **İsteğe bağlı yapay zekâ:** Sözlükte karşılığı olmayan cümleler için metin yapay zekâsı JSON olarak bir durum farkı döndürür (zaman aşımı 1,5 sn). Çocuk ve okul profillerinde yapay zekâ varsayılan olarak kapalı.
- **Çıkış:** OBS tarayıcı kaynağı olarak `overlay.html?layout=band|split|full`, ses mevcut mikser üzerinden.
- **Görseller:** Temel sözcük dağarcığı Noto Color Emoji (Apache 2.0) [Kaynak 30]; OpenMoji (CC BY-SA 4.0) yalnızca ücretsiz ve eğitim paketlerinde, isim belirtilerek [Kaynak 31]; marka paketi olarak çocuk kitabı tarzında kendi SVG çizimlerimiz. Çalışma sırasında hiçbir görsel üretilmiyor.

### 4.3 Neden bu kadar az işlem gücü gerekiyor

Bir cümle 200–500 baytlık bir fark üretiyor, sahneler dakikada bir ila üç kez değişiyor. Bir kare; renk geçişi, siluetler, en fazla 1.200 parçacık ve önbelleğe alınmış birkaç karakterden oluşuyor, hepsi *tek* bir canvas'ta. Bugünkü efekt motoru bu bütçeyi, tümleşik grafikli bir dizüstünde OBS kodlayıcısının yanında şimdiden kaldırıyor.

### 4.4 Uygulanabilirlik, pazar, gelirler

- **Uygulanabilirlik:** Prototip mevcut (`prototypes/live-story.html`). Gerçek veri akışında MVP (DE, 4 mekân, 20 karakter) 8–12 haftada, TR/EN ve yapay zekâ farkı 8 hafta daha, kendi tarzımızda dünya paketleri 6–9 ayda.
- **Pazar:** Bugün yalnızca ses ya da sabit bir görselle yetinen kitap okuma, sesli kitap, podcast ve sohbet formatları. Almanya sesli kitap pazarı 2025: 374 milyon €, +%13 [Kaynak 19]. Almanya'da 23,8 milyon kişi her hafta podcast dinliyor [Kaynak 20], YouTube'un aylık 1 milyarın üzerinde podcast izleyicisi var [Kaynak 21]. 1–8 yaş arası çocukların %32,3'üne nadiren ya da hiç kitap okunmuyor [Kaynak 22]. Yapay zekâ ile video üretimi ve kurgusu: 2026'da 3,67 milyar USD, 2036'da 24,89 milyar USD [Kaynak 23]. Synthesia yaklaşık 150 milyon USD ARR ile „kamerasız video“ için ödeme isteğini gösteriyor [Kaynak 26].
- **Gelirler (tahmin):** Sözlüklü Anlatı Filmi Pro'da (9,99 €), yapay zekâ ile sahne planlama Pro+'ta (14,99 €), dünya paketleri 2,99–4,99 € (Masal/Märchen, Deniz, Uzay, Şehir, Okul), yayınevi lisansı başlık başına yıllık [2.000 €] (tahmin, kurucu tarafından kontrol edilecek; ilk örnek kurucunun kendi çocuk kitabı serisi), sonrasında B2B lisansı olarak Scene-SDK.

### 4.5 Riskler

| Risk | Yanıt |
|---|---|
| „Reklam filmindeki gibi yapay zekâ videosu“ beklentisi | Animasyonlu resimli kitap olarak konumlandırmak, tarzı güce dönüştürmek |
| Mecazlar („öfkeden çatladı“) ve çok anlamlılık („yüz“, „gül“) | Negatif liste, bağlam kuralları, „kesin“ tepki, „Geri“ düğmesi |
| Sözlüğün üç dilde bakımı | Pazar yeri ve öğrenme işlevi |
| Dikkatin yüzden dağılması | Sakin bant, geçişler arasında asgari süre |
| Platformun aynısını yapması | Paketler, çok dillilik, sahada kanıtlanmışlık ve hızdan oluşan savunma hendeği |

---

## 5. B hattı – Kelime-Resim: dil öğrenme ve okuma desteği

### 5.1 Kullanıcı deneyimi

Bir çocuk „Apfel“ diyor. Hemen büyük bir 🍎 beliriyor, altında hedef dilde „elma“, küçük harflerle renkli artikeli ve hece yaylarıyla „der Apfel“; bir ses „elma“ diye okuyor. Öğretmen yalnızca üç şeyi ayarlıyor: „Konuştuğum dil: Almanca“, „Göster: Türkçe“ ve mod. Sonra kitabı okuyor; öğrenme listesindeki her kelime tıklamaya gerek kalmadan resme, kelimeye ve telaffuza dönüşüyor. Almanca ürün adı „WortBild“.

| Mod | Ne oluyor | Kimin için |
|---|---|---|
| **Çeviri** | Hedef dildeki kelime, telaffuzuyla | Aileler, okul, uyum kursları, miras dili olarak Türkçe |
| **Okuma desteği** | Aynı dil, heceli büyük kelime ve resim | Okuma çağından önceki çocuklar, okuma ya da dikkat güçlüğü yaşayan çocuklar, ikinci dil olarak Almanca (DaZ); kurucunun nöroçeşitlilik kitaplarıyla bağlantılı |
| **Tekrar et** | Kart önce söylüyor, çocuk tekrarlıyor, yeşil bir onay işareti „tanındı“ diyor | Notsuz alıştırma; bilinçli olarak telaffuz puanlaması **yok** |

Tablette karta dokununca telaffuz tekrarlanıyor. Dersten sonra kelime listesi kelime kartı olarak yazdırılabiliyor.

### 5.2 Nasıl çalışıyor

- Resim, sözlük biçimi, kaynak ve hedef dil, artikel, heceler, örnek cümle ve telaffuz içeren **yeni efekt türü `word`**.
- Kavram tabanlı **kelime paketleri**: tek kavram, üç dil, çekimli biçimleriyle (ör. `elma`, `elmalar`, `elmayı`). 500 kavram × 3 dil ≈ 100 KB JSON. Çalışma sırasında çeviri API'si yok.
- **Tanıma:** Türkçe ek ayırma (`elmalar`, `elmayı` → `elma`), çocuk sesleri için „yüksek“ tolerans, otomatik dil seçimi. Eşleşme yoksa kart da yok, yani asla yanlış kart çıkmaz.
- **Telaffuz:** `speechSynthesis` işletim sisteminin seslerini kullanıyor; ücretsiz ve cihaza göre çevrimdışı [Kaynak 29]. Yedekler: temel sözcük dağarcığı için seslendirilmiş kayıtlar, ardından worker içinde WebAssembly olarak Piper-TTS [Kaynak 44].
- **Sınıf ön ayarı:** Çocuk kitabı teması, büyük yazı, yalnızca seçilen listedeki kelimeler; telefon öğretmenin uzaktan kumandası oluyor.
- **Veri koruma:** Chrome'daki tarayıcı konuşma tanıma varsayılan olarak sunucu üzerinden çalışıyor. Bu yüzden okul profili cihaz üzerinde tanımayı (`processLocally`, Chrome 139+) [Kaynak 28] ya da çevrimdışı Whisper'ı zorunlu kılıyor. Uygulama çevrimdışı ve hesapsız çalışıyor.

### 5.3 Neden bu kadar az işlem gücü gerekiyor

Kelime → resim, mikrosaniyeler süren bir tablo aramasıdır. Telaffuzu işletim sistemi sağlıyor, görseller emoji ya da SVG (kilobayt), ekranda her zaman yalnızca bir kart var. Bir okul tableti ya da Chromebook yetiyor, öğrenci başına sunucu maliyeti doğmuyor. Asıl emek içerikte: görseller, kontrol edilmiş çeviriler, ses kayıtları.

### 5.4 Uygulanabilirlik, pazar, gelirler

- **Uygulanabilirlik:** Prototip mevcut (`prototypes/sprachlernen.html`). 300 kelimelik DE↔TR↔EN, okuma desteği ve çalışma kâğıdı içeren MVP 4–6 haftada; okula hazır hâli (çevrimdışı profil, dokümantasyon, pilot) 3–6 ayda.
- **Son kullanıcılar:** Duolingo'nun 2026 2. çeyreğinde 58,7 milyon günlük kullanıcısı ve 12,7 milyon ücretli abonesi vardı [Kaynak 32]. Dil öğrenme uygulamaları 2025'te uygulama içi 1,54 milyar USD ciro yaptı, +%18,8 [Kaynak 33]; yüz yüze eğitim dahil toplam dil öğrenme pazarı 2025'te ≈ 84 milyar USD idi [Kaynak 34]. Lingokids 2025'te 120 milyon USD yatırım aldı [Kaynak 35].
- **Uyum ve okul:** 2025'te 307.000 kişi 17.204 kursta, 18.920 öğretmenle bir uyum kursuna başladı [Kaynak 36]. 16 yaş altı öğrencilerin %20,4'ü evde ağırlıklı olarak Almanca dışında bir dil konuşuyor [Kaynak 37]. Almanya'da 2,65 milyon kişinin Türkiye kökenli göç geçmişi var [Kaynak 38]. Dördüncü sınıf öğrencilerinin %25'i okumada asgari standardın altında [Kaynak 39]. DigitalPakt 2.0 beş yıl için 5 milyar € sağlıyor [Kaynak 40].
- **Fiyat çıpaları ve ücretsiz rakipler:** ANTON okul lisansı okul başına yıllık 250–700 € [Kaynak 41]; Microsoft Reading Coach [Kaynak 42] ve Google Read Along [Kaynak 43] ücretsiz, ama tek dilli ve canlı yayına, sesli okumaya ve Türkçeye göre tasarlanmamış.
- **Gelirler (tahmin):** 200 temel kelimeli Free; tüm listeler ve yayında Kelime-Resim içeren Pro (9,99 €); aylık 4,99 € ile **Kelime-Resim Aile**; 4,99 €'luk kelime paketleri (DaZ temel sözcükleri, miras dili olarak Türkçe, ilkokul İngilizcesi, sonra Ukraynaca ve Arapça); okul başına yıllık 300–800 € okul lisansı; öğretmen başına yıllık 49 € kurs lisansı; iki dilli kitapların yayınevi sürümü.
- **Dürüst olmak gerekirse:** Uyum alanı euro bazında küçük (tam kapsamda bile 18.920 × 49 € ≈ yılda 0,9 milyon €, tahmin). Güvenilirlik ve hibelere erişim sağlıyor; asıl hacim aileler, yayınevleri ve platformlarda.

### 5.5 Riskler

| Risk | Yanıt |
|---|---|
| Sistem sesleri eksik ya da zayıf (ör. eski cihazlarda Türkçe) | Kendi kendine test, seslendirilmiş kayıtlar, yedek olarak Piper |
| Çocuk sesleri ve şiveler daha kötü tanınıyor | „Yüksek“ tolerans, birden fazla deneme, not yok |
| Etkiyi abartmak | Vaat yerine „kelime öğrenmeyi destekler“; bir eğitim teknolojisi danışma kurulunun denetimi |
| Eş sesli ve soyut kelimeler | Genel sözlük yerine konu listeleri, emoji yerine SVG |
| Kamu sektöründe uzun satın alma süreçleri | İlk yılı aileler ve yayınevleri taşıyor |

---

## 6. C hattı – LiveFX Mekânlar: sahne, sınıf, sesli kitap, AR/VR, gözlük

### 6.1 Kullanıcı deneyimi

- **Sahne ve etkinlikler:** Sunucu „Alkış!“ diyor, LED ekranda konfeti patlıyor. „Ve şimdi: kazanan…“ dediğinde bir alt bant kayarak giriyor. Rejide elde yalnızca bir telefon var.
- **Sınıf:** Projeksiyonda Anlatı Filmi oynuyor, tabletlerde Kelime-Resim kartları beliriyor.
- **Resimli sesli kitap ve podcast:** Sesli kitap çalıyor, telefon ekranı anlatılana uygun sakin sahneler gösteriyor. Telefonu eğince katmanlar kaydırılıyor, hikâyeye açılan bir pencere gibi.
- **Telefonda AR:** Anne kitap okuyor, çocuk telefonu kitabın üzerinde tutuyor ve ejderha mutfak masasının üstünde duruyor.
- **VR ve gözlük:** VR'da sahnenin gökyüzü izleyicilerin üzerinde bir kubbeye dönüşüyor. Ekranlı gözlükte fincanın yanında „çay · Tee“ kartı süzülüyor.

### 6.2 Nasıl çalışıyor: tek durum, birçok ekran

| Hedef | Cihaz | Teknik | Olgunluk |
|---|---|---|---|
| `stage` | LED ekran, projeksiyon | Güvenli alan olmadan tam ekran, reji olarak telefon, VJ yazılımları ve ışık masaları için `/api/fire` | bugün kullanılabilir |
| `classroom` | Projeksiyon + tabletler | Anlatı Filmi ve Kelime-Resim, tabletlerde canlı transkript | 1–2 hafta |
| `companion` | Telefon, tablet | Hazır bir zaman çizelgesini ses oynatıcıyla senkron oynatır, **konuşma tanıma hiç gerekmez**; eğim paralaks katmanlarını yönetir | 4–8 hafta |
| `ar-light` | tüm telefonlar, iPhone dahil | Arka kamera + üstünde efekt canvas'ı, klip olarak kayıt | 4–8 hafta |
| `xr` | Android/Chrome, Quest, visionOS | DOM katmanlı WebXR `immersive-ar` [Kaynak 47, 48], VR'da kavisli bir yüzey üzerinde canvas dokusu | aylar, vitrin |
| `glasses` | Meta Ray-Ban Display | Web uygulaması (HTML/CSS/JS, Mayıs 2026'dan beri Developer Preview) [Kaynak 46], tanıma telefonda | aylar, vitrin |

### 6.3 Neden bu kadar az işlem gücü gerekiyor

Yeni bir model yok, bulutta işleme yok; aynı JSON için yalnızca yeni çıkış hedefleri var. Companion modu yalnızca saat → durum → çizim hesaplıyor ve bir YouTube videosundan daha az yük oluşturuyor. XR'da *tek* bir canvas dokusu yetiyor, gözlük zaten yalnızca kart, simge ve kelime gösteriyor. Sahnede tarayıcılı bir dizüstü bir medya sunucusunun yerini alıyor.

### 6.4 Pazar, gelirler, riskler

- **Pazar:** IDC 2026 için 13,6 milyon akıllı gözlük ve 5,1 milyar USD ciro bekliyor [Kaynak 45]; ekranlı gözlükler bunun içinde henüz küçük bir pay, kitlesel pazar telefon olmaya devam ediyor. Sahne için fiyat çıpası: VJ yazılımı Resolume Avenue 299 €, Arena 799 € [Kaynak 49]. Çocuklara yönelik ses içeriği para kazandırıyor: tonies 2025'te 630 milyon € ciro yaptı, +%31 [Kaynak 50]. Sahne, etkinlik ve sınıf için güvenilir bir toplam rakam yok.
- **Gelirler (tahmin):** Etkinlik ve sahne lisansı günlük 19–49 € ya da yıllık 299 € (eğitimde −%50); „resimli sesli kitap“ yayınevi lisansı başlık başına ya da gelir payı olarak; B ile paketlenmiş okul lisansı; erişim motoru olarak ücretsiz AR-light; freemium vitrin olarak XR ve gözlük, gelir 0 € olarak hesaplanmış.
- **Riskler:** küçük donanım tabanı ve önizleme aşamasındaki SDK'lar (iOS Safari'de WebXR yok); sahnede ses sistemi nedeniyle bozulan konuşma tanıma (yakın mikrofon, yedek olarak sahne pedi); dinleyen gözlüklerde mahremiyet, VR'da yaş sınırları ve hareket tutması (çocuklar için yalnızca telefon ve projeksiyon); yoğun destek gerektiren etkinlikler (yalnızca lisans ve kılavuz).

**Değerlendirme:** WebXR ve gözlük 2027–2028'de bir **vitrin, gelir hattı değil**.

---

## 7. D hattı – LiveFX Studio: canlı kurgu ve otomatik kurgu

### 7.1 Kullanıcı deneyimi: aynı araca açılan iki kapı

- **Canlı → Öne çıkanlar:** Yayından sonra LiveFX, meme'lerin, hediyelerin ve sohbetin en yoğun olduğu yerlerden 3–5 kısa klip öneriyor. 9:16 formatında, aynı efektlerle, paylaşmaya hazır.
- **Dosyayı bırak:** 20 dakikalık bir MP4 pencereye sürükleniyor (eski bir yayın, podcast, kitap okuma videosu). LiveFX „Dinliyorum … (yerel)“ diyor, ardından zaman çizelgesi hazır: transkript, tetikleyiciler, sahneler, sesin yükseldiği yerler, duraklamalar ve dolgu kelimeler. İçerik üreticisi bir görünüm seçiyor ve „Yalnızca öne çıkanlar, 60 sn, 9:16“ ya da „Efektlerle tüm video“ diyor. Her öneri taşınabilen, değiştirilebilen ya da silinebilen bir çip. Önizleme efektleri render beklemeden canlı çiziyor. Sonra dışa aktarım geliyor. **Dosya bilgisayardan hiç çıkmıyor.**

### 7.2 Nasıl çalışıyor

| Adım | Teknik |
|---|---|
| Sinyalleri toplamak (canlı) | Sunucuda mevcut kaynaklardan zaman çizelgesi kaydı: tetikleyiciler, transkript, sohbet, hediyeler; kayan 30 sn'lik pencereler üzerinden öne çıkan an puanı |
| Transkript (dosya) | WebAudio ses kanalını çözüyor, tarayıcıdaki Whisper kelime zaman damgalarıyla transkript çıkarıyor (WebGPU/WASM) [Kaynak 60] |
| Analiz | Eşleştirici ve sahne yönetmeni cümlenin tamamını önceden okuyor; ses seviyesi ve duraklama algılama kesmeleri ve zoom vuruşlarını belirliyor |
| Düzenleme | Çip olarak `cut`, `zoom`, `caption`, `fire`, `state` içeren zaman çizelgesi (LTF) |
| Önizleme | `<video>` + efekt canvas'ı, `requestVideoFrameCallback` ile senkron |
| Dışa aktarım | Donanım kodlayıcılı WebCodecs, Mediabunny MP4/WebM olarak paketliyor [Kaynak 57, 58, 59]; yedek MediaRecorder; kelime kelime altyazı; kırpma ile dikey format |

### 7.3 Neden bu kadar az işlem gücü gerekiyor

Yükleme yok, bulutta dönüştürme yok. Whisper modeli (≈ 40–150 MB) bir kez yükleniyor. „Kurgu“ birkaç kilobaytlık bir JSON dosyası, önizleme canlıdakiyle aynı canvas'ı çiziyor ve yalnızca dışa aktarım hesaplama yapıyor; bir kez ve donanım kodlayıcısıyla. Video başına marjinal maliyet sıfır, dakika kotası yok.

### 7.4 Uygulanabilirlik, pazar, gelirler, riskler

- **Uygulanabilirlik:** MediaRecorder ile dışa aktarımlı öne çıkanlar 4–6 hafta; otomatik efektli dosya içe aktarma 3–4 ay; tüm tarayıcılar için sağlam MP4 dışa aktarımı 6–9 ay. WebCodecs; Chrome ve Edge'de 94'ten, Firefox'ta 130'dan (masaüstü), Safari'de sesle birlikte 26'dan itibaren var [Kaynak 57, 58].
- **Pazar:** Video kurgu yazılımı 2025'te 2,52 milyar USD → 2026'da 2,68 milyar USD [Kaynak 51]; yapay zekâ ile video üretimi ve kurgusu 2026'da 3,67 milyar USD [Kaynak 23]. CapCut: 2025'te 736 milyon mobil MAU ve 1 milyar USD'nin üzerinde uygulama içi ciro [Kaynak 52]. OpusClip: 10 milyonun üzerinde kullanıcı, ARR tahmini 10–20 milyon USD [Kaynak 53]. Fiyat çıpaları: OpusClip 15–29 USD, Submagic 19–69 USD [Kaynak 54], Descript aylık 16–65 USD [Kaynak 55]. Alıcı sinyali: Canva Şubat 2026'da Cavalry ve MangoAI'yi satın aldı [Kaynak 56].
- **Gelirler (tahmin):** Yayın başına filigranlı 3 öne çıkan klip içeren Free (dönüşüm kaldıracı); filigransız ve canlı editörlü Pro; dosya içe aktarma, otomatik kurgu, MP4 dışa aktarımı ve dakika sınırı olmadan **Pro+ „Studio & Sahneler“ aylık 14,99 €**; stil paketleri 2,99–4,99 €; toplu işlemeli ajans lisansı; editör ve yayın sağlayıcıları için white-label/SDK.
- **Riskler:** güçlü, kısmen ücretsiz rekabet (evrensel bir editör olarak değil, ses → efekt, hikâye sahneleri, TR/DE ve yerel işleme ile öne çıkmak); uzun ya da 4K videolarda tarayıcı sınırları (süre sınırı, önce masaüstü); dışa aktarımda telif hakkı (yalnızca kendi seslerimiz, lisanslı GIF'ler); Whisper'ın Türkçe ve şivede daha zayıf olması (daha büyük modeller, transkriptte düzeltme); düşük ödeme oranı (Studio ayrı bir ürün olarak değil, Pro'ya ek ücret olarak).

---

## 8. Pazara genel bakış

| Segment | Büyüklük | Kaynak | İlgili hat |
|---|---|---|---|
| Dünya genelinde canlı yayın (çekirdek) | 2026'da 97–157 milyar USD | [Kaynak 1, 2] | bugün |
| Yapay zekâ ile video üretimi ve kurgusu | 2026'da 3,67 milyar USD → 2036'da 24,89 milyar USD | [Kaynak 23] | A, D |
| Video kurgu yazılımı | 2,52 → 2,68 milyar USD (2025 → 2026) | [Kaynak 51] | D |
| Dil öğrenme uygulamaları (uygulama içi) | 2025'te 1,54 milyar USD, +%18,8 | [Kaynak 33] | B |
| Dil öğrenme toplamı | 2025'te ≈ 84 milyar USD | [Kaynak 34] | B |
| Almanya sesli kitap | 2025'te 374 milyon €, +%13 | [Kaynak 19] | A, C |
| Akıllı gözlükler | 2026'da 13,6 milyon cihaz / 5,1 milyar USD | [Kaynak 45] | C |
| Çocuklara yönelik ses (tonies) | 2025'te 630 milyon €, +%31 | [Kaynak 50] | C |
| Almanya uyum kursları | 307.000 yeni katılımcı, 18.920 öğretmen (2025) | [Kaynak 36] | B |
| DigitalPakt 2.0 | beş yılda 5 milyar € | [Kaynak 40] | B, C |

**Platformlar için en güçlü argüman.** Platformlar bugün konuşmayı altyazıya çeviriyor: gerçek zamanlı, ücretsiz, milyarlarca cihazda. LiveFX konuşmayı aynı işlem yüküyle **resimlere, sahnelere, kelime kartlarına ve kurguya** çeviriyor. Böylece bir platform, ek GPU sunucusuna gerek kalmadan her canlı yayıncıya „prodüksiyonlu“ bir yayın sunabilir. Yalnızca Güneydoğu Asya, Kafkasya ve Orta Asya'da 2025'te 100 milyonun üzerinde içerik üreticisi TikTok'ta canlı yayın yaptı [Kaynak 2]. İzlenme süresindeki her dakika, yayıncı gelirinin yaklaşık yarısını oluşturan hediyelere yansıyor; platform yaklaşık %50'sini alıyor [Kaynak 5, 8]. Ayrıca her yayın geride, kısa videoların kendiliğinden çıktığı bir zaman çizelgesi bırakıyor: Canlı yayın kısa videonun rakibi olmaktan çıkıp kaynağına dönüşüyor.

---

## 9. İş modeli ve fiyat yapısı

Tüm fiyatlar **tahmindir** ve kurucu tarafından kontrol edilecektir.

| Paket | Fiyat | İçerik |
|---|---|---|
| **Free** | 0 € | Tek dünyalı Anlatı Filmi, 200 kelimeli Kelime-Resim, yayın başına filigranlı 3 öne çıkan klip |
| **Pro** | aylık 9,99 € | tüm temel dünyalar, bant ve bölünmüş ekran, tüm Kelime-Resim listeleri, filigransız öne çıkanlar, canlı editör |
| **Pro+ „Studio & Sahneler“** | aylık 14,99 € | Yapay zekâ sahneleri, dosyadan otomatik kurgu, MP4 dışa aktarımı, toplu işleme, sesli kitap görselleştirici |
| **Kelime-Resim Aile** | aylık 4,99 € | Yayın işlevleri olmadan dil öğrenme ve okuma desteği |
| **Paketler** | 2,99–4,99 € | Dünya, kelime ve stil paketleri, sonra 70/30 paylaşımlı pazar yeri |
| **Okul lisansı** | yıllık 300–800 € | Kelime-Resim + Anlatı Filmi, çevrimdışı profil |
| **Kurs lisansı** | öğretmen başına yıllık 49 € | Uyum ve DaZ kursları |
| **Etkinlik/sahne lisansı** | günlük 19–49 € ya da yıllık 299 € | Sahne modu, etkinlik paketleri |
| **Yayınevi lisansı** | başlık başına yıllık [2.000 €] (tahmin, kurucu tarafından kontrol edilecek) | Resimli sesli kitap, iki dilli kitaplar |
| **Scene-SDK / platform** | anlaşmaya göre | Lisans ya da white-label olarak LTF, render motoru, paketler |

**Vizyonun getirdiği ek gelir, temel senaryo (tahmin, bin €):** ≈ 27 (2027), ≈ 192 (2028), ≈ 617 (2029); ek maliyetler düşüldükten sonra katkı payı ≈ −3, +77 ve +407 bin €. Hesaplamanın ayrıntısı iş planının „Gelecek“ bölümünde. SDK ve platform gelirleri orada iki kez sayılmadı; XR ve gözlük hesapta 0 € olarak yer alıyor.

---

## 10. Yol haritası 2027–2029

Sıralama gelire yakınlığa göre: **Önce D öne çıkanlar ve B, çekirdek olarak A, sahne üzerinden C, XR daha sonra.**

| Çeyrek | Ürün | Pazar / satış | Ölçüt |
|---|---|---|---|
| 2026 4. çeyrek (hazırlık) | `sprachlernen.html` ve `live-story.html` prototipleri, LTF v1, Vizyon fragmanı DE/TR/EN | Sunum slaytları 12–15, LinkedIn gönderisi „Vizyon“ | Prototipler çevrimdışı 60 fps çalışıyor |
| 2027 1. çeyrek | D1 zaman çizelgesi kaydı ve öne çıkanlar · B1 300 kelimeli Kelime-Resim, okuma desteği | Pro aboneliği yayında, 20 beta içerik üreticisi TR/DE | Öne çıkan klibi paylaşılan yayınların oranı |
| 2027 2. çeyrek | A1 sahne yönetmeni, karakterler, kamera, bant/bölünmüş ekran (DE) · C1 sahne ve sınıf ön ayarları | Etkinlik lisansı, [Sayı] kurs/sınıfta Kelime-Resim pilotu | Anlatı Filmi'yle ve onsuz izlenme süresi |
| 2027 3. çeyrek | A2 TR/EN, yapay zekâ farkı, 3 dünya paketi · D2 dosya içe aktarma ve otomatik efektler | **Pro+ yayında**, yayınevi pilotu (kendi seri), SDK prototipi | Pro → Pro+ yükseltme oranı |
| 2027 4. çeyrek | D3 zaman çizelgesi editörü ve MP4 dışa aktarımı · C2 Companion ve AR-light · B2 Tekrar et | Okul lisansı, medya merkezlerinde listelenme | [Sayı] ödeme yapan okul |
| 2028 1. çeyrek | C3 WebXR prototipi · B3 topluluk paketi olarak Ukraynaca/Arapça | Kelime-Resim aile aboneliği | Aile abonelikleri, paket satışları |
| 2028 2. çeyrek | Gözlük web uygulaması prototipi · D4 toplu işleme ve ajans CLI | Platform sunumu „Canlı → Klip“ | Devam toplantısı getiren görüşmeler |
| 2028 3. çeyrek | Yayınevleri için dünya paketi editörü, dünya ve kelime paketleri için pazar yeri | Eğitim kurumlarıyla geniş çaplı pilot | Üçüncü taraf paketleri, yayınevi başlıkları |
| 2028 4. çeyrek | **Scene-SDK v1**, Pro+'ta yapay zekâ farkı standart | Kelime-Resim pilotunun değerlendirmesi (öncesi/sonrası) | bir SDK pilot ortağı |
| 2029 1. çeyrek | Anlatı Filmi 2.0 (karakterler etkileşime giriyor, isteğe bağlı WebGPU derinliği) | 10+ başlıklı yayınevi programı | Yayınevlerinden lisans geliri |
| 2029 2. çeyrek | Yerel uygulamalar ya da gözlük ortaklığı hakkında karar | XR/gözlük ortaklık görüşmeleri | Donanım tabanı, talep |
| 2029 3. çeyrek | Topluluk üzerinden yeni diller, paket olarak eğitim sürümü | Eğitim teknolojisinde uluslararasılaşma | Aktif okullar ve kurslar |
| 2029 4. çeyrek | Scene-SDK ya da „Canlı → Klip“ platform entegrasyonu | Platform pilotu ya da çıkış (exit) görüşmesi | imzalanmış pilot |

---

## 11. Prototipler ve Vizyon fragmanı

**Prototipler** (her biri tek HTML dosyası, Vanilla JS, dış istek yok, çevrimdışı çalışır, açık/koyu tema, azaltılmış hareket tercihine uyar):

- `prototypes/sprachlernen.html` – Kelime-Resim: „Konuştuğum dil“ / „Göster“ seçimi, Çeviri, Okuma desteği ve Tekrar et modları, mikrofon ya da metin girişi; resim, kelime, artikel rengi, heceler, örnek cümle ve telaffuz içeren büyük bir kart, altı kutucuklu geçmiş, kelime kartı yazdırma. 10 kategoride en az 60 kavram, DE/TR/EN, Türkçe ek ayırmayla. Test cümleleri: „Der Apfel ist rot“ (DE→TR) → 🍎 elma; „kediler uyuyor“ (TR→DE) → 🐈 die Katze.
- `prototypes/live-story.html` – Anlatı Filmi: metin girişi ya da mikrofon, „Hikâyeyi oynat“, 16:9 ya da 9:16 bant, seed alanı, zaman çizelgesini JSON olarak dışa ve içe aktarma, WebM olarak kayıt, kare hızı, kare başına betik süresi ve „Bulut maliyeti: 0,00 €“ göstergesi. Türkçe test hikâyesi: „Bir varmış bir yokmuş. Gece ormanda küçük bir ejderha vardı. Yağmur yağıyordu. Ejderha uçtu.“ Almanca test hikâyesi: „Es war einmal ein kleines Dorf. Es war Nacht. Ein Mädchen ging in den Wald. Es begann zu regnen. Plötzlich stand da ein Drache. Er flog los. Der Regen hörte auf. Am Morgen schlief das Mädchen. Ende.“

Her iki prototipte de şu not var: Tarayıcıdaki konuşma tanıma, tarayıcıya göre sunucu üzerinden çalışıyor; tam sürümün çevrimdışı modu yerel olarak çalışıyor.

**Vizyon fragmanı (35 sn, 9:16 ve 16:9, her biri DE/TR/EN):** `video/LiveFX_Vision_<de|tr|en>_<16x9|9x16>.mp4`, mevcut fragman gibi HTML/JS ile render edildi. Türkçe sürüm: `video/LiveFX_Vision_tr_16x9.mp4` ve `video/LiveFX_Vision_tr_9x16.mp4`.

| Zaman | Hat | İçerik | Metin (TR) |
|---|---|---|---|
| 0–3 sn | Kanca | pembe ses dalgası | „Sen anlat.“ → „Sahne oluşsun.“ |
| 3–11 sn | A · Yeşil | Anlatı ekranda yazılıyor, altında dünya oluşuyor: gece, orman, kız, yağmur, ejderha | „Kelimelerden canlı film. Kurgu yok. Veri merkezi yok.“ |
| 11–18 sn | B · Altın | „Apfel“ → 🍎 der Apfel → elma → apple, telaffuz; „kedi“ → 🐈 die Katze | „Her kelime bir resim. Her dil bir ses.“ |
| 18–25 sn | C · Açık mavi | Konfetili sahne, masada ejderha (AR), „☔ yağmur · Regen“ gösteren gözlük | „Sahne · Sınıf · Sesli kitap · Gözlük“ |
| 25–32 sn | D · Pembe | Dosya pencereye uçuyor, zaman çizelgesi doluyor, üç 9:16 klip fırlıyor | „Videoyu bırak. Kurgulanmış klipler çıksın. Yükleme yok.“ |
| 32–35 sn | CTA | dört renkli kutucuk, logo | „LiveFX – Sesin videoya dönüşür.“ |

Platform logosu yok, gerçek isim ya da yüz yok; gelecekteki işlevler „Vizyon“ rozeti taşıyor.

---

## 12. Aradıklarımız

- **Platform pilot ortağı:** „Canlı → Klip“ ya da Scene-SDK için yayın ve kısa video platformlarının canlı yayın ekipleri.
- **Eğitim pilot ortağı:** [Sayı] DaZ ve uyum kursu, [Sayı] ilkokul sınıfı, medya merkezleri, eğitim kurumları.
- **Yayınevi ve sesli kitap pilot ortağı:** „Resimli sesli kitap“ ve iki dilli baskılar için çocuk kitabı ve sesli kitap yayınevleri; ilk örnek kurucunun kendi çocuk kitabı serisi.
- **Ekip:** Web/grafik geliştirme (Canvas, WebCodecs), çocuk kitabı tarzında illüstrasyon, DE/TR/EN seslendirme sanatçıları, didaktik (danışma kurulu).
- **Hibe ve destek:** EXIST, eğitim ve uyum vakıfları (planlamada gelir varsayımı olmadan).

İletişim: [İsim] · [E-posta] · [Web sitesi]
