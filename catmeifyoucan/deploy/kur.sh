#!/usr/bin/env bash
# Cat Me If You Can – tek komutla yayına alma (ve güncelleme).
#
#   bash deploy/kur.sh kedi.ornek.com                  ilk kurulum
#   bash deploy/kur.sh kedi.ornek.com ben@ornek.com    e-posta ile (sertifika bildirimleri)
#   bash deploy/kur.sh                                 tekrar: deploy/.env'deki alan adıyla günceller
#
# İsteğe bağlı ortam değişkenleri (Optionen):
#   ANTHROPIC_API_KEY=sk-ant-…   Claude anahtarını deploy/.env'e yazar
#   CATME_DEMO=1 | 0             demo verileri (yalnızca boş sunucuda eklenir)
#   DNS_KONTROL=0                DNS/IP kontrolünü atla
#   OTOMATIK_YEDEK=0             her gece otomatik yedeği (cron) kurma
#   UFW=0                        güvenlik duvarına (ufw) dokunma
#
# Tekrar çalıştırmak güvenlidir: veriler, sertifikalar ve anahtarlar korunur.
# (Erneut ausführen ist sicher: Daten, Zertifikate und Schlüssel bleiben erhalten.)

# shellcheck disable=SC1111 # typografische Anführungszeichen in den Meldungen sind gewollt

set -euo pipefail
# shellcheck source=deploy/ortak.sh
source "$(dirname "${BASH_SOURCE[0]}")/ortak.sh"

kullanim() {
  cat <<'EOF'
Kullanım:  bash deploy/kur.sh <alan-adı> [e-posta]
Örnek:     bash deploy/kur.sh kedi.ornek.com ben@ornek.com

Alan adının DNS kaydı (A) bu sunucunun IP adresini göstermeli.
Ayrıntılar: deploy/KURULUM.md
EOF
}

alan_adi_duzelt() {
  local d
  d="$(printf '%s' "$1" | LC_ALL=C tr '[:upper:]' '[:lower:]')"
  d="${d#http://}"
  d="${d#https://}"
  d="${d%%/*}"
  d="${d%.}"
  printf '%s' "$d"
}

