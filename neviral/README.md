# neviral

iCloud'daki 2 TB fotoğraf-video arşivinden **hazır paylaşım videoları** (hikâye, reel, carousel) üreten, eski paylaşımlarınızı bulan ve yeniden paylaşmanızı hatırlatan **yerel** bir uygulama. Mac'inizde çalışır; hiçbir dosya buluta gönderilmez.

Neden bu yaklaşım "en kolayı":

- **Kopyalamaz, indeksler.** 2 TB'ı bir yere taşımaz; yalnızca meta veriyi (tarih, süre, oran, albüm, kişi, etiket) küçük bir SQLite veritabanına yazar. Fotoğraflar uygulamasının kendi küçük resimlerini kullanır, orijinaller iCloud'da kalabilir.
- **Aramayı çözer.** "2019 yaz tatili dikey video 10-60 sn, hiç paylaşılmamış" gibi soruları saniyeler içinde yanıtlar (tam metin arama + filtreler).
- **Puanlar.** Her öğeye 0-100 arası "sosyal medya uygunluk" puanı verir (dikey format, ideal süre, çözünürlük, favori, düzenlenmiş, kişi var, Apple'ın estetik puanı…). "Tutabilir" içerikleri öne çıkarır.
- **Eski paylaşımlarınızı bulur.** Instagram "Bilgilerini indir" dışa aktarımını okur, paylaştığınız her şeyi arşivdeki orijinaliyle eşler (görsel hash + tarih). Böylece **hangi videoyu ne zaman paylaştığınızı** ve neyi hiç paylaşmadığınızı görürsünüz.
- **Üretir.** Seçtiğiniz öğeler ve birkaç satır brief ile ffmpeg üzerinden Ken Burns hareketli fotoğraflar, video kesitleri, geçişler, giriş/kapanış kartları, hesap etiketi, telifsiz müzik, ses normalizasyonu… Çıktı Instagram/TikTok'a yüklemeye hazır 1080×1920 MP4 + kapak + açıklama metni.
- **Hatırlatır.** Yeniden paylaşım kuyruğunu haftalara dağıtır, "bugün geçen yıl" önerir, macOS bildirimi ve Takvim (.ics) desteği vardır.
- **Pazarlama.** Açıklama + hashtag + kanca cümlesi üretir (isteğe bağlı Claude ile), performans CSV'nizden en iyi paylaşım saatlerini çıkarır, içerik fikirleri önerir.

## 🎯 Karar motoru: neden viral, ne kazandırır (sürüm 0.6)

Puan artık bir sayı değil, bir **karar**. Her öğe için:

- **Seviye:** *Şimdi paylaş* / *Optimizasyonla paylaş* / *Güçlü kanca ve seriyle dene* / *Arşivde kalsın* — optimizasyon **sonrası** puana göre.
- **Puan katkıları:** Açılış, görüntü kalitesi, format, süre, konu uyumu, insan/yüz, yenilik, kendi geçmişiniz — her biri kaç puan getirdi / en fazla kaç getirebilirdi (çubuklarla).
- **Paketin kazandırdıkları:** Otomatik iyileştirmeler simüle edilir ve her adımın kazancı yazılır: "9:16 dönüşüm +4.1", "ilk saniyede yazılı kanca +3.2", "en iyi 30 sn kesimi +2.5", "carousel +1.8". Böylece "71 → 79" nereden geldiğini görürsünüz.
- **Riskler:** Zayıf açılış, yatay format, insan yok, daha önce paylaşılmış, düşük çözünürlük, orijinal iCloud'da…
- **Güven düzeyi:** Video derin analiz edildi mi, Apple estetik puanı var mı, Instagram istatistiğinden öğrenildi mi — karar ne kadar sağlam, açıkça söylenir.
- **Kendi geçmişiniz:** "Kitap videolarınız ortalamanızın 1.6× etkileşimini aldı" gibi somut karşılaştırma (CSV içe aktarıldıysa).
- **Zamanlama sinyali:** Yaklaşan özel gün (Dünya Kitap Günü, Weltkindertag, Öğretmenler Günü…) konuyla eşleşiyorsa puan artar ve "13 gün sonra: tam zamanı" denir.
- **Seri/carousel sinyali:** Aynı gün çekilmiş 3+ fotoğraf varsa Instagram gönderisi için carousel potansiyeli hesaba katılır.
- **Tek paragraflık karar** (TR/DE/EN): platform, pazar, dil, format, süre, stil, kanca, en iyi saat ve en güçlü neden — listede rozet olarak, detayda tam metin, pakette `karar.txt` ve `paket.json["karar"]`.

Önizleme/görsel üretimi dayanıklı hale getirildi: 1 saniyeden kısa videolar, boşluksuz uzun yazılar, HEIC/PNG/CMYK/gri görseller, iCloud'da kalmış (indirilmemiş) orijinaller ve açılamayan dosyalar artık hata vermez; tek bir stil üretilemezse diğerleri yine gösterilir ve neden yazılır.

## ✦ Premium tasarım, güçlü kancalar, karşılaştırma (sürüm 0.5)

Önceki sürümlerde ekrandaki yazılar sistem yazı tipi + düz sarı kutuydu, metinler birkaç kalıp cümleden oluşuyordu — "ucuz" görünüyordu. Şimdi:

- **5 tasarım stili** (uygulamayla gelen açık lisanslı yazı tipleri, OFL): *Editoryal* (zarif serif, ince çizgi, film greni), *Pop* (kalın büyük harf, fosforlu vurgu, kelime kelime), *Masal* (çocuk kitabı hissi, yumuşak kâğıt kart), *Minimal* (sade alt panel, modern grotesk), *Sinema* (sinemaskop bantlar, geniş aralıklı başlık). Konuya göre otomatik seçilir (kitap → Masal/Editoryal, etkinlik → Pop…), ya da siz seçersiniz.
- **Görselden vurgu rengi:** Her videonun vurgu rengi kendi fotoğrafından çıkarılır; yazılar arka planla uyumlu ve okunur kalır.
- **Animasyonlu kanca:** Başlık ilk saniyede satır satır / kelime kelime / süzülerek gelir; renk derecelendirmesi (sıcak, sinematik, canlı…) ve isteğe bağlı film greni.
- **Kanca formülleri + puan:** Merak boşluğu, soru, önce/sonra, sayı/yıl, sahne arkası, "ilk kez"… Her konu için TR/DE/EN onlarca formül; her kanca 0-100 puanlanır ve **neden** gösterilir (ideal uzunluk, ekranda okunur, yorum çağırır, merak uyandırır, ana konuya uygun) — klişeler ("throwback", "anılar"…) cezalandırılır.
- **Hikâye anlatan açıklamalar:** İlk satır kanca, ardından 2 satır hikâye, sonra platforma uygun çağrı (gönder / kaydet / yorumla).
- **🧪 Karşılaştır:** Viral › *Texte & Details* içinde 6 kanca varyantı (puanlı), kendi başlığınızı yazıp canlı puanlatma ve 5 stilin gerçek önizlemesi (okunurluk puanı, 🏆 en iyi, ⭐ konuya uygun). Seçiminizle tek tıkla paket.
- **A/B testi:** Pakette aynı video iki farklı kancayla (`B-…mp4`) üretilir — Instagram'ın "deneme/test" özelliğiyle hangisinin tuttuğunu görün.

Komut satırı: `viral paket 123 --stil masal --ab` · `viral eniyi 10 --stil otomatik`.

## 🔥 neviral — viral potansiyel (sürüm 0.3)

**Viral** sekmesi tüm arşivi en yüksek viral potansiyelden en düşüğe sıralar. Her öğe için:

- **Viral puanı (0-100) ve yüzdelik dilim** ("ilk %2"), ayrıca platform başına puan: Instagram Reels, Instagram gönderi/carousel, TikTok, YouTube Shorts, Facebook Reels.
- **Neden yüksek?** Güçlü açılış (ilk 3 sn hareket + netlik), görüntü kalitesi (netlik, pozlama, kontrast, renk, odak), ideal format/süre, platformda sevilen konu, insan/yüz, hiç paylaşılmamış olması, geçmiş performansınız, nostalji ("eskiden/şimdi") potansiyeli.
- **Pazar ve dil:** 🇹🇷 Türkiye / 🇩🇪 Almanya-DACH / 🌍 uluslararası payları (kitle ayarınız + yer adları, dil ipuçları, konunun evrenselliği) ve önerilen dil.
- **Konu:** Kitap, çocuk & aile, okul, seyahat, kutlama, hayvan, yemek, etkinlik, günlük.
- **Otomatik iyileştirmeler:** 9:16'ya dönüştürme, en iyi anın kesilmesi, karanlık/bulanık/soluk görüntünün düzeltilmesi, ses yoksa müzik, ilk saniyeye yazılı kanca.
- **En iyi paylaşım zamanı:** Pazarın yerel saatine göre seçilip sizin saat diliminize çevrilir.
- **Metinler:** Her platform için ayrı (Reels: gönderim/kaydetme çağrısı + 3-5 hashtag; TikTok: kısa, aranabilir anahtar kelimeler, BookTok/KitapTok; Shorts: 70 karakterlik başlık + #Shorts; Facebook: yorum açan soru) — Türkçe, Almanca, İngilizce.

**⚡ Paket hazırla** (tek tık): platforma uygun 9:16 video (otomatik renk/netlik düzeltmesi, en iyi an, ekranda kanca), fotoğraflar için iyileştirilmiş 4:5 akış görseli, 3 dilde tüm metinler (`aciklamalar.txt`, `paket.json`), en iyi saatler ve o saate hatırlatıcı. **⚡ En iyi 10** aynı işi en yüksek puanlı 10 paylaşılmamış öğe için yapar.

Algoritma kural kitabı platformların 2025-2026 açıklamalarına dayanır (Instagram: DM ile gönderim ve izlenme süresi, orijinallik; TikTok: tamamlanma oranı, tekrar izleme, arama anahtar kelimeleri; Shorts: izlendi/kaydırıldı oranı; Facebook: paylaşım/yorum, aile/nostalji). Puan bir **tahmindir**; Instagram Profesyonel Panel CSV'sini içe aktardıkça uygulama sizin kitlenizde neyin çalıştığını öğrenir ve puanları buna göre ayarlar. `ANTHROPIC_API_KEY` tanımlıysa paket hazırlanırken Claude fotoğrafa bakarak metinleri gerçek içeriğe göre yazar.

**📥 Dışarıdan puanlat:** Viral sekmesinde dosyaları (WhatsApp, AirDrop, telefon, kamera…) kutuya sürükleyin ya da seçin; dosya `~/ArsivStudyo/harici/` altına kopyalanır, saniyeler içinde analiz edilip puanlanır ve listede *yalnızca dışarıdan yüklenenler* filtresiyle bulunur.

**⚙️ Paket seçenekleri:** Platformlar, diller (TR/DE/EN), video formatı (9:16, 4:5, 1:1), süre (otomatik ya da 7-90 sn), müzik, kendi ekran yazınız (kanca), otomatik düzeltme, hatırlatıcı ve Claude metinleri seçilebilir; tasarım stili ve A/B testi seçilebilir; son seçimleriniz hatırlanır.

Komut satırı: `python3 -m arsiv viral analiz` · `viral liste --platform tiktok` · `viral paket 123 --dil tr de en` · `viral eniyi 10`.

## Yenilikler (sürüm 0.2)

- **Hız:** 200 000 öğelik arşivde arama ~0,1 sn, panel ~1 sn; Instagram eşleme (1000 paylaşım) ~2 sn. Küçük resimler Fotoğraflar'ın kendi önizlemelerinden paralel üretilir; yeniden içe aktarmada değişmeyenler atlanır. İçe aktarma ayrı süreçte çalışır, arayüz donmaz.
- **En iyi an otomatik:** Uzun videolarda başlangıç verilmezse keskinlik + hareket analiziyle en iyi bölüm seçilir.
- **Güvenli alanlar:** Yazılar Reels/TikTok/Shorts'un düğme ve açıklama alanlarının altında kalmaz; uzun kelimeler bölünür, sığmayan yazı küçültülür.
- **Özel günler takvimi:** Dünya Kitap Günü, 23 Nisan, Anneler Günü/Muttertag, Öğretmenler Günü, Welttag des Buches… Panelde 60 gün ileriye; hatırlatıcı planı 3 gün önceden haber verir.
- **Yıl özeti:** "2025 yılının en iyileri" fikri tek tıkla 10 anlık montaj.
- **iPhone'a gönder:** Üretimler sekmesinde "Fotoğraflar'a ekle (iPhone)" videoyu macOS Fotoğraflar'daki *neviral* albümüne koyar; iCloud Fotoğraflar ile telefona gelir, Instagram'dan doğrudan paylaşılır. (İlk seferde Sistem Ayarları › Gizlilik ve Güvenlik › Otomasyon › Terminal › Fotoğraflar izni.)
- **Instagram tahminleri:** Görsel eşleşmeyen paylaşımlar için tarih tahmini artık yalnızca öneridir; *Paylaşılanlar* sekmesinde ✓ Onayla / ✕ Yanlış.
- **iCloud Drive taraması:** Yalnızca iCloud'da duran (indirilmemiş) dosyalar okunmaz, böylece 2 TB'lık indirme tetiklenmez.
- **Güvenlik:** Sunucu yalnızca bu Mac'ten gelen isteklere yanıt verir; başka web sitelerinin uygulamaya istek göndermesi engellenir.

## Kurulum (macOS) — çift tıklayarak

Gereksinim: macOS 13 ve üstü, **Python 3.10 ve üstü** (3.12 önerilir). Xcode ve Homebrew gerekmez; ffmpeg yoksa taşınabilir bir kopya otomatik indirilir.

1. Python yoksa: <https://www.python.org/downloads/macos/> › *Latest Python 3 Release* › sayfanın altındaki **macOS 64-bit universal2 installer** › .pkg dosyasını çift tıklayıp kurun.
2. Bu klasörü (zip'i açtıktan sonra) Masaüstü'ne taşıyın.
3. **`Kur.command`** dosyasını çift tıklayın. macOS "doğrulanamadı" derse:
   - macOS 13/14: dosyaya sağ tıklayın › **Aç** › **Aç**.
   - macOS 15 ve üstü: Sistem Ayarları › Gizlilik ve Güvenlik › en alta inin › **Yine de Aç** › parola.
   - Her sürümde çalışan yol: Terminal'i açın, `bash ` yazın (boşlukla), `Kur.command` dosyasını pencereye sürükleyin, Enter'a basın.
   Kur.command diğer `.command` dosyalarının karantina işaretini kaldırır; sonrakiler doğrudan açılır.
4. Terminal'e fotoğraf izni verin: Sistem Ayarları › Gizlilik ve Güvenlik › **Tam Disk Erişimi** › "+" › Terminal. Sonra Terminal'i tamamen kapatın (Cmd+Q).
5. **`Baslat.command`** dosyasını çift tıklayın; tarayıcı `http://127.0.0.1:8765` adresini açar. Durdurmak için pencerede Ctrl+C ya da `Durdur.command`.
6. Arayüzde **İçe aktar** sekmesi › "Fotoğraflar › İçe aktar" (kütüphane alanını boş bırakın). İlk seferde Fotoğraflar uygulamasını kontrol izni isterse **İzin Ver** deyin.

Sanal ortam ve paketler `~/ArsivStudyo/venv` altına kurulur; klasörü taşısanız da çalışır. Kurulum kaydı: `~/ArsivStudyo/kurulum.log`.

### İleri düzey: elle kurulum

```bash
brew install ffmpeg                      # önerilir; yoksa imageio-ffmpeg'in taşınabilir ffmpeg'i kullanılır
cd neviral
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt pillow-heif imageio-ffmpeg "osxphotos>=0.77"
# pip install anthropic                  # isteğe bağlı: açıklama metnini Claude yazsın (ANTHROPIC_API_KEY)
python3 -m arsiv sunucu
```

Apple'ın kendi `python3`'ü (Xcode araçlarıyla gelen 3.9) da çalışır, ancak o sürümde `osxphotos` eski (0.68) kalır.

## Hızlı başlangıç

```bash
# 1) iCloud Fotoğraflar kütüphanesini indeksle (dosya kopyalamaz; ilk seferde büyük arşivde ~30-90 dk, sonrakiler çok daha hızlı)
python3 -m arsiv fotograflar

# 1b) Klasörleri de tarayabilirsiniz (iCloud Drive, harici disk, eski yedekler). Alt klasörler albüm sayılır.
python3 -m arsiv tara "/Volumes/Yedek/Videolar" ~/Downloads/EskiTelefon

# 2) Instagram dışa aktarımını içe aktar ve eski paylaşımları eşle
python3 -m arsiv instagram ~/Downloads/instagram-kullaniciadi-2026-09-30

# 3) Web arayüzünü aç
python3 -m arsiv sunucu           # http://127.0.0.1:8765
```

Instagram dışa aktarımı: Instagram › Ayarlar › Hesap Merkezi › Bilgilerin ve izinlerin › **Bilgilerini indir** › *Bazı bilgiler* › İçerik (gönderiler, reels, hikâyeler) › **JSON** formatı › Tüm zamanlar. Gelen zip'i açın, klasörü verin.

## Komut satırı

| Komut | Ne yapar |
|---|---|
| `arsiv fotograflar [--kutuphane yol]` | macOS Fotoğraflar / iCloud Fotoğraflar kütüphanesini içe aktarır |
| `arsiv tara <klasör…>` | Klasörleri tarar (yalnızca değişenleri yeniden işler) |
| `arsiv instagram <klasör> [--csv]` | Dışa aktarımı okur ve eşler; `--csv` ile Profesyonel Panel performans verisi |
| `arsiv ara "deniz" --tur video --yon dikey --min-sure 5 --max-sure 60 --paylasilmamis` | Filtreli arama |
| `arsiv adaylar` | Paylaşılmamış, en yüksek puanlı öğeler |
| `arsiv yeniden` | Yeniden paylaşım kuyruğu (eski, güçlü paylaşımlar) |
| `arsiv bugun [--tarih 2026-06-02]` | Bugün geçen yıllarda |
| `arsiv topla "Yaz 2019" --q "yaz tatili"` / `--adaylar` / `--yeniden` / `--id 12 15` | Öğeleri `~/ArsivStudyo/koleksiyonlar/<ad>` altında toplar (sert bağ; kopyalamaz) |
| `arsiv uret --sablon montaj --id 12 15 18 --baslik "…" --cta "…" --etiket @hesap --muzik sakin` | Video/carousel üretir |
| `arsiv uret --brief brief.json` | Ayrıntılı brief ile üretir (aşağıda) |
| `arsiv duzelt eski.mov --sabitle --baslik "Arşivden"` | Tek videoyu dikeye çevirir, sesi normalize eder, titreşimi alır |
| `arsiv hatirlat planla` / `liste` / `bildir` / `ics takvim.ics` | Hatırlatıcılar |
| `arsiv pazarlama aciklama --id 12 --baslik "…"` / `saatler` / `fikirler` | Açıklama & hashtag, en iyi saatler, fikirler |
| `arsiv durum` | Özet |

Veriler `~/ArsivStudyo/` altında tutulur (`arsiv.db`, `kucuk-resimler/`, `ciktilar/`, `koleksiyonlar/`). Başka yer için `ARSIV_HOME=/Volumes/Disk/ArsivStudyo`.

## Web arayüzü

`python3 -m arsiv sunucu` → tarayıcıda. Sağ üstteki menüden dil seçilir: **Türkçe / Deutsch / English** (açıklama, hashtag ve etiket metinleri de seçilen dilde üretilir).

- **Panel:** özet, bugün geçen yıl, içerik fikirleri, yaklaşan hatırlatıcılar
- **Kütüphane:** arama + filtreler (tür, yön, yıl, süre, paylaşım durumu, favori), küçük resim ızgarası, öğe detayı (ön izleme, puan gerekçeleri, albüm/kişi/etiketler), seçim
- **Adaylar:** paylaşılmamış en güçlü içerikler + yeniden paylaşım kuyruğu
- **Paylaşılanlar:** Instagram paylaşımları ve arşivdeki eşleşmeleri (elle düzeltilebilir)
- **Stüdyo:** brief formu, seçili öğeler (sıra, başlangıç sn, süre, etiket), üret, ön izle, açıklamayı kopyala, hatırlatıcı ekle
- **Hatırlatıcılar:** 4 haftalık plan, .ics, ekle/tamamla
- **Pazarlama:** açıklama & hashtag üretici, en iyi saatler, fikirler
- **İçe aktar:** Fotoğraflar, klasör, Instagram; iş günlükleri

## Şablonlar

| Şablon | Ne üretir |
|---|---|
| `montaj` | Foto (Ken Burns) + video kesitleri, geçişler, giriş kartı (başlık/alt başlık), yıl etiketleri, kapanış CTA, müzik |
| `tekli` | Tek foto/video hikâyesi; başlık + açıklama etiketi; videonun kendi sesi korunur |
| `eskiden-simdi` | Çiftler hâlinde üst-alt karşılaştırma ("ESKİDEN / ŞİMDİ" ya da kendi yazınız) |
| `alinti` | Bulanık/karartılmış fotoğraf üstünde büyük alıntı; MP4 + JPG |
| `carousel` | 1080×1350 kaydırmalı gönderi görselleri (sayaç, başlık, hesap) |
| `yeniden` | Eski videoyu düzeltir: dikey format (bulanık arka plan), ses -14 LUFS, isteğe bağlı titreşim giderme/gürültü azaltma, renk, başlık |

Yatay videolar dikey tuvale otomatik olarak bulanık arka planla sığdırılır (`sigdirma: kirp` ile kırpılır). iPhone HDR (HLG) videoları SDR'a ton eşlenir. HEIC fotoğraflar ve HEVC videolar desteklenir.

### Brief örneği (`brief.json`)

```json
{
  "sablon": "montaj", "format": "9:16",
  "baslik": "Deniz ile bir yaz", "altbaslik": "2019'dan bugüne",
  "cta": "Devamı profilde", "etiket": "@hesabim",
  "ogeler": [12, {"id": 15, "baslangic": 3.0, "sure": 5.0, "yazi": "İlk gün"}, 18],
  "foto_suresi": 3.0, "klip_max": 6.0, "max_sure": 60,
  "gecis": "rastgele", "gecis_suresi": 0.5, "sigdirma": "otomatik",
  "muzik": "sakin", "muzik_ses": 0.7, "orijinal_ses": 1.0,
  "vurgu": "#FFD166", "renk": "#101828", "yazi_tipi": "/Library/Fonts/Kendi-Yazi-Tipim.ttf",
  "kalite": "yuksek"
}
```

`muzik`: `sakin` | `enerjik` | `duygusal` (telifsiz, sentezlenir) | `yok` | bir ses dosyası yolu. `gecis`: ffmpeg xfade adları (`fade`, `smoothleft`, `circleopen`, `slideup`, `dissolve`, `zoomin`…) ya da `rastgele`.

## Hatırlatıcılar ve bildirimler

```bash
python3 -m arsiv hatirlat planla --hafta 4 --haftada 3   # yeniden paylaşım + "bugün geçen yıl"
python3 -m arsiv hatirlat ics ~/Desktop/arsiv.ics         # Takvim'e sürükleyin (uyarılı etkinlikler)
python3 -m arsiv hatirlat bildir                          # bugün/yarın için macOS bildirimi
```

Her sabah otomatik bildirim için `~/Library/LaunchAgents/com.arsiv.bildir.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.arsiv.bildir</string>
  <key>ProgramArguments</key><array>
    <string>/usr/bin/env</string><string>bash</string><string>-lc</string>
    <string>cd /PATH/neviral && .venv/bin/python -m arsiv hatirlat bildir</string>
  </array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
</dict></plist>
```

`launchctl load ~/Library/LaunchAgents/com.arsiv.bildir.plist`

## iCloud notları

- **"Mac Depolamasını Optimize Et" açıksa** orijinaller Mac'te olmayabilir. İndeksleme yine çalışır (Fotoğraflar'ın küçük resimlerini kullanır). Üretim sırasında eksik dosyalar `osxphotos export --download-missing` ile indirilmeye çalışılır; toplu çalışma için Fotoğraflar › Ayarlar › iCloud › **Orijinalleri Bu Mac'e İndir** en pratik yoldur (ya da harici bir diske indirip `arsiv tara`).
- `osxphotos` yoksa uygulama `Photos.sqlite` dosyasını doğrudan okur (albüm/kişi bilgisi sınırlı kalır).
- Klasör taramasında dosya adları ve alt klasörler arama metnine girer: `2019/Yaz Tatili/IMG_1234.MOV` → "2019", "Yaz Tatili".

## Test

```bash
python3 -m unittest tests.test_akis -v        # örnek arşiv üretir, tarar, eşler, render alır (~1 dk)
python3 tests/ornek_veri.py ~/Desktop/ornek   # denemek için sahte arşiv + Instagram dışa aktarımı
```

## Sınırlar / yol haritası

- Instagram "beğeni/erişim" sayıları dışa aktarımda gelmez; Profesyonel Panel'den CSV indirip `arsiv instagram dosya.csv --csv` ile ekleyin. Bu veri "en iyi saatler" ve yeniden paylaşım sırasını iyileştirir.
- Hikâye eşleşmelerinde medya dosyası yoksa tarih yakınlığı kullanılır (güven %15-60); Paylaşılanlar sekmesinden elle düzeltebilirsiniz.
- Otomatik gönderi yayınlama yoktur (Instagram API'si kişisel hesaplar için kapalı); çıktı + açıklama panoya kopyalanır, Finder'da açılır.
