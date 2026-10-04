# LiveFX – Sunum (19 slayt, sürüm 2.1 + Vizyon 2027–2029)

> Metin, yapı ve konuşmacı notu şablonu. PowerPoint sürümü `LiveFX_Pitch_TR.pptx` (16:9, koyu tema,
> Türkçe fragman kareleri `video/stills/tr-…` ve `landing-assets/` ekran görüntüleri) tam olarak bu yapıyı izler;
> *konuşmacı notları* orada kayıtlıdır.
> **Almanca: `LiveFX_Pitch.pptx` (ana sürüm, `PITCH-DECK.md`) · English: `LiveFX_Pitch_EN.pptx`**
> Üç sürüm de aynı oluşturucudan çıkar – metinler yalnızca JSON dosyasında durur:
> `node tools/build-pptx.js tools/deck-content.tr.json LiveFX_Pitch_TR.pptx` (`business/` klasöründe çalıştırın;
> kurulum için `tools/README.md`).
> 12–15. slaytlar **Vizyon**dur (slaytta “Vizyon“ rozeti); bağlayıcı temel vizyon belgesidir `VISION.tr.md`
> (Anlatı Filmi, Kelime-Resim, Mekânlar, Studio). [Kaynak 19] ve sonrası `QUELLEN.tr.md` dosyasındadır.
> Tarih: Ekim 2026 · Gizli (her slaytın alt bilgisi: „Gizli · Ekim 2026“).
> Köşeli parantez içindeki yer tutucular (`[Sayı]`, `[E-posta]`) bilerek doldurulmadı – uydurma rakam yok.
> Pazar verileri: kaynaklar `QUELLEN.tr.md` içinde [Kaynak n]; tahminler tahmin olarak işaretlenmiştir.

> Finansal rakamlar (17–19. slaytlar) `LiveFX_Finanzmodell.xlsx` finansal modelinden geliyor (temel rakamlar `tools/finance-250k.json` dosyasında).
> Ekim 2026 sürümü: talep 250.000 €.
---

## Slayt 1 – Başlık

**LiveFX**
*Sesin efekte dönüşür.*
Yayıncının söylediklerine göre gerçek zamanlı meme'ler, sesler ve sahneler.
*Ve yarın: Sen anlat – sahne oluşsun.*
Tuncay Sancak · Kurucu & Mucit, Genel Müdür · Investor Relations: Gönül Demet · [E-posta] · Ekim 2026 · Gizli

> **Notlar:** Kısaca kendimi tanıtıyorum: Kendim yayın yapıyorum, kitap yazıyorum ve LiveFX'i, her kısa videoda
> olup da canlı yayında tam olarak eksik olan şey için geliştirdim. Bugün gördükleriniz kendi yayınlarımda çalışıyor.
> Sonunda nereye gittiğimizi göstereceğim: meme katmanından, konuşulan her şeyin görsel diline.
> 30 saniye, sonra doğrudan soruna geçiyoruz.

## Slayt 2 – Sorun: Canlı yayın ham

- Kısa videolar meme'lerle, seslerle, zoom'larla, çıkartmalarla yaşıyor – hepsi kayıttan **sonra**, kurguda ekleniyor.
- Canlıda bunların hiçbiri yok. Yayıncı **aynı anda** sunucu, yönetmen ve kurgucu – iki eliyle.
- Mevcut araçlar **izleyiciye** (bağış/takip uyarıları) ya da **tuşa** (ses panoları) tepki veriyor.
- **Söylenen söze kimse tepki vermiyor.** Kurgu hep geç kalıyor.

> **Notlar:** Otomatik altyazılar, sesten gerçek zamanlı metnin çalıştığını ve platformların bunu yerleşik olarak
> sunduğunu kanıtladı. Sesten gerçek zamanlı *efekt* ise yok. Tam bu boşluğu dolduruyoruz. Yayınımdan bir örnek:
> “Efsane” diyorum – ve klavyeye kendim uzanmazsam hiçbir şey olmuyor.

## Slayt 3 – Çözüm: Ses → efekt, bir saniyeden kısa sürede

LiveFX sen konuşurken dinler ve tepki verir:
- “Krass” → 🤯 Neon yazı + Airhorn
- “Yok artık” → Meme kartı + Vine-Boom
- “Yağmur yağıyordu…” → atmosfer döngülü yağmur sahnesi (hikâye modu)

Mikrofon → ses tanıma (DE/TR/EN, otomatik) → şiveye toleranslı eşleştirici → OBS'te katman → yayın.
**< 1 sn. Eller serbest. Yerel çalışır.** TikTok LIVE, Instagram Live, YouTube, Twitch – OBS/Streamlabs'in yayın yaptığı her yerde.

> **Notlar:** Önemli: Anahtar kelime eşleştirme anında gerçekleşiyor (tanımanın ara sonuçları), bulut gerekmiyor.
> İsteğe bağlı yapay zekâ modu anahtar kelime içermeyen cümleleri de yakalıyor (“onun için çok utanç vericiydi” →
> Awkward). Her şey yayıncının kendi bilgisayarında çalışıyor – veri koruma sonradan eklenmedi, baştan var.