alan_adi_gecerli() {
  local d="$1"
  local LC_ALL=C
  [[ ${#d} -le 253 ]] || return 1
  [[ $d =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$ ]] || return 1
  [[ ! $d =~ ^[0-9.]+$ ]] || return 1 # IP-Adresse ist keine Domain
  [[ ${d##*.} =~ [a-z] ]] || return 1
}

yeni_anahtar() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  else
    head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

genel_ip() { # $1 = 4 | 6 → öffentliche Adresse dieses Servers (oder nichts)
  command -v curl >/dev/null 2>&1 || return 0
  local u ip
  local -a adresler
  if [ "$1" = 4 ]; then adresler=(https://api.ipify.org https://ipv4.icanhazip.com); else adresler=(https://api6.ipify.org https://ipv6.icanhazip.com); fi
  for u in "${adresler[@]}"; do
    ip="$(curl -"$1" -fsS --max-time 5 "$u" 2>/dev/null | tr -d '[:space:]' | LC_ALL=C tr '[:upper:]' '[:lower:]' || true)"
    if [ "$1" = 4 ] && [[ $ip =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then printf '%s' "$ip" && return 0; fi
    if [ "$1" = 6 ] && [[ $ip =~ ^[0-9a-f:]+$ ]] && [[ $ip == *:* ]]; then printf '%s' "$ip" && return 0; fi
  done
  return 0
}

dns_coz() { # $1 = Name, $2 = A | AAAA → eine Adresse pro Zeile
  if command -v dig >/dev/null 2>&1; then
    if [ "$2" = A ]; then
      dig +short A "$1" 2>/dev/null | grep -E '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' | sort -u || true
    else
      dig +short AAAA "$1" 2>/dev/null | grep -E '^[0-9a-fA-F:]+$' | grep ':' | LC_ALL=C tr '[:upper:]' '[:lower:]' | sort -u || true
    fi
  elif command -v getent >/dev/null 2>&1; then
    if [ "$2" = A ]; then
      getent ahostsv4 "$1" 2>/dev/null | awk '{print $1}' | sort -u || true
    else
      getent ahostsv6 "$1" 2>/dev/null | awk '{print $1}' | grep -v '^::ffff:' | LC_ALL=C tr '[:upper:]' '[:lower:]' | sort -u || true
    fi
  fi
}

satirlarda() { # $1 = gesuchte Zeile, $2 = Liste
  [ -n "$1" ] && grep -qxF -- "$1" <<<"$2"
}

# DNS prüfen – warnt nur, bricht nie ab. Setzt DNS_OK=1|0 und WWW_DURUM=evet|hayir|bilinmiyor.
dns_kontrol() {
  local d="$1" ip4 ip6 a aaaa wa
  DNS_OK=0
  WWW_DURUM=bilinmiyor
  if [ "${DNS_KONTROL:-1}" = 0 ]; then
    bilgi "DNS kontrolü atlandı (DNS_KONTROL=0)."
    return 0
  fi
  bilgi "DNS kontrol ediliyor: $d"
  ip4="$(genel_ip 4)"
  ip6="$(genel_ip 6)"
  a="$(dns_coz "$d" A)"
  aaaa="$(dns_coz "$d" AAAA)"
  if [ -z "$a" ] && [ -z "$aaaa" ]; then
    uyari "$d için DNS kaydı bulunamadı. Alan adı panelinizde bir A kaydı ekleyin: $d → ${ip4:-<sunucu IP>}"
    uyari "Yeni kayıtların yayılması 5–60 dakika sürebilir. Sonra bu komutu tekrar çalıştırın."
  elif [ -z "$ip4" ]; then
    uyari "Bu sunucunun genel IP adresi öğrenilemedi – DNS karşılaştırması atlandı ($d → ${a//$'\n'/ } ${aaaa//$'\n'/ })."
    DNS_OK=1
  elif satirlarda "$ip4" "$a"; then
    tamam "DNS doğru: $d → $ip4"
    DNS_OK=1
  else
    uyari "$d şu adresi gösteriyor: ${a//$'\n'/ } – bu sunucu ise: $ip4"
    uyari "Alan adı panelinizde A kaydını $ip4 yapın (Cloudflare kullanıyorsanız: turuncu bulut KAPALI, „DNS only“)."
  fi
  if [ -n "$aaaa" ]; then
    if [ -z "$ip6" ]; then
      uyari "$d için bir AAAA (IPv6) kaydı var (${aaaa//$'\n'/ }), ama bu sunucu IPv6 ile dışarı çıkamıyor."
      uyari "Let's Encrypt önce IPv6'yı dener – sertifika alınamazsa AAAA kaydını silin."
    elif ! satirlarda "$ip6" "$aaaa"; then
      uyari "AAAA (IPv6) kaydı (${aaaa//$'\n'/ }) bu sunucunun IPv6 adresinden ($ip6) farklı. Emin değilseniz AAAA kaydını silin."
    fi
  fi
  # www.<domain> → nur wenn es ebenfalls auf diesen Server zeigt (sonst schlägt das Zertifikat fehl)
  if [[ $d == www.* ]]; then
    WWW_DURUM=hayir
  elif [ -n "$ip4" ]; then
    wa="$(dns_coz "www.$d" A)"
    if satirlarda "$ip4" "$wa"; then WWW_DURUM=evet; else WWW_DURUM=hayir; fi
  fi
}

port_kontrol() {
  command -v ss >/dev/null 2>&1 || return 0
  [ -n "$(dc ps -q --status running caddy 2>/dev/null || true)" ] && return 0 # unser Caddy belegt sie selbst
  local dolu
  dolu="$(ss -Hltnp 2>/dev/null | awk '$4 ~ /:(80|443)$/ {print $4, $6}' || true)"
  if [ -n "$dolu" ]; then
    uyari "80/443 portlarını başka bir program kullanıyor:"
    printf '      %s\n' "$dolu" >&2
    uyari "Çoğunlukla apache2 veya nginx'tir. Kapatmak için: sudo systemctl disable --now apache2 nginx"
  fi
}

ufw_kontrol() {
  [ "${UFW:-1}" = 0 ] && return 0
  command -v ufw >/dev/null 2>&1 || return 0
  [ "$(id -u)" = 0 ] || return 0
  local durum
  durum="$(LC_ALL=C ufw status 2>/dev/null || true)"
  grep -q '^Status: active' <<<"$durum" || return 0
  bilgi "Güvenlik duvarı (ufw) açık – 80 ve 443 portlarına izin veriliyor."
  if ! { ufw allow 80/tcp >/dev/null && ufw allow 443/tcp >/dev/null && ufw allow 443/udp >/dev/null; }; then
    uyari "ufw kuralı eklenemedi. Elle: sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 443/udp"
  fi
}

cron_kur() {
  [ "${OTOMATIK_YEDEK:-1}" = 0 ] && return 0
  if [ "$(id -u)" != 0 ] || [ ! -d /etc/cron.d ]; then
    bilgi "Otomatik yedek kurulmadı (root değil veya cron yok). Elle yedek: bash deploy/yedek.sh"
    return 0
  fi
  cat >/etc/cron.d/catmeifyoucan <<EOF
# Cat Me If You Can – her gece 01:17'de (sunucu saati) yedek. deploy/kur.sh yazdı.
# Kapatmak için bu dosyayı silin: sudo rm /etc/cron.d/catmeifyoucan
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
17 1 * * * root bash "$DEPLOY/yedek.sh" >>/var/log/catme-yedek.log 2>&1
EOF
  chmod 644 /etc/cron.d/catmeifyoucan
}

https_acik() { curl -fsS --max-time 8 -o /dev/null "https://$1/api/health" 2>/dev/null; }

# Läuft Caddy schon länger (> 2 min) und HTTPS geht noch nicht, wartet Caddy nach einem früheren
# Fehlversuch (DNS war noch nicht da) womöglich lange bis zum nächsten Versuch. Stimmt DNS jetzt,
# lohnt ein Neustart: Caddy versucht das Zertifikat sofort wieder (ein Versuch – kein Risiko für
# die Let's-Encrypt-Grenzen).
caddy_tekrar_denesin() {
  local cid basla
  cid="$(dc ps -q caddy 2>/dev/null || true)"
  [ -n "$cid" ] || return 0
  basla="$(docker inspect -f '{{.State.StartedAt}}' "$cid" 2>/dev/null || true)"
  basla="$(date -d "$basla" +%s 2>/dev/null || echo 0)"
  if [ "$basla" -gt 0 ] && [ $(($(date +%s) - basla)) -gt 120 ]; then
    bilgi "Caddy yeniden başlatılıyor – sertifikayı hemen tekrar denesin…"
    dc restart caddy >/dev/null 2>&1 || true
  fi
}

main() {
  case "${1:-}" in -h | --help | yardim | yardım)
    kullanim
    exit 0
    ;;
  esac
  [ $# -le 2 ] || {
    kullanim
    hata "Fazla bilgi verildi."
  }

  echo "🐾  Cat Me If You Can – kurulum"
  docker_kontrol

  # ---- Alan adı ve e-posta
  local alan eposta eski_alan
  eski_alan="$(env_get SITE_DOMAIN)"
  if [ "$eski_alan" = kedi.ornek.com ]; then eski_alan=""; fi
  alan="$(alan_adi_duzelt "${1:-$eski_alan}")"
  if [ -z "$alan" ]; then
    kullanim
    hata "Alan adı eksik."
  fi
  if ! alan_adi_gecerli "$alan"; then
    if LC_ALL=C grep -q '[^ -~]' <<<"$alan"; then
      hata "Alan adında Türkçe/özel harf var ($alan). Panelinizde gösterilen „xn--…“ (punycode) yazımını kullanın."
    fi
    hata "Geçersiz alan adı: „$alan“. Örnek: kedi.ornek.com (https:// ve / olmadan)."
  fi
  eposta="${2:-${ACME_EMAIL:-}}"
  if [ -n "$eposta" ] && [[ ! $eposta =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
    hata "Geçersiz e-posta: $eposta"
  fi

  # ---- deploy/.env (einmal anlegen, Geheimnisse nie überschreiben)
  local ilk=0 yeni_token=0
  umask 077
  if [ ! -f "$ENV_DOSYA" ]; then
    cp "$ORNEK_ENV" "$ENV_DOSYA"
    chmod 600 "$ENV_DOSYA"
    ilk=1
    bilgi "Ayar dosyası oluşturuldu: $ENV_DOSYA"
  fi
  if [ -n "$eski_alan" ] && [ "$eski_alan" != "$alan" ]; then
    uyari "Alan adı değişiyor: $eski_alan → $alan"
  fi
  env_set SITE_DOMAIN "$alan"

  if [ "$ilk" = 1 ] && [ -z "$eposta" ] && [ -t 0 ]; then
    read -r -p "E-posta adresiniz (sertifika bildirimleri için, isteğe bağlı – geçmek için Enter): " eposta || true
    if [ -n "$eposta" ] && [[ ! $eposta =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
      uyari "Geçersiz e-posta, atlandı: $eposta"
      eposta=""
    fi
  fi
  if [ -n "$eposta" ]; then env_set ACME_EMAIL "$eposta"; fi

  local token
  token="$(env_get ADMIN_TOKEN)"
  if [ -z "$token" ]; then
    token="$(yeni_anahtar)"
    env_set ADMIN_TOKEN "$token"
    yeni_token=1
  elif [ ${#token} -lt 16 ]; then
    hata "deploy/.env içindeki ADMIN_TOKEN çok kısa (en az 16 karakter). Satırı silin, kur.sh yenisini üretir."
  fi

  local anahtar="${ANTHROPIC_API_KEY:-}"
  if [ -z "$anahtar" ] && [ "$ilk" = 1 ] && [ -t 0 ]; then
    echo "Claude (yapay zekâ) anahtarı: kedinin yaşını, kilosunu, sağlığını tahmin eder. Kullandıkça ücretlidir (Anthropic hesabınızdan)."
    read -r -s -p "Anahtar (sk-ant-…, isteğe bağlı – geçmek için Enter): " anahtar || true
    echo
  fi
  if [ -n "$anahtar" ]; then
    [[ $anahtar == sk-ant-* ]] || uyari "Anahtar „sk-ant-“ ile başlamıyor – yine de kaydedildi."
    if [ "$anahtar" != "$(env_get ANTHROPIC_API_KEY)" ]; then
      env_set ANTHROPIC_API_KEY "$anahtar"
      tamam "Claude anahtarı kaydedildi."
    fi
  fi
  if [ -n "${CATME_DEMO+x}" ]; then
    case "$CATME_DEMO" in 0 | 1) env_set CATME_DEMO "$CATME_DEMO" ;; *) hata "CATME_DEMO sadece 0 veya 1 olabilir." ;; esac
  fi
  if [ -n "${CATME_AI+x}" ]; then
    case "$CATME_AI" in auto | claude | off) env_set CATME_AI "$CATME_AI" ;; *) hata "CATME_AI: auto, claude veya off olmalı." ;; esac
  fi
  if [ -n "${CATME_MODEL+x}" ]; then env_set CATME_MODEL "$CATME_MODEL"; fi
  # Geheimnisse: nur root/Besitzer:in darf lesen – auch wenn die Datei von Hand angelegt oder kopiert wurde
  chmod 600 "$ENV_DOSYA"

  # ---- Kontrollen (nur Warnungen)
  dns_kontrol "$alan"
  case "$WWW_DURUM" in
    evet)
      [ "$(env_get SITE_WWW)" = "www.$alan" ] || tamam "www.$alan de bu sunucuyu gösteriyor → $alan adresine yönlendirilecek."
      env_set SITE_WWW "www.$alan"
      ;;
    hayir) env_set SITE_WWW "" ;;
  esac
  port_kontrol
  ufw_kontrol
  local bos_kb
  bos_kb="$(df -Pk "$KOK" 2>/dev/null | awk 'NR==2 {print $4}' || true)"
  if [ -n "$bos_kb" ] && [ "$bos_kb" -lt 2000000 ]; then
    uyari "Diskte 2 GB'tan az yer var ($((bos_kb / 1024)) MB). Kurulum yarıda kalabilir."
  fi

  # ---- Bauen und starten
  # Im Image läuft die App als Benutzer „node“ – die Dateien müssen für alle lesbar sein
  # (bei umask 077 auf dem Server wären sie es nach git clone/unzip sonst nicht).
  if [ -n "$(find "$KOK/server.js" "$KOK/package.json" "$KOK/package-lock.json" "$KOK/server" "$KOK/public" ! -perm -o=r -print -quit 2>/dev/null)" ]; then
    bilgi "Dosya izinleri düzeltiliyor (uygulama dosyaları okunabilir olmalı)…"
    chmod -R a+rX "$KOK/server.js" "$KOK/package.json" "$KOK/package-lock.json" "$KOK/server" "$KOK/public"
  fi
  bilgi "Uygulama derleniyor ve başlatılıyor (ilk seferde birkaç dakika sürebilir)…"
  local caddy_sha
  caddy_sha="$(cksum <"$DEPLOY/Caddyfile" | awk '{print $1}')"
  dc config -q || hata "docker-compose.yml veya deploy/.env hatalı (yukarıdaki mesaja bakın)."
  if [ "${KUR_PULL:-0}" = 1 ]; then
    dc pull caddy || uyari "Caddy imajı güncellenemedi – eskisiyle devam."
    dc build --pull app || uyari "En yeni temel imajla derlenemedi (yukarıdaki mesaj) – mevcut imajla devam."
  fi
  if ! CADDYFILE_SHA="$caddy_sha" dc up -d --build --remove-orphans; then
    hata "Derleme/başlatma olmadı (yukarıdaki mesaja bakın). İnternet bağlantısını kontrol edip komutu tekrar çalıştırın."
  fi

  bilgi "Uygulamanın hazır olması bekleniyor…"
  if ! saglik_bekle; then
    dc logs --tail 60 app >&2 || true
    hata "Uygulama başlamadı. Yukarıdaki kayıtlara bakın; düzeltip komutu tekrar çalıştırın."
  fi
  local saglik ai_satiri demo_satiri
  saglik="$(saglik_json)"
  tamam "Uygulama çalışıyor. $(printf '%s' "$saglik" | sed -n 's/.*"version":"\([^"]*\)".*/(sürüm \1)/p')"
  case "$saglik" in
    *'"ai":"Claude'*) ai_satiri="Claude açık ($(printf '%s' "$saglik" | sed -n 's/.*"ai":"Claude (\([^)]*\))".*/\1/p'))" ;;
    *CATME_AI=off*) ai_satiri="basit analiz (CATME_AI=off)" ;;
    *SDK*) ai_satiri="basit analiz – Claude paketi eksik, imajı yeniden derleyin: bash deploy/guncelle.sh" ;;
    *) ai_satiri="basit analiz (Claude anahtarı yok – bkz. deploy/KURULUM.md, „Yapay zekâ“)" ;;
  esac
  case "$saglik" in *'"demo":true'*) demo_satiri="AÇIK (örnek veriler)" ;; *) demo_satiri="kapalı" ;; esac
  # Platz sparen: alte (namenlose) Images und Build-Cache älter als 3 Tage – Volumes bleiben unberührt
  docker image prune -f >/dev/null 2>&1 || true
  docker builder prune -f --filter until=72h >/dev/null 2>&1 || true
  cron_kur

  # ---- HTTPS von außen prüfen (Zertifikat kann ~1 Minute dauern)
  local https_ok=0 i deneme=12
  [ "$DNS_OK" = 1 ] || deneme=1
  if command -v curl >/dev/null 2>&1; then
    bilgi "HTTPS kontrol ediliyor: https://$alan …"
    if https_acik "$alan"; then
      https_ok=1
    elif [ "$DNS_OK" = 1 ]; then
      caddy_tekrar_denesin
    fi
    for i in $(seq 1 "$deneme"); do
      [ "$https_ok" = 0 ] || break
      if https_acik "$alan"; then
        https_ok=1
        break
      fi
      if [ "$i" -lt "$deneme" ]; then sleep 5; fi
    done
  fi

  echo
  if [ "$https_ok" = 1 ]; then
    tamam "Hazır! Site yayında. 🎉"
  else
    uyari "Uygulama çalışıyor ama https://$alan henüz dışarıdan açılmıyor."
    uyari "Sebep çoğunlukla DNS (henüz yayılmadı) veya kapalı 80/443 portlarıdır. Sertifika kendiliğinden"
    uyari "tekrar denenir. Kayıtlar: cd deploy && docker compose logs --tail 50 caddy"
  fi
  cat <<EOF

  Site:            https://$alan
  Oyun:            https://$alan/app.html
  Yönetim:         https://$alan/admin.html
  Kafe ekranı:     https://$alan/partner.html
  Yapay zekâ:      $ai_satiri
  Demo:            $demo_satiri
EOF
  if [ "$yeni_token" = 1 ]; then
    cat <<EOF

  Yönetici anahtarı (admin.html girişi) – GİZLİ tutun, bir yere not edin:
      $token
  Kayıtlı yeri: $ENV_DOSYA  (ADMIN_TOKEN=…)
EOF
  else
    cat <<EOF

  Yönetici anahtarı: $ENV_DOSYA içinde (göstermek için: grep ADMIN_TOKEN $ENV_DOSYA)
EOF
  fi
  local otomatik=""
  if [ -f /etc/cron.d/catmeifyoucan ]; then otomatik="   (her gece otomatik)"; fi
  cat <<EOF

  Yedek al:        bash deploy/yedek.sh$otomatik
  Güncelle:        bash deploy/guncelle.sh
  Ayrıntılar:      deploy/KURULUM.md
EOF
}

# Nur ausführen, wenn direkt gestartet (test/deploy.test.js lädt die Funktionen mit „source“)
if [ "${BASH_SOURCE[0]}" = "$0" ]; then main "$@"; fi
