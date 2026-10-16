# White-Label-Apps im App Store und bei Google Play

**Stand:** Die Fahrer-App läuft heute schon als installierbare Web-App (PWA) mit Firmenlogo, Push-Mitteilungen
(Android, iOS ab 16.4 nach „Zum Home-Bildschirm“) und Offline-Warteschlange. Das reicht für die meisten Kunden.

Für Premium-Kunden, die **eine eigene App mit eigenem Namen im Store** wollen (Zusatz 1.990 € einmalig + 99 €/Monat),
wird dieselbe Web-App mit [Capacitor](https://capacitorjs.com) in eine native Hülle verpackt – eine Hülle je Kunde.

## Ablauf je Kunde (ca. 1 Tag)

1. **Store-Konten des Kunden**: Apple Developer Program (Organisation, D-U-N-S-Nummer nötig) und Google Play Console.
   Apple verlangt, dass „Template-Apps“ im Konto des Kunden erscheinen (App Review Guideline 4.2.6).
2. Konfiguration kopieren und anpassen: `capacitor.config.json` → `appId` (z. B. `de.kaya-logistik.fahrer`),
   `appName`, `server.url` = `https://<domain>/t/<FIRMENCODE>`.
3. Projekt erzeugen (auf einem Mac für iOS):
   ```bash
   npm init -y && npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/push-notifications @capacitor/splash-screen
   mkdir -p www && echo '<meta http-equiv="refresh" content="0;url=https://app.ladeklar.de">' > www/index.html
   npx cap add android && npx cap add ios
   npx @capacitor/assets generate --iconBackgroundColor '#ffffff' --splashBackgroundColor '#0b1622'   # Icon = Kundenlogo (1024 px)
   npx cap sync
   ```
4. Push in der Store-App: Firebase-Projekt (Android) bzw. APNs-Schlüssel (iOS) des Kunden; der Server bekommt
   dafür einen FCM-/APNs-Versand neben Web-Push (Roadmap v1.1 – Schnittstelle `deliverPush` in `server/index.js`).
5. Datenschutz-Angaben im Store („App-Datenschutz“ bei Apple, „Datensicherheit“ bei Google) aus
   `docs/recht/DATENSCHUTZ.md` und `DATENSCHUTZHINWEISE_FAHRER.md` übernehmen.
6. Signieren und hochladen: Android App Bundle (`./gradlew bundleRelease`), iOS über Xcode → Archive.

> **Cyber Resilience Act:** Für installierbare Apps gelten ab 11.09.2026 Meldepflichten für ausgenutzte Schwachstellen
> (siehe `docs/recht/CHECKLISTE_GRUENDUNG.md`). Updates kommen bei dieser Bauart über den Server – die Hülle ändert sich selten.