## Slayt 4 – Demo

Görseller (ya da 30 sn'lik fragman `video/LiveFX_Trailer_tr_16x9.mp4`):
1. Katman 16:9 – neon yazı “EFSANE!” + konfeti (`video/stills/tr-16x9-6_9s.jpg`)
2. Katman 9:16 – hikâye modu, “Gece yağmur yağıyordu…” (`video/stills/tr-9x16-29_6s.jpg`)
3. Kontrol paneli (`panel.jpg`) · telefondan kumanda (`mobile.jpg`) · OBS'siz demo sayfası (`demo.jpg`) – Almanca arayüz

> **Notlar:** Mümkünse canlı gösterin: Mikrofonu açın, “bu çok fena… efsane!” deyin, efekt beliriyor. İkinci deneme:
> Hikâye modunu açın, bir paragraf okuyun – “yağmur yağıyordu”, “gece”, “ejderha” – ve sahneler değişiyor.
> Yedek plan fragman. Akılda kalacak cümle: Meme'lerin konuşmama tepki verdiği ilk video beni her slayttan daha
> çok ikna etti.

## Slayt 5 – Bugünkü ürün (sürüm 2.1)

- **Tanıma**: tarayıcı ASR (Chrome/Edge), otomatik dil DE/TR/EN, lehçe toleransı, öğrenme işlevi, öz test ve tanılama;
  API üzerinden Whisper/Deepgram ile harici; çevrimdışı Whisper (deneysel)
- **Efektler ve performans**: fizikli Canvas parçacıkları (60 fps), neon/glitch/çıkartma metni, alt bantlar, kombolar,
  4 tema; **performans modu** (auto/eco/high): ortalama kare süresi −%63 ile −%69 arası
- **Hikâye modu**: 13 tam ekran sahne + 12 atmosfer döngüsü, DE/TR/EN hikâye paketleri
- **Paketler**: Türkçe 85 · Deutsch 49 · English 50 · Aile ve Çocuk 27 · Gaming 27 tetikleyici, ayrıca TR/DE/EN **metin çıkartma paketleri**
- **Çıkartmalar ve GIF'ler**: **143 ücretsiz çıkartma** (Microsoft Fluent Emoji, MIT lisansı, 119'u animasyonlu);
  gençleri koruma filtreli KLIPY/GIPHY ile **güvenli GIF arama** – GIF'ler kaydedilmiyor, bağlantıyla kullanılıyor
- **Ses**: 38 sentetik ses (lisans ücreti yok), limiter'lı mikser, ducking, stereo, yankı
- **Telefon uzaktan kumandası** (PWA), OBS/Streamlabs, TikTok LIVE Studio, Instagram Live Producer, OBS'siz demo kaydı
- **İzleyiciler ve açık API**: Twitch sohbeti, YouTube sohbeti, hediye webhook'u (TikFinity/Streamer.bot üzerinden TikTok),
  token korumalı HTTP API (Stream Deck, sohbet botları, harici ASR), 575+ otomatik test

> **Notlar:** Bu artık bir prototip değil: 0.1'den 2.1'e sürümler, birim ve uçtan uca testler, Almanca ve Türkçe
> kılavuzlar. Sürüm 2.1 ürünü daha hafif ve daha güvenli yaptı: ortalama %63–69 daha az kare süresiyle performans modu,
> MIT lisanslı 143 ücretsiz çıkartma, üç dilde metin çıkartma paketleri ve gençleri koruma filtreli KLIPY ve GIPHY ile
> güvenli GIF arama (Google, Tenor API'sini Haziran 2026'da kapattı). İki noktayı vurgulayın: (1) kendi seslerimiz,
> ücretsiz çıkartmalar ve bağlantılı GIF'ler telif ihlali uyarısı yok demek, (2) izleyici tetikleyicileri gelire giden köprü.

## Slayt 6 – Neden şimdi

- **Canlı ticaret ve hediyeler**: Canlı yayıncıların gelirinin yaklaşık yarısı hediyelerden geliyor; 20–100 bin
  takipçili üreticiler hediyelerle ayda 500–3.000 USD kazanıyor [Kaynak 5, 6].
- **En hızlı büyüyen TikTok LIVE**: 2025'te yalnızca Güneydoğu Asya, Kafkasya ve Orta Asya'da 100 milyondan fazla
  içerik üreticisi canlı yayına çıktı, bir önceki yıla göre %77 artış [Kaynak 2].
- **İçerik üreticisi ekonomisi 2026'da ~216–260 milyar USD**, bunun ≈ %14'ü canlı yayın [Kaynak 3, 4].
- **Teknoloji olgun**: akışlı ASR < 300 ms, tarayıcıda çevrimdışı modeller, tüm büyük tarayıcılarda WebGPU
  [Kaynak 27]; prompt caching sayesinde yapay zekâ sınıflandırması saati < 1 USD.
- **Platformlar üretici araçlarıyla yarışıyor** (CapCut ↔ TikTok, Edits ↔ Instagram) – sıradaki adım canlı yayın araçları.

