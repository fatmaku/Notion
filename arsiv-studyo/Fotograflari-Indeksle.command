#!/bin/bash
# iCloud Fotoğraflar kütüphanesini indeksler (dosya kopyalamaz). Web arayüzündeki "İçe aktar" sekmesinden de yapılabilir.
DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
if [ -z "$DIR" ] || ! cd "$DIR"; then
  echo "Klasöre girilemedi: $(dirname "$0")"; read -r -p "Enter… "; exit 1
fi
PYV="$HOME/ArsivStudyo/venv/bin/python"
[ -x "$PYV" ] || { echo "Önce 'Kur.command' dosyasını çalıştırın."; read -r -p "Enter… "; exit 1; }
"$PYV" -m arsiv fotograflar
echo
read -r -p "Bitti. Kapatmak için Enter'a basın… "
