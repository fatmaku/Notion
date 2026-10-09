# Cat Me If You Can · Yapılacaklar

*Durum tarihi: 9 Ekim 2026. Ayrıntılı kurulum: `deploy/KURULUM.md`. Projenin durumu: `DURUM.md`.*

## A · Yayına almak için (zorunlu)

- [ ] **1. Alan adını seç ve al.** Örnek: `kedi.ornek.com` ya da kendi alan adın.
- [ ] **2. Küçük bir sunucu kirala.** Ubuntu 22.04 veya 24.04, 1–2 GB RAM yeterli. Sunucunun
      dışarıya açık bir IP adresi olmalı; 80 ve 443 numaralı portlar açık olmalı.
- [ ] **3. Alan adını sunucuya yönlendir.** Alan adının DNS ayarlarında bir **A kaydı**:
      alan adı → sunucunun IP adresi (IPv6 varsa ayrıca AAAA kaydı). Yayılması birkaç dakika
      ile birkaç saat sürebilir.
- [ ] **4. Projeyi sunucuya koy.** Ya `git clone` ile ya da teslim paketindeki ZIP parçalarını
      aynı klasöre açarak (`for f in CatMeIfYouCan-TamPaket-*.zip; do unzip -o "$f"; done`).
- [ ] **5. Tek komutu çalıştır** (`catmeifyoucan` klasöründe):
      ```
      sudo bash deploy/kur.sh kedi.ornek.com eposta@ornek.com
      ```
      Komut Docker'ı kontrol eder, gizli anahtarları üretir, siteyi başlatır ve HTTPS sertifikasını
      kendisi alır. Sonunda site adresini, yönetim sayfasını ve yönetici anahtarının nerede
      olduğunu yazar.
- [ ] **6. Yönetici anahtarını güvenli bir yere kaydet** (`deploy/.env` dosyasında, kimseyle paylaşma).
- [ ] **7. Telefonu bağla:** `kur.sh`'in sonunda çıkan QR kodu telefonun kamerasıyla okut – yönetim
      sayfası telefonda giriş yapılmış açılır. Süresi geçtiyse: `sudo bash deploy/qr.sh`.
- [ ] **7b. Telefonla dene:** siteyi aç, “Oyna”ya bas, bir kedinin fotoğrafını çek. Kamera ve konum
      sadece HTTPS ile çalışır – kurulum bunu otomatik sağlar.

## B · Kafeler ve içerik (yayından önce)

- [ ] **8. Partner kafeleri telefonla ekle:** kafeye git, yönetim sayfası → **Kafeler & yerler** →
      **Konumumu kullan** → ad, teklif (varsayılan 20 kedi = %20) → **Kaydet**. PIN boş kalabilir.
      **Happy Overthinking Coffee** de eklenmeli.
- [ ] **9. Kafenin telefonunu kur:** kaydettikten hemen sonra çıkan QR kodu kafenin telefonuyla
      okut; kafe kendi PIN'ini seçer ve „Ana ekrana ekle“ yapar. (Sonra: **Kurulum** → **Bir kafeyi
      kur**, ya da `sudo bash deploy/qr.sh kafe <kafe-id>`.)
- [ ] **9b. Kafelere kitlerini ver:** her kafe kendi sayfasında (`/partner.html`) QR kodunu görür;
      `/print.html` ile masa kartı, 80 mm çıkartma ve A4 afiş basılır.
- [ ] **10. Dört kedi rotasını bir kez yürü** ve yol noktalarını gerekirse
      `public/config/routes.js` içinde düzelt (şu an ±100 m).
- [ ] **11. Fragmanlardan birini sesli dinle** (müzik sadece ölçülerle kontrol edildi).
- [ ] **12. Rusça, Arapça ve Farsça metinleri** bir ana dil konuşanına bir kez okut (isteğe bağlı ama önerilir).
- [ ] **13. Paylaşım metinleri:** `marketing/CAPTIONS.md` içindeki `{LINK}` yerine site adresini yaz.
- [ ] **14. Sosyal medya hesaplarını aç** (Instagram, TikTok …) ve 7 günlük planı başlat.
- [ ] **15. Gizlilik ve KVKK:** oyun içindeki gizlilik metnini bir hukukçuya göster.

