#!/usr/bin/env bash
# Cat Me If You Can – yedek (Backup) aller Daten: Kediler, oyuncular, kafeler, kuponlar, fotoğraflar.
#
#   bash deploy/yedek.sh       →  yedekler/catme-yedek-2026-10-08_011700.tar.gz
#
# Seçenekler (ortam değişkeni):
#   YEDEK_KLASORU=/yol         yedeklerin klasörü (varsayılan: <proje>/yedekler)
#   YEDEK_SAKLA=14             en yeni kaç yedek kalsın (0 = hepsi kalsın)
#
# Uygulama çalışırken de yedek alır (kesinti yok). Yedek sırasında veri dosyası yeniden yazılırsa
# (saatlik sıkıştırma) yedek otomatik tekrarlanır – böylece yedek her zaman tutarlıdır.
#
# Geri yükleme:   bash deploy/geri-yukle.sh yedekler/catme-yedek-….tar.gz
# Başka bilgisayara kopyalama (kendi bilgisayarınızda çalıştırın):
#   scp root@SUNUCU-IP:catmeifyoucan/yedekler/catme-yedek-….tar.gz .

set -euo pipefail
# shellcheck source=deploy/ortak.sh
source "$(dirname "${BASH_SOURCE[0]}")/ortak.sh"

durum_imzasi() { # inode:mtime:size von snapshot.json – ändert sich bei jeder Verdichtung
  dc exec -T app sh -c 'stat -c %i:%Y:%s /data/snapshot.json 2>/dev/null || echo yok' 2>/dev/null || echo hata
}

main() {
  docker_kontrol
  [ -f "$ENV_DOSYA" ] || hata "deploy/.env yok – önce kurulum: bash deploy/kur.sh <alan-adı>"
  local klasor="${YEDEK_KLASORU:-$KOK/yedekler}" sakla="${YEDEK_SAKLA:-14}"
  [[ $sakla =~ ^[0-9]+$ ]] || hata "YEDEK_SAKLA bir sayı olmalı"
  umask 077
  mkdir -p "$klasor"
  local ad hedef
  ad="catme-yedek-$(date +%Y-%m-%d_%H%M%S).tar.gz"
  hedef="$klasor/$ad"
  local n=1
  while [ -e "$hedef" ]; do # zwei Sicherungen in derselben Sekunde (z. B. vor geri-yukle.sh) – nichts überschreiben
    hedef="$klasor/${ad%.tar.gz}-$n.tar.gz"
    n=$((n + 1))
  done
  GECICI="$klasor/.$ad.part" # global: der EXIT-Trap läuft auch nach einem Abbruch außerhalb von main
  trap 'rm -f "$GECICI"' EXIT

  bilgi "Yedek alınıyor…"
  if app_calisiyor; then
    # Läuft die stündliche Verdichtung genau während tar (Snapshot neu, Journal geleert), wäre die
    # Sicherung unvollständig – dann ändert sich die Signatur von snapshot.json → noch einmal.
    # Ein tar-Fehler (Journal schrumpfte beim Lesen) wird ebenso wiederholt.
    local once sonra deneme tar_ok=0 tutarli=0
    for deneme in 1 2 3 4 5; do
      once="$(durum_imzasi)"
      if dc exec -T app tar czf - -C /data . >"$GECICI"; then tar_ok=1; else tar_ok=0; fi
      sonra="$(durum_imzasi)"
      if [ "$tar_ok" = 1 ] && [ "$once" = "$sonra" ]; then
        tutarli=1
        break
      fi
      if [ "$deneme" -lt 5 ]; then sleep 3; fi
    done
    [ "$tar_ok" = 1 ] || hata "Yedek alınamadı (yukarıdaki mesaja bakın). Uygulama çalışıyor mu? cd deploy && docker compose ps"
    [ "$tutarli" = 1 ] || uyari "Veriler yedek sırasında sürekli değişti – yine de kaydedildi."
  else
    # App gestoppt: kurzlebiger Container aus demselben Image liest das Volume
    dc run --rm --no-deps -T --entrypoint tar app czf - -C /data . >"$GECICI" ||
      hata "Yedek alınamadı (yukarıdaki mesaja bakın)."
  fi

  gzip -t "$GECICI" || hata "Yedek dosyası bozuk çıktı – tekrar deneyin."
  if ! tar tzf "$GECICI" | grep -E '(^|/)snapshot\.json$' >/dev/null; then
    uyari "Yedekte snapshot.json yok – veri klasörü boş olabilir (henüz hiç başlatılmadı mı?)."
  fi
  mv "$GECICI" "$hedef"
  trap - EXIT
  tamam "Yedek hazır: $hedef ($(du -h "$hedef" | cut -f1))"

  # Alte Sicherungen aufräumen (Namen enthalten das Datum → alphabetisch = zeitlich)
  if [ "$sakla" -gt 0 ]; then
    shopt -s nullglob
    local hepsi=("$klasor"/catme-yedek-*.tar.gz)
    local fazla=$((${#hepsi[@]} - sakla)) f
    if [ "$fazla" -gt 0 ]; then
      for f in "${hepsi[@]:0:fazla}"; do rm -f -- "$f"; done
      bilgi "$fazla eski yedek silindi (en yeni $sakla tanesi kalır)."
    fi
  fi
  echo "  Geri yükleme:  bash deploy/geri-yukle.sh $hedef"
  echo "  İpucu: Yedekleri ara sıra kendi bilgisayarınıza da indirin (sunucu bozulursa diye)."
}

main "$@"
