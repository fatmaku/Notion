# Testbericht – Ladeklar 1.0

Automatischer End-to-End-Test vom 16.10.2026, 19:12:29 (Chromium 141.0.7390.37, echter Server, frische Datenbank).

**Ergebnis: 30 von 30 Abläufen bestanden, keine Browser-Fehler.**

Geräte: Desktop 1440 × 900 (Lizenzgeber, Unternehmen) · Handy 390 × 844 mit Touch (Fahrer) · Tablet 1024 × 768 (Disposition) · Tablet quer 1180 × 820 (Fahrerhaus).

## Lizenzgeber

| | Ablauf | Dauer | Bild |
|---|---|---|---|
| ✅ | Anmeldeseite lädt mit Marke und Sprachen | 0.3 s | [01-login-desktop.png](screens/01-login-desktop.png) |
| ✅ | Anmelden (E-Mail + Passwort) | 1.4 s | [02-lizenzgeber-uebersicht.png](screens/02-lizenzgeber-uebersicht.png) |
| ✅ | Lizenznehmer anlegen (Tarif Flotte, 30 Tage Test) | 0.9 s | [03-lizenzgeber-angelegt.png](screens/03-lizenzgeber-angelegt.png) |
| ✅ | Sieht Nutzung (Fahrer, Fahrzeuge, Lieferungen), aber keine Lieferinhalte | 0.3 s | [23-lizenzgeber-lizenznehmer.png](screens/23-lizenzgeber-lizenznehmer.png) |
| ✅ | Sperren → Fahrer kann nichts mehr ändern; Aktivieren → weiter | 1.0 s | [24-lizenzgeber-lizenz.png](screens/24-lizenzgeber-lizenz.png) |
| ✅ | Abrechnung zeigt den aktiven Kunden mit 19 % USt. | 0.2 s | [25-lizenzgeber-abrechnung.png](screens/25-lizenzgeber-abrechnung.png) |

## Unternehmen

| | Ablauf | Dauer | Bild |
|---|---|---|---|
| ✅ | Admin meldet sich mit Startpasswort an | 1.5 s |  |
| ✅ | Eigenes Passwort vergeben | 0.3 s |  |
| ✅ | Logo hochladen, Farbe und App-Name setzen (White-Label) | 0.5 s | [04-unternehmen-marke.png](screens/04-unternehmen-marke.png) |
| ✅ | Fahrzeug-Pool anlegen (LKW + Auflieger) | 12.5 s | [05-unternehmen-fahrzeuge.png](screens/05-unternehmen-fahrzeuge.png) |
| ✅ | Fahrer anlegen → PIN + Einladung mit QR-Code | 1.3 s | [06-unternehmen-fahrer-einladung.png](screens/06-unternehmen-fahrer-einladung.png) |
| ✅ | Lieferung Stuttgart → Hamburg anlegen (offen für alle Fahrer) | 0.9 s | [07-unternehmen-neue-lieferung.png](screens/07-unternehmen-neue-lieferung.png) |
| ✅ | Bestätigung kommt live an (Mitteilung, Live-Board ohne Neuladen) | 0.2 s | [11-unternehmen-live-bestaetigt.png](screens/11-unternehmen-live-bestaetigt.png) |
| ✅ | Zugestellt mit Lieferschein: Verlauf, Foto, Abliefernachweis | 1.0 s | [16-unternehmen-lieferung-zugestellt.png](screens/16-unternehmen-lieferung-zugestellt.png) |
| ✅ | Zweite Lieferung direkt dem Fahrer zuweisen | 0.8 s |  |
| ✅ | Problem kommt als dringende Mitteilung, Störung wird erledigt | 9.4 s | [19-unternehmen-stoerung.png](screens/19-unternehmen-stoerung.png) |
| ✅ | Tablet (1024 × 768): Live-Board mit Navigation | 1.5 s | [21-tablet-live.png](screens/21-tablet-live.png) |

## Fahrer

| | Ablauf | Dauer | Bild |
|---|---|---|---|
| ✅ | Firmen-Login /t/TEST zeigt Logo, Anmeldung per PIN-Tastatur | 1.8 s | [08-fahrer-login.png](screens/08-fahrer-login.png) |
| ✅ | LKW und Auflieger aus dem Pool wählen | 1.7 s | [09-fahrer-fahrzeug-pool.png](screens/09-fahrer-fahrzeug-pool.png) |
| ✅ | Offene Lieferung sehen und Buchung bestätigen (1 Tipp) | 0.2 s | [10-fahrer-offener-auftrag.png](screens/10-fahrer-offener-auftrag.png) |
| ✅ | Aufgeladen – Rückgängig ist 2 Minuten möglich | 5.6 s | [12-fahrer-unterwegs.png](screens/12-fahrer-unterwegs.png) |
| ✅ | Funkloch: Abgeladen offline tippen, wird später gesendet | 0.3 s | [13-fahrer-offline.png](screens/13-fahrer-offline.png) |
| ✅ | Notiz an die Disposition | 3.0 s |  |
| ✅ | Lieferschein fotografieren, Empfänger, abschließen | 1.1 s | [14-fahrer-lieferschein.png](screens/14-fahrer-lieferschein.png) |
| ✅ | Push-Mitteilung „Neuer Auftrag“ (in der Sprache des Fahrers) und Problem melden | 4.5 s | [18-fahrer-problem.png](screens/18-fahrer-problem.png) |
| ✅ | Sicherheit: Fahrer kann keine Büro-Funktionen aufrufen | 0.0 s |  |
| ✅ | Handy: keine waagerechte Scroll-Leiste, große Tipp-Flächen (≥ 56 px) | 0.0 s |  |
| ✅ | Sprache wechseln (Türkisch) und Verlauf ansehen | 0.5 s | [20-fahrer-verlauf-tr.png](screens/20-fahrer-verlauf-tr.png) |
| ✅ | Tablet im Fahrerhaus (Querformat): Fahrer-App zweispaltig | 1.9 s | [22-tablet-fahrer.png](screens/22-tablet-fahrer.png) |

## Demo

| | Ablauf | Dauer | Bild |
|---|---|---|---|
| ✅ | Online-Demo: Split-Ansicht, Fahrer-Tipp erscheint live im Büro | 3.9 s | [26-demo-split.png](screens/26-demo-split.png) |

Unit- und API-Tests: `npm run test:unit` (Engine, Rechte, Mandantentrennung, HTTP, Push-Verschlüsselung).
