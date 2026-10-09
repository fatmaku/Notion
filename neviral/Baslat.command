#!/bin/bash
# neviral — tek giriş noktası: gerekirse kurulumu yapar (Kur.command --auto), sonra web arayüzünü başlatır (tarayıcı kendiliğinden açılır).
# Durdurmak için bu pencerede Ctrl+C ya da Durdur.command.
dil_bul() {
  local d="${NEVIRAL_DIL:-}"
  case "$d" in tr|de|en) echo "$d"; return ;; esac
  d="$(defaults read -g AppleLanguages 2>/dev/null | sed -n 's/^[^A-Za-z]*\([A-Za-z][A-Za-z]\).*/\1/p' | head -n 1)"
  [ -n "$d" ] || d="${LC_ALL:-${LANG:-}}"
  case "$d" in [Tt][Rr]*) echo tr ;; [Dd][Ee]*) echo de ;; *) echo en ;; esac
}
DIL="$(dil_bul)"; export NEVIRAL_DIL="$DIL"
t() { case "$DIL" in tr) printf '%s' "$1" ;; de) printf '%s' "$2" ;; *) printf '%s' "$3" ;; esac; }
msg() { t "$@"; echo; }
bekle() { t "$@"; printf ' '; read -r; }
kapat() { bekle "Kapatmak için Enter'a basın…" "Zum Schließen Enter drücken …" "Press Enter to close…"; }

KLASOR="$(dirname "$0")"
DIR="$(cd "$KLASOR" 2>/dev/null && pwd)"
if [ -z "$DIR" ] || ! cd "$DIR"; then
  msg "Klasöre girilemedi: $KLASOR" "Ordner nicht zugänglich: $KLASOR" "Cannot open the folder: $KLASOR"
  msg "Sistem Ayarları › Gizlilik ve Güvenlik › Dosyalar ve Klasörler › Terminal için İndirilenler/Masaüstü iznini açın." \
      "Systemeinstellungen › Datenschutz & Sicherheit › Dateien und Ordner › Terminal den Zugriff auf Downloads/Schreibtisch erlauben." \
      "System Settings › Privacy & Security › Files and Folders › allow Terminal to access Downloads/Desktop."
  kapat; exit 1
fi
HOMEDIR="$HOME/ArsivStudyo"; PYV="$HOMEDIR/venv/bin/python"; HASHF="$HOMEDIR/.req-hash"
ADRES="http://127.0.0.1:8765"

if curl -sf -m 1 "$ADRES/api/stats" >/dev/null 2>&1; then
  msg "neviral zaten çalışıyor; tarayıcı açılıyor." "neviral läuft bereits; der Browser wird geöffnet." "neviral is already running; opening the browser."
  open "$ADRES/"
  # Telefon erişimi açıksa sunucu Terminal için QR kodu verir (kapalıysa boş)
  QR="$(curl -sf -m 2 "$ADRES/api/mobil/terminal" 2>/dev/null)"
  case "$QR" in *[![:space:]]*) printf '%s\n' "$QR" ;; esac
  kapat; exit 0
fi

req_hash() {
  local h
  h="$(shasum -a 256 2>/dev/null < "$DIR/requirements.txt")"
  [ -n "$h" ] || h="$("$PYV" -c 'import hashlib, sys; print(hashlib.sha256(open(sys.argv[1], "rb").read()).hexdigest())' "$DIR/requirements.txt" 2>/dev/null)"
  printf '%s' "${h%% *}"
}
KUR=""
if [ ! -x "$PYV" ]; then
  KUR="ilk"
elif [ "$(req_hash)" != "$(cat "$HASHF" 2>/dev/null)" ]; then
  KUR="guncelle"
fi
if [ -n "$KUR" ]; then
  if [ "$KUR" = "ilk" ]; then
    msg "İlk kurulum yapılıyor (birkaç dakika sürebilir)…" "Ersteinrichtung läuft (das kann einige Minuten dauern) …" "Running first-time setup (this can take a few minutes)…"
  else
    msg "requirements.txt değişti; paketler güncelleniyor…" "requirements.txt hat sich geändert; Pakete werden aktualisiert …" "requirements.txt has changed; updating packages…"
  fi
  if ! "${BASH:-bash}" "$DIR/Kur.command" --auto || [ ! -x "$PYV" ]; then
    echo
    msg "Kurulum tamamlanamadı; yukarıdaki mesajlara bakın (ayrıntı: $HOMEDIR/kurulum.log). Sorunu giderip Baslat.command'ı yeniden çalıştırın." \
        "Die Installation konnte nicht abgeschlossen werden; siehe Meldungen oben (Details: $HOMEDIR/kurulum.log). Problem beheben und Baslat.command erneut öffnen." \
        "Setup could not be completed; see the messages above (details: $HOMEDIR/kurulum.log). Fix the problem and run Baslat.command again."
    kapat; exit 1
  fi
  echo
fi

PIDS="$(lsof -t -i tcp:8765 -sTCP:LISTEN 2>/dev/null)"
if [ -n "$PIDS" ]; then
  msg "8765 portunu başka bir program kullanıyor (eski bir sunucu olabilir). Kapatılıyor…" \
      "Port 8765 wird von einem anderen Programm belegt (vielleicht ein alter Server). Es wird beendet …" \
      "Port 8765 is in use by another program (possibly an old server). Closing it…"
  # shellcheck disable=SC2086
  kill $PIDS 2>/dev/null; sleep 1
fi
msg "neviral başlıyor… Tarayıcı açılmazsa şu adresi açın: $ADRES" \
    "neviral startet … Falls sich der Browser nicht öffnet, diese Adresse aufrufen: $ADRES" \
    "Starting neviral… If the browser does not open, go to: $ADRES"
msg "Durdurmak için bu pencerede Ctrl+C ya da Durdur.command." \
    "Zum Beenden in diesem Fenster Ctrl+C drücken oder Durdur.command öffnen." \
    "To stop: press Ctrl+C in this window, or open Durdur.command."
"$PYV" -m arsiv sunucu || bekle "Sunucu başlatılamadı (yukarıdaki hata). Enter…" "Der Server konnte nicht gestartet werden (Fehler oben). Enter …" "The server could not be started (see the error above). Press Enter…"
