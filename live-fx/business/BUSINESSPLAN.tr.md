# LiveFX – İş Planı

**Dinleyen canlı yayınlar.** Gerçek zamanlı meme'ler, sesler ve animasyonlu sahneler – içerik üreticisinin sesiyle tetiklenir.

Tarih: Ekim 2026 · Ürün sürümü: 2.1 · Gizli
Kurucu & Mucit, Genel Müdür: Tuncay Sancak · Investor Relations: Gönül Demet · İletişim: [E-posta] · [Şehir]

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
| **Durum** | Sürüm 2.1, çalışır durumda: beş pakette 238 hazır tetikleyici ve metin çıkartma paketleri, 143 ücretsiz çıkartma (MIT lisansı), 13 sahne, 38 ses, performans modu (kare süresi −%63 ile −%69 arası), güvenli GIF arama (içerik filtreli KLIPY/GIPHY), otomatik testler; kurucunun kendi canlı yayınlarında kullanılıyor. |
| **Pazar** | Dünya genelinde canlı yayın 2026: 97–157 milyar USD [Kaynak 1, 2]; içerik üreticisi ekonomisi ~216–260 milyar USD [Kaynak 3, 4]; hediyeler TikTok LIVE yayıncılarının gelirinin ≈ %50'si [Kaynak 5, 6]. |
| **İş modeli** | Free + Pro aboneliği (aylık 9,99 €), içerik üreticisi paketleri (2,99–4,99 €), ajans lisansı, B2B platform lisansı; TikTok/Meta/YouTube'a stratejik çıkış (exit). |
| **Pazara giriş** | Önce Türkçe konuşan içerik üreticisi topluluğu, sonra DE/EN; vitrin olarak kendi yayınlarımız; içerik üreticisi ortaklık programı; LinkedIn ve basın. |
| **İhtiyaç** | 18 ay için **250.000 € ön tohum (pre-seed) yatırım** (kapanış Ocak 2027): 3. aydan itibaren mobil/web geliştiricili yalın ekip, pazara giriş, ilk vizyon hattı Kelime-Resim, hukuk ve marka. Nakit ömrü: hiç gelir olmasa bile 18 ay. Anlatı Filmi, Studio ve Mekânlar 2. kapıdan (18. ay) sonra yaklaşık 350.000 €'luk bir tohum turuyla geliyor. Ayrıca platform ortaklıkları ve pilot ortaklar (bölüm 11.6). |
| **Finansal tablo** | Temel senaryo: gelir 51 bin € (2027) → 336 bin € (2028) → 3,15 milyon € (2031); FAVÖK 2028'den itibaren pozitif (41 bin €), 2031'de 1,66 milyon €; ilk 24 ayda nakit hiçbir zaman 125 bin €'nun altına düşmüyor (bölüm 11, `LiveFX_Finanzmodell.xlsx`). |
| **Değerleme** | Kurucunun teklifi: %10,0 karşılığında 250.000 € – yatırım öncesi değer 2,25 milyon €, yatırım sonrası değer 2,5 milyon €; dört referans yönteminin hepsinin altında (Berkus 2,35 milyon €, Scorecard 2,95 milyon €, VC yöntemi 2,43 milyon €, Risk Faktörü Toplamı 3,0 milyon €; ağırlıklı 2,71 milyon €). Alternatif olarak 2,25 milyon € tavanlı ve %20 iskontolu SAFE/dönüştürülebilir kredi. Müzakere temeli; vergi/hukuk danışmanıyla kontrol edin (bölüm 11.6). |

Talebimiz: %10,0 karşılığında 250.000 € ön tohum yatırım (yatırım öncesi değer 2,25 milyon €, bölüm 11.6) ve bir platformla (TikTok LIVE Studio, Instagram Live Producer, YouTube Live) ya da bir içerik üreticisi aracı sağlayıcısıyla pilot ortaklık – alternatif olarak teknoloji ve ekibin devralınması.

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

## 3. Ürün (Sürüm 2.1)

### 3.1 Tek cümleyle

İçerik üreticisi konuşuyor – LiveFX dinliyor. „Krass“, „oh nein“, „alkış“, „yok artık“ ya da „bruh“ dediğinde bir saniyeden kısa sürede yayında uygun meme beliriyor ve uygun ses çalıyor. Kitap okuduğunda – „yağmur yağıyordu“, „gece“, „ejderha“ – katman, atmosfer sesli animasyonlu bir sahneye dönüşüyor.

```
Mikrofon ─► Konuşma tanıma (oto DE/TR/EN) ─► Eşleştirici (şive toleransı) ──┐
                                           └► Yapay zekâ ile anlama (opsiyonel) ┤
İzleyici sohbeti / Hediye / Telefon / Stream Deck ─► HTTP API (token) ──────────┼─► Köprü ─► OBS'te katman ─► Yayın
Panel: meme paketleri, GIF arama, yüklemeler, tetikleyici editörü, temalar ─────┘
```

### 3.2 İşlevler

