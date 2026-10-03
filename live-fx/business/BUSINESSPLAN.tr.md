# LiveFX – İş Planı

**Dinleyen canlı yayınlar.** Gerçek zamanlı meme'ler, sesler ve animasyonlu sahneler – içerik üreticisinin sesiyle tetiklenir.

Tarih: Ekim 2026 · Ürün sürümü: 2.0 · Gizli
Kurucu: [İsim] · İletişim: [E-posta] · [Şehir]

> Almanca: BUSINESSPLAN.md · English: BUSINESSPLAN.en.md

> Tüm pazar verileri kamuya açık ikincil kaynaklardan alınmıştır ve aralık olarak verilmiştir; kaynaklar metinde [Kaynak n] olarak gösterilir, liste ektedir. Kendi varsayımlarımız açıkça „tahmin“ olarak işaretlenmiştir. [Köşeli parantez] içindeki rakamları kurucu tamamlayacaktır.

---

## 1. Yönetici Özeti

**LiveFX**, canlı yayınları kurgulanmış kısa videolar kadar canlı hâle getiriyor. Yazılım içerik üreticisini dinliyor ve bir saniyeden kısa sürede yayına uygun meme'ler, GIF'ler, sesler, metin efektleri ya da animasyonlu sahnelerin tamamını ekliyor – eller serbest, üç dilde (Türkçe, Almanca, İngilizce, otomatik algılanır), OBS/Streamlabs üzerinden TikTok LIVE, Instagram Live, YouTube Live ve Twitch ile uyumlu.

**Vizyon 2027–2029:** Aynı motor, konuşulan her şeyin görsel diline dönüşüyor – kelimelerden akan bir Anlatı Filmi, telaffuzlu dil öğrenme kartları (Kelime-Resim), sahneden akıllı gözlüğe yeni mekânlar ve hazır videoları kendi kendine kurgulayan bir stüdyo. Tarayıcı bir video yapay zekâsı çalıştırmak yerine çizdiği için bu, üretken video yapay zekâsından kat kat ucuz ve canlı çalışıyor (15. bölüm).

| | |
|---|---|
| **Problem** | Kısa videoları viral yapan her şey çekimden *sonra* kurguda oluşuyor. Canlı yayın ham. Mevcut araçlar izleyici olaylarına ya da tuşa basmaya tepki veriyor – hiçbiri söylenen kelimeye değil. |
| **Çözüm** | Ses → efekt. Şive toleranslı ve öğrenen anahtar kelime eşleştirme, isteğe bağlı olarak anahtar kelime olmadan yapay zekâ ile anlama, sesli okuma için hikâye modu, sohbet ve hediyeyle izleyici tetikleyicileri, telefondan uzaktan kumanda. |
| **Durum** | Sürüm 2.0, çalışır durumda, beş pakette 238 hazır tetikleyici, 13 sahne, 38 ses, otomatik testler; kurucunun kendi canlı yayınlarında kullanılıyor. |
| **Pazar** | Dünya genelinde canlı yayın 2026: 97–157 milyar USD [Kaynak 1, 2]; içerik üreticisi ekonomisi ~216–260 milyar USD [Kaynak 3, 4]; hediyeler TikTok LIVE yayıncılarının gelirinin ≈ %50'si [Kaynak 5, 6]. |
| **İş modeli** | Free + Pro aboneliği (aylık 9,99 €), içerik üreticisi paketleri (2,99–4,99 €), ajans lisansı, B2B platform lisansı; TikTok/Meta/YouTube'a stratejik çıkış (exit). |
| **Pazara giriş** | Önce Türkçe konuşan içerik üreticisi topluluğu, sonra DE/EN; vitrin olarak kendi yayınlarımız; içerik üreticisi ortaklık programı; LinkedIn ve basın. |
| **İhtiyaç** | Mobil geliştirici, platform ortaklıkları, pilot ortaklar; 18–24 ay için [250–350 bin €] tohum yatırım (tahmin) ya da daha yavaş büyümeyle kendi kaynaklarla ilerleme (bootstrapping). |

Talebimiz: Bir platformla (TikTok LIVE Studio, Instagram Live Producer, YouTube Live) ya da bir içerik üreticisi aracı sağlayıcısıyla pilot ortaklık – alternatif olarak teknoloji ve ekibin devralınması.

---

## 2. Problem

TikTok, Instagram Reels ve YouTube Shorts'taki kısa videolar meme'ler, ses efektleri, çıkartmalar ve zoom vuruşlarıyla yaşıyor. Bunların hepsi çekimden **sonra** oluşuyor – CapCut'ta, TikTok editöründe, edit'lerde. Canlı yayınlar ise ham: İçerik üreticisi aynı anda hem sunucu hem yönetmen hem kurgucu, ve kurgu hiç gelmiyor.

Aynı zamanda içerik üreticisi ekonomisinin geliri yayının *içine* kayıyor: Hediyeler, canlı ticaret ve topluluk abonelikleri yayın sırasında oluşuyor. TikTok LIVE'da hediyeler yayıncı gelirinin yaklaşık yarısını oluşturuyor [Kaynak 5, 6]; sektör kaynaklarına göre 20–100 bin takipçili içerik üreticileri hediyelerden ayda 500–3.000 USD kazanıyor [Kaynak 5]. İzlenme süresinin her dakikası önemli – ve tekdüze bir yayın izleyici kaybediyor.

Mevcut araçlar bunu çözmüyor:

- **Alert'ler** (Streamlabs, StreamElements, Sound Alerts) *izleyiciye* tepki veriyor: takip, bağış, Bits. İçerik üreticisinin kendisi hiçbir şeyi tetiklemiyor.
- **Ses panoları** (Voicemod, Stream Deck) *el* gerektiriyor: kısayol tuşları, düğmeler, tıklamalar – konuşurken, kamerayı tutarken ya da kitap okurken.
- **Platformların kendi efektleri** (TikTok, Instagram) elle seçilen ve içeriğe tepki vermeyen filtreler ve çıkartmalar.
- **Hiçbir araç içerik üreticisinin söylediğine tepki vermiyor.** Otomatik altyazılar, konuşmadan gerçek zamanlı metin üretmenin işe yaradığını kanıtladı. Konuşmadan gerçek zamanlı *efektler* ise şimdiye kadar yoktu.

Çok dilli içerik üreticileri için – örneğin Türkiye'deki ve Avrupa'daki büyük Türkçe konuşan topluluk – bir sorun daha var: Yerelleştirilmiş içerik üreticisi araçları neredeyse yok; Türk meme kültürünü („yok artık“, „helal olsun“, „ohaa“) anlayanlar ise hiç yok.

---

## 3. Ürün (Sürüm 2.0)

### 3.1 Tek cümleyle

İçerik üreticisi konuşuyor – LiveFX dinliyor. „Krass“, „oh nein“, „alkış“, „yok artık“ ya da „bruh“ dediğinde bir saniyeden kısa sürede yayında uygun meme beliriyor ve uygun ses çalıyor. Kitap okuduğunda – „yağmur yağıyordu“, „gece“, „ejderha“ – katman, atmosfer sesli animasyonlu bir sahneye dönüşüyor.

```
Mikrofon ─► Konuşma tanıma (oto DE/TR/EN) ─► Eşleştirici (şive toleransı) ──┐
                                           └► Yapay zekâ ile anlama (opsiyonel) ┤
İzleyici sohbeti / Hediye / Telefon / Stream Deck ─► HTTP API (token) ──────────┼─► Köprü ─► OBS'te katman ─► Yayın
Panel: meme paketleri, GIF arama, yüklemeler, tetikleyici editörü, temalar ─────┘
```

### 3.2 İşlevler