## C · İsteğe bağlı ama çok faydalı

- [ ] **16. Claude anahtarı ekle** (`deploy/.env` içinde `ANTHROPIC_API_KEY`): gerçek fotoğraf
      analizi (yaş, kilo, sağlık), aynı kediyi daha iyi tanıma ve isim kontrolü. Kullanım başına
      ücretlidir; anahtar yoksa oyun basit analizle çalışır.
- [ ] **17. Gönüllü grupları ve veterinerler:** **Kurulum** → **Gönüllü davet et** (1, 5 ya da 20
      kişi) → QR kodu göster ya da paylaş; okutan gönüllü olur. Terminalden: `sudo bash deploy/qr.sh
      gonullu 5`. Böylece “mama verildi”, “veterinere götürüldü” düğmelerini kullanabilirler.
- [ ] **17b. Cihazları ara sıra kontrol et:** **Kurulum** → **Cihazlar**. Tanımadığın bir cihaz
      varsa **Çıkış yap**; telefon kaybolursa **Diğer bütün cihazlardan çıkış yap**. Tam emin olmak
      için yönetici anahtarını değiştir (`deploy/.env` içinde `ADMIN_TOKEN` satırını sil →
      `sudo bash deploy/kur.sh`): bütün cihazlar çıkar, sonra `sudo bash deploy/qr.sh` ile yeniden bağlan.
- [ ] **18. Belediye ve basın:** aylık raporu (`/report.html`) paylaş.
- [ ] **19. Yedek:** `kur.sh` her gece otomatik yedek alır (son 14 yedek `yedekler/` klasöründe).
      Yedekleri ara sıra başka bir yere de kopyala.
- [ ] **20. AR modelini sunucuya al:** `npm run vendor:ar` (o zaman kamera görüntüsündeki kedi
      işaretleme dışarıdan bir CDN'e bağlı olmaz).
- [ ] **21. Erişilebilirlik takibi:** basit bir “site ayakta mı” izlemesi (ör. `/api/health`).

## D · Sonraki adımlar için fikirler

- Push bildirimleri (teşekkür mesajları ve acil yardım çağrıları anında gelsin).
- Kafe sayfasını ve yönetim sayfasını da 6 dile çevirmek (şu an tr/en/de).
- Başka semtler: Beşiktaş, Üsküdar … (`public/config/regions.js`'e yeni bölge eklemek yeterli).
- Yönetim sayfasında gönüllü yardımlarının listesi.
- Çok büyürse veritabanı olarak Postgres/PostGIS.

## Güncelleme ve bakım

| Ne | Komut |
|---|---|
| Yeni sürümü yükle (veriler kalır) | `sudo bash deploy/guncelle.sh` |
| Telefon için yeni QR kod (yönetim · kafe · gönüllü) | `sudo bash deploy/qr.sh` · `sudo bash deploy/qr.sh kafe <kafe-id>` · `sudo bash deploy/qr.sh gonullu 5` |
| Yedek al (kur.sh her gece otomatik yedek de kurar) | `sudo bash deploy/yedek.sh` |
| Yedekten geri yükle | `sudo bash deploy/geri-yukle.sh <yedek-dosyası>` |
| Her şeyi sıfırla (ör. demodan sonra; önce yedek alır) | `sudo bash deploy/sifirla.sh` |
| Durumu gör (`app` „healthy“ olmalı) | `cd deploy && docker compose ps` |
| Kayıtları gör | `cd deploy && docker compose logs --tail 100 app` |
| Fragmanları yeniden üret | `node trailer/render.js --all` |
| Sosyal görselleri yeniden üret | `node marketing/render.js` |
