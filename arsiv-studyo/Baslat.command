#!/bin/bash
# Arşiv Stüdyo — web arayüzünü başlatır (tarayıcı kendiliğinden açılır). Durdurmak için bu pencerede Ctrl+C.
cd "$(dirname "$0")" || exit 1
if [ ! -d .venv ]; then
  echo "Önce 'Kur.command' dosyasını çalıştırın."
  read -r -p "Enter…"
  exit 1
fi
# shellcheck disable=SC1091
source .venv/bin/activate
echo "Arşiv Stüdyo başlıyor… Tarayıcı açılmazsa: http://127.0.0.1:8765"
echo "Durdurmak için bu pencerede Ctrl+C."
python -m arsiv sunucu
