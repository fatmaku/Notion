#!/bin/bash
# Window Blaster – lokaler HTTPS-Server für Mac (Doppelklick).
# Nutzt den mitgelieferten Caddy-Webserver mit eigener lokaler Zertifikatsstelle.
cd "$(dirname "$0")"
clear
echo "🚗  Window Blaster – lokaler Server"
echo

ARCH=$(uname -m)
BIN="bin/caddy-darwin-arm64"; [ "$ARCH" = "x86_64" ] && BIN="bin/caddy-darwin-amd64"
[ "$(uname -s)" = "Linux" ] && BIN="bin/caddy-linux-amd64"
if [ ! -f "$BIN" ]; then
  echo "❌ Der Server fehlt noch: bitte die zweite Datei in denselben Ordner entpacken:"
  echo "   Apple-Silicon-Mac (Chip „Apple M…“): WindowBlaster-Mac-Server-AppleSilicon.zip"
  echo "   Intel-Mac:                           WindowBlaster-Mac-Server-Intel.zip"
  echo "   (Apple-Menü → „Über diesen Mac“ zeigt den Chip.) Danach diese Datei erneut doppelklicken."
  echo "   Erwartet wird: $PWD/$BIN"
  echo
  if command -v python3 >/dev/null 2>&1; then
    echo "Notlösung ohne HTTPS (nur Mac-Browser): http://localhost:8080 …"; cd app && python3 -m http.server 8080
  fi
  read -r -p "Enter zum Schließen"; exit 1
fi
chmod +x bin/* 2>/dev/null || true
xattr -dr com.apple.quarantine bin app 2>/dev/null || true
mkdir -p run/data run/config

# Adressen: localhost, alle eigenen IPs, Internetfreigabe (192.168.2.1) und <mac>.local
IPS=$(ifconfig 2>/dev/null | awk '/inet / && $2 != "127.0.0.1" {print $2}')
[ -z "$IPS" ] && IPS=$(hostname -I 2>/dev/null)
HOST=$(scutil --get LocalHostName 2>/dev/null || hostname -s)
HOSTS="localhost 127.0.0.1 192.168.2.1 ${HOST}.local $IPS"
ADDR=""
for h in $HOSTS; do ADDR="${ADDR}${ADDR:+, }https://${h}:8443"; done

cat > run/Caddyfile <<CADDY
{
	local_certs
	skip_install_trust
	auto_https disable_redirects
	admin off
}

# HTTPS für Handy und Mac (Kamera + Offline-Installation nach Zertifikat-Import)
${ADDR} {
	root * app
	encode gzip
	header Cache-Control "no-cache"
	header /mediapipe/* Cache-Control "public, max-age=31536000, immutable"
	header /models/* Cache-Control "public, max-age=31536000, immutable"
	header /models/*.tflite Content-Type application/octet-stream
	header /manifest.webmanifest Content-Type application/manifest+json
	file_server
}

# HTTP: Zertifikat fürs Handy abholen + Android-Notweg
http://:8080 {
	handle /zertifikat.crt {
		root * run/data/caddy/pki/authorities/local
		rewrite * /root.crt
		header Content-Type application/x-x509-ca-cert
		header Content-Disposition "attachment; filename=WindowBlaster-Zertifikat.crt"
		file_server
	}
	handle {
		root * app
		encode gzip
		file_server
	}
}
CADDY

export XDG_DATA_HOME="$PWD/run/data" XDG_CONFIG_HOME="$PWD/run/config" HOME="${HOME:-$PWD/run}"

MAINIP=$(echo $IPS | awk '{print $1}')
echo "Auf dem Mac:      https://localhost:8443/        (Demo: https://localhost:8443/?demo=1)"
echo
echo "Auf dem Handy (gleiches WLAN oder WLAN der Mac-Internetfreigabe):"
for ip in $IPS; do echo "   https://$ip:8443/"; done
echo "   https://${HOST}.local:8443/"
echo
echo "Zertifikat fürs Handy (einmalig, für Offline-Installation):"
echo "   http://${MAINIP:-<Mac-IP>}:8080/zertifikat.crt   – Anleitung: Handy-vertrauen.command"
echo
echo "Beenden mit Strg+C oder Fenster schließen."
echo "────────────────────────────────────────────────────────────"
( sleep 2; open "https://localhost:8443/?demo=1" 2>/dev/null || true ) &
"$BIN" run --config run/Caddyfile --adapter caddyfile
STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo
  echo "⚠️  Caddy konnte nicht starten (Code $STATUS)."
  echo "   Falls macOS das Programm blockiert: Systemeinstellungen → Datenschutz & Sicherheit → „Trotzdem öffnen“,"
  echo "   oder im Terminal:  xattr -dr com.apple.quarantine \"$PWD\""
  echo "   Notlösung ohne HTTPS (nur Mac-Browser / Android mit Chrome-Flag):"
  if command -v python3 >/dev/null 2>&1; then
    echo "   Starte Python-Server auf http://localhost:8080 …"
    cd app && python3 -m http.server 8080
  elif command -v ruby >/dev/null 2>&1; then
    echo "   Starte Ruby-Server auf http://localhost:8080 …"
    ruby -run -e httpd app -p 8080
  fi
  read -r -p "Enter zum Schließen"
fi