| Alan | Sürüm 2.1 durumu |
|---|---|
| **Konuşma tanıma** | Konuşurken **otomatik dil seçimiyle** üç dil (Almanca, Türkçe, İngilizce); DE/AT/CH ve US/GB/IN varyantları. Tarayıcı motoru (Chrome/Edge), API üzerinden harici motorlar (Whisper, Deepgram) ya da doğrudan tarayıcıda **çevrimdışı Whisper**. „Hızlı“ (ara sonuçlar) ya da „kesin“ (tam cümleler) tepki, 3 okuma alternatifi, kendi kendine test, ses seviyesi ve gecikme göstergesi. |
| **Şive ve öğrenme** | Hatalı eşleşmelere karşı korumalı, üç kademeli bulanık eşleştirme („grass“ → krass, „helal olsn“ → helal olsun). Tanınmayan cümleler tek tıkla bir tetikleyiciye atanıyor – bir sonraki sefer oturuyor. |
| **Meme paketleri** | Türkçe (85), Deutsch (49), English (50), Aile ve Çocuk (27), Oyun (27) = **238 tetikleyici**, tek tıkla yüklenip kaldırılabiliyor. |
| **GIF arama ve medya** | Doğrudan panelde KLIPY ve GIPHY ile güvenli GIF arama (her zaman G yaş sınıfı, arama terimleri ve sonuçlar için gençleri koruma filtresi, GIF'ler sağlayıcıda bağlantı olarak kalıyor, kaydedilmiyor), tek adımda „Tetikleyici yap“; 8 MB'a kadar kendi PNG/JPG/GIF/WebP ve MP3/WAV/OGG dosyaları; görsel kaynakları yalnızca kendi yüklemeler, birlikte gelen çıkartmalar ve KLIPY/GIPHY. |
| **Çıkartmalar** | 143 ücretsiz çıkartma (Microsoft Fluent Emoji, MIT lisansı; 119'u animasyonlu), DE/TR/EN anahtar kelimelerle kendi kütüphane sekmesinde; büyük çizgi roman kelimeleriyle (OHA, KRASS, SHEESH …) TR/DE/EN metin çıkartma paketleri (her biri 27–28). |
| **Performans** | Performans modu auto/eco/high ve tek bir render yolu: ortalama kare süresi −%63 ile −%69 arası, p99 −%74 ile −%80 arası, DOM düğümleri −%56 (1920×1080'de 3 saniyede 31 efektle ölçüldü); zayıf bilgisayarlar için eco modu. |
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
| 2.1 | Performans modu (kare süresi −%63 ile −%69 arası), 143 ücretsiz çıkartma (MIT), metin çıkartma paketleri, paketler sadeleştirildi (dinî ifadeler ve bayraklar yok), içerik filtreli güvenli GIF arama KLIPY/GIPHY (Tenor API'si kapatıldı) |

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
| **Kitap okuma, sesli kitap ve podcast formatları, yayınevleri** | Yalnızca sesten oluşan içeriğe görüntü, „filmli“ kitap okuma yayınları | Anlatı Filmi (Generative Scene Engine), Companion modu „resimli sesli kitap“, yayınevi lisansı | Vizyon, prototip mevcut (sonraki turdan, 2028 2. yarı) |
| **Video kurgu** (içerik üreticileri, podcast yapımcıları, ajanslar) | Saatlerce kurgu yapmadan, yükleme yapmadan klipler ve Shorts | Studio: yayından öne çıkanlar, hazır videoların otomatik kurgusu, yerel MP4 dışa aktarımı | Vizyon (sonraki turdan, 2028 2. yarı) |
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

## 11. Finansal plan (5 yıl) – Tahmin

Tüm rakamlar, aşağıdaki varsayımlara dayanan kurucu **tahminleridir**; henüz gelir yok. Temel, **`LiveFX_Finanzmodell.xlsx`** finansal modelidir (sayfalar: varsayımlar, 5 yıllık gelir tablosu, fonların kullanımı, 24 aylık aylık nakit akışı, kapılar, değerleme, duyarlılık analizi; `tools/build-finance.py` ile üretiliyor, temel rakamlar `tools/finance-250k.json` dosyasında). Zaman çizelgesi: ön tohum turunun Ocak 2027'deki kapanışı = 1. ay; Y1 = 2027 (Pro aboneliğinin başlangıcı) … Y5 = 2031.

### 11.1 Varsayımlar

| Varsayım | Temkinli | Temel | İyimser |
|---|---|---|---|
| Kayıtlı kullanıcı (yıl sonu) Y1 / Y2 / Y3 | 8.000 / 30.000 / 80.000 | 20.000 / 80.000 / 250.000 | 40.000 / 180.000 / 500.000 |
| Free → Pro dönüşümü | %3 | %4 | %5 |
| Pro ARPU (net, aylık/yıllık karışım) | aylık 8,50 € | aylık 8,50 € | aylık 8,50 € |
| Yıllık paket satın alma (kullanıcı payı × ortalama 3,99 €'dan 1 paket) | %7 | %10 | %12 |
| Ajans lisansları (yıl sonu) Y1 / Y2 / Y3, aylık 49 €'dan | 2 / 8 / 25 | 3 / 15 / 40 | 5 / 30 / 80 |
| B2B pilot/lisans | 0 / 0 / 50 bin € | 0 / 50 / 150 bin € | 0 / 100 / 400 bin € |
| Ücretli Pro kullanıcılar yıllık ortalama olarak hesaplanır (Y1'de yıl sonu değerinin ≈ %50'si, Y2'den itibaren %75'i) | | | |

Model 4. ve 5. yılları ileriye taşıyor: kullanıcı büyümesi yavaşlıyor, ajans ve B2B lisansları sürüyor, giderler ekip ve pazarlamayla birlikte artıyor (çalışma kitabı, „Annahmen“ sayfası, B bölümü). Y1–Y2 giderleri 250 bin €'luk turun aylık planından (11.3, 11.6), Y3 giderleri önceki plandan geliyor.

### 11.2 Gelir (bin €) – 5 yıl

| Senaryo | Y1 2027 | Y2 2028 | Y3 2029 | Y4 2030 | Y5 2031 |
|---|---|---|---|---|---|
| Temkinli | 16 | 82 | 271 | 432 | 602 |
| **Temel** | **51** | **336** | **1.038** | **1.984** | **3.152** |
| İyimser | 124 | 892 | 2.599 | 4.828 | 7.444 |

Gelir kaynağına göre temel senaryo:

| Temel (bin €) | Y1 2027 | Y2 2028 | Y3 2029 | Y4 2030 | Y5 2031 |
|---|---|---|---|---|---|
| Pro aboneliği | 41 | 245 | 765 | 1.463 | 2.324 |
| İçerik üreticisi paketleri | 8 | 32 | 100 | 180 | 269 |
| Ajans lisansı | 2 | 9 | 24 | 41 | 59 |
| B2B / pilot | 0 | 50 | 150 | 300 | 500 |
| **Toplam** | **51** | **336** | **1.038** | **1.984** | **3.152** |

Y1–Y3, 11.1'deki varsayımları değiştirmeden izliyor; temkinli senaryodaki ajans satırı formüle uygun hesaplandı (Y2'de 4 yerine 4,7 bin €, Y3'te 12 yerine 14,7 bin €); önceki sürümlere göre diğer farklar yuvarlamadan kaynaklanıyor.

### 11.3 Giderler (bin €) – temel senaryo, yalın plan

250 bin €'luk tur 18. aya kadar yalın bir ekibi finanse ediyor: 3. aydan itibaren bir mobil/web geliştirici, ayda 2.000 €'luk kısmi kurucu maaşı, pazara giriş, Kelime-Resim ve hukuk. Büyüme ekibi (ikinci geliştirici, backend/ML, topluluk/destek) ancak 19. ayda, 2. kapı ve sonraki turdan sonra başlıyor.

| Kalem | Y1 2027 | Y2 2028 | Y3 2029 | Önceki plan Y1 / Y2 |
|---|---|---|---|---|
| Personel: mobil/web geliştirme (3. aydan itibaren 1 kişi; 19. aydan itibaren 2 kişi) | 56 | 113 | 240 | 75 / 160 |
| Personel: backend/ML, topluluk/destek (19. aydan itibaren) | 0 | 30 | 160 | 0 / 60 |
| Kurucu (maaş; 18. aya kadar ayda 2.000 €) | 24 | 36 | 60 | 30 / 48 |
| Serbest tasarım/ses → Kelime-Resim hattı (37,5 bin €, 4.–15. ay) | 28 | 22 | 40 | 15 / 25 |
| Pazarlama, içerik üreticisi programı, etkinlikler, pilotlar | 32 | 48 | 120 | 25 / 60 |
| Altyapı, yapay zekâ API'si (yalnızca Pro), mağaza ücretleri (sabit + gelir payı) | 7 | 30 | 60 | 8 / 25 |
| Hukuk, marka, vergi, idari işler | 19 | 16 | 30 | 12 / 20 |
| **Toplam** | **166** | **295** | **710** | **165 / 398** |

Y4 ve Y5 (ileriye taşınmış): 1.065 bin € ve 1.491 bin €. Diğer senaryoların toplam giderleri (Y1–Y5, bin €): temkinli 163 / 196 / 330 / 396 / 455, iyimser 172 / 396 / 1.100 / 1.650 / 2.310.

### 11.4 Sonuç ve nakit (bin €) – 5 yıl

**FAVÖK (sonuç)**

| Senaryo | Y1 2027 | Y2 2028 | Y3 2029 | Y4 2030 | Y5 2031 | 5 yıl sonunda kümülatif |
|---|---|---|---|---|---|---|
| Temkinli | −148 | −114 | −59 | +36 | +147 | −138 |
| **Temel** | **−116** | **+41** | **+328** | **+919** | **+1.661** | **+2.833** |
| İyimser | −48 | +496 | +1.499 | +3.178 | +5.134 | +10.259 |

**Yıl sonu nakit** (başlangıç 250 bin €, sonraki tur olmadan)

| Senaryo | Y1 2027 | Y2 2028 | Y3 2029 | Y4 2030 | Y5 2031 |
|---|---|---|---|---|---|
| Temkinli | 102 | −11 | −71 | −34 | 112 |
| **Temel** | **134** | **175** | **503** | **1.422** | **3.083** |
| İyimser | 202 | 698 | 2.197 | 5.375 | 10.509 |

Y1/Y2 aylık plandan (12. ve 24. ay) geliyor; Y3'ten itibaren nakit = önceki yıl + FAVÖK (basitleştirilmiş, vergi ve işletme sermayesi hariç). 19. aydan itibaren tüm senaryolar büyüme ekibini zaten içeriyor, oysa bu ekip ancak sonraki turla işe alınıyor – bu yüzden temkinli senaryo, tohum turunun kapatması gereken açığı gösteriyor. Temel: kalıcı operasyonel başabaş 22. aydan itibaren (Y2); temkinli: FAVÖK Y4'ten itibaren pozitif.

**Finansman ihtiyacı:** 18 ay için 250.000 € ön tohum yatırım (bölüm 11.6); 2. kapıdan sonra yaklaşık 350.000 €'luk sonraki tur (tohum).

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

**Vizyon nasıl finanse ediliyor:** 250 bin €'luk tur yalnızca ilk vizyon hattını, **Kelime-Resim**'i finanse ediyor (37.500 €, 4.–15. ay, bölüm 11.6); bu hattın gelirleri (aile aboneliği, okul ve kurs lisansları: Y1–Y3'te 2,5 / 55,8 / 216,2 bin €, temel) modelde yalnızca not kalemi, yani ek potansiyel olarak yer alıyor. **Anlatı Filmi, Studio/otomatik kurgu ve Mekânlar/VR-AR sonraki tura kayıyor**; model bunlar için 19. aydan Y3 sonuna kadar 160,5 bin € planlıyor. SDK ve platform gelirleri ayrıca **sayılmıyor**; bunlar zaten B2B satırında. XR ve gözlük 0 € olarak hesaplandı.

### 11.6 Finansman: 250.000 € ön tohum (pre-seed)

**İhtiyaç:** **18 ay** için planlanan **250.000 €'luk bir ön tohum (pre-seed) turu** (Ocak 2027'de kapanış = 1. ay, Haziran 2028'e kadar). Yalın bir ekibi, pazara girişi, ilk vizyon hattı Kelime-Resim'i ve hukuki temelleri finanse ediyor – sonraki turun (tohum) toplanacağı 2. kapıya kadar. Bu bölümdeki tüm rakamlar: **Öneri – vergi/hukuk danışmanıyla kontrol edin.**

**18 aylık fon kullanımı – Öneri – vergi/hukuk danışmanıyla kontrol edin**

| Alan | Pay | Tutar | 1.–18. ayda planlanan | İçerik |
|---|---|---|---|---|
| Ekip/ürün: mobil/web geliştirici, kısmi kurucu maaşı, test cihazları | %50 | 125.000 € | 125.000 € | 3. aydan itibaren geliştirici (16 × 5.500 € = 88 bin €), kurucu 18 × 2.000 € = 36 bin €, test cihazları 1 bin €; hedef: Pro aboneliği, mobil uygulama/PWA, v2.1'in kararlılığı |
| Pazara giriş: içerik üreticisi programı, topluluk, platform ve eğitim pilotları | %20 | 50.000 € | 50.000 € | TR lansmanı, 10–20 elçi, paket yayınları, pazar yeri kayıtları, DE/EN lansmanı, 1 platform ya da eğitim pilotu |
| İlk vizyon hattı Kelime-Resim (dil öğrenme) | %15 | 37.500 € | 37.500 € | 300 kelime, okuma desteği, DE/TR/EN seslendirme kayıtları, didaktik denetim, kurs/sınıf pilotu (4.–15. ay) |
| Hukuk, marka, veri koruma | %10 | 25.000 € | 25.000 € | LiveFX markası DE/AB/TR, yatırım sözleşmesi, okul/aile profili için GDPR/veri koruma etki değerlendirmesi, gençlerin korunması, vergi danışmanlığı |
| Yedek | %5 | 12.500 € | – | Planlanmamış: işe alımda gecikmeler, mağaza/platform onayları; gelirsiz durumda sabit altyapı giderlerini karşılar |
| **Toplam** | **%100** | **250.000 €** | **237.500 €** | |

**Gider kalemleri, 1.–18. ay** (tüm senaryolarda aynı)

| Gider kalemi | €/ay | Aylar | Tek seferlik | 1.–18. ay toplamı |
|---|---|---|---|---|
| Mobil/web geliştirici (tam zamanlı) | 5.500 € | 3–18 | – | 88.000 € |
| Kurucu maaşı (kısmi) | 2.000 € | 1–18 | – | 36.000 € |
| Geliştirme araçları, test cihazları (iOS/Android) | – | – | 1.000 € (1. ay) | 1.000 € |
| İçerik üreticisi programı, topluluk, pazarlama – 1. aşama (TR lansmanı) | 2.000 € | 1–6 | – | 12.000 € |
| İçerik üreticisi programı, pazarlama, pazar yerleri – 2. aşama (DE/EN, ortaklar) | 3.000 € | 7–18 | – | 36.000 € |
| Platform ya da eğitim pilotu (8 hafta, materyal, seyahat) | – | – | 2.000 € (9. ay) | 2.000 € |
| Kelime-Resim: illüstrasyon, DE/TR/EN seslendirme kayıtları, didaktik, kurs pilotu | 3.125 € | 4–15 | – | 37.500 € |
| Hukuk, marka (DE/AB/TR), veri koruma etki değerlendirmesi, gençlerin korunması, vergi danışmanlığı | 1.000 € | 1–18 | 7.000 € (1. ay) | 25.000 € |
| **Planlanan toplam** | | | | **237.500 €** |

**Sonraki tura kaydırılanlar** (250 bin €'dan finanse edilmiyor): Anlatı Filmi / hikâye motoru (A hattı), Studio / otomatik kurgu (D hattı), Mekânlar / VR-AR (C hattı) ile 19. aydan itibaren backend/ML, topluluk/destek ve ikinci bir geliştirici.

**Nakit ömrü – aylık nakit planı** (çalışma kitabı, „Liquidität 24M“ sayfası):

- **Hiç gelir olmasa bile** 250 bin € **18 ay** yetiyor: ortalama gider ayda 13.444 € (1.–18. ay, sabit altyapı dahil), 18. ay sonunda nakit 8.000 €, ilk eksi ay 19. ay.
- Gelirle birlikte senaryolar şöyle (bin €; 19. aydan itibaren büyüme ekibi dahil):

| Senaryo | 6. ay nakit | 12. ay | 18. ay | 24. ay | En düşük nakit (ay) | Nakit ömrü | Kalıcı başabaş |
|---|---|---|---|---|---|---|---|
| Temkinli | 183 | 102 | 49 | −11 | −11 (24) | 22 ay (nakdin bittiği ay 23) | 24. aydan sonra |
| **Temel** | **191** | **134** | **146** | **175** | **125 (15)** | **> 24 ay** | **22. ay** |
| İyimser | 208 | 202 | 369 | 698 | 197 (9) | > 24 ay | 10. ay |
| Gelirsiz | 179 | 88 | 8 | −62,5 | – | 18 ay | – |

Temkinli senaryoda nakit 19. ayda üç aylık gider tutarındaki güvenlik tamponunun altına düşüyor – sonraki tur tam da burada hazır olmalı.

**Sonraki tur (tohum):** planlama için kılavuz değer **yaklaşık 350.000 €** (temkinli senaryoyu karşılıyor, 50 bin €'ya yuvarlandı). Görüşmeler 12. aydan itibaren, kapanış 2. kapıdan sonra (15.–18. ay, en geç 18. ay). Y3 sonuna kadar asgari ihtiyaç:

| bin € | Temkinli | Temel | İyimser |
|---|---|---|---|
| Güvenlik tamponu (Y3'ün 3 aylık gideri) | 82,5 | 177,5 | 275 |
| Sonraki tur olmadan Y3 sonu nakit | −71 | 503 | 2.197 |
| Likidite açığı (tampon eksi Y3 sonuna kadarki en düşük nakit) | 153 | 52 | 78 |
| Ertelenen vizyon hatları (Anlatı Filmi, Studio, Mekânlar), 19. aydan Y3 sonuna | 160,5 | 160,5 | 160,5 |
| **Sonraki tur için asgari ihtiyaç** | **314** | **213** | **239** |

**Değerleme: kurucunun teklifi 2,25 milyon € yatırım öncesi değer – müzakere temeli; vergi/hukuk danışmanıyla kontrol edin**

**Teklif:** **%10,0** karşılığında 250.000 € – yatırım öncesi değer (pre-money) **2,25 milyon €**, yatırım sonrası değer (post-money) **2,5 milyon €**; kurucu %90'ı elinde tutuyor. Teklif, gelir öncesi şirketler için yaygın **dört referans yönteminin hepsinin altında** (2,35–3,0 milyon €, ağırlıklı 2,71 milyon €): her referans yönteminin altında, adil ve yatırımcı dostu bir giriş fiyatı.

Referans yöntemleri (çalışma kitabı, „Bewertung“ sayfası; her varsayım orada kaynaklı ve işaretli):

| Yöntem | Yaklaşım | Yatırım öncesi değer | Ağırlık |
|---|---|---|---|
| Berkus | Modern „moderate 2×“ varyantı: her biri en fazla 1 milyon $ olan beş faktör (valu.vc, icanpitch 2026; $ → € 1:1). Fikir 0,7 · prototip/ürün 0,8 · ekip 0,5 · stratejik ilişkiler 0,25 · lansman/gelir 0,1 | 2,35 milyon € | %25 |
| Scorecard (Payne) | Referans yatırım öncesi değer 2,5 milyon € – DACH ön tohum aralığının alt kısmı (1,5–5 milyon €, upxcale; Almanya 1–5 milyon €, Capvisory), Avrupa medyanının altında (≈ 4,2 milyon €, Equidam) – × 1,18 katsayısı (ekip 1,0 · pazar 1,4 · ürün 1,4 · rekabet 1,3 · satış 0,8 · ek finansman 1,0 · diğer 1,2) | 2,95 milyon € | %30 |
| Risk sermayesi (VC) yöntemi | İyimser senaryo (yukarı potansiyel): Y5 geliri 7,44 milyon € × çıkış çarpanı 6 = çıkış değeri 44,7 milyon €; ÷ hedef getiri 10× × (1 − sonraki turlarda %40 sulanma) = yatırım sonrası değer 2,68 milyon €; eksi 250 bin € | 2,43 milyon € | %20 |
| Risk Faktörü Toplamı (RFS) | Taban değer 2,5 milyon €; her biri ±250 bin € olan on iki risk faktörü; toplam +2 (gelişim aşaması, üretim, rekabet, teknoloji, uluslararası olumlu; yönetim, satış, sermaye bulma olumsuz) | 3,0 milyon € | %25 |
| **Ağırlıklı ortalama** | | **2,71 milyon €** | |

**2,25 milyon € neden gerekçeli:**

- **Konsept değil, çalışan ürün v2.1:** gerçek zamanlı ses → efekt, performans modu, güvenli GIF arama; 575+ otomatik test ve uçtan uca (Playwright) test paketi – teknoloji riski büyük ölçüde azaltıldı.
- **Kendi fikrî mülkiyeti ve içeriği:** 238 ses tetikleyicisi, 143 ücretsiz çıkartma, metin/çıkartma içerikleri ve eşleştirme mantığı kendi geliştirmemiz; LiveFX marka tescili (DE/AB/TR) bütçede.
- **Türkçe niş dahil üç dil (DE/TR/EN):** Türkçe için uzmanlaşmış yayın aracı neredeyse yok; başlangıç pazarı olarak kendi TR topluluğumuz.
- **Aynı motor üzerinde A–D vizyon seçenekleri:** Anlatı Filmi (A), Kelime-Resim dil öğrenimi (B), Mekânlar/VR-AR (C), Studio/otomatik kurgu (D) – içerik üreticisi aracının ötesinde opsiyon değeri.
- **Pazar büyüklüğü:** canlı yayın pazarı 97–157 milyar USD, SAM 1–3 milyon içerik üreticisi (6. bölüm); ikinci pazar olarak eğitim/dil öğrenimi.
- **Sermaye verimliliği:** ürün v2.1'e kadar dış sermaye olmadan geliştirildi; modele göre 250.000 € 2. kapıya kadar 18 ay yetiyor.

Dürüst olmak gerekirse aleyhte olanlar: tek kurucu, henüz gelir ve imzalı ortak yok – bu yüzden teklif her referans yönteminin altında.

**Finansman araçları – Öneri – vergi/hukuk danışmanıyla kontrol edin**

- **A. Öz sermaye (fiyatlı tur):** 2,25 milyon € yatırım öncesi değerle 250.000 € = %10,0 (yatırım sonrası değer 2,5 milyon €).
- **B. Dönüştürülebilir kredi / SAFE:** değerleme tavanı 2,25 milyon € (yatırım öncesi, teklife eşit), tohum turu fiyatına %20 iskonto (%15–20 arası müzakere edilebilir), faizsiz, yaklaşık 18 ay sonra tohum turunda dönüşüm. Örnek: tohum turunda yatırım öncesi değer 3 milyon € → dönüşüm değerlemesi = tavan ile 3 milyon € × (1 − %20) değerinden düşük olanı = 2,25 milyon € → pay %10,0; tavanda pay hiçbir zaman %10'u aşmıyor.

**Duyarlılık analizi (temel senaryo)** – Y3 geliri ve nakit; nakit ömrü her durumda 24 ayın üzerinde kalıyor:

| Durum | Y3 geliri (bin €) | Temele göre fark | 18. ay nakit (bin €) | En düşük nakit (bin €) |
|---|---|---|---|---|
| Temel | 1.038 | – | 146 | 125 |
| Dönüşüm −1 puan | 847 | −%18,4 | 117 | 83 |
| Dönüşüm +1 puan | 1.230 | +%18,4 | 174 | 140 |
| ARPU −%20 | 885 | −%14,7 | 123 | 91 |
| ARPU +%20 | 1.191 | +%14,7 | 169 | 137 |
| Kullanıcı −%30 | 779 | −%25,0 | 106 | 65 |
| Kullanıcı +%30 | 1.298 | +%25,0 | 186 | 145 |

Değerleme için pazar referansları (4 Ekim 2026 tarihli web araştırması, değerler kullanılmadan önce kontrol edilmeli; Berkus varyantı valu.vc ve icanpitch 2026'yı izliyor):

- upxcale (DACH ön tohum aralığı 1,5–5 milyon €; Almanya tipik olarak 0,5–1,5 milyon €): https://upxcale.de/blog/pre-seed-funding/
- Capvisory (Almanya 1–5 milyon €): https://capvisory.de/the-startup-funding-stages-from-pre-seed-to-series-c/
- Equidam (Avrupa ön tohum medyanı 4,57 milyon USD): https://www.equidam.com/startup-valuation-delta-q1-2025/
- SaaS Capital (gelir çarpanları 4,8x / 5,3x): https://www.saas-capital.com/blog-posts/private-saas-company-valuations-multiples/
- Carta (tur başına sulanma): https://carta.com/data/state-of-private-markets-q1-2025/
- Lexr (tavan, iskonto, faiz): https://www.lexr.com/en-de/blog/convertible-loan-in-practice-conversion-interest-rate-discount-cap-valuation/
- Vektora (%15–25 iskonto yaygın): https://vektora.eu/de/fachbeitraege/pre-seed-finanzierung-in-deutschland-instrumente-und-prozess

Tur gerçekleşmezse alternatif: bootstrapping – Pro aboneliği ve paketler yarı zamanlı bir geliştiriciyi finanse eder, büyüme buna göre yavaşlar (yaklaşık temkinli senaryo). Destek programları (EXIST, girişim hibeleri, medya/eğitim teknolojisi destekleri) paralel olarak inceleniyor.

*Ekim 2026 sürümü: talep 250.000 €.*

---

## 12. Ekip ve ihtiyaç

**Tuncay Sancak – Kurucu & Mucit, Genel Müdür.** LiveFX'i icat etti ve geliştirdi. Yazar ve canlı yayıncı, Alman-Türk; nöroçeşitlilik üzerine çocuk kitabı serisi (Türkçe, kitap fragmanlarıyla); ürün vizyonu ve topluluk. LiveFX'i kendi yayınlarının hepsinde kullanıyor – hikâye moduyla kitap okuma kendi pratiğinden doğdu.

**Gönül Demet – Investor Relations (yatırımcı ilişkileri).** Yatırımcılar ve ön tohum turu için iletişim kişisi (iletişim: [E-posta] · [Telefon]).

**Bugüne kadarki geliştirme.** Yapay zekâ desteğiyle; belgelenmiş mimari (şema, sözleşmeler, tasarım dokümanları), değişiklik günlüğü ve otomatik testlerle kuruldu – bir geliştirme ekibinin doğrudan devralabileceği bir durum.

**Aranan**

| Rol | Neden | Zaman |
|---|---|---|
| **Mobil/web geliştirici** (iOS/Android, WebView/PWA, sonra SDK) | OBS kullanmayan, telefon odaklı içerik üreticilerine ulaşmak; platform entegrasyonunun ön aşaması | 3. aydan itibaren (ön tohum) |
| Backend/ML geliştirici | < 300 ms akışlı ASR, çevrimdışı modeller, standart olarak yapay zekâ ile anlama | 19. aydan itibaren (sonraki tur) |
| Topluluk ve ortaklık yönetimi (TR/DE) | İçerik üreticisi ortaklık programı, paketler, destek | elçiler 1. yıldan itibaren; pozisyon 19. aydan itibaren (sonraki tur) |
| **Ortaklıklar** | Platform pilotu (TikTok LIVE Studio, Instagram Live Producer, YouTube), yayın yazılımları, eğitim kurumları, yayınevleri | sürekli |
| Danışma kurulu | TR içerik üreticisi yöneticisi, bir platformun eski „Canlı“ ürün sorumlusu, eğitim teknolojisi | 1. yıl |
| Grafik/web geliştirici (Canvas, WebCodecs) | Anlatı Filmi render motoru, Studio dışa aktarımı (vizyon) | sonraki tur (19. aydan itibaren) |
| İllüstrasyon (çocuk kitabı tarzı), DE/TR/EN seslendirme sanatçıları, didaktik | Kelime-Resim'in telaffuz kayıtları ve alan denetimi (ön tohum, 4.–15. ay); dünya paketleri (sonraki tur) | serbest |

---

## 13. Riskler ve önlemler

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Platform işlevi kendisi geliştiriyor | orta | yüksek | Pilot/devralma ortağı olarak erken sunum; savunma hendeği olarak topluluk paketleri ve çok dillilik; hız; üçüncü taraf araçlar için standart olarak açık API |
| Konuşma tanıma şive, gürültü ve müzikte başarısız oluyor | orta | orta | Tolerans kademeleri, öğrenme işlevi, 3 okuma alternatifi, harici motorlar, çevrimdışı Whisper, ikinci mikrofon olarak telefon, elle kontrol için sahne pedi |
| OBS kullanmayan, yalnızca telefonla yayın yapanlar dışarıda kalıyor | yüksek | yüksek | OBS'siz demo kaydı, PWA uzaktan kumanda, ilk işe alım olarak mobil geliştirici, hedef olarak platform entegrasyonu |
| Meme/GIF/ses telif hakları | düşük–orta | orta | Kendi sentetik seslerimiz, MIT lisanslı ücretsiz çıkartmalar, API lisanslı GIF sağlayıcıları (KLIPY/GIPHY, kaydedilmeden bağlantıyla), atıf, kullanım koşullarıyla topluluk yüklemesi |
| Tarayıcı konuşma tanımaya (Google hizmeti) bağımlılık | orta | orta | Çevrimdışı Whisper, harici API, takılabilir motor arayüzü |
| Çok küçük içerik üreticilerinde düşük ödeme isteği | orta | orta | Erişim için Free paketi, düşük eşikli satın alma olarak paketler, ikinci ayak olarak ajans ve B2B gelirleri |
| Tek kişi riski | yüksek | yüksek | Dokümantasyon ve testler, erken işe alım, danışma kurulu, ortaklık programı |
| Platform politikaları (yayın anahtarı erişimi, sohbet API'leri, kotalar) | orta | orta | Platform başına birden fazla yol (LIVE Studio, yayın anahtarı, üçüncü taraf araçlar üzerinden webhook), YouTube kota yönetimi, yedek olarak telefon |
| Veri koruma / çocukların korunması (aile ve eğitim segmenti) | düşük | yüksek | Bulut zorunluluğu olmadan yerel işleme, hesap gerekmez, izleme yapmayan Çocuk Kitabı teması |
| Vizyon küçük ekibi dağıtıyor | orta | yüksek | Ön tohum yalnızca Kelime-Resim'i finanse ediyor; Anlatı Filmi, Studio ve Mekânlar ancak 2. kapıdan sonra sonraki turla; 3., 6., 12. ve 18. ayda kapılar; XR yalnızca vitrin |
| Dil öğrenme uygulamalarında ve video editörlerinde güçlü rekabet | yüksek | orta | Evrensel bir uygulama olarak değil; ses → resim, TR/DE/EN, sesli okuma ve yerel işleme üzerinden öne çıkmak |
| Eğitim sektöründe uzun satın alma süreçleri | yüksek | orta | İlk yılı aile aboneliği ve yayınevleri taşıyor; DigitalPakt bütçeleri ve medya merkezleri üzerinden okul lisansı |

---

## 14. Kilometre taşları

### 14.1 Önümüzdeki 18 ay

1. ay = ön tohum turunun Ocak 2027'deki kapanışı; 18. ay = Haziran 2028.

| Dönem | Ürün | Pazar | Organizasyon ve finansman |
|---|---|---|---|
| **2026 4. çeyrek** | Sürüm 2.1 (performans modu, 143 ücretsiz çıkartma, metin çıkartma paketleri, güvenli GIF arama), açılış sayfası ve indirme paketi (Windows/Mac), kurulum asistanı | TR topluluğunda lansman, 10–20 içerik üreticisi elçi, LinkedIn makalesi DE/TR, tanıtım videosu | Ön tohum yatırım görüşmeleri (250 bin €), marka tescili, danışma kuruluna davet |
| **2027 1. çeyrek** (1.–3. ay) | Pro aboneliği yayında (ödeme), ilk içerik üreticisi paketleri | TR lansmanı (pazara giriş 1. aşama) | Ön tohum tamamlandı (1. ay); mobil/web geliştirici ekipte (3. ay) – **G0 kapısı** |
| **2027 2. çeyrek** (4.–6. ay) | Mobil uygulama/PWA, 300 kelimeli ve okuma destekli Kelime-Resim | 20 beta içerik üreticisi TR/DE, topluluk paket yüklemesi | **G1 kapısı** (6. ay) |
| **2027 3.–4. çeyrek** (7.–12. ay) | Pazar yeri kayıtları (OBS, Streamlabs, Stream Deck), ajans lisansı, eğitim paketi | DE/EN lansmanı (2. aşama), platform ya da eğitim pilotu (9. ay), kurs/sınıflarda Kelime-Resim pilotu | **G2a kapısı** (12. ay); tohum görüşmeleri başlıyor |
| **2028 1. yarı** (13.–18. ay) | Kararlılık ve Pro için yapay zekâ ile anlama, Kelime-Resim pilotunun değerlendirmesi | Ortaklar, ilk ödeme yapan okullar ya da kurslar | **G2 kapısı** (18. ay): tohum turu tamamlandı, 19. aydan itibaren büyüme ekibi |

Ölçütler: kayıtlı kullanıcılar, haftalık aktif yayıncılar, Free → Pro dönüşümü, aylık tekrarlayan gelir, paket geliri, ortak içerik üreticisi sayısı, devam toplantısı getiren platform görüşmeleri.

### 14.2 18 aylık kapılar

Tüm değerler **hedeftir (henüz ulaşılmadı)**. En az eşik (temkinli senaryo) yakalanırsa kapı geçilmiş sayılır; hedef temel senaryodur. Öneri – yatırımcılarla netleştirilecek.

| Kapı | KPI | Hedef (temel) | Eşik (temkinli) | İyimser | Açtığı adım |
|---|---|---|---|---|---|
| **G0** Başlangıç (3. ay) | Pro aboneliği yayında (ödeme), mobil/web geliştirici ekipte | – | – | – | Pazara giriş 2. aşama bütçesi |
| **G1** Aktivasyon (6. ay) | Kayıtlı kullanıcı | 10.000 | 4.000 | 20.000 | Mobil uygulama/PWA yayını |
| G1 (6. ay) | Ödeme yapan Pro kullanıcı | 400 | 120 | 1.000 | |
| G1 (6. ay) | 20 beta içerik üreticisi TR/DE aktif, 10–20 elçi; 300 kelimeli Kelime-Resim | – | – | – | |
| G1 (6. ay) | Aktif yayıncılarda 4. hafta elde tutma ≥ %30 (hedef, ilk kohortlar) | – | – | – | |
| **G2a** Çekiş (12. ay) | Kayıtlı kullanıcı | 20.000 | 8.000 | 40.000 | DE/EN genişlemesi, platform görüşmeleri |
| G2a (12. ay) | Ödeme yapan Pro kullanıcı (Y1 sonu) | 800 | 240 | 2.000 | |
| G2a (12. ay) | 12. ayda aylık tekrarlayan gelir (MRR) | 8.073 € | 2.500 € | 19.820 € | |
| G2a (12. ay) | 1 platform ya da eğitim pilotu başladı; ≥ 3 kurs/sınıfta Kelime-Resim pilotu | – | – | – | |
| **G2** Sonraki tur (18. ay) | Kayıtlı kullanıcı | 50.000 | 19.000 | 110.000 | Tohum turu, 19. aydan itibaren büyüme ekibi, Anlatı Filmi/Studio |
| G2 (18. ay) | Ödeme yapan Pro kullanıcı | 2.000 | 570 | 5.500 | |
| G2 (18. ay) | 18. ayda aylık tekrarlayan gelir (MRR) | 22.586 € | 6.495 € | 62.473 € | |
| G2 (18. ay) | Pro'da 3. ay elde tutma ≥ %75; Free → Pro dönüşümü ≥ %3 (eşik) / %4 (hedef) | – | – | – | |
| G2 (18. ay) | Kelime-Resim pilotu değerlendirildi; ≥ 5 ödeme yapan okul ya da kurs | – | – | – | |

### 14.3 Vizyon 2027–2029

Sıralama gelire ve finansmana yakınlığa göre: ön tohum turu yalnızca **Kelime-Resim**'i finanse ediyor; Anlatı Filmi, Studio ve Mekânlar 2. kapıdan sonra **sonraki turla** başlıyor (19. aydan itibaren = Temmuz 2028). Sahne ve sınıf kullanımı bugün zaten çalışıyor.

| Dönem | Ürün | Pazar / satış | Kapı (ölçüt) |
|---|---|---|---|
| 2026 4. çeyrek | Dil öğrenme ve canlı hikâye prototipleri, zaman çizelgesi formatı LTF v1, Vizyon fragmanı DE/TR/EN | „Vizyon“ sunum slaytları, LinkedIn gönderisi | Prototipler çevrimdışı 60 fps |
| 2027 (ön tohum, 4.–15. ay) | 300 kelimeli Kelime-Resim, okuma desteği, DE/TR/EN seslendirme kayıtları, didaktik denetim, tekrar et | Kurs/sınıflarda Kelime-Resim pilotu, sahne ve sınıf ön ayarları | ≥ 3 kurs/sınıfta Kelime-Resim pilotu (G2a) |
| 2028 1. yarı (13.–18. ay) | Kelime-Resim pilotunun değerlendirmesi, okul lisansı | Medya merkezlerinde listelenme, tohum turu | ≥ 5 ödeme yapan okul ya da kurs (G2) |
| 2028 2. yarı (sonraki tur, 19. aydan itibaren) | Anlatı Filmi DE (sahne yönetmeni, karakterler, kamera) · zaman çizelgesi kaydı ve „Öne çıkanları bul“ · dosya içe aktarma ve otomatik efektler | **Pro+ yayında**, yayınevi pilotu (kendi seri), Kelime-Resim aile aboneliği | Pro → Pro+ yükseltme oranı |
| 2029 | Anlatı Filmi TR/EN ve dünya paketleri · zaman çizelgesi editörü ve MP4 dışa aktarımı · Companion „resimli sesli kitap“ ve telefonda AR · WebXR/gözlük prototipi · Scene-SDK | Yayınevi programı, platform sunumu „Canlı → Klip“, XR/gözlük kararı, platform pilotu ya da çıkış görüşmesi | imzalanmış platform pilotu |

`VISION.tr.md` dosyasının 10. bölümündeki çeyrek planı vizyonun tamamını anlatıyor; tarihleri farklı olduğunda bu bölüm geçerlidir (A, C ve D hatları sonraki turdan finanse ediliyor).

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

- `LiveFX_Finanzmodell.xlsx` – 250 bin €'luk ön tohum turunun finansal modeli (5 yıllık gelir tablosu, fonların kullanımı, aylık nakit akışı, kapılar, değerleme, duyarlılık; 11. bölümdeki rakamların kaynağı)
- `VISION.tr.md` – Vizyon 2027–2029 (Anlatı Filmi, Kelime-Resim, Mekânlar, Studio)
- `prototypes/sprachlernen.html`, `prototypes/live-story.html` – vizyon prototipleri
- `video/LiveFX_Vision_tr_16x9.mp4`, `video/LiveFX_Vision_tr_9x16.mp4` – Vizyon fragmanı (Türkçe; DE/EN sürümleri `video/LiveFX_Vision_*.mp4`)
- `video/LiveFX_Trailer_tr_16x9.mp4`, `video/LiveFX_Trailer_tr_9x16.mp4` – ürün fragmanı (Türkçe)
- `MARKTANALYSE.tr.md` – ayrıntılı pazar analizi
- `QUELLEN.tr.md` – numaralı kaynak listesi
- `LiveFX_Pitch_TR.pptx` (Almanca `LiveFX_Pitch.pptx`, İngilizce `LiveFX_Pitch_EN.pptx`), metin şablonu `PITCH-DECK.md` – yatırımcı sunumu
- `LINKEDIN.md` – tanıtım makalesi DE/TR
- `../README.md`, `../CHANGELOG.md`, `../docs/` – ürün dokümantasyonu