Kaynaklar: bkz. `QUELLEN.tr.md` (30.09.2026 ve 03.10.2026 tarihli araştırma).

> **Notlar:** Canlı yayın artık yan kanal değil, bir gelir kanalı. Ayrıca: Türkiye, yerelleştirilmiş araçların
> neredeyse hiç olmadığı, genç ve meme'e yatkın bir TikTok pazarı – en büyük paketimizin Türkçe olması tesadüf değil.
> Teknoloji: Üç yıl önce sunucu gerektiren şey bugün tarayıcıda çalışıyor – 12. slayttan itibaren vizyonun temeli bu.

## Slayt 7 – Pazar (aralıklar; SAM/SOM = kendi tahminimiz)

| | Aralık | Dayanak |
|---|---|---|
| **TAM** – canlı yayın pazarı | 97–157 milyar USD (2026) → 250–345 milyar USD (2030), yıllık büyüme yaklaşık %27 | [Kaynak 1, 2] |
| **Üretici ekonomisinde canlı payı** | ≈ 30–36 milyar USD (~216–260 milyarın %14'ü) | [Kaynak 3, 4] |
| **SAM** – canlı yayın için üretici araçları (yazılım harcaması) *(tahmin)* | 1–3 milyar USD | Streamlabs/StreamYard/Voicemod fiyatları × aktif canlı yayıncılardan türetildi |
| **SOM** – 3. yıl *(tahmin)* | 5.000–15.000 ücretli Pro kullanıcı × ayda 9,99 € ≈ 0,6–1,8 milyon € ARR | iş planı bölüm 6 ile aynı (SAM içerik üreticilerinin %0,3–0,5'i); DACH + Türkiye + EN niş, odak TikTok/IG |

**Vizyonun komşu pazarları (slayt 12–15, SOM'a dahil değil):**

| Segment | Büyüklük |
|---|---|
| Yapay zekâ ile video üretimi ve kurgusu 2026 | 3,67 milyar USD [Kaynak 23] |
| Dil öğrenme uygulamaları, uygulama içi gelir 2025 | 1,54 milyar USD [Kaynak 33] |
| Video kurgu yazılımı 2026 | 2,68 milyar USD [Kaynak 51] |
| Almanya sesli kitap pazarı 2025 | 374 milyon €, +%13 [Kaynak 19] |

> **Notlar:** Dürüstçe söyleyin: TAM geniş aralıklı ikincil kaynaklardan geliyor; SAM ve SOM bir araştırma değil,
> bizim tahminimiz. Mesele tam rakam değil: Ödeme yapan canlı yayıncıların küçük bir payı bile bir ekibi taşır – ve
> asıl kaldıraç abonelik değil, platform entegrasyonu. Altta yeni: Vizyon komşu pazarlar açıyor (yapay zekâ video,
> dil öğrenme, video kurgu, sesli kitap) – bunları SOM'a bilerek katmıyoruz.
> SOM iş planıyla aynı; temel senaryo 3. yılda ortalama 7.500 Pro kullanıcıyla hesaplıyor.

## Slayt 8 – İş modeli

1. **Free** – temel işlevler, standart paketler, OBS katmanı (yaygınlık, topluluk)
2. **Pro – aylık 9,99 €** – yapay zekâ modu, tüm sahneler ve temalar, telefondan kumanda, bulut senkronu, öncelikli destek
3. **Üretici paketleri / pazaryeri** – üreticiden üreticiye meme ve hikâye paketleri, 70/30 paylaşım
4. **B2B lisansı ve platform entegrasyonu** – yayın yazılımları, ajanslar ve platformlar için SDK/white-label

Karşılaştırma: Streamlabs Ultra aylık 27 USD, StreamYard aylık 35 USD, Restream aylık 16 USD, Voicemod Pro aylık
10 USD [Kaynak 11, 12, 13]. Vizyon (tahmin): Pro+ “Studio & Sahneler” 14,99 €, Kelime-Resim Aile aylık 4,99 €,
okul, kurs, etkinlik ve yayınevi lisansları – ayrıntılar 13–15. slaytlarda.

> **Notlar:** 9,99 € bilerek Streamlabs Ultra'nın altında ve Voicemod seviyesinde – içerik üreticileri bu fiyat
> noktasını tanıyor. Pazaryeri kullanıcıları tedarikçiye dönüştürüyor: Türkçe bir meme paketi hazırlayan, onu satıyor.
> B2B platforma giden yol: Aynı motor, TikTok LIVE Studio'da tarayıcı kaynağı olarak çalışıyor.

## Slayt 9 – Traction

- **Kurucunun kendi canlı yayınlarında kullanılıyor**, [Ay/Yıl]'dan beri – [Sayı] yayın, [Sayı] saat
- **Ürün**: güncel sürüm 2.1 (0.1 → 2.1), 575+ otomatik test, DE/TR kılavuzlar, demo klipler
- **İçerik**: 5 tetikleyici paketi (238 tetikleyici), 3 hikâye paketi, 38 ses, 13 sahne – 3 dilde
- **Topluluk**: [Sayı] takipçi · bekleme listesinde [Sayı] üretici · [Sayı] indirme
- **Sonraki 60 gün**: 10 üretici testi TR/DE, açılış sayfası + fragman, topluluk lansmanı, ilk Pro abonelikleri

> **Notlar:** Rakamları görüşmeden önce girin – yalnızca gerçek olanları. Hikâye şu: Ürün gerçek yayınlarda olgunlaştı
> (yankı sorunu, şiveler, dikey güvenli alanlar – hepsi pratikten geldi). Şimdi sıra ilk 10 dış içerik üreticisinde ve
> ölçülebilir izlenme süresi etkisinde.

## Slayt 10 – Rekabet (2×2)

Eksenler: **Tetikleyen** (izleyici kontrollü ↔ ses kontrollü) × **Kullanım** (manuel ↔ otomatik)

| | manuel | otomatik |
|---|---|---|
| **İzleyici kontrollü** | Platformların yerel efektleri, çıkartma hediyeleri | Streamlabs / StreamElements uyarıları |
| **Ses kontrollü** | Voicemod, ses panoları, Stream Deck (kısayol) | **LiveFX** (tek sağlayıcı) |

Ek olarak: Türkçe paketler ✓, hikâye sahneleri ✓, açık API ✓, yerel çalışma ✓ – hiçbir rakipte yok.

> **Notlar:** Sağ alt çeyrek boş – şimdilik. Onu doldurabilecek olanlar platformların kendisi; bu yüzden onlarla
> konuşuyoruz. Streamlabs ve benzerleri rakip değil, ev sahibi: LiveFX her birinde tarayıcı kaynağı olarak çalışıyor.

## Slayt 11 – Yol haritası: 2. kapıya kadar yalın, sonra tohum turu

- **2027 1. çeyrek (1.–3. ay)** – Pro aboneliği yayında; ön tohum tamamlandı; mobil/web geliştirici ekipte (3. ay); TR lansmanı – G0 kapısı
- **2027 2. çeyrek (4.–6. ay)** – mobil uygulama/PWA; 300 kelimeli ve okuma destekli Kelime-Resim; 20 beta içerik üreticisi TR/DE – G1 kapısı
- **2027 3.–4. çeyrek (7.–12. ay)** – DE/EN lansmanı, pazar yerleri, ajans lisansı, platform ya da eğitim pilotu – G2a kapısı
- **2028 1. yarı (13.–18. ay)** – Kelime-Resim pilotu değerlendirildi; 2. kapıdan sonra yaklaşık 350 bin €'luk tohum turu;
  19. aydan itibaren hikâye motoru (Anlatı Filmi), Studio (otomatik kurgu), Mekânlar (VR/AR) ve büyüme ekibi

*18. aya kadar yalın: bir geliştirici, Pro aboneliği, mobil uygulama/PWA, Kelime-Resim. Hikâye motoru, otomatik kurgu ve
VR/AR sonraki turdan finanse ediliyor.*

> **Notlar:** Para ve kanıta göre sıralı: 250 bin € bizi bir geliştiriciyle 18 ay taşıyor. Önce Pro aboneliği ve mobil
> uygulama/PWA, paralelde ilk vizyon hattı olarak Kelime-Resim, ardından DE/EN ve bir platform ya da eğitim pilotu. Her
> adımın bir kapısı var (18. slayt). 18. ayda yaklaşık 350 bin €'luk tohum turunu topluyoruz – hikâye motoru, otomatik
> kurgu ve VR/AR ancak o zaman başlıyor. Sahneler bir video yapay zekâsıyla üretilmiyor, prosedürel olarak çiziliyor –
> 12–15. slaytlara köprü bu.

## Slayt 12 – Vizyon: Kelimelerden canlı video *(“Vizyon” rozeti)*

**“Sen anlat – sahne oluşsun.”**

Şema (şekillerden): **Ses → Anlama → Sahne → Video**
- 🎙 *Ses* – mikrofon, sesli okuma ya da hazır bir video dosyası
- 🧠 *Anlama* – DE/TR/EN sözlük, şiveye toleranslı, yapay zekâ isteğe bağlı
- 🎬 *Sahne* – ≤ 1 KB dünya durumu, tek ortak zaman çizelgesi
- 📺 *Video* – tarayıcıda çizilir, 60 fps, kişinin kendi cihazında

Dört hat (hat renkleri): 🌳 **Anlatı Filmi** (yeşil) · 🍎 **Kelime-Resim** (altın) · 🥽 **Mekânlar** (açık mavi) · ✂ **Studio** (pembe)

- **Bugün:** Ses bir saniyeden kısa sürede meme'e, sese ya da sahneye dönüşür – kurucunun kendi yayınlarında kullanılıyor.
- **Yarın:** Ses bir filme, telaffuzlu bir kelime kartına ya da hazır bir klibe dönüşür – yayında, okulda, sahnede,
  gözlükte.
- *Üretmek yerine çizmek – bir veri merkezinin değil, bir altyazının işlem bütçesiyle.*

> **Notlar:** Canlı altyazılar, platformların sesi gerçek zamanlı işlemek istediğini gösterdi – ücretsiz ve milyarlarca
> cihazda. Biz bir sonraki aşamayız: metin yerine görüntü. Tek motor, tek zaman çizelgesi, dört hat. Bir cümle birkaç
> yüz baytlık bir durum farkına dönüşüyor ve tek bir Canvas'ta çiziliyor – video difüzyon modeli yok, GPU sunucusu
> yok. Dürüst olalım: Bu 2027–2029 vizyonu, rozet bu yüzden orada. Temeli bugün çalışan kod (hikâye modu, efekt
> motoru, çevrimdışı tanıma). WebGPU artık tüm büyük tarayıcılarda var [Kaynak 27] – onu yalnızca isteğe bağlı kullanıyoruz.

## Slayt 13 – Generative Scene Engine: kelimelerden canlı video (HTML/JS, kaynak dostu) *(Vizyon · A hattı “Anlatı Filmi”)*

Şema: şekillerden bir sahne – transkript şeridi “Geceydi … bir kız ormana gitti … yağmur başladı … birden bir
ejderha!”, altında gece göğü, ay, yıldızlar, ağaçlar, yağmur, 👧 ve 🐉, “Atmosfer: Yağmur” rozeti, JSON olarak dünya
durumu. Yanında maliyet çubukları (logaritmik).

- Her cümle dünya durumunu değiştirir: **Yer · Zaman · Hava · Karakter · Nesne · Eylem · Ruh hâli**.
- Yayıncı kitap okur ya da anlatır – altında cümle cümle animasyonlu bir film oluşur.
- Tarayıcıda OBS'in yanında 60 fps, çevrimdışı ve deterministik: aynı zaman çizelgesi, aynı görüntü – her anlatı
  anında klibe dönüşür.
- Saatlik maliyet: video yapay zekâsı 180–2.700 USD [Kaynak 24, 25] · LiveFX metin yapay zekâsıyla 0,25–0,75 USD ·
  yapay zekâsız 0 € → 240 ile 10.000 kattan fazla ucuz, ve canlı ancak böyle mümkün.
- Sesli okuma, sesli kitap ve podcast formatları için: Almanya sesli kitap 374 milyon €, +%13 [Kaynak 19]; YouTube'da
  ayda > 1 milyar podcast izleyicisi [Kaynak 21].
- *Bilerek resimli kitap, fotogerçekçilik değil:* emoji/SVG ve parçacıklardan stilize bir dünya; isteğe bağlı yapay
  zekâ yalnızca sahneyi seçer, görüntü üretmez.

> **Notlar:** Yayıncı konuşmaktan başka bir şey yapmıyor. “Geceydi” – gökyüzü kararıyor. “Bir kız ormana gitti” –
> ağaçlar büyüyor, karakter içeri yürüyor. “Yağmur başladı” – yağmur yağıyor, atmosfer döngüsü değişiyor. “Birden bir
> ejderha” – şimşek, kamera sarsıntısı, ejderha. Teknik olarak: cümle başına 200–500 bayt, sahneler dakikada 1–3 kez
> değişiyor, en fazla 1.200 parçacıklı tek bir Canvas – efekt motorumuz bu bütçeyi bugün bile OBS'in yanında tutuyor.
> Video yapay zekâsı liste fiyatıyla saniyesi 0,05 USD (Veo 3.1 Lite, 720p) ile 0,75 USD arasında [Kaynak 24, 25].
> Pazar: Almanya'da 23,8 milyon kişi her hafta podcast dinliyor [Kaynak 20]; yapay zekâ video pazarı 2036'ya kadar
> 3,67'den 24,89 milyar USD'ye büyüyor [Kaynak 23]. Almanca MVP 2027 2. çeyrek, TR/EN ve dünya paketleri 2027 3. çeyrek.
> İlk yayınevi örneği: kurucunun kendi çocuk kitabı serisi.

## Slayt 14 – Dil öğrenme ve eğitim: her kelime bir resim *(Vizyon · B hattı “Kelime-Resim”)*

Şema: dil öğrenme kartı **“🍎 elma · apple · Apfel 🔊”** – büyük 🍎, “elma”, heceler “el · ma”, “apple · der Apfel”
(artikel renkli), hoparlör “elma – tr-TR”, DE · TR · EN etiketleri; modlar **Çeviri · Okuma desteği · Tekrar et**.

- Bir çocuk “Apfel” der – anında: 🍎, hedef dilde “elma”, renkli artikeliyle “der Apfel” ve telaffuz. Tıklamadan.
- Kendi dilinde okuma desteği: okuma çağı öncesi çocuklar, DaZ, uyum kursları ve nöroçeşitli öğrenenler için.
- Yerel, hesapsız, çevrimdışı – okul veri koruması bir satış argümanı; telaffuz sistem sesleriyle [Kaynak 29].
- **12,7 milyon** ücretli Duolingo abonesi [Kaynak 32] · 2025'te uyum kursuna başlayan **307.000** kişi [Kaynak 36] ·
  **5 milyar €** DigitalPakt 2.0 [Kaynak 40].
- Gelirler (tahmin): Kelime-Resim Aile aylık 4,99 € · okul lisansı yıllık 300–800 € · kurs lisansı öğretmen başına
  yıllık 49 € · yayınevi sürümü.

> **Notlar:** En kişisel kısım: Nöroçeşitlilik üzerine çocuk kitapları yazıyorum ve Alman-Türk'üm. Öğretmen
> “Konuştuğum dil”, “Göster” ve modu seçiyor, sonra kitap okuyor. Tekrar et modu bilerek bir telaffuz puanlaması
> değil, yeşil bir onay işareti. Teknik: Kelime → resim bir tablo araması, telaffuzu işletim sistemi sağlıyor, bir okul
> tableti yetiyor, çocuk başına sunucu maliyeti: sıfır. Pazar: dil öğrenme uygulamaları uygulama içi 1,54 milyar USD
> [Kaynak 33]; Almanya'da 16 yaş altı öğrencilerin %20,4'ü evde ağırlıklı olarak başka bir dil konuşuyor [Kaynak 37];
> Türkiye kökenli göç geçmişine sahip 2,65 milyon kişi [Kaynak 38]; dördüncü sınıfların %25'i okumada asgari standardın
> altında [Kaynak 39]. Fiyat çıpası ANTON okul başına 250–700 € [Kaynak 41]. Dürüst olalım: Uyum alanı euro olarak
> küçük, ama güvenilirlik ve destek fonlarına erişim sağlıyor; hacim ailelerde, yayınevlerinde, platformlarda.
> “İki kat hızlı” değil, “kelime öğrenmeyi destekler” diyoruz.

## Slayt 15 – Otomatik kurgu, editör, VR/AR – ve daha büyük bir pazar *(Vizyon · D “Studio” + C “Mekânlar” hatları)*

**LiveFX Studio: canlı kurgu ve otomatik kurgu**
- **Canlı → öne çıkanlar:** yayından sonra 9:16 formatında 3–5 klip, meme'lerin, hediyelerin ve sohbetin en yoğun
  olduğu anlardan – yüklemesiz.
- **Dosya girer → hazır çıkar:** videoyu sürükle → yerel transkript → çip olarak efekt, sahne ve kesmeler →
  donanım kodlayıcıyla MP4 [Kaynak 57, 59]. Şema: çipli zaman çizelgesi (meme pembe, sahne yeşil, zoom altın, kesme gri).

**LiveFX Mekânlar: tek durum, birçok ekran** – 🎤 Sahne ve etkinlik (bugün var) · 🏫 Sınıf (bugün var) ·
🎧 Resimli sesli kitap (sonraki tur) · 📱 Telefonda AR (sonraki tur) · 🥽 WebXR/VR (Vizyon 2029) · 👓 Ekranlı gözlük (Vizyon 2029)

*Genişleyen pazar:*

| Segment | Büyüklük |
|---|---|
| Video kurgu yazılımı 2026 | 2,68 milyar USD [Kaynak 51] |
| Yapay zekâ video (üretim + kurgu) 2026 | 3,67 milyar USD [Kaynak 23] |
| Dil öğrenme uygulamaları (uygulama içi) 2025 | 1,54 milyar USD [Kaynak 33] |
| Almanya sesli kitap 2025 | 374 milyon € [Kaynak 19] |
| Akıllı gözlük 2026 | 13,6 milyon cihaz / 5,1 milyar USD [Kaynak 45] |
| Canlı yayın (çekirdek) 2026 | 97–157 milyar USD [Kaynak 1, 2] |

Fiyat çıpaları: OpusClip aylık 15–29 USD, Descript aylık 16–65 USD [Kaynak 54, 55]. LiveFX Pro+ 14,99 € (tahmin) –
bulut maliyeti yok, dakika sınırı yok. XR ve gözlük: vitrin, gelir kalemi değil.

> **Notlar:** Aynı araca açılan iki kapı. Canlı → öne çıkanlar: Sunucu bugün bile her tetikleyiciyi, her hediyeyi,
> her sohbet mesajını zaman damgasıyla biliyor. Otomatik kurgu: 20 dakikalık bir MP4 pencereye sürükleniyor, Whisper
> tarayıcıda yerel olarak transkript çıkarıyor [Kaynak 60], dışa aktarım WebCodecs ve donanım kodlayıcıyla yapılıyor
> [Kaynak 57, 58, 59]. Dosya bilgisayardan hiç çıkmıyor. Mekânlar: Sahne ve sınıf bugün çalışıyor; resimli sesli kitap
> ve telefonda AR 2027; WebXR [Kaynak 47, 48] ve Meta Ray-Ban Display gibi ekranlı gözlükler [Kaynak 46] vizyon.
> Rekabete dürüst bakış: CapCut'ın 736 milyon aylık aktif kullanıcısı var [Kaynak 52] – evrensel bir editör olarak
> değil, ses → efekt, sahneler, TR/DE ve yerel işlemeyle yarışıyoruz. Alıcı sinyali: Canva 2026'da Cavalry ve
> MangoAI'ı satın aldı [Kaynak 56].

## Slayt 16 – Ekip

- **Tuncay Sancak** – Kurucu ve Mucit, Genel Müdür · Alman-Türk yazar ve canlı yayıncı · ürün, içerik, topluluk, test
  laboratuvarı olarak kendi yayınları · TR/DE/EN paketleri ilk elden · nöroçeşitlilik üzerine çocuk kitabı serisi
  (Kelime-Resim ve Anlatı Filmi'ne köprü)
- **[Açık pozisyon]** – mobil/web geliştirici: ön tohumdan ilk işe alım (3. ay) – iOS/Android, PWA, sonra SDK
- **[Açık pozisyon]** – içerik üreticisi ortaklıkları / büyüme (TR + DACH), eğitim satışı – tohum turuyla
- **Gönül Demet** – Yatırımcı İlişkileri (Investor Relations) · yatırımcılar ve ön tohum turu için iletişim kişisi
- Danışma kurulu / ortaklar (aranıyor): TR içerik üreticisi yönetimi · bir platformun eski „Live“ ürün sorumlusu · eğitim teknolojisi/didaktik

> **Notlar:** Kurucu, kullanıcı, içerik sağlayıcı ve ürün sahibi tek kişide – ürünün lehçelerle, dikey formatta ve
> Türkçede çalışmasının nedeni bu. Çocuk kitabı yazarı olarak ilk yayınevi ve eğitim örneğini de kendisi getiriyor.
> Gönül Demet yatırımcı ilişkilerinden sorumlu. Ön tohum yatırım (250.000 €) bir işe alımı finanse ediyor – 3. aydan
> itibaren bir mobil/web geliştirici; diğer işe alımlar 2. kapıdan sonra tohum turuyla geliyor. Kelime-Resim'in içerik
> kontrolünü bir eğitim teknolojisi danışma kurulu üstleniyor.

## Slayt 17 – Finansal tablo ve değerleme *(yeni)*

**„18 ay için 250 bin € – ardından tohum turu“** (tahminler; kaynak `LiveFX_Finanzmodell.xlsx`)

5 yıllık gelir tablosu, temel senaryo (bin €):

| bin € | 2027 | 2028 | 2029 | 2030 | 2031 |
|---|---|---|---|---|---|
| Gelir | 51 | 336 | 1.038 | 1.984 | 3.152 |
| Gider | 166 | 295 | 710 | 1.065 | 1.491 |
| **FAVÖK** | **−116** | **+41** | **+328** | **+919** | **+1.661** |
| Yıl sonu nakit | 134 | 175 | 503 | 1.422 | 3.083 |

2031 geliri: temkinli 602 bin € · iyimser 7,44 milyon €; 4.–5. yıllar ileriye taşındı; henüz gelir yok.

- **Hiç gelir olmadan 18 ay nakit ömrü** (ortalama gider ayda 13.444 €)
- **18. ayda nakit:** 49 bin € (temkinli) · 146 bin € (temel) · 369 bin € (iyimser)
- **~350 bin € tohum turu** 2. kapıdan sonra (15.–18. ay)

**Değerleme – kurucunun teklifi: 2,25 milyon € yatırım öncesi değer** (%10,0 karşılığında 250 bin €, yatırım sonrası
2,5 milyon €) – dört referans yönteminin hepsinin altında: Berkus 2,35 milyon € · Scorecard 2,95 milyon € · VC yöntemi
2,43 milyon € · Risk Faktörü Toplamı 3,0 milyon € (ağırlıklı 2,71 milyon €). Alternatif: 2,25 milyon € tavanlı, %20
iskontolu, faizsiz SAFE/dönüştürülebilir kredi – en fazla %10. *Müzakere temeli – vergi/hukuk danışmanıyla kontrol edin.*

> **Notlar:** Temel senaryo: gelir 2027'deki 51 bin €'dan 2031'de 3,15 milyon €'ya çıkıyor; FAVÖK 2028'de pozitife
> dönüyor ve 22. aydan itibaren kalıcı. Hiç gelir olmasa bile 250 bin € 18 ay yetiyor; 18. ayda 49–369 bin € nakit
> bekliyoruz, ardından 2. kapıdan sonra yaklaşık 350 bin €'luk bir tohum turu. Değerleme: %10 için 2,25 milyon €
> yatırım öncesi değer teklifimiz, her referans yönteminin altında adil ve yatırımcı dostu bir giriş fiyatı. Neden:
> 575+ otomatik testli çalışan ürün (v2.1), kendi fikrî mülkiyeti ve içeriği, Türkçe niş dahil üç dil, tek motor
> üzerinde A–D vizyon seçenekleri ve sermaye verimliliği – v2.1'e kadar dış sermaye olmadan geliştirildi. Dürüst olmak
> gerekirse aleyhte: tek kurucu, henüz gelir ve imzalı ortak yok.

## Slayt 18 – Kapılar: 250 bin €'nun kanıtlaması gerekenler *(yeni)*

Tüm değerler hedeftir (henüz ulaşılmadı): hedef = temel senaryo, eşik = temkinli senaryo.

| Kapı | KPI'lar (hedef, parantez içinde eşik) | Açtığı adım |
|---|---|---|
| **G0 · 3. ay** – başlangıç | Pro aboneliği yayında (ödeme); mobil/web geliştirici ekipte | Pazara giriş 2. aşama bütçesi |
| **G1 · 6. ay** – aktivasyon | 10.000 kayıtlı kullanıcı (4.000); 400 ödeme yapan Pro (120); 20 beta içerik üreticisi TR/DE, 10–20 elçi; 300 kelimeli Kelime-Resim; 4. hafta elde tutma ≥ %30 | Mobil uygulama/PWA yayını |
| **G2a · 12. ay** – çekiş | 20.000 kullanıcı (8.000); 800 ödeme yapan Pro (240); MRR 8.073 € (2.500 €); 1 platform ya da eğitim pilotu; ≥ 3 kurs/sınıfta Kelime-Resim | DE/EN genişlemesi, platform görüşmeleri |
| **G2 · 18. ay** – sonraki tur | 50.000 kullanıcı (19.000); 2.000 ödeme yapan Pro (570); MRR 22.586 € (6.495 €); Pro 3. ay elde tutma ≥ %75; dönüşüm ≥ %3 / %4; ≥ 5 ödeme yapan okul ya da kurs | Tohum turu, 19. aydan itibaren büyüme ekibi, hikâye motoru/Studio |

> **Notlar:** 18 ayda dört kapı – her biri bir sonraki bütçeyi açıyor. 18. aydaki 2. kapı tohum turunun temeli.
> Bunların hepsi hedef – henüz hiçbirine ulaşılmadı.

## Slayt 19 – Talep

**„Canlı yayınlara kulak verelim.“**

- **Platform pilotu**: *TikTok LIVE Studio*, *Instagram Live Producer* ya da *YouTube Live*'da bir özellik olarak LiveFX –
  tarayıcı kaynağı bugün çalışıyor; 8 hafta, 20 içerik üreticisi, ölçülen izlenme süresi, hediyeler ve klipler
- **Eğitim ve dil pilotu**: eğitim kurumları, uyum kursları, okullar, dil öğrenme platformları ve yayınevleri –
  Kelime-Resim ve Anlatı Filmi'ni [Sayı] kurs/sınıfta ya da [Sayı] kitapla test edin
- **Ortaklar**: yayın yazılımları (OBS eklentisi, Streamlabs), TR/DACH içerik üreticisi ajansları, ses/ASR sağlayıcıları,
  editör sağlayıcıları (Studio SDK)
- **Ön tohum: %10 karşılığında 250.000 €** (yatırım öncesi değer 2,25 milyon €, yatırım sonrası 2,5 milyon €) ya da
  2,25 milyon € tavanlı SAFE; 18 ay, yalın: Pro aboneliği, mobil uygulama/PWA, TR → DE/EN lansmanı, Kelime-Resim;
  paralelinde satın alma görüşmelerine açığız

**18 aylık fon kullanımı – Öneri – vergi/hukuk danışmanıyla kontrol edin** (slayttaki çubuk; ayrıntılar iş planı 11.6'da):

| Alan | Pay | Tutar |
|---|---|---|
| Ekip/ürün: mobil/web geliştirici, kısmi kurucu maaşı, test cihazları | %50 | 125.000 € |
| Pazara giriş: içerik üreticisi programı, topluluk, platform ve eğitim pilotları | %20 | 50.000 € |
| İlk vizyon hattı Kelime-Resim (dil öğrenme) | %15 | 37.500 € |
| Hukuk, marka, veri koruma | %10 | 25.000 € |
| Yedek | %5 | 12.500 € |
| **Toplam** | **%100** | **250.000 €** |

İletişim: Tuncay Sancak, Kurucu ve Genel Müdür · Yatırımcı İlişkileri: Gönül Demet · [E-posta] · Demo: [Bağlantı] · Kod ve dokümantasyon: live-fx/
*Bu sunum Almanca ve İngilizce olarak da mevcut: `LiveFX_Pitch.pptx` · `LiveFX_Pitch_EN.pptx`*

> **Notlar:** Somut bitirin: canlı yayın ekibinde bir muhatap ve 20 içerik üreticisiyle 8 haftalık bir pilot
> istiyoruz. Overlay'i, paketleri, desteği ve ölçümü (izlenme süresi, hediyeler, canlı yayınlardan klipler) biz
> sağlıyoruz. Kelime-Resim ve Anlatı Filmi için eğitim kurumları, dil öğrenme platformları ya da yayınevleriyle ikinci
> bir pilot arıyoruz – ilk yayınevi örneği kurucunun kendi çocuk kitabı serisi. Tura gelince: 2,25 milyon € yatırım
> öncesi değerle %10 karşılığında 250.000 € – hiç gelir olmasa bile 18 ay yetiyor; hikâye motoru, otomatik kurgu ve
> VR/AR, 2. kapıdan sonra yaklaşık 350 bin €'luk tohum turuyla geliyor (iş planı 11.6). Yatırımcı iletişimi: Gönül Demet.
