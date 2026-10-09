#!/bin/bash
# neviral'yu durdurur.
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

# Yalnızca 8765'i dinleyen sunucu (tarayıcının bu porta açık bağlantıları değil)
PIDS="$(lsof -t -i tcp:8765 -sTCP:LISTEN 2>/dev/null)"
if [ -n "$PIDS" ]; then
  # shellcheck disable=SC2086
  if kill $PIDS 2>/dev/null; then
    msg "neviral durduruldu." "neviral wurde beendet." "neviral has been stopped."
  else
    msg "Durdurulamadı." "Konnte nicht beendet werden." "Could not stop it."
  fi
else
  msg "Çalışan sunucu yok." "Es läuft kein Server." "No server is running."
fi
t "Kapatmak için Enter'a basın…" "Zum Schließen Enter drücken …" "Press Enter to close…"; printf ' '; read -r
