# Arşiv Stüdyo

iCloud'daki 2 TB fotoğraf-video arşivinden **hazır paylaşım videoları** (hikâye, reel, carousel) üreten, eski paylaşımlarınızı bulan ve yeniden paylaşmanızı hatırlatan **yerel** bir uygulama. Mac'inizde çalışır; hiçbir dosya buluta gönderilmez.

Neden bu yaklaşım "en kolayı":

- **Kopyalamaz, indeksler.** 2 TB'ı bir yere taşımaz; yalnızca meta veriyi (tarih, süre, oran, albüm, kişi, etiket) küçük bir SQLite veritabanına yazar. Fotoğraflar uygulamasının kendi küçük resimlerini kullanır, orijinaller iCloud'da kalabilir.
- **Aramayı çözer.** "2019 yaz tatili dikey video 10-60 sn, hiç paylaşılmamış" gibi soruları saniyeler içinde yanıtlar (tam metin arama + filtreler).
- **Puanlar.** Her öğeye 0-100 arası "sosyal medya uygunluk" puanı verir (dikey format, ideal süre, çözünürlük, favori, düzenlenmiş, kişi var, Apple'ın estetik puanı…). "Tutabilir" içerikleri öne çıkarır.
- **Eski paylaşımlarınızı bulur.** Instagram "Bilgilerini indir" dışa aktarımını okur, paylaştığınız her şeyi arşivdeki orijinaliyle eşler (görsel hash + tarih). Böylece **hangi videoyu ne zaman paylaştığınızı** ve neyi hiç paylaşmadığınızı görürsünüz.
- **Üretir.** Seçtiğiniz öğeler ve birkaç satır brief ile ffmpeg üzerinden Ken Burns hareketli fotoğraflar, video kesitleri, geçişler, giriş/kapanış kartları, hesap etiketi, telifsiz müzik, ses normalizasyonu… Çıktı Instagram/TikTok'a yüklemeye hazır 1080×1920 MP4 + kapak + açıklama metni.
- **Hatırlatır.** Yeniden paylaşım kuyruğunu haftalara dağıtır, "bugün geçen yıl" önerir, macOS bildirimi ve Takvim (.ics) desteği vardır.
- **Pazarlama.** Açıklama + hashtag + kanca cümlesi üretir (isteğe bağlı Claude ile), performans CSV'nizden en iyi paylaşım saatlerini çıkarır, içerik fikirleri önerir.

## Kurulum (macOS)

```bash
brew install ffmpeg                      # video işleme (zorunlu)
cd arsiv-studyo
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt          # pillow + numpy
pip install osxphotos pillow-heif        # önerilir: Fotoğraflar kütüphanesi + HEIC
# pip install anthropic                  # isteğe bağlı: açıklama metnini Claude yazsın (ANTHROPIC_API_KEY)
```

Terminal'e **Sistem Ayarları › Gizlilik ve Güvenlik › Tam Disk Erişimi** verin (Fotoğraflar kütüphanesini okumak için).

## Hızlı başlangıç

```bash
# 1) iCloud Fotoğraflar kütüphanesini indeksle (dosya kopyalamaz; 2 TB için dakikalar sürer)
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

`python3 -m arsiv sunucu` → tarayıcıda:

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
    <string>cd /PATH/arsiv-studyo && .venv/bin/python -m arsiv hatirlat bildir</string>
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
