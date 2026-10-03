#!/bin/bash
# Window Blaster – Start auf dem Mac.
#
# Erster Start:  Terminal öffnen, "bash " tippen (mit Leerzeichen), diese Datei ins
#                Terminal-Fenster ziehen, Enter.   (Danach genügt ein Doppelklick.)
#
# Was passiert: Die macOS-Download-Sperre wird NUR für diesen Ordner entfernt, dann
# startet der kleine Spiel-Server und öffnet die Verbindungsseite im Browser.

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR" || exit 1

pause_and_exit() {
  echo
  read -r -p "Enter drücken zum Schließen …" _
  exit "${1:-1}"
}

clear 2>/dev/null
echo "🚗  Window Blaster wird gestartet …"
echo "    Ordner: $DIR"
echo

if ! ls "$DIR" >/dev/null 2>&1; then
  echo "❌ Kein Zugriff auf den Ordner (macOS-Datenschutz)."
  echo "   Systemeinstellungen → Datenschutz & Sicherheit → Dateien und Ordner → Terminal"
  echo "   → „Schreibtisch“ bzw. „Downloads“ einschalten. Dann neu starten."
  pause_and_exit 1
fi
if [ ! -f "$DIR/app/index.html" ]; then
  echo "❌ Der Ordner „app“ fehlt neben dieser Startdatei."
  echo "   Bitte WindowBlaster.zip neu herunterladen, entpacken und die Startdatei IM neuen Ordner benutzen."
  pause_and_exit 1
fi

# macOS-Sperre für heruntergeladene Dateien entfernen – nur dieser Ordner.
if command -v xattr >/dev/null 2>&1; then
  xattr -dr com.apple.quarantine "$DIR" 2>/dev/null
fi
chmod +x "$DIR"/bin/* "$DIR"/*.command 2>/dev/null

OS="$(uname -s)"
if [ "$OS" = "Darwin" ]; then
  # Apple Silicon auch dann erkennen, wenn das Terminal unter Rosetta läuft
  if [ "$(sysctl -n hw.optional.arm64 2>/dev/null)" = "1" ]; then
    BIN="$DIR/bin/windowblaster-mac-arm64"; OTHER="$DIR/bin/windowblaster-mac-intel"
  else
    BIN="$DIR/bin/windowblaster-mac-intel"; OTHER="$DIR/bin/windowblaster-mac-arm64"
  fi
else
  BIN="$DIR/bin/windowblaster-linux-amd64"; OTHER=""
fi

if [ ! -f "$BIN" ]; then
  echo "❌ Das Server-Programm fehlt: $BIN"
  echo "   Bitte WindowBlaster.zip neu herunterladen, entpacken und die Startdatei IM neuen Ordner benutzen."
  pause_and_exit 1
fi

"$BIN" --app "$DIR/app" "$@"
STATUS=$?

# 126/127: falsche Architektur oder nicht ausführbar → das andere Programm probieren
if { [ $STATUS -eq 126 ] || [ $STATUS -eq 127 ] || [ $STATUS -eq 86 ]; } && [ -n "$OTHER" ] && [ -f "$OTHER" ]; then
  echo "↻ Versuche die andere Programm-Variante …"
  "$OTHER" --app "$DIR/app" "$@"
  STATUS=$?
fi

if [ $STATUS -ne 0 ] && [ $STATUS -ne 130 ]; then
  echo
  echo "⚠️  Der Server wurde beendet (Code $STATUS)."
  if [ $STATUS -eq 137 ] || [ $STATUS -eq 9 ]; then
    echo "   macOS hat das Programm gestoppt. Lösung: Systemeinstellungen → Datenschutz & Sicherheit"
    echo "   → ganz unten „Dennoch erlauben“ bei windowblaster, dann diese Datei erneut starten."
  fi
  echo "   Hilfe: Datei ANLEITUNG.html in diesem Ordner → Abschnitt „Wenn es nicht startet“."
  pause_and_exit $STATUS
fi
