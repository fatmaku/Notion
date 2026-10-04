#!/bin/bash
# neviral — tek seferlik kurulum (macOS).
# Çift tıklayın. Açılmazsa: Terminal'i açın, "bash " yazın (boşlukla), bu dosyayı pencereye sürükleyin, Enter'a basın.
DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
if [ -z "$DIR" ] || ! cd "$DIR"; then
  echo "Klasöre girilemedi: $(dirname "$0")"
  echo "Sistem Ayarları › Gizlilik ve Güvenlik › Dosyalar ve Klasörler › Terminal için İndirilenler/Masaüstü iznini açın."
  read -r -p "Kapatmak için Enter'a basın… "; exit 1
fi
HOMEDIR="$HOME/ArsivStudyo"; VENV="$HOMEDIR/venv"; LOG="$HOMEDIR/kurulum.log"
mkdir -p "$HOMEDIR"
# Aynı klasördeki diğer .command dosyaları da çift tıklamayla açılabilsin (karantina işaretini kaldır)
xattr -d com.apple.quarantine ./*.command >/dev/null 2>&1
chmod +x ./*.command >/dev/null 2>&1
echo "=== neviral kurulumu ==="
echo "Klasör: $DIR"
echo "Kayıt dosyası: $LOG"
echo "--- $(date) ---" >> "$LOG"

# 1) Python bul (3.10 ve üstü tercih edilir)
PY=""
for c in /Library/Frameworks/Python.framework/Versions/3.1[3-9]/bin/python3 \
         /Library/Frameworks/Python.framework/Versions/3.1[0-2]/bin/python3 \
         /opt/homebrew/bin/python3 /usr/local/bin/python3 \
         "$(command -v python3.13)" "$(command -v python3.12)" "$(command -v python3.11)" "$(command -v python3.10)"; do
  [ -n "$c" ] && [ -x "$c" ] && "$c" -c 'import sys, ensurepip; sys.exit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1 && { PY="$c"; break; }
done
OLD=0
if [ -z "$PY" ]; then
  if xcode-select -p >/dev/null 2>&1 && /usr/bin/python3 -c 'import sys, ensurepip; sys.exit(0 if sys.version_info >= (3, 9) else 1)' >/dev/null 2>&1; then
    PY=/usr/bin/python3; OLD=1
    echo "Uyarı: yalnızca Apple'ın eski Python'u bulundu ($("$PY" --version 2>&1)). Çalışır, ama Fotoğraflar okuyucu eski sürümde kurulur."
    echo "Öneri: https://www.python.org/downloads/macos/ adresinden Python 3.12 kurup Kur.command'ı yeniden çalıştırın."
  else
    echo
    echo "Python bulunamadı. Şu adımları yapın:"
    echo "  1) Safari'de şu adresi açın: https://www.python.org/downloads/macos/"
    echo "  2) 'Latest Python 3 Release' bağlantısına tıklayın; sayfanın altındaki 'macOS 64-bit universal2 installer' dosyasını indirin"
    echo "  3) İndirilen .pkg dosyasını çift tıklayıp kurun (Devam › Devam › Kabul Et › Yükle)"
    echo "  4) Bu dosyayı (Kur.command) yeniden çalıştırın"
    read -r -p "Kapatmak için Enter'a basın… "; exit 1
  fi
fi
echo "Python: $PY ($("$PY" --version 2>&1))"

# 2) Sanal ortam (klasör taşınsa/yeniden indirilse de bozulmasın diye ~/ArsivStudyo/venv altında)
if [ ! -x "$VENV/bin/python" ]; then
  rm -rf "$VENV"
  "$PY" -m venv "$VENV" || { echo "HATA: sanal ortam oluşturulamadı"; read -r -p "Enter… "; exit 1; }
fi
PYV="$VENV/bin/python"

# 3) Paketler
echo "Paketler kuruluyor (ilk seferde birkaç dakika sürer; ilerleme aşağıda görünür)…"
"$PYV" -m pip install --upgrade pip 2>&1 | tail -1
"$PYV" -m pip install -r requirements.txt 2>&1 | tee -a "$LOG" | grep -E "Successfully|ERROR|Requirement already"
if [ "${PIPESTATUS[0]}" -ne 0 ]; then
  echo "HATA: temel paketler kurulamadı. İnternet bağlantısını kontrol edin; ayrıntı: $LOG"
  read -r -p "Enter… "; exit 1
fi
"$PYV" -m pip install pillow-heif 2>&1 | tee -a "$LOG" | grep -E "Successfully|ERROR|Requirement already" || echo "Not: HEIC desteği (pillow-heif) kurulamadı; macOS'un sips aracı kullanılacak."
"$PYV" -m pip install imageio-ffmpeg 2>&1 | tee -a "$LOG" | grep -E "Successfully|ERROR|Requirement already" || echo "Not: taşınabilir ffmpeg kurulamadı."
if [ "$OLD" -eq 1 ]; then OSX="osxphotos"; else OSX="osxphotos>=0.77"; fi
if "$PYV" -m pip install "$OSX" >> "$LOG" 2>&1; then
  echo "osxphotos kuruldu (Fotoğraflar kütüphanesi tam meta veriyle okunacak)."
else
  echo "Not: osxphotos kurulamadı; Fotoğraflar kütüphanesi temel modda okunacak (ayrıntı: $LOG)."
fi

# 4) ffmpeg denetimi
if "$PYV" -c "import arsiv.media as m; print('ffmpeg:', m.ffmpeg_path())" 2>/dev/null; then :; else
  echo "HATA: ffmpeg bulunamadı. Terminal'de 'brew install ffmpeg' ile kurabilirsiniz (Homebrew gerekir)."
  read -r -p "Enter… "; exit 1
fi

# 5) Fotoğraflar kütüphanesi izin denetimi
LIB="$(ls -d "$HOME"/Pictures/*.photoslibrary 2>/dev/null | head -1)"
if [ -n "$LIB" ] && ! head -c1 "$LIB/database/Photos.sqlite" >/dev/null 2>&1; then
  echo
  echo "ÖNEMLİ: Fotoğraflar kütüphanesi henüz okunamıyor (izin yok)."
  echo "  Sistem Ayarları › Gizlilik ve Güvenlik › Tam Disk Erişimi › '+' düğmesi › Terminal'i ekleyin."
  echo "  Sonra Terminal'i tamamen kapatın (Cmd+Q) ve Baslat.command'ı çift tıklayın."
fi
echo
echo "Kurulum tamam. Şimdi 'Baslat.command' dosyasını çift tıklayın (tarayıcı kendiliğinden açılır)."
read -r -p "Kapatmak için Enter'a basın… "
