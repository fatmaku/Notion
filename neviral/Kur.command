#!/bin/bash
# neviral — kurulum (macOS). Çift tıklayın: kurar ve uygulamayı başlatır. Baslat.command gerektiğinde bunu kendisi çağırır (--auto).
# Açılmazsa: Terminal'i açın, "bash " yazın (boşlukla), bu dosyayı pencereye sürükleyin, Enter'a basın.
OTO=0
for a in "$@"; do [ "$a" = "--auto" ] && OTO=1; done

dil_bul() {
  local d="${NEVIRAL_DIL:-}"
  case "$d" in tr|de|en) echo "$d"; return ;; esac
  d="$(defaults read -g AppleLanguages 2>/dev/null | sed -n 's/^[^A-Za-z]*\([A-Za-z][A-Za-z]\).*/\1/p' | head -n 1)"
  [ -n "$d" ] || d="${LC_ALL:-${LANG:-}}"
  case "$d" in [Tt][Rr]*) echo tr ;; [Dd][Ee]*) echo de ;; *) echo en ;; esac
}
DIL="$(dil_bul)"
t() { case "$DIL" in tr) printf '%s' "$1" ;; de) printf '%s' "$2" ;; *) printf '%s' "$3" ;; esac; }
msg() { t "$@"; echo; }
bekle() { t "$@"; printf ' '; read -r; }
bitir() {
  [ "$OTO" -eq 1 ] || bekle "Kapatmak için Enter'a basın…" "Zum Schließen Enter drücken …" "Press Enter to close…"
  exit "${1:-1}"
}
GIRIS="Kur.command"; [ "$OTO" -eq 1 ] && GIRIS="Baslat.command"

KLASOR="$(dirname "$0")"
DIR="$(cd "$KLASOR" 2>/dev/null && pwd)"
if [ -z "$DIR" ] || ! cd "$DIR"; then
  msg "Klasöre girilemedi: $KLASOR" "Ordner nicht zugänglich: $KLASOR" "Cannot open the folder: $KLASOR"
  msg "Sistem Ayarları › Gizlilik ve Güvenlik › Dosyalar ve Klasörler › Terminal için İndirilenler/Masaüstü iznini açın." \
      "Systemeinstellungen › Datenschutz & Sicherheit › Dateien und Ordner › Terminal den Zugriff auf Downloads/Schreibtisch erlauben." \
      "System Settings › Privacy & Security › Files and Folders › allow Terminal to access Downloads/Desktop."
  bitir 1
