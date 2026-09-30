#!/bin/bash
# iCloud Fotoğraflar kütüphanesini indeksler (dosya kopyalamaz). Web arayüzündeki "İçe aktar" sekmesinden de yapılabilir.
cd "$(dirname "$0")" || exit 1
[ -d .venv ] || { echo "Önce 'Kur.command' çalıştırın."; read -r -p "Enter…"; exit 1; }
# shellcheck disable=SC1091
source .venv/bin/activate
python -m arsiv fotograflar
echo
read -r -p "Bitti. Kapatmak için Enter'a basın… "
