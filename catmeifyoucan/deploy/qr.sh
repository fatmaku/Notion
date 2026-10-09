#!/usr/bin/env bash
# Cat Me If You Can – telefon için QR kod (Telefonla kurulum).
#
#   bash deploy/qr.sh                   yönetim sayfası: telefonda giriş yapılmış açılır (10 dakika, tek kullanım)
#   bash deploy/qr.sh kafe              kafelerin listesi (her kafenin bir ID'si var)
#   bash deploy/qr.sh kafe <kafe-id>    kafenin telefonu/tableti için kurulum QR'ı (7 gün, tek kullanım)
#   bash deploy/qr.sh gonullu [kişi]    gönüllü daveti (7 gün; kişi sayısı 1–50, varsayılan 1)
#
# QR kodda yönetici anahtarı (ADMIN_TOKEN) YOKTUR – sadece bir kez kullanılabilen, kısa süreli bir kod.
# (Druckt einen frischen Einrichtungs-QR ins Terminal. Kein ADMIN_TOKEN im QR – nur ein Einmal-Code.)

# shellcheck disable=SC1111 # typografische Anführungszeichen in den Meldungen sind gewollt

set -euo pipefail
# shellcheck source=deploy/ortak.sh
source "$(dirname "${BASH_SOURCE[0]}")/ortak.sh"

kullanim() {
  cat <<'YARDIM'
Kullanım:
  bash deploy/qr.sh                  yönetim sayfası için QR (10 dakika, tek kullanım)
  bash deploy/qr.sh kafe             kafelerin listesi
  bash deploy/qr.sh kafe <kafe-id>   kafe telefonu için kurulum QR'ı (7 gün, tek kullanım)
  bash deploy/qr.sh gonullu [kişi]   gönüllü daveti (7 gün, 1–50 kişi)
YARDIM
}

main() {
  local secim="${1:-yonetim}"
  local -a arg=()
  case "$secim" in
    -h | --help | yardim | yardım)
      kullanim
      exit 0
      ;;
    yonetim | yönetim | admin)
      [ $# -le 1 ] || {
        kullanim
        hata "Fazla bilgi verildi."
      }
      arg=(admin)
      ;;
    kafe | cafe | partner)
      [ $# -le 2 ] || {
        kullanim
        hata "Fazla bilgi verildi."
      }
      arg=(partner)
      if [ -n "${2:-}" ]; then
        [[ $2 =~ ^[A-Za-z0-9_-]{1,64}$ ]] || hata "Kafe ID'si geçersiz: $2 (liste: bash deploy/qr.sh kafe)"
        arg+=("$2")
      fi
      ;;
    gonullu | gönüllü | volunteer)
      [ $# -le 2 ] || {
        kullanim
        hata "Fazla bilgi verildi."
      }
      local kisi="${2:-1}"
      if ! [[ $kisi =~ ^[0-9]{1,2}$ ]] || [ "$kisi" -lt 1 ] || [ "$kisi" -gt 50 ]; then
        hata "Kişi sayısı 1 ile 50 arasında olmalı (ör. bash deploy/qr.sh gonullu 5)."
      fi
      arg=(volunteer "$kisi")
      ;;
    *)
      kullanim
      hata "Bilinmeyen seçim: $secim"
      ;;
  esac

  docker_kontrol
  [ -f "$ENV_DOSYA" ] || hata "Kurulum bulunamadı ($ENV_DOSYA yok). Önce: sudo bash deploy/kur.sh <alan-adınız>"
  if ! app_calisiyor; then
    uyari "Uygulama şu an kapalı. QR kod yine de hazırlanır; uygulama açılınca çalışır."
    uyari "Açmak için: cd deploy && docker compose up -d"
  fi
  # Was man mit dem QR macht, schreibt server/setup-qr.js selbst über den Code
  qr_goster "${arg[@]}" || hata "QR kod oluşturulamadı (yukarıdaki mesaja bakın)."
}

# Nur ausführen, wenn direkt gestartet (Tests laden die Funktionen mit „source“)
if [ "${BASH_SOURCE[0]}" = "$0" ]; then main "$@"; fi
