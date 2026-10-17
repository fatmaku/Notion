#!/bin/bash
# LiveFX starten (macOS): im Finder doppelklicken.
# Meldet macOS "beschädigt" / "nicht verifizierter Entwickler" (Gatekeeper sperrt Dateien aus dem Internet):
# Terminal öffnen, "xattr -cr " tippen, den LiveFX-Ordner hineinziehen, Enter - danach per Doppelklick.
# Oder: "bash " tippen, start.sh hineinziehen, Enter. Details: start/MAC-HILFE.txt, start/README-START.txt
# Die eigentliche Arbeit (Node.js suchen und prüfen, Server starten, Browser öffnen) macht start.sh.
cd "$(dirname "$0")" || exit 1
LIVEFX_PAUSE=1 exec /bin/bash ./start.sh "$@"
