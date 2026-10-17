# Ladeklar – Handbuch für Unternehmen

Für Inhaber, Unternehmens-Admins und Disponenten · Stand 17.10.2026 · Ladeklar Version 1.0

Die Bildschirmfotos zeigen die Beispielfirma „Kaya Logistik“. In Ihrer App sehen Sie stattdessen Ihr eigenes Logo, Ihre Farbe und Ihren App-Namen.

## Inhalt

1. [Willkommen](#1-willkommen)
2. [Die ersten 10 Minuten](#2-die-ersten-10-minuten)
3. [Die Live-Übersicht lesen](#3-die-live-übersicht-lesen)
4. [Lieferungen anlegen, zuweisen und pflegen](#4-lieferungen-anlegen-zuweisen-und-pflegen)
5. [Den Fortschritt verstehen](#5-den-fortschritt-verstehen)
6. [Lieferschein, Fotos, Unterschrift und Abliefernachweis](#6-lieferschein-fotos-unterschrift-und-abliefernachweis)
7. [Störungen und Notizen](#7-störungen-und-notizen)
8. [Für Fahrer setzen – wenn ein Fahrer anruft](#8-für-fahrer-setzen--wenn-ein-fahrer-anruft)
9. [Fahrer verwalten](#9-fahrer-verwalten)
10. [Der Fahrzeug-Pool](#10-der-fahrzeug-pool)
11. [Berichte](#11-berichte)
12. [Einstellungen](#12-einstellungen)
13. [Mitteilungen und Push](#13-mitteilungen-und-push)
14. [Datenexport und Anbieterwechsel](#14-datenexport-und-anbieterwechsel)
15. [Lizenz und Tarif](#15-lizenz-und-tarif)
16. [Häufige Fragen](#16-häufige-fragen)
17. [Glossar](#17-glossar)

---

## 1. Willkommen

Ladeklar nimmt Ihrer Disposition die Telefonate ab, mit denen Sie bisher hinter jeder Tour hergelaufen sind. Ihre Fahrer bestätigen jeden Schritt – Buchung, Aufgeladen, Abgeladen, Zugestellt – mit einem einzigen Tipp, und Sie sehen es im selben Moment. Der Lieferschein kommt als Foto ins Büro, sobald der Fahrer abschließt, und wird mit allen Zeitstempeln zum druckbaren Abliefernachweis. Störungen wie Panne, Stau oder verweigerte Annahme erreichen Sie sofort als dringende Mitteilung, und Standzeiten, Pünktlichkeit und Palettentausch werden nebenbei erfasst. Die App trägt Ihr Logo, Ihre Farbe und Ihren App-Namen, und Ihre Fahrer bedienen sie mit großen Knöpfen in acht Sprachen.

### Wer darf was?

| Rolle | Darf | Sieht in den Einstellungen |
|---|---|---|
| **Admin** (Inhaber, Leitung) | alles im eigenen Unternehmen: Lieferungen, Fahrer, Fahrzeuge, Berichte, Logo und Farbe, Abläufe, Büro-Zugänge anlegen und bearbeiten, Personen löschen, Datenexport, Support-Freigabe, API, Tarifwechsel und Kündigung beim Anbieter anfragen | alle Reiter |
| **Disponent** | Lieferungen anlegen, ändern, zuweisen und stornieren; Schritte für Fahrer setzen; Fahrer anlegen, bearbeiten, sperren und neue PIN vergeben; Fahrzeuge anlegen, bearbeiten, freigeben und entfernen; Berichte (auch als CSV); Lieferungen als CSV herunterladen | nur „Mein Konto“ und „Berichte“ |
| **Fahrer** | eigene Touren und freie Aufträge sehen, Schritte bestätigen, Lieferschein fotografieren, Notizen und Probleme melden | – (eigene Fahrer-App, siehe [Fahrer-Kurzanleitung](FAHRER_KURZANLEITUNG.md)) |

Jeder Büro-Zugang kann sich zusätzlich mit einem Code vom Handy schützen (Zwei-Faktor-Anmeldung, siehe [Mein Konto](#mein-konto)).

Ihre Daten sind von allen anderen Unternehmen auf der Plattform getrennt. Auch der Anbieter von Ladeklar sieht Ihre Lieferungen, Lieferscheine und Fahrerdaten nicht.

---

## 2. Die ersten 10 Minuten

Arbeiten Sie diese Liste einmal von oben nach unten ab. Danach kann die erste Tour laufen.

- [ ] 1. Anmelden und eigenes Passwort vergeben
- [ ] 2. Logo und Farbe hochladen
- [ ] 3. Abläufe wählen
- [ ] 4. Fahrzeuge anlegen
- [ ] 5. Fahrer anlegen und einladen
- [ ] 6. Erste Lieferung anlegen

### Schritt 1: Anmelden und Passwort ändern

![Anmeldeseite von Ladeklar mit den Reitern „Fahrer“ und „Büro / Disposition“, Feldern für E-Mail und Passwort und der Sprachauswahl](img/buero-01-anmeldung.png)

1. Öffnen Sie den Link aus der Willkommens-Nachricht Ihres Anbieters.
2. Wählen Sie den Reiter **Büro / Disposition**.
3. Geben Sie Ihre **E-Mail** und das **Startpasswort** ein und klicken Sie auf **Anmelden**.
4. Es erscheint der Bildschirm **Erste Anmeldung** mit dem Satz „Bitte vergeben Sie jetzt ein eigenes Passwort.“ Tragen Sie unter **Startpasswort** das Startpasswort ein. Tragen Sie unter **Neues Passwort (mind. 10 Zeichen)** Ihr eigenes Passwort ein und unter **Neues Passwort wiederholen** noch einmal dasselbe.
5. Klicken Sie auf **Passwort speichern und weiter**. Danach öffnet sich die Live-Übersicht.

> **Wichtig:** Mit dem Startpasswort kommen Sie nur bis zu diesem Bildschirm. Ladeklar lässt alles andere erst zu, wenn Sie ein eigenes Passwort vergeben haben. Das gilt für jeden Büro-Zugang mit Startpasswort: beim ersten Anmelden und nach jedem neuen Startpasswort (**Team → Neues Passwort** oder vom Anbieter). Mit **Abmelden** verlassen Sie den Bildschirm, ohne etwas zu ändern.

Später ändern Sie Ihr Passwort unter **Einstellungen → Mein Konto**. Dort schalten Sie auch die **Zwei-Faktor-Anmeldung** ein. Das empfehlen wir für jeden Admin (siehe [Mein Konto](#mein-konto)).

Ist die Zwei-Faktor-Anmeldung an, erscheint nach E-Mail und Passwort das Feld **Code aus der Authenticator-App**. Tippen Sie den 6-stelligen Code aus der App ein und klicken Sie noch einmal auf **Anmelden**. Ihr Passwort bleibt dabei im Feld stehen.

> **Tipp:** Nach fünf falschen Versuchen ist der Zugang für 15 Minuten gesperrt, nach zehn für eine Stunde, ab fünfzehn für 24 Stunden. Ein falscher Code zählt mit. Bei der 24-Stunden-Sperre bekommen die anderen Admins und Disponenten Ihres Unternehmens die Mitteilung „Zugang gesperrt: …“. Ein neues Passwort (**Team → Neues Passwort**) hebt jede Sperre sofort auf. Im Büro bleiben Sie 14 Tage angemeldet, solange Sie die App regelmäßig nutzen. Jede Anmeldung und jeder Fehlversuch für einen Ihrer Zugänge steht mit IP-Adresse im Protokoll Ihres Unternehmens (siehe [Daten & Datenschutz](#daten--datenschutz)).

### Schritt 2: Logo und Farbe

1. Gehen Sie zu **Einstellungen → Firma & Marke**.
2. Klicken Sie auf **Logo hochladen** und wählen Sie Ihr Logo (PNG, JPG, WebP oder SVG). Das Logo wird sofort gespeichert; Ladeklar erzeugt daraus auch das Handy-Symbol.
3. Wählen Sie unter **Markenfarbe** eine der vorgeschlagenen Farben oder rechts im Farbfeld Ihre genaue Hausfarbe.
4. Prüfen Sie **App-Name (unter dem Handy-Symbol)**, **Firmenname**, **Telefon Disposition (für Fahrer)** und **Anschrift**.
5. Klicken Sie auf **Speichern**. Rechts sehen Sie die **Vorschau Fahrer-App**.

Details zu diesem Reiter finden Sie in [Abschnitt 12](#firma--marke).

### Schritt 3: Abläufe wählen

Unter **Einstellungen → Abläufe** legen Sie fest, wie Ihre Fahrer arbeiten: ob sie ihr Fahrzeug selbst wählen, ob der Lieferschein Pflicht ist, ob die Ankunft an der Rampe erfasst wird und einiges mehr. Für den Start sind die Voreinstellungen gut geeignet. Eine Erklärung jedes Schalters finden Sie in [Abschnitt 12](#abläufe).

### Schritt 4: Fahrzeuge anlegen

1. Klicken Sie links auf **Fahrzeuge** und dann auf **Fahrzeug anlegen**.
2. Wählen Sie oben **LKW / Zugmaschine** oder **Auflieger / Anhänger**.
3. Tragen Sie mindestens das **Kennzeichen** ein, dazu am besten **Art**, **Bezeichnung** und die Termine **Nächste HU** und **Nächste SP**.
4. Klicken Sie auf **Speichern**. Wiederholen Sie das für jedes Fahrzeug.

Mehr dazu in [Abschnitt 10](#10-der-fahrzeug-pool).

### Schritt 5: Fahrer einladen

1. Klicken Sie links auf **Fahrer** und dann auf **Fahrer anlegen**.
2. Tragen Sie **Name** und **Handynummer** ein und wählen Sie die **Sprache der App**.
3. Klicken Sie auf **Anlegen & PIN erzeugen**.
4. Schicken Sie die Einladung mit **WhatsApp** oder **SMS** – oder lassen Sie den Fahrer den QR-Code mit der Handy-Kamera scannen.

Der Link in der Einladung gilt 14 Tage und nur für eine Anmeldung. Mehr dazu in [Abschnitt 9](#9-fahrer-verwalten).

### Schritt 6: Erste Lieferung

1. Klicken Sie oben rechts auf **Neue Lieferung**.
2. Tragen Sie Lade- und Entladeort (jeweils **Stadt**) und das Ladedatum ein.
3. Wählen Sie einen **Fahrer** oder lassen Sie „— offen für alle Fahrer —“ stehen. Dürfen Ihre Fahrer keine offenen Aufträge übernehmen, heißt diese Auswahl „— wartet auf Zuweisung —“.
4. Klicken Sie auf **Lieferung anlegen**.

Haben Sie einen Fahrer gewählt, bekommt er sofort eine Mitteilung. Mehr dazu in [Abschnitt 4](#4-lieferungen-anlegen-zuweisen-und-pflegen).

> **Tipp:** Schalten Sie die Push-Mitteilungen ein: auf der Live-Übersicht über den Hinweis „Push-Mitteilungen einschalten …“ → **Einschalten** oder unter **Einstellungen → Mein Konto** mit dem Schalter **Push-Mitteilungen in diesem Browser**. Dann hören Sie es, wenn der Fahrer bestätigt.

---

## 3. Die Live-Übersicht lesen

Nach der Anmeldung landen Sie auf **Live**. Hier sehen Sie auf einen Blick, was gerade auf der Straße passiert.

![Live-Übersicht: vier Kacheln „Offen“, „Unterwegs“, „Heute zugestellt“ und „Störungen“, darunter „Aktive Touren“ mit Fortschrittsleisten und rechts der „Live-Ticker“](img/buero-02-live.png)

### Die vier Kacheln

| Kachel | Zählt | Ein Klick öffnet |
|---|---|---|
| **Offen** | alle Lieferungen, die noch kein Fahrer bestätigt hat | Lieferungen, Reiter „Offen“ |
| **Unterwegs** | alle laufenden Touren: bestätigt und noch nicht zugestellt. Eine bestätigte Tour mit späterem Ladedatum zählt erst ab ihrem Ladetag; bis dahin steht sie unter „Geplant“. | Lieferungen, Reiter „Live“ |
| **Heute zugestellt** | Lieferungen, die heute zugestellt wurden (Zeitpunkt von „Bestätigen & abschließen“) | Lieferungen, Reiter „Erledigt“ |
| **Störungen** | gemeldete Probleme, die noch niemand als erledigt markiert hat | Lieferungen, Reiter „Störungen“ |

Sobald es eine Störung gibt, ist die Kachel „Störungen“ rot umrandet.

### Aktive Touren

Unter den Kacheln steht jede laufende Tour als Karte. Touren mit Störung stehen oben, danach die mit der jüngsten Meldung. Eine Karte zeigt:

- **Status** (z. B. „Beladen · unterwegs“), dazu eine gemeldete Störung und „Eilig“, wenn gesetzt
- **Buchungsnummer** und **Route** (Ladeort → Entladeort)
- die **Fortschrittsleiste** mit der Uhrzeit jedes erledigten Schritts
- **Fahrer**, **Kennzeichen** von LKW und Auflieger, **Ladetermin** und **Auftraggeber**
- unten rechts die **letzte Meldung**, z. B. „Problem gemeldet · vor 37 Min.“

Ein Klick auf die Karte öffnet die Lieferung mit allen Details. Darunter folgt der Bereich **Heute offen** mit Lieferungen, deren Ladedatum heute (oder früher) ist und die noch niemand bestätigt hat.

### Live-Ticker

Rechts läuft der **Live-Ticker**: die jüngsten Meldungen der letzten drei Tage mit Uhrzeit, Ereignis (z. B. „Aufgeladen“, „Dokument hochgeladen“, „Notiz“), Person und Route. Ein Klick auf die Route öffnet die Lieferung. Schritte, die ein Fahrer ohne Netz getippt hat, erscheinen erst, wenn sein Handy sie nachsendet – mit der Uhrzeit des Tipps.

### Fuhrpark und Fristen

Unter dem Ticker zeigt die Karte **Fuhrpark**, wie viele Fahrzeuge **im Einsatz** sind, wie viele **Fahrer auf Tour** sind und wie viele Fahrzeuge in der **Werkstatt** stehen. Darunter erscheinen fällige Hauptuntersuchungen (HU) und Sicherheitsprüfungen (SP) – ab 30 Tage vor dem Termin („fällig am …“) und rot, wenn der Termin vorbei ist („überfällig seit …“). **Alle** öffnet die Fahrzeugliste.

### Zahlen in der Seitenleiste und Suche

- Neben **Live** steht die Zahl der laufenden Touren.
- Neben **Lieferungen** steht rot die Zahl der Störungen, sonst die Zahl der offenen Lieferungen.
- Neben **Fahrzeuge** steht rot die Zahl der Fahrzeuge mit fälliger HU oder SP.
- Das Suchfeld oben („Buchungsnummer, Ort, Fahrer, Kennzeichen …“) durchsucht alle Lieferungen.

### Auf dem Tablet und dem Handy

Die Disposition funktioniert auch auf dem Tablet. Auf dem Handy finden Sie die Bereiche in der Leiste unten: **Live**, **Lieferungen**, **Fahrer**, **Fahrzeuge** und **Mehr** (Einstellungen; die Berichte erreichen Sie dort über den Reiter **Berichte**).

![Live-Übersicht auf dem Tablet, angemeldet als Disponent Jonas mit Kacheln und aktiven Touren](img/tablet-01-disposition.png)

---

## 4. Lieferungen anlegen, zuweisen und pflegen

Unter **Lieferungen** finden Sie Gegenwart, Zukunft und Vergangenheit an einem Ort.

![Lieferungen, Reiter „Live“: Karten mit Fortschrittsleiste, darüber die Reiter Live, Geplant, Offen, Störungen, Erledigt, Alle sowie Suche und Fahrer-Filter, oben rechts die Knöpfe „CSV“ und „Neue Lieferung“](img/buero-04-lieferungen.png)

### Die Reiter

| Reiter | Zeigt |
|---|---|
| **Live** | alle laufenden Touren und alle offenen Lieferungen mit Ladedatum heute oder früher |
| **Geplant** | offene oder bestätigte Lieferungen mit Ladedatum in der Zukunft |
| **Offen** | alle Lieferungen, die noch kein Fahrer bestätigt hat |
| **Störungen** | Lieferungen mit gemeldetem, noch nicht erledigtem Problem |
| **Erledigt** | zugestellte und stornierte Lieferungen als Tabelle, nach Ladedatum sortiert, neueste zuerst |
| **Alle** | alle Lieferungen als Tabelle, nach Ladedatum sortiert, neueste zuerst |

Rechts daneben können Sie **suchen** (Buchungsnummer, Auftraggeber, Referenz, Ort, Straße, Fahrer, Kennzeichen, Ware) und mit **Alle Fahrer** auf einen Fahrer filtern. Die Treffer einer Suche stehen im Reiter **Alle**, neueste zuerst. Je Ansicht zeigt Ladeklar höchstens 300 Lieferungen. **CSV** lädt dagegen alle Lieferungen als Tabelle herunter (siehe [Abschnitt 14](#14-datenexport-und-anbieterwechsel)).

In den Reitern Live, Geplant, Offen und Störungen stehen Lieferungen mit Störung zuerst, dann eilige, dann nach Ladetermin.

Unter **Erledigt** und **Alle** sehen Sie eine Tabelle mit Buchung, Route und Auftraggeber, Ladetag, Fahrer, Fahrzeug, Status, Standzeit und ob ein Lieferschein „da“ ist. Ein Klick auf eine Zeile öffnet die Lieferung.

![Reiter „Erledigt“: Tabelle mit den Spalten Buchung, Route, Laden, Fahrer, Fahrzeug, Status, Standzeit und Lieferschein; zugestellte Lieferungen mit „da“, eine stornierte Lieferung durchgestrichen](img/buero-06-erledigt.png)

### Neue Lieferung anlegen

Klicken Sie auf **Neue Lieferung** (oben rechts – auf jeder Seite verfügbar).

![Formular „Neue Lieferung“ mit Ladestelle und Entladestelle; beim Tippen von „Stu“ schlägt Ladeklar „Bosch Werk Feuerbach, Wernerstraße 1, 70469 Stuttgart · 3× genutzt“ vor](img/buero-09-neue-lieferung-vorschlaege.png)

Pflicht sind nur die **Stadt** der Ladestelle, die **Stadt** der Entladestelle und das **Datum** der Ladestelle. Alles andere hilft dem Fahrer.

| Bereich | Felder |
|---|---|
| **Ladestelle** | Ort / Firma · **Stadt \*** · Straße · PLZ · Land · **Datum \*** · von · bis · Ansprechpartner · Telefon vor Ort |
| **Entladestelle** | Ort / Firma · **Stadt \*** · Straße · PLZ · Land · Datum · von · bis · Ansprechpartner · Telefon vor Ort |
| **Ware** | Beschreibung · Paletten · Gewicht (kg) · Temperatur · Gefahrgut (ADR) · Eilig |
| **Auftrag** | Auftraggeber · Referenz des Kunden |
| **Fahrer & Fahrzeug** | Fahrer · LKW (optional) · Auflieger (optional) |
| | Hinweise für den Fahrer · Interne Notiz (sieht der Fahrer nicht) |

Zum Schluss klicken Sie auf **Lieferung anlegen**. Oben rechts erscheint „Angelegt · KAY-2610-0019“ und darunter, wer Bescheid weiß:

- „… wurde benachrichtigt.“ – Sie haben einen Fahrer gewählt.
- „Alle Fahrer sehen den Auftrag.“ – kein Fahrer gewählt, und Fahrer dürfen offene Aufträge übernehmen.
- „Der Auftrag wartet, bis Sie ihn einem Fahrer zuteilen.“ – kein Fahrer gewählt, und Fahrer dürfen offene Aufträge nicht übernehmen.

Danach öffnet sich die neue Lieferung.

- **Land:** zur Auswahl stehen DE, AT, CH, NL, BE, FR, PL, CZ, IT, DK, LU, ES, RO und HU.
- **Entladedatum:** darf nicht vor dem Ladedatum liegen.
- **Uhrzeiten:** „bis“ darf nicht vor „von“ liegen. Am selben Tag darf die Entladezeit nicht vor der Ladezeit liegen. Sonst nennt Ladeklar das Problem, z. B. „Ladestelle: Die Uhrzeit „bis“ liegt vor „von“.“
- **Paletten** 0 bis 66, **Gewicht** 0 bis 60.000 kg.
- **Telefon vor Ort:** Diese Nummer wählt der Fahrer mit dem Knopf „Anrufen“, solange er zu dieser Stelle unterwegs ist. Ohne Nummer ruft „Anrufen“ die Disposition an.
- **Hinweise für den Fahrer** erscheinen groß auf seiner Tour-Karte (z. B. „Gate B anmelden, Rampe 12“).
- **Eilig** markiert die Lieferung rot; die Mitteilung an den Fahrer kommt mit hoher Priorität.
- **LKW (optional):** Steht hier „Fahrer wählt selbst“, übernimmt die Lieferung das Fahrzeug, das der Fahrer in seiner App gewählt hat. Ist **Fahrer wählen ihr Fahrzeug selbst** an, gilt beim Bestätigen immer das Fahrzeug, das der Fahrer gewählt hat – auch wenn Sie hier eines eingetragen haben. Hat er keines gewählt, bleibt Ihres.

**Die Buchungsnummer** vergibt Ladeklar automatisch: Präfix – Jahr und Monat – laufende Nummer, z. B. `KAY-2610-0019` (Präfix KAY, Oktober 2026, 19. Lieferung im Oktober). Die laufende Nummer beginnt jeden Monat wieder bei `0001`. Jede Buchungsnummer gibt es in Ihrem Unternehmen nur einmal. Das Präfix stellen Sie unter **Einstellungen → Abläufe** ein.

### Orts-Vorschläge

Sobald Sie im Feld **Ort / Firma** oder **Stadt** zwei Buchstaben getippt haben, schlägt Ladeklar Orte vor, die Sie schon einmal verwendet haben – mit Adresse und „3× genutzt“. Ein Klick füllt Ort, Straße, PLZ, Stadt, Land, Ansprechpartner und Telefon aus. Ein eigenes Adressbuch brauchen Sie dafür nicht.

### Zuweisen oder „offen für alle“

Sie haben zwei Wege:

1. **Einem Fahrer zuweisen:** Wählen Sie im Feld **Fahrer** einen Namen. Der Fahrer bekommt die Mitteilung „Neuer Auftrag …“ und muss die Tour mit **Buchung bestätigen** annehmen.
2. **Offen für alle:** Lassen Sie „— offen für alle Fahrer —“ stehen. Alle aktiven Fahrer bekommen die Mitteilung „Offener Auftrag“ und sehen die Tour unter „Freie Aufträge“. Wer zuerst **Auftrag übernehmen** tippt, bekommt sie.

![Fahrer-App, Reiter „Aufträge“: unter „Freie Aufträge“ offene Touren wie „Sindelfingen → Leipzig, Heute 16:00–18:00 · 28 Pal.“ mit dem Knopf „Auftrag übernehmen“](img/fahrer-13-auftraege.png)

> **Wichtig:** „Offen für alle“ gibt es nur, wenn unter **Einstellungen → Abläufe** der Schalter **Fahrer dürfen offene Aufträge übernehmen** an ist. Ist er aus, heißt die erste Auswahl im Feld **Fahrer** „— wartet auf Zuweisung —“. Die Fahrer sehen die Lieferung dann nicht und bekommen keine Mitteilung. Sie wartet im Büro, bis Sie sie zuweisen; ihre Karte zeigt „wartet auf Zuweisung“.

Später ändern Sie die Zuweisung in der geöffneten Lieferung im Bereich **Zuweisung**:

![Gerade angelegte Lieferung Stuttgart → Hamburg mit Status „Offen“, Hinweis „offen für alle Fahrer“ und dem Bereich „Zuweisung“ mit Fahrer, LKW, Auflieger und dem Kästchen „Offen für alle Fahrer (jeder kann übernehmen)“](img/buero-10-lieferung-angelegt.png)

1. Wählen Sie **Fahrer**, **LKW** und **Auflieger**.
2. Solange die Lieferung offen ist und keinen Fahrer hat, können Sie **Offen für alle Fahrer (jeder kann übernehmen)** an- oder abhaken. Das Kästchen erscheint nur, wenn Fahrer offene Aufträge übernehmen dürfen. Ohne Haken bleibt die Lieferung im Büro, bis Sie sie zuweisen.
3. Klicken Sie auf **Zuweisung speichern**. Haben Sie nichts geändert, erscheint „Nichts geändert.“

#### Regeln beim Fahrerwechsel

- Nach dem Beladen kann der Fahrer nicht mehr gewechselt werden. Das Feld **Fahrer** ist dann gesperrt.
- Wechseln Sie den Fahrer einer Tour mit Status „Bestätigt“ oder „An Ladestelle“, wird sie wieder „Offen“. Der neue Fahrer muss sie selbst bestätigen.
- LKW und Auflieger, die die Tour vom bisherigen Fahrer übernommen hat, werden aus der Tour entfernt. Ein Fahrzeug, das Sie selbst eingetragen haben, bleibt. Wählen Ihre Fahrer ihr Fahrzeug selbst, gilt beim Bestätigen das Fahrzeug des neuen Fahrers.
- Die „Angekommen“-Zeiten des bisherigen Fahrers zählen nicht mehr für die Standzeit. Im Verlauf bleiben sie stehen.
- Der bisherige Fahrer bekommt die Mitteilung „Auftrag storniert“, der neue „Neuer Auftrag …“.
- Dieselben Regeln gelten, wenn ein Fahrer die Tour zurückgibt, seine Bestätigung mit **Rückgängig** zurücknimmt oder sein Zugang gelöscht wird.

### Wiederholen – Stammrouten in Sekunden

1. Öffnen Sie eine frühere Lieferung (z. B. über **Erledigt** oder die Suche).
2. Klicken Sie auf **Wiederholen**.
3. Es öffnet sich „Lieferung wiederholen“ mit allen Daten der alten Lieferung. Das Ladedatum ist heute, das Entladedatum ist um denselben Abstand verschoben. **Referenz**, **Fahrer**, **LKW** und **Auflieger** sind leer.
4. Passen Sie an, was sich geändert hat, und klicken Sie auf **Lieferung anlegen**.

### Bearbeiten

Klicken Sie in der Lieferung auf **Bearbeiten**, ändern Sie die Felder und klicken Sie auf **Speichern**. Hat die Lieferung einen Fahrer, bekommt er die Mitteilung „Auftrag geändert“ – aber nur, wenn sich etwas ändert, das er braucht: Lade- oder Entladestelle mit Datum und Uhrzeit, Ware, Hinweise für den Fahrer, LKW, Auflieger oder „Eilig“. Ändern Sie nur Auftraggeber, Referenz oder interne Notiz, bekommt er keine Mitteilung. Die Zuweisung ändert sich beim Bearbeiten nur, wenn Sie Fahrer, LKW oder Auflieger selbst umstellen.

Grenzen:

- Die **Ladestelle** lässt sich nach dem Beladen nicht mehr ändern.
- Den **Fahrer** wechseln Sie nach den Regeln oben – nach dem Beladen gar nicht mehr.

### Nachbearbeiten – abgeschlossene Lieferungen

Bei zugestellten und stornierten Lieferungen heißt der Knopf unten rechts **Nachbearbeiten** (siehe Bild in [Abschnitt 6](#lieferschein-und-fotos-im-büro)).

1. Klicken Sie auf **Nachbearbeiten**. Es öffnet sich das kurze Formular „Lieferung nachbearbeiten“.
2. Ändern Sie **Auftraggeber**, **Referenz des Kunden** oder **Interne Notiz (sieht der Fahrer nicht)**. Mehr Felder hat das Formular nicht: Orte, Ware, Fahrer und Zeitstempel bleiben, wie sie sind – sie sind der Nachweis der Fahrt.
3. Klicken Sie auf **Speichern**. Der Fahrer bekommt keine Mitteilung.

> **Gut zu wissen:** Nachbearbeiten und Dokumente, die Sie später hinzufügen, ändern den Zeitpunkt der Zustellung nicht. Die Berichte, die Kachel „Heute zugestellt“, die CSV-Spalte „Zugestellt am“ und die Aufbewahrungsfrist richten sich immer nach der Zustellung – bei stornierten Lieferungen nach der Stornierung.

### Stornieren

1. Öffnen Sie die Lieferung und klicken Sie unten links auf **Stornieren**.
2. Tragen Sie einen **Grund (geht an den Fahrer)** ein, z. B. „Kunde hat verschoben“.
3. Klicken Sie auf **Stornieren**.

Der Fahrer bekommt sofort eine dringende Mitteilung „Auftrag storniert“ mit dem Grund. Die Lieferung steht danach mit Status „Storniert“ unter **Erledigt**. Eine Stornierung lässt sich nicht zurücknehmen – legen Sie die Tour bei Bedarf mit **Wiederholen** neu an. Bereits abgeschlossene Lieferungen können nicht storniert werden.

---

## 5. Den Fortschritt verstehen

### Die Status-Kette

Jede Lieferung durchläuft eine feste Reihenfolge. Welche Schritte es gibt, hängt vom Schalter **Ankunft an Lade- und Entladestelle erfassen** ab.

| Fahrer tippt | Status danach | In der Fortschrittsleiste | Nur mit Ankunft-Erfassung |
|---|---|---|---|
| (Lieferung angelegt) | **Offen** | – | |
| **Buchung bestätigen** bzw. **Auftrag übernehmen** | **Bestätigt** | Bestätigt | |
| **Angekommen – Ladestelle** | **An Ladestelle** | Ankunft | ja |
| **Aufgeladen** | **Beladen · unterwegs** | Beladen | |
| **Angekommen – Entladestelle** | **An Entladestelle** | Ankunft | ja |
| **Abgeladen** | **Entladen** | Entladen | |
| **Bestätigen & abschließen** | **Zugestellt** | Zugestellt | |
| (Büro storniert) | **Storniert** | – | |

- **Ohne** Ankunft-Erfassung hat die Fortschrittsleiste vier Schritte: Bestätigt · Beladen · Entladen · Zugestellt.
- **Mit** Ankunft-Erfassung sind es sechs: Bestätigt · Ankunft · Beladen · Ankunft · Entladen · Zugestellt. Auf dem Handy steht bei sechs Schritten nur die Beschriftung des aktuellen Schritts; die Uhrzeiten der erledigten Schritte stehen trotzdem darunter.

Der Fahrer sieht immer nur den nächsten Schritt als großen Knopf. Er kann keinen Schritt überspringen. Darunter hat er immer **Navi**, **Anrufen**, **Notiz** und **Problem**, dazu **Alle Details**. **Navi** öffnet die Route zur Ladestelle, ab „Beladen“ zur Entladestelle – auf iPhone und iPad in Apple Karten, auf allen anderen Geräten in Google Maps.

![Fahrer-App: Tour Böblingen → Nürnberg mit Status „Offen“, Hinweis „Nicht stapeln! Kippindikatoren prüfen.“, großem Knopf „Buchung bestätigen – Sie übernehmen diese Tour“ und den Knöpfen Navi, Anrufen, Notiz und Problem](img/fahrer-04-auftrag-bestaetigen.png)

### Zeitstempel

Unter jedem erledigten Schritt der Fortschrittsleiste steht die Uhrzeit. Alle Zeiten sind deutsche Zeit (Europe/Berlin). Als Zeitstempel gilt der Moment, in dem der Fahrer tippt – auch wenn er ohne Netz getippt hat und das Handy den Schritt erst später nachsendet (siehe [Abschluss ohne Netz](#abschluss-ohne-netz)).

Ladeklar nimmt dafür die Uhrzeit des Handys, wenn sie plausibel ist: höchstens 72 Stunden alt, höchstens 2 Minuten in der Zukunft und nicht vor dem vorigen Schritt oder der letzten Zuweisung der Tour. Sonst gilt der Moment, in dem der Schritt bei Ladeklar ankommt. Kommt ein Schritt später an, als er getippt wurde, speichert Ladeklar den Eingang zusätzlich; er steht im Datenexport (JSON).

### Der Verlauf

In jeder geöffneten Lieferung steht rechts unten der **Verlauf** – ein Zeitstrahl mit allem, was passiert ist, neueste Meldung oben:

- Uhrzeit und Tag
- was passiert ist (z. B. „Lieferung angelegt“, „Fahrer zugewiesen“, „Buchung bestätigt“, „Aufgeladen“, „Zugestellt – Lieferschein bestätigt“ bzw. „Zugestellt – ohne Lieferschein“, „Dokument hochgeladen“, „Dokument entfernt“, „Notiz“, „Problem gemeldet“, „Problem erledigt“, „Geändert“, „Fahrzeug gesetzt“, „Zurückgegeben“, „Storniert“, „Schritt zurückgenommen“, „Fahrer entfernt (Zugang gelöscht)“)
- wer es getan hat; Aktionen aus dem Büro sind mit „Büro“ gekennzeichnet
- Details, z. B. der Palettentausch beim Abladen oder die Art des Dokuments
- einen Link **Standort**, wenn der Standort beim Tipp gespeichert wurde (nur mit Einwilligung des Fahrers, siehe [Abschnitt 12](#datenschutz-standort-und-auswertungen-je-fahrer))

Ein Schritt, der ohne Netz getippt und später gesendet wurde, steht im Verlauf an der Stelle seiner Uhrzeit.

### Rückgängig (2 Minuten)

Hat sich ein Fahrer vertippt, kann er seinen eigenen letzten Schritt 2 Minuten lang mit **Rückgängig** zurücknehmen. Die Leiste unten in seiner App zeigt den Schritt mit Uhrzeit und einem ablaufenden Ring.

![Fahrer-App nach „Buchung bestätigen“: in der Fortschrittsleiste ist „Bestätigt“ um 00:33 erledigt, der nächste Knopf heißt „Angekommen – Ladestelle“, unten die Leiste „Bestätigt · 00:33“ mit dem Knopf „Rückgängig“](img/fahrer-06-tour-mit-rueckgaengig.png)

Sie bekommen dann die Mitteilung „Schritt zurückgenommen“. Im Verlauf bleibt der zurückgenommene Schritt sichtbar, ausgegraut, mit dem Eintrag „Schritt zurückgenommen – wieder „…““. Nimmt ein Fahrer „Auftrag übernehmen“ bei einem offenen Auftrag zurück, ist die Tour wieder für alle frei. Nimmt er „Buchung bestätigen“ zurück, gelten die [Regeln beim Fahrerwechsel](#regeln-beim-fahrerwechsel) für LKW, Auflieger und Ankunftszeiten.

**Rückgängig** gibt es nur mit Netz. Ohne Netz blendet die App die Leiste aus, und für Schritte, die ohne Netz getippt wurden, bietet sie **Rückgängig** gar nicht an. Bricht die Verbindung beim Tippen auf **Rückgängig** ab, sieht der Fahrer „Rückgängig geht nur mit Netz.“ Die 2 Minuten zählen ab dem Tipp des Schritts.

### Zurückgegeben

Solange noch nicht geladen ist (Status „Bestätigt“ oder „An Ladestelle“), kann der Fahrer eine Tour mit Grund zurückgeben, z. B. „krank, LKW defekt, Lenkzeit erreicht“. Sie bekommen eine dringende Mitteilung „Auftrag zurückgegeben“. Die Lieferung ist danach wieder **Offen**, ohne Fahrer und **nicht** für alle freigegeben – bitte weisen Sie sie neu zu (siehe [Zuweisen](#zuweisen-oder-offen-für-alle) und [Regeln beim Fahrerwechsel](#regeln-beim-fahrerwechsel)). Nach dem Beladen kann der Fahrer nicht mehr zurückgeben; er ruft dann die Disposition an. Zum Zurückgeben braucht der Fahrer Netz.

### Standzeit

Mit Ankunft-Erfassung berechnet Ladeklar die **Standzeit**: die Minuten von „Angekommen – Ladestelle“ bis „Aufgeladen“ plus von „Angekommen – Entladestelle“ bis „Abgeladen“. Es zählen die Uhrzeiten der Tipps, auch bei Schritten ohne Netz. „Angekommen“-Zeiten eines früheren Fahrers zählen nicht. Sie steht in der Lieferung („Standzeit 30 Min.“), in der Tabelle unter **Erledigt**, im Abliefernachweis und in den Berichten – die Grundlage für Standgeld-Rechnungen. Auch der Fahrer sieht sie: In seiner App unter **Verlauf** stehen seine abgeschlossenen Touren der letzten 30 Tage mit Standzeit.

![Fahrer-App, Reiter „Verlauf – letzte 30 Tage“: drei zugestellte Touren mit Buchungsnummer, Uhrzeit und Standzeit](img/fahrer-14-verlauf.png)

---

## 6. Lieferschein, Fotos, Unterschrift und Abliefernachweis

### So kommt der Lieferschein ins Büro

Nach „Abgeladen“ öffnet der Fahrer mit dem nächsten Knopf den Bildschirm **Abschluss**:

![Fahrer-App, Bildschirm „Abschluss“: Bereich „1 · Lieferschein“ mit einem Foto und der Kachel „Weitere Seite“, Bereich „2 · Empfänger“ mit dem Namen „Herr Schulz“ und dem Feld „Unterschrift“](img/fahrer-11-lieferschein-unterschrift.png)

1. **1 · Lieferschein:** Der Fahrer fotografiert den Lieferschein. Mehrseitige Lieferscheine fotografiert er Seite für Seite (**Weitere Seite**). Er kann auch eine PDF-Datei wählen. Fotos werden vor dem Senden automatisch verkleinert, damit sie auch im Ausland mit wenig Datenvolumen schnell ankommen.
2. **2 · Empfänger:** Name des Empfängers (freiwillig) und – wenn verlangt oder gewünscht – die **Unterschrift** auf dem Display.
3. **Bestätigen & abschließen:** Die Lieferung ist zugestellt; Sie bekommen die Mitteilung „Zugestellt · … Lieferschein liegt vor“. Schließt der Fahrer ohne Lieferschein-Foto ab (nur möglich, wenn das Foto keine Pflicht ist), lautet sie „Zugestellt · … ohne Lieferschein“.

Ist **Lieferschein-Foto ist Pflicht** eingeschaltet, kann der Fahrer erst abschließen, wenn mindestens ein Foto da ist. Ist **Unterschrift des Empfängers verlangen** eingeschaltet, bleibt **Bestätigen & abschließen** gesperrt, bis der Empfänger unterschrieben hat. Die App zeigt dann „Bitte den Empfänger unterschreiben lassen.“ Beides gilt auch ohne Netz.

### Abschluss ohne Netz

Hat der Fahrer an der Rampe kein Netz, arbeitet er trotzdem bis zum Ende weiter. Oben in seiner App steht dann „Offline – Ihre Schritte werden gespeichert und automatisch gesendet.“

- **Auch nach einem Neustart:** Die App öffnet sich auch im Funkloch, wenn der Fahrer sie auf diesem Handy schon einmal mit Netz benutzt hat. Sie zeigt seine Touren mit dem Stand, den das Handy zuletzt hatte. Hat das Handy noch keine Daten, steht dort „Keine Verbindung. Die Touren erscheinen, sobald wieder Netz da ist.“
- Schritte (auch „Abgeladen“ mit Palettentausch), Lieferschein-Fotos, die Unterschrift, Notizen und Problemmeldungen mit Foto speichert das Handy und sendet sie später.
- Die App zeigt sofort den nächsten Schritt und den Bildschirm **Abschluss** – aus den Daten, die das Handy schon hat. Ein gespeichertes Lieferschein-Foto zählt für die Lieferschein-Pflicht mit. Eine verlangte Unterschrift muss auch ohne Netz da sein. Nach dem Abschluss steht dort „Gespeichert – wird gesendet, sobald Netz da ist“.
- **Reihenfolge:** Sobald wieder Netz da ist, sendet die App alles in der Reihenfolge, in der der Fahrer getippt hat: zuerst Fotos und Unterschrift, dann „Bestätigen & abschließen“. Neue Schritte stellen sich hinten an. Solange noch etwas wartet, steht oben „… Schritt(e) werden gesendet …“. Erst wenn ein Schritt angekommen ist, sehen Sie ihn im Büro und bekommen die Mitteilung.
- **Uhrzeit:** Es zählt der Moment des Tippens, nicht der Moment des Sendens (siehe [Zeitstempel](#zeitstempel)). So stimmen auch Standzeit und Pünktlichkeit.
- **Nichts doppelt:** Geht eine Antwort unterwegs verloren, sendet das Handy den Schritt oder das Foto noch einmal. Ladeklar erkennt die Wiederholung und speichert alles nur einmal.
- **Rückgängig** gibt es nur mit Netz.
- **Abgelehnt:** Lehnt Ladeklar einen gespeicherten Schritt ab – zum Beispiel, weil Sie ihn inzwischen mit **Für Fahrer setzen** gesetzt, die Tour storniert oder einem anderen Fahrer gegeben haben –, sieht der Fahrer die Meldung „Nicht gesendet: …“ mit Schritt, Buchungsnummer und Grund. Auf seinem Startbildschirm bleibt die Karte **Nicht gesendet** stehen („Die Disposition hat das nicht bekommen. Bitte prüfen und bei Bedarf anrufen.“), bis er auf **Verstanden** tippt.
- **Neu anmelden:** Endet die Anmeldung des Fahrers, während Schritte warten (z. B. nach **Neue PIN & Einladung**), sieht er „Bitte neu anmelden. Gespeicherte Schritte werden danach gesendet.“ Die Schritte bleiben auf dem Handy und gehen raus, sobald sich derselbe Fahrer wieder anmeldet. Meldet sich auf dem Handy ein anderer Fahrer an, sendet es sie nicht.
- **Abmelden:** Solange Schritte warten, ist **Abmelden** gesperrt. Unter **Mehr** steht dann „… Schritt(e) sind noch nicht gesendet. Bitte erst mit Netz abmelden.“ Ist alles gesendet, geht **Abmelden** auch ohne Netz. Das Handy meldet die Abmeldung dem Server, sobald wieder Netz da ist.
- **Zurückgeben** sowie Fahrzeug wählen oder abgeben brauchen Netz. Solange gespeicherte Schritte warten, warten diese Aktionen ebenfalls; ohne Netz erscheint „Keine Verbindung.“

### Lieferschein und Fotos im Büro

![Zugestellte Lieferung Böblingen → Nürnberg: Fortschrittsleiste mit allen Uhrzeiten, „Lieferschein & Fotos“ mit der Auswahl der Dokumentart, Lieferschein-Foto und Unterschrift, Palettentausch „10 abgegeben, 10 mitgenommen“, „Empfangen von: Herr Schulz“ und unten die Knöpfe „Abliefernachweis“, „Wiederholen“ und „Nachbearbeiten“](img/buero-07-lieferschein-im-buero.png)

In der geöffneten Lieferung stehen rechts unter **Lieferschein & Fotos** alle Dokumente als kleine Bilder, beschriftet mit „Lieferschein“, „CMR“, „Schaden“, „Ladung“, „Foto“ oder „Unterschrift“.

- Ein Klick vergrößert das Bild; **Original** öffnet es in voller Größe. PDF-Dateien öffnen sich in einem neuen Fenster.
- Mit **Hinzufügen** laden Sie selbst Fotos oder PDFs hoch – zum Beispiel, wenn der Fahrer den Papier-Lieferschein oder den CMR-Frachtbrief ins Büro bringt. Wählen Sie vorher in der Auswahl neben „Lieferschein & Fotos“ die Art: **Lieferschein** (Voreinstellung), **CMR**, **Schaden**, **Ladung** oder **Foto**. Das geht auch noch nach der Zustellung, aber nicht bei stornierten Lieferungen.
- Für die Lieferschein-Pflicht zählt nur die Art **Lieferschein**.
- Solange die Lieferung nicht abgeschlossen ist, können Sie ein Dokument mit dem kleinen **×** entfernen. Bei zugestellten Lieferungen bleibt jedes Dokument bis zum Ende der Aufbewahrung.
- Erlaubt sind Fotos (JPG, PNG, WebP) bis 10 MB und PDF-Dateien bis 15 MB. Jede Datei zählt zum Speicher Ihres Tarifs (siehe [Speicher](#speicher)).

### Abliefernachweis (Drucken / PDF)

Der Abliefernachweis fasst eine Lieferung auf einem Blatt zusammen – für Ihren Kunden oder Ihre Buchhaltung, damit die Rechnung am selben Tag raus kann.

![Abliefernachweis KAY-2610-0015 mit Firmenlogo und Erstelldatum mit Jahr, Tabelle mit Auftraggeber, Lade- und Entladestelle, Ware, Fahrer/Fahrzeug, Status mit Zustellzeit, Standzeit und Palettentausch, darunter „Zeitstempel“ mit Datum, Jahr und Uhrzeit und „Lieferschein & Fotos“, unten rechts der Knopf „Drucken / PDF“](img/buero-08-abliefernachweis.png)

1. Öffnen Sie die Lieferung und klicken Sie auf **Abliefernachweis**.
2. Prüfen Sie den Inhalt: Ihr Logo, Buchungsnummer und Erstelldatum, Auftraggeber und Referenz, Lade- und Entladestelle, Ware, Fahrer und Fahrzeug, Status mit Datum und Uhrzeit der Zustellung und „Empfangen von …“, Standzeit und Palettentausch (falls erfasst), alle **Zeitstempel** mit Datum, Jahr, Uhrzeit und Person sowie **Lieferschein & Fotos** mit Lieferscheinen, CMR, Schadensfotos und Unterschrift.
3. Wurde beim Tipp der Standort gespeichert (siehe [Abschnitt 12](#datenschutz-standort-und-auswertungen-je-fahrer)), hat die Tabelle **Zeitstempel** eine weitere Spalte mit den Koordinaten. Ein Klick öffnet die Stelle in Google Maps. Darunter steht „Standort: nur im Moment des Tipps gespeichert, wenn der Fahrer zugestimmt hat.“
4. Klicken Sie auf **Drucken / PDF**. Es öffnet sich der Druckdialog Ihres Browsers. Wählen Sie einen Drucker oder „Als PDF speichern“.
5. Mit dem Pfeil oben links kommen Sie zurück zur Lieferung.

> **Tipp:** Zurückgenommene Schritte erscheinen im Abliefernachweis nicht – dort stehen nur die gültigen Zeitstempel.

---

## 7. Störungen und Notizen

### Störungen

Der Fahrer meldet ein Problem mit dem Knopf **Problem** auf seiner Tour-Karte:

![Fahrer-App „Problem melden“ mit acht Gründen von „Stau / Verspätung“ bis „Sonstiges“, einem Textfeld „Was ist passiert? (optional)“, dem Knopf „Foto hinzufügen (optional)“ und dem Knopf „Jetzt melden“](img/fahrer-09-problem.png)

| Gründe, die der Fahrer wählen kann | |
|---|---|
| Stau / Verspätung | Panne |
| Unfall | Ware beschädigt |
| Annahme verweigert | Adresse falsch |
| Lange Wartezeit | Sonstiges |

Dazu kann er einen kurzen Text und ein Foto mitschicken. Das Foto liegt danach als „Schaden“ bei den Dokumenten. Ohne Netz wartet die Meldung samt Foto auf dem Handy und kommt an, sobald wieder Netz da ist.

So sehen Sie die Störung:

- sofort als **dringende Mitteilung** (rotes Symbol, mit Ton)
- auf der Live-Übersicht in der roten Kachel **Störungen** und als rot markierte Tour
- unter **Lieferungen → Störungen**
- in der Lieferung als rotes Band mit Grund, Text und „vor … Min.“

![Lieferung Esslingen → Frankfurt am Main mit rotem Band „Stau / Verspätung – A5 Vollsperrung bei Darmstadt, ca. 40 Min. später“ und dem Knopf „Erledigt“; unten die Knöpfe „Stornieren“, „Für Fahrer setzen: Angekommen – Entladestelle“, „Abliefernachweis“, „Wiederholen“ und „Bearbeiten“](img/buero-05-lieferung-details.png)

Wenn die Störung geklärt ist, klicken Sie im roten Band auf **Erledigt**. Der Fahrer bekommt die Mitteilung „Problem erledigt“. Im Verlauf bleiben Meldung und Erledigung stehen, und in den Berichten zählt die Lieferung weiter unter „Probleme“.

> **Wichtig:** Eine Lieferung hat immer höchstens eine offene Störung. Meldet der Fahrer ein zweites Problem, ersetzt es die Anzeige; die erste Meldung bleibt im Verlauf.

### Notizen mit dem Fahrer

Unter **Notizen mit dem Fahrer** schreiben Sie und der Fahrer sich kurze Nachrichten zu genau dieser Lieferung:

1. Text in das Feld **Nachricht an den Fahrer …** schreiben.
2. Auf den Senden-Pfeil klicken.

Der Fahrer bekommt eine Mitteilung „Notiz von …“. Umgekehrt bekommen Sie eine Mitteilung, wenn der Fahrer eine Notiz schickt. Fahrer haben dafür Schnellbausteine wie „Stau, ca. 30 Min. später“, „Warte an der Rampe“, „Kunde nicht erreichbar“, „Paletten getauscht“, „Ladung gesichert“ und „Pause (Lenkzeit)“.

![Fahrer-App „Notiz an die Disposition“ mit den sechs Schnellbausteinen, dem Textfeld und dem Knopf „Senden“](img/fahrer-08-notiz.png)

Daneben gibt es zwei Notizfelder im Formular der Lieferung:

- **Hinweise für den Fahrer** – stehen auf seiner Tour-Karte.
- **Interne Notiz (sieht der Fahrer nicht)** – nur für das Büro; in der Lieferung mit einem Schloss als „Intern“ markiert.

---

## 8. Für Fahrer setzen – wenn ein Fahrer anruft

Manchmal kann der Fahrer nicht tippen: Akku leer, Handy defekt, oder er ruft ohnehin gerade an. Dann setzen Sie den Schritt für ihn.

1. Öffnen Sie die Lieferung.
2. Unten steht der Knopf **Für Fahrer setzen: …** mit dem nächsten Schritt, z. B. „Für Fahrer setzen: Angekommen – Entladestelle“.
3. Klicken Sie darauf. Oben erscheint „Gesetzt: …“.

Gut zu wissen:

- Der Knopf erscheint erst, wenn die Lieferung bestätigt ist, und nur bis zur Zustellung. Eine offene Lieferung bestätigt immer der Fahrer selbst – das Büro kann eine Buchung nicht für ihn bestätigen.
- Im Verlauf steht Ihr Name mit dem Zusatz „Büro“ – so ist klar, wer den Schritt gesetzt hat.
- Der Fahrer bekommt die Mitteilung „Auftrag geändert“ und sieht in seiner App den neuen Stand.
- Für **Zugestellt** brauchen Sie bei eingeschalteter Lieferschein-Pflicht zuerst einen Lieferschein: Laden Sie ihn mit **Hinzufügen** hoch (Foto oder PDF). Sonst erscheint „Bitte zuerst den Lieferschein hinzufügen (Foto/PDF).“
- Ist **Unterschrift des Empfängers verlangen** eingeschaltet, kann nur der Fahrer mit Unterschrift abschließen.
- Beim Setzen von „Abgeladen“ aus dem Büro wird kein Palettentausch abgefragt.
- Hat der Fahrer denselben Schritt ohne Netz schon getippt, wird sein gespeicherter Schritt beim Nachsenden abgelehnt. Es gilt Ihr Zeitstempel. Der Fahrer sieht dann „Nicht gesendet: …“ (siehe [Abschluss ohne Netz](#abschluss-ohne-netz)).

> **Wichtig:** Einen Schritt, den Sie für den Fahrer gesetzt haben, können Sie nicht zurücknehmen – „Rückgängig“ gibt es nur für den Fahrer und nur für seine eigenen Schritte. Prüfen Sie den Knopftext, bevor Sie klicken.

---

## 9. Fahrer verwalten

Unter **Fahrer** sehen Sie alle Fahrer als Karten. Oben steht, wie viele Fahrer-Plätze Ihres Tarifs belegt sind (z. B. „6 von 15 Fahrer-Plätzen belegt“).

![Seite „Fahrer“ mit Platzanzeige „6 von 15 Fahrer-Plätzen belegt“, Tarif „Flotte“ und sechs Fahrerkarten mit Handynummer, Sprache, Kennzeichen, laufenden Touren, Führerscheinklasse und den Knöpfen „Neue PIN & Einladung“, „Bearbeiten“, „Sperren“, Telefon und Papierkorb](img/buero-11-fahrer.png)

Jede Karte zeigt Name, Handynummer, die Sprache der App (Kürzel rechts oben), gewählte Kennzeichen oder „kein LKW“, laufende Touren, Führerscheinklasse und ggf. „gesperrt“. Darunter: **Neue PIN & Einladung**, **Bearbeiten**, **Sperren** bzw. **Entsperren**, ein Telefon-Knopf zum Anrufen und – nur für Admins – der Papierkorb zum Löschen.

### Fahrer anlegen

![Formular „Fahrer anlegen“ mit den Feldern Name, Handynummer, Sprache der App, Führerscheinklasse, Personalnummer und Notiz](img/buero-13-fahrer-anlegen.png)

1. Klicken Sie auf **Fahrer anlegen**.
2. Füllen Sie aus:
   - **Name \*** und **Handynummer \*** (Pflicht; die Handynummer ist der Login)
   - **Sprache der App** (Deutsch, English, Polski, Română, Čeština, Türkçe, Русский, Українська)
   - **Führerscheinklasse**, **Personalnummer**, **Notiz** (freiwillig)
3. Klicken Sie auf **Anlegen & PIN erzeugen**.

Ladeklar speichert die Handynummer international und zeigt sie gegliedert an: aus „0176 1000 0004“ wird „+49 176 10000004“. Auch Schreibweisen wie „+49 (0)176 …“ oder „0049 176 …“ ergeben dieselbe Nummer. Jede Handynummer und jede Personalnummer darf es in Ihrem Unternehmen nur einmal geben („Diese Handynummer ist schon vergeben.“ bzw. „Diese Personalnummer ist schon vergeben.“).

### Einladung per QR-Code, WhatsApp oder SMS

Nach dem Anlegen öffnet sich das Fenster **Zugang für …**:

![Fenster „Zugang für Andrei Popescu“ mit QR-Code, PIN, Firmencode KAYA, Login-Nummer, „Link gültig bis“ mit Datum, dem Hinweis zur einmaligen Anmeldung, Einladungstext und den Knöpfen „Neue Einladung“, „Text kopieren“, „WhatsApp“, „SMS“ und „Fertig“](img/buero-12-fahrer-einladung.png)

- **QR-Code:** Der Fahrer scannt ihn mit der Handy-Kamera und gibt nur noch die PIN ein. Der QR-Code enthält den Einladungslink.
- **PIN:** 6 Ziffern. Mit dem Kopier-Knopf daneben übernehmen Sie sie in die Zwischenablage.
- **Firmencode** und **Login** (die Handynummer) für die Anmeldung ohne Link.
- **Link gültig bis:** Der Einladungslink gilt 14 Tage und nur für eine Anmeldung („Der Link gilt für eine Anmeldung. Abgelaufen oder benutzt? „Neue Einladung“ erzeugt Link und PIN neu.“).
- **Einladungstext** zum Weiterleiten, zum Beispiel: „Hallo Andrei, hier ist dein Zugang zur App „Kaya Fahrer“: [Link] – PIN: 715185. Link öffnen, PIN eingeben, fertig. Login sonst mit Firmencode KAYA und deiner Handynummer.“
- **WhatsApp** und **SMS** öffnen die jeweilige App mit dem fertigen Text an die Nummer des Fahrers; **Text kopieren** für jeden anderen Weg.
- **Neue Einladung** erzeugt einen neuen Link und eine neue PIN – wie **Neue PIN & Einladung** auf der Fahrerkarte.

> **Wichtig:** Die PIN wird nur jetzt angezeigt. Schicken Sie die Einladung, bevor Sie auf **Fertig** klicken. Haben Sie es vergessen, erzeugen Sie mit **Neue PIN & Einladung** einfach eine neue.

Öffnet der Fahrer einen Link, der schon benutzt wurde oder abgelaufen ist, sieht er „Einladung abgelaufen – bitte neue Einladung im Büro anfordern“ und darunter die normale Anmeldung. Mit Firmencode, Handynummer und PIN kommt er weiterhin hinein. Ein gültiger Link öffnet die App in Ihrem Branding und in der Sprache des Fahrers.

So kann sich ein Fahrer anmelden:

| Weg | Was der Fahrer eingibt |
|---|---|
| Einladungslink oder QR-Code (einmal, 14 Tage gültig) | nur die PIN |
| Link Ihrer Firma (unter **Firma & Marke** angezeigt, z. B. `…/t/KAYA`) | Handynummer und PIN |
| allgemeine Anmeldeseite, Reiter **Fahrer** | Firmencode, Handynummer und PIN |

Statt der Handynummer kann der Fahrer im Feld „Handynummer“ auch seine **Personalnummer** eingeben, wenn Sie eine hinterlegt haben. Fahrer bleiben 90 Tage angemeldet, solange sie die App nutzen.

![Anmeldeseite „Kaya Fahrer“ über den Link der Firma: Logo, Reiter „Fahrer“, Feld „Handynummer“, sechs PIN-Kästchen und großes Ziffernfeld](img/fahrer-01-anmeldung.png)

### Neue PIN & Einladung

Klicken Sie auf der Fahrerkarte auf **Neue PIN & Einladung**. Ladeklar erzeugt sofort eine neue PIN und einen neuen Einladungslink und zeigt wieder das Fenster mit QR-Code und Einladungstext.

- Die alte PIN und der alte Einladungslink gelten ab sofort nicht mehr.
- Der Fahrer wird auf allen Geräten abgemeldet und meldet sich mit der neuen PIN wieder an. Seine Push-Mitteilungen enden, bis er sich neu angemeldet hat.
- Eine Sperre nach zu vielen falschen PINs wird damit ebenfalls aufgehoben.

### Fahrer sperren und entsperren

**Sperren** beendet sofort die Sitzung des Fahrers. Er kann sich nicht mehr anmelden, bekommt keine Mitteilungen mehr, und seine Fahrzeuge werden freigegeben. Der Platz in Ihrem Tarif wird frei. Seine Lieferungen und der Verlauf bleiben erhalten. Touren, die ihm zugewiesen sind, bleiben ihm zugewiesen – weisen Sie offene und bestätigte Touren unter **Zuweisung** einem anderen Fahrer zu.

**Entsperren** macht den Zugang wieder nutzbar – sofern in Ihrem Tarif ein Fahrer-Platz frei ist.

### Person löschen

Muss ein Zugang ganz weg – etwa weil ein Fahrer die Löschung seiner Daten verlangt –, löscht ihn ein Admin. Disponenten können niemanden löschen.

1. Fahrer: Klicken Sie unter **Fahrer** auf der Karte auf den **Papierkorb**. Büro-Zugang: **Einstellungen → Team**, Papierkorb in der Zeile.
2. Lesen Sie das Fenster „… endgültig löschen?“.
3. Klicken Sie auf **Endgültig löschen**. Oben erscheint „Gelöscht – der Zugang ist beendet“.

![Fenster „Sven Krause endgültig löschen?“ mit dem Hinweis „Das lässt sich nicht rückgängig machen.“, drei Punkten zu gelöschten Daten, abgeschlossenen Lieferungen und offenen Aufträgen, dem Hinweis „Nur sperren statt löschen?“ und den Knöpfen „Abbrechen“ und „Endgültig löschen“](img/buero-24-fahrer-loeschen.png)

Was dabei passiert:

- **Daten weg:** Der Name wird zu „Gelöschter Nutzer“. Handynummer bzw. E-Mail, PIN bzw. Passwort, Personalnummer, Führerscheinklasse, Notiz, Standort-Einwilligung und Mitteilungen werden gelöscht.
- **Anmeldung endet sofort** auf allen Geräten.
- **Abgeschlossene Lieferungen** bleiben für Ihre Unterlagen erhalten und zeigen als Fahrer „Gelöschter Nutzer“.
- **Offene und bestätigte Touren** des Fahrers (Status „Offen“, „Bestätigt“ oder „An Ladestelle“) gehen zurück an die Disposition: Sie stehen danach unter **Lieferungen → Offen**, ohne Fahrer und nicht für alle freigegeben. LKW und Auflieger aus seiner Fahrzeugwahl werden aus diesen Touren entfernt, seine „Angekommen“-Zeiten zählen nicht mehr (siehe [Regeln beim Fahrerwechsel](#regeln-beim-fahrerwechsel)). Im Verlauf steht „Fahrer entfernt (Zugang gelöscht)“. Eine Mitteilung gibt es dafür nicht – weisen Sie die Touren neu zu.
- **Beladene Tour:** Hat der Fahrer eine Tour mit Status „Beladen · unterwegs“, „An Entladestelle“ oder „Entladen“, lehnt Ladeklar das Löschen ab („Der Fahrer hat eine beladene Tour. …“). Den Fahrer einer beladenen Tour können Sie nicht wechseln. Schließen Sie die Tour deshalb erst ab – notfalls mit **Für Fahrer setzen** – oder stornieren Sie sie.
- Seine **Fahrzeuge** werden frei, der **Platz** in Ihrem Tarif auch. Die Person verschwindet aus den Listen.
- Ihren **eigenen Zugang** können Sie nicht löschen.
- Löschen geht in jedem Lizenz-Status – auch wenn Ihre Lizenz gesperrt oder gekündigt ist.
- Im Protokoll steht `user.delete`.

> **Wichtig:** Löschen lässt sich nicht rückgängig machen. Soll der Zugang nur ruhen, nutzen Sie **Sperren**.

### Sprache des Fahrers

Die Sprache stellen Sie beim Anlegen oder unter **Bearbeiten** im Feld **Sprache der App** ein. Der Fahrer kann sie jederzeit selbst ändern (**Mehr → Sprache**). Mitteilungen an den Fahrer kommen in seiner Sprache.

![Fahrer-App, Reiter „Mehr“: Name, Telefonnummer und Führerscheinklasse des Fahrers, zweizeiliger Knopf „Disposition anrufen“ mit der Nummer, Sprachauswahl mit acht Sprachen und darunter der Anfang des Bereichs „Mitteilungen“ mit dem Schalter „Push-Mitteilungen auf diesem Handy“](img/fahrer-15-mehr.png)

### Bearbeiten

Unter **Bearbeiten** ändern Sie Name, Handynummer, Sprache der App, Führerscheinklasse, Personalnummer und Notiz. Ändern Sie die Handynummer, meldet sich der Fahrer künftig mit der neuen Nummer an.

---

## 10. Der Fahrzeug-Pool

Unter **Fahrzeuge** verwalten Sie den Pool, aus dem Ihre Fahrer LKW und Auflieger wählen.

![Seite „Fahrzeuge“ mit Fahrzeugkarten: Kennzeichen, Bezeichnung, Art, Nutzlast und Stellplätze, Hinweise „fährt: …“, „Werkstatt“, eine fällige HU und eine überfällige SP sowie die Knöpfe „Bearbeiten“, „Freigeben“, „In die Werkstatt“ und „Zurück in Betrieb“](img/buero-14-fahrzeuge.png)

Oben filtern Sie nach **Alle**, **LKW / Zugmaschinen** oder **Auflieger / Anhänger**. Jede Karte zeigt Kennzeichen, Bezeichnung, Art, Nutzlast und Palettenstellplätze sowie den Zustand:

| Anzeige | Bedeutung |
|---|---|
| **frei** | kann gewählt werden |
| **fährt: Name** | ein Fahrer hat das Fahrzeug gewählt – es ist belegt |
| **Werkstatt** | nicht wählbar |
| HU/SP-Hinweis gelb | Termin in den nächsten 30 Tagen („fällig am …“) |
| HU/SP-Hinweis rot | Termin vorbei („überfällig seit …“) |

### Fahrzeug anlegen

![Formular „Fahrzeug anlegen“ mit Umschalter „LKW / Zugmaschine“ und „Auflieger / Anhänger“, Feldern für Kennzeichen, Art, Bezeichnung, Nutzlast, Palettenstellplätze, Nächste HU, Nächste SP, Ausstattung und Notiz](img/buero-15-fahrzeug-anlegen.png)

1. Klicken Sie auf **Fahrzeug anlegen**.
2. Wählen Sie **LKW / Zugmaschine** oder **Auflieger / Anhänger** (lässt sich später nicht mehr ändern).
3. Füllen Sie aus:
   - **Kennzeichen \*** (jedes Kennzeichen nur einmal)
   - **Art** – LKW: Sattelzugmaschine, Solo-LKW, Gliederzug, Kühlkoffer, Kipper, Tankwagen, Transporter; Auflieger: Planenauflieger, Kühlauflieger, Kipper, Container-Chassis, Tieflader, Kofferauflieger
   - **Bezeichnung** (z. B. „MAN TGX 18.510“), **Nutzlast (kg)** (0 bis 60.000), **Palettenstellplätze** (0 bis 66)
   - **Nächste HU** und **Nächste SP**
   - **Ausstattung**: Ladebordwand, Kühlung, ADR, Mitnahmestapler, Hebebühne, Kran
   - **Notiz** (z. B. „Werkstatt bis Freitag (Bremsen)“)
4. Klicken Sie auf **Speichern**.

Mit **Bearbeiten** ändern Sie die Angaben später; dort finden Sie auch **Entfernen**, um ein Fahrzeug aus dem Pool zu nehmen (das dürfen Admins und Disponenten). Frühere Lieferungen behalten das Kennzeichen.

### Wie „belegt“ funktioniert

Ist **Fahrer wählen ihr Fahrzeug selbst** eingeschaltet, tippt der Fahrer in seiner App auf **LKW wählen** und dann auf sein Kennzeichen:

![Fahrer-App „Fahrzeug wählen“: LKW-Kacheln mit Kennzeichen; belegte Fahrzeuge sind ausgegraut mit „fährt Mehmet“ usw., eines mit „Werkstatt“, frei ist nur „S-KL 77 Sprinter 3,5 t“](img/fahrer-03-lkw-waehlen.png)

- Ein gewähltes Fahrzeug gehört dem Fahrer, bis er es mit **Fahrzeug abgeben** zurückgibt. So können nie zwei Fahrer denselben LKW wählen.
- Andere Fahrer sehen es ausgegraut mit „fährt …“.
- Bestätigt der Fahrer eine Tour, übernimmt sie LKW und Auflieger, die er gerade gewählt hat. Hat eine laufende Lieferung noch kein Fahrzeug, übernimmt sie es beim nächsten Schritt.
- Wechselt der Fahrer vor dem Beladen, verliert die Tour das Fahrzeug des bisherigen Fahrers (siehe [Regeln beim Fahrerwechsel](#regeln-beim-fahrerwechsel)).

Im Büro haben Sie drei Knöpfe:

- **Freigeben** – löst das Fahrzeug vom Fahrer, z. B. wenn er vergessen hat, es abzugeben.
- **In die Werkstatt** – das Fahrzeug ist nicht mehr wählbar; ein Fahrer, der es gewählt hatte, wird gelöst.
- **Zurück in Betrieb** – das Fahrzeug ist wieder frei.

Auch beim Sperren oder Löschen eines Fahrers werden seine Fahrzeuge freigegeben.

Ist **Fahrer wählen ihr Fahrzeug selbst** ausgeschaltet, teilen Sie LKW und Auflieger direkt in jeder Lieferung zu (Felder **LKW** und **Auflieger**).

---

## 11. Berichte

Unter **Berichte** sehen Sie Leistung, Pünktlichkeit, Standzeiten und Palettenkonto für einen Monat. Oben rechts wählen Sie den Monat: den laufenden und die 23 Monate davor, also zwei Jahre. Die Monate richten sich nach deutscher Zeit. Daneben lädt **CSV** den ganzen Bericht als Tabelle herunter.

![Seite „Berichte“ mit dem Knopf „CSV“, der Monatsauswahl, den Kacheln „Zugestellt“, „Pünktlich“, „Ø Standzeit je Tour“ und „Palettensaldo (offen)“, der Tabelle „Je Fahrer“ und darunter dem Anfang der Tabelle „Je Auftraggeber“](img/buero-16-berichte.png)

Ein Bericht zählt die Lieferungen, die im gewählten Monat zugestellt wurden. Maßgeblich ist der Zeitpunkt von „Bestätigen & abschließen“. Spätere Änderungen wie [Nachbearbeiten](#nachbearbeiten--abgeschlossene-lieferungen) oder ein nachgereichtes Dokument verschieben eine Lieferung nicht in einen anderen Monat.

| Kennzahl | So wird gerechnet |
|---|---|
| **Zugestellt** | Lieferungen, die in diesem Monat zugestellt wurden |
| **Pünktlich** | Anteil der zugestellten Lieferungen, bei denen „Bestätigen & abschließen“ spätestens am Entladedatum bis zur Uhrzeit „bis“ getippt wurde (ohne Uhrzeit: bis 23:59). Lieferungen ohne Entladedatum zählen hier nicht mit. |
| **Ø Standzeit je Tour** | Durchschnitt der Standzeiten aller Touren, für die eine Standzeit erfasst wurde (braucht die Ankunft-Erfassung) |
| **Palettensaldo (offen)** | abgegebene minus mitgenommene EUR-Paletten aus dem Palettentausch. Ein Minuszeichen bedeutet: Ihre Fahrer haben so viele Paletten mehr abgegeben als leer zurückbekommen. |

### Je Fahrer

Die Tabelle **Je Fahrer** zeigt pro Fahrer: **Zugestellt**, **Standzeit gesamt** und **Probleme** (Lieferungen mit gemeldeter Störung). Ist **Auswertungen je Fahrer anzeigen** ausgeschaltet, steht dort nur „Auswertungen je Fahrer sind ausgeschaltet (Einstellungen → Abläufe).“

### Je Auftraggeber

Die Tabelle **Je Auftraggeber** zeigt pro Auftraggeber: **Zugestellt**, **Ø Standzeit je Tour** und **Probleme**. Lieferungen ohne Auftraggeber stehen unter „ohne Auftraggeber“. Die Auftraggeber mit der längsten durchschnittlichen Standzeit stehen oben.

### Je Lade- und Entladestelle

![Berichte, unterer Teil: Tabelle der Lade- und Entladestellen wie „Porsche Logistikzentrum, Ludwigsburg“ mit der Art „Laden“ oder „Entladen“, der Zahl der Touren und der durchschnittlichen Standzeit, längste zuerst; darunter der Hinweis „Standzeiten entstehen aus den Tipps „Angekommen“ und „Aufgeladen/Abgeladen“ – die Grundlage für Standgeld-Rechnungen.“](img/buero-23-berichte-kunden-stellen.png)

Die Tabelle **Je Lade- und Entladestelle** zeigt jede Stelle mit Ort / Firma und Stadt, der **Art** („Laden“ oder „Entladen“), der Zahl der **Touren** und der **Ø Standzeit**. Die Stelle mit der längsten Standzeit steht oben („längste Standzeit zuerst“). So sehen Sie, an welchen Rampen Ihre Fahrer am längsten warten.

- Die Standzeit an einer Stelle läuft von „Angekommen – Ladestelle“ bis „Aufgeladen“ bzw. von „Angekommen – Entladestelle“ bis „Abgeladen“.
- Ohne Ankunft-Tipp gibt es keine Standzeit; die Stelle zählt dann nur bei den Touren und zeigt „–“. Fehlt der Ankunft-Tipp nur bei einem Teil der Touren, steht unter der Zeit z. B. „aus 2 Touren“.
- Auf der Seite stehen die 15 Stellen mit der längsten Standzeit; die CSV-Datei enthält alle.

Die Tabellen **Je Auftraggeber** und **Je Lade- und Entladestelle** enthalten keine Daten zu einzelnen Fahrern. Sie bleiben deshalb sichtbar, auch wenn **Auswertungen je Fahrer anzeigen** aus ist.

### Bericht als CSV

**CSV** lädt den Bericht des gewählten Monats als Datei `bericht-JJJJ-MM.csv` herunter. Sie öffnet sich in Excel (Trennzeichen Semikolon) und enthält die Kennzahlen, die Tabelle je Auftraggeber, alle Lade- und Entladestellen mit Zahl der gemessenen Touren und – nur wenn eingeschaltet – die Tabelle je Fahrer. Standzeiten stehen dort in Minuten. Jeder Download steht im Protokoll (`export.report`). Wie bei allen CSV-Dateien schützt Ladeklar Excel vor eingeschleusten Formeln (siehe [Lieferungen als CSV](#lieferungen-als-csv)).

Für eigene Auswertungen aller Lieferungen laden Sie die Lieferungen als CSV herunter (siehe [Abschnitt 14](#14-datenexport-und-anbieterwechsel)).

---

## 12. Einstellungen

Unter **Einstellungen** steht oben Ihr Firmenname und Ihr **Firmencode** – den brauchen Fahrer, die sich ohne Link anmelden. Admins sehen die Reiter **Firma & Marke · Abläufe · Team · Lizenz · Daten & Datenschutz · API · Mein Konto** und zusätzlich **Berichte** (führt zur Seite Berichte). Disponenten sehen nur **Mein Konto** und **Berichte**.

### Firma & Marke

![Reiter „Firma & Marke“: Logo mit „Logo hochladen“ und „Entfernen“, App-Name „Kaya Fahrer“, zehn Farbfelder für die Markenfarbe, Firmenname, Telefon Disposition, Anschrift und rechts die „Vorschau Fahrer-App“](img/buero-17-einstellungen-marke.png)

| Feld | Wirkung |
|---|---|
| **Logo hochladen** / **Entfernen** | Logo auf Anmeldeseite, Startbildschirm der Fahrer, Handy-Symbol und Mitteilungen. Wird sofort gespeichert. |
| **App-Name (unter dem Handy-Symbol)** | Name der App auf dem Handy und auf der Anmeldeseite (max. 40 Zeichen) |
| **Markenfarbe** | Farbe der Knöpfe und Kopfzeilen; zehn Vorschläge oder eigene Farbe im Farbfeld |
| **Firmenname** | erscheint u. a. auf der Anmeldeseite, die Fahrer über ihren Einladungslink öffnen („Ihre Firma … hat Sie eingeladen“) |
| **Telefon Disposition (für Fahrer)** | diese Nummer ruft der Fahrer mit „Disposition anrufen“ an (unter **Mehr**, die Nummer steht auf dem Knopf); auch „Anrufen“ auf der Tour-Karte wählt sie, wenn bei der Stelle kein „Telefon vor Ort“ steht |
| **Anschrift** | Ihre Firmenanschrift |

Klicken Sie auf **Speichern**. Ihre Fahrer sehen die neue Marke sofort. Unter der Vorschau steht der Link, über den Ihre Fahrer die App öffnen und auf dem Handy installieren (z. B. `…/t/KAYA`).

### Abläufe

![Reiter „Abläufe“ mit Schaltern von „Fahrer wählen ihr Fahrzeug selbst“ bis „Standort beim Statuswechsel speichern“](img/buero-18-ablaeufe.png)

Jeder Schalter wird sofort gespeichert („Gespeichert – gilt sofort für alle Fahrer“).

| Schalter | Was er bewirkt | Voreinstellung |
|---|---|---|
| **Fahrer wählen ihr Fahrzeug selbst** | Fahrer wählen LKW und Auflieger aus dem Pool. Aus: Die Disposition teilt zu. | an |
| **Fahrer dürfen offene Aufträge übernehmen** | Aufträge „offen für alle“ erscheinen bei allen Fahrern zum Übernehmen. Aus: Offene Aufträge warten im Büro, bis Sie sie zuweisen. | an |
| **Lieferschein-Foto ist Pflicht** | Abschließen geht erst, wenn der Lieferschein fotografiert ist. | an |
| **Unterschrift des Empfängers verlangen** | Der Empfänger unterschreibt auf dem Display. | aus |
| **Ankunft an Lade- und Entladestelle erfassen** | Zwei zusätzliche Tipps – ergibt die Standzeit (Grundlage für Standgeld). | aus |
| **Palettentausch beim Abladen abfragen** | Beim Abladen trägt der Fahrer abgegebene und mitgenommene EUR-Paletten ein – für Ihr Palettenkonto. | aus |
| **Fahrsperre während der Fahrt** | Ab ca. 8 km/h werden die Knöpfe verdeckt (§ 23 StVO). Der Standort wird dafür nur auf dem Gerät ausgewertet, nie gespeichert. Unabhängig vom Schalter „Standort beim Statuswechsel speichern“. | an |
| **Standort beim Statuswechsel speichern** | Nur im Moment eines Tipps und nur, wenn der Fahrer zustimmt. Keine Dauerortung, Löschung nach 90 Tagen. | aus |
| **Auswertungen je Fahrer anzeigen** | Lieferungen, Standzeiten und Probleme je Fahrer in den Berichten. Die Tabellen je Auftraggeber und je Stelle bleiben auch ohne diesen Schalter sichtbar. | an |

Darunter stellen Sie zwei Werte ein und klicken auf **Speichern**:

- **Präfix der Buchungsnummer** – bis zu 6 Buchstaben oder Ziffern, z. B. „KAY“ ergibt `KAY-2610-0042`. Die laufende Nummer beginnt jeden Monat bei `0001`.
- **Lieferscheine aufbewahren (Jahre)** – 1 bis 10 Jahre (Voreinstellung 3). Danach werden abgeschlossene Lieferungen samt Fotos automatisch gelöscht. Die Frist zählt ab der Zustellung bzw. Stornierung. Achten Sie auf Ihre gesetzlichen Aufbewahrungsfristen.
  - Ein leeres Feld behält den bisherigen Wert.
  - Andere Werte als ganze Jahre von 1 bis 10 lehnt Ladeklar ab („Bitte 1 bis 10 Jahre angeben – oder das Feld leer lassen.“).
  - Senken Sie den Wert, fragt Ladeklar zuerst nach, z. B. „Aufbewahrung auf 1 Jahr senken? 12 abgeschlossene Lieferungen samt Lieferscheinen und Fotos werden innerhalb einer Stunde endgültig gelöscht.“ Erst mit **Ja, senken** wird gespeichert; **Abbrechen** lässt alles, wie es ist.

So sehen Ihre Fahrer den Palettentausch beim Abladen und die Fahrsperre:

![Fahrer-App „Palettentausch – EUR-Paletten beim Abladen“ mit Zählern für „Abgegeben“ und „Mitgenommen (leer)“ und dem Knopf „Abgeladen – 10 abgegeben · 10 mitgenommen“](img/fahrer-10-palettentausch.png)

![Fahrer-App mit dunkler Abdeckung „Während der Fahrt gesperrt – Bitte anhalten und den Motor ausschalten. Die Knöpfe sind wieder da, sobald der LKW steht (§ 23 StVO).“](img/fahrer-16-fahrsperre.png)

#### Fahrsperre: die Standortfreigabe auf dem Handy

Die Fahrsperre braucht die Standortfreigabe auf dem Handy des Fahrers, damit die App die Geschwindigkeit erkennt. Die App fragt den Fahrer einmal selbst danach – mit einer eigenen Karte auf dem Startbildschirm:

![Fahrer-App mit der Karte „Fahrsperre einschalten“: „Damit die Knöpfe während der Fahrt gesperrt sind, braucht die App die Standortfreigabe. Die Geschwindigkeit wird nur auf diesem Handy ausgewertet – Ihr Standort wird weder gespeichert noch gesendet.“ und den Knöpfen „Standort freigeben“ und „Später“](img/fahrer-17-fahrsperre-freigabe.png)

- **Standort freigeben** öffnet die Frage des Browsers. Erlaubt der Fahrer den Standort, ist die Fahrsperre aktiv.
- **Später** blendet die Karte für 7 Tage aus.
- Die Karte erscheint nur, solange der Browser noch nicht nach dem Standort gefragt hat. Ist **Standort beim Statuswechsel speichern** an und hat der Fahrer darauf noch nicht geantwortet, kommt zuerst die Frage „Standort beim Status-Tipp teilen?“.
- Die Fahrsperre speichert und sendet keine Position. Sie funktioniert unabhängig davon, ob **Standort beim Statuswechsel speichern** an oder aus ist.
- Hat der Fahrer den Standort im Browser blockiert, bleibt die Fahrsperre aus, und die Knöpfe bleiben auch während der Fahrt sichtbar. Unter **Mehr** steht dann „Die Fahrsperre ist aus, weil der Standort im Browser blockiert ist. Bitte in den Browser-Einstellungen erlauben.“

> **Tipp zur Fahrsperre:** Weisen Sie Ihre Fahrer auch mit Fahrsperre darauf hin: Bedienung nur im Stand mit Motor aus.

#### Datenschutz: Standort und Auswertungen je Fahrer

> **Wichtig:** Ladeklar ortet Ihre Fahrer nicht dauerhaft. Mit **Standort beim Statuswechsel speichern** wird der Standort nur im Moment eines Tipps (z. B. „Aufgeladen“ oder „Problem melden“) gespeichert – und nur, wenn der Fahrer in seiner App zugestimmt hat („Standort beim Status-Tipp teilen?“). Er kann die Zustimmung jederzeit unter **Mehr** widerrufen. Gespeicherte Positionen werden nach 90 Tagen gelöscht. Im Verlauf erscheint dann ein Link **Standort**. Zustimmung und Widerruf stehen im Protokoll.

Bevor Sie den Standort oder die **Auswertungen je Fahrer** einschalten:

1. Geben Sie Ihren Fahrern die Datenschutzhinweise. Eine Vorlage liegt in `docs/recht/DATENSCHUTZHINWEISE_FAHRER.md`.
2. Haben Sie einen Betriebsrat, beteiligen Sie ihn. Technische Einrichtungen, die Verhalten oder Leistung überwachen können, sind mitbestimmungspflichtig (§ 87 Abs. 1 Nr. 6 BetrVG). Eine Muster-Betriebsvereinbarung liegt in `docs/recht/BETRIEBSVEREINBARUNG_MUSTER.md`.
3. Ohne Betriebsvereinbarung lassen Sie **Auswertungen je Fahrer anzeigen** im Zweifel aus. Die Kennzahlen für das ganze Unternehmen bleiben trotzdem sichtbar.

Die Muster ersetzen keine Rechtsberatung.

### Team

![Reiter „Team“ mit der Liste „Büro-Zugänge“: Ayşe Kaya (Admin, mit „Sie“ markiert) mit Stift; Jonas Weber (Disponent) mit Stift, „Neues Passwort“, Schloss und Papierkorb; oben rechts der Knopf „Disponent anlegen“](img/buero-19-team.png)

Unter **Büro-Zugänge** stehen alle Admins und Disponenten. Ihr eigener Zugang ist mit „Sie“ markiert.

**Zugang anlegen:**

1. Klicken Sie auf **Disponent anlegen**. Es öffnet sich „Büro-Zugang anlegen“.
2. Tragen Sie **Name \*** und **E-Mail \*** ein und wählen Sie **Rolle** (Disponent oder Admin) und **Sprache** (eine der acht Sprachen: Deutsch, English, Polski, Română, Čeština, Türkçe, Русский, Українська).
3. Klicken Sie auf **Anlegen**. Ladeklar zeigt das **Startpasswort** – nur dieses eine Mal. Geben Sie es der Person sicher weiter. Beim ersten Anmelden muss sie ein eigenes Passwort vergeben (siehe [Schritt 1](#schritt-1-anmelden-und-passwort-ändern)).

**Zugang bearbeiten:**

1. Klicken Sie in der Zeile auf den **Stift**. Es öffnet sich „Büro-Zugang bearbeiten“.
2. Ändern Sie **Name**, **E-Mail**, **Rolle** oder **Sprache**.
3. Klicken Sie auf **Speichern**.

Ändern Sie die E-Mail, meldet sich die Person künftig mit der neuen E-Mail an. Jede Büro-E-Mail darf es auf der ganzen Plattform nur einmal geben – auch bei anderen Unternehmen („Diese E-Mail hat schon einen Zugang.“). Ihre eigene Rolle können Sie nicht ändern („Ihre eigene Rolle kann nur ein anderer Admin ändern.“).

Bei jedem anderen Zugang finden Sie außerdem:

- **Neues Passwort** – erzeugt ein neues Startpasswort, meldet die Person auf allen Geräten ab und schaltet ihre Zwei-Faktor-Anmeldung aus. So helfen Sie auch jemandem, der sein Handy mit der Authenticator-App verloren hat. Beim nächsten Anmelden muss die Person ein eigenes Passwort vergeben.
- das **Schloss** – sperrt den Zugang (bzw. entsperrt ihn wieder). Die Sitzung endet sofort.
- den **Papierkorb** – löscht den Zugang (siehe [Person löschen](#person-löschen)).

Ihren eigenen Zugang können Sie nicht sperren und nicht löschen. Wie viele Büro-Zugänge Sie anlegen können, hängt vom Tarif ab (siehe [Abschnitt 15](#15-lizenz-und-tarif)).

### Lizenz

![Reiter „Lizenz“: „Ihr Tarif – Ladeklar Flotte“ mit Status „Aktiv“, Preis mit Grundpreis, Zahlweise, Fahrer, Fahrzeuge und Büro-Zugänge jeweils „… von …“, Speicher mit Balken, die Knöpfe „Tarif wechseln anfragen“ und „Kündigen“, darunter die drei Tarife Start, Flotte und Premium](img/buero-20-lizenz.png)

Hier sehen Sie (nur als Admin):

- Ihren Tarif und den Status (Testphase, Aktiv, Gesperrt, Abgelaufen oder Gekündigt)
- **Preis:** den Monatspreis netto mit seinen Teilen (Grundpreis, zusätzliche Fahrer, Store-App). Bei jährlicher Zahlung steht darunter „Jährlich im Voraus: … netto (10 × Monatspreis)“.
- **Zahlweise:** monatlich oder jährlich
- **Fahrer**, **Fahrzeuge** und **Büro-Zugänge:** wie viele Sie nutzen und wie viele Ihr Tarif umfasst, z. B. „6 von 15“. Liegen Sie darüber, steht dort „über dem Tarif“.
- **Speicher:** wie viel Speicher Ihre Fotos und PDF-Dateien belegen (siehe [Speicher](#speicher))
- falls zutreffend **Test bis** oder **Laufzeit bis**, jeweils mit Jahr

Darunter stehen die Knöpfe **Tarif wechseln anfragen** und **Kündigen** (siehe [Tarif wechseln oder kündigen](#tarif-wechseln-oder-kündigen)) und alle Tarife zum Vergleich. Für weitere Fahrer-Plätze genügt eine kurze Nachricht an Ihren Anbieter. Mehr in [Abschnitt 15](#15-lizenz-und-tarif).

### Daten & Datenschutz

![Reiter „Daten & Datenschutz“ mit „Datenexport“ (Alles als ZIP (mit Lieferscheinen), Alles als JSON, Lieferungen als CSV), „Support-Zugriff“ (Für 24 Stunden freigeben) und „Protokoll“ mit Einträgen wie „user.reset“, „delivery.create“ und „login“](img/buero-21-daten.png)

- **Datenexport:** **Alles als ZIP (mit Lieferscheinen)**, **Alles als JSON** und **Lieferungen als CSV** – siehe [Abschnitt 14](#14-datenexport-und-anbieterwechsel). Jeder Download steht im Protokoll.
- **Support-Zugriff:** Der Anbieter sieht Ihre Lieferdaten nicht. Mit **Für 24 Stunden freigeben** erteilen Sie eine befristete Freigabe. Danach steht dort „freigegeben bis …“, und mit **Jetzt beenden** nehmen Sie die Freigabe vorzeitig zurück. Freigabe und Ende werden protokolliert (`support.grant`, `support.revoke`). In Version 1.0 wird die Freigabe nur gespeichert und protokolliert: Sie öffnet dem Anbieter keinen Zugang zu Ihren Daten, und seine Konsole zeigt die Freigabe nicht an. Sagen Sie Ihrem Anbieter also Bescheid, wenn Sie freigegeben haben.
- **Protokoll:** die letzten 25 Einträge mit Zeit und Person. Die Einträge sind technische Kurznamen:

| Eintrag | Bedeutung |
|---|---|
| `login` / `login.failed` | Anmeldung / fehlgeschlagene Anmeldung eines Ihrer Zugänge |
| `delivery.create` / `delivery.update` / `delivery.cancel` | Lieferung angelegt / geändert / storniert |
| `user.create` / `user.update` | Zugang (Fahrer oder Büro) angelegt / geändert |
| `user.reset` | neue PIN bzw. neues Passwort erzeugt |
| `user.reset_by_licensor` | Ihr Anbieter hat ein neues Startpasswort für Ihren Admin-Zugang erzeugt |
| `user.activate` / `user.deactivate` | Zugang entsperrt / gesperrt |
| `user.delete` | Person gelöscht (anonymisiert) |
| `vehicle.create` / `vehicle.update` / `vehicle.delete` / `vehicle.release` | Fahrzeug angelegt / geändert / entfernt / freigegeben |
| `company.update` | Firma, Marke oder Abläufe geändert |
| `password.change` | eigenes Passwort geändert |
| `2fa.enable` / `2fa.disable` | Zwei-Faktor-Anmeldung eingeschaltet / ausgeschaltet |
| `geo.consent` / `geo.withdraw` | Fahrer hat dem Standort beim Tipp zugestimmt / widersprochen |
| `support.grant` / `support.revoke` | Support-Zugriff freigegeben / beendet |
| `apikey.rotate` | API-Schlüssel erzeugt |
| `data.export` | Datenbestand für einen Export (ZIP oder JSON) zusammengestellt |
| `export.zip` / `export.json` / `export.csv` / `export.report` | Download: ZIP, JSON, Lieferungen als CSV, Bericht als CSV |
| `tenant.plan_request` / `tenant.cancel_request` | Tarifwechsel bzw. Kündigung beim Anbieter angefragt |

Zu den Einträgen speichert Ladeklar die IP-Adresse des Geräts – auch bei Anmeldungen und Fehlversuchen. Die Liste zeigt sie nicht; sie steht im Export (ZIP oder JSON). Nach 90 Tagen entfernt Ladeklar die IP-Adressen aus dem Protokoll – ebenso eine eingetippte Handynummer, mit der kein Fahrer gefunden wurde.

### API

![Reiter „API“ mit der Überschrift „REST-API“ und dem Hinweis „Die API ist im Tarif Premium enthalten.“](img/buero-22-api.png)

Mit der REST-API legen Sie Lieferungen automatisch aus Ihrem TMS oder Ihrer Buchhaltung an und fragen sie ab. Sie ist im Tarif **Premium** enthalten; in anderen Tarifen steht hier „Die API ist im Tarif Premium enthalten.“

Im Tarif Premium:

1. Klicken Sie auf **Schlüssel erzeugen** (später **Neuen Schlüssel erzeugen**).
2. Kopieren Sie den Schlüssel (beginnt mit `lk_`). **Der Schlüssel wird nur jetzt angezeigt.** Verlassen Sie den Reiter, ist er nicht mehr zu sehen.
3. Geben Sie den Schlüssel Ihrem IT-Dienstleister. Der Reiter zeigt Beispielaufrufe.

Danach zeigt der Reiter nur noch `lk_…` mit den letzten 4 Zeichen und den Hinweis „Ein Schlüssel ist aktiv. Gespeichert sind nur die letzten 4 Zeichen – den ganzen Schlüssel kann niemand mehr anzeigen. …“. Ladeklar speichert vom Schlüssel nur eine Prüfsumme (Hash). Ist er verloren, erzeugen Sie einen neuen. Ein neuer Schlüssel macht den alten sofort ungültig.

| Aufruf | Wirkung |
|---|---|
| `GET /api/v1/deliveries` | Lieferungen abfragen (ohne `tab`: alle, neueste zuerst). Optional: `tab`, `q`, `limit` (Voreinstellung 300, höchstens 1.000), `offset` zum Blättern und `updatedSince` (nur seit diesem Zeitpunkt geänderte). Die Antwort nennt im Kopf `X-Total-Count` die Gesamtzahl. |
| `GET /api/v1/deliveries/{id}` | eine Lieferung abfragen |
| `POST /api/v1/deliveries` | Lieferung anlegen |
| `PATCH /api/v1/deliveries/{id}` | Lieferung ändern |

Der Schlüssel wird als `Authorization: Bearer lk_…` mitgeschickt. Lieferungen aus der API verhalten sich wie im Büro angelegte – inklusive Mitteilungen an die Fahrer. Die API antwortet nur, solange Ihre Lizenz aktiv oder in der Testphase ist und Sie den Tarif Premium haben.

### Mein Konto

Diesen Reiter sehen Admins und Disponenten.

- **Name, E-Mail, Rolle:** Name und E-Mail ändert ein Admin unter **Team**.
- **Sprache** der Büro-Oberfläche: acht Knöpfe für Deutsch, English, Polski, Română, Čeština, Türkçe, Русский und Українська.
- **Passwort ändern:** **Aktuelles Passwort**, **Neues Passwort (mind. 10 Zeichen)**, dann **Passwort ändern**. Auf allen anderen Geräten werden Sie danach abgemeldet. Dieses Gerät bleibt angemeldet.
- **Zwei-Faktor-Anmeldung** (siehe unten)
- **Mitteilungen:** der Schalter **Push-Mitteilungen in diesem Browser**. Ist er an, kommen Bestätigungen, Störungen und Notizen der Fahrer auch bei geschlossenem Browser. Der Schalter gilt nur für diesen Browser. Haben Sie die Mitteilungen im Browser blockiert, ist er ausgegraut („Mitteilungen wurden im Browser blockiert“).
- **Abmelden**

#### Zwei-Faktor-Anmeldung

Mit der Zwei-Faktor-Anmeldung braucht jede Anmeldung zusätzlich einen 6-stelligen Code aus einer Authenticator-App auf Ihrem Handy (z. B. Google oder Microsoft Authenticator). Wer nur Ihr Passwort kennt, kommt dann nicht hinein.

Einschalten:

1. Klicken Sie unter **Zwei-Faktor-Anmeldung** auf **Einrichten**.
2. Scannen Sie den QR-Code mit der Authenticator-App. Auf dem Handy selbst tippen Sie stattdessen **In der Authenticator-App öffnen**. Geht beides nicht, tippen Sie den Schlüssel unter „Oder den Schlüssel von Hand eingeben:“ in die App ein.
3. Tragen Sie unter **2. Den 6-stelligen Code aus der App eingeben** den aktuellen Code ein und klicken Sie auf **Einschalten**. Es erscheint „Zwei-Faktor-Anmeldung ist an“.

Ab jetzt fragt die Anmeldung nach dem Passwort nach dem **Code aus der Authenticator-App**. Die App zeigt alle 30 Sekunden einen neuen Code. Jeder Code gilt nur für eine Anmeldung. Ein falscher Code zählt als Fehlversuch („Der Code stimmt nicht. Bitte den aktuellen Code aus der App eingeben.“).

Ausschalten: Tragen Sie unter **Zum Ausschalten: aktuelles Passwort** Ihr Passwort ein und klicken Sie auf **Ausschalten**.

> **Wichtig:** Handy verloren? Ein Admin erzeugt Ihnen unter **Team** mit **Neues Passwort** ein neues Startpasswort; damit ist die Zwei-Faktor-Anmeldung aus. Sind Sie der einzige Admin, hilft Ihr Anbieter mit **Admin-Passwort zurücksetzen**. Danach richten Sie die Zwei-Faktor-Anmeldung neu ein.

---

## 13. Mitteilungen und Push

### Die Glocke

Oben rechts zeigt die **Glocke** die Zahl ungelesener Mitteilungen. Ein Klick öffnet die Liste **Mitteilungen**; ein Klick auf eine Mitteilung öffnet die Lieferung. **Alle gelesen** setzt den Zähler zurück.

![Liste „Mitteilungen“ mit Einträgen wie „Zugestellt · KAY-2610-0015“, „Sven Krause: Entladen“, „Notiz von Sven Krause“ und der rot markierten Meldung „Problem: Stau / Verspätung“](img/buero-03-mitteilungen.png)

Ist die App geöffnet, erscheint jede neue Mitteilung zusätzlich kurz oben rechts, mit Ton. Dringende Mitteilungen (Problem, Zurückgegeben) sind rot und bleiben länger stehen.

### Wer bekommt welche Mitteilung?

| Ereignis | Büro (alle aktiven Admins und Disponenten) | Fahrer |
|---|---|---|
| Lieferung zugewiesen | – | „Neuer Auftrag …“ (dringend, wenn „Eilig“) |
| Lieferung offen für alle | – | „Offener Auftrag“ an alle aktiven Fahrer (nur wenn Fahrer offene Aufträge übernehmen dürfen) |
| Lieferung geändert | – | „Auftrag geändert“ – nur wenn sich Orte, Zeiten, Ware, Hinweise, Fahrzeug oder „Eilig“ ändern |
| Lieferung storniert | – | „Auftrag storniert“ mit Grund (dringend) |
| Fahrer gewechselt | – | bisheriger Fahrer: „Auftrag storniert“; neuer Fahrer: „Neuer Auftrag …“ |
| Fahrer bestätigt oder tippt einen Schritt | „Name: Status“ | – |
| Fahrer schließt ab | „Zugestellt · … Lieferschein liegt vor“ bzw. „Zugestellt · … ohne Lieferschein“ | – |
| Fahrer meldet Problem | „Problem: …“ (dringend) | – |
| Büro markiert Problem als erledigt | – | „Problem erledigt“ |
| Notiz | „Notiz von Fahrer“ | „Notiz von Büro-Mitarbeiter“ |
| Fahrer gibt Tour zurück | „Auftrag zurückgegeben“ (dringend) | – |
| Fahrer nimmt Schritt zurück | „Schritt zurückgenommen“ | – |
| Büro setzt Schritt für den Fahrer | – | „Auftrag geändert“ |
| Ein Zugang ist nach 15 Fehlversuchen für 24 Stunden gesperrt | „Zugang gesperrt: Name“ (an alle anderen Admins und Disponenten) | – |
| Speicher zu 80 % bzw. 100 % belegt | nur Admins: „Speicher zu 80 % belegt“ bzw. „Speicher voll“ (dringend) | – |

Mitteilungen an Fahrer kommen in der Sprache des Fahrers. Schritte, die ein Fahrer ohne Netz getippt hat, melden sich erst, wenn sein Handy sie nachsendet. Jeder Nutzer behält die letzten 100 Mitteilungen; ältere als 90 Tage werden gelöscht.

### Push-Mitteilungen ein- und ausschalten

Push-Mitteilungen kommen auch, wenn der Browser bzw. die App geschlossen ist. Sie gelten je Gerät und Browser.

- **Im Büro:** Auf der Live-Übersicht erscheint „Push-Mitteilungen einschalten – dann sehen Sie jeden Status sofort, auch bei geschlossenem Browser.“ Klicken Sie auf **Einschalten** und erlauben Sie die Mitteilungen im Browser. Ein- und ausschalten können Sie sie jederzeit unter **Einstellungen → Mein Konto** mit dem Schalter **Push-Mitteilungen in diesem Browser**.
- **Beim Fahrer:** In der Fahrer-App unter **Mehr → Mitteilungen** mit dem Schalter **Push-Mitteilungen auf diesem Handy**. Bei der ersten Einschaltung fragt der Browser um Erlaubnis.
- Nach einer Passwortänderung, einer neuen PIN oder einem neuen Passwort meldet Ladeklar die Push-Mitteilungen der Person ab. Beim nächsten Start der App schaltet die App sie von selbst wieder ein, wenn der Browser sie erlaubt und niemand den Schalter ausgeschaltet hat.

> **Tipp:** Ist der Schalter ausgegraut und steht dort „Mitteilungen wurden im Browser blockiert“, wurden die Mitteilungen früher einmal abgelehnt. Erlauben Sie sie in den Website-Einstellungen des Browsers wieder. Auf dem iPhone kommen Push-Mitteilungen nur, wenn die App über „Zum Home-Bildschirm“ installiert wurde.

---

## 14. Datenexport und Anbieterwechsel

Ihre Daten gehören Ihnen. Sie können sie jederzeit mitnehmen – auch wenn die Lizenz gesperrt, abgelaufen oder gekündigt ist.

### Alles als ZIP (mit Lieferscheinen)

**Wo:** **Einstellungen → Daten & Datenschutz → Alles als ZIP (mit Lieferscheinen)** (nur Admin).

Das ist der vollständige Export: alle Daten und jede Datei. Ladeklar stellt das ZIP beim Herunterladen zusammen; bei vielen Fotos dauert das einen Moment. Die Datei heißt z. B. `ladeklar-export-KAYA-2026-10-17.zip` und enthält:

| Im ZIP | Inhalt |
|---|---|
| `daten.json` | alle Daten wie bei **Alles als JSON**; unter `files[].path` steht zu jeder Datei der Pfad im ZIP und die zugehörige Lieferung |
| `lieferungen.csv` | die Lieferungen als Tabelle, wie bei **Lieferungen als CSV** |
| `dateien/` | jedes Lieferschein-Foto, jede PDF-Datei, jedes CMR- und Schadensfoto, jede Unterschrift sowie Logo und Handy-Symbol, geordnet nach Art (z. B. `dateien/pod/` für Lieferscheine, `dateien/cmr/` für CMR, `dateien/signature/` für Unterschriften). Der Dateiname beginnt mit dem Tag des Hochladens (deutsche Zeit). |
| `LIESMICH.txt` | kurze Erklärung des Inhalts |

Jeder Export steht im Protokoll (`data.export` und `export.zip`).

### Lieferungen als CSV

**Wo:** **Lieferungen → CSV** (Admin und Disponent) oder **Einstellungen → Daten & Datenschutz → Lieferungen als CSV**.

Die Datei öffnet sich direkt in Excel (Trennzeichen Semikolon). Sie enthält **alle** Lieferungen Ihres Unternehmens, nach Ladedatum sortiert, neueste zuerst, mit diesen Spalten:

Buchungsnummer · Status · Auftraggeber · Referenz · Route · Ladeort · Ladedatum · Entladeort · Entladedatum · Fahrer · Kennzeichen · Auflieger · Ware · Paletten · Gewicht kg · Standzeit min · Empfänger · Lieferscheine (Anzahl) · Zugestellt am

- **Zugestellt am** ist der Zeitpunkt von „Bestätigen & abschließen“ (deutsche Zeit). Spätere Änderungen verschieben ihn nicht.
- **Schutz vor Formeln:** Beginnt ein Text mit `=`, `+`, `-`, `@` oder einem Tabulator, setzt Ladeklar ein Hochkomma (`'`) davor. So führt Excel keine eingeschleusten Formeln aus, zum Beispiel aus einem Auftraggeber-Namen. Zahlen bleiben Zahlen. Sie müssen dafür nichts tun. Dasselbe gilt für den Bericht als CSV und für `lieferungen.csv` im ZIP.
- Jeder Download steht im Protokoll (`export.csv`).

### Alles als JSON

**Wo:** **Einstellungen → Daten & Datenschutz → Alles als JSON** (nur Admin).

Die Datei enthält den vollständigen Datenbestand Ihres Unternehmens in maschinenlesbarer Form: Firmendaten und Einstellungen, alle Zugänge (ohne Passwörter, PINs und Zwei-Faktor-Schlüssel), Fahrzeuge, Lieferungen mit Verlauf und Notizen, die Liste aller Dateien und das Protokoll. Jeder Export wird im Protokoll vermerkt (`data.export` und `export.json`).

> **Wichtig:** Die Fotos und PDF-Dateien selbst stecken nicht in der JSON-Datei, dort steht nur ihre Liste. Brauchen Sie die Dateien, nehmen Sie **Alles als ZIP (mit Lieferscheinen)**.

### Anbieterwechsel – so gehen Sie vor

1. Laden Sie **Alles als ZIP (mit Lieferscheinen)** herunter. Darin stecken alle Daten, die CSV-Datei und alle Dateien.
2. Öffnen Sie das ZIP und prüfen Sie, ob Lieferscheine und Daten vollständig sind.
3. Dann kündigen: **Einstellungen → Lizenz → Kündigen** (siehe [Tarif wechseln oder kündigen](#tarif-wechseln-oder-kündigen)). Ihr Anbieter bestätigt die Kündigung und das Vertragsende.

Nach der Kündigung kann sich nur noch der Admin anmelden – zum Ansehen und Exportieren, bis Ihr Anbieter die Daten endgültig löscht. Oben steht dann „Ihr Vertrag ist gekündigt. Sie können alle Daten bis zur Löschung ansehen und exportieren (Einstellungen → Daten & Datenschutz), aber nichts mehr ändern.“ Disponenten und Fahrer können sich nicht mehr anmelden.

Ihr Anbieter kann die Daten eines gekündigten Unternehmens endgültig löschen; dazu muss er Ihren Firmencode eintippen. Danach sind alle Lieferungen, Lieferscheine, Fotos, Zugänge, Fahrzeuge und das Protokoll weg, und niemand kann sich mehr anmelden.

### Löschfristen

| Was | Wird gelöscht nach |
|---|---|
| Abgeschlossene Lieferungen mit Lieferscheinen, Fotos und Unterschrift | der eingestellten Aufbewahrung (1–10 Jahre, **Einstellungen → Abläufe**), gezählt ab der Zustellung bzw. Stornierung |
| Hochgeladene Dateien, die zu keiner Lieferung und zu keinem Logo gehören | 24 Stunden |
| Gespeicherte Standorte beim Statuswechsel | 90 Tagen |
| Mitteilungen | 90 Tagen |
| IP-Adressen im Protokoll | 90 Tagen |
| Protokoll | 3 Jahren |
| Daten einer gelöschten Person | sofort (anonymisiert, siehe [Person löschen](#person-löschen)) |
| Alle Daten nach einer Kündigung | sobald Ihr Anbieter sie endgültig löscht |

---

## 15. Lizenz und Tarif

### Tarife

Alle Preise netto zzgl. 19 % USt., je Monat.

| | **Start** | **Flotte** | **Premium** |
|---|---|---|---|
| Preis | 49 € | 129 € | 299 € |
| Fahrer inklusive | 3 | 15 | 40 |
| jeder weitere Fahrer | – (Tarifwechsel) | 7 € | 6 € |
| Fahrzeuge (LKW und Auflieger) | 6 | 40 | unbegrenzt |
| Disponenten-Zugänge (zusätzlich zum Admin) | 1 | 5 | unbegrenzt |
| Lieferschein-Speicher | 5 GB | 50 GB | 250 GB |
| Eigenes Logo, Farben, App-Name | ja | ja | ja |
| Eigene Subdomain / eigene Domain | – | Subdomain | eigene Domain |
| REST-API, SLA 99,5 % | – | – | ja |

Zusatz zu Premium: **White-Label-App im App Store und bei Google Play** mit Ihrem Namen und Symbol – 1.990 € einmalig plus 99 € je Monat. Diesen Zusatz gibt es nur im Tarif Premium.

Neue Kunden testen in der Regel 30 Tage kostenlos. Bei jährlicher Zahlung sind zwei Monate geschenkt.

### Grenzen des Tarifs

Ladeklar prüft die Grenzen beim Anlegen:

- **Fahrer:** Es zählen nur aktive Fahrer – gesperrte und gelöschte nicht. Ist das Limit erreicht, erscheint z. B. „Ihr Tarif „Flotte“ umfasst 15 Fahrer. Für weitere Fahrer bitte Tarif erweitern.“
- **Fahrzeuge:** Es zählen alle Fahrzeuge im Pool (entfernte nicht).
- **Büro-Zugänge:** Admin plus die Zahl der Disponenten aus der Tabelle.

Wechselt Ihr Anbieter Sie in einen kleineren Tarif, obwohl Sie mehr Fahrer, Fahrzeuge oder Büro-Zugänge nutzen, bleiben alle bestehen. Unter **Fahrer**, **Fahrzeuge** bzw. **Einstellungen → Team** steht dann ein roter Hinweis, z. B. „Mehr aktive Fahrer (8) als Ihr Tarif umfasst (3). Neue Fahrer gehen erst wieder, wenn Sie Fahrer sperren oder den Tarif wechseln.“ Admins sehen daneben **Tarif ansehen**. Neue Fahrer, Fahrzeuge und Büro-Zugänge lassen sich erst wieder anlegen, wenn die Zahl unter der Grenze liegt. Eigene Domains entfallen, wenn der neue Tarif keine hat.

Für mehr Plätze genügt eine Nachricht an Ihren Anbieter oder eine Anfrage unter **Tarif wechseln anfragen**.

### Speicher

Jeder Tarif hat einen Speicher für Lieferschein-Fotos, PDF-Dateien, Schadensfotos, Unterschriften und Ihr Logo (Start 5 GB, Flotte 50 GB, Premium 250 GB).

- Unter **Einstellungen → Lizenz** steht in der Zeile **Speicher** z. B. „29 KB von 50 GB belegt (0 %)“ mit einem Balken.
- Ab 80 % wird der Balken gelb, und dort steht „Der Speicher ist fast voll. …“. Alle Admins bekommen einmal die Mitteilung „Speicher zu 80 % belegt“.
- Bei 100 % wird der Balken rot. Auf jeder Seite der Disposition steht dann „Der Speicher Ihres Tarifs ist voll. Bitte alte Lieferscheine exportieren und löschen oder den Tarif wechseln.“ Alle Admins bekommen die dringende Mitteilung „Speicher voll“.
- Ist der Speicher voll, lehnt Ladeklar jedes neue Foto und jede neue Datei ab – auch die Lieferschein-Fotos Ihrer Fahrer. Ist **Lieferschein-Foto ist Pflicht** an, können Ihre Fahrer dann nicht abschließen.
- Sinkt die Belegung unter 75 %, kommen die Mitteilungen beim nächsten Erreichen wieder.

Platz schaffen Sie so: Laden Sie zuerst **Alles als ZIP (mit Lieferscheinen)** herunter. Senken Sie dann unter **Einstellungen → Abläufe** die Aufbewahrung; Ladeklar löscht die älteren abgeschlossenen Lieferungen samt Dateien innerhalb einer Stunde. Oder bitten Sie Ihren Anbieter um einen größeren Tarif. Einzelne Dokumente einer abgeschlossenen Lieferung lassen sich nicht löschen.

### Tarif wechseln oder kündigen

Tarifwechsel und Kündigung schickt der Admin als Anfrage an Ihren Anbieter. Ihr Anbieter sieht die Anfrage sofort in seiner Konsole und setzt sie um.

**Tarif wechseln anfragen:**

1. **Einstellungen → Lizenz → Tarif wechseln anfragen**.
2. Wählen Sie unter **Gewünschter Tarif** den neuen Tarif. Nutzen Sie mehr Fahrer, Fahrzeuge oder Büro-Zugänge, als der Tarif umfasst, warnt Ladeklar: „Für diesen Tarif sind es zu viele: … Vor dem Wechsel bitte sperren oder entfernen.“
3. Schreiben Sie bei Bedarf eine **Nachricht an Ihren Anbieter (optional)**.
4. Klicken Sie auf **Anfrage senden**. Oben erscheint „Anfrage gesendet“.

Bis der Anbieter den Tarif ändert, steht auf der Seite „Tarifwunsch „…“ gesendet am …. Ihr Anbieter meldet sich.“

**Kündigen:**

1. **Einstellungen → Lizenz → Kündigen**.
2. Tragen Sie bei Bedarf einen **Grund der Kündigung (optional)** ein und klicken Sie auf **Weiter**.
3. Lesen Sie die Rückfrage „Vertrag wirklich kündigen? …“ und klicken Sie auf **Kündigung senden**. Mit **Abbrechen** wird nichts gesendet.

Danach steht dort „Kündigung gesendet am …. Ihr Anbieter bestätigt das Vertragsende. Bis dahin läuft alles weiter.“ Ein zweites **Kündigen** gibt es dann nicht. Erst wenn Ihr Anbieter die Kündigung umsetzt, ändert sich der Status auf „Gekündigt“. Laden Sie vorher Ihre Daten herunter (siehe [Anbieterwechsel](#anbieterwechsel--so-gehen-sie-vor)).

Beide Anfragen stehen im Protokoll (`tenant.plan_request`, `tenant.cancel_request`). Sie gehen in jedem Status außer „Gekündigt“.

### Was der Lizenz-Status bedeutet

| Status | Büro | Fahrer |
|---|---|---|
| **Testphase** | alle Funktionen; ab 10 Tagen vor Ende erscheint ein Hinweis „Testphase: noch … Tage“ | alle Funktionen |
| **Aktiv** | alle Funktionen | alle Funktionen |
| **Abgelaufen** (Test oder Laufzeit vorbei) | anmelden, ansehen und exportieren – aber nichts ändern | abgemeldet, keine Anmeldung möglich |
| **Gesperrt** (z. B. Zahlung offen) | anmelden, ansehen und exportieren – aber nichts ändern | abgemeldet, keine Anmeldung möglich |
| **Gekündigt** | nur der Admin kann sich anmelden: ansehen und exportieren, nichts ändern; Disponenten werden abgemeldet und können sich nicht mehr anmelden | abgemeldet, keine Anmeldung möglich |

Bei „Abgelaufen“ und „Gesperrt“ steht oben der Hinweis „Ihr Zugang ist gesperrt. Daten können angesehen und exportiert werden. Bitte melden Sie sich beim Anbieter.“ Wer dann etwas ändern will, sieht „Die Lizenz ist nicht aktiv. Daten können angesehen und exportiert, aber nicht geändert werden.“ Nach einer Kündigung lautet die Meldung „Der Vertrag ist gekündigt. Daten können bis zur Löschung angesehen und exportiert, aber nicht geändert werden.“ Ein Disponent, der sich nach der Kündigung anmelden will, sieht „Der Zugang dieses Unternehmens ist beendet. Nur der Admin kann die Daten noch exportieren.“

Fahrer werden bei „Gesperrt“, „Abgelaufen“ und „Gekündigt“ abgemeldet, sobald ihre App das nächste Mal mit dem Server spricht. Wer sich dann anmelden will, sieht „Der Zugang ist zurzeit gesperrt. Bitte die Disposition anrufen.“ Zeigt die App noch Daten aus ihrem Speicher, steht oben „Zugang gesperrt – bitte die Disposition anrufen.“ Schritte, die ein Fahrer noch ohne Netz getippt hat, bleiben auf seinem Handy und gehen erst nach einer neuen Anmeldung raus. Auch die REST-API antwortet in diesen Status nicht mehr.

In jedem Status möglich bleiben: Personen sperren und löschen (siehe [Person löschen](#person-löschen)), Support-Freigabe, eigenes Passwort, Sprache und Zwei-Faktor-Anmeldung ändern, Daten exportieren. Tarifwechsel und Kündigung anfragen geht in jedem Status außer „Gekündigt“.

---

## 16. Häufige Fragen

**Ein Fahrer hat seine PIN vergessen.**
Klicken Sie unter **Fahrer** auf seiner Karte auf **Neue PIN & Einladung** und schicken Sie ihm die Einladung per WhatsApp oder SMS. Die alte PIN gilt sofort nicht mehr.

**Ich habe mein Passwort vergessen.**
Ein Admin erzeugt Ihnen unter **Einstellungen → Team** mit **Neues Passwort** ein neues Startpasswort. Sind Sie der einzige Admin, wenden Sie sich an Ihren Anbieter: Er kann für Ihren Admin-Zugang ein neues Startpasswort erzeugen (im Protokoll: `user.reset_by_licensor`). In beiden Fällen vergeben Sie beim nächsten Anmelden ein eigenes Passwort.

**Ich habe mein Handy mit der Authenticator-App verloren.**
Dann fehlt Ihnen der Code für die Zwei-Faktor-Anmeldung. Ein Admin erzeugt Ihnen unter **Einstellungen → Team** mit **Neues Passwort** ein neues Startpasswort; damit ist die Zwei-Faktor-Anmeldung aus. Sind Sie der einzige Admin, hilft Ihr Anbieter mit **Admin-Passwort zurücksetzen** – das schaltet die Zwei-Faktor-Anmeldung ebenfalls aus. Richten Sie sie danach unter **Mein Konto** neu ein.

**Ein Fahrer kommt nicht in die App.**
Achten Sie auf die Meldung, die er sieht:

- „Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.“ – nach fünf falschen PINs ist der Zugang 15 Minuten gesperrt, nach zehn eine Stunde („… in einer Stunde …“), ab fünfzehn 24 Stunden. Warten Sie ab oder erzeugen Sie mit **Neue PIN & Einladung** eine neue PIN; das hebt jede Sperre sofort auf.
- „Firmencode, Telefonnummer oder PIN ist falsch.“ – prüfen Sie Firmencode (steht unter **Einstellungen**) und Handynummer auf seiner Fahrerkarte. Ist der Fahrer dort als „gesperrt“ markiert, kann er sich ebenfalls nicht anmelden.
- „Einladung abgelaufen – bitte neue Einladung im Büro anfordern“ – der Einladungslink wurde schon benutzt oder ist älter als 14 Tage. Der Fahrer meldet sich darunter mit Firmencode, Handynummer und PIN an, oder Sie schicken mit **Neue PIN & Einladung** einen neuen Link.
- „Der Zugang ist zurzeit gesperrt. Bitte die Disposition anrufen.“ – Ihre Lizenz ist nicht aktiv (siehe [Abschnitt 15](#15-lizenz-und-tarif)).

**Ein LKW wird als belegt angezeigt.**
Ein anderer Fahrer hat ihn gewählt und nicht wieder abgegeben („fährt: Name“). Klicken Sie unter **Fahrzeuge** auf der Karte auf **Freigeben**. Steht dort „Werkstatt“, klicken Sie auf **Zurück in Betrieb**.

**Ein Fahrer ist im Funkloch.**
Der Fahrer tippt einfach weiter – bis zum Abschluss mit Lieferschein-Foto und Unterschrift. Die App zeigt „Offline – Ihre Schritte werden gespeichert und automatisch gesendet.“ Auch nach einem Neustart des Handys öffnet sich die App mit seinen Touren. Sobald wieder Netz da ist, sendet sie Schritte, Fotos, Unterschrift, Notizen und Problemmeldungen in der Reihenfolge, in der er getippt hat. Sie sehen die Meldungen dann mit Verzögerung, aber mit der Uhrzeit des Tipps. Abmelden kann sich der Fahrer erst, wenn alles gesendet ist. Einzelheiten in [Abschluss ohne Netz](#abschluss-ohne-netz).

**Ein Fahrer hat den falschen Schritt getippt.**
Innerhalb von 2 Minuten kann er selbst **Rückgängig** tippen – aber nur mit Netz und nur, wenn er auch beim Tippen Netz hatte. Danach lässt sich der Schritt nicht mehr zurücknehmen – auch nicht im Büro. Halten Sie den Fehler mit einer Notiz in der Lieferung fest; der Verlauf zeigt alle Zeiten.

**Der Lieferschein hat mehrere Seiten oder liegt als PDF vor.**
Der Fahrer fotografiert jede Seite einzeln (**Weitere Seite**) oder wählt eine PDF-Datei. Im Büro laden Sie zusätzliche Seiten oder PDFs in der Lieferung mit **Hinzufügen** hoch – auch nach der Zustellung.

**Ein Fahrer ruft an und sagt, er hat abgeladen.**
Öffnen Sie die Lieferung und klicken Sie auf **Für Fahrer setzen: Abgeladen** (siehe [Abschnitt 8](#8-für-fahrer-setzen--wenn-ein-fahrer-anruft)). Mit Ankunft-Erfassung steht dort zuerst „Für Fahrer setzen: Angekommen – Entladestelle“ – dann klicken Sie zweimal nacheinander.

**Ein Fahrer sieht einen offenen Auftrag nicht.**
Prüfen Sie: Ist unter **Einstellungen → Abläufe** der Schalter **Fahrer dürfen offene Aufträge übernehmen** an? Ist in der Lieferung **Offen für alle Fahrer (jeder kann übernehmen)** angehakt? Hat ein anderer Fahrer den Auftrag schon übernommen? Ist der Fahrer gesperrt?

**Ein Fahrer bekommt keine Mitteilungen aufs Handy.**
Der Fahrer schaltet in der App unter **Mehr → Mitteilungen** den Schalter **Push-Mitteilungen auf diesem Handy** ein und erlaubt die Mitteilungen. Ist der Schalter ausgegraut, hat er die Mitteilungen im Browser blockiert; er muss sie in den Browser-Einstellungen wieder erlauben. Auf dem iPhone muss die App über „Zum Home-Bildschirm“ installiert sein. Neue Aufträge sieht er in jedem Fall, sobald er die App öffnet.

**Navi öffnet auf dem iPhone Apple Karten.**
Das ist so gewollt: Auf iPhone und iPad öffnet **Navi** die Route in Apple Karten, auf allen anderen Geräten in Google Maps.

**Die Lizenz ist gesperrt.**
Sie können sich weiter anmelden, alle Daten ansehen und exportieren, aber nichts ändern. Ihre Fahrer werden abgemeldet und können sich nicht anmelden. Melden Sie sich bei Ihrem Anbieter – nach der Freischaltung melden sich die Fahrer wieder an, und alles geht weiter.

**Wir möchten den Tarif wechseln oder kündigen.**
Als Admin unter **Einstellungen → Lizenz** mit **Tarif wechseln anfragen** bzw. **Kündigen** (siehe [Tarif wechseln oder kündigen](#tarif-wechseln-oder-kündigen)). Ihr Anbieter setzt die Anfrage um.

**Der Speicher ist voll.**
Neue Fotos und Lieferscheine gehen dann nicht mehr hoch. Laden Sie Ihre Daten als ZIP herunter und senken Sie die Aufbewahrung, oder fragen Sie einen größeren Tarif an (siehe [Speicher](#speicher)).

**In Excel steht vor manchen Einträgen ein Hochkomma.**
Das ist der Schutz vor eingeschleusten Formeln: Texte, die mit `=`, `+`, `-` oder `@` beginnen, bekommen in CSV-Dateien ein `'` davor (siehe [Lieferungen als CSV](#lieferungen-als-csv)).

**Unser Vertrag ist gekündigt.**
Der Admin kann sich weiter anmelden und unter **Einstellungen → Daten & Datenschutz** mit **Alles als ZIP (mit Lieferscheinen)** alle Daten herunterladen – bis Ihr Anbieter die Daten endgültig löscht. Ändern kann er nichts mehr. Disponenten und Fahrer können sich nicht mehr anmelden.

**Ein Fahrer wechselt in eine andere Firma.**
Sperren Sie ihn unter **Fahrer** mit **Sperren**. Sein Zugang ist sofort beendet, seine Fahrzeuge werden frei und der Platz in Ihrem Tarif auch. Seine bisherigen Touren bleiben bei Ihnen gespeichert. Verlangt er die Löschung seiner Daten, löscht ein Admin ihn (siehe [Person löschen](#person-löschen)). Nutzt die neue Firma ebenfalls Ladeklar, legt sie ihn dort neu an; die beiden Zugänge sind vollständig getrennt.

**Ich kann einen Fahrer nicht löschen.**
Er hat noch eine beladene Tour. Schließen Sie sie ab – notfalls mit **Für Fahrer setzen** – oder stornieren Sie sie. Danach geht das Löschen. Löschen dürfen nur Admins.

**Wie sehe ich alte Lieferungen?**
Unter **Lieferungen** im Reiter **Erledigt** (zugestellte und stornierte) oder **Alle** – beide nach Ladedatum, neueste zuerst. Nutzen Sie die Suche (Buchungsnummer, Ort, Auftraggeber, Referenz, Kennzeichen …) und den Filter **Alle Fahrer**. Je Ansicht zeigt Ladeklar die neuesten 300 Lieferungen; finden Sie eine ältere Lieferung nicht, grenzen Sie mit der Suche oder dem Fahrer-Filter ein. Die CSV-Datei enthält immer alle. Lieferungen bleiben so lange gespeichert, wie unter **Lieferscheine aufbewahren (Jahre)** eingestellt ist.

**An welcher Rampe warten unsere Fahrer am längsten?**
Schalten Sie **Ankunft an Lade- und Entladestelle erfassen** ein. Unter **Berichte** steht dann die Tabelle **Je Lade- und Entladestelle** mit der durchschnittlichen Standzeit, längste zuerst. Mit **CSV** nehmen Sie den Bericht für Standgeld-Gespräche mit.

**Ein Fahrer hat eine Tour zurückgegeben.**
Die Lieferung steht wieder unter **Offen**, ohne Fahrer und ohne das Fahrzeug, das er mitgebracht hatte. Öffnen Sie sie und weisen Sie unter **Zuweisung** einen anderen Fahrer zu – oder haken Sie **Offen für alle Fahrer** an (nur möglich, wenn Fahrer offene Aufträge übernehmen dürfen).

**Ich kann keinen weiteren Fahrer oder kein weiteres Fahrzeug anlegen.**
Ihr Tarif ist ausgeschöpft – oder Sie liegen nach einem Tarifwechsel über der Grenze (roter Hinweis auf der Seite). Sperren oder löschen Sie Fahrer, die nicht mehr fahren, entfernen Sie Fahrzeuge, die nicht mehr im Pool sind – oder fragen Sie unter **Einstellungen → Lizenz** einen größeren Tarif an.

**Der Kunde will einen Nachweis über die Zustellung.**
Öffnen Sie die Lieferung, klicken Sie auf **Abliefernachweis** und dann auf **Drucken / PDF** → „Als PDF speichern“. Die PDF-Datei können Sie per E-Mail verschicken.

**Ein Fahrer hat ein neues Handy.**
Er öffnet den Link Ihrer Firma (z. B. `…/t/KAYA`) auf dem neuen Handy und meldet sich mit Handynummer und PIN an. Der Einladungslink hilft dafür nicht mehr, wenn er schon benutzt wurde. Kennt der Fahrer die PIN nicht mehr, erzeugen Sie mit **Neue PIN & Einladung** eine neue – damit wird er auch auf dem alten Handy abgemeldet.

**Beim Tippen erscheint „Dieser Schritt passt gerade nicht. Bitte die Ansicht aktualisieren.“**
Der Schritt wurde schon gesetzt – zum Beispiel vom Büro mit „Für Fahrer setzen“ oder auf einem zweiten Gerät. Nach dem Aktualisieren zeigt die App den richtigen nächsten Schritt.

---

## 17. Glossar

| Begriff | Bedeutung |
|---|---|
| **Abliefernachweis** | Zusammenfassung einer Lieferung auf einem Blatt: Buchungsdaten, Zeitstempel, Lieferschein-Fotos und Unterschrift. Druckbar oder als PDF. |
| **ADR** | Gefahrgut nach dem europäischen Übereinkommen über die Beförderung gefährlicher Güter auf der Straße. In der Lieferung als „Gefahrgut (ADR)“ markiert; als Fahrzeug-Ausstattung „ADR“. |
| **Admin** | Unternehmens-Administrator mit allen Rechten im eigenen Unternehmen. |
| **Auflieger** | Anhänger ohne eigene Vorderachse (Sattelauflieger); in Ladeklar auch für Anhänger allgemein. |
| **Buchungsnummer** | Eindeutige Nummer jeder Lieferung, automatisch vergeben: Präfix – Jahr/Monat – laufende Nummer, z. B. `KAY-2610-0042`. Die laufende Nummer beginnt jeden Monat bei `0001`. |
| **Disponent** | Büro-Zugang für die Disposition: Lieferungen, Fahrer, Fahrzeuge, Berichte. |
| **CMR** | Internationaler Frachtbrief. Im Büro als Dokumentart „CMR“ hochladbar; erscheint im Abliefernachweis. |
| **Eilig** | Markierung für dringende Lieferungen; rot hervorgehoben, Mitteilung an den Fahrer mit hoher Priorität. |
| **Fahrsperre** | Verdeckt die Knöpfe der Fahrer-App ab ca. 8 km/h (§ 23 StVO). Braucht die Standortfreigabe auf dem Handy; speichert keine Position. |
| **Einladungslink** | Persönlicher Link für die erste Anmeldung eines Fahrers (`…/i/…`). Gilt 14 Tage und nur für eine Anmeldung; danach meldet sich der Fahrer mit Firmencode, Handynummer und PIN an. |
| **Firmencode** | Kurzer Code Ihres Unternehmens (z. B. `KAYA`), mit dem sich Fahrer ohne Einladungslink anmelden. Steht unter **Einstellungen**. |
| **Fortschrittsleiste** | Die Schritte einer Lieferung mit Uhrzeit, z. B. Bestätigt · Beladen · Entladen · Zugestellt. |
| **Gelöschter Nutzer** | So erscheint eine gelöschte Person in alten Lieferungen. Ihre persönlichen Daten sind gelöscht. |
| **HU / SP** | Hauptuntersuchung / Sicherheitsprüfung des Fahrzeugs; Ladeklar warnt 30 Tage vorher. |
| **Lieferschein** | Vom Empfänger quittiertes Begleitpapier; in Ladeklar als Foto oder PDF bei der Lieferung gespeichert. |
| **Lizenzgeber / Anbieter** | Betreiber der Ladeklar-Plattform, von dem Sie Ihre Lizenz haben. |
| **Lizenznehmer** | Ihr Unternehmen als Kunde der Plattform. |
| **Nachbearbeiten** | Änderung einer zugestellten oder stornierten Lieferung; nur Auftraggeber, Referenz und interne Notiz. |
| **Offen für alle** | Lieferung ohne festen Fahrer, die jeder Fahrer unter „Freie Aufträge“ übernehmen kann. |
| **Palettentausch** | Austausch von EUR-Paletten beim Abladen: abgegebene volle gegen mitgenommene leere Paletten. |
| **Palettensaldo** | Abgegebene minus mitgenommene Paletten eines Monats (Berichte). |
| **PIN** | 6-stellige Geheimzahl, mit der sich ein Fahrer anmeldet. |
| **Pool** | Alle Fahrzeuge Ihres Unternehmens, aus denen Fahrer wählen. |
| **Push-Mitteilung** | Nachricht aufs Handy oder an den Browser, auch wenn die App geschlossen ist. |
| **Rückgängig** | Der Fahrer nimmt seinen letzten Schritt innerhalb von 2 Minuten zurück – nur mit Netz und nur bei Schritten, die er mit Netz getippt hat. |
| **Standzeit** | Wartezeit an Lade- und Entladestelle zwischen „Angekommen“ und „Aufgeladen“ bzw. „Abgeladen“; Grundlage für Standgeld. |
| **Standgeld** | Vergütung, die Sie Ihrem Auftraggeber für Wartezeiten an der Rampe in Rechnung stellen. |
| **Speicher** | Platz für Fotos, PDF-Dateien und Logo Ihres Tarifs (5, 50 oder 250 GB). Belegung unter **Einstellungen → Lizenz**. |
| **Startpasswort** | Passwort für die erste Anmeldung eines Büro-Zugangs. Wird nur einmal angezeigt; danach muss ein eigenes Passwort vergeben werden. |
| **Störung** | Vom Fahrer gemeldetes Problem (z. B. Panne, Stau, Annahme verweigert), bis es im Büro als erledigt markiert wird. |
| **Verlauf** | Zeitstrahl aller Ereignisse einer Lieferung mit Uhrzeit und Person. |
| **White-Label** | Die App läuft unter Ihrem Namen, Logo und Ihrer Farbe. |
| **Zeitstempel** | Datum und Uhrzeit, zu der der Fahrer einen Schritt getippt hat (deutsche Zeit) – auch bei Schritten ohne Netz. Ist die Uhrzeit des Handys nicht plausibel, gilt der Eingang bei Ladeklar. |
| **Zwei-Faktor-Anmeldung** | Anmeldung mit Passwort und zusätzlich einem 6-stelligen Code aus einer Authenticator-App. Ein- und ausschalten unter **Einstellungen → Mein Konto**. |
