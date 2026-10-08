#!/usr/bin/env bash
# Cat Me If You Can – yedeği geri yükle (Backup zurückspielen).
#
#   bash deploy/geri-yukle.sh yedekler/catme-yedek-2026-10-08_011700.tar.gz
#
# DİKKAT: Şu anki veriler silinir ve yedekteki hâl yüklenir. Önce şimdiki hâlin yedeği
# otomatik alınır (yedekler/ klasörüne). Soru sormadan çalıştırmak için: EVET=1 bash deploy/geri-yukle.sh …
# Başka sunucuya taşımak da böyle olur: yeni sunucuda kur.sh, sonra bu komut.

set -euo pipefail
# shellcheck source=deploy/ortak.sh
source "$(dirname "${BASH_SOURCE[0]}")/ortak.sh"

main() {
  local dosya="${1:-}"
  if [ -z "$dosya" ]; then
    echo "Kullanım: bash deploy/geri-yukle.sh <yedek-dosyası.tar.gz>"
    shopt -s nullglob
    local mevcut=("${YEDEK_KLASORU:-$KOK/yedekler}"/catme-yedek-*.tar.gz)
    if [ ${#mevcut[@]} -gt 0 ]; then
      echo "Mevcut yedekler:"
      printf '  %s\n' "${mevcut[@]}"
    fi
    exit 1
  fi
  [ -f "$dosya" ] || hata "Dosya bulunamadı: $dosya"
  dosya="$(cd "$(dirname "$dosya")" && pwd)/$(basename "$dosya")"
  docker_kontrol
  [ -f "$ENV_DOSYA" ] || hata "deploy/.env yok – önce kurulum: bash deploy/kur.sh <alan-adı>"
  gzip -t "$dosya" 2>/dev/null || hata "Yedek dosyası bozuk veya .tar.gz değil: $dosya"
  tar tzf "$dosya" | grep -E '(^|/)snapshot\.json$' >/dev/null || hata "Bu bir Cat Me If You Can yedeği değil (snapshot.json yok)."

  uyari "DİKKAT: Şu anki tüm veriler silinecek ve şu yedek yüklenecek:"
  echo "    $dosya"
  if [ "${EVET:-}" != 1 ]; then
    [ -t 0 ] || hata "Onay gerekli. Soru sormadan: EVET=1 bash deploy/geri-yukle.sh $dosya"
    local cevap
    read -r -p "Devam etmek için EVET yazın: " cevap || true
    case "$cevap" in EVET | evet | Evet) ;; *) hata "İptal edildi – hiçbir şey değişmedi." ;; esac
  fi

  # Immer zuerst den jetzigen Stand sichern – auch wenn die App gerade nicht läuft (oft der Grund
  # fürs Zurückspielen). Scheitert die Sicherung, bricht set -e hier ab: es wird nichts gelöscht.
  bilgi "Önce şimdiki verilerin yedeği alınıyor…"
  YEDEK_SAKLA=0 bash "$DEPLOY/yedek.sh"
  bilgi "Uygulama durduruluyor…"
  dc stop app
  bilgi "Yedek yükleniyor…"
  if ! dc run --rm --no-deps -T --entrypoint sh app -c "$GERI_YUKLE_SH" sh /data <"$dosya"; then
    hata "Yedek yüklenemedi. Önceki hâl yedekler/ klasöründe (en yeni dosya) – onu geri yükleyebilirsiniz."
  fi
  bilgi "Uygulama başlatılıyor…"
  dc up -d app
  if ! saglik_bekle; then
    dc logs --tail 60 app >&2 || true
    hata "Uygulama yedekle başlamadı. Önceki hâl yedekler/ klasöründe – onu geri yükleyebilirsiniz."
  fi
  tamam "Geri yükleme tamam. Site yedekteki verilerle çalışıyor."
}

main "$@"
