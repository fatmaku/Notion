#!/bin/bash
# Kopiert das lokale Stammzertifikat auf den Schreibtisch und erklärt die Installation auf dem Handy.
cd "$(dirname "$0")"
clear
CERT="run/data/caddy/pki/authorities/local/root.crt"
if [ ! -f "$CERT" ]; then
  echo "Bitte zuerst einmal „Start-Window-Blaster.command“ starten – dabei wird das Zertifikat erzeugt."
  read -r -p "Enter zum Schließen"; exit 1
fi
cp "$CERT" "$HOME/Desktop/WindowBlaster-Zertifikat.crt" 2>/dev/null && echo "✅ Zertifikat liegt auf dem Schreibtisch: WindowBlaster-Zertifikat.crt"
IP=$(ifconfig 2>/dev/null | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}')
cat <<TXT

Warum? Kamera und Offline-Installation funktionieren im Browser nur bei einer Adresse,
der das Handy vertraut. Dieses Zertifikat macht deinen Mac zu so einer Adresse.
Es gilt nur für diesen Mac und kann jederzeit wieder entfernt werden.

📱 iPhone / iPad
  1. Server läuft (Start-Window-Blaster.command). In Safari öffnen:  http://${IP:-<Mac-IP>}:8080/zertifikat.crt
     (oder die Datei vom Schreibtisch per AirDrop ans iPhone schicken) → „Erlauben“.
  2. Einstellungen → „Profil geladen“ → Installieren (Code eingeben).
  3. Einstellungen → Allgemein → Info → Zertifikatsvertrauenseinstellungen → Schalter bei „Caddy Local Authority“ EIN.
  4. Safari: https://${IP:-<Mac-IP>}:8443  öffnen → Teilen → „Zum Home-Bildschirm“.
  5. App vom Home-Bildschirm starten → „Für offline vorbereiten“ antippen (34 MB). Fertig – läuft ab jetzt ohne Mac und ohne Internet.

🤖 Android
  1. In Chrome öffnen:  http://${IP:-<Mac-IP>}:8080/zertifikat.crt  (Datei wird gespeichert).
  2. Einstellungen → Sicherheit → Verschlüsselung & Anmeldedaten → Zertifikat installieren → CA-Zertifikat → Datei wählen.
  3. Chrome: https://${IP:-<Mac-IP>}:8443  → Menü → „App installieren“ → in der App „Für offline vorbereiten“.

Hinweis: Nach einem Neuinstallieren des Pakets (neuer run-Ordner) entsteht ein neues Zertifikat – dann Schritt 1–3 wiederholen.
TXT
read -r -p "Enter zum Schließen"
