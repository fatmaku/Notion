# Testbericht – Ladeklar 1.0

Automatischer End-to-End-Test vom 17.10.2026, 07:38:45 (Chromium 141.0.7390.37, echter Server, frische Datenbank).

**Ergebnis: 37 von 37 Abläufen bestanden, keine Browser-Fehler.**

Geräte: Desktop 1440 × 900 (Lizenzgeber, Unternehmen) · Handy 390 × 844 mit Touch (Fahrer) · Tablet 1024 × 768 (Disposition) · Tablet quer 1180 × 820 (Fahrerhaus).

## Lizenzgeber

| | Ablauf | Dauer | Bild |
|---|---|---|---|
| ✅ | Anmeldeseite lädt mit Marke und Sprachen | 1.3 s | [01-login-desktop.png](screens/01-login-desktop.png) |
| ✅ | Anmelden (E-Mail + Passwort) | 2.4 s | [02-lizenzgeber-uebersicht.png](screens/02-lizenzgeber-uebersicht.png) |
| ✅ | Lizenznehmer anlegen (Tarif Flotte, 30 Tage Test) | 1.8 s | [03-lizenzgeber-angelegt.png](screens/03-lizenzgeber-angelegt.png) |
| ✅ | Sieht Nutzung (Fahrer, Fahrzeuge, Lieferungen), aber keine Lieferinhalte | 1.1 s | [30-lizenzgeber-lizenznehmer.png](screens/30-lizenzgeber-lizenznehmer.png) |
| ✅ | Sperren → Fahrer abgemeldet, Büro kann nur noch lesen; Aktivieren → weiter | 3.9 s | [31-lizenzgeber-lizenz.png](screens/31-lizenzgeber-lizenz.png) |
| ✅ | Abrechnung zeigt den aktiven Kunden mit 19 % USt. | 1.0 s | [32-lizenzgeber-abrechnung.png](screens/32-lizenzgeber-abrechnung.png) |

## Unternehmen

| | Ablauf | Dauer | Bild |
|---|---|---|---|
| ✅ | Admin meldet sich mit Startpasswort an – zuerst eigenes Passwort, vorher geht nichts | 2.7 s | [04-unternehmen-erstes-passwort.png](screens/04-unternehmen-erstes-passwort.png) |
| ✅ | Logo hochladen, Farbe und App-Name setzen (White-Label) | 1.3 s | [05-unternehmen-marke.png](screens/05-unternehmen-marke.png) |
| ✅ | Fahrzeug-Pool anlegen (LKW + Auflieger) | 7.1 s | [06-unternehmen-fahrzeuge.png](screens/06-unternehmen-fahrzeuge.png) |
| ✅ | Fahrer anlegen → PIN + Einladung mit QR-Code | 6.0 s | [07-unternehmen-fahrer-einladung.png](screens/07-unternehmen-fahrer-einladung.png) |
| ✅ | Lieferung Stuttgart → Hamburg anlegen (offen für alle Fahrer) | 1.5 s | [10-unternehmen-neue-lieferung.png](screens/10-unternehmen-neue-lieferung.png) |
| ✅ | Bestätigung kommt live an (Mitteilung, Live-Board ohne Neuladen) | 0.9 s | [14-unternehmen-live-bestaetigt.png](screens/14-unternehmen-live-bestaetigt.png) |
| ✅ | Zugestellt mit Lieferschein: Verlauf, Foto, Abliefernachweis | 2.8 s | [19-unternehmen-lieferung-zugestellt.png](screens/19-unternehmen-lieferung-zugestellt.png) |
| ✅ | Zweite Lieferung direkt dem Fahrer zuweisen | 1.1 s |  |
| ✅ | Problem kommt als dringende Mitteilung, Störung wird erledigt | 9.3 s | [22-unternehmen-stoerung.png](screens/22-unternehmen-stoerung.png) |
| ✅ | Dritte Lieferung dem Fahrer zuweisen (Auftraggeber mit Formel im Namen) | 1.0 s |  |
| ✅ | CSV-Export entschärft eine Formel im Auftraggeber und steht im Protokoll | 0.1 s |  |
| ✅ | Zwei-Faktor-Anmeldung: einschalten, abmelden – die Anmeldung verlangt den Code | 3.0 s | [25-unternehmen-2fa-code.png](screens/25-unternehmen-2fa-code.png) |
| ✅ | Speicher voll: Upload abgelehnt mit klarer Meldung, Admin bekommt einen Hinweis, nichts landet auf der Platte | 1.4 s | [26-unternehmen-speicher-voll.png](screens/26-unternehmen-speicher-voll.png) |
| ✅ | Tablet (1024 × 768): Live-Board mit Navigation | 2.4 s | [28-tablet-live.png](screens/28-tablet-live.png) |

