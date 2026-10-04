#!/bin/bash
# neviral — web arayüzünü başlatır (tarayıcı kendiliğinden açılır). Durdurmak için bu pencerede Ctrl+C ya da Durdur.command.
DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
if [ -z "$DIR" ] || ! cd "$DIR"; then
  echo "Klasöre girilemedi: $(dirname "$0")"; read -r -p "Enter… "; exit 1
fi
PYV="$HOME/ArsivStudyo/venv/bin/python"
if [ ! -x "$PYV" ]; then
  echo "Önce 'Kur.command' dosyasını çalıştırın."; read -r -p "Enter… "; exit 1
fi
if curl -sf -m 1 http://127.0.0.1:8765/api/stats >/dev/null 2>&1; then
  echo "neviral zaten çalışıyor; tarayıcı açılıyor."
  open "http://127.0.0.1:8765/"
  read -r -p "Kapatmak için Enter'a basın… "; exit 0
fi
if lsof -ti tcp:8765 >/dev/null 2>&1; then
  echo "8765 portunu başka bir program kullanıyor (eski bir sunucu olabilir). Kapatılıyor…"
  kill $(lsof -ti tcp:8765) 2>/dev/null; sleep 1
fi
echo "neviral başlıyor… Tarayıcı açılmazsa şu adresi açın: http://127.0.0.1:8765"
echo "Durdurmak için bu pencerede Ctrl+C ya da Durdur.command."
"$PYV" -m arsiv sunucu || read -r -p "Sunucu başlatılamadı (yukarıdaki hata). Enter… "
