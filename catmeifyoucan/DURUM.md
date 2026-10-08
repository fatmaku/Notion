# Cat Me If You Can · Durum

*Durum tarihi: 8 Ekim 2026 · Git dalı: `claude/zen-galileo-1fgw7m`*

Kadıköy'ün sokak kedileri için ücretsiz bir fotoğraf oyunu. Oyuncular sokak kedilerini
fotoğraflar, yapay zekâ kediyi tanır, kedi oyuncunun **KediDex**'ine girer. Bir kediyi ilk bulan
ona isim verir. **Bir günde 20 farklı kedi = partner kafede %20 indirim** (sadece o gün). Her
fotoğraf aynı zamanda kedilerin sayımına katkı verir: oyuncu kedinin durumunu (sağlıklı, aç,
hasta, yaralı …) bildirir, gönüllüler yardım eder.

Bir HappyTuncay ürünü · Kadıköy'deki Happy Overthinking Coffee'de doğdu.

## Kısaca

**Kod tarafında her şey hazır ve test edildi.** Yayına almak için bir alan adı, küçük bir sunucu
ve tek bir komut gerekiyor (bkz. `deploy/KURULUM.md` ve `YAPILACAKLAR.md`).

## Bölümler

| Bölüm | Durum | Nerede |
|---|---|---|
| Oyun (web uygulaması, 6 dil, sağdan sola dahil) | ✅ hazır | `public/app.html`, `public/js/`, `public/core/` |
| Sunucu (Node.js, ek veritabanı yok) | ✅ hazır | `server.js`, `server/` |
| Başlangıç sayfası (3D sahne, fragman, paylaşım, 6 dil) | ✅ hazır | `public/index.html`, `public/site/` |
| Fragmanlar: 6 dil × yatay 16:9 + dikey 9:16 | ✅ hazır | `public/media/trailer-*`, kaynak `trailer/` |
| Sosyal medya kiti: 60 görsel + metinler + 7 günlük plan | ✅ hazır | `marketing/social/`, `marketing/CAPTIONS.md` |
| Link önizleme görselleri (6 dil) | ✅ hazır | `public/media/og-*.png` |
| Kedi sayfaları `/c/<id>` (WhatsApp önizlemesi), sitemap | ✅ hazır | `server/share.js`, `docs/features/share.md` |
| Kafe kiti: QR kodu, masa kartı, çıkartma, afiş, kafe sayıları | ✅ hazır | `public/print.html`, `docs/features/cafe.md` |
| Kedi rotaları: Kadıköy'de 4 yürüyüş | ✅ hazır (yerinde kontrol edilmeli) | `public/config/routes.js`, `docs/features/routes.md` |
| Yardım ve teşekkür: gönüllü düğmeleri, teşekkür akışı, yardım kılavuzu | ✅ hazır | `public/guide.html`, `docs/features/impact.md` |
| Aylık rapor: “Kadıköy'ün sokak kedileri” | ✅ hazır | `public/report.html`, `docs/features/report.md` |
| Hız: sıkıştırma, ekranlar gerektiğinde yüklenir | ✅ hazır | `server/compress.js`, `docs/features/perf.md` |
| Kurulum paketi: Docker + otomatik HTTPS, Docker'sız alternatif | ✅ hazır | `deploy/`, `Dockerfile`, `deploy/KURULUM.md` |
| Sunum (İngilizce, 13 slayt) | ✅ hazır | çevrimiçi, ayrıca `teslim/` paketinde bağlantı |

## Diller

Türkçe, İngilizce, Almanca, Rusça, Arapça, Farsça. Arapça ve Farsça sağdan sola çalışır;
Farsçada rakamlar Farsça yazılır. Rusça, Arapça ve Farsça metinler yapay zekâ ile ana dil
düzeyinde gözden geçirildi; yayından önce bir insanın da okuması iyi olur.

## Güvenlik ve gizlilik

* Kedilerin tam yeri hiçbir zaman gösterilmez; herkese açık konumlar yaklaşık 100 m'ye yuvarlanır.
* Sadece kedinin kırpılmış fotoğrafı herkese açıktır; tam fotoğraf yalnızca yöneticiye görünür.
* Hileye karşı: galeri fotoğrafı ve aynı fotoğraf sayılmaz, GPS doğruluğu ve imkânsız hız
  kontrolü, her denemeden sonra bekleme süresi.
* Kötü isimlere karşı 11 dilde sözcük filtresi, ayrıca (anahtar varsa) yapay zekâ kontrolü.
* İndirim kodu gün sonuna kadar geçerli ve bir kez kullanılır; kafeler PIN ile girer.
* Kafe yönlendirmesi (QR) için yalnızca birinci taraf çerez; IP adresi saklanmaz.
* Bütün özellikler birlikte, saldırgan gözüyle ayrıca denetlendi (yetkiler, sızıntı, XSS,
  önbellek, kötüye kullanım); bulunanlar düzeltildi ve testlerle korunuyor.

## Testler

* `npm run test:unit` – birim ve sunucu testleri (son çalıştırma: hepsi yeşil).
* `E2E_IGNORE_TLS=1 npm run test:e2e` – sahte kamera ve gerçek bir kedi fotoğrafıyla tarayıcı
  testi: fotoğraf → yeni kedi → isim → 20 kedi → kod → kafede kullanma (son çalıştırma: yeşil).

## Bilinen sınırlar

* **Rotalar:** yol noktaları yerel bilgiye dayanıyor (±100 m). Yayından önce bir kez yürünmeli.
* **Happy Overthinking Coffee:** adresi sistemde yok, bu yüzden haritada partner olarak görünmüyor.
* **Yapay zekâ anahtarı yoksa:** oyun basit renk analiziyle çalışır; yaş, kilo ve sağlık tahmini
  yapmaz. Anahtarla (Claude) tam analiz çalışır.
* **AR kedi tanıma:** kamera görüntüsünde kediyi işaretleyen model internetten (jsDelivr) yüklenir;
  istenirse `npm run vendor:ar` ile sunucuya alınabilir.
* **Kafe sayfası** tr/en/de dillerinde; ru/ar/fa için İngilizce gösterilir.
* **Bildirim yok:** teşekkür mesajları uygulama bir sonraki açılışında görünür (push bildirimi yok).
* **Veri saklama:** günlük dosyası + anlık görüntü; Kadıköy büyüklüğü için yeterli. Çok büyürse
  Postgres/PostGIS'e geçilebilir (motor değişmez).
* **Fragman müziği** ölçülerle kontrol edildi, bir insan tarafından dinlenmedi.
* **Hukuk:** gizlilik metni ve KVKK uyumu için yayından önce bir hukukçuya göstermek önerilir.

## Önemli dosyalar

| Dosya | Ne için |
|---|---|
| `README.md` | Teknik genel bakış, ortam değişkenleri, sayfalar (Almanca) |
| `deploy/KURULUM.md` | Yayına alma, adım adım (Türkçe, sonunda Almanca özet) |
| `YAPILACAKLAR.md` | Yayından önce ve sonra yapılacaklar |
| `docs/BRAND.md` | Marka: yazımlar, renkler, yazı tipleri, dil kuralları |
| `docs/KONZEPT.md` | Fikir, oyun kuralları, iş modeli |
| `docs/PARTNER.md` | Kafeler nasıl katılır (Türkçe/Almanca) |
| `docs/features/*.md` | Her yeni özelliğin açıklaması |
| `marketing/CAPTIONS.md` | Paylaşım metinleri, hashtag'ler, yayın planı, kafe ve DM şablonları |
| `trailer/README.md` | Fragmanları yeniden üretmek |
