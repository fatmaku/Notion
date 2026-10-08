#!/usr/bin/env bash
# Cat Me If You Can – güncelleme (Update): yeni kodu al, yedekle, yeniden derle, başlat.
# Veriler, anahtarlar (deploy/.env) ve HTTPS sertifikaları korunur.
#
#   bash deploy/guncelle.sh
#
# Git ile kurulduysa „git pull“ yapar. Zip ile kurulduysa: yeni zip'i bu klasörün üzerine açın
# (deploy/.env ve yedekler/ silinmesin), sonra bu komutu çalıştırın.
# Seçenek: YEDEKSIZ=1 → güncellemeden önce yedek alma.

set -euo pipefail
# shellcheck source=deploy/ortak.sh
source "$(dirname "${BASH_SOURCE[0]}")/ortak.sh"

# git als Besitzer:in des Projektordners ausführen. Mit „sudo bash deploy/guncelle.sh“ liefe git sonst
# als root: „dubious ownership“-Abbruch, root-eigene Dateien in .git/, und die SSH-Schlüssel des
# eigentlichen Benutzers fehlen beim Pull. Klappt das nicht (kein sudo, Ordner für den Benutzer
# nicht erreichbar), läuft git als root – mit safe.directory nur für diesen Aufruf.
GIT_SAHIP=""
git_hazirla() {
  local sahip
  sahip="$(stat -c %U "$KOK" 2>/dev/null || echo root)"
  if [ "$(id -u)" = 0 ] && [ "$sahip" != root ] && [ "$sahip" != UNKNOWN ] && command -v sudo >/dev/null 2>&1 &&
    sudo -u "$sahip" -H git -C "$KOK" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    GIT_SAHIP="$sahip"
  fi
}
git_kok() {
  if [ -n "$GIT_SAHIP" ]; then
    sudo -u "$GIT_SAHIP" -H git -C "$KOK" "$@"
  else
    git -c safe.directory='*' -C "$KOK" "$@"
  fi
}

main() {
  docker_kontrol
  [ -f "$ENV_DOSYA" ] || hata "deploy/.env yok – bu sunucuda henüz kurulum yapılmamış: bash deploy/kur.sh <alan-adı>"

  if command -v git >/dev/null 2>&1; then git_hazirla; fi
  if command -v git >/dev/null 2>&1 && git_kok rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    bilgi "Yeni sürüm indiriliyor (git pull)…"
    local once sonra
    once="$(git_kok rev-parse HEAD)"
    if ! git_kok pull --ff-only; then
      uyari "git pull olmadı. Sunucuda dosya değiştirdiyseniz görmek için: git -C \"$KOK\" status"
      hata "Güncelleme durdu – hiçbir şey değişmedi."
    fi
    sonra="$(git_kok rev-parse HEAD)"
    if [ "$once" = "$sonra" ]; then bilgi "Kod zaten güncel – yine de yeniden derleniyor (temel imajlar güncellenir)."; fi
  elif [ -e "$KOK/.git" ]; then
    hata "Bu klasör bir git deposu ama git çalışmadı (git kurulu mu? sudo apt-get install -y git). Güncelleme durdu – hiçbir şey değişmedi."
  else
    bilgi "Git deposu değil (zip ile kurulum). Yeni dosyaları önceden bu klasöre açtığınızı varsayıyorum."
  fi

  # Immer vorher sichern (yedek.sh kann das auch bei gestoppter App) – außer YEDEKSIZ=1
  if [ "${YEDEKSIZ:-0}" != 1 ]; then
    bilgi "Güncellemeden önce yedek alınıyor…"
    bash "$DEPLOY/yedek.sh"
  fi

  # kur.sh liest Domain & Co. aus deploy/.env; KUR_PULL=1 holt auch neue Basis-Images (Sicherheitsupdates)
  KUR_PULL=1 bash "$DEPLOY/kur.sh"
}

main "$@"
