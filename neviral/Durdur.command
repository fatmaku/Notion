#!/bin/bash
# neviral'yu durdurur.
PIDS="$(lsof -ti tcp:8765 2>/dev/null)"
if [ -n "$PIDS" ]; then
  kill $PIDS 2>/dev/null && echo "neviral durduruldu." || echo "Durdurulamadı."
else
  echo "Çalışan sunucu yok."
fi
read -r -p "Kapatmak için Enter'a basın… "
