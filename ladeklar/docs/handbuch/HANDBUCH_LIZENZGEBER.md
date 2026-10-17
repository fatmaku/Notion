# Ladeklar – Handbuch für den Lizenzgeber

Für den Plattformbetreiber · Stand 16.10.2026 · Ladeklar Version 1.0

Als Lizenzgeber vermieten Sie Ladeklar an Speditionen und Transportunternehmen (Lizenznehmer). In der **Lizenzgeber-Konsole** legen Sie Kunden an, verwalten Tarif, Plätze, Laufzeit und Status und sehen Ihren Umsatz. Die Lieferdaten Ihrer Kunden sehen Sie bewusst nicht. Dieses Handbuch beschreibt die Konsole, den Betrieb des Servers und den Start eines neuen Kunden.

## Inhalt

1. [Anmelden](#1-anmelden)
2. [Die Konsole: Übersicht](#2-die-konsole-übersicht)
3. [Lizenznehmer anlegen](#3-lizenznehmer-anlegen)
4. [Lizenz ändern](#4-lizenz-ändern)
5. [Status: Aktivieren, Test verlängern, Sperren, Kündigen](#5-status-aktivieren-test-verlängern-sperren-kündigen)
6. [Abrechnung](#6-abrechnung)
7. [Tarife](#7-tarife)
8. [Die Datenschutz-Grenze](#8-die-datenschutz-grenze)
9. [Betrieb des Servers](#9-betrieb-des-servers)
10. [Checkliste für den Kundenstart](#10-checkliste-für-den-kundenstart)
11. [Häufige Fragen](#11-häufige-fragen)

---

## 1. Anmelden

1. Öffnen Sie die Adresse Ihres Ladeklar-Servers.
2. Wählen Sie den Reiter **Büro / Disposition**.
3. Geben Sie die **E-Mail** und das **Passwort** Ihres Lizenzgeber-Zugangs ein und klicken Sie auf **Anmelden**.

Den Lizenzgeber-Zugang legen Sie einmalig auf dem Server an (siehe [Abschnitt 9](#den-lizenzgeber-zugang-anlegen)). Das Passwort wählen Sie dabei selbst. Ihr Zugang hat deshalb kein Startpasswort, und die Konsole öffnet sich sofort. Sie bleiben 14 Tage angemeldet, solange Sie die Konsole nutzen. Nach fünf falschen Passwörtern ist der Zugang 15 Minuten gesperrt.

In der Seitenleiste finden Sie **Übersicht**, **Lizenznehmer**, **Abrechnung** und **Tarife**. Der Knopf **Lizenznehmer anlegen** steht oben rechts auf jeder Seite. Unten links stehen Ihr Name, das Schlüssel-Symbol für **Mein Konto** und der Pfeil zum **Abmelden**. Auf dem Handy liegen die Seiten in der Leiste unten; dort öffnet **Konto** Ihr Konto.

### Eigenes Passwort ändern

![Fenster „Mein Konto“ für inhaber@ladeklar.de mit den Feldern „Aktuelles Passwort“ und „Neues Passwort (mind. 10 Zeichen)“, dem Hinweis „Ein langes Passwort schützt alle Lizenznehmer. Teilen Sie den Zugang nicht.“ und den Knöpfen „Abmelden“ und „Passwort ändern“](img/lizenzgeber-09-konto.png)

1. Klicken Sie unten links auf das Schlüssel-Symbol (auf dem Handy: **Konto**). Das Fenster **Mein Konto** öffnet sich.
2. Geben Sie Ihr **Aktuelles Passwort** ein.
3. Geben Sie das **Neue Passwort** ein. Es braucht mindestens 10 Zeichen.
4. Klicken Sie auf **Passwort ändern**. Die Konsole bestätigt „Passwort geändert“.

Stimmt das aktuelle Passwort nicht, erscheint „Das aktuelle Passwort stimmt nicht.“ Im Fenster **Mein Konto** können Sie sich auch abmelden.

> **Wichtig:** Es gibt genau einen Lizenzgeber-Zugang. Ein vergessenes Lizenzgeber-Passwort lässt sich in der Konsole nicht zurücksetzen. Bewahren Sie es sicher auf.

---

## 2. Die Konsole: Übersicht

![Lizenzgeber-Konsole, Übersicht „Ihr Geschäft auf einen Blick“: MRR 509,67 €, ARR 6.116 €, 3 aktive Lizenzen, 2 in der Testphase, 50 Fahrer auf der Plattform, Balken nach Tarif, darunter vier Kacheln, „Jetzt nachfassen: Test endet bald“ und „Neueste Lizenznehmer“](img/lizenzgeber-01-uebersicht.png)

### Umsatz (MRR und ARR)

| Anzeige | Bedeutung |
|---|---|
| **Monatlich wiederkehrender Umsatz (MRR, netto)** | Summe der Monatspreise aller **aktiven** Lizenzen: Tarifpreis + zusätzliche Fahrer + ggf. Store-App (99 €). Jahreszahler zählen mit 10/12 ihres Monatspreises (2 Monate geschenkt). Testphasen, gesperrte, abgelaufene und gekündigte Lizenzen zählen nicht. |
| **ARR** | MRR × 12 |
| **aktive Lizenzen** | Lizenznehmer mit Status „Aktiv“ |
| **in der Testphase** | Lizenznehmer mit laufender Testphase |
| **Fahrer auf der Plattform** | aktive Fahrer aller Lizenznehmer zusammen |
| Balken | Verteilung der Lizenznehmer auf Start, Flotte und Premium (ohne gekündigte) und die Zahl der Lieferungen diesen Monat |

### Kacheln

| Kachel | Zählt |
|---|---|
| **Lizenznehmer gesamt** | alle angelegten Lizenznehmer |
| **Lieferungen im Monat** | im laufenden Monat angelegte Lieferungen aller Kunden (nur die Zahl) |
| **Test endet in 7 Tagen** | Testphasen, die in den nächsten 7 Tagen enden |
| **gesperrt** | Lizenznehmer mit Status „Gesperrt“ |

Darunter folgen:

- **Jetzt nachfassen: Test endet bald** – Kunden, deren Test in den nächsten 7 Tagen endet, mit Datum und **Öffnen**. Rufen Sie diese Kunden an, bevor der Test abläuft.
- **Neueste Lizenznehmer** – die fünf zuletzt angelegten Kunden mit Tarif, Monatspreis, letzter Aktivität, belegten Fahrer-Plätzen und Status. **Alle** öffnet die vollständige Liste.
- ein Hinweis zum Datenschutz: Sie sehen Nutzungszahlen, aber keine Lieferungen, Lieferscheine oder Fahrerdaten.

### Lizenznehmer-Liste

![Liste „Lizenznehmer“ mit den Filtern Alle 6, Aktiv 3, Test 2, Gesperrt 1, Abgelaufen 0 und Gekündigt 0 und einer Tabelle mit Kunde, Tarif, Status, Fahrer, Fahrzeuge, Lieferungen / Monat, Umsatz / Monat und Letzte Aktivität](img/lizenzgeber-02-lizenznehmer.png)

Unter **Lizenznehmer** sehen Sie alle Kunden als Tabelle. Oben filtern Sie nach **Alle**, **Aktiv**, **Test**, **Gesperrt**, **Abgelaufen** und **Gekündigt** (mit Anzahl). Unter **Gekündigt** finden Sie die gekündigten Kunden. Nur sie lassen sich endgültig löschen (siehe [Kunden endgültig löschen](#kunden-endgültig-löschen)).

| Spalte | Inhalt |
|---|---|
| **Kunde** | Logo, Name und Firmencode |
| **Tarif** | Start, Flotte oder Premium; „App“ bei gebuchter Store-App, „jährlich“ bei Jahreszahlung |
| **Status** | Test (mit Enddatum), Aktiv, Gesperrt, Abgelaufen, Gekündigt |
| **Fahrer** | aktive Fahrer / Fahrer-Plätze, mit Balken |
| **Fahrzeuge** | Fahrzeuge im Pool |
| **Lieferungen / Monat** | im laufenden Monat angelegte Lieferungen |
| **Umsatz / Monat** | Monatspreis laut Lizenz |
| **Letzte Aktivität** | wann zuletzt eine Lieferung geändert wurde |

Ein Klick auf eine Zeile öffnet die Lizenz des Kunden (siehe [Abschnitt 4](#4-lizenz-ändern)).

> **Tipp:** Ein voller Fahrer-Balken (z. B. „3/3“) ist ein guter Anlass für ein Upgrade-Gespräch.

---

## 3. Lizenznehmer anlegen

1. Klicken Sie auf **Lizenznehmer anlegen**.
2. Füllen Sie das Formular aus (Tabelle unten).
3. Klicken Sie auf **Anlegen**.

![Formular „Lizenznehmer anlegen“ mit Firmenname „Muster Spedition GmbH“, vorgeschlagenem Firmencode „MUSTERSP“, Präfix „MUS“, Ansprechpartner, Telefon, E-Mail für den Admin-Zugang, Anschrift, Tarif „Flotte · 129 €“, Testphase 30 Tage, Zahlweise und Markenfarbe](img/lizenzgeber-04-anlegen.png)

| Feld | Hinweise |
|---|---|
| **Firmenname \*** | Pflicht. Aus dem Namen wird ein Firmencode vorgeschlagen. |
| **Firmencode (Login der Fahrer)** | Leer lassen übernimmt den Vorschlag (bis 8 Zeichen aus dem Firmennamen). Eigene Eingabe: 3–12 Buchstaben oder Ziffern, wird großgeschrieben. Muss eindeutig sein und lässt sich später in der Konsole nicht ändern. |
| **Präfix Buchungsnummer** | bis 6 Zeichen, z. B. „MUS“ für `MUS-2610-0001` (Präfix, Jahr und Monat, laufende Nummer). Die Nummer beginnt jeden Monat wieder bei 0001. Leer: die ersten drei Zeichen des Firmencodes. Der Kunde kann das Präfix später selbst ändern. |
| **Ansprechpartner** | wird auch der Name des Admin-Zugangs |
| **Telefon** | Kontakt beim Kunden. Diese Nummer wählen die Fahrer auch mit **Disposition anrufen**, bis der Kunde sie ändert. |
| **E-Mail für den Admin-Zugang \*** | Pflicht; damit meldet sich der Kunde an. Jede E-Mail kann nur einen Zugang haben. |
| **Anschrift** | Rechnungs- und Kontaktanschrift |
| **Tarif** | Start, Flotte (vorausgewählt) oder Premium |
| **Testphase (Tage, 0 = sofort aktiv)** | Voreinstellung 30 Tage, höchstens 365. Mit 0 ist die Lizenz sofort aktiv und wird ab dem laufenden Monat berechnet. |
| **Zahlweise** | monatlich oder jährlich (2 Monate geschenkt) |
| **Markenfarbe** | Startfarbe der App; der Kunde kann sie später ändern und sein Logo selbst hochladen |

Die Store-App, eine Laufzeit und eigene Domains stellen Sie nach dem Anlegen in der Lizenz ein (siehe [Abschnitt 4](#4-lizenz-ändern)).

### Zugang und Willkommenstext

Nach dem Anlegen öffnet sich das Fenster **„… ist angelegt“**:

![Fenster „Muster Spedition GmbH ist angelegt“ mit „Testphase läuft bis 15.11., 23:35.“, Firmencode MUSTERSP, Admin-E-Mail, Login-Seite, Startpasswort und Willkommenstext; unten „Willkommenstext kopieren“, „Per E-Mail“ und „Fertig“](img/lizenzgeber-05-zugang.png)

- Ein grüner Hinweis zeigt „Testphase läuft bis …“ oder „Lizenz ist aktiv.“
- **Firmencode**, **Admin** (E-Mail) und **Login-Seite** – die Adresse `…/t/FIRMENCODE` zeigt die Anmeldeseite im Branding des Kunden.
- das **Startpasswort** mit Kopier-Knopf. **Das Startpasswort wird nur jetzt angezeigt.**
- der **Willkommenstext**: „Willkommen bei Ladeklar! Ihr Zugang: … · E-Mail: … · Startpasswort: …. Bitte beim ersten Login ein eigenes Passwort vergeben. Ihre Fahrer melden sich mit dem Firmencode … an.“

Mit **Willkommenstext kopieren** übernehmen Sie den Text in die Zwischenablage, **Per E-Mail** öffnet Ihr E-Mail-Programm mit dem Betreff „Ihr Ladeklar-Zugang“ und dem fertigen Text. **Fertig** schließt das Fenster.

> **Wichtig:** Schicken Sie den Willkommenstext, bevor Sie auf **Fertig** klicken – das Startpasswort lässt sich danach nicht mehr anzeigen. Am sichersten übergeben Sie das Passwort auf einem zweiten Weg (z. B. telefonisch). Ist das Startpasswort verloren, erzeugen Sie mit **Admin-Passwort zurücksetzen** ein neues (siehe [Admin-Passwort zurücksetzen](#admin-passwort-zurücksetzen)).

### Erste Anmeldung des Kunden: eigenes Passwort ist Pflicht

Meldet sich der Admin des Kunden mit dem Startpasswort an, zeigt Ladeklar zuerst nur den Bildschirm **„Bitte vergeben Sie jetzt ein eigenes Passwort.“**:

1. **Startpasswort** eingeben.
2. **Neues Passwort (mind. 10 Zeichen)** eingeben und unter **Neues Passwort wiederholen** noch einmal.
3. **Passwort speichern und weiter** klicken. Erst dann öffnet sich der Arbeitsbereich.

Bis dahin lehnt der Server alle anderen Aktionen ab. Dasselbe gilt nach **Admin-Passwort zurücksetzen** in der Konsole und nach **Neues Passwort** durch einen anderen Admin des Kunden.

---

## 4. Lizenz ändern

Klicken Sie unter **Lizenznehmer** (oder in der Übersicht) auf einen Kunden. Rechts öffnet sich seine Lizenz mit den Bereichen **Lizenz**, **Status**, **Firma und Kontakt** und **Support**. Bei gekündigten Kunden folgt unten **Endgültig löschen**.

![Lizenz von „Kaya Logistik“ (KAYA, Kunde seit 20.8.2026): Status „Aktiv“, Tarif „Flotte“, 129 € / Monat, Kacheln 6/15 Fahrer, 10 Fahrzeuge, 19 Lieferungen / Monat, 2 Büro-Zugänge; Bereich „Lizenz“ mit Tarif, Zusätzliche Fahrer, Zahlweise, „Laufzeit bis (leer = unbefristet)“, „White-Label-App im Store · nur mit Premium“ und „Eigene Domains (Premium, durch Komma getrennt)“ (beide gesperrt), Interne Notiz und „Lizenz speichern“; darunter „Status“ mit „Sperren“ und „Kündigen“](img/lizenzgeber-03-lizenz-bearbeiten.png)

Oben sehen Sie Name, Firmencode, „Kunde seit …“, Logo, Status, Tarif und den aktuellen Monatspreis. Die Kacheln zeigen die Nutzung: **Fahrer** (aktiv / Plätze), **Fahrzeuge**, **Lieferungen / Monat** und **Büro-Zugänge**.

Im Bereich **Lizenz** ändern Sie:

| Feld | Wirkung |
|---|---|
| **Tarif** | Start, Flotte oder Premium. Ändert Preis, Fahrer-Plätze, Fahrzeug- und Disponenten-Grenzen und den Zugang zur REST-API sofort. Beim Wechsel nach Start setzt die Konsole **Zusätzliche Fahrer** auf 0. Beim Wechsel aus Premium entfernt sie den Haken bei der Store-App. |
| **Zusätzliche Fahrer** | weitere Fahrer-Plätze über den Tarif hinaus: 7 € je Fahrer in Flotte, 6 € in Premium. Im Tarif Start ist das Feld gesperrt („Im Tarif Start nicht möglich – bitte auf Flotte wechseln.“). |
| **Zahlweise** | monatlich oder jährlich (zur Abrechnung siehe [Abschnitt 6](#6-abrechnung)) |
| **Laufzeit bis (leer = unbefristet)** | letzter Tag der Lizenz. Die Lizenz endet an diesem Tag um 23:59 Uhr deutscher Zeit. Danach steht der Kunde auf „Abgelaufen“ (siehe [Abschnitt 5](#was-der-status-für-kunden-und-fahrer-bedeutet)). Der Kunde sieht das Datum unter **Einstellungen → Lizenz** als „Laufzeit bis“. |
| **White-Label-App im Store** | nur im Tarif Premium; sonst ist das Feld gesperrt („nur mit Premium“). Eigene App des Kunden im App Store und bei Google Play: +99 € im Monat. Die einmalige Einrichtung (1.990 €) stellen Sie separat in Rechnung. |
| **Eigene Domains (Premium, durch Komma getrennt)** | nur im Tarif Premium: bis zu 5 Adressen wie `fahrer.kaya-logistik.de`, unter denen die Anmeldeseite im Branding des Kunden erscheint (siehe unten) |
| **Interne Notiz** | nur für Sie, z. B. Vertragsnummer oder Absprachen |

Klicken Sie auf **Lizenz speichern**. Oben erscheint „Lizenz gespeichert · … / Monat“ mit dem neuen Monatspreis. Der Kunde sieht den neuen Tarif sofort unter **Einstellungen → Lizenz**.

> **Wichtig:** Beim Wechsel in einen kleineren Tarif bleiben bestehende Fahrer und Fahrzeuge erhalten, auch wenn sie über der neuen Grenze liegen. Der Kunde kann dann aber keine weiteren anlegen, bis er unter der Grenze liegt.

> **Wichtig:** Ist die Laufzeit vorbei, hilft **Aktivieren** nicht. Zum Verlängern tragen Sie unter **Laufzeit bis** ein neues Datum ein oder leeren das Feld und klicken auf **Lizenz speichern**. Nutzen Sie dafür auch nicht **Test +14 Tage**: Das setzt den Kunden zurück in den Test, und er wird nicht mehr berechnet.

### Eigene Domains (Premium)

1. Der Kunde legt bei seinem DNS-Anbieter für die gewünschte Adresse einen CNAME-Eintrag auf `app.ladeklar.de` an (bzw. auf die Adresse Ihres Servers). So steht es auch im Hinweis unter dem Feld.
2. Tragen Sie die Adresse unter **Eigene Domains** ein. Mehrere Adressen trennen Sie mit Komma. Klicken Sie auf **Lizenz speichern**.
3. Tragen Sie die Adresse in Ihrem Reverse Proxy ein, damit er ein HTTPS-Zertifikat holt (Beispiel: `deploy/Caddyfile`).

Die Konsole entfernt `https://` und Pfade und schreibt die Adresse klein. Sie lehnt ungültige Adressen ab („… ist keine gültige Domain (Beispiel: fahrer.firma.de).“) und Adressen, die schon ein anderer Kunde nutzt („Die Domain … ist schon einem anderen Kunden zugeordnet.“).

> **Wichtig:** Wechselt ein Kunde aus Premium in einen kleineren Tarif, leeren Sie zuerst das Feld **Eigene Domains** und speichern. Erst danach wechseln Sie den Tarif. Nach dem Wechsel ist das Feld gesperrt, und bereits eingetragene Domains bleiben sonst eingetragen und erreichbar.

### Firma und Kontakt

![Lizenz von „Kaya Logistik“, weiter unten: „Status“ mit „Sperren“, „Kündigen“ und dem Hinweis zu Gesperrt und Gekündigt; „Firma und Kontakt“ mit Firmenname, Rechtlicher Name (Rechnung), Ansprechpartner, E-Mail (Rechnung, Kontakt), Telefon, USt-IdNr., Anschrift und „Firmendaten speichern“; „Support“ mit „Admin-Passwort zurücksetzen“](img/lizenzgeber-08-firma-support.png)

Unter **Firma und Kontakt** ändern Sie die Stammdaten des Kunden und klicken auf **Firmendaten speichern**. Die Konsole bestätigt „Firmendaten gespeichert“.

| Feld | Wirkung |
|---|---|
| **Firmenname** | Name in der App des Kunden und in der Konsole. Leer bleibt der bisherige Name. |
| **Rechtlicher Name (Rechnung)** | steht in der Abrechnung und in der CSV-Datei als Kunde. Leer: der Firmenname. |
| **Ansprechpartner** | Kontakt beim Kunden |
| **E-Mail (Rechnung, Kontakt)** | nur Kontaktadresse. Die Anmelde-E-Mail des Admins ändert sich dadurch nicht. |
| **Telefon** | Kontakt und zugleich die Nummer, die die Fahrer mit **Disposition anrufen** wählen |
| **USt-IdNr.** | für Ihre Rechnungen |
| **Anschrift** | Rechnungs- und Kontaktanschrift |

Firmenname, Telefon („Telefon Disposition (für Fahrer)“) und Anschrift kann der Admin des Kunden unter **Einstellungen → Firma & Marke** auch selbst ändern. Die übrigen Felder ändern nur Sie.

### Admin-Passwort zurücksetzen

Hat sich der Kunde ausgesperrt (Passwort vergessen, kein zweiter Admin), erzeugen Sie unter **Support** ein neues Startpasswort:

1. Klicken Sie auf **Admin-Passwort zurücksetzen**. Es folgt keine Rückfrage: Das bisherige Passwort gilt sofort nicht mehr.
2. Das Fenster **Neues Startpasswort** zeigt den Admin (Name und E-Mail) und das neue Passwort mit Kopier-Knopf. Es wird nur jetzt angezeigt.
3. Geben Sie das Passwort telefonisch oder auf einem zweiten Weg weiter, nicht in derselben E-Mail wie die Anmeldeadresse.
4. **Fertig** führt zurück zur Lizenz.

Was dabei passiert:

- Es trifft den zuerst angelegten aktiven Admin des Kunden. Sind alle Admins gesperrt, wird der zuerst angelegte wieder entsperrt.
- Alle Sitzungen dieses Admins enden sofort. Eine Sperre nach Fehlversuchen wird aufgehoben.
- Bei der nächsten Anmeldung muss der Admin ein eigenes Passwort vergeben (siehe [Abschnitt 3](#erste-anmeldung-des-kunden-eigenes-passwort-ist-pflicht)).
- Der Vorgang steht im Protokoll des Kunden.
- Das Zurücksetzen funktioniert in jedem Status, auch bei gesperrten, abgelaufenen und gekündigten Kunden.

---

## 5. Status: Aktivieren, Test verlängern, Sperren, Kündigen

Im Bereich **Status** der Lizenz stehen – je nach aktuellem Status – diese Knöpfe:

| Knopf | Erscheint, wenn | Wirkung |
|---|---|---|
| **Aktivieren** | der Status nicht „Aktiv“ ist | Lizenz ist aktiv. Beim ersten Aktivieren beginnt die bezahlte Lizenz und wird ab dem laufenden Monat berechnet. |
| **Test +14 Tage** | Test läuft oder ist abgelaufen (auch nach Ende der Laufzeit) | Status wird „Test“; das Testende wird um 14 Tage verschoben (ab dem bisherigen Testende bzw. ab heute, wenn es schon vorbei ist). Bestätigung „Testphase verlängert“. |
| **Sperren** | der Status nicht „Gesperrt“ ist | Kunde kann nur noch lesen und exportieren; Fahrer können sich nicht anmelden |
| **Kündigen** | der Status nicht „Gekündigt“ ist | Vertrag beendet; nur der Admin des Kunden kann sich noch anmelden und exportieren |

Darunter erinnert die Konsole: „Gesperrt: Kunde kann Daten ansehen und exportieren, aber nichts ändern; Fahrer können sich nicht anmelden. Gekündigt: nur der Admin meldet sich noch an, um die Daten zu exportieren.“ Jede Änderung bestätigt „Status gespeichert“.

### Was der Status für Kunden und Fahrer bedeutet

| Status | Büro des Kunden | Fahrer | Abrechnung / MRR |
|---|---|---|---|
| **Test** | alle Funktionen; ab 10 Tagen vor Ende Hinweis „Testphase: noch … Tage“ | alle Funktionen | nicht berechnet |
| **Abgelaufen** (Testende oder **Laufzeit bis** vorbei, automatisch) | anmelden, ansehen und exportieren, aber nichts ändern; Hinweis „Ihr Zugang ist gesperrt …“ | keine Anmeldung; bereits angemeldete Fahrer können keine Schritte mehr senden | Test: nicht berechnet. Laufzeit: berechnet bis einschließlich des Monats, in dem sie endet. Zählt nicht zum MRR. |
| **Aktiv** | alle Funktionen | alle Funktionen | berechnet |
| **Gesperrt** | anmelden, ansehen und exportieren, aber nichts ändern; Hinweis „Ihr Zugang ist gesperrt …“ | keine Anmeldung („Der Zugang ist zurzeit gesperrt. Bitte die Disposition anrufen.“); bereits angemeldete Fahrer können keine Schritte mehr senden | ab dem Monat der Sperre nicht berechnet |
| **Gekündigt** | nur der Admin meldet sich noch an: ansehen und exportieren, nichts ändern; Hinweis „Ihr Vertrag ist gekündigt …“. Disponenten können sich nicht mehr anmelden („Der Zugang dieses Unternehmens ist beendet. Nur der Admin kann die Daten noch exportieren.“). Die Anmeldeseite `…/t/FIRMENCODE` zeigt kein Kunden-Branding mehr. | keine Anmeldung | ab dem Monat der Kündigung nicht berechnet |

Wer beim Sperren oder Kündigen schon angemeldet ist, bleibt angemeldet, kann aber nur noch lesen.

Alle Statuswechsel lassen sich rückgängig machen – auch ein gekündigter Kunde kann mit **Aktivieren** wieder freigeschaltet werden, solange Sie ihn nicht gelöscht haben. Die Daten bleiben in jedem Status gespeichert.

> **Wichtig:** Eine abgelaufene Testphase wird nicht automatisch zur bezahlten Lizenz. Sobald der Kunde bestellt hat, klicken Sie auf **Aktivieren**.

> **Wichtig:** Nach **Kündigen** kann sich nur noch der Admin des Kunden anmelden. Er sieht alle Daten und lädt sie unter **Einstellungen → Daten & Datenschutz** herunter, vollständig mit **Alles als ZIP (mit Lieferscheinen)**. Ändern kann er nichts mehr. Vereinbaren Sie einen Zeitraum für den Export und löschen Sie den Kunden erst danach.

### Kunden endgültig löschen

Nach der Kündigung löschen Sie alle Daten eines Kunden (Rückgabe oder Löschung nach Vertragsende, AVV). Das geht nur im Status **Gekündigt**.

1. Öffnen Sie die Lizenz des Kunden (Filter **Gekündigt** unter **Lizenznehmer**).
2. Ganz unten steht der Bereich **Endgültig löschen**: „Löscht alle Daten dieses Kunden: Lieferungen, Lieferscheine, Fotos, Fahrer, Fahrzeuge und Protokoll. Vorher muss der Kunde seine Daten exportiert haben oder auf den Export verzichtet haben (AVV).“
3. Geben Sie unter **Zur Bestätigung den Firmencode … eingeben** den Firmencode ein (Groß- und Kleinschreibung egal).
4. Klicken Sie auf **Kunden endgültig löschen**. Es folgt keine weitere Rückfrage.

Die Konsole meldet „Kunde gelöscht – … Zugänge, … Dateien“. Gelöscht sind die Lizenz, alle Zugänge (Admins, Disponenten, Fahrer), Fahrzeuge, Lieferungen mit Lieferscheinen, Fotos und Unterschriften, das Logo, Mitteilungen und das Protokoll des Kunden. Alle Sitzungen und Push-Abos dieser Zugänge enden, und der Server entfernt den Ordner `files/<Kunden-ID>`. Der Firmencode ist danach wieder frei.

> **Wichtig:** Das Löschen lässt sich nicht rückgängig machen. Ihre Datensicherungen enthalten die Daten weiter, bis Sie sie nach Ihrer Frist löschen (Muster im AVV: 30 Tage, siehe [Datensicherung](#datensicherung)).

---

## 6. Abrechnung

Unter **Abrechnung** sehen Sie für einen Monat die Rechnungsvorschau – netto, 19 % USt. und brutto.

![Seite „Abrechnung“ für „Oktober 2026 · aktuell“ mit den Kacheln Netto 178 €, USt. 19 % 33,82 €, Brutto 211,82 €, Rechnungen 2, einer Tabelle mit Kaya Logistik GmbH (10/2026, 1 × Ladeklar Flotte à 129 €) und Bauer Baustoff-Transporte (10/2026, 1 × Ladeklar Start à 49 €) und einem blauen Hinweis zu Monats- und Jahreszahlern](img/lizenzgeber-06-abrechnung.png)

1. Wählen Sie oben rechts den **Monat**. Die Liste reicht von sechs Monaten zurück bis zwölf Monate voraus; der laufende Monat trägt den Zusatz „aktuell“.
2. Prüfen Sie die Kacheln **Netto**, **USt. 19 %**, **Brutto** und **Rechnungen**.
3. Prüfen Sie die Tabelle: **Kunde** (rechtlicher Name, darunter der Firmencode), **Zeitraum** (z. B. „10/2026“, bei Jahreszahlern „10/2026 – 09/2027“), **Positionen**, **Netto**, **USt.**, **Brutto**.
4. Klicken Sie auf **CSV**, um die Liste herunterzuladen (`abrechnung-JJJJ-MM.csv`). Die Datei hat die Spalten Monat, Kunde, Code, Zahlweise, Positionen, Netto €, USt 19 % €, Brutto € (Semikolon getrennt, Beträge mit Komma) und lässt sich direkt in Excel oder Ihre Buchhaltung übernehmen. In der Spalte Monat steht der Zeitraum.
5. Schreiben Sie die Rechnungen mit Ihrem Rechnungsprogramm.

Unter der Tabelle fasst ein Hinweis die Regeln zusammen: „Monatszahler erscheinen jeden Monat ab Beginn der bezahlten Lizenz, Jahreszahler einmal im Jahr im Verlängerungsmonat (12 Monate zum Preis von 10). Testphasen, gesperrte und gekündigte Kunden werden ab dem Monat der Änderung nicht berechnet. Die automatische Rechnungsstellung (SEPA, DATEV-Export) folgt in Version 1.2.“

### Wer in welchem Monat berechnet wird

Die bezahlte Lizenz beginnt mit dem ersten **Aktivieren** oder mit dem Anlegen ohne Testphase (Testphase 0).

| Fall | Steht in der Abrechnung |
|---|---|
| **Monatliche Zahlung** | jeden Monat ab dem Monat, in dem die bezahlte Lizenz beginnt, mit dem vollen Monatspreis – auch wenn sie mitten im Monat beginnt |
| **Jährliche Zahlung** | nur im Startmonat der bezahlten Lizenz und danach alle 12 Monate im Verlängerungsmonat: 12 Monate zum Preis von 10. In den anderen Monaten steht der Kunde nicht in der Liste. |
| **Test** | nie, auch nicht ein Kunde, den Sie mit **Test +14 Tage** zurück in den Test gesetzt haben |
| **Gesperrt oder Gekündigt** | bis zum Monat vor der Statusänderung; ab dem Monat der Änderung nicht mehr |
| **Laufzeit bis** gesetzt | bis einschließlich des Monats, in dem die Laufzeit endet |

Die Positionen je Rechnung:

| Position | Preis | Gilt für |
|---|---|---|
| **Ladeklar Start / Flotte / Premium** | 49 € / 129 € / 299 € | jeden Kunden |
| **Zusätzliche Fahrer** | 7 € (Flotte) bzw. 6 € (Premium) je Fahrer | nur Flotte und Premium; im Tarif Start gibt es keine Zusatzfahrer |
| **White-Label-App (Store-Betrieb)** | 99 € | nur Premium |

Gut zu wissen:

- Die Vorschau speichert keine Preis-Historie. Sie rechnet mit dem heutigen Tarif und den heutigen Zusätzen und kennt nur die letzte Statusänderung. Ein vergangener Monat kann deshalb von der damaligen Rechnung abweichen, z. B. nach einem Tarifwechsel, wenn ein gesperrter Kunde wieder aktiv ist oder wenn Sie einen gesperrten Kunden später kündigen (dann zählt der Monat der Kündigung). Erstellen Sie die Rechnungen deshalb zeitnah zum Monatswechsel.
- Die einmalige Einrichtung der Store-App (1.990 €) erscheint nicht in der Vorschau.
- Automatische Rechnungsstellung mit SEPA-Lastschrift und DATEV-Export: geplant (Roadmap, Version 1.2).

---

## 7. Tarife

Unter **Tarife** sehen Sie die Tarife so, wie sie Ihre Kunden kennen. Alle Preise netto zzgl. 19 % USt.

![Seite „Tarife“ mit Start 49 €, Flotte 129 € (markiert „Beliebt“), Premium 299 € und „Zusatz zu Premium: White-Label-App im Store“ für 1.990 € einmalig plus 99 € / Monat](img/lizenzgeber-07-tarife.png)

| | **Start** | **Flotte** | **Premium** |
|---|---|---|---|
| Preis je Monat | 49 € | 129 € | 299 € |
| Fahrer inklusive | 3 | 15 | 40 |
| jeder weitere Fahrer | – | 7 € | 6 € |
| Fahrzeuge | 6 | 40 | unbegrenzt |
| Disponenten (zusätzlich zum Admin) | 1 | 5 | unbegrenzt |
| Lieferschein-Speicher | 5 GB | 50 GB | 250 GB |
| Eigenes Logo, Farben, App-Name | ja | ja | ja |
| Domain | – | eigene Subdomain | eigene Domain |
| REST-API, SLA 99,5 % | – | – | ja |

**Zusatz zu Premium – White-Label-App im Store:** 1.990 € einmalig + 99 € je Monat Store-Betrieb; eigene App im App Store und bei Google Play mit Name und Symbol des Kunden, Push über APNs/FCM. Buchbar nur im Tarif Premium.

30 Tage kostenlos testen; Jahreszahlung: 2 Monate geschenkt. Ladeklar richtet sich nur an Unternehmer (§ 14 BGB).

Die Tarife sind in der Software fest hinterlegt und in der Konsole nicht änderbar. Neue Preise oder Grenzen kommen mit einem Software-Update.

---

## 8. Die Datenschutz-Grenze

Rechtlich sind Sie für Ihre Kunden **Auftragsverarbeiter** (Art. 28 DSGVO); jeder Lizenznehmer ist für seine Daten selbst verantwortlich. Ladeklar setzt das technisch um:

| Sie sehen in der Konsole | Sie sehen nicht |
|---|---|
| Name, rechtlicher Name, Firmencode, Logo, Kontaktdaten und USt-IdNr. des Kunden | Lieferungen, Routen, Auftraggeber |
| Tarif, Status, Laufzeit, Zahlweise, Preise, eigene Domains | Lieferscheine, Fotos, Unterschriften |
| Anzahl aktiver Fahrer, Fahrzeuge, Büro-Zugänge | Namen und Telefonnummern der Fahrer |
| Anzahl Lieferungen im Monat, letzte Aktivität | Notizen, Problemmeldungen, Standorte |
| Name und E-Mail des Admins, wenn Sie sein Passwort zurücksetzen | das Protokoll des Kunden |

### Support nur mit Freigabe des Kunden

Braucht ein Kunde Hilfe mit seinen Daten, gibt **er** unter **Einstellungen → Daten & Datenschutz → Support-Zugriff** mit **Für 24 Stunden freigeben** einen befristeten Zugriff frei. Die Freigabe und ihr Ende stehen im Protokoll des Kunden; er kann sie mit **Jetzt beenden** jederzeit zurücknehmen.

Die Konsole hat in Version 1.0 keinen eigenen Einstieg in die Daten eines Kunden; die Freigabe wird nur protokolliert. Helfen Sie gemeinsam mit dem Kunden, während er seine Ladeklar-Seite vor sich hat, und arbeiten Sie nur im Rahmen einer erteilten Freigabe.

> **Wichtig:** **Admin-Passwort zurücksetzen** ist kein Support-Zugang. Setzen Sie das Passwort nur auf Bitte des Kunden zurück und melden Sie sich mit dem neuen Startpasswort nicht selbst an. Das Zurücksetzen und jede Anmeldung stehen mit IP-Adresse im Protokoll des Kunden.

### Daten auf dem Server

Technisch liegen alle Daten im Ordner `data/` Ihres Servers (siehe [Abschnitt 9](#datensicherung)). Zugriff darauf ist nur für Betrieb, Datensicherung und Wiederherstellung vorgesehen – so, wie es der Auftragsverarbeitungsvertrag (AVV) und die technisch-organisatorischen Maßnahmen (TOM) beschreiben. Passwörter und PINs sind nur als scrypt-Hash gespeichert.

- Die Löschfristen der Kunden setzt der Server automatisch um (stündlich): abgeschlossene Lieferungen samt Dateien nach der vom Kunden gewählten Aufbewahrung (1–10 Jahre), Standorte und Mitteilungen nach 90 Tagen, Protokolle nach 3 Jahren.
- Anmeldungen und fehlgeschlagene Anmeldeversuche stehen im Protokoll des Kunden, auf dem Server mit IP-Adresse. IP-Adressen und eingetippte Anmeldenamen entfernt der Server nach 90 Tagen.
- Nach Vertragsende löschen Sie einen gekündigten Kunden vollständig in der Konsole (siehe [Kunden endgültig löschen](#kunden-endgültig-löschen)). Die Löschung in den Datensicherungen folgt mit deren Frist.

Die Vertragsmuster (AGB, AVV, TOM, Liste der Unterauftragsverarbeiter, Leistungsbeschreibung und SLA, Datenschutzhinweise für Fahrer, Muster-Betriebsvereinbarung) liegen im Ordner `docs/recht/`. Lassen Sie sie vor der Verwendung anwaltlich prüfen.

---

## 9. Betrieb des Servers

### Voraussetzungen

- Node.js ab Version 22.5 (der Server nutzt das eingebaute SQLite von Node.js; weitere Pakete braucht er im Betrieb nicht)
- ein Server, idealerweise in Deutschland bzw. der EU
- eine Domain mit HTTPS-Zertifikat. Ohne HTTPS funktionieren Push-Mitteilungen und die Installation der App auf dem Handy nicht.

### Server starten

Im Hauptordner von Ladeklar:

```bash
npm start                 # startet den Server (gleichbedeutend: node server/index.js)
npm run dev               # startet mit Demo-Daten – nur bei leerer Datenbank, nur zum Ausprobieren
```

Beim Start erscheint „LADEKLAR 1.0.0 läuft auf http://localhost:8080“. Gibt es noch keinen Lizenzgeber-Zugang, weist der Server darauf hin.

Einstellungen über Umgebungsvariablen:

| Variable | Bedeutung | Voreinstellung |
|---|---|---|
| `PORT` | Port des Servers | `8080` |
| `HOST` | Netzwerkadresse | `0.0.0.0` |
| `DATA_DIR` | Ordner für Datenbank und Dateien | `data/` im Hauptordner |
| `BASE_URL` | öffentliche Adresse, z. B. `https://app.ladeklar.de`. Mit `https://` werden sichere Cookies und HSTS aktiv. | leer |
| `TRUST_PROXY` | `1`, wenn der Server hinter einem Reverse Proxy läuft (echte IP für die Anmelde-Sperre und das Protokoll) | aus |
| `PUSH_SUBJECT` | Kontakt für Push-Dienste, z. B. `mailto:support@ihre-firma.de` | `mailto:support@ladeklar.de` |
| `PLATFORM_EMAIL`, `PLATFORM_PASSWORD` | legt beim Start den Lizenzgeber-Zugang an, falls noch keiner existiert | – |
| `SECURITY_CONTACT` | E-Mail für `/.well-known/security.txt` | `security@ladeklar.de` |

Ob der Server läuft, prüfen Sie unter `/api/health` – die Antwort enthält `ok` und die Versionsnummer.

### Den Lizenzgeber-Zugang anlegen

Einmalig, bei gestopptem Server:

```bash
node server/index.js setup <email> <passwort>
```

Optional als drittes Argument ein Anzeigename. Das Passwort braucht mindestens 10 Zeichen. Bei Erfolg erscheint „Lizenzgeber-Zugang angelegt: …“. Der Befehl funktioniert nur, solange es noch keinen Lizenzgeber-Zugang gibt („Es gibt schon einen Lizenzgeber-Zugang.“).

> **Wichtig:** Wählen Sie gleich ein starkes Passwort und bewahren Sie es sicher auf. Ändern können Sie es später in der Konsole unter **Mein Konto** (siehe [Abschnitt 1](#eigenes-passwort-ändern)). Es gibt genau einen Lizenzgeber-Zugang, und ein vergessenes Passwort lässt sich weder in der Konsole noch mit dem Befehl `setup` zurücksetzen.

### Reverse Proxy und Domains

- Betreiben Sie den Server hinter einem Reverse Proxy mit HTTPS (z. B. nginx oder Caddy) und setzen Sie `TRUST_PROXY=1` und `BASE_URL`. Ein Beispiel für Caddy liegt in `deploy/Caddyfile`.
- Live-Updates laufen über eine dauerhaft offene Verbindung (`/api/events`). Der Proxy darf sie nicht puffern oder nach kurzer Zeit schließen.
- Kunden-Subdomains der Form `firmencode.ladeklar.de` (oder `.app`) erkennt der Server automatisch und zeigt dort die Anmeldeseite im Branding des Kunden. Dafür brauchen Sie einen Wildcard-DNS-Eintrag und ein passendes Zertifikat. Ohne Subdomain funktioniert immer die Adresse `…/t/FIRMENCODE`.
- Eigene Domains von Premium-Kunden erkennt der Server ebenfalls, sobald sie in der Lizenz eingetragen sind (siehe [Eigene Domains](#eigene-domains-premium)). Jede eigene Domain braucht einen Eintrag im Reverse Proxy und ein Zertifikat.

### Push-Schlüssel (VAPID)

Die Schlüssel für Web-Push erzeugt der Server beim ersten Start automatisch und speichert sie in der Datenbank. Sie müssen nichts einrichten. Löschen Sie die Datenbank nicht und tauschen Sie die Schlüssel nicht aus – sonst müssen alle Nutzer die Mitteilungen neu einschalten.

### Datensicherung

Alles, was gesichert werden muss, liegt im Ordner `data/` (bzw. `DATA_DIR`):

| Inhalt | Datei |
|---|---|
| Datenbank: Lizenznehmer, Nutzer, Fahrzeuge, Lieferungen, Mitteilungen, Protokoll, Sitzungen, Push-Abos, Push-Schlüssel | `ladeklar.db` (dazu im Betrieb `ladeklar.db-wal` und `ladeklar.db-shm`) |
| Lieferscheine, Fotos, Unterschriften, Logos | `files/<Kunden-ID>/…` |

So sichern Sie:

1. Server kurz stoppen.
2. Den ganzen Ordner `data/` kopieren – immer alle drei `ladeklar.db*`-Dateien zusammen mit dem Ordner `files/`.
3. Server wieder starten.

Speichern Sie die Sicherungen verschlüsselt und an einem zweiten Ort in der EU, und löschen Sie alte Sicherungen nach der im AVV genannten Frist (Muster: 30 Tage). Wiederherstellen: Server stoppen, Ordner `data/` durch die Sicherung ersetzen, Server starten.

### Updates

1. Datensicherung machen (siehe oben).
2. Server stoppen.
3. Neue Programmversion in den Hauptordner übernehmen (z. B. `git pull`). Der Ordner `data/` bleibt unverändert.
4. Server starten. Fehlende Tabellen legt der Server beim Start selbst an.
5. Unter `/api/health` die neue Versionsnummer prüfen.

### Was der Server selbst erledigt

- **stündlich:** Löschfristen umsetzen, IP-Adressen und eingetippte Anmeldenamen nach 90 Tagen aus den Protokollen entfernen, abgelaufene Sitzungen entfernen
- **Anmelde-Schutz:** höchstens 20 Anmeldeversuche pro Minute und IP-Adresse; nach fünf falschen Passwörtern bzw. PINs ist der einzelne Zugang 15 Minuten gesperrt
- **REST-API:** höchstens 600 Anfragen pro Minute und Kunde
- **Sitzungen:** Fahrer bleiben 90 Tage angemeldet, Büro und Lizenzgeber 14 Tage (jeweils verlängert bei Nutzung)
- **Uploads:** nur JPG, PNG, WebP und PDF; der Dateiinhalt wird geprüft

---

## 10. Checkliste für den Kundenstart

**Vertrag**

- [ ] SaaS-Lizenzvertrag (AGB) mit Leistungsbeschreibung und SLA abgeschlossen – nur mit Unternehmern (§ 14 BGB)
- [ ] Auftragsverarbeitungsvertrag (AVV) unterschrieben; TOM und Liste der Unterauftragsverarbeiter übergeben
- [ ] Tarif, Zahlweise und Testphase vereinbart; bei fester Laufzeit das Datum unter **Laufzeit bis** eingetragen

**Zugang**

- [ ] Lizenznehmer in der Konsole angelegt (Firmencode, Präfix, Tarif, Testphase, Farbe)
- [ ] Willkommenstext verschickt, Startpasswort möglichst auf zweitem Weg übergeben
- [ ] Kunde hat sich angemeldet und ein eigenes Passwort vergeben (die App verlangt es beim ersten Anmelden)
- [ ] Empfehlung gegeben, einen zweiten Admin anzulegen (falls ein Passwort verloren geht)

**Schulung (15 Minuten, am besten am Bildschirm des Kunden)**

| Minute | Inhalt |
|---|---|
| 0–3 | Anmelden und eigenes Passwort vergeben, Logo und Farbe unter **Firma & Marke** |
| 3–6 | **Abläufe** gemeinsam durchgehen: Fahrzeugwahl, offene Aufträge, Lieferschein-Pflicht, Ankunft-Erfassung, Palettentausch; Hinweis auf Datenschutz bei Standort und Auswertungen je Fahrer |
| 6–9 | ein Fahrzeug anlegen, einen Fahrer anlegen und die Einladung per WhatsApp an das eigene Handy schicken |
| 9–13 | eine Lieferung anlegen und auf dem Handy einmal komplett durchtippen: LKW wählen, Buchung bestätigen, Aufgeladen, Abgeladen, Lieferschein fotografieren, Bestätigen & abschließen – dabei im Büro die Live-Übersicht beobachten |
| 13–15 | Abliefernachweis drucken, Datenexport und Support-Freigabe zeigen, Fragen klären |

**Fahrer**

- [ ] [Fahrer-Kurzanleitung](FAHRER_KURZANLEITUNG.md) in den Sprachen der Fahrer ausgedruckt (PDF-Fassung: `node tools/build-docs.js`)
- [ ] Kunde informiert seine Fahrer mit den Datenschutzhinweisen für Fahrer und den Nutzungsbedingungen der Fahrer-App (Vorlagen in `docs/recht/`)
- [ ] Bei Standort-Speicherung oder Auswertungen je Fahrer: Betriebsrat einbezogen, ggf. Muster-Betriebsvereinbarung genutzt

**Übergabe**

- [ ] [Handbuch für Unternehmen](HANDBUCH_UNTERNEHMEN.md) an den Kunden geschickt
- [ ] Wiedervorlage zum Testende eingetragen (Kachel **Test endet in 7 Tagen**); nach der Bestellung **Aktivieren**

---

## 11. Häufige Fragen

**Ein Kunde hat sein Admin-Passwort vergessen.**
Hat der Kunde einen zweiten Admin, erzeugt dieser unter **Einstellungen → Team → Neues Passwort** ein neues. Sonst öffnen Sie die Lizenz des Kunden und klicken unter **Support** auf **Admin-Passwort zurücksetzen** (siehe [Admin-Passwort zurücksetzen](#admin-passwort-zurücksetzen)). Geben Sie das neue Startpasswort telefonisch weiter. Beim nächsten Anmelden vergibt der Admin ein eigenes Passwort.

**Ich möchte mein eigenes Passwort ändern.**
Schlüssel-Symbol unten links (auf dem Handy: **Konto**) → **Mein Konto** → **Passwort ändern** (siehe [Abschnitt 1](#eigenes-passwort-ändern)).

**Ein Kunde braucht mehr Fahrer.**
Öffnen Sie seine Lizenz und erhöhen Sie **Zusätzliche Fahrer** (Flotte und Premium) oder wählen Sie einen größeren **Tarif**. Dann **Lizenz speichern** – die Plätze stehen sofort zur Verfügung. Im Tarif Start gibt es keine Zusatzfahrer.

**Der Test läuft ab, der Kunde braucht noch Zeit.**
Öffnen Sie die Lizenz und klicken Sie auf **Test +14 Tage**. Das geht auch, wenn der Test schon abgelaufen ist.

**Der Vertrag hat eine feste Laufzeit.**
Tragen Sie das Vertragsende unter **Laufzeit bis** ein und klicken Sie auf **Lizenz speichern**. Nach diesem Tag steht der Kunde auf „Abgelaufen“. Zum Verlängern ändern oder leeren Sie das Datum.

**Ein Kunde zahlt nicht.**
Klicken Sie auf **Sperren**. Der Kunde kann seine Daten weiter ansehen und exportieren, aber nichts ändern; seine Fahrer können sich nicht anmelden. Ab dem Monat der Sperre steht er nicht mehr in der Abrechnung. Nach Zahlungseingang klicken Sie auf **Aktivieren**.

**Ein Kunde kündigt.**
Klicken Sie auf **Kündigen**. Danach meldet sich nur noch der Admin des Kunden an und exportiert seine Daten mit **Alles als ZIP (mit Lieferscheinen)**. Nach dem vereinbarten Zeitraum löschen Sie den Kunden unter **Endgültig löschen** (siehe [Kunden endgültig löschen](#kunden-endgültig-löschen)).

**Ein Premium-Kunde möchte eine eigene Domain.**
Der Kunde richtet einen CNAME-Eintrag auf Ihren Server ein. Sie tragen die Domain unter **Eigene Domains** ein, speichern und ergänzen sie im Reverse Proxy (siehe [Eigene Domains](#eigene-domains-premium)).

**Ein Kunde möchte seinen Firmencode ändern.**
Der Firmencode lässt sich in der Konsole nach dem Anlegen nicht ändern. Das Präfix der Buchungsnummer kann der Kunde unter **Einstellungen → Abläufe** selbst ändern.

**Ich möchte mir die Lieferungen eines Kunden ansehen.**
Das ist in der Konsole bewusst nicht möglich (siehe [Abschnitt 8](#8-die-datenschutz-grenze)).
