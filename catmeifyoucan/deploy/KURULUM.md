# Cat Me If You Can – Yayına alma (Kurulum)

Bu rehberle oyunu kendi alan adınızla internete açarsınız. **Sizin seçeceğiniz tek şey alan
adı (domain).** Gerisini tek bir komut yapar: HTTPS (kilit işareti), verilerin saklanması, her
gece yedek, güncelleme.

Süre: yaklaşık 30 dakika (çoğu bekleme). Bilgisayar bilgisi gerekmez – komutları kopyalayıp
yapıştırmanız yeter.

> Örneklerde alan adı `kedi.ornek.com`, sunucunun IP adresi `203.0.113.10`. Bunları kendi
> bilgilerinizle değiştirin. En sonda [Almanca kısa özet](#kurzfassung-auf-deutsch) var.

---

## Neye ihtiyacınız var?

1. **Bir alan adı** – ör. `kedi.ornek.com` ya da `kedimeyakala.com`. Herhangi bir alan adı
   firmasından alınabilir.
2. **Küçük bir sunucu (VPS)** – **Ubuntu 24.04** (22.04 da olur), 1 işlemci, 1–2 GB RAM,
   20 GB disk yeterli. Herhangi bir VPS firması olur (Türkiye'de ya da yurt dışında).
   Fotoğraf ve takma ad gibi kişisel veriler bu sunucuda durur. KVKK (kişisel verilerin
   korunması) açısından sunucunun hangi ülkede olduğu önemli olabilir – emin değilseniz bir
   hukukçuya sorun.
3. **Bilgisayarınızda bir terminal** – Windows: *PowerShell*, Mac: *Terminal*.
4. *(İsteğe bağlı)* **Claude anahtarı** – yapay zekâ analizi için, sonradan da eklenebilir
   ([Adım 9](#adım-9--yapay-zekâ-claude--isteğe-bağlı)).

---

## Adım 1 – Sunucu kiralayın

1. VPS firmasında yeni bir sunucu açın, işletim sistemi olarak **Ubuntu 24.04** seçin.
2. Firma size **IP adresini** ve **root şifresini** (ya da SSH anahtarını) verir. Not edin.
3. Firmanın panelinde bir **güvenlik duvarı (firewall)** varsa şu portları açın:
   **22** (bağlantı), **80** ve **443** (TCP), ayrıca **443 UDP**.

## Adım 2 – Alan adını sunucuya yönlendirin (DNS)

Alan adı firmanızın panelinde **DNS** bölümünü açın ve yeni bir kayıt ekleyin:

| Tür | Ad (Name/Host) | Değer (Value) | TTL |
|---|---|---|---|
| **A** | `kedi` (adres `kedi.ornek.com` olacaksa) – ya da `@` (adres `ornek.com` olacaksa) | `203.0.113.10` | 300 veya varsayılan |

* `ornek.com` gibi çıplak bir alan adı kullanıyorsanız, isterseniz **`www`** için de aynı
  A kaydını ekleyin. Kurulum bunu görür ve `www.ornek.com`'u otomatik `ornek.com`'a yönlendirir.
* **AAAA (IPv6) kaydı eklemeyin** – sunucunuzun IPv6 adresini kesin bilmiyorsanız. Yanlış bir
  AAAA kaydı yüzünden HTTPS sertifikası alınamaz.
* **Cloudflare** kullanıyorsanız: kaydın yanındaki turuncu bulutu kapatın (**DNS only**).
* Yeni kaydın her yere yayılması **5–60 dakika** sürebilir. Kontrol: bilgisayarınızda
  `ping kedi.ornek.com` yazın – sunucunun IP adresi görünmeli.

## Adım 3 – Sunucuya bağlanın

Bilgisayarınızın terminalinde:

```bash
ssh root@203.0.113.10
```

İlk seferde soru gelirse `yes` yazın. Şifre yazılırken ekranda görünmez – normaldir.

> **Kullanıcı adınız `root` değilse** (ör. `ubuntu`): bu rehberdeki `root@` yerine her yerde
> kendi adınızı yazın (ör. `ssh ubuntu@203.0.113.10`). Sunucuda `bash deploy/…`,
> `nano deploy/.env` ve `grep … deploy/.env` komutlarının başına `sudo` koyun – ör.
> `sudo bash deploy/kur.sh …`. (Adım 4 ve 5'te `sudo` zaten yazılı.)

## Adım 4 – Docker'ı kurun

Sunucuda (tek satır):

```bash
curl -fsSL https://get.docker.com | sudo sh
```

Kontrol: `docker compose version` bir sürüm numarası göstermeli.

## Adım 5 – Projeyi sunucuya alın

**A) Zip dosyaları ile** (en kolayı). Tam paket birkaç parça halindedir
(`CatMeIfYouCan-TamPaket-1-proje.zip`, `…-2-videolar.zip`, `…-3-videolar.zip`, `…-4-videolar.zip`).
Hepsini aynı klasöre koyun. Bilgisayarınızın terminalinde, zip'lerin olduğu klasörde:

```bash
scp CatMeIfYouCan-TamPaket-*.zip root@203.0.113.10:
```

Sonra sunucuda – bütün parçalar aynı `catmeifyoucan` klasörüne açılır:

```bash
sudo apt-get update && sudo apt-get install -y unzip
for f in CatMeIfYouCan-TamPaket-*.zip; do unzip -o "$f"; done
cd catmeifyoucan
```

**B) Git ile:** `git clone https://github.com/fatmaku/Notion.git` (dal: `claude/zen-galileo-1fgw7m`; depo gizliyse GitHub hesabınızla giriş gerekir) ve ardından `cd Notion/catmeifyoucan`.

Doğru klasörde misiniz? `ls` yazınca `deploy`, `server`, `public` ve `server.js` görünmeli.

## Adım 6 – Tek komutla kurun

```bash
bash deploy/kur.sh kedi.ornek.com ben@ornek.com
```

* E-posta isteğe bağlıdır (sertifika ile ilgili nadir uyarılar için). Yazmazsanız komut size
  sorar – geçmek için **Enter**.
* Ardından **Claude anahtarını** sorar – yoksa **Enter** (sonradan eklenebilir).
* İlk kurulum 2–5 dakika sürer. Komut şunları yapar: DNS'i kontrol eder, ayar dosyasını
  (`deploy/.env`) ve **yönetici anahtarını** oluşturur, uygulamayı derler ve başlatır, HTTPS
  sertifikasını alır, her gece otomatik yedeği kurar.
* Sonunda site adreslerini ve **yönetici anahtarını** yazar. **Anahtarı güvenli bir yere not
  edin** (ör. şifre yöneticisi). Unutursanız: `grep ADMIN_TOKEN deploy/.env`.
* DNS uyarısı çıkarsa: biraz bekleyin ve **aynı komutu tekrar çalıştırın**. Tekrar çalıştırmak
  her zaman güvenlidir – veriler ve anahtarlar korunur.

## Adım 7 – Siteyi açın

* `https://kedi.ornek.com` – tanıtım sayfası
* `https://kedi.ornek.com/app.html` – oyun. Telefonda kamera ve konum çalışır (HTTPS sayesinde).
  Kadıköy dışında bir yakalama „Oyun alanının dışındasın“ diye reddedilir – bu doğru.

## Adım 8 – Yönetim sayfası (admin.html)

1. `https://kedi.ornek.com/admin.html` açın. Sayfa Almanca açılırsa üstten **TR** seçin.
2. **Yönetici anahtarı** alanına anahtarı yapıştırın → **Giriş**.

**Partner kafe eklemek** (sekme **Kafeler & yerler** → **Yeni partner kafe**):

* **İsim**, **Adres**, **Çalışma saatleri**
* **Enlem / Boylam**: Google Maps'te kafeye sağ tıklayın – ilk satırdaki iki sayı
  (ör. `40.98712, 29.02634`): birincisi **Enlem**, ikincisi **Boylam**.
* **Gerekli kedi** (ör. 20) ve **İndirim %** (ör. 20) – kafenin ödülü
* **Günlük en fazla** – boş bırakılırsa sınırsız
* **PIN** – 6–12 rakam. Kafeye bu PIN'i verin. → **Kaydet**

Kafe personeli kasadaki telefon/tablette `https://kedi.ornek.com/partner.html` açar, kafeyi
seçer, PIN'i girer ve kuponları kontrol eder (ayrıntılar: `docs/PARTNER.md`). Kafenin kendi QR
kodu ve masa kartı da orada.

* **PIN değiştirmek:** listede kafeyi açın, yeni PIN yazın → **Kaydet** (eski oturumlar kapanır).
* **Oyuncuların önerdiği yerler:** sekme **İnceleme** → **Yer önerileri** → **Onayla** / **Reddet**.
* **İnceleme** sekmesinde ayrıca olası tekrar kayıtlar (aynı kedi iki kez), itirazlar ve
  şüpheli yakalamalar durur.
* **Başka birine yetki vermek:** sekme **Oyuncular** → kişinin **Rol**'ünü `admin` yapın
  (gönüllüler için `volunteer`). O kişi kendi hesabıyla yönetim sayfasını kullanabilir.

## Adım 9 – Yapay zekâ (Claude) – isteğe bağlı

**Ne işe yarar?** Fotoğraftan kedinin yaşını, kilosunu, beslenme durumunu, sağlığını ve kulak
işaretini (kısırlaştırılmış mı) tahmin eder, aynı kediyi tekrar tanır ve kedi isimlerini her
dilde kontrol eder. Anahtar yoksa **basit analiz** çalışır: sadece tüy rengi/deseni.

**Maliyet:** Kullandıkça ödenir – her yakalama fotoğrafını Claude inceler, yani tutar yakalama
sayısına bağlıdır. Güncel fiyatlar Anthropic'in sitesinde yazar; ne kadar tuttuğunu Anthropic
panelinde görürsünüz.
Varsayılan model `claude-opus-5-5`; daha ucuz bir model `deploy/.env` içinde `CATME_MODEL=`
ile seçilebilir. **Mutlaka** Anthropic panelinde aylık harcama sınırı koyun.

**Eklemek:**

1. `https://console.anthropic.com` → hesap açın → bakiye yükleyin → **API Keys** → yeni anahtar
   (`sk-ant-…`).
2. Sunucuda ayar dosyasını açın: `nano deploy/.env`
3. `ANTHROPIC_API_KEY=` satırının sonuna anahtarı yapıştırın. Kaydet: **Ctrl+O**, **Enter**,
   çık: **Ctrl+X**.
4. `bash deploy/kur.sh` → sonunda „Yapay zekâ: Claude açık“ yazmalı.

**Kapatmak:** `deploy/.env` içinde `CATME_AI=off` yazın (ya da anahtarı silin), sonra
`bash deploy/kur.sh`.

## Adım 10 – Yedekler

* **Otomatik:** her gece 01:17'de (sunucu saati; çoğu sunucuda UTC = İstanbul 04:17).
  Yedekler projenin `yedekler/` klasöründe durur, en yeni 14 tanesi saklanır.
* **Elle yedek:** `bash deploy/yedek.sh` (site açık kalır).
* **Kendi bilgisayarınıza indirin** (sunucu bozulursa diye) – bilgisayarınızın terminalinde:
  `scp 'root@203.0.113.10:catmeifyoucan/yedekler/*.tar.gz' .`
  (Yedek dosyalarını sadece onları oluşturan kullanıcı okuyabilir. `root` değilseniz önce
  sunucuda: `sudo chown -R $USER yedekler`.)
* **Geri yükleme:** `bash deploy/geri-yukle.sh yedekler/catme-yedek-2026-10-08_011700.tar.gz`
  – „EVET“ yazarak onaylarsınız. Önce şimdiki hâlin yedeği otomatik alınır.
* **Yeni sunucuya taşımak:** yeni sunucuda Adım 4–5'i yapın. Eski sunucudaki `deploy/.env`
  dosyasını yeni sunucuda yine `deploy/` klasörüne, son yedeği `yedekler/` klasörüne kopyalayın.
  Sonra `bash deploy/kur.sh` (alan adını `.env`'den okur), `bash deploy/geri-yukle.sh <yedek>`
  ve en son DNS'teki IP adresini yeni sunucununkiyle değiştirin. DNS değişince
  `bash deploy/kur.sh` komutunu bir kez daha çalıştırın (sertifika hemen alınsın).

## Adım 11 – Güncelleme

```bash
bash deploy/guncelle.sh
```

Yeni sürümü alır (git ile), önce yedek alır, yeniden derler ve başlatır. Site birkaç saniye
„Kısa bir bakım“ sayfası gösterir. Veriler, anahtarlar ve sertifikalar korunur.

Zip ile kurduysanız: yeni zip parçalarını sunucuya kopyalayın, aynı yerde
`for f in CatMeIfYouCan-TamPaket-*.zip; do unzip -o "$f"; done`
(`deploy/.env` ve `yedekler/` zip'te olmadığı için silinmez), sonra `bash deploy/guncelle.sh`.

---

## Demo modu

Demo açıkken boş bir sunucuya **örnek kediler, örnek kafeler (PIN `246810`) ve örnek
oyuncular** eklenir; harita ve istatistikler dolu görünür. Hepsi „DEMO“ diye işaretlidir.

* **Açmak:** `deploy/.env` içinde `CATME_DEMO=1`, sonra `bash deploy/sifirla.sh` (veriler
  varsa) ya da `bash deploy/kur.sh` (site henüz boşsa). Örnekler sadece boş sunucuya eklenir.
* **Gerçek yayın için kapatmak:** `CATME_DEMO=0` yapın, sonra `bash deploy/sifirla.sh` – bu
  **bütün verileri siler** (önce otomatik yedek alınır) ve site temiz başlar.
* **Gerçek yayında demoyu açık bırakmayın:** örnek kafelerin PIN'i herkesçe bilinir.
* Sunucuya dokunmadan göstermek için her zaman `https://kedi.ornek.com/app.html?demo=1` var
  (veriler sadece o tarayıcıda kalır).

---

## Sık karşılaşılan sorunlar

| Sorun | Çözüm |
|---|---|
| „Docker kurulu değil“ | [Adım 4](#adım-4--dockerı-kurun). |
| „permission denied“ / izin yok | Komutun başına `sudo` yazın ya da önce `sudo -i`. |
| DNS uyarısı, site açılmıyor | `ping kedi.ornek.com` sunucunun IP'sini göstermeli. Yeni kayıtlar 5–60 dk sürer. Sonra `bash deploy/kur.sh` tekrar. |
| HTTPS / sertifika yok | Kayıtlara bakın: `cd deploy && docker compose logs --tail 50 caddy` („challenge failed“, „NXDOMAIN“, „timeout“ = DNS veya port sorunu). Yanlış AAAA kaydı varsa silin. DNS düzelince `bash deploy/kur.sh` tekrar – Caddy sertifikayı hemen yeniden dener. Çok başarısız deneme olduysa Let's Encrypt bir süre bekletir; Caddy sonra kendiliğinden tekrar dener. |
| 80/443 portu dolu | Genelde apache2 veya nginx: `sudo systemctl disable --now apache2 nginx`, sonra `bash deploy/kur.sh`. Kim kullanıyor: `sudo ss -ltnp \| grep -E ':(80\|443) '` |
| Güvenlik duvarı | Firma panelinde 80, 443 (TCP) ve 443 (UDP) açık olmalı. Sunucuda ufw açıksa kur.sh izni kendisi ekler; elle: `sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 443/udp` |
| „toomanyrequests“ (Docker Hub) | Bir süre bekleyin ya da ücretsiz bir Docker Hub hesabıyla `docker login`, sonra tekrar. |
| Uygulama başlamıyor | `cd deploy && docker compose logs --tail 100 app` |
| Yönetici anahtarını unuttum | `grep ADMIN_TOKEN deploy/.env`. Değiştirmek: satırı silin → `bash deploy/kur.sh` yenisini üretir. |
| Kamera açılmıyor | Adres `https://` ile başlamalı (kilit işareti) ve tarayıcıda kamera izni verilmeli. |
| Disk doldu | `df -h`. Eski imajları ve derleme artıklarını silmek: `docker image prune -f && docker builder prune -f`. **Asla** `docker compose down -v` ya da `docker volume prune` yazmayın – veriler silinir! |
| Durum | `cd deploy && docker compose ps` – `app` „healthy“ olmalı. |

**Harita:** Varsayılan harita OpenStreetMap'ten gelir; az trafik için uygundur. Çok ziyaretçi
olursa bir harita servisi alıp `deploy/.env` içinde `CATME_TILES=` ve `CATME_TILES_ATTRIB=`
doldurun.

**Oyun kuralları** (ileri düzey): ör. günlük hedefi 15 yapmak için sunucuda
`cd deploy && echo '{"dailyGoal": 15}' | docker compose exec -T app sh -c 'cat > /data/game.override.json' && docker compose restart app`

---

## Docker'sız kurulum (ileri düzey)

Docker istemiyorsanız uygulama doğrudan Node ile, Caddy de sistem servisi olarak çalışır.
(Bu yolda `yedek.sh`, `guncelle.sh` gibi betikler kullanılmaz.)

```bash
# 1) Node 22 ve Caddy (Ubuntu 24.04; „caddy“ paketi bulunamazsa: caddyserver.com/docs/install)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs caddy

# 2) Kullanıcı ve dosyalar
sudo useradd --system --home /var/lib/catme --shell /usr/sbin/nologin catme
sudo mkdir -p /opt/catmeifyoucan && sudo cp -r server.js server public package.json package-lock.json deploy /opt/catmeifyoucan/
sudo chmod -R a+rX /opt/catmeifyoucan
cd /opt/catmeifyoucan && sudo npm ci --omit=dev --ignore-scripts

# 3) Ayarlar (gizli – sadece root okuyabilir)
sudo install -m 600 /dev/null /etc/catme.env
echo "CATME_PUBLIC_URL=https://kedi.ornek.com" | sudo tee -a /etc/catme.env
echo "ADMIN_TOKEN=$(openssl rand -hex 24)" | sudo tee -a /etc/catme.env
# isteğe bağlı: echo "ANTHROPIC_API_KEY=sk-ant-…" | sudo tee -a /etc/catme.env

# 4) Uygulama servisi (veriler: /var/lib/catme)
sudo cp deploy/catme.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now catme
curl http://127.0.0.1:8790/api/health          # {"ok":true,…}

# 5) Caddy (HTTPS) – ALAN.ADI yerine kendi alan adınız
sed 's/ALAN\.ADI/kedi.ornek.com/g' deploy/Caddyfile.host | sudo tee /etc/caddy/Caddyfile >/dev/null
sudo systemctl reload caddy

# 6) Güvenlik duvarı
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 443/udp
```

* **Kayıtlar:** `journalctl -u catme -f` · **Yönetici anahtarı:** `sudo grep ADMIN_TOKEN /etc/catme.env`
* **Yedek:** `sudo tar czf /root/catme-yedek-$(date +%F).tar.gz -C /var/lib/catme .`
* **Geri yükleme:** `sudo systemctl stop catme`, sonra
  `sudo find /var/lib/catme -mindepth 1 -delete` (içini boşaltır),
  `sudo tar xzf <yedek> -C /var/lib/catme && sudo chown -R catme:catme /var/lib/catme`,
  `sudo systemctl start catme`.
* **Güncelleme:** yeni dosyaları `/opt/catmeifyoucan` içine kopyalayın,
  `sudo npm ci --omit=dev --ignore-scripts`, `sudo systemctl restart catme`.
* `www` yönlendirmesi için `Caddyfile.host` dosyasının sonundaki satırların başındaki `#`'i
  kaldırın.

## Sunucusuz vitrin (sadece demo)

`public/` klasörü tek başına herhangi bir statik barındırmada (GitHub Pages, Netlify – klasörü
sürükleyip bırakmak yeter –, Cloudflare Pages …) **tarayıcı demosu** olarak çalışır. Sunucu
bulunamayınca oyun kendiliğinden demo moduna geçer.

* Veriler sadece ziyaretçinin kendi tarayıcısında kalır – **ortak harita yok**, başkalarının
  kedileri görünmez.
* **Yapay zekâ yok** (sadece basit analiz), gerçek kafe/kupon yok, WhatsApp link önizlemesi yok.
* Tanıtım sayfası „Demo“ yazan örnek sayılar gösterir.

Bu sadece **vitrin** içindir (ör. yatırımcıya, kafeye göstermek). Gerçek oyun için yukarıdaki
sunucu kurulumu gerekir.

---

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `deploy/kur.sh` | Kurulum ve her türlü yeniden başlatma – tekrar çalıştırmak güvenli |
| `deploy/guncelle.sh` | Yeni sürüm + yedek + yeniden başlatma |
| `deploy/yedek.sh` · `deploy/geri-yukle.sh` | Yedek almak · yedeği geri yüklemek |
| `deploy/sifirla.sh` | Bütün oyun verilerini silip temiz başlamak (ör. demodan sonra) |
| `deploy/.env` | Ayarlar ve gizli anahtarlar (kur.sh oluşturur, git'e girmez). Şablon: `deploy/.env.example` |
| `deploy/docker-compose.yml` · `Dockerfile` | Uygulama + Caddy (HTTPS) konteynerleri |
| `deploy/Caddyfile` | HTTPS, yönlendirmeler, bakım sayfası (değiştirmeye gerek yok) |
| `deploy/catme.service` · `deploy/Caddyfile.host` | Docker'sız kurulum |
| `yedekler/` | Yedek dosyaları |

Veriler Docker'da `catme_app-data` adlı birimde (volume) durur, sertifikalar `catme_caddy-data`
biriminde. Güncelleme ve yeniden kurulum bunlara dokunmaz.

---

## Kurzfassung auf Deutsch

**Ziel:** Online gehen und dabei nur die Domain wählen. Alles andere erledigt `deploy/kur.sh`.

1. **Server:** kleiner VPS mit Ubuntu 24.04 (1 CPU, 1–2 GB RAM, 20 GB). Beim Anbieter-Firewall
   Ports 22, 80, 443/tcp und 443/udp öffnen.
2. **DNS:** A-Record der Domain (z. B. `kedi.ornek.com`) auf die Server-IP. Keinen AAAA-Record,
   wenn die IPv6-Adresse nicht sicher stimmt. Bei Cloudflare „DNS only“. Optional `www` als
   A-Record – dann leitet Caddy `www` automatisch auf die Domain um.
3. **Docker:** `ssh root@<IP>`, dann `curl -fsSL https://get.docker.com | sudo sh`. Ohne
   root-Login: eigener Benutzername bei `ssh`/`scp`, auf dem Server `sudo` vor die Befehle.
4. **Projekt** auf den Server (Zip per `scp` + `unzip`, oder `git clone`), `cd catmeifyoucan`.
5. **Ein Befehl:** `bash deploy/kur.sh kedi.ornek.com ich@example.com` – prüft Docker und DNS,
   legt `deploy/.env` mit erzeugtem `ADMIN_TOKEN` an (bestehende Geheimnisse werden nie
   überschrieben), fragt optional nach dem Claude-Key, baut und startet App + Caddy
   (Let's-Encrypt-Zertifikat automatisch, HTTP/3), wartet auf „healthy“, richtet die nächtliche
   Sicherung ein (`/etc/cron.d/catmeifyoucan`, 14 Stück in `yedekler/`) und zeigt Adressen und
   Admin-Token. Erneut ausführen = Update/Neustart, Daten bleiben.
6. **Moderation:** `https://<domain>/admin.html` mit dem Admin-Token. Unter „Cafés & Orte“
   Partner-Cafés anlegen (Koordinaten, Belohnung, PIN 6–12 Ziffern), Vorschläge freigeben. Das
   Café nutzt `partner.html` mit seiner PIN.
7. **Claude (optional):** `ANTHROPIC_API_KEY=` in `deploy/.env` eintragen → `bash deploy/kur.sh`.
   Kosten nach Verbrauch (hängt von der Zahl der Fänge ab, Preise laut Anthropic); Ausgabenlimit in der
   Anthropic-Konsole setzen. `CATME_AI=off` schaltet die KI ab, `CATME_MODEL=` wählt ein
   günstigeres Modell (Standard `claude-opus-5-5`).
8. **Sicherung:** `bash deploy/yedek.sh` (läuft ohne Unterbrechung, wiederholt sich automatisch,
   falls während der Sicherung verdichtet wurde; `geri-yukle.sh`, `sifirla.sh` und `guncelle.sh`
   sichern vorher immer, auch bei gestoppter App) · Zurückspielen: `bash deploy/geri-yukle.sh
   <datei>` · Update: `bash deploy/guncelle.sh` (git pull, Sicherung, neu bauen) · Alles
   löschen (z. B. nach der Demo): `bash deploy/sifirla.sh`.
9. **Demo:** `CATME_DEMO=1` legt Beispieldaten nur in einen leeren Speicher (Demo-Cafés mit
   bekannter PIN 246810 – im echten Betrieb aus lassen). Abschalten löscht sie nicht → `sifirla.sh`.
10. **Ohne Docker:** `deploy/catme.service` (systemd, Benutzer `catme`, Daten in
    `/var/lib/catme`, Einstellungen in `/etc/catme.env`) + `deploy/Caddyfile.host` – Schritte
    oben im Abschnitt „Docker'sız kurulum“.
11. **Nur Schaufenster ohne Server:** `public/` auf einen statischen Host legen – läuft als
    Browser-Demo (Daten nur im Browser, keine KI, keine gemeinsame Karte).

**Technische Details:** Caddy läuft mit `network_mode: host`, damit die App auch bei IPv6 die
echte Besucher-IP sieht (Ratenbegrenzung pro IP); die App lauscht nur auf `127.0.0.1:8790`
(`TRUST_PROXY=1`, `CATME_PUBLIC_URL=https://<domain>`). Caddy packt nicht selbst (`encode`
fehlt absichtlich) – die App liefert brotli/gzip mit eigenen ETags, Caddy reicht das durch.
Die Sicherheitsköpfe (CSP usw.) kommen von der App, Caddy ergänzt nur HSTS. Body-Limit 8 MB
(die App selbst nimmt pro Fang höchstens ~3,6 MB). Bei 502 zeigt Caddy eine kurze
Wartungsseite. Das Image läuft als Benutzer `node`, enthält nur `server.js`, `server/`,
`public/` und die Produktions-Abhängigkeiten, Healthcheck per `node` auf `/api/health`. Beide
Container laufen schreibgeschützt (`read_only`, nur Volumes und `/tmp` beschreibbar), ohne
Capabilities (Caddy nur `NET_BIND_SERVICE`) und mit `no-new-privileges`; `deploy/.env` hat
Modus 600.
