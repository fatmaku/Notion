# LiveFX – Sunum (17 slayt, sürüm 2.0 + Vizyon 2027–2029)

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

## Slayt 5 – Bugünkü ürün (sürüm 2.0)

- **Tanıma**: tarayıcı ASR (Chrome/Edge), otomatik dil DE/TR/EN, şive toleransı, öğrenme işlevi, kendi kendine test
  ve tanı; API üzerinden harici Whisper/Deepgram; çevrimdışı Whisper (deneysel)
- **Efekt motoru v2**: fizikli Canvas parçacıkları (60 fps), neon/glitch yazı, alt yazı bantları, kombolar, 4 tema
- **Hikâye modu**: 13 tam ekran sahne + 12 atmosfer döngüsü, DE/TR/EN hikâye paketleri
- **Paketler**: Türkçe 85 · Deutsch 49 · English 50 · Aile ve Çocuk 27 · Oyun 27 tetikleyici, artı GIF arama
- **Ses**: 38 sentetik ses (lisans ücreti yok), limiter, ducking, stereo ve yankılı mikser
- **İzleyici tetikleyicileri**: Twitch sohbeti, YouTube sohbeti, hediye webhook'u (TikTok için TikFinity/Streamer.bot)
- **Telefondan kumanda** (PWA), OBS/Streamlabs, TikTok LIVE Studio, Instagram Live Producer, OBS'siz demo kaydı
- **Açık HTTP API** (Stream Deck, sohbet botları, harici ASR), token ile kimlik doğrulama, 240+ otomatik test

> **Notlar:** Bu artık bir prototip değil: 0.1'den 2.0'a sürümler (2.0 = sahne ve satış için sağlamlaştırma),
> birim ve uçtan uca testler, DE/TR kılavuzlar.
> İki şeyin altını çizin: (1) kendi seslerimiz ve paketlerimiz = telif ihlali yok, (2) izleyici tetikleyicileri gelir
> modeline köprü – bir hediye bugün bile bir efekti tetikleyebiliyor.

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
- **Ürün**: güncel sürüm 2.0 (0.1 → 2.0), 240+ otomatik test, DE/TR kılavuzlar, demo klipler
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

## Slayt 11 – Yol haritası