| Alan | Sürüm 2.0 durumu |
|---|---|
| **Konuşma tanıma** | Konuşurken **otomatik dil seçimiyle** üç dil (Almanca, Türkçe, İngilizce); DE/AT/CH ve US/GB/IN varyantları. Tarayıcı motoru (Chrome/Edge), API üzerinden harici motorlar (Whisper, Deepgram) ya da doğrudan tarayıcıda **çevrimdışı Whisper**. „Hızlı“ (ara sonuçlar) ya da „kesin“ (tam cümleler) tepki, 3 okuma alternatifi, kendi kendine test, ses seviyesi ve gecikme göstergesi. |
| **Şive ve öğrenme** | Hatalı eşleşmelere karşı korumalı, üç kademeli bulanık eşleştirme („grass“ → krass, „helal olsn“ → helal olsun). Tanınmayan cümleler tek tıkla bir tetikleyiciye atanıyor – bir sonraki sefer oturuyor. |
| **Meme paketleri** | Türkçe (85), Deutsch (49), English (50), Aile ve Çocuk (27), Oyun (27) = **238 tetikleyici**, tek tıkla yüklenip kaldırılabiliyor. |
| **GIF arama ve medya** | Doğrudan panelde Tenor/Giphy araması, kontrollü içe aktarma, tek adımda „Tetikleyici yap“; 8 MB'a kadar kendi PNG/JPG/GIF/WebP ve MP3/WAV/OGG dosyaları. |
| **Hikâye modu** | 12 atmosfer döngüsüyle (yağmur, rüzgâr, şömine, kuşlar, deniz, gök gürültüsü, cırcır böcekleri, kalp atışı, çanlar, şehir, uzay, fırtına) 13 animasyonlu tam ekran sahne (yağmur, gece, orman, deniz, ateş, kale, kar, çöl, şehir, uzay, gün doğumu, şimşekli fırtına, sahneyi bitir); çıkartma olarak karakterler; DE/TR/EN hikâye paketleri; elle kontrol için sahne pedi. |
| **Efektler v2 ve temalar** | Fizikli parçacıklar (otomatik sınırla 60 fps), parlama, 3B dönen kartlar, impact zoom, ışık huzmeleri; efekt türleri kart, resim/GIF, emoji yağmuru, banner, konfeti, sahne, çıkartma, metin (neon/geçiş/zıplama/glitch), alt bant, kombo (sekans). Neon, Pastel, Minimal, Çocuk Kitabı temaları. Kombolar (10 sn'de 3× „krass“ → konfeti) ve sesten yoğunluk. |
| **Ses** | Gruplar hâlinde (impact, komik, sihir, atmosfer) 38 sentetik, lisans gerektirmeyen ses; limiter'lı mikser, atmosferde ducking, konuma göre stereo, sahneler için yankı; tetikleyici başına ses seviyesi; yankıya karşı ses kontrol kartı. |
| **İzleyici tetikleyicileri** | Girişsiz Twitch sohbeti, API anahtarıyla YouTube Live sohbeti, izleyici başına ve genel bekleme süreli sohbet komutları (`!airhorn`); kademeli **hediye webhook'u** (TikFinity/Streamer.bot üzerinden TikTok jetonları, YouTube Super Chat, Twitch Bits). |
| **Telefon** | Web uygulaması (PWA) olarak uzaktan kumanda: kutucuk olarak tüm tetikleyiciler, sahne çubuğu, duraklatma, ses seviyesi, canlı transkript; HTTPS ile telefon ikinci mikrofona dönüşüyor. |
| **Çevrimdışı** | Panel, katman, demo ve telefon internetsiz çalışıyor (önbellekte uygulama kabuğu); Whisper ile çevrimdışı konuşma tanıma (deneysel). |
| **Entegrasyon** | Tarayıcı kaynağı olarak OBS/Streamlabs → Instagram Live (Live Producer), TikTok LIVE (LIVE Studio ya da yayın anahtarı), YouTube Live, Twitch; sohbet için güvenli alanlı dikey düzen; OBS'siz demo kaydı; Stream Deck, Streamer.bot ve sohbet botları için API. |
| **Yapay zekâ (opsiyonel)** | Bir dil modeliyle anahtar kelime olmadan anlamsal kavrama („bu çok utanç vericiydi“ → Awkward), 1,5 sn zaman aşımıyla: geç gelen bir meme'dense hiç meme olmaması daha iyi. |

### 3.3 Sürüm geçmişi

| Sürüm | İçerik |
|---|---|
| 1.0 | Prototipten programa: medya kütüphanesi, tetikleyici editörü, sunucu tarafında kayıt, akıllı mod, harici API, dikey düzen, güvenlik sıkılaştırması, testler |
| 1.1 | TR/DE/EN meme paketleri, GIF arama, OBS'siz demo sayfası, 26 ses |
| 1.2 | Şive toleransı, yayından öğrenme, tanılama ve kendi kendine test |
| 1.3 | Hikâye modu: 13 sahne, 12 atmosfer döngüsü, üç dilde hikâye paketleri |
| 1.4 | Telefondan uzaktan kumanda, PWA, HTTPS, çevrimdışı tanıma |
| 1.5 | Yankıya karşı ses kontrolü, DE/TR/EN otomatik dil algılama |
| 1.6 | Efekt motoru v2, temalar, ses mikseri, 38 ses, izleyici tetikleyicileri (sohbet + hediyeler), Aile ve Oyun paketleri |
| 2.0 | İnceleme ve sıkılaştırma turu, regresyon testleri, iş dokümanları (fragman, sunum, iş planı, açılış sayfası DE/TR/EN) |

---

## 4. Teknoloji ve fikrî mülkiyet

**Mimari.** LiveFX saf HTML/JavaScript/CSS ve **harici bağımlılığı olmayan** (zero-dependency) bir Node.js sunucusundan oluşuyor. Sunucu, ayrı modüllere sahip bir composition root (yönlendirici, statik dosyalar, SSE köprüsü, kimlik doğrulama, durum, API'ler, Smart, sohbet); tarayıcı ve sunucu, geçiş (migration) destekli sürümlü bir **tetikleyici şemasını** (v2) paylaşıyor. Tüm arayüzler `docs/CONTRACTS.md` dosyasında belgelenmiş.

**Bulut yerine yerel.** Konuşma tanıma, eşleştirme, render ve kayıt içerik üreticisinin bilgisayarında çalışıyor. Tetikleyiciler, medya ve ayarlar kullanıcıda kalıyor. **Bulut zorunluluğu yok**: Tarayıcı tanıma tarayıcının hizmetini, çevrimdışı mod tarayıcıdaki bir Whisper modelini kullanıyor; yapay zekâ bileşeni isteğe bağlı olarak açılabiliyor. Bu, işletme maliyetlerini neredeyse sıfıra indiriyor, veri korumayı (GDPR/KVKK) kolaylaştırıyor ve ürünü eğitim ve aile için güvenilir kılıyor.

**Açık API.** Token korumalı HTTP rotaları (`/api/fire`, `/api/transcript`, `/api/gift`, `/api/chat/test`, `/api/triggers`, `/api/assets`) Stream Deck, Streamer.bot, sohbet botları, TikFinity ve harici konuşma tanıma servislerinin erişimine izin veriyor. Aynı API, ileride yerel bir platform entegrasyonunun ya da bir mobil SDK'nın temeli.

**Güvenlik.** Sunucu varsayılan olarak yalnızca yerelde dinliyor; yazma rotaları token ya da same-origin istiyor; DNS rebinding'e karşı host izin listesi; yüklemeler magic byte ile kontrol ediliyor; katman metinleri escape ediliyor. Otomatik birim ve uçtan uca testler (Playwright) şemayı, eşleştiriciyi, sunucuyu, API'leri, sohbeti, hediyeleri ve sesi güvence altına alıyor.

**Korunabilir yapı taşları (know-how, kod ve içerik üzerindeki telif hakkı):**

1. Aksan katlama, uzunluk kapılı Damerau-Levenshtein ve durak kelime korumalı („schön“ ≠ „schon“) çok dilli eşleştirici; özgüllük kuralları („oh nein“, „nein“dan önce gelir); ara sonuçlarda çift tetiklemeye karşı geçiş sayımı.
2. Çakışmasız anahtar kelimelere sahip, dile özgü, özenle seçilmiş tetikleyici paketleri (238 tetikleyici) ve hikâye paketleri – içerik tarafındaki savunma hendeği.
3. Lisans maliyeti ve telif ihlali (copyright strike) riski olmayan sentetik ses kütüphanesi (38 ses, 12 döngü).
4. Sahne motoru (parçacık fiziği, paralaks, geçişler) ve ses mikseri (ducking, panning, yankı).
5. Yayından öğrenme döngüsü (bulanık eşleşmeleri kaydetmek, eşleşmeyen cümleleri atamak).

„LiveFX“ marka tescili (DE/AB/TR) incelenecek; tek tek yöntemlerin patentlenebilirliği (atmosfer döngülü, sesle kontrol edilen sahne katmanı) bir patent vekiliyle netleştirilebilir [maliyet: tahmin 5–10 bin €].

---

## 5. Hedef gruplar

| Segment | İhtiyaç | LiveFX ne sunuyor | Olgunluk |
|---|---|---|---|
| **Eğlence içerik üreticileri TR/DE/EN** (TikTok LIVE, Instagram Live, YouTube, Twitch) | Elleri kullanmadan yayında ritim ve kahkaha; daha uzun izlenme süresi → daha fazla hediye | TR/DE/EN meme paketleri, GIF arama, kombolar, sesten yoğunluk, hediye tetikleyicileri | bugün |
| **Canlı ticaret** (ürün tanıtımları, drop'lar, flash satışlar) | Ürün adı, „kampanya“, „sadece bugün“ → çıkartma, banner, kasa sesi; satın almalarda sosyal kanıt | Tetikleyici editörü, alt bant, metin efektleri, siparişler için hediye/webhook kademeleri | bugün kendi tetikleyicilerle; paket planlanıyor |
| **Kitap okuma ve aile yayınları** (yazarlar, ebeveynler, çocuk kitabı içerik üreticileri) | Hikâyeleri görünür kılmak; çocukların ilgisini canlı tutmak | 13 sahne ve atmosferli hikâye modu, „Aile ve Çocuk“ paketi, „Çocuk Kitabı“ teması | bugün |
| **Eğitim** (öğretmenler, dil dersi, özel ders yayınları, okul öncesi) | Kelimelerin, duyguların, anlatıların görselleştirilmesi; ödül efektleri | Üç dilde hikâye paketleri, kendi tetikleyiciler („kelime → resim“), çevrimdışı kullanılabilir, bulut yok | bugün niş olarak; eğitim paketi planlanıyor |
| **Etkinlik ve sahne** (sunuculuk, düğünler, komedi, dernek geceleri) | Teknik ekip olmadan komutla efektler; uzaktan kumanda olarak telefon | PWA uzaktan kumanda, ses panosu, sahne pedi, kombo sekansları | bugün |
| **Ajanslar ve ağlar** (içerik üreticisi yönetimi, MCN'ler) | Birçok içerik üreticisi için tek kurulum, markaya uygun paketler | Tetikleyicilerin dışa/içe aktarımı, temalar, API | ajans lisansı planlanıyor |
| **Platformlar (B2B)** | Daha uzun izlenme süresi, çıkartma hediyeleşmesi 2.0, kısa videoya uygun canlı klipler | Yerel işlev ya da SDK olarak teknoloji ve paketler | sunum aşaması |
| **Eğitim teknolojisi ve dil öğrenme** (aileler, ilkokullar, DaZ ve uyum kursları, miras dili olarak Türkçe) | Kelimeleri görünür ve duyulur kılmak, okuma desteği, hesapsız ve veri korumaya uygun | Kelime-Resim: söylenen kelime → resim + hedef dil + telaffuz, okuma desteği, tekrar et, çevrimdışı | Vizyon, prototip mevcut (2027'den itibaren) |
| **Kitap okuma, sesli kitap ve podcast formatları, yayınevleri** | Yalnızca sesten oluşan içeriğe görüntü, „filmli“ kitap okuma yayınları | Anlatı Filmi (Generative Scene Engine), Companion modu „resimli sesli kitap“, yayınevi lisansı | Vizyon, prototip mevcut (2027'den itibaren) |
| **Video kurgu** (içerik üreticileri, podcast yapımcıları, ajanslar) | Saatlerce kurgu yapmadan, yükleme yapmadan klipler ve Shorts | Studio: yayından öne çıkanlar, hazır videoların otomatik kurgusu, yerel MP4 dışa aktarımı | Vizyon (2027'den itibaren) |
| **VR/AR, sahne ve etkinlikler** (organizatörler, kütüphaneler, donanım ortakları) | Komutla efektler, sürükleyici anlatılar | Sahne modu (bugün), telefonda AR, vitrin olarak WebXR ve ekranlı gözlükler | Sahne bugün; AR/XR vizyon (2027–2029) |

Başlangıç segmenti **Türkçe konuşan içerik üreticisi topluluğu** (Türkiye ve Almanya/Avrupa'daki diaspora): en büyük paket, neredeyse hiç rekabet yok, güçlü bir meme kültürü var ve kurucu bu topluluğun bir parçası.

2027'den itibaren vizyonla (15. bölüm) üç komşu hedef grup ekleniyor: **eğitim ve dil öğrenme** (aileler, okullar, kurslar), **yayınevleri ve ses** (sesli kitap, podcast, kitap okuma) ve **video kurgu** (sonradan kurgu yapan içerik üreticileri ve ajanslar). VR/AR ve gözlükler 2029'a kadar vitrin, ayrı bir gelir hattı değil.

---

## 6. Pazar analizi (özet)

Tüm aralıkları, Türkiye değerlendirmesini ve fiyat karşılaştırmasını içeren tam analiz `MARKTANALYSE.tr.md` dosyasında. Temel veriler:

| Gösterge | Aralık | Kaynak |
|---|---|---|
| Dünya genelinde canlı yayın pazarı 2026 | 97–157 milyar USD; 2030'a kadar 250–345 milyar USD tahmini (CAGR ~%27) | [Kaynak 1, 2] |
| İçerik üreticisi ekonomisi 2026 | ~216–260 milyar USD (CAGR ~%22) | [Kaynak 3, 4] |
| Canlı yayının içerik üreticisi ekonomisindeki payı | ~%14 ≈ 36 milyar USD | [Kaynak 3] |
| TikTok LIVE içerik üreticisi büyümesi | 2025'te Güneydoğu Asya/Kafkasya/Orta Asya'da 100 milyonun üzerinde içerik üreticisi canlı yayın yaptı, +%77 | [Kaynak 2] |
| Hediyelerin yayıncı gelirindeki payı | ~%50 | [Kaynak 5, 6] |
| Hediye gelirleri (20–100 bin takipçi) | aylık 500–3.000 USD | [Kaynak 5] |
| Türkiye: TikTok jetonu başına fiyat | 0,37–0,43 TL; platform ~%50'sini alıyor | [Kaynak 8, 9, 10] |

**Ulaşılabilir pazar (aşağıdan yukarıya, tahmin):**

| Seviye | Varsayım | Büyüklük (tahmin) |
|---|---|---|
| TAM | TikTok/Instagram/YouTube/Twitch'te dünya genelinde aktif, gelir elde eden canlı yayıncılar | 10–20 milyon |
| SAM | TR/DE/EN dil alanında masaüstü yazılımla (OBS, LIVE Studio) ya da telefondan uzaktan kumandayla yayın yapan içerik üreticileri | 1–3 milyon |
| SOM (3. yıl) | SAM'ın %0,3–0,5'i ücretli kullanıcı olarak | 5.000–15.000 ücretli kullanıcı |

TAM rakamı, tek tek bölgelerdeki içerik üreticisi büyümesinden [Kaynak 2] ve erişim engellerinden (LIVE için 1.000 takipçi [Kaynak 9, 14]) türetilmiştir ve bilinçli olarak kabadır; 11. bölümdeki planlama SOM'a dayanıyor.

**Vizyonun komşu pazarları (2027–2029):**

| Pazar | Büyüklük | Kaynak | Hat |
|---|---|---|---|
| Yapay zekâ ile video üretimi ve kurgusu | 2026'da 3,67 milyar USD → 2036'da 24,89 milyar USD | [Kaynak 23] | Anlatı Filmi, Studio |
| Video kurgu yazılımı | 2025'te 2,52 milyar USD → 2026'da 2,68 milyar USD | [Kaynak 51] | Studio |
| CapCut (referans) | 736 milyon mobil MAU, 2025'te > 1 milyar USD uygulama içi ciro | [Kaynak 52] | Studio |
| Dil öğrenme uygulamaları (uygulama içi) | 2025'te 1,54 milyar USD, +%18,8 | [Kaynak 33] | Kelime-Resim |
| Dil öğrenme toplamı (yüz yüze dahil) | 2025'te ≈ 84 milyar USD | [Kaynak 34] | Kelime-Resim |
| Duolingo (referans) | 58,7 milyon günlük kullanıcı, 12,7 milyon ücretli kullanıcı (2026 2. çeyrek) | [Kaynak 32] | Kelime-Resim |
| Almanya uyum kursları | 307.000 yeni katılımcı, 17.204 kurs, 18.920 öğretmen (2025) | [Kaynak 36] | Kelime-Resim |
| Ailede farklı dil konuşan öğrenciler | 16 yaş altındakilerin %20,4'ü | [Kaynak 37] | Kelime-Resim |
| DigitalPakt 2.0 | beş yılda 5 milyar €, başlangıç 1.9.2026 | [Kaynak 40] | Kelime-Resim, Mekânlar |
| Almanya sesli kitap | 2025'te 374 milyon €, +%13 | [Kaynak 19] | Anlatı Filmi, Mekânlar |
| Almanya'da podcast dinleyicileri | haftalık 23,8 milyon | [Kaynak 20] | Anlatı Filmi, Mekânlar |
| Dünya genelinde akıllı gözlükler | 13,6 milyon cihaz, 5,1 milyar USD (2026) | [Kaynak 45] | Mekânlar |

Bu pazarlar TAM/SAM/SOM'a dahil edilmedi. Gelirleri 11.5 bölümünde ayrı olarak gösteriliyor; ayrıntılı değerlendirme `MARKTANALYSE.tr.md` dosyasının „Komşu pazarlar“ bölümünde.

---

## 7. Rekabet

| | Streamlabs / StreamElements Alerts | Sound Alerts | Voicemod | TikTok/Instagram'ın kendi efektleri | CapCut / editörler | **LiveFX** |
|---|---|---|---|---|---|---|
| **Tetikleyici** | İzleyici olayları (takip, bağış, Bits) | İzleyici ses satın alır (Bits) | Kısayol tuşları, tıklamalar | elle, canlı öncesi/sırasında | çekimden sonra | **İçerik üreticisinin sesi** + izleyici + telefon + API |
| **Sesle kontrol** | hayır | hayır | hayır | hayır | hayır | **evet, 3 dil otomatik** |
| **Çok dilli (TR)** | hayır | hayır | hayır | kısmen (filtreler) | evet (kurgu) | evet (85 TR tetikleyici) |
| **Hikâye/sahne modu** | hayır | hayır | hayır | hayır | hayır | evet (13 sahne, 12 döngü) |
| **Yerel / çevrimdışı çalışma** | bulut | bulut | yerel | uygulama | uygulama/bulut | **yerel, çevrimdışı çalışabilir** |
| **Açık API** | sınırlı | hayır | hayır | hayır | hayır | evet |
| **Hediye → efekt** | evet | evet | hayır | çıkartma | – | evet (webhook, kademeler) |
| **Fiyat** | 0 / Ultra aylık 27 USD / Ultra+ 79 USD [Kaynak 11, 12] | 0 + gelir payı | 0 / aylık ~10 USD [Kaynak 13] | 0 | 0 / abonelik | 0 / aylık 9,99 € |

Çevredeki diğer sağlayıcılar: tarayıcı tabanlı yayın/çoklu yayın için StreamYard (aylık ~35 USD) ve Restream (aylık ~16 USD) [Kaynak 12] – altyapı sunuyorlar, sesten canlı efekt değil.

**Konumlandırma:** LiveFX ne OBS'in ne de Streamlabs'in yerini alıyor; onların üzerinde bir katman olarak (tarayıcı kaynağı) duruyor ve alert'lere eksik tetikleyiciyi ekliyor: sesi. Platformlar için ise bir eklentinin sunamayacağı işlev – canlı kameraya yerel entegrasyon.

---

## 8. Benzersiz değer önerisi (USP)

1. **Her zaman orada olan tek tetikleyici: ses.** Tıklama ya da izleyici gerekmez – efektler söyleneni bir saniyeden kısa sürede takip eder.
2. **Şiveyi ve tarzı anlar.** Tolerans kademeleri, yayından öğrenme, üç okuma alternatifi, isteğe bağlı olarak anahtar kelime olmadan yapay zekâ ile anlama.
3. **Baştan çok dilli.** Otomatik algılamayla Türkçe, Almanca, İngilizce – en büyük paket İngilizce değil, Türkçe.
4. **Hikâye modu.** Sesli okuma, atmosferli animasyonlu bir sahneye dönüşür – kimsenin doldurmadığı bir niş pazar (yazarlar, ebeveynler, öğretmenler).
5. **Yerel, çevrimdışı, lisans riski yok.** Veriler içerik üreticisinde kalır, 38 kendi sesimiz, API lisanslı GIF sağlayıcıları.
6. **Açık.** İzleyici tetikleyicileri (sohbet, hediyeler), telefondan uzaktan kumanda, Stream Deck, harici konuşma tanıma, webhook'lar.
7. **Sahadan doğdu.** Kurucunun kendi canlı yayınlarında geliştirildi ve test edildi (ses kontrolü, yankı uyarısı, güvenli alanlar gerçek sorunlardan çıktı).

---

## 9. İş modeli

| Paket | Kimin için | İçerik | Fiyat |
|---|---|---|---|
| **Free** | tüm içerik üreticileri | Temel işlev, standart paketler, demo kaydı, telefondan uzaktan kumanda, topluluk desteği | 0 € |
| **Pro** | aktif yayıncılar | Yapay zekâ ile anlama dahil, tüm temalar ve sahneler, sınırsız izleyici tetikleyicisi, tetikleyicilerin bulut senkronizasyonu (opsiyonel), öncelikli destek, demo kliplerinde filigran yok | **aylık 9,99 €** ya da yıllık 79 € |
| **İçerik üreticisi paketleri** | Free ve Pro | Özenle seçilmiş meme/hikâye paketleri (oyun, aile, komedi, eğitim, canlı ticaret, yöresel şiveler), sonra 70/30 paylaşımlı topluluk pazar yeri | paket başına **2,99–4,99 €** |
| **Ajans lisansı** | İçerik üreticisi yönetimi, ağlar, eğitim kurumları | Çok kullanıcılı lisans, merkezi paket yönetimi, markaya uygun temalar, onboarding | kullanıcı sayısına göre [aylık 49–149 €] (tahmin) |
| **B2B platform lisansı** | Platformlar, yayın yazılımı sağlayıcıları, yayın kuruluşları | Tanıma, sahne ve paket teknolojisinin lisansı ya da white-label'ı; pilot → lisans; SDK | bireysel |
| **Çıkış (exit)** | ByteDance/TikTok, Meta, Google/YouTube, Logitech/Streamlabs, StreamElements | Teknolojinin, içeriğin ve ekibin devralınması | – |

**Neden işe yarıyor:** Marjinal maliyet neredeyse sıfır (yerel yazılım); yapay zekâ bileşeni yalnızca Pro kullanımında maliyet doğuruyor (sınıflandırma başına ≈ 0,004 $, dakikada 1–3 cümlede yayın saati başına 0,25–0,75 $ – proje ölçümü). Paketler yüksek marjlı saf içerik işi ve topluluğu bağlıyor. Ajans lisansı ek destek gerektirmeden ölçekleniyor; B2B lisansı asıl hedefe giden yol: yerel entegrasyon.

---

## 10. Pazara giriş stratejisi

**1. aşama – Türk topluluğu (1.–4. ay).** Türkçe konuşulan alanda lansman: kalıcı vitrin olarak kurucunun kendi yayınları, erişim hakkı olan ve öğrenme işlevi üzerinden geri bildirim döngüsüne katılan 10–20 içerik üreticisi elçi, Discord/Telegram grubu, haftalık paket yayınları. Gerçek yayınlardan klipler („Meme geldi, çünkü ‚yok artık‘ dedim“) pazarlamanın ta kendisi – ürün kendi reklam aracı.

**2. aşama – DE/EN (4.–9. ay).** Almanca konuşan içerik üreticileri (Twitch, YouTube, Instagram) ve İngilizce konuşan erken benimseyenler; ikinci kanat olarak kitap okuma ve eğitim yayınları (kitapçılar, kütüphaneler, öğretmen toplulukları). OBS eklenti dizinlerine, Streamlabs App Store'a ve Stream Deck Marketplace'e kayıt.

**3. aşama – Ortaklar ve platformlar (6.–12. ay).** İçerik üreticisi ortaklık programı (paketlerde gelir payı, isteğe bağlı „powered by LiveFX“), ajanslar, ilk B2B görüşmeleri. TikTok, Meta ve YouTube'un canlı yayın ekiplerine sunum ve demo.

**Kanallar**

| Kanal | Eylem | KPI |
|---|---|---|
| Kendi yayınlarımız | Kurucunun her yayınında LiveFX, Shorts/Reels olarak klipler | Haftalık klip, görüntülenme, indirme |
| İçerik üreticisi ortaklık programı | 10–20 TR/DE elçi, paketlerde gelir payı | Aktif ortaklar, referans kayıtları |
| LinkedIn ve basın | Tanıtım makalesi (DE/TR), içerik üreticisi ekonomisi/eğitim teknolojisi sektör basını, podcast'ler | Platform ekipleriyle temaslar, pilot talepleri |
| Topluluk | Discord/Telegram, paket yayınları, geri bildirim kanalı olarak öğrenme işlevi | Aktif üyeler, gönderilen tetikleyiciler |
| Pazar yerleri | OBS eklentileri, Streamlabs uygulamaları, Stream Deck | Kurulumlar |
| Eğitim | Çocuk Kitabı temalı kitap okuma demoları, öğretmen webinarları | Pilot sınıflar, eğitim paketleri |

---

## 11. Finansal plan (3 yıl) – Tahmin

Tüm rakamlar, aşağıdaki varsayımlara dayanan kurucu **tahminleridir**; henüz gelir yok. 1. yıl Pro aboneliğinin lansmanıyla başlıyor.

### 11.1 Varsayımlar

| Varsayım | Temkinli | Temel | İyimser |
|---|---|---|---|
| Kayıtlı kullanıcı (yıl sonu) Y1 / Y2 / Y3 | 8.000 / 30.000 / 80.000 | 20.000 / 80.000 / 250.000 | 40.000 / 180.000 / 500.000 |
| Free → Pro dönüşümü | %3 | %4 | %5 |
| Pro ARPU (net, aylık/yıllık karışım) | aylık 8,50 € | aylık 8,50 € | aylık 8,50 € |
| Yıllık paket satın alma (kullanıcı payı × ortalama 3,99 €'dan 1 paket) | %7 | %10 | %12 |
| Ajans lisansları (yıl sonu) Y1 / Y2 / Y3, aylık 49 €'dan | 2 / 8 / 25 | 3 / 15 / 40 | 5 / 30 / 80 |
| B2B pilot/lisans | 0 / 0 / 50 bin € | 0 / 50 / 150 bin € | 0 / 100 / 400 bin € |
| Ücretli Pro kullanıcılar yıllık ortalama olarak hesaplanır (Y1'de yıl sonu değerinin ≈ %50'si, Y2/Y3'te %75'i) | | | |

### 11.2 Gelir (bin €)

| | Temkinli | | | Temel | | | İyimser | | |
|---|---|---|---|---|---|---|---|---|---|
| | Y1 | Y2 | Y3 | Y1 | Y2 | Y3 | Y1 | Y2 | Y3 |
| Pro aboneliği | 12 | 69 | 184 | 41 | 245 | 765 | 102 | 689 | 1.913 |
| İçerik üreticisi paketleri | 2 | 8 | 22 | 8 | 32 | 100 | 19 | 86 | 240 |
| Ajans lisansı | 1 | 4 | 12 | 2 | 9 | 24 | 3 | 18 | 48 |
| B2B / pilot | 0 | 0 | 50 | 0 | 50 | 150 | 0 | 100 | 400 |
| **Toplam** | **15** | **81** | **268** | **51** | **336** | **1.039** | **124** | **893** | **2.601** |

### 11.3 Giderler (bin €) – temel senaryo

| Kalem | Y1 | Y2 | Y3 |
|---|---|---|---|
| Personel: mobil/web geliştirme | 75 | 160 | 240 |
| Personel: backend/ML (Y2'den itibaren), topluluk/destek (Y2'den itibaren) | 0 | 60 | 160 |
| Kurucu (maaş) | 30 | 48 | 60 |
| Serbest tasarım, ses, illüstrasyon (paketler) | 15 | 25 | 40 |
| Pazarlama, içerik üreticisi ortaklık programı, etkinlikler | 25 | 60 | 120 |
| Altyapı, yapay zekâ API'si (yalnızca Pro), mağaza ücretleri | 8 | 25 | 60 |
| Hukuk, marka, vergi, idari işler | 12 | 20 | 30 |
| **Toplam** | **165** | **398** | **710** |

Temkinli senaryoda daha küçük bir ekiple (giderler ≈ 120 / 230 / 330 bin €), iyimser senaryoda daha hızlı büyümeyle (≈ 190 / 520 / 1.100 bin €) planlanıyor.

### 11.4 Sonuç (bin €)

| Senaryo | Y1 | Y2 | Y3 | 3 yıl sonunda kümülatif |
|---|---|---|---|---|
| Temkinli | −105 | −149 | −62 | −316 |
| **Temel** | **−114** | **−62** | **+329** | **+153** |
| İyimser | −66 | +373 | +1.501 | +1.808 |

**Finansman ihtiyacı (tahmin):** 18–24 ay için 250–350 bin € tohum yatırım, temel senaryoyu tampon dahil 3. yıldaki başa baş noktasına kadar karşılıyor. Alternatif: bootstrapping – Pro aboneliği ve paketler yarı zamanlı bir geliştiriciyi finanse ediyor, büyüme buna göre yavaşlıyor (yaklaşık temkinli senaryo). Destek programları (EXIST, girişim bursları, medya/eğitim teknolojisi destekleri) paralel olarak inceleniyor.

### 11.5 2./3. yıldan itibaren ek gelir kaynakları (tahmin)

Vizyon (15. bölüm) 11.2–11.4 tablolarında **yer almıyor**. Bu tablo onu temel senaryoda ayrı olarak gösteriyor. Y1–Y3, 2027–2029'a karşılık geliyor; Pro kullanıcıları yukarıdaki temel senaryodan geliyor (ortalama 400 / 2.400 / 7.500). Tüm değerler bin € cinsinden tahmindir.

| Gelir kaynağı | Varsayım | Y1 2027 | Y2 2028 | Y3 2029 |
|---|---|---|---|---|
| Pro+ „Studio & Sahneler“ ek ücreti (14,99 €, Pro'nun üzerine net ≈ aylık 4,25 €) | Pro kullanıcılarının %10'u (3. çeyrekten itibaren) / %20'si / %25'i | 1 | 24 | 96 |
| Öne çıkanlar ve Kelime-Resim sayesinde ek dönüşüm | Kayıtlı kullanıcılarda +0,5 yüzde puanı, ARPU 8,50 € | 5 | 31 | 96 |
| Kelime-Resim Aile (4,99 €, net ≈ aylık 4,25 €) | ortalama 0 / 500 / 2.000 abonelik | 0 | 26 | 102 |
| Okul lisansları (yıllık ortalama 500 €) | 5 / 40 / 150 okul | 3 | 20 | 75 |
| Kurs lisansları (öğretmen başına yıllık 49 €) | 0 / 200 / 800 öğretmen | 0 | 10 | 39 |
| Dünya ve kelime paketleri | içerik üreticisi paketlerine ek olarak | 5 | 25 | 60 |
| Etkinlik ve sahne lisansları | 20 / 80 / 200 × 299 € + 100 / 400 / 1.000 günlük geçiş × 29 € | 9 | 36 | 89 |
| Yayınevi lisansları | başlık başına yıllık [2.000 €]'dan 2 / 10 / 30 başlık | 4 | 20 | 60 |
| **Ek gelir toplamı** | | **≈ 27** | **≈ 192** | **≈ 617** |
| Ek giderler (illüstrasyon, seslendirme kayıtları, didaktik, eğitim satışı, XR prototipi) | | 30 | 115 | 210 |
| **Vizyonun katkı payı** | | **≈ −3** | **≈ +77** | **≈ +407** |

**Temel senaryo sonucuna etkisi (tahmin):** −114 → ≈ −117 bin € (Y1), −62 → ≈ +15 bin € (Y2), +329 → ≈ +736 bin € (Y3). Böylece temel senaryoda başa baş noktası 3. yıldan 2. yıla çekiliyor. Temkinli senaryoda ek gelirin yaklaşık yarısı, iyimser senaryoda 1,5 ila 2 katı beklenmeli. SDK ve platform gelirleri ayrıca **sayılmıyor**; bunlar zaten B2B satırında (0 / 50 / 150 bin €) yer alıyor. Vizyon bunların olasılığını artırıyor ama ikiye katlamıyor. XR ve gözlük 0 € olarak hesaplandı. Finansman ihtiyacı (250–350 bin €) değişmiyor, çünkü vizyon ancak 2. yıldan itibaren kayda değer maliyet doğuruyor ve bunu ek gelirlerden karşılıyor.

---

## 12. Ekip ve ihtiyaç

**Kurucu [İsim].** Nöroçeşitlilik üzerine beş ciltlik bir çocuk kitabı serisinin yazarı (Türkçe, kitap fragmanlarıyla), canlı yayıncı, Alman-Türk, ürün vizyonu ve topluluk. LiveFX'i kendi yayınlarının hepsinde kullanıyor – hikâye moduyla kitap okuma kendi pratiğinden doğdu.

**Bugüne kadarki geliştirme.** Yapay zekâ desteğiyle; belgelenmiş mimari (şema, sözleşmeler, tasarım dokümanları), değişiklik günlüğü ve otomatik testlerle kuruldu – bir geliştirme ekibinin doğrudan devralabileceği bir durum.

**Aranan**

| Rol | Neden | Zaman |
|---|---|---|
| **Mobil geliştirici** (iOS/Android, WebView/PWA, sonra SDK) | OBS kullanmayan, telefon odaklı içerik üreticilerine ulaşmak; platform entegrasyonunun ön aşaması | hemen / 1. yıl |
| Backend/ML geliştirici | < 300 ms akışlı ASR, çevrimdışı modeller, standart olarak yapay zekâ ile anlama | 2. yıl |
| Topluluk ve ortaklık yönetimi (TR/DE) | İçerik üreticisi ortaklık programı, paketler, destek | 1.–2. yıl (yarı zamanlı → tam zamanlı) |
| **Ortaklıklar** | Platform pilotu (TikTok LIVE Studio, Instagram Live Producer, YouTube), yayın yazılımları, eğitim kurumları, yayınevleri | sürekli |
| Danışma kurulu | TR içerik üreticisi yöneticisi, bir platformun eski „Canlı“ ürün sorumlusu, eğitim teknolojisi | 1. yıl |
| Grafik/web geliştirici (Canvas, WebCodecs) | Anlatı Filmi render motoru, Studio dışa aktarımı (vizyon) | 1.–2. yıl |
| İllüstrasyon (çocuk kitabı tarzı), DE/TR/EN seslendirme sanatçıları, didaktik | Dünya paketleri, telaffuz kayıtları, Kelime-Resim'in alan denetimi (vizyon) | 2. yıl, serbest |

---

## 13. Riskler ve önlemler

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Platform işlevi kendisi geliştiriyor | orta | yüksek | Pilot/devralma ortağı olarak erken sunum; savunma hendeği olarak topluluk paketleri ve çok dillilik; hız; üçüncü taraf araçlar için standart olarak açık API |
| Konuşma tanıma şive, gürültü ve müzikte başarısız oluyor | orta | orta | Tolerans kademeleri, öğrenme işlevi, 3 okuma alternatifi, harici motorlar, çevrimdışı Whisper, ikinci mikrofon olarak telefon, elle kontrol için sahne pedi |
| OBS kullanmayan, yalnızca telefonla yayın yapanlar dışarıda kalıyor | yüksek | yüksek | OBS'siz demo kaydı, PWA uzaktan kumanda, ilk işe alım olarak mobil geliştirici, hedef olarak platform entegrasyonu |
| Meme/GIF/ses telif hakları | düşük–orta | orta | Kendi sentetik seslerimiz, API lisanslı GIF sağlayıcıları (Tenor/Giphy), atıf, kullanım koşullarıyla topluluk yüklemesi |
| Tarayıcı konuşma tanımaya (Google hizmeti) bağımlılık | orta | orta | Çevrimdışı Whisper, harici API, takılabilir motor arayüzü |
| Çok küçük içerik üreticilerinde düşük ödeme isteği | orta | orta | Erişim için Free paketi, düşük eşikli satın alma olarak paketler, ikinci ayak olarak ajans ve B2B gelirleri |
| Tek kişi riski | yüksek | yüksek | Dokümantasyon ve testler, erken işe alım, danışma kurulu, ortaklık programı |
| Platform politikaları (yayın anahtarı erişimi, sohbet API'leri, kotalar) | orta | orta | Platform başına birden fazla yol (LIVE Studio, yayın anahtarı, üçüncü taraf araçlar üzerinden webhook), YouTube kota yönetimi, yedek olarak telefon |
| Veri koruma / çocukların korunması (aile ve eğitim segmenti) | düşük | yüksek | Bulut zorunluluğu olmadan yerel işleme, hesap gerekmez, izleme yapmayan Çocuk Kitabı teması |
| Vizyon küçük ekibi dağıtıyor | orta | yüksek | Gelire yakınlığa göre sıralama (önce öne çıkanlar ve Kelime-Resim), çeyrek başına kapılar, XR yalnızca vitrin |
| Dil öğrenme uygulamalarında ve video editörlerinde güçlü rekabet | yüksek | orta | Evrensel bir uygulama olarak değil; ses → resim, TR/DE/EN, sesli okuma ve yerel işleme üzerinden öne çıkmak |
| Eğitim sektöründe uzun satın alma süreçleri | yüksek | orta | İlk yılı aile aboneliği ve yayınevleri taşıyor; DigitalPakt bütçeleri ve medya merkezleri üzerinden okul lisansı |

---

## 14. Kilometre taşları

### 14.1 Önümüzdeki 12 ay

| Çeyrek | Ürün | Pazar | Organizasyon |
|---|---|---|---|
| **2026 4. çeyrek** | Açılış sayfası ve indirme paketi (Windows/Mac), kurulum asistanı, standart pakette canlı ticaret tetikleyicileri | TR topluluğunda lansman, 10–20 içerik üreticisi elçi, LinkedIn makalesi DE/TR, tanıtım videosu | Marka tescili, tohum yatırım görüşmeleri, danışma kuruluna davet |
| **2027 1. çeyrek** | Pro aboneliği yayında (ödeme), ilk içerik üreticisi paketleri, topluluk paket yüklemesi (beta), < 300 ms akışlı ASR testi | DE/EN lansmanı, pazar yeri kayıtları (OBS, Streamlabs, Stream Deck), [Sayı] öğretmen/yazarla kitap okuma pilotu | Mobil geliştirici işe alındı |
| **2027 2. çeyrek** | Mobil uygulama (uzaktan kumanda + mikrofon, mağazalar), eğitim paketi, ajans lisansı (çok kullanıcılı) | İçerik üreticisi ortaklık programı resmî olarak başladı, ilk ajanslar, eğitim teknolojisi/içerik üreticisi ekonomisi basını | Tohum yatırım tamamlandı ya da bootstrapping yolu teyit edildi |
| **2027 3. çeyrek** | Pazar yeri açık, Pro'da standart olarak yapay zekâ ile anlama, SDK prototipi | Platform pilotu başladı (hedef: bir ortak), [Sayı] kayıtlı kullanıcı, [Sayı] Pro aboneliği | Topluluk/destek rolü dolduruldu |

Ölçütler: kayıtlı kullanıcılar, haftalık aktif yayıncılar, Free → Pro dönüşümü, paket geliri, ortak içerik üreticisi sayısı, devam toplantısı getiren platform görüşmeleri.

### 14.2 Vizyon 2027–2029

Sıralama gelire yakınlığa göre: önce öne çıkanlar (Studio) ve Kelime-Resim, çekirdek olarak Anlatı Filmi, sahne üzerinden Mekânlar, XR daha sonra. 2027 çeyrekleri 14.1 ile uyumlu.

| Dönem | Ürün | Pazar / satış | Kapı (ölçüt) |
|---|---|---|---|
| 2026 4. çeyrek | Dil öğrenme ve canlı hikâye prototipleri, zaman çizelgesi formatı LTF v1, Vizyon fragmanı DE/TR/EN | „Vizyon“ sunum slaytları, LinkedIn gönderisi | Prototipler çevrimdışı 60 fps |
| 2027 1. çeyrek | Zaman çizelgesi kaydı ve „Öne çıkanları bul“ · 300 kelimeli ve okuma destekli Kelime-Resim | Pro aboneliği yayında, 20 beta içerik üreticisi TR/DE | Öne çıkan klibi paylaşılan yayınların oranı |
| 2027 2. çeyrek | Anlatı Filmi DE (sahne yönetmeni, karakterler, kamera, bant/bölünmüş ekran) · sahne ve sınıf ön ayarları | Etkinlik lisansı, [Sayı] kurs/sınıfta Kelime-Resim pilotu | Anlatı Filmi'yle ve onsuz izlenme süresi |
| 2027 3. çeyrek | Anlatı Filmi TR/EN, yapay zekâ sahneleri, 3 dünya paketi · dosya içe aktarma ve otomatik efektler | **Pro+ yayında**, yayınevi pilotu (kendi seri) | Pro → Pro+ yükseltme oranı |
| 2027 4. çeyrek | Zaman çizelgesi editörü ve MP4 dışa aktarımı · Companion „resimli sesli kitap“ ve telefonda AR · Tekrar et | Okul lisansı, medya merkezlerinde listelenme | [Sayı] ödeme yapan okul |
| 2028 | WebXR ve gözlük prototipi · toplu işleme/ajans · paket pazar yeri ve yayınevleri için dünya editörü · **Scene-SDK v1** (4. çeyrek) | Kelime-Resim aile aboneliği, platform sunumu „Canlı → Klip“, Kelime-Resim pilotunun değerlendirmesi | bir SDK pilot ortağı, üçüncü taraf paketleri |
| 2029 | Anlatı Filmi 2.0 (karakterler etkileşime giriyor, isteğe bağlı WebGPU derinliği) · topluluk üzerinden yeni diller · eğitim sürümü | 10+ başlıklı yayınevi programı, XR/gözlük kararı (2. çeyrek), platform pilotu ya da çıkış görüşmesi (4. çeyrek) | imzalanmış platform pilotu |

Ayrıntılı çeyrek planı `VISION.tr.md` dosyasının 10. bölümünde.

---

## 15. Gelecek: Generative Scene Engine, dil öğrenme, otomatik kurgu, VR/AR

> Bu bölüm planlanan işlevleri (**Vizyon**) anlatıyor. Ayrıntılı vizyon dokümanı `VISION.tr.md`, prototipler `prototypes/` klasöründe, Vizyon fragmanı `video/LiveFX_Vision_tr_16x9.mp4` ve `video/LiveFX_Vision_tr_9x16.mp4` (diğer diller: `video/LiveFX_Vision_<de|tr|en>_<16x9|9x16>.mp4`).

### 15.1 Temel fikir: üretmek yerine çizmek

LiveFX bir meme katmanından **konuşulan her şeyin görsel diline** dönüşüyor: Birinin anlattığı, sesli okuduğu ya da derste söylediği her şey aynı saniyede kesintisiz bir sahne, telaffuzlu bir kelime kartı ya da kurgusu bitmiş bir klip olarak beliriyor. Üretken video yapay zekâsı her pikseli veri merkezinde hesaplıyor, liste fiyatıyla saniyesi 0,05–0,75 USD [Kaynak 24, 25], yani saatlik eşlik videosu başına 180–2.700 USD tutuyor ve canlı çalışamıyor. LiveFX bir cümleyi 200–500 baytlık bir durum farkına çeviriyor ve sahneyi tarayıcıda **çiziyor**: yapay zekâsız 0 €, isteğe bağlı metin yapay zekâsıyla saatte 0,25–0,75 USD (proje ölçümü), yani 240 ile 10.000 kattan fazla daha ucuz. Sonuç bilinçli olarak stilize bir resimli kitap dünyası, fotogerçekçi bir video değil.

```
Ses/Dosya ─► Transkript ─► Anlama ──────► Zaman çizelgesi (LTF) ─► Ekranlar
             (yerel)       eşleştirici,   tüm hatlar için          Yayın · Sınıf · Sahne
                           sahne          tek JSON formatı         Telefon/AR · Gözlük
                           yönetmeni,                              Studio dışa aktarım (MP4)
                           ops. yapay zekâ
```

Dört hattın tamamı tek bir JSON formatını, yani **LiveFX zaman çizelgesini (LTF v1)** ve mevcut modülleri (konuşma tanıma, eşleştirici, efekt motoru, mikser, telefondan uzaktan kumanda) paylaşıyor. Performans bütçesi: tek canvas, ≤ 1.200 parçacık, dünya durumu ≤ 1 KB, tümleşik grafikte hedef 60 fps. WebGPU 2026'dan beri tüm büyük tarayıcılarda var [Kaynak 27] ve yalnızca isteğe bağlı olarak kullanılıyor.

### 15.2 Dört hat

| Hat | Ne oluşuyor | Teknik | Pazar | Gelir (tahmin) |
|---|---|---|---|---|
| **A · Anlatı Filmi** (Generative Scene Engine) | Biri anlatırken ya da sesli okurken canlı görüntünün altında ya da yanında mekân, zaman, hava, karakterler, eylem ve duygudan akan animasyonlu bir film oluşuyor | Sahne yönetmeni cümleleri durum farklarına çeviriyor; canvas deterministik çiziyor; dil başına 300–500 kayıtlık sözlük; yapay zekâ yalnızca isteğe bağlı | Almanya sesli kitap 374 milyon € [Kaynak 19]; 23,8 milyon podcast dinleyicisi [Kaynak 20]; yapay zekâ videosu 3,67 milyar USD [Kaynak 23] | Pro, Pro+ 14,99 €, dünya paketleri, yayınevi lisansı, Scene-SDK |
| **B · Kelime-Resim** (dil öğrenme, okuma desteği) | Söylenen kelime → resim + hedef dildeki kelime + telaffuz; ya da kendi dilinde okuma desteği; notsuz tekrar et | Tablo araması, `speechSynthesis` ile sistem sesleri [Kaynak 29], yedek Piper-TTS [Kaynak 44]; çevrimdışı, hesapsız | Dil öğrenme uygulamaları 1,54 milyar USD [Kaynak 33]; 307.000 yeni uyum kursu katılımcısı [Kaynak 36]; DigitalPakt 2.0 [Kaynak 40] | Aile aylık 4,99 €, okul yıllık 300–800 €, kurs öğretmen başına 49 €, kelime paketleri |
| **C · Mekânlar** (sahne, sınıf, sesli kitap, AR/VR, gözlük) | Aynı zaman çizelgesi LED ekranda, projeksiyonda, telefonda (AR, „resimli sesli kitap“), VR başlığında ve ekranlı gözlükte | Yalnızca yeni çıkış hedefleri; konuşma tanımasız Companion modu; DOM katmanlı WebXR [Kaynak 47, 48] | Akıllı gözlükler 13,6 milyon cihaz [Kaynak 45]; tonies 630 milyon € [Kaynak 50]; fiyat çıpası olarak VJ yazılımları [Kaynak 49] | Etkinlik günlük 19–49 € ya da yıllık 299 €, yayınevi lisansı; XR 0 € olarak hesaplandı |
| **D · Studio** (canlı kurgu, otomatik kurgu) | Yayından öne çıkanlar; hazır video → transkript → efektler, meme'ler, sahneler, kesmeler otomatik → dışa aktarım | Tarayıcıda Whisper [Kaynak 60], donanım kodlayıcılı WebCodecs ve Mediabunny [Kaynak 57, 58, 59]; yükleme yok | Video kurgu 2,68 milyar USD [Kaynak 51]; CapCut 736 milyon MAU [Kaynak 52]; fiyat çıpası olarak OpusClip, Submagic, Descript [Kaynak 53, 54, 55] | Filigranlı Free, Pro, Pro+ „Studio & Sahneler“, ajans, white-label |

### 15.3 Ayrıntılı olarak dil öğrenme

Bir çocuk „Apfel“ diyor – 🍎 beliriyor, altında „elma“, küçük harflerle renkli artikeli ve heceleriyle „der Apfel“; bir ses „elma“ diye okuyor. Öğretmen yalnızca „Konuştuğum dil“, „Göster“ ve modu (Çeviri, Okuma desteği, Tekrar et) seçiyor. Hedef gruplar aileler, ilkokullar (16 yaş altı öğrencilerin %20,4'ü evde ağırlıklı olarak başka bir dil konuşuyor [Kaynak 37]; dördüncü sınıf öğrencilerinin %25'i okumada asgari standardın altında [Kaynak 39]), DaZ ve uyum kursları ile miras dili olarak Türkçe (Türkiye kökenli göç geçmişine sahip 2,65 milyon kişi [Kaynak 38]). Okuma desteği, kurucunun nöroçeşitlilik kitaplarıyla bağlantılı. Fiyat çıpası okul başına yıllık 250–700 € ile ANTON okul lisansı [Kaynak 41]; ücretsiz rakipler Microsoft Reading Coach [Kaynak 42] ve Google Read Along [Kaynak 43]. Okul profili okullarda cihaz üzerinde konuşma tanımayı (`processLocally`, Chrome 139+ [Kaynak 28]) ya da çevrimdışı Whisper'ı zorunlu kılıyor.

### 15.4 Ayrıntılı olarak otomatik kurgu

LiveFX Studio'nun iki kapısı var: **Canlı → Öne çıkanlar** (yayından sonra en çok meme, hediye ve sohbet mesajının olduğu yerlerden 3–5 kısa klip) ve **Dosyayı bırak** (bir MP4'ü pencereye sürükle; LiveFX yerel olarak dinliyor, efektleri, sahneleri, zoom'ları ve kesmeleri taşınabilir çipler olarak öneriyor ve donanım kodlayıcısıyla dışa aktarıyor). Önizleme efektleri canlı çiziyor, render yalnızca dışa aktarımda bir kez yapılıyor. Yükleme ve bulutta dönüştürme olmadığı için video başına marjinal maliyet sıfır, dakika kotası yok. LiveFX, CapCut'a karşı evrensel bir editör olarak değil; ses → efekt, hikâye sahneleri, TR/DE/EN ve yerel işleme üzerinden yarışıyor. Canva Şubat 2026'da Cavalry ve MangoAI'yi satın aldı [Kaynak 56] – editör sağlayıcılarının tam da bu tür yapı taşlarını satın aldığının bir işareti.

### 15.5 VR/AR ve diğer uygulama alanları

- **Sahne ve etkinlikler** (bugün kullanılabilir): „Alkış!“ → LED ekranda konfeti; reji telefon.
- **Sınıf:** Projeksiyonda Anlatı Filmi, tabletlerde Kelime-Resim.
- **Resimli sesli kitap ve podcast:** Companion modu, hazır bir zaman çizelgesini sesle senkron oynatıyor; cihazda konuşma tanıma hiç gerekmiyor.
- **Telefonda AR** (tüm telefonlar, iPhone dahil): Hikâyedeki ejderha mutfak masasının üstünde duruyor; klipler paylaşılıyor ve erişim motoru işlevi görüyor.
- **VR ve ekranlı gözlükler:** Kubbe olarak sahne gökyüzü, görüş alanında Kelime-Resim kartı; Meta, Ray-Ban Display'i Mayıs 2026'da web uygulamalarına açtı [Kaynak 46]. 2029'a kadar vitrin ve ortaklık konusu, **gelir hattı değil**.

### 15.6 Fiyat yapısı (tahmin)

| Paket | Fiyat | Vizyonla gelen yenilik |
|---|---|---|
| Free | 0 € | Tek dünyalı Anlatı Filmi, 200 kelimeli Kelime-Resim, filigranlı 3 öne çıkan klip |
| Pro | aylık 9,99 € | tüm temel dünyalar, bant ve bölünmüş ekran, tüm Kelime-Resim listeleri, filigransız öne çıkanlar, canlı editör |
| Pro+ „Studio & Sahneler“ | aylık 14,99 € | Yapay zekâ sahneleri, dosyadan otomatik kurgu, MP4 dışa aktarımı, toplu işleme, sesli kitap görselleştirici |
| Kelime-Resim Aile | aylık 4,99 € | Yayın işlevleri olmadan dil öğrenme ve okuma desteği |
| Paketler | 2,99–4,99 € | Dünya, kelime ve stil paketleri |
| Lisanslar | Okul yıllık 300–800 € · Kurs öğretmen başına yıllık 49 € · Etkinlik günlük 19–49 € ya da yıllık 299 € · Yayınevi başlık başına yıllık [2.000 €] (tahmin, kurucu tarafından kontrol edilecek) · SDK anlaşmaya göre | Eğitim, sahne, yayınevleri, platformlar |

Bunlardan elde edilen gelirler 11.5 bölümünde, kilometre taşları 14.2 bölümünde ayrı olarak gösteriliyor.

### 15.7 Bu neden platformlar için önemli

Platformlar bugün konuşmayı gerçek zamanlı ve ücretsiz olarak altyazıya çeviriyor. LiveFX aynı işlem yüküyle konuşmayı resimlere, sahnelere, kelime kartlarına ve kurguya çeviriyor. Böylece bir platform, ek GPU sunucusu olmadan her canlı yayıncıya „prodüksiyonlu“ bir yayın sunabilir – yalnızca birkaç bölgede 2025'te TikTok'ta canlı yayın yapan 100 milyonun üzerinde içerik üreticisi düşünüldüğünde [Kaynak 2]. İzlenme süresinin her dakikası hediyelere yansıyor [Kaynak 5, 8] ve her yayının zaman çizelgesinden kısa videolar kendiliğinden çıkıyor: Canlı yayın kısa videonun kaynağına dönüşüyor.

### 15.8 Vizyonun riskleri

| Risk | Önlem |
|---|---|
| „Reklam filmindeki gibi yapay zekâ videosu“ beklentisi | animasyonlu resimli kitap olarak konumlandırmak, tarzı güce dönüştürmek |
| Anlatı Filmi'nde çok anlamlılık ve mecazlar | Negatif liste, bağlam kuralları, „kesin“ tepki, „Geri“ düğmesi |
| Sistem sesleri eksik (ör. eski cihazlarda Türkçe) | Kendi kendine test, seslendirilmiş kayıtlar, Piper-TTS |
| Uzun ya da 4K videolarda tarayıcı sınırları | Süre sınırı, önce masaüstü, yedek olarak WebM |
| Dışa aktarımda telif hakkı | yalnızca kendi seslerimiz, lisanslı GIF'ler, dışa aktarım penceresinde uyarı |
| XR ve gözlüklerde küçük donanım tabanı | yalnızca vitrin, talep kanıtlanırsa 2029'da karar |
| Öğrenmedeki etkiyi abartmak | „kelime öğrenmeyi destekler“, eğitim teknolojisi danışma kurulunun alan denetimi |

---

## 16. Ek

### 16.1 Kaynaklar

1. market.us – Live Streaming Market Report (pazar büyüklüğü, CAGR %26,7): https://market.us/report/live-streaming-market/
2. Gyre – Live Streaming Statistics (pazar büyüklüğü, TikTok LIVE içerik üreticisi büyümesi): https://gyre.pro/blog/live-streaming-statistics-insights-from-platforms-to-profit
3. datarefs – Creator Economy Statistics (216 milyar USD, canlı yayın payı ~%14): https://www.datarefs.com/statistics/social-media/creator-economy/
4. New Market Pitch – Creator Economy Market Size (260 milyar USD, CAGR %22): https://newmarketpitch.com/blogs/news/creator-economy-market-size
5. InfluencerFee – TikTok LIVE Gifting Revenue Guide (hediye payı, aylık 500–3.000 USD, içerik üreticisi payı %50): https://influencerfee.com/blog/tiktok-live-gifting-revenue-guide/
6. Muvi – How to make money on TikTok LIVE (hediye payı ~%50): https://www.muvi.com/blogs/how-to-make-money-on-tiktok-live/
7. TTS Vibes – TikTok LIVE Gift Conversion Rate by Viewer: https://insights.ttsvibes.com/tiktok-live-gift-conversion-rate-by-viewer
8. Shopify TR – TikTok ne kadar ödeme yapıyor (jeton fiyatları, komisyon): https://www.shopify.com/tr/blog/tiktok-ne-kadar-odeme-yapiyor
9. Juntire – TikTok canlı yayın para kazanma 2026 (koşullar, jeton fiyatları): https://juntire.com/blog/tiktok-canli-yayin-para-kazanma-2026
10. Milliyet – TikTok jeton ve hediye fiyatları 2025: https://www.milliyet.com.tr/teknoloji/sosyalmedya/tiktok-jeton-ve-hediye-fiyatlari-2025-tiktok-puan-hesaplamasi-nasil-yapilir-6659460
11. Capterra – Streamlabs (fiyatlar): https://www.capterra.com/p/228751/Streamlabs/
12. CreatorStackClub – Streamlabs, StreamYard, Restream (fiyatlar): https://www.creatorstackclub.com/software/streamlabs
13. ToolChase – Voicemod (fiyatlar, işlevler): https://toolchase.com/tool/voicemod/
14. BIGVU – How to get a TikTok stream key (1.000 takipçi, 18+): https://bigvu.tv/blog/how-to-get-a-tiktok-stream-key/
15. SMMNut – TikTok LIVE Studio Guide 2026: https://smmnut.com/blog/tiktok-live-studio-guide-2026/
16. OBS Versions – OBS TikTok Live Streaming Guide: https://obs-versions.com/blog/obs-tiktok-live-streaming-guide
17. Instagram – Instagram Live Producer (OBS ile masaüstünden yayın): https://about.instagram.com/blog/tips-and-tricks/instagram-live-producer
18. StreamYard – Streaming software for Instagram Live: https://streamyard.com/blog/streaming-software-for-instagram-live
19. Börsenverein – Buchmarkt kompakt 2025/2026 (sesli kitap 374 milyon €, +%13): https://www.boersenverein.de/fileadmin/bundesverband/dokumente/presse/digitale_pressemappen/WIPK/Buchmarkt_kompakt_2025_2026_Zahlenuebersicht.pdf
20. ARD/ZDF-Medienstudie 2025 (podcast %34, 23,8 milyon): https://www.media-perspektiven.de/fileadmin/user_upload/media-perspektiven/pdf/2025/MP_30_2025_ARD_ZDF-Medienstudie_Zuwachs_bei_Podcastnutzung_nach_Jahren_der_Stagnation.pdf
21. TechCrunch – YouTube'un aylık 1 milyarı aşan podcast izleyicisi: https://techcrunch.com/2025/02/26/youtube-surpasses-1-billion-monthly-podcast-viewers/
22. Stiftung Lesen – Vorlesemonitor 2024 (sesli okuma araştırması): https://www.stiftunglesen.de/ueber-uns/newsroom/pressemitteilung-detail/vorlesemonitor-2024-jedem-dritten-kind-fehlen-praegende-vorleseerfahrungen
23. Meticulous Research – Yapay zekâ ile video üretimi ve kurgusu 2026–2036: https://www.meticulousresearch.com/product/ai-video-generation-and-editing-software-market-forecast-6359
24. Google – Gemini API Pricing (Veo 3.1 Lite saniyesi 0,05 USD): https://ai.google.dev/gemini-api/docs/pricing
25. Veo 3 API Pricing 2026 (saniyesi 0,75 USD'ye kadar): https://www.veo3ai.io/blog/veo-3-api-pricing-2026
26. CNBC – Synthesia: değerleme ve ARR: https://www.cnbc.com/2026/01/26/nvidia-alphabet-vc-arms-back-synthesia.html
27. web.dev – WebGPU tüm büyük tarayıcılarda: https://web.dev/blog/webgpu-supported-major-browsers
28. Chrome 139 – Cihaz üzerinde konuşma tanıma (`processLocally`): https://developer.chrome.com/blog/new-in-chrome-139
29. MDN – SpeechSynthesis: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
30. Google Noto Emoji (Apache 2.0): https://github.com/googlefonts/noto-emoji
31. OpenMoji FAQ (CC BY-SA 4.0): https://openmoji.org/faq/
32. Duolingo – 2026 2. çeyrek hissedar mektubu (SEC): https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm
33. Business of Apps – Language Learning App Market: https://www.businessofapps.com/data/language-learning-app-market/
34. Mordor Intelligence – Language Learning Market: https://www.mordorintelligence.com/industry-reports/language-learning-market
35. GlobeNewswire – Lingokids 120 milyon USD: https://www.globenewswire.com/news-release/2025/09/18/3152590/0/en/Lingokids-raises-120M-in-funding-to-expand-its-position-as-the-1-interactive-app-for-kids.html
36. BAMF – 2025 uyum kursu rakamları: https://www.bamf.de/DE/Themen/Statistik/Integrationskurszahlen/integrationskurszahlen-node.html
37. bpb – Ailede farklı dil konuşan öğrenciler: https://www.bpb.de/themen/bildung/dossier-bildung/519697/schueler-innen-mit-einer-anderen-familiensprache-als-deutsch/
38. Destatis – Göç geçmişi 2025: https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/04/PD26_128_125.html
39. Deutsches Schulportal – IGLU okuma becerisi: https://deutsches-schulportal.de/bildungswesen/iglu-studie-lesekompetenz-der-viertklaessler-verschlechtert-sich-deutlich/
40. Deutsches Schulportal – DigitalPakt 2.0: https://deutsches-schulportal.de/bildungswesen/was-hat-der-digitalpakt-schule-bislang-gebracht/
41. ANTON – Okul lisansı sipariş belgeleri: https://files.anton.app/files/ANTON-Schullizenz-Bestellunterlagen-DE.pdf
42. Microsoft – Reading Coach: https://techcommunity.microsoft.com/blog/educationblog/reading-coach-the-ai-powered-fluency-practice-tool-is-now-generally-available-in/4291953
43. Google – Read Along: https://readalong.google/
44. Piper TTS: https://github.com/rhasspy/piper
45. IDC – Akıllı gözlükler 2026: https://www.idc.com/resource-center/blog/smart-glasses-surge-the-xr-market-is-rewriting-its-own-rules/
46. gHacks – Meta Ray-Ban Display web uygulamalarına açıldı: https://www.ghacks.net/2026/05/18/meta-opens-ray-ban-display-glasses-to-third-party-developers-through-wearables-toolkit/
47. W3C Immersive Web – WebXR DOM Overlays: https://immersive-web.github.io/dom-overlays/
48. MDN – WebXR Device API: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
49. Resolume – Avenue/Arena fiyatları: https://www.resolume.com/software/avenue-arena
50. Musikwoche – tonies 2025 cirosu: https://musikwoche.de/recorded-publishing/tonies-steigerte-umsatz-und-gewinn-a2f6b99ac4f426723ff1690ecb65e839/
51. The Business Research Company – Video Editing Software: https://www.thebusinessresearchcompany.com/report/video-editing-software-global-market-report
52. Expanded Ramblings – CapCut istatistikleri (Sensor Tower): https://expandedramblings.com/index.php/capcut/
53. Sacra – OpusClip: https://sacra.com/c/opusclip/
54. ngram – OpusClip vs. Submagic (fiyatlar): https://www.ngram.com/blog/opus-clip-vs-submagic
55. Castmagic – Descript Pricing: https://www.castmagic.io/blog/descript-pricing
56. CNBC – Canva, Cavalry ve MangoAI'yi satın aldı: https://www.cnbc.com/2026/02/23/canva-acquires-cavalry-for-motion-graphics-and-mangoai-for-video-ads.html
57. caniuse – WebCodecs: https://caniuse.com/webcodecs
58. WebKit – Features in Safari 26.0 (AudioEncoder): https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
59. Mediabunny: https://mediabunny.dev/
60. Xenova – whisper-web (WebGPU): https://github.com/xenova/whisper-web

1–18 numaralı kaynaklara 30.09.2026'da, 19–60 numaralı kaynaklara 03.10.2026'da erişildi. Ürün bilgileri (tetikleyici, sahne ve ses sayıları, gecikme, yapay zekâ maliyetleri) projenin kendisinden alınmıştır (`CHANGELOG.md`, `README.md`, `docs/`).

### 16.2 Ek dokümanlar

- `VISION.tr.md` – Vizyon 2027–2029 (Anlatı Filmi, Kelime-Resim, Mekânlar, Studio)
- `prototypes/sprachlernen.html`, `prototypes/live-story.html` – vizyon prototipleri
- `video/LiveFX_Vision_tr_16x9.mp4`, `video/LiveFX_Vision_tr_9x16.mp4` – Vizyon fragmanı (Türkçe; DE/EN sürümleri `video/LiveFX_Vision_*.mp4`)
- `video/LiveFX_Trailer_tr_16x9.mp4`, `video/LiveFX_Trailer_tr_9x16.mp4` – ürün fragmanı (Türkçe)
- `MARKTANALYSE.tr.md` – ayrıntılı pazar analizi
- `QUELLEN.tr.md` – numaralı kaynak listesi
- `LiveFX_Pitch_TR.pptx` (Almanca `LiveFX_Pitch.pptx`, İngilizce `LiveFX_Pitch_EN.pptx`), metin şablonu `PITCH-DECK.md` – yatırımcı sunumu
- `LINKEDIN.md` – tanıtım makalesi DE/TR
- `../README.md`, `../CHANGELOG.md`, `../docs/` – ürün dokümantasyonu
