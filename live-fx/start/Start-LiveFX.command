#!/bin/bash
# LiveFX starten (macOS): im Finder doppelklicken.
# Beim ersten Mal blockiert macOS (Gatekeeper) Dateien aus dem Internet: Rechtsklick (oder ctrl-Klick)
# auf diese Datei -> "Öffnen" -> "Öffnen" bestätigen. Details: start/README-START.txt
# Die eigentliche Arbeit (Node.js suchen und prüfen, Server starten, Browser öffnen) macht start.sh.
cd "$(dirname "$0")" || exit 1
LIVEFX_PAUSE=1 exec /bin/bash ./start.sh "$@"
