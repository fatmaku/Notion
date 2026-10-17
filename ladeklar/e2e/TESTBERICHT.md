# Testbericht – Ladeklar 1.0

Automatischer End-to-End-Test vom 17.10.2026, 05:10:37 (Chromium 141.0.7390.37, echter Server, frische Datenbank).

**Ergebnis: 28 von 30 Abläufen bestanden, keine Browser-Fehler.**

Geräte: Desktop 1440 × 900 (Lizenzgeber, Unternehmen) · Handy 390 × 844 mit Touch (Fahrer) · Tablet 1024 × 768 (Disposition) · Tablet quer 1180 × 820 (Fahrerhaus).

## Lizenzgeber

| | Ablauf | Dauer | Bild |
|---|---|---|---|
| ✅ | Anmeldeseite lädt mit Marke und Sprachen | 1.2 s | [01-login-desktop.png](screens/01-login-desktop.png) |
| ✅ | Anmelden (E-Mail + Passwort) | 2.3 s | [02-lizenzgeber-uebersicht.png](screens/02-lizenzgeber-uebersicht.png) |
| ✅ | Lizenznehmer anlegen (Tarif Flotte, 30 Tage Test) | 1.6 s | [03-lizenzgeber-angelegt.png](screens/03-lizenzgeber-angelegt.png) |
| ✅ | Sieht Nutzung (Fahrer, Fahrzeuge, Lieferungen), aber keine Lieferinhalte | 1.1 s | [25-lizenzgeber-lizenznehmer.png](screens/25-lizenzgeber-lizenznehmer.png) |
| ❌ | Sperren → Fahrer kann nichts mehr ändern; Aktivieren → weiter – **Sperre greift nicht** | 1.1 s |  |
| ❌ | Abrechnung zeigt den aktiven Kunden mit 19 % USt. – **page.waitForSelector: Timeout 30000ms exceeded.** | 30.1 s |  |

## Unternehmen

| | Ablauf | Dauer | Bild |
|---|---|---|---|
| ✅ | Admin meldet sich mit Startpasswort an – zuerst eigenes Passwort, vorher geht nichts | 2.7 s | [04-unternehmen-erstes-passwort.png](screens/04-unternehmen-erstes-passwort.png) |
| ✅ | Logo hochladen, Farbe und App-Name setzen (White-Label) | 1.2 s | [05-unternehmen-marke.png](screens/05-unternehmen-marke.png) |
| ✅ | Fahrzeug-Pool anlegen (LKW + Auflieger) | 12.2 s | [06-unternehmen-fahrzeuge.png](screens/06-unternehmen-fahrzeuge.png) |
| ✅ | Fahrer anlegen → PIN + Einladung mit QR-Code | 2.2 s | [07-unternehmen-fahrer-einladung.png](screens/07-unternehmen-fahrer-einladung.png) |
| ✅ | Lieferung Stuttgart → Hamburg anlegen (offen für alle Fahrer) | 1.6 s | [08-unternehmen-neue-lieferung.png](screens/08-unternehmen-neue-lieferung.png) |
| ✅ | Bestätigung kommt live an (Mitteilung, Live-Board ohne Neuladen) | 0.9 s | [12-unternehmen-live-bestaetigt.png](screens/12-unternehmen-live-bestaetigt.png) |
| ✅ | Zugestellt mit Lieferschein: Verlauf, Foto, Abliefernachweis | 2.6 s | [17-unternehmen-lieferung-zugestellt.png](screens/17-unternehmen-lieferung-zugestellt.png) |
| ✅ | Zweite Lieferung direkt dem Fahrer zuweisen | 0.9 s |  |
| ✅ | Problem kommt als dringende Mitteilung, Störung wird erledigt | 1.4 s | [20-unternehmen-stoerung.png](screens/20-unternehmen-stoerung.png) |
| ✅ | Tablet (1024 × 768): Live-Board mit Navigation | 2.5 s | [23-tablet-live.png](screens/23-tablet-live.png) |

## Fahrer

| | Ablauf | Dauer | Bild |
|---|---|---|---|
| ✅ | Firmen-Login /t/TEST zeigt Logo, Anmeldung per PIN-Tastatur | 2.0 s | [09-fahrer-login.png](screens/09-fahrer-login.png) |
| ✅ | LKW und Auflieger aus dem Pool wählen | 2.1 s | [10-fahrer-fahrzeug-pool.png](screens/10-fahrer-fahrzeug-pool.png) |
| ✅ | Offene Lieferung sehen und Buchung bestätigen (1 Tipp) | 1.0 s | [11-fahrer-offener-auftrag.png](screens/11-fahrer-offener-auftrag.png) |
| ✅ | Aufgeladen – Rückgängig ist 2 Minuten möglich | 5.7 s | [13-fahrer-unterwegs.png](screens/13-fahrer-unterwegs.png) |
| ✅ | Funkloch: Abgeladen offline tippen, wird später gesendet | 1.1 s | [14-fahrer-offline.png](screens/14-fahrer-offline.png) |
| ✅ | Notiz an die Disposition | 1.9 s |  |
| ✅ | Lieferschein fotografieren, Empfänger, abschließen | 2.7 s | [15-fahrer-lieferschein.png](screens/15-fahrer-lieferschein.png) |
| ✅ | Push-Mitteilung „Neuer Auftrag“ (in der Sprache des Fahrers) und Problem melden | 5.0 s | [19-fahrer-problem.png](screens/19-fahrer-problem.png) |
| ✅ | Funkloch bis zum Schluss: Aufgeladen, Abgeladen, Lieferschein-Foto, Zugestellt – alles offline | 7.6 s | [21-fahrer-offline-abschluss.png](screens/21-fahrer-offline-abschluss.png) |
| ✅ | Sicherheit: Fahrer kann keine Büro-Funktionen aufrufen | 0.0 s |  |
| ✅ | Handy: keine waagerechte Scroll-Leiste, große Tipp-Flächen (≥ 56 px) | 0.0 s |  |
| ✅ | Sprache wechseln (Türkisch) und Verlauf ansehen | 1.2 s | [22-fahrer-verlauf-tr.png](screens/22-fahrer-verlauf-tr.png) |
| ✅ | Tablet im Fahrerhaus (Querformat): Fahrer-App zweispaltig | 3.6 s | [24-tablet-fahrer.png](screens/24-tablet-fahrer.png) |

## Demo

| | Ablauf | Dauer | Bild |
|---|---|---|---|
| ✅ | Online-Demo: Split-Ansicht, Fahrer-Tipp erscheint live im Büro | 4.3 s | [26-demo-split.png](screens/26-demo-split.png) |

Unit- und API-Tests: `npm run test:unit` (Engine, Rechte, Mandantentrennung, HTTP, Push-Verschlüsselung).
