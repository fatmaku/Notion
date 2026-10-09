#!/bin/bash
# LiveFX starten (Linux, auch von "Start-LiveFX.command" auf dem Mac benutzt).
#
#   ./start/start.sh            Server mit WLAN-Zugriff starten, Panel im Browser oeffnen
#   ./start/start.sh --local    nur dieser PC (kein Handy)
#
# Sucht Node.js (ab Version 20) in dieser Reihenfolge: portables Node im Ordner "node/" im LiveFX-Ordner
# (node/bin/node oder node/node-v*/bin/node aus der offiziellen Node-Datei; auch ../node neben dem LiveFX-Ordner),
# dann "node" im PATH,
# dann Homebrew (/opt/homebrew, /usr/local), nvm und Volta. Es wird nichts heruntergeladen.
# Anleitung: start/README-START.txt und docs/START.md

cd "$(dirname "$0")/.." || exit 1
APP_DIR="$(pwd)"
MIN_MAJOR=20

pause_if_wanted() {
  if [ "${LIVEFX_PAUSE:-0}" = "1" ] && [ -t 0 ]; then
    echo
    read -r -p "Enter drücken, um das Fenster zu schließen … " _
  fi
}

open_url() {
  if command -v open >/dev/null 2>&1 && [ "$(uname -s)" = "Darwin" ]; then
    open "$1" >/dev/null 2>&1
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$1" >/dev/null 2>&1 &
  fi
}

find_node() {
  local c
  for c in "$APP_DIR/node/bin/node" "$APP_DIR"/node/node-v*/bin/node "$APP_DIR/../node/bin/node"; do
    if [ -x "$c" ]; then echo "$c"; return 0; fi
  done
  if command -v node >/dev/null 2>&1; then command -v node; return 0; fi
  # Finder-started Terminals may miss Homebrew / nvm / Volta in PATH (LIVEFX_NODE_FALLBACKS overrides the list)
  for c in ${LIVEFX_NODE_FALLBACKS-/opt/homebrew/bin/node /usr/local/bin/node $HOME/.volta/bin/node}; do
    if [ -x "$c" ]; then echo "$c"; return 0; fi
  done
  c="$(ls -d "$HOME"/.nvm/versions/node/v*/bin/node 2>/dev/null | sort -V | tail -n 1)"
  if [ -n "$c" ] && [ -x "$c" ]; then echo "$c"; return 0; fi
  return 1
}

case "$APP_DIR" in
  */AppTranslocation/*)
    echo "LiveFX läuft aus einem geschützten macOS-Ordner (App Translocation)."
    echo "Bitte den LiveFX-Ordner zuerst in „Programme“ oder „Dokumente“ verschieben und dann erneut starten."
    pause_if_wanted
    exit 1
    ;;
esac

NODE="$(find_node)"
if [ -z "$NODE" ]; then
  echo
  echo "  Node.js fehlt – LiveFX braucht Node.js $MIN_MAJOR oder neuer (kostenlos)."
  echo
  echo "  So geht's:"
  echo "    1. Im Browser öffnet sich gleich https://nodejs.org/de/download"
  echo "    2. „LTS“ herunterladen und installieren (Mac: .pkg-Datei, Linux: Paketmanager)"
  echo "    3. Danach LiveFX noch einmal starten"
  echo
  echo "  Mit Homebrew (Mac):  brew install node"
  echo "  Ohne Installation:   die Node-Datei (.tar.gz) entpacken und den Ordner als „node“"
  echo "                       in den LiveFX-Ordner legen (LiveFX/node/bin/node)."
  open_url "https://nodejs.org/de/download"
  pause_if_wanted
  exit 1
fi

if ! "$NODE" -e "process.exit(Number(process.versions.node.split('.')[0]) >= $MIN_MAJOR ? 0 : 1)" >/dev/null 2>&1; then
  echo
  echo "  Node.js ist zu alt: $("$NODE" -v 2>/dev/null) ($NODE)"
  echo "  LiveFX braucht Version $MIN_MAJOR oder neuer – bitte die LTS-Version von https://nodejs.org/de/download installieren."
  open_url "https://nodejs.org/de/download"
  pause_if_wanted
  exit 1
fi

echo
echo "  LiveFX startet … (Node.js $("$NODE" -v), Ordner: $APP_DIR)"
echo "  Zum Beenden: Strg+C drücken (oder das Fenster schließen)."
echo
"$NODE" "$APP_DIR/server.js" --lan --open "$@"
RC=$?
echo
if [ "$RC" -eq 0 ] || [ "$RC" -eq 130 ]; then
  echo "  LiveFX wurde beendet."
else
  echo "  LiveFX wurde mit Fehler $RC beendet – bitte die Meldung oben lesen. Hilfe: docs/START.md"
fi
pause_if_wanted
exit "$RC"