- **2026 4. çeyrek** – Yerel mobil SDK (efektler yalnızca OBS'te değil, doğrudan kamera uygulamasında), kararlı
  çevrimdışı tanıma, üretici testleri
- **2027 1. çeyrek** – Platform entegrasyonu (TikTok LIVE Studio eklentisi / Instagram Live Producer), kurulum
  programı, pazaryeri beta, “öne çıkanları bul”
- **2027 2. çeyrek** – Yapay zekâ ile anlama v2 (duygu, bağlam, ironi; cümle başına çoklu tetikleme), Pro aboneliği,
  canlı ticaret tetikleyicileri
- **2027 3.–4. çeyrek** – Hikâye motoru (bütün hikâyeler sahne dizisi olarak, prosedürel çizilen sahneler
  (Anlatı Filmi)), tüm platformlarda izleyici hediyeli efektler, ilk platform pilotu

> **Notlar:** Kaldıraca göre sıralama: Mobil SDK en büyük sorunu çözüyor (OBS kullanmayan telefon yayıncıları).
> Platform entegrasyonu bu sunumun talebi. Yapay zekâ ile anlama ve hikâye motoru teknik farkımız. Önemli: Sahneler
> bir video yapay zekâsı tarafından üretilmiyor, prosedürel olarak çiziliyor – 12–15. slaytlara köprü bu.

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
🎧 Resimli sesli kitap (2027) · 📱 Telefonda AR (2027) · 🥽 WebXR/VR (Vizyon 2028) · 👓 Ekranlı gözlük (Vizyon 2028)

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

- **Tuncay Sancak** – Kurucu & Mucit, Genel Müdür · Alman-Türk yazar ve canlı yayıncı · ürün, içerik, topluluk, test laboratuvarı olarak kendi
  yayınları · TR/DE/EN paketler birinci elden · nöroçeşitlilik üzerine çocuk kitabı serisi (Kelime-Resim ve Anlatı
  Filmi'ne köprü)
- **[Açık pozisyon]** – Teknik lider (ses/gerçek zamanlı, mobil SDK, Canvas/WebGPU)
- **[Açık pozisyon]** – Üretici ortaklıkları / büyüme (TR + DACH), eğitim satışı
- **Gönül Demet** – Investor Relations (yatırımcı ilişkileri) · yatırımcılar ve ön tohum turu için iletişim kişisi
- Danışma kurulu / ortaklar (aranıyor): TR içerik üreticisi yönetimi · bir platformun eski „Live“ ürün sorumlusu · eğitim teknolojisi/didaktik

> **Notlar:** Kurucu tek kişide kullanıcı, içerik sağlayıcı ve ürün sorumlusu – ürünün şivelerde, dikey formatta ve
> Türkçede çalışmasının nedeni bu. Çocuk kitabı yazarı olarak ilk yayınevi ve eğitim örneğini de kendisi getiriyor.
> Gönül Demet yatırımcı ilişkilerinden sorumlu. Ön tohum yatırımla (500.000 €) iki işe alım geliyor; Kelime-Resim'i bir eğitim teknolojisi danışma kurulu içerik açısından denetliyor.

## Slayt 17 – Talep

**“Canlı yayınlara kulak verelim.”**

- **Platform pilotu**: LiveFX, *TikTok LIVE Studio*, *Instagram Live Producer* ya da *YouTube Live*'da bir özellik
  olarak – tarayıcı kaynağı bugün çalışıyor; 8 hafta, 20 üretici; izlenme süresi, hediyeler ve klipler ölçülür
- **Eğitim ve dil pilotu** *(yeni)*: eğitim kurumları, uyum kursları, okullar, dil öğrenme platformları ve yayınevleri –
  Kelime-Resim ve Anlatı Filmi'ni [Sayı] kurs/sınıfta ya da [Sayı] kitapla test edin
- **Ortaklar**: yayın yazılımları (OBS eklentisi, Streamlabs), TR/DACH üretici ajansları, ses/ASR sağlayıcıları,
  editör sağlayıcıları (Studio SDK)
- **Ön tohum: 500.000 €** LiveFX 2.0 ve A–D vizyon hatları için (önce Kelime-Resim ve hikâye motoru), 24 ay;
  paralelinde satın alma görüşmelerine açığız (teknoloji + ekip)

**24 ay boyunca fon kullanımı – Öneri – lütfen onaylayın** (slayttaki çubuk; ayrıntılar iş planı 11.6):

| Alan | Pay | Tutar |
|---|---|---|
| Ürün ve mühendislik ekibi | ~%50 | 250.000 € |
| Vizyon hatlarının prototipten ürüne taşınması (önce Kelime-Resim/dil öğrenme ve hikâye motoru) | ~%20 | 100.000 € |
| Pazara giriş, içerik üreticisi programı, pilotlar | ~%15 | 75.000 € |
| Hukuk, marka, veri koruma | ~%10 | 50.000 € |
| Rezerv | ~%5 | 25.000 € |
| **Toplam** | **%100** | **500.000 €** |

İletişim: Tuncay Sancak, Kurucu & Genel Müdür · Investor Relations: Gönül Demet · [E-posta] · Demo: [Bağlantı] · Kod ve doküman: live-fx/
*Bu sunum Almanca ve İngilizce de mevcut: `LiveFX_Pitch.pptx` · `LiveFX_Pitch_EN.pptx`*

> **Notlar:** Somut bitirin: İhtiyacımız olan, canlı yayın ekibinde bir muhatap ve 20 üreticiyle 8 haftalık bir pilot.
> Biz katmanı, paketleri, desteği ve ölçümü (izlenme süresi, hediyeler, canlı yayınlardan klipler) sağlıyoruz. Yeni:
> Kelime-Resim ve Anlatı Filmi için eğitim kurumları, dil öğrenme platformları ya da yayınevleriyle ikinci bir pilot
> arıyoruz – ilk yayınevi örneği kurucunun kendi çocuk kitabı serisi. Tur hakkında: Hiç gelir olmasa bile 500.000 €
> yaklaşık 22 ay yetiyor; temkinli senaryo üç yıl boyunca karşılanıyor (iş planı 11.6). Yatırımcı iletişimi: Gönül Demet.