fi
HOMEDIR="$HOME/ArsivStudyo"; VENV="$HOMEDIR/venv"; LOG="$HOMEDIR/kurulum.log"; HASHF="$HOMEDIR/.req-hash"
mkdir -p "$HOMEDIR"
# Aynı klasördeki diğer .command dosyaları da çift tıklamayla açılabilsin (karantina işaretini kaldır)
xattr -d com.apple.quarantine ./*.command >/dev/null 2>&1
chmod +x ./*.command >/dev/null 2>&1
msg "=== neviral kurulumu ===" "=== neviral-Installation ===" "=== neviral setup ==="
msg "Klasör: $DIR" "Ordner: $DIR" "Folder: $DIR"
msg "Kayıt dosyası: $LOG" "Protokolldatei: $LOG" "Log file: $LOG"
echo "--- $(date) ---$([ "$OTO" -eq 1 ] && echo ' (--auto)')" >> "$LOG"

req_hash() {
  local h
  h="$(shasum -a 256 2>/dev/null < "$DIR/requirements.txt")"
  [ -n "$h" ] || h="$("$PYV" -c 'import hashlib, sys; print(hashlib.sha256(open(sys.argv[1], "rb").read()).hexdigest())' "$DIR/requirements.txt" 2>/dev/null)"
  printf '%s' "${h%% *}"
}

# 1) Python bul (3.10 ve üstü tercih edilir)
PY=""
for c in /Library/Frameworks/Python.framework/Versions/3.1[3-9]/bin/python3 \
         /Library/Frameworks/Python.framework/Versions/3.1[0-2]/bin/python3 \
         /opt/homebrew/bin/python3 /usr/local/bin/python3 \
         "$(command -v python3.14)" "$(command -v python3.13)" "$(command -v python3.12)" "$(command -v python3.11)" "$(command -v python3.10)"; do
  [ -n "$c" ] && [ -x "$c" ] && "$c" -c 'import sys, ensurepip; sys.exit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1 && { PY="$c"; break; }
done
OLD=0
if [ -z "$PY" ]; then
  if xcode-select -p >/dev/null 2>&1 && /usr/bin/python3 -c 'import sys, ensurepip; sys.exit(0 if sys.version_info >= (3, 9) else 1)' >/dev/null 2>&1; then
    PY=/usr/bin/python3; OLD=1
    SURUM="$("$PY" --version 2>&1)"
    msg "Uyarı: yalnızca Apple'ın eski Python'u bulundu ($SURUM). Çalışır, ama Fotoğraflar okuyucu eski sürümde kurulur." \
        "Hinweis: Nur Apples ältere Python-Version wurde gefunden ($SURUM). Das funktioniert, aber der Fotos-Leser wird in einer älteren Version installiert." \
        "Warning: only Apple's older Python was found ($SURUM). It works, but the Photos reader will be installed in an older version."
    msg "Öneri: https://www.python.org/downloads/macos/ adresinden Python 3.12 kurup Kur.command'ı yeniden çalıştırın." \
        "Tipp: Python 3.12 von https://www.python.org/downloads/macos/ installieren und Kur.command erneut öffnen." \
        "Tip: install Python 3.12 from https://www.python.org/downloads/macos/ and run Kur.command again."
  else
    echo
    msg "Python bulunamadı. Şu adımları yapın:" "Python wurde nicht gefunden. So geht's:" "Python was not found. Please do the following:"
    msg "  1) Safari'de şu adresi açın: https://www.python.org/downloads/macos/" \
        "  1) In Safari diese Adresse öffnen: https://www.python.org/downloads/macos/" \
        "  1) Open this address in Safari: https://www.python.org/downloads/macos/"
    msg "  2) 'Latest Python 3 Release' bağlantısına tıklayın; sayfanın altındaki 'macOS 64-bit universal2 installer' dosyasını indirin" \
        "  2) Auf 'Latest Python 3 Release' klicken; unten auf der Seite die Datei 'macOS 64-bit universal2 installer' herunterladen" \
        "  2) Click 'Latest Python 3 Release'; at the bottom of the page, download the 'macOS 64-bit universal2 installer'"
    msg "  3) İndirilen .pkg dosyasını çift tıklayıp kurun (Devam › Devam › Kabul Et › Yükle)" \
        "  3) Die heruntergeladene .pkg-Datei doppelklicken und installieren (Fortfahren › Fortfahren › Akzeptieren › Installieren)" \
        "  3) Double-click the downloaded .pkg file and install it (Continue › Continue › Agree › Install)"
    msg "  4) Bu dosyayı ($GIRIS) yeniden çalıştırın" "  4) Diese Datei ($GIRIS) erneut öffnen" "  4) Run this file ($GIRIS) again"
    bitir 1
  fi
fi
echo "Python: $PY ($("$PY" --version 2>&1))"

# 2) Sanal ortam (klasör taşınsa/yeniden indirilse de bozulmasın diye ~/ArsivStudyo/venv altında)
# Eski Python'la kurulmuşsa ve artık 3.10+ varsa yeniden oluştur
if [ -x "$VENV/bin/python" ] && [ "$OLD" -eq 0 ] && ! "$VENV/bin/python" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
  msg "Sanal ortam yeni Python ile yeniden oluşturuluyor…" "Die virtuelle Umgebung wird mit dem neuen Python neu erstellt …" "Recreating the virtual environment with the newer Python…"
  rm -rf "$VENV"
fi
if [ ! -x "$VENV/bin/python" ]; then
  rm -rf "$VENV"
  "$PY" -m venv "$VENV" || { msg "HATA: sanal ortam oluşturulamadı" "FEHLER: Die virtuelle Umgebung konnte nicht erstellt werden" "ERROR: could not create the virtual environment"; bitir 1; }
fi
PYV="$VENV/bin/python"

# 3) Paketler
msg "Paketler kuruluyor (ilk seferde birkaç dakika sürer; ilerleme aşağıda görünür)…" \
    "Pakete werden installiert (beim ersten Mal dauert das einige Minuten; der Fortschritt erscheint unten) …" \
    "Installing packages (takes a few minutes the first time; progress is shown below)…"
"$PYV" -m pip install --upgrade pip 2>&1 | tail -1
"$PYV" -m pip install -r requirements.txt 2>&1 | tee -a "$LOG" | grep -E "Successfully|ERROR|Requirement already"
if [ "${PIPESTATUS[0]}" -ne 0 ]; then
  msg "HATA: temel paketler kurulamadı. İnternet bağlantısını kontrol edin; ayrıntı: $LOG" \
      "FEHLER: Die Basispakete konnten nicht installiert werden. Bitte die Internetverbindung prüfen; Details: $LOG" \
      "ERROR: the core packages could not be installed. Check your internet connection; details: $LOG"
  bitir 1
fi
"$PYV" -m pip install pillow-heif 2>&1 | tee -a "$LOG" | grep -E "Successfully|ERROR|Requirement already"
[ "${PIPESTATUS[0]}" -eq 0 ] || msg "Not: HEIC desteği (pillow-heif) kurulamadı; macOS'un sips aracı kullanılacak." \
                                   "Hinweis: HEIC-Unterstützung (pillow-heif) konnte nicht installiert werden; stattdessen wird das macOS-Werkzeug sips verwendet." \
                                   "Note: HEIC support (pillow-heif) could not be installed; macOS's sips tool will be used instead."
"$PYV" -m pip install imageio-ffmpeg 2>&1 | tee -a "$LOG" | grep -E "Successfully|ERROR|Requirement already"
[ "${PIPESTATUS[0]}" -eq 0 ] || msg "Not: taşınabilir ffmpeg kurulamadı." "Hinweis: Das portable ffmpeg konnte nicht installiert werden." "Note: the portable ffmpeg could not be installed."
if [ "$OLD" -eq 1 ]; then OSX="osxphotos"; else OSX="osxphotos>=0.77"; fi
if "$PYV" -m pip install "$OSX" >> "$LOG" 2>&1; then
  msg "osxphotos kuruldu (Fotoğraflar kütüphanesi tam meta veriyle okunacak)." \
      "osxphotos installiert (die Fotos-Mediathek wird mit allen Metadaten gelesen)." \
      "osxphotos installed (the Photos library will be read with full metadata)."
else
  msg "Not: osxphotos kurulamadı; Fotoğraflar kütüphanesi temel modda okunacak (ayrıntı: $LOG)." \
      "Hinweis: osxphotos konnte nicht installiert werden; die Fotos-Mediathek wird im Basismodus gelesen (Details: $LOG)." \
      "Note: osxphotos could not be installed; the Photos library will be read in basic mode (details: $LOG)."
fi

# 4) ffmpeg denetimi
if ! "$PYV" -c "import arsiv.media as m; print('ffmpeg:', m.ffmpeg_path())" 2>/dev/null; then
  msg "HATA: ffmpeg bulunamadı. Terminal'de 'brew install ffmpeg' ile kurabilirsiniz (Homebrew gerekir)." \
      "FEHLER: ffmpeg wurde nicht gefunden. Im Terminal mit 'brew install ffmpeg' installieren (Homebrew erforderlich)." \
      "ERROR: ffmpeg was not found. You can install it in Terminal with 'brew install ffmpeg' (requires Homebrew)."
  bitir 1
fi

# 5) Fotoğraflar kütüphanesi izin denetimi
LIB=""
for l in "$HOME"/Pictures/*.photoslibrary; do [ -d "$l" ] && { LIB="$l"; break; }; done
if [ -n "$LIB" ] && ! head -c1 "$LIB/database/Photos.sqlite" >/dev/null 2>&1; then
  echo
  msg "ÖNEMLİ: Fotoğraflar kütüphanesi henüz okunamıyor (izin yok)." \
      "WICHTIG: Die Fotos-Mediathek kann noch nicht gelesen werden (keine Berechtigung)." \
      "IMPORTANT: the Photos library cannot be read yet (no permission)."
  msg "  Sistem Ayarları › Gizlilik ve Güvenlik › Tam Disk Erişimi › '+' düğmesi › Terminal'i ekleyin." \
      "  Systemeinstellungen › Datenschutz & Sicherheit › Festplattenvollzugriff › '+' › Terminal hinzufügen." \
      "  System Settings › Privacy & Security › Full Disk Access › '+' button › add Terminal."
  msg "  Sonra Terminal'i tamamen kapatın (Cmd+Q) ve Baslat.command'ı çift tıklayın." \
      "  Danach Terminal ganz beenden (Cmd+Q) und Baslat.command doppelklicken." \
      "  Then quit Terminal completely (Cmd+Q) and double-click Baslat.command."
fi

# 6) Kurulum tamam: requirements.txt özetini sakla (değişirse Baslat.command yeniden kurar)
printf '%s\n' "$(req_hash)" > "$HASHF"
echo
if [ "$OTO" -eq 1 ]; then
  msg "Kurulum tamam." "Installation abgeschlossen." "Setup complete."
  exit 0
fi
if [ ! -f "$DIR/Baslat.command" ]; then
  msg "Kurulum tamam, ama Baslat.command bu klasörde bulunamadı." \
      "Installation abgeschlossen, aber Baslat.command wurde in diesem Ordner nicht gefunden." \
      "Setup complete, but Baslat.command was not found in this folder."
  bitir 1
fi
msg "Kurulum tamam. neviral başlatılıyor (tarayıcı kendiliğinden açılır)…" \
    "Installation abgeschlossen. neviral wird gestartet (der Browser öffnet sich von selbst) …" \
    "Setup complete. Starting neviral (the browser opens by itself)…"
exec "${BASH:-bash}" "$DIR/Baslat.command"
