#!/bin/bash
# Arşiv Stüdyo — tek seferlik kurulum (macOS). Çift tıklayın ya da Terminal'de: bash Kur.command
cd "$(dirname "$0")" || exit 1
echo "=== Arşiv Stüdyo kurulumu ==="
echo "Klasör: $(pwd)"
if ! xcode-select -p >/dev/null 2>&1; then
  echo "Apple komut satırı araçları gerekiyor. Açılan pencerede 'Yükle'ye basın (birkaç dakika sürer)."
  xcode-select --install
  echo "Yükleme bitince bu dosyayı yeniden çalıştırın."
  read -r -p "Kapatmak için Enter'a basın… "
  exit 0
fi
PY="$(command -v python3.13 || command -v python3.12 || command -v python3.11 || command -v python3)"
echo "Python: $PY ($("$PY" --version 2>&1))"
if [ ! -d .venv ]; then
  "$PY" -m venv .venv || { echo "HATA: sanal ortam oluşturulamadı"; read -r -p "Enter…"; exit 1; }
fi
# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --quiet --upgrade pip
echo "Paketler kuruluyor (ilk seferde birkaç dakika)…"
python -m pip install --quiet -r requirements.txt pillow-heif imageio-ffmpeg || { echo "HATA: paket kurulumu başarısız (internet bağlantısını kontrol edin)"; read -r -p "Enter…"; exit 1; }
if python -m pip install --quiet osxphotos; then
  echo "osxphotos kuruldu (Fotoğraflar kütüphanesi tam meta veriyle okunacak)."
else
  echo "Not: osxphotos kurulamadı; Fotoğraflar kütüphanesi temel modda okunacak."
fi
if command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg: sistemde var ($(command -v ffmpeg))"
else
  python -c "import imageio_ffmpeg; print('ffmpeg:', imageio_ffmpeg.get_ffmpeg_exe())" || echo "Uyarı: ffmpeg bulunamadı. 'brew install ffmpeg' ile kurabilirsiniz."
fi
python -c "import arsiv.media as m; print('ffmpeg testi:', m.ffmpeg_path())" || { echo "HATA: ffmpeg çalışmıyor"; read -r -p "Enter…"; exit 1; }
mkdir -p "$HOME/ArsivStudyo"
echo
echo "Kurulum tamam. Şimdi 'Baslat.command' dosyasını çift tıklayın."
echo "Fotoğraflar kütüphanesini okuyabilmesi için: Sistem Ayarları › Gizlilik ve Güvenlik › Tam Disk Erişimi › Terminal'i ekleyin."
read -r -p "Kapatmak için Enter'a basın… "