## Fahrer

| | Ablauf | Dauer | Bild |
|---|---|---|---|
| ✅ | Einladungslink gilt genau einmal: PIN eingeben → angemeldet, danach abgelehnt | 3.5 s | [08-fahrer-einladung.png](screens/08-fahrer-einladung.png) |
| ✅ | Firmen-Login /t/TEST zeigt Logo, Anmeldung per PIN-Tastatur | 2.2 s | [11-fahrer-login.png](screens/11-fahrer-login.png) |
| ✅ | LKW und Auflieger aus dem Pool wählen | 1.9 s | [12-fahrer-fahrzeug-pool.png](screens/12-fahrer-fahrzeug-pool.png) |
| ✅ | Offene Lieferung sehen und Buchung bestätigen (1 Tipp) | 1.0 s | [13-fahrer-offener-auftrag.png](screens/13-fahrer-offener-auftrag.png) |
| ✅ | Aufgeladen – Rückgängig ist 2 Minuten möglich | 5.6 s | [15-fahrer-unterwegs.png](screens/15-fahrer-unterwegs.png) |
| ✅ | Funkloch: Abgeladen offline tippen, wird später gesendet | 1.1 s | [16-fahrer-offline.png](screens/16-fahrer-offline.png) |
| ✅ | Notiz an die Disposition | 1.9 s |  |
| ✅ | Antwort geht unterwegs verloren: die Notiz wird mit demselben _op wiederholt und nur einmal gespeichert | 0.9 s |  |
| ✅ | Lieferschein fotografieren, Empfänger, abschließen | 2.6 s | [17-fahrer-lieferschein.png](screens/17-fahrer-lieferschein.png) |
| ✅ | Push-Mitteilung „Neuer Auftrag“ (in der Sprache des Fahrers) und Problem melden | 5.4 s | [21-fahrer-problem.png](screens/21-fahrer-problem.png) |
| ✅ | Funkloch bis zum Schluss: Aufgeladen, Abgeladen, Lieferschein-Foto, Zugestellt – alles offline | 7.6 s | [23-fahrer-offline-abschluss.png](screens/23-fahrer-offline-abschluss.png) |
| ✅ | App im Funkloch neu geöffnet: Tour, Foto und Zugestellt gehen offline – das Büro bekommt alles mit den Tipp-Zeiten | 18.7 s | [24-fahrer-funkloch-neustart.png](screens/24-fahrer-funkloch-neustart.png) |
| ✅ | Sicherheit: Fahrer kann keine Büro-Funktionen aufrufen | 0.0 s |  |
| ✅ | Handy: keine waagerechte Scroll-Leiste, große Tipp-Flächen (≥ 56 px) | 0.0 s |  |
| ✅ | Sprache wechseln (Türkisch) und Verlauf ansehen | 1.1 s | [27-fahrer-verlauf-tr.png](screens/27-fahrer-verlauf-tr.png) |
| ✅ | Tablet im Fahrerhaus (Querformat): Fahrer-App zweispaltig | 3.0 s | [29-tablet-fahrer.png](screens/29-tablet-fahrer.png) |

## Demo

| | Ablauf | Dauer | Bild |
|---|---|---|---|
| ✅ | Online-Demo: Split-Ansicht, Fahrer-Tipp erscheint live im Büro | 3.8 s | [33-demo-split.png](screens/33-demo-split.png) |

Unit- und API-Tests: `npm run test:unit` (Engine, Rechte, Mandantentrennung, HTTP, Push-Verschlüsselung).
