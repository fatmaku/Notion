#!/usr/bin/env bash
# Cat Me If You Can – tüm oyun verilerini sıfırla (alles auf Anfang).
#
#   bash deploy/sifirla.sh
#
# Ne zaman? Ör. demo ile denediniz ve şimdi gerçek yayına temiz başlamak istiyorsunuz:
#   1) deploy/.env içinde CATME_DEMO=0 yapın   2) bash deploy/sifirla.sh
# Silinenler: kediler, oyuncular, kafeler, kuponlar, fotoğraflar. Kalanlar: deploy/.env (anahtarlar),
# HTTPS sertifikaları ve varsa oyun kuralları (game.override.json). Önce otomatik yedek alınır.
# Soru sormadan: EVET=1 bash deploy/sifirla.sh

set -euo pipefail
# shellcheck source=deploy/ortak.sh
source "$(dirname "${BASH_SOURCE[0]}")/ortak.sh"

main() {
  docker_kontrol
  [ -f "$ENV_DOSYA" ] || hata "deploy/.env yok – önce kurulum: bash deploy/kur.sh <alan-adı>"
  local demo
  demo="$(env_get CATME_DEMO)"
  uyari "DİKKAT: Bütün kediler, oyuncular, kafeler, kuponlar ve fotoğraflar silinecek."
  if [ "$demo" = 1 ]; then
    uyari "CATME_DEMO=1: Sıfırlamadan sonra yeniden ÖRNEK veriler eklenecek. Temiz başlangıç için önce deploy/.env içinde CATME_DEMO=0 yapın."
  else
    bilgi "CATME_DEMO=0: Sıfırlamadan sonra site boş başlar (gerçek yayın için doğru)."
  fi
  if [ "${EVET:-}" != 1 ]; then
    [ -t 0 ] || hata "Onay gerekli. Soru sormadan: EVET=1 bash deploy/sifirla.sh"
    local cevap
    read -r -p "Devam etmek için EVET yazın: " cevap || true
    case "$cevap" in EVET | evet | Evet) ;; *) hata "İptal edildi – hiçbir şey değişmedi." ;; esac
  fi
  # Immer zuerst sichern (auch bei gestoppter App) – scheitert das, bricht set -e ab, nichts wird gelöscht
  bilgi "Önce yedek alınıyor…"
  YEDEK_SAKLA=0 bash "$DEPLOY/yedek.sh"
  dc stop app
  dc run --rm --no-deps -T --entrypoint sh app -c "$VERI_TEMIZLE_SH" sh /data game.override.json
  # Mit der aktuellen .env neu starten (CATME_DEMO wirkt nur bei leerem Speicher)
  dc up -d app
  if ! saglik_bekle; then
    dc logs --tail 60 app >&2 || true
    hata "Uygulama başlamadı."
  fi
  tamam "Sıfırlandı. $([ "$demo" = 1 ] && echo 'Örnek veriler eklendi.' || echo 'Site boş ve hazır.')"
}

main "$@"
